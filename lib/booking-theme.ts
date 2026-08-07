import type {
  TipoNegocio,
  Apariencia,
  PresetTema,
  TipoTipografia,
  TipoRadio,
  TipoSombra,
  LayoutCatalogo,
  AparienciaColors,
} from './booking-types';

export interface BookingTheme {
  bg: string;
  bgSticky: string;
  border: string;
  text: string;
  muted: string;
  shadow: string;
  cardBg: string;       // fondo de tarjetas / cards
  inputBg: string;      // fondo de inputs
  cta: string;
  decoration: string;
  primary: string;      // color de acción: CTAs y estados seleccionados
  accent: string;       // acento: precios, líneas, detalles
  surf2: string;        // superficie sutil (filas/estados seleccionados suaves)
  ctaGradient?: string; // fondo alternativo para el CTA principal (degradado); si no está, se usa `primary` sólido
  tagline?: string;     // texto corto bajo el logo
  sub?: string;         // subtítulo debajo del nombre
  // Tipografía
  fontHead: string;     // font-family para títulos
  fontBody: string;     // font-family para textos
  headWeight: number;
  // Bordes (radios)
  radCard: string;      // cards grandes
  radBtn: string;       // CTAs
  radCtl: string;       // chips, inputs, slots
  radPill: string;      // elementos siempre-píldora (badges, dots)
  // Sombra
  shadowBox: string;    // box-shadow completo
  // Layout del catálogo
  layout: LayoutCatalogo;
}

// hex ("#RRGGBB") -> "rgba(r,g,b,a)"
function hexA(hex: string, a: number): string {
  const c = hex.replace('#', '');
  if (c.length < 6) return hex;
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

// Contraste WCAG simplificado: decide si el texto sobre `hex` debe ser
// blanco o negro (ej: el dorado claro de Noir Couture necesita texto oscuro).
export function onColor(hex: string): string {
  const c = hex.replace('#', '');
  if (c.length < 6) return '#FFFFFF';
  const f = (x: number) => (x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4));
  const [r, g, b] = [0, 2, 4].map((i) => f(parseInt(c.substring(i, i + 2), 16) / 255));
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.55 ? '#141311' : '#FFFFFF';
}

interface PresetDef {
  colors: AparienciaColors;
  typo: TipoTipografia;
  radius: TipoRadio;
  shadow: TipoSombra;
  layout: LayoutCatalogo;
  deco: string;
  tagline: string;
  sub: string;
}

// Exportado para que el panel de Apariencia (admin) pueda armar las 3
// tarjetas de tema y precargar el preset Sora cuando el tenant no tiene nada guardado.
export const PRESETS: Record<PresetTema, PresetDef> = {
  sora: {
    colors: { bg: '#FAFAF8', text: '#1A1A10', muted: '#8A8A72', card: '#FFFFFF', border: '#E8E8E0', primary: '#111108', accent: '#C8B878', surf2: '#F4F3EE' },
    typo: 'elegante', radius: 'suave', shadow: 'sutil', layout: 'lista',
    deco: '美容', tagline: 'Estética & bienestar', sub: 'Reserve su experiencia de belleza',
  },
  rose: {
    colors: { bg: '#FCF8F5', text: '#3A2C2E', muted: '#A9908F', card: '#FFFFFF', border: '#F0E3E4', primary: '#B76E79', accent: '#C79A6B', surf2: '#F9EEEF' },
    typo: 'clasica', radius: 'redondeado', shadow: 'sutil', layout: 'tarjetas',
    deco: '✿', tagline: 'Belleza & cuidado', sub: 'Reservá tu momento de cuidado',
  },
  noir: {
    colors: { bg: '#141311', text: '#F0EADD', muted: '#8C8578', card: '#1D1B17', border: '#2E2B25', primary: '#C6A15B', accent: '#DAC7A0', surf2: '#25221D' },
    typo: 'elegante', radius: 'marcado', shadow: 'elevada', layout: 'grilla',
    deco: '◆', tagline: 'Alta estética', sub: 'Reservá una experiencia premium',
  },
  carbon: {
    // Carbón con azul (estados seleccionados) y rojo/coral (acentos, precios).
    // Preset por defecto de las barberías — mismos colores que el tema fijo
    // que tenían antes de que barbería pasara a usar el sistema de Apariencia.
    colors: { bg: '#111111', text: '#F0EDE8', muted: '#888880', card: '#1C1C1C', border: '#2C2C2C', primary: '#4361EE', accent: '#E14D5D', surf2: '#252525' },
    typo: 'moderna', radius: 'suave', shadow: 'elevada', layout: 'lista',
    deco: '✂️', tagline: 'Barbería', sub: 'Reservá tu turno',
  },
  // ── Paletas "central de turnos" ──────────────────────────────────────────
  'carbon-oro': {
    colors: { bg: '#0f0f10', text: '#f4efe4', muted: '#8b8676', card: '#1a1a1c', border: 'rgba(255,255,255,.07)', primary: '#d4a24e', accent: '#d4a24e', surf2: '#211f1a' },
    typo: 'moderna', radius: 'suave', shadow: 'elevada', layout: 'lista',
    deco: '✂️', tagline: 'Barbería', sub: 'Reservá tu turno',
  },
  'noche-cobre': {
    colors: { bg: '#101319', text: '#eef1f6', muted: '#7d8794', card: '#1a1f27', border: 'rgba(255,255,255,.07)', primary: '#cc7a44', accent: '#cc7a44', surf2: '#1f2530' },
    typo: 'moderna', radius: 'suave', shadow: 'elevada', layout: 'lista',
    deco: '✂️', tagline: 'Barbería', sub: 'Reservá tu turno',
  },
  'verde-bosque': {
    colors: { bg: '#0d1310', text: '#e9f1ec', muted: '#7f938a', card: '#161e19', border: 'rgba(255,255,255,.07)', primary: '#4fbf8a', accent: '#4fbf8a', surf2: '#1b241e' },
    typo: 'moderna', radius: 'suave', shadow: 'elevada', layout: 'lista',
    deco: '✂️', tagline: 'Barbería', sub: 'Reservá tu turno',
  },
  'crema-tinta': {
    colors: { bg: '#f2eee6', text: '#1b1b1b', muted: '#8b8579', card: '#ffffff', border: 'rgba(0,0,0,.08)', primary: '#b23a2c', accent: '#b23a2c', surf2: '#ece6da' },
    typo: 'moderna', radius: 'suave', shadow: 'sutil', layout: 'lista',
    deco: '✂️', tagline: 'Barbería', sub: 'Reservá tu turno',
  },
  nordico: {
    colors: { bg: '#eef1f5', text: '#1a2130', muted: '#788292', card: '#ffffff', border: 'rgba(0,0,0,.07)', primary: '#2f6df0', accent: '#2f6df0', surf2: '#e4e8ee' },
    typo: 'moderna', radius: 'suave', shadow: 'sutil', layout: 'lista',
    deco: '✂️', tagline: 'Barbería', sub: 'Reservá tu turno',
  },
  'vino-arena': {
    colors: { bg: '#161010', text: '#f1e8dd', muted: '#9c8b7d', card: '#211815', border: 'rgba(255,255,255,.07)', primary: '#9c3242', accent: '#9c3242', surf2: '#291e1a' },
    typo: 'moderna', radius: 'suave', shadow: 'elevada', layout: 'lista',
    deco: '✂️', tagline: 'Barbería', sub: 'Reservá tu turno',
  },
};

