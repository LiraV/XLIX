-- Схема БД Ордена XLIX для Yandex Managed Service for PostgreSQL.
-- Применяется один раз к созданной БД:
--   psql "host=... port=6432 dbname=ordo user=ordo sslmode=verify-full" -f schema.sql

-- Участники Ордена. Вход по «слову доверия» (password_hash).
CREATE TABLE IF NOT EXISTS members (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,                       -- «Брат А.»
  token_number  TEXT NOT NULL,                       -- «XLIX-07»
  degree        TEXT,                                -- «Хранитель второго круга»
  line          TEXT,                                -- «Дом Верден, четвёртое поколение»
  admitted      TEXT,                                -- «MMXXVI · по личному выбору хранителя»
  status        TEXT NOT NULL DEFAULT 'Действителен',
  password_hash TEXT NOT NULL,                        -- scrypt-хэш слова доверия
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Устав (разделы устава).
CREATE TABLE IF NOT EXISTS rules (
  id    SERIAL PRIMARY KEY,
  num   TEXT NOT NULL,          -- «I», «II» …
  title TEXT NOT NULL,
  text  TEXT NOT NULL,
  sort  INT NOT NULL DEFAULT 0
);

-- Собрания капитула.
CREATE TABLE IF NOT EXISTS meetings (
  id        SERIAL PRIMARY KEY,
  date      TEXT NOT NULL,       -- «23 июля 2026, 21:49»
  title     TEXT NOT NULL,
  note      TEXT,
  house     TEXT,
  access    TEXT,
  tag_class TEXT NOT NULL DEFAULT 'tag tag-outline',
  sort      INT NOT NULL DEFAULT 0
);

-- Дома-хранители.
CREATE TABLE IF NOT EXISTS keepers (
  id    SERIAL PRIMARY KEY,
  name  TEXT NOT NULL,
  since TEXT,
  duty  TEXT,
  heir  TEXT,
  sort  INT NOT NULL DEFAULT 0
);

-- Администраторы CMS (вход в /admin).
CREATE TABLE IF NOT EXISTS admins (
  id            SERIAL PRIMARY KEY,
  login         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
