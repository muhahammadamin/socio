<script setup>
import { computed, ref } from 'vue';
import { S, act, catOf } from '../store.js';
import { ST, STEPT, ORDER, fdate, ftime, dueText, telHref, ago, searchText, plural } from '../util.js';
import Icon from './Icon.vue';
import Modal from './Modal.vue';
import CityMap from './CityMap.vue';
import HelperSelect from './HelperSelect.vue';
import TaskActions from './TaskActions.vue';
import { StatusPill } from './ui.js';

const props = defineProps({ id: { type: Number, required: true } });
const emit = defineEmits(['close']);

const r = computed(() => S.reqs.find((x) => x.id === props.id));
const c = computed(() => catOf(r.value?.cat));
const idx = computed(() => ORDER.indexOf(r.value?.status));
const role = computed(() => S.me.role);
const logOf = (s) => r.value.log.find((x) => x.s === s);
const OFFER_T = { open: ['ждёт ответа', 'orange'], declined: ['отказался', ''], taken: ['взял', 'green'], missed: ['не успел', ''] };

const stars = ref(5), complaint = ref(''), showComplaint = ref(false), busy = ref(false);
async function run(fn, ok, close) {
  busy.value = true;
  try { await act(fn, ok); if (close) emit('close'); } catch { /* тост */ } finally { busy.value = false; }
}
const thank = () => run((api) => api.post(`/requests/${r.value.id}/thanks`, { rating: stars.value }), 'Спасибо! Баланс добра вырос');
const cancel = () => { if (confirm('Отменить заявку?')) run((api) => api.del(`/requests/${r.value.id}`), 'Заявка отменена', true); };
const sendComplaint = () => run((api) => api.post(`/requests/${r.value.id}/complaint`, { text: complaint.value }), 'Жалоба отправлена администратору').then(() => { showComplaint.value = false; complaint.value = ''; });
</script>

<template>
  <Modal v-if="!r" label="Заявка не найдена" @close="emit('close')">
    <p class="note">Возможно, её отменили или у вас нет к ней доступа.</p>
  </Modal>
  <Modal v-else :label="r.title" @close="emit('close')">
    <template #icon><span class="cico" :style="{ '--c': c.color, width: '40px', height: '40px' }"><Icon :name="c.icon" :size="20" /></span></template>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
      <StatusPill :status="r.status" /><span class="pill" :style="{ '--x': c.color }">{{ c.name }}</span>
    </div>
    <p>{{ r.desc }}</p>
    <ol class="timeline" aria-label="Ход выполнения">
      <li v-for="(s, i) in ORDER" :key="s" :class="{ on: i <= idx }">{{ STEPT[s] }}
        <small>{{ logOf(s) ? `${fdate(logOf(s).ts)} ${ftime(logOf(s).ts)}` : '—' }}</small>
      </li>
    </ol>
    <dl class="kv">
      <template v-if="role !== 'user'"><dt>Кому нужна помощь</dt><dd>{{ r.userName }}</dd></template>
      <dt>Телефон</dt><dd><a :href="telHref(r.phone)">{{ r.phone }}</a></dd>
      <dt>Где</dt><dd>{{ r.dist }}, {{ r.addr }}</dd>
      <dt>Помощник</dt>
      <dd>{{ r.helperName || (r.status === 'new' ? 'ищем…' : 'ещё не назначен') }}<template v-if="r.helperPhone"> · <a :href="telHref(r.helperPhone)">{{ r.helperPhone }}</a></template></dd>
      <dt>Срок</dt><dd>{{ r.status === 'done' ? 'выполнена' : dueText(r) }}</dd>
      <template v-if="r.rating"><dt>Оценка</dt><dd style="color:#f5a623">{{ '★'.repeat(r.rating) }}</dd></template>
    </dl>
    <div v-if="role === 'user' && r.status === 'new'" class="dispatch">
      <b>{{ searchText(r) }}</b>
      <p class="note">{{ r.offered ? `Заявку видят ${plural(r.offered, ['помощник', 'помощника', 'помощников'])}. Первый, кто примет её, позвонит вам.` : 'Свободных помощников рядом сейчас нет — координатор подберёт помощника и позвонит.' }}</p>
    </div>
    <div v-if="role === 'admin' && r.offers?.length" class="dispatch">
      <b>Автоматическая рассылка<template v-if="r.status === 'new'"> · {{ searchText(r) }}</template></b>
      <ul>
        <li v-for="o in r.offers" :key="o.name + o.ts">
          <span class="pill" :class="OFFER_T[o.state][1]">{{ OFFER_T[o.state][0] }}</span><b>{{ o.name }}</b>
          <span class="note">{{ ago(o.ts) }}<template v-if="o.reason"> · {{ o.reason }}</template></span>
        </li>
      </ul>
    </div>
    <p v-else-if="role === 'admin' && r.status === 'new'" class="note dispatch">Свободных помощников для рассылки не нашлось — назначьте вручную.</p>
    <CityMap :pins="[{ x: r.x, y: r.y, t: r.title, c: `var(${ST[r.status].p})` }]" labels />

    <div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end">
      <template v-if="role === 'admin'">
        <label v-if="['new', 'assigned'].includes(r.status)" class="f" style="flex:1;min-width:240px">Помощник<HelperSelect :req="r" /></label>
        <a class="btn ghost" :href="telHref(r.phone)"><Icon name="phone" :size="16" />Позвонить</a>
        <button v-if="r.status !== 'done'" class="btn red" type="button" :disabled="busy" @click="cancel"><Icon name="trash" :size="16" />Отменить</button>
      </template>
      <template v-if="role === 'helper'">
        <TaskActions :req="r" />
        <a v-if="r.status !== 'done'" class="btn ghost" :href="telHref(r.phone)"><Icon name="phone" :size="16" />Позвонить</a>
      </template>
      <template v-if="role === 'user'">
        <button v-if="r.status === 'new'" class="btn red" type="button" :disabled="busy" @click="cancel">Отменить заявку</button>
        <template v-if="r.status === 'done' && !r.rating">
          <div style="width:100%"><b>Как вам помогли?</b>
            <div class="stars" role="radiogroup" aria-label="Оценка">
              <button v-for="n in 5" :key="n" type="button" role="radio" :aria-checked="stars === n" :aria-label="`${n} из 5`" :class="{ on: n <= stars }" @click="stars = n">★</button>
            </div>
          </div>
          <button class="btn" type="button" :disabled="busy" @click="thank"><Icon name="heart" :size="16" />Сказать спасибо помощнику</button>
        </template>
        <span v-if="r.rating" class="pill green">Вы сказали спасибо</span>
        <button v-if="r.helperId && !showComplaint" class="btn red" type="button" @click="showComplaint = true"><Icon name="flag" :size="16" />Пожаловаться</button>
      </template>
    </div>
    <form v-if="showComplaint" class="fcol" style="margin-top:14px" @submit.prevent="sendComplaint">
      <label class="f">Что случилось<textarea v-model="complaint" maxlength="500" placeholder="Опишите проблему — администратор разберётся" /></label>
      <div style="display:flex;gap:10px"><button class="btn" :disabled="busy">Отправить жалобу</button><button class="btn ghost" type="button" @click="showComplaint = false">Отмена</button></div>
    </form>
  </Modal>
</template>
