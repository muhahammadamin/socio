// SEO: мета-теги для каждой публичной страницы прямо в HTML (поисковики видят их без JavaScript),
// robots.txt и sitemap.xml. Адрес сайта — из SITE_URL или из заголовков запроса.
// Языки: русский — без параметра, узбекский и английский — ?lang=uz / ?lang=en (связаны через hreflang).

import { PAGE_META, FAQ, BRAND, LANGS, KEYWORDS, SEO_NAV, pageSeo } from '../shared/seo.js';
import { GUIDE } from '../shared/guide.js';

// Закрытые разделы: кабинеты, панель управления, вход.
const PRIVATE = /^\/(admin|helper|student|app|academy|login)(\/|$)/;
const DISALLOW = ['/api/', '/admin', '/helper', '/student', '/app', '/academy', '/login'];
const OG_LOCALE = { ru: 'ru_RU', uz: 'uz_UZ', en: 'en_US' };
const CITY = { ru: 'Ташкент', uz: 'Toshkent', en: 'Tashkent' };

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const siteUrl = (req) => (process.env.SITE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');

const normPath = (p) => (p.length > 1 ? p.replace(/\/+$/, '') : p);
const langUrl = (base, path, l) => `${base}${path}${l === 'ru' ? '' : `?lang=${l}`}`;
const reqLang = (req) => (LANGS.includes(req.query.lang) ? req.query.lang : 'ru');

function jsonLd(base, lang) {
  const home = pageSeo('/', lang);
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'NGO',
        '@id': `${base}/#org`,
        name: BRAND,
        url: `${base}/`,
        logo: `${base}/favicon.svg`,
        description: home.description,
        areaServed: { '@type': 'City', name: CITY[lang] },
        address: { '@type': 'PostalAddress', addressLocality: CITY[lang], addressCountry: 'UZ' },
        knowsAbout: KEYWORDS[lang].split(', '),
      },
      {
        '@type': 'WebSite',
        '@id': `${base}/#site`,
        name: BRAND,
        url: `${base}/`,
        inLanguage: LANGS,
        publisher: { '@id': `${base}/#org` },
      },
      faqLd(lang, FAQ[lang]),
    ],
  };
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}

const faqLd = (lang, list) => ({
  '@type': 'FAQPage',
  inLanguage: lang,
  mainEntity: list.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
});
// Статья о волонтёрстве: Article + FAQ + «хлебные крошки»
function guideLd(base, lang, url) {
  const g = GUIDE[lang];
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Article', headline: g.h1, description: pageSeo('/volunteering', lang).description, inLanguage: lang, url, mainEntityOfPage: url,
        author: { '@type': 'Organization', name: BRAND, url: `${base}/` }, publisher: { '@type': 'Organization', name: BRAND, logo: { '@type': 'ImageObject', url: `${base}/favicon.svg` } },
        about: { '@type': 'Thing', name: lang === 'en' ? 'Volunteering' : lang === 'uz' ? 'Volontyorlik' : 'Волонтёрство' } },
      faqLd(lang, g.faq),
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: BRAND, item: langUrl(base, '/', lang) },
        { '@type': 'ListItem', position: 2, name: g.h1, item: url }] },
    ],
  };
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}

/* Текст страницы в самом HTML: у каждой страницы — свой заголовок и описание, у статьи — весь текст.
   Vue заменяет этот блок при запуске; поисковики и браузеры без JavaScript видят его сразу. */
function renderBody(p, lang) {
  const page = pageSeo(p, lang) || pageSeo('/', lang);
  const link = (href, text) => `<a href="${esc(href + (lang === 'ru' ? '' : `?lang=${lang}`))}">${esc(text)}</a>`;
  const out = [];
  if (p === '/volunteering') {
    const g = GUIDE[lang];
    out.push(`<h1>${esc(g.h1)}</h1>`, `<p>${esc(g.lead)}</p>`);
    for (const [h, ...blocks] of g.sections) {
      out.push(`<h2>${esc(h)}</h2>`);
      for (const b of blocks) out.push(Array.isArray(b) ? `<ul>${b.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : `<p>${esc(b)}</p>`);
    }
    out.push(`<h2>${esc(g.faqTitle)}</h2>`, ...g.faq.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`));
  } else {
    out.push(`<h1>${esc(page.title.replace(/\s*\|\s*Socio$/, ''))}</h1>`, `<p>${esc(page.description)}</p>`);
    if (p === '/') out.push(...FAQ[lang].map(([q, a]) => `<h2>${esc(q)}</h2><p>${esc(a)}</p>`));
  }
  out.push(`<ul>${SEO_NAV[lang].filter(([h]) => h !== p).map(([h, t]) => `<li>${link(h, t)}</li>`).join('')}</ul>`);
  return out.join('\n    ');
}

