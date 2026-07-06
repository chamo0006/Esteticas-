import { NextResponse } from 'next/server';
import { getPlatformAdmin } from '@/lib/superadmin-auth';
import { canSeeBilling } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

// GET — lista todos los planes (activos e inactivos), ordenados.
export async function GET() {
  const admin = await getPlatformAdmin();
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!canSeeBilling(admin)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });

  const { data, error } = await supabase.from('planes').select('*').order('orden');
  if (error) return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST — crea un plan nuevo.
export async function POST(req: Request) {
  const admin = await getPlatformAdmin();
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!canSeeBilling(admin)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });

  const b = await req.json();
  const slug = String(b.slug ?? '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
  const nombre = String(b.nombre ?? '').trim();
  if (!slug || !nombre) {
    return NextResponse.json({ error: 'Slug y nombre son obligatorios' }, { status: 400 });
  }

  const { error } = await supabase.from('planes').insert({
    slug,
    nombre,
    descripcion: b.descripcion || null,
    precio_mensual: Number(b.precio_mensual) || 0,
    precio_anual: b.precio_anual != null && b.precio_anual !== '' ? Number(b.precio_anual) : null,
    max_profesionales: b.max_profesionales != null && b.max_profesionales !== '' ? Number(b.max_profesionales) : null,
    features: Array.isArray(b.features) ? b.features : [],
    activo: b.activo ?? true,
    orden: Number(b.orden) || 0,
  });

  if (error) {
    const msg = error.code === '23505' ? 'Ya existe un plan con ese slug' : 'Error al crear el plan';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  await supabase.from('superadmin_logs').insert({
    platform_admin_id: admin.adminId, accion: 'crear_plan', detalle: { slug, nombre },
  });
  return NextResponse.json({ ok: true });
}
