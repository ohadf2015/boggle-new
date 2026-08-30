import type { EducationLandingContent } from '@/lib/seo/educationLanding';

const EN: EducationLandingContent = {
  accent: 'purple',
  meta: {
    title: 'First Day of School Icebreakers | LexiClash',
    description:
      'Classroom icebreaker games that get quiet rooms talking. Low-pressure word games for your first day—no names to memorize, no one on the spot.',
    keywords: [
      'first day of school icebreakers',
      'back to school icebreaker games',
      'get to know you games',
      'classroom icebreakers',
      'name games for the classroom',
      'first day of school activities',
      'icebreakers for middle school',
    ],
  },
  hero: {
    facts: ['Free to start', 'No sign-up for students', 'Works on any device'],
    h1: { part1: 'First Day of School', highlight: 'Icebreakers', part2: 'That Actually Work' },
    subtitle: 'A 15-minute word-game plan: quiet room → whole class talking, names known.',
    primaryCta: { label: 'Create a Classroom', href: '/education' },
    secondaryCta: { label: 'Try a Game', href: '/education/games-for-teachers' },
  },
  answer: {
    question: 'What is a good icebreaker activity for the first day of school?',
    answer:
      'A whole-class word game where all students play together on shared letters—no individual spotlights, no waiting turns. LexiClash gives teachers a live board and students a low-pressure way to talk, discover names, and feel the room shift from silence to energy in under fifteen minutes.',
  },
  sections: [
    {
      kind: 'steps',
      title: 'Your First 15 Minutes',
      intro: 'Real times. Real moves. From dead silence to "Wait, what\'s your name again?"',
      items: [
        {
          step: '0:00–1:00',
          focus: 'Setup',
          activity:
            'Write the class join code on the board. Say: "Go to lexiclash.live, enter this code. You don\'t need an email." Give 30 seconds for devices. Start the game when most devices show.',
        },
        {
          step: '1:00–4:00',
          focus: 'First round',
          activity:
            'A grid of letters appears. Students find words and call them out (or type, if you\'re not using voice). The board fills up. You watch which row is which kid: "Oh, Maya found five words already."',
        },
        {
          step: '4:00–5:30',
          focus: 'First pause',
          activity:
            'Pause the game. Call out a handful of names you just caught: "Who found STORM? Yo, Marcus." Quick back-and-forth, not a formal intro. Names start to stick.',
        },
        {
          step: '5:30–12:00',
          focus: 'Play two more rounds',
          activity:
            'Two fresh grids. Faster now—students know the rhythm. You\'re spotting the quiet ones, the fast ones, the word-nerds. More names landing naturally.',
        },
        {
          step: '12:00–15:00',
          focus: 'Wrap and name-check',
          activity:
            'End the game. Ask: "Thumbs up if you know three new names." Most hands stay up. You\'ve got a room that was silent 15 minutes ago talking and laughing. Done.',
        },
      ],
    },
    {
      kind: 'wordlist',
      title: 'Word Bank by Prompt (if playing async or as homework)',
      intro: 'Students can also play solo with these groupings. Give them one prompt, 1–2 minutes to find as many words as they can.',
      groups: [
        {
          label: 'Words about summer',
          words: [
            'beach',
            'warm',
            'friend',
            'sleep',
            'swim',
            'trip',
            'sun',
            'free',
            'play',
            'relax',
            'adventure',
            'camp',
          ],
        },
        {
          label: 'Words about you (adjectives)',
          words: [
            'quiet',
            'funny',
            'smart',
            'kind',
            'brave',
            'weird',
            'fast',
            'calm',
            'loud',
            'creative',
            'shy',
            'strong',
          ],
        },
        {
          label: 'Words about what you like',
          words: ['read', 'draw', 'music', 'sport', 'game', 'sleep', 'eat', 'code', 'dance', 'build'],
        },
        {
          label: 'Words about school',
          words: ['desk', 'class', 'teacher', 'friend', 'lunch', 'bell', 'book', 'test', 'recess', 'grade'],
        },
      ],
    },
    {
      kind: 'features',
      title: 'How Teachers Use This',
      items: [
        {
          icon: 'users',
          text: 'Whole class, no waiting. All 25 kids hunt at once, all on the same board. No one reads aloud alone.',
        },
        {
          icon: 'monitor',
          text: 'You see names and faces at the same time—your brain ties them together automatically.',
        },
        {
          icon: 'clock',
          text: '15 minutes, not an hour. Icebreaker + momentum. You can still teach the rest of the period.',
        },
        {
          icon: 'zap',
          text: 'No preparation. No worksheets. No speeches. Just a game board and "Go."',
        },
        {
          icon: 'wifi',
          text: 'Works on Chromebooks, phones, tablets, projector. Room too old for anything else? Bring your own device.',
        },
        {
          icon: 'sparkles',
          text: 'Shy students say names later. Loud students carry the energy. Everyone gets known.',
        },
      ],
    },
  ],
  faqs: [
    {
      q: 'What about students who don\'t want to speak up?',
      a: 'They\'re in. They find words silently. You notice the board fill up under their name. The pressure to "introduce yourself" is gone—you just see who they are in real time. Some kids talk less in round one, more in round two. That\'s how it works.',
    },
    {
      q: 'Can I use this if students already know each other?',
      a: 'Yes. It builds names into faces, not just names into a list. Plus, a fresh class mix (even in repeat years) creates enough distance that the low-pressure intro still lands.',
    },
    {
      q: 'What grade levels does this work for?',
      a: 'Elementary through high school. Adjust the language: younger kids hunt simpler words; older kids hunt longer words or play with a theme filter. One game, many speeds.',
    },
    {
      q: 'Can I play this asynchronously?',
      a: 'Yes. Give students a join code, a prompt (e.g., "Find words about summer"), and a deadline. They play on their own time. Less icebreaker energy, more asynchronous see-what-they-know.',
    },
    {
      q: 'What if a student doesn\'t have a device?',
      a: 'Pair them with a neighbor, or they help that pair hunt. They\'re still known. Still part of the room.',
    },
    {
      q: 'Can I use this for ESL or multilingual classes?',
      a: 'Absolutely. Younger learners hunt shorter words; advanced learners hunt by meaning. Post the prompt in English or the home language.',
    },
    {
      q: 'How do I keep it moving?',
      a: 'Set a timer. Two minutes per round, not ten. Kids move fast once they get the shape of the game. Spot a few names out loud between rounds to keep you engaged and them known.',
    },
  ],
  labels: { faqTitle: 'Asked and Answered', relatedTitle: 'More Icebreaker Ideas' },
  related: [
    { href: '/education/games-for-teachers', label: 'Classroom Game Ideas', accent: 'lime' },
    { href: '/education/esl-word-games', label: 'Word Games for Language Learners', accent: 'cyan' },
    { href: '/education/brain-breaks-word-games', label: 'Brain Breaks with Words', accent: 'lime' },
    { href: '/education', label: 'Back to Education', accent: 'pink' },
  ],
  breadcrumb: { home: 'Home', hub: 'Education', current: 'First Day Icebreakers' },
  learning: {
    educationalUse: ['Classroom Activity'],
    educationalLevel: ['Primary', 'Secondary'],
    typicalAgeRange: '8-16',
    teaches: 'social cohesion, vocabulary in context, rapid name learning',
    timeRequired: 'PT15M',
  },
};

