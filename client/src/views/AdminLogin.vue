<script setup>
import { onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '../api.js';
import { S, signIn, load, signOut } from '../store.js';
import Icon from '../components/Icon.vue';
import { Logo } from '../components/ui.js';

// Отдельный вход в панель управления: без шапки сайта и без ссылок на него.
const route = useRoute(), router = useRouter();
const f = reactive({ phone: '', password: '' });
const err = ref(''), busy = ref(false), demo = ref(null);
onMounted(async () => { demo.value = (await api.get('/admin-demo').catch(() => null))?.demo || null; });

async function submit() {
  err.value = '';
  busy.value = true;
  try {
    const res = await api.post('/auth/admin-login', f);
    if (S.me) signOut(); // была открыта сессия сайта — закрываем её
    signIn(res);
    await load();
    const q = route.query.next;
    router.push(typeof q === 'string' && q.startsWith('/admin') ? q : '/admin');
  } catch (e) { err.value = e.message; }
  finally { busy.value = false; }
}
</script>

<template>
  <div class="adminlogin">
    <form class="adminbox" novalidate @submit.prevent="submit">
      <div class="logo"><Logo /><div><strong>Socio</strong><small>Панель управления</small></div></div>
      <h1><Icon name="lock" />Вход для администраторов</h1>
      <p class="sub">Доступ только для координаторов платформы.</p>
      <label class="f">Телефон<input v-model="f.phone" type="tel" autocomplete="username" placeholder="+998 90 000-00-00"></label>
      <label class="f">Пароль<input v-model="f.password" type="password" autocomplete="current-password"></label>
      <p v-if="err" class="formerr" role="alert">{{ err }}</p>
      <button class="btn lg" :disabled="busy">Войти в панель</button>
      <p v-if="demo" class="note demohint">
        Демо: <button type="button" class="link" @click="Object.assign(f, demo)">{{ demo.phone }} / {{ demo.password }}</button>
      </p>
    </form>
  </div>
</template>
