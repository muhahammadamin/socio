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

const HINT = {
  cert: 'Сертификат готов. Откройте его, распечатайте или отправьте ссылку — подлинность проверяется по номеру.',
  manual: 'Заказ оформлен. Координатор свяжется с вами по телефону из профиля и выдаст награду.',
  code: 'Код также сохранён ниже в «Мои награды».',
};
const STATUS = { pending: ['ждёт выдачи', 'orange'], done: ['выдано', 'green'], cancelled: ['отменён, коины вернулись', ''] };
const certUrl = (code) => `/certificate/${encodeURIComponent(code)}`;
const btnText = (r) => (r.kind === 'cert' ? 'Получить' : r.kind === 'manual' ? 'Заказать' : 'Обменять');
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
  try { await navigator.clipboard.writeText(code); toast('Скопировано'); }
  catch { toast('Не получилось скопировать — выделите код вручную', true); }
}
</script>

<template>
  <PageHead title="Коины" sub="Помогайте людям и учитесь — получайте коины и обменивайте их на сертификат волонтёра, пополнение связи, рекомендательное письмо и мерч." />

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
    <div class="grow"><b>{{ fresh.kind === 'manual' ? 'Заказ' : fresh.kind === 'cert' ? 'Сертификат' : 'Промокод' }} «{{ fresh.title }}» — № {{ fresh.code }}</b><span class="note">{{ HINT[fresh.kind] }}</span></div>
    <RouterLink v-if="fresh.kind === 'cert'" class="btn sm" :to="certUrl(fresh.code)"><Icon name="trophy" />Открыть сертификат</RouterLink>
    <template v-else><code class="secret">{{ fresh.code }}</code>
      <button class="btn sm" type="button" @click="copy(fresh.code)"><Icon name="copy" />Копировать</button></template>
  </div>

  <h2 class="sech">Обменять коины</h2>
  <div class="rewards">
    <div v-for="r in data?.rewards || []" :key="r.id" class="reward">
      <div class="rtop"><span class="rlogo"><Icon :name="r.icon || 'gift'" /></span><span class="note">{{ r.kind === 'cert' ? 'выдаётся сразу' : r.kind === 'manual' ? 'выдаёт координатор' : r.partner }}</span></div>
      <b>{{ r.title }}</b>
      <p>{{ r.descr }}</p>
      <div class="rbar"><div class="fill" :style="{ width: Math.min(100, coins / r.cost * 100) + '%' }" /></div>
      <div class="rfoot">
        <span class="cost"><Icon name="coin" />{{ r.cost }}</span>
        <button v-if="r.kind === 'code' && !r.stock" class="btn sm" type="button" disabled>Нет в наличии</button>
        <button v-else-if="coins < r.cost" class="btn ghost sm" type="button" disabled>Ещё {{ r.cost - coins }}</button>
        <button v-else class="btn sm" type="button" :disabled="busy === r.id" @click="redeem(r)">{{ btnText(r) }}</button>
      </div>
    </div>
    <Empty v-if="data && !data.rewards.length" title="Наград пока нет" text="Скоро здесь появятся награды." />
  </div>

  <div class="grid2 even" style="margin-top:18px">
    <div class="card">
      <div class="ch"><h2>Мои награды</h2></div>
      <div v-if="data?.mine.length" class="rows">
        <div v-for="m in data.mine" :key="m.code" class="row">
          <span class="grow"><span class="t">{{ m.title }}</span>
            <span class="s">№ {{ m.code }} · {{ ago(m.ts) }}<span v-if="m.kind === 'manual'" class="pill" :class="STATUS[m.status]?.[1]" style="margin-left:6px">{{ STATUS[m.status]?.[0] }}</span></span></span>
          <RouterLink v-if="m.kind === 'cert'" class="btn ghost sm" :to="certUrl(m.code)">Открыть</RouterLink>
          <template v-else-if="m.kind === 'code'"><code class="secret">{{ m.code }}</code>
            <button class="iconbtn sm" type="button" :aria-label="`Скопировать ${m.code}`" @click="copy(m.code)"><Icon name="copy" /></button></template>
        </div>
      </div>
      <Empty v-else title="Наград пока нет" text="Обменяйте коины — награда появится здесь." />
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
