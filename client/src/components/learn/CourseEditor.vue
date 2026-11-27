<script setup>
import { reactive, ref } from 'vue';
import { api } from '../../api.js';
import { toast } from '../../store.js';
import { ICONS, CAT_COLORS } from '@shared/constants.js';
import { typeIcon } from '../../learn.js';
import Icon from '../Icon.vue';

// Редактор курса. Тесты и игры редактируются в простом текстовом виде, сервер проверяет всё перед сохранением.
const props = defineProps({ course: { type: Object, required: true } });
const emit = defineEmits(['saved', 'close']);

let seq = 0;
const key = () => `k${++seq}`;
const PAIR_SEP = /\s+[—–-]\s+|\s*=\s*/;

function toEdit(it) {
  const base = { _k: key(), _open: false, id: it.id, type: it.type, kind: it.kind, title: it.title };
  if (it.type === 'lesson') return { ...base, body: it.body || '', minutes: it.minutes || '', key: (it.key || []).join('\n'),
    cq: it.check?.q || '', copts: (it.check?.options || []).join('\n'), cans: it.check?.answer ?? 0, cexp: it.check?.explain || '' };
  if (it.type === 'video') return { ...base, video: it.video ? `https://youtu.be/${it.video}` : '', text: it.text || '' };
  if (it.type === 'quiz') return { ...base, questions: it.questions.map((q) => ({ _k: key(), q: q.q, options: q.options.join('\n'), answer: q.answer, explain: q.explain || '' })) };
  if (it.kind === 'match') return { ...base, pairs: it.pairs.map((p) => p.join(' — ')).join('\n') };
  return { ...base, steps: it.steps.join('\n') };
}
const lines = (s) => String(s || '').split('\n').map((x) => x.trim()).filter(Boolean);
function fromEdit(it) {
  const base = { id: it.id, type: it.type, title: it.title };
  if (it.type === 'lesson') return { ...base, body: it.body, minutes: Number(it.minutes) || 0, key: lines(it.key),
    check: it.cq.trim() ? { q: it.cq, options: lines(it.copts), answer: Number(it.cans), explain: it.cexp } : null };
  if (it.type === 'video') return { ...base, video: it.video, text: it.text };
  if (it.type === 'quiz') return { ...base, questions: it.questions.map((q) => ({ q: q.q, options: lines(q.options), answer: Number(q.answer), explain: q.explain })) };
  if (it.kind === 'match') return { ...base, kind: 'match', pairs: lines(it.pairs).map((l) => { const [a, ...b] = l.split(PAIR_SEP); return [a, b.join(' ')]; }) };
  return { ...base, kind: 'order', steps: lines(it.steps) };
}

const f = reactive({ title: props.course.title, descr: props.course.descr, icon: props.course.icon, color: props.course.color, items: props.course.items.map(toEdit) });
const busy = ref(false), err = ref('');

const NEW = {
  lesson: () => ({ type: 'lesson', title: '', body: '', minutes: '', key: '', cq: '', copts: '', cans: 0, cexp: '' }),
  video: () => ({ type: 'video', title: '', video: '', text: '' }),
  quiz: () => ({ type: 'quiz', title: '', questions: [newQ()] }),
  match: () => ({ type: 'game', kind: 'match', title: '', pairs: '' }),
  order: () => ({ type: 'game', kind: 'order', title: '', steps: '' }),
};
function newQ() { return { _k: key(), q: '', options: '', answer: 0, explain: '' }; }
function add(kind) { f.items.push({ _k: key(), _open: true, ...NEW[kind]() }); }
function move(i, d) { const j = i + d; if (j < 0 || j >= f.items.length) return; const [x] = f.items.splice(i, 1); f.items.splice(j, 0, x); }
function remove(i) { if (confirm(`Удалить «${f.items[i].title || 'без названия'}»? Прогресс учеников по нему тоже удалится.`)) f.items.splice(i, 1); }
const kindLabel = (it) => (it.type === 'lesson' ? 'Урок' : it.type === 'video' ? 'Видео / урок' : it.type === 'quiz' ? 'Тест' : it.kind === 'match' ? 'Игра «Пары»' : 'Игра «Порядок»');
const optList = (q) => lines(q.options);

async function save() {
  err.value = '';
  busy.value = true;
  try {
    const saved = await api.put(`/courses/${props.course.id}`, { title: f.title, descr: f.descr, icon: f.icon, color: f.color, items: f.items.map(fromEdit) });
    toast('Курс сохранён');
    emit('saved', saved);
  } catch (e) { err.value = e.message; }
  finally { busy.value = false; }
}
</script>

