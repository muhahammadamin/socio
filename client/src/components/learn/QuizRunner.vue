<script setup>
import { computed, ref, watch } from 'vue';
import { checkQuiz, PASS } from '../../learn.js';
import { toast } from '../../store.js';
import Icon from '../Icon.vue';

const props = defineProps({ item: { type: Object, required: true }, courseId: { type: Number, required: true } });
const emit = defineEmits(['done']);

const answers = ref([]), result = ref(null), busy = ref(false);
const reset = () => { answers.value = props.item.questions.map(() => null); result.value = null; };
watch(() => props.item.id, reset, { immediate: true });

const ready = computed(() => answers.value.every((a) => a !== null));
const percent = computed(() => Math.round((result.value?.score || 0) * 100));

async function check() {
  busy.value = true;
  try {
    result.value = await checkQuiz(props.courseId, props.item.id, answers.value);
    if (result.value.score >= PASS) emit('done', result.value.score, result.value.coins);
  } catch (e) { toast(e.message, true); }
  finally { busy.value = false; }
}
function optClass(qi, oi) {
  if (!result.value) return { sel: answers.value[qi] === oi };
  const r = result.value.results[qi];
  return { right: oi === r.answer, wrong: answers.value[qi] === oi && !r.ok };
}
</script>

<template>
  <div class="fcol">
    <div v-if="result" class="scorebar" :class="result.score >= PASS ? 'good' : 'bad'">
      <b class="num">{{ percent }}%</b>
      <span>{{ result.score >= PASS ? (result.score === 1 ? 'Отлично, все ответы верные!' : 'Тест пройден!') : `Нужно хотя бы ${Math.round(PASS * 100)}%. Посмотрите пояснения и попробуйте ещё раз.` }}</span>
      <button class="btn ghost sm" type="button" @click="reset"><Icon name="refresh" />Пройти заново</button>
    </div>
    <fieldset v-for="(q, qi) in item.questions" :key="qi" class="qcard" :disabled="!!result">
      <legend><span class="qn">{{ qi + 1 }}</span>{{ q.q }}</legend>
      <div class="opts">
        <label v-for="(o, oi) in q.options" :key="oi" class="opt" :class="optClass(qi, oi)">
          <input v-model="answers[qi]" type="radio" :name="`q${item.id}-${qi}`" :value="oi">{{ o }}
        </label>
      </div>
      <p v-if="result && result.results[qi].explain" class="explain"><Icon :name="result.results[qi].ok ? 'check' : 'quiz'" />{{ result.results[qi].explain }}</p>
    </fieldset>
    <div v-if="!result" class="lfoot">
      <span class="note">Отвечено {{ answers.filter((a) => a !== null).length }} из {{ item.questions.length }}</span>
      <button class="btn" type="button" :disabled="!ready || busy" @click="check"><Icon name="check" />Проверить</button>
    </div>
  </div>
</template>
