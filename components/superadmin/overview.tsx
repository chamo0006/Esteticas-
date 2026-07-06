'use client';

import Link from 'next/link';
import {
  Users, Shield, Sparkles, Scissors, TrendingUp, Inbox, AlertTriangle, DollarSign,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  AreaChart, Area,
} from 'recharts';
import { type TenantRow, type PuntoMes, formatARS, semaforo } from './types';

interface Props {
  canSeeBilling: boolean;
  stats: {
    total: number; activos: number; esteticas: number; barberias: number;
    turnos: number; leads: number; ingresosMes: number;
    morosos: number; trials: number;
  };
  porVencer: TenantRow[];
  ingresosPorMes: PuntoMes[];
  comerciosPorMes: PuntoMes[];
}

const tooltipStyle = {
  backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: 12, fontSize: 12, color: '#fff',
};

export function SuperadminOverview({ canSeeBilling, stats, porVencer, ingresosPorMes, comerciosPorMes }: Props) {
  const statCards = [
    { label: 'Comercios', value: stats.total, icon: Users },
    { label: 'Activos', value: stats.activos, icon: Shield },
    { label: 'Estéticas', value: stats.esteticas, icon: Sparkles },
    { label: 'Barberías', value: stats.barberias, icon: Scissors },
    { label: 'Turnos totales', value: stats.turnos, icon: TrendingUp },
    { label: 'Leads', value: stats.leads, icon: Inbox },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {statCards.map((s) => (
          <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <s.icon className="w-4 h-4 text-zinc-500 mb-2" />
            <p className="text-2xl font-bold text-white">{s.value}</p>
            <p className="text-xs text-zinc-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {canSeeBilling && (
        <div className="grid sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-gradient-to-br from-violet-900/40 to-zinc-900 border border-violet-800/40 rounded-2xl p-5">
            <p className="text-xs text-violet-300 mb-1">Cobrado este mes</p>
            <p className="text-3xl font-bold text-white">{formatARS(stats.ingresosMes)}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <p className="text-xs text-zinc-400 mb-1">En prueba (trial)</p>
            <p className="text-3xl font-bold text-white">{stats.trials}</p>
          </div>
          <div className="bg-zinc-900 border border-red-900/40 rounded-2xl p-5">
            <p className="text-xs text-red-300 mb-1">Morosos / bloqueados</p>
            <p className="text-3xl font-bold text-white">{stats.morosos}</p>
          </div>
        </div>
      )}

      {/* Gráficos */}
      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        {canSeeBilling && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" /> Ingresos por mes
            </h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={ingresosPorMes} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="mes" tick={{ fill: '#a1a1aa', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#a1a1aa', fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`)} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [formatARS(v), 'Cobrado']}
                  cursor={{ fill: '#ffffff08' }} />
                <Bar dataKey="valor" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-violet-400" /> Comercios nuevos por mes
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={comerciosPorMes} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="gradComercios" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="mes" tick={{ fill: '#a1a1aa', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#a1a1aa', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [v, 'Nuevos']}
                cursor={{ stroke: '#ffffff20' }} />
              <Area type="monotone" dataKey="valor" stroke="#8b5cf6" strokeWidth={2} fill="url(#gradComercios)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Próximos vencimientos */}
      {canSeeBilling && porVencer.length > 0 && (
        <div className="bg-amber-950/30 border border-amber-900/50 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-amber-200">Próximos vencimientos</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {porVencer.map((t) => {
              const s = semaforo(t);
              return (
                <Link key={t.id} href={`/superadmin/comercios/${t.id}`}
                  className={`text-xs px-3 py-1.5 rounded-lg border ${s.cls} hover:opacity-80`}>
                  {t.nombre} · {s.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
