<script setup>
import { DISTRICTS, DISTRICT_NAMES, MAP_W, MAP_H } from '@shared/constants.js';
import { shortDist } from '../util.js';

const props = defineProps({
  pins: { type: Array, default: () => [] }, // [{x,y,id?,t,c}]
  labels: Boolean,
  pick: Boolean,
});
const emit = defineEmits(['pick', 'open']);

const grid = [];
for (let i = -60; i < 480; i += 26) grid.push(`M${i} -80V360`);
for (let j = -60; j < 400; j += 24) grid.push(`M-80 ${j}H480`);
const gridPath = grid.join('');

function onClick(e) {
  if (!props.pick || e.target.closest('.pin')) return;
  const r = e.currentTarget.getBoundingClientRect();
  emit('pick', { x: ((e.clientX - r.left) / r.width) * MAP_W, y: ((e.clientY - r.top) / r.height) * MAP_H });
}
function onKey(e, p) {
  if (p.id && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); emit('open', p.id); }
}
</script>

<template>
  <svg class="map" :class="{ pick }" :viewBox="`0 0 ${MAP_W} ${MAP_H}`" role="img" aria-label="Карта Ташкента" @click="onClick">
    <rect :width="MAP_W" :height="MAP_H" fill="var(--m-bg)" />
    <g fill="var(--m-park)">
      <ellipse cx="140" cy="100" rx="24" ry="14" /><ellipse cx="275" cy="195" rx="30" ry="16" />
      <ellipse cx="345" cy="55" rx="20" ry="12" /><ellipse cx="55" cy="205" rx="22" ry="13" />
    </g>
    <path d="M0 195C80 178 140 205 215 170S345 140 400 150" fill="none" stroke="var(--m-water)" stroke-width="7" stroke-linecap="round" />
    <g transform="rotate(-14 200 130)" stroke="var(--m-street)" stroke-width="1.3" fill="none" opacity=".9"><path :d="gridPath" /></g>
    <g stroke="var(--m-road)" stroke-width="4.5" fill="none" stroke-linecap="round">
      <ellipse cx="200" cy="130" rx="150" ry="100" /><ellipse cx="200" cy="130" rx="72" ry="48" stroke-width="3" />
      <path d="M200 130V0M200 130L400 62M200 130L400 205M200 130L50 260M200 130L0 62" />
    </g>
    <template v-if="labels">
      <text v-for="n in DISTRICT_NAMES" :key="n" class="ml" :x="DISTRICTS[n][0]" :y="DISTRICTS[n][1] + 11">{{ shortDist(n) }}</text>
    </template>
    <text class="mcity" x="200" y="100">Ташкент</text>
    <g v-for="(p, i) in pins" :key="p.id ?? i" class="pin" :transform="`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`"
      :tabindex="p.id ? 0 : undefined" :role="p.id ? 'button' : undefined"
      @click.stop="p.id && emit('open', p.id)" @keydown="onKey($event, p)">
      <title>{{ p.t }}</title>
      <path d="M0 0C-3-7-9-12-9-19A9 9 0 0 1 9-19C9-12 3-7 0 0Z" :fill="p.c" stroke="#fff" stroke-width="1.5" />
      <circle cy="-19" r="3.2" fill="#fff" />
    </g>
  </svg>
</template>
