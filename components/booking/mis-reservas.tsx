"use client";

import { useState } from "react";
import { X, Loader2, Calendar, Search, CheckCircle } from "lucide-react";
import type { TenantConfig } from "@/lib/booking-types";
import { getBookingTheme } from "@/lib/booking-theme";

interface MisReservasProps {
  tenantSlug: string;
  tenantConfig?: TenantConfig;
  onClose: () => void;
}

interface Reserva {
  id: string;
  turnoId: string;
  fechaHora: string;
  estado: string;
  servicios: string[];
  total: number;
  profesionalNombre: string | null;
  pagoMonto: number | null;
  pagoTipo: string | null;
  pagoMetodo: string | null;
  pagoEstado: string | null;
  cancelable: boolean;
}

const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const WEEKDAYS = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
const AR_OFFSET_MS = -3 * 60 * 60 * 1000;

function fmtPrice(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(n);
}
function fmtFecha(iso: string) {
  const ar = new Date(new Date(iso).getTime() + AR_OFFSET_MS);
  return `${WEEKDAYS[ar.getUTCDay()]} ${ar.getUTCDate()} de ${MONTHS[ar.getUTCMonth()]}`;
}
function fmtHora(iso: string) {
  const ar = new Date(new Date(iso).getTime() + AR_OFFSET_MS);
  return `${ar.getUTCHours().toString().padStart(2, "0")}:${ar.getUTCMinutes().toString().padStart(2, "0")}`;
}

