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

const input = 'w-full px-3 py-2 bg-[#241f18] border border-[#3a3327] rounded-lg text-sm text-[#f2ede1] focus:outline-none focus:ring-2 focus:ring-[#c9a86a]';
const label = 'block text-xs text-[#a89d86] mb-1';

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
    <div className="bg-[#1c1a15] border border-[#2c261d] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-[#c9a86a]" />
          <span className="text-xs text-[#7c745f] font-mono">/{plan.slug}</span>
        </div>
        <label className="flex items-center gap-2 text-xs text-[#a89d86] cursor-pointer">
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
            <p className="text-[11px] text-[#7c745f] mt-1">{formatARS(Number(f.precio_mensual) || 0)}/mes</p>
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

      {msg && <p className="text-xs text-[#dcc48a] mt-3">{msg}</p>}

      <div className="flex gap-2 mt-4">
        <button onClick={save} disabled={busy}
          className="flex-1 flex items-center justify-center gap-2 bg-[#c9a86a] hover:bg-[#d8b877] text-[#1a1710] py-2 rounded-lg text-sm font-semibold">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar
        </button>
        {isSuperadmin && (
          <button onClick={eliminar} disabled={busy} title="Eliminar plan"
            className="px-3 py-2 rounded-lg text-[#d1806b] hover:bg-[#c26350]/10 border border-[#4a281f]/40">
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
        <h1 className="text-3xl font-serif font-medium tracking-tight text-[#f2ede1]">Planes</h1>
        <button onClick={() => setCreando((v) => !v)}
          className="flex items-center gap-2 text-sm bg-[#c9a86a] hover:bg-[#d8b877] text-[#1a1710] px-3 py-2 rounded-xl">
          <Plus className="w-4 h-4" /> Nuevo plan
        </button>
      </div>

      {creando && (
        <div className="bg-[#1c1a15] border border-[#4b3f24]/40 rounded-2xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-[#f2ede1] mb-3">Nuevo plan</h2>
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
          {err && <p className="text-xs text-[#d1806b] mt-2">{err}</p>}
          <button onClick={crear} disabled={busy || !nuevo.slug || !nuevo.nombre}
            className="mt-3 flex items-center gap-2 bg-[#5c7a46] hover:bg-[#6b8c52] disabled:opacity-50 text-[#f2ede1] px-4 py-2 rounded-lg text-sm font-semibold">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Crear plan
          </button>
        </div>
      )}

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {planes.map((p) => <PlanCard key={p.id} plan={p} isSuperadmin={isSuperadmin} onChanged={onChanged} />)}
        {planes.length === 0 && <p className="text-[#7c745f] text-sm">No hay planes cargados.</p>}
      </div>
    </div>
  );
}
