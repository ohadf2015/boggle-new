import { NO_DEVICE, type ClassGameSection } from '@/components/education/ClassGameList';
import type { EducationLocale } from '../_englishLearner/types';

/**
 * Six classroom games for irregular verbs. Names stay disjoint from the ESL
 * list, the vocabulary classroom list, and the other learner landings.
 */

const SECTIONS: Record<EducationLocale, ClassGameSection> = {
  en: {
    heading: 'Six classroom games for irregular verbs',
    intro:
      'Six games for the verbs that refuse a tidy -ed: three forms, past-tense spotting, and a story that has to swallow them in order. The ones that need no device say so on their own row. The rest run in the browser from a six-character code, with no student accounts.',
    labels: { time: 'Time', group: 'Group', drills: 'Drills', setup: 'Setup', rules: 'How to play', onLexiClash: 'On LexiClash' },
    games: [
      {
        name: 'Three-Form Snap',
        setup: 'Cards in threes: go / went / gone, each form on its own card, shuffled into one pile.',
        rules: 'Players take turns flipping a card. When someone sees all three forms of the same verb on the table, they slap the pile and say the three forms in order. A false slap skips a turn.',
        time: '10 min', groupSize: 'Groups of 3–4', drills: 'Principal parts',
        runsWith: NO_DEVICE,
        runsWithNote: 'No device needed. A shuffled pile of three-form cards and a table is the whole kit.',
      },
      {
        name: 'Past-Tense Grid',
        setup: 'Load a letter grid and tell the class only past-tense forms score this round.',
        rules: 'Students find past-tense verbs on the shared grid. Present forms are called out but do not score. After two minutes, write three finds on the board and name the present form beside each.',
        time: '5–8 min', groupSize: 'Whole class', drills: 'Past-tense recognition',
        runsWith: 'classic',
        runsWithNote: 'Classic mode, with the past-tense-only rule said before the join code goes up so nobody farms present forms.',
      },
      {
        name: 'Irregular Climb',
        setup: 'Split this week’s irregulars into three tiers: common, less common, rare.',
        rules: 'Every student works the same three-form drill on their own tier. Move someone up when they finish early; move them down without comment when they stall.',
        time: '8–10 min', groupSize: 'Solo, same room', drills: 'The right set of irregulars',
        runsWith: 'warmup',
        runsWithNote: 'The Warm-Up practice mode runs the list at the tier set for each student, so one drill covers the spread.',
      },
      {
        name: 'Story in Past',
        setup: 'Write eight irregular past forms in a column on the board.',
        rules: 'Going around the room, each student adds one sentence to a shared story and must use the next past form from the column. If they use the present by accident, the next student repairs it and continues.',
        time: '10 min', groupSize: 'Whole class', drills: 'Past forms in connected speech',
        runsWith: NO_DEVICE,
        runsWithNote: 'No device needed. Eight past forms on the board and a story that has to swallow them in order.',
      },
      {
        name: 'Tense Dice',
        setup: 'A cube with present, past, and past participle on three faces, and this week’s eight irregulars on the board.',
        rules: 'A student rolls, lands on a form, and has to say that form of the next verb. The class confirms or repairs, then the cube passes. Ten rolls and you stop.',
        time: '8 min', groupSize: 'Whole class', drills: 'Form selection under chance',
        runsWith: 'matching',
        runsWithNote: 'The Matching practice mode pairs each present with its past from your list, which is the cube’s job when you have no cube in the cupboard.',
      },
      {
        name: 'Error Auction',
        setup: 'Write six sentences on the board, each with one irregular-verb error.',
        rules: 'Teams bid on a sentence they think they can repair. Highest bid tries. A clean repair wins the points; a miss gives the sentence to the next team for half.',
        time: '10 min', groupSize: 'Teams of 3–4', drills: 'Error correction',
        runsWith: 'spelling',
        runsWithNote: 'The Spelling practice mode drills the same irregular forms letter by letter afterwards, for the errors the auction left standing.',
      },
    ],
  },

  he: {
    heading: 'שישה משחקי כיתה לפעלים חריגים',
    intro:
      'שישה משחקים לפעלים שמסרבים ל-ed מסודר: שלוש צורות, איתור עבר, וסיפור שחייב לבלוע אותן לפי הסדר. אלה שלא דורשים מכשיר אומרים זאת בשורה שלהם. השאר רצים בדפדפן עם קוד בן שש תווים, בלי חשבונות לתלמידים.',
    labels: { time: 'זמן', group: 'הרכב', drills: 'מתרגל', setup: 'הכנה', rules: 'איך משחקים', onLexiClash: 'ב-LexiClash' },
    games: [
      {
        name: 'תפוס שלוש צורות',
        setup: 'קלפים בשלשות: go / went / gone, כל צורה בכרטיס משלה, מעורבבים לערימה אחת.',
        rules: 'השחקנים הופכים כרטיס בתורם. כשמישהו רואה על השולחן את שלוש הצורות של אותו פועל, הוא מכה בערימה ואומר את שלוש הצורות לפי הסדר. מכה שווא מפספסת תור.',
        time: '10 דק׳', groupSize: 'קבוצות של 3–4', drills: 'צורות יסוד',
        runsWith: NO_DEVICE,
        runsWithNote: 'לא צריך מכשיר. ערימת כרטיסי שלוש-צורות מעורבבת ושולחן — זה כל הציוד.',
      },
      {
        name: 'רשת בזמן עבר',
        setup: 'טענו רשת אותיות ואמרו לכיתה שרק צורות עבר מזכות בסיבוב הזה.',
        rules: 'התלמידים מוצאים פעלים בזמן עבר על הרשת המשותפת. צורות הווה נאמרות אבל לא מזכות. אחרי שתי דקות כתבו שלוש מציאות על הלוח וציינו ליד כל אחת את ההווה.',
        time: '5–8 דק׳', groupSize: 'כל הכיתה', drills: 'זיהוי זמן עבר',
        runsWith: 'classic',
        runsWithNote: 'מצב קלאסי, עם כלל "רק עבר" שנאמר לפני שקוד ההצטרפות עולה, כדי שאף אחד לא יצבור צורות הווה.',
      },
      {
        name: 'טיפוס על החריגים',
        setup: 'חלקו את החריגים של השבוע לשלוש רמות: שכיחים, פחות שכיחים, נדירים.',
        rules: 'כל תלמיד עושה את אותו תרגיל שלוש-צורות ברמה שלו. העלו מי שסיים מוקדם; הורידו בלי הערה מי שנתקע.',
        time: '8–10 דק׳', groupSize: 'לבד, באותו חדר', drills: 'סט החריגים הנכון',
        runsWith: 'warmup',
        runsWithNote: 'מצב התרגול "חימום" מריץ את הרשימה ברמה שנקבעה לכל תלמיד, כך שתרגיל אחד מכסה את הטווח.',
      },
      {
        name: 'סיפור בעבר',
        setup: 'כתבו בעמודה על הלוח שמונה צורות עבר חריגות.',
        rules: 'מסביב לחדר, כל תלמיד מוסיף משפט אחד לסיפור משותף וחייב להשתמש בצורת העבר הבאה מהעמודה. אם יצא הווה בטעות, הבא מתקן וממשיך.',
        time: '10 דק׳', groupSize: 'כל הכיתה', drills: 'צורות עבר בדיבור רציף',
        runsWith: NO_DEVICE,
        runsWithNote: 'לא צריך מכשיר. שמונה צורות עבר על הלוח וסיפור שחייב לבלוע אותן לפי הסדר.',
      },
      {
        name: 'קוביית הזמנים',
        setup: 'קובייה עם הווה, עבר ובינוני על שלושה צדדים, ושמונת החריגים של השבוע על הלוח.',
        rules: 'תלמיד מגלגל, נוחת על צורה, וצריך לומר את הצורה הזו של הפועל הבא. הכיתה מאשרת או מתקנת, והקובייה עוברת. עשר גלגולות ועוצרים.',
        time: '8 דק׳', groupSize: 'כל הכיתה', drills: 'בחירת צורה במקרה',
        runsWith: 'matching',
        runsWithNote: 'מצב התרגול "התאמה" מצמיד כל הווה לעבר מהרשימה שלכם — זו עבודת הקובייה כשאין קובייה בארון.',
      },
      {
        name: 'מכירה פומבית של שגיאות',
        setup: 'כתבו על הלוח שישה משפטים, בכל אחד שגיאת פועל חריג אחת.',
        rules: 'הקבוצות מתמחרות משפט שהן חושבות שהן יכולות לתקן. ההצעה הגבוהה מנסה. תיקון נקי זוכה בנקודות; החטאה מעבירה את המשפט לקבוצה הבאה בחצי.',
        time: '10 דק׳', groupSize: 'קבוצות של 3–4', drills: 'תיקון שגיאות',
        runsWith: 'spelling',
        runsWithNote: 'מצב התרגול "איות" מתרגל אחר כך את אותן צורות חריגות אות אחר אות, לשגיאות שהמכירה השאירה על הלוח.',
      },
    ],
  },

  es: {
    heading: 'Seis juegos de aula para verbos irregulares',
    intro:
      'Seis juegos para los verbos que se niegan a un -ed ordenado: tres formas, cazar el pasado y un relato que tiene que tragárselas en orden. Los que no necesitan dispositivo lo dicen en su propia fila. El resto se juega en el navegador con un código de seis caracteres, sin cuentas de alumno.',
    labels: { time: 'Tiempo', group: 'Agrupación', drills: 'Practica', setup: 'Preparación', rules: 'Cómo se juega', onLexiClash: 'En LexiClash' },
    games: [
      {
        name: 'Chasquido de tres formas',
        setup: 'Cartas de tres en tres: go / went / gone, cada forma en su carta, barajadas en un montón.',
        rules: 'Por turnos se gira una carta. Cuando alguien ve las tres formas del mismo verbo sobre la mesa, golpea el montón y las dice en orden. Un golpe en falso pierde el turno.',
        time: '10 min', groupSize: 'Grupos de 3–4', drills: 'Formas principales',
        runsWith: NO_DEVICE,
        runsWithNote: 'Sin dispositivo. Un montón barajado de cartas de tres formas y una mesa es todo el kit.',
      },
      {
        name: 'Cuadrícula en pasado',
        setup: 'Carga una cuadrícula de letras y di que en esta ronda solo puntúan las formas de pasado.',
        rules: 'Los estudiantes buscan verbos en pasado en la cuadrícula compartida. Las formas de presente se dicen pero no puntúan. A los dos minutos escribe tres hallazgos y nombra el presente al lado.',
        time: '5–8 min', groupSize: 'Toda la clase', drills: 'Reconocer el pasado',
        runsWith: 'classic',
        runsWithNote: 'Modo clásico, con la regla de solo-pasado dicha antes de subir el código, para que nadie farmee presentes.',
      },
      {
        name: 'Ascenso irregular',
        setup: 'Parte los irregulares de la semana en tres niveles: comunes, menos comunes, raros.',
        rules: 'Cada estudiante hace el mismo ejercicio de tres formas en su nivel. Sube a quien termina pronto; baja sin comentario a quien se atasca.',
        time: '8–10 min', groupSize: 'Individual, misma aula', drills: 'El set justo de irregulares',
        runsWith: 'warmup',
        runsWithNote: 'El modo de práctica Calentamiento recorre la lista al nivel fijado para cada estudiante, así un ejercicio cubre todo el abanico.',
      },
      {
        name: 'Relato en pasado',
        setup: 'Escribe ocho formas de pasado irregular en una columna en la pizarra.',
        rules: 'Alrededor del aula, cada estudiante añade una frase al relato compartido y debe usar la siguiente forma de pasado de la columna. Si se cuela un presente, el siguiente lo repara y sigue.',
        time: '10 min', groupSize: 'Toda la clase', drills: 'Pasados en habla seguida',
        runsWith: NO_DEVICE,
        runsWithNote: 'Sin dispositivo. Ocho pasados en la pizarra y un relato que tiene que tragárselos en orden.',
      },
      {
        name: 'Dado de tiempos',
        setup: 'Un cubo con presente, pasado y participio en tres caras, y los ocho irregulares de la semana en la pizarra.',
        rules: 'Un estudiante tira, cae en una forma y tiene que decir esa forma del siguiente verbo. La clase confirma o repara, y el cubo pasa. Diez tiradas y se para.',
        time: '8 min', groupSize: 'Toda la clase', drills: 'Elegir la forma al azar',
        runsWith: 'matching',
        runsWithNote: 'El modo de práctica Emparejar junta cada presente con su pasado a partir de tu lista, que es el trabajo del cubo cuando no hay cubo en el armario.',
      },
      {
        name: 'Subasta de errores',
        setup: 'Escribe seis frases en la pizarra, cada una con un error de verbo irregular.',
        rules: 'Los equipos pujan por una frase que creen poder reparar. La puja más alta lo intenta. Una reparación limpia gana los puntos; un fallo pasa la frase al siguiente equipo a mitad de precio.',
        time: '10 min', groupSize: 'Equipos de 3–4', drills: 'Corrección de errores',
        runsWith: 'spelling',
        runsWithNote: 'El modo de práctica Ortografía repasa después las mismas formas irregulares letra a letra, para los errores que la subasta dejó en pie.',
      },
    ],
  },

  sv: {
    heading: 'Sex klassrumslekar för oregelbundna verb',
    intro:
      'Sex lekar för verben som vägrar ett prydligt -ed: tre former, jakt på preteritum och en historia som måste svälja dem i ordning. De som inte behöver någon enhet säger det på sin egen rad. Resten körs i webbläsaren med en sexteckenskod, utan elevkonton.',
    labels: { time: 'Tid', group: 'Gruppering', drills: 'Tränar', setup: 'Förberedelse', rules: 'Så spelas den', onLexiClash: 'På LexiClash' },
    games: [
      {
        name: 'Treforms-snap',
        setup: 'Kort i tregrupper: go / went / gone, varje form på eget kort, blandade i en hög.',
        rules: 'Spelarna vänder ett kort i taget. När någon ser alla tre formerna av samma verb på bordet slår de högen och säger formerna i ordning. Ett felslag hoppar över en tur.',
        time: '10 min', groupSize: 'Grupper om 3–4', drills: 'Grundformer',
        runsWith: NO_DEVICE,
        runsWithNote: 'Ingen enhet behövs. En blandad hög treformskort och ett bord är hela kitet.',
      },
      {
        name: 'Preteritumnät',
        setup: 'Ladda ett bokstavsrutnät och säg att bara preteritumformer ger poäng den här rundan.',
        rules: 'Eleverna hittar preteritumverb på det delade rutnätet. Presensformer sägs men ger inget. Efter två minuter skriv tre fynd på tavlan och namnge presensformen bredvid.',
        time: '5–8 min', groupSize: 'Hela klassen', drills: 'Känna igen preteritum',
        runsWith: 'classic',
        runsWithNote: 'Klassiskt läge, med bara-preteritum-regeln sagd innan koden går upp så ingen odlar presensformer.',
      },
      {
        name: 'Oregelbunden klättring',
        setup: 'Dela veckans oregelbundna i tre nivåer: vanliga, mindre vanliga, sällsynta.',
        rules: 'Varje elev gör samma treformsövning på sin nivå. Flytta upp den som blir klar tidigt; flytta ner utan kommentar den som stannar av.',
        time: '8–10 min', groupSize: 'Enskilt, samma rum', drills: 'Rätt uppsättning oregelbundna',
        runsWith: 'warmup',
        runsWithNote: 'Övningsläget Uppvärmning kör listan på den nivå som satts för varje elev, så en övning täcker spridningen.',
      },
      {
        name: 'Berättelse i preteritum',
        setup: 'Skriv åtta oregelbundna preteritumformer i en kolumn på tavlan.',
        rules: 'Runt rummet lägger varje elev till en mening i en delad berättelse och måste använda nästa preteritumform från kolumnen. Smyger sig ett presens in lagar nästa elev och fortsätter.',
        time: '10 min', groupSize: 'Hela klassen', drills: 'Preteritum i sammanhängande tal',
        runsWith: NO_DEVICE,
        runsWithNote: 'Ingen enhet behövs. Åtta preteritumformer på tavlan och en historia som måste svälja dem i ordning.',
      },
      {
        name: 'Tempustärning',
        setup: 'En kub med presens, preteritum och perfekt particip på tre sidor, och veckans åtta oregelbundna på tavlan.',
        rules: 'En elev slår, landar på en form och måste säga den formen av nästa verb. Klassen bekräftar eller lagar, sedan går kuben vidare. Tio slag och ni stannar.',
        time: '8 min', groupSize: 'Hela klassen', drills: 'Formval under slump',
        runsWith: 'matching',
        runsWithNote: 'Övningsläget Matchning parar varje presens med sitt preteritum från din lista, vilket är kubens jobb när skåpet är tomt på kuber.',
      },
      {
        name: 'Felauktion',
        setup: 'Skriv sex meningar på tavlan, varje med ett oregelbundet-verb-fel.',
        rules: 'Lagen bjuder på en mening de tror de kan laga. Högsta budet försöker. En ren lagning vinner poängen; en miss ger meningen till nästa lag för halva.',
        time: '10 min', groupSize: 'Lag om 3–4', drills: 'Felrättning',
        runsWith: 'spelling',
        runsWithNote: 'Övningsläget Stavning går sedan igenom samma oregelbundna former bokstav för bokstav, för felen auktionen lämnade kvar.',
      },
    ],
  },

  ja: {
    heading: '不規則動詞の授業ゲーム6選',
    intro:
      'きれいな -ed を拒む動詞のための6ゲームです。3形、過去形探し、順番に飲み込む物語。端末が要らないものにはその旨を各行に書いてあります。ほかは6文字のコードでブラウザから参加でき、生徒用アカウントは不要です。',
    labels: { time: '時間', group: '人数', drills: '鍛える力', setup: '準備', rules: '進め方', onLexiClash: 'LexiClashでは' },
    games: [
      {
        name: '三形スナップ',
        setup: 'go / went / gone のように3枚1組。各形を別カードにし、1山に混ぜます。',
        rules: '順に1枚めくります。同じ動詞の3形が卓上に揃った人は山を叩き、3形を順に言います。空振りは1回休みです。',
        time: '10分', groupSize: '3〜4人グループ', drills: '基本3形',
        runsWith: NO_DEVICE,
        runsWithNote: '端末は不要です。混ぜた三形カードの山と机が、道具のすべてです。',
      },
      {
        name: '過去形グリッド',
        setup: '文字ボードを出し、このラウンドは過去形だけが得点だと伝えます。',
        rules: '生徒は共有ボードで過去形の動詞を探します。現在形は言ってよいが得点になりません。2分後、3つを黒板に書き、横に現在形を置きます。',
        time: '5〜8分', groupSize: 'クラス全体', drills: '過去形の認識',
        runsWith: 'classic',
        runsWithNote: 'クラシックモード。参加コードを出す前に「過去形だけ」と言い、現在形を稼がせないようにします。',
      },
      {
        name: '不規則動詞の登り',
        setup: '今週の不規則動詞を3段に分けます。よく使う・あまり使わない・珍しい。',
        rules: '全員が同じ三形ドリルを、自分の段で行います。早く終わった人は上げ、詰まった人は何も言わずに下げます。',
        time: '8〜10分', groupSize: '同じ教室で個別', drills: 'その人に合う不規則動詞',
        runsWith: 'warmup',
        runsWithNote: '練習モード「ウォームアップ」が生徒ごとに設定した段でリストを進めるので、ドリルひとつで幅をカバーします。',
      },
      {
        name: '過去で物語る',
        setup: '不規則過去を8つ、黒板に縦1列で書きます。',
        rules: '教室を回り、各自が共有の物語に1文足し、列の次の過去形を使わねばなりません。現在形が出たら次の人が直して続けます。',
        time: '10分', groupSize: 'クラス全体', drills: 'つながった発話の中の過去形',
        runsWith: NO_DEVICE,
        runsWithNote: '端末は不要です。黒板の過去形8つと、順番に飲み込む物語だけです。',
      },
      {
        name: '時制のサイコロ',
        setup: '現在・過去・過去分詞を3面に書いた立方体と、今週の不規則動詞8つを黒板に。',
        rules: '生徒が振り、出た形で次の動詞を言います。クラスが確認か修正をし、サイコロが回ります。10回振って止めます。',
        time: '8分', groupSize: 'クラス全体', drills: '偶然のもとでの形の選択',
        runsWith: 'matching',
        runsWithNote: '練習モード「マッチング」がリストの現在と過去を組にします。戸棚にサイコロがないときの、サイコロの仕事です。',
      },
      {
        name: '誤りオークション',
        setup: '不規則動詞の誤りが1つずつ入った文を6つ黒板に書きます。',
        rules: '直せると思う文にチームが値を付けます。最高値が挑戦。きれいに直せば得点、外すと半額で次のチームへ。',
        time: '10分', groupSize: '3〜4人チーム', drills: '誤りの訂正',
        runsWith: 'spelling',
        runsWithNote: '練習モード「スペリング」が、オークションが残した誤りのために、同じ不規則形を1文字ずつ復習します。',
      },
    ],
  },

  ru: {
    heading: 'Шесть классных игр для неправильных глаголов',
    intro:
      'Шесть игр для глаголов, которые не принимают аккуратное -ed: три формы, поиск прошедшего и история, которая должна проглотить их по порядку. Те, что не требуют устройства, говорят об этом в своей строке. Остальные идут в браузере по коду из шести знаков, без ученических аккаунтов.',
    labels: { time: 'Время', group: 'Состав', drills: 'Тренирует', setup: 'Подготовка', rules: 'Как играть', onLexiClash: 'В LexiClash' },
    games: [
      {
        name: 'Снэп трёх форм',
        setup: 'Карточки тройками: go / went / gone, каждая форма на своей карточке, в одной перемешанной колоде.',
        rules: 'Игроки по очереди переворачивают карточку. Когда кто-то видит на столе все три формы одного глагола, бьёт по колоде и говорит формы по порядку. Ложный удар пропускает ход.',
        time: '10 мин', groupSize: 'Группы по 3–4', drills: 'Основные формы',
        runsWith: NO_DEVICE,
        runsWithNote: 'Устройство не нужно. Перемешанная колода тройных карточек и стол — весь набор.',
      },
      {
        name: 'Сетка прошедшего времени',
        setup: 'Загрузите буквенную сетку и скажите классу, что в этом раунде считаются только формы прошедшего.',
        rules: 'Ученики ищут глаголы в прошедшем на общей сетке. Формы настоящего называют, но они не считаются. Через две минуты напишите три находки и рядом — настоящее.',
        time: '5–8 мин', groupSize: 'Весь класс', drills: 'Узнавание прошедшего',
        runsWith: 'classic',
        runsWithNote: 'Классический режим: правило «только прошедшее» сказано до того, как появится код, чтобы никто не косил настоящее.',
      },
      {
        name: 'Подъём по неправильным',
        setup: 'Разделите неправильные глаголы недели на три уровня: частые, менее частые, редкие.',
        rules: 'Каждый делает одно и то же упражнение на три формы на своём уровне. Поднимите того, кто закончил рано; опустите без комментария того, кто застрял.',
        time: '8–10 мин', groupSize: 'По одному, в одном классе', drills: 'Свой набор неправильных',
        runsWith: 'warmup',
        runsWithNote: 'Режим практики «Разминка» ведёт список на уровне, заданном ученику, поэтому одно упражнение покрывает разброс.',
      },
      {
        name: 'История в прошедшем',
        setup: 'Напишите столбиком на доске восемь неправильных форм прошедшего.',
        rules: 'По кругу каждый добавляет одно предложение в общую историю и обязан взять следующую форму прошедшего из столбика. Если проскочило настоящее, следующий чинит и продолжает.',
        time: '10 мин', groupSize: 'Весь класс', drills: 'Прошедшие формы в связной речи',
        runsWith: NO_DEVICE,
        runsWithNote: 'Устройство не нужно. Восемь прошедших на доске и история, которая должна проглотить их по порядку.',
      },
      {
        name: 'Кубик времён',
        setup: 'Куб с настоящим, прошедшим и причастием на трёх гранях и восемь неправильных глаголов недели на доске.',
        rules: 'Ученик бросает, выпадает форма, и он говорит эту форму следующего глагола. Класс подтверждает или чинит, куб идёт дальше. Десять бросков — и стоп.',
        time: '8 мин', groupSize: 'Весь класс', drills: 'Выбор формы наугад',
        runsWith: 'matching',
        runsWithNote: 'Режим практики «Сопоставление» склеивает каждое настоящее с прошедшим из вашего списка — работа куба, когда куба в шкафу нет.',
      },
      {
        name: 'Аукцион ошибок',
        setup: 'Напишите на доске шесть предложений, в каждом одна ошибка неправильного глагола.',
        rules: 'Команды торгуются за предложение, которое думают починить. Высшая ставка пробует. Чистый ремонт забирает очки; промах отдаёт предложение следующей команде за полцены.',
        time: '10 мин', groupSize: 'Команды по 3–4', drills: 'Исправление ошибок',
        runsWith: 'spelling',
        runsWithNote: 'Режим практики «Орфография» потом проходит те же неправильные формы по буквам — для ошибок, которые аукцион оставил стоять.',
      },
    ],
  },
};

export function getIrregularVerbsClassGames(locale: string): ClassGameSection {
  const normalized = locale.toLowerCase().split('-')[0] as EducationLocale;
  return SECTIONS[normalized] ?? SECTIONS.en;
}
