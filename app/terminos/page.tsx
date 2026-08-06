import Link from 'next/link';

export const metadata = { title: 'Términos y Condiciones — Turfull' };

export default function TerminosPage() {
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
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Términos y Condiciones</h1>
        <p className="text-sm text-gray-400 mb-8">Última actualización: [completar fecha]</p>

        <p>
          Estos Términos y Condiciones regulan el uso de Turfull (la &quot;Plataforma&quot;), un
          servicio que permite a estéticas y barberías (&quot;Negocios&quot;) gestionar su
          agenda de turnos y recibir reservas online de sus clientes (&quot;Clientes&quot;).
          Al usar la Plataforma, tanto los Negocios como los Clientes aceptan estos términos.
        </p>

        <h2>1. Qué es Turfull</h2>
        <p>
          Turfull es un software de gestión de reservas. Provee la herramienta técnica para que
          un Negocio publique sus servicios, horarios y disponibilidad, y para que un Cliente
          reserve un turno. Turfull no presta los servicios de estética/barbería en sí — esa
          relación es directamente entre el Negocio y el Cliente. Turfull no es responsable por
          la calidad del servicio prestado, retrasos, cancelaciones del Negocio, ni por ningún
          reclamo que surja de la prestación efectiva del servicio.
        </p>

        <h2>2. Cuentas de Negocio</h2>
        <ul>
          <li>El Negocio es responsable de la exactitud de la información que publica (servicios, precios, horarios, política de seña/cancelación).</li>
          <li>El Negocio es responsable de mantener segura su contraseña de acceso al panel administrativo.</li>
          <li>El uso de la Plataforma está sujeto al plan de suscripción contratado y sus límites (cantidad de profesionales, servicios y turnos mensuales según el plan vigente).</li>
        </ul>

        <h2>3. Reservas y pagos</h2>
        <p>
          Según cómo lo configure cada Negocio, una reserva puede requerir el pago de una seña
          para confirmarse. Los pagos online se procesan a través de Mercado Pago; Turfull no
          almacena datos de tarjetas ni tiene custodia del dinero — actúa como intermediario
          técnico entre el Cliente y la cuenta de Mercado Pago del Negocio (o de la plataforma,
          según corresponda). Las políticas de cancelación, devolución de seña y reprogramación
          las define cada Negocio dentro de los márgenes que permite la Plataforma.
        </p>

        <h2>4. Uso aceptable</h2>
        <p>
          No está permitido usar la Plataforma para cargar información falsa, suplantar identidad,
          intentar vulnerar la seguridad del sistema, ni usar los formularios públicos (reserva,
          contacto) para enviar contenido malicioso, spam o código ejecutable.
        </p>

        <h2>5. Disponibilidad del servicio</h2>
        <p>
          Turfull hace su mejor esfuerzo para mantener la Plataforma disponible, pero no garantiza
          un funcionamiento ininterrumpido. No nos hacemos responsables por pérdidas derivadas de
          caídas del servicio, errores de terceros (Mercado Pago, proveedores de email, hosting)
          o casos de fuerza mayor.
        </p>

        <h2>6. Propiedad intelectual</h2>
        <p>
          El software, marca y diseño de Turfull son propiedad de [Razón social del titular]. El
          contenido que cada Negocio carga (fotos, descripciones, logo) sigue siendo de su
          propiedad; al publicarlo en la Plataforma, el Negocio autoriza a Turfull a mostrarlo
          públicamente en su página de reservas.
        </p>

        <h2>7. Límite de responsabilidad</h2>
        <p>
          En la máxima medida permitida por la ley, Turfull no será responsable por daños
          indirectos, lucro cesante, ni por conflictos entre un Negocio y sus Clientes derivados
          de la prestación del servicio reservado.
        </p>

        <h2>8. Modificaciones</h2>
        <p>
          Podemos actualizar estos términos para reflejar cambios en la Plataforma. Los cambios
          relevantes se van a comunicar a los Negocios registrados.
        </p>

        <h2>9. Ley aplicable</h2>
        <p>
          Estos términos se rigen por las leyes de la República Argentina. Cualquier controversia
          se someterá a los tribunales ordinarios de [jurisdicción a completar].
        </p>

        <h2>10. Contacto</h2>
        <p>
          Consultas sobre estos términos: [email de contacto a completar].
        </p>

        <p className="text-xs text-gray-400 mt-10 border-t border-gray-100 pt-4">
          Este texto es una base estándar y no reemplaza el asesoramiento de un profesional legal.
          Antes de operar con clientes reales, revisalo con un abogado y completá los datos
          marcados entre corchetes (razón social, CUIT, jurisdicción, email de contacto).
        </p>
      </main>
    </div>
  );
}
