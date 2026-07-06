import { redirect } from 'next/navigation';
import { canSeeBilling } from '@/lib/auth';
import { getPlatformAdmin } from '@/lib/superadmin-auth';
import { supabase } from '@/lib/supabase';
import { SuperadminShell } from '@/components/superadmin/shell';
import { PlanesAdmin, type Plan } from '@/components/superadmin/planes-admin';

export const dynamic = 'force-dynamic';

export default async function PlanesPage() {
  const admin = await getPlatformAdmin();
  if (!admin) redirect('/superadmin/login');
  if (!canSeeBilling(admin)) redirect('/superadmin');

  const { data } = await supabase.from('planes').select('*').order('orden');

  const planes: Plan[] = ((data ?? []) as Record<string, unknown>[]).map((p) => ({
    id: p.id as string,
    slug: (p.slug as string) ?? '',
    nombre: (p.nombre as string) ?? '',
    descripcion: (p.descripcion as string) ?? null,
    precio_mensual: Number(p.precio_mensual ?? 0),
    precio_anual: p.precio_anual != null ? Number(p.precio_anual) : null,
    max_profesionales: p.max_profesionales != null ? Number(p.max_profesionales) : null,
    features: Array.isArray(p.features) ? (p.features as string[]) : [],
    activo: Boolean(p.activo),
    orden: Number(p.orden ?? 0),
  }));

  return (
    <SuperadminShell rol={admin.rol} canSeeBilling>
      <PlanesAdmin planes={planes} isSuperadmin={admin.rol === 'superadmin'} />
    </SuperadminShell>
  );
}
