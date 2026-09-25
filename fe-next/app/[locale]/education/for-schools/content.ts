// Content for /education/for-schools -- the school/district lead-capture + commercial
// SEO + GEO page. Localized natively per locale (all six EDUCATION_LOCALES are indexed;
// see page.tsx robots). The conversion form itself is localized separately via t().
//
// Pricing/feature ground truth (keep this in sync with page.tsx orgJsonLd,
// lib/education/educationPackages.ts and components/education/EducationPackages.tsx):
//   - Free tier: lib/education/freeTierLimits.ts -- 3 classes of up to 50 students each,
//     no ads, custom word lists, live whole-class play, 1v1 duels. Not framed as "forever"
//     (see educationClaims.test.ts) -- it is simply the free tier, with no expiry.
//   - Teacher Pro: $9/mo (TEACHER_PRO_PRICE_USD) -- unlimited classes, per-class analytics,
//     PDF/CSV progress reports (components/teacher/reports/ProgressReportPDF.tsx,
//     lib/education/assignmentProgressReport.ts). 14-day trial (TEACHER_TRIAL_DAYS).
//   - Classroom plan: $39/term (CLASSROOM_PLAN_PRICE_USD) -- lead-capture price anchor for
//     a whole class: every Teacher Pro feature plus class streaks and priority support.
//   - Schools & districts: contact us, price on request (EDUCATION_PACKAGES 'school',
//     priceUsd: null). Admin dashboards, cross-class/district analytics, curriculum
//     libraries and SSO (Clever/ClassLink/Google) are NOT shipped -- they are roadmap asks
//     surfaced through the same lead form (schoolLead.ts), never advertised as included.
//   - Google Classroom: a Stream-share add-on exists today (googleClassroomAddon.ts) --
//     say "share/post to your Classroom Stream", not "attach" (attachment-API creation is
//     deferred).

export const EDUCATION_LOCALES = ['en', 'he', 'sv', 'ja', 'es', 'ru'] as const;
export type EducationLocale = (typeof EDUCATION_LOCALES)[number];

export interface ForSchoolsFaq {
  q: string;
  a: string;
}

export interface ForSchoolsCompareRow {
  competitor: string;
  freeTierLimit: string;
  lexiclash: string;
}

export interface ForSchoolsContent {
  metaTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  heroTag: string;
  heroH1: string;
  heroHighlight: string;
  heroSubtitle: string;
  freeForeverTitle: string;
  freeForeverBody: string;
  whyTitle: string;
  why: { title: string; body: string }[];
  compareTitle: string;
  compareIntro: string;
  /** Comparison-table column headers. Previously hardcoded English. */
  compareHeaders: { tool: string; theirFreeTier: string };
  compareRows: ForSchoolsCompareRow[];
  comingTitle: string;
  comingIntro: string;
  coming: { title: string; body: string }[];
  leadTitle: string;
  leadIntro: string;
  faqTitle: string;
  faqs: ForSchoolsFaq[];
  heroCta1: string;
  heroCta2: string;
  closingTitle: string;
  closingCta: string;
}

const EN: ForSchoolsContent = {
  metaTitle: 'Free Vocabulary & ESL Word Games for Schools — LexiClash',
  metaDescription:
    'Vocabulary games and ESL spelling practice for K-12 classrooms — no student logins, 6 languages (English, Hebrew, Spanish, Swedish, Japanese, Russian), 1v1 word duels and whole-class play for up to 50 students, no ads. Free 14-day Teacher Pro trial. Teacher Pro $9/mo; Classroom plan $39/term.',
  ogTitle: 'LexiClash for Schools — Vocabulary & ESL Word Games',
  ogDescription:
    'Free vocabulary and ESL word games for every classroom — no student logins, 6 languages, 1v1 duels, no ads. Free 14-day trial. Teacher Pro $9/mo; Classroom plan $39/term.',
  heroTag: 'For Schools & Districts',
  heroH1: 'Vocabulary games your whole school can',
  heroHighlight: 'actually use',
  heroSubtitle:
    'Try Teacher Pro free for 14 days -- no student logins, no credit card. No ads anywhere in the classroom, ever. 6 languages including Hebrew RTL, live whole-class play for up to 50 students, and 1v1 word duels. After your trial, the classroom game stays free for individual teachers -- Teacher Pro and the Classroom plan scale up from there.',
  freeForeverTitle: 'Start free -- Teacher Pro $9/mo, Classroom plan $39/term',
  freeForeverBody:
    'Every teacher gets a 14-day free trial of Teacher Pro. After the trial, the classroom game -- live whole-class play, 1v1 duels, custom word lists, no ads -- stays free for individual teachers, for up to 3 classes of 50 students each. Teacher Pro ($9/mo) adds per-class analytics, PDF/CSV progress reports and unlimited classes. The Classroom plan ($39/term) covers a whole class with every Teacher Pro feature, plus class streaks and priority support. Rolling out to a whole school or district? Admin dashboards, cross-class analytics, curriculum libraries and SSO are on our roadmap -- tell us what you need below.',
  whyTitle: 'Why schools choose LexiClash',
  why: [
    { title: 'No student logins', body: 'Students join a class game with a code -- no accounts to provision, no rostering before you can play, no student data to manage.' },
    { title: '6 languages, including Hebrew RTL', body: 'English, Hebrew (full right-to-left), Spanish, Swedish, Japanese and Russian with native dictionaries -- built for bilingual, ESL and immersion classrooms.' },
    { title: '1v1 duels + whole-class', body: 'Pair students head-to-head or run a live whole-class round, for up to 50 students. Word-building gameplay, not passive multiple-choice.' },
    { title: 'Zero prep, zero ads', body: 'Pick a word list -- yours or ours -- pick a mode, share the code. No setup, and no ads anywhere in the classroom, ever.' },
  ],
  compareTitle: 'How the free tiers actually compare',
  compareHeaders: { tool: 'Tool', theirFreeTier: 'Their free tier' },
  compareIntro:
    'Free classroom tools vary a lot in what they actually let a real class do before charging per teacher or per student. Here is the honest comparison.',
  compareRows: [
    { competitor: 'Kahoot', freeTierLimit: 'Free tier allows 10-40 live players depending on account type -- tight for a full class.', lexiclash: 'Every class fits free, up to 50 students. Teacher Pro $9/mo adds analytics and reports.' },
    { competitor: 'Gimkit', freeTierLimit: 'Free tier allows unlimited players on featured modes, but reports and pro modes are paid.', lexiclash: 'Also free for the whole class (up to 50), plus real 1v1 duels and 6 languages including Hebrew RTL.' },
    { competitor: 'Vocabulary.com', freeTierLimit: 'No meaningful free tier for real classroom use -- paid plans required to get started.', lexiclash: 'Free for the whole class, no card required. Teacher Pro $9/mo adds analytics and reports.' },
    { competitor: 'Wordwall', freeTierLimit: 'Free tier limited to a small number of activity types.', lexiclash: 'Every activity, free for the whole class, up to 50 students. Teacher Pro $9/mo unlocks unlimited classes.' },
  ],
  comingTitle: 'On our roadmap for schools & districts',
  comingIntro:
    "These are the features schools tell us they need at scale. The classroom game and Teacher Pro's analytics and reports are shipping today -- the items below are not built yet. Tell us what your school needs and we'll follow up as they become available.",
  coming: [
    { title: 'District admin dashboard', body: 'Roadmap: see usage across every class and teacher in your school or district from one place.' },
    { title: 'Cross-class & district analytics', body: 'Roadmap: cohort benchmarks and district-wide reports, beyond the per-class reports Teacher Pro already gives you today.' },
    { title: 'Curriculum content libraries', body: 'Roadmap: curated multilingual word sets mapped to your curriculum, across all six languages.' },
    { title: 'Single sign-on (SSO)', body: 'Roadmap: Clever, ClassLink and Google Sign-In for easy district rollout. Tell us which one your school uses.' },
  ],
  leadTitle: 'Tell us about your school',
  leadIntro:
    "Using LexiClash with your class, or rolling it out to a whole school or district? Tell us what you need -- we'll follow up about the Classroom plan ($39/term), a school or district quote, or early access to the roadmap features above.",
  faqTitle: 'Schools & districts -- frequently asked',
  faqs: [
    { q: 'Is LexiClash free for teachers?', a: 'Yes. Every teacher gets a 14-day free trial of Teacher Pro: whole-class play, 1v1 duels, all six languages, no ads, no student logins, no credit card. After the trial, the classroom game stays free for individual teachers -- up to 3 classes of 50 students each. Teacher Pro is $9/month and adds per-class analytics, PDF/CSV progress reports and unlimited classes.' },
    { q: 'What does a school or district plan include?', a: 'The Classroom plan ($39/term, through the form on this page) covers a whole class with every Teacher Pro feature -- analytics, reports, homework tools -- plus class streaks and priority support. Admin dashboards, cross-class analytics, curriculum libraries and SSO for school or district rollout are on our roadmap, not shipped yet -- tell us what you need and we will follow up, with pricing on request.' },
    { q: 'Do students need accounts or logins?', a: 'No. Students join a class game with a code -- nothing to provision, no student data to manage. That makes a school-wide rollout far simpler than tools that require rostering or SSO before play.' },
    { q: 'Which languages are supported?', a: 'English, Hebrew (full right-to-left support), Spanish, Swedish, Japanese and Russian, each with a native dictionary -- built for ESL, bilingual and immersion classrooms.' },
    { q: 'How do we start our trial or get a school plan?', a: "Sign up as a teacher to start your own 14-day Teacher Pro trial. Rolling out to a whole class or school instead? Fill in the form on this page with your role, school and rough student count, and we'll follow up about the Classroom plan or a school/district quote." },
    { q: 'How is this different from Kahoot, Gimkit or Quizlet?', a: 'Those are quiz/flashcard tools that are English-first. LexiClash is a word-building game (not multiple-choice), supports six languages including Hebrew RTL, fits a whole class of up to 50 students for free, and offers true 1v1 duels.' },
    { q: 'Can I use LexiClash for ESL or English language learner (ELL) students?', a: 'Yes — LexiClash was built with language learners in mind. It supports English, Hebrew (RTL), Spanish, Swedish, Japanese and Russian with native dictionaries. Students can compete in their own language or practice the language they are learning, making it a natural fit for ESL, bilingual and immersion classrooms. Word-building gameplay reinforces vocabulary and spelling organically, without passive multiple-choice.' },
    { q: 'Can students use LexiClash as a spelling practice game?', a: 'Yes. LexiClash\'s word-building format — where students find, spell and submit real words against a live opponent or the whole class — makes spelling practice competitive and engaging rather than passive. Teachers use it for spelling warm-ups, end-of-unit vocabulary reviews and in-class tournaments.' },
    { q: 'Does LexiClash work on Chromebooks and school devices?', a: 'Yes. LexiClash runs entirely in the browser — no app to install, no student accounts to provision. It works on Chromebooks, iPads, desktops and phones. Students join with a game code, and teachers can share assignments straight to Google Classroom. District SSO (Clever, ClassLink) is on our roadmap.' },
  ],
  heroCta1: 'Play a class game free',
  heroCta2: 'Tell us about your school',
  closingTitle: 'Ready to bring LexiClash to your school?',
  closingCta: 'Tell us about your school',
};

