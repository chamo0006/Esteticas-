import { AvisoBanner } from '@/components/ui/aviso-banner';
import type { AvisoSuscripcion } from '@/lib/suscripcion';

export function SubscriptionBanner({ aviso }: { aviso: AvisoSuscripcion }) {
  return (
    <AvisoBanner
      variant={aviso.variant}
      titulo={aviso.titulo}
      detalle={aviso.detalle}
      clave={`suscripcion:${aviso.clave}`}
      accion={aviso.accion}
      dismissible={aviso.dismissible}
    />
  );
}
