<script setup>
import { computed } from 'vue';
import { S } from '../../store.js';
import { ST, ORDER } from '../../util.js';
import { DISTRICT_NAMES } from '@shared/constants.js';
import { DaysChart } from '../../components/Charts.js';
import { PageHead, Bars } from '../../components/ui.js';

const byStatus = computed(() => ORDER.map((s) => ({ l: ST[s].t, v: S.reqs.filter((r) => r.status === s).length, c: `var(${ST[s].p})` })));
const top = computed(() => S.helpers.slice().sort((a, b) => b.done - a.done).map((h) => ({ l: h.name, v: h.done })));
const byDist = computed(() => DISTRICT_NAMES.map((d) => ({ l: d.replace(' район', ''), v: S.reqs.filter((r) => r.dist === d).length })).sort((a, b) => b.v - a.v));
const avgHours = computed(() => {
  const t = S.reqs.filter((r) => r.status === 'done' && r.log.length > 1).map((r) => r.log[r.log.length - 1].ts - r.ts);
  return t.length ? (t.reduce((a, b) => a + b, 0) / t.length / 36e5).toFixed(1) : '—';
});
</script>

<template>
  <PageHead title="Статистика" sub="Как платформа работает сейчас" />
  <div class="stack">
    <div class="card"><div class="ch"><h2>Новые заявки по дням</h2><span class="note">последние 14 дней · среднее время выполнения: {{ avgHours }} ч</span></div><DaysChart :list="S.reqs" /></div>
    <div class="grid2 even">
      <div class="card"><div class="ch"><h2>Заявки по статусам</h2></div><Bars :items="byStatus" /></div>
      <div class="card"><div class="ch"><h2>Выполнено помощниками</h2></div><Bars :items="top" /></div>
    </div>
    <div class="card"><div class="ch"><h2>Заявки по районам</h2></div><Bars :items="byDist" /></div>
  </div>
</template>
