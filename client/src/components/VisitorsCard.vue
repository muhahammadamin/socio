<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { api } from '../api.js';
import { fday, plural } from '../util.js';
import CountUp from './CountUp.vue';
import Icon from './Icon.vue';
import { toast } from '../store.js';
import { SOURCES, sourceName } from '@shared/constants.js';

// Посетители сайта для администратора: все, кто заходил (не только зарегистрированные). Обновляется раз в минуту.
const V = ref(null), err = ref(''), days = ref(14);
async function load() {
  try { V.value = await api.get(`/admin/visitors?days=${days.value}`); err.value = ''; }
  catch (e) { err.value = e.message; }
}
let timer;
onMounted(() => { load(); timer = setInterval(load, 60e3); });
onBeforeUnmount(() => clearInterval(timer));

const stats = computed(() => V.value && [
  ['users', 'Всего посетителей', V.value.total, 'за всё время'],
  ['plus', 'Новые сегодня', V.value.today, `${V.value.activeToday} заходили сегодня`],
  ['chart', 'За 7 дней', V.value.week, 'новых посетителей'],
  ['clock', 'За 30 дней', V.value.month, `${V.value.returning} возвращались`],
]);

// откуда приходят: посетители и регистрации по источникам за выбранный период
const srcColor = (k) => SOURCES[k]?.color || '#0ea5b7';
const sources = computed(() => {
  const list = V.value?.sources || [];
  const mx = Math.max(1, ...list.map((x) => x.visitors));
  return list.map((x) => ({ ...x, w: Math.max(2, (x.visitors / mx) * 100), conv: x.visitors ? Math.round((x.signups / x.visitors) * 100) : null }));
});

// ссылка с меткой: по ней видно, сколько людей пришло именно из этого поста или канала
const tag = ref('tg'), campaign = ref('');
const TAGS = [['tg', 'Telegram'], ['ig', 'Instagram'], ['fb', 'Facebook'], ['yt', 'YouTube'], ['tt', 'TikTok'], ['wa', 'WhatsApp']];
const link = computed(() => {
  const t = tag.value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  const c = campaign.value.trim();
  return `${location.origin}/${t ? `?ref=${t}` : ''}${t && c ? `&utm_campaign=${encodeURIComponent(c)}` : ''}`;
});
async function copyLink() {
  try { await navigator.clipboard.writeText(link.value); toast('Ссылка скопирована'); }
  catch { toast('Не получилось скопировать — выделите ссылку вручную', true); }
}

// столбики по дням
const W = 560, H = 190, L = 28, B = 24, T = 10;
const chart = computed(() => {
  const list = V.value?.days || [];
  if (!list.length) return null;
  const mx = Math.max(4, ...list.map((d) => d.n)), bw = (W - L) / list.length, step = Math.ceil(list.length / 7);
  const grid = [0, 1, 2, 3, 4].map((i) => ({ v: Math.round((mx * i) / 4), y: H - B - ((H - B - T) * i) / 4 }));
  const bars = list.map((d, k) => {
    const hh = ((H - B - T) * d.n) / mx, x = L + k * bw + bw * 0.2;
    return { ...d, x, w: bw * 0.6, y: H - B - hh, h: hh, label: (list.length - 1 - k) % step === 0 ? fday(new Date(d.ts)) : '' };
  });
  return { grid, bars };
});
</script>

