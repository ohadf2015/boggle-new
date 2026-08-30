import type { EducationLandingContent } from '@/lib/seo/educationLanding';

const EN: EducationLandingContent = {
  accent: 'lime',
  meta: {
    title: 'Early Finishers Activities | LexiClash',
    description: 'Self-directed word games to keep early finishers engaged without teacher supervision. Zero setup, runs itself all term.',
    keywords: [
      'early finishers activities',
      'fast finisher activities',
      'early finisher tasks',
      'what to do with early finishers',
      'activities for students who finish early',
      'independent work for early finishers',
      'classroom early finisher games',
    ],
  },
  hero: {
    facts: [
      'Four students finished; twenty still working',
      'Self-directed, zero setup per day',
      'Plays on any device in the classroom',
    ],
    h1: {
      part1: 'Keep early finishers',
      highlight: 'busy, not bored',
      part2: '',
    },
    subtitle: 'A ready-made word game station that runs itself. No lesson plan needed. Just click and go.',
    primaryCta: {
      label: 'Create a classroom',
      href: '/education/classroom-game',
    },
    secondaryCta: {
      label: 'Learn more',
      href: '/education',
    },
  },
  answer: {
    question: 'What are good activities for students who finish work early?',
    answer:
      'Self-directed word games like LexiClash let early finishers play independently while other students finish. No teacher interruptions, no extra marking, and they reinforce vocabulary from the lesson. Set it up once, use it all term.',
  },
  sections: [
    {
      kind: 'table',
      title: 'Word games that fit every subject',
      intro: 'Pair any lesson with a 4-minute word activity. Pick the one that matches what you just taught.',
      columns: ['Subject', 'Word activity', 'Reinforces', 'Teacher setup'],
      rows: [
        ['Reading & Literacy', 'Find vocabulary words in a letter grid', 'Word recognition, spelling patterns', 'None—students type the words they learned'],
        ['Maths', 'Spell out number words and maths terms', 'Vocabulary for operations, shapes, concepts', 'None—adapts to any numbers you taught'],
        ['Science', 'Locate key terms from the unit', 'Scientific vocabulary, retention', 'None—works with any topic'],
        ['History & Social Studies', 'Search for people, places, events', 'Period-specific vocabulary, recall', 'None—plays with any era or region'],
        ['Foreign Language', 'Word puzzles in the target language', 'Vocabulary patterns, spelling', 'None—supports all languages'],
        ['Art & Design', 'Colour and technique vocabulary game', 'Design language, descriptive words', 'None—works across all styles'],
      ],
    },
    {
      kind: 'steps',
      title: 'Set it up once, use it all term',
      intro: 'Three steps on day one. Then it runs itself.',
      items: [
        {
          step: 'Step 1: Create your classroom',
          focus: 'Pick a class code. Students join with it.',
          activity: 'Takes 60 seconds. No email list needed. One code works all term.',
        },
        {
          step: 'Step 2: Show one game to the whole class',
          focus: 'Demo for 2 minutes so they know what to do.',
          activity: 'Play one round together. Show them the letter grid, how to find words, what happens when they win. That\'s it.',
        },
        {
          step: 'Step 3: Routine card in the room',
          focus: 'Print or project three words: "Finished? Play LexiClash."',
          activity: 'Students who finish early go to the device (classroom tablet, chromebook, or phone) and join with the class code. They play. No interruptions.',
        },
      ],
    },
    {
      kind: 'features',
      title: 'Why early finishers work better with word games',
      items: [
        {
          icon: 'timer',
          text: 'Timed rounds (2–4 min) mean students stay in their seats and don\'t wander.',
        },
        {
          icon: 'users',
          text: 'Solo play or live with classmates—no chat, no distractions, no screen-time excess.',
        },
        {
          icon: 'graduation',
          text: 'Every word they find is vocabulary from your lesson—learning continues, doesn\'t stop at the bell.',
        },
        {
          icon: 'monitor',
          text: 'Works on Chromebooks, tablets, and phones. Any classroom device. No install.',
        },
        {
          icon: 'book',
          text: 'Teacher dashboard shows which words each student missed—you can teach those next week.',
        },
        {
          icon: 'zap',
          text: 'Zero interruptions. Students know the rules after day one. No "Is this right?" questions.',
        },
      ],
    },
  ],
  faqs: [
    {
      q: 'Will they rush through their main work just to get to the game?',
      a: 'Some will, at first. Set clear rules: "You must finish the work properly before you play." Use a checklist so they know what "finished" means. After a week, it becomes normal. Most teachers say the game actually motivates slower workers because they see peers playing.',
    },
    {
      q: 'Is it safe? Any chat or outside links?',
      a: 'No chat, no DMs, no external links. It\'s a word game only. Students see other players\' names and scores on the leaderboard, but that\'s all. No personal information is shared.',
    },
    {
      q: 'What about screen time?',
      a: 'Each round is 2–4 minutes. If a student finishes 10 minutes early, they play one round, not six. The game stops them when the timer ends. It\'s shorter than a recess video.',
    },
    {
      q: 'Do I need to teach them how to play?',
      a: 'Two-minute demo with the whole class. Show them the grid, point to a word, let them find one. That\'s enough. They learn by playing. No tutorial needed.',
    },
    {
      q: 'What if I have no devices in the room?',
      a: 'You need at least one device (a phone or tablet) for early finishers to share. Many classrooms have a class set of Chromebooks or a shared iPad. LexiClash works on all of them.',
    },
    {
      q: 'Can I use the same code all term, or do I need a new one each week?',
      a: 'Same code all term. Students don\'t need to remember it—you write it on the board or a card once, and it stays there. They use it every time they finish early.',
    },
    {
      q: 'Will I see what they played?',
      a: 'Yes. Your teacher dashboard shows scores, which words they found, and which they missed. Use that to pick vocabulary for next week\'s lesson.',
    },
    {
      q: 'What if early finishers are just a distraction, not a learning gap?',
      a: 'Give them harder words or set a higher score goal. LexiClash adapts to different levels. Or rotate them: some play the word game, others read, others do maths. The game is one station in your system.',
    },
  ],
  labels: {
    faqTitle: 'Questions about early finishers',
    relatedTitle: 'More teaching ideas',
  },
  related: [
    { href: '/education/brain-breaks-word-games', label: 'Brain breaks with word games', accent: 'lime' },
    { href: '/education/vocabulary-games-classroom', label: 'Vocabulary games for the classroom', accent: 'cyan' },
    { href: '/education/spelling-bee-practice', label: 'Spelling practice games', accent: 'purple' },
    { href: '/education/middle-school-word-games', label: 'Word games for middle school', accent: 'pink' },
    { href: '/education', label: 'All teaching guides', accent: 'pink' },
  ],
  breadcrumb: {
    home: 'Home',
    hub: 'Teaching guides',
    current: 'Early finishers activities',
  },
  learning: {
    educationalUse: ['Classroom Activity'],
    educationalLevel: ['Primary', 'Secondary'],
    typicalAgeRange: '7-16',
    teaches: 'Vocabulary retention, word recognition, independent learning',
    timeRequired: 'PT10M',
  },
};

