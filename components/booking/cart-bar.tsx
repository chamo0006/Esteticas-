"use client";

import { ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";

interface CartBarProps {
  itemCount: number;
  totalAmount: number;
  onContinue: () => void;
  disabled: boolean;
}

export function CartBar({ itemCount, totalAmount, onContinue, disabled }: CartBarProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border px-4 py-4 shadow-lg z-50">
      <div className="max-w-lg mx-auto flex items-center justify-between gap-4">
        {/* Cart summary */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <ShoppingBag className="w-6 h-6 text-accent" strokeWidth={1.5} />
            {itemCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary text-primary-foreground text-xs font-medium rounded-full flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Items: </span>
            <span className="font-medium text-foreground">{itemCount}</span>
            <span className="text-muted-foreground mx-2">|</span>
            <span className="text-muted-foreground">Total: </span>
            <span className="font-medium text-foreground">{formatPrice(totalAmount)}</span>
          </div>
        </div>

        {/* Continue button */}
        <button
          onClick={onContinue}
          disabled={disabled}
          className={cn(
            "px-6 py-3 rounded-2xl font-medium text-sm transition-all duration-300",
            disabled
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 shadow-md"
          )}
        >
          Continuar
        </button>
      </div>
    </div>
  );
}
