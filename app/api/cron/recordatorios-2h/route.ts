import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { enviarRecordatorio2h } from '@/lib/email';

const MONTHS   = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const WEEKDAYS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

const AR_OFFSET_MS = -3 * 60 * 60 * 1000;

function formatFecha(dt: Date) {
  const ar = new Date(dt.getTime() + AR_OFFSET_MS);
  return `${WEEKDAYS[ar.getUTCDay()]} ${ar.getUTCDate()} de ${MONTHS[ar.getUTCMonth()]}`;
}
function formatHora(dt: Date) {
  const ar = new Date(dt.getTime() + AR_OFFSET_MS);
  return `${ar.getUTCHours().toString().padStart(2,'0')}:${ar.getUTCMinutes().toString().padStart(2,'0')}`;
}

// Llamado por un cron EXTERNO (ej. cron-job.org) cada 15 min — Vercel Hobby
// solo permite crons diarios, así que este endpoint no vive en vercel.json.
// Envía el recordatorio a los turnos que arrancan dentro de las próximas 2hs
// y todavía no lo recibieron (columna recordatorio_2h_enviado).
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const ahora = new Date();
  const limite = new Date(ahora.getTime() + 2 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from('turnos')
    .select(`
      id,
      fecha_hora,
      clientes!inner(nombre, email),
      servicios!inner(nombre),
      tenants!inner(nombre)
    `)
    .gt('fecha_hora', ahora.toISOString())
    .lte('fecha_hora', limite.toISOString())
    .eq('recordatorio_2h_enviado', false)
    .in('estado', ['pendiente', 'confirmado'])
    .not('clientes.email', 'is', null);

  if (error) {
    console.error('[recordatorios-2h]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }

  let enviados = 0;
  let errores = 0;

  for (const turno of data ?? []) {
    const cliente = turno.clientes as unknown as { nombre: string; email: string };
    const servicio = turno.servicios as unknown as { nombre: string };
    const tenant = turno.tenants as unknown as { nombre: string };

    if (!cliente?.email) continue;

    const dt = new Date(turno.fecha_hora);
    try {
      await enviarRecordatorio2h(cliente.email, {
        clienteNombre: cliente.nombre,
        tenantNombre:  tenant.nombre,
        servicios:     [servicio.nombre],
        fecha:         formatFecha(dt),
        hora:          formatHora(dt),
      });
      await supabase.from('turnos').update({ recordatorio_2h_enviado: true }).eq('id', turno.id);
      enviados++;
    } catch {
      errores++;
    }
  }

  return NextResponse.json({
    total: (data ?? []).length,
    enviados,
    errores,
  });
}
