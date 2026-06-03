import { NextResponse } from 'next/server';
import { getTenantBySlug } from '@/lib/tenant';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;

  try {
    const tenant = await getTenantBySlug(tenantSlug);
    if (!tenant) {
      return NextResponse.json({ error: 'Estética no encontrada' }, { status: 404 });
    }
    return NextResponse.json(tenant);
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
