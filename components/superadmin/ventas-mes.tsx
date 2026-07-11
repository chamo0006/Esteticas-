'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2, Pencil, Loader2, Receipt, Zap } from 'lucide-react';
import { cn, digitsOnly } from '@/lib/utils';
import { formatARS } from './types';

interface Venta {
  id: string;
  cliente: string;
  plan: string;
  monto: number;
  fecha_pago: string;
  fecha_vencimiento: string | null;
  notas: string | null;
  created_at: string;
  autor: string | null;
  automatico: boolean;
}

interface Props {
  clientesSugeridos?: string[];
  planesSugeridos?: string[];
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const EMPTY_FORM = { cliente: '', plan: '', monto: '', fecha_pago: '', fecha_vencimiento: '', notas: '' };

function mesKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function formatFechaCorta(fecha: string | null) {
  if (!fecha) return '—';
  const [, m, d] = fecha.split('-');
  return `${d}/${m}`;
}

// Fecha de pago + 1 mes calendario, para sugerir el vencimiento con un click.
function sugerirVencimiento(fechaPago: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaPago)) return '';
  const [y, m, d] = fechaPago.split('-').map(Number);
  const dt = new Date(y, m, d);
  return dt.toISOString().slice(0, 10);
}

export function VentasMes({ clientesSugeridos = [], planesSugeridos = [] }: Props) {
  const now = new Date();
  const [mes, setMes] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const esMesActual = mes.getFullYear() === now.getFullYear() && mes.getMonth() === now.getMonth();

  const cargar = useCallback(async () => {
    setLoading(true); setError(null);
    const res = await fetch(`/api/superadmin/ventas-facturacion?mes=${mesKey(mes)}`);
    if (res.ok) setVentas(await res.json());
    else setError('No se pudieron cargar las ventas');
    setLoading(false);
  }, [mes]);

  useEffect(() => { cargar(); }, [cargar]);

  const abrirNueva = () => {
    const base = esMesActual ? now : new Date(mes.getFullYear(), mes.getMonth(), 1);
    setEditingId(null);
    setForm({ ...EMPTY_FORM, fecha_pago: base.toISOString().slice(0, 10) });
    setShowForm(true);
  };

  const abrirEdicion = (v: Venta) => {
    setEditingId(v.id);
    setForm({
      cliente: v.cliente, plan: v.plan, monto: String(v.monto),
      fecha_pago: v.fecha_pago, fecha_vencimiento: v.fecha_vencimiento ?? '', notas: v.notas ?? '',
    });
    setShowForm(true);
  };

  const guardar = async () => {
    if (!form.cliente.trim() || !form.plan.trim() || !form.fecha_pago) return;
    setSaving(true); setError(null);
    const body = {
      cliente: form.cliente.trim(), plan: form.plan.trim(), monto: Number(form.monto) || 0,
      fecha_pago: form.fecha_pago, fecha_vencimiento: form.fecha_vencimiento || null,
      notas: form.notas.trim() || null,
    };
    const res = editingId
      ? await fetch(`/api/superadmin/ventas-facturacion?id=${editingId}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        })
      : await fetch('/api/superadmin/ventas-facturacion', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        });
    setSaving(false);
    if (res.ok) { setShowForm(false); setEditingId(null); cargar(); }
    else setError('No se pudo guardar la venta');
  };

  const eliminar = async (id: string) => {
    if (!confirm('¿Eliminar esta venta?')) return;
    const anteriores = ventas;
    setVentas((vs) => vs.filter((v) => v.id !== id));
    const res = await fetch(`/api/superadmin/ventas-facturacion?id=${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setVentas(anteriores);
      alert(data.error ?? 'No se pudo eliminar');
    }
  };

  const total = ventas.reduce((s, v) => s + v.monto, 0);

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Receipt className="w-5 h-5 text-violet-500" />
        <h1 className="text-2xl font-bold text-gray-900">Ventas de planes</h1>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm mb-6">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1">
          <button onClick={() => setMes((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100" aria-label="Mes anterior">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-gray-900 w-32 text-center capitalize">
            {MESES[mes.getMonth()]} {mes.getFullYear()}
          </span>
          <button onClick={() => setMes((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100" aria-label="Mes siguiente">
            <ChevronRight className="w-4 h-4" />
          </button>
          {!esMesActual && (
            <button onClick={() => setMes(new Date(now.getFullYear(), now.getMonth(), 1))}
              className="text-xs text-violet-600 hover:underline ml-1">Hoy</button>
          )}
        </div>

        <button onClick={abrirNueva}
          className="flex items-center gap-1.5 text-sm bg-violet-600 hover:bg-violet-500 text-white px-3 py-1.5 rounded-lg transition-colors">
          <Plus className="w-3.5 h-3.5" /> Nueva venta
        </button>
      </div>

      {showForm && (
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 space-y-3">
          <div className="grid sm:grid-cols-2 gap-2">
            <input list="clientes-sugeridos" value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })}
              placeholder="Cliente / negocio"
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            <input list="planes-sugeridos" value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })}
              placeholder="Plan (ej: Básico)"
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            <datalist id="clientes-sugeridos">
              {clientesSugeridos.map((c) => <option key={c} value={c} />)}
            </datalist>
            <datalist id="planes-sugeridos">
              {planesSugeridos.map((p) => <option key={p} value={p} />)}
            </datalist>
          </div>
          <div className="grid sm:grid-cols-3 gap-2">
            <input type="text" inputMode="numeric" pattern="[0-9]*" value={form.monto}
              onChange={(e) => setForm({ ...form, monto: digitsOnly(e.target.value) })} placeholder="Cuánto pagó"
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            <div>
              <label className="text-[11px] text-gray-400 block mb-0.5">Fecha de pago</label>
              <input type="date" value={form.fecha_pago}
                onChange={(e) => setForm({ ...form, fecha_pago: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
            <div>
              <label className="text-[11px] text-gray-400 block mb-0.5 flex items-center justify-between">
                Vence
                {form.fecha_pago && (
                  <button type="button" onClick={() => setForm((f) => ({ ...f, fecha_vencimiento: sugerirVencimiento(f.fecha_pago) }))}
                    className="text-violet-600 hover:underline">+1 mes</button>
                )}
              </label>
              <input type="date" value={form.fecha_vencimiento}
                onChange={(e) => setForm({ ...form, fecha_vencimiento: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
          </div>
          <input value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} placeholder="Notas (opcional)"
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-2">
            <button onClick={guardar} disabled={saving || !form.cliente.trim() || !form.plan.trim() || !form.fecha_pago}
              className="flex items-center gap-2 text-sm bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-semibold transition-colors">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {editingId ? 'Guardar cambios' : 'Guardar'}
            </button>
            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="text-sm text-gray-400 hover:text-gray-900 px-3 py-2">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-10 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Cargando...
        </div>
      ) : ventas.length === 0 ? (
        <div className="py-10 text-center text-gray-400 text-sm">Sin ventas este mes.</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  {['Cliente', 'Plan', 'Pagó', 'Fecha de pago', 'Vence', ''].map((h) => (
                    <th key={h} className="px-5 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {ventas.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium text-gray-900">{v.cliente}</p>
                        {v.automatico && (
                          <span title="Se generó solo desde un pago registrado en Facturación" className="inline-flex items-center gap-1 text-[10px] font-semibold text-violet-600 bg-violet-50 border border-violet-100 px-1.5 py-0.5 rounded-md">
                            <Zap className="w-2.5 h-2.5" /> Automático
                          </span>
                        )}
                      </div>
                      {v.notas && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[220px]">{v.notas}</p>}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{v.plan}</td>
                    <td className="px-5 py-3 font-semibold text-emerald-600">{formatARS(v.monto)}</td>
                    <td className="px-5 py-3 text-gray-500">{formatFechaCorta(v.fecha_pago)}</td>
                    <td className="px-5 py-3 text-gray-500">{formatFechaCorta(v.fecha_vencimiento)}</td>
                    <td className="px-5 py-3">
                      {!v.automatico && (
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => abrirEdicion(v)} className="p-1.5 rounded-lg text-gray-400 hover:text-violet-600 hover:bg-violet-50" aria-label="Editar">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => eliminar(v.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50" aria-label="Eliminar">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={cn('px-5 py-2.5 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 text-right')}>
            Total del mes: <span className="font-semibold text-emerald-600">{formatARS(total)}</span>
          </div>
        </>
      )}
      </div>
    </div>
  );
}
