import { redirect } from 'next/navigation';
import { canSeeBilling } from '@/lib/auth';
import { getPlatformAdmin } from '@/lib/superadmin-auth';
import { supabase } from '@/lib/supabase';
import { SuperadminShell } from '@/components/superadmin/shell';
import { ComerciosTable } from '@/components/superadmin/comercios-table';
import { type TenantRow } from '@/components/superadmin/types';

export const dynamic = 'force-dynamic';

export default async function ComerciosPage() {
  const admin = await getPlatformAdmin();
  if (!admin) redirect('/superadmin/login');

  const billing = canSeeBilling(admin);

  const [metricasRes, suscRes] = await Promise.all([
    supabase.from('vista_metricas_tenant').select('*'),
    supabase.from('suscripciones').select('tenant_id, planes(nombre)'),
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
  }));

  return (
    <SuperadminShell rol={admin.rol} canSeeBilling={billing}>
      <ComerciosTable rol={admin.rol} canSeeBilling={billing} tenants={tenants} />
    </SuperadminShell>
  );
}
