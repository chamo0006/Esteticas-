'use client';

import { useState, useEffect } from 'react';
import { CalendarClock, X } from 'lucide-react';
import type { AvisoTurnosVencidos } from '@/lib/turnos-vencidos';

interface Props {
  aviso: AvisoTurnosVencidos;
  tenantSlug: string;
}

export function TurnosVencidosBanner({ aviso, tenantSlug }: Props) {
  // Se puede cerrar por sesión, pero el storageKey incluye la cantidad: si
  // aparece un turno vencido nuevo (o se resuelve uno), vuelve a mostrarse.
  const storageKey = `aviso-turnos-vencidos:${aviso.clave}`;
  const [oculto, setOculto] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(storageKey) === '1') setOculto(true);
  }, [storageKey]);

  if (oculto) return null;

  const cerrar = () => {
    sessionStorage.setItem(storageKey, '1');
    setOculto(true);
  };

  const plural = aviso.count === 1 ? '' : 's';

  return (
    <div className="px-4 pt-4 md:px-8">
      <div
        role="alert"
        className="rounded-2xl border shadow-sm px-4 py-3.5 flex items-start gap-3 bg-amber-50 border-amber-200 text-amber-900"
      >
        <CalendarClock className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-500" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-snug">
            Tenés {aviso.count} turno{plural} de días anteriores sin confirmar o completar
          </p>
          <p className="text-xs sm:text-[13px] mt-0.5 leading-relaxed opacity-90">
            Revisalos para mantener tu agenda al día.{' '}
            <a href={`/admin/${tenantSlug}/turnos?vista=todos&estado=vencidos`} className="underline font-medium">
              Ver turnos →
            </a>
          </p>
        </div>
        <button
          onClick={cerrar}
          aria-label="Cerrar aviso"
          className="flex-shrink-0 -mr-1 -mt-0.5 p-1 rounded-lg hover:bg-black/5 transition-colors opacity-60 hover:opacity-100"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
