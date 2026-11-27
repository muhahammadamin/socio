<script setup>
import { computed, h, onBeforeUnmount, onMounted, ref } from 'vue';
import Icon from '../Icon.vue';

// Обычный урок: текст с заголовками, списками и советами, «Главное» и вопрос для самопроверки.
const props = defineProps({ item: { type: Object, required: true }, done: Boolean });
const emit = defineEmits(['done']);

/* Простая разметка: «## » — заголовок, «- »/«• » — список, «1. » — шаги, «> » — совет, **жирный**. Без v-html. */
const blocks = computed(() => {
  const out = [];
  let para = [];
  const flush = () => { if (para.length) out.push({ t: 'p', text: para.join(' ') }); para = []; };
  for (const raw of String(props.item.body || '').split('\n')) {
    const s = raw.trim();
    let m;
    if (!s) { flush(); continue; }
    if ((m = s.match(/^##\s+(.*)/))) { flush(); out.push({ t: 'h', text: m[1] }); continue; }
    if ((m = s.match(/^>\s?(.*)/))) { flush(); out.push({ t: 'tip', text: m[1] }); continue; }
    const li = s.match(/^[-•]\s+(.*)/), ol = s.match(/^\d+[.)]\s+(.*)/);
    if (li || ol) {
      flush();
      const t = li ? 'ul' : 'ol', last = out[out.length - 1];
      if (last?.t === t) last.items.push((li || ol)[1]); else out.push({ t, items: [(li || ol)[1]] });
      continue;
    }
    para.push(s);
  }
  flush();
  return out;
});
const Rich = (p) => String(p.text).split(/(\*\*[^*]+\*\*)/g).filter(Boolean)
  .map((part) => (part.startsWith('**') && part.endsWith('**') ? h('b', part.slice(2, -2)) : part));
Rich.props = ['text'];

/* полоса прочтения */
const art = ref(null), read = ref(0);
function onScroll() {
  const el = art.value;
  if (!el) return;
  const r = el.getBoundingClientRect();
  const total = r.height - innerHeight * 0.6;
  read.value = Math.max(0, Math.min(100, Math.round(((innerHeight * 0.4 - r.top) / Math.max(1, total)) * 100)));
}
onMounted(() => { addEventListener('scroll', onScroll, { passive: true }); onScroll(); });
onBeforeUnmount(() => removeEventListener('scroll', onScroll));

/* самопроверка */
const pick = ref(null), wrong = ref(false);
const solved = computed(() => !props.item.check || pick.value === props.item.check.answer);
function choose(i) {
  if (solved.value && pick.value !== null) return;
  pick.value = i;
  if (i !== props.item.check.answer) { wrong.value = true; setTimeout(() => { wrong.value = false; pick.value = null; }, 900); }
}
</script>

<template>
  <div class="reader">
    <div class="readbar" aria-hidden="true"><div :style="{ width: (done ? 100 : read) + '%' }" /></div>
    <p class="readmeta"><Icon name="clock" :size="14" />{{ item.minutes || 3 }} мин чтения</p>

    <article ref="art" class="lessonbody">
      <template v-for="(b, i) in blocks" :key="i">
        <h3 v-if="b.t === 'h'" v-reveal>{{ b.text }}</h3>
        <p v-else-if="b.t === 'p'" v-reveal><Rich :text="b.text" /></p>
        <aside v-else-if="b.t === 'tip'" v-reveal class="tip"><Icon name="info" :size="18" /><span><Rich :text="b.text" /></span></aside>
        <ul v-else-if="b.t === 'ul'" v-reveal><li v-for="(x, j) in b.items" :key="j"><Rich :text="x" /></li></ul>
        <ol v-else v-reveal class="steps-ol"><li v-for="(x, j) in b.items" :key="j"><Rich :text="x" /></li></ol>
      </template>
    </article>

    <div v-if="item.key?.length" v-reveal class="keybox">
      <b><Icon name="star" :size="16" />Главное</b>
      <ul><li v-for="(k, i) in item.key" :key="i" :style="{ '--i': i }">{{ k }}</li></ul>
    </div>

    <div v-if="item.check" v-reveal class="selfcheck" :class="{ shake: wrong, ok: solved && pick !== null }">
      <b><Icon name="quiz" :size="16" />Проверьте себя</b>
      <p>{{ item.check.q }}</p>
      <div class="opts">
        <button v-for="(o, i) in item.check.options" :key="i" type="button" class="opt"
          :class="{ right: pick === i && i === item.check.answer, bad: pick === i && i !== item.check.answer }" @click="choose(i)">{{ o }}</button>
      </div>
      <p v-if="solved && pick !== null" class="note okline"><Icon name="check" />Верно! {{ item.check.explain }}</p>
      <p v-else-if="wrong" class="note" style="color:var(--crit)">Не совсем — попробуйте ещё раз.</p>
    </div>

    <div class="lfoot">
      <span v-if="done" class="okline"><Icon name="check" />Урок пройден</span>
      <button v-else class="btn" type="button" :disabled="!solved" :title="solved ? null : 'Сначала ответьте на вопрос для самопроверки'" @click="emit('done', 1)">
        <Icon name="check" />{{ item.check && !solved ? 'Ответьте на вопрос выше' : 'Урок прочитан' }}
      </button>
    </div>
  </div>
</template>
