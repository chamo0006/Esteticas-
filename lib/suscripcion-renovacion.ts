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

  const fechaPagoFinal = params.estado === 'aprobado' ? (params.fechaPago || new Date().toISOString()) : (params.fechaPago || null);

  const { data: pagoInsertado } = await supabase
    .from('pagos_suscripcion')
    .insert({
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
      fecha_pago: fechaPagoFinal,
      referencia_externa: params.referenciaExterna ?? null,
      origen: params.origen,
      notas: params.notas ?? null,
    })
    .select('id')
    .single();

  // Todo pago aprobado se refleja también en Ventas (ventas_facturacion), para
  // tener ahí el registro completo de toda la plata que entra — formal o
  // manual. Se marca con pago_suscripcion_id para no contarlo dos veces en
  // los totales de ingresos (esos ya lo suman vía pagos_suscripcion).
  if (params.estado === 'aprobado' && pagoInsertado) {
    const { data: tenant } = await supabase.from('tenants').select('nombre').eq('id', params.tenantId).maybeSingle();
    await supabase.from('ventas_facturacion').insert({
      cliente: tenant?.nombre ?? 'Comercio',
      plan: planSnapshot?.nombre ?? 'Sin plan',
      monto: params.monto,
      fecha_pago: (fechaPagoFinal ?? new Date().toISOString()).slice(0, 10),
      fecha_vencimiento: params.periodoFin ?? null,
      notas: `Pago registrado automáticamente (${params.origen === 'mercadopago' ? 'MercadoPago' : 'manual'})`,
      pago_suscripcion_id: pagoInsertado.id,
    });
  }

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

// Se llama al borrar o corregir un pago que YA había extendido el vencimiento
// (estaba aprobado y traía un período). Si ese período sigue siendo el
// vigente en la suscripción, lo recalcula en base al pago aprobado más
// reciente que quede — o, si no queda ninguno, la deja sin vencimiento
// (null) para que el semáforo de morosos la detecte. Nunca toca `estado`
// ni `bloqueado`: esos siguen siendo manuales (ver panel de facturación).
export async function recalcularVencimientoSiCorresponde(
  tenantId: string,
  periodoFinAfectado: string | null | undefined,
): Promise<void> {
  if (!periodoFinAfectado) return;

  const { data: susc } = await supabase
    .from('suscripciones')
    .select('fecha_fin')
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (!susc || susc.fecha_fin !== periodoFinAfectado) return; // no era el vigente, no tocar nada

  const { data: siguiente } = await supabase
    .from('pagos_suscripcion')
    .select('periodo_fin')
    .eq('tenant_id', tenantId)
    .eq('estado', 'aprobado')
    .not('periodo_fin', 'is', null)
    .order('periodo_fin', { ascending: false })
    .limit(1)
    .maybeSingle();

  await supabase
    .from('suscripciones')
    .update({ fecha_fin: siguiente?.periodo_fin ?? null })
    .eq('tenant_id', tenantId);
}
