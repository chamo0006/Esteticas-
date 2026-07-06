"use client";

import { useState } from "react";
import { Instagram, Search, MessageCircle } from "lucide-react";
import Image from "next/image";
import type { Service, TenantConfig } from "@/lib/booking-types";
import { getBookingTheme } from "@/lib/booking-theme";
import { ServiceCard } from "./service-card";
import { StepBar } from "./step-bar";

interface ServicesCatalogProps {
  services: Service[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onToggleService: (service: Service) => void;
  isInCart: (serviceId: string) => boolean;
  tenantNombre?: string;
  logoUrl?: string | null;
  telefono?: string | null;
  tenantConfig?: TenantConfig;
}

function BotanicalLeaf({ color = "#D4919B" }: { color?: string }) {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true" className="opacity-20">
      <path d="M24 44 C24 44 8 32 8 18 C8 10 14 4 24 4 C34 4 40 10 40 18 C40 32 24 44 24 44Z"
        stroke={color} strokeWidth="1.2" fill="none" />
      <path d="M24 44 L24 8" stroke={color} strokeWidth="1" strokeDasharray="2 3" />
      <path d="M24 22 C20 18 14 18 14 18" stroke={color} strokeWidth="1" />
      <path d="M24 28 C28 24 34 24 34 24" stroke={color} strokeWidth="1" />
    </svg>
  );
}

function BarberDecoration({ color = "#4A5240" }: { color?: string }) {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true" className="opacity-20">
      <path d="M16 8 L32 40" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M32 8 L16 40" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="14" cy="38" r="4" stroke={color} strokeWidth="1.2" fill="none" />
      <circle cx="34" cy="38" r="4" stroke={color} strokeWidth="1.2" fill="none" />
    </svg>
  );
}

