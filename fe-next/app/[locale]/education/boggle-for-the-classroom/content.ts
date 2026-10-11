import type { EducationLandingContent } from '@/lib/seo/educationLanding';

/**
 * Targets the "boggle online for classroom" query cluster (GSC 2026-09-10..10-08:
 * 143 + 14 + 1 imp/28d, all landing on the generic /en/play-boggle-online-free page).
 * Angle: running the BOGGLE FORMAT specifically in a classroom — distinct from
 * vocabulary-games-classroom (vocabulary practice) and word-games-for-the-classroom
 * (broad category). The LearningResource block carries no translated copy, so it
 * is declared once.
 */
const LEARNING = {
  educationalUse: ['Classroom Activity'],
  educationalLevel: ['Primary', 'Secondary'],
  typicalAgeRange: '8-18',
  teaches: 'vocabulary, spelling, word recognition, pattern recognition',
  timeRequired: 'PT5M',
  learningResourceType: 'Game',
};

const EN: EducationLandingContent = {
  accent: 'cyan',
  meta: {
    title: 'Boggle Online for the Classroom — Free, No Student Login | LexiClash',
    description:
      'Play Boggle online with your whole class, free. Project the board, students join with a 6-character code — no accounts, no downloads. Up to 50 students per class play at once.',
    keywords: [
      'boggle online for classroom',
      'boggle online for classroom free',
      'classroom boggle game',
      'boggle generator for classroom',
      'whole class boggle',
      'boggle with students',
      'projectable word game',
    ],
  },
  hero: {
    facts: ['Free core game', 'No student accounts', '60–90 second rounds', 'Up to 50 students per class'],
    tag: '* For Teachers * Zero Prep *',
    h1: { part1: 'Classroom Boggle:', highlight: 'one board', part2: ', every student at once' },
    subtitle:
      'Project one letter grid, share one code, and the whole class hunts words on the same board in real time. Boggle rebuilt for a room full of students.',
    primaryCta: { label: 'Start a class game', href: '/education/classroom-game' },
    secondaryCta: { label: 'Load a word list', href: '/education/lists' },
  },
  answer: {
    question: 'How do you play Boggle online with a whole class?',
    answer:
      'Project a LexiClash board on your classroom screen, share the 6-character join code, and every student plays the same letter grid at once from their own device — no accounts, no downloads, no app installs. A round runs 60–90 seconds and scores tally live on the projected screen. The free plan covers up to 50 students in a class, and you can load your own vocabulary list to turn the game into targeted spelling or vocabulary practice.',
  },
  sections: [
    {
      kind: 'steps',
      title: 'A 5-minute classroom Boggle round, step by step',
      intro: 'This is the whole routine. First time takes two minutes to set up; after that, under one.',
      items: [
        {
          step: 'Step 1',
          focus: 'Open a board',
          activity:
            'Open LexiClash on the projector or smartboard and start a classroom game. Pick a built-in word list or upload the vocabulary your class is studying this week.',
        },
        {
          step: 'Step 2',
          focus: 'Share the code',
          activity:
            'A 6-character join code appears on the big screen. Students open LexiClash on any phone, tablet or laptop and type it in. Nobody creates an account.',
        },
        {
          step: 'Step 3',
          focus: 'Hunt words (60–90 seconds)',
          activity:
            'Everyone plays the same letter grid at the same time, dragging across adjacent letters to build words. Longer words score more. The room goes quiet — then loud at the reveal.',
        },
        {
          step: 'Step 4',
          focus: 'Live scoreboard',
          activity:
            'Scores tally on the projected screen as words land. Call out the longest word, celebrate the top three, and note which vocabulary actually got used.',
        },
        {
          step: 'Step 5',
          focus: 'Run it back',
          activity:
            'One tap starts a fresh board. Two or three rounds fit inside a warm-up slot, or stretch it into a full vocabulary review with your own list.',
        },
      ],
    },
    {
      kind: 'table',
      title: 'Three ways to run Boggle in class',
      intro: 'Same game, three formats. Pick by devices available and how much structure you want.',
      columns: ['Format', 'Setup', 'Best for', 'Time'],
      rows: [
        [
          'Whole class, live',
          'Projector + one device per student',
          'Warm-ups, lesson closers, review days — maximum energy, everyone on one board',
          '2–5 min',
        ],
        [
          'Small groups',
          'One device per pair or table group',
          'Classes short on devices; adds collaboration as groups negotiate which words to submit',
          '5–10 min',
        ],
        [
          'Solo practice',
          'Any device, self-paced',
          'Early finishers and homework-style practice with this week’s spelling list',
          '3–10 min',
        ],
      ],
    },
    {
      kind: 'features',
      title: 'Why teachers use LexiClash for classroom Boggle',
      items: [
        { icon: 'lock', text: 'No student accounts or emails — students join with a code and play. Nothing to set up before class.' },
        { icon: 'users', text: 'The free plan covers up to 50 students per class and 3 classes. Teacher Pro ($9/mo) adds unlimited classes, analytics and printable reports.' },
        { icon: 'globe', text: 'Six languages — English, Hebrew, Spanish, Swedish, Japanese and Russian — so the same game works in ESL, world-language and Hebrew classrooms.' },
        { icon: 'upload', text: 'Upload your own word list and the board becomes this week’s spelling or vocabulary unit, not random letters.' },
        { icon: 'timer', text: 'Rounds run 60–90 seconds, so Boggle fits a warm-up, a brain break or a full review block.' },
        { icon: 'monitor', text: 'Runs in any browser on any device — projector, smartboard, Chromebooks, phones. Nothing to install.' },
      ],
    },
    {
      kind: 'cards',
      title: 'Turn one Boggle round into a lesson',
      intro: 'The game is the hook. These pages are the lesson plan around it.',
      items: [
        {
          tag: 'Vocabulary',
          title: 'Classroom vocabulary games',
          desc: 'Seven formats for turning this week’s word list into live practice, from duels to whole-class boards.',
          href: '/education/vocabulary-games-classroom',
          cta: 'See the formats',
        },
        {
          tag: 'Spelling',
          title: 'Spelling bee practice',
          desc: 'Run spelling practice the same way — project, join with a code, everyone spells at once.',
          href: '/education/spelling-bee-practice',
          cta: 'Practice spelling',
        },
        {
          tag: 'Focus reset',
          title: 'Brain-break word games',
          desc: 'When the class has been sitting too long, a 2-minute word round brings attention back.',
          href: '/education/brain-breaks-word-games',
          cta: 'Reset the room',
        },
        {
          tag: 'Word lists',
          title: 'Free lists by grade and topic',
          desc: 'Ready-made English and Hebrew lists by grade level — load one and play, zero prep.',
          href: '/education/lists',
          cta: 'Browse lists',
        },
      ],
    },
  ],
  faqs: [
    {
      q: 'Is Boggle online free for classroom use?',
      a: 'Yes. The core game is free: up to 50 students per class and 3 classes on the free plan. Teacher Pro ($9/mo) adds unlimited classes, class analytics and printable reports — the game itself never gets locked.',
    },
    {
      q: 'Do my students need accounts or email addresses?',
      a: 'No. You project a 6-character join code, students type it on any device, and they are in the game. No signups, no emails, no passwords to manage.',
    },
    {
      q: 'Can I play Boggle with my own vocabulary list?',
      a: 'Yes. Upload or paste this week’s spelling or vocabulary words and the game builds boards around them, so students practice exactly the words you are teaching.',
    },
    {
      q: 'What ages is classroom Boggle good for?',
      a: 'Roughly ages 8 and up (grade 3 through high school). Younger readers play in pairs with a stronger reader; older students get competitive fast on the live scoreboard.',
    },
    {
      q: 'Does it work for Hebrew, Spanish or ESL classes?',
      a: 'Yes. LexiClash ships dictionaries in six languages — English, Hebrew, Spanish, Swedish, Japanese and Russian — so the same Boggle round works for ESL, world-language and bilingual classrooms.',
    },
  ],
  labels: { faqTitle: 'Questions teachers ask', relatedTitle: 'Keep exploring' },
  related: [
    { href: '/education/vocabulary-games-classroom', label: 'Classroom vocabulary games', accent: 'lime' },
    { href: '/education/spelling-bee-practice', label: 'Spelling bee practice', accent: 'cyan' },
    { href: '/education/brain-breaks-word-games', label: 'Brain-break word games', accent: 'purple' },
    { href: '/education', label: 'Education hub', accent: 'pink' },
  ],
  breadcrumb: { home: 'Home', hub: 'Education', current: 'Boggle for the Classroom' },
  learning: LEARNING,
};

