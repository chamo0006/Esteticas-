import { NextResponse } from 'next/server';
import { getTenantBySlug } from '@/lib/tenant';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

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

  const url = new URL(req.url);
  const fecha    = url.searchParams.get('fecha');
  const hora     = url.searchParams.get('hora');
  const duracion = parseInt(url.searchParams.get('duracion') ?? '60', 10);

  if (!fecha || !hora || profesionales.length === 0) {
    return NextResponse.json(profesionales);
  }

  // Convert Argentine local slot time to UTC epoch ms for comparison
  const slotStartMs = new Date(`${fecha}T${hora}:00-03:00`).getTime();
  const slotEndMs   = slotStartMs + duracion * 60_000;

  // Argentine day boundaries as UTC ISO strings
  const dayStartISO = new Date(`${fecha}T00:00:00-03:00`).toISOString();
  const dayEndISO   = new Date(`${fecha}T23:59:59-03:00`).toISOString();

  // Fetch all non-cancelled turnos for the Argentine day
  const { data: turnos } = await supabase
    .from('turnos')
    .select('profesional_id, fecha_hora, servicios(duracion_minutos)')
    .eq('tenant_id', tenant.id)
    .neq('estado', 'cancelado')
    .gte('fecha_hora', dayStartISO)
    .lte('fecha_hora', dayEndISO);

  const turnosDelDia = turnos ?? [];

  // Determine which professionals have a turno overlapping the requested slot
  const ocupadosIds = new Set(
    turnosDelDia
      .filter((t: Record<string, unknown>) => {
        const tStartMs = new Date(t.fecha_hora as string).getTime();
        const svc      = t.servicios as { duracion_minutos?: number } | null;
        const tEndMs   = tStartMs + (svc?.duracion_minutos ?? 60) * 60_000;
        return tStartMs < slotEndMs && tEndMs > slotStartMs;
      })
      .map((t: Record<string, unknown>) => t.profesional_id)
  );

  const result = profesionales.map((p) => ({
    ...p,
    disponible: !ocupadosIds.has(p.id),
  }));

  return NextResponse.json(result);
}
