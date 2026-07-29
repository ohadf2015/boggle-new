// Locale-aware copy for the "Download Word Game (Android)" install-intent landing page.
// Angle: searchers looking to INSTALL a word-game app — primary action is the Play badge.
// Claims are deliberately conservative (no offline/ratings overstatement) per project rules.
// Native review pending for HE/SV/JA/ES — flagged in MEMORY for follow-up.

export type Locale = 'en' | 'he' | 'sv' | 'ja' | 'es';

export interface FeatureCopy {
  icon: string;
  title: string;
  blurb: string;
}
export interface StepCopy {
  step: string;
  title: string;
  sub: string;
}
export interface FaqCopy {
  q: string;
  a: string;
}
export interface RelatedCopy {
  title: string;
  sub: string;
  /** Appended to `/${locale}` to build the internal link. */
  hrefSuffix: string;
}

export interface DownloadLandingCopy {
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  ogTitle: string;
  ogDescription: string;
  twitterTitle: string;
  twitterDescription: string;

  marqueeBadges: string[];
  badge: string;
  h1Pre: string;
  h1Highlight: string;
  introP1: string;
  introP2: string;
  heroImageAlt: string;

  installCtaLabel: string;
  installCtaAria: string;
  playWebLabel: string;

  featuresHeading: string;
  featuresSub: string;
  features: FeatureCopy[];

  comparisonHeading: string;
  comparisonHeaders: string[];
  comparisonRows: string[][];
  comparisonFooter: string;

  installHeading: string;
  installSteps: StepCopy[];

  faqHeading: string;
  faqs: FaqCopy[];

  relatedHeading: string;
  related: RelatedCopy[];

  finalCtaHeading: string;
  finalCtaBody: string;

  // SoftwareApplication JSON-LD
  appName: string;
  appDescription: string;
}

const en: DownloadLandingCopy = {
  metaTitle: 'Download LexiClash — Free Word Game for Android | Get It on Google Play',
  metaDescription:
    'Download LexiClash free for Android — a fast multiplayer word game with daily challenges, brain drills, and 2-20 player rooms. No paywall, no signup needed. Get it on Google Play.',
  metaKeywords:
    'word game android, download word game, free word game app, multiplayer word game android, word puzzle app android, boggle android app, word game google play, free word puzzle download, android word games, word game app no ads',
  ogTitle: 'Download LexiClash — Free Word Game for Android',
  ogDescription:
    'A fast multiplayer word game on your home screen. Daily challenges, brain drills, 2-20 player rooms. Free on Google Play — no paywall.',
  twitterTitle: 'Download LexiClash for Android — Free Word Game',
  twitterDescription: 'Multiplayer word battles, daily challenges, brain drills. Free on Google Play.',

  marqueeBadges: ['FREE TO PLAY', 'NO PAYWALL', '5 LANGUAGES', '2-20 PLAYERS', 'DAILY CHALLENGES', 'ON GOOGLE PLAY'],
  badge: '★ Free on Google Play ★',
  h1Pre: 'The word game,',
  h1Highlight: 'now on your home screen.',
  introP1:
    'LexiClash is a fast, loud, multiplayer word game — race friends to find words on a shared grid, climb daily leaderboards, and sharpen your brain between rounds. The Android app puts it one tap from your home screen.',
  introP2:
    'Free to download, free to play. No paywall, no pay-to-win, no signup wall to get started. Install it, pick a mode, and you are finding words in seconds.',
  heroImageAlt: 'LexiClash word game running on an Android phone next to the marshmallow-cube mascot',

  installCtaLabel: 'GET IT ON',
  installCtaAria: 'Download LexiClash on Google Play',
  playWebLabel: 'Or play free in your browser →',

  featuresHeading: 'Why install the app',
  featuresSub: 'Everything the web version does, plus the things a home-screen app does better.',
  features: [
    { icon: '📲', title: 'One-tap install', blurb: 'Grab it from Google Play and the LexiClash icon lands on your home screen. No payment, no hoops.' },
    { icon: '⚡', title: 'Built for phones', blurb: 'Full-screen play with no browser bars. The grid fills your screen so every letter is in thumb reach.' },
    { icon: '🔔', title: 'Daily reminders', blurb: 'Opt in to a gentle nudge at your usual play time so your daily streak never slips.' },
    { icon: '🎮', title: 'Every mode, free', blurb: 'Multiplayer rooms, daily challenge, brain drills, solo practice — the whole game, no paywall.' },
    { icon: '🌍', title: '5 languages', blurb: 'Play in English, Hebrew, Swedish, Japanese, or Spanish — including full right-to-left Hebrew.' },
  ],

  comparisonHeading: 'App vs. browser',
  comparisonHeaders: ['Feature', 'Browser', 'Android app'],
  comparisonRows: [
    ['Setup', 'Nothing to install', 'One tap from Google Play'],
    ['Home-screen icon', 'Add manually', 'Automatic'],
    ['Daily reminders', 'Not available', 'Push notifications'],
    ['Full-screen play', 'Browser bars', 'Immersive full screen'],
    ['Updates', 'Instant', 'Automatic via Play'],
    ['Price', 'Free', 'Free'],
  ],
  comparisonFooter: 'Both are free and play the same game. Rooms are cross-platform — app, browser, and iPhone players can share one room code.',

  installHeading: 'Install in 3 taps',
  installSteps: [
    { step: '1', title: 'Open Google Play', sub: 'Tap “Get it on Google Play” — it opens the LexiClash listing in the Play Store.' },
    { step: '2', title: 'Tap Install', sub: 'One tap. The app downloads and adds itself to your home screen automatically.' },
    { step: '3', title: 'Play', sub: 'Open LexiClash, pick a mode, and start finding words. No signup needed to begin.' },
  ],

  faqHeading: 'Download FAQ',
  faqs: [
    { q: 'Is the LexiClash Android app free?', a: 'Yes. It is free to download from Google Play and free to play. There is no paywall and no pay-to-win — every mode, including multiplayer and brain training, is unlocked from the start.' },
    { q: 'Do I need an account to play?', a: 'No. You can install and start playing immediately. A free account is optional and only used to save your progress, streaks, and stats across devices.' },
    { q: 'Will it run on my phone?', a: 'LexiClash supports modern Android phones and tablets. If your device runs a current version of Android and Google Play, you can install it.' },
    { q: 'Is the app the same as the web version?', a: 'Yes — same word grids, same game modes, same live multiplayer rooms. The app adds a home-screen icon, full-screen play, and optional daily reminders.' },
    { q: 'Can I play with friends who use a browser or iPhone?', a: 'Yes. Multiplayer rooms are cross-platform. Share a room code and friends can join from the app, a web browser, or any phone.' },
    { q: 'How big is the download?', a: 'It is a lightweight word game, so the download is small and installs in seconds on most connections.' },
    { q: 'How do I get it?', a: 'Tap the “Get it on Google Play” button on this page, then Install. The app appears on your home screen ready to play.' },
  ],

  relatedHeading: 'Explore the game',
  related: [
    { title: 'Multiplayer', sub: 'Real-time word battles, 2-20 players', hrefSuffix: '/multiplayer' },
    { title: 'Daily Challenge', sub: 'A fresh word puzzle every day', hrefSuffix: '/daily' },
    { title: 'Brain Training', sub: '5 quick cognitive drills', hrefSuffix: '/brain' },
    { title: 'How to Play', sub: 'Learn the rules in a minute', hrefSuffix: '/how-to-play' },
  ],

  finalCtaHeading: 'Get LexiClash for Android',
  finalCtaBody: 'Free to download, free to play, every mode unlocked. Put the word game on your home screen and start a streak today.',

  appName: 'LexiClash',
  appDescription:
    'Free multiplayer word game for Android. Race friends to find words on a shared grid, play daily challenges and brain drills, in 5 languages. No paywall, no signup required.',
};

