import { NO_DEVICE, type ClassGameSection } from '@/components/education/ClassGameList';
import type { EducationLocale } from '../_englishLearner/types';

/**
 * Six games for English vocabulary by topic. Names stay disjoint from the ESL
 * list, the vocabulary classroom list, and the other learner landings.
 */

const SECTIONS: Record<EducationLocale, ClassGameSection> = {
  en: {
    heading: 'Six games for English vocabulary by topic',
    intro:
      'Six games that put a topic list to work: kitchen, animals, packing, the school day. The ones that need no device say so on their own row. The rest run in the browser from a six-character code, with no student accounts.',
    labels: { time: 'Time', group: 'Group', drills: 'Drills', setup: 'Setup', rules: 'How to play', onLexiClash: 'On LexiClash' },
    games: [
      {
        name: 'Topic Basket Sort',
        setup: 'Mix twenty word cards from two topics, food and travel, in one pile.',
        rules: 'Teams sort the pile into two baskets against a timer. A card in the wrong basket is returned. First team finished reads the five that almost went in the other basket.',
        time: '8 min', groupSize: 'Teams of 3–4', drills: 'Topic categorisation',
        runsWith: 'matching',
        runsWithNote: 'The Matching practice mode can pair each word with its topic from your list when you want the same sort without cutting cards.',
      },
      {
        name: 'Kitchen Grid',
        setup: 'Load a letter grid and write the kitchen topic on the board before you start.',
        rules: 'The class finds food and kitchen words on the shared grid. Longer words score more. After two minutes, group the finds under utensils, food, and actions.',
        time: '5–8 min', groupSize: 'Whole class', drills: 'Kitchen vocabulary retrieval',
        runsWith: 'classic',
        runsWithNote: 'Classic mode, with the kitchen list pasted into the lesson so off-topic finds still score but the discussion stays on topic.',
      },
      {
        name: 'Animal Categories',
        setup: 'Write twelve animal words in a cloud on the board, no groups yet.',
        rules: 'Pairs have two minutes to group them under farm, wild, and pet. Then hear one pair’s grouping and let the room challenge any animal that sits in two groups.',
        time: '8–10 min', groupSize: 'Pairs, then whole class', drills: 'Semantic categories',
        runsWith: NO_DEVICE,
        runsWithNote: 'No device needed. Twelve animal words and three headings you write as the pairs finish.',
      },
      {
        name: 'Packing Bag Race',
        setup: 'Open a travel-word list and a two-minute timer.',
        rules: 'Students type as many packing words as they can from memory of the list. Stop dead. Three students read their last word, and those three become the suitcase you pack on the board.',
        time: '3–5 min', groupSize: 'Solo', drills: 'Rapid topic recall',
        runsWith: 'blitz',
        runsWithNote: 'The Blitz practice mode is the timed run; the list is the travel topic you set for the week.',
      },
      {
        name: 'School-Day Hunt',
        setup: 'Pick one school-day word before the round: locker, recess, timetable, assembly.',
        rules: 'The class hunts that word on a shared grid. Other school words still score, but the round is about the one you named, which you then put into a sentence about an actual period today.',
        time: '5–8 min', groupSize: 'Whole class', drills: 'School vocabulary in situ',
        runsWith: 'word-hunt',
        runsWithNote: 'Word Hunt mode, chosen on the host screen, so the school-day word stays the point of the round.',
      },
      {
        name: 'Theme Swap',
        setup: 'Two topic headings on the board, and a pile of twelve word cards face down.',
        rules: 'A student draws a card and walks it to the heading it belongs under, saying why in one sentence. If the room disagrees, the card sits between the headings until someone makes a case.',
        time: '10 min', groupSize: 'Whole class', drills: 'Justifying a category',
        runsWith: NO_DEVICE,
        runsWithNote: 'No device needed. Two headings, twelve cards, and a rule that a disputed card stays in the gap.',
      },
    ],
  },

  he: {
    heading: 'שישה משחקים לאוצר מילים באנגלית לפי נושא',
    intro:
      'שישה משחקים שמעמידים רשימת נושא לעבודה: מטבח, חיות, אריזה, יום הלימודים. אלה שלא דורשים מכשיר אומרים זאת בשורה שלהם. השאר רצים בדפדפן עם קוד בן שש תווים, בלי חשבונות לתלמידים.',
    labels: { time: 'זמן', group: 'הרכב', drills: 'מתרגל', setup: 'הכנה', rules: 'איך משחקים', onLexiClash: 'ב-LexiClash' },
    games: [
      {
        name: 'מיון לסל נושא',
        setup: 'ערבבו עשרים כרטיסי מילים משני נושאים, אוכל ונסיעות, לערימה אחת.',
        rules: 'הקבוצות ממיינות את הערימה לשני סלים מול שעון. כרטיס בסל הלא נכון חוזר. הקבוצה שסיימה ראשונה מקריאה את החמישה שכמעט נכנסו לסל השני.',
        time: '8 דק׳', groupSize: 'קבוצות של 3–4', drills: 'סיווג לפי נושא',
        runsWith: 'matching',
        runsWithNote: 'מצב התרגול "התאמה" יכול לצמיד כל מילה לנושא שלה מהרשימה, כשרוצים את אותו מיון בלי לגזור כרטיסים.',
      },
      {
        name: 'רשת המטבח',
        setup: 'טענו רשת אותיות וכתבו את נושא המטבח על הלוח לפני שמתחילים.',
        rules: 'הכיתה מוצאת מילות אוכל ומטבח על הרשת המשותפת. מילים ארוכות שוות יותר. אחרי שתי דקות מיינו את המציאות לכלים, אוכל ופעולות.',
        time: '5–8 דק׳', groupSize: 'כל הכיתה', drills: 'שליפת אוצר מילים של מטבח',
        runsWith: 'classic',
        runsWithNote: 'מצב קלאסי, עם רשימת המטבח מודבקת בשיעור כך שמציאות מחוץ לנושא עדיין מזכות אבל השיחה נשארת בנושא.',
      },
      {
        name: 'קטגוריות חיות',
        setup: 'כתבו שתים-עשרה מילות חיות בענן על הלוח, בלי קבוצות עדיין.',
        rules: 'לזוגות יש שתי דקות לחלק לחווה, בר וחיית בית. אחר כך שמעו מיון של זוג אחד ותנו לחדר לערער על חיה שיושבת בשתי קבוצות.',
        time: '8–10 דק׳', groupSize: 'זוגות, ואז כל הכיתה', drills: 'קטגוריות משמעות',
        runsWith: NO_DEVICE,
        runsWithNote: 'לא צריך מכשיר. שתים-עשרה מילות חיות ושלוש כותרות שאתם כותבים כשהזוגות מסיימים.',
      },
      {
        name: 'מרוץ תיק האריזה',
        setup: 'פתחו רשימת מילות נסיעה ושעון של שתי דקות.',
        rules: 'התלמידים מקלידים כמה שיותר מילות אריזה מזיכרון הרשימה. עצירה חדה. שלושה מקריאים את המילה האחרונה, ושלוש אלה הופכות למזוודה שאתם אורזים על הלוח.',
        time: '3–5 דק׳', groupSize: 'לבד', drills: 'שליפה מהירה לפי נושא',
        runsWith: 'blitz',
        runsWithNote: 'מצב התרגול "בליץ" הוא הריצה המתוזמנת; הרשימה היא נושא הנסיעה שהגדרתם לשבוע.',
      },
      {
        name: 'ציד יום הלימודים',
        setup: 'בחרו מילת יום-לימודים אחת לפני הסיבוב: locker, recess, timetable, assembly.',
        rules: 'הכיתה מחפשת את המילה על רשת משותפת. מילות בית ספר אחרות עדיין מזכות, אבל הסיבוב הוא על זו שקבעתם, שאותה תכניסו למשפט על שיעור אמיתי מהיום.',
        time: '5–8 דק׳', groupSize: 'כל הכיתה', drills: 'אוצר מילים של בית ספר במקומו',
        runsWith: 'word-hunt',
        runsWithNote: 'מצב Word Hunt, שנבחר במסך המארח, כך שמילת יום הלימודים נשארת מוקד הסיבוב.',
      },
      {
        name: 'החלפת נושא',
        setup: 'שתי כותרות נושא על הלוח, וערימה של שניים-עשר כרטיסי מילים הפוכים.',
        rules: 'תלמיד שולף כרטיס והולך איתו לכותרת שהוא שייך אליה, ומסביר במשפט אחד למה. אם החדר לא מסכים, הכרטיס יושב בין הכותרות עד שמישהו מביא נימוק.',
        time: '10 דק׳', groupSize: 'כל הכיתה', drills: 'הצדקה של קטגוריה',
        runsWith: NO_DEVICE,
        runsWithNote: 'לא צריך מכשיר. שתי כותרות, שניים-עשר כרטיסים, וכלל שכרטיס שנוי במחלוקת נשאר ברווח.',
      },
    ],
  },

  es: {
    heading: 'Seis juegos de vocabulario en inglés por temas',
    intro:
      'Seis juegos que ponen a trabajar una lista temática: cocina, animales, hacer la maleta, el día escolar. Los que no necesitan dispositivo lo dicen en su propia fila. El resto se juega en el navegador con un código de seis caracteres, sin cuentas de alumno.',
    labels: { time: 'Tiempo', group: 'Agrupación', drills: 'Practica', setup: 'Preparación', rules: 'Cómo se juega', onLexiClash: 'En LexiClash' },
    games: [
      {
        name: 'Clasifica en la cesta temática',
        setup: 'Mezcla veinte tarjetas de dos temas, comida y viaje, en un solo montón.',
        rules: 'Los equipos clasifican el montón en dos cestas a contrarreloj. Una tarjeta en la cesta equivocada vuelve. El primer equipo en terminar lee las cinco que casi se fueron a la otra cesta.',
        time: '8 min', groupSize: 'Equipos de 3–4', drills: 'Categorizar por tema',
        runsWith: 'matching',
        runsWithNote: 'El modo de práctica Emparejar puede juntar cada palabra con su tema a partir de tu lista cuando quieres la misma clasificación sin recortar fichas.',
      },
      {
        name: 'Cuadrícula de cocina',
        setup: 'Carga una cuadrícula de letras y escribe el tema de la cocina en la pizarra antes de empezar.',
        rules: 'La clase busca palabras de comida y cocina en la cuadrícula compartida. Las más largas valen más. A los dos minutos agrupa los hallazgos en utensilios, comida y acciones.',
        time: '5–8 min', groupSize: 'Toda la clase', drills: 'Recuperar vocabulario de cocina',
        runsWith: 'classic',
        runsWithNote: 'Modo clásico, con la lista de cocina pegada en la lección: los hallazgos fuera de tema siguen puntuando, pero la charla se queda en el tema.',
      },
      {
        name: 'Categorías de animales',
        setup: 'Escribe doce palabras de animales en una nube en la pizarra, todavía sin grupos.',
        rules: 'Las parejas tienen dos minutos para agruparlas en granja, salvaje y mascota. Luego oye el agrupamiento de una pareja y deja que el aula discuta cualquier animal que quepa en dos grupos.',
        time: '8–10 min', groupSize: 'Parejas, luego toda la clase', drills: 'Categorías semánticas',
        runsWith: NO_DEVICE,
        runsWithNote: 'Sin dispositivo. Doce palabras de animales y tres encabezados que escribes cuando las parejas terminan.',
      },
      {
        name: 'Carrera de la bolsa de viaje',
        setup: 'Abre una lista de palabras de viaje y un temporizador de dos minutos.',
        rules: 'Los estudiantes teclean tantas palabras de maleta como recuerden de la lista. Parada en seco. Tres leen su última palabra, y esas tres se convierten en la maleta que empacáis en la pizarra.',
        time: '3–5 min', groupSize: 'Individual', drills: 'Recuerdo rápido por tema',
        runsWith: 'blitz',
        runsWithNote: 'El modo de práctica Blitz es la ronda cronometrada; la lista es el tema de viaje que hayas puesto para la semana.',
      },
      {
        name: 'Caza del día escolar',
        setup: 'Elige una palabra del día escolar antes de la ronda: locker, recess, timetable, assembly.',
        rules: 'La clase busca esa palabra en una cuadrícula compartida. Otras palabras de colegio siguen puntuando, pero la ronda va de la que nombraste, que luego metes en una frase sobre una hora real de hoy.',
        time: '5–8 min', groupSize: 'Toda la clase', drills: 'Vocabulario escolar in situ',
        runsWith: 'word-hunt',
        runsWithNote: 'Modo Word Hunt, elegido en la pantalla del anfitrión, para que la palabra del día escolar siga siendo el centro de la ronda.',
      },
      {
        name: 'Cambio de tema',
        setup: 'Dos encabezados temáticos en la pizarra y un montón de doce tarjetas boca abajo.',
        rules: 'Un estudiante saca una tarjeta y la lleva al encabezado que le corresponde, diciendo por qué en una frase. Si el aula no está de acuerdo, la tarjeta se queda entre los dos encabezados hasta que alguien argumente.',
        time: '10 min', groupSize: 'Toda la clase', drills: 'Justificar una categoría',
        runsWith: NO_DEVICE,
        runsWithNote: 'Sin dispositivo. Dos encabezados, doce tarjetas y una regla: la tarjeta en disputa se queda en el hueco.',
      },
    ],
  },

  sv: {
    heading: 'Sex lekar för engelsk temavokabulär',
    intro:
      'Sex lekar som sätter en temalista i arbete: kök, djur, packning, skoldagen. De som inte behöver någon enhet säger det på sin egen rad. Resten körs i webbläsaren med en sexteckenskod, utan elevkonton.',
    labels: { time: 'Tid', group: 'Gruppering', drills: 'Tränar', setup: 'Förberedelse', rules: 'Så spelas den', onLexiClash: 'På LexiClash' },
    games: [
      {
        name: 'Temakorgssortering',
        setup: 'Blanda tjugo ordkort från två teman, mat och resor, i en hög.',
        rules: 'Lagen sorterar högen i två korgar mot klockan. Ett kort i fel korg går tillbaka. Första laget klart läser de fem som nästan hamnade i den andra korgen.',
        time: '8 min', groupSize: 'Lag om 3–4', drills: 'Temakategorisering',
        runsWith: 'matching',
        runsWithNote: 'Övningsläget Matchning kan para varje ord med sitt tema från din lista när du vill ha samma sortering utan att klippa kort.',
      },
      {
        name: 'Köksnätet',
        setup: 'Ladda ett bokstavsrutnät och skriv kökstemat på tavlan innan ni börjar.',
        rules: 'Klassen hittar mat- och köksord på det delade rutnätet. Längre ord är mer värda. Efter två minuter gruppera fynden under redskap, mat och handlingar.',
        time: '5–8 min', groupSize: 'Hela klassen', drills: 'Köksvokabulär ur minnet',
        runsWith: 'classic',
        runsWithNote: 'Klassiskt läge, med kökslistan inklistrad i lektionen så att fynd utanför temat fortfarande ger poäng men samtalet stannar i temat.',
      },
      {
        name: 'Djurskategorier',
        setup: 'Skriv tolv djurord i ett moln på tavlan, inga grupper än.',
        rules: 'Paren har två minuter på sig att gruppera dem under lantgård, vilt och husdjur. Hör sedan ett pars gruppering och låt rummet ifrågasätta ett djur som sitter i två grupper.',
        time: '8–10 min', groupSize: 'Par, sedan hela klassen', drills: 'Semantiska kategorier',
        runsWith: NO_DEVICE,
        runsWithNote: 'Ingen enhet behövs. Tolv djurord och tre rubriker du skriver när paren blir klara.',
      },
      {
        name: 'Packpåselopp',
        setup: 'Öppna en resords-lista och en tvåminuterstimer.',
        rules: 'Eleverna skriver så många packord de minns från listan. Tvärstopp. Tre läser sitt sista ord, och de tre blir resväskan ni packar på tavlan.',
        time: '3–5 min', groupSize: 'Enskilt', drills: 'Snabb temåterkallelse',
        runsWith: 'blitz',
        runsWithNote: 'Övningsläget Blitz är den tidtagna omgången; listan är resetemat du satt för veckan.',
      },
      {
        name: 'Skoldagsjakt',
        setup: 'Välj ett skoldagsord innan rundan: locker, recess, timetable, assembly.',
        rules: 'Klassen jagar det ordet på ett delat rutnät. Andra skolord ger fortfarande poäng, men rundan handlar om det du namngav, som du sedan sätter i en mening om en riktig lektion i dag.',
        time: '5–8 min', groupSize: 'Hela klassen', drills: 'Skolvokabulär på plats',
        runsWith: 'word-hunt',
        runsWithNote: 'Läget Word Hunt, valt på värdskärmen, så att skoldagsordet förblir rundans poäng.',
      },
      {
        name: 'Temabyte',
        setup: 'Två temarubriker på tavlan och en hög med tolv ordkort med baksidan upp.',
        rules: 'En elev drar ett kort och går med det till rubriken det hör under, och säger varför i en mening. Håller rummet inte med sitter kortet mellan rubrikerna tills någon argumenterar.',
        time: '10 min', groupSize: 'Hela klassen', drills: 'Motivera en kategori',
        runsWith: NO_DEVICE,
        runsWithNote: 'Ingen enhet behövs. Två rubriker, tolv kort och en regel att ett omstritt kort stannar i springan.',
      },
    ],
  },

  ja: {
    heading: 'テーマ別英単語ゲーム6選',
    intro:
      'テーマリストを動かす6ゲームです。台所、動物、荷造り、学校の一日。端末が要らないものにはその旨を各行に書いてあります。ほかは6文字のコードでブラウザから参加でき、生徒用アカウントは不要です。',
    labels: { time: '時間', group: '人数', drills: '鍛える力', setup: '準備', rules: '進め方', onLexiClash: 'LexiClashでは' },
    games: [
      {
        name: 'テーマかご分け',
        setup: '食べ物と旅行、2テーマの単語カード20枚を1山に混ぜます。',
        rules: 'チームは制限時間内に2つのかごへ分けます。違うかごに入ったカードは戻します。先に終わったチームが、もう一方のかごに入りかけた5枚を読みます。',
        time: '8分', groupSize: '3〜4人チーム', drills: 'テーマによる分類',
        runsWith: 'matching',
        runsWithNote: '練習モード「マッチング」がリストの語をテーマと組にできるので、同じ分類をカードなしでもできます。',
      },
      {
        name: '台所グリッド',
        setup: '文字ボードを出し、始める前に黒板へ台所テーマを書きます。',
        rules: 'クラスは共有ボードで食べ物と台所の語を探します。長い語ほど高得点。2分後、発見を道具・食べ物・動作に分けます。',
        time: '5〜8分', groupSize: 'クラス全体', drills: '台所語彙の想起',
        runsWith: 'classic',
        runsWithNote: 'クラシックモード。台所リストを授業に貼っておくと、テーマ外の発見も得点になりますが、話はテーマに残ります。',
      },
      {
        name: '動物のカテゴリー',
        setup: '動物の語を12、まだグループなしの雲として黒板に書きます。',
        rules: 'ペアは2分で牧場・野生・ペットに分けます。1組の分け方を聞き、2グループにまたがる動物に教室が異議を出せるようにします。',
        time: '8〜10分', groupSize: 'ペアのあとクラス全体', drills: '意味のカテゴリー',
        runsWith: NO_DEVICE,
        runsWithNote: '端末は不要です。動物の語12と、ペアが終わったときに書く見出し3つです。',
      },
      {
        name: '荷造りバッグ競争',
        setup: '旅行の単語リストと2分タイマーを開きます。',
        rules: '生徒はリストの記憶から荷造り語をできるだけ打ちます。そこで止めます。3人が最後の語を読み、その3語が黒板で詰めるスーツケースになります。',
        time: '3〜5分', groupSize: '個人', drills: 'テーマの高速想起',
        runsWith: 'blitz',
        runsWithNote: '練習モード「ブリッツ」が時間制限の回です。リストは、その週に設定した旅行テーマです。',
      },
      {
        name: '学校の一日ハント',
        setup: 'ラウンド前に学校の一日の語を1つ選びます（locker, recess, timetable, assembly）。',
        rules: 'クラスは共有ボードでその語を探します。ほかの学校語も得点になりますが、主役は指名した1語。今日の実際の時限の文に入れます。',
        time: '5〜8分', groupSize: 'クラス全体', drills: '現場の学校語彙',
        runsWith: 'word-hunt',
        runsWithNote: 'ホスト画面で Word Hunt を選ぶと、学校の一日の語がラウンドの中心のままになります。',
      },
      {
        name: 'テーマ入れ替え',
        setup: '黒板にテーマ見出しを2つ、裏向きの単語カードを12枚の山にします。',
        rules: '生徒が1枚引き、属する見出しへ持っていき、1文で理由を言います。教室が反対なら、誰かが主張するまでカードは見出しの間に置きます。',
        time: '10分', groupSize: 'クラス全体', drills: 'カテゴリーの正当化',
        runsWith: NO_DEVICE,
        runsWithNote: '端末は不要です。見出し2つとカード12枚、争点のカードは隙間に残す、というルールです。',
      },
    ],
  },

  ru: {
    heading: 'Шесть игр для английской лексики по темам',
    intro:
      'Шесть игр, которые ставят тематический список в работу: кухня, животные, сборы, школьный день. Те, что не требуют устройства, говорят об этом в своей строке. Остальные идут в браузере по коду из шести знаков, без ученических аккаунтов.',
    labels: { time: 'Время', group: 'Состав', drills: 'Тренирует', setup: 'Подготовка', rules: 'Как играть', onLexiClash: 'В LexiClash' },
    games: [
      {
        name: 'Сортировка по тематическим корзинам',
        setup: 'Смешайте двадцать карточек из двух тем — еда и путешествия — в одну колоду.',
        rules: 'Команды раскладывают колоду по двум корзинам на время. Карточка не в той корзине возвращается. Первая закончившая команда читает пять, что почти ушли в другую корзину.',
        time: '8 мин', groupSize: 'Команды по 3–4', drills: 'Категоризация по теме',
        runsWith: 'matching',
        runsWithNote: 'Режим практики «Сопоставление» может склеить каждое слово с его темой из вашего списка, когда нужна та же сортировка без резки карточек.',
      },
      {
        name: 'Кухонная сетка',
        setup: 'Загрузите буквенную сетку и напишите тему кухни на доске до старта.',
        rules: 'Класс ищет слова еды и кухни на общей сетке. Длинные слова дороже. Через две минуты разложите находки по посуде, еде и действиям.',
        time: '5–8 мин', groupSize: 'Весь класс', drills: 'Извлечение кухонной лексики',
        runsWith: 'classic',
        runsWithNote: 'Классический режим: кухонный список вклеен в урок, так что находки вне темы всё равно считаются, а разговор остаётся в теме.',
      },
      {
        name: 'Категории животных',
        setup: 'Напишите двенадцать названий животных облаком на доске, групп пока нет.',
        rules: 'У пар две минуты, чтобы разложить их на ферму, диких и домашних. Затем услышьте группировку одной пары и дайте комнате оспорить животное, которое сидит в двух группах.',
        time: '8–10 мин', groupSize: 'Пары, затем весь класс', drills: 'Семантические категории',
        runsWith: NO_DEVICE,
        runsWithNote: 'Устройство не нужно. Двенадцать названий животных и три заголовка, которые вы пишете, когда пары закончили.',
      },
      {
        name: 'Гонка дорожной сумки',
        setup: 'Откройте список слов путешествия и двухминутный таймер.',
        rules: 'Ученики набирают столько слов сборов, сколько помнят из списка. Резкая остановка. Трое читают своё последнее слово, и эти три становятся чемоданом, который вы собираете на доске.',
        time: '3–5 мин', groupSize: 'По одному', drills: 'Быстрое припоминание по теме',
        runsWith: 'blitz',
        runsWithNote: 'Режим практики «Блиц» — это забег на время; список — тема путешествия, которую вы задали на неделю.',
      },
      {
        name: 'Охота школьного дня',
        setup: 'Выберите одно слово школьного дня до раунда: locker, recess, timetable, assembly.',
        rules: 'Класс ищет это слово на общей сетке. Другие школьные слова тоже считаются, но раунд — про названное вами, которое вы потом вставляете в предложение про настоящий урок сегодня.',
        time: '5–8 мин', groupSize: 'Весь класс', drills: 'Школьная лексика на месте',
        runsWith: 'word-hunt',
        runsWithNote: 'Режим Word Hunt на экране ведущего, чтобы слово школьного дня осталось смыслом раунда.',
      },
      {
        name: 'Смена темы',
        setup: 'Два тематических заголовка на доске и колода из двенадцати карточек рубашкой вверх.',
        rules: 'Ученик тянет карточку и несёт её к заголовку, под который она относится, объясняя почему одним предложением. Если комната не согласна, карточка сидит между заголовками, пока кто-то не аргументирует.',
        time: '10 мин', groupSize: 'Весь класс', drills: 'Обоснование категории',
        runsWith: NO_DEVICE,
        runsWithNote: 'Устройство не нужно. Два заголовка, двенадцать карточек и правило: спорная карточка остаётся в промежутке.',
      },
    ],
  },
};

export function getVocabTopicsClassGames(locale: string): ClassGameSection {
  const normalized = locale.toLowerCase().split('-')[0] as EducationLocale;
  return SECTIONS[normalized] ?? SECTIONS.en;
}
