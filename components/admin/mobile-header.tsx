'use client';

import { useState } from 'react';
import { Menu, X, Sparkles, LogOut } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Calendar, Scissors, Users, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileHeaderProps {
  tenantSlug: string;
  tenantNombre: string;
  adminNombre: string;
}

export function MobileHeader({ tenantSlug, tenantNombre, adminNombre }: MobileHeaderProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const base = `/admin/${tenantSlug}`;

  const links = [
    { href: base,                label: 'Dashboard',  icon: LayoutDashboard },
    { href: `${base}/turnos`,    label: 'Turnos',     icon: Calendar        },
    { href: `${base}/servicios`, label: 'Servicios',  icon: Scissors        },
    { href: `${base}/clientes`,       label: 'Clientes',      icon: Users     },
    { href: `${base}/configuracion`, label: 'Configuración', icon: Settings  },
  ];

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.href = '/admin/login';
  };

  // Título de la página actual
  const currentLabel = links.find(l => l.href === pathname)?.label ?? 'Panel';

  return (
    <>
      {/* Header top bar — solo mobile */}
      <header className="md:hidden sticky top-0 z-40 bg-white border-b border-zinc-100 px-4 h-14 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-semibold text-zinc-900 text-sm">{currentLabel}</span>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="p-2 -mr-2 text-zinc-500"
          aria-label="Abrir menú"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* Drawer */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/40 md:hidden"
            onClick={() => setOpen(false)}
          />
          <div className="fixed right-0 top-0 bottom-0 z-50 w-64 bg-white shadow-2xl flex flex-col md:hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
              <div>
                <p className="font-semibold text-zinc-900 text-sm">{tenantNombre}</p>
                <p className="text-xs text-zinc-400">{adminNombre}</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-zinc-400 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 p-4 space-y-1">
              {links.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                    pathname === href
                      ? 'bg-violet-600 text-white'
                      : 'text-zinc-600 hover:bg-zinc-100'
                  )}
                >
                  <Icon className="w-4 h-4" /> {label}
                </Link>
              ))}
            </nav>

            <div className="p-4 border-t border-zinc-100">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-zinc-500 hover:bg-zinc-100 transition-colors"
              >
                <LogOut className="w-4 h-4" /> Cerrar sesión
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
