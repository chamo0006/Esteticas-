import { AvisoBanner } from '@/components/ui/aviso-banner';
import type { AvisoTurnosVencidos } from '@/lib/turnos-vencidos';

interface Props {
  aviso: AvisoTurnosVencidos;
  tenantSlug: string;
}

export function TurnosVencidosBanner({ aviso, tenantSlug }: Props) {
  const plural = aviso.count === 1 ? '' : 's';

  return (
    <AvisoBanner
      variant="warning"
      titulo={`Tenés ${aviso.count} turno${plural} de días anteriores sin confirmar o completar`}
      detalle="Revisalos para mantener tu agenda al día."
      clave={`turnos-vencidos:${aviso.clave}`}
      accion={{ label: 'Ver turnos →', href: `/admin/${tenantSlug}/turnos?vista=todos&estado=vencidos` }}
    />
  );
}
