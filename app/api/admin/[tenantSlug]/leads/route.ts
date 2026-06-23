import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

// Los leads de la landing son globales (sin tenant_id): solo superadmin puede verlos.
async function getSuperadminPayload() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload || payload.rol !== 'superadmin') return null;
  return payload;
}

export async function GET(
  _req: Request,
  _ctx: { params: Promise<{ tenantSlug: string }> }
) {
  const payload = await getSuperadminPayload();
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const { data, error } = await supabase
    .from('leads')
    .select('id, nombre, email, telefono, estetica, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[leads GET]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
