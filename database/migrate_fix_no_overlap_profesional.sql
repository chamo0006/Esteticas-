-- El índice idx_turnos_no_overlap original (tenant_id, servicio_id, fecha_hora)
-- no incluye profesional_id, así que si dos profesionales distintas ofrecen el
-- mismo servicio, reservar con una bloquea ese horario para TODO el negocio en
-- vez de solo para ella. Lo reemplazamos por dos índices parciales:
--   - uno para turnos CON profesional asignado (incluye profesional_id, así que
--     dos profesionales distintas pueden tomar el mismo servicio+horario)
--   - uno para turnos SIN profesional (NULL nunca es "igual" a otro NULL en un
--     índice único de Postgres, así que este caso necesita su propio índice
--     sin la columna, para seguir bloqueando duplicados como antes)
DROP INDEX IF EXISTS idx_turnos_no_overlap;

CREATE UNIQUE INDEX IF NOT EXISTS idx_turnos_no_overlap_con_profesional
    ON turnos (tenant_id, servicio_id, fecha_hora, profesional_id)
    WHERE estado NOT IN ('cancelado') AND profesional_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_turnos_no_overlap_sin_profesional
    ON turnos (tenant_id, servicio_id, fecha_hora)
    WHERE estado NOT IN ('cancelado') AND profesional_id IS NULL;
