"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { SchedulingMode, TimeSlot, TenantConfig } from "@/lib/booking-types";
import { getBookingTheme, onColor } from "@/lib/booking-theme";
import { StepBar } from "./step-bar";
import { useState, useMemo, useEffect } from "react";

interface Profesional {
  id: string;
  nombre: string;
  disponible?: boolean;
}

interface ReservationCalendarProps {
  onBack: () => void;
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  selectedTime: string | null;
  onSelectTime: (timeValue: string) => void;
  schedulingMode: SchedulingMode;
  onSchedulingModeChange: (mode: SchedulingMode) => void;
  tenantSlug?: string;
  totalDuracion?: number;
  servicioIds?: string[];
  selectedProfesional?: string | null;
  onSelectProfesional?: (id: string | null) => void;
  tenantConfig?: TenantConfig;
}

const DEMO_SLOTS: TimeSlot[] = [
  { time: "9:00 AM",  timeValue: "09:00", available: true  },
  { time: "10:00 AM", timeValue: "10:00", available: false },
  { time: "11:00 AM", timeValue: "11:00", available: true  },
  { time: "12:00 PM", timeValue: "12:00", available: true  },
  { time: "2:00 PM",  timeValue: "14:00", available: true  },
  { time: "3:00 PM",  timeValue: "15:00", available: false },
  { time: "4:00 PM",  timeValue: "16:00", available: true  },
  { time: "5:00 PM",  timeValue: "17:00", available: true  },
];

const weekDays = ["D", "L", "M", "X", "J", "V", "S"];
const months = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

