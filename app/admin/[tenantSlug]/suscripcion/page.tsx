import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { getArgentinaRanges } from '@/lib/argentina-time';
import { obtenerPreapproval } from '@/lib/mercadopago-suscripciones';
import { SuscripcionDetail, type PlanInfo, type PagoHistorial } from '@/components/admin/suscripcion/suscripcion-detail';

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

interface PlanRowRaw {
  id: string;
  nombre: string;
  precio_mensual: number;
  precio_anual: number | null;
  max_profesionales: number | null;
  max_servicios: number | null;
  max_turnos_mes: number | null;
  features: string[];
}

interface SuscripcionRowRaw {
  estado: string;
  ciclo: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  dias_gracia: number | null;
  precio_acordado: number | null;
  bloqueado: boolean;
  bloqueo_motivo: string | null;
  cancelada_at: string | null;
  motivo_cancelacion: string | null;
  modalidad_cobro: string;
  mp_preapproval_id: string | null;
  mp_preapproval_status: string | null;
  mp_preapproval_init_point: string | null;
  plan: PlanRowRaw | PlanRowRaw[] | null;
  plan_pendiente: PlanRowRaw | PlanRowRaw[] | null;
}

function unwrap<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export default async function SuscripcionPage({ params }: Props) {
  const { tenantSlug } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  if (!token) redirect('/admin/login');
  const payload = await verifyToken(token);
  if (!payload) redirect('/admin/login');
  const tenantId = payload.tenantId;

  const { monthStart } = getArgentinaRanges();

  const [suscRes, planesRes, pagosRes, profesionalesRes, serviciosRes, turnosMesRes] = await Promise.all([
    supabase
      .from('suscripciones')
      .select(`
        estado, ciclo, fecha_inicio, fecha_fin, dias_gracia, precio_acordado,
        bloqueado, bloqueo_motivo, cancelada_at, motivo_cancelacion,
        modalidad_cobro, mp_preapproval_id, mp_preapproval_status, mp_preapproval_init_point,
        plan:planes!suscripciones_plan_id_fkey(id, nombre, precio_mensual, precio_anual, max_profesionales, max_servicios, max_turnos_mes, features),
        plan_pendiente:planes!suscripciones_plan_pendiente_id_fkey(id, nombre, precio_mensual, precio_anual, max_profesionales, max_servicios, max_turnos_mes, features)
      `)
      .eq('tenant_id', tenantId)
      .maybeSingle<SuscripcionRowRaw>(),
    supabase
      .from('planes')
      .select('id, nombre, precio_mensual, precio_anual, max_profesionales, max_servicios, max_turnos_mes, features')
      .eq('activo', true)
      .order('orden'),
    supabase
      .from('pagos_suscripcion')
      .select('id, monto, metodo, estado, periodo_inicio, periodo_fin, fecha_pago, created_at, comprobante_url, plan_nombre_snapshot, plan_precio_snapshot, plan_features_snapshot')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false }),
    supabase
      .from('profesionales')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('activo', true),
    supabase
      .from('servicios')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('activo', true),
    supabase
      .from('turnos')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .neq('estado', 'cancelado')
      .gte('fecha_hora', monthStart),
  ]);

  const susc = suscRes.data;
  const planActual = susc ? unwrap(susc.plan) : null;
  const planPendiente = susc ? unwrap(susc.plan_pendiente) : null;

  // Si tiene débito automático autorizado, traemos el detalle en vivo (fecha
  // real del próximo cobro y método usado) — best-effort, no bloquea la página.
  let proximoCobro: string | null = null;
  let metodoPagoVinculado: string | null = null;
  if (susc?.modalidad_cobro === 'automatico' && susc.mp_preapproval_id) {
    try {
      const pre = await obtenerPreapproval(susc.mp_preapproval_id);
      proximoCobro = pre.next_payment_date ?? null;
      metodoPagoVinculado = pre.payment_method_id ?? null;
    } catch (err) {
      console.error('[suscripcion/page] no se pudo obtener el preapproval', err);
    }
  }

  const suscripcion = susc ? {
    estado: susc.estado,
    ciclo: susc.ciclo,
    fecha_inicio: susc.fecha_inicio,
    fecha_fin: susc.fecha_fin,
    dias_gracia: susc.dias_gracia,
    precio_acordado: susc.precio_acordado,
    bloqueado: susc.bloqueado,
    bloqueo_motivo: susc.bloqueo_motivo,
    cancelada_at: susc.cancelada_at,
    motivo_cancelacion: susc.motivo_cancelacion,
    modalidad_cobro: susc.modalidad_cobro,
    mp_preapproval_status: susc.mp_preapproval_status,
    mp_preapproval_init_point: susc.mp_preapproval_init_point,
    proximo_cobro: proximoCobro,
    metodo_pago_vinculado: metodoPagoVinculado,
  } : null;

  const planes: PlanInfo[] = (planesRes.data ?? []) as PlanInfo[];
  const pagos: PagoHistorial[] = (pagosRes.data ?? []) as PagoHistorial[];

  const uso = {
    profesionales: profesionalesRes.count ?? 0,
    servicios: serviciosRes.count ?? 0,
    turnosMes: turnosMesRes.count ?? 0,
  };

  return (
    <SuscripcionDetail
      tenantSlug={tenantSlug}
      suscripcion={suscripcion}
      planActual={planActual as PlanInfo | null}
      planPendiente={planPendiente as PlanInfo | null}
      planes={planes}
      pagos={pagos}
      uso={uso}
    />
  );
}
