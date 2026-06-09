-- Tabla para leads del formulario de contacto de la landing
CREATE TABLE IF NOT EXISTS leads (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre     TEXT NOT NULL,
  email      TEXT NOT NULL,
  telefono   TEXT,
  estetica   TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
