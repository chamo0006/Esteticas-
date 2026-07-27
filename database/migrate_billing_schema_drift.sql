-- ============================================================
-- MIGRACIÓN: Reconcilia el schema versionado con columnas que ya
-- existen en producción pero nunca quedaron en un .sql del repo
-- (se fueron agregando a mano en el SQL Editor de Supabase).
-- Motor: PostgreSQL 15+ (Supabase)
-- Idempotente: se puede ejecutar varias veces sin error.
-- Ejecutar en Supabase SQL Editor.
--
-- Depende de: migrate_superadmin_billing.sql (suscripciones, pagos_suscripcion,
-- planes) y migrate_ventas_facturacion.sql (ventas_facturacion).
-- ============================================================


-- ============================================================
-- 1) SUSCRIPCIONES — cambio de plan diferido, cancelación,
--    modalidad de cobro y débito automático (Mercado Pago).
-- ============================================================
ALTER TABLE suscripciones
    ADD COLUMN IF NOT EXISTS plan_pendiente_id         UUID REFERENCES planes(id),
    ADD COLUMN IF NOT EXISTS cancelada_at               TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS motivo_cancelacion         TEXT,
    ADD COLUMN IF NOT EXISTS modalidad_cobro             VARCHAR(20) NOT NULL DEFAULT 'manual',
    ADD COLUMN IF NOT EXISTS mp_preapproval_id          TEXT,
    ADD COLUMN IF NOT EXISTS mp_preapproval_status      VARCHAR(20),
    ADD COLUMN IF NOT EXISTS mp_preapproval_init_point  TEXT;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'suscripciones_modalidad_cobro_check') THEN
        ALTER TABLE suscripciones ADD CONSTRAINT suscripciones_modalidad_cobro_check
            CHECK (modalidad_cobro IN ('manual','automatico'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'suscripciones_mp_preapproval_status_check') THEN
        ALTER TABLE suscripciones ADD CONSTRAINT suscripciones_mp_preapproval_status_check
            CHECK (mp_preapproval_status IS NULL OR mp_preapproval_status IN ('pending','authorized','paused','cancelled'));
    END IF;
END $$;


-- ============================================================
-- 2) PAGOS_SUSCRIPCION — snapshot del plan al momento del pago
--    (para que el historial no cambie si después editás el plan)
--    y origen del registro (manual vs. automático por Mercado Pago).
-- ============================================================
ALTER TABLE pagos_suscripcion
    ADD COLUMN IF NOT EXISTS plan_nombre_snapshot    VARCHAR(100),
    ADD COLUMN IF NOT EXISTS plan_precio_snapshot     NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS plan_features_snapshot   JSONB,
    ADD COLUMN IF NOT EXISTS origen                   VARCHAR(20) NOT NULL DEFAULT 'manual';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pagos_suscripcion_origen_check') THEN
        ALTER TABLE pagos_suscripcion ADD CONSTRAINT pagos_suscripcion_origen_check
            CHECK (origen IN ('manual','mercadopago'));
    END IF;
END $$;


-- ============================================================
-- 3) VENTAS_FACTURACION — vínculo con el pago formal, para no
--    contar dos veces la misma plata en los totales de ingresos.
-- ============================================================
ALTER TABLE ventas_facturacion
    ADD COLUMN IF NOT EXISTS pago_suscripcion_id UUID REFERENCES pagos_suscripcion(id) ON DELETE SET NULL;
