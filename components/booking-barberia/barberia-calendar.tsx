"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { TimeSlot, TenantConfig } from "@/lib/booking-types";
import { useState, useMemo, useEffect } from "react";

const B = { bg: "#111111", card: "#1A1A1A", border: "#2A2A2A", text: "#F5F5F5", muted: "#888888", accent: "#4A7FC1" } as const;

interface Profesional { id: string; nombre: string; disponible?: boolean }

interface Props {
  onBack: () => void;
  selectedDate: Date | null;
  onSelectDate: (d: Date) => void;
  selectedTime: string | null;
  onSelectTime: (t: string) => void;
  tenantSlug?: string;
  totalDuracion?: number;
  selectedProfesional?: string | null;
  onSelectProfesional?: (id: string | null) => void;
  tenant: TenantConfig;
}

const DEMO_SLOTS: TimeSlot[] = [
  { time: "9:00 AM",  timeValue: "09:00", available: true  },
  { time: "10:00 AM", timeValue: "10:00", available: false },
  { time: "11:00 AM", timeValue: "11:00", available: true  },
  { time: "2:00 PM",  timeValue: "14:00", available: true  },
  { time: "3:00 PM",  timeValue: "15:00", available: false },
  { time: "4:00 PM",  timeValue: "16:00", available: true  },
  { time: "5:00 PM",  timeValue: "17:00", available: true  },
];

const DAYS = ["DOM","LUN","MAR","MIÉ","JUE","VIE","SÁB"];
const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

