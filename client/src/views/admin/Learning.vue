<script setup>
import { onMounted, reactive, ref } from 'vue';
import { api } from '../../api.js';
import { toast } from '../../store.js';
import { ICONS } from '@shared/constants.js';
import { plural } from '../../util.js';
import Icon from '../../components/Icon.vue';
import { PageHead, Empty } from '../../components/ui.js';
import CourseEditor from '../../components/learn/CourseEditor.vue';

const courses = ref([]), editing = ref(null), loaded = ref(false);
const f = reactive({ title: '', icon: 'star' }), busy = ref(false);

const shorts = ref([]), sf = reactive({ title: '', video: '', topic: '' });
const load = () => api.get('/learn/admin').then((d) => { courses.value = d.courses; shorts.value = d.shorts; loaded.value = true; }).catch((e) => toast(e.message, true));
async function addShort() {
  try { await api.post('/shorts', sf); Object.assign(sf, { title: '', video: '' }); toast('Видео добавлено'); load(); }
  catch (e) { toast(e.message, true); }
}
async function delShort(s) {
  if (!confirm(`Удалить видео «${s.title}»?`)) return;
  try { await api.del(`/shorts/${s.id}`); load(); } catch (e) { toast(e.message, true); }
}
onMounted(load);

async function create() {
  busy.value = true;
  try {
    const { id } = await api.post('/courses', f);
    f.title = '';
    await load();
    editing.value = courses.value.find((c) => c.id === id) || null;
  } catch (e) { toast(e.message, true); }
  finally { busy.value = false; }
}
async function del(c) {
  if (!confirm(`Удалить курс «${c.title}» со всеми материалами и прогрессом учеников?`)) return;
  try { await api.del(`/courses/${c.id}`); toast('Курс удалён'); if (editing.value?.id === c.id) editing.value = null; load(); }
  catch (e) { toast(e.message, true); }
}
const onSaved = () => { editing.value = null; load(); };
const count = (c, t) => c.items.filter((it) => it.type === t).length;
</script>

<template>
  <PageHead title="Обучение" sub="Курсы учебного центра для студентов и волонтёров: видеоуроки, тесты и игры.">
    <RouterLink class="btn ghost" to="/academy" target="_blank"><Icon name="book" />Открыть академию</RouterLink>
  </PageHead>

  <CourseEditor v-if="editing" :key="editing.id" :course="editing" style="margin-bottom:16px" @saved="onSaved" @close="editing = null" />

  <form v-else class="card" novalidate style="margin-bottom:16px" @submit.prevent="create">
    <div class="ch"><h2>Новый курс</h2></div>
    <div class="newcourse">
      <label class="f">Название<input v-model="f.title" type="text" maxlength="80" placeholder="Например, Психологическая поддержка"></label>
      <label class="f">Иконка<select v-model="f.icon"><option v-for="i in ICONS" :key="i">{{ i }}</option></select></label>
      <button class="btn" :disabled="busy"><Icon name="plus" />Создать</button>
    </div>
  </form>

  <div class="card">
    <div v-if="courses.length" class="rows">
      <div v-for="c in courses" :key="c.id" class="row">
        <span class="cico" :style="{ '--c': c.color, width: '40px', height: '40px', fontSize: '20px' }"><Icon :name="c.icon" /></span>
        <span class="grow">
          <span class="t">{{ c.title }}</span>
          <span class="s">{{ count(c, 'video') }} видео/уроков · {{ count(c, 'quiz') }} тестов · {{ count(c, 'game') }} игр · {{ plural(c.learners, ['ученик', 'ученика', 'учеников']) }}</span>
        </span>
        <RouterLink class="btn ghost sm" :to="`/academy/course/${c.id}`" target="_blank">Открыть</RouterLink>
        <button class="btn sm" type="button" @click="editing = c"><Icon name="edit" />Редактировать</button>
        <button class="btn red sm" type="button" @click="del(c)">Удалить</button>
      </div>
    </div>
    <Empty v-else-if="loaded" title="Курсов пока нет" text="Создайте первый курс выше." />
  </div>

  <div class="card" style="margin-top:16px">
    <div class="ch"><h2>Короткие видео для студентов</h2><RouterLink class="link" to="/academy/shorts" target="_blank">Открыть ленту <Icon name="arrow" /></RouterLink></div>
    <form class="shortform" novalidate @submit.prevent="addShort">
      <label class="f">Ссылка на YouTube Shorts<input v-model="sf.video" type="text" placeholder="https://youtube.com/shorts/..."></label>
      <label class="f">Название<input v-model="sf.title" type="text" maxlength="100"></label>
      <label class="f">Тема<input v-model="sf.topic" type="text" maxlength="40" placeholder="Первая помощь"></label>
      <button class="btn"><Icon name="plus" />Добавить</button>
    </form>
    <div class="rows" style="margin-top:10px">
      <div v-for="s in shorts" :key="s.id" class="row">
        <img :src="`https://i.ytimg.com/vi/${s.video}/default.jpg`" alt="" width="48" height="36" style="border-radius:6px;object-fit:cover">
        <span class="grow"><span class="t">{{ s.title }}</span><span class="s">{{ s.topic || 'Без темы' }}</span></span>
        <button class="iconbtn sm" type="button" :aria-label="`Удалить ${s.title}`" @click="delShort(s)"><Icon name="trash" /></button>
      </div>
    </div>
  </div>
</template>
