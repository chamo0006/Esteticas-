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

interface Props {
  tenant: TenantConfig;
  services: Service[];
  barbers: Barber[];
  reviews: Review[];
  stats: BarberiaStats;
}

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

type PaymentMethod = 'mercadopago' | 'efectivo' | 'transferencia';
type Status = 'idle' | 'loading' | 'success' | 'error';

const fmtPrice = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n);

const parseDur = (d: string) => {
  const m = parseInt(d, 10);
  return isNaN(m) ? 60 : m;
};

const fmtApiDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const iniciales = (nombre: string) =>
  nombre.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');

export function BarberiaClient({ tenant, services, barbers, reviews, stats }: Props) {
  const today = new Date();

  const [selectedService, setSelectedService] = useState<Service | null>(services[0] ?? null);
  const [selectedDay, setSelectedDay]   = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const [slots, setSlots]               = useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [clientName, setClientName]   = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>(tenant.permite_efectivo ? 'efectivo' : 'mercadopago');

  const [status, setStatus] = useState<Status>('idle');
  const [error, setError]   = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const duracion = selectedService ? parseDur(selectedService.duration) : 60;

  // ── Disponibilidad real desde la API ──────────────────────────────────────
  useEffect(() => {
    if (!selectedDay) { setSlots([]); return; }
    const fecha = fmtApiDate(selectedDay);
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    setSlotsLoading(true);
    setSlots([]);
    setSelectedTime(null);
    fetch(`/api/${tenant.slug}/disponibilidad?fecha=${fecha}&duracion=${duracion}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d: TimeSlot[]) => setSlots(Array.isArray(d) ? d : []))
      .catch(() => setSlots([]))
      .finally(() => { clearTimeout(t); setSlotsLoading(false); });
    return () => { ctrl.abort(); clearTimeout(t); };
  }, [selectedDay, duracion, tenant.slug]);

  // ── Calendario del mes actual ─────────────────────────────────────────────
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

  const summaryDate = selectedDay ? `${selectedDay.getDate()} ${MONTHS[selectedDay.getMonth()]}` : '—';

  // ── Total / seña ──────────────────────────────────────────────────────────
  const total = selectedService?.price ?? 0;
  const exigeSena = tenant.exige_sena && tenant.porcentaje_sena ? true : false;
  const montoAPagar = exigeSena
    ? Math.round((total * (tenant.porcentaje_sena ?? 0)) / 100 * 100) / 100
    : total;

  // ── Tags del hero: derivados de las categorías de servicios ───────────────
  const tags = useMemo(() => {
    const labels: Record<string, string> = {
      corte: 'Cortes', cortes: 'Cortes', barba: 'Barba',
      combo: 'Combos', combos: 'Combos', general: 'Servicios',
    };
    const set = new Set<string>();
    services.forEach((s) => set.add(labels[s.category.toLowerCase()] ?? s.category));
    return Array.from(set).slice(0, 5);
  }, [services]);

  const wppDigits = tenant.telefono?.replace(/\D/g, '') ?? '';
  const wppUrl = wppDigits ? `https://wa.me/${wppDigits}` : undefined;

  function scrollToCal() {
    document.getElementById('cal-section')?.scrollIntoView({ behavior: 'smooth' });
  }

  function handleConfirm() {
    if (!selectedService) { alert('Elegí un servicio primero.'); return; }
    if (!selectedDay || !selectedTime) {
      alert('Por favor elegí una fecha y un horario antes de confirmar.');
      scrollToCal();
      return;
    }
    setError(null);
    setShowModal(true);
  }

  async function handleFinalConfirm() {
    const nameParts = clientName.trim().split(/\s+/);
    if (nameParts.length < 2) {
      setError('Ingresá tu nombre y apellido.');
      return;
    }
    const phoneDigits = clientPhone.replace(/\D/g, '');
    if (phoneDigits.length < 6) {
      setError('Ingresá un celular válido.');
      return;
    }
    if (!clientEmail.includes('@')) {
      setError('Ingresá un email válido.');
      return;
    }
    if (!selectedService || !selectedDay || !selectedTime) return;

    setStatus('loading');
    setError(null);

    const nombre   = nameParts[0];
    const apellido = nameParts.slice(1).join(' ');

    const y = selectedDay.getFullYear();
    const m = String(selectedDay.getMonth() + 1).padStart(2, '0');
    const d = String(selectedDay.getDate()).padStart(2, '0');
    const off = new Date().getTimezoneOffset();
    const sign = off <= 0 ? '+' : '-';
    const tzH = String(Math.floor(Math.abs(off) / 60)).padStart(2, '0');
    const tzM = String(Math.abs(off) % 60).padStart(2, '0');
    const fechaHora = `${y}-${m}-${d}T${selectedTime}:00${sign}${tzH}:${tzM}`;

    try {
      const res = await fetch(`/api/${tenant.slug}/reservar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          servicioIds: [selectedService.id],
          fechaHora,
          cliente: { nombre, apellido, email: clientEmail.trim(), telefono: clientPhone.trim() },
          metodoPago: payMethod,
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
            clienteEmail: clientEmail.trim(),
            items: [{ name: selectedService.name }],
          }),
        });
        if (mp.ok) {
          const mpD = await mp.json();
          window.location.href =
            process.env.NODE_ENV === 'production' ? mpD.initPoint : (mpD.sandboxInitPoint ?? mpD.initPoint);
          return;
        }
      }

      setShowModal(false);
      setConfirmed(true);
      setStatus('success');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
      setStatus('error');
    }
  }

  const payOptions: { id: PaymentMethod; label: string; icon: string; show: boolean }[] = [
    { id: 'mercadopago',   label: 'Mercado Pago', icon: '💳', show: true },
    { id: 'efectivo',      label: 'Efectivo',      icon: '💵', show: tenant.permite_efectivo },
    { id: 'transferencia', label: 'Transferencia', icon: '🏦', show: true },
  ];

  const brand = tenant.nombre || 'Barbería';

  return (
    <div style={{ fontFamily: 'sans-serif', color: '#111', background: '#fff' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 860px) {
          .bz-split, .bz-cal { grid-template-columns: 1fr !important; }
          .bz-summary { flex-direction: column !important; align-items: stretch !important; }
          .bz-summary-fields { flex-wrap: wrap !important; gap: 1rem !important; }
          .bz-nav-links { display: none !important; }
          .bz-barbers, .bz-reviews { grid-template-columns: 1fr !important; }
          .bz-stats { flex-wrap: wrap !important; gap: 1rem !important; }
          .bz-nav { padding: 12px 18px !important; }
          .bz-pad { padding: 1.25rem !important; }
        }
      ` }} />

      {/* NAV */}
      <nav className="bz-nav" style={{
        display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center',
        padding: '14px 32px', background: '#0a0a0a', borderBottom: '0.5px solid #1a1a1a',
      }}>
        <div style={{ fontSize: 15, fontWeight: 500, color: '#fff', letterSpacing: '0.04em' }}>✂ {brand}</div>
        <div className="bz-nav-links" style={{ display: 'flex', gap: 24 }}>
          {['Servicios', 'Barberos', 'Reservar', 'Contacto'].map((l) => (
            <span key={l} onClick={scrollToCal} style={{ fontSize: 12, color: '#555', cursor: 'pointer', letterSpacing: '0.04em' }}>{l}</span>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 11, background: '#1a1a1a', color: '#666', border: '0.5px solid #2a2a2a', borderRadius: 100, padding: '4px 12px' }}>● Abierto</span>
          <button onClick={scrollToCal} style={{ fontSize: 12, background: '#fff', color: '#0a0a0a', border: 'none', borderRadius: 6, padding: '6px 14px', fontWeight: 500, cursor: 'pointer' }}>
            Reservar turno
          </button>
        </div>
      </nav>

      {/* HERO SPLIT */}
      <div className="bz-split" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: 360 }}>
        {/* LEFT — dark */}
        <div className="bz-pad" style={{ background: '#0a0a0a', padding: '2.5rem 2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.14em', color: '#444', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
              Barbería · Reservá online
            </div>
            <div style={{ fontSize: 36, fontWeight: 400, color: '#fff', lineHeight: 1.1, marginBottom: '0.6rem' }}>
              Cortes<br /><span style={{ color: '#888' }}>con carácter</span>
            </div>
            <div style={{ fontSize: 13, color: '#4a4a4a', lineHeight: 1.7, marginBottom: '1.5rem' }}>
              Precisión, estilo y atención personalizada.<br />
              Reservá tu turno en menos de un minuto.
            </div>
            {tags.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {tags.map((tag) => (
                  <span key={tag} style={{ fontSize: 11, color: '#555', border: '0.5px solid #222', borderRadius: 100, padding: '4px 12px' }}>{tag}</span>
                ))}
              </div>
            )}
          </div>
          <div className="bz-stats" style={{ display: 'flex', gap: '1.5rem', paddingTop: '1.5rem', borderTop: '0.5px solid #1a1a1a' }}>
            {[
              ...(stats.rating ? [[`${stats.rating}★`, 'Rating']] : []),
              [String(stats.barberos), stats.barberos === 1 ? 'Barbero' : 'Barberos'],
              ...(stats.clientes ? [[`+${stats.clientes}`, 'Clientes']] : []),
            ].map(([v, l]) => (
              <div key={l}>
                <div style={{ fontSize: 20, fontWeight: 500, color: '#fff' }}>{v}</div>
                <div style={{ fontSize: 11, color: '#444', marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — light */}
        <div className="bz-pad" style={{ background: '#f7f5f1', padding: '2.5rem 2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#999', marginBottom: '1rem' }}>
              Elegí tu servicio
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {services.length === 0 && (
                <div style={{ fontSize: 13, color: '#999', padding: '2rem 0', textAlign: 'center' }}>No hay servicios disponibles</div>
              )}
              {services.map((svc) => {
                const active = selectedService?.id === svc.id;
                return (
                  <div key={svc.id} onClick={() => setSelectedService(svc)} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                    background: active ? '#0a0a0a' : '#fff',
                    border: active ? '0.5px solid #0a0a0a' : '0.5px solid #ece9e3',
                    transition: 'all 0.15s',
                  }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: active ? '#fff' : '#111' }}>{svc.name}</div>
                      <div style={{ fontSize: 11, color: active ? '#555' : '#aaa', marginTop: 2 }}>{svc.duration}</div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: active ? '#fff' : '#111' }}>{fmtPrice(svc.price)}</div>
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: '1.25rem' }}>
            <button onClick={scrollToCal} style={{ flex: 1, background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 8, padding: 13, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
              Elegir fecha y hora
            </button>
            {wppUrl && (
              <a href={wppUrl} target="_blank" rel="noopener noreferrer" style={{ background: '#fff', color: '#111', border: '0.5px solid #ddd', borderRadius: 8, padding: '13px 16px', fontSize: 13, cursor: 'pointer', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>📞</a>
            )}
          </div>
        </div>
      </div>

      {/* BARBEROS */}
      {barbers.length > 0 && (
        <div style={{ padding: '2rem', borderTop: '0.5px solid #eee' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.25rem' }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Nuestros barberos</div>
          </div>
          <div className="bz-barbers" style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(barbers.length, 3)}, 1fr)`, gap: 10 }}>
            {barbers.map((b, i) => (
              <div key={b.id} style={{ border: '0.5px solid #ece9e3', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
                <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, color: '#666', background: ['#f0ede8', '#e8edf0', '#ede8f0'][i % 3] }}>👤</div>
                <div style={{ padding: '10px 12px', borderTop: '0.5px solid #f0f0f0' }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{b.nombre}</div>
                  {b.rol && <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{b.rol}</div>}
                  {b.rating != null && <div style={{ fontSize: 11, marginTop: 5 }}>{'★'.repeat(5)} {b.rating}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CALENDARIO + HORARIOS */}
      <div id="cal-section" className="bz-cal" style={{ padding: '0 2rem 2rem', borderTop: '0.5px solid #eee', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Calendario */}
        <div style={{ paddingTop: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Elegí el día</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} disabled={isCurrMonth}
                style={{ background: 'transparent', border: 'none', cursor: isCurrMonth ? 'default' : 'pointer', opacity: isCurrMonth ? 0.25 : 1, fontSize: 16, color: '#111' }}>‹</button>
              <span style={{ fontSize: 12, color: '#666', minWidth: 70, textAlign: 'center' }}>{MONTHS[month]} {year}</span>
              <button onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 16, color: '#111' }}>›</button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
            {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map((d) => (
              <div key={d} style={{ fontSize: 10, textAlign: 'center', color: '#aaa', padding: '4px 0' }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
            {calDays.map((date, i) => {
              if (!date) return <div key={`e-${i}`} />;
              const isPast = date < startOfToday;
              const isToday = sameDay(date, today);
              const isSel = sameDay(date, selectedDay);
              return (
                <div key={date.toISOString()} onClick={() => !isPast && setSelectedDay(date)} style={{
                  fontSize: 12, textAlign: 'center', padding: '6px 2px', borderRadius: 6,
                  cursor: isPast ? 'default' : 'pointer',
                  opacity: isPast ? 0.3 : 1,
                  background: isSel ? '#0a0a0a' : isToday ? '#f0ede8' : 'transparent',
                  color: isSel ? '#fff' : '#444',
                  border: isToday && !isSel ? '0.5px solid #ccc' : 'none',
                }}>
                  {date.getDate()}
                </div>
              );
            })}
          </div>
        </div>

        {/* Horarios */}
        <div style={{ paddingTop: '1.5rem' }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: '1rem' }}>Elegí el horario</div>
          {!selectedDay ? (
            <div style={{ fontSize: 13, color: '#aaa', padding: '2rem 0', textAlign: 'center' }}>Seleccioná un día primero</div>
          ) : slotsLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} style={{ height: 34, borderRadius: 8, background: '#f3f1ec' }} />
              ))}
            </div>
          ) : slots.length === 0 ? (
            <div style={{ fontSize: 13, color: '#aaa', padding: '2rem 0', textAlign: 'center' }}>Sin horarios disponibles</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
              {slots.map((slot) => {
                const taken = !slot.available;
                const isSel = selectedTime === slot.timeValue;
                return (
                  <div key={slot.timeValue} onClick={() => !taken && setSelectedTime(slot.timeValue)} style={{
                    fontSize: 12, textAlign: 'center', padding: '8px 4px', borderRadius: 8,
                    cursor: taken ? 'default' : 'pointer',
                    background: isSel ? '#0a0a0a' : taken ? '#f7f5f1' : '#fff',
                    color: isSel ? '#fff' : taken ? '#ccc' : '#555',
                    border: isSel ? '0.5px solid #0a0a0a' : '0.5px solid #ece9e3',
                  }}>
                    {slot.timeValue}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RESUMEN */}
      <div className="bz-summary" style={{ background: '#0a0a0a', padding: '1.5rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <div className="bz-summary-fields" style={{ display: 'flex', gap: '2rem' }}>
          {[
            ['Servicio', selectedService?.name ?? '—'],
            ['Precio', selectedService ? fmtPrice(selectedService.price) : '—'],
            ['Fecha', summaryDate],
            ['Hora', selectedTime ?? '—'],
          ].map(([label, value]) => (
            <div key={label}>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#444', marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 15, fontWeight: 500, color: '#fff' }}>{value}</div>
            </div>
          ))}
        </div>
        <button onClick={handleConfirm} style={{ background: '#fff', color: '#0a0a0a', border: 'none', borderRadius: 8, padding: '12px 28px', fontSize: 13, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          Confirmar reserva →
        </button>
      </div>

      {/* RESEÑAS */}
      {reviews.length > 0 && (
        <div style={{ padding: '2rem', borderTop: '0.5px solid #eee' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.25rem' }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Qué dicen nuestros clientes</div>
            {stats.rating && <div style={{ fontSize: 12, color: '#888' }}>★ {stats.rating} · {stats.reseñas} reseñas</div>}
          </div>
          <div className="bz-reviews" style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(reviews.length, 3)}, minmax(0,1fr))`, gap: 10 }}>
            {reviews.slice(0, 3).map((r) => (
              <div key={r.id} style={{ border: '0.5px solid #ece9e3', borderRadius: 12, padding: 14, background: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#f0ede8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 500, color: '#666', flexShrink: 0 }}>{iniciales(r.nombre)}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{r.nombre}</div>
                    <div style={{ fontSize: 11 }}>{'★'.repeat(Math.max(0, Math.min(5, r.rating)))}</div>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#777', lineHeight: 1.6 }}>{r.texto}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FOOTER */}
      <div style={{ background: '#0a0a0a', padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '0.5px solid #111', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>✂ {brand}</div>
        <div style={{ display: 'flex', gap: 16 }}>
          {wppUrl && <a href={wppUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#888', cursor: 'pointer', textDecoration: 'none' }}>WhatsApp</a>}
        </div>
        <div style={{ fontSize: 11, color: '#333' }}>© {today.getFullYear()} {brand}</div>
      </div>

      {/* MODAL CONFIRMACIÓN */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '2rem', width: '100%', maxWidth: 420, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontSize: 16, fontWeight: 500, marginBottom: '0.25rem' }}>Completá tu reserva</div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: '1.5rem' }}>
              {selectedService?.name} · {selectedService ? fmtPrice(selectedService.price) : ''} · {summaryDate} · {selectedTime}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input type="text" placeholder="Nombre y apellido *" value={clientName} onChange={(e) => setClientName(e.target.value)}
                style={{ width: '100%', padding: '11px 14px', fontSize: 13, border: '0.5px solid #ddd', borderRadius: 8, outline: 'none' }} />
              <input type="tel" placeholder="Celular (WhatsApp) *" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)}
                style={{ width: '100%', padding: '11px 14px', fontSize: 13, border: '0.5px solid #ddd', borderRadius: 8, outline: 'none' }} />
              <input type="email" placeholder="Email *" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)}
                style={{ width: '100%', padding: '11px 14px', fontSize: 13, border: '0.5px solid #ddd', borderRadius: 8, outline: 'none' }} />
            </div>

            {/* Método de pago */}
            <div style={{ marginTop: '1.25rem' }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999', marginBottom: 8 }}>Método de pago</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {payOptions.filter((p) => p.show).map((p) => {
                  const sel = payMethod === p.id;
                  return (
                    <button key={p.id} onClick={() => setPayMethod(p.id)} style={{
                      flex: '1 1 0', minWidth: 90, padding: '9px 8px', fontSize: 12, cursor: 'pointer',
                      borderRadius: 8, background: sel ? '#0a0a0a' : '#fff', color: sel ? '#fff' : '#555',
                      border: sel ? '0.5px solid #0a0a0a' : '0.5px solid #ddd',
                    }}>{p.icon} {p.label}</button>
                  );
                })}
              </div>
              {exigeSena && (
                <div style={{ marginTop: 10, fontSize: 12, display: 'flex', justifyContent: 'space-between', background: '#f7f5f1', borderRadius: 8, padding: '10px 12px' }}>
                  <span style={{ color: '#888' }}>Seña ({tenant.porcentaje_sena}%) a pagar ahora</span>
                  <span style={{ fontWeight: 600 }}>{fmtPrice(montoAPagar)}</span>
                </div>
              )}
            </div>

            {error && (
              <div style={{ marginTop: 12, fontSize: 12, color: '#c0392b', background: '#fceae8', borderRadius: 8, padding: '8px 12px' }}>{error}</div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: '1.25rem' }}>
              <button onClick={() => { setShowModal(false); setError(null); }} disabled={status === 'loading'}
                style={{ flex: 1, background: '#f5f5f5', color: '#111', border: 'none', borderRadius: 8, padding: 12, fontSize: 13, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleFinalConfirm} disabled={status === 'loading'}
                style={{ flex: 2, background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 8, padding: 12, fontSize: 13, fontWeight: 500, cursor: status === 'loading' ? 'default' : 'pointer', opacity: status === 'loading' ? 0.7 : 1 }}>
                {status === 'loading' ? 'Confirmando…' : `Confirmar turno · ${fmtPrice(montoAPagar)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST CONFIRMADO */}
      {confirmed && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#0a0a0a', color: '#fff', borderRadius: 12, padding: '14px 24px', fontSize: 13, fontWeight: 500, zIndex: 50, display: 'flex', alignItems: 'center', gap: 10, maxWidth: '90vw' }}>
          <span style={{ color: '#4ade80', fontSize: 16 }}>✓</span>
          Turno confirmado para {summaryDate} a las {selectedTime}
        </div>
      )}
    </div>
  );
}
