import type { EducationLandingContent } from '@/lib/seo/educationLanding';

/**
 * Targets the "boggle online for kids" query cluster (GSC 2026-09-10..10-08:
 * 26 + 7 + 3 + 2 + 2 imp/28d, all landing on the generic /en/play-boggle-online-free
 * page). Angle: age-fit and grown-up-hosted play — parents and teachers run the game,
 * kids join with a code. Distinct from boggle-for-the-classroom (whole-class teacher
 * workflow) and word-games-for-the-classroom (broad category).
 */
const LEARNING = {
  educationalUse: ['Practice', 'Game-based learning'],
  educationalLevel: ['Primary'],
  typicalAgeRange: '6-12',
  teaches: 'spelling, vocabulary, word recognition, reading fluency',
  timeRequired: 'PT5M',
  learningResourceType: 'Game',
};

const EN: EducationLandingContent = {
  accent: 'pink',
  meta: {
    title: 'Boggle Online for Kids — Free, No Signup, No Download | LexiClash',
    description:
      'A free online Boggle game kids can play in any browser. A grown-up hosts, kids join with a simple code — no accounts, no downloads, no emails. Short rounds, real words, ages 6+.',
    keywords: [
      'boggle online for kids',
      'kids boggle online',
      'boggle for kids online free',
      'boggle game for children',
      'word games for kids online',
      'boggle junior online',
    ],
  },
  hero: {
    facts: ['Free to play', 'No kid accounts or emails', 'Short 60–90 second rounds', 'Works on any device'],
    tag: '* Ages 6+ * Family & Classroom *',
    h1: { part1: 'Boggle for kids:', highlight: 'real words', part2: ', real excitement' },
    subtitle:
      'Kids hunt for words on a shared letter grid while the clock ticks. A grown-up starts the game, kids join with a simple code — that is the entire setup.',
    primaryCta: { label: 'Start a game for kids', href: '/education/classroom-game' },
    secondaryCta: { label: 'Word lists by grade', href: '/education/lists' },
  },
  answer: {
    question: 'Is there a free online Boggle game for kids?',
    answer:
      'Yes. LexiClash is a free online Boggle-style word game kids play in any browser — no downloads, no kid accounts, no email addresses. A parent or teacher hosts the game and shares a 6-character code; kids type it in and hunt for words on the same letter grid. Rounds last 60–90 seconds, which suits young attention spans, and every word found is real spelling and vocabulary practice for ages 6 and up.',
  },
  sections: [
    {
      kind: 'table',
      title: 'Boggle by age: how to set it up for your kid',
      intro: 'Same game, different scaffolding. The letters get easier to read as kids grow — the fun does not change.',
      columns: ['Age', 'How to play', 'What they practice', 'Round length'],
      rows: [
        ['6–8', 'Play in pairs with a grown-up or older sibling calling out letters', 'Letter recognition, simple 3-letter words, sounding out', '60 seconds'],
        ['8–10', 'Solo on their own device, with a grade-level word list loaded', 'Spelling patterns, longer words, reading speed', '90 seconds'],
        ['10–12', 'Head-to-head against friends or family on the live scoreboard', 'Vocabulary breadth, strategy, graceful losing', '90 seconds'],
        ['13+', 'Full competitive rounds, custom lists, multi-round tournaments', 'Academic vocabulary, word roots, quick thinking', '90+ seconds'],
      ],
    },
    {
      kind: 'steps',
      title: 'Set up a kids’ Boggle game in one minute',
      intro: 'No accounts, no app store, no parent forms. This is the whole thing.',
      items: [
        {
          step: 'Step 1',
          focus: 'Grown-up hosts',
          activity:
            'A parent or teacher opens LexiClash on any shared screen — TV, laptop, smartboard — and starts a game. Optionally load a word list matched to your kid’s grade.',
        },
        {
          step: 'Step 2',
          focus: 'Kids join with a code',
          activity:
            'A 6-character code appears on the screen. Kids open LexiClash in a browser on any phone, tablet or Chromebook and type it in. That is the only “signup” that exists.',
        },
        {
          step: 'Step 3',
          focus: 'Hunt words together',
          activity:
            'Everyone plays the same letter grid at once, dragging across touching letters to build words. Whoever finds the most — and longest — words wins the round.',
        },
        {
          step: 'Step 4',
          focus: 'Celebrate and replay',
          activity:
            'The scoreboard reveals every word found. Read the long ones out loud, groan at the ones everyone missed, and tap once for a fresh board.',
        },
      ],
    },
    {
      kind: 'features',
      title: 'Why grown-ups pick LexiClash for kids’ word play',
      items: [
        { icon: 'lock', text: 'Kids never create an account and never share an email. The code on the host screen is the only way into the game.' },
        { icon: 'users', text: 'Only players with the code join the round — a hosted game is your kids and their friends, not strangers from the internet.' },
        { icon: 'timer', text: '60–90 second rounds match young attention spans. Boredom never gets a foothold.' },
        { icon: 'book', text: 'Every round is stealth practice: spelling, vocabulary and reading speed wrapped in a game kids ask to replay.' },
        { icon: 'globe', text: 'Six languages — English, Hebrew, Spanish, Swedish, Japanese and Russian — for bilingual homes and language classes.' },
        { icon: 'coins', text: 'The core game is free. A Teacher Pro plan ($9/mo) exists for classrooms that want analytics and unlimited classes — kids never see a paywall mid-game.' },
      ],
    },
    {
      kind: 'cards',
      title: 'Keep the word learning going',
      intro: 'Boggle is the hook. These pages turn it into steady practice.',
      items: [
        {
          tag: 'Practice',
          title: 'Spelling bee practice',
          desc: 'The same hosted format, tuned for spelling lists — great for the week before a school test.',
          href: '/education/spelling-bee-practice',
          cta: 'Practice spelling',
        },
        {
          tag: 'Early readers',
          title: 'Sight words practice',
          desc: 'High-frequency words for beginning readers, playable the same way.',
          href: '/education/sight-words-practice',
          cta: 'Practice sight words',
        },
        {
          tag: 'Word lists',
          title: 'Free lists by grade',
          desc: 'Ready-made English and Hebrew word lists by grade level — load one and play.',
          href: '/education/lists',
          cta: 'Browse lists',
        },
        {
          tag: 'For teachers',
          title: 'Boggle for the classroom',
          desc: 'Running this for a whole class? The classroom guide covers formats, timing and word lists.',
          href: '/education/boggle-for-the-classroom',
          cta: 'Classroom guide',
        },
      ],
    },
  ],
  faqs: [
    {
      q: 'Is LexiClash safe for kids?',
      a: 'Kids join a hosted game only by typing the 6-character code the grown-up shares, so the players in a round are exactly the people you invited. Kids never create accounts, never enter an email, and never see a signup form.',
    },
    {
      q: 'Is Boggle online free for kids?',
      a: 'Yes. The core game is free — a hosted round, the shared board and the scoreboard all cost nothing. A Teacher Pro plan ($9/mo) exists for teachers who want unlimited classes, analytics and printable reports.',
    },
    {
      q: 'What age is online Boggle good for?',
      a: 'Around ages 6 and up. Ages 6–8 do best in pairs with a grown-up; from about age 8 kids play solo happily; teens treat the live scoreboard as a real competition.',
    },
    {
      q: 'Does Boggle actually help with spelling and vocabulary?',
      a: 'Yes. Every round asks kids to recognize letter patterns, build real words and read them under time pressure — that is spelling and vocabulary practice. Load a grade-level word list to aim the practice at what your kid is learning now.',
    },
    {
      q: 'Can kids play in Hebrew or other languages?',
      a: 'Yes. LexiClash ships dictionaries in six languages — English, Hebrew, Spanish, Swedish, Japanese and Russian — so bilingual kids can hunt words in either language.',
    },
  ],
  labels: { faqTitle: 'Questions parents and teachers ask', relatedTitle: 'Keep exploring' },
  related: [
    { href: '/education/spelling-bee-practice', label: 'Spelling bee practice', accent: 'cyan' },
    { href: '/education/sight-words-practice', label: 'Sight words practice', accent: 'lime' },
    { href: '/education/boggle-for-the-classroom', label: 'Boggle for the classroom', accent: 'purple' },
    { href: '/education', label: 'Education hub', accent: 'pink' },
  ],
  breadcrumb: { home: 'Home', hub: 'Education', current: 'Boggle for Kids' },
  learning: LEARNING,
};

