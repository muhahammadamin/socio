<script setup>
import { useRoute, useRouter } from 'vue-router';
import { lang, LANGS, LANG_NAMES, t } from '../i18n.js';

// Переключатель RU / UZ / EN. Язык запоминается, а в адрес попадает ?lang=, чтобы ссылкой можно было поделиться.
const route = useRoute(), router = useRouter();
function pick(l) {
  if (l === lang.value) return;
  lang.value = l;
  const query = { ...route.query, lang: l === 'ru' ? undefined : l };
  router.replace({ query, hash: route.hash });
}
</script>

<template>
  <div class="langsw" role="group" :aria-label="t('common.langAria')">
    <button v-for="l in LANGS" :key="l" type="button" :class="{ on: l === lang }" :aria-pressed="l === lang" :title="LANG_NAMES[l]" :lang="l" @click="pick(l)">{{ l.toUpperCase() }}</button>
  </div>
</template>