const RU: ForSchoolsContent = {
  metaTitle: 'Бесплатные игры на словарный запас для школ — LexiClash',
  metaDescription:
    'Игры для изучения лексики и английского языка в школах — без входа ученика, 6 языков (английский, иврит, испанский, шведский, японский, русский), словесные поединки 1 на 1 и командные игры для всего класса (до 50 учеников), без рекламы. Бесплатный пробный период Teacher Pro на 14 дней. Teacher Pro — $9/мес; план для класса — $39/семестр.',
  ogTitle: 'LexiClash для школ — игры на словарный запас',
  ogDescription:
    'Бесплатные словесные игры для каждого класса — без входа ученика, 6 языков, поединки 1 на 1, без рекламы. Бесплатный пробный период. Teacher Pro — $9/мес; план для класса — $39/семестр.',
  heroTag: 'Для школ и районов',
  heroH1: 'Словесные игры, которые ваша школа действительно может',
  heroHighlight: 'использовать',
  heroSubtitle:
    'Попробуйте Teacher Pro бесплатно 14 дней — без входа для учеников, без кредитной карты. Без рекламы на уроках, никогда. 6 языков, включая иврит с поддержкой RTL, командные игры в реальном времени для всего класса (до 50 учеников) и поединки 1 на 1. После пробного периода командная игра остаётся бесплатной для отдельных учителей — Teacher Pro и план для класса расширяют возможности дальше.',
  freeForeverTitle: 'Начните бесплатно — Teacher Pro за $9/мес, план для класса за $39/семестр',
  freeForeverBody:
    'Каждый учитель получает бесплатный 14-дневный пробный период Teacher Pro. После пробного периода командная игра — живая игра для всего класса, поединки 1 на 1, собственные списки слов, без рекламы — остаётся бесплатной для отдельных учителей, до 3 классов по 50 учеников в каждом. Teacher Pro (за $9/мес) добавляет аналитику по классу, отчёты о прогрессе в PDF/CSV и неограниченное количество классов. Разворачиваете на весь класс или школу? План для класса (за $39/семестр) охватывает целый класс со всеми функциями Teacher Pro, плюс серии побед класса и приоритетную поддержку. Панель администратора, аналитика между классами, библиотеки учебных материалов и SSO — в нашей дорожной карте. Расскажите нам, что вам нужно, в форме ниже.',
  whyTitle: 'Почему школы выбирают LexiClash',
  why: [
    { title: 'Без входа для учеников', body: 'Ученики присоединяются к командной игре по коду — не нужно создавать аккаунты, не нужна регистрация класса перед началом игры, не нужно управлять данными учеников.' },
    { title: '6 языков, включая иврит с RTL', body: 'Английский, иврит (полная поддержка справа налево), испанский, шведский, японский и русский с встроенными словарями — разработано для двуязычных, ESL и погруженных в языковую среду классов.' },
    { title: 'Поединки 1 на 1 и командные игры', body: 'Ставьте учеников в пары для поединков или запускайте командную игру в реальном времени для всего класса, до 50 учеников. Игра в составление слов, а не пассивный множественный выбор.' },
    { title: 'Без подготовки, без рекламы', body: 'Выберите список слов — свой или наш, — выберите режим, поделитесь кодом. Без подготовки и без рекламы на уроках, никогда.' },
  ],
  compareTitle: 'Честное сравнение бесплатных версий',
  compareHeaders: { tool: 'Сервис', theirFreeTier: 'Их бесплатный тариф' },
  compareIntro:
    'Бесплатные инструменты для уроков сильно различаются в том, что они реально позволяют делать настоящему классу, прежде чем начать брать плату за учителя или ученика. Вот честное сравнение.',
  compareRows: [
    { competitor: 'Kahoot', freeTierLimit: 'Бесплатная версия допускает 10–40 живых игроков в зависимости от типа аккаунта — тесно для полного класса.', lexiclash: 'Любой класс помещается бесплатно, до 50 учеников. Teacher Pro за $9/мес добавляет аналитику и отчёты.' },
    { competitor: 'Gimkit', freeTierLimit: 'Бесплатная версия допускает неограниченное число игроков в основных режимах, но отчёты и pro-режимы платные.', lexiclash: 'Тоже бесплатно для всего класса (до 50), плюс настоящие поединки 1 на 1 и 6 языков, включая иврит с RTL.' },
    { competitor: 'Vocabulary.com', freeTierLimit: 'Нет полноценной бесплатной версии для реального использования в классе — для начала нужен платный план.', lexiclash: 'Бесплатно для всего класса, без карты. Teacher Pro за $9/мес добавляет аналитику и отчёты.' },
    { competitor: 'Wordwall', freeTierLimit: 'Бесплатная версия ограничена небольшим числом типов активностей.', lexiclash: 'Любая активность, бесплатно для всего класса, до 50 учеников. Teacher Pro за $9/мес снимает ограничение на число классов.' },
  ],
  comingTitle: 'В нашей дорожной карте для школ и районов',
  comingIntro:
    'Это функции, которые школы говорят нам, что им нужны в большом масштабе. Командная игра, а также аналитика и отчёты Teacher Pro уже доступны сегодня — пункты ниже пока не реализованы. Расскажите нам, что нужно вашей школе, и мы свяжемся с вами, когда они появятся.',
  coming: [
    { title: 'Панель администратора района', body: 'В дорожной карте: смотрите использование во всех классах и учителями вашей школы или района в одном месте.' },
    { title: 'Аналитика между классами и по району', body: 'В дорожной карте: сравнительные тесты и отчёты на уровне района, в дополнение к аналитике по классу, которую Teacher Pro уже даёт вам сегодня.' },
    { title: 'Библиотеки учебных материалов', body: 'В дорожной карте: отобранные наборы слов на нескольких языках, соответствующие вашей программе, на всех шести языках.' },
    { title: 'Единый вход (SSO)', body: 'В дорожной карте: Clever, ClassLink и вход через Google для простого развёртывания на уровне района. Расскажите нам, какой из них использует ваша школа.' },
  ],
  leadTitle: 'Расскажите нам о своей школе',
  leadIntro:
    'Уже используете LexiClash в классе или разворачиваете его на всю школу или район? Расскажите нам, что вам нужно — мы свяжемся с вами по поводу плана для класса ($39/семестр), расчёта стоимости для школы или района, или раннего доступа к функциям из дорожной карты выше.',
  faqTitle: 'Часто задаваемые вопросы школ и районов',
  faqs: [
    { q: 'LexiClash бесплатен для учителей?', a: 'Да. Каждый учитель получает бесплатный 14-дневный пробный период Teacher Pro: командные игры, поединки 1 на 1, все шесть языков, без рекламы, без входа для учеников, без кредитной карты. После пробного периода командная игра остаётся бесплатной для отдельных учителей — до 3 классов по 50 учеников в каждом. Teacher Pro стоит $9 в месяц и добавляет аналитику по классу, отчёты о прогрессе в PDF/CSV и неограниченное количество классов.' },
    { q: 'Что включает школьный или районный план?', a: 'План для класса ($39/семестр, через форму на этой странице) охватывает целый класс со всеми функциями Teacher Pro — аналитикой, отчётами, инструментами для домашних заданий — плюс серии побед класса и приоритетную поддержку. Панель администратора, аналитика между классами, библиотеки учебных материалов и SSO для развёртывания на уровне школы или района — в нашей дорожной карте и пока не реализованы. Расскажите нам, что вам нужно, и мы свяжемся с вами; цена — по запросу.' },
    { q: 'Нужны ли учащимся аккаунты или вход?', a: 'Нет. Ученики присоединяются к командной игре по коду — не нужно ничего настраивать, не нужно управлять данными учеников. Это делает развертывание по всей школе намного проще, чем инструменты, которые требуют регистрации или SSO перед игрой.' },
    { q: 'Какие языки поддерживаются?', a: 'Английский, иврит (с полной поддержкой справа налево), испанский, шведский, японский и русский, каждый со встроенным словарем — разработано для ESL, двуязычных и погруженных в языковую среду классов.' },
    { q: 'Как начать пробный период или получить школьный план?', a: 'Зарегистрируйтесь как учитель, чтобы начать собственный 14-дневный пробный период Teacher Pro. Разворачиваете на весь класс или школу? Заполните форму на этой странице, указав свою роль, школу и примерное количество учеников — мы свяжемся с вами по поводу плана для класса или расчёта стоимости для школы или района.' },
    { q: 'Чем это отличается от Kahoot, Gimkit или Quizlet?', a: 'Это инструменты викторин/карточек, ориентированные на английский язык. LexiClash — это игра в составление слов (не множественный выбор), поддерживает шесть языков, включая иврит с RTL, бесплатно вмещает весь класс до 50 учеников и предлагает настоящие поединки 1 на 1.' },
    { q: 'Можно ли использовать LexiClash для ESL или учеников, изучающих английский язык?', a: 'Да — LexiClash разработан с учетом изучающих языки. Поддерживает английский, иврит (RTL), испанский, шведский, японский и русский со встроенными словарями. Ученики могут соревноваться на своем языке или тренировать изучаемый язык, что делает его естественным выбором для ESL, двуязычных и погруженных в языковую среду классов. Игра в составление слов — где ученики находят, пишут и вводят настоящие слова против живого противника или класса — укрепляет словарный запас и орфографию органически, без пассивного множественного выбора.' },
    { q: 'Могут ли ученики использовать LexiClash как игру для тренировки орфографии?', a: 'Да. Формат LexiClash, где ученики находят, пишут и вводят настоящие слова против живого противника или класса, делает тренировку орфографии конкурентной и увлекательной, а не пассивной. Учители используют ее для словарных разминок, финальных обзоров и школьных турниров.' },
    { q: 'Работает ли LexiClash на Chromebook и школьных устройствах?', a: 'Да. LexiClash работает полностью в браузере — не нужно устанавливать приложение, не нужно создавать аккаунты для учеников. Это работает на Chromebook, iPad, ПК и телефонах. Ученики присоединяются по коду игры, а учителя могут делиться заданиями прямо в Google Classroom. SSO на уровне района (Clever, ClassLink) — в нашей дорожной карте.' },
  ],
  heroCta1: 'Запустить командную игру бесплатно',
  heroCta2: 'Расскажите нам о своей школе',
  closingTitle: 'Готовы принести LexiClash в свою школу?',
  closingCta: 'Расскажите нам о своей школе',
};