const HE: EducationLandingContent = {
  accent: 'cyan',
  meta: {
    title: 'בוגל אונליין לכיתה — חינם, בלי הרשמה לתלמידים | LexiClash',
    description:
      'שחקו בוגל אונליין עם כל הכיתה, חינם. מקרינים את הלוח, התלמידים מצטרפים עם קוד בן 6 תווים — בלי חשבונות, בלי הורדות. עד 50 תלמידים בכיתה משחקים בו-זמנית.',
    keywords: [
      'בוגל לכיתה',
      'בוגל אונליין חינם',
      'משחק מילים לכיתה',
      'משחק כיתתי בזמן אמת',
      'בוגל עם תלמידים',
      'משחק מילים מוקרן',
    ],
  },
  hero: {
    facts: ['משחק הליבה חינם', 'בלי חשבונות לתלמידים', 'סבבים של 60–90 שניות', 'עד 50 תלמידים בכיתה'],
    tag: '* למורים * אפס הכנה *',
    h1: { part1: 'בוגל לכיתה:', highlight: 'לוח אחד', part2: ', כל התלמידים בו-זמנית' },
    subtitle:
      'מקרינים לוח אותיות אחד, משתפים קוד אחד, וכל הכיתה מחפשת מילים על אותו לוח בזמן אמת. בוגל שנבנה מחדש לחדר מלא תלמידים.',
    primaryCta: { label: 'פתחו משחק כיתתי', href: '/education/classroom-game' },
    secondaryCta: { label: 'טענו רשימת מילים', href: '/education/lists' },
  },
  answer: {
    question: 'איך משחקים בוגל אונליין עם כיתה שלמה?',
    answer:
      'מקרינים לוח LexiClash על מסך הכיתה, משתפים את קוד ההצטרפות בן 6 התווים, וכל תלמיד משחק על אותו לוח אותיות בו-זמנית מהמכשיר שלו — בלי חשבונות, בלי הורדות, בלי התקנת אפליקציה. סבב נמשך 60–90 שניות והניקוד מצטבר בשידור חי על המסך. התוכנית החינמית מכסה עד 50 תלמידים בכיתה, ואפשר לטעון רשימת אוצר מילים משלכם כדי להפוך את המשחק לתרגול איות ממוקד.',
  },
  sections: [
    {
      kind: 'steps',
      title: 'סבב בוגל כיתתי של 5 דקות, צעד אחר צעד',
      intro: 'זו כל השגרה. בפעם הראשונה ההקמה לוקחת שתי דקות; אחר כך, פחות מדקה.',
      items: [
        {
          step: 'צעד 1',
          focus: 'פותחים לוח',
          activity:
            'פותחים את LexiClash על המקרן או הלוח החכם ומתחילים משחק כיתתי. בוחרים רשימת מילים מובנית או מעלים את אוצר המילים שהכיתה לומדת השבוע.',
        },
        {
          step: 'צעד 2',
          focus: 'משתפים את הקוד',
          activity:
            'קוד הצטרפות בן 6 תווים מופיע על המסך הגדול. התלמידים פותחים את LexiClash בכל טלפון, טאבלט או מחשב נייד ומקלידים אותו. אף אחד לא פותח חשבון.',
        },
        {
          step: 'צעד 3',
          focus: 'מחפשים מילים (60–90 שניות)',
          activity:
            'כולם משחקים על אותו לוח אותיות באותו זמן, גוררים על אותיות סמוכות ובונים מילים. מילים ארוכות שוות יותר. הכיתה שותקת — ואז מתפוצצת בחשיפת התוצאות.',
        },
        {
          step: 'צעד 4',
          focus: 'טבלת מובילים חיה',
          activity:
            'הניקוד מצטבר על המסך המוקרן ככל שהמילים נוחתות. מכריזים על המילה הארוכה ביותר, חוגגים את שלושת המובילים, ובודקים אילו מילים מתוך החומר באמת שומשו.',
        },
        {
          step: 'צעד 5',
          focus: 'משחקים עוד סבב',
          activity:
            'לחיצה אחת מתחילה לוח חדש. שני-שלושה סבבים נכנסים בקלות לחימום פתיחה, או שהופכים לשיעור חזרה מלא על אוצר מילים עם הרשימה שלכם.',
        },
      ],
    },
    {
      kind: 'table',
      title: 'שלוש דרכים לשחק בוגל בכיתה',
      intro: 'אותו משחק, שלוש פורמטים. בוחרים לפי המכשירים הזמינים וכמה מבנה רוצים.',
      columns: ['פורמט', 'הקמה', 'מתאים ל', 'זמן'],
      rows: [
        [
          'כל הכיתה, בזמן אמת',
          'מקרן + מכשיר לכל תלמיד',
          'חימומים, סיומות שיעור, ימי חזרה — אנרגיה מקסימלית, כולם על לוח אחד',
          '2–5 דקות',
        ],
        [
          'קבוצות קטנות',
          'מכשיר אחד לזוג או לקבוצת שולחן',
          'כיתות עם מחסור במכשירים; מוסיף שיתוף פעולה כשהקבוצה מתלבטת אילו מילים להגיש',
          '5–10 דקות',
        ],
        [
          'תרגול עצמאי',
          'כל מכשיר, בקצב אישי',
          'תלמידים שמסיימים מוקדם ותרגול בסגנון שיעורי בית עם רשימת האיות השבועית',
          '3–10 דקות',
        ],
      ],
    },
    {
      kind: 'features',
      title: 'למה מורים בוחרים ב-LexiClash לבוגל כיתתי',
      items: [
        { icon: 'lock', text: 'בלי חשבונות או מיילים לתלמידים — התלמידים מצטרפים עם קוד ומשחקים. אין מה להכין לפני השיעור.' },
        { icon: 'users', text: 'התוכנית החינמית מכסה עד 50 תלמידים בכיתה ו-3 כיתות. פרו למורים ($9 לחודש) מוסיף כיתות ללא הגבלה, ניתוחי נתונים ודוחות להדפסה.' },
        { icon: 'globe', text: 'שש שפות — עברית, אנגלית, ספרדית, שוודית, יפנית ורוסית — כך שאותו משחק עובד בכיתות אנגלית, שפות זרות ועברית.' },
        { icon: 'upload', text: 'מעלים רשימת מילים משלכם והלוח הופך ליחידת האיות או אוצר המילים של השבוע, לא אותיות אקראיות.' },
        { icon: 'timer', text: 'סבבים של 60–90 שניות, כך שבוגל נכנס לחימום, להפסקת קשב או לבלוק חזרה מלא.' },
        { icon: 'monitor', text: 'רץ בכל דפדפן על כל מכשיר — מקרן, לוח חכם, צ׳רומבוקים, טלפונים. אין מה להתקין.' },
      ],
    },
    {
      kind: 'cards',
      title: 'הופכים סבב בוגל אחד לשיעור',
      intro: 'המשחק הוא הוו. העמודים האלה הם תוכנית השיעור שמסביב.',
      items: [
        {
          tag: 'אוצר מילים',
          title: 'משחקי אוצר מילים לכיתה',
          desc: 'שבעה פורמטים להפיכת רשימת המילים השבועית לתרגול חי, מדו-קרבות ועד לוחות לכל הכיתה.',
          href: '/education/vocabulary-games-classroom',
          cta: 'לראות את הפורמטים',
        },
        {
          tag: 'איות',
          title: 'תרגול איות',
          desc: 'מריצים תרגול איות באותה צורה — מקרינים, מצטרפים עם קוד, כולם מאייתים בו-זמנית.',
          href: '/education/spelling-bee-practice',
          cta: 'לתרגל איות',
        },
        {
          tag: 'איפוס קשב',
          title: 'משחקי הפסקת קשב',
          desc: 'כשהכיתה ישבה יותר מדי, סבב מילים של שתי דקות מחזיר את הקשב.',
          href: '/education/brain-breaks-word-games',
          cta: 'לאפס את הכיתה',
        },
        {
          tag: 'רשימות מילים',
          title: 'רשימות חינם לפי שכבה ונושא',
          desc: 'רשימות מוכנות בעברית ובאנגלית לפי רמת כיתה — טוענים ומשחקים, אפס הכנה.',
          href: '/education/lists',
          cta: 'לעיין ברשימות',
        },
      ],
    },
  ],
  faqs: [
    {
      q: 'האם בוגל אונליין חינם לשימוש כיתתי?',
      a: 'כן. משחק הליבה חינם: עד 50 תלמידים בכיתה ו-3 כיתות בתוכנית החינמית. פרו למורים ($9 לחודש) מוסיף כיתות ללא הגבלה, ניתוחי נתונים לכיתה ודוחות להדפסה — המשחק עצמו לעולם לא ננעל.',
    },
    {
      q: 'האם התלמידים צריכים חשבונות או כתובות מייל?',
      a: 'לא. אתם מקרינים קוד הצטרפות בן 6 תווים, התלמידים מקלידים אותו בכל מכשיר, והם בתוך המשחק. בלי הרשמות, בלי מיילים, בלי סיסמאות לנהל.',
    },
    {
      q: 'אפשר לשחק בוגל עם רשימת אוצר המילים שלי?',
      a: 'כן. מעלים או מדביקים את מילות האיות או אוצר המילים של השבוע והמשחק בונה לוחות סביבן, כך שהתלמידים מתרגלים בדיוק את המילים שאתם מלמדים.',
    },
    {
      q: 'לאילו גילאים מתאים בוגל כיתתי?',
      a: 'בערך מגיל 8 ומעלה (כיתה ג׳ ועד תיכון). קוראים צעירים משחקים בזוגות עם קורא חזק יותר; תלמידים מבוגרים נהיים תחרותיים מהר על טבלת המובילים החיה.',
    },
    {
      q: 'זה עובד לשיעורי עברית, אנגלית או שפות?',
      a: 'כן. LexiClash כולל מילונים בשש שפות — עברית, אנגלית, ספרדית, שוודית, יפנית ורוסית — כך שאותו סבב בוגל עובד בכיתות שפה, אנגלית ושני-לשוניות.',
    },
  ],
  labels: { faqTitle: 'שאלות שמורים שואלים', relatedTitle: 'להמשיך לגלות' },
  related: [
    { href: '/education/vocabulary-games-classroom', label: 'משחקי אוצר מילים לכיתה', accent: 'lime' },
    { href: '/education/spelling-bee-practice', label: 'תרגול איות', accent: 'cyan' },
    { href: '/education/brain-breaks-word-games', label: 'משחקי הפסקת קשב', accent: 'purple' },
    { href: '/education', label: 'מרכז החינוך', accent: 'pink' },
  ],
  breadcrumb: { home: 'בית', hub: 'חינוך', current: 'בוגל לכיתה' },
  learning: LEARNING,
};

