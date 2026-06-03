"use client";

import { useState } from "react";
import { ServicesCatalog } from "@/components/booking/services-catalog";
import { ReservationCalendar } from "@/components/booking/reservation-calendar";
import { SummaryPayment } from "@/components/booking/summary-payment";
import { CartBar } from "@/components/booking/cart-bar";
import type { Service, CartItem, BookingStep, SchedulingMode } from "@/lib/booking-types";

// Re-exports para compatibilidad con los componentes que importan desde aquí
export type { Service, CartItem, BookingStep, SchedulingMode };

const services: Service[] = [
  { id: "1", name: "Acri soft", duration: "45 min", price: 8500, category: "nails" },
  { id: "2", name: "Semi permanente", duration: "60 min", price: 12000, category: "nails" },
  { id: "3", name: "Lifting de pestañas", duration: "50 min", price: 9500, category: "lashes" },
  { id: "4", name: "Perfilado cejas", duration: "30 min", price: 4500, category: "brows" },
  { id: "5", name: "Laminado de cejas", duration: "40 min", price: 7000, category: "brows" },
  { id: "6", name: "Extensiones clásicas", duration: "90 min", price: 15000, category: "lashes" },
  { id: "7", name: "Manicura tradicional", duration: "30 min", price: 5500, category: "nails" },
  { id: "8", name: "Tinte de pestañas", duration: "20 min", price: 3500, category: "lashes" },
];

export default function BookingPage() {
  const [currentStep, setCurrentStep] = useState<BookingStep>("services");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [schedulingMode, setSchedulingMode] = useState<SchedulingMode>("together");

  const filteredServices = services.filter((service) =>
    service.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleService = (service: Service) => {
    setCart((prev) => {
      const exists = prev.find((item) => item.id === service.id);
      if (exists) {
        return prev.filter((item) => item.id !== service.id);
      }
      return [...prev, { ...service, quantity: 1 }];
    });
  };

  const isInCart = (serviceId: string) => {
    return cart.some((item) => item.id === serviceId);
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleContinue = () => {
    if (currentStep === "services" && cart.length > 0) {
      setCurrentStep("calendar");
    } else if (currentStep === "calendar" && selectedDate && selectedTime) {
      setCurrentStep("summary");
    }
  };

  const handleBack = () => {
    if (currentStep === "calendar") {
      setCurrentStep("services");
    } else if (currentStep === "summary") {
      setCurrentStep("calendar");
    }
  };

  const canContinue = () => {
    if (currentStep === "services") return cart.length > 0;
    if (currentStep === "calendar") return selectedDate !== null && selectedTime !== null;
    return false;
  };

  return (
    <main className="min-h-screen bg-background pb-28">
      {currentStep === "services" && (
        <ServicesCatalog
          services={filteredServices}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onToggleService={toggleService}
          isInCart={isInCart}
        />
      )}

      {currentStep === "calendar" && (
        <ReservationCalendar
          onBack={handleBack}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          selectedTime={selectedTime}
          onSelectTime={setSelectedTime}
          schedulingMode={schedulingMode}
          onSchedulingModeChange={setSchedulingMode}
        />
      )}

      {currentStep === "summary" && (
        <SummaryPayment
          cart={cart}
          selectedDate={selectedDate}
          selectedTime={selectedTime}
          totalAmount={totalAmount}
          onBack={handleBack}
        />
      )}

      {currentStep !== "summary" && (
        <CartBar
          itemCount={cart.length}
          totalAmount={totalAmount}
          onContinue={handleContinue}
          disabled={!canContinue()}
        />
      )}
    </main>
  );
}
