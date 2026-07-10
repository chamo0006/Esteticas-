import { NextResponse } from 'next/server';
import { getPlatformAdmin } from '@/lib/superadmin-auth';
import { canSeeBilling } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

const CAMPOS_EDITABLES = [
  'monto', 'metodo', 'estado', 'periodo_inicio', 'periodo_fin',
  'fecha_pago', 'referencia_externa', 'notas',
] as const;

// PATCH /api/superadmin/tenants/[id]/pagos/[pagoId]
// Corrige un pago ya registrado (monto mal cargado, estado equivocado, etc).
// Si lo corregís a "aprobado" con un período, renueva la suscripción igual
// que al registrar un pago nuevo. No revierte nada si lo cambiás a otro estado.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; pagoId: string }> }) {
  const admin = await getPlatformAdmin();
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!canSeeBilling(admin)) {
    return NextResponse.json({ error: 'Sin permisos de facturación' }, { status: 403 });
  }

  const { id: tenantId, pagoId } = await params;
  const body = await req.json();

  const { data: pagoPrevio } = await supabase
    .from('pagos_suscripcion')
    .select('estado')
    .eq('id', pagoId)
    .eq('tenant_id', tenantId)
    .single();
  if (!pagoPrevio) return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 });

  const update: Record<string, unknown> = {};
  for (const campo of CAMPOS_EDITABLES) {
    if (campo in body) update[campo] = body[campo] === '' ? null : body[campo];
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Sin campos para actualizar' }, { status: 400 });
  }

  const { error } = await supabase
    .from('pagos_suscripcion')
    .update(update)
    .eq('id', pagoId)
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('[superadmin/pagos PATCH]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }

  // Si quedó aprobado con período y antes no lo estaba, renueva la suscripción
  // (misma lógica que al registrar un pago nuevo).
  if (update.estado === 'aprobado' && update.periodo_fin && pagoPrevio.estado !== 'aprobado') {
    await supabase
      .from('suscripciones')
      .update({ fecha_fin: update.periodo_fin, estado: 'activa', bloqueado: false, bloqueado_at: null })
      .eq('tenant_id', tenantId);
    await supabase.from('tenants').update({ activo: true }).eq('id', tenantId);
  }

  await supabase.from('superadmin_logs').insert({
    platform_admin_id: admin.adminId,
    accion: 'editar_pago',
    tenant_id: tenantId,
    detalle: { pagoId, ...update },
  });

  return NextResponse.json({ ok: true });
}

// DELETE /api/superadmin/tenants/[id]/pagos/[pagoId]
// Borra un pago cargado por error (ej: pruebas, duplicados). No revierte
// automáticamente ningún cambio que ese pago haya generado en la suscripción.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; pagoId: string }> }) {
  const admin = await getPlatformAdmin();
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!canSeeBilling(admin)) {
    return NextResponse.json({ error: 'Sin permisos de facturación' }, { status: 403 });
  }

  const { id: tenantId, pagoId } = await params;

  const { data: pago } = await supabase
    .from('pagos_suscripcion')
    .select('monto, metodo, estado')
    .eq('id', pagoId)
    .eq('tenant_id', tenantId)
    .single();
  if (!pago) return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 });

  const { error } = await supabase
    .from('pagos_suscripcion')
    .delete()
    .eq('id', pagoId)
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('[superadmin/pagos DELETE]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }

  await supabase.from('superadmin_logs').insert({
    platform_admin_id: admin.adminId,
    accion: 'borrar_pago',
    tenant_id: tenantId,
    detalle: { pagoId, ...pago },
  });

  return NextResponse.json({ ok: true });
}