export function MisReservas({ tenantSlug, tenantConfig, onClose }: MisReservasProps) {
  const T = getBookingTheme(tenantConfig?.tipo_negocio);
  const isBarberia = tenantConfig?.tipo_negocio === "barberia";
  const primaryColor = isBarberia ? (tenantConfig?.color_primario ?? "#C9A96E") : T.primary;
  const accentColor  = isBarberia ? (tenantConfig?.color_acento  ?? "#B8935A") : T.accent;

  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [buscado, setBuscado] = useState(false);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const telDigits = telefono.replace(/\D/g, "");
  const formValid = telDigits.length >= 6 && email.includes("@");

  const inputStyle = {
    width: "100%", padding: "12px 16px", backgroundColor: T.inputBg,
    border: `1px solid ${T.border}`, borderRadius: "12px", color: T.text,
    fontSize: "14px", outline: "none",
  } as React.CSSProperties;

  const buscar = async () => {
    if (!formValid || loading) return;
    setLoading(true); setError(null); setAviso(null);
    try {
      const res = await fetch(`/api/${tenantSlug}/mis-reservas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefono, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo buscar");
      setReservas(data.reservas ?? []);
      setBuscado(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  const cancelar = async (r: Reserva) => {
    const ok = window.confirm(
      `¿Seguro que querés cancelar tu turno del ${fmtFecha(r.fechaHora)} a las ${fmtHora(r.fechaHora)}?`
    );
    if (!ok) return;
    setCancelando(r.id); setError(null); setAviso(null);
    try {
      const res = await fetch(`/api/${tenantSlug}/mis-reservas/cancelar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ turnoId: r.turnoId, telefono, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo cancelar");
      setReservas((prev) => prev.filter((x) => x.id !== r.id));
      const d = data.devolucion;
      if (d?.estado === "devuelto") {
        setAviso(`Turno cancelado. Se te devolvió ${fmtPrice(d.monto)} de la seña${d.retencion > 0 ? ` (se retuvo ${d.retencion}%)` : ""}.`);
      } else if (d?.estado === "retenido") {
        setAviso("Turno cancelado. La seña no se devuelve según la política del comercio.");
      } else if (d?.estado === "error") {
        setAviso("Turno cancelado, pero la devolución de la seña falló. El comercio la va a resolver.");
      } else {
        setAviso("Turno cancelado.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCancelando(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-stretch sm:items-center justify-center sm:p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div className="w-full h-full sm:h-auto sm:max-w-md sm:max-h-[88vh] overflow-y-auto sm:rounded-3xl flex flex-col shadow-2xl"
        style={{ backgroundColor: T.bg }} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between px-5 py-4"
          style={{ backgroundColor: T.bg, borderBottom: `1px solid ${T.border}` }}>
          <h2 className="font-serif text-lg" style={{ color: T.text }}>Mis reservas</h2>
          <button onClick={onClose} className="p-1.5 rounded-full transition-colors"
            style={{ color: T.muted }} aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          {/* Formulario de identificación */}
          <p className="text-sm" style={{ color: T.muted }}>
            Ingresá el teléfono y el email con los que reservaste para ver y cancelar tus turnos.
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs mb-1.5" style={{ color: T.muted }}>Teléfono</label>
              <input type="tel" value={telefono} placeholder="1123456789"
                onChange={(e) => setTelefono(e.target.value)} style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = primaryColor; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = T.border; }} />
            </div>
            <div>
              <label className="block text-xs mb-1.5" style={{ color: T.muted }}>Email</label>
              <input type="email" value={email} placeholder="ana@email.com"
                onChange={(e) => setEmail(e.target.value)} style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = primaryColor; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = T.border; }} />
            </div>
            <button onClick={buscar} disabled={!formValid || loading}
              className="w-full py-3.5 font-medium text-sm flex items-center justify-center gap-2 transition-opacity"
              style={{
                backgroundColor: !formValid || loading ? T.border : primaryColor,
                color: !formValid || loading ? T.muted : "#FFFFFF",
                borderRadius: "9999px", cursor: !formValid || loading ? "not-allowed" : "pointer",
              }}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Buscar mis reservas
            </button>
          </div>

          {error && (
            <div className="rounded-xl px-4 py-3 text-sm text-center"
              style={{ backgroundColor: "#FEF0F0", color: "#C0392B", border: "1px solid #FBCBC9" }}>
              {error}
            </div>
          )}

          {aviso && (
            <div className="rounded-xl px-4 py-3 text-sm flex items-start gap-2"
              style={{ backgroundColor: `${accentColor}18`, color: T.text, border: `1px solid ${T.border}` }}>
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: accentColor }} />
              <span>{aviso}</span>
            </div>
          )}

          {/* Resultados */}
          {buscado && reservas.length === 0 && !aviso && (
            <div className="text-center py-8" style={{ color: T.muted }}>
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No encontramos reservas próximas con esos datos.</p>
            </div>
          )}

          {reservas.map((r) => (
            <div key={r.id} className="rounded-2xl p-4"
              style={{ backgroundColor: T.cardBg, border: `1px solid ${T.border}`, boxShadow: `0 2px 20px ${T.shadow}` }}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <p className="text-sm font-medium" style={{ color: T.text }}>{fmtFecha(r.fechaHora)}</p>
                  <p className="text-xs" style={{ color: T.muted }}>{fmtHora(r.fechaHora)} hs</p>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full capitalize"
                  style={{ backgroundColor: `${accentColor}18`, color: accentColor }}>
                  {r.estado}
                </span>
              </div>
              <p className="text-sm" style={{ color: T.text }}>{r.servicios.join(", ")}</p>
              {r.profesionalNombre && (
                <p className="text-xs mt-0.5" style={{ color: T.muted }}>Con {r.profesionalNombre}</p>
              )}
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs" style={{ color: T.muted }}>
                  {r.pagoMonto != null
                    ? `${r.pagoTipo === "sena" ? "Seña" : "Pago"} ${fmtPrice(r.pagoMonto)} · ${r.pagoEstado}`
                    : fmtPrice(r.total)}
                </span>
              </div>

              {r.cancelable ? (
                <button onClick={() => cancelar(r)} disabled={cancelando === r.id}
                  className="w-full mt-3 py-2.5 text-sm font-medium rounded-xl flex items-center justify-center gap-2 transition-colors"
                  style={{ backgroundColor: "#FEF0F0", color: "#C0392B", border: "1px solid #FBCBC9" }}>
                  {cancelando === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                  Cancelar turno
                </button>
              ) : (
                <p className="text-xs mt-3 text-center" style={{ color: T.muted }}>
                  Para cancelar este turno, contactá al comercio.
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
