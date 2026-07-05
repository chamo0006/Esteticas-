import { cookies } from 'next/headers';
import { verifyToken, isPlatformAdmin, SUPERADMIN_COOKIE, type AdminPayload } from './auth';

/**
 * Devuelve el platform admin logueado (superadmin/finanzas/soporte) o null.
 * Para usar en route handlers y server components del panel /superadmin.
 *
 * Lee la cookie propia del panel de plataforma (SUPERADMIN_COOKIE), separada de
 * la de comercio: así impersonar o loguear un comercio no invalida esta sesión.
 */
export async function getPlatformAdmin(): Promise<AdminPayload | null> {
  const token = (await cookies()).get(SUPERADMIN_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  return isPlatformAdmin(payload) ? payload : null;
}
