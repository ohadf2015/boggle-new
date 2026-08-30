import type { EducationLandingContent } from '@/lib/seo/educationLanding';

const EN: EducationLandingContent = {
  accent: 'lime',
  meta: {
    title: 'Brain Breaks for the Classroom | LexiClash',
    description:
      'Fast word games to reset focus in 1–5 minutes. No prep, works on any screen, whole class at once. Keep learning after sitting.',
    keywords: [
      'brain breaks for classroom',
      'quick brain break activities',
      'brain breaks for middle school',
      '2 minute brain breaks',
      'no prep brain breaks',
      'word game activities',
      'classroom energy activities',
      'attention reset games',
    ],
  },
  hero: {
    facts: ['1–5 minute games', 'No prep needed', 'Works on any device', 'Whole class plays together'],
    h1: { part1: 'Reset focus in', highlight: '2 minutes', part2: 'with live word games' },
    subtitle:
      'Your class has been sitting for 40 minutes and stopped listening. Brain breaks bring focus back without losing control of the room.',
    primaryCta: { label: 'Start a class game', href: '/education/classroom-game' },
    secondaryCta: { label: 'How it works', href: '/education' },
  },
  answer: {
    question: 'How do you do a brain break in class?',
    answer:
      'A brain break is a 1–5 minute activity that resets student focus mid-lesson. LexiClash runs live word-search and word-puzzle games on any projector or shared screen—students play simultaneously on their phones. No setup, no materials, no prep. It works because it demands just enough attention to interrupt restlessness without derailing the lesson.',
  },
  sections: [
    {
      kind: 'table',
      title: 'Pick your brain break by time and energy level',
      intro:
        'Match the game to how much time you have and how wound up your class is. All games run live on any device.',
      columns: ['Minutes', 'Class energy', 'What to run', 'Why it works'],
      rows: [
        [
          '1–2',
          'Calm / slightly fidgety',
          'Word Wheel solo hunt',
          'Low pressure. Students find words on a spinning wheel one at a time. No scoreboard stress.',
        ],
        [
          '1–2',
          'Bouncing off walls',
          'Quick multiplayer face-off',
          'Competitive outlet. One live round, winner projected on screen. They burn energy chasing a visible goal.',
        ],
        [
          '2–3',
          'Calm',
          'Boggle-style board hunt',
          'Meditative pace. Silent solo hunt on a letter grid. Shouting only at the end when you call out longest words.',
        ],
        [
          '2–3',
          'Restless',
          'Connections (grouping puzzle)',
          'Puzzle-solving focus. Four groups of words to sort by category. Quiet thinking, then group voting.',
        ],
        [
          '3–5',
          'Bouncing',
          'Live multiplayer tournament',
          'Sustained energy. Multiple rounds, leaderboard on screen. Clean start → play → scoreboard → back to lesson.',
        ],
        [
          '3–5',
          'Calm / mixed',
          'Word Hunt with hints disabled',
          'Scaffolded challenge. Teacher can reveal clues per word. Gives you control of pacing while students stay engaged.',
        ],
      ],
    },
    {
      kind: 'steps',
      title: 'A real 3-minute brain break, minute by minute',
      intro: 'Here\'s a complete example. Adapt times based on your class size.',
      items: [
        {
          step: '0:00–0:20',
          focus: 'Set up',
          activity:
            'Project the LexiClash board on your screen or smartboard. Students grab their phones (they already have them—you are not creating a distraction). Say: "You have 20 seconds to create or join a class. Code is on the screen."',
        },
        {
          step: '0:20–1:30',
          focus: 'Solo hunt (silent)',
          activity:
            'All students play a 70-second Word Hunt. They search silently for words on the letter grid. No talking. Just finding.',
        },
        {
          step: '1:30–2:00',
          focus: 'Call-out round',
          activity:
            'Stop the game. "Call out your longest word." Students shout answers. You or a student reads them aloud. Laughter happens.',
        },
        {
          step: '2:00–2:30',
          focus: 'Tally and close',
          activity:
            'Quick leaderboard on the screen (highest score, most words, fastest finder). Celebrate the top 3. Say: "Back to page 42." Students put phones away.',
        },
        {
          step: '2:30–3:00',
          focus: 'Lesson restart',
          activity:
            'Re-engage the lesson. Energy is reset. Attention is back. You have just spent 3 minutes and gained 20 minutes of renewed focus.',
        },
      ],
    },
    {
      kind: 'features',
      title: 'Why word games beat silent sitting',
      items: [
        {
          icon: 'zap',
          text: 'Instant restart: No setup, no worksheets. One screen, one code, start playing in 30 seconds.',
        },
        {
          icon: 'users',
          text: 'Whole class at once: Everyone plays the same game simultaneously. No grouping, no splitting attention.',
        },
        {
          icon: 'monitor',
          text: 'Public scoreboard: Seeing results on screen (even losers) makes it feel like an event, not filler.',
        },
        {
          icon: 'timer',
          text: 'Bounded duration: Set a clear end time. Students know when it stops, so it never bleeds into lesson time.',
        },
        {
          icon: 'list',
          text: 'No prep: No printing, no cutting, no finding the timer. Work with what students already have.',
        },
        {
          icon: 'globe',
          text: 'Works offline-first: Games run on any internet. No downloads, no logins, no friction.',
        },
      ],
    },
    {
      kind: 'cards',
      title: 'When to use a brain break',
      intro: 'Real moments when teachers use them:',
      items: [
        {
          tag: 'Mid-lesson',
          title: '40 minutes into a lesson',
          desc: 'Students have stopped absorbing. Their eyes glaze over. A 2-minute break brings focus back for the final 10 minutes.',
        },
        {
          tag: 'After test',
          title: 'Right after a test or quiz',
          desc: 'Students are drained. A competitive game resets mood and energy before the next activity.',
        },
        {
          tag: 'Transition',
          title: 'Between subjects',
          desc: 'Moving from math to writing? A word game is a palate cleanser. Clears mental cache.',
        },
        {
          tag: 'Behavior',
          title: 'When the room gets loud',
          desc: 'Students fidgeting, talking out of turn. A focused game gives them a sanctioned outlet and structure.',
        },
        {
          tag: 'Monday morning',
          title: 'Start of the day or week',
          desc: 'Set the tone. A quick fun game builds classroom culture and gets everyone participating from minute one.',
        },
        {
          tag: 'Celebration',
          title: 'After completing a hard unit',
          desc: 'You finished the chapter. Play one round as celebration. It feels like a reward, not a filler.',
        },
      ],
    },
  ],
  faqs: [
    {
      q: 'How do I give students a join code?',
      a: 'When you start a class game on LexiClash, a code appears on your screen. Say the code aloud, or display it on the board. Students type or scan it on their phones. They join in 10 seconds. No login, no email, no barriers.',
    },
    {
      q: 'What if some students don\'t have a phone?',
      a: 'They can pair with a neighbor, or you can run a round as a team game (one phone per group). Or save single-device games for when all devices are present. Brain breaks are flexible—no rule says it must be whole-class.',
    },
    {
      q: 'Do I need to teach them how to play?',
      a: 'No. Game rules are on-screen. For the first round, walk through one example: "Find any word on the grid. Tap it. It scores points." Done. Most students understand in 30 seconds.',
    },
    {
      q: 'Can I use a brain break if I teach a language other than English?',
      a: 'LexiClash supports six languages: English, Hebrew, Spanish, Swedish, Japanese, and Russian. Set your class language in the dashboard, and games use words in that language. You can also upload custom word lists in any subject.',
    },
    {
      q: 'How long should a brain break be?',
      a: '1–5 minutes works. Shorter is often better. A 2-minute game is enough to reset focus and can fit between any two activities. Longer (3–5 min) is better if students are very wound up and need sustained outlet.',
    },
    {
      q: 'Will this distract students from the lesson?',
      a: 'Only if you make it indefinite. Set a clear end time before you start: "We play for 3 minutes, then phones away." When students know the boundary, they re-engage more easily. Brain breaks reset focus; they don\'t derail it if you control the clock.',
    },
    {
      q: 'Can I use the same game twice in one week?',
      a: 'Yes. Repetition is fine—students often like playing the same game again to beat their own score. You can also upload a custom word list once and reuse it all week.',
    },
    {
      q: 'What games are best for brain breaks?',
      a: 'Word Hunt (silent letter search), Word Wheel (spinning word finder), and quick Multiplayer rounds (1–2 min) work best. Avoid long tournaments or complex modes that need explanation. Stick to games students can jump into in 10 seconds.',
    },
  ],
  labels: { faqTitle: 'Questions teachers ask', relatedTitle: 'Related topics' },
  related: [
    { href: '/education/games-for-teachers', label: 'Games for teachers to run', accent: 'purple' },
    { href: '/education/indoor-recess-games', label: 'Indoor recess games', accent: 'cyan' },
    { href: '/education/early-finishers-activities', label: 'Activities for early finishers', accent: 'lime' },
    { href: '/education/first-day-of-school-icebreakers', label: 'First-day icebreakers', accent: 'purple' },
    { href: '/education', label: 'Education home', accent: 'pink' },
  ],
  breadcrumb: { home: 'Home', hub: 'Education', current: 'Brain breaks for classrooms' },
  learning: {
    educationalUse: ['Classroom Activity'],
    educationalLevel: ['Primary', 'Secondary'],
    typicalAgeRange: '6-14',
    teaches: 'vocabulary, word recognition, attention reset',
    timeRequired: 'PT3M',
  },
};