const HE: EducationLandingContent = {
  accent: 'lime',
  meta: {
    title: 'פעילויות לתלמידים שמסיימים מוקדם | LexiClash',
    description: "משחקי מילים עצמאיים לתלמידים שמסיימים עבודה מוקדם. בלי הנחיה מהמורה, בלי הפסקות בשיעור, וכל מילה היא מהשיעור שלך.",
    keywords: [
      'פעילויות לתלמידים שמסיימים מוקדם',
      'משחקי מילים לכיתה',
      'אתגרים לתלמידים מהירים',
      'עבודה עצמאית בכיתה',
      'משחקים חינוכיים לתלמידים',
      'משחקים עצמאיים בכיתה',
      'משחקי מילים בלי פקוח',
    ],
  },
  hero: {
    facts: [
      'ארבעה תלמידים סיימו, עשרים עדיין עובדים',
      'בלי הכנה כל יום, משחקים כל הזמן',
      'כל מכשיר חכם, כל טלפון, כל טבלט',
    ],
    h1: {
      part1: 'תלמידים שמסיימים מוקדם',
      highlight: 'לא משתעממים',
      part2: '',
    },
    subtitle: 'משחק מילים שרץ לבד. ללא תכנון שיעור. רק לחץ וקדימה.',
    primaryCta: {
      label: 'צור כיתה',
      href: '/education/classroom-game',
    },
    secondaryCta: {
      label: 'למדו עוד',
      href: '/education',
    },
  },
  answer: {
    question: 'מה טוב לתלמידים שמסיימים עבודה מוקדם?',
    answer:
      'משחקי מילים עצמאיים כמו LexiClash מאפשרים לתלמידים שמסיימים לשחק בלי הערות של מורה. בלי הפסקות, בלי ציונים נוספים, וכל מילה היא מהשיעור. הגדר פעם אחת, השתמש כל השנה.',
  },
  sections: [
    {
      kind: 'table',
      title: 'משחקי מילים לכל נושא',
      intro: 'כל שיעור עם משחק מילים של 4 דקות. בחרו את זה שמתאים למה שלמדתם.',
      columns: ['נושא', 'משחק מילים', 'מה זה מחזק', 'הכנה של מורה'],
      rows: [
        ['קריאה וכתיבה', 'מצא מילים מהטקסט בתבנית אותיות', 'זיכרון מילים, דפוסי איות', 'אין—התלמידים כותבים את המילים שלמדו'],
        ['מתמטיקה', 'כתוב מילים למספרים ותרגילים', 'שמות של צורות ופעולות', 'אין—משתנה לכל מספר'],
        ['מדע', 'מצא מונחים מהיחידה', 'אוצר מדעי, זיכרון', 'אין—עובד עם כל הנושא'],
        ['היסטוריה', 'חפש שמות אנשים וארועים', 'מילים היסטוריות', 'אין—עובד בכל תקופה'],
        ['שפה זרה', 'חידות מילים בשפת היעד', 'דפוסי מילים, איות', 'אין—כל שפה'],
        ['אמנות', 'משחק מילים לצבעים וטכניקות', 'שפת עיצוב', 'אין—עובד בכל סגנון'],
      ],
    },
    {
      kind: 'steps',
      title: 'הגדר פעם אחת, השתמש כל השנה',
      intro: 'שלושה שלבים ביום הראשון. אחר כך זה רץ לבד.',
      items: [
        {
          step: 'שלב 1: צור את הכיתה שלך',
          focus: 'בחר קוד כיתה. התלמידים מצטרפים איתו.',
          activity: '60 שניות. בלי רשימת דוא"ל. קוד אחד עובד כל השנה.',
        },
        {
          step: 'שלב 2: הצג משחק אחד לכל הכיתה',
          focus: 'שחקו סיבוב אחד ביחד, 2 דקות.',
          activity: 'הראה להם את הרשת, איך למצוא מילה, מה קורה כשהם מנצחים. הכל.',
        },
        {
          step: 'שלב 3: כרטיס רוטינה בכיתה',
          focus: 'הדפס או הקרן שלוש מילים: "סיימת? שחק LexiClash."',
          activity: "תלמידים שמסיימים הולכים למכשיר (טלפון, טבלט או כרומבוק) ומתחברים עם קוד הכיתה. הם משחקים. ללא הפסקות.",
        },
      ],
    },
    {
      kind: 'features',
      title: 'למה משחקי מילים עובדים לתלמידים שמסיימים מוקדם',
      items: [
        {
          icon: 'timer',
          text: 'סיבובים מתוזמנים (2–4 דקות) מכניסים תלמידים לכסאות, לא משוטטים.',
        },
        {
          icon: "users",
          text: "משחק בודד או חי עם חברים בכיתה—בלי צ'ט, בלי הפסקות, בלי בעיות.",
        },
        {
          icon: 'graduation',
          text: 'כל מילה שהם מוצאים היא מהשיעור—למידה לא נעצרת.',
        },
        {
          icon: 'monitor',
          text: 'עובד בכל טלפון, כל טבלט, כל מחשב. בלי הורדה.',
        },
        {
          icon: 'book',
          text: 'לוח המורה מראה אילו מילים כל תלמיד החמיץ—תלמד את זה בשבוע הבא.',
        },
        {
          icon: 'zap',
          text: 'ללא הפסקות. תלמידים יודעים את הכללים אחרי יום אחד. ללא שאלות.',
        },
      ],
    },
  ],
  faqs: [
    {
      q: 'האם הם ימהרו בעבודה הראשונה כדי לשחק?',
      a: "חלקם כן, בתחילה. קבעו כללים ברורים: \"צריך לסיים את העבודה כראוי לפני משחק.\" השתמשו בתבנית כדי שידעו מה \"סיים\" אומר. אחרי שבוע זה הופך לנורמה. רוב המורים אומרים שהמשחק למעשה מעודד תלמידים איטיים כי הם רואים חברים משחקים.",
    },
    {
      q: "זה בטוח? יש צ'ט או קישורים?",
      a: "בלי צ'ט, בלי הודעות פרטיות, בלי קישורים חיצוניים. זה משחק מילים בלבד. תלמידים רואים שמות ותוצאות של שחקנים אחרים בלוח תוצאות, וזה הכל. בלי מידע אישי.",
    },
    {
      q: 'מה עם זמן מסך?',
      a: "כל סיבוב הוא 2–4 דקות. אם תלמיד סיים 10 דקות מוקדם, הוא משחק סיבוב אחד, לא שישה. המשחק עוצר אותו כשהזמן נגמר. זה קצר יותר מסרטון הפסקה.",
    },
    {
      q: 'צריך ללמד אותם איך משחקים?',
      a: "הדגמה של שתי דקות עם כל הכיתה. הראה את הרשת, בחר מילה, תן להם למצוא אחת. זהו. הם לומדים באמצעות משחק.",
    },
    {
      q: 'אין לי מכשירים בכיתה?',
      a: 'צריך מכשיר אחד לפחות (טלפון או טבלט) לתלמידים שמסיימים לשתף. רוב הכיתות יש כרומבוק או אייפד. LexiClash עובד בכל.',
    },
    {
      q: 'אני יכול להשתמש באותו קוד כל השנה?',
      a: "כן, אותו קוד כל השנה. תלמידים לא צריכים לזכור—אתה כותב אותו על הלוח פעם אחת, וזה נשאר שם. הם משתמשים בו כל פעם שמסיימים מוקדם.",
    },
    {
      q: 'אני אראה מה הם משחקו?',
      a: "כן. לוח המורה שלך מראה תוצאות, אילו מילים הם מצאו, ואילו החמיצו. השתמש בזה לבחירת מילים לשבוע הבא.",
    },
    {
      q: 'אם הם מהירים אבל לא תמיד רוצים ללמוד, מה?',
      a: "תן להם מילים קשות או מטרה גבוהה יותר. LexiClash משתנה לרמות שונות. או סובבו תחנות: חלקם משחקים, חלקם קוראים, חלקם עושים מתמטיקה. המשחק היא תחנה אחת בסיבוב שלך.",
    },
  ],
  labels: {
    faqTitle: 'שאלות על תלמידים שמסיימים מוקדם',
    relatedTitle: 'עוד רעיונות הוראה',
  },
  related: [
    { href: '/education/brain-breaks-word-games', label: 'הפסקות מוח עם משחקי מילים', accent: 'lime' },
    { href: '/education/vocabulary-games-classroom', label: 'משחקי אוצר מילים לכיתה', accent: 'cyan' },
    { href: '/education/spelling-bee-practice', label: 'משחקי איות', accent: 'purple' },
    { href: '/education/middle-school-word-games', label: 'משחקי מילים לחטיבת הביניים', accent: 'pink' },
    { href: '/education', label: 'כל המדריכים', accent: 'pink' },
  ],
  breadcrumb: {
    home: 'בית',
    hub: 'מדריכי הוראה',
    current: 'פעילויות לתלמידים שמסיימים מוקדם',
  },
  learning: {
    educationalUse: ['Classroom Activity'],
    educationalLevel: ['Primary', 'Secondary'],
    typicalAgeRange: '7-16',
    teaches: 'זיכרון מילים, זיהוי מילים, למידה עצמאית',
    timeRequired: 'PT10M',
  },
};

