"use client";

import { Check, Plus } from "lucide-react";
import type { Service } from "@/lib/booking-types";
import { cn } from "@/lib/utils";

interface ServiceCardProps {
  service: Service;
  isSelected: boolean;
  onToggle: () => void;
  index: number;
}

// Abstract gradient patterns for each service category
const categoryGradients: Record<string, string> = {
  nails: "from-primary via-secondary to-primary",
  lashes: "from-accent/60 via-primary to-secondary",
  brows: "from-secondary via-accent/40 to-primary",
};

export function ServiceCard({ service, isSelected, onToggle, index }: ServiceCardProps) {
  const gradient = categoryGradients[service.category] || categoryGradients.nails;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div
      className={cn(
        "relative bg-card rounded-2xl p-4 shadow-sm transition-all duration-300 animate-slide-up",
        isSelected 
          ? "border-2 border-primary shadow-md" 
          : "border border-border hover:border-primary/30 hover:shadow-md"
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-center gap-4">
        {/* Abstract circular graphic */}
        <div className="relative w-14 h-14 rounded-full overflow-hidden flex-shrink-0">
          <div className={cn(
            "absolute inset-0 bg-gradient-to-br opacity-80",
            gradient
          )} />
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-card/20 to-card/40" />
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 100 100"
            aria-hidden="true"
          >
            <circle
              cx="70"
              cy="30"
              r="20"
              fill="currentColor"
              className="text-card/30"
            />
            <circle
              cx="30"
              cy="70"
              r="15"
              fill="currentColor"
              className="text-card/20"
            />
          </svg>
        </div>

        {/* Service info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-serif text-lg text-foreground truncate">
            {service.name}
          </h3>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-sm text-muted-foreground">
              {service.duration}
            </span>
            <span className="text-sm font-medium text-accent">
              {formatPrice(service.price)}
            </span>
          </div>
        </div>

        {/* Add/Selected button */}
        <button
          onClick={onToggle}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
            isSelected
              ? "bg-primary text-primary-foreground animate-pulse-pink"
              : "bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground"
          )}
          aria-label={isSelected ? "Quitar del carrito" : "Agregar al carrito"}
        >
          {isSelected ? (
            <Check className="w-5 h-5" strokeWidth={2.5} />
          ) : (
            <Plus className="w-5 h-5" strokeWidth={2} />
          )}
        </button>
      </div>
    </div>
  );
}
