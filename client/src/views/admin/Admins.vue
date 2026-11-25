<script setup>
import { reactive, ref } from 'vue';
import { S, act } from '../../store.js';
import { fdate } from '../../util.js';
import Icon from '../../components/Icon.vue';
import { PageHead, Avatar } from '../../components/ui.js';
import PhoneInput from '../../components/PhoneInput.vue';

// Администраторы панели: добавить нового (пароль задаёт сам или генерируется) и удалить лишнего.
const f = reactive({ name: '', phone: '', password: '' });
const issued = ref(null), busy = ref(false);
async function add() {
  busy.value = true;
  try {
    const r = await act((api) => api.post('/admins', f), `Администратор ${f.name} добавлен`);
    issued.value = { name: f.name, phone: f.phone, password: r.password };
    Object.assign(f, { name: '', phone: '', password: '' });
  } catch { /* тост */ } finally { busy.value = false; }
}
function remove(a) {
  if (!confirm(`Удалить администратора ${a.name}? Он больше не сможет войти в панель.`)) return;
  act((api) => api.del(`/admins/${a.id}`), `Администратор ${a.name} удалён`).catch(() => {});
}
</script>

<template>
  <PageHead title="Администраторы" sub="Кто может входить в панель управления. Новый администратор входит на странице /admin/login." />
  <form class="card" novalidate style="margin-bottom:16px" @submit.prevent="add">
    <div class="ch"><h2>Добавить администратора</h2></div>
    <div class="two" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));align-items:end">
      <label class="f">Имя<input v-model="f.name" type="text" autocomplete="off" placeholder="Например, Дилноза Каримова"></label>
      <label class="f">Телефон<PhoneInput v-model="f.phone" autocomplete="off" /></label>
      <label class="f">Пароль<input v-model="f.password" type="text" autocomplete="new-password" placeholder="Пусто — придумаем сами"></label>
      <button class="btn" :disabled="busy"><Icon name="plus" />Добавить</button>
    </div>
    <p v-if="issued" style="margin-top:12px">Данные для входа {{ issued.name }}: телефон <span class="secret">{{ issued.phone }}</span>, пароль <span class="secret">{{ issued.password }}</span>. Пароль показывается один раз — передайте его администратору, сменить его можно в «Настройках».</p>
  </form>
  <div class="card">
    <div class="table-wrap">
      <table>
        <thead><tr><th>Администратор</th><th>Добавлен</th><th></th></tr></thead>
        <tbody>
          <tr v-for="a in S.admins" :key="a.id">
            <td><span style="display:inline-flex;align-items:center;gap:10px"><Avatar :name="a.name" :size="36" /><span>
              <b>{{ a.name }}</b><template v-if="a.id === S.me.id"> <span class="note">(вы)</span></template>
              <div class="note">{{ a.phone }}</div></span></span></td>
            <td class="num">{{ a.createdAt ? fdate(a.createdAt) : '—' }}</td>
            <td style="text-align:right">
              <span v-if="a.main" class="pill blue">Главный</span>
              <button v-else-if="a.id !== S.me.id" class="btn ghost sm" type="button" @click="remove(a)"><Icon name="trash" />Удалить</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="note" style="margin-top:10px">Главного администратора (номер из настроек сервера) удалить нельзя. Удалить самого себя тоже нельзя.</p>
  </div>
</template>