const HE: EducationLandingContent = {
  accent: 'purple',
  meta: {
    title: 'משחקי שובר קרח ליום הראשון | לקסיקלאש',
    description:
      'משחקי מילים לכיתה שכוללים בחורים שקטים. משחקים ללא לחץ ביום הראשון של בית הספר—ללא שמות שצריך לזכור, אף אחד לא בחזית.',
    keywords: [
      'משחקי שובר קרח לכיתה',
      'משחקי היכרות לתלמידים',
      'משחקי מילים בכיתה',
      'פעילויות יום ראשון בבית ספר',
      'משחקים לחטיבת ביניים',
      'שובר קרח בן הספר',
      'משחקי תקשורת בכיתה',
    ],
  },
  hero: {
    facts: ['בחינם להתחלה', 'ללא הרשמה לתלמידים', 'עובד בכל מכשיר'],
    h1: { part1: 'יום ראשון', highlight: 'שובר קרח', part2: 'שבעצם עובד' },
    subtitle: 'תכנית משחק מילים של 15 דקות: כיתה שקטה → כיתה שמדברת. שמות ידועים.',
    primaryCta: { label: 'צור כיתה', href: '/education' },
    secondaryCta: { label: 'נסה משחק', href: '/education/games-for-teachers' },
  },
  answer: {
    question: 'מה משחק שובר קרח טוב ביום הראשון בבית הספר?',
    answer:
      'משחק מילים של הכיתה כולה על אותן אותיות משותפות—אין בדיקה יחידנית, אין חכה בתור. לקסיקלאש נותן למורה לוח חי ולתלמידים דרך ללא לחץ לדברים, לגלות שמות, ולהרגיש את הכיתה משתנה מדממה לאנרגיה תוך פחות מ-15 דקות.',
  },
  sections: [
    {
      kind: 'steps',
      title: 'ה-15 דקות הראשונות שלך',
      intro: 'זמנים אמיתיים. צעדים אמיתיים. מדממה מוחלטת ל"רגע, מה השם שלך?"',
      items: [
        {
          step: '0:00–1:00',
          focus: 'הכנה',
          activity:
            'כתוב את קוד הכיתה בלוח. אמור: "בואו ללקסיקלאש, הכניסו את הקוד הזה. אתם לא צריכים דוא״ל." תן 30 שניות לכללים. התחל את המשחק כשרוב המכשירים מוכנים.',
        },
        {
          step: '1:00–4:00',
          focus: 'סיבוב ראשון',
          activity:
            'טבלה של אותיות מופיעה. תלמידים מוצאים מילים ומצעיקים (או מקלידים). הלוח מתמלא. אתה רואה איזה שורה היא איזה ילד: "אוו, דניאל מצא חמש מילים כבר."',
        },
        {
          step: '4:00–5:30',
          focus: 'הפסקה ראשונה',
          activity:
            'עצור את המשחק. קרא כמה שמות שתפסת: "מי מצא סערה? הו, שירה." דיאלוג מהיר, לא הצגה פורמלית. שמות מתחילים להיתקע.',
        },
        {
          step: '5:30–12:00',
          focus: 'שחק עוד שתי סיבובים',
          activity:
            'שני לוחות טריים. מהר יותר עכשיו—תלמידים יודעים את הקצב. אתה תופס את השקטים, את המהירים, את מנפציים. עוד שמות חדשים בטבעיות.',
        },
        {
          step: '12:00–15:00',
          focus: 'סיום וביקורת שמות',
          activity:
            'סיים את המשחק. שאל: "אצבע למעלה אם אתם יודעים שלושה שמות חדשים." רוב הידיים עולות. כיתה שהיתה שקטה לפני 15 דקות מדברת וצוחקת. סיום.',
        },
      ],
    },
    {
      kind: 'wordlist',
      title: 'בנק מילים לפי נושא',
      intro: 'תלמידים יכולים גם לשחק בודדים עם הקבוצות האלה. תן להם נושא אחד, דקה או שתיים למצוא כמה מילים יכלו.',
      groups: [
        {
          label: 'מילים על החופש',
          words: [
            'חוף',
            'חם',
            'חברה',
            'שינה',
            'שחייה',
            'טיול',
            'שמש',
            'חופש',
            'משחק',
            'הנאה',
            'הרפתקה',
            'מחנה',
          ],
        },
        {
          label: 'מילים על עצמך (תארים)',
          words: ['שקט', 'מצחיק', 'חכם', 'אדיב', 'אמיץ', 'מוזר', 'מהיר', 'צנוע', 'קולני', 'יצירתי', 'שונה', 'חזק'],
        },
        {
          label: 'מילים על מה שאתה אוהב',
          words: ['קרא', 'צייר', 'מוסיקה', 'ספורט', 'משחק', 'שינה', 'אכל', 'בנה', 'רקוד', 'קוד'],
        },
        {
          label: 'מילים על בית הספר',
          words: ['שולחן', 'כיתה', 'מורה', 'חברה', 'חצי', 'פעמון', 'ספר', 'בחינה', 'הפסקה', 'ציון'],
        },
      ],
    },
    {
      kind: 'features',
      title: 'איך מורים משתמשים בזה',
      items: [
        {
          icon: 'users',
          text: 'כיתה שלמה, ללא חכה. כל 25 ילדים ציידים בו זמנית, הכל על אותו לוח. אף אחד לא קורא בודד.',
        },
        {
          icon: 'monitor',
          text: 'אתה רואה שמות ופנים בו זמנית—המוח שלך קושר אותם באופן אוטומטי.',
        },
        {
          icon: 'clock',
          text: '15 דקות, לא שעה. שובר קרח + תנופה. אתה עדיין יכול ללמד את שאר המחזור.',
        },
        {
          icon: 'zap',
          text: 'אין הכנה. אין דפי עבודה. אין נאומים. רק לוח משחק ו"בואו".',
        },
        {
          icon: 'wifi',
          text: 'עובד בכל מחשב, טלפון, טאבלט, מקרן. חדר ישן מדי לכל דבר? הביא את המכשיר שלך.',
        },
        {
          icon: 'sparkles',
          text: 'תלמידים שקטים מדברים שמות מאוחר יותר. תלמידים קולניים נושאים אנרגיה. כולם מוכרים.',
        },
      ],
    },
  ],
  faqs: [
    {
      q: 'מה לגבי תלמידים שלא רוצים להרים קול?',
      a: 'הם בחלק. הם מוצאים מילים בשקט. אתה רואה את הלוח מתמלא תחת שמם. הלחץ ל"הציג את עצמך" נעלם—אתה רק רואה מי הם בזמן אמת. כמה ילדים מדברים פחות בסיבוב ראשון, יותר בשני. כך זה עובד.',
    },
    {
      q: 'האם אוכל להשתמש בזה אם תלמידים כבר מכירים זה את זה?',
      a: 'כן. זה בונה שמות לתוך פנים, לא רק שמות לתוך רשימה. בנוסף, תערובת כיתה טריה (אפילו בשנים חוזרות) יוצרת מרחק מספיק שהקדמה נמוכת לחץ עדיין יוצאת.',
    },
    {
      q: 'עבור איזה גילאים זה עובד?',
      a: 'יסודי דרך תיכון. התאם את השפה: ילדים צעירים יותר ציידים במילים פשוטות יותר; ילדים גדולים יותר ציידים במילים ארוכות יותר או משחקים עם מסנן נושא. משחק אחד, מהירויות רבות.',
    },
    {
      q: 'האם אוכל לשחק בזה בצורה אסינכרונית?',
      a: 'כן. תן לתלמידים קוד הצטרפות, נושא (למשל, "מצא מילים על החופש"), ותאריך יעד. הם משחקים בזמנם שלהם. פחות אנרגיה של שובר קרח, יותר אסינכרונית לראות מה הם יודעים.',
    },
    {
      q: 'מה אם לתלמיד אין מכשיר?',
      a: 'זווגם עם שכן, או הם עוזרים לזוג זה. הם עדיין מוכרים. עדיין חלק מהחדר.',
    },
    {
      q: 'האם אוכל להשתמש בזה לשיעורי אנגלית או כיתות רב-לשוניות?',
      a: 'כן! לומדים צעירים ציידים במילים קצרות יותר; לומדים מתקדמים ציידים לפי משמעות. פרסם את הנושא באנגלית או בשפת האם.',
    },
    {
      q: 'איך אני שומר את זה בתנועה?',
      a: 'הגדר טיימר. שתי דקות לכל סיבוב, לא עשר. ילדים זז מהר כשהם מבינים את צורת המשחק. תפוס כמה שמות קולנו בין סיבובים כדי להישאר מעורב והם מוכרים.',
    },
  ],
  labels: { faqTitle: 'שאל וענה', relatedTitle: 'עוד רעיונות שובר קרח' },
  related: [
    { href: '/education/games-for-teachers', label: 'רעיונות משחקים בכיתה', accent: 'lime' },
    { href: '/education/esl-word-games', label: 'משחקי מילים למלמדי שפות', accent: 'cyan' },
    { href: '/education/brain-breaks-word-games', label: 'הפסקות מוח עם מילים', accent: 'lime' },
    { href: '/education', label: 'חזרה לחינוך', accent: 'pink' },
  ],
  breadcrumb: { home: 'דף הבית', hub: 'חינוך', current: 'שובר קרח ביום ראשון' },
  learning: {
    educationalUse: ['Classroom Activity'],
    educationalLevel: ['Primary', 'Secondary'],
    typicalAgeRange: '8-16',
    teaches: 'cohesion חברתית, אוצר מילים בהקשר, למידת שמות מהירה',
    timeRequired: 'PT15M',
  },
};

