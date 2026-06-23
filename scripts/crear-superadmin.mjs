// Crea (o actualiza) un usuario del panel Superadmin en platform_admins.
// Uso:  node scripts/crear-superadmin.mjs <email> <password> "<nombre>" <rol>
// Roles: superadmin | finanzas | soporte   (default: superadmin)
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

// --- cargar .env.local manualmente (node no lo hace solo) ---
const env = {};
for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}

const [, , emailArg, passArg, nombreArg, rolArg] = process.argv;
const email = (emailArg ?? 'aguschamorro21@gmail.com').toLowerCase().trim();
const password = passArg ?? 'fito481';
const nombre = nombreArg ?? 'Agustín';
const rol = rolArg ?? 'superadmin';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const password_hash = await bcrypt.hash(password, 10);

// upsert por email
const { error } = await supabase
  .from('platform_admins')
  .upsert({ email, password_hash, nombre, rol, activo: true }, { onConflict: 'email' });

if (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}

console.log(`✅ Superadmin listo:\n   email: ${email}\n   rol:   ${rol}\n   pass:  ${password}`);
