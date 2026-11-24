<script setup>
import { computed } from 'vue';
import { S } from '../../store.js';
import { fdate, finishedAt } from '../../util.js';
import { useOpenRequest } from '../../composables.js';
import { PageHead, Empty } from '../../components/ui.js';

const open = useOpenRequest();
const done = computed(() => S.reqs.filter((r) => r.status === 'done').sort((a, b) => finishedAt(b) - finishedAt(a)));
</script>

<template>
  <PageHead title="История" sub="Заявки, которые вы выполнили" />
  <div class="card">
    <div v-if="done.length" class="table-wrap">
      <table>
        <thead><tr><th>Заявка</th><th>Кому помогли</th><th>Район</th><th>Оценка</th><th>Завершена</th></tr></thead>
        <tbody>
          <tr v-for="r in done" :key="r.id">
            <td><button class="tt" type="button" @click="open(r.id)">{{ r.title }}</button></td>
            <td>{{ r.userName }}</td><td>{{ r.dist }}</td>
            <td style="color:#f5a623">{{ r.rating ? '★'.repeat(r.rating) : '' }}<span v-if="!r.rating" class="note">ещё нет</span></td>
            <td class="num">{{ fdate(finishedAt(r)) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <Empty v-else title="Истории пока нет" text="Завершите первое задание, и оно появится здесь." />
  </div>
</template>
