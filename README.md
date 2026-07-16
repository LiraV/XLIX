# Портал Ордена XLIX

Закрытый портал масонского ордена: вход по «слову доверия», личный кабинет,
устав, календарь собраний и дома-хранители. Плюс админ-панель (CMS) для
редактирования всего контента.

**Архитектура**

- **Фронтенд** — статический сайт (HTML/CSS/JS, без сборки) → **GitHub Pages**.
- **Бэкенд** — одна **Yandex Cloud Function** (Node.js) как API.
- **База данных** — **Yandex Managed Service for PostgreSQL**.

```
Браузер ──POST JSON──▶ Cloud Function ──SQL──▶ Managed PostgreSQL
(GitHub Pages)          (functions.yandexcloud.net)
```

```
ordo-xlix/
├── index.html          # портал (экран входа + разделы)
├── app.js              # логика фронтенда, запросы к API
├── config.js           # адрес API (прод) / автолокалка на localhost
├── styles.css          # дизайн-система (перенесена из исходника)
├── admin/index.html    # CMS: вход + CRUD по всем разделам
├── uploads/sign.jpg    # изображение жетона
└── backend/
    ├── function/       # код Cloud Function (index.js + package.json)
    ├── db/             # schema.sql, seed.sql, seed-users.js
    └── local-server.js # локальный dev-сервер (in-memory, без облака)
```

---

## Локальный запуск (без облака)

```bash
node backend/local-server.js
# откройте http://localhost:8787
```

`config.js` на `localhost` сам берёт локальный сервер. Данные — в памяти (сид из
дизайна). Учётные данные:

- Слово доверия участника: **`XLIX`**
- Админка (`/admin/`): логин **`magister`**, пароль **`magister`**

---

## Деплой БД — Yandex Managed Service for PostgreSQL

1. В [консоли Yandex Cloud](https://console.yandex.cloud/) → **Managed Service
   for PostgreSQL** → создайте кластер (для начала хватит 1 хоста, PostgreSQL 16).
   Создайте БД `ordo` и пользователя `ordo` с паролем.
2. Разрешите подключения: включите у хоста **публичный доступ** (или разверните
   функцию в той же сети — см. ниже) и порт пула соединений **6432**.
3. Скачайте корневой сертификат YC:
   ```bash
   mkdir -p ~/.postgresql
   curl -o ~/.postgresql/root.crt https://storage.yandexcloud.net/cloud-certs/CA.pem
   ```
4. Примените схему и контент:
   ```bash
   PGSSLMODE=verify-full \
   psql "host=<FQDN хоста> port=6432 dbname=ordo user=ordo sslmode=verify-full" \
        -f backend/db/schema.sql
   psql "host=<FQDN хоста> port=6432 dbname=ordo user=ordo sslmode=verify-full" \
        -f backend/db/seed.sql
   ```
5. Создайте участника и администратора (пароли хэшируются):
   ```bash
   cd backend/function && npm install && cd ../..
   PGHOST=<FQDN> PGPORT=6432 PGDATABASE=ordo PGUSER=ordo PGPASSWORD=<пароль> \
   PG_CA="$(cat ~/.postgresql/root.crt)" \
   MEMBER_PASSWORD="XLIX" ADMIN_LOGIN="magister" ADMIN_PASSWORD="<надёжный-пароль>" \
   node backend/db/seed-users.js
   ```

---

## Деплой API — Yandex Cloud Function

1. Соберите архив функции (код + зависимость `pg`):
   ```bash
   cd backend/function
   npm install
   zip -r ../function.zip index.js package.json node_modules
   cd ../..
   ```
2. В консоли → **Cloud Functions** → создайте функцию, среда выполнения
   **`nodejs18`** (или новее), точка входа **`index.handler`**. Загрузите
   `backend/function.zip`.
3. Задайте переменные окружения функции:

   | Переменная    | Значение |
   |---------------|----------|
   | `PGHOST`      | FQDN хоста PostgreSQL |
   | `PGPORT`      | `6432` |
   | `PGDATABASE`  | `ordo` |
   | `PGUSER`      | `ordo` |
   | `PGPASSWORD`  | пароль пользователя |
   | `PG_CA`       | содержимое `~/.postgresql/root.crt` (PEM целиком) |
   | `JWT_SECRET`  | длинная случайная строка |
   | `ALLOW_ORIGIN`| `https://<ваш-логин>.github.io` |

   > Если кластер PostgreSQL **без** публичного доступа — привяжите функцию к той
   > же сети/подсети (раздел «Сеть» функции), тогда `PG_CA` можно не задавать
   > (в коде тогда используется `rejectUnauthorized:false`), но безопаснее оставить.

4. Сделайте функцию **публичной** и скопируйте её URL вида
   `https://functions.yandexcloud.net/d4xxxxxxxxxxxxxxxxxx`.

> Альтернатива: повесить перед функцией **API Gateway** — тогда будет красивый
> путь. Для текущего фронтенда это не требуется: он шлёт всё одним POST'ом на
> URL функции.

---

## Деплой фронтенда — GitHub Pages

1. Впишите URL функции в `config.js` вместо `REPLACE_WITH_YANDEX_CLOUD_FUNCTION_URL`.
2. Создайте новый репозиторий на GitHub и запушьте туда содержимое этой папки
   (см. ниже).
3. В репозитории → **Settings → Pages → Source: GitHub Actions**. Воркфлоу
   `.github/workflows/deploy.yml` опубликует сайт при пуше в `main`.
4. Сайт: `https://<логин>.github.io/<репозиторий>/`,
   админка: `.../admin/`.

### Первый пуш

```bash
cd ordo-xlix
git init
git add .
git commit -m "Портал Ордена XLIX: сайт + Yandex Cloud API"
git branch -M main
git remote add origin git@github.com:<логин>/ordo-xlix.git
git push -u origin main
```

---

## API (справочно)

Все запросы — `POST` на URL функции, тело `{ action, token?, ...payload }`.

| action | доступ | payload | ответ |
|--------|--------|---------|-------|
| `auth` | — | `{password}` | `{token, member}` |
| `content` | участник | — | `{rules, meetings, keepers, member}` |
| `admin.login` | — | `{login, password}` | `{token}` |
| `admin.list` | админ | `{resource}` | `{items}` |
| `admin.create` | админ | `{resource, data}` | `{item}` |
| `admin.update` | админ | `{resource, id, data}` | `{item}` |
| `admin.delete` | админ | `{resource, id}` | `{deleted}` |
| `admin.member_password` | админ | `{id, password}` | `{updated}` |

`resource` ∈ `members` · `meetings` · `keepers` · `rules`.
Токены — HMAC-JWT (12 ч), пароли — scrypt.

## Безопасность

- Пароли участников и админов хранятся как scrypt-хэши, не в открытом виде.
- Все админ-действия и `content` требуют валидный JWT — проверено.
- `ALLOW_ORIGIN` ограничивает CORS вашим доменом GitHub Pages.
- Смените дефолтные пароли (`XLIX`, `magister`) при первом деплое.
