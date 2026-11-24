<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { api } from '../../api.js';
import Icon from '../../components/Icon.vue';
import SiteBar from '../../components/SiteBar.vue';
import SignupForm from '../../components/SignupForm.vue';
import { ROLES } from './roles.js';

// Шаг 2: отдельная страница регистрации для выбранной роли.
const route = useRoute();
const r = computed(() => ROLES[route.params.as]);
const P = ref(null), loadErr = ref('');
onMounted(() => api.get('/public').then((d) => { P.value = d; }).catch((e) => { loadErr.value = e.message; }));
const next = computed(() => (route.query.next ? { next: route.query.next } : {}));
</script>

<template>
  <div class="site">
    <SiteBar />
    <div class="wrap regpage" :style="{ '--c': r.color, '--c2': r.color2 }">
      <aside class="reghero">
        <RouterLink class="regback" :to="{ path: '/register', query: next }"><Icon name="back" />Выбрать другую роль</RouterLink>
        <span class="rb-ic"><Icon :name="r.icon" /></span>
        <h1>{{ r.title }}</h1>
        <p>{{ r.lead }}</p>
        <ul class="regperks">
          <li v-for="p in r.perks" :key="p[1]"><span><Icon :name="p[0]" /></span>{{ p[1] }}</li>
        </ul>
      </aside>

      <section class="card regcard">
        <div class="stepper"><span class="done"><Icon name="check" /></span><i class="on" /><span class="on">2</span></div>
        <h2>Регистрация</h2>
        <p class="note" style="margin:4px 0 18px">После регистрации вы сразу попадёте в {{ r.after }}. Уже есть аккаунт? <RouterLink :to="{ path: '/login', query: next }">Войти</RouterLink></p>
        <p v-if="loadErr" class="formerr">{{ loadErr }}</p>
        <SignupForm v-else-if="P" :key="route.params.as" :role="r.role" :districts="Object.keys(P.districts)" :categories="P.categories"
          :client-id="P.googleClientId" :submit-label="r.button" />
        <div v-else class="note">Загрузка…</div>
      </section>
    </div>
  </div>
</template>
