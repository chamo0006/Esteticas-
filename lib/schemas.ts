import { z } from 'zod';

export const reservarSchema = z.object({
  servicioIds: z.array(z.string().uuid()).min(1, 'Seleccioná al menos un servicio'),
  fechaHora:   z.string().datetime({ message: 'Fecha inválida', local: true, offset: true }),
  cliente: z.object({
    nombre:   z.string().min(1).max(100),
    apellido: z.string().min(1).max(100),
    email:    z.string().email('Email inválido'),
    telefono: z.string().min(6).max(20),
  }),
  metodoPago: z.enum(['efectivo', 'transferencia', 'mercadopago']),
});

export const loginAdminSchema = z.object({
  tenantSlug: z.string().min(1).max(100),
  email:      z.string().email(),
  password:   z.string().min(6),
});

export const registrarTenantSchema = z.object({
  nombre:      z.string().min(2).max(255),
  email:       z.string().email(),
  telefono:    z.string().optional(),
  adminNombre: z.string().min(2).max(255),
  password:    z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  tipo_negocio: z.enum(['estetica', 'barberia']).default('estetica'),
});

export const configuracionSchema = z.object({
  nombre:           z.string().min(2).max(255).optional(),
  email_contacto:   z.string().email().nullish(),
  telefono:         z.string().max(30).nullish(),
  exige_sena:       z.boolean().optional(),
  porcentaje_sena:  z.number().min(0).max(100).nullish(),
  permite_efectivo: z.boolean().optional(),
});

export const servicioSchema = z.object({
  nombre:           z.string().min(1).max(255),
  descripcion:      z.string().max(500).optional(),
  duracion_minutos: z.number().int().min(5).max(480),
  precio:           z.number().min(0),
  categoria:        z.string().min(1).max(50).default('general'),
});

export const horarioSchema = z.object({
  dia_semana:    z.number().int().min(0).max(6),
  hora_apertura: z.string().regex(/^\d{2}:\d{2}$/),
  hora_cierre:   z.string().regex(/^\d{2}:\d{2}$/),
  activo:        z.boolean(),
});

export type ReservarInput       = z.infer<typeof reservarSchema>;
export type RegistrarTenantInput = z.infer<typeof registrarTenantSchema>;
export type ConfiguracionInput  = z.infer<typeof configuracionSchema>;
