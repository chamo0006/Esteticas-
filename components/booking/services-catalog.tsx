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
    <div className="animate-fade-in">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm px-4 pt-6 pb-4">
        <div className="flex items-center justify-between mb-5">
          <div className="w-10" />

          {/* Logo + Nombre — centrado */}
          <div className="flex flex-col items-center gap-2">
            {logoUrl && (
              <div className="relative w-16 h-16 rounded-2xl overflow-hidden shadow-sm border border-border/50">
                <Image
                  src={logoUrl}
                  alt={tenantNombre ?? "Logo"}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            )}
            <h1 className="font-serif text-xl text-foreground text-center text-balance leading-tight">
              {tenantNombre ?? "Reserva tu Experiencia de Belleza"}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {wppUrl && (
              <a
                href={wppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-[#25D366] transition-colors"
                aria-label="WhatsApp"
              >
                <MessageCircle className="w-5 h-5" strokeWidth={1.5} />
              </a>
            )}
            <button
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-accent transition-colors"
              aria-label="Instagram"
            >
              <Instagram className="w-5 h-5" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
          <input
            type="text"
            placeholder="Buscar servicio..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-card border border-border rounded-2xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
          />
        </div>
      </header>

      {/* Services List */}
      <div className="px-4 space-y-3">
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
          <div className="text-center py-12 text-muted-foreground">
            <p>No se encontraron servicios</p>
          </div>
        )}
      </div>
    </div>
  );
}
