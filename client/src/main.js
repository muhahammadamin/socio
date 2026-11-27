import { createApp } from 'vue';
import App from './App.vue';
import { router } from './router.js';
import { applyTheme, setupAuthExpiry } from './store.js';
import './styles.css';
import { countVisit } from './visit.js';
import { reveal, autoReveal, scrollProgress, ripples } from './fx.js';
import { nextTick } from 'vue';

applyTheme();
setupAuthExpiry(router);
createApp(App).use(router).directive('reveal', reveal).mount('#app');
countVisit();

// оформление на всех страницах: проявление блоков при прокрутке, полоса прокрутки, «волна» на кнопках
const updBar = scrollProgress();
ripples();
// страница и данные подгружаются не сразу — проверяем несколько раз после перехода
router.afterEach(() => nextTick(() => { updBar?.(); for (const t of [60, 400, 1200]) setTimeout(autoReveal, t); }));
