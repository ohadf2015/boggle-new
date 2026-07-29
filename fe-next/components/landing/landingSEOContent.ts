/* ── Static SEO content for the landing page bottom section ──
 *
 * This file uses the `contentByLocale` pattern so that all text is
 * available at import-time and included in the server-rendered HTML.
 * Google's crawler can index it — unlike `t()` from LanguageContext
 * which only resolves on the client.
 */

export interface LandingSEOContent {
  whatIsTitle: string;
  whatIsContent: string;
  whatIsShort: string;
  featuresTitle: string;
  gameModes: {
    title: string;
    tag: string;
    description: string;
  }[];
  howToPlayTitle: string;
  steps: string[];
  highlights: string[];
  whoCanPlayTitle: string;
  whoCanPlayCards: { label: string; detail: string }[];
  gameModesTitle: string;
  gameModesDetails: { title: string; content: string }[];
  educationTitle: string;
  educationContent: string;
  educationStats: { value: string; label: string }[];
  communityStats: { value: string; label: string }[];
  faqTitle: string;
  faq: { question: string; answer: string }[];
  communityTitle: string;
  communityContent: string;
}

const en: LandingSEOContent = {
  whatIsTitle: 'What is LexiClash?',
  whatIsContent:
    'LexiClash is a free, fast-paced multiplayer word game you can play right in your browser. Compete with friends in real-time word battles on a shared letter grid — find words, build combos, and climb the leaderboard. It\'s like Boggle meets Wordle, but multiplayer. No downloads, no sign-ups required. Available in English, Hebrew, Swedish, Japanese, and Spanish.',
  whatIsShort:
    'Free multiplayer word battles in your browser. Find words, build combos, crush your friends. No downloads, no signup.',
  featuresTitle: 'Why Players Love LexiClash',
  gameModes: [
    {
      title: 'Real-Time Multiplayer',
      tag: '2-20 players',
      description:
        'Compete head-to-head with 2-20 players simultaneously. Create a room, share the code, and play instantly.',
    },
    {
      title: 'Daily Challenges',
      tag: 'New puzzle daily',
      description:
        'Same puzzle for everyone worldwide, every day. Track your streak and share emoji results — just like Wordle.',
    },
    {
      title: 'Adventure Mode',
      tag: '100 levels',
      description:
        '100 levels across 10 themed worlds. Special tiles, boss battles, and power-ups keep every round fresh.',
    },
    {
      title: 'Blast Mode',
      tag: 'Chain reactions',
      description:
        'Clear tiles in explosive chain reactions. Build combos, trigger cascades, and race against the clock.',
    },
    {
      title: 'Community Boards',
      tag: 'Player-made puzzles',
      description:
        'Design custom letter grids with your own seed words. Publish them for others to play, rate, and compete on.',
    },
  ],
  howToPlayTitle: 'How to Play',
  steps: [
    'Create or join a game room',
    'Swipe adjacent letters to form words',
    'Build combos for bonus points',
    'Score the most points to win!',
  ],
  highlights: [
    'Any device, any browser',
    'Ages 6+',
    'Used in classrooms',
    'No signup needed',
  ],
  whoCanPlayTitle: 'Who Can Play?',
  whoCanPlayCards: [
    { label: 'Any Device', detail: 'Phones, tablets, laptops, desktops — any modern browser, no app download needed.' },
    { label: 'Ages 6+', detail: 'Child-safety features built in. COPPA compliant with non-personalized ads for younger players.' },
    { label: 'Classrooms', detail: 'Teachers run multiplayer word battles as vocabulary drills. Used in schools across three continents.' },
    { label: 'Friend Groups', detail: 'Host a party game with up to 20 players. Share a room code and compete in real-time.' },
  ],
  gameModesTitle: 'Game Modes Explained',
  gameModesDetails: [
    {
      title: 'Multiplayer Rooms',
      content:
        'Create a private room and share the code with up to 20 friends. Everyone sees the same letter grid and races to find words before time runs out. The player with the highest score wins. Perfect for parties, classrooms, and remote team-building.',
    },
    {
      title: 'Single Player vs. Bots',
      content:
        'Practice your word-finding skills against AI opponents of varying difficulty. Set personal records, earn achievements, and sharpen your strategy without the pressure of live competition.',
    },
    {
      title: 'Daily Challenge',
      content:
        'A fresh puzzle every day, identical for all players worldwide. Complete it to maintain your streak and compare your score with the global community. Share your results with emoji grids, just like Wordle.',
    },
    {
      title: 'Adventure Mode',
      content:
        'Journey through 10 themed worlds with 100 levels of increasing difficulty. Encounter special tile types like ice, fire, bombs, and rainbow tiles. Defeat bosses using word power and unlock new worlds as you progress.',
    },
  ],
  educationTitle: 'Built for Learning',
  educationContent:
    'Word games are one of the most effective ways to build vocabulary and improve spelling. Research published in AIMS Neuroscience shows that word puzzles activate multiple brain regions simultaneously — including areas responsible for language processing, working memory, and executive function. LexiClash takes this further by offering gameplay in five languages, making it a practical tool for language learners. Teachers use LexiClash in classrooms across three continents to make vocabulary drills engaging. The multiplayer format creates healthy competition that motivates students to expand their word knowledge naturally.',
  educationStats: [
    { value: '5', label: 'Languages' },
    { value: '3', label: 'Continents' },
    { value: '100+', label: 'Levels' },
  ],
  faqTitle: 'Frequently Asked Questions',
  faq: [
    {
      question: 'Is LexiClash really free?',
      answer:
        'Yes, completely free. No hidden paywalls, no premium subscriptions. We sustain the game through non-intrusive advertising that respects your privacy.',
    },
    {
      question: 'Do I need to create an account?',
      answer:
        'No. You can play as a guest instantly. Creating an account (via Google or Discord) unlocks features like leaderboard rankings, achievement tracking, and progress saving across devices.',
    },
    {
      question: 'What languages are supported?',
      answer:
        'LexiClash supports English, Hebrew, Swedish, Japanese, and Spanish. Each language has its own curated dictionary, daily challenges, and leaderboards. You can switch languages anytime from the settings menu.',
    },
    {
      question: 'Can I play on my phone?',
      answer:
        'Absolutely. LexiClash is fully responsive and works on any modern mobile browser. Swipe letters to form words — the touch controls are designed specifically for mobile play.',
    },
    {
      question: 'Is it safe for children?',
      answer:
        'Yes. LexiClash is designed for players ages 6 and up. We comply with COPPA regulations, serve only non-personalized ads, and do not track children\'s browsing behavior.',
    },
    {
      question: 'Can I create my own board?',
      answer:
        'Yes! Use the Community Board Builder to design custom letter grids with your own seed words. Publish them for others to play, rate, and compete on. Top boards get featured on the home page.',
    },
  ],
  communityStats: [
    { value: '40+', label: 'Countries' },
    { value: '5', label: 'Languages' },
    { value: '∞', label: 'Words to Find' },
  ],
  communityTitle: 'Join Thousands of Word Game Enthusiasts',
  communityContent:
    'LexiClash players span over 40 countries and five languages. Join the community to compete on global leaderboards, share daily challenge results, and discover new word strategies. Follow us on Instagram @lexi.clash for tips, updates, and community highlights.',
};