const HE: EducationLandingContent = {
  accent: 'lime',
  meta: {
    title: 'הפסקות מוח בכיתה | משחקי מילים חינמיים',
    description:
      'משחקים מהירים לאחזור קשב בתוך 1–5 דקות. ללא הכנה, כל המכשירים, כיתה שלמה. כשהתלמידים הפסיקו להקשיב.',
    keywords: [
      'הפסקות מוח בכיתה',
      'פעילויות הפסקה מהירות',
      'משחקי מילים לכיתה',
      'הפסקה חד־דקתית',
      'משחקים בלי הכנה',
      'קשב תלמידים',
      'פעילויות אנרגיה',
      'משחקים לכיתה',
    ],
  },
  hero: {
    facts: ['1–5 דקות', 'ללא הכנה', 'כל מכשיר', 'כיתה שלמה'],
    h1: { part1: 'אחזור קשב בעוד', highlight: 'דקתיים', part2: 'עם משחקי מילים חיים' },
    subtitle:
      'כיתתך יושבת 40 דקות. אף אחד לא מקשיב. הפסקת קשב מחזירה את הקשב חזרה בלי לאבד שליטה בכיתה.',
    primaryCta: { label: 'התחל משחק כיתתי', href: '/education/classroom-game' },
    secondaryCta: { label: 'איך זה עובד', href: '/education' },
  },
  answer: {
    question: 'איך עושים הפסקת קשב בכיתה?',
    answer:
      'הפסקת קשב היא פעילות של 1–5 דקות שמחזירה קשב. LexiClash מריץ משחקי חיפוש מילים חיים על כל מקרן או מסך משותף—כל התלמידים משחקים בו־זמנית בטלפון. בלי הכנה, בלי חומרים. זה עובד כי זה דורש מספיק קשב כדי להפסיק חוסר שקט בלי להפיל את השיעור.',
  },
  sections: [
    {
      kind: 'table',
      title: 'בחר הפסקת קשב לפי זמן וחוזק',
      intro: 'התאם את המשחק לזמן שיש לך ולכמה התלמידים "מטורללים". כל המשחקים רצים חיים בכל מכשיר.',
      columns: ['דקות', 'אנרגיה של הכיתה', 'מה להפעיל', 'למה זה עובד'],
      rows: [
        [
          '1–2',
          'רגוע / קצת חוסר שקט',
          'חיפוש גלגל מילים סולו',
          'ללא לחץ. תלמידים מוצאים מילים על גלגל מסתובב. אין טבלת קולות.',
        ],
        [
          '1–2',
          'בדם רותח',
          'דו־קרב מולטיפליירר מהיר',
          'מוצא תחרותי. סיבוב אחד חי. המנצח מוקרן. הם שורפים אנרגיה אחרי מטרה.',
        ],
        [
          '2–3',
          'רגוע',
          'חיפוש לוח Boggle',
          'קצב מדיטטיבי. חיפוש שקט סולו על רשת אותיות. צעקות רק בסוף.',
        ],
        [
          '2–3',
          'חוסר שקט',
          'משחק קבוצות מילים',
          'מיקוד פזל. ארבע קבוצות מילים. חשיבה שקטה, אחר כך הצבעה.',
        ],
        [
          '3–5',
          'בדם רותח',
          'טורניר מולטיפליירר חי',
          'אנרגיה מתמשכת. סיבובים מרובים. טבלת קולות על המסך. חזרה לשיעור.',
        ],
        [
          '3–5',
          'רגוע / מעורבב',
          'חיפוש מילים עם רמזים',
          'אתה שולט בקצב. הגד רמזים לכל מילה. התלמידים נשארים מעורבים.',
        ],
      ],
    },
    {
      kind: 'steps',
      title: 'הפסקת קשב אמיתית בן 3 דקות',
      intro: 'דוגמה מלאה. התאם את הזמנים לגודל הכיתה שלך.',
      items: [
        {
          step: '0:00–0:20',
          focus: 'הכנה',
          activity:
            'הקרן את לוח LexiClash. התלמידים לוקחים טלפונים. אומר: "בעוד 20 שניות בואו להכנס. הקוד על הלוח."',
        },
        {
          step: '0:20–1:30',
          focus: 'חיפוש שקט',
          activity:
            'כל התלמידים משחקים 70 שניות של חיפוש מילים. הם חיפשים בשקט. רק מוצאים.',
        },
        {
          step: '1:30–2:00',
          focus: 'סיבוב צעקות',
          activity:
            'עצור המשחק. "צעקו את המילה הארוכה ביותר." התלמידים צועקים. אתה קורא בחוץ. צחוק מתרחש.',
        },
        {
          step: '2:00–2:30',
          focus: 'ספירה וסגירה',
          activity:
            'טבלת קולות מהירה על המסך. חגוג את 3 הראשונים. "חזרה לעמוד 42." הטלפונים ניכנסים.',
        },
        {
          step: '2:30–3:00',
          focus: 'חזרה לשיעור',
          activity:
            'חזור לשיעור. הקשב חוזר. בדיוק בילית 3 דקות וקיבלת 20 דקות של קשב חדש.',
        },
      ],
    },
    {
      kind: 'features',
      title: 'למה משחקי מילים עובדים יותר טוב',
      items: [
        {
          icon: 'zap',
          text: 'התחלה מיידית: אין הכנה. מסך אחד, קוד אחד, התחלה בעוד 30 שניות.',
        },
        {
          icon: 'users',
          text: 'כיתה שלמה: כולם משחקים בו־זמנית. אין חלוקה, אין שיתוק תשומת לב.',
        },
        {
          icon: 'monitor',
          text: 'טבלת קולות פומית: ראיית תוצאות על המסך הופכת זה לאירוע.',
        },
        {
          icon: 'timer',
          text: 'משך מוגדר: התלמידים יודעים מתי הוא נגמר. אין דליפה לשיעור.',
        },
        {
          icon: 'list',
          text: 'ללא הכנה: אין הדפסה, אין עבודה, אין חיפוש טיימר.',
        },
        {
          icon: 'globe',
          text: 'אינטרנט בסיסי: כל התקן. אין הורדות, אין התחברות, אין סיבול.',
        },
      ],
    },
    {
      kind: 'cards',
      title: 'מתי להשתמש בהפסקת קשב',
      intro: 'רגעים אמיתיים של מורים:',
      items: [
        {
          tag: 'באמצע שיעור',
          title: '40 דקות לתוך שיעור',
          desc: 'התלמידים הפסיקו לקלוט. מבט ריק. הפסקה של דקתיים מחזירה קשב לעוד 10 דקות.',
        },
        {
          tag: 'אחרי בחינה',
          title: 'מיד אחרי מבחן',
          desc: 'התלמידים מיובשים. משחק תחרותי מחזיר הערה.',
        },
        {
          tag: 'מעבר',
          title: 'בין נושאים',
          desc: 'מעברים מחשבון לכתיבה? משחק מילים הוא שינוי קור רוח.',
        },
        {
          tag: 'התנהגות',
          title: 'כשהכיתה רועמת',
          desc: 'התלמידים רעדים, מדברים בחוץ סדר. משחק ממוקד נותן למוצא והסדר.',
        },
        {
          tag: 'שני בבוקר',
          title: 'התחלת יום או שבוע',
          desc: 'קבע טון. משחק מהיר בונה תרבות כיתה מדם ראשון.',
        },
        {
          tag: 'חגיגה',
          title: 'אחרי סיום יחידה קשה',
          desc: 'סיימתם פרק. משחק אחד ככל־כך. זה מרגיש כמו פרס.',
        },
      ],
    },
  ],
  faqs: [
    {
      q: 'איך אני נותן לתלמידים קוד כניסה?',
      a: 'כשאתה מתחיל משחק כיתתי, קוד מופיע על המסך שלך. אומר בקול או על הלוח. התלמידים מקלידים או סורקים בטלפון. הם נכנסים בעוד 10 שניות. אין התחברות.',
    },
    {
      q: 'מה אם לחלק מהתלמידים אין טלפון?',
      a: 'הם יכולים להזדווג עם שכן או לשחק כקבוצה (טלפון אחד לקבוצה). או שמור משחקים סולו ליום כשכולם בנוכחות. אין כלל שזה חייב להיות כיתה שלמה.',
    },
    {
      q: 'האם אני צריך ללמד אותם איך משחקים?',
      a: 'לא. כללים הם על המסך. בסיבוב הראשון, עוברים דוגמה. "מצא מילה כלשהי. לחץ עליה. זה מקבל נקודות." סיום. חצי דקה וכל אחד מבין.',
    },
    {
      q: 'אני מלמד שפה שונה. האם אני יכול להשתמש?',
      a: 'LexiClash תומך בשש שפות: אנגלית, עברית, ספרדית, שוודית, יפנית, רוסית. קבע את שפת הכיתה בתDashboard, והמשחקים משתמשים במילים בשפה זו. אתה יכול גם להעלות רשימות מילים מותאמות.',
    },
    {
      q: 'כמה זמן הפסקת קשב צריכה להיות?',
      a: '1–5 דקות. קצר הוא לרוב טוב יותר. משחק בן דקתיים מספיק כדי להחזיר קשב בין כל שתי פעילויות. יותר זמן (3–5) אם התלמידים מאוד "מטורללים".',
    },
    {
      q: 'זה יפריע לשיעור?',
      a: 'רק אם אתה לא שם גבול. קבע זמן סיום בתחילה: "משחקים 3 דקות, אחר כך טלפונים ניכנסים." כשהתלמידים יודעים את הגבול, הם חוזרים בקלות. הפסקות מחזירות קשב — הן לא מפילות אותו.',
    },
    {
      q: 'האם אני יכול להשתמש באותו משחק פעמיים בשבוע?',
      a: 'כן. חזרה היא בסדר. התלמידים לרוב אוהבים לשחק שוב כדי לנצח את הציון שלהם. אתה יכול גם להעלות רשימת מילים מותאמת והשתמש בה כל שבוע.',
    },
    {
      q: 'מה משחקים הם הטובים ביותר להפסקה?',
      a: 'חיפוש מילים (רשת שקט), גלגל מילים (מחפש סיבוב), ודו־קרבות מהירים (1–2 דקות) עובדים הכי טוב. הימנע מטורנירים ארוכים. קח משחקים שהתלמידים יכולים להיכנס בעוד 10 שניות.',
    },
  ],
  labels: { faqTitle: 'שאלות שמורים שואלים', relatedTitle: 'נושאים קשורים' },
  related: [
    { href: '/education/games-for-teachers', label: 'משחקים למורים', accent: 'purple' },
    { href: '/education/indoor-recess-games', label: 'משחקי מקום סגור', accent: 'cyan' },
    { href: '/education/early-finishers-activities', label: 'פעילויות לסיימים ראשונים', accent: 'lime' },
    { href: '/education/first-day-of-school-icebreakers', label: 'שוברי קרח ליום הראשון', accent: 'purple' },
    { href: '/education', label: 'חינוך', accent: 'pink' },
  ],
  breadcrumb: { home: 'בית', hub: 'חינוך', current: 'הפסקות קשב' },
  learning: {
    educationalUse: ['Classroom Activity'],
    educationalLevel: ['Primary', 'Secondary'],
    typicalAgeRange: '6-14',
    teaches: 'vocabulary, word recognition, attention reset',
    timeRequired: 'PT3M',
  },
};

