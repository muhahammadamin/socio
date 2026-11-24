import { useRoute, useRouter } from 'vue-router';
import { ST } from './util.js';

/** Открыть карточку заявки: ?r=ID в адресе, чтобы ссылкой можно было поделиться. */
export function useOpenRequest() {
  const router = useRouter(), route = useRoute();
  return (id) => router.push({ path: route.path, query: { ...route.query, r: id } });
}

export const reqPins = (list) => list.map((r) => ({ x: r.x, y: r.y, id: r.id, t: `${r.title} · ${ST[r.status].t}`, c: `var(${ST[r.status].p})` }));
