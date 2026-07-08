import type { Metadata } from 'next';
import { getTenantBySlug } from '@/lib/tenant';

interface Props {
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}): Promise<Metadata> {
  const { tenantSlug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);

  if (!tenant) return { title: 'Estética no encontrada' };

  return {
    title: `Reservar turno — ${tenant.nombre}`,
    description: `Reservá tu turno en ${tenant.nombre} de forma rápida y sencilla.`,
    openGraph: {
      title: tenant.nombre,
      description: `Reservá tu turno en ${tenant.nombre}`,
      ...(tenant.logo_url ? { images: [{ url: tenant.logo_url }] } : {}),
    },
  };
}

// Convierte un color hex a valores HSL sin dependencias externas
function hexToComponents(hex: string): string | null {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return null;
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return `oklch(${l.toFixed(2)} 0 0)`;
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  // Devuelve como oklch aproximado (valores razonables para colores vibrantes)
  const c = s * Math.min(l, 1 - l) * 2;
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return `oklch(${l.toFixed(2)} ${c.toFixed(3)} ${(h * 360).toFixed(0)})`;
}

export default async function TenantLayout({ children, params }: Props) {
  const { tenantSlug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);

  // Construye el override de CSS si el tenant tiene colores personalizados
  let cssOverride = '';
  if (tenant?.color_primario) {
    const oklchPrimario = hexToComponents(tenant.color_primario);
    if (oklchPrimario) cssOverride += `--primary:${oklchPrimario};--ring:${oklchPrimario};`;
  }
  if (tenant?.color_acento) {
    const oklchAcento = hexToComponents(tenant.color_acento);
    if (oklchAcento) cssOverride += `--accent:${oklchAcento};`;
  }

  return (
    <>
      {cssOverride && (
        <style dangerouslySetInnerHTML={{ __html: `:root{${cssOverride}}` }} />
      )}
      {children}
    </>
  );
}
