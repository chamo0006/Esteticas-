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

// PATCH /api/admin/[tenantSlug]/suscripcion  body: { accion, ... }
// Acciones self-service que puede hacer el dueño del comercio sobre su propia
// suscripción. Ninguna de estas cobra ni renueva nada automáticamente todavía
// (la facturación sigue siendo manual): solo registran la intención, que se
// aplica en el próximo pago que registre el superadmin.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;
  const payload = await getAdminPayload(tenantSlug);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await req.json();
  const { accion } = body;

  if (accion === 'toggle_renovacion') {
    const { renovacion_automatica } = body;
    if (typeof renovacion_automatica !== 'boolean') {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }
    const { error } = await supabase
      .from('suscripciones')
      .update({ renovacion_automatica })
      .eq('tenant_id', payload.tenantId);
    if (error) return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (accion === 'solicitar_cambio_plan') {
    const { plan_id } = body;
    if (typeof plan_id !== 'string' && plan_id !== null) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }
    if (plan_id) {
      const { data: plan } = await supabase.from('planes').select('id').eq('id', plan_id).eq('activo', true).maybeSingle();
      if (!plan) return NextResponse.json({ error: 'Plan inválido' }, { status: 400 });
    }
    const { error } = await supabase
      .from('suscripciones')
      .update({ plan_pendiente_id: plan_id })
      .eq('tenant_id', payload.tenantId);
    if (error) return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (accion === 'cancelar') {
    const { motivo } = body;
    const { error } = await supabase
      .from('suscripciones')
      .update({ cancelada_at: new Date().toISOString(), motivo_cancelacion: motivo || null })
      .eq('tenant_id', payload.tenantId);
    if (error) return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (accion === 'reactivar_cancelacion') {
    const { error } = await supabase
      .from('suscripciones')
      .update({ cancelada_at: null, motivo_cancelacion: null })
      .eq('tenant_id', payload.tenantId);
    if (error) return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });
}
