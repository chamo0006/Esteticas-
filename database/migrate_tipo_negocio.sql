-- Agrega tipo de negocio para diferenciar diseño entre estéticas y barberías
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS tipo_negocio TEXT NOT NULL DEFAULT 'estetica'
    CHECK (tipo_negocio IN ('estetica', 'barberia'));
