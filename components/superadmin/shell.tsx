'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Sparkles, LayoutDashboard, Users, DollarSign, Package, Inbox, LogOut, Menu, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  billing?: boolean; // solo visible si canSeeBilling
}

const NAV: NavItem[] = [
  { href: '/superadmin',             label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/superadmin/comercios',   label: 'Comercios',   icon: Users },
  { href: '/superadmin/facturacion', label: 'Facturación', icon: DollarSign, billing: true },
  { href: '/superadmin/planes',      label: 'Planes',      icon: Package, billing: true },
  { href: '/superadmin/leads',       label: 'Leads',       icon: Inbox },
];

interface Props {
  rol: string;
  canSeeBilling: boolean;
  children: React.ReactNode;
}

export function SuperadminShell({ rol, canSeeBilling, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const items = NAV.filter((n) => !n.billing || canSeeBilling);

  // El item activo es el de href más largo que sea prefijo del pathname
  // (así /superadmin/comercios/123 marca "Comercios", no "Dashboard").
  const activeHref = items
    .filter((n) => pathname === n.href || pathname.startsWith(n.href + '/'))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  const logout = async () => {
    await fetch('/api/superadmin/logout', { method: 'POST' });
    router.push('/superadmin/login');
    router.refresh();
  };

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <>
      {items.map((n) => {
        const active = n.href === activeHref;
        return (
          <Link key={n.href} href={n.href} onClick={onClick}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
              active ? 'bg-violet-600 text-white shadow-sm' : 'text-gray-400 hover:text-white hover:bg-gray-800'
            )}>
            <n.icon className="w-4 h-4 flex-shrink-0" />
            {n.label}
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-60 flex-col bg-gray-900 p-4">
        <div className="flex items-center gap-2.5 px-2 mb-6">
          <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-violet-900/50">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white leading-tight">Super Admin</p>
            <p className="text-xs text-gray-500 capitalize truncate">Rol: {rol}</p>
          </div>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          <NavLinks />
        </nav>
        <button onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
          <LogOut className="w-4 h-4" /> Salir
        </button>
      </aside>

      {/* Topbar mobile */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900/95 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-bold text-white">Super Admin</span>
        </div>
        <button onClick={() => setMobileOpen(true)} className="p-2 text-gray-400 hover:text-white">
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* Drawer mobile */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/60" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-y-0 left-0 w-64 bg-gray-900 p-4 flex flex-col"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <span className="text-sm font-bold text-white capitalize">Rol: {rol}</span>
              <button onClick={() => setMobileOpen(false)} className="p-1.5 text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex flex-col gap-1 flex-1">
              <NavLinks onClick={() => setMobileOpen(false)} />
            </nav>
            <button onClick={logout}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-gray-800">
              <LogOut className="w-4 h-4" /> Salir
            </button>
          </div>
        </div>
      )}

      {/* Contenido */}
      <main className="md:pl-60">
        <div className="max-w-6xl mx-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