const ES: EducationLandingContent = {
  accent: 'lime',
  meta: {
    title: 'Pausas de concentración para aula | Juegos de palabras',
    description:
      'Juegos rápidos para recuperar la atención en 1–5 minutos. Sin preparación, funciona en cualquier dispositivo, toda la clase a la vez.',
    keywords: [
      'pausas de concentración para aula',
      'descansos cerebrales rápidos',
      'juegos de palabras para clase',
      'actividades de pausa de 2 minutos',
      'descansos sin preparación',
      'juegos educativos',
      'actividades para el aula',
      'dinámicas de clase',
    ],
  },
  hero: {
    facts: ['1–5 minutos', 'Sin preparación', 'Cualquier dispositivo', 'Todo el aula juntos'],
    h1: { part1: 'Recupera la atención en', highlight: '2 minutos', part2: 'con juegos de palabras en vivo' },
    subtitle:
      'Tu clase lleva sentada 40 minutos. Nadie está atendiendo. Una pausa recupera el enfoque sin perder control del aula.',
    primaryCta: { label: 'Iniciar un juego de aula', href: '/education/classroom-game' },
    secondaryCta: { label: 'Cómo funciona', href: '/education' },
  },
  answer: {
    question: '¿Cómo hacer una pausa de concentración en clase?',
    answer:
      'Una pausa de concentración es una actividad de 1–5 minutos que restaura el enfoque. LexiClash ejecuta juegos de búsqueda de palabras en vivo en cualquier proyector o pantalla compartida—todos los alumnos juegan simultáneamente en sus teléfonos. Sin preparación, sin materiales. Funciona porque requiere suficiente atención para interrumpir la inquietud sin descarrilar la lección.',
  },
  sections: [
    {
      kind: 'table',
      title: 'Elige una pausa según el tiempo y la energía',
      intro: 'Adapta el juego al tiempo que tengas y a cuán inquietos están. Todos los juegos funcionan en vivo en cualquier dispositivo.',
      columns: ['Minutos', 'Energía del aula', 'Qué jugar', 'Por qué funciona'],
      rows: [
        [
          '1–2',
          'Tranquilo / inquieto',
          'Búsqueda de rueda de palabras',
          'Sin presión. Los alumnos encuentran palabras en una rueda giratoria. Sin tabla de puntuaciones.',
        ],
        [
          '1–2',
          'Muy inquieto',
          'Duelo multijugador rápido',
          'Salida competitiva. Un duelo en vivo. El ganador en la pantalla. Queman energía persiguiendo una meta visible.',
        ],
        [
          '2–3',
          'Tranquilo',
          'Búsqueda de tablero tipo Boggle',
          'Ritmo meditativo. Búsqueda silenciosa en una cuadrícula de letras. Solo gritos al final.',
        ],
        [
          '2–3',
          'Inquieto',
          'Juego de conexiones (grupos)',
          'Pensamiento enfocado. Cuatro grupos de palabras para clasificar. Pensamiento silencioso, luego votación.',
        ],
        [
          '3–5',
          'Muy inquieto',
          'Torneo multijugador en vivo',
          'Energía sostenida. Múltiples rondas. Tabla de puntuaciones en la pantalla. Regreso a la lección.',
        ],
        [
          '3–5',
          'Tranquilo / mixto',
          'Búsqueda de palabras con pistas',
          'Tú controlas el ritmo. Revela pistas por palabra. Los alumnos se mantienen comprometidos.',
        ],
      ],
    },
    {
      kind: 'steps',
      title: 'Una pausa de concentración real de 3 minutos',
      intro: 'Un ejemplo completo. Adapta los tiempos al tamaño de tu aula.',
      items: [
        {
          step: '0:00–0:20',
          focus: 'Preparación',
          activity:
            'Proyecta el tablero de LexiClash. Los alumnos toman sus teléfonos. Di: "En 20 segundos, únete a la clase. El código está en la pantalla."',
        },
        {
          step: '0:20–1:30',
          focus: 'Búsqueda silenciosa',
          activity:
            'Todos juegan 70 segundos de búsqueda de palabras. Buscan en silencio. Solo encuentran.',
        },
        {
          step: '1:30–2:00',
          focus: 'Ronda de gritos',
          activity:
            'Detén el juego. "¡Diga su palabra más larga!" Los alumnos gritan respuestas. Tú lees en voz alta. Risa.',
        },
        {
          step: '2:00–2:30',
          focus: 'Tabla y cierre',
          activity:
            'Tabla de puntuaciones rápida en pantalla. Celebra los 3 primeros. "Vuelta a la página 42." Teléfonos guardados.',
        },
        {
          step: '2:30–3:00',
          focus: 'Regreso a la lección',
          activity:
            'Vuelve a la lección. El enfoque regresa. Gastaste 3 minutos y ganaste 20 minutos de atención restaurada.',
        },
      ],
    },
    {
      kind: 'features',
      title: 'Por qué los juegos de palabras funcionan mejor',
      items: [
        {
          icon: 'zap',
          text: 'Inicio instantáneo: Sin preparación. Una pantalla, un código, comienza en 30 segundos.',
        },
        {
          icon: 'users',
          text: 'Todo el aula a la vez: Todos juegan simultáneamente. Sin división, sin distracción.',
        },
        {
          icon: 'monitor',
          text: 'Tabla de puntuaciones pública: Ver resultados en la pantalla lo hace sentir como un evento.',
        },
        {
          icon: 'timer',
          text: 'Duración acotada: Los alumnos saben cuándo termina. Sin derrames hacia la lección.',
        },
        {
          icon: 'list',
          text: 'Sin preparación: Sin impresiones, sin cortes, sin buscar el temporizador.',
        },
        {
          icon: 'globe',
          text: 'Funciona en internet básico: Cualquier dispositivo. Sin descargas, sin inicios de sesión.',
        },
      ],
    },
    {
      kind: 'cards',
      title: 'Cuándo usar una pausa de concentración',
      intro: 'Momentos reales en que los docentes las usan:',
      items: [
        {
          tag: 'A mitad de clase',
          title: '40 minutos dentro de una lección',
          desc: 'Los alumnos han dejado de absorber. La pausa trae el enfoque de vuelta para los últimos 10 minutos.',
        },
        {
          tag: 'Después de prueba',
          title: 'Justo después de una evaluación',
          desc: 'Los alumnos están agotados. Un juego competitivo reinicia el ánimo.',
        },
        {
          tag: 'Transición',
          title: 'Entre asignaturas',
          desc: '¿Pasas de matemática a escritura? Un juego de palabras limpia la mente.',
        },
        {
          tag: 'Comportamiento',
          title: 'Cuando el aula se pone inquieta',
          desc: 'Alumnos moviéndose, hablando fuera de turno. Un juego enfocado canaliza esa energía.',
        },
        {
          tag: 'Lunes por la mañana',
          title: 'Inicio del día o semana',
          desc: 'Establece el tono. Un juego rápido construye cultura de aula y participación.',
        },
        {
          tag: 'Celebración',
          title: 'Después de completar una unidad difícil',
          desc: 'Terminaste el capítulo. Una ronda como celebración. Siente como una recompensa.',
        },
      ],
    },
  ],
  faqs: [
    {
      q: '¿Cómo doy un código de acceso a los alumnos?',
      a: 'Cuando inicias un juego de aula, aparece un código en tu pantalla. Dilo en voz alta o muéstralo en la pizarra. Los alumnos lo escriben o lo escanean. Se unen en 10 segundos. Sin inicio de sesión.',
    },
    {
      q: '¿Qué pasa si algunos alumnos no tienen teléfono?',
      a: 'Pueden compartir con un compañero o jugar como equipo. O guarda juegos individuales para cuando todos tengan dispositivos. Las pausas son flexibles.',
    },
    {
      q: '¿Necesito enseñarles a jugar?',
      a: 'No. Las reglas están en la pantalla. En la primera ronda, camina a través de un ejemplo rápido. La mayoría entiende en 30 segundos.',
    },
    {
      q: '¿Puedo usar esto si enseño otro idioma?',
      a: 'LexiClash soporta seis idiomas: inglés, hebreo, español, sueco, japonés y ruso. Establece el idioma de tu aula y los juegos usan palabras en ese idioma. También puedes cargar listas de palabras personalizadas.',
    },
    {
      q: '¿Cuánto debe durar una pausa de concentración?',
      a: '1–5 minutos. Más corta es a menudo mejor. Un juego de 2 minutos es suficiente entre actividades. Más tiempo si los alumnos están muy inquietos.',
    },
    {
      q: '¿Esto distraerá a los alumnos de la lección?',
      a: 'Solo si no estableces un límite claro. Di desde el inicio: "Jugamos 3 minutos, luego teléfonos adentro." Cuando conocen el límite, se re-enfocan más fácilmente.',
    },
    {
      q: '¿Puedo usar el mismo juego dos veces en una semana?',
      a: 'Sí. La repetición está bien. Los alumnos a menudo disfrutan volver a jugar para vencer su puntuación anterior.',
    },
    {
      q: '¿Qué juegos son mejores para pausas?',
      a: 'Búsqueda de palabras (búsqueda silenciosa), rueda de palabras (rotación), duelos rápidos (1–2 min). Evita torneos largos. Elige juegos en los que puedan entrar en 10 segundos.',
    },
  ],
  labels: { faqTitle: 'Preguntas que hacen los docentes', relatedTitle: 'Temas relacionados' },
  related: [
    { href: '/education/games-for-teachers', label: 'Juegos para docentes', accent: 'purple' },
    { href: '/education/indoor-recess-games', label: 'Juegos para recreo cubierto', accent: 'cyan' },
    { href: '/education/early-finishers-activities', label: 'Actividades para los que terminan primero', accent: 'lime' },
    { href: '/education/first-day-of-school-icebreakers', label: 'Rompehielos para el primer día', accent: 'purple' },
    { href: '/education', label: 'Centro educativo', accent: 'pink' },
  ],
  breadcrumb: { home: 'Inicio', hub: 'Educación', current: 'Pausas de concentración' },
  learning: {
    educationalUse: ['Classroom Activity'],
    educationalLevel: ['Primary', 'Secondary'],
    typicalAgeRange: '6-14',
    teaches: 'vocabulary, word recognition, attention reset',
    timeRequired: 'PT3M',
  },
};

