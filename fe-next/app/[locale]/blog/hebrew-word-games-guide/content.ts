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

In English, you scan a grid left to right, searching for letter patterns your brain has memorized. C-A-T. T-H-E. Pattern recognition feels automatic.

In Hebrew, your brain does something much stranger. It reconstructs words from consonant skeletons, mentally inserts vowels that are not written on the page, navigates a right-to-left reading direction that flips your spatial processing entirely, and recognizes that three seemingly random letters might share a root connecting them to dozens of different words. The cognitive load is fundamentally higher.

I fell in love with Hebrew word games two years ago at a Scrabble night in Tel Aviv. I walked in knowing 200 Hebrew words and lost spectacularly. But I understood something no textbook had ever made clear: how the Hebrew language actually works at a structural level, how roots and templates interlock, how native speakers instantly activate entire word families from three consonants.

This article is about that understanding. Whether you are a native speaker curious about your language, a learner trying to level up, or a designer wondering how to build RTL word games, you will find something here. I am writing from the perspective of an obsessed outsider who spent two years learning to think in Hebrew.`,
      },
      {
        title: 'The shoresh system: three letters unlock everything',
        content: `The core difference between Hebrew and English: the shoresh (שורש), the three-letter root that carries a word's meaning.

In English, "cat" and "catalog" are unrelated. In Hebrew, nearly every word derives from a three-letter root. Insert that root into different templates (mishkalim), and you generate a family of related words.

Take כ-ת-ב (K-T-V), meaning "write":
- כָּתַב (katav): he wrote
- כּוֹתֵב (kotev): writes or writer
- כְּתִיבָה (ktiva): the act of writing
- מִכְתָּב (mikhtav): letter (correspondence)
- כַּתָּב (katav): reporter
- כְּתוֹבֶת (ktovet): address
- הַכְתָּבָה (hakhtava): dictation

Eight words from three letters. That is what makes Hebrew word games intellectually thrilling. Spotting כ, ת, and ב scattered across a grid does not just mean "three letters." Your brain lights up: those three letters form a root. You know immediately that a family of words is hiding there, waiting to be formed by combining with the right surrounding letters.

I once found seven different words from a single three-letter root in one round. My Israeli friend nodded and said, "Now you're thinking in Hebrew." Best compliment I've received.

The research backs this. Shimron's work on Hebrew reading psychology (2006) shows native speakers automatically activate all morphologically related forms when they encounter a root — their brains don't just retrieve individual words, they activate whole families. Learning that system is why root-based study beats traditional vocabulary drilling for Hebrew learners.`,
      },
      {
        title: 'No vowels written, but your brain supplies them',
        content: `Written Hebrew omits vowels. Native speakers simply know them. It's like reading "Cn y rd ths?" — except Hebrew speakers do it effortlessly because the language was designed this way.

In formal texts, tiny dots and dashes (nikkud) mark vowels. In everyday Hebrew — newspapers, text messages, word games — the nikkud is absent. You're reading consonant skeletons, and your brain fills in the vowels.

For word games, the same consonant sequence can represent multiple words depending on vowel patterns. ד-ב-ר could be davar (thing), diber (spoke), dever (plague), or dvar (word of). Context usually disambiguates, but in a word game grid, context does not exist. Players must know all possible readings.

The information density is higher. Each letter carries semantic weight both as consonant and as an implied vowel pattern. Hebrew Scrabble players describe this as "reading between the letters." You are not just seeing what is there; you are seeing what could be there based on valid vowel patterns.

