import { redirect } from 'next/navigation';
import { canSeeBilling } from '@/lib/auth';
import { getPlatformAdmin } from '@/lib/superadmin-auth';
import { supabase } from '@/lib/supabase';
import { SuperadminDashboard, type TenantRow, type LeadRow } from '@/components/superadmin/dashboard';

export const dynamic = 'force-dynamic';

export default async function SuperAdminPage() {
  const admin = await getPlatformAdmin();
  if (!admin) redirect('/superadmin/login');

  const billing = canSeeBilling(admin);

  // Inicio del mes (hora Argentina, aprox)
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

  const [metricasRes, suscRes, leadsRes, ingresosRes] = await Promise.all([
    supabase.from('vista_metricas_tenant').select('*'),
    supabase.from('suscripciones').select('tenant_id, planes(nombre)'),
    supabase.from('leads').select('id, nombre, email, telefono, estetica, created_at').order('created_at', { ascending: false }),
    billing
      ? supabase.from('pagos_suscripcion').select('monto').eq('estado', 'aprobado').gte('fecha_pago', monthStart)
      : Promise.resolve({ data: [] as { monto: number }[] }),
  ]);

  // plan por tenant (supabase devuelve la relación embebida como array)
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
  }));

  const leads = (leadsRes.data ?? []) as LeadRow[];

  const stats = {
    total: tenants.length,
    activos: tenants.filter((t) => t.activo).length,
    esteticas: tenants.filter((t) => t.tipo_negocio === 'estetica').length,
    barberias: tenants.filter((t) => t.tipo_negocio === 'barberia').length,
    turnos: tenants.reduce((s, t) => s + t.turnos_total, 0),
    leads: leads.length,
    ingresosMes: (ingresosRes.data ?? []).reduce((s, p) => s + Number(p.monto), 0),
  };

  return (
    <SuperadminDashboard
      rol={admin.rol}
      canSeeBilling={billing}
      stats={stats}
      tenants={tenants}
      leads={leads}
    />
  );
}