const ES: EducationLandingContent = {
  accent: 'lime',
  meta: {
    title: 'Actividades para estudiantes que terminan primero | LexiClash',
    description: 'Juegos de palabras independientes para que terminen sin aburrirse. Sin supervisión constante, los estudiantes juegan y aprenden al mismo tiempo.',
    keywords: [
      'actividades para estudiantes que terminan primero',
      'tareas para estudiantes rápidos',
      'juegos de palabras en el aula',
      'actividades independientes para estudiantes',
      'qué hacer con estudiantes que terminan primero',
      'juegos educativos para la clase',
      'actividades de vocabulario',
    ],
  },
  hero: {
    facts: [
      'Cuatro estudiantes terminan; veinte aún trabajan',
      'Sin preparación diaria, juega solo',
      'Funciona en cualquier dispositivo del aula',
    ],
    h1: {
      part1: 'Mantén a los estudiantes que terminan primero',
      highlight: 'ocupados, no aburridos',
      part2: '',
    },
    subtitle: 'Un juego de palabras que funciona sin ti. Sin planificación extra. Solo abre y listo.',
    primaryCta: {
      label: 'Crea un aula',
      href: '/education/classroom-game',
    },
    secondaryCta: {
      label: 'Aprende más',
      href: '/education',
    },
  },
  answer: {
    question: '¿Qué actividades son buenas para estudiantes que terminan el trabajo primero?',
    answer:
      'Los juegos de palabras independientes como LexiClash permiten que los estudiantes rápidos jueguen sin interrupciones constantes. Sin distracciones de clase, sin trabajo extra para ti, y cada palabra viene de la lección que acabas de enseñar.',
  },
  sections: [
    {
      kind: 'table',
      title: 'Juegos de palabras para cada materia',
      intro: 'Combina cualquier lección con una actividad de 4 minutos. Elige la que coincida con lo que acabas de enseñar.',
      columns: ['Materia', 'Actividad de palabras', 'Lo que refuerza', 'Preparación del docente'],
      rows: [
        ['Lectura y lenguaje', 'Busca palabras de vocabulario en una cuadrícula de letras', 'Reconocimiento de palabras, patrones de ortografía', 'Ninguna—los estudiantes escriben palabras que aprendieron'],
        ['Matemáticas', 'Deletrea números y términos matemáticos', 'Vocabulario de operaciones, formas, conceptos', 'Ninguna—se adapta a cualquier número que enseñaste'],
        ['Ciencias', 'Localiza términos clave de la unidad', 'Vocabulario científico, retención', 'Ninguna—funciona con cualquier tema'],
        ['Historia y Estudios Sociales', 'Busca personas, lugares, eventos', 'Vocabulario histórico, recordación', 'Ninguna—funciona en cualquier período'],
        ['Idioma extranjero', 'Sopas de letras en el idioma objetivo', 'Patrones de vocabulario, ortografía', 'Ninguna—compatible con todos los idiomas'],
        ['Arte y Diseño', 'Juego de vocabulario de colores y técnicas', 'Lenguaje de diseño, palabras descriptivas', 'Ninguna—funciona en todos los estilos'],
      ],
    },
    {
      kind: 'steps',
      title: 'Configúralo una vez, úsalo todo el año',
      intro: 'Tres pasos el primer día. Luego funciona solo.',
      items: [
        {
          step: 'Paso 1: Crea tu aula',
          focus: 'Elige un código de clase. Los estudiantes se unen con él.',
          activity: 'Toma 60 segundos. Sin listas de correo. Un código funciona todo el año.',
        },
        {
          step: 'Paso 2: Muestra un juego a toda la clase',
          focus: 'Demostración de 2 minutos para que sepan qué hacer.',
          activity: 'Juega una ronda juntos. Muéstrales la cuadrícula, cómo encontrar palabras, qué sucede cuando ganan. Eso es todo.',
        },
        {
          step: 'Paso 3: Tarjeta de rutina en el aula',
          focus: 'Imprime o proyecta tres palabras: "¿Terminaste? Juega LexiClash."',
          activity: 'Los estudiantes que terminan van al dispositivo y se unen con el código de clase. Juegan. Sin interrupciones.',
        },
      ],
    },
    {
      kind: 'features',
      title: 'Por qué los juegos de palabras funcionan para estudiantes que terminan primero',
      items: [
        {
          icon: 'timer',
          text: 'Rondas temporizadas (2–4 min) mantienen a los estudiantes en sus asientos, sin merodear.',
        },
        {
          icon: 'users',
          text: 'Juego individual o en vivo con compañeros—sin chat, sin distracciones, sin exceso de pantalla.',
        },
        {
          icon: 'graduation',
          text: 'Cada palabra que encuentran viene de tu lección—el aprendizaje continúa, no se detiene.',
        },
        {
          icon: 'monitor',
          text: 'Funciona en Chromebooks, tablets y teléfonos. Cualquier dispositivo. Sin instalación.',
        },
        {
          icon: 'book',
          text: 'El panel del docente muestra qué palabras cada estudiante no encontró—puedes enseñar esas la próxima semana.',
        },
        {
          icon: 'zap',
          text: 'Sin interrupciones. Los estudiantes conocen las reglas después del primer día. Sin preguntas.',
        },
      ],
    },
  ],
  faqs: [
    {
      q: '¿Se apresurarán en el trabajo principal para llegar al juego?',
      a: 'Algunos lo harán, al principio. Establece reglas claras: "Debes terminar el trabajo correctamente antes de jugar." Usa una lista de verificación para que sepan qué significa "terminado". Después de una semana, se vuelve normal. La mayoría de los docentes dicen que el juego motiva a los estudiantes más lentos porque ven a sus compañeros jugando.',
    },
    {
      q: '¿Es seguro? ¿Hay chat o enlaces externos?',
      a: 'Sin chat, sin mensajes directos, sin enlaces externos. Es solo un juego de palabras. Los estudiantes ven nombres y puntuaciones de otros jugadores en la tabla de clasificación, pero eso es todo. No se comparte información personal.',
    },
    {
      q: '¿Y el tiempo de pantalla?',
      a: 'Cada ronda dura 2–4 minutos. Si un estudiante termina 10 minutos antes, juega una ronda, no seis. El juego los detiene cuando se acaba el tiempo. Es más corto que un video de descanso.',
    },
    {
      q: '¿Necesito enseñarles cómo jugar?',
      a: 'Demostración de dos minutos con toda la clase. Muéstrales la cuadrícula, señala una palabra, déjalos encontrar una. Eso es suficiente. Aprenden jugando. Sin tutorial.',
    },
    {
      q: '¿Qué pasa si no tengo dispositivos en el aula?',
      a: 'Necesitas al menos un dispositivo (un teléfono o tablet) para que los estudiantes que terminan primero lo compartan. Muchas aulas tienen un conjunto de Chromebooks o un iPad compartido. LexiClash funciona en todos ellos.',
    },
    {
      q: '¿Puedo usar el mismo código todo el año?',
      a: 'Sí, el mismo código todo el año. Los estudiantes no necesitan memorizarlo—lo escribes en la pizarra una vez y se queda ahí. Lo usan cada vez que terminan primero.',
    },
    {
      q: '¿Veré qué jugaron?',
      a: 'Sí. Tu panel de docente muestra puntuaciones, qué palabras encontraron y cuáles no. Úsalo para elegir vocabulario para la lección de la próxima semana.',
    },
    {
      q: '¿Y si los que terminan primero son solo una distracción, no una brecha de aprendizaje?',
      a: 'Dale palabras más difíciles o establece una puntuación más alta. LexiClash se adapta a diferentes niveles. O rota: algunos juegan, otros leen, otros hacen matemáticas. El juego es una estación en tu sistema.',
    },
  ],
  labels: {
    faqTitle: 'Preguntas sobre estudiantes que terminan primero',
    relatedTitle: 'Más ideas de enseñanza',
  },
  related: [
    { href: '/education/brain-breaks-word-games', label: 'Descansos mentales con juegos de palabras', accent: 'lime' },
    { href: '/education/vocabulary-games-classroom', label: 'Juegos de vocabulario para el aula', accent: 'cyan' },
    { href: '/education/spelling-bee-practice', label: 'Juegos de práctica de ortografía', accent: 'purple' },
    { href: '/education/middle-school-word-games', label: 'Juegos de palabras para secundaria', accent: 'pink' },
    { href: '/education', label: 'Todos los recursos', accent: 'pink' },
  ],
  breadcrumb: {
    home: 'Inicio',
    hub: 'Recursos de enseñanza',
    current: 'Actividades para estudiantes que terminan primero',
  },
  learning: {
    educationalUse: ['Classroom Activity'],
    educationalLevel: ['Primary', 'Secondary'],
    typicalAgeRange: '7-16',
    teaches: 'Retención de vocabulario, reconocimiento de palabras, aprendizaje independiente',
    timeRequired: 'PT10M',
  },
};

