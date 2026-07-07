'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2, Loader2, NotebookText } from 'lucide-react';
import { cn, digitsOnly } from '@/lib/utils';
import { formatARS } from './types';

interface Nota {
  id: string;
  fecha: string;
  texto: string;
  monto: number | null;
  created_at: string;
  autor: string | null;
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const TIPOS = [
  { key: 'ingreso', label: 'Ingreso', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { key: 'egreso', label: 'Egreso', color: 'text-red-600 bg-red-50 border-red-200' },
  { key: 'nota', label: 'Nota', color: 'text-gray-500 bg-gray-100 border-gray-200' },
] as const;

function mesKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function formatDia(fecha: string) {
  // fecha viene como "YYYY-MM-DD" — evitamos Date() para no correr de día por timezone.
  const [, m, d] = fecha.split('-');
  return `${d}/${m}`;
}

export function NotasMes() {
  const now = new Date();
  const [mes, setMes] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [notas, setNotas] = useState<Nota[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [tipo, setTipo] = useState<(typeof TIPOS)[number]['key']>('nota');
  const [fecha, setFecha] = useState('');
  const [texto, setTexto] = useState('');
  const [monto, setMonto] = useState('');
  const [saving, setSaving] = useState(false);

  const esMesActual = mes.getFullYear() === now.getFullYear() && mes.getMonth() === now.getMonth();

  const cargar = useCallback(async () => {
    setLoading(true); setError(null);
    const res = await fetch(`/api/superadmin/notas-facturacion?mes=${mesKey(mes)}`);
    if (res.ok) setNotas(await res.json());
    else setError('No se pudieron cargar las notas');
    setLoading(false);
  }, [mes]);

  useEffect(() => { cargar(); }, [cargar]);

  const abrirForm = () => {
    const base = esMesActual ? now : new Date(mes.getFullYear(), mes.getMonth(), 1);
    setFecha(base.toISOString().slice(0, 10));
    setTexto('');
    setMonto('');
    setTipo('nota');
    setShowForm(true);
  };

  const guardar = async () => {
    if (!texto.trim()) return;
    setSaving(true);
    const montoFinal = tipo === 'nota' || !monto ? null : tipo === 'egreso' ? -Number(monto) : Number(monto);
    const res = await fetch('/api/superadmin/notas-facturacion', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fecha, texto: texto.trim(), monto: montoFinal }),
    });
    setSaving(false);
    if (res.ok) { setShowForm(false); cargar(); }
    else setError('No se pudo guardar la nota');
  };

  const eliminar = async (id: string) => {
    setNotas((ns) => ns.filter((n) => n.id !== id));
    await fetch(`/api/superadmin/notas-facturacion?id=${id}`, { method: 'DELETE' });
  };

  const total = notas.reduce((s, n) => s + (n.monto ?? 0), 0);

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm mb-6">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <NotebookText className="w-4 h-4 text-violet-500" />
          <h2 className="font-semibold text-gray-900 text-sm">Actividad del mes</h2>
        </div>

        <div className="flex items-center gap-1">
          <button onClick={() => setMes((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100" aria-label="Mes anterior">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-gray-900 w-32 text-center capitalize">
            {MESES[mes.getMonth()]} {mes.getFullYear()}
          </span>
          <button onClick={() => setMes((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100" aria-label="Mes siguiente">
            <ChevronRight className="w-4 h-4" />
          </button>
          {!esMesActual && (
            <button onClick={() => setMes(new Date(now.getFullYear(), now.getMonth(), 1))}
              className="text-xs text-violet-600 hover:underline ml-1">Hoy</button>
          )}
        </div>

        <button onClick={abrirForm}
          className="flex items-center gap-1.5 text-sm bg-violet-600 hover:bg-violet-500 text-white px-3 py-1.5 rounded-lg transition-colors">
          <Plus className="w-3.5 h-3.5" /> Anotar
        </button>
      </div>

      {showForm && (
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 space-y-3">
          <div className="flex gap-1">
            {TIPOS.map((t) => (
              <button key={t.key} onClick={() => setTipo(t.key)}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                  tipo === t.key ? t.color : 'text-gray-400 bg-white border-gray-200 hover:bg-gray-100')}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="grid sm:grid-cols-[140px_1fr_140px] gap-2">
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="¿Qué querés anotar?"
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            {tipo !== 'nota' && (
              <input type="text" inputMode="numeric" pattern="[0-9]*" value={monto}
                onChange={(e) => setMonto(digitsOnly(e.target.value))} placeholder="Monto"
                className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={guardar} disabled={saving || !texto.trim() || !fecha}
              className="flex items-center gap-2 text-sm bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-semibold transition-colors">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Guardar
            </button>
            <button onClick={() => setShowForm(false)} className="text-sm text-gray-400 hover:text-gray-900 px-3 py-2">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-10 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Cargando...
        </div>
      ) : error ? (
        <div className="py-8 text-center text-red-500 text-sm">{error}</div>
      ) : notas.length === 0 ? (
        <div className="py-10 text-center text-gray-400 text-sm">Sin notas este mes.</div>
      ) : (
        <>
          {total !== 0 && (
            <div className="px-5 py-2.5 bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
              Balance de notas del mes: <span className={cn('font-semibold', total >= 0 ? 'text-emerald-600' : 'text-red-600')}>{formatARS(total)}</span>
            </div>
          )}
          <div className="divide-y divide-gray-50">
            {notas.map((n) => (
              <div key={n.id} className="px-5 py-3 flex items-center justify-between gap-3 group">
                <div className="flex items-start gap-3 min-w-0">
                  <span className="text-xs text-gray-400 font-medium mt-0.5 flex-shrink-0 w-9">{formatDia(n.fecha)}</span>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-900 break-words">{n.texto}</p>
                    {n.autor && <p className="text-xs text-gray-400 mt-0.5">{n.autor}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {n.monto != null && (
                    <span className={cn('text-sm font-semibold', n.monto >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                      {n.monto >= 0 ? '+' : ''}{formatARS(n.monto)}
                    </span>
                  )}
                  <button onClick={() => eliminar(n.id)}
                    className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Eliminar nota">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
