"use client";

import { useState } from "react";
import { Instagram, Search, MessageCircle, CalendarCheck, Facebook, Globe, MapPin } from "lucide-react";
import Image from "next/image";
import type { Service, TenantConfig } from "@/lib/booking-types";
import { getBookingTheme } from "@/lib/booking-theme";
import { ServiceCard } from "./service-card";
import { StepBar } from "./step-bar";
import { MisReservas } from "./mis-reservas";

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

// TikTok no tiene ícono en lucide-react; una nota musical simple alcanza como badge.
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M16.6 5.82c-.9-.87-1.4-2.05-1.4-3.32h-3.03v14.02c0 1.5-1.22 2.72-2.72 2.72a2.72 2.72 0 0 1 0-5.44c.24 0 .48.03.7.1V10.8a5.7 5.7 0 0 0-.7-.04A5.75 5.75 0 0 0 3.75 22.5 5.75 5.75 0 0 0 15.2 18.72V9.4a8.7 8.7 0 0 0 4.8 1.44V7.8a5.3 5.3 0 0 1-3.4-1.98z" />
    </svg>
  );
}

function BotanicalLeaf({ color = "#D4919B" }: { color?: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 48 48" fill="none" aria-hidden="true" className="opacity-20">
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
    <svg width="28" height="28" viewBox="0 0 48 48" fill="none" aria-hidden="true" className="opacity-20">
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

  const [misReservasOpen, setMisReservasOpen] = useState(false);

  // Chips de categoría (Sora). Se derivan de los servicios; filtran junto al buscador.
  const [activeCat, setActiveCat] = useState("Todo");
  const cats = Array.from(new Set(services.map((s) => s.category).filter(Boolean)));
  const showCats = cats.length > 1;
  const shown = activeCat === "Todo" ? services : services.filter((s) => s.category === activeCat);

  const wppPhone = (tenantConfig?.whatsapp || telefono)?.replace(/\D/g, "") ?? "";
  const wppUrl = wppPhone ? `https://wa.me/${wppPhone}` : undefined;

  // Instagram / Facebook / TikTok / sitio web: aceptan handle o URL completa.
  // Solo se muestran si están configurados.
  const igRaw = tenantConfig?.instagram?.trim() ?? "";
  const igUrl = igRaw
    ? (/^https?:\/\//i.test(igRaw) ? igRaw : `https://instagram.com/${igRaw.replace(/^@/, "")}`)
    : undefined;
  const fbRaw = tenantConfig?.facebook?.trim() ?? "";
  const fbUrl = fbRaw
    ? (/^https?:\/\//i.test(fbRaw) ? fbRaw : `https://facebook.com/${fbRaw.replace(/^@/, "")}`)
    : undefined;
  const ttRaw = tenantConfig?.tiktok?.trim() ?? "";
  const ttUrl = ttRaw
    ? (/^https?:\/\//i.test(ttRaw) ? ttRaw : `https://tiktok.com/@${ttRaw.replace(/^@/, "")}`)
    : undefined;
  const webRaw = tenantConfig?.sitio_web?.trim() ?? "";
  const webUrl = webRaw ? (/^https?:\/\//i.test(webRaw) ? webRaw : `https://${webRaw}`) : undefined;

  return (
    <div className="animate-fade-in min-h-screen" style={{ backgroundColor: T.bg }}>
      {/* Header — NO sticky: scrollea junto con el resto para no dejar el título grande pegado */}
      <header className="px-5 pt-5 pb-4"
        style={{ backgroundColor: T.bgSticky }}>
        {/* Top row */}
        <div className="flex flex-col items-center mb-1">
          <div className="flex flex-col items-center gap-2">
            {logoUrl && (
              <div className="relative w-11 h-11 rounded-full overflow-hidden flex-shrink-0"
                style={{ border: `1px solid ${T.border}`, boxShadow: `0 2px 20px ${T.shadow}` }}>
                <Image src={logoUrl} alt={tenantNombre ?? "Logo"} fill className="object-cover" unoptimized />
              </div>
            )}
            <div className="text-center">
              {!isBarberia && (
                <div className="text-[9px] uppercase tracking-[0.18em] mb-1" style={{ color: T.muted }}>
                  {T.decoration} · Estética & bienestar
                </div>
              )}
              <h1 className={`font-serif leading-tight ${isBarberia ? "text-xl" : "text-xl font-light"}`} style={{ color: T.text }}>
                {tenantNombre ?? "Reserve su experiencia"}
              </h1>
              {!isBarberia && <div className="w-6 h-px mx-auto my-1.5" style={{ backgroundColor: T.accent }} />}
              <p className="font-serif italic text-xs mt-0.5" style={{ color: T.muted }}>
                {isBarberia ? "Reservá tu turno" : "Reserve su experiencia de belleza"}
              </p>
              {tenantConfig?.bio && (
                <p className="text-xs mt-2 max-w-xs leading-relaxed" style={{ color: T.muted }}>{tenantConfig.bio}</p>
              )}
              {tenantConfig?.direccion && (
                <p className="text-[11px] mt-1.5 flex items-center justify-center gap-1" style={{ color: T.muted }}>
                  <MapPin className="w-3 h-3" strokeWidth={1.5} /> {tenantConfig.direccion}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Redes sociales — fila propia, debajo del título/bio para no amontonar el header */}
        {(wppUrl || igUrl || fbUrl || ttUrl || webUrl) && (
          <div className="flex items-center justify-center gap-1.5 flex-wrap mb-3">
            {wppUrl && (
              <a href={wppUrl} target="_blank" rel="noopener noreferrer"
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                style={{ backgroundColor: `${primaryColor}15`, color: T.muted }}
                aria-label="WhatsApp">
                <MessageCircle className="w-4 h-4" strokeWidth={1.5} />
              </a>
            )}
            {igUrl && (
              <a href={igUrl} target="_blank" rel="noopener noreferrer"
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                style={{ backgroundColor: `${primaryColor}15`, color: T.muted }}
                aria-label="Instagram">
                <Instagram className="w-4 h-4" strokeWidth={1.5} />
              </a>
            )}
            {fbUrl && (
              <a href={fbUrl} target="_blank" rel="noopener noreferrer"
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                style={{ backgroundColor: `${primaryColor}15`, color: T.muted }}
                aria-label="Facebook">
                <Facebook className="w-4 h-4" strokeWidth={1.5} />
              </a>
            )}
            {ttUrl && (
              <a href={ttUrl} target="_blank" rel="noopener noreferrer"
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                style={{ backgroundColor: `${primaryColor}15`, color: T.muted }}
                aria-label="TikTok">
                <TikTokIcon className="w-3.5 h-3.5" />
              </a>
            )}
            {webUrl && (
              <a href={webUrl} target="_blank" rel="noopener noreferrer"
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                style={{ backgroundColor: `${primaryColor}15`, color: T.muted }}
                aria-label="Sitio web">
                <Globe className="w-4 h-4" strokeWidth={1.5} />
              </a>
            )}
          </div>
        )}

        {/* Decorative divider */}
        <div className="flex items-center justify-center gap-3 mb-3">
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
            className="w-full pl-11 pr-5 py-3 text-sm transition-all focus:outline-none"
            style={{ backgroundColor: T.inputBg, border: `1px solid ${T.border}`, borderRadius: "9999px", color: T.text, boxShadow: `0 2px 20px ${T.shadow}` }}
            onFocus={e => { e.currentTarget.style.borderColor = primaryColor; e.currentTarget.style.boxShadow = `0 0 0 3px ${primaryColor}20`; }}
            onBlur={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.boxShadow = `0 2px 20px ${T.shadow}`; }}
          />
        </div>
      </header>

      {/* Acceso a "Mis reservas" — entre el buscador y la barra de pasos */}
      <div className="px-5">
        <button onClick={() => setMisReservasOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors"
          style={{ backgroundColor: T.cardBg, color: T.text, border: `1px solid ${T.border}`, borderRadius: "9999px", boxShadow: `0 2px 20px ${T.shadow}` }}>
          <CalendarCheck className="w-4 h-4" style={{ color: accentColor }} strokeWidth={1.6} />
          Mis reservas
        </button>
      </div>

      {misReservasOpen && (
        <MisReservas
          tenantSlug={tenantConfig?.slug ?? ""}
          tenantConfig={tenantConfig}
          onClose={() => setMisReservasOpen(false)}
        />
      )}

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
