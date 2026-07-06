import { NextResponse } from 'next/server';
import { getTenantBySlug } from '@/lib/tenant';
import { supabase } from '@/lib/supabase';
import { rateLimit, getClientIP } from '@/lib/ratelimit';
import { dentroDeVentanaCancelacion } from '@/lib/cancelacion';

const soloDigitos = (s: string) => s.replace(/\D/g, '');

// POST /api/[tenantSlug]/mis-reservas
// body: { telefono, email }
// Devuelve las reservas próximas del cliente cuyo email Y teléfono coincidan.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;

  // Rate limit para no permitir sondear emails/teléfonos ajenos.
  const ip = getClientIP(req);
  const { allowed } = rateLimit(`mis-reservas:${ip}`, 10, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: 'Demasiadas solicitudes, esperá un momento' }, { status: 429 });
  }

  let body: { telefono?: string; email?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const email = (body.email ?? '').trim().toLowerCase();
  const telDigits = soloDigitos(body.telefono ?? '');
  if (!email || telDigits.length < 6) {
    return NextResponse.json({ error: 'Ingresá tu email y teléfono' }, { status: 400 });
  }

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  // Cliente por tenant + email; luego verificamos que el teléfono también coincida.
  const { data: cliente } = await supabase
    .from('clientes')
    .select('id, telefono, email')
    .eq('tenant_id', tenant.id)
    .ilike('email', email)
    .maybeSingle();

  // Respuesta uniforme si no coincide (no revelamos si el email existe o no).
  if (!cliente || soloDigitos(cliente.telefono ?? '') !== telDigits) {
    return NextResponse.json({ reservas: [] });
  }

  // Turnos próximos y activos de este cliente (no cancelados/completados).
  const desdeISO = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // margen de 1h
  const { data: turnos } = await supabase
    .from('turnos')
    .select(`
      id, pago_id, fecha_hora, estado,
      servicios!inner(nombre, precio),
      profesionales(nombre),
      pagos!turno_id(monto, tipo, metodo, estado)
    `)
    .eq('tenant_id', tenant.id)
    .eq('cliente_id', cliente.id)
    .in('estado', ['pendiente', 'confirmado'])
    .gte('fecha_hora', desdeISO)
    .order('fecha_hora');

  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);
  type Turno = {
    id: string;
    pago_id: string | null;
    fecha_hora: string;
    estado: string;
    servicios: { nombre: string; precio: number } | { nombre: string; precio: number }[] | null;
    profesionales: { nombre: string } | { nombre: string }[] | null;
    pagos: { monto: number; tipo: string; metodo: string; estado: string } | { monto: number; tipo: string; metodo: string; estado: string }[] | null;
  };

  const horasLimite = tenant.horas_limite_cancelacion ?? 0;

  // Agrupamos por reserva. Los turnos de una misma reserva comparten pago_id;
  // los legacy sin pago_id se tratan como reserva individual (por turno).
  const grupos = new Map<string, Turno[]>();
  for (const t of (turnos ?? []) as unknown as Turno[]) {
    const key = t.pago_id ?? `turno:${t.id}`;
    const arr = grupos.get(key) ?? [];
    arr.push(t);
    grupos.set(key, arr);
  }

  const reservas = Array.from(grupos.entries()).map(([key, ts]) => {
    const first = ts[0];
    const pago = one(first.pagos);
    const cancelable =
      (first.estado === 'pendiente' || first.estado === 'confirmado') &&
      dentroDeVentanaCancelacion(first.fecha_hora, horasLimite);
    return {
      id: key,                       // pago_id o turno:<id> (identifica la reserva)
      turnoId: first.id,             // turno de referencia para cancelar
      fechaHora: first.fecha_hora,
      estado: first.estado,
      servicios: ts.map((t) => one(t.servicios)?.nombre).filter(Boolean) as string[],
      total: ts.reduce((sum, t) => sum + Number(one(t.servicios)?.precio ?? 0), 0),
      profesionalNombre: one(first.profesionales)?.nombre ?? null,
      pagoMonto: pago ? Number(pago.monto) : null,
      pagoTipo: pago?.tipo ?? null,
      pagoMetodo: pago?.metodo ?? null,
      pagoEstado: pago?.estado ?? null,
      cancelable,
    };
  });

  reservas.sort((a, b) => new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime());

  return NextResponse.json({ reservas, horasLimite });
}
