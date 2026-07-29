export type GuideContent = {
  title: string;
  subtitle: string;
  category: string;
  readTime: string;
  authorName: string;
  authorBio: string;
  quickTips: string[];
  scoringTable: { length: number; points: number }[];
  sections: Array<{ title?: string; content: string }>;
  faq: Array<{ question: string; answer: string }>;
  ctaText: string;
  ctaLink: string;
  backToGuides: string;
};

const scoringTable = [
  { length: 3, points: 2 },
  { length: 4, points: 3 },
  { length: 5, points: 4 },
  { length: 6, points: 5 },
  { length: 7, points: 6 },
  { length: 8, points: 7 },
];

export const contentByLocale: Record<string, GuideContent> = {
  en: {
    title: 'How I Went from 30 Points to 200+ in Classic Mode (And How You Can Too)',
    subtitle: 'Real strategies from someone who has embarrassingly logged 500+ hours staring at letter grids.',
    category: 'Strategy',
    readTime: '8 min read',
    authorName: 'Ohad Fisher',
    authorBio: 'I play Classic mode way too much. My friends have stopped inviting me to game nights because of it. Worth it.',
    quickTips: [
      'Start from corners. Seriously. I ignored this advice for months and my scores suffered for it.',
      'Train your eyes to spot UN-, RE-, PRE- and -ING, -TION, -ED. Once you see them, you cant unsee them.',
      'Slam in short words first. Get that score ticking up. The long words will come.',
      'Force yourself to just LOOK for 15 seconds before touching anything. It feels wrong. Do it anyway.',
      'Vowel-consonant clusters are your bread and butter. A lonely Q in a corner? Skip it.',
      'Diagonals! I probably missed 30% of my words for the first hundred hours because I forgot diagonals exist.',
      'Last 30 seconds? Panic mode. Submit every 3-letter word your eyes land on. No shame.',
    ],
    scoringTable,
    sections: [
      {
        title: 'So You Want to Get Good at Classic',
        content: `Here's the deal. Classic mode gives you a grid, a clock, and the vague hope that your brain will cooperate. You connect adjacent tiles to spell words. Horizontal, vertical, diagonal. Each tile gets used once per word, minimum 3 letters. Simple enough.

Scoring? Longer words = more points. A 3-letter word gets you 2 points, an 8-letter one gets 7. It's just word length minus one. You probably figured that out already. But knowing the scoring isn't what makes you good. I knew the scoring for months before I broke 100 points consistently.

What actually matters is how you read the board. I used to just... stare at it and hope words would appear. Sometimes they did! Mostly they didn't. The difference between me at 30 points and me at 200+ was learning to scan systematically instead of randomly hoping for the best.`,
      },
      {
        title: 'Corners First (Trust Me on This)',
        content: `OK so this is the single biggest improvement I ever made to my game. Start with the corners.

Why? Corner tiles only touch 3 other tiles. Center tiles touch 8. That means when you start from a corner, there are way fewer paths to get confused by. Your brain can actually trace the word without getting lost. I used to start dead center every game and wonder why I kept losing my place mid-word.

After corners, hit the edges. Edge tiles connect to 5 neighbors. Not as easy as corners but way more manageable than the middle. A lot of people skip straight from corners to center. Don't. I've found some of my best words starting from edges, and in multiplayer your opponents are probably ignoring them too.

Center tiles last. They're a mess of connections and possibilities, which sounds great until you're three letters deep and can't remember which direction you were going. By the time you get to center tiles, you've already internalized where everything is from your corner and edge passes. Makes a huge difference.

This whole sweep takes me about 30-40 seconds now. Used to take over a minute when I was learning it.`,
      },
      {
        title: 'The Prefix/Suffix Trick That Changed Everything',
        content: `I learned this one from getting absolutely destroyed by someone in multiplayer who found 6-letter words like it was nothing. After the game I asked them what they were doing differently. Their answer: "I don't look for words. I look for word parts."

That clicked for me. Instead of scanning for complete words, scan for beginnings: UN-, RE-, PRE-, OUT-, OVER-. The second you spot one of those combos on the board, start tracing forward. What can come after UN? UNDO, UNIT, UNDER. Your eyes learn to do this automatically after a while.

Same thing works backwards with suffixes: -ING, -ED, -ER, -TION, -LY, -NESS, -ABLE, -MENT. Spot an -ING cluster? Now trace backwards from it.

The real galaxy-brain move is what I call bridge building. You see RE- on the left side of the board and -ING on the right. Can you connect them through the middle? This is how basically every 6+ letter word gets found. It felt impossible at first. Now I do it without thinking.

Oh, and the letter S. Never forget S. Any word you already found might have an S sitting right next to its last letter. Free plurals. Free verb forms. I probably get 15-20% of my points just from adding S to words I already submitted.`,
      },
      {
        title: 'How I Actually Spend My Time (The 3 Phases)',
        content: `I wasted so many games before I figured out pacing. I'd either blow all my time hunting for one big word, or I'd frantically submit tiny words the whole round and miss the good stuff. Turns out there's a rhythm to it.

First 30% of the clock - just go. Submit everything. See THE? Submit. See AT? Submit. Don't think about whether a 3-letter word is "worth it." It is. You're banking points and getting the lay of the land at the same time. My fingers are basically on autopilot during this phase.

Middle 40% - now slow down. This is your hunting phase. Apply the prefix/suffix stuff. Look at clusters you haven't touched. Try weird diagonal paths. I find most of my 5+ letter words here. It's the part of the game that actually feels like a puzzle.

Last 30% - speed up again. Go back to corners you only glanced at. Try starting from tiles you haven't used yet. Submit anything that looks like it might be a word. Wrong guesses barely cost you anything, but a word you didn't submit costs you everything.

One thing I still struggle with: getting stuck in the middle phase. If you haven't found anything new in 10 seconds, MOVE. Staring harder at the same six tiles won't make a word appear. I have to physically force my eyes to a different part of the board sometimes.`,
      },
      {
        title: 'Training Your Eyes to See Clusters',
        content: `This is the part that takes real practice, and honestly I'm still getting better at it. The goal is to stop reading individual letters and start seeing chunks.

When I see TH on a board now, my brain doesn't process "T... H..." It just goes "THE THEN THEM THIN THIS THAT." It's automatic. Same with IN, ER, AN, ON, ST, RE. These two-letter combos are so common in English that they should trigger an instant mental cascade of words. That takes time. Took me maybe 50 hours of play before it started feeling natural.

Vowel clusters are gold. Two or three vowels next to each other? That's the core of a dozen words right there. A-I together? AID, AIR, AIM, RAIN, MAIN, PAIR. O-U together? OUT, OUR, POUR, TOUR, FOUR. I get excited when I see vowel islands now. My friends think that's weird.

Consonant blends at the start of words: BL, BR, CL, CR, DR, FL, FR, GL, GR, PL, PR, SC, SH, SK, SL, SM, SN, SP, ST, SW, TR. When you spot one, trace forward. Something is almost always there.

And then there are dead zones. QX next to each other. ZJ. VV. Sometimes a chunk of the board is just useless. Recognizing that FAST saves you from wasting 15 seconds trying to make "QXVZ" into a word. Not everything on the board wants to cooperate.`,
      },
      {
        title: 'Submit First, Ask Questions Later',
        content: `People argue about this all the time: should you submit a short word immediately or keep tracing to see if it becomes a longer word?

My answer: just submit. You see CAT? Tap it in. Then check if CATS or CATCH or CATER works. You've already locked in your 2 points. Now you're playing with house money.

The only time I hold off is if I'm in the first few seconds and I can clearly see a 6+ letter word forming. Going from CAT (2 pts) to CATCHER (6 pts) is a big enough jump to justify the risk. But that's rare. And I've definitely lost words by being greedy. More than once I've sat there trying to trace BEAUTIFUL and lost track, when I could've had BEAT, BEAU, and BUT already in the bank.

In multiplayer this matters even more. Both players get credit for the same word, but speed affects tiebreakers. Don't sit on words. Get them in.

There is zero benefit to holding a word. Zero. The clock doesn't care about your plans.`,
      },
      {
        title: 'Mistakes I Made (So You Don\'t Have To)',
        content: `Tunnel vision. This is the big one. I once spent 20 seconds trying to make BEAUTIFUL work on a board where it was physically impossible. Twenty seconds! That's an eternity. If you've been staring at the same spot for 5 seconds, leave. The board has tons of words. Don't get married to one.

Skipping short words. I used to think 3-letter words were beneath me. "I'm looking for the big ones." Cool strategy, me. Except ten 3-letter words give you 20 points and two 6-letter words give you 10. Volume wins. I had to swallow my pride on this one.

Ignoring diagonals. This one's embarrassing. For way too long I was basically only scanning horizontally and vertically. Turns out about 40% of findable words use at least one diagonal connection. I was leaving almost half the board on the table.

Not reading the board first. Some boards are drowning in vowels and want you to find lots of short words. Others have weird consonant clusters that hide a few monsters. You can usually tell in the first 10 seconds what kind of board you're dealing with. Adjust accordingly. I used to play every board the same way.

Panicking at the end. When that timer hits 30 seconds, something in your brain just breaks. You freeze or start wildly tapping random tiles. Neither helps. Fall back to phase 3. Sweep areas you skipped. Submit fast. Stay calm. (I still panic sometimes. It's a work in progress.)`,
      },
    ],
    faq: [
      {
        question: 'What is the best starting strategy for Classic mode in LexiClash?',
        answer: 'Corners first, always. They have fewer connections so your brain can actually trace paths without getting lost. Then edges, then the messy center. And spend the first 15 seconds just looking at the board before you start tapping. It feels counterintuitive but it works.',
      },
      {
        question: 'How does scoring work in LexiClash Classic mode?',
        answer: 'It is just word length minus one. So a 3-letter word gets you 2 points, 4 letters gets 3, and so on up. Longer words score more per word, but honestly you will get more total points by submitting a bunch of short words than agonizing over one long one.',
      },
      {
        question: 'How can I find longer words on the grid?',
        answer: 'Stop looking for whole words and start looking for word parts. Spot UN- or RE- on the board? Trace forward. See -ING or -TION? Trace backwards. Then try to bridge a prefix to a suffix through the middle tiles. Basically every 6+ letter word I find comes from this technique.',
      },
      {
        question: 'Is it better to submit short words or look for long words?',
        answer: 'Both, but short words first. Lock in those points. Ten 3-letter words (20 points) beat three 5-letter words (12 points) every time. The winning approach is a steady stream of short words with the occasional long one mixed in when you spot it.',
      },
    ],
    ctaText: 'Go try this stuff right now',
    ctaLink: '/singleplayer',
    backToGuides: 'Back to Guides',
  },
  he: {
    title: 'איך עליתי מ-30 נקודות ל-200+ במצב קלאסי (ואיך גם אתם יכולים)',
    subtitle: 'אסטרטגיות אמיתיות ממישהו שהשקיע 500+ שעות מביכות בבהייה בלוחות אותיות.',
    category: 'אסטרטגיה',
    readTime: '8 דקות קריאה',
    authorName: 'חנון המילים',
    authorBio: 'אני משחק קלאסי יותר מדי. החברים שלי הפסיקו להזמין אותי לערבי משחקים בגלל זה. שווה את זה.',
    quickTips: [
      'התחילו מפינות. ברצינות. התעלמתי מהעצה הזו חודשים והניקוד שלי סבל.',
      'אמנו את העיניים לזהות ה-, מ-, ל- וסיומות כמו -ים, -ות, -ה. ברגע שרואים את זה, אי אפשר להפסיק.',
      'תדחפו מילים קצרות קודם. שהנקודות יתחילו לרוץ. המילים הארוכות יגיעו.',
      'תכריחו את עצמכם פשוט להסתכל 15 שניות לפני שנוגעים במשהו. זה מרגיש לא נכון. תעשו את זה בכל זאת.',
      'אשכולות תנועות-עיצורים הם הלחם והחמאה שלכם. ק בודדת בפינה? דלגו.',
      'אלכסונים! כנראה פספסתי 30% מהמילים ב-100 השעות הראשונות כי שכחתי שאלכסונים קיימים.',
      '30 שניות אחרונות? מצב פאניקה. תגישו כל מילה בת 3 אותיות שהעין נופלת עליה. בלי בושה.',
    ],
    scoringTable,
    sections: [
      {
        title: 'אז רוצים להיות טובים בקלאסי',
        content: `בואו נהיה כנים. מצב קלאסי נותן לכם לוח, שעון, ואת התקווה העמומה שהמוח שלכם ישתף פעולה. מחברים אריחים סמוכים כדי לאיית מילים. אופקי, אנכי, אלכסוני. כל אריח נמצא בשימוש פעם אחת למילה, מינימום 3 אותיות. פשוט ככה.

ניקוד? מילים ארוכות = יותר נקודות. מילה בת 3 אותיות מקבלת 2 נקודות, בת 8 מקבלת 7. זה פשוט אורך מילה פחות אחד. בטח כבר הבנתם את זה. אבל לדעת את הניקוד זה לא מה שהופך אתכם לטובים. אני ידעתי את הניקוד חודשים לפני שהצלחתי לעבור 100 נקודות בעקביות.

מה שבאמת משנה הוא איך קוראים את הלוח. פעם הייתי פשוט... בוהה בו ומקווה שמילים יופיעו. לפעמים הן הופיעו! ברוב המקרים לא. ההבדל ביני עם 30 נקודות לביני עם 200+ היה ללמוד לסרוק שיטתית במקום לקוות לטוב.`,
      },
      {
        title: 'פינות קודם (תסמכו עליי בזה)',
        content: `אוקיי אז זה השיפור הכי גדול שעשיתי במשחק שלי. להתחיל מהפינות.

למה? אריחי פינה נוגעים רק ב-3 אריחים אחרים. אריחי מרכז נוגעים ב-8. זה אומר שכשמתחילים מפינה, יש הרבה פחות נתיבים שמבלבלים. המוח באמת יכול לעקוב אחרי המילה בלי ללכת לאיבוד. פעם הייתי מתחיל ממש מהמרכז בכל משחק ותוהה למה אני מאבד את עצמי באמצע מילה.

אחרי פינות, תתקפו את השוליים. אריחי שוליים מתחברים ל-5 שכנים. לא קל כמו פינות אבל הרבה יותר נוח מהמרכז. הרבה אנשים מדלגים מפינות ישר למרכז. אל תעשו את זה. מצאתי כמה מהמילים הכי טובות שלי דווקא בשוליים, ובמרובה משתתפים היריבים שלכם כנראה מתעלמים מהם.

אריחי מרכז בסוף. הם בלאגן של חיבורים ואפשרויות, שנשמע מעולה עד שאתם שלוש אותיות פנימה ולא זוכרים לאן הייתם הולכים. עד שמגיעים לאריחי מרכז, כבר הפנמתם איפה הכל נמצא מהסריקות הקודמות. זה עושה הבדל עצום.

כל הסריקה הזאת לוקחת לי עכשיו 30-40 שניות. פעם לקח לי יותר מדקה כשלמדתי את זה.`,
      },
      {
        title: 'הטריק של תחיליות/סיומות ששינה לי את המשחק',
        content: `את הטריק הזה למדתי אחרי שמישהו במרובה משתתפים פשוט מחק איתי את הרצפה ומצא מילים בנות 6 אותיות כאילו זה כלום. אחרי המשחק שאלתי אותו מה הוא עושה אחרת. התשובה שלו: "אני לא מחפש מילים. אני מחפש חלקי מילים."

זה עשה לי קליק. במקום לסרוק מילים שלמות, סורקים התחלות: ה-, מ-, ל-, ב-. הרגע שמזהים שילוב כזה על הלוח, מתחילים לעקוב קדימה. מה יכול לבוא אחרי מ-? מכתב, מנוחה, מלכה. העיניים לומדות לעשות את זה אוטומטית אחרי כמה זמן.

אותו דבר עובד הפוך עם סיומות: -ים, -ות, -ה, -ת, -ן, -ית. רואים אשכול -ים? עכשיו עקבו אחורה ממנו.

המהלך של גאונים אמיתיים הוא מה שאני קורא בניית גשרים. רואים ה- בצד שמאל של הלוח ו-ים בצד ימין. אפשר לחבר אותם דרך האמצע? ככה בעצם כל מילה של 6+ אותיות נמצאת. זה הרגיש בלתי אפשרי בהתחלה. עכשיו אני עושה את זה בלי לחשוב.

אה, והאות י. לעולם אל תשכחו את י. היא מופיעה בתחיליות, סיומות ובאמצע כל דבר. אני בטח מקבל 15-20% מהנקודות שלי רק מזה שאני בונה מילים סביב י.`,
      },
      {
        title: 'איך אני באמת מבלה את הזמן שלי (3 השלבים)',
        content: `בזבזתי כל כך הרבה משחקים לפני שהבנתי את הקצב. או שהייתי שורף את כל הזמן בציד מילה ארוכה אחת, או שהייתי מגיש בטירוף מילים זעירות כל הסיבוב ומפספס את הדברים הטובים. מסתבר שיש קצב לזה.

30% ראשונים של השעון - יאללה קדימה. תגישו הכל. רואים גם? תגישו. רואים על? תגישו. אל תחשבו אם מילה בת 3 אותיות "שווה את זה." היא שווה. אתם צוברים נקודות ולומדים את הלוח בו זמנית. האצבעות שלי על טייס אוטומטי בשלב הזה.

40% אמצעיים - עכשיו להאט. זה שלב הציד. מפעילים את כל העניין של תחיליות/סיומות. מסתכלים על אשכולות שלא נגעתם בהם. מנסים נתיבים אלכסוניים מוזרים. אני מוצא את רוב המילים של 5+ אותיות פה. זה החלק שמרגיש כמו פאזל אמיתי.

30% אחרונים - להאיץ שוב. לחזור לפינות שרק הצצתם עליהן. לנסות אריחי התחלה שלא השתמשתם בהם. להגיש כל דבר שנראה כמו מילה. ניחושים שגויים כמעט לא עולים לכם כלום, אבל מילה שלא הגשתם עולה לכם הכל.

משהו שאני עדיין מתקשה בו: להיתקע בשלב האמצעי. אם לא מצאתם משהו חדש 10 שניות, תזוזו. לבהות חזק יותר באותם שישה אריחים לא יגרום למילה להופיע. אני צריך פיזית להכריח את העיניים לחלק אחר של הלוח לפעמים.`,
      },
      {
        title: 'לאמן את העיניים לראות אשכולות',
        content: `זה החלק שדורש תרגול אמיתי, ובכנות אני עדיין משתפר בו. המטרה היא להפסיק לקרוא אותיות בודדות ולהתחיל לראות גושים.

כשאני רואה שׁ-ת על הלוח עכשיו, המוח שלי לא מעבד "שׁ... ת..." הוא פשוט הולך "שתיים שתייה שתול שתלן." זה אוטומטי. אותו דבר עם מ-ת, ב-ר, ה-ת, כ-ל. השילובים האלה כל כך נפוצים בעברית שהם צריכים להפעיל מפל מנטלי מיידי של מילים. זה לוקח זמן. לי לקח בערך 50 שעות משחק לפני שזה התחיל להרגיש טבעי.

איי תנועות זה זהב. שתיים-שלוש תנועות אחת ליד השנייה? זה הליבה של תריסר מילים. א-י ביחד? אישה, איש, אילן. ו-א ביחד? ואדי, ואלה. אני מתרגש כשאני רואה איי תנועות עכשיו. החברים שלי חושבים שזה מוזר.

צירופי עיצורים בתחילת מילים: בר, גר, דר, כל, מש, נש, פר, שמ, תר. כשמזהים אחד כזה, עוקבים קדימה. כמעט תמיד יש שם משהו.

ואז יש אזורים מתים. ק-צ אחד ליד השני. ז-ע-ק. לפעמים חלק מהלוח פשוט חסר תועלת. לזהות את זה מהר חוסך לכם 15 שניות של ניסיון ליצור מילה ממשהו שלא רוצה לשתף פעולה.`,
      },
      {
        title: 'תגישו קודם, תשאלו שאלות אחר כך',
        content: `אנשים מתווכחים על זה כל הזמן: להגיש מילה קצרה מיד או להמשיך לעקוב ולראות אם היא הופכת למילה ארוכה יותר?

התשובה שלי: פשוט תגישו. רואים גם? תקלידו. אז תבדקו אם גמישה או גמלון עובד. כבר נעלתם 2 נקודות. עכשיו אתם משחקים עם כסף של הבית.

הפעם היחידה שאני ממתין היא אם אני בשניות הראשונות ואני רואה בבירור מילה של 6+ אותיות נבנית. לקפוץ מגם (2 נק׳) לגמישות (6 נק׳) זה מספיק גדול כדי להצדיק את הסיכון. אבל זה נדיר. ובהחלט הפסדתי מילים בגלל חמדנות. יותר מפעם אחת ישבתי שם מנסה לעקוב אחרי מילה ארוכה ואיבדתי את עצמי, כשיכולתי כבר לקבל שלוש מילים קצרות בבנק.

במרובה משתתפים זה חשוב עוד יותר. שני שחקנים מקבלים קרדיט על אותה מילה, אבל מהירות משפיעה על שוברי שוויון. אל תשבו על מילים. תכניסו אותן.

אין שום תועלת בלהחזיק מילה. אפס. לשעון לא אכפת מהתוכניות שלכם.`,
      },
      {
        title: 'טעויות שעשיתי (כדי שאתם לא תצטרכו)',
        content: `ראיית מנהרה. זו הגדולה. פעם בזבזתי 20 שניות בניסיון לגרום למילה לעבוד על לוח שבו זה היה פיזית בלתי אפשרי. עשרים שניות! זה נצח. אם בהיתם באותה נקודה 5 שניות, עזבו. בלוח יש המון מילים. אל תתחתנו עם אחת.

דילוג על מילים קצרות. פעם חשבתי שמילים בנות 3 אותיות מתחת לכבודי. "אני מחפש את הגדולות." אסטרטגיה מעולה, אני. חוץ מזה שעשר מילים בנות 3 אותיות נותנות 20 נקודות ושתי מילים בנות 6 אותיות נותנות 10. כמות מנצחת. נאלצתי לבלוע את הגאווה בעניין הזה.

התעלמות מאלכסונים. זה מביך. יותר מדי זמן סרקתי בעיקר אופקית ואנכית. מסתבר שבערך 40% מהמילים משתמשות בחיבור אלכסוני אחד לפחות. השארתי כמעט חצי מהלוח על השולחן.

לא לקרוא את הלוח קודם. יש לוחות שטובעים בתנועות ורוצים שתמצאו המון מילים קצרות. אחרים יש בהם אשכולות עיצורים מוזרים שמסתירים כמה מפלצות. בדרך כלל אפשר להבין ב-10 השניות הראשונות עם איזה סוג לוח מתמודדים. תתאימו בהתאם. פעם שיחקתי כל לוח אותו דבר.

פאניקה בסוף. כשהטיימר מגיע ל-30 שניות, משהו במוח פשוט נשבר. קופאים או מתחילים ללחוץ על אריחים אקראיים כמו משוגעים. שניהם לא עוזרים. תחזרו לשלב 3. תסרקו אזורים שדילגתם. תגישו מהר. תישארו רגועים. (אני עדיין נכנס לפאניקה לפעמים. זה עבודה בתהליך.)`,
      },
    ],
    faq: [
      {
        question: 'מהי אסטרטגיית ההתחלה הטובה ביותר למצב קלאסי בלקסיקלאש?',
        answer: 'פינות קודם, תמיד. יש להן פחות חיבורים אז המוח באמת יכול לעקוב אחרי נתיבים בלי ללכת לאיבוד. אז שוליים, אז המרכז המבולגן. ותקדישו 15 שניות ראשונות רק להסתכל על הלוח לפני שמתחילים ללחוץ. זה מרגיש הפוך מהאינטואיציה אבל עובד.',
      },
      {
        question: 'איך עובד הניקוד במצב קלאסי של לקסיקלאש?',
        answer: 'זה פשוט אורך מילה פחות אחד. מילה בת 3 אותיות מקבלת 2 נקודות, בת 4 מקבלת 3, וככה הלאה. מילים ארוכות שוות יותר לכל מילה, אבל בכנות תקבלו יותר נקודות סה"כ מלהגיש המון מילים קצרות מאשר להתייסר על מילה ארוכה אחת.',
      },
      {
        question: 'איך אפשר למצוא מילים ארוכות יותר על הלוח?',
        answer: 'תפסיקו לחפש מילים שלמות ותתחילו לחפש חלקי מילים. רואים ה- או מ- על הלוח? עקבו קדימה. רואים -ים או -ות? עקבו אחורה. אז תנסו לגשר בין תחילית לסיומת דרך אריחי האמצע. ככה בעצם כל מילה של 6+ אותיות שאני מוצא מגיעה.',
      },
      {
        question: 'עדיף להגיש מילים קצרות או לחפש מילים ארוכות?',
        answer: 'שניהם, אבל קצרות קודם. תנעלו את הנקודות. עשר מילים בנות 3 אותיות (20 נקודות) מנצחות שלוש מילים בנות 5 אותיות (12 נקודות) כל יום. הנוסחה המנצחת היא זרם קבוע של מילים קצרות עם מילה ארוכה פה ושם כשהיא צצה.',
      },
    ],
    ctaText: 'יאללה לנסות את זה עכשיו',
    ctaLink: '/singleplayer',
    backToGuides: 'חזרה למדריכים',
  },
  sv: {
    title: 'Hur Jag Gick Från 30 Poäng till 200+ i Klassiskt Läge (Och Hur Du Också Kan)',
    subtitle: 'Riktiga strategier från någon som pinsamt nog loggat 500+ timmar stirrandes på bokstavsrutnät.',
    category: 'Strategi',
    readTime: '8 min läsning',
    authorName: 'Ordnörden',
    authorBio: 'Jag spelar Klassiskt läge alldeles för mycket. Mina vänner har slutat bjuda mig på spelkvällar. Värt det.',
    quickTips: [
      'Börja från hörnen. På riktigt. Jag ignorerade det här rådet i månader och mina poäng led av det.',
      'Träna ögonen att hitta O-, FOR-, UT- och -ING, -NING, -AR. När du väl ser dem kan du inte sluta.',
      'Skicka in korta ord först. Få poängen att ticka uppåt. De långa orden kommer.',
      'Tvinga dig att bara TITTA i 15 sekunder innan du rör något. Det känns fel. Gör det ändå.',
      'Vokal-konsonant-kluster är din bästa vän. Ett ensamt Q i ett hörn? Skippa det.',
      'Diagonaler! Jag missade säkert 30% av mina ord de första hundra timmarna för att jag glömde att de finns.',
      'Sista 30 sekunderna? Panik-läge. Skicka varje 3-bokstavsord dina ögon landar på. Ingen skam.',
    ],
    scoringTable,
    sections: [
      {
        title: 'Så Du Vill Bli Bra på Klassiskt Läge',
        content: `Här är grejen. Klassiskt läge ger dig ett rutnät, en klocka och ett vagt hopp om att hjärnan ska samarbeta. Du kopplar ihop intilliggande plattor för att stava ord. Horisontellt, vertikalt, diagonalt. Varje platta används en gång per ord, minst 3 bokstäver. Enkelt nog.

Poängsättning? Längre ord = mer poäng. Ett 3-bokstavsord ger 2 poäng, ett 8-bokstavsord ger 7. Det är bara ordlängd minus ett. Du fattade det förmodligen redan. Men att kunna poängsättningen är inte det som gör dig bra. Jag kunde poängsättningen i månader innan jag konsekvent slog 100 poäng.

Det som faktiskt spelar roll är hur du läser brädet. Jag brukade bara... stirra på det och hoppas att ord skulle dyka upp. Ibland gjorde de det! Oftast inte. Skillnaden mellan mig på 30 poäng och mig på 200+ var att lära sig skanna systematiskt istället för att slumpmässigt hoppas på det bästa.`,
      },
      {
        title: 'Hörn Först (Lita På Mig Här)',
        content: `OK så det här är den enskilt största förbättringen jag någonsin gjorde. Börja med hörnen.

Varför? Hornplattor rör bara 3 andra plattor. Centerplattor rör 8. Det betyder att när du börjar från ett hörn finns det mycket färre vägar att bli förvirrad av. Hjärnan kan faktiskt följa ordet utan att gå vilse. Jag brukade börja i mitten varje omgång och undra varför jag tappade bort mig mitt i ett ord.

Efter hörnen, ta kanterna. Kantplattor ansluter till 5 grannar. Inte lika lätt som hörn men mycket mer hanterbart än mitten. Många hoppar direkt från hörn till center. Gör inte det. Jag här hittat några av mina bästa ord med start från kanter, och i multiplayer ignorerar dina motståndare troligtvis dem också.

Centerplattor sist. De är en röra av kopplingar och möjligheter, vilket låter bra tills du är tre bokstäver in och inte minns åt vilket håll du var på väg. När du väl kommer till center här du redan internaliserat var allt är från dina horn- och kantsvep. Gör enorm skillnad.

Hela den här svepningen tar mig ungefär 30-40 sekunder nu. Tog över en minut när jag lärde mig.`,
      },
      {
        title: 'Prefix/Suffix-Tricket Som Ändrade Allt',
        content: `Jag lärde mig det här från att bli totalt förstörd av någon i multiplayer som hittade 6-bokstavsord som om det var ingenting. Efter matchen frågade jag vad de gjorde annorlunda. Svaret: "Jag letar inte efter ord. Jag letar efter orddelar."

Det klickade för mig. Istället för att skanna efter hela ord, skanna efter början: O-, FOR-, UT-, AV-, AN-. Sekunden du ser en sådan kombination på brädet, börja följa framåt. Vad kan komma efter FOR? FORD, FORM, FORT. Ögonen lär sig gora det automatiskt efter ett tag.

Samma sak funkar baklänges med suffix: -ING, -NING, -AR, -ER, -EN, -ANDE, -TION, -SKAP. Ser du ett -ING-kluster? Följ nu baklänges från det.

Det riktigt smarta draget är "brobyggande". Du ser FOR- på vänstra sidan av brädet och -ING på högra. Kan du koppla ihop dem genom mitten? Så hittas i princip varje 6+ bokstavsord. Det kändes omöjligt först. Nu gör jag det utan att tänka.

Och bokstaven S. Glöm aldrig S. Alla ord du redan hittat kan ha ett S precis intill sin sista bokstav. Gratis pluraler. Gratis verbformer. Jag får förmodligen 15-20% av mina poäng bara genom att lägga till S på ord jag redan skickat.`,
      },
      {
        title: 'Hur Jag Faktiskt Använder Min Tid (De 3 Faserna)',
        content: `Jag slösade så många omgångar innan jag fattade tempot. Antingen brände jag all tid på att jaga ett enda stort ord, eller så skickade jag hektiskt in små ord hela rundan och missade det bra. Det visar sig att det finns en rytm.

Första 30% av klockan - kör bara. Skicka allt. Ser du TRE? Skicka. Ser du AT? Skicka. Tänk inte på om ett 3-bokstavsord är "värt det." Det är det. Du bankar poäng och får en känsla för brädet samtidigt. Mina fingrar är i princip på autopilot under den här fasen.

Mellersta 40% - sakta nu ner. Det här är din jaktfas. Tillämpa prefix/suffix-grejen. Titta på kluster du inte rort. Prova konstiga diagonalvägar. Jag hittar de flesta av mina 5+ bokstavsord här. Det är den delen av spelet som faktiskt känns som ett pussel.

Sista 30% - öka farten igen. Gå tillbaka till hörn du bara glänste åt. Prova starta från plattor du inte använt. Skicka allt som ser ut som att det kanske är ett ord. Fel gissningar kostar dig knappt något, men ett ord du inte skickade kostar dig allt.

En sak jag fortfarande kämpar med: att fastna i mellanfasen. Om du inte hittat något nytt på 10 sekunder, FLYTTA. Att stirra hårdare på samma sex plattor får inte ett ord att dyka upp. Jag måste ibland fysiskt tvinga ögonen till en annan del av brädet.`,
      },
      {
        title: 'Att Träna Ögonen Att Se Kluster',
        content: `Det här är delen som tar riktig övning, och ärligt talat blir jag fortfarande bättre på det. Målet är att sluta läsa enskilda bokstäver och börja se bitar.

När jag ser ST på ett bräde nu processar inte min hjärna "S... T..." Den går bara "STEN STOL STOR STARK STALL." Det är automatiskt. Samma med AN, ER, IN, OR, EN. De här två-bokstavskombinationerna är så vanliga på svenska att de borde trigga en direkt mental kaskad av ord. Det tar tid. Tog mig kanske 50 timmars spelande innan det började kännas naturligt.

Vokalgrupper är guld. Två eller tre vokaler intill varandra? Det är karnan i ett dussin ord. A-I ihop? Tänk VAIT, AIR. O-R tillsammans? ORD, ORT, ORM. Jag blir exalterad när jag ser vokal-oar nu. Mina vänner tycker det är konstigt.

Konsonantblandningar i början av ord: BL, BR, DR, FL, FR, GL, GR, KL, KR, PL, PR, SK, SL, SM, SN, SP, ST, SV, TR. När du ser en, följ framåt. Något finns nästan alltid där.

Och så finns det döda zoner. QX intill varandra. ZJ. VV. Ibland är en del av brädet bara oanvandbar. Att känna igen det SNABBT sparar dig från att slösa 15 sekunder på att försöka gora "QXVZ" till ett ord. Allt på brädet vill inte samarbeta.`,
      },
      {
        title: 'Misstag Jag Gjorde (Så Du Slipper)',
        content: `Tunnelseende. Det här är det stora. Jag tillbringade en gång 20 sekunder med att försöka få UNDERBAR att funka på ett bräde där det var fysiskt omöjligt. Tjugo sekunder! Det är en evighet. Om du stirrat på samma ställe i 5 sekunder, lämna. Brådet här massor av ord. Gift dig inte med ett.

Skippa korta ord. Jag brukade tycka att 3-bokstavsord var under min värdighet. "Jag letar efter de stora." Bra strategi, jag. Förutom att tio 3-bokstavsord ger 20 poäng och två 6-bokstavsord ger 10. Volym vinner. Jag fick svälja min stolthet där.

Ignorera diagonaler. Den här är pinsam. Alldeles för länge skannade jag i princip bara horisontellt och vertikalt. Visar sig att ungefär 40% av alla ord använder minst en diagonal koppling. Jag lämnade nästan halva brädet på bordet.

Att inte läsa brädet först. Visa bräden dränks i vokaler och vill att du hittar massor av korta ord. Andra här konstiga konsonantkluster som gömmer några mönster. Du kan oftast avgöra på 10 sekunder vilken typ av bräde du här. Anpassa dig. Jag brukade spela varje bräde på samma sätt.

Panik på slutet. När timern visar 30 sekunder går något sönder i hjärnan. Du fryser eller börjar vilt trycka på slumpmassiga plattor. Ingetdera hjälper. Fall tillbaka till fas 3. Svep områden du hoppat över. Skicka snabbt. Håll lugnet. (Jag får fortfarande panik ibland. Det är ett pågående arbete.)`,
      },
    ],
    faq: [
      {
        question: 'Vad är den bästa startstrategin för Klassiskt läge i LexiClash?',
        answer: 'Hörn först, alltid. De här färre kopplingar så hjärnan kan faktiskt följa vägar utan att gå vilse. Sen kanter, sen den roriga mitten. Och lägg 15 sekunder på att bara titta på brädet innan du börjar trycka. Det känns bakvänt men det funkar.',
      },
      {
        question: 'Hur fungerar poängsättningen i LexiClash Klassiskt läge?',
        answer: 'Det är ordlängd minus ett, helt enkelt. Ett 3-bokstavsord ger 2 poäng, 4 bokstäver ger 3, och så vidare uppåt. Längre ord ger mer per ord, men ärligt talat får du mer totalt genom att skicka en massa korta ord än att pina dig över ett enda långt.',
      },
      {
        question: 'Hur hittar jag längre ord på rutnatet?',
        answer: 'Sluta leta efter hela ord och börja leta efter orddelar. Ser du O- eller FOR- på brädet? Följ framåt. Ser du -ING eller -NING? Följ baklänges. Sen försök bygga en bro från prefix till suffix genom mellanplattorna. I princip varje 6+ bokstavsord jag hittar kommer från den tekniken.',
      },
      {
        question: 'Är det bättre att skicka korta ord eller leta efter långa ord?',
        answer: 'Bada, men korta ord först. Läs in poängen. Tio 3-bokstavsord (20 poäng) slår tre 5-bokstavsord (12 poäng) varje gång. Vinnarstrategin är en stadig ström av korta ord med något långt inslanggt när du ser det.',
      },
    ],
    ctaText: 'Testa det här nu direkt',
    ctaLink: '/singleplayer',
    backToGuides: 'Tillbaka till guider',
  },
  ja: {
    title: '僕がクラシックモードで30点から200点超えになるまでにやったこと',
    subtitle: '文字グリッドを500時間以上見つめてきた人間のリアルな攻略法。恥ずかしいけど本当の話です。',
    category: '攻略',
    readTime: '8分で読める',
    authorName: 'ワードオタク',
    authorBio: 'クラシックモードをやりすぎて友達にゲーム会に誘われなくなりました。後悔はしてません。',
    quickTips: [
      '角から始めよう。マジで。僕はこのアドバイスを何ヶ月も無視してスコアが伸び悩みました。',
      'UN-、RE-、PRE-、-ING、-TION、-EDを見つける目を鍛えよう。一度見えるようになったら、もう戻れない。',
      '短い単語をガンガン入力。まずスコアを動かす。長い単語はそのうち見つかります。',
      '最初の15秒、何も触らずにボードを「見る」だけ。違和感あるけど、やってみて。',
      '母音と子音のクラスターがすべて。角にポツンとある使いにくい文字？無視でOK。',
      '対角線！最初の100時間くらい、対角線を忘れてて単語の30%くらい見逃してました。恥ずかしい。',
      '残り30秒？パニックモード発動。目に入った3文字の単語を片っ端から送信。プライドは捨てよう。',
    ],
    scoringTable,
    sections: [
      {
        title: 'クラシックモードで強くなりたいあなたへ',
        content: `正直に言うと、クラシックモードってシンプルです。グリッドがあって、時計があって、あとは脳みそが協力してくれることを祈るだけ。隣接するタイルをつないで単語を作る。水平、垂直、対角線。各タイルは1つの単語につき1回だけ、最低3文字。ルールはこれだけ。

スコアリング？長い単語ほど高得点。3文字で2ポイント、8文字で7ポイント。要するに文字数マイナス1。たぶんもう分かってますよね。でも、スコアリングを知っていることと実際に強いことは全然別の話なんです。僕はスコアリングを理解してから安定して100点を超えるまで、何ヶ月もかかりました。

本当に差がつくのは「ボードの読み方」です。昔の僕はただグリッドをぼーっと眺めて、単語が浮かんでくるのを待ってました。たまに見つかることもあった！でもだいたい見つからない。30点の僕と200点超えの僕の違いは、ランダムに祈るのをやめて、体系的にスキャンすることを覚えたことでした。`,
      },
      {
        title: '角から始めろ（これだけは信じて）',
        content: `これは僕のゲームを一番変えたたった1つのコツです。角から始める。

なぜか？角のタイルは3つのタイルとしかつながっていません。中央は8つ。つまり角から始めると、脳が混乱するパスが圧倒的に少ない。迷子にならずに単語をたどれます。僕は毎回ド真ん中からスタートしていて、なんで途中で迷うんだろうって思ってました。そりゃ迷うわ。

角の次は辺。辺のタイルは5つの隣接タイルとつながっています。角ほど楽じゃないけど、中央よりずっとマシ。角から一気に中央に飛ぶ人が多いけど、やめた方がいいです。辺から始まる良い単語、けっこう見つかるんですよ。マルチプレイヤーだと対戦相手もたぶん辺を無視してるし。

中央は最後。接続が多すぎてカオスです。可能性は多いけど、3文字目で「あれ、どっちに進んでたっけ？」ってなります。角と辺のスキャンが終わってからなら、ボードの配置が頭に入ってるので中央もずっと読みやすくなります。

このスキャン全体、今の僕だと30-40秒。覚えたての頃は1分以上かかってました。`,
      },
      {
        title: '接頭辞と接尾辞のコツ ― これで世界が変わった',
        content: `このテクニックは、マルチプレイヤーで6文字の単語をスラスラ見つける人にボコボコにされた後に教えてもらいました。試合後に「何が違うの？」って聞いたら、「単語を探してない。単語のパーツを探してる」って。

これが僕の中でカチッとハマりました。完成した単語じゃなくて、始まりのパーツを探す。UN-、RE-、PRE-、OUT-、OVER-。ボード上でこの組み合わせを見つけた瞬間、前方にたどる。UNの後に何が来る？UNDO、UNIT、UNDER。慣れると目が自動的にやってくれるようになります。

逆方向も同じ。接尾辞：-ING、-ED、-ER、-TION、-LY、-NESS、-ABLE、-MENT。-INGのクラスターを発見？そこから逆方向にたどる。

本当の上級技は「ブリッジビルディング」。ボードの左にRE-があって、右に-INGがある。中央を通ってつなげられるか？6文字以上の単語はほぼこの方法で見つかります。最初は不可能に感じたけど、今は無意識でやってます。

あと、Sの文字。絶対忘れないで。見つけた単語の最後の文字の隣にSがあるかもしれない。タダで複数形ゲット。タダで動詞の活用ゲット。僕のポイントの15-20%はたぶんSを付け足すだけで稼いでます。`,
      },
      {
        title: '僕の時間の使い方（3つのフェーズ）',
        content: `ペース配分を覚える前、本当にたくさんのゲームを無駄にしました。1つの大きな単語を探すのに全時間使っちゃったり、逆に小さい単語ばっかり入力して良い単語を全部逃したり。リズムがあるんです。

最初の30% - とにかく行く。全部送信。THEが見えた？送信。ATが見えた？送信。3文字の単語が「意味あるの？」なんて考えない。意味ある。ポイントを貯めながら、同時にボードの地図を頭に作ってるんです。この段階、僕の指はほぼオートパイロット。

中間の40% - ここでペースを落とす。狩りの時間です。接頭辞と接尾辞のテクニックを使う。まだ触ってないクラスターを見る。変な対角線のパスを試す。5文字以上の単語はだいたいここで見つかります。パズルっぽくて一番楽しい時間。

最後の30% - また加速。最初に軽くしか見なかった角に戻る。まだ使ってないタイルから始めてみる。単語っぽいものはとりあえず送信。間違えてもペナルティはほぼゼロだけど、送信しなかった単語はポイントゼロ。

今でも苦手なこと：中間フェーズにハマること。10秒間何も見つからなかったら、移動。同じ6つのタイルをもっと睨んでも単語は出てきません。物理的に目を別の場所に動かさないとダメなときもあります。`,
      },
      {
        title: 'クラスターを「見る」目を鍛える',
        content: `ここは本当に練習が必要で、正直まだ上達中です。目標は、1文字ずつ読むのをやめて、かたまりで見ること。

今の僕がボードでTHを見たとき、脳は「T...H...」とは処理しません。「THE THEN THEM THIN THIS THAT」って一気に浮かぶ。自動です。IN、ER、AN、ON、ST、REも同じ。この2文字の組み合わせは英語で超頻出なので、見た瞬間に単語が連鎖的に思い浮かぶようになるべき。時間はかかります。僕は50時間くらいプレイしてやっと自然になってきました。

母音のクラスターは宝です。2-3個の母音が隣り合ってる？それだけで十数個の単語の核になる。A-Iが一緒？AID、AIR、AIM、RAIN、MAIN、PAIR。O-Uが一緒？OUT、OUR、POUR、TOUR、FOUR。母音の島を見つけるとテンション上がります。友達には変だと思われてますけど。

単語の頭に来る子音ブレンド：BL、BR、CL、CR、DR、FL、FR、GL、GR、PL、PR、SC、SH、SK、SL、SM、SN、SP、ST、SW、TR。見つけたら前にたどる。だいたい何かあります。

そしてデッドゾーン。QとXが隣り合ってる。ZとJ。VとV。ボードの一部はどうしようもないときがある。それを素早く見抜くことで、「QXVZ」から単語を作ろうとして15秒無駄にするのを防げます。`,
      },
      {
        title: '僕がやらかした失敗（あなたはやらないで）',
        content: `トンネルビジョン。これが一番デカい。一度、物理的に不可能なボードでBEAUTIFULを作ろうとして20秒費やしたことがあります。20秒ですよ！永遠に等しい。5秒以上同じ場所を見てたら、離れる。ボードには大量の単語がある。1つの単語と結婚しない。

短い単語をバカにする。昔は3文字の単語なんて「僕の格じゃない」と思ってました。「大物を狙ってるんだ」って。カッコいい戦略ですね、過去の僕。でも3文字の単語10個で20ポイント、6文字の単語2個で10ポイント。数が勝つ。プライドを飲み込みました。

対角線を無視する。これは恥ずかしい。ずっと水平と垂直だけスキャンしてました。実は見つかる単語の約40%が最低1つの対角線接続を使ってるんです。ボードのほぼ半分をテーブルの上に残してた。

ボードを読まない。母音だらけで短い単語をたくさん探すべきボードもあれば、変な子音クラスターの中にモンスター級の単語が隠れてるボードもある。最初の10秒でだいたいどっちか分かります。昔の僕はどのボードも同じやり方でプレイしてました。

最後のパニック。残り30秒になると脳が壊れる。フリーズするか、ランダムにタイルを連打し始める。どっちも無意味。フェーズ3に戻る。飛ばした場所をスキャン。高速で送信。落ち着く。（今でもたまにパニックになります。成長の途中です。）`,
      },
    ],
    faq: [
      {
        question: 'LexiClashのクラシックモードで一番いいスタート戦略は？',
        answer: '角から。これは絶対です。角は接続が少ないから、脳がパスを追いやすい。そのあと辺、最後にカオスな中央。あと最初の15秒はボードを見るだけにする。直感に反するけど、効きます。',
      },
      {
        question: 'LexiClashクラシックモードのスコアリングってどう計算されるの？',
        answer: '文字数マイナス1、それだけです。3文字で2ポイント、4文字で3ポイント。長い単語の方が1語あたりの得点は高いけど、正直なところ、短い単語をたくさん送信する方が合計点は伸びることが多いです。',
      },
      {
        question: 'グリッドで長い単語を見つけるコツは？',
        answer: '完成した単語を探すのをやめて、単語のパーツを探すこと。UN-やRE-を見つけたら前にたどる。-INGや-TIONを見つけたら後ろにたどる。そして接頭辞と接尾辞を中央のタイルでつなぐ。僕が見つける6文字以上の単語は、ほぼ全部このテクニックから生まれてます。',
      },
      {
        question: '短い単語と長い単語、どっちを優先すべき？',
        answer: '両方だけど、短い方が先。まずポイントを確保する。3文字の単語10個（20ポイント）は5文字の単語3個（12ポイント）に毎回勝ちます。短い単語の安定した流れに、たまに長い単語を混ぜるのが勝利の方程式です。',
      },
    ],
    ctaText: 'さっそく試してみよう',
    ctaLink: '/singleplayer',
    backToGuides: 'ガイドに戻る',
  },
  es: {
    title: 'Como pase de 30 puntos a 200+ en modo Clasico (y como tu tambien puedes)',
    subtitle: 'Estrategias reales de alguien que lleva vergonzosamente mas de 500 horas mirando cuadriculas de letras.',
    category: 'Estrategia',
    readTime: '8 min de lectura',
    authorName: 'El Nerd de las Palabras',
    authorBio: 'Juego modo Clasico demasiado. Mis amigos ya no me invitan a noches de juegos por eso. Lo vale.',
    quickTips: [
      'Empieza por las esquinas. En serio. Yo ignore este consejo durante meses y mi puntaje lo pago caro.',
      'Entrena tus ojos para ver DES-, RE-, PRE- y -CION, -ANDO, -MENTE. Una vez que los ves, no puedes dejar de verlos.',
      'Mete palabras cortas primero. Que el marcador vaya subiendo. Las largas ya vendran.',
      'Obligate a solo MIRAR el tablero 15 segundos antes de tocar nada. Se siente mal. Hazlo igual.',
      'Los grupos vocal-consonante son tu pan de cada dia. Una Q sola en una esquina? Pasala de largo.',
      'Diagonales! Yo perdi como el 30% de mis palabras las primeras cien horas porque se me olvidaba que existen.',
      'Ultimos 30 segundos? Modo panico. Manda toda palabra de 3 letras que veas. Sin verguenza.',
    ],
    scoringTable,
    sections: [
      {
        title: 'Asi que quieres ser bueno en modo Clasico',
        content: `A ver, el asunto es asi. El modo Clasico te da una cuadricula, un reloj, y la vaga esperanza de que tu cerebro coopere. Conectas fichas adyacentes para formar palabras. Horizontal, vertical, diagonal. Cada ficha se usa una vez por palabra, minimo 3 letras. Bastante simple.

La puntuacion? Palabras mas largas = mas puntos. Una de 3 letras te da 2 puntos, una de 8 te da 7. Es la longitud menos uno. Seguro ya lo habias deducido. Pero saber la puntuacion no es lo que te hace bueno. Yo sabia la puntuacion durante meses antes de superar los 100 puntos consistentemente.

Lo que de verdad importa es como lees el tablero. Yo antes simplemente... lo miraba fijamente esperando que las palabras aparecieran. A veces funcionaba! La mayoria no. La diferencia entre yo con 30 puntos y yo con 200+ fue aprender a escanear sistematicamente en vez de esperar que la suerte me salvara.`,
      },
      {
        title: 'Esquinas primero (conffia en mi)',
        content: `OK, esta fue la mejora mas grande que hice en mi juego. Empieza por las esquinas.

Por que? Las fichas de esquina solo tocan 3 fichas. Las del centro tocan 8. Eso significa que cuando empiezas desde una esquina, hay muchos menos caminos para confundirte. Tu cerebro puede trazar la palabra sin perderse. Yo antes empezaba justo en el centro cada partida y me preguntaba por que perdia el hilo a mitad de palabra.

Despues de las esquinas, ve a los bordes. Las fichas de borde se conectan a 5 vecinos. No tan facil como las esquinas pero mucho mas manejable que el centro. Mucha gente salta directo de esquinas al centro. No lo hagas. Yo he encontrado algunas de mis mejores palabras empezando desde bordes, y en multijugador tus rivales probablemente los estan ignorando.

Fichas del centro al final. Son un desastre de conexiones y posibilidades, lo cual suena genial hasta que llevas tres letras y no recuerdas en que direccion ibas. Para cuando llegas al centro, ya internalizaste donde esta todo despues de tus pasadas por esquinas y bordes. Cambia todo.

Todo este barrido me toma unos 30-40 segundos ahora. Antes me tardaba mas de un minuto cuando lo estaba aprendiendo.`,
      },
      {
        title: 'El truco de prefijos/sufijos que me cambio la vida',
        content: `Esto lo aprendi despues de que alguien me destruyera en multijugador encontrando palabras de 6 letras como si nada. Despues del juego le pregunte que hacia diferente. Su respuesta: "No busco palabras. Busco partes de palabras."

Ahi me cayo el veinte. En vez de buscar palabras completas, busca comienzos: DES-, RE-, PRE-, IN-, CON-. En el momento que ves una de esas combinaciones en el tablero, empieza a trazar hacia adelante. Que puede venir despues de DES? DESHACER, DESPERTAR, DESTINO. Tus ojos aprenden a hacer esto automaticamente con el tiempo.

Lo mismo funciona al reves con sufijos: -CION, -ANDO, -MENTE, -ABLE, -ADO, -DAD. Ves un grupo -CION? Ahora traza hacia atras.

El movimiento galaxia-cerebro es lo que yo llamo construir puentes. Ves DES- en un lado del tablero y -CION en el otro. Puedes conectarlos por el medio? Asi es como se encuentran basicamente todas las palabras de 6+ letras. Al principio parecia imposible. Ahora lo hago sin pensar.

Ah, y la letra S. Nunca olvides la S. Cualquier palabra que ya encontraste podria tener una S sentada justo al lado de su ultima letra. Plurales gratis. Verbos gratis. Yo saco como el 15-20% de mis puntos solo de agregar S a palabras que ya mande.`,
      },
      {
        title: 'Como realmente paso mi tiempo (las 3 fases)',
        content: `Desperdicie tantas partidas antes de entender el ritmo. O gastaba todo mi tiempo cazando una palabra enorme, o mandaba palabras diminutas como loco toda la ronda y me perdia lo bueno. Resulta que hay un ritmo.

Primer 30% del reloj - simplemente ve. Manda todo. Ves SOL? Manda. Ves MAS? Manda. No pienses si una palabra de 3 letras "vale la pena." Vale. Estas acumulando puntos y reconociendo el terreno al mismo tiempo. Mis dedos van basicamente en piloto automatico durante esta fase.

40% del medio - ahora baja la velocidad. Esta es tu fase de caza. Aplica lo de prefijos/sufijos. Mira grupos que no hayas tocado. Prueba caminos diagonales raros. Aqui encuentro la mayoria de mis palabras de 5+ letras. Es la parte del juego que realmente se siente como un rompecabezas.

Ultimo 30% - acelera de nuevo. Vuelve a esquinas que solo miraste de reojo. Prueba empezar desde fichas que no hayas usado. Manda cualquier cosa que parezca palabra. Los intentos fallidos casi no te cuestan, pero una palabra que no mandaste te cuesta todo.

Algo con lo que todavia lucho: quedarme atascado en la fase del medio. Si no has encontrado nada nuevo en 10 segundos, MUEVETE. Mirar mas intensamente las mismas seis fichas no va a hacer que aparezca una palabra. A veces tengo que forzar fisicamente mis ojos a otra parte del tablero.`,
      },
      {
        title: 'Entrenar tus ojos para ver grupos',
        content: `Esta es la parte que requiere practica real, y honestamente sigo mejorando. La meta es dejar de leer letras individuales y empezar a ver bloques.

Cuando veo AN en un tablero ahora, mi cerebro no procesa "A... N..." Simplemente va "ANTE ANDAR ANGEL ANCHO ANIMO." Es automatico. Igual con ER, EN, AR, ST, RE. Estas combinaciones de dos letras son tan comunes en espanol que deberian disparar una cascada mental instantanea de palabras. Eso toma tiempo. Me tomo como 50 horas de juego antes de que empezara a sentirse natural.

Las islas de vocales son oro. Dos o tres vocales juntas? Eso es el nucleo de una docena de palabras. A-E juntas? CAER, NACER, HACER, TRAER. I-O juntas? RIO, FRIO, SITIO, LIRIO. Me emociono cuando veo islas de vocales ahora. Mis amigos dicen que eso es raro.

Combinaciones de consonantes al inicio de palabras: BL, BR, CL, CR, DR, FL, FR, GL, GR, PL, PR, TR. Cuando encuentres una, traza hacia adelante. Casi siempre hay algo ahi.

Y luego estan las zonas muertas. QX juntas. ZJ. VV. A veces un pedazo del tablero simplemente no sirve. Reconocer eso RAPIDO te ahorra 15 segundos que habrias gastado intentando hacer que "QXVZ" sea una palabra. No todo en el tablero quiere cooperar.`,
      },
      {
        title: 'Manda primero, pregunta despues',
        content: `La gente discute esto todo el tiempo: deberia mandar una palabra corta inmediatamente o seguir trazando para ver si se convierte en una mas larga?

Mi respuesta: solo manda. Ves SOL? Metelo. Despues checa si SOLAR o SOLTAR funciona. Ya aseguraste tus 2 puntos. Ahora estas jugando con dinero de la casa.

La unica vez que me detengo es si estoy en los primeros segundos y claramente veo una palabra de 6+ letras formandose. Pasar de SOL (2 pts) a SOLEDAD (6 pts) es un salto lo suficientemente grande para justificar el riesgo. Pero eso es raro. Y definitivamente he perdido palabras por ser ambicioso. Mas de una vez me quede ahi tratando de trazar EXTRAORDINARIO y perdi el hilo, cuando podria haber tenido EXTRA, TREN y RIO ya en el banco.

En multijugador esto importa aun mas. Ambos jugadores reciben credito por la misma palabra, pero la velocidad afecta desempates. No te sientes sobre las palabras. Mandalas.

No hay ningun beneficio en guardar una palabra. Ninguno. Al reloj no le importan tus planes.`,
      },
      {
        title: 'Errores que yo cometi (para que tu no tengas que)',
        content: `Vision de tunel. Este es el grande. Una vez pase 20 segundos intentando armar EXTRAORDINARIO en un tablero donde era fisicamente imposible. Veinte segundos! Eso es una eternidad. Si llevas 5 segundos mirando el mismo punto, vete. El tablero tiene toneladas de palabras. No te cases con una.

Ignorar palabras cortas. Yo antes pensaba que las de 3 letras estaban por debajo de mi. "Estoy buscando las grandes." Genial estrategia, yo del pasado. Excepto que diez palabras de 3 letras te dan 20 puntos y dos de 6 letras te dan 10. El volumen gana. Tuve que tragarme el orgullo con esa.

Olvidar las diagonales. Esta me da verguenza. Durante demasiado tiempo basicamente solo escaneaba horizontal y verticalmente. Resulta que como el 40% de las palabras encontrables usan al menos una conexion diagonal. Estaba dejando casi la mitad del tablero en la mesa.

No leer el tablero primero. Algunos tableros estan ahogados en vocales y quieren que encuentres muchas palabras cortas. Otros tienen grupos de consonantes raros que esconden unos cuantos monstruos. Generalmente puedes saber en los primeros 10 segundos que tipo de tablero tienes. Ajustate. Yo antes jugaba cada tablero igual.

Entrar en panico al final. Cuando el reloj llega a 30 segundos, algo en tu cerebro se rompe. Te congelas o empiezas a tocar fichas al azar como loco. Ninguna ayuda. Vuelve a la fase 3. Barre areas que saltaste. Manda rapido. Manten la calma. (Yo todavia entro en panico a veces. Es un trabajo en progreso.)`,
      },
    ],
    faq: [
      {
        question: 'Cual es la mejor estrategia inicial para el modo Clasico en LexiClash?',
        answer: 'Esquinas primero, siempre. Tienen menos conexiones asi que tu cerebro puede trazar caminos sin perderse. Luego bordes, luego el caos del centro. Y dedica los primeros 15 segundos a solo mirar el tablero antes de empezar a tocar. Se siente contraproducente pero funciona.',
      },
      {
        question: 'Como funciona la puntuacion en el modo Clasico de LexiClash?',
        answer: 'Es la longitud de la palabra menos uno. Una de 3 letras te da 2 puntos, una de 4 te da 3, y asi hasta arriba. Las palabras largas puntuan mas por palabra, pero honestamente vas a sacar mas puntos totales mandando un monton de cortas que agonizando por una larga.',
      },
      {
        question: 'Como puedo encontrar palabras mas largas en la cuadricula?',
        answer: 'Deja de buscar palabras completas y empieza a buscar partes de palabras. Ves DES- o RE- en el tablero? Traza hacia adelante. Ves -CION o -ANDO? Traza hacia atras. Luego intenta conectar un prefijo con un sufijo a traves de las fichas del medio. Basicamente asi encuentro todas mis palabras de 6+ letras.',
      },
      {
        question: 'Es mejor enviar palabras cortas o buscar palabras largas?',
        answer: 'Las dos, pero cortas primero. Asegura esos puntos. Diez palabras de 3 letras (20 puntos) le ganan a tres de 5 letras (12 puntos) siempre. La estrategia ganadora es un flujo constante de palabras cortas con alguna larga mezclada cuando la veas.',
      },
    ],
    ctaText: 'Ve a probar esto ahora mismo',
    ctaLink: '/singleplayer',
    backToGuides: 'Volver a guias',
  },
};
