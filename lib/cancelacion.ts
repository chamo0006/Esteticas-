import { supabase } from './supabase';
import { resolveMPToken, refundMPPayment } from './mercadopago';

// Resultado de intentar devolver la seña al cancelar un turno.
export type Devolucion =
  | { estado: 'devuelto'; monto: number; retencion: number }
  | { estado: 'retenido'; retencion: number }          // retención 100% → no se devuelve
  | { estado: 'error'; motivo: string }
  | null;                                               // no había seña de MP que devolver

// Al cancelar un turno, si tenía una seña pagada por MercadoPago y acreditada,
// devuelve automáticamente el (100 − porcentaje_retencion)% a la clienta.
// Se usa tanto desde el panel admin como desde la cancelación del propio cliente.
export async function devolverSenaSiCorresponde(
  turnoId: string,
  tenantId: string
): Promise<Devolucion> {
  // Ubica el pago de este turno: primero por turnos.pago_id, si no por pago.turno_id.
  const { data: turno } = await supabase
    .from('turnos').select('pago_id').eq('id', turnoId).single();

  const cols = 'id, monto, metodo, estado, referencia_externa';
  type PagoRow = { id: string; monto: number; metodo: string; estado: string; referencia_externa: string | null };
  let pago: PagoRow | null = null;

  if (turno?.pago_id) {
    const { data } = await supabase.from('pagos').select(cols).eq('id', turno.pago_id).single();
    pago = data as PagoRow | null;
  }
  if (!pago) {
    const { data } = await supabase.from('pagos').select(cols).eq('turno_id', turnoId).maybeSingle();
    pago = data as PagoRow | null;
  }

  // Solo devolvemos señas de MercadoPago ya acreditadas y aún no reembolsadas.
  if (!pago || pago.metodo !== 'mercadopago' || pago.estado !== 'acreditado' || !pago.referencia_externa) {
    return null;
  }

  const { data: cfg } = await supabase
    .from('tenants').select('porcentaje_retencion').eq('id', tenantId).single();
  const retencion = Number(cfg?.porcentaje_retencion ?? 0);
  const monto = Number(pago.monto);
  const montoDevuelto = Math.round(monto * (100 - retencion)) / 100;

  if (montoDevuelto <= 0) {
    // Retención 100%: no se devuelve nada, la seña queda como cargo.
    return { estado: 'retenido', retencion };
  }

  const accessToken = await resolveMPToken(tenantId);
  if (!accessToken) return { estado: 'error', motivo: 'MercadoPago no configurado' };

  try {
    // retención 0 → devolución total; retención > 0 → parcial por el monto calculado.
    await refundMPPayment(accessToken, pago.referencia_externa, retencion > 0 ? montoDevuelto : undefined);
    await supabase
      .from('pagos')
      .update({ estado: 'reembolsado', monto_devuelto: montoDevuelto, devuelto_at: new Date().toISOString() })
      .eq('id', pago.id);
    return { estado: 'devuelto', monto: montoDevuelto, retencion };
  } catch (err) {
    console.error('[cancelacion refund]', err);
    return { estado: 'error', motivo: 'No se pudo procesar la devolución en MercadoPago' };
  }
}

// ¿Está dentro de la ventana en la que el cliente todavía puede cancelar solo?
// horasLimite = horas antes del turno hasta las que se permite (0 = siempre).
export function dentroDeVentanaCancelacion(fechaHora: string, horasLimite: number): boolean {
  const inicio = new Date(fechaHora).getTime();
  const limite = inicio - horasLimite * 60 * 60 * 1000;
  return Date.now() <= limite;
}
