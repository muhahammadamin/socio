<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { S, HOME, unread, signOut, toggleTheme } from '../store.js';
import Icon from './Icon.vue';
import { Logo, Avatar } from './ui.js';
import RequestModal from './RequestModal.vue';
import MapModal from './MapModal.vue';

const route = useRoute(), router = useRouter();
const base = computed(() => HOME[S.me.role]);

const NAV = {
  admin: [['', 'Главная', 'home'], ['requests', 'Все заявки', 'list'], ['volunteers', 'Волонтёры', 'users'], ['helpers', 'Помощники', 'shield'],
    ['students', 'Студенты', 'book'], ['users', 'Пользователи', 'user'], ['stats', 'Статистика', 'chart'], ['categories', 'Категории', 'grid'], ['learning', 'Обучение', 'play'],
    ['rewards', 'Награды', 'coin'], ['complaints', 'Жалобы', 'flag'], ['settings', 'Настройки', 'sliders']],
  helper: [['', 'Главная', 'home'], ['tasks', 'Мои заявки', 'list'], ['history', 'История', 'history'], ['stats', 'Статистика', 'chart'], ['coins', 'Коины', 'coin'], ['/academy', 'Академия', 'book'], ['notifications', 'Уведомления', 'bell'], ['profile', 'Профиль', 'user']],
  student: [['', 'Главная', 'home'], ['/academy', 'Академия', 'book'], ['/academy/shorts', 'Короткие видео', 'play'], ['coins', 'Коины', 'coin'], ['notifications', 'Уведомления', 'bell'], ['profile', 'Профиль', 'user']],
  user: [['', 'Главная', 'home'], ['requests', 'Мои заявки', 'list'], ['new', 'Получить помощь', 'heart'], ['notifications', 'Уведомления', 'bell'], ['profile', 'Профиль', 'user']],
};
// пути, начинающиеся с «/», ведут за пределы кабинета (например, в учебный центр)
const navTo = (p) => (p.startsWith('/') ? p : p ? `${base.value}/${p}` : base.value);
const badge = (v) => {
  if (v === 'notifications') return unread();
  if (S.me.role === 'admin' && v === 'requests') return S.reqs.filter((r) => r.status === 'new').length;
  if (S.me.role === 'admin' && v === 'complaints') return S.complaints.filter((c) => c.status === 'open').length;
  if (S.me.role === 'admin' && v === 'volunteers') return S.vols.length + S.helpers.filter((h) => !h.verified).length;
  if (S.me.role === 'helper' && v === 'tasks') return S.reqs.filter((r) => r.status === 'assigned').length;
  return 0;
};
const subtitle = computed(() => ({ admin: 'Администратор', helper: 'Помощник', user: 'Пользователь', student: 'Студент' })[S.me.role]);
const firstName = computed(() => S.me.role === 'admin' ? S.me.name : S.me.name.split(' ')[0]);

function onSearch(e) {
  S.q = e.target.value;
  if (route.path !== '/admin/requests') router.push('/admin/requests');
}
function logout() { const admin = S.me.role === 'admin'; signOut(); router.push(admin ? '/admin/login' : '/'); }
const reqId = computed(() => Number(route.query.r) || null);
function closeReq() { const q = { ...route.query }; delete q.r; router.replace({ query: q }); }
</script>

<template>
  <div class="panel" v-if="S.me">
    <aside>
      <RouterLink class="logo" to="/"><Logo /><div><strong>Socio</strong><small>Помогаем вместе</small></div></RouterLink>
      <nav class="nav" aria-label="Разделы">
        <RouterLink v-for="n in NAV[S.me.role]" :key="n[0]" :to="navTo(n[0])">
          <Icon :name="n[2]" /><span>{{ n[1] }}</span>
          <span v-if="badge(n[0])" class="badge">{{ badge(n[0]) }}</span>
        </RouterLink>
        <button type="button" @click="logout"><Icon name="logout" /><span>Выход</span></button>
      </nav>
      <div class="me"><Avatar :name="S.me.name" :size="36" /><div><b>{{ firstName }}</b><small>{{ subtitle }}</small></div></div>
    </aside>
    <div class="mainwrap">
      <div class="topbar">
        <label v-if="S.me.role === 'admin'" class="search"><Icon name="search" :size="18" />
          <input type="text" :value="S.q" placeholder="Поиск по заявкам, пользователям, адресам..." aria-label="Поиск" @input="onSearch">
        </label>
        <div v-else class="spacer" />
        <RouterLink v-if="['helper', 'student'].includes(S.me.role)" class="coinchip" :to="`${base}/coins`" :title="'Ваши коины'"><Icon name="coin" />{{ S.me.coins }}</RouterLink>
        <span class="live" :class="{ off: !S.live }" :title="S.live ? 'Обновления приходят сразу' : 'Нет связи, переподключаемся'"><i />{{ S.live ? 'Онлайн' : 'Офлайн' }}</span>
        <button class="iconbtn" type="button" :aria-label="S.theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'" @click="toggleTheme"><Icon :name="S.theme === 'dark' ? 'sun' : 'moon'" /></button>
        <RouterLink class="iconbtn" :to="`${base}/notifications`" aria-label="Уведомления"><Icon name="bell" /><span v-if="unread()" class="badge">{{ unread() }}</span></RouterLink>
        <Avatar :name="S.me.name" :size="38" />
      </div>
      <main class="content"><RouterView /></main>
    </div>
  </div>
  <RequestModal v-if="reqId" :id="reqId" @close="closeReq" />
  <MapModal v-if="S.mapOpen" @close="S.mapOpen = false" />
</template>
