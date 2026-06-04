import { NextResponse } from 'next/server';
import { getTenantBySlug } from '@/lib/tenant';
import { supabase } from '@/lib/supabase';

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

    // 1. Obtener tenant
    const tenant = await getTenantBySlug(tenantSlug);
    if (!tenant) return NextResponse.json({ error: 'Estética no encontrada' }, { status: 404 });

    // 2. Horario del día, turnos del día y profesionales activos — en paralelo
    const [horarioRes, turnosRes, profesionalesRes] = await Promise.all([
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
        .gte('fecha_hora', `${fecha}T00:00:00`)
        .lte('fecha_hora', `${fecha}T23:59:59`),
      supabase
        .from('profesionales')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenant.id)
        .eq('activo', true),
    ]);

    const horario = horarioRes.data;
    if (!horario || !horario.activo) return NextResponse.json([]);

    const [aperturaH, aperturaM] = horario.hora_apertura.split(':').map(Number);
    const [cierreH, cierreM]     = horario.hora_cierre.split(':').map(Number);
    const aperturaTotal = aperturaH * 60 + aperturaM;
    const cierreTotal   = cierreH   * 60 + cierreM;

    const turnosDelDia = turnosRes.data ?? [];
    const totalProfesionales = profesionalesRes.count ?? 0;
    const ahora = new Date();
    const esHoy =
      ahora.getFullYear() === year &&
      ahora.getMonth() + 1 === month &&
      ahora.getDate() === day;

    const slots = [];

    for (let minutos = aperturaTotal; minutos + duracion <= cierreTotal; minutos += 30) {
      const slotH = Math.floor(minutos / 60);
      const slotM = minutos % 60;

      // Filtrar horarios pasados si es hoy
      if (esHoy) {
        const slotFecha = new Date(year, month - 1, day, slotH, slotM);
        if (slotFecha <= ahora) continue;
      }

      const slotStart = minutos;
      const slotEnd   = minutos + duracion;

      let ocupado: boolean;

      if (totalProfesionales === 0) {
        // Backward compat: sin profesionales → cualquier turno solapado bloquea el slot
        ocupado = turnosDelDia.some((t: Record<string, unknown>) => {
          const tFecha = new Date(t.fecha_hora as string);
          const tStart = tFecha.getHours() * 60 + tFecha.getMinutes();
          const svc    = t.servicios as { duracion_minutos?: number } | null;
          const tEnd   = tStart + (svc?.duracion_minutos ?? duracion);
          return tStart < slotEnd && tEnd > slotStart;
        });
      } else {
        // Con profesionales: el slot está ocupado solo si todos están reservados
        const turnosSolapados = turnosDelDia.filter((t: Record<string, unknown>) => {
          const tFecha = new Date(t.fecha_hora as string);
          const tStart = tFecha.getHours() * 60 + tFecha.getMinutes();
          const svc    = t.servicios as { duracion_minutos?: number } | null;
          const tEnd   = tStart + (svc?.duracion_minutos ?? duracion);
          return tStart < slotEnd && tEnd > slotStart;
        });
        ocupado = turnosSolapados.length >= totalProfesionales;
      }

      const hh     = slotH.toString().padStart(2, '0');
      const mm     = slotM.toString().padStart(2, '0');
      const hora12 = slotH % 12 || 12;
      const ampm   = slotH < 12 ? 'AM' : 'PM';
      const timeLabel = slotM === 0 ? `${hora12}:00 ${ampm}` : `${hora12}:${mm} ${ampm}`;

      slots.push({ time: timeLabel, timeValue: `${hh}:${mm}`, available: !ocupado });
    }

    return NextResponse.json(slots);
  } catch (err) {
    console.error('[disponibilidad]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
