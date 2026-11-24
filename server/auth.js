import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR, one } from './db.js';

// Секрет для подписи токенов: из SECRET или генерируется один раз и хранится рядом с базой.
function loadSecret() {
  if (process.env.SECRET) return process.env.SECRET;
  const f = path.join(DATA_DIR, 'secret.key');
  try { return fs.readFileSync(f, 'utf8').trim(); }
  catch {
    const s = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(f, s, { mode: 0o600 });
    return s;
  }
}
const SECRET = loadSecret();
const TTL = 30 * 24 * 3600 * 1000;

export function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const h = crypto.scryptSync(String(pw), salt, 32);
  return `${salt.toString('hex')}:${h.toString('hex')}`;
}
export function checkPassword(pw, stored) {
  const [s, h] = String(stored).split(':');
  if (!s || !h) return false;
  const calc = crypto.scryptSync(String(pw), Buffer.from(s, 'hex'), 32);
  return crypto.timingSafeEqual(calc, Buffer.from(h, 'hex'));
}

const b64 = (s) => Buffer.from(s).toString('base64url');
const sign = (data) => crypto.createHmac('sha256', SECRET).update(data).digest('base64url');

export function makeToken(uid) {
  const body = b64(JSON.stringify({ uid, exp: Date.now() + TTL }));
  return `${body}.${sign(body)}`;
}
export async function readToken(token) {
  if (typeof token !== 'string') return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const good = sign(body);
  if (sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (!p.exp || p.exp < Date.now()) return null;
    return (await one('SELECT * FROM users WHERE id = ?', p.uid)) || null;
  } catch { return null; }
}

/** Короткоживущий подписанный «билет» (например, данные Google до завершения регистрации). */
export function makeTicket(data, ttl = 15 * 60e3) {
  const body = b64(JSON.stringify({ ...data, exp: Date.now() + ttl, t: 'ticket' }));
  return `${body}.${sign(body)}`;
}
export function readTicket(ticket) {
  if (typeof ticket !== 'string') return null;
  const [body, sig] = ticket.split('.');
  if (!body || !sig) return null;
  const good = sign(body);
  if (sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString());
    return p.t === 'ticket' && p.exp > Date.now() ? p : null;
  } catch { return null; }
}

/** Проверяет ID-токен Google (из кнопки «Войти через Google») и возвращает данные аккаунта. */
export async function verifyGoogle(credential) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw Object.assign(new Error('Вход через Google не настроен на сервере.'), { status: 503 });
  if (typeof credential !== 'string' || credential.length > 4096) return null;
  let r;
  try { r = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`); }
  catch { throw Object.assign(new Error('Не удалось связаться с Google. Попробуйте ещё раз.'), { status: 502 }); }
  if (!r.ok) return null;
  const p = await r.json();
  const ok = p.aud === clientId && ['accounts.google.com', 'https://accounts.google.com'].includes(p.iss)
    && String(p.email_verified) === 'true' && Number(p.exp) * 1000 > Date.now() && p.sub;
  return ok ? { sub: String(p.sub), email: String(p.email || ''), name: String(p.name || '').slice(0, 80) } : null;
}

export async function authenticate(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : req.query.token;
  req.user = await readToken(token);
  if (!req.user) return res.status(401).json({ error: 'Нужно войти в аккаунт' });
  next();
}
export const allow = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'Недостаточно прав' });

// Защита от подбора пароля: после 10 неудачных попыток за 10 минут IP временно блокируется.
const hits = new Map();
const entry = (ip) => {
  const now = Date.now();
  let e = hits.get(ip);
  if (!e || e.reset < now) { e = { n: 0, reset: now + 10 * 60e3 }; hits.set(ip, e); }
  if (hits.size > 5000) for (const [key, v] of hits) if (v.reset < now) hits.delete(key);
  return e;
};
export function loginLimiter(req, res, next) {
  if (entry(req.ip).n >= 10) return res.status(429).json({ error: 'Слишком много попыток. Попробуйте через несколько минут.' });
  next();
}
export const countFailure = (req) => { entry(req.ip).n++; };
