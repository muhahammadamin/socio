// Маленькие компоненты без собственного состояния, собранные в одном месте.
import { h } from 'vue';
import Icon from './Icon.vue';
import CountUp from './CountUp.vue';
import { ST } from '../util.js';
import { catOf } from '../store.js';

export const Logo = (props) => h('svg', { viewBox: '0 0 44 40', 'aria-hidden': 'true', innerHTML:
  '<defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5b7bff"/><stop offset="1" stop-color="#9a58e8"/></linearGradient></defs><path d="M22 37S3 25.5 3 13.5A8.6 8.6 0 0 1 22 9a8.6 8.6 0 0 1 19 4.5C41 25.5 22 37 22 37z" fill="url(#lg)"/><path d="M13 22c4 4 9 6 9 6s5-2 9-6" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".9"/>' });

export const Avatar = ({ name = '', size = 36 }) => {
  const w = String(name).trim().split(/\s+/);
  const ini = ((w[0]?.[0] || '') + (w[1]?.[0] || '')).toUpperCase();
  let hue = 0;
  for (const ch of String(name)) hue = (hue * 31 + ch.charCodeAt(0)) % 360;
  return h('span', { class: 'av', 'aria-hidden': 'true', style: { width: size + 'px', height: size + 'px', fontSize: Math.round(size * 0.38) + 'px', background: `hsl(${hue} 48% 42%)` } }, ini);
};
Avatar.props = ['name', 'size'];

export const StatusPill = ({ status }) => h('span', { class: ['pill', ST[status]?.c] }, ST[status]?.t || status);
StatusPill.props = ['status'];

export const CatIcon = ({ cat, size = 28 }) => {
  const c = catOf(cat);
  return h('span', { class: 'cico', style: { '--c': c.color, width: size + 'px', height: size + 'px' } }, [h(Icon, { name: c.icon, size: Math.round(size * 0.54) })]);
};
CatIcon.props = ['cat', 'size'];

export const Empty = ({ title, text }) => h('div', { class: 'empty' }, [h('b', title), text]);
Empty.props = ['title', 'text'];

export const Tile = ({ color, icon, label, value, sub }) => h('div', { class: ['tile', color] }, [
  h('span', { class: 'ti' }, [h(Icon, { name: icon })]),
  h('div', [h('div', { class: 'tl' }, label), h('div', { class: 'tv' }, [h(CountUp, { value })]), h('div', { class: 'ts' }, sub)]),
]);
Tile.props = ['color', 'icon', 'label', 'value', 'sub'];

export const PageHead = (props, { slots }) => h('div', { class: 'head' }, [
  h('div', [h('h1', props.title), props.sub ? h('p', props.sub) : null]),
  slots.default ? h('div', { class: 'right' }, slots.default()) : null,
]);
PageHead.props = ['title', 'sub'];

export const Bars = ({ items }) => {
  const mx = Math.max(1, ...items.map((i) => i.v));
  return h('div', { class: 'bars' }, items.map((i) => h('div', { class: 'bar' }, [
    h('span', i.l),
    h('div', { class: 'trk' }, [h('div', { class: 'fill', style: { width: (i.v / mx) * 100 + '%', ...(i.c ? { '--c': i.c } : {}) } })]),
    h('b', { class: 'num' }, i.v),
  ])));
};
Bars.props = ['items'];

export const Legend = () => h('div', { class: 'legend' }, ['new', 'assigned', 'accepted', 'progress'].map((s) =>
  h('span', [h('i', { style: { background: `var(${ST[s].p})` } }), ST[s].t])));
