<script setup>
import { onMounted, reactive, ref } from 'vue';
import { api } from '../../api.js';
import { toast } from '../../store.js';
import { ago } from '../../util.js';
import { COINS } from '@shared/constants.js';
import Icon from '../../components/Icon.vue';
import { PageHead, Empty } from '../../components/ui.js';

const data = ref(null), busy = ref(false);
const f = reactive({ title: '', cost: 100, partner: 'Яндекс Такси', descr: 'Промокод на одну поездку. Введите его в приложении Яндекс Go перед заказом такси.' });
const codesFor = ref(null), codes = ref('');

const load = () => api.get('/rewards').then((d) => { data.value = d; }).catch((e) => toast(e.message, true));
onMounted(load);
async function run(fn, ok) {
  busy.value = true;
  try { const r = await fn(); if (ok) toast(typeof ok === 'function' ? ok(r) : ok); await load(); return r; }
  catch (e) { toast(e.message, true); throw e; }
  finally { busy.value = false; }
}
const create = () => run(() => api.post('/rewards', f), 'Награда добавлена').then(() => { f.title = ''; }).catch(() => {});
const toggle = (r) => run(() => api.patch(`/rewards/${r.id}`, { active: !r.active }), r.active ? 'Награда скрыта' : 'Награда снова доступна').catch(() => {});
const setCost = (r) => {
  const v = prompt(`Новая стоимость «${r.title}» в коинах:`, r.cost);
  if (v !== null) run(() => api.patch(`/rewards/${r.id}`, { cost: v }), 'Стоимость изменена').catch(() => {});
};
const del = (r) => { if (confirm(`Удалить «${r.title}»?`)) run(() => api.del(`/rewards/${r.id}`), 'Награда удалена').catch(() => {}); };
const addCodes = (r) => run(() => api.post(`/rewards/${r.id}/codes`, { codes: codes.value }), (x) => `Добавлено кодов: ${x.added}${x.skipped ? `, повторов пропущено: ${x.skipped}` : ''}`)
  .then(() => { codes.value = ''; codesFor.value = null; }).catch(() => {});
</script>

<template>
  <PageHead title="Награды" sub="На что помощники и студенты обменивают коины. Промокоды загружаются сюда пачкой — каждый выдаётся один раз." />

  <div class="card infocard">
    <Icon name="info" :size="22" />
    <div>
      <b>Как работают коины</b>
      <p>Помощник получает <b>{{ COINS.requestDone }}</b> коинов за выполненную заявку и <b>{{ COINS.perStar }}</b> за каждую звезду в оценке. Студенты и помощники получают <b>{{ COINS.courseDone }}</b> за пройденный курс.
        Промокоды на скидки выдаёт партнёр (например, Яндекс Такси по партнёрскому договору) — загрузите их в нужную награду. Когда коды заканчиваются, награда показывается как «Нет в наличии».</p>
    </div>
  </div>

  <div class="grid2" style="margin-top:16px">
    <div class="card">
      <div class="ch"><h2>Награды</h2></div>
      <div v-if="data?.rewards.length" class="rows">
        <div v-for="r in data.rewards" :key="r.id" class="row" :style="r.active ? '' : 'opacity:.55'">
          <span class="cico" style="--c:#f5a623;width:38px;height:38px;font-size:19px"><Icon name="car" /></span>
          <span class="grow">
            <span class="t">{{ r.title }}</span>
            <span class="s"><Icon name="coin" />{{ r.cost }} · в наличии {{ r.stock }} · выдано {{ r.issued }}{{ r.active ? '' : ' · скрыта' }}</span>
          </span>
          <button class="btn sm" type="button" @click="codesFor = codesFor === r.id ? null : r.id"><Icon name="plus" />Коды</button>
          <button class="btn ghost sm" type="button" @click="setCost(r)">Цена</button>
          <button class="btn ghost sm" type="button" @click="toggle(r)">{{ r.active ? 'Скрыть' : 'Показать' }}</button>
          <button v-if="!r.issued" class="iconbtn sm" type="button" :aria-label="`Удалить ${r.title}`" @click="del(r)"><Icon name="trash" /></button>
          <div v-if="codesFor === r.id" class="fcol" style="width:100%;padding:8px 0 4px">
            <label class="f">Промокоды для «{{ r.title }}» <span class="note">по одному в строке; повторы пропускаются</span>
              <textarea v-model="codes" rows="5" placeholder="TAXI-AB12CD&#10;TAXI-EF34GH" /></label>
            <button class="btn sm" type="button" style="align-self:flex-start" :disabled="busy" @click="addCodes(r)">Загрузить</button>
          </div>
        </div>
      </div>
      <Empty v-else-if="data" title="Наград пока нет" text="Добавьте первую справа." />
    </div>

    <div class="stack">
      <form class="card fcol" novalidate @submit.prevent="create">
        <h2>Новая награда</h2>
        <label class="f">Название<input v-model="f.title" type="text" maxlength="100" placeholder="Скидка 15% на поездку в Яндекс Такси"></label>
        <div class="two">
          <label class="f">Стоимость, коинов<input v-model.number="f.cost" type="text" inputmode="numeric"></label>
          <label class="f">Партнёр<input v-model="f.partner" type="text" maxlength="60"></label>
        </div>
        <label class="f">Описание<input v-model="f.descr" type="text" maxlength="300"></label>
        <button class="btn" :disabled="busy" style="align-self:flex-start"><Icon name="plus" />Добавить</button>
      </form>
      <div class="card">
        <div class="ch"><h2>Последние обмены</h2></div>
        <div v-if="data?.recent.length" class="rows">
          <div v-for="(x, i) in data.recent" :key="i" class="row">
            <span class="grow"><span class="t">{{ x.name || 'Удалённый аккаунт' }}</span><span class="s">{{ x.title }}</span></span>
            <time>{{ ago(x.ts) }}</time>
          </div>
        </div>
        <p v-else class="note">Пока никто не обменивал коины.</p>
      </div>
    </div>
  </div>
</template>
