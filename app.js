/* Портал Ордена XLIX — статический фронтенд для GitHub Pages.
   Данные (участник, устав, собрания, хранители) приходят из Yandex Cloud
   Function (см. config.js → window.ORDO_API). Токен сессии хранится в
   sessionStorage. Внешний вид повторяет исходный дизайн один в один. */

const API = window.ORDO_API;
const TOKEN_IMG = "./uploads/sign.jpg?v=2";

/* ── масонская символика (линейные SVG, наследуют currentColor) ──────────── */
const SVG = {
  "square-compass": `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 40 L24 10 L39 40"/><path d="M39 8 L14 40 M9 8 L34 40"/><circle cx="24" cy="8" r="1.6" fill="currentColor" stroke="none"/><path d="M17 40h14"/><text x="24" y="34" font-size="7" text-anchor="middle" fill="currentColor" stroke="none" font-family="serif">G</text></svg>`,
  "eye": `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"><path d="M24 8 L40 38 H8 Z"/><path d="M16 27 q8 -8 16 0 q-8 8 -16 0Z"/><circle cx="24" cy="27" r="2.4" fill="currentColor" stroke="none"/><g stroke-width="1"><path d="M24 4v-3M35 9l2-2M13 9l-2-2M40 20l3-1M8 20l-3-1"/></g></svg>`,
  "columns": `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"><g><rect x="9" y="14" width="8" height="24"/><path d="M7 14h12M7 38h12M11 18v16M15 18v16"/><circle cx="13" cy="10" r="3"/></g><g><rect x="31" y="14" width="8" height="24"/><path d="M29 14h12M29 38h12M33 18v16M37 18v16"/><circle cx="35" cy="10" r="3"/></g></svg>`,
  "acacia": `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><path d="M24 42 V14"/><path d="M24 26 q-8 -3 -12 -10 M24 26 q8 -3 12 -10 M24 18 q-6 -2 -9 -8 M24 18 q6 -2 9 -8 M24 34 q-6 -2 -10 -7 M24 34 q6 -2 10 -7"/><circle cx="24" cy="10" r="2"/></svg>`,
  "plumb": `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"><path d="M10 12 H38 L24 40 Z"/><path d="M24 12 V33"/><circle cx="24" cy="36" r="2.4" fill="currentColor" stroke="none"/></svg>`,
  "mosaic": `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1"><rect x="10" y="10" width="28" height="28"/><g fill="currentColor" stroke="none"><rect x="10" y="10" width="7" height="7"/><rect x="24" y="10" width="7" height="7"/><rect x="17" y="17" width="7" height="7"/><rect x="31" y="17" width="7" height="7"/><rect x="10" y="24" width="7" height="7"/><rect x="24" y="24" width="7" height="7"/><rect x="17" y="31" width="7" height="7"/><rect x="31" y="31" width="7" height="7"/></g></svg>`,
  "trowel": `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"><path d="M8 12 L30 12 L14 34 Z"/><path d="M22 20 L34 32 M32 30 q6 4 8 8"/></svg>`,
  "hourglass": `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"><path d="M14 8h20M14 40h20"/><path d="M14 8 Q14 24 24 24 Q34 24 34 8 M14 40 Q14 24 24 24 Q34 24 34 40"/></svg>`,
  "delta": `<svg viewBox="0 0 60 60" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"><path d="M30 10 L52 48 H8 Z"/><g stroke-width="0.9"><path d="M30 5 V0 M44 9 l3-3 M16 9 l-3-3 M52 26 l5-2 M8 26 l-5-2"/></g><text x="30" y="42" font-size="13" text-anchor="middle" fill="currentColor" stroke="none" font-family="serif">49</text></svg>`,
};
function glyph(key) { return SVG[key] || SVG["delta"]; }

/* ── мини-графики (чистый SVG, без внешних библиотек) ────────────────────── */
const CHART_COLORS = ["#c28d41", "#a06f24", "#7d5411", "#dbaf70", "#9b7232", "#605d5d"];

