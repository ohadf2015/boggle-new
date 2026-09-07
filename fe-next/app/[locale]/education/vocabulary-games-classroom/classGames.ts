import { NO_DEVICE, type ClassGameSection } from '@/components/education/ClassGameList';

/**
 * Ten vocabulary games a teacher can run today.
 *
 * The query "vocabulary games for classroom" is informational: the reader wants a
 * list of games with setup and rules, which is why Sadlier's printable listicle beat
 * this page in four straight blind comparisons while it answered with a product
 * pitch. This is the answer to the question that was actually asked.
 *
 * Some of these need no device at all and say so on their own row. That is the point:
 * a list that quietly bent every classic game into a product feature would be the same
 * pitch in a new costume, and a teacher would spot it immediately.
 *
 * The intro deliberately does not count them. It said "five" in the first draft, when
 * the real number was two, and `__tests__/classGames.test.ts` caught it before this
 * shipped — a headline count is one more number to rot the next time a game changes.
 *
 * `runsWith` values are registry ids (`VOCAB_FOCUSES`, `BASE_PRACTICE_MODES`,
 * `CLASSROOM_GAME_MODES`) or `NO_DEVICE`. `__tests__/classGames.test.ts` pins that,
 * so a mode renamed in code fails this file rather than misleading a reader.
 */

export const CLASS_GAME_LOCALES = ['en', 'he', 'es', 'sv', 'ja', 'ru'] as const;
export type ClassGameLocale = (typeof CLASS_GAME_LOCALES)[number];

