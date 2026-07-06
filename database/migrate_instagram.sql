-- Instagram del comercio (handle "@sora" o URL completa). Se muestra como enlace
-- en el ícono de IG del sitio de reservas.
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS instagram TEXT;
