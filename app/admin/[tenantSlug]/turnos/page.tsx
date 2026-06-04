'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  ChevronLeft, ChevronRight, Check, X, Clock, Loader2, RefreshCw,
  CalendarDays, List, MoreHorizontal, Scissors, Phone, DollarSign,
  FileText, CreditCard,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type Estado = 'pendiente' | 'confirmado' | 'completado' | 'cancelado';
type Vista = 'agenda' | 'calendario';

interface Turno {
  id: string;
  fecha_hora: string;
  estado: Estado;
  notas: string | null;
  profesional_id: string | null;
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

interface Profesional {
  id: string;
  nombre: string;
  activo: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ESTADO_STYLES: Record<Estado, string> = {
  pendiente:  'bg-amber-100 text-amber-700 border-amber-200',
  confirmado: 'bg-blue-100 text-blue-700 border-blue-200',
  completado: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  cancelado:  'bg-zinc-100 text-zinc-500 border-zinc-200',
};

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const DAYS_SHORT = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

const EMPLOYEE_COLORS = ['#2d6e2d', '#2c4a6e', '#8c3050', '#7a5c18'];

const HORA_INICIO = 9;
const HORA_FIN    = 20;
const SLOT_HEIGHT = 80; // px per 30-minute slot

// Build time slot labels 09:00 … 20:00 (every 30 min)
const TIME_SLOTS: string[] = [];
for (let h = HORA_INICIO; h <= HORA_FIN; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2,'0')}:00`);
  if (h < HORA_FIN) TIME_SLOTS.push(`${String(h).padStart(2,'0')}:30`);
}

// Agenda (list) view colour coding
const TURNO_COLORS: Record<Estado, { bg: string; border: string; text: string; dot: string }> = {
  pendiente:  { bg: 'bg-amber-50',   border: 'border-l-amber-400',   text: 'text-amber-900',   dot: 'bg-amber-400'   },
  confirmado: { bg: 'bg-violet-50',  border: 'border-l-violet-500',  text: 'text-violet-900',  dot: 'bg-violet-500'  },
  completado: { bg: 'bg-emerald-50', border: 'border-l-emerald-500', text: 'text-emerald-900', dot: 'bg-emerald-500' },
  cancelado:  { bg: 'bg-zinc-50',    border: 'border-l-zinc-300',    text: 'text-zinc-400',    dot: 'bg-zinc-300'    },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatARS(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n);
}

function formatHora(dt: string) {
  const d = new Date(dt);
  return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
}

function formatFechaHora(dt: string) {
  const d = new Date(dt);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()} ${formatHora(dt)}`;
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

/** Returns the Monday of the week containing `d` */
function getWeekStart(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay(); // 0=Sun … 6=Sat
  const diff = (day === 0 ? -6 : 1 - day); // shift to Monday
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** Returns Mon–Sun array for the week that starts on `monday` */
function getWeekDays(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function TurnoModal({
  turno,
  profesionalColor,
  onClose,
  onCancelar,
  canceling,
}: {
  turno: Turno;
  profesionalColor: string;
  onClose: () => void;
  onCancelar: () => void;
  canceling: boolean;
}) {
  const clientInitials = getInitials(turno.cliente_nombre);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 border-b border-zinc-100">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
              style={{ backgroundColor: profesionalColor }}
            >
              {clientInitials}
            </div>
            <div>
              <p className="font-bold text-zinc-900 text-base leading-tight">{turno.cliente_nombre}</p>
              <p className="text-sm text-zinc-400 mt-0.5">{turno.profesional_nombre ?? 'Sin asignar'}</p>
            </div>
          </div>
        </div>

        {/* Info rows */}
        <div className="px-6 py-4 space-y-3">
          {[
            { Icon: Scissors,    label: 'Servicio',  value: turno.servicio_nombre },
            { Icon: Clock,       label: 'Horario',   value: formatFechaHora(turno.fecha_hora) },
            { Icon: Clock,       label: 'Duración',  value: `${turno.duracion_minutos} min` },
            { Icon: Phone,       label: 'Teléfono',  value: turno.cliente_telefono || '—' },
            { Icon: DollarSign,  label: 'Precio',    value: formatARS(Number(turno.precio)) },
            { Icon: FileText,    label: 'Notas',     value: turno.notas || 'Sin notas' },
            ...(turno.pago_monto ? [{
              Icon: CreditCard,
              label: 'Pago',
              value: `${turno.pago_metodo ?? ''} · ${turno.pago_tipo === 'sena' ? `Seña ${formatARS(Number(turno.pago_monto))}` : formatARS(Number(turno.pago_monto))} · ${turno.pago_estado ?? ''}`,
            }] : []),
          ].map(({ Icon, label, value }, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <div className="mt-0.5 w-5 h-5 flex-shrink-0 text-zinc-400">
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wide">{label}</span>
                <p className="text-sm text-zinc-800 mt-0.5">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-2 border-t border-zinc-100">
          {turno.estado !== 'cancelado' ? (
            <button
              onClick={onCancelar}
              disabled={canceling}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-red-300 text-red-500 font-semibold hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {canceling ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
              Cancelar turno
            </button>
          ) : (
            <p className="text-center text-sm text-zinc-400 font-medium">Turno cancelado</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Weekly Calendar ──────────────────────────────────────────────────────────

function WeeklyCalendar({
  turnos,
  profesionales,
  weekStart,
  onOpenModal,
}: {
  turnos: Turno[];
  profesionales: Profesional[];
  weekStart: Date;
  onOpenModal: (t: Turno) => void;
}) {
  const weekDays = getWeekDays(weekStart);
  const today = toDateStr(new Date());

  // Build columns: one per active profesional, plus "Sin asignar" if needed
  const unassigned = turnos.filter(t => !t.profesional_id);
  const columns: Array<{ id: string | null; nombre: string; color: string; turnos: Turno[] }> = [
    ...profesionales
      .filter(p => p.activo)
      .map((p, idx) => ({
        id: p.id,
        nombre: p.nombre,
        color: EMPLOYEE_COLORS[idx % EMPLOYEE_COLORS.length],
        turnos: turnos.filter(t => t.profesional_id === p.id),
      })),
    ...(unassigned.length > 0
      ? [{ id: null, nombre: 'Sin asignar', color: '#71717a', turnos: unassigned }]
      : []),
  ];

  const totalGridHeight = TIME_SLOTS.length * SLOT_HEIGHT;

  // Current-time indicator
  const now = new Date();
  const todayIsInWeek = weekDays.some(d => toDateStr(d) === today);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowTopPx = ((nowMinutes - HORA_INICIO * 60) / 30) * SLOT_HEIGHT;
  const showNowLine = todayIsInWeek && nowMinutes >= HORA_INICIO * 60 && nowMinutes <= HORA_FIN * 60;

  // Position a turno card within its column
  const cardStyle = (t: Turno): React.CSSProperties => {
    const d = new Date(t.fecha_hora);
    const startMinutes = d.getHours() * 60 + d.getMinutes();
    const top = ((startMinutes - HORA_INICIO * 60) / 30) * SLOT_HEIGHT;
    const height = Math.max((t.duracion_minutos / 30) * SLOT_HEIGHT - 4, 64);
    return { position: 'absolute', top, height, left: 4, right: 4 };
  };

  // Filter turnos for a specific day column
  const turnosForDay = (colTurnos: Turno[], day: Date): Turno[] => {
    const ds = toDateStr(day);
    return colTurnos.filter(t => {
      const d = new Date(t.fecha_hora);
      return toDateStr(d) === ds;
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
      {/* Sticky header row */}
      <div className="flex border-b border-zinc-200 sticky top-0 bg-white z-20">
        {/* Time gutter header */}
        <div className="w-14 flex-shrink-0 border-r border-zinc-100" />

        {/* Day × Employee headers */}
        {weekDays.map((day) => {
          const ds = toDateStr(day);
          const isToday = ds === today;
          return (
            <div
              key={ds}
              className={cn(
                'flex-1 min-w-0 border-r border-zinc-100 last:border-r-0',
              )}
            >
              {/* Day header */}
              <div className={cn(
                'flex items-center justify-center gap-1.5 py-2 px-1 border-b border-zinc-100',
                isToday ? 'bg-violet-50' : ''
              )}>
                <span className={cn(
                  'text-xs font-semibold',
                  isToday ? 'text-violet-600' : 'text-zinc-400'
                )}>
                  {DAYS_SHORT[day.getDay()]}
                </span>
                <span className={cn(
                  'text-sm font-bold',
                  isToday ? 'text-violet-700' : 'text-zinc-700'
                )}>
                  {day.getDate()}
                </span>
              </div>
              {/* Employee sub-headers */}
              <div className="flex">
                {columns.map((col) => (
                  <div
                    key={col.id ?? 'unassigned'}
                    className="flex-1 min-w-0 flex flex-col items-center justify-center py-2 px-1 gap-1 border-r border-zinc-100 last:border-r-0"
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                      style={{ backgroundColor: col.color }}
                    >
                      {getInitials(col.nombre)}
                    </div>
                    <span
                      className="text-[10px] font-medium text-zinc-500 truncate w-full text-center leading-tight"
                      title={col.nombre}
                    >
                      {col.nombre}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Scrollable grid body */}
      <div className="overflow-y-auto max-h-[65vh]">
        <div className="flex" style={{ height: totalGridHeight }}>

          {/* Time gutter */}
          <div className="w-14 flex-shrink-0 relative border-r border-zinc-100">
            {TIME_SLOTS.map((label, i) => (
              <div
                key={label}
                className="absolute inset-x-0 flex items-start justify-end pr-2 pt-0.5"
                style={{ top: i * SLOT_HEIGHT, height: SLOT_HEIGHT }}
              >
                <span className={cn(
                  'text-xs font-medium',
                  label.endsWith(':00') ? 'text-zinc-500' : 'text-zinc-300'
                )}>
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map((day) => {
            const ds = toDateStr(day);
            const isToday = ds === today;
            return (
              <div
                key={ds}
                className={cn(
                  'flex-1 min-w-0 relative border-r border-zinc-100 last:border-r-0',
                  isToday ? 'bg-violet-50/30' : ''
                )}
              >
                {/* Horizontal grid lines */}
                {TIME_SLOTS.map((label, i) => (
                  <div
                    key={label}
                    className={cn(
                      'absolute left-0 right-0',
                      label.endsWith(':00')
                        ? 'border-t border-zinc-200'
                        : 'border-t border-zinc-100 border-dashed'
                    )}
                    style={{ top: i * SLOT_HEIGHT }}
                  />
                ))}

                {/* Current-time line (shown on today's column) */}
                {showNowLine && isToday && (
                  <div
                    className="absolute left-0 right-0 z-10 flex items-center pointer-events-none"
                    style={{ top: nowTopPx }}
                  >
                    <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 flex-shrink-0" />
                    <div className="flex-1 border-t-2 border-red-400" />
                  </div>
                )}

                {/* Employee sub-columns */}
                <div className="absolute inset-0 flex">
                  {columns.map((col) => {
                    const dayTurnos = turnosForDay(col.turnos, day);
                    return (
                      <div
                        key={col.id ?? 'unassigned'}
                        className="flex-1 min-w-0 relative border-r border-zinc-100/60 last:border-r-0"
                      >
                        {dayTurnos.map((t) => (
                          <TurnoCard
                            key={t.id}
                            turno={t}
                            color={col.color}
                            style={cardStyle(t)}
                            onOpen={() => onOpenModal(t)}
                          />
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Turno Card ───────────────────────────────────────────────────────────────

function TurnoCard({
  turno,
  color,
  style,
  onOpen,
}: {
  turno: Turno;
  color: string;
  style: React.CSSProperties;
  onOpen: () => void;
}) {
  return (
    <div
      className="absolute rounded-lg overflow-hidden cursor-default select-none"
      style={{ ...style, backgroundColor: color }}
    >
      <div className="relative h-full px-2 py-1 flex flex-col gap-0.5">
        <button
          onClick={onOpen}
          className="absolute top-1 right-1 p-0.5 rounded hover:bg-white/20 transition-colors text-white/80 hover:text-white flex-shrink-0"
          title="Ver detalle"
        >
          <MoreHorizontal className="w-3 h-3" />
        </button>

        <p className="text-[11px] font-bold text-white leading-tight pr-5" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {formatHora(turno.fecha_hora)}
        </p>
        <p className="text-[11px] text-white/90 leading-tight" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {turno.cliente_nombre}
        </p>
        <p className="text-[10px] text-white/70 leading-tight" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {turno.servicio_nombre}
        </p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TurnosPage() {
  const params = useParams();
  const tenantSlug = params.tenantSlug as string;

  // Week navigation state — anchor on Monday of the current week
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const weekDays = getWeekDays(weekStart);

  // For the agenda (list) view, keep a single selected date
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [vista, setVista] = useState<Vista>('calendario');

  // Modal state
  const [modalTurno, setModalTurno] = useState<Turno | null>(null);
  const [canceling, setCanceling] = useState(false);

  // ── Fetch helpers ──────────────────────────────────────────────────────────

  const fetchProfesionales = useCallback(async () => {
    const res = await fetch(`/api/admin/${tenantSlug}/profesionales`);
    const data = await res.json();
    if (Array.isArray(data)) setProfesionales(data);
  }, [tenantSlug]);

  const fetchWeekTurnos = useCallback(async () => {
    setLoading(true);
    try {
      const fechaInicio = toDateStr(weekDays[0]);
      const fechaFin    = toDateStr(weekDays[6]);
      const res = await fetch(`/api/admin/${tenantSlug}/turnos?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`);
      const data = await res.json();
      if (Array.isArray(data)) setTurnos(data);
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, weekStart]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchDayTurnos = useCallback(async () => {
    setLoading(true);
    try {
      const fecha = toDateStr(selectedDate);
      const res = await fetch(`/api/admin/${tenantSlug}/turnos?fecha=${fecha}`);
      const data = await res.json();
      if (Array.isArray(data)) setTurnos(data);
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, selectedDate]);

  // Fetch on mount and when week/date/view changes
  useEffect(() => {
    fetchProfesionales();
  }, [fetchProfesionales]);

  useEffect(() => {
    if (vista === 'calendario') {
      fetchWeekTurnos();
    } else {
      fetchDayTurnos();
    }
  }, [vista, fetchWeekTurnos, fetchDayTurnos]);

  const refetch = () => {
    if (vista === 'calendario') fetchWeekTurnos();
    else fetchDayTurnos();
  };

  // ── Estado changes ─────────────────────────────────────────────────────────

  const changeEstado = async (id: string, estado: Estado) => {
    setUpdating(id);
    await fetch(`/api/admin/${tenantSlug}/turnos`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, estado }),
    });
    await (vista === 'calendario' ? fetchWeekTurnos() : fetchDayTurnos());
    setUpdating(null);
  };

  // ── Week navigation ────────────────────────────────────────────────────────

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  };
  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  };
  const goToday = () => {
    setWeekStart(getWeekStart(new Date()));
    setSelectedDate(new Date());
  };

  // ── Day navigation (agenda view) ───────────────────────────────────────────

  const prevDay = () => { const d = new Date(selectedDate); d.setDate(d.getDate()-1); setSelectedDate(d); };
  const nextDay = () => { const d = new Date(selectedDate); d.setDate(d.getDate()+1); setSelectedDate(d); };
  const isToday = toDateStr(selectedDate) === toDateStr(new Date());

  // ── Week label ─────────────────────────────────────────────────────────────

  const weekEnd = weekDays[6];
  const weekLabel =
    weekStart.getMonth() === weekEnd.getMonth()
      ? `${weekStart.getDate()} – ${weekEnd.getDate()} ${MONTHS_SHORT[weekEnd.getMonth()]} ${weekEnd.getFullYear()}`
      : `${weekStart.getDate()} ${MONTHS_SHORT[weekStart.getMonth()]} – ${weekEnd.getDate()} ${MONTHS_SHORT[weekEnd.getMonth()]} ${weekEnd.getFullYear()}`;

  // ── Modal cancel handler ───────────────────────────────────────────────────

  const handleCancelarModal = async () => {
    if (!modalTurno) return;
    setCanceling(true);
    await fetch(`/api/admin/${tenantSlug}/turnos`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: modalTurno.id, estado: 'cancelado' }),
    });
    await fetchWeekTurnos();
    // Update modal turno state to reflect cancellation
    setModalTurno(prev => prev ? { ...prev, estado: 'cancelado' } : null);
    setCanceling(false);
  };

  // ── Color lookup for a profesional ────────────────────────────────────────

  const getProfesionalColor = (turno: Turno): string => {
    if (!turno.profesional_id) return '#71717a';
    const idx = profesionales.filter(p => p.activo).findIndex(p => p.id === turno.profesional_id);
    if (idx < 0) return '#71717a';
    return EMPLOYEE_COLORS[idx % EMPLOYEE_COLORS.length];
  };

  // ── Agenda (list) view ─────────────────────────────────────────────────────

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

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-8 max-w-full mx-auto">

      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Agenda de Turnos</h1>
          <p className="text-zinc-400 text-sm mt-1">
            {turnos.filter(t => t.estado !== 'cancelado').length} turno
            {turnos.filter(t => t.estado !== 'cancelado').length !== 1 ? 's' : ''}{' '}
            {vista === 'calendario' ? 'esta semana' : 'para este día'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-zinc-100 rounded-xl p-1">
            <button
              onClick={() => setVista('calendario')}
              className={cn('p-2 rounded-lg transition-colors', vista === 'calendario' ? 'bg-white shadow-sm text-violet-600' : 'text-zinc-400 hover:text-zinc-600')}
              title="Vista semanal"
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
          <button onClick={refetch} className="p-2 rounded-xl hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Navigation bar */}
      {vista === 'calendario' ? (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4 mb-6 flex items-center justify-between">
          <button onClick={prevWeek} className="p-2 rounded-xl hover:bg-zinc-100 transition-colors">
            <ChevronLeft className="w-5 h-5 text-zinc-600" />
          </button>
          <div className="text-center flex items-center gap-3">
            <p className="font-semibold text-zinc-900">{weekLabel}</p>
            <button
              onClick={goToday}
              className="text-xs bg-violet-100 text-violet-600 font-semibold px-2.5 py-1 rounded-full hover:bg-violet-200 transition-colors"
            >
              Hoy
            </button>
          </div>
          <button onClick={nextWeek} className="p-2 rounded-xl hover:bg-zinc-100 transition-colors">
            <ChevronRight className="w-5 h-5 text-zinc-600" />
          </button>
        </div>
      ) : (
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
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-zinc-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Cargando...
        </div>
      ) : vista === 'calendario' ? (
        <WeeklyCalendar
          turnos={turnos}
          profesionales={profesionales}
          weekStart={weekStart}
          onOpenModal={setModalTurno}
        />
      ) : renderAgenda()}

      {/* Detail modal */}
      {modalTurno && (
        <TurnoModal
          turno={modalTurno}
          profesionalColor={getProfesionalColor(modalTurno)}
          onClose={() => setModalTurno(null)}
          onCancelar={handleCancelarModal}
          canceling={canceling}
        />
      )}
    </div>
  );
}
