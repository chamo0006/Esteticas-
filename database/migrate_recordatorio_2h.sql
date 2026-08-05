-- Recordatorio por email 2 horas antes del turno.
-- Flag para no reenviar el mismo recordatorio en cada corrida del cron externo
-- (que pega cada 15 min, a diferencia del cron diario de Vercel).
ALTER TABLE turnos ADD COLUMN IF NOT EXISTS recordatorio_2h_enviado BOOLEAN NOT NULL DEFAULT FALSE;
