import { NO_DEVICE, type ClassGameSection } from '@/components/education/ClassGameList';
import type { EducationLocale } from '../_englishLearner/types';

/**
 * Six English games for adult learners. Names stay disjoint from the ESL list,
 * the vocabulary classroom list, and the other learner landings.
 */

const SECTIONS: Record<EducationLocale, ClassGameSection> = {
  en: {
    heading: 'Six English games for adult learners',
    intro:
      'Six games for an adult English room: collocations, false friends, register, and the verbs that belong on a CV. The ones that need no device say so on their own row. The rest run in the browser from a six-character code, with no student accounts.',
    labels: { time: 'Time', group: 'Group', drills: 'Drills', setup: 'Setup', rules: 'How to play', onLexiClash: 'On LexiClash' },
    games: [
      {
        name: 'Workplace Collocation Race',
        setup: 'Paste twelve workplace verbs and the nouns they actually take: file a report, take minutes, raise a concern.',
        rules: 'Students match each verb to the noun it belongs with. A wrong pair costs time. First to clear the set reads the three collocations they would never say at work.',
        time: '6–8 min', groupSize: 'Pairs or solo', drills: 'Workplace collocation',
        runsWith: 'matching',
        runsWithNote: 'The Matching practice mode pairs the verbs with their nouns from your list — no cards to cut.',
      },
      {
        name: 'False Friend Spot',
        setup: 'Write six English words that look like words in the students’ first language but do not mean the same thing.',
        rules: 'For each word, students write what it looks like it means, then what it actually means. Compare, and keep the false friend on the board all week.',
        time: '10 min', groupSize: 'Whole class', drills: 'Cross-language interference',
        runsWith: NO_DEVICE,
        runsWithNote: 'No device needed. Six words, two columns, and the first language they already bring to the room.',
      },
      {
        name: 'Register Shift',
        setup: 'Write four informal phrases and four workplace versions of the same idea.',
        rules: 'Read the informal line. Pairs rewrite it for an email to a manager in forty seconds and hold it up. Pick one rewrite, tighten the register, and move on.',
        time: '10 min', groupSize: 'Pairs', drills: 'Formal versus informal',
        runsWith: NO_DEVICE,
        runsWithNote: 'No device needed. Eight lines on the board and a forty-second rewrite is the whole machine.',
      },
      {
        name: 'Idiom Unpack',
        setup: 'Open a short list of workplace idioms with a plain-English gloss for each.',
        rules: 'Flip a card, read the idiom, say the gloss from memory, then use it in one spoken sentence about a job they actually have. Ninety seconds, then write down the two that would not come.',
        time: '4–6 min', groupSize: 'Solo, then whole class', drills: 'Idiom recall',
        runsWith: 'flashcard',
        runsWithNote: 'The Flashcard practice mode plays your idiom list with audio, which is what a paper pile will not do at this speed.',
      },
      {
        name: 'CV Action Drill',
        setup: 'Put eight resume verbs on the list: led, shipped, cut, raised, built, ran, closed, hired.',
        rules: 'Each student writes one CV bullet with a verb from the list in two minutes. Three volunteers read theirs; the class names the verb and whether the bullet could sit on a real CV.',
        time: '8–10 min', groupSize: 'Solo, then whole class', drills: 'Workplace verb use',
        runsWith: 'warmup',
        runsWithNote: 'The Warm-Up practice mode runs the same verb list one item at a time for anyone who froze on the bullet.',
      },
      {
        name: 'Headline Hunt',
        setup: 'Pick one news-word from this week’s list before the round starts.',
        rules: 'The class hunts that word on a shared letter grid. Other finds still score, but the round is about the headline word, which you then unpack in one real sentence from this morning’s news.',
        time: '5–8 min', groupSize: 'Whole class', drills: 'News vocabulary in situ',
        runsWith: 'word-hunt',
        runsWithNote: 'Word Hunt mode, chosen on the host screen, so the headline word stays the point of the round.',
      },
    ],
  },

  he: {
    heading: 'שישה משחקי אנגלית ללומדים בוגרים',
    intro:
      'שישה משחקים לכיתת אנגלית של מבוגרים: צירופים, ידידים כוזבים, משלב, ופעלים ששייכים לקורות חיים. אלה שלא דורשים מכשיר אומרים זאת בשורה שלהם. השאר רצים בדפדפן עם קוד בן שש תווים, בלי חשבונות לתלמידים.',
    labels: { time: 'זמן', group: 'הרכב', drills: 'מתרגל', setup: 'הכנה', rules: 'איך משחקים', onLexiClash: 'ב-LexiClash' },
    games: [
      {
        name: 'מרוץ צירופים ממקום העבודה',
        setup: 'הדביקו שניים-עשר פעלים ממקום העבודה ואת השמות שהם באמת לוקחים: file a report, take minutes, raise a concern.',
        rules: 'התלמידים מתאימים כל פועל לשם ששייך לו. זוג שגוי עולה בזמן. מי שמנקה ראשון מקריא את שלושת הצירופים שלעולם לא היה אומר בעבודה.',
        time: '6–8 דק׳', groupSize: 'זוגות או יחידים', drills: 'צירופים ממקום העבודה',
        runsWith: 'matching',
        runsWithNote: 'מצב התרגול "התאמה" מצמיד את הפעלים לשמות מהרשימה שלכם — בלי לגזור כרטיסים.',
      },
      {
        name: 'מצאו את הידיד הכוזב',
        setup: 'כתבו שש מילים באנגלית שנראות כמו מילים בשפת האם אבל לא אומרות אותו דבר.',
        rules: 'לכל מילה התלמידים כותבים מה נראה שהיא אומרת, ואז מה היא באמת אומרת. השוו, והשאירו את הידיד הכוזב על הלוח כל השבוע.',
        time: '10 דק׳', groupSize: 'כל הכיתה', drills: 'הפרעה בין שפות',
        runsWith: NO_DEVICE,
        runsWithNote: 'לא צריך מכשיר. שש מילים, שתי עמודות, ושפת האם שהם כבר מביאים לחדר.',
      },
      {
        name: 'החלפת משלב',
        setup: 'כתבו ארבעה ביטויים לא פורמליים וארבעה נוסחים ממקום העבודה לאותו רעיון.',
        rules: 'הקריאו את השורה הלא פורמלית. הזוגות כותבים אותה מחדש למייל למנהל בארבעים שניות ומרימים. בחרו נוסח אחד, הדקו את המשלב, והמשיכו.',
        time: '10 דק׳', groupSize: 'זוגות', drills: 'פורמלי מול לא פורמלי',
        runsWith: NO_DEVICE,
        runsWithNote: 'לא צריך מכשיר. שמונה שורות על הלוח וכתיבה מחדש של ארבעים שניות — זה כל המנגנון.',
      },
      {
        name: 'פרקו את הניב',
        setup: 'פתחו רשימה קצרה של ניבים ממקום העבודה עם פירוש פשוט לכל אחד.',
        rules: 'הפכו כרטיס, קראו את הניב, אמרו את הפירוש מהזיכרון, ואז השתמשו בו במשפט על עבודה שיש להם באמת. תשעים שניות, ואז כותבים את השניים שלא עלו.',
        time: '4–6 דק׳', groupSize: 'לבד, ואז כל הכיתה', drills: 'שליפת ניבים',
        runsWith: 'flashcard',
        runsWithNote: 'מצב התרגול "כרטיסיות" מריץ את רשימת הניבים עם שמע — מה שערימת נייר לא עושה במהירות הזו.',
      },
      {
        name: 'תרגול פעולה לקורות חיים',
        setup: 'שימו ברשימה שמונה פעלים לקורות חיים: led, shipped, cut, raised, built, ran, closed, hired.',
        rules: 'כל תלמיד כותב במשך שתי דקות שורת קורות חיים אחת עם פועל מהרשימה. שלושה מתנדבים מקריאים; הכיתה מזהה את הפועל ואם השורה יכולה לשבת בקורות חיים אמיתיים.',
        time: '8–10 דק׳', groupSize: 'לבד, ואז כל הכיתה', drills: 'שימוש בפועלי עבודה',
        runsWith: 'warmup',
        runsWithNote: 'מצב התרגול "חימום" מריץ את אותה רשימת פעלים פריט-פריט למי שקפא על השורה.',
      },
      {
        name: 'ציד כותרת',
        setup: 'בחרו מילת חדשות אחת מרשימת השבוע לפני תחילת הסיבוב.',
        rules: 'הכיתה מחפשת את המילה על רשת אותיות משותפת. מציאות אחרות עדיין מזכות, אבל הסיבוב הוא על מילת הכותרת, שאותה תפרקו במשפט אמיתי מחדשות הבוקר.',
        time: '5–8 דק׳', groupSize: 'כל הכיתה', drills: 'אוצר מילים חדשותי במקומו',
        runsWith: 'word-hunt',
        runsWithNote: 'מצב Word Hunt, שנבחר במסך המארח, כך שמילת הכותרת נשארת מוקד הסיבוב.',
      },
    ],
  },

  es: {
    heading: 'Seis juegos de inglés para adultos',
    intro:
      'Seis juegos para un aula de inglés de adultos: colocaciones, falsos amigos, registro y los verbos que caben en un CV. Los que no necesitan dispositivo lo dicen en su propia fila. El resto se juega en el navegador con un código de seis caracteres, sin cuentas de alumno.',
    labels: { time: 'Tiempo', group: 'Agrupación', drills: 'Practica', setup: 'Preparación', rules: 'Cómo se juega', onLexiClash: 'En LexiClash' },
    games: [
      {
        name: 'Carrera de colocaciones laborales',
        setup: 'Pega doce verbos del trabajo y los nombres que de verdad rigen: file a report, take minutes, raise a concern.',
        rules: 'Los estudiantes emparejan cada verbo con el nombre que le corresponde. Un par erróneo cuesta tiempo. Quien limpia el set primero lee las tres colocaciones que jamás diría en el trabajo.',
        time: '6–8 min', groupSize: 'Parejas o individual', drills: 'Colocación laboral',
        runsWith: 'matching',
        runsWithNote: 'El modo de práctica Emparejar junta los verbos con sus nombres a partir de tu lista — sin recortar fichas.',
      },
      {
        name: 'Caza el falso amigo',
        setup: 'Escribe seis palabras inglesas que parecen palabras de la lengua materna pero no significan lo mismo.',
        rules: 'Por cada palabra, los estudiantes escriben lo que parece significar y luego lo que significa de verdad. Comparad, y dejad el falso amigo en la pizarra toda la semana.',
        time: '10 min', groupSize: 'Toda la clase', drills: 'Interferencia entre lenguas',
        runsWith: NO_DEVICE,
        runsWithNote: 'Sin dispositivo. Seis palabras, dos columnas y la lengua materna que ya traen al aula.',
      },
      {
        name: 'Cambio de registro',
        setup: 'Escribe cuatro frases informales y cuatro versiones laborales de la misma idea.',
        rules: 'Lee la línea informal. Las parejas la reescriben para un correo al jefe en cuarenta segundos y la levantan. Elige una, aprieta el registro y sigue.',
        time: '10 min', groupSize: 'Parejas', drills: 'Formal frente a informal',
        runsWith: NO_DEVICE,
        runsWithNote: 'Sin dispositivo. Ocho líneas en la pizarra y una reescritura de cuarenta segundos es toda la máquina.',
      },
      {
        name: 'Desempaqueta el modismo',
        setup: 'Abre una lista corta de modismos laborales con una glosa en inglés sencillo para cada uno.',
        rules: 'Gira una tarjeta, lee el modismo, di la glosa de memoria y úsalo en una frase hablada sobre un trabajo que de verdad tengan. Noventa segundos, luego anotan los dos que no salieron.',
        time: '4–6 min', groupSize: 'Individual, luego toda la clase', drills: 'Recuerdo de modismos',
        runsWith: 'flashcard',
        runsWithNote: 'El modo de práctica Tarjetas recorre tu lista de modismos con audio, algo que un montón de papel no hace a esta velocidad.',
      },
      {
        name: 'Entrenamiento de acción para el CV',
        setup: 'Pon ocho verbos de currículum en la lista: led, shipped, cut, raised, built, ran, closed, hired.',
        rules: 'Cada estudiante escribe en dos minutos una viñeta de CV con un verbo de la lista. Tres voluntarios leen; la clase nombra el verbo y si la viñeta aguantaría en un CV de verdad.',
        time: '8–10 min', groupSize: 'Individual, luego toda la clase', drills: 'Uso de verbos laborales',
        runsWith: 'warmup',
        runsWithNote: 'El modo de práctica Calentamiento recorre la misma lista de verbos uno a uno para quien se quedó congelado en la viñeta.',
      },
      {
        name: 'Caza el titular',
        setup: 'Elige una palabra de noticia de la lista de la semana antes de empezar la ronda.',
        rules: 'La clase busca esa palabra en una cuadrícula de letras compartida. Otros hallazgos siguen puntuando, pero la ronda va de la palabra del titular, que luego desarmas en una frase real de las noticias de esta mañana.',
        time: '5–8 min', groupSize: 'Toda la clase', drills: 'Vocabulario de noticias in situ',
        runsWith: 'word-hunt',
        runsWithNote: 'Modo Word Hunt, elegido en la pantalla del anfitrión, para que la palabra del titular siga siendo el centro de la ronda.',
      },
    ],
  },

  sv: {
    heading: 'Sex engelska lekar för vuxna elever',
    intro:
      'Sex lekar för ett engelskt klassrum med vuxna: kollokationer, falska vänner, stilnivå och verben som hör hemma i ett CV. De som inte behöver någon enhet säger det på sin egen rad. Resten körs i webbläsaren med en sexteckenskod, utan elevkonton.',
    labels: { time: 'Tid', group: 'Gruppering', drills: 'Tränar', setup: 'Förberedelse', rules: 'Så spelas den', onLexiClash: 'På LexiClash' },
    games: [
      {
        name: 'Kollokationslopp på jobbet',
        setup: 'Klistra in tolv arbetsplatsverb och substantiven de faktiskt tar: file a report, take minutes, raise a concern.',
        rules: 'Eleverna matchar varje verb mot substantivet det hör ihop med. Ett fel par kostar tid. Den som rensar setet först läser de tre kollokationerna de aldrig skulle säga på jobbet.',
        time: '6–8 min', groupSize: 'Par eller enskilt', drills: 'Kollokation på arbetsplatsen',
        runsWith: 'matching',
        runsWithNote: 'Övningsläget Matchning parar verben med deras substantiv från din lista — inga kort att klippa.',
      },
      {
        name: 'Spotten på falska vänner',
        setup: 'Skriv sex engelska ord som liknar ord i elevernas förstaspråk men inte betyder samma sak.',
        rules: 'För varje ord skriver eleverna vad det ser ut att betyda, sedan vad det faktiskt betyder. Jämför, och låt den falska vännen stå kvar på tavlan hela veckan.',
        time: '10 min', groupSize: 'Hela klassen', drills: 'Språklig interferens',
        runsWith: NO_DEVICE,
        runsWithNote: 'Ingen enhet behövs. Sex ord, två kolumner och förstaspråket de redan tar med sig in i rummet.',
      },
      {
        name: 'Stilvårdsskifte',
        setup: 'Skriv fyra informella fraser och fyra arbetsplatsversioner av samma idé.',
        rules: 'Läs den informella raden. Paren skriver om den till ett mejl till chefen på fyrtio sekunder och håller upp. Välj en omskrivning, dra åt registret och gå vidare.',
        time: '10 min', groupSize: 'Par', drills: 'Formellt mot informellt',
        runsWith: NO_DEVICE,
        runsWithNote: 'Ingen enhet behövs. Åtta rader på tavlan och en omskrivning på fyrtio sekunder är hela maskineriet.',
      },
      {
        name: 'Packa upp idiomet',
        setup: 'Öppna en kort lista arbetsplatsidiom med en enkel engelsk gloss till varje.',
        rules: 'Vänd ett kort, läs idiomet, säg glosan ur minnet och använd det i en talad mening om ett jobb de faktiskt har. Nittio sekunder, sedan skrivs de två som inte kom.',
        time: '4–6 min', groupSize: 'Enskilt, sedan hela klassen', drills: 'Idiomåterkallelse',
        runsWith: 'flashcard',
        runsWithNote: 'Övningsläget Flashcards spelar din idiomlista med ljud, vilket en pappershög inte gör i den här takten.',
      },
      {
        name: 'CV-handlingsövning',
        setup: 'Sätt åtta meritförteckningsverb på listan: led, shipped, cut, raised, built, ran, closed, hired.',
        rules: 'Varje elev skriver på två minuter en CV-punkt med ett verb från listan. Tre frivilliga läser; klassen namnger verbet och om punkten skulle hålla i ett riktigt CV.',
        time: '8–10 min', groupSize: 'Enskilt, sedan hela klassen', drills: 'Arbetsplatsverb i bruk',
        runsWith: 'warmup',
        runsWithNote: 'Övningsläget Uppvärmning kör samma verblista en i taget för den som frös på punkten.',
      },
      {
        name: 'Rubrikjakt',
        setup: 'Välj ett nyhetsord från veckans lista innan rundan startar.',
        rules: 'Klassen jagar det ordet på ett delat bokstavsrutnät. Andra fynd ger fortfarande poäng, men rundan handlar om rubrikordet, som du sedan packar upp i en riktig mening från morgonens nyheter.',
        time: '5–8 min', groupSize: 'Hela klassen', drills: 'Nyhetsord på plats',
        runsWith: 'word-hunt',
        runsWithNote: 'Läget Word Hunt, valt på värdskärmen, så att rubrikordet förblir rundans poäng.',
      },
    ],
  },

  ja: {
    heading: '大人の英語学習者向けゲーム6選',
    intro:
      '大人の英語クラス向けの6ゲームです。コロケーション、偽の友達、文体、履歴書に載る動詞。端末が要らないものにはその旨を各行に書いてあります。ほかは6文字のコードでブラウザから参加でき、生徒用アカウントは不要です。',
    labels: { time: '時間', group: '人数', drills: '鍛える力', setup: '準備', rules: '進め方', onLexiClash: 'LexiClashでは' },
    games: [
      {
        name: '職場コロケーション競争',
        setup: '職場の動詞12と、実際にくっつく名詞を貼ります（file a report、take minutes、raise a concern）。',
        rules: '生徒は各動詞を、それに属する名詞と組にします。不正解は時間を食います。最初に揃えた人が、職場では絶対言わない3つの組を読みます。',
        time: '6〜8分', groupSize: 'ペアまたは個人', drills: '職場のコロケーション',
        runsWith: 'matching',
        runsWithNote: '練習モード「マッチング」がリストの動詞と名詞を組にするので、カードを切る必要はありません。',
      },
      {
        name: '偽の友達を見つける',
        setup: '母語の語に似ていて意味が違う英語を6つ黒板に書きます。',
        rules: '各語について、一見の意味と本当の意味を書きます。比べ、その偽の友達を一週間黒板に残します。',
        time: '10分', groupSize: 'クラス全体', drills: '言語間の干渉',
        runsWith: NO_DEVICE,
        runsWithNote: '端末は不要です。6語と2列、教室にすでに持ってきている母語が道具です。',
      },
      {
        name: '文体シフト',
        setup: 'くだけた表現を4つ、同じ内容の職場向けを4つ書きます。',
        rules: 'くだけた文を読みます。ペアは上司へのメール用に40秒で書き直し、掲げます。1つ選んで文体を引き締め、次へ進みます。',
        time: '10分', groupSize: 'ペア', drills: 'フォーマル対インフォーマル',
        runsWith: NO_DEVICE,
        runsWithNote: '端末は不要です。黒板の8行と40秒の書き直しが、仕組みのすべてです。',
      },
      {
        name: 'イディオムをほどく',
        setup: '職場のイディオムの短いリストを開き、それぞれに平易な英語の語釈を付けます。',
        rules: 'カードをめくり、イディオムを読み、語釈を記憶から言い、実際の仕事の文に1つ使います。90秒のあと、出てこなかった2つを書きます。',
        time: '4〜6分', groupSize: '個人のあとクラス全体', drills: 'イディオムの想起',
        runsWith: 'flashcard',
        runsWithNote: '練習モード「フラッシュカード」が音声つきでイディオムリストを進めます。紙の束ではこの速さは出ません。',
      },
      {
        name: '履歴書アクション練習',
        setup: '履歴書向きの動詞を8つリストに入れます（led, shipped, cut, raised, built, ran, closed, hired）。',
        rules: '各自2分で、リストの動詞を使った履歴書の箇条を1つ書きます。3人が読み、クラスは動詞を言い、本物の履歴書に載るかを判断します。',
        time: '8〜10分', groupSize: '個人のあとクラス全体', drills: '職場動詞の使用',
        runsWith: 'warmup',
        runsWithNote: '練習モード「ウォームアップ」が、箇条で固まった人のために同じ動詞リストを1語ずつ回します。',
      },
      {
        name: '見出し語を探す',
        setup: 'ラウンド開始前に、今週のリストからニュースの語を1つ選びます。',
        rules: 'クラスは共有の文字ボードでその語を探します。ほかの発見も得点になりますが、主役は見出しの語。朝のニュースの実文でほどきます。',
        time: '5〜8分', groupSize: 'クラス全体', drills: '現場のニュース語彙',
        runsWith: 'word-hunt',
        runsWithNote: 'ホスト画面で Word Hunt を選ぶと、見出しの語がラウンドの中心のままになります。',
      },
    ],
  },

  ru: {
    heading: 'Шесть игр на английском для взрослых',
    intro:
      'Шесть игр для урока английского со взрослыми: коллокации, ложные друзья, регистр и глаголы, которым место в резюме. Те, что не требуют устройства, говорят об этом в своей строке. Остальные идут в браузере по коду из шести знаков, без ученических аккаунтов.',
    labels: { time: 'Время', group: 'Состав', drills: 'Тренирует', setup: 'Подготовка', rules: 'Как играть', onLexiClash: 'В LexiClash' },
    games: [
      {
        name: 'Гонка рабочих коллокаций',
        setup: 'Вставьте двенадцать рабочих глаголов и существительные, которые они на самом деле берут: file a report, take minutes, raise a concern.',
        rules: 'Ученики сопоставляют каждый глагол с существительным, с которым он живёт. Неверная пара стоит времени. Кто первым расчистил набор, читает три коллокации, которые никогда не сказал бы на работе.',
        time: '6–8 мин', groupSize: 'Пары или по одному', drills: 'Рабочая коллокация',
        runsWith: 'matching',
        runsWithNote: 'Режим практики «Сопоставление» склеивает глаголы с существительными из вашего списка — карточки резать не нужно.',
      },
      {
        name: 'Поймай ложного друга',
        setup: 'Напишите шесть английских слов, которые похожи на слова родного языка, но значат другое.',
        rules: 'К каждому слову ученики пишут, что оно будто значит, затем что значит на самом деле. Сверьте и оставьте ложного друга на доске на всю неделю.',
        time: '10 мин', groupSize: 'Весь класс', drills: 'Межъязыковая интерференция',
        runsWith: NO_DEVICE,
        runsWithNote: 'Устройство не нужно. Шесть слов, два столбца и родной язык, который они уже принесли в комнату.',
      },
      {
        name: 'Сдвиг регистра',
        setup: 'Напишите четыре неформальные фразы и четыре рабочие версии той же мысли.',
        rules: 'Прочитайте неформальную строку. Пары за сорок секунд переписывают её в письмо руководителю и поднимают. Выберите одну, подтяните регистр и идите дальше.',
        time: '10 мин', groupSize: 'Пары', drills: 'Формальное против неформального',
        runsWith: NO_DEVICE,
        runsWithNote: 'Устройство не нужно. Восемь строк на доске и переписка за сорок секунд — вся машина.',
      },
      {
        name: 'Распакуй идиому',
        setup: 'Откройте короткий список рабочих идиом с простым английским толкованием к каждой.',
        rules: 'Переверните карточку, прочитайте идиому, скажите толкование по памяти и вставьте её в устное предложение о работе, которая у них есть. Девяносто секунд, затем записывают две, что не пришли.',
        time: '4–6 мин', groupSize: 'По одному, затем весь класс', drills: 'Припоминание идиом',
        runsWith: 'flashcard',
        runsWithNote: 'Режим практики «Карточки» гоняет ваш список идиом со звуком — бумажная стопка так быстро не умеет.',
      },
      {
        name: 'Тренировка действий для резюме',
        setup: 'Поставьте в список восемь глаголов резюме: led, shipped, cut, raised, built, ran, closed, hired.',
        rules: 'Каждый за две минуты пишет один пункт резюме с глаголом из списка. Трое читают; класс называет глагол и решает, удержался бы пункт в настоящем резюме.',
        time: '8–10 мин', groupSize: 'По одному, затем весь класс', drills: 'Рабочие глаголы в деле',
        runsWith: 'warmup',
        runsWithNote: 'Режим практики «Разминка» ведёт тот же список глаголов по одному для тех, кто замер на пункте.',
      },
      {
        name: 'Охота за заголовком',
        setup: 'Выберите одно новостное слово из списка недели до начала раунда.',
        rules: 'Класс ищет это слово на общей буквенной сетке. Другие находки тоже считаются, но раунд — про слово заголовка, которое вы потом разбираете в настоящем предложении из утренних новостей.',
        time: '5–8 мин', groupSize: 'Весь класс', drills: 'Новостная лексика на месте',
        runsWith: 'word-hunt',
        runsWithNote: 'Режим Word Hunt на экране ведущего, чтобы слово заголовка осталось смыслом раунда.',
      },
    ],
  },
};

export function getAdultsClassGames(locale: string): ClassGameSection {
  const normalized = locale.toLowerCase().split('-')[0] as EducationLocale;
  return SECTIONS[normalized] ?? SECTIONS.en;
}
