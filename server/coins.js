// Коины: начисление, история и обмен на награды (сертификат, пополнение связи, мерч, промокоды партнёров).
import crypto from 'node:crypto';
import { one, all, run, tx } from './db.js';
import { allow } from './auth.js';
import { changed, notify, notifyAdmins } from './events.js';

const ICONS = ['gift', 'trophy', 'phone', 'edit', 'book', 'star', 'heart', 'car', 'coin', 'bag'];

/** Начислить (или списать при amount < 0) коины. ref — ключ, чтобы не начислить одно и то же дважды. */
export async function addCoins(uid, amount, reason, ref = null) {
  if (!uid || !amount) return 0;
  if (ref && await one('SELECT 1 FROM coin_log WHERE user_id=? AND ref=?', uid, ref)) return 0;
  await run('UPDATE users SET coins=coins+? WHERE id=?', amount, uid);
  await run('INSERT INTO coin_log (user_id,amount,reason,ref,ts) VALUES (?,?,?,?,?)', uid, amount, reason, ref, Date.now());
  return amount;
}

const EARNERS = ['helper', 'student'];
export const REWARD_KINDS = ['code', 'cert', 'manual'];

/* Награды, которые платформа выдаёт сама, без договора с партнёром:
   cert — именной сертификат, выдаётся сразу и проверяется по номеру на сайте;
   manual — координатор выполняет заказ (пополняет связь, готовит письмо, передаёт футболку) и отмечает «Выдано».
   code — промокоды партнёра: администратор загружает их пачкой, каждый выдаётся один раз. */
const DEFAULT_REWARDS = [
  ['cert', 'Сертификат волонтёра', 40, 'trophy',
    'Именной электронный сертификат: сколько заявок вы выполнили и курсов прошли. Распечатайте или приложите к резюме — подлинность проверяется по номеру.'],
  ['manual', 'Пополнение мобильной связи — 10 000 сум', 100, 'phone',
    'Координатор пополнит баланс номера из вашего профиля в течение 2 рабочих дней.'],
  ['manual', 'Рекомендательное письмо', 150, 'edit',
    'Письмо от координатора Socio для поступления, стажировки или работы. Подготовим за 5 рабочих дней.'],
  ['manual', 'Пополнение мобильной связи — 25 000 сум', 220, 'phone',
    'Координатор пополнит баланс номера из вашего профиля в течение 2 рабочих дней.'],
  ['manual', 'Футболка волонтёра Socio', 300, 'gift',
    'Фирменная футболка. Координатор позвонит, уточнит размер и где вам удобно её забрать.'],
];

/** Стартовые награды. Старые промокоды такси убираются: невыданные удаляются, по выданным награда только скрывается (история остаётся). */
export async function ensureRewards() {
  let removed = 0;
  for (const r of await all(`SELECT id FROM rewards WHERE partner LIKE '%Яндекс%' OR title LIKE '%Яндекс%'`)) {
    await run('DELETE FROM reward_codes WHERE reward_id=? AND issued_at IS NULL', r.id);
    if (await one('SELECT 1 FROM reward_codes WHERE reward_id=?', r.id)) await run('UPDATE rewards SET active=0 WHERE id=?', r.id);
    else await run('DELETE FROM rewards WHERE id=?', r.id);
    removed++;
  }
  if (removed) console.log(`[socio] убраны награды Яндекс Такси (${removed}), добавлены награды платформы`);
  if (!removed && await one('SELECT id FROM rewards LIMIT 1')) return;
  for (const [kind, title, cost, icon, descr] of DEFAULT_REWARDS)
    if (!(await one('SELECT id FROM rewards WHERE title=?', title)))
      await run('INSERT INTO rewards (kind,title,descr,partner,cost,icon,created_at) VALUES (?,?,?,?,?,?,?)', kind, title, descr, 'Socio', cost, icon, Date.now());
}

const ROLE_T = { helper: 'Волонтёр-помощник', student: 'Студент Академии Socio' };
const certNumber = () => `SC-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
const orderNumber = () => `Z-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

