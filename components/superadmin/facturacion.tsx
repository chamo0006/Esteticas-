'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, DollarSign, AlertTriangle, Clock, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type TenantRow, formatARS, formatFecha, semaforo } from './types';

export interface PagoRow {
  id: string;
  tenant_id: string;
  tenant_nombre: string;
  tenant_slug: string;
  monto: number;
  metodo: string;
  estado: string;
  periodo_fin: string | null;
  fecha_pago: string | null;
  created_at: string;
}

interface Props {
  stats: { cobradoMes: number; cobradoMesPasado: number; pendientes: number; morosos: number };
  pagos: PagoRow[];
  morosos: TenantRow[];
  proximos: TenantRow[];
}

const ESTADO_CLS: Record<string, string> = {
  aprobado: 'text-[#94ab73]', pendiente: 'text-[#cf9a45]', vencido: 'text-[#d1806b]', rechazado: 'text-[#7c745f]',
};

const FILTROS = ['todos', 'aprobado', 'pendiente', 'vencido', 'rechazado'] as const;

export function Facturacion({ stats, pagos, morosos, proximos }: Props) {
  const [filtro, setFiltro] = useState<string>('todos');
  const [search, setSearch] = useState('');

  const variacion = stats.cobradoMesPasado > 0
    ? Math.round(((stats.cobradoMes - stats.cobradoMesPasado) / stats.cobradoMesPasado) * 100)
    : null;

  const pagosFiltrados = useMemo(() =>
    pagos.filter((p) =>
      (filtro === 'todos' || p.estado === filtro) &&
      p.tenant_nombre.toLowerCase().includes(search.toLowerCase())
    ), [pagos, filtro, search]);

  return (
    <div>
      <h1 className="text-3xl font-serif font-medium tracking-tight text-[#f2ede1] mb-6">Facturación</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-[#221d14] border border-[#4b3f24]/40 rounded-2xl p-5">
          <p className="text-xs text-[#dcc48a] mb-1 flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" /> Cobrado este mes</p>
          <p className="text-2xl font-serif font-semibold text-[#f2ede1]">{formatARS(stats.cobradoMes)}</p>
          {variacion != null && (
            <p className={cn('text-xs mt-1 flex items-center gap-1', variacion >= 0 ? 'text-[#94ab73]' : 'text-[#d1806b]')}>
              <TrendingUp className="w-3 h-3" /> {variacion >= 0 ? '+' : ''}{variacion}% vs mes pasado
            </p>
          )}
        </div>
        <div className="bg-[#1c1a15] border border-[#2c261d] rounded-2xl p-5">
          <p className="text-xs text-[#a89d86] mb-1">Mes pasado</p>
          <p className="text-2xl font-serif font-semibold text-[#f2ede1]">{formatARS(stats.cobradoMesPasado)}</p>
        </div>
        <div className="bg-[#1c1a15] border border-[#443318]/40 rounded-2xl p-5">
          <p className="text-xs text-[#e0b45f] mb-1 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Pagos pendientes</p>
          <p className="text-2xl font-serif font-semibold text-[#f2ede1]">{stats.pendientes}</p>
        </div>
        <div className="bg-[#1c1a15] border border-[#4a281f]/40 rounded-2xl p-5">
          <p className="text-xs text-[#d99a86] mb-1 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Morosos</p>
          <p className="text-2xl font-serif font-semibold text-[#f2ede1]">{stats.morosos}</p>
        </div>
      </div>

      {/* Morosos + próximos a vencer */}
      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-[#1c1a15] border border-[#2c261d] rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-[#d99a86] mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Morosos / vencidos</h2>
          {morosos.length === 0 ? (
            <p className="text-sm text-[#7c745f]">Nadie en mora 🎉</p>
          ) : (
            <div className="space-y-2">
              {morosos.map((t) => (
                <Link key={t.id} href={`/superadmin/comercios/${t.id}`}
                  className="flex items-center justify-between p-2.5 rounded-lg hover:bg-[#241f18] transition-colors">
                  <span className="text-sm text-[#f2ede1]">{t.nombre}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-lg border ${semaforo(t).cls}`}>{semaforo(t).label}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
        <div className="bg-[#1c1a15] border border-[#2c261d] rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-[#e0b45f] mb-3 flex items-center gap-2"><Clock className="w-4 h-4" /> Próximos a vencer (7 días)</h2>
          {proximos.length === 0 ? (
            <p className="text-sm text-[#7c745f]">Sin vencimientos próximos.</p>
          ) : (
            <div className="space-y-2">
              {proximos.map((t) => (
                <Link key={t.id} href={`/superadmin/comercios/${t.id}`}
                  className="flex items-center justify-between p-2.5 rounded-lg hover:bg-[#241f18] transition-colors">
                  <span className="text-sm text-[#f2ede1]">{t.nombre}</span>
                  <span className="text-xs text-[#a89d86]">{t.vencimiento ? formatFecha(t.vencimiento) : '—'}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Todos los pagos */}
      <div className="flex flex-col sm:flex-row gap-3 mb-3">
        <div className="flex gap-1 bg-[#1c1a15] border border-[#2c261d] rounded-xl p-1 flex-wrap">
          {FILTROS.map((f) => (
            <button key={f} onClick={() => setFiltro(f)}
              className={cn('px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors',
                filtro === f ? 'bg-[#c9a86a] text-[#1a1710]' : 'text-[#a89d86] hover:text-[#f2ede1]')}>
              {f}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7c745f]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por comercio..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#1c1a15] border border-[#2c261d] rounded-xl text-sm text-[#f2ede1] focus:outline-none focus:ring-2 focus:ring-[#c9a86a]" />
        </div>
      </div>

      <div className="bg-[#1c1a15] border border-[#2c261d] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="border-b border-[#2c261d] text-left">
                {['Comercio', 'Monto', 'Método', 'Estado', 'Cubre hasta', 'Fecha'].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-[#7c745f] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2c261d]/50">
              {pagosFiltrados.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-[#7c745f]">Sin pagos</td></tr>
              ) : pagosFiltrados.map((p) => (
                <tr key={p.id} className="hover:bg-[#241f18]/40 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/superadmin/comercios/${p.tenant_id}`} className="text-[#f2ede1] hover:text-[#dcc48a]">{p.tenant_nombre}</Link>
                  </td>
                  <td className="px-4 py-3 text-[#f2ede1] font-medium">{formatARS(Number(p.monto))}</td>
                  <td className="px-4 py-3 text-[#a89d86] capitalize">{p.metodo}</td>
                  <td className="px-4 py-3"><span className={cn('font-semibold capitalize', ESTADO_CLS[p.estado] ?? 'text-[#a89d86]')}>{p.estado}</span></td>
                  <td className="px-4 py-3 text-[#a89d86]">{p.periodo_fin ? formatFecha(p.periodo_fin) : '—'}</td>
                  <td className="px-4 py-3 text-[#7c745f]">{formatFecha(p.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
