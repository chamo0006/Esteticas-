'use client';

import { useState } from 'react';
import { ServicesCatalog } from '@/components/booking/services-catalog';
import { ReservationCalendar } from '@/components/booking/reservation-calendar';
import { SummaryPayment } from '@/components/booking/summary-payment';
import { CartBar } from '@/components/booking/cart-bar';
import type {
  Service,
  CartItem,
  BookingStep,
  SchedulingMode,
  TenantConfig,
} from '@/lib/booking-types';

interface BookingClientProps {
  tenant: TenantConfig;
  services: Service[];
}

export function BookingClient({ tenant, services }: BookingClientProps) {
  const [currentStep, setCurrentStep] = useState<BookingStep>('services');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedProfesional, setSelectedProfesional] = useState<string | null>(null);
  const [schedulingMode, setSchedulingMode] = useState<SchedulingMode>('together');

  const filteredServices = services.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleService = (service: Service) => {
    setCart((prev) => {
      const exists = prev.find((item) => item.id === service.id);
      if (exists) return prev.filter((item) => item.id !== service.id);
      return [...prev, { ...service, quantity: 1 }];
    });
  };

  const isInCart = (serviceId: string) => cart.some((item) => item.id === serviceId);
  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalDuracion = cart.reduce((sum, item) => {
    const mins = parseInt(item.duration, 10);
    return sum + (isNaN(mins) ? 60 : mins);
  }, 0);

  const handleContinue = () => {
    if (currentStep === 'services' && cart.length > 0) {
      setCurrentStep('calendar');
    } else if (currentStep === 'calendar' && selectedDate && selectedTime) {
      setCurrentStep('summary');
    }
  };

  const handleBack = () => {
    if (currentStep === 'calendar') setCurrentStep('services');
    else if (currentStep === 'summary') setCurrentStep('calendar');
  };

  const canContinue = () => {
    if (currentStep === 'services') return cart.length > 0;
    if (currentStep === 'calendar') return selectedDate !== null && selectedTime !== null;
    return false;
  };

  const bgColor = tenant.tipo_negocio === 'barberia' ? '#F3F2F0' : '#FCF8F5';

  return (
    <main className="min-h-screen pb-28" style={{ backgroundColor: bgColor }}>
      {currentStep === 'services' && (
        <ServicesCatalog
          services={filteredServices}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onToggleService={toggleService}
          isInCart={isInCart}
          tenantNombre={tenant.nombre}
          logoUrl={tenant.logo_url}
          telefono={tenant.telefono}
          tenantConfig={tenant}
        />
      )}

      {currentStep === 'calendar' && (
        <ReservationCalendar
          onBack={handleBack}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          selectedTime={selectedTime}
          onSelectTime={setSelectedTime}
          schedulingMode={schedulingMode}
          onSchedulingModeChange={setSchedulingMode}
          tenantSlug={tenant.slug}
          totalDuracion={totalDuracion}
          selectedProfesional={selectedProfesional}
          onSelectProfesional={setSelectedProfesional}
          tenantConfig={tenant}
        />
      )}

      {currentStep === 'summary' && (
        <SummaryPayment
          cart={cart}
          selectedDate={selectedDate}
          selectedTime={selectedTime}
          totalAmount={totalAmount}
          onBack={handleBack}
          tenantSlug={tenant.slug}
          tenantConfig={tenant}
          profesionalId={selectedProfesional}
        />
      )}

      {currentStep !== 'summary' && (
        <CartBar
          itemCount={cart.length}
          totalAmount={totalAmount}
          onContinue={handleContinue}
          disabled={!canContinue()}
          tenantConfig={tenant}
        />
      )}
    </main>
  );
}
