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
    title: 'I Learned 500 New Words in 30 Days. The Method Is Embarrassingly Simple.',
    subtitle: 'Spaced repetition, active recall, morphology hacks, and the daily routines that actually stick. No flashcard apps required.',
    category: 'Learning',
    readTime: '7 min read',
    authorName: 'Ohad Fisher',
    authorBio: 'Self-taught vocabulary obsessive who keeps a word journal, plays word games competitively, and once cried tears of joy over the word "defenestration."',
    sections: [
      {
        content: `Thirty days ago, I started an experiment. Learn as many new words as possible using only word games and cognitive science. No flashcard apps. No tutors. Just me, a notebook, and an embarrassing amount of Boggle.

Result: 523 words. Not "I vaguely recognize this." Words I can spell, define, use in a sentence, and deploy to make my friends regret challenging me.

What made this different: I didn't brute force it. Instead, I combined research-backed techniques that psychologists have been refining for over a century. Most people have never heard of them, even though the evidence is overwhelming.

I'll walk you through what worked, why, and how to replicate it. Full citations so you can fact-check.`,
      },
      {
        title: 'The forgetting curve (and why it matters)',
        content: `In 1885, a German psychologist named Hermann Ebbinghaus did something radical: he systematically measured how fast humans forget. His method was brutal—memorizing nonsense syllables (DAX, BUP, ZOL) and testing himself at increasing intervals.

What he found: without review, you lose 70% of new information in 24 hours. Within a week, 90%.

But here's the magic part. Each time you review the information at the right moment, the curve flattens. The memory gets stronger. The intervals get longer.

Cepeda et al.'s 2006 meta-analysis (254 studies, 14,000+ participants) proved it: spaced practice beats cramming across every age group and material type.

For my experiment, I reviewed every new word at 1, 3, 7, 14, and 28 days. No app—just a notebook and a calendar. Result: 85.5% retention at day 30. In previous attempts without spacing, I'd forget 15 of 20 words by the next week.

This single principle accounts for most of the gain.`,
      },
      {
        title: 'Active recall: why struggle makes memory',
        content: `For years I thought reading was the best vocabulary builder. Encounter a word in context, look it up, move on. Natural, organic growth.

It doesn't work. Reading is passive. Your brain does the minimum work to extract meaning—not enough to create strong memories.

Active recall is the opposite. Instead of recognizing a word's meaning, you produce it. You see AELNR scrambled and force your brain to spit out LEARN, RENAL, ALIEN. That's exactly what word games do.

Karpicke and Roediger (2008, Science) showed that retrieval practice produced 80% better retention than repeated studying. Eighty percent. The act of struggling to pull a word from memory is what cements it.

This is why word games are so effective. Every time you scan a letter grid and hunt down EPHEMERAL, you're doing active recall. The struggle is the point.

The counterintuitive bit: failed retrieval attempts, followed by correct feedback, create stronger memories than easy retrieval. Kornell, Hays, and Bjork (2009) proved it. I confirmed it. QUAHOG (a type of clam) stuck instantly because I played it as a desperate guess. SANGUINE, which I casually looked up in a novel, took three separate sessions.

The harder you fail, the stronger you remember.`,
      },
      {
        title: 'Word families: the cheat code',
        content: `This technique made the biggest single difference.

Morphology is the study of word parts—prefixes, suffixes, roots. English is built from Latin, Greek, Germanic roots. Those roots follow patterns. Once you learn EPHEMER- (lasting briefly), you unlock EPHEMERA, EPHEMERIS, EPHEMERON. One root, three words.

Nation (2001) estimated that knowledge of 20 word families per week builds vocabulary at 4x the rate of learning isolated words.

I started grouping words by roots. MAGN- (great): MAGNIFICENT, MAGNITUDE, MAGNANIMOUS. CHRON- (time): CHRONOLOGICAL, CHRONIC, SYNCHRONIZE. Each new word arrived pre-wired to words I already knew.

By week two, I was learning at double my initial rate. Not because I studied harder—because each new word was already connected to a network.

For word games, morphology is a superpower. If you know -TION, -SION, -MENT, -NESS, -LY are common suffixes, you can extend base words systematically. AGREE becomes AGREEMENT, AGREEABLE, AGREEABLY—three words from one root.`,
      },
      {
        title: 'Bilingual leverage',
        content: `Playing word games in multiple languages made my English vocabulary better. Sounds backwards.

Kroll and Stewart (1994) proposed that words in different languages share conceptual connections. Learning a word in one language strengthens the underlying concept, which helps related words in other languages.

I tested this in Swedish. HUND (dog), HAND (hand), VATTEN (water) were immediately recognizable Germanic cognates. Then I noticed deeper connections. Learning UNGEFAR (approximately) led me to UNFAIR, then INEQUITABLE, then INIQUITY—a chain unlocked by one Swedish word.

Adesope et al.'s 2010 meta-analysis found bilingual individuals outperformed monolinguals on vocabulary tests, even in their native language.

You don't need fluency. Basic exposure to cognates strengthens your vocabulary network. LUMINEUX (French bright) connects to LUMINOUS. CORAZON (Spanish heart) connects to CORONARY through Latin. Even TSUNAMI is TSUNAMI across languages.

During weeks 3-4, I deliberately hunted for cross-linguistic hooks. Five minutes per review session. Retention improvement was noticeable.`,
      },
      {
        title: 'The actual daily routine (45 minutes total)',
        content: `Science without implementation is trivia. Here's what I did:

Morning (15 min): Two rounds of Boggle. New words went straight into a physical notebook with definition and example sentence.

Midday (15 min): Spaced repetition review. Cover the definition, try to recall it. Unmarked words got flagged for extra review.

Evening (15 min): Read longform journalism or nonfiction with notebook open. Log unfamiliar words immediately.

Key rules:

Write by hand. Handwriting engages motor areas that typing doesn't, creating additional memory traces (Mueller & Oppenheimer, 2014).

Use the word within 24 hours. Forced production beats passive recognition.

Play with others 2+ times per week. Social game sessions provide competitive motivation and emotional amplification—memories stick better when emotionally tagged.

No cramming. When the timer hit 15 minutes, I stopped.

Frequency beats duration. Three 15-minute sessions outperform one 45-minute session because each session is a retrieval opportunity, and spacing gives your brain time to consolidate.`,
      },
      {
        title: 'What the results meant',
        content: `At day 30: 523 words logged. Cold recall test: 447/523 correct (85.5%). Boggle scores up 22%. Average word length increased from 4.2 to 5.1 letters.

But the number 500 is misleading. Vocabulary isn't about accumulating discrete items like collecting stamps.

It's about building a network.

By day 30, words I already knew had new connections. EPHEMERAL linked to EPHEMERA, linked to DIURNAL, linked to NOCTURNAL, linked to EQUINOX. The morphological connections made my entire vocabulary more accessible—for reading, writing, thinking.

Collins and Loftus (1975) called this network theory: words are nodes in an interconnected system. Activate one node, related nodes partially activate ("spreading activation"). More connections = easier retrieval.

My 30 days didn't just add 500 nodes. It added thousands of new connections between existing nodes. Those connections are what make vocabulary useful.

You don't need 30 days to start. Three new words per day, logged and reviewed with spacing, is 1,000 words per year. By month three, you'll be learning faster than month one.

The techniques work. Word games make it fun. The only variable is whether you start.`,
      },
    ],
    backToBlog: 'Back to Blog',
    tryDaily: 'Try Daily Challenge',
    practice: 'Practice Now',
  },
  he: {
    title: 'למדתי 500 מילים חדשות ב-30 יום (הנה בדיוק איך)',
    subtitle: 'חזרה מרווחת, שליפה אקטיבית, פריצות מורפולוגיות, ושגרות יומיות שבאמת נדבקות. לא צריך אפליקציות כרטיסיות.',
    category: 'למידה',
    readTime: 'קריאה של 12 דקות',
    authorName: 'חנון המילים',
    authorBio: 'אובססיבי אוצר מילים אוטודידקט שמחזיק יומן מילים, משחק משחקי מילים בתחרותיות, ופעם בכה דמעות שמחה על המילה "דפנסטרציה."',
    sections: [
      {
        content: `לפני שלושים יום התחלתי ניסוי. הכללים היו פשוטים: ללמוד כמה שיותר מילים חדשות בחודש אחד תוך שימוש רק במשחקי מילים וטכניקות מבוססות מחקר. בלי קורסים יקרים. בלי מורים פרטיים. רק אני, מחברת, טיימר, וכמות מביכה של שעות בוגל.

התוצאה? 500 מילים חדשות. לא מילים מסוג "אני מזהה את זה באופן מעורפל" — מילים שאני יכול להגדיר, לאיית, להשתמש בהן במשפט, ו(קריטי) לפרוס במשחק מילים כדי לגרום לחברים שלי להתחרט שאתגרו אותי.

מה שעשה את הניסוי הזה שונה מכל ניסיון קודם: לא השתמשתי בכוח גס. לא ישבתי עם כרטיסיות שעות. במקום זאת, השתמשתי בשילוב של טכניקות מדעי הקוגניציה שחוקרים משפצרים כבר מעל מאה שנה.`,
      },
      {
        title: 'ניסוי 30 היום: כללי הבסיס',
        content: `לפני שאכנס לטכניקות, אלה הפרמטרים. כי "למדתי 500 מילים" לא אומר כלום בלי הקשר.

מה זה "למדתי"? יכולתי להפיק את המילה מהזיכרון, להגדיר אותה נכון, לאיית נכון, ולהשתמש בהקשר. זה מה שחוקרים קוראים "אוצר מילים פרודוקטיבי" — בניגוד ל"אוצר מילים רצפטיבי," שהוא רק לזהות מילה כשרואים אותה.

מאיפה הגיעו המילים? בעיקר משחקי מילים (בוגל, תרגול סקרבל, תשבצים, ופאזלי מילים יומיים), בתוספת קריאה. כשנתקלתי במילה שלא הכרתי, רשמתי אותה.

כמה זמן? כ-45 דקות ביום. חמש עשרה דקות משחקי מילים, חמש עשרה דקות חזרה, וחמש עשרה דקות קריאה. זה חשוב — לא בזבזתי ארבע שעות ביום על זה.

עד יום 30, במחברת שלי היו 523 ערכים. חלקם היו אזוטריים. חלקם היו מעשיים. וחלקם היו פשוט מענגים.`,
      },
      {
        title: 'חזרה מרווחת: עקומת אבינגהאוס שישנתה הכל',
        content: `ב-1885, פסיכולוג גרמני בשם הרמן אבינגהאוס עשה משהו שאף אחד לא עשה קודם: הוא מדד באופן שיטתי כמה מהר בני אדם שוכחים דברים. השיטה שלו הייתה אכזרית — הוא שינן רשימות של הברות חסרות משמעות ואז בדק את עצמו בפרקי זמן גדלים.

מה שהוא גילה נקרא כיום "עקומת השכחה," והיא אחת מהממצאים המשוכפלים ביותר בכל הפסיכולוגיה. בלי שום חזרה, שוכחים כ-70% מהמידע החדש תוך 24 שעות. תוך שבוע, איבדתם כ-90%.

אבל — וזה החלק הקריטי — כל פעם שחוזרים על המידע ברגע הנכון, העקומה משתטחת. הזיכרון מתחזק. המרווחים בין חזרות נדרשות גדלים.

זו חזרה מרווחת: לחזור על מידע במרווחים גדלים בהדרגה. חזרה אחרי יום אחד, אחר כך 3 ימים, אחר כך 7, 14, 30. כל חזרה מצמיתה את הזיכרון יותר.

מטא-אנליזה של סיפדה ועמיתיו (2006) ניתחה 254 מחקרים ומצאה שתרגול מרווח ייצר שימור טוב יותר משמעותית מתרגול מרוכז (דחיסה) כמעט בכל סוג חומר ובכל קבוצת גיל.`,
      },
      {
        title: 'שליפה אקטיבית: למה קריאה לא מספיקה',
        content: `הנה טעות שעשיתי שנים: חשבתי שקריאה היא הדרך הטובה ביותר לבנות אוצר מילים. נתקלים במילה בהקשר, מחפשים אותה, ממשיכים הלאה. צמיחה טבעית ואורגנית.

זה לא עובד. או ליתר דיוק, זה עובד, אבל זה איטי ולא יעיל להחריד.

הבעיה היא שקריאה היא פסיבית. מזהים מילים, לא מייצרים אותן. המוח עושה את המינימום ההכרחי כדי לחלץ משמעות מהטקסט.

שליפה אקטיבית היא ההיפך. במקום להסתכל על מילה ולזכור את ההגדרה (זיהוי), מתחילים עם ההגדרה ומנסים להפיק את המילה (שליפה). או מסתכלים על סט אותיות מעורבל ומנסים ליצור מילים — מה שהוא, לא במקרה, בדיוק מה שמשחקי מילים עושים.

קרפיקה ורודיגר (2008) פרסמו מחקר מכונן ב-Science שהראה שתרגול שליפה ייצר שימור טוב ב-80% משליפה חוזרת. שמונים אחוז! המאמץ של שליפה — ההיאבקות כדי למשוך מילה מהזיכרון — הוא מה שמחזק את עקבת הזיכרון.

לכן משחקי מילים הם בוני אוצר מילים כל כך יעילים. כל פעם שסורקים לוח אותיות ומושכים מילה מהכאוס, עושים שליפה אקטיבית. המשחק הוא סשן הלמידה.`,
      },
      {
        title: 'אפקט הבחינה: כישלון הוא המטרה',
        content: `זה קשור לשליפה אקטיבית, אבל חשוב מספיק לקבל סעיף משלו. אפקט הבחינה — הנקרא גם "למידה מוגברת שליפה" — הוא הממצא שבחינה על חומר משפרת זיכרון יותר מזמן לימוד נוסף.

הנה החלק הלא-אינטואיטיבי: אפקט הבחינה עובד גם כשעונים לא נכון. חלק מהמחקר מציע שניסיונות שליפה כושלים, ואחריהם משוב נכון, מייצרים זיכרונות חזקים יותר משליפה מוצלחת.

קורנל, הייס וביורק (2009) הדגימו את זה במחקר. משתתפים שניסו ונכשלו לענות על שאלות, ואז קיבלו את התשובה הנכונה, ביצעו טוב יותר במבחן סופי ממשתתפים שפשוט למדו את התשובות.

המשמעות לבניית אוצר מילים עמוקה. כשנתקלים במילה לא מוכרת במשחק מילים וחושבים "אני מכיר את זה... ראיתי את זה קודם... מה זה אומר..." — ההיאבקות הזו, גם אם נכשלים, גורמת למוח לעבוד יותר. והעבודה הקשה יוצרת עקבת זיכרון חזקה יותר.

לכן אני אומר לאנשים: אל תתייאשו כשמשחק מילים תוקע אתכם. כל מילה שלא מכירים היא הזדמנות. כל ניסיון שליפה כושל מכין את המוח לרגע שלומדים את התשובה.`,
      },
      {
        title: 'משפחות מילים ומורפולוגיה: קוד הרמאות שאף אחד לא מדבר עליו',
        content: `הטכניקה הזו עשתה את ההבדל הגדול ביותר בניסוי שלי, ומזעזע כמה מעט אנשים מדברים עליה.

מורפולוגיה היא חקר חלקי המילה — תחיליות, סיומות ושורשים. עברית, בניגוד לאנגלית, בנויה על מערכת שורשים תלת-עיצוריים שמייצרים משפחות מילים שלמות. ברגע שלומדים את הדפוסים, מילים חדשות מפסיקות להיות מחרוזות אקראיות של אותיות ומתחילות להיות פאזלים שאפשר לפענח.

דוגמה. השורש כ.ת.ב מייצר: כָּתַב, מִכְתָּב, כְּתוֹבֶת, כָּתְבָן, כְּתִיבָה, מַכְתֵּבָה. שורש אחד, מילים רבות, כולן מחוברות.

ניישן (2001) העריך שידע של כ-20 משפחות מילים בשבוע יכול לבנות אוצר מילים בקצב של פי ארבע מלימוד מילים בודדות בבידוד (פי ארבע!).

בשבוע השני, למדתי מילים בקצב כפול מהקצב ההתחלתי. לא כי למדתי יותר קשה, אלא כי כל מילה חדשה הגיעה מחוברת מראש למילים שכבר הכרתי. הרשת המורפולוגית עשתה את העבודה הכבדה.`,
      },
      {
        title: 'העברה חוצת-שפות: היתרון הרב-לשוני',
        content: `משהו שלא ציפיתי לו כשהתחלתי את הניסוי. משחק משחקי מילים בשפות מרובות שיפר את אוצר המילים שלי באנגלית.

זה נשמע פרדוקסלי, אבל המחקר תומך בזה. קרול וסטיוארט (1994) הציעו את המודל ההיררכי המתוקן של זיכרון דו-לשוני, שמציע שמילים בשפות שונות חולקות חיבורים מושגיים. כשלומדים מילה בשפה אחת, לא רק לומדים תווית — מחזקים את המושג הבסיסי.

בדקתי את זה על ידי משחק ב-LexiClash בשוודית. שוודית חולקת שורשים גרמניים עם אנגלית, אז מילים כמו HUND, HAND ו-VATTEN היו מזוהות מיד. אבל החלק המעניין היה החיבורים הפחות ברורים. מילה אחת בשוודית פתחה שלוש מילים חדשות באנגלית. זו העברה חוצת-שפות בפעולה.

מטא-אנליזה של אדסופה ועמיתיו (2010) מצאה שדו-לשוניים ביצעו טוב יותר באופן עקבי ממונולינגואלים במבחני אוצר מילים — גם בשפת האם שלהם. אתם לא צריכים לדבר שוטף שפה אחרת כדי להפיק תועלת. חשיפה בסיסית לקוגנטים — מילים שחולקות מקורות בין שפות — יכולה לחזק את רשת אוצר המילים.`,
      },
      {
        title: 'שגרות יומיות שבאמת עובדות',
        content: `הטכניקות למעלה הן המדע. אבל מדע בלי יישום הוא סתם טריוויה. השגרה היומית שהשתמשתי בה.

בבוקר, חמש עשרה דקות של משחק מילים. שיחקתי שני סיבובי בוגל והשתמשתי בזמן הנותר לחפש מילים שנתקלתי בהן אבל לא יכולתי להגדיר. מילים חדשות נכנסו ישר למחברת.

בצהריים, חמש עשרה דקות של חזרה מרווחת. דפדפתי במחברת וחזרתי על מילים שהגיע זמנן לפי לוח הזמנים. כיסיתי את ההגדרה, ניסיתי לזכור, בדקתי, המשכתי.

בערב, חמש עשרה דקות קריאה. קראתי חמש עשרה דקות עם המחברת פתוחה. כל מילה לא מוכרת נרשמה מיד.

זה הכל. ארבעים וחמש דקות ביום, מחולקות לשלוש פיסות. התובנה המפתח היא שתדירות חשובה יותר ממשך. שלושה סשנים של 15 דקות מנצחים סשן אחד של 45 דקות, כי כל סשן הוא הזדמנות שליפה נוספת.

כללי ברזל: כתבו ביד. השתמשו במילה תוך 24 שעות. שחקו עם אחרים לפחות פעמיים בשבוע. אין דחיסה.`,
      },
      {
        title: 'מדידת התקדמות (ולמה זה לא מה שחושבים)',
        content: `בסוף 30 יום, היו לי 523 מילים במחברת. אבל המספר הגולמי כמעט חסר משמעות. מה שחשוב הוא שימור ושימושיות.

בדקתי את עצמי בשלוש דרכים. קודם כל, שליפה קרה: עברתי על כל המחברת עם ההגדרות מכוסות. תוצאה: 447 מתוך 523 נכונות (85.5%). שנית, ביצועי משחקים: הציונים שלי בבוגל עלו ב-22%, ואורך המילה הממוצע שלי עלה מ-4.2 ל-5.1 אותיות. ושלישית, בשיחה: חברים סימנו 31 מקרים שבהם השתמשתי במילה שלא שמעו ממני קודם.

אבל מה שאני באמת רוצה להדגיש: המספר 500 מרשים, אבל הוא גם מטעה. הוא מציע שבניית אוצר מילים זה על צבירת פריטים בדידים.

זה לא. זה על בניית רשת. עד סוף הניסוי, הלקסיקון המנטלי שלי הרגיש שונה. מילים שכבר הכרתי קיבלו חיבורים חדשים. החיבורים המורפולוגיים והמושגיים לא רק עזרו לי לזכור מילים חדשות — הם הפכו את כל אוצר המילים שלי לנגיש יותר.

אתם לא צריכים 30 יום כדי להתחיל לראות תוצאות. קחו מחברת. שחקו משחק מילים אחד ביום. רשמו שלוש מילים חדשות. חזרו בחזרה מרווחת. השתמשו בכל מילה חדשה תוך 24 שעות. זה הכל. חמש עשרה עד עשרים דקות ביום.`,
      },
    ],
    backToBlog: 'חזרה לבלוג',
    tryDaily: 'נסו את האתגר היומי',
    practice: 'תרגלו עכשיו',
  },
  sv: {
    title: 'Jag lärde mig 500 nya ord på 30 dagar (Så här gjorde jag)',
    subtitle: 'Utspridd repetition, aktiv återkallelse, morfologihacks och dagliga rutiner som faktiskt fastnar. Inga flashcard-appar krävs.',
    category: 'Lärande',
    readTime: '12 min läsning',
    authorName: 'Ordnörden',
    authorBio: 'Självlärd ordförrådsbesatt som för en orddagbok, spelar ordspel tävlingsinriktat och en gång grät av glädje över ordet "defenestration."',
    sections: [
      {
        content: `För trettio dagar sedan startade jag ett experiment. Reglerna var enkla: lär dig så många nya ord som möjligt på en månad med bara ordspel och forskningsbaserade tekniker. Inga dyra kurser. Inga språkkurser. Bara jag, en anteckningsbok, en timer och ett pinsamt antal timmar med Boggle.

Resultatet? 500 nya ord. Inte "jag känner vagt igen det här"-ord — ord jag kan definiera, stava, använda i en mening och (avgörande) använda i ett ordspel för att få mina vänner att ångra att de utmanade mig.

Men det som gjorde detta experiment annorlunda än alla andra försök att bygga ordförråd: jag använde inte rå kraft. Jag satt inte med flashcards i timmar. Istället använde jag en kombination av kognitionsvetenskapliga tekniker som forskare har förfinat i över ett sekel.`,
      },
      {
        title: '30-dagarsexperimentet: Grundregler',
        content: `Innan jag går in på teknikerna, låt mig lägga ut parametrarna. För "jag lärde mig 500 ord" betyder ingenting utan sammanhang.

Definition av "lärt mig": Jag kunde producera ordet från minnet, definiera det korrekt, stava det korrekt och använda det i sammanhang. Detta är vad forskare kallar "produktivt ordförråd", till skillnad från "receptivt ordförråd," som bara är att känna igen ett ord när man ser det.

Ordkälla: Främst ordspel (Boggle, Scrabble-övning, korsord och dagliga ordpussel), kompletterat med läsning.

Tidsinvestering: Cirka 45 minuter per dag. Femton minuter ordspel, femton minuter repetition och femton minuter läsning. Teknikerna jag använde är utformade för att maximera bibehållande per minut av studier.

Vid dag 30 hade min anteckningsbok 523 poster. Några var obskyra. Några var praktiska. Och några var helt enkelt ljuvliga.`,
      },
      {
        title: 'Utspridd repetition: Ebbinghaus-kurvan som förändrade allt',
        content: `1885 gjorde en tysk psykolog vid namn Hermann Ebbinghaus något ingen gjort förut: han mätte systematiskt hur snabbt människor glömmer saker. Hans metod var brutal: han memorerade listor av nonsensstavelser och testade sedan sig själv vid ökande intervaller.

Det han upptäckte kallas nu "glömskekurvan," och det är ett av de mest replikerade resultaten i hela psykologin. Utan någon repetition glömmer man cirka 70% av ny information inom 24 timmar. Inom en vecka har man förlorat cirka 90%.

Men varje gång man repeterar informationen vid rätt ögonblick plattas kurvan ut. Minnet blir starkare. Intervallen mellan nödvändiga repetitioner blir längre.

Detta är utspridd repetition: att repetera information vid gradvis ökande intervaller. Repetition efter 1 dag, sedan 3, sedan 7, sedan 14, sedan 30 dagar. Varje repetition cementerar minnet fastare.

En metaanalys av Cepeda et al. (2006) analyserade 254 studier och fann att utspridd övning producerade signifikant bättre långsiktigt bibehållande än massad övning i praktiskt taget varje typ av material och varje åldersgrupp.`,
      },
      {
        title: 'Aktiv återkallelse: Varför läsning inte räcker',
        content: `Här är ett misstag jag gjorde i åratal: jag trodde att läsning var det bästa sättet att bygga ordförråd. Stöta på ett ord, slå upp det, gå vidare. Naturlig, organisk ordförrådstillväxt.

Det fungerar inte. Eller snarare, det fungerar, men det är otroligt långsamt och ineffektivt.

Problemet är att läsning är passivt. Man känner igen ord, producerar dem inte. Hjärnan gör minimalt arbete för att extrahera mening från texten.

Aktiv återkallelse är motsatsen. Istället för att titta på ett ord och komma ihåg dess definition (igenkänning), börjar man med definitionen och försöker producera ordet (återkallelse). Eller så tittar man på en blandad uppsättning bokstäver och försöker bilda ord, vilket är exakt vad ordspel gör.

Karpicke och Roediger (2008) publicerade en banbrytande studie i Science som visade att återkallelseövning producerade 80% bättre långsiktigt bibehållande än upprepat studerande av samma material. Åttio procent.

Därför är ordspel så effektiva ordförrådsbyggare. Varje gång man skannar ett bokstavsrutnät och drar ut ett ord från kaos av slumpvisa bokstäver gör man aktiv återkallelse. Spelet är studiesessionen. Man inser det bara inte för att man har kul.`,
      },
      {
        title: 'Testeffekten: Misslyckande är poängen',
        content: `Testeffekten, också kallad "återkallelseförbättrad inlärning", är fyndet att testning på material förbättrar minnet mer än ytterligare studietid.

Här är den kontraintuitiva delen: testeffekten fungerar även när man svarar fel. Viss forskning tyder på att misslyckade återkallelseförsök, följda av korrekt feedback, producerar starkare minnen än lyckad återkallelse.

Kornell, Hays och Bjork (2009) demonstrerade detta i en studie. Deltagare som försökte och misslyckades med att svara på frågor, och sedan fick rätt svar, presterade bättre på ett slutprov än deltagare som helt enkelt studerade svaren.

Implikationen för ordförrådsbyggande är djupgående. När man stöter på ett okänt ord i ett ordspel och tänker "jag vet det här... jag har sett det förut...", den kampen, även om man misslyckas, får hjärnan att arbeta hårdare. Och det hårdare arbetet skapar ett starkare minnesspår.

Därför säger jag till folk: bli inte avskräckt när ett ordspel ställer dig. Varje ord du inte kan är en möjlighet. Varje misslyckat återkallelseförsök grundar hjärnan för ögonblicket du lär dig svaret.`,
      },
      {
        title: 'Ordfamiljer och morfologi: Fuskkoden ingen pratar om',
        content: `Detta är tekniken som gjorde den största enskilda skillnaden i mitt experiment. Och den är chockerande underutnyttjad.

Morfologi är studiet av orddelar: prefix, suffix och rötter. Engelska är ett Frankensteinspråk byggt från latin, grekiska, germanska, franska och ett dussin andra källor. Men de källorna följer mönster. När man lär sig mönstren slutar nya ord att vara slumpvisa bokstavssträngar och börjar vara pussel man kan avkoda.

Här är ett exempel. Anta att du lär dig ordet EPHEMERAL (kortvarigt). Om du också lär dig att EPHEMER- kommer från grekiskans "ephemeros" som betyder "varar en dag," har du just låst upp en familj ord: EPHEMERA, EPHEMERIS, EPHEMERON. En rot, flera ord, alla sammankopplade.

Nation (2001) uppskattade att kunskap om cirka 20 ordfamiljer per vecka kan bygga ordförråd i ungefär fyra gånger hastigheten av att lära sig enskilda ord isolerat.

Under mitt experiment började jag gruppera nya ord efter deras rötter. BENE- (bra): BENEVOLENT, BENEFICIAL, BENEDICTION. MAL- (dålig): MALEVOLENT, MALICIOUS, MALADY. CHRON- (tid): CHRONOLOGICAL, CHRONIC, SYNCHRONIZE.

Vid vecka två lärde jag mig ord i nästan dubbelt så snabb takt. Inte för att jag studerade hårdare, utan för att varje nytt ord kom förankopplat till ord jag redan kände.`,
      },
      {
        title: 'Tvärlingvistisk överföring-3: Den flerspråkiga fördelen',
        content: `Något jag inte förväntade mig: att spela ordspel på flera språk gjorde mig bättre på engelskt ordförråd.

Det låter paradoxalt, men forskningen stödjer det. Kroll och Stewart (1994) föreslog att ord i olika språk delar konceptuella kopplingar. När man lär sig ett ord på ett språk stärker man det underliggande konceptet, vilket gör relaterade ord på andra språk lättare att lära sig.

Jag testade detta genom att spela LexiClash på svenska. Svenska delar germanska rötter med engelska, så ord som HUND, HAND och VATTEN var omedelbart igenkännbara. Men den intressanta delen var de mindre uppenbara kopplingarna.

En metaanalys av Adesope et al. (2010) fann att tvåspråkiga individer konsekvent överpresterade enspråkiga på ordförrådstester, även på sitt modersmål. Teorin är att hanteringen av flera språkliga system skapar ett mer flexibelt och sammankopplat mentalt lexikon.

Man behöver inte vara flytande på ett annat språk för att dra nytta av detta. Grundläggande exponering för kognater (ord som delar ursprung över språk) kan stärka ordförrådsnätverket.`,
      },
      {
        title: 'Dagliga rutiner som faktiskt fungerar',
        content: `Teknikerna ovan är vetenskapen. Men vetenskap utan implementering är bara trivia. Här är den dagliga rutin jag använde.

Morgon (15 minuter): Ordspelssession. Jag spelade två omgångar Boggle och använde resterande tid till att slå upp ord jag stött på men inte kunde definiera. Nya ord gick direkt i anteckningsboken.

Mitt på dagen (15 minuter): Utspridd repetition. Jag bläddrade genom anteckningsboken och repeterade ord som var förfallna enligt mitt schema. Täckte definitionen, försökte återkalla den, kontrollerade, gick vidare.

Kväll (15 minuter): Läsning. Jag läste femton minuter med anteckningsboken öppen. Varje okänt ord loggades omedelbart.

Det är allt. Fyrtiofem minuter om dagen, uppdelat i tre hanterbara bitar. Nyckelinsikten är att frekvens spelar mer roll än varaktighet. Tre 15-minuterssessioner slår en 45-minuterssession varje gång.

Oförhandlingsbara regler: Skriv för hand. Använd ordet inom 24 timmar. Spela med andra minst två gånger i veckan. Ingen pluggning.`,
      },
      {
        title: 'Mäta framsteg (och varför det inte är vad du tror)',
        content: `Vid slutet av 30 dagar hade jag 523 ord i min anteckningsbok. Men råsiffran är nästan meningslös. Det som spelar roll är bibehållande och användbarhet.

Jag testade mig på tre sätt. Kall återkallelsetest: 447 av 523 korrekta (85,5%). Ordspelsprestanda: mina Boggle-poäng ökade med 22%, och min genomsnittliga ordlängd ökade från 4,2 till 5,1 bokstäver. Samtalsanvändning: vänner flaggade 31 tillfällen där jag använde ett ord de inte hört från mig förut.

Men här är vad jag verkligen vill betona. Siffran 500 är imponerande men också missvisande. Den antyder att ordförrådsbyggande handlar om att samla diskreta objekt.

Det gör det inte. Det handlar om att bygga ett nätverk. Vid slutet av experimentet kändes mitt mentala lexikon annorlunda. Ord jag redan kände hade nya kopplingar. De morfologiska och konceptuella kopplingarna hjälpte inte bara mig att komma ihåg nya ord. De gjorde hela mitt ordförråd mer tillgängligt.

Du behöver inte 30 dagar för att börja se resultat. Skaffa en fysisk anteckningsbok. Spela ett ordspel om dagen. Logga tre nya ord. Repetera med utspridd repetition. Använd varje nytt ord inom 24 timmar. Femton till tjugo minuter om dagen.`,
      },
    ],
    backToBlog: 'Tillbaka till bloggen',
    tryDaily: 'Prova dagliga utmaningen',
    practice: 'Öva nu',
  },
  ja: {
    title: '30日で500の新しい単語を覚えた（具体的な方法はこれだ）',
    subtitle: '間隔反復、能動的想起、形態素ハック、そして本当に定着する日課。フラッシュカードアプリ不要。',
    category: '学習',
    readTime: '12分で読めます',
    authorName: 'ワードオタク',
    authorBio: '単語帳をつけ、ワードゲームを競技的にプレイし、「defenestration」という単語に感涙した独学の語彙マニア。',
    sections: [
      {
        content: `30日前、実験を始めた。ルールはシンプル：ワードゲームと研究に裏付けされたテクニックだけで、1ヶ月間にできるだけ多くの新しい単語を覚える。高額なコースなし。語学講師なし。自分とノートとタイマー、そして恥ずかしいほどの時間のボグルだけ。

結果？500の新しい単語。「なんとなく見覚えがある」レベルではなく、定義でき、綴れ、文中で使え、（決定的に）ワードゲームで展開して友達に挑戦したことを後悔させられる単語だ。

しかし、このニュイ件が過去のあらゆる語彙構築の試みと違った点：力ずくではなかった。何時間もフラッシュカードに向き合わなかった。代わりに、研究者が1世紀以上かけて洗練してきた認知科学テクニックの組み合わせを使った。`,
      },
      {
        title: '30日実験：基本ルール',
        content: `テクニックに入る前に、パラメータを示す。「500単語覚えた」は文脈なしでは意味がない。

「覚えた」の定義：記憶から単語を産出でき、正しく定義でき、正しく綴れ、文脈で使える。研究者はこれを「産出語彙」と呼ぶ ── 単語を見て認識するだけの「受容語彙」とは対照的だ。

単語の出典：主にワードゲーム（ボグル、スクラブル練習、クロスワード、デイリーワードパズル）、読書で補完。知らない単語に出会ったら記録した。

時間投資：1日約45分。ワードゲーム15分、復習15分、読書15分。これは重要 ── 1日4時間費やしていない。

30日目までに、ノートには523のエントリーがあった。珍しいものもあった。実用的なものもあった。そして単純に嬉しいものもあった。`,
      },
      {
        title: '間隔反復：全てを変えたエビングハウス曲線',
        content: `1885年、ヘルマン・エビングハウスというドイツの心理学者が誰もやったことのないことをした：人間がどれだけ速く忘れるかを体系的に測定した。彼の方法は過酷だった ── 無意味な音節のリストを暗記し、増加する間隔で自分をテストした。

彼が発見したものは今「忘却曲線」と呼ばれ、心理学全体で最も再現されている知見の一つだ。復習なしで、24時間以内に新しい情報の約70%を忘れる。1週間以内に約90%を失う。

しかし ── これが決定的な部分 ── 適切な瞬間に情報を復習するたびに、曲線は平坦になる。記憶が強くなる。必要な復習の間隔が長くなる。

これが間隔反復だ：徐々に増加する間隔で情報を復習する。1日後、3日後、7日後、14日後、30日後に復習。各復習が記憶をより確実に固める。

Cepedaら（2006）のメタ分析は254の研究を分析し、間隔を空けた練習が詰め込み（集中練習）よりも有意に優れた長期保持を生み出すことを発見した ── 事実上あらゆるタイプの教材とあらゆる年齢層で。`,
      },
      {
        title: '能動的想起：読書だけでは足りない理由',
        content: `何年も犯した間違い：読書が語彙を構築する最良の方法だと思っていた。文脈で単語に出会い、調べて、先に進む。自然で有機的な語彙成長。

機能しない。正確には機能するが、信じられないほど遅く非効率的だ。

問題は読書が受動的であること。単語を認識しているが、産出していない。脳はテキストから意味を抽出するために必要最小限の作業をしている。

能動的想起は逆だ。単語を見て定義を思い出す（認識）代わりに、定義から始めて単語を産出しようとする（想起）。またはシャッフルされた文字セットを見て単語を形成しようとする ── これは偶然ではなく、まさにワードゲームがやることだ。

KarpickeとRoediger（2008）はScienceに画期的な研究を発表し、検索練習（記憶から能動的に情報を引き出す）が同じ教材の繰り返し学習より80%優れた長期保持を生み出すことを示した。80%だ。

だからワードゲームは効果的な語彙構築ツールなのだ。文字の格子をスキャンしてランダムな文字のカオスから単語を引き出すたびに、能動的想起をしている。ゲームが学習セッション ── 楽しんでいるから気づかないだけだ。`,
      },
      {
        title: 'テスト効果：失敗こそがポイント',
        content: `テスト効果 ── 「検索強化学習」とも呼ばれる ── は、教材についてテストされることが追加の学習時間よりも記憶を改善するという知見だ。

直感に反する部分：テスト効果は答えを間違えた時でも機能する。実際、一部の研究は、失敗した検索試行の後に正しいフィードバックを受けると、成功した検索よりも強い記憶を生み出すことを示唆している。

Kornell、Hays、Bjork（2009）はこれを実証した。質問に答えようとして失敗し、その後正解を受け取った参加者は、最初に検索を試みずに単に答えを学習した参加者よりも最終テストで良い成績を収めた。

語彙構築への含意は深い。ワードゲームで馴染みのない単語に出会い「これ知ってる...前に見た...何だっけ...」と思う時 ── その苦闘は、たとえ失敗しても、脳をより強く働かせている。

だから言う：ワードゲームに行き詰まっても落胆しないで。知らない全ての単語はチャンスだ。全ての失敗した検索試行が、答えを学ぶ瞬間のために脳を準備している。`,
      },
      {
        title: '語族と形態素：誰も語らないチートコード',
        content: `これが実験で最も大きな差を生んだテクニックだ。そして驚くほど活用されていない。

形態素論は語の部品 ── 接頭辞、接尾辞、語根の研究だ。英語はラテン語、ギリシャ語、ゲルマン語、フランス語など多くの源から構築されたフランケンシュタイン言語だ。しかしそれらの源にはパターンがある。パターンを学べば、新しい単語はランダムな文字列ではなく、解読できるパズルになる。

例えば、EPHEMERAL（短命な）を学ぶ。EPHEMER-がギリシャ語の「ephemeros」（1日続く）から来ていると学べば、語族が開く：EPHEMERA、EPHEMERIS、EPHEMERON。一つの語根、複数の単語、全て接続。

日本語でも同様だ。漢字の知識は語族を自然に開く。「学」を知れば、学生、学校、学問、学者、学習が全て繋がる。

Nation（2001）は、週に約20の語族の知識が、個別の単語を孤立して学ぶ速度の約4倍で語彙を構築できると推定した。

2週目には、初期の速度のほぼ2倍で単語を学んでいた。より激しく勉強したからではなく、各新語が既知の単語に事前接続されていたからだ。`,
      },
      {
        title: '言語間転移：多言語の利点',
        content: `実験開始時に予想しなかったこと。複数言語でワードゲームをプレイすると、英語の語彙力が向上した。

逆説的に聞こえるが、研究が裏付けている。KrollとStewart（1994）は、異なる言語の単語が概念的接続を共有することを示唆するバイリンガル記憶の改訂階層モデルを提案した。ある言語で単語を学ぶと、ラベルを学ぶだけでなく、基礎となる概念を強化している。

LexiClashをスウェーデン語でプレイしてテストした。スウェーデン語は英語とゲルマン語根を共有するので、HUND、HAND、VATTENはすぐに認識できた。しかし興味深いのは、より明白でない接続だった。

Adesopeら（2010）のメタ分析は、バイリンガル個人がモノリンガルよりも語彙テストで一貫して優れた成績を収めることを発見した ── 母語でさえ。複数の言語システムを管理することが、より柔軟で相互接続されたメンタルレキシコンを作るという理論だ。

この恩恵を受けるのに別の言語に堪能である必要はない。コグネイト ── 言語間で起源を共有する単語 ── への基本的な露出だけで語彙ネットワークを強化できる。`,
      },
      {
        title: '実際に機能する日課',
        content: `上記のテクニックは科学だ。しかし実装なしの科学はただのトリビア。実際に使った日課はこれだ。

朝（15分）：ワードゲームセッション。ボグルを2ラウンドプレイし、残りの時間で出会ったが定義できない単語を調べた。新しい単語はすぐノートに入れた。

昼（15分）：間隔反復復習。ノートをめくり、スケジュールに基づいて期日の単語を復習した。定義を隠し、想起を試み、確認し、進む。

夜（15分）：読書。ノートを開いて15分読んだ。馴染みのない単語はすぐに記録した。

これだけ。1日45分、3つの管理可能なチャンクに分割。キーインサイトは頻度が持続時間より重要ということ。15分×3セッションが45分×1セッションに毎回勝つ。各セッションが追加の検索機会で、セッション間の間隔が脳に統合の時間を与える。

譲れないルール：手書きする。24時間以内に単語を使う。週2回は他の人とプレイする。詰め込みなし。`,
      },
      {
        title: '進捗の測定（そしてそれは思っているものと違う）',
        content: `30日の終わりに、ノートに523の単語があった。しかし生の数字はほぼ無意味。重要なのは保持と実用性だ。

3つの方法で自分をテストした。コールド想起テスト：447/523正解（85.5%）。ワードゲームパフォーマンス：ボグルスコアが22%増加、平均単語長が4.2から5.1文字に増加。会話での使用：友達が31回、聞いたことのない単語の使用をフラグした。

しかし本当に強調したいこと。500という数字は印象的だが、誤解を招く。語彙構築が離散的なアイテムの蓄積であることを示唆している。

そうではない。ネットワークの構築だ。実験の終わりまでに、メンタルレキシコンが違って感じた。既知の単語に新しい接続ができた。形態素的・概念的接続は新しい単語を覚えるだけでなく、語彙全体をよりアクセスしやすくした。

結果を見始めるのに30日は必要ない。物理的なノートを手に入れよう。1日1つワードゲームをプレイしよう。新しい単語を3つ記録しよう。間隔反復で復習しよう。新しい単語を24時間以内に使おう。1日15〜20分だ。`,
      },
    ],
    backToBlog: 'ブログに戻る',
    tryDaily: 'デイリーチャレンジを試す',
    practice: '今すぐ練習',
  },
  es: {
    title: 'Aprendi 500 palabras nuevas en 30 dias (Asi es exactamente como)',
    subtitle: 'Repeticion espaciada, recuerdo activo, hacks de morfologia y rutinas diarias que realmente se quedan. Sin apps de flashcards.',
    category: 'Aprendizaje',
    readTime: '12 min de lectura',
    authorName: 'El Nerd de las Palabras',
    authorBio: 'Obsesivo del vocabulario autodidacta que mantiene un diario de palabras, juega juegos de palabras competitivamente y una vez lloro de alegria por la palabra "defenestracion."',
    sections: [
      {
        content: `Hace treinta dias, empece un experimento. Las reglas eran simples: aprender tantas palabras nuevas como fuera posible en un mes usando solo juegos de palabras y tecnicas respaldadas por investigacion. Sin cursos costosos. Sin tutores. Solo yo, un cuaderno, un cronometro y una cantidad vergonzosa de horas jugando Boggle.

El resultado? 500 palabras nuevas. No palabras de "vagamente reconozco esto" — palabras que puedo definir, deletrear, usar en una oracion y (crucialmente) desplegar en un juego de palabras para que mis amigos lamenten haberme desafiado.

Pero esto es lo que hizo este experimento diferente de cualquier otro intento de construccion de vocabulario: no use fuerza bruta. No me sente con flashcards por horas. En cambio, use una combinacion de tecnicas de ciencia cognitiva que los investigadores han refinado durante mas de un siglo.`,
      },
      {
        title: 'El experimento de 30 dias: Reglas basicas',
        content: `Antes de entrar en las tecnicas, los parametros. Porque "aprendi 500 palabras" no significa nada sin contexto.

Para que cuente como "aprendida," tenia que poder producir la palabra de memoria, definirla correctamente, deletrearla correctamente y usarla en contexto. Esto es lo que los investigadores llaman "vocabulario productivo" — en oposicion al "vocabulario receptivo," que es solo reconocer una palabra al verla.

Las palabras venian principalmente de juegos de palabras (Boggle, practica de Scrabble, crucigramas y puzzles diarios), complementado con lectura.

La inversion de tiempo fue de aproximadamente 45 minutos al dia. Quince minutos de juegos de palabras, quince de revision y quince de lectura. Las tecnicas estan disenadas para maximizar la retencion por minuto de estudio.

Para el dia 30, mi cuaderno tenia 523 entradas. Algunas eran oscuras. Algunas eran practicas. Y algunas eran simplemente deliciosas.`,
      },
      {
        title: 'Repeticion espaciada: La curva de Ebbinghaus que lo cambio todo',
        content: `En 1885, un psicologo aleman llamado Hermann Ebbinghaus hizo algo que nadie habia hecho antes: midio sistematicamente cuan rapido los humanos olvidan las cosas. Su metodo fue brutal — memorizo listas de silabas sin sentido y luego se evaluo a intervalos crecientes.

Lo que descubrio ahora se llama "curva del olvido," y es uno de los hallazgos mas replicados en toda la psicologia. Sin ninguna revision, olvidas aproximadamente el 70% de la informacion nueva dentro de 24 horas. Dentro de una semana, has perdido alrededor del 90%.

Pero — y esta es la parte crucial — cada vez que revisas la informacion en el momento correcto, la curva se aplana. La memoria se fortalece. Los intervalos entre revisiones necesarias se alargan.

Esto es la repeticion espaciada: revisar informacion a intervalos gradualmente crecientes. Revision despues de 1 dia, luego 3, luego 7, luego 14, luego 30 dias.

Un metaanalisis de Cepeda et al. (2006) analizo 254 estudios y encontro que la practica espaciada produjo retencion a largo plazo significativamente mejor que la practica masiva en practicamente todo tipo de material y grupo de edad.`,
      },
      {
        title: 'Recuerdo activo: Por que leer no es suficiente',
        content: `Un error que cometi por anos: pensaba que leer era la mejor forma de construir vocabulario. Encontrar una palabra en contexto, buscarla, seguir adelante. Crecimiento natural y organico.

No funciona. O mas bien, funciona, pero es increiblemente lento e ineficiente.

El problema es que leer es pasivo. Estas reconociendo palabras, no produciendolas. Tu cerebro hace el minimo trabajo necesario para extraer significado del texto.

El recuerdo activo es lo opuesto. En lugar de mirar una palabra y recordar su definicion (reconocimiento), empiezas con la definicion e intentas producir la palabra (recuerdo). O miras un conjunto de letras mezcladas e intentas formar palabras — que es exactamente lo que hacen los juegos de palabras.

Karpicke y Roediger (2008) publicaron un estudio historico en Science mostrando que la practica de recuperacion produjo 80% mejor retencion a largo plazo que el estudio repetido del mismo material. Ochenta por ciento.

Por eso los juegos de palabras son constructores de vocabulario tan efectivos. Cada vez que escaneas una cuadricula de letras y extraes una palabra del caos, estas haciendo recuerdo activo. El juego es la sesion de estudio — solo no te das cuenta porque te estas divirtiendo.`,
      },
      {
        title: 'El efecto de evaluacion: El fracaso es el punto',
        content: `El efecto de evaluacion — tambien llamado "aprendizaje mejorado por recuperacion" — es el hallazgo de que ser evaluado sobre material mejora la memoria mas que tiempo adicional de estudio.

La parte contraintuitiva: el efecto funciona incluso cuando respondes mal. Algunas investigaciones sugieren que los intentos fallidos de recuperacion, seguidos de retroalimentacion correcta, producen memorias mas fuertes que la recuperacion exitosa.

Kornell, Hays y Bjork (2009) demostraron esto en un estudio. Los participantes que intentaron y fallaron en responder preguntas, y luego recibieron la respuesta correcta, rindieron mejor en un examen final que los participantes que simplemente estudiaron las respuestas.

La implicacion para la construccion de vocabulario es profunda. Cuando encuentras una palabra desconocida en un juego y piensas "conozco esto... lo he visto antes..." — esa lucha, incluso si fallas, hace que tu cerebro trabaje mas duro. Y ese trabajo mas duro crea una huella de memoria mas fuerte.

Por eso digo: no te desanimes cuando un juego de palabras te atasca. Cada palabra que no conoces es una oportunidad. Cada intento fallido de recuperacion esta preparando tu cerebro para el momento en que aprendas la respuesta.`,
      },
      {
        title: 'Familias de palabras y morfologia: El codigo trampa del que nadie habla',
        content: `Esta es la tecnica que hizo la mayor diferencia individual en mi experimento. Y esta sorprendentemente subutilizada.

La morfologia es el estudio de las partes de las palabras — prefijos, sufijos y raices. El espanol, al igual que el ingles, esta construido sobre raices latinas y griegas que siguen patrones. Una vez que aprendes los patrones, las palabras nuevas dejan de ser cadenas aleatorias de letras y se convierten en puzzles que puedes decodificar.

Un ejemplo. Digamos que aprendes EFIMERO. Si tambien aprendes que viene del griego "ephemeros" (que dura un dia), has desbloqueado una familia: EFIMERO, EFEMERA, EFEMERIDES. Una raiz, multiples palabras, todas conectadas.

En espanol esto es aun mas poderoso. El prefijo DES- (negacion): HACER/DESHACER, CUBRIR/DESCUBRIR, ARMAR/DESARMAR. El sufijo -CION: EDUCAR/EDUCACION, CREAR/CREACION, IMAGINAR/IMAGINACION.

Nation (2001) estimo que el conocimiento de aproximadamente 20 familias de palabras por semana puede construir vocabulario a aproximadamente cuatro veces la velocidad de aprender palabras individuales aisladamente.

Para la segunda semana, estaba aprendiendo palabras a casi el doble de mi ritmo inicial. No porque estudiara mas duro, sino porque cada nueva palabra venia preconectada a palabras que ya conocia.`,
      },
      {
        title: 'Transferencia translinguistica: La ventaja multilingue',
        content: `Algo que no esperaba: jugar juegos de palabras en multiples idiomas me hizo mejor en vocabulario ingles.

Suena paradojico, pero la investigacion lo respalda. Kroll y Stewart (1994) propusieron que las palabras en diferentes idiomas comparten conexiones conceptuales. Cuando aprendes una palabra en un idioma, no solo aprendes una etiqueta — estas fortaleciendo el concepto subyacente.

Lo probe jugando LexiClash en sueco. El sueco comparte raices germanicas con el ingles, asi que palabras como HUND, HAND y VATTEN eran inmediatamente reconocibles. Pero la parte interesante fueron las conexiones menos obvias.

Un metaanalisis de Adesope et al. (2010) encontro que los individuos bilingues consistentemente superaban a los monolingues en pruebas de vocabulario — incluso en su idioma nativo. La teoria es que manejar multiples sistemas linguisticos crea un lexico mental mas flexible e interconectado.

No necesitas ser fluido en otro idioma para beneficiarte. La exposicion basica a cognados — palabras que comparten origenes entre idiomas — puede fortalecer tu red de vocabulario. El frances LUMINEUX se relaciona obviamente con LUMINOSO. El sueco HAND conecta con MANO a traves de raices indoeuropeas.`,
      },
      {
        title: 'Rutinas diarias que realmente funcionan',
        content: `Las tecnicas de arriba son la ciencia. Pero ciencia sin implementacion es solo trivia. Te cuento la rutina diaria que use.

Por la manana, quince minutos de juego de palabras. Jugaba dos rondas de Boggle y usaba el tiempo restante para buscar palabras que habia encontrado pero no podia definir. Palabras nuevas iban directo al cuaderno.

Al mediodia, quince minutos de repeticion espaciada. Repasaba el cuaderno y revisaba palabras que correspondian segun mi calendario. Cubria la definicion, intentaba recordarla, verificaba, seguia.

Y por la noche, quince minutos de lectura. Leia quince minutos con el cuaderno abierto. Cualquier palabra desconocida se registraba inmediatamente.

Eso es todo. Cuarenta y cinco minutos al dia, divididos en tres bloques manejables. La intuicion clave es que la frecuencia importa mas que la duracion. Tres sesiones de 15 minutos superan a una sesion de 45 minutos cada vez.

Reglas innegociables: Escribir a mano. Usar la palabra dentro de 24 horas. Jugar con otros al menos dos veces por semana. Sin atiborrar.`,
      },
      {
        title: 'Medir el progreso (y por que no es lo que piensas)',
        content: `Al final de 30 dias, tenia 523 palabras en mi cuaderno. Pero el numero bruto es casi insignificante. Lo que importa es la retencion y la usabilidad.

Me evalue de tres formas. En recuerdo frio, 447 de 523 correctas (85.5%). En rendimiento de juegos, mis puntajes de Boggle aumentaron un 22%, y mi longitud promedio de palabra aumento de 4.2 a 5.1 letras. En uso conversacional, amigos senalaron 31 instancias donde use una palabra que no habian escuchado de mi antes.

Pero ojo. El numero 500 es impresionante pero tambien enganoso. Sugiere que construir vocabulario se trata de acumular elementos discretos.

No lo es. Se trata de construir una red. Al final del experimento, mi lexico mental se sentia diferente. Palabras que ya conocia tenian nuevas conexiones. Las conexiones morfologicas y conceptuales no solo me ayudaron a recordar nuevas palabras — hicieron todo mi vocabulario mas accesible.

No necesitas 30 dias para empezar a ver resultados. Consigue un cuaderno fisico. Juega un juego de palabras al dia. Registra tres palabras nuevas. Revisa con repeticion espaciada. Usa cada palabra nueva dentro de 24 horas. Quince a veinte minutos al dia.`,
      },
    ],
    backToBlog: 'Volver al blog',
    tryDaily: 'Prueba el desafio diario',
    practice: 'Practica ahora',
  },
};
