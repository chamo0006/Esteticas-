import { NextResponse } from 'next/server';
import { ADMIN_COOKIE, SUPERADMIN_COOKIE } from '@/lib/auth';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  // Cierra la sesión de plataforma y descarta cualquier impersonación colgada.
  res.cookies.delete(SUPERADMIN_COOKIE);
  res.cookies.delete(ADMIN_COOKIE);
  return res;
}
