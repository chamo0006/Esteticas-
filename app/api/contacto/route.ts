import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { enviarContacto } from '@/lib/email';

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const { nombre, email, telefono, estetica } = body as Record<string, string>;

  if (!nombre?.trim() || !email?.trim()) {
    return NextResponse.json({ error: 'Nombre y email son requeridos' }, { status: 400 });
  }

  // Guardar en Supabase
  await supabase.from('leads').insert({
    nombre: nombre.trim(),
    email: email.trim().toLowerCase(),
    telefono: telefono?.trim() ?? null,
    estetica: estetica?.trim() ?? null,
  }).throwOnError().catch(() => {
    // Si la tabla no existe todavía, no bloqueamos el flujo
  });

  // Mandar email de notificación
  try {
    await enviarContacto({ nombre: nombre.trim(), email: email.trim(), telefono: telefono?.trim() ?? '', estetica: estetica?.trim() ?? '' });
  } catch (err) {
    console.error('[contacto] error enviando email:', err);
  }

  return NextResponse.json({ ok: true });
}
