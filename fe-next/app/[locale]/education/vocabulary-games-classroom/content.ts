export type LocaleContent = {
  metaTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  twitterDescription: string;
  heroTag: string;
  heroH1: {
    line1: string;
    highlight: string;
    line2: string;
    line3: string;
  };
  heroSubtitle: string;
  ctaSubLabel: string;
  whyTitle: string;
  whyPoints: [string, string, string, string];
  faqTitle: string;
  faqs: Array<{ q: string; a: string }>;
};

export const EDUCATION_LOCALES = ['en', 'he', 'es', 'sv', 'ja'] as const;
export type EducationLocale = (typeof EDUCATION_LOCALES)[number];

const CONTENT: Record<EducationLocale, LocaleContent> = {
  en: {
    metaTitle: 'Free Classroom Vocabulary Games — Live Multiplayer, 5 Languages | LexiClash',
    metaDescription:
      'Free vocabulary games for the classroom. Live whole-class multiplayer, 1v1 vocabulary duels, and custom curriculum word lists. Supports English, Spanish, Hebrew, Swedish, and Japanese. Runs in any browser. Free forever.',
    ogTitle: 'Free Vocabulary Games for Classrooms',
    ogDescription:
      'Live multiplayer vocabulary games for teachers. Whole-class challenges, 1v1 duels, custom word lists, 5 languages. Student accounts always free.',
    twitterDescription:
      'The classroom vocabulary game teachers actually use. Live multiplayer, 1v1 duels, your word lists, five languages — student accounts are always free.',
    heroTag: '★ For Teachers ★ Free Forever ★',
    heroH1: {
      line1: 'Free',
      highlight: 'Vocabulary',
      line2: 'Games. Real Classrooms.',
      line3: 'Free accounts.',
    },
    heroSubtitle:
      'The classroom vocabulary game teachers actually use. Live multiplayer, 1v1 duels, your word lists, five languages — student accounts are always free.',
    ctaSubLabel: 'Free · Student accounts free',
    whyTitle: 'Why teachers pick LexiClash',
    whyPoints: [
      'Free student accounts. Quick signup, then tracks XP and progress forever.',
      'Word-formation, not flashcards. Beats Quizlet for spelling + recall.',
      'Five languages with full dictionaries. ESL, Hebrew immersion, Spanish bilingual — all native.',
      'Free tier = full features. No premium upsell, no ads in classroom.',
    ],
    faqTitle: 'Frequently Asked Questions',
    faqs: [
      {
        q: 'Do students need to sign up?',
        a: "Yes, but it's free and takes 30 seconds. One email or Google account, that's it. No credit card, no upsell.",
      },
      {
        q: 'Can we use our own word lists?',
        a: 'Yes. Upload a custom word list in your teacher dashboard, then launch whole-class or 1v1 games using your curriculum vocabulary.',
      },
      {
        q: 'How long are the games?',
        a: 'Games run 3–5 minutes, perfect for warmups, transitions, or activity breaks. Customizable difficulty and time limits.',
      },
      {
        q: 'What grade levels does it support?',
        a: 'Designed for grades 4–12, ESL programs, adult learners, and bilingual classrooms. Difficulty adjusts per game.',
      },
      {
        q: 'Do you sell student data?',
        a: 'No. We never sell or share student data. Parent/FERPA-compliant. Full privacy policy available.',
      },
      {
        q: 'What about offline schools?',
        a: 'LexiClash is browser-based and runs on any internet connection. Works on school WiFi, tablets, Chromebooks, and desktops.',
      },
    ],
  },

  he: {
    metaTitle: 'משחקי אוצר מילים חינמיים בכיתה — ריבוי משתתפים חי, 5 שפות | LexiClash',
    metaDescription:
      'משחקי אוצר מילים חינמיים לכיתה. משחקי ריבוי משתתפים חיים לכיתה שלמה, דו־קרב אוצר מילים 1v1, וריאות מילים מותאמות לתוכנית הלימודים. תמיכה באנגלית, ספרדית, עברית, שוודית, ויפנית. פועל בכל דפדפן. חינם לתמיד.',
    ogTitle: 'משחקי אוצר מילים חינמיים לכיתה',
    ogDescription:
      'משחקי אוצר מילים חיים ריבוי משתתפים למורים. אתגרים לכיתה שלמה, דו־קרבות 1v1, רשימות מילים מותאמות, 5 שפות. חשבונות תלמידים תמיד חינמיים.',
    twitterDescription:
      'משחק אוצר המילים בכיתה שמורים באמת משתמשים בו. משחקי ריבוי משתתפים חיים, דו־קרבות, רשימות המילים שלך, חמש שפות — חשבונות תלמידים תמיד חינמיים.',
    heroTag: '★ למורים ★ חינם לתמיד ★',
    heroH1: {
      line1: 'חינם',
      highlight: 'אוצר מילים',
      line2: 'משחקים. כיתות אמיתיות.',
      line3: 'חשבונות חינמיים.',
    },
    heroSubtitle:
      'משחק אוצר המילים בכיתה שמורים באמת משתמשים בו. משחקי ריבוי משתתפים חיים, דו־קרבות, רשימות המילים שלך, חמש שפות — חשבונות תלמידים תמיד חינמיים.',
    ctaSubLabel: 'חינם · חשבונות תלמידים חינמיים',
    whyTitle: 'למה מורים בוחרים ב־LexiClash',
    whyPoints: [
      'חשבונות תלמידים חינמיים. הרשמה מהירה בן 30 שנייה, ואז עוקב אחר נקודות והתקדמות לתמיד.',
      'יצירת מילים, לא כרטיסי זיכרון. עדיף מ־Quizlet לאיות ו־recall.',
      'חמש שפות עם מילונים מלאים. ESL, טבילה בעברית, דוּאָלִית בספרדית — הכל מקומי.',
      'שכבה חינמית = כל התכונות. ללא פרמיום, ללא מודעות בכיתה.',
    ],
    faqTitle: 'שאלות נפוצות',
    faqs: [
      {
        q: 'האם תלמידים צריכים להירשם?',
        a: 'כן, אבל זה חינם וקוקח 30 שניות. דוא״ל אחד או חשבון Google, וזהו. ללא כרטיס אשראי, ללא עלות נוספת.',
      },
      {
        q: 'האם אנחנו יכולים להשתמש בריאות המילים שלנו?',
        a: 'כן. העלו רשימת מילים מותאמת בלוח המורים שלכם, ואז הפעילו משחקי כיתה או דו־קרבות תוך שימוש בקוצ שלכם.',
      },
      {
        q: 'כמה זמן משחקים מקחים?',
        a: 'משחקים נמשכים 3–5 דקות, מושלם לחימום, מעברים, או הפסקות פעילות. זמן קושי וזמן מגבילים ניתנים להתאמה.',
      },
      {
        q: 'איזה רמות כיתה זה תומך?',
        a: 'מעוצב לכיתות 4–12, תוכניות ESL, חניכים למבוגרים, וכיתות דוּאָלִיוֹת. קושי מתאים לכל משחק.',
      },
      {
        q: 'האם אתם מוכרים נתוני תלמידים?',
        a: 'לא. אנחנו לעולם לא מוכרים או משתפים נתוני תלמידים. תואם הורים/FERPA. מדיניות פרטיות מלאה זמינה.',
      },
      {
        q: 'מה לגבי בתי ספר לא מקוונים?',
        a: 'LexiClash מבוסס דפדפן ופועל על כל חיבור אינטרנט. עובד על WiFi בבית ספר, טאבלטים, Chromebooks ושולחן עבודה.',
      },
    ],
  },

  es: {
    metaTitle: 'Juegos de vocabulario gratis para el aula — Multijugador en vivo, 5 idiomas | LexiClash',
    metaDescription:
      'Juegos de vocabulario gratis para el aula. Multijugador en vivo para toda la clase, duelos de vocabulario 1v1 y listas de palabras personalizadas. Compatible con inglés, español, hebreo, sueco y japonés. Funciona en cualquier navegador. Gratis para siempre.',
    ogTitle: 'Juegos de vocabulario gratis para el aula',
    ogDescription:
      'Juegos de vocabulario multijugador en vivo para maestros. Desafíos para toda la clase, duelos 1v1, listas de palabras personalizadas, 5 idiomas. Las cuentas de estudiantes siempre son gratis.',
    twitterDescription:
      'El juego de vocabulario del aula que los maestros realmente usan. Multijugador en vivo, duelos, tus listas de palabras, cinco idiomas — las cuentas de estudiantes siempre son gratis.',
    heroTag: '★ Para Maestros ★ Gratis Para Siempre ★',
    heroH1: {
      line1: 'Gratis',
      highlight: 'Vocabulario',
      line2: 'Juegos. Aulas Reales.',
      line3: 'Cuentas gratis.',
    },
    heroSubtitle:
      'El juego de vocabulario del aula que los maestros realmente usan. Multijugador en vivo, duelos, tus listas de palabras, cinco idiomas — las cuentas de estudiantes siempre son gratis.',
    ctaSubLabel: 'Gratis · Cuentas de estudiantes gratis',
    whyTitle: 'Por qué los maestros eligen LexiClash',
    whyPoints: [
      'Cuentas de estudiantes gratis. Registro rápido en 30 segundos, luego rastrea XP y progreso para siempre.',
      'Formación de palabras, no tarjetas. Mejor que Quizlet para ortografía y recuperación de memoria.',
      'Cinco idiomas con diccionarios completos. ESL, inmersión en hebreo, bilingüe en español — todo nativo.',
      'Capa gratis = todas las funciones. Sin premium, sin anuncios en el aula.',
    ],
    faqTitle: 'Preguntas Frecuentes',
    faqs: [
      {
        q: '¿Necesitan los estudiantes registrarse?',
        a: 'Sí, pero es gratis y toma 30 segundos. Un correo electrónico o cuenta de Google, eso es todo. Sin tarjeta de crédito, sin cargos adicionales.',
      },
      {
        q: '¿Podemos usar nuestras propias listas de palabras?',
        a: 'Sí. Carga una lista de palabras personalizada en tu panel de maestro, luego inicia juegos de clase o duelos 1v1 usando tu vocabulario curricular.',
      },
      {
        q: '¿Cuánto duran los juegos?',
        a: 'Los juegos duran 3–5 minutos, perfectos para calentamientos, transiciones o descansos de actividad. La dificultad y los límites de tiempo son personalizables.',
      },
      {
        q: '¿Qué niveles de grado soporta?',
        a: 'Diseñado para grados 4–12, programas ESL, aprendices adultos y aulas bilingües. La dificultad se ajusta por juego.',
      },
      {
        q: '¿Venden datos de estudiantes?',
        a: 'No. Nunca vendemos ni compartimos datos de estudiantes. Compatible con padres y FERPA. Política de privacidad completa disponible.',
      },
      {
        q: '¿Qué hay de las escuelas sin conexión?',
        a: 'LexiClash funciona en navegador y se ejecuta en cualquier conexión a Internet. Funciona en WiFi escolar, tabletas, Chromebooks y escritorios.',
      },
    ],
  },

  sv: {
    metaTitle: 'Gratis ordförråd spel för klassrummet — Live multiplayer, 5 språk | LexiClash',
    metaDescription:
      'Gratis ordförråd spel för klassrummet. Live helklass multiplayer, 1v1 ordförråds dueller och anpassade ordlistor från läroplanen. Stöder engelska, spanska, hebreiska, svenska och japanska. Körs i vilken webbläsare som helst. Gratis för alltid.',
    ogTitle: 'Gratis ordförråd spel för klassrummet',
    ogDescription:
      'Live multiplayer ordförråd spel för lärare. Helklassutmaningar, 1v1 dueller, anpassade ordlistor, 5 språk. Studentkonton är alltid gratis.',
    twitterDescription:
      'Ordförråds spelet för klassrummet som lärare faktiskt använder. Live multiplayer, dueller, dina ordlistor, fem språk — studentkonton är alltid gratis.',
    heroTag: '★ För Lärare ★ Gratis För Alltid ★',
    heroH1: {
      line1: 'Gratis',
      highlight: 'Ordförråds',
      line2: 'Spel. Verkliga Klassrum.',
      line3: 'Gratis konton.',
    },
    heroSubtitle:
      'Ordförråds spelet för klassrummet som lärare faktiskt använder. Live multiplayer, dueller, dina ordlistor, fem språk — studentkonton är alltid gratis.',
    ctaSubLabel: 'Gratis · Studentkonton gratis',
    whyTitle: 'Varför lärare väljer LexiClash',
    whyPoints: [
      'Gratis studentkonton. Snabb registrering på 30 sekunder, sedan spårar XP och framsteg för alltid.',
      'Ordbildning, inte flashkort. Bättre än Quizlet för stavning och minne.',
      'Fem språk med fullständiga ordböcker. ESL, hebreisk nedsänkning, spansk tvåspråkig — allt modersmål.',
      'Gratis nivå = alla funktioner. Ingen premium, inga annonser i klassrummet.',
    ],
    faqTitle: 'Vanliga Frågor',
    faqs: [
      {
        q: 'Behöver studenter registrera sig?',
        a: 'Ja, men det är gratis och tar 30 sekunder. En e-post eller Google-konto, det är allt. Inget kreditkort, ingen extra kostnad.',
      },
      {
        q: 'Kan vi använda våra egna ordlistor?',
        a: 'Ja. Ladda upp en anpassad ordlista i din lärarpanel, och starta sedan helklassspel eller 1v1 dueller med ditt läroplansordförråd.',
      },
      {
        q: 'Hur länge varar spelen?',
        a: 'Spelen varar 3–5 minuter, perfekt för uppvärmning, övergångar eller aktivitetspausar. Svårighetsgrad och tidsgränser är anpassningsbara.',
      },
      {
        q: 'Vilka klassår stöds?',
        a: 'Designat för årskurs 4–12, ESL-program, vuxenelever och tvåspråkiga klassrum. Svårighet justeras per spel.',
      },
      {
        q: 'Säljer ni studentdata?',
        a: 'Nej. Vi säljer eller delar aldrig studentdata. Föräldra-/FERPA-kompatibel. Fullständig integritetspolicy tillgänglig.',
      },
      {
        q: 'Hur är det med offline-skolor?',
        a: 'LexiClash är webbläsarbaserad och körs på alla internetanslutningar. Fungerar på skolans WiFi, surfplattor, Chromebooks och datorer.',
      },
    ],
  },

  ja: {
    metaTitle: '無料の教室向け語彙ゲーム — ライブマルチプレイヤー、5言語 | LexiClash',
    metaDescription:
      '無料の教室向け語彙ゲーム。全クラス向けのライブマルチプレイヤー、1v1語彙デュエル、カリキュラムに合わせたカスタム単語リスト。英語、スペイン語、ヘブライ語、スウェーデン語、日本語に対応。任意のブラウザで動作。永遠に無料。',
    ogTitle: '無料の教室向け語彙ゲーム',
    ogDescription:
      '教師向けのライブマルチプレイヤー語彙ゲーム。全クラス向けチャレンジ、1v1デュエル、カスタム単語リスト、5言語。生徒アカウントは常に無料。',
    twitterDescription:
      '教師が実際に使用する教室向け語彙ゲーム。ライブマルチプレイヤー、デュエル、あなたの単語リスト、5言語 — 生徒アカウントは常に無料。',
    heroTag: '★ 教師向け ★ 永遠に無料 ★',
    heroH1: {
      line1: '無料の',
      highlight: '語彙',
      line2: 'ゲーム。本物の教室。',
      line3: '無料アカウント。',
    },
    heroSubtitle:
      '教師が実際に使用する教室向け語彙ゲーム。ライブマルチプレイヤー、デュエル、あなたの単語リスト、5言語 — 生徒アカウントは常に無料。',
    ctaSubLabel: '無料 · 生徒アカウント無料',
    whyTitle: 'LexiClashが選ばれる理由',
    whyPoints: [
      '無料の生徒アカウント。30秒の迅速な登録後、XPと進捗を永遠に追跡。',
      '単語形成、フラッシュカードではない。綴りと想起力の点でQuizletより優れている。',
      '完全な辞書を備えた5言語。ESL、ヘブライ語イマージョン、スペイン語バイリンガル — すべてネイティブ。',
      '無料レベル = すべての機能。プレミアムなし、教室内に広告なし。',
    ],
    faqTitle: 'よくある質問',
    faqs: [
      {
        q: '生徒は登録する必要がありますか？',
        a: 'はい。ただし、無料で30秒かかります。メールアドレスまたはGoogleアカウント1つだけです。クレジットカード不要、追加料金なし。',
      },
      {
        q: '独自の単語リストを使用できますか？',
        a: 'はい。教師用ダッシュボードにカスタム単語リストをアップロードしてから、カリキュラム語彙を使用してクラス全体または1v1デュエルゲームを開始できます。',
      },
      {
        q: 'ゲームはどのくらいの時間ですか？',
        a: 'ゲームは3〜5分間実行され、ウォームアップ、移行、またはアクティビティブレイクに最適です。難易度と時間制限はカスタマイズできます。',
      },
      {
        q: 'どの学年をサポートしていますか？',
        a: '4〜12年生、ESLプログラム、大人の学習者、バイリンガルクラス向けに設計されています。ゲームごとに難易度が調整されます。',
      },
      {
        q: '生徒データを販売していますか？',
        a: 'いいえ。生徒データを販売または共有することはありません。保護者/FERPA準拠。完全なプライバシーポリシーが利用可能です。',
      },
      {
        q: 'オフラインの学校はどうですか？',
        a: 'LexiClashはブラウザベースで、あらゆるインターネット接続で動作します。学校のWiFi、タブレット、Chromebook、デスクトップで動作します。',
      },
    ],
  },
};

export function getVocabClassroomContent(locale: string): LocaleContent {
  const normalizedLocale = locale.toLowerCase().split('-')[0];

  if (normalizedLocale === 'en' || !EDUCATION_LOCALES.includes(normalizedLocale as EducationLocale)) {
    return CONTENT.en;
  }

  return CONTENT[normalizedLocale as EducationLocale];
}
