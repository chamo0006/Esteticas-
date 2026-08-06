import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { devolverSenaSiCorresponde } from '@/lib/cancelacion';

async function getAdminPayload(tenantSlug: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload || payload.tenantSlug !== tenantSlug) return null;
  return payload;
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

  // Antes ocultábamos acá las reservas de MercadoPago sin acreditar todavía,
  // pensado para cuando el cliente elegía MP a mano. Desde que la seña se
  // fuerza por MP también en efectivo/transferencia (ver reservar/route.ts),
  // eso escondía turnos reales que sí están reteniendo el horario — el local
  // los veía como "libres" sin estarlo. Ahora se muestran siempre; el estado
  // 'pendiente' + pago_estado ya deja ver que todavía no se confirmó el pago.
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

  // Al completar el turno, el pago queda saldado sin importar el método: en
  // efectivo/transferencia nadie lo confirma automáticamente (a diferencia del
  // webhook de MercadoPago), así que lo marcamos acreditado nosotros acá.
  if (estado === 'completado') {
    const { data: turno } = await supabase
      .from('turnos').select('pago_id').eq('id', id).single();

    if (turno?.pago_id) {
      await supabase
        .from('pagos')
        .update({ estado: 'acreditado' })
        .eq('id', turno.pago_id)
        .eq('estado', 'pendiente');
    } else {
      await supabase
        .from('pagos')
        .update({ estado: 'acreditado' })
        .eq('turno_id', id)
        .eq('estado', 'pendiente');
    }
  }

  // Al cancelar, devolvemos la seña de MercadoPago si corresponde.
  const devolucion = estado === 'cancelado'
    ? await devolverSenaSiCorresponde(id, payload.tenantId)
    : null;

  return NextResponse.json({ ok: true, devolucion });
}
