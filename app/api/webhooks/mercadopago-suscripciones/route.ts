import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment, PreApproval } from 'mercadopago';
import { supabase } from '@/lib/supabase';
import { registrarPagoSuscripcion, calcularProximoPeriodo } from '@/lib/suscripcion-renovacion';

// Webhook de facturación de la plataforma (cobro al comercio) — separado del
// webhook de señas (/api/webhooks/mercadopago), que resuelve el token por
// tenant porque ahí el dinero entra a la cuenta del propio comercio. Acá el
// dinero entra a la cuenta de la plataforma, así que SIEMPRE se usa
// process.env.MP_ACCESS_TOKEN, sin importar qué tenant sea.
function getPlatformClient() {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) return null;
  return new MercadoPagoConfig({ accessToken });
}

const ESTADO_PAGO_MAP: Record<string, string> = {
  approved: 'aprobado',
  rejected: 'rechazado',
  refunded: 'rechazado',
  cancelled: 'rechazado',
  charged_back: 'rechazado',
};

// type=payment → pago único generado por el botón "Abonar" (modalidad manual)
async function manejarPagoUnico(client: MercadoPagoConfig, paymentId: string) {
  const payment = await new Payment(client).get({ id: paymentId });
  const pagoSuscripcionId = payment.external_reference;
  if (!pagoSuscripcionId) return;

  const nuevoEstado = ESTADO_PAGO_MAP[payment.status ?? ''];
  if (!nuevoEstado) return;

  const { data: pagoRow } = await supabase
    .from('pagos_suscripcion')
    .select('tenant_id, periodo_inicio, periodo_fin, monto, estado')
    .eq('id', pagoSuscripcionId)
    .single();

  // Ya procesado (MP puede reintentar notificaciones) o no es un pago de
  // suscripción que hayamos creado nosotros.
  if (!pagoRow || pagoRow.estado === 'aprobado') return;

  await supabase
    .from('pagos_suscripcion')
    .update({
      estado: nuevoEstado,
      referencia_externa: String(paymentId),
      fecha_pago: nuevoEstado === 'aprobado' ? new Date().toISOString() : null,
    })
    .eq('id', pagoSuscripcionId);

  if (nuevoEstado === 'aprobado' && pagoRow.periodo_fin) {
    await supabase
      .from('suscripciones')
      .update({ fecha_fin: pagoRow.periodo_fin, estado: 'activa', bloqueado: false, bloqueado_at: null })
      .eq('tenant_id', pagoRow.tenant_id);
    await supabase.from('tenants').update({ activo: true }).eq('id', pagoRow.tenant_id);
  }
}

// type=subscription_preapproval → cambió el estado de autorización
// (pending → authorized, o el dueño canceló desde su cuenta de MP)
async function manejarCambioPreapproval(client: MercadoPagoConfig, preapprovalId: string) {
  const pre = await new PreApproval(client).get({ id: preapprovalId });
  const tenantId = pre.external_reference;
  if (!tenantId) return;

  await supabase
    .from('suscripciones')
    .update({ mp_preapproval_status: pre.status ?? null })
    .eq('tenant_id', tenantId)
    .eq('mp_preapproval_id', preapprovalId);
}

// type=subscription_authorized_payment → se concretó un cobro recurrente mensual
async function manejarCobroRecurrente(client: MercadoPagoConfig, paymentId: string) {
  const payment = await new Payment(client).get({ id: paymentId });
  if (payment.status !== 'approved') return; // MP reintenta solo; no extendemos el período en un rechazo

  const tenantId = payment.external_reference; // heredado del preapproval al crearse
  if (!tenantId) return;

  // Idempotencia: MP puede notificar el mismo cobro más de una vez.
  const { data: yaRegistrado } = await supabase
    .from('pagos_suscripcion')
    .select('id')
    .eq('referencia_externa', String(paymentId))
    .maybeSingle();
  if (yaRegistrado) return;

  const { data: susc } = await supabase
    .from('suscripciones')
    .select('ciclo, fecha_fin')
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (!susc) return;

  const periodoFin = calcularProximoPeriodo(susc.fecha_fin, susc.ciclo);

  await registrarPagoSuscripcion({
    tenantId,
    monto: Number(payment.transaction_amount ?? 0),
    metodo: 'mercadopago',
    estado: 'aprobado',
    periodoInicio: susc.fecha_fin,
    periodoFin,
    fechaPago: new Date().toISOString(),
    referenciaExterna: String(paymentId),
    origen: 'mercadopago',
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.type || !body?.data?.id) return NextResponse.json({ ok: true });

  const client = getPlatformClient();
  if (!client) return NextResponse.json({ ok: true });

  try {
    switch (body.type) {
      case 'payment':
        await manejarPagoUnico(client, String(body.data.id));
        break;
      case 'subscription_preapproval':
        await manejarCambioPreapproval(client, String(body.data.id));
        break;
      case 'subscription_authorized_payment':
        await manejarCobroRecurrente(client, String(body.data.id));
        break;
    }
  } catch (err) {
    console.error('[webhook/mercadopago-suscripciones]', err);
  }

  return NextResponse.json({ ok: true }); // Siempre 200 para que MP no reintente
}
