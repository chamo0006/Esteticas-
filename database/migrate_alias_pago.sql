-- ── Alias / CBU para pagos manuales (efectivo / transferencia) ───────────
-- Cada comercio guarda su alias o CBU para mostrárselo al cliente cuando
-- elige pagar por transferencia. NULL = no muestra nada.

ALTER TABLE tenants
    ADD COLUMN IF NOT EXISTS alias_pago TEXT;