const he: LandingSEOContent = {
  whatIsTitle: 'מה זה LexiClash?',
  whatIsContent:
    'LexiClash הוא משחק מילים מרובה משתתפים, חינמי ומהיר, שניתן לשחק ישירות בדפדפן. התחרו עם חברים בקרב מילים בזמן אמת על לוח אותיות משותף — מצאו מילים, בנו קומבואים וטפסו בטבלת הדירוג. כמו Boggle פגש Wordle, אבל מרובה משתתפים. ללא הורדות, ללא הרשמה. זמין בעברית, אנגלית, שוודית, יפנית וספרדית.',
  whatIsShort:
    'קרבות מילים מרובי משתתפים, חינמיים, ישר בדפדפן. מצאו מילים, בנו קומבואים, נצחו את החברים. ללא הורדות, ללא הרשמה.',
  featuresTitle: 'למה שחקנים אוהבים את LexiClash',
  gameModes: [
    {
      title: 'ריבוי משתתפים בזמן אמת',
      tag: '2-20 שחקנים',
      description:
        'התחרו פנים אל פנים עם 2-20 שחקנים בו-זמנית. צרו חדר, שתפו את הקוד ושחקו מיד.',
    },
    {
      title: 'אתגרים יומיים',
      tag: 'חידה חדשה כל יום',
      description:
        'אותה חידה לכולם ברחבי העולם, כל יום. עקבו אחרי הרצף שלכם ושתפו תוצאות אמוג\'י — בדיוק כמו Wordle.',
    },
    {
      title: 'מצב הרפתקה',
      tag: '100 שלבים',
      description:
        '100 שלבים על פני 10 עולמות בעלי תמה. אריחים מיוחדים, קרבות בוסים ואפגרייד שומרים על כל סיבוב טרי.',
    },
    {
      title: 'מצב בלאסט',
      tag: 'תגובות שרשרת',
      description:
        'פנו אריחים בתגובות שרשרת נפיצות. בנו קומבואים, הפעילו מפולות ורוצו נגד השעון.',
    },
    {
      title: 'לוחות קהילה',
      tag: 'חידות שנוצרו על ידי שחקנים',
      description:
        'עצבו רשתות אותיות מותאמות אישית עם מילות זרע משלכם. פרסמו אותן כדי שאחרים ישחקו, ידרגו ויתחרו.',
    },
  ],
  howToPlayTitle: 'איך משחקים',
  steps: [
    'צרו חדר משחק או הצטרפו אליו',
    'החליקו אותיות סמוכות כדי ליצור מילים',
    'בנו קומבואים לנקודות בונוס',
    'צברו הכי הרבה נקודות כדי לנצח!',
  ],
  highlights: ['כל מכשיר, כל דפדפן', 'גילאי 6+', 'בשימוש בכיתות', 'ללא הרשמה'],
  whoCanPlayTitle: 'מי יכול לשחק?',
  whoCanPlayCards: [
    {
      label: 'כל מכשיר',
      detail: 'טלפונים, טאבלטים, מחשבים ניידים ושולחניים — כל דפדפן מודרני, ללא צורך בהורדת אפליקציה.',
    },
    {
      label: 'גילאי 6+',
      detail: 'תכונות בטיחות לילדים מובנות. תואם COPPA עם פרסומות לא-מותאמות אישית לשחקנים צעירים.',
    },
    {
      label: 'כיתות לימוד',
      detail: 'מורים מנהלים קרבות מילים מרובי משתתפים כתרגילי אוצר מילים. בשימוש בבתי ספר בשלושה יבשות.',
    },
    {
      label: 'קבוצות חברים',
      detail: 'ארגנו משחק מסיבה עם עד 20 שחקנים. שתפו קוד חדר והתחרו בזמן אמת.',
    },
  ],
  gameModesTitle: 'מצבי המשחק בהרחבה',
  gameModesDetails: [
    {
      title: 'חדרי ריבוי משתתפים',
      content:
        'צרו חדר פרטי ושתפו את הקוד עם עד 20 חברים. כולם רואים את אותה רשת אותיות ומתחרים למצוא מילים לפני שהזמן נגמר. השחקן עם הניקוד הגבוה ביותר מנצח. מושלם למסיבות, כיתות ובנייה משותפת מרחוק.',
    },
    {
      title: 'שחקן יחיד נגד בוטים',
      content:
        'תרגלו את כישורי מציאת המילים שלכם נגד יריבי AI ברמות קושי שונות. שברו שיאים אישיים, הרוויחו הישגים וחדדו את האסטרטגיה ללא לחץ של תחרות חיה.',
    },
    {
      title: 'אתגר יומי',
      content:
        'חידה טרייה כל יום, זהה לכל השחקנים ברחבי העולם. השלימו אותה כדי לשמור על הרצף שלכם והשוו את הניקוד עם הקהילה הגלובלית. שתפו תוצאות עם רשתות אמוג\'י, בדיוק כמו Wordle.',
    },
    {
      title: 'מצב הרפתקה',
      content:
        'עברו דרך 10 עולמות בעלי תמה עם 100 שלבים ברמת קושי גוברת. פגשו סוגי אריחים מיוחדים כמו קרח, אש, פצצות ואריחי קשת. נצחו בוסים בעזרת כוח המילים ופתחו עולמות חדשים עם ההתקדמות.',
    },
  ],
  educationTitle: 'בנוי ללמידה',
  educationContent:
    'משחקי מילים הם אחד הכלים היעילים ביותר לבניית אוצר מילים ושיפור כישורי איות. מחקר שפורסם ב-AIMS Neuroscience מראה שחידות מילים מפעילות אזורי מוח מרובים בו-זמנית — כולל אזורים האחראים לעיבוד שפה, זיכרון עבודה ותפקוד ניהולי. LexiClash הולך צעד רחוק יותר בכך שמציע משחק בחמש שפות, מה שהופך אותו לכלי מעשי ללומדי שפות. מורים משתמשים ב-LexiClash בכיתות בשלושה יבשות כדי להפוך תרגילי אוצר מילים למרתקים. פורמט ריבוי המשתתפים יוצר תחרות בריאה שמניעה תלמידים להרחיב את ידע המילים שלהם באופן טבעי.',
  educationStats: [
    { value: '5', label: 'שפות' },
    { value: '3', label: 'יבשות' },
    { value: '100+', label: 'שלבים' },
  ],
  faqTitle: 'שאלות נפוצות',
  faq: [
    {
      question: 'האם LexiClash באמת חינמי?',
      answer:
        'כן, לגמרי חינמי. אין חסמי תשלום נסתרים, אין מנויים פרימיום. אנחנו מממנים את המשחק דרך פרסום לא-פולשני שמכבד את פרטיותכם.',
    },
    {
      question: 'האם אני צריך/ה ליצור חשבון?',
      answer:
        'לא. ניתן לשחק כאורח מיד. יצירת חשבון (דרך Google או Discord) מפתחת תכונות כמו דירוגי לוח תוצאות, מעקב הישגים ושמירת התקדמות במכשירים שונים.',
    },
    {
      question: 'אילו שפות נתמכות?',
      answer:
        'LexiClash תומך בעברית, אנגלית, שוודית, יפנית וספרדית. לכל שפה יש מילון ייחודי, אתגרים יומיים ולוחות דירוג משלה. ניתן לעבור בין שפות בכל עת מתפריט ההגדרות.',
    },
    {
      question: 'האם ניתן לשחק בטלפון?',
      answer:
        'בהחלט. LexiClash מגיב לחלוטין ועובד בכל דפדפן נייד מודרני. החליקו אותיות ליצירת מילים — בקרות המגע תוכננו במיוחד למשחק על מסך מגע.',
    },
    {
      question: 'האם זה בטוח לילדים?',
      answer:
        'כן. LexiClash מתוכנן לשחקנים מגיל 6 ומעלה. אנו עומדים בתקנות COPPA, מציגים רק פרסומות לא-מותאמות אישית ואינו עוקב אחרי התנהגות הגלישה של ילדים.',
    },
    {
      question: 'האם ניתן ליצור לוח משלי?',
      answer:
        'כן! השתמשו בבונה הלוחות הקהילתי כדי לעצב רשתות אותיות מותאמות אישית עם מילות זרע משלכם. פרסמו אותן כדי שאחרים ישחקו, ידרגו ויתחרו. הלוחות הפופולריים יוצגו בדף הבית.',
    },
  ],
  communityStats: [
    { value: '40+', label: 'מדינות' },
    { value: '5', label: 'שפות' },
    { value: '∞', label: 'מילים למצוא' },
  ],
  communityTitle: 'הצטרפו לאלפי חובבי משחקי מילים',
  communityContent:
    'שחקני LexiClash פרוסים על פני יותר מ-40 מדינות וחמש שפות. הצטרפו לקהילה כדי להתחרות בלוחות דירוג גלובליים, לשתף תוצאות אתגרים יומיים ולגלות אסטרטגיות מילים חדשות. עקבו אחרינו באינסטגרם @lexi.clash לטיפים, עדכונים ואירועי קהילה.',
};

