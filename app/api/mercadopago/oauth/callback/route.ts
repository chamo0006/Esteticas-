import { NextResponse } from 'next/server';
import { verifyState, exchangeCodeForTokens } from '@/lib/mp-oauth';
import { supabase } from '@/lib/supabase';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';

// Adónde vuelve el dueño después de vincular (pestaña Pagos de su configuración)
function configUrl(tenantSlug: string, status: 'ok' | 'error'): string {
  return `${BASE_URL}/admin/${tenantSlug}/configuracion?tab=pagos&mp=${status}`;
}

// GET — MercadoPago redirige acá con ?code=...&state=...
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  // Validamos el state ANTES de nada (identifica al tenant + protege CSRF)
  const parsed = state ? await verifyState(state) : null;
  if (!parsed) {
    // Sin tenant válido no sabemos a dónde volver; al panel genérico.
    return NextResponse.redirect(`${BASE_URL}/admin/login`);
  }

  if (!code) {
    return NextResponse.redirect(configUrl(parsed.tenantSlug, 'error'));
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    const { error } = await supabase
      .from('tenants')
      .update({
        mp_access_token: tokens.access_token,
        mp_refresh_token: tokens.refresh_token,
        mp_user_id: String(tokens.user_id),
        mp_public_key: tokens.public_key ?? null,
        mp_token_expires_at: expiresAt,
      })
      .eq('id', parsed.tenantId);

    if (error) {
      console.error('[mp oauth callback] error guardando tokens:', error);
      return NextResponse.redirect(configUrl(parsed.tenantSlug, 'error'));
    }

    return NextResponse.redirect(configUrl(parsed.tenantSlug, 'ok'));
  } catch (err) {
    console.error('[mp oauth callback]', err);
    return NextResponse.redirect(configUrl(parsed.tenantSlug, 'error'));
  }
}
