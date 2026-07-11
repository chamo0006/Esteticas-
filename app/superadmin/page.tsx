import { redirect } from 'next/navigation';
import { canSeeBilling } from '@/lib/auth';
import { getPlatformAdmin } from '@/lib/superadmin-auth';
import { supabase } from '@/lib/supabase';
import { SuperadminShell } from '@/components/superadmin/shell';
import { SuperadminOverview } from '@/components/superadmin/overview';
import { type TenantRow, type PuntoMes } from '@/components/superadmin/types';

export const dynamic = 'force-dynamic';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// Devuelve los últimos 6 meses como buckets {clave 'YYYY-M', label 'Mes'}.
function ultimosMeses(n = 6) {
  const out: { key: string; mes: string }[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({ key: `${d.getFullYear()}-${d.getMonth()}`, mes: MESES[d.getMonth()] });
  }
  return out;
}

export default async function SuperAdminPage() {
  const admin = await getPlatformAdmin();
  if (!admin) redirect('/superadmin/login');

  const billing = canSeeBilling(admin);

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const seisMesesAtras = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString();

  const [metricasRes, suscRes, leadsRes, ingresosRes, tenantsRes, pagosSeisRes, ventasMesRes, ventasSeisRes] = await Promise.all([
    supabase.from('vista_metricas_tenant').select('*'),
    supabase.from('suscripciones').select('tenant_id, planes(nombre)'),
    supabase.from('leads').select('id').order('created_at', { ascending: false }),
    billing
      ? supabase.from('pagos_suscripcion').select('monto').eq('estado', 'aprobado').gte('fecha_pago', monthStart)
      : Promise.resolve({ data: [] as { monto: number }[] }),
    supabase.from('tenants').select('created_at'),
    billing
      ? supabase.from('pagos_suscripcion').select('monto, fecha_pago').eq('estado', 'aprobado').gte('fecha_pago', seisMesesAtras)
      : Promise.resolve({ data: [] as { monto: number; fecha_pago: string }[] }),
    // Ventas manuales (ventas_facturacion): fuente independiente de pagos_suscripcion
    // — se suman al total de ingresos, sin mezclar las tablas entre sí.
    billing
      ? supabase.from('ventas_facturacion').select('monto').gte('fecha_pago', monthStart)
      : Promise.resolve({ data: [] as { monto: number }[] }),
    billing
      ? supabase.from('ventas_facturacion').select('monto, fecha_pago').gte('fecha_pago', seisMesesAtras)
      : Promise.resolve({ data: [] as { monto: number; fecha_pago: string }[] }),
  ]);

  const planMap = new Map<string, string>();
  for (const s of (suscRes.data ?? []) as { tenant_id: string; planes: { nombre: string }[] | { nombre: string } | null }[]) {
    const plan = Array.isArray(s.planes) ? s.planes[0] : s.planes;
    if (plan?.nombre) planMap.set(s.tenant_id, plan.nombre);
  }

  const tenants: TenantRow[] = ((metricasRes.data ?? []) as Record<string, unknown>[]).map((m) => ({
    id: m.tenant_id as string,
    nombre: (m.nombre as string) ?? '—',
    slug: (m.slug as string) ?? '',
    tipo_negocio: (m.tipo_negocio as string) ?? 'estetica',
    activo: Boolean(m.activo),
    estado_suscripcion: (m.estado_suscripcion as string) ?? null,
    vencimiento: (m.vencimiento as string) ?? null,
    dias_para_vencer: m.dias_para_vencer == null ? null : Number(m.dias_para_vencer),
    bloqueado: Boolean(m.bloqueado),
    plan_nombre: planMap.get(m.tenant_id as string) ?? null,
    turnos_total: Number(m.turnos_total ?? 0),
    dinero_movido: Number(m.dinero_movido ?? 0),
    modalidad_cobro: (m.modalidad_cobro as string) ?? null,
    mp_preapproval_status: (m.mp_preapproval_status as string) ?? null,
  }));

  const porVencer = tenants
    .filter((t) => !t.bloqueado && t.dias_para_vencer != null && t.dias_para_vencer <= 7)
    .sort((a, b) => (a.dias_para_vencer ?? 0) - (b.dias_para_vencer ?? 0));

  // Series de los gráficos
  const buckets = ultimosMeses(6);
  const idxDeFecha = (iso: string | null) => {
    if (!iso) return -1;
    const d = new Date(iso);
    return buckets.findIndex((b) => b.key === `${d.getFullYear()}-${d.getMonth()}`);
  };

  const ingresosPorMes: PuntoMes[] = buckets.map((b) => ({ mes: b.mes, valor: 0 }));
  for (const p of (pagosSeisRes.data ?? []) as { monto: number; fecha_pago: string }[]) {
    const i = idxDeFecha(p.fecha_pago);
    if (i >= 0) ingresosPorMes[i].valor += Number(p.monto);
  }
  for (const v of (ventasSeisRes.data ?? []) as { monto: number; fecha_pago: string }[]) {
    const i = idxDeFecha(v.fecha_pago);
    if (i >= 0) ingresosPorMes[i].valor += Number(v.monto);
  }

  const comerciosPorMes: PuntoMes[] = buckets.map((b) => ({ mes: b.mes, valor: 0 }));
  for (const t of (tenantsRes.data ?? []) as { created_at: string }[]) {
    const i = idxDeFecha(t.created_at);
    if (i >= 0) comerciosPorMes[i].valor += 1;
  }

  const stats = {
    total: tenants.length,
    activos: tenants.filter((t) => t.activo).length,
    esteticas: tenants.filter((t) => t.tipo_negocio === 'estetica').length,
    barberias: tenants.filter((t) => t.tipo_negocio === 'barberia').length,
    turnos: tenants.reduce((s, t) => s + t.turnos_total, 0),
    leads: (leadsRes.data ?? []).length,
    ingresosMes:
      (ingresosRes.data ?? []).reduce((s, p) => s + Number(p.monto), 0) +
      (ventasMesRes.data ?? []).reduce((s, v) => s + Number(v.monto), 0),
    trials: tenants.filter((t) => t.estado_suscripcion === 'trial').length,
    morosos: tenants.filter((t) => t.bloqueado || t.estado_suscripcion === 'suspendida' || (t.dias_para_vencer != null && t.dias_para_vencer < 0)).length,
  };

  return (
    <SuperadminShell rol={admin.rol} canSeeBilling={billing}>
      <SuperadminOverview
        canSeeBilling={billing}
        stats={stats}
        porVencer={porVencer}
        ingresosPorMes={ingresosPorMes}
        comerciosPorMes={comerciosPorMes}
      />
    </SuperadminShell>
  );
}
