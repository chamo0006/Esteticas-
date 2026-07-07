import {
  ArrowRight,
  Check,
  MessageCircle,
  Sparkles,
  Star,
} from 'lucide-react';
import { AnimateIn } from '@/components/landing/animate-in';
import { SystemPreview } from '@/components/landing/system-preview';
import { ContactForm } from '@/components/landing/contact-form';

const features = [
  {
    emoji: '📅',
    title: 'Calendario inteligente',
    description:
      'Agenda digital para cualquier profesional. Los slots se calculan automáticamente según la duración de cada servicio.',
    iconBg: 'bg-violet-50',
  },
  {
    emoji: '📱',
    title: 'Reservas online 24/7',
    description:
      'Tus clientes reservan turnos desde el celular en segundos. Sin llamadas, sin idas y vueltas, sin WhatsApp.',
    iconBg: 'bg-blue-50',
  },
  {
    emoji: '💳',
    title: 'Señas con Mercado Pago',
    description:
      'Tu cliente paga la seña al reservar. Confirmación automática, cero cancelaciones de último momento.',
    iconBg: 'bg-emerald-50',
  },
  {
    emoji: '📒',
    title: 'Libreta de clientes',
    description:
      'Historial de visitas, servicios y notas privadas de cada cliente de tu negocio.',
    iconBg: 'bg-amber-50',
  },
  {
    emoji: '💰',
    title: 'Balance de ingresos',
    description:
      'Cuánto ganaste hoy, esta semana y este mes. Con breakdown por servicio para entender tu negocio.',
    iconBg: 'bg-rose-50',
  },
  {
    emoji: '🗂️',
    title: 'Agendas separadas',
    description:
      'Cada tipo de servicio puede tener su propia agenda independiente para no mezclar turnos.',
    iconBg: 'bg-sky-50',
  },
];

const steps = [
  {
    n: '01',
    title: 'Creás tu perfil',
    description:
      'Registrate gratis, cargá tus servicios con precio y duración, y configurá tus horarios. Funciona para estéticas, barberías, masajes, uñas y más.',
    badgeBg: 'bg-violet-100',
    badgeColor: 'text-violet-700',
  },
  {
    n: '02',
    title: 'Compartís tu link',
    description:
      'Cada negocio tiene su página única de reservas online. Compartila por WhatsApp, Instagram o donde quieras.',
    badgeBg: 'bg-emerald-100',
    badgeColor: 'text-emerald-700',
  },
  {
    n: '03',
    title: 'Recibís turnos',
    description:
      'Tus clientes eligen servicio, día y hora desde el celular. Vos recibís un email y lo ves en tu panel de control.',
    badgeBg: 'bg-amber-100',
    badgeColor: 'text-amber-700',
  },
];

const pricingPlans = [
  {
    name: 'Básico',
    tagline: 'Para profesionales independientes',
    price: '29.999',
    yearlyNote: 'o $299.990/año — ahorrás 2 meses',
    badge: null as string | null,
    popular: false,
    dark: false,
    features: [
      'Hasta 1 profesional',
      'Reservas online 24/7',
      'Calendario de turnos',
      'Gestión de clientes',
      'Página personalizada con tu marca',
      'Soporte por WhatsApp',
    ],
    cta: 'Empezar gratis',
    ctaNote: 'Sin tarjeta de crédito',
  },
  {
    name: 'Pro',
    tagline: 'Para equipos en crecimiento',
    price: '49.999',
    yearlyNote: 'o $499.990/año — ahorrás 2 meses',
    badge: 'Más popular',
    popular: true,
    dark: false,
    features: [
      'Todo lo del Básico',
      'Hasta 5 profesionales',
      'Gestión de empleados',
      'Señas online con Mercado Pago',
      'Estadísticas avanzadas',
      'Soporte prioritario',
    ],
    cta: 'Empezar gratis 14 días',
    ctaNote: 'Sin tarjeta de crédito',
  },
  {
    name: 'Pro+',
    tagline: 'Para cadenas y centros con múltiples sucursales',
    price: '79.999',
    yearlyNote: 'o $799.990/año — ahorrás 2 meses',
    badge: null as string | null,
    popular: false,
    dark: true,
    features: [
      'Más de 5 profesionales',
      'Todo lo incluido en el Plan Pro',
      'Reportes avanzados y métricas de negocio',
      'Prioridad en soporte técnico',
      'Capacitación personalizada',
      'Integraciones avanzadas',
      'Posibilidad de agregar sucursales adicionales',
    ],
    cta: 'Hablar con ventas',
    ctaNote: 'Te contactamos en menos de 24hs',
  },
];

