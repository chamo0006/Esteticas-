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
  if (t.bloqueado || t.estado_suscripcion === 'suspendida') return { label: 'Bloqueado', cls: 'bg-[#c26350]/15 text-[#d1806b] border-[#c26350]/30' };
  if (t.estado_suscripcion === 'cancelada') return { label: 'Cancelada', cls: 'bg-[#2f2a20] text-[#cabfa8] border-[#3a3327]' };
  if (t.estado_suscripcion === 'trial') return { label: 'Trial', cls: 'bg-[#d8b877]/15 text-[#dcc48a] border-[#c9a86a]/30' };
  const d = t.dias_para_vencer;
  if (d == null) return { label: 'Sin límite', cls: 'bg-[#2f2a20] text-[#cabfa8] border-[#3a3327]' };
  if (d < 0) return { label: `Vencida (${Math.abs(d)}d)`, cls: 'bg-[#c26350]/15 text-[#d1806b] border-[#c26350]/30' };
  if (d <= 3) return { label: `Vence en ${d}d`, cls: 'bg-[#cf9a45]/15 text-[#cf9a45] border-[#cf9a45]/30' };
  if (d <= 7) return { label: `Vence en ${d}d`, cls: 'bg-[#cf9a45]/15 text-[#e0b45f] border-[#cf9a45]/30' };
  return { label: `${d}d`, cls: 'bg-[#6b8c52]/15 text-[#94ab73] border-[#8aa06a]/30' };
}
