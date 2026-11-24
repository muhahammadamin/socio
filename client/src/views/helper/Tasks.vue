<script setup>
import { computed } from 'vue';
import { S } from '../../store.js';
import { useOpenRequest, reqPins } from '../../composables.js';
import CityMap from '../../components/CityMap.vue';
import TaskCard from '../../components/TaskCard.vue';
import { PageHead, Empty, Legend } from '../../components/ui.js';

const open = useOpenRequest();
const active = computed(() => S.reqs.filter((r) => r.status !== 'done'));
</script>

<template>
  <PageHead title="Мои заявки" sub="Задания, которые назначил администратор" />
  <div class="grid2">
    <div class="card">
      <template v-if="active.length"><TaskCard v-for="r in active" :key="r.id" :req="r" /></template>
      <Empty v-else title="Сейчас заданий нет" text="Когда администратор назначит заявку, она появится здесь." />
    </div>
    <div class="card"><div class="ch"><h2>Карта</h2></div><CityMap :pins="reqPins(active)" labels @open="open" /><Legend /></div>
  </div>
</template>
