import Link from 'next/link';
import {
  Calendar,
  Bell,
  Globe,
  ArrowRight,
  Check,
  Sparkles,
  TrendingUp,
  Star,
  Zap,
  Shield,
  LayoutDashboard,
  Mail,
  Phone,
  AtSign,
} from 'lucide-react';
import { ContactForm } from '@/components/landing/contact-form';

// ---------------------------------------------------------------------------
// Mock UI — decorative admin panel preview shown in the Hero
// ---------------------------------------------------------------------------
function MockAdminUI() {
  return (
    <div className="relative w-full max-w-[480px] mx-auto select-none pointer-events-none">
      {/* Ambient glow */}
      <div className="absolute -inset-6 bg-gradient-to-br from-violet-400/25 via-rose-300/20 to-transparent rounded-[3rem] blur-3xl" />

      {/* Browser frame */}
      <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-zinc-900/15 border border-white/70 bg-white">
        {/* URL bar */}
        <div className="bg-zinc-900 px-4 py-2.5 flex items-center gap-3">
          <div className="flex gap-1.5 shrink-0">
            <span className="w-3 h-3 rounded-full bg-[#FF5F57]" />
            <span className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
            <span className="w-3 h-3 rounded-full bg-[#28C840]" />
          </div>
          <div className="flex-1 bg-zinc-800 rounded-full px-3 py-1 text-zinc-400 text-xs font-mono truncate">
            estetica-bella.turnosapp.com
          </div>
        </div>

        {/* App shell */}
        <div className="flex" style={{ height: '300px' }}>
          {/* Sidebar */}
          <div className="w-[52px] bg-zinc-950 flex flex-col items-center pt-4 gap-3 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center mb-1">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-8 h-8 rounded-xl flex items-center justify-center ${i === 0 ? 'bg-violet-900/60' : ''}`}
              >
                <div className="w-4 h-0.5 bg-zinc-700 rounded" />
              </div>
            ))}
          </div>

          {/* Dashboard content */}
          <div className="flex-1 bg-zinc-50 p-4 overflow-hidden">
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">
              Resumen del día
            </p>

            {/* Stat cards */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { label: 'Turnos', value: '12', textColor: 'text-violet-600', bg: 'bg-violet-50' },
                { label: 'Clientes', value: '8', textColor: 'text-rose-600', bg: 'bg-rose-50' },
                { label: 'Ingresos', value: '$52k', textColor: 'text-emerald-600', bg: 'bg-emerald-50' },
              ].map((s) => (
                <div key={s.label} className={`${s.bg} rounded-xl p-2.5`}>
                  <p className="text-[9px] text-zinc-500 mb-0.5">{s.label}</p>
                  <p className={`text-sm font-bold ${s.textColor}`}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Appointment list */}
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              Próximos turnos
            </p>
            <div className="space-y-1.5">
              {[
                { time: '10:00', name: 'Ana García', service: 'Manicura', dot: 'bg-violet-400' },
                { time: '11:30', name: 'Laura Pérez', service: 'Lifting', dot: 'bg-rose-400' },
                { time: '13:00', name: 'Sofía R.', service: 'Cejas', dot: 'bg-amber-400' },
                { time: '15:00', name: 'Valentina M.', service: 'Semi', dot: 'bg-emerald-400' },
              ].map((a) => (
                <div key={a.time} className="flex items-center gap-2 bg-white rounded-lg px-2.5 py-1.5 shadow-sm">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${a.dot}`} />
                  <span className="text-[10px] font-medium text-zinc-600 w-8 shrink-0">{a.time}</span>
                  <span className="text-[10px] text-zinc-500 flex-1 truncate">{a.name} · {a.service}</span>
                  <span className="text-[9px] bg-zinc-100 text-zinc-400 rounded px-1.5 py-0.5 shrink-0">
                    confirmado
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating: new booking notification */}
      <div className="absolute -right-3 top-20 bg-white rounded-xl shadow-lg border border-rose-100/80 p-3 w-48">
        <div className="flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
            <Check className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-zinc-800">¡Nueva reserva!</p>
            <p className="text-[10px] text-zinc-500 leading-snug">Valentina · Mañana 15:00</p>
          </div>
        </div>
      </div>

      {/* Floating: growth card */}
      <div className="absolute -left-3 bottom-8 bg-white rounded-xl shadow-lg border border-violet-100/80 p-3 w-36">
        <p className="text-[10px] text-zinc-500 mb-0.5">Este mes</p>
        <p className="text-2xl font-bold text-zinc-900">+34%</p>
        <div className="flex items-center gap-1 mt-0.5">
          <TrendingUp className="w-3 h-3 text-emerald-500" />
          <p className="text-[10px] text-emerald-600">reservas online</p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
