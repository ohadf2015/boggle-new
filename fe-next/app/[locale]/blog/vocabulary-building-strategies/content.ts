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
        content: `Thirty days ago, I started an experiment. Learn as many new words as possible using only word games and cognitive science. No flashcard apps. No tutors. No language courses. Just me, a notebook, a timer, and an embarrassing amount of Boggle.

Result: 523 words. Not "I vaguely recognize this." Words I can spell, define, use in a sentence, and deploy to make my friends regret challenging me in word games.

What made this different: I didn't brute force it with hours of flashcards. Instead, I combined research-backed techniques that psychologists have been refining for over a century. Most people have never heard of them, even though the evidence is overwhelming.

Why this matters: Most vocabulary-building advice is useless. Spend 30 minutes reading and you'll encounter maybe 5-10 new words. Spend 30 minutes with spaced repetition and active recall, and you'll retain 4x as many. The gap between common wisdom and actual science is absurd.

I'll walk you through what worked, why it works, and how to replicate it. Full citations so you can fact-check. I'm a word nerd, not a neuroscientist—but I can tell you exactly what the research shows.`,
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

Nation (2001) estimated that knowledge of 20 word families per week builds vocabulary at 4x the rate of learning isolated words. Quadrupling your learning rate is not a marginal improvement—it's life-changing.

I started grouping words by roots. MAGN- (great): MAGNIFICENT, MAGNITUDE, MAGNANIMOUS. CHRON- (time): CHRONOLOGICAL, CHRONIC, SYNCHRONIZE. Each new word arrived pre-wired to words I already knew. The network was doing the cognitive work, not me.

By week two, I was learning at double my initial rate. Not because I studied harder—because each new word was already connected to a network. MAGNANIMOUS in a crossword? I already knew MAGN- (great) from previous words, and ANIM- (spirit) from ANIMATE. So MAGNANIMOUS, great-spirited, practically defined itself.

For word games, morphology is a superpower. If you know -TION, -SION, -MENT, -NESS, -LY are common suffixes, you can extend base words systematically. AGREE becomes AGREEMENT, AGREEABLE, AGREEABLY—three words from one root, and your opponents never see it coming.`,
      },
      {
        title: 'Bilingual leverage',
        content: `Playing word games in multiple languages made my English vocabulary better. Sounds backwards.

Kroll and Stewart (1994) proposed that words in different languages share conceptual connections. Learning a word in one language strengthens the underlying concept, which helps related words in other languages. It's not translation—it's interconnected depth.

I tested this in Swedish. HUND (dog), HAND (hand), VATTEN (water) were immediately recognizable Germanic cognates. Then I noticed deeper connections. Learning UNGEFAR (approximately) led me to UNFAIR, then INEQUITABLE, then INIQUITY—a chain unlocked by one Swedish word.

Adesope et al.'s 2010 meta-analysis found bilingual individuals outperformed monolinguals on vocabulary tests, even in their native language. The theory: managing multiple linguistic systems creates a more flexible and interconnected mental lexicon.

You don't need fluency. Basic exposure to cognates strengthens your vocabulary network. LUMINEUX (French bright) connects to LUMINOUS. CORAZON (Spanish heart) connects to CORONARY through Latin. Even TSUNAMI is TSUNAMI across languages.

During weeks 3-4, I deliberately hunted for cross-linguistic hooks. Five minutes per review session. Retention improvement was noticeable. Words with multiple-language connections stuck better than monolingual words—more neural pathways, more retrieval routes.`,
      },
      {
        title: 'The actual daily routine (45 minutes total)',
        content: `Science without implementation is trivia. Here's exactly what I did:

Morning (15 min): Two rounds of Boggle. New words went straight into a physical notebook with definition and example sentence. I didn't overthink it—if I played a word I couldn't define, it got logged.

Midday (15 min): Spaced repetition review. Cover the definition, try to recall it from memory. Words I couldn't recall got flagged for extra review the next day.

