<script setup>
import { computed, onMounted, ref } from 'vue';
import { S, toast } from '../../store.js';
import { api } from '../../api.js';
import { L, loadLearn, doneCount, totalPoints, levelOf, isDone, streak, learnedToday, achievements, typeIcon, typeLabel } from '../../learn.js';
import CountUp from '../../components/CountUp.vue';
import { SKILLS, COINS } from '@shared/constants.js';
import Icon from '../../components/Icon.vue';
import { Empty } from '../../components/ui.js';

onMounted(() => loadLearn().catch((e) => toast(e.message, true)));

const points = computed(() => totalPoints());
const level = computed(() => levelOf(points.value));
const started = computed(() => L.courses.filter((c) => doneCount(c) > 0 && doneCount(c) < c.items.length));
const fresh = computed(() => L.courses.filter((c) => !doneCount(c)));
const nextItem = (c) => c.items.find((it) => !isDone(c.id, it.id));
const levelPct = computed(() => level.value.next ? Math.round(((points.value - level.value.from) / (level.value.next.at - level.value.from)) * 100) : 100);
const days = computed(() => streak());
const badges = computed(() => achievements());
const unlocked = computed(() => badges.value.filter((b) => b.on).length);
// «Продолжить»: начатый курс, иначе первый непройденный
const current = computed(() => started.value[0] || fresh.value[0] || null);
// урок дня — меняется раз в сутки, из ещё не пройденных уроков
const lessonOfDay = computed(() => {
  const pool = L.courses.flatMap((c) => c.items.filter((it) => it.type === 'lesson' && !isDone(c.id, it.id)).map((it) => ({ c, it })));
  return pool.length ? pool[Math.floor(Date.now() / 864e5) % pool.length] : null;
});
const pct = (c) => (c.items.length ? Math.round(doneCount(c) / c.items.length * 100) : 0);
const hello = (() => { const h = new Date().getHours(); return h < 6 ? 'Доброй ночи' : h < 12 ? 'Доброе утро' : h < 18 ? 'Добрый день' : 'Добрый вечер'; })();

// заявка «хочу стать помощником»
const APPLIED = 'socio.student.applied';
const applied = ref((() => { try { return localStorage.getItem(APPLIED) === String(S.me.id); } catch { return false; } })());
const skills = ref([]), showApply = ref(false), busy = ref(false);
const toggle = (k) => { skills.value = skills.value.includes(k) ? skills.value.filter((x) => x !== k) : [...skills.value, k]; };
async function apply() {
  busy.value = true;
  try {
    await api.post('/students/apply', { skills: skills.value });
    try { localStorage.setItem(APPLIED, String(S.me.id)); } catch { /* ничего */ }
    applied.value = true; showApply.value = false;
    toast('Заявка отправлена координатору');
  } catch (e) { toast(e.message, true); }
  finally { busy.value = false; }
}
</script>