// Подтверждение сайта в Google Search Console и Яндекс.Вебмастере (коды — из переменных окружения).
const verifyTags = () => [
  process.env.GOOGLE_SITE_VERIFICATION && `<meta name="google-site-verification" content="${esc(process.env.GOOGLE_SITE_VERIFICATION)}">`,
  process.env.YANDEX_VERIFICATION && `<meta name="yandex-verification" content="${esc(process.env.YANDEX_VERIFICATION)}">`,
].filter(Boolean);

export function renderHead(html, req) {
  const base = siteUrl(req);
  const p = normPath(req.path);
  const lang = reqLang(req);
  const page = pageSeo(p, lang);
  const { title, description } = page || pageSeo('/', lang);
  const url = page ? langUrl(base, p, lang) : `${base}/`;

  const tags = [
    `<link rel="canonical" href="${esc(url)}">`,
    `<meta name="robots" content="${PRIVATE.test(p) || !page ? 'noindex, follow' : 'index, follow, max-image-preview:large'}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="${BRAND}">`,
    `<meta property="og:locale" content="${OG_LOCALE[lang]}">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(description)}">`,
    `<meta property="og:url" content="${esc(url)}">`,
    `<meta name="twitter:card" content="summary">`,
    `<meta name="twitter:title" content="${esc(title)}">`,
    `<meta name="twitter:description" content="${esc(description)}">`,
    ...verifyTags(),
  ];
  if (page) {
    for (const l of LANGS) tags.push(`<link rel="alternate" hreflang="${l}" href="${esc(langUrl(base, p, l))}">`);
    tags.push(`<link rel="alternate" hreflang="x-default" href="${esc(langUrl(base, p, 'ru'))}">`);
  }
  if (p === '/') tags.push(jsonLd(base, lang));
  if (p === '/volunteering') tags.push(guideLd(base, lang, url));

  return html
    .replace(/<!--seo-->[\s\S]*?<!--\/seo-->/, () => `<!--seo-->\n    ${renderBody(page ? p : '/', lang)}\n    <!--/seo-->`)
    .replace(/<html lang="[^"]*">/, `<html lang="${lang}">`)
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(description)}">`)
    .replace(/<meta name="keywords" content="[^"]*">/, `<meta name="keywords" content="${esc(KEYWORDS[lang])}">`)
    .replace('</head>', `${tags.join('\n')}\n</head>`);
}

// IndexNow (Яндекс, Bing): ключ публичный по протоколу — файл с ним доказывает, что сайт наш.
export const INDEXNOW_KEY = process.env.INDEXNOW_KEY || 'f3a22d28e3a9384d1bc25e5f53cd3884';

export function seoRoutes(app) {
  app.get(`/${INDEXNOW_KEY}.txt`, (req, res) => res.type('text/plain').send(INDEXNOW_KEY));
  app.get('/robots.txt', (req, res) => {
    const base = siteUrl(req);
    res.type('text/plain').set('Cache-Control', 'public, max-age=3600').send(
      ['User-agent: *', 'Allow: /', ...DISALLOW.map((d) => `Disallow: ${d}`), '', `Sitemap: ${base}/sitemap.xml`, ''].join('\n'),
    );
  });
  app.get('/sitemap.xml', (req, res) => {
    const base = siteUrl(req);
    const today = new Date().toISOString().slice(0, 10);
    const urls = [];
    for (const [p, m] of Object.entries(PAGE_META)) {
      const alts = LANGS.map((l) => `<xhtml:link rel="alternate" hreflang="${l}" href="${esc(langUrl(base, p, l))}"/>`).join('');
      for (const l of LANGS) {
        urls.push(`  <url><loc>${esc(langUrl(base, p, l))}</loc>${alts}<lastmod>${today}</lastmod><changefreq>${m.changefreq}</changefreq><priority>${m.priority}</priority></url>`);
      }
    }
    res.type('application/xml').set('Cache-Control', 'public, max-age=3600').send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`,
    );
  });
}