const HE: EducationLandingContent = {
  accent: 'pink',
  meta: {
    title: 'בוגל אונליין לילדים — חינם, בלי הרשמה, בלי הורדה | LexiClash',
    description:
      'משחק בוגל אונליין חינמי שילדים משחקים בכל דפדפן. מבוגר מארח, הילדים מצטרפים עם קוד פשוט — בלי חשבונות, בלי הורדות, בלי מיילים. סבבים קצרים, מילים אמיתיות, מגיל 6.',
    keywords: [
      'בוגל לילדים',
      'בוגל אונליין לילדים',
      'משחק מילים לילדים חינם',
      'משחק מילים לילדים אונליין',
      'משחק אותיות לילדים',
    ],
  },
  hero: {
    facts: ['חינם למשחק', 'בלי חשבונות או מיילים לילדים', 'סבבים קצרים של 60–90 שניות', 'עובד על כל מכשיר'],
    tag: '* מגיל 6 * משפחה וכיתה *',
    h1: { part1: 'בוגל לילדים:', highlight: 'מילים אמיתיות', part2: ', התרגשות אמיתית' },
    subtitle:
      'ילדים מחפשים מילים על לוח אותיות משותף בזמן שהשעון מתקתק. מבוגר מתחיל את המשחק, הילדים מצטרפים עם קוד פשוט — וזו כל ההקמה.',
    primaryCta: { label: 'התחילו משחק לילדים', href: '/education/classroom-game' },
    secondaryCta: { label: 'רשימות מילים לפי שכבה', href: '/education/lists' },
  },
  answer: {
    question: 'יש משחק בוגל אונליין חינמי לילדים?',
    answer:
      'כן. LexiClash הוא משחק מילים חינמי בסגנון בוגל שילדים משחקים בכל דפדפן — בלי הורדות, בלי חשבונות לילדים, בלי כתובות מייל. הורה או מורה מארח את המשחק ומשתף קוד בן 6 תווים; הילדים מקלידים אותו ומחפשים מילים על אותו לוח אותיות. סבב נמשך 60–90 שניות, מה שמתאים לטווח הקשב של ילדים, וכל מילה שנמצאת היא תרגול איות ואוצר מילים אמיתי מגיל 6 ומעלה.',
  },
  sections: [
    {
      kind: 'table',
      title: 'בוגל לפי גיל: איך להתאים את המשחק לילד שלכם',
      intro: 'אותו משחק, חיבוק שונה לכל גיל. האותיות נעשות קלות יותר לקריאה ככל שהילדים גדלים — הכיף לא משתנה.',
      columns: ['גיל', 'איך משחקים', 'מה מתרגלים', 'אורך סבב'],
      rows: [
        ['6–8', 'בזוגות עם מבוגר או אח גדול שקורא אותיות', 'זיהוי אותיות, מילים פשוטות בנות 3 אותיות, הגייה', '60 שניות'],
        ['8–10', 'לבד על המכשיר שלהם, עם רשימת מילים ברמת הכיתה', 'דפוסי איות, מילים ארוכות יותר, מהירות קריאה', '90 שניות'],
        ['10–12', 'ראש בראש מול חברים או משפחה על טבלת המובילים החיה', 'רוחב אוצר מילים, אסטרטגיה, הפסד בכבוד', '90 שניות'],
        ['13+', 'סבבים תחרותיים מלאים, רשימות מותאמות, טורנירים רב-סבביים', 'אוצר מילים אקדמי, שורשי מילים, חשיבה מהירה', '90+ שניות'],
      ],
    },
    {
      kind: 'steps',
      title: 'מקימים משחק בוגל לילדים בדקה אחת',
      intro: 'בלי חשבונות, בלי חנות אפליקציות, בלי טפסי הורים. זה הכול.',
      items: [
        {
          step: 'צעד 1',
          focus: 'מבוגר מארח',
          activity:
            'הורה או מורה פותח את LexiClash על מסך משותף כלשהו — טלוויזיה, מחשב נייד, לוח חכם — ומתחיל משחק. אפשר לטעון רשימת מילים שמתאימה לשכבת הילד.',
        },
        {
          step: 'צעד 2',
          focus: 'הילדים מצטרפים עם קוד',
          activity:
            'קוד בן 6 תווים מופיע על המסך. הילדים פותחים את LexiClash בדפדפן בכל טלפון, טאבלט או צ׳רומבוק ומקלידים אותו. זו ״ההרשמה״ היחידה שקיימת.',
        },
        {
          step: 'צעד 3',
          focus: 'מחפשים מילים ביחד',
          activity:
            'כולם משחקים על אותו לוח אותיות בו-זמנית, גוררים על אותיות סמוכות ובונים מילים. מי שמוצא הכי הרבה מילים — והכי ארוכות — מנצח בסבב.',
        },
        {
          step: 'צעד 4',
          focus: 'חוגגים ומשחקים שוב',
          activity:
            'טבלת התוצאות חושפת את כל המילים שנמצאו. קוראים בקול את הארוכות, נאנחים על אלו שכולם פספסו, ולוחצים פעם אחת ללוח חדש.',
        },
      ],
    },
    {
      kind: 'features',
      title: 'למה מבוגרים בוחרים ב-LexiClash למשחק מילים לילדים',
      items: [
        { icon: 'lock', text: 'ילדים אף פעם לא פותחים חשבון ולא משאירים מייל. הקוד על מסך המארח הוא הדרך היחידה להיכנס למשחק.' },
        { icon: 'users', text: 'רק שחקנים עם הקוד מצטרפים לסבב — משחק מאורח הוא הילדים שלכם והחברים שלהם, לא זרים מהאינטרנט.' },
        { icon: 'timer', text: 'סבבים של 60–90 שניות מתאימים לטווח הקשב של ילדים. לשעמום אין סיכוי.' },
        { icon: 'book', text: 'כל סבב הוא תרגול במסווה: איות, אוצר מילים ומהירות קריאה עטופים במשחק שילדים מבקשים לשחק שוב.' },
        { icon: 'globe', text: 'שש שפות — עברית, אנגלית, ספרדית, שוודית, יפנית ורוסית — לבתים דו-לשוניים ולשיעורי שפה.' },
        { icon: 'coins', text: 'משחק הליבה חינם. קיימת תוכנית פרו למורים ($9 לחודש) לכיתות שרוצות ניתוחי נתונים וכיתות ללא הגבלה — ילדים אף פעם לא פוגשים דרישת תשלום באמצע משחק.' },
      ],
    },
    {
      kind: 'cards',
      title: 'ממשיכים את לימוד המילים',
      intro: 'בוגל הוא הוו. העמודים האלה הופכים אותו לתרגול קבוע.',
      items: [
        {
          tag: 'תרגול',
          title: 'תרגול איות',
          desc: 'אותו פורמט מאורח, מכוון לרשימות איות — מעולה לשבוע שלפני מבחן בבית הספר.',
          href: '/education/spelling-bee-practice',
          cta: 'לתרגל איות',
        },
        {
          tag: 'קוראים מתחילים',
          title: 'תרגול מילים נפוצות',
          desc: 'מילים בתדירות גבוהה לקוראים מתחילים, במשחק באותה צורה.',
          href: '/education/sight-words-practice',
          cta: 'לתרגל מילים נפוצות',
        },
        {
          tag: 'רשימות מילים',
          title: 'רשימות חינם לפי שכבה',
          desc: 'רשימות מוכנות בעברית ובאנגלית לפי רמת כיתה — טוענים ומשחקים.',
          href: '/education/lists',
          cta: 'לעיין ברשימות',
        },
        {
          tag: 'למורים',
          title: 'בוגל לכיתה',
          desc: 'מריצים את זה לכיתה שלמה? המדריך הכיתתי מכסה פורמטים, תזמון ורשימות מילים.',
          href: '/education/boggle-for-the-classroom',
          cta: 'מדריך כיתתי',
        },
      ],
    },
  ],
  faqs: [
    {
      q: 'האם LexiClash בטוח לילדים?',
      a: 'ילדים מצטרפים למשחק מאורח רק על ידי הקלדת הקוד בן 6 התווים שהמבוגר משתף, כך שהשחקנים בסבב הם בדיוק מי שהזמנתם. ילדים אף פעם לא פותחים חשבונות, לא מזינים מייל ולא רואים טופס הרשמה.',
    },
    {
      q: 'האם בוגל אונליין חינם לילדים?',
      a: 'כן. משחק הליבה חינם — סבב מאורח, הלוח המשותף וטבלת התוצאות לא עולים כלום. קיימת תוכנית פרו למורים ($9 לחודש) למורים שרוצים כיתות ללא הגבלה, ניתוחי נתונים ודוחות להדפסה.',
    },
    {
      q: 'לאיזה גיל מתאים בוגל אונליין?',
      a: 'בערך מגיל 6 ומעלה. בגילאי 6–8 עדיף בזוגות עם מבוגר; מגיל 8 בערך ילדים משחקים לבד בהנאה; בני נוער מתייחסים לטבלת המובילים החיה כתחרות של ממש.',
    },
    {
      q: 'האם בוגל באמת עוזר לאיות ואוצר מילים?',
      a: 'כן. כל סבב מבקש מהילדים לזהות דפוסי אותיות, לבנות מילים אמיתיות ולקרוא אותן תחת לחץ זמן — וזה תרגול איות ואוצר מילים לכל דבר. טענו רשימת מילים ברמת הכיתה כדי לכוון את התרגול למה שהילד לומד עכשיו.',
    },
    {
      q: 'ילדים יכולים לשחק בעברית או בשפות אחרות?',
      a: 'כן. LexiClash כולל מילונים בשש שפות — עברית, אנגלית, ספרדית, שוודית, יפנית ורוסית — כך שילדים דו-לשוניים יכולים לצוד מילים בכל אחת מהשפות.',
    },
  ],
  labels: { faqTitle: 'שאלות של הורים ומורים', relatedTitle: 'להמשיך לגלות' },
  related: [
    { href: '/education/spelling-bee-practice', label: 'תרגול איות', accent: 'cyan' },
    { href: '/education/sight-words-practice', label: 'תרגול מילים נפוצות', accent: 'lime' },
    { href: '/education/boggle-for-the-classroom', label: 'בוגל לכיתה', accent: 'purple' },
    { href: '/education', label: 'מרכז החינוך', accent: 'pink' },
  ],
  breadcrumb: { home: 'בית', hub: 'חינוך', current: 'בוגל לילדים' },
  learning: LEARNING,
};

