<script setup>
import { useRoute } from 'vue-router';
import Icon from '../../components/Icon.vue';
import SiteBar from '../../components/SiteBar.vue';
import { ROLES } from './roles.js';
import { t } from '../../i18n.js';

// Шаг 1 регистрации: выбор роли. Каждая роль ведёт на свою страницу регистрации.
const route = useRoute();
const next = route.query.next ? { next: route.query.next } : {};
</script>

<template>
  <div class="site">
    <SiteBar />
    <div class="wrap choose">
      <div class="stepper"><span class="on">1</span><i /><span>2</span></div>
      <h1>{{ t('choose.title') }}</h1>
      <p class="lead">{{ t('choose.lead') }}</p>
      <div class="rolegrid">
        <RouterLink v-for="(r, key) in ROLES" :key="key" class="rolebig" :to="{ path: `/register/${key}`, query: next }" :style="{ '--c': r.color, '--c2': r.color2 }">
          <span class="rb-ic"><Icon :name="r.icon" /></span>
          <b>{{ r.title }}</b>
          <p>{{ r.short }}</p>
          <ul><li v-for="p in r.perks.slice(0, 3)" :key="p[1]"><Icon name="check" />{{ p[1] }}</li></ul>
          <span class="rb-go">{{ r.choose }}<Icon name="arrow" /></span>
        </RouterLink>
      </div>
      <p class="note" style="text-align:center;margin-top:22px">{{ t('common.haveAccount') }} <RouterLink :to="{ path: '/login', query: next }">{{ t('common.login') }}</RouterLink></p>
    </div>
  </div>
</template>
