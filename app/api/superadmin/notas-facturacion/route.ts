import { NextResponse } from 'next/server';
import { getPlatformAdmin } from '@/lib/superadmin-auth';
import { canSeeBilling } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

// GET ?mes=YYYY-MM-01 — notas del mes que contiene esa fecha.
export async function GET(req: Request) {
  const admin = await getPlatformAdmin();
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!canSeeBilling(admin)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const mes = searchParams.get('mes');
  if (!mes || !/^\d{4}-\d{2}-\d{2}$/.test(mes)) {
    return NextResponse.json({ error: 'Parámetro "mes" inválido' }, { status: 400 });
  }
  const inicio = new Date(mes);
  const fin = new Date(inicio.getFullYear(), inicio.getMonth() + 1, 1);

  const { data, error } = await supabase
    .from('notas_facturacion')
    .select('id, fecha, texto, monto, created_at, platform_admins(nombre)')
    .gte('fecha', inicio.toISOString().slice(0, 10))
    .lt('fecha', fin.toISOString().slice(0, 10))
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[notas-facturacion GET]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }

  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);
  type Raw = { id: string; fecha: string; texto: string; monto: number | null; created_at: string; platform_admins: { nombre: string } | { nombre: string }[] | null };
  const notas = ((data ?? []) as unknown as Raw[]).map((n) => ({
    id: n.id, fecha: n.fecha, texto: n.texto, monto: n.monto != null ? Number(n.monto) : null,
    created_at: n.created_at, autor: one(n.platform_admins)?.nombre ?? null,
  }));

  return NextResponse.json(notas);
}

// POST { fecha, texto, monto? } — crea una nota.
export async function POST(req: Request) {
  const admin = await getPlatformAdmin();
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!canSeeBilling(admin)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });

  const b = await req.json();
  const fecha = String(b.fecha ?? '');
  const texto = String(b.texto ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !texto) {
    return NextResponse.json({ error: 'Fecha y texto son obligatorios' }, { status: 400 });
  }
  const monto = b.monto != null && b.monto !== '' ? Number(b.monto) : null;

  const { error } = await supabase.from('notas_facturacion').insert({
    fecha, texto, monto, platform_admin_id: admin.adminId,
  });

  if (error) {
    console.error('[notas-facturacion POST]', error);
    return NextResponse.json({ error: 'Error al guardar la nota' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// DELETE ?id=... — borra una nota.
export async function DELETE(req: Request) {
  const admin = await getPlatformAdmin();
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!canSeeBilling(admin)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 });

  const { error } = await supabase.from('notas_facturacion').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