const he: DownloadLandingCopy = {
  metaTitle: 'הורדת LexiClash — משחק מילים חינמי לאנדרואיד | בגוגל פליי',
  metaDescription:
    'הורידו את LexiClash בחינם לאנדרואיד — משחק מילים מהיר עם מצב רב-משתתפים, אתגרים יומיים ותרגולי מוח. בלי תשלום, בלי הרשמה. זמין בגוגל פליי.',
  metaKeywords:
    'משחק מילים אנדרואיד, הורדת משחק מילים, אפליקציית מילים חינם, משחק מילים רב משתתפים, בוגל אנדרואיד, משחק מילים גוגל פליי, אפליקציית פאזל מילים, word game android',
  ogTitle: 'הורדת LexiClash — משחק מילים חינמי לאנדרואיד',
  ogDescription:
    'משחק מילים מהיר ורב-משתתפים על מסך הבית. אתגרים יומיים, תרגולי מוח, חדרים ל-2 עד 20 שחקנים. חינם בגוגל פליי.',
  twitterTitle: 'הורידו את LexiClash לאנדרואיד — משחק מילים חינמי',
  twitterDescription: 'קרבות מילים רב-משתתפים, אתגרים יומיים ותרגולי מוח. חינם בגוגל פליי.',

  marqueeBadges: ['חינם לחלוטין', 'בלי תשלום', '5 שפות', '2-20 שחקנים', 'אתגרים יומיים', 'בגוגל פליי'],
  badge: '★ חינם בגוגל פליי ★',
  h1Pre: 'משחק המילים,',
  h1Highlight: 'עכשיו על מסך הבית.',
  introP1:
    'LexiClash הוא משחק מילים מהיר ורב-משתתפים — מתחרים בחברים מי ימצא יותר מילים על לוח משותף, מטפסים בטבלאות יומיות ומחדדים את המוח בין הסיבובים. אפליקציית האנדרואיד שמה אותו במרחק הקשה אחת ממסך הבית.',
  introP2:
    'חינם להורדה, חינם למשחק. בלי תשלום, בלי pay-to-win, בלי חומת הרשמה כדי להתחיל. מתקינים, בוחרים מצב, ותוך שניות כבר מוצאים מילים.',
  heroImageAlt: 'משחק המילים LexiClash על טלפון אנדרואיד לצד דמות קוביית המרשמלו',

  installCtaLabel: 'הורידו מ-',
  installCtaAria: 'הורדת LexiClash מגוגל פליי',
  playWebLabel: '← או שחקו בחינם בדפדפן',

  featuresHeading: 'למה להתקין את האפליקציה',
  featuresSub: 'כל מה שגרסת הדפדפן עושה, בתוספת הדברים שאפליקציה על מסך הבית עושה טוב יותר.',
  features: [
    { icon: '📲', title: 'התקנה בהקשה אחת', blurb: 'מורידים מגוגל פליי והאייקון של LexiClash מופיע על מסך הבית. בלי תשלום, בלי טרחה.' },
    { icon: '⚡', title: 'בנוי לטלפון', blurb: 'משחק במסך מלא בלי סרגלי דפדפן. הלוח ממלא את המסך וכל אות במרחק אגודל.' },
    { icon: '🔔', title: 'תזכורות יומיות', blurb: 'בוחרים לקבל תזכורת עדינה בשעת המשחק הרגילה כדי שרצף הימים לא יישבר.' },
    { icon: '🎮', title: 'כל המצבים בחינם', blurb: 'חדרים רב-משתתפים, אתגר יומי, תרגולי מוח ותרגול עצמאי — כל המשחק, בלי תשלום.' },
    { icon: '🌍', title: '5 שפות', blurb: 'אנגלית, עברית, שוודית, יפנית או ספרדית — כולל עברית מלאה מימין לשמאל.' },
  ],

  comparisonHeading: 'אפליקציה מול דפדפן',
  comparisonHeaders: ['תכונה', 'דפדפן', 'אפליקציית אנדרואיד'],
  comparisonRows: [
    ['התקנה', 'אין מה להתקין', 'הקשה אחת בגוגל פליי'],
    ['אייקון על מסך הבית', 'ידני', 'אוטומטי'],
    ['תזכורות יומיות', 'לא זמין', 'התראות דחיפה'],
    ['משחק במסך מלא', 'עם סרגלי דפדפן', 'מסך מלא וסוחף'],
    ['עדכונים', 'מיידי', 'אוטומטי דרך פליי'],
    ['מחיר', 'חינם', 'חינם'],
  ],
  comparisonFooter: 'שניהם חינם ומשחקים את אותו המשחק. החדרים חוצי-פלטפורמה — שחקני אפליקציה, דפדפן ואייפון יכולים לחלוק קוד חדר אחד.',

  installHeading: 'התקנה ב-3 הקשות',
  installSteps: [
    { step: '1', title: 'פותחים את גוגל פליי', sub: 'מקישים על “הורידו מגוגל פליי” — נפתח דף LexiClash בחנות.' },
    { step: '2', title: 'מקישים התקנה', sub: 'הקשה אחת. האפליקציה יורדת ומתווספת אוטומטית למסך הבית.' },
    { step: '3', title: 'משחקים', sub: 'פותחים את LexiClash, בוחרים מצב ומתחילים למצוא מילים. בלי הרשמה.' },
  ],

  faqHeading: 'שאלות נפוצות על ההורדה',
  faqs: [
    { q: 'האם אפליקציית LexiClash לאנדרואיד בחינם?', a: 'כן. ההורדה מגוגל פליי חינמית והמשחק חינמי. אין תשלום ואין pay-to-win — כל המצבים, כולל רב-משתתפים ותרגולי מוח, פתוחים מההתחלה.' },
    { q: 'צריך חשבון כדי לשחק?', a: 'לא. אפשר להתקין ולהתחיל לשחק מיד. חשבון חינמי הוא רשות ומשמש רק לשמירת התקדמות, רצפים ונתונים בין מכשירים.' },
    { q: 'האם זה ירוץ על הטלפון שלי?', a: 'LexiClash תומך בטלפוני וטאבלטי אנדרואיד מודרניים. אם המכשיר מריץ גרסת אנדרואיד עדכנית וגוגל פליי, אפשר להתקין.' },
    { q: 'האם האפליקציה זהה לגרסת הדפדפן?', a: 'כן — אותם לוחות, אותם מצבי משחק, אותם חדרים רב-משתתפים בזמן אמת. האפליקציה מוסיפה אייקון על מסך הבית, משחק במסך מלא ותזכורות יומיות אופציונליות.' },
    { q: 'אפשר לשחק עם חברים בדפדפן או באייפון?', a: 'כן. החדרים חוצי-פלטפורמה. משתפים קוד חדר וחברים מצטרפים מהאפליקציה, מהדפדפן או מכל טלפון.' },
    { q: 'כמה גדולה ההורדה?', a: 'זהו משחק מילים קליל, כך שההורדה קטנה ומסתיימת תוך שניות ברוב החיבורים.' },
    { q: 'איך משיגים אותו?', a: 'מקישים על כפתור “הורידו מגוגל פליי” בעמוד הזה ואז התקנה. האפליקציה מופיעה על מסך הבית מוכנה למשחק.' },
  ],

  relatedHeading: 'לגלות את המשחק',
  related: [
    { title: 'רב-משתתפים', sub: 'קרבות מילים בזמן אמת, 2-20 שחקנים', hrefSuffix: '/multiplayer' },
    { title: 'אתגר יומי', sub: 'פאזל מילים חדש בכל יום', hrefSuffix: '/daily' },
    { title: 'אימון מוח', sub: '5 תרגולים קוגניטיביים קצרים', hrefSuffix: '/brain' },
    { title: 'איך משחקים', sub: 'לומדים את הכללים בדקה', hrefSuffix: '/how-to-play' },
  ],

  finalCtaHeading: 'הורידו את LexiClash לאנדרואיד',
  finalCtaBody: 'חינם להורדה, חינם למשחק, כל המצבים פתוחים. שימו את משחק המילים על מסך הבית והתחילו רצף עוד היום.',

  appName: 'LexiClash',
  appDescription:
    'משחק מילים רב-משתתפים חינמי לאנדרואיד. מתחרים בחברים על מציאת מילים בלוח משותף, אתגרים יומיים ותרגולי מוח, ב-5 שפות. בלי תשלום, בלי הרשמה.',
};

