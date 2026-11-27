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
import { t, tm } from '../i18n.js';
import PhoneInput from '../components/PhoneInput.vue';

// Вход. Регистрация — на отдельных страницах (/register → выбор роли).
const route = useRoute(), router = useRouter();
const pub = ref(null);
const f = reactive({ phone: sessionStorage.getItem('socio.phone') || '', password: '' });
sessionStorage.removeItem('socio.phone');
const err = ref(''), busy = ref(false), google = ref(null), as = ref('help');
// У номера несколько аккаунтов (например, «Нужна помощь» и «Волонтёр») — спрашиваем, куда войти.
const choose = ref(null); // { roles, again: (role) => Promise }
const ROLE_LOOK = { user: ['#7c4dde', 'heart'], helper: ['#22b05f', 'hand'], student: ['#f08a24', 'book'] };

onMounted(async () => { pub.value = await api.get('/public').catch(() => null); });

const DEMO = { helper: ['#22b05f', 'hand'], user: ['#7c4dde', 'heart'], student: ['#f08a24', 'book'] };

async function run(fn) {
  err.value = '';
  busy.value = true;
  try { await fn(); } catch (e) { err.value = e.message; } finally { busy.value = false; }
}
async function handle(r, again) {
  if (r.chooseRole) { choose.value = { roles: r.roles, again }; return; }
  if (r.token) return enter(r, router, route.query.next);
  return r;
}
const pickRole = (role) => run(async () => { const again = choose.value.again; choose.value = null; await handle(await again(role), again); });
const submit = () => run(async () => {
  const again = (role) => api.post('/auth/login', { ...f, role });
  await handle(await again(), again);
});
const demo = (a) => run(async () => enter(await api.post('/auth/login', { phone: a.phone, password: a.password, role: a.role }), router, route.query.next));
// Вход через Google: если аккаунта ещё нет — выбрать роль и дозаполнить профиль прямо здесь.
const onGoogle = (credential) => run(async () => {
  const again = (role) => api.post('/auth/google', { credential, role });
  const r = await handle(await again(), again);
  if (r?.needProfile) google.value = r;
});
</script>

<template>
  <div class="site">
    <SiteBar />
    <div class="auth">
      <div class="authbox" :style="google ? 'width:min(640px,100%)' : ''">
        <div class="card">
          <div class="tabs" role="tablist">
            <RouterLink :to="{ path: '/login', query: route.query }">{{ t('auth.login') }}</RouterLink>
            <RouterLink :to="{ path: '/register', query: route.query }">{{ t('common.register') }}</RouterLink>
          </div>

          <template v-if="google">
            <h1>{{ t('auth.newTitle') }}</h1>
            <p class="sub">{{ t('auth.newSub') }}</p>
            <div class="rolepick" role="radiogroup" :aria-label="t('auth.roleAria')">
              <button v-for="(r, key) in ROLES" :key="key" type="button" role="radio" class="rolecard" :class="{ on: as === key }" :aria-checked="as === key" :style="{ '--c': r.color }" @click="as = key">
                <span class="ti" :style="{ background: r.color }"><Icon :name="r.icon" /></span>
                <b>{{ r.title }}</b><span>{{ r.short }}</span>
              </button>
            </div>
            <SignupForm v-if="pub" :key="as" :role="ROLES[as].role" :districts="Object.keys(pub.districts)" :categories="pub.categories"
              :client-id="pub.googleClientId" :google="google" :submit-label="ROLES[as].button" />
          </template>

          <template v-else-if="choose">
            <h1>Куда войти?</h1>
            <p class="sub">С этим номером у вас несколько аккаунтов. Выберите, в какой войти — переключиться можно в любой момент.</p>
            <div class="roles pickrole">
              <button v-for="(r, i) in choose.roles" :key="r.role" class="rolecard pop" :style="{ animationDelay: i * 70 + 'ms' }" type="button" :disabled="busy" @click="pickRole(r.role)">
                <span class="ti" :style="{ background: ROLE_LOOK[r.role][0] }"><Icon :name="ROLE_LOOK[r.role][1]" /></span>
                <b>{{ r.title }}</b><span>{{ r.name }}</span>
              </button>
            </div>
            <p v-if="err" class="formerr" role="alert">{{ err }}</p>
            <button class="btn ghost" type="button" style="margin-top:14px" @click="choose = null">Назад</button>
          </template>

          <template v-else>
            <h1>{{ t('auth.title') }}</h1>
            <p class="sub">{{ t('auth.sub') }}</p>
            <form novalidate @submit.prevent="submit">
              <label class="f">{{ t('signup.phone') }}<PhoneInput v-model="f.phone" autocomplete="tel" /></label>
              <label class="f">{{ t('signup.password') }}<input v-model="f.password" type="password" autocomplete="current-password"></label>
              <p v-if="err" class="formerr" role="alert">{{ err }}</p>
              <button class="btn lg" :disabled="busy">{{ t('common.login') }}</button>
              <GoogleButton :client-id="pub?.googleClientId" text="signin_with" @credential="onGoogle" />
            </form>
            <p class="note altlinks">{{ t('auth.noAccount') }} <RouterLink :to="{ path: '/register', query: route.query }">{{ t('auth.signUp') }}</RouterLink></p>
          </template>
        </div>

        <div v-if="!google && pub?.demo?.accounts.length" class="demo">
          <p class="note" style="margin-bottom:8px;text-align:center">{{ t('auth.demo') }}</p>
          <div class="roles">
            <button v-for="a in pub.demo.accounts" :key="a.role" class="rolecard" type="button" :disabled="busy" @click="demo(a)">
              <span class="ti" :style="{ background: DEMO[a.role][0] }"><Icon :name="DEMO[a.role][1]" /></span>
              <b>{{ tm('auth.demoRoles')[a.role][0] }}</b><span>{{ a.name }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
