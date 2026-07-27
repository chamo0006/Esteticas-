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
// suscripción. La modalidad de cobro (manual/automático) NO está acá — la
// define solo el superadmin desde /api/superadmin/tenants/[id]/modalidad-cobro.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;
  const payload = await getAdminPayload(tenantSlug);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await req.json();
  const { accion } = body;

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
