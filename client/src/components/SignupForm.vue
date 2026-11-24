<script setup>
import { computed, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '../api.js';
import { toast } from '../store.js';
import { enter } from '../authflow.js';
import { SKILLS } from '@shared/constants.js';
import Icon from './Icon.vue';
import GoogleButton from './GoogleButton.vue';

// Одна форма регистрации для всех ролей: «нужна помощь» (user), студент (student), волонтёр (helper).
// Поля проверяются сразу в браузере — ошибка показывается под нужным полем.
const props = defineProps({
  role: { type: String, required: true },
  districts: { type: Array, required: true },
  categories: { type: Array, default: () => [] },
  clientId: { type: String, default: null },
  submitLabel: { type: String, default: 'Создать аккаунт' },
  redirect: { type: String, default: null },
  google: { type: Object, default: null }, // { ticket, name, email } — если пришли со входа через Google
});
const route = useRoute(), router = useRouter();
const f = reactive({ name: props.google?.name || '', phone: '', dist: props.districts[0], password: '', school: '', skills: [], needs: [] });
const g = ref(props.google), busy = ref(false), showPw = ref(false);
const E = reactive({}); // ошибки по полям
const general = ref('');
const clr = (k) => { delete E[k]; };
const PH = { user: 'Ирина Каримова', student: 'Малика Турсунова', helper: 'Фарход Рашидов' };

const toggle = (list, v) => { f[list] = f[list].includes(v) ? f[list].filter((x) => x !== v) : [...f[list], v]; delete E[list]; };

/* телефон: принимаем любые цифры и приводим к виду +998 90 123-45-67 */
function formatPhone() {
  let d = f.phone.replace(/\D/g, '');
  if (d.length === 9) d = '998' + d;
  if (d.length === 12 && d.startsWith('998')) f.phone = `+998 ${d.slice(3, 5)} ${d.slice(5, 8)}-${d.slice(8, 10)}-${d.slice(10)}`;
}

function validate() {
  for (const k of Object.keys(E)) delete E[k];
  general.value = '';
  if (f.name.trim().length < 2) E.name = 'Введите имя и фамилию.';
  const digits = f.phone.replace(/\D/g, '');
  if (digits.length < 9 || digits.length > 15) E.phone = 'Введите телефон, например +998 90 123-45-67.';
  if (!g.value && f.password.length < 6) E.password = 'Пароль — не короче 6 символов.';
  if (props.role === 'student' && f.school.trim().length < 2) E.school = 'Укажите, где вы учитесь.';
  if (props.role === 'user' && props.categories.length && !f.needs.length) E.needs = 'Отметьте хотя бы одну сферу.';
  if (props.role === 'helper' && !f.skills.length) E.skills = 'Выберите хотя бы одно направление.';
  return !Object.keys(E).length;
}
// ошибку сервера показываем у подходящего поля
function placeError(msg) {
  const m = msg.toLowerCase();
  if (m.includes('телефон')) E.phone = msg;
  else if (m.includes('имя')) E.name = msg;
  else if (m.includes('пароль')) E.password = msg;
  else if (m.includes('учитесь')) E.school = msg;
  else if (m.includes('сфер')) E.needs = msg;
  else if (m.includes('направлени')) E.skills = msg;
  else general.value = msg;
}

async function finish(res) {
  toast(`Добро пожаловать, ${res.user.name.split(' ')[0]}!`);
  await enter(res, router, route.query.next, props.redirect);
}
async function submit() {
  formatPhone();
  if (!validate()) { general.value = 'Проверьте поля, отмеченные красным.'; return; }
  busy.value = true;
  try {
    const body = { ...f, role: props.role };
    await finish(await (g.value ? api.post('/auth/google/complete', { ...body, ticket: g.value.ticket }) : api.post('/auth/register', body)));
  } catch (e) { placeError(e.message); }
  finally { busy.value = false; }
}
async function onGoogle(credential) {
  busy.value = true;
  general.value = '';
  try {
    const r = await api.post('/auth/google', { credential });
    if (r.token) return await finish(r); // уже зарегистрирован — просто входим
    g.value = r;
    if (!f.name) f.name = r.name;
  } catch (e) { general.value = e.message; }
  finally { busy.value = false; }
}
const label = computed(() => (g.value ? 'Завершить регистрацию' : props.submitLabel));
</script>

<template>
  <form class="signup" novalidate @submit.prevent="submit">
    <div v-if="g" class="gnote"><Icon name="check" />Google-аккаунт {{ g.email }} подтверждён. Осталось заполнить несколько полей.</div>

    <label class="f" :class="{ bad: E.name }">Имя и фамилия
      <input v-model="f.name" type="text" autocomplete="name" :placeholder="PH[role]" :aria-invalid="!!E.name" @input="clr('name')">
      <span v-if="E.name" class="ferr">{{ E.name }}</span>
    </label>

    <label v-if="role === 'student'" class="f" :class="{ bad: E.school }">Где вы учитесь
      <input v-model="f.school" type="text" maxlength="120" placeholder="Вуз, колледж или школа, курс" :aria-invalid="!!E.school" @input="clr('school')">
      <span v-if="E.school" class="ferr">{{ E.school }}</span>
    </label>

    <div class="two">
      <label class="f" :class="{ bad: E.phone }">Телефон
        <input v-model="f.phone" type="tel" autocomplete="tel" inputmode="tel" placeholder="+998 90 123-45-67" :aria-invalid="!!E.phone" @input="clr('phone')" @blur="formatPhone">
        <span v-if="E.phone" class="ferr">{{ E.phone }}</span>
      </label>
      <label class="f">Район<select v-model="f.dist"><option v-for="d in districts" :key="d">{{ d }}</option></select></label>
    </div>

    <fieldset v-if="role === 'user' && categories.length" class="f" :class="{ bad: E.needs }">
      <legend>С чем вам нужна помощь <span class="note">(можно несколько)</span></legend>
      <div class="needgrid">
        <button v-for="c in categories" :key="c.id" type="button" class="needcard" :style="{ '--c': c.color }" :aria-pressed="f.needs.includes(c.id)" @click="toggle('needs', c.id)">
          <span class="cico"><Icon :name="f.needs.includes(c.id) ? 'check' : c.icon" /></span>
          <span><b>{{ c.name }}</b><small>{{ c.examples.slice(0, 2).join(', ') || c.descr }}</small></span>
        </button>
      </div>
      <span v-if="E.needs" class="ferr">{{ E.needs }}</span>
    </fieldset>

    <fieldset v-if="role === 'helper'" class="f" :class="{ bad: E.skills }">
      <legend>Чем можете помогать <span class="note">(можно несколько)</span></legend>
      <div class="chips" style="margin:0">
        <button v-for="(l, k) in SKILLS" :key="k" type="button" class="chip" :aria-pressed="f.skills.includes(k)" @click="toggle('skills', k)">
          <Icon v-if="f.skills.includes(k)" name="check" :size="14" />{{ l }}
        </button>
      </div>
      <span v-if="E.skills" class="ferr">{{ E.skills }}</span>
    </fieldset>

    <label v-if="!g" class="f" :class="{ bad: E.password }">Пароль
      <span class="pwrap">
        <input v-model="f.password" :type="showPw ? 'text' : 'password'" autocomplete="new-password" placeholder="Не короче 6 символов" :aria-invalid="!!E.password" @input="clr('password')">
        <button type="button" class="pwtoggle" :aria-label="showPw ? 'Скрыть пароль' : 'Показать пароль'" @click="showPw = !showPw">{{ showPw ? 'Скрыть' : 'Показать' }}</button>
      </span>
      <span v-if="E.password" class="ferr">{{ E.password }}</span>
    </label>

    <p v-if="general" class="formerr" role="alert">{{ general }}</p>
    <button class="btn lg" :disabled="busy">{{ busy ? 'Минутку…' : label }}</button>
    <GoogleButton v-if="!g" :client-id="clientId" text="signup_with" @credential="onGoogle" />
  </form>
</template>
