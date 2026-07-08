'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import {
  Plus, Loader2, X, Check, Trash2, AlertTriangle, Star, ImageIcon, Upload,
  ChevronUp, ChevronDown, ToggleLeft, ToggleRight, Edit2, MessageSquareQuote,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Foto { id: string; url: string; orden: number }
interface Resenia { id: string; nombre: string; texto: string; rating: number; activo: boolean }

const EMPTY_RESENIA = { nombre: '', texto: '', rating: '5' };

export default function ContenidoPage() {
  const params = useParams();
  const tenantSlug = params.tenantSlug as string;

  // ── Galería ──────────────────────────────────────────────────────────
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [loadingFotos, setLoadingFotos] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const [galeriaError, setGaleriaError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFotos = useCallback(async () => {
    setLoadingFotos(true);
    const res = await fetch(`/api/admin/${tenantSlug}/galeria`);
    setFotos(res.ok ? await res.json() : []);
    setLoadingFotos(false);
  }, [tenantSlug]);

  useEffect(() => { fetchFotos(); }, [fetchFotos]);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setSubiendo(true); setGaleriaError(null);
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`/api/admin/${tenantSlug}/galeria`, { method: 'POST', body: formData });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setGaleriaError(data.error ?? 'Error al subir una imagen');
      }
    }
    await fetchFotos();
    setSubiendo(false);
    e.target.value = '';
  };

  const mover = async (index: number, dir: -1 | 1) => {
    const nuevo = [...fotos];
    const j = index + dir;
    if (j < 0 || j >= nuevo.length) return;
    [nuevo[index], nuevo[j]] = [nuevo[j], nuevo[index]];
    setFotos(nuevo);
    await fetch(`/api/admin/${tenantSlug}/galeria`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orden: nuevo.map(f => f.id) }),
    });
  };

  const borrarFoto = async (id: string) => {
    setFotos(fs => fs.filter(f => f.id !== id));
    await fetch(`/api/admin/${tenantSlug}/galeria?id=${id}`, { method: 'DELETE' });
  };

  // ── Reseñas ──────────────────────────────────────────────────────────
  const [resenias, setResenias] = useState<Resenia[]>([]);
  const [loadingResenias, setLoadingResenias] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Resenia | null>(null);
  const [form, setForm] = useState(EMPTY_RESENIA);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const fetchResenias = useCallback(async () => {
    setLoadingResenias(true);
    const res = await fetch(`/api/admin/${tenantSlug}/resenias`);
    setResenias(res.ok ? await res.json() : []);
    setLoadingResenias(false);
  }, [tenantSlug]);

  useEffect(() => { fetchResenias(); }, [fetchResenias]);

  const openNew = () => { setEditing(null); setForm(EMPTY_RESENIA); setConfirmDelete(false); setSaveError(null); setShowModal(true); };
  const openEdit = (r: Resenia) => {
    setEditing(r);
    setForm({ nombre: r.nombre, texto: r.texto, rating: String(r.rating) });
    setConfirmDelete(false); setSaveError(null); setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true); setSaveError(null);
    try {
      const res = await fetch(`/api/admin/${tenantSlug}/resenias`, {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing ? { id: editing.id, ...form } : form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSaveError(data.error ?? 'Error al guardar');
        return;
      }
      await fetchResenias();
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
    try {
      await fetch(`/api/admin/${tenantSlug}/resenias?id=${editing.id}`, { method: 'DELETE' });
      await fetchResenias();
      setShowModal(false);
    } finally {
      setDeleting(false);
    }
  };

  const toggleActivo = async (r: Resenia) => {
    setResenias(rs => rs.map(x => x.id === r.id ? { ...x, activo: !x.activo } : x));
    await fetch(`/api/admin/${tenantSlug}/resenias`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: r.id, activo: !r.activo }),
    });
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Contenido</h1>
        <p className="text-gray-400 text-sm mt-1">Fotos y testimonios que se muestran en tu sitio de reservas.</p>
      </div>

      {/* ── Galería ─────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-violet-500" />
            <h2 className="font-semibold text-gray-900">Galería de fotos</h2>
          </div>
          <div>
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={subiendo}
              className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
            >
              {subiendo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Subir fotos
            </button>
          </div>
        </div>

        {galeriaError && <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4">{galeriaError}</p>}

        {loadingFotos ? (
          <div className="flex items-center justify-center py-12 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Cargando...
          </div>
        ) : fotos.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-12 text-center">
            <p className="text-gray-400 text-sm">Todavía no subiste fotos.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {fotos.map((f, i) => (
              <div key={f.id} className="relative group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.url} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />
                <button
                  onClick={() => borrarFoto(f.id)}
                  className="absolute top-1.5 right-1.5 p-1.5 rounded-lg bg-white/90 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Eliminar"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <div className="absolute bottom-1.5 left-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => mover(i, -1)} disabled={i === 0}
                    className="p-1.5 rounded-lg bg-white/90 text-gray-700 disabled:opacity-30" aria-label="Mover antes">
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => mover(i, 1)} disabled={i === fotos.length - 1}
                    className="p-1.5 rounded-lg bg-white/90 text-gray-700 disabled:opacity-30" aria-label="Mover después">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Reseñas ─────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MessageSquareQuote className="w-4 h-4 text-violet-500" />
            <h2 className="font-semibold text-gray-900">Testimonios</h2>
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Nuevo testimonio
          </button>
        </div>

        <p className="text-sm text-gray-500 bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 mb-4">
          Los testimonios activos aparecen en tu sitio de reservas. Cargalos vos mismo con lo que te dicen tus clientes.
        </p>

        {loadingResenias ? (
          <div className="flex items-center justify-center py-12 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Cargando...
          </div>
        ) : resenias.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-12 text-center">
            <p className="text-gray-400 text-sm">Todavía no cargaste ningún testimonio.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-50">
              {resenias.map((r) => (
                <div key={r.id} className={cn('px-6 py-4 flex items-start justify-between gap-4', !r.activo && 'opacity-40')}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{r.nombre}</p>
                      <span className="inline-flex items-center gap-0.5 text-amber-600 text-xs font-medium">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {r.rating}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{r.texto}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => toggleActivo(r)} className="p-1 transition-colors">
                      {r.activo
                        ? <ToggleRight className="w-6 h-6 text-emerald-500" />
                        : <ToggleLeft className="w-6 h-6 text-gray-300" />}
                    </button>
                    <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal testimonio */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-[60] md:p-4">
          <div className="bg-white rounded-t-3xl md:rounded-2xl shadow-xl w-full md:max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">{editing ? 'Editar testimonio' : 'Nuevo testimonio'}</h2>
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
                  placeholder="Sofía R."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Testimonio *</label>
                <textarea
                  value={form.texto}
                  onChange={(e) => setForm(f => ({ ...f, texto: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
                  placeholder="Lo que dijo tu cliente..."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Rating</label>
                <select
                  value={form.rating}
                  onChange={(e) => setForm(f => ({ ...f, rating: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
                >
                  {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} estrella{n !== 1 ? 's' : ''}</option>)}
                </select>
              </div>
            </div>
            {saveError && (
              <div className="px-6 pt-4">
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{saveError}</p>
              </div>
            )}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
              <div>
                {editing && !confirmDelete && (
                  <button onClick={() => setConfirmDelete(true)}
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
                <button onClick={handleSave} disabled={saving || !form.nombre.trim() || !form.texto.trim()}
                  className="px-5 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {editing ? 'Guardar cambios' : 'Crear testimonio'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
