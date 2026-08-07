// ── Tipos compartidos entre frontend y backend ──────────────────────────────

export type Service = {
  id: string;
  name: string;
  duration: string;   // "45 min"
  price: number;
  category: string;   // "nails" | "lashes" | "brows" | "general"
  imageUrl: string | null;
};

export type CartItem = Service & {
  quantity: number;
};

export type BookingStep = 'services' | 'calendar' | 'summary';

export type SchedulingMode = 'together' | 'separate';

export type TipoNegocio = 'estetica' | 'barberia';

export type PresetTema      =
  | 'sora' | 'rose' | 'noir' | 'carbon'
  | 'carbon-oro' | 'noche-cobre' | 'verde-bosque' | 'crema-tinta' | 'nordico' | 'vino-arena';
export type TipoTipografia  = 'elegante' | 'moderna' | 'clasica';
export type TipoRadio       = 'marcado' | 'suave' | 'redondeado';
export type TipoSombra      = 'plana' | 'sutil' | 'elevada';
export type LayoutCatalogo  = 'lista' | 'tarjetas' | 'grilla';

export interface AparienciaColors {
  bg: string;
  text: string;
  muted: string;
  card: string;
  border: string;
  primary: string;
  accent: string;
  surf2: string;
}

// Apariencia avanzada del sitio de reservas (estéticas y barberías). Se
// guarda como JSONB en `tenants.apariencia`; null = usar el preset por
// defecto del tipo de negocio (Sora para estética, Carbón para barbería).
export interface Apariencia {
  preset: PresetTema;
  colors: AparienciaColors;
  typo: TipoTipografia;
  radius: TipoRadio;
  shadow: TipoSombra;
  layout: LayoutCatalogo;
}

export interface TenantConfig {
  id: string;
  slug: string;
  nombre: string;
  logo_url: string | null;
  bio: string | null;              // descripción corta del negocio
  direccion: string | null;        // dirección en texto libre
  exige_sena_efectivo: boolean;
  exige_sena_transferencia: boolean;
  exige_sena_mercadopago: boolean;
  porcentaje_sena: number | null;
  permite_efectivo: boolean;
  color_primario: string | null;   // hex, ej: "#FFD1DC"
  color_acento: string | null;     // hex, ej: "#D4A0A7"
  telefono: string | null;
  instagram: string | null;        // handle "@sora" o URL completa
  facebook: string | null;         // handle o URL completa
  tiktok: string | null;           // handle o URL completa
  sitio_web: string | null;        // URL completa
  whatsapp: string | null;         // número público; null = usa `telefono`
  tipo_negocio: TipoNegocio;
  alias_pago: string | null;       // alias/CBU para transferencias
  horas_limite_cancelacion: number; // horas antes del turno hasta las que el cliente puede cancelar (0 = siempre)
  horas_limite_reserva: number;     // anticipación mínima para reservar, en horas desde "ahora" (0 = sin restricción)
  apariencia: Apariencia | null;    // null = preset por defecto (Sora estética / Carbón barbería)
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
  exige_sena_efectivo: boolean;
  exige_sena_transferencia: boolean;
  exige_sena_mercadopago: boolean;
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
  requierePagoOnline: boolean;         // true = hay que ir a MercadoPago antes de confirmar (elegido o seña forzada)
}
