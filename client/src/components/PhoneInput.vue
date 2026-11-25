<script setup>
// Поле телефона с маской +998 __ ___ __ __: код страны вписан, принимается ровно 9 цифр номера.
// v-model получает номер в виде «+998 90 123 45 67» (или неполный, пока набирается; пусто — '').
import { ref, watch, nextTick } from 'vue';
import { phoneKey, phoneLocal, formatPhone } from '@shared/constants.js';

const props = defineProps({ modelValue: { type: String, default: '' } });
const emit = defineEmits(['update:modelValue']);
const PREFIX = '+998 ';
const el = ref(null);
const show = (v) => (phoneLocal(v) ? formatPhone(v) : '');
const text = ref(show(props.modelValue));
watch(() => props.modelValue, (v) => { if (phoneLocal(v) !== phoneLocal(text.value)) text.value = show(v); });

// позиция сразу после n-й цифры номера (цифры кода 998 не считаются)
function caretAfter(s, n) {
  if (n <= 0) return PREFIX.length;
  for (let i = PREFIX.length, k = 0; i < s.length; i++) if (/\d/.test(s[i]) && ++k === n) return i + 1;
  return s.length;
}

function onInput(e) {
  const inp = e.target, raw = inp.value, caret = inp.selectionStart ?? raw.length;
  const all = phoneKey(raw), local = phoneLocal(raw);
  const front = local.length && !all.startsWith(local) ? 3 : 0; // спереди был код 998 — его цифры не считаем
  const n = Math.min(local.length, Math.max(0, phoneKey(raw.slice(0, caret)).length - front));
  text.value = local ? formatPhone(local) : PREFIX;
  inp.value = text.value;
  emit('update:modelValue', local ? text.value : '');
  nextTick(() => { if (document.activeElement === inp) inp.setSelectionRange(caretAfter(text.value, n), caretAfter(text.value, n)); });
}
function onFocus() { if (!phoneLocal(text.value)) text.value = PREFIX; }
function onBlur() { if (!phoneLocal(text.value)) text.value = ''; }
</script>

<template>
  <input ref="el" :value="text" type="tel" inputmode="tel" placeholder="+998 __ ___ __ __" @input="onInput" @focus="onFocus" @blur="onBlur">
</template>
