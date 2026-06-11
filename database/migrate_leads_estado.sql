-- Agrega campo estado para tracking de leads en el panel superadmin
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS estado TEXT NOT NULL DEFAULT 'nuevo'
    CHECK (estado IN ('nuevo', 'contactado', 'descartado'));
