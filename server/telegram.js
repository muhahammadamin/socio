// Telegram-бот Socio.
// Человек нажимает «Поделиться номером»: Telegram сам передаёт номер его аккаунта, подделать его нельзя.
// После этого в чат приходят уведомления всех аккаунтов сайта с этим номером (нужна помощь, волонтёр, студент, админ),
// а волонтёр принимает или отклоняет заявку кнопками прямо в Telegram. Пароль в чате не вводится никогда.
//
// Бот настраивается в панели управления (раздел «Telegram-бот»): токен, вкл/выкл, кому приходят уведомления,
// кнопки заявок, приветствие, подключённые люди. Токен можно задать и переменной TELEGRAM_BOT_TOKEN — тогда он
// используется, пока в панели не указан другой. На https-адресе бот работает через webhook (входящее сообщение
// будит уснувший сервис), локально приём сообщений включается TELEGRAM_POLLING=1.
import crypto from 'node:crypto';
import { db } from './db.js';
import { phoneKey, formatPhone, DECLINE_REASONS } from '../shared/constants.js';

const ROLE_T = { user: 'Нужна помощь', helper: 'Волонтёр', student: 'Студент', admin: 'Администратор' };
const ROLES = Object.keys(ROLE_T);
const ENV_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const ENV_HOOK = (process.env.TELEGRAM_WEBHOOK_URL || process.env.RENDER_EXTERNAL_URL || process.env.SITE_URL || '').replace(/\/$/, '');
const HOME = { user: '/user', helper: '/helper', student: '/student', admin: '/admin' };
const DEFAULT_WELCOME = 'Здравствуйте! Это бот Socio — волонтёрской помощи в Ташкенте.\n\nНажмите «📱 Поделиться номером» внизу. По этому номеру бот найдёт ваши аккаунты на сайте и будет присылать уведомления: о заявках, ответах волонтёров, коинах и обучении.\n\nПароль вводить не нужно.';

/* ---------- настройки (таблица settings) ---------- */
let cfg = { token: '', enabled: true, roles: Object.fromEntries(ROLES.map((r) => [r, true])), buttons: true, welcome: '', site: '' };
const state = { bot: null, mode: 'off', error: '', since: 0 };
let gen = 0; // меняется при каждом перезапуске — старый опрос сам останавливается
let actions = null; // { accept(user, reqId), decline(user, reqId, reason) } — из api.js

const token = () => cfg.token || ENV_TOKEN;
const secretOf = (t) => (t ? crypto.createHash('sha256').update(`socio-tg:${t}`).digest('hex').slice(0, 40) : '');
const site = () => (process.env.SITE_URL || process.env.RENDER_EXTERNAL_URL || cfg.site || '').replace(/\/$/, '');
const active = () => !!(cfg.enabled && token() && state.bot);
export const tgBotName = () => (active() ? state.bot : null);

