/* Создаёт первого участника и администратора CMS с хэшированными паролями.
 * Запускается локально с доступом к кластеру PostgreSQL:
 *
 *   cd backend/function && npm install        # нужен пакет pg
 *   PGHOST=... PGPORT=6432 PGDATABASE=ordo PGUSER=ordo PGPASSWORD=... \
 *   PG_CA="$(cat ~/.postgresql/root.crt)" \
 *   MEMBER_PASSWORD="XLIX" ADMIN_LOGIN="magister" ADMIN_PASSWORD="..." \
 *   node ../db/seed-users.js
 *
 * scrypt-хэш совместим с проверкой в function/index.js (формат scrypt$salt$hash).
 */
"use strict";
const crypto = require("crypto");
const path = require("path");
const { Pool } = require(path.join(__dirname, "..", "function", "node_modules", "pg"));

function hash(password) {
  const salt = crypto.randomBytes(16);
  const h = crypto.scryptSync(password, salt, 32);
  return `scrypt$${salt.toString("hex")}$${h.toString("hex")}`;
}

async function main() {
  const memberPw = process.env.MEMBER_PASSWORD || "XLIX";
  const adminLogin = process.env.ADMIN_LOGIN || "magister";
  const adminPw = process.env.ADMIN_PASSWORD;
  if (!adminPw) { console.error("Задайте ADMIN_PASSWORD"); process.exit(1); }

  const pool = new Pool({
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT || 6432),
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    ssl: process.env.PG_CA ? { ca: process.env.PG_CA, rejectUnauthorized: true } : { rejectUnauthorized: false },
  });

  // Первый участник — «Брат А.» из дизайна.
  await pool.query(
    `INSERT INTO members (name, token_number, degree, line, admitted, status, password_hash)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    ["Брат А.", "XLIX-07", "Хранитель второго круга", "Дом Верден, четвёртое поколение",
     "MMXXVI · по личному выбору хранителя", "Действителен", hash(memberPw)]
  );

  await pool.query(
    `INSERT INTO admins (login, password_hash) VALUES ($1,$2)
     ON CONFLICT (login) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
    [adminLogin, hash(adminPw)]
  );

  await pool.end();
  console.log(`Готово. Участник «Брат А.» (слово доверия: ${memberPw}), админ: ${adminLogin}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
