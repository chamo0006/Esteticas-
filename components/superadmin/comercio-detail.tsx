'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Eye, Loader2, Save, Ban, CheckCircle, DollarSign, Trash2, Zap, Hand } from 'lucide-react';
import { digitsOnly, cn } from '@/lib/utils';

interface Plan { id: string; nombre: string; precio_mensual: number; precio_anual: number | null; }
interface Suscripcion {
  estado: string | null;
  ciclo: string | null;
  plan_id: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  dias_gracia: number | null;
  descuento_porcentaje: number | null;
  descuento_motivo: string | null;
  precio_acordado: number | null;
  bloqueado: boolean;
  notas: string | null;
  modalidad_cobro: string | null;
  mp_preapproval_status: string | null;
}
interface Pago {
  id: string; monto: number; metodo: string; estado: string;
  periodo_inicio: string | null; periodo_fin: string | null;
  fecha_pago: string | null; referencia_externa: string | null; created_at: string;
}
interface Tenant {
  id: string; nombre: string; slug: string; tipo_negocio: string;
  activo: boolean; email_contacto: string; telefono: string | null;
}
interface Metricas { turnos_total: number; turnos_completados: number; turnos_cancelados: number; dinero_movido: number; }

interface Props {
  canSeeBilling: boolean;
  isSuperadmin: boolean;
  tenant: Tenant;
  suscripcion: Suscripcion | null;
  planes: Plan[];
  pagos: Pago[];
  metricas: Metricas;
}

function formatARS(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n);
}

const ESTADO_PAGO: Record<string, string> = {
  aprobado: 'text-emerald-600', pendiente: 'text-amber-600', vencido: 'text-red-500', rechazado: 'text-gray-400',
};

const ESTADO_PREAPPROVAL_LABEL: Record<string, string> = {
  pending: 'Pendiente de autorización del dueño',
  authorized: 'Autorizada y cobrando',
  paused: 'Pausada',
  cancelled: 'Cancelada',
};

