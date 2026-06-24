'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Save, Loader2, Plus, X, Settings, Clock, CreditCard, Palette, Upload, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const DIAS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

// Opciones de horario de 06:00 a 23:30 cada 30 min
const TIME_OPTIONS: string[] = [];
for (let h = 6; h <= 23; h++) {
  TIME_OPTIONS.push(`${String(h).padStart(2,'0')}:00`);
  if (h < 23) TIME_OPTIONS.push(`${String(h).padStart(2,'0')}:30`);
}

function TimeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-1.5 border border-zinc-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400 text-zinc-800 cursor-pointer"
    >
      {TIME_OPTIONS.map(t => (
        <option key={t} value={t}>{t}</option>
      ))}
    </select>
  );
}

interface Horario { dia_semana: number; hora_apertura: string; hora_cierre: string; activo: boolean }
interface DiaBloqueo { id: string; fecha: string; motivo: string | null }
interface TenantConfig {
  nombre: string; email_contacto: string; telefono: string;
  exige_sena: boolean; porcentaje_sena: number | null; permite_efectivo: boolean;
  logo_url: string | null; color_primario: string | null; color_acento: string | null;
  tipo_negocio: 'estetica' | 'barberia';
}

const DEFAULT_HORARIOS: Horario[] = Array.from({ length: 7 }, (_, i) => ({
  dia_semana: i, hora_apertura: '09:00', hora_cierre: '18:00', activo: i !== 0,
}));

type Tab = 'general' | 'pagos' | 'horarios' | 'apariencia';