const HE: ForSchoolsContent = {
  metaTitle: 'משחקי אוצר מילים ואנגלית לבתי ספר — חינם | LexiClash',
  metaDescription:
    'משחקי אוצר מילים ותרגול איות לכיתות — בלי חשבונות תלמידים, 6 שפות (אנגלית, עברית, ספרדית, שוודית, יפנית, רוסית), דו-קרבות מילים 1 על 1 ומשחק כיתתי לכל הכיתה (עד 50 תלמידים), בלי פרסומות. ניסיון חינם של Teacher Pro ל-14 יום. Teacher Pro ב-$9 לחודש; תוכנית כיתה ב-$39 לסמסטר.',
  ogTitle: 'LexiClash לבתי ספר — משחקי אוצר מילים ואנגלית',
  ogDescription:
    'משחקי מילים חינם לכל כיתה — בלי חשבונות תלמידים, 6 שפות, דו-קרבות 1 על 1, בלי פרסומות. ניסיון חינם ל-14 יום. Teacher Pro ב-$9 לחודש; תוכנית כיתה ב-$39 לסמסטר.',
  heroTag: 'לבתי ספר ורשויות חינוך',
  heroH1: 'משחקי אוצר מילים שכל בית הספר שלכם',
  heroHighlight: 'באמת ישתמש בהם',
  heroSubtitle:
    'נסו את Teacher Pro חינם ל-14 יום — בלי חשבונות תלמידים, בלי כרטיס אשראי. בלי פרסומות בכיתה, אף פעם. 6 שפות כולל עברית מימין לשמאל, משחק כיתתי חי לכל הכיתה (עד 50 תלמידים) ודו-קרבות מילים 1 על 1. בתום הניסיון, המשחק הכיתתי נשאר חינם למורים בודדים — Teacher Pro ותוכנית הכיתה מתרחבות משם.',
  freeForeverTitle: 'מתחילים חינם — Teacher Pro ב-$9 לחודש, תוכנית כיתה ב-$39 לסמסטר',
  freeForeverBody:
    'כל מורה מקבל ניסיון חינם של 14 יום ל-Teacher Pro. בתום הניסיון, המשחק הכיתתי — משחק חי לכל הכיתה, דו-קרבות 1 על 1, רשימות מילים משלכם, בלי פרסומות — נשאר חינם למורים בודדים, עד 3 כיתות של 50 תלמידים כל אחת. Teacher Pro (ב-$9 לחודש) מוסיף ניתוח נתונים לכל כיתה, דוחות התקדמות ל-PDF/CSV וכיתות ללא הגבלה. מרחיבים לכיתה שלמה או לבית ספר? תוכנית הכיתה (ב-$39 לסמסטר) כוללת כיתה שלמה עם כל יכולות Teacher Pro, בתוספת רצף ניצחונות לכיתה ותמיכה בעדיפות. לוח ניהול, ניתוח נתונים בין כיתות, ספריות תוכן לימודי ו-SSO נמצאים במפת הדרכים שלנו — ספרו לנו מה אתם צריכים למטה.',
  whyTitle: 'למה בתי ספר בוחרים ב-LexiClash',
  why: [
    { title: 'בלי חשבונות תלמידים', body: 'התלמידים מצטרפים למשחק כיתתי עם קוד — אין חשבונות להקים, אין רישום כיתה לפני שמתחילים לשחק, אין נתוני תלמידים לנהל.' },
    { title: '6 שפות, כולל עברית מימין לשמאל', body: 'אנגלית, עברית (תמיכה מלאה מימין לשמאל), ספרדית, שוודית, יפנית ורוסית עם מילונים מובנים — בנוי לכיתות דו-לשוניות, ESL וטבילה לשונית.' },
    { title: 'דו-קרבות 1 על 1 + משחק כיתתי', body: 'הצמידו תלמידים בדו-קרב ראש בראש או הפעילו סבב חי לכל הכיתה, עד 50 תלמידים. משחק של בניית מילים, לא שאלות סגורות פסיביות.' },
    { title: 'אפס הכנה, אפס פרסומות', body: 'בחרו רשימת מילים — שלכם או שלנו — בחרו מצב משחק, שתפו את הקוד. בלי הכנה, ובלי פרסומות בכיתה, אף פעם.' },
  ],
  compareTitle: 'איך באמת נראית ההשוואה בין המסלולים החינמיים',
  compareHeaders: { tool: 'כלי', theirFreeTier: 'המסלול החינמי שלהם' },
  compareIntro:
    'כלים חינמיים לכיתה נבדלים מאוד במה שהם באמת מאפשרים לכיתה אמיתית לפני שגובים תשלום למורה או לתלמיד. הנה ההשוואה הכנה.',
  compareRows: [
    { competitor: 'Kahoot', freeTierLimit: 'המסלול החינמי מאפשר 10–40 שחקנים חיים בהתאם לסוג החשבון — צפוף לכיתה מלאה.', lexiclash: 'כל כיתה מתאימה בחינם, עד 50 תלמידים. Teacher Pro ב-$9 לחודש מוסיף ניתוח נתונים ודוחות.' },
    { competitor: 'Gimkit', freeTierLimit: 'המסלול החינמי מאפשר מספר בלתי מוגבל של שחקנים במצבים נבחרים, אך דוחות ומצבים מתקדמים בתשלום.', lexiclash: 'גם חינם לכל הכיתה (עד 50), בתוספת דו-קרבות 1 על 1 אמיתיים ו-6 שפות כולל עברית מימין לשמאל.' },
    { competitor: 'Vocabulary.com', freeTierLimit: 'אין מסלול חינמי משמעותי לשימוש כיתתי אמיתי — נדרשת תוכנית בתשלום כדי להתחיל.', lexiclash: 'חינם לכל הכיתה, בלי כרטיס אשראי. Teacher Pro ב-$9 לחודש מוסיף ניתוח נתונים ודוחות.' },
    { competitor: 'Wordwall', freeTierLimit: 'המסלול החינמי מוגבל למספר קטן של סוגי פעילויות.', lexiclash: 'כל פעילות, חינם לכל הכיתה, עד 50 תלמידים. Teacher Pro ב-$9 לחודש מסיר את הגבלת הכיתות.' },
  ],
  comingTitle: 'במפת הדרכים שלנו לבתי ספר ורשויות',
  comingIntro:
    'אלה היכולות שבתי ספר אומרים לנו שהם צריכים בקנה מידה גדול. המשחק הכיתתי וניתוח הנתונים והדוחות של Teacher Pro כבר קיימים היום — הפריטים למטה עדיין לא נבנו. ספרו לנו מה בית הספר שלכם צריך ונחזור אליכם כשהם יהיו זמינים.',
  coming: [
    { title: 'לוח ניהול לרשות החינוך', body: 'במפת הדרכים: ראו את השימוש בכל כיתה וכל מורה בבית הספר או ברשות שלכם ממקום אחד.' },
    { title: 'ניתוח נתונים בין כיתות וברמת הרשות', body: 'במפת הדרכים: השוואות בין קבוצות ודוחות ברמת הרשות, מעבר לניתוח הנתונים לכל כיתה ש-Teacher Pro כבר נותן לכם היום.' },
    { title: 'ספריות תוכן לימודי', body: 'במפת הדרכים: מערכי מילים רב-לשוניים אצורים וממופים לתכנית הלימודים שלכם, בכל שש השפות.' },
    { title: 'התחברות מאוחדת (SSO)', body: 'במפת הדרכים: Clever, ClassLink והתחברות עם Google להטמעה קלה ברמת הרשות. ספרו לנו באיזה מהם משתמש בית הספר שלכם.' },
  ],
  leadTitle: 'ספרו לנו על בית הספר שלכם',
  leadIntro:
    'כבר משתמשים ב-LexiClash בכיתה, או מרחיבים לבית ספר או רשות שלמים? ספרו לנו מה אתם צריכים — נחזור אליכם בנוגע לתוכנית הכיתה (ב-$39 לסמסטר), הצעת מחיר לבית ספר או רשות, או גישה מוקדמת ליכולות שבמפת הדרכים למעלה.',
  faqTitle: 'בתי ספר ורשויות — שאלות נפוצות',
  faqs: [
    { q: 'האם LexiClash חינם למורים?', a: 'כן. כל מורה מקבל ניסיון חינם של 14 יום ל-Teacher Pro: משחק כיתתי, דו-קרבות 1 על 1, כל שש השפות, בלי פרסומות, בלי חשבונות תלמידים, בלי כרטיס אשראי. בתום הניסיון, המשחק הכיתתי נשאר חינם למורים בודדים — עד 3 כיתות של 50 תלמידים כל אחת. Teacher Pro עולה $9 לחודש ומוסיף ניתוח נתונים לכל כיתה, דוחות התקדמות ל-PDF/CSV וכיתות ללא הגבלה.' },
    { q: 'מה כוללת תוכנית בית ספר או רשות?', a: 'תוכנית הכיתה (ב-$39 לסמסטר, דרך הטופס בעמוד הזה) כוללת כיתה שלמה עם כל יכולות Teacher Pro — ניתוח נתונים, דוחות, כלי שיעורי בית — בתוספת רצף ניצחונות לכיתה ותמיכה בעדיפות. לוח ניהול, ניתוח נתונים בין כיתות, ספריות תוכן לימודי ו-SSO להטמעה ברמת בית ספר או רשות נמצאים במפת הדרכים שלנו ועדיין לא הושקו — ספרו לנו מה אתם צריכים ונחזור אליכם, עם הצעת מחיר לפי בקשה.' },
    { q: 'האם תלמידים צריכים חשבונות או התחברות?', a: 'לא. התלמידים מצטרפים למשחק כיתתי עם קוד — אין מה להקים, אין נתוני תלמידים לנהל. זה הופך הטמעה בכל בית הספר להרבה יותר פשוטה מכלים שדורשים רישום או SSO לפני שמשחקים.' },
    { q: 'אילו שפות נתמכות?', a: 'אנגלית, עברית (תמיכה מלאה מימין לשמאל), ספרדית, שוודית, יפנית ורוסית, כל אחת עם מילון מובנה — בנוי לכיתות ESL, דו-לשוניות וטבילה לשונית.' },
    { q: 'איך מתחילים את הניסיון או מקבלים תוכנית בית ספר?', a: 'הירשמו כמורה כדי להתחיל ניסיון Teacher Pro של 14 יום משלכם. מרחיבים לכיתה שלמה או לבית ספר? מלאו את הטופס בעמוד הזה עם התפקיד שלכם, בית הספר ומספר תלמידים משוער, ונחזור אליכם בנוגע לתוכנית הכיתה או להצעת מחיר לבית ספר או רשות.' },
    { q: 'במה זה שונה מ-Kahoot, Gimkit או Quizlet?', a: 'אלה כלי חידונים/כרטיסיות שמתמקדים באנגלית. LexiClash הוא משחק בניית מילים (לא שאלות סגורות), תומך בשש שפות כולל עברית מימין לשמאל, מתאים לכיתה שלמה של עד 50 תלמידים בחינם, ומציע דו-קרבות אמיתיים 1 על 1.' },
    { q: 'אפשר להשתמש ב-LexiClash לתלמידי ESL או לומדי אנגלית (ELL)?', a: 'כן — LexiClash נבנה עם לומדי שפות במחשבה. הוא תומך באנגלית, עברית (מימין לשמאל), ספרדית, שוודית, יפנית ורוסית עם מילונים מובנים. תלמידים יכולים להתחרות בשפה שלהם או לתרגל את השפה שהם לומדים, מה שהופך אותו למתאים באופן טבעי לכיתות ESL, דו-לשוניות וטבילה לשונית. משחק בניית המילים — שבו תלמידים מוצאים, מאייתים ומגישים מילים אמיתיות מול יריב חי או מול כל הכיתה — מחזק אוצר מילים ואיות באופן טבעי, בלי שאלות סגורות פסיביות.' },
    { q: 'אפשר להשתמש ב-LexiClash כמשחק לתרגול איות?', a: 'כן. פורמט בניית המילים של LexiClash — שבו תלמידים מוצאים, מאייתים ומגישים מילים אמיתיות מול יריב חי או מול כל הכיתה — הופך את תרגול האיות לתחרותי ומרתק במקום פסיבי. מורים משתמשים בו לחימום אוצר מילים, לחזרות בסוף יחידה ולטורנירים כיתתיים.' },
    { q: 'האם LexiClash עובד על Chromebook ומכשירי בית ספר?', a: 'כן. LexiClash רץ לגמרי בדפדפן — בלי אפליקציה להתקין, בלי חשבונות תלמידים להקים. הוא עובד על Chromebook, iPad, מחשבים שולחניים וטלפונים. התלמידים מצטרפים עם קוד משחק, והמורים יכולים לשתף מטלות ישירות ל-Google Classroom. SSO ברמת הרשות (Clever, ClassLink) נמצא במפת הדרכים שלנו.' },
  ],
  heroCta1: 'שחקו משחק כיתתי חינם',
  heroCta2: 'ספרו לנו על בית הספר שלכם',
  closingTitle: 'מוכנים להביא את LexiClash לבית הספר שלכם?',
  closingCta: 'ספרו לנו על בית הספר שלכם',
};