<template>
  <section class="sthero">
    <span class="blob b1" /><span class="blob b2" /><span class="blob b3" />
    <div class="sthero-in">
      <div class="st-hi">
        <small class="kick">{{ hello }}</small>
        <h1>{{ S.me.name.split(' ')[0] }}, <em>продолжим?</em></h1>
        <p>{{ S.me.school }}</p>
        <div class="st-chips">
          <span class="stchip flame" :class="{ lit: learnedToday() }" :title="learnedToday() ? 'Сегодня вы уже учились' : 'Пройдите материал сегодня, чтобы не прервать серию'">
            <span class="fl">🔥</span><b class="num">{{ days }}</b>{{ days === 1 ? 'день' : days >= 2 && days <= 4 ? 'дня' : 'дней' }} подряд
          </span>
          <RouterLink class="stchip" to="/student/coins"><Icon name="coin" /><b class="num"><CountUp :value="S.me.coins" /></b>коинов</RouterLink>
          <span class="stchip"><Icon name="trophy" /><b class="num">{{ unlocked }}/{{ badges.length }}</b>наград</span>
        </div>
      </div>
      <div class="st-ring" :style="{ '--p': levelPct }" role="img" :aria-label="`Уровень ${level.name}, ${points} баллов`">
        <svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" class="bg" /><circle cx="60" cy="60" r="52" class="fg" pathLength="100" /></svg>
        <div><b class="num"><CountUp :value="points" /></b><small>баллов</small><span>{{ level.name }}</span></div>
      </div>
    </div>
    <p v-if="level.next" class="st-next">До уровня «{{ level.next.name }}» — {{ level.next.at - points }} баллов</p>
  </section>

  <div class="stgrid">
    <RouterLink v-if="current" v-reveal class="continue" :to="`/academy/course/${current.id}`" :style="{ '--c': current.color }">
      <span class="cico big"><Icon :name="current.icon" /></span>
      <div class="grow">
        <small>{{ doneCount(current) ? 'Продолжить курс' : 'Начните первый курс' }}</small>
        <b>{{ current.title }}</b>
        <span v-if="nextItem(current)" class="nx"><Icon :name="typeIcon(nextItem(current))" :size="14" />{{ typeLabel(nextItem(current)) }}: {{ nextItem(current).title }}</span>
        <div class="trk"><div class="fill shimmer" :style="{ width: pct(current) + '%' }" /></div>
      </div>
      <span class="playbtn"><Icon name="play" /></span>
    </RouterLink>
    <div v-else-if="L.loaded" v-reveal class="card continue done"><Icon name="trophy" :size="34" /><div><b>Все курсы пройдены! 🎉</b><span class="note">Новые курсы появятся здесь.</span></div></div>

    <RouterLink v-if="lessonOfDay" v-reveal="1" class="lod" :to="{ path: `/academy/course/${lessonOfDay.c.id}`, query: { i: lessonOfDay.it.id } }">
      <small><Icon name="book" :size="14" />Урок дня · {{ lessonOfDay.it.minutes || 3 }} мин</small>
      <b>{{ lessonOfDay.it.title }}</b>
      <span>из курса «{{ lessonOfDay.c.title }}» · +{{ L.points.lesson ?? 5 }} баллов</span>
      <span class="go">Читать <Icon name="arrow" /></span>
    </RouterLink>
  </div>

  <h2 class="sech" v-reveal>Мои курсы</h2>
  <div class="stcourses">
    <RouterLink v-for="(c, i) in L.courses" :key="c.id" v-reveal="i % 4" class="stc" :to="`/academy/course/${c.id}`" :style="{ '--c': c.color, '--p': pct(c) }">
      <span class="mini-ring"><span class="cico"><Icon :name="c.icon" /></span></span>
      <b>{{ c.title }}</b>
      <span class="note">{{ pct(c) === 100 ? 'Пройден ✓' : doneCount(c) ? `${doneCount(c)} из ${c.items.length}` : `${c.items.length} материалов` }}</span>
    </RouterLink>
  </div>

  <h2 class="sech" v-reveal>Награды</h2>
  <div class="badges">
    <div v-for="(b, i) in badges" :key="b.id" v-reveal="i % 4" class="badge-c" :class="{ on: b.on }" :title="b.d">
      <span class="bi"><Icon :name="b.icon" /></span><b>{{ b.t }}</b><small>{{ b.d }}</small>
    </div>
  </div>

  <div class="grid2" style="margin-top:22px">
    <RouterLink v-reveal class="banner" to="/student/coins" style="text-decoration:none">
      <Icon name="trophy" />
      <div><b>Обменяйте коины на награды</b><span>Сертификат волонтёра для резюме, пополнение связи, мерч. У вас {{ S.me.coins }} коинов.</span></div>
    </RouterLink>
    <div v-reveal="1" class="card">
      <div class="ch"><h2>Хотите помогать людям?</h2></div>
      <p v-if="applied" class="note">Заявка отправлена. Координатор свяжется с вами по телефону {{ S.me.phone }}.</p>
      <template v-else-if="!showApply">
        <p class="note" style="margin-bottom:12px">Пройдите курсы «Основы волонтёрства» и «Первая помощь», а затем станьте помощником — за каждую выполненную заявку начисляется {{ COINS.requestDone }} коинов. Или зарегистрируйтесь волонтёром с этим же номером — аккаунты будут отдельными.</p>
        <button class="btn" type="button" @click="showApply = true"><Icon name="hand" />Хочу стать помощником</button>
      </template>
      <div v-else class="fcol">
        <span class="note">В каких направлениях можете помогать?</span>
        <div class="chips" style="margin:0">
          <button v-for="(label, k) in SKILLS" :key="k" type="button" class="chip" :aria-pressed="skills.includes(k)" @click="toggle(k)">{{ label }}</button>
        </div>
        <div class="addrow">
          <button class="btn" type="button" :disabled="busy || !skills.length" @click="apply">Отправить заявку</button>
          <button class="btn ghost" type="button" @click="showApply = false">Отмена</button>
        </div>
      </div>
    </div>
  </div>
</template>
