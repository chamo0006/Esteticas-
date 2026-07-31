-- Apariencia avanzada del sitio de reservas (solo estéticas).
-- Objeto JSON con preset, colores granulares, tipografía, layout y bordes/sombras.
-- NULL = usar el preset Sora por defecto (y, si existen, color_primario/color_acento).
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS apariencia JSONB;
