import express from 'express';
import crypto from 'node:crypto';
import { one, all, run, tx } from './db.js';
import { authenticate, allow, checkPassword, hashPassword, makeToken, readToken, loginLimiter, countFailure, makeTicket, readTicket, verifyGoogle } from './auth.js';
import { subscribe, changed, changedAll, notify, notifyAdmins } from './events.js';
import { seedDemo, isDemo, DEMO_PASSWORD } from './seed.js';
import { publicLearnRoutes, adminLearnRoutes } from './learn.js';
import { addCoins, rewardRoutes } from './coins.js';
import { DISTRICTS, DISTRICT_NAMES, HELPER_TRANSITIONS, ICONS, CAT_COLORS, MAP_W, MAP_H, SKILL_KEYS, COINS, nearestDistrict, phoneKey } from '../shared/constants.js';

export const api = express.Router();
api.use(express.json({ limit: '32kb' }));

/* ---------- валидация ---------- */
class Bad extends Error { constructor(m, s = 400) { super(m); this.status = s; } }
const str = (v, min, max, msg) => { const s = String(v ?? '').trim(); if (s.length < min || s.length > max) throw new Bad(msg); return s; };
const phone = (v) => { const s = String(v ?? '').trim(); const k = phoneKey(s); if (k.length < 9 || k.length > 15) throw new Bad('Введите телефон с кодом, например +998 90 123-45-67.'); return s; };
const dist = (v) => { if (!DISTRICT_NAMES.includes(v)) throw new Bad('Выберите район из списка.'); return v; };
const password = (v) => str(v, 6, 100, 'Пароль — не короче 6 символов.');
const skills = (v, required = true) => {
  const s = [...new Set(Array.isArray(v) ? v : [])].filter((k) => SKILL_KEYS.includes(k));
  if (required && !s.length) throw new Bad('Выберите хотя бы одно направление, в котором можете помочь.');
  return JSON.stringify(s);
};
// Сферы, в которых человеку нужна помощь, — это id категорий заявок.
const needs = async (v, required = true) => {
  const ids = new Set((await all('SELECT id FROM categories')).map((c) => c.id));
  const s = [...new Set(Array.isArray(v) ? v.map(Number) : [])].filter((id) => ids.has(id));
  if (required && !s.length) throw new Bad('Отметьте хотя бы одну сферу, в которой нужна помощь.');
  return JSON.stringify(s);
};
const parseSkills = (s) => { try { const a = JSON.parse(s || '[]'); return Array.isArray(a) ? a : []; } catch { return []; } };
const wrap = (fn) => async (req, res) => {
  try { const r = await fn(req, res); if (r !== undefined && !res.headersSent) res.json(r); }
  catch (e) {
    if (e instanceof Bad) return res.status(e.status).json({ error: e.message });
    if (String(e.message).includes('UNIQUE')) return res.status(409).json({ error: 'Такая запись уже существует.' });
    console.error(e); res.status(500).json({ error: 'Ошибка сервера' });
  }
};
const genPassword = () => crypto.randomBytes(4).toString('hex');

/* ---------- представления ---------- */
const pubUser = async (u) => u && ({
  id: u.id, role: u.role, name: u.name, phone: u.phone, dist: u.dist, avail: !!u.avail, balance: u.balance, coins: u.coins,
  google: !!u.google_sub,
  ...(u.role === 'user' ? { needs: parseSkills(u.needs) } : {}),
  ...(u.role === 'helper' ? { skills: parseSkills(u.skills), verified: !!u.verified, ...(await helperStats(u)) } : {}),
  ...(u.role === 'student' ? await studentStats(u) : {}),
});
async function studentStats(s) {
  const r = await one(`SELECT COUNT(*) items, COUNT(DISTINCT course_id) courses FROM learn_progress WHERE user_id=? AND score>=0.7`, s.id);
  return { school: s.school, passedItems: r.items, coursesStarted: r.courses, coursesDone: (await one(`SELECT COUNT(*) n FROM coin_log WHERE user_id=? AND ref LIKE 'course:%'`, s.id)).n };
}
async function helperStats(h) {
  const r = await one(`SELECT COUNT(*) n, COUNT(DISTINCT user_id) p FROM requests WHERE helper_id=? AND status='done'`, h.id);
  const active = (await one(`SELECT COUNT(*) n FROM requests WHERE helper_id=? AND status!='done'`, h.id)).n;
  return {
    done: h.base_done + r.n, platformDone: r.n, helped: h.base_helped + r.p, active,
    rating: h.rating_cnt ? Math.round((h.rating_sum / h.rating_cnt) * 10) / 10 : null, ratingCount: h.rating_cnt,
  };
}

