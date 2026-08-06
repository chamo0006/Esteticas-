import { supabase } from './supabase';

// Profesionales (activas) habilitadas para cada servicio pedido, según la
// tabla servicio_profesionales. Si un servicio no tiene ninguna fila (nadie
// asignado), su entrada queda como array vacío — no cae a "cualquiera puede".
export async function getProfesionalesPorServicio(
  servicioIds: string[]
): Promise<Map<string, string[]>> {
  const mapa = new Map<string, string[]>();
  if (servicioIds.length === 0) return mapa;

  const { data } = await supabase
    .from('servicio_profesionales')
    .select('servicio_id, profesional_id, profesionales!inner(activo)')
    .in('servicio_id', servicioIds)
    .eq('profesionales.activo', true);

  for (const row of (data ?? []) as unknown as { servicio_id: string; profesional_id: string }[]) {
    const arr = mapa.get(row.servicio_id) ?? [];
    arr.push(row.profesional_id);
    mapa.set(row.servicio_id, arr);
  }
  return mapa;
}

// Profesionales que pueden hacer TODOS los servicios pedidos a la vez (para
// elegir una sola persona para toda la visita, ej. el picker de reserva).
export function interseccionProfesionales(mapa: Map<string, string[]>, servicioIds: string[]): string[] {
  if (servicioIds.length === 0) return [];
  let result = new Set(mapa.get(servicioIds[0]) ?? []);
  for (const id of servicioIds.slice(1)) {
    const set = new Set(mapa.get(id) ?? []);
    result = new Set([...result].filter((x) => set.has(x)));
  }
  return [...result];
}
