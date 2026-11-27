<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { api } from '../../api.js';
import { toast } from '../../store.js';
import { fdate } from '../../util.js';
import Icon from '../../components/Icon.vue';
import { PageHead } from '../../components/ui.js';

// Telegram-бот: токен (подключить, сменить бота, удалить), вкл/выкл, кому приходят уведомления,
// кнопки заявок, приветствие и список подключённых людей.
const ROLE_T = { user: 'Нужна помощь', helper: 'Волонтёры', student: 'Студенты', admin: 'Администраторы' };
const ROLE_D = {
  user: 'Ответы волонтёров, статус заявки, просьба оценить помощь',
  helper: 'Новые заявки рядом, назначения, коины и благодарности',
  student: 'Коины, сертификаты и заказы наград',
  admin: 'Новые заявки, анкеты волонтёров, жалобы и заказы наград',
};
const d = ref(null), busy = ref(false), token = ref(''), showToken = ref(false), changing = ref(false);
const f = reactive({ roles: {}, buttons: true, welcome: '' });

function fill(x) {
  d.value = x;
  Object.assign(f, { roles: { ...x.roles }, buttons: x.buttons, welcome: x.welcome });
}
const load = () => api.get('/admin/telegram').then(fill).catch((e) => toast(e.message, true));
onMounted(load);

async function save(body, ok) {
  busy.value = true;
  try { fill(await api.put('/admin/telegram', body)); if (ok) toast(ok); return true; }
  catch (e) { toast(e.message, true); return false; }
  finally { busy.value = false; }
}
async function saveToken() {
  if (!token.value.trim()) return toast('Вставьте токен от @BotFather', true);
  if (await save({ token: token.value, enabled: true }, d.value?.token ? 'Бот заменён' : 'Бот подключён')) { token.value = ''; changing.value = false; }
}
const toggleEnabled = () => save({ enabled: !d.value.enabled }, d.value.enabled ? 'Бот выключен' : 'Бот включён');
function removeToken() {
  if (confirm('Удалить токен бота? Бот перестанет работать с сайтом. Подключённые люди сохранятся — если позже подключить того же бота, уведомления снова пойдут им.'))
    save({ removeToken: true }, 'Токен удалён');
}
const saveAccess = () => save({ roles: f.roles, buttons: f.buttons, welcome: f.welcome }, 'Настройки доступа сохранены');
const dirty = computed(() => d.value && (JSON.stringify(f.roles) !== JSON.stringify(d.value.roles) || f.buttons !== d.value.buttons || f.welcome !== d.value.welcome));

async function test() {
  busy.value = true;
  try { await api.post('/admin/telegram/test'); toast('Проверочное сообщение отправлено в ваш Telegram'); }
  catch (e) { toast(e.message, true); }
  finally { busy.value = false; }
}
async function unlink(c) {
  if (!confirm(`Отключить Telegram ${c.tgName || c.phone}? Уведомления туда больше не придут, человеку бот сообщит об отключении. Он сможет подключиться снова.`)) return;
  busy.value = true;
  try { fill(await api.del(`/admin/telegram/chats/${encodeURIComponent(c.chatId)}`)); toast('Чат отключён'); }
  catch (e) { toast(e.message, true); }
  finally { busy.value = false; }
}

const STATUS = computed(() => {
  const x = d.value;
  if (!x) return null;
  if (!x.token) return { c: 'gray', t: 'Бот не подключён', s: 'Добавьте токен бота ниже — это займёт пару минут.' };
  if (!x.enabled) return { c: 'gray', t: 'Бот выключен', s: 'Уведомления в Telegram не отправляются, бот не отвечает. Подключённые люди сохранены.' };
  if (!x.bot) return { c: 'red', t: 'Бот не работает', s: x.error };
  if (x.mode === 'send-only') return { c: 'orange', t: `@${x.bot} только отправляет`, s: x.error };
  return { c: 'green', t: `Работает: @${x.bot}`, s: x.mode === 'polling' ? 'Принимает сообщения опросом (локальный режим).' : 'Принимает сообщения и нажатия кнопок мгновенно.' };
});
</script>

