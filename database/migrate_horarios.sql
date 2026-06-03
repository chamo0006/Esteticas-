-- Migración: horarios de atención y días bloqueados
-- Ejecutar en Supabase SQL Editor

-- Horarios por día de semana
CREATE TABLE IF NOT EXISTS horarios_tenant (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    dia_semana    INTEGER NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
    -- 0=Domingo, 1=Lunes, 2=Martes, 3=Miércoles, 4=Jueves, 5=Viernes, 6=Sábado
    hora_apertura TIME NOT NULL DEFAULT '09:00',
    hora_cierre   TIME NOT NULL DEFAULT '18:00',
    activo        BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (tenant_id, dia_semana)
);

CREATE INDEX IF NOT EXISTS idx_horarios_tenant ON horarios_tenant (tenant_id);

-- Días bloqueados (vacaciones, feriados, etc.)
CREATE TABLE IF NOT EXISTS dias_bloqueados (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    fecha     DATE NOT NULL,
    motivo    VARCHAR(255),
    UNIQUE (tenant_id, fecha)
);

CREATE INDEX IF NOT EXISTS idx_dias_bloqueados_tenant ON dias_bloqueados (tenant_id, fecha);

-- Seed horarios default para el tenant de ejemplo (Lun-Sáb, 9-18)
INSERT INTO horarios_tenant (tenant_id, dia_semana, hora_apertura, hora_cierre, activo)
SELECT 'a0000000-0000-0000-0000-000000000001', d, '09:00', '18:00',
       CASE WHEN d = 0 THEN FALSE ELSE TRUE END  -- Domingo cerrado
FROM generate_series(0, 6) AS d
ON CONFLICT (tenant_id, dia_semana) DO NOTHING;
