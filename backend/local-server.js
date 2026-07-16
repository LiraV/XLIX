/* Локальный dev-сервер для разработки без Yandex Cloud.
 * Повторяет протокол Cloud Function, но данные держит в памяти (сид из дизайна),
 * а статические файлы отдаёт из корня проекта. Зависимостей нет.
 *
 *   node backend/local-server.js        # http://localhost:8787
 *
 * Слово доверия участника: XLIX   |   Админ: magister / magister
 */
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = 8787;
const ROOT = path.join(__dirname, "..");
const SECRET = "local-dev-secret";

/* ── криптография (совместима с function/index.js) ── */
function makeHash(pw){ const s=crypto.randomBytes(16); const h=crypto.scryptSync(pw,s,32); return `scrypt$${s.toString("hex")}$${h.toString("hex")}`; }
function verifyPassword(pw, stored){
  const [sc,saltHex,hashHex]=String(stored||"").split("$");
  if(sc!=="scrypt"||!saltHex||!hashHex) return false;
  const salt=Buffer.from(saltHex,"hex"), exp=Buffer.from(hashHex,"hex");
  const act=crypto.scryptSync(pw,salt,exp.length);
  return act.length===exp.length && crypto.timingSafeEqual(act,exp);
}
const b64=(b)=>Buffer.from(b).toString("base64").replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
function sign(p){ const h=b64(JSON.stringify({alg:"HS256",typ:"JWT"})); const body=b64(JSON.stringify({...p,exp:Math.floor(Date.now()/1000)+43200})); const s=b64(crypto.createHmac("sha256",SECRET).update(`${h}.${body}`).digest()); return `${h}.${body}.${s}`; }
function verify(t){ const parts=String(t||"").split("."); if(parts.length!==3) return null; const [h,body,s]=parts; const exp=b64(crypto.createHmac("sha256",SECRET).update(`${h}.${body}`).digest()); if(s!==exp) return null; try{ const p=JSON.parse(Buffer.from(body.replace(/-/g,"+").replace(/_/g,"/"),"base64").toString()); if(p.exp&&p.exp<Math.floor(Date.now()/1000)) return null; return p; }catch(_){ return null; } }

/* ── данные в памяти ── */
let seq = 100;
const DB = {
  members: [{ id:1, name:"Брат А.", token_number:"XLIX-07", degree:"Хранитель второго круга",
    line:"Дом Верден, четвёртое поколение", admitted:"MMXXVI · по личному выбору хранителя",
    status:"Действителен", password_hash: makeHash("XLIX") }],
  admins: [{ id:1, login:"magister", password_hash: makeHash("magister") }],
  rules: [
    { id:1, num:"I", title:"Знак не просят", text:"Настоящий знак невозможно получить по собственной просьбе. Его можно только получить от действующего хранителя — незаметно, без слов и без свидетелей.", sort:1 },
    { id:2, num:"II", title:"Копий не существует", text:"Каждый жетон вырезается вручную из дерева. Изготовление копий запрещено; ни один жетон не бывает полностью одинаковым.", sort:2 },
    { id:3, num:"III", title:"Обе сорок девятки", text:"Перевёрнутая «49» — обязательная часть символа и никогда не изображается отдельно. Она есть отражение посвящённого мира, существующего рядом с обычным.", sort:3 },
    { id:4, num:"IV", title:"Жетон вместо имени", text:"Во время закрытых собраний жетон предъявляется при входе вместо имени. Списки участников не ведутся; печати и документы упразднены.", sort:4 },
    { id:5, num:"V", title:"Следы времени священны", text:"Трещины и сколы отражают историю владельцев и никогда не должны реставрироваться.", sort:5 },
    { id:6, num:"VI", title:"Один наследник", text:"Каждое поколение семьи-хранителя выбирает лишь одного наследника, которому доверяется право однажды передать знак следующему человеку.", sort:6 },
    { id:7, num:"VII", title:"Молчание", text:"Истинные знания передаются не через титулы, а через личный выбор достойного человека. О сказанном в капитуле не говорят за его пределами.", sort:7 },
  ],
  meetings: [
    { id:1, date:"23 июля 2026, 21:49", title:"Малый капитул", note:"Чтение хроник за 1749–1812 годы", house:"Дом Верден", access:"Второй круг", tag_class:"tag tag-accent", sort:1 },
    { id:2, date:"9 августа 2026, 21:49", title:"Передача знака", note:"Закрытая церемония; присутствие по жетону", house:"Дом Кассель", access:"Внутренний круг", tag_class:"tag tag-outline", sort:2 },
    { id:3, date:"4 сентября 2026, 21:49", title:"Совет семи", note:"Вопрос о возвращении жетона № XLIX-03 в Архив", house:"Архив XLIX", access:"Хранители", tag_class:"tag tag-outline", sort:3 },
    { id:4, date:"7 октября 2026, 21:49", title:"Большой капитул", note:"Семь на семь: сорок девятое собрание года не объявляется", house:"—", access:"Второй круг", tag_class:"tag tag-accent", sort:4 },
  ],
  keepers: [
    { id:1, name:"Дом Верден", since:"С 1749 года", duty:"Хранит Архив XLIX и жетон № XLIX-01, передававшийся внутри одной семьи более двухсот лет.", heir:"избран", sort:1 },
    { id:2, name:"Дом Кассель", since:"С 1783 года", duty:"Хранит мастерскую. Все жетоны последних поколений вырезаны рукой мастеров этого дома.", heir:"избран", sort:2 },
    { id:3, name:"Дом Мори", since:"С 1821 года", duty:"Ведёт устные хроники Ордена. Ничего не записывает; помнит всё.", heir:"не назван", sort:3 },
  ],
};
const COLS = {
  members: ["name","token_number","degree","line","admitted","status"],
  rules: ["num","title","text","sort"],
  meetings: ["date","title","note","house","access","tag_class","sort"],
  keepers: ["name","since","duty","heir","sort"],
};
const stripMember = (m) => { const { password_hash, ...r } = m; return r; };

