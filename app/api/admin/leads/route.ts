import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

async function getSuperAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload || payload.rol !== 'superadmin') return null;
  return payload;
}

export async function GET() {
  if (!(await getSuperAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[leads GET]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function PATCH(req: Request) {
  if (!(await getSuperAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id, estado } = await req.json();
  if (!id || !estado) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
  }

  const { error } = await supabase
    .from('leads')
    .update({ estado })
    .eq('id', id);

  if (error) {
    console.error('[leads PATCH]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
