<script setup>
import { fdate } from '../util.js';
import { useOpenRequest } from '../composables.js';
import Icon from './Icon.vue';
import { StatusPill, CatIcon } from './ui.js';

defineProps({ req: { type: Object, required: true } });
const open = useOpenRequest();
</script>

<template>
  <div class="row">
    <CatIcon :cat="req.cat" />
    <span class="grow">
      <span class="t">{{ req.title }}</span>
      <span class="s"><Icon name="clock" />{{ fdate(req.ts) }} · {{ req.helperName || 'помощник ещё не назначен' }}</span>
    </span>
    <span v-if="req.status === 'done' && !req.rating" class="pill orange">Оцените</span>
    <StatusPill :status="req.status" />
    <button class="link" type="button" @click="open(req.id)">Подробнее <Icon name="arrow" /></button>
  </div>
</template>