/* ── обработка API ── */
function handle(req) {
  const a = req.action;
  if (a === "auth") {
    const m = DB.members.find((x) => verifyPassword(req.password || "", x.password_hash));
    if (!m) return err(401, "Знак не признан");
    return { token: sign({ kind:"member", sub:m.id }), member: stripMember(m) };
  }
  if (a === "content") {
    const p = verify(req.token); if (!p || p.kind!=="member") return err(401,"Требуется вход участника");
    const me = DB.members.find((x)=>x.id===p.sub);
    return { rules: DB.rules, meetings: DB.meetings, keepers: DB.keepers, member: me?stripMember(me):null };
  }
  if (a === "admin.login") {
    const ad = DB.admins.find((x)=>x.login===req.login);
    if (!ad || !verifyPassword(req.password||"", ad.password_hash)) return err(401,"Неверный логин или пароль");
    return { token: sign({ kind:"admin", sub:ad.id, login:ad.login }) };
  }
  // всё остальное — админ
  const p = verify(req.token); if (!p || p.kind!=="admin") return err(401,"Требуется вход администратора");
  const res = req.resource; const list = DB[res]; const cols = COLS[res];
  if (a === "admin.list") return { items: list.map((r)=> res==="members"?stripMember(r):r) };
  if (a === "admin.create") { const row={id:++seq}; cols.forEach((c)=>row[c]=req.data[c]); if(res==="members") row.password_hash=makeHash("XLIX"); list.push(row); return { item: res==="members"?stripMember(row):row }; }
  if (a === "admin.update") { const row=list.find((x)=>x.id==req.id); if(!row) return err(404,"Не найдено"); cols.forEach((c)=>{ if(c in req.data) row[c]=req.data[c]; }); return { item: res==="members"?stripMember(row):row }; }
  if (a === "admin.delete") { const i=list.findIndex((x)=>x.id==req.id); if(i>=0) list.splice(i,1); return { deleted:req.id }; }
  if (a === "admin.member_password") { const m=DB.members.find((x)=>x.id==req.id); if(!m) return err(404,"Не найдено"); m.password_hash=makeHash(req.password); return { updated:req.id }; }
  return err(404, "Неизвестное действие");
}
function err(status, message){ return { __status: status, ok:false, error: message }; }

/* ── HTTP ── */
const MIME = { ".html":"text/html; charset=utf-8", ".css":"text/css; charset=utf-8", ".js":"application/javascript; charset=utf-8", ".jpg":"image/jpeg", ".png":"image/png", ".svg":"image/svg+xml" };
const CORS = { "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Methods":"POST, OPTIONS", "Access-Control-Allow-Headers":"Content-Type" };

http.createServer((req, res) => {
  if (req.method === "OPTIONS") { res.writeHead(204, CORS); return res.end(); }

  if (req.method === "POST") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      let out, status = 200;
      try {
        const parsed = handle(JSON.parse(body || "{}"));
        if (parsed.__status) { status = parsed.__status; out = { ok:false, error: parsed.error }; }
        else out = { ok:true, ...parsed };
      } catch (e) { status = 500; out = { ok:false, error:String(e.message) }; }
      res.writeHead(status, { ...CORS, "Content-Type":"application/json" });
      res.end(JSON.stringify(out));
    });
    return;
  }

  // статика
  let rel = decodeURIComponent(req.url.split("?")[0]);
  if (rel.endsWith("/")) rel += "index.html";
  const file = path.join(ROOT, path.normalize(rel));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (e, data) => {
    if (e) { res.writeHead(404); return res.end("404"); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
    res.end(data);
  });
}).listen(PORT, () => console.log(`Ordo XLIX dev-сервер: http://localhost:${PORT}`));
