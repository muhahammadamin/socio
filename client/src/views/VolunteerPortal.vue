<script setup>
import { computed, onMounted, ref } from 'vue';
import { api } from '../api.js';
import { HOME } from '../store.js';
import { siteUser } from '../authflow.js';
import { t, tm } from '../i18n.js';
import Icon from '../components/Icon.vue';
import SiteBar from '../components/SiteBar.vue';
import SignupForm from '../components/SignupForm.vue';

const P = ref(null);
onMounted(() => api.get('/public').then((d) => { P.value = d; }).catch(() => {}));
const me = computed(() => siteUser());
const ICONS = ['user', 'phone', 'pin', 'coin'];

</script>

<template>
  <div class="site">
    <SiteBar />
    <section class="lhero volhero">
      <div class="wrap">
        <div>
          <span class="kicker"><Icon name="hand" :size="15" />{{ t('vol.kicker') }}</span>
          <h1>{{ tm('vol.h1')[0] }}<em>{{ tm('vol.h1')[1] }}</em>{{ tm('vol.h1')[2] }}</h1>
          <p>{{ t('vol.lead') }}</p>
          <div class="skillcloud"><span v-for="(l, k) in tm('skills')" :key="k">{{ l }}</span></div>
        </div>
        <div class="card volform" id="signup">
          <template v-if="me">
            <h2>{{ t('vol.loggedAs', { name: me.name.split(' ')[0] }) }}</h2>
            <p class="note" style="margin:6px 0 14px">{{ me.role === 'helper' ? t('vol.isHelper') : t('vol.notHelper') }}</p>
            <RouterLink class="btn" :to="HOME[me.role]">{{ t('common.cabinet') }}</RouterLink>
          </template>
          <template v-else>
            <h2>{{ t('vol.regTitle') }}</h2>
            <p class="note" style="margin:4px 0 14px">{{ t('common.haveAccount') }} <RouterLink :to="{ path: '/login', query: { next: '/helper' } }">{{ t('common.login') }}</RouterLink></p>
            <SignupForm v-if="P" role="helper" :categories="P.categories" :districts="Object.keys(P.districts)" :client-id="P.googleClientId" :submit-label="t('vol.submit')" />
          </template>
        </div>
      </div>
    </section>

    <div class="wrap" style="padding-bottom:64px">
      <section class="section">
        <h2 class="big">{{ t('vol.howTitle') }}</h2>
        <div class="steps">
          <div v-for="(s, i) in tm('vol.steps').map((x, j) => [ICONS[j], ...x])" :key="i" class="step"><span class="n"><Icon :name="s[0]" /></span><b>{{ s[1] }}</b><p>{{ s[2] }}</p></div>
        </div>
      </section>
      <section class="section">
        <h2 class="big">{{ t('vol.faqTitle') }}</h2>
        <div class="rules">
          <div v-for="q in tm('vol.faq')" :key="q[0]" class="rule"><span class="ti"><Icon name="quiz" /></span><div><b>{{ q[0] }}</b><p>{{ q[1] }}</p></div></div>
        </div>
      </section>
    </div>
  </div>
</template>
