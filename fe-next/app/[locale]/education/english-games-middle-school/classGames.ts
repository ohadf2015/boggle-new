import { NO_DEVICE, type ClassGameSection } from '@/components/education/ClassGameList';
import type { EducationLocale } from '../_englishLearner/types';

/**
 * Six English games for teen ESL. Titles stay disjoint from elementary and
 * adults; setup/rules/drills must match the teen titles (prefix, root,
 * homophone, register), not a primary CVC/picture-card swap.
 */

const SECTIONS: Record<EducationLocale, ClassGameSection> = {
  en: {
    heading: '6 English games for a teen ESL room',
    intro:
      'Six games for a teen ESL room: prefixes, roots, homophones, and the register shift from a group chat to a teacher. The ones that need no device say so on their own row. The rest run in the browser, judged against English, not a translated list.',
    labels: { time: 'Time', group: 'Group', drills: 'Drills', setup: 'Setup', rules: 'How to play', onLexiClash: 'On LexiClash' },
    games: [
      {
        name: 'Prefix Swap Race',
        setup: 'Put eight roots on the whiteboard and a prefix bank: un-, re-, dis-, mis-, over-, under-.',
        rules:
          'Call a root. Pairs race to swap a prefix onto it and say the new meaning in one spoken sentence. The pair that stands first reads both meanings. A made-up prefix that English does not use sits out.',
        time: '8 min',
        groupSize: 'Pairs',
        drills: 'Prefix + root meaning',
        runsWith: NO_DEVICE,
        runsWithNote: 'No device needed. Roots on the board and a prefix bank are the whole race.',
      },
      {
        name: 'Debate the Gloss',
        setup: 'Post four academic items with two competing glosses each — one precise, one the slang teens actually use.',
        rules:
          'Pairs have forty seconds to pick the classroom gloss and defend it in one sentence. The other pair argues the slang reading. Vote, then keep the winning gloss on the wall all week.',
        time: '8 min',
        groupSize: 'Pairs, then whole class',
        drills: 'Precise gloss versus slang',
        runsWith: NO_DEVICE,
        runsWithNote: 'No device needed. Eight glosses, a forty-second debate, and a vote.',
      },
      {
        name: 'Root Grid Sprint',
        setup: 'Post three Greek or Latin roots (struct, spect, port) plus the derived set for this unit.',
        rules:
          'Players scan a 5x5 letter field for dictionary English. A find that carries one of the posted roots scores twice. Close by unpacking one root into three derived forms and a single gloss.',
        time: '5 min',
        groupSize: 'Whole class',
        drills: 'Morphology on a letter grid',
        runsWith: 'classic',
        runsWithNote: 'Classic mode on a 5x5 board, language set to English in the create-room dialog.',
      },
      {
        name: 'Peer Coach Pair',
        setup: 'Pair students. Give each pair a chat-line and the same idea written for a teacher.',
        rules:
          'Partner A reads the chat line. Partner B coaches a rewrite into classroom register without losing the meaning. Swap. Two minutes each. One pair reads both versions.',
        time: '8 min',
        groupSize: 'Pairs',
        drills: 'Informal-to-formal register',
        runsWith: NO_DEVICE,
        runsWithNote: 'No device needed. Two lines on a slip and a two-minute coach is the whole pair.',
      },
      {
        name: 'Homophone Trap',
        setup: 'Rival sides. Ten homophone pairs on slips: their/there, affect/effect, principal/principle.',
        rules:
          'Read a sentence with a blank. The faster side writes the homophone that fits. The twin that does not fit, or a misspelling, loses the point. After the match, run the same list in spelling mode.',
        time: '10 min',
        groupSize: 'Two teams',
        drills: 'Homophone choice under a clock',
        runsWith: 'spelling',
        runsWithNote: 'The Spelling practice mode drills the same homophone list letter by letter afterwards.',
      },
      {
        name: 'Annotate the Board',
        setup: 'Choose a morphology target — a word whose prefix or root you want marked — before play begins.',
        rules:
          'Students search a letter field for that morphology target. On a hit, a volunteer labels prefix, root, and a one-line gloss on the projector. Other dictionary finds still count; the annotation is the win condition.',
        time: '5 min',
        groupSize: 'Whole class',
        drills: 'Morphological annotation',
        runsWith: 'word-hunt',
        runsWithNote: 'Word Hunt mode, chosen on the host screen, so the annotated word stays the point of the round.',
      },
    ],
  },

  es: {
    heading: '6 juegos de inglés para secundaria',
    intro:
      'Seis juegos para un aula de inglés adolescente: prefijos, raíces, homófonos y el salto de registro del chat al profesor. Los que no necesitan dispositivo lo dicen en su fila. El resto corre en el navegador, juzgado en inglés, no con una lista traducida.',
    labels: { time: 'Tiempo', group: 'Agrupación', drills: 'Practica', setup: 'Preparación', rules: 'Cómo se juega', onLexiClash: 'En LexiClash' },
    games: [
      {
        name: 'Carrera de prefijos',
        setup: 'Escribe ocho raíces en la pizarra y un banco de prefijos: un-, re-, dis-, mis-, over-, under-.',
        rules:
          'Dices una raíz. Las parejas corren a cambiarle el prefijo y decir el nuevo significado en una frase. La primera pareja lee ambos sentidos. Un prefijo inventado que el inglés no usa se queda fuera.',
        time: '8 min',
        groupSize: 'Parejas',
        drills: 'Prefijo + significado de la raíz',
        runsWith: NO_DEVICE,
        runsWithNote: 'Sin dispositivo. Las raíces en la pizarra y el banco de prefijos son toda la carrera.',
      },
      {
        name: 'Debate la glosa',
        setup: 'Escribe cuatro palabras académicas con dos glosas rivales: una precisa y una del argot que de verdad usan.',
        rules:
          'Las parejas tienen cuarenta segundos para elegir la glosa de aula y defenderla en una frase. La otra pareja defiende la lectura de argot. Se vota y la glosa ganadora se queda en la pizarra toda la semana.',
        time: '8 min',
        groupSize: 'Parejas, luego toda la clase',
        drills: 'Glosa precisa frente a argot',
        runsWith: NO_DEVICE,
        runsWithNote: 'Sin dispositivo. Ocho glosas, un debate de cuarenta segundos y un voto.',
      },
      {
        name: 'Sprint de raíces',
        setup: 'Antes de la ronda, escribe tres raíces griegas o latinas (struct, spect, port) y las palabras derivadas de la semana.',
        rules:
          'Todos buscan palabras inglesas reales en un tablero compartido. Extra si la palabra comparte una raíz puesta. Al final desmontáis una raíz: tres palabras, un significado.',
        time: '5 min',
        groupSize: 'Toda la clase',
        drills: 'Morfología en el tablero de letras',
        runsWith: 'classic',
        runsWithNote: 'Modo clásico en 5x5, idioma inglés en la ventana de crear sala.',
      },
      {
        name: 'Pareja de entrenadores',
        setup: 'Empareja. Cada pareja recibe una línea de chat y la misma idea escrita para un profesor.',
        rules:
          'A lee la línea de chat. B entrena una reescritura al registro de aula sin perder el sentido. Cambian. Dos minutos cada uno. Una pareja lee las dos versiones.',
        time: '8 min',
        groupSize: 'Parejas',
        drills: 'Registro informal a formal',
        runsWith: NO_DEVICE,
        runsWithNote: 'Sin dispositivo. Dos líneas en un papel y dos minutos de coach son toda la pareja.',
      },
      {
        name: 'Trampa de homófonos',
        setup: 'Dos equipos. Diez pares de homófonos en papeles: their/there, affect/effect, principal/principle.',
        rules:
          'Lee una frase con un hueco. El primer equipo escribe el homófono que cabe. El gemelo que no cabe, o una falta, pierde el punto. Después, la misma lista en el modo Ortografía.',
        time: '10 min',
        groupSize: 'Dos equipos',
        drills: 'Elección de homófono con reloj',
        runsWith: 'spelling',
        runsWithNote: 'El modo Ortografía repasa después la misma lista de homófonos letra a letra.',
      },
      {
        name: 'Anota el tablero',
        setup: 'Elige una palabra objetivo con un prefijo o una raíz pegajosa antes de empezar la ronda.',
        rules:
          'La clase busca esa palabra en un tablero compartido. Cuando aparece, un voluntario anota prefijo, raíz y una glosa de una línea. Las demás cuentan, pero la ronda va de la anotación.',
        time: '5 min',
        groupSize: 'Toda la clase',
        drills: 'Anotación morfológica',
        runsWith: 'word-hunt',
        runsWithNote: 'Modo Word Hunt, elegido en la pantalla del anfitrión, para que la palabra anotada siga siendo el centro.',
      },
    ],
  },

  he: {
    heading: '6 משחקי אנגלית לחטיבת ביניים',
    intro:
      'שישה משחקים לכיתת אנגלית של בני נוער: קידומות, שורשים, הומופונים, והחלפת משלב מצ׳אט למורה. אלה שלא דורשים מכשיר אומרים זאת בשורה שלהם. השאר רצים בדפדפן ונשפטים מול אנגלית, לא מול רשימה מתורגמת.',
    labels: { time: 'זמן', group: 'הרכב', drills: 'מתרגל', setup: 'הכנה', rules: 'איך משחקים', onLexiClash: 'ב-LexiClash' },
    games: [
      {
        name: 'מרוץ החלפת קידומות',
        setup: 'כתבו שמונה שורשים על הלוח ובנק קידומות: un-, re-, dis-, mis-, over-, under-.',
        rules:
          'קוראים שורש. הזוגות רצים להחליף לו קידומת ולומר את המשמעות החדשה במשפט. הזוג הראשון מקריא את שתי המשמעויות. קידומת מומצאת שאנגלית לא משתמשת בה יושבת בחוץ.',
        time: '8 דק׳',
        groupSize: 'זוגות',
        drills: 'קידומת ומשמעות השורש',
        runsWith: NO_DEVICE,
        runsWithNote: 'לא צריך מכשיר. שורשים על הלוח ובנק קידומות הם כל המרוץ.',
      },
      {
        name: 'ויכוח על הפירוש',
        setup: 'כתבו ארבע מילים אקדמיות עם שני פירושים מתחרים לכל אחת — אחד מדויק ואחד מהסלנג שהם באמת משתמשים בו.',
        rules:
          'לזוגות יש ארבעים שניות לבחור את פירוש הכיתה ולהגן עליו במשפט. הזוג השני מגן על קריאת הסלנג. מצביעים, ומשאירים את הפירוש המנצח על הלוח כל השבוע.',
        time: '8 דק׳',
        groupSize: 'זוגות, ואז כל הכיתה',
        drills: 'פירוש מדויק מול סלנג',
        runsWith: NO_DEVICE,
        runsWithNote: 'לא צריך מכשיר. שמונה פירושים, ויכוח של ארבעים שניות, והצבעה.',
      },
      {
        name: 'ספרינט שורשים על הלוח',
        setup: 'לפני הסיבוב כותבים על הלוח שלושה שורשים יווניים או לטיניים (struct, spect, port) ואת המילים הנגזרות של השבוע.',
        rules:
          'כולם מחפשים מילים אנגליות אמיתיות על לוח משותף. בונוס אם מילה חולקת שורש שפורסם. בסוף מפרקים שורש אחד: שלוש מילים, משמעות אחת.',
        time: '5 דק׳',
        groupSize: 'כל הכיתה',
        drills: 'מורפולוגיה על לוח אותיות',
        runsWith: 'classic',
        runsWithNote: 'מצב קלאסי על לוח 5x5, שפה אנגלית בחלון פתיחת החדר.',
      },
      {
        name: 'זוג מאמנים',
        setup: 'זוגות. לכל זוג שורת צ׳אט ואותו רעיון כתוב למורה.',
        rules:
          'א׳ קורא את שורת הצ׳אט. ב׳ מאמן כתיבה מחדש למשלב של כיתה בלי לאבד את המשמעות. מחליפים. שתי דקות לכל אחד. זוג אחד מקריא את שתי הגרסאות.',
        time: '8 דק׳',
        groupSize: 'זוגות',
        drills: 'משלב לא־פורמלי לפורמלי',
        runsWith: NO_DEVICE,
        runsWithNote: 'לא צריך מכשיר. שתי שורות על פתק ושתי דקות אימון — זה כל הזוג.',
      },
      {
        name: 'מלכודת הומופונים',
        setup: 'שתי קבוצות. עשרה זוגות הומופונים על פתקים: their/there, affect/effect, principal/principle.',
        rules:
          'קוראים משפט עם חסר. הקבוצה הראשונה כותבת את ההומופון שמתאים. התאום שלא מתאים, או איות שגוי, מפסיד את הנקודה. אחר כך אותה רשימה במצב האיות.',
        time: '10 דק׳',
        groupSize: 'שתי קבוצות',
        drills: 'בחירת הומופון מול שעון',
        runsWith: 'spelling',
        runsWithNote: 'מצב האיות מתרגל אחר כך את אותה רשימת הומופונים אות־אות.',
      },
      {
        name: 'סמנו את הלוח',
        setup: 'בוחרים מילת יעד עם קידומת או שורש דביק לפני תחילת הסיבוב.',
        rules:
          'הכיתה מחפשת את המילה על לוח משותף. כשמוצאים, מתנדב מסמן קידומת, שורש ופירוש בשורה אחת. מציאות אחרות עדיין מזכות, אבל הסיבוב הוא על הסימון.',
        time: '5 דק׳',
        groupSize: 'כל הכיתה',
        drills: 'סימון מורפולוגי',
        runsWith: 'word-hunt',
        runsWithNote: 'מצב Word Hunt, שנבחר במסך המארח, כך שהמילה המסומנת נשארת מוקד הסיבוב.',
      },
    ],
  },

  sv: {
    heading: '6 engelsklekar för högstadiet',
    intro:
      'Sex lekar för ett tonårigt ESL-rum: prefix, rötter, homofoner och registerbytet från gruppchatten till läraren. De som inte kräver någon enhet säger det på sin rad. Resten körs i webbläsaren och bedöms mot engelska, inte en översatt lista.',
    labels: { time: 'Tid', group: 'Gruppering', drills: 'Tränar', setup: 'Förberedelse', rules: 'Så spelas den', onLexiClash: 'På LexiClash' },
    games: [
      {
        name: 'Prefixbyte-lopp',
        setup: 'Skriv åtta rötter på tavlan och en prefixbank: un-, re-, dis-, mis-, over-, under-.',
        rules:
          'Säg en rot. Paren tävlar om att byta prefix på den och säga den nya betydelsen i en mening. Första paret läser båda betydelserna. Ett påhittat prefix som engelskan inte använder sitter över.',
        time: '8 min',
        groupSize: 'Par',
        drills: 'Prefix + rotens betydelse',
        runsWith: NO_DEVICE,
        runsWithNote: 'Ingen enhet behövs. Rötterna på tavlan och prefixbanken är hela loppet.',
      },
      {
        name: 'Debattera glosan',
        setup: 'Skriv fyra akademiska ord med två konkurrerande glosor vardera — en precis, en slang tonåringar faktiskt använder.',
        rules:
          'Paren har fyrtio sekunder på att välja klassrumsglosan och försvara den i en mening. Det andra paret argumenterar för slangläsningen. Rösta, och låt vinnande glosan stå kvar hela veckan.',
        time: '8 min',
        groupSize: 'Par, sedan hela klassen',
        drills: 'Precis glosa mot slang',
        runsWith: NO_DEVICE,
        runsWithNote: 'Ingen enhet behövs. Åtta glosor, en fyrtio sekunders debatt och en röstning.',
      },
      {
        name: 'Rotnät-sprint',
        setup: 'Innan rundan: skriv tre grekiska eller latinska rötter på tavlan (struct, spect, port) och veckans avledda ord.',
        rules:
          'Alla jagar riktiga engelska ord på en delad plan. Extra poäng om ett funnet ord delar en uppsatt rot. Till slut packar ni upp en rot: tre ord, en betydelse.',
        time: '5 min',
        groupSize: 'Hela klassen',
        drills: 'Morfologi på bokstavsplan',
        runsWith: 'classic',
        runsWithNote: 'Klassiskt läge på 5x5, språket engelska i dialogrutan för att skapa rum.',
      },
      {
        name: 'Kamratcoach-par',
        setup: 'Para ihop. Varje par får en chattrad och samma idé skriven till en lärare.',
        rules:
          'A läser chattraden. B coachar en omskrivning till klassrumsregister utan att tappa betydelsen. Byt. Två minuter var. Ett par läser båda versionerna.',
        time: '8 min',
        groupSize: 'Par',
        drills: 'Informellt till formellt register',
        runsWith: NO_DEVICE,
        runsWithNote: 'Ingen enhet behövs. Två rader på en lapp och två minuters coach är hela paret.',
      },
      {
        name: 'Homofonfällan',
        setup: 'Två lag. Tio homofonpar på lappar: their/there, affect/effect, principal/principle.',
        rules:
          'Läs en mening med en lucka. Första laget skriver homofonen som passar. Tvillingen som inte passar, eller en felstavning, tappar poängen. Efter matchen samma lista i stavningsläget.',
        time: '10 min',
        groupSize: 'Två lag',
        drills: 'Homofonval mot klockan',
        runsWith: 'spelling',
        runsWithNote: 'Övningsläget Stavning går igenom samma homofonlista bokstav för bokstav efteråt.',
      },
      {
        name: 'Annotera planen',
        setup: 'Välj ett målord med ett klibbigt prefix eller en rot innan rundan startar.',
        rules:
          'Klassen jagar det ordet på en delad plan. När det hittas annoterar en volontär prefix, rot och en enradig glosa. Andra fynd ger fortfarande poäng, men rundan handlar om annoteringen.',
        time: '5 min',
        groupSize: 'Hela klassen',
        drills: 'Morfologisk annotering',
        runsWith: 'word-hunt',
        runsWithNote: 'Läget Word Hunt, valt på värdskärmen, så det annoterade ordet förblir rundans poäng.',
      },
    ],
  },

  ja: {
    heading: '中学生の英語クラス向け6ゲーム',
    intro:
      '接頭辞・語根・同音異義語、そしてグループチャットから先生へのレジスター切り替え。英語を学ぶ中学生向けの6ゲーム。端末が要らないものは各行に明記します。ほかはブラウザで、翻訳リストではなく英語の辞書で判定されます。',
    labels: { time: '時間', group: '人数', drills: '鍛える力', setup: '準備', rules: '進め方', onLexiClash: 'LexiClashでは' },
    games: [
      {
        name: '接頭辞スワップ競争',
        setup: '黒板に語根を8つと接頭辞バンクを書く：un-, re-, dis-, mis-, over-, under-。',
        rules:
          '語根を1つ言う。ペアは接頭辞を付け替えて新しい意味を1文で言う競争。先に立ったペアが両方の意味を読む。英語にない作った接頭辞は失格。',
        time: '8分',
        groupSize: 'ペア',
        drills: '接頭辞と語根の意味',
        runsWith: NO_DEVICE,
        runsWithNote: '端末は不要。黒板の語根と接頭辞バンクが競争の全部です。',
      },
      {
        name: '語義を討論',
        setup: '学術語を4つ、競合する語義を2つずつ書く。1つは正確、1つは中学生が本当に使うスラング。',
        rules:
          'ペアは40秒で教室用の語義を選び、1文で守る。相手ペアはスラング読みを主張する。投票し、勝った語義を一週間黒板に残す。',
        time: '8分',
        groupSize: 'ペア、その後クラス全体',
        drills: '正確な語義対スラング',
        runsWith: NO_DEVICE,
        runsWithNote: '端末は不要。語義8つ、40秒の討論、投票がすべてです。',
      },
      {
        name: '語根グリッド走',
        setup: 'ラウンド前にギリシャ・ラテン語根を3つ黒板に書く（struct, spect, port）。今週の派生語も。',
        rules:
          '全員が共有盤で実在する英語を探す。掲示した語根を共有する語は加点。最後に語根を1つ分解する：語3つ、意味1つ。',
        time: '5分',
        groupSize: 'クラス全体',
        drills: '文字盤での形態論',
        runsWith: 'classic',
        runsWithNote: '5x5のクラシック。ルーム作成画面で言語を英語に。',
      },
      {
        name: 'ピアコーチペア',
        setup: 'ペアにする。各ペアにチャット文と、同じ内容を先生向けに書いた文を渡す。',
        rules:
          'Aがチャット文を読む。Bは意味を落とさず教室のレジスターへ書き換えるようコーチする。交代。各2分。1組が両方を音読する。',
        time: '8分',
        groupSize: 'ペア',
        drills: 'くだけたレジスターから改まったレジスターへ',
        runsWith: NO_DEVICE,
        runsWithNote: '端末は不要。紙片の2行と2分のコーチがペアの全部です。',
      },
      {
        name: '同音異義語トラップ',
        setup: '2チーム。同音異義語のペアを10組、紙片に：their/there, affect/effect, principal/principle。',
        rules:
          '空欄のある文を読む。先のチームが合う同音異義語を書く。合わない双子や綴りミスは失点。試合後、同じリストをスペリングモードで。',
        time: '10分',
        groupSize: '2チーム',
        drills: '時計に追われる同音異義語の選択',
        runsWith: 'spelling',
        runsWithNote: '練習モード「スペリング」が、あとで同じ同音異義語リストを1文字ずつ復習します。',
      },
      {
        name: '盤に注釈',
        setup: 'ラウンド前に、くっつきやすい接頭辞か語根を持つ目標の語を1つ決める。',
        rules:
          'クラスはその語を共有盤で探す。見つかったらボランティアが接頭辞・語根・1行の語義を注釈する。ほかの語も得点だが、主役は注釈。',
        time: '5分',
        groupSize: 'クラス全体',
        drills: '形態の注釈',
        runsWith: 'word-hunt',
        runsWithNote: 'Word Huntモードをホスト画面で選び、注釈する語がラウンドの焦点のままになるようにします。',
      },
    ],
  },

  ru: {
    heading: '6 игр на английском для средней школы',
    intro:
      'Шесть игр для подросткового ESL-класса: приставки, корни, омофоны и сдвиг регистра из чата к учителю. Те, что без устройства, говорят об этом в своей строке. Остальные идут в браузере и судятся по английскому, а не по переводному списку.',
    labels: { time: 'Время', group: 'Состав', drills: 'Тренирует', setup: 'Подготовка', rules: 'Как играть', onLexiClash: 'В LexiClash' },
    games: [
      {
        name: 'Гонка замены приставок',
        setup: 'Напишите на доске восемь корней и банк приставок: un-, re-, dis-, mis-, over-, under-.',
        rules:
          'Назовите корень. Пары спешат сменить приставку и сказать новое значение одним предложением. Первая пара читает оба смысла. Выдуманная приставка, которой нет в английском, выбывает.',
        time: '8 мин',
        groupSize: 'Пары',
        drills: 'Приставка и значение корня',
        runsWith: NO_DEVICE,
        runsWithNote: 'Устройство не нужно. Корни на доске и банк приставок — вся гонка.',
      },
      {
        name: 'Спор о толковании',
        setup: 'Напишите четыре учебных слова с двумя конкурирующими толкованиями: одно точное, одно из сленга, которым они реально говорят.',
        rules:
          'У пар сорок секунд выбрать классное толкование и защитить его одним предложением. Другая пара защищает сленговое чтение. Голосуете и оставляете победившее толкование на доске на всю неделю.',
        time: '8 мин',
        groupSize: 'Пары, затем весь класс',
        drills: 'Точное толкование против сленга',
        runsWith: NO_DEVICE,
        runsWithNote: 'Устройство не нужно. Восемь толкований, сорок секунд спора и голосование.',
      },
      {
        name: 'Спринт корней',
        setup: 'Перед раундом напишите на доске три греческих или латинских корня (struct, spect, port) и производные слова недели.',
        rules:
          'Все ищут настоящие английские слова на общем поле. Бонус, если найденное слово делит вывешенный корень. В конце разбираете один корень: три слова, одно значение.',
        time: '5 мин',
        groupSize: 'Весь класс',
        drills: 'Морфология на буквенном поле',
        runsWith: 'classic',
        runsWithNote: 'Классический режим на 5x5, язык английский в окне создания комнаты.',
      },
      {
        name: 'Пара наставников',
        setup: 'Пары. Каждой паре — строка из чата и та же мысль, написанная учителю.',
        rules:
          'А читает строку чата. Б тренирует переписывание в классный регистр, не теряя смысл. Меняются. По две минуты. Одна пара читает обе версии.',
        time: '8 мин',
        groupSize: 'Пары',
        drills: 'Неформальный регистр в формальный',
        runsWith: NO_DEVICE,
        runsWithNote: 'Устройство не нужно. Две строки на бумажке и две минуты наставничества — вся пара.',
      },
      {
        name: 'Ловушка омофонов',
        setup: 'Две команды. Десять пар омофонов на бумажках: their/there, affect/effect, principal/principle.',
        rules:
          'Читаете предложение с пропуском. Первая команда пишет омофон, который подходит. Близнец, который не подходит, или ошибка — минус очко. Потом тот же список в режиме орфографии.',
        time: '10 мин',
        groupSize: 'Две команды',
        drills: 'Выбор омофона под часы',
        runsWith: 'spelling',
        runsWithNote: 'Режим «Орфография» потом проходит тот же список омофонов по буквам.',
      },
      {
        name: 'Разметьте поле',
        setup: 'Выберите одно целевое слово с цепкой приставкой или корнем до начала раунда.',
        rules:
          'Класс ищет это слово на общем поле. Когда находят, волонтёр размечает приставку, корень и толкование в одну строку. Другие находки тоже дают очки, но раунд — про разметку.',
        time: '5 мин',
        groupSize: 'Весь класс',
        drills: 'Морфологическая разметка',
        runsWith: 'word-hunt',
        runsWithNote: 'Режим Word Hunt на экране ведущего, чтобы размеченное слово осталось смыслом раунда.',
      },
    ],
  },
};

export function getMiddleSchoolEnglishClassGames(locale: string): ClassGameSection {
  const normalized = locale.toLowerCase().split('-')[0] as EducationLocale;
  return SECTIONS[normalized] ?? SECTIONS.en;
}
