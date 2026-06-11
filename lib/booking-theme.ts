import type { TipoNegocio } from './booking-types';

export interface BookingTheme {
  bg: string;
  bgSticky: string;
  border: string;
  text: string;
  muted: string;
  shadow: string;
  cta: string;         // texto del botón de confirmación
  decoration: string;  // emoji decorativo del header
}

const ESTETICA: BookingTheme = {
  bg: '#FCF8F5',
  bgSticky: 'rgba(252,248,245,0.96)',
  border: '#F0E4E6',
  text: '#2C2C2C',
  muted: '#8C7B75',
  shadow: 'rgba(0,0,0,0.06)',
  cta: 'Confirmar Reserva',
  decoration: '🌸',
};

const BARBERIA: BookingTheme = {
  bg: '#F3F2F0',
  bgSticky: 'rgba(243,242,240,0.96)',
  border: '#E4E1DB',
  text: '#1A1A1A',
  muted: '#6B6560',
  shadow: 'rgba(0,0,0,0.08)',
  cta: 'Reservar turno',
  decoration: '✂️',
};

export function getBookingTheme(tipo: TipoNegocio | undefined): BookingTheme {
  return tipo === 'barberia' ? BARBERIA : ESTETICA;
}
