"use client";

import { ChevronLeft, Calendar, CheckCircle, Loader2, MessageCircle } from "lucide-react";
import type { CartItem, TenantConfig, BookingConfirmation } from "@/lib/booking-types";
import { useState } from "react";

interface SummaryPaymentProps {
  cart: CartItem[];
  selectedDate: Date | null;
  selectedTime: string | null;
  totalAmount: number;
  onBack: () => void;
  tenantSlug?: string;
  tenantConfig?: TenantConfig;
  profesionalId?: string | null;
}

type PaymentMethod = "mercadopago" | "efectivo" | "transferencia";
type BookingStatus = "idle" | "loading" | "success" | "error";

const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const WEEKDAYS = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];

function formatPrice(amount: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(amount);
}
function formatDate(date: Date | null) {
  if (!date) return "";
  return `${WEEKDAYS[date.getDay()]}, ${date.getDate()} de ${MONTHS[date.getMonth()]}`;
}
function formatTime(timeValue: string | null) {
  if (!timeValue) return "";
  const [hStr, mStr] = timeValue.split(":");
  const h = parseInt(hStr, 10);
  const ampm = h < 12 ? "AM" : "PM";
  return `${h % 12 || 12}:${mStr} ${ampm}`;
}

const inputStyle = {
  width: "100%",
  padding: "12px 16px",
  backgroundColor: "#FFFFFF",
  border: "1px solid #F0E4E6",
  borderRadius: "12px",
  color: "#2C2C2C",
  fontSize: "14px",
  outline: "none",
  transition: "border-color 0.2s, box-shadow 0.2s",
};

