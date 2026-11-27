<script setup>
import { S, canNotify, askNotify } from '../store.js';
import { DISPATCH } from '@shared/constants.js';
import Icon from './Icon.vue';
import OfferCard from './OfferCard.vue';
import { Empty } from './ui.js';

// Входящие заявки помощника: приходят сами, помощник решает — принять или отказаться.
</script>

<template>
  <div class="card offers" :class="{ has: S.offers.length }">
    <div class="ch">
      <h2>Новые заявки для вас<span v-if="S.offers.length" class="badge inl">{{ S.offers.length }}</span></h2>
      <span class="live" :class="{ on: S.live }" :title="S.live ? 'Заявки приходят сразу' : 'Нет связи — переподключаемся'"><i />{{ S.live ? 'онлайн' : 'нет связи' }}</span>
    </div>
    <button v-if="canNotify() && S.me.avail" class="btn ghost sm" type="button" style="margin-bottom:12px" @click="askNotify"><Icon name="bell" :size="14" />Сообщать о заявках, даже когда вкладка свёрнута</button>
    <template v-if="S.offers.length"><OfferCard v-for="o in S.offers" :key="o.id" :offer="o" /></template>
    <Empty v-else-if="!S.me.verified" title="Профиль ждёт проверки" text="После звонка координатора заявки начнут приходить сюда автоматически." />
    <Empty v-else-if="!S.me.avail" title="Приём заявок выключен" text="Включите «Готов принимать заявки» в профиле — и новые заявки рядом с вами начнут приходить сюда." />
    <Empty v-else title="Новых заявок пока нет" :text="`Как только кто-то в вашем районе попросит о помощи, заявка появится здесь со звуковым сигналом. Если за ${DISPATCH.widenMin} минут её никто не примет — она придёт помощникам всего города.`" />
  </div>
</template>
