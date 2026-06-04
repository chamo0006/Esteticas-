'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Check, X, Clock, Loader2, RefreshCw, CalendarDays, List } from 'lucide-react';
import { cn } from '@/lib/utils';

type Estado = 'pendiente' | 'confirmado' | 'completado' | 'cancelado';
type Vista = 'agenda' | 'calendario';

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
  profesional_nombre: string | null;
}

const ESTADO_STYLES: Record<Estado, string> = {
  pendiente:  'bg-amber-100 text-amber-700 border-amber-200',
  confirmado: 'bg-blue-100 text-blue-700 border-blue-200',
  completado: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  cancelado:  'bg-zinc-100 text-zinc-500 border-zinc-200',
};


const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

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

// Horas visibles en el calendario (8 AM a 8 PM)
const HORA_INICIO = 8;
const HORA_FIN = 21;
const HORAS = Array.from({ length: HORA_FIN - HORA_INICIO + 1 }, (_, i) => i + HORA_INICIO);
const ALTURA_MEDIA_HORA = 40; // px por media hora → 80px por hora

const TURNO_COLORS: Record<Estado, { bg: string; border: string; text: string; dot: string }> = {
  pendiente:  { bg: 'bg-amber-50',   border: 'border-l-amber-400',   text: 'text-amber-900',   dot: 'bg-amber-400'   },
  confirmado: { bg: 'bg-violet-50',  border: 'border-l-violet-500',  text: 'text-violet-900',  dot: 'bg-violet-500'  },
  completado: { bg: 'bg-emerald-50', border: 'border-l-emerald-500', text: 'text-emerald-900', dot: 'bg-emerald-500' },
  cancelado:  { bg: 'bg-zinc-50',    border: 'border-l-zinc-300',    text: 'text-zinc-400',    dot: 'bg-zinc-300'    },
};

