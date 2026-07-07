'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Eye, Loader2, Save, Ban, CheckCircle, DollarSign, Trash2 } from 'lucide-react';

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
  aprobado: 'text-[#94ab73]', pendiente: 'text-[#cf9a45]', vencido: 'text-[#d1806b]', rechazado: 'text-[#7c745f]',
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

  const input = 'w-full px-3 py-2 bg-[#241f18] border border-[#3a3327] rounded-lg text-sm text-[#f2ede1] focus:outline-none focus:ring-2 focus:ring-[#c9a86a]';
  const label = 'block text-xs text-[#a89d86] mb-1';

  return (
      <div className="max-w-4xl mx-auto">

        <Link href="/superadmin/comercios" className="inline-flex items-center gap-2 text-sm text-[#a89d86] hover:text-[#f2ede1] mb-6">
          <ArrowLeft className="w-4 h-4" /> Volver al panel
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#f2ede1]">{tenant.nombre}</h1>
            <p className="text-sm text-[#a89d86]">/{tenant.slug} · <span className="capitalize">{tenant.tipo_negocio}</span></p>
            <p className="text-xs text-[#7c745f] mt-1">{tenant.email_contacto}{tenant.telefono ? ` · ${tenant.telefono}` : ''}</p>
          </div>
          <div className="flex gap-2">
            {isSuperadmin && (
              <button onClick={impersonar} disabled={saving}
                className="flex items-center gap-2 text-sm bg-[#241f18] hover:bg-[#2f2a20] text-[#f2ede1] px-3 py-2 rounded-lg">
                <Eye className="w-4 h-4" /> Entrar como comercio
              </button>
            )}
            {canSeeBilling && (
              <button onClick={toggleBloqueo} disabled={saving}
                className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${suscripcion?.bloqueado ? 'bg-[#5c7a46] hover:bg-[#6b8c52] text-[#f2ede1]' : 'bg-[#b3543f] hover:bg-[#c26350] text-[#f2ede1]'}`}>
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
            <div key={s.label} className="bg-[#1c1a15] border border-[#2c261d] rounded-xl p-4">
              <p className="text-xl font-bold text-[#f2ede1]">{s.value}</p>
              <p className="text-xs text-[#a89d86] mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {msg && <p className="text-sm text-[#dcc48a] bg-[#221d14]/40 border border-[#4b3f24] rounded-lg px-4 py-2 mb-4">{msg}</p>}

        {!canSeeBilling ? (
          <div className="bg-[#1c1a15] border border-[#2c261d] rounded-2xl p-6 text-center text-[#a89d86] text-sm">
            Tu rol (soporte) no tiene acceso a la facturación de este comercio.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Suscripción */}
            <div className="bg-[#1c1a15] border border-[#2c261d] rounded-2xl p-5">
              <h2 className="font-semibold text-[#f2ede1] mb-4">Suscripción</h2>
              <div className="space-y-3">
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
                    <input type="number" className={input} value={form.dias_gracia ?? ''} onChange={(e) => setForm({ ...form, dias_gracia: e.target.value === '' ? null : Number(e.target.value) })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={label}>Descuento %</label>
                    <input type="number" className={input} value={form.descuento_porcentaje ?? ''} onChange={(e) => setForm({ ...form, descuento_porcentaje: e.target.value === '' ? null : Number(e.target.value) })} />
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
                  className="w-full flex items-center justify-center gap-2 bg-[#c9a86a] hover:bg-[#d8b877] text-[#1a1710] py-2.5 rounded-lg text-sm font-semibold">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar suscripción
                </button>
              </div>
            </div>

            {/* Registrar pago + historial */}
            <div className="space-y-6">
              <div className="bg-[#1c1a15] border border-[#2c261d] rounded-2xl p-5">
                <h2 className="font-semibold text-[#f2ede1] mb-4 flex items-center gap-2"><DollarSign className="w-4 h-4 text-[#94ab73]" /> Registrar pago</h2>
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
                  <p className="text-xs text-[#7c745f]">Si está aprobado y ponés &quot;cubre hasta&quot;, se renueva la suscripción automáticamente.</p>
                  <button onClick={registrarPago} disabled={saving}
                    className="w-full flex items-center justify-center gap-2 bg-[#5c7a46] hover:bg-[#6b8c52] text-[#f2ede1] py-2.5 rounded-lg text-sm font-semibold">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />} Registrar pago
                  </button>
                </div>
              </div>

              <div className="bg-[#1c1a15] border border-[#2c261d] rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-[#2c261d]"><h2 className="font-semibold text-[#f2ede1] text-sm">Historial de pagos</h2></div>
                {pagos.length === 0 ? (
                  <div className="py-8 text-center text-[#7c745f] text-sm">Sin pagos registrados</div>
                ) : (
                  <div className="divide-y divide-[#2c261d]/50">
                    {pagos.map((p) => (
                      <div key={p.id} className="px-5 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm text-[#f2ede1] font-medium">{formatARS(Number(p.monto))}</p>
                          <p className="text-xs text-[#7c745f] capitalize">{p.metodo} · {new Date(p.created_at).toLocaleDateString('es-AR')}</p>
                        </div>
                        <span className={`text-xs font-semibold capitalize ${ESTADO_PAGO[p.estado] ?? 'text-[#a89d86]'}`}>{p.estado}</span>
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
          <div className="mt-8 bg-[#241310]/20 border border-[#4a281f]/40 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold text-[#d99a86] text-sm">Eliminar comercio</h2>
              <p className="text-xs text-[#7c745f] mt-0.5">Borra el comercio y todos sus turnos, clientes y servicios. No se puede deshacer.</p>
            </div>
            <button onClick={eliminar} disabled={saving}
              className="flex items-center justify-center gap-2 text-sm bg-[#b3543f] hover:bg-[#c26350] text-[#f2ede1] px-4 py-2.5 rounded-lg flex-shrink-0">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Eliminar comercio
            </button>
          </div>
        )}
      </div>
  );
}