When I first started playing, I was terrible at this. I would see three consonants and freeze. My Israeli friends would see the same three letters and instantly think of four different words. The gap between beginner and native speaker is enormous, and it comes entirely from vowel intuition: automatic knowledge of which vowel patterns are valid in Hebrew. Rivka Ravid's research on Hebrew morphological spelling (2012) confirms this. Readers who internalize vowel patterns perform exponentially better at word recognition speed, reading fluency, and game performance.`,
      },
      {
        title: 'RTL design and why everything flips',
        content: `Hebrew reads right-to-left. This single fact creates design challenges that are genuinely fascinating.

Research from the University of Haifa (2018) shows Hebrew speakers have rightward spatial attention bias. English speakers show leftward bias instead. Hebrew players literally scan grids from the right side first, finding different words in different order.

For game designers, everything requires mirroring: arrows flip, shadows cast in opposite directions (LexiClash flips shadows from 4px to -4px), progress bars fill backward, animations slide in from the right. Text input requires special care. New letters appear left of the growing word, pushing rightward.

The hardest part is bidirectional text. Hebrew passages that include English words, numbers, or abbreviations switch direction mid-line. This is not just cosmetic. In a game UI with animations and custom layouts, BiDi text requires careful manual testing. I have seen games clearly tested only in English. The Hebrew feels like wearing a shirt inside out.

The best Hebrew word games do not just work in RTL. They think in RTL. The UI feels native from the first moment. That is the differentiator.`,
      },
      {
        title: 'Word game culture and modern Hebrew slang',
        content: `Israel has a word game culture as rich as any country. Scrabble (שבץ נא, "Shvatz Na") has a dedicated following. Hebrew crosswords (tashbetzim) are a Friday ritual. Friday newspapers produce celebrities like crossword designer Dan Orion.

The root system makes wordplay inevitable. When words share consonant patterns, double meanings abound. Israeli humor relies heavily on this. You see it in shop names and street art throughout Tel Aviv.

Modern Hebrew constantly generates new words through its root system. The revival and modernization of Hebrew in the late 19th/20th centuries (Ben-Yehuda, Academy of the Hebrew Language) established the principle: new concepts fit into ancient root patterns. "Computer" (מחשב, makhshev) comes from the root ח-ש-ב (to think/calculate). "Electricity" (חשמל, khashmal) was pulled from an obscure biblical word in Ezekiel referring to a mysterious gleaming substance.

This means Hebrew has layers. Ancient words coexist with modern coinages constructed by the same morphological rules. A single game might include a word from the Torah sitting next to a word coined in 2015 for a smartphone concept that did not exist before. Players are essentially playing with linguistic archaeology.

Modern Hebrew slang is its own fascination. Words borrowed from Arabic (יאללה, yalla; אחלה, akhla), English (קול, cool), Russian (especially from 1990s immigration), and homegrown creations that playfully twist the root system. "Fraier" (sucker, from Yiddish) is culturally loaded. "Don't be a fraier" is practically a national motto. Social media accelerated Hebrew word creation. Words like לייקק (laikek, "to like"), תיירג (tairag, "to tag"), and שיירר (shairar, "to share") follow proper Hebrew morphological rules, fitting English concepts into Hebrew grammar.

A competitive Israeli Scrabble player once told me: "In English, you memorize words. In Hebrew, you understand structures. Once you know the patterns, new words are not surprises. They are predictions." That insight captures something essential about the Hebrew word game experience that you simply cannot get from studying grammar books alone.`,
      },
      {
        title: 'Why you should play Hebrew word games (even if you are terrible)',
        content: `Hebrew word games are harder than English ones. The learning curve is steeper, the cognitive demands higher, and native speakers have an enormous advantage from reading vowel-less consonants since childhood.

But they are richer. More layered. More rewarding when things click.

Finding a word in Hebrew feels like excavating something. You are uncovering a root that might be thousands of years old, recognizing a morphological pattern, reconstructing a word that existed in some form in biblical times and still works today in modern Hebrew. That is genuinely different from finding WORD in a grid.

If you have never played word games in Hebrew, start. You will be terrible. Everyone is at first. But somewhere between your first three-letter word and your first root-based revelation, you will understand what I mean. Hebrew word games are not just games. They offer a different way of seeing language itself, one that connects you to speakers across three thousand years of linguistic tradition.

And if you are a native Hebrew speaker who has been nodding along this whole article thinking "yeah, obviously," thank you for your patience. Now teach me the root for "gratitude." I know it starts with ת, and I will probably never get it right.`,
      },
      {
        content: `Sources:
- Shimron, J. (2006). "Reading Hebrew: The Language and the Psychology of Reading It." Lawrence Erlbaum Associates.
- Ravid, D. (2012). "Spelling Morphology: The Psycholinguistics of Hebrew Spelling." Springer.
- University of Haifa (2018). Spatial attention bias in right-to-left vs left-to-right readers. Cognitive Psychology Research Lab.
- Ben-Yehuda Project: Comprehensive online Hebrew dictionary and historical corpus.
- Academy of the Hebrew Language: Official Hebrew word adoption and standardization body.`,
      },
    ],
    backToBlog: 'Back to Blog',
    tryDaily: 'Daily Challenge',
    practice: 'Practice',
  },
  he: {
    title: 'לשחק משחקי מילים בעברית: הכאוס היפה של ימין-לשמאל',
    subtitle: 'שורשים, ניקוד חסר, ולמה לעצב משחק מילים לעברית זה כמו לפתור חידה בתוך חידה.',
    category: 'שפה',
    readTime: 'זמן קריאה: 8 דקות',
    authorName: 'אוהד פישר',
    authorBio: 'אובססיבי רב-לשוני של משחקי מילים שבילה שישה חודשים בלימוד שורשים עבריים רק כדי להיות פחות גרוע בערבי סקרבל ישראליים.',
    sections: [
      {
        content: `משחקי מילים בעברית שונים במהותם מאנגלית. לא קשים יותר, לא קלים יותר — שונים. שונים ברמת DNA.

באנגלית, סורקים לוח של אותיות והמוח מחפש דפוסים מוכרים: C-A-T, T-H-E. זה דפוס שהמוח ראה מיליון פעמים. זה קטגוריה, סדר, משהו מוכר.

בעברית, המוח צריך לעשות משהו הרבה יותר מתוחכם. הוא צריך לשחזר מילים משלדי עיצורים — רק העצם, לא הבשר. הוא צריך להכניס מנטלית תנועות שלא כתובות בעמוד. הוא צריך לנווט כיוון קריאה ימין-לשמאל שמהפך את העיבוד המרחבי שלך כליל. ובשלב זה הוא צריך להזהות ששלוש אותיות אקראיות יכולות לחלוק שורש שמחבר אותן לעשרות מילים שונות לחלוטין. העומס הקוגניטיבי בסדר גודל שונה — גבוה יותר, מורכב יותר, עמוק יותר.

התאהבתי במשחקי מילים בעברית לפני בערך שנתיים. ערב סקרבל בתל אביב, 200 מילים בעברית בכל הספר שלי, הפסדתי בדרך מרהיבה. ארבע שעות של ריסוק. אבל בדרך החוצה הבנתי משהו שאף ספר לימוד לא הצליח להעביר: איך מערכת השורשים בעברית עובדת ממש, איך שלוש אותיות יכולות להיות מפתח לעשרות מילים, איך שפה שתקיימת אלפיים שנה ממרקרו נתפסת עדיין בחלק העמוק של המוח של הנוער הישראלי.`,
      },
      {
        title: 'שורשים: שלוש אותיות שפותחות דלתות רבות',
        content: `ההבדל הגדול בין עברית לאנגלית: השורש.

באנגלית, CAT ו-CATALOG לא קשורות זו לזו אלא בהקרנה ובמקרה. בעברית, כל מילה כמעט בשפה מגיעה משורש תלת-אותי שנושא משמעות ליבה. אתה לא זוכר את המילה. אתה מבין את המערכת.

קחו כ-ת-ב, השורש של כתיבה: כָּתַב (הוא כתב), כּוֹתֵב (כותב), כְּתִיבָה (כתיבה, הפעולה), מִכְתָּב (מכתב, המשהו שנכתב), כַּתָּב (כתב, מישהו שכותב), כְּתוֹבֶת (כתובת), הַכְתָּבָה (הכתבה, שיעורים), תַּכְתִּיב (תיעוד). שמונה מילים שונות לחלוטין. שלוש אותיות בודדות.

Shimron (2006) מצא שדוברי עברית ילידים מפעילים באופן אוטומטי את כל הצורות המורפולוגיות הקשורות כשהם נתקלים בשורש. המוח לא מחפש מילה אחת — הוא מפעיל משפחה שלמה של צורות, הברות, קשרים. זה למה לימוד שורשים מכה ממש על חזרה מילה-מילה. אתה לא שוכר חמש מילים, אתה שולט בשיטה שיוצרת חמישים.

כששחקנים רואים כ, ת, ב על לוח בסדר כלשהו, המוח דולק. זה שורש. יודעים מיד שיש משפחה של מילים מתחבאת בתוך הרשת. השאלה היא איזו מילה בדיוק אפשר ליצור עם שאר האותיות, איזה דפוס משקלים משתלב.

פעם מצאתי שבע מילים שונות משורש אחד בסיבוב אחד. החברה הישראלית שלי הנהנה — לא בהנצחה, אלא בהכרה של משהו. אמרה: "עכשיו את חושבת בעברית." זו אחת המחמאות הכי טובות שקיבלתי.`,
      },
      {
        title: 'ללא תנועות, ללא בעיה (יותר או פחות)',
        content: `עברית כתובה בדרך כלל בלי תנועות. כשקוראים עיתון, הודעות ב-WhatsApp, או משחקי מילים — אין ניקוד. רק עיצורים קשים. דוברי עברית ילידים פשוט... יודעים את התנועות. הן בתוך הנוירונים שלהם.

עבור שחקנים חדשים, זה מלחמה. אותו רצף עיצורים יכול להיות מילים שונות לחלוטין: ד-ב-ר יכול להיות דָּבָר (דבר, משהו), דִּבֵּר (דיבר, כמו הפועל), דֶּבֶר (דבר, כמו המגיפה), או דְּבַר (דבר, כמו נטיה או ניסוח). ללא קשר בלוח משחק. שחקנים צריכים להכיר את כל הקריאות האפשריות.

צפיפות המידע גבוהה יותר. כל אות עברית נושאת משקל סמנטי גדול יותר מאחרונה באנגלית. היא עיצור, ובו-זמנית היא מרומזת של דפוס תנועות אפשרי — מוקד של אפשרויות.

Ravid (2012) אישר בשנות התיעוד שלה על קריאה עברית: קוראים שאנטגרו תבניות תנועות מסודרות מבצעים טוב יותר בהכרת מילים, בקלילות קריאה, וביצוע משחקים. שחקני סקרבל עבריים מתארים את החוויה כ"קריאה בין האותיות." אתה לא רק רואה מה יש שם על העמוד — אתה רואה מה יכול להיות שם, אילו צורות אפשריות גלומות.`,
      },
      {
        title: 'RTL: כשכל מה שידעתם על עיצוב התהפך',
        content: `עברית קוראים ימין לשמאל. זה אני לא מומציא. מחקר אוניברסיטת חיפה (2018) מצא שדוברי עברית מציגים הטיית קשב מרחבית ימינה — תשומת לב ראשונה הולכת לצד הימני של העמוד. דוברי אנגלית מציגים הטיה שמאלה. כתוצאה, שחקנים עבריים סורקים לוחות אחרת מהתחלה. הם מתחילים מימין.

לעיצוב משחקים, זה משמעות: כל אלמנט צריך היפוך. חצים ניווט הולכים הפוך. סרגלי התקדמות מתמלאים מימין לשמאל. צללים (LexiClash משנה את העומק מ-4px → -4px). קלט מילים צריך טיפול מיוחד — כל אות חדשה מופיעה משמאל, דוחפת את המילה ימינה. אנימציות צריכות לכבד את הכיוון.

החלק הקשה ביותר: טקסט דו-כיווני. כשעברית כוללת מילים אנגליות, מספרים, קיצורים, או URLs, כיוון המוטות משתנה באמצע השורה. זה לא קוסמטי. בUI מורכב עם אנימציות וטיפול מיקום עדין, זה דורש בדיקה ידנית בעקביות אמיתית על התקן.

ראיתי משחקים שברור הם נבדקו רק באנגלית. העברית מרגישה כמו לבוש חולצה הפוך — טכנית זה עובד, אבל השגיאה פשוטה לגמרי ברורה לכל דובר עברי.`,
      },
      {
        title: 'תרבות עברית וסלנג מודרני',
        content: `לישראל יש תרבות משחקי מילים עשירה ועדינה בכל הדורות. סקרבל עברי (שבץ נא — קיצור של "שבץ נא" בחרוזים) יש מעקבים ציבוריים ותחרויות. תשבצים בעברית, תשבצים עם מידות אותיות — טקס שישי של כל עיתון בישראל. דן אוריון, מעצב תשבצים בעברית, הוא דמות תרבותית בעצמה, זה שהופיע בטלוויזיה.

השורשים הופכים משחקי מילים בלתי נמנעים. מילים חולקות דפוסי עיצור בתדירות גבוהה. כפל משמעויות, משחקי שמות, מטפורות — בכל מקום. ההומור הישראלי תלוי בהרבה בזה. תראה את זה ברחובות, בשמות חנויות, בשמות סרטים, בדיונים בטוויטר בן-אדם לדקה.

עברית מודרנית יוצרת מילים בכוונה — לא בהשראה, אלא בתכנון. בן-יהודה וההאקדמיה ללשון העברית קבעו עיקרון בן מאה שנה: מושגים חדשים לא יוסרו מ-English. הם יתאימו לתוך דפוסי שורש קדומים. "מחשב" (makhshev) — ח-ש-ב שורש של לחשוב, לחשב. "חשמל" (khashmal) — נתון מעברית קדומה בספר יחזקאל, מקום אחד בלבד, תיאור חומר נוצץ בלי שימוש מודרני עד שהאקדמיה הציצה לשם.

שחקנים נתקלים בשכבות היסטוריות עמוקות. מילה מן התורה על אותו לוח משחק כמו מטבע מ-2015 עבור פיצ'ר בסמארטפון. צבא תורם מאוד לסלנג — מילים כמו "גרבי" (רע), "משופשף" (מנוסה, בזול), "סמנכ"ל" (סגן מנהל כללי) נולדו בתרבות צבאית תוך שלוש שנים והגרו לשימוש כללי.`,
      },
      {
        title: 'טיפים ללומדי עברית',
        content: `אם לומדים עברית כשפה שנייה, משחקי מילים אינם קריאה שפירסום — הם כלי הכשרה עדין וממוקד. הנה מה שעובד בפועל:

למדו שורשים קודם כל, לא מילים בודדות. זו ההחלטה הכי גדולה שאפשר לקבל. כשנתקלים במילה חדשה, עצרו. מצאו את השורש תלת-אותי שלה. אחר כך חפשו חמש מילים אחרות מאותו שורש. פתאום למדתם משפחה שלמה של קשרים, לא טאיל בודד על הצד.

התחילו עם שורשים בתדירות גבוהה. בערך חמישה מאות שורשים מכסים את רוב עברית יומיומית — כ-ת-ב, ל-מ-ד, ד-ב-ר, ש-מ-ע, ר-א-ה. הם בכל מקום בכל משחק, בכל דיוג.

כשמשחק תומך בניקוד (תנועות מסומנות בדיוק), השתמשו בהם בהתחלה. זה מוריד עומס קוגניטיבי משמעותי. אתה יכול להתמקד בשורשים עצמם. כשמשתפרים, כבו את הניקוד. עצרו לקרוא רק עם עיצורים. זו הנקודה שבה זה הופך לקשה — וקשה הוא שבו זה מועיל.

שימו לב למשקלים (תבניות מורפולוגיות). ת___ה בהתחלה סיימה יוצרת שמות פעולה: תהליכה, תנועה, תרגילה. ה____ה יוצרת שמות סוגה: התנצלות, התקפה. דפוסים כאלה עוזרים לחזות מילים תקפות ללא זכרון טהור. זה כמו ללמוד תחביר נוסחה.

אל תפחדו מסלנג מודרני. "סבבה," "יאללה," "חפיף" — כולן מילים עבריות אמיתיות עם שורשים אמיתיים. צבא, טכנולוגיה, מדיה חברתית — הם יצרו שכבות שלמות של עברית חדשה שהשפה תלויה בה כעת.

משחקי מילים מכריחים קריאה מהירה בגלל הזמן המוגבל. אתה לא יכול להושקע שלושים שניות בכל מילה עם טיימר דוקק מעליך. הלחץ הזה הוא בסך הכל יתרון מובנה — הוא מאמן זיהוי אוטומטי. אתה חוזר שוב ושוב להתבוניים בדפוסים. הם נתפסים בהדרגה בתוך הנוירונים.

בשלב כלשהו אתה תפסיד הרבה מאוד. חודשים, אולי. אם אתה לומד בצורה רצינית, תפסיד מול דוברים ילידים שחקו כל חייהם בלי לשפר. זה בסדר לחלוטין. זה צפוי. כל משחק מלמד משהו חדש. למידה מצטברת. היא איטית מטבעה. אבל היא עובדת.`,
      },
      {
        title: 'למה אני חוזרת למשחקי מילים בעברית',
        content: `למדתי עברית בהתחלה בגלל חברה. המשכתי בגלל משחקי מילים. שורשים שינו איך אני חושבת על שפות בכלל — איך הן בנויות, איך זיכרון עובד בתוך שפה. קריאה ללא ניקוד אימנה זיהוי דפוסים בקצב שלא הרגשתי קודם. RTL חשפה הטיות מרחביות שלא הכרתי שיש.

משחקי מילים בעברית קשים ממש. עקומת לימוד תלולה. דרישות קוגניטיביות גבוהות. נטיב הדוברים הילידים גדול. אבל עשירים יותר בהרבה. למצוא מילה בעברית מרגיש כמו חפירה ארכיאולוגית — אתה לא פשוט מוצא טאיל מודרני, אתה מוצא שורש משלוש אלפים שנה שעדיין עובד, שעדיין משאיר משקל עמוק, שעדיין מכיל משהו.

זה זה הדבר הכי טוב בעברית כשפת משחק. בכל סיבוב אתה משחק לא רק כדי לנצח אבל כדי להבין שכבה נוספת של שפה שהתחזקה כל כך במשך דורות רבים. כל מילה היא קשר קטן לדברים שדברים היהודיים אמרו בדרך החזרה למקום הרחוק של זכרון.

ואם דוברי עברית ילידים הנהנתם לאורך הטקסט הזה וחשבתם "כן, ברור, זה טרוויאלי" — תודה על ההסבלנות המדהימה שלכם. עכשיו בואו תלמדו אותי את השורש של "הכרת תודה." אני יודעת שהוא מתחיל בנו"ן, ייתכן שיש שם ו' או י' או אולי שם שניים מהם. "נ-ד-ה"? "ש-כ-ר"? אני לא בטוחה בכלל. עזרו לי.`,
      },
      {
        content: `מקורות:
- Shimron, J. (2006). "Reading Hebrew: The Language and the Psychology of Reading It." Lawrence Erlbaum Associates.
- Ravid, D. (2012). "Spelling Morphology: The Psycholinguistics of Hebrew Spelling." Springer.
- אוניברסיטת חיפה (2018). Spatial attention bias in right-to-left vs left-to-right readers. Cognitive Psychology Research Lab.
- בן-יהודה, א. פרויקט בן-יהודה — מילון עברי מקוון מקיף וקורפוס היסטורי.
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
