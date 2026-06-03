-- Migración: colores personalizados por tenant
-- Ejecutar en Supabase SQL Editor

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS color_primario VARCHAR(7),
  -- Hex color, ej: #FFD1DC — null = usa el tema por defecto
  ADD COLUMN IF NOT EXISTS color_acento   VARCHAR(7);
  -- Hex color, ej: #D4A0A7 — null = usa el tema por defecto

-- logo_url ya existe en la tabla desde el schema original
