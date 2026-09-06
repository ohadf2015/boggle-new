import { dictionaryFloor } from '@/lib/seo/dictionaryStats';
import type { DepthSection } from '@/components/education/EducationDepthSections';
export type { DepthSection };

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
  /** Secondary hero button + related-links nav. Previously hardcoded English. */
  duelCta: { label: string; note: string };
  related: { label: string; esl: string; teachers: string; hub: string };
  whyTitle: string;
  whyPoints: [string, string, string, string];
  /**
   * Mechanism blocks — the thing a 3,000-word teacher-blog listicle cannot write,
   * because it needs the constants. `__tests__/depthSections.test.ts` pins every
   * figure to its source module.
   */
  depth: DepthSection[];
  /**
   * Copy around the derived format table. `{count}`, `{live}` and `{practice}` are
   * substituted at render time from the registries in lib/education/playFormats.ts —
   * the number is never written here, because it changes when a mode ships.
   */
  playFormats: {
    heading: string;
    intro: string;
    liveLabel: string;
    practiceLabel: string;
  };
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

export const EDUCATION_LOCALES = ['en', 'he', 'es', 'sv', 'ja', 'ru'] as const;
export type EducationLocale = (typeof EDUCATION_LOCALES)[number];

const CONTENT: Record<EducationLocale, LocaleContent> = {
  en: {
    metaTitle: 'Free Classroom Vocabulary Games — Live Multiplayer, 6 Languages | LexiClash',
    metaDescription:
      'Free vocabulary games for the classroom. Live whole-class multiplayer, 1v1 vocabulary duels, and custom curriculum word lists. Supports 6 languages including Hebrew and Russian. Runs in any browser. Free to start.',
    ogTitle: 'Free Vocabulary Games for Classrooms',
    ogDescription:
      'Live multiplayer vocabulary games for teachers. Whole-class challenges, 1v1 duels, custom word lists, 6 languages. Student accounts always free.',
    twitterDescription:
      'The classroom vocabulary game teachers actually use. Live multiplayer, 1v1 duels, your word lists, six languages — student accounts are always free.',
    heroTag: '★ For Teachers ★ Free to Start ★',
    heroH1: {
      line1: 'Free',
      highlight: 'Vocabulary',
      line2: 'Games. Real Classrooms.',
      line3: 'Free accounts.',
    },
    heroSubtitle:
      'The classroom vocabulary game teachers actually use. Live multiplayer, 1v1 duels, your word lists, six languages — student accounts are always free.',
    ctaSubLabel: 'Free · Student accounts free',
    duelCta: { label: '⚔ Run a 1v1 Duel', note: 'Pair students head-to-head' },
    related: {
      label: 'Related education resources',
      esl: '→ ESL Word Games',
      teachers: '→ Games for Teachers',
      hub: '→ Education Hub',
    },
    whyTitle: 'Why teachers pick LexiClash',
    whyPoints: [
      'Free student accounts. Quick signup, then tracks XP and progress forever.',
      'Word-formation, not flashcards. Beats Quizlet for spelling + recall.',
      'Six languages with full dictionaries. ESL, Hebrew immersion, Spanish bilingual — all native.',
      'Free: 3 classes of up to 50 students. No ads in the classroom.',
    ],
    depth: [
      {
        heading: 'How big the word list behind the games is',
        answer:
          `Every language has its own validation dictionary rather than one English list translated. English recognises over ${dictionaryFloor('en', 'en')} words, Spanish over ${dictionaryFloor('es', 'en')}, Swedish over ${dictionaryFloor('sv', 'en')}, Hebrew over ${dictionaryFloor('he', 'en')} and Russian over ${dictionaryFloor('ru', 'en')}. Japanese boards are hiragana, validated against over ${dictionaryFloor('ja', 'en')} hiragana words.`,
        points: [
          'The dictionaries are independent word sets per language, not one list translated, so a Hebrew round is judged against Hebrew and laid out right-to-left.',
          'Japanese boards are kana, so the kanji compound list seeds boards but never judges a submitted word.',
          "A teacher's own lesson list drives the practice modes directly, so a class drills this week's words without leaving the rest of the language behind.",
          'Six languages ship with their own dictionary: English, Hebrew, Swedish, Japanese, Spanish, and Russian.',
        ],
      },
      {
        heading: 'One word list, both halves of the lesson',
        answer:
          'One word list drives both halves of the lesson. The class plays a shared live board together, then each student drills the same words alone across seven practice modes. Three tiers — support, core, and challenge — decide which words each child sees in that solo practice.',
        points: [
          'The free tier covers 3 classes of 50 students each, and Teacher Pro at $9/month adds unlimited classes and the progress reports.',
          '50 students is the technical ceiling for one live room, so the free cap and the engine agree rather than the paywall arriving first.',
          'Live controls during a round: pause and resume, plus thirty seconds, skip a word, and end the round.',
          'After the round the results screen shows the words the class missed, and the shareable summary stays class-level.',
        ],
      },
    ],
    playFormats: {
      heading: 'One word list, {count} ways to play it',
      intro:
        'Upload a lesson list once and it drives every format the product has: {live} modes a whole class plays live together, and {practice} drills a student runs alone on the same words. Nothing is re-entered, and a word added on Monday appears in all of them.',
      liveLabel: '{live} live class modes',
      practiceLabel: '{practice} solo practice types',
    },
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
      { icon: '👥', text: 'Live multiplayer a whole class per session' },
      { icon: '⚔️', text: '1v1 vocabulary duels for paired practice or sub-team rounds' },
      { icon: '📚', text: 'Upload your own curriculum word lists — any unit, any subject' },
      { icon: '🌍', text: 'Six languages: English, Hebrew (RTL), Spanish, Swedish, Japanese, Russian' },
      { icon: '📊', text: 'Teacher dashboard: per-student accuracy + missed-word patterns' },
      { icon: '💸', text: 'Free: 3 classes of up to 50 students — Pro ($9/mo) adds printable reports' },
    ],
    compareRows: [
      ['Free tier (full features)', '✓', 'Limited', '✓ basic', 'Limited'],
      ['Free student accounts', '✓ always free', '✗ paid tiers', '✗ paid tiers', '✗ paid tiers'],
      ['Word-formation gameplay', '✓ Boggle/Wheel/Anagram', '✗ flashcards', '✗ templates', '✗ quizzes'],
      ['Live whole-class multiplayer', '✓', '✓ paid', '✗', '✓'],
      ['1v1 vocabulary duels', '✓', '✓ paid', '✗', '✗'],
      ['6 languages incl. RTL', '✓', '✗', '✗', '✗'],
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
      languages: '6 languages',
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
    metaTitle: 'משחקי אוצר מילים חינמיים בכיתה — ריבוי משתתפים חי, 6 שפות | LexiClash',
    metaDescription:
      'משחקי אוצר מילים חינמיים לכיתה. ריבוי משתתפים חי בכיתה שלמה, דו־קרבות אוצר מילים 1v1, ורשימות מילים מהתוכנית. 6 שפות כולל עברית. כל דפדפן. חינם להתחלה.',
    ogTitle: 'משחקי אוצר מילים חינמיים לכיתה',
    ogDescription:
      'משחקי ריבוי משתתפים חיים למורים. אתגרים לכיתה שלמה, דו־קרבות 1v1, רשימות מילים משלכם, 6 שפות. חשבונות תלמידים תמיד חינמיים.',
    twitterDescription:
      'משחק אוצר המילים שמורים באמת משתמשים בו. ריבוי משתתפים חי, דו־קרבות, הרשימות שלכם, 6 שפות — חשבונות תלמידים חינמיים תמיד.',
    heroTag: '★ למורים ★ חינם להתחלה ★',
    heroH1: {
      line1: 'חינם',
      highlight: 'אוצר מילים',
      line2: 'משחקים. כיתות אמיתיות.',
      line3: 'חשבונות חינמיים.',
    },
    heroSubtitle:
      'משחק אוצר המילים שמורים באמת משתמשים בו. ריבוי משתתפים חי, דו־קרבות, הרשימות שלכם, 6 שפות — חשבונות תלמידים חינמיים תמיד.',
    ctaSubLabel: 'חינם · חשבונות תלמידים חינמיים',
    duelCta: { label: '⚔ הפעילו דו-קרב 1 על 1', note: 'שבצו תלמידים זה מול זה' },
    related: {
      label: 'משאבי הוראה נוספים',
      esl: '→ משחקי אנגלית ESL',
      teachers: '→ משחקים למורים',
      hub: '→ מרכז ההוראה',
    },
    whyTitle: 'למה מורים בוחרים ב־LexiClash',
    whyPoints: [
      'חשבונות תלמידים חינמיים. הרשמה של 30 שניות, ואז מעקב אחר ההתקדמות לתמיד.',
      'משחקי בניית מילים, לא כרטיסיות. עדיף מ־Quizlet לאיות ולזיכרון.',
      '6 שפות עם מילונים מלאים. ESL, הטמעת עברית, ספרדית דו־לשונית — הכל בשפת אם.',
      'כל הכיתה בחינם: 3 כיתות של עד 50 תלמידים. Teacher Pro ($9/חודש) מוסיף כיתות ללא הגבלה ודוחות.',
    ],
    depth: [
      {
        heading: 'כמה גדול מאגר המילים שמאחורי המשחקים',
        answer:
          `לכל שפה יש מילון אימות משלה, ולא רשימה אנגלית מתורגמת. אנגלית מזהה מעל ${dictionaryFloor('en', 'he')} מילים, ספרדית מעל ${dictionaryFloor('es', 'he')}, שוודית מעל ${dictionaryFloor('sv', 'he')}, עברית מעל ${dictionaryFloor('he', 'he')} ורוסית מעל ${dictionaryFloor('ru', 'he')}. לוחות יפניים הם הירגאנה, ונבדקים מול מעל ${dictionaryFloor('ja', 'he')} מילים בהירגאנה.`,
        points: [
          'המילונים הם אוספי מילים עצמאיים לכל שפה, ולא רשימה אחת מתורגמת — סיבוב בעברית נשפט מול עברית ומוצג מימין לשמאל.',
          'לוחות יפניים הם קאנה, ולכן רשימת צירופי הקאנג\'י משמשת לבניית הלוח בלבד ולעולם לא לשיפוט מילה שנשלחה.',
          'רשימת המילים של המורה מזינה ישירות את מצבי התרגול, כך שהכיתה מתרגלת בדיוק את מילות השבוע בלי לוותר על שאר השפה.',
          'שש שפות עם מילון משלהן: אנגלית, עברית, שוודית, יפנית, ספרדית ורוסית.',
        ],
      },
      {
        heading: 'רשימת מילים אחת, שני חלקי השיעור',
        answer:
          'רשימת מילים אחת מזינה את שני חלקי השיעור. הכיתה משחקת יחד על לוח חי משותף, ואז כל תלמיד מתרגל את אותן מילים לבד בשבעה מצבי תרגול. שלוש רמות — תמיכה, ליבה ואתגר — קובעות אילו מילים כל ילד רואה בתרגול העצמאי.',
        points: [
          'המסלול החינמי כולל 3 כיתות עם 50 תלמידים בכל אחת, ו-Teacher Pro ב-$9 לחודש מוסיף כיתות ללא הגבלה ואת דוחות ההתקדמות.',
          '50 תלמידים הם התקרה הטכנית של חדר חי אחד, כך שהמגבלה החינמית והמנוע מסכימים.',
          'שליטה חיה במהלך סיבוב: השהיה והמשך, תוספת שלושים שניות, דילוג על מילה וסיום הסיבוב.',
          'בתום הסיבוב מסך התוצאות מציג את המילים שהכיתה פספסה, והסיכום לשיתוף נשאר ברמת הכיתה.',
        ],
      },
    ],
    playFormats: {
      heading: 'רשימת מילים אחת, {count} דרכים לשחק בה',
      intro:
        'מעלים רשימת שיעור פעם אחת והיא מזינה כל פורמט במוצר: {live} מצבים שהכיתה כולה משחקת יחד בשידור חי, ו-{practice} תרגילים שתלמיד מריץ לבד על אותן מילים. שום דבר לא מוקלד מחדש, ומילה שנוספה ביום שני מופיעה בכולם.',
      liveLabel: '{live} מצבי כיתה חיים',
      practiceLabel: '{practice} סוגי תרגול עצמאי',
    },
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
      { icon: '👥', text: 'ריבוי משתתפים חי — כל הכיתה במשחק אחד' },
      { icon: '⚔️', text: 'דו־קרבות 1v1 לתרגול בזוגות או בסבבי קבוצות' },
      { icon: '📚', text: 'העלו את רשימות המילים שלכם — כל יחידה, כל מקצוע' },
      { icon: '🌍', text: '6 שפות: אנגלית, עברית (RTL), ספרדית, שוודית, יפנית, רוסית' },
      { icon: '📊', text: 'לוח מורה: דיוק לכל תלמיד + אנליטיקה של מילים קשות' },
      { icon: '💸', text: 'חינם: 3 כיתות של עד 50 תלמידים. Teacher Pro ($9/חודש) מוסיף דוחות' },
    ],
    compareRows: [
      ['כל התכונות בחינם', '✓', 'מוגבל', '✓ בסיסי', 'מוגבל'],
      ['חשבונות תלמידים חינמיים', '✓ תמיד', '✗ בתשלום', '✗ בתשלום', '✗ בתשלום'],
      ['משחקי יצירת מילים', '✓ Boggle/Wheel/Anagram', '✗ כרטיסיות', '✗ תבניות', '✗ חידונים'],
      ['ריבוי משתתפים חי', '✓', '✓ בתשלום', '✗', '✓'],
      ['דו־קרבות 1v1', '✓', '✓ בתשלום', '✗', '✗'],
      ['6 שפות + RTL', '✓', '✗', '✗', '✗'],
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
      languages: '6 שפות',
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
    metaTitle: 'Juegos de vocabulario gratis para el aula — Multijugador en vivo, 6 idiomas | LexiClash',
    metaDescription:
      'Juegos de vocabulario gratis para la clase. Multijugador en vivo, duelos de vocabulario 1v1, tus listas de palabras. 6 idiomas incl. hebreo y ruso. Cualquier navegador. Gratis para empezar.',
    ogTitle: 'Juegos de vocabulario gratis para el aula',
    ogDescription:
      'Juegos de vocabulario en vivo para maestros. Desafíos para toda la clase, duelos 1v1, tus listas, 6 idiomas. Cuentas de estudiantes gratis para empezar.',
    twitterDescription:
      'El juego de vocabulario que los maestros usan. Multijugador en vivo, duelos, tus listas, 6 idiomas — cuentas de estudiantes gratis para empezar.',
    heroTag: '★ Para Maestros ★ Gratis Siempre ★',
    heroH1: {
      line1: 'Gratis',
      highlight: 'Vocabulario',
      line2: 'Juegos. Aulas Reales.',
      line3: 'Cuentas gratis.',
    },
    heroSubtitle:
      'El juego de vocabulario que los maestros usan. Multijugador en vivo, duelos, tus listas, 6 idiomas — cuentas de estudiantes gratis para empezar.',
    ctaSubLabel: 'Gratis · Cuentas de estudiantes gratis',
    duelCta: { label: '⚔ Iniciar un duelo 1 vs 1', note: 'Enfrenta a los estudiantes de a dos' },
    related: {
      label: 'Recursos educativos relacionados',
      esl: '→ Juegos de palabras ESL',
      teachers: '→ Juegos para profesores',
      hub: '→ Centro educativo',
    },
    whyTitle: 'Por qué los maestros eligen LexiClash',
    whyPoints: [
      'Cuentas gratis. Registro en 30 segundos, luego sigue el progreso para siempre.',
      'Formar palabras, no tarjetas. Mejor que Quizlet para ortografía y memoria.',
      '6 idiomas con diccionarios completos. ESL, inmersión hebraica, bilingüe español — todo nativo.',
      'Toda tu clase gratis: 3 clases de hasta 50. Pro ($9/mes) añade informes.',
    ],
    depth: [
      {
        heading: 'Qué tamaño tiene el diccionario detrás de los juegos',
        answer:
          `Cada idioma tiene su propio diccionario de validación, no una lista inglesa traducida. El inglés reconoce más de ${dictionaryFloor('en', 'es')} palabras, el español más de ${dictionaryFloor('es', 'es')}, el sueco más de ${dictionaryFloor('sv', 'es')}, el hebreo más de ${dictionaryFloor('he', 'es')} y el ruso más de ${dictionaryFloor('ru', 'es')}. El japonés valida más de ${dictionaryFloor('ja', 'es')} palabras en hiragana.`,
        points: [
          'Los diccionarios son conjuntos de palabras independientes por idioma, así que una ronda en hebreo se juzga contra el hebreo y se muestra de derecha a izquierda.',
          'Los tableros japoneses son kana, así que la lista de compuestos kanji genera tableros pero nunca juzga una palabra enviada.',
          'La lista de la docente alimenta directamente los modos de práctica, así que la clase practica justo las palabras de esta semana sin perder el resto del idioma.',
          'Seis idiomas con diccionario propio: inglés, hebreo, sueco, japonés, español y ruso.',
        ],
      },
      {
        heading: 'Una lista de palabras, las dos mitades de la clase',
        answer:
          'Una sola lista alimenta las dos mitades de la clase. El grupo juega junto en un tablero en vivo y después cada estudiante practica esas mismas palabras a solas en siete modos. Tres niveles — apoyo, base y desafío — deciden qué palabras ve cada niño en esa práctica individual.',
        points: [
          'El plan gratuito cubre 3 clases de 50 estudiantes cada una, y Teacher Pro por $9/mes añade clases ilimitadas y los informes de progreso.',
          '50 estudiantes es el techo técnico de una sala en vivo, así que el límite gratuito y el motor coinciden.',
          'Controles en vivo durante la ronda: pausar y reanudar, treinta segundos más, saltar una palabra y terminar la ronda.',
          'Al terminar, la pantalla de resultados muestra las palabras que la clase falló, y el resumen para compartir se queda a nivel de clase.',
        ],
      },
    ],
    playFormats: {
      heading: 'Una lista de palabras, {count} formas de jugarla',
      intro:
        'Sube una lista de clase una vez y alimenta todos los formatos del producto: {live} modos que la clase entera juega en vivo y {practice} ejercicios que cada estudiante hace a solas con esas mismas palabras. Nada se vuelve a escribir, y una palabra añadida el lunes aparece en todos.',
      liveLabel: '{live} modos de clase en vivo',
      practiceLabel: '{practice} tipos de práctica individual',
    },
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
      { icon: '👥', text: 'Multijugador en vivo — toda la clase por sesión' },
      { icon: '⚔️', text: 'Duelos 1v1 para parejas o equipos' },
      { icon: '📚', text: 'Carga tus listas — cualquier unidad, cualquier materia' },
      { icon: '🌍', text: '6 idiomas: inglés, hebreo (RTL), español, sueco, japonés, ruso' },
      { icon: '📊', text: 'Panel de maestro: precisión por alumno + palabras difíciles' },
      { icon: '💸', text: 'Gratis: 3 clases de hasta 50 alumnos. Pro ($9/mes) añade informes' },
    ],
    compareRows: [
      ['Todo gratis', '✓', 'Limitado', '✓ básico', 'Limitado'],
      ['Cuentas gratis', '✓ siempre', '✗ pago', '✗ pago', '✗ pago'],
      ['Juegos de palabras', '✓ Boggle/Wheel/Anagrama', '✗ tarjetas', '✗ plantillas', '✗ cuestionarios'],
      ['Multijugador', '✓', '✓ pago', '✗', '✓'],
      ['Duelos 1v1', '✓', '✓ pago', '✗', '✗'],
      ['6 idiomas + RTL', '✓', '✗', '✗', '✗'],
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
      languages: '6 idiomas',
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
    metaTitle: 'Gratis ordförråd spel för klassrummet — Live multiplayer, 6 språk | LexiClash',
    metaDescription:
      'Gratis ordförråd spel för klassrummet. Live multiplayer, 1v1 ordförrådsdueller, dina ordlistor. 6 språk inkl. hebreiska och ryska. Vilken webbläsare som helst. Gratis att börja.',
    ogTitle: 'Gratis ordförråd spel för klassrummet',
    ogDescription:
      'Live multiplayer ordförråd spel för lärare. Helklassutmaningar, 1v1 dueller, dina ordlistor, 6 språk. Studentkonton alltid gratis.',
    twitterDescription:
      'Ordförråds spelet som lärare faktiskt använder. Live multiplayer, dueller, dina ordlistor, 6 språk — studentkonton alltid gratis.',
    heroTag: '★ För Lärare ★ Gratis Att Börja ★',
    heroH1: {
      line1: 'Gratis',
      highlight: 'Ordförråds',
      line2: 'Spel. Verkliga Klassrum.',
      line3: 'Gratis konton.',
    },
    heroSubtitle:
      'Ordförråds spelet som lärare använder. Live multiplayer, dueller, dina ordlistor, 6 språk — studentkonton gratis alltid.',
    ctaSubLabel: 'Gratis · Studentkonton gratis',
    duelCta: { label: '⚔ Kör en 1-mot-1-duell', note: 'Ställ elever mot varandra' },
    related: {
      label: 'Relaterade lärarresurser',
      esl: '→ ESL-ordspel',
      teachers: '→ Spel för lärare',
      hub: '→ Utbildningshubben',
    },
    whyTitle: 'Varför lärare väljer LexiClash',
    whyPoints: [
      'Gratis studentkonton. Registrering på 30 sekunder, sedan framstegen sparas.',
      'Ordbildning, inte flashkort. Bättre än Quizlet för stavning och minne.',
      '6 språk med kompletta ordböcker. ESL, hebreisk nedsänkning, spansk tvåspråkig — allt modersmål.',
      'Hela klassen gratis: 3 klasser med upp till 50 elever. Teacher Pro ($9/månad) lägger till obegränsade klasser och rapporter.',
    ],
    depth: [
      {
        heading: 'Hur stor ordlistan bakom spelen är',
        answer:
          `Varje språk har sin egen valideringsordlista i stället för en översatt engelsk lista. Engelska känner igen över ${dictionaryFloor('en', 'sv')} ord, spanska över ${dictionaryFloor('es', 'sv')}, svenska över ${dictionaryFloor('sv', 'sv')}, hebreiska över ${dictionaryFloor('he', 'sv')} och ryska över ${dictionaryFloor('ru', 'sv')}. Japanska bräden valideras mot över ${dictionaryFloor('ja', 'sv')} hiraganaord.`,
        points: [
          'Ordlistorna är fristående ordmängder per språk, inte en översatt lista, så en hebreisk runda bedöms mot hebreiska och visas från höger till vänster.',
          'Japanska bräden är kana, så listan med kanjisammansättningar bygger bräden men bedömer aldrig ett inskickat ord.',
          'Lärarens egen ordlista driver övningslägena direkt, så klassen övar precis veckans ord utan att lämna resten av språket.',
          'Sex språk med egen ordlista: engelska, hebreiska, svenska, japanska, spanska och ryska.',
        ],
      },
      {
        heading: 'En ordlista, lektionens båda halvor',
        answer:
          'En enda ordlista driver lektionens båda halvor. Klassen spelar tillsammans på ett delat direktbräde, och sedan övar varje elev samma ord på egen hand i sju övningslägen. Tre nivåer — stöd, bas och utmaning — avgör vilka ord varje barn möter i den egna övningen.',
        points: [
          'Gratisplanen täcker 3 klasser med 50 elever vardera, och Teacher Pro för $9/månad lägger till obegränsade klasser och rapporterna.',
          '50 elever är det tekniska taket för ett direktrum, så gratisgränsen och motorn är överens.',
          'Direktkontroller under rundan: pausa och återuppta, trettio sekunder till, hoppa över ett ord och avsluta rundan.',
          'Efter rundan visar resultatskärmen orden klassen missade, och sammanfattningen som delas stannar på klassnivå.',
        ],
      },
    ],
    playFormats: {
      heading: 'En ordlista, {count} sätt att spela den',
      intro:
        'Ladda upp en lektionslista en gång så driver den alla format produkten har: {live} lägen som hela klassen spelar live tillsammans och {practice} övningar som en elev kör på egen hand med samma ord. Inget skrivs in igen, och ett ord som lagts till på måndagen dyker upp i alla.',
      liveLabel: '{live} direktlägen för klassen',
      practiceLabel: '{practice} egna övningstyper',
    },
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
      { icon: '👥', text: 'Live multiplayer — hela klassen per spel' },
      { icon: '⚔️', text: '1v1 dueller för par eller lag' },
      { icon: '📚', text: 'Dina ordlistor — vilken enhet, vilket ämne som helst' },
      { icon: '🌍', text: '6 språk: engelska, hebreiska (RTL), spanska, svenska, japanska, ryska' },
      { icon: '📊', text: 'Lärarpanel: precision per elev + vilka ord som är svåra' },
      { icon: '💸', text: 'Allt gratis — ingen premium' },
    ],
    compareRows: [
      ['Allt gratis', '✓', 'Begränsad', '✓ grund', 'Begränsad'],
      ['Gratis konton', '✓ alltid', '✗ betald', '✗ betald', '✗ betald'],
      ['Ordbildningsspel', '✓ Boggle/Wheel/Anagram', '✗ kort', '✗ mallar', '✗ quiz'],
      ['Live multiplayer', '✓', '✓ betald', '✗', '✓'],
      ['1v1 dueller', '✓', '✓ betald', '✗', '✗'],
      ['6 språk + RTL', '✓', '✗', '✗', '✗'],
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
      languages: '6 språk',
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
    metaTitle: '無料の教室向け語彙ゲーム — ライブマルチプレイヤー、6言語 | LexiClash',
    metaDescription:
      '無料で使える教室向けの語彙ゲーム。ライブマルチプレイヤー、1v1デュエル、自分の単語リスト。英語、スペイン語、ヘブライ語、スウェーデン語、日本語、ロシア語の6言語に対応。どのブラウザでも動作。無料で始められます。',
    ogTitle: '無料の教室向け語彙ゲーム',
    ogDescription:
      '先生向けのライブ語彙ゲーム。クラス全体チャレンジ、1v1デュエル、自分の単語リスト、6言語。学生アカウントはいつも無料。',
    twitterDescription:
      '先生が実際に使う教室向け語彙ゲーム。ライブマルチプレイヤー、デュエル、あなたのリスト、6言語 — 学生アカウントはいつも無料。',
    heroTag: '★ 先生向け ★ 無料で開始 ★',
    heroH1: {
      line1: '無料の',
      highlight: '語彙',
      line2: 'ゲーム。本物の教室。',
      line3: '無料アカウント。',
    },
    heroSubtitle:
      '先生が実際に使う語彙ゲーム。ライブマルチプレイヤー、デュエル、あなたのリスト、6言語 — 学生アカウントはいつも無料。',
    ctaSubLabel: '無料 · 学生アカウント無料',
    duelCta: { label: '⚔ 1対1のデュエルを開始', note: '生徒どうしを対戦させる' },
    related: {
      label: '関連する教育リソース',
      esl: '→ ESL 英単語ゲーム',
      teachers: '→ 先生向けゲーム',
      hub: '→ 教育ハブ',
    },
    whyTitle: 'LexiClashが選ばれる理由',
    whyPoints: [
      '無料。30秒で登録して、あとはずっと成績が記録される。',
      '単語を作るゲーム。フラッシュカードじゃない。スペリングと記憶で Quizlet より優れている。',
      '6言語、完全な辞書付き。ESL、ヘブライ語コース、スペイン語バイリンガル — すべてネイティブ。',
      '無料プランは3クラス・各50人まで。クラス全員が参加できます。授業中に広告は出ません。',
    ],
    depth: [
      {
        heading: 'ゲームを支える辞書の規模',
        answer:
          `各言語には英語を翻訳したものではなく、それぞれ独自の判定辞書があります。英語は${dictionaryFloor('en', 'ja')}語以上、スペイン語は${dictionaryFloor('es', 'ja')}語以上、スウェーデン語は${dictionaryFloor('sv', 'ja')}語以上、ヘブライ語は${dictionaryFloor('he', 'ja')}語以上、ロシア語は${dictionaryFloor('ru', 'ja')}語以上を認識します。日本語の盤はひらがなで、${dictionaryFloor('ja', 'ja')}語以上のひらがな語で判定されます。`,
        points: [
          '辞書は言語ごとに独立した語彙集合で、翻訳した一つのリストではありません。ヘブライ語のラウンドはヘブライ語で判定され、右から左に表示されます。',
          '日本語の盤はかなです。漢字熟語のリストは盤の生成にのみ使われ、提出された単語の判定には使われません。',
          '先生自身の単語リストが練習モードを直接動かすので、クラスはその週の単語をそのまま練習できます。',
          '6言語がそれぞれの辞書を備えています：英語、ヘブライ語、スウェーデン語、日本語、スペイン語、ロシア語。',
        ],
      },
      {
        heading: '単語リスト1つで、授業の両方の場面を',
        answer:
          '1つの単語リストが授業の両方の場面を動かします。クラスは共有のライブ盤で一緒に遊び、そのあと各生徒が同じ単語を7つの練習モードで一人で練習します。サポート・コア・チャレンジの3段階が、その生徒が個人練習で出会う単語を決めます。',
        points: [
          '無料プランは3クラス・各クラス50人まで。Teacher Pro（月$9）でクラス数が無制限になり、進捗レポートが加わります。',
          '1つのライブルームの技術的な上限が50人で、無料プランの上限はそれに合わせてあります。',
          'ラウンド中の操作は4つ：一時停止と再開、30秒追加、単語をスキップ、ラウンド終了。',
          'ラウンド後、結果画面にクラスが取りこぼした単語が表示されます。共有用のまとめはクラス単位で、生徒名は含みません。',
        ],
      },
    ],
    playFormats: {
      heading: '単語リスト1つ、遊び方は{count}通り',
      intro:
        'レッスンのリストを一度アップロードすれば、製品のすべての形式がそれで動きます。クラス全体が一緒にライブで遊ぶ{live}つのモードと、生徒が同じ単語で一人で取り組む{practice}種類のドリルです。入力し直す必要はなく、月曜に追加した単語はそのすべてに現れます。',
      liveLabel: 'ライブのクラスモード{live}種類',
      practiceLabel: '個人練習{practice}種類',
    },
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
      { icon: '🌍', text: '6言語：英語、ヘブライ語（RTL）、スペイン語、スウェーデン語、日本語、ロシア語' },
      { icon: '📊', text: '先生用ダッシュボード：生徒ごとの成績 + 苦手な単語がわかる' },
      { icon: '💸', text: '無料プランは3クラス・各50人 — Teacher Pro（月$9）でレポート追加' },
    ],
    compareRows: [
      ['無料プランあり', '✓', '限定的', '✓ 基本', '限定的'],
      ['無料アカウント', '✓ いつも', '✗ 有料', '✗ 有料', '✗ 有料'],
      ['単語ゲーム', '✓ Boggle/Wheel/Anagram', '✗ カード', '✗ テンプレート', '✗ クイズ'],
      ['ライブマルチプレイヤー', '✓', '✓ 有料', '✗', '✓'],
      ['1v1デュエル', '✓', '✓ 有料', '✗', '✗'],
      ['6言語 + RTL', '✓', '✗', '✗', '✗'],
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
      languages: '6言語',
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

  ru: {
    metaTitle: 'Бесплатные словарные игры для класса — Живой мультиплеер, 6 языков | LexiClash',
    metaDescription:
      'Бесплатные словарные игры для класса. Живой мультиплеер, дуэли 1v1, ваши списки слов. Английский, испанский, иврит, шведский, японский, русский. Любой браузер. Бесплатный старт.',
    ogTitle: 'Бесплатные словарные игры для класса',
    ogDescription:
      'Живые словарные игры для учителей. Конкурсы для целого класса, дуэли 1v1, ваши списки, 6 языков. Ученические аккаунты бесплатны.',
    twitterDescription:
      'Словарная игра, которую действительно используют учителя. Живой мультиплеер, дуэли, ваши списки, 6 языков — ученические аккаунты бесплатны.',
    heroTag: '★ Для учителей ★ Бесплатный старт ★',
    heroH1: {
      line1: 'Бесплатные',
      highlight: 'словарные',
      line2: 'игры. Реальные классы.',
      line3: 'Бесплатные аккаунты.',
    },
    heroSubtitle:
      'Словарная игра, которую действительно используют учителя. Живой мультиплеер, дуэли, ваши списки, 6 языков — ученические аккаунты бесплатны.',
    ctaSubLabel: 'Бесплатно · Ученические аккаунты бесплатны',
    duelCta: { label: '⚔ Запустить дуэль 1 на 1', note: 'Ставьте учеников друг против друга' },
    related: {
      label: 'Похожие материалы для учителей',
      esl: '→ Игры со словами ESL',
      teachers: '→ Игры для учителей',
      hub: '→ Образовательный центр',
    },
    whyTitle: 'Почему учителя выбирают LexiClash',
    whyPoints: [
      'Бесплатные ученические аккаунты. Регистрация за 30 секунд, потом отслеживание прогресса навсегда.',
      'Словообразование, не карточки. Лучше Quizlet для орфографии и запоминания.',
      '6 языков со скомплектованными словарями. ESL, иврит погружение, испанский билингвизм — всё на родном языке.',
      'Бесплатно: 3 класса по 50 учеников. Без рекламы на уроке.',
    ],
    depth: [
      {
        heading: 'Насколько велик словарь за играми',
        answer:
          `У каждого языка свой словарь проверки, а не переведённый английский список. Английский распознаёт более ${dictionaryFloor('en', 'ru')} слов, испанский более ${dictionaryFloor('es', 'ru')}, шведский более ${dictionaryFloor('sv', 'ru')}, иврит более ${dictionaryFloor('he', 'ru')} и русский более ${dictionaryFloor('ru', 'ru')}. Японские доски — хирагана, и проверка идёт по более чем ${dictionaryFloor('ja', 'ru')} слов хираганой.`,
        points: [
          'Словари — независимые наборы слов для каждого языка, а не один переведённый список: раунд на иврите проверяется по ивриту и отображается справа налево.',
          'Японские доски — кана, поэтому список кандзи-сочетаний только генерирует доски и никогда не судит отправленное слово.',
          'Собственный список учителя напрямую питает режимы практики, поэтому класс отрабатывает именно слова этой недели.',
          'Шесть языков со своим словарём: английский, иврит, шведский, японский, испанский и русский.',
        ],
      },
      {
        heading: 'Один список слов на обе половины урока',
        answer:
          'Один список слов питает обе половины урока. Класс играет вместе на общей живой доске, а затем каждый ученик отрабатывает те же слова один в семи режимах практики. Три уровня — поддержка, база и вызов — решают, какие слова видит каждый ребёнок в этой практике.',
        points: [
          'Бесплатный план — 3 класса по 50 учеников в каждом, а Teacher Pro за $9 в месяц добавляет неограниченные классы и отчёты о прогрессе.',
          '50 учеников — технический потолок одной живой комнаты, поэтому бесплатный лимит и движок совпадают.',
          'Управление во время раунда: пауза и продолжение, плюс тридцать секунд, пропуск слова и завершение раунда.',
          'После раунда экран результатов показывает слова, которые класс не нашёл, а сводка для обмена остаётся на уровне класса.',
        ],
      },
    ],
    playFormats: {
      heading: 'Один список слов, {count} способов играть',
      intro:
        'Загрузите список урока один раз — и он питает все форматы продукта: {live} режимов, в которые класс играет вживую вместе, и {practice} тренировок, которые ученик проходит один по тем же словам. Ничего не вводится заново, а слово, добавленное в понедельник, появляется во всех.',
      liveLabel: '{live} живых режимов для класса',
      practiceLabel: '{practice} видов самостоятельной практики',
    },
    faqTitle: 'Часто задаваемые вопросы',
    faqs: [
      {
        q: 'Нужна ли регистрация ученикам?',
        a: 'Да, но это бесплатно и занимает 30 секунд. Электронная почта или аккаунт Google. Без кредитной карты, без сюрпризов.',
      },
      {
        q: 'Можем ли мы использовать собственные списки слов?',
        a: 'Да. Загрузите список в панель учителя и запустите игры в классе или дуэли 1v1 с вашей лексикой.',
      },
      {
        q: 'Как долго длятся игры?',
        a: '3–5 минут. Идеально для разминки, переходов или перерывов. Сложность и время настраиваются.',
      },
      {
        q: 'Какие классы поддерживаются?',
        a: 'Для классов 4–12, программ ESL, взрослых учащихся и двуязычных классов. Сложность адаптируется в каждой игре.',
      },
      {
        q: 'Вы продаёте данные учеников?',
        a: 'Нет, никогда. Мы соответствуем стандартам защиты данных учащихся. Полная приватность гарантирована.',
      },
      {
        q: 'Что если WiFi слабый?',
        a: 'LexiClash работает в любом браузере и при любом подключении. Работает на школьном WiFi, планшетах, Chromebook и компьютерах.',
      },
    ],
    features: [
      { icon: '⚡', text: 'Бесплатные аккаунты — регистрация за 30 секунд, отслеживание прогресса всегда' },
      { icon: '🎯', text: '3 игры: Boggle, Word Hunt, Word Wheel' },
      { icon: '👥', text: 'Живой мультиплеер — весь класс за сеанс' },
      { icon: '⚔️', text: 'Дуэли 1v1 для парной практики или командных раундов' },
      { icon: '📚', text: 'Загружайте свои списки — любая тема, любой предмет' },
      { icon: '🌍', text: '6 языков: английский, иврит (RTL), испанский, шведский, японский, русский' },
      { icon: '📊', text: 'Панель учителя: точность каждого ученика + анализ пропущенных слов' },
      { icon: '💸', text: 'Всё бесплатно — никакого премиума' },
    ],
    compareRows: [
      ['Всё бесплатно', '✓', 'Ограничено', '✓ базовое', 'Ограничено'],
      ['Бесплатные аккаунты', '✓ всегда', '✗ платно', '✗ платно', '✗ платно'],
      ['Словообразующие игры', '✓ Boggle/Wheel/Anagram', '✗ карточки', '✗ шаблоны', '✗ викторины'],
      ['Живой мультиплеер', '✓', '✓ платно', '✗', '✓'],
      ['Дуэли 1v1', '✓', '✓ платно', '✗', '✗'],
      ['6 языков + RTL', '✓', '✗', '✗', '✗'],
      ['Собственные списки', '✓', '✓', '✓', '✓'],
      ['Аналитическая панель', '✓ бесплатно', '✓ платно', 'Базовое', '✓ платно'],
    ],
    useCases: [
      { tag: 'РАЗМИНКА', title: '5-минутный старт', desc: 'Быстрый Word Wheel из вчерашнего списка — разбудит класс.' },
      { tag: 'ПОВТОРЕНИЕ', title: 'Конец модуля', desc: 'Boggle с 30 словами модуля; панель показывает, что нужно повторить.' },
      { tag: 'ESL', title: 'Практика на целевом языке', desc: 'Игра на языке учеников — EN, HE, ES, SV, JA, RU.' },
      { tag: 'ЗАМЕНА', title: 'Деятельность для замены', desc: 'Ноль подготовки — выбери список, покажи код, ученики играют. 10 минут.' },
    ],
    ctaHeading: 'Осталось 10 минут урока?',
    ctaSubtitle: 'Выбери список. Покажи код. Играйте. Посмотри панель. Это весь цикл.',
    ctaPrimaryButtonLabel: '▶ Начать классовую игру',
    ctaSecondaryButtonLabel: 'Образовательный центр',
    metadataLabels: {
      languages: '6 языков',
      gradeLevel: '4–12 классы + взрослый ESL',
      accounts: 'бесплатные ученические аккаунты',
      duration: '5-минутные сеансы',
    },
    sections: {
      whatYouGet: 'Что вы получите.',
      comparison: 'LexiClash против других.',
      comparisonSubtitle: 'Честное сравнение. Не для всех — только для учителей, которые хотят словесные игры без платёжных стен.',
      howTeachersUse: 'Как учителя его используют.',
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
