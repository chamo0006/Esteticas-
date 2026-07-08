import { notFound } from 'next/navigation';
import { getTenantBySlug } from '@/lib/tenant';
import { supabase } from '@/lib/supabase';
import { BookingClient }  from './booking-client';
import { BarberiaClient } from './barberia-client';
import type { Service } from '@/lib/booking-types';
import type { Barber, Review, BarberiaStats, Foto } from './barberia-client';

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

  // ── Reseñas y galería: para ambos rubros ──────────────────────────────
  const [reviewsRes, galeriaRes] = await Promise.all([
    supabase
      .from('resenias')
      .select('id, nombre, texto, rating')
      .eq('tenant_id', tenant.id)
      .eq('activo', true)
      .order('created_at', { ascending: false })
      .limit(6),
    supabase
      .from('tenant_galeria')
      .select('id, url')
      .eq('tenant_id', tenant.id)
      .order('orden'),
  ]);

  const reviews: Review[] = (reviewsRes.data ?? []).map((r) => ({
    id: r.id,
    nombre: r.nombre,
    texto: r.texto,
    rating: Number(r.rating),
  }));

  const galeria: Foto[] = (galeriaRes.data ?? []).map((f) => ({ id: f.id, url: f.url }));

  if (tenant.tipo_negocio === 'barberia') {
    // ── Datos extra para la landing de barbería ──────────────────────────
    const [barbersRes, clientesRes, overridesRes] = await Promise.all([
      supabase
        .from('profesionales')
        .select('id, nombre, rol, rating')
        .eq('tenant_id', tenant.id)
        .eq('activo', true)
        .order('created_at'),
      supabase
        .from('clientes')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenant.id),
      // Overrides manuales de las stats, configurables desde /admin
      supabase
        .from('tenants')
        .select('stat_rating, stat_barberos, stat_clientes')
        .eq('id', tenant.id)
        .single(),
    ]);

    // Fallback: si las columnas rol/rating todavía no existen (migración sin
    // correr), reintenta con los campos básicos para no perder los barberos.
    let barbersData = barbersRes.data;
    if (barbersRes.error) {
      const { data } = await supabase
        .from('profesionales')
        .select('id, nombre')
        .eq('tenant_id', tenant.id)
        .eq('activo', true)
        .order('created_at');
      barbersData = (data ?? []).map((b) => ({ ...b, rol: null, rating: null }));
    }

    const barbers: Barber[] = (barbersData ?? []).map((b) => ({
      id: b.id,
      nombre: b.nombre,
      rol: b.rol ?? null,
      rating: b.rating != null ? Number(b.rating) : null,
    }));

    const ratings = reviews.map((r) => r.rating).filter((n) => n > 0);
    const avgRating = ratings.length
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
      : null;

    // Si hay override manual (columna no nula) se usa ese; si no, el automático.
    const ov = overridesRes.data as
      | { stat_rating: number | null; stat_barberos: number | null; stat_clientes: number | null }
      | null;

    const stats: BarberiaStats = {
      rating:   ov?.stat_rating   != null ? Number(ov.stat_rating)   : avgRating,
      barberos: ov?.stat_barberos != null ? ov.stat_barberos          : barbers.length,
      clientes: ov?.stat_clientes != null ? ov.stat_clientes          : (clientesRes.count ?? 0),
      reseñas:  reviews.length,
    };

    return (
      <BarberiaClient
        tenant={tenant}
        services={services}
        barbers={barbers}
        reviews={reviews}
        stats={stats}
        galeria={galeria}
      />
    );
  }

  return <BookingClient tenant={tenant} services={services} reviews={reviews} galeria={galeria} />;
}
