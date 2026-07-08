-- Contenido extra de la landing pública del tenant (banner, bio, dirección).
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS banner_url TEXT;
-- Imagen de portada/hero del sitio de reservas (Supabase Storage, bucket tenant-media).
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS bio VARCHAR(500);
-- Descripción corta del negocio, se muestra debajo del título en el sitio de reservas.
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS direccion VARCHAR(255);
-- Dirección en texto libre, se muestra con un ícono de pin (sin mapa).
