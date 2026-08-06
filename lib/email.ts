import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM = process.env.EMAIL_FROM ?? 'Reservas <noreply@tudominio.com>';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';

// El SDK de Resend no lanza excepción si el envío falla del lado de la API
// (devuelve { data, error } en vez de rechazar la promesa), así que lo
// logueamos acá para no perder errores silenciosos.
async function send(params: Parameters<NonNullable<typeof resend>['emails']['send']>[0]) {
  const res = await resend!.emails.send(params);
  if (res.error) console.error('[email] error al enviar:', res.error);
  return res;
}

// Todo dato que viene de un formulario público (nombre, notas, etc.) se
// interpola en HTML crudo — sin esto, alguien podría meter <img onerror=...>
// en el campo "nombre" al reservar y llegaría ejecutable en el mail que
// recibe la estética.
function esc(str: string): string {
  return str.replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string
  ));
}

// ── Templates ───────────────────────────────────────────────────────────────

function baseTemplate(content: string) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  body{margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}
  .wrapper{max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 8px rgba(0,0,0,.08);}
  .brand{padding:20px 32px 0;text-align:center;}
  .header{background:#7c3aed;padding:28px 32px;text-align:center;}
  .header h1{margin:0;color:#fff;font-size:20px;font-weight:700;}
  .header p{margin:4px 0 0;color:#ddd6fe;font-size:13px;}
  .body{padding:28px 32px;}
  .card{background:#f8f7ff;border-radius:12px;padding:16px 20px;margin:16px 0;}
  .btn{display:block;background:#7c3aed;color:#fff;text-decoration:none;text-align:center;padding:14px 24px;border-radius:10px;font-weight:600;font-size:14px;margin-top:20px;}
  .footer{padding:16px 32px;text-align:center;color:#9ca3af;font-size:12px;border-top:1px solid #f3f4f6;}
</style>
</head>
<body>
<div class="wrapper">
<div class="brand"><img src="${BASE_URL}/turfull-logo-transparent.png" alt="Turfull" height="28" style="height:28px;width:auto;"/></div>
${content}
</div>
</body>
</html>`;
}

// Tabla de label/valor usada en las tarjetas de los emails. Los clientes de
// mail (Gmail incluido) no soportan flexbox de forma confiable, así que el
// alineado label/valor se resuelve con una tabla en vez de divs con flex.
function card(rows: [string, string][]) {
  const trs = rows.map(([label, value], i) => {
    const border = i === rows.length - 1 ? '' : 'border-bottom:1px solid #ede9fe;';
    return `<tr>
        <td style="padding:6px 0;${border}color:#6b7280;font-size:13px;">${esc(label)}:</td>
        <td style="padding:6px 0;${border}color:#111827;font-size:13px;font-weight:600;text-align:right;">${esc(value)}</td>
      </tr>`;
  }).join('');
  return `<div class="card"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${trs}</table></div>`;
}

interface ReservaData {
  tenantNombre: string;
  clienteNombre: string;
  servicios: string[];
  fecha: string;
  hora: string;
  monto: number;
  tipo: 'total' | 'sena';
  metodo: string;
  turnoId: string;
}

// Email al CLIENTE al confirmar su reserva
export async function enviarConfirmacionCliente(to: string, data: ReservaData) {
  if (!resend) return;
  // Efectivo/transferencia no tienen cobro online: nadie verificó que ese monto
  // se haya recibido, así que no podemos decir "pagado". Solo MercadoPago llega
  // acá con el pago ya acreditado (ver reservar/route.ts y webhooks/mercadopago).
  const abonado = data.metodo === 'mercadopago';
  const importeLabel = data.tipo === 'sena'
    ? (abonado ? 'Seña pagada' : 'Seña a abonar')
    : (abonado ? 'Total pagado' : 'Total a abonar');
  const montoStr = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(data.monto);

  const html = baseTemplate(`
    <div class="header">
      <h1>¡Reserva confirmada! 🎉</h1>
      <p>${esc(data.tenantNombre)}</p>
    </div>
    <div class="body">
      <p style="color:#374151;font-size:15px;">Hola <strong>${esc(data.clienteNombre)}</strong>, tu turno quedó reservado. Acá están los detalles:</p>
      ${card([
        ['Servicio', data.servicios.join(', ')],
        ['Fecha', data.fecha],
        ['Horario', `${data.hora} hs`],
        [importeLabel, montoStr],
        ['Método', data.metodo],
      ])}
      <p style="color:#374151;font-size:14px;">Te recordaremos 24 horas antes de tu turno. Si necesitás cancelar o modificar, contactate directamente con la estética.</p>
    </div>
    <div class="footer">Este email fue enviado porque realizaste una reserva en ${esc(data.tenantNombre)}.</div>
  `);

  return send({
    from: FROM,
    to,
    subject: `✅ Turno confirmado — ${data.tenantNombre}`,
    html,
  });
}

// Email al ADMIN de la estética cuando entra una reserva nueva
export async function enviarNotificacionAdmin(to: string, data: ReservaData) {
  if (!resend) return;
  const montoStr = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(data.monto);

  const html = baseTemplate(`
    <div class="header">
      <h1>Nueva reserva 📅</h1>
      <p>${esc(data.tenantNombre)}</p>
    </div>
    <div class="body">
      <p style="color:#374151;font-size:15px;">Recibiste una nueva reserva:</p>
      ${card([
        ['Cliente', data.clienteNombre],
        ['Servicio', data.servicios.join(', ')],
        ['Fecha', data.fecha],
        ['Horario', `${data.hora} hs`],
        ['Monto', `${montoStr} (${data.tipo === 'sena' ? 'seña' : 'total'})`],
      ])}
    </div>
    <div class="footer">Panel admin: ${process.env.NEXT_PUBLIC_BASE_URL}/admin/${data.turnoId}</div>
  `);

  return send({
    from: FROM,
    to,
    subject: `📅 Nueva reserva — ${data.clienteNombre}`,
    html,
  });
}

// Email de RECORDATORIO 24hs antes
export async function enviarRecordatorio(to: string, data: {
  clienteNombre: string;
  tenantNombre: string;
  servicios: string[];
  fecha: string;
  hora: string;
}) {
  if (!resend) return;
  const html = baseTemplate(`
    <div class="header">
      <h1>Recordatorio de turno ⏰</h1>
      <p>${esc(data.tenantNombre)}</p>
    </div>
    <div class="body">
      <p style="color:#374151;font-size:15px;">Hola <strong>${esc(data.clienteNombre)}</strong>, te recordamos que mañana tenés turno:</p>
      ${card([
        ['Servicio', data.servicios.join(', ')],
        ['Fecha', data.fecha],
        ['Horario', `${data.hora} hs`],
      ])}
      <p style="color:#374151;font-size:14px;">¡Te esperamos! Si necesitás cancelar, avisanos con anticipación.</p>
    </div>
    <div class="footer">${esc(data.tenantNombre)}</div>
  `);

  return send({
    from: FROM,
    to,
    subject: `⏰ Recordatorio: turno mañana en ${data.tenantNombre}`,
    html,
  });
}

// Email de RECORDATORIO 2hs antes
export async function enviarRecordatorio2h(to: string, data: {
  clienteNombre: string;
  tenantNombre: string;
  servicios: string[];
  fecha: string;
  hora: string;
}) {
  if (!resend) return;
  const html = baseTemplate(`
    <div class="header">
      <h1>¡Tu turno es en 2 horas! ⏰</h1>
      <p>${esc(data.tenantNombre)}</p>
    </div>
    <div class="body">
      <p style="color:#374151;font-size:15px;">Hola <strong>${esc(data.clienteNombre)}</strong>, te recordamos que en <strong>2 horas</strong> tenés tu turno:</p>
      ${card([
        ['Servicio', data.servicios.join(', ')],
        ['Fecha', data.fecha],
        ['Horario', `${data.hora} hs`],
      ])}
      <p style="color:#374151;font-size:14px;">¡Te esperamos! Si necesitás cancelar, avisanos con anticipación.</p>
    </div>
    <div class="footer">${esc(data.tenantNombre)}</div>
  `);

  return send({
    from: FROM,
    to,
    subject: `⏰ ¡Tu turno es en 2 horas! — ${data.tenantNombre}`,
    html,
  });
}

// Email de CONTACTO desde la landing — lead nuevo
export async function enviarContacto(data: {
  nombre: string;
  email: string;
  telefono: string;
  estetica: string;
}) {
  if (!resend) return;
  const html = baseTemplate(`
    <div class="header">
      <h1>Nuevo lead 🌸</h1>
      <p>Alguien completó el formulario de contacto</p>
    </div>
    <div class="body">
      ${card([
        ['Nombre', data.nombre],
        ['Email', data.email],
        ['Teléfono', data.telefono || '—'],
        ['Estética', data.estetica || '—'],
      ])}
    </div>
    <div class="footer">Turfull — Panel de contactos</div>
  `);

  const to = process.env.CONTACT_EMAIL ?? process.env.EMAIL_FROM ?? 'admin@tudominio.com';

  return send({
    from: FROM,
    to,
    subject: `🌸 Nuevo lead: ${data.nombre} (${data.estetica || 'sin estética'})`,
    html,
  });
}

// Email de BIENVENIDA al registrar una nueva estética
export async function enviarBienvenida(to: string, data: {
  adminNombre: string;
  tenantNombre: string;
  tenantSlug: string;
}) {
  if (!resend) return;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';

  const html = baseTemplate(`
    <div class="header">
      <h1>¡Bienvenida a la plataforma! 🌸</h1>
      <p>Tu estética está lista</p>
    </div>
    <div class="body">
      <p style="color:#374151;font-size:15px;">Hola <strong>${esc(data.adminNombre)}</strong>, tu cuenta en la plataforma fue creada con éxito.</p>
      ${card([
        ['Estética', data.tenantNombre],
        ['URL pública', `${baseUrl}/${data.tenantSlug}`],
        ['Email admin', to],
      ])}
      <a href="${baseUrl}/admin/login" class="btn">Ingresar al panel admin →</a>
      <p style="color:#6b7280;font-size:12px;margin-top:16px;">Ingresá con el email de esta estética y la contraseña que elegiste al registrarte.</p>
    </div>
    <div class="footer">Plataforma de reservas para estéticas.</div>
  `);

  return send({
    from: FROM,
    to,
    subject: `🌸 ¡Bienvenida! Tu estética "${data.tenantNombre}" está activa`,
    html,
  });
}
