// Тексты для поисковиков на трёх языках: используются сервером (HTML, sitemap) и клиентом (заголовок вкладки).
export const BRAND = 'Socio';
export const LANGS = ['ru', 'uz', 'en'];

// Публичные страницы, которые должны попадать в поиск.
export const PAGE_META = {
  '/': { priority: '1.0', changefreq: 'daily' },
  '/volunteers': { priority: '0.9', changefreq: 'weekly' },
  '/volunteering': { priority: '0.9', changefreq: 'monthly' },
  '/categories': { priority: '0.8', changefreq: 'weekly' },
  '/register': { priority: '0.7', changefreq: 'monthly' },
  '/register/volunteer': { priority: '0.8', changefreq: 'monthly' },
  '/register/help': { priority: '0.8', changefreq: 'monthly' },
  '/register/student': { priority: '0.7', changefreq: 'monthly' },
};

export const SEO = {
  ru: {
    '/': ['Волонтёрство в Ташкенте — стать волонтёром или получить помощь | Socio',
      'Socio — платформа волонтёрства и взаимопомощи в Ташкенте. Станьте волонтёром в своём районе или бесплатно получите помощь: продукты, лекарства, сопровождение пожилых и повседневные дела.'],
    '/volunteers': ['Стать волонтёром в Ташкенте — волонтёрство рядом с домом | Socio',
      'Как стать волонтёром в Ташкенте: регистрация за минуту, заявки от соседей в вашем районе, коины за добрые дела и бесплатное обучение. Волонтёрство без анкет и ожидания.'],
    '/volunteering': ['Волонтёрство в Ташкенте: как стать волонтёром, с чего начать | Socio',
      'Что такое волонтёрство и как стать волонтёром в Ташкенте: регистрация за минуту, помощь пожилым и семьям рядом с домом, обучение для студентов, ответы на частые вопросы.'],
    '/categories': ['Направления волонтёрской помощи в Ташкенте | Socio',
      'С чем помогают волонтёры Socio: покупка продуктов и лекарств, сопровождение пожилых людей, помощь семьям с детьми, бытовые дела. Выберите направление и оставьте заявку.'],
    '/register': ['Регистрация на платформе волонтёрства | Socio',
      'Зарегистрируйтесь в Socio: как волонтёр, как человек, которому нужна помощь, или как студент Академии волонтёров в Ташкенте.'],
    '/register/volunteer': ['Регистрация волонтёра в Ташкенте | Socio',
      'Станьте волонтёром Socio: создайте аккаунт за минуту, в том числе через Google, и начните помогать соседям в своём районе Ташкента.'],
    '/register/help': ['Получить бесплатную помощь волонтёра в Ташкенте | Socio',
      'Нужна помощь? Зарегистрируйтесь и оставьте заявку — волонтёр из вашего района бесплатно поможет с покупками, лекарствами и повседневными делами.'],
    '/register/student': ['Академия волонтёров — обучение волонтёрству | Socio',
      'Бесплатное обучение волонтёрству в Ташкенте: курсы, видеоуроки и задания в Академии Socio для студентов и волонтёров.'],
  },
  uz: {
    '/': ['Toshkentda volontyorlik — koʻngilli boʻling yoki yordam oling | Socio',
      'Socio — Toshkentdagi koʻngillilik va oʻzaro yordam platformasi. Oʻz mahallangizda volontyor boʻling yoki bepul yordam oling: oziq-ovqat, dori-darmon, keksalarga hamrohlik va kundalik ishlar.'],
    '/volunteers': ['Toshkentda volontyor boʻlish — uyingiz yonida koʻngillilik | Socio',
      'Toshkentda qanday qilib volontyor boʻlish mumkin: bir daqiqada roʻyxatdan oʻting, tumaningizdagi qoʻshnilardan arizalar oling, yaxshi ishlar uchun koinlar va bepul taʼlim.'],
    '/volunteering': ['Toshkentda volontyorlik: qanday qilib volontyor boʻlish mumkin | Socio',
      'Volontyorlik nima va Toshkentda qanday qilib volontyor boʻlish mumkin: bir daqiqada roʻyxatdan oʻtish, uy yonida keksalar va oilalarga yordam, talabalar uchun taʼlim, koʻp beriladigan savollar.'],
    '/categories': ['Toshkentda koʻngillilar yordami yoʻnalishlari | Socio',
      'Socio koʻngillilari nimada yordam beradi: oziq-ovqat va dori xarid qilish, keksalarga hamrohlik, bolali oilalarga yordam, maishiy ishlar. Yoʻnalishni tanlang va ariza qoldiring.'],
    '/register': ['Volontyorlik platformasida roʻyxatdan oʻtish | Socio',
      'Socioda roʻyxatdan oʻting: volontyor, yordamga muhtoj inson yoki Toshkentdagi Volontyorlar akademiyasi talabasi sifatida.'],
    '/register/volunteer': ['Toshkentda volontyor sifatida roʻyxatdan oʻtish | Socio',
      'Socio volontyori boʻling: bir daqiqada, jumladan Google orqali akkaunt yarating va Toshkentdagi tumaningizda qoʻshnilarga yordam berishni boshlang.'],
    '/register/help': ['Toshkentda koʻngillidan bepul yordam olish | Socio',
      'Yordam kerakmi? Roʻyxatdan oʻting va ariza qoldiring — tumaningizdagi volontyor xaridlar, dori-darmon va kundalik ishlarda bepul yordam beradi.'],
    '/register/student': ['Volontyorlar akademiyasi — koʻngillilikni oʻrganing | Socio',
      'Toshkentda koʻngillilikni bepul oʻrganing: Socio akademiyasida talabalar va volontyorlar uchun kurslar, video darslar va topshiriqlar.'],
  },
  en: {
    '/': ['Volunteering in Tashkent — become a volunteer or get help | Socio',
      'Socio is a volunteering and mutual aid platform in Tashkent. Volunteer in your own neighbourhood or get free help with groceries, medicine, accompanying elderly people and everyday tasks.'],
    '/volunteers': ['Become a volunteer in Tashkent — volunteering close to home | Socio',
      'How to become a volunteer in Tashkent: sign up in a minute, get requests from neighbours in your district, earn coins for good deeds and take free training.'],
    '/volunteering': ['Volunteering in Tashkent: how to become a volunteer | Socio',
      'What volunteering is and how to become a volunteer in Tashkent: sign up in a minute, help elderly people and families near your home, free training for students and answers to common questions.'],
    '/categories': ['Ways volunteers help in Tashkent | Socio',
      'What Socio volunteers help with: buying groceries and medicine, accompanying elderly people, supporting families with children and household tasks. Pick a category and submit a request.'],
    '/register': ['Sign up for the volunteering platform | Socio',
      'Join Socio as a volunteer, as someone who needs help, or as a student of the Volunteer Academy in Tashkent.'],
    '/register/volunteer': ['Volunteer sign-up in Tashkent | Socio',
      'Become a Socio volunteer: create an account in a minute, including with Google, and start helping neighbours in your district of Tashkent.'],
    '/register/help': ['Get free help from a volunteer in Tashkent | Socio',
      'Need help? Sign up and submit a request — a volunteer from your district will help with shopping, medicine and everyday tasks for free.'],
    '/register/student': ['Volunteer Academy — learn volunteering | Socio',
      'Free volunteering training in Tashkent: courses, video lessons and tasks in the Socio Academy for students and volunteers.'],
  },
};

