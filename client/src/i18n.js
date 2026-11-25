// Переводы интерфейса: ru (по умолчанию), uz (латиница), en.
// t('a.b', { n: 1 }) — строка с подстановкой {n}; tm('a.b') — массив/объект как есть;
// tn(5, 'a.b') — число со словом в нужной форме (ru: 3 формы, en: 2, uz: 1).
import { ref, watch } from 'vue';
import { LANGS } from '@shared/seo.js';
import ru from './locales/ru.js';
import uz from './locales/uz.js';
import en from './locales/en.js';

const DICT = { ru, uz, en };
export { LANGS };
export const LANG_NAMES = { ru: 'Русский', uz: 'Oʻzbekcha', en: 'English' };

// Язык: из адреса (?lang=), иначе выбранный ранее, иначе русский.
// Язык браузера не учитываем: поисковый робот (en-US) иначе увидел бы русскую страницу по-английски.
function initial() {
  const q = new URLSearchParams(location.search).get('lang');
  if (LANGS.includes(q)) return q;
  try { const s = localStorage.getItem('socio.lang'); if (LANGS.includes(s)) return s; } catch { /* приватный режим */ }
  return 'ru';
}

export const lang = ref(initial());
watch(lang, (l) => {
  document.documentElement.lang = l;
  try { localStorage.setItem('socio.lang', l); } catch { /* ignore */ }
}, { immediate: true });

const get = (d, key) => key.split('.').reduce((o, k) => (o == null ? o : o[k]), d);

export function tm(key) {
  const v = get(DICT[lang.value], key);
  return v === undefined ? get(ru, key) : v;
}
export function t(key, p) {
  const v = tm(key);
  if (typeof v !== 'string') return v ?? key;
  return p ? v.replace(/\{(\w+)\}/g, (m, k) => (k in p ? p[k] : m)) : v;
}
export function tn(n, key) {
  const f = tm(key);
  if (!Array.isArray(f)) return `${n} ${f}`;
  if (lang.value === 'ru') {
    const m = n % 10, h = n % 100;
    return `${n} ${m === 1 && h !== 11 ? f[0] : m >= 2 && m <= 4 && (h < 12 || h > 14) ? f[1] : f[2]}`;
  }
  return `${n} ${n === 1 || f.length === 1 ? f[0] : f[1]}`;
}

/** Название, описание и примеры категории на текущем языке (стандартные категории переведены, остальные — как в базе). */
export function catT(c) {
  const tr = tm('cats')?.[c.name];
  return { name: tr?.name || c.name, descr: tr?.descr || c.descr, examples: tr?.examples || c.examples || [] };
}
/** Название категории по её русскому имени из базы. */
export const catName = (name) => tm('cats')?.[name]?.name || name;
