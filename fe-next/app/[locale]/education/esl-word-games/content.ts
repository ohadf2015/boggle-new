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
  heroH1: { highlight: string; rest1: string; rest2: string };
  heroSubtitle: string;
  ctaLabel: string;
  /**
   * Hero buttons. These used to be hardcoded English in page.tsx, so an es-PE
   * teacher arriving from Google read a Spanish headline above English CTAs
   * (LogRocket, 2026-08-31). Keeping them in this per-locale record means the
   * compiler refuses a locale that forgets one.
   */
  heroCtas: {
    primary: string;
    primaryNote: string;
    secondary: string;
    secondaryNote: string;
  };
  related: {
    label: string;
    vocabulary: string;
    teachers: string;
    hub: string;
  };
  /**
   * Mechanism blocks — dictionary sizes, live controls, the caps. Every figure is
   * pinned to its source constant by `__tests__/depthSections.test.ts`.
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
  /**
   * The literal ten-minute loop. Timed steps, not a feature list — this is the shape
   * that beat the competing pages on the sibling landing.
   */
  workflow: {
    heading: string;
    intro: string;
    steps: Array<{ when: string; what: string }>;
  };
  /**
   * Where this page is NOT the right tool. Naming the case a student arcade serves
   * better is worth more than pretending a single product out-breadths a library of
   * twenty-four games — and it is the honest answer to the query behind the click.
   */
  arcadeNote: { heading: string; body: string; href: string; cta: string };
  faqTitle: string;
  faqs: Array<{ q: string; a: string }>;
  features: Array<{ icon: string; text: string }>;
  proficiencyLevels: Array<{ tag: string; title: string; desc: string }>;
  sections: {
    builtFor: string;
    setLevelPerClass: string;
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
    metaTitle: 'ESL Word Games for the Classroom — Teacher-Led, 6 Languages | LexiClash',
    metaDescription: 'ESL word games you run for a whole class of English learners: students join from their phones with a six-character code, the board goes on the projector, and you set Support, Core or Challenge per student. Six languages, no student accounts, free for 3 classes of 50.',
    ogTitle: 'ESL Word Games for the Classroom',
    ogDescription: 'Live multiplayer word games for the classroom. Free student accounts, 6 dictionaries, teacher dashboard.',
    twitterDescription: 'Free ESL/EFL word games for the classroom. Live multiplayer, 6 languages, teacher dashboard.',
    heroTag: '★ ESL / EFL ★ Free To Start ★',
    heroH1: {
      highlight: 'ESL Word Games',
      rest1: 'for the',
      rest2: 'Classroom.',
    },
    heroSubtitle: 'Teacher-led word games for English learners. You pick the list and the mode, the class joins from their phones, and the projector shows the board. Six dictionaries, no student accounts, and a per-student tier for a mixed-ability room.',
    ctaLabel: 'Create Free Classroom',
    heroCtas: {
      primary: '▶ Run an ESL Game',
      primaryNote: 'Whole-class · 5 minutes',
      secondary: '⚔ Pair-up Duels',
      secondaryNote: '2-by-2 practice',
    },
    related: {
      label: 'Related education resources',
      vocabulary: '→ Classroom Vocabulary Games',
      teachers: '→ Games for Teachers',
      hub: '→ Education Hub',
    },
    depth: [
      {
        heading: 'Which dictionary an English answer is checked against',
        answer:
          `English answers are checked against a dictionary of over ${dictionaryFloor('en', 'en')} words, not a short teaching list. Each of the other five carries its own: Spanish over ${dictionaryFloor('es', 'en')}, Swedish over ${dictionaryFloor('sv', 'en')}, Hebrew over ${dictionaryFloor('he', 'en')}, Russian over ${dictionaryFloor('ru', 'en')}, and Japanese over ${dictionaryFloor('ja', 'en')} hiragana words.`,
        points: [
          'A learner who finds a real word gets credit for it, even when it was not on the lesson list — the dictionary is the full language, not the worksheet.',
          "A teacher's custom list still drives the practice drills, so the week's target vocabulary is what gets repeated.",
          'Every dictionary is a separate word set built for that language, so nothing is judged by English rules.',
          'Six languages ship with their own dictionary: English, Hebrew, Swedish, Japanese, Spanish, and Russian.',
        ],
      },
      {
        heading: 'Playing in one language while the interface is in another',
        answer:
          'The same list works in either direction. An English learner drills English words while the interface stays in their own language, because the six locale builds are separate from the dictionary a round is judged against. Hebrew renders right-to-left throughout, including the board.',
        points: [
          'Six interface languages: English, Hebrew, Swedish, Japanese, Spanish, and Russian.',
          'Nothing is machine-translated at play time: the board, the dictionary, and the interface language are three separate things.',
          'Hebrew is genuinely right-to-left, down to the direction the hard shadows fall and the way back arrows flip.',
          'Students join with a six-character code and no account, which matters most where school email addresses do not exist.',
          'The free tier covers 3 classes of 50 students each; Teacher Pro is $9/month and adds unlimited classes and reports.',
        ],
      },
      {
        heading: 'Setting the difficulty for a mixed-ability class',
        answer:
          'The board itself has three sizes — 5x5, 6x6 and 7x7 — and the teacher sets the round length and the minimum word length. Separately, each student carries one of three tiers, so the same shared board can ask different things of different children.',
        points: [
          'Board sizes are 5x5, 6x6 and 7x7 letters, and a round defaults to the 6x6 board.',
          'A minimum word length setting stops a beginner class from scoring on two-letter fragments; it defaults to three letters.',
          'Round length is set in minutes by the teacher and defaults to three minutes.',
          'Support, core and challenge decide which lesson words a student practises alone, while the live board stays shared so nobody is visibly separated.',
          'A student on the support tier sees a word bank during the live game.',
          'The dictionary does not change with difficulty — a harder board is a bigger board, not a stricter judge.',
        ],
      },
    ],
    playFormats: {
      heading: '{count} ways an English learner can drill one list',
      intro:
        'The same vocabulary list reaches a learner in {count} different shapes. {live} of them are live class modes; the other {practice} are solo drills, six of which target a single skill — definitions, synonyms, antonyms, context clues, multiple meanings, and roots and affixes.',
      liveLabel: '{live} live class modes',
      practiceLabel: '{practice} solo drills, by skill',
    },
    workflow: {
      heading: 'Ten minutes, start to finish',
      intro:
        'The whole loop fits in the last ten minutes of a lesson. You paste a list, put a code on the projector, and the class plays from their phones while you keep the controls. Nothing is printed, nothing is installed, and no student signs up for anything.',
      steps: [
        { when: '0:00', what: 'Paste this week\'s words into a lesson list, or open one you already saved.' },
        { when: '0:30', what: 'Pick a mode and a round length. The join code and QR go on the projector.' },
        { when: '1:00', what: 'Students open the browser on their phones and type six characters. No account, no email.' },
        { when: '2:00', what: 'Play. From your screen you can pause, add thirty seconds, skip a word, or end the round.' },
        { when: '8:00', what: 'The results screen lists the words the class missed. Read them out together.' },
        { when: '9:00', what: 'Set anyone who struggled to Support, or anyone bored to Challenge, for their solo practice.' },
      ],
    },
    arcadeNote: {
      heading: 'When a student arcade is the better tool',
      body:
        'This page is built for one case: a teacher running a round for a room. If what you want instead is a learner browsing dozens of self-serve games alone at home, a library site like 7ESL\'s word-games collection is the better fit — it is broader than we are, and it is meant for that. Come back here when you need the whole class on one board with the controls in your hand.',
      href: 'https://7esl.com/word-games/',
      cta: '7ESL word games',
    },
    faqTitle: 'Frequently Asked Questions',
    features: [
      { icon: '🌍', text: 'Six built-in dictionaries: English, Spanish, Hebrew (RTL), Swedish, Japanese, Russian' },
      { icon: '⚡', text: 'Free student accounts — quick one-time setup, then tracks progress forever' },
      { icon: '👥', text: 'Live multiplayer a whole class; pair-up duels for 2-by-2 practice' },
      { icon: '📈', text: 'Per-student accuracy + class-wide missed-word patterns' },
      { icon: '🎯', text: 'Five live class modes: Classic, Word Hunt, Blast, Wheel Rush, Vocab Quiz' },
      { icon: '📱', text: 'Works on any phone, tablet, Chromebook, or laptop browser' },
      { icon: '⏱️', text: '5-minute warm-up format fits any lesson plan' },
      { icon: '💸', text: 'Free to start — no student logins; free tier covers 3 classes of 50' },
    ],
    proficiencyLevels: [
      { tag: 'Support', title: 'Beginner', desc: '3-4 letter words, longer timer, sight-word focus. Use the Word Wheel mode for guided practice.' },
      { tag: 'Core', title: 'Intermediate', desc: 'Mixed lengths, standard timer. Boggle grid surfaces vocabulary patterns and prefixes.' },
      { tag: 'Challenge', title: 'Advanced', desc: 'Long words, tight timer, custom advanced lists (TOEFL, IELTS, academic vocab).' },
    ],
    sections: {
      builtFor: 'Built for English learners.',
      setLevelPerClass: 'Set the level per class.',
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
        a: 'Yes. Teachers upload their own word lists and set each student to Support, Core or Challenge. The classroom dashboard shows which words tripped which students, surfacing gaps.',
      },
      {
        q: 'Does LexiClash support adult ESL/EFL?',
        a: 'Absolutely. Adult learners and university ESL/EFL programs use LexiClash for conversation-starter icebreakers and vocabulary retention activities.',
      },
      {
        q: 'Can I use LexiClash in a bilingual program?',
        a: 'Yes. LexiClash supports English, Spanish, Hebrew, Swedish, Japanese and Russian dictionaries. Perfect for immersion and transition classrooms.',
      },
    ],
  },
  he: {
    metaTitle: 'משחקי מילים באנגלית לכיתה — בהובלת המורה, 6 שפות | LexiClash',
    metaDescription: 'משחקי מילים באנגלית שמריצים לכל הכיתה: התלמידים מצטרפים מהטלפון עם קוד בן שישה תווים, הלוח עולה על המקרן, ואתם קובעים תמיכה, ליבה או אתגר לכל תלמיד. שש שפות, בלי חשבונות תלמידים.',
    ogTitle: 'משחקי מילים באנגלית לכיתה',
    ogDescription: 'משחקי אנגלית בזמן אמת. חשבונות חינמיים, 6 מילונים, לוח מורה.',
    twitterDescription: 'משחקי אנגלית מרובי משתתפים לכיתה, בחינם.',
    heroTag: '★ אנגלית כשפה זרה ★ חינם להתחלה ★',
    heroH1: {
      highlight: 'משחקי מילים באנגלית',
      rest1: 'לכיתה',
      rest2: 'בהובלת המורה.',
    },
    heroSubtitle: 'משחקי מילים באנגלית בהובלת המורה. אתם בוחרים את הרשימה ואת המצב, הכיתה מצטרפת מהטלפונים, והמקרן מציג את הלוח. שישה מילונים, בלי חשבונות תלמידים, ורמה לכל תלמיד לכיתה מעורבת.',
    ctaLabel: 'פתחו כיתה בחינם',
    heroCtas: {
      primary: '▶ הפעילו משחק אנגלית',
      primaryNote: 'כל הכיתה · 5 דקות',
      secondary: '⚔ דו-קרב בזוגות',
      secondaryNote: 'תרגול בזוגות',
    },
    related: {
      label: 'משאבי הוראה נוספים',
      vocabulary: '→ משחקי אוצר מילים לכיתה',
      teachers: '→ משחקים למורים',
      hub: '→ מרכז ההוראה',
    },
    depth: [
      {
        heading: 'מול איזה מילון נבדקת תשובה באנגלית',
        answer:
          `תשובות באנגלית נבדקות מול מילון של מעל ${dictionaryFloor('en', 'he')} מילים, ולא מול רשימת הוראה קצרה. לכל אחת מחמש השפות האחרות יש מילון משלה: ספרדית מעל ${dictionaryFloor('es', 'he')}, שוודית מעל ${dictionaryFloor('sv', 'he')}, עברית מעל ${dictionaryFloor('he', 'he')}, רוסית מעל ${dictionaryFloor('ru', 'he')}, ויפנית מעל ${dictionaryFloor('ja', 'he')} מילים בהירגאנה.`,
        points: [
          'לומד שמוצא מילה אמיתית מקבל עליה ניקוד גם אם היא לא הייתה ברשימת השיעור — המילון הוא כל השפה, לא דף העבודה.',
          'רשימת המילים של המורה עדיין מזינה את תרגילי התרגול, כך שאוצר המילים של השבוע הוא מה שחוזר.',
          'כל מילון הוא אוסף מילים נפרד שנבנה לשפה שלו, כך ששום דבר לא נשפט לפי כללי האנגלית.',
          'שש שפות עם מילון משלהן: אנגלית, עברית, שוודית, יפנית, ספרדית ורוסית.',
        ],
      },
      {
        heading: 'לשחק בשפה אחת כשהממשק בשפה אחרת',
        answer:
          'אותה רשימה עובדת לשני הכיוונים. לומד אנגלית מתרגל מילים באנגלית בזמן שהממשק נשאר בשפה שלו, כי שש גרסאות השפה נפרדות מהמילון שמולו נשפט הסיבוב. עברית מוצגת מימין לשמאל בכל המסך, כולל הלוח.',
        points: [
          'שש שפות ממשק: אנגלית, עברית, שוודית, יפנית, ספרדית ורוסית.',
          'שום דבר לא מתורגם אוטומטית בזמן המשחק: הלוח, המילון ושפת הממשק הם שלושה דברים נפרדים.',
          'העברית היא באמת מימין לשמאל, עד לכיוון שבו נופלות הצללים החדים ולאופן שבו חיצי החזרה מתהפכים.',
          'תלמידים מצטרפים עם קוד בן שישה תווים ובלי חשבון — קריטי במקומות שבהם אין כתובות מייל בית-ספריות.',
          'המסלול החינמי כולל 3 כיתות עם 50 תלמידים בכל אחת; Teacher Pro עולה $9 לחודש ומוסיף כיתות ללא הגבלה ודוחות.',
        ],
      },
      {
        heading: 'איך קובעים רמת קושי לכיתה מעורבת',
        answer:
          'ללוח עצמו יש שלושה גדלים — 5x5, 6x6 ו-7x7 — והמורה קובע את אורך הסיבוב ואת אורך המילה המינימלי. בנפרד, לכל תלמיד יש אחת משלוש רמות, כך שאותו לוח משותף יכול לדרוש דברים שונים מילדים שונים.',
        points: [
          'גדלי הלוח הם 5x5, 6x6 ו-7x7 אותיות, וברירת המחדל של סיבוב היא לוח 6x6.',
          'הגדרת אורך מילה מינימלי מונעת מכיתה מתחילה לצבור נקודות על שברי מילים בני שתי אותיות; ברירת המחדל היא שלוש אותיות.',
          'המורה קובע את אורך הסיבוב בדקות, וברירת המחדל היא שלוש דקות.',
          'תמיכה, ליבה ואתגר קובעות אילו מילות שיעור תלמיד מתרגל לבד, בעוד הלוח החי נשאר משותף כך שאיש אינו מופרד לעין כול.',
          'תלמיד ברמת תמיכה רואה בנק מילים במהלך המשחק החי.',
          'המילון אינו משתנה עם רמת הקושי — לוח קשה יותר הוא לוח גדול יותר, לא שופט מחמיר יותר.',
        ],
      },
    ],
    playFormats: {
      heading: '{count} דרכים לתרגל רשימה אחת באנגלית',
      intro:
        'אותה רשימת אוצר מילים מגיעה ללומד ב-{count} צורות שונות. {live} מהן הן מצבי כיתה חיים; {practice} הנותרות הן תרגולים עצמאיים, ושישה מהם מכוונים למיומנות אחת — הגדרות, מילים נרדפות, ניגודים, רמזי הקשר, משמעויות כפולות ושורשים ותחיליות.',
      liveLabel: '{live} מצבי כיתה חיים',
      practiceLabel: '{practice} תרגולים עצמאיים לפי מיומנות',
    },
    workflow: {
      heading: 'עשר דקות, מהתחלה ועד הסוף',
      intro:
        'כל הלולאה נכנסת בעשר הדקות האחרונות של השיעור. מדביקים רשימה, מעלים קוד למקרן, והכיתה משחקת מהטלפונים בזמן שהשליטה נשארת אצלכם. בלי הדפסות, בלי התקנות, ובלי שאף תלמיד נרשם למשהו.',
      steps: [
        { when: '0:00', what: 'הדביקו את מילות השבוע לרשימת שיעור, או פתחו רשימה ששמרתם.' },
        { when: '0:30', what: 'בחרו מצב ואורך סיבוב. קוד ההצטרפות וה-QR עולים למקרן.' },
        { when: '1:00', what: 'התלמידים פותחים דפדפן בטלפון ומקלידים שישה תווים. בלי חשבון, בלי מייל.' },
        { when: '2:00', what: 'משחקים. מהמסך שלכם אפשר להשהות, להוסיף שלושים שניות, לדלג על מילה או לסיים.' },
        { when: '8:00', what: 'מסך התוצאות מציג את המילים שהכיתה פספסה. קראו אותן יחד.' },
        { when: '9:00', what: 'מי שהתקשה עובר לתמיכה, ומי שהשתעמם לאתגר, לתרגול העצמאי שלו.' },
      ],
    },
    arcadeNote: {
      heading: 'מתי ארקייד לתלמידים עדיף',
      body:
        'הדף הזה בנוי למקרה אחד: מורה שמריץ סיבוב לכיתה שלמה. אם מה שאתם מחפשים זה לומד שמדפדף לבד בבית בעשרות משחקים בשירות עצמי, אתר ספרייה כמו אוסף משחקי המילים של 7ESL מתאים יותר — הוא רחב יותר מאיתנו, והוא נועד בדיוק לזה. חזרו לכאן כשצריך את כל הכיתה על לוח אחד והשליטה בידיים שלכם.',
      href: 'https://7esl.com/word-games/',
      cta: 'משחקי המילים של 7ESL',
    },
    faqTitle: 'שאלות נפוצות',
    features: [
      { icon: '🌍', text: '6 מילונים: אנגלית, ספרדית, עברית (RTL), שוודית, יפנית, רוסית' },
      { icon: '⚡', text: 'חשבונות חינמיים — הגדרה מהירה, ואז מעקב התקדמות' },
      { icon: '👥', text: 'ריבוי משתתפים חי — כל הכיתה; דו־קרבות בזוגות' },
      { icon: '📈', text: 'דיוק לכל תלמיד + מילים קשות לכל הכיתה' },
      { icon: '🎯', text: '3 משחקים: Boggle, Word Hunt, Word Wheel' },
      { icon: '📱', text: 'טלפון, טאבלט, Chromebook, כל דפדפן' },
      { icon: '⏱️', text: 'חימום של 5 דקות — לכל תוכנית שיעור' },
      { icon: '💸', text: 'חינם לשחק — בלי עלות לכל תלמיד, בלי חשבונות' },
    ],
    proficiencyLevels: [
      { tag: 'תמיכה', title: 'מתחילים', desc: 'מילים קצרות, טיימר ארוך, מילים נפוצות. Word Wheel לתרגול מודרך.' },
      { tag: 'ליבה', title: 'בינוניים', desc: 'אורכים שונים, טיימר רגיל. Boggle חושף דפוסים וקידומות.' },
      { tag: 'אתגר', title: 'מתקדמים', desc: 'מילים ארוכות, טיימר הדוק, רשימות מתקדמות (TOEFL, IELTS).' },
    ],
    sections: {
      builtFor: 'בנוי לתלמידי אנגלית.',
      setLevelPerClass: 'קובעים את הרמה לכל כיתה.',
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
        a: 'כן. מעלים רשימות משלכם וקובעים לכל תלמיד תמיכה, ליבה או אתגר. לוח המורה מראה אילו מילים יוצאות קשות.',
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
    metaTitle: 'Juegos de palabras en inglés para el aula — 6 idiomas | LexiClash',
    metaDescription: 'Juegos de palabras en inglés para toda la clase: los estudiantes entran desde el móvil con un código de seis caracteres, el tablero va al proyector y tú fijas Apoyo, Base o Desafío por estudiante. Seis idiomas, sin cuentas de estudiante.',
    ogTitle: 'Juegos de palabras en inglés para el aula',
    ogDescription: 'Juegos de palabras en vivo para estudiantes de inglés. Cuentas gratis, 6 diccionarios, panel de maestro.',
    twitterDescription: 'Juegos de inglés multijugador gratis para la clase.',
    heroTag: '★ Inglés ESL/EFL ★ Gratis Siempre ★',
    heroH1: {
      highlight: 'Juegos de palabras en inglés',
      rest1: 'para el',
      rest2: 'aula.',
    },
    heroSubtitle: 'Juegos de palabras en inglés dirigidos por la docente. Tú eliges la lista y el modo, la clase entra desde el móvil y el proyector muestra el tablero. Seis diccionarios, sin cuentas de estudiante y un nivel por estudiante para un aula de niveles mixtos.',
    ctaLabel: 'Crear Aula Gratis',
    heroCtas: {
      primary: '▶ Iniciar juego de inglés',
      primaryNote: 'Toda la clase · 5 minutos',
      secondary: '⚔ Duelos en parejas',
      secondaryNote: 'Práctica de dos en dos',
    },
    related: {
      label: 'Recursos educativos relacionados',
      vocabulary: '→ Juegos de vocabulario para el aula',
      teachers: '→ Juegos para profesores',
      hub: '→ Centro educativo',
    },
    depth: [
      {
        heading: 'Contra qué diccionario se comprueba una respuesta en inglés',
        answer:
          `Las respuestas en inglés se comprueban contra un diccionario de más de ${dictionaryFloor('en', 'es')} palabras, no una lista corta de clase. Cada uno de los otros cinco tiene el suyo: español más de ${dictionaryFloor('es', 'es')}, sueco más de ${dictionaryFloor('sv', 'es')}, hebreo más de ${dictionaryFloor('he', 'es')}, ruso más de ${dictionaryFloor('ru', 'es')}, y japonés más de ${dictionaryFloor('ja', 'es')} en hiragana.`,
        points: [
          'Si un estudiante encuentra una palabra real, cuenta aunque no estuviera en la lista de la lección: el diccionario es el idioma entero, no la ficha.',
          'La lista personalizada de la docente sigue alimentando los ejercicios, así que el vocabulario de la semana es lo que se repite.',
          'Cada diccionario es un conjunto de palabras aparte, construido para ese idioma, así que nada se juzga con reglas del inglés.',
          'Seis idiomas con diccionario propio: inglés, hebreo, sueco, japonés, español y ruso.',
        ],
      },
      {
        heading: 'Jugar en un idioma con la interfaz en otro',
        answer:
          'La misma lista funciona en las dos direcciones. Quien aprende inglés practica palabras en inglés mientras la interfaz sigue en su idioma, porque las seis versiones de idioma son independientes del diccionario que juzga la ronda. El hebreo se muestra de derecha a izquierda, tablero incluido.',
        points: [
          'Seis idiomas de interfaz: inglés, hebreo, sueco, japonés, español y ruso.',
          'Nada se traduce automáticamente durante la partida: el tablero, el diccionario y el idioma de la interfaz son tres cosas distintas.',
          'El hebreo es de derecha a izquierda de verdad, hasta la dirección de las sombras duras y el giro de las flechas de volver.',
          'Los estudiantes entran con un código de seis caracteres y sin cuenta, lo que importa más donde no hay correos escolares.',
          'El plan gratuito cubre 3 clases de 50 estudiantes cada una; Teacher Pro cuesta $9/mes y añade clases ilimitadas e informes.',
        ],
      },
      {
        heading: 'Ajustar la dificultad para una clase de niveles mixtos',
        answer:
          'El tablero tiene tres tamaños — 5x5, 6x6 y 7x7 — y la docente fija la duración de la ronda y la longitud mínima de palabra. Aparte, cada estudiante lleva uno de tres niveles, así que el mismo tablero compartido puede pedir cosas distintas a cada niño.',
        points: [
          'Los tamaños de tablero son 5x5, 6x6 y 7x7 letras, y una ronda usa el tablero 6x6 por defecto.',
          'La longitud mínima de palabra evita que una clase principiante puntúe con fragmentos de dos letras; por defecto son tres letras.',
          'La duración de la ronda la fija la docente en minutos y por defecto son tres minutos.',
          'Apoyo, base y desafío deciden qué palabras practica cada estudiante a solas, mientras el tablero en vivo sigue siendo compartido y nadie queda separado a la vista.',
          'Un estudiante en el nivel de apoyo ve un banco de palabras durante el juego en vivo.',
          'El diccionario no cambia con la dificultad: un tablero más difícil es un tablero más grande, no un juez más estricto.',
        ],
      },
    ],
    playFormats: {
      heading: '{count} formas de practicar una lista en inglés',
      intro:
        'La misma lista de vocabulario le llega al estudiante en {count} formas distintas. {live} son modos de clase en vivo; las otras {practice} son ejercicios individuales, y seis de ellos apuntan a una sola destreza: definiciones, sinónimos, antónimos, pistas de contexto, significados múltiples y raíces y afijos.',
      liveLabel: '{live} modos de clase en vivo',
      practiceLabel: '{practice} ejercicios individuales, por destreza',
    },
    workflow: {
      heading: 'Diez minutos, de principio a fin',
      intro:
        'Todo el ciclo cabe en los últimos diez minutos de la clase. Pegas una lista, pones un código en el proyector y el grupo juega desde el móvil mientras tú conservas los controles. Nada que imprimir, nada que instalar y ningún estudiante se registra.',
      steps: [
        { when: '0:00', what: 'Pega las palabras de esta semana en una lista de clase, o abre una que ya guardaste.' },
        { when: '0:30', what: 'Elige un modo y la duración de la ronda. El código y el QR van al proyector.' },
        { when: '1:00', what: 'Los estudiantes abren el navegador del móvil y escriben seis caracteres. Sin cuenta, sin correo.' },
        { when: '2:00', what: 'A jugar. Desde tu pantalla puedes pausar, sumar treinta segundos, saltar una palabra o terminar.' },
        { when: '8:00', what: 'La pantalla de resultados enumera las palabras que la clase falló. Léanlas juntos.' },
        { when: '9:00', what: 'Pon en Apoyo a quien le costó, o en Desafío a quien se aburrió, para su práctica individual.' },
      ],
    },
    arcadeNote: {
      heading: 'Cuándo conviene más un arcade para estudiantes',
      body:
        'Esta página está hecha para un caso: una docente que dirige una ronda para toda el aula. Si lo que quieres es que alguien navegue solo en casa por decenas de juegos de autoservicio, una biblioteca como la colección de juegos de palabras de 7ESL encaja mejor: es más amplia que nosotros y está pensada para eso. Vuelve aquí cuando necesites a toda la clase en un tablero y los controles en tu mano.',
      href: 'https://7esl.com/word-games/',
      cta: 'Juegos de palabras de 7ESL',
    },
    faqTitle: 'Preguntas Frecuentes',
    features: [
      { icon: '🌍', text: '6 diccionarios: inglés, español, hebreo (RTL), sueco, japonés, ruso' },
      { icon: '⚡', text: 'Cuentas gratis — solo una vez, luego sigue el progreso' },
      { icon: '👥', text: 'Multijugador — toda la clase; duelos de parejas' },
      { icon: '📈', text: 'Precisión por alumno + palabras difíciles de la clase' },
      { icon: '🎯', text: '3 juegos: Boggle, Word Hunt, Word Wheel' },
      { icon: '📱', text: 'Teléfono, tableta, Chromebook, cualquier navegador' },
      { icon: '⏱️', text: 'Calentamiento de 5 minutos — cualquier plan' },
      { icon: '💸', text: 'Sin cuentas de alumnado; 3 clases de hasta 50 alumnos en el plan gratuito' },
    ],
    proficiencyLevels: [
      { tag: 'Apoyo', title: 'Principiante', desc: 'Palabras cortas, tiempo largo, palabras de vista. Word Wheel para práctica guiada.' },
      { tag: 'Base', title: 'Intermedio', desc: 'Palabras variadas, tiempo normal. Boggle muestra patrones y prefijos.' },
      { tag: 'Desafío', title: 'Avanzado', desc: 'Palabras largas, tiempo corto, listas avanzadas (TOEFL, IELTS).' },
    ],
    sections: {
      builtFor: 'Construido para estudiantes de inglés.',
      setLevelPerClass: 'Fija el nivel de cada clase.',
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
        a: 'Sí. Sube tus propias listas y pon a cada estudiante en Apoyo, Base o Desafío. El panel muestra qué palabras cuestan trabajo.',
      },
      {
        q: '¿Funciona para adultos?',
        a: 'Sí. Adultos y programas universitarios usan LexiClash para rompehielos y retención.',
      },
      {
        q: '¿En programas bilingües?',
        a: 'Sí. 6 diccionarios: inglés, español, hebreo, sueco, japonés, ruso. Perfecto para inmersión.',
      },
      {
        q: '¿Cuáles son los mejores juegos de vocabulario en inglés?',
        a: 'Word Wheel y Boggle son los juegos de vocabulario en inglés más completos de LexiClash: cada palabra hallada suma al conteo de aciertos, y el panel de maestro marca los términos que más cuestan a la clase — ideal para repasar vocabulario jugando, gratis y sin descargas.',
      },
    ],
  },
  sv: {
    metaTitle: 'Engelska ordspel för klassrummet — lärarledda, 6 språk | LexiClash',
    metaDescription: 'Engelska ordspel för hela klassen: eleverna ansluter från mobilen med en kod på sex tecken, brädet visas på projektorn och du sätter Stöd, Bas eller Utmaning per elev. Sex språk, inga elevkonton.',
    ogTitle: 'Engelska ordspel för klassrummet',
    ogDescription: 'Flerspelarordspel i realtid för elever. Gratis konton, 6 ordböcker, lärarpanel.',
    twitterDescription: 'Gratis flerspelarengelskaspel för klassrummet.',
    heroTag: '★ Engelska som Andraspråk ★ Gratis Alltid ★',
    heroH1: {
      highlight: 'Engelska ordspel',
      rest1: 'för',
      rest2: 'klassrummet.',
    },
    heroSubtitle: 'Lärarledda engelska ordspel. Du väljer listan och läget, klassen ansluter från mobilen och projektorn visar brädet. Sex ordlistor, inga elevkonton och en nivå per elev för en blandad klass.',
    ctaLabel: 'Skapa Gratis Klassrum',
    heroCtas: {
      primary: '▶ Starta ett engelskaspel',
      primaryNote: 'Hela klassen · 5 minuter',
      secondary: '⚔ Parduellet',
      secondaryNote: 'Träning två och två',
    },
    related: {
      label: 'Relaterade lärarresurser',
      vocabulary: '→ Ordförrådsspel för klassrummet',
      teachers: '→ Spel för lärare',
      hub: '→ Utbildningshubben',
    },
    depth: [
      {
        heading: 'Vilken ordlista ett engelskt svar prövas mot',
        answer:
          `Engelska svar prövas mot en ordlista på över ${dictionaryFloor('en', 'sv')} ord, inte en kort undervisningslista. Vart och ett av de andra fem har sin egen: spanska över ${dictionaryFloor('es', 'sv')}, svenska över ${dictionaryFloor('sv', 'sv')}, hebreiska över ${dictionaryFloor('he', 'sv')}, ryska över ${dictionaryFloor('ru', 'sv')}, och japanska över ${dictionaryFloor('ja', 'sv')} hiraganaord.`,
        points: [
          'Hittar en elev ett riktigt ord räknas det även om det inte stod på lektionslistan — ordlistan är hela språket, inte arbetsbladet.',
          'Lärarens egen lista driver fortfarande övningarna, så veckans målord är det som repeteras.',
          'Varje ordlista är en egen ordmängd byggd för sitt språk, så inget bedöms efter engelska regler.',
          'Sex språk med egen ordlista: engelska, hebreiska, svenska, japanska, spanska och ryska.',
        ],
      },
      {
        heading: 'Att spela på ett språk med gränssnittet på ett annat',
        answer:
          'Samma lista fungerar åt båda hållen. Den som lär sig engelska övar engelska ord medan gränssnittet stannar på det egna språket, eftersom de sex språkversionerna är skilda från ordlistan som bedömer rundan. Hebreiska visas från höger till vänster, brädet inräknat.',
        points: [
          'Sex gränssnittsspråk: engelska, hebreiska, svenska, japanska, spanska och ryska.',
          'Inget maskinöversätts under spelets gång: brädet, ordlistan och gränssnittsspråket är tre skilda saker.',
          'Hebreiskan är på riktigt från höger till vänster, ända ner till åt vilket håll de hårda skuggorna faller.',
          'Elever ansluter med en kod på sex tecken och utan konto, vilket betyder mest där skolmejladresser inte finns.',
          'Gratisplanen täcker 3 klasser med 50 elever vardera; Teacher Pro kostar $9/månad och lägger till obegränsade klasser och rapporter.',
        ],
      },
      {
        heading: 'Att ställa in svårighetsgraden för en blandad klass',
        answer:
          'Brädet har tre storlekar — 5x5, 6x6 och 7x7 — och läraren ställer in rundans längd och minsta ordlängd. Separat bär varje elev en av tre nivåer, så samma delade bräde kan begära olika saker av olika barn.',
        points: [
          'Brädstorlekarna är 5x5, 6x6 och 7x7 bokstäver, och en runda använder 6x6-brädet som standard.',
          'Minsta ordlängd hindrar en nybörjarklass från att få poäng på tvåbokstavsfragment; standard är tre bokstäver.',
          'Rundans längd ställs in i minuter av läraren och är som standard tre minuter.',
          'Stöd, bas och utmaning avgör vilka lektionsord en elev övar på egen hand, medan direktbrädet förblir delat så att ingen syns utpekad.',
          'En elev på stödnivån ser en ordbank under direktspelet.',
          'Ordlistan ändras inte med svårighetsgraden — ett svårare bräde är ett större bräde, inte en strängare domare.',
        ],
      },
    ],
    playFormats: {
      heading: '{count} sätt att öva en engelsk ordlista',
      intro:
        'Samma ordlista når eleven i {count} olika former. {live} av dem är direktlägen för klassen; de andra {practice} är egna övningar, och sex av dem riktar in sig på en enda färdighet: definitioner, synonymer, motsatser, ledtrådar i sammanhang, flera betydelser samt rötter och affix.',
      liveLabel: '{live} direktlägen för klassen',
      practiceLabel: '{practice} egna övningar, per färdighet',
    },
    workflow: {
      heading: 'Tio minuter, från början till slut',
      intro:
        'Hela slingan ryms på lektionens sista tio minuter. Du klistrar in en lista, sätter en kod på projektorn och klassen spelar från mobilen medan du behåller kontrollerna. Inget att skriva ut, inget att installera och ingen elev registrerar sig.',
      steps: [
        { when: '0:00', what: 'Klistra in veckans ord i en lektionslista, eller öppna en du redan sparat.' },
        { when: '0:30', what: 'Välj läge och rundans längd. Anslutningskoden och QR-koden går upp på projektorn.' },
        { when: '1:00', what: 'Eleverna öppnar webbläsaren i mobilen och skriver sex tecken. Inget konto, ingen mejl.' },
        { when: '2:00', what: 'Spela. Från din skärm kan du pausa, lägga på trettio sekunder, hoppa över ett ord eller avsluta.' },
        { when: '8:00', what: 'Resultatskärmen listar orden klassen missade. Läs dem tillsammans.' },
        { when: '9:00', what: 'Sätt den som kämpade på Stöd, och den som hade tråkigt på Utmaning, inför egen övning.' },
      ],
    },
    arcadeNote: {
      heading: 'När en elevarkad är det bättre verktyget',
      body:
        'Den här sidan är byggd för ett fall: en lärare som kör en runda för ett helt klassrum. Om du i stället vill att en elev ska bläddra ensam hemma bland dussintals självbetjäningsspel passar en biblioteksajt som 7ESL:s ordspelssamling bättre — den är bredare än vi är, och den är gjord för det. Kom tillbaka hit när du behöver hela klassen på ett bräde med kontrollerna hos dig.',
      href: 'https://7esl.com/word-games/',
      cta: '7ESL:s ordspel',
    },
    faqTitle: 'Vanliga Frågor',
    features: [
      { icon: '🌍', text: '6 ordböcker: engelska, spanska, hebreiska (RTL), svenska, japanska, ryska' },
      { icon: '⚡', text: 'Gratis konton — snabb setup, sedan sparas framstegen' },
      { icon: '👥', text: 'Flerspelar — hela klassen; pardueller' },
      { icon: '📈', text: 'Noggrannhet per elev + klassens svåra ord' },
      { icon: '🎯', text: '3 spel: Boggle, Word Hunt, Word Wheel' },
      { icon: '📱', text: 'Telefon, surfplatta, Chromebook, vilken webbläsare som helst' },
      { icon: '⏱️', text: 'Uppvärmning på 5 minuter — vilken lektion som helst' },
      { icon: '💸', text: 'Inga elevkonton; 3 klasser med upp till 50 elever i gratisnivån' },
    ],
    proficiencyLevels: [
      { tag: 'Stöd', title: 'Nybörjare', desc: 'Korta ord, längre timer, sight-ord. Word Wheel för guidad övning.' },
      { tag: 'Bas', title: 'Mellanliggande', desc: 'Blandade längder, standard timer. Boggle visar mönster och prefix.' },
      { tag: 'Utmaning', title: 'Avancerad', desc: 'Långa ord, snabb timer, avancerade listor (TOEFL, IELTS).' },
    ],
    sections: {
      builtFor: 'Byggt för engelskastudenter.',
      setLevelPerClass: 'Ställ in nivån per klass.',
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
        a: 'Ja. Ladda upp egna listor och sätt varje elev på Stöd, Bas eller Utmaning. Panelen visar vilka ord som är svåra.',
      },
      {
        q: 'Fungerar för vuxna?',
        a: 'Absolut. Vuxna och universitet använder LexiClash för ordförrådsuppgifter.',
      },
      {
        q: 'Tvåspråkiga program?',
        a: 'Ja. 6 ordböcker. Perfekt för immersion och övergång.',
      },
    ],
  },
  ja: {
    metaTitle: '教室向け英語単語ゲーム — 先生主導、6言語 | LexiClash',
    metaDescription: 'クラス全体で走らせる英語の単語ゲーム。生徒は6文字のコードでスマホから参加し、盤はプロジェクターに映り、先生が生徒ごとにサポート・コア・チャレンジを設定します。6言語、生徒アカウント不要。',
    ogTitle: '教室向け英語単語ゲーム',
    ogDescription: '英語学習者向けマルチプレイヤーゲーム。無料、6つの辞書、先生用ダッシュボード。',
    twitterDescription: '教室向け無料マルチプレイヤー英語ゲーム。',
    heroTag: '★ 英語学習 ★ 無料で開始 ★',
    heroH1: {
      highlight: '英語の単語ゲーム',
      rest1: '教室で',
      rest2: '先生主導。',
    },
    heroSubtitle: '先生主導の英語単語ゲーム。リストとモードを先生が選び、クラスはスマホから参加、盤はプロジェクターに映ります。6つの辞書、生徒アカウント不要、習熟度がばらつく教室のための生徒ごとの段階。',
    ctaLabel: '無料クラスルームを作成',
    heroCtas: {
      primary: '▶ 英語ゲームを始める',
      primaryNote: 'クラス全体 · 5分',
      secondary: '⚔ ペア対戦',
      secondaryNote: '2人1組の練習',
    },
    related: {
      label: '関連する教育リソース',
      vocabulary: '→ 教室向け語彙ゲーム',
      teachers: '→ 先生向けゲーム',
      hub: '→ 教育ハブ',
    },
    depth: [
      {
        heading: '英語の答えはどの辞書で判定されるか',
        answer:
          `英語の答えは授業用の短いリストではなく、${dictionaryFloor('en', 'ja')}語以上の辞書で判定されます。ほかの5言語もそれぞれ独自の辞書を持ちます：スペイン語${dictionaryFloor('es', 'ja')}語以上、スウェーデン語${dictionaryFloor('sv', 'ja')}語以上、ヘブライ語${dictionaryFloor('he', 'ja')}語以上、ロシア語${dictionaryFloor('ru', 'ja')}語以上、日本語は${dictionaryFloor('ja', 'ja')}語以上のひらがな語。`,
        points: [
          '本物の単語を見つければ、レッスンのリストになくても得点になります。辞書はワークシートではなく言語そのものです。',
          '先生のカスタムリストは練習ドリルを動かし続けるので、その週の目標語彙が繰り返されます。',
          'どの辞書もその言語のために作られた別々の語彙集合で、英語の規則で判定されるものはありません。',
          '6言語がそれぞれの辞書を備えています：英語、ヘブライ語、スウェーデン語、日本語、スペイン語、ロシア語。',
        ],
      },
      {
        heading: '画面は母語のまま、別の言語で遊ぶ',
        answer:
          '同じリストがどちらの向きでも使えます。英語学習者は画面を自分の言語のままにして英語の単語を練習できます。6つの言語版は、ラウンドを判定する辞書とは別だからです。ヘブライ語は盤を含め、画面全体が右から左になります。',
        points: [
          '6つのインターフェース言語：英語、ヘブライ語、スウェーデン語、日本語、スペイン語、ロシア語。',
          'プレイ中に機械翻訳されるものはありません。盤、辞書、インターフェースの言語は別々のものです。',
          'ヘブライ語は本当に右から左で、影の落ちる向きや戻る矢印の反転まで含みます。',
          '生徒は6文字のコードで、アカウントなしで参加できます。学校のメールアドレスがない場所ほど効きます。',
          '無料プランは3クラス・各クラス50人まで。Teacher Pro は月$9で、クラス数無制限とレポートが加わります。',
        ],
      },
      {
        heading: '習熟度がばらつくクラスの難易度設定',
        answer:
          '盤には5x5、6x6、7x7の3つのサイズがあり、先生がラウンドの長さと最小の単語の長さを決めます。さらに生徒ごとに3段階のいずれかが割り当てられるので、同じ共有の盤が子どもによって違うことを求められます。',
        points: [
          '盤のサイズは5x5、6x6、7x7の文字で、ラウンドの既定は6x6の盤です。',
          '最小の単語の長さを設定すると、初級のクラスが2文字の断片で得点することを防げます。既定は3文字です。',
          'ラウンドの長さは先生が分単位で設定し、既定は3分です。',
          'サポート・コア・チャレンジが、その生徒が一人で練習する語を決めます。ライブの盤は共有のままなので、誰かが目に見えて分けられることはありません。',
          'サポート段階の生徒は、ライブのゲーム中に単語バンクを見られます。',
          '辞書は難易度で変わりません。難しい盤とは大きい盤のことで、判定が厳しくなるわけではありません。',
        ],
      },
    ],
    playFormats: {
      heading: '英語のリスト1つを練習する{count}通りの方法',
      intro:
        '同じ語彙リストが{count}通りの形で学習者に届きます。そのうち{live}つはライブのクラスモードで、残りの{practice}種類は個人ドリルです。うち6種類は一つの技能だけを狙います。定義、同義語、反意語、文脈の手がかり、複数の意味、語根と接辞です。',
      liveLabel: 'ライブのクラスモード{live}種類',
      practiceLabel: '技能別の個人ドリル{practice}種類',
    },
    workflow: {
      heading: '10分で、始めから終わりまで',
      intro:
        'この流れは授業の最後の10分に収まります。リストを貼り付け、コードをプロジェクターに映し、クラスはスマホから参加します。操作は先生の手元に残ります。印刷なし、インストールなし、生徒の登録もありません。',
      steps: [
        { when: '0:00', what: '今週の単語をレッスンのリストに貼り付けるか、保存済みのリストを開きます。' },
        { when: '0:30', what: 'モードとラウンドの長さを選びます。参加コードとQRがプロジェクターに出ます。' },
        { when: '1:00', what: '生徒はスマホのブラウザを開き、6文字を入力します。アカウントもメールも不要。' },
        { when: '2:00', what: 'プレイ。先生の画面から一時停止、30秒追加、単語のスキップ、ラウンド終了ができます。' },
        { when: '8:00', what: '結果画面にクラスが取りこぼした単語が並びます。一緒に読み上げます。' },
        { when: '9:00', what: 'つまずいた生徒はサポートへ、退屈していた生徒はチャレンジへ。個人練習に反映されます。' },
      ],
    },
    arcadeNote: {
      heading: '生徒向けアーケードのほうが合う場合',
      body:
        'このページは一つの場面のために作られています。先生が教室全体に向けて1ラウンドを回す場面です。もし必要なのが、学習者が家で一人で何十もの自習用ゲームを見て回ることなら、7ESLの単語ゲーム集のようなライブラリ型のサイトのほうが向いています。あちらは私たちより幅広く、そのために作られています。クラス全員を一つの盤に集め、操作を手元に置きたくなったら戻ってきてください。',
      href: 'https://7esl.com/word-games/',
      cta: '7ESLの単語ゲーム',
    },
    faqTitle: 'よくある質問',
    features: [
      { icon: '🌍', text: '6つの辞書：英語、スペイン語、ヘブライ語（RTL）、スウェーデン語、日本語、ロシア語' },
      { icon: '⚡', text: '無料。快速セットアップで、あとはずっと成績記録。' },
      { icon: '👥', text: 'マルチプレイヤー — 最大30人; ペアデュエル' },
      { icon: '📈', text: '生徒ごとの正確さ + クラスの苦手単語' },
      { icon: '🎯', text: '3つのゲーム：Boggle、Word Hunt、Word Wheel' },
      { icon: '📱', text: 'スマホ、タブレット、Chromebook、どのブラウザでも' },
      { icon: '⏱️', text: '5分ウォームアップ — どの授業でも合う' },
      { icon: '💸', text: '無料でプレイ — 生徒ごとの料金なし、アカウント不要' },
    ],
    proficiencyLevels: [
      { tag: 'サポート', title: '初級', desc: '短い単語、長いタイマー、sight-word。Word Wheel でガイド付き。' },
      { tag: 'コア', title: '中級', desc: 'いろいろな長さ、標準タイマー。Boggle で パターン・接頭辞を表示。' },
      { tag: 'チャレンジ', title: '上級', desc: '長い単語、短いタイマー、高度なリスト（TOEFL、IELTS）。' },
    ],
    sections: {
      builtFor: '英語学習者向けに構築。',
      setLevelPerClass: 'クラスごとにレベルを設定。',
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
        a: 'はい。自分のリストをアップロードし、生徒ごとにサポート・コア・チャレンジを設定。ダッシュボードで苦手が見えます。',
      },
      {
        q: '大人にも対応？',
        a: 'もちろん。大人と大学プログラムが語彙練習に使用。',
      },
      {
        q: 'バイリンガルプログラムで使える？',
        a: 'はい。6つの辞書。イマージョンと移行に最適。',
      },
    ],
  },
  ru: {
    metaTitle: 'Английские словесные игры для класса — 6 языков | LexiClash',
    metaDescription: 'Английские словесные игры для всего класса: ученики входят с телефона по коду из шести символов, доска идёт на проектор, а вы задаёте Поддержку, Базу или Вызов каждому ученику. Шесть языков, без ученических аккаунтов.',
    ogTitle: 'Английские словесные игры для класса',
    ogDescription: 'Живые многопользовательские игры для класса. Бесплатные учетные записи ученика, 6 словарей, панель учителя.',
    twitterDescription: 'Бесплатные игры английского языка ESL/EFL для класса. Многопользовательские, 6 языков, панель учителя.',
    heroTag: '★ ESL / EFL ★ Бесплатно Навсегда ★',
    heroH1: {
      highlight: 'Английские словесные игры',
      rest1: 'для',
      rest2: 'класса.',
    },
    heroSubtitle: 'Словесные игры на английском под руководством учителя. Вы выбираете список и режим, класс входит с телефонов, доска — на проекторе. Шесть словарей, без ученических аккаунтов и свой уровень для каждого ученика.',
    ctaLabel: 'Создать бесплатный класс',
    heroCtas: {
      primary: '▶ Запустить игру по английскому',
      primaryNote: 'Весь класс · 5 минут',
      secondary: '⚔ Дуэли в парах',
      secondaryNote: 'Практика по двое',
    },
    related: {
      label: 'Похожие материалы для учителей',
      vocabulary: '→ Игры со словарём для класса',
      teachers: '→ Игры для учителей',
      hub: '→ Образовательный центр',
    },
    depth: [
      {
        heading: 'По какому словарю проверяется английский ответ',
        answer:
          `Английские ответы проверяются по словарю из более чем ${dictionaryFloor('en', 'ru')} слов, а не по короткому учебному списку. У каждого из остальных пяти свой: испанский более ${dictionaryFloor('es', 'ru')}, шведский более ${dictionaryFloor('sv', 'ru')}, иврит более ${dictionaryFloor('he', 'ru')}, русский более ${dictionaryFloor('ru', 'ru')}, а японский — более ${dictionaryFloor('ja', 'ru')} слов хираганой.`,
        points: [
          'Если ученик нашёл настоящее слово, оно засчитывается, даже если его не было в списке урока: словарь — это весь язык, а не рабочий лист.',
          'Собственный список учителя по-прежнему питает тренировки, поэтому повторяется именно целевая лексика недели.',
          'Каждый словарь — отдельный набор слов, собранный для своего языка, поэтому ничто не судится по правилам английского.',
          'Шесть языков со своим словарём: английский, иврит, шведский, японский, испанский и русский.',
        ],
      },
      {
        heading: 'Играть на одном языке, когда интерфейс на другом',
        answer:
          'Один и тот же список работает в обе стороны. Изучающий английский отрабатывает английские слова, а интерфейс остаётся на его языке, потому что шесть языковых сборок отделены от словаря, по которому судится раунд. Иврит идёт справа налево, включая доску.',
        points: [
          'Шесть языков интерфейса: английский, иврит, шведский, японский, испанский и русский.',
          'Во время игры ничего не переводится машинно: доска, словарь и язык интерфейса — три разные вещи.',
          'Иврит по-настоящему справа налево — вплоть до того, куда падают жёсткие тени и как разворачиваются стрелки назад.',
          'Ученики входят по коду из шести символов и без аккаунта — это важнее всего там, где школьной почты не существует.',
          'Бесплатный план — 3 класса по 50 учеников; Teacher Pro стоит $9 в месяц и добавляет неограниченные классы и отчёты.',
        ],
      },
      {
        heading: 'Настройка сложности для класса с разным уровнем',
        answer:
          'У доски три размера — 5x5, 6x6 и 7x7 — а учитель задаёт длительность раунда и минимальную длину слова. Отдельно у каждого ученика есть один из трёх уровней, поэтому одна и та же общая доска может требовать разного от разных детей.',
        points: [
          'Размеры доски — 5x5, 6x6 и 7x7 букв, и по умолчанию раунд идёт на доске 6x6.',
          'Минимальная длина слова не даёт начинающему классу набирать очки на двухбуквенных обрывках; по умолчанию это три буквы.',
          'Длительность раунда учитель задаёт в минутах, по умолчанию три минуты.',
          'Поддержка, база и вызов решают, какие слова урока ученик отрабатывает один, а живая доска остаётся общей, так что никто не отделён на виду.',
          'Ученик на уровне поддержки видит банк слов во время живой игры.',
          'Словарь не меняется со сложностью: более сложная доска — это более крупная доска, а не более строгий судья.',
        ],
      },
    ],
    playFormats: {
      heading: '{count} способов отработать один список по-английски',
      intro:
        'Один и тот же список доходит до учащегося в {count} разных формах. {live} из них — живые режимы для класса; остальные {practice} — самостоятельные тренировки, и шесть из них нацелены на одно умение: определения, синонимы, антонимы, подсказки контекста, несколько значений, корни и аффиксы.',
      liveLabel: '{live} живых режимов для класса',
      practiceLabel: '{practice} самостоятельных тренировок по умениям',
    },
    workflow: {
      heading: 'Десять минут, от начала до конца',
      intro:
        'Весь цикл умещается в последние десять минут урока. Вы вставляете список, выводите код на проектор, и класс играет с телефонов, пока управление остаётся у вас. Ничего не нужно печатать или устанавливать, и никто из учеников не регистрируется.',
      steps: [
        { when: '0:00', what: 'Вставьте слова этой недели в список урока или откройте сохранённый.' },
        { when: '0:30', what: 'Выберите режим и длительность раунда. Код и QR выводятся на проектор.' },
        { when: '1:00', what: 'Ученики открывают браузер на телефоне и вводят шесть символов. Без аккаунта и почты.' },
        { when: '2:00', what: 'Играем. С вашего экрана можно поставить паузу, добавить тридцать секунд, пропустить слово или завершить.' },
        { when: '8:00', what: 'Экран результатов покажет слова, которые класс не нашёл. Прочитайте их вместе.' },
        { when: '9:00', what: 'Того, кому было трудно, переведите на Поддержку, скучающего — на Вызов для самостоятельной практики.' },
      ],
    },
    arcadeNote: {
      heading: 'Когда лучше подойдёт ученическая аркада',
      body:
        'Эта страница сделана под один случай: учитель проводит раунд для всего класса. Если же вам нужно, чтобы ученик дома сам листал десятки самостоятельных игр, лучше подойдёт библиотека вроде коллекции словесных игр 7ESL — она шире нашей и создана именно для этого. Возвращайтесь сюда, когда нужен весь класс на одной доске, а управление — у вас.',
      href: 'https://7esl.com/word-games/',
      cta: 'Словесные игры 7ESL',
    },
    faqTitle: 'Часто задаваемые вопросы',
    features: [
      { icon: '🌍', text: 'Шесть встроенных словарей: Английский, Испанский, Иврит (RTL), Шведский, Японский, Русский' },
      { icon: '⚡', text: 'Бесплатные учетные записи ученика — быстрая настройка, затем отслеживание прогресса всегда' },
      { icon: '👥', text: 'Живой многопользовательский режим до 30 учащихся; парные поединки 1на1' },
      { icon: '📈', text: 'Точность по каждому ученику + трудные слова для всего класса' },
      { icon: '🎯', text: 'Три игровых режима: Boggle, Word Hunt, Word Wheel' },
      { icon: '📱', text: 'Работает на любом телефоне, планшете, Chromebook или веб-браузере' },
      { icon: '⏱️', text: 'Формат 5 минут подходит для любого плана урока' },
      { icon: '💸', text: 'Без аккаунтов учеников; 3 класса по 50 учеников в бесплатном тарифе' },
    ],
    proficiencyLevels: [
      { tag: 'Поддержка', title: 'Начинающий', desc: 'Слова из 3–4 букв, более длительный таймер, обычные слова. Word Wheel для направленной практики.' },
      { tag: 'База', title: 'Средний', desc: 'Слова разной длины, стандартный таймер. Boggle раскрывает модели слов и префиксы.' },
      { tag: 'Вызов', title: 'Продвинутый', desc: 'Длинные слова, короткий таймер, пользовательские продвинутые списки (TOEFL, IELTS, академический словарь).' },
    ],
    sections: {
      builtFor: 'Создано для учащихся английского языка.',
      setLevelPerClass: 'Уровень задаётся для каждого класса.',
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
        a: 'Да, учетные записи необходимы, но бесплатны. Учитель создает класс, а ученики присоединяются с простым кодом. Никаких платежей, никогда.',
      },
      {
        q: 'Как словесные игры помогают учащимся?',
        a: 'Словесные игры развивают орфографию, распознавание словарного запаса и быстрый вспомнил под давлением — навыки, которые напрямую переходят в беглость. Многопользовательская конкуренция повышает вовлеченность и запоминание, особенно для подростков.',
      },
      {
        q: 'Могу ли я адаптировать игры для разных уровней?',
        a: 'Да. Учителя загружают свои списки слов и задают каждому ученику Поддержку, Базу или Вызов. Панель класса показывает, какие слова вызывают трудности.',
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
