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
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(price);

export function ServiceCard({
  service, isSelected, onToggle, index,
  primaryColor = "#E8B4BC",
  accentColor = "#D4919B",
  borderColor = "#F0E4E6",
  cardBg = "#FFFFFF",
  textColor = "#2C2C2C",
  mutedColor = "#8C7B75",
}: ServiceCardProps) {
  return (
    <div
      className="relative rounded-2xl p-4 transition-all duration-300 animate-slide-up"
      style={{
        animationDelay: `${index * 50}ms`,
        backgroundColor: isSelected ? `${primaryColor}22` : cardBg,
        border: isSelected ? `1px solid ${primaryColor}` : `1px solid ${borderColor}`,
        boxShadow: isSelected ? `0 2px 20px ${primaryColor}25` : `0 2px 20px rgba(0,0,0,0.04)`,
      }}
    >
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0 flex items-center justify-center">
          <div className="rounded-full" style={{ width: 8, height: 8, backgroundColor: accentColor }} />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-serif text-base leading-snug" style={{ color: textColor }}>
            {service.name}
          </h3>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs" style={{ color: mutedColor }}>{service.duration}</span>
            <span className="text-xs" style={{ color: mutedColor }}>·</span>
            <span className="text-sm font-medium" style={{ color: accentColor }}>{formatPrice(service.price)}</span>
          </div>
        </div>

        <button
          onClick={onToggle}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300"
          style={{
            backgroundColor: isSelected ? primaryColor : `${primaryColor}20`,
            color: isSelected ? "#FFFFFF" : primaryColor,
            border: isSelected ? "none" : `1px solid ${borderColor}`,
          }}
          aria-label={isSelected ? "Quitar del carrito" : "Agregar al carrito"}
        >
          {isSelected ? <Check className="w-4 h-4" strokeWidth={2.5} /> : <Plus className="w-4 h-4" strokeWidth={2} />}
        </button>
      </div>
    </div>
  );
}
