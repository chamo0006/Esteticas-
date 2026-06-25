-- ============================================================
-- MIGRACIÓN: Panel Superadmin — Billing, Planes, Roles y Auditoría
-- Motor: PostgreSQL 15+ (Supabase)
-- Idempotente: se puede ejecutar varias veces sin error.
-- Ejecutar en Supabase SQL Editor.
-- ============================================================
--
-- IMPORTANTE — no confundir con la tabla `pagos` ya existente:
--   * `pagos`              = pagos de TURNOS   (cliente  -> comercio)
--   * `pagos_suscripcion`  = facturación SaaS  (comercio -> vos / plataforma)
--
-- Depende de: schema.sql (usa la función set_updated_at() ya creada).
-- ============================================================


-- ============================================================
-- 0) MÓDULOS / RUBROS  (extiende la separación barbería/estética)
-- ------------------------------------------------------------
-- Ya existe tenants.tipo_negocio CHECK ('estetica','barberia').
-- Lo dejamos como está; si en el futuro sumás rubros, reemplazá
-- el CHECK por una FK a esta tabla catálogo (opcional, no obligatorio).
-- ============================================================
CREATE TABLE IF NOT EXISTS rubros (
    slug     VARCHAR(40) PRIMARY KEY,         -- 'estetica', 'barberia', ...
    nombre   VARCHAR(80) NOT NULL,
    icono    VARCHAR(40),
    activo   BOOLEAN NOT NULL DEFAULT TRUE,
    orden    INTEGER NOT NULL DEFAULT 0
);

INSERT INTO rubros (slug, nombre, icono, orden) VALUES
    ('estetica', 'Estéticas',  'sparkles',  1),
    ('barberia', 'Barberías',  'scissors',  2)
ON CONFLICT (slug) DO NOTHING;


