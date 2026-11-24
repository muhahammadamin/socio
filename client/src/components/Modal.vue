<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import Icon from './Icon.vue';

defineProps({ label: String, wide: Boolean });
const emit = defineEmits(['close']);
const box = ref(null);
let prev = null;
const onKey = (e) => { if (e.key === 'Escape') emit('close'); };
onMounted(() => { prev = document.activeElement; document.addEventListener('keydown', onKey); box.value?.focus(); });
onBeforeUnmount(() => { document.removeEventListener('keydown', onKey); prev?.focus?.(); });
</script>

<template>
  <Teleport to="body">
    <div class="modalback" @click.self="emit('close')">
      <div ref="box" class="modal" :class="{ wide }" role="dialog" aria-modal="true" :aria-label="label" tabindex="-1">
        <div class="mh">
          <slot name="icon" />
          <h2>{{ label }}</h2>
          <button class="iconbtn" type="button" aria-label="Закрыть" @click="emit('close')"><Icon name="x" /></button>
        </div>
        <slot />
      </div>
    </div>
  </Teleport>
</template>