const sv: LandingSEOContent = {
  whatIsTitle: 'Vad är LexiClash?',
  whatIsContent:
    'LexiClash är ett gratis, fartfyllt multiplayer-ordspel som du spelar direkt i webbläsaren. Tävla mot vänner i realtids-ordstrider på ett gemensamt bokstavsnät — hitta ord, bygg kombos och klättra på topplistan. Det är som Boggle möter Wordle, fast multiplayer. Inga nedladdningar, ingen registrering krävs. Tillgängligt på svenska, engelska, hebreiska, japanska och spanska.',
  whatIsShort:
    'Gratis multiplayer-ordstrider i webbläsaren. Hitta ord, bygg kombos, krossa dina vänner. Inga nedladdningar, ingen registrering.',
  featuresTitle: 'Varför spelare älskar LexiClash',
  gameModes: [
    {
      title: 'Multiplayer i realtid',
      tag: '2-20 spelare',
      description:
        'Tävla mot 2-20 spelare samtidigt. Skapa ett rum, dela koden och spela direkt.',
    },
    {
      title: 'Dagliga utmaningar',
      tag: 'Nytt pussel varje dag',
      description:
        'Samma pussel för alla världen över, varje dag. Följ din svit och dela emojisvar — precis som Wordle.',
    },
    {
      title: 'Äventyrsläge',
      tag: '100 nivåer',
      description:
        '100 nivåer över 10 tematiska världar. Specialbrickor, bosstrider och power-ups håller varje runda fräsch.',
    },
    {
      title: 'Blastläge',
      tag: 'Kedjeexplosioner',
      description:
        'Rensa brickor i explosiva kedjereaktioner. Bygg kombos, utlös kaskader och täv mot klockan.',
    },
    {
      title: 'Gemenskapsbräden',
      tag: 'Spelargjorda pussel',
      description:
        'Designa egna bokstavsnät med dina egna startsord. Publicera dem för andra att spela, betygsätta och tävla på.',
    },
  ],
  howToPlayTitle: 'Så spelar du',
  steps: [
    'Skapa eller gå med i ett spelrum',
    'Svep angränsande bokstäver för att bilda ord',
    'Bygg kombos för bonuspoäng',
    'Få flest poäng för att vinna!',
  ],
  highlights: ['Vilken enhet som helst, vilken webbläsare som helst', 'Från 6 år', 'Används i klassrum', 'Ingen registrering krävs'],
  whoCanPlayTitle: 'Vem kan spela?',
  whoCanPlayCards: [
    {
      label: 'Vilken enhet som helst',
      detail: 'Telefoner, surfplattor, bärbara och stationära datorer — alla moderna webbläsare, ingen app-nedladdning behövs.',
    },
    {
      label: 'Från 6 år',
      detail: 'Inbyggda barnfunktioner. COPPA-kompatibelt med icke-personaliserade annonser för yngre spelare.',
    },
    {
      label: 'Klassrum',
      detail: 'Lärare kör multiplayer-ordstrider som ordförrådsövningar. Används i skolor på tre kontinenter.',
    },
    {
      label: 'Kompisgäng',
      detail: 'Håll ett sällskapsspel med upp till 20 spelare. Dela en rumskod och tävla i realtid.',
    },
  ],
  gameModesTitle: 'Spellägena förklarade',
  gameModesDetails: [
    {
      title: 'Multiplayerrum',
      content:
        'Skapa ett privat rum och dela koden med upp till 20 vänner. Alla ser samma bokstavsnät och tävlar om att hitta ord innan tiden tar slut. Spelaren med högst poäng vinner. Perfekt för fester, klassrum och teambuilding på distans.',
    },
    {
      title: 'Enspelarläge mot bottar',
      content:
        'Öva dina ordfinnarfärdigheter mot AI-motståndare på olika svårighetsnivåer. Sätt personliga rekord, tjäna prestationer och skärp din strategi utan pressen av livstävling.',
    },
    {
      title: 'Daglig utmaning',
      content:
        'Ett nytt pussel varje dag, identiskt för alla spelare världen över. Slutför det för att hålla din svit och jämför din poäng med den globala gemenskapen. Dela dina resultat med emojinät, precis som Wordle.',
    },
    {
      title: 'Äventyrsläge',
      content:
        'Res genom 10 tematiska världar med 100 nivåer av ökande svårighet. Möt speciella bricktyper som is, eld, bomber och regnbågsbrickor. Besegra bossar med ordkraft och lås upp nya världar allt eftersom du avancerar.',
    },
  ],
  educationTitle: 'Byggt för lärande',
  educationContent:
    'Ordspel är ett av de mest effektiva sätten att bygga ordförråd och förbättra stavning. Forskning publicerad i AIMS Neuroscience visar att ordpussel aktiverar flera hjärnregioner samtidigt — inklusive områden som ansvarar för språkbearbetning, arbetsminne och exekutiva funktioner. LexiClash tar detta vidare genom att erbjuda spel på fem språk, vilket gör det till ett praktiskt verktyg för språkinlärare. Lärare använder LexiClash i klassrum på tre kontinenter för att göra ordförrådsövningar engagerande. Multiplayerformatet skapar hälsosam tävling som motiverar elever att naturligt utöka sitt ordförråd.',
  educationStats: [
    { value: '5', label: 'Språk' },
    { value: '3', label: 'Kontinenter' },
    { value: '100+', label: 'Nivåer' },
  ],
  faqTitle: 'Vanliga frågor',
  faq: [
    {
      question: 'Är LexiClash verkligen gratis?',
      answer:
        'Ja, helt gratis. Inga dolda betalväggar, inga premiumabonnemang. Vi finansierar spelet genom icke-påträngande reklam som respekterar din integritet.',
    },
    {
      question: 'Behöver jag skapa ett konto?',
      answer:
        'Nej. Du kan spela som gäst direkt. Att skapa ett konto (via Google eller Discord) låser upp funktioner som topplistorankningar, prestationsspårning och framstegssynkronisering mellan enheter.',
    },
    {
      question: 'Vilka språk stöds?',
      answer:
        'LexiClash stödjer svenska, engelska, hebreiska, japanska och spanska. Varje språk har sin egen kurerade ordbok, dagliga utmaningar och topplistor. Du kan byta språk när som helst från inställningsmenyn.',
    },
    {
      question: 'Kan jag spela på mobilen?',
      answer:
        'Absolut. LexiClash är fullt responsivt och fungerar i alla moderna mobilwebbläsare. Svep bokstäver för att bilda ord — pekskärmskontrollerna är speciellt designade för mobilt spel.',
    },
    {
      question: 'Är det säkert för barn?',
      answer:
        'Ja. LexiClash är designat för spelare från 6 år och uppåt. Vi följer COPPA-regler, visar bara icke-personaliserade annonser och spårar inte barns surfbeteende.',
    },
    {
      question: 'Kan jag skapa mitt eget bräde?',
      answer:
        'Ja! Använd gemenskapsbrädesbyggaren för att designa egna bokstavsnät med dina egna startsord. Publicera dem för andra att spela, betygsätta och tävla på. Toppbräden visas på startsidan.',
    },
  ],
  communityStats: [
    { value: '40+', label: 'Länder' },
    { value: '5', label: 'Språk' },
    { value: '∞', label: 'Ord att hitta' },
  ],
  communityTitle: 'Gå med tusentals ordspelsentusiaster',
  communityContent:
    'LexiClash-spelare finns i över 40 länder och på fem språk. Gå med i gemenskapen för att tävla på globala topplistor, dela dagliga utmaningsresultat och upptäck nya ordstrategier. Följ oss på Instagram @lexi.clash för tips, uppdateringar och gemenskapshöjdpunkter.',
};