-- ============================================================
-- 1) PLANES  (catálogo: Básico / Pro / Pro+)
-- ============================================================
CREATE TABLE IF NOT EXISTS planes (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug              VARCHAR(50) NOT NULL UNIQUE,
    nombre            VARCHAR(100) NOT NULL,
    descripcion       TEXT,
    precio_mensual    NUMERIC(10,2) NOT NULL CHECK (precio_mensual >= 0),
    precio_anual      NUMERIC(10,2) CHECK (precio_anual >= 0),
    max_profesionales INTEGER,            -- NULL = ilimitado
    max_servicios     INTEGER,            -- NULL = ilimitado
    features          JSONB NOT NULL DEFAULT '[]'::jsonb,
    activo            BOOLEAN NOT NULL DEFAULT TRUE,
    orden             INTEGER NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_planes_updated_at ON planes;
CREATE TRIGGER trg_planes_updated_at
BEFORE UPDATE ON planes
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Seed alineado con los precios de la landing (app/page.tsx)
INSERT INTO planes (slug, nombre, descripcion, precio_mensual, precio_anual, max_profesionales, orden, features) VALUES
    ('basico',  'Básico', 'Para empezar con el pie derecho', 29999, 299990, 1,    1,
        '["Hasta 1 profesional","Reservas online 24/7","Calendario de turnos","Gestión de clientes","Página personalizada con tu marca","Soporte por WhatsApp"]'::jsonb),
    ('pro',     'Pro',    'El plan completo para tu estética', 49999, 499990, 5,    2,
        '["Todo lo del Básico","Hasta 5 profesionales","Recordatorios automáticos","Gestión de empleados","Señas online con Mercado Pago","Estadísticas avanzadas","Historial completo de clientes","Soporte prioritario"]'::jsonb),
    ('proplus', 'Pro+',   'Para centros con múltiples locales', 79999, 799990, NULL, 3,
        '["Todo lo de Pro","Múltiples locales","Reportes avanzados exportables","Manager de cuenta dedicado","API prioritaria"]'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- Corrección de precios para instalaciones existentes (el INSERT de arriba no actualiza por ON CONFLICT DO NOTHING)
UPDATE planes SET precio_mensual = 29999, precio_anual = 299990, max_profesionales = 1    WHERE slug = 'basico';
UPDATE planes SET precio_mensual = 49999, precio_anual = 499990, max_profesionales = 5    WHERE slug = 'pro';
UPDATE planes SET precio_mensual = 79999, precio_anual = 799990, max_profesionales = NULL WHERE slug = 'proplus';


-- ============================================================
-- 2) SUSCRIPCIONES  (1 fila por tenant = su estado de cuenta actual)
--    Cubre: vencimientos (semáforo), corte de servicio, plan,
--    y excepciones manuales (descuentos / días gratis).
-- ============================================================
CREATE TABLE IF NOT EXISTS suscripciones (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id            UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
    plan_id              UUID REFERENCES planes(id),
    estado               VARCHAR(20) NOT NULL DEFAULT 'trial',
    ciclo                VARCHAR(10) NOT NULL DEFAULT 'mensual',

    -- Excepciones / tarifas a medida ----------------------------------
    precio_acordado      NUMERIC(10,2) CHECK (precio_acordado >= 0),  -- override del precio del plan
    descuento_porcentaje NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (descuento_porcentaje BETWEEN 0 AND 100),
    descuento_motivo     TEXT,

    -- Vigencia / vencimiento (para el semáforo) -----------------------
    fecha_inicio         DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_fin            DATE,                              -- próximo vencimiento; NULL = sin límite
    dias_gracia          INTEGER NOT NULL DEFAULT 5 CHECK (dias_gracia >= 0),
    dias_bonus           INTEGER NOT NULL DEFAULT 0,        -- días gratis otorgados manualmente

    -- Corte de servicio automático -----------------------------------
    bloqueado            BOOLEAN NOT NULL DEFAULT FALSE,
    bloqueado_at         TIMESTAMPTZ,
    bloqueo_motivo       TEXT,

    notas                TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_estado_suscripcion CHECK (estado IN ('trial','activa','vencida','suspendida','cancelada')),
    CONSTRAINT chk_ciclo_suscripcion  CHECK (ciclo  IN ('mensual','anual'))
);

CREATE INDEX IF NOT EXISTS idx_suscripciones_estado    ON suscripciones (estado);
CREATE INDEX IF NOT EXISTS idx_suscripciones_fecha_fin ON suscripciones (fecha_fin);
CREATE INDEX IF NOT EXISTS idx_suscripciones_plan      ON suscripciones (plan_id);

DROP TRIGGER IF EXISTS trg_suscripciones_updated_at ON suscripciones;
CREATE TRIGGER trg_suscripciones_updated_at
BEFORE UPDATE ON suscripciones
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Backfill: crea una suscripción trial (14 días) para cada tenant existente sin suscripción
INSERT INTO suscripciones (tenant_id, plan_id, estado, fecha_inicio, fecha_fin)
SELECT t.id,
       (SELECT id FROM planes WHERE slug = 'basico'),
       'trial',
       CURRENT_DATE,
       CURRENT_DATE + 14
FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM suscripciones s WHERE s.tenant_id = t.id)
ON CONFLICT (tenant_id) DO NOTHING;


-- ============================================================
-- 3) PAGOS DE SUSCRIPCIÓN  (historial de facturación de la plataforma)
-- ============================================================
CREATE TABLE IF NOT EXISTS pagos_suscripcion (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    suscripcion_id      UUID REFERENCES suscripciones(id) ON DELETE SET NULL,
    plan_id             UUID REFERENCES planes(id),        -- snapshot del plan cobrado
    monto               NUMERIC(10,2) NOT NULL CHECK (monto >= 0),
    metodo              VARCHAR(20) NOT NULL,
    estado              VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    periodo_inicio      DATE,                              -- período que cubre este pago
    periodo_fin         DATE,
    fecha_vencimiento   DATE,
    fecha_pago          TIMESTAMPTZ,                       -- NULL hasta que se acredita
    referencia_externa  TEXT,                              -- id de Mercado Pago / nº transferencia
    comprobante_url     TEXT,
    notas               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_metodo_suscripcion       CHECK (metodo IN ('mercadopago','transferencia','efectivo','tarjeta','otro')),
    CONSTRAINT chk_estado_pago_suscripcion  CHECK (estado IN ('aprobado','pendiente','vencido','rechazado'))
);

CREATE INDEX IF NOT EXISTS idx_pagos_susc_tenant ON pagos_suscripcion (tenant_id);
CREATE INDEX IF NOT EXISTS idx_pagos_susc_estado ON pagos_suscripcion (estado);
CREATE INDEX IF NOT EXISTS idx_pagos_susc_fecha  ON pagos_suscripcion (fecha_pago);


