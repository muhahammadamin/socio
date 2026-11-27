<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { S, toast, load } from '../../store.js';
import { L, loadLearn, complete, isDone, scoreOf, doneCount, typeIcon, typeLabel, PASS } from '../../learn.js';
import Icon from '../../components/Icon.vue';
import AcademyBar from '../../components/AcademyBar.vue';
import VideoLesson from '../../components/learn/VideoLesson.vue';
import LessonReader from '../../components/learn/LessonReader.vue';
import { confetti } from '../../fx.js';
import QuizRunner from '../../components/learn/QuizRunner.vue';
import MatchGame from '../../components/learn/MatchGame.vue';
import OrderGame from '../../components/learn/OrderGame.vue';

const route = useRoute(), router = useRouter();
const err = ref('');
onMounted(() => { if (!L.loaded) loadLearn().catch((e) => { err.value = e.message; }); });

const course = computed(() => L.courses.find((c) => c.id === Number(route.params.id)));
const idx = computed(() => {
  const c = course.value;
  if (!c?.items.length) return -1;
  const i = c.items.findIndex((it) => it.id === route.query.i);
  if (i >= 0) return i;
  const first = c.items.findIndex((it) => !isDone(c.id, it.id));
  return first >= 0 ? first : 0;
});
const item = computed(() => course.value?.items[idx.value]);
const next = computed(() => course.value?.items[idx.value + 1]);
const open = (it) => router.replace({ query: { i: it.id } });
watch(() => route.query.i, () => document.querySelector('.lmain')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
watch(course, (c) => { if (c) document.title = `${c.title} · Socio`; }, { immediate: true });

const justDone = ref(false);
watch(item, () => { justDone.value = false; });
async function onDone(score, quizCoins = 0) {
  const c = course.value, it = item.value;
  // у теста результат уже записан при проверке, поэтому «первый раз» считаем по прошлому баллу
  const first = it.type === 'quiz' ? true : !isDone(c.id, it.id);
  try {
    const coins = it.type === 'quiz' ? quizCoins : (await complete(c.id, it.id, score)).coins;
    justDone.value = true;
    if (coins) {
      confetti();
      toast(`Курс «${c.title}» пройден! +${coins} коинов 🎉`);
      if (S.me) load().catch(() => {});
    } else if (doneCount(c) === c.items.length && first) { confetti(); toast(`Курс «${c.title}» пройден! 🎉`); }
    else if (first && score >= PASS) toast(`+${Math.round((L.points[it.type] || 0) * score)} баллов`);
  } catch (e) { toast(e.message, true); }
}
const pct = (cid, iid) => Math.round((scoreOf(cid, iid) || 0) * 100);
</script>

<template>
  <div class="site academy">
    <AcademyBar />
    <div class="wrap" style="padding-top:22px;padding-bottom:64px">
      <RouterLink to="/academy" class="link"><Icon name="back" />Все курсы</RouterLink>
      <p v-if="err" class="formerr" style="margin-top:16px">{{ err }}</p>
      <div v-else-if="L.loaded && !course" class="card empty" style="margin-top:16px"><b>Курс не найден</b>Возможно, его удалили. <RouterLink to="/academy">К списку курсов</RouterLink></div>

      <template v-else-if="course">
        <div class="chead" :style="{ '--c': course.color }">
          <span class="cico"><Icon :name="course.icon" /></span>
          <div class="grow">
            <h1>{{ course.title }}</h1>
            <p>{{ course.descr }}</p>
          </div>
          <div class="cprog ring" :style="{ '--p': course.items.length ? doneCount(course) / course.items.length * 100 : 0 }"><b class="num">{{ doneCount(course) }}/{{ course.items.length }}</b><small>пройдено</small></div>
        </div>

        <div v-if="!course.items.length" class="card empty"><b>Материалы скоро появятся</b>Загляните сюда чуть позже.</div>
        <div v-else class="lesson">
          <nav class="card steps-nav" aria-label="Материалы курса">
            <button v-for="(it, i) in course.items" :key="it.id" type="button" class="lstep" :class="{ cur: i === idx, done: isDone(course.id, it.id) }" :aria-current="i === idx ? 'step' : null" @click="open(it)">
              <span class="li"><Icon :name="isDone(course.id, it.id) ? 'check' : typeIcon(it)" /></span>
              <span class="grow"><small>{{ typeLabel(it) }}</small>{{ it.title }}</span>
              <span v-if="!['video', 'lesson'].includes(it.type) && scoreOf(course.id, it.id) !== undefined" class="num note">{{ pct(course.id, it.id) }}%</span>
            </button>
          </nav>

          <Transition name="slide" mode="out-in">
          <section v-if="item" :key="item.id" class="card lmain">
            <div class="ch">
              <div><small class="kind"><Icon :name="typeIcon(item)" />{{ typeLabel(item) }} · {{ idx + 1 }} из {{ course.items.length }}</small><h2>{{ item.title }}</h2></div>
            </div>
            <LessonReader v-if="item.type === 'lesson'" :item="item" :done="isDone(course.id, item.id)" @done="onDone" />
            <VideoLesson v-else-if="item.type === 'video'" :item="item" :done="isDone(course.id, item.id)" @done="onDone" />
            <QuizRunner v-else-if="item.type === 'quiz'" :item="item" :course-id="course.id" @done="onDone" />
            <MatchGame v-else-if="item.kind === 'match'" :item="item" @done="onDone" />
            <OrderGame v-else-if="item.kind === 'order'" :item="item" @done="onDone" />

            <div v-if="justDone || isDone(course.id, item.id)" class="nextrow">
              <button v-if="next" class="btn" type="button" @click="open(next)">Дальше: {{ next.title }}<Icon name="arrow" /></button>
              <RouterLink v-else class="btn green" to="/academy"><Icon name="trophy" />К другим курсам</RouterLink>
            </div>
          </section>
          </Transition>
        </div>
      </template>
    </div>
  </div>
</template>
