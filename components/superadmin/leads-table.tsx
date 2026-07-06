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
        <Inbox className="w-5 h-5 text-violet-400" />
        <h1 className="text-2xl font-bold text-white">Leads</h1>
        <span className="text-sm text-zinc-500">· {leads.length}</span>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar lead..."
          className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[620px]">
            <thead>
              <tr className="border-b border-zinc-800 text-left">
                {['Nombre', 'Email', 'Teléfono', 'Negocio', 'Fecha'].map((h) => (
                  <th key={h} className="px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {filtrados.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-zinc-500">Sin leads</td></tr>
              ) : filtrados.map((l) => (
                <tr key={l.id} className="hover:bg-zinc-800/40">
                  <td className="px-5 py-3 font-medium text-white">{l.nombre}</td>
                  <td className="px-5 py-3 text-violet-400 text-xs">
                    <a href={`mailto:${l.email}`} className="hover:underline">{l.email}</a>
                  </td>
                  <td className="px-5 py-3 text-zinc-400 text-xs">{l.telefono ?? '—'}</td>
                  <td className="px-5 py-3 text-zinc-400 text-xs">{l.estetica ?? '—'}</td>
                  <td className="px-5 py-3 text-zinc-500 text-xs">{formatFecha(l.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
