"use client";

import { Check, Plus } from "lucide-react";
import type { Service } from "@/lib/booking-types";

interface ServiceCardProps {
  service: Service;
  isSelected: boolean;
  onToggle: () => void;
  index: number;
  primaryColor?: string;
  accentColor?: string;
  borderColor?: string;
  cardBg?: string;
  textColor?: string;
  mutedColor?: string;
  surf2?: string;
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(price);

// Fila de servicio minimalista (Sora): toda la fila es clickeable para
// agregar/quitar del carrito. Se pueden seleccionar varios.
export function ServiceCard({
  service, isSelected, onToggle, index,
  accentColor = "#C8B878",
  borderColor = "#E8E8E0",
  textColor = "#1A1A10",
  mutedColor = "#888870",
  surf2 = "#F5F4F0",
}: ServiceCardProps) {
  return (
    <div
      onClick={onToggle}
      className="flex items-center gap-3 py-3 cursor-pointer animate-slide-up transition-colors"
      style={{
        animationDelay: `${index * 40}ms`,
        borderBottom: `1px solid ${borderColor}`,
        backgroundColor: isSelected ? surf2 : "transparent",
        marginInline: isSelected ? -12 : 0,
        paddingInline: isSelected ? 12 : 0,
        borderRadius: isSelected ? 4 : 0,
      }}
    >
      <div className="flex-1 min-w-0">
        <div className="text-sm leading-snug" style={{ color: textColor }}>{service.name}</div>
        <div className="text-xs mt-0.5" style={{ color: mutedColor }}>{service.duration}</div>
      </div>

      <div className="text-sm font-medium whitespace-nowrap" style={{ color: textColor }}>
        {formatPrice(service.price)}
      </div>

      <div className="w-5 flex justify-end flex-shrink-0">
        {isSelected
          ? <Check className="w-4 h-4" style={{ color: accentColor }} strokeWidth={2.2} />
          : <Plus className="w-4 h-4" style={{ color: mutedColor, opacity: 0.45 }} strokeWidth={1.5} />}
      </div>
    </div>
  );
}
