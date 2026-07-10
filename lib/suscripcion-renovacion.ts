import { supabase } from './supabase';

// Calcula el próximo período a partir del vencimiento actual (o de hoy, si ya
// venció) — se usa tanto para el pago único como para cada cobro recurrente,
// así el vencimiento siempre avanza en bloques de 1 mes/año prolijos.
export function calcularProximoPeriodo(fechaFinActual: string | null, ciclo: string): string {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const base = fechaFinActual ? new Date(`${fechaFinActual}T00:00:00`) : hoy;
  const desde = base > hoy ? base : hoy;
  const d = new Date(desde);
  if (ciclo === 'anual') d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString().split('T')[0];
}

interface RegistrarPagoParams {
  tenantId: string;
  monto: number;
  metodo: string;
  estado: string;
  periodoInicio?: string | null;
  periodoFin?: string | null;
  fechaPago?: string | null;
  referenciaExterna?: string | null;
  origen: 'manual' | 'mercadopago';
  notas?: string | null;
}

// Inserta el registro de pago (con snapshot histórico del plan) y, si quedó
// aprobado con un período, renueva la suscripción y aplica el cambio de plan
// pendiente si lo había. Compartido por: el registro manual del superadmin,
// el webhook de pago único ("Abonar") y el webhook de cobro recurrente.
export async function registrarPagoSuscripcion(params: RegistrarPagoParams): Promise<void> {
  const { data: susc } = await supabase
    .from('suscripciones')
    .select('id, plan_id, plan_pendiente_id')
    .eq('tenant_id', params.tenantId)
    .maybeSingle();

  const planEfectivoId = (params.estado === 'aprobado' && params.periodoFin && susc?.plan_pendiente_id)
    ? susc.plan_pendiente_id
    : (susc?.plan_id ?? null);

  const { data: planSnapshot } = planEfectivoId
    ? await supabase.from('planes').select('nombre, precio_mensual, precio_anual, features').eq('id', planEfectivoId).maybeSingle()
    : { data: null };

  await supabase.from('pagos_suscripcion').insert({
    tenant_id: params.tenantId,
    suscripcion_id: susc?.id ?? null,
    plan_id: planEfectivoId,
    plan_nombre_snapshot: planSnapshot?.nombre ?? null,
    plan_precio_snapshot: planSnapshot?.precio_mensual ?? null,
    plan_features_snapshot: planSnapshot?.features ?? null,
    monto: params.monto,
    metodo: params.metodo,
    estado: params.estado,
    periodo_inicio: params.periodoInicio ?? null,
    periodo_fin: params.periodoFin ?? null,
    fecha_pago: params.estado === 'aprobado' ? (params.fechaPago || new Date().toISOString()) : (params.fechaPago || null),
    referencia_externa: params.referenciaExterna ?? null,
    origen: params.origen,
    notas: params.notas ?? null,
  });

  if (params.estado === 'aprobado' && params.periodoFin) {
    await supabase
      .from('suscripciones')
      .update({
        fecha_fin: params.periodoFin,
        estado: 'activa',
        bloqueado: false,
        bloqueado_at: null,
        ...(susc?.plan_pendiente_id ? { plan_id: susc.plan_pendiente_id, plan_pendiente_id: null } : {}),
      })
      .eq('tenant_id', params.tenantId);
    await supabase.from('tenants').update({ activo: true }).eq('id', params.tenantId);
  }
}
