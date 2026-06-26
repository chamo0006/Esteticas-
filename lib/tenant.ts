import { supabase } from './supabase';
import type { TenantConfig } from './booking-types';

export async function getTenantBySlug(slug: string): Promise<TenantConfig | null> {
  try {
    const { data, error } = await supabase
      .from('tenants')
      .select('id, slug, nombre, logo_url, telefono, exige_sena, porcentaje_sena, permite_efectivo, color_primario, color_acento, tipo_negocio, alias_pago')
      .eq('slug', slug)
      .eq('activo', true)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      slug: data.slug,
      nombre: data.nombre,
      logo_url: data.logo_url,
      exige_sena: data.exige_sena,
      porcentaje_sena: data.porcentaje_sena != null ? Number(data.porcentaje_sena) : null,
      permite_efectivo: data.permite_efectivo,
      color_primario: data.color_primario ?? null,
      color_acento: data.color_acento ?? null,
      telefono: data.telefono ?? null,
      tipo_negocio: (data.tipo_negocio as 'estetica' | 'barberia') ?? 'estetica',
      alias_pago: data.alias_pago ?? null,
    };
  } catch (err) {
    console.error('[getTenantBySlug] ERROR:', err);
    return null;
  }
}
