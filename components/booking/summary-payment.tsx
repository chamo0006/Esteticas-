"use client";

import { ChevronLeft, Calendar, CheckCircle, Loader2, MessageCircle } from "lucide-react";
import type { CartItem, TenantConfig, BookingConfirmation } from "@/lib/booking-types";
import { getBookingTheme } from "@/lib/booking-theme";
import { StepBar } from "./step-bar";
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

export function SummaryPayment({
  cart, selectedDate, selectedTime, totalAmount, onBack,
  tenantSlug, tenantConfig, profesionalId,
}: SummaryPaymentProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("mercadopago");
  const [formData, setFormData] = useState({ nombre: "", apellido: "", email: "", phone: "" });
  const [bookingStatus, setBookingStatus] = useState<BookingStatus>("idle");
  const [bookingResult, setBookingResult] = useState<BookingConfirmation | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const T = getBookingTheme(tenantConfig?.tipo_negocio);
  const isBarberia = tenantConfig?.tipo_negocio === "barberia";
  // Estéticas usan la paleta Sora fija (negro + dorado); la barbería mantiene sus colores.
  const primaryColor = isBarberia ? (tenantConfig?.color_primario ?? "#C9A96E") : T.primary;
  const accentColor  = isBarberia ? (tenantConfig?.color_acento  ?? "#B8935A") : T.accent;

  const exigeSena = tenantConfig?.exige_sena ?? false;
  const porcentajeSena = tenantConfig?.porcentaje_sena ?? 0;
  const permiteEfectivo = tenantConfig?.permite_efectivo ?? true;
  const montoAPagar = exigeSena ? Math.round((totalAmount * porcentajeSena) / 100 * 100) / 100 : totalAmount;

  const inputStyle = {
    width: "100%",
    padding: "12px 16px",
    backgroundColor: T.inputBg,
    border: `1px solid ${T.border}`,
    borderRadius: "12px",
    color: T.text,
    fontSize: "14px",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
  };

  const handleInput = (field: string, value: string) => setFormData(p => ({ ...p, [field]: value }));

  const phoneDigits = formData.phone.replace(/\D/g, "");
  const phoneValid  = phoneDigits.length === 10;
  const phoneError  = formData.phone.trim() !== "" && !phoneValid
    ? "El teléfono debe tener 10 dígitos (ej: 1123456789)"
    : null;

  const isFormValid = () =>
    formData.nombre.trim() !== "" && formData.apellido.trim() !== "" &&
    formData.email.trim() !== "" && phoneValid;

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

        if (!mpRes.ok) {
          const mpErr = await mpRes.json().catch(() => ({}));
          throw new Error(
            mpRes.status === 503
              ? "El pago con Mercado Pago no está disponible en este momento. Probá con otro método de pago."
              : (mpErr.error ?? "No se pudo iniciar el pago con Mercado Pago. Intentá de nuevo.")
          );
        }

        const mpData = await mpRes.json();
        // Siempre usamos el checkout de PRODUCCIÓN (init_point). El sandbox queda
        // solo como último recurso si MP no devolviera init_point.
        const url = mpData.initPoint ?? mpData.sandboxInitPoint;
        if (!url) {
          throw new Error("No se pudo iniciar el pago con Mercado Pago. Intentá de nuevo.");
        }
        window.location.href = url;
        return;
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
    const wppPhone = tenantConfig?.telefono?.replace(/\D/g, "") ?? "";
    const serviciosTexto = cart.map(i => `• ${i.name}`).join("\n");
    const wppEmoji = isBarberia ? "✂️" : "💅";
    const wppMsg = encodeURIComponent(
      `¡Hola! Acabo de reservar un turno ${wppEmoji}\n\n` +
      `👤 *${formData.nombre} ${formData.apellido}*\n` +
      `📅 *Fecha:* ${formatDate(selectedDate)}\n` +
      `🕐 *Horario:* ${formatTime(selectedTime)}\n` +
      `✨ *Servicios:*\n${serviciosTexto}\n` +
      `💰 *${bookingResult.tipo === "sena" ? "Seña" : "Total"}:* ${formatPrice(bookingResult.monto)}\n\n¡Muchas gracias!`
    );
    const wppUrl = wppPhone ? `https://wa.me/${wppPhone}?text=${wppMsg}` : `https://wa.me/?text=${wppMsg}`;

    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: T.bg }}>
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ border: `1px solid ${accentColor}` }}>
            <CheckCircle className="w-7 h-7" style={{ color: accentColor }} strokeWidth={1.2} />
          </div>
          <h2 className="font-serif font-light text-3xl mb-2" style={{ color: T.text }}>¡Reserva confirmada!</h2>
          <div className="w-7 h-px mx-auto mb-4" style={{ backgroundColor: accentColor }} />
          <p className="font-serif italic text-sm mb-8" style={{ color: T.muted }}>
            {isBarberia ? "Tu turno está agendado" : "Tu experiencia de belleza está agendada"}
          </p>

          <div className="rounded-2xl p-5 mb-6 text-left space-y-3"
            style={{ backgroundColor: T.cardBg, border: `1px solid ${T.border}`, boxShadow: `0 2px 20px ${T.shadow}` }}>
            <div className="flex justify-between text-sm">
              <span style={{ color: T.muted }}>Fecha</span>
              <span className="font-medium" style={{ color: T.text }}>{formatDate(selectedDate)}</span>
            </div>
            <div className="h-px" style={{ backgroundColor: T.border }} />
            <div className="flex justify-between text-sm">
              <span style={{ color: T.muted }}>Horario</span>
              <span className="font-medium" style={{ color: T.text }}>{formatTime(selectedTime)}</span>
            </div>
            <div className="h-px" style={{ backgroundColor: T.border }} />
            <div className="flex justify-between text-sm">
              <span style={{ color: T.muted }}>{bookingResult.tipo === "sena" ? "Seña abonada" : "Total"}</span>
              <span className="font-medium" style={{ color: accentColor }}>{formatPrice(bookingResult.monto)}</span>
            </div>
          </div>

          <a href={wppUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-4 font-sans font-medium text-sm mb-4 transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#25D366", color: "#FFFFFF", borderRadius: "9999px", boxShadow: "0 4px 16px rgba(37,211,102,0.3)" }}>
            <MessageCircle className="w-4 h-4" />
            Finalizar por WhatsApp
          </a>
        </div>
      </div>
    );
  }

  // ── Formulario ──────────────────────────────────────────────────────────────
  const paymentMethods: { id: PaymentMethod; label: string; icon: string; show: boolean }[] = [
    { id: "mercadopago",  label: "Mercado Pago",  icon: "💳", show: true },
    { id: "efectivo",     label: "Efectivo",       icon: "💵", show: permiteEfectivo },
    { id: "transferencia", label: "Transferencia", icon: "🏦", show: true },
  ];

  return (
    <div className="animate-fade-in pb-10" style={{ backgroundColor: T.bg }}>
      {/* Header */}
      <header className="sticky top-0 z-10 px-5 pt-7 pb-4"
        style={{ backgroundColor: T.bgSticky, backdropFilter: "blur(8px)", borderBottom: `1px solid ${T.border}` }}>
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-sans transition-colors" style={{ color: T.muted }}>
            <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
            Volver
          </button>
          <h1 className="font-serif text-xl" style={{ color: T.text }}>
            {isBarberia ? "Confirmar turno" : "Confirmar reserva"}
          </h1>
        </div>
      </header>

      {!isBarberia && <StepBar current={2} theme={T} />}

      <div className="px-5 pt-6 space-y-5">

        {/* Resumen de servicios */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: T.cardBg, border: `1px solid ${T.border}`, boxShadow: `0 2px 20px ${T.shadow}` }}>
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4" style={{ color: primaryColor }} strokeWidth={1.5} />
            <div>
              <p className="text-sm font-medium" style={{ color: T.text }}>{formatDate(selectedDate)}</p>
              <p className="text-xs" style={{ color: T.muted }}>{formatTime(selectedTime)}</p>
            </div>
          </div>

          <div className="space-y-2.5">
            {cart.map((item, i) => (
              <div key={item.id}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-sans" style={{ color: T.text }}>{item.name}</p>
                    <p className="text-xs" style={{ color: T.muted }}>{item.duration}</p>
                  </div>
                  <p className="text-sm font-medium" style={{ color: accentColor }}>{formatPrice(item.price)}</p>
                </div>
                {i < cart.length - 1 && <div className="h-px mt-2.5" style={{ backgroundColor: T.border }} />}
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 flex items-center justify-between" style={{ borderTop: `1px solid ${T.border}` }}>
            <span className="font-serif text-base" style={{ color: T.text }}>Total</span>
            <span className="font-serif text-xl" style={{ color: T.text }}>{formatPrice(totalAmount)}</span>
          </div>

          {exigeSena && (
            <div className="mt-3 rounded-xl px-4 py-3 flex items-center justify-between"
              style={{ backgroundColor: `${primaryColor}12`, border: `1px solid ${T.border}` }}>
              <span className="text-sm font-sans" style={{ color: T.muted }}>Señá el {porcentajeSena}% ahora</span>
              <span className="font-serif text-lg font-semibold" style={{ color: accentColor }}>{formatPrice(montoAPagar)}</span>
            </div>
          )}
        </div>

        {/* Datos personales */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: T.cardBg, border: `1px solid ${T.border}`, boxShadow: `0 2px 20px ${T.shadow}` }}>
          <h2 className="font-serif text-lg mb-4" style={{ color: T.text }}>Tus datos</h2>
          <div className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Nombre", id: "nombre", value: formData.nombre, placeholder: isBarberia ? "Juan" : "Ana" },
                { label: "Apellido", id: "apellido", value: formData.apellido, placeholder: isBarberia ? "García" : "García" },
              ].map(f => (
                <div key={f.id}>
                  <label className="block text-xs font-sans mb-1.5" style={{ color: T.muted }}>{f.label}</label>
                  <input
                    id={f.id} type="text" value={f.value} placeholder={f.placeholder}
                    onChange={e => handleInput(f.id, e.target.value)}
                    style={inputStyle}
                    onFocus={e => { e.currentTarget.style.borderColor = primaryColor; e.currentTarget.style.boxShadow = `0 0 0 3px ${primaryColor}20`; }}
                    onBlur={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.boxShadow = "none"; }}
                  />
                </div>
              ))}
            </div>
            <div>
              <label className="block text-xs font-sans mb-1.5" style={{ color: T.muted }}>Email</label>
              <input
                id="email" type="email" value={formData.email} placeholder="ana@email.com"
                onChange={e => handleInput("email", e.target.value)}
                style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = primaryColor; e.currentTarget.style.boxShadow = `0 0 0 3px ${primaryColor}20`; }}
                onBlur={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.boxShadow = "none"; }}
              />
            </div>
            <div>
              <label className="block text-xs font-sans mb-1.5" style={{ color: T.muted }}>Teléfono</label>
              <div className="flex gap-2">
                <div className="flex items-center gap-1.5 px-3 rounded-xl flex-shrink-0" style={{ backgroundColor: T.cardBg, border: `1px solid ${T.border}` }}>
                  <span>🇦🇷</span>
                  <span className="text-xs" style={{ color: T.muted }}>+54</span>
                </div>
                <input type="tel" value={formData.phone} placeholder="1123456789"
                  onChange={e => handleInput("phone", e.target.value)}
                  style={{ ...inputStyle, flex: 1, borderColor: phoneError ? "#F87171" : T.border }}
                  onFocus={e => { e.currentTarget.style.borderColor = phoneError ? "#F87171" : primaryColor; e.currentTarget.style.boxShadow = `0 0 0 3px ${primaryColor}20`; }}
                  onBlur={e => { e.currentTarget.style.borderColor = phoneError ? "#F87171" : T.border; e.currentTarget.style.boxShadow = "none"; }}
                />
              </div>
              {phoneError && (
                <p className="text-xs mt-1.5" style={{ color: "#F87171" }}>{phoneError}</p>
              )}
            </div>
          </div>
        </div>

        {/* Método de pago */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: T.cardBg, border: `1px solid ${T.border}`, boxShadow: `0 2px 20px ${T.shadow}` }}>
          <h2 className="font-serif text-lg mb-4" style={{ color: T.text }}>Método de Pago</h2>
          <div className="space-y-2.5">
            {paymentMethods.filter(p => p.show).map(p => (
              <button key={p.id} onClick={() => setPaymentMethod(p.id)}
                className="w-full flex items-center gap-3 p-4 transition-all duration-200"
                style={{
                  borderRadius: "14px",
                  border: paymentMethod === p.id ? `1.5px solid ${primaryColor}` : `1px solid ${T.border}`,
                  backgroundColor: paymentMethod === p.id ? `${primaryColor}12` : "#FFFFFF",
                }}>
                <span className="text-xl">{p.icon}</span>
                <span className="text-sm font-sans font-medium flex-1 text-left" style={{ color: T.text }}>{p.label}</span>
                <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ border: paymentMethod === p.id ? "none" : `1.5px solid ${T.border}`, backgroundColor: paymentMethod === p.id ? primaryColor : "transparent" }}>
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
              ? { backgroundColor: T.border, color: T.muted, borderRadius: "9999px", cursor: "not-allowed" }
              : { backgroundColor: primaryColor, color: "#FFFFFF", borderRadius: "9999px", boxShadow: `0 4px 20px ${primaryColor}66` }
          }
        >
          {bookingStatus === "loading" ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Confirmando…</>
          ) : (
            `${T.cta} → ${formatPrice(montoAPagar)}`
          )}
        </button>

        <p className="text-center text-xs pb-4" style={{ color: T.muted }}>
          Al confirmar aceptás los términos del servicio
        </p>
      </div>
    </div>
  );
}
