export interface TenantRow {
  id: string;
  nombre: string;
  slug: string;
  tipo_negocio: string;
  activo: boolean;
  estado_suscripcion: string | null;
  vencimiento: string | null;
  dias_para_vencer: number | null;
  bloqueado: boolean;
  plan_nombre: string | null;
  turnos_total: number;
  dinero_movido: number;
}

export interface LeadRow {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  estetica: string | null;
  created_at: string;
}

export interface PuntoMes {
  mes: string;      // "Ene", "Feb", ...
  valor: number;
}

export function formatARS(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n);
}

export function formatFecha(dt: string) {
  return new Date(dt).toLocaleDateString('es-AR');
}

// Semáforo de vencimiento de la suscripción de un comercio.
export function semaforo(t: Pick<TenantRow, 'bloqueado' | 'estado_suscripcion' | 'dias_para_vencer'>): { label: string; cls: string } {
  if (t.bloqueado || t.estado_suscripcion === 'suspendida') return { label: 'Bloqueado', cls: 'bg-red-500/15 text-red-400 border-red-500/30' };
  if (t.estado_suscripcion === 'cancelada') return { label: 'Cancelada', cls: 'bg-zinc-700 text-zinc-300 border-zinc-600' };
  if (t.estado_suscripcion === 'trial') return { label: 'Trial', cls: 'bg-violet-500/15 text-violet-300 border-violet-500/30' };
  const d = t.dias_para_vencer;
  if (d == null) return { label: 'Sin límite', cls: 'bg-zinc-700 text-zinc-300 border-zinc-600' };
  if (d < 0) return { label: `Vencida (${Math.abs(d)}d)`, cls: 'bg-red-500/15 text-red-400 border-red-500/30' };
  if (d <= 3) return { label: `Vence en ${d}d`, cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' };
  if (d <= 7) return { label: `Vence en ${d}d`, cls: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30' };
  return { label: `${d}d`, cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
}
