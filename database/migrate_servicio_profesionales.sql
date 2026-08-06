-- Qué profesionales hacen cada servicio. Antes cualquier profesional activa
-- del tenant podía quedar asignada a cualquier servicio (no había ninguna
-- relación entre las dos tablas); esto la hace explícita.
CREATE TABLE IF NOT EXISTS servicio_profesionales (
    servicio_id     UUID NOT NULL REFERENCES servicios(id)     ON DELETE CASCADE,
    profesional_id  UUID NOT NULL REFERENCES profesionales(id) ON DELETE CASCADE,
    PRIMARY KEY (servicio_id, profesional_id)
);
CREATE INDEX IF NOT EXISTS idx_servicio_profesionales_profesional ON servicio_profesionales(profesional_id);

-- Backfill: para no romper nada existente, todo servicio actual queda
-- vinculado a todas las profesionales actuales de su mismo tenant (el
-- comportamiento de hoy, donde cualquiera hace cualquier servicio). De acá en
-- adelante es explícito: una profesional nueva no hereda automáticamente los
-- servicios existentes, hay que asignársela desde el panel.
INSERT INTO servicio_profesionales (servicio_id, profesional_id)
SELECT s.id, p.id
FROM servicios s
JOIN profesionales p ON p.tenant_id = s.tenant_id
ON CONFLICT DO NOTHING;
