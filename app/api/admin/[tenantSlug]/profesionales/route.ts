import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { puedeActivarProfesional } from '@/lib/plan-limites';

async function getAdminPayload(tenantSlug: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload || payload.tenantSlug !== tenantSlug) return null;
  return payload;
}

// GET /api/admin/[tenantSlug]/profesionales
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;
  const payload = await getAdminPayload(tenantSlug);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  // Intenta traer rol/rating; si la migración no corrió, cae a los básicos.
  const withExtras = await supabase
    .from('profesionales')
    .select('id, nombre, rol, rating, activo, created_at')
    .eq('tenant_id', payload.tenantId)
    .order('nombre');

  let data: unknown[] | null = withExtras.data;
  let error = withExtras.error;

  if (error) {
    const basic = await supabase
      .from('profesionales')
      .select('id, nombre, activo, created_at')
      .eq('tenant_id', payload.tenantId)
      .order('nombre');
    data = basic.data;
    error = basic.error;
  }

  if (error) {
    console.error('[profesionales GET]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

// POST /api/admin/[tenantSlug]/profesionales  body: { nombre }
export async function POST(
  req: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;
  const payload = await getAdminPayload(tenantSlug);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await req.json();
  const { nombre, rol, rating } = body;
  if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
    return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 });
  }

  // Se crea activo por defecto, así que cuenta contra el límite del plan.
  const limite = await puedeActivarProfesional(payload.tenantId);
  if (!limite.ok) {
    return NextResponse.json({ error: limite.motivo }, { status: 403 });
  }

  const insertData: Record<string, unknown> = { tenant_id: payload.tenantId, nombre: nombre.trim() };
  if (typeof rol === 'string' && rol.trim()) insertData.rol = rol.trim();
  const ratingNum = rating === '' || rating == null ? null : Number(rating);
  if (ratingNum != null && !isNaN(ratingNum)) insertData.rating = Math.max(0, Math.min(5, ratingNum));

  const { data, error } = await supabase
    .from('profesionales')
    .insert(insertData)
    .select('id')
    .single();

  if (error || !data) {
    console.error('[profesionales POST]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}

// PATCH /api/admin/[tenantSlug]/profesionales  body: { id, nombre?, activo? }
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;
  const payload = await getAdminPayload(tenantSlug);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id, nombre, activo, rol, rating } = await req.json();
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

  if (activo === true) {
    const limite = await puedeActivarProfesional(payload.tenantId, id);
    if (!limite.ok) {
      return NextResponse.json({ error: limite.motivo }, { status: 403 });
    }
  }

  const updateData: Record<string, unknown> = {};
  if (nombre !== undefined) updateData.nombre = nombre.trim();
  if (activo !== undefined) updateData.activo = activo;
  if (rol !== undefined) updateData.rol = typeof rol === 'string' && rol.trim() ? rol.trim() : null;
  if (rating !== undefined) {
    const r = rating === '' || rating == null ? null : Number(rating);
    updateData.rating = r != null && !isNaN(r) ? Math.max(0, Math.min(5, r)) : null;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'Sin campos para actualizar' }, { status: 400 });
  }

  const { error } = await supabase
    .from('profesionales')
    .update(updateData)
    .eq('id', id)
    .eq('tenant_id', payload.tenantId);

  if (error) {
    console.error('[profesionales PATCH]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/admin/[tenantSlug]/profesionales?id=xxx
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;
  const payload = await getAdminPayload(tenantSlug);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

  // Check if there are any turnos assigned to this profesional
  const { count, error: countError } = await supabase
    .from('turnos')
    .select('id', { count: 'exact', head: true })
    .eq('profesional_id', id);

  if (countError) {
    console.error('[profesionales DELETE count]', countError);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: 'No se puede eliminar: el profesional tiene turnos asignados' },
      { status: 409 }
    );
  }

  const { error } = await supabase
    .from('profesionales')
    .delete()
    .eq('id', id)
    .eq('tenant_id', payload.tenantId);

  if (error) {
    console.error('[profesionales DELETE]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
