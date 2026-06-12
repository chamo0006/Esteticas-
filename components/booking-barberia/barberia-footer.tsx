"use client";

import type { TenantConfig } from "@/lib/booking-types";

const B = { bg: "#111111", card: "#1A1A1A", border: "#2A2A2A", text: "#F5F5F5", muted: "#888888", accent: "#4A7FC1" } as const;

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(n);

interface Props {
  itemCount: number;
  totalAmount: number;
  onContinue: () => void;
  disabled: boolean;
  label?: string;
  tenant?: TenantConfig;
}

export function BarberiaFooter({ itemCount, totalAmount, onContinue, disabled, label = "Elegir fecha y hora", tenant }: Props) {
  const primaryColor = tenant?.color_primario ?? B.accent;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-4"
      style={{ backgroundColor: "rgba(17,17,17,0.97)", backdropFilter: "blur(10px)", borderTop: `1px solid ${B.border}` }}>
      <div className="max-w-lg mx-auto">
        {itemCount > 0 && (
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-sm" style={{ color: B.muted }}>
              {itemCount} {itemCount === 1 ? "servicio" : "servicios"}
            </span>
            <span className="font-bold text-base" style={{ color: B.text }}>{fmt(totalAmount)}</span>
          </div>
        )}
        <button onClick={onContinue} disabled={disabled}
          className="w-full py-4 font-bold text-sm tracking-wide uppercase transition-all duration-200"
          style={
            disabled
              ? { backgroundColor: B.border, color: B.muted, borderRadius: "12px", cursor: "not-allowed" }
              : { backgroundColor: primaryColor, color: "#FFFFFF", borderRadius: "12px", boxShadow: `0 4px 20px ${primaryColor}55` }
          }>
          {label} →
        </button>
      </div>
    </div>
  );
}
