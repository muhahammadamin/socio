<script setup>
import { ref } from 'vue';
import { act } from '../store.js';
import Icon from './Icon.vue';
import DeclineButton from './DeclineButton.vue';

const props = defineProps({ req: { type: Object, required: true } });
const busy = ref(false);
const STEP = {
  assigned: ['accepted', 'Принять', '', 'Заявка принята. Позвоните человеку, чтобы договориться'],
  accepted: ['progress', 'Начать', '', 'Вы начали помощь'],
  progress: ['done', 'Завершить помощь', 'green', 'Спасибо! Помощь завершена'],
};
async function run(fn, ok) {
  busy.value = true;
  try { await act(fn, ok); } catch { /* показано в тосте */ } finally { busy.value = false; }
}
const next = () => { const s = STEP[props.req.status]; run((api) => api.post(`/requests/${props.req.id}/status`, { status: s[0] }), s[3]); };
</script>

<template>
  <template v-if="STEP[req.status]">
    <button class="btn" :class="STEP[req.status][2]" type="button" :disabled="busy" @click="next">
      <Icon v-if="req.status === 'progress'" name="check" :size="16" />{{ STEP[req.status][1] }}
    </button>
    <DeclineButton v-if="req.status === 'assigned'" :req="req" />
  </template>
</template>
