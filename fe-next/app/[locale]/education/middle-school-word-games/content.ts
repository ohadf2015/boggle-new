import type { EducationLandingContent } from '@/lib/seo/educationLanding';

const EN: EducationLandingContent = {
  accent: 'pink',
  meta: {
    title: 'Word Games for Middle School | Vocabulary Building',
    description: 'Free word games for 6th–8th grade classrooms. Real competitive gameplay, custom vocabulary lists, live multiplayer—no email required.',
    keywords: [
      'word games for middle school',
      'vocabulary games for middle school',
      'middle school ELA games',
      'word games for 6th grade',
      'vocabulary review games',
      'classroom word games',
      'games for teenagers classroom',
      'middle school language arts games',
    ],
  },
  hero: {
    facts: [
      'Free to start',
      'No student email needed',
      'Works on any device',
      'Upload your own word lists',
    ],
    h1: {
      part1: 'Word games that middle schoolers',
      highlight: 'actually want to play',
      part2: '',
    },
    subtitle:
      'Competitive, real stakes, no mascots. Join live with a code—up to a whole class at once.',
    primaryCta: {
      label: 'Create a free classroom',
      href: '/education/classroom-game',
    },
    secondaryCta: {
      label: 'See how it works',
      href: '/education',
    },
  },
  answer: {
    question: 'What word games work for middle school classrooms?',
    answer:
      'LexiClash is a free browser-based word game where students join live classrooms with a code to compete in word hunts, vocabulary challenges, and real-time multiplayer games. Teachers get progress tracking and can upload custom vocabulary lists for any subject. No email required.',
  },
  sections: [
    {
      kind: 'wordlist',
      title: 'Tier-2 Academic Vocabulary: Words Middle Schoolers Actually Encounter',
      intro:
        'These are real words from texts, tests, and class discussions—not the baby-friendly lists from fifth grade.',
      groups: [
        {
          label: 'Words that show up everywhere',
          words: [
            'analyze',
            'consequence',
            'evidence',
            'infer',
            'bias',
            'perspective',
            'interpret',
            'significant',
            'modify',
            'attribute',
          ],
        },
        {
          label: 'Words for writing arguments',
          words: [
            'validate',
            'contradict',
            'concede',
            'substantiate',
            'relevant',
            'circumstance',
            'distinguish',
            'assertion',
            'advocate',
            'equitable',
          ],
        },
        {
          label: 'Words examiners use in questions',
          words: [
            'assess',
            'illustrate',
            'synthesize',
            'deduce',
            'differentiate',
            'elaborate',
            'critique',
            'justify',
            'specify',
            'evaluate',
          ],
        },
        {
          label: 'Words that trip up readers',
          words: [
            'ambiguous',
            'meticulous',
            'resilient',
            'diligent',
            'pragmatic',
            'obscure',
            'implicit',
            'endeavor',
            'lucid',
            'candid',
          ],
        },
      ],
    },
    {
      kind: 'table',
      title: 'Why Most Primary-Grade Games Fail at This Age',
      intro:
        'Middle schoolers will spot—and reject—pedagogy designed for 9-year-olds. Here\'s what actually works:',
      columns: [
        'What works in primary',
        'Why it fails with teenagers',
        'What to do instead',
      ],
      rows: [
        [
          'Cartoon mascots, bright colors',
          'Signals "this is for little kids"—instant refusal',
          'Bold, electric design. Dark mode. Real competitive branding.',
        ],
        [
          'Simple words only (cat, run, happy)',
          'Boredom. Too easy → no challenge → no buy-in',
          'Academic vocabulary they see in real texts. Proper difficulty.',
        ],
        [
          'Everyone gets a participation trophy',
          'Fake stakes = no motivation. They know the difference.',
          'Real leaderboards. Visible win/loss. Public class rankings.',
        ],
        [
          'Slow turn-based games',
          'Teenagers have no patience. Feels ancient.',
          'Fast, live gameplay. Real-time competition. Immediate feedback.',
        ],
        [
          'Isolated practice mode',
          'They want to see themselves beat their friends, not an algorithm',
          'Whole-class multiplayer. 1-on-1 duels. Compare scores publicly.',
        ],
        [
          'Teacher has no visibility',
          'Zero accountability = zero parental support for classroom time',
          'Dashboard shows who knows what. Missed-word patterns. Per-student progress.',
        ],
      ],
    },
    {
      kind: 'cards',
      title: 'What Middle Schoolers Get Out of It',
      items: [
        {
          title: 'Vocabulary sticks faster',
          desc: 'Competitive games trigger memory better than worksheets. They play to win—not because the teacher said so.',
        },
        {
          title: 'Real-time reading of the room',
          desc: 'Your dashboard shows exactly who struggled with which words. Rescan gaps before the test.',
        },
        {
          title: 'Custom word lists',
          desc: 'Upload vocabulary from your current unit, a standardized test, or the book they\'re reading. Not generic games.',
        },
        {
          title: 'Your classroom, live, together',
          desc: 'No email signup. No accounts to manage. Share a code, students join, you play.',
        },
        {
          title: 'Works everywhere',
          desc: 'Chromebook, iPad, phone, smartboard. No install. No admin approval.',
        },
      ],
    },
  ],
  faqs: [
    {
      q: 'Do students need email addresses?',
      a: 'No. For live classroom games, they join with a code only. If they want to track personal progress, they can choose to sign in, but it\'s not required.',
    },
    {
      q: 'How do I know what my students learned?',
      a: 'Your teacher dashboard shows accuracy by word, attempt count, and patterns across the class. Export reports to your gradebook.',
    },
    {
      q: 'Can I upload my own vocabulary?',
      a: 'Yes. Upload a word list for any subject or test. LexiClash generates games from your words.',
    },
    {
      q: 'Does competitive gameplay turn off struggling readers?',
      a: 'It depends on how you frame it. LexiClash lets you hide leaderboards, group students by level, or focus on individual improvement. Games also move fast, so a low score feels less stigmatizing than a failed test.',
    },
    {
      q: 'How long is a typical game?',
      a: 'Most games are 5–15 minutes. Perfect for a warm-up or review, not a full class period.',
    },
    {
      q: 'Is there chat or external content?',
      a: 'No. Classroom games are closed to your students only. No chat, no links, no third-party ads.',
    },
    {
      q: 'Will my school block this?',
      a: 'LexiClash is educational and usually whitelisted. If you hit a block, contact your IT team—we can help make the case.',
    },
    {
      q: 'What devices does it work on?',
      a: 'Chromebooks, iPads, phones, laptops, and smartboards. No install needed. Just open the browser and join.',
    },
  ],
  labels: {
    faqTitle: 'Questions?',
    relatedTitle: 'Explore more for your classroom',
  },
  related: [
    { href: '/education/vocabulary-games-classroom', label: 'Vocabulary Games for Any Class', accent: 'cyan' },
    { href: '/education/esl-word-games', label: 'ESL Word Games & Tests', accent: 'lime' },
    { href: '/education/end-of-year-classroom-activities', label: 'End-of-Year Games', accent: 'pink' },
    { href: '/education', label: 'All Education Resources', accent: 'purple' },
  ],
  breadcrumb: {
    home: 'Home',
    hub: 'Education',
    current: 'Middle School Word Games',
  },
  learning: {
    educationalUse: ['Classroom Activity', 'Vocabulary Development'],
    educationalLevel: ['Secondary'],
    typicalAgeRange: '11-15',
    teaches: 'Vocabulary acquisition, lexical recall, academic language, competitive communication',
    timeRequired: 'PT15M',
  },
};

