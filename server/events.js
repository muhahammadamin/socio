// Server-Sent Events: клиенты получают сигнал «данные изменились» и перезагружают их.
import { all, run } from './db.js';
import { tgNotify } from './telegram.js';

const clients = new Map(); // userId -> Set<res>
let publicClients = new Set();

export function subscribe(req, res, user) {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.flushHeaders();
  res.write('retry: 3000\n\n');
  const set = user ? (clients.get(user.id) || clients.set(user.id, new Set()).get(user.id)) : publicClients;
  set.add(res);
  const ping = setInterval(() => res.write(': ping\n\n'), 25000);
  res.on('close', () => { clearInterval(ping); set.delete(res); if (user && !set.size) clients.delete(user.id); });
}

const send = (res) => res.write('event: change\ndata: {}\n\n');

/** Сообщить пользователям (и всем админам) об изменениях. */
export async function changed(userIds = []) {
  const ids = new Set(userIds.filter(Boolean).map(Number));
  for (const { id } of await all(`SELECT id FROM users WHERE role='admin'`)) ids.add(id);
  for (const id of ids) for (const res of clients.get(id) || []) send(res);
  for (const res of publicClients) send(res);
}
export function changedAll() {
  for (const set of clients.values()) for (const res of set) send(res);
  for (const res of publicClients) send(res);
}

export async function notify(userId, text, reqId = null) {
  if (!userId) return;
  const r = await run('INSERT INTO notifications (user_id,text,req_id,ts) VALUES (?,?,?,?)', userId, text, reqId, Date.now());
  tgNotify(r.lastInsertRowid); // копия в Telegram, если человек подключил бота
}
export async function notifyAdmins(text, reqId = null) {
  for (const { id } of await all(`SELECT id FROM users WHERE role='admin'`)) await notify(id, text, reqId);
}
