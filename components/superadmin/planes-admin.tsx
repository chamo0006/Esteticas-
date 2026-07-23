'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Trash2, Plus, Loader2, Package, ChevronUp, ChevronDown } from 'lucide-react';
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

const input = 'w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-400';
const label = 'block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5';

function PlanCard({
  plan, isSuperadmin, onChanged, onMoveUp, onMoveDown, canMoveUp, canMoveDown, moving,
}: {
  plan: Plan; isSuperadmin: boolean; onChanged: () => void;
  onMoveUp: () => void; onMoveDown: () => void; canMoveUp: boolean; canMoveDown: boolean; moving: boolean;
}) {
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
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-violet-500" />
          <span className="text-xs text-gray-400 font-mono">/{plan.slug}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col -my-1">
            <button onClick={onMoveUp} disabled={!canMoveUp || moving} title="Mover antes"
              className="p-0.5 text-gray-300 hover:text-violet-600 disabled:opacity-30 disabled:hover:text-gray-300">
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button onClick={onMoveDown} disabled={!canMoveDown || moving} title="Mover después"
              className="p-0.5 text-gray-300 hover:text-violet-600 disabled:opacity-30 disabled:hover:text-gray-300">
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
          <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
            <input type="checkbox" checked={f.activo} onChange={(e) => setF({ ...f, activo: e.target.checked })} />
            Activo
          </label>
        </div>
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
            <p className="text-[11px] text-gray-400 mt-1">{formatARS(Number(f.precio_mensual) || 0)}/mes</p>
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

      {msg && <p className="text-xs text-violet-600 mt-3">{msg}</p>}

      <div className="flex gap-2 mt-4">
        <button onClick={save} disabled={busy}
          className="flex-1 flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white py-2 rounded-xl text-sm font-semibold transition-colors">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar
        </button>
        {isSuperadmin && (
          <button onClick={eliminar} disabled={busy} title="Eliminar plan"
            className="px-3 py-2 rounded-xl text-red-500 hover:bg-red-50 border border-red-100">
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
  const [movingId, setMovingId] = useState<string | null>(null);

  const ordenados = [...planes].sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre));

  const onChanged = () => router.refresh();

  // Reordena por posición y renumera todo 1..N — corrige de paso empates o huecos
  // en "orden" que puedan haber quedado de ediciones manuales previas.
  const mover = async (index: number, dir: -1 | 1) => {
    const destino = index + dir;
    if (destino < 0 || destino >= ordenados.length) return;
    const reordenados = [...ordenados];
    [reordenados[index], reordenados[destino]] = [reordenados[destino], reordenados[index]];

    const actual = ordenados[index];
    setMovingId(actual.id);
    const cambios = reordenados
      .map((p, i) => ({ p, nuevoOrden: i + 1 }))
      .filter(({ p, nuevoOrden }) => p.orden !== nuevoOrden);

    const resultados = await Promise.all(cambios.map(({ p, nuevoOrden }) =>
      fetch(`/api/superadmin/planes/${p.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orden: nuevoOrden }),
      })
    ));
    setMovingId(null);
    if (resultados.every((r) => r.ok)) router.refresh();
  };

  const crear = async () => {
    setBusy(true); setErr(null);
    const res = await fetch('/api/superadmin/planes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...nuevo, precio_mensual: Number(nuevo.precio_mensual) || 0, orden: planes.reduce((m, p) => Math.max(m, p.orden), 0) + 1 }),
    });
    setBusy(false);
    if (res.ok) { setCreando(false); setNuevo({ slug: '', nombre: '', precio_mensual: '' }); router.refresh(); }
    else setErr((await res.json().catch(() => ({}))).error ?? 'Error');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Planes</h1>
        <button onClick={() => setCreando((v) => !v)}
          className="flex items-center gap-2 text-sm bg-violet-600 hover:bg-violet-500 text-white px-3 py-2 rounded-xl transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Nuevo plan
        </button>
      </div>

      {creando && (
        <div className="bg-violet-50 border border-violet-100 rounded-2xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Nuevo plan</h2>
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
          {err && <p className="text-xs text-red-500 mt-2">{err}</p>}
          <button onClick={crear} disabled={busy || !nuevo.slug || !nuevo.nombre}
            className="mt-3 flex items-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Crear plan
          </button>
        </div>
      )}

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {ordenados.map((p, i) => (
          <PlanCard key={p.id} plan={p} isSuperadmin={isSuperadmin} onChanged={onChanged}
            onMoveUp={() => mover(i, -1)} onMoveDown={() => mover(i, 1)}
            canMoveUp={i > 0} canMoveDown={i < ordenados.length - 1} moving={movingId === p.id} />
        ))}
        {ordenados.length === 0 && <p className="text-gray-400 text-sm">No hay planes cargados.</p>}
      </div>
    </div>
  );
}
