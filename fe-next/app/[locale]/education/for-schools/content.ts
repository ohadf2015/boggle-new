// Content for /education/for-schools -- the school/district lead-capture + commercial
// SEO + GEO page. EN is the indexed target (other locales are noindex + hreflang→EN,
// matching the /education/vocabulary-games-classroom pattern), so the marketing body
// is authored in EN. The conversion form itself is fully localized via t().

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
    'Vocabulary games and ESL spelling practice for K-12 classrooms — no student logins, 5 languages (English, Hebrew, Spanish, Swedish, Japanese), 1v1 word duels and whole-class play. Free 30-day trial for teachers. School plans from $149/year.',
  ogTitle: 'LexiClash for Schools — Vocabulary & ESL Word Games',
  ogDescription:
    'Free vocabulary and ESL word games for every classroom — no student logins, 5 languages, 1v1 duels. Free 30-day trial. School plans from $149/year.',
  heroTag: 'For Schools & Districts',
  heroH1: 'Vocabulary games your whole school can',
  heroHighlight: 'actually use',
  heroSubtitle:
    'Try LexiClash free for 30 days -- no student logins, no credit card, no ads in class. 5 languages including Hebrew RTL, live whole-class play, and 1v1 word duels. Individual teachers keep basic access free after trial; school and district plans scale from there.',
  freeForeverTitle: 'Start free -- school plans from $149/year',
  freeForeverBody:
    'Every teacher gets a full 30-day trial: no student logins, no player cap, no credit card. After your trial, the basic classroom game stays free for individual teachers. School plans add admin dashboards, cross-class analytics, curriculum libraries, an ad-free environment, and SSO -- starting at $149/school/year.',
  whyTitle: 'Why schools choose LexiClash',
  why: [
    { title: 'No student logins', body: 'Students join a class game with a code -- no accounts to provision, no rostering before you can play, no student data to manage.' },
    { title: '5 languages, including Hebrew RTL', body: 'English, Hebrew (full right-to-left), Spanish, Swedish and Japanese with native dictionaries -- built for bilingual, ESL and immersion classrooms.' },
    { title: '1v1 duels + whole-class', body: 'Pair students head-to-head or run a live whole-class round. Word-building gameplay, not passive multiple-choice.' },
    { title: 'Zero prep', body: 'Pick a word list, pick a mode, share the code. A 5-minute warm-up or an end-of-unit review with no setup.' },
  ],
  compareTitle: 'How the free tiers actually compare',
  compareIntro:
    'Most "free" classroom game tools cap the free tier so low it breaks a real class, then charge per teacher or per student. Here is the honest comparison - all during our free trial.',
  compareRows: [
    { competitor: 'Kahoot', freeTierLimit: 'Free tier caps live players (too few for a full class); school plans are per-teacher.', lexiclash: 'No player cap during trial. School plans $149/year.' },
    { competitor: 'Gimkit', freeTierLimit: 'Free tier limited to 5 students; school plans run $650-$1,000/yr.', lexiclash: 'No student cap during trial. School plans from $149/year.' },
    { competitor: 'Vocabulary.com', freeTierLimit: 'No real free tier -- $199/classroom to start.', lexiclash: 'Full trial, no card. School plans from $149/year.' },
    { competitor: 'Wordwall', freeTierLimit: 'Free tier limited to a handful of activities.', lexiclash: 'Unlimited play in trial. School plans from $149/year.' },
  ],
  comingTitle: 'What school & district plans include',
  comingIntro:
    'These are the features schools tell us they need at scale -- available in school plans ($149/year), layered on top of the free classroom, never gating it.',
  coming: [
    { title: 'District admin dashboard', body: 'See usage across every class and teacher in your school or district from one place.' },
    { title: 'Cross-class analytics', body: 'Cohort benchmarks, vocabulary-mastery trends and exportable reports for grading and standards.' },
    { title: 'Curriculum content libraries', body: 'Curated multilingual word sets mapped to your curriculum -- across all five languages.' },
    { title: 'Ad-free school mode & SSO', body: 'A fully ad-free environment plus single sign-on (Clever / ClassLink / Google) for easy rollout.' },
  ],
  leadTitle: 'Tell us about your school',
  leadIntro:
    "Using LexiClash with your class, or thinking about rolling it out wider? Tell us about your school or district and what you need -- we'll be in touch about your trial, school plan pricing ($149/year), or early access to district features.",
  faqTitle: 'Schools & districts -- frequently asked',
  faqs: [
    { q: 'Is LexiClash free for teachers?', a: 'Every teacher gets a full 30-day trial: whole-class play, 1v1 duels, all five languages, no ads, no student logins, no credit card. After the trial, the basic classroom game stays free for individual teachers. School plans -- which add admin dashboards, analytics, curriculum libraries, and an ad-free environment -- start at $149/school/year.' },
    { q: 'What does a school or district plan include?', a: 'School plans ($149/year per school) add the features that scale: a district admin dashboard, cross-class analytics and reporting, curated curriculum content libraries, an ad-free school environment, and SSO (Clever / ClassLink / Google). The basic classroom game stays free -- plans layer on top, never gate it.' },
    { q: 'Do students need accounts or logins?', a: 'No. Students join a class game with a code -- nothing to provision, no student data to manage. That makes a school-wide rollout far simpler than tools that require rostering or SSO before play.' },
    { q: 'Which languages are supported?', a: 'English, Hebrew (full right-to-left support), Spanish, Swedish and Japanese, each with a native dictionary -- built for ESL, bilingual and immersion classrooms.' },
    { q: 'How do we start our trial or get a school plan?', a: 'Fill in the form on this page with your role, school or district, and rough student count. We\'ll confirm your trial access and share school plan details -- $149/year per school, district pricing on request.' },
    { q: 'How is this different from Kahoot, Gimkit or Quizlet?', a: 'Those are quiz/flashcard tools that cap their free tiers and are English-first. LexiClash is a word-building game (not multiple-choice), supports five languages including Hebrew RTL, has no player cap during the trial, and offers true 1v1 duels.' },
    { q: 'Can I use LexiClash for ESL or English language learner (ELL) students?', a: 'Yes — LexiClash was built with language learners in mind. It supports English, Hebrew (RTL), Spanish, Swedish and Japanese with native dictionaries. Students can compete in their own language or practice the language they are learning, making it a natural fit for ESL, bilingual and immersion classrooms. Word-building gameplay reinforces vocabulary and spelling organically, without passive multiple-choice.' },
    { q: 'Can students use LexiClash as a spelling practice game?', a: 'Yes. LexiClash\'s word-building format — where students find, spell and submit real words against a live opponent or the whole class — makes spelling practice competitive and engaging rather than passive. Teachers use it for spelling warm-ups, end-of-unit vocabulary reviews and in-class tournaments.' },
    { q: 'Does LexiClash work on Chromebooks and school devices?', a: 'Yes. LexiClash runs entirely in the browser — no app to install, no student accounts to provision. It works on Chromebooks, iPads, desktops and phones. Students join with a game code. School plans support Clever, ClassLink and Google Sign-In SSO for teacher accounts.' },
  ],
  heroCta1: 'Play a class game free',
  heroCta2: 'Tell us about your school',
  closingTitle: 'Ready to bring LexiClash to your school?',
  closingCta: 'Tell us about your school',
};

