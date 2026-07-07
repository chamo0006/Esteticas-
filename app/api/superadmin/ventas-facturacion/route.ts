import { NextResponse } from 'next/server';
import { getPlatformAdmin } from '@/lib/superadmin-auth';
import { canSeeBilling } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

// GET ?mes=YYYY-MM-01 — ventas cuya fecha_pago cae en ese mes.
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
    .from('ventas_facturacion')
    .select('id, cliente, plan, monto, fecha_pago, fecha_vencimiento, notas, created_at, platform_admins(nombre)')
    .gte('fecha_pago', inicio.toISOString().slice(0, 10))
    .lt('fecha_pago', fin.toISOString().slice(0, 10))
    .order('fecha_pago', { ascending: false });

  if (error) {
    console.error('[ventas-facturacion GET]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }

  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);
  type Raw = {
    id: string; cliente: string; plan: string; monto: number; fecha_pago: string;
    fecha_vencimiento: string | null; notas: string | null; created_at: string;
    platform_admins: { nombre: string } | { nombre: string }[] | null;
  };
  const ventas = ((data ?? []) as unknown as Raw[]).map((v) => ({
    id: v.id, cliente: v.cliente, plan: v.plan, monto: Number(v.monto),
    fecha_pago: v.fecha_pago, fecha_vencimiento: v.fecha_vencimiento, notas: v.notas,
    created_at: v.created_at, autor: one(v.platform_admins)?.nombre ?? null,
  }));

  return NextResponse.json(ventas);
}

interface VentaInput {
  cliente: string;
  plan: string;
  monto: number | string;
  fecha_pago: string;
  fecha_vencimiento?: string | null;
  notas?: string | null;
}

function validar(b: Partial<VentaInput>) {
  const cliente = String(b.cliente ?? '').trim();
  const plan = String(b.plan ?? '').trim();
  const fecha_pago = String(b.fecha_pago ?? '');
  if (!cliente || !plan || !/^\d{4}-\d{2}-\d{2}$/.test(fecha_pago)) return null;
  const monto = Number(b.monto);
  if (Number.isNaN(monto) || monto < 0) return null;
  const fecha_vencimiento = b.fecha_vencimiento && /^\d{4}-\d{2}-\d{2}$/.test(b.fecha_vencimiento) ? b.fecha_vencimiento : null;
  const notas = b.notas ? String(b.notas).trim() || null : null;
  return { cliente, plan, monto, fecha_pago, fecha_vencimiento, notas };
}

// POST — crea una venta.
export async function POST(req: Request) {
  const admin = await getPlatformAdmin();
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!canSeeBilling(admin)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });

  const body = validar(await req.json());
  if (!body) return NextResponse.json({ error: 'Faltan datos obligatorios (cliente, plan, monto, fecha de pago)' }, { status: 400 });

  const { error } = await supabase.from('ventas_facturacion').insert({ ...body, platform_admin_id: admin.adminId });
  if (error) {
    console.error('[ventas-facturacion POST]', error);
    return NextResponse.json({ error: 'Error al guardar la venta' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// PATCH ?id=... — edita una venta existente.
export async function PATCH(req: Request) {
  const admin = await getPlatformAdmin();
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!canSeeBilling(admin)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 });

  const body = validar(await req.json());
  if (!body) return NextResponse.json({ error: 'Faltan datos obligatorios (cliente, plan, monto, fecha de pago)' }, { status: 400 });

  const { error } = await supabase.from('ventas_facturacion').update(body).eq('id', id);
  if (error) {
    console.error('[ventas-facturacion PATCH]', error);
    return NextResponse.json({ error: 'Error al actualizar la venta' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// DELETE ?id=... — borra una venta.
export async function DELETE(req: Request) {
  const admin = await getPlatformAdmin();
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!canSeeBilling(admin)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 });

  const { error } = await supabase.from('ventas_facturacion').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
