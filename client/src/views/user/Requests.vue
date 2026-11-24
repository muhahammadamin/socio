<script setup>
import { S } from '../../store.js';
import Icon from '../../components/Icon.vue';
import RequestRow from '../../components/RequestRow.vue';
import { PageHead, Empty } from '../../components/ui.js';
</script>

<template>
  <PageHead title="Мои заявки" sub="Следите, как идёт помощь — статусы обновляются сами">
    <RouterLink class="btn" to="/app/new"><Icon name="plus" :size="16" />Новая заявка</RouterLink>
  </PageHead>
  <div class="card">
    <div v-if="S.reqs.length" class="rows"><RequestRow v-for="r in S.reqs" :key="r.id" :req="r" /></div>
    <Empty v-else title="Заявок пока нет" text="Создайте первую заявку." />
  </div>
</template>
