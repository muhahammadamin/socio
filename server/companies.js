// Компании и наборы волонтёров.
// 1. Компания оставляет заявку на сайте (/companies): что нужно сделать, где, когда и сколько людей.
// 2. Координатор связывается с компанией и в панели открывает набор волонтёров.
// 3. Волонтёрам приходит приглашение — в кабинет и в Telegram-бот — с анкетой. Кто хочет участвовать, заполняет её.
// 4. Координатор подтверждает или отклоняет анкеты, закрывает набор.
import { one, all, run, tx } from './db.js';  // таблицы company_requests, campaigns, campaign_apps — в db.js
import { allow, loginLimiter, countFailure } from './auth.js';
import { changed, changedAll, notify, notifyAdmins } from './events.js';
import { DISTRICT_NAMES } from '../shared/constants.js';


const COMPANY_STATUSES = ['new', 'contacted', 'recruiting', 'done', 'rejected'];
const APPLIERS = ['helper', 'student'];

/** Наборы, открытые для этого волонтёра (по району), и его анкеты. Для кабинета волонтёра. */
export async function campaignsFor(u) {
  if (!APPLIERS.includes(u.role)) return [];
  const rows = await all(`SELECT c.*, a.status app, a.about app_about,
      (SELECT COUNT(*) FROM campaign_apps x WHERE x.campaign_id=c.id AND x.status='approved') approved
    FROM campaigns c LEFT JOIN campaign_apps a ON a.campaign_id=c.id AND a.user_id=?
    WHERE (c.status='open' AND (c.dist='' OR c.dist=?)) OR (a.status IN ('pending','approved') AND c.created_at > ?)
    ORDER BY c.created_at DESC`, u.id, u.dist, Date.now() - 60 * 864e5);
  return rows.map((c) => ({
    id: c.id, title: c.title, company: c.company, descr: c.descr, dist: c.dist, place: c.place, when: c.when_text,
    needed: c.needed, approved: c.approved, open: c.status === 'open', ts: c.created_at, app: c.app || null, appAbout: c.app_about || '',
  }));
}

const helpers = (Bad) => ({
  distOrAll: (v) => { const d = String(v ?? ''); if (d && !DISTRICT_NAMES.includes(d)) throw new Bad('Выберите район из списка.'); return d; },
  people: (v, max = 500) => { const n = Math.round(Number(v)); if (!(n >= 1 && n <= max)) throw new Bad(`Укажите, сколько нужно волонтёров (от 1 до ${max}).`); return n; },
});

