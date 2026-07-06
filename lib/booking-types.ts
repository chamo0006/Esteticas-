// ── Tipos compartidos entre frontend y backend ──────────────────────────────

export type Service = {
  id: string;
  name: string;
  duration: string;   // "45 min"
  price: number;
  category: string;   // "nails" | "lashes" | "brows" | "general"
};

export type CartItem = Service & {
  quantity: number;
};

export type BookingStep = 'services' | 'calendar' | 'summary';

export type SchedulingMode = 'together' | 'separate';

export type TipoNegocio = 'estetica' | 'barberia';

export interface TenantConfig {
  id: string;
  slug: string;
  nombre: string;
  logo_url: string | null;
  exige_sena: boolean;
  porcentaje_sena: number | null;
  permite_efectivo: boolean;
  color_primario: string | null;   // hex, ej: "#FFD1DC"
  color_acento: string | null;     // hex, ej: "#D4A0A7"
  telefono: string | null;
  instagram: string | null;        // handle "@sora" o URL completa
  tipo_negocio: TipoNegocio;
  alias_pago: string | null;       // alias/CBU para transferencias
  horas_limite_cancelacion: number; // horas antes del turno hasta las que el cliente puede cancelar (0 = siempre)
}

export interface TimeSlot {
  time: string;       // display: "09:00 AM"
  timeValue: string;  // 24hs: "09:00"
  available: boolean;
}

// ── Tipos de DB (respuestas internas) ───────────────────────────────────────

export interface Tenant {
  id: string;
  slug: string;
  nombre: string;
  email_contacto: string;
  telefono: string | null;
  logo_url: string | null;
  activo: boolean;
  exige_sena: boolean;
  porcentaje_sena: number | null;
  permite_efectivo: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Servicio {
  id: string;
  tenant_id: string;
  nombre: string;
  descripcion: string | null;
  duracion_minutos: number;
  precio: number;
  categoria: string | null;
  activo: boolean;
}

export interface Cliente {
  id: string;
  tenant_id: string;
  nombre: string;
  telefono: string | null;
  email: string | null;
}

export interface Turno {
  id: string;
  tenant_id: string;
  cliente_id: string;
  servicio_id: string;
  fecha_hora: Date;
  estado: 'pendiente' | 'confirmado' | 'completado' | 'cancelado';
  notas: string | null;
}

export interface Pago {
  id: string;
  tenant_id: string;
  turno_id: string;
  tipo: 'total' | 'sena' | 'saldo_restante';
  metodo: 'efectivo' | 'transferencia' | 'tarjeta' | 'mercadopago';
  monto: number;
  estado: 'pendiente' | 'acreditado' | 'rechazado' | 'reembolsado';
  referencia_externa: string | null;
}

// ── Respuesta de confirmación de reserva ────────────────────────────────────

export interface BookingConfirmation {
  turnoIds: string[];
  pagoId: string;
  monto: number;
  tipo: 'total' | 'sena';
  profesionalNombre?: string | null;   // profesional asignada (null si el negocio no tiene)
}
