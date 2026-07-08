'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Service, TenantConfig, TimeSlot, BookingConfirmation } from '@/lib/booking-types';

// ── Tipos de datos que llegan desde el server (page.tsx) ────────────────────
export interface Barber {
  id: string;
  nombre: string;
  rol: string | null;
  rating: number | null;
}
export interface Review {
  id: string;
  nombre: string;
  texto: string;
  rating: number;
}
export interface BarberiaStats {
  rating: number | null;
  barberos: number;
  clientes: number;
  reseñas: number;
}
export interface Foto {
  id: string;
  url: string;
}

interface Props {
  tenant: TenantConfig;
  services: Service[];
  barbers: Barber[];
  reviews: Review[];
  stats: BarberiaStats;
  galeria: Foto[];
}

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const DAYS_SHORT = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

type Step = 'servicio' | 'barbero' | 'fecha' | 'confirmar';
type PaymentMethod = 'mercadopago' | 'efectivo' | 'transferencia';
type Status = 'idle' | 'loading' | 'error';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n);

const parseDur = (d: string) => {
  const m = parseInt(d, 10);
  return isNaN(m) ? 60 : m;
};

const fmtApiDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const iniciales = (nombre: string) =>
  nombre.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');

// Fondo de página + enmarcado de la columna SOLO en desktop (en mobile queda full-bleed).
const BB_CSS = `
.bb-shell { min-height: 100vh; min-height: 100dvh; background: #000; display: flex; justify-content: center; }
.bb-card  { min-height: 100vh; min-height: 100dvh; }
@media (min-width: 640px) {
  .bb-shell {
    background: radial-gradient(130% 70% at 50% 0%, #1a1a1a 0%, #050505 55%, #000 100%);
    padding: 36px 24px;
    align-items: flex-start;
  }
  .bb-card {
    min-height: calc(100dvh - 72px);
    border-radius: 22px;
    border: 0.5px solid #1e1e1e;
    box-shadow: 0 30px 80px rgba(0,0,0,0.6);
    overflow: hidden;
  }
}
`;

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bb-shell">
      <style dangerouslySetInnerHTML={{ __html: BB_CSS }} />
      {children}
    </div>
  );
}

