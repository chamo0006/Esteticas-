-- ============================================================
-- MIGRACIÓN: OAuth de MercadoPago (vinculación con un click)
-- Guarda el refresh token, el user_id del comercio y el vencimiento
-- del access token para poder renovarlo automáticamente.
-- Idempotente.
-- ============================================================

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS mp_refresh_token    TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS mp_user_id          TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS mp_token_expires_at TIMESTAMPTZ;

COMMENT ON COLUMN tenants.mp_refresh_token    IS 'Refresh token de OAuth para renovar el access token sin re-vincular.';
COMMENT ON COLUMN tenants.mp_user_id          IS 'ID de usuario (collector) de MercadoPago del comercio.';
COMMENT ON COLUMN tenants.mp_token_expires_at IS 'Vencimiento del access token de MercadoPago (para renovarlo a tiempo).';
