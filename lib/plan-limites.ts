import { supabase } from './supabase';
import { getArgentinaRanges } from './argentina-time';

interface ChequeoLimite {
  ok: boolean;
  motivo?: string;
}

// Trae el plan del tenant (o null si no tiene suscripción/plan asignado).
async function getPlan(tenantId: string) {
  const { data: susc } = await supabase
    .from('suscripciones')
    .select('plan:planes!suscripciones_plan_id_fkey(nombre, max_profesionales, max_servicios, max_turnos_mes)')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  return susc ? (Array.isArray(susc.plan) ? susc.plan[0] : susc.plan) : null;
}

// Chequea si el tenant puede tener un profesional ACTIVO más, según el límite
// de su plan (planes.max_profesionales — null = ilimitado). Si el tenant no
// tiene plan asignado, no bloquea (no hay límite que hacer cumplir).
// `excludeId` sirve para reactivar un profesional sin contarse a sí mismo.
export async function puedeActivarProfesional(tenantId: string, excludeId?: string): Promise<ChequeoLimite> {
  const { data: susc } = await supabase
    .from('suscripciones')
    .select('plan:planes!suscripciones_plan_id_fkey(nombre, max_profesionales)')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  const plan = susc ? (Array.isArray(susc.plan) ? susc.plan[0] : susc.plan) : null;
  const max = plan?.max_profesionales;
  if (max == null) return { ok: true };

  let query = supabase
    .from('profesionales')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('activo', true);
  if (excludeId) query = query.neq('id', excludeId);

  const { count } = await query;
  if ((count ?? 0) >= max) {
    return {
      ok: false,
      motivo: `Tu plan ${plan?.nombre ?? 'actual'} permite hasta ${max} profesional${max === 1 ? '' : 'es'} activo${max === 1 ? '' : 's'}. Desactivá alguno o pasá a un plan superior para agregar más.`,
    };
  }
  return { ok: true };
}

// Chequea si el tenant puede tener un servicio ACTIVO más, según
// planes.max_servicios (null = ilimitado). `excludeId` sirve para reactivar
// un servicio sin contarse a sí mismo.
export async function puedeActivarServicio(tenantId: string, excludeId?: string): Promise<ChequeoLimite> {
  const plan = await getPlan(tenantId);
  const max = plan?.max_servicios;
  if (max == null) return { ok: true };

  let query = supabase
    .from('servicios')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('activo', true);
  if (excludeId) query = query.neq('id', excludeId);

  const { count } = await query;
  if ((count ?? 0) >= max) {
    return {
      ok: false,
      motivo: `Tu plan ${plan?.nombre ?? 'actual'} permite hasta ${max} servicio${max === 1 ? '' : 's'} activo${max === 1 ? '' : 's'}. Desactivá alguno o pasá a un plan superior para agregar más.`,
    };
  }
  return { ok: true };
}

// Chequea si el tenant puede tener un turno más este mes calendario (hora
// Argentina), según planes.max_turnos_mes (null = ilimitado). No cuenta los
// cancelados, igual que el contador que se muestra en Mi suscripción.
export async function puedeCrearTurno(tenantId: string): Promise<ChequeoLimite> {
  const plan = await getPlan(tenantId);
  const max = plan?.max_turnos_mes;
  if (max == null) return { ok: true };

  const { monthStart } = getArgentinaRanges();
  const { count } = await supabase
    .from('turnos')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .neq('estado', 'cancelado')
    .gte('fecha_hora', monthStart);

  if ((count ?? 0) >= max) {
    return {
      ok: false,
      motivo: `Este mes ya se alcanzó el límite de ${max} turnos del plan ${plan?.nombre ?? 'actual'}. Pasá a un plan superior para seguir recibiendo reservas.`,
    };
  }
  return { ok: true };
}
