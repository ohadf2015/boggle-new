// Content for /education/for-schools -- the school/district lead-capture + commercial
// SEO + GEO page. Localized natively per locale (all six EDUCATION_LOCALES are indexed;
// see page.tsx robots). The conversion form itself is localized separately via t().

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

const HE: ForSchoolsContent = {
  metaTitle: 'משחקי אוצר מילים ואנגלית לבתי ספר — חינם | LexiClash',
  metaDescription:
    'משחקי אוצר מילים ותרגול איות לכיתות — בלי חשבונות תלמידים, 5 שפות (אנגלית, עברית, ספרדית, שוודית, יפנית), דו-קרבות מילים 1 על 1 ומשחק כיתתי. ניסיון חינם ל-30 יום למורים. תוכניות בית ספר החל מ-$149 לשנה.',
  ogTitle: 'LexiClash לבתי ספר — משחקי אוצר מילים ואנגלית',
  ogDescription:
    'משחקי מילים חינם לכל כיתה — בלי חשבונות תלמידים, 5 שפות, דו-קרבות 1 על 1. ניסיון חינם ל-30 יום. תוכניות בית ספר החל מ-$149 לשנה.',
  heroTag: 'לבתי ספר ורשויות חינוך',
  heroH1: 'משחקי אוצר מילים שכל בית הספר שלכם',
  heroHighlight: 'באמת ישתמש בהם',
  heroSubtitle:
    'נסו את LexiClash חינם ל-30 יום — בלי חשבונות תלמידים, בלי כרטיס אשראי, בלי פרסומות בכיתה. 5 שפות כולל עברית מימין לשמאל, משחק כיתתי חי ודו-קרבות מילים 1 על 1. מורים בודדים ממשיכים עם גישה בסיסית חינם גם אחרי הניסיון; תוכניות בית ספר ורשות מתרחבות משם.',
  freeForeverTitle: 'מתחילים חינם — תוכניות בית ספר החל מ-$149 לשנה',
  freeForeverBody:
    'כל מורה מקבל ניסיון מלא של 30 יום: בלי חשבונות תלמידים, בלי הגבלת מספר שחקנים, בלי כרטיס אשראי. בתום הניסיון, המשחק הכיתתי הבסיסי נשאר חינם למורים בודדים. תוכניות בית ספר מוסיפות לוחות ניהול, ניתוח נתונים בין כיתות, ספריות תוכן לימודי, סביבה נטולת פרסומות והתחברות מאוחדת (SSO) — החל מ-$149 לבית ספר לשנה.',
  whyTitle: 'למה בתי ספר בוחרים ב-LexiClash',
  why: [
    { title: 'בלי חשבונות תלמידים', body: 'התלמידים מצטרפים למשחק כיתתי עם קוד — אין חשבונות להקים, אין רישום כיתה לפני שמתחילים לשחק, אין נתוני תלמידים לנהל.' },
    { title: '5 שפות, כולל עברית מימין לשמאל', body: 'אנגלית, עברית (תמיכה מלאה מימין לשמאל), ספרדית, שוודית ויפנית עם מילונים מובנים — בנוי לכיתות דו-לשוניות, ESL וטבילה לשונית.' },
    { title: 'דו-קרבות 1 על 1 + משחק כיתתי', body: 'הצמידו תלמידים בדו-קרב ראש בראש או הפעילו סבב חי לכל הכיתה. משחק של בניית מילים, לא שאלות סגורות פסיביות.' },
    { title: 'אפס הכנה', body: 'בחרו רשימת מילים, בחרו מצב משחק, שתפו את הקוד. חימום של 5 דקות או חזרה בסוף יחידה — בלי שום הכנה.' },
  ],
  compareTitle: 'איך באמת נראית ההשוואה בין המסלולים החינמיים',
  compareIntro:
    'רוב הכלים ה"חינמיים" למשחקי כיתה מגבילים את המסלול החינמי כל כך נמוך שהוא נשבר בכיתה אמיתית, ואז גובים לפי מורה או לפי תלמיד. הנה ההשוואה הכנה — הכול במהלך הניסיון החינם שלנו.',
  compareRows: [
    { competitor: 'Kahoot', freeTierLimit: 'המסלול החינמי מגביל את מספר השחקנים החיים (מעט מדי לכיתה מלאה); תוכניות בית ספר נגבות לפי מורה.', lexiclash: 'בלי הגבלת שחקנים בזמן הניסיון. תוכניות בית ספר $149 לשנה.' },
    { competitor: 'Gimkit', freeTierLimit: 'המסלול החינמי מוגבל ל-5 תלמידים; תוכניות בית ספר עולות $650–$1,000 לשנה.', lexiclash: 'בלי הגבלת תלמידים בזמן הניסיון. תוכניות בית ספר החל מ-$149 לשנה.' },
    { competitor: 'Vocabulary.com', freeTierLimit: 'אין מסלול חינמי אמיתי — $199 לכיתה כדי להתחיל.', lexiclash: 'ניסיון מלא, בלי כרטיס. תוכניות בית ספר החל מ-$149 לשנה.' },
    { competitor: 'Wordwall', freeTierLimit: 'המסלול החינמי מוגבל לקומץ פעילויות.', lexiclash: 'משחק בלי הגבלה בזמן הניסיון. תוכניות בית ספר החל מ-$149 לשנה.' },
  ],
  comingTitle: 'מה כוללות תוכניות בית ספר ורשות',
  comingIntro:
    'אלה היכולות שבתי ספר אומרים לנו שהם צריכים בקנה מידה גדול — זמינות בתוכניות בית ספר ($149 לשנה), נבנות מעל הכיתה החינמית ולעולם לא חוסמות אותה.',
  coming: [
    { title: 'לוח ניהול לרשות החינוך', body: 'ראו את השימוש בכל כיתה וכל מורה בבית הספר או ברשות שלכם ממקום אחד.' },
    { title: 'ניתוח נתונים בין כיתות', body: 'השוואות בין קבוצות, מגמות שליטה באוצר מילים ודוחות לייצוא לצורכי ציונים וסטנדרטים.' },
    { title: 'ספריות תוכן לימודי', body: 'מערכי מילים רב-לשוניים אצורים וממופים לתכנית הלימודים שלכם — בכל חמש השפות.' },
    { title: 'מצב בית ספר נטול פרסומות ו-SSO', body: 'סביבה נטולת פרסומות לחלוטין בתוספת התחברות מאוחדת (Clever / ClassLink / Google) להטמעה קלה.' },
  ],
  leadTitle: 'ספרו לנו על בית הספר שלכם',
  leadIntro:
    'כבר משתמשים ב-LexiClash בכיתה, או שוקלים להרחיב את זה? ספרו לנו על בית הספר או הרשות שלכם ומה אתם צריכים — נחזור אליכם בנוגע לניסיון, למחיר תוכנית בית הספר ($149 לשנה) או לגישה מוקדמת ליכולות הרשות.',
  faqTitle: 'בתי ספר ורשויות — שאלות נפוצות',
  faqs: [
    { q: 'האם LexiClash חינם למורים?', a: 'כל מורה מקבל ניסיון מלא של 30 יום: משחק כיתתי, דו-קרבות 1 על 1, כל חמש השפות, בלי פרסומות, בלי חשבונות תלמידים, בלי כרטיס אשראי. בתום הניסיון, המשחק הכיתתי הבסיסי נשאר חינם למורים בודדים. תוכניות בית ספר — שמוסיפות לוחות ניהול, ניתוח נתונים, ספריות תוכן לימודי וסביבה נטולת פרסומות — מתחילות ב-$149 לבית ספר לשנה.' },
    { q: 'מה כוללת תוכנית בית ספר או רשות?', a: 'תוכניות בית ספר ($149 לשנה לבית ספר) מוסיפות את היכולות שמתרחבות: לוח ניהול לרשות, ניתוח נתונים ודוחות בין כיתות, ספריות תוכן לימודי אצורות, סביבת בית ספר נטולת פרסומות ו-SSO (Clever / ClassLink / Google). המשחק הכיתתי הבסיסי נשאר חינם — התוכניות נבנות מעליו, לעולם לא חוסמות אותו.' },
    { q: 'האם תלמידים צריכים חשבונות או התחברות?', a: 'לא. התלמידים מצטרפים למשחק כיתתי עם קוד — אין מה להקים, אין נתוני תלמידים לנהל. זה הופך הטמעה בכל בית הספר להרבה יותר פשוטה מכלים שדורשים רישום או SSO לפני שמשחקים.' },
    { q: 'אילו שפות נתמכות?', a: 'אנגלית, עברית (תמיכה מלאה מימין לשמאל), ספרדית, שוודית ויפנית, כל אחת עם מילון מובנה — בנוי לכיתות ESL, דו-לשוניות וטבילה לשונית.' },
    { q: 'איך מתחילים את הניסיון או מקבלים תוכנית בית ספר?', a: 'מלאו את הטופס בעמוד הזה עם התפקיד שלכם, בית הספר או הרשות ומספר תלמידים משוער. נאשר לכם את גישת הניסיון ונשתף פרטים על תוכנית בית הספר — $149 לשנה לבית ספר, מחיר לרשויות לפי בקשה.' },
    { q: 'במה זה שונה מ-Kahoot, Gimkit או Quizlet?', a: 'אלה כלי חידונים/כרטיסיות שמגבילים את המסלול החינמי שלהם ומתמקדים באנגלית. LexiClash הוא משחק בניית מילים (לא שאלות סגורות), תומך בחמש שפות כולל עברית מימין לשמאל, בלי הגבלת שחקנים בזמן הניסיון ומציע דו-קרבות אמיתיים 1 על 1.' },
    { q: 'אפשר להשתמש ב-LexiClash לתלמידי ESL או לומדי אנגלית (ELL)?', a: 'כן — LexiClash נבנה עם לומדי שפות במחשבה. הוא תומך באנגלית, עברית (מימין לשמאל), ספרדית, שוודית ויפנית עם מילונים מובנים. תלמידים יכולים להתחרות בשפה שלהם או לתרגל את השפה שהם לומדים, מה שהופך אותו למתאים באופן טבעי לכיתות ESL, דו-לשוניות וטבילה לשונית. משחק בניית המילים — שבו תלמידים מוצאים, מאייתים ומגישים מילים אמיתיות מול יריב חי או מול כל הכיתה — מחזק אוצר מילים ואיות באופן טבעי, בלי שאלות סגורות פסיביות.' },
    { q: 'אפשר להשתמש ב-LexiClash כמשחק לתרגול איות?', a: 'כן. פורמט בניית המילים של LexiClash — שבו תלמידים מוצאים, מאייתים ומגישים מילים אמיתיות מול יריב חי או מול כל הכיתה — הופך את תרגול האיות לתחרותי ומרתק במקום פסיבי. מורים משתמשים בו לחימום אוצר מילים, לחזרות בסוף יחידה ולטורנירים כיתתיים.' },
    { q: 'האם LexiClash עובד על Chromebook ומכשירי בית ספר?', a: 'כן. LexiClash רץ לגמרי בדפדפן — בלי אפליקציה להתקין, בלי חשבונות תלמידים להקים. הוא עובד על Chromebook, iPad, מחשבים שולחניים וטלפונים. התלמידים מצטרפים עם קוד משחק. תוכניות בית ספר תומכות ב-Clever, ב-ClassLink ובהתחברות עם Google (SSO) לחשבונות מורים.' },
  ],
  heroCta1: 'שחקו משחק כיתתי חינם',
  heroCta2: 'ספרו לנו על בית הספר שלכם',
  closingTitle: 'מוכנים להביא את LexiClash לבית הספר שלכם?',
  closingCta: 'ספרו לנו על בית הספר שלכם',
};

