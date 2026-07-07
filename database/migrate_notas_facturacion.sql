-- ============================================================
-- MIGRACIÓN: Notas mensuales de Facturación (superadmin)
-- Motor: PostgreSQL 15+ (Supabase)
-- Idempotente: se puede ejecutar varias veces sin error.
-- Ejecutar en Supabase SQL Editor.
-- ============================================================
--
-- Bitácora libre para anotar cosas de un mes puntual (ingresos/egresos
-- manuales, recordatorios, acuerdos, etc.), navegable mes a mes —
-- similar al apartado de "Actividad" de Mercado Pago. No reemplaza a
-- `pagos_suscripcion` (eso sigue siendo el registro formal de cobros).
-- ============================================================

CREATE TABLE IF NOT EXISTS notas_facturacion (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha             DATE NOT NULL,               -- día del mes al que pertenece la nota
    texto             TEXT NOT NULL,
    monto             NUMERIC(10,2),                -- opcional: positivo = ingreso, negativo = egreso
    platform_admin_id UUID REFERENCES platform_admins(id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notas_facturacion_fecha ON notas_facturacion (fecha);
