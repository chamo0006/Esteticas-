import { Clock } from 'lucide-react';
import Link from 'next/link';

interface Props {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ payment_id?: string; external_reference?: string }>;
}

export default async function ReservaPendientePage({ params, searchParams }: Props) {
  const { tenantSlug } = await params;
  const { payment_id } = await searchParams;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-card rounded-3xl p-8 shadow-sm border border-border max-w-sm w-full text-center">
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-5">
          <Clock className="w-8 h-8 text-amber-600" />
        </div>

        <h1 className="font-serif text-2xl text-foreground mb-2">Pago pendiente</h1>
        <p className="text-muted-foreground text-sm mb-6">
          Tu pago está siendo procesado. En cuanto se acredite vas a recibir un email con la
          confirmación de tu turno. No hace falta que vuelvas a pagar.
        </p>

        {payment_id && (
          <p className="text-xs text-muted-foreground mb-6">
            ID de pago: <code className="font-mono">{payment_id}</code>
          </p>
        )}

        <Link
          href={`/${tenantSlug}`}
          className="block w-full py-3 bg-primary text-primary-foreground rounded-2xl font-medium text-sm hover:bg-primary/90 transition-colors"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
