import type { TipoNegocio } from './booking-types';

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
}

// Estética "Sora" — zen japonés: crema, negro tinta y dorado apagado.
const ESTETICA: BookingTheme = {
  bg: '#FAFAF8',
  bgSticky: 'rgba(250,250,248,0.9)',
  border: '#E8E8E0',
  text: '#1A1A10',
  muted: '#888870',
  shadow: 'rgba(0,0,0,0.05)',
  cardBg: '#FFFFFF',
  inputBg: '#FFFFFF',
  cta: 'Confirmar reserva',
  decoration: '美容',
  primary: '#111108',   // negro tinta
  accent: '#C8B878',    // dorado apagado
  surf2: '#F5F4F0',
};

const BARBERIA: BookingTheme = {
  bg: '#111111',
  bgSticky: 'rgba(17,17,17,0.97)',
  border: '#2C2C2C',
  text: '#F0EDE8',
  muted: '#888880',
  shadow: 'rgba(0,0,0,0.5)',
  cardBg: '#1C1C1C',
  inputBg: '#252525',
  cta: 'Reservar turno',
  decoration: '✂️',
  primary: '#C9A96E',
  accent: '#B8935A',
  surf2: '#252525',
};

// Colores personalizados del tenant (Configuración → Apariencia) pisan el
// primary/accent del preset fijo (Sora para estética, dorado para barbería);
// si no están cargados, se usa el preset tal cual.
export function getBookingTheme(
  tipo: TipoNegocio | undefined,
  colorPrimario?: string | null,
  colorAcento?: string | null,
): BookingTheme {
  const base = tipo === 'barberia' ? BARBERIA : ESTETICA;
  return {
    ...base,
    primary: colorPrimario || base.primary,
    accent: colorAcento || base.accent,
  };
}
