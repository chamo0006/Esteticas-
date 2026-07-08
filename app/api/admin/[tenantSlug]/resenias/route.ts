import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
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

// GET /api/admin/[tenantSlug]/resenias — el admin ve también las inactivas.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;
  const payload = await getAdminPayload(tenantSlug);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { data, error } = await supabase
    .from('resenias')
    .select('id, nombre, texto, rating, activo, created_at')
    .eq('tenant_id', payload.tenantId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[resenias GET]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}

// POST /api/admin/[tenantSlug]/resenias  body: { nombre, texto, rating }
export async function POST(
  req: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;
  const payload = await getAdminPayload(tenantSlug);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await req.json();
  const nombre = typeof body.nombre === 'string' ? body.nombre.trim() : '';
  const texto = typeof body.texto === 'string' ? body.texto.trim() : '';
  const rating = Number(body.rating);
  if (!nombre || !texto || !Number.isFinite(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Nombre, texto y rating (1-5) son obligatorios' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('resenias')
    .insert({ tenant_id: payload.tenantId, nombre, texto, rating, activo: true })
    .select('id')
    .single();

  if (error || !data) {
    console.error('[resenias POST]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }

  revalidatePath(`/${tenantSlug}`);
  return NextResponse.json({ id: data.id });
}

// PATCH /api/admin/[tenantSlug]/resenias  body: { id, nombre?, texto?, rating?, activo? }
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;
  const payload = await getAdminPayload(tenantSlug);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id, nombre, texto, rating, activo } = await req.json();
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

  const updateData: Record<string, unknown> = {};
  if (nombre !== undefined) updateData.nombre = String(nombre).trim();
  if (texto !== undefined) updateData.texto = String(texto).trim();
  if (rating !== undefined) {
    const r = Number(rating);
    if (!Number.isFinite(r) || r < 1 || r > 5) return NextResponse.json({ error: 'Rating inválido' }, { status: 400 });
    updateData.rating = r;
  }
  if (activo !== undefined) updateData.activo = Boolean(activo);

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'Sin campos para actualizar' }, { status: 400 });
  }

  const { error } = await supabase
    .from('resenias')
    .update(updateData)
    .eq('id', id)
    .eq('tenant_id', payload.tenantId);

  if (error) {
    console.error('[resenias PATCH]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }

  revalidatePath(`/${tenantSlug}`);
  return NextResponse.json({ ok: true });
}

// DELETE /api/admin/[tenantSlug]/resenias?id=xxx
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;
  const payload = await getAdminPayload(tenantSlug);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

  const { error } = await supabase
    .from('resenias')
    .delete()
    .eq('id', id)
    .eq('tenant_id', payload.tenantId);

  if (error) {
    console.error('[resenias DELETE]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }

  revalidatePath(`/${tenantSlug}`);
  return NextResponse.json({ ok: true });
}
