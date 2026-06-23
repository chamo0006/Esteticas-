'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Shield, Users, Scissors, Sparkles, Search, LogOut, Eye, Loader2,
  TrendingUp, Inbox, AlertTriangle, ChevronRight,
} from 'lucide-react';

export interface TenantRow {
  id: string;
  nombre: string;
  slug: string;
  tipo_negocio: string;
  activo: boolean;
  estado_suscripcion: string | null;
  vencimiento: string | null;
  dias_para_vencer: number | null;
  bloqueado: boolean;
  plan_nombre: string | null;
  turnos_total: number;
  dinero_movido: number;
}

export interface LeadRow {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  estetica: string | null;
  created_at: string;
}

interface Props {
  rol: string;
  canSeeBilling: boolean;
  stats: {
    total: number;
    activos: number;
    esteticas: number;
    barberias: number;
    turnos: number;
    leads: number;
    ingresosMes: number;
  };
  tenants: TenantRow[];
  leads: LeadRow[];
}

function formatARS(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n);
}

function formatFecha(dt: string) {
  return new Date(dt).toLocaleDateString('es-AR');
}

// Semáforo de vencimiento
function semaforo(t: TenantRow): { label: string; cls: string } {
  if (t.bloqueado || t.estado_suscripcion === 'suspendida') return { label: 'Bloqueado', cls: 'bg-red-500/15 text-red-400 border-red-500/30' };
  if (t.estado_suscripcion === 'cancelada') return { label: 'Cancelada', cls: 'bg-zinc-700 text-zinc-300 border-zinc-600' };
  if (t.estado_suscripcion === 'trial') return { label: 'Trial', cls: 'bg-violet-500/15 text-violet-300 border-violet-500/30' };
  const d = t.dias_para_vencer;
  if (d == null) return { label: 'Sin límite', cls: 'bg-zinc-700 text-zinc-300 border-zinc-600' };
  if (d < 0) return { label: `Vencida (${Math.abs(d)}d)`, cls: 'bg-red-500/15 text-red-400 border-red-500/30' };
  if (d <= 3) return { label: `Vence en ${d}d`, cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' };
  if (d <= 7) return { label: `Vence en ${d}d`, cls: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30' };
  return { label: `${d}d`, cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
}

const RUBROS = [
  { key: 'todos', label: 'Todos' },
  { key: 'estetica', label: 'Estéticas' },
  { key: 'barberia', label: 'Barberías' },
] as const;

export function SuperadminDashboard({ rol, canSeeBilling, stats, tenants, leads }: Props) {
  const router = useRouter();
  const [rubro, setRubro] = useState<string>('todos');
  const [search, setSearch] = useState('');
  const [impersonando, setImpersonando] = useState<string | null>(null);

  const filtrados = tenants.filter((t) =>
    (rubro === 'todos' || t.tipo_negocio === rubro) &&
    (t.nombre.toLowerCase().includes(search.toLowerCase()) || t.slug.toLowerCase().includes(search.toLowerCase()))
  );

  const porVencer = tenants
    .filter((t) => !t.bloqueado && t.dias_para_vencer != null && t.dias_para_vencer <= 7)
    .sort((a, b) => (a.dias_para_vencer ?? 0) - (b.dias_para_vencer ?? 0));

  const impersonar = async (t: TenantRow) => {
    setImpersonando(t.id);
    const res = await fetch('/api/superadmin/impersonate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: t.id }),
    });
    if (res.ok) {
      router.push(`/admin/${t.slug}`);
    } else {
      setImpersonando(null);
      alert('No se pudo impersonar el comercio.');
    }
  };

  const logout = async () => {
    await fetch('/api/superadmin/logout', { method: 'POST' });
    router.push('/superadmin/login');
    router.refresh();
  };

  const statCards = [
    { label: 'Comercios', value: stats.total, icon: Users },
    { label: 'Activos', value: stats.activos, icon: Shield },
    { label: 'Estéticas', value: stats.esteticas, icon: Sparkles },
    { label: 'Barberías', value: stats.barberias, icon: Scissors },
    { label: 'Turnos totales', value: stats.turnos, icon: TrendingUp },
    { label: 'Leads', value: stats.leads, icon: Inbox },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Super Admin</h1>
              <p className="text-zinc-400 text-xs capitalize">Rol: {rol}</p>
            </div>
          </div>
          <button onClick={logout} className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white px-3 py-2 rounded-lg hover:bg-zinc-900 transition-colors">
            <LogOut className="w-4 h-4" /> Salir
          </button>
        </div>

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
          <div className="bg-gradient-to-br from-violet-900/40 to-zinc-900 border border-violet-800/40 rounded-2xl p-5 mb-6">
            <p className="text-xs text-violet-300 mb-1">Ingresos por suscripciones (este mes)</p>
            <p className="text-3xl font-bold text-white">{formatARS(stats.ingresosMes)}</p>
          </div>
        )}

        {/* Alertas de vencimiento */}
        {canSeeBilling && porVencer.length > 0 && (
          <div className="bg-amber-950/30 border border-amber-900/50 rounded-2xl p-4 mb-6">
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

        {/* Filtros rubro */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
            {RUBROS.map((r) => (
              <button key={r.key} onClick={() => setRubro(r.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${rubro === r.key ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'}`}>
                {r.label}
              </button>
            ))}
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar comercio..."
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
        </div>

        {/* Tabla de comercios */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead>
                <tr className="border-b border-zinc-800 text-left">
                  {['Comercio', 'Rubro', 'Plan', 'Estado', 'Turnos', ...(canSeeBilling ? ['Dinero movido'] : []), 'Acciones'].map((h) => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {filtrados.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-zinc-500">Sin comercios</td></tr>
                ) : filtrados.map((t) => {
                  const s = semaforo(t);
                  return (
                    <tr key={t.id} className="hover:bg-zinc-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/superadmin/comercios/${t.id}`} className="font-medium text-white hover:text-violet-300">
                          {t.nombre}
                        </Link>
                        <p className="text-xs text-zinc-500">/{t.slug}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-zinc-400 capitalize flex items-center gap-1">
                          {t.tipo_negocio === 'barberia' ? <Scissors className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                          {t.tipo_negocio}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-300">{t.plan_nombre ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2.5 py-1 rounded-lg border ${s.cls}`}>{s.label}</span>
                      </td>
                      <td className="px-4 py-3 text-zinc-300">{t.turnos_total}</td>
                      {canSeeBilling && <td className="px-4 py-3 text-zinc-300">{formatARS(t.dinero_movido)}</td>}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {rol === 'superadmin' && (
                            <button onClick={() => impersonar(t)} disabled={impersonando === t.id}
                              title="Entrar como este comercio"
                              className="flex items-center gap-1 text-xs text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-2.5 py-1.5 rounded-lg transition-colors">
                              {impersonando === t.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                              Entrar
                            </button>
                          )}
                          <Link href={`/superadmin/comercios/${t.id}`}
                            className="flex items-center text-xs text-zinc-400 hover:text-white px-2 py-1.5 rounded-lg hover:bg-zinc-800">
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

        {/* Leads */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Inbox className="w-4 h-4 text-violet-400" />
              <h2 className="font-semibold text-white text-sm">Leads — Landing principal</h2>
            </div>
            <Link href="/admin/leads" className="text-xs text-violet-400 hover:text-violet-300">Gestionar →</Link>
          </div>
          {leads.length === 0 ? (
            <div className="py-10 text-center text-zinc-500 text-sm">Todavía no hay leads</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr className="border-b border-zinc-800 text-left">
                    {['Nombre', 'Email', 'Teléfono', 'Estética', 'Fecha'].map((h) => (
                      <th key={h} className="px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {leads.slice(0, 10).map((l) => (
                    <tr key={l.id} className="hover:bg-zinc-800/40">
                      <td className="px-5 py-3 font-medium text-white">{l.nombre}</td>
                      <td className="px-5 py-3 text-violet-400 text-xs">{l.email}</td>
                      <td className="px-5 py-3 text-zinc-400 text-xs">{l.telefono ?? '—'}</td>
                      <td className="px-5 py-3 text-zinc-400 text-xs">{l.estetica ?? '—'}</td>
                      <td className="px-5 py-3 text-zinc-500 text-xs">{formatFecha(l.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