const ja: LandingSEOContent = {
  whatIsTitle: 'LexiClashとは？',
  whatIsContent:
    'LexiClashは、ブラウザでそのまま遊べる無料の対戦型ワードゲームです。共有のレターグリッドでリアルタイムの言葉バトルを楽しもう — 単語を見つけ、コンボを重ね、ランキングを駆け上がれ。BoggleとWordleが合体したような、マルチプレイヤーゲームです。ダウンロード不要、アカウント登録不要。日本語、英語、ヘブライ語、スウェーデン語、スペイン語に対応。',
  whatIsShort:
    'ブラウザで遊べる無料の対戦ワードゲーム。単語を探し、コンボをつなぎ、友達を倒そう。ダウンロードも登録も不要。',
  featuresTitle: 'みんながLexiClashを好きな理由',
  gameModes: [
    {
      title: 'リアルタイムマルチプレイ',
      tag: '2〜20人',
      description:
        '2〜20人で同時に対戦。ルームを作ってコードをシェアすれば、すぐに始められる。',
    },
    {
      title: 'デイリーチャレンジ',
      tag: '毎日新しいパズル',
      description:
        '世界中のプレイヤーが同じパズルに挑戦。ストリークを記録して絵文字で結果をシェア — Wordleみたいに。',
    },
    {
      title: 'アドベンチャーモード',
      tag: '100ステージ',
      description:
        '10のテーマワールドにわたる100ステージ。特殊タイル、ボス戦、パワーアップで毎回新鮮な体験。',
    },
    {
      title: 'ブラストモード',
      tag: '連鎖爆発',
      description:
        '爆発的な連鎖でタイルをクリア。コンボを積んでカスケードを起こし、時間と競え。',
    },
    {
      title: 'コミュニティボード',
      tag: 'プレイヤー製パズル',
      description:
        '自分だけのシードワードでカスタムグリッドを作ろう。みんなが遊んで、評価して、競えるボードを公開しよう。',
    },
  ],
  howToPlayTitle: '遊び方',
  steps: [
    'ゲームルームを作るか参加する',
    '隣り合う文字をスワイプして単語を作る',
    'コンボでボーナスポイントをゲット',
    '最多得点で勝利！',
  ],
  highlights: ['どのデバイスでも、どのブラウザでも', '6歳以上', '教室でも活用', '登録不要'],
  whoCanPlayTitle: '誰でも遊べる？',
  whoCanPlayCards: [
    {
      label: 'どのデバイスでも',
      detail: 'スマホ、タブレット、ノートPC、デスクトップ — 最新ブラウザがあればアプリ不要。',
    },
    {
      label: '6歳以上',
      detail: '子ども向けの安全機能が充実。若いプレイヤーには非個人化広告でCOPPA準拠。',
    },
    {
      label: '教室で',
      detail: '先生が語彙ドリルとしてマルチプレイヤーバトルを活用。3大陸の学校で使われています。',
    },
    {
      label: '友達グループで',
      detail: '最大20人でパーティーゲーム。ルームコードをシェアしてリアルタイム対戦。',
    },
  ],
  gameModesTitle: 'ゲームモード解説',
  gameModesDetails: [
    {
      title: 'マルチプレイヤールーム',
      content:
        'プライベートルームを作って最大20人の友達とコードをシェア。全員が同じレターグリッドを見て、時間内に単語を探す競争。最高得点のプレイヤーが勝利。パーティー、教室、リモートチームビルディングに最適。',
    },
    {
      title: 'ソロ対Bot',
      content:
        'さまざまな難易度のAI対戦相手で単語探しのスキルを磨こう。個人記録を更新し、実績を獲得し、ライブ対戦のプレッシャーなしに戦略を洗練させよう。',
    },
    {
      title: 'デイリーチャレンジ',
      content:
        '毎日新鮮なパズルが、世界中の全プレイヤーに同じ内容で届く。ストリークを維持し、グローバルコミュニティとスコアを比較しよう。Wordleのように絵文字グリッドで結果をシェアしよう。',
    },
    {
      title: 'アドベンチャーモード',
      content:
        '難易度が増す100ステージで10のテーマワールドを旅しよう。氷、炎、爆弾、レインボータイルなどの特殊タイルが登場。言葉の力でボスを倒し、進むにつれて新しいワールドを解放しよう。',
    },
  ],
  educationTitle: '学びのために作られた',
  educationContent:
    'ワードゲームは語彙力を高めスペルを改善する最も効果的な方法のひとつです。AIMS Neuroscienceに掲載された研究によると、言葉パズルは言語処理、ワーキングメモリ、実行機能を担う複数の脳領域を同時に活性化させます。LexiClashはさらに5言語でのゲームプレイを提供し、語学学習者にとって実用的なツールになっています。教師たちは3大陸の教室でLexiClashを使い、語彙ドリルを楽しいものに変えています。マルチプレイヤー形式が健全な競争を生み出し、生徒が自然と語彙を広げるモチベーションになります。',
  educationStats: [
    { value: '5', label: '言語' },
    { value: '3', label: '大陸' },
    { value: '100+', label: 'ステージ' },
  ],
  faqTitle: 'よくある質問',
  faq: [
    {
      question: 'LexiClashは本当に無料ですか？',
      answer:
        'はい、完全無料です。隠れた課金要素もプレミアム会員もありません。プライバシーを尊重した控えめな広告でゲームを運営しています。',
    },
    {
      question: 'アカウント登録が必要ですか？',
      answer:
        'いいえ。ゲストとしてすぐに遊べます。アカウントを作ると（GoogleまたはDiscordで）、ランキング、実績の記録、デバイス間の進捗保存が使えるようになります。',
    },
    {
      question: '対応言語は？',
      answer:
        'LexiClashは日本語、英語、ヘブライ語、スウェーデン語、スペイン語に対応しています。各言語に専用の辞書、デイリーチャレンジ、ランキングがあります。設定メニューからいつでも言語を切り替えられます。',
    },
    {
      question: 'スマホで遊べますか？',
      answer:
        'もちろんです。LexiClashは完全レスポンシブで、最新のモバイルブラウザで動作します。文字をスワイプして単語を作る — タッチ操作はモバイルプレイ専用にデザインされています。',
    },
    {
      question: '子どもでも安全ですか？',
      answer:
        'はい。LexiClashは6歳以上向けに設計されています。COPPA規制に準拠し、非個人化広告のみを表示、子どもの閲覧行動を追跡しません。',
    },
    {
      question: '自分のボードを作れますか？',
      answer:
        'もちろん！コミュニティボードビルダーで自分のシードワードを使ったカスタムグリッドをデザインしよう。みんなが遊んで評価できるように公開しよう。上位のボードはホームページに掲載されます。',
    },
  ],
  communityStats: [
    { value: '40+', label: '国' },
    { value: '5', label: '言語' },
    { value: '∞', label: '見つける単語' },
  ],
  communityTitle: '数千人のワードゲーム愛好家と一緒に',
  communityContent:
    'LexiClashのプレイヤーは40カ国以上、5言語にわたっています。コミュニティに参加して、グローバルランキングで競い、デイリーチャレンジの結果をシェアし、新しいワード戦略を発見しよう。Instagram @lexi.clash でヒント、アップデート、コミュニティハイライトをチェック。',
};