/** Что попадает в сертификат: данные на момент выдачи. */
async function certSnapshot(u) {
  const req = await one(`SELECT COUNT(*) n, COUNT(DISTINCT user_id) p FROM requests WHERE helper_id=? AND status='done'`, u.id);
  const courses = (await one(`SELECT COUNT(*) n FROM coin_log WHERE user_id=? AND ref LIKE 'course:%'`, u.id)).n;
  const earned = (await one('SELECT COALESCE(SUM(amount),0) n FROM coin_log WHERE user_id=? AND amount>0', u.id)).n;
  return {
    name: u.name, role: u.role, dist: u.dist, since: u.created_at,
    done: u.base_done + req.n, helped: u.base_helped + req.p, courses, earned,
    rating: u.rating_cnt ? Math.round((u.rating_sum / u.rating_cnt) * 10) / 10 : null,
  };
}
const parse = (s) => { try { return JSON.parse(s || '{}'); } catch { return {}; } };

/* Данные организации на сертификате: настоящий адрес офиса, контакты и адрес сайта для проверки.
   Хранятся в таблице settings (ключ org), меняются в панели: «Награды» → «Данные на сертификате». */
const ORG_DEFAULT = { name: 'Socio', address: '', phone: '', site: '' };
async function getOrg() {
  const r = await one(`SELECT value FROM settings WHERE key='org'`);
  return { ...ORG_DEFAULT, ...parse(r?.value) };
}
/** Адрес сайта для проверки: из настроек, иначе SITE_URL. Пусто — страница возьмёт адрес, с которого её открыли. */
const orgSite = (o) => (o.site || process.env.SITE_URL || '').replace(/\/+$/, '');