<template>
  <PageHead title="Telegram-бот" sub="Люди делятся номером в боте и получают уведомления своих аккаунтов, волонтёры принимают заявки кнопками." />
  <div v-if="d" class="stack" style="max-width:860px">
    <div class="card tgstatus" :class="STATUS.c">
      <span class="tgdot" />
      <div class="grow">
        <b>{{ STATUS.t }}</b>
        <span class="note">{{ STATUS.s }}</span>
      </div>
      <a v-if="d.bot" class="btn ghost sm" :href="`https://t.me/${d.bot}`" target="_blank" rel="noopener">Открыть бота</a>
      <button v-if="d.bot" class="btn sm" type="button" :disabled="busy" @click="test">Проверить на себе</button>
    </div>
    <p v-if="!d.canEdit" class="note">Смотреть настройки могут все администраторы, а менять — только главный администратор.</p>

    <div class="card fcol">
      <div class="ch"><h2>Бот</h2></div>
      <template v-if="d.token && !changing">
        <div class="setrow">
          <div><b>Токен</b><span>…{{ d.token.tail }} · {{ d.token.source === 'env' ? 'задан в настройках сервера (Render)' : 'задан в этой панели' }}</span></div>
          <div v-if="d.canEdit" style="display:flex;gap:8px;flex:none">
            <button class="btn ghost sm" type="button" @click="changing = true">Сменить бота</button>
            <button v-if="d.token.source === 'panel'" class="btn ghost sm" type="button" :disabled="busy" @click="removeToken"><Icon name="trash" />Удалить</button>
          </div>
        </div>
        <div class="setrow">
          <div><b>Бот включён</b><span>Выключите, чтобы временно остановить все сообщения в Telegram. Подключённые люди сохранятся.</span></div>
          <button class="switch" type="button" role="switch" :aria-checked="d.enabled" aria-label="Бот включён" :disabled="!d.canEdit || busy" @click="toggleEnabled" />
        </div>
      </template>
      <form v-else-if="d.canEdit" class="fcol" novalidate @submit.prevent="saveToken">
        <ol class="tgsteps">
          <li>Откройте <a href="https://t.me/BotFather" target="_blank" rel="noopener">@BotFather</a> в Telegram и отправьте <code>/newbot</code>{{ d.token ? ' — или выберите существующего бота: /mybots → бот → API Token' : '' }}.</li>
          <li>Придумайте имя (например, «Socio — помощь рядом») и адрес бота, который заканчивается на <code>bot</code>.</li>
          <li>Скопируйте токен из ответа — строку вида <code>123456789:AAH…</code> — и вставьте сюда.</li>
        </ol>
        <label class="f">Токен бота
          <span style="display:flex;gap:8px">
            <input v-model="token" :type="showToken ? 'text' : 'password'" autocomplete="off" spellcheck="false" placeholder="123456789:AAH..." style="flex:1">
            <button class="btn ghost sm" type="button" @click="showToken = !showToken">{{ showToken ? 'Скрыть' : 'Показать' }}</button>
          </span>
        </label>
        <p class="note">Токен проверяется в Telegram перед сохранением. После сохранения он не показывается целиком. Никому его не пересылайте: с ним можно писать от имени бота.</p>
        <div style="display:flex;gap:8px">
          <button class="btn" :disabled="busy"><Icon name="check" />{{ d.token ? 'Заменить бота' : 'Подключить бота' }}</button>
          <button v-if="changing" class="btn ghost" type="button" @click="changing = false; token = ''">Отмена</button>
        </div>
      </form>
      <p v-else class="note">Бот ещё не подключён. Подключить его может главный администратор.</p>
    </div>

    <form class="card fcol" novalidate @submit.prevent="saveAccess">
      <div class="ch"><h2>Доступ</h2></div>
      <p class="note" style="margin-top:-6px">Кому бот присылает уведомления. Если роль выключена, люди с этой ролью могут подключить бота, но уведомления этой роли не придут.</p>
      <div v-for="(t, r) in ROLE_T" :key="r" class="setrow">
        <div><b>{{ t }}</b><span>{{ ROLE_D[r] }}</span></div>
        <button class="switch" type="button" role="switch" :aria-checked="f.roles[r]" :aria-label="t" :disabled="!d.canEdit" @click="f.roles[r] = !f.roles[r]" />
      </div>
      <div class="setrow">
        <div><b>Принимать заявки кнопками</b><span>Волонтёр нажимает «Принять» или «Отказаться» прямо в Telegram. Если выключить — в сообщении будет ссылка на сайт.</span></div>
        <button class="switch" type="button" role="switch" :aria-checked="f.buttons" aria-label="Принимать заявки кнопками" :disabled="!d.canEdit || !f.roles.helper" @click="f.buttons = !f.buttons" />
      </div>
      <label class="f">Приветствие <span class="note">первое сообщение после «Старт»; пусто — стандартное</span>
        <textarea v-model="f.welcome" rows="5" maxlength="1500" :placeholder="d.defaultWelcome" :disabled="!d.canEdit" /></label>
      <button v-if="d.canEdit" class="btn" style="align-self:flex-start" :disabled="busy || !dirty"><Icon name="check" />Сохранить</button>
    </form>

    <div class="card">
      <div class="ch"><h2>Подключённые люди · {{ d.chats.length }}</h2></div>
      <p v-if="!d.myChats && d.bot" class="note" style="margin-bottom:10px">Ваш Telegram ещё не подключён: откройте <a :href="`https://t.me/${d.bot}`" target="_blank" rel="noopener">@{{ d.bot }}</a> и поделитесь номером — уведомления панели будут приходить туда.</p>
      <div v-if="d.chats.length" class="table-wrap">
        <table>
          <thead><tr><th>Telegram</th><th>Номер</th><th>Аккаунты на сайте</th><th>Подключён</th><th /></tr></thead>
          <tbody>
            <tr v-for="c in d.chats" :key="c.chatId">
              <td><b>{{ c.tgName || 'Без имени' }}</b><div class="note">{{ /^\d+$/.test(c.tgUser) ? `id ${c.tgUser}` : `@${c.tgUser}` }}</div></td>
              <td class="num">{{ c.phone }}</td>
              <td>
                <span v-for="a in c.accounts" :key="a.id" class="pill" :class="{ blue: f.roles[a.role] }" style="margin:2px" :title="a.name">{{ a.roleTitle }}</span>
                <span v-if="!c.accounts.length" class="note">нет аккаунтов</span>
              </td>
              <td class="num">{{ fdate(c.linkedAt) }}</td>
              <td style="text-align:right"><button v-if="d.canEdit" class="btn ghost sm" type="button" :disabled="busy" @click="unlink(c)">Отключить</button></td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="note">Пока никто не подключил бота. Кнопка «Подключить Telegram» есть у каждого в профиле на сайте.</p>
    </div>
  </div>
</template>

<style scoped>
.tgstatus{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.tgstatus .grow{display:flex;flex-direction:column;gap:2px;min-width:200px}
.tgstatus b{font-size:17px}
.tgdot{width:12px;height:12px;border-radius:50%;flex:none;background:#9aa3b2}
.green .tgdot{background:#22b35e;box-shadow:0 0 0 0 #22b35e88;animation:tgpulse 2s infinite}
.orange .tgdot{background:#f08a24}
.red .tgdot{background:#e5484d}
@keyframes tgpulse{70%{box-shadow:0 0 0 10px #22b35e00}100%{box-shadow:0 0 0 0 #22b35e00}}
.tgsteps{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:6px}
.tgsteps code,.f code{background:var(--bg2, #eef1f7);padding:1px 6px;border-radius:6px;font-size:.92em}
.switch:disabled{opacity:.5;cursor:not-allowed}
@media (prefers-reduced-motion:reduce){.tgdot{animation:none!important}}
</style>
