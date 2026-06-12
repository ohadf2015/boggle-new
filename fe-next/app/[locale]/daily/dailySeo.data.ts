// Pure SEO content data for the Daily Challenge pages.
// Extracted from daily/layout.tsx so it can be unit-tested without pulling in
// server-only deps (loadTranslation, React components). No imports on purpose.

export interface DailySeoFaq {
  question: string;
  answer: string;
}

export interface DailySeoEntry {
  title: string;
  description: string;
  features: string[];
  faq: DailySeoFaq[];
}

export const dailySeoContent: Record<string, DailySeoEntry> = {
  en: {
    title: 'Daily Word Wheel & Word Hunt — Free Daily Word Puzzle | LexiClash',
    description: 'Play today\'s Daily Word Wheel and Word Hunt free — new puzzle every day at midnight UTC. Same board worldwide, no download, no signup. Track streaks, share results, climb the global leaderboard.',
    features: [
      'New puzzle every day at midnight UTC',
      'Same board for all players worldwide - fair competition',
      'Share emoji results with friends, just like Wordle',
      'Word Hunt Survival: find the hidden word in 10 attempts',
      'Word Wheel: find words from a wheel of letters using the center letter',
      'Daily streaks reward consistent play',
      'Global leaderboard resets each day',
    ],
    faq: [
      { question: 'When does the daily puzzle reset?', answer: 'A new puzzle is generated every day at midnight UTC. Your progress resets and a fresh leaderboard begins.' },
      { question: 'Can I share my results?', answer: 'Yes! After completing the puzzle, tap the share button to copy an emoji grid summary. Share it on social media or messaging apps without spoiling the answer.' },
      { question: 'What is Word Hunt Survival?', answer: 'Word Hunt is a daily word search challenge where you have 10 attempts to find the hidden target word on the board. Think of it as Wordle meets Boggle.' },
      { question: 'What is the Daily Word Wheel?', answer: 'The Word Wheel is a daily puzzle where you find words using letters arranged in a wheel. Every word must include the center letter. Longer words earn more points. A new wheel appears every day.' },
    ],
  },
  he: {
    title: 'המילה היומית — פאזל מילים יומי חינם בעברית | LexiClash',
    description: 'המילה היומית חינם — פאזל מילים חדש כל יום בחצות. ציד מילים וגלגל מילים בעברית. ללא הרשמה ולא הורדה. שתפו תוצאות אמוג\'י ואתגרו חברים. שחקו עכשיו ←',
    features: [
      'מילה יומית חדשה כל יום בחצות',
      'אותו לוח לכל השחקנים בעולם — תחרות הוגנת',
      'שתפו תוצאות אמוג\'י עם חברים, בדיוק כמו וורדל',
      'ציד מילים: מצאו את המילה הנסתרת ב-10 ניסיונות',
      'גלגל מילים: הרכיבו מילים מאותיות סביב אות מרכזית',
      'רצף יומי מתגמל משחק עקבי',
      'טבלת מובילים גלובלית מתאפסת כל יום',
    ],
    faq: [
      { question: 'מה זה "המילה היומית"?', answer: 'המילה היומית היא פאזל מילים יומי וחינמי: כל יום נחשף לוח חדש, וכל השחקנים בעולם מקבלים בדיוק את אותה מילת היום לפצח. ב-LexiClash יש שתי גרסאות יומיות — ציד המילים וגלגל המילים — חדשות בכל בוקר.' },
      { question: 'מתי מתאפסת המילה היומית?', answer: 'מילה יומית חדשה נוצרת כל יום בחצות לפי שעון UTC. ההתקדמות מתאפסת וטבלת מובילים חדשה מתחילה, כך שכולם מתחילים מאותה נקודה.' },
      { question: 'איך משחקים את המילה היומית של LexiClash?', answer: 'נכנסים לעמוד האתגר היומי, בוחרים בין ציד המילים לגלגל המילים, ומנסים לפצח את מילת היום. אין צורך בחשבון — פשוט נכנסים ומשחקים ישר מהדפדפן.' },
      { question: 'האם המילה היומית בחינם?', answer: 'כן, לגמרי חינם. אין הרשמה, אין הורדה ואין תשלום — נכנסים מהדפדפן בנייד או במחשב ומתחילים מיד.' },
      { question: 'אפשר לשתף את התוצאות?', answer: 'בהחלט! בסיום הפאזל לוחצים על כפתור השיתוף ומעתיקים סיכום אמוג\'י של הביצועים. אפשר לשתף ברשתות החברתיות ובאפליקציות הודעות בלי לחשוף את הפתרון.' },
      { question: 'מה ההבדל בין ציד המילים לגלגל המילים?', answer: 'בציד המילים מקבלים 10 ניסיונות לאתר מילה נסתרת על הלוח — כמו שילוב של וורדל ובוגל. בגלגל המילים מרכיבים כמה שיותר מילים מאוסף אותיות שמסודר בגלגל, כשכל מילה חייבת לכלול את האות המרכזית. מילים ארוכות שוות יותר נקודות.' },
    ],
  },
  ja: {
    title: 'ワードハント & デイリーワードホイール — 無料ワードパズル | LexiClash',
    description: 'ワードハントとは？ 毎日新しい単語パズル — デイリーワードホイールとワードハントサバイバルを無料でプレイ。ダウンロード不要、登録不要。全プレイヤー同じ問題で世界ランキングに挑戦。',
    features: [
      '毎日UTC午前0時に新パズル（ワードハント & ワードホイール）',
      'ワードハントとは：隠された単語を10回以内に見つける日替わりパズル',
      '世界中の全プレイヤーが同じボード — 公平な競争',
      'ダウンロード・登録不要、ブラウザで即プレイ',
      '絵文字で結果を友達にシェア',
      '連続プレイでストリーク報酬をゲット',
      'グローバルランキングで毎日競争',
    ],
    faq: [
      { question: 'デイリーパズルはいつリセットされますか？', answer: '毎日UTC午前0時に新しいパズルが生成されます。進捗がリセットされ、新しいランキングが始まります。' },
      { question: '結果をシェアできますか？', answer: 'はい！パズル完了後、シェアボタンで絵文字グリッドをコピーできます。答えをネタバレせずにSNSやメッセージアプリでシェアできます。' },
      { question: 'ワードハントサバイバルとは？', answer: 'ワードハントは毎日のワードサーチチャレンジです。ボード上の隠されたターゲットワードを10回以内に見つけてください。WorldeとBoggleが融合したようなゲームです。' },
      { question: 'アプリのダウンロードは必要ですか？', answer: 'いいえ！ブラウザで直接プレイできます。ダウンロード不要、登録不要。スマホ、タブレット、PCで遊べます。' },
    ],
  },
  sv: {
    title: 'Dagligt Ordhjul & Ordjakt — Gratis Dagligt Ordpussel | LexiClash',
    description: 'Spela dagens Ordhjul och Ordjakt gratis — nytt pussel varje dag. Samma braede foer alla, ingen nedladdning, ingen registrering. Taevla paa den globala dagliga topplistan.',
    features: [
      'Nytt pussel varje dag vid midnatt UTC',
      'Samma braede foer alla spelare vaerldsomspaennande',
      'Ordhjul: hitta ord fraan ett bokstavshjul',
      'Ordjakt: hitta det dolda ordet paa 10 foersoek',
      'Dela emoji-resultat precis som Wordle',
      'Daglig strak belonar regelbundet spel',
    ],
    faq: [
      { question: 'Naer aaterstaells det dagliga pusslet?', answer: 'Ett nytt pussel genereras varje dag vid midnatt UTC. Dina framsteg aaterstaells och en ny topplista boerjar.' },
      { question: 'Kan jag dela mina resultat?', answer: 'Ja! Efter pusslet, tryck paa dela-knappen foer att kopiera en emoji-rutnaet. Dela det paa sociala medier utan att avsloeja svaret.' },
      { question: 'Vad aer Ordhjul?', answer: 'Ordhjulet aer ett dagligt pussel daer du hittar ord med bokstaever arrangerade i ett hjul. Varje ord maaste innehaalla mittenbokstaven. Nytt hjul varje dag.' },
    ],
  },
  es: {
    title: 'Rueda de Palabras & Caza de Palabras Diaria — Puzzle Gratis | LexiClash',
    description: 'Juega la Rueda de Palabras y Caza de Palabras diarias gratis — nuevo puzzle cada dia a medianoche UTC. Mismo tablero mundial, sin descargas ni registro. Compite en el ranking global.',
    features: [
      'Nuevo puzzle cada dia a medianoche UTC',
      'Mismo tablero para todos los jugadores del mundo',
      'Rueda de Palabras: encuentra palabras en una rueda de letras',
      'Caza de Palabras: encuentra la palabra oculta en 10 intentos',
      'Comparte resultados emoji como Wordle',
      'Rachas diarias recompensan el juego constante',
    ],
    faq: [
      { question: 'Cuando se reinicia el puzzle diario?', answer: 'Un nuevo puzzle se genera cada dia a medianoche UTC. Tu progreso se reinicia y un ranking fresco comienza.' },
      { question: 'Puedo compartir mis resultados?', answer: 'Si! Despues del puzzle, toca el boton compartir para copiar una cuadricula emoji. Compartela en redes sociales sin revelar la respuesta.' },
      { question: 'Que es la Rueda de Palabras Diaria?', answer: 'La Rueda de Palabras es un puzzle diario donde encuentras palabras usando letras en una rueda. Cada palabra debe incluir la letra central. Nueva rueda cada dia.' },
    ],
  },
};
