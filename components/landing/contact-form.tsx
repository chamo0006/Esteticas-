'use client';

import { useState } from 'react';
import { Loader2, Check, AlertCircle } from 'lucide-react';

type FormState = {
  nombre: string;
  email: string;
  telefono: string;
  estetica: string;
};

export function ContactForm() {
  const [form, setForm] = useState<FormState>({ nombre: '', email: '', telefono: '', estetica: '' });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (field: keyof FormState, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validación: email con @ y formato válido
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email.trim())) {
      setError('Ingresá un email válido (debe incluir @ y un dominio, ej: nombre@gmail.com).');
      return;
    }

    // Validación: teléfono con 10 dígitos (ignora espacios, guiones y el +54 opcional)
    let digitos = form.telefono.replace(/\D/g, '');
    if (digitos.startsWith('54')) digitos = digitos.slice(2);
    if (digitos.length !== 10) {
      setError('El teléfono debe tener 10 dígitos (código de área + número, sin el +54).');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/contacto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        let msg = 'Error al enviar el mensaje. Intentá de nuevo.';
        try { const d = await res.json(); msg = d.error ?? msg; } catch { /* empty body */ }
        throw new Error(msg);
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar el mensaje. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-gray-200 text-center shadow-xl shadow-gray-100">
        <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <Check className="w-7 h-7 text-emerald-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">¡Mensaje recibido!</h3>
        <p className="text-gray-500 text-sm leading-relaxed">
          Te contactamos en menos de 24 horas para agendar tu demo gratuita.
        </p>
      </div>
    );
  }

  const fields: { field: keyof FormState; label: string; placeholder: string; type: string; required: boolean }[] = [
    { field: 'nombre', label: 'Tu nombre', placeholder: 'María García', type: 'text', required: true },
    { field: 'email', label: 'Email', placeholder: 'tu@email.com', type: 'email', required: true },
    { field: 'telefono', label: 'Teléfono', placeholder: '+54 11 xxxx-xxxx', type: 'tel', required: true },
    { field: 'estetica', label: 'Nombre de tu estética', placeholder: 'Estética Bella', type: 'text', required: false },
  ];

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 border border-gray-200 space-y-4 shadow-xl shadow-gray-100">
      {fields.map(({ field, label, placeholder, type, required }) => (
        <div key={field}>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {label}{' '}
            {required && <span className="text-rose-500">*</span>}
          </label>
          <input
            type={type}
            value={form[field]}
            onChange={(e) => set(field, e.target.value)}
            placeholder={placeholder}
            required={required}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-300 transition-all"
          />
        </div>
      ))}

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-600">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3.5 bg-gray-900 hover:bg-gray-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Enviando...
          </>
        ) : (
          'Enviar mensaje'
        )}
      </button>
    </form>
  );
}
