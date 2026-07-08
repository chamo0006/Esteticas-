-- Galería de fotos del comercio, mostrada en el sitio de reservas.
CREATE TABLE IF NOT EXISTS tenant_galeria (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  orden      INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tenant_galeria_tenant ON tenant_galeria(tenant_id);

-- Solo el service role (backend) accede; sin políticas = acceso denegado
-- para anon/authenticated, igual que el resto de las tablas del proyecto.
ALTER TABLE tenant_galeria ENABLE ROW LEVEL SECURITY;
