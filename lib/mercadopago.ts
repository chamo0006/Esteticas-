import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

// Exporta el cliente configurado con el access token de la estética (o el de la plataforma)
export function getMPClient(accessToken: string) {
  return new MercadoPagoConfig({ accessToken });
}

export { Preference, Payment };
