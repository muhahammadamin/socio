// Автоматическая рассылка заявок помощникам.
// Новая заявка сразу уходит проверенным и свободным помощникам её района — каждый сам нажимает «Принять» или «Отказаться».
// Берёт заявку тот, кто принял первым. Если в районе никого нет, все отказались или DISPATCH.widenMin минут
// никто не ответил — заявку видит весь город. Ещё через DISPATCH.escalateMin минут (или если в городе никого нет)
// координатор получает сигнал назначить помощника вручную.
import { one, all, run, tx } from './db.js';
import { changed, notify, notifyAdmins } from './events.js';
import { DISPATCH } from '../shared/constants.js';

const MIN = 6e4;
export const STAGE = { district: 0, city: 1, admin: 2 };

/** Помощники, которым заявку ещё не предлагали и которые могут её взять прямо сейчас. */
async function candidates(r) {
  return await all(`SELECT u.id, u.name FROM users u
    WHERE u.role='helper' AND u.verified=1 AND u.avail=1 ${r.stage === STAGE.district ? 'AND u.dist=?' : ''}
      AND NOT EXISTS (SELECT 1 FROM request_offers o WHERE o.req_id=? AND o.helper_id=u.id)
      AND (SELECT COUNT(*) FROM requests a WHERE a.helper_id=u.id AND a.status!='done') < ?`,
  ...(r.stage === STAGE.district ? [r.dist] : []), r.id, DISPATCH.maxActive);
}
const openOffers = async (id) => (await one(`SELECT COUNT(*) n FROM request_offers WHERE req_id=? AND state='open'`, id)).n;

/** Разослать заявку тем, кому её ещё не предлагали; при необходимости расширить круг.
 *  Возвращает id уведомлённых помощников и moved — сменился ли круг рассылки. */
export async function dispatch(id, now = Date.now()) {
  const r = await one('SELECT * FROM requests WHERE id=?', Number(id));
  const sent = [];
  if (!r || r.status !== 'new' || r.helper_id) return { sent, moved: false };
  const stage0 = r.stage;
  for (;;) {
    for (const h of await candidates(r)) {
      await run(`INSERT OR IGNORE INTO request_offers (req_id,helper_id,state,ts) VALUES (?,?,'open',?)`, r.id, h.id, now);
      await notify(h.id, `Новая заявка ${r.stage === STAGE.district ? 'в вашем районе' : `рядом (${r.dist})`}: «${r.title}». Примите её или откажитесь`, r.id);
      sent.push(h.id);
    }
    if (r.stage >= STAGE.admin) break;
    const since = r.stage === STAGE.district ? r.created_at : r.stage_ts;
    const wait = (r.stage === STAGE.district ? DISPATCH.widenMin : DISPATCH.escalateMin) * MIN;
    if ((await openOffers(r.id)) && now - since < wait) break; // ждём ответа
    r.stage += 1;
    r.stage_ts = now;
    await run('UPDATE requests SET stage=?, stage_ts=? WHERE id=?', r.stage, now, r.id);
    if (r.stage === STAGE.admin)
      await notifyAdmins(`Заявку «${r.title}» (${r.dist}) пока никто не взял — назначьте помощника вручную`, r.id);
  }
  return { sent, moved: r.stage !== stage0 };
}

/** Предложить помощнику все открытые заявки, которые ему подходят (после проверки, включения приёма, завершения задачи). */
export async function offerToHelper(hid, now = Date.now()) {
  const h = await one(`SELECT * FROM users WHERE id=? AND role='helper' AND verified=1 AND avail=1`, hid);
  if (!h) return 0;
  const busy = (await one(`SELECT COUNT(*) n FROM requests WHERE helper_id=? AND status!='done'`, h.id)).n;
  if (busy >= DISPATCH.maxActive) return 0;
  const list = await all(`SELECT id, title FROM requests r WHERE status='new' AND helper_id IS NULL AND (dist=? OR stage>=?)
    AND NOT EXISTS (SELECT 1 FROM request_offers o WHERE o.req_id=r.id AND o.helper_id=?) ORDER BY created_at`, h.dist, STAGE.city, h.id);
  for (const r of list) await run(`INSERT OR IGNORE INTO request_offers (req_id,helper_id,state,ts) VALUES (?,?,'open',?)`, r.id, h.id, now);
  if (list.length === 1) await notify(h.id, `Для вас есть заявка: «${list[0].title}». Примите её или откажитесь`, list[0].id);
  else if (list.length) await notify(h.id, `Для вас ${list.length} новых заявок — посмотрите на главной`);
  return list.length;
}

/** Помощник перестал принимать заявки: его неотвеченные предложения уходят другим. */
export async function withdrawHelper(hid) {
  const ids = (await all(`SELECT req_id FROM request_offers WHERE helper_id=? AND state='open'`, hid)).map((x) => x.req_id);
  await run(`DELETE FROM request_offers WHERE helper_id=? AND state='open'`, hid);
  const notified = [];
  for (const id of ids) notified.push(...(await dispatch(id)).sent);
  return notified;
}

/** Заявку взяли (сам помощник или назначил координатор): остальным предложение больше не показывается. */
export async function closeOffers(reqId, takerId) {
  const others = (await all(`SELECT helper_id FROM request_offers WHERE req_id=? AND state='open' AND helper_id!=?`, reqId, takerId || 0)).map((x) => x.helper_id);
  await run(`UPDATE request_offers SET state='missed' WHERE req_id=? AND state='open'`, reqId);
  if (takerId) await run(`INSERT INTO request_offers (req_id,helper_id,state,ts) VALUES (?,?,'taken',?)
    ON CONFLICT(req_id,helper_id) DO UPDATE SET state='taken'`, reqId, takerId, Date.now());
  return others;
}

/** Помощники с открытым предложением по заявке (их экраны надо обновить). */
export const offeredTo = async (reqId) => (await all(`SELECT helper_id FROM request_offers WHERE req_id=? AND state='open'`, reqId)).map((x) => x.helper_id);

/** Раз в минуту: расширить круг для заявок, на которые долго нет ответа. */
export function startDispatcher() {
  const tick = async () => {
    try {
      const ids = (await all(`SELECT id FROM requests WHERE status='new' AND helper_id IS NULL AND stage<?`, STAGE.admin)).map((x) => x.id);
      const touched = [];
      let any = false;
      for (const id of ids) {
        const d = await tx(() => dispatch(id));
        touched.push(...d.sent);
        any ||= d.moved || d.sent.length > 0;
      }
      if (any) await changed(touched);
    } catch (e) { console.error('[socio] рассылка заявок:', e.message); }
  };
  tick();
  return setInterval(tick, MIN);
}