const ES: EducationLandingContent = {
  accent: 'cyan',
  meta: {
    title: 'Boggle online para el aula — Gratis, sin registro de alumnos | LexiClash',
    description:
      'Juega Boggle online con toda tu clase, gratis. Proyecta el tablero, los alumnos se unen con un código de 6 caracteres — sin cuentas ni descargas. Hasta 50 alumnos por clase juegan a la vez.',
    keywords: [
      'boggle online para el aula',
      'boggle para clase gratis',
      'juego de boggle para el aula',
      'boggle con alumnos',
      'juego de palabras proyectable',
    ],
  },
  hero: {
    facts: ['Juego principal gratis', 'Sin cuentas de alumnos', 'Rondas de 60–90 segundos', 'Hasta 50 alumnos por clase'],
    tag: '* Para docentes * Cero preparación *',
    h1: { part1: 'Boggle para el aula:', highlight: 'un tablero', part2: ', todos los alumnos a la vez' },
    subtitle:
      'Proyecta una cuadrícula de letras, comparte un código y toda la clase busca palabras en el mismo tablero en tiempo real. Boggle reinventado para un aula llena de alumnos.',
    primaryCta: { label: 'Iniciar un juego de clase', href: '/education/classroom-game' },
    secondaryCta: { label: 'Cargar una lista de palabras', href: '/education/lists' },
  },
  answer: {
    question: '¿Cómo se juega Boggle online con toda la clase?',
    answer:
      'Proyecta un tablero de LexiClash en la pantalla del aula, comparte el código de unión de 6 caracteres y cada alumno juega en la misma cuadrícula de letras a la vez desde su propio dispositivo — sin cuentas, sin descargas, sin instalar apps. Una ronda dura 60–90 segundos y los puntos se acumulan en vivo en la pantalla proyectada. El plan gratuito cubre hasta 50 alumnos por clase, y puedes cargar tu propia lista de vocabulario para convertir el juego en práctica dirigida de ortografía o vocabulario.',
  },
  sections: [
    {
      kind: 'steps',
      title: 'Una ronda de Boggle de 5 minutos, paso a paso',
      intro: 'Esta es toda la rutina. La primera vez la preparación toma dos minutos; después, menos de uno.',
      items: [
        {
          step: 'Paso 1',
          focus: 'Abrir un tablero',
          activity:
            'Abre LexiClash en el proyector o pizarra digital e inicia un juego de clase. Elige una lista de palabras incorporada o sube el vocabulario que tu clase estudia esta semana.',
        },
        {
          step: 'Paso 2',
          focus: 'Compartir el código',
          activity:
            'Un código de unión de 6 caracteres aparece en la pantalla grande. Los alumnos abren LexiClash en cualquier teléfono, tableta o portátil y lo escriben. Nadie crea una cuenta.',
        },
        {
          step: 'Paso 3',
          focus: 'Buscar palabras (60–90 segundos)',
          activity:
            'Todos juegan en la misma cuadrícula de letras al mismo tiempo, arrastrando sobre letras adyacentes para formar palabras. Las palabras más largas puntúan más. El aula se queda en silencio — y luego explota con los resultados.',
        },
        {
          step: 'Paso 4',
          focus: 'Marcador en vivo',
          activity:
            'Los puntos se acumulan en la pantalla proyectada a medida que caen las palabras. Anuncia la palabra más larga, celebra a los tres primeros y observa qué vocabulario se usó de verdad.',
        },
        {
          step: 'Paso 5',
          focus: 'Otra ronda',
          activity:
            'Un toque inicia un tablero nuevo. Dos o tres rondas caben en un calentamiento, o se convierten en un repaso completo de vocabulario con tu propia lista.',
        },
      ],
    },
    {
      kind: 'table',
      title: 'Tres formas de jugar Boggle en clase',
      intro: 'El mismo juego, tres formatos. Elige según los dispositivos disponibles y cuánta estructura quieres.',
      columns: ['Formato', 'Preparación', 'Ideal para', 'Tiempo'],
      rows: [
        [
          'Toda la clase, en vivo',
          'Proyector + un dispositivo por alumno',
          'Calentamientos, cierres de lección, días de repaso — máxima energía, todos en un tablero',
          '2–5 min',
        ],
        [
          'Grupos pequeños',
          'Un dispositivo por pareja o mesa',
          'Clases con pocos dispositivos; añade colaboración mientras el grupo negocia qué palabras entregar',
          '5–10 min',
        ],
        [
          'Práctica individual',
          'Cualquier dispositivo, a su ritmo',
          'Alumnos que terminan antes y práctica tipo tarea con la lista de ortografía de la semana',
          '3–10 min',
        ],
      ],
    },
    {
      kind: 'features',
      title: 'Por qué los docentes eligen LexiClash para Boggle en el aula',
      items: [
        { icon: 'lock', text: 'Sin cuentas ni correos de alumnos — los alumnos se unen con un código y juegan. Nada que configurar antes de clase.' },
        { icon: 'users', text: 'El plan gratuito cubre hasta 50 alumnos por clase y 3 clases. Teacher Pro ($9/mes) añade clases ilimitadas, analíticas e informes imprimibles.' },
        { icon: 'globe', text: 'Seis idiomas — inglés, hebreo, español, sueco, japonés y ruso — así que el mismo juego funciona en clases de inglés, idiomas y aulas bilingües.' },
        { icon: 'upload', text: 'Sube tu propia lista de palabras y el tablero se convierte en la unidad de ortografía o vocabulario de la semana, no en letras al azar.' },
        { icon: 'timer', text: 'Las rondas duran 60–90 segundos, así que Boggle cabe en un calentamiento, una pausa activa o un bloque de repaso completo.' },
        { icon: 'monitor', text: 'Funciona en cualquier navegador y dispositivo — proyector, pizarra digital, Chromebooks, teléfonos. Nada que instalar.' },
      ],
    },
    {
      kind: 'cards',
      title: 'Convierte una ronda de Boggle en una lección',
      intro: 'El juego es el anzuelo. Estas páginas son el plan de lección alrededor.',
      items: [
        {
          tag: 'Vocabulario',
          title: 'Juegos de vocabulario para el aula',
          desc: 'Siete formatos para convertir la lista de palabras de la semana en práctica en vivo, de duelos a tableros para toda la clase.',
          href: '/education/vocabulary-games-classroom',
          cta: 'Ver los formatos',
        },
        {
          tag: 'Ortografía',
          title: 'Práctica de ortografía',
          desc: 'Dirige la práctica de ortografía del mismo modo — proyecta, únete con un código, todos deletrean a la vez.',
          href: '/education/spelling-bee-practice',
          cta: 'Practicar ortografía',
        },
        {
          tag: 'Reinicio de atención',
          title: 'Juegos de palabras para pausas activas',
          desc: 'Cuando la clase lleva demasiado tiempo sentada, una ronda de palabras de 2 minutos devuelve la atención.',
          href: '/education/brain-breaks-word-games',
          cta: 'Reiniciar el aula',
        },
        {
          tag: 'Listas de palabras',
          title: 'Listas gratis por grado y tema',
          desc: 'Listas listas en inglés y hebreo por nivel de grado — carga una y juega, cero preparación.',
          href: '/education/lists',
          cta: 'Explorar listas',
        },
      ],
    },
  ],
  faqs: [
    {
      q: '¿Es gratis jugar Boggle online en el aula?',
      a: 'Sí. El juego principal es gratis: hasta 50 alumnos por clase y 3 clases en el plan gratuito. Teacher Pro ($9/mes) añade clases ilimitadas, analíticas de clase e informes imprimibles — el juego en sí nunca se bloquea.',
    },
    {
      q: '¿Mis alumnos necesitan cuentas o correos electrónicos?',
      a: 'No. Proyectas un código de unión de 6 caracteres, los alumnos lo escriben en cualquier dispositivo y ya están dentro del juego. Sin registros, sin correos, sin contraseñas que gestionar.',
    },
    {
      q: '¿Puedo jugar Boggle con mi propia lista de vocabulario?',
      a: 'Sí. Sube o pega las palabras de ortografía o vocabulario de la semana y el juego construye tableros alrededor de ellas, para que los alumnos practiquen exactamente las palabras que enseñas.',
    },
    {
      q: '¿Para qué edades sirve el Boggle en el aula?',
      a: 'Aproximadamente desde los 8 años (tercero de primaria hasta bachillerato). Los lectores más jóvenes juegan en parejas con un lector más fuerte; los mayores se vuelven competitivos rápido con el marcador en vivo.',
    },
    {
      q: '¿Funciona para clases de hebreo, español o inglés como lengua extranjera?',
      a: 'Sí. LexiClash incluye diccionarios en seis idiomas — inglés, hebreo, español, sueco, japonés y ruso — así que la misma ronda de Boggle funciona en clases de idiomas y aulas bilingües.',
    },
  ],
  labels: { faqTitle: 'Preguntas de docentes', relatedTitle: 'Sigue explorando' },
  related: [
    { href: '/education/vocabulary-games-classroom', label: 'Juegos de vocabulario para el aula', accent: 'lime' },
    { href: '/education/spelling-bee-practice', label: 'Práctica de ortografía', accent: 'cyan' },
    { href: '/education/brain-breaks-word-games', label: 'Juegos de pausas activas', accent: 'purple' },
    { href: '/education', label: 'Centro de educación', accent: 'pink' },
  ],
  breadcrumb: { home: 'Inicio', hub: 'Educación', current: 'Boggle para el aula' },
  learning: LEARNING,
};

