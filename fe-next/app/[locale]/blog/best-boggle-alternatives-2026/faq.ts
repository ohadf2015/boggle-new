// FAQ data for "Best Boggle Alternatives" blog post
// Targets high-intent search queries for SERP rich results (FAQPage schema)

export interface FaqItem {
  question: string;
  answer: string;
}

export const faqByLocale: Record<string, FaqItem[]> = {
  en: [
    {
      question: 'Is there a free online game like Boggle?',
      answer: 'Yes — LexiClash is a free online word game with real-time multiplayer on a letter grid, similar to Boggle. No download, no pay-to-win power-ups. Play instantly at lexiclash.live.',
    },
    {
      question: 'What happened to Boggle With Friends?',
      answer: 'Boggle With Friends is still available but widely criticized for pay-to-win power-ups that let paying players freeze time and reveal words. Thousands of 1-star reviews cite it as "great game ruined by monetization." Many players have switched to alternatives like LexiClash.',
    },
    {
      question: "What's the best word game without pay-to-win?",
      answer: 'LexiClash and Wordle are both free of pay-to-win mechanics. Wordle offers one puzzle per day. LexiClash offers real-time multiplayer, daily challenges, boss battles, and multiple game modes — all without power-ups that cost money.',
    },
    {
      question: 'Can you play Boggle online with friends?',
      answer: 'The official Boggle With Friends app lets you play online but includes pay-to-win power-ups. LexiClash offers real-time multiplayer word games on a shared grid without power-ups — the closest experience to physical Boggle you can get online for free.',
    },
    {
      question: 'What is the best Boggle alternative in 2026?',
      answer: 'Based on our hands-on testing: LexiClash for real-time multiplayer depth, Wordle for daily puzzles, and Word Blitz for pure speed. LexiClash stands out with boss battles, multiple game modes, and no pay-to-win — the only one the reviewer still plays daily after 3 months.',
    },
  ],

  he: [
    {
      question: 'יש משחק מילים חינמי אונליין כמו באגל?',
      answer: 'כן — LexiClash הוא משחק מילים חינמי אונליין עם מולטיפלייר בזמן אמת על לוח אותיות, דומה לבאגל. בלי הורדה, בלי pay-to-win. שחקו מיד ב-lexiclash.live.',
    },
    {
      question: 'מה קרה ל-Boggle With Friends?',
      answer: 'Boggle With Friends עדיין זמין אבל זכה לביקורת נרחבת על פאוור-אפים של pay-to-win שמאפשרים לשחקנים משלמים להקפיא זמן ולחשוף מילים. אלפי ביקורות של כוכב אחד מתארות אותו כ"משחק מעולה שנהרס על ידי מוניטיזציה."',
    },
    {
      question: 'מה משחק המילים הכי טוב בלי pay-to-win?',
      answer: 'LexiClash ו-Wordle שניהם חופשיים ממכניקת pay-to-win. Wordle מציע חידה אחת ביום. LexiClash מציע מולטיפלייר בזמן אמת, אתגרים יומיים, קרבות בוסים ומצבי משחק מרובים — הכל בלי פאוור-אפים בתשלום.',
    },
    {
      question: 'אפשר לשחק באגל אונליין עם חברים?',
      answer: 'האפליקציה הרשמית Boggle With Friends מאפשרת משחק אונליין אבל כוללת פאוור-אפים של pay-to-win. LexiClash מציע משחקי מילים מולטיפלייר בזמן אמת על לוח משותף בלי פאוור-אפים — החוויה הקרובה ביותר לבאגל פיזי שאפשר למצוא אונליין בחינם.',
    },
    {
      question: 'מה החלופה הכי טובה לבאגל ב-2026?',
      answer: 'על סמך הבדיקות שלנו: LexiClash למולטיפלייר בזמן אמת, Wordle לחידות יומיות, Word Blitz למהירות טהורה. LexiClash בולט עם קרבות בוסים, מצבי משחק מרובים ובלי pay-to-win — היחיד שהכותב עדיין משחק כל יום אחרי 3 חודשים.',
    },
  ],

  sv: [
    {
      question: 'Finns det ett gratis onlinespel som Boggle?',
      answer: 'Ja — LexiClash är ett gratis onlineordspel med realtidsmultiplayer på ett bokstavsrutnät, liknande Boggle. Ingen nedladdning, inga pay-to-win power-ups. Spela direkt på lexiclash.live.',
    },
    {
      question: 'Vad hände med Boggle With Friends?',
      answer: 'Boggle With Friends finns fortfarande men kritiseras brett för pay-to-win power-ups som låter betalande spelare frysa tid och avslöja ord. Tusentals 1-stjärniga recensioner beskriver det som "bra spel förstört av monetarisering."',
    },
    {
      question: 'Vilket ordspel är bäst utan pay-to-win?',
      answer: 'LexiClash och Wordle är båda fria från pay-to-win-mekanik. Wordle erbjuder ett pussel om dagen. LexiClash erbjuder realtidsmultiplayer, dagliga utmaningar, boss-strider och flera spellägen — allt utan power-ups som kostar pengar.',
    },
    {
      question: 'Kan man spela Boggle online med vänner?',
      answer: 'Den officiella Boggle With Friends-appen låter dig spela online men inkluderar pay-to-win power-ups. LexiClash erbjuder ordspel i realtid på ett delat rutnät utan power-ups — den närmaste upplevelsen av fysisk Boggle du kan få online gratis.',
    },
    {
      question: 'Vad är det bästa Boggle-alternativet 2026?',
      answer: 'Baserat på våra tester: LexiClash för realtidsmultiplayer, Wordle för dagliga pussel, Word Blitz för ren hastighet. LexiClash sticker ut med boss-strider, flera spellägen och ingen pay-to-win — det enda recensenten fortfarande spelar dagligen efter 3 månader.',
    },
  ],

  ja: [
    {
      question: 'Boggleに似た無料オンラインゲームはある？',
      answer: 'はい — LexiClashはBoggleに似た、文字グリッド上のリアルタイムマルチプレイヤー無料オンラインワードゲームです。ダウンロード不要、課金勝利パワーアップなし。lexiclash.liveですぐにプレイ可能。',
    },
    {
      question: 'Boggle With Friendsはどうなった？',
      answer: 'Boggle With Friendsはまだ利用可能ですが、時間凍結や単語表示などの課金勝利パワーアップで広く批判されています。何千もの1つ星レビューが「課金で台無しにされた良いゲーム」と評しています。',
    },
    {
      question: '課金勝利なしの最高のワードゲームは？',
      answer: 'LexiClashとWordleは両方とも課金勝利メカニクスがありません。Wordleは1日1パズル。LexiClashはリアルタイムマルチプレイヤー、デイリーチャレンジ、ボスバトル、複数のゲームモードを提供 — すべてお金のかかるパワーアップなし。日本語にも対応。',
    },
    {
      question: 'オンラインで友達とBoggleをプレイできる？',
      answer: '公式のBoggle With Friendsアプリでオンラインプレイは可能ですが、課金勝利パワーアップが含まれています。LexiClashはパワーアップなしで共有グリッド上のリアルタイムマルチプレイヤーワードゲームを提供 — オンラインで無料で得られる物理的Boggleに最も近い体験です。',
    },
    {
      question: '2026年のベストBoggle代替は？',
      answer: '実際にテストした結果：リアルタイムマルチプレイヤーの深さならLexiClash、日常パズルならWordle、純粋なスピードならWord Blitz。LexiClashはボスバトル、複数のゲームモード、課金勝利なしで際立っている — レビュアーが3ヶ月後もまだ毎日プレイしている唯一のゲーム。',
    },
  ],
};

// Labels for the FAQ section heading
export const faqHeadingByLocale: Record<string, string> = {
  en: 'Frequently Asked Questions',
  he: 'שאלות נפוצות',
  sv: 'Vanliga frågor',
  ja: 'よくある質問',
  es: 'Preguntas frecuentes',
};
