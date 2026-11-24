<script setup>
import { computed } from 'vue';
import { S } from '../../store.js';
import Icon from '../../components/Icon.vue';
import RequestRow from '../../components/RequestRow.vue';
import { Empty } from '../../components/ui.js';

const my = computed(() => S.reqs.slice(0, 4));
const toRate = computed(() => S.reqs.filter((r) => r.status === 'done' && !r.rating).length);
</script>

<template>
  <div class="hero">
    <span class="bg"><Icon name="heart" :size="230" /></span>
    <h1>Нужна помощь?</h1>
    <p>Мы рядом. Опишите свою ситуацию, и мы найдём помощника!</p>
    <RouterLink class="btn light" to="/app/new"><Icon name="heart" :size="18" />Получить помощь</RouterLink>
  </div>
  <div class="grid2">
    <div class="card">
      <div class="ch"><h2>Мои заявки</h2><RouterLink class="link" to="/app/requests">Все заявки <Icon name="arrow" /></RouterLink></div>
      <div v-if="my.length" class="rows"><RequestRow v-for="r in my" :key="r.id" :req="r" /></div>
      <Empty v-else title="Заявок пока нет" text="Нажмите «Получить помощь», чтобы создать первую." />
    </div>
    <div class="stack">
      <div class="card">
        <div class="ch"><h2>Ваш баланс добра</h2></div>
        <div style="display:flex;align-items:center;gap:12px"><span style="color:#ef4444"><Icon name="heart" :size="40" /></span><b class="num" style="font-size:40px;line-height:1">{{ S.me.balance }}</b></div>
        <div class="note" style="margin-top:6px">Растёт, когда вы благодарите помощника.<template v-if="toRate"> Ждут вашей оценки: {{ toRate }}.</template></div>
      </div>
      <div class="banner"><Icon name="heart" /><div><b>Спасибо, что делаете мир лучше!</b><span>Каждая заявка помогает нам быть полезнее</span></div></div>
    </div>
  </div>
</template>