function lineChart(points, opts = {}) {
  const w = opts.w || 620, h = opts.h || 210, pad = { l: 30, r: 12, t: 14, b: 24 };
  const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
  if (!points.length) return "";
  const max = Math.max(...points.map((p) => p.value), 1);
  const x = (i) => pad.l + (points.length < 2 ? 0 : (i / (points.length - 1)) * iw);
  const y = (v) => pad.t + ih - (v / max) * ih;
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points.length - 1).toFixed(1)} ${(pad.t + ih).toFixed(1)} L${x(0).toFixed(1)} ${(pad.t + ih).toFixed(1)} Z`;
  const grid = [0, 0.25, 0.5, 0.75, 1].map((f) => { const yy = (pad.t + ih - f * ih).toFixed(1); return `<line x1="${pad.l}" y1="${yy}" x2="${w - pad.r}" y2="${yy}" stroke="rgba(32,31,29,.08)"/>`; }).join("");
  const dots = points.map((p, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(p.value).toFixed(1)}" r="2.6" fill="#c28d41"/>`).join("");
  const step = Math.max(1, Math.ceil(points.length / 6));
  const labels = points.map((p, i) => (i % step === 0 || i === points.length - 1) ? `<text x="${x(i).toFixed(1)}" y="${h - 7}" font-size="10" text-anchor="middle" fill="#8d8371">${esc(p.label)}</text>` : "").join("");
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" style="display:block;overflow:visible" font-family="'Lora',serif">${grid}<path d="${area}" fill="rgba(194,141,65,.12)"/><path d="${line}" fill="none" stroke="#c28d41" stroke-width="2"/>${dots}${labels}</svg>`;
}