const SV: EducationLandingContent = {
  accent: 'lime',
  meta: {
    title: 'Aktiviteter för elever som är klara först | LexiClash',
    description: 'Självstyrda ordspel för elever som arbetar snabbt. Ingen övervakning varje dag, eleverna spelar och lär samtidigt.',
    keywords: [
      'aktiviteter för elever som är klara först',
      'snabba elevers uppgifter',
      'ordspel i klassrummet',
      'självständiga aktiviteter',
      'vad gör man när eleverna är klara',
      'ordspel för elever',
      'ordförråd spel klassrum',
    ],
  },
  hero: {
    facts: [
      'Fyra elever klara; tjugo arbetar fortfarande',
      'Utan daglig förberedelse, spelar själv',
      'Fungerar på valfri enhet i klassrummet',
    ],
    h1: {
      part1: 'Håll elever som är klara först',
      highlight: 'sysselsatta, inte uttråkade',
      part2: '',
    },
    subtitle: 'Ett ordspel som kör sig själv. Ingen lektionsplanering. Bara klicka och igång.',
    primaryCta: {
      label: 'Skapa ett klassrum',
      href: '/education/classroom-game',
    },
    secondaryCta: {
      label: 'Läs mer',
      href: '/education',
    },
  },
  answer: {
    question: 'Vilka aktiviteter är bra för elever som blir klara med sitt arbete först?',
    answer:
      'Självstyrda ordspel låter snabba elever fortsätta på egen hand medan resten av klassen arbetar klart. De öppnar LexiClash, spelar en runda på ordlistan du redan använt, och behöver inte fråga dig om något. Ingen störning i lektionen, inget extra att rätta, och orden kommer från dagens genomgång.',
  },
  sections: [
    {
      kind: 'table',
      title: 'Ordspel för varje ämne',
      intro: 'Kombinera vilken lektion som helst med en 4-minuters aktivitet. Välj den som passar det du just lärde ut.',
      columns: ['Ämne', 'Ordspelsaktivitet', 'Förstärker', "Lärarens förberedelse"],
      rows: [
        ['Läsning och svenska', 'Hitta vokabulär från texten i ett bokstavsrutnät', 'Ordkännedom, stavningsmönster', 'Ingen—eleverna skriver ord de lärt sig'],
        ['Matematik', 'Stava tal och matematiska termer', 'Namn på operationer, former, begrepp', 'Ingen—anpassas till vilka tal du undervisade'],
        ['Naturvetenskap', 'Hitta nyckeltermer från enheten', 'Vetenskaplig vokabulär, minne', 'Ingen—fungerar med vilket ämne som helst'],
        ['Historia och samhälle', 'Sök efter människor, platser, händelser', 'Historisk vokabulär, återkallande', 'Ingen—fungerar i vilken period som helst'],
        ['Främmande språk', 'Ordspel på målspråket', 'Ordmönster, stavning', 'Ingen—stöder alla språk'],
        ['Konst och design', 'Färg- och teknikvokabularspel', 'Designspråk, beskrivande ord', 'Ingen—fungerar i alla stilar'],
      ],
    },
    {
      kind: 'steps',
      title: 'Ställ in det en gång, använd det hela året',
      intro: 'Tre steg första dagen. Sedan kör det sig själv.',
      items: [
        {
          step: 'Steg 1: Skapa ditt klassrum',
          focus: 'Välj en klasskod. Elever ansluter med den.',
          activity: '60 sekunder. Ingen e-postlista. En kod fungerar hela året.',
        },
        {
          step: 'Steg 2: Visa ett spel för hela klassen',
          focus: '2-minuters demo så de vet vad de ska göra.',
          activity: 'Spela en omgång tillsammans. Visa dem nätet, hur man hittar ord, vad som händer när de vinner. Det är allt.',
        },
        {
          step: 'Steg 3: Rutinkort i klassrummet',
          focus: 'Skriv ut eller projicera tre ord: "Klar? Spela LexiClash."',
          activity: 'Elever som är klara går till enheten och ansluter med klasskoden. De spelar. Inga avbrott.',
        },
      ],
    },
    {
      kind: 'features',
      title: 'Varför ordspel fungerar för elever som är klara först',
      items: [
        {
          icon: 'timer',
          text: 'Tidsbegränsade omgångar (2–4 min) håller elever på sina platser, inget springande omkring.',
        },
        {
          icon: 'users',
          text: 'Ensamt spel eller live med klasskamrater—ingen chatt, inga avbrott, ingen överdriven skärmtid.',
        },
        {
          icon: 'graduation',
          text: 'Varje ord de hittar är från din lektion—lärandet fortsätter, stannar inte av.',
        },
        {
          icon: 'monitor',
          text: 'Fungerar på Chromebooks, surfplattor och telefoner. Vilken enhet som helst. Ingen installation.',
        },
        {
          icon: 'book',
          text: 'Lärarpanelen visar vilka ord varje elev missade—du kan lära ut dem nästa vecka.',
        },
        {
          icon: 'zap',
          text: 'Inga avbrott. Elever vet reglerna efter dag ett. Inga frågor.',
        },
      ],
    },
  ],
  faqs: [
    {
      q: 'Skyndar de sig genom huvudarbetet bara för att få spela?',
      a: 'Vissa gör det, till en början. Sätt tydliga regler: "Du måste göra arbetet ordentligt innan du spelar." Använd en checklista så de vet vad "klar" betyder. Efter en vecka blir det normalt. De flesta lärare säger att spelet faktiskt motiverar elever som arbetar långsammare eftersom de ser kamrater spela.',
    },
    {
      q: 'Är det säkert? Finns det chatt eller externa länkar?',
      a: 'Ingen chatt, inga direktmeddelanden, inga externa länkar. Det är bara ett ordspel. Elever ser namn och poäng från andra spelare i poänglistan, men det är allt. Ingen personlig information delas.',
    },
    {
      q: 'Vad sägs om skärmtid?',
      a: 'Varje omgång är 2–4 minuter. Om en elev blir klar 10 minuter tidigare spelar de en omgång, inte sex. Spelet stoppar dem när tiden är ute. Det är kortare än en rastvideo.',
    },
    {
      q: 'Behöver jag lära dem hur man spelar?',
      a: '2-minuters demo med hela klassen. Visa dem nätet, peka på ett ord, låt dem hitta ett. Det räcker. De lär sig genom att spela. Ingen handledning behövs.',
    },
    {
      q: 'Vad händer om jag inte har enheter i klassrummet?',
      a: 'Du behöver minst en enhet (en telefon eller surfplatta) för elever som är klara att dela. Många klassrum har en uppsättning Chromebooks eller en delad iPad. LexiClash fungerar på alla.',
    },
    {
      q: 'Kan jag använda samma kod hela året?',
      a: 'Ja, samma kod hela året. Elever behöver inte memorera det—du skriver det på tavlan en gång och det stannar där. De använder det varje gång de är klara först.',
    },
    {
      q: 'Ser jag vad de spelade?',
      a: 'Ja. Din lärarpanel visar poäng, vilka ord de hittade och vilka de missade. Använd det för att välja vokabulär för nästa veckas lektion.',
    },
    {
      q: 'Vad om elever som är klara först bara är en störning, inte en kunskapslucka?',
      a: 'Ge dem svårare ord eller sätt ett högre poängmål. LexiClash anpassas till olika nivåer. Eller rotera: några spelar ordspelet, andra läser, andra gör matte. Spelet är en station i ditt system.',
    },
  ],
  labels: {
    faqTitle: 'Frågor om elever som är klara först',
    relatedTitle: 'Fler undervisningsidéer',
  },
  related: [
    { href: '/education/brain-breaks-word-games', label: 'Hjärnpauser med ordspel', accent: 'lime' },
    { href: '/education/vocabulary-games-classroom', label: 'Ordförrådsspel för klassrummet', accent: 'cyan' },
    { href: '/education/spelling-bee-practice', label: 'Stavningsövningsspel', accent: 'purple' },
    { href: '/education/middle-school-word-games', label: 'Ordspel för högstadiet', accent: 'pink' },
    { href: '/education', label: 'Alla resurser', accent: 'pink' },
  ],
  breadcrumb: {
    home: 'Hem',
    hub: 'Undervisningsresurser',
    current: 'Aktiviteter för elever som är klara först',
  },
  learning: {
    educationalUse: ['Classroom Activity'],
    educationalLevel: ['Primary', 'Secondary'],
    typicalAgeRange: '7-16',
    teaches: 'Ordförrådsminne, ordkännedom, oberoende lärande',
    timeRequired: 'PT10M',
  },
};

