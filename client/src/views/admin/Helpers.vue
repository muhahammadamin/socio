<script setup>
import { reactive, ref } from 'vue';
import { S, act } from '../../store.js';
import Icon from '../../components/Icon.vue';
import { PageHead, Avatar } from '../../components/ui.js';
import { SKILLS } from '@shared/constants.js';
import PhoneInput from '../../components/PhoneInput.vue';

const f = reactive({ name: '', phone: '', dist: Object.keys(S.districts)[0] });
const issued = ref(null), busy = ref(false);
async function add() {
  busy.value = true;
  try {
    const r = await act((api) => api.post('/helpers', f), `Помощник ${f.name} добавлен`);
    issued.value = { name: f.name, phone: f.phone, password: r.password };
    Object.assign(f, { name: '', phone: '' });
  } catch { /* тост */ } finally { busy.value = false; }
}
const toggle = (h) => act((api) => api.patch(`/helpers/${h.id}`, { avail: !h.avail })).catch(() => {});
</script>

<template>
  <PageHead title="Помощники" sub="Добавляйте помощников и смотрите, сколько заявок каждый выполнил." />
  <form class="card" novalidate style="margin-bottom:16px" @submit.prevent="add">
    <div class="ch"><h2>Добавить помощника</h2></div>
    <div class="two" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));align-items:end">
      <label class="f">Имя<input v-model="f.name" type="text" autocomplete="off" placeholder="Например, Фарход Рашидов"></label>
      <label class="f">Телефон<PhoneInput v-model="f.phone" /></label>
      <label class="f">Район<select v-model="f.dist"><option v-for="d in Object.keys(S.districts)" :key="d">{{ d }}</option></select></label>
      <button class="btn" :disabled="busy"><Icon name="plus" />Добавить</button>
    </div>
    <p v-if="issued" style="margin-top:12px">Данные для входа {{ issued.name }}: телефон <span class="secret">{{ issued.phone }}</span>, пароль <span class="secret">{{ issued.password }}</span>. Пароль показывается один раз.</p>
  </form>
  <div class="card">
    <div class="table-wrap">
      <table>
        <thead><tr><th>Помощник</th><th>Район</th><th>Направления</th><th>Выполнено</th><th>Коины</th><th>Рейтинг</th><th>Сейчас в работе</th><th>Статус</th></tr></thead>
        <tbody>
          <tr v-for="h in S.helpers" :key="h.id">
            <td><span style="display:inline-flex;align-items:center;gap:10px"><Avatar :name="h.name" :size="36" /><span><b>{{ h.name }}</b><div class="note">{{ h.phone }}</div></span></span></td>
            <td>{{ h.dist }}</td>
            <td><span v-if="h.skills?.length" class="skills" style="margin:0;max-width:260px"><span v-for="k in h.skills" :key="k" class="skill">{{ SKILLS[k] }}</span></span><span v-else class="note">—</span></td>
            <td><b class="num" style="font-size:20px">{{ h.done }}</b></td>
            <td class="num">{{ h.coins }}</td>
            <td class="num">{{ h.rating ? h.rating.toFixed(1) + ' ★' : '—' }}</td>
            <td class="num">{{ h.active }}</td>
            <td><span style="display:inline-flex;align-items:center;gap:10px">
              <button class="switch" type="button" role="switch" :aria-checked="h.avail" :aria-label="`Доступен: ${h.name}`" @click="toggle(h)" />{{ h.avail ? 'Доступен' : 'Не доступен' }}
            </span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
