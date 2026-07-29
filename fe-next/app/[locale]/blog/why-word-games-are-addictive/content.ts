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
    title: "Why You Can't Stop Playing Word Games (And Why Your Brain Doesn't Want You To)",
    subtitle: 'The science behind word game addiction — dopamine, flow states, and the psychology that keeps you coming back for "just one more round."',
    category: 'Psychology',
    readTime: '8 min read',
    authorName: 'Ohad Fisher',
    authorBio: 'Self-diagnosed word game addict, psychology enthusiast, and the person who whispers "just one more round" at 2am like a mantra.',
    sections: [
      {
        content: `It was 2:17am on a Wednesday. I had work in five hours. My phone screen was the only light in the room, and I was hunched over a 4x4 grid of letters like Gollum cradling the One Ring.

"Just one more round," I whispered to absolutely no one.

That was four rounds ago.

If this sounds familiar, congratulations — you're not broken. You're experiencing one of the most elegantly engineered psychological loops that exists in gaming. Word games tap into something deep in how our brains are wired, and the result is a kind of compulsion that feels different from doomscrolling Instagram or binge-watching Netflix.

It feels... productive? Wholesome? Like you're doing something good for yourself even as your alarm clock inches closer?

I wanted to understand why. Not the vague "it's fun" explanation, but the actual neuroscience behind why word games are so absurdly hard to put down.`,
      },
      {
        title: 'The dopamine hit: your brain on variable rewards',
        content: `Dopamine is the obvious starting point. You've probably heard it called the "pleasure chemical," but that's not quite right. Dopamine is more accurately the anticipation chemical. It spikes not when you get the reward, but when you expect one might be coming.

This is why slot machines work. Psychologists call this a "variable ratio reinforcement schedule" — the most powerful conditioning pattern known to behavioral science.

Now think about what happens when you scan a grid of letters. You see a cluster: T, R, A, I... could that be TRAIN? You trace the path... N is right there. Five letters. Dopamine spike.

The devious part: you never know when you'll find the next word. Sometimes they come in rapid clusters, BAT, CAT, CHAT, boom boom boom. Other times you stare for thirty seconds seeing nothing, and then CATASTROPHE appears diagonally and your brain lights up like Times Square.

This unpredictability is the variable ratio schedule in action. Your brain learns that rewards come, but not on a predictable schedule, so it keeps you in a state of constant, low-level anticipation. Robert Sapolsky's work at Stanford showed that dopamine levels actually increase more when rewards are uncertain than when they're guaranteed.

Evolution did not prepare us for 4x4 letter grids.`,
      },
      {
        title: 'Flow state: when time disappears',
        content: `Ever looked up from a word game and realized an hour has passed? That's not a metaphor. Time literally feels different when you're in flow.

Mihaly Csikszentmihalyi identified flow state in the 1970s as a state of complete absorption in an activity. You lose track of time, your sense of self fades, and everything else drops away.

Flow requires a very specific balance: the challenge must be just hard enough. Too easy and you get bored. Too hard and you get frustrated. The sweet spot is where your skill level barely meets the difficulty.

Word games are accidentally perfect flow machines. A 4x4 grid contains hundreds of possible words, ranging from trivially easy (AT, TO, IN) to fiendishly difficult (that eight-letter word hiding in a spiral pattern). At any moment, you're operating at exactly the edge of your ability. The easy words keep you feeling competent. The hard words keep you challenged.

This is why a five-minute round can feel like thirty seconds. Your prefrontal cortex — the part responsible for time perception — gets recruited for the word-finding task instead. There literally aren't enough neural resources left over to track time.

The flow state is also why "just one more round" is so dangerous. Each round is short enough that the flow state doesn't fully dissipate between rounds. You're still riding the wave when the next grid appears.`,
      },
      {
        title: "The Zeigarnik effect: why unfinished puzzles haunt you",
        content: `In the 1920s, Lithuanian psychologist Bluma Zeigarnik noticed something odd: waiters could remember complex orders perfectly while serving, but forgot them completely once the food was delivered. Uncompleted tasks stick in your memory. Completed ones get cleared out.

Word games exploit this ruthlessly. When your round ends and the game shows you all the words you missed, something happens. Those missed words create open loops. Your brain flags them as unfinished business.

"QUANTUM was on that board?! I saw the Q-U-A! Why didn't I see it?!"

That nagging feeling is the Zeigarnik Effect. Your brain has filed an incomplete task and it really wants to close that loop. The most direct way to close it? Play another round and try to find words like that next time.

Game designers know this. The end-of-round screen showing missed words isn't informational. It's a psychological hook. Every word you missed is an open loop. Every open loop is a reason to play again.

This is not normal behavior. But it IS normal neuroscience.`,
      },
      {
        title: 'Social comparison: the leaderboard effect',
        content: `Humans are comparison machines. Festinger's social comparison theory from 1954 argues that we evaluate ourselves primarily by comparing to others.

Word games with leaderboards plug directly into this circuit. It's not enough to find 30 words. You need to find more than your friend. You need to climb from 7th place to 5th. Competition activates the ventral striatum, the same reward center that responds to food, money, and romantic attraction. Beating someone on a leaderboard triggers a genuine neurochemical reward.

So you're getting two dopamine pathways activated simultaneously: one from the variable-ratio word-finding loop, and one from the social competition. A dopamine sandwich.

Daily challenges amplify this further. Everyone playing the same board on the same day creates a shared experience and a comparison framework that makes it irresistible to share and compete.`,
      },
      {
        title: 'The "aha" moment: why finding words feels so good',
        content: `There's a specific instant when you spot a word, especially a long one, where everything clicks. Beeman and Kounios showed using EEG and fMRI that insight moments are preceded by a burst of gamma-wave activity in the right temporal lobe, followed by a rush of activity in the reward centers — the same areas activated by jokes, pleasant surprises, and sudden understanding.

Finding a word doesn't just feel like a reward. Your brain processes it the same way it processes getting a joke or suddenly understanding something confusing. It's an insight, and insights are inherently pleasurable.

This is why finding a long, unexpected word feels categorically different from finding a short, obvious one. Finding "AT" is recognition. Finding "ATMOSPHERE" spiraling across the board is insight. Insight is neurochemically rewarded in a way that mere recognition isn't.

The pleasure is also amplified by what psychologists call the "generation effect." Words you actively discover are encoded more strongly in memory than words you passively read. Your brain rewards you for generating the information rather than just receiving it.`,
      },
      {
        title: 'When "addictive" becomes a problem',
        content: `Variable rewards, flow states, open loops, social pressure, insight rewards. These are genuinely powerful psychological mechanisms. The same mechanisms that make gambling addictive, social media compulsive, and mobile games predatory.

So when does word game "addiction" cross a line? Adam Alter draws it at interference. An activity becomes problematic when it consistently interferes with things you value more: sleep, relationships, work, physical health. Playing word games for an hour because you're enjoying yourself? Fine. Playing until 3am when you have an early meeting because you can't stop? Worth examining.

The good news is that word games are structurally less dangerous than many alternatives. Rounds are short with natural stopping points. There's no infinite scroll. There's no social media feed of curated envy. There's no financial mechanism.

But the Zeigarnik Effect can create compulsive play patterns in some people. If you find that missed words genuinely bother you for hours, or if you feel anxious when you can't play your daily challenge, it's worth being honest with yourself about whether the habit is serving you.`,
      },
      {
        title: 'Why this "addiction" might actually be good for you',
        content: `Compared to almost everything else competing for your attention, word game "addiction" is remarkably benign. Possibly even beneficial.

Doomscrolling social media: cortisol spikes from outrage content, social comparison anxiety, passive consumption, no cognitive challenge.

Word games: active cognitive engagement across multiple brain regions, vocabulary reinforcement, working memory exercise, strategic thinking, manageable dopamine cycles with natural endpoints.

A 2022 trial published in NEJM Evidence found that people who did crosswords for 78 weeks showed less cognitive decline than those using commercial brain training apps. The word game group actually improved on some measures while the app group stayed flat.

Your brain has been hijacked by dopamine loops, flow states, and open cognitive loops. But unlike most things that hijack your brain in 2026, this one is actually exercising it at the same time.

You're addicted to something that's probably making you sharper.

It's late. I should stop. But there's a seven-letter word hiding in that grid and my brain won't let me sleep until I find it.`,
      },
      {
        content: `Sources & Further Reading:
- Sapolsky, R. — Dopamine and variable ratio reinforcement: Stanford lecture series on behavioral biology
- Csikszentmihalyi, M. — Flow: The Psychology of Optimal Experience (1990)
- Zeigarnik, B. — On finished and unfinished tasks (1927)
- Festinger, L. — A Theory of Social Comparison Processes (1954)
- Beeman, M. & Kounios, J. — The Aha! Moment: The cognitive neuroscience of insight (2009)
- Alter, A. — Irresistible: The Rise of Addictive Technology (2017)
- NEJM Evidence (2022) — Columbia & Duke University crossword trial (107 participants, 78 weeks)`,
      },
    ],
    backToBlog: 'Back to Blog',
    tryDaily: 'Daily Challenge',
    practice: 'Practice',
  },
  he: {
    title: 'למה אתם לא מצליחים להפסיק לשחק משחקי מילים (ולמה המוח שלכם לא רוצה שתפסיקו)',
    subtitle: 'המדע מאחורי ההתמכרות למשחקי מילים — דופמין, מצבי זרימה, והפסיכולוגיה ששומרת אתכם ב"עוד סיבוב אחד."',
    category: 'פסיכולוגיה',
    readTime: 'זמן קריאה: 9 דקות',
    authorName: 'Ohad Fisher',
    authorBio: 'מכור מאובחן-עצמית למשחקי מילים, חובב פסיכולוגיה, והבן אדם שלוחש "עוד סיבוב אחד" בשתיים בלילה כמו מנטרה.',
    sections: [
      {
        content: `היה זה 2:17 בלילה, אמצע שבוע. בעוד חמש שעות אני צריך להיות בעבודה. מסך הטלפון היה האור היחיד בחדר, ואני שכבתי כפוף מעל רשת אותיות 4x4 כמו גולום שמחבק את הטבעת.

"עוד סיבוב אחד," לחשתי לאף אחד בפרט.

זה היה ארבעה סיבובים אחורה.

אם זה נשמע לכם מוכר, מזל טוב — אתם לא שבורים. אתם חווים אחת מלולאות הפסיכולוגיה המתוחכמות ביותר שקיימות בעולם המשחקים. משחקי מילים נוגעים במשהו עמוק בחיווט של המוח, והתוצאה היא סוג של כפייתיות שמרגישה שונה מגלילה באינסטגרם או בינג' של נטפליקס.

זה מרגיש... פרודוקטיבי? בריא? כאילו אתם עושים משהו טוב לעצמכם גם כשהשעון מעורר מתקרב?

רציתי להבין למה. לא ההסבר המעורפל של "זה כיף", אלא מדע המוח והפסיכולוגיה שמאחורי הקושי האבסורדי להניח את המשחק.`,
      },
      {
        title: 'מכת הדופמין: המוח שלכם על תגמולים משתנים',
        content: `בואו נתחיל עם הגדול: דופמין.

בטח שמעתם שדופמין הוא "כימיקל ההנאה", אבל זה לא בדיוק מדויק. דופמין הוא כימיקל הציפייה. הוא קופץ לא כשמקבלים את הפרס, אלא כשמצפים שפרס אולי בדרך.

בגלל זה מכונות מזל כל כך ממכרות. זה לא הזכייה — זה הציפייה לאפשרות של זכייה. פסיכולוגים קוראים לזה "לוח זמנים של חיזוק ביחס משתנה", והוא דפוס ההתניה החזק ביותר שידוע למדע ההתנהגות.

עכשיו חשבו מה קורה כשאתם סורקים רשת אותיות במשחק מילים.

אתם רואים צביר: מ, ש, ח, ק... זה יכול להיות משחק? אתם עוקבים אחרי הנתיב... ק נמצא ממש שם! משחק! חמש אותיות! קפיצת דופמין.

אבל הנה החלק הערמומי: אתם אף פעם לא יודעים מתי תמצאו את המילה הבאה. לפעמים הן באות במקבצים מהירים — גם, שם, שמש, בום בום בום. פעמים אחרות אתם בוהים שלושים שניות בלי לראות כלום, ואז פתאום "התגלות" מופיעה באלכסון והמוח שלכם נדלק כמו כיכר דיזנגוף בחנוכה.

חוסר הצפיות הזה הוא בדיוק לוח הזמנים של החיזוק המשתנה. המוח שלכם לומד שפרסים מגיעים, אבל לא בלוח זמנים צפוי, אז הוא שומר אתכם במצב של ציפייה מתמשכת. כל רגע יכול להיות הרגע שבו אתם מזהים מילה בת שבע אותיות.

פרופ' רוברט ספולסקי מסטנפורד הראה שרמות הדופמין עולות יותר כשהתגמולים לא ודאיים מאשר כשהם מובטחים. משחק מילים שבו מצאתם כל מילה בקלות היה דווקא פחות ממכר ממשחק שבו מילים מופיעות במרווחים בלתי צפויים.

האבולוציה לא הכינה אותנו לרשתות אותיות 4x4.`,
      },
      {
        title: 'מצב זרימה: כשהזמן נעלם',
        content: `אי פעם הרמתם את העיניים ממשחק מילים וגיליתם ששעה עברה? לא מטאפורה. הזמן ממש מרגיש אחרת כשאתם בזרימה.

מיהאי צ'יקסנטמיהאי זיהה את מצב הזרימה בשנות ה-70 כמצב של ספיגה מוחלטת בפעילות. אתם מאבדים תחושת זמן, תחושת העצמי נמוגה, וכל השאר פשוט... נעלם.

זרימה דורשת איזון מאוד ספציפי: האתגר חייב להיות בדיוק מספיק קשה. קל מדי ואתם משתעממים. קשה מדי ואתם מתוסכלים. הנקודה המתוקה: רמת המיומנות שלכם בקושי פוגשת את הקושי.

משחקי מילים הם מכונות זרימה מושלמות. בטעות.

חשבו על זה. רשת 4x4 מכילה מאות מילים אפשריות, מקלות באופן טריוויאלי (אם, גם, לא) ועד לקשות להחריד (המילה בת שמונה אותיות שמסתתרת בדפוס ספיראלי). בכל רגע, אתם פועלים בדיוק בקצה היכולת שלכם. המילים הקלות שומרות על תחושת מסוגלות. המילים הקשות שומרות על האתגר. והטיימר מוסיף בדיוק מספיק לחץ כדי למנוע מהמחשבות לשוטט.

לכן סיבוב של חמש דקות יכול להרגיש כמו שלושים שניות. הקורטקס הפרה-פרונטלי, החלק שאחראי על תפיסת זמן, מגויס למשימת מציאת המילים. פשוט אין מספיק משאבים עצביים שנותרו כדי לעקוב אחרי הזמן.

ומצה הזרימה הוא גם הסיבה ש"עוד סיבוב אחד" כל כך מסוכן. כל סיבוב קצר מספיק כדי שמצב הזרימה לא יתפוגג לגמרי בין סיבובים. אתם עדיין רוכבים על הגל כשהרשת הבאה מופיעה.`,
      },
      {
        title: 'אפקט זייגרניק: למה חידות לא גמורות רודפות אתכם',
        content: `בשנות ה-20 של המאה הקודמת, הפסיכולוגית הליטאית בלומה זייגרניק שמה לב למשהו מוזר: מלצרים זכרו הזמנות מורכבות בצורה מושלמת בזמן ההגשה, אבל שכחו אותן לגמרי ברגע שהאוכל הוגש. משימות לא גמורות נדבקות בזיכרון; משימות שהושלמו נמחקות.

זה אפקט זייגרניק, ומשחקי מילים מנצלים אותו בלי רחמים.

כשהסיבוב נגמר והמשחק מראה לכם את כל המילים שפספסתם, משהו קורה במוח. המילים שפספסתם — אלה שהיו ממש שם ולא ראיתם אותן — יוצרות לולאות פתוחות. המוח שלכם מסמן אותן כעסק לא גמור.

"קטסטרופה הייתה על הלוח?! ראיתי את ה-ק-ט-ס! למה לא ראיתי את זה?!"

ההרגשה המציקה הזו היא אפקט זייגרניק. המוח שלכם תייק משימה לא שלמה והוא באמת רוצה לסגור את הלולאה. הדרך הישירה ביותר לסגור אותה? לשחק עוד סיבוב ולנסות למצוא מילים כאלה בפעם הבאה.

זה אותו מנגנון שגורם לכם לחשוב על בעיות מהעבודה במקלחת. למוח שלכם יש לולאה פתוחה, והוא ממשיך לדקור אתכם עד שתפתרו אותה. פעם אחת פספסתי את המילה "אנציקלופדיה" וחשבתי על זה שלושה ימים. שלושה ימים! הרגשתי את המוח מנסה לסגור את הלולאה כל פעם שראיתי ספר.

זה לא התנהגות נורמלית. אבל זה כן מדע מוח נורמלי.`,
      },
      {
        title: 'השוואה חברתית: אפקט טבלת המובילים',
        content: `בני אדם הם מכונות השוואה. אנחנו לא יכולים להימנע מזה. תיאוריית ההשוואה החברתית, שהציע לאון פסטינגר ב-1954, טוענת שאנחנו מעריכים את עצמנו בעיקר על ידי השוואה לאחרים.

משחקי מילים עם טבלאות מובילים מתחברים ישירות למעגל הזה.

זה לא מספיק למצוא 30 מילים. צריך למצוא יותר מהחבר. צריך לטפס ממקום 7 למקום 5. צריך לנצח את השיא הקודם שלך.

כאן הדברים נהיים מעניינים מבחינה נוירולוגית. תחרות מפעילה את הסטריאטום הוונטרלי — אותו מרכז תגמול שמגיב לאוכל, כסף ומשיכה רומנטית. ניצחון על מישהו בטבלת מובילים מפעיל תגמול נוירוכימי אמיתי, שונה מפעולת הדופמין של מציאת מילים.

אז בעצם יש לכם שני מסלולי דופמין שפועלים בו-זמנית: אחד מלולאת מציאת המילים, ואחד מהתחרות החברתית. סנדוויץ' דופמין.

יש לי קבוצת וואטסאפ עם ארבעה חברים שבה אנחנו משתפים ציונים של האתגר היומי. הטראש טוק חסר פרופורציות. מישהו מצא 47 מילים? "הלוח היה בשפה שאתה בכלל מדבר?" מישהו סיים ראשון? "צילום מסך או שזה לא קרה." זה הפך לטקס יומי, והחברים אומרים שאני פשוט לא יכול לדלג על יום בלי קנטורים רציניים.`,
      },
      {
        title: 'רגע ה"אהה!": למה למצוא מילים מרגיש כל כך טוב',
        content: `יש רגע ספציפי שבו אתם מזהים מילה — במיוחד ארוכה — שבו הכל מתחבר. מדעני מוח קוראים לזה "חוויית התובנה" ויש לה חתימה עצבית ייחודית.

מחקר של מארק בימן וג'ון קוניוס באמצעות EEG ו-fMRI הראה שרגעי תובנה מלווים בפרץ של פעילות גלי גמא באונה הטמפורלית הימנית, ואחריו מגיע גל של פעילות במרכזי התגמול — אותם אזורים שמופעלים על ידי בדיחות, הפתעות נעימות והבנה פתאומית.

במילים אחרות, למצוא מילה לא רק מרגיש כמו תגמול. המוח שלכם מעבד את זה באותה דרך שהוא מעבד הבנה של בדיחה. זו תובנה, ותובנות הן מהנות באופן מהותי.

לכן למצוא מילה ארוכה ובלתי צפויה מרגיש שונה באופן קטגורי ממציאת מילה קצרה וברורה. למצוא "גם" זה זיהוי. למצוא "אנציקלופדיה" שמתפתלת לרוחב הלוח זו תובנה. ותובנה מתוגמלת נוירוכימית באופן שזיהוי פשוט לא.

אני חושב שזו הסיבה שמשחקי מילים מרגישים מספקים יותר מטריוויה רב-ברירתית. בטריוויה, התשובה מוצגת לכם ואתם בוחרים אותה. במשחק מילים, אתם שולפים את התשובה מתוך רעש.`,
      },
      {
        title: 'בריא מול לא בריא: מתי ההתלהבות הופכת לבעיה',
        content: `בואו נדבר על הצד הקשה של כל זה.

כל מה שתיארתי — תגמולים משתנים, מצבי זרימה, לולאות פתוחות, לחץ חברתי — אלה מנגנונים פסיכולוגיים חזקים באמת. אלה אותם מנגנונים שהופכים הימורים לממכרים, רשתות חברתיות לכפייתיות, ומשחקי מובייל לטורפניים.

ד"ר אדם אלטר מותח את הקו בהפרעה. פעילות הופכת לבעייתית כשהיא מפריעה באופן עקבי לשינה, מערכות יחסים, עבודה, בריאות.

החדשות הטובות הן שמשחקי מילים מבניתית פחות מסוכנים מחלופות רבות. סיבובים קצרים עם נקודות עצירה טבעיות. אין גלילה אינסופית. אין מנגנון פיננסי.

כמה גבולות מעשיים שעובדים לי:
- אני לא משחק במיטה
- אני קובע מגבלת סיבובים, לא מגבלת זמן (שלושה סיבובים, ואז עוצר)
- אני מתייחס לאתגר היומי כ"אחד וגמרנו"
- אם אני שם לב לדחף של "עוד סיבוב אחד" יותר מפעמיים, אני מניח את הטלפון

אלה לא מושלמים, ואני מפר אותם באופן קבוע. אבל גבולות מפורשים אומרים שלפחות אני שם לב כשאני מפר אותם.`,
      },
      {
        title: 'למה ההתלהבות הזו דווקא טובה לכם',
        content: `והפלוט טוויסט: בהשוואה לכמעט כל דבר אחר שמתחרה על תשומת הלב שלכם, הותר למשחקי מילים היא יחסית שפירה. אולי אפילו מועילה.

בואו נשווה מה קורה במוח בפעילויות פנאי נפוצות:

גלילת דום ברשתות חברתיות? קפיצות קורטיזול מתוכן זועם, חרדת השוואה חברתית, צריכה פסיבית, אפס אתגר קוגניטיבי.

בינג' צפייה? בידור פסיבי, מעורבות קוגניטיבית מינימלית, לרוב מלווה בנשנושים.

ומשחקי מילים? מעורבות קוגניטיבית פעילה באזורי מוח מרובים, חיזוק אוצר מילים, תרגול זיכרון עבודה, חשיבה אסטרטגית, מחזורי דופמין הניתנים לניהול עם נקודות סיום טבעיות.

מחקר מ-2022 שפורסם ב-NEJM Evidence מצא שאנשים שפתרו תשבצים למשך 78 שבועות הראו פחות ירידה קוגניטיבית מאלה שהשתמשו באפליקציות אימון מוח מסחריות. קבוצת משחקי המילים אפילו השתפרה במספר מדדים בזמן שקבוצת האפליקציות נשארה במקום.

אז כן — המוח שלכם נחטף על ידי לולאות דופמין, מצבי זרימה, ולולאות קוגניטיביות פתוחות. אבל בניגוד לרוב הדברים שחוטפים את המוח שלכם ב-2026, הדבר הזה באמת מאמן אותו באותו הזמן.

אתם לא רק מהונים. אתם מהונים למשהו שכנראה מחדד אתכם.

מאוחר. צריך להפסיק. אבל יש מילה בת שבע אותיות מסתתרת ברשת והמוח שלי לא ייתן לי לישון עד שאמצא אותה.`,
      },
      {
        content: `מקורות וקריאה נוספת:
- ספולסקי, ר. — דופמין וחיזוק ביחס משתנה: סדרת הרצאות סטנפורד על ביולוגיה התנהגותית
- צ'יקסנטמיהאי, מ. — זרימה: פסיכולוגיית החוויה האופטימלית (1990)
- זייגרניק, ב. — על משימות גמורות ולא גמורות (1927)
- פסטינגר, ל. — תיאוריה של תהליכי השוואה חברתית (1954)
- בימן, מ. וקוניוס, ג'. — רגע ה"אהה!": מדע המוח הקוגניטיבי של תובנה (2009)
- אלטר, א. — בלתי ניתן לעמוד בפניו: עליית הטכנולוגיה הממכרת (2017)
- NEJM Evidence (2022) — מחקר אוניברסיטת קולומביה וד'יוק על תשבצים (107 משתתפים, 78 שבועות)`,
      },
    ],
    backToBlog: 'חזרה לבלוג',
    tryDaily: 'אתגר יומי',
    practice: 'תרגול',
  },
  sv: {
    title: 'Varför Du Inte Kan Sluta Spela Ordspel (Och Varför Din Hjärna Inte Vill Att Du Ska)',
    subtitle: 'Vetenskapen bakom ordspelsberoende — dopamin, flowtillstånd och psykologin som får dig att komma tillbaka för "bara en runda till."',
    category: 'Psykologi',
    readTime: '11 min läsning',
    authorName: 'Ohad Fisher',
    authorBio: 'Självdiagnostiserad ordspelsmissbrukare, psykologientusiast och personen som viskar "bara en runda till" klockan två på natten som ett mantra.',
    sections: [
      {
        content: `Klockan var 02:17 en onsdag. Jag skulle jobba om fem timmar. Telefonskärmens ljus var det enda i rummet, och jag satt böjd över ett 4x4-rutnät av bokstäver som Gansen med sin skatt.

"Bara en runda till," viskade jag till absolut ingen.

Det var fyra rundor sedan.

Om det här låter bekant, grattis, du är inte trasig. Du upplever en av de mest elegant konstruerade psykologiska looparna som finns i spelvärlden. Ordspel kopplar in något djupt i hur våra hjärnor är kopplade, och resultatet är en sorts tvångsmässighet som känns annorlunda än, säg, att doomscrollla Instagram eller binge-watcha Netflix.

Det känns... produktivt? Hälsosamt? Som om du gör något bra för dig själv även när väckarklockan kryper närmare?

Jag ville förstå VARFÖR. Inte den vaga förklaringen "det är kul", utan den faktiska neurovetenskapen och psykologin bakom varför ordspel är så absurt svåra att lägga ifrån sig. Så jag dök ner i forskningen. Och det jag hittade är fascinerande. Och lite oroande.`,
      },
      {
        title: 'Dopaminkicken: Din Hjärna På Variabla Beloningar',
        content: `Vi börjar med det stora: dopamin.

Du har förmodligen hört dopamin beskrivas som "njutningskemikalien," men det är inte helt rätt. Dopamin är mer exakt "förväntanskemikalien." Det spikar inte när du FÅR belöningen, utan när du FÖRVÄNTAR dig att en kanske kommer.

Därför är spelmaskiner så beroendeframkallande. Det är inte vinsten (de flesta förlorar). Det är förväntan på att MÖJLIGEN vinna. Psykologer kallar detta ett "variabelt kvotförstärkningsschema," och det är det mest kraftfulla konditioneringsmönstret som beteendevetenskapen känner till.

Tänk nu på vad som händer när du skannar ett rutnät av bokstäver i ett ordspel.

Du ser ett kluster: S, T, A, R... kan det vara STARK? Du följer vägen... K är precis där! STARK! Fem bokstäver! Dopaminspikar.

Men här är det luriga: du vet aldrig NÄR du hittar nästa ord. Ibland kommer de i snabba kluster: OM, MO, MOR, bom bom bom. Andra gånger stirrar du i trettio sekunder utan att se något, och sedan dyker plötsligt KATASTROFAL upp diagonalt och din hjärna lyser upp som Sergels torg på nyårsafton.

Denna oförutsägbarhet är EXAKT det variabla förstärkningsschemat. Din hjärna lär sig att belöningar kommer, men inte på ett förutsägbart schema, så den håller dig engagerad i ett tillstånd av ständig, lågintensiv förväntan.

Professor Robert Sapolsky vid Stanford har visat att dopaminnivåerna faktiskt ökar MER när belöningar är osäkra än när de är garanterade. Ett ordspel där du hittade varje ord lätt skulle faktiskt vara MINDRE beroendeframkallande än ett där ord dyker upp med oförutsägbara intervall.

Evolutionen förberedde oss inte för 4x4 bokstavsrutnät.`,
      },
      {
        title: 'Flowtillstånd: När Tiden Försvinner',
        content: `Har du någonsin tittat upp från ett ordspel och insett att en timme har gått? Det är inget bildspråk. Tiden känns bokstavligen annorlunda när du är i flow.

Mihaly Csikszentmihalyi identifierade flowtillståndet på 1970-talet som ett tillstånd av fullständig uppslukelse i en aktivitet. Du tappar tidsuppfattningen, din känsla av själv bleknar, och allt annat bara... faller bort.

Flow kräver en mycket specifik balans: utmaningen måste vara PRECIS lagom svår. För lätt och du blir uttråkad. För svår och du blir frustrerad. Det söta stället är där din färdighetsnivå precis matchar svårigheten.

Ordspel är oavsiktligt perfekta flowmaskiner.

Tänk på det. Ett 4x4-rutnät innehåller hundratals möjliga ord, från trivialt lätta (OM, PÅ, EN) till otroligt svåra (det åttabokstavers ordet som gömmer sig i ett spiralmönster). I varje ögonblick arbetar du precis vid gränsen av din förmåga.

Därför kan en femminutersrunda kännas som trettio sekunder. Din prefrontala cortex, delen som ansvarar för tidsuppfattning, rekryteras för ordsökningsuppgiften istället. Det finns bokstavligen inte tillräckligt med neurala resurser över för att spara tid.

Flowtillståndet är också därför "bara en runda till" är så farligt. Varje runda är tillräckligt kort för att flowtillståndet inte helt hinner avta mellan rundorna.`,
      },
      {
        title: 'Zeigarnikeffekten: Därför Förföljer Dig Ofärdiga Pussel',
        content: `På 1920-talet märkte den litauiska psykologen Bluma Zeigarnik något konstigt: servitörer kunde minnas komplexa beställningar perfekt under serveringen, men glömde dem helt så fort maten var serverad. Ofärdiga uppgifter fastnar i minnet; färdiga rensas ut.

Detta är Zeigarnikeffekten, och ordspel utnyttjar den skoningslöst.

När din runda slutar och spelet visar alla ord du MISSADE, händer något i din hjärna. De missade orden skapar öppna loopar. Din hjärna flaggar dem som oavslutat ärende.

"SYMMETRI fanns på det brädet?! Jag såg S-Y-M! Varför såg jag det inte?!"

Den gnagande känslan? Det är Zeigarnikeffekten. Din hjärna har registrerat en ofullständig uppgift och den VILL verkligen stänga den loopen. Det mest direkta sättet? Spela en runda till.

Det är samma mekanism som får dig att tänka på arbetsproblem i duschen. Din hjärna har en öppen loop, och den fortsätter peta på dig tills du löser den.

Jag missade en gång ordet XYLOFON på ett bräde och tänkte på det i tre dagar. Tre dagar! Min hjärna var trasig tills jag hittade det i ett senare spel och loopen äntligen stängdes.`,
      },
      {
        title: 'Social Jämförelse: Toppliste-Effekten',
        content: `Människor är jämförelsemaskiner. Vi kan inte hjälpa det. Leon Festingers teori om social jämförelse från 1954 hävdar att vi utvärderar oss själva framför allt genom att jämföra med andra.

Ordspel med topplistor kopplar direkt in i denna krets.

Det räcker inte att hitta 30 ord. Du måste hitta FLER än din kompis. Du måste klättra från 7:e till 5:e plats. Du måste slå ditt eget tidigare rekord.

Här blir det intressant neurologiskt. Tävling aktiverar det ventrala striatum, samma belöningscentrum som reagerar på mat, pengar och romantisk attraktion. Att besegra någon på en topplista utlöser en genuin neurokemisk belöning.

Så du får faktiskt TVÅ dopaminvägar aktiverade samtidigt: en från ordfinnarloopen och en från den sociala tävlingen. Det är en dopaminsmörgås.

Jag har en gruppchatt med fyra vänner där vi delar våra dagliga utmaningspoäng. Snacket är orimligt. Någon hittade 47 ord? "Var brädet på ett språk du faktiskt talar?" Det har blivit en daglig ritual, och det sociala ansvaret innebär att jag bokstavligen inte kan hoppa över en dag utan att bli rostad.`,
      },
      {
        title: '"Aha!"-Ögonblicket: Därför Känns Det SÅ Bra Att Hitta Ord',
        content: `Det finns ett specifikt ögonblick när du ser ett ord, särskilt ett långt, där allt klickar. Neuroforskare kallar detta "insiktsupplevelsen" eller "aha-ögonblicket," och det har en distinkt neural signatur.

Forskning av Mark Beeman och John Kounios med EEG och fMRI har visat att insiktsögonblick föregås av en explosion av gammavågsaktivitet i den högra temporalloben. Detta följs av en rusning av aktivitet i belöningscentrumen, samma områden som aktiveras av skämt, trevliga överraskningar och plötslig förståelse.

Att hitta ett ord bearbetas på samma sätt som att förstå en vits. Det är en insikt, och insikter är i sig njutbara.

Därför känns det kategoriskt annorlunda att hitta ett långt, oväntat ord jämfört med ett kort, uppenbart. Att hitta "OM" är igenkänning. Att hitta "KATASTROFAL" som slingrar sig över brädet är insikt. Och insikt belönas neurokemiskt på ett sätt som enkel igenkänning inte gör.

Det är också därför vi minns spektakulära ordspelsögonblick åratal senare. Jag kan fortfarande berätta om gången jag hittade JUXTAPOSITION på ett bräde. Känslan av "detta har funnits här hela tiden och bara jag såg det". Ren insikt, kemiskt inbränd i mitt minne.`,
      },
      {
        title: 'Hälsosamt vs. Ohälsosamt: När "Beroendeframkallande" Blir Ett Problem',
        content: `Allt jag har beskrivit, variabla belöningar, flowtillstånd, öppna loopar, socialt tryck, det är genuint kraftfulla psykologiska mekanismer. De är samma mekanismer som gör hasardspel beroendeframkallande och sociala medier tvångsmässiga.

Kliniska psykologen Dr. Adam Alter drar gränsen vid störning. En aktivitet blir problematisk när den konsekvent stör saker du värdesätter mer: sömn, relationer, arbete, hälsa.

De goda nyheterna är att ordspel är strukturellt mindre farliga än många alternativ. Korta rundor med naturliga stopppunkter. Ingen oändlig scrollning. Ingen finansiell mekanism.

Några praktiska gränser som fungerar för mig:
- Jag spelar inte i sängen (okej, jag FÖRSÖKER att inte spela i sängen)
- Jag sätter en rundgräns, inte en tidsgräns (tre rundor, sedan stopp)
- Jag behandlar den dagliga utmaningen som mitt "en och klar"
- Om jag märker "bara en runda till"-suget mer än två gånger, lägger jag ner telefonen

Dessa är inte perfekta, och jag bryter mot dem regelbundet. Men att ha explicita gränser innebär att jag åtminstone MÄRKER när jag bryter mot dem.`,
      },
      {
        title: 'Därför Är Detta "Beroende" Faktiskt Bra För Dig',
        content: `Här är plottvändningen: jämfört med nästan allt annat som tävlar om din uppmärksamhet är ordspels-"beroende" anmärkningsvärt godartat. Kanske till och med fördelaktigt.

Låt oss jämföra vad som händer i din hjärna under vanliga fritidsaktiviteter:

Doomscrollning i sociala medier: Kortisolspikar från upprörande innehåll, social jämförelseångest, passiv konsumtion, ingen kognitiv utmaning.

Binge-tittande: Passiv underhållning, minimal kognitiv engagemang, ofta åtföljd av snacking.

Ordspel: Aktiv kognitiv engagemang över flera hjärnregioner, vokabulärförstärkning, arbetsminnesträning, strategiskt tänkande, hanterbara dopamincykler med naturliga slutpunkter.

En studie från 2022 i NEJM Evidence visade att personer som löste korsord i 78 veckor hade mindre kognitiv nedgång än de som använde kommersiella hjärnträningsappar. Korsordgruppen förbättrades faktiskt på vissa mått medan appgruppen stod stilla.

Så ja, din hjärna har kapats av dopaminloopar, flowtillstånd och öppna kognitiva loopar. Men till skillnad från de flesta saker som kapar din hjärna 2026, tränar den här faktiskt din hjärna samtidigt.

Du är inte bara beroende. Du är beroende av något som förmodligen gör dig skarpare.

Det är sent. Jag borde sluta. Men det finns ett sjubokstavsord gömt i det där rutnätet och min hjärna låter mig inte sova förrän jag hittar det.`,
      },
      {
        content: `Källor & Vidare Läsning:
- Sapolsky, R. — Dopamin och variabel kvotförstärkning: Stanfords föreläsningsserie om beteendebiologi
- Csikszentmihalyi, M. — Flow: Den Optimala Upplevelsens Psykologi (1990)
- Zeigarnik, B. — Om färdiga och ofärdiga uppgifter (1927)
- Festinger, L. — En Teori Om Sociala Jämförelseprocesser (1954)
- Beeman, M. & Kounios, J. — Aha!-ögonblicket: Kognitiv neurovetenskap om insikt (2009)
- Alter, A. — Oemotståndlig: Uppkomsten av beroendeframkallande teknik (2017)`,
      },
    ],
    backToBlog: 'Tillbaka till Bloggen',
    tryDaily: 'Daglig Utmaning',
    practice: 'Öva',
  },
  ja: {
    title: 'ワードゲームがやめられない理由（そして脳がやめさせたくない理由）',
    subtitle: 'ワードゲーム中毒の科学 ― ドーパミン、フロー状態、そして「あと1ラウンドだけ」と思わせる心理学。',
    category: '心理学',
    readTime: '11分で読めます',
    authorName: 'Ohad Fisher',
    authorBio: '自己診断済みワードゲーム中毒者、心理学愛好家、深夜2時に「あと1ラウンドだけ」と呪文のように唱える人。',
    sections: [
      {
        content: `水曜日の午前2時17分。出勤まであと5時間。部屋の唯一の明かりはスマホの画面で、私は4x4の文字グリッドの上にかがみ込んでいた。まるで指輪を抱きしめるゴラムのように。

「あと1ラウンドだけ」と、誰もいない部屋で呟いた。

それは4ラウンド前の話だ。

心当たりがある方、おめでとうございます ― あなたは壊れていません。ゲームの世界に存在する、最も精巧に設計された心理的ループの一つを体験しているのです。ワードゲームは私たちの脳の配線の深い部分に触れ、その結果、InstagramのドゥームスクロールやNetflixのイッキ見とは違う種類の強迫性が生まれます。

なんだか...生産的？健全？目覚まし時計が近づいているのに、自分のためになることをしている気がする？

私は「なぜ」を理解したかった。漠然とした「楽しいから」という説明ではなく、ワードゲームがなぜこんなにも信じられないほどやめにくいのか、その実際の神経科学と心理学を。研究の深みに潜り込んだ結果、見つけたものは魅力的で ― 少し不安にもなった。`,
      },
      {
        title: 'ドーパミンの一撃：変動報酬と脳',
        content: `まずは大物から始めよう：ドーパミン。

ドーパミンは「快楽物質」と言われることが多いが、正確ではない。ドーパミンはむしろ「期待の物質」だ。報酬をもらった時ではなく、報酬が来るかもしれないと期待する時にスパイクする。

これがスロットマシンが中毒性を持つ理由だ。勝つことではなく、勝つかもしれないという期待が重要なのだ。心理学者はこれを「変動比率強化スケジュール」と呼び、行動科学で知られている最も強力な条件付けパターンだ。

ワードゲームで文字グリッドをスキャンする時に何が起こるか考えてみよう。

文字の塊が見える：か、た、す、ろ...「かたすろ」？いや...「すたろ」？待って、「たすか」...「助かる」！6文字！ドーパミンスパイク。

しかし巧妙な部分はここだ：次の単語がいつ見つかるか決してわからない。時には立て続けに来る ― あめ、かめ、さめ、ドンドンドン。他の時は30秒間何も見えず、突然「きょうかしょ」が斜めに現れて脳が花火のように光る。

この予測不可能性こそが変動比率スケジュールそのものだ。脳は報酬が来ることを学ぶが、予測可能なスケジュールではないため、常に低レベルの期待状態に保たれる。

スタンフォード大学のロバート・サポルスキー教授は、報酬が不確実な時の方が確実な時よりもドーパミンレベルが高くなることを示した。すべての単語を簡単に見つけられるワードゲームは、予測不可能な間隔で単語が現れるゲームよりも中毒性が低い。

進化は4x4の文字グリッドに対する準備をしていなかった。`,
      },
      {
        title: 'フロー状態：時間が消える時',
        content: `ワードゲームから顔を上げて、1時間が経っていたことに気づいたことはありますか？これは比喩ではない。フロー状態にある時、時間は文字通り違って感じられる。

ミハイ・チクセントミハイは1970年代にフロー状態を特定した ― 活動への完全な没入状態。時間の感覚を失い、自己の感覚が薄れ、他のすべてが...消える。

フローには非常に特定のバランスが必要だ：チャレンジがちょうど良い難しさでなければならない。簡単すぎると退屈する。難しすぎるとフラストレーションが溜まる。スイートスポットは、スキルレベルが難易度にギリギリで追いつく場所だ。

ワードゲームは偶然にも完璧なフローマシンだ。

考えてみよう。4x4グリッドには何百もの可能な単語が含まれ、簡単なもの（あめ、かぜ）から非常に難しいもの（螺旋パターンに隠れた8文字の単語）まである。どの瞬間も、自分の能力の限界で操作している。

だから5分のラウンドが30秒のように感じられる。前頭前皮質 ― 時間知覚を担当する部分 ― が単語発見タスクに動員される。時間を追跡するための神経資源が文字通り残らない。

フロー状態は「あと1ラウンドだけ」が危険な理由でもある。各ラウンドは十分に短いため、ラウンド間にフロー状態が完全に消散しない。次のグリッドが現れた時、まだ波に乗っていて、脳が「まぁ、もうここにいるし...」と言う。`,
      },
      {
        title: 'ツァイガルニク効果：未完成パズルに取り憑かれる理由',
        content: `1920年代、リトアニアの心理学者ブルマ・ツァイガルニクは奇妙なことに気づいた：ウェイターは配膳中は複雑な注文を完璧に覚えていたが、料理が届けられると完全に忘れた。未完了のタスクは記憶に残り、完了したタスクは消去される。

これがツァイガルニク効果で、ワードゲームはこれを容赦なく利用する。

ラウンドが終わり、見逃した単語が表示される時、脳の中で何かが起こる。見逃した単語 ― すぐそこにあったのに見えなかった単語 ― がオープンループを作る。脳はそれを未完了の仕事としてフラグを立てる。

「"百科事典"があのボードにあったの？！"百科"は見えたのに！なぜ気づかなかった？！」

あのモヤモヤする感じ？それがツァイガルニク効果だ。脳は不完全なタスクを記録し、そのループを閉じたがっている。最も直接的な方法は？もう1ラウンドプレイして、次は見つけようとすること。

シャワーで仕事の問題を考えてしまうのと同じメカニズムだ。脳にオープンループがあり、解決するまで突っつき続ける。

かつて「ゼフィロス」という単語を見逃して、文字通り3日間考え続けた。脳はループを閉じようとして、実生活でZを見るたびに反応した。次のゲームでやっと見つけた時、ループがようやく閉じた。`,
      },
      {
        title: '社会的比較：リーダーボード効果',
        content: `人間は比較マシンだ。避けられない。レオン・フェスティンガーが1954年に提唱した社会的比較理論は、私たちは絶対的な基準ではなく、主に他者との比較で自分を評価すると主張する。

リーダーボード付きのワードゲームは、この回路に直接接続する。

30語見つけるだけでは足りない。友達より多く見つけなければ。7位から5位に上がらなければ。自分の過去の記録を超えなければ。単語自体が競争に比べて二次的になる。

神経科学的に興味深いのは、競争が腹側線条体を活性化すること ― 食べ物、お金、ロマンチックな魅力に反応するのと同じ報酬中枢だ。リーダーボードで誰かに勝つと、単語発見のドーパミンとは別の神経化学的報酬が得られる。

つまり、2つのドーパミン経路が同時に活性化される：単語発見ループからのものと、社会的競争からのもの。ドーパミンサンドイッチだ。

4人の友達とのグループチャットで、毎日デイリーチャレンジのスコアを共有している。煽り合いが尋常ではない。47語見つけた人には「そのボード、お前が実際に話す言語だったの？」。1位になった人には「スクショか、さもなくば嘘」。日課になり、社会的プレッシャーで1日もスキップできない。`,
      },
      {
        title: '「アハ！」の瞬間：単語発見がなぜこんなに気持ちいいのか',
        content: `単語を見つける特定の瞬間がある ― 特に長い単語 ― すべてがカチッとはまる瞬間。神経科学者はこれを「洞察体験」や「アハ体験」と呼び、明確な神経シグネチャーを持つ。

マーク・ビーマンとジョン・コウニオスのEEGとfMRIを使った研究では、洞察の瞬間の前に右側頭葉でガンマ波活動のバーストが起こることが示された。これに続いて報酬中枢での活動の急増 ― ジョーク、嬉しい驚き、突然の理解で活性化される同じ領域。

つまり、単語を見つけることは報酬として感じられるだけでなく、脳はそれをジョークを理解するのと同じ方法で処理する。これは洞察であり、洞察は本質的に快いものだ。

短い明白な単語を見つけるのと長い予想外の単語を見つけるのがカテゴリー的に異なるのはこのためだ。「あめ」を見つけるのは認識。ボードを横切って螺旋する「百科事典」を見つけるのは洞察。そして洞察は単純な認識にはない方法で神経化学的に報酬される。

心理学者が「生成効果」と呼ぶものによって快感は増幅される。能動的に発見した単語は、受動的に読んだ単語よりも強く記憶にエンコードされる。あなたは単語を見ただけでなく、見つけた。パスを構築した。その能動的な構築に神経化学的ボーナスが与えられる。`,
      },
      {
        title: '健全 vs 不健全：「中毒」が問題になる時',
        content: `少し立ち止まって、これらすべての不快な側面について話そう。

私が説明したすべて ― 変動報酬、フロー状態、オープンループ、社会的プレッシャー ― これらは本当に強力な心理的メカニズムだ。ギャンブルを中毒性にし、SNSを強迫的にし、モバイルゲームを搾取的にするのと同じメカニズムだ。

臨床心理学者のアダム・アルター博士は、干渉で線を引く。活動が問題になるのは、より大切にしているもの ― 睡眠、人間関係、仕事、健康 ― に一貫して干渉する時だ。

良いニュースは、ワードゲームは構造的に多くの代替手段より危険性が低いこと。短いラウンドに自然な区切りがある。無限スクロールがない。金銭的メカニズムがない。

私に効いている実践的な境界線：
- ベッドではプレイしない（まぁ、しないように「努力」している）
- 時間制限ではなくラウンド制限を設ける（3ラウンドで停止）
- デイリーチャレンジは「1回で終了」として扱う
- 「あと1ラウンドだけ」の衝動を2回以上感じたら、スマホを置く

完璧ではないし、定期的に破っている。しかし明示的な境界線があることで、少なくとも破っている時に気づく。それが戦いの半分だ。`,
      },
      {
        title: 'この「中毒」が実はあなたにとって良い理由',
        content: `プロットツイストがある：あなたの注意を奪い合うほぼすべてのものと比較して、ワードゲーム「中毒」は驚くほど良性だ。むしろ有益かもしれない。

一般的な余暇活動中の脳の状態を比較してみよう：

SNSのドゥームスクロール：怒りのコンテンツによるコルチゾールスパイク、社会的比較不安、受動的消費、認知的チャレンジなし。

イッキ見：受動的娯楽、最小限の認知的関与、しばしば間食を伴う。

ワードゲーム：複数の脳領域にわたる能動的認知的関与、語彙強化、ワーキングメモリの訓練、戦略的思考、自然な区切りのある管理可能なドーパミンサイクル。

2022年にNEJM Evidenceに発表された研究では、78週間クロスワードを解いた人は、商用脳トレアプリを使った人より認知機能の低下が少なかった。ワードゲーム群はいくつかの指標で改善さえ見られたが、アプリ群は横ばいだった。

そう ― あなたの脳はドーパミンループ、フロー状態、オープンな認知ループに乗っ取られている。しかし2026年にあなたの脳を乗っ取るほとんどのものとは違い、これは同時に脳を鍛えている。

中毒なだけじゃない。おそらくあなたをより鋭くしている何かに中毒なのだ。

遅い。やめるべきだ。でもあのグリッドに7文字の単語が隠れていて、見つけるまで脳が眠らせてくれない。`,
      },
      {
        content: `参考文献：
- サポルスキー, R. — ドーパミンと変動比率強化：スタンフォード行動生物学講義シリーズ
- チクセントミハイ, M. — フロー：最適体験の心理学 (1990)
- ツァイガルニク, B. — 完了したタスクと未完了のタスクについて (1927)
- フェスティンガー, L. — 社会的比較過程の理論 (1954)
- ビーマン, M. & コウニオス, J. — アハ！の瞬間：洞察の認知神経科学 (2009)
- アルター, A. — 抗しがたい：中毒性テクノロジーの台頭 (2017)`,
      },
    ],
    backToBlog: 'ブログに戻る',
    tryDaily: 'デイリーチャレンジ',
    practice: '練習する',
  },
};