const ES: EducationLandingContent = {
  accent: 'pink',
  meta: {
    title: 'Boggle online para niños — Gratis, sin registro, sin descarga | LexiClash',
    description:
      'Un juego de Boggle online gratis que los niños juegan en cualquier navegador. Un adulto organiza, los niños se unen con un código simple — sin cuentas, sin descargas, sin correos. Rondas cortas, palabras reales, desde los 6 años.',
    keywords: [
      'boggle online para niños',
      'boggle para niños gratis',
      'juego de boggle infantil',
      'juegos de palabras para niños online',
      'boggle junior online',
    ],
  },
  hero: {
    facts: ['Gratis para jugar', 'Sin cuentas ni correos de niños', 'Rondas cortas de 60–90 segundos', 'Funciona en cualquier dispositivo'],
    tag: '* Desde 6 años * Familia y aula *',
    h1: { part1: 'Boggle para niños:', highlight: 'palabras reales', part2: ', emoción real' },
    subtitle:
      'Los niños buscan palabras en una cuadrícula de letras compartida mientras el reloj avanza. Un adulto inicia el juego, los niños se unen con un código simple — esa es toda la preparación.',
    primaryCta: { label: 'Iniciar un juego para niños', href: '/education/classroom-game' },
    secondaryCta: { label: 'Listas de palabras por grado', href: '/education/lists' },
  },
  answer: {
    question: '¿Existe un juego de Boggle online gratis para niños?',
    answer:
      'Sí. LexiClash es un juego de palabras online gratis estilo Boggle que los niños juegan en cualquier navegador — sin descargas, sin cuentas de niños, sin correos electrónicos. Un padre o docente organiza el juego y comparte un código de 6 caracteres; los niños lo escriben y buscan palabras en la misma cuadrícula de letras. Las rondas duran 60–90 segundos, ideal para la atención infantil, y cada palabra encontrada es práctica real de ortografía y vocabulario desde los 6 años.',
  },
  sections: [
    {
      kind: 'table',
      title: 'Boggle por edad: cómo adaptarlo a tu hijo',
      intro: 'El mismo juego, distinto acompañamiento. Las letras se hacen más fáciles a medida que crecen — la diversión no cambia.',
      columns: ['Edad', 'Cómo jugar', 'Qué practican', 'Duración'],
      rows: [
        ['6–8', 'En parejas con un adulto o hermano mayor que dice las letras', 'Reconocimiento de letras, palabras simples de 3 letras, fonética', '60 segundos'],
        ['8–10', 'Solos en su dispositivo, con una lista de palabras de su grado', 'Patrones de ortografía, palabras más largas, velocidad de lectura', '90 segundos'],
        ['10–12', 'Cara a cara contra amigos o familia en el marcador en vivo', 'Amplitud de vocabulario, estrategia, perder con dignidad', '90 segundos'],
        ['13+', 'Rondas competitivas completas, listas personalizadas, torneos', 'Vocabulario académico, raíces de palabras, pensamiento rápido', '90+ segundos'],
      ],
    },
    {
      kind: 'steps',
      title: 'Prepara un Boggle para niños en un minuto',
      intro: 'Sin cuentas, sin tienda de apps, sin formularios. Esto es todo.',
      items: [
        {
          step: 'Paso 1',
          focus: 'Un adulto organiza',
          activity:
            'Un padre o docente abre LexiClash en cualquier pantalla compartida — televisor, portátil, pizarra digital — e inicia un juego. Opcionalmente carga una lista de palabras del grado del niño.',
        },
        {
          step: 'Paso 2',
          focus: 'Los niños se unen con un código',
          activity:
            'Un código de 6 caracteres aparece en la pantalla. Los niños abren LexiClash en un navegador en cualquier teléfono, tableta o Chromebook y lo escriben. Es el único “registro” que existe.',
        },
        {
          step: 'Paso 3',
          focus: 'Buscar palabras juntos',
          activity:
            'Todos juegan en la misma cuadrícula a la vez, arrastrando sobre letras contiguas para formar palabras. Quien encuentre más palabras — y más largas — gana la ronda.',
        },
        {
          step: 'Paso 4',
          focus: 'Celebrar y repetir',
          activity:
            'El marcador revela todas las palabras encontradas. Lean las largas en voz alta, laméntense por las que todos se perdieron, y toquen una vez para un tablero nuevo.',
        },
      ],
    },
    {
      kind: 'features',
      title: 'Por qué los adultos eligen LexiClash para el juego de palabras de los niños',
      items: [
        { icon: 'lock', text: 'Los niños nunca crean una cuenta ni comparten un correo. El código en la pantalla del organizador es la única entrada al juego.' },
        { icon: 'users', text: 'Solo se unen los jugadores con el código — un juego organizado son tus hijos y sus amigos, no desconocidos de internet.' },
        { icon: 'timer', text: 'Las rondas de 60–90 segundos se ajustan a la atención infantil. El aburrimiento nunca llega.' },
        { icon: 'book', text: 'Cada ronda es práctica disfrazada: ortografía, vocabulario y velocidad lectora envueltos en un juego que los niños piden repetir.' },
        { icon: 'globe', text: 'Seis idiomas — inglés, hebreo, español, sueco, japonés y ruso — para hogares bilingües y clases de idiomas.' },
        { icon: 'coins', text: 'El juego principal es gratis. Existe un plan Teacher Pro ($9/mes) para aulas que quieren analíticas y clases ilimitadas — los niños nunca ven un muro de pago a mitad del juego.' },
      ],
    },
    {
      kind: 'cards',
      title: 'Sigue con el aprendizaje de palabras',
      intro: 'Boggle es el anzuelo. Estas páginas lo convierten en práctica constante.',
      items: [
        {
          tag: 'Práctica',
          title: 'Práctica de ortografía',
          desc: 'El mismo formato organizado, orientado a listas de ortografía — ideal la semana antes de un examen.',
          href: '/education/spelling-bee-practice',
          cta: 'Practicar ortografía',
        },
        {
          tag: 'Primeros lectores',
          title: 'Práctica de palabras frecuentes',
          desc: 'Palabras de alta frecuencia para lectores principiantes, jugables del mismo modo.',
          href: '/education/sight-words-practice',
          cta: 'Practicar palabras frecuentes',
        },
        {
          tag: 'Listas de palabras',
          title: 'Listas gratis por grado',
          desc: 'Listas listas en inglés y hebreo por nivel de grado — carga una y juega.',
          href: '/education/lists',
          cta: 'Explorar listas',
        },
        {
          tag: 'Para docentes',
          title: 'Boggle para el aula',
          desc: '¿Lo organizas para toda una clase? La guía del aula cubre formatos, tiempos y listas de palabras.',
          href: '/education/boggle-for-the-classroom',
          cta: 'Guía del aula',
        },
      ],
    },
  ],
  faqs: [
    {
      q: '¿Es LexiClash seguro para los niños?',
      a: 'Los niños se unen a un juego organizado solo escribiendo el código de 6 caracteres que comparte el adulto, así que los jugadores de una ronda son exactamente las personas que invitaste. Los niños nunca crean cuentas, nunca ingresan un correo y nunca ven un formulario de registro.',
    },
    {
      q: '¿Es gratis el Boggle online para niños?',
      a: 'Sí. El juego principal es gratis — una ronda organizada, el tablero compartido y el marcador no cuestan nada. Existe un plan Teacher Pro ($9/mes) para docentes que quieren clases ilimitadas, analíticas e informes imprimibles.',
    },
    {
      q: '¿Para qué edad es bueno el Boggle online?',
      a: 'Aproximadamente desde los 6 años. De 6 a 8 juegan mejor en parejas con un adulto; desde los 8 juegan solos con gusto; los adolescentes toman el marcador en vivo como una competencia real.',
    },
    {
      q: '¿El Boggle realmente ayuda con la ortografía y el vocabulario?',
      a: 'Sí. Cada ronda pide a los niños reconocer patrones de letras, formar palabras reales y leerlas bajo presión de tiempo — eso es práctica de ortografía y vocabulario. Carga una lista de su grado para apuntar la práctica a lo que tu hijo está aprendiendo ahora.',
    },
    {
      q: '¿Los niños pueden jugar en hebreo u otros idiomas?',
      a: 'Sí. LexiClash incluye diccionarios en seis idiomas — inglés, hebreo, español, sueco, japonés y ruso — así que los niños bilingües pueden buscar palabras en cualquiera de sus idiomas.',
    },
  ],
  labels: { faqTitle: 'Preguntas de padres y docentes', relatedTitle: 'Sigue explorando' },
  related: [
    { href: '/education/spelling-bee-practice', label: 'Práctica de ortografía', accent: 'cyan' },
    { href: '/education/sight-words-practice', label: 'Palabras frecuentes', accent: 'lime' },
    { href: '/education/boggle-for-the-classroom', label: 'Boggle para el aula', accent: 'purple' },
    { href: '/education', label: 'Centro de educación', accent: 'pink' },
  ],
  breadcrumb: { home: 'Inicio', hub: 'Educación', current: 'Boggle para niños' },
  learning: LEARNING,
};

