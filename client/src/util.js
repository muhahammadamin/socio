import { DISTRICTS } from '@shared/constants.js';

export const MIN = 6e4, HOUR = 36e5, DAY = 864e5;

export const ST = {
  new: { t: 'Новая', c: 'orange', p: '--p-orange' },
  assigned: { t: 'Назначена', c: 'teal', p: '--p-teal' },
  accepted: { t: 'Принята', c: 'purple', p: '--p-purple' },
  progress: { t: 'В работе', c: 'blue', p: '--p-blue' },
  done: { t: 'Выполнена', c: 'green', p: '--p-green' },
};
export const STEPT = { new: 'Создана', assigned: 'Назначена', accepted: 'Принята', progress: 'В работе', done: 'Выполнена' };
export const ORDER = ['new', 'assigned', 'accepted', 'progress', 'done'];

export function plural(n, f) {
  const m = n % 10, h = n % 100;
  return `${n} ${m === 1 && h !== 11 ? f[0] : m >= 2 && m <= 4 && (h < 12 || h > 14) ? f[1] : f[2]}`;
}
export function ago(ts) {
  const d = Date.now() - ts;
  if (d < MIN) return 'только что';
  if (d < HOUR) return `${Math.floor(d / MIN)} мин назад`;
  if (d < DAY) return `${Math.floor(d / HOUR)} ч назад`;
  return `${Math.floor(d / DAY)} дн назад`;
}
const p2 = (n) => String(n).padStart(2, '0');
export const fdate = (ts) => { const d = new Date(ts); return `${p2(d.getDate())}.${p2(d.getMonth() + 1)}.${d.getFullYear()}`; };
export const ftime = (ts) => { const d = new Date(ts); return `${p2(d.getHours())}:${p2(d.getMinutes())}`; };
export const fday = (d) => `${p2(d.getDate())}.${p2(d.getMonth() + 1)}`;

export function dueText(r) {
  const left = Math.ceil((r.ts + r.due * DAY - Date.now()) / DAY);
  return left > 0 ? `Осталось: ${plural(left, ['день', 'дня', 'дней'])}` : 'Срок истёк';
}
export function km(helperDist, r) {
  const a = DISTRICTS[helperDist];
  if (!a) return null;
  return Math.max(0.4, Math.hypot(a[0] - r.x, a[1] - r.y) * 0.07).toFixed(1);
}
export const finishedAt = (r) => r.log.length ? r.log[r.log.length - 1].ts : r.ts;
export const shortDist = (d) => String(d).replace(' район', '');
export const telHref = (p) => `tel:+${String(p).replace(/\D/g, '')}`;
