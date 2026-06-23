-- ════════════════════════════════════════════════════════════════════════
--  Migración para el nuevo diseño de la BARBERÍA
--  (no afecta a las estéticas)
-- ════════════════════════════════════════════════════════════════════════

-- 1) Datos extra para mostrar a los barberos en la nueva landing
ALTER TABLE profesionales ADD COLUMN IF NOT EXISTS rol      VARCHAR(255);
ALTER TABLE profesionales ADD COLUMN IF NOT EXISTS rating   NUMERIC(2,1) CHECK (rating >= 0 AND rating <= 5);
ALTER TABLE profesionales ADD COLUMN IF NOT EXISTS foto_url TEXT;

-- 2) Reseñas de clientes (sección "Qué dicen nuestros clientes")
CREATE TABLE IF NOT EXISTS resenias (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nombre     VARCHAR(255) NOT NULL,
  texto      TEXT NOT NULL,
  rating     SMALLINT NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  activo     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_resenias_tenant ON resenias(tenant_id);

-- ────────────────────────────────────────────────────────────────────────
--  (OPCIONAL) Datos de ejemplo. Reemplazá <TENANT_ID> por el id real de tu
--  barbería y descomentá si querés cargar contenido de muestra.
-- ────────────────────────────────────────────────────────────────────────
-- UPDATE profesionales SET rol = 'Especialista en fade', rating = 4.9 WHERE nombre = 'Matías Gómez';
--
-- INSERT INTO resenias (tenant_id, nombre, texto, rating) VALUES
--   ('<TENANT_ID>', 'Agustín G.', 'El mejor fade que me hicieron. Súper prolijo y rápido.', 5),
--   ('<TENANT_ID>', 'Martín F.',  'El turno online es muy cómodo, entré a la hora exacta.',  5),
--   ('<TENANT_ID>', 'Nicolás R.', 'Llevo 2 años yendo y no cambiaría nada.',                 5);
