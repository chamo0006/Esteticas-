import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { enviarRecordatorio } from '@/lib/email';

const MONTHS   = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const WEEKDAYS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

// Argentina es UTC-3 (sin horario de verano). El servidor en producción corre
// en UTC, así que trabajamos siempre en hora argentina explícitamente.
const AR_OFFSET_MS = -3 * 60 * 60 * 1000;

function formatFecha(dt: Date) {
  const ar = new Date(dt.getTime() + AR_OFFSET_MS);
  return `${WEEKDAYS[ar.getUTCDay()]} ${ar.getUTCDate()} de ${MONTHS[ar.getUTCMonth()]}`;
}
function formatHora(dt: Date) {
  const ar = new Date(dt.getTime() + AR_OFFSET_MS);
  return `${ar.getUTCHours().toString().padStart(2,'0')}:${ar.getUTCMinutes().toString().padStart(2,'0')}`;
}

// Vercel Cron llama este endpoint todos los días a las 10:00 AM
// Envía recordatorios a los clientes con turnos para el día siguiente
export async function GET(req: Request) {
  // Verifica el secret del cron para que no sea accesible públicamente
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  // "Mañana" en hora argentina (no UTC), para no perder turnos de la noche.
  const ahoraAR  = new Date(Date.now() + AR_OFFSET_MS);
  const mañanaAR = new Date(ahoraAR.getTime() + 86_400_000);
  const y  = mañanaAR.getUTCFullYear();
  const mo = String(mañanaAR.getUTCMonth() + 1).padStart(2, '0');
  const d  = String(mañanaAR.getUTCDate()).padStart(2, '0');
  const fechaMañana = `${y}-${mo}-${d}`;

  // Límites del día argentino convertidos a instantes UTC para comparar en la DB.
  const dayStart = new Date(`${fechaMañana}T00:00:00-03:00`).toISOString();
  const dayEnd   = new Date(`${fechaMañana}T23:59:59-03:00`).toISOString();

  const { data, error } = await supabase
    .from('turnos')
    .select(`
      id,
      fecha_hora,
      clientes!inner(nombre, email),
      servicios!inner(nombre),
      tenants!inner(nombre)
    `)
    .gte('fecha_hora', dayStart)
    .lte('fecha_hora', dayEnd)
    .in('estado', ['pendiente', 'confirmado'])
    .not('clientes.email', 'is', null);

  if (error) {
    console.error('[recordatorios]', error);
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
      await enviarRecordatorio(cliente.email, {
        clienteNombre: cliente.nombre,
        tenantNombre:  tenant.nombre,
        servicios:     [servicio.nombre],
        fecha:         formatFecha(dt),
        hora:          formatHora(dt),
      });
      enviados++;
    } catch {
      errores++;
    }
  }

  return NextResponse.json({
    fecha: fechaMañana,
    total: (data ?? []).length,
    enviados,
    errores,
  });
}