const ES: EducationLandingContent = {
  accent: 'purple',
  meta: {
    title: 'Rompehielos del Primer Día | LexiClash',
    description:
      'Juegos de palabras para aulas donde los estudiantes están callados. Actividades sin presión para el primer día—sin listas de nombres, nadie en la mira.',
    keywords: [
      'rompehielos para el aula',
      'juegos de conocimiento para estudiantes',
      'juegos de palabras en clase',
      'actividades del primer día',
      'rompehielos para secundaria',
      'dinámicas de presentación',
      'juegos interactivos para aulas',
    ],
  },
  hero: {
    facts: ['Gratis para empezar', 'Sin registro para estudiantes', 'Funciona en cualquier dispositivo'],
    h1: { part1: 'Primer Día', highlight: 'Rompehielos', part2: 'Que En Realidad Funcionan' },
    subtitle:
      'Un plan de 15 minutos: aula silenciosa → toda la clase hablando y con nombres conocidos.',
    primaryCta: { label: 'Crea un Aula', href: '/education' },
    secondaryCta: { label: 'Prueba un Juego', href: '/education/games-for-teachers' },
  },
  answer: {
    question: '¿Cuál es una buena actividad rompehielos para el primer día de clases?',
    answer:
      'Un juego de palabras de toda la aula en letras compartidas—sin presentaciones individuales, sin esperas. LexiClash da a los maestros un tablero en vivo y a los estudiantes una forma sin presión de hablar, descubrir nombres y sentir la aula cambiar de silencio a energía en menos de 15 minutos.',
  },
  sections: [
    {
      kind: 'steps',
      title: 'Tus Primeros 15 Minutos',
      intro: 'Tiempos reales. Movimientos reales. De silencio total a "Espera, ¿cuál es tu nombre?"',
      items: [
        {
          step: '0:00–1:00',
          focus: 'Configuración',
          activity:
            'Escribe el código de aula en el tablero. Di: "Vayan a lexiclash.live e ingresen este código. No necesitan correo electrónico." Da 30 segundos. Comienza el juego cuando la mayoría de dispositivos estén listos.',
        },
        {
          step: '1:00–4:00',
          focus: 'Primera ronda',
          activity:
            'Un tablero de letras aparece. Los estudiantes encuentran palabras y las gritan (o escriben). El tablero se llena. Ves qué fila es qué estudiante: "Mira, Carolina ya encontró cinco palabras."',
        },
        {
          step: '4:00–5:30',
          focus: 'Pausa breve',
          activity:
            'Pausa el juego. Nombra algunos estudiantes que ya identificaste: "¿Quién encontró TORMENTA? Sí, Javier." Rápido, no es formal. Los nombres empiezan a quedarse.',
        },
        {
          step: '5:30–12:00',
          focus: 'Juega dos rondas más',
          activity:
            'Dos tableros nuevos. Más rápido ahora—los estudiantes conocen el ritmo. Ves a los callados, a los rápidos, a los nerds de palabras. Más nombres identificados naturalmente.',
        },
        {
          step: '12:00–15:00',
          focus: 'Cierre y verificación',
          activity:
            'Termina el juego. Pregunta: "¿Levanten la mano si conocen tres nombres nuevos?" La mayoría levanta la mano. Un aula que estaba en silencio hace 15 minutos ahora está hablando y riendo. Listo.',
        },
      ],
    },
    {
      kind: 'wordlist',
      title: 'Banco de Palabras por Tema',
      intro:
        'Los estudiantes también pueden jugar solos con estos temas. Dale uno, 1–2 minutos para encontrar todas las palabras que puedan.',
      groups: [
        {
          label: 'Palabras sobre el verano',
          words: [
            'playa',
            'caliente',
            'amigo',
            'dormir',
            'nadar',
            'viaje',
            'sol',
            'libertad',
            'jugar',
            'relajar',
            'aventura',
            'campamento',
          ],
        },
        {
          label: 'Palabras sobre ti (adjetivos)',
          words: [
            'callado',
            'gracioso',
            'inteligente',
            'amable',
            'valiente',
            'raro',
            'rápido',
            'tranquilo',
            'ruidoso',
            'creativo',
            'tímido',
            'fuerte',
          ],
        },
        {
          label: 'Palabras sobre qué te gusta',
          words: ['leer', 'dibujar', 'música', 'deporte', 'juego', 'dormir', 'comer', 'código', 'bailar', 'construir'],
        },
        {
          label: 'Palabras sobre la escuela',
          words: ['escritorio', 'aula', 'maestro', 'amigo', 'almuerzo', 'timbre', 'libro', 'prueba', 'descanso', 'nota'],
        },
      ],
    },
    {
      kind: 'features',
      title: 'Cómo los Maestros Usan Esto',
      items: [
        {
          icon: 'users',
          text: 'Aula completa, sin esperas. Los 25 estudiantes buscan simultáneamente, todos en el mismo tablero. Nadie habla solo.',
        },
        {
          icon: 'monitor',
          text: 'Ves nombres y caras al mismo tiempo—tu cerebro los conecta automáticamente.',
        },
        {
          icon: 'clock',
          text: '15 minutos, no una hora. Rompehielos + impulso. Aún puedes enseñar el resto de la clase.',
        },
        {
          icon: 'zap',
          text: 'Sin preparación. Sin hojas de trabajo. Sin discursos. Solo un tablero y "Vamos".',
        },
        {
          icon: 'wifi',
          text: 'Funciona en Chromebooks, teléfonos, tabletas, proyectores. ¿Aula demasiado vieja? Trae tu propio dispositivo.',
        },
        {
          icon: 'sparkles',
          text: 'Los estudiantes callados hablan después. Los ruidosos llevan la energía. Todos se conocen.',
        },
      ],
    },
  ],
  faqs: [
    {
      q: '¿Qué pasa con los estudiantes que no quieren hablar?',
      a: 'Están dentro. Encuentran palabras en silencio. Ves el tablero llenarse con su nombre. La presión de "presentarse" desaparece—solo ves quiénes son en tiempo real. Algunos hablan menos la ronda uno, más la ronda dos. Así funciona.',
    },
    {
      q: '¿Puedo usarlo si los estudiantes ya se conocen?',
      a: 'Sí. Conecta nombres con caras, no solo nombres con una lista. Plus, una mezcla fresca de aula (incluso en años repetidos) crea suficiente distancia para que la introducción sin presión siga funcionando.',
    },
    {
      q: '¿Para qué grupos de edad funciona?',
      a: 'Primaria hasta secundaria. Ajusta el idioma: estudiantes más jóvenes buscan palabras más simples; mayores buscan palabras más largas o juegan con un filtro temático. Un juego, muchas velocidades.',
    },
    {
      q: '¿Puedo usarlo de forma asincrónica?',
      a: 'Sí. Dale a los estudiantes un código, un tema (ej. "Encuentra palabras sobre el verano") y una fecha límite. Juegan en su propio tiempo. Menos energía de rompehielos, más asincrónico y descubre qué saben.',
    },
    {
      q: '¿Qué si un estudiante no tiene dispositivo?',
      a: 'Emparéjalo con un compañero, o que ayude a ese equipo. Aún se lo conocerá. Aún parte del aula.',
    },
    {
      q: '¿Puedo usar esto para clases de ESL o multilingües?',
      a: 'Absolutamente. Estudiantes más jóvenes buscan palabras más cortas; avanzados buscan por significado. Publica el tema en inglés o en la lengua materna.',
    },
    {
      q: '¿Cómo mantengo el movimiento?',
      a: 'Establece un temporizador. Dos minutos por ronda, no diez. Los niños se mueven rápido una vez que entienden el flujo. Nombra a unos pocos estudiantes entre rondas para mantenerte involucrado y a ellos conocidos.',
    },
  ],
  labels: { faqTitle: 'Preguntas y Respuestas', relatedTitle: 'Más Ideas de Rompehielos' },
  related: [
    { href: '/education/games-for-teachers', label: 'Ideas de Juegos para Aula', accent: 'lime' },
    { href: '/education/esl-word-games', label: 'Juegos de Palabras para Aprendices de Idiomas', accent: 'cyan' },
    {
      href: '/education/brain-breaks-word-games',
      label: 'Descansos Mentales con Palabras',
      accent: 'lime',
    },
    { href: '/education', label: 'Volver a Educación', accent: 'pink' },
  ],
  breadcrumb: { home: 'Inicio', hub: 'Educación', current: 'Rompehielos del Primer Día' },
  learning: {
    educationalUse: ['Classroom Activity'],
    educationalLevel: ['Primary', 'Secondary'],
    typicalAgeRange: '8-16',
    teaches: 'cohesión social, vocabulario en contexto, aprendizaje rápido de nombres',
    timeRequired: 'PT15M',
  },
};

