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
  features: Array<{ icon: string; text: string }>;
  proficiencyLevels: Array<{ tag: string; title: string; desc: string }>;
  sections: {
    builtFor: string;
    scaleToCefr: string;
    ctaHeading: string;
    ctaSubtitle: string;
    ctaPrimaryButtonLabel: string;
    ctaSecondaryButtonLabel: string;
  };
};

export const EDUCATION_LOCALES = ['en', 'he', 'es', 'sv', 'ja', 'ru'] as const;
export type EducationLocale = typeof EDUCATION_LOCALES[number];

const content: Record<EducationLocale, LocaleContent> = {
  en: {
    metaTitle: 'ESL Vocabulary Games Online — Free CEFR-Leveled Practice for English Learners | LexiClash',
    metaDescription: 'Free ESL vocabulary games online, scaled by CEFR level (A1–C2) for English learners. Build spelling, phonics, and vocabulary with live multiplayer competition and a teacher dashboard — no app, no per-student fees.',
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
    features: [
      { icon: '🌍', text: 'Five built-in dictionaries: English, Spanish, Hebrew (RTL), Swedish, Japanese' },
      { icon: '⚡', text: 'Free student accounts — quick one-time setup, then tracks progress forever' },
      { icon: '👥', text: 'Live multiplayer up to 30 students; pair-up duels for 2-by-2 practice' },
      { icon: '📈', text: 'Per-student accuracy + class-wide missed-word patterns' },
      { icon: '🎯', text: 'Three game modes: Boggle grid, Word Hunt, Word Wheel' },
      { icon: '📱', text: 'Works on any phone, tablet, Chromebook, or laptop browser' },
      { icon: '⏱️', text: '5-minute warm-up format fits any lesson plan' },
      { icon: '💸', text: 'Free to play — no per-seat fee, no student logins' },
    ],
    proficiencyLevels: [
      { tag: 'A1-A2', title: 'Beginner', desc: '3-4 letter words, longer timer, sight-word focus. Use the Word Wheel mode for guided practice.' },
      { tag: 'B1-B2', title: 'Intermediate', desc: 'Mixed lengths, standard timer. Boggle grid surfaces vocabulary patterns and prefixes.' },
      { tag: 'C1-C2', title: 'Advanced', desc: 'Long words, tight timer, custom advanced lists (TOEFL, IELTS, academic vocab).' },
    ],
    sections: {
      builtFor: 'Built for English learners.',
      scaleToCefr: 'Scale to CEFR level.',
      ctaHeading: 'Five minutes left?',
      ctaSubtitle: 'Run a vocab round.',
      ctaPrimaryButtonLabel: '▶ Start ESL Game',
      ctaSecondaryButtonLabel: 'See Classroom Games',
    },
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
    metaTitle: 'משחקי אנגלית חינמיים — מרובי משתתפים, בכיתה ולבד | LexiClash',
    metaDescription: 'משחקי אנגלית בזמן אמת, בחינם לכיתה. חשבונות תלמידים חינמיים, 5 מילונים, לוח מורה. אנגלית, עברית, ספרדית, שוודית, יפנית.',
    ogTitle: 'משחקי אנגלית חינמיים',
    ogDescription: 'משחקי אנגלית בזמן אמת. חשבונות חינמיים, 5 מילונים, לוח מורה.',
    twitterDescription: 'משחקי אנגלית מרובי משתתפים לכיתה, בחינם.',
    heroTag: '★ אנגלית כשפה זרה ★ חינם לתמיד ★',
    heroH1: {
      highlight: 'אנגלית',
      rest1: 'משחקי מילים.',
      rest2: 'אונליין. בחינם.',
    },
    heroSubtitle: 'משחקי בניית מילים לתלמידי אנגלית. חשבונות חינמיים, 5 מילונים, ולוח מורה שמראה אילו מילים קשות.',
    ctaLabel: 'פתחו כיתה בחינם',
    faqTitle: 'שאלות נפוצות',
    features: [
      { icon: '🌍', text: '5 מילונים: אנגלית, ספרדית, עברית (RTL), שוודית, יפנית' },
      { icon: '⚡', text: 'חשבונות חינמיים — הגדרה מהירה, ואז מעקב התקדמות' },
      { icon: '👥', text: 'ריבוי משתתפים חי — עד 30 תלמידים; דו־קרבות בזוגות' },
      { icon: '📈', text: 'דיוק לכל תלמיד + מילים קשות לכל הכיתה' },
      { icon: '🎯', text: '3 משחקים: Boggle, Word Hunt, Word Wheel' },
      { icon: '📱', text: 'טלפון, טאבלט, Chromebook, כל דפדפן' },
      { icon: '⏱️', text: 'חימום של 5 דקות — לכל תוכנית שיעור' },
      { icon: '💸', text: 'חינם לשחק — בלי עלות לכל תלמיד, בלי חשבונות' },
    ],
    proficiencyLevels: [
      { tag: 'A1-A2', title: 'מתחילים', desc: 'מילים קצרות, טיימר ארוך, מילים נפוצות. Word Wheel לתרגול מודרך.' },
      { tag: 'B1-B2', title: 'בינוניים', desc: 'אורכים שונים, טיימר רגיל. Boggle חושף דפוסים וקידומות.' },
      { tag: 'C1-C2', title: 'מתקדמים', desc: 'מילים ארוכות, טיימר הדוק, רשימות מתקדמות (TOEFL, IELTS).' },
    ],
    sections: {
      builtFor: 'בנוי לתלמידי אנגלית.',
      scaleToCefr: 'מתאים לכל רמת CEFR.',
      ctaHeading: 'נשארו לכם חמש דקות?',
      ctaSubtitle: 'הפעילו סבב אוצר מילים.',
      ctaPrimaryButtonLabel: '▶ התחילו משחק אנגלית',
      ctaSecondaryButtonLabel: 'לכל משחקי הכיתה',
    },
    faqs: [
      {
        q: 'מהם משחקי המילים הטובים ביותר לתלמידי אנגלית?',
        a: 'LexiClash מציע משחקי בניית מילים בזמן אמת: Boggle מהיר, Word Wheel לאוצר מילים, ו-Word Hunt לחיפוש. כל משחק רץ בזמן אמת מול חברים או מול המחשב — תחרותי ומסקרן.',
      },
      {
        q: 'האם תלמידים צריכים חשבון?',
        a: 'כן, צריך חשבון — אבל הוא תמיד חינמי. המורה פותח כיתה, התלמידים נכנסים עם קוד. אפס עלות.',
      },
      {
        q: 'איך משחקי מילים עוזרים בלימוד?',
        a: 'משחקים מחזקים איות, זיכרון מילים ומהירות תחת לחץ — וכל אלה הופכים בהמשך לשטף בדיבור. התחרות מגבירה את העניין, במיוחד אצל בני נוער.',
      },
      {
        q: 'אפשר להתאים לרמות אחרות?',
        a: 'כן. מעלים רשימות (A0–C2) ומשייכים אותן לפי רמה. לוח המורה מראה אילו מילים יוצאות קשות.',
      },
      {
        q: 'מתאים גם ללומדים מבוגרים?',
        a: 'בהחלט. גם לומדים מבוגרים ותוכניות אקדמיות משתמשים ב-LexiClash לתרגול מילים ומשחק.',
      },
      {
        q: 'אפשר להשתמש בתוכנית דו-לשונית?',
        a: 'כן. LexiClash תומך בעברית, אנגלית, ספרדית, שוודית ויפנית. מושלם לכיתות הטמעת שפה ולכיתות מעבר.',
      },
    ],
  },
  es: {
    metaTitle: 'Juegos para Aprender Inglés Gratis Online — ESL | LexiClash',
    metaDescription: 'Aprende inglés con juegos en vivo: vocabulario, ortografía, lectura. Gratis para estudiantes. Sala en 10 seg, sin descarga, 5 idiomas.',
    ogTitle: 'Juegos de Inglés Gratis',
    ogDescription: 'Juegos de palabras en vivo para estudiantes de inglés. Cuentas gratis, 5 diccionarios, panel de maestro.',
    twitterDescription: 'Juegos de inglés multijugador gratis para la clase.',
    heroTag: '★ Inglés ESL/EFL ★ Gratis Siempre ★',
    heroH1: {
      highlight: 'Inglés',
      rest1: 'Juegos de Palabras.',
      rest2: 'Online. Gratis.',
    },
    heroSubtitle: 'Juegos para aprender inglés. Cuentas gratis, 5 diccionarios, panel del maestro que muestra qué palabras les cuestan.',
    ctaLabel: 'Crear Aula Gratis',
    faqTitle: 'Preguntas Frecuentes',
    features: [
      { icon: '🌍', text: '5 diccionarios: inglés, español, hebreo (RTL), sueco, japonés' },
      { icon: '⚡', text: 'Cuentas gratis — solo una vez, luego sigue el progreso' },
      { icon: '👥', text: 'Multijugador — hasta 30 estudiantes; duelos de parejas' },
      { icon: '📈', text: 'Precisión por alumno + palabras difíciles de la clase' },
      { icon: '🎯', text: '3 juegos: Boggle, Word Hunt, Word Wheel' },
      { icon: '📱', text: 'Teléfono, tableta, Chromebook, cualquier navegador' },
      { icon: '⏱️', text: 'Calentamiento de 5 minutos — cualquier plan' },
      { icon: '💸', text: 'Gratis para jugar — sin cargo por alumno, sin cuentas' },
    ],
    proficiencyLevels: [
      { tag: 'A1-A2', title: 'Principiante', desc: 'Palabras cortas, tiempo largo, palabras de vista. Word Wheel para práctica guiada.' },
      { tag: 'B1-B2', title: 'Intermedio', desc: 'Palabras variadas, tiempo normal. Boggle muestra patrones y prefijos.' },
      { tag: 'C1-C2', title: 'Avanzado', desc: 'Palabras largas, tiempo corto, listas avanzadas (TOEFL, IELTS).' },
    ],
    sections: {
      builtFor: 'Construido para estudiantes de inglés.',
      scaleToCefr: 'Escala al nivel CEFR.',
      ctaHeading: '¿Cinco minutos restantes?',
      ctaSubtitle: 'Ejecuta una ronda de vocabulario.',
      ctaPrimaryButtonLabel: '▶ Iniciar juego de inglés',
      ctaSecondaryButtonLabel: 'Ver juegos de clase',
    },
    faqs: [
      {
        q: '¿Cuáles son los mejores juegos para ESL/EFL?',
        a: 'LexiClash ofrece juegos en vivo: Boggle rápido, Word Wheel para vocabulario, Word Hunt para búsqueda. Todos en tiempo real contra compañeros o IA — competitivo y divertido.',
      },
      {
        q: '¿Necesitan cuenta?',
        a: 'Sí, pero es gratis. Los maestros crean el aula, estudiantes entran con código. Sin pago.',
      },
      {
        q: '¿Cómo ayudan los juegos?',
        a: 'Refuerzan ortografía, vocabulario, velocidad bajo presión — todo suma a fluidez. La competencia multiplayer engancha, especialmente con adolescentes.',
      },
      {
        q: '¿Puedo diferenciar por nivel?',
        a: 'Sí. Sube listas (A0–C2) y asigna por nivel. El panel muestra qué palabras cuestan trabajo.',
      },
      {
        q: '¿Funciona para adultos?',
        a: 'Sí. Adultos y programas universitarios usan LexiClash para rompehielos y retención.',
      },
      {
        q: '¿En programas bilingües?',
        a: 'Sí. 5 diccionarios: inglés, español, hebreo, sueco, japonés. Perfecto para inmersión.',
      },
    ],
  },
  sv: {
    metaTitle: 'Gratis Engelskaspel — Flerspelar, 5 Språk | LexiClash',
    metaDescription: 'Gratis engelskaspel för klassrummet. Flerspelarspel, 1v1 dueller, dina ordlistor. Engelska, spanska, hebreiska, svenska, japanska. Gratis konton. Vilken webbläsare som helst.',
    ogTitle: 'Gratis Engelskaspel',
    ogDescription: 'Flerspelarordspel i realtid för elever. Gratis konton, 5 ordböcker, lärarpanel.',
    twitterDescription: 'Gratis flerspelarengelskaspel för klassrummet.',
    heroTag: '★ Engelska som Andraspråk ★ Gratis Alltid ★',
    heroH1: {
      highlight: 'Engelska',
      rest1: 'Ordspel.',
      rest2: 'Online. Gratis.',
    },
    heroSubtitle: 'Ordbildningsspel för engelskastudenter. Gratis konton, 5 ordböcker, lärarpanel som visar vilka ord som är svåra.',
    ctaLabel: 'Skapa Gratis Klassrum',
    faqTitle: 'Vanliga Frågor',
    features: [
      { icon: '🌍', text: '5 ordböcker: engelska, spanska, hebreiska (RTL), svenska, japanska' },
      { icon: '⚡', text: 'Gratis konton — snabb setup, sedan förlopp för alltid' },
      { icon: '👥', text: 'Flerspelar — upp till 30 elever; pardueller' },
      { icon: '📈', text: 'Noggrannhet per elev + klassens svåra ord' },
      { icon: '🎯', text: '3 spel: Boggle, Word Hunt, Word Wheel' },
      { icon: '📱', text: 'Telefon, surfplatta, Chromebook, vilken webbläsare som helst' },
      { icon: '⏱️', text: 'Uppvärmning på 5 minuter — vilken lektion som helst' },
      { icon: '💸', text: 'Gratis att spela — ingen avgift per elev, inga konton' },
    ],
    proficiencyLevels: [
      { tag: 'A1-A2', title: 'Nybörjare', desc: 'Korta ord, längre timer, sight-ord. Word Wheel för guidad övning.' },
      { tag: 'B1-B2', title: 'Mellanliggande', desc: 'Blandade längder, standard timer. Boggle visar mönster och prefix.' },
      { tag: 'C1-C2', title: 'Avancerad', desc: 'Långa ord, snabb timer, avancerade listor (TOEFL, IELTS).' },
    ],
    sections: {
      builtFor: 'Byggt för engelskastudenter.',
      scaleToCefr: 'Skala till CEFR-nivå.',
      ctaHeading: 'Fem minuter kvar?',
      ctaSubtitle: 'Kör en ordförrådsmöte.',
      ctaPrimaryButtonLabel: '▶ Starta engelskaspel',
      ctaSecondaryButtonLabel: 'Se klassrumsspel',
    },
    faqs: [
      {
        q: 'Vilka är de bästa gratis engelskaspelen?',
        a: 'LexiClash erbjuder ordbildning i realtid: snabb Boggle, Word Wheel för ordförråd, Word Hunt för måljakt. Mot kompisar eller AI — konkurrenskraftig och rolig.',
      },
      {
        q: 'Måste elever ha konto?',
        a: 'Ja, men det är gratis. Lärare gör klassrummet, elever ansluter med kod. Ingen betalning.',
      },
      {
        q: 'Hur hjälper ordspel?',
        a: 'Stärker stavning, ordförråd, snabbhet under tryck — allt som hjälper till flyt. Flerspelar engagerar, speciellt tonåringar.',
      },
      {
        q: 'Kan jag anpassa för olika nivåer?',
        a: 'Ja. Ladda upp listor (A0–C2) och tilldela per nivå. Panelen visar vilka ord som är svåra.',
      },
      {
        q: 'Fungerar för vuxna?',
        a: 'Absolut. Vuxna och universitet använder LexiClash för ordförrådsuppgifter.',
      },
      {
        q: 'Tvåspråkiga program?',
        a: 'Ja. 5 ordböcker. Perfekt för immersion och övergång.',
      },
    ],
  },
  ja: {
    metaTitle: '無料英語ゲーム — マルチプレイヤー、5言語 | LexiClash',
    metaDescription: '教室向け無料英語ゲーム。リアルタイムマルチプレイヤー、1v1、自分のリスト。英語、スペイン語、ヘブライ語、スウェーデン語、日本語。どのブラウザでも。',
    ogTitle: '無料英語学習ゲーム',
    ogDescription: '英語学習者向けマルチプレイヤーゲーム。無料、5つの辞書、先生用ダッシュボード。',
    twitterDescription: '教室向け無料マルチプレイヤー英語ゲーム。',
    heroTag: '★ 英語学習 ★ ずっと無料 ★',
    heroH1: {
      highlight: '英語',
      rest1: 'ゲーム。',
      rest2: 'オンライン。無料。',
    },
    heroSubtitle: '英語学習者向けのゲーム。無料アカウント、5つの辞書、先生用ダッシュボードで苦手な単語がわかる。',
    ctaLabel: '無料クラスルームを作成',
    faqTitle: 'よくある質問',
    features: [
      { icon: '🌍', text: '5つの辞書：英語、スペイン語、ヘブライ語（RTL）、スウェーデン語、日本語' },
      { icon: '⚡', text: '無料。快速セットアップで、あとはずっと成績記録。' },
      { icon: '👥', text: 'マルチプレイヤー — 最大30人; ペアデュエル' },
      { icon: '📈', text: '生徒ごとの正確さ + クラスの苦手単語' },
      { icon: '🎯', text: '3つのゲーム：Boggle、Word Hunt、Word Wheel' },
      { icon: '📱', text: 'スマホ、タブレット、Chromebook、どのブラウザでも' },
      { icon: '⏱️', text: '5分ウォームアップ — どの授業でも合う' },
      { icon: '💸', text: '無料でプレイ — 生徒ごとの料金なし、アカウント不要' },
    ],
    proficiencyLevels: [
      { tag: 'A1-A2', title: '初級', desc: '短い単語、長いタイマー、sight-word。Word Wheel でガイド付き。' },
      { tag: 'B1-B2', title: '中級', desc: 'いろいろな長さ、標準タイマー。Boggle で パターン・接頭辞を表示。' },
      { tag: 'C1-C2', title: '上級', desc: '長い単語、短いタイマー、高度なリスト（TOEFL、IELTS）。' },
    ],
    sections: {
      builtFor: '英語学習者向けに構築。',
      scaleToCefr: 'CEFRレベルにスケーリング。',
      ctaHeading: '5分残っていますか?',
      ctaSubtitle: '語彙ラウンドを実行。',
      ctaPrimaryButtonLabel: '▶ 英語ゲームを開始',
      ctaSecondaryButtonLabel: 'クラスルームゲームを表示',
    },
    faqs: [
      {
        q: '最高の無料英語ゲームは？',
        a: 'LexiClash は、リアルタイムゲーム：高速 Boggle、Word Wheel 語彙、Word Hunt 探索。クラスメートや AI と対戦 — 競争的で面白い。',
      },
      {
        q: 'アカウントが必要？',
        a: 'はい、でも無料。先生がクラスを作成、生徒はコードで参加。支払いなし。',
      },
      {
        q: 'どう役立つ？',
        a: 'スペリング、語彙、プレッシャー下での速度を鍛える — すべて流暢性に繋がる。マルチプレイヤーが十代を引き込む。',
      },
      {
        q: 'レベル別にカスタマイズできる？',
        a: 'はい。リスト (A0–C2) をアップロード、レベル別に割り当て。ダッシュボードで苦手が見える。',
      },
      {
        q: '大人にも対応？',
        a: 'もちろん。大人と大学プログラムが語彙練習に使用。',
      },
      {
        q: 'バイリンガルプログラムで使える？',
        a: 'はい。5つの辞書。イマージョンと移行に最適。',
      },
    ],
  },
  ru: {
    metaTitle: 'Бесплатные игры английского языка — Многопользовательские онлайн-игры для учащихся | LexiClash',
    metaDescription: 'Бесплатные игры английского языка онлайн, отсортированные по уровню CEFR (A1–C2) для учащихся. Развивайте орфографию, фонетику и словарный запас в прямом многопользовательском конкурсе с панелью учителя.',
    ogTitle: 'Бесплатные игры английского языка для учащихся',
    ogDescription: 'Живые многопользовательские игры для класса. Бесплатные учетные записи ученика, 6 словарей, панель учителя.',
    twitterDescription: 'Бесплатные игры английского языка ESL/EFL для класса. Многопользовательские, 6 языков, панель учителя.',
    heroTag: '★ ESL / EFL ★ Бесплатно Навсегда ★',
    heroH1: {
      highlight: 'Английский',
      rest1: 'Словесные игры.',
      rest2: 'Онлайн. Бесплатно.',
    },
    heroSubtitle: 'Словесные игры для учащихся английского языка. Бесплатные учетные записи, 6 словарей и панель учителя, которая показывает, какие слова вызывают сложность.',
    ctaLabel: 'Создать бесплатный класс',
    faqTitle: 'Часто задаваемые вопросы',
    features: [
      { icon: '🌍', text: 'Шесть встроенных словарей: Английский, Испанский, Иврит (RTL), Шведский, Японский, Русский' },
      { icon: '⚡', text: 'Бесплатные учетные записи ученика — быстрая настройка, затем отслеживание прогресса всегда' },
      { icon: '👥', text: 'Живой многопользовательский режим до 30 учащихся; парные поединки 1на1' },
      { icon: '📈', text: 'Точность по каждому ученику + трудные слова для всего класса' },
      { icon: '🎯', text: 'Три игровых режима: Boggle, Word Hunt, Word Wheel' },
      { icon: '📱', text: 'Работает на любом телефоне, планшете, Chromebook или веб-браузере' },
      { icon: '⏱️', text: 'Формат 5 минут подходит для любого плана урока' },
      { icon: '💸', text: 'Бесплатно играть — без платы за ученика, без аккаунтов' },
    ],
    proficiencyLevels: [
      { tag: 'A1-A2', title: 'Начинающий', desc: 'Слова из 3–4 букв, более длительный таймер, обычные слова. Word Wheel для направленной практики.' },
      { tag: 'B1-B2', title: 'Средний', desc: 'Слова разной длины, стандартный таймер. Boggle раскрывает модели слов и префиксы.' },
      { tag: 'C1-C2', title: 'Продвинутый', desc: 'Длинные слова, короткий таймер, пользовательские продвинутые списки (TOEFL, IELTS, академический словарь).' },
    ],
    sections: {
      builtFor: 'Создано для учащихся английского языка.',
      scaleToCefr: 'Масштабируется по уровням CEFR.',
      ctaHeading: 'Осталось пять минут?',
      ctaSubtitle: 'Проведите раунд словарного запаса.',
      ctaPrimaryButtonLabel: '▶ Начать игру английского',
      ctaSecondaryButtonLabel: 'Смотреть все игры класса',
    },
    faqs: [
      {
        q: 'Какие лучшие бесплатные игры английского языка?',
        a: 'LexiClash предлагает живые многопользовательские игры по формированию слов: быстрый Boggle, Word Wheel для словарного запаса и Word Hunt для поиска цели. Все игры проходят в реальном времени против одноклассников или AI, что делает обучение конкурентным и интересным.',
      },
      {
        q: 'Нужна ли учащимся учетная запись?',
        a: 'Да, учетные записи необходимы, но всегда бесплатны. Учитель создает класс, а ученики присоединяются с простым кодом. Никаких платежей, никогда.',
      },
      {
        q: 'Как словесные игры помогают учащимся?',
        a: 'Словесные игры развивают орфографию, распознавание словарного запаса и быстрый вспомнил под давлением — навыки, которые напрямую переходят в беглость. Многопользовательская конкуренция повышает вовлеченность и запоминание, особенно для подростков.',
      },
      {
        q: 'Могу ли я адаптировать игры для разных уровней?',
        a: 'Да. Учителя могут загружать пользовательские списки слов (A0–C2) и назначать игры по уровню. Панель класса показывает, какие слова вызывают трудности.',
      },
      {
        q: 'Подходит ли LexiClash для взрослых учащихся ESL/EFL?',
        a: 'Абсолютно. Взрослые учащиеся и университетские программы ESL/EFL используют LexiClash для ледокольных игр и закрепления словарного запаса.',
      },
      {
        q: 'Могу ли я использовать LexiClash в двуязычной программе?',
        a: 'Да. LexiClash поддерживает шесть языков: Английский, Испанский, Иврит, Шведский, Японский и Русский. Идеально для классов полного погружения и переходных программ.',
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
  if (normalized === 'ru') return content.ru;

  return content.en;
}