const navLinks = [
  ['Cómo funciona', '#como-funciona'],
  ['Servicio', '#preview'],
  ['Beneficios', '#funciones'],
  ['Precios', '#precios'],
  ['Contacto', '#contacto'],
] as const;

const avatarColors = [
  'bg-violet-200',
  'bg-rose-200',
  'bg-amber-200',
  'bg-emerald-200',
  'bg-sky-200',
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">

      {/* ── Navbar ──────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gray-900 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-gray-900">Caracruz</span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map(([label, href]) => (
              <a
                key={label}
                href={href}
                className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
              >
                {label}
              </a>
            ))}
          </nav>

          <a
            href="#contacto"
            className="text-sm bg-gray-900 text-white px-5 py-2.5 rounded-full font-medium hover:bg-gray-700 hover:-translate-y-0.5 transition-all duration-200"
          >
            Contratar servicio
          </a>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-14 md:pb-16 text-center">
        <div className="animate-hero">
          <div className="inline-flex items-center gap-2 bg-violet-50 border border-violet-100 rounded-full px-4 py-2 mb-8">
            <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
            <span className="text-xs font-medium text-violet-700">
              Más de 200 estéticas ya están usando Caracruz
            </span>
          </div>
        </div>

        <h1
          className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.08] mb-6 animate-hero"
          style={{ animationDelay: '80ms' }}
        >
          Tu estética merece
          <br />
          <span className="bg-gradient-to-br from-violet-500 via-purple-600 to-violet-700 bg-clip-text text-transparent">
            su propio sistema
          </span>
        </h1>

        <p
          className="max-w-2xl mx-auto text-lg sm:text-xl text-gray-400 leading-relaxed mb-10 animate-hero"
          style={{ animationDelay: '160ms' }}
        >
          Dales a tus clientes una experiencia de reserva online impecable.
          Administrá turnos, staff y finanzas desde un solo lugar, sin complicaciones.
        </p>

        <div
          className="flex flex-col sm:flex-row gap-3 justify-center animate-hero"
          style={{ animationDelay: '240ms' }}
        >
          <a
            href="#contacto"
            className="inline-flex items-center justify-center gap-2 bg-gray-900 text-white px-8 py-4 rounded-2xl font-semibold hover:bg-gray-700 hover:-translate-y-0.5 transition-all duration-200 shadow-lg shadow-gray-900/10"
          >
            Empezar gratis
            <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href="#preview"
            className="inline-flex items-center justify-center gap-2 bg-white text-gray-700 px-8 py-4 rounded-2xl font-semibold border border-gray-200 hover:border-gray-300 hover:bg-gray-50 hover:-translate-y-0.5 transition-all duration-200"
          >
            Ver demo interactiva
          </a>
        </div>

        {/* Social proof */}
        <div
          className="flex items-center justify-center flex-wrap gap-4 mt-12 animate-hero"
          style={{ animationDelay: '320ms' }}
        >
          <div className="flex -space-x-2">
            {avatarColors.map((c, i) => (
              <div key={i} className={`w-8 h-8 rounded-full ${c} border-2 border-white`} />
            ))}
          </div>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map(i => (
              <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            ))}
          </div>
          <span className="text-sm text-gray-400">Más de 200 estéticas satisfechas</span>
        </div>
      </section>

      {/* ── Cómo funciona (3 pasos) ─────────────────────────── */}
      <section id="como-funciona" className="py-14 md:py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <AnimateIn className="text-center mb-14">
            <span className="text-xs font-semibold text-violet-600 uppercase tracking-widest block mb-3">
              Cómo funciona
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
              Tan simple como debe ser
            </h2>
            <p className="text-gray-500 max-w-lg mx-auto">
              Tres pasos y tu negocio ya está en Caracruz.
            </p>
          </AnimateIn>

          <div className="relative max-w-4xl mx-auto">
            {/* Línea conectora (solo desktop) */}
            <div className="hidden md:block absolute top-7 left-[18%] right-[18%] border-t-2 border-dashed border-gray-200" />

            <div className="relative grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
              {steps.map((s, i) => (
                <AnimateIn key={s.n} delay={i * 100} className="text-center">
                  <div
                    className={`relative z-10 w-14 h-14 rounded-2xl ${s.badgeBg} ${s.badgeColor} flex items-center justify-center font-bold mx-auto mb-5 shadow-sm`}
                  >
                    {s.n}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{s.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed max-w-xs mx-auto">
                    {s.description}
                  </p>
                </AnimateIn>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── System Preview (tabs interactivos) ──────────────── */}
      <section id="preview" className="bg-gray-50 py-14 md:py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <AnimateIn className="text-center mb-12">
            <span className="text-xs font-semibold text-violet-600 uppercase tracking-widest block mb-3">
              Demo interactiva
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
              Explorá el sistema
            </h2>
            <p className="text-gray-500 max-w-lg mx-auto">
              Sin registrarte, sin tarjeta. Tocá las pestañas y mirá cómo funciona cada parte.
            </p>
          </AnimateIn>

          <AnimateIn delay={120}>
            <SystemPreview />
          </AnimateIn>
        </div>
      </section>

      {/* ── Features Bento Grid ──────────────────────────────── */}
      <section id="funciones" className="py-14 md:py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <AnimateIn className="text-center mb-12">
            <span className="text-xs font-semibold text-violet-600 uppercase tracking-widest block mb-3">
              Funcionalidades
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Todo lo que necesitás, nada de lo que no
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto text-lg">
              Diseñado específicamente para estéticas y centros de belleza argentinos.
            </p>
          </AnimateIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
            {features.map((f, i) => (
              <AnimateIn key={f.title} delay={i * 80}>
                <div className="group bg-white border border-gray-100 rounded-3xl p-6 hover:shadow-xl hover:shadow-gray-100/80 hover:-translate-y-1 transition-all duration-300 h-full">
                  <div className={`w-12 h-12 rounded-2xl ${f.iconBg} flex items-center justify-center mb-5 text-2xl leading-none`}>
                    <span aria-hidden="true">{f.emoji}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.description}</p>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────── */}
      <section id="precios" className="bg-gray-50 py-14 md:py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <AnimateIn className="text-center mb-10">
            <span className="text-xs font-semibold text-violet-600 uppercase tracking-widest block mb-3">
              Precios
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Simple. Claro. Sin sorpresas.
            </h2>
            <p className="text-gray-500 max-w-lg mx-auto">
              Elegí el plan que mejor se adapta a tu negocio. Todos incluyen 14 días de prueba gratis, sin tarjeta de crédito.
            </p>
          </AnimateIn>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
            {pricingPlans.map((plan, i) => (
              <AnimateIn key={plan.name} delay={i * 80} className="h-full">
                <div
                  className={
                    'relative flex flex-col rounded-3xl p-6 h-full transition-all duration-300 ' +
                    (plan.popular
                      ? 'bg-white border border-violet-200 shadow-2xl shadow-violet-100/60 hover:-translate-y-1 overflow-hidden'
                      : plan.dark
                      ? 'bg-gray-900 border border-gray-800 hover:shadow-xl hover:shadow-gray-900/20 hover:-translate-y-1'
                      : 'bg-white border border-gray-200 hover:shadow-xl hover:shadow-gray-100/80 hover:-translate-y-1')
                  }
                >
                  {plan.popular && (
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-violet-400 to-purple-600" />
                  )}

                  {plan.badge && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-600 bg-violet-50 border border-violet-100 rounded-full px-3 py-1 mb-4 self-start">
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                      {plan.badge}
                    </span>
                  )}

                  <h3 className={'text-lg font-semibold mb-1 ' + (plan.dark ? 'text-white' : 'text-gray-900')}>
                    {plan.name}
                  </h3>
                  <p className={'text-sm mb-4 ' + (plan.dark ? 'text-gray-400' : 'text-gray-500')}>
                    {plan.tagline}
                  </p>

                  <div className="flex items-baseline gap-1.5 mb-2">
                    <span className={'text-3xl font-bold ' + (plan.dark ? 'text-white' : 'text-gray-900')}>
                      ${plan.price}
                    </span>
                    <span className={'font-medium text-gray-400'}>/mes</span>
                  </div>
                  <p className={'text-xs mb-5 ' + (plan.dark ? 'text-gray-500' : 'text-gray-400')}>
                    {plan.yearlyNote}
                  </p>

                  <ul className="space-y-2.5 mb-6 flex-1">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-start gap-3">
                        <div
                          className={
                            'w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ' +
                            (plan.popular
                              ? 'bg-violet-50 border border-violet-100'
                              : plan.dark
                              ? 'bg-white/10'
                              : 'bg-gray-100')
                          }
                        >
                          <Check
                            className={
                              'w-3 h-3 ' +
                              (plan.popular ? 'text-violet-600' : plan.dark ? 'text-white' : 'text-gray-500')
                            }
                          />
                        </div>
                        <span className={'text-sm ' + (plan.dark ? 'text-gray-300' : 'text-gray-600')}>
                          {f}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <a
                    href="#contacto"
                    className={
                      'block w-full text-center py-3.5 rounded-2xl font-semibold transition-all duration-200 hover:-translate-y-0.5 ' +
                      (plan.popular
                        ? 'bg-gray-900 text-white hover:bg-gray-700'
                        : plan.dark
                        ? 'bg-white text-gray-900 hover:bg-gray-100'
                        : 'bg-gray-100 text-gray-900 hover:bg-gray-200')
                    }
                  >
                    {plan.cta}
                  </a>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact ─────────────────────────────────────────── */}
      <section id="contacto" className="py-14 md:py-20 px-6">
        <div className="max-w-xl mx-auto">
          <AnimateIn className="text-center mb-10">
            <span className="text-xs font-semibold text-violet-600 uppercase tracking-widest block mb-3">
              Contacto
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
              Empezá hoy
            </h2>
            <p className="text-gray-500">
              Completá el formulario y te contactamos en menos de 24hs.
            </p>
          </AnimateIn>

          <AnimateIn delay={100}>
            <ContactForm />
          </AnimateIn>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="bg-gray-950 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-violet-600 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-white">Caracruz</span>
          </div>

          <div className="flex items-center gap-6">
            {navLinks.map(([label, href]) => (
              <a
                key={label}
                href={href}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                {label}
              </a>
            ))}
          </div>

          <p className="text-sm text-gray-500">
            &copy; 2025 Caracruz &mdash; Hecho con amor en Argentina
          </p>
        </div>
      </footer>

      {/* ── Botón flotante de WhatsApp ────────────────────────── */}
      <a
        href="https://wa.me/5491121615661?text=%C2%A1Hola%21%20Estoy%20interesado%2Fa%20en%20contratar%20una%20p%C3%A1gina%20web%20con%20sistema%20de%20turnos%20para%20mi%20centro%20de%20belleza.%20%C2%BFPodr%C3%ADamos%20conversar%3F"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chatear por WhatsApp"
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full shadow-lg shadow-black/20 hover:-translate-y-0.5 hover:shadow-xl transition-all duration-200"
        style={{ backgroundColor: '#25D366' }}
      >
        <MessageCircle className="w-7 h-7 text-white" fill="white" />
      </a>

    </div>
  );
}
