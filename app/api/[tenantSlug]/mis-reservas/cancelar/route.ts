import { NextResponse } from 'next/server';
import { getTenantBySlug } from '@/lib/tenant';
import { supabase } from '@/lib/supabase';
import { rateLimit, getClientIP } from '@/lib/ratelimit';
import { devolverSenaSiCorresponde, dentroDeVentanaCancelacion } from '@/lib/cancelacion';

const soloDigitos = (s: string) => s.replace(/\D/g, '');

// POST /api/[tenantSlug]/mis-reservas/cancelar
// body: { turnoId, telefono, email }
// Cancela la reserva (todos sus turnos) si el email+teléfono coinciden con el
// cliente dueño y estamos dentro de la ventana de cancelación. Devuelve la seña
// de MercadoPago automáticamente según el % de retención del comercio.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;

  const ip = getClientIP(req);
  const { allowed } = rateLimit(`cancelar:${ip}`, 10, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: 'Demasiadas solicitudes, esperá un momento' }, { status: 429 });
  }

  let body: { turnoId?: string; telefono?: string; email?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const turnoId = (body.turnoId ?? '').trim();
  const email = (body.email ?? '').trim().toLowerCase();
  const telDigits = soloDigitos(body.telefono ?? '');
  if (!turnoId || !email || telDigits.length < 6) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
  }

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  // Turno + cliente dueño, para validar identidad.
  const { data: turno } = await supabase
    .from('turnos')
    .select('id, pago_id, fecha_hora, estado, cliente_id, clientes!inner(email, telefono)')
    .eq('id', turnoId)
    .eq('tenant_id', tenant.id)
    .maybeSingle();

  if (!turno) {
    return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 });
  }

  const cliente = (Array.isArray(turno.clientes) ? turno.clientes[0] : turno.clientes) as
    | { email: string; telefono: string | null }
    | undefined;

  // Verifica identidad: email Y teléfono deben coincidir con el dueño de la reserva.
  if (
    !cliente ||
    cliente.email.trim().toLowerCase() !== email ||
    soloDigitos(cliente.telefono ?? '') !== telDigits
  ) {
    return NextResponse.json({ error: 'No pudimos verificar tu reserva' }, { status: 403 });
  }

  if (turno.estado === 'cancelado') {
    return NextResponse.json({ error: 'La reserva ya estaba cancelada' }, { status: 409 });
  }
  if (turno.estado === 'completado') {
    return NextResponse.json({ error: 'La reserva ya fue completada' }, { status: 409 });
  }

  const horasLimite = tenant.horas_limite_cancelacion ?? 0;
  if (!dentroDeVentanaCancelacion(turno.fecha_hora, horasLimite)) {
    const msg = horasLimite > 0
      ? `Solo se puede cancelar hasta ${horasLimite} h antes del turno. Contactá al comercio.`
      : 'El turno ya no se puede cancelar. Contactá al comercio.';
    return NextResponse.json({ error: msg }, { status: 409 });
  }

  // Cancela todos los turnos de esta reserva (misma pago_id) o solo este si es legacy.
  if (turno.pago_id) {
    await supabase
      .from('turnos')
      .update({ estado: 'cancelado' })
      .eq('pago_id', turno.pago_id)
      .neq('estado', 'cancelado');
  } else {
    await supabase.from('turnos').update({ estado: 'cancelado' }).eq('id', turno.id);
  }

  // Devuelve la seña de MercadoPago si corresponde (según % de retención).
  const devolucion = await devolverSenaSiCorresponde(turno.id, tenant.id);

  return NextResponse.json({ ok: true, devolucion });
}
