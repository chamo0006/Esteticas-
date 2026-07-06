import { redirect } from 'next/navigation';
import { canSeeBilling } from '@/lib/auth';
import { getPlatformAdmin } from '@/lib/superadmin-auth';
import { supabase } from '@/lib/supabase';
import { SuperadminShell } from '@/components/superadmin/shell';
import { Facturacion, type PagoRow } from '@/components/superadmin/facturacion';
import { type TenantRow } from '@/components/superadmin/types';

export const dynamic = 'force-dynamic';

export default async function FacturacionPage() {
  const admin = await getPlatformAdmin();
  if (!admin) redirect('/superadmin/login');
  if (!canSeeBilling(admin)) redirect('/superadmin');

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

  const [pagosRes, metricasRes, mesRes, mesPasadoRes] = await Promise.all([
    supabase
      .from('pagos_suscripcion')
      .select('id, tenant_id, monto, metodo, estado, periodo_fin, fecha_pago, created_at, tenants!inner(nombre, slug)')
      .order('created_at', { ascending: false })
      .limit(200),
    supabase.from('vista_metricas_tenant').select('*'),
    supabase.from('pagos_suscripcion').select('monto').eq('estado', 'aprobado').gte('fecha_pago', monthStart),
    supabase.from('pagos_suscripcion').select('monto').eq('estado', 'aprobado').gte('fecha_pago', prevMonthStart).lt('fecha_pago', monthStart),
  ]);

  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);
  type Raw = {
    id: string; tenant_id: string; monto: number; metodo: string; estado: string;
    periodo_fin: string | null; fecha_pago: string | null; created_at: string;
    tenants: { nombre: string; slug: string } | { nombre: string; slug: string }[] | null;
  };
  const pagos: PagoRow[] = ((pagosRes.data ?? []) as unknown as Raw[]).map((p) => {
    const t = one(p.tenants);
    return {
      id: p.id, tenant_id: p.tenant_id,
      tenant_nombre: t?.nombre ?? '—', tenant_slug: t?.slug ?? '',
      monto: Number(p.monto), metodo: p.metodo, estado: p.estado,
      periodo_fin: p.periodo_fin, fecha_pago: p.fecha_pago, created_at: p.created_at,
    };
  });

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
    plan_nombre: null,
    turnos_total: Number(m.turnos_total ?? 0),
    dinero_movido: Number(m.dinero_movido ?? 0),
  }));

  const morosos = tenants.filter((t) => t.bloqueado || t.estado_suscripcion === 'suspendida' || (t.dias_para_vencer != null && t.dias_para_vencer < 0));
  const proximos = tenants
    .filter((t) => !t.bloqueado && t.dias_para_vencer != null && t.dias_para_vencer >= 0 && t.dias_para_vencer <= 7)
    .sort((a, b) => (a.dias_para_vencer ?? 0) - (b.dias_para_vencer ?? 0));

  const stats = {
    cobradoMes: (mesRes.data ?? []).reduce((s, p) => s + Number(p.monto), 0),
    cobradoMesPasado: (mesPasadoRes.data ?? []).reduce((s, p) => s + Number(p.monto), 0),
    pendientes: pagos.filter((p) => p.estado === 'pendiente').length,
    morosos: morosos.length,
  };

  return (
    <SuperadminShell rol={admin.rol} canSeeBilling>
      <Facturacion stats={stats} pagos={pagos} morosos={morosos} proximos={proximos} />
    </SuperadminShell>
  );
}
