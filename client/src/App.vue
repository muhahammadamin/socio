<script setup>
import { S } from './store.js';
</script>

<template>
  <RouterView />
  <div id="toast" :class="{ on: S.toast.on, bad: S.toast.bad }" role="status" aria-live="polite">{{ S.toast.text }}</div>
</template>
