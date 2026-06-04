"use client";

interface CartBarProps {
  itemCount: number;
  totalAmount: number;
  onContinue: () => void;
  disabled: boolean;
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(price);

export function CartBar({ itemCount, totalAmount, onContinue, disabled }: CartBarProps) {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 px-5 py-4 z-50"
      style={{
        backgroundColor: "rgba(255,255,255,0.97)",
        borderTop: "1px solid #F0E4E6",
        boxShadow: "0 -4px 24px rgba(0,0,0,0.06)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div className="max-w-lg mx-auto">
        {/* Summary text */}
        {itemCount > 0 && (
          <p
            className="text-center text-xs mb-3 font-sans"
            style={{ color: "#8C7B75" }}
          >
            {itemCount} {itemCount === 1 ? "servicio seleccionado" : "servicios seleccionados"}&nbsp;·&nbsp;
            <span style={{ color: "#2C2C2C", fontWeight: 500 }}>
              {formatPrice(totalAmount)}
            </span>
          </p>
        )}

        {/* CTA button */}
        <button
          onClick={onContinue}
          disabled={disabled}
          className="w-full py-4 font-sans font-medium text-sm transition-all duration-300"
          style={
            disabled
              ? {
                  backgroundColor: "#F0E4E6",
                  color: "#C9B2B5",
                  borderRadius: "9999px",
                  cursor: "not-allowed",
                }
              : {
                  backgroundColor: "#E8B4BC",
                  color: "#2C2C2C",
                  borderRadius: "9999px",
                  boxShadow: "0 4px 16px rgba(232,180,188,0.35)",
                }
          }
        >
          Continuar →
        </button>
      </div>
    </div>
  );
}