export default function TurnosPage() {
  const params = useParams();
  const tenantSlug = params.tenantSlug as string;

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [vista, setVista] = useState<Vista>('calendario');

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
  const goToday = () => setSelectedDate(new Date());

  const isToday = toDateStr(selectedDate) === toDateStr(new Date());

  // ── Vista Calendario ───────────────────────────────────────────────────────
  const renderCalendario = () => {
    const turnosVisibles = turnos.filter(t => t.estado !== 'cancelado');
    const totalAltura = (HORA_FIN - HORA_INICIO) * ALTURA_MEDIA_HORA * 2;

    const toMinutos = (dt: string) => {
      const d = new Date(dt);
      return d.getHours() * 60 + d.getMinutes();
    };

    const minutosToTop = (min: number) =>
      ((min - HORA_INICIO * 60) / 30) * ALTURA_MEDIA_HORA;

    return (
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">

        {/* Grid principal */}
        <div className="overflow-y-auto max-h-[70vh]">
          <div className="flex">

            {/* Columna de horas */}
            <div className="w-16 flex-shrink-0 relative" style={{ height: totalAltura }}>
              {HORAS.map((h) => (
                <div
                  key={h}
                  className="absolute right-0 left-0 flex justify-end pr-3"
                  style={{ top: (h - HORA_INICIO) * ALTURA_MEDIA_HORA * 2 - 8 }}
                >
                  <span className="text-xs text-zinc-400 font-medium">
                    {String(h).padStart(2, '0')}:00
                  </span>
                </div>
              ))}
            </div>

            {/* Área de eventos */}
            <div className="flex-1 relative border-l border-zinc-100" style={{ height: totalAltura }}>

              {/* Líneas cada 30 min */}
              {HORAS.map((h) => (
                <div key={h}>
                  {/* Línea de hora entera */}
                  <div
                    className="absolute left-0 right-0 border-t border-zinc-200"
                    style={{ top: (h - HORA_INICIO) * ALTURA_MEDIA_HORA * 2 }}
                  />
                  {/* Línea de media hora */}
                  <div
                    className="absolute left-0 right-0 border-t border-zinc-100 border-dashed"
                    style={{ top: (h - HORA_INICIO) * ALTURA_MEDIA_HORA * 2 + ALTURA_MEDIA_HORA }}
                  />
                </div>
              ))}

              {/* Línea hora actual */}
              {isToday && (() => {
                const now = new Date();
                const minActual = now.getHours() * 60 + now.getMinutes();
                if (minActual >= HORA_INICIO * 60 && minActual <= HORA_FIN * 60) {
                  return (
                    <div
                      className="absolute left-0 right-0 z-20 flex items-center pointer-events-none"
                      style={{ top: minutosToTop(minActual) }}
                    >
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1.5 flex-shrink-0 shadow" />
                      <div className="flex-1 border-t-2 border-red-400" />
                    </div>
                  );
                }
              })()}

              {/* Bloques de turnos */}
              {turnosVisibles.map((t) => {
                const minInicio = toMinutos(t.fecha_hora);
                if (minInicio < HORA_INICIO * 60 || minInicio > HORA_FIN * 60) return null;

                const top    = minutosToTop(minInicio);
                const height = Math.max((t.duracion_minutos / 30) * ALTURA_MEDIA_HORA - 4, 36);
                const colors = TURNO_COLORS[t.estado];

                return (
                  <div
                    key={t.id}
                    className={cn(
                      'absolute left-2 right-2 rounded-xl border-l-4 px-3 py-2 shadow-sm overflow-hidden',
                      colors.bg, colors.border
                    )}
                    style={{ top: top + 2, height }}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', colors.dot)} />
                      <p className={cn('text-xs font-bold truncate', colors.text)}>
                        {formatHora(t.fecha_hora)} — {t.cliente_nombre}
                      </p>
                    </div>
                    {height >= 48 && (
                      <p className={cn('text-xs truncate pl-3', colors.text, 'opacity-70')}>
                        {t.servicio_nombre}
                      </p>
                    )}
                    {height >= 64 && t.profesional_nombre && (
                      <p className={cn('text-xs truncate pl-3 opacity-50', colors.text)}>
                        {t.profesional_nombre}
                      </p>
                    )}
                  </div>
                );
              })}

            </div>
          </div>
        </div>

        {/* Leyenda */}
        <div className="px-4 py-3 border-t border-zinc-100 flex items-center gap-5 flex-wrap">
          {(Object.entries(TURNO_COLORS) as [Estado, typeof TURNO_COLORS[Estado]][])
            .filter(([e]) => e !== 'cancelado')
            .map(([estado, c]) => (
              <div key={estado} className="flex items-center gap-1.5">
                <div className={cn('w-2.5 h-2.5 rounded-full', c.dot)} />
                <span className="text-xs text-zinc-500 capitalize">{estado}</span>
              </div>
            ))}
          <div className="flex items-center gap-1.5 ml-auto">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <span className="text-xs text-zinc-500">Hora actual</span>
          </div>
        </div>
      </div>
    );
  };

  // ── Vista Agenda (lista) ───────────────────────────────────────────────────
  const renderAgenda = () => (
    turnos.length === 0 ? (
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
              <div className="text-center min-w-[52px]">
                <p className="text-lg font-bold text-zinc-900">{formatHora(t.fecha_hora)}</p>
                <p className="text-xs text-zinc-400">{t.duracion_minutos} min</p>
              </div>
              <div className="w-px bg-zinc-100 self-stretch" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-zinc-900">{t.cliente_nombre}</p>
                  <span className={cn('px-2 py-0.5 rounded-lg text-xs font-semibold border', ESTADO_STYLES[t.estado])}>
                    {t.estado}
                  </span>
                </div>
                <p className="text-sm text-zinc-500">{t.servicio_nombre}</p>
                {t.profesional_nombre && (
                  <p className="text-xs text-violet-500 mt-0.5">💆 {t.profesional_nombre}</p>
                )}
                {t.cliente_telefono && (
                  <p className="text-xs text-zinc-400 mt-1">📱 {t.cliente_telefono}</p>
                )}
                {t.pago_monto && (
                  <p className="text-xs text-zinc-400 mt-0.5">
                    💳 {t.pago_metodo} · {t.pago_tipo === 'sena' ? `Seña ${formatARS(Number(t.pago_monto))}` : formatARS(Number(t.pago_monto))} · <span className={t.pago_estado === 'acreditado' ? 'text-emerald-500' : 'text-amber-500'}>{t.pago_estado}</span>
                  </p>
                )}
              </div>
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
    )
  );

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Agenda de Turnos</h1>
          <p className="text-zinc-400 text-sm mt-1">
            {turnos.filter(t => t.estado !== 'cancelado').length} turno{turnos.filter(t => t.estado !== 'cancelado').length !== 1 ? 's' : ''} para este día
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Toggle vista */}
          <div className="flex bg-zinc-100 rounded-xl p-1">
            <button
              onClick={() => setVista('calendario')}
              className={cn('p-2 rounded-lg transition-colors', vista === 'calendario' ? 'bg-white shadow-sm text-violet-600' : 'text-zinc-400 hover:text-zinc-600')}
              title="Vista calendario"
            >
              <CalendarDays className="w-4 h-4" />
            </button>
            <button
              onClick={() => setVista('agenda')}
              className={cn('p-2 rounded-lg transition-colors', vista === 'agenda' ? 'bg-white shadow-sm text-violet-600' : 'text-zinc-400 hover:text-zinc-600')}
              title="Vista lista"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <button onClick={fetchTurnos} className="p-2 rounded-xl hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
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
          {isToday
            ? <span className="text-xs bg-violet-100 text-violet-600 font-semibold px-2 py-0.5 rounded-full">Hoy</span>
            : <button onClick={goToday} className="text-xs text-violet-500 hover:underline">Ir a hoy</button>
          }
        </div>
        <button onClick={nextDay} className="p-2 rounded-xl hover:bg-zinc-100 transition-colors">
          <ChevronRight className="w-5 h-5 text-zinc-600" />
        </button>
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-zinc-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Cargando...
        </div>
      ) : vista === 'calendario' ? renderCalendario() : renderAgenda()}
    </div>
  );
}
