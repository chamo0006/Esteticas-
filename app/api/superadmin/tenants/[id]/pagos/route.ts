import { NextResponse } from 'next/server';
import { getPlatformAdmin } from '@/lib/superadmin-auth';
import { canSeeBilling } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { registrarPagoSuscripcion } from '@/lib/suscripcion-renovacion';

// Lista los pagos de suscripción de un comercio.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getPlatformAdmin();
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!canSeeBilling(admin)) {
    return NextResponse.json({ error: 'Sin permisos de facturación' }, { status: 403 });
  }

  const { id: tenantId } = await params;
  const { data, error } = await supabase
    .from('pagos_suscripcion')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[superadmin/pagos GET]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}

// Registra un pago de suscripción. Si está aprobado y trae periodo_fin,
// renueva la suscripción (extiende el vencimiento y la reactiva).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getPlatformAdmin();
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!canSeeBilling(admin)) {
    return NextResponse.json({ error: 'Sin permisos de facturación' }, { status: 403 });
  }

  const { id: tenantId } = await params;
  const body = await req.json();
  const { monto, metodo, estado, periodo_inicio, periodo_fin, fecha_pago, referencia_externa, notas } = body;

  if (monto == null || !metodo || !estado) {
    return NextResponse.json({ error: 'Datos incompletos (monto, método, estado)' }, { status: 400 });
  }

  try {
    await registrarPagoSuscripcion({
      tenantId,
      monto,
      metodo,
      estado,
      periodoInicio: periodo_inicio || null,
      periodoFin: periodo_fin || null,
      fechaPago: fecha_pago || null,
      referenciaExterna: referencia_externa || null,
      origen: 'manual',
      notas: notas || null,
    });
  } catch (err) {
    console.error('[superadmin/pagos POST]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }

  await supabase.from('superadmin_logs').insert({
    platform_admin_id: admin.adminId,
    accion: 'registrar_pago',
    tenant_id: tenantId,
    detalle: { monto, metodo, estado },
  });

  return NextResponse.json({ ok: true });
}
