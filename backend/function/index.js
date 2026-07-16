/* Yandex Cloud Function — API портала Ордена XLIX.
 *
 * Единая точка входа: все запросы приходят POST'ом с телом
 *   { action: string, token?: string, ...payload }
 * Ответ: { ok: true, ...data } либо { ok: false, error } с нужным статусом.
 *
 * Хранилище — Yandex Managed Service for PostgreSQL (через пакет `pg`).
 * Аутентификация — scrypt-хэши паролей и HMAC-JWT на встроенном `crypto`,
 * поэтому единственная внешняя зависимость — `pg` (быстрый холодный старт).
 *
 * Переменные окружения функции:
 *   PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD — доступ к кластеру PG
 *   PG_CA           — содержимое корневого сертификата YC (PEM), для sslmode verify-full
 *   JWT_SECRET      — секрет для подписи токенов
 *   ALLOW_ORIGIN    — источник для CORS (например https://<user>.github.io); по умолчанию '*'
 */

"use strict";
const crypto = require("crypto");
const { Pool } = require("pg");

const ALLOW_ORIGIN = process.env.ALLOW_ORIGIN || "*";
const JWT_SECRET = process.env.JWT_SECRET || "change-me";

/* ── пул соединений (переживает тёплые вызовы функции) ───────────────────── */
let pool;
function db() {
  if (!pool) {
    pool = new Pool({
      host: process.env.PGHOST,
      port: Number(process.env.PGPORT || 6432),
      database: process.env.PGDATABASE,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      max: 2,
      idleTimeoutMillis: 5000,
      connectionTimeoutMillis: 8000,
      ssl: process.env.PG_CA
        ? { ca: process.env.PG_CA, rejectUnauthorized: true }
        : { rejectUnauthorized: false },
    });
  }
  return pool;
}

