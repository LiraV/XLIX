/* Портал Ордена XLIX — статический фронтенд для GitHub Pages.
   Данные (участник, устав, собрания, хранители) приходят из Yandex Cloud
   Function (см. config.js → window.ORDO_API). Токен сессии хранится в
   sessionStorage. Внешний вид повторяет исходный дизайн один в один. */

const API = window.ORDO_API;
const TOKEN_IMG = "./uploads/sign.jpg";

const state = {
  token: sessionStorage.getItem("ordo_token") || null,
  member: safeParse(sessionStorage.getItem("ordo_member")),
  content: null,          // { rules, meetings, keepers }
  tab: "cabinet",
  pw: "",
  pwError: false,
  loading: false,
  overlay: false,
  flipped: false,
  buf: "",
};

const app = document.getElementById("app");

/* ── работа с сетью ─────────────────────────────────────────────────────── */

async function api(action, payload = {}) {
  if (!API || API.startsWith("REPLACE_WITH")) {
    throw new Error("API не настроен. Укажите адрес функции в config.js");
  }
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, token: state.token, ...payload }),
  });
  let data = {};
  try { data = await res.json(); } catch (_) {}
  if (!res.ok || data.ok === false) {
    const err = new Error(data.error || `Ошибка ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

/* ── переходы состояния ─────────────────────────────────────────────────── */

async function submitPw() {
  const v = state.pw.trim();
  if (!v) return;
  state.loading = true; state.pwError = false; render();
  try {
    const { token, member } = await api("auth", { password: v });
    state.token = token;
    state.member = member;
    sessionStorage.setItem("ordo_token", token);
    sessionStorage.setItem("ordo_member", JSON.stringify(member));
    await loadContent();
  } catch (e) {
    state.pwError = true;
  } finally {
    state.loading = false; render();
  }
}

async function loadContent() {
  const { rules, meetings, keepers, member } = await api("content");
  state.content = { rules, meetings, keepers };
  if (member) state.member = member;
}

function logout() {
  state.token = null; state.member = null; state.content = null; state.pw = "";
  sessionStorage.removeItem("ordo_token");
  sessionStorage.removeItem("ordo_member");
  render();
}

/* ── рендер ─────────────────────────────────────────────────────────────── */

function render() {
  app.innerHTML = state.token && state.member ? viewUnlocked() : viewLocked();
  bind();
}

function viewLocked() {
  return `
  <div style="min-height:100vh;background:#181410;display:flex;align-items:center;justify-content:center;padding:48px 24px;font-family:'Lora',serif;color:#e9e1d2">
    <div style="max-width:400px;width:100%;text-align:center;animation:sealFade .8s ease both">
      <div style="font-family:'Cormorant Garamond',serif;font-size:14px;letter-spacing:.38em;text-transform:uppercase;color:#e1ad66">Sigillum XLIX</div>
      <figure style="margin:28px 0">
        <img src="${TOKEN_IMG}" alt="Знак 49" style="width:100%;border:1px solid rgba(225,173,102,.3);padding:7px;background:#211b15">
        <figcaption style="font-size:11px;color:#8d8371;margin-top:8px;letter-spacing:.06em">Жетон № XLIX-01 · орех · без надписей на обороте</figcaption>
      </figure>
      <h1 style="font-family:'Cormorant Garamond',serif;font-weight:400;font-size:36px;margin:0 0 10px;color:#f0e8d8">Предъявите знак</h1>
      <p style="font-size:14px;line-height:1.75;color:#b3a88f;margin:0 0 26px">Вход в капитул открыт лишь тем, кому знак был оставлен. Назовите слово, переданное вместе с жетоном.</p>
      <div style="display:flex;gap:10px">
        <input id="pw" type="password" placeholder="Слово доверия" value="${esc(state.pw)}" ${state.loading ? "disabled" : ""}
          style="flex:1;min-height:40px;padding:6px 12px;font:inherit;font-size:14px;color:#e9e1d2;caret-color:#e1ad66;background:transparent;border:1px solid rgba(233,225,210,.28);border-radius:4px">
        <button id="submit" ${state.loading ? "disabled" : ""}
          style="cursor:pointer;font-family:'Cormorant Garamond',serif;font-weight:600;font-size:14px;letter-spacing:.05em;color:#e1ad66;background:transparent;border:1px solid #e1ad66;border-radius:4px;padding:0 18px">
          ${state.loading ? "…" : "Предъявить"}
        </button>
      </div>
      ${state.pwError ? `<p style="font-size:13px;color:#c98a6a;margin:14px 0 0;font-style:italic">Signum falsum est. Знак не признан.</p>` : ""}
      <div style="margin-top:44px;border-top:1px solid rgba(233,225,210,.14);padding-top:18px">
        <p style="font-family:'Cormorant Garamond',serif;font-size:17px;color:#cdbfa2;margin:0">«Non eligis XLIX. XLIX eligit te.»</p>
        <p style="font-size:11px;color:#8d8371;margin:6px 0 0;letter-spacing:.05em">Не ты выбираешь XLIX. XLIX выбирает тебя.</p>
      </div>
    </div>
  </div>`;
}

function viewUnlocked() {
  const m = state.member || {};
  const c = state.content || { rules: [], meetings: [], keepers: [] };
  const cur = (t) => (state.tab === t ? 'aria-current="page"' : "");
  const nearest = c.meetings[0];

  const cabinet = `
    <div style="font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:#a06f24;font-feature-settings:'tnum'">Личный кабинет · Circulus interior</div>
    <h1 style="font-weight:400;font-size:46px;margin:8px 0 6px">Salve, ${esc(m.name || "")}</h1>
    <p class="text-muted" style="font-size:15px;max-width:56ch">Ваше присутствие подтверждено предъявлением знака. Имя при входе не называется — жетон говорит за вас.</p>
    <hr class="hr">
    <div style="display:grid;grid-template-columns:300px 1fr;gap:36px;align-items:start" class="cab-grid">
      <figure>
        <img class="plate" src="${TOKEN_IMG}" alt="Жетон члена Ордена">
        <figcaption>Ваш жетон. Следы времени не подлежат реставрации — они отражают историю владельцев.</figcaption>
      </figure>
      <div style="display:flex;flex-direction:column;gap:20px">
        <table class="table"><tbody>
          <tr><td class="text-muted" style="width:180px">Степень</td><td>${esc(m.degree || "—")}</td></tr>
          <tr><td class="text-muted">Жетон</td><td style="font-feature-settings:'tnum'">№ ${esc(m.token_number || "—")} · орех, ручная резьба</td></tr>
          <tr><td class="text-muted">Линия</td><td>${esc(m.line || "—")}</td></tr>
          <tr><td class="text-muted">Принят</td><td>${esc(m.admitted || "—")}</td></tr>
          <tr><td class="text-muted">Статус</td><td><span class="tag tag-accent">${esc(m.status || "Действителен")}</span></td></tr>
        </tbody></table>
        ${nearest ? `
        <div class="card">
          <div class="card-kicker">Ближайшее собрание</div>
          <div class="card-title">${esc(nearest.title)} · ${esc(nearest.date)}</div>
          <p class="card-body">${esc(nearest.note || "")} Жетон предъявляется при входе вместо имени. Опоздавшие не допускаются.</p>
        </div>` : ""}
        <p style="font-family:'Cormorant Garamond',serif;font-size:19px;color:#605d5d;font-style:italic;margin:0">«Тот, кто способен увидеть обе сорок девятки одновременно, уже находится на полпути.»</p>
      </div>
    </div>`;

  const statut = `
    <div style="font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:#a06f24">Устав · Lex tacita</div>
    <h1 style="font-weight:400;font-size:46px;margin:8px 0 6px">Устав Ордена</h1>
    <p class="text-muted" style="font-size:15px;max-width:56ch">Орден не ведёт списков, не выдаёт документов и не ставит печатей. Единственным доказательством доверия остаётся жетон «49». Устав передаётся устно; здесь изложено лишь то, что дозволено записи.</p>
    <hr class="hr">
    <div style="max-width:640px;display:flex;flex-direction:column;gap:26px">
      ${c.rules.map((r) => `
        <div style="display:grid;grid-template-columns:64px 1fr;gap:20px;border-bottom:1px solid rgba(32,31,29,.1);padding-bottom:22px">
          <div style="font-family:'Cormorant Garamond',serif;font-size:32px;color:#c28d41;font-feature-settings:'tnum';line-height:1">${esc(r.num)}</div>
          <div>
            <div style="font-family:'Cormorant Garamond',serif;font-weight:600;font-size:19px;margin-bottom:4px">${esc(r.title)}</div>
            <p style="font-size:14px;line-height:1.7;text-align:justify;margin:0" class="text-muted">${esc(r.text)}</p>
          </div>
        </div>`).join("")}
      <p style="font-family:'Cormorant Garamond',serif;font-size:18px;font-style:italic;color:#605d5d">Silentium et fides. Остальное — не для письма.</p>
    </div>`;

  const meetings = `
    <div style="font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:#a06f24">Собрания · Conventus</div>
    <h1 style="font-weight:400;font-size:46px;margin:8px 0 6px">Календарь капитула</h1>
    <p class="text-muted" style="font-size:15px;max-width:56ch">Собрания не объявляются публично. Время сообщается за семь дней; место — за сорок девять часов. Жетон предъявляется при входе вместо имени.</p>
    <hr class="hr">
    <table class="table">
      <thead><tr><th style="width:190px">Дата</th><th>Собрание</th><th>Дом</th><th style="width:130px">Допуск</th></tr></thead>
      <tbody>
        ${c.meetings.map((mt) => `
          <tr>
            <td style="font-feature-settings:'tnum'">${esc(mt.date)}</td>
            <td><span style="font-family:'Cormorant Garamond',serif;font-weight:600;font-size:16px">${esc(mt.title)}</span><br><span class="text-muted" style="font-size:13px">${esc(mt.note || "")}</span></td>
            <td>${esc(mt.house || "—")}</td>
            <td><span class="${esc(mt.tag_class || "tag tag-outline")}">${esc(mt.access || "")}</span></td>
          </tr>`).join("")}
      </tbody>
    </table>
    <p class="text-muted" style="font-size:12px;margin-top:18px;font-style:italic">Отсутствие без передачи жетона доверенному лицу трактуется как молчаливый выход из круга.</p>`;

  const keepers = `
    <div style="font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:#a06f24">Семьи-хранители · Custodes</div>
    <h1 style="font-weight:400;font-size:46px;margin:8px 0 6px">Дома-хранители</h1>
    <p class="text-muted" style="font-size:15px;max-width:56ch">Знаки передаются внутри семей-хранителей. Каждое поколение выбирает лишь одного наследника, которому доверяется право однажды передать знак следующему человеку.</p>
    <hr class="hr">
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:18px" class="keep-grid">
      ${c.keepers.map((k) => `
        <div class="card">
          <div class="card-kicker">${esc(k.since || "")}</div>
          <div class="card-title">${esc(k.name)}</div>
          <p class="card-body">${esc(k.duty || "")}</p>
          <div class="card-meta">Наследник поколения: ${esc(k.heir || "—")}</div>
        </div>`).join("")}
    </div>
    <div class="card" style="margin-top:26px;max-width:640px">
      <div class="card-kicker">Из хроник Ордена</div>
      <p class="card-body" style="font-size:14px;line-height:1.7">Большинство известных жетонов несут следы времени — трещины и сколы. В Ордене считается, что повреждения отражают историю владельцев и никогда не должны реставрироваться. Изготовление копий запрещено: ни один жетон не бывает полностью одинаковым.</p>
    </div>`;

  const sections = { cabinet, statut, meetings, keepers };

  return `
  <div style="min-height:100vh;display:flex;flex-direction:column;animation:sealFade .6s ease both">
    <header class="nav">
      <div class="nav-brand" style="letter-spacing:.12em">ORDO XLIX</div>
      <a href="#" data-tab="cabinet" ${cur("cabinet")}>Капитул</a>
      <a href="#" data-tab="statut" ${cur("statut")}>Устав</a>
      <a href="#" data-tab="meetings" ${cur("meetings")}>Собрания</a>
      <a href="#" data-tab="keepers" ${cur("keepers")}>Хранители</a>
      <span class="tag tag-outline" style="font-family:'Cormorant Garamond',serif;letter-spacing:.08em">${esc(m.name || "")}</span>
      <a href="#" id="logout" title="Выйти" style="font-size:13px">Выход</a>
    </header>

    <main style="width:100%;max-width:920px;margin:0 auto;padding:46px 28px 64px;flex:1">
      ${sections[state.tab] || cabinet}
    </main>

    <footer style="border-top:1px solid rgba(32,31,29,.16);padding:22px 28px;display:flex;align-items:center;gap:16px">
      <span style="font-family:'Cormorant Garamond',serif;font-size:15px;color:#605d5d">«Non eligis XLIX. XLIX eligit te.»</span>
      <span style="flex:1"></span>
      <span id="flip" title="…" style="font-family:'Cormorant Garamond',serif;font-size:20px;color:#c28d41;cursor:pointer;user-select:none;display:inline-block;transition:transform .5s ease;font-feature-settings:'tnum';transform:${state.flipped ? "rotate(180deg)" : "none"}">49</span>
      ${state.flipped ? `<span style="font-size:11px;color:#a06f24;font-style:italic">Ты видишь обе. Полпути пройдено.</span>` : ""}
    </footer>
  </div>
  ${state.overlay ? overlayHtml() : ""}`;
}

function overlayHtml() {
  return `
  <div id="overlay" style="position:fixed;inset:0;background:rgba(24,20,16,.96);display:flex;align-items:center;justify-content:center;padding:32px;cursor:pointer;z-index:50;animation:sealFade .5s ease both">
    <div style="max-width:520px;text-align:center;color:#e9e1d2;font-family:'Lora',serif">
      <div style="font-family:'Cormorant Garamond',serif;font-size:13px;letter-spacing:.35em;text-transform:uppercase;color:#e1ad66;margin-bottom:22px">Visio duplex</div>
      <p style="font-family:'Cormorant Garamond',serif;font-size:30px;line-height:1.4;margin:0 0 18px">«Тот, кто способен увидеть обе сорок девятки одновременно, уже находится на полпути.»</p>
      <p style="font-size:12px;color:#8d8371;letter-spacing:.06em">Вы набрали 49, не будучи спрошены. Архив это запомнит. · прикоснитесь, чтобы закрыть</p>
    </div>
  </div>`;
}

/* ── обработчики ────────────────────────────────────────────────────────── */

function bind() {
  const pw = document.getElementById("pw");
  if (pw) {
    pw.oninput = (e) => { state.pw = e.target.value; state.pwError = false; };
    pw.onkeydown = (e) => { if (e.key === "Enter") submitPw(); };
    if (!state.loading) pw.focus();
  }
  const submit = document.getElementById("submit");
  if (submit) submit.onclick = submitPw;

  document.querySelectorAll("[data-tab]").forEach((el) => {
    el.onclick = (e) => { e.preventDefault(); state.tab = el.dataset.tab; render(); };
  });

  const logoutEl = document.getElementById("logout");
  if (logoutEl) logoutEl.onclick = (e) => { e.preventDefault(); logout(); };

  const flip = document.getElementById("flip");
  if (flip) flip.onclick = () => { state.flipped = !state.flipped; render(); };

  const overlay = document.getElementById("overlay");
  if (overlay) overlay.onclick = () => { state.overlay = false; render(); };
}

// Пасхалка: набор «49» на клавиатуре открывает оверлей
window.addEventListener("keydown", (e) => {
  const t = e.target;
  if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
  if (e.key.length !== 1) return;
  const buf = (state.buf + e.key).slice(-2);
  if (buf === "49") { state.overlay = true; state.buf = ""; render(); }
  else state.buf = buf;
});

/* ── утилиты ────────────────────────────────────────────────────────────── */

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function safeParse(s) { try { return JSON.parse(s); } catch (_) { return null; } }

/* ── старт ──────────────────────────────────────────────────────────────── */

(async function init() {
  if (state.token && state.member) {
    try { await loadContent(); }
    catch (e) { if (e.status === 401) logout(); }
  }
  render();
})();