const TYPO: Record<TipoTipografia, { head: string; body: string; weight: number }> = {
  elegante: { head: "'Cormorant Garamond', Georgia, serif", body: "'Jost', system-ui, sans-serif", weight: 600 },
  moderna:  { head: "'Manrope', system-ui, sans-serif",     body: "'Manrope', system-ui, sans-serif", weight: 700 },
  clasica:  { head: "'Playfair Display', Georgia, serif",   body: "'Nunito Sans', system-ui, sans-serif", weight: 600 },
};

const RAD: Record<TipoRadio, { card: string; btn: string; ctl: string; pill: string }> = {
  marcado:    { card: '6px',  btn: '6px',    ctl: '4px',   pill: '6px' },
  suave:      { card: '16px', btn: '12px',   ctl: '10px',  pill: '9999px' },
  redondeado: { card: '26px', btn: '9999px', ctl: '9999px', pill: '9999px' },
};

const SHAD: Record<TipoSombra, string> = {
  plana:   'none',
  sutil:   '0 2px 20px rgba(0,0,0,0.06)',
  elevada: '0 16px 40px rgba(0,0,0,0.16)',
};

// Colores personalizados del tenant (Configuración → Apariencia) pisan el
// primary/accent del preset elegido; si no están cargados, se usa el preset
// tal cual. Con `apariencia` guardada (preset + colores granulares +
// tipografía + layout + bordes/sombras), esta manda por completo sobre el
// par color_primario/color_acento legado. Mismo sistema para estética y
// barbería — solo cambia el preset por defecto cuando no hay nada guardado.
export function getBookingTheme(
  tipo: TipoNegocio | undefined,
  colorPrimario?: string | null,
  colorAcento?: string | null,
  apariencia?: Apariencia | null,
): BookingTheme {
  const presetPorDefecto: PresetTema = tipo === 'barberia' ? 'carbon' : 'sora';
  const p = PRESETS[apariencia?.preset ?? presetPorDefecto];
  const colors = apariencia?.colors ?? p.colors;
  const typo = TYPO[apariencia?.typo ?? p.typo];
  const rad = RAD[apariencia?.radius ?? p.radius];
  const shadowBox = SHAD[apariencia?.shadow ?? p.shadow];
  const layout = apariencia?.layout ?? p.layout;

  // Compatibilidad hacia atrás: sin `apariencia` guardada, los colores viejos
  // (color_primario/color_acento) siguen pisando el preset por defecto.
  const primary = apariencia ? colors.primary : (colorPrimario || colors.primary);
  const accent = apariencia ? colors.accent : (colorAcento || colors.accent);

  return {
    bg: colors.bg,
    bgSticky: hexA(colors.bg, 0.92),
    border: colors.border,
    text: colors.text,
    muted: colors.muted,
    shadow: 'rgba(0,0,0,0.06)',
    cardBg: colors.card,
    inputBg: colors.card,
    surf2: colors.surf2,
    primary,
    accent,
    cta: tipo === 'barberia' ? 'Reservar turno' : 'Confirmar reserva',
    decoration: p.deco,
    tagline: p.tagline,
    sub: p.sub,
    fontHead: typo.head,
    fontBody: typo.body,
    headWeight: typo.weight,
    radCard: rad.card,
    radBtn: rad.btn,
    radCtl: rad.ctl,
    radPill: rad.pill,
    shadowBox,
    layout,
  };
}