const SV: ForSchoolsContent = {
  metaTitle: 'Gratis ordförråds- och ESL-ordspel för skolor — LexiClash',
  metaDescription:
    'Ordförråds- och ESL-stavningsspel för K-12-klassrum — ingen inloggning för elever, 5 språk (engelska, hebreiska, spanska, svenska, japanska), 1v1-orddueller och klassomfattande spel. Gratis 30-dagars provperiod för lärare. Skolplaner från $149/år.',
  ogTitle: 'LexiClash för skolor — Ordförråds- och ESL-ordspel',
  ogDescription:
    'Gratis ord- och ordförrådsspel för varje klassrum — ingen inloggning för elever, 5 språk, 1v1-dueller. Gratis provperiod. Skolplaner från $149/år.',
  heroTag: 'För skolor och distrikt',
  heroH1: 'Ordspel som din skola faktiskt kan',
  heroHighlight: 'använda',
  heroSubtitle:
    'Prova LexiClash gratis i 30 dagar — utan inloggning för elever, utan kreditkort, utan annonser i klassrummet. 5 språk inklusive hebreiska RTL, direktsänt klassomfattande spel och 1v1-orddueller. Enskilda lärare behåller gratis basåtkomst efter provperioden; skol- och distriktsplaner skalar därifrån.',
  freeForeverTitle: 'Börja gratis — skolplaner från $149/år',
  freeForeverBody:
    'Varje lärare får en fullständig 30-dagars provperiod: ingen inloggning för elever, ingen spelargräns, inget kreditkort. Efter provperioden förblir det grundläggande klassrumsspelet gratis för enskilda lärare. Skolplaner lägger till administratörsöversikter, statistik över klasser, läroplansbibliotek, en annonsfri miljö och SSO — från $149/skola/år.',
  whyTitle: 'Varför skolor väljer LexiClash',
  why: [
    { title: 'Ingen inloggning för elever', body: 'Eleverna ansluter till ett klassrumsspel med en kod — inga konton att skapa, ingen klasslista innan ni kan spela, inga elevdata att hantera.' },
    { title: '5 språk, inklusive hebreiska RTL', body: 'Engelska, hebreiska (fullt höger-till-vänster), spanska, svenska och japanska med inbyggda ordböcker — byggda för tvåspråkiga, ESL- och immersionsklassrum.' },
    { title: '1v1-dueller + klassomfattande spel', body: 'Para ihop elever ansikte mot ansikte eller kör en live-runda med hela klassen. Ordbyggande spel, inte passiva flervalsfrågor.' },
    { title: 'Noll förberedelse', body: 'Välj en ordlista, välj ett läge, dela koden. En 5-minuters uppvärmning eller en repetition i slutet av ett avsnitt — utan extra arbete.' },
  ],
  compareTitle: 'Hur de fria versionerna faktiskt jämförs',
  compareIntro:
    'De flesta "gratis" klassrumsspelverktyg begränsar gratisversionen så mycket att den inte fungerar för en verklig klass, sedan debiterar de per lärare eller elev. Här är den ärliga jämförelsen — allt under vår provperiod.',
  compareRows: [
    { competitor: 'Kahoot', freeTierLimit: 'Gratisversionen begränsar antalet livespelare (för få för en full klass); skolplaner är per lärare.', lexiclash: 'Ingen spelargräns under provperioden. Skolplaner $149/år.' },
    { competitor: 'Gimkit', freeTierLimit: 'Gratisversionen begränsad till 5 elever; skolplaner kostar $650–$1 000/år.', lexiclash: 'Ingen elevgräns under provperioden. Skolplaner från $149/år.' },
    { competitor: 'Vocabulary.com', freeTierLimit: 'Ingen verklig gratisversion — $199/klassrum för att komma igång.', lexiclash: 'Fullständig provperiod, inget kort. Skolplaner från $149/år.' },
    { competitor: 'Wordwall', freeTierLimit: 'Gratisversionen begränsad till ett fåtal aktiviteter.', lexiclash: 'Obegränsad speltid under provperioden. Skolplaner från $149/år.' },
  ],
  comingTitle: 'Vad skol- och distriktsplaner inkluderar',
  comingIntro:
    'Det här är de funktioner som skolor säger att de behöver i stor skala — tillgängliga i skolplaner ($149/år), byggda ovanpå det gratis klassrummet, aldrig låsta bakom det.',
  coming: [
    { title: 'Distriktsadministratörens instrumentpanel', body: 'Se användningen i varje klass och från varje lärare i din skola eller ditt distrikt från en plats.' },
    { title: 'Tvärklassanalys', body: 'Kohortriktmärken, trender för ordförrådsbehärskning och exporterbara rapporter för betygsättning och standarder.' },
    { title: 'Läroplansbibliotek', body: 'Kurerade flerspråkiga ordsamlingar mappade till din läroplan — över alla fem språken.' },
    { title: 'Annonsfritt skolläge och SSO', body: 'En helt annonsfri miljö plus enkel inloggning (Clever / ClassLink / Google) för smidig distribution.' },
  ],
  leadTitle: 'Berätta om din skola',
  leadIntro:
    'Använder du LexiClash med din klass eller tänker du på att rulla ut det bredare? Berätta om din skola eller ditt distrikt och vad du behöver — vi hör av oss om din provperiod, skolplanspriser ($149/år) eller tidig åtkomst till distriktsfunktioner.',
  faqTitle: 'Skolor och distrikt — vanliga frågor',
  faqs: [
    { q: 'Är LexiClash gratis för lärare?', a: 'Varje lärare får en fullständig 30-dagars provperiod: klassomfattande spel, 1v1-dueller, alla fem språken, inga annonser, ingen inloggning för elever, inget kreditkort. Efter provperioden förblir det grundläggande klassrumsspelet gratis för enskilda lärare. Skolplaner — som lägger till administratörsöversikter, statistik, läroplansbibliotek och en annonsfri miljö — börjar på $149/skola/år.' },
    { q: 'Vad inkluderar en skol- eller distriktsplan?', a: 'Skolplaner ($149/år per skola) lägger till funktioner som skalar: en distriktsadministratörs instrumentpanel, tvärklassanalys och rapportering, kurerade läroplansbibliotek, en annonsfri skolmiljö och SSO (Clever / ClassLink / Google). Det grundläggande klassrumsspelet förblir gratis — planerna byggs ovanpå, aldrig som en spärr.' },
    { q: 'Behöver eleverna konton eller inloggning?', a: 'Nej. Eleverna ansluter till ett klassrumsspel med en kod — inget att skapa, inga elevdata att hantera. Det gör en skolövergripande lansering mycket enklare än verktyg som kräver klasslistor eller SSO innan man kan spela.' },
    { q: 'Vilka språk stöds?', a: 'Engelska, hebreiska (fullt höger-till-vänster-stöd), spanska, svenska och japanska, var och en med en inbyggd ordbok — byggd för ESL, tvåspråkiga och immersionsklassrum.' },
    { q: 'Hur börjar vi vår provperiod eller får en skolplan?', a: 'Fyll i formuläret på den här sidan med din roll, skola eller distrikt och ungefärligt antal elever. Vi bekräftar din provåtkomst och delar information om skolplanen — $149/år per skola, distriktspriser på begäran.' },
    { q: 'Hur skiljer sig detta från Kahoot, Gimkit eller Quizlet?', a: 'Det är quiz-/flashcardverktyg som begränsar sina gratisversioner och är engelskfokuserade. LexiClash är ett ordbyggande spel (inte flervalsfrågor), stöder fem språk inklusive hebreiska RTL, har ingen spelargräns under provperioden och erbjuder riktiga 1v1-dueller.' },
    { q: 'Kan jag använda LexiClash för ESL eller elever med engelska som andraspråk (ELL)?', a: 'Ja — LexiClash byggdes med språkinlärare i åtanke. Det stöder engelska, hebreiska (RTL), spanska, svenska och japanska med inbyggda ordböcker. Eleverna kan tävla på sitt eget språk eller öva det språk de lär sig, vilket gör det naturligt för ESL, tvåspråkiga och immersionsklassrum. Ordbyggande spel — där elever hittar, stavar och skickar in riktiga ord mot en levande motståndare eller hela klassen — stärker ordförråd och stavning organiskt, utan passiva flervalsfrågor.' },
    { q: 'Kan eleverna använda LexiClash som ett stavningsövningsspel?', a: 'Ja. LexiClashs ordbyggande format — där elever hittar, stavar och skickar in riktiga ord mot en levande motståndare eller hela klassen — gör stavningsövning konkurrenskraftig och engagerande i stället för passiv. Lärare använder det för stavningsuppvärmningar, repetitioner i slutet av ett avsnitt och klassrumsturneringar.' },
    { q: 'Fungerar LexiClash på Chromebooks och skolenheter?', a: 'Ja. LexiClash körs helt i webbläsaren — ingen app att installera, inga elevkonton att skapa. Det fungerar på Chromebooks, iPads, stationära datorer och telefoner. Eleverna ansluter med en spelkod. Skolplaner stöder Clever, ClassLink och Google Sign-In SSO för lärarkonton.' },
  ],
  heroCta1: 'Spela ett klassrumsspel gratis',
  heroCta2: 'Berätta om din skola',
  closingTitle: 'Redo att ta LexiClash till din skola?',
  closingCta: 'Berätta om din skola',
};

