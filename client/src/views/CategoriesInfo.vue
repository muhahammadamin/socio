<script setup>
import { computed, nextTick, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { api } from '../api.js';
import { HOME } from '../store.js';
import { siteUser } from '../authflow.js';
import Icon from '../components/Icon.vue';
import SiteBar from '../components/SiteBar.vue';

const P = ref(null);
const route = useRoute();
// категории приходят с сервера, поэтому к якорю (#cat-3) прокручиваем уже после загрузки
onMounted(() => api.get('/public').then(async (d) => {
  P.value = d;
  await nextTick();
  if (route.hash) document.querySelector(route.hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}).catch(() => {}));
const helpHref = computed(() => { const me = siteUser(); return me?.role === 'user' ? '/app/new' : me ? HOME[me.role] : '/register/help'; });
const openByCat = (name) => (P.value?.pins || []).filter((p) => p.cat === name).length;

const RULES = [
  ['heart', 'Помощь бесплатная', 'Волонтёры не берут денег за помощь. Покупки и лекарства оплачивает сам человек — помощник отдаёт чек и сдачу.'],
  ['phone', 'Экстренные ситуации — не к нам', 'Если угрожает жизнь или здоровье, звоните 103 (скорая), 101 (пожарные) или 102 (полиция). Платформа не заменяет экстренные службы.'],
  ['shield', 'Проверенные помощники', 'Каждого волонтёра проверяет координатор. Помощник представится и назовёт номер заявки — так вы поймёте, что это он.'],
  ['clock', 'Сроки', 'Укажите, когда нужна помощь: сегодня, в течение 2–3 дней или на этой неделе. Срочные заявки назначаем в первую очередь.'],
];
const STEPS = [
  ['Выберите категорию', 'Если не уверены — выбирайте «Другое» и опишите ситуацию своими словами.'],
  ['Опишите, что нужно', 'Что сделать, где и когда. Чем подробнее, тем быстрее подберём помощника.'],
  ['Дождитесь звонка', 'Координатор назначит помощника из вашего района, он позвонит и договорится о времени.'],
];
</script>

<template>
  <div class="site">
    <SiteBar />
    <section class="lhero cathero">
      <div class="wrap">
        <div>
          <span class="kicker"><Icon name="grid" :size="15" />Направления помощи</span>
          <h1>С чем <em>мы помогаем</em></h1>
          <p>Когда вы оставляете заявку, нужно выбрать категорию. Ниже — что входит в каждую из них, примеры заявок и чего помощники не делают.</p>
          <div class="ctas"><RouterLink class="btn light lg" :to="helpHref"><Icon name="heart" :size="18" />Оставить заявку</RouterLink></div>
        </div>
      </div>
    </section>

    <div class="wrap" style="padding-bottom:64px">
      <div class="catinfo">
        <article v-for="c in P?.categories || []" :key="c.id" :id="`cat-${c.id}`" class="catrow" :style="{ '--c': c.color }">
          <span class="cico"><Icon :name="c.icon" /></span>
          <div class="grow">
            <div class="cath"><h2>{{ c.name }}</h2><span class="note">{{ openByCat(c.name) ? `открытых заявок: ${openByCat(c.name)}` : '' }}</span></div>
            <p>{{ c.descr || 'Помощь в повседневных делах.' }}</p>
            <template v-if="c.examples.length">
              <b class="exh">Например:</b>
              <ul class="examples"><li v-for="e in c.examples" :key="e"><Icon name="check" />{{ e }}</li></ul>
            </template>
          </div>
        </article>
      </div>

      <section class="section">
        <h2 class="big">Как выбрать и оформить заявку</h2>
        <div class="steps" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr))">
          <div v-for="(s, i) in STEPS" :key="i" class="step"><span class="n">{{ i + 1 }}</span><b>{{ s[0] }}</b><p>{{ s[1] }}</p></div>
        </div>
      </section>

      <section class="section">
        <h2 class="big">Важно знать</h2>
        <div class="rules">
          <div v-for="r in RULES" :key="r[1]" class="rule"><span class="ti"><Icon :name="r[0]" /></span><div><b>{{ r[1] }}</b><p>{{ r[2] }}</p></div></div>
        </div>
      </section>
    </div>
  </div>
</template>
