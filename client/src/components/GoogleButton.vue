<script>
// Скрипт Google Identity Services грузим один раз на всё приложение.
let gsi = null;
const loadGsi = () => (window.google?.accounts?.id ? Promise.resolve() : (gsi ||= new Promise((res, rej) => {
  const s = document.createElement('script');
  s.src = 'https://accounts.google.com/gsi/client';
  s.async = true;
  s.onload = res;
  s.onerror = () => { gsi = null; rej(new Error('gsi')); };
  document.head.appendChild(s);
})));
</script>

<script setup>
import { onMounted, ref, watch } from 'vue';

const props = defineProps({ clientId: { type: String, default: null }, text: { type: String, default: 'continue_with' } });
const emit = defineEmits(['credential']);
const el = ref(null), failed = ref(false);
const DEV = import.meta.env.DEV;

async function render() {
  if (!props.clientId || !el.value) return;
  try { await loadGsi(); } catch { failed.value = true; return; }
  window.google.accounts.id.initialize({ client_id: props.clientId, callback: (r) => emit('credential', r.credential) });
  window.google.accounts.id.renderButton(el.value, { theme: 'outline', size: 'large', text: props.text, shape: 'pill', locale: 'ru', width: Math.min(400, el.value.clientWidth || 320) });
}
onMounted(render);
watch(() => props.clientId, render);
</script>

<template>
  <div v-if="clientId || DEV" class="gwrap">
    <div class="gor"><span>или</span></div>
    <div v-if="clientId" ref="el" class="gbtn" />
    <p v-if="failed" class="note">Не удалось загрузить вход через Google. Проверьте интернет.</p>
    <p v-if="!clientId" class="note gdev">Вход через Google появится, когда на сервере будет задан <code>GOOGLE_CLIENT_ID</code> (подсказка видна только в режиме разработки).</p>
  </div>
</template>