Evening (15 min): Read longform journalism or nonfiction with notebook open. Any unfamiliar word got logged immediately. The physical presence of the notebook changed my reading behavior—instead of glossing over unknown words, I engaged with them.

The structure matters. Forty-five minutes split into three chunks beats 45 minutes at once because you get multiple retrieval opportunities per day, and spacing between sessions gives your brain time to consolidate.

Key non-negotiable rules:

Write by hand. Handwriting engages motor areas that typing doesn't, creating additional memory traces (Mueller & Oppenheimer, 2014).

Use the word within 24 hours. Forced production beats passive recognition. Text a friend, drop it in an email, say it out loud.

Play with others 2+ times per week. Social game sessions provide competitive motivation and emotional amplification—memories stick better when emotions are involved.

No cramming. When 15 minutes ended, I stopped. Even if I was on a roll.`,
      },
      {
        title: 'What the results meant',
        content: `At day 30: 523 words logged. Cold recall test: 447/523 correct (85.5%). Boggle scores up 22%. Average word length increased from 4.2 to 5.1 letters. I wasn't just finding more words—I was finding harder words.

But the number 500 is misleading. Vocabulary isn't about accumulating discrete items like collecting stamps. It's not quantity for quantity's sake.

It's about building a network.

By day 30, words I already knew had new connections. EPHEMERAL linked to EPHEMERA, linked to DIURNAL, linked to NOCTURNAL, linked to EQUINOX. The morphological connections I'd deliberately built didn't just help me remember new words. They made my entire vocabulary more accessible—for reading, writing, thinking, communicating.

Collins and Loftus (1975) called this network theory: words are nodes in an interconnected system. Activate one node, related nodes partially activate through "spreading activation." More connections = easier and faster retrieval. That's not just neuroscience—it's how vocabulary actually lives in your brain.

My 30 days didn't just add 500 nodes. It added thousands of new connections between existing nodes. Those connections are what make vocabulary useful beyond trivia.

The good news: you don't need 30 days to start reaping rewards. Three new words per day, logged and reviewed with spacing, is 1,000 words per year. By month three, you'll be learning faster than month one because your morphological network is doing the heavy lifting.

