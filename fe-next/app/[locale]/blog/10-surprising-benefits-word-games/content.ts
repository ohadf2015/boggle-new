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
  playDaily: string;
  startPracticing: string;
};

export const contentByLocale: Record<string, LocaleContent> = {
  en: {
    title: 'I Played Word Games Every Day for a Year. The Science Says My Brain Should Be Different Now.',
    subtitle: 'Spoiler: some of it actually did.',
    category: 'Research',
    readTime: '9 min read',
    authorName: 'Ohad Fisher',
    authorBio: 'Obsessive word game player, amateur neuroscience reader, and the person who ruins game night by taking too long on their turn.',
    sections: [
      {
        content: `I'll tell you about the dumbest experiment I've ever run on myself.

Last January, I decided to play at least one word game every single day for a full year. Not because I wanted to "optimize my brain" or whatever LinkedIn gurus are selling these days. I just... really like finding words in jumbled letters. Always have. But somewhere around month three, I started reading the research. And honestly? Some of it blew my mind. Some of it made me roll my eyes. What follows is what's real and what's marketing.`,
      },
      {
        title: 'The study that made me take this seriously',
        content: `In 2019, researchers from the University of Exeter and King's College London published a study in the International Journal of Geriatric Psychiatry that tracked 19,000 adults aged 50 to 93. Not a typo. Nineteen thousand people.

The people who regularly solved word puzzles showed reasoning abilities equivalent to someone ten years younger. And short-term memory of someone eight years younger. Not "marginally better." Not "statistically significant but practically meaningless." A full decade of cognitive difference.

Professor Keith Wesnes summed it up: "Performance was consistently better in those who reported engaging in puzzles, and generally improved incrementally with the frequency of puzzle use."

In plain English: the more you play, the sharper you stay. And the effect isn't small.

Now, before you get too excited, this was an observational study. They didn't lock people in a room and force them to do crosswords. Which brings us to the part most word game articles conveniently skip over.`,
      },
      {
        title: 'The dementia question',
        content: `Every single article about word games eventually makes this claim: "Word games can help prevent dementia!" Usually with an exclamation mark and a stock photo of a smiling elderly person.

The truth: Dr. Anne Corbett, one of the lead researchers from Exeter, specifically said: "We can't say that playing these puzzles necessarily reduces the risk of dementia in later life."

And she's right to be cautious. The studies show correlation. People who do puzzles tend to have better cognitive function. But that doesn't prove the puzzles caused it. Maybe people with naturally sharper minds are just more drawn to word games in the first place. Maybe it's the kind of person who does puzzles daily, not the puzzles themselves.

I know. Disappointing. I was disappointed too. But I'd rather tell you the truth than sell you a comforting lie that some blog cooked up for clicks.

What is clear, and this part is solid, is that word games are linked to better cognitive function right now. In the present. Today. Not in some hypothetical future. That's worth something on its own.`,
      },
      {
        title: 'Crosswords vs. brain training apps',
        content: `This study from Columbia and Duke universities made me put my phone down and stare at the wall for a minute.

They took 107 older adults with mild cognitive impairment and split them into two groups. Half got computerized crosswords. The other half got those slick digital "brain training" games, the kind advertised on podcasts with phrases like "train your brain in just 10 minutes a day!"

After 78 weeks, a year and a half, the crossword group showed cognitive improvement. The brain games group showed decline.

Read that again. The brain games group got worse.

Dr. D.P. Devanand from Columbia noted the benefits showed up "not only in cognition but also in daily activities, with indications of brain shrinkage on MRI that suggests the effects are clinically meaningful."

First study to document long-term benefits of home-based crossword training. I felt stupidly vindicated for every time someone told me I was "wasting time" playing word games instead of using Lumosity.`,
      },
      {
        title: 'Who benefits most',
        content: `The Columbia-Duke study gets more interesting. At a very early stage of cognitive impairment, both crosswords and brain games help about equally. But at later stages, crosswords pull ahead. Significantly.

A separate 2024 study from Texas A&M backed this up, finding that games, puzzles, and reading slow cognitive decline even in people who already have mild impairment. Not prevent. Slow. But slowing down cognitive decline is still a big deal.

A personal observation: I'm not 50. Nowhere near it. But the pattern-recognition improvements I noticed after months of daily play were dramatic enough that I'm convinced this isn't just an "older adults" thing. Your brain is plastic at any age. The question is whether you're giving it something interesting to chew on.`,
      },
      {
        title: 'The vocabulary trick',
        content: `This might be my favorite piece of research.

A systematic review of 17 studies on learning words through games found something beautifully counterintuitive: your brain remembers words better when it discovers them during problem-solving than when you read them off a list.

When was the last time you remembered a word from a vocabulary flashcard? Really think about it. Now think about the last weird word you stumbled into during a game. "QANAT." "ETUI." "ZAX." Those stick because your brain encountered them in context. During a challenge, while problem-solving, when emotions were engaged.

Games provide what researchers clinically call "rich contexts, cognitive engagement, and virtual learning situations." Fancy way of saying: your brain pays more attention when it's having fun.

I've personally learned more obscure English words from Scrabble and word games than from four years of formal education. Not a brag. An indictment of how I studied.`,
      },
      {
        title: 'What I actually noticed after a year',
        content: `I'm not going to pretend I ran a controlled experiment on myself. No fMRI scans, no reaction time measurements. But what I honestly noticed after 365 days of daily word games:

The speed thing was dramatic. By month three, letter patterns started jumping out at me. I'd glance at a scrambled set of letters and words would just... appear. The research calls this "chunking." Your brain stops processing individual letters and starts seeing groups. "TH" becomes a unit. "ING" becomes a unit. You stop reading a grid of 16 letters and start reading 5-6 building blocks. Hard to describe, but once it clicks, you can't un-see it.

My vocabulary grew in weird ways. I now know words I couldn't define but instantly recognize as "real." Turns out competitive Scrabble players have the same experience. Only 6.4% say they "always" learn word meanings. They just know the words exist.

The one that surprised me most: the daily game became a form of meditation. Five minutes of absolute focus. No notifications, no scrolling, no multitasking. Just me and letters. In a world that's constantly screaming for your attention, that five minutes of flow state is worth more than any brain-health benefit.`,
      },
      {
        title: 'The honest downsides',
        content: `Since we're being real with each other:

Word games won't replace exercise. Your brain needs blood flow, and no amount of crosswords replaces a walk. They won't substitute for social connection. Your brain needs other humans, not just consonants and vowels. And they won't fix bad sleep.

Also, if word games stress you out, you might be doing it wrong. The fight-or-flight response shuts down your prefrontal cortex, which is the exact part of your brain you're trying to exercise. If the daily challenge ranking is raising your blood pressure, try free play mode. Seriously.

One more thing: there's a real risk of getting obsessive about it. Ask my partner. Some nights I stayed up way too late chasing a high score when I should have been sleeping, which, ironically, probably undid whatever cognitive benefits I earned that day.`,
      },
      {
        title: 'So is it worth playing every day?',
        content: `Yeah. I think so. But maybe not for the reasons you'd expect.

The neuroscience is real. The Exeter study with 19,000 people. The Columbia-Duke trial showing crosswords beating brain games over 78 weeks. The vocabulary research across 17 studies. The evidence points in one clear direction.

But the best reason to play word games daily isn't the science. It's five minutes of doing something slightly challenging that happens to be fun. Not everything needs a neuroscience justification.

Play because it's enjoyable. The brain benefits are a bonus.

Now if you'll excuse me, I have a daily challenge to finish. I'm currently on a 47-day streak and my partner has already threatened to hide my phone if I don't come to dinner.`,
      },
      {
        content: `Research cited: International Journal of Geriatric Psychiatry (2019) — University of Exeter PROTECT Study, 19,000 participants. NEJM Evidence (2022) — Columbia & Duke University, 107 participants over 78 weeks. Systematic review of 17 studies on game-based vocabulary acquisition. Texas A&M University (2024) — cognitive decline and leisure activities.`,
      },
    ],
    backToBlog: 'Back to Blog',
    playDaily: 'Daily Challenge',
    startPracticing: 'Practice',
  },
  he: {
    title: 'שיחקתי משחקי מילים כל יום במשך שנה. הנה מה שהמדע אומר שהיה צריך לקרות.',
    subtitle: 'ספוילר: חלק מזה באמת קרה.',
    category: 'מחקר',
    readTime: 'זמן קריאה: 9 דקות',
    authorName: 'חנון המילים',
    authorBio: 'שחקן משחקי מילים אובססיבי, קורא חובבני של מחקרי מוח, והאדם שהורס ערב משחקים כי לוקח לו יותר מדי זמן בתור.',
    sections: [
      {
        content: `בואו אספר לכם על הניסוי הכי מטופש שעשיתי על עצמי.

בינואר שעבר החלטתי לשחק לפחות משחק מילים אחד כל יום, במשך שנה שלמה. לא בגלל שרציתי "לאמן את המוח" או מה שגורואים של לינקדאין מוכרים בימים האלה. פשוט... אני ממש אוהב למצוא מילים באותיות מעורבבות. תמיד אהבתי. אבל אז, איפשהו סביב חודש שלוש, התחלתי לקרוא את המחקרים. ובכנות? חלק מהם פוצצו לי את הראש. חלק גרמו לי לגלגל עיניים. בואו נעבור על מה שאמיתי ומה שזה שיווק.`,
      },
      {
        title: 'המחקר שגרם לי לקחת את זה ברצינות',
        content: `ב-2019, חוקרים מאוניברסיטת אקסטר וקינגס קולג׳ לונדון פרסמו מחקר ב-International Journal of Geriatric Psychiatry שעקב אחרי — תחזיקו חזק — 19,000 מבוגרים בגילאי 50 עד 93. זו לא שגיאת כתיב. תשע עשרה אלף בני אדם.

מי שפתר חידות מילים באופן קבוע הראה יכולת חשיבה לוגית של מישהו עשר שנים צעיר ממנו. וזיכרון לטווח קצר של מישהו שמונה שנים צעיר. לא "קצת יותר טוב". לא "מובהק סטטיסטית אבל חסר משמעות מעשית". עשור שלם של הבדל קוגניטיבי.

פרופ׳ קית׳ וסנס סיכם את זה: "הביצועים היו טובים יותר באופן עקבי אצל מי שדיווח על פתרון חידות, והשתפרו בהדרגה עם תדירות השימוש."

בעברית פשוטה: ככל שאתה משחק יותר, אתה נשאר חד יותר. וההשפעה לא קטנה.

עכשיו — לפני שאתם מתרגשים יותר מדי — זה היה מחקר תצפיתי. הם לא נעלו אנשים בחדר ואילצו אותם לפתור תשבצים. מה שמביא אותנו לחלק שרוב המאמרים על משחקי מילים בנוחות מדלגים עליו.`,
      },
      {
        title: 'שאלת הדמנציה (בואו נהיה כנים)',
        content: `כל מאמר על משחקי מילים מגיע בסוף לטענה הזו: "משחקי מילים יכולים למנוע דמנציה!" בדרך כלל עם סימן קריאה ותמונת סטוק של קשיש מחייך.

הנה האמת. ד״ר אן קורבט, אחת החוקרות המובילות מאקסטר, אמרה במפורש: "אנחנו לא יכולים לומר שפתרון חידות בהכרח מפחית את הסיכון לדמנציה בגיל מאוחר."

והיא צודקת שהיא נזהרת. המחקרים מראים קורלציה — אנשים שפותרים חידות נוטים להראות תפקוד קוגניטיבי טוב יותר. אבל זה לא מוכיח שהחידות גרמו לזה. אולי אנשים עם מוח חד מטבעו פשוט נמשכים יותר למשחקי מילים מלכתחילה. אולי זה הסוג של אדם שפותר חידות, לא החידות עצמן.

אני יודע. מאכזב. גם אני התאכזבתי. אבל אני מעדיף לספר לכם את האמת מאשר למכור לכם שקר נעים שאיזה בלוג בישל בשביל קליקים.

מה שכן ברור — והחלק הזה מוצק — משחקי מילים קשורים לתפקוד קוגניטיבי טוב יותר עכשיו. בהווה. היום. לא באיזה עתיד היפותטי. וזה שווה משהו בפני עצמו.`,
      },
      {
        title: 'תשבצים נגד אפליקציות אימון מוח (זה באמת הפתיע אותי)',
        content: `אוקיי, המחקר הזה מקולומביה ודיוק גרם לי להניח את הטלפון ולהסתכל על הקיר לדקה.

הם לקחו 107 מבוגרים עם ליקוי קוגניטיבי קל וחילקו אותם לשתי קבוצות. חצי קיבלו תשבצים ממוחשבים. החצי השני קיבל את אותם משחקי "אימון מוח" דיגיטליים מבריקים — אתם יודעים, אלה עם הפרסומות שאומרות "אמן את המוח שלך ב-10 דקות ביום!"

אחרי 78 שבועות — שנה וחצי של מעקב — קבוצת התשבצים הראתה שיפור קוגניטיבי. קבוצת משחקי המוח הראתה ירידה.

קראו את זה שוב. הקבוצה של משחקי המוח נהייתה פחות טובה.

ד״ר דבננד מקולומביה ציין שהיתרונות הופיעו "לא רק בקוגניציה אלא גם בפעילויות יומיומיות, עם סימנים להתכווצות מוחית מופחתת ב-MRI שמרמזים שההשפעות משמעותיות קלינית."

זה היה המחקר הראשון שתיעד יתרונות ארוכי טווח לאימון תשבצים ביתי. ובכנות? הרגשתי מוצדק באופן מטופש על כל פעם שמישהו אמר לי שאני "מבזבז זמן" על משחקי מילים במקום להשתמש ב-Lumosity.`,
      },
      {
        title: 'למי זה הכי עוזר? (לא למי שחשבתם)',
        content: `פה המחקר של קולומביה-דיוק נהיה אפילו יותר מעניין. אם אתם בשלב מאוד מוקדם של ליקוי קוגניטיבי, גם תשבצים וגם משחקי מוח עוזרים בערך באותה מידה. אבל בשלבים מאוחרים יותר, התשבצים עוקפים — משמעותית.

מחקר נפרד מ-2024 מטקסס A&M גיבה את זה, וגילה שמשחקים, חידות וקריאה מאטים ירידה קוגניטיבית גם אצל אנשים שכבר יש להם ליקוי קל. לא מונעים. מאטים. אבל האטה של ירידה קוגניטיבית זה עדיין עניין גדול.

ותצפית אישית: אני לא בן 50. אני רחוק מזה. אבל שיפורי זיהוי הדפוסים שהרגשתי אחרי חודשים של משחק יומי היו דרמטיים מספיק שאני משוכנע שזה לא רק "עניין של מבוגרים". המוח פלסטי בכל גיל — השאלה היא אם אתה נותן לו משהו מעניין ללעוס.`,
      },
      {
        title: 'הטריק של אוצר המילים שאף אחד לא מדבר עליו',
        content: `זה אולי המחקר האהוב עליי.

סקירה שיטתית של 17 מחקרים על למידת מילים דרך משחקים מצאה משהו נהדר ולא אינטואיטיבי: המוח זוכר מילים טוב יותר כשהוא מגלה אותן תוך כדי פתרון בעיות מאשר כשהוא קורא אותן מרשימה.

מתי בפעם האחרונה זכרתם מילה מכרטיס אוצר מילים? באמת תחשבו על זה. עכשיו תחשבו על המילה האחרונה המשונה שנתקלתם בה במשחק. "QANAT." "ETUI." "ZAX." אלה נדבקות כי המוח נתקל בהן בהקשר — במהלך אתגר, תוך כדי פתרון בעיות, כשרגשות היו מעורבים.

משחקים מספקים מה שחוקרים קוראים בשפה קלינית "הקשרים עשירים, מעורבות קוגניטיבית, וסיטואציות למידה וירטואליות." שזה פשוט דרך מפוצצת לומר: המוח מקשיב יותר כשכיף לו.

אני אישית למדתי יותר מילים אובסקוריות באנגלית מסקראבל ומשחקי מילים מאשר מארבע שנות לימודים פורמליים. זה לא שוויץ — זו הרשעה של איך שלמדתי.`,
      },
      {
        title: 'מה באמת שמתי לב אליו אחרי שנה',
        content: `תשמעו, אני לא מתיימר שרצתי ניסוי מבוקר על עצמי. לא עשיתי fMRI ולא מדדתי זמני תגובה. אבל הנה מה שבאמת שמתי לב אליו אחרי 365 ימים של משחקי מילים:

עניין המהירות היה דרמטי. בחודש שלוש, דפוסי אותיות התחילו לקפוץ לי. הסתכלתי על סט אותיות מעורבבות ומילים פשוט... הופיעו. המחקר קורא לזה "chunking" — המוח מפסיק לעבד אותיות בודדות ומתחיל לראות קבוצות. "ת-ה" הופך ליחידה. "ים" הופך ליחידה. מפסיקים לקרוא רשת של 16 אותיות ומתחילים לקרוא 5-6 אבני בניין. קשה לתאר, אבל ברגע שזה נכנס, אי אפשר לא לראות את זה.

אוצר המילים שלי גדל בדרכים מוזרות. עכשיו אני מכיר מילים שאני לא יכול להגדיר אבל מיד מזהה כ"אמיתיות". מסתבר ששחקני סקראבל תחרותיים חווים את אותו דבר — רק 6.4% מהם אומרים שהם "תמיד" לומדים משמעויות מילים. הם פשוט יודעים שהמילים קיימות.

ומה שהפתיע אותי הכי הרבה: המשחק היומי הפך לסוג של מדיטציה. חמש דקות של ריכוז מוחלט. בלי נוטיפיקציות, בלי סקרולינג, בלי מולטיטאסקינג — רק אני ואותיות. בעולם שכל הזמן צועק לתשומת הלב שלך, חמש הדקות האלה של flow state שוות יותר מכל תועלת בריאותית למוח.`,
      },
      {
        title: 'החסרונות הכנים (כי אף אחד לא מזכיר אותם)',
        content: `כבר שאנחנו כנים אחד עם השני:

משחקי מילים לא מחליפים פעילות גופנית. המוח צריך זרימת דם, ושום כמות של תשבצים לא מחליפה הליכה. הם לא מחליפים קשר חברתי — המוח צריך בני אדם אחרים, לא רק עיצורים ותנועות. והם בהחלט לא יתקנו שינה גרועה.

וגם — ואני חושב שזה חשוב — אם משחקי מילים מלחיצים אתכם, יכול להיות שאתם עושים את זה לא נכון. אותה תגובת "ברח או הילחם" שעזרה לאבות שלנו לברוח מטורפים? היא מכבה את הקורטקס הפרה-פרונטלי, שזה בדיוק החלק במוח שאתם מנסים לאמן. אם דירוג האתגר היומי מעלה לכם את לחץ הדם, נסו משחק חופשי. ברצינות.

ועוד דבר אחד: יש סיכון אמיתי להיות אובססיביים לגבי זה. תשאלו את בת/בן הזוג שלי. יש לילות שנשארתי ער יותר מדי בעקבות שיא חדש כשהייתי צריך לישון — מה שבאירוניה, כנראה ביטל כל תועלת קוגניטיבית שהרווחתי באותו יום.`,
      },
      {
        title: 'אז, שווה לשחק כל יום?',
        content: `בכנות? כן. אני חושב שכן. אבל אולי לא מהסיבות שציפיתם.

המדע אמיתי. מחקר אקסטר עם 19,000 אנשים. הניסוי של קולומביה-דיוק שהראה שתשבצים מנצחים משחקי מוח ב-78 שבועות. מחקר אוצר המילים על פני 17 מחקרים. הראיות מצביעות בכיוון אחד ברור.

אבל הסיבה הכי טובה לשחק משחקי מילים יומית היא לא המדע. זה שזה חמש דקות של עשייה של משהו קצת מאתגר שבמקרה גם כיף. לא הכל צריך הצדקה נוירומדעית. לא כל הרגל צריך חישוב ROI.

תשחקו כי זה מהנה. התועלות למוח הן בונוס.

ועכשיו אם תסלחו לי, יש לי אתגר יומי לסיים. אני כרגע בסטריק של 47 ימים ובת הזוג שלי כבר איימה להחביא לי את הטלפון אם אני לא בא לארוחת ערב.`,
      },
      {
        content: `מחקרים שצוטטו: International Journal of Geriatric Psychiatry (2019) — מחקר PROTECT של אוניברסיטת אקסטר, 19,000 משתתפים. NEJM Evidence (2022) — אוניברסיטאות קולומביה ודיוק, 107 משתתפים ב-78 שבועות. סקירה שיטתית של 17 מחקרים על רכישת אוצר מילים מבוססת משחקים. אוניברסיטת טקסס A&M (2024) — ירידה קוגניטיבית ופעילויות פנאי.`,
      },
    ],
    backToBlog: 'חזרה לבלוג',
    playDaily: 'אתגר יומי',
    startPracticing: 'תרגול',
  },
  sv: {
    title: 'Jag spelade ordspel varje dag i ett år. Här är vad forskningen säger borde ha hänt.',
    subtitle: 'Spoiler: en del av det hände faktiskt.',
    category: 'Forskning',
    readTime: '9 min läsning',
    authorName: 'Ordnörden',
    authorBio: 'Besatt ordspelare, amatörneurovetenskap-läsare, och personen som förstör spelkvällen genom att ta för lång tid på sin tur.',
    sections: [
      {
        content: `Låt mig berätta om det dummaste experimentet jag någonsin gjort på mig själv.

I januari förra året bestämde jag mig för att spela minst ett ordspel varje dag i ett helt år. Inte för att jag ville "optimera min hjärna" eller vad LinkedIn-guruer nu säljer för tiden. Jag bara... gillar verkligen att hitta ord i blandade bokstäver. Har alltid gjort det. Men någonstans runt månad tre började jag läsa forskningen. Och ärligt talat? En del sprängde mitt sinne. En del fick mig att himla med ögonen. Låt mig gå igenom vad som är verkligt och vad som är marknadsföring.`,
      },
      {
        title: 'Studien som fick mig att ta det här på allvar',
        content: `År 2019 släppte forskare från University of Exeter och King's College London en studie i International Journal of Geriatric Psychiatry som följde — håll i er — 19 000 vuxna i åldern 50 till 93. Det är inte ett skrivfel. Nittontusen personer.

De som regelbundet löste ordpussel visade resonemangförmåga motsvarande någon TIO år yngre. Och korttidsminne som någon åtta år yngre. Inte "marginellt bättre". Inte "statistiskt signifikant men praktiskt meningslöst". Vi pratar ett helt decennium av kognitiv skillnad.

Professor Keith Wesnes sammanfattade det: "Prestationen var konsekvent bättre hos dem som rapporterade att de sysslade med pussel, och förbättrades generellt stegvis med frekvensen av pusselanvändning."

På ren svenska: ju mer du spelar, desto skarpare förblir du. Och effekten är inte liten.

Nu — innan du blir för exalterad — detta var en observationsstudie. De låste inte in folk i ett rum och tvingade dem göra korsord. Vilket leder oss till den del som de flesta ordspelsartiklar bekvämt hoppar över.`,
      },
      {
        title: 'Demensfrågan (låt oss vara ärliga)',
        content: `Varje artikel om ordspel kommer till slut med det här påståendet: "Ordspel kan hjälpa till att förebygga demens!" Vanligtvis med ett utropstecken och ett stockfoto på en leende äldre person.

Här är sanningen. Dr. Anne Corbett, en av de ledande forskarna från Exeter, sa specifikt: "Vi kan inte säga att dessa pussel nödvändigtvis minskar risken för demens senare i livet."

Och hon har rätt att vara försiktig. Studierna visar korrelation — personer som gör pussel tenderar att ha bättre kognitiv funktion. Men det bevisar inte att pusslen orsakade det. Kanske dras personer med naturligt skarpare sinnen helt enkelt mer till ordspel. Kanske är det typen av person som gör pussel dagligen, inte pusslen i sig.

Jag vet. Nedslående. Jag blev besviken jag med. Men jag berättar hellre sanningen än säljer dig en bekväm lögn som någon blogg kokade ihop för klick.

Det som ÄR klart — och den här delen är solid — är att ordspel är kopplade till bättre kognitiv funktion just nu. I nuet. Idag. Inte i någon hypotetisk framtid. Det är värt något i sig.`,
      },
      {
        title: 'Korsord mot hjärnträningsappar (den här överraskade mig genuint)',
        content: `OK, den här studien från Columbia och Duke genuint fick mig att lägga ner telefonen och stirra på väggen i en minut.

De tog 107 äldre vuxna med mild kognitiv nedsättning och delade dem i två grupper. Hälften fick datoriserade korsord. Andra hälften fick de där snygga digitala "hjärntränings"-spelen — du vet, den typ som annonseras med fraser som "träna din hjärna på bara 10 minuter om dagen!"

Efter 78 veckor — det är ett och ett halvt år — visade korsordgruppen kognitiv FÖRBÄTTRING. Hjärnspelgruppen visade FÖRSÄMRING.

Läs det igen. Hjärnspelgruppen blev sämre.

Dr. D.P. Devanand från Columbia noterade att fördelarna visade sig "inte bara i kognition utan också i dagliga aktiviteter, med indikationer på hjärnkrympning på MRI som tyder på att effekterna är kliniskt meningsfulla."

Detta var den första studien som dokumenterade långsiktiga fördelar av hembaserad korsordträning. Och det fick mig att känna mig löjligt rättfärdigad för varje gång någon sa att jag "slösade tid" på ordspel istället för att använda Lumosity.`,
      },
      {
        title: 'Vem har mest nytta? (Inte den du tror)',
        content: `Här blir Columbia-Duke-studien ännu mer intressant. Om du är i ett mycket tidigt skede av kognitiv nedsättning hjälper både korsord och hjärnspel ungefär lika mycket. Men i senare stadier drar korsorden ifrån — avsevärt.

En separat studie från Texas A&M 2024 bekräftade detta, och fann att spel, pussel och läsning bromsar kognitiv nedgång även hos personer som redan har mild nedsättning. Inte förebygger. Bromsar. Men att bromsa kognitiv nedgång är fortfarande en stor grej.

Och en personlig observation: jag är inte 50. Jag är inte ens i närheten. Men de förbättringar i mönsterigenkänning jag märkte efter månader av dagligt spelande var dramatiska nog att jag är övertygad om att det här inte bara är en "äldre vuxna"-grej. Din hjärna är plastisk i alla åldrar — frågan är om du ger den något intressant att tugga på.`,
      },
      {
        title: 'Ordförrådstricket som ingen pratar om',
        content: `Det här är kanske min favoritforskning.

En systematisk genomgång av 17 studier om ordinlärning genom spel fann något underbart kontraintuitivt: din hjärna minns ord bättre när den upptäcker dem under problemlösning än när du läser dem från en lista.

När mindes du senast ett ord från ett ordförrådskort? Tänk verkligen efter. Tänk nu på det senaste märkliga ordet du snubblade över i ett spel. De fastnar för att din hjärna stötte på dem i sammanhang — under en utmaning, mitt i problemlösning, när känslor var engagerade.

Spel ger vad forskare kliniskt kallar "rika sammanhang, kognitivt engagemang och virtuella inlärningssituationer." Vilket bara är ett fint sätt att säga: din hjärna lyssnar mer när den har kul.

Jag har personligen lärt mig fler obskyra engelska ord från Scrabble och ordspel än från fyra års formell utbildning. Det är inte skryt — det är en anklagelse mot hur jag pluggade.`,
      },
      {
        title: 'Vad jag faktiskt märkte efter ett år',
        content: `Hör här, jag tänker inte låtsas att jag körde ett kontrollerat experiment på mig själv. Jag gjorde inga fMRI-skanningar eller mätte reaktionstider. Men här är vad jag ärligt märkte efter 365 dagar av dagliga ordspel:

Hastighetsgrejerna var dramatiska. I månad tre började bokstavsmönster hoppa ut. Jag kastade en blick på en blandad uppsättning bokstäver och ord bara... dök upp. Forskningen kallar det "chunking" — din hjärna slutar bearbeta enskilda bokstäver och börjar se grupper. "ST" blir en enhet. "NING" blir en enhet. Du slutar läsa ett rutnät med 16 bokstäver och börjar läsa 5-6 byggstenar. Det är svårt att beskriva, men när det klickar kan du inte sluta se det.

Mitt ordförråd växte på konstiga sätt. Jag känner nu till ord jag inte kan definiera men omedelbart känner igen som "riktiga". Det visar sig att tävlings-Scrabble-spelare har samma upplevelse — bara 6,4% säger att de "alltid" lär sig ordets betydelse.

Och det som överraskade mig mest: det dagliga spelet blev en sorts meditation. Fem minuter av absolut fokus. Inga notiser, ingen scrollning, ingen multitasking — bara jag och bokstäver.`,
      },
      {
        title: 'De ärliga nackdelarna (för ingen nämner dessa)',
        content: `Eftersom vi är ärliga med varandra:

Ordspel ersätter inte motion. Din hjärna behöver blodflöde, och inga korsord ersätter en promenad. De ersätter inte social kontakt — din hjärna behöver andra människor, inte bara konsonanter och vokaler. Och de fixar absolut inte dålig sömn.

Och — detta tycker jag är viktigt — om ordspel stressar dig kanske du gör det fel. Stressresponsen stänger ner din prefrontala cortex, som är exakt den del av hjärnan du försöker träna. Om dagliga utmaningens ranking höjer ditt blodtryck, prova fritt spelläge. Seriöst.

Och en sak till: det finns en riktig risk att bli besatt. Fråga min partner. Vissa kvällar stannade jag uppe alldeles för sent och jagade ett nytt rekord när jag borde ha sovit — vilket, ironiskt nog, troligen omintetgjorde de kognitiva fördelarna jag tjänade den dagen.`,
      },
      {
        title: 'Så, är det värt att spela varje dag?',
        content: `Ärligt? Ja. Det tycker jag. Men kanske inte av de skäl du förväntar dig.

Neurovetenskapen är verklig. Exeter-studien med 19 000 personer. Columbia-Duke-studien som visade att korsord slog hjärnspel över 78 veckor. Ordförrådsforskningen över 17 studier. Bevisen pekar i en tydlig riktning.

Men det bästa skälet att spela ordspel dagligen är inte vetenskapen. Det är att det är fem minuter av att göra något lite utmanande som råkar vara kul. Inte allt behöver en neurovetenskaplig motivering. Inte varje vana behöver en ROI-kalkyl.

Spela för att det är roligt. Hjärnfördelarna är en bonus.

Och nu, om ni ursäktar, har jag en daglig utmaning att avsluta. Jag har en 47-dagarssvit och min partner har redan hotat att gömma min telefon om jag inte kommer till middagen.`,
      },
      {
        content: `Citerad forskning: International Journal of Geriatric Psychiatry (2019) — University of Exeter PROTECT-studien, 19 000 deltagare. NEJM Evidence (2022) — Columbia & Duke University, 107 deltagare under 78 veckor. Systematisk genomgång av 17 studier om spelbaserad ordförrådsinlärning. Texas A&M University (2024) — kognitiv nedgång och fritidsaktiviteter.`,
      },
    ],
    backToBlog: 'Tillbaka till Bloggen',
    playDaily: 'Dagens Utmaning',
    startPracticing: 'Öva',
  },
  ja: {
    title: '1年間毎日ワードゲームをプレイしてみた。科学が言うには、こうなるはずだった。',
    subtitle: 'ネタバレ：一部は本当にそうなった。',
    category: '研究',
    readTime: '読了時間：9分',
    authorName: 'ワードオタク',
    authorBio: 'ワードゲーム中毒者、アマチュア神経科学読者、ゲームナイトで自分の番に時間をかけすぎて台無しにする人。',
    sections: [
      {
        content: `自分で行った最も馬鹿げた実験について話させてください。

去年の1月、丸1年間、毎日少なくとも1つのワードゲームをプレイすることにしました。「脳を最適化」したかったわけでも、LinkedInのグルたちが最近売っているものを信じたわけでもありません。ただ...バラバラの文字から言葉を見つけるのが本当に好きなんです。ずっとそうでした。でも3ヶ月目あたりで研究論文を読み始めました。正直に言うと？一部は衝撃的でした。一部は目を丸くしました。何が本物で何がマーケティングなのか、一緒に見ていきましょう。`,
      },
      {
        title: 'これを真剣に受け止めるきっかけになった研究',
        content: `2019年、エクセター大学とキングス・カレッジ・ロンドンの研究者たちがInternational Journal of Geriatric Psychiatryに研究を発表しました。追跡した人数は — 驚かないでください — 50歳から93歳の19,000人。打ち間違いではありません。1万9千人です。

定期的にワードパズルを解いていた人は、10歳若い人と同等の推論能力を示しました。そして8歳若い人と同等の短期記憶を。「わずかに良い」ではなく。「統計的に有意だが実質的には無意味」でもなく。丸10年分の認知機能の差です。

キース・ウェスネス教授はこうまとめました：「パズルに取り組んでいると報告した人は一貫してパフォーマンスが良く、パズルの使用頻度に応じて段階的に改善していました。」

簡単に言えば：プレイすればするほど、シャープさを保てる。そして効果は小さくない。

ただし — 興奮しすぎる前に — これは観察研究でした。人を部屋に閉じ込めてクロスワードをさせたわけではありません。ここから、ほとんどのワードゲーム記事が都合よく飛ばす部分に入ります。`,
      },
      {
        title: '認知症の問題（正直に言おう）',
        content: `ワードゲームに関するすべての記事は、最終的にこの主張にたどり着きます：「ワードゲームは認知症予防に役立つ！」たいてい感嘆符付きで、笑顔の高齢者のストック写真と一緒に。

真実はこうです。エクセターの主任研究者の一人、アン・コルベット博士は明確にこう述べました：「これらのパズルをすることが必ずしも後年の認知症リスクを減らすとは言えません。」

そして彼女が慎重なのは正しい。研究は相関関係を示しています — パズルをする人は認知機能が良い傾向がある。しかしパズルがそれを引き起こしたとは証明されていない。もともと頭の鋭い人がワードゲームに惹かれやすいだけかもしれない。

わかっています。がっかりですよね。私もがっかりしました。でもクリックのためにどこかのブログが作り上げた心地よい嘘を売るより、本当のことを伝えたい。

明確なのは — そしてこの部分は確実 — ワードゲームは今この瞬間の認知機能の向上と関連しているということ。仮定の未来ではなく。今。それ自体に価値があります。`,
      },
      {
        title: 'クロスワード vs 脳トレアプリ（これには本当に驚いた）',
        content: `コロンビア大学とデューク大学のこの研究は、電話を置いて壁をじっと見つめさせるものでした。

軽度認知障害のある107人の高齢者を2グループに分けました。半分にはコンピューター化されたクロスワードを。もう半分にはあのおしゃれなデジタル「脳トレ」ゲームを — 「1日たった10分で脳をトレーニング！」とポッドキャストで宣伝されているやつです。

78週間後 — 1年半です — クロスワード群は認知機能が改善しました。脳トレゲーム群は低下しました。

もう一度読んでください。脳トレゲーム群は悪くなった。

コロンビア大学のD.P.デバナンド博士は、効果が「認知だけでなく日常活動にも見られ、MRIでの脳萎縮の減少の兆候は効果が臨床的に意味があることを示唆している」と述べました。

これは自宅でのクロスワードトレーニングの長期的な利点を記録した最初の研究でした。ワードゲームで「時間を無駄にしている」と言われるたびに感じていた悔しさが、少し報われた気がしました。`,
      },
      {
        title: '誰に最も効果があるか？（予想外の答え）',
        content: `コロンビア-デューク研究はさらに興味深くなります。軽度認知障害の非常に初期段階では、クロスワードも脳トレゲームもほぼ同じくらい効果があります。しかし後期段階では、クロスワードが大きくリードします。

2024年のテキサスA&M大学の別の研究でもこれが裏付けられ、ゲーム、パズル、読書は、すでに軽度の障害がある人でも認知機能の低下を遅らせることがわかりました。予防ではなく、減速。でも認知機能の低下を遅らせることは、それだけで大きなことです。

個人的な観察：私は50歳ではありません。ほど遠い。でも数ヶ月の毎日のプレイ後に気づいたパターン認識の改善は、これが「高齢者だけの話」ではないと確信させるほど劇的でした。脳はどの年齢でも可塑的です — 問題は、脳に噛みごたえのある面白いものを与えているかどうかです。`,
      },
      {
        title: '誰も話さない語彙のトリック',
        content: `これは私のお気に入りの研究かもしれません。

ゲームを通じた単語学習に関する17の研究の系統的レビューが、美しく直感に反することを発見しました：脳は、リストから読んだ時よりも、問題解決中に発見した時の方が単語をよく覚える。

最後に語彙カードから単語を覚えたのはいつですか？本当に考えてみてください。次に、ゲーム中に偶然出会った最後の変わった単語を思い出してください。それらが記憶に残るのは、脳がコンテキストの中で — チャレンジ中に、問題解決をしながら、感情が関与している時に — それらに出会ったからです。

研究者が臨床的に「豊かなコンテキスト、認知的関与、仮想学習状況」と呼ぶものをゲームは提供します。これは「脳は楽しんでいる時にもっと注意を払う」という華麗な言い方です。

私は個人的に、4年間の正式な教育よりもスクラブルやワードゲームからより多くの珍しい英単語を学びました。自慢ではなく、自分の学び方への反省です。`,
      },
      {
        title: '1年後に実際に気づいたこと',
        content: `いいですか、自分で対照実験を行ったふりはしません。fMRIスキャンもしなかったし、反応時間も測りませんでした。でも365日の毎日のワードゲーム後に正直に気づいたことはこれです：

速度の変化は劇的でした。3ヶ月目で、文字のパターンが飛び出すようになりました。バラバラの文字セットを見ると、単語がただ...現れるんです。研究ではこれを「チャンキング」と呼びます — 脳が個々の文字の処理をやめて、グループとして見始める。16文字のグリッドを読むのではなく、5-6個の構成要素を読むようになる。説明しにくいのですが、一度わかると、見えなくなることはありません。

語彙が変な方向に成長しました。定義できないけど即座に「本物」と認識できる単語を知っています。競技スクラブルプレイヤーも同じ経験をしているそうです — 「常に」単語の意味を学ぶと答えたのはわずか6.4%。

そして最も驚いたこと：毎日のゲームが一種の瞑想になりました。5分間の絶対的な集中。通知なし、スクロールなし、マルチタスクなし — 私と文字だけ。`,
      },
      {
        title: '正直なデメリット（誰も言及しないから）',
        content: `お互い正直になりましょう：

ワードゲームは運動の代わりにはなりません。脳には血流が必要で、クロスワードでは散歩の代わりになりません。社会的つながりの代わりにもなりません — 脳には子音と母音だけでなく、他の人間が必要です。そして悪い睡眠は絶対に直りません。

また — これは重要だと思います — ワードゲームがストレスなら、やり方が間違っているかもしれません。ストレス反応は前頭前皮質をシャットダウンします。これは鍛えようとしている脳の部分そのものです。デイリーチャレンジのランキングが血圧を上げているなら、フリープレイモードを試してください。本気で。

もう一つ：これに取り憑かれるリスクは本当にあります。パートナーに聞いてみてください。寝るべき時にハイスコアを追いかけて遅くまで起きていた夜が何度もあります — 皮肉なことに、その日に得た認知的利益をおそらく帳消しにしていたでしょう。`,
      },
      {
        title: 'で、毎日プレイする価値はある？',
        content: `正直に？はい。そう思います。でも予想する理由とは違うかもしれません。

神経科学は本物です。19,000人のエクセター研究。78週間にわたってクロスワードが脳トレゲームに勝ったコロンビア-デューク試験。17の研究にわたる語彙研究。証拠は一つの明確な方向を指しています。

でも毎日ワードゲームをプレイする最高の理由は科学ではありません。たまたま楽しい、ちょっとチャレンジングなことを5分間やること。すべてに神経科学的正当化が必要なわけではありません。すべての習慣にROI計算が必要なわけでもありません。

楽しいからプレイしてください。脳の利益はボーナスです。

では失礼します、デイリーチャレンジを終わらせないと。現在47日連続記録中で、パートナーが夕食に来ないなら携帯を隠すと脅しています。`,
      },
      {
        content: `引用した研究：International Journal of Geriatric Psychiatry (2019) — エクセター大学PROTECT研究、19,000人の参加者。NEJM Evidence (2022) — コロンビア大学＆デューク大学、78週間107人の参加者。ゲームベースの語彙習得に関する17の研究の系統的レビュー。テキサスA&M大学 (2024) — 認知機能低下とレジャー活動。`,
      },
    ],
    backToBlog: 'ブログに戻る',
    playDaily: 'デイリーチャレンジ',
    startPracticing: '練習する',
  },
  es: {
    title: 'Jugué juegos de palabras cada día durante un año. Aquí está lo que pasó realmente.',
    subtitle: 'Spoiler: algunos de los beneficios son auténticos.',
    category: 'Investigación',
    readTime: '9 min de lectura',
    authorName: 'Ohad Fisher',
    authorBio: 'Jugador obsesionado con los juegos de palabras, lector amateur de neurociencia, y la persona que arruina las tardes de juegos por tardar tres minutos en mi turno.',
    sections: [
      {
        content: `El año pasado decidí jugar al menos un juego de palabras cada día durante 365 días seguidos. No fue porque quisiera "optimizar mi cerebro" ni porque creara en los gurús motivacionales de LinkedIn. Simplemente... me encanta encontrar palabras en un montón de letras revueltas. Siempre me encantó.

Pero alrededor del tercer mes de hacerlo, empecé a investigar la neurociencia detrás. Y créeme, algunos resultados me sorprendieron. Otros me parecieron exagerados. Aquí está lo que la ciencia realmente nos dice, sin el marketing.`,
      },
      {
        title: 'El estudio que cambió cómo veía todo',
        content: `En 2019, investigadores de la Universidad de Exeter y King's College London publicaron un análisis que monitoreó a 19,000 adultos entre 50 y 93 años durante años. No es un error tipográfico. Diecinueve mil personas.

Quienes resolvían puzzles de palabras de forma regular mostraban una capacidad de razonamiento equivalente a alguien diez años más joven. Y una memoria a corto plazo comparable a alguien ocho años más joven. No estamos hablando de mejoras marginales. Estos eran cambios cognitivos drásticos.

El profesor Keith Wesnes resumió los datos: "Quienes hacen puzzles regularmente muestran un rendimiento consistentemente mejor, y esa mejora es proporcional a cuánto juegan."

Traducido al español: jugamos más, permanecemos más agudos. El efecto es real y medible.

Pero antes de que te emociones demasiado, aquí viene la parte incómoda que la mayoría de artículos omite.`,
      },
      {
        title: 'Lo que el estudio NO dice sobre demencia',
        content: `Cada blog sobre juegos de palabras termina con la misma afirmación: "¡Los juegos de palabras previenen la demencia!" Usualmente con un signo de exclamación y una foto de archivo de una persona mayor sonriendo.

La verdad es más matizada. La Dra. Anne Corbett, una de las investigadoras principales en el estudio de Exeter, fue clara: "No podemos afirmar que jugar puzzles reduce el riesgo de demencia más adelante en la vida."

Y tiene razón en ser cauta. Los estudios muestran correlación, no causa. Las personas que hacen puzzles tienden a tener mejor función cognitiva. Pero eso no prueba que los puzzles lo causen. Podría ser que las personas naturalmente más agudas simplemente disfruten más de los juegos de palabras. Es el tipo de pregunta que la ciencia aún no responde completamente.

Lo que sí sabemos con seguridad es que los juegos de palabras están conectados a una mejor función cognitiva en el presente. Ahora mismo. Hoy. Eso por sí solo tiene valor.`,
      },
      {
        title: 'Crucigramas contra apps de "entrenamiento cerebral"',
        content: `Un estudio que compara estos dos enfoques me dejó mirando la pared durante varios minutos.

Columbia y Duke tomaron 107 adultos mayores con deterioro cognitivo leve. Dividieron al grupo por la mitad. Una mitad hizo crucigramas computarizados. La otra mitad usó esas apps glamorosas de "entrenamiento cerebral" que escuchamos en podcasts.

Después de 78 semanas (más de un año), el grupo de crucigramas mostró mejora en cognición. El grupo de apps de entrenamiento mostró declive.

El Dr. D.P. Devanand de Columbia documentó que las mejoras aparecieron no solo en pruebas de cognición sino en las actividades diarias, sugiriendo que estos cambios son clínicamente significativos.

Esa fue la primera evidencia en la literatura científica de que los crucigramas en casa producen beneficios medibles a largo plazo. Debo admitir que sentí cierta satisfacción cuando vi ese resultado.`,
      },
      {
        title: '¿A quién le sirve más?',
        content: `El estudio Columbia-Duke nos cuenta aún más. En etapas muy tempranas de deterioro cognitivo, tanto crucigramas como juegos cerebrales ayudan aproximadamente igual. Pero en etapas posteriores, los crucigramas se separan claramente del grupo.

Un análisis de 2024 de Texas A&M confirmó que los juegos, puzzles y la lectura ralentizan el declive cognitivo incluso en personas que ya están perdiendo función. No lo previenen. Lo ralentizan. Y ralentizar un declive cognitivo es algo importante.

Observación personal: tengo menos de 50 años. Pero las mejoras que noté en reconocer patrones después de meses jugando diariamente fueron tan notables que me convencieron de que esto no es solo un fenómeno de personas mayores. El cerebro es plástico a cualquier edad. La pregunta es si le estamos dando algo interesante para trabajar.`,
      },
      {
        title: 'Por qué tu cerebro recuerda palabras de un juego',
        content: `Una revisión de 17 estudios sobre aprender vocabulario a través de juegos encontró algo hermosamente contraintuitivo: tu cerebro memoriza palabras mejor cuando las descubre mientras resuelve un problema que cuando las ve en una lista.

¿Cuándo fue la última vez que aprendiste una palabra de una tarjeta de vocabulario? Piénsalo de verdad. Ahora piensa en esa palabra rara que encontraste en un juego hace poco. Esas se quedan grabadas porque tu cerebro las encontró bajo presión, durante un desafío, cuando había una razón emocional para recordarla.

Los investigadores lo llaman "contextos ricos, compromiso cognitivo y situaciones de aprendizaje significativo." Es decir: el cerebro presta más atención cuando se divierte.

He aprendido más palabras oscuras en inglés jugando Scrabble que en cuatro años de educación formal. Eso no es un alarde. Es una crítica de cómo estudiaba.`,
      },
      {
        title: 'Lo que noté después de 365 días',
        content: `No voy a fingir que hice un experimento científico controlado. Sin resonancias magnéticas, sin mediciones de tiempo de reacción. Pero aquí está lo que honestamente observé después de un año jugando cada día:

La velocidad fue dramática. Para el tercer mes, los patrones de letras empezaban a resaltar solos. Miraba un conjunto de letras revueltas y las palabras simplemente surgían. Los neurocientíficos llaman a esto "chunking": el cerebro deja de procesar letras individuales y comienza a ver unidades. Ya no ves 16 letras sueltas sino cinco o seis palabras potenciales. Es difícil de explicar, pero una vez que lo experimentas, no puedes verlo de otra manera.

Mi vocabulario creció de formas inesperadas. Ahora reconozco palabras al instante como "reales" aunque no pueda definirlas. Los jugadores competitivos de Scrabble tienen exactamente esa experiencia.

Lo que más me sorprendió: el juego diario se convirtió en meditación. Cinco minutos de enfoque puro. Sin notificaciones, sin scrollear, sin hacer mil cosas a la vez. Solo yo y las letras en la pantalla.`,
      },
      {
        title: 'Las desventajas que nadie menciona',
        content: `Seamos honestos: los juegos de palabras no reemplazan el ejercicio. Tu cerebro necesita que circule sangre, y ningún crucigrama sustituye una caminata. Tampoco reemplazan la conexión social. El cerebro necesita otros humanos, no solo consonantes y vocales. Y ciertamente no arreglan una mala noche de sueño.

Si los juegos de palabras te generan estrés, probablemente los estés enfocando mal. El estrés apaga la corteza prefrontal, que es exactamente la región que intentas ejercitar. Si el ranking diario te sube la presión arterial, prueba jugar sin competencia.

Una última cosa: hay un riesgo real de obsesionarse. Algunas noches me quedé despierto demasiado tarde persiguiendo un récord cuando debería estar durmiendo, lo cual, irónicamente, probablemente canceló cualquier beneficio cognitivo que había ganado ese día.`,
      },
      {
        title: '¿Vale la pena jugar todos los días?',
        content: `Sí. Creo que sí. Pero quizá no por las razones que esperas.

La neurociencia es sólida. El estudio de Exeter con 19,000 participantes. El ensayo Columbia-Duke mostrando que los crucigramas superan las apps de entrenamiento tras 78 semanas. Dieciséis estudios sobre vocabulario. Las pruebas apuntan claramente en una dirección.

Pero la mejor razón para jugar juegos de palabras cada día no es la ciencia. Es que son cinco minutos de hacer algo levemente difícil que resulta ser divertido. No necesitas una justificación neurocientífica para cada hábito. No todo requiere un análisis de costo-beneficio.

Juega porque te divierte. Los beneficios para el cerebro son un plus.

Ahora, si me disculpas, tengo un desafío diario que completar. Llevo 47 días seguidos y mi pareja ya amenazó con esconder mi teléfono si no voy a cenar.`,
      },
      {
        content: `Fuentes citadas: International Journal of Geriatric Psychiatry (2019) — Estudio PROTECT, Universidad de Exeter, 19,000 participantes. NEJM Evidence (2022) — Universidades de Columbia y Duke, 107 participantes en 78 semanas. Revisión sistemática de 17 estudios sobre aprendizaje de vocabulario mediante juegos. Universidad de Texas A&M (2024) — declive cognitivo y actividades de ocio.`,
      },
    ],
    backToBlog: 'Volver al Blog',
    playDaily: 'Desafío Diario',
    startPracticing: 'Practicar',
  },
};
