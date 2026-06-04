"use client";

import { ArrowLeft, Calendar, Check, CreditCard, MapPin, CheckCircle, Loader2 } from "lucide-react";
import { MessageCircle } from "lucide-react";
import type { CartItem, TenantConfig, BookingConfirmation } from "@/lib/booking-types";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface SummaryPaymentProps {
  cart: CartItem[];
  selectedDate: Date | null;
  selectedTime: string | null;   // formato "HH:MM" (24hs)
  totalAmount: number;
  onBack: () => void;
  // Props de tenant (opcionales — sin ellos muestra todos los métodos y sin seña)
  tenantSlug?: string;
  tenantConfig?: TenantConfig;
}

type PaymentMethod = "mercadopago" | "efectivo" | "transferencia";
type BookingStatus = "idle" | "loading" | "success" | "error";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function formatPrice(amount: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: Date | null) {
  if (!date) return "";
  return `${WEEKDAYS[date.getDay()]}, ${date.getDate()} de ${MONTHS[date.getMonth()]} de ${date.getFullYear()}`;
}

// Convierte "14:00" → "2:00 PM" para mostrar
function formatTime(timeValue: string | null) {
  if (!timeValue) return "";
  const [hStr, mStr] = timeValue.split(":");
  const h = parseInt(hStr, 10);
  const m = mStr ?? "00";
  const ampm = h < 12 ? "AM" : "PM";
  const displayH = h % 12 || 12;
  return `${displayH}:${m} ${ampm}`;
}