// Те же вопросы показываются на главной (Landing.vue) — разметка FAQPage должна совпадать с видимым текстом.
export const FAQ = {
  ru: [
    ['Как стать волонтёром в Ташкенте?', 'Зарегистрируйтесь на Socio как волонтёр — это займёт минуту, можно через Google. Координатор подтвердит профиль, и вы начнёте получать заявки от соседей из своего района.'],
    ['Сколько времени нужно уделять волонтёрству?', 'Сколько вам удобно. Даже час в неделю помогает: купить продукты пожилому соседу или привезти лекарства. Вы сами принимаете заявки, когда есть время.'],
    ['Помощь волонтёров платная?', 'Нет, помощь бесплатная. Человек, которому нужна помощь, оставляет заявку, а волонтёр из его района помогает безвозмездно.'],
    ['Можно ли заниматься волонтёрством студентам?', 'Да. Для студентов есть Академия Socio: курсы и видеоуроки о волонтёрстве, а после обучения можно помогать людям на платформе.'],
  ],
  uz: [
    ['Toshkentda qanday qilib volontyor boʻlish mumkin?', 'Socioda volontyor sifatida roʻyxatdan oʻting — bu bir daqiqa vaqt oladi, Google orqali ham mumkin. Koordinator profilingizni tasdiqlaydi va siz tumaningizdagi qoʻshnilardan arizalar ola boshlaysiz.'],
    ['Koʻngillilikka qancha vaqt ajratish kerak?', 'Qancha qulay boʻlsa. Haftasiga bir soat ham yordam beradi: keksa qoʻshniga oziq-ovqat olib berish yoki dori yetkazish. Arizalarni vaqtingiz boʻlganda oʻzingiz qabul qilasiz.'],
    ['Volontyorlar yordami pullikmi?', 'Yoʻq, yordam bepul. Yordamga muhtoj inson ariza qoldiradi, uning tumanidagi volontyor esa begʻaraz yordam beradi.'],
    ['Talabalar volontyorlik qila oladimi?', 'Ha. Talabalar uchun Socio akademiyasi bor: koʻngillilik boʻyicha kurslar va video darslar, oʻqishdan soʻng platformada odamlarga yordam berish mumkin.'],
  ],
  en: [
    ['How do I become a volunteer in Tashkent?', 'Sign up on Socio as a volunteer — it takes a minute and you can use Google. A coordinator will confirm your profile and you will start getting requests from neighbours in your district.'],
    ['How much time does volunteering take?', 'As much as suits you. Even an hour a week helps: buying groceries for an elderly neighbour or delivering medicine. You accept requests yourself whenever you have time.'],
    ['Is volunteer help paid?', 'No, the help is free. A person who needs help submits a request and a volunteer from their district helps at no charge.'],
    ['Can students volunteer?', 'Yes. Students have the Socio Academy: courses and video lessons about volunteering, and after training they can help people on the platform.'],
  ],
};

