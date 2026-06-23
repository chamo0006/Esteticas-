import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { registrarTenantSchema } from '@/lib/schemas';
import { generarSlugUnico } from '@/lib/slug';
import { rateLimit, getClientIP } from '@/lib/ratelimit';
import { enviarBienvenida } from '@/lib/email';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  // Rate limit: 3 registros por IP por hora
  const { allowed } = rateLimit(`registrar:${getClientIP(req)}`, 3, 60 * 60_000);
  if (!allowed) {
    return NextResponse.json({ error: 'Demasiados intentos, probá más tarde' }, { status: 429 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const parsed = registrarTenantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', detalles: parsed.error.flatten() }, { status: 400 });
  }

  const { nombre, email, telefono, adminNombre, password, tipo_negocio } = parsed.data;

  // Verificar que el email no esté en uso
  const { data: existingUser } = await supabase
    .from('usuarios_admin')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existingUser) {
    return NextResponse.json({ error: 'El email ya está registrado' }, { status: 409 });
  }

  const slug = await generarSlugUnico(nombre);
  const passwordHash = await bcrypt.hash(password, 10);

  // Create tenant
  const { data: tenantData, error: tenantError } = await supabase
    .from('tenants')
    .insert({ slug, nombre, email_contacto: email, telefono: telefono ?? null, tipo_negocio })
    .select('id')
    .single();

  if (tenantError || !tenantData) {
    console.error('[registrar] error creando tenant:', tenantError);
    return NextResponse.json({ error: 'Error al registrar la estética' }, { status: 500 });
  }
  const tenantId = tenantData.id;

  // Create admin user
  const { error: adminError } = await supabase
    .from('usuarios_admin')
    .insert({
      tenant_id: tenantId,
      nombre: adminNombre,
      email,
      password_hash: passwordHash,
      rol: 'admin',
    });

  if (adminError) {
    console.error('[registrar] error creando admin:', adminError);
    // Best-effort cleanup
    await supabase.from('tenants').delete().eq('id', tenantId);
    return NextResponse.json({ error: 'Error al registrar la estética' }, { status: 500 });
  }

  // Horarios default: Lun-Sáb 9-18, Dom cerrado
  const defaultHorarios = Array.from({ length: 7 }, (_, dia) => ({
    tenant_id: tenantId,
    dia_semana: dia,
    hora_apertura: '09:00',
    hora_cierre: '18:00',
    activo: dia !== 0,
  }));

  const { error: horariosError } = await supabase
    .from('horarios_tenant')
    .upsert(defaultHorarios, { onConflict: 'tenant_id,dia_semana', ignoreDuplicates: true });

  if (horariosError) {
    console.error('[registrar] error creando horarios default:', horariosError);
    await supabase.from('usuarios_admin').delete().eq('tenant_id', tenantId);
    await supabase.from('tenants').delete().eq('id', tenantId);
    return NextResponse.json({ error: 'Error al registrar la estética' }, { status: 500 });
  }

  // Suscripción trial de 14 días con plan Básico (no bloquea el alta si falla)
  const { data: planBasico } = await supabase
    .from('planes')
    .select('id')
    .eq('slug', 'basico')
    .maybeSingle();
  const fechaFin = new Date(Date.now() + 14 * 24 * 60 * 60_000).toISOString().split('T')[0];
  const { error: suscError } = await supabase.from('suscripciones').insert({
    tenant_id: tenantId,
    plan_id: planBasico?.id ?? null,
    estado: 'trial',
    fecha_fin: fechaFin,
  });
  if (suscError) console.error('[registrar] error creando suscripción trial:', suscError);

  // Email de bienvenida (no bloquea la respuesta)
  enviarBienvenida(email, { adminNombre, tenantNombre: nombre, tenantSlug: slug, password }).catch(console.error);

  return NextResponse.json({ slug, tenantId }, { status: 201 });
}