const HE: EducationLandingContent = {
  accent: 'pink',
  meta: {
    title: 'משחקי מילים לחטיבת ביניים | אוצר מילים',
    description: 'משחקי מילים חינמיים לכיתות ז׳–ט׳. תחרות אמיתיות, רשימות מילים מותאמות, משחק בהזמן הממשי—ללא דוא״ל.',
    keywords: [
      'משחקי מילים לחטיבת ביניים',
      'משחקי אוצר מילים',
      'משחקים לעברית בחטיבה',
      'משחקי תחרות כיתתיות',
      'משחקים לשיעורי שפה',
      'משחקי עברית תחרותיים',
      'פעילויות חטיבה ביניים',
      'אימון מילים לבחינות',
    ],
  },
  hero: {
    facts: [
      'חינמי להתחלה',
      'אין צורך בדוא״ל',
      'עובד בכל מכשיר',
      'העלו רשימות מילים משלכם',
    ],
    h1: {
      part1: 'משחקי מילים שתלמידי חטיבה',
      highlight: 'באמת רוצים לשחק',
      part2: '',
    },
    subtitle:
      'תחרויות אמיתיות, הימורים שקול, ללא דמויות קטנות. הצטרפו עם קוד—כל הכיתה בו-זמנית.',
    primaryCta: {
      label: 'צרו כיתה חינמית',
      href: '/education/classroom-game',
    },
    secondaryCta: {
      label: 'ראה איך זה עובד',
      href: '/education',
    },
  },
  answer: {
    question: 'אילו משחקי מילים מתאימים לחטיבת ביניים?',
    answer:
      'LexiClash היא משחק מילים חינמי בדפדפן שבו תלמידים נכנסים לכיתות חיות עם קוד כדי להתחרות בציד מילים, אתגרי אוצר מילים ומשחקים מרובי שחקנים בזמן אמת. מורים מקבלים מעקב התקדמות ויכולים להעלות רשימות מילים מותאמות לכל נושא. אין דוא״ל נדרש.',
  },
  sections: [
    {
      kind: 'wordlist',
      title: 'אוצר מילים רמה שנייה: מילים שתלמידי חטיבה באמת פוגשים',
      intro:
        'אלו מילים אמיתיות מטקסטים, מבחנים ודיונים בכיתה—לא הרשימות המילים של כיתה ה׳.',
      groups: [
        {
          label: 'מילים שמופיעות בכל מקום',
          words: [
            'נתח',
            'השלכה',
            'עדויות',
            'הסיק',
            'הטיה',
            'נקודת מבט',
            'פירש',
            'משמעותי',
            'שינה',
            'יחס',
          ],
        },
        {
          label: 'מילים לכתיבת דיון',
          words: [
            'אישר',
            'הכחיש',
            'הודה',
            'תמך',
            'רלוונטי',
            'נסיבה',
            'הבחין',
            'טענה',
            'תומך',
            'הוגן',
          ],
        },
        {
          label: 'מילים שבודקים משתמשים בהן',
          words: [
            'הערך',
            'הדגים',
            'סנתז',
            'השלים',
            'הבחין',
            'הרחיב',
            'בקר',
            'הצדיק',
            'פירט',
            'בחן',
          ],
        },
        {
          label: 'מילים שמקשות על קורא',
          words: [
            'עמום',
            'קפדן',
            'עמיד',
            'חרוץ',
            'פרגמטי',
            'עלום',
            'משתמע',
            'משאפה',
            'צלול',
            'ישיר',
          ],
        },
      ],
    },
    {
      kind: 'table',
      title: 'למה משחקים מ׳ עד ו׳ משנים כאן',
      intro:
        'תלמידי חטיבה יודעים—ויפילו—פדגוגיה שעוצבה לילדים בני 9. מה באמת עובד:',
      columns: [
        'מה עובד בדרגות נמוכות',
        'למה זה נכשל בחטיבה',
        'מה לעשות במקום זאת',
      ],
      rows: [
        [
          'דמויות קריקטורה, צבעים בהירים',
          'זה אומר ״זה למילדים קטנים״—דחיה מיידית',
          'עיצוב אמיץ וחשמלי. מצב כהה. מותג תחרותי אמיתי.',
        ],
        [
          'מילים פשוטות בלבד (חתול, רץ, שמח)',
          'עמל. קל מדי = אין אתגר = אין עניין',
          'אוצר מילים אקדמי שהם רואים בטקסטים אמיתיים. קושי נאות.',
        ],
        [
          'כולם מקבלים תו על השתתפות',
          'הימורים מזויפים = אין מוטיבציה. הם יודעים את ההבדל.',
          'לוחות דירוג אמיתיים. אבדות ניצחונות גלויות. דירוגי כיתה ציבוריים.',
        ],
        [
          'משחקים הופכיים איטיים',
          'לתלמידים אין סבלנות. זה מרגיש עתיק.',
          'משחק חי מהיר. תחרות בזמן אמת. משוב מיידי.',
        ],
        [
          'מצב התרגול המבודד',
          'הם רוצים לראות את עצמם מנצחים חברים, לא אלגוריתם',
          'משחק מרובי שחקנים בכיתה כולה. דו-קרבות 1-על-1. השווה ניקוד בפומבי.',
        ],
        [
          'המורה לא רואה',
          'אין אחריות = אין תמיכה הורים לזמן בכיתה',
          'לוח מחוונים מראה מי יודע מה. דפוסי מילים שהוחמצו. התקדמות לפי תלמיד.',
        ],
      ],
    },
    {
      kind: 'cards',
      title: 'מה תלמידי חטיבה מקבלים ממנו',
      items: [
        {
          title: 'אוצר מילים תופס מהר יותר',
          desc: 'משחקים תחרותיים מעוררים זיכרון טוב יותר מדפי עבודה. הם משחקים כדי לנצח—לא כי המורה אמר.',
        },
        {
          title: 'קריאה בזמן אמת של הכיתה',
          desc: 'לוח המחוונים שלך מראה בדיוק מי התקשה איזו מילים. סקרו מחדש פערים לפני הבדיקה.',
        },
        {
          title: 'רשימות מילים מותאמות',
          desc: 'העלו אוצר מילים מיחידתך הנוכחית, בדיקה סטנדרטית, או הספר שהם קוראים. לא משחקים גנריים.',
        },
        {
          title: 'הכיתה שלך, חיה, ביחד',
          desc: 'אין רישום דוא״ל. אין חשבונות לניהול. שתף קוד, תלמידים מצטרפים, אתם משחקים.',
        },
        {
          title: 'עובד בכל מקום',
          desc: 'Chromebook, iPad, טלפון, לוח חכם. אין התקנה. אין אישור של מנהל.',
        },
      ],
    },
    {
      kind: 'cards',
      title: 'שאלות נפוצות',
      items: [
        {
          title: 'האם הם באמת צריכים דוא״ל?',
          desc: 'לא. למשחקי כיתה חיים, תלמידים מצטרפים עם קוד בלבד. אין רישום.',
        },
        {
          title: 'כיצד אעקוב אחרי מי שלמד מה?',
          desc: 'לוח הנתיבים של המורה מראה דיוק מילים לפי תלמיד, ספור ניסיון ודפוסים בכל הכיתה. ייצא נתונים לתיעודים אם אתה צריך.',
        },
        {
          title: 'האם אוכל להשתמש במילים מתכנית הלימודים שלי?',
          desc: 'כן. העלו כל רשימת מילים—אוצר מילים ספר, הכנה לבדיקה, מונחים ספציפיים לנושא. LexiClash בונה משחקים מהמילים שלך.',
        },
        {
          title: 'האם תחרות מסיתות קוראים חלשים?',
          desc: 'אם לוחות הדירוג ציבוריים וקבועים, כן—כמה תלמידים מושמטים. LexiClash מאפשר לך לבחור: הצג רק מובילים, קבוצה לפי רמה, או הסתר דירוגים לחלוטין. כמו כן, משחקים זזים מהר מספיק כדי שניקוד נמוך לא פוגע כמו בחינה שנכשלה.',
        },
        {
          title: 'כמה זמן משחק לוקח?',
          desc: 'רוב המשחקים הם 5–15 דקות. מספיק לפעמון, לא לתקופה שלמה.',
        },
        {
          title: 'האם הם יראו תוכן לא הולם משחקנים אחרים?',
          desc: 'לא. אין צ׳אט או הודעות במהלך משחקים, וללא קישורים לאתרים חיצוניים. משחקי כיתה סגורים רק לתלמידים שלך.',
        },
        {
          title: 'מה אם בית הספר שלנו חוסם אתרי משחקים?',
          desc: 'LexiClash הוא אתר חינוכי שבדרך כלל לא מחסום בבתי ספר. אם יש חסימה, פנה ל-IT—אנחנו יכולים לעזור.',
        },
      ],
    },
  ],
  faqs: [
    {
      q: 'האם תלמידים צריכים כתובות דוא״ל?',
      a: 'לא. למשחקי כיתה חיים, הם מצטרפים עם קוד בלבד. אם הם רוצים לעקוב אחרי התקדמות אישית, הם יכולים לבחור להיכנס, אך זה לא נדרש.',
    },
    {
      q: 'כיצד אדע מה התלמידים שלי למדו?',
      a: 'לוח המחוונים של המורה מראה דיוק לפי מילה, ספור ניסיון ודפוסים בכל הכיתה. ייצא דוחות ללוח הציונים שלך.',
    },
    {
      q: 'האם אוכל להעלות את אוצר המילים שלי?',
      a: 'כן. העלו רשימת מילים לכל נושא או בדיקה. LexiClash יוצר משחקים מהמילים שלך.',
    },
    {
      q: 'האם משחק תחרותי מנטרל קוראים חלשים?',
      a: 'זה תלוי בדרך שבה אתה מסגרת זאת. LexiClash מאפשר לך להסתיר לוחות דירוג, קבוצה תלמידים לפי רמה, או להתמקד בשיפור אישי. משחקים גם זזים מהר, כך שניקוד נמוך מרגיש פחות מלבוש מאשר בדיקה נכשלה.',
    },
    {
      q: 'כמה זמן לוקח משחק טיפוסי?',
      a: 'רוב המשחקים הם 5–15 דקות. מושלם עבור פעמון או סקירה, לא תקופה שלמה.',
    },
    {
      q: 'יש צ׳אט או תוכן חיצוני?',
      a: 'לא. משחקי כיתה סגורים לתלמידים שלך בלבד. אין צ׳אט, אין קישורים, אין מודעות של צד שלישי.',
    },
    {
      q: 'האם בית הספר שלנו יחסום זאת?',
      a: 'LexiClash היא חינוכית ובדרך כלל מאושרת בבתי ספר. אם נתקלת בחסימה, פנה לחטיבת ה-IT—אנחנו יכולים לעזור.',
    },
    {
      q: 'אילו מכשירים זה עובד עליהם?',
      a: 'Chromebook, iPad, טלפון, מחשב נייד ולוח חכם. אין צורך בהתקנה. פשוט פתח את הדפדפן והצטרף.',
    },
  ],
  labels: {
    faqTitle: 'שאלות?',
    relatedTitle: 'עוד משהו לכיתה שלך',
  },
  related: [
    { href: '/education/vocabulary-games-classroom', label: 'משחקי אוצר מילים לכל כיתה', accent: 'cyan' },
    { href: '/education/esl-word-games', label: 'משחקי מילים לאנגלית ובדיקות', accent: 'lime' },
    { href: '/education/end-of-year-classroom-activities', label: 'משחקים לסוף שנה', accent: 'pink' },
    { href: '/education', label: 'כל משאבי החינוך', accent: 'purple' },
  ],
  breadcrumb: {
    home: 'בית',
    hub: 'חינוך',
    current: 'משחקי מילים לחטיבת ביניים',
  },
  learning: {
    educationalUse: ['Classroom Activity', 'Vocabulary Development'],
    educationalLevel: ['Secondary'],
    typicalAgeRange: '11-15',
    teaches: 'Vocabulary acquisition, lexical recall, academic language, competitive communication',
    timeRequired: 'PT15M',
  },
};