const REQ_SQL = `SELECT r.*, c.name cat, u.name user_name, u.phone user_phone, h.name helper_name, h.phone helper_phone
  FROM requests r JOIN categories c ON c.id=r.cat_id JOIN users u ON u.id=r.user_id LEFT JOIN users h ON h.id=r.helper_id`;

async function shapeRequests(rows, viewer) {
  if (!rows.length) return [];
  const logs = await all(`SELECT req_id, status s, ts FROM request_log WHERE req_id IN (${rows.map(() => '?').join(',')}) ORDER BY ts`, ...rows.map((r) => r.id));
  const byReq = new Map();
  for (const l of logs) (byReq.get(l.req_id) || byReq.set(l.req_id, []).get(l.req_id)).push({ s: l.s, ts: l.ts });
  return rows.map((r) => {
    const showHelperPhone = viewer.role !== 'user' || ['accepted', 'progress'].includes(r.status);
    return {
      id: r.id, title: r.title, desc: r.descr, cat: r.cat, catId: r.cat_id, dist: r.dist, addr: r.addr, phone: r.phone,
      x: r.x, y: r.y, userId: r.user_id, userName: r.user_name, helperId: r.helper_id, helperName: r.helper_name,
      helperPhone: showHelperPhone ? r.helper_phone : null, status: r.status, due: r.due_days, rating: r.rating,
      ts: r.created_at, log: byReq.get(r.id) || [],
    };
  });
}
async function requestsFor(u) {
  if (u.role === 'admin') return await shapeRequests(await all(`${REQ_SQL} ORDER BY r.created_at DESC`), u);
  if (u.role === 'helper') return await shapeRequests(await all(`${REQ_SQL} WHERE r.helper_id=? ORDER BY r.created_at DESC`, u.id), u);
  return await shapeRequests(await all(`${REQ_SQL} WHERE r.user_id=? ORDER BY r.created_at DESC`, u.id), u);
}
async function getReq(id, u) {
  const r = await one(`${REQ_SQL} WHERE r.id=?`, Number(id));
  if (!r) throw new Bad('Заявка не найдена', 404);
  if (u && u.role === 'helper' && r.helper_id !== u.id) throw new Bad('Это не ваша заявка', 403);
  if (u && u.role === 'user' && r.user_id !== u.id) throw new Bad('Это не ваша заявка', 403);
  return r;
}
const setStatus = async (id, s) => { await run('UPDATE requests SET status=? WHERE id=?', s, id); await run('INSERT INTO request_log (req_id,status,ts) VALUES (?,?,?)', id, s, Date.now()); };
const categories = async () => (await all('SELECT id, name, color, icon, descr, examples FROM categories ORDER BY id'))
  .map((c) => ({ ...c, examples: c.examples.split('\n').map((x) => x.trim()).filter(Boolean) }));

/* ---------- публичное ---------- */
api.get('/health', (req, res) => res.json({ ok: true }));

api.get('/public', wrap(async () => {
  const done = (await one(`SELECT COUNT(*) n FROM requests WHERE status='done'`)).n;
  const base = await one(`SELECT COALESCE(SUM(base_done),0) d, COALESCE(SUM(base_helped),0) p FROM users WHERE role='helper'`);
  return {
    demo: isDemo() ? { password: DEMO_PASSWORD, accounts: await demoAccounts() } : null,
    googleClientId: process.env.GOOGLE_CLIENT_ID || null,
    coins: COINS,
    districts: DISTRICTS, map: { w: MAP_W, h: MAP_H }, categories: await categories(),
    stats: {
      done: done + base.d,
      people: (await one(`SELECT COUNT(DISTINCT user_id) n FROM requests WHERE status='done'`)).n + base.p,
      helpers: (await one(`SELECT COUNT(*) n FROM users WHERE role='helper'`)).n,
      users: (await one(`SELECT COUNT(*) n FROM users WHERE role!='admin'`)).n,
      visitors: await visitorCount(),
      open: (await one(`SELECT COUNT(*) n FROM requests WHERE status!='done'`)).n,
      districts: DISTRICT_NAMES.length,
    },
    // открытые заявки без личных данных: только категория, район и точка на карте
    pins: await all(`SELECT r.id, r.x, r.y, r.status, r.dist, c.name cat FROM requests r JOIN categories c ON c.id=r.cat_id WHERE r.status!='done'`),
    recent: await all(`SELECT r.title, r.dist, c.name cat, MAX(l.ts) ts FROM requests r JOIN categories c ON c.id=r.cat_id
                 JOIN request_log l ON l.req_id=r.id WHERE r.status='done' GROUP BY r.id ORDER BY ts DESC LIMIT 6`),
    topHelpers: (await Promise.all((await all(`SELECT id, name, dist, base_done, base_helped, rating_sum, rating_cnt FROM users WHERE role='helper'`))
      .map(async (h) => ({ name: h.name.split(' ')[0], dist: h.dist, ...(await helperStats(h)) }))))
      .sort((a, b) => b.done - a.done).slice(0, 4).map(({ name, dist, done, rating }) => ({ name, dist, done, rating })),
  };
}));
/* ---------- счётчик посетителей ----------
   Каждый браузер присылает свой случайный анонимный id (хранится в localStorage) — так один человек
   считается один раз, даже если заходит много раз. Поисковые роботы не считаются. */
