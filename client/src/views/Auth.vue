<script setup>
import { onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '../api.js';
import { enter } from '../authflow.js';
import Icon from '../components/Icon.vue';
import SiteBar from '../components/SiteBar.vue';
import SignupForm from '../components/SignupForm.vue';
import GoogleButton from '../components/GoogleButton.vue';
import { ROLES } from './register/roles.js';

// Вход. Регистрация — на отдельных страницах (/register → выбор роли).
const route = useRoute(), router = useRouter();
const pub = ref(null);
const f = reactive({ phone: '', password: '' });
const err = ref(''), busy = ref(false), google = ref(null), as = ref('help');

onMounted(async () => { pub.value = await api.get('/public').catch(() => null); });

const DEMO = {
  helper: ['Помощник', 'Задания, карта, коины', '#22b05f', 'hand'],
  user: ['Нужна помощь', 'Создать заявку и следить', '#7c4dde', 'heart'],
  student: ['Студент', 'Курсы, видео, коины', '#f08a24', 'book'],
};

async function run(fn) {
  err.value = '';
  busy.value = true;
  try { await fn(); } catch (e) { err.value = e.message; } finally { busy.value = false; }
}
const submit = () => run(async () => enter(await api.post('/auth/login', f), router, route.query.next));
const demo = (a) => run(async () => enter(await api.post('/auth/login', { phone: a.phone, password: a.password }), router, route.query.next));
// Вход через Google: если аккаунта ещё нет — выбрать роль и дозаполнить профиль прямо здесь.
const onGoogle = (credential) => run(async () => {
  const r = await api.post('/auth/google', { credential });
  if (r.token) return enter(r, router, route.query.next);
  google.value = r;
});
</script>

<template>
  <div class="site">
    <SiteBar />
    <div class="auth">
      <div class="authbox" :style="google ? 'width:min(640px,100%)' : ''">
        <div class="card">
          <div class="tabs" role="tablist">
            <RouterLink :to="{ path: '/login', query: route.query }">Вход</RouterLink>
            <RouterLink :to="{ path: '/register', query: route.query }">Регистрация</RouterLink>
          </div>

          <template v-if="google">
            <h1>Вы у нас впервые</h1>
            <p class="sub">Выберите роль — от неё зависит, какой кабинет вы получите.</p>
            <div class="rolepick" role="radiogroup" aria-label="Роль">
              <button v-for="(r, key) in ROLES" :key="key" type="button" role="radio" class="rolecard" :class="{ on: as === key }" :aria-checked="as === key" :style="{ '--c': r.color }" @click="as = key">
                <span class="ti" :style="{ background: r.color }"><Icon :name="r.icon" /></span>
                <b>{{ r.title }}</b><span>{{ r.short }}</span>
              </button>
            </div>
            <SignupForm v-if="pub" :key="as" :role="ROLES[as].role" :districts="Object.keys(pub.districts)" :categories="pub.categories"
              :client-id="pub.googleClientId" :google="google" :submit-label="ROLES[as].button" />
          </template>

          <template v-else>
            <h1>С возвращением</h1>
            <p class="sub">Войдите по номеру телефона или через Google.</p>
            <form novalidate @submit.prevent="submit">
              <label class="f">Телефон<input v-model="f.phone" type="tel" autocomplete="tel" placeholder="+998 90 123-45-67"></label>
              <label class="f">Пароль<input v-model="f.password" type="password" autocomplete="current-password"></label>
              <p v-if="err" class="formerr" role="alert">{{ err }}</p>
              <button class="btn lg" :disabled="busy">Войти</button>
              <GoogleButton :client-id="pub?.googleClientId" text="signin_with" @credential="onGoogle" />
            </form>
            <p class="note altlinks">Нет аккаунта? <RouterLink :to="{ path: '/register', query: route.query }">Зарегистрируйтесь</RouterLink></p>
          </template>
        </div>

        <div v-if="!google && pub?.demo?.accounts.length" class="demo">
          <p class="note" style="margin-bottom:8px;text-align:center">Демо-режим: войдите в один клик</p>
          <div class="roles">
            <button v-for="a in pub.demo.accounts" :key="a.role" class="rolecard" type="button" :disabled="busy" @click="demo(a)">
              <span class="ti" :style="{ background: DEMO[a.role][2] }"><Icon :name="DEMO[a.role][3]" /></span>
              <b>{{ DEMO[a.role][0] }}</b><span>{{ a.name }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
