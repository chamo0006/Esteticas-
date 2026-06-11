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
  };
}
