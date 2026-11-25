<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from 'vue';
import { api } from '../api.js';
import { ST, ago } from '../util.js';
import { lang, t, tm, tn, catT, catName } from '../i18n.js';
import Icon from '../components/Icon.vue';
import CityMap from '../components/CityMap.vue';
import SiteBar from '../components/SiteBar.vue';
import { Avatar } from '../components/ui.js';
import CountUp from '../components/CountUp.vue';
import { ROLES } from './register/roles.js';
import { visitors } from '../visit.js';
import { FAQ } from '@shared/seo.js';

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
  return { x: p.x, y: p.y, t: `${catName(p.cat)} · ${p.dist} · ${ST[p.status].t}`, c: c?.color || 'var(--p-blue)' };
}));
const openByCat = (name) => (P.value?.pins || []).filter((p) => p.cat === name).length;
const catOf = (name) => P.value?.categories.find((c) => c.name === name) || { color: '#8a90b0', icon: 'heart' };
const faq = computed(() => FAQ[lang.value]);
const stats = computed(() => {
  const s = P.value?.stats;
  // первый счётчик — все посетители сайта (с учётом только что зашедшего), а не только зарегистрированные
  const vals = [Math.max(visitors.value ?? 0, s?.visitors ?? 0) || null, s?.done, s?.people, s?.helpers, s?.districts];
  return vals.map((v, i) => [v ?? '—', tm('landing.counters')[i]]);
});
</script>

