-- ============================================================
-- MIGRACIÓN: Ventas de planes (superadmin) — reemplaza notas_facturacion
-- Motor: PostgreSQL 15+ (Supabase)
-- Idempotente: se puede ejecutar varias veces sin error.
-- Ejecutar en Supabase SQL Editor.
-- ============================================================
--
-- Planilla manual de ventas: quién compró qué plan, cuánto pagó, cuándo
-- pagó y cuándo le vence. Independiente de `pagos_suscripcion` (eso es
-- el registro formal atado a un tenant ya creado); esto es más like un
-- Excel propio — el cliente puede o no tener cuenta creada todavía.
-- Navegable mes a mes por fecha_pago, como el apartado de "Actividad"
-- de Mercado Pago.
-- ============================================================

DROP TABLE IF EXISTS notas_facturacion;

CREATE TABLE IF NOT EXISTS ventas_facturacion (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente            TEXT NOT NULL,                 -- nombre de la persona/negocio que compró
    plan               TEXT NOT NULL,                 -- plan comprado (texto libre)
    monto              NUMERIC(10,2) NOT NULL CHECK (monto >= 0),  -- cuánto pagó
    fecha_pago         DATE NOT NULL,                 -- cuándo pagó
    fecha_vencimiento  DATE,                          -- cuándo vence / próximo pago
    notas              TEXT,                          -- comentario opcional
    platform_admin_id  UUID REFERENCES platform_admins(id) ON DELETE SET NULL,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ventas_facturacion_fecha_pago ON ventas_facturacion (fecha_pago);

DROP TRIGGER IF EXISTS trg_ventas_facturacion_updated_at ON ventas_facturacion;
CREATE TRIGGER trg_ventas_facturacion_updated_at
BEFORE UPDATE ON ventas_facturacion
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Solo el service role (backend) accede; sin políticas = acceso denegado
-- para anon/authenticated, igual que el resto de las tablas de superadmin.
ALTER TABLE ventas_facturacion ENABLE ROW LEVEL SECURITY;
