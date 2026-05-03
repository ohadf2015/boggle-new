// JSON-LD for /education sub-pages (duels, classroom-game).
// HowTo + LearningResource pair: HowTo gets Google rich snippets;
// LearningResource is the schema AI answer engines (ChatGPT/Perplexity/AIO)
// reach for when fielding "best vocabulary game for classroom" queries.
// Locale-keyed strings mirror the educationJsonLd.ts pattern.

const BASE_URL = 'https://www.lexiclash.live';
const SUPPORTED = new Set(['en', 'he', 'sv', 'ja', 'es']);

function safeLocale(locale: string): string {
  return SUPPORTED.has(locale) ? locale : 'en';
}

type SubpageKey = 'duels' | 'classroomGame';

interface SubpageContent {
  name: string;
  description: string;
  steps: { name: string; text: string }[];
  audience: string;
  educationalUse: string[];
}

const DUELS_CONTENT: Record<string, SubpageContent> = {
  en: {
    name: 'How to Run a 1v1 Vocabulary Duel',
    description: 'Pair students for head-to-head vocabulary duels. Free, no signup, runs in any browser.',
    steps: [
      { name: 'Open vocabulary duels', text: 'Go to /education/duels and pick a word list — your curriculum, an ESL pack, or a quick warm-up set.' },
      { name: 'Pair students', text: 'Two students search the same letter grid simultaneously. First to the target score wins.' },
      { name: 'Review missed words', text: 'After the round, both players see every word they missed and can drill them in practice mode.' },
    ],
    audience: 'Primary, middle, and high school students; ESL/EFL learners; adult vocabulary builders.',
    educationalUse: ['Vocabulary Building', 'Spelling Practice', 'ESL Practice', 'Classroom Activity'],
  },
  he: {
    name: 'איך מריצים דואל אוצר מילים 1v1',
    description: 'התאימו תלמידים לדואלי אוצר מילים. בחינם, ללא הרשמה, פועל בכל דפדפן.',
    steps: [
      { name: 'פתחו דואל אוצר מילים', text: 'גשו ל-/education/duels ובחרו רשימת מילים — מתכנית הלימודים, חבילת ESL או סט חימום מהיר.' },
      { name: 'התאימו תלמידים', text: 'שני תלמידים מחפשים על אותו לוח אותיות בו-זמנית. הראשון שמגיע לניקוד היעד מנצח.' },
      { name: 'סקירת מילים שהוחמצו', text: 'בסוף הסיבוב, שני השחקנים רואים כל מילה שהחמיצו ויכולים לתרגל אותה במצב תרגול.' },
    ],
    audience: 'תלמידי יסודי, חטיבה ותיכון; לומדי עברית כשפה שנייה; מבוגרים הבונים אוצר מילים.',
    educationalUse: ['בניית אוצר מילים', 'תרגול איות', 'תרגול ESL', 'פעילות כיתה'],
  },
  sv: {
    name: 'Så kör du en ordförrådsduell 1 mot 1',
    description: 'Para ihop elever för ordförrådsdueller mot varandra. Gratis, ingen registrering, fungerar i alla webbläsare.',
    steps: [
      { name: 'Öppna ordförrådsdueller', text: 'Gå till /education/duels och välj en ordlista — från din läroplan, ett ESL-paket eller en snabb uppvärmning.' },
      { name: 'Para ihop elever', text: 'Två elever söker samtidigt på samma bokstavsbräda. Den första som når målpoängen vinner.' },
      { name: 'Granska missade ord', text: 'Efter rundan ser båda spelarna varje ord de missade och kan öva på dem i övningsläge.' },
    ],
    audience: 'Grundskole-, mellanstadie- och gymnasieelever; ESL/EFL-elever; vuxna ordförrådsbyggare.',
    educationalUse: ['Ordförrådsbyggande', 'Stavningsövning', 'ESL-övning', 'Klassrumsaktivitet'],
  },
  ja: {
    name: '1対1の語彙デュエルの実施方法',
    description: '生徒を1対1の語彙デュエルにペアリング。無料、登録不要、ブラウザで動作。',
    steps: [
      { name: '語彙デュエルを開く', text: '/education/duels にアクセスし、ワードリストを選択 — カリキュラム、ESLパック、またはウォームアップセット。' },
      { name: '生徒をペアリング', text: '2人の生徒が同じ文字グリッドを同時に探します。目標スコアに最初に到達した方が勝ち。' },
      { name: '見逃した単語を復習', text: 'ラウンド終了後、両プレイヤーは見逃したすべての単語を確認し、練習モードで復習できます。' },
    ],
    audience: '小学生、中学生、高校生; ESL/EFL学習者; 成人の語彙学習者。',
    educationalUse: ['語彙構築', 'スペリング練習', 'ESL練習', '教室活動'],
  },
  es: {
    name: 'Cómo organizar un duelo de vocabulario 1v1',
    description: 'Empareja estudiantes para duelos de vocabulario cara a cara. Gratis, sin registro, funciona en cualquier navegador.',
    steps: [
      { name: 'Abrir duelos de vocabulario', text: 'Ve a /education/duels y elige una lista de palabras — tu currículo, un paquete ESL o un calentamiento rápido.' },
      { name: 'Emparejar estudiantes', text: 'Dos estudiantes buscan en la misma cuadrícula de letras simultáneamente. El primero en llegar a la puntuación objetivo gana.' },
      { name: 'Revisar palabras perdidas', text: 'Al final de la ronda, ambos jugadores ven cada palabra que perdieron y pueden practicarla en modo práctica.' },
    ],
    audience: 'Estudiantes de primaria, secundaria y bachillerato; estudiantes ESL/EFL; adultos que construyen vocabulario.',
    educationalUse: ['Construcción de Vocabulario', 'Práctica de Ortografía', 'Práctica ESL', 'Actividad de Aula'],
  },
};

