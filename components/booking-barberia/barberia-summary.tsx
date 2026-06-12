"use client";

import { ChevronLeft, CheckCircle, Loader2, MessageCircle, Calendar } from "lucide-react";
import type { CartItem, TenantConfig, BookingConfirmation } from "@/lib/booking-types";
import { useState } from "react";

const B = { bg: "#111111", card: "#1A1A1A", border: "#2A2A2A", text: "#F5F5F5", muted: "#888888", accent: "#4A7FC1" } as const;

const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const WEEKDAYS = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
const fmt = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(n);
const fmtDate = (d: Date | null) => d ? `${WEEKDAYS[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}` : "";
const fmtTime = (t: string | null) => {
  if (!t) return "";
  const [hS, mS] = t.split(":");
  const h = parseInt(hS, 10);
  return `${h % 12 || 12}:${mS} ${h < 12 ? "AM" : "PM"}`;
};

type PaymentMethod = "mercadopago" | "efectivo" | "transferencia";
type Status = "idle" | "loading" | "success" | "error";

interface Props {
  cart: CartItem[];
  selectedDate: Date | null;
  selectedTime: string | null;
  totalAmount: number;
  onBack: () => void;
  tenantSlug?: string;
  tenant: TenantConfig;
  profesionalId?: string | null;
}

