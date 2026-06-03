import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { enviarRecordatorio } from '@/lib/email';

const MONTHS   = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const WEEKDAYS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

function formatFecha(dt: Date) {
  return `${WEEKDAYS[dt.getDay()]} ${dt.getDate()} de ${MONTHS[dt.getMonth()]}`;
}
function formatHora(dt: Date) {
  return `${dt.getHours().toString().padStart(2,'0')}:${dt.getMinutes().toString().padStart(2,'0')}`;
}

// Vercel Cron llama este endpoint todos los días a las 10:00 AM
// Envía recordatorios a los clientes con turnos para el día siguiente
export async function GET(req: Request) {
  // Verifica el secret del cron para que no sea accesible públicamente
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const mañana = new Date();
  mañana.setDate(mañana.getDate() + 1);
  const fechaMañana = mañana.toISOString().split('T')[0];

  const dayStart = `${fechaMañana}T00:00:00.000Z`;
  const dayEnd   = `${fechaMañana}T23:59:59.999Z`;

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
