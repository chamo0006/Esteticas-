-- ── Vincula cada turno con su pago ───────────────────────────
-- Una reserva puede generar varios turnos consecutivos, pero la tabla
-- `pagos` solo guardaba el turno_id del primero. Sin un vínculo directo,
-- el webhook confirmaba TODOS los turnos pendientes del cliente al aprobar
-- un pago (incluyendo otras reservas impagas). Esta columna permite
-- confirmar únicamente los turnos de la reserva efectivamente pagada.

ALTER TABLE turnos
    ADD COLUMN IF NOT EXISTS pago_id UUID REFERENCES pagos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_turnos_pago ON turnos (pago_id);
