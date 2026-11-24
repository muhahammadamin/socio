<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { S } from '../store.js';
import RoleHeader from './RoleHeader.vue';
import RequestModal from './RequestModal.vue';
import MapModal from './MapModal.vue';

// Полноценный сайт для роли (нужна помощь / волонтёр / студент): шапка с меню сверху, страницы — ниже.
// Панель с боковым меню осталась только у администратора.
const route = useRoute(), router = useRouter();
const reqId = computed(() => Number(route.query.r) || null);
function closeReq() { const q = { ...route.query }; delete q.r; router.replace({ query: q }); }
</script>

<template>
  <div v-if="S.me" class="site rolesite">
    <RoleHeader />
    <main class="wrap rs-main">
      <RouterView v-slot="{ Component, route: r }"><div class="page" :key="r.path"><component :is="Component" /></div></RouterView>
    </main>
    <footer class="footer">
      <div class="wrap">
        <strong>Socio</strong><span>Помогаем вместе · Ташкент</span>
        <span class="spacer" />
        <RouterLink to="/categories">Направления помощи</RouterLink>
        <span>Экстренно: 103 · 101 · 102</span>
      </div>
    </footer>
  </div>
  <RequestModal v-if="reqId" :id="reqId" @close="closeReq" />
  <MapModal v-if="S.mapOpen" @close="S.mapOpen = false" />
</template>
