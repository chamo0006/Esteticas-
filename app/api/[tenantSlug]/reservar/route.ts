import { NextResponse } from 'next/server';
import { getTenantBySlug } from '@/lib/tenant';
import { reservarSchema } from '@/lib/schemas';
import { rateLimit, getClientIP } from '@/lib/ratelimit';
import { enviarConfirmacionCliente, enviarNotificacionAdmin } from '@/lib/email';
import { supabase } from '@/lib/supabase';

const MONTHS   = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const WEEKDAYS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

function formatFechaEmail(dt: Date) {
  return `${WEEKDAYS[dt.getDay()]} ${dt.getDate()} de ${MONTHS[dt.getMonth()]} de ${dt.getFullYear()}`;
}
function formatHoraEmail(dt: Date) {
  return `${dt.getHours().toString().padStart(2,'0')}:${dt.getMinutes().toString().padStart(2,'0')}`;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;

  // ── Rate limiting: 5 reservas por IP por minuto ───────────────────────────
  const ip = getClientIP(req);
  const { allowed } = rateLimit(`reservar:${ip}`, 5, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: 'Demasiadas solicitudes, esperá un momento' }, { status: 429 });
  }

  // ── Validación con Zod ────────────────────────────────────────────────────
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const parsed = reservarSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', detalles: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { servicioIds, fechaHora, cliente, metodoPago } = parsed.data;
  const raw = body as Record<string, unknown>;
  const profesionalIdReq = typeof raw.profesionalId === 'string' ? raw.profesionalId : null;

  // ── Tenant ────────────────────────────────────────────────────────────────
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) return NextResponse.json({ error: 'Estética no encontrada' }, { status: 404 });

  if (metodoPago === 'efectivo' && !tenant.permite_efectivo) {
    return NextResponse.json({ error: 'Efectivo no habilitado en esta estética' }, { status: 400 });
  }

  // ── Servicios ─────────────────────────────────────────────────────────────
  const { data: serviciosData, error: serviciosError } = await supabase
    .from('servicios')
    .select('id, duracion_minutos, precio, nombre')
    .in('id', servicioIds)
    .eq('tenant_id', tenant.id)
    .eq('activo', true);

  if (serviciosError || !serviciosData || serviciosData.length !== servicioIds.length) {
    return NextResponse.json({ error: 'Uno o más servicios no válidos' }, { status: 400 });
  }

  const servicios = servicioIds.map((id) =>
    serviciosData.find((s) => s.id === id)!
  );

  const totalMonto = servicios.reduce((sum, s) => sum + Number(s.precio), 0);
  const montoAPagar =
    tenant.exige_sena && tenant.porcentaje_sena
      ? Math.round((totalMonto * tenant.porcentaje_sena) / 100 * 100) / 100
      : totalMonto;
  const tipoPago = tenant.exige_sena ? 'sena' : 'total';

  // ── Crea cliente ──────────────────────────────────────────────────────────
  const { data: clienteData, error: clienteError } = await supabase
    .from('clientes')
    .insert({
      tenant_id: tenant.id,
      nombre: `${cliente.nombre} ${cliente.apellido}`.trim(),
      email: cliente.email,
      telefono: cliente.telefono,
    })
    .select('id')
    .single();

  if (clienteError || !clienteData) {
    console.error('[reservar] error creando cliente:', clienteError);
    return NextResponse.json({ error: 'Error al crear la reserva' }, { status: 500 });
  }
  const clienteId = clienteData.id;

  // ── Obtener profesionales activos para asignar ────────────────────────────
  const { data: profesionalesData } = await supabase
    .from('profesionales')
    .select('id')
    .eq('tenant_id', tenant.id)
    .eq('activo', true)
    .order('created_at');

  const profesionales = profesionalesData ?? [];

  // ── Crea turnos consecutivos ──────────────────────────────────────────────
  const turnoIds: string[] = [];
  let currentTime = new Date(fechaHora);

  for (const servicio of servicios) {
    let profesionalId: string | null = null;

    if (profesionales.length > 0) {
      const slotStartMs = currentTime.getTime();
      const slotEndMs   = slotStartMs + servicio.duracion_minutos * 60_000;

      // Look back up to 4 hours to catch turnos that started before this slot but overlap
      const lookbackISO = new Date(slotStartMs - 4 * 60 * 60_000).toISOString();
      const slotEndISO  = new Date(slotEndMs).toISOString();

      const { data: ocupadosData } = await supabase
        .from('turnos')
        .select('profesional_id, fecha_hora, servicios(duracion_minutos)')
        .eq('tenant_id', tenant.id)
        .not('profesional_id', 'is', null)
        .neq('estado', 'cancelado')
        .lt('fecha_hora', slotEndISO)
        .gte('fecha_hora', lookbackISO);

      // Filter in JS for actual overlap (catches turnos that started before our slot)
      const ocupadosIds = new Set(
        (ocupadosData ?? [])
          .filter((t: { profesional_id: string | null; fecha_hora: string; servicios: { duracion_minutos?: number } | null }) => {
            const tStartMs = new Date(t.fecha_hora).getTime();
            const tEndMs   = tStartMs + (t.servicios?.duracion_minutos ?? servicio.duracion_minutos) * 60_000;
            return tStartMs < slotEndMs && tEndMs > slotStartMs;
          })
          .map((t: { profesional_id: string | null }) => t.profesional_id)
      );

      if (profesionalIdReq && profesionales.some((p: { id: string }) => p.id === profesionalIdReq)) {
        // Client requested a specific professional — reject if they're busy
        if (ocupadosIds.has(profesionalIdReq)) {
          return NextResponse.json(
            { error: 'La profesional elegida ya tiene turno en ese horario' },
            { status: 409 }
          );
        }
        profesionalId = profesionalIdReq;
      } else {
        const libre = profesionales.find((p: { id: string }) => !ocupadosIds.has(p.id));
        if (!libre) {
          return NextResponse.json(
            { error: 'No hay profesionales disponibles en ese horario' },
            { status: 409 }
          );
        }
        profesionalId = libre.id;
      }
    }

    const { data: turnoData, error: turnoError } = await supabase
      .from('turnos')
      .insert({
        tenant_id: tenant.id,
        cliente_id: clienteId,
        servicio_id: servicio.id,
        fecha_hora: currentTime.toISOString(),
        estado: 'pendiente',
        ...(profesionalId ? { profesional_id: profesionalId } : {}),
      })
      .select('id')
      .single();

    if (turnoError || !turnoData) {
      console.error('[reservar] error creando turno:', turnoError);
      // Best-effort cleanup: delete previously created turnos and the cliente
      if (turnoIds.length > 0) {
        await supabase.from('turnos').delete().in('id', turnoIds);
      }
      await supabase.from('clientes').delete().eq('id', clienteId);
      return NextResponse.json({ error: 'Error al crear la reserva' }, { status: 500 });
    }

    turnoIds.push(turnoData.id);
    currentTime = new Date(currentTime.getTime() + servicio.duracion_minutos * 60_000);
  }

  // ── Crea pago ─────────────────────────────────────────────────────────────
  const { data: pagoData, error: pagoError } = await supabase
    .from('pagos')
    .insert({
      tenant_id: tenant.id,
      turno_id: turnoIds[0],
      tipo: tipoPago,
      metodo: metodoPago,
      monto: montoAPagar,
      estado: 'pendiente',
    })
    .select('id')
    .single();

  if (pagoError || !pagoData) {
    console.error('[reservar] error creando pago:', pagoError);
    await supabase.from('turnos').delete().in('id', turnoIds);
    await supabase.from('clientes').delete().eq('id', clienteId);
    return NextResponse.json({ error: 'Error al crear la reserva' }, { status: 500 });
  }

  // ── Emails (no bloquean la respuesta) ─────────────────────────────────────
  const fechaDt = new Date(fechaHora);
  const emailData = {
    tenantNombre: tenant.nombre,
    clienteNombre: `${cliente.nombre} ${cliente.apellido}`.trim(),
    servicios: servicios.map((s) => s.nombre),
    fecha: formatFechaEmail(fechaDt),
    hora: formatHoraEmail(fechaDt),
    monto: montoAPagar,
    tipo: tipoPago as 'total' | 'sena',
    metodo: metodoPago,
    turnoId: turnoIds[0],
  };

  enviarConfirmacionCliente(cliente.email, emailData).catch(console.error);

  (async () => {
    try {
      const { data } = await supabase
        .from('usuarios_admin')
        .select('email')
        .eq('tenant_id', tenant.id)
        .eq('activo', true)
        .limit(1)
        .single();
      if (data?.email) {
        await enviarNotificacionAdmin(data.email, emailData);
      }
    } catch (err) {
      console.error(err);
    }
  })();

  return NextResponse.json({
    turnoIds,
    pagoId: pagoData.id,
    monto: montoAPagar,
    tipo: tipoPago,
  });
}
