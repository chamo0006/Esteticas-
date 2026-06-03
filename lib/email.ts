import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.EMAIL_FROM ?? 'Reservas <noreply@tudominio.com>';

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
  .header{background:#7c3aed;padding:28px 32px;text-align:center;}
  .header h1{margin:0;color:#fff;font-size:20px;font-weight:700;}
  .header p{margin:4px 0 0;color:#ddd6fe;font-size:13px;}
  .body{padding:28px 32px;}
  .card{background:#f8f7ff;border-radius:12px;padding:16px 20px;margin:16px 0;}
  .row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #ede9fe;}
  .row:last-child{border-bottom:none;}
  .label{color:#6b7280;font-size:13px;}
  .value{color:#111827;font-size:13px;font-weight:600;text-align:right;}
  .btn{display:block;background:#7c3aed;color:#fff;text-decoration:none;text-align:center;padding:14px 24px;border-radius:10px;font-weight:600;font-size:14px;margin-top:20px;}
  .footer{padding:16px 32px;text-align:center;color:#9ca3af;font-size:12px;border-top:1px solid #f3f4f6;}
</style>
</head>
<body>
<div class="wrapper">
${content}
</div>
</body>
</html>`;
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
  const importeLabel = data.tipo === 'sena' ? 'Seña pagada' : 'Total pagado';
  const montoStr = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(data.monto);

  const html = baseTemplate(`
    <div class="header">
      <h1>¡Reserva confirmada! 🎉</h1>
      <p>${data.tenantNombre}</p>
    </div>
    <div class="body">
      <p style="color:#374151;font-size:15px;">Hola <strong>${data.clienteNombre}</strong>, tu turno quedó reservado. Acá están los detalles:</p>
      <div class="card">
        <div class="row"><span class="label">Servicio</span><span class="value">${data.servicios.join(', ')}</span></div>
        <div class="row"><span class="label">Fecha</span><span class="value">${data.fecha}</span></div>
        <div class="row"><span class="label">Horario</span><span class="value">${data.hora} hs</span></div>
        <div class="row"><span class="label">${importeLabel}</span><span class="value">${montoStr}</span></div>
        <div class="row"><span class="label">Método</span><span class="value">${data.metodo}</span></div>
      </div>
      <p style="color:#6b7280;font-size:13px;">ID de reserva: <code style="font-family:monospace;">${data.turnoId.slice(0, 8)}</code></p>
      <p style="color:#374151;font-size:14px;">Te recordaremos 24 horas antes de tu turno. Si necesitás cancelar o modificar, contactate directamente con la estética.</p>
    </div>
    <div class="footer">Este email fue enviado porque realizaste una reserva en ${data.tenantNombre}.</div>
  `);

  return resend.emails.send({
    from: FROM,
    to,
    subject: `✅ Turno confirmado — ${data.tenantNombre}`,
    html,
  });
}

// Email al ADMIN de la estética cuando entra una reserva nueva
export async function enviarNotificacionAdmin(to: string, data: ReservaData) {
  const montoStr = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(data.monto);

  const html = baseTemplate(`
    <div class="header">
      <h1>Nueva reserva 📅</h1>
      <p>${data.tenantNombre}</p>
    </div>
    <div class="body">
      <p style="color:#374151;font-size:15px;">Recibiste una nueva reserva:</p>
      <div class="card">
        <div class="row"><span class="label">Cliente</span><span class="value">${data.clienteNombre}</span></div>
        <div class="row"><span class="label">Servicio</span><span class="value">${data.servicios.join(', ')}</span></div>
        <div class="row"><span class="label">Fecha</span><span class="value">${data.fecha}</span></div>
        <div class="row"><span class="label">Horario</span><span class="value">${data.hora} hs</span></div>
        <div class="row"><span class="label">Monto</span><span class="value">${montoStr} (${data.tipo === 'sena' ? 'seña' : 'total'})</span></div>
      </div>
    </div>
    <div class="footer">Panel admin: ${process.env.NEXT_PUBLIC_BASE_URL}/admin/${data.turnoId}</div>
  `);

  return resend.emails.send({
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
  const html = baseTemplate(`
    <div class="header">
      <h1>Recordatorio de turno ⏰</h1>
      <p>${data.tenantNombre}</p>
    </div>
    <div class="body">
      <p style="color:#374151;font-size:15px;">Hola <strong>${data.clienteNombre}</strong>, te recordamos que mañana tenés turno:</p>
      <div class="card">
        <div class="row"><span class="label">Servicio</span><span class="value">${data.servicios.join(', ')}</span></div>
        <div class="row"><span class="label">Fecha</span><span class="value">${data.fecha}</span></div>
        <div class="row"><span class="label">Horario</span><span class="value">${data.hora} hs</span></div>
      </div>
      <p style="color:#374151;font-size:14px;">¡Te esperamos! Si necesitás cancelar, avisanos con anticipación.</p>
    </div>
    <div class="footer">${data.tenantNombre}</div>
  `);

  return resend.emails.send({
    from: FROM,
    to,
    subject: `⏰ Recordatorio: turno mañana en ${data.tenantNombre}`,
    html,
  });
}

// Email de BIENVENIDA al registrar una nueva estética
export async function enviarBienvenida(to: string, data: {
  adminNombre: string;
  tenantNombre: string;
  tenantSlug: string;
  password: string;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';

  const html = baseTemplate(`
    <div class="header">
      <h1>¡Bienvenida a la plataforma! 🌸</h1>
      <p>Tu estética está lista</p>
    </div>
    <div class="body">
      <p style="color:#374151;font-size:15px;">Hola <strong>${data.adminNombre}</strong>, tu cuenta en la plataforma fue creada con éxito.</p>
      <div class="card">
        <div class="row"><span class="label">Estética</span><span class="value">${data.tenantNombre}</span></div>
        <div class="row"><span class="label">URL pública</span><span class="value">${baseUrl}/${data.tenantSlug}</span></div>
        <div class="row"><span class="label">Email admin</span><span class="value">${to}</span></div>
        <div class="row"><span class="label">Contraseña temporal</span><span class="value">${data.password}</span></div>
      </div>
      <a href="${baseUrl}/admin/login" class="btn">Ingresar al panel admin →</a>
      <p style="color:#6b7280;font-size:12px;margin-top:16px;">Por seguridad, cambiá tu contraseña la primera vez que ingreses.</p>
    </div>
    <div class="footer">Plataforma de reservas para estéticas.</div>
  `);

  return resend.emails.send({
    from: FROM,
    to,
    subject: `🌸 ¡Bienvenida! Tu estética "${data.tenantNombre}" está activa`,
    html,
  });
}
