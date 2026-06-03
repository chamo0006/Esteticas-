-- ============================================================
-- SEED: datos de ejemplo para desarrollo
-- Ejecutar DESPUÉS de schema.sql
-- ============================================================

-- ── Tenant de ejemplo ────────────────────────────────────────

INSERT INTO tenants (
    id,
    slug,
    nombre,
    email_contacto,
    telefono,
    activo,
    exige_sena,
    porcentaje_sena,
    permite_efectivo
) VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'estetica-bella',
    'Estética Bella',
    'contacto@esteticabella.com',
    '+54 11 5555-1234',
    TRUE,
    TRUE,
    30,      -- exige 30% de seña
    TRUE
);

-- ── Servicios ────────────────────────────────────────────────

INSERT INTO servicios (tenant_id, nombre, descripcion, duracion_minutos, precio, categoria) VALUES
(
    'a0000000-0000-0000-0000-000000000001',
    'Acri Soft',
    'Uñas acrílicas con terminación soft y natural. Incluye diseño base.',
    45, 8500, 'nails'
),
(
    'a0000000-0000-0000-0000-000000000001',
    'Semi Permanente',
    'Esmalte semipermanente de larga duración, hasta 3 semanas sin astillarse.',
    60, 12000, 'nails'
),
(
    'a0000000-0000-0000-0000-000000000001',
    'Manicura Tradicional',
    'Limado, cutículas y esmalte tradicional.',
    30, 5500, 'nails'
),
(
    'a0000000-0000-0000-0000-000000000001',
    'Lifting de Pestañas',
    'Efecto rizador permanente que abre la mirada sin extensiones.',
    50, 9500, 'lashes'
),
(
    'a0000000-0000-0000-0000-000000000001',
    'Extensiones Clásicas',
    'Extensiones pelo a pelo para una mirada natural y definida.',
    90, 15000, 'lashes'
),
(
    'a0000000-0000-0000-0000-000000000001',
    'Tinte de Pestañas',
    'Color negro intenso de larga duración, ideal para rubias y pelirrojas.',
    20, 3500, 'lashes'
),
(
    'a0000000-0000-0000-0000-000000000001',
    'Perfilado de Cejas',
    'Diseño y depilación para enmarcar tu mirada.',
    30, 4500, 'brows'
),
(
    'a0000000-0000-0000-0000-000000000001',
    'Laminado de Cejas',
    'Técnica que alisa y fija los pelos para un efecto peinado todo el día.',
    40, 7000, 'brows'
);

-- ── Admin de ejemplo ─────────────────────────────────────────
-- password: "admin123" (bcrypt hash de ejemplo — reemplazar en producción)

INSERT INTO usuarios_admin (tenant_id, nombre, email, password_hash, rol) VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'Admin Bella',
    'admin@esteticabella.com',
    '$2b$10$examplehashnotforproductionuse1234567890abcdefghijklm',
    'admin'
);
