import { NO_DEVICE, type ClassGameSection } from '@/components/education/ClassGameList';

/**
 * Ten ESL word games for the classroom.
 *
 * Same shape change as the vocabulary page, aimed at a different reader. The ESL
 * teacher's problem is not "which words" but "how do I run this with a room where
 * one student is silent and another is bored" — so these ten are built around the
 * target language and mixed ability, not around definitions and synonyms.
 *
 * Deliberately disjoint from `vocabulary-games-classroom/classGames.ts`: no game name
 * shares a significant word with one on that page, because two near-identical lists on
 * two indexed pages is the doorway pattern the anti-doorway tests exist to prevent.
 *
 * Several of these need no device, and say so on their own row rather than in a
 * headline count that would rot the next time a game changes. `runsWith` is a registry
 * id or NO_DEVICE — never a name invented to make a classic game sound like ours.
 */

export const CLASS_GAME_LOCALES = ['en', 'he', 'es', 'sv', 'ja', 'ru'] as const;
export type ClassGameLocale = (typeof CLASS_GAME_LOCALES)[number];

const SECTIONS: Record<ClassGameLocale, ClassGameSection> = {
  en: {
    heading: '10 ESL word games for the classroom',
    intro:
      'Ten games for a mixed-ability language room, from the quietest warm-up to the loudest. The ones that need no device say so on their own row. The rest run in the browser, in the language you are teaching, judged against that language’s own dictionary rather than a translated English list.',
    labels: { time: 'Time', group: 'Group', drills: 'Drills', setup: 'Setup', rules: 'How to play', onLexiClash: 'On LexiClash' },
    games: [
      {
        name: 'Describe It, Never Name It',
        setup: 'Ten cards, each with one word from this week, face down.',
        rules: 'A student draws a card and describes it in the target language without using the word, its translation, or a gesture. The rest guess. Thirty seconds, then the card goes back and the next student draws.',
        time: '10 min', groupSize: 'Groups of 4–5', drills: 'Circumlocution',
        runsWith: NO_DEVICE,
        runsWithNote: 'No device needed. Circumlocution is the skill that keeps a learner talking when the exact word will not come, and it only trains under the ban.',
      },
      {
        name: 'Spelling Relay',
        setup: 'Two columns on the board, two markers, teams in lines.',
        rules: 'Say a word. The first student writes the first letter, runs back and passes the marker. The team spells it letter by letter, one runner at a time. A team may fix an earlier letter, but only on their own turn.',
        time: '10–15 min', groupSize: 'Two teams', drills: 'Spelling under pressure',
        runsWith: 'spelling',
        runsWithNote: 'The Spelling practice mode drills the same list letter by letter afterwards, for the students the relay moved too fast for.',
      },
      {
        name: 'Same Board, Your Language',
        setup: 'Choose the round’s language when you open the room.',
        rules: 'Everyone plays one shared letter board and finds real words in the target language. Answers are checked against that language’s own dictionary, so a Spanish round scores Spanish and a Hebrew board reads right to left.',
        time: '5–10 min', groupSize: 'Whole class', drills: 'Recognition in the target language',
        runsWith: 'classic',
        runsWithNote: 'Classic mode, with the language set in the create-room dialog. Six languages ship with their own dictionary.',
      },
      {
        name: 'Minimal Pairs Point and Say',
        setup: 'Write six confusable pairs on the board — ship/sheep, live/leave.',
        rules: 'Say one word. Students point at the one they heard. Then reverse it: a student says a word and the class points. The pointing keeps the quiet students in without making them speak first.',
        time: '5–10 min', groupSize: 'Whole class', drills: 'Sound discrimination',
        runsWith: NO_DEVICE,
        runsWithNote: 'No device needed, and better without one — the whole point is your voice and their ears.',
      },
      {
        name: 'One Target Search',
        setup: 'Pick the target word before the round starts.',
        rules: 'The class hunts a single word on a shared board instead of racing for volume. Other words they find still score, but the round is about the one you chose, which slows the room down and gives you something to discuss.',
        time: '5–10 min', groupSize: 'Whole class', drills: 'Sustained attention on one form',
        runsWith: 'word-hunt',
        runsWithNote: 'Word Hunt mode, chosen on the host screen before you start the round.',
      },
      {
        name: 'Act the Verb',
        setup: 'This week’s verbs on slips of paper in a cup.',
        rules: 'A student draws a verb and acts it with no sound. The class calls out guesses in the target language. Accept a wrong tense, then write the right one on the board and move on quickly.',
        time: '10 min', groupSize: 'Whole class', drills: 'Verb recall',
        runsWith: NO_DEVICE,
        runsWithNote: 'No device needed. Works with a beginner group who cannot yet read the list, which is the case a screen game cannot cover.',
      },
      {
        name: 'Support, Core, Challenge Ladder',
        setup: 'Split the list into three tiers before the lesson.',
        rules: 'Every student does the same activity, but on their own tier. Nobody is told which tier they are on. Move a student up mid-lesson when they finish early, and down without comment when they stall.',
        time: '10 min', groupSize: 'Solo, same room', drills: 'The right difficulty per student',
        runsWith: 'warmup',
        runsWithNote: 'The Warm-Up practice mode runs the list at the tier set for each student, so one activity fits the whole spread.',
      },
      {
        name: 'Two-Minute Blitz',
        setup: 'Open the list. Nothing else.',
        rules: 'Two minutes, as many correct answers as each student can manage, then stop dead. Ask three students what their last word was rather than who scored highest, and the room stays with the learner who got fewer.',
        time: '2–5 min', groupSize: 'Solo', drills: 'Fluency and speed',
        runsWith: 'blitz',
        runsWithNote: 'The Blitz practice mode is the timed run; the list is whatever you set for the week.',
      },
      {
        name: 'Letter Wheel Rush',
        setup: 'Put the wheel on the projector.',
        rules: 'Students build words from a ring of letters against the clock. Longer words are worth more, so a strong student is stretched by the same round that a beginner can still score on.',
        time: '5–10 min', groupSize: 'Whole class', drills: 'Word building from constraints',
        runsWith: 'wheel-rush',
        runsWithNote: 'Wheel Rush mode, chosen on the host screen alongside Classic, Word Hunt and Blast.',
      },
      {
        name: 'Read the List Aloud',
        setup: 'Put the week’s list on screen.',
        rules: 'Read down the list together, then each student reads three words alone while the room listens. End by asking which word was hardest to say — not to know, to say. That answer is your pronunciation plan.',
        time: '5 min', groupSize: 'Whole class', drills: 'Pronunciation of the written form',
        runsWith: 'word_list',
        runsWithNote: 'The Word List view shows the week’s words on their own, with nothing to score, which is what makes it usable as a read-aloud.',
      },
    ],
  },

  he: {
    heading: '10 משחקי מילים לאנגלית כשפה זרה בכיתה',
    intro:
      'עשרה משחקים לכיתת שפה עם רמות מעורבות, מהחימום השקט ביותר ועד הרועש. אלה שלא דורשים מכשיר אומרים זאת בשורה שלהם. השאר רצים בדפדפן, בשפה שאתם מלמדים, ונשפטים מול מילון של אותה שפה ולא מול רשימה אנגלית מתורגמת.',
    labels: { time: 'זמן', group: 'הרכב', drills: 'מתרגל', setup: 'הכנה', rules: 'איך משחקים', onLexiClash: 'ב-LexiClash' },
    games: [
      {
        name: 'תארו בלי לומר',
        setup: 'עשרה כרטיסים הפוכים, בכל אחד מילה מהשבוע.',
        rules: 'תלמיד שולף כרטיס ומתאר את המילה בשפת היעד בלי לומר אותה, בלי תרגום ובלי תנועות ידיים. השאר מנחשים. שלושים שניות, ואז הכרטיס חוזר והתלמיד הבא שולף.',
        time: '10 דק׳', groupSize: 'קבוצות של 4–5', drills: 'עקיפה לשונית',
        runsWith: NO_DEVICE,
        runsWithNote: 'לא צריך מכשיר. היכולת להסתדר בלי המילה המדויקת היא מה שממשיך שיחה, והיא מתאמנת רק כשהמילה אסורה.',
      },
      {
        name: 'שליחים לאיות',
        setup: 'שתי עמודות על הלוח, שני טושים, שתי שורות של תלמידים.',
        rules: 'הקריאו מילה. התלמיד הראשון כותב אות אחת, חוזר ומעביר את הטוש. הקבוצה מאייתת אות אחר אות, שליח אחד בכל פעם. מותר לתקן אות קודמת, אבל רק בתור שלכם.',
        time: '10–15 דק׳', groupSize: 'שתי קבוצות', drills: 'איות תחת לחץ',
        runsWith: 'spelling',
        runsWithNote: 'מצב התרגול "איות" מתרגל את אותה רשימה אות אחר אות אחר כך, למי שהמרוץ היה מהיר מדי עבורו.',
      },
      {
        name: 'אותו לוח, השפה שלכם',
        setup: 'בחרו את שפת הסיבוב כשאתם פותחים את החדר.',
        rules: 'כולם משחקים על לוח אותיות משותף ומוצאים מילים אמיתיות בשפת היעד. התשובות נבדקות מול מילון של אותה שפה, כך שסיבוב בספרדית מזכה על ספרדית ולוח עברי נפרס מימין לשמאל.',
        time: '5–10 דק׳', groupSize: 'כל הכיתה', drills: 'זיהוי בשפת היעד',
        runsWith: 'classic',
        runsWithNote: 'מצב קלאסי, עם השפה שנקבעת בחלון פתיחת החדר. שש שפות מגיעות עם מילון משלהן.',
      },
      {
        name: 'זוגות מינימליים: הצביעו ואמרו',
        setup: 'כתבו על הלוח שישה זוגות מבלבלים — ship/sheep, live/leave.',
        rules: 'אמרו מילה אחת. התלמידים מצביעים על מה ששמעו. אחר כך הפכו: תלמיד אומר מילה והכיתה מצביעה. ההצבעה מכניסה גם את השקטים בלי לחייב אותם לדבר ראשונים.',
        time: '5–10 דק׳', groupSize: 'כל הכיתה', drills: 'הבחנה בין צלילים',
        runsWith: NO_DEVICE,
        runsWithNote: 'לא צריך מכשיר, ועדיף בלי — כל העניין הוא הקול שלכם והאוזניים שלהם.',
      },
      {
        name: 'חיפוש מילת יעד אחת',
        setup: 'בחרו את מילת היעד לפני תחילת הסיבוב.',
        rules: 'הכיתה מחפשת מילה אחת על לוח משותף במקום לצבור כמות. מילים אחרות שנמצאות עדיין מזכות, אבל הסיבוב הוא על זו שבחרתם — מה שמאט את הקצב ונותן על מה לדבר.',
        time: '5–10 דק׳', groupSize: 'כל הכיתה', drills: 'ריכוז מתמשך בצורה אחת',
        runsWith: 'word-hunt',
        runsWithNote: 'מצב Word Hunt, שנבחר במסך המארח לפני תחילת הסיבוב.',
      },
      {
        name: 'שחקו את הפועל',
        setup: 'פעלי השבוע על פתקים בכוס.',
        rules: 'תלמיד שולף פועל ומשחק אותו בלי קול. הכיתה קוראת ניחושים בשפת היעד. קבלו זמן שגוי, כתבו את הנכון על הלוח והמשיכו מהר.',
        time: '10 דק׳', groupSize: 'כל הכיתה', drills: 'שליפת פעלים',
        runsWith: NO_DEVICE,
        runsWithNote: 'לא צריך מכשיר. עובד גם עם קבוצת מתחילים שעוד לא קוראת את הרשימה — מקרה שמשחק על מסך לא מכסה.',
      },
      {
        name: 'סולם תמיכה, ליבה ואתגר',
        setup: 'חלקו את הרשימה לשלוש רמות לפני השיעור.',
        rules: 'כל התלמידים עושים את אותה פעילות, כל אחד ברמה שלו. אף אחד לא יודע באיזו רמה הוא. העלו תלמיד באמצע השיעור אם סיים מוקדם, והורידו בלי הערה אם נתקע.',
        time: '10 דק׳', groupSize: 'לבד, באותו חדר', drills: 'רמת קושי מתאימה לכל תלמיד',
        runsWith: 'warmup',
        runsWithNote: 'מצב התרגול "חימום" מריץ את הרשימה ברמה שנקבעה לכל תלמיד, כך שפעילות אחת מתאימה לכל הטווח.',
      },
      {
        name: 'בליץ של שתי דקות',
        setup: 'פתחו את הרשימה. זה הכול.',
        rules: 'שתי דקות, כמה שיותר תשובות נכונות לכל תלמיד, ואז עצירה חדה. שאלו שלושה תלמידים מה הייתה המילה האחרונה שלהם במקום מי צבר הכי הרבה, והכיתה נשארת גם עם מי שצבר פחות.',
        time: '2–5 דק׳', groupSize: 'לבד', drills: 'שטף ומהירות',
        runsWith: 'blitz',
        runsWithNote: 'מצב התרגול "בליץ" הוא הריצה המתוזמנת; הרשימה היא זו שהגדרתם לשבוע.',
      },
      {
        name: 'ריצת גלגל אותיות',
        setup: 'העלו את הגלגל למקרן.',
        rules: 'התלמידים בונים מילים מטבעת אותיות מול שעון. מילים ארוכות שוות יותר, כך שאותו סיבוב מותח תלמיד חזק ועדיין מאפשר למתחיל לצבור.',
        time: '5–10 דק׳', groupSize: 'כל הכיתה', drills: 'בניית מילים מאילוץ',
        runsWith: 'wheel-rush',
        runsWithNote: 'מצב Wheel Rush, שנבחר במסך המארח לצד קלאסי, Word Hunt ו-Blast.',
      },
      {
        name: 'הקריאו את הרשימה בקול',
        setup: 'העלו את רשימת השבוע למסך.',
        rules: 'קראו את הרשימה יחד, ואז כל תלמיד קורא שלוש מילים לבד בזמן שהכיתה מקשיבה. סיימו בשאלה איזו מילה הכי קשה להגייה — לא להבנה, להגייה. התשובה היא תוכנית ההגייה שלכם.',
        time: '5 דק׳', groupSize: 'כל הכיתה', drills: 'הגייה של הצורה הכתובה',
        runsWith: 'word_list',
        runsWithNote: 'תצוגת רשימת המילים מציגה את מילות השבוע לבד, בלי ניקוד ובלי ניקוז תשומת לב — ולכן היא מתאימה להקראה.',
      },
    ],
  },

  es: {
    heading: '10 juegos de palabras en inglés para el aula',
    intro:
      'Diez juegos para un aula de idiomas con niveles mezclados, del calentamiento más silencioso al más ruidoso. Los que no necesitan dispositivo lo dicen en su propia fila. El resto funciona en el navegador, en el idioma que enseñas, validados con el diccionario propio de ese idioma y no con una lista inglesa traducida.',
    labels: { time: 'Tiempo', group: 'Agrupación', drills: 'Practica', setup: 'Preparación', rules: 'Cómo se juega', onLexiClash: 'En LexiClash' },
    games: [
      {
        name: 'Descríbelo sin nombrarlo',
        setup: 'Diez tarjetas boca abajo, cada una con una palabra de la semana.',
        rules: 'Un estudiante saca una tarjeta y la describe en el idioma meta sin decir la palabra, su traducción ni hacer gestos. Los demás adivinan. Treinta segundos, la tarjeta vuelve y saca el siguiente.',
        time: '10 min', groupSize: 'Grupos de 4–5', drills: 'Circunloquio',
        runsWith: NO_DEVICE,
        runsWithNote: 'Sin dispositivo. Saber rodear la palabra exacta es lo que mantiene una conversación viva, y solo se entrena con la prohibición.',
      },
      {
        name: 'Relevo de ortografía',
        setup: 'Dos columnas en la pizarra, dos rotuladores, equipos en fila.',
        rules: 'Di una palabra. El primer estudiante escribe la primera letra, vuelve y pasa el rotulador. El equipo la deletrea letra a letra, un relevo cada vez. Se puede corregir una letra anterior, pero solo en tu turno.',
        time: '10–15 min', groupSize: 'Dos equipos', drills: 'Ortografía bajo presión',
        runsWith: 'spelling',
        runsWithNote: 'El modo de práctica Ortografía repasa después la misma lista letra a letra, para quien el relevo fue demasiado rápido.',
      },
      {
        name: 'Mismo tablero, tu idioma',
        setup: 'Elige el idioma de la ronda al abrir la sala.',
        rules: 'Todos juegan en un tablero de letras compartido y buscan palabras reales en el idioma meta. Las respuestas se validan con el diccionario de ese idioma, así una ronda en español puntúa español y un tablero hebreo se lee de derecha a izquierda.',
        time: '5–10 min', groupSize: 'Toda la clase', drills: 'Reconocimiento en el idioma meta',
        runsWith: 'classic',
        runsWithNote: 'Modo clásico, con el idioma fijado en la ventana de crear sala. Seis idiomas vienen con su propio diccionario.',
      },
      {
        name: 'Pares mínimos: señala y di',
        setup: 'Escribe seis pares confundibles en la pizarra: ship/sheep, live/leave.',
        rules: 'Di una palabra. Los estudiantes señalan la que oyeron. Después al revés: un estudiante dice una palabra y la clase señala. Señalar incluye a los callados sin obligarles a hablar primero.',
        time: '5–10 min', groupSize: 'Toda la clase', drills: 'Discriminación de sonidos',
        runsWith: NO_DEVICE,
        runsWithNote: 'Sin dispositivo, y mejor así: todo depende de tu voz y de sus oídos.',
      },
      {
        name: 'Búsqueda de una sola palabra',
        setup: 'Elige la palabra objetivo antes de empezar la ronda.',
        rules: 'La clase busca una única palabra en un tablero compartido en vez de competir por cantidad. Las otras palabras siguen puntuando, pero la ronda va de la que elegiste: baja el ritmo y deja algo que comentar.',
        time: '5–10 min', groupSize: 'Toda la clase', drills: 'Atención sostenida en una forma',
        runsWith: 'word-hunt',
        runsWithNote: 'Modo Word Hunt, elegido en la pantalla del anfitrión antes de empezar la ronda.',
      },
      {
        name: 'Representa el verbo',
        setup: 'Los verbos de la semana en papelitos dentro de un vaso.',
        rules: 'Un estudiante saca un verbo y lo representa sin sonido. La clase grita sus intentos en el idioma meta. Acepta un tiempo verbal equivocado, escribe el correcto en la pizarra y sigue rápido.',
        time: '10 min', groupSize: 'Toda la clase', drills: 'Recuerdo de verbos',
        runsWith: NO_DEVICE,
        runsWithNote: 'Sin dispositivo. Funciona con un grupo principiante que todavía no lee la lista, un caso que un juego en pantalla no cubre.',
      },
      {
        name: 'Escalera de apoyo, base y desafío',
        setup: 'Divide la lista en tres niveles antes de la clase.',
        rules: 'Todos hacen la misma actividad, cada uno en su nivel. Nadie sabe en qué nivel está. Sube a un estudiante a mitad de clase si termina pronto y bájalo sin comentarios si se atasca.',
        time: '10 min', groupSize: 'Individual, misma aula', drills: 'La dificultad justa por estudiante',
        runsWith: 'warmup',
        runsWithNote: 'El modo de práctica Calentamiento recorre la lista al nivel fijado para cada estudiante, así una actividad sirve para todo el grupo.',
      },
      {
        name: 'Blitz de dos minutos',
        setup: 'Abre la lista. Nada más.',
        rules: 'Dos minutos, tantas respuestas correctas como cada uno consiga, y parada en seco. Pregunta a tres estudiantes cuál fue su última palabra en lugar de quién puntuó más, y el grupo se queda con quien sacó menos.',
        time: '2–5 min', groupSize: 'Individual', drills: 'Fluidez y velocidad',
        runsWith: 'blitz',
        runsWithNote: 'El modo de práctica Blitz es la ronda cronometrada; la lista es la que hayas puesto para la semana.',
      },
      {
        name: 'Rueda de letras a contrarreloj',
        setup: 'Pon la rueda en el proyector.',
        rules: 'Los estudiantes forman palabras con un anillo de letras contra el reloj. Las largas valen más, así que la misma ronda estira a quien va sobrado y deja puntuar a quien empieza.',
        time: '5–10 min', groupSize: 'Toda la clase', drills: 'Construcción de palabras con restricciones',
        runsWith: 'wheel-rush',
        runsWithNote: 'Modo Wheel Rush, elegido en la pantalla del anfitrión junto a Clásico, Word Hunt y Blast.',
      },
      {
        name: 'Lee la lista en voz alta',
        setup: 'Pon la lista de la semana en pantalla.',
        rules: 'Leed la lista juntos y después cada estudiante lee tres palabras solo mientras el resto escucha. Termina preguntando qué palabra costó más pronunciar, no entender. Esa respuesta es tu plan de pronunciación.',
        time: '5 min', groupSize: 'Toda la clase', drills: 'Pronunciación de la forma escrita',
        runsWith: 'word_list',
        runsWithNote: 'La vista Lista de palabras muestra las palabras de la semana solas, sin nada que puntuar, y por eso sirve para leer en voz alta.',
      },
    ],
  },

  sv: {
    heading: '10 ordlekar för engelska som andraspråk i klassrummet',
    intro:
      'Tio lekar för ett språkklassrum med blandade nivåer, från den tystaste uppvärmningen till den högljuddaste. De som inte kräver någon enhet säger det på sin egen rad. Resten körs i webbläsaren, på språket du undervisar i, och bedöms mot det språkets egen ordbok i stället för en översatt engelsk lista.',
    labels: { time: 'Tid', group: 'Gruppering', drills: 'Tränar', setup: 'Förberedelse', rules: 'Så spelas den', onLexiClash: 'På LexiClash' },
    games: [
      {
        name: 'Beskriv utan att säga det',
        setup: 'Tio kort med nedåtvänd text, ett ord från veckan på varje.',
        rules: 'En elev drar ett kort och beskriver ordet på målspråket utan att säga det, översätta det eller gestikulera. De andra gissar. Trettio sekunder, sedan går kortet tillbaka och nästa elev drar.',
        time: '10 min', groupSize: 'Grupper om 4–5', drills: 'Omskrivning',
        runsWith: NO_DEVICE,
        runsWithNote: 'Ingen enhet behövs. Att kunna gå runt ordet man saknar är det som håller ett samtal igång, och det tränas bara under förbudet.',
      },
      {
        name: 'Stavningsstafett',
        setup: 'Två kolumner på tavlan, två pennor, lagen på led.',
        rules: 'Säg ett ord. Första eleven skriver första bokstaven, springer tillbaka och lämnar över pennan. Laget stavar bokstav för bokstav, en löpare i taget. Man får rätta en tidigare bokstav, men bara på sin egen tur.',
        time: '10–15 min', groupSize: 'Två lag', drills: 'Stavning under press',
        runsWith: 'spelling',
        runsWithNote: 'Övningsläget Stavning går igenom samma lista bokstav för bokstav efteråt, för dem som stafetten gick för fort för.',
      },
      {
        name: 'Samma plan, ditt språk',
        setup: 'Välj rundans språk när du öppnar rummet.',
        rules: 'Alla spelar på en delad bokstavsplan och letar riktiga ord på målspråket. Svaren prövas mot det språkets egen ordbok, så en spansk runda ger poäng för spanska och en hebreisk plan läses från höger till vänster.',
        time: '5–10 min', groupSize: 'Hela klassen', drills: 'Igenkänning på målspråket',
        runsWith: 'classic',
        runsWithNote: 'Klassiskt läge, med språket satt i dialogrutan för att skapa rum. Sex språk har var sin ordbok.',
      },
      {
        name: 'Minimala par: peka och säg',
        setup: 'Skriv sex förväxlingsbara par på tavlan — ship/sheep, live/leave.',
        rules: 'Säg ett ord. Eleverna pekar på det de hörde. Vänd sedan på det: en elev säger ett ord och klassen pekar. Pekandet får med de tysta utan att tvinga dem att tala först.',
        time: '5–10 min', groupSize: 'Hela klassen', drills: 'Ljudurskiljning',
        runsWith: NO_DEVICE,
        runsWithNote: 'Ingen enhet behövs, och det är bättre utan — hela poängen är din röst och deras öron.',
      },
      {
        name: 'Jakt på ett enda målord',
        setup: 'Välj målordet innan rundan börjar.',
        rules: 'Klassen letar ett enda ord på en delad plan i stället för att tävla i mängd. Andra ord ger fortfarande poäng, men rundan handlar om det du valde — det sänker tempot och ger något att prata om.',
        time: '5–10 min', groupSize: 'Hela klassen', drills: 'Uthållig uppmärksamhet på en form',
        runsWith: 'word-hunt',
        runsWithNote: 'Läget Word Hunt, valt på värdskärmen innan du startar rundan.',
      },
      {
        name: 'Gestalta verbet',
        setup: 'Veckans verb på lappar i en mugg.',
        rules: 'En elev drar ett verb och gestaltar det utan ljud. Klassen ropar gissningar på målspråket. Godta fel tempus, skriv det rätta på tavlan och gå vidare snabbt.',
        time: '10 min', groupSize: 'Hela klassen', drills: 'Verbåterkallelse',
        runsWith: NO_DEVICE,
        runsWithNote: 'Ingen enhet behövs. Fungerar med en nybörjargrupp som ännu inte läser listan, vilket ett skärmspel inte täcker.',
      },
      {
        name: 'Stege av stöd, kärna och utmaning',
        setup: 'Dela listan i tre nivåer före lektionen.',
        rules: 'Alla gör samma aktivitet, var och en på sin nivå. Ingen får veta vilken nivå de ligger på. Flytta upp en elev mitt i lektionen när hen blir klar tidigt, och ner utan kommentar när det stannar av.',
        time: '10 min', groupSize: 'Enskilt, samma rum', drills: 'Rätt svårighet per elev',
        runsWith: 'warmup',
        runsWithNote: 'Övningsläget Uppvärmning kör listan på den nivå som satts för varje elev, så en aktivitet räcker för hela spridningen.',
      },
      {
        name: 'Tvåminutersblitz',
        setup: 'Öppna listan. Inget mer.',
        rules: 'Två minuter, så många rätta svar var och en hinner, sedan tvärstopp. Fråga tre elever vilket deras sista ord var i stället för vem som fick flest, så stannar rummet kvar hos den som fick färre.',
        time: '2–5 min', groupSize: 'Enskilt', drills: 'Flyt och tempo',
        runsWith: 'blitz',
        runsWithNote: 'Övningsläget Blitz är den tidtagna omgången; listan är den du satt för veckan.',
      },
      {
        name: 'Bokstavshjulet mot klockan',
        setup: 'Lägg upp hjulet på projektorn.',
        rules: 'Eleverna bygger ord av en ring bokstäver mot klockan. Långa ord är värda mer, så samma runda sträcker den starke och låter nybörjaren ändå få poäng.',
        time: '5–10 min', groupSize: 'Hela klassen', drills: 'Ordbyggande under villkor',
        runsWith: 'wheel-rush',
        runsWithNote: 'Läget Wheel Rush, valt på värdskärmen bredvid Klassiskt, Word Hunt och Blast.',
      },
      {
        name: 'Läs listan högt',
        setup: 'Lägg upp veckans lista på skärmen.',
        rules: 'Läs listan tillsammans, sedan läser varje elev tre ord ensam medan rummet lyssnar. Avsluta med att fråga vilket ord som var svårast att uttala — inte att förstå, att uttala. Svaret är din uttalsplan.',
        time: '5 min', groupSize: 'Hela klassen', drills: 'Uttal av den skrivna formen',
        runsWith: 'word_list',
        runsWithNote: 'Vyn Ordlista visar veckans ord för sig, utan något att poängsätta, och det är därför den fungerar för högläsning.',
      },
    ],
  },

  ja: {
    heading: '教室で使えるESL単語ゲーム10選',
    intro:
      'レベルの混ざった語学クラス向けの10ゲームを、静かなウォームアップからにぎやかなものへと並べました。端末が要らないものには、その旨を各行に明記しています。ほかはブラウザで、先生が教えている言語で動き、翻訳した英語リストではなくその言語専用の辞書で判定されます。',
    labels: { time: '時間', group: '人数', drills: '鍛える力', setup: '準備', rules: '進め方', onLexiClash: 'LexiClashでは' },
    games: [
      {
        name: '言わずに説明する',
        setup: '今週の単語を1枚に1語ずつ書いたカードを10枚、裏返して置きます。',
        rules: '生徒が1枚引き、その語・訳語・身振りを使わずに目標言語で説明します。ほかの生徒が当てます。30秒たったらカードを戻し、次の生徒が引きます。',
        time: '10分', groupSize: '4〜5人グループ', drills: '言い換えでしのぐ力',
        runsWith: NO_DEVICE,
        runsWithNote: '端末は不要です。ぴったりの語が出てこないときに会話を続ける力は、その語を禁じたときにだけ鍛えられます。',
      },
      {
        name: 'スペリング・リレー',
        setup: '黒板に2列、マーカー2本、チームは1列に並びます。',
        rules: '単語を1つ言います。最初の生徒が1文字書いて戻り、マーカーを渡します。チームは1人ずつ、1文字ずつ綴ります。前の文字の訂正は可能ですが、自分の番のときだけです。',
        time: '10〜15分', groupSize: '2チーム', drills: '緊張下での綴り',
        runsWith: 'spelling',
        runsWithNote: '練習モード「スペリング」が、そのあと同じリストを1文字ずつ復習させます。リレーが速すぎた生徒のために。',
      },
      {
        name: '同じボード、あなたの言語',
        setup: 'ルームを開くときにラウンドの言語を選びます。',
        rules: '全員が共有の文字ボードで、目標言語の実在する単語を探します。答えはその言語専用の辞書で判定されるので、スペイン語のラウンドはスペイン語で得点し、ヘブライ語のボードは右から左に並びます。',
        time: '5〜10分', groupSize: 'クラス全体', drills: '目標言語での認識',
        runsWith: 'classic',
        runsWithNote: 'クラシックモードで、言語はルーム作成画面で設定します。6言語がそれぞれ独自の辞書を備えています。',
      },
      {
        name: 'ミニマルペア：指して言う',
        setup: '紛らわしいペアを6組、黒板に書きます（ship/sheep、live/leave など）。',
        rules: '片方を言います。生徒は聞こえたほうを指します。次は逆に、生徒が言ってクラスが指します。指すだけなので、静かな生徒も先に話さずに参加できます。',
        time: '5〜10分', groupSize: 'クラス全体', drills: '音の聞き分け',
        runsWith: NO_DEVICE,
        runsWithNote: '端末は不要で、むしろ無いほうがいい活動です。先生の声と生徒の耳がすべてです。',
      },
      {
        name: '目標語ひとつを探す',
        setup: 'ラウンドを始める前に目標の語を決めます。',
        rules: 'クラスは数を競うのではなく、共有ボードで1語だけを探します。ほかの語も得点にはなりますが、そのラウンドの主役は選んだ1語です。テンポが落ち着き、あとで話す材料が残ります。',
        time: '5〜10分', groupSize: 'クラス全体', drills: 'ひとつの形への持続的な注意',
        runsWith: 'word-hunt',
        runsWithNote: 'Word Huntモードを、ラウンド開始前にホスト画面で選びます。',
      },
      {
        name: '動詞を演じる',
        setup: '今週の動詞を紙片に書いてコップに入れます。',
        rules: '生徒が1枚引き、声を出さずに演じます。クラスは目標言語で答えを叫びます。時制が違っても受け入れ、正しい形を黒板に書いて、すぐ次へ進みます。',
        time: '10分', groupSize: 'クラス全体', drills: '動詞の想起',
        runsWith: NO_DEVICE,
        runsWithNote: '端末は不要です。まだリストを読めない初級グループでも成立します。画面のゲームでは埋められない場面です。',
      },
      {
        name: 'サポート・コア・チャレンジの階段',
        setup: '授業前にリストを3段階に分けます。',
        rules: '全員が同じ活動を、それぞれの段階で行います。自分がどの段階かは知らせません。早く終わった生徒は授業の途中で上げ、詰まった生徒は何も言わずに下げます。',
        time: '10分', groupSize: '同じ教室で個別', drills: '生徒ごとに適した難度',
        runsWith: 'warmup',
        runsWithNote: '練習モード「ウォームアップ」が、生徒ごとに設定された段階でリストを進めるので、活動ひとつで全員に合います。',
      },
      {
        name: '2分ブリッツ',
        setup: 'リストを開くだけです。',
        rules: '2分間、各自できるだけ多く正解し、そこでぴたりと止めます。誰が一番かではなく「最後の語は何だった？」と3人に聞くと、点の少なかった生徒も教室に残ります。',
        time: '2〜5分', groupSize: '個人', drills: '流暢さと速さ',
        runsWith: 'blitz',
        runsWithNote: '練習モード「ブリッツ」が時間制限つきの回です。リストはその週に設定したものが使われます。',
      },
      {
        name: '文字ホイール・ラッシュ',
        setup: 'ホイールをプロジェクターに映します。',
        rules: '生徒は輪に並んだ文字から、制限時間内に単語を作ります。長い語ほど高得点なので、同じラウンドで上位の生徒は伸ばされ、初級の生徒も得点できます。',
        time: '5〜10分', groupSize: 'クラス全体', drills: '制約からの語の組み立て',
        runsWith: 'wheel-rush',
        runsWithNote: 'Wheel Rushモードを、クラシック・Word Hunt・Blastと並んでホスト画面で選びます。',
      },
      {
        name: 'リストを声に出して読む',
        setup: '今週のリストを画面に出します。',
        rules: '全員でリストを読み、そのあと1人3語ずつ、クラスが聞くなかで読みます。最後に「どの語が一番言いにくかったか」を聞きます。意味ではなく発音です。その答えが発音指導の計画になります。',
        time: '5分', groupSize: 'クラス全体', drills: '書かれた形の発音',
        runsWith: 'word_list',
        runsWithNote: '単語リスト表示は、その週の語だけを採点なしで並べます。だからこそ音読に使えます。',
      },
    ],
  },

  ru: {
    heading: '10 словесных игр для урока английского как иностранного',
    intro:
      'Десять игр для языкового класса со смешанным уровнем, от самой тихой разминки до самой шумной. Те, что не требуют устройства, говорят об этом в своей строке. Остальные работают в браузере на том языке, который вы преподаёте, и проверяются по собственному словарю этого языка, а не по переведённому английскому списку.',
    labels: { time: 'Время', group: 'Состав', drills: 'Тренирует', setup: 'Подготовка', rules: 'Как играть', onLexiClash: 'В LexiClash' },
    games: [
      {
        name: 'Опиши, не называя',
        setup: 'Десять карточек рубашкой вверх, на каждой одно слово недели.',
        rules: 'Ученик берёт карточку и описывает слово на изучаемом языке, не называя его, не переводя и не показывая жестами. Остальные угадывают. Тридцать секунд, карточка возвращается, тянет следующий.',
        time: '10 мин', groupSize: 'Группы по 4–5', drills: 'Умение обойти слово',
        runsWith: NO_DEVICE,
        runsWithNote: 'Устройство не нужно. Умение обойтись без точного слова — это то, что не даёт разговору оборваться, и тренируется оно только под запретом.',
      },
      {
        name: 'Орфографическая эстафета',
        setup: 'Две колонки на доске, два маркера, команды в колоннах.',
        rules: 'Назовите слово. Первый ученик пишет первую букву, возвращается и передаёт маркер. Команда пишет по букве, по одному бегущему. Исправить прежнюю букву можно, но только в свой ход.',
        time: '10–15 мин', groupSize: 'Две команды', drills: 'Орфография под давлением',
        runsWith: 'spelling',
        runsWithNote: 'Режим практики «Орфография» потом проходит тот же список по буквам — для тех, кому эстафета была слишком быстрой.',
      },
      {
        name: 'То же поле, ваш язык',
        setup: 'Выберите язык раунда при создании комнаты.',
        rules: 'Все играют на одном буквенном поле и ищут настоящие слова на изучаемом языке. Ответы проверяются по словарю этого языка, поэтому испанский раунд засчитывает испанский, а поле на иврите читается справа налево.',
        time: '5–10 мин', groupSize: 'Весь класс', drills: 'Узнавание на изучаемом языке',
        runsWith: 'classic',
        runsWithNote: 'Классический режим, язык задаётся в окне создания комнаты. Шесть языков идут с собственными словарями.',
      },
      {
        name: 'Минимальные пары: покажи и скажи',
        setup: 'Напишите на доске шесть путаемых пар — ship/sheep, live/leave.',
        rules: 'Скажите одно слово. Ученики показывают на то, что услышали. Потом наоборот: ученик говорит, класс показывает. Показывать проще, чем говорить, поэтому в игру включаются и молчаливые.',
        time: '5–10 мин', groupSize: 'Весь класс', drills: 'Различение звуков',
        runsWith: NO_DEVICE,
        runsWithNote: 'Устройство не нужно, и без него лучше: всё держится на вашем голосе и их слухе.',
      },
      {
        name: 'Поиск одного целевого слова',
        setup: 'Выберите целевое слово до начала раунда.',
        rules: 'Класс ищет на общем поле одно слово, а не гонится за количеством. Другие найденные слова тоже засчитываются, но раунд — про выбранное вами. Темп падает, и появляется что обсудить.',
        time: '5–10 мин', groupSize: 'Весь класс', drills: 'Долгое удержание внимания на одной форме',
        runsWith: 'word-hunt',
        runsWithNote: 'Режим Word Hunt, выбирается на экране ведущего до начала раунда.',
      },
      {
        name: 'Покажи глагол',
        setup: 'Глаголы недели на бумажках в стакане.',
        rules: 'Ученик достаёт глагол и показывает его без звука. Класс выкрикивает догадки на изучаемом языке. Принимайте неверное время, пишите верное на доске и быстро идите дальше.',
        time: '10 мин', groupSize: 'Весь класс', drills: 'Припоминание глаголов',
        runsWith: NO_DEVICE,
        runsWithNote: 'Устройство не нужно. Работает с начинающей группой, которая ещё не читает список, — случай, который экранная игра не закрывает.',
      },
      {
        name: 'Лестница поддержки, базы и вызова',
        setup: 'Разделите список на три уровня до урока.',
        rules: 'Все делают одно и то же задание, каждый на своём уровне. Никому не сообщают, какой у него уровень. Поднимите ученика посреди урока, если он закончил рано, и опустите без комментария, если он застрял.',
        time: '10 мин', groupSize: 'По одному, в одном классе', drills: 'Своя сложность каждому',
        runsWith: 'warmup',
        runsWithNote: 'Режим практики «Разминка» ведёт список на том уровне, который задан ученику, поэтому одно задание подходит всему разбросу.',
      },
      {
        name: 'Двухминутный блиц',
        setup: 'Откройте список. Больше ничего.',
        rules: 'Две минуты, как можно больше верных ответов у каждого, затем резкая остановка. Спросите трёх учеников, каким было их последнее слово, а не кто набрал больше, — и класс останется с тем, кто набрал меньше.',
        time: '2–5 мин', groupSize: 'По одному', drills: 'Беглость и скорость',
        runsWith: 'blitz',
        runsWithNote: 'Режим практики «Блиц» — это забег на время; список тот, который вы задали на неделю.',
      },
      {
        name: 'Гонка по буквенному колесу',
        setup: 'Выведите колесо на проектор.',
        rules: 'Ученики собирают слова из кольца букв на время. Длинные слова стоят дороже, поэтому один и тот же раунд растягивает сильного и всё же даёт набрать начинающему.',
        time: '5–10 мин', groupSize: 'Весь класс', drills: 'Сборка слов из ограничений',
        runsWith: 'wheel-rush',
        runsWithNote: 'Режим Wheel Rush, выбирается на экране ведущего рядом с Классическим, Word Hunt и Blast.',
      },
      {
        name: 'Прочитайте список вслух',
        setup: 'Выведите список недели на экран.',
        rules: 'Прочитайте список вместе, затем каждый читает три слова один, пока класс слушает. Закончите вопросом, какое слово было труднее всего произнести — не понять, а произнести. Ответ и есть ваш план по произношению.',
        time: '5 мин', groupSize: 'Весь класс', drills: 'Произношение написанной формы',
        runsWith: 'word_list',
        runsWithNote: 'Вид «Список слов» показывает слова недели отдельно, без начисления очков, — поэтому он и годится для чтения вслух.',
      },
    ],
  },
};

export function getEslClassGames(locale: string): ClassGameSection {
  const normalized = locale.toLowerCase().split('-')[0] as ClassGameLocale;
  return SECTIONS[normalized] ?? SECTIONS.en;
}