-- ============================================================
-- 4) PLATFORM ADMINS  (usuarios del panel Superadmin, GLOBALES)
--    Reemplaza el login por env var (SUPERADMIN_PASSWORD).
--    Roles: superadmin (todo) | finanzas (ve billing) | soporte (NO ve billing)
-- ============================================================
CREATE TABLE IF NOT EXISTS platform_admins (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre        VARCHAR(255) NOT NULL,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    rol           VARCHAR(20) NOT NULL DEFAULT 'soporte',
    activo        BOOLEAN NOT NULL DEFAULT TRUE,
    ultimo_acceso TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_rol_platform CHECK (rol IN ('superadmin','soporte','finanzas'))
);

-- Sembrá tu primer superadmin (generá el hash con bcrypt y descomentá):
-- INSERT INTO platform_admins (nombre, email, password_hash, rol)
-- VALUES ('Agustín', 'aguschamorro21@gmail.com', '$2b$10$...hash...', 'superadmin')
-- ON CONFLICT (email) DO NOTHING;


-- ============================================================
-- 5) AUDITORÍA  (login, impersonate, bloqueos, registro de pagos...)
-- ============================================================
CREATE TABLE IF NOT EXISTS superadmin_logs (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform_admin_id UUID REFERENCES platform_admins(id) ON DELETE SET NULL,
    accion            VARCHAR(50) NOT NULL,    -- 'login','impersonate','bloqueo_tenant','registrar_pago',...
    tenant_id         UUID REFERENCES tenants(id) ON DELETE SET NULL,  -- tenant afectado (si aplica)
    detalle           JSONB,
    ip                INET,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_superadmin_logs_admin  ON superadmin_logs (platform_admin_id);
CREATE INDEX IF NOT EXISTS idx_superadmin_logs_tenant ON superadmin_logs (tenant_id);
CREATE INDEX IF NOT EXISTS idx_superadmin_logs_accion ON superadmin_logs (accion, created_at);


-- ============================================================
-- 6) VISTA DE MÉTRICAS POR TENANT  (dashboard + ranking "Top comercios")
--    Usa subconsultas escalares a propósito: evita el "fan-out"
--    (multiplicación de filas) que daría JOIN turnos + JOIN pagos juntos.
-- ============================================================
CREATE OR REPLACE VIEW vista_metricas_tenant AS
SELECT
    t.id                          AS tenant_id,
    t.nombre,
    t.slug,
    t.tipo_negocio,
    t.activo,
    s.estado                      AS estado_suscripcion,
    s.fecha_fin                   AS vencimiento,
    s.fecha_fin + s.dias_gracia   AS vencimiento_con_gracia,
    s.bloqueado,
    (s.fecha_fin - CURRENT_DATE)  AS dias_para_vencer,   -- negativo = vencido
    (SELECT COUNT(*) FROM turnos tu WHERE tu.tenant_id = t.id)                                       AS turnos_total,
    (SELECT COUNT(*) FROM turnos tu WHERE tu.tenant_id = t.id AND tu.estado = 'completado')          AS turnos_completados,
    (SELECT COUNT(*) FROM turnos tu WHERE tu.tenant_id = t.id AND tu.estado = 'cancelado')           AS turnos_cancelados,
    (SELECT COUNT(*) FROM turnos tu WHERE tu.tenant_id = t.id AND tu.estado IN ('pendiente','confirmado')) AS turnos_activos,
    (SELECT COALESCE(SUM(p.monto),0) FROM pagos p WHERE p.tenant_id = t.id AND p.estado = 'acreditado')    AS dinero_movido
FROM tenants t
LEFT JOIN suscripciones s ON s.tenant_id = t.id;

-- Ejemplos de uso:
--   Top 10 comercios por turnos:
--     SELECT nombre, turnos_total FROM vista_metricas_tenant ORDER BY turnos_total DESC LIMIT 10;
--   Semáforo de vencimientos:
--     SELECT nombre, dias_para_vencer FROM vista_metricas_tenant
--     WHERE estado_suscripcion IN ('trial','activa') ORDER BY dias_para_vencer ASC;
