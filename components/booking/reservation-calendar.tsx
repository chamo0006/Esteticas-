"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { SchedulingMode, TimeSlot } from "@/lib/booking-types";
import { useState, useMemo, useEffect } from "react";

interface Profesional {
  id: string;
  nombre: string;
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
  selectedProfesional?: string | null;
  onSelectProfesional?: (id: string | null) => void;
}

// Slots estáticos usados en la demo (/ sin tenant)
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

const weekDays = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];
const months = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function ReservationCalendar({
  onBack,
  selectedDate,
  onSelectDate,
  selectedTime,
  onSelectTime,
  schedulingMode,
  onSchedulingModeChange,
  tenantSlug,
  totalDuracion = 60,
  selectedProfesional,
  onSelectProfesional,
}: ReservationCalendarProps) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [slots, setSlots] = useState<TimeSlot[]>(DEMO_SLOTS);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);

  // Cargar profesionales si hay tenantSlug
  useEffect(() => {
    if (!tenantSlug) return;
    fetch(`/api/${tenantSlug}/profesionales`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setProfesionales(data); })
      .catch(() => {});
  }, [tenantSlug]);

  // Carga disponibilidad real cuando hay tenantSlug y se elige una fecha
  useEffect(() => {
    if (!tenantSlug || !selectedDate) return;

    const year  = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const day   = String(selectedDate.getDate()).padStart(2, "0");
    const fecha = `${year}-${month}-${day}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout

    setSlotsLoading(true);
    setSlots([]);

    fetch(`/api/${tenantSlug}/disponibilidad?fecha=${fecha}&duracion=${totalDuracion}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data: TimeSlot[]) => setSlots(Array.isArray(data) ? data : []))
      .catch(() => setSlots([]))
      .finally(() => { clearTimeout(timeout); setSlotsLoading(false); });

    return () => { controller.abort(); clearTimeout(timeout); };
  }, [tenantSlug, selectedDate, totalDuracion]);

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
    !!a && !!b &&
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear();

  const isPastDate = (date: Date) => {
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    return date < todayMidnight;
  };

  const isCurrentMonth =
    currentMonth.getFullYear() === today.getFullYear() &&
    currentMonth.getMonth() === today.getMonth();

  return (
    <div className="animate-fade-in min-h-screen" style={{ backgroundColor: "#FCF8F5" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-10 px-5 pt-7 pb-5"
        style={{
          backgroundColor: "rgba(252,248,245,0.96)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid #F0E4E6",
        }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 font-sans text-sm transition-colors"
            style={{ color: "#8C7B75" }}
            aria-label="Volver"
          >
            <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
            Volver
          </button>
          <h1
            className="font-serif text-xl"
            style={{ color: "#2C2C2C" }}
          >
            Seleccioná tu fecha
          </h1>
        </div>
      </header>

      <div className="px-5 pt-6 pb-6 space-y-6">
        {/* Calendar card */}
        <div
          className="rounded-2xl p-5"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #F0E4E6",
            boxShadow: "0 2px 20px rgba(0,0,0,0.06)",
          }}
        >
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={() =>
                setCurrentMonth(
                  new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
                )
              }
              disabled={isCurrentMonth}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
              style={{ color: "#8C7B75" }}
              aria-label="Mes anterior"
            >
              <ChevronLeft className="w-5 h-5" strokeWidth={1.5} />
            </button>

            <h2
              className="font-serif text-base"
              style={{ color: "#2C2C2C" }}
            >
              {months[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h2>

            <button
              onClick={() =>
                setCurrentMonth(
                  new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
                )
              }
              className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
              style={{ color: "#8C7B75" }}
              aria-label="Mes siguiente"
            >
              <ChevronRight className="w-5 h-5" strokeWidth={1.5} />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((d) => (
              <div
                key={d}
                className="text-center text-xs font-sans py-1"
                style={{ color: "#8C7B75" }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((date, i) => {
              if (!date) return <div key={`e-${i}`} className="w-full aspect-square" />;
              const selected = isSameDay(date, selectedDate);
              const past = isPastDate(date);
              const isToday = isSameDay(date, today);

              return (
                <button
                  key={date.toISOString()}
                  onClick={() => !past && onSelectDate(date)}
                  disabled={past}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-sans mx-auto transition-all duration-200"
                  style={
                    selected
                      ? {
                          backgroundColor: "#E8B4BC",
                          color: "#2C2C2C",
                          fontWeight: 600,
                        }
                      : past
                      ? {
                          color: "#C9B2B5",
                          cursor: "not-allowed",
                          opacity: 0.4,
                        }
                      : isToday
                      ? {
                          color: "#D4919B",
                          fontWeight: 600,
                          textDecoration: "underline",
                          textUnderlineOffset: "2px",
                        }
                      : {
                          color: "#2C2C2C",
                        }
                  }
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>

        {/* Time slots */}
        <div>
          <h3
            className="font-serif text-lg mb-4"
            style={{ color: "#2C2C2C" }}
          >
            Horarios disponibles
          </h3>

          {slotsLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-12 rounded-full animate-pulse"
                  style={{ backgroundColor: "#F0E4E6" }}
                />
              ))}
            </div>
          ) : !selectedDate ? (
            <p
              className="text-center text-sm py-8 font-sans italic"
              style={{ color: "#8C7B75" }}
            >
              Seleccioná un día para ver los horarios
            </p>
          ) : slots.length === 0 ? (
            <p
              className="text-center text-sm py-8 font-sans italic"
              style={{ color: "#8C7B75" }}
            >
              No hay horarios disponibles para este día
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {slots.map((slot) => {
                const isSelected = selectedTime === slot.timeValue;
                return (
                  <button
                    key={slot.timeValue}
                    onClick={() => slot.available && onSelectTime(slot.timeValue)}
                    disabled={!slot.available}
                    className="py-3 px-4 text-sm font-sans transition-all duration-200"
                    style={
                      isSelected
                        ? {
                            backgroundColor: "#E8B4BC",
                            color: "#2C2C2C",
                            fontWeight: 600,
                            borderRadius: "9999px",
                            border: "1px solid #E8B4BC",
                          }
                        : slot.available
                        ? {
                            backgroundColor: "#FFFFFF",
                            color: "#2C2C2C",
                            borderRadius: "9999px",
                            border: "1px solid #F0E4E6",
                            boxShadow: "0 1px 8px rgba(0,0,0,0.04)",
                          }
                        : {
                            backgroundColor: "#FCF8F5",
                            color: "#C9B2B5",
                            borderRadius: "9999px",
                            border: "1px solid #F0E4E6",
                            opacity: 0.5,
                            cursor: "not-allowed",
                          }
                    }
                  >
                    {slot.time}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Selección de profesional (opcional) */}
        {profesionales.length > 0 && onSelectProfesional && (
          <div>
            <h3 className="font-serif text-lg mb-1" style={{ color: "#2C2C2C" }}>
              ¿Con quién preferís atenderte?
            </h3>
            <p className="text-xs font-sans mb-4" style={{ color: "#8C7B75" }}>
              Opcional — si no elegís, te asignamos la primera disponible
            </p>
            <div className="flex flex-wrap gap-2">
              {/* Opción "cualquiera" */}
              <button
                onClick={() => onSelectProfesional(null)}
                className="px-4 py-2 text-sm font-sans transition-all duration-200"
                style={
                  selectedProfesional === null
                    ? { backgroundColor: "#E8B4BC", color: "#2C2C2C", borderRadius: "9999px", fontWeight: 600, border: "1px solid #E8B4BC" }
                    : { backgroundColor: "#FFFFFF", color: "#8C7B75", borderRadius: "9999px", border: "1px solid #F0E4E6" }
                }
              >
                Cualquiera disponible
              </button>

              {profesionales.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onSelectProfesional(p.id)}
                  className="px-4 py-2 text-sm font-sans transition-all duration-200"
                  style={
                    selectedProfesional === p.id
                      ? { backgroundColor: "#E8B4BC", color: "#2C2C2C", borderRadius: "9999px", fontWeight: 600, border: "1px solid #E8B4BC" }
                      : { backgroundColor: "#FFFFFF", color: "#2C2C2C", borderRadius: "9999px", border: "1px solid #F0E4E6" }
                  }
                >
                  {p.nombre}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
