// Uso: node scripts/set-admin-password.mjs <email> <nueva-contraseña>
// Ejemplo: node scripts/set-admin-password.mjs admin@esteticabella.com admin123

import bcrypt from 'bcryptjs';
import pg from 'pg';
import { readFileSync } from 'fs';

// Lee DATABASE_URL del .env.local
const envContent = readFileSync('.env.local', 'utf8');
const match = envContent.match(/DATABASE_URL=(.+)/);
if (!match) { console.error('No se encontró DATABASE_URL en .env.local'); process.exit(1); }

const [email, password] = process.argv.slice(2);
if (!email || !password) {
  console.error('Uso: node scripts/set-admin-password.mjs <email> <contraseña>');
  process.exit(1);
}

const hash = await bcrypt.hash(password, 10);
const pool = new pg.Pool({
  connectionString: match[1].trim(),
  ssl: { rejectUnauthorized: false },
});

const result = await pool.query(
  `UPDATE usuarios_admin SET password_hash = $1 WHERE email = $2 RETURNING email`,
  [hash, email]
);

if (result.rows.length === 0) {
  console.error(`❌ No se encontró ningún admin con el email: ${email}`);
} else {
  console.log(`✅ Contraseña actualizada para ${email}`);
}

await pool.end();
