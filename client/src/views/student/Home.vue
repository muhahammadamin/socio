<script setup>
import { computed, onMounted, ref } from 'vue';
import { S, toast } from '../../store.js';
import { api } from '../../api.js';
import { L, loadLearn, doneCount, totalPoints, levelOf, isDone } from '../../learn.js';
import { SKILLS, COINS } from '@shared/constants.js';
import Icon from '../../components/Icon.vue';
import { PageHead, Tile, Empty } from '../../components/ui.js';

onMounted(() => loadLearn().catch((e) => toast(e.message, true)));

const points = computed(() => totalPoints());
const level = computed(() => levelOf(points.value));
const started = computed(() => L.courses.filter((c) => doneCount(c) > 0 && doneCount(c) < c.items.length));
const fresh = computed(() => L.courses.filter((c) => !doneCount(c)));
const nextItem = (c) => c.items.find((it) => !isDone(c.id, it.id));

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
  <PageHead :title="`Привет, ${S.me.name.split(' ')[0]}!`" :sub="S.me.school" />
  <div class="tiles">
    <Tile color="orange" icon="coin" label="Коины" :value="S.me.coins" :sub="`+${COINS.courseDone} за каждый курс`" />
    <Tile color="green" icon="check" label="Пройдено курсов" :value="S.me.coursesDone" :sub="`из ${L.courses.length || '—'}`" />
    <Tile color="purple" icon="trophy" label="Уровень" :value="level.name" :sub="`${points} баллов`" />
  </div>

  <div class="grid2">
    <div class="card">
      <div class="ch"><h2>Продолжить обучение</h2><RouterLink class="link" to="/academy">Все курсы <Icon name="arrow" /></RouterLink></div>
      <div v-if="started.length || fresh.length" class="rows">
        <RouterLink v-for="c in [...started, ...fresh].slice(0, 5)" :key="c.id" class="row" :to="`/academy/course/${c.id}`" style="text-decoration:none;color:inherit">
          <span class="cico" :style="{ '--c': c.color, width: '38px', height: '38px', fontSize: '19px' }"><Icon :name="c.icon" /></span>
          <span class="grow">
            <span class="t">{{ c.title }}</span>
            <span class="s">{{ doneCount(c) ? `${doneCount(c)} из ${c.items.length} · дальше: ${nextItem(c)?.title}` : 'Ещё не начат' }}</span>
          </span>
          <span class="btn sm" :class="doneCount(c) ? '' : 'ghost'">{{ doneCount(c) ? 'Продолжить' : 'Начать' }}</span>
        </RouterLink>
      </div>
      <Empty v-else-if="L.loaded" title="Все курсы пройдены! 🎉" text="Новые курсы появятся здесь." />
    </div>

    <div class="stack">
      <RouterLink class="banner" to="/student/coins" style="text-decoration:none">
        <Icon name="trophy" />
        <div><b>Обменяйте коины на награды</b><span>Сертификат волонтёра для резюме, пополнение связи, мерч. У вас {{ S.me.coins }} коинов.</span></div>
      </RouterLink>
      <div class="card">
        <div class="ch"><h2>Хотите помогать людям?</h2></div>
        <p v-if="applied" class="note">Заявка отправлена. Координатор свяжется с вами по телефону {{ S.me.phone }}.</p>
        <template v-else-if="!showApply">
          <p class="note" style="margin-bottom:12px">Пройдите курсы «Основы волонтёрства» и «Первая помощь», а затем станьте помощником — за каждую выполненную заявку начисляется {{ COINS.requestDone }} коинов.</p>
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
  </div>
</template>
