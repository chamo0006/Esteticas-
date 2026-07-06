"use client";

import type { BookingTheme } from "@/lib/booking-theme";

// Barra de pasos estilo Sora: segmentos finos que se pintan de dorado a medida
// que avanzás, con el contador "n / total". Solo presentacional.
const STEPS = ["Servicios", "Fecha", "Confirmar"];

export function StepBar({ current, theme }: { current: number; theme: BookingTheme }) {
  return (
    <div className="flex items-center gap-1.5 px-5 py-3"
      style={{ borderBottom: `1px solid ${theme.border}`, backgroundColor: theme.bgSticky }}>
      {STEPS.map((label, i) => (
        <div key={label} className="flex-1 h-[2px] rounded-full transition-colors duration-300"
          style={{ backgroundColor: i <= current ? theme.accent : theme.border }} />
      ))}
      <span className="text-[10px] ml-2 whitespace-nowrap tracking-[0.06em]" style={{ color: theme.muted }}>
        {current + 1} / {STEPS.length}
      </span>
    </div>
  );
}
