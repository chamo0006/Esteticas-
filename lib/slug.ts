import { supabase } from './supabase';

export function sanitizarSlug(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')  // elimina tildes
    .replace(/ñ/g, 'n')
    .replace(/[^a-z0-9\s-]/g, '')    // solo alfanumérico y guiones
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function generarSlugUnico(nombreEstetica: string): Promise<string> {
  const base = sanitizarSlug(nombreEstetica);
  let slug = base;
  let intento = 1;

  while (true) {
    const { data } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (!data) return slug;
    intento++;
    slug = `${base}-${intento}`;
  }
}
