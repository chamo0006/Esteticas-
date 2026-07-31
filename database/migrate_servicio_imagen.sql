-- Foto por servicio (se muestra en los layouts "Tarjetas" y "Grilla" del catálogo).
-- NULL = sin foto, se muestra el bloque decorativo del tema.
ALTER TABLE servicios ADD COLUMN IF NOT EXISTS imagen_url TEXT;
