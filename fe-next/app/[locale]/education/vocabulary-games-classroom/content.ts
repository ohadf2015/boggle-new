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
  features: Array<{ icon: string; text: string }>;
  compareRows: Array<readonly [string, string, string, string, string]>;
  useCases: Array<{ tag: string; title: string; desc: string }>;
  ctaHeading: string;
  ctaSubtitle: string;
  ctaPrimaryButtonLabel: string;
  ctaSecondaryButtonLabel: string;
  metadataLabels: {
    languages: string;
    gradeLevel: string;
    accounts: string;
    duration: string;
  };
  sections: {
    whatYouGet: string;
    comparison: string;
    comparisonSubtitle: string;
    howTeachersUse: string;
  };
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
    features: [
      { icon: '⚡', text: 'Free student accounts — quick signup, tracks XP and progress across sessions' },
      { icon: '🎯', text: 'Three game modes: Boggle grid, Word Hunt, Word Wheel' },
      { icon: '👥', text: 'Live multiplayer up to 30 students per session' },
      { icon: '⚔️', text: '1v1 vocabulary duels for paired practice or sub-team rounds' },
      { icon: '📚', text: 'Upload your own curriculum word lists — any unit, any subject' },
      { icon: '🌍', text: 'Five languages: English, Hebrew (RTL), Spanish, Swedish, Japanese' },
      { icon: '📊', text: 'Teacher dashboard: per-student accuracy + missed-word patterns' },
      { icon: '💸', text: 'Free tier covers everything — no premium upsell' },
    ],
    compareRows: [
      ['Free tier (full features)', '✓', 'Limited', '✓ basic', 'Limited'],
      ['Free student accounts', '✓ always free', '✗ paid tiers', '✗ paid tiers', '✗ paid tiers'],
      ['Word-formation gameplay', '✓ Boggle/Wheel/Anagram', '✗ flashcards', '✗ templates', '✗ quizzes'],
      ['Live whole-class multiplayer', '✓', '✓ paid', '✗', '✓'],
      ['1v1 vocabulary duels', '✓', '✓ paid', '✗', '✗'],
      ['5 languages incl. RTL', '✓', '✗', '✗', '✗'],
      ['Custom word lists', '✓', '✓', '✓', '✓'],
      ['Class analytics dashboard', '✓ free', '✓ paid', 'Basic', '✓ paid'],
    ],
    useCases: [
      { tag: 'WARM-UP', title: '5-minute opener', desc: 'Spin a quick Word Wheel from yesterday\'s vocabulary list to wake the class up.' },
      { tag: 'REVIEW', title: 'End-of-unit recap', desc: 'Run a whole-class Boggle round on the unit\'s 30 target words; dashboard surfaces gaps.' },
      { tag: 'ESL', title: 'Target-language practice', desc: 'Play in students\' target language — supports EN, HE, ES, SV, JA dictionaries.' },
      { tag: 'SUB DAY', title: 'Substitute teacher activity', desc: 'Zero prep — sub picks a list, projects a code, students play. Done in 10 minutes.' },
    ],
    ctaHeading: 'Ten minutes left in class?',
    ctaSubtitle: 'Pick a list. Show the code. Play. Review the dashboard. That\'s the whole loop.',
    ctaPrimaryButtonLabel: '▶ Start Classroom Game',
    ctaSecondaryButtonLabel: 'See Education Hub',
    metadataLabels: {
      languages: '5 languages',
      gradeLevel: 'K-12 + adult ESL',
      accounts: 'free student accounts',
      duration: '5-min sessions',
    },
    sections: {
      whatYouGet: 'What you get.',
      comparison: 'LexiClash vs the usual suspects.',
      comparisonSubtitle: 'A teacher-honest comparison. We\'re not for everyone — just for teachers who want word games without a paywall.',
      howTeachersUse: 'How teachers use it.',
    },
  },

  he: {
    metaTitle: 'משחקי אוצר מילים חינמיים בכיתה — ריבוי משתתפים חי, 5 שפות | LexiClash',
    metaDescription:
      'משחקי אוצר מילים חינמיים לכיתה. ריבוי משתתפים חי בכיתה שלמה, דו־קרבות אוצר מילים 1v1, ורשימות מילים מהתוכנית. אנגלית, ספרדית, עברית, שוודית, יפנית. כל דפדפן. לתמיד חינם.',
    ogTitle: 'משחקי אוצר מילים חינמיים לכיתה',
    ogDescription:
      'משחקי ריבוי משתתפים חיים למורים. אתגרים לכיתה שלמה, דו־קרבות 1v1, רשימות מילים משלכם, 5 שפות. חשבונות תלמידים תמיד חינמיים.',
    twitterDescription:
      'משחק אוצר המילים שמורים באמת משתמשים בו. ריבוי משתתפים חי, דו־קרבות, הרשימות שלכם, 5 שפות — חשבונות תלמידים חינמיים לתמיד.',
    heroTag: '★ למורים ★ חינם לתמיד ★',
    heroH1: {
      line1: 'חינם',
      highlight: 'אוצר מילים',
      line2: 'משחקים. כיתות אמיתיות.',
      line3: 'חשבונות חינמיים.',
    },
    heroSubtitle:
      'משחק אוצר המילים שמורים באמת משתמשים בו. ריבוי משתתפים חי, דו־קרבות, הרשימות שלכם, 5 שפות — חשבונות תלמידים חינמיים לתמיד.',
    ctaSubLabel: 'חינם · חשבונות תלמידים חינמיים',
    whyTitle: 'למה מורים בוחרים ב־LexiClash',
    whyPoints: [
      'חשבונות תלמידים חינמיים. הרשמה של 30 שניות, ואז מעקב אחר ההתקדמות לתמיד.',
      'משחקי בניית מילים, לא כרטיסיות. עדיף מ־Quizlet לאיות ולזיכרון.',
      '5 שפות עם מילונים מלאים. ESL, הטמעת עברית, ספרדית דו־לשונית — הכל בשפת אם.',
      'כל התכונות בחינם. בלי פרימיום, בלי פרסומות בכיתה.',
    ],
    faqTitle: 'שאלות נפוצות',
    faqs: [
      {
        q: 'האם תלמידים צריכים להירשם?',
        a: 'כן, אבל זה חינם ולוקח 30 שניות. דוא״ל אחד או חשבון Google — וזהו. בלי כרטיס אשראי ובלי הפתעות.',
      },
      {
        q: 'אפשר להשתמש ברשימות המילים שלנו?',
        a: 'כן. מעלים את רשימת המילים בלוח המורה, ואז מפעילים משחקי כיתה או דו־קרבות עם הקוד שלכם.',
      },
      {
        q: 'כמה זמן נמשכים משחקים?',
        a: '3–5 דקות. מושלם לחימום, מעברים בין שיעורים, או הפסקות קטנות. אפשר להתאים את הקושי והזמן.',
      },
      {
        q: 'איזה גילאים זה מתאים?',
        a: 'כיתות 4–12, תוכניות ESL, למידה למבוגרים, וכיתות דו־לשוניות. הקושי משתנה לפי משחק.',
      },
      {
        q: 'האם אתם מוכרים את הנתונים של התלמידים?',
        a: 'לא. לעולם לא מוכרים ולא משתפים נתוני תלמידים. תואם FERPA. מדיניות פרטיות מלאה זמינה.',
      },
      {
        q: 'מה עם בתי ספר עם WiFi בעייתי?',
        a: 'LexiClash פועל בכל דפדפן ובכל חיבור אינטרנט. עובד על WiFi בית-ספרי, טאבלטים, Chromebooks וכל מכשיר.',
      },
    ],
    features: [
      { icon: '⚡', text: 'חשבונות חינמיים — הרשמה של 30 שניות, ומעקב מלא אחר ההתקדמות בכל משחק' },
      { icon: '🎯', text: '3 משחקים: Boggle, Word Hunt, Word Wheel' },
      { icon: '👥', text: 'ריבוי משתתפים חי — עד 30 תלמידים במשחק אחד' },
      { icon: '⚔️', text: 'דו־קרבות 1v1 לתרגול בזוגות או בסבבי קבוצות' },
      { icon: '📚', text: 'העלו את רשימות המילים שלכם — כל יחידה, כל מקצוע' },
      { icon: '🌍', text: '5 שפות: אנגלית, עברית (RTL), ספרדית, שוודית, יפנית' },
      { icon: '📊', text: 'לוח מורה: דיוק לכל תלמיד + אנליטיקה של מילים קשות' },
      { icon: '💸', text: 'הכל בחינם — אין פרמיום' },
    ],
    compareRows: [
      ['כל התכונות בחינם', '✓', 'מוגבל', '✓ בסיסי', 'מוגבל'],
      ['חשבונות תלמידים חינמיים', '✓ תמיד', '✗ בתשלום', '✗ בתשלום', '✗ בתשלום'],
      ['משחקי יצירת מילים', '✓ Boggle/Wheel/Anagram', '✗ כרטיסיות', '✗ תבניות', '✗ חידונים'],
      ['ריבוי משתתפים חי', '✓', '✓ בתשלום', '✗', '✓'],
      ['דו־קרבות 1v1', '✓', '✓ בתשלום', '✗', '✗'],
      ['5 שפות + RTL', '✓', '✗', '✗', '✗'],
      ['רשימות מילים משלכם', '✓', '✓', '✓', '✓'],
      ['לוח אנליטיקה למורה', '✓ חינם', '✓ בתשלום', 'בסיסי', '✓ בתשלום'],
    ],
    useCases: [
      { tag: 'חימום', title: 'פתיחה של 5 דקות', desc: 'Word Wheel מהיר מהרשימה של אתמול — מעיר את הכיתה.' },
      { tag: 'חזרה', title: 'סיכום בסוף היחידה', desc: 'סבב Boggle על 30 המילים; לוח המורה מציג אילו מילים צריך לחזור עליהן.' },
      { tag: 'ESL', title: 'תרגול בשפת היעד', desc: 'משחק בשפת הלימוד של התלמידים — EN, HE, ES, SV, JA.' },
      { tag: 'יום חלופי', title: 'פעילות ליום ללא מורה', desc: 'ללא הכנה — בחר רשימה, שתף קוד, תלמידים משחקים. 10 דקות וסיים.' },
    ],
    ctaHeading: 'נשארו 10 דקות בשיעור?',
    ctaSubtitle: 'בוחרים רשימה, מציגים קוד, משחקים, ומציצים בלוח המורה. זה כל הסיפור.',
    ctaPrimaryButtonLabel: '▶ התחילו משחק כיתה',
    ctaSecondaryButtonLabel: 'למרכז החינוך',
    metadataLabels: {
      languages: '5 שפות',
      gradeLevel: 'כל הגילאים',
      accounts: 'חשבונות תלמידים חינמיים',
      duration: 'סשנים של 5 דקות',
    },
    sections: {
      whatYouGet: 'מה מקבלים.',
      comparison: 'LexiClash לעומת האחרים.',
      comparisonSubtitle: 'השוואה כנה. לא בשביל כולם — בשביל מורים שרוצים משחקי מילים בלי תשלומים נסתרים.',
      howTeachersUse: 'איך מורים משתמשים בזה.',
    },
  },

  es: {
    metaTitle: 'Juegos de vocabulario gratis para el aula — Multijugador en vivo, 5 idiomas | LexiClash',
    metaDescription:
      'Juegos de vocabulario gratis para la clase. Multijugador en vivo, duelos de vocabulario 1v1, tus listas de palabras. Inglés, español, hebreo, sueco, japonés. Cualquier navegador. Gratis siempre.',
    ogTitle: 'Juegos de vocabulario gratis para el aula',
    ogDescription:
      'Juegos de vocabulario en vivo para maestros. Desafíos para toda la clase, duelos 1v1, tus listas, 5 idiomas. Cuentas de estudiantes siempre gratis.',
    twitterDescription:
      'El juego de vocabulario que los maestros usan. Multijugador en vivo, duelos, tus listas, 5 idiomas — cuentas de estudiantes siempre gratis.',
    heroTag: '★ Para Maestros ★ Gratis Siempre ★',
    heroH1: {
      line1: 'Gratis',
      highlight: 'Vocabulario',
      line2: 'Juegos. Aulas Reales.',
      line3: 'Cuentas gratis.',
    },
    heroSubtitle:
      'El juego de vocabulario que los maestros usan. Multijugador en vivo, duelos, tus listas, 5 idiomas — cuentas de estudiantes siempre gratis.',
    ctaSubLabel: 'Gratis · Cuentas de estudiantes gratis',
    whyTitle: 'Por qué los maestros eligen LexiClash',
    whyPoints: [
      'Cuentas gratis. Registro en 30 segundos, luego sigue el progreso para siempre.',
      'Formar palabras, no tarjetas. Mejor que Quizlet para ortografía y memoria.',
      '5 idiomas con diccionarios completos. ESL, inmersión hebraica, bilingüe español — todo nativo.',
      'Todo gratis. Sin premium, sin anuncios en clase.',
    ],
    faqTitle: 'Preguntas Frecuentes',
    faqs: [
      {
        q: '¿Necesitan registrarse los estudiantes?',
        a: 'Sí, pero es gratis y toma 30 segundos. Correo o cuenta Google. Sin tarjeta de crédito, sin sorpresas.',
      },
      {
        q: '¿Usamos nuestras propias listas de palabras?',
        a: 'Sí. Sube la lista en tu panel de maestro y lanza juegos con tu vocabulario. Todo en el mismo lugar.',
      },
      {
        q: '¿Cuánto duran?',
        a: '3–5 minutos. Perfectos para calentamientos, transiciones, descansos. La dificultad y el tiempo se ajustan.',
      },
      {
        q: '¿Qué grados soporta?',
        a: 'Desde 4to grado hasta 12vo, ESL, adultos, bilingües. La dificultad se ajusta por juego.',
      },
      {
        q: '¿Venden datos de estudiantes?',
        a: 'No. Nunca. Cumplimos con FERPA. Privacidad total garantizada.',
      },
      {
        q: '¿Si el WiFi es lento?',
        a: 'LexiClash funciona en cualquier navegador y cualquier conexión. Carga en WiFi lento y funciona en todos los dispositivos.',
      },
    ],
    features: [
      { icon: '⚡', text: 'Cuentas gratis — registro rápido, sigue el progreso en todas las sesiones' },
      { icon: '🎯', text: '3 juegos: Boggle, Word Hunt, Word Wheel' },
      { icon: '👥', text: 'Multijugador en vivo — hasta 30 estudiantes por sesión' },
      { icon: '⚔️', text: 'Duelos 1v1 para parejas o equipos' },
      { icon: '📚', text: 'Carga tus listas — cualquier unidad, cualquier materia' },
      { icon: '🌍', text: '5 idiomas: inglés, hebreo (RTL), español, sueco, japonés' },
      { icon: '📊', text: 'Panel de maestro: precisión por alumno + palabras difíciles' },
      { icon: '💸', text: 'Todo gratis — sin premium' },
    ],
    compareRows: [
      ['Todo gratis', '✓', 'Limitado', '✓ básico', 'Limitado'],
      ['Cuentas gratis', '✓ siempre', '✗ pago', '✗ pago', '✗ pago'],
      ['Juegos de palabras', '✓ Boggle/Wheel/Anagrama', '✗ tarjetas', '✗ plantillas', '✗ cuestionarios'],
      ['Multijugador', '✓', '✓ pago', '✗', '✓'],
      ['Duelos 1v1', '✓', '✓ pago', '✗', '✗'],
      ['5 idiomas + RTL', '✓', '✗', '✗', '✗'],
      ['Tus listas', '✓', '✓', '✓', '✓'],
      ['Panel analítico', '✓ gratis', '✓ pago', 'Básico', '✓ pago'],
    ],
    useCases: [
      { tag: 'CALENTAMIENTO', title: 'Apertura de 5 minutos', desc: 'Word Wheel rápida de la lista de ayer — despierta la clase.' },
      { tag: 'REPASO', title: 'Fin de unidad', desc: 'Boggle con las 30 palabras de la unidad; el panel muestra qué falta.' },
      { tag: 'ESL', title: 'Práctica en idioma objetivo', desc: 'Elige el idioma de tus estudiantes — EN, HE, ES, SV, JA.' },
      { tag: 'DÍA DE SUSTITUTO', title: 'Actividad fácil', desc: 'Sin preparación — elige una lista, proyecta código, estudiantes juegan. 10 minutos.' },
    ],
    ctaHeading: '¿Diez minutos al final de la clase?',
    ctaSubtitle: 'Elige una lista. Muestra el código. Juega. Revisa el panel. Ese es todo el ciclo.',
    ctaPrimaryButtonLabel: '▶ Iniciar juego de clase',
    ctaSecondaryButtonLabel: 'Ver Hub educativo',
    metadataLabels: {
      languages: '5 idiomas',
      gradeLevel: 'Grados 4-12 + ESL adultos',
      accounts: 'cuentas de estudiantes gratis',
      duration: 'sesiones de 5 minutos',
    },
    sections: {
      whatYouGet: 'Lo que obtienes.',
      comparison: 'LexiClash vs. los demás.',
      comparisonSubtitle: 'Honesto. No para todos — solo para maestros que quieren juegos sin paywall.',
      howTeachersUse: 'Cómo se usa.',
    },
  },

  sv: {
    metaTitle: 'Gratis ordförråd spel för klassrummet — Live multiplayer, 5 språk | LexiClash',
    metaDescription:
      'Gratis ordförråd spel för klassrummet. Live multiplayer, 1v1 ordförrådsdueller, dina ordlistor. Engelska, spanska, hebreiska, svenska, japanska. Vilken webbläsare som helst. Gratis för alltid.',
    ogTitle: 'Gratis ordförråd spel för klassrummet',
    ogDescription:
      'Live multiplayer ordförråd spel för lärare. Helklassutmaningar, 1v1 dueller, dina ordlistor, 5 språk. Studentkonton alltid gratis.',
    twitterDescription:
      'Ordförråds spelet som lärare faktiskt använder. Live multiplayer, dueller, dina ordlistor, 5 språk — studentkonton alltid gratis.',
    heroTag: '★ För Lärare ★ Gratis För Alltid ★',
    heroH1: {
      line1: 'Gratis',
      highlight: 'Ordförråds',
      line2: 'Spel. Verkliga Klassrum.',
      line3: 'Gratis konton.',
    },
    heroSubtitle:
      'Ordförråds spelet som lärare använder. Live multiplayer, dueller, dina ordlistor, 5 språk — studentkonton gratis alltid.',
    ctaSubLabel: 'Gratis · Studentkonton gratis',
    whyTitle: 'Varför lärare väljer LexiClash',
    whyPoints: [
      'Gratis studentkonton. Registrering på 30 sekunder, sedan framsteg för alltid.',
      'Ordbildning, inte flashkort. Bättre än Quizlet för stavning och minne.',
      '5 språk med kompletta ordböcker. ESL, hebreisk nedsänkning, spansk tvåspråkig — allt modersmål.',
      'Allt gratis. Ingen premium, inga annonser i klassrummet.',
    ],
    faqTitle: 'Vanliga Frågor',
    faqs: [
      {
        q: 'Måste studenter registrera sig?',
        a: 'Ja, men det är gratis och tar 30 sekunder. Mail eller Google-konto. Inget kreditkort, inga överraskningar.',
      },
      {
        q: 'Kan vi använda våra egna ordlistor?',
        a: 'Ja. Ladda upp i ditt panel och starta spel med ditt ordförråd.',
      },
      {
        q: 'Hur lång tid tar ett spel?',
        a: '3–5 minuter. Perfekt för uppvärmning, övergångar, pauser. Svårighetsgrad och tid går att ändra.',
      },
      {
        q: 'Vilka åldrar passar det?',
        a: 'Från årskurs 4 upp till vuxna, ESL-program, tvåspråkiga klassrum. Svårigheten justeras per spel.',
      },
      {
        q: 'Säljer ni elevdata?',
        a: 'Nej, aldrig. Vi följer FERPA. Fullständig integritet garanterad.',
      },
      {
        q: 'Fungerar det med dåligt WiFi?',
        a: 'LexiClash fungerar i vilken webbläsare som helst och vilken anslutning som helst. Jobbar bra på skolans WiFi, tablets, Chromebooks, datorer.',
      },
    ],
    features: [
      { icon: '⚡', text: 'Gratis konton — registrering på 30 sekunder, spårar framsteg alltid' },
      { icon: '🎯', text: '3 spel: Boggle, Word Hunt, Word Wheel' },
      { icon: '👥', text: 'Live multiplayer — upp till 30 elever per spel' },
      { icon: '⚔️', text: '1v1 dueller för par eller lag' },
      { icon: '📚', text: 'Dina ordlistor — vilken enhet, vilket ämne som helst' },
      { icon: '🌍', text: '5 språk: engelska, hebreiska (RTL), spanska, svenska, japanska' },
      { icon: '📊', text: 'Lärarpanel: precision per elev + vilka ord som är svåra' },
      { icon: '💸', text: 'Allt gratis — ingen premium' },
    ],
    compareRows: [
      ['Allt gratis', '✓', 'Begränsad', '✓ grund', 'Begränsad'],
      ['Gratis konton', '✓ alltid', '✗ betald', '✗ betald', '✗ betald'],
      ['Ordbildningsspel', '✓ Boggle/Wheel/Anagram', '✗ kort', '✗ mallar', '✗ quiz'],
      ['Live multiplayer', '✓', '✓ betald', '✗', '✓'],
      ['1v1 dueller', '✓', '✓ betald', '✗', '✗'],
      ['5 språk + RTL', '✓', '✗', '✗', '✗'],
      ['Dina ordlistor', '✓', '✓', '✓', '✓'],
      ['Analyspanel', '✓ gratis', '✓ betald', 'Grund', '✓ betald'],
    ],
    useCases: [
      { tag: 'UPPVÄRMNING', title: '5-minutersöppnare', desc: 'Snabbt Word Wheel från gårdagens lista — väcker klassen.' },
      { tag: 'REPETITION', title: 'Slut på enhet', desc: 'Boggle på enhetens 30 ord; panelen visar vad som saknas.' },
      { tag: 'ESL', title: 'Målspråkspraktik', desc: 'Deras målspråk — EN, HE, ES, SV, JA.' },
      { tag: 'VIKARD', title: 'Vikaraktivitet', desc: 'Noll förberedelse — välj lista, dela kod, eleverna spelar. 10 minuter.' },
    ],
    ctaHeading: 'Tio minuter kvar i lektionen?',
    ctaSubtitle: 'Välj en lista. Visa koden. Spela. Granska panelen. Det är hela loopen.',
    ctaPrimaryButtonLabel: '▶ Starta klassrumsspel',
    ctaSecondaryButtonLabel: 'Se utbildningshub',
    metadataLabels: {
      languages: '5 språk',
      gradeLevel: 'Årskurs 4-12 + vuxen ESL',
      accounts: 'gratis studentkonton',
      duration: '5-minuterssessioner',
    },
    sections: {
      whatYouGet: 'Det du får.',
      comparison: 'LexiClash vs. de andra.',
      comparisonSubtitle: 'Ärlig jämförelse. Inte för alla — bara för lärare som vill ha ordspel utan paywall.',
      howTeachersUse: 'Hur det fungerar.',
    },
  },

  ja: {
    metaTitle: '無料の教室向け語彙ゲーム — ライブマルチプレイヤー、5言語 | LexiClash',
    metaDescription:
      '無料で使える教室向けの語彙ゲーム。ライブマルチプレイヤー、1v1デュエル、自分の単語リスト。英語、スペイン語、ヘブライ語、スウェーデン語、日本語対応。どのブラウザでも動作。ずっと無料。',
    ogTitle: '無料の教室向け語彙ゲーム',
    ogDescription:
      '先生向けのライブ語彙ゲーム。クラス全体チャレンジ、1v1デュエル、自分の単語リスト、5言語。学生アカウントはいつも無料。',
    twitterDescription:
      '先生が実際に使う教室向け語彙ゲーム。ライブマルチプレイヤー、デュエル、あなたのリスト、5言語 — 学生アカウントはいつも無料。',
    heroTag: '★ 先生向け ★ ずっと無料 ★',
    heroH1: {
      line1: '無料の',
      highlight: '語彙',
      line2: 'ゲーム。本物の教室。',
      line3: '無料アカウント。',
    },
    heroSubtitle:
      '先生が実際に使う語彙ゲーム。ライブマルチプレイヤー、デュエル、あなたのリスト、5言語 — 学生アカウントはいつも無料。',
    ctaSubLabel: '無料 · 学生アカウント無料',
    whyTitle: 'LexiClashが選ばれる理由',
    whyPoints: [
      '無料。30秒で登録して、あとはずっと成績が記録される。',
      '単語を作るゲーム。フラッシュカードじゃない。スペリングと記憶で Quizlet より優れている。',
      '5言語、完全な辞書付き。ESL、ヘブライ語コース、スペイン語バイリンガル — すべてネイティブ。',
      'すべて無料。プレミアムなし、授業中に広告なし。',
    ],
    faqTitle: 'よくある質問',
    faqs: [
      {
        q: '生徒は登録が必要ですか？',
        a: 'はい。でも無料で30秒だけです。メールアドレスか Google アカウント。クレジットカード不要、追加料金なし。',
      },
      {
        q: '自分の単語リストが使えますか？',
        a: 'はい。教師用ダッシュボードにアップロードして、そのリストでクラスゲームや 1v1 デュエルができます。',
      },
      {
        q: 'ゲームは何分ですか？',
        a: '3～5分。ウォームアップ、時間つなぎ、休憩に最適。難易度と時間は変更できます。',
      },
      {
        q: 'どの学年向け？',
        a: '4年生～12年生、ESL、大人の学習者、バイリンガルクラス向け。ゲームごとに難易度が変わります。',
      },
      {
        q: '学生のデータを売っていますか？',
        a: 'いいえ。売ったり共有したりしません。FERPA対応。プライバシーポリシーは完全です。',
      },
      {
        q: 'WiFi が不安定な環境では？',
        a: 'LexiClash はブラウザで動きます。学校の WiFi でも、タブレット、Chromebook、パソコンでもサポートしています。',
      },
    ],
    features: [
      { icon: '⚡', text: '無料。30秒登録で、全セッション成績記録。' },
      { icon: '🎯', text: '3つのゲーム：Boggle、Word Hunt、Word Wheel' },
      { icon: '👥', text: 'ライブマルチプレイヤー — 1セッション最大30人' },
      { icon: '⚔️', text: '1v1 デュエル — ペアや小グループ練習向け' },
      { icon: '📚', text: 'あなたの単語リスト — どの単元、どの科目でも' },
      { icon: '🌍', text: '5言語：英語、ヘブライ語（RTL）、スペイン語、スウェーデン語、日本語' },
      { icon: '📊', text: '先生用ダッシュボード：生徒ごとの成績 + 苦手な単語がわかる' },
      { icon: '💸', text: 'すべて無料 — プレミアムなし' },
    ],
    compareRows: [
      ['すべて無料', '✓', '限定的', '✓ 基本', '限定的'],
      ['無料アカウント', '✓ いつも', '✗ 有料', '✗ 有料', '✗ 有料'],
      ['単語ゲーム', '✓ Boggle/Wheel/Anagram', '✗ カード', '✗ テンプレート', '✗ クイズ'],
      ['ライブマルチプレイヤー', '✓', '✓ 有料', '✗', '✓'],
      ['1v1デュエル', '✓', '✓ 有料', '✗', '✗'],
      ['5言語 + RTL', '✓', '✗', '✗', '✗'],
      ['自分のリスト', '✓', '✓', '✓', '✓'],
      ['ダッシュボード', '✓ 無料', '✓ 有料', '基本', '✓ 有料'],
    ],
    useCases: [
      { tag: 'ウォームアップ', title: '5分のオープナー', desc: '昨日の単語リストから Word Wheel — クラスを起こします。' },
      { tag: 'レビュー', title: '単元の終わり', desc: '単元の30語でクラス Boggle。ダッシュボードで足りない部分がわかります。' },
      { tag: 'ESL', title: 'ターゲット言語', desc: '生徒の言語で — EN、HE、ES、SV、JA対応。' },
      { tag: '代講', title: '代講用', desc: '準備なし — リスト選んで、コード見せて、生徒がプレイ。10分で終了。' },
    ],
    ctaHeading: '授業の終わりに10分残った？',
    ctaSubtitle: 'リストを選択。コードを表示。プレイ。ダッシュボードを確認。それが全体のループです。',
    ctaPrimaryButtonLabel: '▶ クラスルームゲームを開始',
    ctaSecondaryButtonLabel: '教育ハブを見る',
    metadataLabels: {
      languages: '5言語',
      gradeLevel: '4-12年生 + 成人ESL',
      accounts: '無料の生徒アカウント',
      duration: '5分間のセッション',
    },
    sections: {
      whatYouGet: 'あなたが得るもの。',
      comparison: 'LexiClash vs. 他のアプリ。',
      comparisonSubtitle: '正直な比較。みんなに向いているわけじゃない — paywall なしの単語ゲームを求めてる先生だけ。',
      howTeachersUse: '先生はどう使うか。',
    },
  },
};

export function getVocabClassroomContent(locale: string): LocaleContent {
  const normalizedLocale = locale.toLowerCase().split('-')[0];

  if (normalizedLocale === 'en' || !EDUCATION_LOCALES.includes(normalizedLocale as EducationLocale)) {
    return CONTENT.en;
  }

  return CONTENT[normalizedLocale as EducationLocale];
}