const SV: EducationLandingContent = {
  accent: 'pink',
  meta: {
    title: 'Boggle online för barn — Gratis, ingen registrering, ingen nedladdning | LexiClash',
    description:
      'Ett gratis Boggle-spel online som barn spelar i valfri webbläsare. En vuxen är värd, barnen ansluter med en enkel kod — inga konton, inga nedladdningar, inga e-postadresser. Korta rundor, riktiga ord, från 6 år.',
    keywords: [
      'boggle online för barn',
      'boggle för barn gratis',
      'barn boggle online',
      'ordspel för barn online',
      'boggle junior online',
    ],
  },
  hero: {
    facts: ['Gratis att spela', 'Inga barnkonton eller e-post', 'Korta rundor på 60–90 sekunder', 'Fungerar på alla enheter'],
    tag: '* Från 6 år * Familj och klassrum *',
    h1: { part1: 'Boggle för barn:', highlight: 'riktiga ord', part2: ', riktig spänning' },
    subtitle:
      'Barn letar ord på ett delat bokstavsrutnät medan klockan tickar. En vuxen startar spelet, barnen ansluter med en enkel kod — det är hela uppsättningen.',
    primaryCta: { label: 'Starta ett spel för barn', href: '/education/classroom-game' },
    secondaryCta: { label: 'Ordlistor per årskurs', href: '/education/lists' },
  },
  answer: {
    question: 'Finns det ett gratis Boggle-spel online för barn?',
    answer:
      'Ja. LexiClash är ett gratis Boggle-liknande ordspel online som barn spelar i valfri webbläsare — inga nedladdningar, inga barnkonton, inga e-postadresser. En förälder eller lärare är värd för spelet och delar en 6-teckenskod; barnen skriver in den och letar ord på samma bokstavsrutnät. Rundorna tar 60–90 sekunder, vilket passar barns koncentrationsspann, och varje ord som hittas är riktig stavnings- och ordförrådsträning från 6 år och uppåt.',
  },
  sections: [
    {
      kind: 'table',
      title: 'Boggle efter ålder: så anpassar du spelet för ditt barn',
      intro: 'Samma spel, olika stöd. Bokstäverna blir lättare att läsa allteftersom barnen växer — skojet förändras inte.',
      columns: ['Ålder', 'Så spelar man', 'Vad de tränar', 'Rundlängd'],
      rows: [
        ['6–8', 'I par med en vuxen eller äldre syskon som ropar ut bokstäver', 'Bokstavskännedom, enkla 3-bokstavsord, ljudning', '60 sekunder'],
        ['8–10', 'Solo på egen enhet, med en ordlista på sin årskursnivå', 'Stavningsmönster, längre ord, läshastighet', '90 sekunder'],
        ['10–12', 'Direkt mot vänner eller familj på live-resultattavlan', 'Ordförrådets bredd, strategi, att förlora med värdighet', '90 sekunder'],
        ['13+', 'Fulla tävlingsrunder, egna listor, turneringar i flera rundor', 'Akademiskt ordförråd, ordrotter, snabbt tänkande', '90+ sekunder'],
      ],
    },
    {
      kind: 'steps',
      title: 'Sätt upp ett Boggle-spel för barn på en minut',
      intro: 'Inga konton, ingen app-butik, inga föräldraformulär. Det här är allt.',
      items: [
        {
          step: 'Steg 1',
          focus: 'En vuxen är värd',
          activity:
            'En förälder eller lärare öppnar LexiClash på valfri delad skärm — TV, laptop, smartboard — och startar ett spel. Ladda gärna en ordlista på barnets årskursnivå.',
        },
        {
          step: 'Steg 2',
          focus: 'Barnen ansluter med en kod',
          activity:
            'En 6-teckenskod visas på skärmen. Barnen öppnar LexiClash i en webbläsare på valfri telefon, surfplatta eller Chromebook och skriver in den. Det är den enda ”registrering” som finns.',
        },
        {
          step: 'Steg 3',
          focus: 'Leta ord tillsammans',
          activity:
            'Alla spelar på samma bokstavsrutnät samtidigt och drar över intilliggande bokstäver för att bilda ord. Den som hittar flest — och längst — ord vinner rundan.',
        },
        {
          step: 'Steg 4',
          focus: 'Fira och spela igen',
          activity:
            'Resultattavlan avslöjar alla ord som hittades. Läs de långa högt, stöna åt de som alla missade, och tryck en gång för en ny tavla.',
        },
      ],
    },
    {
      kind: 'features',
      title: 'Därför väljer vuxna LexiClash för barns ordlek',
      items: [
        { icon: 'lock', text: 'Barn skapar aldrig ett konto och delar aldrig en e-postadress. Koden på värdens skärm är den enda vägen in i spelet.' },
        { icon: 'users', text: 'Bara spelare med koden ansluter till rundan — ett värdlett spel är dina barn och deras vänner, inte främlingar från internet.' },
        { icon: 'timer', text: 'Rundor på 60–90 sekunder matchar barns koncentrationsspann. Tristessen får aldrig fäste.' },
        { icon: 'book', text: 'Varje runda är förklädd träning: stavning, ordförråd och läshastighet insvepta i ett spel barn ber att få spela igen.' },
        { icon: 'globe', text: 'Sex språk — engelska, hebreiska, spanska, svenska, japanska och ryska — för tvåspråkiga hem och språklektioner.' },
        { icon: 'coins', text: 'Grundspelet är gratis. En Teacher Pro-plan ($9/mån) finns för klassrum som vill ha analyser och obegränsat med klasser — barn möter aldrig en betalvägg mitt i spelet.' },
      ],
    },
    {
      kind: 'cards',
      title: 'Fortsätt ord-inlärningen',
      intro: 'Boggle är kroken. De här sidorna gör det till regelbunden träning.',
      items: [
        {
          tag: 'Träning',
          title: 'Stavningsträning',
          desc: 'Samma värdledda format, riktat mot stavningslistor — perfekt veckan före ett skolprov.',
          href: '/education/spelling-bee-practice',
          cta: 'Träna stavning',
        },
        {
          tag: 'Nya läsare',
          title: 'Träning av vanliga ord',
          desc: 'Högfrekventa ord för nybörjarläsare, spelbara på samma sätt.',
          href: '/education/sight-words-practice',
          cta: 'Träna vanliga ord',
        },
        {
          tag: 'Ordlistor',
          title: 'Gratis listor per årskurs',
          desc: 'Färdiga listor på engelska och hebreiska per årskurs — ladda en och spela.',
          href: '/education/lists',
          cta: 'Bläddra bland listor',
        },
        {
          tag: 'För lärare',
          title: 'Boggle för klassrummet',
          desc: 'Kör du det här för en hel klass? Klassrumsguiden täcker format, tajming och ordlistor.',
          href: '/education/boggle-for-the-classroom',
          cta: 'Klassrumsguide',
        },
      ],
    },
  ],
  faqs: [
    {
      q: 'Är LexiClash säkert för barn?',
      a: 'Barn ansluter till ett värdlett spel bara genom att skriva in den 6-teckenskod som den vuxne delar, så spelarna i en runda är exakt de personer du bjudit in. Barn skapar aldrig konton, anger aldrig en e-postadress och ser aldrig ett registreringsformulär.',
    },
    {
      q: 'Är Boggle online gratis för barn?',
      a: 'Ja. Grundspelet är gratis — en värdledd runda, den delade tavlan och resultattavlan kostar ingenting. En Teacher Pro-plan ($9/mån) finns för lärare som vill ha obegränsat med klasser, analyser och utskrivbara rapporter.',
    },
    {
      q: 'Vilken ålder passar Boggle online för?',
      a: 'Ungefär från 6 år och uppåt. 6–8-åringar klarar sig bäst i par med en vuxen; från cirka 8 år spelar barn gärna själva; tonåringar ser live-resultattavlan som en riktig tävling.',
    },
    {
      q: 'Hjälper Boggle faktiskt med stavning och ordförråd?',
      a: 'Ja. Varje runda ber barn känna igen bokstavsmönster, bygga riktiga ord och läsa dem under tidspress — det är stavnings- och ordförrådsträning. Ladda en ordlista på rätt årskursnivå för att rikta träningen mot det ditt barn lär sig just nu.',
    },
    {
      q: 'Kan barn spela på hebreiska eller andra språk?',
      a: 'Ja. LexiClash levereras med ordböcker på sex språk — engelska, hebreiska, spanska, svenska, japanska och ryska — så tvåspråkiga barn kan jaga ord på båda sina språk.',
    },
  ],
  labels: { faqTitle: 'Frågor från föräldrar och lärare', relatedTitle: 'Utforska vidare' },
  related: [
    { href: '/education/spelling-bee-practice', label: 'Stavningsträning', accent: 'cyan' },
    { href: '/education/sight-words-practice', label: 'Vanliga ord', accent: 'lime' },
    { href: '/education/boggle-for-the-classroom', label: 'Boggle för klassrummet', accent: 'purple' },
    { href: '/education', label: 'Utbildningshubben', accent: 'pink' },
  ],
  breadcrumb: { home: 'Hem', hub: 'Utbildning', current: 'Boggle för barn' },
  learning: LEARNING,
};

