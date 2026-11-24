<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from 'vue';
import { api } from '../api.js';
import { ST, ago, plural } from '../util.js';
import Icon from '../components/Icon.vue';
import CityMap from '../components/CityMap.vue';
import SiteBar from '../components/SiteBar.vue';
import { Avatar } from '../components/ui.js';
import { ROLES } from './register/roles.js';

const P = ref(null);
const load = () => api.get('/public').then((d) => { P.value = d; }).catch(() => {});
let es = null;
const connect = () => { if (!es) { es = new EventSource('/api/events'); es.addEventListener('change', load); } };
const disconnect = () => { es?.close(); es = null; };
const onShow = (e) => { if (e.persisted) { load(); connect(); } };
onMounted(() => {
  load();
  connect();
  addEventListener('pagehide', disconnect);
  addEventListener('pageshow', onShow);
});
onBeforeUnmount(() => {
  disconnect();
  removeEventListener('pagehide', disconnect);
  removeEventListener('pageshow', onShow);
});

const pins = computed(() => (P.value?.pins || []).map((p) => {
  const c = P.value.categories.find((x) => x.name === p.cat);
  return { x: p.x, y: p.y, t: `${p.cat} · ${p.dist} · ${ST[p.status].t}`, c: c?.color || 'var(--p-blue)' };
}));
const openByCat = (name) => (P.value?.pins || []).filter((p) => p.cat === name).length;
const catOf = (name) => P.value?.categories.find((c) => c.name === name) || { color: '#8a90b0', icon: 'heart' };

const STEPS = [
  ['Оставьте заявку', 'Опишите, какая помощь нужна, и отметьте место на карте. Это займёт пару минут.'],
  ['Мы подберём помощника', 'Координатор назначит проверенного волонтёра из вашего района.'],
  ['Помощник свяжется с вами', 'Он позвонит, уточнит детали и приедет в удобное время.'],
  ['Скажите спасибо', 'Оцените помощь — так растёт «баланс добра» и доверие к помощникам.'],
];
</script>

