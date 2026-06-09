import { NextResponse } from 'next/server';
import { getTenantBySlug } from '@/lib/tenant';
import { supabase } from '@/lib/supabase';

// GET /api/[tenantSlug]/profesionales
// Opcional: ?fecha=YYYY-MM-DD&hora=HH:MM&duracion=60
// Con los params opcionales devuelve { id, nombre, disponible: boolean }
export async function GET(
  req: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) return NextResponse.json([], { status: 200 });

  const { data } = await supabase
    .from('profesionales')
    .select('id, nombre')
    .eq('tenant_id', tenant.id)
    .eq('activo', true)
    .order('nombre');

  const profesionales = data ?? [];

  // Si se pasan fecha+hora+duracion, calcular disponibilidad individual
  const url = new URL(req.url);
  const fecha    = url.searchParams.get('fecha');
  const hora     = url.searchParams.get('hora');
  const duracion = parseInt(url.searchParams.get('duracion') ?? '60', 10);

  if (!fecha || !hora || profesionales.length === 0) {
    return NextResponse.json(profesionales);
  }

  const [hh, mm] = hora.split(':').map(Number);
  const slotStart = hh * 60 + mm;
  const slotEnd   = slotStart + duracion;

  // Traer turnos del día que no estén cancelados
  const { data: turnos } = await supabase
    .from('turnos')
    .select('profesional_id, fecha_hora, servicios(duracion_minutos)')
    .eq('tenant_id', tenant.id)
    .neq('estado', 'cancelado')
    .gte('fecha_hora', `${fecha}T00:00:00`)
    .lte('fecha_hora', `${fecha}T23:59:59`);

  const turnosDelDia = turnos ?? [];

  // Determinar qué profesionales tienen turno solapado con el slot
  const ocupadosIds = new Set(
    turnosDelDia
      .filter((t: Record<string, unknown>) => {
        const d = new Date(t.fecha_hora as string);
        const tStart = d.getHours() * 60 + d.getMinutes();
        const svc = t.servicios as { duracion_minutos?: number } | null;
        const tEnd = tStart + (svc?.duracion_minutos ?? 60);
        return tStart < slotEnd && tEnd > slotStart;
      })
      .map((t: Record<string, unknown>) => t.profesional_id)
  );

  const result = profesionales.map((p) => ({
    ...p,
    disponible: !ocupadosIds.has(p.id),
  }));

  return NextResponse.json(result);
}
