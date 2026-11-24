<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { api } from '../api.js';
import { S, load, toast } from '../store.js';
import { ago } from '../util.js';
import { COINS } from '@shared/constants.js';
import Icon from '../components/Icon.vue';
import { PageHead, Empty } from '../components/ui.js';

const data = ref(null), busy = ref(0), fresh = ref(null);
const fetchData = () => api.get('/rewards').then((d) => { data.value = d; }).catch((e) => toast(e.message, true));
onMounted(fetchData);
watch(() => S.me?.coins, fetchData); // коины могли начислиться, пока страница открыта

const coins = computed(() => S.me.coins);
const EARN = computed(() => S.me.role === 'helper'
  ? [['check', `+${COINS.requestDone}`, 'за каждую выполненную заявку'], ['star', `+${COINS.perStar} за ★`, 'за оценку от человека, которому вы помогли'], ['book', `+${COINS.courseDone}`, 'за пройденный курс в учебном центре']]
  : [['book', `+${COINS.courseDone}`, 'за каждый полностью пройденный курс'], ['heart', `+${COINS.requestDone}`, 'за каждую заявку, когда станете помощником']]);

async function redeem(r) {
  if (!confirm(`Обменять ${r.cost} коинов на «${r.title}»?`)) return;
  busy.value = r.id;
  try {
    fresh.value = await api.post(`/rewards/${r.id}/redeem`);
    await Promise.all([load(), fetchData()]);
  } catch (e) { toast(e.message, true); }
  finally { busy.value = 0; }
}
async function copy(code) {
  try { await navigator.clipboard.writeText(code); toast('Промокод скопирован'); }
  catch { toast('Не получилось скопировать — выделите код вручную', true); }
}
</script>

<template>
  <PageHead title="Коины" sub="Помогайте людям и учитесь — получайте коины и обменивайте их на скидки на такси." />

  <div class="coinhero">
    <span class="big"><Icon name="coin" /></span>
    <div><small>Ваш баланс</small><b class="num">{{ coins }}</b><span>коинов</span></div>
    <div class="earn">
      <b>Как заработать</b>
      <span v-for="e in EARN" :key="e[2]"><Icon :name="e[0]" /><b>{{ e[1] }}</b>{{ e[2] }}</span>
    </div>
  </div>

  <div v-if="fresh" class="card freshcode">
    <Icon name="gift" :size="34" />
    <div class="grow"><b>Ваш промокод: «{{ fresh.title }}»</b><span class="note">Введите его в приложении Яндекс Go перед заказом поездки. Код также сохранён ниже в «Мои промокоды».</span></div>
    <code class="secret">{{ fresh.code }}</code>
    <button class="btn sm" type="button" @click="copy(fresh.code)"><Icon name="copy" />Копировать</button>
  </div>

  <h2 class="sech">Обменять коины</h2>
  <div class="rewards">
    <div v-for="r in data?.rewards || []" :key="r.id" class="reward">
      <div class="rtop"><span class="rlogo"><Icon name="car" /></span><span class="note">{{ r.partner }}</span></div>
      <b>{{ r.title }}</b>
      <p>{{ r.descr }}</p>
      <div class="rbar"><div class="fill" :style="{ width: Math.min(100, coins / r.cost * 100) + '%' }" /></div>
      <div class="rfoot">
        <span class="cost"><Icon name="coin" />{{ r.cost }}</span>
        <button v-if="!r.stock" class="btn sm" type="button" disabled>Нет в наличии</button>
        <button v-else-if="coins < r.cost" class="btn ghost sm" type="button" disabled>Ещё {{ r.cost - coins }}</button>
        <button v-else class="btn sm" type="button" :disabled="busy === r.id" @click="redeem(r)">Обменять</button>
      </div>
    </div>
    <Empty v-if="data && !data.rewards.length" title="Наград пока нет" text="Скоро здесь появятся скидки от партнёров." />
  </div>

  <div class="grid2 even" style="margin-top:18px">
    <div class="card">
      <div class="ch"><h2>Мои промокоды</h2></div>
      <div v-if="data?.mine.length" class="rows">
        <div v-for="m in data.mine" :key="m.code" class="row">
          <span class="grow"><span class="t">{{ m.title }}</span><span class="s">{{ ago(m.ts) }}</span></span>
          <code class="secret">{{ m.code }}</code>
          <button class="iconbtn sm" type="button" :aria-label="`Скопировать ${m.code}`" @click="copy(m.code)"><Icon name="copy" /></button>
        </div>
      </div>
      <Empty v-else title="Промокодов пока нет" text="Обменяйте коины на скидку — код появится здесь." />
    </div>
    <div class="card">
      <div class="ch"><h2>История коинов</h2></div>
      <div v-if="data?.history.length" class="rows">
        <div v-for="(h, i) in data.history" :key="i" class="row">
          <span class="grow"><span class="t wrap">{{ h.reason }}</span><span class="s">{{ ago(h.ts) }}</span></span>
          <b class="num" :class="h.amount > 0 ? 'plus' : 'minus'">{{ h.amount > 0 ? '+' : '' }}{{ h.amount }}</b>
        </div>
      </div>
      <Empty v-else title="Пока пусто" text="Здесь будут начисления и обмены." />
    </div>
  </div>
</template>
