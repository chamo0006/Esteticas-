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
        <Inbox className="w-5 h-5 text-[#c9a86a]" />
        <h1 className="text-3xl font-serif font-medium tracking-tight text-[#f2ede1]">Leads</h1>
        <span className="text-sm text-[#7c745f]">· {leads.length}</span>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7c745f]" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar lead..."
          className="w-full pl-10 pr-4 py-2.5 bg-[#1c1a15] border border-[#2c261d] rounded-xl text-sm text-[#f2ede1] focus:outline-none focus:ring-2 focus:ring-[#c9a86a]" />
      </div>

      <div className="bg-[#1c1a15] border border-[#2c261d] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[620px]">
            <thead>
              <tr className="border-b border-[#2c261d] text-left">
                {['Nombre', 'Email', 'Teléfono', 'Negocio', 'Fecha'].map((h) => (
                  <th key={h} className="px-5 py-3 text-xs font-semibold text-[#7c745f] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2c261d]/50">
              {filtrados.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-[#7c745f]">Sin leads</td></tr>
              ) : filtrados.map((l) => (
                <tr key={l.id} className="hover:bg-[#241f18]/40">
                  <td className="px-5 py-3 font-medium text-[#f2ede1]">{l.nombre}</td>
                  <td className="px-5 py-3 text-[#c9a86a] text-xs">
                    <a href={`mailto:${l.email}`} className="hover:underline">{l.email}</a>
                  </td>
                  <td className="px-5 py-3 text-[#a89d86] text-xs">{l.telefono ?? '—'}</td>
                  <td className="px-5 py-3 text-[#a89d86] text-xs">{l.estetica ?? '—'}</td>
                  <td className="px-5 py-3 text-[#7c745f] text-xs">{formatFecha(l.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
