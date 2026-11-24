<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';

// Число «набегает» от 0 до значения, когда попадает на экран, и плавно меняется при обновлениях.
// Не число (например «4.8 ★» или «—») показывается как есть.
const props = defineProps({ value: [Number, String], duration: { type: Number, default: 1400 } });
const el = ref(null);
const shown = ref(0);
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const fmt = (n) => Math.round(n).toLocaleString('ru-RU');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
let raf = 0, seen = false, io = null;

function run(to) {
  cancelAnimationFrame(raf);
  const from = shown.value, t0 = performance.now();
  if (reduce || from === to) { shown.value = to; return; }
  const step = (t) => {
    const k = Math.min(1, (t - t0) / props.duration);
    shown.value = from + (to - from) * (1 - Math.pow(1 - k, 3)); // ease-out
    if (k < 1) raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
}

watch(() => props.value, (v) => { if (seen && isNum(v)) run(v); });
onMounted(() => {
  io = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    seen = true; io.disconnect();
    if (isNum(props.value)) run(props.value);
  }, { threshold: 0.3 });
  io.observe(el.value);
});
onBeforeUnmount(() => { cancelAnimationFrame(raf); io?.disconnect(); });
</script>

<template>
  <span ref="el" class="num">{{ isNum(value) ? fmt(shown) : value }}</span>
</template>