export function BarberiaCalendar({
  onBack, selectedDate, onSelectDate, selectedTime, onSelectTime,
  tenantSlug, totalDuracion = 60, selectedProfesional, onSelectProfesional, tenant,
}: Props) {
  const primaryColor = tenant.color_primario ?? B.accent;
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [slots, setSlots] = useState<TimeSlot[]>(DEMO_SLOTS);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [profLoading, setProfLoading] = useState(false);

  useEffect(() => {
    if (!tenantSlug) return;
    fetch(`/api/${tenantSlug}/profesionales`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setProfesionales(d); })
      .catch(() => {});
  }, [tenantSlug]);

  useEffect(() => {
    if (!tenantSlug || !selectedDate || !selectedTime || profesionales.length === 0) return;
    const fecha = fmtDate(selectedDate);
    setProfLoading(true);
    fetch(`/api/${tenantSlug}/profesionales?fecha=${fecha}&hora=${selectedTime}&duracion=${totalDuracion}`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setProfesionales(d); })
      .catch(() => {})
      .finally(() => setProfLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantSlug, selectedDate, selectedTime, totalDuracion]);

  useEffect(() => {
    if (!tenantSlug || !selectedDate) return;
    const fecha = fmtDate(selectedDate);
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    setSlotsLoading(true);
    setSlots([]);
    fetch(`/api/${tenantSlug}/disponibilidad?fecha=${fecha}&duracion=${totalDuracion}`, { signal: ctrl.signal })
      .then(r => r.json())
      .then((d: TimeSlot[]) => setSlots(Array.isArray(d) ? d : []))
      .catch(() => setSlots([]))
      .finally(() => { clearTimeout(t); setSlotsLoading(false); });
    return () => { ctrl.abort(); clearTimeout(t); };
  }, [tenantSlug, selectedDate, totalDuracion]);

  function fmtDate(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }

  const calDays = useMemo(() => {
    const y = currentMonth.getFullYear(), m = currentMonth.getMonth();
    const start = new Date(y, m, 1).getDay();
    const end = new Date(y, m + 1, 0).getDate();
    const days: (Date | null)[] = [];
    for (let i = 0; i < start; i++) days.push(null);
    for (let d = 1; d <= end; d++) days.push(new Date(y, m, d));
    return days;
  }, [currentMonth]);

  const sameDay = (a: Date | null, b: Date | null) =>
    !!a && !!b && a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();

  const isPast = (d: Date) => { const m = new Date(); m.setHours(0,0,0,0); return d < m; };
  const isCurrMonth = currentMonth.getFullYear() === today.getFullYear() && currentMonth.getMonth() === today.getMonth();

  return (
    <div className="animate-fade-in min-h-screen pb-36" style={{ backgroundColor: B.bg }}>
      {/* Header */}
      <header className="sticky top-0 z-10 px-5 pt-7 pb-5"
        style={{ backgroundColor: "rgba(17,17,17,0.97)", backdropFilter: "blur(10px)", borderBottom: `1px solid ${B.border}` }}>
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-70"
            style={{ color: B.muted }}>
            <ChevronLeft className="w-4 h-4" strokeWidth={2} /> Volver
          </button>
          <h1 className="font-bold text-lg" style={{ color: B.text }}>Elegí tu fecha</h1>
        </div>
      </header>

      <div className="px-4 pt-5 space-y-5">
        {/* Calendar card */}
        <div className="rounded-2xl p-4" style={{ backgroundColor: B.card, border: `1px solid ${B.border}` }}>
          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
              disabled={isCurrMonth}
              className="w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-25"
              style={{ backgroundColor: B.border, color: B.text }}>
              <ChevronLeft className="w-4 h-4" strokeWidth={2} />
            </button>
            <span className="font-bold text-sm" style={{ color: B.text }}>
              {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </span>
            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: B.border, color: B.text }}>
              <ChevronRight className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>

          {/* Weekdays */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs font-bold py-1" style={{ color: B.muted }}>{d}</div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-y-1">
            {calDays.map((date, i) => {
              if (!date) return <div key={`e-${i}`} className="w-9 h-9 mx-auto" />;
              const sel = sameDay(date, selectedDate);
              const past = isPast(date);
              const isToday = sameDay(date, today);
              return (
                <button key={date.toISOString()} onClick={() => !past && onSelectDate(date)}
                  disabled={past}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-medium mx-auto transition-all"
                  style={
                    sel  ? { backgroundColor: primaryColor, color: "#FFFFFF", fontWeight: 700 }
                    : past ? { color: B.border, cursor: "not-allowed" }
                    : isToday ? { color: primaryColor, fontWeight: 700, border: `1px solid ${primaryColor}` }
                    : { color: B.text }
                  }>
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>

        {/* Time slots */}
        <div>
          <h3 className="font-bold text-sm uppercase tracking-widest mb-3 px-1" style={{ color: B.muted }}>
            🕐 Horarios disponibles
          </h3>
          {slotsLoading ? (
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-11 rounded-xl animate-pulse" style={{ backgroundColor: B.card }} />
              ))}
            </div>
          ) : !selectedDate ? (
            <p className="text-sm text-center py-8" style={{ color: B.muted }}>Seleccioná un día primero</p>
          ) : slots.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: B.muted }}>Sin horarios disponibles</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {slots.map(slot => {
                const sel = selectedTime === slot.timeValue;
                return (
                  <button key={slot.timeValue} onClick={() => slot.available && onSelectTime(slot.timeValue)}
                    disabled={!slot.available}
                    className="py-3 text-sm font-semibold transition-all"
                    style={
                      sel
                        ? { backgroundColor: primaryColor, color: "#FFFFFF", borderRadius: "12px", border: `1px solid ${primaryColor}` }
                        : slot.available
                        ? { backgroundColor: B.card, color: B.text, borderRadius: "12px", border: `1px solid ${B.border}` }
                        : { backgroundColor: B.bg, color: B.border, borderRadius: "12px", border: `1px solid ${B.border}`, opacity: 0.4, cursor: "not-allowed" }
                    }>
                    {slot.time}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Profesionales */}
        {profesionales.length > 0 && onSelectProfesional && (
          <div className="rounded-2xl p-4" style={{ backgroundColor: B.card, border: `1px solid ${B.border}` }}>
            <h3 className="font-bold text-sm uppercase tracking-widest mb-1" style={{ color: B.muted }}>
              💈 Tu barbero
            </h3>
            <p className="text-xs mb-4" style={{ color: B.muted }}>
              {selectedTime ? "Verde = disponible · Gris = ocupado" : "Elegí horario primero"}
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => onSelectProfesional(null)}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all"
                style={
                  selectedProfesional === null
                    ? { backgroundColor: primaryColor, border: `1px solid ${primaryColor}` }
                    : { backgroundColor: B.bg, border: `1px solid ${B.border}` }
                }>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                  style={{ backgroundColor: selectedProfesional === null ? "#FFFFFF20" : B.card }}>
                  ✂️
                </div>
                <span className="text-xs font-medium" style={{ color: selectedProfesional === null ? "#FFFFFF" : B.muted }}>
                  Sin pref.
                </span>
              </button>

              {profesionales.map(p => {
                const initials = p.nombre.split(" ").filter(Boolean).slice(0,2).map((w:string)=>w[0].toUpperCase()).join("");
                const sel = selectedProfesional === p.id;
                const libre = p.disponible !== false;
                const busy = selectedTime && p.disponible === false;
                return (
                  <button key={p.id} onClick={() => !busy && onSelectProfesional(p.id)}
                    disabled={!!busy || profLoading}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all relative"
                    style={
                      sel  ? { backgroundColor: primaryColor, border: `1px solid ${primaryColor}` }
                      : busy ? { backgroundColor: B.bg, border: `1px solid ${B.border}`, opacity: 0.5, cursor: "not-allowed" }
                      : { backgroundColor: B.bg, border: `1px solid ${B.border}` }
                    }>
                    {selectedTime && !profLoading && (
                      <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
                        style={{ backgroundColor: libre ? "#4CAF50" : "#555555" }} />
                    )}
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
                      style={{ backgroundColor: sel ? "#FFFFFF30" : busy ? B.border : `${primaryColor}30`, color: busy ? B.muted : sel ? "#FFFFFF" : B.text }}>
                      {initials}
                    </div>
                    <span className="text-xs font-medium text-center leading-tight"
                      style={{ color: sel ? "#FFFFFF" : busy ? B.muted : B.text }}>
                      {p.nombre.split(" ")[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
