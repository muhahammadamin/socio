<script setup>
import { S } from './store.js';
</script>

<template>
  <RouterView v-slot="{ Component, route }">
    <div class="pagefade" :key="route.matched[0]?.path || route.path"><component :is="Component" /></div>
  </RouterView>
  <div id="toast" :class="{ on: S.toast.on, bad: S.toast.bad }" role="status" aria-live="polite">{{ S.toast.text }}</div>
</template>
