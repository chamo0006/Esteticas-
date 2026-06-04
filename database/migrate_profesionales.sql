-- Tabla profesionales
CREATE TABLE IF NOT EXISTS profesionales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_profesionales_tenant ON profesionales(tenant_id);

-- Agregar profesional_id a turnos (nullable for backward compat)
ALTER TABLE turnos ADD COLUMN IF NOT EXISTS profesional_id UUID REFERENCES profesionales(id);
CREATE INDEX IF NOT EXISTS idx_turnos_profesional ON turnos(profesional_id);