export function BarberiaSummary({ cart, selectedDate, selectedTime, totalAmount, onBack, tenantSlug, tenant, profesionalId }: Props) {
  const primaryColor = tenant.color_primario ?? B.accent;
  const [payMethod, setPayMethod] = useState<PaymentMethod>("mercadopago");
  const [form, setForm] = useState({ nombre: "", apellido: "", email: "", phone: "" });
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<BookingConfirmation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const exigeSena = tenant.exige_sena ?? false;
  const pctSena = tenant.porcentaje_sena ?? 0;
  const permiteEfectivo = tenant.permite_efectivo ?? true;
  const montoAPagar = exigeSena ? Math.round(totalAmount * pctSena / 100 * 100) / 100 : totalAmount;

  const inputStyle = {
    width: "100%", padding: "12px 14px", backgroundColor: "#252525",
    border: `1px solid ${B.border}`, borderRadius: "10px",
    color: B.text, fontSize: "14px", outline: "none",
  };

  const setF = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  const valid = form.nombre.trim() && form.apellido.trim() && form.email.trim() && form.phone.trim();

  const confirm = async () => {
    if (!tenantSlug || !selectedDate || !selectedTime || status === "loading") return;
    setStatus("loading"); setError(null);

    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const d = String(selectedDate.getDate()).padStart(2, "0");
    const off = new Date().getTimezoneOffset();
    const sign = off <= 0 ? "+" : "-";
    const tzH = String(Math.floor(Math.abs(off) / 60)).padStart(2, "0");
    const tzM = String(Math.abs(off) % 60).padStart(2, "0");
    const fechaHora = `${y}-${m}-${d}T${selectedTime}:00${sign}${tzH}:${tzM}`;

    try {
      const res = await fetch(`/api/${tenantSlug}/reservar`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          servicioIds: cart.map(i => i.id), fechaHora,
          cliente: { nombre: form.nombre, apellido: form.apellido, email: form.email, telefono: form.phone },
          metodoPago: payMethod,
          ...(profesionalId ? { profesionalId } : {}),
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Error al confirmar"); }
      const data: BookingConfirmation = await res.json();

      if (payMethod === "mercadopago") {
        const mp = await fetch(`/api/${tenantSlug}/crear-preferencia`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pagoId: data.pagoId, clienteNombre: `${form.nombre} ${form.apellido}`.trim(), clienteEmail: form.email, items: cart.map(i => ({ name: i.name })) }),
        });
        if (mp.ok) {
          const mpD = await mp.json();
          window.location.href = process.env.NODE_ENV === "production" ? mpD.initPoint : (mpD.sandboxInitPoint ?? mpD.initPoint);
          return;
        }
      }
      setResult(data); setStatus("success");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
      setStatus("error");
    }
  };

  // Success screen
  if (status === "success" && result) {
    const wpp = tenant.telefono?.replace(/\D/g, "") ?? "";
    const msg = encodeURIComponent(
      `¡Hola! Acabo de reservar un turno ✂️\n\n👤 *${form.nombre} ${form.apellido}*\n📅 *Fecha:* ${fmtDate(selectedDate)}\n🕐 *Horario:* ${fmtTime(selectedTime)}\n✨ *Servicios:*\n${cart.map(i=>`• ${i.name}`).join("\n")}\n💰 *${result.tipo === "sena" ? "Seña" : "Total"}:* ${fmt(result.monto)}\n\n¡Gracias!`
    );
    const wppUrl = wpp ? `https://wa.me/${wpp}?text=${msg}` : `https://wa.me/?text=${msg}`;

    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: B.bg }}>
        <div className="w-full max-w-sm text-center">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: `${primaryColor}20`, border: `1px solid ${primaryColor}` }}>
            <CheckCircle className="w-9 h-9" style={{ color: primaryColor }} strokeWidth={1.5} />
          </div>
          <h2 className="font-bold text-2xl mb-1" style={{ color: B.text }}>¡Turno confirmado!</h2>
          <p className="text-sm mb-8" style={{ color: B.muted }}>Te esperamos en la barbería</p>

          <div className="rounded-xl p-4 mb-5 text-left space-y-3" style={{ backgroundColor: B.card, border: `1px solid ${B.border}` }}>
            {[
              { label: "Fecha", value: fmtDate(selectedDate) },
              { label: "Horario", value: fmtTime(selectedTime) },
              { label: result.tipo === "sena" ? "Seña" : "Total", value: fmt(result.monto) },
            ].map((row, i, arr) => (
              <div key={row.label}>
                <div className="flex justify-between text-sm">
                  <span style={{ color: B.muted }}>{row.label}</span>
                  <span className="font-semibold" style={{ color: i === arr.length - 1 ? primaryColor : B.text }}>{row.value}</span>
                </div>
                {i < arr.length - 1 && <div className="h-px mt-3" style={{ backgroundColor: B.border }} />}
              </div>
            ))}
          </div>

          <a href={wppUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-4 font-bold text-sm rounded-xl transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#25D366", color: "#FFFFFF" }}>
            <MessageCircle className="w-4 h-4" />
            Confirmar por WhatsApp
          </a>
        </div>
      </div>
    );
  }

  const payOptions: { id: PaymentMethod; label: string; icon: string; show: boolean }[] = [
    { id: "mercadopago",   label: "Mercado Pago",  icon: "💳", show: true },
    { id: "efectivo",      label: "Efectivo",       icon: "💵", show: permiteEfectivo },
    { id: "transferencia", label: "Transferencia",  icon: "🏦", show: true },
  ];

  return (
    <div className="animate-fade-in pb-10" style={{ backgroundColor: B.bg }}>
      {/* Header */}
      <header className="sticky top-0 z-10 px-5 pt-7 pb-4"
        style={{ backgroundColor: "rgba(17,17,17,0.97)", backdropFilter: "blur(10px)", borderBottom: `1px solid ${B.border}` }}>
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-70"
            style={{ color: B.muted }}>
            <ChevronLeft className="w-4 h-4" strokeWidth={2} /> Volver
          </button>
          <h1 className="font-bold text-lg" style={{ color: B.text }}>Confirmar turno</h1>
        </div>
      </header>

      <div className="px-4 pt-5 space-y-4">
        {/* Resumen */}
        <div className="rounded-xl p-4" style={{ backgroundColor: B.card, border: `1px solid ${B.border}` }}>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4" style={{ color: primaryColor }} strokeWidth={1.5} />
            <div>
              <p className="text-sm font-semibold" style={{ color: B.text }}>{fmtDate(selectedDate)}</p>
              <p className="text-xs" style={{ color: B.muted }}>{fmtTime(selectedTime)}</p>
            </div>
          </div>
          <div className="space-y-2">
            {cart.map((item, i) => (
              <div key={item.id}>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium" style={{ color: B.text }}>{item.name}</p>
                    <p className="text-xs" style={{ color: B.muted }}>{item.duration}</p>
                  </div>
                  <p className="text-sm font-bold" style={{ color: primaryColor }}>{fmt(item.price)}</p>
                </div>
                {i < cart.length - 1 && <div className="h-px mt-2" style={{ backgroundColor: B.border }} />}
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 flex justify-between" style={{ borderTop: `1px solid ${B.border}` }}>
            <span className="font-bold text-sm" style={{ color: B.text }}>Total</span>
            <span className="font-bold text-base" style={{ color: B.text }}>{fmt(totalAmount)}</span>
          </div>
          {exigeSena && (
            <div className="mt-3 rounded-lg px-3 py-2.5 flex justify-between"
              style={{ backgroundColor: `${primaryColor}15`, border: `1px solid ${primaryColor}40` }}>
              <span className="text-sm" style={{ color: B.muted }}>Señá el {pctSena}% ahora</span>
              <span className="font-bold text-sm" style={{ color: primaryColor }}>{fmt(montoAPagar)}</span>
            </div>
          )}
        </div>

        {/* Datos */}
        <div className="rounded-xl p-4" style={{ backgroundColor: B.card, border: `1px solid ${B.border}` }}>
          <h2 className="font-bold text-sm uppercase tracking-widest mb-3" style={{ color: B.muted }}>Tus datos</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {[
                { k: "nombre", label: "Nombre", ph: "Juan" },
                { k: "apellido", label: "Apellido", ph: "García" },
              ].map(f => (
                <div key={f.k}>
                  <label className="block text-xs mb-1.5" style={{ color: B.muted }}>{f.label}</label>
                  <input value={form[f.k as keyof typeof form]} placeholder={f.ph}
                    onChange={e => setF(f.k, e.target.value)} style={inputStyle}
                    onFocus={e => { e.currentTarget.style.borderColor = primaryColor; }}
                    onBlur={e => { e.currentTarget.style.borderColor = B.border; }}
                  />
                </div>
              ))}
            </div>
            <div>
              <label className="block text-xs mb-1.5" style={{ color: B.muted }}>Email</label>
              <input type="email" value={form.email} placeholder="juan@email.com"
                onChange={e => setF("email", e.target.value)} style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = primaryColor; }}
                onBlur={e => { e.currentTarget.style.borderColor = B.border; }}
              />
            </div>
            <div>
              <label className="block text-xs mb-1.5" style={{ color: B.muted }}>Teléfono</label>
              <div className="flex gap-2">
                <div className="flex items-center gap-1.5 px-3 rounded-[10px] flex-shrink-0"
                  style={{ backgroundColor: "#252525", border: `1px solid ${B.border}` }}>
                  <span>🇦🇷</span>
                  <span className="text-xs" style={{ color: B.muted }}>+54</span>
                </div>
                <input type="tel" value={form.phone} placeholder="11 1234 5678"
                  onChange={e => setF("phone", e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}
                  onFocus={e => { e.currentTarget.style.borderColor = primaryColor; }}
                  onBlur={e => { e.currentTarget.style.borderColor = B.border; }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Pago */}
        <div className="rounded-xl p-4" style={{ backgroundColor: B.card, border: `1px solid ${B.border}` }}>
          <h2 className="font-bold text-sm uppercase tracking-widest mb-3" style={{ color: B.muted }}>Método de pago</h2>
          <div className="space-y-2">
            {payOptions.filter(p => p.show).map(p => (
              <button key={p.id} onClick={() => setPayMethod(p.id)}
                className="w-full flex items-center gap-3 p-3.5 rounded-xl transition-all"
                style={{
                  border: payMethod === p.id ? `1.5px solid ${primaryColor}` : `1px solid ${B.border}`,
                  backgroundColor: payMethod === p.id ? `${primaryColor}15` : B.bg,
                }}>
                <span className="text-lg">{p.icon}</span>
                <span className="text-sm font-medium flex-1 text-left" style={{ color: B.text }}>{p.label}</span>
                <div className="w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ border: payMethod === p.id ? "none" : `1.5px solid ${B.border}`, backgroundColor: payMethod === p.id ? primaryColor : "transparent" }}>
                  {payMethod === p.id && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="rounded-xl px-4 py-3 text-sm text-center" style={{ backgroundColor: "#3A1A1A", color: "#F87171", border: "1px solid #5A2A2A" }}>
            {error}
          </div>
        )}

        {/* CTA */}
        <button onClick={confirm} disabled={!valid || status === "loading"}
          className="w-full py-4 font-bold text-sm uppercase tracking-wide rounded-xl flex items-center justify-center gap-2 transition-all"
          style={
            !valid || status === "loading"
              ? { backgroundColor: B.border, color: B.muted, cursor: "not-allowed" }
              : { backgroundColor: primaryColor, color: "#FFFFFF", boxShadow: `0 4px 20px ${primaryColor}55` }
          }>
          {status === "loading"
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Confirmando…</>
            : `Reservar turno → ${fmt(montoAPagar)}`
          }
        </button>

        <p className="text-center text-xs pb-4" style={{ color: B.muted }}>
          Al reservar aceptás los términos del servicio
        </p>
      </div>
    </div>
  );
}
