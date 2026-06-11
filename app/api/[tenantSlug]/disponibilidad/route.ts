import { NextResponse } from 'next/server';
import { getTenantBySlug } from '@/lib/tenant';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Argentina is UTC-3 (no DST)
const AR_OFFSET_MS = -3 * 60 * 60 * 1000;

// GET /api/[tenantSlug]/disponibilidad?fecha=2026-06-10&duracion=60
export async function GET(
  req: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;
  const url = new URL(req.url);
  const fecha = url.searchParams.get('fecha');
  const duracion = parseInt(url.searchParams.get('duracion') ?? '60', 10);

  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return NextResponse.json({ error: 'Parámetro fecha requerido (YYYY-MM-DD)' }, { status: 400 });
  }

  try {
    const [year, month, day] = fecha.split('-').map(Number);
    const diaSemana = new Date(year, month - 1, day).getDay();

    const tenant = await getTenantBySlug(tenantSlug);
    if (!tenant) return NextResponse.json({ error: 'Estética no encontrada' }, { status: 404 });

    // Argentine day boundaries as UTC ISO strings
    const dayStartISO = new Date(`${fecha}T00:00:00-03:00`).toISOString();
    const dayEndISO   = new Date(`${fecha}T23:59:59-03:00`).toISOString();

    const [horarioRes, turnosRes, profesionalesRes, bloqueadoRes] = await Promise.all([
      supabase
        .from('horarios_tenant')
        .select('hora_apertura, hora_cierre, activo')
        .eq('tenant_id', tenant.id)
        .eq('dia_semana', diaSemana)
        .single(),
      supabase
        .from('turnos')
        .select('fecha_hora, profesional_id, servicios(duracion_minutos)')
        .eq('tenant_id', tenant.id)
        .neq('estado', 'cancelado')
        .gte('fecha_hora', dayStartISO)
        .lte('fecha_hora', dayEndISO),
      supabase
        .from('profesionales')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenant.id)
        .eq('activo', true),
      supabase
        .from('dias_bloqueados')
        .select('id')
        .eq('tenant_id', tenant.id)
        .eq('fecha', fecha)
        .limit(1),
    ]);

    // Día marcado como bloqueado (vacaciones / feriado) → sin turnos disponibles
    if ((bloqueadoRes.data ?? []).length > 0) return NextResponse.json([]);

    const horario = horarioRes.data;
    if (!horario || !horario.activo) return NextResponse.json([]);

    const [aperturaH, aperturaM] = horario.hora_apertura.split(':').map(Number);
    const [cierreH, cierreM]     = horario.hora_cierre.split(':').map(Number);
    const aperturaTotal = aperturaH * 60 + aperturaM;
    const cierreTotal   = cierreH   * 60 + cierreM;

    const turnosDelDia = turnosRes.data ?? [];
    const totalProfesionales = profesionalesRes.count ?? 0;

    // Compute "today" in Argentine timezone to correctly filter past slots
    const ahoraMs = Date.now();
    const ahoraLocal = new Date(ahoraMs + AR_OFFSET_MS); // shift to Argentine time
    const esHoy =
      ahoraLocal.getUTCFullYear() === year &&
      ahoraLocal.getUTCMonth() + 1 === month &&
      ahoraLocal.getUTCDate() === day;

    const slots = [];

    for (let minutos = aperturaTotal; minutos + duracion <= cierreTotal; minutos += 30) {
      const slotH = Math.floor(minutos / 60);
      const slotM = minutos % 60;
      const hh = slotH.toString().padStart(2, '0');
      const mm = slotM.toString().padStart(2, '0');

      // Convert Argentine local slot time to UTC epoch ms for comparison
      const slotStartMs = new Date(`${fecha}T${hh}:${mm}:00-03:00`).getTime();
      const slotEndMs   = slotStartMs + duracion * 60_000;

      // Skip slots that are already past (compare UTC epochs, timezone-agnostic)
      if (esHoy && slotStartMs <= ahoraMs) continue;

      let ocupado: boolean;

      if (totalProfesionales === 0) {
        // No professional management: any overlap blocks the slot
        ocupado = turnosDelDia.some((t: Record<string, unknown>) => {
          const tStartMs = new Date(t.fecha_hora as string).getTime();
          const svc      = t.servicios as { duracion_minutos?: number } | null;
          const tEndMs   = tStartMs + (svc?.duracion_minutos ?? duracion) * 60_000;
          return tStartMs < slotEndMs && tEndMs > slotStartMs;
        });
      } else {
        // With professionals: slot is full only when all are booked
        const solapados = turnosDelDia.filter((t: Record<string, unknown>) => {
          const tStartMs = new Date(t.fecha_hora as string).getTime();
          const svc      = t.servicios as { duracion_minutos?: number } | null;
          const tEndMs   = tStartMs + (svc?.duracion_minutos ?? duracion) * 60_000;
          return tStartMs < slotEndMs && tEndMs > slotStartMs;
        });
        ocupado = solapados.length >= totalProfesionales;
      }

      const hora12    = slotH % 12 || 12;
      const ampm      = slotH < 12 ? 'AM' : 'PM';
      const timeLabel = slotM === 0 ? `${hora12}:00 ${ampm}` : `${hora12}:${mm} ${ampm}`;

      slots.push({ time: timeLabel, timeValue: `${hh}:${mm}`, available: !ocupado });
    }

    return NextResponse.json(slots);
  } catch (err) {
    console.error('[disponibilidad]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
