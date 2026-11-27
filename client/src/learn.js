// Состояние учебного центра. Вошедшим прогресс хранит сервер, гостям — браузер.
import { reactive } from 'vue';
import { api } from './api.js';

const GUEST_KEY = 'socio.learn.guest';
export const PASS = 0.7; // материал считается пройденным от 70%

export const L = reactive({ courses: [], shorts: [], progress: {}, leaders: [], points: { lesson: 5, video: 5, quiz: 10, game: 10 }, days: [], guest: true, loaded: false });

const readGuest = () => { try { return JSON.parse(localStorage.getItem(GUEST_KEY)) || {}; } catch { return {}; } };
const writeGuest = () => { try { localStorage.setItem(GUEST_KEY, JSON.stringify(L.progress)); } catch { /* приватный режим */ } };

export async function loadLearn() {
  const d = await api.get('/learn');
  Object.assign(L, { courses: d.courses, shorts: d.shorts || [], leaders: d.leaders, points: d.points, days: d.days || [], guest: !d.progress, progress: d.progress || readGuest(), loaded: true });
}
const refreshLeaders = () => api.get('/learn').then((d) => { L.leaders = d.leaders; }).catch(() => {});

const today = () => Math.floor((Date.now() + 5 * 36e5) / 864e5); // день по Ташкенту
function setLocal(cid, iid, score) {
  if (!L.days.includes(today())) L.days = [today(), ...L.days];
  const c = (L.progress[cid] ||= {});
  c[iid] = Math.max(c[iid] || 0, score);
  if (L.guest) writeGuest();
}

/** Засчитать видео или игру. */
export async function complete(cid, iid, score = 1) {
  setLocal(cid, iid, score);
  if (L.guest) return { coins: 0 };
  const r = await api.post(`/learn/${cid}/${iid}/done`, { score });
  refreshLeaders();
  return r;
}
/** Проверить тест на сервере (ответы хранятся только там). */
export async function checkQuiz(cid, iid, answers) {
  const r = await api.post(`/learn/${cid}/${iid}/check`, { answers });
  setLocal(cid, iid, r.score);
  if (!L.guest) refreshLeaders();
  return r;
}

export const scoreOf = (cid, iid) => L.progress[cid]?.[iid];
export const isDone = (cid, iid) => (L.progress[cid]?.[iid] ?? 0) >= PASS;
export const doneCount = (c) => c.items.filter((it) => isDone(c.id, it.id)).length;
export const totalPoints = () => L.courses.reduce((s, c) => s + c.items.reduce((t, it) => t + Math.round((L.points[it.type] || 0) * (scoreOf(c.id, it.id) || 0)), 0), 0);

export const LEVELS = [[0, 'Новичок'], [30, 'Ученик'], [80, 'Знаток'], [150, 'Наставник']];
export function levelOf(points) {
  let i = 0;
  while (i + 1 < LEVELS.length && points >= LEVELS[i + 1][0]) i++;
  const next = LEVELS[i + 1];
  return { name: LEVELS[i][1], next: next ? { at: next[0], name: next[1] } : null, from: LEVELS[i][0] };
}

/** Сколько дней подряд человек учится (сегодня или вчера — серия не прервана). */
export function streak() {
  const set = new Set(L.days);
  let d = today();
  if (!set.has(d)) d -= 1;
  let n = 0;
  while (set.has(d)) { n++; d--; }
  return n;
}
export const learnedToday = () => L.days.includes(today());

/** Достижения считаются по прогрессу — без отдельного хранения. */
export function achievements() {
  const items = L.courses.flatMap((c) => c.items.map((it) => ({ c, it, s: scoreOf(c.id, it.id) })));
  const done = items.filter((x) => (x.s ?? 0) >= PASS);
  const full = L.courses.filter((c) => c.items.length && doneCount(c) === c.items.length).length;
  return [
    { id: 'first', icon: 'star', t: 'Первый шаг', d: 'Пройти первый материал', on: done.length >= 1 },
    { id: 'reader', icon: 'book', t: 'Читатель', d: 'Прочитать 3 урока', on: done.filter((x) => x.it.type === 'lesson').length >= 3 },
    { id: 'perfect', icon: 'quiz', t: 'Отличник', d: 'Тест на 100%', on: items.some((x) => x.it.type === 'quiz' && x.s === 1) },
    { id: 'gamer', icon: 'game', t: 'Игрок', d: 'Пройти 3 игры', on: done.filter((x) => x.it.type === 'game').length >= 3 },
    { id: 'course', icon: 'trophy', t: 'Выпускник', d: 'Пройти курс целиком', on: full >= 1 },
    { id: 'streak', icon: 'heart', t: 'Три дня подряд', d: 'Учиться 3 дня подряд', on: streak() >= 3 },
    { id: 'all', icon: 'shield', t: 'Наставник', d: 'Пройти все курсы', on: L.courses.length > 0 && full === L.courses.length },
  ];
}

export const TYPE = {
  lesson: { icon: 'book', label: 'Урок' },
  video: { icon: 'play', label: 'Видеоурок' },
  quiz: { icon: 'quiz', label: 'Тест' },
  game: { icon: 'game', label: 'Игра' },
};
export const typeLabel = (it) => (it.type === 'video' && !it.video ? 'Урок' : TYPE[it.type]?.label);
export const typeIcon = (it) => (it.type === 'video' && !it.video ? 'book' : TYPE[it.type]?.icon || 'star');

export function shuffle(a) {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
  return r;
}