const RU: ForSchoolsContent = {
  metaTitle: 'Бесплатные игры на словарный запас для школ — LexiClash',
  metaDescription:
    'Игры для изучения лексики и английского языка в школах — без входа ученика, 6 языков (английский, иврит, испанский, шведский, японский, русский), словесные поединки 1 на 1 и командные игры. Бесплатный пробный период 30 дней для учителей. Школьные планы от $149 в год.',
  ogTitle: 'LexiClash для школ — игры на словарный запас',
  ogDescription:
    'Бесплатные словесные игры для каждого класса — без входа ученика, 6 языков, поединки 1 на 1. Бесплатный пробный период. Школьные планы от $149 в год.',
  heroTag: 'Для школ и районов',
  heroH1: 'Словесные игры, которые ваша школа действительно может',
  heroHighlight: 'использовать',
  heroSubtitle:
    'Попробуйте LexiClash бесплатно 30 дней — без входа для учеников, без кредитной карты, без рекламы на уроках. 6 языков, включая иврит с поддержкой RTL, командные игры в реальном времени и поединки 1 на 1. Учителя сохраняют базовый доступ бесплатно после пробного периода; школьные и районные планы начинаются отсюда.',
  freeForeverTitle: 'Начните бесплатно — школьные планы от $149 в год',
  freeForeverBody:
    'Каждый учитель получает полный пробный период на 30 дней: без входа для учеников, без ограничения количества игроков, без кредитной карты. После пробного периода базовая командная игра остается бесплатной для учителей. Школьные планы добавляют панель администратора, аналитику по классам, библиотеки учебных материалов, среду без рекламы и SSO — начиная с $149 в год за школу.',
  whyTitle: 'Почему школы выбирают LexiClash',
  why: [
    { title: 'Без входа для учеников', body: 'Ученики присоединяются к командной игре по коду — не нужно создавать аккаунты, не нужна регистрация класса перед началом игры, не нужно управлять данными учеников.' },
    { title: '6 языков, включая иврит с RTL', body: 'Английский, иврит (полная поддержка справа налево), испанский, шведский и японский с встроенными словарями — разработано для двуязычных, ESL и погруженных в языковую среду классов.' },
    { title: 'Поединки 1 на 1 и командные игры', body: 'Ставьте учеников в пары для поединков или запускайте командную игру в реальном времени. Игра в составление слов, а не пассивный множественный выбор.' },
    { title: 'Без подготовки', body: 'Выберите список слов, выберите режим, поделитесь кодом. 5-минутная разминка или повтор в конце темы без подготовки.' },
  ],
  compareTitle: 'Честное сравнение бесплатных версий',
  compareIntro:
    'Большинство "бесплатных" инструментов для уроков так ограничивают бесплатные версии, что они не работают для полного класса, а потом берут плату за учителя или ученика. Вот честное сравнение — все во время нашего пробного периода.',
  compareRows: [
    { competitor: 'Kahoot', freeTierLimit: 'Бесплатная версия ограничивает количество живых игроков; школьные планы платятся за учителя.', lexiclash: 'Без ограничений на количество игроков во время пробы. Школьные планы $149 в год.' },
    { competitor: 'Gimkit', freeTierLimit: 'Бесплатная версия ограничена 5 учениками; школьные планы стоят $650–$1000 в год.', lexiclash: 'Без ограничений на количество учеников во время пробы. Школьные планы от $149 в год.' },
    { competitor: 'Vocabulary.com', freeTierLimit: 'Нет настоящей бесплатной версии — $199 за класс для начала.', lexiclash: 'Полный пробный период, без карты. Школьные планы от $149 в год.' },
    { competitor: 'Wordwall', freeTierLimit: 'Бесплатная версия ограничена несколькими упражнениями.', lexiclash: 'Неограниченная игра во время пробы. Школьные планы от $149 в год.' },
  ],
  comingTitle: 'Что включают школьные и районные планы',
  comingIntro:
    'Это функции, которые школы говорят нам, что им нужны в масштабе — доступны в школьных планах ($149 в год), расположены поверх бесплатного класса, никогда не блокируя его.',
  coming: [
    { title: 'Панель администратора района', body: 'Смотрите использование во всех классах и учителями вашей школы или района в одном месте.' },
    { title: 'Аналитика между классами', body: 'Сравнительные тесты, тренды освоения словарного запаса и экспортируемые отчеты для оценок и стандартов.' },
    { title: 'Библиотеки учебных материалов', body: 'Отобранные наборы слов на нескольких языках, соответствующие вашей программе — на всех шести языках.' },
    { title: 'Среда без рекламы и SSO', body: 'Полностью безрекламная среда плюс единый вход (Clever / ClassLink / Google) для простого развертывания.' },
  ],
  leadTitle: 'Расскажите нам о своей школе',
  leadIntro:
    'Используете LexiClash в вашем классе или планируете расширить использование? Расскажите нам о своей школе или районе и о том, что вам нужно — мы свяжемся с вами по поводу вашего пробного периода, школьного плана ($149 в год) или раннего доступа к функциям района.',
  faqTitle: 'Часто задаваемые вопросы школ и районов',
  faqs: [
    { q: 'LexiClash бесплатен для учителей?', a: 'Каждый учитель получает полный пробный период на 30 дней: командные игры, поединки 1 на 1, все шесть языков, без рекламы, без входа для учеников, без кредитной карты. После пробного периода базовая командная игра остается бесплатной для отдельных учителей. Школьные планы — которые добавляют панели администратора, аналитику, библиотеки материалов и среду без рекламы — начинаются с $149 в год за школу.' },
    { q: 'Что включают школьный или районный план?', a: 'Школьные планы ($149 в год за школу) добавляют функции, которые масштабируются: панель администратора района, аналитика и отчеты между классами, библиотеки отобранных учебных материалов, безрекламную школьную среду и SSO (Clever / ClassLink / Google). Базовая командная игра остается бесплатной — планы надстраиваются, никогда не блокируя.' },
    { q: 'Нужны ли учащимся аккаунты или вход?', a: 'Нет. Ученики присоединяются к командной игре по коду — не нужно ничего настраивать, не нужно управлять данными учеников. Это делает развертывание по всей школе намного проще, чем инструменты, которые требуют регистрации или SSO перед игрой.' },
    { q: 'Какие языки поддерживаются?', a: 'Английский, иврит (с полной поддержкой справа налево), испанский, шведский, японский и русский, каждый со встроенным словарем — разработано для ESL, двуязычных и погруженных в языковую среду классов.' },
    { q: 'Как начать пробный период или получить школьный план?', a: 'Заполните форму на этой странице со своей ролью, школой или районом и примерным количеством учеников. Мы подтвердим ваш доступ к пробному периоду и поделимся информацией о школьном плане — $149 в год за школу, цены для районов по запросу.' },
    { q: 'Чем это отличается от Kahoot, Gimkit или Quizlet?', a: 'Это инструменты викторин/карточек, которые ограничивают бесплатные версии и ориентированы на английский. LexiClash — это игра в составление слов (не множественный выбор), поддерживает шесть языков, включая иврит с RTL, не ограничивает количество игроков во время пробного периода и предлагает настоящие поединки 1 на 1.' },
    { q: 'Можно ли использовать LexiClash для ESL или учеников, изучающих английский язык?', a: 'Да — LexiClash разработан с учетом изучающих языки. Поддерживает английский, иврит (RTL), испанский, шведский, японский и русский со встроенными словарями. Ученики могут соревноваться на своем языке или тренировать изучаемый язык, что делает его естественным выбором для ESL, двуязычных и погруженных в языковую среду классов. Игра в составление слов — где ученики находят, пишут и вводят настоящие слова против живого противника или класса — укрепляет словарный запас и орфографию органически, без пассивного множественного выбора.' },
    { q: 'Могут ли ученики использовать LexiClash как игру для тренировки орфографии?', a: 'Да. Формат LexiClash, где ученики находят, пишут и вводят настоящие слова против живого противника или класса, делает тренировку орфографии конкурентной и увлекательной, а не пассивной. Учители используют ее для словарных разминок, финальных обзоров и школьных турниров.' },
    { q: 'Работает ли LexiClash на Chromebook и школьных устройствах?', a: 'Да. LexiClash работает полностью в браузере — не нужно устанавливать приложение, не нужно создавать аккаунты для учеников. Это работает на Chromebook, iPad, ПК и телефонах. Ученики присоединяются по коду игры. Школьные планы поддерживают Clever, ClassLink и Google Sign-In SSO для аккаунтов учителя.' },
  ],
  heroCta1: 'Запустить командную игру бесплатно',
  heroCta2: 'Расскажите нам о своей школе',
  closingTitle: 'Готовы принести LexiClash в свою школу?',
  closingCta: 'Расскажите нам о своей школе',
};

export function getForSchoolsContent(_locale: string): ForSchoolsContent {
  // EN is the indexed, canonical copy; non-EN routes render the same body but are
  // noindexed (hreflang → EN). The interactive lead form is localized via t().
  if (_locale === 'ru') return RU;
  return EN;
}
