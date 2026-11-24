<script setup>
import { computed, ref } from 'vue';
import { S, act } from '../../store.js';
import { ago } from '../../util.js';
import { SKILLS } from '@shared/constants.js';
import Icon from '../../components/Icon.vue';
import { PageHead, Avatar, Empty } from '../../components/ui.js';

// Волонтёры регистрируются сами и сразу получают кабинет помощника.
// Координатор знакомится с ними по телефону и подтверждает профиль — только после этого им назначают заявки.
const fresh = computed(() => S.helpers.filter((h) => !h.verified));
const verify = (h) => act((api) => api.post(`/helpers/${h.id}/verify`), `${h.name} проверен — можно назначать заявки`).catch(() => {});

// старые анкеты, оставленные до перехода на регистрацию
const issued = ref(null);
const approve = (v) => act((api) => api.post(`/volunteers/${v.id}/approve`), `${v.name} теперь помощник`).then((r) => { issued.value = r; }).catch(() => {});
const reject = (v) => { if (confirm(`Отклонить заявку ${v.name}?`)) act((api) => api.del(`/volunteers/${v.id}`), 'Заявка отклонена').catch(() => {}); };
</script>

<template>
  <PageHead title="Волонтёры" sub="Новые волонтёры регистрируются сами. Позвоните, познакомьтесь и подтвердите профиль — после этого им можно назначать заявки." />
  <div class="card">
    <div class="ch"><h2>Ждут проверки</h2><span class="note">{{ fresh.length }}</span></div>
    <div v-if="fresh.length" class="rows">
      <div v-for="h in fresh" :key="h.id" class="row">
        <Avatar :name="h.name" :size="40" />
        <span class="grow">
          <span class="t">{{ h.name }} <span v-if="h.google" class="note">· Google</span></span>
          <span class="s"><Icon name="pin" />{{ h.dist }} · <Icon name="phone" />{{ h.phone }}</span>
          <span v-if="h.skills?.length" class="skills"><span v-for="k in h.skills" :key="k" class="skill">{{ SKILLS[k] }}</span></span>
        </span>
        <a class="btn ghost sm" :href="`tel:${h.phone.replace(/[^\d+]/g, '')}`"><Icon name="phone" />Позвонить</a>
        <button class="btn green sm" type="button" @click="verify(h)"><Icon name="check" />Подтвердить</button>
      </div>
    </div>
    <Empty v-else title="Все волонтёры проверены" text="Новые регистрации появятся здесь." />
  </div>

  <div v-if="S.vols.length" class="card" style="margin-top:16px">
    <div class="ch"><h2>Старые анкеты</h2><span class="note">оставлены до перехода на регистрацию</span></div>
    <div v-if="issued" class="formerr" style="background:var(--t-green);color:var(--s-green);margin-bottom:10px">
      {{ issued.name }}: телефон <span class="secret">{{ issued.phone }}</span>, пароль <span class="secret">{{ issued.password }}</span> — пароль показывается один раз.
    </div>
    <div class="rows">
      <div v-for="v in S.vols" :key="v.id" class="row">
        <Avatar :name="v.name" :size="40" />
        <span class="grow"><span class="t">{{ v.name }}</span><span class="s">{{ v.dist }} · {{ v.phone }}</span><span class="s">{{ v.about }}</span></span>
        <time>{{ ago(v.created_at) }}</time>
        <button class="btn sm" type="button" @click="approve(v)">Сделать помощником</button>
        <button class="btn red sm" type="button" @click="reject(v)">Отклонить</button>
      </div>
    </div>
  </div>
</template>
