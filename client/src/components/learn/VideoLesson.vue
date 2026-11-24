<script setup>
import Icon from '../Icon.vue';

defineProps({ item: { type: Object, required: true }, done: Boolean });
defineEmits(['done']);
</script>

<template>
  <div class="fcol">
    <div v-if="item.video" class="video">
      <iframe :src="`https://www.youtube-nocookie.com/embed/${item.video}?rel=0`" :title="item.title" loading="lazy"
        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen />
    </div>
    <div v-if="item.text" class="lessontext">{{ item.text }}</div>
    <div class="lfoot">
      <span v-if="done" class="okline"><Icon name="check" />Урок пройден</span>
      <button v-else class="btn" type="button" @click="$emit('done', 1)"><Icon name="check" />{{ item.video ? 'Я посмотрел(а) урок' : 'Я прочитал(а) урок' }}</button>
    </div>
  </div>
</template>
