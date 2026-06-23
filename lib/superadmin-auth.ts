import { cookies } from 'next/headers';
import { verifyToken, isPlatformAdmin, type AdminPayload } from './auth';

/**
 * Devuelve el platform admin logueado (superadmin/finanzas/soporte) o null.
 * Para usar en route handlers y server components del panel /superadmin.
 */
export async function getPlatformAdmin(): Promise<AdminPayload | null> {
  const token = (await cookies()).get('admin_token')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  return isPlatformAdmin(payload) ? payload : null;
}
