import Link from 'next/link';

export const metadata = { title: 'Política de Privacidad — Turfull' };

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-6 py-5">
        <div className="max-w-3xl mx-auto flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/turfull-icon.png" alt="" className="w-7 h-7" />
          <Link href="/" className="font-semibold text-gray-900">Turfull</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 text-sm text-gray-600 leading-relaxed [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-gray-900 [&_h2]:mt-8 [&_h2]:mb-2 [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4 [&_ul]:space-y-1 [&_li]:pl-1 [&_strong]:text-gray-900 [&_strong]:font-semibold">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Política de Privacidad</h1>
        <p className="text-sm text-gray-400 mb-8">Última actualización: [completar fecha]</p>

        <p>
          Esta política explica qué datos personales recolecta Turfull, para qué los usa y qué
          derechos tenés sobre ellos, tanto si sos dueño/a de un Negocio como si reservás un
          turno como Cliente.
        </p>

        <h2>1. Responsable del tratamiento</h2>
        <p>
          [Razón social / nombre del titular], con domicilio en [domicilio a completar], es
          responsable de los datos personales tratados a través de Turfull.
        </p>

        <h2>2. Qué datos recolectamos</h2>
        <ul>
          <li><strong>De un Cliente que reserva un turno:</strong> nombre, apellido, email y teléfono.</li>
          <li><strong>De un Negocio que se registra:</strong> nombre del negocio, email, teléfono, nombre del administrador y los datos que carga en su panel (servicios, profesionales, horarios).</li>
          <li><strong>Datos de pago:</strong> Turfull no almacena números de tarjeta ni credenciales bancarias — esos datos los procesa directamente Mercado Pago bajo su propia política de privacidad.</li>
          <li><strong>Datos técnicos básicos:</strong> dirección IP, para limitar abuso de los formularios públicos (reserva, contacto, registro).</li>
        </ul>

        <h2>3. Para qué usamos los datos</h2>
        <ul>
          <li>Gestionar la reserva de un turno y comunicarla al Negocio correspondiente.</li>
          <li>Enviar confirmaciones y recordatorios por email sobre un turno reservado.</li>
          <li>Permitir el funcionamiento del panel administrativo de cada Negocio.</li>
          <li>Prevenir abuso (límites de intentos por IP en formularios públicos).</li>
        </ul>
        <p>No vendemos datos personales a terceros.</p>

        <h2>4. Con quién compartimos datos</h2>
        <p>Para poder funcionar, la Plataforma usa estos proveedores externos, que procesan datos en nuestro nombre:</p>
        <ul>
          <li><strong>Mercado Pago</strong> — procesamiento de pagos (señas y suscripciones).</li>
          <li><strong>Resend</strong> — envío de emails transaccionales (confirmaciones, recordatorios).</li>
          <li><strong>Supabase</strong> — base de datos y almacenamiento de la Plataforma.</li>
          <li><strong>Vercel</strong> — hosting de la aplicación.</li>
        </ul>
        <p>
          Además, los datos de un Cliente que reserva un turno son visibles para el Negocio con
          el que reservó (es necesario para que puedan atenderlo) — no se comparten con otros
          Negocios de la Plataforma.
        </p>

        <h2>5. Cuánto tiempo guardamos los datos</h2>
        <p>
          Mientras la cuenta del Negocio esté activa. Si un Negocio da de baja su cuenta, sus
          datos y los de sus Clientes se conservan por un plazo razonable para cumplir obligaciones
          legales/contables y después se eliminan o anonimizan.
        </p>

        <h2>6. Tus derechos</h2>
        <p>
          De acuerdo a la Ley 25.326 de Protección de Datos Personales (Argentina), tenés derecho
          a acceder, rectificar y solicitar la eliminación de tus datos personales. La Agencia de
          Acceso a la Información Pública, en su carácter de Órgano de Control de la Ley 25.326,
          tiene la atribución de atender denuncias y reclamos que interpongan quienes resulten
          afectados en sus derechos por incumplimiento de las normas vigentes.
        </p>
        <p>
          Para ejercer estos derechos, escribinos a [email de contacto a completar].
        </p>

        <h2>7. Cookies</h2>
        <p>
          Usamos únicamente las cookies necesarias para mantener tu sesión iniciada en el panel
          administrativo. No usamos cookies de seguimiento publicitario de terceros.
        </p>

        <h2>8. Cambios en esta política</h2>
        <p>
          Podemos actualizar esta política para reflejar cambios en la Plataforma o en la
          normativa aplicable. La fecha de última actualización figura arriba.
        </p>

        <h2>9. Contacto</h2>
        <p>Consultas sobre privacidad: [email de contacto a completar].</p>

        <p className="text-xs text-gray-400 mt-10 border-t border-gray-100 pt-4">
          Este texto es una base estándar y no reemplaza el asesoramiento de un profesional legal.
          Antes de operar con clientes reales, revisalo con un abogado y completá los datos
          marcados entre corchetes (razón social, domicilio, email de contacto).
        </p>
      </main>
    </div>
  );
}
