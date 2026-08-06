-- Seña configurable por método de pago en vez de un único toggle global.
-- Antes: exige_sena (bool) aplicaba igual para efectivo/transferencia/mercadopago.
-- Ahora: un flag por método, para que el local pueda pedir seña solo en algunos
-- (ej. exigir seña en efectivo/transferencia pero no en MercadoPago, porque ahí
-- ya se cobra online).
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS exige_sena_efectivo      BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS exige_sena_transferencia BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS exige_sena_mercadopago   BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill: los tenants que ya exigían seña globalmente la siguen exigiendo
-- en los 3 métodos, para no cambiarles el comportamiento de un día para el otro.
UPDATE tenants SET
  exige_sena_efectivo      = exige_sena,
  exige_sena_transferencia = exige_sena,
  exige_sena_mercadopago   = exige_sena
WHERE exige_sena IS NOT NULL;

ALTER TABLE tenants DROP COLUMN IF EXISTS exige_sena;
