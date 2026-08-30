import type { EducationLandingContent } from '@/lib/seo/educationLanding';

const EN: EducationLandingContent = {
  accent: 'cyan',
  meta: {
    title: 'Indoor Recess Games for Classrooms | LexiClash',
    description:
      'Structured 20-minute indoor recess activities for rainy days. Free whole-class word games, quiet play ideas, and time-blocked plans for any group size.',
    keywords: [
      'indoor recess games',
      'rainy day activities classroom',
      'indoor recess ideas',
      'quiet indoor games',
      'classroom games for whole class',
      'wet play activities',
      'free indoor recess',
      'brain breaks for kids',
    ],
  },
  hero: {
    facts: ['Free to start', 'No devices required', 'Works in any room', '20 minutes flat'],
    h1: { part1: 'When it rains, recess goes', highlight: 'inside', part2: 'Structure chaos into play' },
    subtitle:
      'A real 20-minute indoor recess plan that holds a full class, no tech setup, no prizes, no chaos.',
    primaryCta: { label: 'Start teaching', href: '/education/classroom-game' },
    secondaryCta: { label: 'See it live', href: '/multiplayer' },
  },
  answer: {
    question: 'What are good indoor recess games for a classroom with no equipment?',
    answer:
      "LexiClash runs free word games on any browser—projector, tablet, or phone—with whole-class multiplayer, no student emails, and a structured 20-minute play block. Teachers control the room in real time and can teach right alongside students, perfect for indoors with a full class.",
  },
  sections: [
    {
      kind: 'steps',
      title: 'The 20-Minute Indoor Recess Block',
      intro:
        'This structure works whether you have thirty kids in a gym or a classroom of ten. Set a timer. Stick to the times. Chaos declines.',
      items: [
        {
          step: '0–2 min: Settle',
          focus: 'Get everyone in the room, sitting, eyes forward.',
          activity:
            'No instructions yet. Queue up whatever game you\'re playing. One sentence: "We\'re playing word hunt today. Everyone\'s on one team." That\'s it.',
        },
        {
          step: '2–3 min: Explain and demo',
          focus: 'Show them the grid or puzzle, not the rules.',
          activity:
            'Click the first letter on the board. Swipe to the second. Say the word. Say it again. "Three-letter words, four-letter words, any direction." Ask three students to point at words on the grid. Do not read the rulebook to them. Walk it.',
        },
        {
          step: '3–16 min: Play',
          focus: 'This is their recess. You are not playing.',
          activity:
            'Let them shout answers, find words, compete or collaborate—whatever happened in those first three minutes. If someone gets stuck, ask them to find a three-letter word. Walk the room. Laugh at the chaos. Do not referee.',
        },
        {
          step: '16–19 min: Wind down',
          focus: 'Stop before the energy burns down. Do not go to zero.',
          activity:
            'Announce final round. Call out a category: "Only four-letter words in the last minute" or "Okay, final 60 seconds, shout the longest word you can find." End mid-high.',
        },
        {
          step: '19–20 min: Dismiss',
          focus: 'Bell rings. Nobody feels robbed.',
          activity:
            'Show the final score or top three words. Thank them. They are lined up and gone. Do not do a "winners circle" speech.',
        },
      ],
    },
    {
      kind: 'table',
      title: 'What Works at Every Scale',
      intro:
        'Same 20-minute block, different room setups. The format changes so the chaos does not.',
      columns: [
        'Group size',
        'Room setup',
        'Format that works',
        'What breaks down',
      ],
      rows: [
        [
          '5–10 (small group)',
          'Tablets or laptops, one per pair',
          'Pairs compete on their own device. Projects final scores on one screen. No moderating.',
          'Too much talking. Set a "no coaching other pairs" rule or they lose focus.',
        ],
        [
          '10–20 (standard class)',
          'Projector + smartboard, whole class on one screen',
          'One team, all students shouting answers. You type or swipe. Leaderboard is the room.',
          'Too many voices at once. Raise your hand to shout, or no credit. Or play rounds and alternate who shouts.',
        ],
        [
          '20–30 (double class or gym)',
          'One projector + two tablets for tally',
          'Split into two teams. Each team has one person at the controls, rotating every minute. Whole room is loud and okay.',
          'Control rotation is slow. Pick the controllers beforehand and keep them in seat. Or: one team person controls for the whole 13 minutes, sub them out at wind-down.',
        ],
        [
          '30+ (full grade year)',
          'Projector + mic (optional) + preassigned team areas',
          'Three teams in three corners. One person at the board, shouting answers into the mic or to the room lead. Score is displayed live. Teams celebrate in their corner.',
          'Hearing who said what. Use the mic, or the projector\'s speaker. Noise is not the problem; not knowing which team said it is.',
        ],
      ],
    },
    {
      kind: 'features',
      title: 'Why this works in 20 minutes',
      items: [
        {
          icon: 'timer',
          text: 'Bounded time. Kids know it ends. No "Can we play longer?" because you set the rule at the start.',
        },
        {
          icon: 'users',
          text: 'One screen, whole class. No one is waiting for a turn or sitting out.',
        },
        {
          icon: 'zap',
          text: 'Instant start. No setup, no accounts, no login. Paste a code or click play.',
        },
        {
          icon: 'monitor',
          text: 'You stay in control. You are not a player, so you can end on time and keep the room moving.',
        },
      ],
    },
    {
      kind: 'cards',
      title: 'Quiet-Mode Indoor Recess',
      intro:
        'Rainy days sometimes mean tired kids, not chaos. Here are the games and setups that work silent.',
      items: [
        {
          tag: 'Whole class',
          title: 'Silent word hunt',
          desc: 'Projector on, no sound. Every student writes words on a piece of paper as they see them on screen. No shouting. Final timer: three minutes. Swap papers. Whoever wrote the most unique words wins.',
        },
        {
          tag: 'Pairs',
          title: 'Connections on one device',
          desc: 'Two students on a tablet, taking turns dragging words into groups. Quiet puzzle mode. No timer. One round takes five minutes.',
        },
        {
          tag: 'Individual',
          title: 'Daily puzzle solo',
          desc: 'Each student gets a browser tab. One small word puzzle. They solve it in their own time. No competition. Just thinking.',
        },
      ],
    },
  ],
  faqs: [
    {
      q: 'Do students need to log in or set up accounts?',
      a: 'No. For whole-class play, you create the room. Students join with a code. No emails, no accounts, no passwords.',
    },
    {
      q: 'What happens if we run out of ideas halfway through?',
      a: 'Rotate the game mode. Played word hunt? Switch to Connections. Same 20-minute block, new puzzle, resets the energy.',
    },
    {
      q: 'Can I play this with kids who are off-level readers?',
      a: 'Yes. You can set the word difficulty and length. Short words for younger readers. You control the board, so you can skip hard puzzles mid-block.',
    },
    {
      q: 'How many devices do I actually need?',
      a: 'Just one. Projector and either a computer, tablet, or smartboard. You control it. Everyone else watches and shouts answers.',
    },
    {
      q: 'What if the internet is down?',
      a: 'These games need internet. If yours is down, use the silent paper games above, or jump to wall games: Hangman, 20 Questions, or Rhyme Chain.',
    },
    {
      q: 'Do I have to keep score?',
      a: 'No. The game keeps it. But you can turn off the score display if your class does better without a leaderboard.',
    },
    {
      q: 'Can I use these games for something other than recess?',
      a: 'Absolutely. Brain breaks, end-of-lesson, wet days, or five-minute filler. Same 20-minute plan works.',
    },
  ],
  labels: {
    faqTitle: 'Questions about indoor recess',
    relatedTitle: 'Related resources',
  },
  related: [
    { href: '/education/brain-breaks-word-games', label: 'Brain breaks with word games', accent: 'lime' },
    { href: '/education/games-for-teachers', label: 'Games for teachers', accent: 'purple' },
    { href: '/education/classroom-game', label: 'Whole-class games', accent: 'pink' },
    { href: '/education', label: 'Education hub', accent: 'cyan' },
  ],
  breadcrumb: {
    home: 'Home',
    hub: 'Education',
    current: 'Indoor recess games',
  },
  learning: {
    educationalUse: ['Classroom Activity'],
    educationalLevel: ['Primary', 'Secondary'],
    typicalAgeRange: '6-13',
    teaches: 'Word recognition, vocabulary, collaborative problem-solving, time management in structured play.',
    timeRequired: 'PT20M',
  },
};

