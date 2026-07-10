import { MercadoPagoConfig, PreApproval, Preference } from 'mercadopago';

// Cobro de suscripciones: SIEMPRE va a la cuenta de MercadoPago de la
// plataforma (nunca la del tenant) — es la plataforma cobrándole al comercio,
// dirección opuesta al flujo de señas (donde cada tenant cobra a su propia
// cuenta). No usar resolveMPToken/getTenantMPToken acá.
function getPlatformMPClient() {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) throw new Error('MP_ACCESS_TOKEN no configurado');
  return new MercadoPagoConfig({ accessToken });
}

export interface PreapprovalResult {
  id: string;
  status: string;
  initPoint: string | null;
}

// Crea una suscripción (preapproval) sin plan asociado: el monto se define acá
// mismo, porque cada tenant puede tener precio_acordado propio. Queda en
// estado 'pending' hasta que el dueño complete la autorización en `initPoint`
// (carga de tarjeta en la página de MercadoPago) — no hay forma de saltear ese
// paso, es requisito de MP/las tarjetas.
export async function crearPreapproval(params: {
  tenantId: string;
  tenantNombre: string;
  payerEmail: string;
  monto: number;
  backUrl: string;
  notificationUrl: string;
}): Promise<PreapprovalResult> {
  const client = getPlatformMPClient();
  const preapproval = new PreApproval(client);

  // `notification_url` no está en el tipo del SDK (PreApprovalRequest) pero sí
  // lo acepta la API de Suscripciones. Al no ser un objeto literal en el call
  // site (es una variable), TS no aplica excess-property-check.
  const body = {
    reason: `Suscripción ${params.tenantNombre}`,
    external_reference: params.tenantId,
    payer_email: params.payerEmail,
    back_url: params.backUrl,
    notification_url: params.notificationUrl,
    auto_recurring: {
      frequency: 1,
      frequency_type: 'months',
      transaction_amount: params.monto,
      currency_id: 'ARS',
    },
  };

  const response = await preapproval.create({ body });

  return {
    id: response.id!,
    status: response.status ?? 'pending',
    initPoint: response.init_point ?? null,
  };
}

export async function cancelarPreapproval(preapprovalId: string): Promise<void> {
  const client = getPlatformMPClient();
  const preapproval = new PreApproval(client);
  await preapproval.update({ id: preapprovalId, body: { status: 'cancelled' } });
}

export async function obtenerPreapproval(preapprovalId: string) {
  const client = getPlatformMPClient();
  const preapproval = new PreApproval(client);
  return preapproval.get({ id: preapprovalId });
}

// Checkout Pro de pago único (modalidad manual, botón "Abonar"). A diferencia
// de la seña de un turno, acá el cobro va a la cuenta de plataforma.
export async function crearPreferenciaPagoUnico(params: {
  tenantNombre: string;
  monto: number;
  payerEmail: string;
  backUrlBase: string;
  notificationUrl: string;
  pagoSuscripcionId: string;
}): Promise<{ initPoint: string | null }> {
  const client = getPlatformMPClient();
  const preference = new Preference(client);

  const response = await preference.create({
    body: {
      items: [
        {
          id: params.pagoSuscripcionId,
          title: `Suscripción ${params.tenantNombre}`,
          quantity: 1,
          unit_price: params.monto,
          currency_id: 'ARS',
        },
      ],
      payer: { email: params.payerEmail },
      back_urls: {
        success: `${params.backUrlBase}?pago=ok`,
        failure: `${params.backUrlBase}?pago=error`,
        pending: `${params.backUrlBase}?pago=pendiente`,
      },
      auto_return: 'approved',
      notification_url: params.notificationUrl,
      external_reference: params.pagoSuscripcionId,
    },
  });

  return { initPoint: response.init_point ?? null };
}
