<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { S, HOME, unread, signOut, toggleTheme } from '../store.js';
import Icon from './Icon.vue';
import { Avatar } from './ui.js';

// Шапка «сайта роли»: у каждой роли (нужна помощь / волонтёр / студент) свой сайт со своим меню.
const BRAND = {
  user: { title: 'Socio', sub: 'Помощь рядом', icon: 'heart', c: '#7c4dde', c2: '#3b5bf0', role: 'Нужна помощь' },
  helper: { title: 'Socio', sub: 'Волонтёрам', icon: 'hand', c: '#1fa85c', c2: '#0f766e', role: 'Волонтёр' },
  student: { title: 'Socio Академия', sub: 'Учимся помогать', icon: 'book', c: '#f08a24', c2: '#e0527a', role: 'Студент' },
};
const NAV = {
  user: [['/app', 'Главная'], ['/app/new', 'Получить помощь'], ['/app/requests', 'Мои заявки'], ['/categories', 'Направления']],
  helper: [['/helper', 'Главная'], ['/helper/tasks', 'Мои заявки'], ['/helper/history', 'История'], ['/helper/stats', 'Статистика'], ['/academy', 'Академия'], ['/helper/coins', 'Коины']],
  student: [['/student', 'Главная'], ['/academy', 'Курсы'], ['/academy/shorts', 'Короткие видео'], ['/student/coins', 'Коины']],
};

const route = useRoute(), router = useRouter();
const role = computed(() => S.me.role);
const b = computed(() => BRAND[role.value]);
const home = computed(() => HOME[role.value]);
// главная активна только на точном адресе, остальные — и на вложенных страницах
const active = (to) => (to === home.value ? route.path === to : route.path === to || route.path.startsWith(`${to}/`));
const badge = (to) => (to === '/helper/tasks' ? S.reqs.filter((r) => r.status === 'assigned').length : 0);

const menu = ref(false), menuEl = ref(null);
const onDoc = (e) => { if (menu.value && !menuEl.value?.contains(e.target)) menu.value = false; };
onMounted(() => document.addEventListener('click', onDoc));
onBeforeUnmount(() => document.removeEventListener('click', onDoc));
function logout() { signOut(); router.push('/'); }
</script>

<template>
  <header class="rhead" :style="{ '--c': b.c, '--c2': b.c2 }">
    <div class="in">
      <RouterLink class="rbrand" :to="home">
        <span class="rb-ic"><Icon :name="b.icon" /></span>
        <div><strong>{{ b.title }}</strong><small>{{ b.sub }}</small></div>
      </RouterLink>
      <nav class="rnav" aria-label="Разделы">
        <RouterLink v-for="n in NAV[role]" :key="n[0]" :to="n[0]" :class="{ on: active(n[0]) }" :aria-current="active(n[0]) ? 'page' : null">
          {{ n[1] }}<span v-if="badge(n[0])" class="badge">{{ badge(n[0]) }}</span>
        </RouterLink>
      </nav>
      <div class="ract">
        <RouterLink v-if="role !== 'user'" class="coinchip" :to="`${home}/coins`" title="Ваши коины"><Icon name="coin" />{{ S.me.coins }}</RouterLink>
        <span v-else class="coinchip" title="Баланс добра — растёт, когда вы благодарите помощников"><Icon name="heart" />{{ S.me.balance }}</span>
        <RouterLink class="iconbtn" :to="`${home}/notifications`" aria-label="Уведомления"><Icon name="bell" /><span v-if="unread()" class="badge">{{ unread() }}</span></RouterLink>
        <button class="iconbtn" type="button" :aria-label="S.theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'" @click="toggleTheme"><Icon :name="S.theme === 'dark' ? 'sun' : 'moon'" /></button>
        <div ref="menuEl" class="rmenu">
          <button type="button" class="rme" :aria-expanded="menu" aria-haspopup="menu" @click="menu = !menu">
            <Avatar :name="S.me.name" :size="36" /><span class="rme-t"><b>{{ S.me.name.split(' ')[0] }}</b><small>{{ b.role }}</small></span>
          </button>
          <div v-if="menu" class="rdrop" role="menu" @click="menu = false">
            <RouterLink role="menuitem" :to="`${home}/profile`"><Icon name="user" />Профиль</RouterLink>
            <RouterLink role="menuitem" :to="`${home}/notifications`"><Icon name="bell" />Уведомления</RouterLink>
            <button role="menuitem" type="button" @click="logout"><Icon name="logout" />Выйти</button>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>