<template>
  <div class="site">
    <SiteBar />

    <section class="lhero">
      <div class="wrap">
        <div>
          <span class="kicker"><Icon name="heart" :size="15" />Платформа взаимопомощи Ташкента</span>
          <h1>Помогать <em>просто</em>, когда&nbsp;мы рядом</h1>
          <p>Пожилым соседям, семьям с детьми и всем, кому трудно справиться в одиночку. Оставьте заявку — волонтёр из вашего района поможет бесплатно.</p>
          <div class="ctas">
            <a class="btn light lg" href="#start"><Icon name="user" :size="18" />Зарегистрироваться</a>
            <RouterLink class="btn ghost lg" to="/login">У меня есть аккаунт</RouterLink>
          </div>
        </div>
        <div class="mapcard">
          <CityMap :pins="pins" labels />
          <p class="note" v-if="P">{{ plural(P.stats.open, ['человек ждёт', 'человека ждут', 'человек ждут']) }} помощи прямо сейчас. Личные данные на карте не показываются.</p>
        </div>
      </div>
    </section>

    <div class="wrap">
      <!-- три регистрации: у каждой роли свой сайт -->
      <section id="start" class="startroles">
        <h2>Выберите, кто вы</h2>
        <div class="rolegrid">
          <RouterLink v-for="(r, key) in ROLES" :key="key" class="rolebig" :to="`/register/${key}`" :style="{ '--c': r.color, '--c2': r.color2 }">
            <span class="rb-ic"><Icon :name="r.icon" /></span>
            <b>{{ r.title }}</b>
            <p>{{ r.short }}</p>
            <ul><li v-for="p in r.perks.slice(0, 3)" :key="p[1]"><Icon name="check" />{{ p[1] }}</li></ul>
            <span class="rb-go">{{ r.choose }}<Icon name="arrow" /></span>
          </RouterLink>
        </div>
        <p class="note" style="text-align:center;margin-top:14px">Уже зарегистрированы? <RouterLink to="/login">Войти</RouterLink></p>
      </section>

      <div class="counters" style="margin-top:40px">
        <div class="counter"><b class="num">{{ P?.stats.done ?? '—' }}</b><span>добрых дел выполнено</span></div>
        <div class="counter"><b class="num">{{ P?.stats.people ?? '—' }}</b><span>людям помогли</span></div>
        <div class="counter"><b class="num">{{ P?.stats.helpers ?? '—' }}</b><span>помощников в команде</span></div>
        <div class="counter"><b class="num">{{ P?.stats.districts ?? '—' }}</b><span>районов города</span></div>
      </div>

      <section class="section" id="how">
        <h2 class="big">Как это работает</h2>
        <p class="lead">Четыре шага от просьбы до помощи. Статус заявки видно в личном кабинете в реальном времени.</p>
        <div class="steps">
          <div v-for="(s, i) in STEPS" :key="i" class="step"><span class="n">{{ i + 1 }}</span><b>{{ s[0] }}</b><p>{{ s[1] }}</p></div>
        </div>
      </section>

      <section class="section" id="cats">
        <h2 class="big">С чем мы помогаем</h2>
        <p class="lead">Выберите направление при создании заявки — так координатору проще найти подходящего помощника. <RouterLink to="/categories">Подробнее о каждой категории →</RouterLink></p>
        <div class="cats">
          <RouterLink v-for="c in P?.categories || []" :key="c.id" class="catcard" :style="{ '--c': c.color, textDecoration: 'none', color: 'inherit' }" :to="`/categories#cat-${c.id}`">
            <span class="cico" :style="{ '--c': c.color }"><Icon :name="c.icon" /></span>
            <b>{{ c.name }}</b>
            <span>{{ c.examples.slice(0, 2).join(', ') || c.descr || 'Помощь в повседневных делах' }}</span>
            <span class="note">{{ openByCat(c.name) ? plural(openByCat(c.name), ['открытая заявка', 'открытые заявки', 'открытых заявок']) : 'Открытых заявок нет' }}</span>
          </RouterLink>
        </div>
      </section>

      <section class="section split">
        <div class="card feed">
          <div class="ch"><h2>Последние добрые дела</h2><span class="live"><i />обновляется сразу</span></div>
          <div class="rows" v-if="P?.recent.length">
            <div v-for="(r, i) in P.recent" :key="i" class="row">
              <span class="cico" :style="{ '--c': catOf(r.cat).color }"><Icon :name="catOf(r.cat).icon" :size="15" /></span>
              <span class="grow"><span class="t">{{ r.title }}</span><span class="s"><Icon name="pin" />{{ r.dist }}</span></span>
              <time>{{ ago(r.ts) }}</time>
            </div>
          </div>
          <p v-else class="note">Скоро здесь появятся первые выполненные заявки.</p>
        </div>
        <div>
          <h2 class="big" style="font-size:26px;margin-bottom:14px">Наши помощники</h2>
          <div class="people">
            <div v-for="h in P?.topHelpers || []" :key="h.name" class="person">
              <Avatar :name="h.name" :size="48" />
              <div><b>{{ h.name }}</b><span>{{ h.dist }} · {{ plural(h.done, ['доброе дело', 'добрых дела', 'добрых дел']) }}<template v-if="h.rating"> · {{ h.rating.toFixed(1) }} ★</template></span></div>
            </div>
          </div>
        </div>
      </section>

      <section class="cta" id="join">
        <div>
          <h2>Станьте волонтёром</h2>
          <p>Час вашего времени в неделю — это продукты для пожилого соседа, лекарства вовремя и спокойствие для целой семьи. Регистрация — сразу в рабочую платформу, а за каждую выполненную заявку начисляются коины.</p>
        </div>
        <div class="ctaside">
          <RouterLink class="btn light lg" to="/register/volunteer"><Icon name="hand" :size="18" />Зарегистрироваться волонтёром</RouterLink>
          <RouterLink class="btn ghost lg" style="color:#fff;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.4)" to="/volunteers">Подробнее для волонтёров</RouterLink>
          <span>Можно через Google — это займёт минуту.</span>
        </div>
      </section>
    </div>

    <footer class="footer">
      <div class="wrap">
        <RouterLink to="/" class="logo"><svg viewBox="0 0 44 40" aria-hidden="true"><path d="M22 37S3 25.5 3 13.5A8.6 8.6 0 0 1 22 9a8.6 8.6 0 0 1 19 4.5C41 25.5 22 37 22 37z" fill="#7c4dde" /></svg><strong>Socio</strong></RouterLink>
        <span>Помогаем вместе · Ташкент</span>
        <span class="spacer" />
        <RouterLink to="/categories">Направления помощи</RouterLink>
        <RouterLink to="/volunteers">Волонтёрам</RouterLink>
        <RouterLink to="/academy">Студентам</RouterLink>
        <RouterLink to="/login">Вход</RouterLink>
      </div>
    </footer>
  </div>
</template>