export const KEYWORDS = {
  ru: 'волонтёрство, волонтерство, волонтёрство в Ташкенте, волонтерство в Узбекистане, стать волонтёром, как стать волонтером, волонтёр, волонтеры Ташкент, волонтерская организация, добровольцы, взаимопомощь, помощь пожилым, благотворительность',
  uz: 'volontyorlik, volontyorlik Toshkentda, koʻngillilik, volontyor, valontyor, koʻngilli, Toshkent volontyorlar, volontyor boʻlish, oʻzaro yordam, keksalarga yordam, xayriya',
  en: 'volunteering, volunteer, volunteering in Tashkent, become a volunteer, volunteers Uzbekistan, mutual aid, help elderly, charity',
};

// Ссылки в HTML-версии страниц (видны поисковикам до загрузки JavaScript)
export const SEO_NAV = {
  ru: [['/volunteering', 'Волонтёрство в Ташкенте'], ['/volunteers', 'Стать волонтёром'], ['/register/help', 'Получить помощь'], ['/categories', 'Направления помощи'], ['/register/student', 'Академия волонтёров для студентов']],
  uz: [['/volunteering', 'Toshkentda volontyorlik'], ['/volunteers', 'Volontyor boʻlish'], ['/register/help', 'Yordam olish'], ['/categories', 'Yordam yoʻnalishlari'], ['/register/student', 'Talabalar uchun volontyorlar akademiyasi']],
  en: [['/volunteering', 'Volunteering in Tashkent'], ['/volunteers', 'Become a volunteer'], ['/register/help', 'Get help'], ['/categories', 'Ways we help'], ['/register/student', 'Volunteer Academy for students']],
};

/** Заголовок и описание страницы на языке lang (или undefined, если страница не публичная). */
export function pageSeo(path, lang) {
  const s = (SEO[lang] || SEO.ru)[path];
  return s && { title: s[0], description: s[1] };
}
