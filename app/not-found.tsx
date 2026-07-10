import Link from 'next/link';
import { Sparkles, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#FCF8F5] flex flex-col items-center justify-center px-4 text-center">
      <div className="flex items-center gap-2.5 mb-10">
        <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center shadow-md shadow-violet-900/20">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold text-gray-900">Caracruz</span>
      </div>

      <p className="text-sm font-semibold text-violet-600 tracking-wide mb-3">Error 404</p>
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">Esta página no existe</h1>
      <p className="text-gray-500 text-sm md:text-base max-w-sm mb-8">
        El link al que entraste está roto o la página se movió. Revisá la dirección o volvé al inicio.
      </p>

      <Link
        href="/"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
      >
        <ArrowLeft className="w-4 h-4" /> Volver al inicio
      </Link>
    </div>
  );
}
