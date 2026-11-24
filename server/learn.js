// Учебный центр: курсы с видеоуроками, тестами и играми, прогресс и рейтинг учащихся.
import crypto from 'node:crypto';
import { one, all, run } from './db.js';
import { readToken, allow } from './auth.js';
import { ICONS, CAT_COLORS, COINS } from '../shared/constants.js';
import { changed, changedAll } from './events.js';
import { addCoins } from './coins.js';

// Сколько баллов даёт полностью пройденный материал.
export const POINTS = { video: 5, quiz: 10, game: 10 };

const newId = () => crypto.randomBytes(5).toString('hex');
const parse = (s) => { try { const a = JSON.parse(s || '[]'); return Array.isArray(a) ? a : []; } catch { return []; } };

export function youtubeId(v) {
  const s = String(v ?? '').trim();
  if (!s) return '';
  if (/^[\w-]{11}$/.test(s)) return s;
  const m = s.match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}

/** Проверяет и нормализует материалы курса, присланные администратором. */
function cleanItems(items, { Bad, str }) {
  if (!Array.isArray(items)) throw new Bad('Неверный формат материалов.');
  if (items.length > 40) throw new Bad('В курсе может быть не больше 40 материалов.');
  const seen = new Set();
  const line = (v, max, msg) => str(v, 1, max, msg);
  return items.map((it, i) => {
    const n = `Материал ${i + 1}`;
    let id = typeof it?.id === 'string' && /^[\w-]{2,24}$/.test(it.id) ? it.id : newId();
    if (seen.has(id)) id = newId();
    seen.add(id);
    const base = { id, type: it?.type, title: str(it?.title, 2, 100, `${n}: введите название (от 2 символов).`) };

    if (it.type === 'video') {
      const video = youtubeId(it.video);
      if (video === null) throw new Bad(`${n}: не получилось распознать ссылку на YouTube.`);
      const text = String(it.text ?? '').trim().slice(0, 4000);
      if (!video && !text) throw new Bad(`${n}: добавьте ссылку на видео или текст урока.`);
      return { ...base, video, text };
    }
    if (it.type === 'quiz') {
      const qs = Array.isArray(it.questions) ? it.questions : [];
      if (!qs.length || qs.length > 30) throw new Bad(`${n}: в тесте должно быть от 1 до 30 вопросов.`);
      return { ...base, questions: qs.map((q, j) => {
        const m = `${n}, вопрос ${j + 1}`;
        const options = (Array.isArray(q?.options) ? q.options : []).map((o) => String(o ?? '').trim()).filter(Boolean);
        if (options.length < 2 || options.length > 6) throw new Bad(`${m}: нужно от 2 до 6 вариантов ответа.`);
        options.forEach((o) => line(o, 200, `${m}: вариант ответа слишком длинный.`));
        const answer = Number(q?.answer);
        if (!Number.isInteger(answer) || answer < 0 || answer >= options.length) throw new Bad(`${m}: отметьте правильный ответ.`);
        return { q: str(q?.q, 2, 300, `${m}: введите текст вопроса.`), options, answer, explain: String(q?.explain ?? '').trim().slice(0, 300) };
      }) };
    }
    if (it.type === 'game' && it.kind === 'match') {
      const pairs = (Array.isArray(it.pairs) ? it.pairs : []).map((p) => [String(p?.[0] ?? '').trim(), String(p?.[1] ?? '').trim()]).filter((p) => p[0] && p[1]);
      if (pairs.length < 3 || pairs.length > 10) throw new Bad(`${n}: в игре «Пары» нужно от 3 до 10 пар.`);
      pairs.flat().forEach((s) => line(s, 120, `${n}: слишком длинный текст в паре.`));
      return { ...base, kind: 'match', pairs };
    }
    if (it.type === 'game' && it.kind === 'order') {
      const steps = (Array.isArray(it.steps) ? it.steps : []).map((s) => String(s ?? '').trim()).filter(Boolean);
      if (steps.length < 3 || steps.length > 10) throw new Bad(`${n}: в игре «Порядок» нужно от 3 до 10 шагов.`);
      steps.forEach((s) => line(s, 160, `${n}: слишком длинный шаг.`));
      return { ...base, kind: 'order', steps };
    }
    throw new Bad(`${n}: неизвестный тип материала.`);
  });
}

