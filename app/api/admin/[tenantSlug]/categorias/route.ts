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

// GET — listar categorías del tenant
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;
  const payload = await getAdminPayload(tenantSlug);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { data, error } = await supabase
    .from('categorias_tenant')
    .select('id, nombre')
    .eq('tenant_id', payload.tenantId)
    .order('nombre');

  if (error) {
    console.error('[categorias GET]', error);
    return NextResponse.json({ error: 'Error interno', detalle: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}

// POST — crear categoría  body: { nombre }
export async function POST(
  req: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;
  const payload = await getAdminPayload(tenantSlug);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { nombre } = await req.json();
  if (!nombre?.trim()) return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });

  const { data, error } = await supabase
    .from('categorias_tenant')
    .insert({ tenant_id: payload.tenantId, nombre: nombre.trim().toLowerCase() })
    .select('id, nombre')
    .single();

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Esa categoría ya existe' }, { status: 409 });
    console.error('[categorias POST]', error);
    return NextResponse.json({ error: 'Error interno', detalle: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}

// DELETE — eliminar categoría  ?id=xxx
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;
  const payload = await getAdminPayload(tenantSlug);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

  const { error } = await supabase
    .from('categorias_tenant')
    .delete()
    .eq('id', id)
    .eq('tenant_id', payload.tenantId);

  if (error) return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
