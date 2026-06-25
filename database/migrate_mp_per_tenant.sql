-- ============================================================
-- MIGRACIÓN: MercadoPago por comercio (cada estética cobra a SU cuenta)
-- Agrega las credenciales de MercadoPago a nivel tenant.
-- Idempotente.
-- ============================================================

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS mp_access_token TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS mp_public_key   TEXT;

COMMENT ON COLUMN tenants.mp_access_token IS 'Access Token de MercadoPago de la estética (Credenciales de producción). Las señas se cobran a esta cuenta.';
COMMENT ON COLUMN tenants.mp_public_key   IS 'Public Key de MercadoPago de la estética (opcional, para Checkout Bricks).';