/** Заявка компании — без входа на сайт. */
export function publicCompanyRoutes(api, { wrap, Bad, str, phone }) {
  const { distOrAll, people } = helpers(Bad);
  const email = (v) => {
    const s = String(v ?? '').trim();
    if (s && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) throw new Bad('Проверьте адрес почты — или оставьте поле пустым.');
    return s.slice(0, 120);
  };

  /* ---------- компания оставляет заявку (без входа) ---------- */
  api.post('/companies/requests', loginLimiter, wrap(async (req) => {
    const b = req.body || {};
    const r = {
      company: str(b.company, 2, 120, 'Введите название компании или организации.'),
      contact: str(b.contact, 2, 80, 'Как зовут контактное лицо?'),
      phone: phone(b.phone), email: email(b.email),
      task: str(b.task, 10, 1500, 'Опишите, чем должны помочь волонтёры (от 10 символов).'),
      dist: distOrAll(b.dist), place: String(b.place ?? '').trim().slice(0, 200), when: String(b.when ?? '').trim().slice(0, 120),
      people: people(b.people), regular: b.regular === true ? 1 : 0,
    };
    countFailure(req); // не больше 10 заявок с одного адреса за несколько минут
    await run(`INSERT INTO company_requests (company,contact,phone,email,task,dist,place,when_text,people,regular,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      r.company, r.contact, r.phone, r.email, r.task, r.dist, r.place, r.when, r.people, r.regular, Date.now());
    await notifyAdmins(`Компания «${r.company}» просит ${r.people} волонтёр(ов)${r.regular ? ' (регулярно)' : ''}. Позвоните: ${r.contact}, ${r.phone} — раздел «Компании»`, null, '/admin/companies');
    await changed();
    return { ok: true };
  }));
}

/** Анкеты волонтёров и раздел «Компании» в панели — только для вошедших. */
export function companyRoutes(api, { wrap, Bad, str }) {
  const { distOrAll, people } = helpers(Bad);

  /* ---------- волонтёр: анкета на участие ---------- */
  const openCampaign = async (id, u) => {
    const c = await one('SELECT * FROM campaigns WHERE id=?', Number(id));
    if (!c) throw new Bad('Набор не найден.', 404);
    if (c.status !== 'open') throw new Bad('Набор уже закрыт.', 409);
    if (c.dist && c.dist !== u.dist) throw new Bad('Этот набор — для волонтёров другого района.', 403);
    return c;
  };
  api.post('/campaigns/:id/apply', allow(...APPLIERS), wrap(async (req) => {
    const u = req.user, c = await openCampaign(req.params.id, u);
    const b = req.body || {};
    if (b.agree !== true) throw new Bad(`Подтвердите, что сможете прийти: ${c.when_text}.`);
    const about = String(b.about ?? '').trim().slice(0, 500);
    const prev = await one('SELECT status FROM campaign_apps WHERE campaign_id=? AND user_id=?', c.id, u.id);
    if (prev && ['pending', 'approved'].includes(prev.status)) throw new Bad('Вы уже записались — координатор скоро ответит.', 409);
    if (prev?.status === 'rejected') throw new Bad('Координатор уже ответил на вашу анкету по этому набору.', 409);
    await run(`INSERT INTO campaign_apps (campaign_id,user_id,about,status,ts) VALUES (?,?,?,'pending',?)
      ON CONFLICT(campaign_id,user_id) DO UPDATE SET about=excluded.about, status='pending', ts=excluded.ts`, c.id, u.id, about, Date.now());
    await notifyAdmins(`${u.name} (${u.dist}) записался в набор «${c.title}»`, null, '/admin/companies');
    await changed([u.id]);
    return { ok: true };
  }));
  api.delete('/campaigns/:id/apply', allow(...APPLIERS), wrap(async (req) => {
    const u = req.user;
    const a = await one(`SELECT a.status, c.title FROM campaign_apps a JOIN campaigns c ON c.id=a.campaign_id WHERE a.campaign_id=? AND a.user_id=?`, Number(req.params.id), u.id);
    if (!a || !['pending', 'approved'].includes(a.status)) throw new Bad('Вы не записаны в этот набор.', 404);
    await run(`UPDATE campaign_apps SET status='withdrawn', ts=? WHERE campaign_id=? AND user_id=?`, Date.now(), Number(req.params.id), u.id);
    await notifyAdmins(`${u.name} отказался от участия в «${a.title}»`, null, '/admin/companies');
    await changed([u.id]);
    return { ok: true };
  }));

  /* ---------- координатор ---------- */
  api.get('/admin/companies', allow('admin'), wrap(async () => {
    const requests = (await all('SELECT * FROM company_requests ORDER BY status IN (\'done\',\'rejected\'), created_at DESC'))
      .map((r) => ({ id: r.id, company: r.company, contact: r.contact, phone: r.phone, email: r.email, task: r.task, dist: r.dist, place: r.place,
        when: r.when_text, people: r.people, regular: !!r.regular, status: r.status, note: r.note, ts: r.created_at }));
    const apps = await all(`SELECT a.campaign_id cid, a.user_id uid, a.about, a.status, a.ts, u.name, u.phone, u.dist, u.role,
        u.base_done + (SELECT COUNT(*) FROM requests r WHERE r.helper_id=u.id AND r.status='done') done
      FROM campaign_apps a JOIN users u ON u.id=a.user_id ORDER BY a.ts`);
    const campaigns = (await all('SELECT * FROM campaigns ORDER BY status=\'closed\', created_at DESC')).map((c) => ({
      id: c.id, companyId: c.company_id, title: c.title, company: c.company, descr: c.descr, dist: c.dist, place: c.place, when: c.when_text,
      needed: c.needed, open: c.status === 'open', invited: c.invited, ts: c.created_at,
      apps: apps.filter((a) => a.cid === c.id).map(({ cid, ...a }) => a),
    }));
    return { requests, campaigns };
  }));

  api.patch('/admin/companies/:id', allow('admin'), wrap(async (req) => {
    const r = await one('SELECT * FROM company_requests WHERE id=?', Number(req.params.id));
    if (!r) throw new Bad('Заявка компании не найдена.', 404);
    const b = req.body || {};
    const status = b.status === undefined ? r.status : COMPANY_STATUSES.includes(b.status) ? b.status : null;
    if (!status) throw new Bad('Неизвестный статус.');
    await run('UPDATE company_requests SET status=?, note=? WHERE id=?', status, b.note === undefined ? r.note : String(b.note).trim().slice(0, 1000), r.id);
    await changed();
    return { ok: true };
  }));
  api.delete('/admin/companies/:id', allow('admin'), wrap(async (req) => {
    await run('DELETE FROM company_requests WHERE id=?', Number(req.params.id));
    await changed();
    return { ok: true };
  }));

  /** Открыть набор: приглашение с анкетой приходит волонтёрам района (или всего города) — в кабинет и в Telegram. */
  api.post('/admin/campaigns', allow('admin'), wrap(async (req) => {
    const b = req.body || {};
    const c = {
      companyId: b.companyId ? Number(b.companyId) : null,
      title: str(b.title, 3, 120, 'Введите название набора, например «Субботник в парке».'),
      company: str(b.company, 2, 120, 'Укажите, для какой компании набор.'),
      descr: str(b.descr, 10, 1500, 'Опишите, что будут делать волонтёры (от 10 символов).'),
      dist: distOrAll(b.dist), place: String(b.place ?? '').trim().slice(0, 200),
      when: str(b.when, 3, 120, 'Укажите дату и время, например «14 декабря, 10:00–14:00».'), needed: people(b.needed),
    };
    const students = b.students === true;
    if (c.companyId && !(await one('SELECT id FROM company_requests WHERE id=?', c.companyId))) c.companyId = null;
    const invited = await tx(async () => {
      const id = (await run(`INSERT INTO campaigns (company_id,title,company,descr,dist,place,when_text,needed,created_at) VALUES (?,?,?,?,?,?,?,?,?)`,
        c.companyId, c.title, c.company, c.descr, c.dist, c.place, c.when, c.needed, Date.now())).lastInsertRowid;
      if (c.companyId) await run(`UPDATE company_requests SET status='recruiting' WHERE id=?`, c.companyId);
      const roles = students ? `role IN ('helper','student')` : `role='helper' AND verified=1`;
      const list = await all(`SELECT id, role FROM users WHERE ${roles} ${c.dist ? 'AND dist=?' : ''}`, ...(c.dist ? [c.dist] : []));
      const text = `📣 Открыт набор волонтёров: «${c.title}» — ${c.company}\n🗓 ${c.when}\n📍 ${c.dist || 'Ташкент'}${c.place ? `, ${c.place}` : ''}\n👥 Нужно ${c.needed} чел.\n\n${c.descr.slice(0, 500)}\n\nХотите участвовать? Заполните короткую анкету в кабинете.`;
      for (const u of list) await notify(u.id, text, null, `/${u.role}#campaign-${id}`);
      await run('UPDATE campaigns SET invited=? WHERE id=?', list.length, id);
      return list.length;
    });
    changedAll();
    return { ok: true, invited };
  }));

  api.post('/admin/campaigns/:id/close', allow('admin'), wrap(async (req) => {
    const c = await one('SELECT * FROM campaigns WHERE id=?', Number(req.params.id));
    if (!c) throw new Bad('Набор не найден.', 404);
    const open = req.body?.open === true;
    await run('UPDATE campaigns SET status=? WHERE id=?', open ? 'open' : 'closed', c.id);
    changedAll();
    return { ok: true };
  }));

  api.post('/admin/campaigns/:id/apps/:uid', allow('admin'), wrap(async (req) => {
    const c = await one('SELECT * FROM campaigns WHERE id=?', Number(req.params.id));
    const a = c && await one('SELECT * FROM campaign_apps WHERE campaign_id=? AND user_id=?', c.id, Number(req.params.uid));
    if (!a) throw new Bad('Анкета не найдена.', 404);
    const status = req.body?.status;
    if (!['approved', 'rejected'].includes(status)) throw new Bad('Неизвестное решение.');
    if (a.status === 'withdrawn') throw new Bad('Волонтёр сам отказался от участия.', 409);
    await run('UPDATE campaign_apps SET status=? WHERE campaign_id=? AND user_id=?', status, c.id, a.user_id);
    const u = await one('SELECT role FROM users WHERE id=?', a.user_id);
    await notify(a.user_id, status === 'approved'
      ? `✅ Вы в команде «${c.title}» (${c.company})! Ждём вас: ${c.when_text},${c.dist || 'Ташкент'}${c.place ? `, ${c.place}` : ''}. Координатор позвонит накануне.`
      : `Спасибо за анкету в «${c.title}». В этот раз мест не хватило — пригласим в следующий набор.`, null, u ? `/${u.role}#campaign-${c.id}` : null);
    await changed([a.user_id]);
    return { ok: true };
  }));
}