const JA: ForSchoolsContent = {
  metaTitle: '学校向け無料語彙・ESL単語ゲーム — LexiClash',
  metaDescription:
    'K-12クラス向けの語彙とESLスペリング練習 — 学生ログイン不要、5言語（英語、ヘブライ語、スペイン語、スウェーデン語、日本語）、1v1単語決闘とクラス全体プレイ。教師向け30日間無料トライアル。学校プランは年$149から。',
  ogTitle: '学校向けLexiClash — 語彙とESL単語ゲーム',
  ogDescription:
    'すべてのクラスルーム向け無料語彙・ESL単語ゲーム — 学生ログイン不要、5言語、1v1決闘。30日間無料トライアル。学校プランは年$149から。',
  heroTag: '学校・学区向け',
  heroH1: 'あなたの学校が実際に',
  heroHighlight: '使える語彙ゲーム',
  heroSubtitle:
    'LexiClashを30日間無料でお試しください — 学生ログイン不要、クレジットカード不要、授業内の広告なし。ヘブライ語RTL対応を含む5言語、ライブのクラス全体プレイ、1v1単語決闘に対応しています。トライアル後も、基本的なクラスルームゲームは個人の教師向けに無料のまま。学校・学区プランはそこから拡張できます。',
  freeForeverTitle: '無料でスタート — 学校プランは年$149から',
  freeForeverBody:
    'すべての教師が完全な30日間トライアルを利用できます：学生ログイン不要、プレイヤー数制限なし、クレジットカード不要。トライアル後も、基本的なクラスルームゲームは個人の教師向けに無料のままです。学校プランは管理ダッシュボード、クラス間分析、カリキュラムライブラリ、広告なし環境、SSO を追加 — 1学校あたり年$149から。',
  whyTitle: 'なぜ学校がLexiClashを選ぶのか',
  why: [
    { title: '学生ログイン不要', body: '学生はコードでクラスゲームに参加 — アカウント作成不要、プレイ前の名簿登録不要、学生データの管理も不要です。' },
    { title: '5言語対応（ヘブライ語RTL含む）', body: '英語、ヘブライ語（完全なRTLサポート）、スペイン語、スウェーデン語、日本語 — ネイティブ辞書を完備し、バイリンガル、ESL、イマージョンのクラスルーム向けです。' },
    { title: '1v1決闘とクラス全体プレイ', body: '学生をペアで対戦させるか、ライブのクラス全体ラウンドを実施。単語構築ゲームで、受動的な選択式ではありません。' },
    { title: '準備ゼロ', body: '単語リストを選び、モードを選び、コードを共有するだけ。5分のウォーミングアップにも、準備なしの単元末レビューにも使えます。' },
  ],
  compareTitle: '無料プランを正直に比較',
  compareIntro:
    '「無料」のクラスルームゲームツールのほとんどは、無料プランをあまりに低く制限して実際のクラスでは機能させず、その後教師や学生ごとに課金します。以下が正直な比較です — すべて当社の無料トライアル期間中の内容です。',
  compareRows: [
    { competitor: 'Kahoot', freeTierLimit: '無料プランはライブプレイヤー数が制限され（クラス全体には少なすぎる）、学校プランは教師ごとの課金。', lexiclash: 'トライアル中はプレイヤー数制限なし。学校プランは年$149。' },
    { competitor: 'Gimkit', freeTierLimit: '無料プランは5学生まで; 学校プランは年$650～$1,000。', lexiclash: 'トライアル中は学生数制限なし。学校プランは年$149から。' },
    { competitor: 'Vocabulary.com', freeTierLimit: '本当の無料プランなし — スタート時に教室ごとに$199。', lexiclash: '完全なトライアル、カード不要。学校プランは年$149から。' },
    { competitor: 'Wordwall', freeTierLimit: '無料プランは少数のアクティビティに制限。', lexiclash: 'トライアル中は無制限プレイ。学校プランは年$149から。' },
  ],
  comingTitle: '学校・学区プランに含まれるもの',
  comingIntro:
    'これらは、規模を拡大する際に学校が必要だと教えてくれる機能です — 学校プラン（年$149）で利用可能。無料クラスルームの上に積み重ねられ、決して制限することはありません。',
  coming: [
    { title: '学区管理者ダッシュボード', body: '学校や学区内のすべてのクラスと教師の利用状況を、1か所から確認できます。' },
    { title: 'クラス間分析', body: 'コホート比較、語彙習得の傾向、成績評価と基準のためのエクスポート可能なレポート。' },
    { title: 'カリキュラムコンテンツライブラリ', body: 'あなたのカリキュラムにマッピングされた多言語の単語セット — 5言語すべてに対応。' },
    { title: '広告なし学校モードとSSO', body: '完全に広告のない環境に加え、シングルサインオン（Clever / ClassLink / Google）で簡単に展開できます。' },
  ],
  leadTitle: 'あなたの学校について教えてください',
  leadIntro:
    'すでにクラスでLexiClashを使っていますか、それとももっと広く導入することを検討していますか？あなたの学校または学区と、必要なことについて教えてください — トライアル、学校プラン（年$149）、または学区向け機能の早期アクセスについてご連絡します。',
  faqTitle: '学校・学区 — よくある質問',
  faqs: [
    { q: 'LexiClashは教師にとって無料ですか？', a: 'すべての教師が完全な30日間トライアルを利用できます：クラス全体プレイ、1v1決闘、5言語すべて、広告なし、学生ログイン不要、クレジットカード不要。トライアル後も、基本的なクラスルームゲームは個人の教師向けに無料のままです。学校プラン — 管理ダッシュボード、分析、カリキュラムライブラリ、広告なし環境を追加 — は1学校あたり年$149から。' },
    { q: '学校または学区プランには何が含まれますか？', a: '学校プラン（1学校あたり年$149）は、規模を拡大するための機能を追加します：学区管理ダッシュボード、クラス間の分析とレポート、厳選されたカリキュラムコンテンツライブラリ、広告のない学校環境、SSO（Clever / ClassLink / Google）。基本的なクラスルームゲームは無料のまま — プランは上に積み重ねられ、決して制限しません。' },
    { q: '学生にアカウントやログインは必要ですか？', a: 'いいえ。学生はコードでクラスゲームに参加します — 何も用意する必要がなく、学生データを管理する必要もありません。これにより、名簿登録やプレイ前のSSOを必要とするツールよりも、学校全体への展開がはるかに簡単になります。' },
    { q: 'どの言語に対応していますか？', a: '英語、ヘブライ語（完全なRTLサポート）、スペイン語、スウェーデン語、日本語 — それぞれネイティブ辞書を完備し、ESL、バイリンガル、イマージョンのクラスルーム向けです。' },
    { q: 'トライアルを始める、または学校プランを取得するにはどうすればよいですか？', a: 'このページのフォームに、あなたの役割、学校または学区、およびおおよその学生数を入力してください。トライアルアクセスを確認し、学校プランの詳細をお伝えします — 1学校あたり年$149、学区向け価格はご要望に応じます。' },
    { q: 'Kahoot、Gimkit、Quizletとどう違いますか？', a: 'それらは無料プランを制限し英語優先のクイズ／フラッシュカードツールです。LexiClashは単語構築ゲーム（選択式ではありません）で、ヘブライ語RTLを含む5言語に対応し、トライアル中はプレイヤー数制限がなく、本物の1v1決闘を提供します。' },
    { q: 'ESLや英語学習者（ELL）の学生にLexiClashを使えますか？', a: 'はい — LexiClashは言語学習者を念頭に作られました。英語、ヘブライ語（RTL）、スペイン語、スウェーデン語、日本語にネイティブ辞書で対応しています。学生は自分の言語で競い合ったり、学んでいる言語を練習したりできるため、ESL、バイリンガル、イマージョンのクラスルームに自然にフィットします。単語構築ゲーム — 学生がライブの対戦相手やクラス全体を相手に本物の単語を見つけ、つづり、送信する — は、受動的な選択式なしで語彙とつづりを自然に強化します。' },
    { q: '学生はLexiClashをスペリング練習ゲームとして使えますか？', a: 'はい。LexiClashの単語構築フォーマット — 学生がライブの対戦相手やクラス全体を相手に本物の単語を見つけ、つづり、送信する — は、スペリング練習を受動的ではなく競争的で魅力的なものにします。教師は語彙のウォーミングアップ、単元末のレビュー、クラス内トーナメントに活用しています。' },
    { q: 'LexiClashはChromebookや学校の端末で動作しますか？', a: 'はい。LexiClashはブラウザで完全に動作します — アプリのインストール不要、学生アカウントの用意も不要です。Chromebook、iPad、デスクトップ、スマートフォンで動作します。学生はゲームコードで参加します。学校プランは、教師アカウント向けにClever、ClassLink、Google Sign-In SSOに対応しています。' },
  ],
  heroCta1: 'クラスゲームを無料でプレイ',
  heroCta2: 'あなたの学校について教えてください',
  closingTitle: 'LexiClashを学校に導入する準備はできましたか？',
  closingCta: 'あなたの学校について教えてください',
};

