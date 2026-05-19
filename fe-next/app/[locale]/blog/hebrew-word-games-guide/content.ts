// Article content — "Ohad Fisher" persona
// Each language is culturally adapted, NOT translated

export type LocaleContent = {
  title: string;
  subtitle: string;
  category: string;
  readTime: string;
  authorName: string;
  authorBio: string;
  sections: Array<{
    title?: string;
    content: string;
  }>;
  backToBlog: string;
  tryDaily: string;
  practice: string;
};

export const contentByLocale: Record<string, LocaleContent> = {
  en: {
    title: 'Playing Word Games in Hebrew: The Beautiful Chaos of Right-to-Left',
    subtitle: 'Root systems, missing vowels, and why designing a word game for Hebrew is like solving a puzzle inside a puzzle.',
    category: 'Language',
    readTime: '7 min read',
    authorName: 'Ohad Fisher',
    authorBio: 'Multilingual word game obsessive who spent six months learning Hebrew roots just to be less terrible at Israeli Scrabble nights.',
    sections: [
      {
        content: `Hebrew word games are fundamentally different from English ones. Not harder, not easier. Different at the DNA level.

In English, you scan a grid left to right, searching for letter patterns your brain has memorized. C-A-T. T-H-E.

In Hebrew, your brain does something much stranger. It reconstructs words from consonant skeletons, mentally inserts vowels that aren't written, navigates a right-to-left reading direction that flips your spatial processing, and recognizes that three seemingly random letters might share a root connecting them to dozens of different words.

I fell in love with Hebrew word games two years ago at a Scrabble night in Tel Aviv. I walked in knowing 200 Hebrew words and lost spectacularly. But I understood something no textbook had ever made clear: how the Hebrew language actually works.

This article is about that understanding. Whether you're a native speaker curious about your language, a learner trying to level up, or a designer wondering how to build RTL word games, you'll find something here.`,
      },
      {
        title: 'The shoresh system: three letters unlock everything',
        content: `The core difference between Hebrew and English: the shoresh (שורש), the three-letter root that carries a word's meaning.

In English, "cat" and "catalog" are unrelated. In Hebrew, nearly every word derives from a three-letter root. Insert that root into different templates (mishkalim), and you generate a family of related words.

Take כ-ת-ב (K-T-V), meaning "write":
- כָּתַב (katav) — he wrote
- כּוֹתֵב (kotev) — writes / writer
- כְּתִיבָה (ktiva) — writing (the act)
- מִכְתָּב (mikhtav) — letter (correspondence)
- כַּתָּב (katav) — reporter
- כְּתוֹבֶת (ktovet) — address
- הַכְתָּבָה (hakhtava) — dictation

Eight words from three letters. That's what makes Hebrew word games intellectually thrilling. Spotting כ, ת, and ב scattered across a grid doesn't just mean "three letters." Your brain lights up: those three letters are a root. You know immediately there's a family of words hiding there.

I once found seven different words from a single three-letter root in one round. My Israeli friend nodded and said, "Now you're thinking in Hebrew." Best compliment I've received.

The research backs this. Shimron's work on Hebrew reading psychology (2006) shows native speakers automatically activate all morphologically related forms when they encounter a root — their brains don't just retrieve individual words, they activate whole families. Learning that system is why root-based study beats traditional vocabulary drilling for Hebrew learners.`,
      },
      {
        title: 'No vowels written, but your brain supplies them',
        content: `Written Hebrew omits vowels. Native speakers simply know them. It's like reading "Cn y rd ths?" — except Hebrew speakers do it effortlessly because the language was designed this way.

In formal texts, tiny dots and dashes (nikkud) mark vowels. In everyday Hebrew — newspapers, text messages, word games — the nikkud is absent. You're reading consonant skeletons, and your brain fills in the vowels.

For word games, this means the same consonant sequence can represent multiple words depending on vowel patterns. ד-ב-ר could be davar (thing), diber (spoke), dever (plague), or dvar (word of). Context usually disambiguates, but in a word game grid, context doesn't exist. Players need to know all possible readings.

The information density is higher. Each letter carries semantic weight both as consonant and as an implied vowel pattern. Hebrew Scrabble players describe this as "reading between the letters" — you're not just seeing what's there, you're seeing what could be there based on valid vowel patterns.

When I first started playing, I was terrible at this. I'd see three consonants and freeze. My Israeli friends would see the same three letters and instantly think of four different words. The gap between beginner and native is enormous, and it comes entirely from vowel intuition — automatic knowledge of which patterns are valid. Rivka Ravid's research on Hebrew morphological spelling (2012) confirms this: readers who internalize vowel patterns perform exponentially better at word recognition speed.`,
      },
      {
        title: 'RTL design and why everything flips',
        content: `Hebrew reads right-to-left. This single fact creates design challenges that are genuinely fascinating.

Research from the University of Haifa (2018) shows Hebrew speakers have rightward spatial attention bias, while English speakers show leftward bias. Hebrew players literally scan grids from the right side first, finding different words in different order.

For game designers, this means everything requires mirroring: arrows flip, shadows cast in opposite directions (LexiClash flips shadows from 4px to -4px), progress bars fill backward, animations slide in from the right. Text input requires special care — new letters appear left of the growing word, pushing rightward.

The hardest part: bidirectional text. Hebrew passages that include English words, numbers, or abbreviations switch direction mid-line. This isn't just cosmetic. In a game UI with animations and custom layouts, BiDi text requires careful, manual testing. I've seen games clearly tested only in English — the Hebrew feels like wearing a shirt inside out.

The best Hebrew word games don't just work in RTL. They think in RTL. The UI feels native from the first moment. That's the differentiator.`,
      },
      {
        title: 'Word game culture and modern Hebrew slang',
        content: `Israel has a word game culture as rich as any country. Scrabble (שבץ נא, "Shvatz Na") has a dedicated following. Hebrew crosswords (tashbetzim) are a Friday ritual. Friday newspapers produce celebrities like crossword designer Dan Orion.

The root system makes wordplay inevitable. When words share consonant patterns, double meanings abound. Israeli humor relies heavily on this. You see it in shop names and street art throughout Tel Aviv.

Modern Hebrew constantly generates new words through its root system. The revival and modernization of Hebrew in the late 19th/20th centuries (Ben-Yehuda, Academy of the Hebrew Language) established the principle: new concepts fit into ancient root patterns. "Computer" (מחשב, makhshev) comes from the root ח-ש-ב (to think/calculate). "Electricity" (חשמל, khashmal) was pulled from an obscure biblical word in Ezekiel referring to a mysterious gleaming substance.

This means Hebrew has layers. Ancient words coexist with modern coinages. A single game might include a 3,000-year-old Torah word sitting next to a word coined in 2015 for something that didn't exist before smartphones.

Modern Hebrew slang is its own fascination. Words borrowed from Arabic (יאללה — yalla, אחלה — akhla), English (קול — cool), Russian (especially from 1990s immigration), and homegrown creations that playfully twist the root system. "Fraier" (sucker, from Yiddish) is culturally loaded — "don't be a fraier" is practically a national motto. Social media accelerated Hebrew word creation. Words like לייקק (laikek, to "like"), תיירג (tairag, to "tag"), and שיירר (shairar, to "share") follow proper Hebrew morphological rules — English concepts dressed in Hebrew grammar.

A competitive Israeli Scrabble player once told me: "In English, you memorize words. In Hebrew, you understand structures. Once you know the patterns, new words aren't surprises — they're predictions." That captures the essence of the Hebrew word game experience.`,
      },
      {
        title: 'Why you should play Hebrew word games (even if you are terrible)',
        content: `Hebrew word games are harder than English ones. The learning curve is steeper, the cognitive demands higher, and native speakers have an enormous advantage from reading vowel-less consonants since childhood.

But they are richer. More layered. More rewarding when things click.

Finding a word in Hebrew feels like excavating something. You are uncovering a root that might be 3,000 years old, recognizing a morphological pattern, reconstructing a word that existed in some form in biblical times and still works today. That is genuinely different from finding WORD in a grid.

If you have never played word games in Hebrew, start. You will be terrible. Everyone is at first. But somewhere between your first three-letter word and your first root-based revelation, you will understand what I mean. Hebrew word games are not just games. They are a different way of seeing language itself.

And if you are a native Hebrew speaker who has been nodding along this whole article thinking "yeah, obviously" — thank you for your patience. Now teach me the root for "gratitude." I know it starts with ת, and I will probably never get it right.`,
      },
      {
        content: `Sources:
- Shimron, J. (2006). "Reading Hebrew: The Language and the Psychology of Reading It." Lawrence Erlbaum Associates.
- Ravid, D. (2012). "Spelling Morphology: The Psycholinguistics of Hebrew Spelling." Springer.
- University of Haifa (2018). Spatial attention bias in right-to-left vs left-to-right readers. Cognitive Psychology Research Lab.
- Ben-Yehuda Project — Comprehensive online Hebrew dictionary and historical corpus.
- Academy of the Hebrew Language — Official Hebrew word adoption and standardization body.`,
      },
    ],
    backToBlog: 'Back to Blog',
    tryDaily: 'Daily Challenge',
    practice: 'Practice',
  },
  he: {
    title: 'לשחק משחקי מילים בעברית: הכאוס היפה של ימין-לשמאל',
    subtitle: 'שורשים, ניקוד חסר, ולמה לעצב משחק מילים לעברית זה כמו לפתור חידה בתוך חידה. מכתב אהבה לשפה הכי עקשנית שאי פעם שיחקתי בה.',
    category: 'שפה',
    readTime: 'זמן קריאה: 12 דקות',
    authorName: 'חנון המילים',
    authorBio: 'אובססיבי רב-לשוני של משחקי מילים שבילה שישה חודשים בלימוד שורשים עבריים רק כדי להיות פחות גרוע בערבי סקרבל ישראליים.',
    sections: [
      {
        content: `לשחק משחקי מילים בעברית היא חוויה שונה מהותית מלשחק באנגלית. לא יותר קשה, לא יותר קל — שונה. שונה מבחינה מבנית ברמת ה-DNA.

באנגלית, מסתכלים על לוח של אותיות והמוח מחפש דפוסים מוכרים. C-A-T, T-H-E. סורקים משמאל לימין, מלמעלה למטה, וצירופי אותיות קופצים לעיניים כי ראיתם אותם מיליון פעמים.

בעברית, מסתכלים על לוח של אותיות והמוח צריך לעשות משהו הרבה יותר מעניין. הוא צריך לשחזר מילים משלדי עיצורים, להכניס מנטלית תנועות שלא נמצאות שם, לנווט כיוון קריאה מימין לשמאל שמהפך את העיבוד המרחבי שלכם, ו — וזה החלק המטורף — לזהות ששלוש אותיות שנראות אקראיות עשויות לחלוק שורש שמחבר אותן לעשרות מילים שונות.

התאהבתי במשחקי מילים בעברית לפני בערך שנתיים, כשחברה ישראלית הזמינה אותי לערב סקרבל בתל אביב. נכנסתי כשאני יודעת אולי 200 מילים בעברית. יצאתי ארבע שעות אחר כך אחרי שהפסדתי באופן מרהיב, אבל עם הבנה עמוקה של איך השפה העברית עובדת — משהו ששום ספר לימוד אף פעם לא הצליח להעביר.`,
      },
      {
        title: 'למה עברית מיוחדת למשחקי מילים: מערכת השורשים',
        content: `כל שחקן משחקי מילים בעברית צריך להבין מושג אחד שאין לו מקבילה אמיתית באנגלית: השורש.

באנגלית, מילים הן בעיקר רצפים שרירותיים של אותיות. CAT לא קשורה ל-CATALOG אלא במקרה. בעברית, כמעט כל מילה בשפה נגזרת משורש תלת-אותי שנושא משמעות ליבה.

קחו את השורש כ-ת-ב (כתיבה): כָּתַב, כּוֹתֵב, כְּתִיבָה, מִכְתָּב, כַּתָּב, כְּתוֹבֶת, הַכְתָּבָה, תַּכְתִּיב — שמונה מילים משלוש אותיות.

כששחקנים רואים כ, ת, ב מפוזרות על הלוח, המוח נדלק: זה שורש. מיד יודעים שיש משפחה של מילים מתחבאת. השאלה היא איזו מילה אפשר ליצור עם שאר האותיות.

זה מה שהופך משחקי מילים בעברית למרגשים אינטלקטואלית. כל שורש שמזהים הוא מפתח שפותח דלתות רבות.

פעם שיחקתי סיבוב שבו מצאתי שבע מילים שונות משורש תלת-אותי אחד. החברה הישראלית שלי רק הנהנה ואמרה, "עכשיו את חושבת בעברית." זו אחת המחמאות הכי טובות שקיבלתי.`,
      },
      {
        title: 'בלי ניקוד, בלי בעיה (טוב, עם קצת בעיות)',
        content: `עברית כתובה בדרך כלל ללא תנועות. האותיות הן עיצורים; התנועות מרומזות. זה כמו קריאת "הל אתם יכלם לקרא את ז?" — רק שדוברי עברית עושים זאת בקלות כי השפה תוכננה ככה מהיסוד.

אותו רצף עיצורים יכול לייצג מילים שונות: ד-ב-ר = דָּבָר, דִּבֵּר, דֶּבֶר, דְּבַר. בלוח אין הקשר, אז שחקנים צריכים להכיר קריאות אפשריות. צפיפות המידע גבוהה יותר — כל אות נושאת משקל סמנטי יותר.

שמעתי שחקני סקרבל עבריים מתארים את זה כ"קריאה בין האותיות." אתם לא רק רואים מה יש שם — אתם רואים מה יכול להיות שם.`,
      },
      {
        title: 'RTL: כשכל מה שידעתם על עיצוב מתהפך',
        content: `עברית נקראת מימין לשמאל. מחקר חיפה (2018) מצא שדוברי עברית מראים הטיית קשב מרחבית ימינה, בעוד דוברי אנגלית — שמאלה. שחקנים עבריים סורקים לוחות אחרת, מתחילים מהצד הימני.

אלמנטי UI צריכים להתהפך: חצי ניווט, סרגלי התקדמות, צללים (LexiClash: מוטל ימינה → שמאלה). קלט וריצת מילים צריכים טיפול מיוחד — אות חדשה בצד שמאל, דחיפה ימינה. אנימציות כבדות כיווניות.

החלק הקשה ביותר? טקסט דו-כיווני. טקסט עברי שכולל מילים באנגלית, מספרים או קיצורים מחליף כיוון באמצע השורה.

ראיתי משחקים שבבירור נבדקו רק באנגלית. תמיד אפשר להגיד כי העברית מרגישה כמו ללבוש חולצה הפוך — טכנית עובד, אבל ברור שלא נכון.`,
      },
      {
        title: 'תרבות משחקי מילים בישראל',
        content: `לישראל תרבות משחקי מילים ייחודית. סקרבל (שבץ נא) בעברית מספק עמוקות — מערכת השורשים אומרת שכל מגש אריחים מכיל משפחות מילים.

תשבצים (תשבצים) טקס שבוע ישראלי — יוצרים כמו דן אוריון הם דמויות תרבותיות. עברית אוהבת משחקי מילים וכפל משמעות. מערכת השורשים הופכת משחקי מילים בלתי נמנעים — כפל משמעויות בכל מקום.

עברית מודרנית (הוחייתה במאות ה-19 וה-20) יצרה מילים בכוונה. "מחשב" משורש ח-ש-ב (חשוב/חשב). "חשמל" משלפה מקראית עמומה (חומר נוצץ, יחזקאל).

שחקנים נתקלים בשכבות — מילים קדומות עם מטבעות מודרניות. עברית מקראית, חז"ל, ומודרנית כולן בלוח: מילה בת 3,000 שנה ליד מילה מ-2015.`,
      },
      {
        title: 'טיפים ללומדי עברית שמשחקים משחקי מילים',
        content: `אם לומדים עברית ורוצים להשתמש במשחקי מילים ככלי לימוד, הנה אסטרטגיות שעובדות:

למדו שורשים, לא מילים. מילה חדשה? חפשו שורש תלת-אותי, אחר כך מילים אחרות מאותו שורש. במקום מילה אחת, למדתם חמש.

התחילו עם שורשים בתדירות גבוהה (~500 מכסים עברית יומיומית). כ-ת-ב, ל-מ-ד, ד-ב-ר, ש-מ-ע, ר-א-ה — כל הזמן במשחקים.

שחקו עם ניקוד (כשתומכים) — מפחית עומס קוגניטיבי. כשמשתפרים, כבו.

שימו לב למשקלים (תבניות). מִ__ָ_ יוצרת שמות מקום: מִקְדָּשׁ, מִסְפָּר. דפוסים עוזרים לחזות מילים תקפות.

אל תפחדו מסלנג. "סבבה," "יאללה," "חפיף" — כולן מילים עבריות אמיתיות עם שורשים אמיתיים.

משחקי מילים מכריחים קריאה מהירה. אי אפשר 30 שניות לכל מילה עם טיימר. לחץ הזמן הוא יתרון — מאמן זיהוי אוטומטי.

קבלו שתפסידו. הרבה. לזמן רב. כל משחק מלמד משהו, והלמידה מצטברת.`,
      },
      {
        title: 'סלנג עברי ומילים מודרניות במשחקי מילים',
        content: `משחקי מילים בעברית חושפים סלנג עברי מודרני פרוע ויצירתי.

סלנג עברי: השפעות ערביות (יאללה, אחלה), אנגליות (קול), רוסיות (שנות ה-90), ויצירות מקומיות משחקות עם שורשים.

"פראייר" (גרמנית/יידיש) — מנצל אתו. "אל תהיה פראייר" כמעט מוטו לאומי. "חבל על הזמן" = מילולית "בזבוז" → אידיומטית "מדהים" — הפיכה סמנטית שהופכת סלנג למבדר.

רשתות חברתיות האיצו יצירת מילים: "לייקק," "תיירג," "שיירר" עוקבות אחרי מורפולוגיה עברית — מושגים אנגליים בבגדים דקדוקיים.

הצבא תורם רבות לסלנג העברי. מילים כמו "גרבי," "משופשף," ו"סמנכ"ל" נולדו בתרבות הצבאית והגרו לשימוש כללי.

עבור שחקנים, האופי המתפתח כל הזמן של סלנג עברי אומר שאוצר המילים הוא דבר חי ונושם. מילים חדשות הופכות למשחקים תקפים תוך שנים מטביעתן.`,
      },
      {
        title: 'למה אני ממשיכה לחזור למשחקי מילים בעברית',
        content: `למדתי עברית בגלל חברה. המשכתי בגלל משחקי מילים. שורשים שינו את ההבנה שלי איך שפות עובדות. קריאה ללא ניקוד אימנה זיהוי דפוסים. RTL חשפה הטיות מרחביות שלא הכרתי.

משחקי מילים בעברית קשים יותר: עקומת לימוד תלולה, דרישות קוגניטיביות גבוהות. אבל עשירים יותר — למצוא מילה מרגיש כמו חפירה ארכיאולוגית. שורש משלוש אלפים שנה שעדיין עובד.

ואם דוברי עברית ילידים הנהנתם לאורך זה וחשבתם "כן, ברור" — תודה. עכשיו תלמדו אותי את השורש של "הכרת תודה." אני יודעת שהוא מתחיל בנו"ן... או לא. עזרו לי.`,
      },
      {
        content: `מקורות:
- Shimron, J. (2006). "Reading Hebrew: The Language and the Psychology of Reading It."
- אוניברסיטת חיפה (2018). הטיית קשב מרחבית בקוראי RTL מול LTL.
- Ravid, D. (2012). "Spelling Morphology: The Psycholinguistics of Hebrew Spelling."
- אבן-שושן, א. "המילון החדש" — מילון עברי סטנדרטי.
- פרויקט בן-יהודה — מילון עברי מקוון מקיף.
- האקדמיה ללשון העברית — גוף אימוץ ותקנון מילים רשמי.`,
      },
    ],
    backToBlog: 'חזרה לבלוג',
    tryDaily: 'אתגר יומי',
    practice: 'תרגול',
  },
  sv: {
    title: 'Att Spela Ordspel på Hebreiska: Det Vackra Kaoset med Höger-till-Vänster',
    subtitle: 'Rotsystem, saknade vokaler och varför att designa ett ordspel för hebreiska är som att lösa ett pussel inuti ett pussel.',
    category: 'Språk',
    readTime: '12 min läsning',
    authorName: 'Ohad Fisher',
    authorBio: 'Flerspråkig ordspelsentusiast som ägnade sex månader åt att lära sig hebreiska rötter bara för att vara mindre dålig på israeliska Scrabble-kvällar.',
    sections: [
      {
        content: `Jag ska avslöja en hemlighet som hebreiska ordspelsspelare redan känner till: att spela ordspel på hebreiska är en fundamentalt annorlunda upplevelse jämfört med att spela på engelska. Inte svårare, inte lättare — annorlunda. Strukturellt annorlunda på DNA-nivå.

På engelska tittar du på ett bokstavsrutnät och din hjärna söker efter bekanta mönster. C-A-T, T-H-E. Du skannar vänster till höger, uppifrån och ner.

På hebreiska måste din hjärna göra något mycket mer intressant. Den måste rekonstruera ord från konsonantskelett, mentalt infoga vokaler som inte finns där, navigera en höger-till-vänster läsriktning, och — det här är den vilda delen — inse att tre till synes slumpmässiga bokstäver kan dela en rot som kopplar dem till dussintals olika ord.

Jag blev kär i hebreiska ordspel för ungefär två år sedan, när en israelisk vän bjöd in mig till en Scrabble-kväll i Tel Aviv. Jag gick in med kanske 200 hebreiska ord. Jag gick ut fyra timmar senare efter att ha förlorat spektakulärt, men med en förståelse för hur det hebreiska språket fungerar som ingen lärobok hade gett mig.`,
      },
      {
        title: 'Varför Hebreiska Är Speciellt: Shoresh-systemet',
        content: `Varje hebreisk ordspelsspelare behöver förstå ett koncept utan riktig motsvarighet på engelska: shoresh (שורש), eller rotsystemet.

På engelska är ord mestadels godtyckliga sekvenser. På hebreiska härstammar nästan varje ord från en trebokstavsrot som bär en kärnbetydelse. Genom att sätta in roten i olika mönster (mishkalim) genererar du en familj av relaterade ord.

Ta roten כ-ת-ב (K-T-V), relaterad till skrivande: katav (skrev), kotev (skriver), ktiva (skrivning), mikhtav (brev), katav (reporter), ktovet (adress). Åtta ord, alla från tre bokstäver.

Föreställ dig att du spelar och ser bokstäverna כ, ת och ב utspridda på brädet. Din hjärna tänds: de tre bokstäverna är en rot. Du vet omedelbart att det finns en ordfamilj gömd i den kombinationen.

Det här är vad som gör hebreiska ordspel intellektuellt spännande. Varje rot du känner igen är en nyckel som öppnar flera dörrar.`,
      },
      {
        title: 'Inga Vokaler, Inga Problem (Nåja, Vissa Problem)',
        content: `Skriven hebreiska inkluderar mestadels inte vokaler. Bokstäverna du ser är konsonanter. Vokalerna är underförstådda. Det är som att läsa "Kn d läs dnn mnnng?" — fast hebreisktalande gör det utan ansträngning.

För ordspel skapar detta en fascinerande dynamik. Samma konsonantsekvens kan representera olika ord beroende på vilka vokaler du sätter in. Bokstäverna ד-ב-ר kan vara davar (sak), diber (talade), dever (pest), eller dvar (ord av).

Informationstätheten i hebreiska bokstäver är högre. Varje bokstav bär mer semantisk vikt. Det gör att hebreiska ordspel känns mer komprimerade, mer koncentrerade.

Jag har hört hebreiska Scrabble-spelare beskriva det som "att läsa mellan bokstäverna." Du ser inte bara vad som finns där — du ser vad som kan finnas där.`,
      },
      {
        title: 'RTL: När Allt Du Vet Om Layout Är Fel',
        content: `Hebreiska skrivs och läses höger till vänster. Det skapar en kaskad av designutmaningar.

Forskning från Haifas universitet (2018) fann att hebreisktalande visar en högerriktad uppmärksamhetsbias, medan engelsktalande visar vänsterbias. Hebreiska spelare tittar bokstavligen annorlunda på ett bokstavsrutnät.

UI-element behöver spegelvändas. Navigationspilar, framstegsbalkar, skuggriktningar — allt som antyder riktning behöver speglas. Textinmatning och ordbildning behöver särskild hantering. Animationer behöver respektera riktning.

Den svåraste delen? Dubbelriktad text. Hebreisk text som innehåller engelska ord byter riktning mitt i raden.

De bästa hebreiska ordspelen känns inhemska från första stund. UI:t fungerar inte bara i RTL — det tänker i RTL.`,
      },
      {
        title: 'Hebreisk Ordspelskultur i Israel',
        content: `Israel har en ordspelskultur som rivaliserar med alla länder jag besökt. Scrabble (שבץ נא) har en hängiven följarskara. Hebreiska korsord (tashbetzim) är en nationell institution. Fredagstidningens korsord är en helgritual.

Hebreiskan älskar ordlekar. Rotsystemet gör ordlekar nästan oundvikliga. Israelisk humor bygger tungt på detta.

Modern hebreiska har en unik relation till ordsskapande. Nya ord konstrueras genom att passa moderna koncept i urgamla rotmönster. "Dator" (makhshev) kommer från roten ח-ש-ב (tänka/beräkna). "Elektricitet" (khashmal) hämtades från ett obskyrt bibliskt ord.

En israelisk tävlings-Scrabble-spelare sa: "På engelska memorerar man ord. På hebreiska förstår man strukturer. När du kan mönstren är nya ord inte överraskningar — de är förutsägelser."`,
      },
      {
        title: 'Tips för Hebreiskstuderande',
        content: `Lär dig rötter, inte ord. Det här är det viktigaste tipset. När du stöter på ett nytt hebreiskt ord, slå upp dess trebokstavsrot. Sedan slå upp andra ord från samma rot. Plötsligt har du lärt dig fem ord istället för ett.

Börja med högfrekventa rötter. Ungefär 500 rötter täcker majoriteten av vardagshebreiskan.

Spela med vokaltecken (nikkud) påslagna om spelet stödjer det. Stäng av dem när du förbättras.

Var inte rädd för slang. "Sababa," "yalla," "khafif" — alla är riktiga hebreiska ord med riktiga rötter.

Använd ordspel för att öva läshastighet. Tidspressen är en funktion, inte en bugg.

Acceptera att du kommer förlora. Mycket. Länge. Men varje spel lär dig något.`,
      },
      {
        title: 'Hebreisk Slang i Ordspel',
        content: `Hebreisk slang är en vacker blandning av influenser. Arabiska (yalla, akhla), engelska (kol — cool), ryska, och hemmagjorda skapelser.

Ordet "fraier" (lurad) kommer från tyska/jiddisch. "Khaval al hazman" betyder bokstavligen "synd om tiden" men idiomatiskt "fantastiskt."

Sociala medier har accelererat hebreiskt ordsskapande. Ord som "laikek" (gilla), "taireg" (tagga), "shairer" (dela) följer hebreiska morfologiska regler.

Militären bidrar tungt till slang. Ord som "garbi" (värdelös) och "meshupshaf" (erfaren) föddes i militärkulturen.

Det ständigt utvecklande slanglandskapet håller ordspelen fräscha.`,
      },
      {
        content: `Källor:
- Shimron, J. (2006). "Reading Hebrew: The Language and the Psychology of Reading It."
- Haifas universitet (2018). Rumslig uppmärksamhetsbias hos RTL vs LTR-läsare.
- Ravid, D. (2012). "Spelling Morphology: The Psycholinguistics of Hebrew Spelling."
- Even-Shoshan, A. "Den Nya Ordboken."
- Ben-Yehuda-projektet — omfattande hebreisk ordbok online.`,
      },
    ],
    backToBlog: 'Tillbaka till Bloggen',
    tryDaily: 'Daglig Utmaning',
    practice: 'Öva',
  },
  ja: {
    title: 'ヘブライ語でワードゲーム：右から左への美しいカオス',
    subtitle: 'ルートシステム、消えた母音、そしてヘブライ語のワードゲームをデザインすることがパズルの中のパズルである理由。',
    category: '言語',
    readTime: '12分で読めます',
    authorName: 'Ohad Fisher',
    authorBio: 'イスラエルのスクラブルナイトでマシになるためだけに6ヶ月間ヘブライ語の語根を学んだ多言語ワードゲームマニア。',
    sections: [
      {
        content: `ヘブライ語のワードゲームプレイヤーがすでに知っている秘密をお教えします：ヘブライ語でワードゲームをプレイすることは、英語でプレイすることとは根本的に異なる体験です。より難しいわけでも、より簡単なわけでもない — 違うのです。DNA レベルで構造的に異なります。

英語では、文字のグリッドを見て脳が馴染みのあるパターンを探します。C-A-T、T-H-E。左から右、上から下にスキャンします。

ヘブライ語では、脳はもっと興味深いことをしなければなりません。子音の骨格から単語を再構築し、存在しない母音を頭の中で挿入し、空間処理を反転させる右から左への読み方向をナビゲートし、そして — これが驚きの部分 — 一見ランダムな3つの文字が、数十の異なる単語につながるルートを共有しているかもしれないことを認識しなければなりません。

2年ほど前、イスラエル人の友人にテルアビブのスクラブルナイトに招待されて、ヘブライ語のワードゲームに恋に落ちました。ヘブライ語の単語を200語ほど知って入り、4時間後に見事に負けて出てきましたが、ヘブライ語がどう機能するかについて深い理解を得ました。`,
      },
      {
        title: 'なぜヘブライ語はワードゲームに特別か：ショレシュシステム',
        content: `ヘブライ語のワードゲームプレイヤーは、英語には本当の同等物がない一つの概念を理解する必要があります：ショレシュ（שורש）、つまりルートシステムです。

英語では単語はほとんど任意の文字列です。ヘブライ語では、ほぼすべての単語が核心的な意味を持つ3文字のルートから派生します。そのルートを異なるパターン（ミシュカリム）に挿入することで、関連する単語のファミリーを生成します。

ルート כ-ת-ב（K-T-V、書くことに関連）を例に取ると：katav（書いた）、kotev（書く）、ktiva（書くこと）、mikhtav（手紙）、katav（記者）、ktovet（住所）。3文字から8つの単語。

ゲーム中にכ、ת、בの文字がグリッドに散らばっているのを見ると、脳が点灯します：これら3文字はルートだ。その組み合わせに隠れた単語ファミリーがあることがすぐにわかります。

認識するすべてのルートが複数のドアを開く鍵です。これがヘブライ語のワードゲームを知的にスリリングにするものです。`,
      },
      {
        title: '母音なし、問題なし（まあ、いくつかの問題はある）',
        content: `英語話者を驚かせること：書かれたヘブライ語にはほとんど母音が含まれていません。ページ上の文字は子音です。母音は暗示されています。ネイティブスピーカーはただ...知っています。

ワードゲームにとって、これは魅力的なダイナミクスを生み出します。同じ子音列が、挿入する母音によって異なる単語を表すことがあります。ד-ב-ר は davar（もの）、diber（話した）、dever（疫病）、または dvar（〜の言葉）になり得ます。

ヘブライ語の文字の情報密度は英語より高いです。各文字は子音の役割を果たしながら、可能な母音パターンも暗示するため、より多くの意味的重みを持ちます。

ヘブライ語のスクラブルプレイヤーがこれを「文字の間を読む」と表現するのを聞きました。そこにあるものだけでなく、そこにあり得るものを見ているのです。`,
      },
      {
        title: 'RTL：レイアウトの常識が覆されるとき',
        content: `ヘブライ語は右から左に書かれ、読まれます。ゲームデザイナーにとって、この一つの事実がデザイン上の課題の連鎖を生み出します。

ハイファ大学の研究（2018年）は、ヘブライ語話者が右向きの空間注意バイアスを示し、英語話者が左向きのバイアスを示すことを発見しました。ヘブライ語プレイヤーは文字通り文字グリッドを異なる方法で見ています。

UI要素はミラーリングが必要です。ナビゲーション矢印、プログレスバー、影の方向 — 方向性を暗示するすべてのものを反転する必要があります。テキスト入力とワード形成には特別な処理が必要です。アニメーションは方向性を尊重する必要があります。

最も難しい部分は双方向テキストです。英語の単語を含むヘブライ語テキストは行の途中で方向が切り替わります。

最高のヘブライ語ワードゲームは最初の瞬間からネイティブに感じます。UIはRTLで動作するだけでなく、RTLで考えます。`,
      },
      {
        title: 'イスラエルのワードゲーム文化',
        content: `イスラエルには、訪れたどの国にも匹敵するワードゲーム文化があり、独特のイスラエル風味があります。

スクラブル（ヘブライ語ではשבץ נא）には熱心なファンがいます。ヘブライ語のクロスワードパズル（タシュベツィム）は国民的制度です。金曜日の新聞のクロスワードは多くのイスラエル人の週末の儀式です。

ルートシステムは言葉遊びをほぼ不可避にします。多くの単語が子音パターンを共有するため、二重の意味はどこにでもあります。

現代ヘブライ語には独自の造語の伝統があります。「コンピュータ」（makhshev）はルートח-ש-ב（考える/計算する）から。「電気」（khashmal）はエゼキエル書の不明瞭な聖書の言葉から引き出されました。

イスラエルの競技スクラブルプレイヤーが言いました：「英語では単語を暗記する。ヘブライ語では構造を理解する。パターンを知れば、新しい単語は驚きではなく予測になる。」`,
      },
      {
        title: 'ヘブライ語学習者向けのヒント',
        content: `単語ではなくルートを学びましょう。これが最も重要なヒントです。新しいヘブライ語の単語に出会ったら、3文字のルートを調べてください。1つの単語の代わりに5つ学べます。

高頻度ルートから始めましょう。約500のルートが日常ヘブライ語の大部分をカバーします。

ゲームが対応していれば、母音記号（ニクード）をオンにしてプレイしましょう。上達したらオフにしてください。

スラングを恐れないでください。「サバーバ」「ヤッラ」「ハフィフ」はすべて本物のヘブライ語です。

ワードゲームを読む速度の練習に使いましょう。時間のプレッシャーは実はバグではなく機能です。

負けることを受け入れましょう。たくさん。長い間。でもすべてのゲームが何かを教えてくれます。`,
      },
      {
        title: 'ヘブライ語スラングとワードゲーム',
        content: `ヘブライ語スラングはアラビア語（ヤッラ、アフラ）、英語（コール=cool）、ロシア語、そして独自の創造物の美しいミックスです。

「フライエル」（お人好し）はドイツ語/イディッシュ語から。「ハヴァル・アル・ハズマン」は文字通り「時間のもったいない」ですが、慣用的には「すごい」という意味。

ソーシャルメディアがヘブライ語の造語を加速させました。「ライケク」（いいねする）、「タイレグ」（タグ付けする）、「シャイレル」（シェアする）はすべてヘブライ語の形態論規則に従っています。

軍隊もスラングに大きく貢献しています。常に進化するスラングの景観がワードゲームを新鮮に保ちます。`,
      },
      {
        content: `出典：
- Shimron, J. (2006). "Reading Hebrew: The Language and the Psychology of Reading It."
- ハイファ大学 (2018). RTL vs LTR読者の空間注意バイアス。
- Ravid, D. (2012). "Spelling Morphology: The Psycholinguistics of Hebrew Spelling."
- ベン・イェフダ・プロジェクト — 包括的ヘブライ語オンライン辞書。`,
      },
    ],
    backToBlog: 'ブログに戻る',
    tryDaily: 'デイリーチャレンジ',
    practice: '練習',
  },
  es: {
    title: 'Jugar Juegos de Palabras en Hebreo: El Hermoso Caos de Derecha a Izquierda',
    subtitle: 'Sistemas de raíces, vocales ausentes y por qué diseñar un juego de palabras para hebreo es como resolver un rompecabezas dentro de otro.',
    category: 'Idioma',
    readTime: '12 min de lectura',
    authorName: 'Ohad Fisher',
    authorBio: 'Obsesivo multilingüe de juegos de palabras que pasó seis meses aprendiendo raíces hebreas solo para ser menos terrible en las noches de Scrabble israelíes.',
    sections: [
      {
        content: `Voy a revelarles un secreto que los jugadores de juegos de palabras en hebreo ya conocen: jugar juegos de palabras en hebreo es una experiencia fundamentalmente diferente a jugar en inglés. No más difícil, no más fácil — diferente. Estructuralmente diferente a nivel de ADN.

En inglés, miras una cuadrícula de letras y tu cerebro busca patrones familiares. C-A-T, T-H-E. Escaneas de izquierda a derecha, de arriba a abajo.

En hebreo, tu cerebro tiene que hacer algo mucho más interesante. Tiene que reconstruir palabras a partir de esqueletos de consonantes, insertar mentalmente vocales que no están allí, navegar una dirección de lectura de derecha a izquierda, y reconocer que tres letras aparentemente aleatorias podrían compartir una raíz que las conecta con docenas de palabras diferentes.

Me enamoré de los juegos de palabras en hebreo hace unos dos años, cuando una amiga israelí me invitó a una noche de Scrabble en Tel Aviv. Entré conociendo unas 200 palabras en hebreo. Salí cuatro horas después habiendo perdido espectacularmente, pero comprendiendo algo profundo sobre cómo funciona el idioma hebreo.`,
      },
      {
        title: 'Por Qué el Hebreo Es Especial: El Sistema Shoresh',
        content: `Cada jugador de juegos de palabras en hebreo necesita entender un concepto sin equivalente real en inglés: el shoresh (שורש), o sistema de raíces.

En inglés, las palabras son secuencias mayormente arbitrarias. En hebreo, casi cada palabra deriva de una raíz de tres letras que lleva un significado central. Al insertar esa raíz en diferentes patrones (mishkalim), generas una familia de palabras relacionadas.

Toma la raíz כ-ת-ב (K-T-V), relacionada con la escritura: katav (escribió), kotev (escribe), ktiva (escritura), mikhtav (carta), katav (reportero), ktovet (dirección). Ocho palabras, todas de tres letras.

Cuando ves las letras כ, ת y ב en el tablero, tu cerebro se ilumina: son una raíz. Sabes inmediatamente que hay una familia de palabras escondida. Cada raíz que reconoces es una llave que abre múltiples puertas.`,
      },
      {
        title: 'Sin Vocales, Sin Problema (Bueno, Algunos Problemas)',
        content: `El hebreo escrito generalmente no incluye vocales. Las letras son consonantes. Las vocales están implícitas. Los hablantes nativos simplemente... las saben.

Para juegos de palabras, esto crea una dinámica fascinante. La misma secuencia de consonantes puede representar diferentes palabras. ד-ב-ר puede ser davar (cosa), diber (habló), dever (plaga), o dvar (palabra de).

La densidad de información de las letras hebreas es mayor. Cada letra carga más peso semántico porque hace el trabajo de consonante e implica patrones vocálicos posibles.

Los jugadores de Scrabble hebreo describen esto como "leer entre las letras." No solo ves lo que está allí — ves lo que podría estar allí.`,
      },
      {
        title: 'RTL: Cuando Todo Lo Que Sabes Sobre Diseño Está Mal',
        content: `El hebreo se escribe de derecha a izquierda. Investigación de la Universidad de Haifa (2018) encontró que los hablantes de hebreo muestran un sesgo de atención espacial hacia la derecha. Los jugadores hebreos literalmente miran una cuadrícula de letras de forma diferente.

Los elementos de UI necesitan invertirse. Flechas de navegación, barras de progreso, direcciones de sombra — todo lo que implica dirección necesita reflejarse. La entrada de texto necesita manejo especial. Las animaciones deben respetar la direccionalidad.

La parte más difícil es el texto bidireccional. El texto hebreo que incluye palabras en inglés cambia de dirección a mitad de línea.

Los mejores juegos de palabras en hebreo se sienten nativos desde el primer momento. La interfaz no solo funciona en RTL — piensa en RTL.`,
      },
      {
        title: 'Cultura de Juegos de Palabras en Israel',
        content: `Israel tiene una cultura de juegos de palabras que rivaliza con cualquier país. Scrabble (שבץ נא) tiene seguidores dedicados. Los crucigramas hebreos (tashbetzim) son una institución nacional.

El sistema de raíces hace los juegos de palabras casi inevitables. El humor israelí depende mucho de esto.

El hebreo moderno tiene una relación única con la creación de palabras. "Computadora" (makhshev) viene de la raíz ח-ש-ב (pensar/calcular). "Electricidad" (khashmal) fue extraída de una oscura palabra bíblica.

Una jugadora competitiva israelí dijo: "En inglés memorizas palabras. En hebreo entiendes estructuras. Una vez que conoces los patrones, las nuevas palabras no son sorpresas — son predicciones."`,
      },
      {
        title: 'Consejos para Estudiantes de Hebreo',
        content: `Aprende raíces, no palabras. Este es el consejo más importante. Cuando encuentres una nueva palabra, busca su raíz de tres letras. Luego busca otras palabras de la misma raíz. De repente, aprendiste cinco palabras en vez de una.

Empieza con raíces de alta frecuencia. Unas 500 raíces cubren la mayoría del hebreo cotidiano.

Juega con marcas vocálicas (nikkud) activadas si el juego lo permite. Desactívalas cuando mejores.

No tengas miedo del argot. "Sababa," "yalla," "khafif" son palabras hebreas reales.

Usa juegos de palabras para practicar velocidad de lectura. La presión del tiempo es una característica, no un defecto.

Acepta que perderás. Mucho. Por mucho tiempo. Pero cada juego te enseña algo.`,
      },
      {
        title: 'Argot Hebreo en Juegos de Palabras',
        content: `El argot hebreo es una hermosa mezcla de influencias. Árabe (yalla, akhla), inglés (kol — cool), ruso, y creaciones propias.

"Fraier" (tonto/ingenuo) viene del alemán/yiddish. "Khaval al hazman" significa literalmente "desperdicio de tiempo" pero idiomáticamente "increíble."

Las redes sociales han acelerado la creación de palabras. "Laikek" (dar like), "taireg" (etiquetar), "shairer" (compartir) siguen reglas morfológicas hebreas.

El ejército contribuye mucho al argot. El paisaje de argot en constante evolución mantiene los juegos frescos.`,
      },
      {
        content: `Fuentes:
- Shimron, J. (2006). "Reading Hebrew: The Language and the Psychology of Reading It."
- Universidad de Haifa (2018). Sesgo de atención espacial en lectores RTL vs LTR.
- Ravid, D. (2012). "Spelling Morphology: The Psycholinguistics of Hebrew Spelling."
- Proyecto Ben-Yehuda — diccionario hebreo completo en línea.`,
      },
    ],
    backToBlog: 'Volver al Blog',
    tryDaily: 'Desafío Diario',
    practice: 'Practicar',
  },
};