export function SummaryPayment({
  cart,
  selectedDate,
  selectedTime,
  totalAmount,
  onBack,
  tenantSlug,
  tenantConfig,
}: SummaryPaymentProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("mercadopago");
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    email: "",
    confirmEmail: "",
    phone: "",
  });
  const [bookingStatus, setBookingStatus] = useState<BookingStatus>("idle");
  const [bookingResult, setBookingResult] = useState<BookingConfirmation | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Calcula cuánto paga el cliente según configuración de seña
  const exigeSena = tenantConfig?.exige_sena ?? false;
  const porcentajeSena = tenantConfig?.porcentaje_sena ?? 0;
  const permiteEfectivo = tenantConfig?.permite_efectivo ?? true;

  const montoAPagar = exigeSena
    ? Math.round((totalAmount * porcentajeSena) / 100 * 100) / 100
    : totalAmount;

  const handleInput = (field: string, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const isFormValid = () =>
    formData.nombre.trim() !== "" &&
    formData.apellido.trim() !== "" &&
    formData.email.trim() !== "" &&
    formData.email === formData.confirmEmail &&
    formData.phone.trim() !== "";

  const handleConfirmar = async () => {
    if (!tenantSlug || !selectedDate || !selectedTime) return;
    if (bookingStatus === "loading") return;

    setBookingStatus("loading");
    setBookingError(null);

    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const d = String(selectedDate.getDate()).padStart(2, "0");
    const fechaHora = `${y}-${m}-${d}T${selectedTime}:00`;

    try {
      const res = await fetch(`/api/${tenantSlug}/reservar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          servicioIds: cart.map((item) => item.id),
          fechaHora,
          cliente: {
            nombre: formData.nombre,
            apellido: formData.apellido,
            email: formData.email,
            telefono: formData.phone,
          },
          metodoPago: paymentMethod,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Error al confirmar la reserva");
      }

      const data: BookingConfirmation = await res.json();

      // Si eligió MercadoPago → crear preferencia y redirigir al checkout de MP
      if (paymentMethod === "mercadopago") {
        const mpRes = await fetch(`/api/${tenantSlug}/crear-preferencia`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pagoId: data.pagoId,
            clienteNombre: `${formData.nombre} ${formData.apellido}`.trim(),
            clienteEmail: formData.email,
            items: cart.map((i) => ({ name: i.name })),
          }),
        });

        if (mpRes.ok) {
          const mpData = await mpRes.json();
          const url = process.env.NODE_ENV === "production"
            ? mpData.initPoint
            : (mpData.sandboxInitPoint ?? mpData.initPoint);
          window.location.href = url;
          return;
        }
        // Si MP falla, muestra confirmación igual (pago queda pendiente manual)
      }

      setBookingResult(data);
      setBookingStatus("success");
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : "Error desconocido");
      setBookingStatus("error");
    }
  };

  // ── Pantalla de confirmación exitosa ─────────────────────────────────────

  if (bookingStatus === "success" && bookingResult) {
    const wppPhone = (tenantConfig as { telefono?: string } | undefined)?.telefono
      ?.replace(/\D/g, "") ?? "";
    const serviciosTexto = cart.map((i) => `• ${i.name}`).join("\n");
    const wppMsg = encodeURIComponent(
      `¡Hola! Acabo de reservar un turno 💅\n\n` +
      `👤 *${formData.nombre} ${formData.apellido}*\n` +
      `📅 *Fecha:* ${formatDate(selectedDate)}\n` +
      `🕐 *Horario:* ${formatTime(selectedTime)}\n` +
      `✨ *Servicios:*\n${serviciosTexto}\n` +
      `💰 *${bookingResult.tipo === "sena" ? "Seña" : "Total"}:* ${formatPrice(bookingResult.monto)}\n` +
      `🔖 *ID:* ${bookingResult.turnoIds[0].slice(0, 8)}\n\n` +
      `¡Muchas gracias!`
    );
    const wppUrl = wppPhone
      ? `https://wa.me/${wppPhone}?text=${wppMsg}`
      : `https://wa.me/?text=${wppMsg}`;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card rounded-3xl p-8 shadow-sm border border-border max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-success-foreground" />
          </div>
          <h2 className="font-serif text-2xl text-foreground mb-2">¡Reserva confirmada!</h2>

          <div className="bg-background rounded-2xl p-4 text-left space-y-2 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Fecha</span>
              <span className="text-foreground font-medium">{formatDate(selectedDate)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Horario</span>
              <span className="text-foreground font-medium">{formatTime(selectedTime)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {bookingResult.tipo === "sena" ? "Seña abonada" : "Total abonado"}
              </span>
              <span className="font-medium text-accent">{formatPrice(bookingResult.monto)}</span>
            </div>
          </div>

          {/* Botón WhatsApp */}
          <a
            href={wppUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-semibold rounded-2xl transition-colors mb-3"
          >
            <MessageCircle className="w-5 h-5" />
            Finalizar reserva por WhatsApp
          </a>

          <p className="text-xs text-muted-foreground">
            ID de reserva: <code className="font-mono">{bookingResult.turnoIds[0].slice(0, 8)}…</code>
          </p>
        </div>
      </div>
    );
  }

  // ── Formulario principal ──────────────────────────────────────────────────

  return (
    <div className="animate-fade-in pb-8">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm px-4 pt-6 pb-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center hover:bg-secondary transition-colors"
            aria-label="Volver"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" strokeWidth={1.5} />
          </button>
          <h1 className="font-serif text-xl text-foreground">Resumen de Compra</h1>
        </div>
      </header>

      <div className="px-4 space-y-6">
        {/* Servicios seleccionados */}
        <div className="bg-card rounded-3xl p-5 shadow-sm border border-border">
          <h2 className="font-serif text-lg text-foreground mb-4">Servicios seleccionados</h2>
          <div className="space-y-3">
            {cart.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
              >
                <div>
                  <p className="font-medium text-foreground">{item.name}</p>
                  <p className="text-sm text-muted-foreground">{item.duration}</p>
                </div>
                <p className="font-medium text-accent">{formatPrice(item.price)}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
            <span className="font-serif text-lg text-foreground">Total</span>
            <span className="font-serif text-xl text-accent">{formatPrice(totalAmount)}</span>
          </div>

          {/* Badge de seña */}
          {exigeSena && (
            <div className="mt-3 flex items-center justify-between bg-primary/10 rounded-2xl px-4 py-3">
              <span className="text-sm text-foreground">
                Señá el {porcentajeSena}% ahora
              </span>
              <span className="font-serif text-lg text-primary font-semibold">
                {formatPrice(montoAPagar)}
              </span>
            </div>
          )}
        </div>

        {/* Fecha y lugar */}
        <div className="bg-card rounded-3xl p-5 shadow-sm border border-border">
          <div className="flex items-start gap-3 mb-4">
            <Calendar className="w-5 h-5 text-accent mt-0.5" strokeWidth={1.5} />
            <div>
              <p className="font-medium text-foreground">{formatDate(selectedDate)}</p>
              <p className="text-sm text-muted-foreground">{formatTime(selectedTime)}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-accent mt-0.5" strokeWidth={1.5} />
            <div>
              <p className="font-medium text-foreground">
                {tenantConfig?.nombre ?? "Estética"}
              </p>
              <p className="text-sm text-muted-foreground">Verificar dirección al confirmar</p>
            </div>
          </div>
        </div>

        {/* Datos personales */}
        <div className="bg-card rounded-3xl p-5 shadow-sm border border-border">
          <h2 className="font-serif text-lg text-foreground mb-4">Datos Personales</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-muted-foreground mb-1.5" htmlFor="nombre">
                  Nombre
                </label>
                <input
                  id="nombre"
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => handleInput("nombre", e.target.value)}
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  placeholder="Tu nombre"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1.5" htmlFor="apellido">
                  Apellido
                </label>
                <input
                  id="apellido"
                  type="text"
                  value={formData.apellido}
                  onChange={(e) => handleInput("apellido", e.target.value)}
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  placeholder="Tu apellido"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-muted-foreground mb-1.5" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInput("email", e.target.value)}
                className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                placeholder="tu@email.com"
              />
            </div>

            <div>
              <label className="block text-sm text-muted-foreground mb-1.5" htmlFor="confirmEmail">
                Confirmar Email
              </label>
              <input
                id="confirmEmail"
                type="email"
                value={formData.confirmEmail}
                onChange={(e) => handleInput("confirmEmail", e.target.value)}
                className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                placeholder="Confirma tu email"
              />
            </div>

            <div>
              <label className="block text-sm text-muted-foreground mb-1.5" htmlFor="phone">
                Teléfono
              </label>
              <div className="flex gap-2">
                <div className="flex items-center gap-2 px-3 bg-background border border-border rounded-xl">
                  <span className="text-lg">🇦🇷</span>
                  <span className="text-sm text-muted-foreground">+54</span>
                </div>
                <input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInput("phone", e.target.value)}
                  className="flex-1 px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  placeholder="11 1234 5678"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Métodos de pago */}
        <div className="bg-card rounded-3xl p-5 shadow-sm border border-border">
          <h2 className="font-serif text-lg text-foreground mb-4">Método de Pago</h2>
          <div className="space-y-3">
            {/* Mercado Pago — siempre disponible */}
            <button
              onClick={() => setPaymentMethod("mercadopago")}
              className={cn(
                "w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all",
                paymentMethod === "mercadopago"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/30"
              )}
            >
              <div className="w-10 h-10 rounded-xl bg-[#00B1EA] flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">MP</span>
              </div>
              <span className="font-medium text-foreground">Mercado Pago</span>
              {paymentMethod === "mercadopago" && (
                <Check className="ml-auto w-5 h-5 text-primary" />
              )}
            </button>

            {/* Efectivo — solo si el tenant lo permite */}
            {permiteEfectivo && (
              <button
                onClick={() => setPaymentMethod("efectivo")}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all",
                  paymentMethod === "efectivo"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30"
                )}
              >
                <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-success-foreground font-bold text-lg">$</span>
                </div>
                <span className="font-medium text-foreground">Efectivo</span>
                {paymentMethod === "efectivo" && (
                  <Check className="ml-auto w-5 h-5 text-primary" />
                )}
              </button>
            )}

            {/* Transferencia */}
            <button
              onClick={() => setPaymentMethod("transferencia")}
              className={cn(
                "w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all",
                paymentMethod === "transferencia"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/30"
              )}
            >
              <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-5 h-5 text-accent" />
              </div>
              <span className="font-medium text-foreground">Transferencia</span>
              {paymentMethod === "transferencia" && (
                <Check className="ml-auto w-5 h-5 text-primary" />
              )}
            </button>
          </div>
        </div>

        {/* Error */}
        {bookingStatus === "error" && bookingError && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-2xl px-4 py-3 text-sm text-destructive">
            {bookingError}
          </div>
        )}

        {/* Botón confirmar */}
        <button
          onClick={tenantSlug ? handleConfirmar : undefined}
          disabled={!isFormValid() || bookingStatus === "loading"}
          className={cn(
            "w-full py-4 rounded-2xl font-medium text-base transition-all flex items-center justify-center gap-2",
            isFormValid() && bookingStatus !== "loading"
              ? "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] shadow-lg"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          )}
        >
          {bookingStatus === "loading" ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Confirmando…
            </>
          ) : exigeSena ? (
            `Pagar seña ${formatPrice(montoAPagar)}`
          ) : (
            "Confirmar Reserva"
          )}
        </button>
      </div>
    </div>
  );
}
