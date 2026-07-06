import { NextResponse } from 'next/server';
import { getMPClient, Payment, resolveMPToken } from '@/lib/mercadopago';
import { supabase } from '@/lib/supabase';
import { enviarConfirmacionCliente, enviarNotificacionAdmin } from '@/lib/email';

const MONTHS   = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const WEEKDAYS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
// Argentina es UTC-3 (sin horario de verano); el server corre en UTC.
const AR_OFFSET_MS = -3 * 60 * 60 * 1000;
function formatFechaEmail(dt: Date) {
  const ar = new Date(dt.getTime() + AR_OFFSET_MS);
  return `${WEEKDAYS[ar.getUTCDay()]} ${ar.getUTCDate()} de ${MONTHS[ar.getUTCMonth()]} de ${ar.getUTCFullYear()}`;
}
function formatHoraEmail(dt: Date) {
  const ar = new Date(dt.getTime() + AR_OFFSET_MS);
  return `${ar.getUTCHours().toString().padStart(2,'0')}:${ar.getUTCMinutes().toString().padStart(2,'0')}`;
}

// Envía la confirmación al cliente y el aviso al admin recién cuando la seña de
// MercadoPago se acreditó (antes de esto la reserva no se considera hecha).
async function enviarEmailsReservaPagada(pagoId: string) {
  // Todos los turnos de esta reserva (puede haber varios servicios) con sus datos.
  const { data: turnos } = await supabase
    .from('turnos')
    .select('fecha_hora, tenant_id, tenants(nombre), clientes(nombre, email), servicios(nombre)')
    .eq('pago_id', pagoId)
    .order('fecha_hora');

  if (!turnos || turnos.length === 0) return;

  type TurnoRow = {
    fecha_hora: string;
    tenant_id: string;
    tenants: { nombre: string } | { nombre: string }[] | null;
    clientes: { nombre: string; email: string } | { nombre: string; email: string }[] | null;
    servicios: { nombre: string } | { nombre: string }[] | null;
  };
  const rows = turnos as unknown as TurnoRow[];
  const first = rows[0];
  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);

  const tenant  = one(first.tenants);
  const cliente = one(first.clientes);
  if (!cliente?.email || !tenant) return;

  const { data: pago } = await supabase
    .from('pagos').select('monto, tipo, metodo').eq('id', pagoId).single();

  const fechaDt = new Date(first.fecha_hora);
  const emailData = {
    tenantNombre: tenant.nombre,
    clienteNombre: cliente.nombre,
    servicios: rows.map((t) => one(t.servicios)?.nombre).filter(Boolean) as string[],
    fecha: formatFechaEmail(fechaDt),
    hora: formatHoraEmail(fechaDt),
    monto: Number(pago?.monto ?? 0),
    tipo: (pago?.tipo === 'sena' ? 'sena' : 'total') as 'sena' | 'total',
    metodo: pago?.metodo ?? 'mercadopago',
    turnoId: pagoId,
  };

  enviarConfirmacionCliente(cliente.email, emailData).catch(console.error);
  try {
    const { data } = await supabase
      .from('usuarios_admin')
      .select('email')
      .eq('tenant_id', first.tenant_id)
      .eq('activo', true)
      .limit(1)
      .single();
    if (data?.email) await enviarNotificacionAdmin(data.email, emailData);
  } catch (err) {
    console.error('[webhook email admin]', err);
  }
}

// MP envía notificaciones a esta URL cuando cambia el estado de un pago
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: true });

  const { type, data } = body;

  // Solo procesamos notificaciones de pagos
  if (type !== 'payment' || !data?.id) {
    return NextResponse.json({ ok: true });
  }

  // El tenant_id viene en la query (lo puso crear-preferencia) para resolver
  // con qué cuenta de MercadoPago consultar este pago.
  const tenantId = new URL(req.url).searchParams.get('tenant_id');
  const accessToken = tenantId
    ? await resolveMPToken(tenantId)
    : process.env.MP_ACCESS_TOKEN ?? null;
  if (!accessToken) return NextResponse.json({ ok: true });

  try {
    const client = getMPClient(accessToken);
    const paymentClient = new Payment(client);

    // Trae el detalle del pago desde MP
    const payment = await paymentClient.get({ id: data.id });

    const externalRef = payment.external_reference; // nuestro pagoId
    const status = payment.status; // 'approved', 'rejected', 'pending', etc.

    if (!externalRef) return NextResponse.json({ ok: true });

    // Mapea el estado de MP a nuestros estados
    const estadoMap: Record<string, string> = {
      approved:     'acreditado',
      rejected:     'rechazado',
      refunded:     'reembolsado',
      cancelled:    'rechazado',
      charged_back: 'reembolsado',
    };

    const nuevoEstado = estadoMap[status ?? ''];
    if (!nuevoEstado) return NextResponse.json({ ok: true });

    // Estado previo del pago: MP puede notificar varias veces el mismo pago.
    // Lo usamos para enviar los emails solo en la transición a 'acreditado'
    // (evita confirmaciones duplicadas si llegan notificaciones repetidas).
    const { data: pagoPrev } = await supabase
      .from('pagos').select('estado').eq('id', externalRef).single();
    const yaEstabaAcreditado = pagoPrev?.estado === 'acreditado';

    await supabase
      .from('pagos')
      .update({ estado: nuevoEstado, referencia_externa: String(data.id) })
      .eq('id', externalRef);

    // Si el pago fue aprobado, confirma únicamente los turnos de ESTA reserva.
    // Una reserva puede incluir varios servicios consecutivos → varios turnos,
    // todos vinculados al pago vía turnos.pago_id (ver migrate_turnos_pago.sql).
    if (nuevoEstado === 'acreditado') {
      const { data: confirmados } = await supabase
        .from('turnos')
        .update({ estado: 'confirmado' })
        .eq('pago_id', externalRef)
        .eq('estado', 'pendiente')
        .select('id');

      // Fallback para reservas creadas antes de existir pago_id: confirma
      // solo el turno referenciado por el pago (nunca todos los del cliente).
      if (!confirmados || confirmados.length === 0) {
        const { data: pagoData } = await supabase
          .from('pagos')
          .select('turno_id')
          .eq('id', externalRef)
          .single();

        if (pagoData?.turno_id) {
          await supabase
            .from('turnos')
            .update({ estado: 'confirmado' })
            .eq('id', pagoData.turno_id)
            .eq('estado', 'pendiente');
        }
      }

      // Recién ahora la seña está paga: enviamos los emails de confirmación.
      // Solo en la primera acreditación, para no duplicar si MP reintenta.
      if (!yaEstabaAcreditado) {
        await enviarEmailsReservaPagada(externalRef);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[webhook/mercadopago]', err);
    return NextResponse.json({ ok: true }); // Siempre 200 para que MP no reintente
  }
}
