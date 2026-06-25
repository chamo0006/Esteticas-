import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { supabase } from './supabase';

// Exporta el cliente configurado con el access token de la estética (o el de la plataforma)
export function getMPClient(accessToken: string) {
  return new MercadoPagoConfig({ accessToken });
}

// Devuelve el access token de MercadoPago de un tenant, o null si no lo conectó.
// Cada estética cobra las señas a SU propia cuenta; si no configuró ninguna,
// el llamador puede caer al token de plataforma (process.env.MP_ACCESS_TOKEN).
export async function getTenantMPToken(tenantId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('tenants')
    .select('mp_access_token')
    .eq('id', tenantId)
    .single();

  if (error || !data?.mp_access_token) return null;
  return data.mp_access_token as string;
}

// Resuelve el token a usar para un tenant: el suyo propio o, como fallback,
// el de la plataforma. Devuelve null si no hay ninguno configurado.
export async function resolveMPToken(tenantId: string): Promise<string | null> {
  return (await getTenantMPToken(tenantId)) ?? process.env.MP_ACCESS_TOKEN ?? null;
}

export { Preference, Payment };
