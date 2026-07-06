import { NextResponse } from 'next/server';
import { getPlatformAdmin } from '@/lib/superadmin-auth';
import { canSeeBilling } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

const EDITABLES = ['nombre', 'descripcion', 'precio_mensual', 'precio_anual', 'max_profesionales', 'features', 'activo', 'orden'] as const;

// PATCH — edita un plan.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getPlatformAdmin();
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!canSeeBilling(admin)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });

  const { id } = await params;
  const b = await req.json();

  const update: Record<string, unknown> = {};
  for (const campo of EDITABLES) {
    if (campo in b) {
      if (campo === 'precio_anual' || campo === 'max_profesionales') {
        update[campo] = b[campo] === '' || b[campo] == null ? null : Number(b[campo]);
      } else if (campo === 'precio_mensual' || campo === 'orden') {
        update[campo] = Number(b[campo]) || 0;
      } else {
        update[campo] = b[campo];
      }
    }
  }

  const { error } = await supabase.from('planes').update(update).eq('id', id);
  if (error) return NextResponse.json({ error: 'Error al guardar' }, { status: 500 });

  await supabase.from('superadmin_logs').insert({
    platform_admin_id: admin.adminId, accion: 'editar_plan', detalle: { id, ...update },
  });
  return NextResponse.json({ ok: true });
}

// DELETE — elimina un plan (solo superadmin). Falla si hay suscripciones usándolo.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getPlatformAdmin();
  if (!admin || admin.rol !== 'superadmin') {
    return NextResponse.json({ error: 'Solo el superadmin puede eliminar planes' }, { status: 403 });
  }
  const { id } = await params;

  const { count } = await supabase
    .from('suscripciones').select('id', { count: 'exact', head: true }).eq('plan_id', id);
  if (count && count > 0) {
    return NextResponse.json({ error: `No se puede eliminar: ${count} comercio(s) usan este plan. Desactivalo en su lugar.` }, { status: 409 });
  }

  const { error } = await supabase.from('planes').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });

  await supabase.from('superadmin_logs').insert({
    platform_admin_id: admin.adminId, accion: 'eliminar_plan', detalle: { id },
  });
  return NextResponse.json({ ok: true });
}
