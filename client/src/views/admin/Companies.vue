<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { api } from '../../api.js';
import { S, toast, load as reloadAll } from '../../store.js';
import { ago, telHref } from '../../util.js';
import Icon from '../../components/Icon.vue';
import { PageHead, Avatar, Empty } from '../../components/ui.js';

// Компании просят волонтёров → координатор звонит → открывает набор → волонтёры заполняют анкету → координатор подтверждает.
const data = ref(null), busy = ref(false);
const STATUS = { new: ['Ждёт звонка', 'orange'], contacted: ['Связались', 'blue'], recruiting: ['Идёт набор', 'purple'], done: ['Проведено', 'green'], rejected: ['Отказано', 'gray'] };
const APP = { pending: 'Ждёт решения', approved: 'Участвует', rejected: 'Отклонён', withdrawn: 'Отказался сам' };
const districts = computed(() => Object.keys(S.districts || {}));

const fetchAll = () => api.get('/admin/companies').then((d) => { data.value = d; }).catch((e) => toast(e.message, true));
onMounted(fetchAll);
watch(() => S.notes.length, fetchAll); // новая заявка или анкета приходит уведомлением — обновляем список

async function run(fn, ok) {
  busy.value = true;
  try { const r = await fn(); if (ok) toast(typeof ok === 'function' ? ok(r) : ok); await fetchAll(); reloadAll().catch(() => {}); return r; }
  catch (e) { toast(e.message, true); throw e; }
  finally { busy.value = false; }
}
const setStatus = (r, status) => run(() => api.patch(`/admin/companies/${r.id}`, { status }), `«${r.company}»: ${STATUS[status][0].toLowerCase()}`).catch(() => {});
const saveNote = (r) => run(() => api.patch(`/admin/companies/${r.id}`, { note: r.note }), 'Заметка сохранена').catch(() => {});
const del = (r) => { if (confirm(`Удалить заявку «${r.company}»?`)) run(() => api.del(`/admin/companies/${r.id}`), 'Заявка удалена').catch(() => {}); };

