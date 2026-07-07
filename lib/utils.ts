import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Deja solo dígitos y saca ceros a la izquierda, para inputs numéricos
// controlados con type="text" (evita el bug de type="number" que no deja
// borrar el 0 inicial en algunos navegadores).
export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '').replace(/^0+(?=\d)/, '')
}
