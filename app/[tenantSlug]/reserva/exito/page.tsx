import { CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { getTenantBySlug } from '@/lib/tenant';
import { getBookingTheme } from '@/lib/booking-theme';
import { supabase } from '@/lib/supabase';

interface Props {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ payment_id?: string; external_reference?: string; status?: string }>;
}

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const WEEKDAYS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
// Argentina es UTC-3 (sin horario de verano). fecha_hora se guarda como instante
// UTC, así que convertimos a hora argentina antes de mostrar.
const AR_OFFSET_MS = -3 * 60 * 60 * 1000;

function formatPrice(amount: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(amount);
}
function formatDate(iso: string) {
  const ar = new Date(new Date(iso).getTime() + AR_OFFSET_MS);
  return `${WEEKDAYS[ar.getUTCDay()]}, ${ar.getUTCDate()} de ${MONTHS[ar.getUTCMonth()]}`;
}
function formatTime(iso: string) {
  const ar = new Date(new Date(iso).getTime() + AR_OFFSET_MS);
  const h = ar.getUTCHours();
  const m = ar.getUTCMinutes().toString().padStart(2, '0');
  const ampm = h < 12 ? 'AM' : 'PM';
  return `${h % 12 || 12}:${m} ${ampm}`;
}

// Datos de la reserva necesarios para armar el mensaje de WhatsApp, resueltos
// desde la base a partir del pagoId (viene en external_reference desde MercadoPago).
async function getReserva(pagoId: string) {
  const { data: turnos } = await supabase
    .from('turnos')
    .select('fecha_hora, clientes(nombre), servicios(nombre), profesionales(nombre)')
    .eq('pago_id', pagoId)
    .order('fecha_hora');

  if (!turnos || turnos.length === 0) return null;

  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);
  type Row = {
    fecha_hora: string;
    clientes: { nombre: string } | { nombre: string }[] | null;
    servicios: { nombre: string } | { nombre: string }[] | null;
    profesionales: { nombre: string } | { nombre: string }[] | null;
  };
  const rows = turnos as unknown as Row[];

  const { data: pago } = await supabase
    .from('pagos').select('monto, tipo').eq('id', pagoId).single();

  return {
    clienteNombre: one(rows[0].clientes)?.nombre ?? '',
    fechaHora: rows[0].fecha_hora,
    servicios: rows.map((t) => one(t.servicios)?.nombre).filter(Boolean) as string[],
    profesionalNombre: one(rows[0].profesionales)?.nombre ?? null,
    monto: Number(pago?.monto ?? 0),
    tipo: (pago?.tipo === 'sena' ? 'sena' : 'total') as 'sena' | 'total',
  };
}

export default async function ReservaExitoPage({ params, searchParams }: Props) {
  const { tenantSlug } = await params;
  const { external_reference } = await searchParams;

  const tenant = await getTenantBySlug(tenantSlug);
  const T = getBookingTheme(tenant?.tipo_negocio, tenant?.color_primario, tenant?.color_acento);
  const isBarberia = tenant?.tipo_negocio === 'barberia';
  const accentColor = T.accent;

  const reserva = external_reference ? await getReserva(external_reference) : null;

  // Mensaje de WhatsApp para finalizar (igual que en la pantalla de confirmación).
  const wppPhone = tenant?.telefono?.replace(/\D/g, '') ?? '';
  const emoji = isBarberia ? '✂️' : '💅';
  let wppUrl = wppPhone ? `https://wa.me/${wppPhone}` : 'https://wa.me/';
  if (reserva) {
    const serviciosTexto = reserva.servicios.map((s) => `• ${s}`).join('\n');
    const msg = encodeURIComponent(
      `¡Hola! Acabo de reservar un turno ${emoji}\n\n` +
      `👤 *${reserva.clienteNombre}*\n` +
      `📅 *Fecha:* ${formatDate(reserva.fechaHora)}\n` +
      `🕐 *Horario:* ${formatTime(reserva.fechaHora)}\n` +
      (reserva.profesionalNombre ? `${emoji === '✂️' ? '💈' : '💇'} *Profesional:* ${reserva.profesionalNombre}\n` : '') +
      `✨ *Servicios:*\n${serviciosTexto}\n` +
      `💰 *${reserva.tipo === 'sena' ? 'Seña' : 'Total'}:* ${formatPrice(reserva.monto)}\n\n¡Muchas gracias!`
    );
    wppUrl += `?text=${msg}`;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: T.bg }}>
      <div className="w-full max-w-sm text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ border: `1px solid ${accentColor}` }}>
          <CheckCircle className="w-7 h-7" style={{ color: accentColor }} strokeWidth={1.2} />
        </div>
        <h2 className="font-serif font-light text-3xl mb-2" style={{ color: T.text }}>¡Reserva confirmada!</h2>
        <div className="w-7 h-px mx-auto mb-4" style={{ backgroundColor: accentColor }} />
        <p className="font-serif italic text-sm mb-8" style={{ color: T.muted }}>
          {isBarberia ? 'Tu turno está agendado' : 'Tu experiencia de belleza está agendada'}
        </p>

        {reserva && (
          <div className="rounded-2xl p-5 mb-6 text-left space-y-3"
            style={{ backgroundColor: T.cardBg, border: `1px solid ${T.border}`, boxShadow: `0 2px 20px ${T.shadow}` }}>
            <div className="flex justify-between text-sm">
              <span style={{ color: T.muted }}>Fecha</span>
              <span className="font-medium" style={{ color: T.text }}>{formatDate(reserva.fechaHora)}</span>
            </div>
            <div className="h-px" style={{ backgroundColor: T.border }} />
            <div className="flex justify-between text-sm">
              <span style={{ color: T.muted }}>Horario</span>
              <span className="font-medium" style={{ color: T.text }}>{formatTime(reserva.fechaHora)}</span>
            </div>
            <div className="h-px" style={{ backgroundColor: T.border }} />
            <div className="flex justify-between text-sm">
              <span style={{ color: T.muted }}>{reserva.tipo === 'sena' ? 'Seña abonada' : 'Total'}</span>
              <span className="font-medium" style={{ color: accentColor }}>{formatPrice(reserva.monto)}</span>
            </div>
          </div>
        )}

        <a href={wppUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-4 font-sans font-medium text-sm mb-4 transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#25D366', color: '#FFFFFF', borderRadius: '9999px', boxShadow: '0 4px 16px rgba(37,211,102,0.3)' }}>
          {/* Ícono de WhatsApp inline para no depender de assets externos */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.535-.928zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.767.967-.94 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.074-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/>
          </svg>
          Finalizar por WhatsApp
        </a>

        <Link href={`/${tenantSlug}`} className="inline-block text-sm mt-2" style={{ color: T.muted }}>
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
