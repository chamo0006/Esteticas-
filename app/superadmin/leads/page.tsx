import { redirect } from 'next/navigation';
import { canSeeBilling } from '@/lib/auth';
import { getPlatformAdmin } from '@/lib/superadmin-auth';
import { supabase } from '@/lib/supabase';
import { SuperadminShell } from '@/components/superadmin/shell';
import { LeadsTable } from '@/components/superadmin/leads-table';
import { type LeadRow } from '@/components/superadmin/types';

export const dynamic = 'force-dynamic';

export default async function LeadsPage() {
  const admin = await getPlatformAdmin();
  if (!admin) redirect('/superadmin/login');

  const { data } = await supabase
    .from('leads')
    .select('id, nombre, email, telefono, estetica, created_at')
    .order('created_at', { ascending: false });

  return (
    <SuperadminShell rol={admin.rol} canSeeBilling={canSeeBilling(admin)}>
      <LeadsTable leads={(data ?? []) as LeadRow[]} />
    </SuperadminShell>
  );
}