export function ReservationCalendar({
  onBack, selectedDate, onSelectDate, selectedTime, onSelectTime,
  schedulingMode, onSchedulingModeChange, tenantSlug, totalDuracion = 60,
  servicioIds = [], selectedProfesional, onSelectProfesional, tenantConfig,
}: ReservationCalendarProps) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [slots, setSlots] = useState<TimeSlot[]>(DEMO_SLOTS);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [profLoading, setProfLoading] = useState(false);

  const T = getBookingTheme(tenantConfig?.tipo_negocio, tenantConfig?.color_primario, tenantConfig?.color_acento, tenantConfig?.apariencia);
  const isBarberia = tenantConfig?.tipo_negocio === "barberia";
  const primaryColor = T.primary;
  const accentColor  = T.accent;

  // String estable para usar como dependencia (servicioIds llega como array
  // nuevo en cada render del padre, así que comparamos por su contenido).
  const servicioIdsKey = servicioIds.join(",");

  useEffect(() => {
    if (!tenantSlug) return;
    const qs = servicioIdsKey ? `?servicioIds=${servicioIdsKey}` : "";
    fetch(`/api/${tenantSlug}/profesionales${qs}`)
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data)) return;
        setProfesionales(data);
        if (data.length === 1 && onSelectProfesional) onSelectProfesional(data[0].id);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantSlug, servicioIdsKey]);

  useEffect(() => {
    if (!tenantSlug || !selectedDate || !selectedTime || profesionales.length === 0) return;
    const year  = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const day   = String(selectedDate.getDate()).padStart(2, "0");
    const fecha = `${year}-${month}-${day}`;
    const qs = servicioIdsKey ? `&servicioIds=${servicioIdsKey}` : "";
    setProfLoading(true);
    fetch(`/api/${tenantSlug}/profesionales?fecha=${fecha}&hora=${selectedTime}&duracion=${totalDuracion}${qs}`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setProfesionales(data); })
      .catch(() => {})
      .finally(() => setProfLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantSlug, selectedDate, selectedTime, totalDuracion, servicioIdsKey]);

  useEffect(() => {
    if (!tenantSlug || !selectedDate) return;
    const year  = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const day   = String(selectedDate.getDate()).padStart(2, "0");
    const fecha = `${year}-${month}-${day}`;
    const qs = servicioIdsKey ? `&servicioIds=${servicioIdsKey}` : "";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    setSlotsLoading(true);
    setSlots([]);
    fetch(`/api/${tenantSlug}/disponibilidad?fecha=${fecha}&duracion=${totalDuracion}${qs}`, { signal: controller.signal })
      .then(res => res.json())
      .then((data: TimeSlot[]) => setSlots(Array.isArray(data) ? data : []))
      .catch(() => setSlots([]))
      .finally(() => { clearTimeout(timeout); setSlotsLoading(false); });
    return () => { controller.abort(); clearTimeout(timeout); };
  }, [tenantSlug, selectedDate, totalDuracion, servicioIdsKey]);

  const calendarDays = useMemo(() => {
    const year     = currentMonth.getFullYear();
    const month    = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay  = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();
    const days: (Date | null)[] = [];
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
    return days;
  }, [currentMonth]);

  const isSameDay = (a: Date | null, b: Date | null) =>
    !!a && !!b && a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();

  const isPastDate = (date: Date) => {
    const m = new Date(); m.setHours(0, 0, 0, 0); return date < m;
  };

  const isCurrentMonth =
    currentMonth.getFullYear() === today.getFullYear() && currentMonth.getMonth() === today.getMonth();

  return (
    <div className="animate-fade-in min-h-screen" style={{ backgroundColor: T.bg }}>
      {/* Header */}
      <header className="sticky top-0 z-10 px-5 pt-7 pb-5"
        style={{ backgroundColor: T.bgSticky, backdropFilter: "blur(8px)", borderBottom: `1px solid ${T.border}` }}>
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="flex items-center gap-1.5 font-sans text-sm transition-colors"
            style={{ color: T.muted }} aria-label="Volver">
            <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
            Volver
          </button>
          <h1 className="text-xl" style={{ color: T.text, fontFamily: T.fontHead, fontWeight: T.headWeight }}>Seleccioná tu fecha</h1>
        </div>
      </header>

      {!isBarberia && <StepBar current={1} theme={T} />}

      <div className="px-5 pt-6 pb-6 space-y-6">
        {/* Calendar card */}
        <div className="p-5"
          style={{ backgroundColor: T.cardBg, border: `1px solid ${T.border}`, boxShadow: T.shadowBox, borderRadius: T.radCard }}>

          {/* Month navigation */}
          <div className="flex items-center justify-between mb-5">
            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
              disabled={isCurrentMonth}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
              style={{ color: T.muted }} aria-label="Mes anterior">
              <ChevronLeft className="w-5 h-5" strokeWidth={1.5} />
            </button>
            <h2 className="text-base" style={{ color: T.text, fontFamily: T.fontHead, fontWeight: T.headWeight }}>
              {months[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h2>
            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
              style={{ color: T.muted }} aria-label="Mes siguiente">
              <ChevronRight className="w-5 h-5" strokeWidth={1.5} />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-1">
            {weekDays.map(d => (
              <div key={d} className="text-center text-xs font-sans py-1.5" style={{ color: T.muted }}>{d}</div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-y-1">
            {calendarDays.map((date, i) => {
              if (!date) return <div key={`e-${i}`} className="w-9 h-9 mx-auto" />;
              const selected = isSameDay(date, selectedDate);
              const past = isPastDate(date);
              const isToday = isSameDay(date, today);
              const selBg = isBarberia ? accentColor : primaryColor;
              return (
                <button key={date.toISOString()} onClick={() => !past && onSelectDate(date)}
                  disabled={past}
                  className="w-9 h-9 flex items-center justify-center text-sm mx-auto transition-all duration-200"
                  style={{
                    borderRadius: T.radCtl, fontFamily: T.fontBody,
                    ...(selected ? { backgroundColor: selBg, color: onColor(selBg), fontWeight: 600 }
                    : past   ? { color: T.border, cursor: "not-allowed", opacity: 0.4 }
                    : isToday? { color: accentColor, fontWeight: 600, textDecoration: "underline", textUnderlineOffset: "2px" }
                    :          { color: T.text }),
                  }}>
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>

        {/* Time slots */}
        <div>
          <h3 className="text-lg mb-4" style={{ color: T.text, fontFamily: T.fontHead, fontWeight: T.headWeight }}>Horarios disponibles</h3>

          {slotsLoading ? (
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-11 animate-pulse" style={{ backgroundColor: T.border, borderRadius: T.radCtl }} />
              ))}
            </div>
          ) : !selectedDate ? (
            <p className="text-center text-sm py-8 italic" style={{ color: T.muted, fontFamily: T.fontHead }}>
              Seleccioná un día para ver los horarios
            </p>
          ) : slots.length === 0 ? (
            <p className="text-center text-sm py-8 italic" style={{ color: T.muted, fontFamily: T.fontHead }}>
              No hay horarios disponibles para este día
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {slots.map(slot => {
                const isSelected = selectedTime === slot.timeValue;
                return (
                  <button key={slot.timeValue} onClick={() => slot.available && onSelectTime(slot.timeValue)}
                    disabled={!slot.available}
                    className="py-2.5 px-3 text-sm transition-all duration-200"
                    style={{
                      borderRadius: T.radCtl, fontFamily: T.fontBody,
                      ...(isSelected
                        ? { backgroundColor: primaryColor, color: onColor(primaryColor), fontWeight: 600, border: `1px solid ${primaryColor}` }
                        : slot.available
                        ? { backgroundColor: T.cardBg, color: T.text, border: `1px solid ${T.border}`, boxShadow: T.shadowBox }
                        : { backgroundColor: T.bg, color: T.border, border: `1px solid ${T.border}`, opacity: 0.5, cursor: "not-allowed" }),
                    }}>
                    {slot.time}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Profesionales */}
        {profesionales.length > 0 && onSelectProfesional && (
          <div className="p-5"
            style={{ backgroundColor: T.cardBg, border: `1px solid ${T.border}`, boxShadow: T.shadowBox, borderRadius: T.radCard }}>
            <h3 className="text-lg mb-0.5" style={{ color: T.text, fontFamily: T.fontHead, fontWeight: T.headWeight }}>
              ¿Con quién querés atenderte?
            </h3>
            <p className="text-xs mb-4" style={{ color: T.muted, fontFamily: T.fontBody }}>
              {selectedTime
                ? "Verde = disponible en ese horario · Gris = ocupado/a"
                : "Elegí un horario primero para ver disponibilidad"}
            </p>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {profesionales.length > 1 && (
                <button onClick={() => onSelectProfesional(null)}
                  className="flex flex-col items-center gap-2 p-3 text-sm transition-all duration-200"
                  style={{
                    borderRadius: T.radCtl, fontFamily: T.fontBody,
                    ...(selectedProfesional === null
                      ? { backgroundColor: primaryColor, border: `2px solid ${accentColor}` }
                      : { backgroundColor: T.bg, border: `1.5px solid ${T.border}` }),
                  }}>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg"
                    style={{ backgroundColor: selectedProfesional === null ? `${onColor(primaryColor)}50` : T.border }}>
                    {isBarberia ? "✂️" : "✨"}
                  </div>
                  <span className="text-xs font-medium text-center leading-tight"
                    style={{ color: selectedProfesional === null ? onColor(primaryColor) : T.muted }}>
                    Sin preferencia
                  </span>
                </button>
              )}

              {profesionales.map(p => {
                const initials = p.nombre.split(" ").filter(Boolean).slice(0, 2).map((w: string) => w[0].toUpperCase()).join("");
                const isSelected = selectedProfesional === p.id;
                const libre = p.disponible !== false;
                const isBusy = selectedTime && p.disponible === false;
                const selText = onColor(primaryColor);
                return (
                  <button key={p.id} onClick={() => !isBusy && onSelectProfesional(p.id)}
                    disabled={!!isBusy || profLoading}
                    className="flex flex-col items-center gap-2 p-3 text-sm transition-all duration-200 relative"
                    style={{
                      borderRadius: T.radCtl, fontFamily: T.fontBody,
                      ...(isSelected
                        ? { backgroundColor: primaryColor, border: `2px solid ${accentColor}` }
                        : isBusy
                        ? { backgroundColor: T.surf2, border: `1.5px solid ${T.border}`, opacity: 0.6, cursor: "not-allowed" }
                        : { backgroundColor: T.bg, border: `1.5px solid ${T.border}` }),
                    }}>
                    {selectedTime && !profLoading && (
                      <div className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: libre ? "#4CAF50" : T.muted }} />
                    )}
                    <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-base"
                      style={{ backgroundColor: isSelected ? `${selText}60` : isBusy ? T.border : `${primaryColor}40`, color: isBusy ? T.muted : T.text }}>
                      {initials}
                    </div>
                    <span className="text-xs font-medium text-center leading-tight"
                      style={{ color: isSelected ? selText : isBusy ? T.muted : T.text }}>
                      {p.nombre}
                    </span>
                    {isBusy && <span className="text-[10px]" style={{ color: T.muted }}>Ocupado/a</span>}
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
