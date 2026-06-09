'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Inbox, Mail, Phone, Store, Loader2, Search, Copy, Check } from 'lucide-react';

interface Lead {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  estetica: string | null;
  created_at: string;
}

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function formatFecha(dt: string) {
  const d = new Date(dt);
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()} · ${hh}:${mm}`;
}

export default function LeadsPage() {
  const params = useParams();
  const tenantSlug = params.tenantSlug as string;

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/${tenantSlug}/leads`);
      const data = await res.json();
      setLeads(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const filtered = leads.filter(l =>
    l.nombre.toLowerCase().includes(search.toLowerCase()) ||
    l.email.toLowerCase().includes(search.toLowerCase()) ||
    l.telefono?.includes(search) ||
    l.estetica?.toLowerCase().includes(search.toLowerCase())
  );

  const copyEmails = () => {
    const emails = filtered.map(l => l.email).join(', ');
    navigator.clipboard.writeText(emails);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Leads</h1>
          <p className="text-zinc-400 text-sm mt-1">
            {leads.length} contacto{leads.length !== 1 ? 's' : ''} desde el formulario de la landing
          </p>
        </div>
        {filtered.length > 0 && (
          <button
            onClick={copyEmails}
            className="flex items-center gap-2 px-4 py-2 bg-violet-50 hover:bg-violet-100 text-violet-700 text-sm font-medium rounded-xl transition-colors"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copiado' : 'Copiar emails'}
          </button>
        )}
      </div>

      {/* Buscador */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, email, teléfono o estética..."
          className="w-full pl-11 pr-4 py-3 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 shadow-sm"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-zinc-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Cargando...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm py-16 text-center">
          <Inbox className="w-10 h-10 text-zinc-200 mx-auto mb-3" />
          <p className="text-zinc-400 font-medium">
            {search ? 'Sin resultados para esa búsqueda' : 'Aún no hay leads registrados'}
          </p>
          {!search && (
            <p className="text-zinc-300 text-sm mt-1">
              Cuando alguien complete el formulario de contacto aparecerá aquí
            </p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-zinc-100 text-left">
                  <th className="px-6 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Nombre</th>
                  <th className="px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Contacto</th>
                  <th className="px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Estética</th>
                  <th className="px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {filtered.map((l) => (
                  <tr key={l.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-violet-600">
                            {l.nombre.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <p className="font-medium text-zinc-900">{l.nombre}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-zinc-600 text-xs">
                          <Mail className="w-3 h-3 text-zinc-400 flex-shrink-0" />
                          <a href={`mailto:${l.email}`} className="hover:text-violet-600 transition-colors">
                            {l.email}
                          </a>
                        </div>
                        {l.telefono && (
                          <div className="flex items-center gap-1.5 text-zinc-500 text-xs">
                            <Phone className="w-3 h-3 text-zinc-400 flex-shrink-0" /> {l.telefono}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {l.estetica ? (
                        <div className="flex items-center gap-1.5 text-zinc-600 text-xs">
                          <Store className="w-3 h-3 text-zinc-400 flex-shrink-0" /> {l.estetica}
                        </div>
                      ) : (
                        <span className="text-zinc-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-zinc-400 text-xs whitespace-nowrap">
                      {formatFecha(l.created_at)}
                    </td>
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
