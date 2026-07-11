'use client';

import { useState } from 'react';
import {
  Check, ChevronRight, Plus, MoreHorizontal, Sparkles,
  LayoutDashboard, Calendar, Scissors, UserCog, Users, Settings, CreditCard,
  Clock, DollarSign, TrendingUp, Palette, Bell, Building2,
} from 'lucide-react';

type Tab = 'client' | 'admin';

const TABS: { id: Tab; emoji: string; label: string; short: string }[] = [
  { id: 'client', emoji: '📱', label: 'Reservas para clientes', short: 'Cliente' },
  { id: 'admin',  emoji: '📊', label: 'Tu panel de control',    short: 'Admin'   },
];

type Section = 'dashboard' | 'turnos' | 'servicios' | 'empleados' | 'clientes' | 'suscripcion' | 'configuracion';

function ClientView() {
  return (
    <div className="flex justify-center py-8">
      <div
        className="relative bg-gray-900 rounded-[48px] p-[10px] shadow-2xl shadow-gray-900/30"
        style={{ width: '272px' }}
      >
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-7 bg-black rounded-full z-10" />

        <div className="bg-white rounded-[40px] overflow-hidden" style={{ height: '540px' }}>
          {/* Status bar */}
          <div className="flex justify-between items-center px-6 pt-5 pb-1">
            <span className="text-[11px] font-semibold text-gray-900">9:41</span>
            <div className="flex items-center gap-0.5">
              <div className="w-3.5 h-2 border border-gray-900 rounded-[2px] flex items-center justify-end pr-[1px]">
                <div className="w-2 h-1.5 bg-gray-900 rounded-[1px]" />
              </div>
            </div>
          </div>

          {/* App header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-violet-600 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-semibold text-gray-900">Estética Bella</span>
            </div>
            <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-600">A</div>
          </div>

          <div className="px-5 pt-4 overflow-hidden">
            <div className="flex gap-1 mb-4">
              {[1, 2, 3].map(s => (
                <div key={s} className={`h-1 flex-1 rounded-full ${s === 1 ? 'bg-violet-600' : s === 2 ? 'bg-violet-200' : 'bg-gray-100'}`} />
              ))}
            </div>

            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Elegí tu servicio</p>

            <div className="space-y-2 mb-4">
              {[
                { name: 'Esculpidas Gel', price: '$15.000', dur: '60 min', selected: true },
                { name: 'Semi permanente', price: '$8.000', dur: '45 min', selected: false },
                { name: 'Lifting de cejas', price: '$6.500', dur: '30 min', selected: false },
              ].map(s => (
                <div
                  key={s.name}
                  className={`rounded-2xl px-3 py-2.5 border ${s.selected ? 'border-violet-300 bg-violet-50' : 'border-gray-100 bg-gray-50/50'}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-xs font-semibold ${s.selected ? 'text-violet-700' : 'text-gray-700'}`}>{s.name}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{s.dur}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-bold ${s.selected ? 'text-violet-600' : 'text-gray-500'}`}>{s.price}</span>
                      {s.selected && (
                        <div className="w-4 h-4 rounded-full bg-violet-600 flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Profesional</p>
            <div className="flex gap-2 mb-4">
              {[
                { name: 'Sofía', initials: 'S', color: 'bg-violet-100 text-violet-700', selected: true },
                { name: 'Micaela', initials: 'M', color: 'bg-rose-100 text-rose-600', selected: false },
                { name: 'Ana', initials: 'A', color: 'bg-amber-100 text-amber-700', selected: false },
              ].map(p => (
                <div
                  key={p.name}
                  className={`flex flex-col items-center gap-1 py-2 px-1 rounded-2xl border flex-1 ${p.selected ? 'border-violet-300 bg-violet-50' : 'border-gray-100'}`}
                >
                  <div className={`w-8 h-8 rounded-full ${p.color} flex items-center justify-center text-xs font-bold`}>{p.initials}</div>
                  <span className="text-[9px] text-gray-600">{p.name}</span>
                </div>
              ))}
            </div>

            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Fecha</p>
            <div className="grid grid-cols-7 gap-0.5 mb-4">
              {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
                <div key={d} className="text-center text-[8px] text-gray-400 font-medium">{d}</div>
              ))}
              {[...Array(2).fill(null), 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map((d, i) => (
                <div
                  key={i}
                  className={`text-center text-[10px] rounded-full aspect-square flex items-center justify-center mx-auto w-full max-w-[22px] ${
                    d === 14 ? 'bg-violet-600 text-white font-semibold' : d === null ? '' : 'text-gray-600'
                  }`}
                >
                  {d}
                </div>
              ))}
            </div>

            <button className="w-full bg-violet-600 text-white rounded-2xl py-3 text-xs font-semibold flex items-center justify-center gap-1.5">
              Confirmar turno
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const NAV_ITEMS: { key: Section; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'dashboard',     label: 'Dashboard',      icon: LayoutDashboard },
  { key: 'turnos',        label: 'Turnos',         icon: Calendar        },
  { key: 'servicios',     label: 'Servicios',      icon: Scissors        },
  { key: 'empleados',     label: 'Empleados',      icon: UserCog         },
  { key: 'clientes',      label: 'Clientes',       icon: Users           },
  { key: 'suscripcion',   label: 'Mi suscripción', icon: CreditCard      },
  { key: 'configuracion', label: 'Configuración',  icon: Settings        },
];

const SECTION_TITLES: Record<Section, string> = {
  dashboard: 'Dashboard',
  turnos: 'Turnos',
  servicios: 'Servicios',
  empleados: 'Empleados',
  clientes: 'Clientes',
  suscripcion: 'Mi suscripción',
  configuracion: 'Configuración',
};

const stats = [
  { label: 'Turnos hoy',       value: '24',    icon: Calendar,    color: 'text-violet-500 bg-violet-50'   },
  { label: 'Pendientes',       value: '3',     icon: Clock,       color: 'text-amber-500 bg-amber-50'     },
  { label: 'Ingresos hoy',     value: '$48k',  icon: DollarSign,  color: 'text-emerald-500 bg-emerald-50' },
  { label: 'Ingresos del mes', value: '$284k', icon: TrendingUp,  color: 'text-blue-500 bg-blue-50'       },
  { label: 'Total clientes',   value: '156',   icon: Users,       color: 'text-pink-500 bg-pink-50'       },
];

const turnos = [
  { n: 'Ana García',   s: 'Esculpidas · Hoy 10:00',       p: '$15.000', st: 'confirmado', c: 'bg-blue-100 text-blue-700',   ini: 'A' },
  { n: 'Laura Pérez',  s: 'Semi permanente · Hoy 11:30',  p: '$8.000',  st: 'pendiente',  c: 'bg-amber-100 text-amber-700', ini: 'L' },
  { n: 'Sofía R.',     s: 'Lifting de cejas · Hoy 13:00', p: '$6.500',  st: 'confirmado', c: 'bg-blue-100 text-blue-700',   ini: 'S' },
  { n: 'Valentina M.', s: 'Esculpidas · Hoy 15:30',       p: '$15.000', st: 'confirmado', c: 'bg-blue-100 text-blue-700',   ini: 'V' },
];

const servicios = [
  { n: 'Esculpidas Gel',    d: '60 min', p: '$15.000' },
  { n: 'Semi permanente',   d: '45 min', p: '$8.000'  },
  { n: 'Lifting de cejas',  d: '30 min', p: '$6.500'  },
  { n: 'Manicura spa',      d: '50 min', p: '$10.000' },
];

const empleados = [
  { name: 'Sofía Rodríguez', role: 'Pestañas & Extensiones', ini: 'SR', color: 'bg-violet-100 text-violet-700' },
  { name: 'Micaela Torres',  role: 'Manicurista & Nail Art',  ini: 'MT', color: 'bg-rose-100 text-rose-600'   },
  { name: 'Ana Gómez',       role: 'Depiladora & Cejas',      ini: 'AG', color: 'bg-amber-100 text-amber-700'  },
];

const clientes = [
  { name: 'Ana García',   info: '12 visitas · Esculpidas Gel', ini: 'A' },
  { name: 'Laura Pérez',  info: '5 visitas · Semi permanente', ini: 'L' },
  { name: 'Valentina M.', info: '8 visitas · Lifting de cejas', ini: 'V' },
];

const configItems = [
  { label: 'Colores de marca',       icon: Palette  },
  { label: 'Horarios de atención',   icon: Clock    },
  { label: 'Notificaciones',         icon: Bell     },
  { label: 'Datos del negocio',      icon: Building2 },
];

function SectionContent({ section }: { section: Section }) {
  if (section === 'dashboard') {
    return (
      <>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
          {stats.map(s => (
            <div key={s.label} className="bg-white rounded-xl p-2.5 border border-zinc-100 shadow-sm">
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center mb-1.5 ${s.color}`}>
                <s.icon className="w-3 h-3" />
              </div>
              <p className="text-sm font-bold text-zinc-900 leading-none">{s.value}</p>
              <p className="text-[8px] text-zinc-400 mt-1 font-medium">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-zinc-100 shadow-sm overflow-hidden">
          <div className="px-3 py-2 border-b border-zinc-100 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3 h-3 text-zinc-400" />
              <p className="text-[10px] font-semibold text-zinc-900">Próximos turnos</p>
            </div>
            <span className="text-[9px] text-violet-600 font-medium">Ver todos →</span>
          </div>
          <div className="divide-y divide-zinc-50">
            {turnos.map(a => (
              <div key={a.n} className="px-3 py-1.5 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-5 h-5 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                    <span className="text-[8px] font-bold text-violet-600">{a.ini}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium text-zinc-900 leading-tight truncate">{a.n}</p>
                    <p className="text-[8px] text-zinc-400 truncate">{a.s}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[9px] font-semibold text-zinc-700">{a.p}</span>
                  <span className={`text-[7px] px-1.5 py-0.5 rounded-md font-semibold ${a.c}`}>{a.st}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  if (section === 'turnos') {
    return (
      <div className="bg-white rounded-xl border border-zinc-100 shadow-sm overflow-hidden">
        <div className="px-3 py-2 border-b border-zinc-100 flex items-center gap-1.5">
          {['Todos 4', 'Pendientes 1', 'Confirmados 3'].map((p, i) => (
            <span key={p} className={`text-[8px] px-2 py-1 rounded-full font-semibold ${i === 0 ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-500'}`}>{p}</span>
          ))}
        </div>
        <div className="divide-y divide-zinc-50">
          {turnos.map(a => (
            <div key={a.n} className="px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-5 h-5 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                  <span className="text-[8px] font-bold text-violet-600">{a.ini}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-medium text-zinc-900 leading-tight truncate">{a.n}</p>
                  <p className="text-[8px] text-zinc-400 truncate">{a.s}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[9px] font-semibold text-zinc-700">{a.p}</span>
                <span className={`text-[7px] px-1.5 py-0.5 rounded-md font-semibold ${a.c}`}>{a.st}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (section === 'servicios') {
    return (
      <div className="bg-white rounded-xl border border-zinc-100 shadow-sm overflow-hidden">
        <div className="divide-y divide-zinc-50">
          {servicios.map(s => (
            <div key={s.n} className="px-3 py-2.5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-zinc-900">{s.n}</p>
                <p className="text-[8px] text-zinc-400 mt-0.5">{s.d}</p>
              </div>
              <span className="text-[10px] font-semibold text-zinc-700">{s.p}</span>
            </div>
          ))}
        </div>
        <div className="px-3 py-2.5 border-t border-dashed border-zinc-200 bg-zinc-50/40">
          <span className="flex items-center gap-1.5 text-[9px] text-violet-600 font-medium">
            <Plus className="w-3 h-3" /> Agregar servicio
          </span>
        </div>
      </div>
    );
  }

  if (section === 'empleados') {
    return (
      <div className="bg-white rounded-xl border border-zinc-100 shadow-sm overflow-hidden">
        <div className="divide-y divide-zinc-50">
          {empleados.map(e => (
            <div key={e.name} className="px-3 py-2.5 flex items-center gap-2.5">
              <div className={`w-7 h-7 rounded-full ${e.color} flex items-center justify-center text-[9px] font-bold shrink-0`}>{e.ini}</div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-medium text-zinc-900 truncate">{e.name}</p>
                <p className="text-[8px] text-zinc-400 truncate">{e.role}</p>
              </div>
              <MoreHorizontal className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
            </div>
          ))}
        </div>
        <div className="px-3 py-2.5 border-t border-dashed border-zinc-200 bg-zinc-50/40">
          <span className="flex items-center gap-1.5 text-[9px] text-violet-600 font-medium">
            <Plus className="w-3 h-3" /> Agregar empleado
          </span>
        </div>
      </div>
    );
  }

  if (section === 'clientes') {
    return (
      <div className="bg-white rounded-xl border border-zinc-100 shadow-sm overflow-hidden">
        <div className="divide-y divide-zinc-50">
          {clientes.map(c => (
            <div key={c.name} className="px-3 py-2.5 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center text-[9px] font-bold shrink-0">{c.ini}</div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-medium text-zinc-900 truncate">{c.name}</p>
                <p className="text-[8px] text-zinc-400 truncate">{c.info}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (section === 'suscripcion') {
    return (
      <div className="bg-white rounded-xl border border-zinc-100 shadow-sm p-3.5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-[8px] font-semibold text-zinc-400 uppercase tracking-wide mb-1">Plan actual</p>
            <p className="text-sm font-bold text-zinc-900">Pro</p>
            <p className="text-[9px] text-zinc-400 mt-0.5">$49.999 / mes</p>
          </div>
          <span className="text-[8px] font-semibold px-2 py-1 rounded-lg bg-emerald-100 text-emerald-700">Activa</span>
        </div>
        <div className="pt-3 border-t border-zinc-100 flex items-center justify-between">
          <div>
            <p className="text-[8px] font-semibold text-zinc-400 uppercase tracking-wide mb-1">Próximo vencimiento</p>
            <p className="text-[10px] font-medium text-zinc-700">10 de agosto</p>
          </div>
          <span className="text-[9px] text-violet-600 font-medium">Cambiar de plan →</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-zinc-100 shadow-sm overflow-hidden">
      <div className="divide-y divide-zinc-50">
        {configItems.map(c => (
          <div key={c.label} className="px-3 py-2.5 flex items-center gap-2.5">
            <c.icon className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <p className="text-[10px] font-medium text-zinc-900 flex-1">{c.label}</p>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminView() {
  const [section, setSection] = useState<Section>('dashboard');

  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl shadow-gray-100/80 overflow-hidden">
        <div className="flex sm:h-[440px]">
          {/* Sidebar — solo íconos en mobile, completo desde sm */}
          <div className="w-12 sm:w-44 bg-zinc-900 flex flex-col shrink-0">
            <div className="px-2 sm:px-4 py-4 border-b border-zinc-800 flex justify-center sm:block">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center shrink-0 shadow-md shadow-violet-900/50">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="min-w-0 hidden sm:block">
                  <p className="text-white text-xs font-semibold leading-tight truncate">Caracruz</p>
                  <p className="text-zinc-500 text-[9px] truncate">caracruz</p>
                </div>
              </div>
            </div>
            <div className="flex-1 p-1.5 sm:p-2.5 space-y-0.5">
              {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setSection(key)}
                  className={`w-full flex items-center justify-center sm:justify-start gap-2 px-1.5 sm:px-2.5 py-2 rounded-lg text-[11px] font-medium transition-colors ${
                    section === key ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
            <div className="p-2.5 border-t border-zinc-800 hidden sm:block">
              <div className="px-2.5 py-1">
                <p className="text-white text-[10px] font-medium">Sofía</p>
                <p className="text-zinc-500 text-[9px]">Administrador</p>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 p-3 sm:p-4 bg-gray-50/40 overflow-y-auto min-w-0">
            <div className="mb-3">
              <h3 className="text-sm font-bold text-zinc-900">{SECTION_TITLES[section]}</h3>
              {section === 'dashboard' && (
                <p className="text-[10px] text-zinc-400 mt-0.5">miércoles 24 de junio de 2026</p>
              )}
            </div>

            <SectionContent section={section} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SystemPreview() {
  const [active, setActive] = useState<Tab>('client');
  const [fading, setFading] = useState(false);

  const changeTab = (tab: Tab) => {
    if (tab === active) return;
    setFading(true);
    setTimeout(() => {
      setActive(tab);
      setFading(false);
    }, 180);
  };

  return (
    <div>
      <div className="flex gap-1 bg-gray-100 rounded-2xl p-1 max-w-xl mx-auto mb-8">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => changeTab(tab.id)}
            className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              active === tab.id
                ? 'bg-white shadow-sm text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="mr-1.5 hidden sm:inline">{tab.emoji}</span>
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.short}</span>
          </button>
        ))}
      </div>

      <div
        className="transition-all duration-200"
        style={{
          opacity: fading ? 0 : 1,
          transform: fading ? 'translateY(8px)' : 'translateY(0)',
        }}
      >
        {active === 'client' && <ClientView />}
        {active === 'admin'  && <AdminView />}
      </div>
    </div>
  );
}
