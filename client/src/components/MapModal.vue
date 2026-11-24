<script setup>
import { computed } from 'vue';
import { S } from '../store.js';
import { useOpenRequest, reqPins } from '../composables.js';
import Modal from './Modal.vue';
import CityMap from './CityMap.vue';
import { Legend } from './ui.js';

const emit = defineEmits(['close']);
const open = useOpenRequest();
const pins = computed(() => reqPins(S.reqs.filter((r) => r.status !== 'done')));
function go(id) { emit('close'); open(id); }
</script>

<template>
  <Modal label="Карта заявок" wide @close="emit('close')">
    <CityMap :pins="pins" labels @open="go" />
    <Legend />
    <p class="note" style="margin-top:8px">Нажмите на метку, чтобы открыть заявку.</p>
  </Modal>
</template>
