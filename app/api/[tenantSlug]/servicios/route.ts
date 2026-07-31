import { NextResponse } from 'next/server';
import { getTenantBySlug } from '@/lib/tenant';
import { supabase } from '@/lib/supabase';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;

  try {
    const tenant = await getTenantBySlug(tenantSlug);
    if (!tenant) {
      return NextResponse.json({ error: 'Estética no encontrada' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('servicios')
      .select('id, nombre, descripcion, duracion_minutos, precio, categoria, imagen_url')
      .eq('tenant_id', tenant.id)
      .eq('activo', true)
      .order('categoria')
      .order('nombre');

    if (error) throw error;

    const services = (data ?? []).map((s) => ({
      id: s.id,
      name: s.nombre,
      description: s.descripcion ?? null,
      duration: `${s.duracion_minutos} min`,
      duracion_minutos: Number(s.duracion_minutos),
      price: Number(s.precio),
      category: s.categoria ?? 'general',
      imageUrl: s.imagen_url ?? null,
    }));

    return NextResponse.json(services);
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
