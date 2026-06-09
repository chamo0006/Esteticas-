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

// GET clientes con conteo de turnos
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;
  const payload = await getAdminPayload(tenantSlug);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  // Fetch clientes with their turnos (excluding cancelled ones) for aggregation
  const { data, error } = await supabase
    .from('clientes')
    .select(`
      id,
      nombre,
      email,
      telefono,
      created_at,
      turnos(id, fecha_hora, estado)
    `)
    .eq('tenant_id', payload.tenantId);

  if (error) {
    console.error('[clientes GET]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }

  const result = (data ?? []).map((c) => {
    const activeTurnos = (c.turnos ?? []).filter(
      (t: { estado: string }) => t.estado !== 'cancelado'
    );
    const fechas = activeTurnos
      .map((t: { fecha_hora: string }) => t.fecha_hora)
      .filter(Boolean)
      .sort();
    const ultimo_turno = fechas.length > 0 ? fechas[fechas.length - 1] : null;

    return {
      id: c.id,
      nombre: c.nombre,
      email: c.email,
      telefono: c.telefono,
      created_at: c.created_at,
      total_turnos: activeTurnos.length,
      ultimo_turno,
    };
  });

  // Sort by ultimo_turno DESC, nulls last
  result.sort((a, b) => {
    if (!a.ultimo_turno && !b.ultimo_turno) return 0;
    if (!a.ultimo_turno) return 1;
    if (!b.ultimo_turno) return -1;
    return b.ultimo_turno.localeCompare(a.ultimo_turno);
  });

  return NextResponse.json(result);
}

// DELETE /api/admin/[tenantSlug]/clientes?id=xxx
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;
  const payload = await getAdminPayload(tenantSlug);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

  // Verify the client belongs to this tenant
  const { data: cliente } = await supabase
    .from('clientes')
    .select('id')
    .eq('id', id)
    .eq('tenant_id', payload.tenantId)
    .single();

  if (!cliente) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });

  // Delete pagos → turnos → cliente (respecting FK order)
  const { data: turnos } = await supabase
    .from('turnos')
    .select('id')
    .eq('cliente_id', id)
    .eq('tenant_id', payload.tenantId);

  const turnoIds = (turnos ?? []).map((t: { id: string }) => t.id);

  if (turnoIds.length > 0) {
    await supabase.from('pagos').delete().in('turno_id', turnoIds);
    await supabase.from('turnos').delete().in('id', turnoIds).eq('tenant_id', payload.tenantId);
  }

  const { error } = await supabase
    .from('clientes')
    .delete()
    .eq('id', id)
    .eq('tenant_id', payload.tenantId);

  if (error) {
    console.error('[clientes DELETE]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
