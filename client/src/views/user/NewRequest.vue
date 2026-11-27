<script setup>
import { computed, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { S, act } from '../../store.js';
import { DISTRICTS, DISTRICT_NAMES, nearestDistrict } from '@shared/constants.js';
import Icon from '../../components/Icon.vue';
import CityMap from '../../components/CityMap.vue';
import { PageHead } from '../../components/ui.js';
import PhoneInput from '../../components/PhoneInput.vue';

const router = useRouter();
const home = DISTRICTS[S.me.dist] || DISTRICTS[DISTRICT_NAMES[0]];
// по умолчанию — первая сфера, которую человек отметил при регистрации
const f = reactive({ catId: S.cats.find((c) => S.me.needs?.includes(c.id))?.id ?? S.cats[0]?.id, title: '', desc: '', due: 3, phone: S.me.phone, dist: S.me.dist || DISTRICT_NAMES[0], addr: '', x: home[0], y: home[1] });
const err = ref(''), busy = ref(false);
const cat = computed(() => S.cats.find((c) => c.id === f.catId));

function pick({ x, y }) { f.x = x; f.y = y; f.dist = nearestDistrict(x, y); }
function onDist() { [f.x, f.y] = DISTRICTS[f.dist]; }

async function submit() {
  err.value = '';
  busy.value = true;
  try {
    await act((api) => api.post('/requests', f), (r) => r.sent ? `Заявка отправлена помощникам рядом (${r.sent}). Ждите звонка` : 'Заявка отправлена. Координатор подберёт помощника');
    router.push('/app/requests');
  } catch (e) { err.value = e.message; }
  finally { busy.value = false; }
}
</script>

<template>
  <PageHead title="Получить помощь" sub="Опишите ситуацию. Администратор подберёт помощника из вашего района." />
  <form class="card" novalidate @submit.prevent="submit">
    <div class="formgrid">
      <div class="fcol">
        <div>
          <div id="catlbl" style="font-weight:700;font-size:13px;margin-bottom:8px">Категория</div>
          <div class="chips" role="group" aria-labelledby="catlbl" style="margin:0">
            <button v-for="c in [...S.cats].sort((a, b) => (S.me.needs?.includes(b.id) ? 1 : 0) - (S.me.needs?.includes(a.id) ? 1 : 0))" :key="c.id" type="button" class="chip cat" :style="{ '--c': c.color }" :aria-pressed="f.catId === c.id" @click="f.catId = c.id">{{ c.name }}</button>
          </div>
          <div v-if="cat" class="cathint" :style="{ '--c': cat.color }">
            <p>{{ cat.descr }}</p>
            <p v-if="cat.examples.length" class="note">Например: {{ cat.examples.slice(0, 3).join('; ').toLowerCase() }}.</p>
            <RouterLink to="/categories" target="_blank" class="link"><Icon name="info" />Подробнее о категориях</RouterLink>
          </div>
        </div>
        <label class="f">Что нужно<input v-model="f.title" type="text" maxlength="80" placeholder="Например, купить продукты" autocomplete="off"></label>
        <label class="f">Опишите ситуацию<textarea v-model="f.desc" maxlength="500" placeholder="Что случилось и какая помощь нужна" /></label>
        <div class="two">
          <label class="f">Когда нужна помощь
            <select v-model.number="f.due"><option :value="1">Сегодня</option><option :value="2">В течение 2 дней</option><option :value="3">В течение 3 дней</option><option :value="7">На этой неделе</option></select>
          </label>
          <label class="f">Телефон для связи<PhoneInput v-model="f.phone" autocomplete="tel" /></label>
        </div>
      </div>
      <div class="fcol">
        <label class="f">Район<select v-model="f.dist" @change="onDist"><option v-for="d in DISTRICT_NAMES" :key="d">{{ d }}</option></select></label>
        <label class="f">Адрес<input v-model="f.addr" type="text" placeholder="Улица, дом, ориентир" autocomplete="street-address"></label>
        <div>
          <div style="font-weight:700;font-size:13px;margin-bottom:8px">Ваша локация</div>
          <CityMap :pins="[{ x: f.x, y: f.y, t: 'Вы здесь', c: 'var(--p-blue)' }]" labels pick @pick="pick" />
          <p class="note" style="margin-top:8px">Нажмите на карту, чтобы уточнить точку. Район: <b>{{ f.dist }}</b>.</p>
        </div>
        <p v-if="err" class="formerr" role="alert">{{ err }}</p>
        <button class="btn" :disabled="busy"><Icon name="pin" :size="16" />Отправить заявку</button>
      </div>
    </div>
  </form>
</template>
