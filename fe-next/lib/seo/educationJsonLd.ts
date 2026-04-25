// JSON-LD schemas for the /education hub.
// FAQPage boosts AI grounding + Google rich snippets for "vocabulary game
// for classrooms" / "online word game for teachers" queries.
// EducationalOrganization signals the educational use case to AI crawlers.
// BreadcrumbList mirrors the /guides pattern for consistent site navigation.

const BASE_URL = 'https://www.lexiclash.live';
const SUPPORTED = new Set(['en', 'he', 'sv', 'ja', 'es']);

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
    sameAs: [`${BASE_URL}`],
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
};

const COURSE_DESCRIPTION: Record<string, string> = {
  en: 'Self-paced and teacher-led vocabulary practice through competitive word games. Suitable for primary, middle, and high school classrooms, ESL/EFL programs, and adult learners. No prerequisites; works in any browser.',
  he: 'תרגול אוצר מילים עצמאי ובהנחיית מורה באמצעות משחקי מילים תחרותיים. מתאים לכיתות יסודי, חטיבה ותיכון, תוכניות עברית כשפה שנייה ולומדים מבוגרים. ללא דרישות מקדימות.',
  sv: 'Självgående och lärarledd ordförrådsövning genom tävlingsinriktade ordspel. Lämplig för grundskola, mellanstadium och gymnasium, samt vuxenutbildning. Inga förkunskaper krävs.',
  ja: '競争的なワードゲームによる自己学習および教師主導の語彙練習。小学校、中学校、高校の教室、ESL/EFLプログラム、成人学習者に適しています。前提条件なし。',
  es: 'Práctica de vocabulario autodirigida y guiada por el profesor a través de juegos de palabras competitivos. Adecuado para aulas de primaria, secundaria y bachillerato, programas ESL/EFL y estudiantes adultos. Sin requisitos previos.',
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