const SV: EducationLandingContent = {
  accent: 'purple',
  meta: {
    title: 'Isbrytarspel för Första Skoldagen | LexiClash',
    description:
      'Ordspel för klassrum där eleverna är tysta. Lågtrycksspel för första dagen—inga namnlistor, ingen står i centrum.',
    keywords: [
      'isbrytarspel klassrum',
      'presentationsspel elever',
      'ordspel för klass',
      'första skoldagen aktiviteter',
      'isbrytare mellanstadiet',
      'elevpresentationer',
      'klassrumsspel svenska',
    ],
  },
  hero: {
    facts: ['Gratis att börja', 'Ingen registrering för elever', 'Fungerar på alla enheter'],
    h1: { part1: 'Första Skoldagen', highlight: 'Isbrytare', part2: 'Som Faktiskt Fungerar' },
    subtitle: 'En 15-minutersplan: tyst klassrum → hela klassen pratar. Namn kända.',
    primaryCta: { label: 'Skapa ett Klassrum', href: '/education' },
    secondaryCta: { label: 'Testa ett Spel', href: '/education/games-for-teachers' },
  },
  answer: {
    question: 'Vad är ett bra isbrytarspel för första skoldagen?',
    answer:
      'Ett ordspel för hela klassen på samma bokstäver—ingen enskild framställning, ingen väntan. LexiClash ger lärare ett levande spelbord och eleverna ett lågtrycksätt att prata, lära känna varandra och känna klassrummet gå från tystnad till energi på under 15 minuter.',
  },
  sections: [
    {
      kind: 'steps',
      title: 'Dina Första 15 Minuter',
      intro: 'Riktiga tider. Riktiga drag. Från tystnad till "Vänta, vad heter du?"',
      items: [
        {
          step: '0:00–1:00',
          focus: 'Förberedelse',
          activity:
            'Skriv klassens anslutningskod på tavlan. Säg: "Gå till lexiclash.live och ange denna kod. Ni behöver ingen e-post." Ge 30 sekunder. Starta spelet när de flesta enheterna är redo.',
        },
        {
          step: '1:00–4:00',
          focus: 'Första omgång',
          activity:
            'Ett rutnät med bokstäver visas. Eleverna hittar ord och ropar ut dem (eller skriver). Spelborden fylls. Du ser vilket barn som hittar vad: "Ah, Maya hittade redan fem ord."',
        },
        {
          step: '4:00–5:30',
          focus: 'Första pausen',
          activity:
            'Pausa spelet. Nämn ett par namn du just kom att märka: "Vem hittade STORM? Ja, Marcus." Snabbt samtal, inte en formell presentation. Namn börjar fastna.',
        },
        {
          step: '5:30–12:00',
          focus: 'Spela två omgångar till',
          activity:
            'Två nya rutnät. Snabbare nu—eleverna vet rutinen. Du märker de tysta, de snabba, ordnördarna. Fler namn blir kända naturligt.',
        },
        {
          step: '12:00–15:00',
          focus: 'Avslut och namnkontroll',
          activity:
            'Avsluta spelet. Fråga: "Tummen upp om ni kan tre nya namn." De flesta händer går upp. Ett klassrum som var tyst för 15 minuter sedan pratar och skrattar. Klart.',
        },
      ],
    },
    {
      kind: 'wordlist',
      title: 'Ordbank Efter Tema',
      intro: 'Eleverna kan också spela ensamma med dessa grupper. Ge dem ett tema, 1–2 minuter för att hitta så många ord som möjligt.',
      groups: [
        {
          label: 'Ord om sommaren',
          words: [
            'strand',
            'varm',
            'vän',
            'sova',
            'simma',
            'resa',
            'sol',
            'fritt',
            'leka',
            'vila',
            'äventyr',
            'läger',
          ],
        },
        {
          label: 'Ord om dig (adjektiv)',
          words: [
            'tyst',
            'rolig',
            'smart',
            'snäll',
            'modig',
            'konstigt',
            'snabb',
            'lugn',
            'högljudd',
            'kreativ',
            'blyg',
            'stark',
          ],
        },
        {
          label: 'Ord om vad du gillar',
          words: ['läsa', 'rita', 'musik', 'sport', 'spel', 'sova', 'äta', 'koda', 'dansa', 'bygga'],
        },
        {
          label: 'Ord om skolan',
          words: ['bänk', 'klass', 'lärare', 'vän', 'lunch', 'klocka', 'bok', 'prov', 'rast', 'betyg'],
        },
      ],
    },
    {
      kind: 'features',
      title: 'Hur Lärare Använder Det Här',
      items: [
        {
          icon: 'users',
          text: 'Hela klassen, ingen väntan. Alla 25 elever jagar samtidigt, alla på samma spelbord. Ingen läser ensam.',
        },
        {
          icon: 'monitor',
          text: 'Du ser namn och ansikten samtidigt—din hjärna kopplar dem automatiskt.',
        },
        {
          icon: 'clock',
          text: '15 minuter, inte en timme. Isbrytare + fart framåt. Du kan fortfarande undervisa resten av lektionen.',
        },
        {
          icon: 'zap',
          text: 'Ingen förberedelse. Inga arbetsblad. Inga tal. Bara ett spelbord och "Börja".',
        },
        {
          icon: 'wifi',
          text: 'Fungerar på Chromebooks, telefoner, surfplattor, projektor. Klassrum för gammalt för allt annat? Ta med din egen enhet.',
        },
        {
          icon: 'sparkles',
          text: 'Tysta elever pratar senare. Högljudda elever bär energin. Alla blir kända.',
        },
      ],
    },
  ],
  faqs: [
    {
      q: 'Vad med elever som inte vill tala?',
      a: 'De är med. De hittar ord tyst. Du ser spelborden fyllas med deras namn. Trycket att "presentera sig själv" försvinner—du ser bara vilka de är i realtid. Några elever pratar mindre i runda ett, mer i två. Så fungerar det.',
    },
    {
      q: 'Kan jag använda detta om eleverna redan känner varandra?',
      a: 'Ja. Det kopplar namn till ansikten, inte bara namn till en lista. Plus skapar en ny klasssammansättning (även under återkommande år) tillräckligt avstånd för att lågtryckspresentationen fortfarande fungerar.',
    },
    {
      q: 'Vilka åldersgrupper fungerar det för?',
      a: 'Grundskola till gymnasium. Justera språket: yngre elever jagar enklare ord; äldre jagar längre ord eller spelar med ett temafilter. Ett spel, många hastigheter.',
    },
    {
      q: 'Kan jag spela detta asynkront?',
      a: 'Ja. Ge eleverna en anslutningskod, ett tema (t.ex. "Hitta ord om sommaren") och en deadline. De spelar på sin egen tid. Mindre isbrytarenergi, mer asynchron upptäck vad de vet.',
    },
    {
      q: 'Vad om en elev inte har en enhet?',
      a: 'Para ihop dem med en klasskamrat, eller de hjälper det paret. De är fortfarande kända. Fortfarande del av klassrummet.',
    },
    {
      q: 'Kan jag använda detta för ESL eller flerspråkiga klasser?',
      a: 'Absolut. Yngre elever jagar kortare ord; avancerade elever jagar efter betydelse. Posta temat på engelska eller hemspråket.',
    },
    {
      q: 'Hur håller jag det i gång?',
      a: 'Ställ en timer. Två minuter per omgång, inte tio. Barn rör sig fort när de förstår spelets rytm. Nämn ett par namn mellan omgångar för att hålla dig engagerad och dem kända.',
    },
  ],
  labels: { faqTitle: 'Frågat och Svarat', relatedTitle: 'Fler Isbrytare' },
  related: [
    { href: '/education/games-for-teachers', label: 'Klassrumsspel Idéer', accent: 'lime' },
    { href: '/education/esl-word-games', label: 'Ordspel för Språkinlärare', accent: 'cyan' },
    { href: '/education/brain-breaks-word-games', label: 'Hjärnpauser med Ord', accent: 'lime' },
    { href: '/education', label: 'Tillbaka till Utbildning', accent: 'pink' },
  ],
  breadcrumb: { home: 'Hem', hub: 'Utbildning', current: 'Första Dagen Isbrytare' },
  learning: {
    educationalUse: ['Classroom Activity'],
    educationalLevel: ['Primary', 'Secondary'],
    typicalAgeRange: '8-16',
    teaches: 'social sammanhållning, ordförråd i sammanhang, snabb namnlärning',
    timeRequired: 'PT15M',
  },
};

