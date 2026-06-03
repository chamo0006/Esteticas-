import { XCircle } from 'lucide-react';
import Link from 'next/link';

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

export default async function ReservaErrorPage({ params }: Props) {
  const { tenantSlug } = await params;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-card rounded-3xl p-8 shadow-sm border border-border max-w-sm w-full text-center">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-5">
          <XCircle className="w-8 h-8 text-destructive" />
        </div>

        <h1 className="font-serif text-2xl text-foreground mb-2">Pago no completado</h1>
        <p className="text-muted-foreground text-sm mb-6">
          El pago fue cancelado o rechazado. Tu turno queda reservado pero pendiente de pago. Podés intentarlo de nuevo.
        </p>

        <Link
          href={`/${tenantSlug}`}
          className="block w-full py-3 bg-primary text-primary-foreground rounded-2xl font-medium text-sm hover:bg-primary/90 transition-colors"
        >
          Intentar de nuevo
        </Link>
      </div>
    </div>
  );
}
