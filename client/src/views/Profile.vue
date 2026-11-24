<script setup>
import { computed, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { S, act, toast, toggleTheme, signOut } from '../store.js';
import { api } from '../api.js';
import { DISTRICT_NAMES, SKILLS } from '@shared/constants.js';
import { PageHead, Avatar } from '../components/ui.js';

const router = useRouter();
const role = computed(() => S.me.role);
const info = reactive({ name: S.me.name, dist: S.me.dist || DISTRICT_NAMES[0], ...(S.me.role === 'student' ? { school: S.me.school } : {}) });
const pw = reactive({ oldPassword: '', newPassword: '' });
const busy = ref(false);

const saveInfo = () => act((a) => a.patch('/me', role.value === 'admin' ? { name: info.name } : info), 'Профиль сохранён').catch(() => {});
const savePw = () => act((a) => a.patch('/me', pw), 'Пароль изменён').then(() => Object.assign(pw, { oldPassword: '', newPassword: '' })).catch(() => {});
const toggleNeed = (id) => {
  const cur = S.me.needs || [];
  const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
  if (!next.length) return toast('Оставьте хотя бы одну сферу', true);
  act((a) => a.patch('/me', { needs: next }), 'Сферы сохранены').catch(() => {});
};
const toggleSkill = (k) => {
  const cur = S.me.skills || [];
  const next = cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k];
  act((a) => a.patch(`/helpers/${S.me.id}`, { skills: next }), 'Направления сохранены').catch(() => {});
};
const toggleAvail =() => act((a) => a.patch(`/helpers/${S.me.id}`, { avail: !S.me.avail }), S.me.avail ? 'Новые заявки вам назначать не будут' : 'Вы снова принимаете заявки').catch(() => {});
async function reset() {
  if (!confirm('Вернуть все демо-данные к исходным? Текущие заявки будут удалены.')) return;
  busy.value = true;
  try { await api.post('/admin/reset'); } catch { /* после сброса токен недействителен */ }
  signOut();
  router.push('/login');
}
</script>

<template>
  <PageHead :title="role === 'admin' ? 'Настройки' : 'Профиль'" />
  <div class="stack" style="max-width:680px">
    <div class="card">
      <div style="display:flex;gap:16px;align-items:center;margin-bottom:10px">
        <Avatar :name="S.me.name" :size="64" />
        <div><h2 style="font-size:20px">{{ S.me.name }}</h2><div class="note">{{ S.me.phone }}<template v-if="S.me.dist"> · {{ S.me.dist }}</template></div></div>
      </div>
      <div v-if="role === 'helper'" class="setrow">
        <div><b>Готов принимать заявки</b><span>Если выключить, администратор не сможет назначить вам новые задания</span></div>
        <button class="switch" type="button" role="switch" :aria-checked="S.me.avail" aria-label="Готов принимать заявки" @click="toggleAvail" />
      </div>
      <template v-if="role === 'helper'">
        <div class="setrow"><div><b>Выполнено задач</b></div><b class="num" style="font-size:20px;flex:none">{{ S.me.done }}</b></div>
        <div class="setrow"><div><b>Рейтинг</b></div><b class="num" style="font-size:20px;flex:none">{{ S.me.rating ? S.me.rating.toFixed(1) + ' ★' : '—' }}</b></div>
      </template>
      <template v-if="role === 'student'">
        <div class="setrow"><div><b>Пройдено курсов</b></div><b class="num" style="font-size:20px;flex:none">{{ S.me.coursesDone }}</b></div>
        <div class="setrow"><div><b>Коины</b></div><b class="num" style="font-size:20px;flex:none">{{ S.me.coins }}</b></div>
      </template>
      <template v-if="role === 'user'">
        <div class="setrow"><div><b>Заявок создано</b></div><b class="num" style="font-size:20px;flex:none">{{ S.reqs.length }}</b></div>
        <div class="setrow"><div><b>Баланс добра</b></div><b class="num" style="font-size:20px;flex:none">{{ S.me.balance }}</b></div>
      </template>
      <div class="setrow">
        <div><b>Тёмная тема</b><span>Переключает оформление на этом устройстве</span></div>
        <button class="switch" type="button" role="switch" :aria-checked="S.theme === 'dark'" aria-label="Тёмная тема" @click="toggleTheme" />
      </div>
      <div v-if="role === 'admin' && S.demo" class="setrow">
        <div><b>Демо-данные</b><span>Вернуть заявки, помощников и счётчики к исходным. Потребуется войти снова.</span></div>
        <button class="btn ghost sm" type="button" :disabled="busy" @click="reset">Сбросить</button>
      </div>
    </div>

    <form class="card fcol" novalidate @submit.prevent="saveInfo">
      <h2>Личные данные</h2>
      <label class="f">Имя<input v-model="info.name" type="text" autocomplete="name"></label>
      <label v-if="role === 'student'" class="f">Где вы учитесь<input v-model="info.school" type="text" maxlength="120"></label>
      <label v-if="role !== 'admin'" class="f">Район<select v-model="info.dist"><option v-for="d in DISTRICT_NAMES" :key="d">{{ d }}</option></select></label>
      <button class="btn" style="align-self:flex-start">Сохранить</button>
    </form>

    <div v-if="role === 'user'" class="card fcol">
      <h2>С чем вам нужна помощь</h2>
      <p class="note">Эти сферы предлагаются первыми, когда вы создаёте заявку.</p>
      <div class="chips" style="margin-bottom:0">
        <button v-for="c in S.cats" :key="c.id" type="button" class="chip cat" :style="{ '--c': c.color }" :aria-pressed="(S.me.needs || []).includes(c.id)" @click="toggleNeed(c.id)">{{ c.name }}</button>
      </div>
    </div>

    <div v-if="role === 'helper'" class="card fcol">
      <h2>Направления помощи</h2>
      <p class="note">Администратор видит их, когда подбирает помощника для заявки.</p>
      <div class="chips" style="margin-bottom:0">
        <button v-for="(label, k) in SKILLS" :key="k" type="button" class="chip" :aria-pressed="(S.me.skills || []).includes(k)" @click="toggleSkill(k)">{{ label }}</button>
      </div>
    </div>

    <form class="card fcol" novalidate @submit.prevent="savePw">
      <h2>Смена пароля</h2>
      <div class="two">
        <label class="f">Текущий пароль<input v-model="pw.oldPassword" type="password" autocomplete="current-password"></label>
        <label class="f">Новый пароль<input v-model="pw.newPassword" type="password" autocomplete="new-password" placeholder="Не короче 6 символов"></label>
      </div>
      <button class="btn" style="align-self:flex-start">Изменить пароль</button>
    </form>
  </div>
</template>
