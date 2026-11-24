<script setup>
import { computed } from 'vue';
import { S } from '../../store.js';
import { PageHead, Avatar } from '../../components/ui.js';

const q = computed(() => S.q.trim().toLowerCase());
const rows = computed(() => S.users
  .filter((u) => !q.value || `${u.name} ${u.phone} ${u.dist}`.toLowerCase().includes(q.value))
  .map((u) => { const l = S.reqs.filter((r) => r.userId === u.id); return { ...u, n: l.length, d: l.filter((r) => r.status === 'done').length }; }));
</script>

<template>
  <PageHead title="Пользователи" sub="Люди, которые обращаются за помощью." />
  <div class="card">
    <div class="table-wrap">
      <table>
        <thead><tr><th>Имя</th><th>Район</th><th>Телефон</th><th>Нужна помощь</th><th>Заявок</th><th>Выполнено</th><th>Баланс добра</th></tr></thead>
        <tbody>
          <tr v-for="u in rows" :key="u.id">
            <td><span style="display:inline-flex;align-items:center;gap:10px"><Avatar :name="u.name" :size="34" /><b>{{ u.name }}</b></span></td>
            <td>{{ u.dist }}</td><td>{{ u.phone }}</td>
            <td><span v-if="u.needs?.length" class="skills" style="margin:0;max-width:240px"><span v-for="id in u.needs" :key="id" class="skill">{{ S.cats.find((c) => c.id === id)?.name }}</span></span><span v-else class="note">—</span></td>
            <td class="num">{{ u.n }}</td><td class="num">{{ u.d }}</td><td class="num">{{ u.balance }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