export function ServicesCatalog({
  services, searchQuery, onSearchChange, onToggleService, isInCart,
  tenantNombre, logoUrl, telefono, tenantConfig,
}: ServicesCatalogProps) {
  const T = getBookingTheme(tenantConfig?.tipo_negocio);
  const isBarberia = tenantConfig?.tipo_negocio === "barberia";
  // Estéticas usan la paleta Sora fija (negro + dorado); la barbería mantiene sus colores.
  const primaryColor = isBarberia ? (tenantConfig?.color_primario ?? "#C9A96E") : T.primary;
  const accentColor  = isBarberia ? (tenantConfig?.color_acento  ?? "#B8935A") : T.accent;

  // Chips de categoría (Sora). Se derivan de los servicios; filtran junto al buscador.
  const [activeCat, setActiveCat] = useState("Todo");
  const cats = Array.from(new Set(services.map((s) => s.category).filter(Boolean)));
  const showCats = cats.length > 1;
  const shown = activeCat === "Todo" ? services : services.filter((s) => s.category === activeCat);

  const wppPhone = telefono?.replace(/\D/g, "") ?? "";
  const wppUrl = wppPhone ? `https://wa.me/${wppPhone}` : undefined;

  return (
    <div className="animate-fade-in min-h-screen" style={{ backgroundColor: T.bg }}>
      {/* Header — NO sticky: scrollea junto con el resto para no dejar el título grande pegado */}
      <header className="px-5 pt-8 pb-5"
        style={{ backgroundColor: T.bgSticky }}>
        {/* Top row */}
        <div className="flex items-center justify-between mb-6">
          <div className="w-10" />

          <div className="flex flex-col items-center gap-3">
            {logoUrl && (
              <div className="relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0"
                style={{ border: `1px solid ${T.border}`, boxShadow: `0 2px 20px ${T.shadow}` }}>
                <Image src={logoUrl} alt={tenantNombre ?? "Logo"} fill className="object-cover" unoptimized />
              </div>
            )}
            <div className="text-center">
              {!isBarberia && (
                <div className="text-[10px] uppercase tracking-[0.18em] mb-2" style={{ color: T.muted }}>
                  {T.decoration} · Estética & bienestar
                </div>
              )}
              <h1 className={`font-serif leading-tight ${isBarberia ? "text-2xl" : "text-2xl font-light"}`} style={{ color: T.text }}>
                {tenantNombre ?? "Reserve su experiencia"}
              </h1>
              {!isBarberia && <div className="w-7 h-px mx-auto my-3" style={{ backgroundColor: T.accent }} />}
              <p className="font-serif italic text-sm mt-1" style={{ color: T.muted }}>
                {isBarberia ? "Reservá tu turno" : "Reserve su experiencia de belleza"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {wppUrl && (
              <a href={wppUrl} target="_blank" rel="noopener noreferrer"
                className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                style={{ backgroundColor: `${primaryColor}15`, color: T.muted }}
                aria-label="WhatsApp">
                <MessageCircle className="w-4 h-4" strokeWidth={1.5} />
              </a>
            )}
            <button className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
              style={{ backgroundColor: `${primaryColor}15`, color: T.muted }}
              aria-label="Instagram">
              <Instagram className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Decorative divider */}
        <div className="flex items-center justify-center gap-3 mb-5">
          <div className="h-px flex-1" style={{ backgroundColor: T.border }} />
          {isBarberia
            ? <BarberDecoration color={accentColor} />
            : <BotanicalLeaf color={accentColor} />}
          <div className="h-px flex-1" style={{ backgroundColor: T.border }} />
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: T.muted }} strokeWidth={1.5} />
          <input
            type="text" placeholder="Buscar servicio..." value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full pl-11 pr-5 py-3.5 text-sm transition-all focus:outline-none"
            style={{ backgroundColor: T.inputBg, border: `1px solid ${T.border}`, borderRadius: "9999px", color: T.text, boxShadow: `0 2px 20px ${T.shadow}` }}
            onFocus={e => { e.currentTarget.style.borderColor = primaryColor; e.currentTarget.style.boxShadow = `0 0 0 3px ${primaryColor}20`; }}
            onBlur={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.boxShadow = `0 2px 20px ${T.shadow}`; }}
          />
        </div>
      </header>

      {!isBarberia && <StepBar current={0} theme={T} />}

      {/* Chips de categoría */}
      {!isBarberia && showCats && (
        <div className="flex gap-2 overflow-x-auto px-5 pt-4 pb-1" style={{ scrollbarWidth: "none" }}>
          {["Todo", ...cats].map((c) => {
            const sel = activeCat === c;
            return (
              <button key={c} onClick={() => setActiveCat(c)}
                className="text-xs px-3.5 py-1.5 rounded-sm whitespace-nowrap transition-colors capitalize"
                style={sel
                  ? { backgroundColor: T.primary, color: T.bg, border: `1px solid ${T.primary}` }
                  : { backgroundColor: "transparent", color: T.muted, border: `1px solid ${T.border}` }}>
                {c}
              </button>
            );
          })}
        </div>
      )}

      {/* Services list */}
      <div className="px-5 pb-4 pt-4">
        {!isBarberia && shown.length > 0 && (
          <div className="text-[10px] uppercase tracking-[0.16em] mb-2" style={{ color: T.muted }}>Servicios</div>
        )}
        {shown.map((service, index) => (
          <ServiceCard
            key={service.id} service={service} isSelected={isInCart(service.id)}
            onToggle={() => onToggleService(service)} index={index}
            primaryColor={primaryColor} accentColor={accentColor} borderColor={T.border}
            cardBg={T.cardBg} textColor={T.text} mutedColor={T.muted} surf2={T.surf2}
          />
        ))}
        {shown.length === 0 && (
          <div className="text-center py-16" style={{ color: T.muted }}>
            {isBarberia ? <BarberDecoration color={accentColor} /> : <BotanicalLeaf color={accentColor} />}
            <p className="font-serif italic mt-3">No se encontraron servicios</p>
          </div>
        )}
      </div>
    </div>
  );
}