const ES: ForSchoolsContent = {
  metaTitle: 'Juegos de vocabulario y ESL gratis para escuelas — LexiClash',
  metaDescription:
    'Juegos de vocabulario y práctica de ortografía en inglés para aulas K-12 — sin inicios de sesión de estudiantes, 5 idiomas (inglés, hebreo, español, sueco, japonés), duelos de palabras 1v1 y juego en clase completo. Prueba gratis por 30 días para maestros. Planes escolares desde $149/año.',
  ogTitle: 'LexiClash para escuelas — Juegos de vocabulario y ESL',
  ogDescription:
    'Juegos de vocabulario y ESL gratis para cada aula — sin inicios de sesión de estudiantes, 5 idiomas, duelos 1v1. Prueba gratis por 30 días. Planes escolares desde $149/año.',
  heroTag: 'Para escuelas y distritos',
  heroH1: 'Juegos de vocabulario que toda tu escuela puede',
  heroHighlight: 'usar de verdad',
  heroSubtitle:
    'Prueba LexiClash gratis por 30 días — sin inicios de sesión de estudiantes, sin tarjeta de crédito, sin anuncios en clase. 5 idiomas incluido hebreo RTL, juego en vivo con toda la clase y duelos de palabras 1v1. Los maestros individuales mantienen el acceso básico gratis después de la prueba; los planes de escuela y distrito escalan desde ahí.',
  freeForeverTitle: 'Empieza gratis — planes escolares desde $149/año',
  freeForeverBody:
    'Cada maestro obtiene una prueba completa de 30 días: sin inicios de sesión de estudiantes, sin límite de jugadores, sin tarjeta de crédito. Después de tu prueba, el juego básico de aula sigue siendo gratis para maestros individuales. Los planes escolares agregan paneles de administración, análisis entre clases, bibliotecas de currículo, un entorno sin anuncios y SSO — desde $149/escuela/año.',
  whyTitle: 'Por qué las escuelas eligen LexiClash',
  why: [
    { title: 'Sin inicios de sesión de estudiantes', body: 'Los estudiantes se unen a un juego de clase con un código — sin cuentas que crear, sin registro de clase antes de jugar, sin datos de estudiantes que gestionar.' },
    { title: '5 idiomas, incluido hebreo RTL', body: 'Inglés, hebreo (derecha a izquierda completo), español, sueco y japonés con diccionarios nativos — diseñado para aulas bilingües, ESL e inmersión de idiomas.' },
    { title: 'Duelos 1v1 + juego en clase', body: 'Empareja estudiantes en duelos uno contra uno o ejecuta una ronda en vivo con toda la clase. Construcción de palabras, no opción múltiple pasiva.' },
    { title: 'Cero preparación', body: 'Elige una lista de palabras, elige un modo, comparte el código. Un calentamiento de 5 minutos o un repaso de fin de unidad sin preparación.' },
  ],
  compareTitle: 'Cómo se comparan de verdad los niveles gratuitos',
  compareIntro:
    'La mayoría de las herramientas de juegos "gratuitas" para el aula limitan el nivel gratuito tan bajo que se rompe con una clase real, y luego cobran por maestro o por estudiante. Aquí está la comparación honesta — todo durante nuestra prueba gratuita.',
  compareRows: [
    { competitor: 'Kahoot', freeTierLimit: 'El nivel gratuito limita los jugadores en vivo (muy pocos para una clase completa); los planes escolares son por maestro.', lexiclash: 'Sin límite de jugadores durante la prueba. Planes escolares $149/año.' },
    { competitor: 'Gimkit', freeTierLimit: 'El nivel gratuito se limita a 5 estudiantes; los planes escolares cuestan $650–$1,000/año.', lexiclash: 'Sin límite de estudiantes durante la prueba. Planes escolares desde $149/año.' },
    { competitor: 'Vocabulary.com', freeTierLimit: 'Sin nivel gratuito real — $199/clase para empezar.', lexiclash: 'Prueba completa, sin tarjeta. Planes escolares desde $149/año.' },
    { competitor: 'Wordwall', freeTierLimit: 'El nivel gratuito se limita a un puñado de actividades.', lexiclash: 'Juego ilimitado en la prueba. Planes escolares desde $149/año.' },
  ],
  comingTitle: 'Qué incluyen los planes escolares y de distrito',
  comingIntro:
    'Estas son las funciones que las escuelas nos dicen que necesitan a escala — disponibles en los planes escolares ($149/año), superpuestas al aula gratuita, sin limitarla nunca.',
  coming: [
    { title: 'Panel de administración de distrito', body: 'Ve el uso en cada clase y de cada maestro de tu escuela o distrito desde un solo lugar.' },
    { title: 'Análisis entre clases', body: 'Puntos de referencia de cohortes, tendencias de dominio de vocabulario e informes exportables para calificaciones y estándares.' },
    { title: 'Bibliotecas de contenido de currículo', body: 'Conjuntos de palabras multilingües curados y asignados a tu currículo — en los cinco idiomas.' },
    { title: 'Modo escolar sin anuncios y SSO', body: 'Un entorno completamente sin anuncios más inicio de sesión único (Clever / ClassLink / Google) para una implementación fácil.' },
  ],
  leadTitle: 'Cuéntanos sobre tu escuela',
  leadIntro:
    '¿Ya usas LexiClash con tu clase o estás pensando en implementarlo a mayor escala? Cuéntanos sobre tu escuela o distrito y qué necesitas — nos pondremos en contacto sobre tu prueba, el precio del plan escolar ($149/año) o el acceso anticipado a funciones de distrito.',
  faqTitle: 'Escuelas y distritos — preguntas frecuentes',
  faqs: [
    { q: '¿Es LexiClash gratis para maestros?', a: 'Cada maestro obtiene una prueba completa de 30 días: juego en clase, duelos 1v1, los cinco idiomas, sin anuncios, sin inicios de sesión de estudiantes, sin tarjeta de crédito. Después de la prueba, el juego básico de aula sigue siendo gratis para maestros individuales. Los planes escolares — que agregan paneles de administración, análisis, bibliotecas de contenido curricular y un entorno sin anuncios — comienzan en $149/escuela/año.' },
    { q: '¿Qué incluyen los planes escolares o de distrito?', a: 'Los planes escolares ($149/año por escuela) agregan las funciones que escalan: un panel de administración de distrito, análisis y reportes entre clases, bibliotecas de contenido curricular curadas, un entorno escolar sin anuncios y SSO (Clever / ClassLink / Google). El juego básico de aula sigue siendo gratis — los planes se superponen, nunca lo limitan.' },
    { q: '¿Los estudiantes necesitan cuentas o inicios de sesión?', a: 'No. Los estudiantes se unen a un juego de clase con un código — nada que crear, sin datos de estudiantes que gestionar. Eso hace que una implementación en toda la escuela sea mucho más simple que las herramientas que requieren registro o SSO antes de jugar.' },
    { q: '¿Qué idiomas son compatibles?', a: 'Inglés, hebreo (compatibilidad completa de derecha a izquierda), español, sueco y japonés, cada uno con un diccionario nativo — diseñado para aulas ESL, bilingües e inmersión de idiomas.' },
    { q: '¿Cómo iniciamos nuestra prueba u obtenemos un plan escolar?', a: 'Completa el formulario en esta página con tu rol, escuela o distrito y cuántos estudiantes tienes aproximadamente. Confirmaremos tu acceso de prueba y compartiremos los detalles del plan escolar — $149/año por escuela, precio de distrito bajo solicitud.' },
    { q: '¿En qué se diferencia de Kahoot, Gimkit o Quizlet?', a: 'Esas son herramientas de cuestionarios/tarjetas que limitan sus niveles gratuitos y priorizan el inglés. LexiClash es un juego de construcción de palabras (no opción múltiple), admite cinco idiomas incluido hebreo RTL, no tiene límite de jugadores durante la prueba y ofrece verdaderos duelos 1v1.' },
    { q: '¿Puedo usar LexiClash para estudiantes de ESL o aprendices de inglés (ELL)?', a: 'Sí — LexiClash fue diseñado pensando en los aprendices de idiomas. Admite inglés, hebreo (RTL), español, sueco y japonés con diccionarios nativos. Los estudiantes pueden competir en su propio idioma o practicar el idioma que están aprendiendo, lo que lo hace naturalmente adecuado para aulas ESL, bilingües e inmersión de idiomas. La mecánica de construcción de palabras — donde los estudiantes encuentran, deletrean y envían palabras reales contra un oponente en vivo o toda la clase — refuerza el vocabulario y la ortografía de forma orgánica, sin opción múltiple pasiva.' },
    { q: '¿Pueden los estudiantes usar LexiClash como un juego de práctica de ortografía?', a: 'Sí. El formato de construcción de palabras de LexiClash — donde los estudiantes encuentran, deletrean y envían palabras reales contra un oponente en vivo o toda la clase — hace que la práctica de ortografía sea competitiva y atractiva en lugar de pasiva. Los maestros lo usan para calentamientos de vocabulario, repasos de fin de unidad y torneos en clase.' },
    { q: '¿Funciona LexiClash en Chromebooks y dispositivos escolares?', a: 'Sí. LexiClash se ejecuta completamente en el navegador — sin aplicación que instalar, sin cuentas de estudiante que crear. Funciona en Chromebooks, iPads, computadoras de escritorio y teléfonos. Los estudiantes se unen con un código de juego. Los planes escolares admiten Clever, ClassLink e inicio de sesión con Google (SSO) para cuentas de maestro.' },
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
