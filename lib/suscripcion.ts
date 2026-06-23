import { supabase } from './supabase';

export type AvisoVariant = 'bloqueada' | 'vencida' | 'porVencer';

export interface AvisoSuscripcion {
  variant: AvisoVariant;
  titulo: string;
  detalle: string;
  /** Para que el dismiss en el cliente se reinicie cuando cambia el estado. */
  clave: string;
}

interface SuscripcionRow {
  estado: string;
  fecha_fin: string | null;
  dias_gracia: number | null;
  bloqueado: boolean;
}

function diasHasta(fechaFin: string): number {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fin = new Date(`${fechaFin}T00:00:00`);
  return Math.round((fin.getTime() - hoy.getTime()) / 86_400_000);
}

const plural = (n: number) => (n === 1 ? '' : 's');

/**
 * Devuelve el aviso a mostrar en el panel admin del tenant, o `null` si la
 * suscripción está al día (más de 7 días para vencer / sin límite).
 * Sirve igual para barberías y estéticas: la lógica es la misma.
 */
export async function getAvisoSuscripcion(tenantId: string): Promise<AvisoSuscripcion | null> {
  const { data, error } = await supabase
    .from('suscripciones')
    .select('estado, fecha_fin, dias_gracia, bloqueado')
    .eq('tenant_id', tenantId)
    .single<SuscripcionRow>();

  if (error || !data) return null;

  // 1) Bloqueada / suspendida / cancelada → corte de servicio.
  if (data.bloqueado || data.estado === 'suspendida' || data.estado === 'cancelada') {
    return {
      variant: 'bloqueada',
      titulo: 'Tu sistema está suspendido',
      detalle: 'Tu suscripción venció y el servicio quedó pausado. Regularizá el pago para reactivar las reservas.',
      clave: 'bloqueada',
    };
  }

  if (data.fecha_fin == null) return null; // sin límite

  const dias = diasHasta(data.fecha_fin);

  // 2) Vencida (dentro del período de gracia, todavía operativa).
  if (dias < 0) {
    const vencidaHace = Math.abs(dias);
    const graciaRestante = (data.dias_gracia ?? 0) + dias; // dias es negativo
    const detalle =
      graciaRestante > 0
        ? `Venció hace ${vencidaHace} día${plural(vencidaHace)}. Te queda${graciaRestante === 1 ? '' : 'n'} ${graciaRestante} día${plural(graciaRestante)} de gracia antes de que se suspenda el sistema.`
        : `Venció hace ${vencidaHace} día${plural(vencidaHace)}. El sistema puede suspenderse en cualquier momento.`;
    return {
      variant: 'vencida',
      titulo: 'Tu suscripción venció',
      detalle,
      clave: `vencida-${dias}`,
    };
  }

  // 3) Por vencer (próximos 7 días).
  if (dias <= 7) {
    return {
      variant: 'porVencer',
      titulo: dias === 0 ? 'Tu suscripción vence hoy' : `Tu suscripción vence en ${dias} día${plural(dias)}`,
      detalle: 'Renová tu pago para evitar interrupciones en las reservas de tu negocio.',
      clave: `porVencer-${dias}`,
    };
  }

  return null;
}
