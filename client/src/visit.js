// Счётчик посетителей: каждый браузер получает анонимный случайный id и один раз за сессию отмечается на сервере.
// Заодно запоминаем, откуда человек пришёл в первый раз (метка ?ref= / utm_source= или сайт-источник),
// чтобы администратор видел это и у посетителей, и у тех, кто потом зарегистрировался.
import { ref } from 'vue';
import { api } from './api.js';

export const visitors = ref(null); // свежее число посетителей (после отметки)

function visitorId() {
  try {
    let id = localStorage.getItem('socio.vid');
    if (!id) { id = crypto.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`; localStorage.setItem('socio.vid', id); }
    return id;
  } catch { return null; } // хранилище недоступно — не считаем, чтобы не плодить дубли
}

const SRC_KEY = 'socio.src';
const TAGS = ['ref', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'source'];
let current = null;

/** Источник этого захода: метка в адресе и сайт, с которого перешли (если это не наш сайт). */
function readSource() {
  const q = new URLSearchParams(location.search);
  let referrer = document.referrer || '';
  try { if (referrer && new URL(referrer).host === location.host) referrer = ''; } catch { referrer = ''; }
  return { ref: q.get('ref') || q.get('utm_source') || q.get('source') || '', campaign: q.get('utm_campaign') || '', referrer };
}
/** Источник первого захода этого браузера — его же отправляем при регистрации. */
export function firstSource() {
  if (current) return current;
  const now = readSource();
  try {
    const saved = JSON.parse(localStorage.getItem(SRC_KEY) || 'null');
    // первый заход запоминаем навсегда; новая явная метка в ссылке (?ref=) важнее старого «прямого» захода
    if (saved && !(now.ref && !saved.ref)) return (current = saved);
    localStorage.setItem(SRC_KEY, JSON.stringify(now));
  } catch { /* без хранилища — только текущий заход */ }
  return (current = now);
}

// метки больше не нужны в адресной строке: убираем, чтобы ими не делились дальше и не путали статистику
function cleanUrl() {
  const u = new URL(location.href);
  if (!TAGS.some((k) => u.searchParams.has(k))) return;
  TAGS.forEach((k) => u.searchParams.delete(k));
  history.replaceState(history.state, '', u.pathname + (u.search === '?' ? '' : u.search) + u.hash);
}

export async function countVisit() {
  if (location.pathname.startsWith('/admin')) return; // панель управления — не посещение сайта
  const src = firstSource();
  cleanUrl();
  const id = visitorId();
  if (!id) return;
  try { visitors.value = (await api.post('/visit', { id, src })).visitors; } catch { /* не мешаем работе сайта */ }
}
