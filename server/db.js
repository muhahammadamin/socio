import { createClient } from '@libsql/client';
import { AsyncLocalStorage } from 'node:async_hooks';
import fs from 'node:fs';
import path from 'node:path';

export const DATA_DIR = path.resolve(process.env.DATA_DIR || 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

// В продакшене база живёт в Turso (облачная SQLite) и не стирается при перезапусках.
// Без TURSO_DATABASE_URL используется локальный файл — для разработки.
const REMOTE = process.env.TURSO_DATABASE_URL;
const LOCAL_FILE = process.env.DB_FILE || path.join(DATA_DIR, 'socio.db');
export const db = createClient(REMOTE
  ? { url: REMOTE, authToken: process.env.TURSO_AUTH_TOKEN }
  : { url: 'file:' + LOCAL_FILE.replaceAll('\\', '/') });
console.log(`[socio] база данных: ${REMOTE ? 'Turso (' + new URL(REMOTE).host + ')' : LOCAL_FILE}`);

// Внутри tx() запросы идут в транзакцию, вне её — напрямую в базу.
const txStore = new AsyncLocalStorage();
const toObj = (rs) => rs.rows.map((r) => Object.fromEntries(rs.columns.map((c, i) => [c, r[i]])));
// NaN (например, Number('abc') из адреса) libSQL не принимает — превращаем в NULL, запрос просто ничего не найдёт.
const exec = (sql, args) => (txStore.getStore() || db).execute({ sql, args: args.map((a) => (Number.isNaN(a) ? null : a)) });

export const one = async (sql, ...p) => toObj(await exec(sql, p))[0];
export const all = async (sql, ...p) => toObj(await exec(sql, p));
export async function run(sql, ...p) {
  const r = await exec(sql, p);
  return { changes: r.rowsAffected, lastInsertRowid: r.lastInsertRowid === undefined ? undefined : Number(r.lastInsertRowid) };
}

export async function tx(fn) {
  if (txStore.getStore()) return fn(); // уже внутри транзакции
  const t = await db.transaction('write');
  try {
    const r = await txStore.run(t, fn);
    await t.commit();
    return r;
  } catch (e) {
    try { await t.rollback(); } catch { /* соединение могло закрыться */ }
    throw e;
  } finally { t.close(); }
}

const usersTable = (name) => `
CREATE TABLE IF NOT EXISTS ${name} (
  id          INTEGER PRIMARY KEY,
  role        TEXT    NOT NULL CHECK (role IN ('admin','helper','user','student')),
  name        TEXT    NOT NULL,
  phone       TEXT    NOT NULL,
  phone_key   TEXT    NOT NULL UNIQUE,
  pass        TEXT    NOT NULL,
  dist        TEXT    NOT NULL DEFAULT '',
  avail       INTEGER NOT NULL DEFAULT 1,
  rating_sum  REAL    NOT NULL DEFAULT 0,
  rating_cnt  INTEGER NOT NULL DEFAULT 0,
  base_done   INTEGER NOT NULL DEFAULT 0,
  base_helped INTEGER NOT NULL DEFAULT 0,
  balance     INTEGER NOT NULL DEFAULT 0,
  coins       INTEGER NOT NULL DEFAULT 0,
  skills      TEXT    NOT NULL DEFAULT '[]',
  school      TEXT    NOT NULL DEFAULT '',
  google_sub  TEXT,
  email       TEXT    NOT NULL DEFAULT '',
  verified    INTEGER NOT NULL DEFAULT 1,
  needs       TEXT    NOT NULL DEFAULT '[]',
  created_at  INTEGER NOT NULL
);`;

if (!REMOTE) await db.execute('PRAGMA journal_mode = WAL');
await db.executeMultiple(`${usersTable('users')}
CREATE TABLE IF NOT EXISTS categories (
  id       INTEGER PRIMARY KEY,
  name     TEXT NOT NULL UNIQUE COLLATE NOCASE,
  color    TEXT NOT NULL,
  icon     TEXT NOT NULL DEFAULT 'heart',
  descr    TEXT NOT NULL DEFAULT '',
  examples TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS requests (
  id         INTEGER PRIMARY KEY,
  title      TEXT    NOT NULL,
  descr      TEXT    NOT NULL,
  cat_id     INTEGER NOT NULL REFERENCES categories(id),
  dist       TEXT    NOT NULL,
  addr       TEXT    NOT NULL,
  phone      TEXT    NOT NULL,
  x          REAL    NOT NULL,
  y          REAL    NOT NULL,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  helper_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status     TEXT    NOT NULL DEFAULT 'new',
  due_days   INTEGER NOT NULL DEFAULT 3,
  rating     INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_req_user   ON requests(user_id);
CREATE INDEX IF NOT EXISTS idx_req_helper ON requests(helper_id);
CREATE TABLE IF NOT EXISTS request_log (
  req_id INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  status TEXT    NOT NULL,
  ts     INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_log_req ON request_log(req_id);
-- автоматическая рассылка: кому из помощников предложена заявка и что он ответил
-- state: open — ждёт ответа, declined — отказался, taken — взял, missed — заявку взял другой
CREATE TABLE IF NOT EXISTS request_offers (
  req_id    INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  helper_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  state     TEXT    NOT NULL DEFAULT 'open',
  reason    TEXT    NOT NULL DEFAULT '',
  ts        INTEGER NOT NULL,
  PRIMARY KEY (req_id, helper_id)
);
CREATE INDEX IF NOT EXISTS idx_offers_helper ON request_offers(helper_id, state);
CREATE TABLE IF NOT EXISTS volunteers (
  id         INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  phone      TEXT NOT NULL,
  dist       TEXT NOT NULL,
  about      TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS complaints (
  id         INTEGER PRIMARY KEY,
  from_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  against_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  req_id     INTEGER REFERENCES requests(id) ON DELETE SET NULL,
  text       TEXT    NOT NULL,
  status     TEXT    NOT NULL DEFAULT 'open',
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS notifications (
  id      INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text    TEXT    NOT NULL,
  req_id  INTEGER,
  ts      INTEGER NOT NULL,
  read    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_notes_user ON notifications(user_id);
CREATE TABLE IF NOT EXISTS courses (
  id         INTEGER PRIMARY KEY,
  title      TEXT    NOT NULL,
  descr      TEXT    NOT NULL DEFAULT '',
  icon       TEXT    NOT NULL DEFAULT 'star',
  color      TEXT    NOT NULL DEFAULT '#3b5bf0',
  items      TEXT    NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS learn_progress (
  user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  item_id   TEXT    NOT NULL,
  score     REAL    NOT NULL,
  ts        INTEGER NOT NULL,
  PRIMARY KEY (user_id, course_id, item_id)
);
CREATE TABLE IF NOT EXISTS coin_log (
  id      INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount  INTEGER NOT NULL,
  reason  TEXT    NOT NULL,
  ref     TEXT,
  ts      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_coins_user ON coin_log(user_id);
CREATE TABLE IF NOT EXISTS rewards (
  id         INTEGER PRIMARY KEY,
  title      TEXT    NOT NULL,
  descr      TEXT    NOT NULL DEFAULT '',
  partner    TEXT    NOT NULL DEFAULT '',
  cost       INTEGER NOT NULL,
  active     INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS reward_codes (
  id        INTEGER PRIMARY KEY,
  reward_id INTEGER NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
  code      TEXT    NOT NULL,
  user_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  issued_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_codes_reward ON reward_codes(reward_id, user_id);
-- посетители сайта: анонимный id браузера, без IP и личных данных
CREATE TABLE IF NOT EXISTS visitors (
  id       TEXT    PRIMARY KEY,
  first_ts INTEGER NOT NULL,
  last_ts  INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS shorts (
  id         INTEGER PRIMARY KEY,
  title      TEXT    NOT NULL,
  video      TEXT    NOT NULL,
  topic      TEXT    NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);
`);

/* ---------- миграции для уже существующих баз ---------- */
const hasCol = async (t, c) => (await all(`PRAGMA table_info(${t})`)).some((x) => x.name === c);
const addCol = async (t, c, def) => { if (!(await hasCol(t, c))) await db.execute(`ALTER TABLE ${t} ADD COLUMN ${c} ${def}`); };

await addCol('users', 'skills', `TEXT NOT NULL DEFAULT '[]'`);
await addCol('volunteers', 'skills', `TEXT NOT NULL DEFAULT '[]'`);
await addCol('categories', 'descr', `TEXT NOT NULL DEFAULT ''`);
await addCol('categories', 'examples', `TEXT NOT NULL DEFAULT ''`);

// Роль «студент» требует нового CHECK в users — SQLite умеет это только через пересоздание таблицы.
if (!(await one(`SELECT sql FROM sqlite_master WHERE type='table' AND name='users'`)).sql.includes(`'student'`)) {
  const cols = ['id', 'role', 'name', 'phone', 'phone_key', 'pass', 'dist', 'avail', 'rating_sum', 'rating_cnt', 'base_done', 'base_helped', 'balance', 'skills', 'created_at'].join(',');
  await db.executeMultiple(`PRAGMA foreign_keys = OFF; PRAGMA legacy_alter_table = ON; BEGIN;
    ${usersTable('users_new')}
    INSERT INTO users_new (${cols}) SELECT ${cols} FROM users; DROP TABLE users; ALTER TABLE users_new RENAME TO users;
    COMMIT; PRAGMA legacy_alter_table = OFF; PRAGMA foreign_keys = ON;`);
}
await addCol('users', 'google_sub', 'TEXT');
await addCol('users', 'email', `TEXT NOT NULL DEFAULT ''`);
await addCol('users', 'verified', 'INTEGER NOT NULL DEFAULT 1');
await addCol('users', 'needs', `TEXT NOT NULL DEFAULT '[]'`); // id категорий, с которыми человеку нужна помощь
// откуда человек пришёл на сайт: канал (telegram, google, метка из ссылки…) и подробности (сайт, кампания)
await addCol('users', 'source', 'TEXT');
await addCol('users', 'source_detail', `TEXT NOT NULL DEFAULT ''`);
await addCol('visitors', 'source', 'TEXT');
await addCol('visitors', 'source_detail', `TEXT NOT NULL DEFAULT ''`);
// рассылка заявок: 0 — помощникам района, 1 — всему городу, 2 — передана координатору
await addCol('requests', 'stage', 'INTEGER NOT NULL DEFAULT 0');
await addCol('requests', 'stage_ts', 'INTEGER NOT NULL DEFAULT 0');
// награды: code — промокоды партнёра, cert — сертификат волонтёра (выдаётся сразу), manual — выдаёт координатор
await addCol('rewards', 'kind', `TEXT NOT NULL DEFAULT 'code'`);
await addCol('rewards', 'icon', `TEXT NOT NULL DEFAULT 'gift'`);
await addCol('reward_codes', 'status', `TEXT NOT NULL DEFAULT 'done'`); // pending — ждёт выдачи координатором
await addCol('reward_codes', 'note', `TEXT NOT NULL DEFAULT ''`);
await addCol('reward_codes', 'done_at', 'INTEGER');
await db.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google ON users(google_sub) WHERE google_sub IS NOT NULL');
