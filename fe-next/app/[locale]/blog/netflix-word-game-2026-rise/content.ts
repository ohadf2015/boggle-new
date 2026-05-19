// Article content — culturally adapted per locale, NOT machine-translated.
// Hebrew written with native idiom (per project rule); other locales hand-styled.

export type Section = {
  title?: string;
  content: string;
  image?: { src: string; alt: string };
};

export type LocaleContent = {
  title: string;
  subtitle: string;
  category: string;
  readTime: string;
  authorName: string;
  authorBio: string;
  sections: Section[];
  backToBlog: string;
  tryDaily: string;
  practice: string;
  playMultiplayer: string;
};

const HERO = '/images/blog/netflix-word-games.jpg';
const IMG_MULTIPLAYER = '/images/blog/multiplayer-social.jpg';
const IMG_BRAIN = '/images/blog/brain-training-words.jpg';
const IMG_VOCAB = '/images/blog/vocabulary-building.jpg';

export const contentByLocale: Record<string, LocaleContent> = {
  en: {
    title: "Netflix Just Dropped a Word Game — And It's Not an Accident. 2026 Is the Year Word Games Took Over.",
    subtitle:
      "Streaming giants, daily-puzzle obsession, brain-training boom, and a TikTok-shaped social loop. Why every screen you own suddenly wants you spelling things.",
    category: 'Trends',
    readTime: '6 min read',
    authorName: 'Ohad Fisher',
    authorBio:
      "I make word games for a living and ruin my sleep schedule playing other people's word games for free. Bias acknowledged.",
    sections: [
      {
        content: `Netflix added a word game. At first glance, that sounds boring: streaming service adds puzzle, cool, fine.

But I care. I make word games. I have stared at letter grids the way a sommelier stares at wine, and I can tell you: Netflix — the company that paid Adam Sandler nine figures for movies you forgot existed — moving into the daily-word-game business is not small. It's a signal. Something shifted in the entertainment economy.

2026 is the year word games stopped being niche hobby for crossword grandmas and became actual prime-time content. Almost nobody is talking about why.`,
        image: { src: '/images/blog/netflix-word-games.jpg', alt: 'Neo-brutalist illustration of word games taking over a TV screen' },
      },
      {
        title: 'The Wordle bomb — and the four-year aftershock',
        content: `To understand why Netflix is launching word games in 2026, rewind to early 2022.

Josh Wardle, a Brooklyn engineer, built a tiny word puzzle for his girlfriend and named it after himself: Wordle. No ads. No accounts. No leaderboard. Just guess a five-letter word once a day.

Within four months, millions of daily players. The New York Times bought it for "low seven figures" — a number that has aged about as well as Blockbuster's stock options. Wordle became NYT Games' most reliable subscription driver. Connections, Strands, Spelling Bee grew from that single trapdoor.

Every product manager at every entertainment company watched and quietly thought: "we want THAT." Daily active users. Habit loops. Free virality. A streak you'd lose your mind to maintain. They all started building. By 2025, in a hurry. By 2026, it's a stampede.`,
      },
      {
        title: 'Why Netflix specifically — and why now',
        content: `Netflix is not a games company. They spend $17 billion on content yearly. So why invest in a daily word puzzle?

Because prestige TV's math broke. A flagship drama season costs hundreds of millions; subscribers churn the day it ends. A daily word game costs roughly one mid-tier engineer's annual salary to maintain — and gives users a reason to open the app every single day.

That's it: a word game is the cheapest retention tool in all of content. A 200kb engagement machine.

Netflix's games division tested this quietly for years — brand tie-ins first, then mobile originals. The word game move is where the strategy surfaces. They noticed the average viewer doesn't have 90 minutes for a movie, but absolutely has four minutes for a puzzle while waiting for the kettle to boil.

Disney+, Apple News+, Spotify — all moving the same direction. Every platform wanting daily opens is building a word puzzle around it.`,
        image: { src: '/images/blog/multiplayer-social.jpg', alt: 'Friends playing a word game together on phones' },
      },
      {
        title: 'The brain-training boom with actual receipts',
        content: `Word games used to live in the same drawer as Lumosity ads — vaguely "good for your brain," scientifically dubious.

That changed. A 2019 study tracked over 19,000 adults aged 50+ who regularly solved word puzzles. People who puzzled frequently scored cognitively as if they were eight to ten years younger on reasoning measures. Eight to ten years. That's peer-reviewed data, not marketing.

Parents let their kids play word games. Spouses don't nag about them. Therapists recommend them. It's the rare digital habit that produces zero guilt — and guilt is the silent killer of every other app on your phone.

Netflix knows this. Every platform knows it. "Brain-good" beats "brain-rot" in every focus group ever run.`,
        image: { src: '/images/blog/brain-training-words.jpg', alt: 'Word games and brain training illustration' },
      },
      {
        title: 'TikTok turned puzzles into a spectator sport',
        content: `Solving a puzzle used to be private. The subway. The bathroom. Not broadcast.

Then TikTok, Reels, and Shorts noticed that watching someone solve a puzzle in real-time with commentary is somehow incredibly watchable. The hashtag #wordgametok has billions of views. People film themselves solving Connections at 6am, post their Wordle streaks, livestream Strands with their grandma.

Wordle's "I got it in 3" share button was, in retrospect, one of the decade's quietly genius product decisions — it turned every solve into free marketing.

Multiplayer word games slot perfectly here. You can clip the moment you steal a 9-letter word from your friend at the buzzer. You can rage-react when the algorithm gives better letters to the opponent. The game becomes content; the content drives more game.

Wordle started it. The algorithm-driven social platforms are running it at industrial scale.`,
      },
      {
        title: 'The five-language reality',
        content: `Word games are finally going multilingual seriously.

For years they were anglocentric. Wordle mostly English. Spelling Bee only English. Hebrew and Japanese speakers were either out of luck or stuck with awkward translations.

That's changing fast. Hebrew word games pull real numbers in Israel. Japanese word games using kana grids are exploding. Spanish, Swedish, French — every major locale is getting first-class daily infrastructure.

This isn't charity; it's where the growth is. English markets are saturated. The next 100 million daily-puzzle players are going to speak Hebrew, Spanish, Hindi, Portuguese, Japanese, Indonesian. Whoever ships the best non-English daily word game in 2026 owns a category nobody's locked down yet.`,
        image: { src: '/images/blog/vocabulary-building.jpg', alt: 'Vocabulary growing across languages illustration' },
      },
      {
        title: 'What this means for you',
        content: `If you're a player: more good word games than ever, most free. The quality bar just rose.

If you're a developer: the gold rush is on, but the moat isn't "clever puzzle" anymore. Wordle taught everyone. The moat is now community, multilingual reach, real-time multiplayer, and being the first puzzle app users open every morning.

If you're a parent or teacher: this is the rare tech trend you can lean into. Word games hit vocabulary, language exposure, attention training. They're one of the few screens with actual upside.

And if you're me: I make word games during the era word games eat the world. Pretty good.

The Netflix headline is clear. The real story: an entire entertainment ecosystem just admitted that a 4x4 grid of letters is a better daily-engagement product than most prestige TV. Beautiful times. Time to go play.`,
      },
    ],
    backToBlog: 'Back to Blog',
    tryDaily: "Try Today's Puzzle",
    practice: "Practice Solo",
    playMultiplayer: "Play Multiplayer",
  },
  he: {
    title: 'נטפליקס שחררה משחק מילים — וזה לא צירוף מקרים. 2026 היא השנה שמשחקי מילים השתלטו על הכל.',
    subtitle:
      'ענקיות סטרימינג, התמכרות לפאזל היומי, גל אימון מוחי וטיק־טוק שהפך פתרון פאזלים לספורט צפייה. למה כל מסך שיש לכם פתאום רוצה שתאייתו.',
    category: 'טרנדים',
    readTime: '9 דקות קריאה',
    authorName: 'אוהד פישר',
    authorBio:
      'אני מפתח משחקי מילים למחייתי, ובלילה הורס לעצמי את לוח השינה כדי לשחק במשחקי מילים של אנשים אחרים. הטיה — מאושר.',
    sections: [
      {
        content: `אז נטפליקס הוסיפה משחק מילים.

נשמע משעמם? הגיוני. שירות סטרימינג מוסיף עוד פאזל קטן. מה כבר.

אבל זה לא קטן. אני מפתח משחקי מילים. אני בוהה בלוחות אותיות יותר ממה שבני אדם רגילים בוהים בנטפליקס עצמה — ואני אגיד לכם דבר אחד: כשנטפליקס, כן, *אותה נטפליקס* ששילמה לאדם סנדלר סכומי עתק על סרטים ששכחתם שיצאו, פתאום נכנסת לתחום הפאזל היומי — זה סימן.

2026 היא השנה שבה משחקי מילים הפסיקו להיות נישה לסבתות עם תשבץ והפכו לתוכן ראשי. וכמעט אף אחד לא מנתח למה.

נתקן את זה.`,
        image: { src: HERO, alt: 'איור ניאו־ברוטליסטי של משחקי מילים שמשתלטים על מסך טלוויזיה' },
      },
      {
        title: 'פצצת הוורדל — ושנים של רעידות משנה',
        content: `כדי להבין למה נטפליקס משיקה משחק מילים ב־2026, צריך לחזור לתחילת 2022.

ג׳וש וורדל, מהנדס מברוקלין, בנה פאזל קטן בשביל החברה שלו. קרא לו על שמו: Wordle. בלי פרסומות. בלי משתמשים. בלי לוח מובילים. רק תנחש מילה בת חמש אותיות פעם ביום.

תוך ארבעה חודשים — מיליוני שחקנים יומיים. הניו יורק טיימס קנה ב"שבע ספרות נמוכות". המספר הזה הזדקן בערך כמו מניות של בלוקבסטר. וורדל הפך למניע מנויים מרכזי, וקנקשנס וסטרנדס נולדו ישר אחריו.

ועם הזמן, כל מנהל מוצר בכל חברת בידור הסתכל על מספרי הריטנשן וחשב: "רגע — אני רוצה את זה". יוזרים יומיים, הרגלים, ויראליות חינם, סטריק שיגרום לכם לאבד שינה. כולם התחילו לבנות. ב־2025 — בלחץ. ב־2026 — מירוץ פראי.`,
      },
      {
        title: 'למה דווקא נטפליקס, ולמה עכשיו',
        content: `נטפליקס היא לא חברת משחקים. היא חברת "ננפח 17 מיליארד דולר על תוכן השנה". אז למה היא משקיעה הנדסה במשחק מילים יומי?

כי הכלכלה של פרסטיג' טי־וי נשברה.

עונה אחת של דרמה דגל עולה מאות מיליונים. מנויים נוטשים יום אחרי שהעונה נגמרת. לעומת זאת, משחק מילים יומי עולה בערך משכורת שנתית של מהנדס בינוני, ומחזיר לכם סיבה לפתוח את האפליקציה כל יום.

זה החישוב: משחק מילים הוא כלי ההחזקה הזול בעולם. כספומט אנגייג'מנט של 200 קילובייט.

חטיבת הגיימינג של נטפליקס בודקת את זה כבר שנים — קודם עם שיתופי פעולה (משחקי הדיונון, סטריינג'ר ת'ינגס), אז עם כותרים מקוריים. משחק המילים הוא רגע שבו האסטרטגיה יוצאת לאור. הם הבינו: לצופה הממוצע אין תמיד 90 דקות לסרט, אבל יש בהחלט ארבע דקות לפאזל בזמן שהקומקום רותח.

דיסני פלוס, אפל ניוז, ספוטיפיי — כולם פה. כל פלטפורמה שרוצה פתיחות יומיות בונה סביב פאזל מילים. זה הדפוס.`,
        image: { src: IMG_MULTIPLAYER, alt: 'חברים משחקים יחד במשחק מילים בטלפונים' },
      },
      {
        title: 'גל אימון המוח (ופעם אחת — באמת עם נתונים)',
        content: `פעם משחקי מילים גרו באותה מגירה כמו פרסומות לומיניטי — "טוב למוח", מבחינה מדעית — סימני שאלה.

זה השתנה. מחקר של ברוקר ועמיתים מ־2019 ב־*International Journal of Geriatric Psychiatry* עקב אחרי 19,000 מבוגרים שמשחקים פאזלי מילים. תפקודי המוח שלהם נמדדו כצעירים בשמונה עד עשר שנים מאלה שלא משחקים. שמונה עד עשר שנים. זה לא שיווק — זה דאטה שעבר עמיתים.

ב־2024 ו־2025 הגיעו מטא־אנליזות נוספות. פאזלים בקורלציה עם דחיית הידרדרות קוגניטיבית, שטף מילולי טוב יותר אצל דוברי שתי שפות, שיפור בקשב.

זה משנה הכל מסחרית: הורים נותנים לילדים. בני זוג לא מתלוננים. מטפלות ממליצות. זה ההרגל הדיגיטלי הנדיר שלא מייצר אשמה — והאשמה היא מה שהורגת כל אפליקציה אחרת בטלפון. נטפליקס יודעת. כולם יודעים. "טוב למוח" מנצח "ריקבון מוחי" בכל פוקוס גרופ אי פעם.`,
        image: { src: IMG_BRAIN, alt: 'איור של אימון מוח ומשחקי מילים' },
      },
      {
        title: 'טיק־טוק הפך פתרון פאזלים לספורט צפייה',
        content: `החלק שאף אחד לא ראה מגיע.

פעם פותרים פאזל מילים בשקט. ברכבת. בשירותים. לא משדרים את החוויה.

ואז טיק־טוק, רילז ושורטס גילו שלצפות במישהו פותר פאזל בזמן אמת זה איכשהו ממכר. ה־#wordgametok חוצה מיליארדי צפיות. אנשים מצלמים את עצמם פותרים קנקשנס בשש בבוקר. מפרסמים סטריקים של וורדל. עושים לייב על סטרנדס עם סבתא.

משחקי מילים הפכו פרפורמטיביים. קהילתיים. משהו שמשתפים, מסקרינים, רבים עליו עם זרים. כפתור ה"קיבלתי בשלוש" של וורדל היה, במבט לאחור, אחת ההחלטות הגאוניות בעשור. הוא הפך כל פתרון לשיווק חינם.

ובמשחקי מילים מולטיפלייר — כמו ה־real-time שלנו ב־LexiClash, או Words With Friends אסינכרוני — זה אפילו חזק יותר. אפשר לחתוך את הרגע שגנבתם מילה בת תשע אותיות לחבר בבאזר. אפשר להתעצבן על אלגוריתם שנתן לשחקן השני אותיות טובות יותר. המשחק הופך לתוכן, התוכן מניע עוד משחק.

זה הגלגל. וורדל התחיל. הפלטפורמות החברתיות מסיעות אותו תעשייתית.`,
      },
      {
        title: 'המציאות הרב־לשונית',
        content: `טרנד שפחות מדברים עליו ב־2026: משחקי מילים סוף סוף יוצאים מאנגלית בלבד.

שנים הזירה הייתה אנגלוצנטרית. וורדל באנגלית. תשבצים באנגלית. סְפֶּלִינג בִּי? אנגלית. מי שדיבר עברית או יפנית — או נתקע עם תרגום מגושם, או לא שיחק.

זה משתנה מהר. *צירוף*, *מילת היום*, ה־daily שלנו ב־LexiClash — מספרים אמיתיים בישראל. יפנית עם רשתות קאנא — מתפוצץ. ספרדית, שוודית, צרפתית — כל לוקאל מקבל תשתית פאזל יומית מן השורה.

זה לא לוקליזציה־צדקה; שם הצמיחה. השווקים האנגלוסקסיים רוויים. מאה המיליונים הבאים של פותרי פאזל יומיים יהיו דוברי עברית, ספרדית, הינדי, פורטוגזית, יפנית, אינדונזית. מי שישחרר את משחק המילים היומי הכי טוב בלא־אנגלית ב־2026 ינעל קטגוריה שעוד אף אחד לא תפס.

(הטיה קלה: אנחנו משחררים בחמש שפות כולל עברית RTL, מה שדומה מבחינת עיצוב לעמידת ידיים. אבל הטרנד הזה גדול מאיתנו.)`,
        image: { src: IMG_VOCAB, alt: 'איור של אוצר מילים שגדל בשפות שונות' },
      },
      {
        title: 'אז מה זה אומר לכם בפועל',
        content: `אם אתם שחקנים: יותר משחקי מילים טובים מאי פעם, רובם בחינם. רף האיכות עולה. פאזל יומי הוא הפיצ׳ר החובה־חובה. כל אפליקציה שאתם משתמשים בה תוסיף אחד כזה ב־18 חודשים הקרובים.

אם אתם מפתחים או מעצבים: בהלת זהב — אבל ההגנה כבר לא "תכננו פאזל חכם". וורדל לימד את כולם איך. ההגנה היום היא קהילה, רב־לשוניות, מולטיפלייר אמיתי, ולהיות הפאזל שמשתמשים פותחים ראשון בבוקר.

אם אתם הורים או מורים: אחד מהטרנדים הדיגיטליים הנדירים שאפשר לאמץ בלי לחשוש. אוצר מילים, חשיפה לשפה, אימון קשב. אחד הצגי "מסך" עם תועלת אמיתית.

ואם אתם אני: אני מפתח משחקי מילים בעידן שבו משחקי מילים אוכלים את העולם. נחמד.

הכותרת היא "נטפליקס משיקה משחק מילים". הסיפור האמיתי — מערכת בידור שלמה הודתה שלוח 4×4 של אותיות הוא מוצר אחזקה יומי טוב יותר מרוב הדרמות. זמנים מטורפים. זמנים יפים. עכשיו לכו לשחק.`,
      },
    ],
    backToBlog: 'חזרה לבלוג',
    tryDaily: 'נסו את הפאזל היומי',
    practice: 'תרגול לבד',
    playMultiplayer: 'שחק מרובה שחקנים',
  },

  sv: {
    title: 'Netflix släppte ett ordspel — och det är ingen tillfällighet. 2026 är året ordspelen tog över.',
    subtitle:
      'Streamingjättar, daglig pusselbesatthet, hjärnträningsboom och en TikTok-driven social loop. Varför varenda skärm du äger plötsligt vill att du stavar.',
    category: 'Trender',
    readTime: '9 min läsning',
    authorName: 'Ohad Fisher',
    authorBio: 'Bygger ordspel på heltid, förstör min sömn med andras ordspel på fritiden. Bias erkänd.',
    sections: [
      {
        content: `Så Netflix lade till ett ordspel.

Låter trist, jag fattar. Streamingtjänst lägger till litet pussel. Vem bryr sig.

Men jag bryr mig. Jag gör ordspel. Jag har stirrat på bokstavsrutnät i flera år som en sommelier stirrar på vin. Och jag säger: när Netflix — *Netflix*, samma som betalade Adam Sandler nio siffror för filmer du glömt finns — börjar göra dagliga ordpussel, är det inte litet. Det är en signal.

2026 är året ordspel slutade vara nischhobby för korsordsmormor och blev primetime-innehåll. Och nästan ingen pratar om varför.

Det fixar vi.`,
        image: { src: HERO, alt: 'Neo-brutalistisk illustration av ordspel som tar över en TV-skärm' },
      },
      {
        title: 'Wordle-bomben — och fyra års efterskalv',
        content: `För att förstå varför Netflix lanserar ordspel 2026, måste vi tillbaka till början av 2022.

Josh Wardle, en Brooklyn-ingenjör, byggde ett litet ordpussel åt sin flickvän. Döpte det efter sig själv: Wordle. Inga annonser. Inga konton. Ingen topplista. Bara: gissa ett ord på fem bokstäver om dagen.

Inom fyra månader hade det miljoner dagliga spelare. New York Times köpte det för "låga sjusiffriga belopp" — en summa som åldrats ungefär lika väl som Blockbusters aktier. Wordle blev en av NYT Games viktigaste prenumerationsdrivare. Connections, Strands, Spelling Bee växte fram på samma fundament.

Sedan 2022 har efterskalven inte stoppat. Varje produktchef i varje underhållningsbolag tittade på retentionsiffrorna och tänkte tyst: "vänta — jag vill ha *det*". Daglig användning. Vanloopar. Viralt. Noll marknadsföring. En streak du tappar förståndet över att hålla. Alla började bygga. 2025 — bråttom. 2026 — full rusning.`,
      },
      {
        title: 'Varför just Netflix, och varför nu',
        content: `Netflix är inget spelbolag. De är ett "vi spenderar 17 miljarder dollar på innehåll i år"-bolag. Så varför kasta ingenjörstimmar på ett dagligt ordpussel?

För att matten på prestige-TV gick sönder.

En säsong av en flaggskeppsdrama kostar hundratals miljoner. Prenumeranter lämnar dagen säsongen slutar. Ett dagligt ordspel kostar ungefär en mellannivåingenjörs årslön i underhåll — och ger användarna en anledning att öppna appen *varje* dag.

Det är räknesumman: ett ordspel är det billigaste möjliga retentionsverktyget i hela innehållsvärlden. En 200kb-stor engagemangsbankomat.

Netflix spelavdelning har testat detta i åratal — först med varumärkessamarbeten (Squid Game-utmaningar, Stranger Things-mini), sedan originaltitlar. Ordspelet är strategin som äntligen blir synlig. De har insett att den genomsnittliga tittaren inte alltid har 90 minuter över för en film, men absolut har fyra minuter för ett pussel medan tekokaren går.

Disney+, Apple News+, Spotify — alla rör sig åt samma håll. Varje plattform som vill ha dagliga öppningar bygger ett ordpussel runt det.`,
        image: { src: IMG_MULTIPLAYER, alt: 'Vänner spelar ordspel tillsammans på telefoner' },
      },
      {
        title: 'Hjärnträningsboomen (med riktig forskning denna gång)',
        content: `Förr bodde ordspel i samma låda som Lumosity-reklam — vagt "bra för hjärnan", vetenskapligt skakigt.

Det ändrades. En studie från 2019 (Brooker m.fl., *International Journal of Geriatric Psychiatry*) följde över 19 000 vuxna 50+ som spelade ordpussel. Deras hjärnfunktion testade som om de var åtta till tio år yngre på vissa resonemangsmått. Åtta till tio år. Det är peer-reviewed data, inte marknadsföring.

2024 och 2025 staplade fler metaanalyser på. Ordpussel korrelerar med fördröjd kognitiv nedgång, bättre verbalt flöde hos tvåspråkiga, förbättrad uppmärksamhetskontroll.

Detta spelar roll kommersiellt: föräldrar låter barnen spela. Partners gnatar inte. Terapeuter rekommenderar. Det är den sällsynta digitala vana som inte producerar skuld — och skuld är den tysta dödaren för varje annan app i din telefon. Netflix vet. Alla vet. "Hjärnnyttigt" slår "hjärnruttet" i varje fokusgrupp.`,
        image: { src: IMG_BRAIN, alt: 'Ordspel och hjärnträningsillustration' },
      },
      {
        title: 'TikTok förvandlade pussel till åskådarsport',
        content: `Här kommer delen ingen såg komma.

Förr var det privat att lösa ordpussel. Pendeltåget. Toaletten. Inte något man sände.

Sedan upptäckte TikTok, Reels och Shorts att "titta på någon lösa ett pussel i realtid med kommentar" är konstigt nog superlättittat. Hashtaggen #wordgametok har miljarder visningar. Folk filmar sig själva när de löser Connections klockan sex. Postar Wordle-streaks. Livesänder Strands med farmor.

Ordspel blev performativa. Sociala. Något att dela, screenshotta, bråka om med främlingar. "Jag fick det på 3"-knappen i Wordle var i efterhand ett av decenniets mest geniala produktbeslut — den gjorde varje lösning till gratis marknadsföring.

I flerspelar-ordspel — som vår egen realtid på LexiClash, eller Words With Friends asynkront — blir det ännu starkare. Klippet där du knycker ett 9-bokstavsord i sista sekunden. Raseriet när algoritmen ger motspelaren bättre bokstäver. Spelet blir innehåll, innehållet driver mer spel.

Det är hjulet. Wordle satte fart. Sociala plattformar kör det industriellt.`,
      },
      {
        title: 'Den flerspråkiga verkligheten',
        content: `En mindre uppmärksammad 2026-trend: ordspel går äntligen flerspråkiga på allvar.

I åratal var ordspel anglocentriska. Wordle på engelska, mestadels. Korsord på engelska, mestadels. Spelling Bee bara på engelska. Talade du svenska, hebreiska eller japanska var du antingen utan eller fast med klumpiga översättningar.

Det ändras snabbt. Hebreiska ordspel — *Tzeruf*, *Milat HaYom*, vår egen LexiClash daily — drar riktiga siffror. Japanska ordspel med kana-rutnät exploderar. Svenska, spanska, franska — varje större lokal får förstaklassens dagliga ordinfrastruktur.

Det är inte välgörenhetslokalisering; där finns tillväxten. Engelskspråkiga marknader är mättade. De nästa 100 miljonerna dagliga pusselspelare blir hebreiska, spanska, hindi, portugisiska, japanska, indonesiska. Den som släpper det bästa icke-engelska dagliga ordspelet 2026 låser en kategori ingen ännu äger.

(Liten bias: vi släpper på fem språk inklusive hebreisk RTL, vilket designmässigt motsvarar en handstående volt. Men trenden är större än oss.)`,
        image: { src: IMG_VOCAB, alt: 'Ordförråd som växer över språk' },
      },
      {
        title: 'Vad innebär det egentligen för dig',
        content: `Är du spelare: fler bra ordspel än någonsin, mest gratis. Kvalitetsribban höjs. Dagliga pussel är den nya självklara funktionen — vänta dig att varje underhållningsapp lägger till en de kommande 18 månaderna.

Är du utvecklare eller designer: guldrush, men vallgraven är inte längre "gör ett smart pussel". Wordle lärde alla det. Vallgraven är community, flerspråkighet, realtids-multiplayer — och att vara den första pusselapp användarna öppnar varje morgon.

Är du förälder eller lärare: en av de få teknologi-trenderna du kan luta dig in i utan att rycka. Ordförråd, språkexponering, uppmärksamhetsträning. En av få "skärmar" med faktisk uppsida.

Är du jag: jag bygger ordspel under den era ordspel äter världen. Helt okej.

Rubriken är "Netflix lanserar ordspel". Den verkliga storyn är att ett helt underhållningsekosystem just erkände att ett 4×4-rutnät av bokstäver är en bättre daglig engagemangsprodukt än de flesta prestige-dramor. Vilda tider. Vackra tider. Dags att spela.`,
      },
    ],
    backToBlog: 'Tillbaka till Bloggen',
    tryDaily: 'Prova Dagens Pussel',
    practice: 'Träna Solo',
    playMultiplayer: 'Spela Multiplayer',
  },

  ja: {
    title: 'Netflixがワードゲームを投入。偶然じゃない。2026年はワードゲームが世界を支配した年だ。',
    subtitle:
      'ストリーミング大手、デイリーパズル中毒、脳トレブーム、TikTok型ソーシャルループ。なぜあなたの全画面が突然「綴れ」と言ってくるのか。',
    category: 'トレンド',
    readTime: '9分で読める',
    authorName: 'オハド・フィッシャー',
    authorBio: '本業はワードゲーム開発、副業は他人のワードゲームで睡眠時間を破壊すること。バイアスは認めます。',
    sections: [
      {
        content: `Netflixがワードゲームを追加した。

最初に聞くと退屈なニュースだ。配信サービスが小さなパズルを足した、ふーん。

でも僕は気にしてる。ワードゲームを作る側だから。ここ数年、文字グリッドをソムリエがワインを見るように凝視してきた。だから言う：Netflix、そう、アダム・サンドラーに9桁の金を払って忘れ去られた映画を作らせた*あの*Netflixが、デイリーワードパズル業界に参入した。これは小さくない。シグナルだ。

2026年はワードゲームがクロスワード好きのおばあちゃんのニッチ趣味から、本格的なプライムタイム・コンテンツに昇格した年。そして、なぜそうなったかを誰もきちんと話していない。

ここで話す。`,
        image: { src: HERO, alt: 'TV画面を支配するワードゲームのネオブルータリストイラスト' },
      },
      {
        title: 'Wordleの爆撃 — 4年続く余震',
        content: `2026年にNetflixがワードゲームを出す理由を理解するには、2022年初頭に戻る必要がある。

ブルックリン在住のエンジニア、ジョシュ・ワードルが、彼女のために小さな単語パズルを作った。自分の名前にちなんでWordleと命名。広告なし。アカウントなし。ランキングなし。1日1回、5文字の単語を当てるだけ。

4ヶ月でデイリーユーザー数百万。ニューヨーク・タイムズが「7桁前半」で買収。この数字の老化具合はBlockbusterの株とほぼ同じ — 全然耐えられていない。WordleはNYT Gamesの主要な購読ドライバーになり、Connections、Strands、Spelling Beeはこの一発から派生した。

それ以来、余震は止まらない。各エンタメ会社のプロダクトマネージャーが、リテンションの数字を見て静かに思った：「待って、それ欲しい」。日次アクティブ。習慣ループ。バイラル。マーケコストゼロ。連続記録を絶対に切らせたくない欲望。みんな作り始めた。2025年で急いだ。2026年で完全な金鉱ラッシュ。`,
      },
      {
        title: 'なぜNetflixで、なぜ今',
        content: `Netflixはゲーム会社じゃない。「今年は170億ドルをコンテンツに突っ込む」会社だ。なら、なぜエンジニアリング時間をデイリーワードパズルに?

プレステージTVの算数が壊れたから。

旗艦ドラマ1シーズンで数百億円。視聴者はシーズン終了の翌日に解約する。一方、デイリーワードゲームの維持費はだいたい中堅エンジニア1人の年収。そして毎日アプリを開く理由を提供する。

これが算数：ワードゲームはエンタメ業界で最安のリテンションツール。200kbの「エンゲージメント現金自動引出機」。

Netflixのゲーム部門は何年もこっそり試してきた — まずブランド連携(イカゲームのチャレンジ、ストレンジャー・シングスのミニ)、次にオリジナルモバイル。ワードゲームは、その戦略がついに表に出た瞬間。平均的視聴者は映画90分の余裕は常にあるわけじゃないが、ヤカンが沸くまでの4分のパズルは確実にある — そう気づいた。

Disney+、Apple News+、Spotify — 同じ方向に動いている。日次オープンを欲しい全プラットフォームが、ワードパズルを軸に組んでいる。`,
        image: { src: IMG_MULTIPLAYER, alt: 'スマホで一緒にワードゲームを遊ぶ友達' },
      },
      {
        title: '脳トレブーム(今回はちゃんと根拠ある)',
        content: `かつてワードゲームはLumosity広告と同じ引き出しに入っていた — 漠然と「脳に良い」、科学的にはあやしい。

それが変わった。2019年の研究(Brooker他、*International Journal of Geriatric Psychiatry*)が50歳以上の19,000人超を追跡。ワードパズルを頻繁に解く人の脳機能は、特定の推論指標で8〜10歳若く測定された。8〜10歳。マーケコピーじゃなく、査読済みデータ。

2024年と2025年でメタアナリシスが追加。ワードパズルは認知機能低下の遅延、バイリンガルの言語流暢性向上、注意制御の改善と相関。

商業的にここが効く：親が子に許可する。配偶者が文句を言わない。セラピストが推奨する。罪悪感を生まない稀少なデジタル習慣 — そして罪悪感は他のあらゆるアプリの静かな殺し屋。Netflixは知ってる。みんな知ってる。「脳に良い」は「脳腐り」にフォーカスグループで毎回勝つ。`,
        image: { src: IMG_BRAIN, alt: 'ワードゲームと脳トレのイラスト' },
      },
      {
        title: 'TikTokがパズルを観戦スポーツにした',
        content: `誰も予想しなかった部分。

昔はワードパズルを解くのはプライベートだった。電車で。トイレで。経験を放送するものではなかった。

そしてTikTok、Reels、Shortsが気づいた：「リアルタイムで誰かがパズルを解くのを実況付きで観る」のがなぜか異常に観られる。#wordgametokの再生数は数十億。朝6時にConnectionsを解く自分を撮影。Wordleの連続記録を投稿。おばあちゃんとStrandsをライブ配信。

ワードゲームはパフォーマンス化。コミュニティ化。シェア、スクショ、見知らぬ他人と議論するもの。Wordleの「3回で当てた」シェアボタンは、振り返ると今世紀屈指の地味に天才的なプロダクト判断 — すべての解答を無料広告に変えた。

LexiClashのリアルタイム対戦やWords With Friendsの非同期型のようなマルチプレイヤーでさらに強い。9文字単語をブザー直前で奪った瞬間のクリップ。アルゴリズムが対戦相手にいい文字を渡したと激おこリアクション。ゲームがコンテンツになり、コンテンツがゲームをさらに駆動。

これがフライホイール。Wordleが起動。アルゴリズム駆動のソーシャル基盤が産業規模で回している。`,
      },
      {
        title: '多言語化という現実',
        content: `2026年のあまり語られないトレンド：ワードゲームがついに本気で多言語化している。

長年、ワードゲームは英語中心だった。Wordleは主に英語。クロスワードも主に英語。Spelling Beeは英語のみ。日本語やヘブライ語話者は、運が悪いか、ぎこちない翻訳で我慢するかだった。

これが速く変わっている。日本語のかなグリッド系は爆発的に伸びている。ヘブライ語の*Tzeruf*や*Milat HaYom*、僕らのLexiClashデイリーは実数で動いている。スウェーデン語、スペイン語、フランス語 — 主要ロケールが第一級のデイリーパズルインフラを得ている。

慈善ローカライズじゃない。成長があるのがそこ。英語圏は飽和。次の1億人のデイリーパズルプレイヤーは、ヘブライ語、スペイン語、ヒンディー語、ポルトガル語、日本語、インドネシア語の話者になる。2026年に最高の非英語デイリーワードゲームを出した者が、まだ誰もロックしていないカテゴリを取る。

(若干バイアス：僕らはヘブライ語RTL含む5言語で配信している。デザイン的には倒立逆立ちに相当する。でも、このトレンドは僕ら以上に大きい。)`,
        image: { src: IMG_VOCAB, alt: '多言語にわたって伸びる語彙のイラスト' },
      },
      {
        title: 'で、これがあなたにとって何を意味するか',
        content: `プレイヤーなら：かつてないほど良いワードゲームの選択肢、ほぼ全部無料。品質バーが上がった。デイリーパズルは新しい必須機能 — 今後18ヶ月、使うエンタメアプリ全部に追加される見込み。

開発者・デザイナーなら：ゴールドラッシュ、しかし堀はもう「巧妙なパズルを作る」じゃない。Wordleが全員に教えた。今の堀はコミュニティ、多言語、リアルタイム対戦 — そして毎朝最初に開かれるパズルになること。

親や先生なら：怯まずに乗れる稀少なテクトレンド。語彙、言語接触、注意訓練。実際にメリットがある「画面」のひとつ。

僕の場合：ワードゲームが世界を食う時代にワードゲームを作って暮らしている。なかなかいい。

見出しは「Netflixがワードゲームを発表」。本当のストーリーは、エンタメエコシステム全体が、4×4の文字グリッドが大半のプレステージドラマより優秀なデイリーエンゲージメント製品だと認めたこと。荒れ狂う時代。美しい時代。さあ、遊ぼう。`,
      },
    ],
    backToBlog: 'ブログに戻る',
    tryDaily: '今日のパズルを解く',
    practice: 'ソロ練習',
    playMultiplayer: 'マルチプレイヤーで遊ぶ',
  },

  es: {
    title: 'Netflix acaba de lanzar un juego de palabras — y no es casualidad. 2026 es el año en que los juegos de palabras lo conquistaron todo.',
    subtitle:
      'Gigantes del streaming, obsesión por el puzzle diario, boom del entrenamiento cerebral y un bucle social al estilo TikTok. Por qué cada pantalla que tienes de repente quiere que deletrees.',
    category: 'Tendencias',
    readTime: '9 min de lectura',
    authorName: 'Ohad Fisher',
    authorBio:
      'Hago juegos de palabras profesionalmente y arruino mi sueño jugando los de otros gratis. Sesgo confirmado.',
    sections: [
      {
        content: `Así que Netflix añadió un juego de palabras.

Suena aburrido al principio, lo sé. Servicio de streaming agrega pequeño puzzle. Bueno, ya. ¿A quién le importa?

A mí. Hago juegos de palabras. Llevo años mirando rejillas de letras como un sommelier mira el vino. Y te digo una cosa: que Netflix — *Netflix*, los que pagaron a Adam Sandler nueve cifras por películas que olvidaste que existen — ahora esté en el negocio del juego de palabras diario, no es algo pequeño. Es una señal. Algo cambió de raíz en la economía del entretenimiento.

2026 es el año en que los juegos de palabras dejaron de ser hobby de nicho para abuelas con crucigrama y se convirtieron en contenido prime-time real. Y casi nadie está hablando de por qué.

Vamos a arreglar eso.`,
        image: { src: HERO, alt: 'Ilustración neo-brutalista de juegos de palabras tomando una pantalla de TV' },
      },
      {
        title: 'La bomba Wordle — y cuatro años de réplicas',
        content: `Para entender por qué Netflix lanza juegos de palabras en 2026, hay que volver a principios de 2022.

Josh Wardle, ingeniero de Brooklyn, le hizo un puzzle pequeño a su novia. Lo bautizó con su apellido: Wordle. Sin anuncios. Sin cuentas. Sin tabla de líderes. Solo: adivina una palabra de cinco letras al día.

En cuatro meses, millones de jugadores diarios. The New York Times lo compró por "siete cifras bajas" — un número que ha envejecido tan bien como las acciones de Blockbuster. Wordle se volvió uno de los principales motores de suscripción de NYT Games. Connections, Strands, Spelling Bee crecieron sobre esa misma trampilla.

Desde entonces, las réplicas no han parado. Cada product manager de cada empresa de entretenimiento miró las métricas de retención y pensó en silencio: "espera — quiero *eso*". Usuarios diarios. Bucles de hábito. Viralidad. Cero gasto de marketing. Una racha que te enloquece mantener. Todos empezaron a construir. En 2025, con prisa. En 2026, en estampida.`,
      },
      {
        title: 'Por qué Netflix específicamente, y por qué ahora',
        content: `Netflix no es una compañía de juegos. Es una compañía de "vamos a gastar 17 mil millones en contenido este año". Entonces, ¿por qué meter horas de ingeniería en un puzzle de palabras diario?

Porque las matemáticas del prestige TV se rompieron.

Una temporada de un drama insignia cuesta cientos de millones. Los suscriptores se van el día que termina la temporada. Mientras tanto, un juego de palabras diario cuesta más o menos el salario anual de un ingeniero de nivel medio para mantener — y le da a la gente una razón para abrir la app *cada* día.

Esa es la cuenta: un juego de palabras es la herramienta de retención más barata en todo el mundo del contenido. Un cajero automático de engagement de 200kb.

La división de juegos de Netflix lleva años probándolo en silencio — primero con cruces de marca (retos de Squid Game, minis de Stranger Things), luego con títulos móviles originales. El juego de palabras es el momento en que la estrategia se hace pública. Notaron que el espectador promedio no siempre tiene 90 minutos para una película, pero seguro tiene cuatro minutos para un puzzle mientras hierve la tetera.

Disney+, Apple News+, Spotify — todos van hacia ahí. Cada plataforma que quiere aperturas diarias está construyendo un puzzle de palabras alrededor.`,
        image: { src: IMG_MULTIPLAYER, alt: 'Amigos jugando un juego de palabras juntos en sus móviles' },
      },
      {
        title: 'El boom del entrenamiento cerebral (esta vez con datos)',
        content: `Antes los juegos de palabras vivían en el mismo cajón que los anuncios de Lumosity — vagamente "buenos para el cerebro", científicamente dudosos.

Eso cambió. Un estudio de 2019 (Brooker et al., *International Journal of Geriatric Psychiatry*) siguió a más de 19.000 adultos de 50+ que jugaban puzzles de palabras. Su función cerebral medía como si fueran ocho a diez años más jóvenes en ciertas medidas de razonamiento. Ocho a diez años. No es marketing — es data revisada por pares.

En 2024 y 2025 llegaron más metaanálisis. Los puzzles de palabras correlacionan con retraso del declive cognitivo, mejor fluidez verbal en bilingües, mejor control de la atención.

Esto importa comercialmente: los padres dejan a sus hijos jugar. Las parejas no se quejan. Los terapeutas recomiendan. Es el hábito digital raro que no produce culpa — y la culpa es la asesina silenciosa de toda otra app en tu teléfono. Netflix lo sabe. Todos lo saben. "Bueno para el cerebro" le gana a "podredumbre cerebral" en cualquier focus group.`,
        image: { src: IMG_BRAIN, alt: 'Ilustración de juegos de palabras y entrenamiento cerebral' },
      },
      {
        title: 'TikTok convirtió los puzzles en deporte de espectadores',
        content: `Aquí está la parte que nadie vio venir.

Antes, resolver un puzzle era privado. En el metro. En el baño. NO se transmitía la experiencia.

Luego TikTok, Reels y Shorts notaron que "ver a alguien resolver un puzzle en tiempo real con comentarios" es, sorprendentemente, increíblemente mirable. El hashtag #wordgametok tiene miles de millones de vistas. La gente se filma resolviendo Connections a las 6am. Postea sus rachas de Wordle. Hace en vivo Strands con la abuela.

Los juegos de palabras se volvieron performativos. Comunitarios. Algo para compartir, capturar, discutir con desconocidos. El botón "lo saqué en 3" de Wordle fue, en retrospectiva, una de las decisiones de producto más silenciosamente geniales de la década — convirtió cada solución en marketing gratis.

En multijugador — como nuestras partidas en tiempo real en LexiClash, o Words With Friends asíncrono — todavía más fuerte. Puedes clipear el momento en que le robás una palabra de 9 letras a tu amigo en el último segundo. Putear cuando el algoritmo le dio mejores letras al otro. El juego se vuelve contenido, el contenido empuja más juego.

Esa es la rueda. Wordle la encendió. Las plataformas algorítmicas la corren a escala industrial.`,
      },
      {
        title: 'La realidad multilingüe',
        content: `Una tendencia 2026 menos discutida: los juegos de palabras finalmente se están volviendo multilingües en serio.

Durante años fueron anglocéntricos. Wordle, mayormente en inglés. Crucigramas, mayormente en inglés. Spelling Bee, literalmente solo inglés. Si hablabas español, hebreo o japonés, o no había, o estabas con traducciones torpes.

Eso cambia rápido. Juegos de palabras en hebreo — *Tzeruf*, *Milat HaYom*, nuestro propio LexiClash daily — mueven números reales. Japonés con grillas de kana, explosivo. Español, sueco, francés — cada locale grande recibe infraestructura diaria de primera clase.

No es localización por caridad; ahí está el crecimiento. Los mercados anglosajones están saturados. Los próximos 100 millones de jugadores diarios de puzzle van a ser hispanohablantes, hebreohablantes, hindi, portugués, japonés, indonesio. Quien lance el mejor juego diario en idioma no inglés en 2026 cierra una categoría que nadie tiene aún.

(Sesgo declarado: lanzamos en cinco idiomas incluyendo hebreo RTL, lo cual en términos de diseño equivale a hacer una vertical. Pero la tendencia es más grande que nosotros.)`,
        image: { src: IMG_VOCAB, alt: 'Ilustración de vocabulario creciendo a través de idiomas' },
      },
      {
        title: 'Entonces, ¿qué significa Netflix entrando al juego para vos',
        content: `Si sos jugador: más juegos de palabras buenos para elegir que nunca, y la mayoría son gratis. La vara de calidad subió. Los puzzles diarios son la nueva feature obligatoria — esperá que cada app de entretenimiento agregue uno en los próximos 18 meses.

Si sos desarrollador o diseñador: la fiebre del oro está activa, pero la trinchera ya no es "diseñar un puzzle ingenioso". Wordle se lo enseñó a todos. La trinchera ahora es comunidad, cobertura multilingüe, multijugador en tiempo real, y — sí, qué incómodo — ser la primera app de puzzle que los usuarios abren cada mañana.

Si sos padre, madre o profe: una de las raras tendencias tech a las que podés sumarte sin temblar. Vocabulario, exposición al idioma, entrenamiento de atención. Una de las pocas "pantallas" con beneficio real.

Si sos yo: hago juegos de palabras durante la era en que los juegos de palabras se comen el mundo. Bastante bueno.

El titular es "Netflix lanza un juego de palabras". La verdadera historia es que un ecosistema de entretenimiento entero acaba de admitir que una grilla de letras 4×4 es mejor producto de engagement diario que la mayoría de los dramas de prestigio. Tiempos salvajes. Tiempos hermosos. Hora de jugar.`,
      },
    ],
    backToBlog: 'Volver al Blog',
    tryDaily: 'Probar el Puzzle de Hoy',
    practice: 'Practicar Solo',
    playMultiplayer: 'Jugar Scrabble Online en Español',
  },
};
