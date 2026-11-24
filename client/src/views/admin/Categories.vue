<script setup>
import { reactive, ref } from 'vue';
import { S, act } from '../../store.js';
import { ICONS } from '@shared/constants.js';
import Icon from '../../components/Icon.vue';
import { PageHead, CatIcon } from '../../components/ui.js';

const blank = () => ({ name: '', icon: 'heart', descr: '', examples: '' });
const f = reactive(blank()), editId = ref(null);
const tot = () => S.reqs.length || 1;
const count = (c) => S.reqs.filter((r) => r.cat === c.name).length;

function edit(c) { editId.value = c.id; Object.assign(f, { name: c.name, icon: c.icon, descr: c.descr, examples: c.examples.join('\n') }); }
function reset() { editId.value = null; Object.assign(f, blank()); }
const save = () => (editId.value
  ? act((api) => api.patch(`/categories/${editId.value}`, f), 'Категория сохранена')
  : act((api) => api.post('/categories', f), 'Категория добавлена')).then(reset).catch(() => {});
</script>

<template>
  <PageHead title="Категории" sub="Категории видят люди, когда создают заявку, а описание и примеры — на странице «Направления помощи».">
    <RouterLink class="btn ghost" to="/categories" target="_blank"><Icon name="info" />Страница для посетителей</RouterLink>
  </PageHead>
  <div class="grid2">
    <div class="card">
      <div class="rows">
        <div v-for="c in S.cats" :key="c.id" class="row" style="align-items:flex-start">
          <CatIcon :cat="c.name" :size="34" />
          <span class="grow">
            <span class="t">{{ c.name }} <span class="note">· {{ count(c) }} заявок</span></span>
            <span class="s" style="display:block">{{ c.descr || 'Описание не заполнено' }}</span>
            <div class="trk" style="height:6px;background:var(--line);border-radius:99px;margin-top:6px;overflow:hidden"><div :style="{ height: '100%', width: count(c) / tot() * 100 + '%', background: c.color }" /></div>
          </span>
          <button class="btn ghost sm" type="button" @click="edit(c)"><Icon name="edit" />Изменить</button>
        </div>
      </div>
    </div>
    <form class="card fcol" novalidate @submit.prevent="save">
      <div class="ch" style="margin:0"><h2>{{ editId ? 'Редактирование категории' : 'Новая категория' }}</h2>
        <button v-if="editId" class="iconbtn sm" type="button" aria-label="Отменить" @click="reset"><Icon name="x" /></button></div>
      <label class="f">Название<input v-model="f.name" type="text" autocomplete="off" placeholder="Например, Животные"></label>
      <div><div style="font-weight:700;font-size:13px;margin-bottom:8px">Значок</div>
        <div class="chips" style="margin:0">
          <button v-for="i in ICONS" :key="i" type="button" class="chip" :aria-pressed="f.icon === i" :aria-label="i" @click="f.icon = i"><Icon :name="i" :size="16" /></button>
        </div>
      </div>
      <label class="f">Что входит в категорию<textarea v-model="f.descr" maxlength="300" rows="3" placeholder="Коротко объясните, с чем здесь помогают и чего не делают" /></label>
      <label class="f">Примеры заявок <span class="note">каждый с новой строки, до 10</span><textarea v-model="f.examples" rows="4" placeholder="Выгулять собаку&#10;Отвезти кошку к ветеринару" /></label>
      <button class="btn"><Icon :name="editId ? 'check' : 'plus'" />{{ editId ? 'Сохранить' : 'Добавить' }}</button>
    </form>
  </div>
</template>
