import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// La preferencia de MercadoPago expira a los 30 min. Damos un margen extra
// para webhooks tardíos antes de dar la reserva por abandonada.
const EXPIRACION_MIN = 40;

// Vercel Cron llama este endpoint periódicamente.
// Cancela reservas de MercadoPago que nunca se pagaron, liberando el horario.
// Solo toca pagos 'mercadopago' que siguen 'pendiente' (no efectivo, no acreditados).
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const limiteISO = new Date(Date.now() - EXPIRACION_MIN * 60_000).toISOString();

  // Pagos de MercadoPago aún pendientes y ya vencidos
  const { data: pagosVencidos, error } = await supabase
    .from('pagos')
    .select('id, turno_id')
    .eq('metodo', 'mercadopago')
    .eq('estado', 'pendiente')
    .lt('created_at', limiteISO);

  if (error) {
    console.error('[limpiar-reservas]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }

  let turnosCancelados = 0;
  let pagosCerrados = 0;

  for (const pago of pagosVencidos ?? []) {
    // Cancela los turnos de esta reserva que sigan pendientes.
    // 'cancelado' libera el horario (los índices y consultas lo excluyen).
    const { data: cancelados } = await supabase
      .from('turnos')
      .update({ estado: 'cancelado' })
      .eq('pago_id', pago.id)
      .eq('estado', 'pendiente')
      .select('id');

    let nCancelados = cancelados?.length ?? 0;

    // Fallback para reservas creadas antes de existir pago_id: usa el turno referenciado.
    if (nCancelados === 0 && pago.turno_id) {
      const { data: legacy } = await supabase
        .from('turnos')
        .update({ estado: 'cancelado' })
        .eq('id', pago.turno_id)
        .eq('estado', 'pendiente')
        .select('id');
      nCancelados = legacy?.length ?? 0;
    }

    turnosCancelados += nCancelados;

    // Cierra el pago para no volver a procesarlo.
    await supabase.from('pagos').update({ estado: 'rechazado' }).eq('id', pago.id);
    pagosCerrados++;
  }

  return NextResponse.json({
    limite: limiteISO,
    revisados: (pagosVencidos ?? []).length,
    turnosCancelados,
    pagosCerrados,
  });
}
