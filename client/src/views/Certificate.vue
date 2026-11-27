<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '../api.js';
import { S, toast } from '../store.js';
import { fdate, plural } from '../util.js';
import Icon from '../components/Icon.vue';
import SiteBar from '../components/SiteBar.vue';
import { Logo } from '../components/ui.js';

// Именной сертификат волонтёра. Страница открыта всем: по номеру работодатель или вуз проверяет подлинность.
const route = useRoute(), router = useRouter();
const c = ref(null), err = ref(''), number = ref('');
const code = computed(() => String(route.params.code || ''));
watch(code, async (v) => {
  c.value = null; err.value = '';
  if (!v) return;
  try { c.value = await api.get(`/certificates/${encodeURIComponent(v)}`); } catch (e) { err.value = e.message; }
}, { immediate: true });
const mine = computed(() => S.me && c.value && S.me.name === c.value.name);
const url = computed(() => location.origin + route.fullPath);
const print = () => window.print();
const check = () => { const v = number.value.trim().toUpperCase(); if (v) router.push(`/certificate/${encodeURIComponent(v)}`); };
async function share() {
  try {
    if (navigator.share) await navigator.share({ title: 'Сертификат волонтёра Socio', url: url.value });
    else { await navigator.clipboard.writeText(url.value); toast('Ссылка на сертификат скопирована'); }
  } catch { /* пользователь закрыл окно */ }
}
</script>

<template>
  <div class="site">
    <SiteBar class="noprint" />
    <main class="wrap" style="padding:28px 0 56px">
      <div v-if="c" class="cert card">
        <div class="cert-top"><span class="cert-logo"><Logo /></span><div><b>Socio</b><small>Платформа взаимопомощи · Ташкент</small></div><span class="cert-no">№ {{ c.code }}</span></div>
        <p class="cert-k">Сертификат</p>
        <h1>{{ c.name }}</h1>
        <p class="cert-role">{{ c.roleTitle }}<template v-if="c.dist"> · {{ c.dist }}</template></p>
        <p class="cert-lead">подтверждает безвозмездное участие в помощи жителям Ташкента — пожилым людям, семьям и всем, кому нужна поддержка рядом с домом.</p>
        <div class="cert-stats">
          <div><b class="num">{{ c.done }}</b><span>{{ plural(c.done, ['заявка', 'заявки', 'заявок']).replace(/^\d+ /, '') }} выполнено</span></div>
          <div><b class="num">{{ c.helped }}</b><span>людям помог(ла)</span></div>
          <div><b class="num">{{ c.courses }}</b><span>{{ plural(c.courses, ['курс', 'курса', 'курсов']).replace(/^\d+ /, '') }} обучения</span></div>
          <div v-if="c.rating"><b class="num">{{ c.rating.toFixed(1) }} ★</b><span>средняя оценка</span></div>
        </div>
        <div class="cert-foot">
          <span>Участник с {{ fdate(c.since) }}<br>Выдан {{ fdate(c.ts) }}</span>
          <span class="cert-seal"><Icon name="shield" :size="22" />Проверено Socio</span>
        </div>
        <p class="note cert-verify">Подлинность: откройте {{ url }} — данные загружаются с сервера Socio и не редактируются вручную.</p>
        <div class="noprint" style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px">
          <button class="btn" type="button" @click="print"><Icon name="book" :size="16" />Распечатать или сохранить PDF</button>
          <button class="btn ghost" type="button" @click="share"><Icon name="copy" :size="16" />Поделиться ссылкой</button>
          <RouterLink v-if="mine" class="btn ghost" :to="`/${S.me.role}/coins`">К моим наградам</RouterLink>
        </div>
      </div>
      <div v-else class="card" style="max-width:560px;margin:0 auto">
        <h1 style="font-size:22px">Проверка сертификата</h1>
        <p v-if="err" class="note" style="color:var(--crit);margin:8px 0">{{ err }}</p>
        <p v-else-if="code" class="note">Загружаем…</p>
        <p class="note" style="margin:8px 0 14px">Введите номер с сертификата, например SC-2026-1A2B3C.</p>
        <form style="display:flex;gap:10px" @submit.prevent="check">
          <input v-model="number" type="text" maxlength="40" placeholder="SC-2026-…" aria-label="Номер сертификата">
          <button class="btn">Проверить</button>
        </form>
      </div>
    </main>
  </div>
</template>