const benefits = [
  {
    icon: Globe,
    title: 'Tu Marca, Tu Dominio',
    desc: 'Cada estética recibe su propia web independiente y personalizada para compartir con sus clientes.',
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-600',
  },
  {
    icon: Calendar,
    title: 'Agenda Automatizada',
    desc: 'Tus clientes reservan solos las 24 horas. Sin mensajes a deshoras, sin errores de agenda.',
    iconBg: 'bg-rose-50',
    iconColor: 'text-rose-600',
  },
  {
    icon: LayoutDashboard,
    title: 'Panel de Administración',
    desc: 'Control total de turnos, profesionales, servicios y estadísticas desde un solo lugar.',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
  },
  {
    icon: Bell,
    title: 'Recordatorios Automáticos',
    desc: 'El sistema avisa a tus clientes automáticamente. Menos ausencias, más ingresos garantizados.',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
  },
];

const steps = [
  {
    n: '01',
    title: 'Registrá tu estética',
    desc: 'Completá tu perfil en minutos: cargá tus servicios, horarios y profesionales sin necesidad de saber programación.',
  },
  {
    n: '02',
    title: 'Lanzamos tu sitio',
    desc: 'Recibís tu propio link personalizado, listo para compartir en Instagram, WhatsApp y donde quieras.',
  },
  {
    n: '03',
    title: 'Empezá a cobrar',
    desc: 'Tus clientes reservan y pagan online. Vos gestionás todo desde tu panel de administración.',
  },
];