const BOT = /bot|crawl|spider|slurp|yandex|bing|google|facebookexternalhit|telegram|whatsapp|preview|headless|lighthouse|curl|wget|python|node-fetch/i;
const visitLimit = new Map(); // ip → [окно, новых id]: не больше 20 новых посетителей с одного адреса в час
setInterval(() => visitLimit.clear(), 36e5).unref();
// Все посетители = отмеченные браузеры + те, кто зарегистрировался ещё до появления счётчика
// (их браузеры могли так и не отметиться). Кто зарегистрировался позже — уже есть среди посетителей.
async function visitorCount() {
  const v = await one(`SELECT COUNT(*) n, MIN(first_ts) since FROM visitors`);
  const before = (await one(`SELECT COUNT(*) n FROM users WHERE role!='admin' AND created_at < ?`, v.since ?? Date.now())).n;
  return v.n + before;
}
api.post('/visit', wrap(async (req) => {
  const id = String(req.body?.id || '');
  if (!/^[a-z0-9-]{16,64}$/i.test(id)) throw new Bad('Некорректный id');
  if (!BOT.test(req.get('user-agent') || '')) {
    const now = Date.now();
    if ((await run(`UPDATE visitors SET last_ts=? WHERE id=?`, now, id)).changes === 0) {
      const n = visitLimit.get(req.ip) || 0;
      if (n < 20) {
        visitLimit.set(req.ip, n + 1);
        await run(`INSERT OR IGNORE INTO visitors (id, first_ts, last_ts) VALUES (?,?,?)`, id, now, now);
      }
    }
  }
  return { visitors: await visitorCount() };
}));

async function demoAccounts() {
  const pick = (role) => one(`SELECT name, phone FROM users WHERE role=? ORDER BY id LIMIT 1`, role);
  return [
    ['helper', await pick('helper'), DEMO_PASSWORD],
    ['user', await pick('user'), DEMO_PASSWORD],
    ['student', await pick('student'), DEMO_PASSWORD],
  ].filter(([, u, p]) => u && p).map(([role, u, password]) => ({ role, name: u.name, phone: u.phone, password }));
}
// Демо-данные администратора отдаёт отдельный адрес — публичный /public про админку ничего не сообщает.
api.get('/admin-demo', wrap(async () => {
  if (!isDemo() || process.env.ADMIN_PASSWORD) return { demo: null };
  const a = await one(`SELECT phone FROM users WHERE role='admin' ORDER BY id LIMIT 1`);
  return { demo: a ? { phone: a.phone, password: 'admin123' } : null };
}));

api.get('/events', async (req, res) => subscribe(req, res, await readToken(req.query.token)));

publicLearnRoutes(api, { Bad, wrap, str });

api.post('/volunteers', wrap(async (req) => {
  const b = req.body || {};
  const v = { name: str(b.name, 2, 80, 'Введите имя.'), phone: phone(b.phone), dist: dist(b.dist), skills: skills(b.skills), about: str(b.about, 10, 500, 'Расскажите о себе подробнее (от 10 символов).') };
  if (await one('SELECT id FROM users WHERE phone_key=?', phoneKey(v.phone))) throw new Bad('Этот телефон уже зарегистрирован. Войдите в аккаунт.', 409);
  if ((await all('SELECT phone FROM volunteers')).some((x) => phoneKey(x.phone) === phoneKey(v.phone))) throw new Bad('Заявка с этим телефоном уже на рассмотрении.', 409);
  await run('INSERT INTO volunteers (name,phone,dist,skills,about,created_at) VALUES (?,?,?,?,?,?)', v.name, v.phone, v.dist, v.skills, v.about, Date.now());
  await notifyAdmins(`Новый волонтёр: ${v.name} (${v.dist})`);
  await changed();
  return { ok: true };
}));