const SV: EducationLandingContent = {
  accent: 'cyan',
  meta: {
    title: 'Boggle online för klassrummet — Gratis, ingen elevinloggning | LexiClash',
    description:
      'Spela Boggle online med hela klassen, gratis. Projektera tavlan, eleverna ansluter med en 6-teckenskod — inga konton, inga nedladdningar. Upp till 50 elever per klass spelar samtidigt.',
    keywords: [
      'boggle online för klassrummet',
      'boggle för klassen gratis',
      'klassrums boggle',
      'boggle med elever',
      'projekterbart ordspel',
    ],
  },
  hero: {
    facts: ['Gratis grundspel', 'Inga elevkonton', '60–90 sekunders rundor', 'Upp till 50 elever per klass'],
    tag: '* För lärare * Noll förberedelse *',
    h1: { part1: 'Boggle för klassrummet:', highlight: 'en tavla', part2: ', alla elever samtidigt' },
    subtitle:
      'Projektera ett bokstavsrutnät, dela en kod, och hela klassen letar ord på samma tavla i realtid. Boggle ombyggt för ett rum fullt av elever.',
    primaryCta: { label: 'Starta ett klassrumsspel', href: '/education/classroom-game' },
    secondaryCta: { label: 'Ladda en ordlista', href: '/education/lists' },
  },
  answer: {
    question: 'Hur spelar man Boggle online med en hel klass?',
    answer:
      'Projektera en LexiClash-tavla på klassrumsskärmen, dela den 6 tecken långa anslutningskoden, och varje elev spelar på samma bokstavsrutnät samtidigt från sin egen enhet — inga konton, inga nedladdningar, inga appinstallationer. En runda tar 60–90 sekunder och poängen räknas live på den projekterade skärmen. Gratisplanen täcker upp till 50 elever per klass, och du kan ladda upp din egen ordlista för att förvandla spelet till riktad stavnings- eller ordförrådsträning.',
  },
  sections: [
    {
      kind: 'steps',
      title: 'En 5-minuters Boggle-runda i klassen, steg för steg',
      intro: 'Det här är hela rutinen. Första gången tar uppsättningen två minuter; sedan under en.',
      items: [
        {
          step: 'Steg 1',
          focus: 'Öppna en tavla',
          activity:
            'Öppna LexiClash på projektorn eller smartboarden och starta ett klassrumsspel. Välj en inbyggd ordlista eller ladda upp veckans vokabulär.',
        },
        {
          step: 'Steg 2',
          focus: 'Dela koden',
          activity:
            'En 6 tecken lång anslutningskod visas på storskärmen. Eleverna öppnar LexiClash på valfri telefon, surfplatta eller dator och skriver in den. Ingen skapar ett konto.',
        },
        {
          step: 'Steg 3',
          focus: 'Leta ord (60–90 sekunder)',
          activity:
            'Alla spelar på samma bokstavsrutnät samtidigt och drar över intilliggande bokstäver för att bilda ord. Längre ord ger mer poäng. Rummet blir tyst — och högt vid avslöjandet.',
        },
        {
          step: 'Steg 4',
          focus: 'Live-resultattavla',
          activity:
            'Poängen räknas upp på den projekterade skärmen allteftersom orden landar. Ropa ut det längsta ordet, fira topp tre och notera vilken vokabulär som faktiskt användes.',
        },
        {
          step: 'Steg 5',
          focus: 'Kör en runda till',
          activity:
            'Ett tryck startar en ny tavla. Två–tre rundor får plats i en uppvärmning, eller blir en hel vokabulärrepetition med din egen lista.',
        },
      ],
    },
    {
      kind: 'table',
      title: 'Tre sätt att spela Boggle i klassen',
      intro: 'Samma spel, tre format. Välj efter tillgängliga enheter och hur mycket struktur du vill ha.',
      columns: ['Format', 'Uppsättning', 'Passar för', 'Tid'],
      rows: [
        [
          'Hela klassen, live',
          'Projektor + en enhet per elev',
          'Uppvärmningar, lektionsavslut, repetitionsdagar — maximal energi, alla på en tavla',
          '2–5 min',
        ],
        [
          'Små grupper',
          'En enhet per par eller bordsgrupp',
          'Klasser med få enheter; lägger till samarbete när gruppen förhandlar om vilka ord som ska lämnas in',
          '5–10 min',
        ],
        [
          'Egen träning',
          'Valfri enhet, i egen takt',
          'Elever som blir klara tidigt och läxliknande träning med veckans stavningslista',
          '3–10 min',
        ],
      ],
    },
    {
      kind: 'features',
      title: 'Därför väljer lärare LexiClash för Boggle i klassrummet',
      items: [
        { icon: 'lock', text: 'Inga elevkonton eller e-postadresser — eleverna ansluter med en kod och spelar. Inget att förbereda före lektionen.' },
        { icon: 'users', text: 'Gratisplanen täcker upp till 50 elever per klass och 3 klasser. Teacher Pro ($9/mån) lägger till obegränsat med klasser, analyser och utskrivbara rapporter.' },
        { icon: 'globe', text: 'Sex språk — engelska, hebreiska, spanska, svenska, japanska och ryska — så samma spel fungerar i engelsk-, språk- och hebreiskalektioner.' },
        { icon: 'upload', text: 'Ladda upp din egen ordlista så blir tavlan veckans stavnings- eller ordförrådsenhet, inte slumpmässiga bokstäver.' },
        { icon: 'timer', text: 'Rundorna tar 60–90 sekunder, så Boggle får plats i en uppvärmning, en hjärnpaus eller ett helt repetitionsblock.' },
        { icon: 'monitor', text: 'Körs i valfri webbläsare på valfri enhet — projektor, smartboard, Chromebooks, telefoner. Inget att installera.' },
      ],
    },
    {
      kind: 'cards',
      title: 'Förvandla en Boggle-runda till en lektion',
      intro: 'Spelet är kroken. De här sidorna är lektionsplaneringen runt omkring.',
      items: [
        {
          tag: 'Ordförråd',
          title: 'Ordförrådsspel för klassrummet',
          desc: 'Sju format för att förvandla veckans ordlista till liveträning, från dueller till tavlor för hela klassen.',
          href: '/education/vocabulary-games-classroom',
          cta: 'Se formaten',
        },
        {
          tag: 'Stavning',
          title: 'Stavningsträning',
          desc: 'Kör stavningsträning på samma sätt — projektera, anslut med en kod, alla stavar samtidigt.',
          href: '/education/spelling-bee-practice',
          cta: 'Träna stavning',
        },
        {
          tag: 'Fokusåterställning',
          title: 'Ordspel för hjärnpauser',
          desc: 'När klassen har suttit för länge ger en 2-minuters ord-runda tillbaka uppmärksamheten.',
          href: '/education/brain-breaks-word-games',
          cta: 'Återställ rummet',
        },
        {
          tag: 'Ordlistor',
          title: 'Gratis listor per årskurs och tema',
          desc: 'Färdiga listor på engelska och hebreiska per årskurs — ladda en och spela, noll förberedelse.',
          href: '/education/lists',
          cta: 'Bläddra bland listor',
        },
      ],
    },
  ],
  faqs: [
    {
      q: 'Är Boggle online gratis att använda i klassrummet?',
      a: 'Ja. Grundspelet är gratis: upp till 50 elever per klass och 3 klasser på gratisplanen. Teacher Pro ($9/mån) lägger till obegränsat med klasser, klassanalyser och utskrivbara rapporter — själva spelet låses aldrig.',
    },
    {
      q: 'Behöver mina elever konton eller e-postadresser?',
      a: 'Nej. Du projekterar en 6 tecken lång anslutningskod, eleverna skriver in den på valfri enhet och är med i spelet. Inga registreringar, inga e-postadresser, inga lösenord att hantera.',
    },
    {
      q: 'Kan jag spela Boggle med min egen ordlista?',
      a: 'Ja. Ladda upp eller klistra in veckans stavnings- eller ordförrådsord så bygger spelet tavlor runt dem, så att eleverna tränar exakt de ord du undervisar.',
    },
    {
      q: 'Vilka åldrar passar Boggle i klassrummet för?',
      a: 'Ungefär från 8 år och uppåt (årskurs 3 till gymnasiet). Yngre läsare spelar i par med en starkare läsare; äldre elever blir snabbt tävlingsinriktade på live-resultattavlan.',
    },
    {
      q: 'Fungerar det för hebreiska, spanska eller engelsklektioner?',
      a: 'Ja. LexiClash levereras med ordböcker på sex språk — engelska, hebreiska, spanska, svenska, japanska och ryska — så samma Boggle-runda fungerar i språklektioner och tvåspråkiga klassrum.',
    },
  ],
  labels: { faqTitle: 'Frågor lärare ställer', relatedTitle: 'Utforska vidare' },
  related: [
    { href: '/education/vocabulary-games-classroom', label: 'Ordförrådsspel för klassrummet', accent: 'lime' },
    { href: '/education/spelling-bee-practice', label: 'Stavningsträning', accent: 'cyan' },
    { href: '/education/brain-breaks-word-games', label: 'Ordspel för hjärnpauser', accent: 'purple' },
    { href: '/education', label: 'Utbildningshubben', accent: 'pink' },
  ],
  breadcrumb: { home: 'Hem', hub: 'Utbildning', current: 'Boggle för klassrummet' },
  learning: LEARNING,
};

