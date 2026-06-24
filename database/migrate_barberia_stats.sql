-- ════════════════════════════════════════════════════════════════════════
--  Stats editables de la landing de BARBERÍA (Rating / Barberos / Clientes)
--  Cada columna es un OVERRIDE manual: si es NULL se usa el valor automático
--  (promedio de reseñas, cantidad de profesionales, cantidad de clientes).
--  (no afecta a las estéticas)
-- ════════════════════════════════════════════════════════════════════════

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stat_rating   NUMERIC(2,1) CHECK (stat_rating >= 0 AND stat_rating <= 5);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stat_barberos INTEGER      CHECK (stat_barberos >= 0);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stat_clientes INTEGER      CHECK (stat_clientes >= 0);
