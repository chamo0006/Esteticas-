"use client";

import { Instagram, Search, MessageCircle } from "lucide-react";
import Image from "next/image";
import type { Service } from "@/lib/booking-types";
import { ServiceCard } from "./service-card";

interface ServicesCatalogProps {
  services: Service[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onToggleService: (service: Service) => void;
  isInCart: (serviceId: string) => boolean;
  tenantNombre?: string;
  logoUrl?: string | null;
  telefono?: string | null;
}

// Inline botanical SVG decoration
function BotanicalLeaf() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className="opacity-20"
    >
      <path
        d="M24 44 C24 44 8 32 8 18 C8 10 14 4 24 4 C34 4 40 10 40 18 C40 32 24 44 24 44Z"
        stroke="#D4919B"
        strokeWidth="1.2"
        fill="none"
      />
      <path
        d="M24 44 L24 8"
        stroke="#D4919B"
        strokeWidth="1"
        strokeDasharray="2 3"
      />
      <path
        d="M24 22 C20 18 14 18 14 18"
        stroke="#D4919B"
        strokeWidth="1"
      />
      <path
        d="M24 28 C28 24 34 24 34 24"
        stroke="#D4919B"
        strokeWidth="1"
      />
    </svg>
  );
}

export function ServicesCatalog({
  services,
  searchQuery,
  onSearchChange,
  onToggleService,
  isInCart,
  tenantNombre,
  logoUrl,
  telefono,
}: ServicesCatalogProps) {
  const wppPhone = telefono?.replace(/\D/g, "") ?? "";
  const wppUrl = wppPhone ? `https://wa.me/${wppPhone}` : undefined;

  return (
    <div className="animate-fade-in min-h-screen" style={{ backgroundColor: "#FCF8F5" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-10 backdrop-blur-sm px-5 pt-8 pb-5"
        style={{ backgroundColor: "rgba(252,248,245,0.96)" }}
      >
        {/* Top row: spacer + icons */}
        <div className="flex items-center justify-between mb-6">
          <div className="w-10" />

          {/* Logo + name centered */}
          <div className="flex flex-col items-center gap-3">
            {logoUrl && (
              <div
                className="relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0"
                style={{ border: "1px solid #F0E4E6", boxShadow: "0 2px 20px rgba(0,0,0,0.06)" }}
              >
                <Image
                  src={logoUrl}
                  alt={tenantNombre ?? "Logo"}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            )}
            <div className="text-center">
              <h1
                className="font-serif text-2xl leading-tight"
                style={{ color: "#2C2C2C" }}
              >
                {tenantNombre ?? "Reserve su experiencia"}
              </h1>
              <p
                className="font-serif italic text-sm mt-1"
                style={{ color: "#8C7B75" }}
              >
                Reserve su experiencia de belleza
              </p>
            </div>
          </div>

          {/* Action icons */}
          <div className="flex items-center gap-2">
            {wppUrl && (
              <a
                href={wppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                style={{ backgroundColor: "#FDF0F1", color: "#8C7B75" }}
                aria-label="WhatsApp"
              >
                <MessageCircle className="w-4 h-4" strokeWidth={1.5} />
              </a>
            )}
            <button
              className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
              style={{ backgroundColor: "#FDF0F1", color: "#8C7B75" }}
              aria-label="Instagram"
            >
              <Instagram className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Decorative divider with leaf */}
        <div className="flex items-center justify-center gap-3 mb-5">
          <div className="h-px flex-1" style={{ backgroundColor: "#F0E4E6" }} />
          <BotanicalLeaf />
          <div className="h-px flex-1" style={{ backgroundColor: "#F0E4E6" }} />
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: "#8C7B75" }}
            strokeWidth={1.5}
          />
          <input
            type="text"
            placeholder="Buscar servicio..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-11 pr-5 py-3.5 text-sm transition-all focus:outline-none"
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #F0E4E6",
              borderRadius: "9999px",
              color: "#2C2C2C",
              boxShadow: "0 2px 20px rgba(0,0,0,0.04)",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "#E8B4BC";
              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(232,180,188,0.18)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "#F0E4E6";
              e.currentTarget.style.boxShadow = "0 2px 20px rgba(0,0,0,0.04)";
            }}
          />
        </div>
      </header>

      {/* Services list */}
      <div className="px-5 pb-4 space-y-3 pt-2">
        {services.map((service, index) => (
          <ServiceCard
            key={service.id}
            service={service}
            isSelected={isInCart(service.id)}
            onToggle={() => onToggleService(service)}
            index={index}
          />
        ))}

        {services.length === 0 && (
          <div className="text-center py-16" style={{ color: "#8C7B75" }}>
            <BotanicalLeaf />
            <p className="font-serif italic mt-3">No se encontraron servicios</p>
          </div>
        )}
      </div>
    </div>
  );
}