const ES: EducationLandingContent = {
  accent: 'pink',
  meta: {
    title: 'Juegos de Palabras para Secundaria | Vocabulario',
    description: 'Juegos de palabras gratis para aulas de secundaria. Competición real, listas de vocabulario personalizadas, multijugador en vivo—sin email.',
    keywords: [
      'juegos de palabras para secundaria',
      'juegos de vocabulario para secundaria',
      'juegos de palabras para aula',
      'juegos educativos de palabras',
      'actividades de vocabulario',
      'juegos competitivos para clase',
      'palabras para adolescentes',
      'juegos interactivos de lenguaje',
    ],
  },
  hero: {
    facts: [
      'Gratis para empezar',
      'Sin email requerido',
      'Funciona en cualquier dispositivo',
      'Sube tus propias listas de palabras',
    ],
    h1: {
      part1: 'Juegos de palabras que los adolescentes',
      highlight: 'realmente quieren jugar',
      part2: '',
    },
    subtitle:
      'Competencia real, apuestas auténticas, sin personajes de dibujos. Únete con un código—toda la clase a la vez.',
    primaryCta: {
      label: 'Crea un aula gratis',
      href: '/education/classroom-game',
    },
    secondaryCta: {
      label: 'Mira cómo funciona',
      href: '/education',
    },
  },
  answer: {
    question: '¿Qué juegos de palabras funcionan en secundaria?',
    answer:
      'LexiClash es un juego de palabras gratis basado en navegador donde los estudiantes se unen a aulas en vivo con un código para competir en búsquedas de palabras, desafíos de vocabulario y juegos multijugador en tiempo real. Los maestros obtienen seguimiento de progreso y pueden subir listas de vocabulario personalizadas para cualquier materia. No se requiere correo electrónico.',
  },
  sections: [
    {
      kind: 'wordlist',
      title: 'Vocabulario de Nivel Académico: Palabras que los Adolescentes Realmente Encuentran',
      intro:
        'Estas son palabras reales de textos, exámenes y discusiones en clase—no las listas infantiles de primaria.',
      groups: [
        {
          label: 'Palabras que aparecen en todos lados',
          words: [
            'analizar',
            'consecuencia',
            'evidencia',
            'inferir',
            'sesgo',
            'perspectiva',
            'interpretar',
            'significativo',
            'modificar',
            'atribuir',
          ],
        },
        {
          label: 'Palabras para argumentos escritos',
          words: [
            'validar',
            'contradecir',
            'conceder',
            'fundamentar',
            'relevante',
            'circunstancia',
            'diferenciar',
            'afirmación',
            'abogar',
            'equitativo',
          ],
        },
        {
          label: 'Palabras que los examinadores usan',
          words: [
            'evaluar',
            'ilustrar',
            'sintetizar',
            'deducir',
            'diferenciar',
            'elaborar',
            'criticar',
            'justificar',
            'especificar',
            'examinar',
          ],
        },
        {
          label: 'Palabras que confunden lectores',
          words: [
            'ambiguo',
            'meticuloso',
            'resiliente',
            'diligente',
            'pragmático',
            'oscuro',
            'implícito',
            'esfuerzo',
            'lúcido',
            'cándido',
          ],
        },
      ],
    },
    {
      kind: 'table',
      title: 'Por Qué los Juegos de Primaria Fallan Aquí',
      intro:
        'Los adolescentes detectan—y rechazan—la pedagogía diseñada para niños de 9 años. Esto es lo que realmente funciona:',
      columns: [
        'Qué funciona en primaria',
        'Por qué falla en secundaria',
        'Qué hacer en su lugar',
      ],
      rows: [
        [
          'Mascota de dibujos animados, colores brillantes',
          'Señala "esto es para niños pequeños"—rechazo inmediato',
          'Diseño audaz y eléctrico. Modo oscuro. Marca competitiva real.',
        ],
        [
          'Solo palabras simples (gato, correr, feliz)',
          'Aburrimiento. Demasiado fácil → sin desafío → sin interés',
          'Vocabulario académico que ven en textos reales. Dificultad apropiada.',
        ],
        [
          'Todos reciben un trofeo por participar',
          'Apuestas falsas = sin motivación. Ellos lo saben.',
          'Tablas de clasificación reales. Victoria/derrota visible. Rankings públicos.',
        ],
        [
          'Juegos por turnos lentos',
          'Los adolescentes no tienen paciencia. Se siente antiguo.',
          'Juego rápido y en vivo. Competencia en tiempo real. Retroalimentación inmediata.',
        ],
        [
          'Modo de práctica aislado',
          'Quieren verse ganando a sus amigos, no a un algoritmo',
          'Multijugador en toda la clase. Duelos 1-contra-1. Puntuaciones públicas.',
        ],
        [
          'El maestro no ve nada',
          'Sin responsabilidad = sin apoyo de padres al tiempo de clase',
          'El panel muestra quién sabe qué. Patrones de palabras perdidas. Progreso por estudiante.',
        ],
      ],
    },
    {
      kind: 'cards',
      title: 'Lo Que los Adolescentes Obtienen',
      items: [
        {
          title: 'El vocabulario se pega más rápido',
          desc: 'Los juegos competitivos activan la memoria mejor que las hojas de trabajo. Juegan para ganar—no porque el maestro dijo.',
        },
        {
          title: 'Lectura en tiempo real del aula',
          desc: 'Tu panel muestra exactamente quién tuvo dificultades con qué palabras. Revisa antes del examen.',
        },
        {
          title: 'Listas de palabras personalizadas',
          desc: 'Sube vocabulario de tu unidad actual, un examen estandarizado, o el libro que están leyendo. No juegos genéricos.',
        },
        {
          title: 'Tu aula, en vivo, juntos',
          desc: 'Sin email. Sin cuentas que administrar. Comparte un código, los estudiantes se unen, juegan.',
        },
        {
          title: 'Funciona en todas partes',
          desc: 'Chromebook, iPad, teléfono, pizarra inteligente. Sin instalación. Sin aprobación de TI.',
        },
      ],
    },
    {
      kind: 'cards',
      title: 'Preguntas Frecuentes',
      items: [
        {
          title: '¿Necesitan correos electrónicos?',
          desc: 'No. Para juegos de clase en vivo, los estudiantes se unen solo con un código. Sin registro.',
        },
        {
          title: '¿Cómo sigo quién aprendió qué?',
          desc: 'El panel del maestro muestra precisión por palabra, conteo de intentos y patrones en toda la clase. Exporta datos si los necesitas.',
        },
        {
          title: '¿Puedo usar palabras de mi currículo?',
          desc: 'Sí. Sube cualquier lista de palabras—vocabulario del libro, preparación para exámenes, términos específicos del tema. LexiClash crea juegos con tus palabras.',
        },
        {
          title: '¿La competencia desmoraliza a los lectores débiles?',
          desc: 'Si los rankings son públicos y permanentes, sí—algunos estudiantes se retiran. LexiClash te deja elegir: muestra solo los mejores, agrupa por nivel, u oculta rankings. Los juegos también se mueven rápido, así que una puntuación baja no duele como un examen fallido.',
        },
        {
          title: '¿Cuánto tarda un juego típico?',
          desc: 'La mayoría de los juegos toman 5–15 minutos. Perfecto para un calentamiento o repaso, no todo el período.',
        },
        {
          title: '¿Hay chat o contenido externo?',
          desc: 'No. Los juegos de clase son solo para tus estudiantes. Sin chat, sin enlaces, sin anuncios.',
        },
        {
          title: '¿Mi escuela lo bloqueará?',
          desc: 'LexiClash es educativo y generalmente está en la lista blanca. Si encuentras un bloqueo, contacta a TI—podemos ayudar.',
        },
      ],
    },
  ],
  faqs: [
    {
      q: '¿Los estudiantes necesitan correos electrónicos?',
      a: 'No. Para juegos de clase en vivo, se unen solo con un código. Si quieren rastrear su progreso personal, pueden optar por iniciar sesión, pero no es obligatorio.',
    },
    {
      q: '¿Cómo sé qué aprendieron mis estudiantes?',
      a: 'Tu panel de control muestra precisión por palabra, conteo de intentos y patrones en toda la clase. Exporta informes a tu libreta de calificaciones.',
    },
    {
      q: '¿Puedo subir vocabulario personalizado?',
      a: 'Sí. Sube una lista de palabras para cualquier tema o examen. LexiClash genera juegos de tus palabras.',
    },
    {
      q: '¿El juego competitivo desmoraliza a los lectores débiles?',
      a: 'Depende de cómo lo enmarques. LexiClash te deja ocultar rankings, agrupar estudiantes por nivel, o enfocarse en mejora personal. Los juegos también se mueven rápido, así que una puntuación baja se siente menos vergüenza que un examen fallido.',
    },
    {
      q: '¿Cuánto dura un juego típico?',
      a: 'La mayoría de los juegos duran 5–15 minutos. Perfecto para un calentamiento o repaso, no un período completo.',
    },
    {
      q: '¿Hay chat o contenido externo?',
      a: 'No. Los juegos de clase están cerrados solo a tus estudiantes. Sin chat, sin enlaces, sin anuncios externos.',
    },
    {
      q: '¿Mi escuela lo bloqueará?',
      a: 'LexiClash es educativo y generalmente está en lista blanca. Si encuentras un bloqueo, contacta a TI—podemos ayudar a hacer el caso.',
    },
    {
      q: '¿En qué dispositivos funciona?',
      a: 'Chromebooks, iPads, teléfonos, laptops y pizarras inteligentes. Sin instalación necesaria. Solo abre el navegador y únete.',
    },
  ],
  labels: {
    faqTitle: '¿Preguntas?',
    relatedTitle: 'Explora más para tu aula',
  },
  related: [
    { href: '/education/vocabulary-games-classroom', label: 'Juegos de Vocabulario para Cualquier Clase', accent: 'cyan' },
    { href: '/education/esl-word-games', label: 'Juegos de Palabras ESL', accent: 'lime' },
    { href: '/education/end-of-year-classroom-activities', label: 'Juegos de Fin de Año', accent: 'pink' },
    { href: '/education', label: 'Todos los Recursos de Educación', accent: 'purple' },
  ],
  breadcrumb: {
    home: 'Inicio',
    hub: 'Educación',
    current: 'Juegos de Palabras para Secundaria',
  },
  learning: {
    educationalUse: ['Classroom Activity', 'Vocabulary Development'],
    educationalLevel: ['Secondary'],
    typicalAgeRange: '11-15',
    teaches: 'Vocabulary acquisition, lexical recall, academic language, competitive communication',
    timeRequired: 'PT15M',
  },
};

