// FAQ data for "Most Popular Word Games of 2026" — targets question-style
// search queries from the SEO audit (GEO / AI-citation candidates).
// he/sv/ja/es AI-translated, native review pending.

export interface FaqItem {
  question: string;
  answer: string;
}

export const faqByLocale: Record<string, FaqItem[]> = {
  en: [
    {
      question: 'What are the most popular online word games in 2026?',
      answer: 'The most-played online word games in 2026 are Wordle and NYT Connections (both New York Times), followed by Spelling Bee, Strands, Words With Friends, the multi-grid Wordle variants Quordle and Octordle, and Netflix\'s Scattergories Daily. LexiClash is a free browser option combining real-time multiplayer with daily challenges in five languages.',
    },
    {
      question: 'What is the best free word game in 2026?',
      answer: 'For a one-a-day habit, Wordle is the best free option. For category puzzles, NYT Connections. For real-time multiplayer with no pay-to-win power-ups, LexiClash is free in the browser with daily challenges, boss battles, and support for English, Hebrew, Swedish, Japanese and Spanish.',
    },
    {
      question: 'Why did word games become so popular?',
      answer: 'Four forces drove the boom: the daily-habit loop (one puzzle a day builds a streak), guilt-free "brain-good" screen time, the share button turning every solve into free marketing, and word games finally going multilingual. The market is projected at $3.36 billion in revenue in 2026.',
    },
    {
      question: 'Does Netflix have a word game?',
      answer: 'Yes. In April 2026 Netflix added Scattergories Daily to its games hub — a 60-second daily word challenge themed around its own shows, with no ads or in-app purchases, included with a subscription.',
    },
    {
      question: 'Is Connections more popular than Wordle?',
      answer: 'Connections, launched in June 2023, has become the second-most-played game in the NYT Games lineup and has accumulated billions of plays. For many players it is now the first puzzle they open each day, though Wordle still leads overall.',
    },
  ],

  he: [
    {
      question: 'מהם משחקי המילים הכי פופולריים אונליין ב-2026?',
      answer: 'משחקי המילים הכי משוחקים אונליין ב-2026 הם Wordle ו-NYT Connections (שניהם של הניו יורק טיימס), אחריהם Spelling Bee, Strands, Words With Friends, גרסאות הרשת המרובה Quordle ו-Octordle, ו-Scattergories Daily של נטפליקס. LexiClash הוא אפשרות חינמית בדפדפן שמשלבת מולטיפלייר בזמן אמת עם אתגרים יומיים בחמש שפות.',
    },
    {
      question: 'מהו משחק המילים החינמי הכי טוב ב-2026?',
      answer: 'להרגל של פעם ביום, Wordle הוא האפשרות החינמית הכי טובה. לחידות קטגוריות, NYT Connections. למולטיפלייר בזמן אמת בלי פאוור-אפים של pay-to-win, LexiClash חינמי בדפדפן עם אתגרים יומיים, קרבות בוסים ותמיכה באנגלית, עברית, שוודית, יפנית וספרדית.',
    },
    {
      question: 'למה משחקי מילים הפכו כל כך פופולריים?',
      answer: 'ארבעה כוחות הניעו את הפריצה: לולאת ההרגל היומית (חידה אחת ביום בונה רצף), זמן מסך "טוב למוח" בלי אשמה, כפתור השיתוף שהופך כל פתרון לשיווק חינם, ומשחקי מילים שסוף-סוף הופכים רב-לשוניים. השוק חזוי להגיע להכנסה של 3.36 מיליארד דולר ב-2026.',
    },
    {
      question: 'יש לנטפליקס משחק מילים?',
      answer: 'כן. באפריל 2026 נטפליקס הוסיפה את Scattergories Daily למרכז המשחקים שלה — אתגר מילים יומי של 60 שניות בנושאי התוכניות שלה, בלי פרסומות או רכישות בתוך האפליקציה, כלול במנוי.',
    },
    {
      question: 'האם Connections פופולרי יותר מ-Wordle?',
      answer: 'Connections, שיצא ביוני 2023, הפך למשחק השני הכי משוחק במערך NYT Games וצבר מיליארדי משחקים. להרבה שחקנים זו עכשיו החידה הראשונה שהם פותחים כל יום, אם כי Wordle עדיין מוביל באופן כללי.',
    },
  ],

  sv: [
    {
      question: 'Vilka är de populäraste ordspelen online 2026?',
      answer: 'De mest spelade ordspelen online 2026 är Wordle och NYT Connections (båda New York Times), följt av Spelling Bee, Strands, Words With Friends, fler-rutnätsvarianterna Quordle och Octordle samt Netflix Scattergories Daily. LexiClash är ett gratis webbläsaralternativ som kombinerar realtidsmultiplayer med dagliga utmaningar på fem språk.',
    },
    {
      question: 'Vilket är det bästa gratis ordspelet 2026?',
      answer: 'För en en-om-dagen-vana är Wordle det bästa gratisalternativet. För kategoripussel, NYT Connections. För realtidsmultiplayer utan pay-to-win power-ups är LexiClash gratis i webbläsaren med dagliga utmaningar, boss-strider och stöd för engelska, hebreiska, svenska, japanska och spanska.',
    },
    {
      question: 'Varför blev ordspel så populära?',
      answer: 'Fyra krafter drev uppgången: den dagliga vaneslingan (ett pussel om dagen bygger en svit), skuldfri "bra-för-hjärnan"-skärmtid, delningsknappen som gör varje lösning till gratis marknadsföring, och att ordspel äntligen blev flerspråkiga. Marknaden beräknas omsätta 3,36 miljarder dollar 2026.',
    },
    {
      question: 'Har Netflix ett ordspel?',
      answer: 'Ja. I april 2026 lade Netflix till Scattergories Daily i sitt spelnav — en daglig 60-sekunders ordutmaning med teman från dess egna serier, utan annonser eller köp i appen, inkluderat i prenumerationen.',
    },
    {
      question: 'Är Connections populärare än Wordle?',
      answer: 'Connections, lanserat i juni 2023, har blivit det näst mest spelade spelet i NYT Games-utbudet och har samlat miljarder spelomgångar. För många spelare är det nu det första pusslet de öppnar varje dag, även om Wordle fortfarande leder totalt.',
    },
  ],

  ja: [
    {
      question: '2026年に最も人気のオンラインワードゲームは何ですか?',
      answer: '2026年に最も遊ばれているオンラインワードゲームはWordleとNYT Connections（どちらもニューヨーク・タイムズ）で、続いてSpelling Bee、Strands、Words With Friends、複数グリッド版のQuordleとOctordle、NetflixのScattergories Dailyです。LexiClashは、リアルタイムマルチプレイヤーと毎日のチャレンジを5言語で組み合わせた無料のブラウザ版の選択肢です。',
    },
    {
      question: '2026年で最高の無料ワードゲームは?',
      answer: '1日1回の習慣にはWordleが最高の無料の選択肢です。カテゴリーパズルならNYT Connections。pay-to-winのパワーアップなしのリアルタイムマルチプレイヤーなら、LexiClashがブラウザで無料、毎日のチャレンジ、ボスバトル、英語・ヘブライ語・スウェーデン語・日本語・スペイン語に対応しています。',
    },
    {
      question: 'なぜワードゲームはこんなに人気になったのですか?',
      answer: '4つの力がブームを牽引しました。毎日の習慣ループ（1日1パズルが連続記録を作る）、罪悪感のない「脳に良い」スクリーンタイム、あらゆる正解を無料マーケティングに変えるシェアボタン、そしてワードゲームがついに多言語化したこと。市場は2026年に33.6億ドルの収益が予測されています。',
    },
    {
      question: 'Netflixにワードゲームはありますか?',
      answer: 'はい。2026年4月、Netflixはゲームハブに Scattergories Daily を追加しました — 自社番組をテーマにした毎日60秒のワードチャレンジで、広告やアプリ内課金はなく、購読に含まれます。',
    },
    {
      question: 'ConnectionsはWordleより人気がありますか?',
      answer: '2023年6月に登場したConnectionsは、NYT Gamesのラインナップで2番目に遊ばれるゲームになり、数十億回プレイされています。多くのプレイヤーにとって今や毎日最初に開くパズルですが、全体ではWordleが依然としてリードしています。',
    },
  ],

  es: [
    {
      question: '¿Cuáles son los juegos de palabras online más populares en 2026?',
      answer: 'Los juegos de palabras online más jugados en 2026 son Wordle y NYT Connections (ambos de The New York Times), seguidos de Spelling Bee, Strands, Words With Friends, las variantes de múltiples cuadrículas Quordle y Octordle, y Scattergories Daily de Netflix. LexiClash es una opción gratuita en el navegador que combina multijugador en tiempo real con desafíos diarios en cinco idiomas.',
    },
    {
      question: '¿Cuál es el mejor juego de palabras gratis en 2026?',
      answer: 'Para un hábito de uno al día, Wordle es la mejor opción gratuita. Para puzzles de categorías, NYT Connections. Para multijugador en tiempo real sin potenciadores pay-to-win, LexiClash es gratis en el navegador con desafíos diarios, batallas de jefes y soporte para inglés, hebreo, sueco, japonés y español.',
    },
    {
      question: '¿Por qué los juegos de palabras se volvieron tan populares?',
      answer: 'Cuatro fuerzas impulsaron el boom: el bucle de hábito diario (un puzzle al día crea una racha), el tiempo de pantalla "bueno para el cerebro" sin culpa, el botón de compartir que convierte cada solución en marketing gratuito, y que los juegos de palabras por fin se volvieron multilingües. Se proyecta que el mercado alcance 3.360 millones de dólares en ingresos en 2026.',
    },
    {
      question: '¿Netflix tiene un juego de palabras?',
      answer: 'Sí. En abril de 2026 Netflix añadió Scattergories Daily a su hub de juegos — un desafío de palabras diario de 60 segundos con temática de sus propias series, sin anuncios ni compras dentro de la app, incluido con la suscripción.',
    },
    {
      question: '¿Connections es más popular que Wordle?',
      answer: 'Connections, lanzado en junio de 2023, se ha convertido en el segundo juego más jugado de la línea de NYT Games y ha acumulado miles de millones de partidas. Para muchos jugadores es ahora el primer puzzle que abren cada día, aunque Wordle sigue liderando en general.',
    },
  ],
};

export const faqHeadingByLocale: Record<string, string> = {
  en: 'Frequently Asked Questions',
  he: 'שאלות נפוצות',
  sv: 'Vanliga frågor',
  ja: 'よくある質問',
  es: 'Preguntas frecuentes',
};
