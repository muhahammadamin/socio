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

// Автоматическая рассылка заявок помощникам.
export const DISPATCH = {
  widenMin: 15,    // через столько минут без ответа заявку видят помощники всего города
  escalateMin: 60, // ещё через столько — координатор получает сигнал назначить вручную
  maxActive: 3,    // помощнику с таким числом незавершённых заявок новые не предлагаются
};
// Причины отказа — видны координатору, помогают понять, почему заявку не берут.
export const DECLINE_REASONS = {
  far: 'Далеко от меня',
  busy: 'Нет времени сейчас',
  skills: 'Не мой профиль',
  other: 'Другая причина',
};

// Сколько коинов начисляется. Коины обмениваются на награды: сертификат, пополнение связи, мерч и т. п.
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

/* Телефоны Узбекистана: +998 и 9 цифр — код оператора/города (2) и номер (7), вид +998 90 123 45 67. */
export const PHONE_CODES = ['20', '33', '50', '55', '61', '62', '65', '66', '67', '69', '70', '71', '72', '73', '74', '75', '76', '77', '78', '79', '88', '90', '91', '93', '94', '95', '97', '98', '99'];
/** 9 цифр номера после +998 (лишнее отрезается). */
export function phoneLocal(p) {
  const v = String(p ?? ''), d = phoneKey(v);
  return (d.startsWith('998') && (d.length > 9 || v.trim().startsWith('+')) ? d.slice(3) : d).slice(0, 9);
}
/** Вид +998 90 123 45 67; для неполного номера — сколько набрано. */
export function formatPhone(p) {
  const d = phoneLocal(p);
  return ['+998', d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(' ');
}
/** Номер настоящий: ровно 9 цифр после +998 и существующий код оператора или города. */
export const isValidPhone = (p) => { const d = phoneLocal(p); return d.length === 9 && PHONE_CODES.includes(d.slice(0, 2)); };

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