const JA: EducationLandingContent = {
  accent: 'purple',
  meta: {
    title: '学年始め のアイスブレーカー | レキシクラッシュ',
    description:
      '静かな教室を活気づけるゲーム。初日に最適—名前を覚える必要なし、誰も目立たない。',
    keywords: [
      'アイスブレーカー 教室',
      'クラスメイト 仲良くなる',
      '言葉ゲーム 授業',
      '学年始め 活動',
      '中学生 クラス活動',
      'クラス紹介 ゲーム',
      '言葉遊び 学級',
    ],
  },
  hero: {
    facts: ['無料で開始', '学生の登録不要', 'どのデバイスでも利用可能'],
    h1: { part1: '学年始め', highlight: 'アイスブレーカー', part2: 'で、その場が活気づく' },
    subtitle: '15 分計画：静かな教室 → みんなが話す。名前が知られている。',
    primaryCta: { label: 'クラスを作成する', href: '/education' },
    secondaryCta: { label: 'ゲームを試す', href: '/education/games-for-teachers' },
  },
  answer: {
    question: '学年始めのアイスブレーカーに良い活動は何ですか?',
    answer:
      'クラス全体で共有の文字を探すゲーム。誰も一人で発表することなく、待つこともありません。レキシクラッシュは先生にライブボードを、学生には低圧力で話し、名前を発見し、教室が沈黙から活気へ変わるのを感じられる 15 分以下の方法を提供します。',
  },
  sections: [
    {
      kind: 'steps',
      title: '最初の 15 分間',
      intro: '実際の時間。実際の手順。完全な沈黙から「ちょっと、名前は何でした？」まで。',
      items: [
        {
          step: '0:00–1:00',
          focus: '準備',
          activity:
            'クラスコードをボードに書きます。「lexiclash.live に進んで、このコードを入力してください。メールアドレスは不要です」と言ってください。30 秒待ちます。ほとんどのデバイスが準備できたらゲームを開始します。',
        },
        {
          step: '1:00–4:00',
          focus: '最初のラウンド',
          activity:
            '文字のグリッドが表示されます。学生は単語を見つけて叫びます（または入力します）。ボードが埋まります。あなたは各行が誰の子かを見ます。「あ、田中さんはもう 5 個見つけた。」',
        },
        {
          step: '4:00–5:30',
          focus: '最初の一休み',
          activity:
            'ゲームを一時停止します。見つけた何人かの名前を呼びます：「誰が ARASHI を見つけましたか？そう、太郎。」短い会話、正式な紹介ではありません。名前が粘り始めます。',
        },
        {
          step: '5:30–12:00',
          focus: 'さらに 2 ラウンドプレイ',
          activity:
            '2 つの新しいグリッド。今は速い—学生はリズムを知っています。あなたは静かな子たち、速い子たち、言葉オタクを見ます。より多くの名前が自然に知られています。',
        },
        {
          step: '12:00–15:00',
          focus: '終了と名前チェック',
          activity:
            'ゲームを終了します。「3 つの新しい名前を知っていたら、手を上げてください」と尋ねます。ほとんどの手が上がります。15 分前に静かだった教室が話し、笑っています。完了。',
        },
      ],
    },
    {
      kind: 'wordlist',
      title: 'テーマ別単語リスト',
      intro: '学生は、これらのグループで一人で遊ぶこともできます。1 つのテーマを与えて、できるだけ多くの単語を見つけるために 1～2 分を与えます。',
      groups: [
        {
          label: '休みの言葉',
          words: [
            'ビーチ',
            '暖かい',
            '友達',
            '寝る',
            '泳ぐ',
            '旅行',
            '太陽',
            '自由',
            '遊ぶ',
            'リラックス',
            '冒険',
             'キャンプ',
          ],
        },
        {
          label: 'あなたについての言葉（形容詞）',
          words: [
            '静か',
            '面白い',
            '頭がいい',
            '優しい',
            '勇敢な',
            '変わった',
            '速い',
            '落ち着いた',
            'うるさい',
            '創造的',
            '恥ずかしがり屋',
            '強い',
          ],
        },
        {
          label: 'あなたが好きなもの',
          words: ['読む', '描く', '音楽', 'スポーツ', 'ゲーム', '寝る', '食べる', 'コード', '踊る', '作る'],
        },
        {
          label: '学校について',
          words: ['机', 'クラス', '先生', '友達', 'お昼', 'ベル', '本', 'テスト', '休み', 'グレード'],
        },
      ],
    },
    {
      kind: 'features',
      title: '先生がどのように使用するか',
      items: [
        {
          icon: 'users',
          text: 'クラス全体、待つことなし。25 人全員が同時に、同じボードで。誰も一人で読まない。',
        },
        {
          icon: 'monitor',
          text: '名前と顔を同時に見る—あなたの脳は自動的にそれらを結びつけます。',
        },
        {
          icon: 'clock',
          text: '15 分、1 時間ではない。アイスブレーカー + 推進力。残りの期間を教えることができます。',
        },
        {
          icon: 'zap',
          text: '準備なし。ワークシートなし。スピーチなし。ゲームボードと「始めましょう」だけ。',
        },
        {
          icon: 'wifi',
          text: 'Chromebook、電話、タブレット、プロジェクターで動作します。古い教室？独自のデバイスを持ってきてください。',
        },
        {
          icon: 'sparkles',
          text: '静かな学生は後で話す。大声の学生がエネルギーを運ぶ。誰もが知られている。',
        },
      ],
    },
  ],
  faqs: [
    {
      q: '声を出したくない学生はどうですか?',
      a: '彼らは含まれています。彼らは静かに言葉を見つけます。ボードが彼らの名前の下で満たされるのを見ます。「自分を紹介する」というプレッシャーは消えます—あなたはリアルタイムで彼らが誰であるかを見ているだけです。いくつかの学生はラウンド 1 で少なく話し、2 で多く話します。そういうものです。',
    },
    {
      q: '学生がすでに互いに知っている場合、これを使用できますか?',
      a: 'はい。名前をリストに結びつけるのではなく、名前を顔に結びつけます。さらに、新鮮なクラス構成（繰り返し年でも）は十分な距離を作成し、低圧力の紹介がまだ機能します。',
    },
    {
      q: 'どの年齢グループで機能しますか?',
      a: '小学校から高校まで。言語を調整する：より若い学生は簡単な単語を探します。年上の学生はより長い単語を探すか、テーマフィルター付きで遊びます。1 つのゲーム、多くの速度。',
    },
    {
      q: '非同期でこれをプレイできますか?',
      a: 'はい。学生に接続コード、テーマ（例：「夏についての単語を探す」）、および期限を与えます。彼らは自分たちのペースで遊びます。アイスブレーカー エネルギーが少なく、彼らが知ることをより多く発見できます。',
    },
    {
      q: '学生がデバイスを持っていない場合はどうなりますか?',
      a: 'それらを隣人とペアにします。彼らは知られています。それでもクラスルームの一部です。',
    },
    {
      q: 'これを ESL または多言語クラスに使用できますか?',
      a: 'もちろん。より若い学習者は短い単語を探します。上級学習者は意味を探します。テーマを英語または母国語で投稿します。',
    },
    {
      q: 'どのように進め続けますか?',
      a: 'タイマーを設定します。1 ラウンドあたり 2 分、10 分ではありません。子どもたちはゲームのリズムを理解すると速く動きます。ラウンド間に何人かの学生を指名して、関与し続け、彼らを知らせます。',
    },
  ],
  labels: { faqTitle: '質問と回答', relatedTitle: 'その他のアイスブレーカー' },
  related: [
    { href: '/education/games-for-teachers', label: 'クラスルームゲームのアイデア', accent: 'lime' },
    { href: '/education/esl-word-games', label: '言語学習者向けの単語ゲーム', accent: 'cyan' },
    { href: '/education/brain-breaks-word-games', label: '言葉による脳の休憩', accent: 'lime' },
    { href: '/education', label: '教育に戻る', accent: 'pink' },
  ],
  breadcrumb: { home: 'ホーム', hub: '教育', current: '学年始めアイスブレーカー' },
  learning: {
    educationalUse: ['Classroom Activity'],
    educationalLevel: ['Primary', 'Secondary'],
    typicalAgeRange: '8-16',
    teaches: '社会的結束、文脈での語彙、迅速な名前学習',
    timeRequired: 'PT15M',
  },
};