const HE: EducationLandingContent = {
  accent: 'cyan',
  meta: {
    title: 'משחקי הפסקה בתוך הכיתה | LexiClash',
    description:
      'תכנית מובנית של 20 דקות למשחקים בהפסקה בימים גשומים. משחקי מילים חינמיים, פעילויות שקטות, ותכנון לכל גודל כיתה.',
    keywords: [
      'משחקי הפסקה בפנים',
      'פעילויות יום גשום בכיתה',
      'משחקים בהפסקה שקטה',
      'משחקים לכיתה שלמה',
      'משחקי מילים בחינם',
      'פעילויות פנים בזמן גשום',
      'משחקי חינוך משחקים',
      'הפסקות מוח עם משחקי מילים',
    ],
  },
  hero: {
    facts: ['חינמי להתחיל', 'בלי התקנות', 'בחדר כלשהו', '20 דקות בדיוק'],
    h1: {
      part1: 'כשיורד גשם, ההפסקה',
      highlight: 'נכנסת לתוך הכיתה',
      part2: 'הפוך כאוס למשחק מובנה',
    },
    subtitle:
      'תכנית הפסקה אמתית בת 20 דקות שמחזיקה כיתה שלמה, בלי הגדרות, בלי פרסים, בלי אי־סדר.',
    primaryCta: { label: 'התחל ללמד', href: '/education/classroom-game' },
    secondaryCta: { label: 'ראה בפעולה', href: '/multiplayer' },
  },
  answer: {
    question: 'מה משחקי הפסקה טובים לכיתה ללא ציוד?',
    answer:
      'LexiClash מריץ משחקי מילים חינמיים בכל דפדפן—מקרן, טאבלט או טלפון—עם משחק של כל הכיתה בו־זמנית, בלי דוא״ל, ותוכנית מובנית של 20 דקות. מורים שולטים בחדר בזמן אמת ויכולים ללמד לצד התלמידים.',
  },
  sections: [
    {
      kind: 'steps',
      title: 'בלוק הפסקה בן 20 דקות',
      intro:
        'המבנה הזה עובד בין אם יש לך שלושים ילדים בחדר גיטנסטיקה או כיתה של עשרה. הגדר טיימר. דבק לזמנים. האי־סדר פוחת.',
      items: [
        {
          step: 'דקה 0–2: הרגע',
          focus: 'קבל הכל בחדר, יושב, עיניים קדימה.',
          activity:
            'אל תתן הוראות עדיין. הקד כל משחק שאתה משחק. משפט אחד: "אנחנו משחקים ציד מילים היום. כל אחד בצוות אחד." זהו.',
        },
        {
          step: 'דקה 2–3: הסבר והראה',
          focus: 'הראה להם את הגריד או הפאזל, לא את הכללים.',
          activity:
            'לחץ על האות הראשונה בלוח. גרור לשנייה. אמור את המילה. אמור שוב. "מילים בן שלוש אותיות, בן ארבע אותיות, כל כיוון." בקש משלושה תלמידים להצביע על מילים בגריד. אל תקרא להם את ספר הכללים. הראה להם.',
        },
        {
          step: 'דקה 3–16: משחק',
          focus: 'זו היא ההפסקה שלהם. אתה לא משחק.',
          activity:
            'תן להם לצעוק תשובות, למצוא מילים, להתחרות או לשתוף פעולה לפי מה שהתרחש בשלוש הדקות הראשונות. אם מישהו תקוע, שאל אותו למצוא מילה של שלוש אותיות. הלך בחדר. צחק על הכאוס. אל תפקח.',
        },
        {
          step: 'דקה 16–19: רדימה',
          focus: 'עצור לפני שהאנרגיה יורדת לאפס.',
          activity:
            'הודיע סיבוב סופי. קרא לקטגוריה: "רק מילים בן ארבע אותיות בדקה האחרונה" או "אוקיי, 60 השניות האחרונות, צעקו את המילה הארוכה ביותר שתוכלו למצוא." סוף בגובה.',
        },
        {
          step: 'דקה 19–20: פינוי',
          focus: 'הפעמון צלצל. לא מרגיש שנשדלו.',
          activity:
            'הראה את הציון הסופי או שלוש המילים המובילות. תודה להם. הם בתור וחוצים הלאה. אל תעשה נאום של "מעגל הזוכים".',
        },
      ],
    },
    {
      kind: 'table',
      title: 'מה עובד בכל קנה מידה',
      intro:
        'אותו בלוק של 20 דקות, הגדרות חדר שונות. הפורמט משתנה כדי שהכאוס לא.',
      columns: [
        'גודל קבוצה',
        'הגדרת חדר',
        'פורמט שעובד',
        'מה מתחדל',
      ],
      rows: [
        [
          '5–10 (קבוצה קטנה)',
          'טאבלטים או ניידים, אחד לזוג',
          'זוגות מתחרים בהתקן שלהם. מקרן את הציונים הסופיים על מסך אחד. אל תווכח.',
          'יותר מדי דיבור. קבע כלל "אין הדרכה לזוגות אחרים" או הם מאבדים את הריכוז.',
        ],
        [
          '10–20 (כיתה סטנדרטית)',
          'מקרן + לוח חכם, כל הכיתה על מסך אחד',
          'צוות אחד, כל התלמידים צועקים תשובות. אתה מקליד או גורר. הלוח המובילים הוא החדר.',
          'יותר מדי קולות בבת אחת. רים ידך לצעיקה, או אתה לא מקבל קרדיט. או משחק סיבובים ותחליף מי צועק.',
        ],
        [
          '20–30 (כיתה כפולה או אולם)',
          'מקרן אחד + שני ניידים לספירה',
          'פצל לשני צוותים. לכל צוות יש אדם אחד בשליטה, מסתובב כל דקה. החדר כולו קול גדול וזה בסדר.',
          'סיבוב שליטה איטי. בחר בבקרים מראש וזקוק אותם בכיסא. או: אדם צוות אחד שולט במשך 13 הדקות כולן, החלף אותו בזמן הרדימה.',
        ],
        [
          '30+ (השנה בת הפרק)',
          'מקרן + מיקרופון (אופציונלי) + אזורי צוות שהוקצו מראש',
          'שלושה צוותים בשלוש פינות. אדם אחד בלוח, צועק תשובות למיקרופון או למראש החדר. הציון מוצג בחי. צוותים חוגגים בפינה שלהם.',
          'שמיעה מי אמר מה. השתמש במיקרופון, או בספיקר של המקרן. רעש לא הבעיה; לא לדעת איזה צוות אמר זה.',
        ],
      ],
    },
    {
      kind: 'features',
      title: 'למה זה עובד ב־20 דקות',
      items: [
        {
          icon: 'timer',
          text: 'זמן מגודר. ילדים יודעים שזה מסתיים. אין "אנחנו יכולים לשחק עוד?" כי אתה הגדרת את הכלל בהתחלה.',
        },
        {
          icon: 'users',
          text: 'מסך אחד, כל הכיתה. אף אחד לא מחכה בתור או יושב בחוץ.',
        },
        {
          icon: 'zap',
          text: 'התחלה מידית. בלי הגדרות, בלי חשבונות, בלי כניסה.',
        },
        {
          icon: 'monitor',
          text: 'אתה נשאר בשליטה. אתה לא שחקן, אז אתה יכול להסתיים בזמן ולשמור את החדר בתנועה.',
        },
      ],
    },
    {
      kind: 'cards',
      title: 'הפסקה בתוך הכיתה במצב שקט',
      intro:
        'ימים גשומים יותר מהפעם פירושם ילדים עייפים, לא כאוס. הנה המשחקים וההגדרות שעובדות בשקט.',
      items: [
        {
          tag: 'כל הכיתה',
          title: 'ציד מילים שקט',
          desc: 'מקרן פועל, ללא קול. כל תלמיד כותב מילים על דף נייר כשהוא רואה אותן על המסך. אין צעיקה. טיימר סופי: שלוש דקות. החלף נייר. מי שכתב את המילים הייחודיות ביותר זוכה.',
        },
        {
          tag: 'זוגות',
          title: 'קשרים בהתקן אחד',
          desc: 'שני תלמידים בטאבלט, מתחלפים בגרירת מילים לקבוצות. מצב פאזל שקט. ללא טיימר. סיבוב אחד לוקח חמש דקות.',
        },
        {
          tag: 'יחידי',
          title: 'פאזל יומי ב־one',
          desc: 'כל תלמיד מקבל כרטיסייה בדפדפן. פאזל מילים קטן אחד. הם פותרים אותו בזמן שלהם. ללא תחרות. רק חשיבה.',
        },
      ],
    },
  ],
  faqs: [
    {
      q: 'האם תלמידים צריכים להיכנס או להקים חשבונות?',
      a: 'לא. למשחק של כל הכיתה, אתה יוצר את החדר. תלמידים מצטרפים עם קוד. ללא דוא״ל, חשבונות, סיסמאות.',
    },
    {
      q: 'מה קורה אם אנחנו גומרים ברעיונות בחצי הדרך?',
      a: 'סובב את מצב המשחק. שיחקת ציד מילים? עבור לקשרים. אותו בלוק של 20 דקות, פאזל חדש, מאפס את האנרגיה.',
    },
    {
      q: 'האם אני יכול לשחק עם ילדים שקוראים בקשיות?',
      a: 'כן. אתה יכול להגדיר את קושי המילה ואורך. מילים קצרות לקוראים צעירים. אתה שולט בלוח, אז אתה יכול לדלג על פאזלים קשים באמצע הבלוק.',
    },
    {
      q: 'כמה התקנים אני באמת צריך?',
      a: 'רק אחד. מקרן וגם מחשב, טאבלט או לוח חכם. אתה שולט בו. כולם אחרים צופים וצועקים תשובות.',
    },
    {
      q: 'מה אם האינטרנט נמוך?',
      a: 'משחקים אלה צריכים אינטרנט. אם שלך נמוך, השתמש במשחקים הנייר השקט לעיל, או קפוץ למשחקי קיר: תליון, 20 שאלות, או שרשור חרוזים.',
    },
    {
      q: 'האם אני חייב לשמור על ניקוד?',
      a: 'לא. המשחק שומר על זה. אבל אתה יכול לכבות את תצוגת הניקוד אם הכיתה שלך עובדת טוב יותר ללא לוח מובילים.',
    },
    {
      q: 'האם אני יכול להשתמש במשחקים אלה למשהו אחר מלבד הפסקה?',
      a: 'בהחלט. עוצרי מוח, סוף־דרך, ימים גשומים, או מחזור של חמש דקות. אותה תכנית של 20 דקות עובדת.',
    },
  ],
  labels: {
    faqTitle: 'שאלות על הפסקה בתוך הכיתה',
    relatedTitle: 'משאבים קשורים',
  },
  related: [
    { href: '/education/brain-breaks-word-games', label: 'הפסקות מוח עם משחקי מילים', accent: 'lime' },
    { href: '/education/games-for-teachers', label: 'משחקים למורים', accent: 'purple' },
    { href: '/education/classroom-game', label: 'משחקים של כל הכיתה', accent: 'pink' },
    { href: '/education', label: 'מרכז החינוך', accent: 'cyan' },
  ],
  breadcrumb: {
    home: 'דף הבית',
    hub: 'חינוך',
    current: 'משחקי הפסקה בתוך הכיתה',
  },
  learning: {
    educationalUse: ['Classroom Activity'],
    educationalLevel: ['Primary', 'Secondary'],
    typicalAgeRange: '6-13',
    teaches: 'זיהוי מילים, אוצר מילים, פתרון בעיות שיתופי, ניהול זמן במשחק מובנה.',
    timeRequired: 'PT20M',
  },
};

