import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

async function getAdminPayload(tenantSlug: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload || payload.tenantSlug !== tenantSlug) return null;
  return payload;
}

// GET todos los servicios
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;
  const payload = await getAdminPayload(tenantSlug);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { data, error } = await supabase
    .from('servicios')
    .select('id, nombre, descripcion, duracion_minutos, precio, categoria, activo')
    .eq('tenant_id', payload.tenantId)
    .order('categoria')
    .order('nombre');

  if (error) {
    console.error('[servicios GET]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

// POST crear servicio
export async function POST(
  req: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;
  const payload = await getAdminPayload(tenantSlug);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { nombre, descripcion, duracion_minutos, precio, categoria } = await req.json();
  if (!nombre || !duracion_minutos || precio == null) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('servicios')
    .insert({
      tenant_id: payload.tenantId,
      nombre,
      descripcion: descripcion ?? null,
      duracion_minutos,
      precio,
      categoria: categoria ?? 'general',
    })
    .select('id')
    .single();

  if (error || !data) {
    console.error('[servicios POST]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }

  revalidatePath(`/${tenantSlug}`);
  return NextResponse.json({ id: data.id });
}

// PATCH editar servicio   body: { id, ...campos }
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;
  const payload = await getAdminPayload(tenantSlug);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id, nombre, descripcion, duracion_minutos, precio, categoria, activo } = await req.json();
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

  // Build update object with only defined fields
  const updateData: Record<string, unknown> = {};
  if (nombre           !== undefined) updateData.nombre            = nombre;
  if (descripcion      !== undefined) updateData.descripcion       = descripcion;
  if (duracion_minutos !== undefined) updateData.duracion_minutos  = duracion_minutos;
  if (precio           !== undefined) updateData.precio            = precio;
  if (categoria        !== undefined) updateData.categoria         = categoria;
  if (activo           !== undefined) updateData.activo            = activo;

  const { error } = await supabase
    .from('servicios')
    .update(updateData)
    .eq('id', id)
    .eq('tenant_id', payload.tenantId);

  if (error) {
    console.error('[servicios PATCH]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }

  revalidatePath(`/${tenantSlug}`);
  return NextResponse.json({ ok: true });
}

// DELETE eliminar servicio
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

  const { error } = await supabase
    .from('servicios')
    .delete()
    .eq('id', id)
    .eq('tenant_id', payload.tenantId);

  if (error) {
    // FK violation: el servicio tiene turnos asociados → no se puede eliminar
    if (error.code === '23503') {
      return NextResponse.json(
        { error: 'No se puede eliminar: el servicio tiene turnos asociados. Desactivalo desde el listado en su lugar.' },
        { status: 409 }
      );
    }
    console.error('[servicios DELETE]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }

  revalidatePath(`/${tenantSlug}`);
  return NextResponse.json({ ok: true });
}