const sv: DownloadLandingCopy = {
  metaTitle: 'Ladda ner LexiClash — Gratis ordspel för Android | Hämta på Google Play',
  metaDescription:
    'Ladda ner LexiClash gratis för Android — ett snabbt ordspel för flera spelare med dagliga utmaningar, hjärnträning och rum för 2-20 spelare. Ingen betalvägg, ingen registrering. Hämta på Google Play.',
  metaKeywords:
    'ordspel android, ladda ner ordspel, gratis ordspel app, flerspelarordspel android, ordpussel app, boggle android, ordspel google play, gratis ordspel nedladdning, word game android',
  ogTitle: 'Ladda ner LexiClash — Gratis ordspel för Android',
  ogDescription:
    'Ett snabbt ordspel för flera spelare på din hemskärm. Dagliga utmaningar, hjärnträning, rum för 2-20 spelare. Gratis på Google Play.',
  twitterTitle: 'Ladda ner LexiClash för Android — Gratis ordspel',
  twitterDescription: 'Ordstrider för flera spelare, dagliga utmaningar och hjärnträning. Gratis på Google Play.',

  marqueeBadges: ['GRATIS ATT SPELA', 'INGEN BETALVÄGG', '5 SPRÅK', '2-20 SPELARE', 'DAGLIGA UTMANINGAR', 'PÅ GOOGLE PLAY'],
  badge: '★ Gratis på Google Play ★',
  h1Pre: 'Ordspelet,',
  h1Highlight: 'nu på din hemskärm.',
  introP1:
    'LexiClash är ett snabbt, högljutt ordspel för flera spelare — kapplöp med vänner om att hitta ord på ett delat rutnät, klättra på dagliga topplistor och skärp hjärnan mellan rundorna. Android-appen lägger spelet ett tryck bort på hemskärmen.',
  introP2:
    'Gratis att ladda ner, gratis att spela. Ingen betalvägg, inget pay-to-win, ingen registreringsvägg för att börja. Installera, välj ett läge och du hittar ord på några sekunder.',
  heroImageAlt: 'Ordspelet LexiClash på en Android-telefon bredvid maskotkuben av marshmallow',

  installCtaLabel: 'HÄMTA PÅ',
  installCtaAria: 'Ladda ner LexiClash på Google Play',
  playWebLabel: 'Eller spela gratis i webbläsaren →',

  featuresHeading: 'Varför installera appen',
  featuresSub: 'Allt som webbversionen gör, plus det som en hemskärmsapp gör bättre.',
  features: [
    { icon: '📲', title: 'Installera med ett tryck', blurb: 'Hämta från Google Play så landar LexiClash-ikonen på din hemskärm. Ingen betalning, inget krångel.' },
    { icon: '⚡', title: 'Byggt för telefoner', blurb: 'Helskärm utan webbläsarrader. Rutnätet fyller skärmen så varje bokstav når tummen.' },
    { icon: '🔔', title: 'Dagliga påminnelser', blurb: 'Välj en mjuk påminnelse vid din vanliga speltid så att din svit aldrig bryts.' },
    { icon: '🎮', title: 'Alla lägen gratis', blurb: 'Flerspelarrum, daglig utmaning, hjärnträning, solospel — hela spelet, ingen betalvägg.' },
    { icon: '🌍', title: '5 språk', blurb: 'Spela på engelska, hebreiska, svenska, japanska eller spanska — inklusive fullt höger-till-vänster för hebreiska.' },
  ],

  comparisonHeading: 'App vs. webbläsare',
  comparisonHeaders: ['Funktion', 'Webbläsare', 'Android-app'],
  comparisonRows: [
    ['Installation', 'Inget att installera', 'Ett tryck på Google Play'],
    ['Hemskärmsikon', 'Lägg till manuellt', 'Automatiskt'],
    ['Dagliga påminnelser', 'Ej tillgängligt', 'Push-aviseringar'],
    ['Helskärmsspel', 'Webbläsarrader', 'Uppslukande helskärm'],
    ['Uppdateringar', 'Direkt', 'Automatiskt via Play'],
    ['Pris', 'Gratis', 'Gratis'],
  ],
  comparisonFooter: 'Båda är gratis och spelar samma spel. Rum är plattformsoberoende — app-, webb- och iPhone-spelare kan dela samma rumskod.',

  installHeading: 'Installera på 3 tryck',
  installSteps: [
    { step: '1', title: 'Öppna Google Play', sub: 'Tryck på ”Hämta på Google Play” — det öppnar LexiClash-sidan i Play Butik.' },
    { step: '2', title: 'Tryck Installera', sub: 'Ett tryck. Appen laddas ner och läggs till på hemskärmen automatiskt.' },
    { step: '3', title: 'Spela', sub: 'Öppna LexiClash, välj ett läge och börja hitta ord. Ingen registrering behövs.' },
  ],

  faqHeading: 'Vanliga frågor om nedladdning',
  faqs: [
    { q: 'Är LexiClash Android-app gratis?', a: 'Ja. Den är gratis att ladda ner från Google Play och gratis att spela. Ingen betalvägg och inget pay-to-win — varje läge, inklusive flerspelarläge och hjärnträning, är upplåst från start.' },
    { q: 'Behöver jag ett konto för att spela?', a: 'Nej. Du kan installera och börja spela direkt. Ett gratiskonto är valfritt och används bara för att spara dina framsteg, sviter och statistik mellan enheter.' },
    { q: 'Fungerar det på min telefon?', a: 'LexiClash stöder moderna Android-telefoner och surfplattor. Om din enhet kör en aktuell version av Android och Google Play kan du installera den.' },
    { q: 'Är appen samma som webbversionen?', a: 'Ja — samma ordrutnät, samma spellägen, samma livs-flerspelarrum. Appen lägger till en hemskärmsikon, helskärmsspel och valfria dagliga påminnelser.' },
    { q: 'Kan jag spela med vänner i webbläsare eller på iPhone?', a: 'Ja. Flerspelarrum är plattformsoberoende. Dela en rumskod så kan vänner gå med från appen, en webbläsare eller valfri telefon.' },
    { q: 'Hur stor är nedladdningen?', a: 'Det är ett lättviktigt ordspel, så nedladdningen är liten och installeras på sekunder på de flesta anslutningar.' },
    { q: 'Hur får jag det?', a: 'Tryck på knappen ”Hämta på Google Play” på den här sidan, sedan Installera. Appen dyker upp på din hemskärm redo att spela.' },
  ],

  relatedHeading: 'Utforska spelet',
  related: [
    { title: 'Flerspelarläge', sub: 'Ordstrider i realtid, 2-20 spelare', hrefSuffix: '/multiplayer' },
    { title: 'Daglig utmaning', sub: 'Ett nytt ordpussel varje dag', hrefSuffix: '/daily' },
    { title: 'Hjärnträning', sub: '5 snabba kognitiva övningar', hrefSuffix: '/brain' },
    { title: 'Så spelar du', sub: 'Lär dig reglerna på en minut', hrefSuffix: '/how-to-play' },
  ],

  finalCtaHeading: 'Hämta LexiClash för Android',
  finalCtaBody: 'Gratis att ladda ner, gratis att spela, alla lägen upplåsta. Lägg ordspelet på din hemskärm och starta en svit idag.',

  appName: 'LexiClash',
  appDescription:
    'Gratis ordspel för flera spelare för Android. Kapplöp med vänner om att hitta ord på ett delat rutnät, spela dagliga utmaningar och hjärnträning, på 5 språk. Ingen betalvägg, ingen registrering.',
};

