'use client';

import { useState } from 'react';
import {
  Check, ChevronRight, Plus, MoreHorizontal, Sparkles,
  LayoutDashboard, Calendar, Scissors, UserCog, Users, Settings, CreditCard,
  Clock, DollarSign, TrendingUp,
} from 'lucide-react';

type Tab = 'client' | 'admin' | 'staff';

const TABS: { id: Tab; emoji: string; label: string; short: string }[] = [
  { id: 'client', emoji: '📱', label: 'Reservas para clientes', short: 'Cliente'   },
  { id: 'admin',  emoji: '📊', label: 'Tu panel de control',    short: 'Admin'    },
  { id: 'staff',  emoji: '👥', label: 'Gestión de empleados',   short: 'Empleados' },
];

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

function AdminView() {
  const nav = [
    { label: 'Dashboard',      icon: LayoutDashboard, active: true },
    { label: 'Turnos',         icon: Calendar },
    { label: 'Servicios',      icon: Scissors },
    { label: 'Empleados',      icon: UserCog },
    { label: 'Clientes',       icon: Users },
    { label: 'Mi suscripción', icon: CreditCard },
    { label: 'Configuración',  icon: Settings },
  ];
  const stats = [
    { label: 'Turnos hoy',       value: '24',    icon: Calendar,    color: 'text-violet-500 bg-violet-50'   },
    { label: 'Pendientes',       value: '3',     icon: Clock,       color: 'text-amber-500 bg-amber-50'     },
    { label: 'Ingresos hoy',     value: '$48k',  icon: DollarSign,  color: 'text-emerald-500 bg-emerald-50' },
    { label: 'Ingresos del mes', value: '$284k', icon: TrendingUp,  color: 'text-blue-500 bg-blue-50'       },
    { label: 'Total clientes',   value: '156',   icon: Users,       color: 'text-pink-500 bg-pink-50'       },
  ];
  const turnos = [
    { n: 'Ana García',   s: 'Esculpidas · Hoy 10:00',      p: '$15.000', st: 'confirmado', c: 'bg-blue-100 text-blue-700',   ini: 'A' },
    { n: 'Laura Pérez',  s: 'Semi permanente · Hoy 11:30', p: '$8.000',  st: 'pendiente',  c: 'bg-amber-100 text-amber-700', ini: 'L' },
    { n: 'Sofía R.',     s: 'Lifting de cejas · Hoy 13:00', p: '$6.500', st: 'confirmado', c: 'bg-blue-100 text-blue-700',   ini: 'S' },
    { n: 'Valentina M.', s: 'Esculpidas · Hoy 15:30',      p: '$15.000', st: 'confirmado', c: 'bg-blue-100 text-blue-700',   ini: 'V' },
  ];
  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl shadow-gray-100/80 overflow-hidden">
        <div className="flex" style={{ height: '440px' }}>
          {/* Sidebar */}
          <div className="w-44 bg-zinc-900 flex flex-col shrink-0">
            <div className="px-4 py-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center shrink-0 shadow-md shadow-violet-900/50">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-white text-xs font-semibold leading-tight truncate">Caracruz</p>
                  <p className="text-zinc-500 text-[9px] truncate">caracruz</p>
                </div>
              </div>
            </div>
            <div className="flex-1 p-2.5 space-y-0.5">
              {nav.map(({ label, icon: Icon, active }) => (
                <div
                  key={label}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11px] font-medium transition-colors ${
                    active ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  {label}
                </div>
              ))}
            </div>
            <div className="p-2.5 border-t border-zinc-800">
              <div className="px-2.5 py-1">
                <p className="text-white text-[10px] font-medium">Sofía</p>
                <p className="text-zinc-500 text-[9px]">Administrador</p>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 p-4 bg-gray-50/40 overflow-hidden">
            <div className="mb-3">
              <h3 className="text-sm font-bold text-zinc-900">Dashboard</h3>
              <p className="text-[10px] text-zinc-400 mt-0.5">miércoles 24 de junio de 2026</p>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-3 gap-2 mb-3">
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

            {/* Próximos turnos */}
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
          </div>
        </div>
      </div>
    </div>
  );
}

function StaffView() {
  const staff = [
    { name: 'Sofía Rodríguez', role: 'Pestañas & Extensiones', services: 4, days: 'Lun — Vie', initials: 'SR', color: 'bg-violet-100 text-violet-700' },
    { name: 'Micaela Torres',  role: 'Manicurista & Nail Art',  services: 6, days: 'Mar — Sáb', initials: 'MT', color: 'bg-rose-100 text-rose-600'   },
    { name: 'Ana Gómez',       role: 'Depiladora & Cejas',      services: 5, days: 'Lun — Jue', initials: 'AG', color: 'bg-amber-100 text-amber-700'  },
  ];
  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl shadow-gray-100/80 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Empleados</h3>
            <p className="text-xs text-gray-400 mt-0.5">3 empleadas cargadas</p>
          </div>
          <button className="inline-flex items-center gap-1.5 text-xs bg-violet-600 text-white px-3.5 py-2 rounded-xl font-medium">
            <Plus className="w-3.5 h-3.5" />
            Nuevo empleado
          </button>
        </div>

        <div className="divide-y divide-gray-50">
          {staff.map(s => (
            <div key={s.name} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/70 transition-colors">
              <div className={`w-10 h-10 rounded-full ${s.color} flex items-center justify-center text-xs font-bold shrink-0`}>
                {s.initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{s.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.role}</p>
              </div>
              <div className="hidden sm:flex items-center gap-4 text-xs text-gray-400">
                <span><strong className="text-gray-600 font-medium">{s.services}</strong> servicios</span>
                <span>{s.days}</span>
              </div>
              <div className="flex items-center gap-2">
                <button className="text-[11px] text-gray-500 border border-gray-200 rounded-lg px-2.5 py-1.5 hover:border-gray-300 transition-colors">
                  Editar
                </button>
                <button className="text-gray-300 hover:text-gray-500 transition-colors">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 border-t border-dashed border-gray-200 bg-gray-50/30">
          <button className="flex items-center gap-2 text-xs text-violet-600 font-medium hover:text-violet-700 transition-colors">
            <div className="w-6 h-6 rounded-full border-2 border-dashed border-violet-300 flex items-center justify-center">
              <Plus className="w-3 h-3" />
            </div>
            Agregar otro empleado
          </button>
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
        {active === 'staff'  && <StaffView />}
      </div>
    </div>
  );
}
