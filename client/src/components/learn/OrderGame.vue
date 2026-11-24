<script setup>
import { computed, ref, watch } from 'vue';
import { shuffle } from '../../learn.js';
import Icon from '../Icon.vue';

// Игра «Порядок»: расставьте шаги в правильной последовательности (кнопками или перетаскиванием).
const props = defineProps({ item: { type: Object, required: true } });
const emit = defineEmits(['done']);

const order = ref([]), checked = ref(false), tries = ref(0), solved = ref(false), drag = ref(null);
function reset() {
  let o = shuffle(props.item.steps.map((_, i) => i));
  if (o.every((v, i) => v === i)) o = [...o.slice(1), o[0]];
  order.value = o; checked.value = false; tries.value = 0; solved.value = false;
}
watch(() => props.item.id, reset, { immediate: true });

const rightCount = computed(() => order.value.filter((v, i) => v === i).length);
const score = computed(() => Math.max(0.5, 1 - (tries.value - 1) * 0.15));

function move(from, to) {
  if (solved.value || to < 0 || to >= order.value.length) return;
  const o = [...order.value];
  const [x] = o.splice(from, 1);
  o.splice(to, 0, x);
  order.value = o;
  checked.value = false;
}
function check() {
  tries.value++;
  checked.value = true;
  if (rightCount.value === order.value.length) { solved.value = true; emit('done', score.value); }
}
const onDrop = (to) => { if (drag.value !== null) move(drag.value, to); drag.value = null; };
</script>

<template>
  <div class="fcol">
    <p class="note">Расставьте шаги по порядку: перетащите карточку или двигайте её стрелками.</p>
    <ol class="order">
      <li v-for="(s, pos) in order" :key="s" class="ocard" :class="{ ok: checked && s === pos, bad: checked && s !== pos }"
        :draggable="!solved" @dragstart="drag = pos" @dragover.prevent @drop="onDrop(pos)">
        <span class="qn">{{ pos + 1 }}</span>
        <span class="grow">{{ item.steps[s] }}</span>
        <template v-if="!solved">
          <button class="iconbtn sm" type="button" :disabled="pos === 0" :aria-label="`Выше: ${item.steps[s]}`" @click="move(pos, pos - 1)"><Icon name="up" /></button>
          <button class="iconbtn sm" type="button" :disabled="pos === order.length - 1" :aria-label="`Ниже: ${item.steps[s]}`" @click="move(pos, pos + 1)"><Icon name="down" /></button>
        </template>
      </li>
    </ol>
    <div v-if="solved" class="scorebar good">
      <b class="num">{{ Math.round(score * 100) }}%</b>
      <span>{{ tries === 1 ? 'Верно с первой попытки!' : `Верно! Попыток: ${tries}.` }}</span>
      <button class="btn ghost sm" type="button" @click="reset"><Icon name="refresh" />Сыграть ещё</button>
    </div>
    <div v-else class="lfoot">
      <span v-if="checked" class="note">На своих местах: <b class="num">{{ rightCount }} из {{ order.length }}</b>. Поменяйте красные и проверьте снова.</span>
      <button class="btn" type="button" @click="check"><Icon name="check" />Проверить</button>
    </div>
  </div>
</template>
