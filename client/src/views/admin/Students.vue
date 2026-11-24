<script setup>
import { computed } from 'vue';
import { S, act } from '../../store.js';
import { SKILLS } from '@shared/constants.js';
import { PageHead, Avatar, Empty } from '../../components/ui.js';

const q = computed(() => S.q.trim().toLowerCase());
const rows = computed(() => S.students.filter((s) => !q.value || `${s.name} ${s.phone} ${s.school} ${s.dist}`.toLowerCase().includes(q.value)));
const promote = (s) => { if (confirm(`Перевести ${s.name} в помощники? Коины и прогресс обучения сохранятся.`)) act((api) => api.post(`/students/${s.id}/promote`), `${s.name} теперь помощник`).catch(() => {}); };
</script>

<template>
  <PageHead title="Студенты" sub="Учатся в учебном центре, получают коины за курсы. Готовых помогать можно перевести в помощники." />
  <div class="card">
    <div v-if="rows.length" class="table-wrap">
      <table>
        <thead><tr><th>Студент</th><th>Учебное заведение</th><th>Район</th><th>Курсов пройдено</th><th>Материалов</th><th>Коины</th><th /></tr></thead>
        <tbody>
          <tr v-for="s in rows" :key="s.id">
            <td><span style="display:inline-flex;align-items:center;gap:10px"><Avatar :name="s.name" :size="34" /><span><b>{{ s.name }}</b><div class="note">{{ s.phone }}</div></span></span></td>
            <td>{{ s.school }}</td>
            <td>{{ s.dist }}</td>
            <td class="num"><b>{{ s.coursesDone }}</b></td>
            <td class="num">{{ s.passedItems }}</td>
            <td class="num">{{ s.coins }}</td>
            <td><button class="btn sm" type="button" @click="promote(s)">Сделать помощником</button></td>
          </tr>
        </tbody>
      </table>
    </div>
    <Empty v-else title="Студентов пока нет" text="Студенты регистрируются на сайте во вкладке «Студенту»." />
  </div>
</template>
