export type LocaleContent = {
  metaTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  twitterDescription: string;
  heroTag: string;
  heroH1: { highlight: string; rest1: string; rest2: string };
  heroSubtitle: string;
  ctaLabel: string;
  faqTitle: string;
  faqs: Array<{ q: string; a: string }>;
};

export const EDUCATION_LOCALES = ['en', 'he', 'es', 'sv', 'ja'] as const;
export type EducationLocale = typeof EDUCATION_LOCALES[number];

const content: Record<EducationLocale, LocaleContent> = {
  en: {
    metaTitle: 'Free ESL Word Games for the Classroom — Live Multiplayer, 5 Languages | LexiClash',
    metaDescription: 'Free ESL word games for the classroom. Live multiplayer word search, 1v1 vocabulary duels, custom word lists. Supports English, Spanish, Hebrew, Swedish, and Japanese — ideal for bilingual programs. Runs in any browser.',
    ogTitle: 'Free ESL Word Games for English Learners',
    ogDescription: 'Live multiplayer word games for the classroom. Free student accounts, 5 dictionaries, teacher dashboard.',
    twitterDescription: 'Free ESL/EFL word games for the classroom. Live multiplayer, 5 languages, teacher dashboard.',
    heroTag: '★ ESL / EFL ★ Free Forever ★',
    heroH1: {
      highlight: 'ESL',
      rest1: 'Word Games.',
      rest2: 'Online. Free.',
    },
    heroSubtitle: 'Word-formation games designed for English language learners. Free student accounts, five dictionaries, and a teacher dashboard that surfaces which words tripped which students.',
    ctaLabel: 'Create Free Classroom',
    faqTitle: 'Frequently Asked Questions',
    faqs: [
      {
        q: 'What are the best free ESL word games?',
        a: 'LexiClash offers live multiplayer word-formation games: Boggle-style rapid spelling, Word Wheel vocabulary challenges, and Word Hunt target-finding. All games are played in real-time against classmates or the AI, making vocabulary learning competitive and engaging.',
      },
      {
        q: 'Do students need an account to play?',
        a: 'Yes, student accounts are required but always free. Teachers set up a classroom, and students join with a simple code. No payment needed, ever.',
      },
      {
        q: 'How do word games help English language learners?',
        a: 'Word games reinforce spelling, vocabulary recognition, and rapid recall under pressure—skills that transfer directly to fluency. Multiplayer competition increases engagement and retention, especially for teens.',
      },
      {
        q: 'Can I scaffold games for different proficiency levels?',
        a: 'Yes. Teachers can upload custom word lists (A0–C2) and assign games by level. Classroom dashboard shows which words tripped which students, surfacing gaps.',
      },
      {
        q: 'Does LexiClash support adult ESL/EFL?',
        a: 'Absolutely. Adult learners and university ESL/EFL programs use LexiClash for conversation-starter icebreakers and vocabulary retention activities.',
      },
      {
        q: 'Can I use LexiClash in a bilingual program?',
        a: 'Yes. LexiClash supports English, Spanish, Hebrew, Swedish, and Japanese dictionaries. Perfect for immersion and transition classrooms.',
      },
    ],
  },
  he: {
    metaTitle: 'משחקי מילים חינמיים לשפה אנגלית — ליחידים ובכיתה | LexiClash',
    metaDescription: 'משחקי אנגלית מרובי שחקנים בחיים ישירים, בחינם לכיתה. חשבון תלמיד חינמי, 5 מילונות, דשבורד מורה. תומך אנגלית, עברית, ספרדית, שוודית ויפנית.',
    ogTitle: 'משחקי מילים חינמיים לתלמידי אנגלית',
    ogDescription: 'משחקי מילים בחיים ישירים לכיתה. חשבון חינמי, 5 מילונות, דשבורד למורים.',
    twitterDescription: 'משחקי אנגלית מרובי שחקנים בכיתה, בחינם לתלמידים.',
    heroTag: '★ אנגלית כשפה זרה ★ חינם לצמיתות ★',
    heroH1: {
      highlight: 'אנגלית',
      rest1: 'משחקי מילים.',
      rest2: 'באינטרנט. בחינם.',
    },
    heroSubtitle: 'משחקי היווצרות מילים לתלמידי אנגלית. חשבונות תלמיד חינמיים, חמישה מילונות, ודשבורד מורה המציג איזה מילים קשות לתלמידים.',
    ctaLabel: 'צור כיתה חינמית',
    faqTitle: 'שאלות נפוצות',
    faqs: [
      {
        q: 'מה הם המשחקים החינמיים הטובים ביותר לתלמידי אנגלית?',
        a: 'LexiClash מציע משחקי היווצרות מילים בחיים ישירים: Boggle במהירות, Word Wheel לאוצר מילים, ו-Word Hunt חיפוש מטרה. כל המשחקים משוחקים בזמן אמת נגד חברי כיתה או בינה מלאכותית, מה שהופך את לימוד אוצר המילים לתחרותי ומעניין.',
      },
      {
        q: 'האם תלמידים צריכים חשבון?',
        a: 'כן, חשבון תלמיד נדרש אך תמיד חינמי. מורים יוצרים כיתה ותלמידים מצטרפים עם קוד פשוט. לא נדרש תשלום, אף פעם.',
      },
      {
        q: 'איך משחקי מילים עוזרים לתלמידי אנגלית?',
        a: 'משחקי מילים מחזקים איתור אותיות, הכרת אוצר מילים, והיזכרות מהירה תחת לחץ—מיומנויות שמעבירות ישירות לשטף דיבור. תחרות בין שחקנים מגבירה עניין והשתמרות, במיוחד לנערים.',
      },
      {
        q: 'האם אני יכול להתאים משחקים לרמות שפה שונות?',
        a: 'כן. מורים יכולים להעלות רשימות מילים מותאמות (A0–C2) ולהקצות משחקים לפי רמה. דשבורד הכיתה מראה איזה מילים קשות לתלמידים.',
      },
      {
        q: 'האם LexiClash תומך בתלמידים בוגרים?',
        a: 'בהחלט. תלמידים בוגרים ותוכניות אנגלית באוניברסיטאות משתמשים ב-LexiClash כדי לשתף משחקים וחוקי אוצר מילים.',
      },
      {
        q: 'האם אני יכול להשתמש ב-LexiClash בתוכנית דו-לשונית?',
        a: 'כן. LexiClash תומך בעברית, אנגלית, ספרדית, שוודית ויפנית. מושלם לכיתות טבילה והעברה.',
      },
    ],
  },
  es: {
    metaTitle: 'Juegos de Palabras Gratis en Inglés para la Clase — Multijugador en Vivo, 5 Idiomas | LexiClash',
    metaDescription: 'Juegos de inglés para EFL/ESL en el aula. Múltiples juegos en vivo, duelos de vocabulario 1v1, listas de palabras personalizadas. Soporta inglés, español, hebreo, sueco y japonés—ideal para programas bilingües. Funciona en cualquier navegador.',
    ogTitle: 'Juegos de Palabras Gratis para Estudiantes de Inglés',
    ogDescription: 'Juegos de palabras multijugador en vivo para el aula. Cuentas gratis para estudiantes, 5 diccionarios, panel de control del maestro.',
    twitterDescription: 'Juegos de inglés EFL/ESL multijugador gratis para la clase.',
    heroTag: '★ EFL / ESL ★ Gratis Para Siempre ★',
    heroH1: {
      highlight: 'Inglés',
      rest1: 'Juegos de Palabras.',
      rest2: 'En Línea. Gratis.',
    },
    heroSubtitle: 'Juegos de formación de palabras diseñados para estudiantes de inglés. Cuentas gratis para estudiantes, cinco diccionarios y un panel de control del maestro que muestra qué palabras resultaron difíciles para cada estudiante.',
    ctaLabel: 'Crear Aula Gratis',
    faqTitle: 'Preguntas Frecuentes',
    faqs: [
      {
        q: '¿Cuáles son los mejores juegos de palabras gratuitos para EFL/ESL?',
        a: 'LexiClash ofrece juegos de formación de palabras multijugador en vivo: Boggle rápido, desafíos de vocabulario con Word Wheel y búsqueda de objetivos con Word Hunt. Todos los juegos se juegan en tiempo real contra compañeros de clase o IA, haciendo que el aprendizaje de vocabulario sea competitivo y atractivo.',
      },
      {
        q: '¿Los estudiantes necesitan una cuenta?',
        a: 'Sí, se requiere una cuenta de estudiante pero siempre es gratis. Los maestros crean un aula y los estudiantes se unen con un código simple. Sin pago, nunca.',
      },
      {
        q: '¿Cómo ayudan los juegos de palabras a los estudiantes de inglés?',
        a: 'Los juegos de palabras refuerzan ortografía, reconocimiento de vocabulario y recuperación rápida bajo presión—habilidades que se transfieren directamente a la fluidez. La competencia multijugador aumenta el interés y la retención, especialmente para adolescentes.',
      },
      {
        q: '¿Puedo diferenciar juegos por nivel de dominio?',
        a: 'Sí. Los maestros pueden cargar listas de palabras personalizadas (A0–C2) y asignar juegos por nivel. El panel de control del aula muestra qué palabras resultaron difíciles para cada estudiante.',
      },
      {
        q: '¿LexiClash soporta aprendices adultos de EFL/ESL?',
        a: 'Absolutamente. Aprendices adultos y programas universitarios de ESL/EFL usan LexiClash para rompehielos y actividades de retención de vocabulario.',
      },
      {
        q: '¿Puedo usar LexiClash en un programa bilingüe?',
        a: 'Sí. LexiClash soporta diccionarios en inglés, español, hebreo, sueco y japonés. Perfecto para aulas de inmersión y transición.',
      },
    ],
  },
  sv: {
    metaTitle: 'Gratis Engelskaspel för Klassrummet — Flerspelar i Realtid, 5 Språk | LexiClash',
    metaDescription: 'Gratis engelskaspel för EFL-undervisning i klassrummet. Direkta flerspelarspel, 1v1 vokabulärdueller, anpassade ordlistor. Stöder engelska, spanska, hebreiska, svenska och japanska—idealiskt för tvåspråkiga program. Körs i vilken webbläsare som helst.',
    ogTitle: 'Gratis Engelskaspel för Språkelever',
    ogDescription: 'Flerspelarordspel i realtid för klassrummet. Gratis elevkonton, 5 ordböcker, lärarpanel.',
    twitterDescription: 'Gratis flerspelar-engelskaspel för klassrummet.',
    heroTag: '★ Engelska som Andraspråk ★ Alltid Gratis ★',
    heroH1: {
      highlight: 'Engelska',
      rest1: 'Ordspel.',
      rest2: 'Online. Gratis.',
    },
    heroSubtitle: 'Ordbildningsspel utformade för engelskastudenter. Gratis elevkonton, fem ordböcker och en lärarpanel som visar vilka ord som var svåra för vilka elever.',
    ctaLabel: 'Skapa Gratis Klassrum',
    faqTitle: 'Vanliga Frågor',
    faqs: [
      {
        q: 'Vilka är de bästa kostnadsfria engelskaspelen?',
        a: 'LexiClash erbjuder flerspelar-ordbildningsspel i realtid: snabb Boggle, Word Wheel-vokabulärutmaningar och Word Hunt målletning. Alla spel spelas i realtid mot klasskompisar eller AI, vilket gör ordförrådsundervisning konkurrenskraftig och engagerande.',
      },
      {
        q: 'Behöver elever ett konto?',
        a: 'Ja, ett elevkonto är obligatoriskt men alltid gratis. Lärare skapar ett klassrum och elever ansluter med en enkel kod. Ingen betalning behövs, aldrig.',
      },
      {
        q: 'Hur hjälper ordspel engelskastudenter?',
        a: 'Ordspel förstärker stavning, ordförrådsigenkänning och snabb återkallelse under tryck—färdigheter som direkt överförs till flytande tal. Flerspelarkonkurrens ökar engagemang och retention, speciellt för tonåringar.',
      },
      {
        q: 'Kan jag anpassa spel för olika språknivåer?',
        a: 'Ja. Lärare kan ladda upp anpassade ordlistor (A0–C2) och tilldela spel efter nivå. Klassrumspanelen visar vilka ord som var svåra för eleverna.',
      },
      {
        q: 'Stöder LexiClash vuxna engelskastudenter?',
        a: 'Absolut. Vuxna elever och universitetsprogram för engelska som andraspråk använder LexiClash för ismältningstips och ordförrådsuppgifter.',
      },
      {
        q: 'Kan jag använda LexiClash i ett tvåspråkigt program?',
        a: 'Ja. LexiClash stöder engelsk, spansk, hebreisk, svensk och japansk ordbok. Perfekt för immersions- och övergångsklassrum.',
      },
    ],
  },
  ja: {
    metaTitle: '無料英語学習ゲーム - 教室向けリアルタイムマルチプレイヤー、5言語対応 | LexiClash',
    metaDescription: '教室向けの無料英語学習ゲーム。リアルタイムマルチプレイヤーゲーム、1v1語彙デュエル、カスタム単語リスト対応。英語、スペイン語、ヘブライ語、スウェーデン語、日本語に対応—二言語教育プログラムに最適。すべてのブラウザで実行可能。',
    ogTitle: '無料英語学習ゲーム',
    ogDescription: '教室向けマルチプレイヤー単語ゲーム。無料学生アカウント、5つの辞書、教師向けダッシュボード。',
    twitterDescription: '教室向け無料マルチプレイヤー英語ゲーム。',
    heroTag: '★ 英語学習 ★ 永遠に無料 ★',
    heroH1: {
      highlight: '英語',
      rest1: 'ゲーム。',
      rest2: 'オンライン。無料。',
    },
    heroSubtitle: '英語学習者向けの単語形成ゲーム。無料の学生アカウント、5つの辞書、生徒がどの単語で躓いたかを表示する教師ダッシュボード付き。',
    ctaLabel: '無料クラスルームを作成',
    faqTitle: 'よくある質問',
    faqs: [
      {
        q: '最高の無料英語学習ゲームは何ですか?',
        a: 'LexiClashは、リアルタイムマルチプレイヤー単語形成ゲームを提供します：高速Boggle、Word Wheel語彙チャレンジ、Word Hunt目標探し。すべてのゲームはクラスメートやAIとのリアルタイム対戦でプレイされるため、語彙学習が競争的で魅力的になります。',
      },
      {
        q: '学生はアカウントが必要ですか?',
        a: 'はい、学生アカウントが必要ですが、常に無料です。教師がクラスルームを作成し、学生は簡単なコードで参加します。支払いは不要です。',
      },
      {
        q: '単語ゲームはどのように英語学習を支援しますか?',
        a: '単語ゲームは、スペル、語彙認識、プレッシャー下での迅速な想起を強化します—これらのスキルは流暢性に直結します。マルチプレイヤー競争はエンゲージメントと習得を高め、特に十代の若者にとって効果的です。',
      },
      {
        q: 'さまざまな言語レベル向けにゲームをカスタマイズできますか?',
        a: 'はい。教師はカスタム単語リスト（A0–C2）をアップロードし、レベルごとにゲームを割り当てることができます。クラスルームダッシュボードは、どの単語が学生を困らせたかを表示します。',
      },
      {
        q: 'LexiClashは大人の英語学習者に対応していますか?',
        a: 'はい。成人学習者と大学の英語プログラムは、アイスブレーカーと語彙保持活動にLexiClashを使用しています。',
      },
      {
        q: 'バイリンガルプログラムでLexiClashを使用できますか?',
        a: 'はい。LexiClashは英語、スペイン語、ヘブライ語、スウェーデン語、日本語の辞書に対応しています。イマージョンと移行クラスルームに最適です。',
      },
    ],
  },
};

export function getEslWordGamesContent(locale: string): LocaleContent {
  const normalized = locale.toLowerCase();

  if (normalized === 'he') return content.he;
  if (normalized === 'es') return content.es;
  if (normalized === 'sv') return content.sv;
  if (normalized === 'ja') return content.ja;

  return content.en;
}