const JA: EducationLandingContent = {
  accent: 'cyan',
  meta: {
    title: '教室で遊べるオンラインBoggle — 無料・生徒のログイン不要 | LexiClash',
    description:
      'クラス全員でオンラインBoggleを無料プレイ。ボードを投影し、生徒は6文字のコードで参加 — アカウントもダウンロードも不要。1クラス50人まで同時に遊べます。',
    keywords: [
      '教室 Boggle オンライン',
      'クラスで遊ぶ Boggle 無料',
      '授業向け Boggle',
      '生徒と遊ぶ Boggle',
      'プロジェクターで遊ぶ単語ゲーム',
    ],
  },
  hero: {
    facts: ['基本プレイ無料', '生徒のアカウント不要', '60〜90秒のラウンド', '1クラス50人まで'],
    tag: '* 先生向け * 準備ゼロ *',
    h1: { part1: '教室のBoggle:', highlight: 'ボードは1つ', part2: '、生徒は全員同時に' },
    subtitle:
      '文字のグリッドを投影し、コードを共有するだけで、クラス全員が同じボードでリアルタイムに単語探し。教室のために作り直されたBoggleです。',
    primaryCta: { label: 'クラスゲームを始める', href: '/education/classroom-game' },
    secondaryCta: { label: '単語リストを読み込む', href: '/education/lists' },
  },
  answer: {
    question: 'クラス全員でオンラインBoggleを遊ぶには？',
    answer:
      '教室のスクリーンにLexiClashのボードを投影し、6文字の参加コードを共有すれば、生徒全員が自分のデバイスから同じ文字グリッドで同時にプレイできます — アカウント不要、ダウンロード不要、アプリのインストールも不要。1ラウンドは60〜90秒で、スコアは投影画面にライブ表示されます。無料プランは1クラス50人まで対応。自分の語彙リストを読み込めば、ゲームがそのままスペリングや語彙の練習になります。',
  },
  sections: [
    {
      kind: 'steps',
      title: '5分でできる教室Boggleの進め方',
      intro: '手順はこれだけです。初回の準備は2分、2回目からは1分以内。',
      items: [
        {
          step: 'ステップ1',
          focus: 'ボードを開く',
          activity:
            'プロジェクターや電子黒板でLexiClashを開き、クラスゲームを開始します。内蔵の単語リストを選ぶか、今週の語彙をアップロードしてください。',
        },
        {
          step: 'ステップ2',
          focus: 'コードを共有',
          activity:
            '大画面に6文字の参加コードが表示されます。生徒はスマホ・タブレット・ノートPCでLexiClashを開いて入力するだけ。アカウント作成は不要です。',
        },
        {
          step: 'ステップ3',
          focus: '単語探し（60〜90秒）',
          activity:
            '全員が同じ文字グリッドで同時にプレイし、隣接する文字をなぞって単語を作ります。長い単語ほど高得点。教室が静まり — 結果発表でどっと盛り上がります。',
        },
        {
          step: 'ステップ4',
          focus: 'ライブスコアボード',
          activity:
            '単語が決まるたびに投影画面でスコアが集計されます。最長の単語を発表し、上位3人を称え、どの語彙が実際に使われたかを確認しましょう。',
        },
        {
          step: 'ステップ5',
          focus: 'もう1ラウンド',
          activity:
            'ワンタップで新しいボードが始まります。2〜3ラウンドなら導入のウォームアップに、自分のリストを使えば本格的な語彙復習になります。',
        },
      ],
    },
    {
      kind: 'table',
      title: '教室でBoggleを遊ぶ3つの方法',
      intro: '同じゲーム、3つのフォーマット。使えるデバイスと欲しい構造で選んでください。',
      columns: ['フォーマット', '準備', 'おすすめの場面', '時間'],
      rows: [
        [
          'クラス全員でライブ',
          'プロジェクター + 生徒各自のデバイス',
          'ウォームアップ、授業の締め、復習日 — 最高の盛り上がり、全員が同じボードに',
          '2〜5分',
        ],
        [
          '少人数グループ',
          'ペアまたは班に1台',
          'デバイスが少ないクラス。どの単語を出すか話し合う協力学習が加わります',
          '5〜10分',
        ],
        [
          '個人練習',
          '任意のデバイス、自分のペースで',
          '早く終わった生徒への課題や、今週のスペリングリストを使った宿題的な練習に',
          '3〜10分',
        ],
      ],
    },
    {
      kind: 'features',
      title: '先生が教室のBoggleにLexiClashを選ぶ理由',
      items: [
        { icon: 'lock', text: '生徒のアカウントもメールも不要 — コードで参加してすぐプレイ。授業前の準備はありません。' },
        { icon: 'users', text: '無料プランは1クラス50人・3クラスまで。Teacher Pro（月額$9）でクラス無制限、分析、印刷用レポートが追加されます。' },
        { icon: 'globe', text: '6言語対応 — 英語・ヘブライ語・スペイン語・スウェーデン語・日本語・ロシア語。英語の授業にも外国語の授業にも使えます。' },
        { icon: 'upload', text: '自分の単語リストをアップロードすれば、ボードが今週のスペリングや語彙の単元に。ランダムな文字ではありません。' },
        { icon: 'timer', text: '1ラウンド60〜90秒だから、ウォームアップにも、リフレッシュ休憩にも、本格復習にもはまります。' },
        { icon: 'monitor', text: 'どのブラウザ・どのデバイスでも動作 — プロジェクター、電子黒板、Chromebook、スマホ。インストール不要。' },
      ],
    },
    {
      kind: 'cards',
      title: 'Boggleの1ラウンドを授業に変える',
      intro: 'ゲームは入口。このページたちが授業プランです。',
      items: [
        {
          tag: '語彙',
          title: '教室向け語彙ゲーム',
          desc: '今週の単語リストをライブ練習に変える7つのフォーマット。デュエルからクラス全員のボードまで。',
          href: '/education/vocabulary-games-classroom',
          cta: 'フォーマットを見る',
        },
        {
          tag: 'スペリング',
          title: 'スペリング練習',
          desc: '同じやり方でスペリング練習 — 投影して、コードで参加、全員が同時にスペリング。',
          href: '/education/spelling-bee-practice',
          cta: 'スペリングを練習',
        },
        {
          tag: '集中リセット',
          title: 'ブレインブレイクの単語ゲーム',
          desc: '長時間座り続けた後は、2分の単語ラウンドで集中が戻ります。',
          href: '/education/brain-breaks-word-games',
          cta: '教室をリセット',
        },
        {
          tag: '単語リスト',
          title: '学年・テーマ別の無料リスト',
          desc: '英語・ヘブライ語の学年別リストがすぐ使えます。読み込んでプレイ、準備ゼロ。',
          href: '/education/lists',
          cta: 'リストを見る',
        },
      ],
    },
  ],
  faqs: [
    {
      q: '教室で使うBoggleは無料ですか？',
      a: 'はい。基本のゲームは無料で、無料プランは1クラス50人・3クラスまで使えます。Teacher Pro（月額$9）でクラス無制限・クラス分析・印刷用レポートが追加されますが、ゲーム自体がロックされることはありません。',
    },
    {
      q: '生徒はアカウントやメールアドレスが必要ですか？',
      a: 'いいえ。6文字の参加コードを投影し、生徒が任意のデバイスで入力すればすぐゲームに入れます。登録もメールもパスワード管理も不要です。',
    },
    {
      q: '自分の語彙リストでBoggleを遊べますか？',
      a: 'はい。今週のスペリングや語彙の単語をアップロードまたは貼り付けると、その単語を中心にボードが作られるので、教えている単語をそのまま練習できます。',
    },
    {
      q: '教室のBoggleは何歳向けですか？',
      a: 'おおよそ8歳以上（小学3年から高校生まで）。低学年は読みの得意な生徒とペアで、高学年はライブスコアボードで競争心に火がつきます。',
    },
    {
      q: 'ヘブライ語やスペイン語、英語の授業でも使えますか？',
      a: 'はい。LexiClashには6言語の辞書 — 英語・ヘブライ語・スペイン語・スウェーデン語・日本語・ロシア語 — があるので、同じBoggleラウンドが語学の授業やバイリンガルクラスでも使えます。',
    },
  ],
  labels: { faqTitle: '先生からのよくある質問', relatedTitle: 'さらに探す' },
  related: [
    { href: '/education/vocabulary-games-classroom', label: '教室向け語彙ゲーム', accent: 'lime' },
    { href: '/education/spelling-bee-practice', label: 'スペリング練習', accent: 'cyan' },
    { href: '/education/brain-breaks-word-games', label: 'ブレインブレイク・ゲーム', accent: 'purple' },
    { href: '/education', label: '教育ハブ', accent: 'pink' },
  ],
  breadcrumb: { home: 'ホーム', hub: '教育', current: '教室のためのBoggle' },
  learning: LEARNING,
};