/* ── криптография: scrypt-хэши и HMAC-JWT ────────────────────────────────── */
function verifyPassword(password, stored) {
  // формат: scrypt$<saltHex>$<hashHex>
  const [scheme, saltHex, hashHex] = String(stored || "").split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const actual = crypto.scryptSync(password, salt, expected.length);
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function b64url(buf) {
  return Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function signJwt(payload, ttlSeconds = 60 * 60 * 12) {
  // exp кладём в токен; iat опускаем, т.к. в среде функции нельзя полагаться на часы для nbf
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify({ ...payload, exp: nowSec() + ttlSeconds }));
  const sig = b64url(crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest());
  return `${header}.${body}.${sig}`;
}
function verifyJwt(token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const expected = b64url(crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest());
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  let payload;
  try { payload = JSON.parse(Buffer.from(body.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString()); }
  catch (_) { return null; }
  if (payload.exp && payload.exp < nowSec()) return null;
  return payload;
}
function nowSec() { return Math.floor(Date.now() / 1000); }

/* ── доступы ─────────────────────────────────────────────────────────────── */
function requireMember(token) {
  const p = verifyJwt(token);
  if (!p || p.kind !== "member") throw httpError(401, "Требуется вход участника");
  return p;
}
function requireAdmin(token) {
  const p = verifyJwt(token);
  if (!p || p.kind !== "admin") throw httpError(401, "Требуется вход администратора");
  return p;
}
function httpError(status, message) { const e = new Error(message); e.status = status; return e; }

function memberPublic(row) {
  return {
    id: row.id, name: row.name, token_number: row.token_number,
    degree: row.degree, line: row.line, admitted: row.admitted, status: row.status,
  };
}

/* ── обработчики действий ────────────────────────────────────────────────── */
const handlers = {
  // Вход участника по «слову доверия». Проверяем хэши всех участников.
  async auth({ password }) {
    if (!password) throw httpError(400, "Пустой пароль");
    const { rows } = await db().query("SELECT * FROM members ORDER BY id");
    const member = rows.find((r) => verifyPassword(password, r.password_hash));
    if (!member) throw httpError(401, "Знак не признан");
    const token = signJwt({ kind: "member", sub: member.id });
    return { token, member: memberPublic(member) };
  },

  // Контент кабинета: устав, собрания, хранители + свежий профиль участника.
  async content({ _auth }) {
    const [rules, meetings, keepers, me] = await Promise.all([
      db().query("SELECT num, title, text FROM rules ORDER BY sort, id"),
      db().query("SELECT date, title, note, house, access, tag_class FROM meetings ORDER BY sort, id"),
      db().query("SELECT name, since, duty, heir FROM keepers ORDER BY sort, id"),
      db().query("SELECT * FROM members WHERE id = $1", [_auth.sub]),
    ]);
    return {
      rules: rules.rows,
      meetings: meetings.rows,
      keepers: keepers.rows,
      member: me.rows[0] ? memberPublic(me.rows[0]) : null,
    };
  },

  // Вход администратора CMS.
  async ["admin.login"]({ login, password }) {
    const { rows } = await db().query("SELECT * FROM admins WHERE login = $1", [login]);
    const admin = rows[0];
    if (!admin || !verifyPassword(password, admin.password_hash)) throw httpError(401, "Неверный логин или пароль");
    const token = signJwt({ kind: "admin", sub: admin.id, login: admin.login });
    return { token };
  },

  // Списки для админки (тянут все поля).
  async ["admin.list"]({ _adminAuth, resource }) {
    const t = table(resource);
    const { rows } = await db().query(`SELECT * FROM ${t.name} ORDER BY ${t.order}`);
    return { items: rows.map(t.strip) };
  },

  async ["admin.create"]({ _adminAuth, resource, data }) {
    const t = table(resource);
    const cols = t.cols;
    const vals = cols.map((c) => data[c]);
    const ph = cols.map((_, i) => `$${i + 1}`).join(", ");
    const { rows } = await db().query(
      `INSERT INTO ${t.name} (${cols.join(", ")}) VALUES (${ph}) RETURNING *`, vals);
    return { item: t.strip(rows[0]) };
  },

  async ["admin.update"]({ _adminAuth, resource, id, data }) {
    const t = table(resource);
    const cols = t.cols.filter((c) => c in data);
    if (!cols.length) throw httpError(400, "Нет полей для обновления");
    const set = cols.map((c, i) => `${c} = $${i + 1}`).join(", ");
    const vals = cols.map((c) => data[c]);
    vals.push(id);
    const { rows } = await db().query(
      `UPDATE ${t.name} SET ${set} WHERE id = $${cols.length + 1} RETURNING *`, vals);
    if (!rows[0]) throw httpError(404, "Запись не найдена");
    return { item: t.strip(rows[0]) };
  },

  async ["admin.delete"]({ _adminAuth, resource, id }) {
    const t = table(resource);
    await db().query(`DELETE FROM ${t.name} WHERE id = $1`, [id]);
    return { deleted: id };
  },

  // Смена «слова доверия» участника (админ). Пароль хэшируется на лету.
  async ["admin.member_password"]({ _adminAuth, id, password }) {
    if (!password) throw httpError(400, "Пустой пароль");
    const salt = crypto.randomBytes(16);
    const hash = crypto.scryptSync(password, salt, 32);
    const stored = `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
    const { rowCount } = await db().query("UPDATE members SET password_hash = $1 WHERE id = $2", [stored, id]);
    if (!rowCount) throw httpError(404, "Участник не найден");
    return { updated: id };
  },
};

/* Белый список таблиц/полей для админ-CRUD — защита от инъекций в имена. */
function table(resource) {
  const map = {
    members: { name: "members", order: "id", cols: ["name", "token_number", "degree", "line", "admitted", "status"],
      strip: (r) => { const { password_hash, ...rest } = r; return rest; } },
    rules:    { name: "rules",    order: "sort, id", cols: ["num", "title", "text", "sort"], strip: (r) => r },
    meetings: { name: "meetings", order: "sort, id", cols: ["date", "title", "note", "house", "access", "tag_class", "sort"], strip: (r) => r },
    keepers:  { name: "keepers",  order: "sort, id", cols: ["name", "since", "duty", "heir", "sort"], strip: (r) => r },
  };
  const t = map[resource];
  if (!t) throw httpError(400, "Неизвестный ресурс");
  return t;
}

/* ── точка входа Yandex Cloud Function ───────────────────────────────────── */
const CORS = {
  "Access-Control-Allow-Origin": ALLOW_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

module.exports.handler = async function (event) {
  const method = (event && (event.httpMethod || event.method)) || "POST";
  if (method === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };
  if (method !== "POST") return reply(405, { ok: false, error: "Только POST" });

  let req;
  try {
    const raw = event && event.body ? (event.isBase64Encoded ? Buffer.from(event.body, "base64").toString() : event.body) : "{}";
    req = JSON.parse(raw || "{}");
  } catch (_) { return reply(400, { ok: false, error: "Некорректный JSON" }); }

  const action = req.action;
  const handler = handlers[action];
  if (!handler) return reply(404, { ok: false, error: "Неизвестное действие" });

  try {
    // Разграничение доступа по префиксу действия
    if (action.startsWith("admin.") && action !== "admin.login") req._adminAuth = requireAdmin(req.token);
    if (action === "content") req._auth = requireMember(req.token);

    const data = await handler(req);
    return reply(200, { ok: true, ...data });
  } catch (e) {
    const status = e.status || 500;
    if (status >= 500) console.error(e);
    return reply(status, { ok: false, error: e.message || "Внутренняя ошибка" });
  }
};

function reply(statusCode, obj) {
  return { statusCode, headers: CORS, body: JSON.stringify(obj) };
}