const CLASSROOM_CONTENT: Record<string, SubpageContent> = {
  en: {
    name: 'How to Run a Whole-Class Word Game',
    description: 'Live multiplayer word game for the whole class. Students join via a 4-digit code. No accounts required for students.',
    steps: [
      { name: 'Create a session', text: 'Click "Start classroom game". Pick a word list, time limit, and game mode (Boggle grid, Word Hunt, or Wheel).' },
      { name: 'Share the join code', text: 'Display the 4-digit code or QR on your projector. Students join from any phone or laptop browser — no login.' },
      { name: 'Play and review', text: 'Up to 30 students compete in real time. Live leaderboard shows who is ahead. After the round, the dashboard shows class accuracy and which words tripped the most students.' },
    ],
    audience: 'K-12 classrooms, ESL/EFL programs, after-school clubs, substitute-teacher activities.',
    educationalUse: ['Vocabulary Building', 'Whole-Class Activity', 'Formative Assessment', 'ESL Practice', 'Brain Break'],
  },
  he: {
    name: 'איך מריצים משחק מילים לכל הכיתה',
    description: 'משחק מילים רב-משתתפים בזמן אמת לכל הכיתה. תלמידים מצטרפים עם קוד בן 4 ספרות. ללא חשבונות לתלמידים.',
    steps: [
      { name: 'יצירת מפגש', text: 'לחצו "התחל משחק כיתה". בחרו רשימת מילים, מגבלת זמן ומצב משחק (לוח Boggle, ציד מילים או גלגל).' },
      { name: 'שיתוף קוד הצטרפות', text: 'הציגו את הקוד או QR על המקרן. תלמידים מצטרפים מכל דפדפן בנייד או מחשב — ללא התחברות.' },
      { name: 'משחקו וסקרו', text: 'עד 30 תלמידים מתחרים בזמן אמת. לוח מובילים חי. בסוף, לוח המחוונים מראה דיוק כיתתי ואילו מילים הכשילו הכי הרבה תלמידים.' },
    ],
    audience: 'כיתות יסודי-תיכון, תוכניות עברית כשפה שנייה, חוגי אחרי בית ספר, פעילויות מורה ממלא מקום.',
    educationalUse: ['בניית אוצר מילים', 'פעילות כיתתית', 'הערכה מעצבת', 'תרגול ESL', 'הפסקת מוח'],
  },
  sv: {
    name: 'Så kör du ett ordspel för hela klassen',
    description: 'Live multiplayer ordspel för hela klassen. Elever ansluter via en 4-siffrig kod. Inga konton krävs för elever.',
    steps: [
      { name: 'Skapa en session', text: 'Klicka på "Starta klassrumsspel". Välj en ordlista, tidsgräns och spelläge (Boggle-bräda, Ordjakt eller Hjul).' },
      { name: 'Dela anslutningskoden', text: 'Visa den 4-siffriga koden eller QR på projektorn. Elever ansluter från valfri telefon eller bärbar dator — ingen inloggning.' },
      { name: 'Spela och granska', text: 'Upp till 30 elever tävlar i realtid. Livetopplista. Efter rundan visar panelen klassens noggrannhet och vilka ord som lurade flest elever.' },
    ],
    audience: 'F-9-klasser, ESL/EFL-program, fritidsklubbar, vikarieaktiviteter.',
    educationalUse: ['Ordförrådsbyggande', 'Helklassaktivitet', 'Formativ bedömning', 'ESL-övning', 'Hjärnpaus'],
  },
  ja: {
    name: 'クラス全体のワードゲームの実施方法',
    description: 'クラス全体のリアルタイムマルチプレイヤーワードゲーム。生徒は4桁のコードで参加。アカウント不要。',
    steps: [
      { name: 'セッションを作成', text: '"教室ゲーム開始"をクリック。ワードリスト、制限時間、ゲームモード（Boggleグリッド、ワードハント、ホイール）を選択。' },
      { name: '参加コードを共有', text: 'プロジェクターに4桁コードまたはQRを表示。生徒は任意のスマホやノートパソコンのブラウザから参加 — ログイン不要。' },
      { name: 'プレイしてレビュー', text: '最大30人の生徒がリアルタイムで競争。ライブリーダーボード。ラウンド終了後、ダッシュボードがクラスの正確性と最も多くの生徒を引っかけた単語を表示。' },
    ],
    audience: '小中高の教室、ESL/EFLプログラム、放課後クラブ、代理教師活動。',
    educationalUse: ['語彙構築', 'クラス全体活動', '形成的評価', 'ESL練習', '頭の休憩'],
  },
  es: {
    name: 'Cómo organizar un juego de palabras para toda la clase',
    description: 'Juego de palabras multijugador en vivo para toda la clase. Los estudiantes se unen con un código de 4 dígitos. Sin cuentas para estudiantes.',
    steps: [
      { name: 'Crear una sesión', text: 'Haz clic en "Iniciar juego de aula". Elige una lista de palabras, límite de tiempo y modo de juego (cuadrícula Boggle, Búsqueda de Palabras o Rueda).' },
      { name: 'Comparte el código', text: 'Muestra el código de 4 dígitos o QR en el proyector. Los estudiantes se unen desde cualquier navegador móvil o portátil — sin inicio de sesión.' },
      { name: 'Juega y revisa', text: 'Hasta 30 estudiantes compiten en tiempo real. Tabla de clasificación en vivo. Al final, el panel muestra la precisión de la clase y qué palabras hicieron tropezar a más estudiantes.' },
    ],
    audience: 'Aulas K-12, programas ESL/EFL, clubes extraescolares, actividades de profesor sustituto.',
    educationalUse: ['Construcción de Vocabulario', 'Actividad de Toda la Clase', 'Evaluación Formativa', 'Práctica ESL', 'Descanso Mental'],
  },
};

