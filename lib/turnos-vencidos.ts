import { supabase } from './supabase';
import { getArgentinaRanges } from './argentina-time';

export interface AvisoTurnosVencidos {
  count: number;
  /** Para que el dismiss en el cliente se reinicie cuando cambia la cantidad. */
  clave: string;
}

/**
 * Turnos de días anteriores (hora Argentina) que quedaron en 'pendiente' o
 * 'confirmado' sin resolver — ni completados ni cancelados. Devuelve `null`
 * si no hay ninguno. No incluye turnos de hoy: recién se marcan "vencidos"
 * al pasar la medianoche, para no marcar como atrasado algo que puede estar
 * pasando en este momento.
 */
export async function getAvisoTurnosVencidos(tenantId: string): Promise<AvisoTurnosVencidos | null> {
  const { todayStart } = getArgentinaRanges();

  const { count, error } = await supabase
    .from('turnos')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .in('estado', ['pendiente', 'confirmado'])
    .lt('fecha_hora', todayStart);

  if (error || !count) return null;
  return { count, clave: `turnos-vencidos-${count}` };
}
