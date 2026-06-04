import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

async function getAdminPayload(tenantSlug: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload || payload.tenantSlug !== tenantSlug) return null;
  return payload;
}

// GET /api/admin/[tenantSlug]/turnos?fecha=2026-05-30
export async function GET(
  req: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;
  const payload = await getAdminPayload(tenantSlug);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const url = new URL(req.url);
  const fecha = url.searchParams.get('fecha');

  let query = supabase
    .from('turnos')
    .select(`
      id,
      fecha_hora,
      estado,
      notas,
      clientes!inner(nombre, email, telefono),
      servicios!inner(nombre, duracion_minutos, precio),
      pagos(monto, tipo, metodo, estado),
      profesionales(nombre)
    `)
    .eq('tenant_id', payload.tenantId)
    .order('fecha_hora');

  if (fecha) {
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

  return NextResponse.json({ ok: true });
}
