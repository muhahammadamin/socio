<script setup>
import { computed, nextTick, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { api } from '../api.js';
import { HOME } from '../store.js';
import { siteUser } from '../authflow.js';
import { t, tm, catT } from '../i18n.js';
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

const RULE_ICONS = ['heart', 'phone', 'shield', 'clock'];
</script>

<template>
  <div class="site">
    <SiteBar />
    <section class="lhero cathero">
      <div class="wrap">
        <div>
          <span class="kicker"><Icon name="grid" :size="15" />{{ t('catsPage.kicker') }}</span>
          <h1>{{ tm('catsPage.h1')[0] }}<em>{{ tm('catsPage.h1')[1] }}</em>{{ tm('catsPage.h1')[2] }}</h1>
          <p>{{ t('catsPage.lead') }}</p>
          <div class="ctas"><RouterLink class="btn light lg" :to="helpHref"><Icon name="heart" :size="18" />{{ t('catsPage.cta') }}</RouterLink></div>
        </div>
      </div>
    </section>

    <div class="wrap" style="padding-bottom:64px">
      <div class="catinfo">
        <article v-for="c in P?.categories || []" :key="c.id" :id="`cat-${c.id}`" class="catrow" :style="{ '--c': c.color }">
          <span class="cico"><Icon :name="c.icon" /></span>
          <div class="grow">
            <div class="cath"><h2>{{ catT(c).name }}</h2><span class="note">{{ openByCat(c.name) ? t('catsPage.open', { n: openByCat(c.name) }) : '' }}</span></div>
            <p>{{ catT(c).descr || t('catsPage.defaultDescr') }}</p>
            <template v-if="catT(c).examples.length">
              <b class="exh">{{ t('catsPage.example') }}</b>
              <ul class="examples"><li v-for="e in catT(c).examples" :key="e"><Icon name="check" />{{ e }}</li></ul>
            </template>
          </div>
        </article>
      </div>

      <section class="section">
        <h2 class="big">{{ t('catsPage.howTitle') }}</h2>
        <div class="steps" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr))">
          <div v-for="(s, i) in tm('catsPage.steps')" :key="i" class="step"><span class="n">{{ i + 1 }}</span><b>{{ s[0] }}</b><p>{{ s[1] }}</p></div>
        </div>
      </section>

      <section class="section">
        <h2 class="big">{{ t('catsPage.rulesTitle') }}</h2>
        <div class="rules">
          <div v-for="(r, i) in tm('catsPage.rules').map((x, j) => [RULE_ICONS[j], ...x])" :key="r[1]" class="rule"><span class="ti"><Icon :name="r[0]" /></span><div><b>{{ r[1] }}</b><p>{{ r[2] }}</p></div></div>
        </div>
      </section>
    </div>
  </div>
</template>
