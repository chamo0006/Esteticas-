'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Plus, Edit2, ToggleLeft, ToggleRight, Loader2, X, Check, Trash2, AlertTriangle, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Profesional {
  id: string;
  nombre: string;
  rol: string | null;
  rating: number | string | null;
  activo: boolean;
}

const EMPTY = { nombre: '', rol: '', rating: '' as number | string };

export default function ProfesionalesPage() {
  const params = useParams();
  const tenantSlug = params.tenantSlug as string;

  const [items, setItems] = useState<Profesional[]>([]);
  const [tipoNegocio, setTipoNegocio] = useState<'estetica' | 'barberia'>('estetica');
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Profesional | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Etiquetas según el rubro
  const esBarberia = tipoNegocio === 'barberia';
  const titulo   = esBarberia ? 'Barberos' : 'Empleados';
  const singular = esBarberia ? 'barbero' : 'empleado';

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/${tenantSlug}/profesionales`);
    setItems(res.ok ? await res.json() : []);
    setLoading(false);
  }, [tenantSlug]);

  useEffect(() => { fetch_(); }, [fetch_]);

  useEffect(() => {
    fetch(`/api/admin/${tenantSlug}/configuracion`)
      .then(r => r.json())
      .then(d => { if (d.tenant?.tipo_negocio) setTipoNegocio(d.tenant.tipo_negocio); })
      .catch(() => {});
  }, [tenantSlug]);

  const openNew = () => { setEditing(null); setForm(EMPTY); setConfirmDelete(false); setSaveError(null); setDeleteError(null); setShowModal(true); };
  const openEdit = (p: Profesional) => {
    setEditing(p);
    setForm({ nombre: p.nombre, rol: p.rol ?? '', rating: p.rating != null ? String(p.rating) : '' });
    setConfirmDelete(false); setSaveError(null); setDeleteError(null); setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true); setSaveError(null);
    try {
      const res = await fetch(`/api/admin/${tenantSlug}/profesionales`, {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing ? { id: editing.id, ...form } : form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSaveError(data.error ?? 'Error al guardar');
        return;
      }
      await fetch_();
      setShowModal(false);
    } catch {
      setSaveError('Error de red. Intentá de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    setDeleting(true); setDeleteError(null);
    try {
      const res = await fetch(`/api/admin/${tenantSlug}/profesionales?id=${editing.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setDeleteError(data.error ?? 'No se pudo eliminar');
        setConfirmDelete(false);
        return;
      }
      await fetch_();
      setShowModal(false);
    } catch {
      setDeleteError('Error de red. Intentá de nuevo.');
    } finally {
      setDeleting(false);
    }
  };

  const toggleActivo = async (p: Profesional) => {
    const res = await fetch(`/api/admin/${tenantSlug}/profesionales`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: p.id, activo: !p.activo }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? 'No se pudo actualizar el estado');
      return;
    }
    await fetch_();
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{titulo}</h1>
          <p className="text-gray-400 text-sm mt-1">
            {items.length} {items.length === 1 ? singular : `${singular}s`} {items.length === 1 ? 'cargado' : 'cargados'}
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Nuevo {singular}
        </button>
      </div>

      <p className="text-sm text-gray-500 bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 mb-6">
        Los {singular}s activos aparecen en la página de reservas para que el cliente elija con quién atenderse,
        y se usan para asignar los turnos automáticamente.
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Cargando...
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center">
          <p className="text-gray-400 text-sm">Todavía no cargaste ningún {singular}.</p>
          <button onClick={openNew} className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl transition-colors">
            <Plus className="w-4 h-4" /> Agregar el primero
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Nombre</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Especialidad</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Rating</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Estado</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((p) => (
                  <tr key={p.id} className={cn('hover:bg-gray-50 transition-colors', !p.activo && 'opacity-40')}>
                    <td className="px-6 py-4 font-medium text-gray-900">{p.nombre}</td>
                    <td className="px-4 py-4 text-gray-600">{p.rol || <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-4">
                      {p.rating != null && p.rating !== '' ? (
                        <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {p.rating}
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-4">
                      <button onClick={() => toggleActivo(p)} className="transition-colors">
                        {p.activo
                          ? <ToggleRight className="w-6 h-6 text-emerald-500" />
                          : <ToggleLeft className="w-6 h-6 text-gray-300" />}
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-[60] md:p-4">
          <div className="bg-white rounded-t-3xl md:rounded-2xl shadow-xl w-full md:max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">{editing ? `Editar ${singular}` : `Nuevo ${singular}`}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Nombre *</label>
                <input
                  value={form.nombre}
                  onChange={(e) => setForm(f => ({ ...f, nombre: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  placeholder={esBarberia ? 'Matías G.' : 'Martina'}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Especialidad</label>
                <input
                  value={form.rol}
                  onChange={(e) => setForm(f => ({ ...f, rol: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  placeholder={esBarberia ? 'Fade & diseños' : 'Manicura & uñas'}
                />
                <p className="text-xs text-gray-400 mt-1">Opcional. Se muestra debajo del nombre.</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Rating</label>
                <input
                  type="number" min={0} max={5} step={0.1}
                  value={form.rating}
                  onChange={(e) => setForm(f => ({ ...f, rating: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  placeholder="4.9"
                />
                <p className="text-xs text-gray-400 mt-1">Opcional. Valor de 0 a 5 (ej: 4.8).</p>
              </div>
            </div>
            {(saveError || deleteError) && (
              <div className="px-6 pt-4">
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  {saveError ?? deleteError}
                </p>
              </div>
            )}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
              <div>
                {editing && !confirmDelete && (
                  <button onClick={() => { setConfirmDelete(true); setDeleteError(null); }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-colors">
                    <Trash2 className="w-4 h-4" /> Eliminar
                  </button>
                )}
                {editing && confirmDelete && (
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <span className="text-xs text-red-600 font-medium">¿Seguro?</span>
                    <button onClick={handleDelete} disabled={deleting}
                      className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1">
                      {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                      Sí, eliminar
                    </button>
                    <button onClick={() => setConfirmDelete(false)} className="text-xs text-gray-500 hover:text-gray-700">No</button>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-100 transition-colors">
                  Cancelar
                </button>
                <button onClick={handleSave} disabled={saving || !form.nombre.trim()}
                  className="px-5 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {editing ? 'Guardar cambios' : `Crear ${singular}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
