<script setup>
import { computed, onMounted, ref } from 'vue';
import { api } from '../api.js';
import { HOME } from '../store.js';
import { siteUser } from '../authflow.js';
import { SKILLS, COINS } from '@shared/constants.js';
import Icon from '../components/Icon.vue';
import SiteBar from '../components/SiteBar.vue';
import SignupForm from '../components/SignupForm.vue';

const P = ref(null);
onMounted(() => api.get('/public').then((d) => { P.value = d; }).catch(() => {}));
const me = computed(() => siteUser());

const STEPS = [
  ['user', 'Зарегистрируйтесь', 'Сразу получите кабинет помощника: заявки, карта, коины, учебные курсы.'],
  ['phone', 'Знакомство с координатором', 'Координатор позвонит, познакомится и подтвердит профиль. После этого вам начнут назначать заявки.'],
  ['pin', 'Помогайте рядом с домом', 'Заявки подбираются по вашему району и направлениям. Принимайте только те, что удобно.'],
  ['coin', 'Получайте коины', `+${COINS.requestDone} за каждую заявку и бонус за оценку. Коины обмениваются на скидки в Яндекс Такси.`],
];
const FAQ = [
  ['Сколько времени нужно?', 'Сколько готовы дать. Можно выключить приём заявок в профиле, когда заняты.'],
  ['Это бесплатно для людей?', 'Да. Помощник не берёт денег за помощь, а покупки оплачивает сам человек — вы отдаёте чек и сдачу.'],
  ['Нужен ли опыт?', 'Нет. В кабинете есть учебные курсы: первая помощь, общение с пожилыми, защита от мошенников.'],
  ['Почему нужна проверка?', 'Помощники приходят домой к пожилым людям и семьям. Координатор должен убедиться, что это безопасно.'],
];
</script>

<template>
  <div class="site">
    <SiteBar />
    <section class="lhero volhero">
      <div class="wrap">
        <div>
          <span class="kicker"><Icon name="hand" :size="15" />Для волонтёров</span>
          <h1>Станьте <em>помощником</em> в своём районе</h1>
          <p>Регистрация — сразу в рабочую платформу. Без анкет и ожидания: создайте аккаунт, координатор подтвердит профиль, и вы начнёте помогать соседям.</p>
          <div class="skillcloud"><span v-for="(l, k) in SKILLS" :key="k">{{ l }}</span></div>
        </div>
        <div class="card volform" id="signup">
          <template v-if="me">
            <h2>Вы уже вошли как {{ me.name.split(' ')[0] }}</h2>
            <p class="note" style="margin:6px 0 14px">{{ me.role === 'helper' ? 'Вы уже помощник — переходите в кабинет.' : 'Чтобы стать помощником с этим аккаунтом, напишите координатору или выйдите и зарегистрируйтесь заново.' }}</p>
            <RouterLink class="btn" :to="HOME[me.role]">Мой кабинет</RouterLink>
          </template>
          <template v-else>
            <h2>Регистрация волонтёра</h2>
            <p class="note" style="margin:4px 0 14px">Уже есть аккаунт? <RouterLink :to="{ path: '/login', query: { next: '/helper' } }">Войти</RouterLink></p>
            <SignupForm v-if="P" role="helper" :categories="P.categories" :districts="Object.keys(P.districts)" :client-id="P.googleClientId" submit-label="Стать помощником" />
          </template>
        </div>
      </div>
    </section>

    <div class="wrap" style="padding-bottom:64px">
      <section class="section">
        <h2 class="big">Как это работает</h2>
        <div class="steps">
          <div v-for="(s, i) in STEPS" :key="i" class="step"><span class="n"><Icon :name="s[0]" /></span><b>{{ s[1] }}</b><p>{{ s[2] }}</p></div>
        </div>
      </section>
      <section class="section">
        <h2 class="big">Частые вопросы</h2>
        <div class="rules">
          <div v-for="q in FAQ" :key="q[0]" class="rule"><span class="ti"><Icon name="quiz" /></span><div><b>{{ q[0] }}</b><p>{{ q[1] }}</p></div></div>
        </div>
      </section>
    </div>
  </div>
</template>
