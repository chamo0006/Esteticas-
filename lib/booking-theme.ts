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
}

const ESTETICA: BookingTheme = {
  bg: '#FCF8F5',
  bgSticky: 'rgba(252,248,245,0.96)',
  border: '#F0E4E6',
  text: '#2C2C2C',
  muted: '#8C7B75',
  shadow: 'rgba(0,0,0,0.06)',
  cardBg: '#FFFFFF',
  inputBg: '#FFFFFF',
  cta: 'Confirmar Reserva',
  decoration: '🌸',
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
};

export function getBookingTheme(tipo: TipoNegocio | undefined): BookingTheme {
  return tipo === 'barberia' ? BARBERIA : ESTETICA;
}
