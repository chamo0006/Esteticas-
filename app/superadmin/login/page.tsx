'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Shield } from 'lucide-react';

function SuperadminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/superadmin';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) {
      setError('El email debe contener @');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/superadmin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Error al iniciar sesión');
        return;
      }
      router.push(next);
      router.refresh();
    } catch {
      setError('Error de red. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#141210] flex items-center justify-center px-4">
      <div className="bg-[#1c1a15] rounded-2xl border border-[#2c261d] shadow-xl p-8 w-full max-w-sm">
        <div className="w-12 h-12 rounded-2xl bg-[#b3543f] flex items-center justify-center mb-6">
          <Shield className="w-5 h-5 text-[#f2ede1]" />
        </div>
        <p className="text-[11px] uppercase tracking-[0.2em] text-[#c9a86a] mb-1.5">Plataforma</p>
        <h1 className="text-2xl font-serif font-medium tracking-tight text-[#f2ede1] mb-1">Super Admin</h1>
        <div className="w-8 h-px bg-[#c9a86a] mb-4" />
        <p className="text-sm text-[#a89d86] mb-6">Panel de gestión de la plataforma</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#cabfa8] mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="w-full px-4 py-3 bg-[#241f18] border border-[#3a3327] rounded-xl text-sm text-[#f2ede1] focus:outline-none focus:ring-2 focus:ring-[#c9a86a] transition-all"
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#cabfa8] mb-1.5">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 bg-[#241f18] border border-[#3a3327] rounded-xl text-sm text-[#f2ede1] focus:outline-none focus:ring-2 focus:ring-[#c9a86a] transition-all"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-[#d1806b] bg-[#241310] border border-[#4a281f] rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full py-3 bg-[#c9a86a] hover:bg-[#d8b877] disabled:bg-[#241f18] disabled:text-[#7c745f] text-[#1a1710] font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}

export default function SuperadminLoginPage() {
  return (
    <Suspense fallback={null}>
      <SuperadminLoginForm />
    </Suspense>
  );
}
