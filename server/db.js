import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

export const DATA_DIR = path.resolve(process.env.DATA_DIR || 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

export const db = new DatabaseSync(process.env.DB_FILE || path.join(DATA_DIR, 'socio.db'));
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');

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

db.exec(`${usersTable('users')}
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
CREATE TABLE IF NOT EXISTS shorts (
  id         INTEGER PRIMARY KEY,
  title      TEXT    NOT NULL,
  video      TEXT    NOT NULL,
  topic      TEXT    NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);
`);

/* ---------- миграции для уже существующих баз ---------- */
const hasCol = (t, c) => db.prepare(`PRAGMA table_info(${t})`).all().some((x) => x.name === c);
const addCol = (t, c, def) => { if (!hasCol(t, c)) db.exec(`ALTER TABLE ${t} ADD COLUMN ${c} ${def}`); };

addCol('users', 'skills', `TEXT NOT NULL DEFAULT '[]'`);
addCol('volunteers', 'skills', `TEXT NOT NULL DEFAULT '[]'`);
addCol('categories', 'descr', `TEXT NOT NULL DEFAULT ''`);
addCol('categories', 'examples', `TEXT NOT NULL DEFAULT ''`);

// Роль «студент» требует нового CHECK в users — SQLite умеет это только через пересоздание таблицы.
if (!db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='users'`).get().sql.includes(`'student'`)) {
  const cols = ['id', 'role', 'name', 'phone', 'phone_key', 'pass', 'dist', 'avail', 'rating_sum', 'rating_cnt', 'base_done', 'base_helped', 'balance', 'skills', 'created_at'].join(',');
  db.exec('PRAGMA foreign_keys = OFF; PRAGMA legacy_alter_table = ON;');
  try {
    db.exec('BEGIN');
    db.exec(usersTable('users_new'));
    db.exec(`INSERT INTO users_new (${cols}) SELECT ${cols} FROM users; DROP TABLE users; ALTER TABLE users_new RENAME TO users;`);
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
  finally { db.exec('PRAGMA legacy_alter_table = OFF; PRAGMA foreign_keys = ON;'); }
}
addCol('users', 'google_sub', 'TEXT');
addCol('users', 'email', `TEXT NOT NULL DEFAULT ''`);
addCol('users', 'verified', 'INTEGER NOT NULL DEFAULT 1');
addCol('users', 'needs', `TEXT NOT NULL DEFAULT '[]'`); // id категорий, с которыми человеку нужна помощь
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google ON users(google_sub) WHERE google_sub IS NOT NULL');

export const one =(sql, ...p) => db.prepare(sql).get(...p);
export const all = (sql, ...p) => db.prepare(sql).all(...p);
export const run = (sql, ...p) => db.prepare(sql).run(...p);

export function tx(fn) {
  db.exec('BEGIN');
  try { const r = fn(); db.exec('COMMIT'); return r; }
  catch (e) { db.exec('ROLLBACK'); throw e; }
}
