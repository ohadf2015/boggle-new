import { NO_DEVICE, type ClassGameSection } from '@/components/education/ClassGameList';
import type { EducationLocale } from '../_englishLearner/types';

const SECTIONS: Record<EducationLocale, ClassGameSection> = {
  en: {
    heading: '6 English games for a teen ESL room',
    intro:
      'Six short games for teen English learners, from a silent picture warm-up to a shared letter board. The ones that need no device say so on their own row. The rest run in the browser, judged against English, not a translated list.',
    labels: { time: 'Time', group: 'Group', drills: 'Drills', setup: 'Setup', rules: 'How to play', onLexiClash: 'On LexiClash' },
    games: [
      { name: 'Prefix Swap Race', setup: 'Six picture cards face down.', rules: 'A child draws a card, names it in English, then the class spells it together letter by letter. Wrong letters stay on the board until the next turn fixes them.', time: '8 min', groupSize: 'Whole class', drills: 'Oral vocab + spelling', runsWith: NO_DEVICE, runsWithNote: 'No device needed. The picture is the prompt; the spelling is the drill.' },
      { name: 'Debate the Gloss', setup: 'Write six CVC words on the board, vowels missing.', rules: 'Say the word. Children point at the missing vowel, then write it. Reverse it: a child says a word and the class points.', time: '6 min', groupSize: 'Whole class', drills: 'Short-vowel hearing', runsWith: NO_DEVICE, runsWithNote: 'No device needed — your voice and their ears are the whole game.' },
      { name: 'Root Grid Sprint', setup: 'Open a 5x5 board with the week’s short words in mind.', rules: 'Everyone hunts real English words on one shared grid. Credit any real word the dictionary knows, then read the week’s list out at the end.', time: '5 min', groupSize: 'Whole class', drills: 'Letter-grid recognition', runsWith: 'classic', runsWithNote: 'Classic mode on a 5x5 board, language set to English in the create-room dialog.' },
      { name: 'Peer Coach Pair', setup: 'Stand in a circle. One picture or object in the middle.', rules: 'Walk, freeze on your clap, whisper the English word to a neighbour. If they hear it, they sit. Last standing names three more.', time: '6 min', groupSize: 'Whole class', drills: 'Quiet pronunciation', runsWith: NO_DEVICE, runsWithNote: 'No device needed. Whispering keeps volume down in a corridor or a shared hall.' },
      { name: 'Homophone Trap', setup: 'Two teams, two markers, the week’s words on slips.', rules: 'Say a word. The first child writes the first letter and passes the marker. The team spells it one letter at a time.', time: '10 min', groupSize: 'Two teams', drills: 'Spelling under a clock', runsWith: 'spelling', runsWithNote: 'The Spelling practice mode drills the same list letter by letter afterwards.' },
      { name: 'Annotate the Board', setup: 'Pick one target word before the round.', rules: 'The class hunts that one word on a shared board. Other finds still score, but the round is about the word you chose.', time: '5 min', groupSize: 'Whole class', drills: 'Sustained attention', runsWith: 'word-hunt', runsWithNote: 'Word Hunt mode, chosen on the host screen before the round starts.' },
    ],
  },
  es: {
    heading: '6 juegos de inglés para secundaria',
    intro: 'Seis juegos cortos para adolescentes que aprenden inglés, de un calentamiento con dibujos a un tablero de letras compartido. Los que no necesitan dispositivo lo dicen en su fila. El resto corre en el navegador, juzgado en inglés, no con una lista traducida.',
    labels: { time: 'Tiempo', group: 'Agrupación', drills: 'Practica', setup: 'Preparación', rules: 'Cómo se juega', onLexiClash: 'En LexiClash' },
    games: [
      { name: 'Carrera de prefijos', setup: 'Seis tarjetas con dibujos boca abajo.', rules: 'Un niño saca una tarjeta, la nombra en inglés y la clase la deletrea letra a letra. Las letras fallidas quedan hasta el turno que las corrige.', time: '8 min', groupSize: 'Toda la clase', drills: 'Vocabulario oral + ortografía', runsWith: NO_DEVICE, runsWithNote: 'Sin dispositivo. El dibujo es la pista; el deletreo es el ejercicio.' },
      { name: 'Debate la glosa', setup: 'Escribe seis CVC en la pizarra, sin vocal.', rules: 'Di la palabra. Señalan la vocal que falta y la escriben. Al revés: un niño dice y la clase señala.', time: '6 min', groupSize: 'Toda la clase', drills: 'Audición de vocales cortas', runsWith: NO_DEVICE, runsWithNote: 'Sin dispositivo: tu voz y sus oídos son todo el juego.' },
      { name: 'Sprint de raíces', setup: 'Abre un tablero 5x5 pensando en las palabras cortas de la semana.', rules: 'Todos buscan palabras inglesas reales en un tablero compartido. Cuenta cualquier palabra real y al final leéis la lista de la semana.', time: '5 min', groupSize: 'Toda la clase', drills: 'Reconocimiento en el tablero', runsWith: 'classic', runsWithNote: 'Modo clásico en 5x5, idioma inglés en la ventana de crear sala.' },
      { name: 'Pareja de entrenadores', setup: 'Círculo. Un objeto o dibujo en el centro.', rules: 'Caminan, se congelan a tu palmada y susurran la palabra en inglés al vecino. Si la oye, se sienta.', time: '6 min', groupSize: 'Toda la clase', drills: 'Pronunciación baja', runsWith: NO_DEVICE, runsWithNote: 'Sin dispositivo. El susurro baja el volumen en un pasillo o un patio cubierto.' },
      { name: 'Trampa de homófonos', setup: 'Dos equipos, dos rotuladores, las palabras de la semana en papeles.', rules: 'Di una palabra. El primero escribe la primera letra y pasa el rotulador. El equipo deletrea letra a letra.', time: '10 min', groupSize: 'Dos equipos', drills: 'Ortografía con reloj', runsWith: 'spelling', runsWithNote: 'El modo Ortografía repasa después la misma lista letra a letra.' },
      { name: 'Anota el tablero', setup: 'Elige una sola palabra objetivo antes de la ronda.', rules: 'La clase busca esa palabra en un tablero compartido. Las demás cuentan, pero la ronda va de la que elegiste.', time: '5 min', groupSize: 'Toda la clase', drills: 'Atención sostenida', runsWith: 'word-hunt', runsWithNote: 'Modo Word Hunt, elegido en la pantalla del anfitrión antes de empezar.' },
    ],
  },
  he: {
    heading: '6 משחקי אנגלית לחטיבת ביניים',
    intro: 'שישה משחקים קצרים לבני נוער שלומדים אנגלית, מחימום שקט עם ציור ועד לוח אותיות משותף. אלה שלא דורשים מכשיר אומרים זאת בשורה שלהם. השאר רצים בדפדפן ונשפטים מול אנגלית, לא מול רשימה מתורגמת.',
    labels: { time: 'זמן', group: 'הרכב', drills: 'מתרגל', setup: 'הכנה', rules: 'איך משחקים', onLexiClash: 'ב-LexiClash' },
    games: [
      { name: 'ציור ואז איות', setup: 'שישה כרטיסי ציור הפוכים.', rules: 'ילד שולף כרטיס, אומר את המילה באנגלית, והכיתה מאייתת אות־אות. אות שגויה נשארת עד שהתור הבא מתקן.', time: '8 דק׳', groupSize: 'כל הכיתה', drills: 'אוצר מילים מדובר ואיות', runsWith: NO_DEVICE, runsWithNote: 'לא צריך מכשיר. הציור הוא הרמז; האיות הוא התרגול.' },
      { name: 'מעגלים את התנועה', setup: 'שש מילות CVC על הלוח בלי תנועה.', rules: 'אומרים את המילה. הילדים מצביעים על התנועה החסרה וכותבים אותה. אחר כך הפוך: ילד אומר והכיתה מצביעה.', time: '6 דק׳', groupSize: 'כל הכיתה', drills: 'שמיעת תנועות קצרות', runsWith: NO_DEVICE, runsWithNote: 'לא צריך מכשיר — הקול שלכם והאוזניים שלהם הם כל המשחק.' },
      { name: 'הליכה על לוח קטן', setup: 'פותחים לוח 5x5 עם מילות השבוע הקצרות בראש.', rules: 'כולם מחפשים מילים אנגליות אמיתיות על לוח משותף. מילה אמיתית מזכה, ובסוף קוראים את רשימת השבוע.', time: '5 דק׳', groupSize: 'כל הכיתה', drills: 'זיהוי על לוח אותיות', runsWith: 'classic', runsWithNote: 'מצב קלאסי על לוח 5x5, שפה אנגלית בחלון פתיחת החדר.' },
      { name: 'קיפאון ולחש', setup: 'מעגל. ציור או חפץ במרכז.', rules: 'הולכים, קופאים במחיאת כף, לוחשים את המילה באנגלית לשכן. אם הוא שמע, הוא יושב.', time: '6 דק׳', groupSize: 'כל הכיתה', drills: 'הגייה שקטה', runsWith: NO_DEVICE, runsWithNote: 'לא צריך מכשיר. הלחש שומר על ווליום נמוך במסדרון או באולם משותף.' },
      { name: 'רכבת אותיות', setup: 'שתי קבוצות, שני טושים, מילות השבוע על פתקים.', rules: 'אומרים מילה. הראשון כותב אות אחת ומעביר את הטוש. הקבוצה מאייתת אות־אות.', time: '10 דק׳', groupSize: 'שתי קבוצות', drills: 'איות מול שעון', runsWith: 'spelling', runsWithNote: 'מצב האיות מתרגל אחר כך את אותה רשימה אות־אות.' },
      { name: 'מצעד שקט על הלוח', setup: 'בוחרים מילת יעד אחת לפני הסיבוב.', rules: 'הכיתה מחפשת את המילה על לוח משותף. מציאות אחרות עדיין מזכות, אבל הסיבוב הוא על זו שבחרתם.', time: '5 דק׳', groupSize: 'כל הכיתה', drills: 'קשב מתמשך', runsWith: 'word-hunt', runsWithNote: 'מצב Word Hunt, שנבחר במסך המארח לפני תחילת הסיבוב.' },
    ],
  },
  sv: {
    heading: '6 engelsklekar för högstadiet',
    intro: 'Sex korta lekar för tonåriga engelskinlärare, från en tyst bilduppvärmning till en delad bokstavsplan. De som inte kräver någon enhet säger det på sin rad. Resten körs i webbläsaren och bedöms mot engelska, inte en översatt lista.',
    labels: { time: 'Tid', group: 'Gruppering', drills: 'Tränar', setup: 'Förberedelse', rules: 'Så spelas den', onLexiClash: 'På LexiClash' },
    games: [
      { name: 'Bild sen stava', setup: 'Sex bildkort med framsidan ner.', rules: 'Ett barn drar ett kort, namnger det på engelska, sen stavar klassen bokstav för bokstav. Fel bokstäver ligger kvar tills nästa tur rättar.', time: '8 min', groupSize: 'Hela klassen', drills: 'Muntligt ordförråd + stavning', runsWith: NO_DEVICE, runsWithNote: 'Ingen enhet behövs. Bilden är prompten; stavningen är övningen.' },
      { name: 'Cirkla vokalen', setup: 'Skriv sex CVC-ord på tavlan, vokaler saknas.', rules: 'Säg ordet. Barnen pekar på den saknade vokalen och skriver den. Vänd: ett barn säger, klassen pekar.', time: '6 min', groupSize: 'Hela klassen', drills: 'Korta vokaler med örat', runsWith: NO_DEVICE, runsWithNote: 'Ingen enhet behövs — din röst och deras öron är hela leken.' },
      { name: 'Liten planvandring', setup: 'Öppna en 5x5-plan med veckans korta ord i huvudet.', rules: 'Alla jagar riktiga engelska ord på en delad plan. Riktiga ord ger poäng, sen läser ni veckans lista högt.', time: '5 min', groupSize: 'Hela klassen', drills: 'Igenkänning på bokstavsplan', runsWith: 'classic', runsWithNote: 'Klassiskt läge på 5x5, språket engelska i dialogrutan för att skapa rum.' },
      { name: 'Frys och viska', setup: 'Stå i ring. En bild eller sak i mitten.', rules: 'Gå, frys på din klapp, viska det engelska ordet till grannen. Hör hen det sätter hen sig.', time: '6 min', groupSize: 'Hela klassen', drills: 'Tyst uttal', runsWith: NO_DEVICE, runsWithNote: 'Ingen enhet behövs. Viskningen håller volymen nere i en korridor.' },
      { name: 'Bokstavståg', setup: 'Två lag, två pennor, veckans ord på lappar.', rules: 'Säg ett ord. Första barnet skriver första bokstaven och lämnar pennan. Laget stavar en bokstav i taget.', time: '10 min', groupSize: 'Två lag', drills: 'Stavning mot klockan', runsWith: 'spelling', runsWithNote: 'Övningsläget Stavning går igenom samma lista bokstav för bokstav efteråt.' },
      { name: 'Tyst planparad', setup: 'Välj ett enda målord före rundan.', rules: 'Klassen jagar det ordet på en delad plan. Andra fynd ger fortfarande poäng, men rundan handlar om det du valde.', time: '5 min', groupSize: 'Hela klassen', drills: 'Uthållig uppmärksamhet', runsWith: 'word-hunt', runsWithNote: 'Läget Word Hunt, valt på värdskärmen innan rundan startar.' },
    ],
  },
  ja: {
    heading: '中学生の英語クラス向け6ゲーム',
    intro: '絵を使った静かなウォームアップから共有の文字盤まで、英語を学ぶ中学生向けの短いゲーム6つ。端末が要らないものは各行に明記します。ほかはブラウザで、翻訳リストではなく英語の辞書で判定されます。',
    labels: { time: '時間', group: '人数', drills: '鍛える力', setup: '準備', rules: '進め方', onLexiClash: 'LexiClashでは' },
    games: [
      { name: '絵を見て綴る', setup: '絵カード6枚を裏向きに。', rules: '子どもが1枚引き、英語で名前を言い、クラスが1文字ずつ綴ります。間違えた文字は次の番が直すまで残します。', time: '8分', groupSize: 'クラス全体', drills: '口頭語彙と綴り', runsWith: NO_DEVICE, runsWithNote: '端末は不要。絵がきっかけで、綴りがドリルです。' },
      { name: '母音を囲む', setup: '黒板にCVCを6語、母音なしで書く。', rules: '語を言います。子どもは欠けた母音を指して書きます。逆に、子どもが言ってクラスが指します。', time: '6分', groupSize: 'クラス全体', drills: '短い母音の聞き取り', runsWith: NO_DEVICE, runsWithNote: '端末は不要。先生の声と子どもの耳がすべてです。' },
      { name: '小さな盤の散歩', setup: '今週の短い語を念頭に5x5を開く。', rules: '全員が共有盤で実在する英語を探します。辞書が知る語は得点。最後に今週のリストを音読します。', time: '5分', groupSize: 'クラス全体', drills: '文字盤での認識', runsWith: 'classic', runsWithNote: '5x5のクラシック。ルーム作成画面で言語を英語に。' },
      { name: '止まってささやく', setup: '円になって立つ。中央に絵か物。', rules: '歩き、拍手で止まり、隣に英語をささやきます。聞こえた子は座ります。', time: '6分', groupSize: 'クラス全体', drills: '小さな声の発音', runsWith: NO_DEVICE, runsWithNote: '端末は不要。ささやきなら廊下でも音量が上がりません。' },
      { name: '文字列車', setup: '2チーム、マーカー2本、今週の語を紙片に。', rules: '語を言う。先頭が1文字書いてマーカーを渡す。チームは1文字ずつ綴る。', time: '10分', groupSize: '2チーム', drills: '時計に追われる綴り', runsWith: 'spelling', runsWithNote: '練習モード「スペリング」が、あとで同じリストを1文字ずつ復習します。' },
      { name: '静かな盤の行進', setup: 'ラウンド前に目標の語を1つ決める。', rules: 'クラスはその1語を共有盤で探します。ほかの語も得点になりますが、主役は選んだ1語です。', time: '5分', groupSize: 'クラス全体', drills: '持続的な注意', runsWith: 'word-hunt', runsWithNote: 'Word Huntモードを、開始前にホスト画面で選びます。' },
    ],
  },
  ru: {
    heading: '6 игр на английском для средней школы',
    intro: 'Шесть коротких игр для подростков, от тихой разминки с картинкой до общего буквенного поля. Те, что без устройства, говорят об этом в своей строке. Остальные идут в браузере и судятся по английскому, а не по переводному списку.',
    labels: { time: 'Время', group: 'Состав', drills: 'Тренирует', setup: 'Подготовка', rules: 'Как играть', onLexiClash: 'В LexiClash' },
    games: [
      { name: 'Картинка, потом орфография', setup: 'Шесть картинок рубашкой вверх.', rules: 'Ребёнок тянет карточку, называет по-английски, класс пишет по букве. Ошибка лежит, пока следующий ход не поправит.', time: '8 мин', groupSize: 'Весь класс', drills: 'Устная лексика и орфография', runsWith: NO_DEVICE, runsWithNote: 'Устройство не нужно. Картинка — подсказка, орфография — упражнение.' },
      { name: 'Обведи гласную', setup: 'Шесть CVC на доске без гласной.', rules: 'Скажите слово. Дети показывают пропущенную гласную и пишут её. Наоборот: ребёнок говорит, класс показывает.', time: '6 мин', groupSize: 'Весь класс', drills: 'Слух на краткие гласные', runsWith: NO_DEVICE, runsWithNote: 'Устройство не нужно — ваш голос и их слух и есть вся игра.' },
      { name: 'Прогулка по маленькому полю', setup: 'Откройте 5x5, держа в уме короткие слова недели.', rules: 'Все ищут настоящие английские слова на общем поле. Настоящее слово даёт очки, в конце читаете список недели.', time: '5 мин', groupSize: 'Весь класс', drills: 'Узнавание на буквенном поле', runsWith: 'classic', runsWithNote: 'Классический режим на 5x5, язык английский в окне создания комнаты.' },
      { name: 'Замри и шепни', setup: 'Круг. Картинка или предмет в центре.', rules: 'Идут, замирают на хлопок, шепчут английское слово соседу. Услышал — садится.', time: '6 мин', groupSize: 'Весь класс', drills: 'Тихое произношение', runsWith: NO_DEVICE, runsWithNote: 'Устройство не нужно. Шёпот держит громкость в коридоре.' },
      { name: 'Буквенный поезд', setup: 'Две команды, два маркера, слова недели на бумажках.', rules: 'Скажите слово. Первый пишет первую букву и передаёт маркер. Команда пишет по букве.', time: '10 мин', groupSize: 'Две команды', drills: 'Орфография под часы', runsWith: 'spelling', runsWithNote: 'Режим «Орфография» потом проходит тот же список по буквам.' },
      { name: 'Тихий парад поля', setup: 'Выберите одно целевое слово до раунда.', rules: 'Класс ищет это слово на общем поле. Другие находки тоже дают очки, но раунд про выбранное вами.', time: '5 мин', groupSize: 'Весь класс', drills: 'Долгое внимание', runsWith: 'word-hunt', runsWithNote: 'Режим Word Hunt, его выбирают на экране ведущего до старта.' },
    ],
  },
};

export function getMiddleSchoolEnglishClassGames(locale: string): ClassGameSection {
  const normalized = locale.toLowerCase().split('-')[0] as EducationLocale;
  return SECTIONS[normalized] ?? SECTIONS.en;
}
