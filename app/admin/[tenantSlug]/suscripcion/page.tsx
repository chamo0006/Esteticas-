import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { CreditCard, CalendarCheck, AlertTriangle, ShieldAlert } from 'lucide-react';

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

interface PlanRow {
  nombre: string;
  precio_mensual: number | null;
  precio_anual: number | null;
}

interface SuscripcionRow {
  estado: string;
  ciclo: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  dias_gracia: number | null;
  precio_acordado: number | null;
  bloqueado: boolean;
  bloqueo_motivo: string | null;
  planes: PlanRow | PlanRow[] | null;
}

interface PagoRow {
  id: string;
  monto: number;
  metodo: string;
  estado: string;
  periodo_inicio: string | null;
  periodo_fin: string | null;
  fecha_pago: string | null;
  created_at: string;
}

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

export default async function SuscripcionPage({ params }: Props) {
  await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  if (!token) redirect('/admin/login');
  const payload = await verifyToken(token);
  if (!payload) redirect('/admin/login');
  const tenantId = payload.tenantId;

  const [suscRes, pagosRes] = await Promise.all([
    supabase
      .from('suscripciones')
      .select('estado, ciclo, fecha_inicio, fecha_fin, dias_gracia, precio_acordado, bloqueado, bloqueo_motivo, planes(nombre, precio_mensual, precio_anual)')
      .eq('tenant_id', tenantId)
      .maybeSingle<SuscripcionRow>(),
    supabase
      .from('pagos_suscripcion')
      .select('id, monto, metodo, estado, periodo_inicio, periodo_fin, fecha_pago, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false }),
  ]);

  const suscripcion = suscRes.data;
  const pagos = (pagosRes.data ?? []) as PagoRow[];
  const plan = suscripcion
    ? (Array.isArray(suscripcion.planes) ? suscripcion.planes[0] : suscripcion.planes)
    : null;

  const dias = suscripcion?.fecha_fin ? diasHasta(suscripcion.fecha_fin) : null;
  const vencida = dias !== null && dias < 0;
  const precio = suscripcion?.precio_acordado
    ?? (suscripcion?.ciclo === 'anual' ? plan?.precio_anual : plan?.precio_mensual)
    ?? null;

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
          {/* Estado / bloqueo */}
          {suscripcion.bloqueado && (
            <div className="rounded-2xl border border-red-200 bg-red-50 text-red-700 px-4 py-3.5 flex items-start gap-3 mb-4">
              <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Tu sistema está suspendido</p>
                <p className="text-xs mt-0.5 opacity-90">
                  {suscripcion.bloqueo_motivo || 'Regularizá el pago para reactivar las reservas.'}
                </p>
              </div>
            </div>
          )}
          {!suscripcion.bloqueado && vencida && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 text-amber-800 px-4 py-3.5 flex items-start gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Tu suscripción venció</p>
                <p className="text-xs mt-0.5 opacity-90">
                  Venció hace {Math.abs(dias!)} día{plural(Math.abs(dias!))}. Regularizá el pago para evitar que se suspenda el sistema.
                </p>
              </div>
            </div>
          )}

          {/* Card principal */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Plan</p>
                <p className="text-lg font-bold text-gray-900">{plan?.nombre ?? 'Sin plan asignado'}</p>
                {precio !== null && (
                  <p className="text-sm text-gray-500 mt-0.5">
                    {formatARS(Number(precio))} / {suscripcion.ciclo === 'anual' ? 'año' : 'mes'}
                  </p>
                )}
              </div>
              <span className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize flex-shrink-0 ${ESTADO_BADGE[suscripcion.estado] ?? 'bg-gray-100 text-gray-500'}`}>
                {suscripcion.estado}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Próximo vencimiento</p>
                <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                  <CalendarCheck className="w-4 h-4 text-violet-500" />
                  {suscripcion.fecha_fin ? formatFecha(suscripcion.fecha_fin) : 'Sin límite'}
                </p>
                {dias !== null && (
                  <p className={`text-xs mt-1 ${vencida ? 'text-red-500' : 'text-gray-400'}`}>
                    {vencida
                      ? `Venció hace ${Math.abs(dias)} día${plural(Math.abs(dias))}`
                      : dias === 0
                        ? 'Vence hoy'
                        : `Faltan ${dias} día${plural(dias)}`}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Cuándo tenés que volver a pagar</p>
                <p className="text-sm font-semibold text-gray-900">
                  {suscripcion.fecha_fin ? formatFecha(suscripcion.fecha_fin) : '—'}
                </p>
                {vencida && (suscripcion.dias_gracia ?? 0) + (dias ?? 0) > 0 && (
                  <p className="text-xs text-amber-500 mt-1">
                    Te queda{((suscripcion.dias_gracia ?? 0) + (dias ?? 0)) === 1 ? '' : 'n'} {(suscripcion.dias_gracia ?? 0) + (dias ?? 0)} día{plural((suscripcion.dias_gracia ?? 0) + (dias ?? 0))} de gracia
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Historial de pagos */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 text-sm">Historial de pagos</h2>
            </div>
            {pagos.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-sm">Todavía no hay pagos registrados</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {pagos.map((p) => (
                  <div key={p.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">{formatARS(Number(p.monto))}</p>
                      <p className="text-xs text-gray-400 capitalize mt-0.5">
                        {p.metodo} · Pagado el {new Date(p.fecha_pago ?? p.created_at).toLocaleDateString('es-AR')}
                        {p.periodo_fin && ` · Cubre hasta ${formatFecha(p.periodo_fin)}`}
                      </p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize flex-shrink-0 ${ESTADO_PAGO_BADGE[p.estado] ?? 'bg-gray-100 text-gray-500'}`}>
                      {p.estado}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