const ja: DownloadLandingCopy = {
  metaTitle: 'LexiClash をダウンロード — Android 向け無料ワードゲーム | Google Play で入手',
  metaDescription:
    'LexiClash を Android に無料でダウンロード。デイリーチャレンジ、脳トレ、2〜20人のマルチプレイができる高速ワードゲーム。課金の壁なし、登録不要。Google Play で入手。',
  metaKeywords:
    'ワードゲーム android, 単語ゲーム ダウンロード, 無料 ワードゲーム アプリ, マルチプレイ 単語ゲーム, 単語パズル アプリ, ボグル android, ワードゲーム google play, word game android',
  ogTitle: 'LexiClash をダウンロード — Android 向け無料ワードゲーム',
  ogDescription:
    'ホーム画面で遊べる高速マルチプレイのワードゲーム。デイリーチャレンジ、脳トレ、2〜20人のルーム。Google Play で無料。',
  twitterTitle: 'LexiClash を Android でダウンロード — 無料ワードゲーム',
  twitterDescription: 'マルチプレイの単語バトル、デイリーチャレンジ、脳トレ。Google Play で無料。',

  marqueeBadges: ['無料で遊べる', '課金の壁なし', '5言語', '2〜20人', 'デイリーチャレンジ', 'GOOGLE PLAY'],
  badge: '★ Google Play で無料 ★',
  h1Pre: 'あのワードゲームが、',
  h1Highlight: 'ホーム画面に。',
  introP1:
    'LexiClash は速くて賑やかなマルチプレイのワードゲーム。共有グリッドで友だちと単語探しを競い、デイリーのリーダーボードを駆け上がり、ラウンドの合間に頭を鍛えます。Android アプリならホーム画面からワンタップです。',
  introP2:
    'ダウンロード無料、プレイ無料。課金の壁も、pay-to-win も、開始時の登録の壁もありません。インストールしてモードを選べば、数秒で単語探しが始まります。',
  heroImageAlt: 'マシュマロキューブのマスコットの隣で Android スマホに表示された LexiClash のワードゲーム',

  installCtaLabel: '入手:',
  installCtaAria: 'LexiClash を Google Play で入手',
  playWebLabel: 'またはブラウザで無料プレイ →',

  featuresHeading: 'アプリを入れる理由',
  featuresSub: 'ウェブ版でできることすべてに加え、ホーム画面アプリならではの良さを。',
  features: [
    { icon: '📲', title: 'ワンタップでインストール', blurb: 'Google Play から入手すれば LexiClash のアイコンがホーム画面に。支払いも手間もありません。' },
    { icon: '⚡', title: 'スマホ向け設計', blurb: 'ブラウザのバーなしの全画面プレイ。グリッドが画面いっぱいに広がり、どの文字も親指の届く範囲に。' },
    { icon: '🔔', title: 'デイリー通知', blurb: 'いつもの時間にやさしいリマインドをオンにすれば、連続記録が途切れません。' },
    { icon: '🎮', title: '全モード無料', blurb: 'マルチプレイのルーム、デイリーチャレンジ、脳トレ、ソロ練習 — ゲームのすべてが課金の壁なし。' },
    { icon: '🌍', title: '5言語', blurb: '英語・ヘブライ語・スウェーデン語・日本語・スペイン語でプレイ可能（右から左に書くヘブライ語にも完全対応）。' },
  ],

  comparisonHeading: 'アプリ vs ブラウザ',
  comparisonHeaders: ['機能', 'ブラウザ', 'Android アプリ'],
  comparisonRows: [
    ['セットアップ', 'インストール不要', 'Google Play でワンタップ'],
    ['ホーム画面アイコン', '手動で追加', '自動'],
    ['デイリー通知', '利用不可', 'プッシュ通知'],
    ['全画面プレイ', 'ブラウザのバーあり', '没入感のある全画面'],
    ['アップデート', '即時', 'Play から自動'],
    ['価格', '無料', '無料'],
  ],
  comparisonFooter: 'どちらも無料で同じゲームを遊べます。ルームはプラットフォーム横断 — アプリ・ブラウザ・iPhone のプレイヤーが同じルームコードを共有できます。',

  installHeading: '3タップでインストール',
  installSteps: [
    { step: '1', title: 'Google Play を開く', sub: '「Google Play で入手」をタップすると、Play ストアの LexiClash のページが開きます。' },
    { step: '2', title: 'インストールをタップ', sub: 'ワンタップ。アプリがダウンロードされ、自動でホーム画面に追加されます。' },
    { step: '3', title: 'プレイ', sub: 'LexiClash を開いてモードを選び、単語探しを開始。登録は不要です。' },
  ],

  faqHeading: 'ダウンロードに関するよくある質問',
  faqs: [
    { q: 'LexiClash の Android アプリは無料ですか？', a: 'はい。Google Play から無料でダウンロードでき、プレイも無料です。課金の壁も pay-to-win もなく、マルチプレイや脳トレを含むすべてのモードが最初から解放されています。' },
    { q: 'プレイにアカウントは必要ですか？', a: 'いいえ。インストールしてすぐに遊べます。無料アカウントは任意で、進捗・連続記録・統計を端末間で保存するためだけに使います。' },
    { q: '自分のスマホで動きますか？', a: 'LexiClash は最新の Android スマホ・タブレットに対応しています。端末が現行バージョンの Android と Google Play で動いていればインストールできます。' },
    { q: 'アプリはウェブ版と同じですか？', a: 'はい — 同じワードグリッド、同じゲームモード、同じリアルタイムのマルチプレイルームです。アプリではホーム画面アイコン、全画面プレイ、任意のデイリー通知が加わります。' },
    { q: 'ブラウザや iPhone の友だちと遊べますか？', a: 'はい。マルチプレイのルームはプラットフォーム横断です。ルームコードを共有すれば、アプリ・ブラウザ・どのスマホからでも参加できます。' },
    { q: 'ダウンロードのサイズは？', a: '軽量なワードゲームなのでダウンロードは小さく、多くの回線では数秒でインストールできます。' },
    { q: '入手方法は？', a: 'このページの「Google Play で入手」ボタンをタップし、インストールするだけ。アプリがホーム画面に表示され、すぐ遊べます。' },
  ],

  relatedHeading: 'ゲームを見る',
  related: [
    { title: 'マルチプレイ', sub: 'リアルタイムの単語バトル、2〜20人', hrefSuffix: '/multiplayer' },
    { title: 'デイリーチャレンジ', sub: '毎日新しい単語パズル', hrefSuffix: '/daily' },
    { title: '脳トレ', sub: '短時間の認知ドリル5種', hrefSuffix: '/brain' },
    { title: '遊び方', sub: '1分でルールを学ぶ', hrefSuffix: '/how-to-play' },
  ],

  finalCtaHeading: 'LexiClash を Android で入手',
  finalCtaBody: 'ダウンロード無料、プレイ無料、全モード解放。ワードゲームをホーム画面に置いて、今日から連続記録を始めましょう。',

  appName: 'LexiClash',
  appDescription:
    'Android 向けの無料マルチプレイ ワードゲーム。共有グリッドで友だちと単語探しを競い、デイリーチャレンジや脳トレを5言語で。課金の壁なし、登録不要。',
};

