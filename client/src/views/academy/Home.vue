<script setup>
import { computed, onMounted, ref } from 'vue';
import { L, loadLearn, doneCount, totalPoints, levelOf, isDone } from '../../learn.js';
import { siteUser } from '../../authflow.js';
import { plural } from '../../util.js';
import { COINS } from '@shared/constants.js';
import Icon from '../../components/Icon.vue';
import AcademyBar from '../../components/AcademyBar.vue';

const err = ref('');
onMounted(() => loadLearn().catch((e) => { err.value = e.message; }));
const me = computed(() => siteUser());

const points = computed(() => totalPoints());
const level = computed(() => levelOf(points.value));
const levelPct = computed(() => level.value.next ? Math.round(((points.value - level.value.from) / (level.value.next.at - level.value.from)) * 100) : 100);
const finished = computed(() => L.courses.filter((c) => c.items.length && doneCount(c) === c.items.length).length);

const count = (c, type) => c.items.filter((it) => it.type === type).length;
const contents = (c) => [
  [count(c, 'video'), ['урок', 'урока', 'уроков']],
  [count(c, 'quiz'), ['тест', 'теста', 'тестов']],
  [count(c, 'game'), ['игра', 'игры', 'игр']],
].filter(([n]) => n).map(([n, f]) => plural(n, f)).join(' · ');
const nextItem = (c) => c.items.find((it) => !isDone(c.id, it.id));
const thumb = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
</script>

<template>
  <div class="site academy">
    <AcademyBar />
    <section class="lhero learnhero">
      <div class="wrap">
        <div>
          <span class="kicker"><Icon name="book" :size="15" />Платформа для студентов</span>
          <h1>Учитесь <em>помогать</em> правильно</h1>
          <p>Короткие видео, курсы, тесты и игры: первая помощь, общение с пожилыми, защита от мошенников. За каждый пройденный курс — {{ COINS.courseDone }} коинов, их можно обменять на скидки в Яндекс Такси.</p>
          <div class="ctas">
            <RouterLink class="btn light lg" to="/academy/shorts"><Icon name="play" :size="18" />Смотреть короткие видео</RouterLink>
            <RouterLink v-if="!me" class="btn ghost lg" to="/register/student">Зарегистрироваться</RouterLink>
          </div>
        </div>
        <div class="mycard">
          <div class="lvl">
            <span class="ti"><Icon name="trophy" /></span>
            <div><small>Ваш уровень</small><b>{{ level.name }}</b></div>
            <div class="pts"><b class="num">{{ points }}</b><small>баллов</small></div>
          </div>
          <div class="trk" role="progressbar" :aria-valuenow="levelPct" aria-valuemin="0" aria-valuemax="100"><div class="fill" :style="{ width: levelPct + '%' }" /></div>
          <p class="note">{{ level.next ? `До уровня «${level.next.name}» — ${level.next.at - points} баллов` : 'Максимальный уровень!' }} · Пройдено курсов: {{ finished }} из {{ L.courses.length }}</p>
          <p v-if="L.loaded && L.guest" class="guestnote">
            Вы учитесь как гость — прогресс хранится только в этом браузере.
            <RouterLink to="/register/student">Зарегистрируйтесь</RouterLink>, чтобы получать коины и попасть в рейтинг.
          </p>
          <p v-else-if="me" class="note">Прогресс сохраняется в аккаунте {{ me.name.split(' ')[0] }}.</p>
        </div>
      </div>
    </section>

    <div class="wrap" style="padding-bottom:64px">
      <p v-if="err" class="formerr" style="margin-top:24px">{{ err }}</p>

      <section v-if="L.shorts?.length" class="shortsrow">
        <div class="ch"><h2 class="sech" style="margin:0">Короткие видео</h2><RouterLink class="link" to="/academy/shorts">Смотреть все <Icon name="arrow" /></RouterLink></div>
        <div class="strip">
          <RouterLink v-for="s in L.shorts.slice(0, 8)" :key="s.id" class="scard" :to="{ path: '/academy/shorts', query: { v: s.id } }">
            <img :src="thumb(s.video)" alt="" loading="lazy">
            <span class="play"><Icon name="play" /></span>
            <span class="cap"><small v-if="s.topic">{{ s.topic }}</small>{{ s.title }}</span>
          </RouterLink>
        </div>
      </section>

      <h2 class="sech">Курсы</h2>
      <div class="learngrid" style="margin-top:0">
        <div class="courses">
          <RouterLink v-for="c in L.courses" :key="c.id" class="course" :to="`/academy/course/${c.id}`" :style="{ '--c': c.color }">
            <div class="ctop">
              <span class="cico"><Icon :name="c.icon" /></span>
              <span v-if="c.items.length && doneCount(c) === c.items.length" class="pill green">Пройден</span>
            </div>
            <b>{{ c.title }}</b>
            <p>{{ c.descr }}</p>
            <span class="note">{{ contents(c) || 'Материалы скоро появятся' }}</span>
            <div class="trk"><div class="fill" :style="{ width: (c.items.length ? doneCount(c) / c.items.length * 100 : 0) + '%' }" /></div>
            <span class="go">{{ !doneCount(c) ? 'Начать курс' : nextItem(c) ? `Продолжить: ${doneCount(c)} из ${c.items.length}` : 'Повторить' }}<Icon name="arrow" /></span>
          </RouterLink>
          <p v-if="L.loaded && !L.courses.length" class="empty"><b>Курсов пока нет</b>Скоро здесь появятся первые уроки.</p>
        </div>
        <aside class="card leaders">
          <div class="ch"><h2>Лучшие ученики</h2><Icon name="trophy" /></div>
          <ol v-if="L.leaders.length">
            <li v-for="(p, i) in L.leaders" :key="i"><span class="place" :class="'p' + (i + 1)">{{ i + 1 }}</span><b>{{ p.name }}</b><span class="num">{{ p.points }}</span></li>
          </ol>
          <p v-else class="note">Пройдите первый урок — и окажетесь здесь.</p>
          <div class="howpts">
            <b>Как начисляются баллы</b>
            <span><Icon name="play" />Видеоурок — {{ L.points.video }}</span>
            <span><Icon name="quiz" />Тест — до {{ L.points.quiz }}</span>
            <span><Icon name="game" />Игра — до {{ L.points.game }}</span>
            <span><Icon name="coin" />Курс целиком — {{ COINS.courseDone }} коинов</span>
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>
