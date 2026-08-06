import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { puedeActivarServicio } from '@/lib/plan-limites';

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
    .select('id, nombre, descripcion, duracion_minutos, precio, categoria, activo, imagen_url, servicio_profesionales(profesional_id)')
    .eq('tenant_id', payload.tenantId)
    .order('categoria')
    .order('nombre');

  if (error) {
    console.error('[servicios GET]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }

  const servicios = (data ?? []).map((s) => {
    const { servicio_profesionales, ...rest } = s as typeof s & { servicio_profesionales: { profesional_id: string }[] };
    return { ...rest, profesional_ids: servicio_profesionales.map((sp) => sp.profesional_id) };
  });

  return NextResponse.json(servicios);
}

// Reemplaza el set de profesionales vinculadas a un servicio. undefined =
// no tocar el vínculo (ej. al togglear "activo" no mandamos profesionalIds).
async function setProfesionales(tenantId: string, servicioId: string, profesionalIds: string[]) {
  // Solo vincula profesionales que sean de este tenant, por las dudas.
  const { data: validas } = await supabase
    .from('profesionales')
    .select('id')
    .eq('tenant_id', tenantId)
    .in('id', profesionalIds);

  const idsValidos = (validas ?? []).map((p) => p.id);

  await supabase.from('servicio_profesionales').delete().eq('servicio_id', servicioId);
  if (idsValidos.length > 0) {
    await supabase
      .from('servicio_profesionales')
      .insert(idsValidos.map((profesional_id) => ({ servicio_id: servicioId, profesional_id })));
  }
}

// POST crear servicio
export async function POST(
  req: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;
  const payload = await getAdminPayload(tenantSlug);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { nombre, descripcion, duracion_minutos, precio, categoria, imagen_url, profesionalIds } = await req.json();
  if (!nombre || !duracion_minutos || precio == null) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
  }

  // Un servicio nuevo nace activo, así que cuenta contra el límite del plan.
  const limite = await puedeActivarServicio(payload.tenantId);
  if (!limite.ok) {
    return NextResponse.json({ error: limite.motivo }, { status: 403 });
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
      imagen_url: imagen_url ?? null,
    })
    .select('id')
    .single();

  if (error || !data) {
    console.error('[servicios POST]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }

  if (Array.isArray(profesionalIds)) {
    await setProfesionales(payload.tenantId, data.id, profesionalIds);
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

  const { id, nombre, descripcion, duracion_minutos, precio, categoria, activo, imagen_url, profesionalIds } = await req.json();
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

  if (activo === true) {
    const limite = await puedeActivarServicio(payload.tenantId, id);
    if (!limite.ok) {
      return NextResponse.json({ error: limite.motivo }, { status: 403 });
    }
  }

  // Build update object with only defined fields
  const updateData: Record<string, unknown> = {};
  if (nombre           !== undefined) updateData.nombre            = nombre;
  if (descripcion      !== undefined) updateData.descripcion       = descripcion;
  if (duracion_minutos !== undefined) updateData.duracion_minutos  = duracion_minutos;
  if (precio           !== undefined) updateData.precio            = precio;
  if (categoria        !== undefined) updateData.categoria         = categoria;
  if (activo           !== undefined) updateData.activo            = activo;
  if (imagen_url       !== undefined) updateData.imagen_url        = imagen_url;

  if (Object.keys(updateData).length > 0) {
    const { error } = await supabase
      .from('servicios')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', payload.tenantId);

    if (error) {
      console.error('[servicios PATCH]', error);
      return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
  }

  if (Array.isArray(profesionalIds)) {
    await setProfesionales(payload.tenantId, id, profesionalIds);
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
