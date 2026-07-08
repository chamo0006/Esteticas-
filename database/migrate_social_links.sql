-- Redes sociales extra del comercio (Instagram ya existía en migrate_instagram.sql).
-- Mismo formato: acepta handle o URL completa, se muestran como enlaces en el
-- sitio de reservas si están cargadas.
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS facebook  TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS tiktok    TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS sitio_web TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS whatsapp  TEXT;
-- whatsapp: número público a mostrar en la web. NULL = se usa `telefono` como fallback.
