import { run, one, all, tx } from './db.js';
import { hashPassword } from './auth.js';
import { ensureCourses } from './courses-seed.js';
import { ensureLessons } from './lessons-seed.js';
import { ensureRewards } from './coins.js';
import { DISTRICTS, STATUSES, phoneKey } from '../shared/constants.js';

const MIN = 6e4, HOUR = 36e5, DAY = 864e5;
const ADDR = ['ул. Бунёдкор, 12', 'ул. Фархад, 45', 'ул. Навои, 8', 'массив Хадра, 3', 'ул. Амира Темура, 21', 'ул. Мукими, 17', 'ул. Катартал, 6', 'ул. Кичик Халка Йули, 30'];

export const DEMO_PASSWORD = 'demo123';

async function addUser(u, passHash) {
  return Number((await run(
    `INSERT INTO users (role,name,phone,phone_key,pass,dist,skills,school,coins,avail,rating_sum,rating_cnt,base_done,base_helped,balance,created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    u.role, u.name, u.phone, phoneKey(u.phone), passHash, u.dist || '', JSON.stringify(u.skills || []), u.school || '', u.coins || 0, u.avail === false ? 0 : 1,
    (u.rating || 0) * (u.rcnt || 0), u.rcnt || 0, u.base || 0, u.bp || 0, u.balance || 0, Date.now() - 60 * DAY,
  )).lastInsertRowid);
}

/** Удаляет пользователя вместе с его заявками, уведомлениями, прогрессом и коинами (не полагаясь на ON DELETE). */
export async function deleteUser(id) {
  await run('DELETE FROM request_offers WHERE helper_id=? OR req_id IN (SELECT id FROM requests WHERE user_id=?)', id, id);
  await run('DELETE FROM request_log WHERE req_id IN (SELECT id FROM requests WHERE user_id=?)', id);
  await run('UPDATE complaints SET req_id=NULL WHERE req_id IN (SELECT id FROM requests WHERE user_id=?)', id);
  await run('DELETE FROM requests WHERE user_id=?', id);
  await run('UPDATE requests SET helper_id=NULL WHERE helper_id=?', id);
  await run('UPDATE complaints SET from_id=NULL WHERE from_id=?', id);
  await run('UPDATE complaints SET against_id=NULL WHERE against_id=?', id);
  await run('UPDATE reward_codes SET user_id=NULL WHERE user_id=?', id);
  for (const t of ['notifications', 'learn_progress', 'coin_log']) await run(`DELETE FROM ${t} WHERE user_id=?`, id);
  await run('DELETE FROM users WHERE id=?', id);
}

export const DEFAULT_ADMIN_PHONE = '+998 77-010-25-56';

/** Освобождённые номера: аккаунты и заявки с ними, созданные до REMOVED_BEFORE, удаляются при запуске.
 *  После этого номер свободен — с ним можно зарегистрироваться заново, новый аккаунт не трогается. */
const REMOVED_PHONES = ['+998 77-006-73-24'];
const REMOVED_BEFORE = Date.parse('2026-11-25T15:20:00Z');
const isRemovedPhone = (p) => REMOVED_PHONES.some((r) => phoneKey(r) === phoneKey(p));

async function purgeRemovedPhones() {
  const keys = REMOVED_PHONES.map(phoneKey);
  for (const u of await all(`SELECT id, role, name, phone_key FROM users WHERE created_at < ? AND phone_key IN (${keys.map(() => '?').join(',')})`, REMOVED_BEFORE, ...keys)) {
    if (u.phone_key === phoneKey(process.env.ADMIN_PHONE || DEFAULT_ADMIN_PHONE)) continue; // главного администратора не трогаем
    await tx(() => deleteUser(u.id));
    console.log(`[socio] удалён аккаунт «${u.name}» (#${u.id}, ${u.role}), номер ${u.phone_key} освобождён`);
  }
  for (const v of await all('SELECT id, phone FROM volunteers WHERE created_at < ?', REMOVED_BEFORE)) if (isRemovedPhone(v.phone)) await run('DELETE FROM volunteers WHERE id=?', v.id);
}

/** Создаёт администратора из переменных окружения, если админов ещё нет.
 *  Если админ уже есть, а ADMIN_PHONE задан и отличается — переносит номер первому админу. */
export async function ensureAdmin() {
  const phone = process.env.ADMIN_PHONE || DEFAULT_ADMIN_PHONE;
  const key = phoneKey(phone);
  // уже есть администратор с этим номером (админов может быть несколько) — ничего не делаем
  if (await one(`SELECT id FROM users WHERE role='admin' AND phone_key=?`, key)) return;
  const admin = await one(`SELECT id, phone_key FROM users WHERE role='admin' ORDER BY id LIMIT 1`);
  if (admin) {
    if (process.env.ADMIN_PHONE && admin.phone_key !== key) {
      // Аккаунты сайта с этим номером не мешают: номер уникален только среди администраторов.
      if (await one(`SELECT id FROM users WHERE phone_key=? AND role='admin' AND id<>?`, key, admin.id)) {
        console.warn(`[socio] номер ${phone} уже у другого администратора — телефон не изменён`);
        return;
      }
      await run(`UPDATE users SET phone=?, phone_key=? WHERE id=?`, phone, key, admin.id);
      console.log(`[socio] телефон администратора изменён на ${phone}`);
    }
    return;
  }
  const pass = process.env.ADMIN_PASSWORD || 'admin123';
  await addUser({ role: 'admin', name: 'Администратор', phone }, hashPassword(pass));
  console.log(`[socio] создан администратор ${phone}${process.env.ADMIN_PASSWORD ? '' : ' / admin123 — смените ADMIN_PASSWORD в продакшене'}`);
}

// Стандартные категории с объяснением для людей, которые выбирают, с чем им нужна помощь.
const CATEGORIES = [
  ['Пожилые люди', '#3b5bf0', 'user', 'Поддержка пожилых людей, которым трудно справляться с делами самостоятельно или которые живут одни.', [
    'Сопроводить на прогулку, в поликлинику или в банк',
    'Помочь с уборкой и мелкими делами по дому',
    'Принести воду, вынести мусор',
    'Навестить и просто поговорить',
  ]],
  ['Медицина', '#f26b4f', 'pill', 'Доставка лекарств и сопровождение к врачу. Помощники не ставят уколы и не проводят медицинских процедур — в экстренной ситуации звоните 103.', [
    'Купить и привезти лекарства по рецепту',
    'Сопроводить к врачу или на анализы',
    'Помочь записаться на приём',
    'Забрать результаты анализов или справку',
  ]],
  ['Покупки', '#2fae62', 'bag', 'Продукты и товары первой необходимости для тех, кто не может выйти из дома или донести тяжёлое. Покупки оплачивает сам человек — помощник отдаёт чек и сдачу.', [
    'Купить продукты по списку',
    'Принести воду и тяжёлые покупки',
    'Купить бытовую химию и средства гигиены',
    'Забрать заказ из магазина или пункта выдачи',
  ]],
  ['Семьи и дети', '#7c5ce6', 'users', 'Помощь многодетным семьям, родителям-одиночкам и семьям с детьми с особыми потребностями.', [
    'Присмотреть за детьми несколько часов',
    'Помочь ребёнку с уроками',
    'Проводить ребёнка в школу или на кружок',
    'Помочь собрать и передать детские вещи',
  ]],
  ['Другое', '#f5a623', 'heart', 'Всё, что не подошло в другие категории: техника, документы, бытовые и юридические вопросы. Опишите ситуацию — координатор подберёт помощника с нужными навыками.', [
    'Настроить телефон, интернет или видеосвязь с родными',
    'Помочь заполнить заявление или разобраться с документами',
    'Проконсультироваться с волонтёром-юристом',
    'Мелкий ремонт по дому',
  ]],
];

export async function ensureCategories() {
  if (!(await one('SELECT id FROM categories LIMIT 1')))
    for (const [n, c, i, d, ex] of CATEGORIES)
      await run('INSERT INTO categories (name,color,icon,descr,examples) VALUES (?,?,?,?,?)', n, c, i, d, ex.join('\n'));
  // уже существующим стандартным категориям без описания — добавить его
  for (const [n, , , d, ex] of CATEGORIES)
    await run(`UPDATE categories SET descr=?, examples=? WHERE name=? AND descr=''`, d, ex.join('\n'), n);
}

/** Полностью пересоздаёт демо-данные. */
export async function seedDemo() {
  const now = Date.now();
  const demoHash = hashPassword(DEMO_PASSWORD);
  await tx(async () => {
    for (const t of ['notifications', 'complaints', 'request_offers', 'request_log', 'requests', 'volunteers', 'categories', 'coin_log', 'learn_progress']) await run(`DELETE FROM ${t}`);
    await run(`DELETE FROM reward_codes WHERE reward_id IN (SELECT id FROM rewards WHERE kind!='code')`); // выданные сертификаты и заказы
    await run('UPDATE reward_codes SET user_id=NULL, issued_at=NULL');
    await run('DELETE FROM users');
  });
  await ensureAdmin();
  await ensureCategories();
  await tx(async () => {
    const cat = Object.fromEntries((await all('SELECT id,name FROM categories')).map((c) => [c.name, c.id]));
    const U = {}, H = {};
    for (const [k, name, dist, phone, balance] of [['u1', 'Ирина Каримова', 'Чиланзар', '+998 90 111-22-01', 24], ['u2', 'Нодира Саидова', 'Чиланзар', '+998 90 111-22-02'],
     ['u3', 'Азиз Рахимов', 'Яшнабад', '+998 90 111-22-03'], ['u4', 'Мадина Юсупова', 'Мирзо-Улугбек', '+998 90 111-22-04'],
     ['u5', 'Шухрат Ахмедов', 'Алмазар', '+998 90 111-22-05']])
      U[k] = await addUser({ role: 'user', name, dist, phone, balance }, demoHash);
    for (const [k, name, phone, dist, base, bp, rating, avail, skills, coins] of [['h1', 'Алексей Петров', '+998 91 200-00-01', 'Чиланзар', 16, 85, 4.9, true, ['elderly', 'shopping', 'transport'], 140],
     ['h2', 'Дилшод Тохиров', '+998 91 200-00-02', 'Мирзо-Улугбек', 30, 41, 4.8, true, ['medical', 'transport'], 260],
     ['h3', 'Сабина Алиева', '+998 91 200-00-03', 'Яшнабад', 19, 33, 4.9, true, ['kids', 'psych'], 185],
     ['h4', 'Рустам Назаров', '+998 91 200-00-04', 'Юнусабад', 7, 12, 4.7, true, ['legal', 'translate', 'tech'], 65],
     ['h5', 'Камола Эргашева', '+998 91 200-00-05', 'Алмазар', 10, 18, 4.8, false, ['repair', 'tech'], 90]]) {
        H[k] = await addUser({ role: 'helper', name, phone, dist, base, bp, rating, rcnt: 10, avail, skills, coins }, demoHash);
        await run('INSERT INTO coin_log (user_id,amount,reason,ts) VALUES (?,?,?,?)', H[k], coins, 'Коины за помощь до запуска платформы', now - 30 * DAY);
      }
    const S1 = await addUser({ role: 'student', name: 'Малика Турсунова', phone: '+998 94 400-00-01', dist: 'Мирзо-Улугбек', school: 'НУУз, факультет психологии', coins: 15 }, demoHash);
    await addUser({ role: 'student', name: 'Жасур Абдуллаев', phone: '+998 94 400-00-02', dist: 'Юнусабад', school: 'ТашГТУ, 2 курс' }, demoHash);

    let rid = 0;
    const mk = async (title, catName, dist, uk, hk, status, ageMin, desc, due = 3, rating = null) => {
      rid++;
      const [px, py] = DISTRICTS[dist];
      const ts = now - ageMin * MIN;
      const id = Number((await run(
        `INSERT INTO requests (title,descr,cat_id,dist,addr,phone,x,y,user_id,helper_id,status,due_days,rating,created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        title, desc || 'Нужна помощь с повседневным делом. Подробности уточнит помощник по телефону.', cat[catName], dist,
        ADDR[rid % ADDR.length], (await one('SELECT phone FROM users WHERE id=?', U[uk])).phone,
        px + ((rid * 37) % 21) - 10, py + ((rid * 53) % 17) - 8, U[uk], hk ? H[hk] : null, status, due, rating, ts,
      )).lastInsertRowid);
      const steps = STATUSES.slice(0, STATUSES.indexOf(status) + 1);
      const gap = Math.min((now - ts) / (steps.length + 1), 2 * HOUR);
      for (const [i, s] of steps.entries()) await run('INSERT INTO request_log (req_id,status,ts) VALUES (?,?,?)', id, s, ts + i * gap);
      return id;
    };
    await mk('Помощь с покупкой продуктов', 'Покупки', 'Чиланзар', 'u2', 'h1', 'assigned', 2, 'Нужно купить продукты в магазине рядом с домом.', 2);
    await mk('Нужна помощь пожилому человеку', 'Пожилые люди', 'Яшнабад', 'u3', null, 'new', 5, 'Пожилой сосед не может выйти на улицу один. Нужен человек для сопровождения и мелких дел.');
    await mk('Доставка лекарств', 'Медицина', 'Мирзо-Улугбек', 'u4', 'h2', 'accepted', 8, 'Забрать лекарства в аптеке и привезти домой.', 1);
    await mk('Помощь семье с детьми', 'Семьи и дети', 'Учтепинский район', 'u5', null, 'new', 12, 'Многодетная семья просит помочь с детьми на несколько часов.');
    await mk('Ремонт компьютера', 'Другое', 'Алмазар', 'u2', 'h5', 'assigned', 15, 'Компьютер не включается, нужна диагностика.', 5);
    await mk('Сходить в аптеку', 'Медицина', 'Чиланзар', 'u1', 'h1', 'progress', 90, 'Купить лекарства по списку, рецепт отдам при встрече.', 1);
    for (const [i, [t, c, d, u, h, days]] of [['Доставка продуктов', 'Покупки', 'Чиланзар', 'u1', 'h3', 4], ['Сопровождение к врачу', 'Медицина', 'Яшнабад', 'u3', 'h1', 6],
     ['Помощь с уборкой', 'Пожилые люди', 'Юнусабад', 'u4', 'h1', 9], ['Присмотреть за ребёнком', 'Семьи и дети', 'Алмазар', 'u5', 'h5', 11],
     ['Купить лекарства по рецепту', 'Медицина', 'Мирабад', 'u2', 'h2', 14], ['Настроить телефон', 'Другое', 'Шайхантахур', 'u3', 'h4', 18],
     ['Принести воду', 'Пожилые люди', 'Сергели', 'u4', 'h2', 21], ['Продукты на неделю', 'Покупки', 'Мирзо-Улугбек', 'u2', 'h3', 5],
     ['Помощь с оформлением справки', 'Другое', 'Учтепинский район', 'u5', 'h5', 7], ['Отвезти в поликлинику', 'Медицина', 'Чиланзар', 'u4', 'h2', 8],
     ['Игры с детьми после школы', 'Семьи и дети', 'Яшнабад', 'u3', 'h3', 12], ['Помощь по дому', 'Пожилые люди', 'Мирабад', 'u2', 'h4', 16],
     ['Купить хлеб и молоко', 'Покупки', 'Алмазар', 'u5', 'h5', 20], ['Вызвать мастера', 'Другое', 'Юнусабад', 'u4', 'h4', 22],
     ['Купить лекарства', 'Медицина', 'Сергели', 'u3', 'h2', 24], ['Прогулка с бабушкой', 'Пожилые люди', 'Чиланзар', 'u1', 'h1', 2]].entries())
      await mk(t, c, d, u, h, 'done', days * 1440 + ((i + 7) * 37) % 600, null, 3, 5);

    for (const [name, phone, dist, skills, about, days] of [
      ['Бахтиёр Умаров', '+998 93 300-00-01', 'Сергели', ['transport', 'shopping'], 'Есть автомобиль, могу возить продукты и лекарства', 1],
      ['Зарина Хасанова', '+998 93 300-00-02', 'Мирабад', ['medical', 'elderly'], 'Медсестра, помогу с уходом за пожилыми', 3],
      ['Тимур Исмаилов', '+998 93 300-00-03', 'Шайхантахур', ['tech'], 'Настройка техники и интернета', 5],
      ['Нигора Каримова', '+998 93 300-00-05', 'Мирзо-Улугбек', ['legal', 'translate'], 'Юрист, проконсультирую по пенсиям, пособиям и документам', 2],
      ['Лола Мирзаева', '+998 93 300-00-04', 'Юнусабад', ['kids'], 'Студентка педвуза, могу сидеть с детьми', 6]])
      await run('INSERT INTO volunteers (name,phone,dist,skills,about,created_at) VALUES (?,?,?,?,?,?)', name, phone, dist, JSON.stringify(skills), about, now - days * DAY);

    for (const [f, a, text, st] of [['u3', 'h2', 'Помощник опоздал на 40 минут и не предупредил.', 'open'], ['u2', 'h4', 'Не ответил на звонок по заявке.', 'open'],
      ['u4', 'h3', 'Спасибо за быструю помощь, но в заявке указали не тот район.', 'closed']])
      await run('INSERT INTO complaints (from_id,against_id,text,status,created_at) VALUES (?,?,?,?,?)', U[f], H[a], text, st, now - DAY);

    const admin = (await one(`SELECT id FROM users WHERE role='admin' LIMIT 1`)).id;
    for (const [to, text, ago] of [[H.h1, 'Координатор назначил вам заявку «Помощь с покупкой продуктов»', 2 * MIN], [H.h1, 'Ваш рейтинг обновлён: 4.9', 5 * HOUR],
      [U.u1, 'Заявка «Прогулка с бабушкой» выполнена. Скажите спасибо помощнику', 2 * DAY], [admin, 'Новая заявка «Нужна помощь пожилому человеку»', 5 * MIN],
      [admin, 'Новая заявка «Помощь семье с детьми»', 12 * MIN]])
      await run('INSERT INTO notifications (user_id,text,ts) VALUES (?,?,?)', to, text, now - ago);
    // одну выполненную заявку оставим без оценки, чтобы было что «поблагодарить»
    await run(`UPDATE requests SET rating=NULL WHERE title='Прогулка с бабушкой'`);

    // немного учебного прогресса, чтобы в рейтинге учащихся было кого показать
    await ensureCourses();
    const course = Object.fromEntries((await all('SELECT id,title FROM courses')).map((c) => [c.title, c.id]));
    for (const [who, title, items] of [
      [H.h3, 'Первая помощь', [['fa-v1', 1], ['fa-v2', 1], ['fa-q', 1], ['fa-g1', 1], ['fa-g2', 1]]],
      [H.h3, 'Основы волонтёрства', [['vo-v1', 1], ['vo-q', 1]]],
      [H.h1, 'Как помогать пожилым людям', [['el-v1', 1], ['el-q', 0.75], ['el-g', 1]]],
      [U.u4, 'Защита от мошенников', [['sc-v1', 1], ['sc-q', 1]]],
      [H.h2, 'Первая помощь', [['fa-v1', 1], ['fa-q', 0.8]]],
      [S1, 'Основы волонтёрства', [['vo-v1', 1], ['vo-q', 1], ['vo-g', 1]]],
      [S1, 'Первая помощь', [['fa-v1', 1], ['fa-v2', 1]]]])
      for (const [iid, score] of items) if (course[title])
        await run('INSERT OR IGNORE INTO learn_progress (user_id,course_id,item_id,score,ts) VALUES (?,?,?,?,?)', who, course[title], iid, score, now - DAY);
    if (course['Основы волонтёрства'])
      await run('INSERT INTO coin_log (user_id,amount,reason,ref,ts) VALUES (?,?,?,?,?)', S1, 15, 'Курс «Основы волонтёрства» пройден', `course:${course['Основы волонтёрства']}`, now - DAY);
  });
}

export const isDemo = () => !['0', 'false', 'no'].includes(String(process.env.DEMO ?? 'true').toLowerCase());

export async function initData() {
  const empty = !(await one('SELECT id FROM users LIMIT 1'));
  if (empty && isDemo()) { await seedDemo(); console.log('[socio] загружены демо-данные'); }
  await purgeRemovedPhones();
  await ensureAdmin();
  await ensureCategories();
  await ensureCourses();
  await ensureLessons();
  await ensureRewards(isDemo());
}
