'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, LogOut, Loader2 } from 'lucide-react';

export function ImpersonationBanner({ tenantNombre }: { tenantNombre: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const salir = async () => {
    setLoading(true);
    await fetch('/api/superadmin/impersonate', { method: 'DELETE' });
    router.push('/superadmin');
    router.refresh();
  };

  return (
    <div className="bg-gradient-to-r from-violet-600 to-violet-500 text-white px-4 py-2 flex items-center justify-between gap-3 text-sm font-medium">
      <div className="flex items-center gap-2 min-w-0">
        <Eye className="w-4 h-4 flex-shrink-0 text-violet-200" />
        <span className="truncate text-violet-50">
          Estás viendo como <strong className="text-white">{tenantNombre}</strong> · modo superadmin
        </span>
      </div>
      <button
        onClick={salir}
        disabled={loading}
        className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white px-3 py-1.5 rounded-lg transition-colors flex-shrink-0 backdrop-blur-sm"
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
        Volver al panel
      </button>
    </div>
  );
}
