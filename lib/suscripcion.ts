import { supabase } from './supabase';
import type { AvisoVariant, AvisoAction } from '@/components/ui/aviso-banner';

export interface AvisoSuscripcion {
  variant: AvisoVariant;
  titulo: string;
  detalle: string;
  /** Para que el dismiss en el cliente se reinicie cuando cambia el estado. */
  clave: string;
  accion: AvisoAction;
  dismissible: boolean;
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

function formatFecha(fechaIso: string): string {
  return new Date(`${fechaIso}T00:00:00`).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
}

const plural = (n: number) => (n === 1 ? '' : 's');

/**
 * Devuelve el aviso a mostrar en el panel admin del tenant, o `null` si la
 * suscripción está al día (más de 3 días para vencer / sin límite).
 * Sirve igual para barberías y estéticas: la lógica es la misma.
 */
export async function getAvisoSuscripcion(tenantId: string, tenantSlug: string): Promise<AvisoSuscripcion | null> {
  const { data, error } = await supabase
    .from('suscripciones')
    .select('estado, fecha_fin, dias_gracia, bloqueado')
    .eq('tenant_id', tenantId)
    .single<SuscripcionRow>();

  if (error || !data) return null;

  const verSuscripcion = { label: 'Ver mi suscripción', href: `/admin/${tenantSlug}/suscripcion` };
  const renovarAhora = { label: 'Renovar ahora', href: `/admin/${tenantSlug}/suscripcion` };

  // 1) Bloqueada / suspendida / cancelada → corte de servicio.
  if (data.bloqueado || data.estado === 'suspendida' || data.estado === 'cancelada') {
    return {
      variant: 'critical',
      titulo: 'Tu sistema está suspendido',
      detalle: 'Tu suscripción venció y el servicio quedó pausado. Regularizá el pago para reactivar las reservas.',
      clave: 'bloqueada',
      accion: { label: 'Regularizar pago', href: `/admin/${tenantSlug}/suscripcion` },
      dismissible: false,
    };
  }

  if (data.fecha_fin == null) return null; // sin límite

  const dias = diasHasta(data.fecha_fin);

  // 2) Vencida, todavía dentro del período de gracia (banner fuerte, con fecha exacta de corte).
  if (dias < 0) {
    const vencidaHace = Math.abs(dias);
    const graciaRestante = (data.dias_gracia ?? 0) + dias; // dias es negativo

    if (graciaRestante <= 0) {
      // El cron de corte todavía no corrió, pero ya no queda gracia.
      return {
        variant: 'critical',
        titulo: 'Tu suscripción está por suspenderse',
        detalle: `Venció hace ${vencidaHace} día${plural(vencidaHace)} y ya no te queda período de gracia. El sistema puede suspenderse en cualquier momento.`,
        clave: `vencida-sin-gracia-${dias}`,
        accion: renovarAhora,
        dismissible: false,
      };
    }

    const fechaCorte = new Date(`${data.fecha_fin}T00:00:00`);
    fechaCorte.setDate(fechaCorte.getDate() + (data.dias_gracia ?? 0));

    return {
      variant: 'urgent',
      titulo: 'Tu suscripción venció',
      detalle: `Venció hace ${vencidaHace} día${plural(vencidaHace)}. Si no se regulariza, el sistema se suspende el ${formatFecha(fechaCorte.toISOString().split('T')[0])}.`,
      clave: `vencida-${dias}`,
      accion: renovarAhora,
      dismissible: true,
    };
  }

  // 3) Vence hoy → aviso más fuerte, con CTA directo.
  if (dias === 0) {
    return {
      variant: 'urgent',
      titulo: 'Tu suscripción vence hoy',
      detalle: 'Renová tu pago hoy para evitar interrupciones en las reservas de tu negocio.',
      clave: 'vence-hoy',
      accion: renovarAhora,
      dismissible: true,
    };
  }

  // 4) Por vencer (próximos 3 días) → aviso suave, informativo.
  if (dias <= 3) {
    return {
      variant: 'warning',
      titulo: `Tu suscripción vence en ${dias} día${plural(dias)}`,
      detalle: 'Revisá tu suscripción para que no se corte el servicio.',
      clave: `porVencer-${dias}`,
      accion: verSuscripcion,
      dismissible: true,
    };
  }

  return null;
}
