// Определяем, откуда человек пришёл на сайт: метка в ссылке (?ref= / utm_source=), адрес страницы,
// с которой перешли (referrer), или встроенный браузер приложения (Instagram, Facebook, TikTok).
// Telegram часто не передаёт referrer, поэтому для своих постов лучше давать ссылки с меткой: ?ref=tg

const ALIAS = {
  tg: 'telegram', telegram: 'telegram', 't.me': 'telegram',
  ig: 'instagram', insta: 'instagram', instagram: 'instagram',
  fb: 'facebook', facebook: 'facebook',
  yt: 'youtube', youtube: 'youtube',
  tt: 'tiktok', tiktok: 'tiktok',
  wa: 'whatsapp', whatsapp: 'whatsapp',
  vk: 'vk', google: 'google', yandex: 'yandex',
};
// домены и Android-приложения (referrer вида android-app://org.telegram.messenger/)
const HOSTS = [
  [/(^|\.)(t\.me|telegram\.(org|me))$|^org\.telegram|telegram/, 'telegram'],
  [/(^|\.)instagram\.com$|^com\.instagram/, 'instagram'],
  [/(^|\.)(facebook\.com|fb\.com|fb\.me|messenger\.com)$|^com\.facebook/, 'facebook'],
  [/(^|\.)(youtube\.com|youtu\.be)$|^com\.google\.android\.youtube/, 'youtube'],
  [/(^|\.)tiktok\.com$|^com\.(zhiliaoapp|ss\.android)/, 'tiktok'],
  [/(^|\.)(whatsapp\.com|wa\.me)$|^com\.whatsapp/, 'whatsapp'],
  [/(^|\.)(vk\.com|vk\.ru)$|^com\.vkontakte/, 'vk'],
  [/(^|\.)google\.[a-z.]+$|^com\.google\.android\.googlequicksearchbox/, 'google'],
  [/(^|\.)(yandex\.[a-z.]+|ya\.ru)$|^ru\.yandex/, 'yandex'],
];
const APPS = [[/Instagram/, 'instagram'], [/FBAN|FBAV|FB_IAB/, 'facebook'], [/TikTok|musical_ly|BytedanceWebview/, 'tiktok'], [/Telegram/, 'telegram']];

const clean = (v, n) => String(v ?? '').trim().slice(0, n);
const hostOf = (url) => {
  try { const u = new URL(url); return (u.protocol === 'android-app:' ? u.host : u.hostname).toLowerCase().replace(/^www\./, ''); }
  catch { return ''; }
};

/**
 * raw — то, что прислал браузер при первом заходе: { ref, campaign, referrer }.
 * ownHosts — адреса самого сайта: переход внутри сайта не считается источником.
 * Возвращает { source, detail }.
 */
export function classifySource(raw, ua = '', ownHosts = []) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const campaign = clean(r.campaign, 60);
  const ref = clean(r.ref, 40).toLowerCase();
  if (ref) {
    const key = ALIAS[ref] || ref.replace(/[^a-z0-9_-]/g, '').slice(0, 32);
    if (key && !['direct', 'admin', 'unknown', 'other'].includes(key)) return { source: key, detail: campaign };
  }
  const host = hostOf(clean(r.referrer, 300));
  if (host && !ownHosts.includes(host)) {
    for (const [re, key] of HOSTS) if (re.test(host)) return { source: key, detail: campaign || host };
    return { source: 'other', detail: host };
  }
  for (const [re, key] of APPS) if (re.test(ua)) return { source: key, detail: campaign || 'встроенный браузер приложения' };
  return { source: 'direct', detail: campaign };
}

/** Адреса самого сайта (из SITE_URL и заголовка Host). */
export const ownHosts = (req) => [hostOf(process.env.SITE_URL || ''), String(req.hostname || '').toLowerCase().replace(/^www\./, '')].filter(Boolean);
