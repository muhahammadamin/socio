<script setup>
import { onMounted, reactive, ref } from 'vue';
import { api } from '../../api.js';
import { toast } from '../../store.js';
import { ago } from '../../util.js';
import { COINS } from '@shared/constants.js';
import Icon from '../../components/Icon.vue';
import { PageHead, Empty } from '../../components/ui.js';

const data = ref(null), busy = ref(false);
const KINDS = { manual: 'Выдаёт координатор', cert: 'Сертификат (выдаётся сразу)', code: 'Промокоды партнёра' };
const ICONS = { gift: 'Подарок', phone: 'Связь', edit: 'Письмо', trophy: 'Кубок', book: 'Книга', star: 'Звезда', heart: 'Сердце', bag: 'Покупки', car: 'Транспорт' };
const f = reactive({ kind: 'manual', icon: 'gift', title: '', cost: 100, partner: 'Socio', descr: '' });
const codesFor = ref(null), codes = ref('');

const load = () => api.get('/rewards').then((d) => { data.value = d; }).catch((e) => toast(e.message, true));
// данные организации, которые печатаются на сертификате
const org = reactive({ name: 'Socio', address: '', phone: '', site: '', envSite: '' });
onMounted(() => { load(); api.get('/admin/org').then((o) => Object.assign(org, o)).catch(() => {}); });
const saveOrg = () => run(() => api.put('/admin/org', org), 'Данные сертификата сохранены').then((o) => Object.assign(org, o)).catch(() => {});
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
const orderDone = (o) => run(() => api.post(`/rewards/orders/${o.id}/done`), `Заказ № ${o.code} отмечен выданным`).catch(() => {});
const orderCancel = (o) => { if (confirm(`Отменить заказ № ${o.code}? Коины вернутся ${o.name}.`)) run(() => api.post(`/rewards/orders/${o.id}/cancel`), 'Заказ отменён, коины возвращены').catch(() => {}); };
const addCodes = (r) => run(() => api.post(`/rewards/${r.id}/codes`, { codes: codes.value }), (x) => `Добавлено кодов: ${x.added}${x.skipped ? `, повторов пропущено: ${x.skipped}` : ''}`)
  .then(() => { codes.value = ''; codesFor.value = null; }).catch(() => {});
</script>

