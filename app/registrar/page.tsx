'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Loader2, Check, Eye, EyeOff } from 'lucide-react';

export default function RegistrarPage() {
  const [form, setForm] = useState({
    nombre: '', email: '', telefono: '',
    adminNombre: '', password: '', confirmPassword: '',
  });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ slug: string } | null>(null);
  const router = useRouter();

  const set = (field: string, value: string) =>
    setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/registrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: form.nombre,
          email: form.email,
          telefono: form.telefono,
          adminNombre: form.adminNombre,
          password: form.password,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Error al registrar');
      }

      const data = await res.json();
      setSuccess({ slug: data.slug });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  if (success) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-5">
          <Check className="w-8 h-8 text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">¡Tu estética está lista!</h2>
        <p className="text-zinc-400 text-sm mb-6">
          Tu URL pública es <strong className="text-violet-400">/{success.slug}</strong>.
          Te enviamos los datos de acceso por email.
        </p>
        <button
          onClick={() => router.push('/admin/login')}
          className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-colors"
        >
          Ir al panel admin →
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-violet-600 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-violet-900/50">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Registrá tu estética</h1>
          <p className="text-zinc-500 text-sm mt-2">Empezá a recibir reservas en minutos</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Datos del negocio */}
          <div className="bg-zinc-900 rounded-2xl p-5 space-y-4 border border-zinc-800">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Tu estética</p>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Nombre del negocio *</label>
              <input
                value={form.nombre}
                onChange={(e) => set('nombre', e.target.value)}
                placeholder="Ej: Estética Bella"
                required
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-600 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Teléfono (opcional)</label>
              <input
                value={form.telefono}
                onChange={(e) => set('telefono', e.target.value)}
                placeholder="+54 11 xxxx-xxxx"
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-600 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          {/* Datos del admin */}
          <div className="bg-zinc-900 rounded-2xl p-5 space-y-4 border border-zinc-800">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Tu cuenta de administrador</p>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Tu nombre *</label>
              <input
                value={form.adminNombre}
                onChange={(e) => set('adminNombre', e.target.value)}
                placeholder="María García"
                required
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-600 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="tu@email.com"
                required
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-600 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Contraseña *</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  required minLength={8}
                  className="w-full px-4 py-3 pr-11 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-600 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Confirmar contraseña *</label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(e) => set('confirmPassword', e.target.value)}
                placeholder="Repetí tu contraseña"
                required
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-600 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          {error && (
            <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-900/30"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creando tu cuenta...</> : 'Crear mi estética gratis'}
          </button>

          <p className="text-center text-zinc-600 text-xs">
            ¿Ya tenés cuenta?{' '}
            <a href="/admin/login" className="text-violet-400 hover:underline">Iniciar sesión</a>
          </p>
        </form>
      </div>
    </div>
  );
}
