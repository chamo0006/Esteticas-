'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Calendar, Scissors, Users, LogOut, Sparkles, Settings, Inbox,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminSidebarProps {
  tenantSlug: string;
  tenantNombre: string;
  adminNombre: string;
}

export function AdminSidebar({ tenantSlug, tenantNombre, adminNombre }: AdminSidebarProps) {
  const pathname = usePathname();
  const base = `/admin/${tenantSlug}`;

  const links = [
    { href: base,                    label: 'Dashboard',  icon: LayoutDashboard },
    { href: `${base}/turnos`,        label: 'Turnos',     icon: Calendar        },
    { href: `${base}/servicios`,     label: 'Servicios',  icon: Scissors        },
    { href: `${base}/clientes`,       label: 'Clientes',      icon: Users    },
    { href: `${base}/leads`,          label: 'Leads',         icon: Inbox    },
    { href: `${base}/configuracion`, label: 'Configuración',  icon: Settings },
  ];

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.href = '/admin/login';
  };

  return (
    <aside className="w-60 bg-zinc-900 flex flex-col h-full flex-shrink-0">

      {/* Logo + tenant */}
      <div className="px-5 py-6 border-b border-zinc-800">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-violet-900/50">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm leading-tight truncate">{tenantNombre}</p>
            <p className="text-zinc-500 text-xs truncate">{tenantSlug}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                active
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer: user + logout */}
      <div className="p-3 border-t border-zinc-800 space-y-1">
        <div className="px-3 py-2">
          <p className="text-white text-xs font-medium truncate">{adminNombre}</p>
          <p className="text-zinc-500 text-xs">Administrador</p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