const ES: EducationLandingContent = {
  accent: 'cyan',
  meta: {
    title: 'Juegos para recreo en días lluviosos | LexiClash',
    description:
      'Plan estructurado de 20 minutos para juegos en clase cuando llueve. Juegos de palabras gratuitos, actividades silenciosas y horarios para cualquier tamaño de grupo.',
    keywords: [
      'juegos para recreo en la lluvia',
      'actividades en días nublados para aula',
      'ideas para recreo en casa',
      'juegos silenciosos para clase',
      'juegos para toda la clase',
      'actividades cuando llueve',
      'juegos educativos gratuitos',
      'pausas cerebrales para niños',
    ],
  },
  hero: {
    facts: ['Gratis para empezar', 'Sin instalación', 'En cualquier aula', '20 minutos exactos'],
    h1: {
      part1: 'Cuando llueve, el recreo se va',
      highlight: 'adentro',
      part2: 'Convierte el caos en juego ordenado',
    },
    subtitle:
      'Un plan real de recreo de 20 minutos que mantiene toda la clase ocupada, sin caos, sin premios, sin griterío.',
    primaryCta: { label: 'Empieza a enseñar', href: '/education/classroom-game' },
    secondaryCta: { label: 'Mira en vivo', href: '/multiplayer' },
  },
  answer: {
    question: '¿Qué juegos para recreo cubierto funcionan sin equipo?',
    answer:
      'LexiClash ofrece juegos de palabras gratuitos en cualquier navegador—proyector, tablet o teléfono—con juego multiplayer de toda la clase, sin emails de estudiantes, y un plan estructurado de 20 minutos. Los maestros controlan el aula en tiempo real y pueden enseñar junto a los estudiantes.',
  },
  sections: [
    {
      kind: 'steps',
      title: 'El bloque de recreo de 20 minutos',
      intro:
        'Esta estructura funciona sea que tengas treinta niños en un gimnasio o un aula de diez. Pon el cronómetro. Respeta los tiempos. El caos disminuye.',
      items: [
        {
          step: '0–2 min: Calma',
          focus: 'Que todos entren al aula, sentados, mirando al frente.',
          activity:
            'No des instrucciones aún. Carga el juego que vas a usar. Una sola frase: "Hoy jugamos a cazar palabras. Todos en el mismo equipo." Ya.',
        },
        {
          step: '2–3 min: Explicación y demostración',
          focus: 'Muéstrales la cuadrícula o el puzzle, no las reglas.',
          activity:
            'Toca la primera letra en la pizarra. Arrastra a la segunda. Di la palabra. Vuelve a decirla. "Palabras de tres letras, de cuatro letras, en cualquier dirección." Pide a tres estudiantes que señalen palabras en la cuadrícula. No les leas el manual de reglas. Demuéstraselo.',
        },
        {
          step: '3–16 min: Juego',
          focus: 'Este es su recreo. Tú no juegas.',
          activity:
            'Déjalos gritar respuestas, encontrar palabras, competir o colaborar según lo que pasó en los primeros tres minutos. Si alguien se atasca, pídele que encuentre una palabra de tres letras. Camina por el aula. Ríe del caos. No arbitres.',
        },
        {
          step: '16–19 min: Cierre',
          focus: 'Para antes de que la energía desaparezca.',
          activity:
            'Anuncia la ronda final. Lanza una categoría: "Solo palabras de cuatro letras en el último minuto" o "Bien, últimos 60 segundos, griten la palabra más larga que encuentren." Termina en alto.',
        },
        {
          step: '19–20 min: Salida',
          focus: 'Suena la campana. Nadie se siente defraudado.',
          activity:
            'Muestra la puntuación final o las tres palabras principales. Agradéceles. Están en fila y se van. No hagas un discurso de "círculo de ganadores".',
        },
      ],
    },
    {
      kind: 'table',
      title: 'Qué funciona a cualquier escala',
      intro:
        'El mismo bloque de 20 minutos, diferentes configuraciones de aula. El formato cambia para que el caos no.',
      columns: [
        'Tamaño del grupo',
        'Configuración del aula',
        'Formato que funciona',
        'Qué no funciona',
      ],
      rows: [
        [
          '5–10 (grupo pequeño)',
          'Tablets o laptops, una por pareja',
          'Las parejas compiten en su propio dispositivo. Proyecta las puntuaciones finales en una pantalla. Sin arbitraje.',
          'Demasiada charla. Establece una regla de "no enseñar a otras parejas" o pierden atención.',
        ],
        [
          '10–20 (clase estándar)',
          'Proyector + pizarra inteligente, toda la clase en una pantalla',
          'Un equipo, todos los estudiantes gritan respuestas. Tú escribes o arrastras. La tabla de clasificación es el aula.',
          'Demasiadas voces a la vez. Levanta la mano para gritar o no obtienes crédito. O juega por rondas y alterna quién grita.',
        ],
        [
          '20–30 (clase doble o gimnasio)',
          'Un proyector + dos tablets para llevar puntuación',
          'Divide en dos equipos. Cada equipo tiene una persona en los controles, rotando cada minuto. Toda la sala es ruidosa y está bien.',
          'La rotación de control es lenta. Elige a los controladores de antemano y mantenlos sentados. O: una persona del equipo controla los 13 minutos, cámbialo al final.',
        ],
        [
          '30+ (todo un grado)',
          'Proyector + micrófono (opcional) + áreas de equipo asignadas',
          'Tres equipos en tres esquinas. Una persona en la pizarra, gritando respuestas por el micrófono o al conductor. La puntuación se muestra en vivo. Los equipos celebran en su esquina.',
          'No saber quién dijo qué. Usa el micrófono o los parlantes del proyector. El ruido no es el problema; no saber qué equipo lo dijo sí.',
        ],
      ],
    },
    {
      kind: 'features',
      title: 'Por qué funciona en 20 minutos',
      items: [
        {
          icon: 'timer',
          text: 'Tiempo acotado. Los niños saben que termina. Sin "¿Podemos jugar más?" porque estableciste la regla al inicio.',
        },
        {
          icon: 'users',
          text: 'Una pantalla, toda la clase. Nadie espera turno ni queda fuera.',
        },
        {
          icon: 'zap',
          text: 'Inicio instantáneo. Sin configuración, sin cuentas, sin login.',
        },
        {
          icon: 'monitor',
          text: 'Tú mantienes el control. No eres jugador, así que puedes terminar a tiempo y mantener el aula moviéndose.',
        },
      ],
    },
    {
      kind: 'cards',
      title: 'Recreo silencioso en días lluviosos',
      intro:
        'Los días lluviosos a veces significan niños cansados, no caos. Aquí están los juegos y configuraciones que funcionan en silencio.',
      items: [
        {
          tag: 'Toda la clase',
          title: 'Caza de palabras silenciosa',
          desc: 'Proyector encendido, sin sonido. Cada estudiante escribe palabras en papel mientras las ve en la pantalla. Sin gritos. Cronómetro final: tres minutos. Intercambia papeles. Quién escribió las palabras más únicas gana.',
        },
        {
          tag: 'Parejas',
          title: 'Conexiones en un dispositivo',
          desc: 'Dos estudiantes con tablet, alternando en arrastrar palabras a grupos. Modo puzzle silencioso. Sin cronómetro. Una ronda toma cinco minutos.',
        },
        {
          tag: 'Individual',
          title: 'Puzzle diario en solitario',
          desc: 'Cada estudiante obtiene una pestaña en el navegador. Un pequeño puzzle de palabras. Lo resuelven a su ritmo. Sin competencia. Solo pensar.',
        },
      ],
    },
  ],
  faqs: [
    {
      q: '¿Necesitan los estudiantes crear cuentas o iniciar sesión?',
      a: 'No. Para juego de toda la clase, tú creas la sala. Los estudiantes se unen con un código. Sin emails, sin cuentas, sin contraseñas.',
    },
    {
      q: '¿Qué pasa si se nos acaban las ideas a mitad del camino?',
      a: 'Cambia el modo de juego. ¿Jugaste caza de palabras? Cambia a Conexiones. El mismo bloque de 20 minutos, nuevo puzzle, resetea la energía.',
    },
    {
      q: '¿Puedo jugar con niños que leen por debajo del nivel?',
      a: 'Sí. Puedes ajustar la dificultad y longitud de palabras. Palabras cortas para lectores jóvenes. Tú controlas la pizarra, así que puedes saltarte puzzles difíciles a mitad del bloque.',
    },
    {
      q: '¿Cuántos dispositivos realmente necesito?',
      a: 'Solo uno. Proyector y una computadora, tablet o pizarra inteligente. Tú lo controlas. Los demás miran y gritan respuestas.',
    },
    {
      q: '¿Qué si el internet está caído?',
      a: 'Estos juegos necesitan internet. Si el tuyo está caído, usa los juegos de papel silencioso de arriba, o salta a juegos de pared: Ahorcado, 20 Preguntas, o Cadena de Rimas.',
    },
    {
      q: '¿Tengo que llevar la puntuación?',
      a: 'No. El juego lo hace. Pero puedes desactivar la pantalla de puntuación si tu clase funciona mejor sin tabla de clasificación.',
    },
    {
      q: '¿Puedo usar estos juegos para algo más que recreo?',
      a: 'Absolutamente. Pausas cerebrales, final de clase, días lluviosos, o relleno de cinco minutos. El mismo plan de 20 minutos funciona.',
    },
  ],
  labels: {
    faqTitle: 'Preguntas sobre recreo cubierto',
    relatedTitle: 'Recursos relacionados',
  },
  related: [
    {
      href: '/education/brain-breaks-word-games',
      label: 'Pausas cerebrales con juegos de palabras',
      accent: 'lime',
    },
    { href: '/education/games-for-teachers', label: 'Juegos para maestros', accent: 'purple' },
    { href: '/education/classroom-game', label: 'Juegos para toda la clase', accent: 'pink' },
    { href: '/education', label: 'Centro de educación', accent: 'cyan' },
  ],
  breadcrumb: {
    home: 'Inicio',
    hub: 'Educación',
    current: 'Juegos para recreo cubierto',
  },
  learning: {
    educationalUse: ['Classroom Activity'],
    educationalLevel: ['Primary', 'Secondary'],
    typicalAgeRange: '6-13',
    teaches:
      'Reconocimiento de palabras, vocabulario, resolución de problemas colaborativa, gestión del tiempo en juego estructurado.',
    timeRequired: 'PT20M',
  },
};