const SV: EducationLandingContent = {
  accent: 'pink',
  meta: {
    title: 'Ordspel för högstadiet | Ordförråd',
    description: 'Gratis ordspel för högstadieklassrum (åk 7–9). Verklig konkurrens, eget ordförråd, direktsänd multiplayer—ingen e-post.',
    keywords: [
      'ordspel för högstadiet',
      'ordförrådsövningar högstadiet',
      'ordspel klassrum',
      'stavningsövningar spel',
      'språkspel Svenska',
      'konkurrenssamtal klassrum',
      'ordförrådsutmaning',
      'interaktiva språkspel',
    ],
  },
  hero: {
    facts: [
      'Gratis att börja',
      'Ingen e-post krävs',
      'Fungerar på alla enheter',
      'Ladda upp dina egna ordlistor',
    ],
    h1: {
      part1: 'Ordspel som högstadieelever',
      highlight: 'faktiskt vill spela',
      part2: '',
    },
    subtitle:
      'Verklig konkurrens, höga insatser, ingen söt grafik. Gå med på en kod—hele klassen på en gång.',
    primaryCta: {
      label: 'Skapa ett klassrum',
      href: '/education/classroom-game',
    },
    secondaryCta: {
      label: 'Se hur det fungerar',
      href: '/education',
    },
  },
  answer: {
    question: 'Vilka ordspel fungerar i högstadieklassrum?',
    answer:
      'LexiClash är ett gratis webbläsarbaserat ordspel där elever går med i direktsända klassrum med en kod för att tävla i ordletning, ordförrådsutmaningar och realtids multiplayer-spel. Lärare får framstegsspårning och kan ladda upp anpassade ordlistor för alla ämnen. Ingen e-post krävs.',
  },
  sections: [
    {
      kind: 'wordlist',
      title: 'Akademisk Ordförråd på Mittennivå: Ord som Högstadieelever Verkligen Möter',
      intro:
        'Det här är verkliga ord från texter, prov och klassrumsdiskussioner—inte nioåringars ordlistor.',
      groups: [
        {
          label: 'Ord som förekommer överallt',
          words: [
            'analysera',
            'följd',
            'bevis',
            'härleda',
            'fördom',
            'perspektiv',
            'tolka',
            'betydelsefull',
            'ändra',
            'tillskriva',
          ],
        },
        {
          label: 'Ord för argumenterande skrivning',
          words: [
            'bekräfta',
            'motsäga',
            'medge',
            'underbygga',
            'relevant',
            'omständighet',
            'skilja',
            'påstående',
            'förespråka',
            'rättvis',
          ],
        },
        {
          label: 'Ord som prov använder',
          words: [
            'värdera',
            'illustrera',
            'syntetisera',
            'härleda',
            'åtskilja',
            'utarbeta',
            'kritisera',
            'motivera',
            'ange',
            'bedöma',
          ],
        },
        {
          label: 'Ord som försvårar läsningen',
          words: [
            'tvetydig',
            'noggrann',
            'motståndskraftig',
            'nitisk',
            'pragmatisk',
            'dunkel',
            'underförstådd',
            'försök',
            'klar',
            'uppriktig',
          ],
        },
      ],
    },
    {
      kind: 'table',
      title: 'Varför Mellanstadiespel Inte Fungerar Här',
      intro:
        'Högstadieelever ser—och avvisar—pedagogik designad för niåriga. Här är vad som faktiskt fungerar:',
      columns: [
        'Vad som fungerar på lägre årskurser',
        'Varför det misslyckas på högstadiet',
        'Vad du gör istället',
      ],
      rows: [
        [
          'Tecknade maskotar, ljusa färger',
          'Det säger "det här är för små barn"—omedelbar avvisning',
          'Djärv, elektrisk design. Mörkt läge. Verklig konkurrensanpassning.',
        ],
        [
          'Bara enkla ord (katt, springer, glad)',
          'Tristess. För lätt → ingen utmaning → inget intresse',
          'Akademiskt ordförråd de ser i faktiska texter. Rätt svårighetsgrad.',
        ],
        [
          'Alla får deltagar-pokaler',
          'Falska insatser = ingen motivation. De vet skillnaden.',
          'Verkliga resultattabeller. Synliga vinster/förluster. Offentlig klassrankning.',
        ],
        [
          'Långsamma turbaserade spel',
          'Ungdomar har ingen tålamod. Det känns gammalt.',
          'Snabbt, direktsänt spel. Realtidstävling. Omedelbar återkoppling.',
        ],
        [
          'Isolerad övningsläge',
          'De vill se sig själva slå sina vänner, inte en algoritm',
          'Klassövergripande multiplayer. 1-mot-1 dueller. Offentlig poängplacering.',
        ],
        [
          'Läraren ser ingenting',
          'Ingen ansvarighet = ingen föräldrastöd för klasstid',
          'Kontrollpanelen visar vem som kan vad. Mönster av missade ord. Framsteg per elev.',
        ],
      ],
    },
    {
      kind: 'cards',
      title: 'Vad Högstadieelever Får Ut Av Det',
      items: [
        {
          title: 'Ordförrådet fastnar snabbare',
          desc: 'Konkurrensiva spel aktiverar minnet bättre än kalkylblad. De spelar för att vinna—inte för att läraren sa det.',
        },
        {
          title: 'Realtidsavläsning av klassrummet',
          desc: 'Din instrumentpanel visar exakt vilka ord som var svåra. Upprepa och täck in luckor innan provet.',
        },
        {
          title: 'Eget ordförråd',
          desc: 'Ladda upp ordförråd från din aktuella enhet, ett standardiserat prov eller boken de läser. Inte generiska spel.',
        },
        {
          title: 'Ditt klassrum, live, tillsammans',
          desc: 'Ingen e-post. Inga konton att hantera. Dela en kod, elever går med, ni spelar.',
        },
        {
          title: 'Fungerar överallt',
          desc: 'Chromebook, iPad, telefon, smartboard. Ingen installation. Ingen IT-godkännande.',
        },
      ],
    },
    {
      kind: 'cards',
      title: 'Vanliga Frågor',
      items: [
        {
          title: 'Behöver de e-post?',
          desc: 'Nej. För direktsända klassrumsspel går eleverna med endast en kod. Ingen registrering.',
        },
        {
          title: 'Hur följer jag vem som lärde sig vad?',
          desc: 'Lärarpanelen visar noggrannhet per ord, försöksantal och mönster över hela klassen. Exportera data om du behöver det.',
        },
        {
          title: 'Kan jag använda ord från min läroplan?',
          desc: 'Ja. Ladda upp en ordlista—ordförråd från boken, provberedning, ämnesspecifika termer. LexiClash skapar spel från dina ord.',
        },
        {
          title: 'Demotiverar konkurrens svaga läsare?',
          desc: 'Om resultattabeller är offentliga och permanenta, ja—vissa elever tröttnar. LexiClash låter dig välja: visa bara de bästa, gruppera efter nivå, eller dölj rankingen helt. Spelen rör sig också snabbt, så ett lågt poängtal gör mindre ont än ett misslyckat prov.',
        },
        {
          title: 'Hur lång tid tar ett typiskt spel?',
          desc: 'De flesta spelen tar 5–15 minuter. Perfekt för uppvärmning eller repetition, inte en hel lektion.',
        },
        {
          title: 'Finns det chatt eller externt innehål?',
          desc: 'Nej. Klassrumsspelen är bara för dina elever. Ingen chatt, inga länkar, inga annonser.',
        },
        {
          title: 'Blockerar vår skola detta?',
          desc: 'LexiClash är undervisande och vanligtvis på vitlistan. Kontakta IT om du stöter på ett block—vi kan hjälpa.',
        },
      ],
    },
  ],
  faqs: [
    {
      q: 'Behöver eleverna e-postadresser?',
      a: 'Nej. För direktsända klassrumsspel går de med endast en kod. Om de vill spåra personlig framsteg kan de välja att logga in, men det är inte nödvändigt.',
    },
    {
      q: 'Hur vet jag vad mina elever lärde sig?',
      a: 'Din kontrollpanel visar noggrannhet per ord, försöksantal och mönster över hele klassen. Exportera rapporter till ditt betygsbok.',
    },
    {
      q: 'Kan jag ladda upp mitt eget ordförråd?',
      a: 'Ja. Ladda upp en ordlista för alla ämnen eller prov. LexiClash genererar spel från dina ord.',
    },
    {
      q: 'Demotiverar konkurrens svaga läsare?',
      a: 'Det beror på hur du presenterar det. LexiClash låter dig dölja resultattabeller, gruppera elever efter nivå, eller fokusera på personlig förbättring. Spelen rör sig också snabbt, så ett lågt poängtal känns mindre stigmatiserande än ett misslyckat prov.',
    },
    {
      q: 'Hur långt tar ett typiskt spel?',
      a: 'De flesta spelen tar 5–15 minuter. Perfekt för en uppvärmning eller repetition, inte en helt lektion.',
    },
    {
      q: 'Finns det chatt eller externt innehål?',
      a: 'Nej. Klassrumsspelen är stängda för dina elever. Ingen chatt, inga länkar, inga tredjeparts-annonser.',
    },
    {
      q: 'Blockerar min skola detta?',
      a: 'LexiClash är undervisande och vanligtvis på vitlistan. Kontakta IT om du stöter på ett block—vi kan hjälpa till att göra ett fall för det.',
    },
    {
      q: 'Vilka enheter fungerar det på?',
      a: 'Chromebooks, iPad, telefoner, laptops och smartboards. Ingen installation behövs. Bara öppna webbläsaren och gå med.',
    },
  ],
  labels: {
    faqTitle: 'Har du frågor?',
    relatedTitle: 'Utforska mer för ditt klassrum',
  },
  related: [
    { href: '/education/vocabulary-games-classroom', label: 'Ordförrådsövningar för Alla Klasser', accent: 'cyan' },
    { href: '/education/esl-word-games', label: 'Ordspel för Engelska & Prov', accent: 'lime' },
    { href: '/education/end-of-year-classroom-activities', label: 'Slut-på-året-spel', accent: 'pink' },
    { href: '/education', label: 'Alla Utbildningsresurser', accent: 'purple' },
  ],
  breadcrumb: {
    home: 'Hem',
    hub: 'Utbildning',
    current: 'Ordspel för Högstadiet',
  },
  learning: {
    educationalUse: ['Classroom Activity', 'Vocabulary Development'],
    educationalLevel: ['Secondary'],
    typicalAgeRange: '11-15',
    teaches: 'Vocabulary acquisition, lexical recall, academic language, competitive communication',
    timeRequired: 'PT15M',
  },
};

