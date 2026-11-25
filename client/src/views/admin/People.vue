<script setup>
import { computed, ref } from 'vue';
import { S } from '../../store.js';
import { fdate } from '../../util.js';
import { SKILLS } from '@shared/constants.js';
import Icon from '../../components/Icon.vue';
import { PageHead, Avatar, Empty } from '../../components/ui.js';

// Все участники платформы в одной таблице: нуждающиеся в помощи, волонтёры (помощники) и студенты.
const KINDS = {
  all: { t: 'Все', icon: 'users', color: 'blue' },
  user: { t: 'Нуждаются в помощи', one: 'Нужна помощь', icon: 'heart', color: 'purple' },
  helper: { t: 'Волонтёры', one: 'Волонтёр', icon: 'hand', color: 'green' },
  student: { t: 'Студенты', one: 'Студент', icon: 'book', color: 'orange' },
};
const kind = ref('all'), sort = ref('new');

const catName = (id) => S.cats.find((c) => c.id === id)?.name;
const people = computed(() => [
  ...S.users.map((u) => {
    const l = S.reqs.filter((r) => r.userId === u.id);
    return { ...u, info: (u.needs || []).map(catName).filter(Boolean).join(', '), stat: `заявок: ${l.length}, выполнено: ${l.filter((r) => r.status === 'done').length}` };
  }),
  ...S.helpers.map((h) => ({
    ...h, info: (h.skills || []).map((k) => SKILLS[k]).join(', '),
    stat: `выполнено: ${h.done}${h.rating ? `, рейтинг ${h.rating}` : ''}`, badge: h.verified ? null : 'ждёт проверки',
  })),
  ...S.students.map((s) => ({ ...s, info: s.school || '', stat: `курсов: ${s.coursesDone}, коины: ${s.coins}` })),
]);
const counts = computed(() => ({ all: people.value.length, user: S.users.length, helper: S.helpers.length, student: S.students.length }));

const q = computed(() => S.q.trim().toLowerCase());
const rows = computed(() => people.value
  .filter((p) => kind.value === 'all' || p.role === kind.value)
  .filter((p) => !q.value || `${p.name} ${p.phone} ${p.dist} ${p.info}`.toLowerCase().includes(q.value))
  .sort(sort.value === 'name' ? (a, b) => a.name.localeCompare(b.name, 'ru') : (a, b) => (b.createdAt || 0) - (a.createdAt || 0)));

// выгрузка текущего списка в CSV (открывается в Excel)
function exportCsv() {
  const head = ['Имя', 'Кто', 'Телефон', 'Район', 'Подробнее', 'Статистика', 'Дата регистрации', 'Вход через Google'];
  const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = rows.value.map((p) => [p.name, KINDS[p.role].one, p.phone, p.dist, p.info, p.stat, p.createdAt ? fdate(p.createdAt) : '', p.google ? 'да' : 'нет'].map(cell).join(';'));
  const blob = new Blob(['﻿' + [head.map(cell).join(';'), ...lines].join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `socio-участники-${fdate(Date.now())}.csv` });
  a.click();
  URL.revokeObjectURL(a.href);
}
</script>

<template>
  <PageHead title="Все участники" sub="Все, кто зарегистрирован на платформе: люди, которым нужна помощь, волонтёры и студенты.">
    <button class="btn ghost" type="button" :disabled="!rows.length" @click="exportCsv"><Icon name="list" />Скачать для Excel</button>
  </PageHead>

  <div class="ptabs" role="tablist" aria-label="Кого показать">
    <button v-for="(k, key) in KINDS" :key="key" type="button" role="tab" class="ptab" :class="[k.color, { on: kind === key }]" :aria-selected="kind === key" @click="kind = key">
      <span class="pi"><Icon :name="k.icon" :size="18" /></span>
      <span><b>{{ counts[key] }}</b><small>{{ k.t }}</small></span>
    </button>
  </div>

  <div class="card">
    <div class="ch">
      <h2>{{ KINDS[kind].t }} <span class="note">· {{ rows.length }}</span></h2>
      <label><span class="sr">Сортировка</span>
        <select v-model="sort" style="width:auto;font-weight:700"><option value="new">Сначала новые</option><option value="name">По имени</option></select>
      </label>
    </div>
    <p v-if="q" class="note" style="margin:-4px 0 10px">Поиск: «{{ S.q }}». Строка поиска — вверху страницы.</p>
    <div v-if="rows.length" class="table-wrap">
      <table>
        <thead><tr><th>Участник</th><th>Кто</th><th>Район</th><th>Подробнее</th><th>Статистика</th><th>Регистрация</th></tr></thead>
        <tbody>
          <tr v-for="p in rows" :key="p.role + p.id">
            <td><span style="display:inline-flex;align-items:center;gap:10px"><Avatar :name="p.name" :size="34" /><span><b>{{ p.name }}</b><div class="note">{{ p.phone }}<template v-if="p.google"> · Google</template></div></span></span></td>
            <td><span class="pill" :class="KINDS[p.role].color">{{ KINDS[p.role].one }}</span><div v-if="p.badge" class="note" style="margin-top:4px">{{ p.badge }}</div></td>
            <td>{{ p.dist }}</td>
            <td style="max-width:260px">{{ p.info || '—' }}</td>
            <td class="note">{{ p.stat }}</td>
            <td class="num">{{ p.createdAt ? fdate(p.createdAt) : '—' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <Empty v-else :title="q ? 'Никого не нашли' : 'Пока никого нет'" :text="q ? 'Попробуйте изменить запрос в строке поиска.' : 'Участники появятся здесь после регистрации на сайте.'" />
  </div>
</template>

<style scoped>
.ptabs{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-bottom:16px}
.ptab{display:flex;align-items:center;gap:12px;padding:14px 16px;border:0;border-radius:16px;background:var(--surface);box-shadow:inset 0 0 0 1px var(--line);color:var(--ink);font:inherit;text-align:left;cursor:pointer;transition:box-shadow .15s,transform .15s}
.ptab:hover{transform:translateY(-1px)}
.ptab.on{box-shadow:inset 0 0 0 2px var(--c)}
.ptab b{display:block;font-size:24px;font-weight:800;line-height:1.1}
.ptab small{color:var(--muted);font-weight:700;font-size:13px}
.pi{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;color:var(--c);background:color-mix(in srgb,var(--c) 15%,transparent);flex:none}
.blue{--c:var(--p-blue)}.purple{--c:var(--p-purple)}.green{--c:var(--p-green)}.orange{--c:var(--p-orange)}
</style>
