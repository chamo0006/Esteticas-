import { redirect } from 'next/navigation';
import { canSeeBilling } from '@/lib/auth';
import { getPlatformAdmin } from '@/lib/superadmin-auth';
import { supabase } from '@/lib/supabase';
import { SuperadminShell } from '@/components/superadmin/shell';
import { VentasMes } from '@/components/superadmin/ventas-mes';

export const dynamic = 'force-dynamic';

export default async function VentasPage() {
  const admin = await getPlatformAdmin();
  if (!admin) redirect('/superadmin/login');
  if (!canSeeBilling(admin)) redirect('/superadmin');

  const [tenantsRes, planesRes] = await Promise.all([
    supabase.from('tenants').select('nombre').order('nombre'),
    supabase.from('planes').select('nombre').order('orden'),
  ]);

  const clientesSugeridos = ((tenantsRes.data ?? []) as { nombre: string }[]).map((t) => t.nombre);
  const planesSugeridos = ((planesRes.data ?? []) as { nombre: string }[]).map((p) => p.nombre);

  return (
    <SuperadminShell rol={admin.rol} canSeeBilling>
      <VentasMes clientesSugeridos={clientesSugeridos} planesSugeridos={planesSugeridos} />
    </SuperadminShell>
  );
}
