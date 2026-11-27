<script setup>
import { computed, ref } from 'vue';
import { S, act, catOf } from '../store.js';
import { km, ago, plural } from '../util.js';
import { DISPATCH } from '@shared/constants.js';
import Icon from './Icon.vue';
import DeclineButton from './DeclineButton.vue';

// Заявка, которая пришла помощнику автоматически. Телефон и точный адрес откроются после «Принять».
const props = defineProps({ offer: { type: Object, required: true } });
const c = computed(() => catOf(props.offer.cat));
const dist = computed(() => km(S.me.dist, props.offer));
const busyLimit = computed(() => S.reqs.filter((r) => r.status !== 'done').length >= DISPATCH.maxActive);
const DUE = { 1: 'нужно сегодня', 2: 'в течение 2 дней', 3: 'в течение 3 дней', 7: 'на этой неделе' };
const busy = ref(false);
async function accept() {
  busy.value = true;
  try { await act((api) => api.post(`/requests/${props.offer.id}/accept`), 'Заявка ваша! Позвоните человеку, чтобы договориться'); }
  catch { /* тост */ } finally { busy.value = false; }
}
</script>

<template>
  <article class="hcard offer" :class="{ urgent: offer.due === 1 }">
    <div class="big" :style="{ '--c': c.color }"><Icon :name="c.icon" :size="30" /></div>
    <div>
      <div class="otop">
        <h3>{{ offer.title }}</h3>
        <span class="pill" :class="offer.nearby ? 'green' : 'blue'">{{ offer.nearby ? 'В вашем районе' : 'Рядом' }}</span>
        <span v-if="offer.due === 1" class="pill orange">Срочно</span>
      </div>
      <p class="d">{{ offer.desc }}</p>
      <div class="meta">
        <span><Icon name="pin" :size="14" />{{ offer.dist }}<template v-if="dist"> · ~{{ dist }} км</template></span>
        <span><Icon name="clock" :size="14" />{{ DUE[offer.due] || DUE[3] }}</span>
        <span><Icon name="user" :size="14" />{{ offer.userName }}</span>
        <span><Icon name="bell" :size="14" />пришла {{ ago(offer.offered) }}</span>
      </div>
      <p class="note">
        <Icon name="lock" :size="13" /> Телефон и адрес откроются, когда вы примете заявку.
        <template v-if="offer.rivals"> Её также видят {{ plural(offer.rivals, ['помощник', 'помощника', 'помощников']) }} — берёт тот, кто примет первым.</template>
      </p>
      <div class="foot">
        <button class="btn green" type="button" :disabled="busy || busyLimit" :title="busyLimit ? `Сначала завершите одну из ${DISPATCH.maxActive} текущих заявок` : null" @click="accept">
          <Icon name="check" :size="16" />Принять
        </button>
        <DeclineButton :req="offer" />
        <span v-if="busyLimit" class="note">У вас уже {{ DISPATCH.maxActive }} заявки в работе — завершите одну, чтобы взять новую.</span>
      </div>
    </div>
  </article>
</template>
