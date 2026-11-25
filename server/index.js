import express from 'express';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initData } from './seed.js';
import { api } from './api.js';
import { seoRoutes, renderHead } from './seo.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEV = process.argv.includes('--dev') || process.env.NODE_ENV === 'development';
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

await initData();

const app = express();
const server = http.createServer(app);
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use((req, res, next) => {
  res.set({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin', 'X-Frame-Options': 'SAMEORIGIN' });
  next();
});
// Один основной адрес для поисковиков: www, *.onrender.com и http → 301 на SITE_URL.
// /api не трогаем — проверка здоровья Render ходит по внутреннему адресу.
const canonical = !DEV && process.env.SITE_URL ? new URL(process.env.SITE_URL) : null;
if (canonical) {
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/') || (req.method !== 'GET' && req.method !== 'HEAD')) return next();
    if (req.hostname === canonical.hostname && req.protocol === canonical.protocol.slice(0, -1)) return next();
    res.redirect(301, canonical.origin + req.originalUrl);
  });
}
app.use('/api', api);
seoRoutes(app);

if (DEV) {
  // Режим разработки: Vite работает внутри этого же сервера (один порт, горячая перезагрузка).
  const { createServer } = await import('vite');
  const vite = await createServer({
    configFile: path.join(ROOT, 'vite.config.js'),
    // Без временного файла конфига: иначе node --watch видит его и перезапускает сервер по кругу.
    configLoader: 'runner',
    server: { middlewareMode: true, hmr: { server } },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  const dist = path.join(ROOT, 'dist');
  const indexFile = path.join(dist, 'index.html');
  if (!fs.existsSync(indexFile)) {
    console.error('[socio] Нет собранного фронтенда. Выполните: npm run build  (или запустите npm run dev)');
    process.exit(1);
  }
  app.use('/assets', express.static(path.join(dist, 'assets'), { immutable: true, maxAge: '1y' }));
  app.use(express.static(dist, { index: false, maxAge: '1h' }));
  const indexHtml = fs.readFileSync(indexFile, 'utf8');
  // SPA: все остальные GET-запросы отдают index.html
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    res.set('Cache-Control', 'no-cache').type('html').send(renderHead(indexHtml, req));
  });
}

server.listen(PORT, HOST, () => {
  console.log(`[socio] ${DEV ? 'dev' : 'production'} — http://localhost:${PORT}`);
});

for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { server.close(); process.exit(0); });
