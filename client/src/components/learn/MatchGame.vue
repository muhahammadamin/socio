<script setup>
import { computed, ref, watch } from 'vue';
import { shuffle } from '../../learn.js';
import Icon from '../Icon.vue';

// Игра «Пары»: выберите карточку слева, затем подходящую справа (или наоборот).
const props = defineProps({ item: { type: Object, required: true } });
const emit = defineEmits(['done']);

const left = ref([]), right = ref([]), matched = ref(new Set()), pick = ref(null), wrong = ref(null), mistakes = ref(0);
function reset() {
  const idx = props.item.pairs.map((_, i) => i);
  left.value = shuffle(idx);
  let r = shuffle(idx);
  if (r.length > 1 && r.every((v, i) => v === left.value[i])) r = [...r.slice(1), r[0]];
  right.value = r;
  matched.value = new Set(); pick.value = null; wrong.value = null; mistakes.value = 0;
}
watch(() => props.item.id, reset, { immediate: true });

const finished = computed(() => matched.value.size === props.item.pairs.length);
const score = computed(() => Math.max(0.5, 1 - mistakes.value * 0.1));

let wrongTimer;
function choose(side, i) {
  if (matched.value.has(i) || finished.value) return;
  if (!pick.value || pick.value.side === side) { pick.value = { side, i }; return; }
  if (pick.value.i === i) {
    matched.value = new Set([...matched.value, i]);
    pick.value = null;
    if (finished.value) emit('done', score.value);
  } else {
    mistakes.value++;
    wrong.value = [pick.value, { side, i }];
    pick.value = null;
    clearTimeout(wrongTimer);
    wrongTimer = setTimeout(() => { wrong.value = null; }, 700);
  }
}
const cls = (side, i) => ({
  on: pick.value?.side === side && pick.value.i === i,
  ok: matched.value.has(i),
  bad: wrong.value?.some((w) => w.side === side && w.i === i),
});
</script>

<template>
  <div class="fcol">
    <p class="note">Соедините пары: нажмите карточку слева, потом подходящую справа. Ошибок: <b class="num">{{ mistakes }}</b></p>
    <div class="match">
      <div class="mcol">
        <button v-for="i in left" :key="'l' + i" type="button" class="mcard" :class="cls('l', i)" :disabled="matched.has(i)" :aria-pressed="pick?.side === 'l' && pick.i === i" @click="choose('l', i)">{{ item.pairs[i][0] }}</button>
      </div>
      <div class="mcol">
        <button v-for="i in right" :key="'r' + i" type="button" class="mcard" :class="cls('r', i)" :disabled="matched.has(i)" :aria-pressed="pick?.side === 'r' && pick.i === i" @click="choose('r', i)">{{ item.pairs[i][1] }}</button>
      </div>
    </div>
    <div v-if="finished" class="scorebar good">
      <b class="num">{{ Math.round(score * 100) }}%</b>
      <span>{{ mistakes ? `Все пары найдены! Ошибок: ${mistakes}.` : 'Без единой ошибки!' }}</span>
      <button class="btn ghost sm" type="button" @click="reset"><Icon name="refresh" />Сыграть ещё</button>
    </div>
  </div>
</template>