// Для учащихся ответы тестов не отдаём — их проверяет сервер.
const publicItem = (it) => it.type === 'quiz'
  ? { ...it, questions: it.questions.map(({ q, options }) => ({ q, options })) }
  : it;

const shapeCourse = (c, full) => {
  const items = parse(c.items);
  return { id: c.id, title: c.title, descr: c.descr, icon: c.icon, color: c.color, items: full ? items : items.map(publicItem) };
};

function itemPoints() {
  const map = new Map();
  for (const c of all('SELECT id, items FROM courses')) for (const it of parse(c.items)) map.set(`${c.id}:${it.id}`, POINTS[it.type] || 0);
  return map;
}
function leaders() {
  const pts = itemPoints(), by = new Map();
  for (const p of all(`SELECT p.user_id, p.course_id, p.item_id, p.score, u.name FROM learn_progress p JOIN users u ON u.id=p.user_id WHERE u.role!='admin'`)) {
    const e = by.get(p.user_id) || { name: p.name.split(' ')[0], points: 0 };
    e.points += Math.round((pts.get(`${p.course_id}:${p.item_id}`) || 0) * p.score);
    by.set(p.user_id, e);
  }
  return [...by.values()].filter((e) => e.points > 0).sort((a, b) => b.points - a.points).slice(0, 5);
}
function progressOf(uid) {
  const out = {};
  for (const p of all('SELECT course_id, item_id, score FROM learn_progress WHERE user_id=?', uid)) (out[p.course_id] ||= {})[p.item_id] = p.score;
  return out;
}
function record(uid, cid, iid, score) {
  run(`INSERT INTO learn_progress (user_id,course_id,item_id,score,ts) VALUES (?,?,?,?,?)
       ON CONFLICT(user_id,course_id,item_id) DO UPDATE SET score=MAX(score, excluded.score), ts=excluded.ts`, uid, cid, iid, score, Date.now());
}
// За полностью пройденный курс студент или помощник получает коины (один раз за курс).
function courseReward(u, c) {
  if (!['student', 'helper'].includes(u.role)) return 0;
  const items = parse(c.items), p = progressOf(u.id)[c.id] || {};
  if (!items.length || !items.every((it) => (p[it.id] ?? 0) >= 0.7)) return 0;
  const got = addCoins(u.id, COINS.courseDone, `Курс «${c.title}» пройден`, `course:${c.id}`);
  if (got) changed([u.id]);
  return got;
}
const viewer = (req) => { const h = req.headers.authorization || ''; return h.startsWith('Bearer ') ? readToken(h.slice(7)) : null; };
function findItem(cid, iid, Bad) {
  const c = one('SELECT * FROM courses WHERE id=?', Number(cid));
  if (!c) throw new Bad('Курс не найден', 404);
  const it = parse(c.items).find((x) => x.id === iid);
  if (!it) throw new Bad('Материал не найден', 404);
  return { c, it };
}

/** Открытые маршруты: каталог доступен всем, прогресс сохраняется для вошедших. */
export function publicLearnRoutes(api, h) {
  const { wrap, Bad } = h;
  api.get('/learn', wrap((req) => {
    const u = viewer(req);
    return {
      points: POINTS,
      courses: all('SELECT * FROM courses ORDER BY id').map((c) => shapeCourse(c, false)),
      progress: u ? progressOf(u.id) : null,
      leaders: leaders(),
      shorts: all('SELECT id, title, video, topic FROM shorts ORDER BY id DESC'),
    };
  }));

  // Проверка теста. Гостю просто возвращаем результат, вошедшему ещё и засчитываем.
  api.post('/learn/:cid/:iid/check', wrap((req) => {
    const { c, it } = findItem(req.params.cid, req.params.iid, Bad);
    if (it.type !== 'quiz') throw new Bad('Это не тест.');
    const answers = Array.isArray(req.body?.answers) ? req.body.answers : [];
    const results = it.questions.map((q, i) => ({ ok: Number(answers[i]) === q.answer, answer: q.answer, explain: q.explain }));
    const score = results.filter((r) => r.ok).length / results.length;
    const u = viewer(req);
    let coins = 0;
    if (u) { record(u.id, c.id, it.id, score); coins = courseReward(u, c); }
    return { results, score, coins };
  }));

  // Видео и игры проверяются в браузере — сервер только записывает результат.
  api.post('/learn/:cid/:iid/done', wrap((req) => {
    const u = viewer(req);
    if (!u) throw new Bad('Войдите, чтобы сохранить прогресс', 401);
    const { c, it } = findItem(req.params.cid, req.params.iid, Bad);
    if (it.type === 'quiz') throw new Bad('Тест засчитывается после проверки ответов.');
    const score = Math.min(1, Math.max(0, Number(req.body?.score ?? 1) || 0));
    record(u.id, c.id, it.id, score);
    return { ok: true, coins: courseReward(u, c) };
  }));
}

