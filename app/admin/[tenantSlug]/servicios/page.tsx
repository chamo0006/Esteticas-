'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Plus, Edit2, ToggleLeft, ToggleRight, Loader2, X, Check, Trash2, AlertTriangle, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Categoria { id: string; nombre: string }

interface Servicio {
  id: string;
  nombre: string;
  descripcion: string | null;
  duracion_minutos: number;
  precio: string;
  categoria: string;
  activo: boolean;
}

const CAT_STYLES: Record<string, string> = {
  // Estética
  nails:   'bg-pink-100 text-pink-700',
  lashes:  'bg-purple-100 text-purple-700',
  brows:   'bg-amber-100 text-amber-700',
  skin:    'bg-green-100 text-green-700',
  // Barbería
  corte:   'bg-blue-100 text-blue-700',
  barba:   'bg-slate-100 text-slate-700',
  combo:   'bg-indigo-100 text-indigo-700',
  general: 'bg-zinc-100 text-zinc-600',
};

function formatARS(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n);
}

const EMPTY = { nombre: '', descripcion: '', duracion_minutos: 60, precio: 0, categoria: 'general' };

export default function ServiciosPage() {
  const params = useParams();
  const tenantSlug = params.tenantSlug as string;

  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [tipoNegocio, setTipoNegocio] = useState<'estetica' | 'barberia'>('estetica');
  const [loading, setLoading] = useState(true);

  // Categorías
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [newCat, setNewCat] = useState('');
  const [addingCat, setAddingCat] = useState(false);
  const [showCatInput, setShowCatInput] = useState(false);
  const [catError, setCatError] = useState<string | null>(null);
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Servicio | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/${tenantSlug}/servicios`);
    setServicios(await res.json());
    setLoading(false);
  }, [tenantSlug]);

  const fetchCategorias = useCallback(async () => {
    const res = await fetch(`/api/admin/${tenantSlug}/categorias`);
    if (res.ok) setCategorias(await res.json());
  }, [tenantSlug]);

  useEffect(() => { fetch_(); fetchCategorias(); }, [fetch_, fetchCategorias]);

  useEffect(() => {
    fetch(`/api/admin/${tenantSlug}/configuracion`)
      .then(r => r.json())
      .then(d => { if (d.tenant?.tipo_negocio) setTipoNegocio(d.tenant.tipo_negocio); })
      .catch(() => {});
  }, [tenantSlug]);

  const handleAddCat = async () => {
    if (!newCat.trim()) return;
    setAddingCat(true); setCatError(null);
    const res = await fetch(`/api/admin/${tenantSlug}/categorias`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: newCat.trim() }),
    });
    if (res.ok) {
      setNewCat(''); setShowCatInput(false);
      await fetchCategorias();
    } else {
      const d = await res.json().catch(() => ({}));
      setCatError(d.error ?? 'Error al crear');
    }
    setAddingCat(false);
  };

  const handleDeleteCat = async (id: string) => {
    setDeletingCatId(id);
    await fetch(`/api/admin/${tenantSlug}/categorias?id=${id}`, { method: 'DELETE' });
    await fetchCategorias();
    setDeletingCatId(null);
  };

  const openNew = () => { setEditing(null); setForm({ ...EMPTY, categoria: categorias[0]?.nombre ?? '' }); setConfirmDelete(false); setSaveError(null); setDeleteError(null); setShowModal(true); };
  const openEdit = (s: Servicio) => {
    setEditing(s);
    setForm({ nombre: s.nombre, descripcion: s.descripcion ?? '', duracion_minutos: s.duracion_minutos, precio: Number(s.precio), categoria: s.categoria });
    setConfirmDelete(false);
    setSaveError(null);
    setDeleteError(null);
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/admin/${tenantSlug}/servicios`, {
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
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/admin/${tenantSlug}/servicios?id=${editing.id}`, { method: 'DELETE' });
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

  const toggleActivo = async (s: Servicio) => {
    await fetch(`/api/admin/${tenantSlug}/servicios`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: s.id, activo: !s.activo }),
    });
    await fetch_();
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Servicios</h1>
          <p className="text-zinc-400 text-sm mt-1">{servicios.length} servicio{servicios.length !== 1 ? 's' : ''} en el catálogo</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Nuevo servicio
        </button>
      </div>

      {/* ── Categorías ─────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-zinc-400" />
            <h2 className="font-semibold text-zinc-900 text-sm">Categorías</h2>
            <span className="text-xs text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">{categorias.length}</span>
          </div>
          {!showCatInput && (
            <button onClick={() => { setShowCatInput(true); setCatError(null); setNewCat(''); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg transition-colors">
              <Plus className="w-3.5 h-3.5" /> Nueva categoría
            </button>
          )}
        </div>

        {/* Inline add form */}
        {showCatInput && (
          <div className="flex items-center gap-2 mb-4">
            <input
              autoFocus
              value={newCat}
              onChange={e => setNewCat(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddCat(); if (e.key === 'Escape') setShowCatInput(false); }}
              placeholder={tipoNegocio === 'barberia' ? 'ej: corte, barba, combo...' : 'ej: nails, lashes, skin...'}
              className="flex-1 px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
            <button onClick={handleAddCat} disabled={addingCat || !newCat.trim()}
              className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-200 disabled:text-zinc-400 text-white text-sm font-semibold rounded-xl transition-colors">
              {addingCat ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            </button>
            <button onClick={() => setShowCatInput(false)} className="text-zinc-400 hover:text-zinc-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        {catError && <p className="text-xs text-red-500 mb-3">{catError}</p>}

        {/* Lista de categorías */}
        {categorias.length === 0 ? (
          <p className="text-sm text-zinc-400 text-center py-4">
            Sin categorías todavía. Creá la primera para organizar tus servicios.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {categorias.map(cat => (
              <div key={cat.id}
                className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium', CAT_STYLES[cat.nombre] ?? CAT_STYLES.general)}>
                <span>{cat.nombre}</span>
                <button
                  onClick={() => handleDeleteCat(cat.id)}
                  disabled={deletingCatId === cat.id}
                  className="ml-0.5 opacity-50 hover:opacity-100 transition-opacity"
                  title="Eliminar categoría">
                  {deletingCatId === cat.id
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <X className="w-3 h-3" />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-zinc-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Cargando...
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[540px]">
            <thead>
              <tr className="border-b border-zinc-100 text-left">
                <th className="px-6 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Servicio</th>
                <th className="px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Categoría</th>
                <th className="px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Duración</th>
                <th className="px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Precio</th>
                <th className="px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {servicios.map((s) => (
                <tr key={s.id} className={cn('hover:bg-zinc-50 transition-colors', !s.activo && 'opacity-40')}>
                  <td className="px-6 py-4">
                    <p className="font-medium text-zinc-900">{s.nombre}</p>
                    {s.descripcion && <p className="text-xs text-zinc-400 mt-0.5 truncate max-w-xs">{s.descripcion}</p>}
                  </td>
                  <td className="px-4 py-4">
                    <span className={cn('px-2.5 py-1 rounded-lg text-xs font-semibold', CAT_STYLES[s.categoria] ?? CAT_STYLES.general)}>
                      {s.categoria}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-zinc-600">{s.duracion_minutos} min</td>
                  <td className="px-4 py-4 font-semibold text-zinc-900">{formatARS(Number(s.precio))}</td>
                  <td className="px-4 py-4">
                    <button onClick={() => toggleActivo(s)} className="transition-colors">
                      {s.activo
                        ? <ToggleRight className="w-6 h-6 text-emerald-500" />
                        : <ToggleLeft className="w-6 h-6 text-zinc-300" />
                      }
                    </button>
                  </td>
                  <td className="px-4 py-4">
                    <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors">
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

      {/* Modal — full screen en mobile, centered en desktop */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 md:p-4">
          <div className="bg-white rounded-t-3xl md:rounded-2xl shadow-xl w-full md:max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
              <h2 className="font-semibold text-zinc-900">{editing ? 'Editar servicio' : 'Nuevo servicio'}</h2>
              <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Nombre *</label>
                <input
                  value={form.nombre}
                  onChange={(e) => setForm(f => ({ ...f, nombre: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  placeholder={tipoNegocio === 'barberia' ? 'Corte clásico' : 'Lifting de pestañas'}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Descripción</label>
                <textarea
                  value={form.descripcion}
                  onChange={(e) => setForm(f => ({ ...f, descripcion: e.target.value }))}
                  rows={2}
                  className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
                  placeholder="Descripción opcional..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Duración (min) *</label>
                  <input
                    type="number" min={5}
                    value={form.duracion_minutos}
                    onChange={(e) => setForm(f => ({ ...f, duracion_minutos: Number(e.target.value) }))}
                    className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Precio (ARS) *</label>
                  <input
                    type="number" min={0}
                    value={form.precio}
                    onChange={(e) => setForm(f => ({ ...f, precio: Number(e.target.value) }))}
                    className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Categoría</label>
                {categorias.length === 0 ? (
                  <p className="text-sm text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5">
                    Primero creá una categoría con &quot;Nueva categoría&quot; arriba.
                  </p>
                ) : (
                  <select
                    value={form.categoria}
                    onChange={(e) => setForm(f => ({ ...f, categoria: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
                  >
                    {/* Categoría actual del servicio si ya no existe en la lista (servicios viejos) */}
                    {form.categoria && !categorias.some(c => c.nombre === form.categoria) && (
                      <option value={form.categoria}>{form.categoria} (actual)</option>
                    )}
                    {categorias.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                  </select>
                )}
                <p className="text-xs text-zinc-400 mt-1">Solo aparecen tus categorías. Para crear una nueva, usá &quot;Nueva categoría&quot; arriba.</p>
              </div>
            </div>
            {(saveError || deleteError) && (
              <div className="px-6 pt-4">
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  {saveError ?? deleteError}
                </p>
              </div>
            )}
            <div className="px-6 py-4 border-t border-zinc-100 flex items-center justify-between gap-3">
              {/* Botón eliminar — solo al editar */}
              <div>
                {editing && !confirmDelete && (
                  <button
                    onClick={() => { setConfirmDelete(true); setDeleteError(null); }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" /> Eliminar
                  </button>
                )}
                {editing && confirmDelete && (
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <span className="text-xs text-red-600 font-medium">¿Seguro?</span>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                    >
                      {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                      Sí, eliminar
                    </button>
                    <button onClick={() => setConfirmDelete(false)} className="text-xs text-zinc-500 hover:text-zinc-700">
                      No
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl text-sm text-zinc-600 hover:bg-zinc-100 transition-colors">
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !form.nombre}
                  className="px-5 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-200 disabled:text-zinc-400 text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {editing ? 'Guardar cambios' : 'Crear servicio'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
