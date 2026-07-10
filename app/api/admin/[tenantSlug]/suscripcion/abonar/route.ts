import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { crearPreferenciaPagoUnico } from '@/lib/mercadopago-suscripciones';
import { calcularProximoPeriodo } from '@/lib/suscripcion-renovacion';

function baseUrlFromReq(req: Request): string {
  const fwdHost = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  const fwdProto = req.headers.get('x-forwarded-proto') ?? 'https';
  const origin = fwdHost ? `${fwdProto}://${fwdHost}` : null;
  return (origin && origin.startsWith('https://')) ? origin : (process.env.NEXT_PUBLIC_BASE_URL ?? origin ?? 'http://localhost:3000');
}

// POST /api/admin/[tenantSlug]/suscripcion/abonar
// Genera un pago único de MercadoPago (Checkout Pro) por el próximo período.
// Solo disponible cuando la modalidad de cobro es "manual" (la define el superadmin).
export async function POST(
  req: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const payload = await verifyToken(token);
  if (!payload || payload.tenantSlug !== tenantSlug) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const [{ data: tenant }, { data: susc }] = await Promise.all([
    supabase.from('tenants').select('nombre, email_contacto').eq('id', payload.tenantId).single(),
    supabase
      .from('suscripciones')
      .select('modalidad_cobro, ciclo, fecha_fin, precio_acordado, plan:planes!suscripciones_plan_id_fkey(precio_mensual, precio_anual)')
      .eq('tenant_id', payload.tenantId)
      .maybeSingle(),
  ]);

  if (!tenant || !susc) return NextResponse.json({ error: 'Suscripción no encontrada' }, { status: 404 });
  if (susc.modalidad_cobro !== 'manual') {
    return NextResponse.json({ error: 'Esta cuenta tiene renovación automática activa' }, { status: 400 });
  }

  const plan = Array.isArray(susc.plan) ? susc.plan[0] : susc.plan;
  const monto = Number(susc.precio_acordado ?? (susc.ciclo === 'anual' ? plan?.precio_anual : plan?.precio_mensual) ?? 0);
  if (monto <= 0) {
    return NextResponse.json({ error: 'No se pudo determinar el monto a abonar' }, { status: 400 });
  }
  if (!tenant.email_contacto) {
    return NextResponse.json({ error: 'Falta un email de contacto configurado para el pago' }, { status: 400 });
  }

  const periodoFin = calcularProximoPeriodo(susc.fecha_fin, susc.ciclo);

  const { data: pagoRow, error: insertError } = await supabase
    .from('pagos_suscripcion')
    .insert({
      tenant_id: payload.tenantId,
      monto,
      metodo: 'mercadopago',
      estado: 'pendiente',
      periodo_inicio: susc.fecha_fin,
      periodo_fin: periodoFin,
      origen: 'mercadopago',
    })
    .select('id')
    .single();

  if (insertError || !pagoRow) {
    console.error('[suscripcion/abonar] error insertando pago', insertError);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }

  const baseUrl = baseUrlFromReq(req);

  try {
    const { initPoint } = await crearPreferenciaPagoUnico({
      tenantNombre: tenant.nombre,
      monto,
      payerEmail: tenant.email_contacto,
      backUrlBase: `${baseUrl}/admin/${tenantSlug}/suscripcion`,
      notificationUrl: `${baseUrl}/api/webhooks/mercadopago-suscripciones?tenant_id=${payload.tenantId}`,
      pagoSuscripcionId: pagoRow.id,
    });

    if (!initPoint) throw new Error('MercadoPago no devolvió init_point');
    return NextResponse.json({ initPoint });
  } catch (err) {
    console.error('[suscripcion/abonar] error creando preferencia', err);
    await supabase.from('pagos_suscripcion').update({ estado: 'rechazado' }).eq('id', pagoRow.id);
    return NextResponse.json({ error: 'No se pudo iniciar el pago con MercadoPago' }, { status: 502 });
  }
}
