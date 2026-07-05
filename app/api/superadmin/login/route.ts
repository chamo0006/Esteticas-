import { NextResponse } from 'next/server';
import { loginSuperadmin, createToken, SUPERADMIN_COOKIE } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
  }

  try {
    const payload = await loginSuperadmin(email, password);
    if (!payload) {
      return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 });
    }

    const token = await createToken(payload);

    // Auditoría (no bloquea el login si falla)
    await supabase.from('superadmin_logs').insert({
      platform_admin_id: payload.adminId,
      accion: 'login',
    });

    const res = NextResponse.json({ ok: true, rol: payload.rol });
    res.cookies.set(SUPERADMIN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 horas
      path: '/',
    });
    return res;
  } catch (err) {
    console.error('[superadmin/login]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
