// JSON-LD schemas for the /education hub.
// FAQPage boosts AI grounding + Google rich snippets for "vocabulary game
// for classrooms" / "online word game for teachers" queries.
// EducationalOrganization signals the educational use case to AI crawlers.
// BreadcrumbList mirrors the /guides pattern for consistent site navigation.

const BASE_URL = 'https://www.lexiclash.live';
const SUPPORTED = new Set(['en', 'he', 'sv', 'ja', 'es', 'ru']);
const LOCALES = ['en', 'he', 'sv', 'ja', 'es', 'ru'];

/**
 * How many languages we claim, derived — never typed as a literal.
 *
 * Until 2026-09-05 the WebApplication features below said "5 languages" in four
 * locales (and Russian said 6), so the hub's own structured data contradicted
 * itself and undersold the product by a language. A hand-typed count drifts the
 * moment a locale is added; this one cannot.
 */
const LANGUAGE_COUNT = LOCALES.length;

/**
 * Join codes are SIX characters — `utils/utils.ts:114` generates 6 alphanumerics
 * (36^6). Five locales advertised a "4-digit" code in this file and four more in
 * `educationSubpageJsonLd.ts`, which is both wrong and the kind of instruction a
 * teacher follows literally at the projector.
 */
const JOIN_CODE_LENGTH = 6;

// Real, existing LexiClash profiles — used as sameAs for entity verification.
// NEVER add placeholder/non-existent URLs here: an invalid sameAs hurts more
// than a missing one. Mirrors the canonical set in app/[locale]/layout.tsx.
const SAME_AS = [
  'https://www.instagram.com/lexi.clash',
  'https://play.google.com/store/apps/details?id=live.lexiclash.app',
];

interface FaqItem {
  question: string;
  answer: string;
}

function safeLocale(locale: string): string {
  return SUPPORTED.has(locale) ? locale : 'en';
}

export function buildEducationFaqJsonLd(locale: string, faq: FaqItem[]) {
  if (!faq || faq.length === 0) return null;
  const lang = safeLocale(locale);
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage' as const,
    '@id': `${BASE_URL}/${lang}/education#faq`,
    mainEntity: faq.map((item) => ({
      '@type': 'Question' as const,
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer' as const,
        text: item.answer,
      },
    })),
  };
}

const ORG_DESCRIPTION: Record<string, string> = {
  en: 'LexiClash Education provides classroom-ready word games, vocabulary duels, and a teacher dashboard for assigning curriculum-aligned exercises and tracking student progress. Free to use, browser-based, no downloads required.',
  he: 'LexiClash Education מספק משחקי מילים מוכנים לכיתה, דואלי אוצר מילים ולוח מחוונים למורים להקצאת תרגילים מותאמי תכנית לימודים ומעקב אחר התקדמות תלמידים. שימוש חינם, מבוסס דפדפן, ללא הורדות.',
  sv: 'LexiClash Education erbjuder klassrumsfärdiga ordspel, ordförrådsdueller och en lärarpanel för att tilldela läroplansanpassade övningar och följa elevernas framsteg. Gratis att använda, webbläsarbaserad, inga nedladdningar krävs.',
  ja: 'LexiClash Educationは、教室向けのワードゲーム、語彙デュエル、カリキュラムに沿った課題の割り当てと生徒の進捗追跡のための教師ダッシュボードを提供します。無料、ブラウザベース、ダウンロード不要。',
  es: 'LexiClash Education ofrece juegos de palabras listos para el aula, duelos de vocabulario y un panel del profesor para asignar ejercicios alineados con el currículo y monitorear el progreso de los estudiantes. Gratis, basado en navegador, sin descargas.',
  ru: 'LexiClash Education предоставляет готовые к использованию словесные игры, дуэли словарного запаса и панель для учителя для назначения упражнений, соответствующих учебной программе, и отслеживания прогресса учащихся. Бесплатно, в браузере, без скачивания.',
};

export function buildEducationOrgJsonLd(locale: string) {
  const lang = safeLocale(locale);
  return {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization' as const,
    '@id': `${BASE_URL}/${lang}/education#org`,
    name: 'LexiClash Education',
    url: `${BASE_URL}/${lang}/education`,
    description: ORG_DESCRIPTION[lang] ?? ORG_DESCRIPTION.en,
    inLanguage: lang,
    logo: {
      '@type': 'ImageObject' as const,
      url: `${BASE_URL}/logo.png`,
      width: 1024,
      height: 1024,
    },
    sameAs: SAME_AS,
    audience: {
      '@type': 'EducationalAudience',
      educationalRole: 'teacher',
    },
    educationalUse: ['Vocabulary Building', 'Classroom Activity', 'Language Learning'],
    isAccessibleForFree: true,
  };
}

