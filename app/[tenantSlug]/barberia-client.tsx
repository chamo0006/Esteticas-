'use client';

import { useState } from 'react';
import { BarberiaCatalog }  from '@/components/booking-barberia/barberia-catalog';
import { BarberiaCalendar } from '@/components/booking-barberia/barberia-calendar';
import { BarberiaSummary }  from '@/components/booking-barberia/barberia-summary';
import { BarberiaFooter }   from '@/components/booking-barberia/barberia-footer';
import type { Service, CartItem, BookingStep, SchedulingMode, TenantConfig } from '@/lib/booking-types';

interface Props {
  tenant: TenantConfig;
  services: Service[];
}

export function BarberiaClient({ tenant, services }: Props) {
  const [step, setStep]                       = useState<BookingStep>('services');
  const [cart, setCart]                       = useState<CartItem[]>([]);
  const [selectedDate, setSelectedDate]       = useState<Date | null>(null);
  const [selectedTime, setSelectedTime]       = useState<string | null>(null);
  const [selectedProfesional, setProf]        = useState<string | null>(null);
  const [schedulingMode, setSchedulingMode]   = useState<SchedulingMode>('together');

  const toggleService = (service: Service) =>
    setCart(prev => prev.find(i => i.id === service.id)
      ? prev.filter(i => i.id !== service.id)
      : [...prev, { ...service, quantity: 1 }]
    );

  const isInCart     = (id: string) => cart.some(i => i.id === id);
  const totalAmount  = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const totalDuracion = cart.reduce((s, i) => { const m = parseInt(i.duration, 10); return s + (isNaN(m) ? 60 : m); }, 0);

  const handleContinue = () => {
    if (step === 'services' && cart.length > 0)              setStep('calendar');
    else if (step === 'calendar' && selectedDate && selectedTime) setStep('summary');
  };
  const handleBack = () => {
    if (step === 'calendar') setStep('services');
    else if (step === 'summary') setStep('calendar');
  };
  const canContinue = step === 'services' ? cart.length > 0 : selectedDate !== null && selectedTime !== null;

  return (
    <main className="min-h-screen pb-36" style={{ backgroundColor: '#111111' }}>
      {step === 'services' && (
        <BarberiaCatalog
          services={services}
          onToggleService={toggleService}
          isInCart={isInCart}
          tenantNombre={tenant.nombre}
          logoUrl={tenant.logo_url}
          telefono={tenant.telefono}
          tenant={tenant}
        />
      )}

      {step === 'calendar' && (
        <BarberiaCalendar
          onBack={handleBack}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          selectedTime={selectedTime}
          onSelectTime={setSelectedTime}
          tenantSlug={tenant.slug}
          totalDuracion={totalDuracion}
          selectedProfesional={selectedProfesional}
          onSelectProfesional={setProf}
          tenant={tenant}
        />
      )}

      {step === 'summary' && (
        <BarberiaSummary
          cart={cart}
          selectedDate={selectedDate}
          selectedTime={selectedTime}
          totalAmount={totalAmount}
          onBack={handleBack}
          tenantSlug={tenant.slug}
          tenant={tenant}
          profesionalId={selectedProfesional}
        />
      )}

      {step !== 'summary' && (
        <BarberiaFooter
          itemCount={cart.length}
          totalAmount={totalAmount}
          onContinue={handleContinue}
          disabled={!canContinue}
          label={step === 'services' ? 'Elegir fecha y hora' : 'Confirmar selección'}
          tenant={tenant}
        />
      )}
    </main>
  );
}