export function BarberiaClient({ tenant, services, barbers, reviews, stats, galeria }: Props) {
  const today = new Date();
  const hasBarbers = barbers.length > 0;

  const STEPS: Step[] = hasBarbers
    ? ['servicio', 'barbero', 'fecha', 'confirmar']
    : ['servicio', 'fecha', 'confirmar'];

  const [step, setStep]       = useState<Step>('servicio');
  const [service, setService] = useState<Service | null>(services[0] ?? null);
  const [barber, setBarber]   = useState<Barber | null>(barbers[0] ?? null);
  const [day, setDay]         = useState<Date | null>(null);
  const [time, setTime]       = useState<string | null>(null);
  const [name, setName]       = useState('');
  const [phone, setPhone]     = useState('');
  const [email, setEmail]     = useState('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>(tenant.permite_efectivo ? 'efectivo' : 'mercadopago');

  const [slots, setSlots]               = useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const [status, setStatus] = useState<Status>('idle');
  const [error, setError]   = useState<string | null>(null);
  const [done, setDone]     = useState(false);

  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const stepIdx  = STEPS.indexOf(step);
  const duracion = service ? parseDur(service.duration) : 60;

  // ── Disponibilidad real (por barbero si corresponde) ──────────────────────
  useEffect(() => {
    if (step !== 'fecha' || !day) { setSlots([]); return; }
    const fecha = fmtApiDate(day);
    const profParam = hasBarbers && barber ? `&profesionalId=${barber.id}` : '';
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    setSlotsLoading(true);
    setSlots([]);
    fetch(`/api/${tenant.slug}/disponibilidad?fecha=${fecha}&duracion=${duracion}${profParam}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d: TimeSlot[]) => setSlots(Array.isArray(d) ? d : []))
      .catch(() => setSlots([]))
      .finally(() => { clearTimeout(t); setSlotsLoading(false); });
    return () => { ctrl.abort(); clearTimeout(t); };
  }, [step, day, duracion, barber, hasBarbers, tenant.slug]);

  // ── Calendario ────────────────────────────────────────────────────────────
  const year  = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const calDays = useMemo<(Date | null)[]>(() => {
    const firstDay  = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    return [
      ...Array(firstDay).fill(null),
      ...Array.from({ length: totalDays }, (_, i) => new Date(year, month, i + 1)),
    ];
  }, [year, month]);
  const isCurrMonth = year === today.getFullYear() && month === today.getMonth();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const sameDay = (a: Date | null, b: Date | null) =>
    !!a && !!b && a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();

  const summaryDate = day ? `${day.getDate()} ${MONTHS[day.getMonth()]}` : '—';

  // ── Total / seña ──────────────────────────────────────────────────────────
  const total = service?.price ?? 0;
  const exigeSena = !!(tenant.exige_sena && tenant.porcentaje_sena);
  const montoAPagar = exigeSena
    ? Math.round((total * (tenant.porcentaje_sena ?? 0)) / 100 * 100) / 100
    : total;

  const goNext = () => { const i = STEPS.indexOf(step); if (i < STEPS.length - 1) setStep(STEPS[i + 1]); };
  const goPrev = () => { const i = STEPS.indexOf(step); if (i > 0) setStep(STEPS[i - 1]); };

  // ── Confirmar reserva ─────────────────────────────────────────────────────
  async function handleConfirm() {
    const nameParts = name.trim().split(/\s+/);
    if (nameParts.length < 2) { setError('Ingresá tu nombre y apellido.'); return; }
    if (phone.replace(/\D/g, '').length < 6) { setError('Ingresá un celular válido.'); return; }
    if (!email.includes('@')) { setError('Ingresá un email válido.'); return; }
    if (!service || !day || !time) return;

    setStatus('loading');
    setError(null);

    const nombre   = nameParts[0];
    const apellido = nameParts.slice(1).join(' ');

    const y = day.getFullYear();
    const mo = String(day.getMonth() + 1).padStart(2, '0');
    const d = String(day.getDate()).padStart(2, '0');
    const off = new Date().getTimezoneOffset();
    const sign = off <= 0 ? '+' : '-';
    const tzH = String(Math.floor(Math.abs(off) / 60)).padStart(2, '0');
    const tzM = String(Math.abs(off) % 60).padStart(2, '0');
    const fechaHora = `${y}-${mo}-${d}T${time}:00${sign}${tzH}:${tzM}`;

    try {
      const res = await fetch(`/api/${tenant.slug}/reservar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          servicioIds: [service.id],
          fechaHora,
          cliente: { nombre, apellido, email: email.trim(), telefono: phone.trim() },
          metodoPago: payMethod,
          ...(hasBarbers && barber ? { profesionalId: barber.id } : {}),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? 'Error al confirmar la reserva');
      }
      const data: BookingConfirmation = await res.json();

      if (payMethod === 'mercadopago') {
        const mp = await fetch(`/api/${tenant.slug}/crear-preferencia`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pagoId: data.pagoId,
            clienteNombre: `${nombre} ${apellido}`.trim(),
            clienteEmail: email.trim(),
            items: [{ name: service.name }],
          }),
        });
        if (mp.ok) {
          const mpD = await mp.json();
          window.location.href =
            process.env.NODE_ENV === 'production' ? mpD.initPoint : (mpD.sandboxInitPoint ?? mpD.initPoint);
          return;
        }
      }

      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
      setStatus('error');
    }
  }

  // ── Tokens de estilo ──────────────────────────────────────────────────────
  const bg = '#0d0d0d', surface = '#111111', surface2 = '#161616';
  const border = '#1e1e1e', border2 = '#2a2a2a';
  const textPrimary = '#e8e8e8', textSecondary = '#4a4a4a', textMuted = '#2e2e2e', accent = '#ffffff';

  const wppDigits = (tenant.whatsapp || tenant.telefono)?.replace(/\D/g, '') ?? '';
  const wppUrl = wppDigits ? `https://wa.me/${wppDigits}` : undefined;
  const brand = tenant.nombre || 'Barbería';

  const fbUrl = tenant.facebook?.trim()
    ? (/^https?:\/\//i.test(tenant.facebook) ? tenant.facebook : `https://facebook.com/${tenant.facebook.replace(/^@/, '')}`)
    : undefined;
  const ttUrl = tenant.tiktok?.trim()
    ? (/^https?:\/\//i.test(tenant.tiktok) ? tenant.tiktok : `https://tiktok.com/@${tenant.tiktok.replace(/^@/, '')}`)
    : undefined;
  const webUrl = tenant.sitio_web?.trim()
    ? (/^https?:\/\//i.test(tenant.sitio_web) ? tenant.sitio_web : `https://${tenant.sitio_web}`)
    : undefined;

  const wrap: React.CSSProperties = {
    background: bg, width: '100%', maxWidth: 430, margin: '0 auto',
    display: 'flex', flexDirection: 'column',
    fontFamily: 'system-ui, -apple-system, sans-serif', color: textPrimary,
  };
  const nav: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 20px', borderBottom: `0.5px solid ${border}`, background: bg,
    position: 'sticky', top: 0, zIndex: 10,
  };
  const navLogo: React.CSSProperties = { fontSize: 15, fontWeight: 500, color: accent, letterSpacing: '0.03em' };
  const navBadge: React.CSSProperties = {
    fontSize: 11, background: 'rgba(74,220,105,0.08)', color: '#4adc69',
    border: '0.5px solid rgba(74,220,105,0.15)', borderRadius: 100, padding: '3px 10px',
  };
  const section: React.CSSProperties = { padding: '20px 20px 0' };
  const sectionTitle: React.CSSProperties = { fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: textMuted, marginBottom: 12 };
  const pageTitle: React.CSSProperties = { fontSize: 18, fontWeight: 500, color: accent, marginBottom: 4 };
  const pageSub: React.CSSProperties = { fontSize: 12, color: textSecondary, marginBottom: 20 };
  const btnPrimary: React.CSSProperties = { width: '100%', background: accent, color: bg, border: 'none', borderRadius: 12, padding: '15px', fontSize: 14, fontWeight: 500, cursor: 'pointer' };
  const btnSecondary: React.CSSProperties = { background: 'transparent', color: textSecondary, border: `0.5px solid ${border}`, borderRadius: 12, padding: '15px', fontSize: 14, cursor: 'pointer', flex: 1 };
  const input: React.CSSProperties = { width: '100%', background: surface, color: textPrimary, border: `0.5px solid ${border}`, borderRadius: 10, padding: '13px 14px', fontSize: 13, outline: 'none', marginBottom: 10 };

  const svcRow = (sel: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '13px 14px', borderRadius: 10, cursor: 'pointer',
    background: sel ? '#1a1a1a' : surface, border: `0.5px solid ${sel ? border2 : border}`,
    outline: sel ? `1.5px solid ${accent}` : '1.5px solid transparent', marginBottom: 6,
  });
  const barberCard = (sel: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', borderRadius: 10, cursor: 'pointer',
    background: sel ? '#1a1a1a' : surface, border: `0.5px solid ${sel ? border2 : border}`,
    outline: sel ? `1.5px solid ${accent}` : '1.5px solid transparent', marginBottom: 6,
  });
  const calDayStyle = (past: boolean, isToday: boolean, sel: boolean): React.CSSProperties => ({
    fontSize: 12, textAlign: 'center', padding: '7px 2px', borderRadius: 7,
    cursor: past ? 'default' : 'pointer', opacity: past ? 0.25 : 1,
    background: sel ? accent : isToday ? surface2 : 'transparent',
    color: sel ? bg : isToday ? accent : textPrimary,
    border: isToday && !sel ? `0.5px solid ${border2}` : 'none',
  });
  const timeSlotStyle = (taken: boolean, sel: boolean): React.CSSProperties => ({
    fontSize: 12, textAlign: 'center', padding: '9px 4px', borderRadius: 8,
    cursor: taken ? 'default' : 'pointer',
    background: sel ? accent : taken ? '#0f0f0f' : surface,
    color: sel ? bg : taken ? border2 : textSecondary,
    border: `0.5px solid ${sel ? accent : border}`,
  });

  const footer = (
    <div style={{ borderTop: `0.5px solid ${border}`, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: accent }}>✂ {brand}</span>
      <div style={{ display: 'flex', gap: 14 }}>
        {wppUrl && <a href={wppUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: textSecondary, cursor: 'pointer', textDecoration: 'none' }}>WhatsApp</a>}
        {fbUrl && <a href={fbUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: textSecondary, cursor: 'pointer', textDecoration: 'none' }}>Facebook</a>}
        {ttUrl && <a href={ttUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: textSecondary, cursor: 'pointer', textDecoration: 'none' }}>TikTok</a>}
        {webUrl && <a href={webUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: textSecondary, cursor: 'pointer', textDecoration: 'none' }}>Sitio web</a>}
      </div>
    </div>
  );

  // ── Pantalla final ────────────────────────────────────────────────────────
  if (done) {
    const rows: [string, string][] = [
      ['Servicio', service?.name ?? '—'],
      ...(hasBarbers && barber ? [['Barbero', barber.nombre] as [string, string]] : []),
      ['Precio', service ? fmt(service.price) : '—'],
      ['Fecha', summaryDate],
      ['Hora', time ?? '—'],
    ];
    const wppConfirm = wppDigits
      ? `https://wa.me/${wppDigits}?text=${encodeURIComponent(`¡Hola! Reservé un turno ✂️\n${service?.name ?? ''}${barber ? ` con ${barber.nombre}` : ''}\n${summaryDate} a las ${time}`)}`
      : undefined;
    return (
      <Shell>
      <div className="bb-card" style={wrap}>
        <nav style={nav}>
          <span style={navLogo}>✂ {brand}</span>
          <span style={navBadge}>● Abierto</span>
        </nav>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(74,220,105,0.08)', border: '0.5px solid rgba(74,220,105,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, marginBottom: '1.5rem', color: '#4adc69' }}>✓</div>
          <div style={{ fontSize: 22, fontWeight: 500, color: accent, marginBottom: '.5rem' }}>¡Turno confirmado!</div>
          <div style={{ fontSize: 13, color: textSecondary, lineHeight: 1.7, marginBottom: '2rem' }}>
            Te esperamos. Si necesitás cancelar o reprogramar, escribinos por WhatsApp.
          </div>
          <div style={{ background: surface, border: `0.5px solid ${border}`, borderRadius: 14, padding: '1.25rem', width: '100%', textAlign: 'left', marginBottom: '1.5rem' }}>
            {rows.map(([l, v], i, arr) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i === arr.length - 1 ? 'none' : `0.5px solid ${border}` }}>
                <span style={{ fontSize: 12, color: textSecondary }}>{l}</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: accent }}>{v}</span>
              </div>
            ))}
          </div>
          {wppConfirm && (
            <a href={wppConfirm} target="_blank" rel="noopener noreferrer" style={{ ...btnPrimary, display: 'block', textDecoration: 'none', textAlign: 'center', marginBottom: 10 }}>
              Confirmar por WhatsApp
            </a>
          )}
          <button style={{ ...btnSecondary, width: '100%', flex: 'unset' }}
            onClick={() => { setDone(false); setStatus('idle'); setStep('servicio'); setDay(null); setTime(null); setName(''); setPhone(''); setEmail(''); }}>
            Reservar otro turno
          </button>
        </div>
        {footer}
      </div>
      </Shell>
    );
  }

  return (
    <Shell>
    <div className="bb-card" style={wrap}>
      {/* NAV */}
      <nav style={nav}>
        <span style={navLogo}>✂ {brand}</span>
        <span style={navBadge}>● Abierto</span>
      </nav>

      {/* BANNER */}
      {tenant.banner_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={tenant.banner_url} alt="" style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }} />
      )}

      {/* PROGRESS */}
      <div style={{ display: 'flex', gap: 4, padding: '12px 20px', borderBottom: `0.5px solid ${border}`, alignItems: 'center' }}>
        {STEPS.map((_, i) => (
          <div key={i} style={{ flex: 1, height: 2, borderRadius: 2, background: i <= stepIdx ? accent : border2, transition: 'background .3s' }} />
        ))}
        <span style={{ fontSize: 11, color: textSecondary, marginLeft: 6, whiteSpace: 'nowrap' }}>Paso {stepIdx + 1} de {STEPS.length}</span>
      </div>

      {/* ── PASO: SERVICIO ── */}
      {step === 'servicio' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={section}>
            <div style={pageTitle}>¿Qué servicio querés?</div>
            <div style={pageSub}>Elegí uno para continuar</div>
            {tenant.bio && <div style={{ fontSize: 12, color: textSecondary, lineHeight: 1.6, marginBottom: 14, marginTop: -8 }}>{tenant.bio}</div>}
            {tenant.direccion && <div style={{ fontSize: 11, color: textSecondary, marginBottom: 14, marginTop: -8 }}>📍 {tenant.direccion}</div>}
            {services.length === 0 && <div style={{ fontSize: 13, color: textSecondary, padding: '2rem 0', textAlign: 'center' }}>No hay servicios disponibles</div>}
            {services.map((svc) => (
              <div key={svc.id} style={svcRow(service?.id === svc.id)} onClick={() => setService(svc)}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: textPrimary }}>{svc.name}</div>
                  <div style={{ fontSize: 11, color: textSecondary, marginTop: 2 }}>{svc.duration}</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 500, color: accent }}>{fmt(svc.price)}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 'auto', padding: '20px' }}>
            <button style={{ ...btnPrimary, opacity: service ? 1 : 0.4, cursor: service ? 'pointer' : 'default' }} onClick={() => service && goNext()}>Siguiente →</button>
          </div>

          {/* STATS */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, padding: '0 20px 20px' }}>
            {[
              [stats.rating ? `${stats.rating}★` : 'Nuevo', 'Rating'],
              [String(stats.barberos || '—'), stats.barberos === 1 ? 'Barbero' : 'Barberos'],
              [stats.clientes ? `+${stats.clientes}` : '—', 'Clientes'],
            ].map(([v, l]) => (
              <div key={l} style={{ background: surface, border: `0.5px solid ${border}`, borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: 17, fontWeight: 500, color: accent }}>{v}</div>
                <div style={{ fontSize: 10, color: textSecondary, marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>

          {/* GALERÍA */}
          {galeria.length > 0 && (
            <div style={{ padding: '0 20px 20px' }}>
              <div style={{ ...sectionTitle, marginBottom: 12, marginTop: 8 }}>Fotos</div>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
                {galeria.map((f) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={f.id} src={f.url} alt="" style={{ width: 84, height: 84, objectFit: 'cover', borderRadius: 10, flexShrink: 0, border: `0.5px solid ${border}` }} />
                ))}
              </div>
            </div>
          )}

          {/* RESEÑAS */}
          {reviews.length > 0 && (
            <div style={{ padding: '0 20px 20px' }}>
              <div style={{ ...sectionTitle, marginBottom: 12, marginTop: 8 }}>Lo que dicen nuestros clientes</div>
              {reviews.slice(0, 3).map((r) => (
                <div key={r.id} style={{ background: surface, border: `0.5px solid ${border}`, borderRadius: 12, padding: 14, marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: surface2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 500, color: textSecondary, flexShrink: 0 }}>{iniciales(r.nombre)}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: textPrimary }}>{r.nombre}</div>
                      <div style={{ fontSize: 11, color: accent }}>{'★'.repeat(Math.max(0, Math.min(5, r.rating)))}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: textSecondary, lineHeight: 1.6 }}>{r.texto}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── PASO: BARBERO ── */}
      {step === 'barbero' && hasBarbers && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={section}>
            <div style={pageTitle}>Elegí tu barbero</div>
            <div style={pageSub}>Seleccioná con quién querés atenderte</div>
            {barbers.map((b) => (
              <div key={b.id} style={barberCard(barber?.id === b.id)} onClick={() => setBarber(b)}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: surface2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: textSecondary, flexShrink: 0 }}>👤</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: textPrimary }}>{b.nombre}</div>
                  {b.rol && <div style={{ fontSize: 11, color: textSecondary, marginTop: 2 }}>{b.rol}</div>}
                  {b.rating != null && <div style={{ fontSize: 11, color: accent, marginTop: 4 }}>{'★'.repeat(5)} {b.rating}</div>}
                </div>
                {barber?.id === b.id && <div style={{ fontSize: 16, color: accent }}>✓</div>}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 'auto', padding: '20px', display: 'flex', gap: 8 }}>
            <button style={btnSecondary} onClick={goPrev}>← Atrás</button>
            <button style={{ ...btnPrimary, flex: 2, opacity: barber ? 1 : 0.4 }} onClick={() => barber && goNext()}>Siguiente →</button>
          </div>
        </div>
      )}

      {/* ── PASO: FECHA Y HORA ── */}
      {step === 'fecha' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={section}>
            <div style={pageTitle}>Fecha y hora</div>
            <div style={{ ...pageSub, display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} disabled={isCurrMonth}
                style={{ background: 'transparent', border: 'none', color: textPrimary, cursor: isCurrMonth ? 'default' : 'pointer', opacity: isCurrMonth ? 0.25 : 1, fontSize: 14 }}>‹</button>
              <span style={{ minWidth: 70, textAlign: 'center' }}>{MONTHS[month]} {year}</span>
              <button onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}
                style={{ background: 'transparent', border: 'none', color: textPrimary, cursor: 'pointer', fontSize: 14 }}>›</button>
            </div>

            {/* calendario */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
              {DAYS_SHORT.map((d) => <div key={d} style={{ fontSize: 10, textAlign: 'center', color: textMuted, padding: '4px 0' }}>{d}</div>)}
              {calDays.map((date, i) => {
                if (!date) return <div key={`e${i}`} />;
                const past = date < startOfToday;
                const isToday = sameDay(date, today);
                const sel = sameDay(date, day);
                return (
                  <div key={date.toISOString()} style={calDayStyle(past, isToday, sel)}
                    onClick={() => { if (!past) { setDay(date); setTime(null); } }}>
                    {date.getDate()}
                  </div>
                );
              })}
            </div>

            {/* horarios */}
            <div style={{ marginTop: 20, marginBottom: 6 }}>
              <div style={{ ...sectionTitle, marginBottom: 10 }}>Horarios disponibles</div>
              {!day ? (
                <div style={{ fontSize: 12, color: textSecondary, padding: '1.5rem 0', textAlign: 'center' }}>Seleccioná un día primero</div>
              ) : slotsLoading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
                  {Array.from({ length: 9 }).map((_, i) => <div key={i} style={{ height: 36, borderRadius: 8, background: surface }} />)}
                </div>
              ) : slots.length === 0 ? (
                <div style={{ fontSize: 12, color: textSecondary, padding: '1.5rem 0', textAlign: 'center' }}>Sin horarios disponibles este día</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
                  {slots.map((slot) => {
                    const taken = !slot.available;
                    const sel = time === slot.timeValue;
                    return (
                      <div key={slot.timeValue} style={timeSlotStyle(taken, sel)} onClick={() => !taken && setTime(slot.timeValue)}>
                        {slot.timeValue}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div style={{ padding: '20px', display: 'flex', gap: 8 }}>
            <button style={btnSecondary} onClick={goPrev}>← Atrás</button>
            <button style={{ ...btnPrimary, flex: 2, opacity: day && time ? 1 : 0.4, cursor: day && time ? 'pointer' : 'default' }}
              onClick={() => { if (day && time) goNext(); }}>Siguiente →</button>
          </div>
        </div>
      )}

      {/* ── PASO: CONFIRMACIÓN ── */}
      {step === 'confirmar' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={section}>
            <div style={pageTitle}>Confirmá tu turno</div>
            <div style={pageSub}>Completá tus datos para reservar</div>

            {/* resumen */}
            <div style={{ background: surface, border: `0.5px solid ${border}`, borderRadius: 12, padding: '14px', marginBottom: 20 }}>
              {([
                ['Servicio', service?.name ?? '—'],
                ...(hasBarbers && barber ? [['Barbero', barber.nombre]] : []),
                ['Precio', service ? fmt(service.price) : '—'],
                ['Fecha', summaryDate],
                ['Hora', time ?? '—'],
                ...(exigeSena ? [[`Seña (${tenant.porcentaje_sena}%)`, fmt(montoAPagar)]] : []),
              ] as [string, string][]).map(([l, v], i, arr) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < arr.length - 1 ? `0.5px solid ${border}` : 'none' }}>
                  <span style={{ fontSize: 12, color: textSecondary }}>{l}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: accent }}>{v}</span>
                </div>
              ))}
            </div>

            {/* formulario */}
            <input style={input} placeholder="Nombre y apellido *" value={name} onChange={(e) => setName(e.target.value)} />
            <input style={input} placeholder="Celular / WhatsApp *" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <input style={input} placeholder="Email *" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />

            {/* método de pago */}
            <div style={{ ...sectionTitle, marginTop: 8, marginBottom: 8 }}>Método de pago</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
              {([
                { id: 'mercadopago', label: '💳 MercadoPago', show: true },
                { id: 'efectivo', label: '💵 Efectivo / Transferencia', show: tenant.permite_efectivo },
              ] as { id: PaymentMethod; label: string; show: boolean }[]).filter((p) => p.show).map((p) => {
                const sel = payMethod === p.id;
                return (
                  <button key={p.id} onClick={() => setPayMethod(p.id)} style={{
                    flex: 1, padding: '11px 6px', fontSize: 12, cursor: 'pointer', borderRadius: 10,
                    background: sel ? accent : surface, color: sel ? bg : textSecondary,
                    border: `0.5px solid ${sel ? accent : border}`,
                  }}>{p.label}</button>
                );
              })}
            </div>

            {/* Datos para transferencia / efectivo */}
            {payMethod === 'efectivo' && (
              <div style={{ marginTop: 8, fontSize: 12, color: textSecondary, background: surface, border: `0.5px solid ${border}`, borderRadius: 10, padding: '10px 12px', lineHeight: 1.5 }}>
                {tenant.alias_pago ? (
                  <>Coordiná el pago en efectivo en el local, o por transferencia al alias:{' '}
                  <strong style={{ color: accent }}>{tenant.alias_pago}</strong></>
                ) : (
                  <>Coordinás el pago en efectivo o por transferencia directamente con el local.</>
                )}
              </div>
            )}

            {error && <div style={{ marginTop: 12, fontSize: 12, color: '#ff6b6b', background: 'rgba(255,107,107,0.08)', border: '0.5px solid rgba(255,107,107,0.2)', borderRadius: 10, padding: '10px 12px' }}>{error}</div>}
          </div>

          <div style={{ padding: '20px', display: 'flex', gap: 8 }}>
            <button style={btnSecondary} onClick={goPrev} disabled={status === 'loading'}>← Atrás</button>
            <button
              style={{ ...btnPrimary, flex: 2, opacity: status === 'loading' ? 0.6 : 1, cursor: status === 'loading' ? 'default' : 'pointer' }}
              onClick={handleConfirm} disabled={status === 'loading'}>
              {status === 'loading' ? 'Confirmando…' : `Confirmar turno · ${fmt(montoAPagar)}`}
            </button>
          </div>
        </div>
      )}

      {/* FOOTER */}
      {footer}
    </div>
    </Shell>
  );
}