const SV: EducationLandingContent = {
  accent: 'cyan',
  meta: {
    title: 'Inomhusspel för rast när det regnar | LexiClash',
    description:
      'Strukturerad 20-minutersplan för klassuppgifter under dåligt väder. Gratis ordspel, tysta aktiviteter och schema för alla klasstorleker.',
    keywords: [
      'inomhusrast aktiviteter',
      'regndagsspel för klassrum',
      'tystleken inomhus',
      'klassrum ordspel',
      'hela klassens spel',
      'aktiviteter när det regnar',
      'gratis klassrumsspel',
      'hjärnuppvärmning för barn',
    ],
  },
  hero: {
    facts: ['Gratis att börja', 'Ingen installation', 'I valfritt klassrum', 'Exakt 20 minuter'],
    h1: {
      part1: 'När det regnar, går rasten',
      highlight: 'inomhus',
      part2: 'Gör kaos till organiserat spel',
    },
    subtitle:
      'En verklig 20-minutersplan för innerastaktiviteter som håller en hel klass sysselsatt, helt utan bråk eller priser.',
    primaryCta: { label: 'Börja lära', href: '/education/classroom-game' },
    secondaryCta: { label: 'Se det live', href: '/multiplayer' },
  },
  answer: {
    question: 'Vilka inomhusspel för rast fungerar bäst i klassrummet?',
    answer:
      'LexiClash är kostnadsfritt ordspel som fungerar i alla webbläsare—projektor, surfplatta eller telefon—med hela klassens multiplayer, ingen e-post krävd, och en strukturerad 20-minutersplan. Lärare styr klassrummet i realtid och kan instruera samtidigt som eleverna spelar.',
  },
  sections: [
    {
      kind: 'steps',
      title: '20-minutersblocket för inne-rast',
      intro:
        'Den här strukturen fungerar oavsett om du har trettio barn i gymnastikhallen eller tio i klassrummet. Starta en timer. Håll dig till tidsplanen. Kaoset minskar.',
      items: [
        {
          step: '0–2 min: Lugna ner',
          focus: 'Få alla in, sittande, uppmärksamma.',
          activity:
            'Ingen instruktion ännu. Sätt igång spelet. En mening bara: "Vi spelar ordjakt idag. Alla på samma lag." Klart.',
        },
        {
          step: '2–3 min: Förklaring och demo',
          focus: 'Visa dem rutnätet eller pusslet, inte reglerna.',
          activity:
            'Klicka på första bokstaven på tavlan. Dra till nästa. Säg ordet. Säg det igen. "Tresiffriga ord, fyrsiffriga ord, alla håll." Be tre elever peka på ord på rutnätet. Läs inte regelhandboken. Visa dem hur det går till.',
        },
        {
          step: '3–16 min: Spel',
          focus: 'Det här är deras rast. Du spelar inte.',
          activity:
            'Låt dem skrika svar, hitta ord, tävla eller samarbeta efter vad som hände de första tre minuterna. Om någon fastnar, be dem hitta ett tresiffrigt ord. Gå omkring i klassrummet. Skratta åt kaoset. Tussa inte.',
        },
        {
          step: '16–19 min: Avslutning',
          focus: 'Sluta innan energin tar slut.',
          activity:
            'Tillkännage sista ronden. Ge en kategori: "Bara fyrsiffriga ord denna sista minut" eller "Okej, sista 60 sekunderna, skrika ut det längsta ordet ni hittar." Avsluta på höga tonen.',
        },
        {
          step: '19–20 min: Avsluta',
          focus: 'Klockan ringer. Ingen känner sig lurad.',
          activity:
            'Visa slutpoängen eller de tre bästa orden. Tacka dem. De står i led och går. Ingen "vinnarcirkel"-tal.',
        },
      ],
    },
    {
      kind: 'table',
      title: 'Vad som fungerar på alla nivåer',
      intro:
        'Samma 20-minutersblock, olika klassrumuppställningar. Formatet ändras så att kaoset inte gör det.',
      columns: [
        'Gruppstorlek',
        'Klassrumsuppställning',
        'Format som fungerar',
        'Vad som blir problematiskt',
      ],
      rows: [
        [
          '5–10 (liten grupp)',
          'Surfplattor eller laptops, en per två',
          'Par tävlar på sin egen enhet. Slutpoängen projiceras på en skärm. Ingen domarkall.',
          'För mycket prat. Sätt en regel om att inte hjälpa andra par eller de mister fokus.',
        ],
        [
          '10–20 (standard klass)',
          'Projektor + smartboard, hela klassen på en skärm',
          'Ett lag, alla elever skriker svar. Du skriver eller drar. Resultattavlan är klassrummet.',
          'För många röster på en gång. Räck upp handen för att skrika eller får ingen poäng. Eller spela omgångar och byt vem som skriker.',
        ],
        [
          '20–30 (dubbelklass eller idrottshall)',
          'En projektor + två surfplattor för poängräkning',
          'Dela in i två lag. Varje lag har en person vid kontrollerna, roterar varje minut. Hela rummet är högljudt och det är okej.',
          'Kontrollrotationen är långsam. Välj spelledarna innan och håll dem sittande. Eller: en lagledarе kontrollerar alla 13 minuter, byt vid avslutningen.',
        ],
        [
          '30+ (hela årskursen)',
          'Projektor + mikrofon (valfritt) + förbestämda lagområden',
          'Tre lag i tre hörn. En person vid tavlan, skriker svar i mikrofonen eller till rumsledaren. Poängen visas live. Lag firar i sitt hörn.',
          'Höra vem som sa vad. Använd mikrofonen eller projektorns högtalare. Ljud är inte problemet; att inte veta vilket lag som sa det är.',
        ],
      ],
    },
    {
      kind: 'features',
      title: 'Varför det fungerar på 20 minuter',
      items: [
        {
          icon: 'timer',
          text: 'Begränsad tid. Barnen vet att det slutar. Ingen "Kan vi spela längre?" för du sa hur lång tiden är från början.',
        },
        {
          icon: 'users',
          text: 'En skärm, hela klassen. Ingen väntar på sin tur eller sitter vid sidan.',
        },
        {
          icon: 'zap',
          text: 'Omedelbar start. Ingen installation, inga konton, ingen inloggning.',
        },
        {
          icon: 'monitor',
          text: 'Du behåller kontrollen. Du är inte spelare, så du kan avsluta i tid och hålla klassrummet i rörelse.',
        },
      ],
    },
    {
      kind: 'cards',
      title: 'Tyst inne-rast',
      intro:
        'Regndagar betyder ibland trötta barn, inte kaos. Här är spelen och uppställningarna som fungerar i tystnad.',
      items: [
        {
          tag: 'Hela klassen',
          title: 'Tyst ordjakt',
          desc: 'Projektor på, ingen ljud. Varje elev skriver ord på papper när de ser dem på skärmen. Inget skrikande. Sluttimer: tre minuter. Byt papper. Den som skrev mest unika ord vinner.',
        },
        {
          tag: 'Par',
          title: 'Samband på en enhet',
          desc: 'Två elever på en surfplatta, växlar på att dra ord till grupper. Tyst pussel läge. Ingen timer. En omgång tar fem minuter.',
        },
        {
          tag: 'Individuell',
          title: 'Dagligt pussel solo',
          desc: 'Varje elev får en flik i webbläsaren. Ett litet ordpussel. De löser det på sin egen tid. Ingen tävling. Bara tanke.',
        },
      ],
    },
  ],
  faqs: [
    {
      q: 'Behöver elever logga in eller skapa konton?',
      a: 'Nej. För klassrum-spel skapar du rummet. Eleverna ansluter med en kod. Ingen e-post, inga konton, inga lösenord.',
    },
    {
      q: 'Vad gör vi om vi tar slut på idéer mitt i lektionen?',
      a: 'Byt spelläge. Spelade ordjakt? Gå till Samband. Samma 20-minutersblock, nytt pussel, återställer energin.',
    },
    {
      q: 'Kan jag spela med elever som läser under nivå?',
      a: 'Ja. Du kan ställa in ordsvårigheten och längden. Korta ord för yngre läsare. Du kontrollerar tavlan, så du kan hoppa över svåra pussel mitt i blocket.',
    },
    {
      q: 'Hur många enheter behöver jag egentligen?',
      a: 'Bara en. Projektor och antingen dator, surfplatta eller smartboard. Du styr den. Alla andra tittar och skriker svar.',
    },
    {
      q: 'Vad om internetanslutningen är nere?',
      a: 'Dessa spel kräver internet. Om ditt är nere, använd de tysta papperspelen ovan, eller hoppa till väggspel: Hänga gubben, 20 Frågor, eller Rim-kedja.',
    },
    {
      q: 'Måste jag hålla poäng?',
      a: 'Nej. Spelet gör det. Men du kan stänga av poängvisningen om din klass mår bättre utan resultattavla.',
    },
    {
      q: 'Kan jag använda dessa spel för något annat än rast?',
      a: 'Absolut. Hjärnuppvärmning, lektionsslut, regndagar, eller femminutersfyllare. Samma 20-minutersplan fungerar.',
    },
  ],
  labels: {
    faqTitle: 'Frågor om inne-rast',
    relatedTitle: 'Relaterade resurser',
  },
  related: [
    {
      href: '/education/brain-breaks-word-games',
      label: 'Hjärnuppvärmning med ordspel',
      accent: 'lime',
    },
    { href: '/education/games-for-teachers', label: 'Spel för lärare', accent: 'purple' },
    { href: '/education/classroom-game', label: 'Klassrumsspel för hela gruppen', accent: 'pink' },
    { href: '/education', label: 'Utbildningscenter', accent: 'cyan' },
  ],
  breadcrumb: {
    home: 'Hem',
    hub: 'Utbildning',
    current: 'Inomhusspel för rast',
  },
  learning: {
    educationalUse: ['Classroom Activity'],
    educationalLevel: ['Primary', 'Secondary'],
    typicalAgeRange: '6-13',
    teaches:
      'Ordigenkänning, ordförråd, samarbetsproblemslösning, tidshantering i strukturerat spel.',
    timeRequired: 'PT20M',
  },
};

