-- Anticipación mínima con la que un cliente puede reservar un turno (en
-- horas desde "ahora"). 0 = sin restricción (se puede reservar hasta el
-- último minuto, comportamiento de siempre).
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS horas_limite_reserva INTEGER NOT NULL DEFAULT 0;
