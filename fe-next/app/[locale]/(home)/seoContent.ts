/**
 * Homepage publisher content — the single source for both the visible
 * About/FAQ section (HomepageContentSection) and the FAQPage JSON-LD emitted
 * by page.tsx.
 *
 * Google requires FAQPage structured data to match copy that is actually
 * visible on the page, which is why these two outputs must read the same
 * array. Until 2026-08-25 the JSON-LD came from a second, divergent copy in
 * lib/seo/homepageFaqJsonLd.ts whose first four questions only branched on
 * `he`/`ru` — /es and /sv shipped English answers inside their structured
 * data (confirmed live by curl). That file is gone; edit the FAQ here.
 */

export interface HomepageSeoContent {
  title: string;
  description: string;
  features: string[];
  faq: { question: string; answer: string }[];
}

export const seoContent: Record<string, HomepageSeoContent> = {
  en: {
    title: 'LexiClash — Free Multiplayer Word Game Online',
    description:
      'LexiClash is a free online multiplayer word game that combines the grid-based word hunting of Boggle with real-time competitive gameplay. Find words on a shared letter grid, race against friends or strangers, and climb the leaderboard — all in your browser with no download or signup required. Play in English, Hebrew, Swedish, Japanese, or Spanish across multiple game modes including Classic, Word Hunt, Blast, and the daily Word Wheel challenge. LexiClash also features Adventure Mode with 100 progressive levels across 10 themed worlds, Brain Training drills for cognitive improvement, and a Party Mode designed for group play on a shared TV screen.',
    features: [
      'Real-time multiplayer word battles — 2 to 20+ players on the same grid simultaneously',
      'Six distinct game modes: Classic, Word Hunt, Blast, Wheel Rush, Adventure, and Brain Training',
      'Daily Word Wheel challenge with global leaderboards and streak tracking',
      'Adventure Mode with 100 levels across 10 themed worlds, boss fights, and progressive difficulty',
      'Brain Training drills: Lightning Round, Rare Gems, Combo Master, Pattern Switcher, Memory Hunt',
      'Party Mode for game nights — play on a shared TV with phones as controllers',
      'Five language support: English, Hebrew (RTL), Swedish, Japanese, and Spanish',
      'No download, no signup — play instantly in any modern browser on phone, tablet, or desktop',
      'Custom avatars, achievements, XP progression, and seasonal leaderboards',
      'Built on peer-reviewed cognitive science — word games improve vocabulary, memory, and processing speed',
    ],
    faq: [
      {
        question: 'What is LexiClash and how do I play?',
        answer:
          'LexiClash is a free multiplayer word game where you find words on a letter grid in real time. Swipe or type to connect adjacent letters and form words before the timer runs out. The longer and rarer the word, the more points you score. You can play solo, against AI, or challenge friends in private rooms.',
      },
      {
        question: 'Is LexiClash free to play?',
        answer:
          'Yes — LexiClash is completely free with no download or account required. Open it in your browser and start playing immediately. There are no paywalls, ads-to-unlock mechanics, or premium-only game modes.',
      },
      {
        question: 'How is LexiClash different from Boggle, Scrabble, or Wordle?',
        answer:
          'Unlike Scrabble (turn-based tile placement) or Wordle (single daily guess), LexiClash is a real-time competitive word hunt on a shared grid. Everyone plays simultaneously under time pressure, with live score feeds and combo chains. Think of it as Boggle meets esports — same grid-search concept, but multiplayer, scored, and fast.',
      },
      {
        question: 'What languages does LexiClash support?',
        answer:
          'LexiClash supports five languages: English, Hebrew (with full right-to-left support), Swedish, Japanese, and Spanish. Each language has its own validated dictionary, scoring system, and localized UI. You can switch languages at any time from the settings menu.',
      },
      {
        question: 'Can I play LexiClash on my phone?',
        answer:
          'Yes — LexiClash is a progressive web app optimized for mobile browsers. It works on any modern smartphone, tablet, or desktop without downloading an app. Swipe to find words on touch screens or type on desktop keyboards.',
      },
      {
        question: 'What is the Daily Word Wheel?',
        answer:
          'The Daily Word Wheel is a free daily word puzzle: a wheel of letters where you form as many words as possible, and every word must include the center letter. All players worldwide get the same wheel at midnight UTC. No download, no signup — play in your browser and share results like Wordle.',
      },
      {
        question: 'What is Word Hunt?',
        answer:
          'Word Hunt is a daily word-search puzzle: you have 10 attempts to find the hidden word on the board. All players worldwide get the same board at midnight UTC. Share emoji results like Wordle. Play free on LexiClash — no download, no signup.',
      },
      {
        question: 'What are the best free online word games in 2026?',
        answer:
          'LexiClash has five free word games playable in any browser with no download or signup: Classic (real-time Boggle for 2–50 players), Daily Word Wheel (a shared daily puzzle), Word Hunt (a daily word-search challenge), Word Forge (a speed word-building mode), and Blast (a tile-clearing sprint). Five languages, no account required.',
      },
    ],
  },
  ru: {
    title: 'LexiClash — бесплатная игра в слова онлайн',
    description:
      'LexiClash — это бесплатная многопользовательская игра в слова, которая соединяет поиск слов на буквенном поле в духе «Балды» и «Боггла» с соревновательным геймплеем в реальном времени. Составляйте слова из букв на общем поле, соревнуйтесь с друзьями или случайными соперниками и поднимайтесь в таблице лидеров — прямо в браузере, без скачивания и регистрации. Играйте на русском, английском, иврите, шведском, японском или испанском в нескольких режимах: «Классический», «Охота за словами», «Бласт» и ежедневное «Колесо слов». В LexiClash также есть режим приключений со 100 уровнями в 10 тематических мирах, тренировки для мозга и режим вечеринки для игры компанией на одном экране телевизора.',
    features: [
      'Битвы в слова в реальном времени — от 2 до 20+ игроков на одном поле одновременно',
      'Шесть режимов: «Классический», «Охота за словами», «Бласт», «Колесо слов», «Приключение» и «Тренировка мозга»',
      'Ежедневное «Колесо слов» (слово дня) с мировыми таблицами лидеров и сериями',
      'Режим приключений: 100 уровней в 10 тематических мирах, боссы и растущая сложность',
      'Тренировки мозга: молниеносный раунд, редкие самоцветы, мастер комбо, переключатель шаблонов',
      'Режим вечеринки для игровых вечеров — играйте на экране телевизора, телефоны как пульты',
      'Поддержка шести языков: русский, английский, иврит (RTL), шведский, японский и испанский',
      'Без скачивания и регистрации — играйте сразу в любом современном браузере на телефоне, планшете или компьютере',
      'Свои аватары, достижения, прокачка опыта и сезонные таблицы лидеров',
      'Игры в слова развивают словарный запас, память и скорость мышления',
    ],
    faq: [
      {
        question: 'Что такое LexiClash и как играть?',
        answer:
          'LexiClash — это бесплатная игра в слова для нескольких игроков, где вы ищете слова на буквенном поле в реальном времени. Проводите пальцем или печатайте, чтобы соединять соседние буквы и составлять слова, пока не вышло время. Чем длиннее и реже слово, тем больше очков. Можно играть в одиночку, против ИИ или бросить вызов друзьям в закрытой комнате.',
      },
      {
        question: 'LexiClash бесплатный?',
        answer:
          'Да — LexiClash полностью бесплатный, без скачивания и без регистрации. Откройте его в браузере и сразу начинайте играть. Никаких платных стен, рекламы для разблокировки или режимов только по подписке.',
      },
      {
        question: 'Чем LexiClash отличается от «Балды», «Эрудита» или Wordle?',
        answer:
          'В отличие от «Эрудита» (расстановка фишек по очереди) или Wordle (одна догадка в день), LexiClash — это соревновательный поиск слов в реальном времени на общем поле. Все играют одновременно под таймером, со счётом в прямом эфире и цепочками комбо. Представьте «Балду», только быструю, многопользовательскую и с очками.',
      },
      {
        question: 'Какие языки поддерживает LexiClash?',
        answer:
          'LexiClash поддерживает шесть языков: русский, английский, иврит (с полной поддержкой письма справа налево), шведский, японский и испанский. У каждого языка свой проверенный словарь, своя система очков и переведённый интерфейс. Язык можно сменить в любой момент в настройках.',
      },
      {
        question: 'Можно ли играть в LexiClash на телефоне?',
        answer:
          'Да — LexiClash это прогрессивное веб-приложение, оптимизированное для мобильных браузеров. Оно работает на любом современном смартфоне, планшете или компьютере без установки приложения. Ищите слова свайпом на сенсорном экране или печатайте на клавиатуре.',
      },
      {
        question: 'Что такое ежедневное Колесо Слов?',
        answer:
          'Ежедневное Колесо Слов — это бесплатный новый паззл каждый день: колесо с буквами, из которых составляешь как можно больше слов, и каждое слово должно содержать центральную букву. Все игроки мира получают одно и то же колесо в полночь UTC. Без скачивания, без регистрации — играй в браузере и делись результатами как в Wordle.',
      },
      {
        question: 'Что такое Word Hunt (Охота на Слова)?',
        answer:
          'Word Hunt — ежедневный паззл поиска слов: у тебя есть 10 попыток найти скрытое слово на доске. Все игроки мира получают одну и ту же доску в полночь UTC. Делись результатами эмодзи как в Wordle. Играй бесплатно в LexiClash — без скачивания и регистрации.',
      },
      {
        question: 'Какие лучшие бесплатные словесные игры онлайн в 2026?',
        answer:
          'LexiClash предлагает пять бесплатных словесных игр, которые можно играть в любом браузере без скачивания: Classic (Boggle в реальном времени для 2–50 игроков), Daily Word Wheel (ежедневный общий паззл), Word Hunt (ежедневный поиск слов), Word Forge (быстрое составление слов) и Blast (спринт по очистке плиток). Без регистрации, на шести языках включая русский.',
      },
    ],
  },
  he: {
    title: 'LexiClash — משחק מילים מרובה משתתפים חינם',
    description:
      'LexiClash הוא משחק מילים מרובה משתתפים חינמי בעברית שמשלב את חיפוש המילים על לוח אותיות בסגנון בוגל עם משחק תחרותי בזמן אמת בסגנון סקרבל. מצאו מילים על לוח משותף, התחרו ראש בראש מול חברים או יריבים אקראיים, וטפסו בטבלת המובילים — הכל ישירות בדפדפן, בלי הורדה ובלי הרשמה. שחקו בעברית, אנגלית, שוודית, יפנית או ספרדית במגוון מצבי משחק: קלאסי, ציד מילים, בלאסט, גלגל מילים (מילת היום), מצב הרפתקה עם 50+ שלבים, ואימוני מוח לשיפור אוצר מילים, זיכרון ומהירות עיבוד. LexiClash כולל גם מצב מסיבה למשחק קבוצתי על מסך טלוויזיה משותף עם הטלפונים כשלטים.',
    features: [
      'קרבות מילים מרובי משתתפים בזמן אמת — 2 עד 20+ שחקנים על אותו לוח בו-זמנית',
      'שישה מצבי משחק: קלאסי, ציד מילים, בלאסט, גלגל מילים, הרפתקה ואימון מוח',
      'אתגר מילת היום בגלגל מילים יומי עם טבלאות מובילים גלובליות ומעקב רצפים',
      'מצב הרפתקה עם 50+ שלבים, קרבות בוסים ורמת קושי עולה',
      'אימוני מוח: סיבוב ברק, אבנים נדירות, מאסטר קומבו, מחליף תבניות וציד זיכרון',
      'מצב מסיבה לערבי משחקים — שחקו על מסך טלוויזיה משותף עם טלפונים כשלטים',
      'תמיכה בחמש שפות: עברית (RTL מלא), אנגלית, שוודית, יפנית וספרדית',
      'ללא הורדה, ללא הרשמה — שחקו מיד בכל דפדפן מודרני בטלפון, בטאבלט או במחשב',
      'אווטרים מותאמים אישית, הישגים, התקדמות XP וטבלאות מובילים עונתיות',
      'מבוסס על מדע קוגניטיבי — משחקי מילים משפרים אוצר מילים, זיכרון ומהירות עיבוד',
    ],
    faq: [
      {
        question: 'מה זה LexiClash ואיך משחקים?',
        answer:
          'LexiClash הוא משחק מילים מרובה משתתפים חינמי שבו מוצאים מילים על לוח אותיות בזמן אמת. מחליקים אצבע או מקלידים כדי לחבר אותיות סמוכות ולהרכיב מילים לפני שייגמר הזמן. ככל שהמילה ארוכה ונדירה יותר, כך מקבלים יותר נקודות. אפשר לשחק לבד, מול המחשב, או לאתגר חברים בחדר פרטי.',
      },
      {
        question: 'האם LexiClash חינמי לשחק?',
        answer:
          'כן — LexiClash חינמי לגמרי, בלי הורדה ובלי צורך בחשבון. פותחים בדפדפן ומתחילים לשחק מיד. אין תשלומים נסתרים, אין פרסומות שצריך לצפות בהן כדי לפתוח תכנים, ואין מצבי משחק בתשלום.',
      },
      {
        question: 'במה LexiClash שונה מבוגל, סקרבל או וורדל?',
        answer:
          'בניגוד לסקרבל (הנחת אריחים בתורות) או וורדל (ניחוש יומי בודד), LexiClash הוא ציד מילים תחרותי בזמן אמת על לוח משותף. כולם משחקים בו-זמנית תחת לחץ של שעון, הניקוד מתעדכן לנגד העיניים ויש שרשראות קומבו. תחשבו על בוגל — רק מהיר, תחרותי ומלא אקשן: אותו רעיון של חיפוש מילים על הלוח, אבל מרובה משתתפים ועם ניקוד.',
      },
      {
        question: 'באילו שפות LexiClash תומך?',
        answer:
          'LexiClash תומך בחמש שפות: עברית (עם תמיכה מלאה מימין לשמאל), אנגלית, שוודית, יפנית וספרדית. לכל שפה מילון מאומת משלה, שיטת ניקוד משלה, וממשק מתורגם. ניתן להחליף שפה בכל עת מתפריט ההגדרות.',
      },
      {
        question: 'האם אפשר לשחק ב-LexiClash מהטלפון?',
        answer:
          'כן — LexiClash הוא אפליקציית אינטרנט מתקדמת (PWA) מותאמת לדפדפני מובייל. היא עובדת בכל סמארטפון, טאבלט או מחשב מודרניים ללא צורך בהורדת אפליקציה. החליקו כדי למצוא מילים במסך מגע או הקלידו במקלדת שולחנית.',
      },
      {
        question: 'מה זה גלגל המילה היומית?',
        answer:
          'גלגל המילה היומית הוא פאזל חינמי חדש מדי יום: גלגל של אותיות שממנו יוצרים כמה שיותר מילים, כאשר כל מילה חייבת לכלול את האות המרכזית. כל העולם מקבל את אותו הגלגל בחצות UTC. ללא הורדה, ללא הרשמה — שחקו בדפדפן ושתפו תוצאות כמו Wordle.',
      },
      {
        question: 'מה זה Word Hunt (חיפוש מילים)?',
        answer:
          'Word Hunt הוא פאזל חיפוש מילים יומי: יש לכם 10 ניסיונות למצוא את המילה המוסתרת בלוח. כל העולם מקבל את אותו הלוח בחצות UTC. שתפו תוצאות אימוג\'י כמו Wordle. שחקו חינם בלקסיקלאש — ללא הורדה, ללא הרשמה.',
      },
      {
        question: 'מה הם משחקי המילים הטובים ביותר אונליין ב-2026?',
        answer:
          'לקסיקלאש מציע חמישה משחקי מילים חינמיים שניתן לשחק בכל דפדפן ללא הורדה: קלאסיק (בוגל בזמן אמת ל-2–50 שחקנים), גלגל המילה היומית (פאזל יומי משותף), Word Hunt (חיפוש מילים יומי), Word Forge (בניית מילים בלחץ זמן), ו-Blast (ספרינט ניקוי קוביות). ללא הרשמה, בחמש שפות כולל עברית.',
      },
    ],
  },
  sv: {
    title: 'LexiClash — Gratis Multiplayer-ordspel Online',
    description:
      'LexiClash är ett gratis online multiplayer-ordspel som kombinerar rutnätsbaserad ordjakt med tävlingsinriktad realtidsspelning. Hitta ord på ett delat bokstavsrutnät, tävla mot vänner eller främlingar och klättra på topplistan — allt i din webbläsare utan nedladdning eller registrering.',
    features: [
      'Ordstrider i realtid — 2 till 20+ spelare på samma rutnät samtidigt',
      'Sex spellägen: Klassiskt, Ordjakt, Blast, Ordhjul, Äventyr och Hjärnträning',
      'Daglig Ordhjulsutmaning med globala topplistor',
      'Äventyrsläge med 50+ nivåer och stigande svårighetsgrad',
      'Fem språk: engelska, hebreiska, svenska, japanska och spanska',
      'Ingen nedladdning — spela direkt i valfri modern webbläsare',
    ],
    faq: [
      {
        question: 'Vad är LexiClash och hur spelar man?',
        answer:
          'LexiClash är ett gratis multiplayer-ordspel där du hittar ord på ett bokstavsrutnät i realtid. Svep eller skriv för att koppla ihop intilliggande bokstäver och bilda ord innan tiden tar slut.',
      },
      {
        question: 'Är LexiClash gratis?',
        answer:
          'Ja — LexiClash är helt gratis utan nedladdning eller konto. Öppna i webbläsaren och börja spela direkt.',
      },
      {
        question: 'Vad är Dagligt Ordhjul?',
        answer:
          'Dagligt Ordhjul är ett gratis ordpussel som förnyas varje dag: ett hjul med bokstäver där du bildar så många ord som möjligt, och varje ord måste innehålla mittbokstaven. Alla spelare världen över får samma hjul vid midnatt UTC. Ingen nedladdning, ingen registrering — spela i webbläsaren och dela resultat som Wordle.',
      },
      {
        question: 'Vad är Word Hunt (Ordjakt)?',
        answer:
          'Word Hunt är ett dagligt ordpussel: du har 10 försök att hitta det dolda ordet på brädet. Alla spelare världen över får samma bräde vid midnatt UTC. Dela emoji-resultat som Wordle. Spela gratis på LexiClash — ingen nedladdning, ingen registrering.',
      },
      {
        question: 'Vilka är de bästa gratis ordspelen online 2026?',
        answer:
          'LexiClash erbjuder fem gratis ordspel som spelas direkt i webbläsaren utan nedladdning: Classic (Boggle i realtid för 2–50 spelare), Dagligt Ordhjul (ett dagligt delat ordpussel), Word Hunt (daglig ordsökning), Word Forge (snabbt ordbyggarläge) och Blast (sprintläge med brickrensning). Inget konto krävs, tillgängligt på fem språk inklusive svenska.',
      },
    ],
  },
  ja: {
    title: 'LexiClash — 無料マルチプレイヤーワードゲーム',
    description:
      'LexiClashは、グリッドベースのワードハンティングとリアルタイム対戦を組み合わせた無料オンラインマルチプレイヤーワードゲームです。共有レターグリッド上で単語を見つけ、友達や見知らぬ人と競い、リーダーボードを駆け上がりましょう。ダウンロードもサインアップも不要で、ブラウザですぐにプレイできます。',
    features: [
      'リアルタイムマルチプレイヤーワードバトル — 同じグリッドで2〜20人以上が同時プレイ',
      '6つのゲームモード：クラシック、ワードハント、ブラスト、ワードホイール、アドベンチャー、脳トレ',
      'デイリーワードホイールチャレンジとグローバルリーダーボード',
      'アドベンチャーモード：50以上のレベルとプログレッシブ難易度',
      '5言語対応：英語、ヘブライ語、スウェーデン語、日本語、スペイン語',
      'ダウンロード不要 — 任意のモダンブラウザで即座にプレイ',
    ],
    faq: [
      {
        question: 'LexiClashとは何ですか？どうやってプレイしますか？',
        answer:
          'LexiClashは、レターグリッド上でリアルタイムに単語を見つける無料マルチプレイヤーワードゲームです。スワイプまたはタイプで隣接する文字をつなげて単語を作り、タイマーが切れる前にスコアを稼ぎましょう。',
      },
      {
        question: 'LexiClashは無料ですか？',
        answer:
          'はい — LexiClashはダウンロード不要、アカウント不要で完全無料です。ブラウザを開いてすぐにプレイを開始できます。',
      },
      {
        question: 'デイリーワードホイールとは？',
        answer:
          'デイリーワードホイールは毎日新しい無料パズル。文字のホイールから単語を作り、すべての単語に中心文字を含める必要があります。全プレイヤーが世界中でUTC午前0時に同じホイールを受け取ります。ダウンロード・登録不要、ブラウザでプレイし、Wordleのように結果を共有できます。',
      },
      {
        question: 'ワードハントとは？',
        answer:
          'ワードハントは毎日のワードサーチパズルです。10回の試行で隠された単語を見つけます。全プレイヤーが世界中でUTC午前0時に同じボードを受け取ります。Wordleのように絵文字で結果を共有できます。LexiClashで無料でプレイ — ダウンロード・登録不要。',
      },
      {
        question: '2026年のおすすめ無料オンラインワードゲームは？',
        answer:
          'LexiClashはダウンロード・登録不要でブラウザから無料プレイできる5つのワードゲームを提供しています。Classic（2〜50人リアルタイムBoggle）、デイリーワードホイール（毎日更新の共有パズル）、ワードハント（毎日の単語探し）、ワードフォージ（制限時間内の単語構築）、Blast（タイルクリアスプリント）。日本語を含む5言語対応。',
      },
    ],
  },
  es: {
    title: 'LexiClash — Juego de Palabras Multijugador Gratis Online',
    description:
      'LexiClash es un juego de palabras multijugador gratuito en línea que combina la búsqueda de palabras en cuadrícula con jugabilidad competitiva en tiempo real. Encuentra palabras en un tablero compartido, compite contra amigos o desconocidos y sube en la tabla de clasificación — todo en tu navegador sin descarga ni registro.',
    features: [
      'Batallas de palabras en tiempo real — de 2 a 20+ jugadores en el mismo tablero simultáneamente',
      'Seis modos de juego: Clásico, Caza de Palabras, Blast, Rueda de Palabras, Aventura y Entrenamiento Cerebral',
      'Desafío diario de Rueda de Palabras con tablas de clasificación globales',
      'Modo Aventura con más de 50 niveles y dificultad progresiva',
      'Cinco idiomas: inglés, hebreo, sueco, japonés y español',
      'Sin descarga — juega directamente en cualquier navegador moderno',
    ],
    faq: [
      {
        question: '¿Qué es LexiClash y cómo se juega?',
        answer:
          'LexiClash es un juego de palabras multijugador gratuito donde encuentras palabras en un tablero de letras en tiempo real. Desliza o escribe para conectar letras adyacentes y formar palabras antes de que se acabe el tiempo.',
      },
      {
        question: '¿Es gratis LexiClash?',
        answer:
          'Sí — LexiClash es completamente gratis sin descarga ni cuenta. Abre el navegador y empieza a jugar al instante.',
      },
      {
        question: '¿Qué es la Rueda de Palabras diaria?',
        answer:
          'La Rueda de Palabras diaria es un puzzle gratuito nuevo cada día: una rueda de letras donde formas la mayor cantidad de palabras posible, y cada palabra debe incluir la letra central. Todos los jugadores del mundo reciben la misma rueda a medianoche UTC. Sin descargas, sin registro — juega en el navegador y comparte resultados como Wordle.',
      },
      {
        question: '¿Qué es Word Hunt (Caza de Palabras)?',
        answer:
          'Word Hunt es un puzzle diario de búsqueda de palabras: tienes 10 intentos para encontrar la palabra oculta en el tablero. Todos los jugadores del mundo reciben el mismo tablero a medianoche UTC. Comparte resultados emoji como Wordle. Juega gratis en LexiClash — sin descargas, sin registro.',
      },
      {
        question: '¿Cuáles son los mejores juegos de palabras gratuitos en línea en 2026?',
        answer:
          'LexiClash ofrece cinco juegos de palabras gratuitos que se juegan en el navegador sin descargas: Classic (Boggle en tiempo real para 2–50 jugadores), Rueda de Palabras Diaria (puzzle diario compartido), Word Hunt (búsqueda de palabras diaria), Word Forge (construcción rápida de palabras) y Blast (sprint de limpieza de fichas). Sin registro, en cinco idiomas incluyendo español.',
      },
    ],
  },
};