const COURSE_NAME: Record<string, string> = {
  en: 'Vocabulary Building Through Word Games',
  he: 'בניית אוצר מילים באמצעות משחקי מילים',
  sv: 'Ordförrådsbyggande genom Ordspel',
  ja: 'ワードゲームによる語彙構築',
  es: 'Desarrollo de Vocabulario a través de Juegos de Palabras',
  ru: 'Развитие словарного запаса через словесные игры',
};

const COURSE_DESCRIPTION: Record<string, string> = {
  en: 'Self-paced and teacher-led vocabulary practice through competitive word games. Suitable for primary, middle, and high school classrooms, ESL/EFL programs, and adult learners. No prerequisites; works in any browser.',
  he: 'תרגול אוצר מילים עצמאי ובהנחיית מורה באמצעות משחקי מילים תחרותיים. מתאים לכיתות יסודי, חטיבה ותיכון, תוכניות עברית כשפה שנייה ולומדים מבוגרים. ללא דרישות מקדימות.',
  sv: 'Självgående och lärarledd ordförrådsövning genom tävlingsinriktade ordspel. Lämplig för grundskola, mellanstadium och gymnasium, samt vuxenutbildning. Inga förkunskaper krävs.',
  ja: '競争的なワードゲームによる自己学習および教師主導の語彙練習。小学校、中学校、高校の教室、ESL/EFLプログラム、成人学習者に適しています。前提条件なし。',
  es: 'Práctica de vocabulario autodirigida y guiada por el profesor a través de juegos de palabras competitivos. Adecuado para aulas de primaria, secundaria y bachillerato, programas ESL/EFL y estudiantes adultos. Sin requisitos previos.',
  ru: 'Самостоятельная и ведомая учителем практика словарного запаса через конкурентные словесные игры. Подходит для начальных, средних и старших классов, программ ESL/EFL и взрослых обучающихся. Без предварительных требований; работает в любом браузере.',
};

export function buildEducationCourseJsonLd(locale: string) {
  const lang = safeLocale(locale);
  return {
    '@context': 'https://schema.org',
    '@type': 'Course' as const,
    '@id': `${BASE_URL}/${lang}/education#course`,
    name: COURSE_NAME[lang] ?? COURSE_NAME.en,
    description: COURSE_DESCRIPTION[lang] ?? COURSE_DESCRIPTION.en,
    url: `${BASE_URL}/${lang}/education`,
    inLanguage: lang,
    isAccessibleForFree: true,
    educationalLevel: ['Primary', 'Secondary', 'Adult Education'],
    teaches: 'Vocabulary, spelling, word recognition, language fluency',
    provider: {
      '@type': 'EducationalOrganization' as const,
      '@id': `${BASE_URL}/${lang}/education#org`,
      name: 'LexiClash Education',
      url: `${BASE_URL}/${lang}/education`,
    },
    audience: {
      '@type': 'EducationalAudience',
      educationalRole: 'student',
    },
    hasCourseInstance: [
      {
        '@type': 'CourseInstance' as const,
        courseMode: 'Online',
        courseWorkload: 'PT5M',
        instructor: {
          '@type': 'Person',
          name: 'Classroom Teacher',
        },
      },
    ],
  };
}

export function buildEducationBreadcrumbJsonLd(locale: string) {
  const lang = safeLocale(locale);
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList' as const,
    itemListElement: [
      { '@type': 'ListItem' as const, position: 1, name: 'Home', item: `${BASE_URL}/${lang}` },
      { '@type': 'ListItem' as const, position: 2, name: 'Education', item: `${BASE_URL}/${lang}/education` },
    ],
  };
}