const SV: EducationLandingContent = {
  accent: 'lime',
  meta: {
    title: 'Pausning för fokus i klassrummet | Ordspel online',
    description:
      'Snabba ordspel för att återställa fokus på 1–5 minuter. Ingen förberedelse, fungerar på alla enheter, hela klassen tillsammans.',
    keywords: [
      'pausning för fokus',
      'klassrumsaktiviteter',
      'ordspel för skolan',
      ' snabba pausningar',
      'klassrumsenergi',
      'återhämtning av uppmärksamhet',
      'spelbaserade aktiviteter',
      'undervisningsmetoder',
    ],
  },
  hero: {
    facts: ['1–5 minuter', 'Ingen förberedelse', 'Alla enheter', 'Hela klassen'],
    h1: { part1: 'Återställ fokus på', highlight: '2 minuter', part2: 'med direktsända ordspel' },
    subtitle:
      'Din klass har suttit i 40 minuter och slutat lyssna. En hjärnpaus återställer uppmärksamheten utan att förlora kontrollen.',
    primaryCta: { label: 'Starta ett klassrum spel', href: '/education/classroom-game' },
    secondaryCta: { label: 'Hur det fungerar', href: '/education' },
  },
  answer: {
    question: 'Hur gör man en hjärnpaus i klassrummet?',
    answer:
      'En hjärnpaus är en 1–5 minuters aktivitet som återställer uppmärksamheten. LexiClash kör direktsända ordsökningsspel på vilken projektor eller delad skärm som helst—alla elever spelar samtidigt på sina telefoner. Ingen förberedelse, inga material. Det fungerar för att det kräver tillräckligt fokus för att avbryta rastlöshet utan att ta klassrummet ur kontroll.',
  },
  sections: [
    {
      kind: 'table',
      title: 'Välj pausning efter tid och energinivå',
      intro: 'Matcha spelet till den tid du har och hur rastlös klassen är. Alla spel körs direkt på vilken enhet som helst.',
      columns: ['Minuter', 'Klassens energi', 'Vad man spelar', 'Varför det fungerar'],
      rows: [
        [
          '1–2',
          'Lugn / lite rastlös',
          'Ordhjul solo-sök',
          'Lågt tryck. Elever hittar ord på ett snurrande hjul. Ingen poängtabell stress.',
        ],
        [
          '1–2',
          'Mycket rastlös',
          'Snabbt flerspelar duel',
          'Konkurrens outlet. En direktsänd omgång. Vinnaren projicerad. De bränner energi.',
        ],
        [
          '2–3',
          'Lugn',
          'Boggle stil bord-sök',
          'Meditativt tempo. Tyst solo-sökning. Skrik bara på slutet.',
        ],
        [
          '2–3',
          'Rastlös',
          'Ordgrupper-pussel',
          'Fokuserat pussel. Fyra grupper att sortera. Tyst tänkande, sedan röstning.',
        ],
        [
          '3–5',
          'Mycket rastlös',
          'Direktsänd flerspelar turnering',
          'Uthållig energi. Flera omgångar. Poängtabell på skärm. Tillbaka till lektion.',
        ],
        [
          '3–5',
          'Lugn / blandad',
          'Ordsökning med ledtrådar',
          'Du kontrollerar takten. Ge ledtrådar för varje ord. Eleverna förblir engagerade.',
        ],
      ],
    },
    {
      kind: 'steps',
      title: 'En riktig 3-minuters pausning, minut för minut',
      intro: 'Ett komplett exempel. Anpassa tiderna efter klasstorleken.',
      items: [
        {
          step: '0:00–0:20',
          focus: 'Förbereda',
          activity:
            'Projicera LexiClash-spelbrädet. Eleverna tar sina telefoner. Säg: "Om 20 sekunder, gå med i klassen. Koden är på skärmen."',
        },
        {
          step: '0:20–1:30',
          focus: 'Tyst sökning',
          activity:
            'Alla spelar 70 sekunder ordsökning. De söker tyst. Bara hittar.',
        },
        {
          step: '1:30–2:00',
          focus: 'Utropningsomgång',
          activity:
            'Stoppa spelet. "Ropa ut ditt längsta ord." Eleverna skriker. Du läser högt. Skratt.',
        },
        {
          step: '2:00–2:30',
          focus: 'Poängtabell och avslut',
          activity:
            'Snabb poängtabell på skärmen. Fira de tre bästa. "Tillbaka till sida 42." Telefonerna in.',
        },
        {
          step: '2:30–3:00',
          focus: 'Tillbaka till lektion',
          activity:
            'Återgå till lektionen. Fokus är tillbaka. Du har spenderat 3 minuter och vunnit 20 minuter av återställd uppmärksamhet.',
        },
      ],
    },
    {
      kind: 'features',
      title: 'Varför ordspel fungerar bättre',
      items: [
        {
          icon: 'zap',
          text: 'Omedelbar start: Ingen förberedelse. En skärm, en kod, börja på 30 sekunder.',
        },
        {
          icon: 'users',
          text: 'Hela klassen samtidigt: Alla spelar samtidigt. Ingen uppdelning, ingen distraktion.',
        },
        {
          icon: 'monitor',
          text: 'Offentlig poängtabell: Att se resultat på skärmen gör det till en händelse.',
        },
        {
          icon: 'timer',
          text: 'Begränsad varaktighet: Eleverna vet när det slutar. Ingen läckning in i lektionen.',
        },
        {
          icon: 'list',
          text: 'Ingen förberedelse: Ingen utskrift, inget klippande, inget söka timer.',
        },
        {
          icon: 'globe',
          text: 'Fungerar på grundläggande internet: Vilken enhet som helst. Inga nedladdningar, ingen inloggning.',
        },
      ],
    },
    {
      kind: 'cards',
      title: 'När man använder en hjärnpaus',
      intro: 'Verkliga ögonblick när lärare använder dem:',
      items: [
        {
          tag: 'Mitt i lektion',
          title: '40 minuter in i en lektion',
          desc: 'Eleverna har slutat ta upp information. En 2-minuters paus för tillbaka fokus för de sista 10 minuterna.',
        },
        {
          tag: 'Efter prov',
          title: 'Direkt efter ett prov',
          desc: 'Eleverna är uttömda. Ett konkurrensbaserat spel återställer humör och energi.',
        },
        {
          tag: 'Övergång',
          title: 'Mellan ämnen',
          desc: 'Skiftar från matematik till skrivning? Ett ordspel är en tankebortledare.',
        },
        {
          tag: 'Beteende',
          title: 'När klassrummet blir rastlöst',
          desc: 'Elever pirrar, talar ut ur tur. Ett fokuserat spel kanaliserar energin.',
        },
        {
          tag: 'Måndag morgon',
          title: 'Start på dag eller vecka',
          desc: 'Sätt tonen. Ett snabbt kul spel bygger klassrummet kultur och deltagande.',
        },
        {
          tag: 'Firande',
          title: 'Efter att ha slutfört en svår enhet',
          desc: 'Du är färdig med kapitlet. En omgång som firande. Det känns som en belöning.',
        },
      ],
    },
  ],
  faqs: [
    {
      q: 'Hur ger jag eleverna en klassrumskod?',
      a: 'När du startar ett klassrumsspel, visas en kod på din skärm. Säg den högt eller visa den på tavlan. Eleverna skriver eller skannar in den på sin telefon. De går med på 10 sekunder. Ingen inloggning.',
    },
    {
      q: 'Vad händer om vissa elever inte har en telefon?',
      a: 'De kan para ihop sig med en klasskamrat eller spela som lag. Eller spara enspelar-spel till när alla enheter är närvarande. Pausningar är flexibla.',
    },
    {
      q: 'Måste jag lära dem hur man spelar?',
      a: 'Nej. Reglerna är på skärmen. Vid första omgången, gå igenom ett snabbt exempel. De flesta förstår på 30 sekunder.',
    },
    {
      q: 'Kan jag använda detta om jag undervisar ett annat språk?',
      a: 'LexiClash stöder sex språk: engelska, hebreiska, spanska, svenska, japanska och ryska. Ställ in ditt klassrumsspråk och spelen använder ord på det språket. Du kan också ladda upp anpassade ordlistor.',
    },
    {
      q: 'Hur lång ska en hjärnpaus vara?',
      a: '1–5 minuter. Kortare är ofta bättre. Ett 2-minuters spel räcker mellan aktiviteter. Längre (3–5) om eleverna är mycket rastlösa.',
    },
    {
      q: 'Kommer detta att distraera eleverna från lektionen?',
      a: 'Bara om du inte sätter en tydlig gräns. Säg från början: "Vi spelar i 3 minuter, sedan telefoner in." När eleverna vet gränsen, fokuserar de om mer lätt.',
    },
    {
      q: 'Kan jag använda samma spel två gånger på en vecka?',
      a: 'Ja. Upprepning är okej. Eleverna tycker ofta om att spela igen för att slå sitt eget poäng.',
    },
    {
      q: 'Vilka spel är bäst för pausningar?',
      a: 'Ordsökning (tyst grill-sökning), ordhjul (snurrande) och snabba dueler (1–2 min) fungerar bäst. Undvik långa turneringar. Välj spel som eleverna kan hoppa in i på 10 sekunder.',
    },
  ],
  labels: { faqTitle: 'Frågor som lärare ställer', relatedTitle: 'Relaterade ämnen' },
  related: [
    { href: '/education/games-for-teachers', label: 'Spel för lärare', accent: 'purple' },
    { href: '/education/indoor-recess-games', label: 'Spel för inomhusrast', accent: 'cyan' },
    { href: '/education/early-finishers-activities', label: 'Aktiviteter för snabba elever', accent: 'lime' },
    { href: '/education/first-day-of-school-icebreakers', label: 'Isbrytare första skoldagen', accent: 'purple' },
    { href: '/education', label: 'Utbildning', accent: 'pink' },
  ],
  breadcrumb: { home: 'Hem', hub: 'Utbildning', current: 'Hjärnpauser' },
  learning: {
    educationalUse: ['Classroom Activity'],
    educationalLevel: ['Primary', 'Secondary'],
    typicalAgeRange: '6-14',
    teaches: 'vocabulary, word recognition, attention reset',
    timeRequired: 'PT3M',
  },
};