const JA: EducationLandingContent = {
  accent: 'lime',
  meta: {
    title: '課題を終わらせた生徒向けのアクティビティ | LexiClash',
    description: '自分のペースで進められる単語ゲーム。毎日の準備不要、生徒は遊びながら学べます。',
    keywords: [
      '課題を終わらせた生徒向けアクティビティ',
      '早く終わった生徒のゲーム',
      '単語ゲーム教室',
      '自主学習活動',
      '課題終了後の活動',
      '生徒向け単語ゲーム',
      '語彙ゲーム教室',
    ],
  },
  hero: {
    facts: [
      '4人の生徒は終わり、20人はまだ作業中',
      '毎日準備不要、自動で進む',
      'どんなデバイスでも教室で動作',
    ],
    h1: {
      part1: '課題を終わらせた生徒を',
      highlight: '退屈させず、楽しませる',
      part2: '',
    },
    subtitle: 'ひとりでに進むゲームです。授業計画は不要です。クリックするだけで始まります。',
    primaryCta: {
      label: 'クラスを作成',
      href: '/education/classroom-game',
    },
    secondaryCta: {
      label: '詳しく知る',
      href: '/education',
    },
  },
  answer: {
    question: '課題を先に終わらせた生徒にはどんなアクティビティが良いですか？',
    answer:
      '課題を早く終えた生徒には、自分で進められる単語ゲームを用意しておきます。LexiClashを開き、その日に扱った単語リストで一回戦を遊ぶだけなので、先生に質問する必要がありません。授業を中断せず、丸つけも増えず、練習する単語はいま教えた内容そのものです。',
  },
  sections: [
    {
      kind: 'table',
      title: 'すべての教科に対応した単語ゲーム',
      intro: 'どんな授業にも4分間のアクティビティを加えられます。授業内容に合ったものを選びましょう。',
      columns: ['教科', '単語ゲームのタイプ', '強化される力', '準備'],
      rows: [
        ['国語・読書', '教科書から単語を文字グリッドで探す', '単語認識、スペルパターン', 'なし—生徒が学んだ単語を入力'],
        ['算数', '数字や算数用語をスペルする', '記号や形、概念の用語', 'なし—どんな数字にも対応'],
        ['理科', 'ユニットの重要用語を探す', '科学用語、記憶力', 'なし—どんなテーマにも対応'],
        ['社会・歴史', '人物、場所、出来事を探す', '歴史用語、思い出す力', 'なし—どんな時代にも対応'],
        ['外国語', '目標言語の単語パズル', '単語パターン、スペル', 'なし—すべての言語に対応'],
        ['図工・美術', '色や技法の用語ゲーム', 'デザイン言語、描写語', 'なし—すべてのスタイルに対応'],
      ],
    },
    {
      kind: 'steps',
      title: '1回設定すれば、1年中使えます',
      intro: '初日に3ステップ。その後は自動で進みます。',
      items: [
        {
          step: 'ステップ1：クラスを作成',
          focus: 'クラスコードを決める。生徒はそれで参加',
          activity: '60秒で完了。メールリスト不要。1つのコードで1年使える。',
        },
        {
          step: 'ステップ2：全クラスでゲームを1回デモ',
          focus: '2分間で何をするかを見せる',
          activity: '一緒にやってみる。グリッドを見せて、単語の探し方、勝ったときの動きを見せる。それだけ。',
        },
        {
          step: 'ステップ3：教室に使用方法を貼る',
          focus: '3つの単語を印刷・投影：「終わった？LexiClashをしよう」',
          activity: '課題を終わらせた生徒がデバイスに行ってクラスコードで参加。ゲームをする。邪魔なし。',
        },
      ],
    },
    {
      kind: 'features',
      title: '課題を終わらせた生徒に単語ゲームが効果的な理由',
      items: [
        {
          icon: 'timer',
          text: 'タイム制のゲーム（2～4分）で生徒が席に座っています。うろつきません。',
        },
        {
          icon: 'users',
          text: 'ひとり、またはクラスメートと一緒に遊べます。チャットなし、邪魔なし、画面時間が増えません。',
        },
        {
          icon: 'graduation',
          text: '見つけた単語すべてが授業からです。学習が止まりません。',
        },
        {
          icon: 'monitor',
          text: 'Chromebook、タブレット、スマートフォンに対応しています。インストール不要です。',
        },
        {
          icon: 'book',
          text: '先生ダッシュボードで各生徒が見落とした単語が分かります。来週の授業で教えられます。',
        },
        {
          icon: 'zap',
          text: '邪魔がありません。初日で生徒がルールを覚えます。質問はなしです。',
        },
      ],
    },
  ],
  faqs: [
    {
      q: 'ゲームのために課題を急いでしてしまわないでしょうか？',
      a: '最初はするかもしれません。明確なルール：「遊ぶ前に課題をちゃんと終わらせてください」。チェックリストで「完了」の意味を明確にします。1週間でふつうになります。ほとんどの先生は、友達がゲームしているのを見ると遅い生徒もやる気になると言います。',
    },
    {
      q: 'セキュリティは大丈夫？チャットや外部リンクは？',
      a: 'チャットなし、DM機能なし、外部リンクなし。ゲームだけです。他の生徒の名前とスコアがランキングに出ますが、それだけ。個人情報は共有されません。',
    },
    {
      q: '画面時間は大丈夫でしょうか？',
      a: '1ゲーム2～4分です。10分早く終わった生徒なら1ゲームをします。タイマーで自動停止します。動画より短いです。',
    },
    {
      q: 'やり方を教える必要がありますか？',
      a: '2分間全クラスでデモをします。グリッドを見せて、単語を指して、1個探させます。それで十分です。ゲームで覚えます。',
    },
    {
      q: '教室にデバイスがない場合は？',
      a: '最低1台（スマホまたはタブレット）あれば、生徒でシェアできます。Chromebookセットかタブレットがあれば理想的。LexiClashはどれでも動きます。',
    },
    {
      q: 'コードは1年中同じ？',
      a: 'はい、1年中同じコード。生徒が覚える必要はない。黒板に1回書いたら、そこにずっとあります。',
    },
    {
      q: 'どのゲームを遊んだか見える？',
      a: 'はい。先生ダッシュボードで得点、見つけた単語、見落とした単語がわかります。来週の授業の語彙選択に使えます。',
    },
    {
      q: '早い生徒が学習できていない場合はどうしますか？',
      a: 'もっと難しい単語にするか、高いスコア目標を設定します。LexiClashはレベルに合わせられます。または、何人かはゲーム、何人かは読書、何人かは算数をします。ゲームは活動の一つです。',
    },
  ],
  labels: {
    faqTitle: '課題を終わらせた生徒に関するよくある質問',
    relatedTitle: 'その他の指導のアイデア',
  },
  related: [
    { href: '/education/brain-breaks-word-games', label: '単語ゲームで脳をリフレッシュ', accent: 'lime' },
    { href: '/education/vocabulary-games-classroom', label: '教室で使う語彙ゲーム', accent: 'cyan' },
    { href: '/education/spelling-bee-practice', label: 'スペリング練習ゲーム', accent: 'purple' },
    { href: '/education/middle-school-word-games', label: '中学生向けの単語ゲーム', accent: 'pink' },
    { href: '/education', label: 'すべての資料', accent: 'pink' },
  ],
  breadcrumb: {
    home: 'ホーム',
    hub: '指導資料',
    current: '課題を終わらせた生徒向けアクティビティ',
  },
  learning: {
    educationalUse: ['Classroom Activity'],
    educationalLevel: ['Primary', 'Secondary'],
    typicalAgeRange: '7-16',
    teaches: '語彙の定着、単語認識、自主学習',
    timeRequired: 'PT10M',
  },
};

