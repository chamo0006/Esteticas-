-- Migración: agrega columna categoria a servicios (si no existe)
-- Ejecutar una sola vez cuando la tabla ya fue creada sin esa columna.

ALTER TABLE servicios
  ADD COLUMN IF NOT EXISTS categoria VARCHAR(50);
