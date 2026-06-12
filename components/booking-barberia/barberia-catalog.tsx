"use client";

import { MessageCircle } from "lucide-react";
import Image from "next/image";
import type { Service, TenantConfig } from "@/lib/booking-types";

const B = {
  bg: "#111111",
  card: "#1A1A1A",
  border: "#2A2A2A",
  text: "#F5F5F5",
  muted: "#888888",
  accent: "#4A7FC1",
  accentDim: "#2D5A8E",
} as const;

const CATS: Record<string, { label: string; emoji: string }> = {
  corte:  { label: "Cortes",   emoji: "✂️" },
  cortes: { label: "Cortes",   emoji: "✂️" },
  barba:  { label: "Barba",    emoji: "🪒" },
  combo:  { label: "Combos",   emoji: "⭐" },
  combos: { label: "Combos",   emoji: "⭐" },
  nails:  { label: "Servicios",emoji: "💈" },
  general:{ label: "Servicios",emoji: "💈" },
};
const DEFAULT_CAT = { label: "Servicios", emoji: "💈" };

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(n);

interface Props {
  services: Service[];
  onToggleService: (s: Service) => void;
  isInCart: (id: string) => boolean;
  tenantNombre?: string;
  logoUrl?: string | null;
  telefono?: string | null;
  tenant: TenantConfig;
}

export function BarberiaCatalog({ services, onToggleService, isInCart, tenantNombre, logoUrl, telefono, tenant }: Props) {
  const primaryColor = tenant.color_primario ?? B.accent;
  const wppPhone = telefono?.replace(/\D/g, "") ?? "";
  const wppUrl = wppPhone ? `https://wa.me/${wppPhone}` : undefined;

  // Group services by category
  const grouped: { key: string; meta: { label: string; emoji: string }; items: Service[] }[] = [];
  const seen = new Map<string, Service[]>();
  for (const s of services) {
    const key = s.category.toLowerCase();
    if (!seen.has(key)) seen.set(key, []);
    seen.get(key)!.push(s);
  }
  // Preferred order
  const ORDER = ["corte", "cortes", "barba", "combo", "combos"];
  const ordered = [...ORDER.filter(k => seen.has(k)), ...Array.from(seen.keys()).filter(k => !ORDER.includes(k))];
  const dedupedKeys = Array.from(new Set(ordered));
  for (const key of dedupedKeys) {
    if (seen.has(key)) {
      grouped.push({ key, meta: CATS[key] ?? DEFAULT_CAT, items: seen.get(key)! });
      seen.delete(key);
    }
  }

  return (
    <div className="min-h-screen pb-36 animate-fade-in" style={{ backgroundColor: B.bg }}>
      {/* Header */}
      <header className="sticky top-0 z-10 px-5 pt-8 pb-5"
        style={{ backgroundColor: "rgba(17,17,17,0.97)", backdropFilter: "blur(10px)", borderBottom: `1px solid ${B.border}` }}>
        <div className="flex items-center justify-between">
          {/* Logo + name */}
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0"
                style={{ border: `1px solid ${B.border}` }}>
                <Image src={logoUrl} alt={tenantNombre ?? "Logo"} fill className="object-cover" unoptimized />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{ backgroundColor: B.card, border: `1px solid ${B.border}` }}>
                💈
              </div>
            )}
            <div>
              <h1 className="font-bold text-lg leading-tight" style={{ color: B.text }}>
                {tenantNombre ?? "Barbería"}
              </h1>
              <p className="text-xs" style={{ color: B.muted }}>Elegí tu servicio</p>
            </div>
          </div>

          {/* WhatsApp */}
          {wppUrl && (
            <a href={wppUrl} target="_blank" rel="noopener noreferrer"
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-opacity hover:opacity-80"
              style={{ backgroundColor: "#25D36622", border: `1px solid ${B.border}` }}>
              <MessageCircle className="w-5 h-5" style={{ color: "#25D366" }} strokeWidth={1.5} />
            </a>
          )}
        </div>
      </header>

      {/* Services by category */}
      <div className="px-4 pt-5 space-y-6">
        {grouped.length === 0 && (
          <p className="text-center py-16 text-sm" style={{ color: B.muted }}>
            No hay servicios disponibles
          </p>
        )}

        {grouped.map(group => (
          <div key={group.key}>
            {/* Category header */}
            <div className="flex items-center gap-2 mb-3 px-1">
              <span className="text-base">{group.meta.emoji}</span>
              <h2 className="font-bold text-sm uppercase tracking-widest" style={{ color: B.muted }}>
                {group.meta.label}
              </h2>
              <div className="flex-1 h-px" style={{ backgroundColor: B.border }} />
              <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ backgroundColor: B.card, color: B.muted, border: `1px solid ${B.border}` }}>
                {group.items.length}
              </span>
            </div>

            {/* Service cards */}
            <div className="space-y-2">
              {group.items.map(service => {
                const selected = isInCart(service.id);
                return (
                  <button key={service.id} onClick={() => onToggleService(service)}
                    className="w-full text-left transition-all duration-200"
                    style={{
                      backgroundColor: selected ? `${primaryColor}18` : B.card,
                      border: `1px solid ${selected ? primaryColor : B.border}`,
                      borderRadius: "14px",
                      padding: "14px 16px",
                    }}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate" style={{ color: B.text }}>
                          {service.name}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: B.muted }}>
                          {service.duration}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="font-bold text-sm" style={{ color: primaryColor }}>
                          {fmt(service.price)}
                        </span>
                        <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 transition-colors"
                          style={{
                            backgroundColor: selected ? primaryColor : B.border,
                            border: `1px solid ${selected ? primaryColor : B.border}`,
                          }}>
                          {selected
                            ? <span className="text-white text-xs font-bold">✓</span>
                            : <span className="text-xs font-bold" style={{ color: B.muted }}>+</span>
                          }
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
