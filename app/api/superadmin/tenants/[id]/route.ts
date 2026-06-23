import { NextResponse } from 'next/server';
import { getPlatformAdmin } from '@/lib/superadmin-auth';
import { canSeeBilling } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

const CAMPOS_EDITABLES = [
  'plan_id', 'estado', 'ciclo', 'fecha_fin', 'dias_gracia',
  'descuento_porcentaje', 'descuento_motivo', 'precio_acordado',
  'dias_bonus', 'notas', 'bloqueado',
] as const;

// Actualiza la suscripción de un comercio (crea la fila si no existe).
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getPlatformAdmin();
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!canSeeBilling(admin)) {
    return NextResponse.json({ error: 'Sin permisos de facturación' }, { status: 403 });
  }

  const { id: tenantId } = await params;
  const body = await req.json();

  const update: Record<string, unknown> = {};
  for (const campo of CAMPOS_EDITABLES) {
    if (campo in body) update[campo] = body[campo] === '' ? null : body[campo];
  }
  if ('bloqueado' in update) {
    update.bloqueado_at = update.bloqueado ? new Date().toISOString() : null;
  }

  const { error } = await supabase
    .from('suscripciones')
    .upsert({ tenant_id: tenantId, ...update }, { onConflict: 'tenant_id' });

  if (error) {
    console.error('[superadmin/tenants PATCH]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }

  // El corte de servicio se refleja en tenants.activo (lo usan el sitio y el admin)
  if ('bloqueado' in update) {
    await supabase.from('tenants').update({ activo: !update.bloqueado }).eq('id', tenantId);
  }

  await supabase.from('superadmin_logs').insert({
    platform_admin_id: admin.adminId,
    accion: 'editar_suscripcion',
    tenant_id: tenantId,
    detalle: update,
  });

  return NextResponse.json({ ok: true });
}

// Elimina un comercio por completo (turnos, clientes, servicios, etc. se borran en cascada).
// Solo superadmin. Acción irreversible.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getPlatformAdmin();
  if (!admin || admin.rol !== 'superadmin') {
    return NextResponse.json({ error: 'Solo el superadmin puede eliminar comercios' }, { status: 403 });
  }

  const { id: tenantId } = await params;

  // Snapshot para la auditoría antes de borrar
  const { data: tenant } = await supabase
    .from('tenants')
    .select('nombre, slug')
    .eq('id', tenantId)
    .single();

  const { error } = await supabase.from('tenants').delete().eq('id', tenantId);

  if (error) {
    console.error('[superadmin/tenants DELETE]', error);
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });
  }

  await supabase.from('superadmin_logs').insert({
    platform_admin_id: admin.adminId,
    accion: 'eliminar_comercio',
    tenant_id: null, // el tenant ya no existe
    detalle: { nombre: tenant?.nombre, slug: tenant?.slug },
  });

  return NextResponse.json({ ok: true });
}