function polarSeg(cx, cy, r, ir, a1, a2) {
  const large = (a2 - a1) > Math.PI ? 1 : 0;
  const p = (rad, a) => [(cx + rad * Math.cos(a)).toFixed(2), (cy + rad * Math.sin(a)).toFixed(2)];
  const [x1, y1] = p(r, a1), [x2, y2] = p(r, a2), [x3, y3] = p(ir, a2), [x4, y4] = p(ir, a1);
  return `M${x1} ${y1} A${r} ${r} 0 ${large} 1 ${x2} ${y2} L${x3} ${y3} A${ir} ${ir} 0 ${large} 0 ${x4} ${y4} Z`;
}
function donutChart(items, opts = {}) {
  const size = opts.size || 180, r = size / 2 - 2, ir = r * 0.56, cx = size / 2, cy = size / 2;
  const total = items.reduce((s, i) => s + Number(i.value || 0), 0) || 1;
  let a = -Math.PI / 2;
  const arcs = items.map((it, idx) => { const a2 = a + (Number(it.value || 0) / total) * 2 * Math.PI; const seg = polarSeg(cx, cy, r, ir, a, a2); a = a2; return `<path d="${seg}" fill="${CHART_COLORS[idx % CHART_COLORS.length]}"/>`; }).join("");
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="display:block">${arcs}<circle cx="${cx}" cy="${cy}" r="${ir - 0.5}" fill="#f3f2f2"/><text x="${cx}" y="${cy - 1}" text-anchor="middle" font-size="20" font-family="'Cormorant Garamond',serif" fill="#c28d41">49</text><text x="${cx}" y="${cy + 14}" text-anchor="middle" font-size="9" fill="#8d8371">сфер</text></svg>`;
}
function barChart(items) {
  const max = Math.max(...items.map((i) => Number(i.value || 0)), 1);
  return `<div style="display:flex;flex-direction:column;gap:9px">${items.map((it, idx) => `
    <div>
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:3px"><span>${esc(it.name)}</span><span class="text-muted" style="font-feature-settings:'tnum'">${esc(it.value)}%</span></div>
      <div style="height:8px;background:rgba(32,31,29,.07);border-radius:4px;overflow:hidden"><div style="height:100%;width:${(Number(it.value) / max * 100).toFixed(1)}%;background:${CHART_COLORS[idx % CHART_COLORS.length]};border-radius:4px"></div></div>
    </div>`).join("")}</div>`;
}

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
  const data = await api("content");
  const { member, ok, ...content } = data;
  state.content = content;
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
  const c = state.content || {};
  const cur = (t) => (state.tab === t ? 'aria-current="page"' : "");
  const nearest = (c.meetings || [])[0];

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
          <p class="card-body">${nearest.house && nearest.house !== "—" ? esc(nearest.house) + ". " : ""}${nearest.note ? esc(nearest.note) + ". " : ""}Жетон предъявляется при входе вместо имени; опоздавшие не допускаются.</p>
        </div>` : ""}
        <p style="font-family:'Cormorant Garamond',serif;font-size:19px;color:#605d5d;font-style:italic;margin:0">«Тот, кто способен увидеть обе сорок девятки одновременно, уже находится на полпути.»</p>
      </div>
    </div>`;

  const statut = `
    <div style="font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:#a06f24">Устав · Lex tacita</div>
    <h1 style="font-weight:400;font-size:46px;margin:8px 0 6px">Устав Ордена</h1>
    <p class="text-muted" style="font-size:15px;max-width:56ch">Орден не выдаёт документов и не ставит печатей. Единственным доказательством доверия остаётся жетон «49». Устав передаётся устно; здесь изложено лишь то, что дозволено записи.</p>
    <hr class="hr">
    <div style="max-width:640px;display:flex;flex-direction:column;gap:26px">
      ${(c.rules || []).map((r) => `
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
        ${(c.meetings || []).map((mt) => `
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
      ${(c.keepers || []).map((k) => `
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

  const sechead = (kicker, title, intro) => `
    <div style="font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:#a06f24">${kicker}</div>
    <h1 style="font-weight:400;font-size:46px;margin:8px 0 6px">${title}</h1>
    <p class="text-muted" style="font-size:15px;max-width:56ch">${intro}</p>
    <hr class="hr">`;

  const symbols = `
    ${sechead("Символы · Arcana", "Язык знаков", "Орден говорит не словами, а символами. Каждый знак — ступень к пониманию; толкование передаётся наставником, здесь изложена лишь его тень.")}
    <div class="grid-2">
      ${(c.symbols || []).map((s) => `
        <div class="card" style="flex-direction:row;gap:16px;align-items:flex-start">
          <div style="width:54px;height:54px;flex:none;color:#c28d41">${glyph(s.glyph)}</div>
          <div>
            <div class="card-title">${esc(s.name)}</div>
            <div class="card-kicker" style="margin:2px 0 6px;color:#a06f24;font-style:italic;text-transform:none;letter-spacing:.04em">${esc(s.latin || "")}</div>
            <p class="card-body">${esc(s.meaning || "")}</p>
          </div>
        </div>`).join("")}
    </div>`;

  const degrees = `
    ${sechead("Степени · Gradus", "Ступени посвящения", "Путь ведёт от грубого камня к совершенному. Ни одна ступень не даётся по просьбе — только по признанию достойного.")}
    <table class="table">
      <thead><tr><th style="width:190px">Степень</th><th>Права</th><th>Обязанности</th></tr></thead>
      <tbody>
        ${(c.degrees || []).map((d) => `
          <tr>
            <td><span style="font-family:'Cormorant Garamond',serif;font-weight:600;font-size:16px">${esc(d.name)}</span><br><span class="text-muted" style="font-size:12px;font-style:italic">${esc(d.latin || "")}</span></td>
            <td class="text-muted">${esc(d.rights || "")}</td>
            <td class="text-muted">${esc(d.duties || "")}</td>
          </tr>`).join("")}
      </tbody>
    </table>`;

  const officers = `
    ${sechead("Офицеры · Officia", "Должности капитула", "Работами руководят семь офицеров и страж у дверей. Имена не называются — за них говорят жетоны.")}
    <table class="table">
      <thead><tr><th style="width:230px">Должность</th><th style="width:120px">Жетон</th><th>Обязанность</th></tr></thead>
      <tbody>
        ${(c.officers || []).map((o) => `
          <tr>
            <td><span style="font-family:'Cormorant Garamond',serif;font-weight:600;font-size:16px">${esc(o.role)}</span><br><span class="text-muted" style="font-size:12px;font-style:italic">${esc(o.latin || "")}</span></td>
            <td style="font-feature-settings:'tnum'">${esc(o.holder || "—")}</td>
            <td class="text-muted">${esc(o.duty || "")}</td>
          </tr>`).join("")}
      </tbody>
    </table>`;

  const chronicle = `
    ${sechead("Летопись · Annales", "Хроника Ордена", "Орден не ведёт публичной истории. Здесь — лишь вехи, которые дозволено помнить вслух.")}
    <div style="max-width:660px">
      ${(c.chronicle || []).map((e) => `
        <div style="display:grid;grid-template-columns:92px 1fr;gap:18px;padding-bottom:24px">
          <div style="text-align:right;font-family:'Cormorant Garamond',serif;font-size:20px;color:#c28d41;font-feature-settings:'tnum';padding-top:2px">${esc(e.year)}</div>
          <div style="border-left:2px solid rgba(194,141,65,.35);padding:0 0 4px 18px;position:relative">
            <span style="position:absolute;left:-6px;top:6px;width:10px;height:10px;border-radius:50%;background:#c28d41;border:2px solid #f3f2f2"></span>
            <div style="font-family:'Cormorant Garamond',serif;font-weight:600;font-size:18px">${esc(e.title)}</div>
            <p class="card-body" style="margin-top:3px">${esc(e.text || "")}</p>
          </div>
        </div>`).join("")}
    </div>`;

  const rituals = `
    ${sechead("Ритуалы · Ritus", "Обряды капитула", "Обряды передаются из уст в уста и не описываются полностью. Здесь назван лишь их порядок и смысл.")}
    <div style="max-width:640px;display:flex;flex-direction:column;gap:22px">
      ${(c.rituals || []).map((r) => `
        <div style="border-bottom:1px solid rgba(32,31,29,.1);padding-bottom:20px">
          <div style="font-family:'Cormorant Garamond',serif;font-weight:600;font-size:19px">${esc(r.name)} <span class="text-muted" style="font-size:13px;font-style:italic">· ${esc(r.latin || "")}</span></div>
          <p class="card-body" style="margin-top:4px">${esc(r.description || "")}</p>
        </div>`).join("")}
    </div>`;

  const regalia = `
    ${sechead("Регалии · Insignia", "Знаки и облачения", "Регалии не украшение, а язык. По ним читают степень и роль брата без единого слова.")}
    <div class="grid-3">
      ${(c.regalia || []).map((r) => `
        <div class="card">
          <div class="card-title">${esc(r.name)}</div>
          <div class="card-kicker" style="color:#a06f24;font-style:italic;text-transform:none;letter-spacing:.04em">${esc(r.latin || "")}</div>
          <p class="card-body">${esc(r.description || "")}</p>
        </div>`).join("")}
    </div>`;

  const archive = `
    ${sechead("Архив · Bibliotheca", "Архив XLIX", "Документы Ордена не покидают Архива. Доступ к каждому определяется степенью; копирование запрещено.")}
    <table class="table">
      <thead><tr><th>Название</th><th style="width:120px">Тип</th><th style="width:150px">Допуск</th><th>Примечание</th></tr></thead>
      <tbody>
        ${(c.archive || []).map((a) => `
          <tr>
            <td><span style="font-family:'Cormorant Garamond',serif;font-weight:600;font-size:15px">${esc(a.title)}</span></td>
            <td class="text-muted">${esc(a.kind || "")}</td>
            <td><span class="tag tag-outline">${esc(a.min_degree || "—")}</span></td>
            <td class="text-muted" style="font-size:13px">${esc(a.note || "")}</td>
          </tr>`).join("")}
      </tbody>
    </table>`;

  const influence = `
    ${sechead("Влияние · Potentia", "Орден и настоящее время", "Старый Орден не исчез — он врос в современный мир. Так Дом Кассель оценивает присутствие XLIX. Цифры символичны, как и всё в Ордене.")}
    <div class="kpi-row">
      ${(c.kpis || []).map((k) => `
        <div class="card kpi"><div class="kpi-val">${esc(k.value)}</div><div class="kpi-label">${esc(k.label)}</div><div class="card-meta">${esc(k.note || "")}</div></div>`).join("")}
    </div>
    <div class="dash-grid">
      <div class="card"><div class="card-kicker">Рост влияния · 1749 → 2026</div>${lineChart((c.growth || []).map((g) => ({ label: g.year, value: Number(g.value) })))}</div>
      <div class="card"><div class="card-kicker">Сферы влияния</div>
        <div style="display:flex;gap:20px;align-items:center;flex-wrap:wrap">
          <div style="flex:none">${donutChart(c.spheres || [])}</div>
          <div style="flex:1;min-width:190px">${barChart(c.spheres || [])}</div>
        </div>
      </div>
    </div>`;

  const dossier = `
    ${sechead("Досье · Dossier", "Личности Ордена", "Раздел содержит легенды, слухи и вымысел. Орден не подтверждает ни одной связи — списков он не ведёт.")}
    <div class="grid-2">
      ${(c.personae || []).map((p) => `
        <div class="card" style="flex-direction:row;gap:16px;align-items:flex-start">
          <div class="monogram">${esc(p.monogram || "·")}</div>
          <div>
            <div class="card-title">${esc(p.name)}</div>
            <div class="card-kicker" style="text-transform:none;letter-spacing:.03em;color:#a06f24">${esc(p.role || "")}${p.era ? " · " + esc(p.era) : ""}</div>
            <p class="card-body" style="margin-top:6px">${esc(p.bio || "")}</p>
            <div class="card-meta" style="font-style:italic">${esc(p.link || "")}</div>
          </div>
        </div>`).join("")}
    </div>`;

  const acta = `
    ${sechead("Бюллетени · Acta", "Хроники нового времени", "Орден говорит редко и намёками. Здесь — то немногое, что просочилось наружу о деньгах, крипте, технологиях и небе.")}
    <div style="display:flex;flex-direction:column;gap:14px;max-width:720px">
      ${(c.bulletins || []).map((b) => `
        <div class="card" style="flex-direction:row;gap:16px;align-items:flex-start">
          <div style="flex:none;width:92px">
            <div style="font-feature-settings:'tnum';font-size:12px;color:#8d8371">${esc(b.date || "")}</div>
            <span class="tag tag-accent" style="margin-top:6px">${esc(b.tag || "")}</span>
          </div>
          <div><div class="card-title" style="font-size:18px">${esc(b.title)}</div><p class="card-body" style="margin-top:4px">${esc(b.text || "")}</p></div>
        </div>`).join("")}
    </div>`;

  const contactSec = `
    ${sechead("Контакт · Contactus", "То, что выше звёзд", "Самая закрытая тема Ордена. Обе сорок девятки, по преданию, глядят в два мира сразу. Ниже — легенды, не подлежащие проверке.")}
    <div class="grid-2">
      ${(c.contact || []).map((x) => `
        <div class="card">
          <div class="card-title">${esc(x.name)}</div>
          <div class="card-kicker" style="text-transform:none;letter-spacing:.03em;color:#a06f24;font-style:italic">${esc(x.latin || "")}</div>
          <p class="card-body">${esc(x.description || "")}</p>
        </div>`).join("")}
    </div>`;

  const sections = { cabinet, influence, dossier, acta, contact: contactSec, statut, degrees, officers, symbols, rituals, regalia, meetings, keepers, chronicle, archive };

  const TABS = [
    ["cabinet", "Капитул"], ["influence", "Влияние"], ["dossier", "Досье"], ["acta", "Бюллетени"], ["contact", "Контакт"],
    ["statut", "Устав"], ["degrees", "Степени"], ["officers", "Офицеры"], ["symbols", "Символы"],
    ["rituals", "Ритуалы"], ["regalia", "Регалии"], ["meetings", "Собрания"],
    ["keepers", "Хранители"], ["chronicle", "Летопись"], ["archive", "Архив"],
  ];

  return `
  <div class="lodge" style="min-height:100vh;display:flex;flex-direction:column;animation:sealFade .6s ease both;position:relative">
    <div class="mosaic-strip" aria-hidden="true"></div>
    <div class="lodge-watermark" aria-hidden="true">${SVG["delta"]}</div>
    <div class="temple-columns" aria-hidden="true"><span>${SVG["columns"]}</span><span>${SVG["columns"]}</span></div>

    <header class="nav">
      <div class="nav-brand" style="letter-spacing:.12em;display:flex;align-items:center;gap:9px">
        <span class="brand-mark">${SVG["square-compass"]}</span>ORDO XLIX
      </div>
      ${TABS.map(([k, label]) => `<a href="#" data-tab="${k}" ${cur(k)}>${label}</a>`).join("")}
      <span class="tag tag-outline" style="font-family:'Cormorant Garamond',serif;letter-spacing:.08em">${esc(m.name || "")}</span>
      <a href="#" id="logout" title="Выйти" style="font-size:13px">Выход</a>
    </header>

    <main style="width:100%;max-width:920px;margin:0 auto;padding:46px 28px 64px;flex:1;position:relative;z-index:1">
      ${sections[state.tab] || cabinet}
    </main>

    <footer style="border-top:1px solid rgba(32,31,29,.16);padding:20px 28px;display:flex;align-items:center;gap:16px;position:relative;z-index:1">
      <span style="font-family:'Cormorant Garamond',serif;font-size:15px;color:#605d5d">«Non eligis XLIX. XLIX eligit te.»</span>
      <span style="flex:1"></span>
      ${state.flipped ? `<span style="font-size:11px;color:#a06f24;font-style:italic">Ты видишь обе. Полпути пройдено.</span>` : ""}
      <span id="flip" title="…" class="footer-delta" style="transform:${state.flipped ? "rotate(180deg)" : "none"}">${SVG["delta"]}</span>
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