// WebApplication is the schema type AI engines (ChatGPT, Perplexity, Google AI
// Overviews) match for product-comparison queries like "free word games for
// classroom", "Quizlet alternative no signup", "vocabulary game online free".
// The zero-price Offer + isAccessibleForFree is the decisive "free" signal.
// provider references the canonical EducationalOrganization @id so crawlers
// resolve one entity, not a parallel org node.
const WEBAPP_FEATURES: Record<string, string[]> = {
  en: [
    `No student signup — join a class with a ${JOIN_CODE_LENGTH}-character code`,
    'Multiplayer vocabulary duels (1v1) and live whole-class games',
    'Teacher dashboard: custom word lists, progress tracking, class analytics',
    `${LANGUAGE_COUNT} languages including Hebrew (RTL) and Japanese, each with its own dictionary`,
    'Curriculum-aligned difficulty for primary, secondary, and ESL/EFL learners',
    'Runs in any browser — no downloads and no ads in class; Teacher Pro is optional',
  ],
  he: [
    `בלי הרשמת תלמידים — הצטרפות לכיתה עם קוד בן ${JOIN_CODE_LENGTH} תווים`,
    'דואלי אוצר מילים רב-משתתפים (1v1) ומשחקים חיים לכל הכיתה',
    'לוח מחוונים למורה: רשימות מילים מותאמות, מעקב התקדמות, אנליטיקת כיתה',
    `${LANGUAGE_COUNT} שפות כולל עברית (RTL) ויפנית, לכל אחת מילון משלה`,
    'רמת קושי מותאמת תכנית לימודים ליסודי, על-יסודי ולומדי אנגלית כשפה שנייה',
    'פועל בכל דפדפן — בלי הורדות ובלי פרסומות בשיעור; מסלול Teacher Pro הוא אופציונלי',
  ],
  sv: [
    `Ingen elevregistrering — gå med i en klass med en kod på ${JOIN_CODE_LENGTH} tecken`,
    'Ordförrådsdueller för flera spelare (1v1) och live-spel för hela klassen',
    'Lärarpanel: anpassade ordlistor, framstegsspårning, klassanalys',
    `${LANGUAGE_COUNT} språk inklusive hebreiska (RTL) och japanska, var och en med egen ordbok`,
    'Läroplansanpassad svårighetsgrad för grundskola, gymnasium och ESL/EFL',
    'Körs i valfri webbläsare — inga nedladdningar, inga betalspärrar',
  ],
  ja: [
    `生徒の登録不要 — ${JOIN_CODE_LENGTH}文字のコードでクラスに参加`,
    'マルチプレイヤー語彙デュエル（1対1）とクラス全体のライブゲーム',
    '教師ダッシュボード：カスタム単語リスト、進捗追跡、クラス分析',
    `ヘブライ語（RTL）と日本語を含む${LANGUAGE_COUNT}言語、それぞれ独自の辞書`,
    '小学校・中等教育・ESL/EFL学習者向けのカリキュラム準拠の難易度',
    'あらゆるブラウザで動作 — ダウンロード不要、ペイウォールなし',
  ],
  es: [
    `Sin registro de estudiantes — únete a una clase con un código de ${JOIN_CODE_LENGTH} caracteres`,
    'Duelos de vocabulario multijugador (1v1) y juegos en vivo para toda la clase',
    'Panel del profesor: listas personalizadas, seguimiento de progreso, análisis de clase',
    `${LANGUAGE_COUNT} idiomas incluyendo hebreo (RTL) y japonés, cada uno con su propio diccionario`,
    'Dificultad alineada al currículo para primaria, secundaria y ESL/EFL',
    'Funciona en cualquier navegador — sin descargas, sin muros de pago',
  ],
  ru: [
    `Без регистрации учеников — присоединись к классу с кодом из ${JOIN_CODE_LENGTH} символов`,
    'Многоплеерные дуэли словарного запаса (1v1) и живые игры для всего класса',
    'Панель учителя: пользовательские списки слов, отслеживание прогресса, аналитика класса',
    `${LANGUAGE_COUNT} языков включая иврит (RTL) и японский, каждый с собственным словарем`,
    'Уровень сложности, соответствующий учебной программе для начальной, средней и старшей школы, ESL/EFL',
    'Работает в любом браузере — без скачивания и без рекламы на уроке; Teacher Pro не обязателен',
  ],
};

export function buildEducationWebApplicationJsonLd(locale: string) {
  const lang = safeLocale(locale);
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication' as const,
    '@id': `${BASE_URL}/${lang}/education#webapp`,
    name: 'LexiClash Education',
    url: `${BASE_URL}/${lang}/education`,
    description: ORG_DESCRIPTION[lang] ?? ORG_DESCRIPTION.en,
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Web browser (Chrome, Safari, Firefox, Edge)',
    browserRequirements: 'Requires JavaScript. Works on phone, tablet, and desktop.',
    inLanguage: LOCALES,
    isAccessibleForFree: true,
    offers: {
      '@type': 'Offer' as const,
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
    featureList: WEBAPP_FEATURES[lang] ?? WEBAPP_FEATURES.en,
    audience: {
      '@type': 'EducationalAudience',
      educationalRole: ['teacher', 'student'],
    },
    provider: {
      '@type': 'EducationalOrganization' as const,
      '@id': `${BASE_URL}/${lang}/education#org`,
      name: 'LexiClash Education',
      url: `${BASE_URL}/${lang}/education`,
    },
    sameAs: SAME_AS,
  };
}
