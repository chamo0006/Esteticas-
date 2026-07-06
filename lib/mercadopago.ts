import { MercadoPagoConfig, Preference, Payment, PaymentRefund } from 'mercadopago';
import { supabase } from './supabase';
import { refreshAccessToken } from './mp-oauth';

// Exporta el cliente configurado con el access token de la estética (o el de la plataforma)
export function getMPClient(accessToken: string) {
  return new MercadoPagoConfig({ accessToken });
}

// Renueva el token unos minutos antes de que venza, para evitar cobros fallidos.
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

// Devuelve el access token de MercadoPago de un tenant, o null si no lo conectó.
// Cada estética cobra las señas a SU propia cuenta; si no configuró ninguna,
// el llamador puede caer al token de plataforma (process.env.MP_ACCESS_TOKEN).
// Si el token de OAuth está vencido (o por vencer), lo renueva con el refresh token.
export async function getTenantMPToken(tenantId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('tenants')
    .select('mp_access_token, mp_refresh_token, mp_token_expires_at')
    .eq('id', tenantId)
    .single();

  if (error || !data?.mp_access_token) return null;

  // Token vinculado por OAuth con vencimiento → renovar si está por expirar
  const expiresAt = data.mp_token_expires_at ? new Date(data.mp_token_expires_at).getTime() : null;
  const necesitaRenovar =
    !!data.mp_refresh_token &&
    expiresAt !== null &&
    expiresAt - Date.now() < TOKEN_REFRESH_BUFFER_MS;

  if (necesitaRenovar) {
    try {
      const renewed = await refreshAccessToken(data.mp_refresh_token as string);
      const nuevoVencimiento = new Date(Date.now() + renewed.expires_in * 1000).toISOString();
      await supabase
        .from('tenants')
        .update({
          mp_access_token: renewed.access_token,
          mp_refresh_token: renewed.refresh_token,
          mp_token_expires_at: nuevoVencimiento,
          ...(renewed.public_key ? { mp_public_key: renewed.public_key } : {}),
        })
        .eq('id', tenantId);
      return renewed.access_token;
    } catch (err) {
      console.error('[getTenantMPToken] no se pudo renovar el token:', err);
      // Devolvemos el token actual igual; si ya venció, el cobro fallará y se re-vincula.
      return data.mp_access_token as string;
    }
  }

  return data.mp_access_token as string;
}

// Resuelve el token a usar para un tenant: el suyo propio o, como fallback,
// el de la plataforma. Devuelve null si no hay ninguno configurado.
export async function resolveMPToken(tenantId: string): Promise<string | null> {
  return (await getTenantMPToken(tenantId)) ?? process.env.MP_ACCESS_TOKEN ?? null;
}

// Devuelve (total o parcialmente) un pago ya acreditado en MercadoPago.
// Si se pasa `amount`, es una devolución parcial; si se omite, devuelve el total.
// Usa la cuenta del tenant que cobró la seña (el mismo token con el que se creó).
export async function refundMPPayment(
  accessToken: string,
  paymentId: string,
  amount?: number
) {
  const client = getMPClient(accessToken);
  const refundClient = new PaymentRefund(client);
  return refundClient.create({
    payment_id: paymentId,
    ...(amount != null ? { body: { amount } } : {}),
  });
}

export { Preference, Payment };
