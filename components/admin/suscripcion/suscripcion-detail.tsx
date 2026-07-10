'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  CreditCard, CalendarCheck, CalendarClock, AlertTriangle, Loader2,
  Download, MessageCircle, RefreshCw, Users, Scissors, CalendarDays, TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AvisoBanner } from '@/components/ui/aviso-banner';
import { PlanComparisonModal } from './plan-comparison-modal';
import { CancelarSuscripcionModal } from './cancelar-modal';

export interface PlanInfo {
  id: string;
  nombre: string;
  precio_mensual: number;
  precio_anual: number | null;
  max_profesionales: number | null;
  max_servicios: number | null;
  max_turnos_mes: number | null;
  features: string[];
}

export interface PagoHistorial {
  id: string;
  monto: number;
  metodo: string;
  estado: string;
  periodo_inicio: string | null;
  periodo_fin: string | null;
  fecha_pago: string | null;
  created_at: string;
  comprobante_url: string | null;
  plan_nombre_snapshot: string | null;
  plan_precio_snapshot: number | null;
  plan_features_snapshot: string[] | null;
}

interface SuscripcionInfo {
  estado: string;
  ciclo: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  dias_gracia: number | null;
  precio_acordado: number | null;
  bloqueado: boolean;
  bloqueo_motivo: string | null;
  renovacion_automatica: boolean;
  cancelada_at: string | null;
  motivo_cancelacion: string | null;
}

interface Props {
  tenantSlug: string;
  suscripcion: SuscripcionInfo | null;
  planActual: PlanInfo | null;
  planPendiente: PlanInfo | null;
  planes: PlanInfo[];
  pagos: PagoHistorial[];
  uso: { profesionales: number; servicios: number; turnosMes: number };
}

const WHATSAPP_SOPORTE = '5491121615661';

function formatARS(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n);
}

function formatFecha(d: string) {
  return new Date(`${d}T00:00:00`).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function diasHasta(fechaFin: string): number {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fin = new Date(`${fechaFin}T00:00:00`);
  return Math.round((fin.getTime() - hoy.getTime()) / 86_400_000);
}

const plural = (n: number) => (n === 1 ? '' : 's');

const ESTADO_BADGE: Record<string, string> = {
  trial: 'bg-blue-100 text-blue-700',
  activa: 'bg-emerald-100 text-emerald-700',
  vencida: 'bg-red-100 text-red-700',
  suspendida: 'bg-gray-200 text-gray-600',
  cancelada: 'bg-gray-200 text-gray-600',
};

const ESTADO_PAGO_BADGE: Record<string, string> = {
  aprobado: 'bg-emerald-100 text-emerald-700',
  pendiente: 'bg-amber-100 text-amber-700',
  vencido: 'bg-red-100 text-red-700',
  rechazado: 'bg-gray-100 text-gray-500',
};

function UsoBar({ icon: Icon, label, usado, limite }: { icon: typeof Users; label: string; usado: number; limite: number | null }) {
  const ilimitado = limite == null;
  const pct = ilimitado ? 0 : Math.min(100, Math.round((usado / Math.max(limite, 1)) * 100));
  const cerca = !ilimitado && pct >= 80;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 text-sm text-gray-700 font-medium">
          <Icon className="w-4 h-4 text-gray-400" /> {label}
        </div>
        <span className="text-xs text-gray-400 font-medium">
          {ilimitado ? `${usado} · ilimitado` : `${usado} de ${limite}`}
        </span>
      </div>
      {!ilimitado && (
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', cerca ? 'bg-amber-500' : 'bg-violet-500')}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {cerca && (
        <p className="text-xs text-amber-600 mt-1">Estás cerca del límite de tu plan — considerá pasar a uno superior.</p>
      )}
    </div>
  );
}

