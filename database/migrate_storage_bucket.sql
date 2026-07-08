-- Bucket público de Supabase Storage para media de cada tenant
-- (logo, banner, galería). Se escribe solo desde el service-role
-- client (lib/supabase.ts), por eso no hace falta política RLS.
INSERT INTO storage.buckets (id, name, public)
VALUES ('tenant-media', 'tenant-media', true)
ON CONFLICT (id) DO NOTHING;
