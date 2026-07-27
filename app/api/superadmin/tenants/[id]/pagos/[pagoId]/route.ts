import { NextResponse } from 'next/server';
import { getPlatformAdmin } from '@/lib/superadmin-auth';
import { canSeeBilling } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { recalcularVencimientoSiCorresponde } from '@/lib/suscripcion-renovacion';

const CAMPOS_EDITABLES = [
  'monto', 'metodo', 'estado', 'periodo_inicio', 'periodo_fin',
  'fecha_pago', 'referencia_externa', 'notas',
] as const;

// PATCH /api/superadmin/tenants/[id]/pagos/[pagoId]
// Corrige un pago ya registrado (monto mal cargado, estado equivocado, etc).
// Si lo corregís a "aprobado" con un período, renueva la suscripción igual
// que al registrar un pago nuevo. Si el pago editado era el que había fijado
// el vencimiento vigente y deja de justificarlo (cambia de estado o de
// período), la suscripción se recalcula en base al pago aprobado que quede.
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
    .select('estado, periodo_fin')
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

  // Si el pago YA era aprobado con período antes de este cambio, hay que
  // verificar que ese período siga vigente en la suscripción (por si esta
  // edición lo cambió de estado o de fecha).
  if (pagoPrevio.estado === 'aprobado' && pagoPrevio.periodo_fin) {
    await recalcularVencimientoSiCorresponde(tenantId, pagoPrevio.periodo_fin);
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
// Borra un pago cargado por error (ej: pruebas, duplicados). Si ese pago era
// el que había extendido el vencimiento vigente de la suscripción, lo
// recalcula en base al pago aprobado que quede (o lo deja sin vencimiento).
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; pagoId: string }> }) {
  const admin = await getPlatformAdmin();
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!canSeeBilling(admin)) {
    return NextResponse.json({ error: 'Sin permisos de facturación' }, { status: 403 });
  }

  const { id: tenantId, pagoId } = await params;

  const { data: pago } = await supabase
    .from('pagos_suscripcion')
    .select('monto, metodo, estado, periodo_fin')
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

  if (pago.estado === 'aprobado' && pago.periodo_fin) {
    await recalcularVencimientoSiCorresponde(tenantId, pago.periodo_fin);
  }

  await supabase.from('superadmin_logs').insert({
    platform_admin_id: admin.adminId,
    accion: 'borrar_pago',
    tenant_id: tenantId,
    detalle: { pagoId, ...pago },
  });

  return NextResponse.json({ ok: true });
}
