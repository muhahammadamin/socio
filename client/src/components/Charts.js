// Донат по категориям и столбики «заявки по дням» — чистый SVG, без библиотек.
import { h } from 'vue';
import { S } from '../store.js';
import { DAY, plural, fday } from '../util.js';

export const Donut = ({ list }) => {
  const tot = list.length, R = 52, C = 2 * Math.PI * R;
  let off = 0;
  const segs = [], leg = [];
  for (const c of S.cats) {
    const n = list.filter((r) => r.cat === c.name).length;
    const pc = tot ? Math.round((n / tot) * 100) : 0;
    if (n) {
      const len = (n / tot) * C, d = Math.max(len - 2, 0.1);
      segs.push(h('circle', { cx: 75, cy: 75, r: R, fill: 'none', stroke: c.color, 'stroke-width': 22, 'stroke-dasharray': `${d.toFixed(2)} ${(C - d).toFixed(2)}`, 'stroke-dashoffset': (-off).toFixed(2), transform: 'rotate(-90 75 75)' }, [h('title', `${c.name}: ${n}`)]));
      off += len;
    }
    leg.push(h('div', [h('i', { style: { background: c.color } }), c.name, h('b', { class: 'num' }, pc + '%')]));
  }
  if (!tot) segs.push(h('circle', { cx: 75, cy: 75, r: R, fill: 'none', stroke: 'var(--line)', 'stroke-width': 22 }));
  return h('div', { class: 'donutwrap' }, [
    h('svg', { class: 'donut', viewBox: '0 0 150 150', role: 'img', 'aria-label': 'Заявки по категориям' }, [
      ...segs,
      h('text', { x: 75, y: 76, 'font-size': 26, 'font-weight': 800 }, tot),
      h('text', { x: 75, y: 93, 'font-size': 11, style: { fill: 'var(--muted)' } }, 'Заявок'),
    ]),
    h('div', { class: 'dleg' }, leg),
  ]);
};
Donut.props = ['list'];

export const DaysChart = ({ list, days = 14 }) => {
  const t0 = new Date(); t0.setHours(0, 0, 0, 0);
  const N = days, cnt = Array(N).fill(0);
  for (const r of list) { const k = Math.floor((t0.getTime() + DAY - r.ts) / DAY); if (k >= 0 && k < N) cnt[N - 1 - k]++; }
  const mx = Math.max(4, ...cnt), W = 560, H = 200, L = 26, B = 24, T = 10, bw = (W - L) / N, out = [];
  for (let i = 0; i <= 4; i++) {
    const v = Math.round((mx * i) / 4), y = H - B - ((H - B - T) * i) / 4;
    out.push(h('line', { class: 'gl', x1: L, x2: W, y1: y, y2: y }), h('text', { x: L - 6, y: y + 3, 'text-anchor': 'end' }, v));
  }
  cnt.forEach((c, k) => {
    const hh = ((H - B - T) * c) / mx, x = L + k * bw + bw * 0.2, d = new Date(t0.getTime() - (N - 1 - k) * DAY);
    if (c) out.push(h('rect', { class: 'b', x: x.toFixed(1), y: (H - B - hh).toFixed(1), width: (bw * 0.6).toFixed(1), height: hh.toFixed(1), rx: 4 }, [h('title', `${fday(d)}: ${plural(c, ['заявка', 'заявки', 'заявок'])}`)]));
    if (k % 2 === 0 || k === N - 1) out.push(h('text', { x: (x + bw * 0.3).toFixed(1), y: H - 6, 'text-anchor': 'middle' }, fday(d)));
  });
  return h('svg', { class: 'chart', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `Новые заявки по дням за ${N} дней` }, out);
};
DaysChart.props = ['list', 'days'];
