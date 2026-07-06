import { NextResponse } from 'next/server';
import { getTenantBySlug } from '@/lib/tenant';
import { getMPClient, Preference, resolveMPToken } from '@/lib/mercadopago';
import { supabase } from '@/lib/supabase';

// POST /api/[tenantSlug]/crear-preferencia
// body: { pagoId, turnoIds, clienteNombre, clienteEmail, items }
export async function POST(
  req: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 });

  // Cada estética cobra a SU cuenta de MP; si no la conectó, cae al token de plataforma
  const accessToken = await resolveMPToken(tenant.id);
  if (!accessToken) {
    return NextResponse.json({ error: 'MercadoPago no configurado' }, { status: 503 });
  }

  const { pagoId, clienteNombre, clienteEmail, items } = await req.json();

  // Verifica que el pago exista y pertenezca a este tenant
  const { data: pagoData, error: pagoError } = await supabase
    .from('pagos')
    .select('monto, tipo, turnos!turno_id!inner(tenant_id)')
    .eq('id', pagoId)
    .eq('turnos.tenant_id', tenant.id)
    .single();

  if (pagoError || !pagoData) {
    return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 });
  }

  const { monto, tipo } = pagoData;
  const titulo = tipo === 'sena'
    ? `Seña — ${tenant.nombre}`
    : `Reserva — ${tenant.nombre}`;

  // Base URL para back_urls/notification. MercadoPago exige URLs públicas válidas
  // (con auto_return, deben ser https). Preferimos el origen REAL del request
  // (así en producción siempre es el dominio correcto, sin depender de que
  // NEXT_PUBLIC_BASE_URL esté bien seteada); caemos a la env var solo en local.
  const fwdHost  = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  const fwdProto = req.headers.get('x-forwarded-proto') ?? 'https';
  const reqOrigin = fwdHost ? `${fwdProto}://${fwdHost}` : null;
  const baseUrl = (reqOrigin && reqOrigin.startsWith('https://'))
    ? reqOrigin
    : (process.env.NEXT_PUBLIC_BASE_URL ?? reqOrigin ?? 'http://localhost:3000');

  try {
    const client = getMPClient(accessToken);
    const preference = new Preference(client);

    const response = await preference.create({
      body: {
        items: [
          {
            id: pagoId,
            title: titulo,
            description: items?.map((i: { name: string }) => i.name).join(', ') ?? titulo,
            quantity: 1,
            unit_price: Number(monto),
            currency_id: 'ARS',
          },
        ],
        payer: {
          name: clienteNombre,
          email: clienteEmail,
        },
        back_urls: {
          success: `${baseUrl}/${tenantSlug}/reserva/exito`,
          failure: `${baseUrl}/${tenantSlug}/reserva/error`,
          pending: `${baseUrl}/${tenantSlug}/reserva/pendiente`,
        },
        auto_return: 'approved',
        // El tenant_id viaja en la URL para que el webhook sepa con qué
        // cuenta (token) consultar el pago — clave en multi-tenant.
        notification_url: `${baseUrl}/api/webhooks/mercadopago?tenant_id=${tenant.id}`,
        external_reference: pagoId,
        expires: true,
        expiration_date_to: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      },
    });

    return NextResponse.json({
      preferenceId: response.id,
      initPoint: response.init_point,        // URL de pago — redirect normal
      sandboxInitPoint: response.sandbox_init_point, // URL de prueba
    });
  } catch (err) {
    console.error('[crear-preferencia]', err);
    // El pago con MercadoPago no se pudo iniciar (token rechazado, etc.).
    // Liberamos el horario: cancelamos los turnos de esta reserva y marcamos el
    // pago como rechazado, así el cliente puede reintentar el mismo horario o
    // elegir otro método sin que quede bloqueado por un turno pendiente.
    await supabase.from('turnos').update({ estado: 'cancelado' }).eq('pago_id', pagoId).eq('estado', 'pendiente');
    await supabase.from('pagos').update({ estado: 'rechazado' }).eq('id', pagoId);
    return NextResponse.json({ error: 'Error al crear preferencia de pago' }, { status: 500 });
  }
}
