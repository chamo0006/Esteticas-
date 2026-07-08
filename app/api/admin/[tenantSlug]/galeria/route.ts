import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
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

function pathFromPublicUrl(url: string): string | null {
  const marker = '/tenant-media/';
  const i = url.indexOf(marker);
  return i === -1 ? null : url.slice(i + marker.length);
}

// GET /api/admin/[tenantSlug]/galeria — lista las fotos del tenant, ordenadas.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;
  const payload = await getAdminPayload(tenantSlug);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { data, error } = await supabase
    .from('tenant_galeria')
    .select('id, url, orden, created_at')
    .eq('tenant_id', payload.tenantId)
    .order('orden');

  if (error) return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST /api/admin/[tenantSlug]/galeria — sube una foto y la agrega al final.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;
  const payload = await getAdminPayload(tenantSlug);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file');
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'Falta el archivo' }, { status: 400 });
  }
  const ext = MIME_EXT[file.type];
  if (!ext) {
    return NextResponse.json({ error: 'Formato no soportado (usá JPG, PNG, WEBP o GIF)' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'La imagen no puede superar 3MB' }, { status: 400 });
  }

  const path = `tenants/${payload.tenantId}/galeria/${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from('tenant-media')
    .upload(path, buffer, { contentType: file.type, upsert: false });
  if (uploadError) {
    console.error('[galeria POST upload]', uploadError);
    return NextResponse.json({ error: 'Error al subir la imagen' }, { status: 500 });
  }

  const { data: { publicUrl } } = supabase.storage.from('tenant-media').getPublicUrl(path);

  const { data: maxRow } = await supabase
    .from('tenant_galeria')
    .select('orden')
    .eq('tenant_id', payload.tenantId)
    .order('orden', { ascending: false })
    .limit(1)
    .maybeSingle();
  const siguienteOrden = (maxRow?.orden ?? -1) + 1;

  const { data, error } = await supabase
    .from('tenant_galeria')
    .insert({ tenant_id: payload.tenantId, url: publicUrl, orden: siguienteOrden })
    .select('id, url, orden, created_at')
    .single();

  if (error) {
    console.error('[galeria POST insert]', error);
    return NextResponse.json({ error: 'Error al guardar la imagen' }, { status: 500 });
  }

  revalidatePath(`/${tenantSlug}`);
  return NextResponse.json(data);
}

// PATCH /api/admin/[tenantSlug]/galeria — reordena. Body: { orden: string[] } (ids en el nuevo orden).
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;
  const payload = await getAdminPayload(tenantSlug);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const orden = body?.orden;
  if (!Array.isArray(orden) || orden.some((id) => typeof id !== 'string')) {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  await Promise.all(
    orden.map((id: string, i: number) =>
      supabase.from('tenant_galeria').update({ orden: i }).eq('id', id).eq('tenant_id', payload.tenantId)
    )
  );

  revalidatePath(`/${tenantSlug}`);
  return NextResponse.json({ ok: true });
}

// DELETE /api/admin/[tenantSlug]/galeria?id=... — borra la fila y el archivo en Storage.
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;
  const payload = await getAdminPayload(tenantSlug);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 });

  const { data: foto } = await supabase
    .from('tenant_galeria')
    .select('url')
    .eq('id', id)
    .eq('tenant_id', payload.tenantId)
    .single();

  const { error } = await supabase
    .from('tenant_galeria')
    .delete()
    .eq('id', id)
    .eq('tenant_id', payload.tenantId);
  if (error) return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });

  const path = foto?.url ? pathFromPublicUrl(foto.url) : null;
  if (path) await supabase.storage.from('tenant-media').remove([path]);

  revalidatePath(`/${tenantSlug}`);
  return NextResponse.json({ ok: true });
}
