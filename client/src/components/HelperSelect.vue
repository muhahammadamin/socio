<script setup>
import { computed } from 'vue';
import { S, act, activeOfHelper } from '../store.js';
import { shortDist } from '../util.js';
import { SKILLS } from '@shared/constants.js';

const props = defineProps({ req: { type: Object, required: true } });
const locked = computed(() => !['new', 'assigned'].includes(props.req.status));

function assign(e) {
  const helperId = Number(e.target.value);
  if (!helperId) return;
  const h = S.helpers.find((x) => x.id === helperId);
  act((api) => api.post(`/requests/${props.req.id}/assign`, { helperId }), `Помощник ${h?.name} назначен`).catch(() => { e.target.value = props.req.helperId || ''; });
}
</script>

<template>
  <span v-if="locked" style="font-weight:600">{{ req.helperName || '—' }}</span>
  <select v-else :value="req.helperId || ''" :aria-label="`Помощник для заявки «${req.title}»`" @change="assign">
    <option value="">Назначить помощника…</option>
    <option v-for="h in S.helpers" :key="h.id" :value="h.id" :disabled="(!h.avail || !h.verified) && req.helperId !== h.id">
      {{ h.name }} · {{ shortDist(h.dist) }}{{ h.dist === req.dist ? ' (рядом)' : '' }}{{ h.skills?.length ? ` · ${h.skills.map((k) => SKILLS[k]).join(', ')}` : '' }} — {{ !h.verified ? 'не проверен' : h.avail ? `${activeOfHelper(h.id).length} в работе` : 'недоступен' }}
    </option>
  </select>
</template>
