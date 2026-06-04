import { NextResponse } from 'next/server';
import { getTenantBySlug } from '@/lib/tenant';
import { supabase } from '@/lib/supabase';

// GET público — lista de profesionales activos para el booking
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) return NextResponse.json([], { status: 200 });

  const { data } = await supabase
    .from('profesionales')
    .select('id, nombre')
    .eq('tenant_id', tenant.id)
    .eq('activo', true)
    .order('nombre');

  return NextResponse.json(data ?? []);
}
