import { notFound } from 'next/navigation';
import { getTenantBySlug } from '@/lib/tenant';
import { supabase } from '@/lib/supabase';
import { BookingClient }  from './booking-client';
import { BarberiaClient } from './barberia-client';
import type { Service } from '@/lib/booking-types';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

export default async function TenantBookingPage({ params }: Props) {
  const { tenantSlug } = await params;

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) notFound();

  const { data } = await supabase
    .from('servicios')
    .select('id, nombre, duracion_minutos, precio, categoria')
    .eq('tenant_id', tenant.id)
    .eq('activo', true)
    .order('categoria')
    .order('nombre');

  const services: Service[] = (data ?? []).map((s) => ({
    id: s.id,
    name: s.nombre,
    duration: `${s.duracion_minutos} min`,
    price: Number(s.precio),
    category: s.categoria ?? 'general',
  }));

  if (tenant.tipo_negocio === 'barberia') return <BarberiaClient tenant={tenant} services={services} />;
  return <BookingClient tenant={tenant} services={services} />;
}