const SV: ForSchoolsContent = {
  metaTitle: 'Gratis ordförråds- och ESL-ordspel för skolor — LexiClash',
  metaDescription:
    'Ordförråds- och ESL-stavningsspel för K-12-klassrum — ingen inloggning för elever, 6 språk (engelska, hebreiska, spanska, svenska, japanska, ryska), 1v1-orddueller och klassomfattande spel för upp till 50 elever, inga annonser. Gratis 14-dagars Teacher Pro-provperiod. Teacher Pro $9/mån; Klassplan $39/termin.',
  ogTitle: 'LexiClash för skolor — Ordförråds- och ESL-ordspel',
  ogDescription:
    'Gratis ord- och ordförrådsspel för varje klassrum — ingen inloggning för elever, 6 språk, 1v1-dueller, inga annonser. Gratis provperiod. Teacher Pro $9/mån; Klassplan $39/termin.',
  heroTag: 'För skolor och distrikt',
  heroH1: 'Ordspel som din skola faktiskt kan',
  heroHighlight: 'använda',
  heroSubtitle:
    'Prova Teacher Pro gratis i 14 dagar — ingen inloggning för elever, inget kreditkort. Inga annonser i klassrummet, någonsin. 6 språk inklusive hebreiska RTL, direktsänt klassomfattande spel för upp till 50 elever och 1v1-orddueller. Efter provperioden förblir klassrumsspelet gratis för enskilda lärare — Teacher Pro och Klassplanen skalar därifrån.',
  freeForeverTitle: 'Börja gratis — Teacher Pro $9/mån, Klassplan $39/termin',
  freeForeverBody:
    'Varje lärare får en 14-dagars gratis provperiod av Teacher Pro. Efter provperioden förblir klassrumsspelet — direktsänt klassomfattande spel, 1v1-dueller, egna ordlistor, inga annonser — gratis för enskilda lärare, för upp till 3 klasser med 50 elever vardera. Teacher Pro ($9/mån) lägger till statistik per klass, PDF/CSV-rapporter och obegränsat antal klasser. Ska ni rulla ut till en hel klass eller skola? Klassplanen ($39/termin) täcker en hel klass med alla Teacher Pro-funktioner, plus klasstreaks och prioriterad support. Administratörsöversikter, distriktsövergripande statistik, läroplansbibliotek och SSO finns på vår färdplan — berätta vad ni behöver nedan.',
  whyTitle: 'Varför skolor väljer LexiClash',
  why: [
    { title: 'Ingen inloggning för elever', body: 'Eleverna ansluter till ett klassrumsspel med en kod — inga konton att skapa, ingen klasslista innan ni kan spela, inga elevdata att hantera.' },
    { title: '6 språk, inklusive hebreiska RTL', body: 'Engelska, hebreiska (fullt höger-till-vänster), spanska, svenska, japanska och ryska med inbyggda ordböcker — byggda för tvåspråkiga, ESL- och immersionsklassrum.' },
    { title: '1v1-dueller + klassomfattande spel', body: 'Para ihop elever ansikte mot ansikte eller kör en live-runda med hela klassen, upp till 50 elever. Ordbyggande spel, inte passiva flervalsfrågor.' },
    { title: 'Noll förberedelse, noll annonser', body: 'Välj en ordlista — er egen eller vår — välj ett läge, dela koden. Ingen förberedelse, och inga annonser i klassrummet, någonsin.' },
  ],
  compareTitle: 'Hur de fria versionerna faktiskt jämförs',
  compareHeaders: { tool: 'Verktyg', theirFreeTier: 'Deras gratisversion' },
  compareIntro:
    'Gratis klassrumsverktyg skiljer sig mycket åt i vad de faktiskt låter en verklig klass göra innan de tar betalt per lärare eller elev. Här är den ärliga jämförelsen.',
  compareRows: [
    { competitor: 'Kahoot', freeTierLimit: 'Gratisversionen tillåter 10–40 livespelare beroende på kontotyp — trångt för en hel klass.', lexiclash: 'Varje klass får plats gratis, upp till 50 elever. Teacher Pro $9/mån lägger till statistik och rapporter.' },
    { competitor: 'Gimkit', freeTierLimit: 'Gratisversionen tillåter obegränsat antal spelare i utvalda lägen, men rapporter och proläge kostar.', lexiclash: 'Också gratis för hela klassen (upp till 50), plus riktiga 1v1-dueller och 6 språk inklusive hebreiska RTL.' },
    { competitor: 'Vocabulary.com', freeTierLimit: 'Ingen meningsfull gratisversion för verklig klassrumsanvändning — betalplan krävs för att komma igång.', lexiclash: 'Gratis för hela klassen, inget kort krävs. Teacher Pro $9/mån lägger till statistik och rapporter.' },
    { competitor: 'Wordwall', freeTierLimit: 'Gratisversionen begränsad till ett fåtal aktivitetstyper.', lexiclash: 'Alla aktiviteter, gratis för hela klassen, upp till 50 elever. Teacher Pro $9/mån låser upp obegränsat antal klasser.' },
  ],
  comingTitle: 'På vår färdplan för skolor och distrikt',
  comingIntro:
    'Det här är funktionerna som skolor säger att de behöver i stor skala. Klassrumsspelet och Teacher Pros statistik och rapporter finns redan idag — punkterna nedan är inte byggda än. Berätta vad er skola behöver, så hör vi av oss när de blir tillgängliga.',
  coming: [
    { title: 'Distriktsadministratörens instrumentpanel', body: 'Färdplan: se användningen i varje klass och från varje lärare i din skola eller ditt distrikt från en plats.' },
    { title: 'Klass- och distriktsövergripande statistik', body: 'Färdplan: kohortriktmärken och distriktsövergripande rapporter, utöver den statistik per klass som Teacher Pro redan ger dig idag.' },
    { title: 'Läroplansbibliotek', body: 'Färdplan: kurerade flerspråkiga ordsamlingar mappade till din läroplan, över alla sex språken.' },
    { title: 'Enkel inloggning (SSO)', body: 'Färdplan: Clever, ClassLink och Google Sign-In för smidig distriktsutrullning. Berätta vilken av dem er skola använder.' },
  ],
  leadTitle: 'Berätta om din skola',
  leadIntro:
    'Använder du LexiClash med din klass, eller rullar ni ut till en hel skola eller ett distrikt? Berätta vad ni behöver — vi hör av oss om Klassplanen ($39/termin), en offert för skola eller distrikt, eller tidig åtkomst till färdplansfunktionerna ovan.',
  faqTitle: 'Skolor och distrikt — vanliga frågor',
  faqs: [
    { q: 'Är LexiClash gratis för lärare?', a: 'Ja. Varje lärare får en 14-dagars gratis provperiod av Teacher Pro: klassomfattande spel, 1v1-dueller, alla sex språken, inga annonser, ingen inloggning för elever, inget kreditkort. Efter provperioden förblir klassrumsspelet gratis för enskilda lärare — upp till 3 klasser med 50 elever vardera. Teacher Pro kostar $9/månad och lägger till statistik per klass, PDF/CSV-rapporter och obegränsat antal klasser.' },
    { q: 'Vad ingår i en skol- eller distriktsplan?', a: 'Klassplanen ($39/termin, via formuläret på den här sidan) täcker en hel klass med alla Teacher Pro-funktioner — statistik, rapporter, läxverktyg — plus klasstreaks och prioriterad support. Administratörsöversikter, distriktsövergripande statistik, läroplansbibliotek och SSO för skol- eller distriktsutrullning finns på vår färdplan och är inte lanserade än — berätta vad ni behöver så hör vi av oss, med pris på begäran.' },
    { q: 'Behöver eleverna konton eller inloggning?', a: 'Nej. Eleverna ansluter till ett klassrumsspel med en kod — inget att skapa, inga elevdata att hantera. Det gör en skolövergripande lansering mycket enklare än verktyg som kräver klasslistor eller SSO innan man kan spela.' },
    { q: 'Vilka språk stöds?', a: 'Engelska, hebreiska (fullt höger-till-vänster-stöd), spanska, svenska, japanska och ryska, var och en med en inbyggd ordbok — byggd för ESL, tvåspråkiga och immersionsklassrum.' },
    { q: 'Hur börjar vi vår provperiod eller får en skolplan?', a: 'Registrera dig som lärare för att starta din egen 14-dagars Teacher Pro-provperiod. Ska ni istället rulla ut till en hel klass eller skola? Fyll i formuläret på den här sidan med din roll, skola och ungefärligt antal elever, så hör vi av oss om Klassplanen eller en offert för skola/distrikt.' },
    { q: 'Hur skiljer sig detta från Kahoot, Gimkit eller Quizlet?', a: 'Det är quiz-/flashcardverktyg som är engelskfokuserade. LexiClash är ett ordbyggande spel (inte flervalsfrågor), stöder sex språk inklusive hebreiska RTL, får plats för en hel klass på upp till 50 elever gratis, och erbjuder riktiga 1v1-dueller.' },
    { q: 'Kan jag använda LexiClash för ESL eller elever med engelska som andraspråk (ELL)?', a: 'Ja — LexiClash byggdes med språkinlärare i åtanke. Det stöder engelska, hebreiska (RTL), spanska, svenska, japanska och ryska med inbyggda ordböcker. Eleverna kan tävla på sitt eget språk eller öva det språk de lär sig, vilket gör det naturligt för ESL, tvåspråkiga och immersionsklassrum. Ordbyggande spel — där elever hittar, stavar och skickar in riktiga ord mot en levande motståndare eller hela klassen — stärker ordförråd och stavning organiskt, utan passiva flervalsfrågor.' },
    { q: 'Kan eleverna använda LexiClash som ett stavningsövningsspel?', a: 'Ja. LexiClashs ordbyggande format — där elever hittar, stavar och skickar in riktiga ord mot en levande motståndare eller hela klassen — gör stavningsövning konkurrenskraftig och engagerande i stället för passiv. Lärare använder det för stavningsuppvärmningar, repetitioner i slutet av ett avsnitt och klassrumsturneringar.' },
    { q: 'Fungerar LexiClash på Chromebooks och skolenheter?', a: 'Ja. LexiClash körs helt i webbläsaren — ingen app att installera, inga elevkonton att skapa. Det fungerar på Chromebooks, iPads, stationära datorer och telefoner. Eleverna ansluter med en spelkod, och lärare kan dela uppgifter direkt till Google Classroom. Distrikts-SSO (Clever, ClassLink) finns på vår färdplan.' },
  ],
  heroCta1: 'Spela ett klassrumsspel gratis',
  heroCta2: 'Berätta om din skola',
  closingTitle: 'Redo att ta LexiClash till din skola?',
  closingCta: 'Berätta om din skola',
};

