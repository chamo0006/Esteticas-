'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Check, X, Clock, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

type Estado = 'pendiente' | 'confirmado' | 'completado' | 'cancelado';

interface Turno {
  id: string;
  fecha_hora: string;
  estado: Estado;
  notas: string | null;
  cliente_nombre: string;
  cliente_email: string;
  cliente_telefono: string;
  servicio_nombre: string;
  duracion_minutos: number;
  precio: string;
  pago_monto: string | null;
  pago_tipo: string | null;
  pago_metodo: string | null;
  pago_estado: string | null;
}

const ESTADO_STYLES: Record<Estado, string> = {
  pendiente:  'bg-amber-100 text-amber-700 border-amber-200',
  confirmado: 'bg-blue-100 text-blue-700 border-blue-200',
  completado: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  cancelado:  'bg-zinc-100 text-zinc-500 border-zinc-200',
};

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function formatARS(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n);
}

function formatHora(dt: string) {
  const d = new Date(dt);
  return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export default function TurnosPage() {
  const params = useParams();
  const tenantSlug = params.tenantSlug as string;

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchTurnos = useCallback(async () => {
    setLoading(true);
    try {
      const fecha = toDateStr(selectedDate);
      const res = await fetch(`/api/admin/${tenantSlug}/turnos?fecha=${fecha}`);
      const data = await res.json();
      setTurnos(data);
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, selectedDate]);

  useEffect(() => { fetchTurnos(); }, [fetchTurnos]);

  const changeEstado = async (id: string, estado: Estado) => {
    setUpdating(id);
    await fetch(`/api/admin/${tenantSlug}/turnos`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, estado }),
    });
    await fetchTurnos();
    setUpdating(null);
  };

  const prevDay = () => { const d = new Date(selectedDate); d.setDate(d.getDate()-1); setSelectedDate(d); };
  const nextDay = () => { const d = new Date(selectedDate); d.setDate(d.getDate()+1); setSelectedDate(d); };

  const isToday = toDateStr(selectedDate) === toDateStr(new Date());

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Agenda de Turnos</h1>
          <p className="text-zinc-400 text-sm mt-1">{turnos.length} turno{turnos.length !== 1 ? 's' : ''} para este día</p>
        </div>
        <button onClick={fetchTurnos} className="p-2 rounded-xl hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Navegador de fecha */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4 mb-6 flex items-center justify-between">
        <button onClick={prevDay} className="p-2 rounded-xl hover:bg-zinc-100 transition-colors">
          <ChevronLeft className="w-5 h-5 text-zinc-600" />
        </button>
        <div className="text-center">
          <p className="font-semibold text-zinc-900">
            {selectedDate.getDate()} de {MONTHS[selectedDate.getMonth()]} de {selectedDate.getFullYear()}
          </p>
          {isToday && (
            <span className="text-xs bg-violet-100 text-violet-600 font-semibold px-2 py-0.5 rounded-full">Hoy</span>
          )}
        </div>
        <button onClick={nextDay} className="p-2 rounded-xl hover:bg-zinc-100 transition-colors">
          <ChevronRight className="w-5 h-5 text-zinc-600" />
        </button>
      </div>

      {/* Lista de turnos */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-zinc-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Cargando...
        </div>
      ) : turnos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm py-16 text-center">
          <Clock className="w-10 h-10 text-zinc-200 mx-auto mb-3" />
          <p className="text-zinc-400 font-medium">Sin turnos para este día</p>
        </div>
      ) : (
        <div className="space-y-3">
          {turnos.map((t) => (
            <div key={t.id} className={cn(
              'bg-white rounded-2xl border shadow-sm overflow-hidden transition-all',
              t.estado === 'cancelado' ? 'opacity-50' : ''
            )}>
              <div className="p-4 flex items-start gap-3 md:gap-4">
                {/* Hora */}
                <div className="text-center min-w-[52px]">
                  <p className="text-lg font-bold text-zinc-900">{formatHora(t.fecha_hora)}</p>
                  <p className="text-xs text-zinc-400">{t.duracion_minutos} min</p>
                </div>

                {/* Divider */}
                <div className="w-px bg-zinc-100 self-stretch" />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-zinc-900">{t.cliente_nombre}</p>
                    <span className={cn('px-2 py-0.5 rounded-lg text-xs font-semibold border', ESTADO_STYLES[t.estado])}>
                      {t.estado}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-500">{t.servicio_nombre}</p>
                  {t.cliente_telefono && (
                    <p className="text-xs text-zinc-400 mt-1">📱 {t.cliente_telefono}</p>
                  )}
                  {t.pago_monto && (
                    <p className="text-xs text-zinc-400 mt-0.5">
                      💳 {t.pago_metodo} · {t.pago_tipo === 'sena' ? `Seña ${formatARS(Number(t.pago_monto))}` : formatARS(Number(t.pago_monto))} · <span className={t.pago_estado === 'acreditado' ? 'text-emerald-500' : 'text-amber-500'}>{t.pago_estado}</span>
                    </p>
                  )}
                </div>

                {/* Precio + acciones */}
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <p className="font-bold text-zinc-900">{formatARS(Number(t.precio))}</p>
                  {t.estado !== 'completado' && t.estado !== 'cancelado' && (
                    <div className="flex gap-1.5 flex-wrap justify-end">
                      {t.estado === 'pendiente' && (
                        <button
                          onClick={() => changeEstado(t.id, 'confirmado')}
                          disabled={!!updating}
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-semibold rounded-lg transition-colors"
                        >
                          {updating === t.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                          Confirmar
                        </button>
                      )}
                      {t.estado === 'confirmado' && (
                        <button
                          onClick={() => changeEstado(t.id, 'completado')}
                          disabled={!!updating}
                          className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 text-xs font-semibold rounded-lg transition-colors"
                        >
                          {updating === t.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                          Completar
                        </button>
                      )}
                      <button
                        onClick={() => changeEstado(t.id, 'cancelado')}
                        disabled={!!updating}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-500 text-xs font-semibold rounded-lg transition-colors"
                      >
                        <X className="w-3 h-3" /> Cancelar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
