'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Users, Mail, Phone, Calendar, Loader2, Search } from 'lucide-react';

interface Cliente {
  id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  created_at: string;
  total_turnos: string;
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

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/${tenantSlug}/clientes`);
    setClientes(await res.json());
    setLoading(false);
  }, [tenantSlug]);

  useEffect(() => { fetch_(); }, [fetch_]);

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
                <th className="px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Cliente desde</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-zinc-50 transition-colors">
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
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