const plans = [
  {
    name: 'Emprendedora',
    tagline: 'Para comenzar',
    price: '$4.999',
    features: [
      '1 profesional',
      'Hasta 50 turnos/mes',
      'Web personalizada',
      'Agenda automática',
      'Soporte por email',
    ],
    cta: 'Empezar gratis',
    href: '/registrar',
    popular: false,
  },
  {
    name: 'Premium',
    tagline: 'El más elegido',
    price: '$9.999',
    features: [
      'Hasta 5 profesionales',
      'Turnos ilimitados',
      'Web personalizada',
      'Agenda automática',
      'Recordatorios automáticos',
      'Panel de estadísticas',
      'Soporte prioritario',
    ],
    cta: 'Comenzar ahora',
    href: '/registrar',
    popular: true,
  },
  {
    name: 'Pro',
    tagline: 'Para grandes centros',
    price: '$17.999',
    features: [
      'Profesionales ilimitados',
      'Turnos ilimitados',
      'Web personalizada',
      'Agenda automática',
      'Recordatorios automáticos',
      'Estadísticas avanzadas',
      'Integración Mercado Pago',
      'Soporte 24/7',
    ],
    cta: 'Contactar ventas',
    href: '#contacto',
    popular: false,
  },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">

      {/* ── NAVBAR ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center shadow-sm">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-serif text-lg font-bold">TurnosApp</span>
          </Link>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-7">
            {[
              ['Beneficios', '#beneficios'],
              ['Cómo funciona', '#como-funciona'],
              ['Precios', '#precios'],
              ['Contacto', '#contacto'],
            ].map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {label}
              </a>
            ))}
          </nav>

          {/* CTA */}
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/admin/login"
              className="hidden sm:block text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/registrar"
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
            >
              Empezar gratis
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <section id="inicio" className="relative pt-16 pb-24 px-4 sm:px-6 overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-100/50 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-rose-100/50 rounded-full translate-y-1/2 -translate-x-1/3 blur-3xl pointer-events-none" />

        <div className="relative max-w-6xl mx-auto grid lg:grid-cols-2 gap-14 lg:gap-10 items-center">
          {/* ── Copy ── */}
          <div className="text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-violet-50 text-violet-700 rounded-full px-4 py-1.5 text-xs font-semibold mb-6 border border-violet-200">
              <Zap className="w-3 h-3" />
              Plataforma SaaS para estéticas
            </div>

            <h1 className="font-serif text-4xl sm:text-5xl lg:text-[3.25rem] font-bold leading-[1.12] text-foreground mb-6">
              Llevá tu estética al siguiente nivel con tu propia{' '}
              <span className="text-violet-600">plataforma de turnos</span>
            </h1>

            <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-lg mx-auto lg:mx-0">
              Una web personalizada para tu marca, agenda automatizada las 24 horas y un panel de control para potenciar tus ventas. Sin complicaciones técnicas.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Link
                href="/registrar"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-violet-200 hover:shadow-violet-300 hover:-translate-y-0.5"
              >
                Registrar mi estética gratis
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#como-funciona"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white hover:bg-zinc-50 text-foreground font-semibold rounded-xl transition-all border border-border shadow-sm"
              >
                Ver cómo funciona
              </a>
            </div>

            {/* Social proof */}
            <div className="mt-8 flex items-center gap-4 justify-center lg:justify-start">
              <div className="flex -space-x-2">
                {['bg-violet-400', 'bg-rose-400', 'bg-amber-400', 'bg-emerald-400'].map((c, i) => (
                  <div key={i} className={`w-8 h-8 rounded-full ${c} border-2 border-white`} />
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">+200 estéticas</span> ya confían en nosotros
              </p>
            </div>
          </div>

          {/* ── Mock UI ── */}
          <div className="flex justify-center lg:justify-end">
            <MockAdminUI />
          </div>
        </div>
      </section>

      {/* ── BENEFITS ───────────────────────────────────────────────────────── */}
      <section id="beneficios" className="py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-violet-600 font-semibold text-sm uppercase tracking-wider mb-3">
              Por qué elegirnos
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Todo lo que tu negocio necesita
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Herramientas diseñadas específicamente para el rubro de la belleza y el bienestar.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map(({ icon: Icon, title, desc, iconBg, iconColor }) => (
              <div
                key={title}
                className="bg-background rounded-2xl p-6 border border-border hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${iconBg}`}>
                  <Icon className={`w-6 h-6 ${iconColor}`} />
                </div>
                <h3 className="font-serif text-lg font-bold text-foreground mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────────────────────────── */}
      <section id="como-funciona" className="py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-violet-600 font-semibold text-sm uppercase tracking-wider mb-3">
              Simple y rápido
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Cómo funciona
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              En tres pasos tenés tu estética online y recibiendo reservas.
            </p>
          </div>

          <div className="relative grid md:grid-cols-3 gap-10">
            {/* Connector line */}
            <div className="hidden md:block absolute top-10 left-[calc(16.67%+2rem)] right-[calc(16.67%+2rem)] h-px bg-gradient-to-r from-violet-200 via-violet-400 to-violet-200" />

            {steps.map(({ n, title, desc }) => (
              <div key={n} className="relative text-center flex flex-col items-center">
                <div className="relative mb-6">
                  <div className="w-20 h-20 rounded-full bg-violet-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-violet-200 relative z-10">
                    {n}
                  </div>
                  <div className="absolute inset-0 rounded-full bg-violet-300/30 scale-[1.35] blur-sm" />
                </div>
                <h3 className="font-serif text-xl font-bold text-foreground mb-3">{title}</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">{desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-14">
            <Link
              href="/registrar"
              className="inline-flex items-center gap-2 px-8 py-4 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-violet-200 hover:-translate-y-0.5"
            >
              Comenzar ahora — es gratis
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── PRICING ────────────────────────────────────────────────────────── */}
      <section id="precios" className="py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-violet-600 font-semibold text-sm uppercase tracking-wider mb-3">
              Planes y precios
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Invertí en el crecimiento de tu negocio
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Sin contratos. Sin sorpresas. Cancelá cuando quieras.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 items-center">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl p-7 border transition-all ${
                  plan.popular
                    ? 'bg-zinc-900 border-zinc-700 shadow-2xl shadow-zinc-900/25 md:scale-105'
                    : 'bg-background border-border hover:shadow-md'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1.5 bg-violet-600 text-white text-xs font-semibold px-3.5 py-1.5 rounded-full shadow-md">
                      <Star className="w-3 h-3 fill-white" />
                      Más popular
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${plan.popular ? 'text-zinc-400' : 'text-muted-foreground'}`}>
                    {plan.tagline}
                  </p>
                  <h3 className={`font-serif text-2xl font-bold mb-3 ${plan.popular ? 'text-white' : 'text-foreground'}`}>
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-3xl font-bold ${plan.popular ? 'text-white' : 'text-foreground'}`}>
                      {plan.price}
                    </span>
                    <span className={`text-sm ${plan.popular ? 'text-zinc-400' : 'text-muted-foreground'}`}>
                      /mes
                    </span>
                  </div>
                </div>

                <ul className="space-y-3 mb-7">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-2.5">
                      <Check className={`w-4 h-4 shrink-0 ${plan.popular ? 'text-violet-400' : 'text-violet-600'}`} />
                      <span className={`text-sm ${plan.popular ? 'text-zinc-300' : 'text-muted-foreground'}`}>
                        {feat}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.href}
                  className={`block w-full text-center py-3 rounded-xl font-semibold text-sm transition-all ${
                    plan.popular
                      ? 'bg-violet-600 hover:bg-violet-500 text-white shadow-md'
                      : 'bg-background hover:bg-zinc-50 text-foreground border border-border'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTACT ────────────────────────────────────────────────────────── */}
      <section id="contacto" className="py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-violet-600 font-semibold text-sm uppercase tracking-wider mb-3">
              ¿Tenés preguntas?
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Hablemos
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Completá el formulario y te contactamos en menos de 24 horas.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-start">
            {/* Info panel */}
            <div className="space-y-8">
              <div className="space-y-5">
                {[
                  { icon: Mail, label: 'Email', value: 'contacto@turnosapp.com' },
                  { icon: Phone, label: 'WhatsApp', value: '+54 11 xxxx-xxxx' },
                  { icon: AtSign, label: 'Instagram', value: '@turnosapp' },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-violet-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="text-sm font-medium text-foreground">{value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Trust badge */}
              <div className="bg-white rounded-2xl p-6 border border-border">
                <div className="flex items-center gap-2.5 mb-3">
                  <Shield className="w-5 h-5 text-violet-600" />
                  <p className="font-semibold text-foreground text-sm">Garantía de 14 días</p>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Probá la plataforma sin compromiso. Si no estás satisfecha, te devolvemos el dinero sin preguntas.
                </p>
              </div>
            </div>

            {/* Contact form (client component) */}
            <ContactForm />
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer className="bg-zinc-900 text-zinc-400 py-14 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="sm:col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <span className="font-serif text-lg font-bold text-white">TurnosApp</span>
              </div>
              <p className="text-sm leading-relaxed">
                La plataforma de reservas online diseñada para centros de estética y salones de belleza de Argentina.
              </p>
            </div>

            {/* Producto */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-4">Producto</p>
              <ul className="space-y-2.5 text-sm">
                {['Beneficios', 'Precios', 'Cómo funciona', 'Demo gratuita'].map((item) => (
                  <li key={item}>
                    <a href="#" className="hover:text-white transition-colors">{item}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Empresa */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-4">Empresa</p>
              <ul className="space-y-2.5 text-sm">
                {['Sobre nosotros', 'Blog', 'Contacto', 'Soporte'].map((item) => (
                  <li key={item}>
                    <a href="#" className="hover:text-white transition-colors">{item}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal + socials */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-4">Legal</p>
              <ul className="space-y-2.5 text-sm mb-6">
                {['Términos de uso', 'Política de privacidad', 'Cookies'].map((item) => (
                  <li key={item}>
                    <a href="#" className="hover:text-white transition-colors">{item}</a>
                  </li>
                ))}
              </ul>
              <div className="flex items-center gap-2.5">
                {[AtSign, Mail, Globe].map((Icon, i) => (
                  <a
                    key={i}
                    href="#"
                    className="w-9 h-9 rounded-xl bg-zinc-800 hover:bg-violet-600 flex items-center justify-center transition-colors"
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <p>© 2025 TurnosApp. Todos los derechos reservados.</p>
            <p>Hecho con ♥ en Argentina 🇦🇷</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