const JA: ForSchoolsContent = {
  metaTitle: '学校向け無料語彙・ESL単語ゲーム — LexiClash',
  metaDescription:
    'K-12クラス向けの語彙とESLスペリング練習 — 学生ログイン不要、6言語（英語、ヘブライ語、スペイン語、スウェーデン語、日本語、ロシア語）、1v1単語決闘とクラス全体（最大50人）プレイ、広告なし。Teacher Pro 14日間無料トライアル。Teacher Pro 月額$9、クラスプランは学期$39から。',
  ogTitle: '学校向けLexiClash — 語彙とESL単語ゲーム',
  ogDescription:
    'すべてのクラスルーム向け無料語彙・ESL単語ゲーム — 学生ログイン不要、6言語、1v1決闘、広告なし。14日間無料トライアル。Teacher Pro 月額$9、クラスプランは学期$39から。',
  heroTag: '学校・学区向け',
  heroH1: 'あなたの学校が実際に',
  heroHighlight: '使える語彙ゲーム',
  heroSubtitle:
    'Teacher Proを14日間無料でお試しください — 学生ログイン不要、クレジットカード不要。授業内の広告は一切なし。ヘブライ語RTL対応を含む6言語、最大50人のクラス全体でのライブプレイ、1v1単語決闘に対応しています。トライアル後も、クラスルームゲームは個人の教師向けに無料のまま — Teacher Proとクラスプランはそこから拡張できます。',
  freeForeverTitle: '無料でスタート — Teacher Pro 月額$9、クラスプランは学期$39から',
  freeForeverBody:
    'すべての教師がTeacher Proの14日間無料トライアルを利用できます。トライアル後も、クラスルームゲーム — ライブのクラス全体プレイ、1v1決闘、独自の単語リスト、広告なし — は個人の教師向けに無料のまま、最大3クラス（各50人）まで利用できます。Teacher Pro（月額$9）はクラスごとの分析、PDF/CSVの進捗レポート、クラス数無制限を追加します。クラス全体や学校全体への導入をお考えですか？クラスプラン（学期$39）はすべてのTeacher Pro機能に加え、クラスの連続記録と優先サポートを含みます。管理者ダッシュボード、クラス間分析、カリキュラムライブラリ、SSOは今後の開発計画にあります — 下のフォームで必要な機能をお知らせください。',
  whyTitle: 'なぜ学校がLexiClashを選ぶのか',
  why: [
    { title: '学生ログイン不要', body: '学生はコードでクラスゲームに参加 — アカウント作成不要、プレイ前の名簿登録不要、学生データの管理も不要です。' },
    { title: '6言語対応（ヘブライ語RTL含む）', body: '英語、ヘブライ語（完全なRTLサポート）、スペイン語、スウェーデン語、日本語、ロシア語 — ネイティブ辞書を完備し、バイリンガル、ESL、イマージョンのクラスルーム向けです。' },
    { title: '1v1決闘とクラス全体プレイ', body: '学生をペアで対戦させるか、最大50人のライブのクラス全体ラウンドを実施。単語構築ゲームで、受動的な選択式ではありません。' },
    { title: '準備ゼロ、広告ゼロ', body: '単語リストを選び（自分のリストでも当社のリストでも）、モードを選び、コードを共有するだけ。準備は不要、そして授業内の広告は一切ありません。' },
  ],
  compareTitle: '無料プランを正直に比較',
  compareHeaders: { tool: 'ツール', theirFreeTier: '他社の無料プラン' },
  compareIntro:
    '無料のクラスルームゲームツールは、教師や学生ごとに課金される前に実際のクラスで何ができるかが大きく異なります。以下が正直な比較です。',
  compareRows: [
    { competitor: 'Kahoot', freeTierLimit: '無料プランはアカウントの種類によりライブプレイヤー数が10〜40人に制限され、クラス全体には手狭です。', lexiclash: 'どのクラスも無料で収まります（最大50人）。Teacher Pro（月額$9）が分析とレポートを追加します。' },
    { competitor: 'Gimkit', freeTierLimit: '無料プランは主要モードでは人数無制限ですが、レポートとプロモードは有料です。', lexiclash: 'こちらも最大50人までのクラス全体が無料。さらに本物の1v1決闘と、ヘブライ語RTLを含む6言語に対応。' },
    { competitor: 'Vocabulary.com', freeTierLimit: '実際のクラス運用に使える無料プランは実質なく、始めるには有料プランが必要です。', lexiclash: 'クラス全体が無料、カード登録不要。Teacher Pro（月額$9）が分析とレポートを追加します。' },
    { competitor: 'Wordwall', freeTierLimit: '無料プランは少数のアクティビティ種類に制限されています。', lexiclash: 'すべてのアクティビティが、最大50人のクラス全体で無料。Teacher Pro（月額$9）でクラス数無制限に。' },
  ],
  comingTitle: '学校・学区向けの今後の開発計画',
  comingIntro:
    'これらは、規模を拡大する際に学校が必要だと教えてくれる機能です。クラスルームゲームとTeacher Proの分析・レポートはすでに提供中です — 以下の項目はまだ構築されていません。学校に必要なことを教えてください。ご利用可能になり次第、ご連絡します。',
  coming: [
    { title: '学区管理者ダッシュボード', body: '開発計画中：学校や学区内のすべてのクラスと教師の利用状況を、1か所から確認できます。' },
    { title: 'クラス間・学区分析', body: '開発計画中：コホート比較と学区全体のレポートを、Teacher Proがすでに提供しているクラスごとの分析に加えて提供します。' },
    { title: 'カリキュラムコンテンツライブラリ', body: '開発計画中：あなたのカリキュラムにマッピングされた多言語の単語セットを、6言語すべてで提供します。' },
    { title: 'シングルサインオン（SSO）', body: '開発計画中：学区への簡単な導入のためのClever、ClassLink、Googleサインイン。学校でどれを使用しているか教えてください。' },
  ],
  leadTitle: 'あなたの学校について教えてください',
  leadIntro:
    'すでにクラスでLexiClashを使っていますか、それとも学校や学区全体への導入をお考えですか？必要なことを教えてください — クラスプラン（学期$39）、学校・学区向けの見積もり、または上記の開発計画中の機能への早期アクセスについてご連絡します。',
  faqTitle: '学校・学区 — よくある質問',
  faqs: [
    { q: 'LexiClashは教師にとって無料ですか？', a: 'はい。すべての教師がTeacher Proの14日間無料トライアルを利用できます：クラス全体プレイ、1v1決闘、6言語すべて、広告なし、学生ログイン不要、クレジットカード不要。トライアル後も、クラスルームゲームは個人の教師向けに無料のまま — 最大3クラス（各50人）まで。Teacher Proは月額$9で、クラスごとの分析、PDF/CSVの進捗レポート、クラス数無制限を追加します。' },
    { q: '学校または学区プランには何が含まれますか？', a: 'クラスプラン（学期$39、このページのフォームから）は、クラス全体にすべてのTeacher Pro機能 — 分析、レポート、宿題ツール — に加え、クラスの連続記録と優先サポートを提供します。学校・学区への導入向けの管理者ダッシュボード、クラス間分析、カリキュラムライブラリ、SSOは今後の開発計画にあり、まだ提供されていません — 必要なことを教えていただければご連絡します。価格はご相談に応じます。' },
    { q: '学生にアカウントやログインは必要ですか？', a: 'いいえ。学生はコードでクラスゲームに参加します — 何も用意する必要がなく、学生データを管理する必要もありません。これにより、名簿登録やプレイ前のSSOを必要とするツールよりも、学校全体への展開がはるかに簡単になります。' },
    { q: 'どの言語に対応していますか？', a: '英語、ヘブライ語（完全なRTLサポート）、スペイン語、スウェーデン語、日本語、ロシア語 — それぞれネイティブ辞書を完備し、ESL、バイリンガル、イマージョンのクラスルーム向けです。' },
    { q: 'トライアルを始める、または学校プランを取得するにはどうすればよいですか？', a: '教師として登録すると、ご自身の14日間Teacher Pro無料トライアルを開始できます。クラス全体や学校全体への導入をお考えの場合は、このページのフォームに役割、学校、およびおおよその学生数を入力してください。クラスプランまたは学校・学区向けの見積もりについてご連絡します。' },
    { q: 'Kahoot、Gimkit、Quizletとどう違いますか？', a: 'それらは英語優先のクイズ／フラッシュカードツールです。LexiClashは単語構築ゲーム（選択式ではありません）で、ヘブライ語RTLを含む6言語に対応し、最大50人のクラス全体が無料で利用でき、本物の1v1決闘を提供します。' },
    { q: 'ESLや英語学習者（ELL）の学生にLexiClashを使えますか？', a: 'はい — LexiClashは言語学習者を念頭に作られました。英語、ヘブライ語（RTL）、スペイン語、スウェーデン語、日本語、ロシア語にネイティブ辞書で対応しています。学生は自分の言語で競い合ったり、学んでいる言語を練習したりできるため、ESL、バイリンガル、イマージョンのクラスルームに自然にフィットします。単語構築ゲーム — 学生がライブの対戦相手やクラス全体を相手に本物の単語を見つけ、つづり、送信する — は、受動的な選択式なしで語彙とつづりを自然に強化します。' },
    { q: '学生はLexiClashをスペリング練習ゲームとして使えますか？', a: 'はい。LexiClashの単語構築フォーマット — 学生がライブの対戦相手やクラス全体を相手に本物の単語を見つけ、つづり、送信する — は、スペリング練習を受動的ではなく競争的で魅力的なものにします。教師は語彙のウォーミングアップ、単元末のレビュー、クラス内トーナメントに活用しています。' },
    { q: 'LexiClashはChromebookや学校の端末で動作しますか？', a: 'はい。LexiClashはブラウザで完全に動作します — アプリのインストール不要、学生アカウントの用意も不要です。Chromebook、iPad、デスクトップ、スマートフォンで動作します。学生はゲームコードで参加し、教師は課題をGoogle Classroomに直接共有できます。学区向けのSSO（Clever、ClassLink）は今後の開発計画にあります。' },
  ],
  heroCta1: 'クラスゲームを無料でプレイ',
  heroCta2: 'あなたの学校について教えてください',
  closingTitle: 'LexiClashを学校に導入する準備はできましたか？',
  closingCta: 'あなたの学校について教えてください',
};