<template>
  <div class="site">
    <SiteBar />

    <section class="lhero">
      <div class="wrap">
        <div>
          <span class="kicker"><Icon name="heart" :size="15" />{{ t('landing.kicker') }}</span>
          <h1>{{ tm('landing.h1')[0] }}<em>{{ tm('landing.h1')[1] }}</em>{{ tm('landing.h1')[2] }}</h1>
          <p>{{ t('landing.lead') }}</p>
          <div class="ctas">
            <a class="btn light lg" href="#start"><Icon name="user" :size="18" />{{ t('landing.ctaRegister') }}</a>
            <RouterLink class="btn ghost lg" to="/login">{{ t('landing.ctaHave') }}</RouterLink>
          </div>
        </div>
        <div class="mapcard">
          <CityMap :pins="pins" labels />
          <p class="note" v-if="P">{{ tn(P.stats.open, 'landing.waiting') }} {{ t('landing.waitingNote') }}</p>
        </div>
      </div>
    </section>

    <div class="wrap">
      <!-- три регистрации: у каждой роли свой сайт -->
      <section id="start" class="startroles">
        <h2>{{ t('landing.chooseTitle') }}</h2>
        <div class="rolegrid">
          <RouterLink v-for="(r, key) in ROLES" :key="key" class="rolebig" :to="`/register/${key}`" :style="{ '--c': r.color, '--c2': r.color2 }">
            <span class="rb-ic"><Icon :name="r.icon" /></span>
            <b>{{ r.title }}</b>
            <p>{{ r.short }}</p>
            <ul><li v-for="p in r.perks.slice(0, 3)" :key="p[1]"><Icon name="check" />{{ p[1] }}</li></ul>
            <span class="rb-go">{{ r.choose }}<Icon name="arrow" /></span>
          </RouterLink>
        </div>
        <p class="note" style="text-align:center;margin-top:14px">{{ t('landing.already') }} <RouterLink to="/login">{{ t('common.login') }}</RouterLink></p>
      </section>

      <div class="counters" style="margin-top:40px">
        <div v-for="(c, i) in stats" :key="i" class="counter"><b><CountUp :value="c[0]" /></b><span>{{ c[1] }}</span></div>
      </div>

      <section class="section" id="how">
        <h2 class="big">{{ t('landing.howTitle') }}</h2>
        <p class="lead">{{ t('landing.howLead') }}</p>
        <div class="steps">
          <div v-for="(s, i) in tm('landing.steps')" :key="i" class="step"><span class="n">{{ i + 1 }}</span><b>{{ s[0] }}</b><p>{{ s[1] }}</p></div>
        </div>
      </section>

      <section class="section" id="cats">
        <h2 class="big">{{ t('landing.catsTitle') }}</h2>
        <p class="lead">{{ t('landing.catsLead') }} <RouterLink to="/categories">{{ t('landing.catsMore') }}</RouterLink></p>
        <div class="cats">
          <RouterLink v-for="c in P?.categories || []" :key="c.id" class="catcard" :style="{ '--c': c.color, textDecoration: 'none', color: 'inherit' }" :to="`/categories#cat-${c.id}`">
            <span class="cico" :style="{ '--c': c.color }"><Icon :name="c.icon" /></span>
            <b>{{ catT(c).name }}</b>
            <span>{{ catT(c).examples.slice(0, 2).join(', ') || catT(c).descr || t('landing.catDefault') }}</span>
            <span class="note">{{ openByCat(c.name) ? tn(openByCat(c.name), 'landing.openReq') : t('landing.noOpen') }}</span>
          </RouterLink>
        </div>
      </section>

      <section class="section split">
        <div class="card feed">
          <div class="ch"><h2>{{ t('landing.recentTitle') }}</h2><span class="live"><i />{{ t('landing.live') }}</span></div>
          <div class="rows" v-if="P?.recent.length">
            <div v-for="(r, i) in P.recent" :key="i" class="row">
              <span class="cico" :style="{ '--c': catOf(r.cat).color }"><Icon :name="catOf(r.cat).icon" :size="15" /></span>
              <span class="grow"><span class="t">{{ r.title }}</span><span class="s"><Icon name="pin" />{{ r.dist }}</span></span>
              <time>{{ ago(r.ts) }}</time>
            </div>
          </div>
          <p v-else class="note">{{ t('landing.recentEmpty') }}</p>
        </div>
        <div>
          <h2 class="big" style="font-size:26px;margin-bottom:14px">{{ t('landing.helpersTitle') }}</h2>
          <div class="people">
            <div v-for="h in P?.topHelpers || []" :key="h.name" class="person">
              <Avatar :name="h.name" :size="48" />
              <div><b>{{ h.name }}</b><span>{{ h.dist }} · {{ tn(h.done, 'landing.deeds') }}<template v-if="h.rating"> · {{ h.rating.toFixed(1) }} ★</template></span></div>
            </div>
          </div>
        </div>
      </section>

      <section class="section seo" id="about">
        <h2 class="big">{{ t('landing.aboutTitle') }}</h2>
        <div class="seotext">
          <p><b>Socio</b>{{ t('landing.about1') }}</p>
          <p>{{ tm('landing.about2')[0] }}<RouterLink to="/register/student">{{ tm('landing.about2')[1] }}</RouterLink>{{ tm('landing.about2')[2] }}</p>
        </div>
        <div class="faq">
          <h3>{{ t('landing.faqTitle') }}</h3>
          <details v-for="(f, i) in faq" :key="lang + i" :open="i === 0"><summary>{{ f[0] }}</summary><p>{{ f[1] }}</p></details>
        </div>
      </section>

      <section class="cta" id="join">
        <div>
          <h2>{{ t('landing.joinTitle') }}</h2>
          <p>{{ t('landing.joinText') }}</p>
        </div>
        <div class="ctaside">
          <RouterLink class="btn light lg" to="/register/volunteer"><Icon name="hand" :size="18" />{{ t('landing.joinBtn') }}</RouterLink>
          <RouterLink class="btn ghost lg" style="color:#fff;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.4)" to="/volunteers">{{ t('landing.joinMore') }}</RouterLink>
          <span>{{ t('landing.joinNote') }}</span>
        </div>
      </section>
    </div>

    <footer class="footer">
      <div class="wrap">
        <RouterLink to="/" class="logo"><svg viewBox="0 0 44 40" aria-hidden="true"><path d="M22 37S3 25.5 3 13.5A8.6 8.6 0 0 1 22 9a8.6 8.6 0 0 1 19 4.5C41 25.5 22 37 22 37z" fill="#7c4dde" /></svg><strong>Socio</strong></RouterLink>
        <span>{{ t('common.tagline') }} · {{ t('common.city') }}</span>
        <span class="spacer" />
        <RouterLink to="/categories">{{ t('landing.footer.categories') }}</RouterLink>
        <RouterLink to="/volunteers">{{ t('landing.footer.volunteers') }}</RouterLink>
        <RouterLink to="/academy">{{ t('landing.footer.students') }}</RouterLink>
        <RouterLink to="/login">{{ t('landing.footer.login') }}</RouterLink>
      </div>
    </footer>
  </div>
</template>