const es: DownloadLandingCopy = {
  metaTitle: 'Descarga LexiClash — Juego de palabras gratis para Android | En Google Play',
  metaDescription:
    'Descarga LexiClash gratis para Android: un juego de palabras rápido y multijugador con retos diarios, entrenamiento mental y salas de 2 a 20 jugadores. Sin muro de pago, sin registro. Consíguelo en Google Play.',
  metaKeywords:
    'juego de palabras android, descargar juego de palabras, app de palabras gratis, juego de palabras multijugador android, app de puzzle de palabras, boggle android, juego de palabras google play, word game android',
  ogTitle: 'Descarga LexiClash — Juego de palabras gratis para Android',
  ogDescription:
    'Un juego de palabras multijugador y rápido en tu pantalla de inicio. Retos diarios, entrenamiento mental, salas de 2 a 20 jugadores. Gratis en Google Play.',
  twitterTitle: 'Descarga LexiClash para Android — Juego de palabras gratis',
  twitterDescription: 'Batallas de palabras multijugador, retos diarios y entrenamiento mental. Gratis en Google Play.',

  marqueeBadges: ['GRATIS', 'SIN MURO DE PAGO', '5 IDIOMAS', '2-20 JUGADORES', 'RETOS DIARIOS', 'EN GOOGLE PLAY'],
  badge: '★ Gratis en Google Play ★',
  h1Pre: 'El juego de palabras,',
  h1Highlight: 'ahora en tu pantalla de inicio.',
  introP1:
    'LexiClash es un juego de palabras rápido, ruidoso y multijugador: compite con amigos por encontrar palabras en una cuadrícula compartida, sube en las tablas diarias y agudiza tu mente entre rondas. La app de Android lo deja a un toque desde tu pantalla de inicio.',
  introP2:
    'Gratis para descargar, gratis para jugar. Sin muro de pago, sin pay-to-win, sin muro de registro para empezar. Instálalo, elige un modo y estarás encontrando palabras en segundos.',
  heroImageAlt: 'El juego de palabras LexiClash en un teléfono Android junto a la mascota cubo de malvavisco',

  installCtaLabel: 'DISPONIBLE EN',
  installCtaAria: 'Descarga LexiClash en Google Play',
  playWebLabel: 'O juega gratis en tu navegador →',

  featuresHeading: 'Por qué instalar la app',
  featuresSub: 'Todo lo que hace la versión web, más lo que una app en la pantalla de inicio hace mejor.',
  features: [
    { icon: '📲', title: 'Instalación con un toque', blurb: 'Consíguelo en Google Play y el icono de LexiClash aparece en tu pantalla de inicio. Sin pagos ni complicaciones.' },
    { icon: '⚡', title: 'Hecho para móviles', blurb: 'Juego a pantalla completa sin barras del navegador. La cuadrícula llena la pantalla y cada letra queda al alcance del pulgar.' },
    { icon: '🔔', title: 'Recordatorios diarios', blurb: 'Activa un aviso suave a tu hora habitual de juego para que tu racha no se rompa.' },
    { icon: '🎮', title: 'Todos los modos, gratis', blurb: 'Salas multijugador, reto diario, entrenamiento mental, práctica en solitario: todo el juego, sin muro de pago.' },
    { icon: '🌍', title: '5 idiomas', blurb: 'Juega en inglés, hebreo, sueco, japonés o español, con soporte completo de derecha a izquierda para el hebreo.' },
  ],

  comparisonHeading: 'App vs. navegador',
  comparisonHeaders: ['Característica', 'Navegador', 'App de Android'],
  comparisonRows: [
    ['Instalación', 'Nada que instalar', 'Un toque en Google Play'],
    ['Icono en pantalla de inicio', 'Añadir manualmente', 'Automático'],
    ['Recordatorios diarios', 'No disponible', 'Notificaciones push'],
    ['Juego a pantalla completa', 'Barras del navegador', 'Pantalla completa inmersiva'],
    ['Actualizaciones', 'Instantáneas', 'Automáticas vía Play'],
    ['Precio', 'Gratis', 'Gratis'],
  ],
  comparisonFooter: 'Ambos son gratis y juegan al mismo juego. Las salas son multiplataforma: jugadores de app, navegador e iPhone pueden compartir un mismo código de sala.',

  installHeading: 'Instala en 3 toques',
  installSteps: [
    { step: '1', title: 'Abre Google Play', sub: 'Toca “Disponible en Google Play” y se abrirá la ficha de LexiClash en Play Store.' },
    { step: '2', title: 'Toca Instalar', sub: 'Un toque. La app se descarga y se añade sola a tu pantalla de inicio.' },
    { step: '3', title: 'Juega', sub: 'Abre LexiClash, elige un modo y empieza a encontrar palabras. Sin registro para empezar.' },
  ],

  faqHeading: 'Preguntas sobre la descarga',
  faqs: [
    { q: '¿La app de LexiClash para Android es gratis?', a: 'Sí. Es gratis de descargar en Google Play y gratis de jugar. No hay muro de pago ni pay-to-win: todos los modos, incluidos el multijugador y el entrenamiento mental, están desbloqueados desde el principio.' },
    { q: '¿Necesito una cuenta para jugar?', a: 'No. Puedes instalar y empezar a jugar de inmediato. Una cuenta gratuita es opcional y solo sirve para guardar tu progreso, rachas y estadísticas entre dispositivos.' },
    { q: '¿Funcionará en mi teléfono?', a: 'LexiClash es compatible con teléfonos y tabletas Android modernos. Si tu dispositivo ejecuta una versión actual de Android y Google Play, puedes instalarlo.' },
    { q: '¿La app es igual que la versión web?', a: 'Sí: las mismas cuadrículas, los mismos modos de juego, las mismas salas multijugador en vivo. La app añade un icono en la pantalla de inicio, juego a pantalla completa y recordatorios diarios opcionales.' },
    { q: '¿Puedo jugar con amigos que usan navegador o iPhone?', a: 'Sí. Las salas multijugador son multiplataforma. Comparte un código de sala y tus amigos podrán unirse desde la app, un navegador o cualquier teléfono.' },
    { q: '¿Cuánto ocupa la descarga?', a: 'Es un juego de palabras ligero, así que la descarga es pequeña y se instala en segundos en la mayoría de las conexiones.' },
    { q: '¿Cómo lo consigo?', a: 'Toca el botón “Disponible en Google Play” de esta página y luego Instalar. La app aparecerá en tu pantalla de inicio lista para jugar.' },
  ],

  relatedHeading: 'Explora el juego',
  related: [
    { title: 'Multijugador', sub: 'Batallas de palabras en tiempo real, 2-20 jugadores', hrefSuffix: '/multiplayer' },
    { title: 'Reto diario', sub: 'Un nuevo puzzle de palabras cada día', hrefSuffix: '/daily' },
    { title: 'Entrenamiento mental', sub: '5 ejercicios cognitivos rápidos', hrefSuffix: '/brain' },
    { title: 'Cómo se juega', sub: 'Aprende las reglas en un minuto', hrefSuffix: '/how-to-play' },
  ],

  finalCtaHeading: 'Consigue LexiClash para Android',
  finalCtaBody: 'Gratis para descargar, gratis para jugar, todos los modos desbloqueados. Pon el juego de palabras en tu pantalla de inicio y empieza una racha hoy.',

  appName: 'LexiClash',
  appDescription:
    'Juego de palabras multijugador gratuito para Android. Compite con amigos por encontrar palabras en una cuadrícula compartida, juega retos diarios y entrenamiento mental, en 5 idiomas. Sin muro de pago, sin registro.',
};

const COPY: Record<Locale, DownloadLandingCopy> = { en, he, sv, ja, es };

export function getDownloadLandingCopy(locale: string): DownloadLandingCopy {
  return COPY[(locale as Locale)] ?? en;
}
