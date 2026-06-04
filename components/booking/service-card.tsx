"use client";

import { Check, Plus } from "lucide-react";
import type { Service } from "@/lib/booking-types";

interface ServiceCardProps {
  service: Service;
  isSelected: boolean;
  onToggle: () => void;
  index: number;
}

// Category color dots
const categoryColors: Record<string, string> = {
  nails: "#E8B4BC",
  lashes: "#D4919B",
  brows: "#C9828C",
  general: "#E8B4BC",
};

const formatPrice = (price: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(price);

export function ServiceCard({ service, isSelected, onToggle, index }: ServiceCardProps) {
  const dotColor = categoryColors[service.category] ?? categoryColors.general;

  return (
    <div
      className="relative rounded-2xl p-4 transition-all duration-300 animate-slide-up"
      style={{
        animationDelay: `${index * 50}ms`,
        backgroundColor: isSelected ? "#FDF0F1" : "#FFFFFF",
        border: isSelected ? "1px solid #E8B4BC" : "1px solid #F0E4E6",
        boxShadow: isSelected
          ? "0 2px 20px rgba(232,180,188,0.18)"
          : "0 2px 20px rgba(0,0,0,0.04)",
      }}
    >
      <div className="flex items-center gap-4">
        {/* Category dot */}
        <div className="flex-shrink-0 flex items-center justify-center">
          <div
            className="rounded-full"
            style={{ width: 8, height: 8, backgroundColor: dotColor }}
          />
        </div>

        {/* Service info */}
        <div className="flex-1 min-w-0">
          <h3
            className="font-serif text-base leading-snug"
            style={{ color: "#2C2C2C" }}
          >
            {service.name}
          </h3>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs" style={{ color: "#8C7B75" }}>
              {service.duration}
            </span>
            <span
              className="text-xs"
              style={{ color: "#8C7B75" }}
            >
              ·
            </span>
            <span
              className="text-sm font-medium"
              style={{ color: "#2C2C2C" }}
            >
              {formatPrice(service.price)}
            </span>
          </div>
        </div>

        {/* Add / selected button */}
        <button
          onClick={onToggle}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300"
          style={{
            backgroundColor: isSelected ? "#E8B4BC" : "#FDF0F1",
            color: isSelected ? "#FFFFFF" : "#D4919B",
            border: isSelected ? "none" : "1px solid #F0E4E6",
          }}
          aria-label={isSelected ? "Quitar del carrito" : "Agregar al carrito"}
        >
          {isSelected ? (
            <Check className="w-4 h-4" strokeWidth={2.5} />
          ) : (
            <Plus className="w-4 h-4" strokeWidth={2} />
          )}
        </button>
      </div>
    </div>
  );
}
