'use client';

import { useState } from 'react';
import { X, Check, Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PlanInfo } from './suscripcion-detail';

interface Props {
  planes: PlanInfo[];
  planActualId: string | null;
  planPendienteId: string | null;
  ciclo: string;
  uso: { profesionales: number; servicios: number };
  onClose: () => void;
  onConfirm: (planId: string) => Promise<void>;
}

function formatARS(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n);
}

export function PlanComparisonModal({ planes, planActualId, planPendienteId, ciclo, uso, onClose, onConfirm }: Props) {
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  const planSel = planes.find((p) => p.id === seleccionado) ?? null;
  const perderiaProfesionales = planSel?.max_profesionales != null && uso.profesionales > planSel.max_profesionales;
  const perderiaServicios = planSel?.max_servicios != null && uso.servicios > planSel.max_servicios;
  const hayAdvertencia = perderiaProfesionales || perderiaServicios;

  const confirmar = async () => {
    if (!seleccionado) return;
    setConfirmando(true);
    await onConfirm(seleccionado);
    setConfirmando(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-100 flex items-center justify-between z-10">
          <h2 className="font-bold text-gray-900 text-lg">Cambiar de plan</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 grid sm:grid-cols-3 gap-4">
          {planes.map((p) => {
            const esActual = p.id === planActualId;
            const esPendiente = p.id === planPendienteId;
            const esSeleccionado = p.id === seleccionado;
            const precio = ciclo === 'anual' ? (p.precio_anual ?? p.precio_mensual * 12) : p.precio_mensual;
            return (
              <button
                key={p.id}
                onClick={() => !esActual && setSeleccionado(p.id)}
                disabled={esActual}
                className={cn(
                  'text-left rounded-2xl border-2 p-4 transition-colors flex flex-col',
                  esActual
                    ? 'border-violet-300 bg-violet-50 cursor-default'
                    : esSeleccionado
                      ? 'border-violet-500 bg-violet-50/50'
                      : 'border-gray-200 hover:border-gray-300'
                )}
              >
                {esActual && <span className="text-xs font-bold text-violet-600 uppercase tracking-wide mb-1">Tu plan actual</span>}
                {esPendiente && !esActual && <span className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-1">Programado para tu próximo pago</span>}
                <h3 className="font-bold text-gray-900">{p.nombre}</h3>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatARS(precio)}<span className="text-sm font-normal text-gray-400">/{ciclo === 'anual' ? 'año' : 'mes'}</span>
                </p>
                <ul className="mt-3 space-y-1.5 flex-1">
                  {p.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
                      <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>

        {hayAdvertencia && (
          <div className="mx-6 mb-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 px-4 py-3 flex items-start gap-2 text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Vas a perder acceso a algunas funciones</p>
              {perderiaProfesionales && (
                <p className="text-xs mt-0.5">
                  Hoy tenés {uso.profesionales} profesional{uso.profesionales === 1 ? '' : 'es'} cargados y el plan {planSel?.nombre} permite hasta {planSel?.max_profesionales}.
                </p>
              )}
              {perderiaServicios && (
                <p className="text-xs mt-0.5">
                  Hoy tenés {uso.servicios} servicios cargados y el plan {planSel?.nombre} permite hasta {planSel?.max_servicios}.
                </p>
              )}
            </div>
          </div>
        )}

        <div className="px-6 pb-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-400">El cambio se aplica en tu próximo vencimiento, no se cobra ahora.</p>
          <button
            onClick={confirmar}
            disabled={!seleccionado || confirmando}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold disabled:opacity-50 flex-shrink-0 w-full sm:w-auto justify-center"
          >
            {confirmando ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Confirmar cambio
          </button>
        </div>
      </div>
    </div>
  );
}
