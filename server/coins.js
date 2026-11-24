// Коины: начисление, история и обмен на награды (промокоды партнёров, например скидки на такси).
import crypto from 'node:crypto';
import { one, all, run, tx } from './db.js';
import { allow } from './auth.js';
import { changed, notify } from './events.js';

/** Начислить (или списать при amount < 0) коины. ref — ключ, чтобы не начислить одно и то же дважды. */
export function addCoins(uid, amount, reason, ref = null) {
  if (!uid || !amount) return 0;
  if (ref && one('SELECT 1 FROM coin_log WHERE user_id=? AND ref=?', uid, ref)) return 0;
  run('UPDATE users SET coins=coins+? WHERE id=?', amount, uid);
  run('INSERT INTO coin_log (user_id,amount,reason,ref,ts) VALUES (?,?,?,?,?)', uid, amount, reason, ref, Date.now());
  return amount;
}

const EARNERS = ['helper', 'student'];

const DEFAULT_REWARDS = [
  ['Скидка 10% на поездку в Яндекс Такси', 50, 'TAXI10'],
  ['Скидка 20% на поездку в Яндекс Такси', 100, 'TAXI20'],
  ['Скидка 30% на поездку в Яндекс Такси', 180, 'TAXI30'],
];
const REWARD_DESCR = 'Промокод на одну поездку. Введите его в приложении Яндекс Go перед заказом такси.';

/** Создаёт стартовые награды. В демо-режиме добавляет тестовые промокоды с префиксом DEMO-. */
export function ensureRewards(demo) {
  if (one('SELECT id FROM rewards LIMIT 1')) return;
  for (const [title, cost, tag] of DEFAULT_REWARDS) {
    const id = Number(run('INSERT INTO rewards (title,descr,partner,cost,created_at) VALUES (?,?,?,?,?)', title, REWARD_DESCR, 'Яндекс Такси', cost, Date.now()).lastInsertRowid);
    if (demo) for (let i = 0; i < 8; i++) run('INSERT INTO reward_codes (reward_id,code) VALUES (?,?)', id, `DEMO-${tag}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`);
  }
}

