<script setup>
import { computed } from 'vue';
import { S } from '../../store.js';
import { PageHead, Bars } from '../../components/ui.js';

const done = computed(() => S.reqs.filter((r) => r.status === 'done'));
const items = computed(() => S.cats.map((c) => ({ l: c.name, v: done.value.filter((r) => r.cat === c.name).length, c: c.color })));
</script>

<template>
  <PageHead title="Статистика" sub="Ваши выполненные заявки по категориям" />
  <div class="card" style="max-width:720px">
    <Bars :items="items" />
    <p class="note" style="margin-top:14px">Считаются заявки, выполненные через платформу ({{ S.me.platformDone }}). Задания, сделанные до подключения ({{ S.me.done - S.me.platformDone }}), в разбивку не входят.</p>
  </div>
</template>