export function SuscripcionDetail({ tenantSlug, suscripcion, planActual, planPendiente, planes, pagos, uso }: Props) {
  const router = useRouter();
  const [modalPlan, setModalPlan] = useState(false);
  const [modalCancelar, setModalCancelar] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const dias = suscripcion?.fecha_fin ? diasHasta(suscripcion.fecha_fin) : null;
  const vencida = dias !== null && dias < 0;
  const precio = suscripcion?.precio_acordado
    ?? (suscripcion?.ciclo === 'anual' ? planActual?.precio_anual : planActual?.precio_mensual)
    ?? null;

  const cancelada = !!suscripcion?.cancelada_at;

  const patch = async (body: Record<string, unknown>) => {
    setGuardando(true);
    setMsg(null);
    const res = await fetch(`/api/admin/${tenantSlug}/suscripcion`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setGuardando(false);
    if (res.ok) {
      router.refresh();
      return true;
    }
    setMsg('No se pudo guardar el cambio. Probá de nuevo.');
    return false;
  };

  const toggleRenovacion = () => patch({ accion: 'toggle_renovacion', renovacion_automatica: !suscripcion?.renovacion_automatica });

  const confirmarCambioPlan = async (planId: string) => {
    const ok = await patch({ accion: 'solicitar_cambio_plan', plan_id: planId });
    if (ok) setModalPlan(false);
  };

  const confirmarCancelacion = async (motivo: string) => {
    const ok = await patch({ accion: 'cancelar', motivo });
    if (ok) setModalCancelar(false);
  };

  const deshacerCancelacion = () => patch({ accion: 'reactivar_cancelacion' });

  const whatsappUrl = (texto: string) => `https://wa.me/${WHATSAPP_SOPORTE}?text=${encodeURIComponent(texto)}`;

  const pagosFiltrados = useMemo(() => {
    return pagos.filter((p) => {
      const fecha = (p.fecha_pago ?? p.created_at).split('T')[0];
      if (desde && fecha < desde) return false;
      if (hasta && fecha > hasta) return false;
      return true;
    });
  }, [pagos, desde, hasta]);

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mi suscripción</h1>
        <p className="text-gray-400 text-sm mt-1">Estado de tu plan, próximo vencimiento y pagos realizados.</p>
      </div>

      {!suscripcion ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center">
          <CreditCard className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No hay información de suscripción cargada todavía</p>
        </div>
      ) : (
        <>
          {msg && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2 mb-4">{msg}</p>}

          {/* Bloqueo / vencimiento */}
          {suscripcion.bloqueado && (
            <AvisoBanner
              variant="critical"
              titulo="Tu sistema está suspendido"
              detalle={suscripcion.bloqueo_motivo || 'Regularizá el pago para reactivar las reservas.'}
              clave="pagina-bloqueada"
              dismissible={false}
              accion={{ label: 'Coordinar pago por WhatsApp', href: whatsappUrl(`Hola! Mi cuenta (${tenantSlug}) está suspendida y quiero regularizar el pago.`) }}
            />
          )}
          {!suscripcion.bloqueado && vencida && (
            <AvisoBanner
              variant="urgent"
              titulo="Tu suscripción venció"
              detalle={`Venció hace ${Math.abs(dias!)} día${plural(Math.abs(dias!))}. Regularizá el pago para evitar que se suspenda el sistema.`}
              clave={`pagina-vencida-${dias}`}
              accion={{ label: 'Pagar ahora', href: whatsappUrl(`Hola! Quiero renovar mi suscripción (${tenantSlug}), venció hace ${Math.abs(dias!)} día${plural(Math.abs(dias!))}.`) }}
            />
          )}

          {/* Cancelación programada */}
          {cancelada && (
            <div className="rounded-2xl border border-gray-200 bg-gray-50 text-gray-700 px-4 py-3.5 flex items-start justify-between gap-3 mb-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-gray-400" />
                <div>
                  <p className="font-semibold text-sm">Tu suscripción no se va a renovar</p>
                  <p className="text-xs mt-0.5 opacity-80">
                    Cancelaste el {new Date(suscripcion.cancelada_at!).toLocaleDateString('es-AR')}.
                    {suscripcion.fecha_fin ? ` Seguís teniendo acceso hasta el ${formatFecha(suscripcion.fecha_fin)}.` : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={deshacerCancelacion}
                disabled={guardando}
                className="flex-shrink-0 text-xs font-semibold text-violet-600 hover:underline disabled:opacity-50"
              >
                Deshacer
              </button>
            </div>
          )}

          {/* Plan pendiente */}
          {planPendiente && !cancelada && (
            <div className="rounded-2xl border border-violet-200 bg-violet-50 text-violet-800 px-4 py-3.5 flex items-start gap-3 mb-4">
              <RefreshCw className="w-5 h-5 flex-shrink-0 mt-0.5 text-violet-500" />
              <p className="text-sm">
                Vas a pasar al plan <strong>{planPendiente.nombre}</strong> {suscripcion.fecha_fin ? `a partir del ${formatFecha(suscripcion.fecha_fin)}` : 'en tu próximo pago'}.
              </p>
            </div>
          )}

          {/* Card principal */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
            <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Plan</p>
                <p className="text-lg font-bold text-gray-900">{planActual?.nombre ?? 'Sin plan asignado'}</p>
                {precio !== null && (
                  <p className="text-sm text-gray-500 mt-0.5">
                    {formatARS(Number(precio))} / {suscripcion.ciclo === 'anual' ? 'año' : 'mes'}
                  </p>
                )}
                {suscripcion.fecha_inicio && (
                  <p className="text-xs text-gray-400 mt-1">Cliente desde el {formatFecha(suscripcion.fecha_inicio)}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={cn('px-3 py-1 rounded-lg text-xs font-semibold capitalize', ESTADO_BADGE[suscripcion.estado] ?? 'bg-gray-100 text-gray-500')}>
                  {suscripcion.estado}
                </span>
                {planActual && (
                  <button
                    onClick={() => setModalPlan(true)}
                    className="text-xs font-semibold text-violet-600 hover:underline"
                  >
                    Cambiar de plan
                  </button>
                )}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Próximo vencimiento</p>
                <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                  <CalendarCheck className="w-4 h-4 text-violet-500" />
                  {suscripcion.fecha_fin ? formatFecha(suscripcion.fecha_fin) : 'Sin límite'}
                </p>
                {dias !== null && (
                  <p className={cn('text-xs mt-1', vencida ? 'text-red-500' : 'text-gray-400')}>
                    {vencida
                      ? `Venció hace ${Math.abs(dias)} día${plural(Math.abs(dias))}`
                      : dias === 0
                        ? 'Vence hoy'
                        : `Faltan ${dias} día${plural(dias)}`}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Próximo cobro estimado</p>
                <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                  <CalendarClock className="w-4 h-4 text-gray-400" />
                  {formatARS(Number((planPendiente ? (suscripcion.ciclo === 'anual' ? planPendiente.precio_anual ?? planPendiente.precio_mensual * 12 : planPendiente.precio_mensual) : precio) ?? 0))}
                </p>
                {planPendiente && <p className="text-xs text-violet-500 mt-1">Ya con el plan {planPendiente.nombre}</p>}
              </div>
            </div>

            {/* Renovación automática */}
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm font-semibold text-gray-900">Renovación automática</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {suscripcion.renovacion_automatica
                    ? 'Vamos a coordinar el cobro automático con vos por WhatsApp.'
                    : 'Pagás mes a mes de forma manual.'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {(vencida || (dias !== null && dias <= 7)) && (
                  <a
                    href={whatsappUrl(`Hola! Quiero pagar mi suscripción (${tenantSlug}).`)}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> Pagar ahora
                  </a>
                )}
                <button
                  onClick={toggleRenovacion}
                  disabled={guardando}
                  role="switch"
                  aria-checked={suscripcion.renovacion_automatica}
                  className={cn(
                    'relative w-11 h-6 rounded-full transition-colors flex-shrink-0 disabled:opacity-50',
                    suscripcion.renovacion_automatica ? 'bg-violet-600' : 'bg-gray-200'
                  )}
                >
                  <span className={cn(
                    'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
                    suscripcion.renovacion_automatica && 'translate-x-5'
                  )} />
                </button>
              </div>
            </div>
          </div>

          {/* Uso del plan */}
          {planActual && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
              <h2 className="font-semibold text-gray-900 text-sm mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-gray-400" /> Uso de tu plan
              </h2>
              <div className="space-y-4">
                <UsoBar icon={Users} label="Profesionales" usado={uso.profesionales} limite={planActual.max_profesionales} />
                <UsoBar icon={Scissors} label="Servicios" usado={uso.servicios} limite={planActual.max_servicios} />
                <UsoBar icon={CalendarDays} label="Turnos este mes" usado={uso.turnosMes} limite={planActual.max_turnos_mes} />
              </div>
            </div>
          )}

          {/* Historial de pagos */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
              <h2 className="font-semibold text-gray-900 text-sm">Historial de pagos</h2>
              {pagos.length > 3 && (
                <div className="flex items-center gap-2">
                  <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)}
                    className="px-2 py-1 text-xs border border-gray-200 rounded-lg text-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-400" />
                  <span className="text-xs text-gray-300">a</span>
                  <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)}
                    className="px-2 py-1 text-xs border border-gray-200 rounded-lg text-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-400" />
                </div>
              )}
            </div>
            {pagosFiltrados.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-sm">
                {pagos.length === 0 ? 'Todavía no hay pagos registrados' : 'Ningún pago en ese rango de fechas'}
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {pagosFiltrados.map((p) => (
                  <div key={p.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">{formatARS(Number(p.monto))}</p>
                      <p className="text-xs text-gray-400 capitalize mt-0.5">
                        {p.metodo} · Pagado el {new Date(p.fecha_pago ?? p.created_at).toLocaleDateString('es-AR')}
                        {p.periodo_fin && ` · Cubre hasta ${formatFecha(p.periodo_fin)}`}
                      </p>
                      {p.plan_nombre_snapshot && (
                        <p className="text-xs text-gray-300 mt-0.5">Plan {p.plan_nombre_snapshot} en ese momento</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {p.comprobante_url && (
                        <a
                          href={p.comprobante_url} target="_blank" rel="noopener noreferrer"
                          title="Descargar comprobante"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      )}
                      <span className={cn('px-2.5 py-1 rounded-lg text-xs font-semibold capitalize', ESTADO_PAGO_BADGE[p.estado] ?? 'bg-gray-100 text-gray-500')}>
                        {p.estado}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cancelación */}
          {!cancelada && (
            <div className="text-center">
              <button
                onClick={() => setModalCancelar(true)}
                className="text-xs text-gray-400 hover:text-red-500 hover:underline transition-colors"
              >
                Cancelar suscripción
              </button>
            </div>
          )}
        </>
      )}

      {modalPlan && planActual && (
        <PlanComparisonModal
          planes={planes}
          planActualId={planActual.id}
          planPendienteId={planPendiente?.id ?? null}
          ciclo={suscripcion?.ciclo ?? 'mensual'}
          uso={uso}
          onClose={() => setModalPlan(false)}
          onConfirm={confirmarCambioPlan}
        />
      )}

      {modalCancelar && (
        <CancelarSuscripcionModal
          planNombre={planActual?.nombre ?? 'actual'}
          fechaFinTexto={suscripcion?.fecha_fin ? formatFecha(suscripcion.fecha_fin) : null}
          onClose={() => setModalCancelar(false)}
          onConfirm={confirmarCancelacion}
        />
      )}

      {guardando && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white text-xs font-medium px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Guardando...
        </div>
      )}
    </div>
  );
}
