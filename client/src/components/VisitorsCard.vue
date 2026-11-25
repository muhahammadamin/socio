<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { api } from '../api.js';
import { fday, plural } from '../util.js';
import CountUp from './CountUp.vue';
import Icon from './Icon.vue';

// Посетители сайта для администратора: все, кто заходил (не только зарегистрированные). Обновляется раз в минуту.
const V = ref(null), err = ref(''), days = ref(14);
async function load() {
  try { V.value = await api.get(`/admin/visitors?days=${days.value}`); err.value = ''; }
  catch (e) { err.value = e.message; }
}
let timer;
onMounted(() => { load(); timer = setInterval(load, 60e3); });
onBeforeUnmount(() => clearInterval(timer));

const stats = computed(() => V.value && [
  ['users', 'Всего посетителей', V.value.total, 'за всё время'],
  ['plus', 'Новые сегодня', V.value.today, `${V.value.activeToday} заходили сегодня`],
  ['chart', 'За 7 дней', V.value.week, 'новых посетителей'],
  ['clock', 'За 30 дней', V.value.month, `${V.value.returning} возвращались`],
]);

// столбики по дням
const W = 560, H = 190, L = 28, B = 24, T = 10;
const chart = computed(() => {
  const list = V.value?.days || [];
  if (!list.length) return null;
  const mx = Math.max(4, ...list.map((d) => d.n)), bw = (W - L) / list.length, step = Math.ceil(list.length / 7);
  const grid = [0, 1, 2, 3, 4].map((i) => ({ v: Math.round((mx * i) / 4), y: H - B - ((H - B - T) * i) / 4 }));
  const bars = list.map((d, k) => {
    const hh = ((H - B - T) * d.n) / mx, x = L + k * bw + bw * 0.2;
    return { ...d, x, w: bw * 0.6, y: H - B - hh, h: hh, label: (list.length - 1 - k) % step === 0 ? fday(new Date(d.ts)) : '' };
  });
  return { grid, bars };
});
</script>

<template>
  <div class="card visitors">
    <div class="ch">
      <h2><Icon name="users" :size="18" /> Посетители сайта</h2>
      <select v-model="days" style="width:auto;font-weight:700" aria-label="Период графика" @change="load">
        <option :value="14">14 дней</option><option :value="30">30 дней</option><option :value="90">90 дней</option>
      </select>
    </div>
    <p v-if="err" class="formerr">{{ err }}</p>
    <template v-else-if="V">
      <div class="vstats">
        <div v-for="s in stats" :key="s[1]" class="vstat">
          <span class="vl"><Icon :name="s[0]" :size="15" />{{ s[1] }}</span>
          <b><CountUp :value="s[2]" /></b>
          <span class="note">{{ s[3] }}</span>
        </div>
      </div>
      <svg v-if="chart" class="chart" :viewBox="`0 0 ${W} ${H}`" role="img" :aria-label="`Новые посетители по дням за ${days} дней`">
        <template v-for="g in chart.grid" :key="'g' + g.y"><line class="gl" :x1="L" :x2="W" :y1="g.y" :y2="g.y" /><text :x="L - 6" :y="g.y + 3" text-anchor="end">{{ g.v }}</text></template>
        <template v-for="b in chart.bars" :key="b.ts">
          <rect v-if="b.n" class="b" :x="b.x.toFixed(1)" :y="b.y.toFixed(1)" :width="b.w.toFixed(1)" :height="b.h.toFixed(1)" rx="4"><title>{{ fday(new Date(b.ts)) }}: {{ plural(b.n, ['новый посетитель', 'новых посетителя', 'новых посетителей']) }}</title></rect>
          <text v-if="b.label" :x="(b.x + b.w / 2).toFixed(1)" :y="H - 6" text-anchor="middle">{{ b.label }}</text>
        </template>
      </svg>
      <p class="note" style="margin-top:6px">Один браузер считается один раз, поисковые роботы не учитываются. Сутки — по времени Ташкента.</p>
    </template>
    <p v-else class="note">Загрузка…</p>
  </div>
</template>

<style scoped>
.visitors{margin-bottom:18px}
.visitors h2{display:flex;align-items:center;gap:8px}
.vstats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:4px 0 14px}
.vstat{display:flex;flex-direction:column;gap:2px;padding:12px 14px;border-radius:14px;background:color-mix(in srgb,var(--ink) 4%,transparent);box-shadow:inset 0 0 0 1px var(--line)}
.vstat .vl{display:flex;align-items:center;gap:6px;color:var(--muted);font-size:13px;font-weight:700}
.vstat b{font-size:28px;font-weight:800;letter-spacing:-.5px}
</style>
