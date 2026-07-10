import { redirect, notFound } from 'next/navigation';
import { canSeeBilling } from '@/lib/auth';
import { getPlatformAdmin } from '@/lib/superadmin-auth';
import { supabase } from '@/lib/supabase';
import { SuperadminShell } from '@/components/superadmin/shell';
import { ComercioDetail } from '@/components/superadmin/comercio-detail';

export const dynamic = 'force-dynamic';

export default async function ComercioPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await getPlatformAdmin();
  if (!admin) redirect('/superadmin/login');

  const { id } = await params;
  const billing = canSeeBilling(admin);

  const isSuperadmin = admin.rol === 'superadmin';

  const [tenantRes, suscRes, planesRes, pagosRes, metricasRes, usuariosRes] = await Promise.all([
    supabase.from('tenants').select('id, nombre, slug, tipo_negocio, activo, email_contacto, telefono').eq('id', id).single(),
    supabase.from('suscripciones').select('*').eq('tenant_id', id).maybeSingle(),
    supabase.from('planes').select('id, nombre, precio_mensual, precio_anual').eq('activo', true).order('orden'),
    billing
      ? supabase.from('pagos_suscripcion').select('*').eq('tenant_id', id).order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    supabase.from('vista_metricas_tenant').select('turnos_total, turnos_completados, turnos_cancelados, dinero_movido').eq('tenant_id', id).maybeSingle(),
    isSuperadmin
      ? supabase.from('usuarios_admin').select('id, nombre, email, rol, activo, created_at').eq('tenant_id', id).order('created_at')
      : Promise.resolve({ data: [] }),
  ]);

  if (!tenantRes.data) notFound();

  const m = (metricasRes.data ?? {}) as Record<string, unknown>;
  const metricas = {
    turnos_total: Number(m.turnos_total ?? 0),
    turnos_completados: Number(m.turnos_completados ?? 0),
    turnos_cancelados: Number(m.turnos_cancelados ?? 0),
    dinero_movido: Number(m.dinero_movido ?? 0),
  };

  return (
    <SuperadminShell rol={admin.rol} canSeeBilling={billing}>
      <ComercioDetail
        canSeeBilling={billing}
        isSuperadmin={isSuperadmin}
        tenant={tenantRes.data}
        suscripcion={suscRes.data ?? null}
        planes={planesRes.data ?? []}
        pagos={(pagosRes.data ?? []) as never[]}
        metricas={metricas}
        usuarios={(usuariosRes.data ?? []) as never[]}
      />
    </SuperadminShell>
  );
}
