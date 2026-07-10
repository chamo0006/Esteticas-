import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { crearPreapproval, cancelarPreapproval } from '@/lib/mercadopago-suscripciones';

function baseUrlFromReq(req: Request): string {
  const fwdHost = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  const fwdProto = req.headers.get('x-forwarded-proto') ?? 'https';
  const origin = fwdHost ? `${fwdProto}://${fwdHost}` : null;
  return (origin && origin.startsWith('https://')) ? origin : (process.env.NEXT_PUBLIC_BASE_URL ?? origin ?? 'http://localhost:3000');
}

// POST /api/admin/[tenantSlug]/suscripcion/actualizar-metodo-pago
// MercadoPago no permite "editar la tarjeta" de una suscripción activa: hay
// que cancelar la actual y crear una nueva, que el dueño vuelve a autorizar.
// Solo disponible en modalidad "automatico" (la define el superadmin).
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
      .select('modalidad_cobro, mp_preapproval_id, ciclo, precio_acordado, plan:planes!suscripciones_plan_id_fkey(precio_mensual, precio_anual)')
      .eq('tenant_id', payload.tenantId)
      .maybeSingle(),
  ]);

  if (!tenant || !susc) return NextResponse.json({ error: 'Suscripción no encontrada' }, { status: 404 });
  if (susc.modalidad_cobro !== 'automatico') {
    return NextResponse.json({ error: 'Esta cuenta no tiene renovación automática activa' }, { status: 400 });
  }
  if (!tenant.email_contacto) {
    return NextResponse.json({ error: 'Falta un email de contacto configurado' }, { status: 400 });
  }

  const plan = Array.isArray(susc.plan) ? susc.plan[0] : susc.plan;
  const monto = Number(susc.precio_acordado ?? (susc.ciclo === 'anual' ? plan?.precio_anual : plan?.precio_mensual) ?? 0);
  if (monto <= 0) {
    return NextResponse.json({ error: 'No se pudo determinar el monto a cobrar' }, { status: 400 });
  }

  if (susc.mp_preapproval_id) {
    try {
      await cancelarPreapproval(susc.mp_preapproval_id);
    } catch (err) {
      console.error('[actualizar-metodo-pago] error cancelando preapproval anterior (se sigue igual)', err);
    }
  }

  const baseUrl = baseUrlFromReq(req);

  try {
    const pre = await crearPreapproval({
      tenantId: payload.tenantId,
      tenantNombre: tenant.nombre,
      payerEmail: tenant.email_contacto,
      monto,
      backUrl: `${baseUrl}/admin/${tenantSlug}/suscripcion`,
      notificationUrl: `${baseUrl}/api/webhooks/mercadopago-suscripciones?tenant_id=${payload.tenantId}`,
    });

    await supabase.from('suscripciones').update({
      mp_preapproval_id: pre.id,
      mp_preapproval_status: pre.status,
      mp_preapproval_init_point: pre.initPoint,
    }).eq('tenant_id', payload.tenantId);

    if (!pre.initPoint) throw new Error('MercadoPago no devolvió init_point');
    return NextResponse.json({ initPoint: pre.initPoint });
  } catch (err) {
    console.error('[actualizar-metodo-pago] error creando preapproval', err);
    return NextResponse.json({ error: 'No se pudo generar el nuevo link de autorización' }, { status: 502 });
  }
}
