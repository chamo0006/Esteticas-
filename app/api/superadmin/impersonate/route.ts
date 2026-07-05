import { NextResponse } from 'next/server';
import { createToken, ADMIN_COOKIE } from '@/lib/auth';
import { getPlatformAdmin } from '@/lib/superadmin-auth';
import { supabase } from '@/lib/supabase';

// Iniciar impersonate: el superadmin entra como un comercio.
export async function POST(req: Request) {
  const admin = await getPlatformAdmin();
  if (!admin || admin.rol !== 'superadmin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { tenantId } = await req.json();
  if (!tenantId) {
    return NextResponse.json({ error: 'Falta tenantId' }, { status: 400 });
  }

  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('id, slug, nombre')
    .eq('id', tenantId)
    .single();

  if (error || !tenant) {
    return NextResponse.json({ error: 'Comercio no encontrado' }, { status: 404 });
  }

  // Token de comercio, marcado como impersonación
  const tenantToken = await createToken({
    adminId: admin.adminId,
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    nombre: `${admin.nombre} (superadmin)`,
    rol: 'admin',
    scope: 'tenant',
    impersonatedBy: admin.adminId,
  });

  await supabase.from('superadmin_logs').insert({
    platform_admin_id: admin.adminId,
    accion: 'impersonate',
    tenant_id: tenant.id,
    detalle: { tenant_slug: tenant.slug },
  });

  // Solo seteamos la cookie de comercio. La sesión de superadmin vive en su
  // propia cookie (SUPERADMIN_COOKIE) y queda intacta, así que no hay que
  // guardarla ni restaurarla: el panel /superadmin sigue funcionando en paralelo.
  const res = NextResponse.json({ ok: true, tenantSlug: tenant.slug });
  res.cookies.set(ADMIN_COOKIE, tenantToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24,
    path: '/',
  });
  return res;
}

// Salir del impersonate: descarta la sesión de comercio; la de superadmin sigue viva.
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(ADMIN_COOKIE);
  return res;
}
