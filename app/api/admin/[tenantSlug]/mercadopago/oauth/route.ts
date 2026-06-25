import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { buildAuthorizationUrl, signState, isOAuthConfigured } from '@/lib/mp-oauth';

// GET — arranca el flujo de vinculación con MercadoPago.
// Verifica que sea el admin del tenant, firma un `state` y redirige a MercadoPago.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;

  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload || payload.tenantSlug !== tenantSlug) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  if (!isOAuthConfigured()) {
    return NextResponse.json(
      { error: 'La vinculación con MercadoPago no está configurada en la plataforma (falta MP_CLIENT_ID / MP_CLIENT_SECRET).' },
      { status: 503 }
    );
  }

  const state = await signState(payload.tenantId, tenantSlug);
  return NextResponse.redirect(buildAuthorizationUrl(state));
}