The techniques work. Word games make it fun. The only variable is whether you'll commit to the routine.`,
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
    title: 'Jag knäckte 500 nya ord på 30 dagar. Metoden är löjligt enkel.',
    subtitle: 'Utspridd repetition, aktiv återkallelse, morfologihacks och dagliga rutiner som faktiskt fastnar. Inga flashcard-appar krävs.',
    category: 'Lärande',
    readTime: '8 min läsning',
    authorName: 'Ordnörden',
    authorBio: 'Självlärd ordförrådsbesatt som för en orddagbok, spelar ordspel tävlingsinriktat och en gång grät av glädje över ordet "defenestration."',
    sections: [
      {
        content: `För trettio dagar sedan startade jag ett experiment. Reglerna var enkla: lär dig så många nya ord som möjligt på en månad med bara ordspel och vetenskap. Inga dyra kurser. Ingen lärare som vet bättre än mig. Bara jag, en anteckningsbok, en timer och en pinsam mängd Boggle.

Resultatet? 523 ord. Inte "jag har ungefär sett det här"-ord — ord jag kan stava, definiera, använda i en mening och (avgörande) dra fram i ett ordspel för att få mina vänner att ångra att de utmanade mig.

Det som gjorde detta experiment annorlunda: jag använde inte rå kraft. Jag satt inte med flashcards i timmar. Istället kombinerade jag forskningsbaserade tekniker som psykologer har förfinat i över hundra år. De flesta människor har aldrig hört talas om dem. Ändå är bevisen överväldigande.`,
      },
      {
        title: 'Glömskekurvan (och varför den spelar roll)',
        content: `1885 gjorde en tysk psykolog vid namn Hermann Ebbinghaus något radikalt: han mätte systematiskt hur snabbt människor glömmer. Hans metod var brutal — han memorerade meningslösa stavelser (DAX, BUP, ZOL) och testade sig själv vid ökande intervaller.

Det han upptäckte: utan repetition glömmer du cirka 70% av ny information på 24 timmar. Efter en vecka är omkring 90% borta.

Men här kommer det magiska. Varje gång du repeterar informationen vid rätt tidpunkt blir kurvan flytare. Minnet blir starkare. Intervallen mellan repetitioner blir längre.

Cepeda et al:s metaanalys från 2006 analyserade 254 studier med över 14 000 deltagare. Resultatet: utspridd repetition slag massaid övning varje gång, oavsett ålder och ämne.

I mitt experiment repeterade jag varje nytt ord efter 1, 3, 7, 14 och 28 dagar. Ingen app — bara en anteckningsbok och en kalender. Resultat: 85,5% bibehållande på dag 30. I tidigare försök utan utspridning glömde jag 15 av 20 ord redan nästa vecka.

En princip. Det räcker för de flesta vinster.`,
      },
      {
        title: 'Aktiv återkallelse: varför läsning inte räcker',
        content: `Jag trodde länge att läsning var vägen till större ordförråd. Du möter ett ord, slår upp det, går vidare. Naturligt. Organiskt.

Det fungerar inte. Läsning är passiv. Din hjärna gör minsta möjliga ansträngning för att plocka ut mening från texten — inte tillräckligt för att bygga starka minnen.

Aktiv återkallelse är motsatsen. Istället för att titta på ett ord och komma ihåg (igenkänning), börjar du med definitionen och tvingar din hjärna att producera ordet (återkallelse). Eller så ser du bokstäver AELNR och måste forma LEARN, RENAL, ALIEN. Det är exakt vad ordspel gör.

Karpicke och Roediger visade 2008 i Science: återkallelseövning producerade 80% bättre långsiktigt minne än upprepad läsning. Åttio procent. Ansträngningen att dra ett ord från minnet — det är vad som cementerar det.

Det är därför ordspel är så effektiva. Varje gång du skannar ett rutnät och jagar fram EPHEMERAL gör du aktiv återkallelse. Spelet är själva studiesessionen.

Det kontraintuitiva: misslyckade försök följda av rätt feedback skapar starkare minnen än lyckade försök. Kornell, Hays och Bjork 2009. Jag bekräftade det. QUAHOG (en typ av musla) fastnade direkt för att jag spelade det som ett desperat gissande. SANGUINE, som jag lugnt slog upp i en roman, tog tre sessioner.

Ju hårdare du misslyckas, desto starkare minns du.`,
      },
      {
        title: 'Ordfamiljer: fuskkoden',
        content: `Den här tekniken gjorde den största skillnaden i mitt experiment.

Morfologi är studiet av orddelar — prefix, suffix, rötter. Engelska är byggt på latin, grekiska och germanska. De källorna följer mönster. När du lär dig mönstren slutar nya ord att vara slumpvisa bokstavssträngar. De blir pussel du kan lösa.

Du lär dig EPHEMERAL (kortvarigt). Du lär dig EPHEMER- kommer från grekiskans "ephemeros" (varar en dag). Då låser du upp en familj: EPHEMERA, EPHEMERIS, EPHEMERON. En rot. Tre ord. Alla kopplade.

Nation 2001: kunskap om ungefär 20 ordfamiljer per vecka bygger ordförråd i ungefär fyra gånger hastigheten av att lära sig ord isolerat. Fyrdubbla din lärhastighet. Det är ingen marginell förbättring.

Jag började gruppera nya ord efter rot. BENE- (bra): BENEVOLENT, BENEFICIAL, BENEDICTION. MAL- (dålig): MALEVOLENT, MALICIOUS, MALADY. CHRON- (tid): CHRONOLOGICAL, CHRONIC, SYNCHRONIZE.

Vid vecka två lärde jag mig ord nästan två gånger så fort. Inte för att jag studerade hårdare. För att varje nytt ord kom förankopplat till ord jag redan kände. Nätverket gjorde jobbet.`,
      },
      {
        title: 'Tvåspråkigt öppnar dörrar',
        content: `Något överraskande: att spela ordspel på flera språk gjorde mig bättre på engelska.

Kroll och Stewart 1994: ord i olika språk delar konceptuella kopplingar. Lära en ord på ett språk stärker det underliggande konceptet. Det hjälper relaterade ord på andra språk.

Jag testade genom att spela på svenska. Svenska delar germanska rötter med engelska: HUND, HAND, VATTEN var omedelbar igenkännbara. Men det intressanta var de mindre uppenbara kopplingarna. Ett svenskt ord öppnade tre engelska.

Adesope et al. 2010: tvåspråkiga överträffade enspråkiga på ordförrådstest — även på sitt modersmål. Teorin: att hantera flera språkliga system skapar ett mer flexibelt mentalt lexikon.

Du behöver inte vara flytande. Grundläggande exponering för kognater — ord som delar ursprung — kan stärka ditt nätverk. LUMINEUX (franska) kopplar till LUMINOUS. CORAZON (spanska) kopplar till CORONARY. Flera språk, flera vägar att hämta samma ord.`,
      },
      {
        title: 'Rutinen som faktiskt fungerar (45 minuter totalt)',
        content: `Vetenskap utan handling är bara trivia. Min dagliga rutin:

Morgon (15 min): Två omgångar Boggle. Nya ord direkt i anteckningsboken med definition och exempelmening.

Mitt på dagen (15 min): Utspridd repetition. Dölj definitionen, försök återkalla, kontrollera.

Kväll (15 min): Läsning med anteckningsboken öppen. Okänt ord → loggat omedelbar.

Det är allt. 45 minuter uppdelat i tre bitar slår 45 minuter på en gång. Du får flera återkallelsetillfällen per dag, plus vila mellan sessioner för konsolidering.

Ej förhandlingsbara regler: Skriv för hand — det engagerar motoriska områden som typning inte gör. Använd ordet inom 24 timmar. Spela med andra minst två gånger i veckan. Ingen pluggning när timern slutar.`,
      },
      {
        title: 'Vad resultaten betydde',
        content: `Dag 30: 523 ord loggade. Kalltest: 447 av 523 rätt (85,5%). Bogglescorer upp 22%. Genomsnittlig ordlängd från 4,2 till 5,1 bokstäver.

Men siffran 500 är vilseledande. Ordförråd handlar inte om att samla diskreta föremål. Det handlar om att bygga ett nätverk.

Vid dag 30 hade redan lärt ord nya kopplingar. EPHEMERAL kopplade till EPHEMERA, till DIURNAL, till NOCTURNAL, till EQUINOX. De morfologiska kopplingar jag byggt hjälpte inte bara mig att minnas nya ord. De gjorde mitt helt ordförråd mer tillgängligt — för läsning, skrivning, tänkande, kommunikation.

Collins och Loftus 1975: ord är noder i ett sammankopplat system. Aktivera en nod, närliggande noder aktiveras genom "spreading activation." Fler kopplingar = snabbare hämtning. Det är inte bara neurovetenskap. Det är hur ordförråd faktiskt fungerar i din hjärna.

Mina 30 dagar lade inte bara till 500 noder. De lade till tusentals kopplingar mellan befintliga noder. De kopplingarna är vad som gör ordförråd användbart.

Du behöver inte 30 dagar för att börja se resultat. Tre nya ord per dag, loggade och repeterade med utspridning, är 1 000 ord per år. Vid månad tre lär du snabbare än månad ett. Nätverket gör det tunga arbetet.`,
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
  ru: {
    title: 'Выучил 500 новых слов за 30 дней — и вот как я это сделал',
    subtitle: 'Интервальное повторение, активное припоминание, морфологические трюки и ежедневные привычки, которые действительно работают. Без приложений-карточек.',
    category: 'Обучение',
    readTime: '14 минут чтения',
    authorName: 'Ohad Fisher',
    authorBio: 'Одержимый словарным запасом, который ведёт дневник слов, играет в словесные игры на конкурсной основе, и однажды пролил слёзы радости от слова «дефенестрация».',
    sections: [
      {
        content: `Тридцать дней назад я начал эксперимент. Правила были простые: выучить как можно больше новых слов за месяц, используя только словесные игры и исследованиями подтверждённые техники. Без дорогих курсов. Без репетиторов. Только я, блокнот, таймер и стыдное количество часов в Boggle.

Результат? 523 новых слова. Не слова вроде «я где-то видел это» — слова, которые я могу определить, правильно написать, использовать в предложении и (самое главное) применить в словесной игре, чтобы мои друзья пожалели, что ввязались со мной.

Но что отличало этот эксперимент от других попыток расширить словарь: я не полагался на брутальные методы. Я не сидел часами с карточками. Вместо этого я применил комбинацию техник когнитивной науки, которые исследователи совершенствовали больше ста лет.`,
      },
      {
        title: 'Эксперимент на 30 дней: базовые правила',
        content: `Прежде чем переходить к техникам, давай обозначим параметры. Потому что «выучил 500 слов» — это ничего не говорит без контекста.

Что значит «выучил»? Я мог припомнить слово из памяти, правильно его определить, правильно написать и использовать в контексте. Это то, что исследователи называют «активный словарь» — в отличие от «пассивного словаря», когда ты просто узнаёшь слово при виде.

Откуда брались слова? В основном из словесных игр (Boggle, тренировка Scrabble, кроссворды, ежедневные словесные головоломки в LexiClash), плюс чтение.

Время, которое я тратил: примерно 45 минут в день. Пятнадцать минут на игры, пятнадцать на повторение, пятнадцать на чтение. Техники рассчитаны на максимальное удержание в расчёте на минуту учёбы.

К 30-му дню в моём блокноте было 523 записи. Некоторые слова были экзотичные. Некоторые практичные. А некоторые просто восхитительные.`,
      },
      {
        title: 'Интервальное повторение: кривая Эббингауза, изменившая всё',
        content: `В 1885 году немецкий психолог Герман Эббингауз сделал что-то революционное: он систематически измерил, насколько быстро люди забывают информацию. Его метод был жёсткий — он зубрил списки бессмысленных слогов и тестировал себя через растущие интервалы.

То, что он открыл, теперь называется «кривой забывания», и это один из самых воспроизводимых результатов во всей психологии. Без повторения ты забываешь примерно 70% новой информации за 24 часа. Через неделю теряешь примерно 90%.

Но — и это критическая часть — каждый раз, когда ты повторяешь информацию в правильный момент, кривая выравнивается. Память усиливается. Интервалы между повторениями становятся длиннее.

Это интервальное повторение: повторять информацию с постепенно растущими интервалами. Повторение через 1 день, потом через 3, потом 7, потом 14, потом 30 дней. Каждое повторение делает воспоминание более прочным.

Метаанализ Cepeda et al. (2006) проанализировал 254 исследования и обнаружил, что интервальная практика производит значительно лучшее долгосрочное удержание, чем массивная практика (зубрёжка), почти для всех типов материала и возрастных групп.`,
      },
      {
        title: 'Активное припоминание: почему чтения недостаточно',
        content: `Ошибка, которую я совершал годами: я думал, что чтение — лучший способ расширить словарь. Встретишь слово в контексте, посмотришь перевод, идёшь дальше. Естественный, органичный рост.

Это не работает. Вернее, работает, но невероятно медленно и неэффективно.

Проблема в том, что чтение пассивно. Ты узнаёшь слова, не производя их. Мозг делает минимум, необходимый для извлечения смысла.

Активное припоминание — противоположность. Вместо того чтобы посмотреть на слово и вспомнить определение (узнавание), ты начинаешь с определения и пытаешься произвести слово (припоминание). Или видишь перемешанные буквы и пытаешься составить слова — именно это делают словесные игры.

Karpicke и Roediger (2008) опубликовали во время исследование в Science, которое показало, что практика припоминания дала на 80% лучшее долгосрочное удержание, чем повторное изучение того же материала. 80 процентов! Усилие припомнить слово из памяти — вот что закрепляет его.

Поэтому словесные игры — такие эффективные инструменты для расширения словаря. Каждый раз, когда ты сканируешь сетку букв и вытягиваешь слово из хаоса, ты занимаешься активным припоминанием. Игра — это учебная сессия. Просто ты не замечаешь этого, потому что веселишься.`,
      },
      {
        title: 'Эффект тестирования: неудача — это цель',
        content: `Эффект тестирования — также называемый «обучение, усиленное припоминанием» — это открытие, что тестирование на материале улучшает память лучше, чем дополнительное время на учёбу.

Контринтуитивная часть: эффект работает даже когда ты отвечаешь неправильно. Некоторые исследования предполагают, что неудачные попытки припомнить, за которыми следует правильная обратная связь, создают более сильные воспоминания, чем успешное припоминание.

Kornell, Hays и Bjork (2009) доказали это в исследовании. Участники, которые пытались и не смогли ответить на вопросы, а потом получили правильный ответ, показали лучше результаты на финальном тесте, чем участники, которые просто изучили ответы.

Смысл для расширения словаря глубок. Когда ты встречаешь незнакомое слово в игре и думаешь «я его знаю... где-то видел... что это значит...» — эта борьба, даже если ты проиграешь, заставляет мозг работать интенсивнее. И интенсивная работа создаёт более прочную память.

Поэтому я говорю: не отчаивайся, когда словесная игра тебя ставит в тупик. Каждое незнакомое слово — это возможность. Каждая неудачная попытка припомнить подготавливает мозг к моменту, когда ты узнаешь правильный ответ.`,
      },
      {
        title: 'Словесные семейства: хак, о котором никто не говорит',
        content: `Это техника сделала наибольшую разницу в моём эксперименте. И её удивительно мало используют.

Морфология — это изучение частей слов: приставок, суффиксов, корней. Русский язык, как и английский, построен на латинских, греческих и славянских корнях, которые следуют паттернам. Раз ты узнаёшь паттерны, новые слова перестают быть случайной цепочкой букв и становятся головоломками, которые ты можешь разгадать.

Пример. Допустим, ты выучил слово ЭФЕМЕРНЫЙ. Если ты также узнаёшь, что оно приходит от греческого «ephemeros» (длящийся день), ты разблокировал семейство: ЭФЕМЕРНЫЙ, ЭФЕМЕРИДНЫЙ. Один корень, несколько слов, все связанные.

На русском это ещё более мощно. Приставка ПРЕ-: ПРЕВОСХОДНЫЙ, ПРЕИМУЩЕСТВО, ПРЕВРАТНЫЙ. Суффикс -НОСТЬ: КРАСОТА/КРАСИВОСТЬ, МУДРОСТЬ, ЧЕСТНОСТЬ. Корень ВОДА: ВОДА, ВОДНЫЙ, ПОДВОДНЫЙ, ВОДОВОД, ВОДОВОЗ.

Nation (2001) оценивал, что знание примерно 20 словесных семейств в неделю может расширять словарь примерно в четыре раза быстрее, чем изучение отдельных слов в изоляции.

На второй неделе я учил слова почти в два раза быстрее, чем в начале. Не потому что учился интенсивнее, а потому что каждое новое слово приходило уже связанным с известными мне словами. Сеть делала тяжёлую работу.`,
      },
      {
        title: 'Языковой перенос: преимущество многоязычия',
        content: `Что-то неожиданное: игра в словесные игры на нескольких языках улучшила мой английский словарь.

Звучит парадоксально, но исследования это поддерживают. Kroll и Stewart (1994) предложили, что слова на разных языках разделяют концептуальные связи. Когда ты учишь слово на одном языке, ты не только учишь ярлык — ты укрепляешь основную концепцию.

Я тестировал это, играя в LexiClash на шведском. Шведский разделяет германские корни с английским, поэтому слова как HUND, HAND, VATTEN были сразу узнаваемы. Но интересная часть была менее очевидные связи. Одно шведское слово открывало несколько английских.

Метаанализ Adesope et al. (2010) обнаружил, что двуязычные люди постоянно перевосходили одноязычных на тестах словаря — даже на родном языке. Теория: управление несколькими языковыми системами создаёт более гибкий и взаимосвязанный ментальный лексикон.

Тебе не нужно быть беглым в другом языке, чтобы получить пользу. Базовое знакомство с когнатами — словами, которые разделяют происхождение между языками — может укрепить твою словесную сеть. Французское LUMINEUX явно связано с английским LUMINOUS. Русское ВОДА связано с английским WATER через индоевропейские корни.`,
      },
      {
        title: 'Ежедневные привычки, которые действительно работают',
        content: `Техники выше — это наука. Но наука без реализации — просто мелочи. Вот ежедневная рутина, которую я использовал.

Утро (15 минут): Сессия словесной игры. Я играл два раунда Boggle и использовал оставшееся время, чтобы найти слова, которые я встретил, но не мог определить. Новые слова шли сразу в блокнот.

День (15 минут): Интервальное повторение. Я просматривал блокнот и повторял слова, которые были запланированы по моему графику. Закрывал определение, пытался вспомнить, проверял, продолжал.

Вечер (15 минут): Чтение. Я читал 15 минут с открытым блокнотом. Любое незнакомое слово записывалось сразу.

Вот и всё. 45 минут в день, разделённые на три управляемых блока. Ключевое понимание: частота важнее длительности. Три 15-минутные сессии бьют одну 45-минутную каждый раз.

Железные правила: Пиши вручную. Используй слово в течение 24 часов. Играй с другими хотя бы два раза в неделю. Без зубрёжки.`,
      },
      {
        title: 'Измерение прогресса (и почему это не то, что ты думаешь)',
        content: `На 30-й день я имел 523 слова в блокноте. Но сырое число почти ничего не значит. Что важно — это удержание и практичность.

Я себя тестировал тремя способами. Холодное припоминание: 447 из 523 правильно (85.5%). Производительность в игре: мои очки в Boggle выросли на 22%, средняя длина слова выросла с 4.2 до 5.1 букв. Использование в беседе: друзья отметили 31 случай, когда я использовал слово, которое они от меня не слышали раньше.

Но вот что: число 500 впечатляет, но и обманчиво. Оно предполагает, что расширение словаря — это накопление дискретных элементов.

Это не так. Это построение сети. К концу эксперимента мой ментальный лексикон ощущался по-другому. Слова, которые я уже знал, получили новые связи. Морфологические и концептуальные связи не только помогли мне вспомнить новые слова — они сделали весь мой словарь более доступным.

Тебе не нужно 30 дней, чтобы начать видеть результаты. Возьми физический блокнот. Играй в словесную игру один раз в день. Запиши три новых слова. Повтори с интервальным повторением. Используй каждое новое слово в течение 24 часов. 15-20 минут в день.`,
      },
    ],
    backToBlog: 'Вернуться в блог',
    tryDaily: 'Попробуй ежедневный вызов',
    practice: 'Практикуйся сейчас',
  },
};
