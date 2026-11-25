// Общие константы для сервера и клиента.

// Районы Ташкента и их координаты на схематичной карте (viewBox 400×260).
export const DISTRICTS = {
  'Учтепинский район': [95, 85],
  'Алмазар': [160, 60],
  'Юнусабад': [235, 70],
  'Мирзо-Улугбек': [305, 100],
  'Шайхантахур': [170, 118],
  'Мирабад': [238, 135],
  'Яшнабад': [322, 170],
  'Чиланзар': [105, 165],
  'Сергели': [190, 220],
};
export const DISTRICT_NAMES = Object.keys(DISTRICTS);

export const MAP_W = 400;
export const MAP_H = 260;

export const STATUSES = ['new', 'assigned', 'accepted', 'progress', 'done'];

// Какие переходы статуса разрешены помощнику.
export const HELPER_TRANSITIONS = { assigned: 'accepted', accepted: 'progress', progress: 'done' };

export const ICONS = ['heart', 'user', 'users', 'pill', 'bag', 'home', 'star', 'shield'];
export const CAT_COLORS = ['#0ea5b7', '#d946a8', '#8a6d3b', '#e0527a', '#3b5bf0', '#2fae62', '#f26b4f', '#7c5ce6'];

// Направления, в которых волонтёр/помощник может помочь.
export const SKILLS = {
  legal: 'Юридическая помощь',
  medical: 'Медицина',
  psych: 'Психологическая поддержка',
  elderly: 'Уход за пожилыми',
  kids: 'Дети и обучение',
  shopping: 'Покупки и доставка',
  transport: 'Транспорт (есть машина)',
  repair: 'Ремонт и бытовые дела',
  tech: 'Техника и интернет',
  translate: 'Переводы и документы',
};
export const SKILL_KEYS = Object.keys(SKILLS);

// Сколько коинов начисляется. Коины можно обменять на награды (скидки на такси и т. п.).
export const COINS = {
  requestDone: 20, // помощнику за выполненную заявку
  perStar: 2,      // помощнику за каждую звезду в оценке
  courseDone: 15,  // студенту или помощнику за пройденный курс
};

export function nearestDistrict(x, y) {
  let best = DISTRICT_NAMES[0], bd = Infinity;
  for (const n of DISTRICT_NAMES) {
    const [dx, dy] = DISTRICTS[n];
    const d = Math.hypot(dx - x, dy - y);
    if (d < bd) { bd = d; best = n; }
  }
  return best;
}

export const phoneKey = (p) => String(p ?? '').replace(/\D/g, '');

/** Откуда человек пришёл на сайт. Свои метки из ссылок (?ref=blogger) показываются как есть. */
export const SOURCES = {
  telegram: { t: 'Telegram', color: '#229ed9' },
  instagram: { t: 'Instagram', color: '#d62976' },
  facebook: { t: 'Facebook', color: '#1877f2' },
  youtube: { t: 'YouTube', color: '#e62117' },
  tiktok: { t: 'TikTok', color: '#25c2c6' },
  whatsapp: { t: 'WhatsApp', color: '#25d366' },
  vk: { t: 'ВКонтакте', color: '#0077ff' },
  google: { t: 'Google', color: '#f4b400' },
  yandex: { t: 'Яндекс', color: '#fc3f1d' },
  other: { t: 'Другие сайты', color: '#7c5ce6' },
  direct: { t: 'Прямой заход', color: '#8a94a6' },
  admin: { t: 'Добавлен администратором', color: '#3b5bf0' },
  unknown: { t: 'Неизвестно', color: '#b8bfcc' },
};
export const sourceName = (k) => SOURCES[k || 'unknown']?.t || `Метка «${k}»`;
