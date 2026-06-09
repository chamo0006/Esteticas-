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

// PUT reemplaza todos los horarios de la semana
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;
  const payload = await getAdminPayload(tenantSlug);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { horarios } = await req.json();
  if (!Array.isArray(horarios)) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });

  // Upsert all schedule rows for this tenant
  const rows = horarios.map((h: {
    dia_semana: number;
    hora_apertura: string;
    hora_cierre: string;
    activo: boolean;
  }) => ({
    tenant_id: payload.tenantId,
    dia_semana: h.dia_semana,
    hora_apertura: h.hora_apertura,
    hora_cierre: h.hora_cierre,
    activo: h.activo,
  }));

  const { error } = await supabase
    .from('horarios_tenant')
    .upsert(rows, { onConflict: 'tenant_id,dia_semana' });

  if (error) {
    console.error('[horarios PUT]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }

  revalidatePath(`/${tenantSlug}`);
  return NextResponse.json({ ok: true });
}

// POST agregar día bloqueado
export async function POST(
  req: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;
  const payload = await getAdminPayload(tenantSlug);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { fecha, motivo } = await req.json();
  if (!fecha) return NextResponse.json({ error: 'Fecha requerida' }, { status: 400 });

  const { error } = await supabase
    .from('dias_bloqueados')
    .upsert(
      { tenant_id: payload.tenantId, fecha, motivo: motivo ?? null },
      { onConflict: 'tenant_id,fecha', ignoreDuplicates: true }
    );

  if (error) {
    console.error('[horarios POST]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// DELETE quitar día bloqueado
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
    .from('dias_bloqueados')
    .delete()
    .eq('id', id)
    .eq('tenant_id', payload.tenantId);

  if (error) {
    console.error('[horarios DELETE]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
