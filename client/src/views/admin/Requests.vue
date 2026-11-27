<script setup>
import { computed, ref } from 'vue';
import { S } from '../../store.js';
import { ST, ORDER, ago, searchText } from '../../util.js';
import { useOpenRequest } from '../../composables.js';
import { DISPATCH } from '@shared/constants.js';
import HelperSelect from '../../components/HelperSelect.vue';
import { PageHead, StatusPill, CatIcon, Empty } from '../../components/ui.js';

const open = useOpenRequest();
const filter = ref('all');
const q = computed(() => S.q.trim().toLowerCase());
const list = computed(() => S.reqs.filter((r) => (filter.value === 'all' || r.status === filter.value)
  && (!q.value || `${r.title} ${r.userName} ${r.helperName || ''} ${r.dist} ${r.addr} ${r.cat} ${r.phone}`.toLowerCase().includes(q.value))));
const chips = computed(() => [['all', 'Все', S.reqs.length], ...ORDER.map((s) => [s, ST[s].t, S.reqs.filter((r) => r.status === s).length])]);
</script>

<template>
  <PageHead title="Все заявки" :sub="`Новые заявки сами уходят помощникам района, через ${DISPATCH.widenMin} минут без ответа — всему городу. Если и тогда никто не взял, заявка помечается красным — назначьте помощника вручную.`" />
  <p v-if="q" class="note" style="margin:-6px 0 12px">Поиск: «{{ S.q }}» · <button class="link" type="button" @click="S.q = ''">сбросить</button></p>
  <div class="chips" role="group" aria-label="Фильтр по статусу">
    <button v-for="c in chips" :key="c[0]" class="chip" type="button" :aria-pressed="filter === c[0]" @click="filter = c[0]">{{ c[1] }} <span class="num">{{ c[2] }}</span></button>
  </div>
  <div class="card">
    <div class="table-wrap">
      <table v-if="list.length">
        <thead><tr><th>Заявка</th><th>Район</th><th>Категория</th><th>Создана</th><th>Статус</th><th>Помощник</th></tr></thead>
        <tbody>
          <tr v-for="r in list" :key="r.id">
            <td><button class="tt" type="button" @click="open(r.id)">{{ r.title }}</button><div class="note">{{ r.userName }} · {{ r.phone }}</div></td>
            <td>{{ r.dist }}</td>
            <td><span style="display:inline-flex;gap:8px;align-items:center"><CatIcon :cat="r.cat" />{{ r.cat }}</span></td>
            <td>{{ ago(r.ts) }}</td>
            <td><StatusPill :status="r.status" />
              <div v-if="r.status === 'new'" class="note" :style="r.stage >= 2 ? 'color:var(--crit);font-weight:700' : ''">{{ searchText(r) }} · {{ r.offers.filter((o) => o.state === 'open').length }} видят, {{ r.offers.filter((o) => o.state === 'declined').length }} отказ.</div></td>
            <td><HelperSelect :req="r" /></td>
          </tr>
        </tbody>
      </table>
      <Empty v-else title="Ничего не найдено" text="Измените фильтр или строку поиска." />
    </div>
  </div>
</template>
