-- ============================================================
-- SCHEMA: SaaS Multi-tenant — Plataforma de Reservas Estéticas
-- Motor: PostgreSQL 15+
-- Idempotente: se puede ejecutar varias veces sin error
-- ============================================================

-- ── TENANTS ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tenants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug            VARCHAR(100) NOT NULL UNIQUE,
    nombre          VARCHAR(255) NOT NULL,
    email_contacto  VARCHAR(255) NOT NULL,
    telefono        VARCHAR(30),
    logo_url        TEXT,
    activo          BOOLEAN NOT NULL DEFAULT TRUE,

    exige_sena          BOOLEAN NOT NULL DEFAULT FALSE,
    porcentaje_sena     NUMERIC(5,2) CHECK (porcentaje_sena BETWEEN 0 AND 100),
    permite_efectivo    BOOLEAN NOT NULL DEFAULT TRUE,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_slug ON tenants (slug);

-- ── USUARIOS ADMIN ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS usuarios_admin (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    nombre        VARCHAR(255) NOT NULL,
    email         VARCHAR(255) NOT NULL,
    password_hash TEXT NOT NULL,
    rol           VARCHAR(50) NOT NULL DEFAULT 'admin',
    activo        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_rol_valido CHECK (rol IN ('admin', 'staff'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_email_tenant ON usuarios_admin (email, tenant_id);
CREATE INDEX        IF NOT EXISTS idx_admin_tenant        ON usuarios_admin (tenant_id);

-- ── SERVICIOS ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS servicios (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    nombre            VARCHAR(255) NOT NULL,
    descripcion       TEXT,
    duracion_minutos  INTEGER NOT NULL CHECK (duracion_minutos > 0),
    precio            NUMERIC(10,2) NOT NULL CHECK (precio >= 0),
    categoria         VARCHAR(50),
    activo            BOOLEAN NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_servicios_tenant ON servicios (tenant_id) WHERE activo = TRUE;

-- ── CLIENTES ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS clientes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    nombre      VARCHAR(255) NOT NULL,
    telefono    VARCHAR(30),
    email       VARCHAR(255),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clientes_tenant       ON clientes (tenant_id);
CREATE INDEX IF NOT EXISTS idx_clientes_email_tenant ON clientes (email, tenant_id) WHERE email IS NOT NULL;

-- ── TURNOS ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS turnos (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    cliente_id   UUID NOT NULL REFERENCES clientes(id),
    servicio_id  UUID NOT NULL REFERENCES servicios(id),
    fecha_hora   TIMESTAMPTZ NOT NULL,
    estado       VARCHAR(30) NOT NULL DEFAULT 'pendiente',
    notas        TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_estado_turno CHECK (
        estado IN ('pendiente', 'confirmado', 'completado', 'cancelado')
    )
);

CREATE INDEX        IF NOT EXISTS idx_turnos_tenant_fecha ON turnos (tenant_id, fecha_hora);
CREATE INDEX        IF NOT EXISTS idx_turnos_cliente      ON turnos (cliente_id);
CREATE INDEX        IF NOT EXISTS idx_turnos_estado       ON turnos (tenant_id, estado);
CREATE UNIQUE INDEX IF NOT EXISTS idx_turnos_no_overlap
    ON turnos (tenant_id, servicio_id, fecha_hora)
    WHERE estado NOT IN ('cancelado');

-- ── PAGOS ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pagos (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    turno_id            UUID NOT NULL REFERENCES turnos(id) ON DELETE CASCADE,
    tipo                VARCHAR(30) NOT NULL,
    metodo              VARCHAR(30) NOT NULL,
    monto               NUMERIC(10,2) NOT NULL CHECK (monto > 0),
    estado              VARCHAR(30) NOT NULL DEFAULT 'pendiente',
    referencia_externa  TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_tipo_pago   CHECK (tipo   IN ('total', 'sena', 'saldo_restante')),
    CONSTRAINT chk_metodo_pago CHECK (metodo IN ('efectivo', 'transferencia', 'tarjeta', 'mercadopago')),
    CONSTRAINT chk_estado_pago CHECK (estado IN ('pendiente', 'acreditado', 'rechazado', 'reembolsado'))
);

CREATE INDEX IF NOT EXISTS idx_pagos_turno  ON pagos (turno_id);
CREATE INDEX IF NOT EXISTS idx_pagos_tenant ON pagos (tenant_id);

-- ── TRIGGER: updated_at automático en tenants ─────────────────
-- CREATE OR REPLACE no necesita IF NOT EXISTS

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tenants_updated_at ON tenants;
CREATE TRIGGER trg_tenants_updated_at
BEFORE UPDATE ON tenants
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
