<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { S } from '../store.js';
import { api } from '../api.js';
import { ago } from '../util.js';
import { useOpenRequest } from '../composables.js';
import Icon from '../components/Icon.vue';
import { PageHead, Empty } from '../components/ui.js';

const open = useOpenRequest();
const fresh = ref(new Set());
async function markRead() {
  const unreadIds = S.notes.filter((n) => !n.read).map((n) => n.id);
  if (!unreadIds.length) return;
  unreadIds.forEach((id) => fresh.value.add(id));
  S.notes.forEach((n) => { n.read = true; });
  await api.post('/notifications/read').catch(() => {});
}
onMounted(markRead);
// новые уведомления, пришедшие пока страница открыта, тоже считаем прочитанными
const timer = setInterval(markRead, 2000);
onBeforeUnmount(() => clearInterval(timer));
</script>

<template>
  <PageHead title="Уведомления" />
  <div class="card">
    <div v-if="S.notes.length" class="rows">
      <component :is="n.reqId ? 'button' : 'div'" v-for="n in S.notes" :key="n.id" class="row" :type="n.reqId ? 'button' : undefined" @click="n.reqId && open(n.reqId)">
        <span class="cico" :style="{ '--c': fresh.has(n.id) ? 'var(--p-blue)' : '#8a90b0' }"><Icon name="bell" :size="15" /></span>
        <span class="grow"><span class="t wrap" :style="fresh.has(n.id) ? '' : 'font-weight:600'">{{ n.text }}</span></span>
        <time>{{ ago(n.ts) }}</time>
      </component>
    </div>
    <Empty v-else title="Уведомлений нет" text="Здесь появятся новости по заявкам." />
  </div>
</template>