export default function ConfiguracionPage() {
  const params = useParams();
  const tenantSlug = params.tenantSlug as string;

  const [tab, setTab] = useState<Tab>('general');
  const [tenant, setTenant] = useState<TenantConfig | null>(null);
  const [horarios, setHorarios] = useState<Horario[]>(DEFAULT_HORARIOS);
  const [diasBloqueados, setDiasBloqueados] = useState<DiaBloqueo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Para agregar día bloqueado
  const [nuevaFecha, setNuevaFecha] = useState('');
  const [nuevoMotivo, setNuevoMotivo] = useState('');

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/${tenantSlug}/configuracion`);
    const data = await res.json();
    setTenant(data.tenant);
    if (data.horarios.length > 0) {
      // Postgres TIME llega como "HH:MM:SS"; los <option> son "HH:MM".
      // Recortamos a 5 chars para que el <select> matchee el valor guardado.
      setHorarios(data.horarios.map((h: Horario) => ({
        ...h,
        hora_apertura: h.hora_apertura.slice(0, 5),
        hora_cierre: h.hora_cierre.slice(0, 5),
      })));
    }
    setDiasBloqueados(data.dias_bloqueados ?? []);
    setLoading(false);
  }, [tenantSlug]);

  useEffect(() => { fetch_(); }, [fetch_]);

  const saveTenant = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/admin/${tenantSlug}/configuracion`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tenant),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        const data = await res.json().catch(() => ({}));
        setSaveError(data.error ?? 'Error al guardar');
      }
    } catch {
      setSaveError('Error de red. Intentá de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const saveHorarios = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/admin/${tenantSlug}/horarios`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ horarios }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        const data = await res.json().catch(() => ({}));
        setSaveError(data.error ?? 'Error al guardar');
      }
    } catch {
      setSaveError('Error de red. Intentá de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const agregarDiaBloqueado = async () => {
    if (!nuevaFecha) return;
    await fetch(`/api/admin/${tenantSlug}/horarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fecha: nuevaFecha, motivo: nuevoMotivo }),
    });
    setNuevaFecha(''); setNuevoMotivo('');
    fetch_();
  };

  const handleLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('La imagen no puede superar 2MB');
      return;
    }
    setLogoUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      setTenant(t => t ? { ...t, logo_url: reader.result as string } : t);
      setLogoUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const eliminarDiaBloqueado = async (id: string) => {
    await fetch(`/api/admin/${tenantSlug}/horarios?id=${id}`, { method: 'DELETE' });
    fetch_();
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-zinc-400">
      <Loader2 className="w-6 h-6 animate-spin mr-2" /> Cargando...
    </div>
  );

  const tabs: { id: Tab; label: string; icon: typeof Settings }[] = [
    { id: 'general',    label: 'General',    icon: Settings   },
    { id: 'pagos',      label: 'Pagos',      icon: CreditCard },
    { id: 'horarios',   label: 'Horarios',   icon: Clock      },
    { id: 'apariencia', label: 'Apariencia', icon: Palette    },
  ];

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">Configuración</h1>
        <p className="text-zinc-400 text-sm mt-1">Ajustá los datos de tu estética</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl mb-6">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all',
              tab === id ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
            )}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {tenant && (
        <>
          {/* ── GENERAL ─────────────────────────────────────── */}
          {tab === 'general' && (
            <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
                  Nombre de la estética
                </label>
                <input
                  value={tenant.nombre}
                  onChange={(e) => setTenant(t => t ? { ...t, nombre: e.target.value } : t)}
                  className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
                  Email de contacto
                </label>
                <input
                  type="email"
                  value={tenant.email_contacto}
                  onChange={(e) => setTenant(t => t ? { ...t, email_contacto: e.target.value } : t)}
                  className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
                  Teléfono
                </label>
                <input
                  value={tenant.telefono ?? ''}
                  onChange={(e) => setTenant(t => t ? { ...t, telefono: e.target.value } : t)}
                  className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  placeholder="+54 11 xxxx-xxxx"
                />
              </div>
              <button onClick={saveTenant} disabled={saving} className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saved ? '¡Guardado!' : 'Guardar cambios'}
              </button>
            </div>
          )}

          {/* ── PAGOS ──────────────────────────────────────── */}
          {tab === 'pagos' && (
            <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6 space-y-5">
              {/* Efectivo toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-zinc-900 text-sm">Aceptar efectivo</p>
                  <p className="text-xs text-zinc-400 mt-0.5">Mostrar opción de pago en efectivo al cliente</p>
                </div>
                <button
                  onClick={() => setTenant(t => t ? { ...t, permite_efectivo: !t.permite_efectivo } : t)}
                  className={cn(
                    'w-12 h-6 rounded-full transition-colors relative overflow-hidden',
                    tenant.permite_efectivo ? 'bg-violet-600' : 'bg-zinc-200'
                  )}
                >
                  <span className={cn(
                    'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
                    tenant.permite_efectivo ? 'translate-x-6' : 'translate-x-0'
                  )} />
                </button>
              </div>

              {/* Seña toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-zinc-900 text-sm">Exigir seña</p>
                  <p className="text-xs text-zinc-400 mt-0.5">El cliente paga un % al reservar</p>
                </div>
                <button
                  onClick={() => setTenant(t => t ? { ...t, exige_sena: !t.exige_sena } : t)}
                  className={cn(
                    'w-12 h-6 rounded-full transition-colors relative overflow-hidden',
                    tenant.exige_sena ? 'bg-violet-600' : 'bg-zinc-200'
                  )}
                >
                  <span className={cn(
                    'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
                    tenant.exige_sena ? 'translate-x-6' : 'translate-x-0'
                  )} />
                </button>
              </div>

              {/* Porcentaje seña */}
              {tenant.exige_sena && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
                    Porcentaje de seña
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number" min={1} max={100}
                      value={tenant.porcentaje_sena ?? 30}
                      onChange={(e) => setTenant(t => t ? { ...t, porcentaje_sena: Number(e.target.value) } : t)}
                      className="w-24 px-4 py-3 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />
                    <span className="text-zinc-500 text-sm font-medium">%</span>
                  </div>
                </div>
              )}

              <button onClick={saveTenant} disabled={saving} className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saved ? '¡Guardado!' : 'Guardar configuración'}
              </button>
            </div>
          )}

          {/* ── HORARIOS ───────────────────────────────────── */}
          {tab === 'horarios' && (
            <div className="space-y-4">
              {/* Días de la semana */}
              <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm divide-y divide-zinc-50">
                {horarios.map((h, i) => (
                  <div key={h.dia_semana} className="px-5 py-4 flex items-center gap-4">
                    {/* Toggle — mismo estilo que Pagos */}
                    <button
                      onClick={() => {
                        const next = [...horarios];
                        next[i] = { ...next[i], activo: !next[i].activo };
                        setHorarios(next);
                      }}
                      className={cn('w-12 h-6 rounded-full transition-colors relative flex-shrink-0 overflow-hidden', h.activo ? 'bg-violet-600' : 'bg-zinc-200')}
                    >
                      <span className={cn('absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform', h.activo ? 'translate-x-6' : 'translate-x-0')} />
                    </button>

                    {/* Día */}
                    <span className={cn('text-sm font-medium w-24 flex-shrink-0 select-none', h.activo ? 'text-zinc-900' : 'text-zinc-400')}>
                      {DIAS[h.dia_semana]}
                    </span>

                    {/* Horario o Cerrado */}
                    <div className="ml-auto flex items-center gap-2">
                      {h.activo ? (
                        <>
                          <TimeSelect
                            value={h.hora_apertura}
                            onChange={(v) => { const n=[...horarios]; n[i]={...n[i],hora_apertura:v}; setHorarios(n); }}
                          />
                          <span className="text-zinc-300 text-sm flex-shrink-0">—</span>
                          <TimeSelect
                            value={h.hora_cierre}
                            onChange={(v) => { const n=[...horarios]; n[i]={...n[i],hora_cierre:v}; setHorarios(n); }}
                          />
                        </>
                      ) : (
                        <span className="text-xs font-semibold text-zinc-400 bg-zinc-100 px-3 py-1.5 rounded-full">
                          Cerrado
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {saveError && (
                <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{saveError}</p>
              )}
              <button onClick={saveHorarios} disabled={saving} className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saved ? '¡Guardado!' : 'Guardar horarios'}
              </button>

              {/* Días bloqueados */}
              <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
                <h3 className="font-semibold text-zinc-900 mb-4">Días bloqueados / Vacaciones</h3>
                <div className="flex gap-2 mb-4">
                  <input type="date" value={nuevaFecha} onChange={(e) => setNuevaFecha(e.target.value)}
                    className="flex-1 px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                  <input placeholder="Motivo (opcional)" value={nuevoMotivo} onChange={(e) => setNuevoMotivo(e.target.value)}
                    className="flex-1 px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                  <button onClick={agregarDiaBloqueado} className="p-2 bg-violet-600 text-white rounded-xl hover:bg-violet-500 transition-colors flex-shrink-0">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {diasBloqueados.length === 0 ? (
                  <p className="text-zinc-400 text-sm text-center py-2">Sin días bloqueados</p>
                ) : (
                  <div className="space-y-2">
                    {diasBloqueados.map((d) => (
                      <div key={d.id} className="flex items-center justify-between bg-zinc-50 rounded-xl px-3 py-2">
                        <div>
                          <span className="text-sm font-medium text-zinc-900">{d.fecha}</span>
                          {d.motivo && <span className="text-xs text-zinc-400 ml-2">{d.motivo}</span>}
                        </div>
                        <button onClick={() => eliminarDiaBloqueado(d.id)} className="text-zinc-400 hover:text-red-500 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── APARIENCIA ─────────────────────────────────── */}
          {tab === 'apariencia' && (
            <div className="space-y-4">

              {/* Logo */}
              <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5 space-y-4">
                <h3 className="font-semibold text-zinc-900">Logo</h3>

                <div className="flex items-center gap-4">
                  {/* Preview */}
                  <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-zinc-200 flex items-center justify-center overflow-hidden flex-shrink-0 bg-zinc-50">
                    {logoUploading ? (
                      <Loader2 className="w-6 h-6 animate-spin text-zinc-300" />
                    ) : tenant.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={tenant.logo_url} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-zinc-300" />
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex-1 space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoFile}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-violet-300 rounded-xl text-sm font-medium text-violet-600 hover:bg-violet-50 transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      Subir desde tu dispositivo
                    </button>
                    {tenant.logo_url && (
                      <button
                        type="button"
                        onClick={() => setTenant(t => t ? { ...t, logo_url: null } : t)}
                        className="w-full text-xs text-zinc-400 hover:text-red-500 transition-colors"
                      >
                        Quitar logo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <button onClick={saveTenant} disabled={saving} className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saved ? '¡Guardado!' : 'Guardar logo'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