export function orgRoutes(api, { wrap, Bad }) {
  api.get('/admin/org', allow('admin'), wrap(async () => ({ ...(await getOrg()), envSite: process.env.SITE_URL || '' })));
  api.put('/admin/org', allow('admin'), wrap(async (req) => {
    const b = req.body || {}, cur = await getOrg();
    const text = (v, max, old) => (v === undefined ? old : String(v).trim().slice(0, max));
    let site = text(b.site, 200, cur.site);
    if (site) {
      if (!/^https?:\/\//i.test(site)) site = `https://${site}`;
      try { const u = new URL(site); site = u.origin; } catch { throw new Bad('Адрес сайта выглядит неверно. Пример: https://socio.uz'); }
    }
    const org = { name: text(b.name, 80, cur.name) || 'Socio', address: text(b.address, 200, cur.address), phone: text(b.phone, 40, cur.phone), site };
    await run(`INSERT INTO settings (key,value) VALUES ('org',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value`, JSON.stringify(org));
    return { ...org, envSite: process.env.SITE_URL || '' };
  }));
}

/** Проверка сертификата по номеру — открыта всем (работодатель, вуз). */
export function publicRewardRoutes(api, { wrap, Bad }) {
  api.get('/certificates/:code', wrap(async (req) => {
    const c = await one(`SELECT c.code, c.note, c.issued_at FROM reward_codes c JOIN rewards r ON r.id=c.reward_id
      WHERE r.kind='cert' AND c.code=? AND c.issued_at IS NOT NULL`, String(req.params.code).trim().toUpperCase().slice(0, 40));
    if (!c) throw new Bad('Сертификат с таким номером не найден.', 404);
    const d = parse(c.note);
    const org = await getOrg();
    return { code: c.code, ts: c.issued_at, ...d, roleTitle: ROLE_T[d.role] || 'Участник Socio',
      org: { name: org.name, address: org.address, phone: org.phone, site: orgSite(org) } };
  }));
}

export function rewardRoutes(api, { wrap, Bad, str }) {
  const listRewards = async (admin) => (await all(`SELECT r.*,
      (SELECT COUNT(*) FROM reward_codes c WHERE c.reward_id=r.id AND c.user_id IS NULL AND c.issued_at IS NULL) stock,
      (SELECT COUNT(*) FROM reward_codes c WHERE c.reward_id=r.id AND c.issued_at IS NOT NULL) issued
    FROM rewards r ${admin ? '' : 'WHERE r.active=1'} ORDER BY r.cost`))
    .map((r) => ({ id: r.id, kind: r.kind, icon: r.icon, title: r.title, descr: r.descr, partner: r.partner, cost: r.cost, active: !!r.active,
      stock: r.kind === 'code' ? r.stock : null, ...(admin ? { issued: r.issued } : {}) }));
  const ORDERS_SQL = `SELECT c.id, c.code, c.status, c.note, c.issued_at ts, c.done_at, r.title, r.kind, u.name, u.phone
    FROM reward_codes c JOIN rewards r ON r.id=c.reward_id LEFT JOIN users u ON u.id=c.user_id`;

  api.get('/rewards', allow('admin', ...EARNERS), wrap(async (req) => {
    const u = req.user;
    if (u.role === 'admin') return {
      rewards: await listRewards(true),
      recent: await all(`SELECT c.code, c.issued_at ts, c.status, r.title, u.name FROM reward_codes c JOIN rewards r ON r.id=c.reward_id
        LEFT JOIN users u ON u.id=c.user_id WHERE c.issued_at IS NOT NULL ORDER BY c.issued_at DESC LIMIT 30`),
      orders: await all(`${ORDERS_SQL} WHERE c.status='pending' ORDER BY c.issued_at`),
    };
    return {
      coins: u.coins,
      rewards: await listRewards(false),
      mine: await all(`SELECT c.code, c.issued_at ts, c.status, r.title, r.partner, r.kind FROM reward_codes c JOIN rewards r ON r.id=c.reward_id WHERE c.user_id=? ORDER BY c.issued_at DESC`, u.id),
      history: await all('SELECT amount, reason, ts FROM coin_log WHERE user_id=? ORDER BY ts DESC, id DESC LIMIT 40', u.id),
    };
  }));

  api.post('/rewards/:id/redeem', allow(...EARNERS), wrap(async (req) => {
    const r = await one('SELECT * FROM rewards WHERE id=? AND active=1', Number(req.params.id));
    if (!r) throw new Bad('Награда не найдена или больше недоступна.', 404);
    const u = req.user;
    const res = await tx(async () => {
      const me = await one('SELECT * FROM users WHERE id=?', u.id);
      if (me.coins < r.cost) throw new Bad(`Не хватает коинов: нужно ${r.cost}, у вас ${me.coins}.`);
      const now = Date.now();
      let out;
      if (r.kind === 'cert') {
        const snap = await certSnapshot(me);
        if (!snap.done && !snap.courses) throw new Bad('Сертификат выдаётся после первой выполненной заявки или пройденного курса.');
        const code = certNumber();
        await run(`INSERT INTO reward_codes (reward_id,code,user_id,issued_at,status,note,done_at) VALUES (?,?,?,?,'done',?,?)`, r.id, code, u.id, now, JSON.stringify(snap), now);
        await notify(u.id, `Ваш сертификат волонтёра готов: № ${code}. Откройте его в разделе «Коины»`);
        out = { kind: 'cert', code, title: r.title };
      } else if (r.kind === 'manual') {
        if (await one(`SELECT 1 FROM reward_codes WHERE reward_id=? AND user_id=? AND status='pending'`, r.id, u.id))
          throw new Bad('Этот заказ уже оформлен и ждёт выдачи — координатор скоро свяжется с вами.', 409);
        const code = orderNumber();
        await run(`INSERT INTO reward_codes (reward_id,code,user_id,issued_at,status,note) VALUES (?,?,?,?,'pending',?)`, r.id, code, u.id, now, me.phone);
        await notify(u.id, `Заказ № ${code} «${r.title}» оформлен. Координатор свяжется с вами по номеру ${me.phone}`);
        await notifyAdmins(`${me.name} обменял коины на «${r.title}» (заказ № ${code}) — выдайте награду в разделе «Награды»`);
        out = { kind: 'manual', code, title: r.title };
      } else {
        const code = await one('SELECT id, code FROM reward_codes WHERE reward_id=? AND user_id IS NULL AND issued_at IS NULL ORDER BY id LIMIT 1', r.id);
        if (!code) throw new Bad('Промокоды для этой награды закончились. Скоро пополним — загляните позже.', 409);
        await run(`UPDATE reward_codes SET user_id=?, issued_at=?, status='done', done_at=? WHERE id=?`, u.id, now, now, code.id);
        await notify(u.id, `Ваш промокод «${r.title}»: ${code.code}`);
        out = { kind: 'code', code: code.code, title: r.title };
      }
      await addCoins(u.id, -r.cost, `Обмен: ${r.title}`, `rw:${out.code}`);
      return out;
    });
    await changed([u.id]);
    return res;
  }));

  /* ---------- заказы, которые выдаёт координатор ---------- */
  const order = async (id) => {
    const o = await one(`SELECT c.*, r.title, r.cost FROM reward_codes c JOIN rewards r ON r.id=c.reward_id WHERE c.id=? AND c.status='pending'`, Number(id));
    if (!o) throw new Bad('Заказ не найден или уже обработан.', 404);
    return o;
  };
  api.post('/rewards/orders/:id/done', allow('admin'), wrap(async (req) => {
    const o = await order(req.params.id);
    await run(`UPDATE reward_codes SET status='done', done_at=? WHERE id=?`, Date.now(), o.id);
    await notify(o.user_id, `Заказ № ${o.code} «${o.title}» выполнен. Спасибо, что помогаете людям!`);
    await changed([o.user_id]);
    return { ok: true };
  }));
  api.post('/rewards/orders/:id/cancel', allow('admin'), wrap(async (req) => {
    const o = await order(req.params.id);
    await tx(async () => {
      await run(`UPDATE reward_codes SET status='cancelled', done_at=? WHERE id=?`, Date.now(), o.id);
      await addCoins(o.user_id, o.cost, `Возврат: заказ № ${o.code} отменён`, `refund:${o.code}`);
      await notify(o.user_id, `Заказ № ${o.code} «${o.title}» отменён координатором, ${o.cost} коинов вернулись на баланс`);
    });
    await changed([o.user_id]);
    return { ok: true };
  }));

  /* ---------- администратор ---------- */
  const cost = (v) => { const n = Math.round(Number(v)); if (!(n >= 1 && n <= 100000)) throw new Bad('Укажите стоимость в коинах (целое число от 1).'); return n; };
  api.post('/rewards', allow('admin'), wrap(async (req) => {
    const b = req.body || {};
    const kind = REWARD_KINDS.includes(b.kind) ? b.kind : 'manual';
    await run('INSERT INTO rewards (kind,title,descr,partner,cost,icon,created_at) VALUES (?,?,?,?,?,?,?)', kind,
      str(b.title, 3, 100, 'Введите название награды.'), String(b.descr ?? '').trim().slice(0, 300), String(b.partner ?? '').trim().slice(0, 60) || 'Socio', cost(b.cost),
      ICONS.includes(b.icon) ? b.icon : 'gift', Date.now());
    return { ok: true };
  }));
  api.patch('/rewards/:id', allow('admin'), wrap(async (req) => {
    const r = await one('SELECT * FROM rewards WHERE id=?', Number(req.params.id));
    if (!r) throw new Bad('Награда не найдена', 404);
    const b = req.body || {};
    await run('UPDATE rewards SET title=?, descr=?, partner=?, cost=?, active=? WHERE id=?',
      b.title === undefined ? r.title : str(b.title, 3, 100, 'Введите название награды.'),
      b.descr === undefined ? r.descr : String(b.descr).trim().slice(0, 300),
      b.partner === undefined ? r.partner : String(b.partner).trim().slice(0, 60),
      b.cost === undefined ? r.cost : cost(b.cost),
      typeof b.active === 'boolean' ? Number(b.active) : r.active, r.id);
    return { ok: true };
  }));
  api.post('/rewards/:id/codes', allow('admin'), wrap(async (req) => {
    const r = await one('SELECT id, kind FROM rewards WHERE id=?', Number(req.params.id));
    if (!r) throw new Bad('Награда не найдена', 404);
    if (r.kind !== 'code') throw new Bad('Промокоды загружаются только в награды партнёров.');
    const codes = [...new Set(String(req.body?.codes ?? '').split(/[\s,;]+/).map((c) => c.trim()).filter(Boolean))];
    if (!codes.length) throw new Bad('Вставьте промокоды — по одному в строке.');
    if (codes.length > 1000) throw new Bad('За раз можно добавить не больше 1000 промокодов.');
    if (codes.some((c) => c.length > 64)) throw new Bad('Промокод слишком длинный.');
    const existing = new Set((await all('SELECT code FROM reward_codes WHERE reward_id=?', r.id)).map((c) => c.code));
    const fresh = codes.filter((c) => !existing.has(c));
    await tx(async () => { for (const c of fresh) await run('INSERT INTO reward_codes (reward_id,code) VALUES (?,?)', r.id, c); });
    return { added: fresh.length, skipped: codes.length - fresh.length };
  }));
  api.delete('/rewards/:id', allow('admin'), wrap(async (req) => {
    const id = Number(req.params.id);
    if (await one('SELECT 1 FROM reward_codes WHERE reward_id=? AND issued_at IS NOT NULL', id))
      throw new Bad('По этой награде уже выдавались промокоды — её можно только скрыть.');
    await tx(async () => {
      await run('DELETE FROM reward_codes WHERE reward_id=?', id);
      await run('DELETE FROM rewards WHERE id=?', id);
    });
    return { ok: true };
  }));
}
