'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search, Eye, Loader2, ChevronRight, Scissors, Sparkles, Ban, CheckCircle,
  Download, ArrowUpDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { type TenantRow, formatARS, formatFecha, semaforo } from './types';

interface Props {
  rol: string;
  canSeeBilling: boolean;
  tenants: TenantRow[];
}

type SortKey = 'nombre' | 'turnos_total' | 'dinero_movido' | 'dias_para_vencer';

const RUBROS = [
  { key: 'todos', label: 'Todos' },
  { key: 'estetica', label: 'Estéticas' },
  { key: 'barberia', label: 'Barberías' },
] as const;

const ESTADOS = [
  { key: 'todos', label: 'Todos' },
  { key: 'trial', label: 'Trial' },
  { key: 'activa', label: 'Activas' },
  { key: 'vencida', label: 'Vencidas' },
  { key: 'bloqueada', label: 'Bloqueadas' },
] as const;

export function ComerciosTable({ rol, canSeeBilling, tenants }: Props) {
  const router = useRouter();
  const [rubro, setRubro] = useState<string>('todos');
  const [estado, setEstado] = useState<string>('todos');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'nombre', dir: 'asc' });
  const [busy, setBusy] = useState<string | null>(null);

  const filtrados = useMemo(() => {
    const matchEstado = (t: TenantRow) => {
      if (estado === 'todos') return true;
      if (estado === 'bloqueada') return t.bloqueado || t.estado_suscripcion === 'suspendida';
      if (estado === 'vencida') return !t.bloqueado && t.dias_para_vencer != null && t.dias_para_vencer < 0;
      return t.estado_suscripcion === estado;
    };
    const arr = tenants.filter((t) =>
      (rubro === 'todos' || t.tipo_negocio === rubro) &&
      matchEstado(t) &&
      (t.nombre.toLowerCase().includes(search.toLowerCase()) || t.slug.toLowerCase().includes(search.toLowerCase()))
    );
    const dir = sort.dir === 'asc' ? 1 : -1;
    return arr.sort((a, b) => {
      const av = a[sort.key], bv = b[sort.key];
      if (sort.key === 'nombre') return String(av).localeCompare(String(bv)) * dir;
      return ((Number(av ?? 0)) - (Number(bv ?? 0))) * dir;
    });
  }, [tenants, rubro, estado, search, sort]);

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));

  const impersonar = async (t: TenantRow) => {
    setBusy(t.id);
    const res = await fetch('/api/superadmin/impersonate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: t.id }),
    });
    if (res.ok) router.push(`/admin/${t.slug}`);
    else { setBusy(null); alert('No se pudo impersonar el comercio.'); }
  };

  const toggleBloqueo = async (t: TenantRow) => {
    const nuevo = !(t.bloqueado || t.estado_suscripcion === 'suspendida');
    if (!confirm(nuevo ? `¿Bloquear el acceso de ${t.nombre}?` : `¿Reactivar el acceso de ${t.nombre}?`)) return;
    setBusy(t.id);
    const res = await fetch(`/api/superadmin/tenants/${t.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bloqueado: nuevo, estado: nuevo ? 'suspendida' : 'activa' }),
    });
    setBusy(null);
    if (res.ok) router.refresh();
    else alert('No se pudo actualizar el estado.');
  };

  const exportCSV = () => {
    const headers = ['Nombre', 'Slug', 'Rubro', 'Plan', 'Estado', 'Vencimiento', 'Turnos', 'Dinero movido'];
    const rows = filtrados.map((t) => [
      t.nombre, t.slug, t.tipo_negocio, t.plan_nombre ?? '', semaforo(t).label,
      t.vencimiento ? formatFecha(t.vencimiento) : '', String(t.turnos_total), String(t.dinero_movido),
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comercios-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const th = (label: string, key?: SortKey) => (
    <th className="px-4 py-3 text-xs font-semibold text-[#7c745f] uppercase tracking-wider">
      {key ? (
        <button onClick={() => toggleSort(key)} className="flex items-center gap-1 hover:text-[#cabfa8]">
          {label} <ArrowUpDown className="w-3 h-3" />
        </button>
      ) : label}
    </th>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-serif font-medium tracking-tight text-[#f2ede1]">Comercios</h1>
        <button onClick={exportCSV}
          className="flex items-center gap-2 text-sm text-[#cabfa8] hover:text-[#f2ede1] bg-[#1c1a15] border border-[#2c261d] hover:bg-[#241f18] px-3 py-2 rounded-xl transition-colors">
          <Download className="w-4 h-4" /> Exportar CSV
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex gap-1 bg-[#1c1a15] border border-[#2c261d] rounded-xl p-1">
            {RUBROS.map((r) => (
              <button key={r.key} onClick={() => setRubro(r.key)}
                className={cn('px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  rubro === r.key ? 'bg-[#2f2a20] text-[#f2ede1]' : 'text-[#a89d86] hover:text-[#f2ede1]')}>
                {r.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1 bg-[#1c1a15] border border-[#2c261d] rounded-xl p-1 flex-wrap">
            {ESTADOS.map((e) => (
              <button key={e.key} onClick={() => setEstado(e.key)}
                className={cn('px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  estado === e.key ? 'bg-[#c9a86a] text-[#1a1710]' : 'text-[#a89d86] hover:text-[#f2ede1]')}>
                {e.label}
              </button>
            ))}
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7c745f]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar comercio..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#1c1a15] border border-[#2c261d] rounded-xl text-sm text-[#f2ede1] focus:outline-none focus:ring-2 focus:ring-[#c9a86a]" />
        </div>
      </div>

      <p className="text-xs text-[#7c745f] mb-2">{filtrados.length} comercio{filtrados.length !== 1 ? 's' : ''}</p>

      {/* Tabla */}
      <div className="bg-[#1c1a15] border border-[#2c261d] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[820px]">
            <thead>
              <tr className="border-b border-[#2c261d] text-left">
                {th('Comercio', 'nombre')}
                {th('Rubro')}
                {th('Plan')}
                {th('Estado', 'dias_para_vencer')}
                {th('Turnos', 'turnos_total')}
                {canSeeBilling && th('Dinero movido', 'dinero_movido')}
                {th('Acciones')}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2c261d]/50">
              {filtrados.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-[#7c745f]">Sin comercios</td></tr>
              ) : filtrados.map((t) => {
                const s = semaforo(t);
                const bloqueado = t.bloqueado || t.estado_suscripcion === 'suspendida';
                return (
                  <tr key={t.id} className="hover:bg-[#241f18]/40 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/superadmin/comercios/${t.id}`} className="font-medium text-[#f2ede1] hover:text-[#dcc48a]">
                        {t.nombre}
                      </Link>
                      <p className="text-xs text-[#7c745f]">/{t.slug}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-[#a89d86] capitalize flex items-center gap-1">
                        {t.tipo_negocio === 'barberia' ? <Scissors className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                        {t.tipo_negocio}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#cabfa8]">{t.plan_nombre ?? '—'}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2.5 py-1 rounded-lg border ${s.cls}`}>{s.label}</span></td>
                    <td className="px-4 py-3 text-[#cabfa8]">{t.turnos_total}</td>
                    {canSeeBilling && <td className="px-4 py-3 text-[#cabfa8]">{formatARS(t.dinero_movido)}</td>}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {rol === 'superadmin' && (
                          <button onClick={() => impersonar(t)} disabled={busy === t.id} title="Entrar como este comercio"
                            className="flex items-center gap-1 text-xs text-[#cabfa8] hover:text-[#f2ede1] bg-[#241f18] hover:bg-[#2f2a20] px-2.5 py-1.5 rounded-lg transition-colors">
                            {busy === t.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                            Entrar
                          </button>
                        )}
                        {canSeeBilling && (
                          <button onClick={() => toggleBloqueo(t)} disabled={busy === t.id}
                            title={bloqueado ? 'Reactivar' : 'Bloquear'}
                            className={cn('p-1.5 rounded-lg transition-colors',
                              bloqueado ? 'text-[#94ab73] hover:bg-[#6b8c52]/10' : 'text-[#d1806b] hover:bg-[#c26350]/10')}>
                            {bloqueado ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                          </button>
                        )}
                        <Link href={`/superadmin/comercios/${t.id}`}
                          className="flex items-center text-xs text-[#a89d86] hover:text-[#f2ede1] px-2 py-1.5 rounded-lg hover:bg-[#241f18]">
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