/* ---------- новый набор ---------- */
const blank = () => ({ companyId: null, title: '', company: '', descr: '', dist: '', place: '', when: '', needed: 10, students: false });
const f = reactive(blank());
const formOpen = ref(false);
function startCampaign(r) {
  Object.assign(f, blank(), r ? { companyId: r.id, company: r.company, descr: r.task, dist: r.dist, place: r.place, when: r.when, needed: r.people } : {});
  formOpen.value = true;
  requestAnimationFrame(() => document.getElementById('campaign-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
}
const create = () => run(() => api.post('/admin/campaigns', f), (x) => `Набор открыт — приглашение получили ${x.invited} волонтёр(ов)`)
  .then(() => { formOpen.value = false; Object.assign(f, blank()); }).catch(() => {});
const toggle = (c) => run(() => api.post(`/admin/campaigns/${c.id}/close`, { open: !c.open }), c.open ? 'Набор закрыт' : 'Набор снова открыт').catch(() => {});
const decide = (c, a, status) => run(() => api.post(`/admin/campaigns/${c.id}/apps/${a.uid}`, { status }), status === 'approved' ? `${a.name} в команде` : `${a.name}: отказ отправлен`).catch(() => {});
const count = (c, s) => c.apps.filter((a) => a.status === s).length;
const copyList = async (c) => {
  const list = c.apps.filter((a) => a.status === 'approved').map((a, i) => `${i + 1}. ${a.name} — ${a.phone}`).join('\n');
  try { await navigator.clipboard.writeText(`${c.title} (${c.company}), ${c.when}\n${list}`); toast('Список команды скопирован — можно отправить компании'); }
  catch { toast('Не удалось скопировать', true); }
};
</script>

<template>
  <PageHead title="Компании" sub="Заявки от компаний, которым нужны волонтёры, и наборы под них.">
    <button class="btn" type="button" @click="startCampaign(null)"><Icon name="plus" />Новый набор</button>
  </PageHead>

  <div class="card infocard">
    <Icon name="info" :size="22" />
    <div><b>Как это работает</b>
      <p>Компания оставляет заявку на странице <RouterLink to="/companies" target="_blank">/companies</RouterLink>. Позвоните, уточните детали и нажмите «Открыть набор».
        Приглашение с анкетой придёт проверенным волонтёрам района (или всего города) — в кабинет и в Telegram-бот. Кто хочет участвовать, заполняет анкету; вы подтверждаете состав и отправляете список компании.</p></div>
  </div>

  <div class="card" style="margin-top:16px">
    <div class="ch"><h2>Заявки компаний</h2><span class="note">{{ data?.requests.length ?? '…' }}</span></div>
    <div v-if="data?.requests.length" class="rows">
      <div v-for="r in data.requests" :key="r.id" class="row" style="flex-wrap:wrap;align-items:flex-start" :style="['done', 'rejected'].includes(r.status) ? 'opacity:.6' : ''">
        <Avatar :name="r.company" :size="40" />
        <span class="grow">
          <span class="t">{{ r.company }} <span class="pill" :class="STATUS[r.status][1]">{{ STATUS[r.status][0] }}</span></span>
          <span class="s"><Icon name="user" />{{ r.contact }} · <a :href="telHref(r.phone)">{{ r.phone }}</a><template v-if="r.email"> · <a :href="`mailto:${r.email}`">{{ r.email }}</a></template> · {{ ago(r.ts) }}</span>
          <span class="s"><Icon name="users" />{{ r.people }} чел.{{ r.regular ? ' · регулярно' : '' }} · <Icon name="pin" />{{ r.dist || 'весь город' }}{{ r.place ? `, ${r.place}` : '' }}{{ r.when ? ` · ${r.when}` : '' }}</span>
          <span class="s wrap" style="white-space:pre-line;color:var(--ink)">{{ r.task }}</span>
          <label class="f" style="margin-top:8px">Заметка координатора
            <input v-model="r.note" type="text" maxlength="1000" placeholder="О чём договорились" @change="saveNote(r)"></label>
        </span>
        <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">
          <a class="btn ghost sm" :href="telHref(r.phone)"><Icon name="phone" />Позвонить</a>
          <button v-if="r.status === 'new'" class="btn ghost sm" type="button" :disabled="busy" @click="setStatus(r, 'contacted')"><Icon name="check" />Связались</button>
          <button v-if="!['done', 'rejected'].includes(r.status)" class="btn green sm" type="button" :disabled="busy" @click="startCampaign(r)"><Icon name="send" />Открыть набор</button>
          <button v-if="r.status === 'recruiting'" class="btn ghost sm" type="button" :disabled="busy" @click="setStatus(r, 'done')">Проведено</button>
          <button v-if="!['done', 'rejected'].includes(r.status)" class="btn red sm" type="button" :disabled="busy" @click="setStatus(r, 'rejected')">Отказать</button>
          <button class="iconbtn sm" type="button" :aria-label="`Удалить заявку ${r.company}`" @click="del(r)"><Icon name="trash" /></button>
        </div>
      </div>
    </div>
    <Empty v-else-if="data" title="Заявок от компаний пока нет" text="Поделитесь ссылкой на страницу /companies с партнёрами." />
  </div>

  <form v-if="formOpen" id="campaign-form" class="card fcol" style="margin-top:16px;box-shadow:var(--shadow),inset 0 0 0 2px var(--accent)" novalidate @submit.prevent="create">
    <div class="ch"><h2>Открыть набор волонтёров</h2><button class="iconbtn sm" type="button" aria-label="Закрыть" @click="formOpen = false"><Icon name="x" /></button></div>
    <div class="two">
      <label class="f">Название набора<input v-model="f.title" type="text" maxlength="120" placeholder="Субботник в парке Бабура"></label>
      <label class="f">Компания<input v-model="f.company" type="text" maxlength="120"></label>
    </div>
    <label class="f">Что будут делать волонтёры<textarea v-model="f.descr" rows="4" maxlength="1500" /></label>
    <div class="two">
      <label class="f">Когда<input v-model="f.when" type="text" maxlength="120" placeholder="14 декабря, 10:00–14:00"></label>
      <label class="f">Сколько нужно<input v-model.number="f.needed" type="number" min="1" max="500" inputmode="numeric"></label>
    </div>
    <div class="two">
      <label class="f">Кому разослать<select v-model="f.dist"><option value="">Всему городу</option><option v-for="d in districts" :key="d" :value="d">Только: {{ d }}</option></select></label>
      <label class="f">Адрес места<input v-model="f.place" type="text" maxlength="200" placeholder="Улица, дом, ориентир"></label>
    </div>
    <label style="display:flex;gap:8px;align-items:center"><input v-model="f.students" type="checkbox">Пригласить и студентов Академии (и волонтёров, которых ещё не проверили)</label>
    <button class="btn" :disabled="busy" style="align-self:flex-start"><Icon name="send" />Открыть набор и разослать приглашения</button>
  </form>

  <div class="card" style="margin-top:16px">
    <div class="ch"><h2>Наборы</h2><span class="note">{{ data?.campaigns.length ?? '…' }}</span></div>
    <div v-if="data?.campaigns.length" class="stack">
      <div v-for="c in data.campaigns" :key="c.id" class="card" style="box-shadow:inset 0 0 0 1px var(--line)" :style="c.open ? '' : 'opacity:.7'">
        <div class="ch" style="flex-wrap:wrap;gap:8px">
          <div>
            <h3 style="margin:0">{{ c.title }} <span class="pill" :class="c.open ? 'green' : 'gray'">{{ c.open ? 'Набор открыт' : 'Закрыт' }}</span></h3>
            <p class="note">{{ c.company }} · {{ c.when }} · {{ c.dist || 'весь город' }}{{ c.place ? `, ${c.place}` : '' }} · приглашено {{ c.invited }}</p>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button v-if="count(c, 'approved')" class="btn ghost sm" type="button" @click="copyList(c)"><Icon name="copy" />Список команды</button>
            <button class="btn ghost sm" type="button" :disabled="busy" @click="toggle(c)">{{ c.open ? 'Закрыть набор' : 'Открыть снова' }}</button>
          </div>
        </div>
        <p style="margin:6px 0 10px"><b class="num">{{ count(c, 'approved') }}</b> из {{ c.needed }} в команде · ждут решения {{ count(c, 'pending') }}</p>
        <div v-if="c.apps.length" class="rows">
          <div v-for="a in c.apps" :key="a.uid" class="row" :style="['rejected', 'withdrawn'].includes(a.status) ? 'opacity:.55' : ''">
            <Avatar :name="a.name" :size="36" />
            <span class="grow">
              <span class="t">{{ a.name }} <span class="note">· {{ a.role === 'student' ? 'студент' : `волонтёр, выполнил ${a.done}` }} · {{ APP[a.status] }}</span></span>
              <span class="s"><Icon name="pin" />{{ a.dist }} · <a :href="telHref(a.phone)">{{ a.phone }}</a> · {{ ago(a.ts) }}</span>
              <span v-if="a.about" class="s wrap" style="color:var(--ink)">«{{ a.about }}»</span>
            </span>
            <template v-if="a.status === 'pending' || a.status === 'rejected' || a.status === 'approved'">
              <button v-if="a.status !== 'approved'" class="btn green sm" type="button" :disabled="busy" @click="decide(c, a, 'approved')"><Icon name="check" />Взять</button>
              <button v-if="a.status !== 'rejected'" class="btn red sm" type="button" :disabled="busy" @click="decide(c, a, 'rejected')">Отклонить</button>
            </template>
          </div>
        </div>
        <p v-else class="note">Анкет пока нет.</p>
      </div>
    </div>
    <Empty v-else-if="data" title="Наборов пока нет" text="Откройте набор из заявки компании или кнопкой «Новый набор»." />
  </div>
</template>