const RU: EducationLandingContent = {
  accent: 'lime',
  meta: {
    title: 'Занятия для учеников, которые закончили раньше | LexiClash',
    description: 'Словесные игры для самостоятельной работы. Без ежедневной подготовки, ученики играют и учатся одновременно.',
    keywords: [
      'занятия для учеников закончивших раньше',
      'игры для быстрых учеников',
      'словесные игры в классе',
      'самостоятельные занятия',
      'что делать когда ученик закончил',
      'словесные игры ученики',
      'игры с лексикой класс',
    ],
  },
  hero: {
    facts: [
      'Четверо учеников закончили; двадцать ещё работают',
      'Без подготовки каждый день, игра работает сама',
      'Работает на любом устройстве в классе',
    ],
    h1: {
      part1: 'Занятия для учеников,',
      highlight: 'закончивших раньше',
      part2: '',
    },
    subtitle: 'Игра, которая работает сама по себе. Без плана урока. Просто нажмите и начните.',
    primaryCta: {
      label: 'Создать класс',
      href: '/education/classroom-game',
    },
    secondaryCta: {
      label: 'Узнать больше',
      href: '/education',
    },
  },
  answer: {
    question: 'Какие занятия хороши для учеников, которые закончили работу раньше других?',
    answer:
      'Самостоятельные словесные игры, такие как LexiClash, позволяют быстрым ученикам играть без постоянного надзора учителя. Без перерывов на уроках, без дополнительной работы для вас, и каждое слово из вашего урока.',
  },
  sections: [
    {
      kind: 'table',
      title: 'Словесные игры для каждого предмета',
      intro: 'Добавьте 4-минутное занятие к любому уроку. Выберите то, что соответствует тому, что вы только что преподавали.',
      columns: ['Предмет', 'Словесная игра', 'Что укрепляет', 'Подготовка учителя'],
      rows: [
        ['Чтение и литература', 'Найдите слова из текста в сетке букв', 'Узнавание слов, орфография', 'Не нужна—ученики пишут слова, которые учили'],
        ['Математика', 'Напишите цифры и математические термины', 'Названия операций, форм, понятий', 'Не нужна—адаптируется к любым числам'],
        ['Естественные науки', 'Найдите ключевые термины из раздела', 'Научная лексика, закрепление', 'Не нужна—работает с любой темой'],
        ['История и обществознание', 'Поиск людей, мест, событий', 'Историческая лексика, повторение', 'Не нужна—работает в любой период'],
        ['Иностранный язык', 'Словесные головоломки на изучаемом языке', 'Словесные паттерны, написание', 'Не нужна—поддерживает все языки'],
        ['Искусство и дизайн', 'Игра со словами о цветах и техниках', 'Язык дизайна, описательные слова', 'Не нужна—работает во всех стилях'],
      ],
    },
    {
      kind: 'steps',
      title: 'Настрой один раз, используй весь год',
      intro: 'Три шага в первый день. Потом работает само.',
      items: [
        {
          step: 'Шаг 1: Создайте свой класс',
          focus: 'Выберите код класса. Ученики присоединяются по коду.',
          activity: '60 секунд. Без списка email. Один код работает весь год.',
        },
        {
          step: 'Шаг 2: Покажите одну игру всему классу',
          focus: '2-минутная демонстрация, чтобы они знали, что делать.',
          activity: 'Сыграйте один раунд вместе. Покажите сетку, как найти слово, что происходит при выигрыше. Всё.',
        },
        {
          step: 'Шаг 3: Карточка с инструкциями в классе',
          focus: 'Напечатайте или проецируйте три слова: "Закончил? Играй в LexiClash."',
          activity: 'Ученики, закончившие работу, идут к устройству и присоединяются с кодом класса. Играют. Без перерывов.',
        },
      ],
    },
    {
      kind: 'features',
      title: 'Почему словесные игры работают для учеников, закончивших раньше',
      items: [
        {
          icon: 'timer',
          text: 'Раунды с ограничением по времени (2–4 мин) держат учеников за партами, они не бродят.',
        },
        {
          icon: 'users',
          text: 'Игра в одиночку или в прямом эфире с одноклассниками—без чата, без отвлечений, без избытка экрана.',
        },
        {
          icon: 'graduation',
          text: 'Каждое найденное слово из вашего урока—обучение продолжается, не прерывается.',
        },
        {
          icon: 'monitor',
          text: 'Работает на Chromebook, планшетах и телефонах. Любое устройство. Без установки.',
        },
        {
          icon: 'book',
          text: 'Панель учителя показывает, какие слова пропустил каждый ученик—вы можете преподавать их на следующей неделе.',
        },
        {
          icon: 'zap',
          text: 'Без перерывов. Ученики знают правила после первого дня. Никаких вопросов.',
        },
      ],
    },
  ],
  faqs: [
    {
      q: 'Будут ли они торопиться с основной работой, чтобы поиграть?',
      a: 'Некоторые будут, поначалу. Установите чёткие правила: "Вы должны закончить работу правильно, прежде чем играть." Используйте контрольный список, чтобы они знали, что значит "закончено". После недели это становится нормой. Большинство учителей говорят, что игра мотивирует медленных учеников, потому что они видят, как играют одноклассники.',
    },
    {
      q: 'Это безопасно? Есть ли чат или внешние ссылки?',
      a: 'Никакого чата, никаких личных сообщений, никаких внешних ссылок. Это просто словесная игра. Ученики видят имена и баллы других игроков в таблице лидеров, но больше ничего. Личная информация не делится.',
    },
    {
      q: 'Как насчёт экранного времени?',
      a: 'Каждый раунд 2–4 минуты. Если ученик закончил на 10 минут раньше, он играет один раунд, а не шесть. Игра остановит его, когда время закончится. Это короче, чем видео для перерыва.',
    },
    {
      q: 'Нужно ли я учить их, как играть?',
      a: '2-минутная демонстрация для всего класса. Покажи сетку, укажи на слово, дай им найти одно. Этого достаточно. Они учатся в процессе игры. Никакого туториала.',
    },
    {
      q: 'Что если у меня нет устройств в классе?',
      a: 'Вам нужно хотя бы одно устройство (телефон или планшет), которым ученики могут делиться. Многие классы имеют набор Chromebook или общий iPad. LexiClash работает на всех.',
    },
    {
      q: 'Могу ли я использовать один и тот же код весь год?',
      a: 'Да, один и тот же код весь год. Ученикам не нужно его запоминать—вы пишете его на доске один раз, и он остаётся там. Они используют его каждый раз, когда закончат раньше.',
    },
    {
      q: 'Смогу ли я увидеть, во что они играли?',
      a: 'Да. Ваша панель учителя показывает баллы, какие слова они нашли и какие пропустили. Используйте это для выбора лексики на следующую неделю.',
    },
    {
      q: 'Что если ученики, закончившие раньше, просто отвлекают, а не учебный пробел?',
      a: 'Дайте им более сложные слова или установите более высокий показатель баллов. LexiClash адаптируется к разным уровням. Или чередуйте: некоторые играют, другие читают, третьи занимаются математикой. Игра—одна из станций в вашей системе.',
    },
  ],
  labels: {
    faqTitle: 'Вопросы об учениках, закончивших раньше',
    relatedTitle: 'Ещё идеи для обучения',
  },
  related: [
    { href: '/education/brain-breaks-word-games', label: 'Переменки со словесными играми', accent: 'lime' },
    { href: '/education/vocabulary-games-classroom', label: 'Словесные игры для лексики', accent: 'cyan' },
    { href: '/education/spelling-bee-practice', label: 'Игры на правописание', accent: 'purple' },
    { href: '/education/middle-school-word-games', label: 'Словесные игры для средних классов', accent: 'pink' },
    { href: '/education', label: 'Все ресурсы', accent: 'pink' },
  ],
  breadcrumb: {
    home: 'Главная',
    hub: 'Учебные ресурсы',
    current: 'Занятия для учеников, закончивших раньше',
  },
  learning: {
    educationalUse: ['Classroom Activity'],
    educationalLevel: ['Primary', 'Secondary'],
    typicalAgeRange: '7-16',
    teaches: 'Закрепление лексики, узнавание слов, самостоятельное обучение',
    timeRequired: 'PT10M',
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

export function getEarlyFinishersContent(locale: string): EducationLandingContent {
  return MAP[locale] ?? EN;
}
