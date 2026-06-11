'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Calendar, Scissors, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileNavProps {
  tenantSlug: string;
}

export function MobileNav({ tenantSlug }: MobileNavProps) {
  const pathname = usePathname();
  const base = `/admin/${tenantSlug}`;

  const links = [
    { href: base,                label: 'Inicio',    icon: LayoutDashboard },
    { href: `${base}/turnos`,    label: 'Turnos',    icon: Calendar        },
    { href: `${base}/servicios`, label: 'Servicios', icon: Scissors        },
    { href: `${base}/clientes`,  label: 'Clientes',  icon: Users           },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-zinc-100 safe-area-pb md:hidden">
      <div className="flex items-stretch h-16">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors',
                active ? 'text-violet-600' : 'text-zinc-400'
              )}
            >
              <Icon className={cn('w-5 h-5', active && 'stroke-[2.5px]')} />
              <span className={cn('text-[10px] font-medium', active ? 'text-violet-600' : 'text-zinc-400')}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
