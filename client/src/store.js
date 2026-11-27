import { reactive } from 'vue';
import { api, setUnauthorizedHandler } from './api.js';

const TOKEN = 'socio.token';

export const S = reactive({
  token: localStorage.getItem(TOKEN),
  me: null,
  loaded: false,
  live: false,
  demo: false,
  districts: {},
  cats: [],
  reqs: [],
  offers: [], // заявки, которые автоматически пришли помощнику и ждут «Принять» или «Отказаться»
  notes: [],
  helpers: [],
  users: [],
  vols: [],
  students: [],
  complaints: [],
  admins: [],
  mapOpen: false,
  q: '',
  toast: { text: '', bad: false, on: false },
  theme: localStorage.getItem('socio.theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
});

export const HOME = { admin: '/admin', helper: '/helper', user: '/app', student: '/student' };
export const LOGIN = (role) => (role === 'admin' ? '/admin/login' : '/login');

/* ---------- тема ---------- */
export function applyTheme() { document.documentElement.dataset.theme = S.theme; }
export function toggleTheme() {
  S.theme = S.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('socio.theme', S.theme);
  applyTheme();
}

/* ---------- уведомление внизу экрана ---------- */
let toastTimer;
export function toast(text, bad = false) {
  Object.assign(S.toast, { text, bad, on: true });
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { S.toast.on = false; }, bad ? 4500 : 3000);
}

/* ---------- данные ---------- */
export async function load() {
  const d = await api.get('/bootstrap');
  announceOffers(d.offers || [], d.me);
  Object.assign(S, {
    me: d.me, demo: d.demo, districts: d.districts, cats: d.categories, reqs: d.requests, offers: d.offers || [], notes: d.notifications,
    helpers: d.helpers || [], users: d.users || [], vols: d.volunteers || [], students: d.students || [], complaints: d.complaints || [], admins: d.admins || [], loaded: true,
  });
  connectLive();
}

/** Выполнить действие на сервере, показать результат и обновить данные. */
export async function act(fn, okText) {
  try {
    const r = await fn(api);
    if (okText) toast(typeof okText === 'function' ? okText(r) : okText);
    await load();
    return r;
  } catch (e) {
    toast(e.message, true);
    throw e;
  }
}

export function signIn({ token, user }) {
  localStorage.setItem(TOKEN, token);
  S.token = token;
  S.me = user;
  S.loaded = false;
}

export function signOut() {
  localStorage.removeItem(TOKEN);
  disconnectLive();
  seenOffers = null;
  Object.assign(S, { token: null, me: null, loaded: false, reqs: [], offers: [], notes: [], helpers: [], users: [], vols: [], students: [], complaints: [], admins: [], q: '', mapOpen: false });
}

/* ---------- живые обновления (Server-Sent Events) ---------- */
let es = null, reloadTimer = null;
function connectLive() {
  if (es || !S.token) return;
  es = new EventSource(`/api/events?token=${encodeURIComponent(S.token)}`);
  es.onopen = () => { S.live = true; };
  es.onerror = () => { S.live = false; };
  es.addEventListener('change', () => {
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(() => { if (S.token) load().catch(() => {}); }, 250);
  });
}
function disconnectLive() { if (es) { es.close(); es = null; } S.live = false; }

// Браузер может держать ушедшую страницу в кэше вместе с открытым соединением,
// а соединений к одному сайту не больше шести. Закрываем при уходе, открываем при возврате.
addEventListener('pagehide', disconnectLive);
addEventListener('pageshow', (e) => { if (e.persisted && S.token) load().catch(() => {}); });

/* ---------- новые заявки помощнику: звук, уведомление браузера, счётчик во вкладке ---------- */
let seenOffers = null; // id уже показанных; null — первая загрузка, о старых заявках не сигналим
function announceOffers(list, me) {
  if (me?.role !== 'helper') return;
  const fresh = seenOffers ? list.filter((o) => !seenOffers.has(o.id)) : [];
  seenOffers = new Set(list.map((o) => o.id));
  if (!fresh.length) return;
  chime();
  const text = fresh.length === 1 ? `«${fresh[0].title}» — ${fresh[0].dist}` : `Новых заявок: ${fresh.length}`;
  toast(`Новая заявка для вас: ${text}`);
  if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
    try { const n = new Notification('Socio: новая заявка', { body: text, icon: '/favicon.svg', tag: 'socio-offer' }); n.onclick = () => { focus(); n.close(); }; }
    catch { /* браузер не дал показать — счётчик и звук остаются */ }
  }
}
function chime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    for (const [f, t] of [[880, 0], [1320, 0.16]]) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = f; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.3);
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.32);
    }
    setTimeout(() => ctx.close(), 800);
  } catch { /* звук недоступен — не страшно */ }
}
export const canNotify = () => 'Notification' in window && Notification.permission === 'default';
export async function askNotify() {
  if (!('Notification' in window)) return toast('Этот браузер не поддерживает уведомления', true);
  const p = await Notification.requestPermission();
  toast(p === 'granted' ? 'Готово: о новых заявках браузер сообщит, даже если вкладка свёрнута' : 'Уведомления не включены — новые заявки всё равно появятся на главной', p !== 'granted');
}

/* ---------- выборки ---------- */
export const catOf = (name) => S.cats.find((c) => c.name === name) || { name, color: '#8a90b0', icon: 'heart' };
export const unread = () => S.notes.filter((n) => !n.read).length;
export const activeOfHelper = (id) => S.reqs.filter((r) => r.helperId === id && r.status !== 'done');

export function setupAuthExpiry(router) {
  setUnauthorizedHandler(() => {
    const role = S.me?.role;
    signOut();
    toast('Сессия завершилась. Войдите снова.', true);
    router.push(LOGIN(role));
  });
}