const RU: EducationLandingContent = {
  accent: 'purple',
  meta: {
    title: 'Ледокольные игры для первого дня школы | LexiClash',
    description:
      'Словесные игры для класса, где ученики молчат. Игры без давления на первый день—без списков имен, никто не в центре внимания.',
    keywords: [
      'ледокольные игры класс',
      'игры знакомства ученики',
      'словесные игры класс',
      'первый день школы активность',
      'ледокольные среднюю школу',
      'представление учеников',
      'игры класс общения',
    ],
  },
  hero: {
    facts: ['Бесплатно начать', 'Без регистрации учеников', 'Работает на любом устройстве'],
    h1: { part1: 'День Знаний', highlight: 'Ледокол', part2: 'Который На Самом Деле Работает' },
    subtitle: 'План 15 минут: молчаливый класс → весь класс говорит. Имена известны.',
    primaryCta: { label: 'Создайте Класс', href: '/education' },
    secondaryCta: { label: 'Попробуйте Игру', href: '/education/games-for-teachers' },
  },
  answer: {
    question: 'Какая хорошая ледокольная игра на первый день в школе?',
    answer:
      'Словесная игра для всего класса на одних и тех же буквах—без индивидуальных выступлений, без ожидания. LexiClash дает учителям живую доску, а ученикам способ без давления говорить, узнавать имена и чувствовать, как класс переходит из тишины в энергию менее чем за 15 минут.',
  },
  sections: [
    {
      kind: 'steps',
      title: 'Ваши Первые 15 Минут',
      intro: 'Реальные времена. Реальные ходы. От полной тишины к «Подождите, как твое имя?»',
      items: [
        {
          step: '0:00–1:00',
          focus: 'Подготовка',
          activity:
            'Напишите код класса на доске. Скажите: «Перейдите на lexiclash.live и введите этот код. Вам не нужна электронная почта.» Дайте 30 секунд. Запустите игру, когда большинство устройств будут готовы.',
        },
        {
          step: '1:00–4:00',
          focus: 'Первый раунд',
          activity:
            'Появляется сетка букв. Ученики находят слова и кричат (или печатают). Доска заполняется. Вы видите, какой ученик что находит: «О, Маша уже нашла пять слов.»',
        },
        {
          step: '4:00–5:30',
          focus: 'Первая пауза',
          activity:
            'Приостановите игру. Назовите несколько имен, которые вы только что заметили: «Кто нашел БУРЯ? Да, Петя.» Быстрый разговор, не официальное представление. Имена начинают запоминаться.',
        },
        {
          step: '5:30–12:00',
          focus: 'Еще два раунда',
          activity:
            'Две новые сетки. Быстрее сейчас—ученики знают ритм. Вы замечаете тихих, быстрых, словесных мастеров. Больше имен становятся известны естественным образом.',
        },
        {
          step: '12:00–15:00',
          focus: 'Завершение и проверка имен',
          activity:
            'Закончите игру. Спросите: «Поднимите руку, если узнали три новых имени.» Большинство рук поднимается. Класс, который был молчаливым 15 минут назад, теперь говорит и смеется. Готово.',
        },
      ],
    },
    {
      kind: 'wordlist',
      title: 'Банк Слов По Темам',
      intro:
        'Ученики также могут играть самостоятельно с этими группами. Дайте им одну тему, 1–2 минуты, чтобы найти как можно больше слов.',
      groups: [
        {
          label: 'Слова о лете',
          words: [
            'пляж',
            'теплая',
            'друг',
            'спать',
            'плавать',
            'поездка',
            'солнце',
            'свобода',
            'играть',
            'отдых',
            'приключение',
            'лагерь',
          ],
        },
        {
          label: 'Слова о тебе (прилагательные)',
          words: [
            'тихий',
            'смешной',
            'умный',
            'добрый',
            'смелый',
            'странный',
            'быстрый',
            'спокойный',
            'громкий',
            'творческий',
            'стеснительный',
            'сильный',
          ],
        },
        {
          label: 'Слова о том, что вы любите',
          words: ['читать', 'рисовать', 'музыка', 'спорт', 'игра', 'спать', 'есть', 'код', 'танец', 'строить'],
        },
        {
          label: 'Слова о школе',
          words: ['парта', 'класс', 'учитель', 'друг', 'обед', 'звонок', 'книга', 'тест', 'перемена', 'оценка'],
        },
      ],
    },
    {
      kind: 'features',
      title: 'Как Учителя Используют Это',
      items: [
        {
          icon: 'users',
          text: 'Весь класс, без ожидания. Все 25 учеников ищут одновременно, все на одной доске. Никто не читает в одиночку.',
        },
        {
          icon: 'monitor',
          text: 'Вы видите имена и лица одновременно—ваш мозг автоматически их связывает.',
        },
        {
          icon: 'clock',
          text: '15 минут, не час. Ледокол + импульс. Вы все еще можете учить остальную часть урока.',
        },
        {
          icon: 'zap',
          text: 'Без подготовки. Без рабочих листов. Без речей. Просто игровая доска и «Начнем».',
        },
        {
          icon: 'wifi',
          text: 'Работает на Chromebook, телефонах, планшетах, проекторах. Класс слишком старый? Возьмите свое устройство.',
        },
        {
          icon: 'sparkles',
          text: 'Тихие ученики говорят позже. Громкие несут энергию. Все становятся известны.',
        },
      ],
    },
  ],
  faqs: [
    {
      q: 'Что делать, если ученик не хочет говорить?',
      a: 'Они включены. Они находят слова молча. Вы видите, как доска заполняется под их именем. Давление на «представление себя» исчезает—вы просто видите, кто они в реальном времени. Некоторые ученики говорят меньше в первом раунде, больше во втором. Так это работает.',
    },
    {
      q: 'Могу ли я использовать это, если ученики уже знают друг друга?',
      a: 'Да. Это связывает имена с лицами, не только с списком. Кроме того, свежий состав класса (даже в повторяющихся годах) создает достаточно дистанции, чтобы низконапорное введение по-прежнему работало.',
    },
    {
      q: 'Для каких возрастных групп это работает?',
      a: 'Начальная школа до старшей школы. Отрегулируйте язык: младшие ученики ищут более простые слова; старшие ищут более длинные слова или играют с фильтром темы. Одна игра, много скоростей.',
    },
    {
      q: 'Могу ли я играть асинхронно?',
      a: 'Да. Дайте ученикам код, тему (например, «Найди слова о лете») и срок. Они играют в своем темпе. Меньше энергии ледокола, больше асинхронного открытия того, что они знают.',
    },
    {
      q: 'Что если у ученика нет устройства?',
      a: 'Спарьте их с одноклассником или пусть они помогают той паре. Они все еще известны. По-прежнему часть класса.',
    },
    {
      q: 'Могу ли я использовать это для ESL или многоязычных классов?',
      a: 'Абсолютно. Младшие ученики ищут более короткие слова; продвинутые ищут по смыслу. Размещайте тему на английском языке или на родном языке.',
    },
    {
      q: 'Как держать игру в движении?',
      a: 'Установите таймер. Две минуты за раунд, не десять. Дети движутся быстро, как только они понимают ритм игры. Назовите несколько имен между раундами, чтобы оставаться вовлеченным и чтобы ученики были известны.',
    },
  ],
  labels: { faqTitle: 'Вопросы и Ответы', relatedTitle: 'Больше Ледокольных Идей' },
  related: [
    { href: '/education/games-for-teachers', label: 'Идеи Классных Игр', accent: 'lime' },
    { href: '/education/esl-word-games', label: 'Словесные Игры Для Изучающих Язык', accent: 'cyan' },
    { href: '/education/brain-breaks-word-games', label: 'Умственные Перерывы Со Словами', accent: 'lime' },
    { href: '/education', label: 'Назад К Образованию', accent: 'pink' },
  ],
  breadcrumb: { home: 'Главная', hub: 'Образование', current: 'Ледокол День Знаний' },
  learning: {
    educationalUse: ['Classroom Activity'],
    educationalLevel: ['Primary', 'Secondary'],
    typicalAgeRange: '8-16',
    teaches: 'социальная сплоченность, словарный запас в контексте, быстрое изучение имен',
    timeRequired: 'PT15M',
  },
};

const MAP: Record<string, EducationLandingContent> = { en: EN, he: HE, es: ES, sv: SV, ja: JA, ru: RU };

export function getIcebreakersContent(locale: string): EducationLandingContent {
  return MAP[locale] ?? EN;
}