const ES: ForSchoolsContent = {
  metaTitle: 'Juegos de vocabulario y ESL gratis para escuelas — LexiClash',
  metaDescription:
    'Juegos de vocabulario y práctica de ortografía en inglés para aulas K-12 — sin inicios de sesión de estudiantes, 6 idiomas (inglés, hebreo, español, sueco, japonés, ruso), duelos de palabras 1v1 y juego en clase completo para hasta 50 estudiantes, sin anuncios. Prueba gratis de Teacher Pro por 14 días. Teacher Pro $9/mes; plan de clase $39/trimestre.',
  ogTitle: 'LexiClash para escuelas — Juegos de vocabulario y ESL',
  ogDescription:
    'Juegos de vocabulario y ESL gratis para cada aula — sin inicios de sesión de estudiantes, 6 idiomas, duelos 1v1, sin anuncios. Prueba gratis por 14 días. Teacher Pro $9/mes; plan de clase $39/trimestre.',
  heroTag: 'Para escuelas y distritos',
  heroH1: 'Juegos de vocabulario que toda tu escuela puede',
  heroHighlight: 'usar de verdad',
  heroSubtitle:
    'Prueba Teacher Pro gratis por 14 días — sin inicios de sesión de estudiantes, sin tarjeta de crédito. Sin anuncios en clase, nunca. 6 idiomas incluido hebreo RTL, juego en vivo con toda la clase para hasta 50 estudiantes y duelos de palabras 1v1. Después de la prueba, el juego de aula sigue siendo gratis para maestros individuales — Teacher Pro y el plan de clase escalan desde ahí.',
  freeForeverTitle: 'Empieza gratis — Teacher Pro $9/mes, plan de clase $39/trimestre',
  freeForeverBody:
    'Cada maestro obtiene una prueba gratuita de 14 días de Teacher Pro. Después de la prueba, el juego de aula — juego en vivo con toda la clase, duelos 1v1, tus propias listas de palabras, sin anuncios — sigue siendo gratis para maestros individuales, hasta 3 clases de 50 estudiantes cada una. Teacher Pro ($9/mes) agrega análisis por clase, informes de progreso en PDF/CSV y clases ilimitadas. ¿Vas a implementarlo en toda una clase o escuela? El plan de clase ($39/trimestre) cubre una clase completa con todas las funciones de Teacher Pro, más rachas de clase y soporte prioritario. Los paneles de administración, el análisis entre clases, las bibliotecas de currículo y el SSO están en nuestra hoja de ruta — cuéntanos qué necesitas más abajo.',
  whyTitle: 'Por qué las escuelas eligen LexiClash',
  why: [
    { title: 'Sin inicios de sesión de estudiantes', body: 'Los estudiantes se unen a un juego de clase con un código — sin cuentas que crear, sin registro de clase antes de jugar, sin datos de estudiantes que gestionar.' },
    { title: '6 idiomas, incluido hebreo RTL', body: 'Inglés, hebreo (derecha a izquierda completo), español, sueco, japonés y ruso con diccionarios nativos — diseñado para aulas bilingües, ESL e inmersión de idiomas.' },
    { title: 'Duelos 1v1 + juego en clase', body: 'Empareja estudiantes en duelos uno contra uno o ejecuta una ronda en vivo con toda la clase, hasta 50 estudiantes. Construcción de palabras, no opción múltiple pasiva.' },
    { title: 'Cero preparación, cero anuncios', body: 'Elige una lista de palabras — la tuya o la nuestra — elige un modo, comparte el código. Sin preparación, y sin anuncios en clase, nunca.' },
  ],
  compareTitle: 'Cómo se comparan de verdad los niveles gratuitos',
  compareHeaders: { tool: 'Herramienta', theirFreeTier: 'Su versión gratuita' },
  compareIntro:
    'Las herramientas gratuitas para el aula varían mucho en lo que realmente permiten hacer a una clase real antes de cobrar por maestro o por estudiante. Aquí está la comparación honesta.',
  compareRows: [
    { competitor: 'Kahoot', freeTierLimit: 'El nivel gratuito permite entre 10 y 40 jugadores en vivo según el tipo de cuenta — ajustado para una clase completa.', lexiclash: 'Cada clase cabe gratis, hasta 50 estudiantes. Teacher Pro $9/mes agrega análisis e informes.' },
    { competitor: 'Gimkit', freeTierLimit: 'El nivel gratuito permite jugadores ilimitados en los modos destacados, pero los informes y modos pro son de pago.', lexiclash: 'También gratis para toda la clase (hasta 50), además de duelos 1v1 reales y 6 idiomas incluido hebreo RTL.' },
    { competitor: 'Vocabulary.com', freeTierLimit: 'Sin un nivel gratuito real para uso real en el aula — se requiere un plan de pago para empezar.', lexiclash: 'Gratis para toda la clase, sin tarjeta. Teacher Pro $9/mes agrega análisis e informes.' },
    { competitor: 'Wordwall', freeTierLimit: 'El nivel gratuito se limita a un pequeño número de tipos de actividad.', lexiclash: 'Cada actividad, gratis para toda la clase, hasta 50 estudiantes. Teacher Pro $9/mes desbloquea clases ilimitadas.' },
  ],
  comingTitle: 'En nuestra hoja de ruta para escuelas y distritos',
  comingIntro:
    'Estas son las funciones que las escuelas nos dicen que necesitan a escala. El juego de aula y el análisis e informes de Teacher Pro ya están disponibles hoy — lo de abajo todavía no está construido. Cuéntanos qué necesita tu escuela y te avisaremos cuando esté disponible.',
  coming: [
    { title: 'Panel de administración de distrito', body: 'Hoja de ruta: ve el uso en cada clase y de cada maestro de tu escuela o distrito desde un solo lugar.' },
    { title: 'Análisis entre clases y de distrito', body: 'Hoja de ruta: puntos de referencia de cohortes e informes a nivel de distrito, además del análisis por clase que Teacher Pro ya te da hoy.' },
    { title: 'Bibliotecas de contenido de currículo', body: 'Hoja de ruta: conjuntos de palabras multilingües curados y asignados a tu currículo, en los seis idiomas.' },
    { title: 'Inicio de sesión único (SSO)', body: 'Hoja de ruta: Clever, ClassLink e inicio de sesión con Google para una implementación de distrito sencilla. Cuéntanos cuál usa tu escuela.' },
  ],
  leadTitle: 'Cuéntanos sobre tu escuela',
  leadIntro:
    '¿Ya usas LexiClash con tu clase, o estás implementándolo en toda una escuela o distrito? Cuéntanos qué necesitas — te contactaremos sobre el plan de clase ($39/trimestre), una cotización para tu escuela o distrito, o acceso anticipado a las funciones de la hoja de ruta de arriba.',
  faqTitle: 'Escuelas y distritos — preguntas frecuentes',
  faqs: [
    { q: '¿Es LexiClash gratis para maestros?', a: 'Sí. Cada maestro obtiene una prueba gratuita de 14 días de Teacher Pro: juego en clase, duelos 1v1, los seis idiomas, sin anuncios, sin inicios de sesión de estudiantes, sin tarjeta de crédito. Después de la prueba, el juego de aula sigue siendo gratis para maestros individuales — hasta 3 clases de 50 estudiantes cada una. Teacher Pro cuesta $9/mes y agrega análisis por clase, informes de progreso en PDF/CSV y clases ilimitadas.' },
    { q: '¿Qué incluyen los planes escolares o de distrito?', a: 'El plan de clase ($39/trimestre, a través del formulario de esta página) cubre una clase completa con todas las funciones de Teacher Pro — análisis, informes, herramientas de tareas — más rachas de clase y soporte prioritario. Los paneles de administración, el análisis entre clases, las bibliotecas de currículo y el SSO para implementación escolar o de distrito están en nuestra hoja de ruta y aún no están disponibles — cuéntanos qué necesitas y te contactaremos, con precio a solicitud.' },
    { q: '¿Los estudiantes necesitan cuentas o inicios de sesión?', a: 'No. Los estudiantes se unen a un juego de clase con un código — nada que crear, sin datos de estudiantes que gestionar. Eso hace que una implementación en toda la escuela sea mucho más simple que las herramientas que requieren registro o SSO antes de jugar.' },
    { q: '¿Qué idiomas son compatibles?', a: 'Inglés, hebreo (compatibilidad completa de derecha a izquierda), español, sueco, japonés y ruso, cada uno con un diccionario nativo — diseñado para aulas ESL, bilingües e inmersión de idiomas.' },
    { q: '¿Cómo iniciamos nuestra prueba u obtenemos un plan escolar?', a: 'Regístrate como maestro para iniciar tu propia prueba gratuita de Teacher Pro de 14 días. ¿Vas a implementarlo en toda una clase o escuela? Completa el formulario en esta página con tu rol, escuela y número aproximado de estudiantes, y te contactaremos sobre el plan de clase o una cotización para tu escuela o distrito.' },
    { q: '¿En qué se diferencia de Kahoot, Gimkit o Quizlet?', a: 'Esas son herramientas de cuestionarios/tarjetas que priorizan el inglés. LexiClash es un juego de construcción de palabras (no opción múltiple), admite seis idiomas incluido hebreo RTL, permite que una clase completa de hasta 50 estudiantes juegue gratis, y ofrece verdaderos duelos 1v1.' },
    { q: '¿Puedo usar LexiClash para estudiantes de ESL o aprendices de inglés (ELL)?', a: 'Sí — LexiClash fue diseñado pensando en los aprendices de idiomas. Admite inglés, hebreo (RTL), español, sueco, japonés y ruso con diccionarios nativos. Los estudiantes pueden competir en su propio idioma o practicar el idioma que están aprendiendo, lo que lo hace naturalmente adecuado para aulas ESL, bilingües e inmersión de idiomas. La mecánica de construcción de palabras — donde los estudiantes encuentran, deletrean y envían palabras reales contra un oponente en vivo o toda la clase — refuerza el vocabulario y la ortografía de forma orgánica, sin opción múltiple pasiva.' },
    { q: '¿Pueden los estudiantes usar LexiClash como un juego de práctica de ortografía?', a: 'Sí. El formato de construcción de palabras de LexiClash — donde los estudiantes encuentran, deletrean y envían palabras reales contra un oponente en vivo o toda la clase — hace que la práctica de ortografía sea competitiva y atractiva en lugar de pasiva. Los maestros lo usan para calentamientos de vocabulario, repasos de fin de unidad y torneos en clase.' },
    { q: '¿Funciona LexiClash en Chromebooks y dispositivos escolares?', a: 'Sí. LexiClash se ejecuta completamente en el navegador — sin aplicación que instalar, sin cuentas de estudiante que crear. Funciona en Chromebooks, iPads, computadoras de escritorio y teléfonos. Los estudiantes se unen con un código de juego, y los maestros pueden compartir tareas directamente en Google Classroom. El SSO de distrito (Clever, ClassLink) está en nuestra hoja de ruta.' },
  ],
  heroCta1: 'Juega un juego de clase gratis',
  heroCta2: 'Cuéntanos sobre tu escuela',
  closingTitle: '¿Listo para llevar LexiClash a tu escuela?',
  closingCta: 'Cuéntanos sobre tu escuela',
};

export function getForSchoolsContent(locale: string): ForSchoolsContent {
  // All six education locales are indexed (see EDUCATION_LOCALES + page.tsx robots),
  // so the marketing body is authored natively per locale. The interactive lead form
  // is localized separately via t().
  switch (locale) {
    case 'ru':
      return RU;
    case 'he':
      return HE;
    case 'sv':
      return SV;
    case 'ja':
      return JA;
    case 'es':
      return ES;
    default:
      return EN;
  }
}
