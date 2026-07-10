import { supabase } from './supabase';

interface ChequeoLimite {
  ok: boolean;
  motivo?: string;
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
