'use client';

import { useState } from 'react';
import { Loader2, Check } from 'lucide-react';

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

  const set = (field: keyof FormState, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    setSent(true);
    setLoading(false);
  };

  if (sent) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-border text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <Check className="w-7 h-7 text-emerald-600" />
        </div>
        <h3 className="font-serif text-xl font-bold text-foreground mb-2">¡Mensaje recibido!</h3>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Te contactamos en menos de 24 horas para agendar tu demo gratuita.
        </p>
      </div>
    );
  }

  const fields: { field: keyof FormState; label: string; placeholder: string; type: string; required: boolean }[] = [
    { field: 'nombre', label: 'Tu nombre', placeholder: 'María García', type: 'text', required: true },
    { field: 'email', label: 'Email', placeholder: 'tu@email.com', type: 'email', required: true },
    { field: 'telefono', label: 'Teléfono', placeholder: '+54 11 xxxx-xxxx', type: 'tel', required: false },
    { field: 'estetica', label: 'Nombre de tu estética', placeholder: 'Estética Bella', type: 'text', required: false },
  ];

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 border border-border space-y-4">
      {fields.map(({ field, label, placeholder, type, required }) => (
        <div key={field}>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            {label}{' '}
            {required && <span className="text-rose-500">*</span>}
          </label>
          <input
            type={type}
            value={form[field]}
            onChange={(e) => set(field, e.target.value)}
            placeholder={placeholder}
            required={required}
            className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-mauve-500 transition-shadow"
          />
        </div>
      ))}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3.5 bg-mauve-600 hover:bg-mauve-500 disabled:bg-zinc-200 disabled:text-zinc-400 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
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