const SECTIONS: Record<ClassGameLocale, ClassGameSection> = {
  en: {
    heading: '10 vocabulary games you can run in class today',
    intro:
      'Ten games for this week’s word list, in the order you might use them across a unit. The ones that need nothing but a board and your voice are marked that way; the rest run in a browser with no student accounts.',
    labels: { time: 'Time', group: 'Group', drills: 'Drills', setup: 'Setup', rules: 'How to play', onLexiClash: 'On LexiClash' },
    games: [
      {
        name: 'Definition Match Race',
        setup: 'Paste this week’s words and their definitions into one lesson list.',
        rules: 'Students pair each word with its definition against a timer. A wrong pair flips back and costs a few seconds. Whoever clears the board first reads out the three that gave them trouble.',
        time: '5–10 min', groupSize: 'Pairs or solo', drills: 'Word-to-meaning recall',
        runsWith: 'matching',
        runsWithNote: 'The Matching practice mode builds the pairs from your list — nothing to print, cut out or laminate.',
      },
      {
        name: 'Synonym and Antonym Sort',
        setup: 'Write the week’s words in one column on the board.',
        rules: 'Call a word. Each team writes one synonym and one antonym on a mini-whiteboard and holds it up. A synonym scores one, an antonym two, a word another team already used scores nothing.',
        time: '10 min', groupSize: 'Teams of 3–4', drills: 'Semantic range',
        runsWith: 'synonym',
        runsWithNote: 'The synonym focus drills the same list solo afterwards, so homework matches what the room just practised.',
      },
      {
        name: 'Context-Clue Fill-In',
        setup: 'Pick six words and write one sentence for each with the word taken out.',
        rules: 'Read a sentence aloud and hum where the word belongs. Students write the word they think fits and the clue that told them. Reveal, then talk about the clue rather than the answer.',
        time: '10–15 min', groupSize: 'Whole class', drills: 'Inferring meaning from context',
        runsWith: 'context',
        runsWithNote: 'The context focus generates the same gap-sentence drill from your list for the students who need another pass.',
      },
      {
        name: 'Roots and Affixes Build',
        setup: 'Put three roots and six affixes on the board.',
        rules: 'Groups build as many real words as they can in four minutes. Every word has to be defended aloud when time is up. Attempts that turn out not to be words cost nothing — say so before you start.',
        time: '10 min', groupSize: 'Groups of 4', drills: 'Morphology',
        runsWith: 'roots_affixes',
        runsWithNote: 'The roots-and-affixes focus runs the same build on your own list, one student at a time.',
      },
      {
        name: 'Vocabulary Bingo',
        setup: 'Students draw a three-by-three grid and fill it with nine words from the list.',
        rules: 'Read a definition, never the word. Students cross out the word it defines. Three in a row wins, and the winner reads their line back with the meanings.',
        time: '10 min', groupSize: 'Whole class', drills: 'Definition-to-word recall',
        runsWith: NO_DEVICE,
        runsWithNote: 'No device needed — paper, a pen and your voice. Bring the same list to a screen round later in the week.',
      },
      {
        name: 'Shared Grid Sweep',
        setup: 'Put one letter grid on the projector.',
        rules: 'The whole room hunts words on the same grid at once, with longer words worth more. Set the constraint before you start — only words from the list, or only words that contain one of them.',
        time: '5–10 min', groupSize: 'Whole class', drills: 'Spelling and rapid retrieval',
        runsWith: 'classic',
        runsWithNote: 'Classic mode. Students join from any browser with a six-character code and no account.',
      },
      {
        name: 'Exit-Ticket Quiz',
        setup: 'Nothing, once the list is in the lesson.',
        rules: 'Four-choice questions on this week’s words against a timer, played in the last five minutes. Standings appear live, and the words the class missed are the ones you reteach tomorrow.',
        time: '5 min', groupSize: 'Whole class', drills: 'Retrieval under time',
        runsWith: 'vocab-quiz',
        runsWithNote: 'The live vocab quiz writes its questions from your list, and the results screen names the words the class missed.',
      },
      {
        name: 'Hot Seat',
        setup: 'One chair at the front, facing away from the board.',
        rules: 'Write a word behind the student in the seat. The class describes it without saying the word or any part of it. The sitter guesses, then swaps out for whoever gave the clue that landed.',
        time: '10 min', groupSize: 'Whole class', drills: 'Paraphrasing and definition',
        runsWith: NO_DEVICE,
        runsWithNote: 'No device needed. The rule that makes it work is the ban on the word itself, so hold that line strictly.',
      },
      {
        name: 'Two Meanings, Two Sentences',
        setup: 'Choose four words from the list that carry more than one meaning.',
        rules: 'Each student writes two sentences per word, one for each meaning. Read a pair aloud and let the class name which meaning each sentence used before you confirm it.',
        time: '10–15 min', groupSize: 'Solo, then whole class', drills: 'Words with more than one meaning',
        runsWith: 'multiple_meaning',
        runsWithNote: 'The multiple-meaning focus drills exactly these words on its own, which is hard to set up on paper.',
      },
      {
        name: 'Flashcard Sprint',
        setup: 'Open this week’s list.',
        rules: 'Ninety seconds of flip-and-recall, then every student writes down the three words they hesitated on. Those three go on the board as tomorrow’s warm-up.',
        time: '3–5 min', groupSize: 'Solo', drills: 'Instant recall',
        runsWith: 'flashcard',
        runsWithNote: 'The Flashcard practice mode plays your list with audio for each word.',
      },
    ],
  },

  he: {
    heading: '10 משחקי אוצר מילים להריץ בכיתה כבר היום',
    intro:
      'עשרה משחקים לרשימת המילים של השבוע, בסדר שאפשר להשתמש בו לאורך יחידה. אלה שלא דורשים יותר מלוח וקול מסומנים ככאלה; השאר רצים בדפדפן בלי חשבונות לתלמידים.',
    labels: { time: 'זמן', group: 'הרכב', drills: 'מתרגל', setup: 'הכנה', rules: 'איך משחקים', onLexiClash: 'ב-LexiClash' },
    games: [
      {
        name: 'מרוץ התאמת הגדרות',
        setup: 'הדביקו את מילות השבוע ואת ההגדרות שלהן לרשימת שיעור אחת.',
        rules: 'התלמידים מתאימים כל מילה להגדרה שלה מול שעון. התאמה שגויה מתהפכת בחזרה ועולה כמה שניות. מי שמנקה ראשון מקריא את שלוש המילים שהכי הקשו עליו.',
        time: '5–10 דק׳', groupSize: 'זוגות או יחידים', drills: 'שליפת משמעות',
        runsWith: 'matching',
        runsWithNote: 'מצב התרגול "התאמה" בונה את הזוגות מהרשימה שלכם — בלי להדפיס, לגזור או ללמנט.',
      },
      {
        name: 'מיון נרדפות והפכים',
        setup: 'כתבו את מילות השבוע בעמודה אחת על הלוח.',
        rules: 'הקריאו מילה. כל קבוצה כותבת מילה נרדפת אחת והפך אחד על לוח מחיק ומרימה. נרדפת שווה נקודה, הפך שתיים, ומילה שקבוצה אחרת כבר אמרה לא שווה כלום.',
        time: '10 דק׳', groupSize: 'קבוצות של 3–4', drills: 'טווח משמעות',
        runsWith: 'synonym',
        runsWithNote: 'מיקוד הנרדפות מתרגל את אותה רשימה לבד אחר כך, כך ששיעורי הבית תואמים למה שקרה בכיתה.',
      },
      {
        name: 'השלמה לפי הקשר',
        setup: 'בחרו שש מילים וכתבו לכל אחת משפט שממנו המילה הוסרה.',
        rules: 'הקריאו משפט והמהמו במקום המילה. התלמידים כותבים את המילה שלדעתם מתאימה ואת הרמז שהוביל אותם. חשפו, ואז דברו על הרמז ולא על התשובה.',
        time: '10–15 דק׳', groupSize: 'כל הכיתה', drills: 'הסקת משמעות מהקשר',
        runsWith: 'context',
        runsWithNote: 'מיקוד ההקשר מייצר את אותו תרגיל השלמה מהרשימה שלכם, למי שצריך סיבוב נוסף.',
      },
      {
        name: 'בנייה משורשים ותחיליות',
        setup: 'העלו שלושה שורשים ושש תחיליות וסופיות ללוח.',
        rules: 'הקבוצות בונות כמה שיותר מילים אמיתיות בארבע דקות. כל מילה צריכה הגנה בעל פה בסוף. ניסיון שמתברר כלא-מילה לא עולה כלום — אמרו את זה מראש.',
        time: '10 דק׳', groupSize: 'קבוצות של 4', drills: 'מורפולוגיה',
        runsWith: 'roots_affixes',
        runsWithNote: 'מיקוד השורשים והתחיליות מריץ את אותה בנייה על הרשימה שלכם, תלמיד אחר תלמיד.',
      },
      {
        name: 'בינגו אוצר מילים',
        setup: 'התלמידים משרטטים רשת שלוש על שלוש וממלאים אותה בתשע מילים מהרשימה.',
        rules: 'הקריאו הגדרה, אף פעם לא את המילה. התלמידים מוחקים את המילה שההגדרה מתארת. שלוש בשורה מנצחות, והמנצח מקריא את השורה עם המשמעויות.',
        time: '10 דק׳', groupSize: 'כל הכיתה', drills: 'שליפת מילה מהגדרה',
        runsWith: NO_DEVICE,
        runsWithNote: 'לא צריך מכשיר — דף, עט והקול שלכם. הביאו את אותה רשימה לסיבוב על מסך בהמשך השבוע.',
      },
      {
        name: 'סריקת לוח משותף',
        setup: 'העלו לוח אותיות אחד למקרן.',
        rules: 'כל החדר מחפש מילים על אותו לוח בו-זמנית, ומילים ארוכות שוות יותר. קבעו את המגבלה לפני שמתחילים — רק מילים מהרשימה, או רק מילים שמכילות אחת מהן.',
        time: '5–10 דק׳', groupSize: 'כל הכיתה', drills: 'איות ושליפה מהירה',
        runsWith: 'classic',
        runsWithNote: 'מצב קלאסי. התלמידים מצטרפים מכל דפדפן עם קוד בן שש תווים ובלי חשבון.',
      },
      {
        name: 'חידון כרטיס יציאה',
        setup: 'שום דבר, ברגע שהרשימה כבר בשיעור.',
        rules: 'שאלות עם ארבע אפשרויות על מילות השבוע מול שעון, בחמש הדקות האחרונות. הדירוג עולה בזמן אמת, והמילים שהכיתה פספסה הן אלה שתלמדו שוב מחר.',
        time: '5 דק׳', groupSize: 'כל הכיתה', drills: 'שליפה תחת לחץ זמן',
        runsWith: 'vocab-quiz',
        runsWithNote: 'חידון אוצר המילים החי כותב את השאלות מהרשימה שלכם, ומסך התוצאות מציין את המילים שהכיתה פספסה.',
      },
      {
        name: 'כיסא חם',
        setup: 'כיסא אחד מלפנים, עם הגב ללוח.',
        rules: 'כתבו מילה מאחורי התלמיד שיושב. הכיתה מתארת אותה בלי לומר את המילה או חלק ממנה. היושב מנחש, ואז מתחלף עם מי שנתן את הרמז שהצליח.',
        time: '10 דק׳', groupSize: 'כל הכיתה', drills: 'ניסוח מחדש והגדרה',
        runsWith: NO_DEVICE,
        runsWithNote: 'לא צריך מכשיר. הכלל שגורם לזה לעבוד הוא האיסור על המילה עצמה, אז שמרו עליו בקפדנות.',
      },
      {
        name: 'שתי משמעויות, שני משפטים',
        setup: 'בחרו ארבע מילים מהרשימה שיש להן יותר ממשמעות אחת.',
        rules: 'כל תלמיד כותב שני משפטים לכל מילה, אחד לכל משמעות. הקריאו זוג ותנו לכיתה לזהות באיזו משמעות השתמש כל משפט לפני שאתם מאשרים.',
        time: '10–15 דק׳', groupSize: 'לבד ואז כל הכיתה', drills: 'מילים רב-משמעיות',
        runsWith: 'multiple_meaning',
        runsWithNote: 'מיקוד רב-המשמעות מתרגל בדיוק את המילים האלה לבד, וזה קשה להקים על נייר.',
      },
      {
        name: 'ספרינט כרטיסיות',
        setup: 'פתחו את רשימת השבוע.',
        rules: 'תשעים שניות של היפוך ושליפה, ואז כל תלמיד רושם את שלוש המילים שהיסס בהן. השלוש האלה עולות ללוח כחימום של מחר.',
        time: '3–5 דק׳', groupSize: 'לבד', drills: 'שליפה מיידית',
        runsWith: 'flashcard',
        runsWithNote: 'מצב התרגול "כרטיסיות" מנגן את הרשימה שלכם עם הקראה לכל מילה.',
      },
    ],
  },

  es: {
    heading: '10 juegos de vocabulario para el aula, hoy mismo',
    intro:
      'Diez juegos para la lista de esta semana, en el orden en que podrías usarlos a lo largo de una unidad. Los que no necesitan más que una pizarra y tu voz están marcados; el resto funciona en el navegador sin cuentas de estudiante.',
    labels: { time: 'Tiempo', group: 'Agrupación', drills: 'Practica', setup: 'Preparación', rules: 'Cómo se juega', onLexiClash: 'En LexiClash' },
    games: [
      {
        name: 'Carrera de definiciones',
        setup: 'Pega las palabras de la semana y sus definiciones en una sola lista de clase.',
        rules: 'Los estudiantes emparejan cada palabra con su definición contra el reloj. Un par incorrecto se voltea y cuesta unos segundos. Quien despeje el tablero primero lee en voz alta las tres que más le costaron.',
        time: '5–10 min', groupSize: 'Parejas o individual', drills: 'Recuerdo de significado',
        runsWith: 'matching',
        runsWithNote: 'El modo de práctica Emparejar arma las parejas desde tu lista: nada que imprimir, recortar ni plastificar.',
      },
      {
        name: 'Clasificar sinónimos y antónimos',
        setup: 'Escribe las palabras de la semana en una columna en la pizarra.',
        rules: 'Di una palabra. Cada equipo escribe un sinónimo y un antónimo en una pizarrita y la levanta. El sinónimo vale uno, el antónimo dos, y una palabra que otro equipo ya usó no vale nada.',
        time: '10 min', groupSize: 'Equipos de 3–4', drills: 'Amplitud semántica',
        runsWith: 'synonym',
        runsWithNote: 'El enfoque de sinónimos practica después la misma lista en solitario, así la tarea coincide con lo que se hizo en clase.',
      },
      {
        name: 'Completar por contexto',
        setup: 'Elige seis palabras y escribe una frase para cada una quitando la palabra.',
        rules: 'Lee la frase en voz alta y tararea donde va la palabra. Los estudiantes escriben la palabra que creen que encaja y la pista que se lo indicó. Revela y comenta la pista, no la respuesta.',
        time: '10–15 min', groupSize: 'Toda la clase', drills: 'Inferir significado por contexto',
        runsWith: 'context',
        runsWithNote: 'El enfoque de contexto genera el mismo ejercicio de huecos desde tu lista para quien necesite otra vuelta.',
      },
      {
        name: 'Construir con raíces y afijos',
        setup: 'Pon tres raíces y seis afijos en la pizarra.',
        rules: 'Los grupos construyen tantas palabras reales como puedan en cuatro minutos. Al acabar hay que defender cada palabra en voz alta. Los intentos que no resulten ser palabras no restan; dilo antes de empezar.',
        time: '10 min', groupSize: 'Grupos de 4', drills: 'Morfología',
        runsWith: 'roots_affixes',
        runsWithNote: 'El enfoque de raíces y afijos hace la misma construcción con tu propia lista, estudiante por estudiante.',
      },
      {
        name: 'Bingo de vocabulario',
        setup: 'Los estudiantes dibujan una cuadrícula de tres por tres y la llenan con nueve palabras de la lista.',
        rules: 'Lee una definición, nunca la palabra. Los estudiantes tachan la palabra que define. Tres en raya gana, y quien gana lee su línea con los significados.',
        time: '10 min', groupSize: 'Toda la clase', drills: 'De la definición a la palabra',
        runsWith: NO_DEVICE,
        runsWithNote: 'Sin dispositivo: papel, boli y tu voz. Lleva la misma lista a una ronda en pantalla más adelante.',
      },
      {
        name: 'Barrido del tablero compartido',
        setup: 'Pon un tablero de letras en el proyector.',
        rules: 'Toda la sala busca palabras en el mismo tablero a la vez, y las largas valen más. Fija la restricción antes de empezar: solo palabras de la lista, o solo palabras que contengan una de ellas.',
        time: '5–10 min', groupSize: 'Toda la clase', drills: 'Ortografía y recuperación rápida',
        runsWith: 'classic',
        runsWithNote: 'Modo clásico. Los estudiantes entran desde cualquier navegador con un código de seis caracteres y sin cuenta.',
      },
      {
        name: 'Cuestionario de salida',
        setup: 'Nada, si la lista ya está en la clase.',
        rules: 'Preguntas de cuatro opciones sobre las palabras de la semana contra el reloj, en los últimos cinco minutos. La clasificación se ve en vivo, y las palabras falladas son las que repasas mañana.',
        time: '5 min', groupSize: 'Toda la clase', drills: 'Recuperación con tiempo',
        runsWith: 'vocab-quiz',
        runsWithNote: 'El cuestionario de vocabulario en vivo escribe las preguntas desde tu lista y la pantalla final nombra las palabras falladas.',
      },
      {
        name: 'La silla caliente',
        setup: 'Una silla delante, de espaldas a la pizarra.',
        rules: 'Escribe una palabra detrás del estudiante sentado. La clase la describe sin decir la palabra ni parte de ella. Quien está sentado adivina y cede el sitio a quien dio la pista que funcionó.',
        time: '10 min', groupSize: 'Toda la clase', drills: 'Parafrasear y definir',
        runsWith: NO_DEVICE,
        runsWithNote: 'Sin dispositivo. La regla que lo hace funcionar es la prohibición de la palabra misma, así que mantenla con firmeza.',
      },
      {
        name: 'Dos sentidos, dos frases',
        setup: 'Elige cuatro palabras de la lista que tengan más de un significado.',
        rules: 'Cada estudiante escribe dos frases por palabra, una por significado. Lee un par en voz alta y deja que la clase diga qué significado usó cada frase antes de confirmarlo.',
        time: '10–15 min', groupSize: 'Individual y luego toda la clase', drills: 'Palabras con varios significados',
        runsWith: 'multiple_meaning',
        runsWithNote: 'El enfoque de significados múltiples practica exactamente estas palabras solo, algo difícil de montar en papel.',
      },
      {
        name: 'Sprint de tarjetas',
        setup: 'Abre la lista de esta semana.',
        rules: 'Noventa segundos de girar y recordar, y después cada estudiante anota las tres palabras en las que dudó. Esas tres van a la pizarra como calentamiento de mañana.',
        time: '3–5 min', groupSize: 'Individual', drills: 'Recuerdo inmediato',
        runsWith: 'flashcard',
        runsWithNote: 'El modo de práctica Tarjetas reproduce tu lista con audio para cada palabra.',
      },
    ],
  },

  sv: {
    heading: '10 ordförrådslekar du kan köra på lektionen i dag',
    intro:
      'Tio lekar för veckans ordlista, i den ordning du kan tänkas använda dem genom ett arbetsområde. De som inte kräver mer än en tavla och din röst är märkta så; resten körs i webbläsaren utan elevkonton.',
    labels: { time: 'Tid', group: 'Gruppering', drills: 'Tränar', setup: 'Förberedelse', rules: 'Så spelas den', onLexiClash: 'På LexiClash' },
    games: [
      {
        name: 'Definitionskapplöpning',
        setup: 'Klistra in veckans ord och deras definitioner i en enda lektionslista.',
        rules: 'Eleverna parar ihop varje ord med sin definition mot klockan. Ett felaktigt par vänds tillbaka och kostar några sekunder. Den som rensar brädet först läser upp de tre som var svårast.',
        time: '5–10 min', groupSize: 'Par eller enskilt', drills: 'Minnas betydelsen',
        runsWith: 'matching',
        runsWithNote: 'Övningsläget Para ihop bygger paren från din lista — inget att skriva ut, klippa eller laminera.',
      },
      {
        name: 'Sortera synonymer och motsatser',
        setup: 'Skriv veckans ord i en kolumn på tavlan.',
        rules: 'Säg ett ord. Varje lag skriver en synonym och en motsats på en liten whiteboard och håller upp den. Synonymen ger ett poäng, motsatsen två, och ett ord ett annat lag redan tagit ger noll.',
        time: '10 min', groupSize: 'Lag om 3–4', drills: 'Betydelseomfång',
        runsWith: 'synonym',
        runsWithNote: 'Synonymfokuset övar samma lista enskilt efteråt, så läxan matchar det klassen just gjorde.',
      },
      {
        name: 'Fyll i med ledtrådar',
        setup: 'Välj sex ord och skriv en mening till varje där ordet är borttaget.',
        rules: 'Läs meningen högt och nynna där ordet ska vara. Eleverna skriver ordet de tror passar och ledtråden som avslöjade det. Avslöja, och prata sedan om ledtråden i stället för svaret.',
        time: '10–15 min', groupSize: 'Hela klassen', drills: 'Sluta sig till betydelse',
        runsWith: 'context',
        runsWithNote: 'Sammanhangsfokuset skapar samma lucktext från din lista för dem som behöver ett varv till.',
      },
      {
        name: 'Bygg med rötter och affix',
        setup: 'Sätt upp tre rötter och sex affix på tavlan.',
        rules: 'Grupperna bygger så många riktiga ord de hinner på fyra minuter. Varje ord ska försvaras muntligt när tiden är ute. Försök som visar sig inte vara ord kostar ingenting — säg det innan ni börjar.',
        time: '10 min', groupSize: 'Grupper om 4', drills: 'Morfologi',
        runsWith: 'roots_affixes',
        runsWithNote: 'Fokuset på rötter och affix kör samma bygge på din egen lista, en elev i taget.',
      },
      {
        name: 'Ordförrådsbingo',
        setup: 'Eleverna ritar ett rutnät tre gånger tre och fyller det med nio ord från listan.',
        rules: 'Läs en definition, aldrig ordet. Eleverna stryker ordet den beskriver. Tre i rad vinner, och vinnaren läser tillbaka sin rad med betydelserna.',
        time: '10 min', groupSize: 'Hela klassen', drills: 'Från definition till ord',
        runsWith: NO_DEVICE,
        runsWithNote: 'Ingen enhet behövs — papper, penna och din röst. Ta med samma lista till en skärmrunda senare i veckan.',
      },
      {
        name: 'Svep över delad spelplan',
        setup: 'Lägg upp en bokstavsplan på projektorn.',
        rules: 'Hela rummet letar ord på samma plan samtidigt, och långa ord är värda mer. Bestäm villkoret innan ni börjar — bara ord från listan, eller bara ord som innehåller ett av dem.',
        time: '5–10 min', groupSize: 'Hela klassen', drills: 'Stavning och snabb återkallelse',
        runsWith: 'classic',
        runsWithNote: 'Klassiskt läge. Eleverna ansluter från vilken webbläsare som helst med en kod på sex tecken och utan konto.',
      },
      {
        name: 'Utgångsbiljett-quiz',
        setup: 'Ingenting, när listan redan ligger i lektionen.',
        rules: 'Frågor med fyra svarsalternativ på veckans ord mot klockan, under de sista fem minuterna. Ställningen syns live, och orden klassen missade är de du repeterar i morgon.',
        time: '5 min', groupSize: 'Hela klassen', drills: 'Återkallelse under tidspress',
        runsWith: 'vocab-quiz',
        runsWithNote: 'Det direktsända ordförrådsquizet skriver frågorna från din lista, och resultatskärmen namnger orden klassen missade.',
      },
      {
        name: 'Heta stolen',
        setup: 'En stol längst fram, med ryggen mot tavlan.',
        rules: 'Skriv ett ord bakom eleven som sitter. Klassen beskriver det utan att säga ordet eller någon del av det. Den som sitter gissar och byter sedan med den vars ledtråd träffade.',
        time: '10 min', groupSize: 'Hela klassen', drills: 'Omformulera och definiera',
        runsWith: NO_DEVICE,
        runsWithNote: 'Ingen enhet behövs. Regeln som får det att fungera är förbudet mot själva ordet, så håll hårt på den.',
      },
      {
        name: 'Två betydelser, två meningar',
        setup: 'Välj fyra ord ur listan som bär mer än en betydelse.',
        rules: 'Varje elev skriver två meningar per ord, en för varje betydelse. Läs ett par högt och låt klassen säga vilken betydelse varje mening använde innan du bekräftar.',
        time: '10–15 min', groupSize: 'Enskilt, sedan hela klassen', drills: 'Ord med flera betydelser',
        runsWith: 'multiple_meaning',
        runsWithNote: 'Fokuset på flera betydelser övar precis de här orden enskilt, vilket är svårt att bygga på papper.',
      },
      {
        name: 'Ordkortsspurt',
        setup: 'Öppna veckans lista.',
        rules: 'Nittio sekunders vändande och återkallande, sedan skriver varje elev ner de tre ord de tvekade på. De tre hamnar på tavlan som morgondagens uppvärmning.',
        time: '3–5 min', groupSize: 'Enskilt', drills: 'Omedelbar återkallelse',
        runsWith: 'flashcard',
        runsWithNote: 'Övningsläget Ordkort spelar upp din lista med ljud för varje ord.',
      },
    ],
  },

  ja: {
    heading: '今日の授業で使える語彙ゲーム10選',
    intro:
      '今週の単語リストで遊べる10のゲームを、単元の流れで並べました。黒板と先生の声だけで足りるものには、その旨を明記しています。ほかはブラウザで動き、生徒のアカウントは不要です。',
    labels: { time: '時間', group: '人数', drills: '鍛える力', setup: '準備', rules: '進め方', onLexiClash: 'LexiClashでは' },
    games: [
      {
        name: '定義マッチ・レース',
        setup: '今週の単語とその定義を1つのレッスンリストに貼り付けます。',
        rules: '生徒は制限時間の中で単語と定義を組み合わせます。間違えるとカードは裏返り、数秒を失います。最初に盤面を片づけた生徒が、手こずった3語を読み上げます。',
        time: '5〜10分', groupSize: 'ペアまたは個人', drills: '意味の想起',
        runsWith: 'matching',
        runsWithNote: '練習モード「マッチング」がリストからペアを自動で作ります。印刷も裁断もラミネートも不要です。',
      },
      {
        name: '類義語・対義語の仕分け',
        setup: '今週の単語を黒板に1列で書き出します。',
        rules: '単語を1つ読み上げます。各チームは類義語と対義語を1つずつミニホワイトボードに書いて掲げます。類義語は1点、対義語は2点、他チームが既に出した語は0点です。',
        time: '10分', groupSize: '3〜4人のチーム', drills: '意味の広がり',
        runsWith: 'synonym',
        runsWithNote: '類義語フォーカスが同じリストを個人で復習させるので、宿題が授業の内容と一致します。',
      },
      {
        name: '文脈から穴埋め',
        setup: '6語を選び、その語を抜いた文を1つずつ書きます。',
        rules: '文を読み上げ、単語の位置ではハミングします。生徒は当てはまると思う語と、その根拠になった手がかりを書きます。答え合わせのあとは、答えではなく手がかりについて話します。',
        time: '10〜15分', groupSize: 'クラス全体', drills: '文脈からの意味推測',
        runsWith: 'context',
        runsWithNote: '文脈フォーカスが同じ穴埋めをリストから生成するので、もう一巡必要な生徒に渡せます。',
      },
      {
        name: '語根と接辞で組み立てる',
        setup: '語根3つと接辞6つを黒板に出します。',
        rules: '各グループは4分間でできるだけ多くの実在する語を組み立てます。時間が来たら1語ずつ口頭で説明します。実在しなかった語は減点なし——始める前にそう伝えてください。',
        time: '10分', groupSize: '4人グループ', drills: '形態論',
        runsWith: 'roots_affixes',
        runsWithNote: '語根・接辞フォーカスが同じ組み立てを自分のリストで、生徒ごとに実行します。',
      },
      {
        name: '語彙ビンゴ',
        setup: '生徒が3×3のマスを書き、リストから9語を書き込みます。',
        rules: '単語ではなく定義を読み上げます。生徒はその定義に当たる語を消します。3つ並べば勝ちで、勝った生徒はその列を意味つきで読み上げます。',
        time: '10分', groupSize: 'クラス全体', drills: '定義から単語へ',
        runsWith: NO_DEVICE,
        runsWithNote: '端末は不要です。紙とペンと先生の声だけ。同じリストは週の後半に画面のラウンドへ持ち込めます。',
      },
      {
        name: '共有ボードの一斉探索',
        setup: '文字ボードを1つプロジェクターに映します。',
        rules: '教室全員が同じボードで同時に単語を探し、長い語ほど高得点です。始める前に条件を決めます——リストの語だけ、またはリストの語を含む語だけ。',
        time: '5〜10分', groupSize: 'クラス全体', drills: '綴りと素早い想起',
        runsWith: 'classic',
        runsWithNote: 'クラシックモードです。生徒はどのブラウザからでも6文字のコードで、アカウントなしに参加できます。',
      },
      {
        name: '出口チケット・クイズ',
        setup: 'リストが授業に入っていれば、準備は不要です。',
        rules: '今週の単語について4択問題を制限時間つきで、最後の5分に行います。順位はその場で表示され、クラスが落とした語が翌日に教え直す語になります。',
        time: '5分', groupSize: 'クラス全体', drills: '時間内の想起',
        runsWith: 'vocab-quiz',
        runsWithNote: 'ライブの語彙クイズがリストから設問を作り、結果画面がクラスの落とした語を示します。',
      },
      {
        name: 'ホットシート',
        setup: '黒板に背を向けた椅子を1脚、前に置きます。',
        rules: '座った生徒の背後に単語を書きます。クラスはその語も語の一部も言わずに説明します。座っている生徒が当てたら、決め手になったヒントを出した生徒と交代します。',
        time: '10分', groupSize: 'クラス全体', drills: '言い換えと定義',
        runsWith: NO_DEVICE,
        runsWithNote: '端末は不要です。成立させるのは「その語を言わない」という制約なので、そこは厳しく守ってください。',
      },
      {
        name: '2つの意味、2つの文',
        setup: 'リストから、意味を2つ以上持つ語を4つ選びます。',
        rules: '生徒は1語につき2文、意味ごとに1文ずつ書きます。ペアを読み上げ、どちらの意味を使った文かをクラスに当てさせてから正解を告げます。',
        time: '10〜15分', groupSize: '個人のあとクラス全体', drills: '多義語',
        runsWith: 'multiple_meaning',
        runsWithNote: '多義語フォーカスがまさにこれらの語を個別に練習させます。紙で用意するのは大変な形式です。',
      },
      {
        name: 'フラッシュカード・スプリント',
        setup: '今週のリストを開きます。',
        rules: '90秒めくって思い出し、そのあと各自が迷った3語を書き留めます。その3語が翌日のウォームアップとして黒板に上がります。',
        time: '3〜5分', groupSize: '個人', drills: '即時想起',
        runsWith: 'flashcard',
        runsWithNote: '練習モード「フラッシュカード」が、各語の音声つきでリストを再生します。',
      },
    ],
  },

  ru: {
    heading: '10 словарных игр, которые можно провести на уроке сегодня',
    intro:
      'Десять игр для списка слов этой недели, в том порядке, в каком их удобно использовать внутри темы. Те, что не требуют ничего, кроме доски и вашего голоса, помечены; остальные работают в браузере без ученических аккаунтов.',
    labels: { time: 'Время', group: 'Состав', drills: 'Тренирует', setup: 'Подготовка', rules: 'Как играть', onLexiClash: 'В LexiClash' },
    games: [
      {
        name: 'Гонка определений',
        setup: 'Вставьте слова недели и их определения в один список урока.',
        rules: 'Ученики соединяют каждое слово с определением на время. Неверная пара переворачивается обратно и стоит несколько секунд. Кто первым очистит поле, читает вслух три самых трудных слова.',
        time: '5–10 мин', groupSize: 'Пары или по одному', drills: 'Припоминание значения',
        runsWith: 'matching',
        runsWithNote: 'Режим практики «Сопоставление» собирает пары из вашего списка — ничего не нужно печатать, резать и ламинировать.',
      },
      {
        name: 'Сортировка синонимов и антонимов',
        setup: 'Запишите слова недели в один столбец на доске.',
        rules: 'Назовите слово. Каждая команда пишет один синоним и один антоним на маленькой доске и поднимает её. Синоним — одно очко, антоним — два, слово, которое уже назвала другая команда, — ноль.',
        time: '10 мин', groupSize: 'Команды по 3–4', drills: 'Широта значения',
        runsWith: 'synonym',
        runsWithNote: 'Фокус на синонимах затем отрабатывает тот же список индивидуально, и домашняя работа совпадает с уроком.',
      },
      {
        name: 'Подстановка по контексту',
        setup: 'Выберите шесть слов и напишите к каждому предложение, убрав из него это слово.',
        rules: 'Прочитайте предложение вслух и промычите там, где стоит слово. Ученики пишут подходящее слово и подсказку, которая их навела. Раскройте ответ и обсуждайте подсказку, а не сам ответ.',
        time: '10–15 мин', groupSize: 'Весь класс', drills: 'Вывод значения из контекста',
        runsWith: 'context',
        runsWithNote: 'Фокус на контексте создаёт то же задание с пропусками из вашего списка для тех, кому нужен второй заход.',
      },
      {
        name: 'Сборка из корней и аффиксов',
        setup: 'Вынесите на доску три корня и шесть аффиксов.',
        rules: 'Группы за четыре минуты собирают как можно больше настоящих слов. Каждое слово нужно защитить вслух, когда время выйдет. Попытки, оказавшиеся не словами, ничего не стоят — скажите это заранее.',
        time: '10 мин', groupSize: 'Группы по 4', drills: 'Морфология',
        runsWith: 'roots_affixes',
        runsWithNote: 'Фокус на корнях и аффиксах проводит ту же сборку на вашем списке, по одному ученику.',
      },
      {
        name: 'Словарное бинго',
        setup: 'Ученики чертят сетку три на три и заполняют её девятью словами из списка.',
        rules: 'Читайте определение, а не слово. Ученики вычёркивают слово, которое оно описывает. Три в ряд — победа, и победитель зачитывает свою линию со значениями.',
        time: '10 мин', groupSize: 'Весь класс', drills: 'От определения к слову',
        runsWith: NO_DEVICE,
        runsWithNote: 'Устройство не нужно — бумага, ручка и ваш голос. Тот же список можно принести на экранный раунд позже.',
      },
      {
        name: 'Общий обзор поля',
        setup: 'Выведите одно буквенное поле на проектор.',
        rules: 'Весь класс ищет слова на одном поле одновременно, длинные слова стоят дороже. Задайте условие до старта — только слова из списка или только слова, которые их содержат.',
        time: '5–10 мин', groupSize: 'Весь класс', drills: 'Орфография и быстрый поиск',
        runsWith: 'classic',
        runsWithNote: 'Классический режим. Ученики заходят из любого браузера по коду из шести символов, без аккаунта.',
      },
      {
        name: 'Викторина на выходе',
        setup: 'Ничего, если список уже в уроке.',
        rules: 'Вопросы с четырьмя вариантами по словам недели на время, в последние пять минут. Таблица видна сразу, а слова, которые класс не взял, вы повторяете завтра.',
        time: '5 мин', groupSize: 'Весь класс', drills: 'Припоминание на время',
        runsWith: 'vocab-quiz',
        runsWithNote: 'Живая словарная викторина составляет вопросы из вашего списка, а экран результатов называет пропущенные слова.',
      },
      {
        name: 'Горячий стул',
        setup: 'Один стул впереди, спиной к доске.',
        rules: 'Напишите слово за спиной сидящего ученика. Класс описывает его, не называя ни слово, ни его часть. Сидящий угадывает и меняется с тем, чья подсказка сработала.',
        time: '10 мин', groupSize: 'Весь класс', drills: 'Перефразирование и определение',
        runsWith: NO_DEVICE,
        runsWithNote: 'Устройство не нужно. Работает это благодаря запрету на само слово, так что держите правило строго.',
      },
      {
        name: 'Два значения, два предложения',
        setup: 'Выберите из списка четыре слова, у которых больше одного значения.',
        rules: 'Каждый ученик пишет по два предложения на слово, по одному на значение. Прочитайте пару вслух и дайте классу назвать, какое значение использовано, прежде чем подтвердить.',
        time: '10–15 мин', groupSize: 'Сначала по одному, потом класс', drills: 'Многозначные слова',
        runsWith: 'multiple_meaning',
        runsWithNote: 'Фокус на многозначности отрабатывает именно эти слова отдельно, а на бумаге это собрать трудно.',
      },
      {
        name: 'Спринт по карточкам',
        setup: 'Откройте список этой недели.',
        rules: 'Девяносто секунд переворачивания и припоминания, затем каждый записывает три слова, на которых запнулся. Эти три идут на доску как завтрашняя разминка.',
        time: '3–5 мин', groupSize: 'По одному', drills: 'Мгновенное припоминание',
        runsWith: 'flashcard',
        runsWithNote: 'Режим практики «Карточки» проигрывает ваш список с озвучкой каждого слова.',
      },
    ],
  },
};

export function getVocabClassGames(locale: string): ClassGameSection {
  const normalized = locale.toLowerCase().split('-')[0] as ClassGameLocale;
  return SECTIONS[normalized] ?? SECTIONS.en;
}
