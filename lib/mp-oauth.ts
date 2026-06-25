import { SignJWT, jwtVerify } from 'jose';

// ── Configuración ────────────────────────────────────────────────────────────
// Registrá tu aplicación de plataforma en: https://www.mercadopago.com.ar/developers
// y completá estas variables de entorno.
export const MP_CLIENT_ID = process.env.MP_CLIENT_ID ?? '';
export const MP_CLIENT_SECRET = process.env.MP_CLIENT_SECRET ?? '';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
export const MP_REDIRECT_URI = `${BASE_URL}/api/mercadopago/oauth/callback`;

const AUTH_BASE = 'https://auth.mercadopago.com.ar/authorization';
const TOKEN_URL = 'https://api.mercadopago.com/oauth/token';

const SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET ?? 'dev-secret-change-in-production'
);

export function isOAuthConfigured(): boolean {
  return !!MP_CLIENT_ID && !!MP_CLIENT_SECRET;
}

// ── State firmado (CSRF + identifica al tenant en el callback) ───────────────
export async function signState(tenantId: string, tenantSlug: string): Promise<string> {
  return new SignJWT({ tenantId, tenantSlug })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('10m')
    .sign(SECRET);
}

export async function verifyState(
  state: string
): Promise<{ tenantId: string; tenantSlug: string } | null> {
  try {
    const { payload } = await jwtVerify(state, SECRET);
    if (typeof payload.tenantId !== 'string' || typeof payload.tenantSlug !== 'string') return null;
    return { tenantId: payload.tenantId, tenantSlug: payload.tenantSlug };
  } catch {
    return null;
  }
}

// ── URL de autorización a la que mandamos al dueño ───────────────────────────
export function buildAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: MP_CLIENT_ID,
    response_type: 'code',
    platform_id: 'mp',
    state,
    redirect_uri: MP_REDIRECT_URI,
  });
  return `${AUTH_BASE}?${params.toString()}`;
}

// ── Respuesta de los endpoints de token de MercadoPago ───────────────────────
export interface MPTokenResponse {
  access_token: string;
  refresh_token: string;
  user_id: number | string;
  public_key?: string;
  expires_in: number; // segundos
}

// Intercambia el `code` del callback por los tokens del comercio
export async function exchangeCodeForTokens(code: string): Promise<MPTokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: MP_CLIENT_ID,
      client_secret: MP_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: MP_REDIRECT_URI,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`MP token exchange falló (${res.status}): ${detail}`);
  }
  return res.json();
}

// Renueva el access token usando el refresh token (no requiere re-vincular)
export async function refreshAccessToken(refreshToken: string): Promise<MPTokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: MP_CLIENT_ID,
      client_secret: MP_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`MP token refresh falló (${res.status}): ${detail}`);
  }
  return res.json();
}