<template>
  <div class="card visitors">
    <div class="ch">
      <h2><Icon name="users" :size="18" /> Посетители сайта</h2>
      <select v-model="days" style="width:auto;font-weight:700" aria-label="Период графика" @change="load">
        <option :value="14">14 дней</option><option :value="30">30 дней</option><option :value="90">90 дней</option>
      </select>
    </div>
    <p v-if="err" class="formerr">{{ err }}</p>
    <template v-else-if="V">
      <div class="vstats">
        <div v-for="s in stats" :key="s[1]" class="vstat">
          <span class="vl"><Icon :name="s[0]" :size="15" />{{ s[1] }}</span>
          <b><CountUp :value="s[2]" /></b>
          <span class="note">{{ s[3] }}</span>
        </div>
      </div>
      <svg v-if="chart" class="chart" :viewBox="`0 0 ${W} ${H}`" role="img" :aria-label="`Новые посетители по дням за ${days} дней`">
        <template v-for="g in chart.grid" :key="'g' + g.y"><line class="gl" :x1="L" :x2="W" :y1="g.y" :y2="g.y" /><text :x="L - 6" :y="g.y + 3" text-anchor="end">{{ g.v }}</text></template>
        <template v-for="b in chart.bars" :key="b.ts">
          <rect v-if="b.n" class="b" :x="b.x.toFixed(1)" :y="b.y.toFixed(1)" :width="b.w.toFixed(1)" :height="b.h.toFixed(1)" rx="4"><title>{{ fday(new Date(b.ts)) }}: {{ plural(b.n, ['новый посетитель', 'новых посетителя', 'новых посетителей']) }}</title></rect>
          <text v-if="b.label" :x="(b.x + b.w / 2).toFixed(1)" :y="H - 6" text-anchor="middle">{{ b.label }}</text>
        </template>
      </svg>
      <p class="note" style="margin-top:6px">Один браузер считается один раз, поисковые роботы не учитываются. Сутки — по времени Ташкента.</p>

      <h3 class="sh"><Icon name="map" :size="16" /> Откуда приходят <span class="note">· за {{ days }} дней</span></h3>
      <div v-if="sources.length" class="srcs">
        <div class="srow srow-h note"><span>Источник</span><span /><span>Посетители</span><span>Регистрации</span></div>
        <div v-for="x in sources" :key="x.source" class="srow">
          <span class="sname"><i :style="{ background: srcColor(x.source) }" />{{ sourceName(x.source) }}
            <small v-if="x.details.length" class="note">{{ x.details.map((d) => d.d).join(', ') }}</small></span>
          <span class="sbar"><b :style="{ width: x.w + '%', background: srcColor(x.source) }" /></span>
          <span class="num"><b>{{ x.visitors }}</b></span>
          <span class="num">{{ x.signups }}<small v-if="x.conv !== null" class="note"> · {{ x.conv }}%</small></span>
        </div>
      </div>
      <p v-else class="note">За этот период данных об источниках пока нет.</p>

      <div class="maker">
        <b>Ссылка с меткой для поста или канала</b>
        <p class="note">Telegram и многие приложения часто не сообщают сайту, откуда пришёл человек. Публикуйте ссылку с меткой: тогда переход точно засчитается этому источнику.</p>
        <div class="mrow">
          <label class="f">Источник
            <input v-model="tag" type="text" list="src-tags" placeholder="tg" autocomplete="off">
            <datalist id="src-tags"><option v-for="[k, t] in TAGS" :key="k" :value="k">{{ t }}</option></datalist>
          </label>
          <label class="f">Название поста (необязательно)<input v-model="campaign" type="text" placeholder="например, osen-2026" autocomplete="off"></label>
        </div>
        <div class="mrow link"><code>{{ link }}</code><button class="btn ghost sm" type="button" @click="copyLink"><Icon name="copy" />Копировать</button></div>
        <p class="note">Свою метку тоже можно: <code>?ref=blogger_ali</code> — в статистике появится «Метка «blogger_ali»».</p>
      </div>
    </template>
    <p v-else class="note">Загрузка…</p>
  </div>
</template>

<style scoped>
.visitors{margin-bottom:18px}
.visitors h2{display:flex;align-items:center;gap:8px}
.vstats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:4px 0 14px}
.vstat{display:flex;flex-direction:column;gap:2px;padding:12px 14px;border-radius:14px;background:color-mix(in srgb,var(--ink) 4%,transparent);box-shadow:inset 0 0 0 1px var(--line)}
.vstat .vl{display:flex;align-items:center;gap:6px;color:var(--muted);font-size:13px;font-weight:700}
.vstat b{font-size:28px;font-weight:800;letter-spacing:-.5px}
.sh{display:flex;align-items:center;gap:8px;margin:18px 0 10px;font-size:16px}
.srcs{display:flex;flex-direction:column;gap:6px}
.srow{display:grid;grid-template-columns:minmax(140px,1.3fr) 2fr 90px 110px;gap:12px;align-items:center}
.srow-h{font-size:12px;font-weight:700}
.sname{display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px;font-weight:700}
.sname i{width:10px;height:10px;border-radius:50%;flex:none}
.sname small{flex-basis:100%;font-weight:400;overflow-wrap:anywhere}
.sbar{height:10px;border-radius:99px;background:color-mix(in srgb,var(--ink) 6%,transparent);overflow:hidden}
.sbar b{display:block;height:100%;border-radius:99px}
.maker{margin-top:18px;padding:14px 16px;border-radius:14px;box-shadow:inset 0 0 0 1px var(--line);display:flex;flex-direction:column;gap:8px}
.mrow{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;align-items:end}
.mrow.link{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.maker code{padding:6px 10px;border-radius:8px;background:color-mix(in srgb,var(--ink) 6%,transparent);font-size:13px;overflow-wrap:anywhere}
@media (max-width:640px){.srow{grid-template-columns:1fr 70px 90px}.srow .sbar,.srow-h span:nth-child(2){display:none}}
</style>
