'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Trash2, Plus, Loader2, Package } from 'lucide-react';
import { formatARS } from './types';

export interface Plan {
  id: string;
  slug: string;
  nombre: string;
  descripcion: string | null;
  precio_mensual: number;
  precio_anual: number | null;
  max_profesionales: number | null;
  features: string[];
  activo: boolean;
  orden: number;
}

const input = 'w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500';
const label = 'block text-xs text-zinc-400 mb-1';

function PlanCard({ plan, isSuperadmin, onChanged }: { plan: Plan; isSuperadmin: boolean; onChanged: () => void }) {
  const [f, setF] = useState({
    nombre: plan.nombre,
    descripcion: plan.descripcion ?? '',
    precio_mensual: String(plan.precio_mensual),
    precio_anual: plan.precio_anual != null ? String(plan.precio_anual) : '',
    max_profesionales: plan.max_profesionales != null ? String(plan.max_profesionales) : '',
    features: (plan.features ?? []).join('\n'),
    activo: plan.activo,
    orden: String(plan.orden),
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const save = async () => {
    setBusy(true); setMsg(null);
    const res = await fetch(`/api/superadmin/planes/${plan.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...f,
        features: f.features.split('\n').map((s) => s.trim()).filter(Boolean),
      }),
    });
    setBusy(false);
    if (res.ok) { setMsg('Guardado ✓'); onChanged(); setTimeout(() => setMsg(null), 1500); }
    else setMsg((await res.json().catch(() => ({}))).error ?? 'Error');
  };

  const eliminar = async () => {
    if (!confirm(`¿Eliminar el plan "${plan.nombre}"?`)) return;
    setBusy(true); setMsg(null);
    const res = await fetch(`/api/superadmin/planes/${plan.id}`, { method: 'DELETE' });
    setBusy(false);
    if (res.ok) onChanged();
    else setMsg((await res.json().catch(() => ({}))).error ?? 'Error');
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-violet-400" />
          <span className="text-xs text-zinc-500 font-mono">/{plan.slug}</span>
        </div>
        <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
          <input type="checkbox" checked={f.activo} onChange={(e) => setF({ ...f, activo: e.target.checked })} />
          Activo
        </label>
      </div>

      <div className="space-y-3">
        <div>
          <label className={label}>Nombre</label>
          <input className={input} value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Precio mensual</label>
            <input type="number" className={input} value={f.precio_mensual} onChange={(e) => setF({ ...f, precio_mensual: e.target.value })} />
            <p className="text-[11px] text-zinc-500 mt-1">{formatARS(Number(f.precio_mensual) || 0)}/mes</p>
          </div>
          <div>
            <label className={label}>Precio anual</label>
            <input type="number" className={input} placeholder="(opcional)" value={f.precio_anual} onChange={(e) => setF({ ...f, precio_anual: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Máx. profesionales</label>
            <input type="number" className={input} placeholder="∞" value={f.max_profesionales} onChange={(e) => setF({ ...f, max_profesionales: e.target.value })} />
          </div>
          <div>
            <label className={label}>Orden</label>
            <input type="number" className={input} value={f.orden} onChange={(e) => setF({ ...f, orden: e.target.value })} />
          </div>
        </div>
        <div>
          <label className={label}>Descripción</label>
          <input className={input} value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} />
        </div>
        <div>
          <label className={label}>Características (una por línea)</label>
          <textarea className={input} rows={4} value={f.features} onChange={(e) => setF({ ...f, features: e.target.value })} />
        </div>
      </div>

      {msg && <p className="text-xs text-violet-300 mt-3">{msg}</p>}

      <div className="flex gap-2 mt-4">
        <button onClick={save} disabled={busy}
          className="flex-1 flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white py-2 rounded-lg text-sm font-semibold">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar
        </button>
        {isSuperadmin && (
          <button onClick={eliminar} disabled={busy} title="Eliminar plan"
            className="px-3 py-2 rounded-lg text-red-400 hover:bg-red-500/10 border border-red-900/40">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export function PlanesAdmin({ planes, isSuperadmin }: { planes: Plan[]; isSuperadmin: boolean }) {
  const router = useRouter();
  const [creando, setCreando] = useState(false);
  const [nuevo, setNuevo] = useState({ slug: '', nombre: '', precio_mensual: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onChanged = () => router.refresh();

  const crear = async () => {
    setBusy(true); setErr(null);
    const res = await fetch('/api/superadmin/planes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...nuevo, precio_mensual: Number(nuevo.precio_mensual) || 0, orden: planes.length + 1 }),
    });
    setBusy(false);
    if (res.ok) { setCreando(false); setNuevo({ slug: '', nombre: '', precio_mensual: '' }); router.refresh(); }
    else setErr((await res.json().catch(() => ({}))).error ?? 'Error');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Planes</h1>
        <button onClick={() => setCreando((v) => !v)}
          className="flex items-center gap-2 text-sm bg-violet-600 hover:bg-violet-500 text-white px-3 py-2 rounded-xl">
          <Plus className="w-4 h-4" /> Nuevo plan
        </button>
      </div>

      {creando && (
        <div className="bg-zinc-900 border border-violet-800/40 rounded-2xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-white mb-3">Nuevo plan</h2>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className={label}>Slug (ej: premium)</label>
              <input className={input} value={nuevo.slug} onChange={(e) => setNuevo({ ...nuevo, slug: e.target.value })} />
            </div>
            <div>
              <label className={label}>Nombre</label>
              <input className={input} value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} />
            </div>
            <div>
              <label className={label}>Precio mensual</label>
              <input type="number" className={input} value={nuevo.precio_mensual} onChange={(e) => setNuevo({ ...nuevo, precio_mensual: e.target.value })} />
            </div>
          </div>
          {err && <p className="text-xs text-red-400 mt-2">{err}</p>}
          <button onClick={crear} disabled={busy || !nuevo.slug || !nuevo.nombre}
            className="mt-3 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Crear plan
          </button>
        </div>
      )}

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {planes.map((p) => <PlanCard key={p.id} plan={p} isSuperadmin={isSuperadmin} onChanged={onChanged} />)}
        {planes.length === 0 && <p className="text-zinc-500 text-sm">No hay planes cargados.</p>}
      </div>
    </div>
  );
}
