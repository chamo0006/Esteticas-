import {
  ArrowRight,
  Check,
  MessageCircle,
  CreditCard,
  ImageIcon,
  Calculator,
  Sparkles,
  Star,
} from 'lucide-react';
import { AnimateIn } from '@/components/landing/animate-in';
import { SystemPreview } from '@/components/landing/system-preview';
import { ContactForm } from '@/components/landing/contact-form';

const features = [
  {
    Icon: MessageCircle,
    title: 'Recordatorios por WhatsApp',
    description:
      'Enviá recordatorios automáticos 24hs antes del turno. Reducí ausentes hasta un 80% sin hacer nada.',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
  },
  {
    Icon: CreditCard,
    title: 'Señas con Mercado Pago',
    description:
      'Tu cliente paga la seña al reservar. Confirmación automática, cero cancelaciones de último momento.',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
  {
    Icon: ImageIcon,
    title: 'Historial con fotos',
    description:
      'Cada cliente tiene su carpeta. Subí fotos, anotá preferencias y trackeá el progreso de cada trabajo.',
    iconBg: 'bg-rose-50',
    iconColor: 'text-rose-500',
  },
  {
    Icon: Calculator,
    title: 'Calculadora de comisiones',
    description:
      'Configurá el % por servicio y profesional. El sistema calcula solo, vos pagás con certeza total.',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
  },
];

const pricingFeatures = [
  'Página de reservas personalizada',
  'Panel de administración completo',
  'Recordatorios automáticos por WhatsApp',
  'Señas online con Mercado Pago',
  'Gestión de staff y comisiones',
  'Historial de clientes con fotos',
  'Estadísticas e ingresos',
  'Soporte 7 días a la semana',
];

const navLinks = [
  ['Funciones', '#funciones'],
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
            <span className="font-semibold text-gray-900">TurnosApp</span>
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
            Registrar mi Estética
          </a>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pt-28 pb-24 text-center">
        <div className="animate-hero">
          <div className="inline-flex items-center gap-2 bg-violet-50 border border-violet-100 rounded-full px-4 py-2 mb-8">
            <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
            <span className="text-xs font-medium text-violet-700">
              Más de 200 estéticas ya están usando TurnosApp
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
          className="flex items-center justify-center flex-wrap gap-4 mt-16 animate-hero"
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

      {/* ── System Preview (tabs interactivos) ──────────────── */}
      <section id="preview" className="bg-gray-50 py-24 px-6">
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
      <section id="funciones" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <AnimateIn className="text-center mb-16">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {features.map((f, i) => (
              <AnimateIn key={f.title} delay={i * 80}>
                <div className="group bg-white border border-gray-100 rounded-3xl p-8 hover:shadow-xl hover:shadow-gray-100/80 hover:-translate-y-1 transition-all duration-300 h-full">
                  <div className={`w-12 h-12 rounded-2xl ${f.iconBg} flex items-center justify-center mb-5`}>
                    <f.Icon className={`w-6 h-6 ${f.iconColor}`} />
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
      <section id="precios" className="bg-gray-50 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <AnimateIn className="text-center mb-12">
            <span className="text-xs font-semibold text-violet-600 uppercase tracking-widest block mb-3">
              Precios
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Simple. Claro. Sin sorpresas.
            </h2>
            <p className="text-gray-500 max-w-lg mx-auto">
              Un solo plan con todo incluido. Sin funciones bloqueadas, sin letras chicas.
            </p>
          </AnimateIn>

          <AnimateIn delay={100} className="max-w-sm mx-auto">
            <div className="relative bg-white rounded-3xl border border-gray-200 p-8 shadow-2xl shadow-gray-100/80 overflow-hidden hover:shadow-violet-100/60 hover:-translate-y-1 transition-all duration-300">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-violet-400 to-purple-600" />

              <div className="mb-7">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-600 bg-violet-50 border border-violet-100 rounded-full px-3 py-1 mb-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                  Todo incluido
                </span>
                <div className="flex items-baseline gap-1.5 mt-3">
                  <span className="text-5xl font-bold text-gray-900">$9.999</span>
                  <span className="text-gray-400 font-medium">/mes</span>
                </div>
                <p className="text-sm text-gray-400 mt-2">
                  o $99.990/año — ahorrás 2 meses
                </p>
              </div>

              <ul className="space-y-3 mb-8">
                {pricingFeatures.map(f => (
                  <li key={f} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-violet-50 border border-violet-100 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-violet-600" />
                    </div>
                    <span className="text-sm text-gray-600">{f}</span>
                  </li>
                ))}
              </ul>

              <a
                href="#contacto"
                className="block w-full text-center bg-gray-900 text-white py-4 rounded-2xl font-semibold hover:bg-gray-700 hover:-translate-y-0.5 transition-all duration-200"
              >
                Empezar gratis 14 días
              </a>
              <p className="text-center text-xs text-gray-400 mt-3">
                Sin tarjeta de crédito requerida
              </p>
            </div>
          </AnimateIn>
        </div>
      </section>

      {/* ── Contact ─────────────────────────────────────────── */}
      <section id="contacto" className="py-24 px-6">
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
            <span className="font-semibold text-white">TurnosApp</span>
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
            &copy; 2025 TurnosApp &mdash; Hecho con amor en Argentina
          </p>
        </div>
      </footer>

    </div>
  );
}
