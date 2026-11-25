// Счётчик посетителей: каждый браузер получает анонимный случайный id и один раз за сессию отмечается на сервере.
import { ref } from 'vue';
import { api } from './api.js';

export const visitors = ref(null); // свежее число посетителей (после отметки)

function visitorId() {
  try {
    let id = localStorage.getItem('socio.vid');
    if (!id) { id = crypto.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`; localStorage.setItem('socio.vid', id); }
    return id;
  } catch { return null; } // хранилище недоступно — не считаем, чтобы не плодить дубли
}

export async function countVisit() {
  const id = visitorId();
  if (!id) return;
  try { visitors.value = (await api.post('/visit', { id })).visitors; } catch { /* не мешаем работе сайта */ }
}