async function loadCfg() {
  await db.execute('CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
  const r = (await rows(`SELECT value FROM settings WHERE key='telegram'`))[0];
  if (r) { try { const v = JSON.parse(r.value); cfg = { ...cfg, ...v, roles: { ...cfg.roles, ...(v.roles || {}) } }; } catch { /* битые настройки — берём по умолчанию */ } }
}
const saveCfg = () => db.execute({ sql: `INSERT INTO settings (key,value) VALUES ('telegram',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value`, args: [JSON.stringify(cfg)] });

/* ---------- база: запросы вне транзакций сайта (бот работает уже после них) ---------- */
async function rows(sql, ...args) {
  const rs = await db.execute({ sql, args });
  return rs.rows.map((r) => Object.fromEntries(rs.columns.map((c, i) => [c, r[i]])));
}
const first = async (sql, ...args) => (await rows(sql, ...args))[0];
/** Все аккаунты сайта с этим номером: у администратора ключ — цифры номера, у остальных — «цифры:роль». */
const accountsOf = (digits) => rows(`SELECT * FROM users WHERE phone_key=? OR phone_key LIKE ? ORDER BY id`, digits, `${digits}:%`);
export async function tgLinked(phone) {
  if (!active()) return false;
  return !!(await first('SELECT 1 FROM tg_chats WHERE phone_key=?', phoneKey(phone)));
}

/* ---------- Telegram Bot API ---------- */
async function callWith(tok, method, body = {}, timeoutMs = 10000) {
  const r = await fetch(`https://api.telegram.org/bot${tok}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs),
  });
  const j = await r.json().catch(() => ({}));
  if (!j.ok) { const e = new Error(j.description || `HTTP ${r.status}`); e.code = j.error_code || r.status; throw e; }
  return j.result;
}
const call = (method, body, t) => callWith(token(), method, body, t);
const say = (chat, text, extra = {}) => call('sendMessage', { chat_id: chat, text, disable_web_page_preview: true, ...extra });
const siteBtn = (path, text = 'Открыть на сайте') => (site().startsWith('https://') ? [{ text, url: site() + path }] : null);
const kb = (...list) => ({ reply_markup: { inline_keyboard: list.filter(Boolean) } });
const allowedRoles = () => ROLES.filter((r) => cfg.roles[r]);

/* ---------- уведомления ---------- */
/** Отправить уведомление сайта в Telegram. Вызывается из notify(); ждём, пока транзакция сайта сохранится. */
export function tgNotify(noteId) {
  if (!active() || !noteId) return;
  const attempt = async (n) => {
    try {
      if (!(await deliver(noteId)) && n < 2) setTimeout(() => attempt(n + 1), 4000);
    } catch (e) { console.error('[socio] telegram:', e.message); }
  };
  setTimeout(() => attempt(1), 700);
}
async function deliver(noteId) {
  const n = await first(`SELECT n.text, n.req_id, n.link, u.id uid, u.role, u.phone FROM notifications n JOIN users u ON u.id=n.user_id WHERE n.id=?`, noteId);
  if (!n) return false; // транзакция ещё идёт или откатилась
  if (!active() || !cfg.roles[n.role]) return true;
  const digits = phoneKey(n.phone);
  const chats = await rows('SELECT chat_id FROM tg_chats WHERE phone_key=?', digits);
  if (!chats.length) return true;
  const many = (await accountsOf(digits)).filter((u) => cfg.roles[u.role]).length > 1;
  let text = (many ? `«${ROLE_T[n.role]}» · ` : '') + n.text;
  let markup = kb(n.link ? siteBtn(n.link, /campaign-/.test(n.link) && n.role !== 'admin' ? '📝 Открыть анкету' : 'Открыть на сайте') : siteBtn(HOME[n.role]));
  if (n.role === 'helper' && n.req_id && await first(`SELECT 1 FROM request_offers WHERE req_id=? AND helper_id=? AND state='open'`, n.req_id, n.uid)) {
    const r = await first('SELECT * FROM requests WHERE id=?', n.req_id);
    if (r) {
      text = `🔔 ${text}\n\n${offerText(r)}`;
      markup = cfg.buttons ? offerButtons(r.id, n.uid) : kb(siteBtn('/helper/tasks', 'Ответить на сайте'));
    }
  }
  for (const c of chats) await say(c.chat_id, text, markup).catch((e) => console.error('[socio] telegram:', e.message));
  return true;
}
const offerText = (r) => `📋 ${r.title}\n📍 ${r.dist}${r.due_days ? ` · нужно в течение ${r.due_days} дн.` : ''}${r.descr ? `\n\n${String(r.descr).slice(0, 600)}` : ''}`;
const offerButtons = (rid, uid) => kb([{ text: '✅ Принять', callback_data: `a:${rid}:${uid}` }, { text: '✖️ Отказаться', callback_data: `d:${rid}:${uid}` }]);

/* ---------- входящие сообщения ---------- */
const askPhone = {
  reply_markup: { keyboard: [[{ text: '📱 Поделиться номером', request_contact: true }]], resize_keyboard: true, one_time_keyboard: true },
};
const accountsText = (list) => list.map((u) => `• ${ROLE_T[u.role]} — ${u.name}${cfg.roles[u.role] ? '' : ' (уведомления для этой роли сейчас выключены)'}`).join('\n');

async function onMessage(m) {
  const chat = String(m.chat.id);
  if (m.chat.type !== 'private') return;
  const link = await first('SELECT phone_key FROM tg_chats WHERE chat_id=?', chat);

  if (m.contact) {
    // только свой номер: чужой контакт можно переслать, но его user_id не совпадёт с отправителем
    if (m.contact.user_id !== m.from.id) return say(chat, 'Нужен ваш собственный номер. Нажмите кнопку «📱 Поделиться номером» внизу.', askPhone);
    const digits = phoneKey(m.contact.phone_number);
    const name = [m.from.first_name, m.from.last_name].filter(Boolean).join(' ');
    await db.execute({ sql: `INSERT INTO tg_chats (chat_id, phone_key, tg_user, tg_name, linked_at) VALUES (?,?,?,?,?)
      ON CONFLICT(chat_id) DO UPDATE SET phone_key=excluded.phone_key, tg_user=excluded.tg_user, tg_name=excluded.tg_name, linked_at=excluded.linked_at`,
    args: [chat, digits, m.from.username || String(m.from.id), name, Date.now()] });
    const list = await accountsOf(digits);
    const remove = { reply_markup: { remove_keyboard: true } };
    if (!list.length) {
      return say(chat, `Номер ${formatPhone(`+${digits}`)} сохранён, но аккаунтов с ним на сайте пока нет.\n\nЗарегистрируйтесь с этим номером${site() ? `: ${site()}/register` : ' на сайте'} — уведомления сразу начнут приходить сюда.`, remove);
    }
    const canButtons = cfg.buttons && cfg.roles.helper && list.some((u) => u.role === 'helper');
    await say(chat, `Готово! Telegram подключён к номеру ${formatPhone(`+${digits}`)}.\n\nВаши аккаунты:\n${accountsText(list)}\n\nСюда будут приходить уведомления этих аккаунтов.${canButtons ? ' Новые заявки — с кнопками «Принять» и «Отказаться».' : ''}`, remove);
    if (canButtons) await sendOffers(chat, digits, true);
    return;
  }

  const cmd = String(m.text || '').trim().split(/[\s@]/)[0].toLowerCase();
  if (!link || cmd === '/start') {
    if (link && cmd === '/start') return say(chat, `Telegram уже подключён к номеру ${formatPhone(`+${link.phone_key}`)}.\n\n${help()}`);
    return say(chat, cfg.welcome.trim() || DEFAULT_WELCOME, askPhone);
  }
  if (cmd === '/accounts' || cmd === '/me') {
    const list = await accountsOf(link.phone_key);
    return say(chat, list.length ? `Номер ${formatPhone(`+${link.phone_key}`)}. Ваши аккаунты:\n${accountsText(list)}` : 'С этим номером на сайте пока нет аккаунтов.', kb(siteBtn('/login', 'Войти на сайт')));
  }
  if (cmd === '/offers' || cmd === '/zayavki') return sendOffers(chat, link.phone_key);
  if (cmd === '/stop') {
    await db.execute({ sql: 'DELETE FROM tg_chats WHERE chat_id=?', args: [chat] });
    return say(chat, 'Telegram отключён — уведомления сюда больше не придут. Чтобы подключить снова, отправьте /start.', { reply_markup: { remove_keyboard: true } });
  }
  return say(chat, help());
}
const help = () => 'Команды:\n/offers — заявки, которые ждут вашего ответа\n/accounts — ваши аккаунты на сайте\n/stop — отключить уведомления';

/** Открытые предложения заявок волонтёру — каждое отдельным сообщением с кнопками. */
async function sendOffers(chat, digits, quiet = false) {
  const h = (await accountsOf(digits)).find((u) => u.role === 'helper');
  if (!h) return quiet ? null : say(chat, 'У вас нет аккаунта волонтёра с этим номером.');
  if (!cfg.roles.helper) return quiet ? null : say(chat, 'Уведомления волонтёрам в Telegram сейчас выключены администратором. Заявки — на сайте.', kb(siteBtn('/helper/tasks', 'Мои заявки')));
  const list = await rows(`SELECT r.* FROM request_offers o JOIN requests r ON r.id=o.req_id
    WHERE o.helper_id=? AND o.state='open' AND r.status='new' AND r.helper_id IS NULL ORDER BY r.created_at`, h.id);
  if (!list.length) return quiet ? null : say(chat, h.verified ? 'Сейчас заявок для вас нет. Как только появится заявка рядом, она придёт сюда.' : 'Ваш профиль волонтёра ещё проверяет координатор. После проверки заявки начнут приходить сюда.');
  await say(chat, `Заявки, которые ждут вашего ответа: ${list.length}`);
  for (const r of list) await say(chat, offerText(r), cfg.buttons ? offerButtons(r.id, h.id) : kb(siteBtn('/helper/tasks', 'Ответить на сайте')));
}

/* ---------- кнопки ---------- */
async function onCallback(cb) {
  const answer = (text = '', alert = false) => call('answerCallbackQuery', { callback_query_id: cb.id, text, show_alert: alert }).catch(() => {});
  const msg = cb.message;
  if (!msg) return answer();
  if (!cfg.buttons || !cfg.roles.helper) return answer('Принимать заявки в Telegram сейчас нельзя — откройте сайт.', true);
  const chat = String(msg.chat.id);
  const [k, rid, uid, reason = ''] = String(cb.data || '').split(':');
  const link = await first('SELECT phone_key FROM tg_chats WHERE chat_id=?', chat);
  const u = link && await first(`SELECT * FROM users WHERE id=? AND role='helper'`, Number(uid));
  if (!u || phoneKey(u.phone) !== link.phone_key) return answer('Этот аккаунт волонтёра не подключён к этому чату. Отправьте /start.', true);
  const edit = (text, markup = { inline_keyboard: [] }) => call('editMessageText', { chat_id: chat, message_id: msg.message_id, text, reply_markup: markup, disable_web_page_preview: true }).catch(() => {});
  const base = msg.text || '';

  try {
    if (k === 'a') {
      await actions.accept(u, Number(rid));
      const r = await first('SELECT * FROM requests WHERE id=?', Number(rid));
      await edit(`${base}\n\n✅ Вы приняли эту заявку`);
      await answer('Заявка ваша!');
      await say(chat, `Заявка «${r.title}» теперь ваша. Позвоните человеку и договоритесь о встрече:\n\n📞 ${r.phone}\n📍 ${r.dist}${r.addr ? `, ${r.addr}` : ''}\n\nОтмечайте шаги («Еду», «Выполнено») на сайте.`, kb(siteBtn('/helper/tasks', 'Мои заявки')));
    } else if (k === 'd') {
      // сначала спрашиваем причину — она помогает координатору
      const reasons = Object.entries(DECLINE_REASONS).map(([key, t]) => [{ text: t, callback_data: `r:${rid}:${uid}:${key}` }]);
      await call('editMessageReplyMarkup', { chat_id: chat, message_id: msg.message_id, reply_markup: { inline_keyboard: [...reasons,
        [{ text: 'Без причины', callback_data: `r:${rid}:${uid}:` }, { text: '↩︎ Назад', callback_data: `b:${rid}:${uid}` }]] } });
      await answer('Почему не можете взять заявку?');
    } else if (k === 'b') {
      await call('editMessageReplyMarkup', { chat_id: chat, message_id: msg.message_id, reply_markup: offerButtons(rid, uid).reply_markup });
      await answer();
    } else if (k === 'r') {
      await actions.decline(u, Number(rid), reason);
      await edit(`${base}\n\n✖️ Вы отказались — заявка ушла другим волонтёрам`);
      await answer('Спасибо, что ответили');
    } else await answer();
  } catch (e) {
    await answer(e.message || 'Не получилось. Попробуйте на сайте.', true);
    if (e.status === 409 || e.status === 404) await edit(`${base}\n\n— ${e.message}`);
  }
}

async function onUpdate(u) {
  try {
    if (u.message) await onMessage(u.message);
    else if (u.callback_query) await onCallback(u.callback_query);
  } catch (e) { console.error('[socio] telegram:', e.message); }
}

/* ---------- запуск и перезапуск ---------- */
/** (Пере)подключить бота по текущим настройкам. Старый бот отключается от сайта. */
async function apply(prevToken = '') {
  const g = ++gen;
  Object.assign(state, { bot: null, mode: 'off', error: '', since: Date.now() });
  // другой токен — старый бот больше не должен слать сюда сообщения
  if (prevToken && prevToken !== token()) await callWith(prevToken, 'deleteWebhook').catch(() => {});
  if (!token()) return;
  if (!cfg.enabled) { await call('deleteWebhook').catch(() => {}); return; }
  try {
    const me = await call('getMe');
    if (g !== gen) return;
    state.bot = me.username;
    await call('setMyCommands', { commands: [
      { command: 'offers', description: 'Заявки, которые ждут ответа' },
      { command: 'accounts', description: 'Мои аккаунты на сайте' },
      { command: 'stop', description: 'Отключить уведомления' },
    ] }).catch(() => {});
    const base = ENV_HOOK || cfg.site;
    if (base.startsWith('https://')) {
      const s = secretOf(token());
      await call('setWebhook', { url: `${base}/api/telegram/${s}`, secret_token: s, allowed_updates: ['message', 'callback_query'] });
      state.mode = 'webhook';
    } else if (process.env.TELEGRAM_POLLING === '1') {
      await call('deleteWebhook');
      state.mode = 'polling';
      poll(g, 0);
    } else {
      state.mode = 'send-only';
      state.error = 'Бот только отправляет сообщения: для приёма нужен https-адрес сайта. Откройте эту страницу с рабочего адреса сайта и нажмите «Сохранить».';
    }
    console.log(`[socio] Telegram-бот @${state.bot}: ${state.mode}`);
  } catch (e) {
    if (g !== gen) return;
    state.bot = null;
    state.error = e.code === 401 || e.code === 404 ? 'Telegram не принял токен — проверьте его в @BotFather.' : `Не удалось подключиться к Telegram: ${e.message}`;
    console.error('[socio] Telegram-бот не запущен:', e.message);
  }
}
async function poll(g, offset) {
  while (g === gen) {
    try {
      const list = await call('getUpdates', { offset, timeout: 30, allowed_updates: ['message', 'callback_query'] }, 40000);
      if (g !== gen) return;
      for (const u of list) { offset = u.update_id + 1; await onUpdate(u); }
    } catch (e) {
      if (!/abort|timeout/i.test(e.message)) console.error('[socio] telegram опрос:', e.message);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

export async function startTelegram(acts) {
  actions = acts;
  try { await loadCfg(); } catch (e) { console.error('[socio] настройки Telegram:', e.message); }
  await apply();
}

/* ---------- маршруты ---------- */
/** Webhook: Telegram присылает заголовок с секретом — чужие запросы отбрасываются. */
export function telegramRoutes(router) {
  router.post('/telegram/:secret', (req, res) => {
    const s = secretOf(token());
    if (!active() || req.params.secret !== s || req.get('X-Telegram-Bot-Api-Secret-Token') !== s) return res.sendStatus(403);
    res.sendStatus(200);
    onUpdate(req.body || {});
  });
}

/** Раздел «Telegram-бот» в панели управления. Менять настройки может только главный администратор. */
export function telegramAdminRoutes(router, { allow, wrap, Bad, isMain }) {
  const status = async (req) => {
    const chats = await rows('SELECT * FROM tg_chats ORDER BY linked_at DESC');
    const out = [];
    for (const c of chats) {
      out.push({ chatId: c.chat_id, phone: formatPhone(`+${c.phone_key}`), tgUser: c.tg_user, tgName: c.tg_name, linkedAt: c.linked_at,
        accounts: (await accountsOf(c.phone_key)).map((u) => ({ id: u.id, role: u.role, roleTitle: ROLE_T[u.role], name: u.name })) });
    }
    const t = token();
    return {
      canEdit: isMain(req.user),
      token: t ? { source: cfg.token ? 'panel' : 'env', tail: t.slice(-6) } : null,
      enabled: cfg.enabled, roles: cfg.roles, buttons: cfg.buttons, welcome: cfg.welcome, defaultWelcome: DEFAULT_WELCOME,
      bot: state.bot, mode: state.mode, error: state.error, since: state.since,
      chats: out, myChats: out.filter((c) => phoneKey(c.phone) === phoneKey(req.user.phone)).length,
    };
  };
  const mustEdit = (req) => { if (!isMain(req.user)) throw new Bad('Настройки бота меняет только главный администратор.', 403); };

  router.get('/admin/telegram', allow('admin'), wrap(status));

  router.put('/admin/telegram', allow('admin'), wrap(async (req) => {
    mustEdit(req);
    const b = req.body || {}, prev = token();
    if (typeof b.token === 'string' && b.token.trim()) {
      const t = b.token.trim();
      if (!/^\d{5,}:[\w-]{30,}$/.test(t)) throw new Bad('Это не похоже на токен бота. Он выглядит так: 123456789:AAH... — скопируйте его из @BotFather целиком.');
      try { await callWith(t, 'getMe'); } catch (e) { throw new Bad(e.code === 401 || e.code === 404 ? 'Telegram не принял токен — проверьте, что скопировали его целиком.' : `Не удалось проверить токен: ${e.message}`); }
      cfg.token = t;
    }
    if (b.removeToken) cfg.token = '';
    if (typeof b.enabled === 'boolean') cfg.enabled = b.enabled;
    if (typeof b.buttons === 'boolean') cfg.buttons = b.buttons;
    if (b.roles && typeof b.roles === 'object') for (const r of ROLES) if (typeof b.roles[r] === 'boolean') cfg.roles[r] = b.roles[r];
    if (typeof b.welcome === 'string') {
      if (b.welcome.length > 1500) throw new Bad('Приветствие — не длиннее 1500 символов.');
      cfg.welcome = b.welcome.trim();
    }
    // адрес сайта для webhook, если сервер сам его не знает (нет SITE_URL / Render)
    const host = `${req.protocol}://${req.get('host')}`;
    if (host.startsWith('https://')) cfg.site = host;
    await saveCfg();
    await apply(prev);
    return status(req);
  }));

  router.post('/admin/telegram/test', allow('admin'), wrap(async (req) => {
    if (!active()) throw new Bad('Бот сейчас не работает.');
    const chats = await rows('SELECT chat_id FROM tg_chats WHERE phone_key=?', phoneKey(req.user.phone));
    if (!chats.length) throw new Bad(`Сначала подключите свой Telegram: откройте @${state.bot}, нажмите «Старт» и «Поделиться номером» (номер ${req.user.phone}).`);
    for (const c of chats) await say(c.chat_id, `✅ Проверка: бот Socio работает. Уведомления панели управления приходят сюда.`);
    return { sent: chats.length };
  }));

  router.delete('/admin/telegram/chats/:chat', allow('admin'), wrap(async (req) => {
    mustEdit(req);
    const c = await first('SELECT chat_id FROM tg_chats WHERE chat_id=?', String(req.params.chat));
    if (!c) throw new Bad('Этот чат уже отключён.', 404);
    await db.execute({ sql: 'DELETE FROM tg_chats WHERE chat_id=?', args: [c.chat_id] });
    if (active()) await say(c.chat_id, 'Администратор отключил уведомления Socio в этом чате. Чтобы подключить снова, отправьте /start.', { reply_markup: { remove_keyboard: true } }).catch(() => {});
    return status(req);
  }));
}
