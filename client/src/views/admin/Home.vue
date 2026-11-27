<script setup>
import { computed, ref } from 'vue';
import { S } from '../../store.js';
import { DAY, ago } from '../../util.js';
import { useOpenRequest, reqPins } from '../../composables.js';
import Icon from '../../components/Icon.vue';
import VisitorsCard from '../../components/VisitorsCard.vue';
import CityMap from '../../components/CityMap.vue';
import { Donut } from '../../components/Charts.js';
import { PageHead, Tile, StatusPill, CatIcon, Legend } from '../../components/ui.js';

const open = useOpenRequest();
const period = ref(30);
const L = computed(() => { const lim = period.value === 'all' ? 0 : Date.now() - period.value * DAY; return S.reqs.filter((r) => r.ts >= lim); });
const done = computed(() => L.value.filter((r) => r.status === 'done').length);
const fresh = computed(() => L.value.filter((r) => r.status === 'new').length);
const stuck = computed(() => S.reqs.filter((r) => r.status === 'new' && r.stage >= 2).length);
const availH = computed(() => S.helpers.filter((h) => h.avail).length);
const active = computed(() => S.reqs.filter((r) => r.status !== 'done'));
const recent = computed(() => S.reqs.slice(0, 6));
</script>

<template>
  <PageHead title="Панель администратора" sub="Управляйте платформой и помогайте людям">
    <label><span class="sr">Период</span>
      <select v-model="period" style="width:auto;font-weight:700">
        <option :value="7">Последние 7 дней</option><option :value="30">Последние 30 дней</option><option value="all">За всё время</option>
      </select>
    </label>
  </PageHead>
  <div class="tiles">
    <Tile color="blue" icon="list" label="Всего заявок" :value="L.length" sub="за выбранный период" />
    <Tile color="green" icon="check" label="Выполнено" :value="done" :sub="L.length ? Math.round(done / L.length * 100) + '% от всех' : 'нет заявок'" />
    <Tile color="purple" icon="shield" label="Помощники" :value="S.helpers.length" :sub="availH + ' доступны сейчас'" />
    <Tile color="orange" icon="bell" label="Новые" :value="fresh" :sub="!fresh ? 'все разобраны' : stuck ? `${stuck} ждут вашего назначения` : 'разосланы помощникам'" />
  </div>
  <VisitorsCard />
  <div class="grid3">
    <div class="card">
      <div class="ch"><h2>Последние заявки</h2><RouterLink class="link" to="/admin/requests">Все заявки <Icon name="arrow" /></RouterLink></div>
      <div class="rows">
        <button v-for="r in recent" :key="r.id" class="row" type="button" @click="open(r.id)">
          <CatIcon :cat="r.cat" />
          <span class="grow"><span class="t">{{ r.title }}</span><span class="s"><Icon name="pin" />{{ r.dist }}</span></span>
          <time>{{ ago(r.ts) }}</time><StatusPill :status="r.status" />
        </button>
      </div>
    </div>
    <div class="card">
      <div class="ch"><h2>Карта заявок</h2><button class="btn ghost sm" type="button" @click="S.mapOpen = true">Открыть карту</button></div>
      <CityMap :pins="reqPins(active)" @open="open" /><Legend />
    </div>
    <div class="stack">
      <div class="card"><div class="ch"><h2>Статистика по категориям</h2></div><Donut :list="L" /></div>
      <div class="banner"><Icon name="heart" /><div><b>Вместе мы делаем мир добрее!</b><span>Спасибо всем волонтёрам и помощникам за вашу поддержку</span></div></div>
    </div>
  </div>
</template>
