import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createToken } from '@/lib/auth';
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

  // Guarda el token de superadmin para poder volver
  const cookieStore = await cookies();
  const currentToken = cookieStore.get('admin_token')?.value;

  await supabase.from('superadmin_logs').insert({
    platform_admin_id: admin.adminId,
    accion: 'impersonate',
    tenant_id: tenant.id,
    detalle: { tenant_slug: tenant.slug },
  });

  const res = NextResponse.json({ ok: true, tenantSlug: tenant.slug });
  if (currentToken) {
    res.cookies.set('superadmin_token', currentToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,
      path: '/',
    });
  }
  res.cookies.set('admin_token', tenantToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24,
    path: '/',
  });
  return res;
}

// Salir del impersonate: vuelve a la sesión de superadmin.
export async function DELETE() {
  const cookieStore = await cookies();
  const saved = cookieStore.get('superadmin_token')?.value;

  const res = NextResponse.json({ ok: true });
  if (saved) {
    res.cookies.set('admin_token', saved, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,
      path: '/',
    });
    res.cookies.delete('superadmin_token');
  } else {
    res.cookies.delete('admin_token');
  }
  return res;
}
