<script setup>
import { computed } from 'vue';
import { S, HOME, toggleTheme } from '../store.js';
import { siteUser } from '../authflow.js';
import Icon from './Icon.vue';
import { Logo } from './ui.js';

const me = computed(() => siteUser()); // администратор на сайте выглядит как гость
</script>

<template>
  <header class="sitebar">
    <div class="in">
      <RouterLink class="logo" to="/"><Logo /><div><strong>Socio</strong><small>Помогаем вместе</small></div></RouterLink>
      <nav class="sitenav" aria-label="Разделы сайта">
        <RouterLink to="/#how">Как это работает</RouterLink>
        <RouterLink to="/categories">Направления</RouterLink>
        <RouterLink to="/volunteers">Волонтёрам</RouterLink>
      </nav>
      <div class="act">
        <button class="iconbtn" type="button" :aria-label="S.theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'" @click="toggleTheme"><Icon :name="S.theme === 'dark' ? 'sun' : 'moon'" /></button>
        <RouterLink v-if="me" class="btn" :to="HOME[me.role]">Мой кабинет</RouterLink>
        <template v-else>
          <RouterLink class="btn ghost" to="/login">Войти</RouterLink>
          <RouterLink class="btn" to="/register">Регистрация</RouterLink>
        </template>
      </div>
    </div>
  </header>
</template>