const JA: EducationLandingContent = {
  accent: 'pink',
  meta: {
    title: '子ども向けオンラインBoggle — 無料・登録不要・ダウンロード不要 | LexiClash',
    description:
      'どのブラウザでも遊べる無料のオンラインBoggle。大人がホストし、子どもは簡単なコードで参加 — アカウントもダウンロードもメールも不要。短いラウンド、本物の言葉、6歳から。',
    keywords: [
      '子ども向け Boggle オンライン',
      'キッズ Boggle 無料',
      '子供の単語ゲーム オンライン',
      'Boggle ジュニア オンライン',
    ],
  },
  hero: {
    facts: ['無料でプレイ', '子どものアカウント・メール不要', '60〜90秒の短いラウンド', 'どのデバイスでも動作'],
    tag: '* 6歳以上 * 家族と教室 *',
    h1: { part1: '子どものためのBoggle:', highlight: '本物の言葉', part2: '、本物のわくわく' },
    subtitle:
      '時計が刻む中、子どもたちは共有の文字グリッドで言葉を探します。大人がゲームを始め、子どもは簡単なコードで参加 — 準備はそれだけです。',
    primaryCta: { label: '子ども向けゲームを始める', href: '/education/classroom-game' },
    secondaryCta: { label: '学年別単語リスト', href: '/education/lists' },
  },
  answer: {
    question: '子ども向けの無料オンラインBoggleはありますか？',
    answer:
      'はい。LexiClashは子どもがどのブラウザでも遊べる無料のBoggle風単語ゲームです — ダウンロード不要、子どものアカウント不要、メールアドレスも不要。親や先生がゲームをホストして6文字のコードを共有すれば、子どもはそれを入力して同じ文字グリッドで言葉を探します。1ラウンドは60〜90秒で子どもの集中力にぴったり。見つけた言葉はすべて、6歳からの本物のスペリングと語彙の練習になります。',
  },
  sections: [
    {
      kind: 'table',
      title: '年齢別Boggle：お子さまに合わせた設定方法',
      intro: '同じゲームでも、支え方は年齢で変わります。成長とともに文字が読みやすくなっても、楽しさは変わりません。',
      columns: ['年齢', '遊び方', '練習になること', 'ラウンド時間'],
      rows: [
        ['6〜8歳', '大人や年上のきょうだいとペアで、文字を読み上げながら', '文字の認識、3文字の簡単な単語、音読み', '60秒'],
        ['8〜10歳', '自分のデバイスで一人で。学年レベルの単語リストを読み込んで', 'スペリングのパターン、長い単語、読む速さ', '90秒'],
        ['10〜12歳', 'ライブスコアボードで友達や家族と対戦', '語彙の広さ、戦略、負けを受け入れる心', '90秒'],
        ['13歳以上', '本格的な対戦ラウンド、カスタムリスト、複数ラウンドのトーナメント', '学術語彙、語根、素早い思考', '90秒以上'],
      ],
    },
    {
      kind: 'steps',
      title: '子ども向けBoggleを1分でセットアップ',
      intro: 'アカウントも、アプリストアも、保護者フォームも不要。これがすべてです。',
      items: [
        {
          step: 'ステップ1',
          focus: '大人がホスト',
          activity:
            '親や先生が共有スクリーン（テレビ、ノートPC、電子黒板）でLexiClashを開き、ゲームを開始します。お子さまの学年に合った単語リストの読み込みも可能です。',
        },
        {
          step: 'ステップ2',
          focus: '子どもはコードで参加',
          activity:
            '画面に6文字のコードが表示されます。子どもはスマホ・タブレット・ChromebookのブラウザでLexiClashを開いて入力するだけ。これが唯一の「登録」です。',
        },
        {
          step: 'ステップ3',
          focus: 'みんなで言葉探し',
          activity:
            '全員が同じ文字グリッドで同時にプレイし、隣接する文字をなぞって単語を作ります。いちばん多く、いちばん長い言葉を見つけた人がラウンドの勝ちです。',
        },
        {
          step: 'ステップ4',
          focus: '称えて、もう一度',
          activity:
            'スコアボードに見つかったすべての言葉が表示されます。長い言葉を声に出して読み、みんなが見逃した言葉にうなり、ワンタップで新しいボードへ。',
        },
      ],
    },
    {
      kind: 'features',
      title: '大人が子どもの言葉遊びにLexiClashを選ぶ理由',
      items: [
        { icon: 'lock', text: '子どもはアカウントを作らず、メールも入力しません。ホスト画面のコードだけがゲームへの入り口です。' },
        { icon: 'users', text: 'コードを持つ人だけがラウンドに参加 — ホスト型ゲームにいるのはお子さまとその友達で、ネットの見知らぬ人ではありません。' },
        { icon: 'timer', text: '60〜90秒のラウンドは子どもの集中力にぴったり。退屈する暇がありません。' },
        { icon: 'book', text: '毎ラウンドがこっそり練習：スペリング・語彙・読む速さが、子どもが「もう一回」とねだるゲームに包まれています。' },
        { icon: 'globe', text: '6言語対応 — 英語・ヘブライ語・スペイン語・スウェーデン語・日本語・ロシア語。バイリンガルの家庭や語学の授業に。' },
        { icon: 'coins', text: '基本のゲームは無料。分析や無制限クラスが欲しい教室向けにTeacher Pro（月額$9）がありますが、子どもがゲーム中にペイウォールに出会うことはありません。' },
      ],
    },
    {
      kind: 'cards',
      title: '言葉の学びを続けよう',
      intro: 'Boggleは入口。このページたちが継続的な練習に変えます。',
      items: [
        {
          tag: '練習',
          title: 'スペリング練習',
          desc: '同じホスト形式でスペリングリストに特化 — テスト前の週にぴったり。',
          href: '/education/spelling-bee-practice',
          cta: 'スペリングを練習',
        },
        {
          tag: '読み始め',
          title: '頻出単語の練習',
          desc: '読み始めの子ども向けの高頻度単語を、同じように遊びながら練習。',
          href: '/education/sight-words-practice',
          cta: '頻出単語を練習',
        },
        {
          tag: '単語リスト',
          title: '学年別の無料リスト',
          desc: '英語・ヘブライ語の学年別リストがすぐ使えます。読み込んでプレイ。',
          href: '/education/lists',
          cta: 'リストを見る',
        },
        {
          tag: '先生向け',
          title: '教室のためのBoggle',
          desc: 'クラス全員で遊ぶ場合は、フォーマット・時間配分・単語リストを網羅した教室ガイドへ。',
          href: '/education/boggle-for-the-classroom',
          cta: '教室ガイド',
        },
      ],
    },
  ],
  faqs: [
    {
      q: 'LexiClashは子どもに安全ですか？',
      a: '子どもがホスト型ゲームに参加できるのは、大人が共有した6文字のコードを入力した場合だけです。つまりラウンドにいるのは、あなたが招待した人だけ。子どもはアカウントを作らず、メールを入力せず、登録フォームを見ることもありません。',
    },
    {
      q: '子ども向けのオンラインBoggleは無料ですか？',
      a: 'はい。基本のゲームは無料です — ホスト型ラウンド、共有ボード、スコアボードにお金はかかりません。クラス無制限・分析・印刷レポートが欲しい先生向けにTeacher Pro（月額$9）があります。',
    },
    {
      q: 'オンラインBoggleは何歳向けですか？',
      a: 'おおよそ6歳以上です。6〜8歳は大人とペアが最適、8歳頃からは一人で楽しめ、10代はライブスコアボードを本気の競争として楽しみます。',
    },
    {
      q: 'Boggleは本当にスペリングや語彙の役に立ちますか？',
      a: 'はい。毎ラウンド、子どもは文字パターンを認識し、本物の単語を作り、時間制限の中で読むことを求められます — それはそのままスペリングと語彙の練習です。学年レベルの単語リストを読み込めば、今学んでいることに練習を合わせられます。',
    },
    {
      q: 'ヘブライ語や他の言語でも遊べますか？',
      a: 'はい。LexiClashには6言語の辞書 — 英語・ヘブライ語・スペイン語・スウェーデン語・日本語・ロシア語 — があるので、バイリンガルの子どもはどちらの言語でも言葉探しができます。',
    },
  ],
  labels: { faqTitle: '保護者と先生からのよくある質問', relatedTitle: 'さらに探す' },
  related: [
    { href: '/education/spelling-bee-practice', label: 'スペリング練習', accent: 'cyan' },
    { href: '/education/sight-words-practice', label: '頻出単語の練習', accent: 'lime' },
    { href: '/education/boggle-for-the-classroom', label: '教室のためのBoggle', accent: 'purple' },
    { href: '/education', label: '教育ハブ', accent: 'pink' },
  ],
  breadcrumb: { home: 'ホーム', hub: '教育', current: '子ども向けBoggle' },
  learning: LEARNING,
};

