'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Users, Mail, Phone, Calendar, Loader2, Search, Trash2, AlertTriangle, X } from 'lucide-react';

interface Cliente {
  id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  created_at: string;
  total_turnos: number;
  ultimo_turno: string | null;
}

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function formatFecha(dt: string | null) {
  if (!dt) return '—';
  const d = new Date(dt);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export default function ClientesPage() {
  const params = useParams();
  const tenantSlug = params.tenantSlug as string;

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<Cliente | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/${tenantSlug}/clientes`);
    setClientes(await res.json());
    setLoading(false);
  }, [tenantSlug]);

  useEffect(() => { fetch_(); }, [fetch_]);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    await fetch(`/api/admin/${tenantSlug}/clientes?id=${confirmDelete.id}`, { method: 'DELETE' });
    setConfirmDelete(null);
    setDeleting(false);
    await fetch_();
  };

  const filtered = clientes.filter(c =>
    c.nombre.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.telefono?.includes(search)
  );

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Clientes</h1>
          <p className="text-zinc-400 text-sm mt-1">{clientes.length} cliente{clientes.length !== 1 ? 's' : ''} registrados</p>
        </div>
      </div>

      {/* Buscador */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, email o teléfono..."
          className="w-full pl-11 pr-4 py-3 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 shadow-sm"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-zinc-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Cargando...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm py-16 text-center">
          <Users className="w-10 h-10 text-zinc-200 mx-auto mb-3" />
          <p className="text-zinc-400 font-medium">
            {search ? 'Sin resultados para esa búsqueda' : 'Aún no hay clientes registrados'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[540px]">
              <thead>
                <tr className="border-b border-zinc-100 text-left">
                  <th className="px-6 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Cliente</th>
                  <th className="px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Contacto</th>
                  <th className="px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Turnos</th>
                  <th className="px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Último turno</th>
                  <th className="px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Desde</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-zinc-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-violet-600">
                            {c.nombre.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <p className="font-medium text-zinc-900">{c.nombre}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-0.5">
                        {c.email && (
                          <div className="flex items-center gap-1.5 text-zinc-500 text-xs">
                            <Mail className="w-3 h-3" /> {c.email}
                          </div>
                        )}
                        {c.telefono && (
                          <div className="flex items-center gap-1.5 text-zinc-500 text-xs">
                            <Phone className="w-3 h-3" /> {c.telefono}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-violet-50 text-violet-700 text-xs font-semibold rounded-lg">
                        <Calendar className="w-3 h-3" /> {c.total_turnos}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-zinc-500 text-xs">{formatFecha(c.ultimo_turno)}</td>
                    <td className="px-4 py-4 text-zinc-400 text-xs">{formatFecha(c.created_at)}</td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => setConfirmDelete(c)}
                        className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 text-zinc-300 hover:text-red-500 transition-all"
                        title="Eliminar cliente"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de confirmación */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setConfirmDelete(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="font-semibold text-zinc-900">Eliminar cliente</p>
                  <p className="text-sm text-zinc-500 mt-0.5">Esta acción no se puede deshacer</p>
                </div>
              </div>
              <button onClick={() => setConfirmDelete(null)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-zinc-50 rounded-xl p-3 mb-5">
              <p className="font-medium text-zinc-900 text-sm">{confirmDelete.nombre}</p>
              {confirmDelete.email && <p className="text-xs text-zinc-400 mt-0.5">{confirmDelete.email}</p>}
              <p className="text-xs text-zinc-400 mt-0.5">
                {confirmDelete.total_turnos} turno{confirmDelete.total_turnos !== 1 ? 's' : ''} en el historial
              </p>
            </div>

            <p className="text-sm text-zinc-600 mb-5">
              Se borrará el cliente y todo su historial de turnos y pagos.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
