import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getPlatformAdmin } from '@/lib/superadmin-auth';
import { supabase } from '@/lib/supabase';

// Gestión de las cuentas de acceso (usuarios_admin) de un comercio: soporte
// para cuando el dueño se olvida el email, el nombre o la contraseña. Es una
// acción sensible (equivale a poder tomar control de la cuenta), así que
// queda reservada a superadmin — igual que impersonar o eliminar un comercio.

// GET /api/superadmin/tenants/[id]/usuarios
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getPlatformAdmin();
  if (!admin || admin.rol !== 'superadmin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { id: tenantId } = await params;
  const { data, error } = await supabase
    .from('usuarios_admin')
    .select('id, nombre, email, rol, activo, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at');

  if (error) {
    console.error('[superadmin/usuarios GET]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}

// PATCH /api/superadmin/tenants/[id]/usuarios  body: { usuarioId, nombre?, email?, password?, activo? }
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getPlatformAdmin();
  if (!admin || admin.rol !== 'superadmin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { id: tenantId } = await params;
  const { usuarioId, nombre, email, password, activo } = await req.json();
  if (!usuarioId) return NextResponse.json({ error: 'Falta el usuario' }, { status: 400 });

  const update: Record<string, unknown> = {};
  if (typeof nombre === 'string' && nombre.trim()) update.nombre = nombre.trim();
  if (typeof email === 'string' && email.trim()) update.email = email.trim().toLowerCase();
  if (typeof activo === 'boolean') update.activo = activo;
  if (typeof password === 'string' && password) {
    if (password.length < 6) {
      return NextResponse.json({ error: 'La contraseña tiene que tener al menos 6 caracteres' }, { status: 400 });
    }
    update.password_hash = await bcrypt.hash(password, 10);
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Sin cambios para guardar' }, { status: 400 });
  }

  const { error } = await supabase
    .from('usuarios_admin')
    .update(update)
    .eq('id', usuarioId)
    .eq('tenant_id', tenantId);

  if (error) {
    // Índice único (email, tenant_id) — mismo email ya usado en ese comercio.
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Ya hay otra cuenta con ese email en este comercio' }, { status: 409 });
    }
    console.error('[superadmin/usuarios PATCH]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }

  await supabase.from('superadmin_logs').insert({
    platform_admin_id: admin.adminId,
    accion: 'editar_usuario_admin',
    tenant_id: tenantId,
    // No logueamos la contraseña nueva, solo qué campos se tocaron.
    detalle: { usuarioId, campos: Object.keys(update).filter((c) => c !== 'password_hash') , password_cambiada: 'password_hash' in update },
  });

  return NextResponse.json({ ok: true });
}
