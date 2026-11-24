<script setup>
import { S } from '../store.js';
import RoleHeader from './RoleHeader.vue';
// Академия открыта только зарегистрированным студентам и волонтёрам — у неё та же шапка, что и у их сайта.
</script>

<template>
  <RoleHeader v-if="S.me && S.me.role !== 'admin'" />
</template>
