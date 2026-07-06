import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { resolveMPToken, refundMPPayment } from '@/lib/mercadopago';

async function getAdminPayload(tenantSlug: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload || payload.tenantSlug !== tenantSlug) return null;
  return payload;
}

// Resultado de intentar devolver la seña al cancelar un turno.
type Devolucion =
  | { estado: 'devuelto'; monto: number; retencion: number }
  | { estado: 'retenido'; retencion: number }          // retención 100% → no se devuelve
  | { estado: 'error'; motivo: string }
  | null;                                               // no había seña de MP que devolver

// Al cancelar un turno, si tenía una seña pagada por MercadoPago y acreditada,
// devuelve automáticamente el (100 − porcentaje_retencion)% a la clienta.
async function devolverSenaSiCorresponde(turnoId: string, tenantId: string): Promise<Devolucion> {
  // Ubica el pago de este turno: primero por turnos.pago_id, si no por pago.turno_id.
  const { data: turno } = await supabase
    .from('turnos').select('pago_id').eq('id', turnoId).single();

  const cols = 'id, monto, metodo, estado, referencia_externa';
  type PagoRow = { id: string; monto: number; metodo: string; estado: string; referencia_externa: string | null };
  let pago: PagoRow | null = null;

  if (turno?.pago_id) {
    const { data } = await supabase.from('pagos').select(cols).eq('id', turno.pago_id).single();
    pago = data as PagoRow | null;
  }
  if (!pago) {
    const { data } = await supabase.from('pagos').select(cols).eq('turno_id', turnoId).maybeSingle();
    pago = data as PagoRow | null;
  }

  // Solo devolvemos señas de MercadoPago ya acreditadas y aún no reembolsadas.
  if (!pago || pago.metodo !== 'mercadopago' || pago.estado !== 'acreditado' || !pago.referencia_externa) {
    return null;
  }

  const { data: cfg } = await supabase
    .from('tenants').select('porcentaje_retencion').eq('id', tenantId).single();
  const retencion = Number(cfg?.porcentaje_retencion ?? 0);
  const monto = Number(pago.monto);
  const montoDevuelto = Math.round(monto * (100 - retencion)) / 100;

  if (montoDevuelto <= 0) {
    // Retención 100%: no se devuelve nada, la seña queda como cargo.
    return { estado: 'retenido', retencion };
  }

  const accessToken = await resolveMPToken(tenantId);
  if (!accessToken) return { estado: 'error', motivo: 'MercadoPago no configurado' };

  try {
    // retención 0 → devolución total; retención > 0 → parcial por el monto calculado.
    await refundMPPayment(accessToken, pago.referencia_externa, retencion > 0 ? montoDevuelto : undefined);
    await supabase
      .from('pagos')
      .update({ estado: 'reembolsado', monto_devuelto: montoDevuelto, devuelto_at: new Date().toISOString() })
      .eq('id', pago.id);
    return { estado: 'devuelto', monto: montoDevuelto, retencion };
  } catch (err) {
    console.error('[turnos cancel refund]', err);
    return { estado: 'error', motivo: 'No se pudo procesar la devolución en MercadoPago' };
  }
}

// GET /api/admin/[tenantSlug]/turnos?fecha=2026-05-30
// OR   /api/admin/[tenantSlug]/turnos?fechaInicio=2026-05-30&fechaFin=2026-06-05
export async function GET(
  req: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;
  const payload = await getAdminPayload(tenantSlug);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const url = new URL(req.url);
  const fecha = url.searchParams.get('fecha');
  const fechaInicio = url.searchParams.get('fechaInicio');
  const fechaFin = url.searchParams.get('fechaFin');

  let query = supabase
    .from('turnos')
    .select(`
      id,
      fecha_hora,
      estado,
      notas,
      profesional_id,
      clientes!inner(nombre, email, telefono),
      servicios!inner(nombre, duracion_minutos, precio),
      pagos!turno_id(monto, tipo, metodo, estado),
      profesionales(nombre)
    `)
    .eq('tenant_id', payload.tenantId)
    .order('fecha_hora');

  if (fechaInicio && fechaFin) {
    // Filter by week range
    query = query
      .gte('fecha_hora', `${fechaInicio}T00:00:00Z`)
      .lte('fecha_hora', `${fechaFin}T23:59:59Z`);
  } else if (fecha) {
    // Filter by date: fecha_hora on that calendar day
    const dayStart = `${fecha}T00:00:00.000Z`;
    const dayEnd   = `${fecha}T23:59:59.999Z`;
    query = query.gte('fecha_hora', dayStart).lte('fecha_hora', dayEnd);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[turnos GET]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }

  // Flatten the nested structure to match the original response shape
  const rows = (data ?? []).map((t) => {
    const cliente = t.clientes as unknown as { nombre: string; email: string; telefono: string };
    const servicio = t.servicios as unknown as { nombre: string; duracion_minutos: number; precio: number };
    const pago = Array.isArray(t.pagos) ? t.pagos[0] : t.pagos;
    const profesional = t.profesionales as unknown as { nombre: string } | null;

    return {
      id: t.id,
      fecha_hora: t.fecha_hora,
      estado: t.estado,
      notas: t.notas,
      profesional_id: (t as unknown as { profesional_id: string | null }).profesional_id ?? null,
      cliente_nombre: cliente?.nombre,
      cliente_email: cliente?.email,
      cliente_telefono: cliente?.telefono,
      servicio_nombre: servicio?.nombre,
      duracion_minutos: servicio?.duracion_minutos,
      precio: servicio?.precio,
      pago_monto: pago?.monto ?? null,
      pago_tipo: pago?.tipo ?? null,
      pago_metodo: pago?.metodo ?? null,
      pago_estado: pago?.estado ?? null,
      profesional_nombre: profesional?.nombre ?? null,
    };
  });

  return NextResponse.json(rows);
}

// PATCH /api/admin/[tenantSlug]/turnos  body: { id, estado }
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;
  const payload = await getAdminPayload(tenantSlug);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id, estado } = await req.json();
  const estados = ['pendiente', 'confirmado', 'completado', 'cancelado'];
  if (!id || !estados.includes(estado)) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  }

  const { error } = await supabase
    .from('turnos')
    .update({ estado })
    .eq('id', id)
    .eq('tenant_id', payload.tenantId);

  if (error) {
    console.error('[turnos PATCH]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }

  // Al cancelar, devolvemos la seña de MercadoPago si corresponde.
  const devolucion = estado === 'cancelado'
    ? await devolverSenaSiCorresponde(id, payload.tenantId)
    : null;

  return NextResponse.json({ ok: true, devolucion });
}
