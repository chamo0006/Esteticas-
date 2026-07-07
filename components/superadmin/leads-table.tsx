'use client';

import { useState } from 'react';
import { Search, Inbox } from 'lucide-react';
import { type LeadRow, formatFecha } from './types';

export function LeadsTable({ leads }: { leads: LeadRow[] }) {
  const [search, setSearch] = useState('');
  const filtrados = leads.filter((l) =>
    l.nombre.toLowerCase().includes(search.toLowerCase()) ||
    l.email.toLowerCase().includes(search.toLowerCase()) ||
    (l.estetica ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Inbox className="w-5 h-5 text-violet-500" />
        <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
        <span className="text-sm text-gray-400">· {leads.length}</span>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar lead..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-400 shadow-sm" />
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[620px]">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                {['Nombre', 'Email', 'Teléfono', 'Negocio', 'Fecha'].map((h) => (
                  <th key={h} className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtrados.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-400">Sin leads</td></tr>
              ) : filtrados.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-900">{l.nombre}</td>
                  <td className="px-5 py-3 text-violet-600 text-xs">
                    <a href={`mailto:${l.email}`} className="hover:underline">{l.email}</a>
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-xs">{l.telefono ?? '—'}</td>
                  <td className="px-5 py-3 text-gray-500 text-xs">{l.estetica ?? '—'}</td>
                  <td className="px-5 py-3 text-gray-400 text-xs">{formatFecha(l.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