<template>
  <form class="card fcol editor" novalidate @submit.prevent="save">
    <div class="ch"><h2>Редактирование курса</h2><button class="iconbtn" type="button" aria-label="Закрыть" @click="emit('close')"><Icon name="x" /></button></div>
    <div class="two">
      <label class="f">Название<input v-model="f.title" type="text" maxlength="80"></label>
      <div class="two">
        <label class="f">Иконка<select v-model="f.icon"><option v-for="i in ICONS" :key="i">{{ i }}</option></select></label>
        <label class="f">Цвет<select v-model="f.color" :style="{ color: f.color }"><option v-for="c in CAT_COLORS" :key="c" :value="c" :style="{ color: c }">■ {{ c }}</option></select></label>
      </div>
    </div>
    <label class="f">Описание<input v-model="f.descr" type="text" maxlength="300" placeholder="Коротко: чему научится студент"></label>

    <h3 class="sub3">Материалы ({{ f.items.length }})</h3>
    <div v-for="(it, i) in f.items" :key="it._k" class="eitem">
      <div class="ehead">
        <button type="button" class="etoggle" :aria-expanded="it._open" @click="it._open = !it._open">
          <Icon :name="typeIcon({ type: it.type, video: it.video ?? 'x' })" /><small>{{ kindLabel(it) }}</small><b>{{ it.title || 'Без названия' }}</b>
        </button>
        <button class="iconbtn sm" type="button" :disabled="i === 0" aria-label="Выше" @click="move(i, -1)"><Icon name="up" /></button>
        <button class="iconbtn sm" type="button" :disabled="i === f.items.length - 1" aria-label="Ниже" @click="move(i, 1)"><Icon name="down" /></button>
        <button class="iconbtn sm" type="button" aria-label="Удалить" @click="remove(i)"><Icon name="trash" /></button>
      </div>
      <div v-if="it._open" class="fcol ebody">
        <label class="f">Название<input v-model="it.title" type="text" maxlength="100"></label>

        <template v-if="it.type === 'lesson'">
          <label class="f">Текст урока <span class="note">«## » — заголовок, «- » — пункт списка, «1. » — шаг, «> » — совет, **жирный**</span>
            <textarea v-model="it.body" maxlength="8000" rows="12" placeholder="## С чего начать&#10;- Первый пункт&#10;> Важный совет" /></label>
          <div class="two">
            <label class="f">Главное <span class="note">до 8 пунктов, каждый с новой строки</span><textarea v-model="it.key" rows="4" /></label>
            <label class="f">Минут чтения <span class="note">пусто — посчитаем сами</span><input v-model="it.minutes" type="text" inputmode="numeric"></label>
          </div>
          <div class="qedit">
            <b>Вопрос для самопроверки <span class="note">необязательно; урок засчитается после верного ответа</span></b>
            <input v-model="it.cq" type="text" maxlength="300" placeholder="Текст вопроса">
            <div class="two">
              <label class="f">Варианты <span class="note">каждый с новой строки, 2–5</span><textarea v-model="it.copts" rows="3" /></label>
              <div class="fcol">
                <label class="f">Правильный<select v-model.number="it.cans"><option v-for="(o, oi) in lines(it.copts)" :key="oi" :value="oi">{{ oi + 1 }}. {{ o }}</option></select></label>
                <label class="f">Пояснение<input v-model="it.cexp" type="text" maxlength="300"></label>
              </div>
            </div>
          </div>
        </template>

        <template v-else-if="it.type === 'video'">
          <label class="f">Ссылка на YouTube <span class="note">необязательно — без видео будет текстовый урок</span><input v-model="it.video" type="text" placeholder="https://www.youtube.com/watch?v=..."></label>
          <label class="f">Текст урока / конспект<textarea v-model="it.text" maxlength="4000" rows="6" /></label>
        </template>

        <template v-else-if="it.type === 'quiz'">
          <div v-for="(q, qi) in it.questions" :key="q._k" class="qedit">
            <div class="ehead"><b>Вопрос {{ qi + 1 }}</b><span class="spacer" />
              <button class="iconbtn sm" type="button" :disabled="it.questions.length === 1" aria-label="Удалить вопрос" @click="it.questions.splice(qi, 1)"><Icon name="trash" /></button>
            </div>
            <input v-model="q.q" type="text" placeholder="Текст вопроса" maxlength="300">
            <div class="two">
              <label class="f">Варианты ответа <span class="note">каждый с новой строки</span><textarea v-model="q.options" rows="4" /></label>
              <div class="fcol">
                <label class="f">Правильный ответ<select v-model.number="q.answer"><option v-for="(o, oi) in optList(q)" :key="oi" :value="oi">{{ oi + 1 }}. {{ o }}</option></select></label>
                <label class="f">Пояснение <span class="note">показывается после ответа</span><input v-model="q.explain" type="text" maxlength="300"></label>
              </div>
            </div>
          </div>
          <button class="btn ghost sm" type="button" style="align-self:flex-start" @click="it.questions.push(newQ())"><Icon name="plus" />Вопрос</button>
        </template>

        <label v-else-if="it.kind === 'match'" class="f">Пары <span class="note">каждая с новой строки в виде «понятие — значение», 3–10 пар</span>
          <textarea v-model="it.pairs" rows="6" placeholder="Ожог — Охладить проточной водой" /></label>
        <label v-else class="f">Шаги в правильном порядке <span class="note">каждый с новой строки, 3–10 шагов; ученик увидит их перемешанными</span>
          <textarea v-model="it.steps" rows="6" /></label>
      </div>
    </div>

    <div class="addrow">
      <span class="note">Добавить:</span>
      <button class="btn ghost sm" type="button" @click="add('lesson')"><Icon name="book" />Урок</button>
      <button class="btn ghost sm" type="button" @click="add('video')"><Icon name="play" />Видеоурок</button>
      <button class="btn ghost sm" type="button" @click="add('quiz')"><Icon name="quiz" />Тест</button>
      <button class="btn ghost sm" type="button" @click="add('match')"><Icon name="game" />Игра «Пары»</button>
      <button class="btn ghost sm" type="button" @click="add('order')"><Icon name="game" />Игра «Порядок»</button>
    </div>
    <p v-if="err" class="formerr" role="alert">{{ err }}</p>
    <div class="addrow">
      <button class="btn" :disabled="busy"><Icon name="check" />Сохранить курс</button>
      <button class="btn ghost" type="button" @click="emit('close')">Отмена</button>
    </div>
  </form>
</template>