const es: LandingSEOContent = {
  whatIsTitle: '¿Qué es LexiClash?',
  whatIsContent:
    'LexiClash es un juego de palabras multijugador gratuito y de ritmo acelerado que puedes jugar directamente en tu navegador. Compite con amigos en batallas de palabras en tiempo real sobre una cuadrícula de letras compartida — encuentra palabras, construye combos y escala en la clasificación. Es como Boggle se encuentra con Wordle, pero multijugador. Sin descargas, sin registro. Disponible en español, inglés, hebreo, sueco y japonés.',
  whatIsShort:
    'Batallas de palabras multijugador gratis en tu navegador. Encuentra palabras, construye combos, aplasta a tus amigos. Sin descargas, sin registro.',
  featuresTitle: 'Por qué los jugadores adoran LexiClash',
  gameModes: [
    {
      title: 'Multijugador en tiempo real',
      tag: '2-20 jugadores',
      description:
        'Compite cara a cara con 2-20 jugadores simultáneamente. Crea una sala, comparte el código y juega al instante.',
    },
    {
      title: 'Desafíos diarios',
      tag: 'Nuevo rompecabezas cada día',
      description:
        'El mismo rompecabezas para todos en el mundo, cada día. Sigue tu racha y comparte resultados con emojis — como Wordle.',
    },
    {
      title: 'Modo aventura',
      tag: '100 niveles',
      description:
        '100 niveles a través de 10 mundos temáticos. Fichas especiales, batallas contra jefes y mejoras mantienen cada ronda fresca.',
    },
    {
      title: 'Modo Blast',
      tag: 'Reacciones en cadena',
      description:
        'Limpia fichas en reacciones en cadena explosivas. Construye combos, desencadena cascadas y compite contra el reloj.',
    },
    {
      title: 'Tableros comunitarios',
      tag: 'Rompecabezas creados por jugadores',
      description:
        'Diseña cuadrículas de letras personalizadas con tus propias palabras semilla. Publícalas para que otros jueguen, valoren y compitan.',
    },
  ],
  howToPlayTitle: 'Cómo jugar',
  steps: [
    'Crea o únete a una sala de juego',
    'Desliza letras adyacentes para formar palabras',
    'Construye combos para puntos extra',
    '¡Consigue los más puntos para ganar!',
  ],
  highlights: ['Cualquier dispositivo, cualquier navegador', 'Mayores de 6 años', 'Usado en aulas', 'Sin registro'],
  whoCanPlayTitle: '¿Quién puede jugar?',
  whoCanPlayCards: [
    {
      label: 'Cualquier dispositivo',
      detail: 'Teléfonos, tabletas, portátiles, ordenadores de escritorio — cualquier navegador moderno, sin necesidad de descargar ninguna app.',
    },
    {
      label: 'Mayores de 6 años',
      detail: 'Funciones de seguridad infantil incorporadas. Compatible con COPPA y con anuncios no personalizados para los jugadores más jóvenes.',
    },
    {
      label: 'Aulas',
      detail: 'Los profesores usan batallas de palabras multijugador como ejercicios de vocabulario. Empleado en escuelas de tres continentes.',
    },
    {
      label: 'Grupos de amigos',
      detail: 'Organiza un juego de fiesta con hasta 20 jugadores. Comparte un código de sala y compite en tiempo real.',
    },
  ],
  gameModesTitle: 'Los modos de juego explicados',
  gameModesDetails: [
    {
      title: 'Salas multijugador',
      content:
        'Crea una sala privada y comparte el código con hasta 20 amigos. Todos ven la misma cuadrícula de letras y compiten por encontrar palabras antes de que se acabe el tiempo. El jugador con más puntos gana. Perfecto para fiestas, aulas y team building remoto.',
    },
    {
      title: 'Un jugador contra bots',
      content:
        'Practica tus habilidades para encontrar palabras contra oponentes de IA de distintas dificultades. Supera récords personales, gana logros y afina tu estrategia sin la presión de la competición en vivo.',
    },
    {
      title: 'Desafío diario',
      content:
        'Un rompecabezas nuevo cada día, idéntico para todos los jugadores del mundo. Complétalo para mantener tu racha y compara tu puntuación con la comunidad global. Comparte tus resultados con cuadrículas de emojis, como Wordle.',
    },
    {
      title: 'Modo aventura',
      content:
        'Viaja por 10 mundos temáticos con 100 niveles de dificultad creciente. Encuentra tipos de fichas especiales como hielo, fuego, bombas y fichas arcoíris. Derrota a los jefes con el poder de las palabras y desbloquea nuevos mundos a medida que avanzas.',
    },
  ],
  educationTitle: 'Diseñado para aprender',
  educationContent:
    'Los juegos de palabras son una de las formas más efectivas de ampliar el vocabulario y mejorar la ortografía. Investigaciones publicadas en AIMS Neuroscience muestran que los rompecabezas de palabras activan múltiples regiones cerebrales simultáneamente — incluidas las responsables del procesamiento del lenguaje, la memoria de trabajo y las funciones ejecutivas. LexiClash va más allá al ofrecer juego en cinco idiomas, convirtiéndolo en una herramienta práctica para quienes aprenden idiomas. Los profesores usan LexiClash en aulas de tres continentes para hacer los ejercicios de vocabulario más entretenidos. El formato multijugador crea una competencia sana que motiva a los estudiantes a ampliar su vocabulario de forma natural.',
  educationStats: [
    { value: '5', label: 'Idiomas' },
    { value: '3', label: 'Continentes' },
    { value: '100+', label: 'Niveles' },
  ],
  faqTitle: 'Preguntas frecuentes',
  faq: [
    {
      question: '¿LexiClash es realmente gratis?',
      answer:
        'Sí, completamente gratis. Sin muros de pago ocultos ni suscripciones premium. Sostenemos el juego a través de publicidad no intrusiva que respeta tu privacidad.',
    },
    {
      question: '¿Necesito crear una cuenta?',
      answer:
        'No. Puedes jugar como invitado de inmediato. Crear una cuenta (con Google o Discord) desbloquea funciones como clasificaciones en tablas de líderes, seguimiento de logros y guardado del progreso en todos tus dispositivos.',
    },
    {
      question: '¿Qué idiomas se admiten?',
      answer:
        'LexiClash es compatible con español, inglés, hebreo, sueco y japonés. Cada idioma tiene su propio diccionario curado, desafíos diarios y tablas de clasificación. Puedes cambiar de idioma en cualquier momento desde el menú de configuración.',
    },
    {
      question: '¿Puedo jugar en el móvil?',
      answer:
        'Por supuesto. LexiClash es totalmente adaptable y funciona en cualquier navegador móvil moderno. Desliza letras para formar palabras — los controles táctiles están diseñados específicamente para jugar en el móvil.',
    },
    {
      question: '¿Es seguro para los niños?',
      answer:
        'Sí. LexiClash está diseñado para jugadores de 6 años en adelante. Cumplimos con la normativa COPPA, mostramos solo anuncios no personalizados y no rastreamos el comportamiento de navegación de los niños.',
    },
    {
      question: '¿Puedo crear mi propio tablero?',
      answer:
        '¡Sí! Usa el creador de tableros comunitarios para diseñar cuadrículas de letras personalizadas con tus propias palabras semilla. Publícalas para que otros jueguen, valoren y compitan. Los mejores tableros se destacan en la página de inicio.',
    },
  ],
  communityStats: [
    { value: '40+', label: 'Países' },
    { value: '5', label: 'Idiomas' },
    { value: '∞', label: 'Palabras por encontrar' },
  ],
  communityTitle: 'Únete a miles de entusiastas de los juegos de palabras',
  communityContent:
    'Los jugadores de LexiClash están repartidos en más de 40 países y cinco idiomas. Únete a la comunidad para competir en tablas de clasificación globales, compartir resultados de desafíos diarios y descubrir nuevas estrategias de vocabulario. Síguenos en Instagram @lexi.clash para consejos, actualizaciones y destacados de la comunidad.',
};

export const contentByLocale: Record<string, LandingSEOContent> = {
  en,
  he,
  sv,
  ja,
  es,
};