const RU: EducationLandingContent = {
  accent: 'pink',
  meta: {
    title: 'Боггл онлайн для детей — бесплатно, без регистрации и скачиваний | LexiClash',
    description:
      'Бесплатная игра Боггл онлайн, в которую дети играют в любом браузере. Взрослый создаёт игру, дети заходят по простому коду — без аккаунтов, скачиваний и почты. Короткие раунды, настоящие слова, с 6 лет.',
    keywords: [
      'боггл онлайн для детей',
      'детский боггл онлайн',
      'боггл для детей бесплатно',
      'словесные игры для детей онлайн',
    ],
  },
  hero: {
    facts: ['Бесплатно', 'Без аккаунтов и почты для детей', 'Короткие раунды 60–90 секунд', 'Работает на любом устройстве'],
    tag: '* С 6 лет * Семья и класс *',
    h1: { part1: 'Боггл для детей:', highlight: 'настоящие слова', part2: ', настоящий азарт' },
    subtitle:
      'Дети ищут слова на общем поле букв, пока тикают часы. Взрослый запускает игру, дети заходят по простому коду — это вся подготовка.',
    primaryCta: { label: 'Начать игру для детей', href: '/education/classroom-game' },
    secondaryCta: { label: 'Списки слов по классам', href: '/education/lists' },
  },
  answer: {
    question: 'Есть ли бесплатный онлайн-Боггл для детей?',
    answer:
      'Да. LexiClash — бесплатная словесная игра в стиле Боггла, в которую дети играют в любом браузере: без скачиваний, без детских аккаунтов, без электронной почты. Родитель или учитель создаёт игру и делится кодом из 6 символов; дети вводят его и ищут слова на том же поле букв. Раунд длится 60–90 секунд, что подходит детскому вниманию, а каждое найденное слово — настоящая практика орфографии и словарного запаса с 6 лет.',
  },
  sections: [
    {
      kind: 'table',
      title: 'Боггл по возрастам: как настроить игру под ребёнка',
      intro: 'Одна игра, разная поддержка. С возрастом буквы читаются легче — веселье не меняется.',
      columns: ['Возраст', 'Как играть', 'Что тренируют', 'Длина раунда'],
      rows: [
        ['6–8', 'В парах со взрослым или старшим братом/сестрой, которые называют буквы', 'Узнавание букв, простые слова из 3 букв, чтение по слогам', '60 секунд'],
        ['8–10', 'Самостоятельно на своём устройстве со списком слов своего класса', 'Орфографические паттерны, длинные слова, скорость чтения', '90 секунд'],
        ['10–12', 'Один на один с друзьями или семьёй на живой таблице результатов', 'Широта словарного запаса, стратегия, достойное поражение', '90 секунд'],
        ['13+', 'Полноценные соревновательные раунды, свои списки, турниры', 'Академическая лексика, корни слов, быстрое мышление', '90+ секунд'],
      ],
    },
    {
      kind: 'steps',
      title: 'Запустите детский Боггл за одну минуту',
      intro: 'Без аккаунтов, без магазина приложений, без родительских анкет. Это всё.',
      items: [
        {
          step: 'Шаг 1',
          focus: 'Взрослый создаёт игру',
          activity:
            'Родитель или учитель открывает LexiClash на любом общем экране — телевизоре, ноутбуке, интерактивной доске — и начинает игру. При желании загрузите список слов по классу ребёнка.',
        },
        {
          step: 'Шаг 2',
          focus: 'Дети заходят по коду',
          activity:
            'На экране появляется код из 6 символов. Дети открывают LexiClash в браузере на любом телефоне, планшете или хромбуке и вводят его. Это единственная «регистрация», которая существует.',
        },
        {
          step: 'Шаг 3',
          focus: 'Ищем слова вместе',
          activity:
            'Все играют на одном поле букв одновременно, проводя по соседним буквам и составляя слова. Кто нашёл больше всех — и самые длинные — слова, тот выиграл раунд.',
        },
        {
          step: 'Шаг 4',
          focus: 'Отмечаем и повторяем',
          activity:
            'Таблица результатов раскрывает все найденные слова. Прочитайте длинные вслух, посокрушайтесь над теми, что все пропустили, и нажмите один раз для нового поля.',
        },
      ],
    },
    {
      kind: 'features',
      title: 'Почему взрослые выбирают LexiClash для детской игры в слова',
      items: [
        { icon: 'lock', text: 'Дети никогда не создают аккаунт и не оставляют почту. Код на экране ведущего — единственный вход в игру.' },
        { icon: 'users', text: 'В раунд заходят только игроки с кодом — в созданной вами игре ваши дети и их друзья, а не незнакомцы из интернета.' },
        { icon: 'timer', text: 'Раунды по 60–90 секунд подходят детскому вниманию. Скука не успевает начаться.' },
        { icon: 'book', text: 'Каждый раунд — замаскированная практика: орфография, словарный запас и скорость чтения в игре, в которую дети просят сыграть снова.' },
        { icon: 'globe', text: 'Шесть языков — английский, иврит, испанский, шведский, японский и русский — для двуязычных семей и уроков языка.' },
        { icon: 'coins', text: 'Основная игра бесплатна. Тариф Teacher Pro ($9/мес) существует для классов с аналитикой и неограниченным числом классов — дети никогда не встречают оплату посреди игры.' },
      ],
    },
    {
      kind: 'cards',
      title: 'Продолжайте учить слова',
      intro: 'Боггл — это крючок. Эти страницы превращают игру в регулярную практику.',
      items: [
        {
          tag: 'Практика',
          title: 'Практика орфографии',
          desc: 'Тот же формат с ведущим, настроенный под орфографические списки — идеально за неделю до школьной контрольной.',
          href: '/education/spelling-bee-practice',
          cta: 'Тренировать орфографию',
        },
        {
          tag: 'Начинающие читатели',
          title: 'Практика частотных слов',
          desc: 'Высокочастотные слова для начинающих читателей — играется так же.',
          href: '/education/sight-words-practice',
          cta: 'Тренировать слова',
        },
        {
          tag: 'Списки слов',
          title: 'Бесплатные списки по классам',
          desc: 'Готовые списки на английском и иврите по уровням — загрузите и играйте.',
          href: '/education/lists',
          cta: 'Смотреть списки',
        },
        {
          tag: 'Учителям',
          title: 'Боггл для класса',
          desc: 'Запускаете для всего класса? Классное руководство охватывает форматы, тайминг и списки слов.',
          href: '/education/boggle-for-the-classroom',
          cta: 'Руководство для класса',
        },
      ],
    },
  ],
  faqs: [
    {
      q: 'Безопасен ли LexiClash для детей?',
      a: 'Дети заходят в созданную игру только введя код из 6 символов, которым поделился взрослый, поэтому игроки раунда — ровно те, кого вы пригласили. Дети никогда не создают аккаунты, не вводят почту и не видят форм регистрации.',
    },
    {
      q: 'Бесплатен ли онлайн-Боггл для детей?',
      a: 'Да. Основная игра бесплатна — раунд с ведущим, общее поле и таблица результатов ничего не стоят. Тариф Teacher Pro ($9/мес) существует для учителей, которым нужны неограниченные классы, аналитика и печатные отчёты.',
    },
    {
      q: 'Для какого возраста подходит онлайн-Боггл?',
      a: 'Примерно с 6 лет. В 6–8 лет лучше играть в парах со взрослым; примерно с 8 дети с удовольствием играют сами; подростки воспринимают живую таблицу результатов как настоящее соревнование.',
    },
    {
      q: 'Действительно ли Боггл помогает орфографии и словарному запасу?',
      a: 'Да. Каждый раунд просит ребёнка узнавать буквенные паттерны, составлять настоящие слова и читать их на время — это и есть практика орфографии и лексики. Загрузите список слов его класса, чтобы нацелить практику на то, что ребёнок учит сейчас.',
    },
    {
      q: 'Могут ли дети играть на иврите или других языках?',
      a: 'Да. В LexiClash есть словари на шести языках — английском, иврите, испанском, шведском, японском и русском — поэтому двуязычные дети могут искать слова на любом из них.',
    },
  ],
  labels: { faqTitle: 'Вопросы родителей и учителей', relatedTitle: 'Узнать больше' },
  related: [
    { href: '/education/spelling-bee-practice', label: 'Практика орфографии', accent: 'cyan' },
    { href: '/education/sight-words-practice', label: 'Частотные слова', accent: 'lime' },
    { href: '/education/boggle-for-the-classroom', label: 'Боггл для класса', accent: 'purple' },
    { href: '/education', label: 'Образовательный центр', accent: 'pink' },
  ],
  breadcrumb: { home: 'Главная', hub: 'Образование', current: 'Боггл для детей' },
  learning: LEARNING,
};

const MAP: Record<string, EducationLandingContent> = { en: EN, he: HE, es: ES, sv: SV, ja: JA, ru: RU };

export function getBoggleForKidsContent(locale: string): EducationLandingContent {
  return MAP[locale] ?? EN;
}
