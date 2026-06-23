import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Vercel Cron llama este endpoint una vez por día.
// Bloquea comercios cuya suscripción venció hace más de `dias_gracia` días,
// y marca como 'vencida' a las que ya pasaron la fecha de fin.
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const hoy = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // Traemos suscripciones activas/trial con fecha_fin definida
  const { data: suscripciones, error } = await supabase
    .from('suscripciones')
    .select('tenant_id, fecha_fin, dias_gracia, estado, bloqueado')
    .in('estado', ['trial', 'activa', 'vencida'])
    .not('fecha_fin', 'is', null);

  if (error) {
    console.error('[cortar-morosos]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }

  const hoyMs = new Date(hoy).getTime();
  let vencidas = 0;
  let bloqueadas = 0;

  for (const s of suscripciones ?? []) {
    const finMs = new Date(s.fecha_fin as string).getTime();
    const limiteCorteMs = finMs + (s.dias_gracia ?? 0) * 86_400_000;

    // Pasó la fecha de fin pero sigue dentro de la gracia → marcar vencida
    if (hoyMs > finMs && s.estado !== 'vencida' && hoyMs <= limiteCorteMs) {
      await supabase.from('suscripciones').update({ estado: 'vencida' }).eq('tenant_id', s.tenant_id);
      vencidas++;
    }

    // Pasó la gracia → cortar servicio
    if (hoyMs > limiteCorteMs && !s.bloqueado) {
      await supabase
        .from('suscripciones')
        .update({ estado: 'suspendida', bloqueado: true, bloqueado_at: new Date().toISOString(), bloqueo_motivo: 'Falta de pago (corte automático)' })
        .eq('tenant_id', s.tenant_id);
      await supabase.from('tenants').update({ activo: false }).eq('id', s.tenant_id);
      bloqueadas++;
    }
  }

  return NextResponse.json({ fecha: hoy, revisadas: (suscripciones ?? []).length, vencidas, bloqueadas });
}
