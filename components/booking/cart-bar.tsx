"use client";

import type { TenantConfig } from "@/lib/booking-types";
import { getBookingTheme } from "@/lib/booking-theme";

interface CartBarProps {
  itemCount: number;
  totalAmount: number;
  onContinue: () => void;
  disabled: boolean;
  tenantConfig?: TenantConfig;
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(price);

export function CartBar({ itemCount, totalAmount, onContinue, disabled, tenantConfig }: CartBarProps) {
  const T = getBookingTheme(tenantConfig?.tipo_negocio);
  const isBarberia = tenantConfig?.tipo_negocio === "barberia";
  const primaryColor = tenantConfig?.color_primario ?? (isBarberia ? "#C9A96E" : "#E8B4BC");

  return (
    <div className="fixed bottom-0 left-0 right-0 px-5 py-4 z-50"
      style={{ backgroundColor: isBarberia ? "rgba(17,17,17,0.97)" : "rgba(255,255,255,0.97)", borderTop: `1px solid ${T.border}`, boxShadow: `0 -4px 24px ${T.shadow}`, backdropFilter: "blur(8px)" }}>
      <div className="max-w-lg mx-auto">
        {itemCount > 0 && (
          <p className="text-center text-xs mb-3 font-sans" style={{ color: T.muted }}>
            {itemCount} {itemCount === 1 ? "servicio seleccionado" : "servicios seleccionados"}&nbsp;·&nbsp;
            <span style={{ color: T.text, fontWeight: 500 }}>{formatPrice(totalAmount)}</span>
          </p>
        )}
        <button onClick={onContinue} disabled={disabled}
          className="w-full py-4 font-sans font-medium text-sm transition-all duration-300"
          style={
            disabled
              ? { backgroundColor: T.border, color: T.muted, borderRadius: "9999px", cursor: "not-allowed" }
              : { backgroundColor: primaryColor, color: "#FFFFFF", borderRadius: "9999px", boxShadow: `0 4px 16px ${primaryColor}55` }
          }>
          Continuar →
        </button>
      </div>
    </div>
  );
}