/** Управление курсами — только администратор. */
export function adminLearnRoutes(api, h) {
  const { wrap, Bad, str } = h;
  const fields = (b, cur = {}) => ({
    title: str(b.title ?? cur.title, 2, 80, 'Введите название курса.'),
    descr: String(b.descr ?? cur.descr ?? '').trim().slice(0, 300),
    icon: ICONS.includes(b.icon) ? b.icon : cur.icon || 'star',
    color: /^#[0-9a-f]{6}$/i.test(b.color) ? b.color : cur.color || CAT_COLORS[0],
  });

  api.get('/learn/admin', allow('admin'), wrap(() => ({
    courses: all('SELECT * FROM courses ORDER BY id').map((c) => ({
      ...shapeCourse(c, true),
      learners: one('SELECT COUNT(DISTINCT user_id) n FROM learn_progress WHERE course_id=?', c.id).n,
    })),
    shorts: all('SELECT id, title, video, topic FROM shorts ORDER BY id DESC'),
  })));
  api.post('/courses', allow('admin'), wrap((req) => {
    const f = fields(req.body || {});
    const id = Number(run('INSERT INTO courses (title,descr,icon,color,items,created_at) VALUES (?,?,?,?,?,?)', f.title, f.descr, f.icon, f.color, '[]', Date.now()).lastInsertRowid);
    changedAll();
    return { id };
  }));
  api.put('/courses/:id', allow('admin'), wrap((req) => {
    const c = one('SELECT * FROM courses WHERE id=?', Number(req.params.id));
    if (!c) throw new Bad('Курс не найден', 404);
    const b = req.body || {}, f = fields(b, c);
    const items = b.items === undefined ? parse(c.items) : cleanItems(b.items, h);
    run('UPDATE courses SET title=?, descr=?, icon=?, color=?, items=? WHERE id=?', f.title, f.descr, f.icon, f.color, JSON.stringify(items), c.id);
    // прогресс по удалённым материалам больше не нужен
    const ids = new Set(items.map((x) => x.id));
    for (const p of all('SELECT DISTINCT item_id FROM learn_progress WHERE course_id=?', c.id))
      if (!ids.has(p.item_id)) run('DELETE FROM learn_progress WHERE course_id=? AND item_id=?', c.id, p.item_id);
    changedAll();
    return shapeCourse(one('SELECT * FROM courses WHERE id=?', c.id), true);
  }));
  // короткие видео (YouTube Shorts) для студентов
  api.post('/shorts', allow('admin'), wrap((req) => {
    const b = req.body || {};
    const video = youtubeId(b.video);
    if (!video) throw new Bad('Вставьте ссылку на видео YouTube или Shorts.');
    run('INSERT INTO shorts (title,video,topic,created_at) VALUES (?,?,?,?)', str(b.title, 2, 100, 'Введите название видео.'), video, String(b.topic ?? '').trim().slice(0, 40), Date.now());
    changedAll();
    return { ok: true };
  }));
  api.delete('/shorts/:id', allow('admin'), wrap((req) => {
    run('DELETE FROM shorts WHERE id=?', Number(req.params.id));
    changedAll();
    return { ok: true };
  }));
  api.delete('/courses/:id', allow('admin'), wrap((req) => {
    run('DELETE FROM courses WHERE id=?', Number(req.params.id));
    changedAll();
    return { ok: true };
  }));
}
