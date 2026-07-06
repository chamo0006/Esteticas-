-- Devolución (parcial) de señas al cancelar un turno.
-- porcentaje_retencion: % que la estética RETIENE al devolver una seña de MP.
--   0 = devuelve todo · 100 = no devuelve nada.
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS porcentaje_retencion NUMERIC(5,2) NOT NULL DEFAULT 0
  CHECK (porcentaje_retencion BETWEEN 0 AND 100);

-- Registro de lo efectivamente devuelto en cada pago.
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS monto_devuelto NUMERIC(10,2);
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS devuelto_at    TIMESTAMPTZ;
