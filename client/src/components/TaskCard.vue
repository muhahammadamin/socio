<script setup>
import { computed } from 'vue';
import { S, catOf } from '../store.js';
import { km, dueText, telHref } from '../util.js';
import { useOpenRequest } from '../composables.js';
import Icon from './Icon.vue';
import TaskActions from './TaskActions.vue';
import { StatusPill } from './ui.js';

const props = defineProps({ req: { type: Object, required: true } });
const c = computed(() => catOf(props.req.cat));
const dist = computed(() => km(S.me.dist, props.req));
const open = useOpenRequest();
</script>

<template>
  <article class="hcard">
    <div class="big" :style="{ '--c': c.color }"><Icon :name="c.icon" :size="30" /></div>
    <div>
      <div style="display:flex;gap:10px;align-items:flex-start;justify-content:space-between;flex-wrap:wrap">
        <h3>{{ req.title }}</h3><StatusPill :status="req.status" />
      </div>
      <p class="d">{{ req.desc }}</p>
      <div class="meta">
        <span><Icon name="pin" :size="14" />{{ req.dist }}, {{ req.addr }}<template v-if="dist"> · {{ dist }} км</template></span>
        <span><Icon name="clock" :size="14" />{{ dueText(req) }}</span>
        <span><Icon name="user" :size="14" />{{ req.userName }}</span>
        <a :href="telHref(req.phone)"><Icon name="phone" :size="14" />{{ req.phone }}</a>
      </div>
      <div class="foot">
        <TaskActions :req="req" />
        <button class="btn ghost" type="button" @click="open(req.id)">Подробнее</button>
      </div>
    </div>
  </article>
</template>
