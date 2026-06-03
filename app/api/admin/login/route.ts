import { NextResponse } from 'next/server';
import { loginAdmin, createToken } from '@/lib/auth';

export async function POST(req: Request) {
  const { tenantSlug, email, password } = await req.json();

  if (!tenantSlug || !email || !password) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
  }

  try {
    const payload = await loginAdmin(tenantSlug, email, password);
    if (!payload) {
      return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 });
    }

    const token = await createToken(payload);

    const res = NextResponse.json({ tenantSlug: payload.tenantSlug });
    res.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 horas
      path: '/',
    });

    return res;
  } catch (err) {
    console.error('[admin/login]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
