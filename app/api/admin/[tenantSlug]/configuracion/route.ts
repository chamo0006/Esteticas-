import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { configuracionSchema } from '@/lib/schemas';
import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

async function getAdminPayload(tenantSlug: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload || payload.tenantSlug !== tenantSlug) return null;
  return payload;
}

// GET configuración completa del tenant
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;
  const payload = await getAdminPayload(tenantSlug);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const [tenantResult, horariosResult, diasResult] = await Promise.all([
    supabase
      .from('tenants')
      .select('nombre, email_contacto, telefono, instagram, logo_url, exige_sena, porcentaje_sena, porcentaje_retencion, horas_limite_cancelacion, permite_efectivo, alias_pago, color_primario, color_acento, tipo_negocio, stat_rating, stat_barberos, stat_clientes')
      .eq('id', payload.tenantId)
      .single(),
    supabase
      .from('horarios_tenant')
      .select('dia_semana, hora_apertura, hora_cierre, activo')
      .eq('tenant_id', payload.tenantId)
      .order('dia_semana'),
    supabase
      .from('dias_bloqueados')
      .select('id, fecha, motivo')
      .eq('tenant_id', payload.tenantId)
      .gte('fecha', new Date().toISOString().split('T')[0])
      .order('fecha'),
  ]);

  return NextResponse.json({
    tenant: tenantResult.data,
    horarios: horariosResult.data ?? [],
    dias_bloqueados: diasResult.data ?? [],
  });
}

// PATCH actualizar configuración
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;
  const payload = await getAdminPayload(tenantSlug);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const parsed = configuracionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', detalles: parsed.error.flatten() }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const { nombre, email_contacto, telefono, instagram, exige_sena, porcentaje_sena, porcentaje_retencion, horas_limite_cancelacion, permite_efectivo, alias_pago, stat_rating, stat_barberos, stat_clientes } = parsed.data;
  const logo_url       = 'logo_url'       in raw ? (raw.logo_url       as string | null) : undefined;
  const color_primario = 'color_primario' in raw ? (raw.color_primario as string | null) : undefined;
  const color_acento   = 'color_acento'   in raw ? (raw.color_acento   as string | null) : undefined;
  const tipo_negocio   = 'tipo_negocio'   in raw ? (raw.tipo_negocio   as string)        : undefined;

  // Build update object with only the fields that are defined
  const updateData: Record<string, unknown> = {};
  if (nombre           !== undefined) updateData.nombre            = nombre;
  if (email_contacto   !== undefined) updateData.email_contacto    = email_contacto;
  if (telefono         !== undefined) updateData.telefono          = telefono;
  if (instagram        !== undefined) updateData.instagram         = instagram;
  if (exige_sena       !== undefined) updateData.exige_sena        = exige_sena;
  if (porcentaje_sena  !== undefined) updateData.porcentaje_sena   = porcentaje_sena;
  if (porcentaje_retencion !== undefined) updateData.porcentaje_retencion = porcentaje_retencion ?? 0;
  if (horas_limite_cancelacion !== undefined) updateData.horas_limite_cancelacion = horas_limite_cancelacion ?? 0;
  if (permite_efectivo !== undefined) updateData.permite_efectivo  = permite_efectivo;
  if (alias_pago       !== undefined) updateData.alias_pago        = alias_pago;
  if (stat_rating      !== undefined) updateData.stat_rating       = stat_rating;
  if (stat_barberos    !== undefined) updateData.stat_barberos     = stat_barberos;
  if (stat_clientes    !== undefined) updateData.stat_clientes     = stat_clientes;
  if (logo_url         !== undefined) updateData.logo_url          = logo_url;
  if (color_primario   !== undefined) updateData.color_primario    = color_primario;
  if (color_acento     !== undefined) updateData.color_acento      = color_acento;
  if (tipo_negocio     !== undefined && ['estetica', 'barberia'].includes(tipo_negocio))
                                      updateData.tipo_negocio      = tipo_negocio;

  const { error } = await supabase
    .from('tenants')
    .update(updateData)
    .eq('id', payload.tenantId);

  if (error) {
    console.error('[configuracion PATCH]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }

  revalidatePath(`/${tenantSlug}`);
  return NextResponse.json({ ok: true });
}