const JA: EducationLandingContent = {
  accent: 'cyan',
  meta: {
    title: '雨の日の室内休み時間ゲーム | LexiClash',
    description:
      '20分の構造化された室内休み時間プラン。無料の単語ゲーム、静かなアクティビティ、すべてのクラスサイズに対応。',
    keywords: [
      '室内休み時間のゲーム',
      '雨の日のクラス活動',
      '室内の遊び',
      'クラス全体のゲーム',
      '無料の教室ゲーム',
      '静かな室内ゲーム',
      '単語ゲーム',
      '脳トレーニング活動',
    ],
  },
  hero: {
    facts: ['無料で開始', 'セットアップ不要', 'どの教室でも', 'ちょうど20分'],
    h1: { part1: '雨の日は', highlight: '室内で休み時間', part2: 'グチャグチャを楽しいゲームに' },
    subtitle:
      'クラス全体を楽しませる実際の20分室内休み時間プラン。派手さなし、景品なし、騒乱なし。',
    primaryCta: { label: '授業を始める', href: '/education/classroom-game' },
    secondaryCta: { label: 'ライブを見る', href: '/multiplayer' },
  },
  answer: {
    question: '教室で使える道具なしの室内休み時間ゲームは？',
    answer:
      'LexiClashは、プロジェクター・タブレット・スマートフォンなどどのブラウザでも動く無料の単語ゲーム。クラス全体でマルチプレイでき、学生のメールアドレスは不要。構造化された20分プランで、先生がリアルタイムに授業をコントロールできます。',
  },
  sections: [
    {
      kind: 'steps',
      title: '20分の室内休み時間ブロック',
      intro:
        '30人が体育館にいようと10人がクラスにいようと、このプランは機能します。タイマーを設定。時間を守る。混乱が減ります。',
      items: [
        {
          step: '0–2分: 落ち着かせる',
          focus: 'みんなを集めて、座らせて、前を向かせる。',
          activity:
            'まだ説明はしない。ゲームを立ち上げる。一文だけ：「今日は単語探しゲームをします。みんなで同じチームです。」以上。',
        },
        {
          step: '2–3分: 説明とデモ',
          focus: 'ルールではなく、グリッドやパズルを見せる。',
          activity:
            'ボード上の最初の文字をクリック。次の文字にドラッグ。単語を言う。もう一度言う。「3文字、4文字、どの方向でも。」3人に指を指させて単語を示させる。ルールブックを読まないで。見せる。',
        },
        {
          step: '3–16分: ゲーム',
          focus: 'これは彼らの休み時間。あなたはプレイしていません。',
          activity:
            '最初の3分で何が起こったかに基づいて、答えを叫んだり、単語を見つけたり、競争したり協力させたりします。誰かが困ったら、3文字の単語を見つけるよう促す。教室を歩く。グチャグチャを楽しむ。審判はしない。',
        },
        {
          step: '16–19分: ウィンダウン',
          focus: 'エネルギーがなくなる前に止める。',
          activity:
            'ファイナルラウンドを発表。カテゴリを言う：「最後の1分は4文字の単語だけ」または「最後の60秒、見つけられた一番長い単語を叫んで。」高いテンションで終わる。',
        },
        {
          step: '19–20分: 終わり',
          focus: 'ベルが鳴る。だれも不満に思わない。',
          activity:
            '最終スコアまたはトップ3の単語を表示。ありがとうと言う。行列に並んで出ていく。「優勝者サークル」スピーチはしない。',
        },
      ],
    },
    {
      kind: 'table',
      title: 'あらゆる規模で機能する方法',
      intro:
        '同じ20分ブロック、別の教室設定。形式は変わりますが、混乱は変わりません。',
      columns: [
        'グループサイズ',
        '教室のセットアップ',
        '機能する形式',
        'うまくいかないこと',
      ],
      rows: [
        [
          '5–10（小グループ）',
          'タブレットまたはノートパソコン、1ペアあたり1台',
          'ペアが自分のデバイスで競争。最終スコアを1つの画面に投影。審判なし。',
          'おしゃべりが多すぎ。「他のペアに教えないルール」を設定するか、フォーカスを失う。',
        ],
        [
          '10–20（標準的なクラス）',
          'プロジェクター+スマートボード、1つの画面でクラス全体',
          '1つのチーム、すべての学生が答えを叫ぶ。あなたが入力またはドラッグ。スコアボードが教室。',
          '一度に多すぎる声。手を上げて叫ぶか、クレジットがない。またはラウンドを再生し、誰が叫ぶかを交代。',
        ],
        [
          '20–30（ダブルクラスまたはジム）',
          '1つのプロジェクター+スコア用の2つのタブレット',
          '2つのチームに分割。各チームは1分ごとにコントロール人員を回転。部屋全体が大きく、大丈夫。',
          'コントロール回転が遅い。事前にコントロール人員を選び、座席に保つ。または：1人が13分全部を制御し、終わりに交代。',
        ],
        [
          '30+（学年全体）',
          'プロジェクター+マイク（オプション）+事前割当チームエリア',
          '3つのチームが3つのコーナー。1人がボードで、マイクに答えを叫ぶ。スコアがライブ表示。チームが自分のコーナーで祝う。',
          '誰が何を言ったかわからない。マイクまたはプロジェクタースピーカーを使う。ノイズは問題ではない；どのチームが言ったか不明であること。',
        ],
      ],
    },
    {
      kind: 'features',
      title: 'なぜ20分で機能するのか',
      items: [
        {
          icon: 'timer',
          text: '時間が制限されている。子どもたちは終わることを知っている。「もっと遊べますか？」という質問はない。最初にルールを設定したから。',
        },
        {
          icon: 'users',
          text: '1つの画面、クラス全体。誰も順番を待ったり、やり過ごすことはない。',
        },
        {
          icon: 'zap',
          text: 'すぐに開始。セットアップなし、アカウントなし、ログインなし。',
        },
        {
          icon: 'monitor',
          text: 'あなたがコントロールを保つ。プレイヤーではないので、時間通りに終了して教室を動かし続けることができます。',
        },
      ],
    },
    {
      kind: 'cards',
      title: '静かな室内休み時間',
      intro:
        '雨の日は子どもたちが疲れているという意味がある場合があります。グチャグチャではなく。黙ってうまくいくゲームです。',
      items: [
        {
          tag: 'クラス全体',
          title: 'サイレント単語ハント',
          desc: 'プロジェクター点灯、音なし。各生徒が画面に見える単語を紙に書く。叫ばない。最終タイマー：3分。紙を交換。最も独特な単語を書いた人が優勝。',
        },
        {
          tag: 'ペア',
          title: '1つのデバイスの接続',
          desc: '2人の生徒が1つのタブレットで、単語をグループにドラッグして交代。静かなパズルモード。タイマーなし。1ラウンドは5分。',
        },
        {
          tag: '個別',
          title: 'ソロの毎日のパズル',
          desc: '各学生はブラウザのタブを取得。1つの小さな単語パズル。自分のペースで解く。競争なし。ただ考える。',
        },
      ],
    },
  ],
  faqs: [
    {
      q: '学生はログインまたはアカウント設定が必要ですか？',
      a: 'いいえ。クラス全体でプレイするには、あなたが部屋を作成します。生徒はコードで参加します。メールなし、アカウントなし、パスワードなし。',
    },
    {
      q: '途中でアイデアが尽きたらどうしますか？',
      a: 'ゲームモードを変更。単語ハントをプレイしましたか？接続に切り替え。同じ20分ブロック、新しいパズル、エネルギーをリセット。',
    },
    {
      q: '読み取りが平均以下の子どもたちと一緒にプレイできますか？',
      a: 'はい。単語の難易度と長さを設定できます。若い読者向けの短い単語。あなたがボードを制御するので、ブロックの途中で難しいパズルをスキップできます。',
    },
    {
      q: '実際にはどのくらいのデバイスが必要ですか？',
      a: 'たった1つ。プロジェクターとコンピューター、タブレット、またはスマートボード。あなたが制御します。他は皆見ていて答えを叫びます。',
    },
    {
      q: 'インターネットが接続されていない場合はどうしますか？',
      a: 'これらのゲームにはインターネットが必要です。あなたのものがダウンしている場合は、上記の静かな紙のゲームを使用するか、壁のゲームにジャンプします：ハングマン、20の質問、またはライムチェーン。',
    },
    {
      q: 'スコアを記録する必要がありますか？',
      a: 'いいえ。ゲームはそれを保つ。しかし、あなたのクラスがスコアボードなしでより良く機能する場合は、スコア表示をオフにすることができます。',
    },
    {
      q: '休み時間以外にこれらのゲームを使用できますか？',
      a: 'もちろん。脳トレーニング、レッスン終了、雨の日、または5分フィラー。同じ20分プランが機能します。',
    },
  ],
  labels: {
    faqTitle: '室内休み時間に関する質問',
    relatedTitle: '関連リソース',
  },
  related: [
    {
      href: '/education/brain-breaks-word-games',
      label: '単語ゲームを使った脳トレーニング',
      accent: 'lime',
    },
    { href: '/education/games-for-teachers', label: '先生向けゲーム', accent: 'purple' },
    { href: '/education/classroom-game', label: 'クラス全体ゲーム', accent: 'pink' },
    { href: '/education', label: '教育ハブ', accent: 'cyan' },
  ],
  breadcrumb: {
    home: 'ホーム',
    hub: '教育',
    current: '室内休み時間ゲーム',
  },
  learning: {
    educationalUse: ['Classroom Activity'],
    educationalLevel: ['Primary', 'Secondary'],
    typicalAgeRange: '6-13',
    teaches:
      '単語認識、語彙、協調的な問題解決、構造化されたゲームでの時間管理。',
    timeRequired: 'PT20M',
  },
};

