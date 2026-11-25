// Роли, доступные при регистрации, и оформление их страниц.
// Тексты — геттеры из словаря (locales/*.js → roles), поэтому меняются вместе с языком сайта.
import { t, tm } from '../../i18n.js';

const ICONS = {
  help: ['heart', 'pin', 'bell', 'shield'],
  volunteer: ['coin', 'car', 'pin', 'book'],
  student: ['play', 'quiz', 'coin', 'trophy'],
};

function role(key, base) {
  const r = { ...base };
  for (const f of ['title', 'short', 'choose', 'lead', 'button', 'after']) {
    Object.defineProperty(r, f, { enumerable: true, get: () => t(`roles.${key}.${f}`) });
  }
  Object.defineProperty(r, 'perks', { enumerable: true, get: () => tm(`roles.${key}.perks`).map((text, i) => [ICONS[key][i], text]) });
  return r;
}

export const ROLES = {
  help: role('help', { role: 'user', icon: 'heart', color: '#7c4dde', color2: '#3b5bf0' }),
  volunteer: role('volunteer', { role: 'helper', icon: 'hand', color: '#1fa85c', color2: '#0f766e' }),
  student: role('student', { role: 'student', icon: 'book', color: '#f08a24', color2: '#e0527a' }),
};