export function ComercioDetail({ canSeeBilling, isSuperadmin, tenant, suscripcion, planes, pagos, metricas }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Form suscripción
  const [form, setForm] = useState({
    plan_id: suscripcion?.plan_id ?? '',
    estado: suscripcion?.estado ?? 'trial',
    ciclo: suscripcion?.ciclo ?? 'mensual',
    fecha_fin: suscripcion?.fecha_fin ?? '',
    dias_gracia: (suscripcion?.dias_gracia ?? 5) as number | null,
    descuento_porcentaje: (suscripcion?.descuento_porcentaje ?? 0) as number | null,
    descuento_motivo: suscripcion?.descuento_motivo ?? '',
    precio_acordado: suscripcion?.precio_acordado ?? '',
    notas: suscripcion?.notas ?? '',
  });

  // Form pago
  const [pago, setPago] = useState({
    monto: '', metodo: 'transferencia', estado: 'aprobado',
    periodo_inicio: '', periodo_fin: '', referencia_externa: '',
  });

  // Si la sesión de superadmin caducó, el endpoint responde 401. En vez del
  // genérico "Error al guardar", avisamos y mandamos a re-loguear.
  const sesionExpirada = (res: Response) => {
    if (res.status !== 401) return false;
    setMsg('Tu sesión expiró. Redirigiendo al login…');
    setTimeout(() => router.push('/superadmin/login'), 1200);
    return true;
  };

  const guardarSuscripcion = async () => {
    setSaving(true); setMsg(null);
    const res = await fetch(`/api/superadmin/tenants/${tenant.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        plan_id: form.plan_id || null,
        dias_gracia: form.dias_gracia ?? 5,
        descuento_porcentaje: form.descuento_porcentaje ?? 0,
      }),
    });
    setSaving(false);
    if (res.ok) { setMsg('Suscripción guardada ✓'); router.refresh(); }
    else if (!sesionExpirada(res)) setMsg('Error al guardar');
  };

  const cambiarModalidad = async (modalidad: 'manual' | 'automatico') => {
    if (modalidad === suscripcion?.modalidad_cobro) return;
    if (modalidad === 'automatico' && !confirm('Se va a generar un link de autorización de débito automático en MercadoPago para que el dueño lo complete. ¿Continuar?')) return;
    if (modalidad === 'manual' && suscripcion?.modalidad_cobro === 'automatico' && !confirm('Esto cancela la suscripción recurrente activa en MercadoPago. ¿Continuar?')) return;
    setSaving(true); setMsg(null);
    const res = await fetch(`/api/superadmin/tenants/${tenant.id}/modalidad-cobro`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modalidad }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (res.ok) { setMsg('Modalidad de cobro actualizada ✓'); router.refresh(); }
    else if (!sesionExpirada(res)) setMsg(data.error || 'No se pudo cambiar la modalidad de cobro');
  };

  const toggleBloqueo = async () => {
    const nuevo = !suscripcion?.bloqueado;
    if (!confirm(nuevo ? '¿Bloquear el acceso de este comercio?' : '¿Reactivar el acceso de este comercio?')) return;
    setSaving(true); setMsg(null);
    const res = await fetch(`/api/superadmin/tenants/${tenant.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bloqueado: nuevo, estado: nuevo ? 'suspendida' : 'activa' }),
    });
    setSaving(false);
    if (res.ok) router.refresh();
    else if (!sesionExpirada(res)) setMsg('No se pudo actualizar el estado');
  };

  const registrarPago = async () => {
    if (!pago.monto) { setMsg('Ingresá el monto'); return; }
    setSaving(true); setMsg(null);
    const res = await fetch(`/api/superadmin/tenants/${tenant.id}/pagos`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...pago, monto: Number(pago.monto) }),
    });
    setSaving(false);
    if (res.ok) {
      setMsg('Pago registrado ✓');
      setPago({ monto: '', metodo: 'transferencia', estado: 'aprobado', periodo_inicio: '', periodo_fin: '', referencia_externa: '' });
      router.refresh();
    } else if (!sesionExpirada(res)) { setMsg('Error al registrar el pago'); }
  };

  const eliminar = async () => {
    const escrito = prompt(`Esta acción es IRREVERSIBLE. Se borrarán el comercio y todos sus turnos, clientes y servicios.\n\nPara confirmar, escribí el slug del comercio: ${tenant.slug}`);
    if (escrito !== tenant.slug) {
      if (escrito !== null) alert('El texto no coincide. No se eliminó nada.');
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/superadmin/tenants/${tenant.id}`, { method: 'DELETE' });
    if (res.ok) {
      router.push('/superadmin');
      router.refresh();
    } else {
      setSaving(false);
      alert('No se pudo eliminar el comercio.');
    }
  };

  const impersonar = async () => {
    setSaving(true);
    const res = await fetch('/api/superadmin/impersonate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: tenant.id }),
    });
    if (res.ok) router.push(`/admin/${tenant.slug}`);
    else { setSaving(false); alert('No se pudo impersonar.'); }
  };

  const input = 'w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-400';
  const label = 'block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5';

  return (
      <div className="max-w-4xl mx-auto">

        <Link href="/superadmin/comercios" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-900 mb-6">
          <ArrowLeft className="w-4 h-4" /> Volver al panel
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{tenant.nombre}</h1>
            <p className="text-sm text-gray-500">/{tenant.slug} · <span className="capitalize">{tenant.tipo_negocio}</span></p>
            <p className="text-xs text-gray-400 mt-1">{tenant.email_contacto}{tenant.telefono ? ` · ${tenant.telefono}` : ''}</p>
          </div>
          <div className="flex gap-2">
            {isSuperadmin && (
              <button onClick={impersonar} disabled={saving}
                className="flex items-center gap-2 text-sm bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 px-3 py-2 rounded-xl shadow-sm">
                <Eye className="w-4 h-4" /> Entrar como comercio
              </button>
            )}
            {canSeeBilling && (
              <button onClick={toggleBloqueo} disabled={saving}
                className={`flex items-center gap-2 text-sm px-3 py-2 rounded-xl text-white ${suscripcion?.bloqueado ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-500 hover:bg-red-600'}`}>
                {suscripcion?.bloqueado ? <><CheckCircle className="w-4 h-4" /> Reactivar</> : <><Ban className="w-4 h-4" /> Bloquear</>}
              </button>
            )}
          </div>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Turnos totales', value: metricas.turnos_total },
            { label: 'Completados', value: metricas.turnos_completados },
            { label: 'Cancelados', value: metricas.turnos_cancelados },
            ...(canSeeBilling ? [{ label: 'Dinero movido', value: formatARS(metricas.dinero_movido) }] : []),
          ].map((s) => (
            <div key={s.label} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <p className="text-xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {msg && <p className="text-sm text-violet-700 bg-violet-50 border border-violet-100 rounded-xl px-4 py-2 mb-4">{msg}</p>}

        {!canSeeBilling ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-6 text-center text-gray-400 text-sm shadow-sm">
            Tu rol (soporte) no tiene acceso a la facturación de este comercio.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Suscripción */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <h2 className="font-semibold text-gray-900 mb-4">Suscripción</h2>
              <div className="space-y-3">
                <div>
                  <label className={label}>Modalidad de cobro</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => cambiarModalidad('manual')}
                      disabled={saving}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-colors disabled:opacity-50',
                        suscripcion?.modalidad_cobro !== 'automatico' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      )}
                    >
                      <Hand className="w-3.5 h-3.5" /> Manual
                    </button>
                    <button
                      type="button"
                      onClick={() => cambiarModalidad('automatico')}
                      disabled={saving}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-colors disabled:opacity-50',
                        suscripcion?.modalidad_cobro === 'automatico' ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      )}
                    >
                      <Zap className="w-3.5 h-3.5" /> Automático
                    </button>
                  </div>
                  {suscripcion?.modalidad_cobro === 'automatico' && (
                    <p className="text-xs text-gray-400 mt-1.5">
                      {ESTADO_PREAPPROVAL_LABEL[suscripcion.mp_preapproval_status ?? ''] ?? 'Sin suscripción de MercadoPago generada todavía'}
                    </p>
                  )}
                </div>
                <div>
                  <label className={label}>Plan</label>
                  <select className={input} value={form.plan_id} onChange={(e) => setForm({ ...form, plan_id: e.target.value })}>
                    <option value="">Sin plan</option>
                    {planes.map((p) => <option key={p.id} value={p.id}>{p.nombre} — {formatARS(p.precio_mensual)}/mes</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={label}>Estado</label>
                    <select className={input} value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
                      {['trial', 'activa', 'vencida', 'suspendida', 'cancelada'].map((e) => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={label}>Ciclo</label>
                    <select className={input} value={form.ciclo} onChange={(e) => setForm({ ...form, ciclo: e.target.value })}>
                      <option value="mensual">Mensual</option>
                      <option value="anual">Anual</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={label}>Vence el</label>
                    <input type="date" className={input} value={form.fecha_fin ?? ''} onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })} />
                  </div>
                  <div>
                    <label className={label}>Días de gracia</label>
                    <input type="text" inputMode="numeric" pattern="[0-9]*" className={input} value={form.dias_gracia?.toString() ?? ''} onChange={(e) => { const d = digitsOnly(e.target.value); setForm({ ...form, dias_gracia: d === '' ? null : Number(d) }); }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={label}>Descuento %</label>
                    <input type="text" inputMode="numeric" pattern="[0-9]*" className={input} value={form.descuento_porcentaje?.toString() ?? ''} onChange={(e) => { const d = digitsOnly(e.target.value); setForm({ ...form, descuento_porcentaje: d === '' ? null : Number(d) }); }} />
                  </div>
                  <div>
                    <label className={label}>Precio acordado</label>
                    <input type="number" className={input} placeholder="(opcional)" value={form.precio_acordado} onChange={(e) => setForm({ ...form, precio_acordado: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className={label}>Motivo del descuento / notas</label>
                  <textarea className={input} rows={2} value={form.descuento_motivo} onChange={(e) => setForm({ ...form, descuento_motivo: e.target.value })} />
                </div>
                <button onClick={guardarSuscripcion} disabled={saving}
                  className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar suscripción
                </button>
              </div>
            </div>

            {/* Registrar pago + historial */}
            <div className="space-y-6">
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><DollarSign className="w-4 h-4 text-emerald-500" /> Registrar pago</h2>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={label}>Monto</label>
                      <input type="number" className={input} value={pago.monto} onChange={(e) => setPago({ ...pago, monto: e.target.value })} />
                    </div>
                    <div>
                      <label className={label}>Método</label>
                      <select className={input} value={pago.metodo} onChange={(e) => setPago({ ...pago, metodo: e.target.value })}>
                        {['transferencia', 'mercadopago', 'efectivo', 'tarjeta', 'otro'].map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={label}>Estado</label>
                      <select className={input} value={pago.estado} onChange={(e) => setPago({ ...pago, estado: e.target.value })}>
                        {['aprobado', 'pendiente', 'vencido', 'rechazado'].map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={label}>Cubre hasta</label>
                      <input type="date" className={input} value={pago.periodo_fin} onChange={(e) => setPago({ ...pago, periodo_fin: e.target.value })} />
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">Si está aprobado y ponés &quot;cubre hasta&quot;, se renueva la suscripción automáticamente.</p>
                  <button onClick={registrarPago} disabled={saving}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />} Registrar pago
                  </button>
                </div>
              </div>

              <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-5 py-3 border-b border-gray-100"><h2 className="font-semibold text-gray-900 text-sm">Historial de pagos</h2></div>
                {pagos.length === 0 ? (
                  <div className="py-8 text-center text-gray-400 text-sm">Sin pagos registrados</div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {pagos.map((p) => (
                      <div key={p.id} className="px-5 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-900 font-medium">{formatARS(Number(p.monto))}</p>
                          <p className="text-xs text-gray-400 capitalize">{p.metodo} · {new Date(p.created_at).toLocaleDateString('es-AR')}</p>
                        </div>
                        <span className={`text-xs font-semibold capitalize ${ESTADO_PAGO[p.estado] ?? 'text-gray-400'}`}>{p.estado}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Zona de peligro */}
        {isSuperadmin && (
          <div className="mt-8 bg-red-50 border border-red-100 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold text-red-700 text-sm">Eliminar comercio</h2>
              <p className="text-xs text-red-400 mt-0.5">Borra el comercio y todos sus turnos, clientes y servicios. No se puede deshacer.</p>
            </div>
            <button onClick={eliminar} disabled={saving}
              className="flex items-center justify-center gap-2 text-sm bg-red-500 hover:bg-red-600 text-white px-4 py-2.5 rounded-xl flex-shrink-0 transition-colors">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Eliminar comercio
            </button>
          </div>
        )}
      </div>
  );
}