const RU: EducationLandingContent = {
  accent: 'cyan',
  meta: {
    title: 'Игры для переменки в помещении | LexiClash',
    description:
      'Структурированный план переменки на 20 минут для дождливых дней. Бесплатные словесные игры, тихие активности и расписание для любого размера класса.',
    keywords: [
      'игры для переменки в помещении',
      'деятельность в дождливые дни',
      'тихие игры в классе',
      'игры для всего класса',
      'бесплатные классные игры',
      'словесные игры в классе',
      'занятия при плохой погоде',
      'мозговые перерывы',
    ],
  },
  hero: {
    facts: ['Бесплатно начать', 'Без установки', 'В любом классе', 'Ровно 20 минут'],
    h1: {
      part1: 'Когда идёт дождь, переменка идёт',
      highlight: 'в помещение',
      part2: 'Превратите хаос в игру',
    },
    subtitle:
      'Настоящий 20-минутный план домашней переменки, который займет весь класс. Без суеты, без призов, без беспорядка.',
    primaryCta: { label: 'Начать учить', href: '/education/classroom-game' },
    secondaryCta: { label: 'Посмотреть вживую', href: '/multiplayer' },
  },
  answer: {
    question: 'Какие игры для домашней переменки хорошо работают без оборудования?',
    answer:
      'LexiClash предлагает бесплатные словесные игры в любом браузере—проектор, планшет или телефон—с игрой всего класса, без email студентов и структурированным 20-минутным плаоном. Учителя контролируют класс в режиме реального времени и могут преподавать вместе со студентами.',
  },
  sections: [
    {
      kind: 'steps',
      title: '20-минутный блок переменки в помещении',
      intro:
        'Эта структура работает, независимо от того, есть ли у вас тридцать детей в спортзале или десять в классе. Установите таймер. Придерживайтесь времени. Хаос уменьшается.',
      items: [
        {
          step: '0–2 мин: Успокойтесь',
          focus: 'Соберите всех в комнате, сидя, глядя вперед.',
          activity:
            'Пока без инструкций. Запустите игру. Одно предложение: "Сегодня мы играем в поиск слов. Все в одной команде." И всё.',
        },
        {
          step: '2–3 мин: Объяснение и демонстрация',
          focus: 'Покажите им сетку или головоломку, а не правила.',
          activity:
            'Нажмите на первую букву на доске. Перетащите ко второй. Скажите слово. Скажите ещё раз. "Трёхбуквенные слова, четырёхбуквенные слова, в любом направлении." Попросите трёх студентов указать на слова в сетке. Не читайте им справочник. Покажите на примере.',
        },
        {
          step: '3–16 мин: Игра',
          focus: 'Это их переменка. Вы не играете.',
          activity:
            'Позвольте им кричать ответы, находить слова, конкурировать или сотрудничать в зависимости от того, что произошло в первые три минуты. Если кто-то застрял, попросите его найти трёхбуквенное слово. Ходите по комнате. Смейтесь над хаосом. Не судите.',
        },
        {
          step: '16–19 мин: Завершение',
          focus: 'Остановитесь, прежде чем энергия иссякнет.',
          activity:
            'Объявите финальный раунд. Назовите категорию: "Только четырёхбуквенные слова в последнюю минуту" или "Окей, последние 60 секунд, кричите самое длинное слово, которое найдёте." Закончите на высокой ноте.',
        },
        {
          step: '19–20 мин: Выход',
          focus: 'Звонок звенит. Никто не чувствует себя обманутым.',
          activity:
            'Покажите финальный счёт или три лучших слова. Поблагодарите их. Они встают в очередь и уходят. Никаких речей для "круга победителей".',
        },
      ],
    },
    {
      kind: 'table',
      title: 'Что работает в любом масштабе',
      intro:
        'Одинаковый 20-минутный блок, разные конфигурации класса. Формат меняется, но хаос—нет.',
      columns: [
        'Размер группы',
        'Конфигурация класса',
        'Формат, который работает',
        'Что перестаёт работать',
      ],
      rows: [
        [
          '5–10 (малая группа)',
          'Планшеты или ноутбуки, один на пару',
          'Пары соревнуются на своём устройстве. Выводите финальные баллы на один экран. Без судейства.',
          'Слишком много разговоров. Установите правило "не помогайте другим парам" или они потеряют фокус.',
        ],
        [
          '10–20 (стандартный класс)',
          'Проектор + интерактивная доска, весь класс на одном экране',
          'Одна команда, все студенты кричат ответы. Вы печатаете или перетягиваете. Рейтинг—это класс.',
          'Слишком много голосов одновременно. Поднимите руку для крика или без баллов. Или играйте раундами, чередуясь, кто кричит.',
        ],
        [
          '20–30 (двойной класс или спортзал)',
          'Один проектор + два планшета для подсчёта очков',
          'Разделитесь на две команды. В каждой команде есть один человек у управления, ротация каждую минуту. Вся комната громкая и это нормально.',
          'Медленная ротация управления. Выберите контролирующих заранее и держите их сидя. Или: один член команды контролирует все 13 минут, замените его в конце.',
        ],
        [
          '30+ (весь класс)',
          'Проектор + микрофон (дополнительно) + предварительно назначенные командные зоны',
          'Три команды в трёх углах. Один человек у доски кричит ответы в микрофон или к ведущему. Счёт отображается вживую. Команды празднуют в своём углу.',
          'Неслышно, кто что сказал. Используйте микрофон или динамики проектора. Шум—не проблема; не знать, какая команда это сказала—вот проблема.',
        ],
      ],
    },
    {
      kind: 'features',
      title: 'Почему это работает за 20 минут',
      items: [
        {
          icon: 'timer',
          text: 'Ограниченное время. Дети знают, что это кончится. Никаких "Можем ещё поиграть?" потому что вы установили правило в начале.',
        },
        {
          icon: 'users',
          text: 'Один экран, весь класс. Никто не ждёт очереди и не сидит в стороне.',
        },
        {
          icon: 'zap',
          text: 'Мгновенный старт. Никаких настроек, никаких аккаунтов, никакого входа.',
        },
        {
          icon: 'monitor',
          text: 'Вы сохраняете контроль. Вы не игрок, поэтому вы можете закончить вовремя и держать класс в движении.',
        },
      ],
    },
    {
      kind: 'cards',
      title: 'Тихая домашняя переменка',
      intro:
        'Дождливые дни иногда означают усталых детей, а не хаос. Вот игры и конфигурации, которые работают в тишине.',
      items: [
        {
          tag: 'Весь класс',
          title: 'Тихий поиск слов',
          desc: 'Проектор включён, без звука. Каждый студент пишет слова на бумаге, когда он видит их на экране. Никаких криков. Финальный таймер: три минуты. Поменяйтесь бумагами. Кто написал больше уникальных слов, побеждает.',
        },
        {
          tag: 'Пары',
          title: 'Связи на одном устройстве',
          desc: 'Два студента на планшете, чередуясь в перетягивании слов в группы. Режим тихой головоломки. Без таймера. Один раунд занимает пять минут.',
        },
        {
          tag: 'Индивидуально',
          title: 'Ежедневная головоломка в одиночку',
          desc: 'Каждый студент получает вкладку в браузере. Одна маленькая головоломка из слов. Они решают её в своём темпе. Без конкуренции. Просто думают.',
        },
      ],
    },
  ],
  faqs: [
    {
      q: 'Нужно ли студентам входить в систему или создавать аккаунты?',
      a: 'Нет. Для игры всего класса вы создаёте комнату. Студенты присоединяются с кодом. Никакого email, никаких аккаунтов, никаких паролей.',
    },
    {
      q: 'Что делать, если у нас кончатся идеи в середине?',
      a: 'Измените режим игры. Вы играли в поиск слов? Перейти на связи. Один блок из 20 минут, новая головоломка, перезагрузить энергию.',
    },
    {
      q: 'Могу ли я играть с детьми, которые читают ниже уровня?',
      a: 'Да. Вы можете установить сложность и длину слова. Короткие слова для молодых читателей. Вы контролируете доску, поэтому можете пропустить сложные головоломки в конце блока.',
    },
    {
      q: 'Сколько устройств мне действительно нужно?',
      a: 'Всего одно. Проектор и либо компьютер, планшет или интерактивная доска. Вы его контролируете. Все остальные смотрят и кричат ответы.',
    },
    {
      q: 'Что если интернет отключен?',
      a: 'Эти игры нуждаются в интернете. Если ваш отключен, используйте тихие бумажные игры выше или переходите к настенным играм: Виселица, 20 вопросов или цепочка рифм.',
    },
    {
      q: 'Должен ли я вести счёт?',
      a: 'Нет. Игра ведёт его. Но вы можете отключить отображение счёта, если ваш класс лучше работает без таблицы лидеров.',
    },
    {
      q: 'Можно ли использовать эти игры для чего-то кроме переменки?',
      a: 'Конечно. Мозговые перерывы, конец урока, дождливые дни или пятиминутные заполнители. Один план из 20 минут работает.',
    },
  ],
  labels: {
    faqTitle: 'Вопросы о домашней переменке',
    relatedTitle: 'Связанные ресурсы',
  },
  related: [
    { href: '/education/brain-breaks-word-games', label: 'Мозговые перерывы со словесными играми', accent: 'lime' },
    { href: '/education/games-for-teachers', label: 'Игры для учителей', accent: 'purple' },
    { href: '/education/classroom-game', label: 'Игры для всего класса', accent: 'pink' },
    { href: '/education', label: 'Центр образования', accent: 'cyan' },
  ],
  breadcrumb: {
    home: 'Дом',
    hub: 'Образование',
    current: 'Домашние игры на переменах',
  },
  learning: {
    educationalUse: ['Classroom Activity'],
    educationalLevel: ['Primary', 'Secondary'],
    typicalAgeRange: '6-13',
    teaches: 'Распознавание слов, словарный запас, совместное решение проблем, управление временем в структурированной игре.',
    timeRequired: 'PT20M',
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

export function getIndoorRecessContent(locale: string): EducationLandingContent {
  return MAP[locale] ?? EN;
}
