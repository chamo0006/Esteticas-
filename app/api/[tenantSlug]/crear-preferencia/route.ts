import { NextResponse } from 'next/server';
import { getTenantBySlug } from '@/lib/tenant';
import { getMPClient, Preference } from '@/lib/mercadopago';
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

  // Cada estética puede tener su propio MP_ACCESS_TOKEN, o se usa el de la plataforma
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    return NextResponse.json({ error: 'MercadoPago no configurado' }, { status: 503 });
  }

  const { pagoId, clienteNombre, clienteEmail, items } = await req.json();

  // Verifica que el pago exista y pertenezca a este tenant
  const { data: pagoData, error: pagoError } = await supabase
    .from('pagos')
    .select('monto, tipo, turnos!inner(tenant_id)')
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

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';

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
        notification_url: `${baseUrl}/api/webhooks/mercadopago`,
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
    return NextResponse.json({ error: 'Error al crear preferencia de pago' }, { status: 500 });
  }
}