function buildHowTo(key: SubpageKey, locale: string, urlPath: string) {
  const lang = safeLocale(locale);
  const content = key === 'duels' ? DUELS_CONTENT[lang] : CLASSROOM_CONTENT[lang];
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo' as const,
    '@id': `${BASE_URL}/${lang}${urlPath}#howto`,
    name: content.name,
    description: content.description,
    inLanguage: lang,
    totalTime: 'PT3M',
    step: content.steps.map((s, i) => ({
      '@type': 'HowToStep' as const,
      position: i + 1,
      name: s.name,
      text: s.text,
    })),
  };
}

function buildLearningResource(key: SubpageKey, locale: string, urlPath: string) {
  const lang = safeLocale(locale);
  const content = key === 'duels' ? DUELS_CONTENT[lang] : CLASSROOM_CONTENT[lang];
  return {
    '@context': 'https://schema.org',
    '@type': 'LearningResource' as const,
    '@id': `${BASE_URL}/${lang}${urlPath}#resource`,
    name: content.name,
    description: content.description,
    url: `${BASE_URL}/${lang}${urlPath}`,
    inLanguage: lang,
    learningResourceType: key === 'duels' ? 'Game' : 'Activity',
    educationalUse: content.educationalUse,
    educationalLevel: ['Primary', 'Secondary', 'Adult Education'],
    typicalAgeRange: '8-99',
    isAccessibleForFree: true,
    teaches: 'Vocabulary, spelling, word recognition, contextual word usage',
    audience: {
      '@type': 'EducationalAudience',
      educationalRole: 'student',
      audienceType: content.audience,
    },
    provider: {
      '@type': 'EducationalOrganization' as const,
      '@id': `${BASE_URL}/${lang}/education#org`,
      name: 'LexiClash Education',
      url: `${BASE_URL}/${lang}/education`,
    },
  };
}

function buildBreadcrumb(key: SubpageKey, locale: string) {
  const lang = safeLocale(locale);
  const slug = key === 'duels' ? 'duels' : 'classroom-game';
  const leafName = key === 'duels' ? 'Vocabulary Duels' : 'Classroom Game';
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList' as const,
    itemListElement: [
      { '@type': 'ListItem' as const, position: 1, name: 'Home', item: `${BASE_URL}/${lang}` },
      { '@type': 'ListItem' as const, position: 2, name: 'Education', item: `${BASE_URL}/${lang}/education` },
      { '@type': 'ListItem' as const, position: 3, name: leafName, item: `${BASE_URL}/${lang}/education/${slug}` },
    ],
  };
}

export function buildEducationDuelsJsonLd(locale: string) {
  return {
    howTo: buildHowTo('duels', locale, '/education/duels'),
    resource: buildLearningResource('duels', locale, '/education/duels'),
    breadcrumb: buildBreadcrumb('duels', locale),
  };
}

export function buildEducationClassroomJsonLd(locale: string) {
  return {
    howTo: buildHowTo('classroomGame', locale, '/education/classroom-game'),
    resource: buildLearningResource('classroomGame', locale, '/education/classroom-game'),
    breadcrumb: buildBreadcrumb('classroomGame', locale),
  };
}

export function getEducationSubpageContent(key: SubpageKey, locale: string) {
  const lang = safeLocale(locale);
  return key === 'duels' ? DUELS_CONTENT[lang] : CLASSROOM_CONTENT[lang];
}
