import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

async function getAdminPayload(tenantSlug: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload || payload.tenantSlug !== tenantSlug) return null;
  return payload;
}

const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};
const MAX_BYTES = 3 * 1024 * 1024; // 3MB

// POST /api/admin/[tenantSlug]/upload — sube el logo a Storage.
// FormData: file (Blob), kind ('logo'). Devuelve { url }.
// No toca la tabla tenants — el front persiste la URL vía PATCH /configuracion.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;
  const payload = await getAdminPayload(tenantSlug);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file');
  const kind = formData.get('kind');

  if (!(file instanceof Blob) || kind !== 'logo') {
    return NextResponse.json({ error: 'Faltan datos (file, kind)' }, { status: 400 });
  }
  const ext = MIME_EXT[file.type];
  if (!ext) {
    return NextResponse.json({ error: 'Formato no soportado (usá JPG, PNG, WEBP o GIF)' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'La imagen no puede superar 3MB' }, { status: 400 });
  }

  const path = `tenants/${payload.tenantId}/${kind}-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage
    .from('tenant-media')
    .upload(path, buffer, { contentType: file.type, upsert: false });

  if (error) {
    console.error('[upload POST]', error);
    return NextResponse.json({ error: 'Error al subir la imagen' }, { status: 500 });
  }

  const { data: { publicUrl } } = supabase.storage.from('tenant-media').getPublicUrl(path);
  return NextResponse.json({ url: publicUrl });
}
