<script setup>
import { computed } from 'vue';
import { GUIDE } from '@shared/guide.js';
import { lang } from '../i18n.js';
import Icon from '../components/Icon.vue';
import SiteBar from '../components/SiteBar.vue';

// Статья о волонтёрстве: тот же текст сервер отдаёт в HTML для поисковиков (shared/guide.js).
const G = computed(() => GUIDE[lang.value] || GUIDE.ru);
</script>

<template>
  <div class="site">
    <SiteBar />
    <section class="lhero cathero">
      <div class="wrap">
        <div>
          <span class="kicker"><Icon name="book" :size="15" />{{ G.kicker }}</span>
          <h1>{{ G.h1 }}</h1>
          <p>{{ G.lead }}</p>
          <div class="ctas">
            <RouterLink class="btn light lg" to="/register/volunteer"><Icon name="hand" :size="18" />{{ G.ctaVolunteer }}</RouterLink>
            <RouterLink class="btn ghost lg" style="color:#fff;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.4)" to="/register/help">{{ G.ctaHelp }}</RouterLink>
          </div>
        </div>
      </div>
    </section>

    <div class="wrap" style="padding-bottom:64px">
      <article class="guide">
        <p class="note">{{ G.updated }}</p>
        <section v-for="s in G.sections" :key="s[0]">
          <h2>{{ s[0] }}</h2>
          <template v-for="(b, i) in s.slice(1)" :key="i">
            <ul v-if="Array.isArray(b)"><li v-for="x in b" :key="x"><Icon name="check" />{{ x }}</li></ul>
            <p v-else>{{ b }}</p>
          </template>
        </section>
        <p><RouterLink to="/categories">{{ G.more }} <Icon name="arrow" /></RouterLink></p>

        <div class="faq">
          <h2>{{ G.faqTitle }}</h2>
          <details v-for="(f, i) in G.faq" :key="lang + i" :open="i === 0"><summary>{{ f[0] }}</summary><p>{{ f[1] }}</p></details>
        </div>
      </article>

      <section class="cta">
        <div><h2>{{ G.ctaTitle }}</h2><p>{{ G.ctaText }}</p></div>
        <div class="ctaside">
          <RouterLink class="btn light lg" to="/register/volunteer"><Icon name="hand" :size="18" />{{ G.ctaVolunteer }}</RouterLink>
          <RouterLink class="btn ghost lg" style="color:#fff;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.4)" to="/categories">{{ G.more }}</RouterLink>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.guide{max-width:780px;margin:32px auto 8px;line-height:1.7;font-size:17px}
.guide h2{font-size:24px;font-weight:800;margin:30px 0 10px;letter-spacing:-.3px}
.guide p{margin:0 0 12px}
.guide ul{list-style:none;padding:0;margin:0 0 12px;display:flex;flex-direction:column;gap:8px}
.guide li{display:flex;gap:10px;align-items:flex-start}
.guide li :deep(svg){flex:none;margin-top:5px;color:var(--p-green)}
.guide .faq h2{margin-top:36px}
</style>
