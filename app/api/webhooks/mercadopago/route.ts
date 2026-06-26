import { NextResponse } from 'next/server';
import { getMPClient, Payment, resolveMPToken } from '@/lib/mercadopago';
import { supabase } from '@/lib/supabase';

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
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[webhook/mercadopago]', err);
    return NextResponse.json({ ok: true }); // Siempre 200 para que MP no reintente
  }
}
