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
  backgroundColor: '#ffffff', border: '1px solid #f3f4f6', borderRadius: 12, fontSize: 12, color: '#111827',
  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
};

export function SuperadminOverview({ canSeeBilling, stats, porVencer, ingresosPorMes, comerciosPorMes }: Props) {
  const statCards = [
    { label: 'Comercios', value: stats.total, icon: Users, color: 'text-violet-500 bg-violet-50' },
    { label: 'Activos', value: stats.activos, icon: Shield, color: 'text-emerald-500 bg-emerald-50' },
    { label: 'Estéticas', value: stats.esteticas, icon: Sparkles, color: 'text-pink-500 bg-pink-50' },
    { label: 'Barberías', value: stats.barberias, icon: Scissors, color: 'text-blue-500 bg-blue-50' },
    { label: 'Turnos totales', value: stats.turnos, icon: TrendingUp, color: 'text-amber-500 bg-amber-50' },
    { label: 'Leads', value: stats.leads, icon: Inbox, color: 'text-gray-500 bg-gray-100' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {statCards.map((s) => (
          <div key={s.label} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${s.color}`}>
              <s.icon className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5 font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      {canSeeBilling && (
        <div className="grid sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-violet-50 border border-violet-100 rounded-2xl p-5">
            <p className="text-xs text-violet-600 font-medium mb-1">Ingresos este mes</p>
            <p className="text-3xl font-bold text-gray-900">{formatARS(stats.ingresosMes)}</p>
            <p className="text-[11px] text-violet-500 mt-1">Suscripciones + ventas manuales</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <p className="text-xs text-gray-400 font-medium mb-1">En prueba (trial)</p>
            <p className="text-3xl font-bold text-gray-900">{stats.trials}</p>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
            <p className="text-xs text-red-500 font-medium mb-1">Morosos / bloqueados</p>
            <p className="text-3xl font-bold text-gray-900">{stats.morosos}</p>
          </div>
        </div>
      )}

      {/* Gráficos */}
      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        {canSeeBilling && (
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-500" /> Ingresos por mes
            </h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={ingresosPorMes} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="mes" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`)} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [formatARS(v), 'Cobrado']}
                  cursor={{ fill: '#f5f3ff' }} />
                <Bar dataKey="valor" fill="#7c3aed" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-violet-500" /> Comercios nuevos por mes
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={comerciosPorMes} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="gradComercios" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="mes" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [v, 'Nuevos']}
                cursor={{ stroke: '#ede9fe' }} />
              <Area type="monotone" dataKey="valor" stroke="#7c3aed" strokeWidth={2} fill="url(#gradComercios)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Próximos vencimientos */}
      {canSeeBilling && porVencer.length > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-amber-800">Próximos vencimientos</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {porVencer.map((t) => {
              const s = semaforo(t);
              return (
                <Link key={t.id} href={`/superadmin/comercios/${t.id}`}
                  className={`text-xs px-3 py-1.5 rounded-lg border ${s.cls} hover:opacity-80 transition-opacity`}>
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
