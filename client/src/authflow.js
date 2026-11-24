// Общая логика входа: после успешного входа — в кабинет или туда, откуда пришли.
import { HOME, S, signIn, load } from './store.js';

/** Куда можно вернуться после входа: только в свой кабинет или в академию. */
export function safeNext(role, q) {
  return typeof q === 'string' && (q.startsWith(HOME[role]) || /^\/academy(\/|$)/.test(q)) ? q : null;
}
// Куда попадает роль после входа/регистрации: студента сразу ведём в Академию.
const AFTER = { student: '/academy' };
export async function enter(res, router, next, fallback) {
  signIn(res);
  await load();
  const role = res.user.role;
  router.push(safeNext(role, next) || AFTER[role] || fallback || HOME[role]);
}
/** Пользователь сайта. Сессия администратора на сайте не видна — из сайта в панель управления не попасть. */
export const siteUser = () => (S.me && S.me.role !== 'admin' ? S.me : null);