/* ---------- вход ---------- */
// Вход на сайте — для пользователей, помощников и студентов; администратор входит только через /admin/login.
async function login(req, admin) {
  const b = req.body || {};
  const u = await one('SELECT * FROM users WHERE phone_key=?', phoneKey(b.phone));
  if (!u || !checkPassword(b.password, u.pass) || (u.role === 'admin') !== admin) {
    countFailure(req);
    if (u && checkPassword(b.password, u.pass)) throw new Bad(admin ? 'Это вход только для администраторов. Войдите на сайте.' : 'Администраторы входят через отдельную страницу панели управления.', 403);
    throw new Bad('Неверный телефон или пароль', 401);
  }
  return { token: makeToken(u.id), user: await pubUser(u) };
}
api.post('/auth/login', loginLimiter, wrap(async (req) => await login(req, false)));
api.post('/auth/admin-login', loginLimiter, wrap(async (req) => await login(req, true)));
/**
 * Регистрация на любой странице: пользователь (нужна помощь), студент или волонтёр.
 * Волонтёр сразу получает аккаунт помощника; заявки ему назначают после проверки координатором.
 * google — данные проверенного Google-аккаунта (тогда пароль не нужен).
 */
const SELF_ROLES = ['user', 'student', 'helper'];
async function createAccount(b, google = null) {
  const role = SELF_ROLES.includes(b.role) ? b.role : 'user';
  const name = str(b.name ?? google?.name, 2, 80, 'Введите имя и фамилию.'), ph = phone(b.phone), d = dist(b.dist);
  const pass = google ? '!google' : hashPassword(password(b.password)); // у Google-аккаунта пароля нет: такой хэш не совпадёт ни с одним паролем
  const school = role === 'student' ? str(b.school, 2, 120, 'Укажите, где вы учитесь.') : '';
  const sk = role === 'helper' ? skills(b.skills) : '[]';
  const nd = role === 'user' ? await needs(b.needs) : '[]';
  if (await one('SELECT id FROM users WHERE phone_key=?', phoneKey(ph))) throw new Bad('Этот телефон уже зарегистрирован. Войдите в аккаунт.', 409);
  const id = Number((await run(`INSERT INTO users (role,name,phone,phone_key,pass,dist,school,skills,needs,google_sub,email,verified,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    role, name, ph, phoneKey(ph), pass, d, school, sk, nd, google?.sub ?? null, google?.email ?? '', role === 'helper' ? 0 : 1, Date.now())).lastInsertRowid);
  if (role === 'student') await notifyAdmins(`Новый студент: ${name} (${school})`);
  if (role === 'helper') await notifyAdmins(`Новый волонтёр зарегистрировался: ${name} (${d}). Проверьте его, чтобы назначать заявки.`);
  await changed();
  return { token: makeToken(id), user: await pubUser(await one('SELECT * FROM users WHERE id=?', id)) };
}
api.post('/auth/register', loginLimiter, wrap(async (req) => {
  countFailure(req); // регистрации тоже ограничены, чтобы не плодили аккаунты
  return await createAccount(req.body || {});
}));

/* вход и регистрация через Google */
async function googleAccount(credential) {
  let g;
  try { g = await verifyGoogle(credential); }
  catch (e) { throw new Bad(e.message, e.status || 502); }
  if (!g) throw new Bad('Google не подтвердил вход. Попробуйте ещё раз.', 401);
  return g;
}
api.post('/auth/google', loginLimiter, wrap(async (req) => {
  const g = await googleAccount(req.body?.credential);
  const u = await one('SELECT * FROM users WHERE google_sub=?', g.sub);
  if (u) {
    if (u.role === 'admin') throw new Bad('Администраторы входят через отдельную страницу панели управления.', 403);
    return { token: makeToken(u.id), user: await pubUser(u) };
  }
  // Новый человек: платформа работает по телефону, поэтому просим дозаполнить профиль.
  return { needProfile: true, ticket: makeTicket({ sub: g.sub, email: g.email, name: g.name }), name: g.name, email: g.email };
}));
api.post('/auth/google/complete', loginLimiter, wrap(async (req) => {
  const t = readTicket(req.body?.ticket);
  if (!t) throw new Bad('Сессия Google истекла. Нажмите «Войти через Google» ещё раз.', 401);
  if (await one('SELECT id FROM users WHERE google_sub=?', t.sub)) throw new Bad('Этот Google-аккаунт уже зарегистрирован. Войдите через Google.', 409);
  countFailure(req);
  return await createAccount({ ...req.body, name: req.body?.name || t.name }, { sub: t.sub, email: t.email, name: t.name });
}));

/* ---------- всё ниже — только для вошедших ---------- */
api.use(authenticate);

api.get('/bootstrap', wrap(async (req) => {
  const u = req.user;
  const out = {
    me: await pubUser(u), demo: isDemo(), districts: DISTRICTS, categories: await categories(), requests: await requestsFor(u),
    notifications: (await all('SELECT id, text, req_id reqId, ts, read FROM notifications WHERE user_id=? ORDER BY ts DESC LIMIT 100', u.id)).map((n) => ({ ...n, read: !!n.read })),
  };
  if (u.role === 'admin') {
    out.helpers = await Promise.all((await all(`SELECT * FROM users WHERE role='helper' ORDER BY id`)).map(pubUser));
    out.users = await Promise.all((await all(`SELECT * FROM users WHERE role='user' ORDER BY id`)).map(pubUser));
    out.volunteers = (await all('SELECT * FROM volunteers ORDER BY created_at DESC')).map((v) => ({ ...v, skills: parseSkills(v.skills) }));
    out.students = await Promise.all((await all(`SELECT * FROM users WHERE role='student' ORDER BY id DESC`)).map(pubUser));
    out.complaints = await all(`SELECT c.id, c.text, c.status, c.created_at ts, f.name from_name, a.name against_name, c.req_id reqId
      FROM complaints c LEFT JOIN users f ON f.id=c.from_id LEFT JOIN users a ON a.id=c.against_id ORDER BY c.status='closed', c.created_at DESC`);
  }
  return out;
}));

api.patch('/me', wrap(async (req) => {
  const b = req.body || {}, u = req.user;
  if (b.name !== undefined) await run('UPDATE users SET name=? WHERE id=?', str(b.name, 2, 80, 'Введите имя.'), u.id);
  if (b.dist !== undefined) await run('UPDATE users SET dist=? WHERE id=?', dist(b.dist), u.id);
  if (b.needs !== undefined && u.role === 'user') await run('UPDATE users SET needs=? WHERE id=?', await needs(b.needs), u.id);
  if (b.school !== undefined && u.role === 'student') await run('UPDATE users SET school=? WHERE id=?', str(b.school, 2, 120, 'Укажите, где вы учитесь.'), u.id);
  if (b.newPassword !== undefined) {
    if (!checkPassword(b.oldPassword, u.pass)) throw new Bad('Текущий пароль указан неверно.');
    await run('UPDATE users SET pass=? WHERE id=?', hashPassword(password(b.newPassword)), u.id);
  }
  await changed([u.id]);
  return { ok: true };
}));

/* заявки */
api.post('/requests', allow('user'), wrap(async (req) => {
  const b = req.body || {}, u = req.user, now = Date.now();
  const title = str(b.title, 3, 80, 'Напишите коротко, что нужно (от 3 символов).');
  const desc = str(b.desc, 10, 500, 'Опишите ситуацию подробнее (от 10 символов).');
  const addr = str(b.addr, 3, 120, 'Укажите улицу и дом или ориентир.');
  const ph = phone(b.phone);
  const cat = await one('SELECT * FROM categories WHERE id=?', Number(b.catId));
  if (!cat) throw new Bad('Выберите категорию.');
  const due = [1, 2, 3, 7].includes(Number(b.due)) ? Number(b.due) : 3;
  let x = Number(b.x), y = Number(b.y);
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0 || x > MAP_W || y > MAP_H) [x, y] = DISTRICTS[dist(b.dist)];
  const d = DISTRICT_NAMES.includes(b.dist) ? b.dist : nearestDistrict(x, y);
  const id = await tx(async () => {
    const id = Number((await run(`INSERT INTO requests (title,descr,cat_id,dist,addr,phone,x,y,user_id,status,due_days,created_at) VALUES (?,?,?,?,?,?,?,?,?,'new',?,?)`,
      title, desc, cat.id, d, addr, ph, x, y, u.id, due, now)).lastInsertRowid);
    await run(`INSERT INTO request_log (req_id,status,ts) VALUES (?,'new',?)`, id, now);
    await notifyAdmins(`Новая заявка «${title}» — ${d}`, id);
    return id;
  });
  await changed([u.id]);
  return { id };
}));

api.delete('/requests/:id', allow('user', 'admin'), wrap(async (req) => {
  const r = await getReq(req.params.id, req.user);
  if (req.user.role === 'user' && r.status !== 'new') throw new Bad('Отменить можно только заявку, которой ещё не назначен помощник.');
  await tx(async () => {
    await run('DELETE FROM request_log WHERE req_id=?', r.id);
    await run('UPDATE complaints SET req_id=NULL WHERE req_id=?', r.id);
    await run('DELETE FROM requests WHERE id=?', r.id);
  });
  if (req.user.role === 'admin') await notify(r.user_id, `Заявка «${r.title}» отменена администратором`);
  if (r.helper_id) await notify(r.helper_id, `Заявка «${r.title}» отменена`);
  await changed([r.user_id, r.helper_id]);
  return { ok: true };
}));

api.post('/requests/:id/assign', allow('admin'), wrap(async (req) => {
  const r = await getReq(req.params.id);
  if (!['new', 'assigned'].includes(r.status)) throw new Bad('Помощник уже принял заявку — сменить его нельзя.');
  const h = await one(`SELECT * FROM users WHERE id=? AND role='helper'`, Number(req.body?.helperId));
  if (!h) throw new Bad('Помощник не найден.');
  if (!h.verified) throw new Bad(`${h.name} ещё не проверен. Проверьте волонтёра в разделе «Волонтёры».`);
  if (!h.avail) throw new Bad(`${h.name} сейчас недоступен.`);
  if (h.id === r.helper_id) return { ok: true };
  await tx(async () => {
    await run('UPDATE requests SET helper_id=? WHERE id=?', h.id, r.id);
    if (r.status === 'new') await setStatus(r.id, 'assigned');
    if (r.helper_id) await notify(r.helper_id, `Заявка «${r.title}» передана другому помощнику`, r.id);
    await notify(h.id, `Вам назначена заявка «${r.title}»`, r.id);
    await notify(r.user_id, `Для заявки «${r.title}» назначен помощник ${h.name}`, r.id);
  });
  await changed([r.user_id, h.id, r.helper_id]);
  return { ok: true };
}));

api.post('/requests/:id/status', allow('helper'), wrap(async (req) => {
  const r = await getReq(req.params.id, req.user), next = HELPER_TRANSITIONS[r.status];
  if (!next || req.body?.status !== next) throw new Bad('Этот шаг сейчас недоступен. Обновите страницу.');
  await tx(async () => {
    await setStatus(r.id, next);
    const n = req.user.name;
    if (next === 'accepted') { await notifyAdmins(`Помощник ${n} принял заявку «${r.title}»`, r.id); await notify(r.user_id, `Помощник ${n} принял вашу заявку «${r.title}» и скоро свяжется с вами`, r.id); }
    if (next === 'progress') await notify(r.user_id, `Помощник начал помогать по заявке «${r.title}»`, r.id);
    if (next === 'done') {
      await notifyAdmins(`Заявка «${r.title}» выполнена`, r.id);
      await notify(r.user_id, `Заявка «${r.title}» выполнена. Оцените помощника`, r.id);
      if (await addCoins(req.user.id, COINS.requestDone, `Заявка «${r.title}» выполнена`, `req:${r.id}`))
        await notify(req.user.id, `+${COINS.requestDone} коинов за заявку «${r.title}»`, r.id);
    }
  });
  await changed([r.user_id, r.helper_id]);
  return { ok: true };
}));

api.post('/requests/:id/decline', allow('helper'), wrap(async (req) => {
  const r = await getReq(req.params.id, req.user);
  if (r.status !== 'assigned') throw new Bad('Отказаться можно только от ещё не принятой заявки.');
  await tx(async () => {
    await run(`UPDATE requests SET helper_id=NULL WHERE id=?`, r.id);
    await setStatus(r.id, 'new');
    await notifyAdmins(`${req.user.name} отказался от заявки «${r.title}» — нужен другой помощник`, r.id);
  });
  await changed([r.user_id, req.user.id]);
  return { ok: true };
}));

api.post('/requests/:id/thanks', allow('user'), wrap(async (req) => {
  const r = await getReq(req.params.id, req.user);
  if (r.status !== 'done') throw new Bad('Оценить можно только выполненную заявку.');
  if (r.rating) throw new Bad('Вы уже оценили эту заявку.');
  const stars = Math.round(Number(req.body?.rating));
  if (!(stars >= 1 && stars <= 5)) throw new Bad('Поставьте оценку от 1 до 5.');
  await tx(async () => {
    await run('UPDATE requests SET rating=? WHERE id=?', stars, r.id);
    await run('UPDATE users SET balance=balance+1 WHERE id=?', req.user.id);
    if (r.helper_id) {
      await run('UPDATE users SET rating_sum=rating_sum+?, rating_cnt=rating_cnt+1 WHERE id=?', stars, r.helper_id);
      const bonus = await addCoins(r.helper_id, stars * COINS.perStar, `Оценка ${'★'.repeat(stars)} за «${r.title}»`, `rate:${r.id}`);
      await notify(r.helper_id, `Вам сказали спасибо за «${r.title}»: ${'★'.repeat(stars)}${bonus ? ` (+${bonus} коинов)` : ''}`, r.id);
    }
  });
  await changed([req.user.id, r.helper_id]);
  return { ok: true };
}));

api.post('/requests/:id/complaint', allow('user'), wrap(async (req) => {
  const r = await getReq(req.params.id, req.user);
  if (!r.helper_id) throw new Bad('У заявки нет помощника.');
  const text = str(req.body?.text, 10, 500, 'Опишите проблему подробнее (от 10 символов).');
  await run(`INSERT INTO complaints (from_id,against_id,req_id,text,created_at) VALUES (?,?,?,?,?)`, req.user.id, r.helper_id, r.id, text, Date.now());
  await notifyAdmins(`Жалоба на помощника ${r.helper_name} по заявке «${r.title}»`, r.id);
  await changed([req.user.id]);
  return { ok: true };
}));

/* помощники */
/* ---------- посетители сайта для панели администратора ----------
   Сутки считаем по времени Ташкента (UTC+5). */
const TZ = 5 * 36e5, DAYMS = 864e5;
api.get('/admin/visitors', allow('admin'), wrap(async (req) => {
  const days = Math.min(90, Math.max(7, Number(req.query.days) || 30));
  const today = Math.floor((Date.now() + TZ) / DAYMS) * DAYMS - TZ; // начало сегодняшнего дня по Ташкенту
  const from = today - (days - 1) * DAYMS;
  const cnt = async (sql, ...p) => (await one(sql, ...p)).n;
  const rows = await all(`SELECT CAST((first_ts - ?) / ${DAYMS} AS INTEGER) k, COUNT(*) n FROM visitors WHERE first_ts >= ? GROUP BY k`, from, from);
  const perDay = Array(days).fill(0);
  for (const r of rows) { const k = Math.floor(r.k); if (k >= 0 && k < days) perDay[k] += r.n; }
  return {
    total: await visitorCount(),
    today: await cnt(`SELECT COUNT(*) n FROM visitors WHERE first_ts >= ?`, today),
    week: await cnt(`SELECT COUNT(*) n FROM visitors WHERE first_ts >= ?`, today - 6 * DAYMS),
    month: await cnt(`SELECT COUNT(*) n FROM visitors WHERE first_ts >= ?`, today - 29 * DAYMS),
    activeToday: await cnt(`SELECT COUNT(*) n FROM visitors WHERE last_ts >= ?`, today),
    returning: await cnt(`SELECT COUNT(*) n FROM visitors WHERE last_ts - first_ts > ?`, DAYMS),
    days: perDay.map((n, i) => ({ ts: from + i * DAYMS, n })),
  };
}));

api.post('/helpers', allow('admin'), wrap(async (req) => {
  const b = req.body || {};
  const name = str(b.name, 2, 80, 'Введите имя помощника.'), ph = phone(b.phone), d = dist(b.dist), sk = skills(b.skills, false);
  if (await one('SELECT id FROM users WHERE phone_key=?', phoneKey(ph))) throw new Bad('Этот телефон уже зарегистрирован.', 409);
  const pw = genPassword();
  await run(`INSERT INTO users (role,name,phone,phone_key,pass,dist,skills,created_at) VALUES ('helper',?,?,?,?,?,?,?)`, name, ph, phoneKey(ph), hashPassword(pw), d, sk, Date.now());
  await changed();
  return { ok: true, password: pw };
}));
api.patch('/helpers/:id', allow('admin', 'helper'), wrap(async (req) => {
  const id = Number(req.params.id);
  if (req.user.role === 'helper' && req.user.id !== id) throw new Bad('Недостаточно прав', 403);
  const h = await one(`SELECT * FROM users WHERE id=? AND role='helper'`, id);
  if (!h) throw new Bad('Помощник не найден', 404);
  if (typeof req.body?.avail === 'boolean') await run('UPDATE users SET avail=? WHERE id=?', req.body.avail ? 1 : 0, id);
  if (req.body?.skills !== undefined) await run('UPDATE users SET skills=? WHERE id=?', skills(req.body.skills, false), id);
  await changed([id]);
  return { ok: true };
}));

/* волонтёры */
api.post('/helpers/:id/verify', allow('admin'), wrap(async (req) => {
  const h = await one(`SELECT * FROM users WHERE id=? AND role='helper'`, Number(req.params.id));
  if (!h) throw new Bad('Помощник не найден', 404);
  await run('UPDATE users SET verified=1 WHERE id=?', h.id);
  await notify(h.id, 'Координатор проверил ваш профиль — теперь вам можно назначать заявки!');
  await changed([h.id]);
  return { ok: true };
}));
api.post('/volunteers/:id/approve', allow('admin'), wrap(async (req) => {
  const v = await one('SELECT * FROM volunteers WHERE id=?', Number(req.params.id));
  if (!v) throw new Bad('Заявка волонтёра не найдена', 404);
  if (await one('SELECT id FROM users WHERE phone_key=?', phoneKey(v.phone))) throw new Bad('Этот телефон уже зарегистрирован.', 409);
  const pw = genPassword();
  await tx(async () => {
    await run(`INSERT INTO users (role,name,phone,phone_key,pass,dist,skills,created_at) VALUES ('helper',?,?,?,?,?,?,?)`, v.name, v.phone, phoneKey(v.phone), hashPassword(pw), v.dist, v.skills, Date.now());
    await run('DELETE FROM volunteers WHERE id=?', v.id);
  });
  await changed();
  return { ok: true, password: pw, phone: v.phone, name: v.name };
}));
api.delete('/volunteers/:id', allow('admin'), wrap(async (req) => {
  await run('DELETE FROM volunteers WHERE id=?', Number(req.params.id));
  await changed();
  return { ok: true };
}));

/* категории */
api.post('/categories', allow('admin'), wrap(async (req) => {
  const name = str(req.body?.name, 2, 40, 'Введите название категории.');
  if (await one('SELECT id FROM categories WHERE name=?', name)) throw new Bad('Такая категория уже есть.', 409);
  const n = (await one('SELECT COUNT(*) n FROM categories')).n;
  const icon = ICONS.includes(req.body?.icon) ? req.body.icon : 'heart';
  await run('INSERT INTO categories (name,color,icon,descr,examples) VALUES (?,?,?,?,?)', name, CAT_COLORS[n % CAT_COLORS.length], icon, catDescr(req.body?.descr), catExamples(req.body?.examples));
  changedAll();
  return { ok: true };
}));
const catDescr = (v) => String(v ?? '').trim().slice(0, 300);
const catExamples = (v) => (Array.isArray(v) ? v : String(v ?? '').split('\n')).map((x) => String(x).trim().slice(0, 120)).filter(Boolean).slice(0, 10).join('\n');
api.patch('/categories/:id', allow('admin'), wrap(async (req) => {
  const c = await one('SELECT * FROM categories WHERE id=?', Number(req.params.id));
  if (!c) throw new Bad('Категория не найдена', 404);
  const b = req.body || {};
  const name = b.name === undefined ? c.name : str(b.name, 2, 40, 'Введите название категории.');
  if (name.toLowerCase() !== c.name.toLowerCase() && await one('SELECT id FROM categories WHERE name=?', name)) throw new Bad('Такая категория уже есть.', 409);
  await run('UPDATE categories SET name=?, icon=?, descr=?, examples=? WHERE id=?', name, ICONS.includes(b.icon) ? b.icon : c.icon,
    b.descr === undefined ? c.descr : catDescr(b.descr), b.examples === undefined ? c.examples : catExamples(b.examples), c.id);
  changedAll();
  return { ok: true };
}));

/* студенты */
api.post('/students/apply', allow('student'), wrap(async (req) => {
  const u = req.user;
  await run('UPDATE users SET skills=? WHERE id=?', skills(req.body?.skills), u.id);
  await notifyAdmins(`Студент ${u.name} (${u.school}) хочет стать помощником`);
  await changed([u.id]);
  return { ok: true };
}));
api.post('/students/:id/promote', allow('admin'), wrap(async (req) => {
  const s = await one(`SELECT * FROM users WHERE id=? AND role='student'`, Number(req.params.id));
  if (!s) throw new Bad('Студент не найден', 404);
  await run(`UPDATE users SET role='helper' WHERE id=?`, s.id);
  await notify(s.id, 'Вы стали помощником! Войдите заново, чтобы открыть кабинет помощника. Коины сохранились.');
  await changed([s.id]);
  return { ok: true };
}));

/* коины и награды */
rewardRoutes(api, { Bad, wrap, str });

/* учебный центр */
adminLearnRoutes(api, { Bad, wrap, str });

/* жалобы */
api.post('/complaints/:id/resolve', allow('admin'), wrap(async (req) => {
  await run(`UPDATE complaints SET status='closed' WHERE id=?`, Number(req.params.id));
  await changed();
  return { ok: true };
}));

/* уведомления */
api.post('/notifications/read', wrap(async (req) => {
  await run('UPDATE notifications SET read=1 WHERE user_id=?', req.user.id);
  return { ok: true };
}));

/* демо */
api.post('/admin/reset', allow('admin'), wrap(async () => {
  if (!isDemo()) throw new Bad('Сброс доступен только в демо-режиме.', 403);
  await seedDemo();
  changedAll();
  return { ok: true };
}));

api.use((req, res) => res.status(404).json({ error: 'Не найдено' }));