export function rewardRoutes(api, { wrap, Bad, str }) {
  const listRewards = (admin) => all(`SELECT r.*,
      (SELECT COUNT(*) FROM reward_codes c WHERE c.reward_id=r.id AND c.user_id IS NULL AND c.issued_at IS NULL) stock,
      (SELECT COUNT(*) FROM reward_codes c WHERE c.reward_id=r.id AND c.issued_at IS NOT NULL) issued
    FROM rewards r ${admin ? '' : 'WHERE r.active=1'} ORDER BY r.cost`)
    .map((r) => ({ id: r.id, title: r.title, descr: r.descr, partner: r.partner, cost: r.cost, active: !!r.active, stock: r.stock, ...(admin ? { issued: r.issued } : {}) }));

  api.get('/rewards', allow('admin', ...EARNERS), wrap((req) => {
    const u = req.user;
    if (u.role === 'admin') return {
      rewards: listRewards(true),
      recent: all(`SELECT c.code, c.issued_at ts, r.title, u.name FROM reward_codes c JOIN rewards r ON r.id=c.reward_id
        LEFT JOIN users u ON u.id=c.user_id WHERE c.issued_at IS NOT NULL ORDER BY c.issued_at DESC LIMIT 30`),
    };
    return {
      coins: u.coins,
      rewards: listRewards(false),
      mine: all(`SELECT c.code, c.issued_at ts, r.title, r.partner FROM reward_codes c JOIN rewards r ON r.id=c.reward_id WHERE c.user_id=? ORDER BY c.issued_at DESC`, u.id),
      history: all('SELECT amount, reason, ts FROM coin_log WHERE user_id=? ORDER BY ts DESC, id DESC LIMIT 40', u.id),
    };
  }));

  api.post('/rewards/:id/redeem', allow(...EARNERS), wrap((req) => {
    const r = one('SELECT * FROM rewards WHERE id=? AND active=1', Number(req.params.id));
    if (!r) throw new Bad('Награда не найдена или больше недоступна.', 404);
    const res = tx(() => {
      const coins = one('SELECT coins FROM users WHERE id=?', req.user.id).coins;
      if (coins < r.cost) throw new Bad(`Не хватает коинов: нужно ${r.cost}, у вас ${coins}.`);
      const code = one('SELECT id, code FROM reward_codes WHERE reward_id=? AND user_id IS NULL AND issued_at IS NULL ORDER BY id LIMIT 1', r.id);
      if (!code) throw new Bad('Промокоды для этой награды закончились. Скоро пополним — загляните позже.', 409);
      run('UPDATE reward_codes SET user_id=?, issued_at=? WHERE id=?', req.user.id, Date.now(), code.id);
      addCoins(req.user.id, -r.cost, `Обмен: ${r.title}`);
      notify(req.user.id, `Ваш промокод «${r.title}»: ${code.code}`);
      return { code: code.code, title: r.title };
    });
    changed([req.user.id]);
    return res;
  }));

  /* ---------- администратор ---------- */
  const cost = (v) => { const n = Math.round(Number(v)); if (!(n >= 1 && n <= 100000)) throw new Bad('Укажите стоимость в коинах (целое число от 1).'); return n; };
  api.post('/rewards', allow('admin'), wrap((req) => {
    const b = req.body || {};
    run('INSERT INTO rewards (title,descr,partner,cost,created_at) VALUES (?,?,?,?,?)',
      str(b.title, 3, 100, 'Введите название награды.'), String(b.descr ?? '').trim().slice(0, 300), String(b.partner ?? '').trim().slice(0, 60), cost(b.cost), Date.now());
    return { ok: true };
  }));
  api.patch('/rewards/:id', allow('admin'), wrap((req) => {
    const r = one('SELECT * FROM rewards WHERE id=?', Number(req.params.id));
    if (!r) throw new Bad('Награда не найдена', 404);
    const b = req.body || {};
    run('UPDATE rewards SET title=?, descr=?, partner=?, cost=?, active=? WHERE id=?',
      b.title === undefined ? r.title : str(b.title, 3, 100, 'Введите название награды.'),
      b.descr === undefined ? r.descr : String(b.descr).trim().slice(0, 300),
      b.partner === undefined ? r.partner : String(b.partner).trim().slice(0, 60),
      b.cost === undefined ? r.cost : cost(b.cost),
      typeof b.active === 'boolean' ? Number(b.active) : r.active, r.id);
    return { ok: true };
  }));
  api.post('/rewards/:id/codes', allow('admin'), wrap((req) => {
    const r = one('SELECT id FROM rewards WHERE id=?', Number(req.params.id));
    if (!r) throw new Bad('Награда не найдена', 404);
    const codes = [...new Set(String(req.body?.codes ?? '').split(/[\s,;]+/).map((c) => c.trim()).filter(Boolean))];
    if (!codes.length) throw new Bad('Вставьте промокоды — по одному в строке.');
    if (codes.length > 1000) throw new Bad('За раз можно добавить не больше 1000 промокодов.');
    if (codes.some((c) => c.length > 64)) throw new Bad('Промокод слишком длинный.');
    const existing = new Set(all('SELECT code FROM reward_codes WHERE reward_id=?', r.id).map((c) => c.code));
    const fresh = codes.filter((c) => !existing.has(c));
    tx(() => { for (const c of fresh) run('INSERT INTO reward_codes (reward_id,code) VALUES (?,?)', r.id, c); });
    return { added: fresh.length, skipped: codes.length - fresh.length };
  }));
  api.delete('/rewards/:id', allow('admin'), wrap((req) => {
    const id = Number(req.params.id);
    if (one('SELECT 1 FROM reward_codes WHERE reward_id=? AND issued_at IS NOT NULL', id))
      throw new Bad('По этой награде уже выдавались промокоды — её можно только скрыть.');
    run('DELETE FROM rewards WHERE id=?', id);
    return { ok: true };
  }));
}
