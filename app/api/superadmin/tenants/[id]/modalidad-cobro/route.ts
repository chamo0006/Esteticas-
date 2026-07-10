import { NextResponse } from 'next/server';
import { getPlatformAdmin } from '@/lib/superadmin-auth';
import { canSeeBilling } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { crearPreapproval, cancelarPreapproval } from '@/lib/mercadopago-suscripciones';

function baseUrlFromReq(req: Request): string {
  const fwdHost = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  const fwdProto = req.headers.get('x-forwarded-proto') ?? 'https';
  const origin = fwdHost ? `${fwdProto}://${fwdHost}` : null;
  return (origin && origin.startsWith('https://')) ? origin : (process.env.NEXT_PUBLIC_BASE_URL ?? origin ?? 'http://localhost:3000');
}

// PATCH /api/superadmin/tenants/[id]/modalidad-cobro  body: { modalidad: 'manual' | 'automatico' }
// La modalidad la define solo el superadmin. Al pasar a "automatico" se crea
// una suscripción (preapproval) pendiente de autorización — el dueño la
// completa desde su panel. Al volver a "manual" se cancela la suscripción
// recurrente activa en MercadoPago, si había una.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getPlatformAdmin();
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!canSeeBilling(admin)) {
    return NextResponse.json({ error: 'Sin permisos de facturación' }, { status: 403 });
  }

  const { id: tenantId } = await params;
  const { modalidad } = await req.json();
  if (modalidad !== 'manual' && modalidad !== 'automatico') {
    return NextResponse.json({ error: 'Modalidad inválida' }, { status: 400 });
  }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('nombre, email_contacto')
    .eq('id', tenantId)
    .single();
  if (!tenant) return NextResponse.json({ error: 'Comercio no encontrado' }, { status: 404 });

  const { data: susc } = await supabase
    .from('suscripciones')
    .select('modalidad_cobro, mp_preapproval_id, ciclo, precio_acordado, plan:planes!suscripciones_plan_id_fkey(precio_mensual, precio_anual)')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (!susc) return NextResponse.json({ error: 'Este comercio no tiene suscripción configurada' }, { status: 400 });

  if (modalidad === susc.modalidad_cobro) {
    return NextResponse.json({ ok: true }); // sin cambios
  }

  if (modalidad === 'automatico') {
    if (!tenant.email_contacto) {
      return NextResponse.json({ error: 'El comercio no tiene un email de contacto cargado, necesario para MercadoPago' }, { status: 400 });
    }
    const plan = Array.isArray(susc.plan) ? susc.plan[0] : susc.plan;
    const monto = Number(susc.precio_acordado ?? (susc.ciclo === 'anual' ? plan?.precio_anual : plan?.precio_mensual) ?? 0);
    if (monto <= 0) {
      return NextResponse.json({ error: 'No se pudo determinar el monto a cobrar (sin plan ni precio acordado)' }, { status: 400 });
    }

    const baseUrl = baseUrlFromReq(req);
    try {
      const pre = await crearPreapproval({
        tenantId,
        tenantNombre: tenant.nombre,
        payerEmail: tenant.email_contacto,
        monto,
        backUrl: `${baseUrl}/admin`, // vuelve al panel; el tenantSlug no es necesario acá
        notificationUrl: `${baseUrl}/api/webhooks/mercadopago-suscripciones?tenant_id=${tenantId}`,
      });

      await supabase.from('suscripciones').update({
        modalidad_cobro: 'automatico',
        mp_preapproval_id: pre.id,
        mp_preapproval_status: pre.status,
        mp_preapproval_init_point: pre.initPoint,
      }).eq('tenant_id', tenantId);
    } catch (err) {
      console.error('[modalidad-cobro] error creando preapproval', err);
      return NextResponse.json({ error: 'No se pudo crear la suscripción en MercadoPago' }, { status: 502 });
    }
  } else {
    // Volver a manual: cancelar la suscripción recurrente activa en MP, si había.
    if (susc.mp_preapproval_id) {
      try {
        await cancelarPreapproval(susc.mp_preapproval_id);
      } catch (err) {
        console.error('[modalidad-cobro] error cancelando preapproval (se sigue igual)', err);
      }
    }
    await supabase.from('suscripciones').update({
      modalidad_cobro: 'manual',
      mp_preapproval_status: susc.mp_preapproval_id ? 'cancelled' : null,
      mp_preapproval_init_point: null,
    }).eq('tenant_id', tenantId);
  }

  await supabase.from('superadmin_logs').insert({
    platform_admin_id: admin.adminId,
    accion: 'cambiar_modalidad_cobro',
    tenant_id: tenantId,
    detalle: { modalidad },
  });

  return NextResponse.json({ ok: true });
}