const JA: EducationLandingContent = {
  accent: 'pink',
  meta: {
    title: '中学生向けの言葉ゲーム | 語彙学習',
    description: '中学校(中1-中3)の教室向け無料言葉ゲーム。本物の競争、カスタム語彙、リアルタイムマルチプレイヤー—メール不要。',
    keywords: [
      '中学生向けの言葉ゲーム',
      '語彙学習ゲーム',
      '教室向けの言葉ゲーム',
      '中学英語ゲーム',
      '語彙練習ゲーム',
      'リアルタイム言葉ゲーム',
      '競争的な学習ゲーム',
      '対話型言葉ゲーム',
    ],
  },
  hero: {
    facts: [
      '無料で始める',
      'メール不要',
      'すべてのデバイスで動作',
      '独自の語彙リストをアップロード',
    ],
    h1: {
      part1: '中学生が',
      highlight: '本当にやりたい',
      part2: '言葉ゲーム',
    },
    subtitle:
      '本物の競争、本物の勝負、マスコットキャラなし。コードで参加—クラス全体で同時プレイ。',
    primaryCta: {
      label: '無料で教室を作成',
      href: '/education/classroom-game',
    },
    secondaryCta: {
      label: '使い方を見る',
      href: '/education',
    },
  },
  answer: {
    question: '中学校の教室に合った言葉ゲームは何ですか？',
    answer:
      'LexiClash は、生徒がコードで教室に参加してリアルタイムで言葉探し、語彙チャレンジ、マルチプレイヤーゲームで競い合う無料のブラウザベースの言葉ゲームです。先生は進度追跡を受け取り、すべての教科のカスタム語彙リストをアップロードできます。メールは不要です。',
  },
  sections: [
    {
      kind: 'wordlist',
      title: '学習用語彙：中学生が実際に出会う言葉',
      intro:
        'これらはテキスト、試験、授業での討論から出てくる実際の言葉です—小学校のやさしい言葉リストではありません。',
      groups: [
        {
          label: 'どこにでも出てくる言葉',
          words: [
            '分析する',
            '結果',
            '証拠',
            '推論する',
            '偏見',
            '視点',
            '解釈する',
            '重要な',
            '変更する',
            '帰因させる',
          ],
        },
        {
          label: '文章作成で使う言葉',
          words: [
            '検証する',
            '矛盾する',
            '認める',
            '根拠を示す',
            '関連性がある',
            '事情',
            '区別する',
            '主張',
            '支持する',
            '公平な',
          ],
        },
        {
          label: '試験で使われる言葉',
          words: [
            '評価する',
            '例示する',
            '統合する',
            '演繹する',
            '比較する',
            '詳述する',
            '批判する',
            '正当化する',
            '特定する',
            '検討する',
          ],
        },
        {
          label: '読みづらい言葉',
          words: [
            '曖昧な',
            '細心の',
            '回復力のある',
            '勤勉な',
            '実用的な',
            '不明確な',
            '暗黙の',
            '努力',
            '明快な',
            '率直な',
          ],
        },
      ],
    },
    {
      kind: 'table',
      title: '小学校のゲームが中学で失敗する理由',
      intro:
        '中学生は、9歳児向けの教育法を見抜き、拒否します。実際に効果があるのはこれです：',
      columns: [
        '小学校で効果がある',
        '中学で失敗する理由',
        '代わりにすること',
      ],
      rows: [
        [
          'かわいいキャラクター、明るい色',
          '"小さい子ども向け"と判断される—即座に拒否',
          '大胆で電気的なデザイン。ダークモード。本物の競争ブランド。',
        ],
        [
          '簡単な言葉だけ（猫、走る、楽しい）',
          'つまらない。簡単すぎて→チャレンジなし→興味なし',
          '実際のテキストに出てくる学習用語彙。適切な難度。',
        ],
        [
          '全員に参加トロフィー',
          '偽りの勝負→やる気なし。彼らは違いを知っている。',
          '本物のランキング。勝敗が見える。公開ランク。',
        ],
        [
          '遅いターンベース制のゲーム',
          '中学生は我慢強くない。古く感じる。',
          '速くて、ライブのゲームプレイ。リアルタイム競争。即座のフィードバック。',
        ],
        [
          '孤立した練習モード',
          '友人に勝つ姿を見たい。アルゴリズムではなく。',
          'クラス全体マルチプレイヤー。1対1決闘。公開スコア。',
        ],
        [
          '先生は何も見えない',
          '説明責任なし→授業時間への親のサポートなし',
          'ダッシュボードは誰が何を知っているか表示。逃した言葉のパターン。生徒ごとの進度。',
        ],
      ],
    },
    {
      kind: 'cards',
      title: '中学生が得られるもの',
      items: [
        {
          title: '語彙が速くに定着',
          desc: '競争的なゲームはワークシートより記憶をよく刺激します。先生の指示ではなく、勝つためにプレイします。',
        },
        {
          title: 'リアルタイムの教室把握',
          desc: 'ダッシュボードで誰がどの言葉に困ったか正確に分かります。試験前に欠落を埋めます。',
        },
        {
          title: 'カスタム語彙リスト',
          desc: '現在の単元、標準テスト、読んでいる本の言葉をアップロード。一般的なゲームではなく。',
        },
        {
          title: 'あなたの教室、ライブ、一緒に',
          desc: 'メール登録なし。アカウント管理なし。コード共有→生徒が参加→プレイ。',
        },
        {
          title: 'どこでも動作',
          desc: 'Chromebook、iPad、スマートフォン、スマートボード。インストール不要。管理者承認不要。',
        },
      ],
    },
    {
      kind: 'cards',
      title: 'よくある質問',
      items: [
        {
          title: 'メールアドレスが必要？',
          desc: 'いいえ。クラスのライブゲームはコード参加だけ。登録なし。',
        },
        {
          title: '誰が何を学んだか追跡できる？',
          desc: '先生用ダッシュボードは言葉ごとの精度、試行回数、クラス全体のパターンを表示します。必要に応じてデータ出力できます。',
        },
        {
          title: '自分の語彙をアップロード？',
          desc: 'はい。どの単元、テスト、分野の言葉でもアップロード可能。LexiClash があなたの言葉からゲームを作成します。',
        },
        {
          title: '競争が弱い読者を落ち込ませないか？',
          desc: 'ランキングが公開で永続的なら、そうかもしれません。LexiClash なら選択できます：上位者だけ表示、レベル別グループ化、ランク非表示。また、ゲームは速く進むので、低スコアは失敗したテストほど辛くありません。',
        },
        {
          title: 'ゲームは何分？',
          desc: 'ほとんどのゲームは 5～15 分。ウォーミングアップや復習に最適です。',
        },
        {
          title: 'チャットや外部コンテンツ？',
          desc: 'いいえ。クラスゲームはあなたの生徒だけ。チャットなし、リンクなし、広告なし。',
        },
        {
          title: '学校が ブロック？',
          desc: 'LexiClash は教育的で通常はホワイトリスト登録。ブロックされたら IT に相談—協力できます。',
        },
      ],
    },
  ],
  faqs: [
    {
      q: '生徒はメールアドレスが必要？',
      a: 'いいえ。クラスのライブゲームはコード参加だけ。個人の進度を追跡したい場合はサインインを選べますが、必須ではありません。',
    },
    {
      q: '生徒が何を学んだか確認できる？',
      a: '先生用ダッシュボードは言葉ごとの精度、試行回数、クラス全体のパターンを表示します。成績簿にレポート出力できます。',
    },
    {
      q: '自分の語彙をアップロードできる？',
      a: 'はい。どの教科やテストの言葉でもアップロード。LexiClash があなたの言葉からゲームを生成します。',
    },
    {
      q: '競争が弱い読者を落ち込ませないか？',
      a: 'フレーミング次第です。LexiClash でランキングを隠す、レベル別グループ化、個人改善に注力を選べます。ゲームは速く進むので、低スコアは失敗したテストほど恥ずかしくありません。',
    },
    {
      q: '典型的なゲーム時間？',
      a: 'ほとんどは 5～15 分。ウォーミングアップや復習にぴったり。',
    },
    {
      q: 'チャットや外部コンテンツ？',
      a: 'いいえ。クラスゲームはあなたの生徒のみ。チャット、リンク、サードパーティ広告なし。',
    },
    {
      q: '学校がブロックするか？',
      a: 'LexiClash は教育的で通常ホワイトリスト。ブロックされたら IT に連絡—サポート可能です。',
    },
    {
      q: 'どのデバイスで動作？',
      a: 'Chromebook、iPad、スマートフォン、ノートパソコン、スマートボード。インストール不要。ブラウザを開いて参加。',
    },
  ],
  labels: {
    faqTitle: 'ご質問？',
    relatedTitle: 'あなたの教室向けの詳細',
  },
  related: [
    { href: '/education/vocabulary-games-classroom', label: 'どの教科でも使える語彙ゲーム', accent: 'cyan' },
    { href: '/education/esl-word-games', label: '英語・テスト用言葉ゲーム', accent: 'lime' },
    { href: '/education/end-of-year-classroom-activities', label: '年末向けゲーム', accent: 'pink' },
    { href: '/education', label: 'すべての教育リソース', accent: 'purple' },
  ],
  breadcrumb: {
    home: 'ホーム',
    hub: '教育',
    current: '中学生向けの言葉ゲーム',
  },
  learning: {
    educationalUse: ['Classroom Activity', 'Vocabulary Development'],
    educationalLevel: ['Secondary'],
    typicalAgeRange: '11-15',
    teaches: 'Vocabulary acquisition, lexical recall, academic language, competitive communication',
    timeRequired: 'PT15M',
  },
};

