import { NextResponse } from 'next/server';
import { getPlatformAdmin } from '@/lib/superadmin-auth';
import { canSeeBilling } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

// Lista los pagos de suscripción de un comercio.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getPlatformAdmin();
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!canSeeBilling(admin)) {
    return NextResponse.json({ error: 'Sin permisos de facturación' }, { status: 403 });
  }

  const { id: tenantId } = await params;
  const { data, error } = await supabase
    .from('pagos_suscripcion')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[superadmin/pagos GET]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}

// Registra un pago de suscripción. Si está aprobado y trae periodo_fin,
// renueva la suscripción (extiende el vencimiento y la reactiva).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getPlatformAdmin();
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!canSeeBilling(admin)) {
    return NextResponse.json({ error: 'Sin permisos de facturación' }, { status: 403 });
  }

  const { id: tenantId } = await params;
  const body = await req.json();
  const { monto, metodo, estado, periodo_inicio, periodo_fin, fecha_pago, referencia_externa, notas } = body;

  if (monto == null || !metodo || !estado) {
    return NextResponse.json({ error: 'Datos incompletos (monto, método, estado)' }, { status: 400 });
  }

  // Suscripción actual para snapshot de plan (y para saber si hay un cambio de plan pendiente)
  const { data: susc } = await supabase
    .from('suscripciones')
    .select('id, plan_id, plan_pendiente_id')
    .eq('tenant_id', tenantId)
    .single();

  // Si el pago es aprobado y renueva el período, un cambio de plan que el
  // dueño haya pedido desde su panel se aplica recién ahora.
  const planEfectivoId = (estado === 'aprobado' && periodo_fin && susc?.plan_pendiente_id)
    ? susc.plan_pendiente_id
    : (susc?.plan_id ?? null);

  // Snapshot histórico del plan al momento del pago (no se ve afectado si
  // más adelante se editan precios/features del plan).
  const { data: planSnapshot } = planEfectivoId
    ? await supabase.from('planes').select('nombre, precio_mensual, precio_anual, features').eq('id', planEfectivoId).maybeSingle()
    : { data: null };

  const { error } = await supabase.from('pagos_suscripcion').insert({
    tenant_id: tenantId,
    suscripcion_id: susc?.id ?? null,
    plan_id: planEfectivoId,
    plan_nombre_snapshot: planSnapshot?.nombre ?? null,
    plan_precio_snapshot: planSnapshot?.precio_mensual ?? null,
    plan_features_snapshot: planSnapshot?.features ?? null,
    monto,
    metodo,
    estado,
    periodo_inicio: periodo_inicio || null,
    periodo_fin: periodo_fin || null,
    fecha_pago: estado === 'aprobado' ? (fecha_pago || new Date().toISOString()) : (fecha_pago || null),
    referencia_externa: referencia_externa || null,
    notas: notas || null,
  });

  if (error) {
    console.error('[superadmin/pagos POST]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }

  // Pago aprobado con período → renueva la suscripción y aplica el cambio de plan pendiente (si había)
  if (estado === 'aprobado' && periodo_fin) {
    await supabase
      .from('suscripciones')
      .update({
        fecha_fin: periodo_fin,
        estado: 'activa',
        bloqueado: false,
        bloqueado_at: null,
        ...(susc?.plan_pendiente_id ? { plan_id: susc.plan_pendiente_id, plan_pendiente_id: null } : {}),
      })
      .eq('tenant_id', tenantId);
    await supabase.from('tenants').update({ activo: true }).eq('id', tenantId);
  }

  await supabase.from('superadmin_logs').insert({
    platform_admin_id: admin.adminId,
    accion: 'registrar_pago',
    tenant_id: tenantId,
    detalle: { monto, metodo, estado },
  });

  return NextResponse.json({ ok: true });
}