const JA: EducationLandingContent = {
  accent: 'lime',
  meta: {
    title: '授業中の脳トレ休憩 | 無料オンライン単語ゲーム',
    description:
      '1～5分で集中力を取り戻す高速ゲーム。準備不要、すべてのデバイスで動作、クラス全体で一緒にプレイ。',
    keywords: [
      '授業中の脳トレ',
      '集中力回復',
      '単語ゲーム教室',
      'クラス活動',
      'オンラインゲーム',
      '教育的ゲーム',
      '短時間活動',
      '生徒のエンゲージメント',
    ],
  },
  hero: {
    facts: ['1～5分', '準備不要', 'すべてのデバイス', 'クラス全体'],
    h1: { part1: 'わずか', highlight: '2分', part2: 'で集中力を取り戻す' },
    subtitle:
      'クラスは40分座った。誰も聞いていない。脳トレ休憩はクラスのコントロールを失わずに集中力を復活させます。',
    primaryCta: { label: 'クラスゲームを始める', href: '/education/classroom-game' },
    secondaryCta: { label: 'その仕組み', href: '/education' },
  },
  answer: {
    question: 'クラスで脳トレ休憩をするにはどうしますか？',
    answer:
      '脳トレ休憩は1～5分の活動で、集中力を回復させます。LexiClashはどんなプロジェクターや共有画面でもライブの単語探しゲームを実行します—すべての生徒が同時に携帯電話でプレイします。準備も教材も不要です。落ち着きのなさを遮るのに十分な注意が必要だからです。',
  },
  sections: [
    {
      kind: 'table',
      title: '時間と生徒のエネルギーレベルで脳トレ休憩を選ぶ',
      intro: 'ゲームを時間と生徒の落ち着きのなさのレベルに合わせてください。すべてのゲームはすべてのデバイスでライブで実行されます。',
      columns: ['分', 'クラスのエネルギー', 'プレイするゲーム', '理由'],
      rows: [
        [
          '1～2',
          '落ち着いている / やや落ち着きがない',
          'ワードホイールの検索',
          'プレッシャーなし。回転する輪で単語を探します。スコアボードなし。',
        ],
        [
          '1～2',
          '非常に落ち着きがない',
          '高速マルチプレイヤー対戦',
          '競争の発散。1ラウンド。画面に勝者を表示。目標を追う。',
        ],
        [
          '2～3',
          '落ち着いている',
          'ボグル風文字盤探索',
          '瞑想的なペース。黙った一人用探索。最後だけ叫ぶ。',
        ],
        [
          '2～3',
          '落ち着きがない',
          'コネクションズ（単語グループ）',
          'パズル焦点。4つのグループに分類。静かに考えて投票。',
        ],
        [
          '3～5',
          '非常に落ち着きがない',
          'ライブマルチプレイヤートーナメント',
          '継続的なエネルギー。複数ラウンド。画面にランキング。授業に戻る。',
        ],
        [
          '3～5',
          '落ち着いている / 混合',
          'ヒント付き単語探し',
          'あなたがペースを制御。各単語のヒント。生徒が関与。',
        ],
      ],
    },
    {
      kind: 'steps',
      title: '本当の3分間の脳トレ休憩、分単位で',
      intro: '完全な例。クラスサイズに合わせて時間を調整してください。',
      items: [
        {
          step: '0:00～0:20',
          focus: '準備',
          activity:
            'LexiClashの盤面をプロジェクタに投影します。生徒は携帯電話を取ります。「20秒で参加してください。コードは画面に表示されます」と言います。',
        },
        {
          step: '0:20～1:30',
          focus: '黙った探索',
          activity:
            'すべての生徒が70秒の単語探しをプレイします。黙って探します。ただ見つけるだけ。',
        },
        {
          step: '1:30～2:00',
          focus: '叫び声のラウンド',
          activity:
            'ゲームを停止します。「最長の単語を叫んでください」。生徒が答えを叫びます。あなたが読み上げます。笑い声。',
        },
        {
          step: '2:00～2:30',
          focus: 'スコアボードと終了',
          activity:
            '画面に素早いランキングを表示。上位3人を祝う。「42ページに戻る」と言う。携帯電話をしまう。',
        },
        {
          step: '2:30～3:00',
          focus: '授業に戻る',
          activity:
            '授業に戻ります。集中力が戻りました。3分を使用して、20分の復元された注意力を獲得しました。',
        },
      ],
    },
    {
      kind: 'features',
      title: '単語ゲームが機能する理由',
      items: [
        {
          icon: 'zap',
          text: '即座に開始：準備不要。1つの画面、1つのコード、30秒で開始。',
        },
        {
          icon: 'users',
          text: '同時にクラス全体：すべてが同時にプレイ。分割なし。',
        },
        {
          icon: 'monitor',
          text: 'パブリックスコアボード：画面に結果が表示されるとイベントになります。',
        },
        {
          icon: 'timer',
          text: '制限された期間：生徒は終了時刻を知ります。授業への流出なし。',
        },
        {
          icon: 'list',
          text: '準備なし：印刷なし、カットなし、タイマーなし。',
        },
        {
          icon: 'globe',
          text: '基本的なインターネットで動作：すべてのデバイス。ダウンロード、ログインなし。',
        },
      ],
    },
    {
      kind: 'cards',
      title: '脳トレ休憩を使う時',
      intro: '教師が使う本当の瞬間：',
      items: [
        {
          tag: '授業中盤',
          title: '授業開始後40分',
          desc: '生徒は情報を受け入れるのをやめた。休憩はラスト10分間の集中力を回復させます。',
        },
        {
          tag: 'テスト後',
          title: 'テスト直後',
          desc: '生徒は疲れ果てている。競争的ゲームは気分とエネルギーをリセット。',
        },
        {
          tag: '科目間',
          title: '科目と科目の間',
          desc: '算数から作文に移動？単語ゲームはリセット。',
        },
        {
          tag: '行動',
          title: 'クラスが落ち着きなくなった時',
          desc: '生徒が動き、順番を無視。フォーカスゲームはエネルギーをチャネル。',
        },
        {
          tag: '月曜朝',
          title: '1日または1週間の開始',
          desc: 'トーンを設定。速いゲーム。文化構築と最初から参加。',
        },
        {
          tag: 'お祝い',
          title: '難しいユニット完了後',
          desc: 'チャプター終了。1ラウンド祝う。報酬のように感じます。',
        },
      ],
    },
  ],
  faqs: [
    {
      q: 'クラスコードを生徒にどのように与えますか？',
      a: 'クラスゲームを開始すると、コードが画面に表示されます。声に出すか、ボードに表示します。生徒が入力またはスキャンします。10秒で参加します。ログインなし。',
    },
    {
      q: '一部の生徒が携帯電話を持っていない場合はどうなりますか？',
      a: 'クラスメートと組んだり、チームでプレイしたりできます。またはすべてのデバイスが存在する時にシングルプレイゲームを保存します。柔軟です。',
    },
    {
      q: 'ゲームの方法を教える必要がありますか？',
      a: 'いいえ。ルールは画面にあります。最初のラウンドで、簡単な例を説明します。ほとんどの生徒は30秒で理解します。',
    },
    {
      q: '別の言語を教える場合は使用できますか？',
      a: 'LexiClashは6言語をサポート。英語、ヘブライ語、スペイン語、スウェーデン語、日本語、ロシア語。クラス言語を設定。ゲームはその言語の単語を使用。',
    },
    {
      q: '脳トレ休憩はどのくらい長くすべきですか？',
      a: '1～5分。短い方が良いです。2分のゲーム。もっと長く（3～5）生徒が非常に落ち着きなく。',
    },
    {
      q: 'これは授業から生徒をそらしますか？',
      a: '明確な限界を設定しない場合のみ。最初から言う：「3分プレイ、電話を入れる」。知るとき、再フォーカス。',
    },
    {
      q: '同じゲームを1週間に2回使用できますか？',
      a: 'はい。反復はOK。生徒は自分のスコアを削除するために再度プレイするのが好きです。',
    },
    {
      q: '脳トレに最適なゲームは何ですか？',
      a: 'ワード探し（黙った格子探し）、ワードホイール（回転）、速いデュエル（1～2分）最高。長いトーナメントを避ける。',
    },
  ],
  labels: { faqTitle: '教師からよく聞かれる質問', relatedTitle: '関連トピック' },
  related: [
    { href: '/education/games-for-teachers', label: '教師向けゲーム', accent: 'purple' },
    { href: '/education/indoor-recess-games', label: '室内休み時間のゲーム', accent: 'cyan' },
    { href: '/education/early-finishers-activities', label: '早期完了者向け活動', accent: 'lime' },
    { href: '/education/first-day-of-school-icebreakers', label: '始業式のアイスブレイク', accent: 'purple' },
    { href: '/education', label: '教育ホーム', accent: 'pink' },
  ],
  breadcrumb: { home: 'ホーム', hub: '教育', current: '脳トレ休憩' },
  learning: {
    educationalUse: ['Classroom Activity'],
    educationalLevel: ['Primary', 'Secondary'],
    typicalAgeRange: '6-14',
    teaches: 'vocabulary, word recognition, attention reset',
    timeRequired: 'PT3M',
  },
};

