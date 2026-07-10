'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Info, AlertTriangle, ShieldAlert, X } from 'lucide-react';

export type AvisoVariant = 'info' | 'warning' | 'urgent' | 'critical';

export interface AvisoAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface Props {
  variant: AvisoVariant;
  titulo: string;
  detalle: string;
  /** Cambia cuando cambia el estado real (ej: días restantes), para que el dismiss se reinicie. */
  clave: string;
  accion?: AvisoAction;
  dismissible?: boolean;
}

const STYLES: Record<AvisoVariant, { box: string; icon: string; button: string; Icon: typeof Info }> = {
  info:     { box: 'bg-blue-50 border-blue-200 text-blue-900',      icon: 'text-blue-500',   button: 'bg-blue-600 hover:bg-blue-500',     Icon: Info },
  warning:  { box: 'bg-amber-50 border-amber-200 text-amber-900',   icon: 'text-amber-500',  button: 'bg-amber-600 hover:bg-amber-500',   Icon: AlertTriangle },
  urgent:   { box: 'bg-orange-50 border-orange-300 text-orange-900', icon: 'text-orange-500', button: 'bg-orange-600 hover:bg-orange-500', Icon: AlertTriangle },
  critical: { box: 'bg-red-50 border-red-300 text-red-900',         icon: 'text-red-500',    button: 'bg-red-600 hover:bg-red-500',       Icon: ShieldAlert },
};

/**
 * Banner de aviso reutilizable con 4 niveles de urgencia (info/warning/urgent/critical).
 * Pensado para reusarse en cualquier parte del admin que necesite avisar algo con
 * una acción directa (no solo "cerrar"). El dismiss es por sesión de navegador y
 * se reinicia solo cuando cambia `clave` (ej: cambia la cantidad de días restantes).
 */
export function AvisoBanner({ variant, titulo, detalle, clave, accion, dismissible = true }: Props) {
  const storageKey = `aviso-banner:${clave}`;
  const [oculto, setOculto] = useState(false);

  useEffect(() => {
    if (dismissible && sessionStorage.getItem(storageKey) === '1') setOculto(true);
  }, [storageKey, dismissible]);

  if (oculto) return null;
  const s = STYLES[variant];

  const cerrar = () => {
    sessionStorage.setItem(storageKey, '1');
    setOculto(true);
  };

  const accionClasses = `inline-flex items-center gap-1.5 mt-2.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors ${s.button}`;

  return (
    <div className="px-4 pt-4 md:px-8">
      <div role="alert" className={`rounded-2xl border shadow-sm px-4 py-3.5 flex items-start gap-3 ${s.box}`}>
        <s.Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${s.icon}`} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-snug">{titulo}</p>
          <p className="text-xs sm:text-[13px] mt-0.5 leading-relaxed opacity-90">{detalle}</p>
          {accion && (
            accion.href ? (
              <Link href={accion.href} className={accionClasses}>{accion.label}</Link>
            ) : (
              <button onClick={accion.onClick} className={accionClasses}>{accion.label}</button>
            )
          )}
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
