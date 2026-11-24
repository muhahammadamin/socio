<script setup>
import { computed } from 'vue';
import { S } from '../../store.js';
import { ago, finishedAt } from '../../util.js';
import { useOpenRequest, reqPins } from '../../composables.js';
import Icon from '../../components/Icon.vue';
import CityMap from '../../components/CityMap.vue';
import TaskCard from '../../components/TaskCard.vue';
import { PageHead, Tile, Empty } from '../../components/ui.js';

const open = useOpenRequest();
const active = computed(() => S.reqs.filter((r) => r.status !== 'done'));
const done = computed(() => S.reqs.filter((r) => r.status === 'done').sort((a, b) => finishedAt(b) - finishedAt(a)).slice(0, 4));
</script>

<template>
  <PageHead :title="`Привет, ${S.me.name.split(' ')[0]}!`" sub="Спасибо, что помогаете людям!" />
  <div v-if="!S.me.verified" class="card infocard" style="margin-bottom:16px">
    <Icon name="info" :size="22" />
    <div><b>Профиль ждёт проверки</b>
      <p>Координатор позвонит вам на {{ S.me.phone }}, чтобы познакомиться. После подтверждения вам начнут назначать заявки. А пока пройдите курсы в <RouterLink to="/academy">Академии</RouterLink> — за них тоже начисляются коины.</p></div>
  </div>
  <div class="tiles">
    <Tile color="blue" icon="check" label="Выполнено задач" :value="S.me.done" sub="всего" />
    <Tile color="purple" icon="star" label="Рейтинг" :value="S.me.rating ? S.me.rating.toFixed(1) + ' ★' : '—'" :sub="`${S.me.ratingCount} оценок`" />
    <Tile color="green" icon="heart" label="Помог людям" :value="S.me.helped" sub="человек" />
    <RouterLink to="/helper/coins" style="text-decoration:none;color:inherit"><Tile color="orange" icon="coin" label="Коины" :value="S.me.coins" sub="обменять на скидку в такси →" /></RouterLink>
  </div>
  <div class="grid2">
    <div class="card">
      <div class="ch"><h2>Мои текущие заявки</h2><RouterLink class="link" to="/helper/tasks">Все заявки <Icon name="arrow" /></RouterLink></div>
      <template v-if="active.length"><TaskCard v-for="r in active" :key="r.id" :req="r" /></template>
      <Empty v-else title="Сейчас заданий нет" :text="S.me.avail ? 'Когда администратор назначит заявку, она появится здесь.' : 'Вы отметили, что недоступны. Включите приём заявок в профиле.'" />
    </div>
    <div class="stack">
      <div class="card"><div class="ch"><h2>Карта</h2><button class="btn ghost sm" type="button" @click="S.mapOpen = true">Открыть карту</button></div><CityMap :pins="reqPins(active)" @open="open" /></div>
      <div class="card">
        <div class="ch"><h2>Последние действия</h2></div>
        <div v-if="done.length" class="rows">
          <div v-for="r in done" :key="r.id" class="row">
            <span class="cico" style="--c:var(--p-green)"><Icon name="check" :size="15" /></span>
            <span class="grow"><span class="t wrap">Вы завершили заявку «{{ r.title }}»</span></span><time>{{ ago(finishedAt(r)) }}</time>
          </div>
        </div>
        <Empty v-else title="Пока пусто" text="Завершённые заявки будут здесь." />
      </div>
    </div>
  </div>
</template>
