import { notFound } from 'next/navigation';
import { getTenantBySlug } from '@/lib/tenant';
import { supabase } from '@/lib/supabase';
import { BookingClient }  from './booking-client';
import { BarberiaClient } from './barberia-client';
import type { Service } from '@/lib/booking-types';
import type { Barber, Review, BarberiaStats } from './barberia-client';

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

  if (tenant.tipo_negocio === 'barberia') {
    // ── Datos extra para la landing de barbería ──────────────────────────
    const [barbersRes, reviewsRes, clientesRes] = await Promise.all([
      supabase
        .from('profesionales')
        .select('id, nombre, rol, rating')
        .eq('tenant_id', tenant.id)
        .eq('activo', true)
        .order('created_at'),
      supabase
        .from('resenias')
        .select('id, nombre, texto, rating')
        .eq('tenant_id', tenant.id)
        .eq('activo', true)
        .order('created_at', { ascending: false })
        .limit(6),
      supabase
        .from('clientes')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenant.id),
    ]);

    const barbers: Barber[] = (barbersRes.data ?? []).map((b) => ({
      id: b.id,
      nombre: b.nombre,
      rol: b.rol ?? null,
      rating: b.rating != null ? Number(b.rating) : null,
    }));

    const reviews: Review[] = (reviewsRes.data ?? []).map((r) => ({
      id: r.id,
      nombre: r.nombre,
      texto: r.texto,
      rating: Number(r.rating),
    }));

    const ratings = reviews.map((r) => r.rating).filter((n) => n > 0);
    const avgRating = ratings.length
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
      : null;

    const stats: BarberiaStats = {
      rating: avgRating,
      barberos: barbers.length,
      clientes: clientesRes.count ?? 0,
      reseñas: reviews.length,
    };

    return (
      <BarberiaClient
        tenant={tenant}
        services={services}
        barbers={barbers}
        reviews={reviews}
        stats={stats}
      />
    );
  }

  return <BookingClient tenant={tenant} services={services} />;
}
