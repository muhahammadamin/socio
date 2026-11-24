// Состояние учебного центра. Вошедшим прогресс хранит сервер, гостям — браузер.
import { reactive } from 'vue';
import { api } from './api.js';

const GUEST_KEY = 'socio.learn.guest';
export const PASS = 0.7; // материал считается пройденным от 70%

export const L = reactive({ courses: [], shorts: [], progress: {}, leaders: [], points: { video: 5, quiz: 10, game: 10 }, guest: true, loaded: false });

const readGuest = () => { try { return JSON.parse(localStorage.getItem(GUEST_KEY)) || {}; } catch { return {}; } };
const writeGuest = () => { try { localStorage.setItem(GUEST_KEY, JSON.stringify(L.progress)); } catch { /* приватный режим */ } };

export async function loadLearn() {
  const d = await api.get('/learn');
  Object.assign(L, { courses: d.courses, shorts: d.shorts || [], leaders: d.leaders, points: d.points, guest: !d.progress, progress: d.progress || readGuest(), loaded: true });
}
const refreshLeaders = () => api.get('/learn').then((d) => { L.leaders = d.leaders; }).catch(() => {});

function setLocal(cid, iid, score) {
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

export const TYPE = {
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
