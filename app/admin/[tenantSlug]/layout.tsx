import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/auth';
import { getTenantBySlug } from '@/lib/tenant';
import { AdminSidebar } from '@/components/admin/sidebar';
import { MobileNav } from '@/components/admin/mobile-nav';
import { MobileHeader } from '@/components/admin/mobile-header';
import { ImpersonationBanner } from '@/components/admin/impersonation-banner';
import { SubscriptionBanner } from '@/components/admin/subscription-banner';
import { getAvisoSuscripcion } from '@/lib/suscripcion';

interface Props {
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
}

export default async function AdminLayout({ children, params }: Props) {
  const { tenantSlug } = await params;

  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  if (!token) redirect('/admin/login');

  const payload = await verifyToken(token);
  if (!payload || payload.tenantSlug !== tenantSlug) redirect('/admin/login');

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) redirect('/admin/login');

  const aviso = await getAvisoSuscripcion(tenant.id);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar — solo desktop */}
      <div className="hidden md:flex">
        <AdminSidebar
          tenantSlug={tenantSlug}
          tenantNombre={tenant.nombre}
          adminNombre={payload.nombre}
          tipoNegocio={tenant.tipo_negocio}
        />
      </div>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {payload.impersonatedBy && <ImpersonationBanner tenantNombre={tenant.nombre} />}

        {/* Header móvil con drawer */}
        <MobileHeader
          tenantSlug={tenantSlug}
          tenantNombre={tenant.nombre}
          adminNombre={payload.nombre}
          tipoNegocio={tenant.tipo_negocio}
        />

        {/* Scroll area — padding-bottom para dejar espacio al nav inferior en mobile */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          {aviso && <SubscriptionBanner aviso={aviso} />}
          {children}
        </main>
      </div>

      {/* Nav inferior — solo mobile */}
      <MobileNav tenantSlug={tenantSlug} tipoNegocio={tenant.tipo_negocio} />
    </div>
  );
}
