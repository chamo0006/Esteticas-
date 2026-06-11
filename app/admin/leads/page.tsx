'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Mail, Phone, Building2, Search, RefreshCw } from 'lucide-react';

interface Lead {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  estetica: string | null;
  estado: string | null;
  created_at: string;
}

const ESTADO_STYLES: Record<string, string> = {
  nuevo:       'bg-violet-50 text-violet-700 border border-violet-100',
  contactado:  'bg-emerald-50 text-emerald-700 border border-emerald-100',
  descartado:  'bg-gray-100 text-gray-500 border border-gray-200',
};

const ESTADO_LABELS: Record<string, string> = {
  nuevo:      'Nuevo',
  contactado: 'Contactado',
  descartado: 'Descartado',
};

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function formatFecha(dt: string) {
  const d = new Date(dt);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
}

export default function LeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/leads');
    if (res.status === 401) {
      router.push('/admin/leads/login');
      return;
    }
    setLeads(await res.json());
    setLoading(false);
  }, [router]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const updateEstado = async (id: string, estado: string) => {
    setUpdating(id);
    await fetch('/api/admin/leads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, estado }),
    });
    setLeads(prev => prev.map(l => l.id === id ? { ...l, estado } : l));
    setUpdating(null);
  };

  const filtered = leads.filter(l =>
    l.nombre.toLowerCase().includes(search.toLowerCase()) ||
    l.email.toLowerCase().includes(search.toLowerCase()) ||
    l.estetica?.toLowerCase().includes(search.toLowerCase()) ||
    l.telefono?.includes(search)
  );

  const counts = {
    total: leads.length,
    nuevos: leads.filter(l => !l.estado || l.estado === 'nuevo').length,
    contactados: leads.filter(l => l.estado === 'contactado').length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Leads</h1>
            <p className="text-sm text-gray-500">Personas que completaron el formulario de contacto</p>
          </div>
          <button
            onClick={fetchLeads}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Actualizar
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Total', value: counts.total, color: 'text-gray-900' },
            { label: 'Nuevos', value: counts.nuevos, color: 'text-violet-600' },
            { label: 'Contactados', value: counts.contactados, color: 'text-emerald-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-200 p-5">
              <p className="text-sm text-gray-500 mb-1">{s.label}</p>
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, email, teléfono o estética..."
            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 shadow-sm"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Cargando...
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 py-16 text-center">
            <p className="text-gray-400 font-medium">
              {search ? 'Sin resultados para esa búsqueda' : 'Aún no hay leads registrados'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Persona</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Contacto</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Estética</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Fecha</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((lead) => {
                    const estado = lead.estado ?? 'nuevo';
                    return (
                      <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-bold text-violet-600">
                                {lead.nombre.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <p className="font-medium text-gray-900">{lead.nombre}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 text-gray-600 text-xs">
                              <Mail className="w-3 h-3 text-gray-400" />
                              <a href={`mailto:${lead.email}`} className="hover:underline">{lead.email}</a>
                            </div>
                            {lead.telefono && (
                              <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                                <Phone className="w-3 h-3 text-gray-400" />
                                <a href={`tel:${lead.telefono}`} className="hover:underline">{lead.telefono}</a>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          {lead.estetica ? (
                            <div className="flex items-center gap-1.5 text-gray-600 text-sm">
                              <Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                              {lead.estetica}
                            </div>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-gray-400 text-xs whitespace-nowrap">
                          {formatFecha(lead.created_at)}
                        </td>
                        <td className="px-4 py-4">
                          {updating === lead.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                          ) : (
                            <select
                              value={estado}
                              onChange={(e) => updateEstado(lead.id, e.target.value)}
                              className={`text-xs font-semibold rounded-lg px-2.5 py-1.5 border-0 outline-none cursor-pointer appearance-none ${ESTADO_STYLES[estado] ?? ESTADO_STYLES.nuevo}`}
                            >
                              {Object.entries(ESTADO_LABELS).map(([val, label]) => (
                                <option key={val} value={val}>{label}</option>
                              ))}
                            </select>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