const RU: EducationLandingContent = {
  accent: 'pink',
  meta: {
    title: 'Словесные игры для средней школы | Расширение словарного запаса',
    description: 'Бесплатные словесные игры для классов 5–9. Реальная конкуренция, пользовательские словари, многопользовательская игра в реальном времени—без электронной почты.',
    keywords: [
      'словесные игры для средней школы',
      'игры на словарный запас',
      'игры для уроков русского языка',
      'конкурентные классные игры',
      'интерактивные игры со словами',
      'словарные вызовы для школьников',
      'мотивирующие языковые игры',
      'тесты словарного запаса',
    ],
  },
  hero: {
    facts: [
      'Бесплатно для начала',
      'Электронная почта не требуется',
      'Работает на любом устройстве',
      'Загружайте свои списки слов',
    ],
    h1: {
      part1: 'Словесные игры, в которые учащиеся средней школы',
      highlight: 'действительно хотят играть',
      part2: '',
    },
    subtitle:
      'Реальная конкуренция, реальные ставки, никаких мультфильмов. Присоединитесь по коду—весь класс одновременно.',
    primaryCta: {
      label: 'Создайте бесплатный класс',
      href: '/education/classroom-game',
    },
    secondaryCta: {
      label: 'Посмотреть, как это работает',
      href: '/education',
    },
  },
  answer: {
    question: 'Какие словесные игры подходят для средней школы?',
    answer:
      'LexiClash—это бесплатная браузерная игра со словами, в которой ученики присоединяются к классам в прямом эфире с кодом для конкуренции в охоте за словами, вызовах на словарный запас и многопользовательских играх в реальном времени. Учителя получают отслеживание прогресса и могут загружать пользовательские списки слов для любого предмета. Электронная почта не требуется.',
  },
  sections: [
    {
      kind: 'wordlist',
      title: 'Академический словарь среднего уровня: слова, которые школьники действительно встречают',
      intro:
        'Это реальные слова из текстов, тестов и классных обсуждений—не упрощённые списки из начальной школы.',
      groups: [
        {
          label: 'Слова, которые встречаются везде',
          words: [
            'анализировать',
            'последствие',
            'доказательство',
            'заключать',
            'предубеждение',
            'точка зрения',
            'интерпретировать',
            'значительный',
            'изменять',
            'приписывать',
          ],
        },
        {
          label: 'Слова для аргументативного письма',
          words: [
            'подтверждать',
            'противоречить',
            'признавать',
            'обосновывать',
            'актуальный',
            'обстоятельство',
            'различать',
            'утверждение',
            'защищать',
            'справедливый',
          ],
        },
        {
          label: 'Слова, которые используют экзаменаторы',
          words: [
            'оценивать',
            'иллюстрировать',
            'синтезировать',
            'выводить',
            'отличать',
            'разрабатывать',
            'критиковать',
            'обосновывать',
            'уточнять',
            'рассматривать',
          ],
        },
        {
          label: 'Слова, которые затрудняют чтение',
          words: [
            'неоднозначный',
            'тщательный',
            'устойчивый',
            'трудолюбивый',
            'прагматичный',
            'неясный',
            'косвенный',
            'попытка',
            'ясный',
            'откровенный',
          ],
        },
      ],
    },
    {
      kind: 'table',
      title: 'Почему игры начальной школы здесь не работают',
      intro:
        'Школьники видят и отвергают педагогику, разработанную для 9-летних. Вот что действительно работает:',
      columns: [
        'Что работает в начальной школе',
        'Почему это не работает в средней школе',
        'Что делать вместо этого',
      ],
      rows: [
        [
          'Мультипликационные персонажи, яркие цвета',
          'Это говорит "это для маленьких детей"—мгновенный отказ',
          'Смелый, электрический дизайн. Тёмный режим. Настоящий конкурентный брендинг.',
        ],
        [
          'Только простые слова (кот, бегать, счастливый)',
          'Скука. Слишком легко → нет вызова → нет интереса',
          'Академический словарь, который они видят в реальных текстах. Правильная сложность.',
        ],
        [
          'Все получают медаль за участие',
          'Ненастоящие ставки = никакой мотивации. Они в этом разбираются.',
          'Настоящие рейтинги. Видимые победы и поражения. Публичные ранги класса.',
        ],
        [
          'Медленные пошаговые игры',
          'Подростки нетерпеливы. Кажется древним.',
          'Быстрая игра в прямом эфире. Конкуренция в реальном времени. Мгновенная обратная связь.',
        ],
        [
          'Изолированный режим практики',
          'Они хотят видеть, как побеждают друзей, не алгоритм',
          'Многопользовательская игра на весь класс. Поединки 1-на-1. Публичные результаты.',
        ],
        [
          'Учитель ничего не видит',
          'Никакой ответственности = никакой поддержки родителей учебному времени',
          'Панель показывает кто что знает. Паттерны упущенных слов. Прогресс по учащимся.',
        ],
      ],
    },
    {
      kind: 'cards',
      title: 'Что получают школьники',
      items: [
        {
          title: 'Словарь быстрее усваивается',
          desc: 'Конкурентные игры активируют память лучше, чем листы. Они играют, чтобы выиграть—не потому что учитель сказал.',
        },
        {
          title: 'Мониторинг класса в реальном времени',
          desc: 'Ваша панель точно показывает, с какими словами кто справляется. Заполните пробелы перед тестом.',
        },
        {
          title: 'Пользовательские списки слов',
          desc: 'Загружайте словарь из вашего текущего раздела, стандартного теста или книги, которую они читают. Не универсальные игры.',
        },
        {
          title: 'Ваш класс, вживую, вместе',
          desc: 'Без электронной почты. Никаких аккаунтов для управления. Поделитесь кодом, ученики присоединяются, вы играете.',
        },
        {
          title: 'Работает везде',
          desc: 'Chromebook, iPad, телефон, интерактивная доска. Без установки. Без одобрения администратора.',
        },
      ],
    },
    {
      kind: 'cards',
      title: 'Часто задаваемые вопросы',
      items: [
        {
          title: 'Нужна ли им электронная почта?',
          desc: 'Нет. Для игр в прямом эфире ученики присоединяются только по коду. Нет регистрации.',
        },
        {
          title: 'Как я отслеживаю, кто что выучил?',
          desc: 'Панель учителя показывает точность по словам, количество попыток и паттерны по всему классу. Экспортируйте данные если нужны.',
        },
        {
          title: 'Могу ли я использовать слова из своей программы?',
          desc: 'Да. Загружайте список слов—словарь романа, подготовка к тесту, специальные термины. LexiClash создаёт игры из ваших слов.',
        },
        {
          title: 'Соревнование демотивирует слабых читателей?',
          desc: 'Если рейтинги публичные и постоянные—да, некоторые теряют мотивацию. LexiClash позволяет выбирать: показывать только лидеров, группировать по уровню, или скрыть ранги. Игры также идут быстро, поэтому низкий балл болит меньше, чем провал теста.',
        },
        {
          title: 'Как долго длится типичная игра?',
          desc: 'Большинство игр занимают 5–15 минут. Идеально для разминки или повтора, не целый урок.',
        },
        {
          title: 'Есть ли чат или внешний контент?',
          desc: 'Нет. Классные игры только для ваших учеников. Нет чата, нет ссылок, нет реклам.',
        },
        {
          title: 'Заблокирует ли это школа?',
          desc: 'LexiClash образовательный и обычно разрешён. Если заблокирован, свяжитесь с IT—мы можем помочь.',
        },
      ],
    },
  ],
  faqs: [
    {
      q: 'Ученикам нужны адреса электронной почты?',
      a: 'Нет. Для игр в прямом эфире они присоединяются только по коду. Если хотят отслеживать личный прогресс, могут войти, но это не обязательно.',
    },
    {
      q: 'Как я знаю, чему они научились?',
      a: 'Панель учителя показывает точность по словам, количество попыток и паттерны по всему классу. Экспортируйте отчёты в свою электронную ведомость.',
    },
    {
      q: 'Могу ли я загружать собственный словарь?',
      a: 'Да. Загружайте список слов для любого предмета или теста. LexiClash генерирует игры из ваших слов.',
    },
    {
      q: 'Соревнование не демотивирует слабых читателей?',
      a: 'Зависит от подачи. LexiClash позволяет скрывать рейтинги, группировать по уровню или сосредоточиться на улучшении. Игры идут быстро, низкий балл болит меньше, чем провал.',
    },
    {
      q: 'Сколько длится типичная игра?',
      a: 'Большинство 5–15 минут. Отлично для разминки или повтора, не целый урок.',
    },
    {
      q: 'Есть чат или внешний контент?',
      a: 'Нет. Классные игры только для ваших учеников. Чат, ссылки и реклам нет.',
    },
    {
      q: 'Школа это заблокирует?',
      a: 'LexiClash образовательный и обычно разрешён. Если блокируется, свяжитесь с IT—поможем.',
    },
    {
      q: 'На каких устройствах это работает?',
      a: 'Chromebook, iPad, телефоны, ноутбуки и интерактивные доски. Без установки. Откройте браузер и присоединяйтесь.',
    },
  ],
  labels: {
    faqTitle: 'Вопросы?',
    relatedTitle: 'Ещё больше для вашего класса',
  },
  related: [
    { href: '/education/vocabulary-games-classroom', label: 'Игры на словарный запас для любого класса', accent: 'cyan' },
    { href: '/education/esl-word-games', label: 'Словесные игры для английского', accent: 'lime' },
    { href: '/education/end-of-year-classroom-activities', label: 'Игры на конец года', accent: 'pink' },
    { href: '/education', label: 'Все образовательные ресурсы', accent: 'purple' },
  ],
  breadcrumb: {
    home: 'Главная',
    hub: 'Образование',
    current: 'Словесные игры для средней школы',
  },
  learning: {
    educationalUse: ['Classroom Activity', 'Vocabulary Development'],
    educationalLevel: ['Secondary'],
    typicalAgeRange: '11-15',
    teaches: 'Vocabulary acquisition, lexical recall, academic language, competitive communication',
    timeRequired: 'PT15M',
  },
};

const MAP: Record<string, EducationLandingContent> = {
  en: EN,
  he: HE,
  es: ES,
  sv: SV,
  ja: JA,
  ru: RU,
};

export function getMiddleSchoolContent(locale: string): EducationLandingContent {
  return MAP[locale] ?? EN;
}
