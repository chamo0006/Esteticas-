import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { getArgentinaRanges } from '@/lib/argentina-time';
import { Calendar, Users, DollarSign, Clock, TrendingUp, CheckCircle2 } from 'lucide-react';

const MONTHS  = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const WEEKDAYS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

function formatARS(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', minimumFractionDigits: 0,
  }).format(n);
}

function formatFecha(dt: string | Date) {
  const utc = new Date(dt);
  // Shift to Argentina time (UTC-3) and use UTC accessors so the result is
  // timezone-agnostic regardless of where the server is running.
  const ar = new Date(utc.getTime() - 3 * 60 * 60 * 1000);
  return `${WEEKDAYS[ar.getUTCDay()]} ${ar.getUTCDate()} ${MONTHS[ar.getUTCMonth()]} · ${ar.getUTCHours().toString().padStart(2,'0')}:${ar.getUTCMinutes().toString().padStart(2,'0')} hs`;
}

const ESTADO_STYLES: Record<string, string> = {
  pendiente:  'bg-amber-100 text-amber-700',
  confirmado: 'bg-blue-100 text-blue-700',
  completado: 'bg-emerald-100 text-emerald-700',
  cancelado:  'bg-red-100 text-red-700',
};

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

export default async function AdminDashboard({ params }: Props) {
  await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  if (!token) redirect('/admin/login');
  const payload = await verifyToken(token);
  if (!payload) redirect('/admin/login');
  const tenantId = payload.tenantId;

  const { todayStart, todayEnd, monthStart, nowIso } = getArgentinaRanges();

  const [
    turnosHoyResult,
    pendientesResult,
    totalClientesResult,
    pagosHoyResult,
    pagosMesResult,
    proximosResult,
  ] = await Promise.all([
    supabase
      .from('turnos')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .neq('estado', 'cancelado')
      .gte('fecha_hora', todayStart)
      .lte('fecha_hora', todayEnd),

    supabase
      .from('turnos')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('estado', 'pendiente'),

    supabase
      .from('clientes')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId),

    supabase
      .from('pagos')
      .select('monto')
      .eq('tenant_id', tenantId)
      .eq('estado', 'acreditado')
      .gte('created_at', todayStart)
      .lte('created_at', todayEnd),

    supabase
      .from('pagos')
      .select('monto')
      .eq('tenant_id', tenantId)
      .eq('estado', 'acreditado')
      .gte('created_at', monthStart),

    supabase
      .from('turnos')
      .select('id, fecha_hora, estado, clientes(nombre), servicios(nombre, precio)')
      .eq('tenant_id', tenantId)
      .gte('fecha_hora', nowIso)
      .not('estado', 'in', '("cancelado","completado")')
      .order('fecha_hora')
      .limit(6),
  ]);

  const ingresosHoy = (pagosHoyResult.data ?? []).reduce((s, p) => s + Number(p.monto), 0);
  const ingresosMes = (pagosMesResult.data ?? []).reduce((s, p) => s + Number(p.monto), 0);

  const stats = [
    { label: 'Turnos hoy',      value: turnosHoyResult.count ?? 0,   icon: Calendar,    color: 'text-violet-500 bg-violet-50'  },
    { label: 'Pendientes',      value: pendientesResult.count ?? 0,  icon: Clock,       color: 'text-amber-500 bg-amber-50'    },
    { label: 'Ingresos hoy',    value: formatARS(ingresosHoy),       icon: DollarSign,  color: 'text-emerald-500 bg-emerald-50'},
    { label: 'Ingresos del mes',value: formatARS(ingresosMes),       icon: TrendingUp,  color: 'text-blue-500 bg-blue-50'      },
    { label: 'Total clientes',  value: totalClientesResult.count ?? 0, icon: Users,     color: 'text-pink-500 bg-pink-50'      },
  ];

  const proximos = (proximosResult.data ?? []).map((t) => {
    const cliente = t.clientes as unknown as { nombre: string } | null;
    const servicio = t.servicios as unknown as { nombre: string; precio: number } | null;
    return {
      id: t.id,
      fecha_hora: t.fecha_hora,
      estado: t.estado,
      cliente: cliente?.nombre ?? '—',
      servicio: servicio?.nombre ?? '—',
      precio: servicio?.precio ?? 0,
    };
  });

  const fechaHoy = new Date().toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    timeZone: 'America/Argentina/Buenos_Aires',
  });

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1 capitalize">{fechaHoy}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.color}`}>
              <s.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5 font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Próximos turnos */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <h2 className="font-semibold text-gray-900">Próximos turnos</h2>
          </div>
          <a href={`/admin/${payload.tenantSlug}/turnos`} className="text-xs text-violet-600 hover:underline font-medium">
            Ver todos →
          </a>
        </div>

        {proximos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <CheckCircle2 className="w-8 h-8 mb-2 text-gray-200" />
            <p className="text-sm">No hay turnos próximos</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {proximos.map((t) => (
              <div key={t.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-violet-600">
                      {t.cliente.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{t.cliente}</p>
                    <p className="text-xs text-gray-400">{t.servicio} · {formatFecha(t.fecha_hora)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-sm font-semibold text-gray-700">{formatARS(Number(t.precio))}</span>
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${ESTADO_STYLES[t.estado]}`}>
                    {t.estado}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
