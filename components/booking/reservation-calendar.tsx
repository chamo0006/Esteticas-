"use client";

import { ArrowLeft, Check, ChevronLeft, ChevronRight } from "lucide-react";
import type { SchedulingMode, TimeSlot } from "@/lib/booking-types";
import { cn } from "@/lib/utils";
import { useState, useMemo, useEffect } from "react";

interface ReservationCalendarProps {
  onBack: () => void;
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  selectedTime: string | null;
  onSelectTime: (timeValue: string) => void;
  schedulingMode: SchedulingMode;
  onSchedulingModeChange: (mode: SchedulingMode) => void;
  // Props para disponibilidad real (opcionales — sin ellos usa slots hardcodeados)
  tenantSlug?: string;
  totalDuracion?: number;
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
}: ReservationCalendarProps) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [slots, setSlots] = useState<TimeSlot[]>(DEMO_SLOTS);
  const [slotsLoading, setSlotsLoading] = useState(false);

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

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm px-4 pt-6 pb-4">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center hover:bg-secondary transition-colors"
            aria-label="Volver"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" strokeWidth={1.5} />
          </button>
          <h1 className="font-serif text-xl text-foreground">
            Elegí fecha y horario
          </h1>
        </div>

      </header>

      {/* Calendario */}
      <div className="px-4 mt-4">
        <div className="bg-card rounded-3xl p-5 shadow-sm border border-border">
          {/* Navegación de mes */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() =>
                setCurrentMonth(
                  new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
                )
              }
              disabled={
                currentMonth.getFullYear() === today.getFullYear() &&
                currentMonth.getMonth() === today.getMonth()
              }
              className="w-10 h-10 rounded-full hover:bg-secondary flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Mes anterior"
            >
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </button>
            <h2 className="font-serif text-lg text-foreground">
              {months[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h2>
            <button
              onClick={() =>
                setCurrentMonth(
                  new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
                )
              }
              className="w-10 h-10 rounded-full hover:bg-secondary flex items-center justify-center transition-colors"
              aria-label="Mes siguiente"
            >
              <ChevronRight className="w-5 h-5 text-foreground" />
            </button>
          </div>

          {/* Cabecera días */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">
                {d}
              </div>
            ))}
          </div>

          {/* Grilla */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((date, i) => {
              if (!date) return <div key={`e-${i}`} className="w-10 h-10" />;
              const selected = isSameDay(date, selectedDate);
              const past = isPastDate(date);
              return (
                <button
                  key={date.toISOString()}
                  onClick={() => !past && onSelectDate(date)}
                  disabled={past}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all mx-auto",
                    selected
                      ? "bg-primary text-primary-foreground shadow-md"
                      : past
                      ? "text-muted-foreground/40 cursor-not-allowed"
                      : "text-foreground hover:bg-secondary"
                  )}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>

        {/* Horarios disponibles */}
        <div className="mt-6">
          <h3 className="font-serif text-lg text-foreground mb-4">Horarios disponibles</h3>

          {slotsLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-12 rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : !selectedDate ? (
            <p className="text-center text-muted-foreground text-sm py-6">
              Seleccioná un día para ver los horarios
            </p>
          ) : slots.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-6">
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
                    className={cn(
                      "relative py-3 px-4 rounded-2xl border-2 transition-all text-sm font-medium",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : slot.available
                        ? "border-border bg-card text-foreground hover:border-primary/30"
                        : "border-border/50 bg-muted/50 text-muted-foreground cursor-not-allowed"
                    )}
                  >
                    {slot.time}
                    {isSelected && (
                      <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
