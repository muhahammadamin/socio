// Небольшие эффекты без библиотек: конфетти и плавное появление блоков при прокрутке.
const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Конфетти поверх страницы на ~2 секунды. */
export function confetti({ count = 140, colors = ['#f5a623', '#f26b4f', '#3b5bf0', '#22b05f', '#8657e8', '#ffd36b'] } = {}) {
  if (calm()) return;
  const c = document.createElement('canvas');
  Object.assign(c.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: 9999 });
  document.body.appendChild(c);
  const ctx = c.getContext('2d'), dpr = devicePixelRatio || 1;
  c.width = innerWidth * dpr; c.height = innerHeight * dpr; ctx.scale(dpr, dpr);
  const parts = Array.from({ length: count }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 200, y: innerHeight * 0.35,
    vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 14 - 4,
    w: 6 + Math.random() * 6, h: 8 + Math.random() * 8, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3,
    c: colors[Math.floor(Math.random() * colors.length)],
  }));
  const t0 = performance.now();
  (function frame(t) {
    const k = (t - t0) / 2200;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of parts) {
      p.vy += 0.35; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.globalAlpha = Math.max(0, 1 - k); ctx.translate(p.x, p.y); ctx.rotate(p.r);
      ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
    }
    if (k < 1) requestAnimationFrame(frame); else c.remove();
  })(t0);
}

/** v-reveal: блок плавно поднимается, когда попадает на экран. v-reveal="2" — задержка (номер в ряду). */
const io = typeof IntersectionObserver !== 'undefined'
  ? new IntersectionObserver((list) => { for (const e of list) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }, { threshold: 0.12 })
  : null;
export const reveal = {
  mounted(el, b) {
    if (!io || calm()) return;
    el.classList.add('reveal');
    if (b.value) el.style.setProperty('--d', `${Number(b.value) * 70}ms`);
    io.observe(el);
  },
  unmounted(el) { io?.unobserve(el); },
};

/* Плавное появление блоков на всех страницах сайта — без правок в каждой странице.
   Вызывается после смены страницы: всё, что ниже первого экрана, проявляется при прокрутке. */
const AUTO = [
  '.section h2.big', '.section .lead', '.steps>*', '.catcard', '.rolebig', '.faq details', '.counter',
  '.seo .seotext', '.rewards>*', '.reward', '.hcard', '.page .card', '.course', '.banner', '.scard', '.badge-c', '.stc',
].join(',');
export function autoReveal(root = document) {
  if (!io || calm()) return;
  const groups = new Map();
  for (const el of root.querySelectorAll(AUTO)) {
    if (el.classList.contains('reveal') || el.closest('.modal')) continue;
    if (el.getBoundingClientRect().top < innerHeight * 0.92) continue; // уже на экране — не прячем
    const n = groups.get(el.parentElement) || 0;
    groups.set(el.parentElement, n + 1);
    el.classList.add('reveal');
    el.style.setProperty('--d', `${Math.min(n, 5) * 70}ms`);
    io.observe(el);
  }
}

/* Полоса прокрутки страницы сверху. */
export function scrollProgress() {
  if (calm()) return;
  const bar = document.createElement('div');
  bar.className = 'scrollbar-top';
  document.body.appendChild(bar);
  const upd = () => {
    const h = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${h > 40 ? scrollY / h : 0})`;
  };
  addEventListener('scroll', upd, { passive: true });
  addEventListener('resize', upd);
  return upd;
}

/* Кнопки: «волна» от места нажатия. */
export function ripples() {
  if (calm()) return;
  document.addEventListener('pointerdown', (e) => {
    const b = e.target.closest?.('.btn,.rolecard,.chip');
    if (!b || b.disabled) return;
    const r = b.getBoundingClientRect(), s = document.createElement('span');
    s.className = 'ripple';
    const d = Math.max(r.width, r.height) * 2;
    Object.assign(s.style, { width: d + 'px', height: d + 'px', left: e.clientX - r.left - d / 2 + 'px', top: e.clientY - r.top - d / 2 + 'px' });
    b.appendChild(s);
    setTimeout(() => s.remove(), 600);
  });
}
