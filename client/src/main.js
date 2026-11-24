import { createApp } from 'vue';
import App from './App.vue';
import { router } from './router.js';
import { applyTheme, setupAuthExpiry } from './store.js';
import './styles.css';

applyTheme();
setupAuthExpiry(router);
createApp(App).use(router).mount('#app');