const RU: EducationLandingContent = {
  accent: 'lime',
  meta: {
    title: 'Физминутки словесные игры | Бесплатный класс LexiClash',
    description:
      'Быстрые словесные игры для восстановления внимания за 1–5 минут. Без подготовки, на любом устройстве, весь класс одновременно.',
    keywords: [
      'физминутки в классе',
      'словесные игры',
      'восстановление внимания',
      'разминки на уроке',
      'игры для класса',
      'онлайн игры',
      'учебные игры',
      'динамические паузы',
    ],
  },
  hero: {
    facts: ['1–5 минут', 'Без подготовки', 'Любое устройство', 'Весь класс'],
    h1: { part1: 'Восстановите внимание за', highlight: '2 минуты', part2: 'со словесными онлайн-играми' },
    subtitle:
      'Класс сидит 40 минут. Никто не слушает. Физминутка возвращает внимание без потери контроля над классом.',
    primaryCta: { label: 'Начать игру класса', href: '/education/classroom-game' },
    secondaryCta: { label: 'Как это работает', href: '/education' },
  },
  answer: {
    question: 'Как провести физминутку в классе?',
    answer:
      'Физминутка — это 1–5 минутная активность, восстанавливающая внимание. LexiClash запускает прямые игры поиска слов на любом проекторе или общем экране—все ученики играют одновременно на своих телефонах. Без подготовки, без материалов. Это работает, потому что требует достаточного внимания, чтобы прервать беспокойство, не теряя контроля класса.',
  },
  sections: [
    {
      kind: 'table',
      title: 'Выберите физминутку по времени и энергии класса',
      intro: 'Подберите игру под имеющееся время и состояние класса. Все игры работают в прямом эфире на любом устройстве.',
      columns: ['Минуты', 'Энергия класса', 'Что запустить', 'Почему работает'],
      rows: [
        [
          '1–2',
          'Спокойный / слегка возбужденный',
          'Поиск словесного колеса',
          'Низкое давление. Поиск слов на вращающемся колесе. Без таблицы очков.',
        ],
        [
          '1–2',
          'Очень возбужденный',
          'Быстрый многопользовательский дуэль',
          'Конкурентный выход. Один раунд в прямом эфире. Победитель на экране. Горят энергией.',
        ],
        [
          '2–3',
          'Спокойный',
          'Поиск доски в стиле Богле',
          'Медитативный темп. Тихий одиночный поиск. Крики только в конце.',
        ],
        [
          '2–3',
          'Возбужденный',
          'Группировка слов (головоломка)',
          'Сосредоточенное решение. Четыре группы. Тихое обдумывание, потом голосование.',
        ],
        [
          '3–5',
          'Очень возбужденный',
          'Прямой многопользовательский турнир',
          'Устойчивая энергия. Несколько раундов. Таблица лидеров. Назад к уроку.',
        ],
        [
          '3–5',
          'Спокойный / смешанный',
          'Поиск слов с подсказками',
          'Вы контролируете темп. Подсказки для каждого слова. Ученики остаются вовлеченными.',
        ],
      ],
    },
    {
      kind: 'steps',
      title: 'Реальная 3-минутная физминутка, минута за минутой',
      intro: 'Полный пример. Адаптируйте время под размер класса.',
      items: [
        {
          step: '0:00–0:20',
          focus: 'Подготовка',
          activity:
            'Проецируйте доску LexiClash. Ученики берут телефоны. Скажите: "За 20 секунд присоединитесь к классу. Код на экране."',
        },
        {
          step: '0:20–1:30',
          focus: 'Тихий поиск',
          activity:
            'Все играют 70 секунд в поиск слов. Ищут молча. Просто находят.',
        },
        {
          step: '1:30–2:00',
          focus: 'Раунд крика',
          activity:
            'Остановите игру. "Крикните ваше самое длинное слово!" Ученики кричат ответы. Вы читаете вслух. Смех.',
        },
        {
          step: '2:00–2:30',
          focus: 'Таблица и закрытие',
          activity:
            'Быстрая таблица лидеров на экране. Празднуйте топ-3. "Вернись на стр. 42." Телефоны убирают.',
        },
        {
          step: '2:30–3:00',
          focus: 'Возврат к уроку',
          activity:
            'Вернитесь к уроку. Внимание восстановлено. Вы потратили 3 минуты и получили 20 минут восстановленного внимания.',
        },
      ],
    },
    {
      kind: 'features',
      title: 'Почему словесные игры работают лучше',
      items: [
        {
          icon: 'zap',
          text: 'Мгновенный старт: Без подготовки. Один экран, один код, старт за 30 секунд.',
        },
        {
          icon: 'users',
          text: 'Весь класс одновременно: Все играют вместе. Нет разделения, нет отвлечений.',
        },
        {
          icon: 'monitor',
          text: 'Публичная таблица очков: Результаты на экране делают это событием.',
        },
        {
          icon: 'timer',
          text: 'Ограниченная продолжительность: Ученики знают, когда это заканчивается. Без утечки в урок.',
        },
        {
          icon: 'list',
          text: 'Без подготовки: Без печати, без вырезания, без поиска таймера.',
        },
        {
          icon: 'globe',
          text: 'Работает на базовом интернете: Любое устройство. Без загрузок, без входа.',
        },
      ],
    },
    {
      kind: 'cards',
      title: 'Когда использовать физминутку',
      intro: 'Реальные моменты, когда учителя их используют:',
      items: [
        {
          tag: 'Середина урока',
          title: 'На 40-й минуте урока',
          desc: 'Ученики перестали воспринимать информацию. Пауза вернет внимание на последние 10 минут.',
        },
        {
          tag: 'После теста',
          title: 'Сразу после контрольной',
          desc: 'Ученики устали. Конкурентная игра восстанавливает энергию.',
        },
        {
          tag: 'Переход',
          title: 'Между предметами',
          desc: 'Переходите с математики на письмо? Словесная игра — это переключение.',
        },
        {
          tag: 'Поведение',
          title: 'Когда класс беспокоится',
          desc: 'Ученики вертятся, говорят вне очереди. Игра канализует энергию.',
        },
        {
          tag: 'Понедельник',
          title: 'Начало дня или недели',
          desc: 'Задайте тон. Быстрая игра строит культуру класса с первой минуты.',
        },
        {
          tag: 'Праздник',
          title: 'После завершения сложной темы',
          desc: 'Закончили главу. Один раунд как праздник. Чувствуется как награда.',
        },
      ],
    },
  ],
  faqs: [
    {
      q: 'Как дать ученикам код класса?',
      a: 'Когда вы начинаете игру класса, код появляется на вашем экране. Скажите его вслух или покажите на доске. Ученики вводят или сканируют его. Присоединяются за 10 секунд. Без входа.',
    },
    {
      q: 'Что если у некоторых учеников нет телефона?',
      a: 'Они могут играть в паре с соседом или как команда. Или сохраняйте одиночные игры на время, когда все присутствуют. Физминутки гибкие.',
    },
    {
      q: 'Нужно ли учить их играть?',
      a: 'Нет. Правила на экране. В первом раунде пройдите через быстрый пример. Большинство понимает за 30 секунд.',
    },
    {
      q: 'Могу ли я использовать это, если преподаю на другом языке?',
      a: 'LexiClash поддерживает шесть языков: английский, иврит, испанский, шведский, японский, русский. Установите язык класса, и игры используют слова на этом языке. Вы можете загружать пользовательские словари.',
    },
    {
      q: 'Сколько должна длиться физминутка?',
      a: '1–5 минут. Короче часто лучше. 2-минутная игра между активностями. Дольше (3–5), если класс очень возбужден.',
    },
    {
      q: 'Это отвлечет учеников от урока?',
      a: 'Только если не установить четкий предел. С начала скажите: "Играем 3 минуты, потом телефоны убираем." Зная границу, они быстрее вернутся.',
    },
    {
      q: 'Могу ли я использовать одну игру дважды в неделю?',
      a: 'Да. Повторение хорошо. Ученикам нравится играть снова, чтобы улучшить свой результат.',
    },
    {
      q: 'Какие игры лучше всего для физминуток?',
      a: 'Поиск слов (тихий поиск), словесное колесо (вращение), быстрые дуэли (1–2 мин). Избегайте длинных турниров. Выбирайте игры, в которые можно войти за 10 секунд.',
    },
  ],
  labels: { faqTitle: 'Вопросы, которые задают учителя', relatedTitle: 'Связанные темы' },
  related: [
    { href: '/education/games-for-teachers', label: 'Игры для учителей', accent: 'purple' },
    { href: '/education/indoor-recess-games', label: 'Игры для внутреннего перерыва', accent: 'cyan' },
    { href: '/education/early-finishers-activities', label: 'Занятия для быстрых учеников', accent: 'lime' },
    { href: '/education/first-day-of-school-icebreakers', label: 'Знакомство в первый день', accent: 'purple' },
    { href: '/education', label: 'Образование', accent: 'pink' },
  ],
  breadcrumb: { home: 'Главная', hub: 'Образование', current: 'Физминутки' },
  learning: {
    educationalUse: ['Classroom Activity'],
    educationalLevel: ['Primary', 'Secondary'],
    typicalAgeRange: '6-14',
    teaches: 'vocabulary, word recognition, attention reset',
    timeRequired: 'PT3M',
  },
};

const MAP: Record<string, EducationLandingContent> = { en: EN, he: HE, es: ES, sv: SV, ja: JA, ru: RU };

export function getBrainBreaksContent(locale: string): EducationLandingContent {
  return MAP[locale] ?? EN;
}
