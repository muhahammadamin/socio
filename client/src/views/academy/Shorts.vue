<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { L, loadLearn } from '../../learn.js';
import Icon from '../../components/Icon.vue';
import AcademyBar from '../../components/AcademyBar.vue';

// Лента коротких вертикальных видео: листается колесом/свайпом, играет только текущее.
const route = useRoute();
const feed = ref(null), cur = ref(0), playing = ref(null), topic = ref('');
const SEEN = 'socio.shorts.seen';
const seen = ref(new Set((() => { try { return JSON.parse(localStorage.getItem(SEEN)) || []; } catch { return []; } })()));

const topics = computed(() => [...new Set((L.shorts || []).map((s) => s.topic).filter(Boolean))]);
const list = computed(() => (L.shorts || []).filter((s) => !topic.value || s.topic === topic.value));

function markSeen(id) {
  if (seen.value.has(id)) return;
  seen.value = new Set([...seen.value, id]);
  try { localStorage.setItem(SEEN, JSON.stringify([...seen.value])); } catch { /* приватный режим */ }
}
function play(s) { playing.value = s.id; markSeen(s.id); }
function go(i) {
  const el = feed.value?.children[i];
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function setTopic(t) { topic.value = t; playing.value = null; nextTick(() => { feed.value?.scrollTo({ top: 0 }); cur.value = 0; }); }

let io;
function observe() {
  io?.disconnect();
  io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting && e.intersectionRatio > 0.6) {
      const i = Number(e.target.dataset.i);
      if (cur.value !== i) { cur.value = i; playing.value = null; } // ушли с видео — останавливаем
    }
  }, { root: feed.value, threshold: [0.6] });
  [...(feed.value?.children || [])].forEach((el) => io.observe(el));
}
const onKey = (e) => {
  if (e.key === 'ArrowDown') { e.preventDefault(); go(Math.min(cur.value + 1, list.value.length - 1)); }
  if (e.key === 'ArrowUp') { e.preventDefault(); go(Math.max(cur.value - 1, 0)); }
};
onMounted(async () => {
  if (!L.loaded) await loadLearn().catch(() => {});
  await nextTick();
  observe();
  const start = list.value.findIndex((s) => s.id === Number(route.query.v));
  if (start > 0) { go(start); cur.value = start; }
  addEventListener('keydown', onKey);
});
onBeforeUnmount(() => { io?.disconnect(); removeEventListener('keydown', onKey); });
const thumb = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
</script>

<template>
  <div class="site academy">
    <AcademyBar />
    <div class="shortspage">
      <aside class="shortside">
        <h1>Короткие видео</h1>
        <p class="note">Минута — и вы знаете чуть больше. Листайте колесом мыши, свайпом или стрелками ↑ ↓.</p>
        <div class="chips" style="margin:12px 0">
          <button type="button" class="chip" :aria-pressed="!topic" @click="setTopic('')">Все</button>
          <button v-for="t in topics" :key="t" type="button" class="chip" :aria-pressed="topic === t" @click="setTopic(t)">{{ t }}</button>
        </div>
        <p class="note">Просмотрено: <b class="num">{{ list.filter((s) => seen.has(s.id)).length }} из {{ list.length }}</b></p>
        <RouterLink class="btn ghost sm" to="/academy" style="margin-top:12px"><Icon name="book" />К курсам</RouterLink>
      </aside>

      <div ref="feed" class="feed" tabindex="-1">
        <section v-for="(s, i) in list" :key="s.id" class="short" :data-i="i">
          <div class="frame">
            <iframe v-if="playing === s.id" :src="`https://www.youtube-nocookie.com/embed/${s.video}?autoplay=1&rel=0&playsinline=1`" :title="s.title"
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen />
            <button v-else type="button" class="poster" :aria-label="`Смотреть: ${s.title}`" @click="play(s)">
              <img :src="thumb(s.video)" alt="" loading="lazy">
              <span class="play"><Icon name="play" /></span>
              <span v-if="seen.has(s.id)" class="seen"><Icon name="check" />Просмотрено</span>
            </button>
          </div>
          <div class="sinfo">
            <small v-if="s.topic">{{ s.topic }}</small>
            <b>{{ s.title }}</b>
            <div class="snav">
              <button class="iconbtn" type="button" :disabled="i === 0" aria-label="Предыдущее видео" @click="go(i - 1)"><Icon name="up" /></button>
              <span class="num note">{{ i + 1 }} / {{ list.length }}</span>
              <button class="iconbtn" type="button" :disabled="i === list.length - 1" aria-label="Следующее видео" @click="go(i + 1)"><Icon name="down" /></button>
            </div>
          </div>
        </section>
        <p v-if="L.loaded && !list.length" class="empty"><b>Видео пока нет</b>Скоро здесь появятся короткие ролики.</p>
      </div>
    </div>
  </div>
</template>
