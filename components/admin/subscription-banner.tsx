'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, AlertOctagon, Clock, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AvisoSuscripcion, AvisoVariant } from '@/lib/suscripcion';

const STYLES: Record<AvisoVariant, { wrap: string; icon: string; Icon: typeof AlertTriangle }> = {
  bloqueada: {
    wrap: 'bg-red-50 border-red-200 text-red-900',
    icon: 'text-red-500',
    Icon: AlertOctagon,
  },
  vencida: {
    wrap: 'bg-red-50 border-red-200 text-red-900',
    icon: 'text-red-500',
    Icon: AlertTriangle,
  },
  porVencer: {
    wrap: 'bg-amber-50 border-amber-200 text-amber-900',
    icon: 'text-amber-500',
    Icon: Clock,
  },
};

export function SubscriptionBanner({ aviso }: { aviso: AvisoSuscripcion }) {
  // El aviso "por vencer" se puede cerrar por sesión; los críticos
  // (vencida / bloqueada) siempre se muestran.
  const dismissible = aviso.variant === 'porVencer';
  const storageKey = `aviso-suscripcion:${aviso.clave}`;
  const [oculto, setOculto] = useState(false);

  useEffect(() => {
    if (dismissible && sessionStorage.getItem(storageKey) === '1') setOculto(true);
  }, [dismissible, storageKey]);

  if (oculto) return null;

  const { wrap, icon, Icon } = STYLES[aviso.variant];

  const cerrar = () => {
    sessionStorage.setItem(storageKey, '1');
    setOculto(true);
  };

  return (
    <div className="px-4 pt-4 md:px-8">
      <div
        role="alert"
        className={cn(
          'rounded-2xl border shadow-sm px-4 py-3.5 flex items-start gap-3',
          wrap
        )}
      >
        <Icon className={cn('w-5 h-5 flex-shrink-0 mt-0.5', icon)} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-snug">{aviso.titulo}</p>
          <p className="text-xs sm:text-[13px] mt-0.5 leading-relaxed opacity-90">{aviso.detalle}</p>
        </div>
        {dismissible && (
          <button
            onClick={cerrar}
            aria-label="Cerrar aviso"
            className="flex-shrink-0 -mr-1 -mt-0.5 p-1 rounded-lg hover:bg-black/5 transition-colors opacity-60 hover:opacity-100"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
