<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { api } from '../api.js';
import { t, tm } from '../i18n.js';
import Icon from '../components/Icon.vue';
import SiteBar from '../components/SiteBar.vue';
import PhoneInput from '../components/PhoneInput.vue';
import CountUp from '../components/CountUp.vue';

// Компании и организации просят волонтёров: оставляют заявку, координатор звонит и открывает набор.
const P = ref(null);
onMounted(() => api.get('/public').then((d) => { P.value = d; }).catch(() => {}));
const districts = computed(() => Object.keys(P.value?.districts || {}));
// живые цифры платформы; «проекты с компаниями» показываем, только когда они уже есть
const stats = computed(() => {
  const s = P.value?.stats;
  if (!s) return [];
  return [s.helpers, s.done, s.districts, s.projects].map((v, i) => [v, tm('comp.stats')[i]]).filter(([v], i) => i < 3 || v > 0);
});
const COLORS = ['#e0527a', '#22b05f', '#3b5bf0', '#f08a24', '#8657e8', '#14a89a'];

const blank = () => ({ company: '', contact: '', phone: '', email: '', task: '', dist: '', place: '', when: '', people: 10, regular: false });
const f = reactive(blank());
const busy = ref(false), err = ref(''), sent = ref('');

async function submit() {
  err.value = ''; busy.value = true;
  try {
    await api.post('/companies/requests', f);
    sent.value = f.phone; Object.assign(f, blank());
    document.getElementById('request')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (e) { err.value = e.message; }
  finally { busy.value = false; }
}
function toForm() {
  const el = document.getElementById('request');
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  setTimeout(() => el?.querySelector('input')?.focus({ preventScroll: true }), 450);
}
</script>

<template>
  <div class="site">
    <SiteBar />
    <section class="lhero volhero comphero">
      <div class="wrap">
        <div>
          <span class="kicker"><Icon name="users" :size="15" />{{ t('comp.kicker') }}</span>
          <h1>{{ tm('comp.h1')[0] }}<em>{{ tm('comp.h1')[1] }}</em>{{ tm('comp.h1')[2] }}</h1>
          <p>{{ t('comp.lead') }}</p>
          <ul class="perks">
            <li v-for="x in tm('comp.perks')" :key="x"><span><Icon name="check" :size="14" /></span>{{ x }}</li>
          </ul>
          <div v-if="stats.length" class="cstats">
            <div v-for="s in stats" :key="s[1]"><b class="num"><CountUp :value="s[0]" /></b><span>{{ s[1] }}</span></div>
          </div>
        </div>

        <div id="request" class="card volform">
          <div v-if="sent" class="fcol">
            <span class="okmark"><Icon name="check" :size="28" /></span>
            <h2>{{ t('comp.sent.title') }}</h2>
            <p class="note">{{ t('comp.sent.text') }}</p>
            <ol class="nextsteps"><li v-for="x in tm('comp.sent.next')" :key="x">{{ x }}</li></ol>
            <button class="btn ghost" type="button" style="align-self:flex-start" @click="sent = ''">{{ t('comp.sent.again') }}</button>
          </div>
          <form v-else class="fcol" novalidate @submit.prevent="submit">
            <div><h2>{{ t('comp.form.title') }}</h2><p class="note" style="margin-top:2px">{{ t('comp.form.sub') }}</p></div>
            <label class="f">{{ t('comp.form.company') }}<input v-model="f.company" type="text" maxlength="120" autocomplete="organization" :placeholder="t('comp.form.companyPh')"></label>
            <div class="two">
              <label class="f">{{ t('comp.form.contact') }}<input v-model="f.contact" type="text" maxlength="80" autocomplete="name" :placeholder="t('comp.form.contactPh')"></label>
              <label class="f">{{ t('comp.form.phone') }}<PhoneInput v-model="f.phone" autocomplete="tel" /></label>
            </div>
            <label class="f">{{ t('comp.form.task') }}<textarea v-model="f.task" rows="3" maxlength="1500" :placeholder="t('comp.form.taskPh')" /></label>
            <div class="two">
              <label class="f">{{ t('comp.form.dist') }}<select v-model="f.dist"><option value="">{{ t('comp.form.distAny') }}</option><option v-for="d in districts" :key="d">{{ d }}</option></select></label>
              <label class="f">{{ t('comp.form.people') }}<input v-model.number="f.people" type="number" min="1" max="500" inputmode="numeric"></label>
            </div>
            <div class="two">
              <label class="f">{{ t('comp.form.when') }}<input v-model="f.when" type="text" maxlength="120" :placeholder="t('comp.form.whenPh')"></label>
              <fieldset class="f seg"><legend>{{ t('comp.form.format') }}</legend>
                <label :class="{ on: !f.regular }"><input v-model="f.regular" type="radio" :value="false">{{ t('comp.form.once') }}</label>
                <label :class="{ on: f.regular }"><input v-model="f.regular" type="radio" :value="true">{{ t('comp.form.regular') }}</label>
              </fieldset>
            </div>
            <details class="more">
              <summary>{{ t('comp.form.place') }}, {{ t('comp.form.email').toLowerCase() }} <span class="note">· {{ t('comp.form.optional') }}</span></summary>
              <div class="fcol" style="margin-top:12px">
                <label class="f">{{ t('comp.form.place') }}<input v-model="f.place" type="text" maxlength="200" :placeholder="t('comp.form.placePh')"></label>
                <label class="f">{{ t('comp.form.email') }}<input v-model="f.email" type="email" maxlength="120" autocomplete="email" placeholder="hr@company.uz"></label>
              </div>
            </details>
            <p v-if="err" class="formerr" role="alert">{{ err }}</p>
            <button class="btn lg" :disabled="busy"><Icon name="send" :size="18" />{{ busy ? t('comp.form.sending') : t('comp.form.submit') }}</button>
            <p class="note" style="display:flex;gap:6px;align-items:center;font-size:13px"><Icon name="lock" :size="14" />{{ t('comp.form.privacy') }}</p>
          </form>
        </div>
      </div>
    </section>

    <div class="wrap" style="padding-bottom:8px">
      <section class="section">
        <h2 class="big">{{ t('comp.usesTitle') }}</h2>
        <p class="lead">{{ t('comp.usesLead') }}</p>
        <div class="uses">
          <div v-for="(u, i) in tm('comp.uses')" :key="u[1]" class="catcard" :style="{ '--c': COLORS[i % COLORS.length] }">
            <span class="cico"><Icon :name="u[0]" /></span><b>{{ u[1] }}</b><span>{{ u[2] }}</span>
          </div>
        </div>
      </section>

      <section class="section">
        <h2 class="big">{{ t('comp.whyTitle') }}</h2>
        <div class="rules" style="margin-top:20px">
          <div v-for="w in tm('comp.why')" :key="w[1]" class="rule"><span class="ti"><Icon :name="w[0]" /></span><div><b>{{ w[1] }}</b><p>{{ w[2] }}</p></div></div>
        </div>
      </section>

      <section class="section">
        <h2 class="big">{{ t('comp.stepsTitle') }}</h2>
        <div class="steps" style="margin-top:20px">
          <div v-for="(s, i) in tm('comp.steps')" :key="s[0]" class="step"><span class="n">{{ i + 1 }}</span><b>{{ s[0] }}</b><p>{{ s[1] }}</p></div>
        </div>
      </section>

      <section class="section getfaq">
        <div class="card getcard">
          <h2>{{ t('comp.getTitle') }}</h2>
          <ul><li v-for="x in tm('comp.get')" :key="x"><span><Icon name="check" :size="14" /></span>{{ x }}</li></ul>
          <button class="btn" type="button" @click="toForm"><Icon name="send" />{{ t('comp.ctaBtn') }}</button>
        </div>
        <div class="faq" style="margin-top:0">
          <h3>{{ t('comp.faqTitle') }}</h3>
          <details v-for="(q, i) in tm('comp.faq')" :key="q[0]" :open="i === 0"><summary>{{ q[0] }}</summary><p>{{ q[1] }}</p></details>
        </div>
      </section>

      <section class="cta">
        <div><h2>{{ t('comp.ctaTitle') }}</h2><p>{{ t('comp.ctaText') }}</p></div>
        <div class="ctaside"><button class="btn light lg" type="button" @click="toForm"><Icon name="send" :size="18" />{{ t('comp.ctaBtn') }}</button></div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.perks{list-style:none;padding:0;margin:0 0 26px;display:flex;flex-direction:column;gap:10px}
.perks li{display:flex;gap:10px;align-items:center;font-weight:600}
.perks li span,.getcard li span{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;flex:none;background:rgba(255,255,255,.16)}
.cstats{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px;max-width:560px}
.cstats div{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);border-radius:16px;padding:12px 14px}
.cstats b{display:block;font-size:26px;font-weight:800}
.cstats div>span{font-size:13px;opacity:.8}
.volform p{font-size:14px;opacity:1;margin:0;max-width:none}
.seg{border:0;padding:0;margin:0;display:flex;flex-wrap:wrap;gap:6px}
.seg legend{padding:0;margin-bottom:6px}
.seg label{flex:1;display:flex;align-items:center;justify-content:center;text-align:center;border:1.5px solid var(--line);border-radius:10px;padding:9px 8px;cursor:pointer;font-weight:600;font-size:14px;min-height:42px}
.seg label.on{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 10%,transparent);color:var(--accent)}
.seg input{position:absolute;opacity:0;pointer-events:none}
.seg label:focus-within{outline:2px solid var(--accent);outline-offset:2px}
.more summary{cursor:pointer;font-weight:600;color:var(--accent)}
.okmark{width:52px;height:52px;border-radius:50%;display:grid;place-items:center;color:#fff;background:var(--p-green)}
.nextsteps{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:6px}
.uses{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
@media (max-width:900px){.uses{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:560px){.uses{grid-template-columns:1fr}}
.uses .catcard span:last-child{font-weight:500}
.getfaq{display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);gap:28px;align-items:start}
.getcard{color:#fff;background:linear-gradient(150deg,#1fa85c,#0f766e);display:flex;flex-direction:column;gap:14px}
.getcard ul{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:10px}
.getcard li{display:flex;gap:10px;align-items:flex-start;font-weight:600}
.getcard .btn{align-self:flex-start;background:#fff;color:#0f766e}
@media (max-width:900px){.getfaq{grid-template-columns:1fr}}
@media (max-width:520px){.two{grid-template-columns:1fr}}
</style>
