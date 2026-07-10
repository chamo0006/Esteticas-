'use client';

import { useState } from 'react';
import { X, Loader2, AlertTriangle } from 'lucide-react';

interface Props {
  planNombre: string;
  fechaFinTexto: string | null;
  onClose: () => void;
  onConfirm: (motivo: string) => Promise<void>;
}

const MOTIVOS = ['Es muy caro', 'No lo uso lo suficiente', 'Encontré otra alternativa', 'Cierro el negocio', 'Otro'];

export function CancelarSuscripcionModal({ planNombre, fechaFinTexto, onClose, onConfirm }: Props) {
  const [motivo, setMotivo] = useState('');
  const [detalle, setDetalle] = useState('');
  const [confirmando, setConfirmando] = useState(false);

  const confirmar = async () => {
    setConfirmando(true);
    const motivoFinal = motivo === 'Otro' && detalle ? `Otro: ${detalle}` : motivo;
    await onConfirm(motivoFinal);
    setConfirmando(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-start justify-between">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">Cancelar suscripción</h2>
            <p className="text-sm text-gray-400 mt-1">Plan {planNombre}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-800 px-4 py-3 flex items-start gap-2 text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>
              Vas a perder acceso a las reservas online y la gestión de turnos {fechaFinTexto ? `a partir del ${fechaFinTexto}` : 'al finalizar tu período actual'}.
              Hasta esa fecha seguís teniendo acceso normal.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">¿Por qué cancelás? (opcional)</label>
            <div className="space-y-1.5">
              {MOTIVOS.map((m) => (
                <label key={m} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="radio" name="motivo" checked={motivo === m} onChange={() => setMotivo(m)} className="accent-violet-600" />
                  {m}
                </label>
              ))}
            </div>
            {motivo === 'Otro' && (
              <textarea
                value={detalle}
                onChange={(e) => setDetalle(e.target.value)}
                rows={2}
                placeholder="Contanos más..."
                className="mt-2 w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
            )}
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50">
            Volver
          </button>
          <button
            onClick={confirmar}
            disabled={confirmando}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold disabled:opacity-50"
          >
            {confirmando ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Confirmar cancelación
          </button>
        </div>
      </div>
    </div>
  );
}
