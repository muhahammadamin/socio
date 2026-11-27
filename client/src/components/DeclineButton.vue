<script setup>
import { ref } from 'vue';
import { act } from '../store.js';
import { DECLINE_REASONS } from '@shared/constants.js';

// «Отказаться» с выбором причины: координатор видит, почему заявку не берут. Заявка сразу уходит другим помощникам.
const props = defineProps({ req: { type: Object, required: true }, small: Boolean });
const open = ref(false), busy = ref(false);
async function decline(reason) {
  busy.value = true;
  try { await act((api) => api.post(`/requests/${props.req.id}/decline`, { reason }), 'Вы отказались — заявка ушла другим помощникам'); }
  catch { /* тост */ } finally { busy.value = false; open.value = false; }
}
</script>

<template>
  <span class="declwrap">
    <button class="btn red" :class="{ sm: small }" type="button" :disabled="busy" :aria-expanded="open" @click="open = !open">Отказаться</button>
    <span v-if="open" class="declmenu" role="menu" aria-label="Причина отказа">
      <small>Почему не можете?</small>
      <button v-for="(t, k) in DECLINE_REASONS" :key="k" role="menuitem" type="button" :disabled="busy" @click="decline(k)">{{ t }}</button>
    </span>
  </span>
</template>