function PremiumInput({ label, id, type = "text", value, onChange, placeholder }: {
  label: string; id: string; type?: string;
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-sans mb-1.5" style={{ color: "#8C7B75" }} htmlFor={id}>
        {label}
      </label>
      <input
        id={id} type={type} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
        onFocus={e => { e.currentTarget.style.borderColor = "#E8B4BC"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(232,180,188,0.15)"; }}
        onBlur={e => { e.currentTarget.style.borderColor = "#F0E4E6"; e.currentTarget.style.boxShadow = "none"; }}
      />
    </div>
  );
}

export function SummaryPayment({
  cart, selectedDate, selectedTime, totalAmount, onBack,
  tenantSlug, tenantConfig, profesionalId,
}: SummaryPaymentProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("mercadopago");
  const [formData, setFormData] = useState({ nombre: "", apellido: "", email: "", phone: "" });
  const [bookingStatus, setBookingStatus] = useState<BookingStatus>("idle");
  const [bookingResult, setBookingResult] = useState<BookingConfirmation | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const exigeSena = tenantConfig?.exige_sena ?? false;
  const porcentajeSena = tenantConfig?.porcentaje_sena ?? 0;
  const permiteEfectivo = tenantConfig?.permite_efectivo ?? true;
  const montoAPagar = exigeSena ? Math.round((totalAmount * porcentajeSena) / 100 * 100) / 100 : totalAmount;

  const handleInput = (field: string, value: string) => setFormData(p => ({ ...p, [field]: value }));
  const isFormValid = () =>
    formData.nombre.trim() !== "" && formData.apellido.trim() !== "" &&
    formData.email.trim() !== "" && formData.phone.trim() !== "";

  const handleConfirmar = async () => {
    if (!tenantSlug || !selectedDate || !selectedTime) return;
    if (bookingStatus === "loading") return;
    setBookingStatus("loading");
    setBookingError(null);

    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const d = String(selectedDate.getDate()).padStart(2, "0");
    const offsetMin = new Date().getTimezoneOffset();
    const sign = offsetMin <= 0 ? "+" : "-";
    const tzHH = String(Math.floor(Math.abs(offsetMin) / 60)).padStart(2, "0");
    const tzMM = String(Math.abs(offsetMin) % 60).padStart(2, "0");
    const fechaHora = `${y}-${m}-${d}T${selectedTime}:00${sign}${tzHH}:${tzMM}`;

    try {
      const res = await fetch(`/api/${tenantSlug}/reservar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          servicioIds: cart.map(i => i.id),
          fechaHora,
          cliente: { nombre: formData.nombre, apellido: formData.apellido, email: formData.email, telefono: formData.phone },
          metodoPago: paymentMethod,
          ...(profesionalId ? { profesionalId } : {}),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Error al confirmar la reserva");
      }

      const data: BookingConfirmation = await res.json();

      if (paymentMethod === "mercadopago") {
        const mpRes = await fetch(`/api/${tenantSlug}/crear-preferencia`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pagoId: data.pagoId, clienteNombre: `${formData.nombre} ${formData.apellido}`.trim(), clienteEmail: formData.email, items: cart.map(i => ({ name: i.name })) }),
        });
        if (mpRes.ok) {
          const mpData = await mpRes.json();
          const url = process.env.NODE_ENV === "production" ? mpData.initPoint : (mpData.sandboxInitPoint ?? mpData.initPoint);
          window.location.href = url;
          return;
        }
      }

      setBookingResult(data);
      setBookingStatus("success");
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : "Error desconocido");
      setBookingStatus("error");
    }
  };

  // ── Pantalla de éxito ───────────────────────────────────────────────────────
  if (bookingStatus === "success" && bookingResult) {
    const wppPhone = (tenantConfig as { telefono?: string } | undefined)?.telefono?.replace(/\D/g, "") ?? "";
    const serviciosTexto = cart.map(i => `• ${i.name}`).join("\n");
    const wppMsg = encodeURIComponent(
      `¡Hola! Acabo de reservar un turno 💅\n\n` +
      `👤 *${formData.nombre} ${formData.apellido}*\n` +
      `📅 *Fecha:* ${formatDate(selectedDate)}\n` +
      `🕐 *Horario:* ${formatTime(selectedTime)}\n` +
      `✨ *Servicios:*\n${serviciosTexto}\n` +
      `💰 *${bookingResult.tipo === "sena" ? "Seña" : "Total"}:* ${formatPrice(bookingResult.monto)}\n` +
      `🔖 *ID:* ${bookingResult.turnoIds[0].slice(0, 8)}\n\n¡Muchas gracias!`
    );
    const wppUrl = wppPhone ? `https://wa.me/${wppPhone}?text=${wppMsg}` : `https://wa.me/?text=${wppMsg}`;

    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: "#FCF8F5" }}>
        <div className="w-full max-w-sm text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: "#FDF0F1", border: "1px solid #F0E4E6" }}>
            <CheckCircle className="w-9 h-9" style={{ color: "#E8B4BC" }} strokeWidth={1.5} />
          </div>
          <h2 className="font-serif text-3xl mb-2" style={{ color: "#2C2C2C" }}>¡Reserva confirmada!</h2>
          <p className="font-serif italic text-sm mb-8" style={{ color: "#8C7B75" }}>Tu experiencia de belleza está agendada</p>

          <div className="rounded-2xl p-5 mb-6 text-left space-y-3"
            style={{ backgroundColor: "#FFFFFF", border: "1px solid #F0E4E6", boxShadow: "0 2px 20px rgba(0,0,0,0.06)" }}>
            <div className="flex justify-between text-sm">
              <span style={{ color: "#8C7B75" }}>Fecha</span>
              <span className="font-medium" style={{ color: "#2C2C2C" }}>{formatDate(selectedDate)}</span>
            </div>
            <div className="h-px" style={{ backgroundColor: "#F0E4E6" }} />
            <div className="flex justify-between text-sm">
              <span style={{ color: "#8C7B75" }}>Horario</span>
              <span className="font-medium" style={{ color: "#2C2C2C" }}>{formatTime(selectedTime)}</span>
            </div>
            <div className="h-px" style={{ backgroundColor: "#F0E4E6" }} />
            <div className="flex justify-between text-sm">
              <span style={{ color: "#8C7B75" }}>{bookingResult.tipo === "sena" ? "Seña abonada" : "Total"}</span>
              <span className="font-medium" style={{ color: "#D4919B" }}>{formatPrice(bookingResult.monto)}</span>
            </div>
          </div>

          <a href={wppUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-4 font-sans font-medium text-sm mb-4 transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#25D366", color: "#FFFFFF", borderRadius: "9999px", boxShadow: "0 4px 16px rgba(37,211,102,0.3)" }}>
            <MessageCircle className="w-4 h-4" />
            Finalizar reserva por WhatsApp
          </a>

          <p className="text-xs" style={{ color: "#8C7B75" }}>
            ID: <code className="font-mono">{bookingResult.turnoIds[0].slice(0, 8)}…</code>
          </p>
        </div>
      </div>
    );
  }

  // ── Formulario ──────────────────────────────────────────────────────────────
  const paymentMethods: { id: PaymentMethod; label: string; icon: string; show: boolean }[] = [
    { id: "mercadopago", label: "Mercado Pago", icon: "💳", show: true },
    { id: "efectivo",    label: "Efectivo",     icon: "💵", show: permiteEfectivo },
    { id: "transferencia", label: "Transferencia", icon: "🏦", show: true },
  ];

  return (
    <div className="animate-fade-in pb-10" style={{ backgroundColor: "#FCF8F5" }}>
      {/* Header */}
      <header className="sticky top-0 z-10 px-5 pt-7 pb-4"
        style={{ backgroundColor: "rgba(252,248,245,0.96)", backdropFilter: "blur(8px)", borderBottom: "1px solid #F0E4E6" }}>
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-sans transition-colors" style={{ color: "#8C7B75" }}>
            <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
            Volver
          </button>
          <h1 className="font-serif text-xl" style={{ color: "#2C2C2C" }}>Confirmar reserva</h1>
        </div>
      </header>

      <div className="px-5 pt-6 space-y-5">

        {/* Resumen de servicios */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: "#FFFFFF", border: "1px solid #F0E4E6", boxShadow: "0 2px 20px rgba(0,0,0,0.06)" }}>
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4" style={{ color: "#E8B4BC" }} strokeWidth={1.5} />
            <div>
              <p className="text-sm font-medium" style={{ color: "#2C2C2C" }}>{formatDate(selectedDate)}</p>
              <p className="text-xs" style={{ color: "#8C7B75" }}>{formatTime(selectedTime)}</p>
            </div>
          </div>

          <div className="space-y-2.5">
            {cart.map((item, i) => (
              <div key={item.id}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-sans" style={{ color: "#2C2C2C" }}>{item.name}</p>
                    <p className="text-xs" style={{ color: "#8C7B75" }}>{item.duration}</p>
                  </div>
                  <p className="text-sm font-medium" style={{ color: "#D4919B" }}>{formatPrice(item.price)}</p>
                </div>
                {i < cart.length - 1 && <div className="h-px mt-2.5" style={{ backgroundColor: "#F0E4E6" }} />}
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 flex items-center justify-between" style={{ borderTop: "1px solid #F0E4E6" }}>
            <span className="font-serif text-base" style={{ color: "#2C2C2C" }}>Total</span>
            <span className="font-serif text-xl" style={{ color: "#2C2C2C" }}>{formatPrice(totalAmount)}</span>
          </div>

          {exigeSena && (
            <div className="mt-3 rounded-xl px-4 py-3 flex items-center justify-between"
              style={{ backgroundColor: "#FDF0F1", border: "1px solid #F0E4E6" }}>
              <span className="text-sm font-sans" style={{ color: "#8C7B75" }}>Señá el {porcentajeSena}% ahora</span>
              <span className="font-serif text-lg font-semibold" style={{ color: "#D4919B" }}>{formatPrice(montoAPagar)}</span>
            </div>
          )}
        </div>

        {/* Datos personales */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: "#FFFFFF", border: "1px solid #F0E4E6", boxShadow: "0 2px 20px rgba(0,0,0,0.06)" }}>
          <h2 className="font-serif text-lg mb-4" style={{ color: "#2C2C2C" }}>Tus datos</h2>
          <div className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <PremiumInput label="Nombre" id="nombre" value={formData.nombre} onChange={v => handleInput("nombre", v)} placeholder="Ana" />
              <PremiumInput label="Apellido" id="apellido" value={formData.apellido} onChange={v => handleInput("apellido", v)} placeholder="García" />
            </div>
            <PremiumInput label="Email" id="email" type="email" value={formData.email} onChange={v => handleInput("email", v)} placeholder="ana@email.com" />
            <div>
              <label className="block text-xs font-sans mb-1.5" style={{ color: "#8C7B75" }}>Teléfono</label>
              <div className="flex gap-2">
                <div className="flex items-center gap-1.5 px-3 rounded-xl flex-shrink-0" style={{ backgroundColor: "#FFFFFF", border: "1px solid #F0E4E6" }}>
                  <span>🇦🇷</span>
                  <span className="text-xs" style={{ color: "#8C7B75" }}>+54</span>
                </div>
                <input type="tel" value={formData.phone} placeholder="11 1234 5678"
                  onChange={e => handleInput("phone", e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}
                  onFocus={e => { e.currentTarget.style.borderColor = "#E8B4BC"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(232,180,188,0.15)"; }}
                  onBlur={e => { e.currentTarget.style.borderColor = "#F0E4E6"; e.currentTarget.style.boxShadow = "none"; }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Método de pago */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: "#FFFFFF", border: "1px solid #F0E4E6", boxShadow: "0 2px 20px rgba(0,0,0,0.06)" }}>
          <h2 className="font-serif text-lg mb-4" style={{ color: "#2C2C2C" }}>Método de Pago</h2>
          <div className="space-y-2.5">
            {paymentMethods.filter(p => p.show).map(p => (
              <button key={p.id} onClick={() => setPaymentMethod(p.id)}
                className="w-full flex items-center gap-3 p-4 transition-all duration-200"
                style={{
                  borderRadius: "14px",
                  border: paymentMethod === p.id ? "1.5px solid #E8B4BC" : "1px solid #F0E4E6",
                  backgroundColor: paymentMethod === p.id ? "#FDF0F1" : "#FFFFFF",
                }}>
                <span className="text-xl">{p.icon}</span>
                <span className="text-sm font-sans font-medium flex-1 text-left" style={{ color: "#2C2C2C" }}>{p.label}</span>
                <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ border: paymentMethod === p.id ? "none" : "1.5px solid #F0E4E6", backgroundColor: paymentMethod === p.id ? "#E8B4BC" : "transparent" }}>
                  {paymentMethod === p.id && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {bookingError && (
          <div className="rounded-xl px-4 py-3 text-sm text-center font-sans" style={{ backgroundColor: "#FEF0F0", color: "#C0392B", border: "1px solid #FBCBC9" }}>
            {bookingError}
          </div>
        )}

        {/* CTA */}
        <button
          onClick={handleConfirmar}
          disabled={!isFormValid() || bookingStatus === "loading"}
          className="w-full py-4 font-sans font-medium text-sm transition-all duration-300 flex items-center justify-center gap-2"
          style={
            !isFormValid() || bookingStatus === "loading"
              ? { backgroundColor: "#F0E4E6", color: "#C9B2B5", borderRadius: "9999px", cursor: "not-allowed" }
              : { backgroundColor: "#E8B4BC", color: "#2C2C2C", borderRadius: "9999px", boxShadow: "0 4px 20px rgba(232,180,188,0.4)" }
          }
        >
          {bookingStatus === "loading" ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Confirmando…</>
          ) : (
            `Confirmar reserva → ${formatPrice(montoAPagar)}`
          )}
        </button>

        <p className="text-center text-xs pb-4" style={{ color: "#8C7B75" }}>
          Al confirmar aceptás los términos del servicio
        </p>
      </div>
    </div>
  );
}
