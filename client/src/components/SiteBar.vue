<script setup>
import { computed } from 'vue';
import { S, HOME, toggleTheme } from '../store.js';
import { siteUser } from '../authflow.js';
import { t } from '../i18n.js';
import Icon from './Icon.vue';
import LangSwitch from './LangSwitch.vue';
import { Logo } from './ui.js';

const me = computed(() => siteUser()); // администратор на сайте выглядит как гость
</script>

<template>
  <header class="sitebar">
    <div class="in">
      <RouterLink class="logo" to="/"><Logo /><div><strong>Socio</strong><small>{{ t('common.tagline') }}</small></div></RouterLink>
      <nav class="sitenav" :aria-label="t('common.navAria')">
        <RouterLink to="/#how">{{ t('common.nav.how') }}</RouterLink>
        <RouterLink to="/categories">{{ t('common.nav.categories') }}</RouterLink>
        <RouterLink to="/volunteers">{{ t('common.nav.volunteers') }}</RouterLink>
      </nav>
      <div class="act">
        <LangSwitch />
        <button class="iconbtn" type="button" :aria-label="S.theme === 'dark' ? t('common.themeLight') : t('common.themeDark')" @click="toggleTheme"><Icon :name="S.theme === 'dark' ? 'sun' : 'moon'" /></button>
        <RouterLink v-if="me" class="btn" :to="HOME[me.role]">{{ t('common.cabinet') }}</RouterLink>
        <template v-else>
          <RouterLink class="btn ghost" to="/login">{{ t('common.login') }}</RouterLink>
          <RouterLink class="btn" to="/register">{{ t('common.register') }}</RouterLink>
        </template>
      </div>
    </div>
  </header>
</template>
