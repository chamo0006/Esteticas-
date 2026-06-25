import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

async function getAdminPayload(tenantSlug: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload || payload.tenantSlug !== tenantSlug) return null;
  return payload;
}

// Muestra solo los últimos 4 caracteres del token, nunca el token completo.
function maskToken(token: string | null): string | null {
  if (!token) return null;
  return `••••${token.slice(-4)}`;
}

// GET — estado de la conexión con MercadoPago (sin exponer el token)
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;
  const payload = await getAdminPayload(tenantSlug);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { data } = await supabase
    .from('tenants')
    .select('mp_access_token, mp_public_key')
    .eq('id', payload.tenantId)
    .single();

  return NextResponse.json({
    conectado: !!data?.mp_access_token,
    preview: maskToken(data?.mp_access_token ?? null),
    public_key: data?.mp_public_key ?? null,
  });
}

// PUT — guarda/actualiza las credenciales de MercadoPago de la estética
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;
  const payload = await getAdminPayload(tenantSlug);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  let body: { access_token?: string; public_key?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const accessToken = (body.access_token ?? '').trim();
  const publicKey = (body.public_key ?? '').trim();

  // Los tokens de MP son APP_USR-… (producción) o TEST-… (pruebas)
  if (!/^(APP_USR|TEST)-/.test(accessToken) || accessToken.length < 20) {
    return NextResponse.json(
      { error: 'El Access Token no es válido. Copialo desde tus credenciales de MercadoPago (empieza con APP_USR- o TEST-).' },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from('tenants')
    .update({
      mp_access_token: accessToken,
      mp_public_key: publicKey || null,
    })
    .eq('id', payload.tenantId);

  if (error) {
    console.error('[mercadopago PUT]', error);
    return NextResponse.json({ error: 'Error al guardar las credenciales' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, preview: maskToken(accessToken) });
}

// DELETE — desconecta la cuenta de MercadoPago
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;
  const payload = await getAdminPayload(tenantSlug);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { error } = await supabase
    .from('tenants')
    .update({ mp_access_token: null, mp_public_key: null })
    .eq('id', payload.tenantId);

  if (error) {
    console.error('[mercadopago DELETE]', error);
    return NextResponse.json({ error: 'Error al desconectar' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
