<script setup>
import { S, act } from '../../store.js';
import { ago } from '../../util.js';
import { useOpenRequest } from '../../composables.js';
import Icon from '../../components/Icon.vue';
import { PageHead, Empty } from '../../components/ui.js';

const open = useOpenRequest();
const resolve = (c) => act((api) => api.post(`/complaints/${c.id}/resolve`), 'Жалоба закрыта').catch(() => {});
</script>

<template>
  <PageHead title="Жалобы" sub="Обращения пользователей о работе помощников." />
  <div class="card">
    <div v-if="S.complaints.length" class="rows">
      <div v-for="c in S.complaints" :key="c.id" class="row">
        <Icon name="flag" :size="20" />
        <span class="grow"><span class="t wrap">{{ c.text }}</span>
          <span class="s">{{ c.from_name || '—' }} на помощника {{ c.against_name || '—' }} · {{ ago(c.ts) }}
            <button v-if="c.reqId" class="link" type="button" style="font-size:12px" @click="open(c.reqId)">заявка</button></span>
        </span>
        <template v-if="c.status === 'open'"><span class="pill orange">Открыта</span><button class="btn sm" type="button" @click="resolve(c)">Закрыть</button></template>
        <span v-else class="pill green">Закрыта</span>
      </div>
    </div>
    <Empty v-else title="Жалоб нет" text="Отлично! Пользователи довольны помощниками." />
  </div>
</template>
