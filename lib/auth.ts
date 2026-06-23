import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { supabase } from './supabase';

if (!process.env.ADMIN_JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('[auth] ADMIN_JWT_SECRET no está configurado. Definí la variable de entorno antes de deployar.');
  } else {
    console.warn('[auth] ADMIN_JWT_SECRET no configurado — usando secreto de desarrollo. NO usar en producción.');
  }
}

const SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET ?? 'dev-secret-change-in-production'
);

export interface AdminPayload {
  adminId: string;
  tenantId: string;
  tenantSlug: string;
  nombre: string;
  rol: string;
  scope?: 'platform' | 'tenant';
  impersonatedBy?: string;   // id del platform_admin que está impersonando
}

// Roles del panel Superadmin (NO son roles de comercio)
export const PLATFORM_ROLES = ['superadmin', 'finanzas', 'soporte'] as const;

export function isPlatformAdmin(payload: AdminPayload | null | undefined): boolean {
  return !!payload && (PLATFORM_ROLES as readonly string[]).includes(payload.rol);
}

// finanzas y superadmin ven facturación; soporte no.
export function canSeeBilling(payload: AdminPayload | null | undefined): boolean {
  return !!payload && (payload.rol === 'superadmin' || payload.rol === 'finanzas');
}

export async function createToken(payload: AdminPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<AdminPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as AdminPayload;
  } catch {
    return null;
  }
}

export async function loginAdmin(
  tenantSlug: string,
  email: string,
  password: string
): Promise<AdminPayload | null> {
  // Join usuarios_admin with tenants to verify slug and active status
  const { data, error } = await supabase
    .from('usuarios_admin')
    .select('id, nombre, password_hash, rol, tenant_id, tenants!inner(slug, activo)')
    .eq('email', email)
    .eq('activo', true)
    .eq('tenants.slug', tenantSlug)
    .eq('tenants.activo', true)
    .single();

  if (error || !data) return null;

  const valid = await bcrypt.compare(password, data.password_hash);
  if (!valid) return null;

  return {
    adminId: data.id,
    tenantId: data.tenant_id,
    tenantSlug,
    nombre: data.nombre,
    rol: data.rol,
    scope: 'tenant',
  };
}

/**
 * Login del panel Superadmin contra la tabla platform_admins.
 * Reemplaza el viejo login por contraseña en .env (SUPERADMIN_PASSWORD).
 */
export async function loginSuperadmin(
  email: string,
  password: string
): Promise<AdminPayload | null> {
  const { data, error } = await supabase
    .from('platform_admins')
    .select('id, nombre, password_hash, rol, activo')
    .eq('email', email.toLowerCase().trim())
    .eq('activo', true)
    .single();

  if (error || !data) return null;

  const valid = await bcrypt.compare(password, data.password_hash);
  if (!valid) return null;

  // Marca el último acceso (no bloquea el login si falla)
  await supabase
    .from('platform_admins')
    .update({ ultimo_acceso: new Date().toISOString() })
    .eq('id', data.id);

  return {
    adminId: data.id,
    tenantId: 'none',
    tenantSlug: 'none',
    nombre: data.nombre,
    rol: data.rol,
    scope: 'platform',
  };
}
