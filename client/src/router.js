import { createRouter, createWebHistory } from 'vue-router';
import { S, HOME, LOGIN, load } from './store.js';
import { pageSeo } from '@shared/seo.js';
import { watch } from 'vue';
import { lang } from './i18n.js';

const Panel = () => import('./components/Panel.vue'); // только администратор
const RoleSite = () => import('./components/RoleSite.vue'); // сайты ролей
const Notifications = () => import('./views/Notifications.vue');
const Profile = () => import('./views/Profile.vue');
const Coins = () => import('./views/Coins.vue');

const routes = [
  // главная: сначала регистрация (выбор роли); зарегистрированных сразу ведём на их сайт
  { path: '/', component: () => import('./views/Landing.vue'), meta: { title: 'Помогаем вместе', guest: true } },
  { path: '/login', component: () => import('./views/Auth.vue'), meta: { mode: 'login', title: 'Вход', guest: true } },
  // регистрация: шаг 1 — выбор роли, шаг 2 — отдельная страница для каждой роли
  { path: '/register', component: () => import('./views/register/Choose.vue'), meta: { title: 'Регистрация', guest: true } },
  { path: '/register/:as(help|volunteer|student)', component: () => import('./views/register/Form.vue'), meta: { title: 'Регистрация', guest: true } },
  // статья о волонтёрстве для поисковиков и новичков
  { path: '/volunteering', component: () => import('./views/Guide.vue'), meta: { title: 'Волонтёрство в Ташкенте' } },
  // сертификат волонтёра: открыт всем, чтобы работодатель или вуз мог проверить его по номеру
  { path: '/certificate/:code?', component: () => import('./views/Certificate.vue'), meta: { title: 'Сертификат волонтёра' } },
  { path: '/categories', component: () => import('./views/CategoriesInfo.vue'), meta: { title: 'Направления помощи' } },
  // отдельная страница волонтёров: регистрация сразу в платформу
  { path: '/volunteers', component: () => import('./views/VolunteerPortal.vue'), meta: { title: 'Волонтёрам' } },
  // отдельная платформа для студентов
  { path: '/academy', component: () => import('./views/academy/Home.vue'), meta: { title: 'Академия', learners: true } },
  { path: '/academy/shorts', component: () => import('./views/academy/Shorts.vue'), meta: { title: 'Короткие видео', learners: true } },
  { path: '/academy/course/:id(\\d+)', component: () => import('./views/learn/Course.vue'), meta: { title: 'Курс', learners: true } },
  { path: '/academy/join', redirect: '/register/student' },
  // старые адреса
  { path: '/learn', redirect: '/academy' },
  { path: '/learn/:id(\\d+)', redirect: (to) => `/academy/course/${to.params.id}` },
  { path: '/study', redirect: '/academy/join' },
  { path: '/volunteer', redirect: '/volunteers' },
  // Вход в панель управления — отдельная страница, не связанная с сайтом.
  { path: '/admin/login', component: () => import('./views/AdminLogin.vue'), meta: { title: 'Панель управления', guest: true } },
  {
    path: '/admin', component: Panel, meta: { role: 'admin' }, children: [
      { path: '', component: () => import('./views/admin/Home.vue'), meta: { title: 'Главная' } },
      { path: 'people', component: () => import('./views/admin/People.vue'), meta: { title: 'Все участники' } },
      { path: 'requests', component: () => import('./views/admin/Requests.vue'), meta: { title: 'Все заявки' } },
      { path: 'volunteers', component: () => import('./views/admin/Volunteers.vue'), meta: { title: 'Волонтёры' } },
      { path: 'helpers', component: () => import('./views/admin/Helpers.vue'), meta: { title: 'Помощники' } },
      { path: 'students', component: () => import('./views/admin/Students.vue'), meta: { title: 'Студенты' } },
      { path: 'users', component: () => import('./views/admin/Users.vue'), meta: { title: 'Пользователи' } },
      { path: 'stats', component: () => import('./views/admin/Stats.vue'), meta: { title: 'Статистика' } },
      { path: 'categories', component: () => import('./views/admin/Categories.vue'), meta: { title: 'Категории' } },
      { path: 'learning', component: () => import('./views/admin/Learning.vue'), meta: { title: 'Обучение' } },
      { path: 'rewards', component: () => import('./views/admin/Rewards.vue'), meta: { title: 'Награды' } },
      { path: 'admins', component: () => import('./views/admin/Admins.vue'), meta: { title: 'Администраторы' } },
      { path: 'telegram', component: () => import('./views/admin/Telegram.vue'), meta: { title: 'Telegram-бот' } },
      { path: 'complaints', component: () => import('./views/admin/Complaints.vue'), meta: { title: 'Жалобы' } },
      { path: 'settings', component: Profile, meta: { title: 'Настройки' } },
      { path: 'notifications', component: Notifications, meta: { title: 'Уведомления' } },
    ],
  },
  {
    path: '/helper', component: RoleSite, meta: { role: 'helper' }, children: [
      { path: '', component: () => import('./views/helper/Home.vue'), meta: { title: 'Главная' } },
      { path: 'tasks', component: () => import('./views/helper/Tasks.vue'), meta: { title: 'Мои заявки' } },
      { path: 'history', component: () => import('./views/helper/History.vue'), meta: { title: 'История' } },
      { path: 'stats', component: () => import('./views/helper/Stats.vue'), meta: { title: 'Статистика' } },
      { path: 'coins', component: Coins, meta: { title: 'Коины' } },
      { path: 'profile', component: Profile, meta: { title: 'Профиль' } },
      { path: 'notifications', component: Notifications, meta: { title: 'Уведомления' } },
    ],
  },
  {
    path: '/student', component: RoleSite, meta: { role: 'student' }, children: [
      { path: '', component: () => import('./views/student/Home.vue'), meta: { title: 'Главная' } },
      { path: 'coins', component: Coins, meta: { title: 'Коины' } },
      { path: 'profile', component: Profile, meta: { title: 'Профиль' } },
      { path: 'notifications', component: Notifications, meta: { title: 'Уведомления' } },
    ],
  },
  {
    path: '/app', component: RoleSite, meta: { role: 'user' }, children: [
      { path: '', component: () => import('./views/user/Home.vue'), meta: { title: 'Главная' } },
      { path: 'requests', component: () => import('./views/user/Requests.vue'), meta: { title: 'Мои заявки' } },
      { path: 'new', component: () => import('./views/user/NewRequest.vue'), meta: { title: 'Получить помощь' } },
      { path: 'profile', component: Profile, meta: { title: 'Профиль' } },
      { path: 'notifications', component: Notifications, meta: { title: 'Уведомления' } },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: (to, from, saved) => saved || (to.hash ? { el: to.hash, behavior: 'smooth' } : { top: 0 }),
});

router.beforeEach(async (to) => {
  const role = to.matched.find((r) => r.meta.role)?.meta.role;
  if (S.token && !S.loaded) {
    try { await load(); } catch { /* 401 обработан в api.js */ }
  }
  if (role) {
    if (!S.me) return { path: LOGIN(role), query: { next: to.fullPath } };
    if (S.me.role !== role) return HOME[S.me.role];
  }
  // Академия — только для зарегистрированных студентов и волонтёров
  if (to.meta.learners) {
    const me = S.me && S.me.role !== 'admin' ? S.me : null;
    if (!me) return { path: '/register/student', query: { next: to.fullPath } };
    if (!['student', 'helper'].includes(me.role)) return HOME[me.role];
  }
  // Сайт не ведёт в панель управления: сессия администратора на страницах сайта не учитывается.
  if (to.meta.guest && S.me) {
    if (to.path === '/admin/login') return S.me.role === 'admin' ? '/admin' : undefined;
    if (S.me.role !== 'admin') return HOME[S.me.role];
  }
});
// Публичные страницы получают SEO-заголовок и описание на языке сайта (те же, что сервер отдаёт в HTML).
const descTag = document.querySelector('meta[name="description"]');
function applyTitle(to) {
  const seo = pageSeo(to.path.length > 1 ? to.path.replace(/\/+$/, '') : to.path, lang.value);
  document.title = seo?.title || `${to.meta.title ? to.meta.title + ' · ' : ''}Socio`;
  if (seo && descTag) descTag.content = seo.description;
}
router.afterEach(applyTitle);
watch(lang, () => applyTitle(router.currentRoute.value));