<template>
  <PageHead title="Награды" sub="На что помощники и студенты обменивают коины. Заказы, которые нужно выдать, — первыми на странице." />

  <div class="card infocard">
    <Icon name="info" :size="22" />
    <div>
      <b>Как работают коины</b>
      <p>Помощник получает <b>{{ COINS.requestDone }}</b> коинов за выполненную заявку и <b>{{ COINS.perStar }}</b> за каждую звезду в оценке. Студенты и помощники получают <b>{{ COINS.courseDone }}</b> за пройденный курс.
        Награды трёх видов: <b>сертификат</b> выдаётся сразу и проверяется по номеру на сайте; <b>«выдаёт координатор»</b> — пополнение связи, письмо, мерч: вы получаете заказ, выполняете его и отмечаете «Выдано»;
        <b>промокоды партнёра</b> — если появится партнёр, загрузите коды пачкой, каждый выдаётся один раз.</p>
    </div>
  </div>

  <div v-if="data?.orders?.length" class="card" style="margin-top:16px;box-shadow:var(--shadow),inset 0 0 0 2px var(--p-orange)">
    <div class="ch"><h2>Ждут выдачи · {{ data.orders.length }}</h2></div>
    <div class="rows">
      <div v-for="o in data.orders" :key="o.id" class="row">
        <span class="cico" style="--c:var(--p-orange)"><Icon name="gift" /></span>
        <span class="grow"><span class="t">{{ o.title }} — {{ o.name || 'Удалённый аккаунт' }}</span>
          <span class="s">№ {{ o.code }} · {{ ago(o.ts) }} · <a :href="`tel:+${String(o.note).replace(/\D/g, '')}`">{{ o.note }}</a></span></span>
        <button class="btn green sm" type="button" :disabled="busy" @click="orderDone(o)"><Icon name="check" />Выдано</button>
        <button class="btn red sm" type="button" :disabled="busy" @click="orderCancel(o)">Отменить</button>
      </div>
    </div>
  </div>

  <div class="grid2" style="margin-top:16px">
    <div class="card">
      <div class="ch"><h2>Награды</h2></div>
      <div v-if="data?.rewards.length" class="rows">
        <div v-for="r in data.rewards" :key="r.id" class="row" :style="r.active ? '' : 'opacity:.55'">
          <span class="cico" style="--c:#f5a623;width:38px;height:38px;font-size:19px"><Icon :name="r.icon || 'gift'" /></span>
          <span class="grow">
            <span class="t">{{ r.title }}</span>
            <span class="s"><Icon name="coin" />{{ r.cost }} · {{ KINDS[r.kind] }}{{ r.kind === 'code' ? ` · в наличии ${r.stock}` : '' }} · выдано {{ r.issued }}{{ r.active ? '' : ' · скрыта' }}</span>
          </span>
          <button v-if="r.kind === 'code'" class="btn sm" type="button" @click="codesFor = codesFor === r.id ? null : r.id"><Icon name="plus" />Коды</button>
          <button class="btn ghost sm" type="button" @click="setCost(r)">Цена</button>
          <button class="btn ghost sm" type="button" @click="toggle(r)">{{ r.active ? 'Скрыть' : 'Показать' }}</button>
          <button v-if="!r.issued" class="iconbtn sm" type="button" :aria-label="`Удалить ${r.title}`" @click="del(r)"><Icon name="trash" /></button>
          <div v-if="codesFor === r.id" class="fcol" style="width:100%;padding:8px 0 4px">
            <label class="f">Промокоды для «{{ r.title }}» <span class="note">по одному в строке; повторы пропускаются</span>
              <textarea v-model="codes" rows="5" placeholder="PROMO-AB12CD&#10;PROMO-EF34GH" /></label>
            <button class="btn sm" type="button" style="align-self:flex-start" :disabled="busy" @click="addCodes(r)">Загрузить</button>
          </div>
        </div>
      </div>
      <Empty v-else-if="data" title="Наград пока нет" text="Добавьте первую справа." />
    </div>

    <div class="stack">
      <form class="card fcol" novalidate @submit.prevent="saveOrg">
        <h2>Данные на сертификате</h2>
        <p class="note">Печатаются в шапке каждого сертификата — и уже выданных тоже. Укажите настоящий адрес, чтобы работодатель или вуз мог с вами связаться.</p>
        <div class="two">
          <label class="f">Организация<input v-model="org.name" type="text" maxlength="80" placeholder="Socio"></label>
          <label class="f">Телефон для справок<input v-model="org.phone" type="text" maxlength="40" placeholder="+998 77 010 25 56"></label>
        </div>
        <label class="f">Адрес<input v-model="org.address" type="text" maxlength="200" placeholder="г. Ташкент, Юнусабадский район, ул. …, дом …"></label>
        <label class="f">Адрес сайта для проверки <span class="note">{{ org.envSite ? `по умолчанию ${org.envSite}` : 'пусто — адрес, с которого открыта страница' }}</span>
          <input v-model="org.site" type="text" maxlength="200" :placeholder="org.envSite || 'https://socio.uz'"></label>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn" :disabled="busy"><Icon name="check" />Сохранить</button>
          <RouterLink v-if="data?.recent?.find((x) => /^SC-/.test(x.code))" class="btn ghost" :to="`/certificate/${data.recent.find((x) => /^SC-/.test(x.code)).code}`" target="_blank">Посмотреть сертификат</RouterLink>
        </div>
      </form>
      <form class="card fcol" novalidate @submit.prevent="create">
        <h2>Новая награда</h2>
        <div class="two">
          <label class="f">Вид<select v-model="f.kind"><option v-for="(t, k) in KINDS" :key="k" :value="k">{{ t }}</option></select></label>
          <label class="f">Значок<select v-model="f.icon"><option v-for="(t, k) in ICONS" :key="k" :value="k">{{ t }}</option></select></label>
        </div>
        <label class="f">Название<input v-model="f.title" type="text" maxlength="100" placeholder="Билет в кино для волонтёра"></label>
        <div class="two">
          <label class="f">Стоимость, коинов<input v-model.number="f.cost" type="text" inputmode="numeric"></label>
          <label class="f">Кто выдаёт<input v-model="f.partner" type="text" maxlength="60" placeholder="Socio"></label>
        </div>
        <label class="f">Описание<input v-model="f.descr" type="text" maxlength="300" placeholder="Что получит человек и когда"></label>
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
