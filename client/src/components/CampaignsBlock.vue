<script setup>
import { nextTick, onMounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { S, act } from '../store.js';
import { ago } from '../util.js';
import Icon from './Icon.vue';

// Наборы волонтёров под проекты компаний: приглашение приходит в кабинет и в Telegram, волонтёр заполняет анкету.
const route = useRoute();
const openId = ref(null);
const form = reactive({ about: '', agree: false });
const busy = ref(false);
const STATE = { pending: ['Анкета отправлена — ждём решения координатора', 'orange'], approved: ['Вы в команде!', 'green'], rejected: ['В этот раз мест не хватило', 'gray'], withdrawn: ['Вы отказались от участия', 'gray'] };

function show(id) { openId.value = id; Object.assign(form, { about: '', agree: false }); }
// ссылка из Telegram ведёт сюда с #campaign-N — сразу раскрываем анкету
const fromHash = () => {
  const id = Number(String(route.hash).replace('#campaign-', ''));
  const c = id && S.campaigns.find((x) => x.id === id);
  if (!c) return;
  if (c.open && !['pending', 'approved'].includes(c.app)) show(id);
  nextTick(() => document.getElementById(`campaign-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
};
onMounted(fromHash);
watch(() => [route.hash, S.campaigns.length], fromHash);

async function apply(c) {
  busy.value = true;
  try { await act((api) => api.post(`/campaigns/${c.id}/apply`, form), 'Анкета отправлена! Координатор ответит в уведомлениях и в Telegram'); openId.value = null; }
  catch { /* ошибка уже показана */ }
  finally { busy.value = false; }
}
function withdraw(c) {
  if (!confirm(`Отказаться от участия в «${c.title}»?`)) return;
  act((api) => api.del(`/campaigns/${c.id}/apply`), 'Вы отказались от участия').catch(() => {});
}
</script>

<template>
  <div v-if="S.campaigns.length" class="card">
    <div class="ch"><h2>Наборы волонтёров</h2><span class="note">проекты компаний — участвуйте по желанию</span></div>
    <div class="stack">
      <div v-for="c in S.campaigns" :id="`campaign-${c.id}`" :key="c.id" class="card" style="box-shadow:inset 0 0 0 1px var(--line)">
        <div class="ch" style="flex-wrap:wrap;gap:6px">
          <div>
            <h3 style="margin:0">{{ c.title }}</h3>
            <p class="note">{{ c.company }} · {{ ago(c.ts) }}</p>
          </div>
          <span v-if="c.app" class="pill" :class="STATE[c.app][1]">{{ STATE[c.app][0] }}</span>
          <span v-else-if="!c.open" class="pill gray">Набор закрыт</span>
        </div>
        <p class="note campmeta" style="display:flex;gap:6px 16px;flex-wrap:wrap;margin:8px 0">
          <span class="cm"><Icon name="clock" />{{ c.when }}</span>
          <span class="cm"><Icon name="pin" />{{ c.dist || 'Ташкент' }}{{ c.place ? `, ${c.place}` : '' }}</span>
          <span class="cm"><Icon name="users" />в команде {{ c.approved }} из {{ c.needed }}</span>
        </p>
        <p style="white-space:pre-line">{{ c.descr }}</p>

        <form v-if="openId === c.id" class="fcol" style="margin-top:12px" novalidate @submit.prevent="apply(c)">
          <label class="f">Пару слов о себе <span class="note">необязательно: опыт, что умеете, с кем придёте</span>
            <textarea v-model="form.about" rows="3" maxlength="500" /></label>
          <label style="display:flex;gap:8px;align-items:flex-start"><input v-model="form.agree" type="checkbox" style="margin-top:4px">
            <span>Смогу прийти: <b>{{ c.when }}</b>. Координатор может позвонить мне на {{ S.me.phone }}.</span></label>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn green" :disabled="busy || !form.agree"><Icon name="check" />Отправить анкету</button>
            <button class="btn ghost" type="button" @click="openId = null">Отмена</button>
          </div>
        </form>
        <div v-else style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
          <button v-if="c.open && !c.app || c.open && c.app === 'withdrawn'" class="btn green" type="button" @click="show(c.id)"><Icon name="edit" />Хочу участвовать</button>
          <button v-if="c.open && ['pending', 'approved'].includes(c.app)" class="btn ghost sm" type="button" @click="withdraw(c)">Не смогу прийти</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cm{display:inline-flex;gap:6px;align-items:center}
</style>
