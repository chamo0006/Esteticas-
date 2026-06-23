import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createToken } from '@/lib/auth';

export async function POST(req: Request) {
  const { password } = await req.json();

  const expected = process.env.SUPERADMIN_PASSWORD;
  if (!expected || !password) {
    return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 });
  }

  // Si SUPERADMIN_PASSWORD es un hash bcrypt ($2b$...) lo comparamos con bcrypt,
  // de lo contrario hacemos comparación directa (modo legacy).
  const valid = expected.startsWith('$2')
    ? await bcrypt.compare(password, expected)
    : password === expected;

  if (!valid) {
    return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 });
  }

  const token = await createToken({
    adminId: 'superadmin',
    tenantId: 'none',
    tenantSlug: 'none',
    nombre: 'Super Admin',
    rol: 'superadmin',
  });

  const res = NextResponse.json({ ok: true });
  res.cookies.set('admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24,
    path: '/',
  });
  return res;
}