const RU: EducationLandingContent = {
  accent: 'cyan',
  meta: {
    title: 'Боггл онлайн для класса — бесплатно, без регистрации учеников | LexiClash',
    description:
      'Играйте в Боггл онлайн всем классом бесплатно. Проецируйте поле, ученики заходят по коду из 6 символов — без аккаунтов и скачиваний. До 50 учеников в классе играют одновременно.',
    keywords: [
      'боггл онлайн для класса',
      'боггл для класса бесплатно',
      'классная игра боггл',
      'боггл с учениками',
      'словесная игра для проектора',
    ],
  },
  hero: {
    facts: ['Основная игра бесплатна', 'Без аккаунтов для учеников', 'Раунды 60–90 секунд', 'До 50 учеников в классе'],
    tag: '* Учителям * Ноль подготовки *',
    h1: { part1: 'Боггл для класса:', highlight: 'одно поле', part2: ', все ученики сразу' },
    subtitle:
      'Спроецируйте сетку букв, поделитесь кодом — и весь класс ищет слова на одном поле в реальном времени. Боггл, пересобранный для класса, полного учеников.',
    primaryCta: { label: 'Начать классную игру', href: '/education/classroom-game' },
    secondaryCta: { label: 'Загрузить список слов', href: '/education/lists' },
  },
  answer: {
    question: 'Как играть в Боггл онлайн со всем классом?',
    answer:
      'Спроецируйте поле LexiClash на экран класса, поделитесь кодом из 6 символов — и каждый ученик играет на той же сетке букв одновременно со своего устройства: без аккаунтов, без скачиваний, без установки приложений. Раунд длится 60–90 секунд, очки подсчитываются на экране в реальном времени. Бесплатный тариф покрывает до 50 учеников в классе, а свой список слов превращает игру в точечную практику орфографии и словарного запаса.',
  },
  sections: [
    {
      kind: 'steps',
      title: 'Пятиминутный раунд Боггла в классе, шаг за шагом',
      intro: 'Это вся процедура. В первый раз настройка занимает две минуты; дальше — меньше одной.',
      items: [
        {
          step: 'Шаг 1',
          focus: 'Открыть поле',
          activity:
            'Откройте LexiClash на проекторе или интерактивной доске и начните классную игру. Выберите встроенный список слов или загрузите лексику, которую класс проходит на этой неделе.',
        },
        {
          step: 'Шаг 2',
          focus: 'Поделиться кодом',
          activity:
            'На большом экране появляется код из 6 символов. Ученики открывают LexiClash на любом телефоне, планшете или ноутбуке и вводят его. Никто не создаёт аккаунт.',
        },
        {
          step: 'Шаг 3',
          focus: 'Искать слова (60–90 секунд)',
          activity:
            'Все играют на одной сетке букв одновременно, проводя по соседним буквам и составляя слова. Длинные слова стоят больше. Класс замирает — и взрывается при оглашении результатов.',
        },
        {
          step: 'Шаг 4',
          focus: 'Живая таблица результатов',
          activity:
            'Очки накапливаются на экране по мере появления слов. Назовите самое длинное слово, поаплодируйте тройке лидеров и отметьте, какая лексика реально использовалась.',
        },
        {
          step: 'Шаг 5',
          focus: 'Ещё раунд',
          activity:
            'Одно нажатие — и новое поле готово. Два-три раунда помещаются в разминку, а со своим списком превращаются в полноценное повторение лексики.',
        },
      ],
    },
    {
      kind: 'table',
      title: 'Три способа играть в Боггл в классе',
      intro: 'Одна игра, три формата. Выбирайте по количеству устройств и желаемой структуре.',
      columns: ['Формат', 'Подготовка', 'Для чего подходит', 'Время'],
      rows: [
        [
          'Весь класс, в реальном времени',
          'Проектор + устройство у каждого ученика',
          'Разминки, завершение урока, дни повторения — максимум энергии, все на одном поле',
          '2–5 мин',
        ],
        [
          'Малые группы',
          'Одно устройство на пару или группу',
          'Классы с нехваткой устройств; добавляет сотрудничество — группа обсуждает, какие слова сдавать',
          '5–10 мин',
        ],
        [
          'Самостоятельная практика',
          'Любое устройство, в своём темпе',
          'Ученикам, которые справились раньше, и домашняя практика со списком недели',
          '3–10 мин',
        ],
      ],
    },
    {
      kind: 'features',
      title: 'Почему учителя выбирают LexiClash для Боггла в классе',
      items: [
        { icon: 'lock', text: 'Без аккаунтов и почты для учеников — заходят по коду и играют. Ничего не нужно настраивать до урока.' },
        { icon: 'users', text: 'Бесплатный тариф покрывает до 50 учеников в классе и 3 класса. Teacher Pro ($9/мес) добавляет неограниченные классы, аналитику и печатные отчёты.' },
        { icon: 'globe', text: 'Шесть языков — английский, иврит, испанский, шведский, японский и русский — одна игра работает на уроках английского, иностранных языков и в двуязычных классах.' },
        { icon: 'upload', text: 'Загрузите свой список слов — и поле становится орфографической или лексической темой недели, а не случайными буквами.' },
        { icon: 'timer', text: 'Раунды по 60–90 секунд: Боггл помещается в разминку, разминку-перезагрузку или полный блок повторения.' },
        { icon: 'monitor', text: 'Работает в любом браузере на любом устройстве — проектор, интерактивная доска, хромбуки, телефоны. Ничего устанавливать не нужно.' },
      ],
    },
    {
      kind: 'cards',
      title: 'Превратите один раунд Боггла в урок',
      intro: 'Игра — это крючок. Эти страницы — план урока вокруг неё.',
      items: [
        {
          tag: 'Словарный запас',
          title: 'Словесные игры для класса',
          desc: 'Семь форматов, превращающих список недели в живую практику — от дуэлей до поля на весь класс.',
          href: '/education/vocabulary-games-classroom',
          cta: 'Смотреть форматы',
        },
        {
          tag: 'Орфография',
          title: 'Практика орфографии',
          desc: 'Проводите орфографическую практику так же — проектор, вход по коду, все пишут одновременно.',
          href: '/education/spelling-bee-practice',
          cta: 'Тренировать орфографию',
        },
        {
          tag: 'Сброс внимания',
          title: 'Игры для разминки внимания',
          desc: 'Когда класс слишком долго сидит, двухминутный раунд слов возвращает внимание.',
          href: '/education/brain-breaks-word-games',
          cta: 'Перезагрузить класс',
        },
        {
          tag: 'Списки слов',
          title: 'Бесплатные списки по классам и темам',
          desc: 'Готовые списки на английском и иврите по уровням — загрузите и играйте, ноль подготовки.',
          href: '/education/lists',
          cta: 'Смотреть списки',
        },
      ],
    },
  ],
  faqs: [
    {
      q: 'Бесплатен ли Боггл онлайн для класса?',
      a: 'Да. Основная игра бесплатна: до 50 учеников в классе и 3 класса на бесплатном тарифе. Teacher Pro ($9/мес) добавляет неограниченные классы, аналитику класса и печатные отчёты — сама игра никогда не блокируется.',
    },
    {
      q: 'Нужны ли ученикам аккаунты или электронная почта?',
      a: 'Нет. Вы проецируете код из 6 символов, ученики вводят его на любом устройстве — и они уже в игре. Без регистрации, без почты, без паролей.',
    },
    {
      q: 'Можно ли играть в Боггл со своим списком слов?',
      a: 'Да. Загрузите или вставьте орфографические или лексические слова недели, и игра построит поля вокруг них — ученики практикуют именно те слова, которые вы преподаёте.',
    },
    {
      q: 'Для какого возраста подходит классный Боггл?',
      a: 'Примерно с 8 лет (с 3 класса до старшей школы). Младшие читатели играют в парах с более сильным читателем; старшие быстро входят в азарт на живой таблице результатов.',
    },
    {
      q: 'Подходит ли он для уроков иврита, испанского или английского?',
      a: 'Да. В LexiClash есть словари на шести языках — английском, иврите, испанском, шведском, японском и русском — поэтому один и тот же раунд Боггла работает на уроках языка и в двуязычных классах.',
    },
  ],
  labels: { faqTitle: 'Вопросы учителей', relatedTitle: 'Узнать больше' },
  related: [
    { href: '/education/vocabulary-games-classroom', label: 'Словесные игры для класса', accent: 'lime' },
    { href: '/education/spelling-bee-practice', label: 'Практика орфографии', accent: 'cyan' },
    { href: '/education/brain-breaks-word-games', label: 'Игры для разминки внимания', accent: 'purple' },
    { href: '/education', label: 'Образовательный центр', accent: 'pink' },
  ],
  breadcrumb: { home: 'Главная', hub: 'Образование', current: 'Боггл для класса' },
  learning: LEARNING,
};

const MAP: Record<string, EducationLandingContent> = { en: EN, he: HE, es: ES, sv: SV, ja: JA, ru: RU };

export function getBoggleClassroomContent(locale: string): EducationLandingContent {
  return MAP[locale] ?? EN;
}
