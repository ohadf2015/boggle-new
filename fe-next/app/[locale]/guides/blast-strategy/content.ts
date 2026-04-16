export type GuideContent = {
  title: string;
  subtitle: string;
  category: string;
  readTime: string;
  authorName: string;
  authorBio: string;
  quickTips: string[];
  comboTable: { level: number; multiplier: string; window: string }[];
  sections: Array<{ title?: string; content: string }>;
  faq: Array<{ question: string; answer: string }>;
  ctaText: string;
  ctaLink: string;
  backToGuides: string;
};

const comboTable = [
  { level: 1, multiplier: '1x', window: 'Base' },
  { level: 2, multiplier: '1.5x', window: '3s' },
  { level: 3, multiplier: '2x', window: '2.5s' },
  { level: 4, multiplier: '2.5x', window: '2s' },
  { level: 5, multiplier: '3x', window: '1.5s' },
  { level: 6, multiplier: '3.5x', window: '1.5s' },
  { level: 7, multiplier: '4x', window: '1s' },
  { level: 8, multiplier: '5x', window: '1s' },
];

export const contentByLocale: Record<string, GuideContent> = {
  en: {
    title: 'Blast Mode Mastery: Combos, Chains & High Scores',
    subtitle: 'Everything I\'ve learned about combos, tile effects, and not choking at level 7 after 1,000+ boards.',
    category: 'Strategy',
    readTime: '9 min read',
    authorName: 'Ohad Fisher',
    authorBio: 'Blast mode enthusiast who has cleared over 1,000 boards and reached combo level 15+.',
    quickTips: [
      'Speed over everything. Your next word matters more than your best word.',
      'Already be tracing your next word while the current one validates. This one habit changed my scores completely.',
      'Short words (3-4 letters) are combo glue. I used to ignore them. Huge mistake.',
      'Fire tiles clear rows, ice freezes neighbors, bombs explode 3x3 areas. Learn what each glow color means.',
      'The combo window shrinks to 1 second at high levels. If you don\'t have a backup word ready, you\'re toast.',
      'Before submitting anything, spot 3-4 easy words first. That runway saves you.',
      'Longer words buy you a bigger combo timer reset. Great for catching your breath mid-chain.',
    ],
    comboTable,
    sections: [
      {
        title: 'Why Blast Mode Broke My Brain (In a Good Way)',
        content: `I played Classic mode for months before I tried Blast. Thought I was pretty good at word games. Then I played my first Blast round and scored like 200 points. Humbling doesn't begin to cover it.

What makes Blast completely different: there's a combo system running under everything. You submit a word, a timer starts ticking. Get another word in before it expires and your multiplier goes up. Miss the window and you're back to 1x. Simple concept. Incredibly hard to execute well.

This flips word game strategy on its head. In Classic, I'd happily spend 15 seconds hunting a gorgeous 7-letter word. In Blast, those 15 seconds of silence would murder a combo chain worth way more points. It's not about finding the best word anymore. It's about never stopping.

Oh, and there are special tile effects too. Fire, ice, bombs, lightning. They blow up sections of the board and rain fresh letters down. The first time I accidentally triggered a bomb tile during a combo streak, I think I actually yelled out loud. We'll get into those.`,
      },
      {
        title: 'How the Combo System Actually Works',
        content: `OK let me break down the combo math, because once I actually understood the numbers, my whole approach changed.

You submit a word, you're at combo level 1. That's just 1x, nothing special. Get another word in within 3 seconds and you jump to level 2 (1.5x). Keep going: level 3 is 2x, level 4 is 2.5x, level 5 is 3x. It keeps climbing from there.

But the nasty part: the combo window shrinks as you climb. At level 2 you get a comfortable 3 seconds. By level 5 it's down to 1.5 seconds. Level 7 and above? One. Single. Second. Your fingers better know what they're doing, because your brain won't have time to deliberate.

Now the thing that blew my mind when I finally did the math. Say you spot a nice 5-letter word worth 4 base points. At combo level 5 with the 3x multiplier, that's 12 points. Solid, right? But what if instead you'd fired off four quick 3-letter words (2 base points each) at levels 2 through 5? That's 2 + 3 + 4 + 5 = 14 points. AND you still have your combo alive for whatever comes next.

I'll be honest, this was counterintuitive to me for a long time. My word-game brain kept screaming "find the big word!" But the math doesn't lie. Keeping chains alive with small words between big finds beats hunting for one perfect word almost every time.`,
      },
      {
        title: 'Tile Effects (aka Why I Just Screamed at My Phone)',
        content: `Special tiles show up on the board with little visual tells. Learning to spot them fast and use them on purpose (not by accident like I did for my first 200 games) is a game changer.

Fire Tiles have a red glow. Use one in a word and it nukes the entire row. All those letters vanish, new ones drop in from above. I love triggering these when the board feels stale and I'm running low on obvious words. Instant refresh.

Ice Tiles shimmer blue. When you trigger one, it freezes the tiles next to it in place. They won't move when other tiles get cleared. Sounds boring compared to explosions, right? Wrong. Freezing a killer letter combo in place so you can use it on your next word is ridiculously powerful once you start doing it on purpose.

Bomb Tiles pulse, and they're my favorite. They blow up everything in a 3x3 area around them. Nine tiles gone, nine fresh tiles dropping in. When the board is a mess of Q's and X's with no vowels in sight, a bomb tile is your best friend.

Lightning Tiles spark yellow and clear an entire column. Pair one with a fire tile in the same word and you just cleared a full row AND a full column in one move. The cascade that follows is beautiful chaos.

The real pro move: build words that contain multiple effect tiles. Both effects trigger. I once hit a word with fire + bomb and it basically replaced half the board. My combo was at level 6 and the fresh tiles gave me three easy words in a row. That's the dream.`,
      },
      {
        title: 'Getting Into the Zone (Chain Strategy)',
        content: `There's this state you get into after a few hundred Blast games where words just... appear. Your fingers start moving before your conscious brain even registers what you're spelling. The first time it happened to me I hit combo level 8 and my hands were literally shaking.

Pre-loading is the skill. While your current word is doing its little validation animation, your eyes should already be locked on your next word. You trace it the instant the board lets you. Eyes one word ahead of your fingers, always. I can't overstate how much this matters. It's THE Blast mode skill.

I use what I call the 3-Word Buffer. Before I submit anything, I spot at least three easy words on the board. I fire off the first, and while it validates, I'm confirming the second in my head. By the time the first clears and new tiles drop, word three is ready to go. That buffer gives me breathing room to find word four while my hands are on autopilot.

Rhythm matters too. I alternate short and long words. Quick 3-letter word to keep the combo alive, then a meaty 5-6 letter word for big points with the multiplier, then immediately back to a short word while I scan for the next big one. Short-long-short-long. It's almost musical once you get it going.

Keep an emergency word in your back pocket. Seriously. I always know where at least one easy 3-letter word is on the board. If I'm blanking, I submit that word to buy myself another combo window. Has saved my chain more times than I can count.

And when your combo breaks (it will, I still drop combos constantly), don't panic. Take a breath, spend 2-3 seconds scanning, find your next three starter words, and go again. A clean new chain always beats desperately submitting random garbage to try to save a dying one.`,
      },
      {
        title: 'Reading a Board That Won\'t Stop Moving',
        content: `This tripped me up for a long time. In Classic mode the board just sits there politely. In Blast mode it's alive. Tiles are clearing, falling, appearing. You have to read a board that's constantly shifting under you.

Biggest tip: focus on the bottom third. Gravity pulls new tiles down, so the bottom of the board is the most stable real estate. Your anchor words should live down there. The top is chaos, constantly getting refreshed with new drops.

Start watching the cascades. When tiles clear, everything above them falls, and fresh letters appear at the top. Good players react to what the board looks like after the dust settles. Great players predict it. If you know a fire tile is about to clear a row, you can already be planning what words might form when new tiles fill that gap. I'm not great at this yet, honestly. But the times I've pulled it off felt incredible.

Look for areas where consonants and vowels are nicely mixed together. That's where the words are. If you see a corner with four consonants jammed together, don't waste time staring at it.

One last thing: new tiles get a brief highlight when they enter the board. Train your eyes to snap to that highlight immediately. Fresh tiles create combinations that weren't there a second ago, and often they're the easiest words on the board because nobody (including you) has already scanned past them.`,
      },
      {
        title: 'Blast Moves: Stop Wasting Them',
        content: `I used to burn through my Shuffle and Hint powers in the first 30 seconds of every game. Terrible strategy. Let me save you from my mistakes.

Shuffle rearranges the whole board. Only use it when the board is genuinely dead. Like, you've scanned every corner and there's nothing. And critically, only shuffle when your combo is already at zero. Shuffling mid-combo kills your chain, and that's just throwing away points.

Hint highlights a word you can submit. The thing most people get wrong: using a Hint at combo level 1 is basically worthless. Save it for when you're at a high combo level and feel it slipping away. A Hint at level 6 or 7 doesn't just give you a word, it preserves your massive multiplier. That's where the real value is.

Time Freeze pauses the game clock for a bit. I use this when I've got a good combo cooking and I need a second to find my next word. Fair warning though: the combo timer still runs during a freeze. So you can't just sit there. You need to find and submit a word before the freeze ends.

My general rule: treat Blast moves like they appreciate in value over time. A Hint at combo level 7 (4x multiplier) is literally worth four times what it's worth at level 1. Hoard your moves. Be stingy. The payoff for patience is enormous.`,
      },
      {
        title: 'Scoring Tricks I Wish I\'d Known Earlier',
        content: `After about 500 games, I started noticing patterns that actually moved the needle on my scores.

At combo level 7 and above, your only job is keeping the chain alive. Submit anything valid. I don't care if it's "the." A 3-letter word at 5x multiplier is 10 points. A 6-letter word with no combo is 5 points. The multiplier makes even tiny words valuable. I call this combo surfing and it's where the really big scores come from.

Effect chaining is the next level. Sometimes a bomb tile cascade drops a fire tile into the perfect spot. If you can spot that possibility before it happens and plan a word that hits the fire tile on your next move, you're basically playing 4D chess. I pull this off maybe once every ten games. It's incredibly satisfying.

Sometimes the right play is submitting a word for board position, not points. Clearing tiles in a strategic spot can open up a whole new section of the board. I think of it like chess, sacrificing a low-value move to set up something bigger.

Know the score thresholds for achievements and rewards. When you're at 980 points, that's not the time to relax. Push hard for 1,000 because the reward difference matters.

My most important piece of advice: consistency crushes peaks. A player who holds combo level 4-5 for the entire game will outscore someone who hits level 8 once and plays the rest at 1-2. I track my average combo level now, not my peak. That mindset shift pushed my scores up more than any single technique.`,
      },
    ],
    faq: [
      {
        question: 'How does the combo system work in LexiClash Blast mode?',
        answer: 'You submit words back to back within a shrinking time window. Each consecutive word bumps your combo level, which increases your score multiplier from 1x all the way up to 5x+ at level 8. The window starts at a comfortable 3 seconds but shrinks to just 1 second at the highest levels. It gets intense.',
      },
      {
        question: 'What are tile effects in Blast mode?',
        answer: 'They\'re special tiles that do something dramatic when you use them in a word. Fire tiles wipe out a whole row, ice tiles freeze neighboring tiles in place, bomb tiles explode a 3x3 area, and lightning tiles clear a full column. If you manage to hit two effect tiles in one word, both trigger. Absolute chaos in the best way.',
      },
      {
        question: 'Is it better to find long words or keep combos going?',
        answer: 'Keep combos going, almost always. The math is clear on this one: a tiny 3-letter word at combo level 5 (3x = 6 points) beats a fancy 6-letter word at level 1 (5 points). Use short words as combo glue while you scan for longer ones. The multiplier is everything.',
      },
      {
        question: 'When should I use Blast moves like Shuffle and Hint?',
        answer: 'Late and sparingly. A Hint at combo level 7 is worth four times more than at level 1 because it preserves your multiplier. Only Shuffle when the board is truly dead and your combo is already gone. Think of your Blast moves as investments that gain value the longer you wait.',
      },
    ],
    ctaText: 'Try Blast Mode',
    ctaLink: '/singleplayer',
    backToGuides: 'Back to Guides',
  },
  he: {
    title: 'מצב בלאסט: איך הפסקתי לפחד מהקומבו והתחלתי לאהוב את הכאוס',
    subtitle: 'כל מה שלמדתי על קומבו, אפקטי אריחים, ואיך לא להיחנק ברמה 7 אחרי 1,000+ לוחות.',
    category: 'אסטרטגיה',
    readTime: '9 דקות קריאה',
    authorName: 'חנון המילים',
    authorBio: 'אני מכור לבלאסט. ניקיתי מעל 1,000 לוחות והגעתי לקומבו 15+. הידיים שלי עדיין רועדות אחרי משחק טוב.',
    quickTips: [
      'מהירות מעל הכל. המילה הבאה שלכם חשובה יותר מהמילה הכי טובה שלכם.',
      'כבר תעקבו אחרי המילה הבאה בזמן שהנוכחית מאומתת. ההרגל הזה לבד שינה לי את הניקוד.',
      'מילים קצרות (3-4 אותיות) הן הדבק של הקומבו. פעם התעלמתי מהן. טעות ענקית.',
      'אריחי אש מנקים שורות, קרח מקפיא שכנים, פצצות מפוצצות 3x3. תלמדו מה כל זוהר אומר.',
      'חלון הקומבו מתכווץ לשנייה אחת ברמות גבוהות. אם אין לכם מילת גיבוי מוכנה, נגמרתם.',
      'לפני שמגישים משהו, תזהו 3-4 מילים קלות. המסלול הזה מציל אתכם.',
      'מילים ארוכות קונות לכם יותר זמן באיפוס טיימר הקומבו. מעולה כשצריכים לנשום.',
    ],
    comboTable,
    sections: [
      {
        title: 'למה בלאסט שבר לי את המוח (בצורה טובה)',
        content: `שיחקתי קלאסי חודשים לפני שניסיתי בלאסט. חשבתי שאני די טוב במשחקי מילים. אז שיחקתי את הסיבוב הראשון שלי בבלאסט וקיבלתי בערך 200 נקודות. מה לעשות, צנועים אנחנו לא.

מה שהופך את בלאסט לשונה לחלוטין: יש מערכת קומבו שרצה מתחת לכל דבר. מגישים מילה, טיימר מתחיל לתקתק. מכניסים עוד מילה לפני שהוא נגמר והמכפיל עולה. מפספסים את החלון וחוזרים ל-1x. קונספט פשוט. קשה בטירוף לביצוע.

זה הופך את כל האסטרטגיה של משחקי מילים על הראש. בקלאסי, הייתי בשמחה מבלה 15 שניות בציד מילה מפוארת בת 7 אותיות. בבלאסט, 15 השניות האלה של שקט היו רוצחות שרשרת קומבו ששווה הרבה יותר נקודות. זה כבר לא עניין של למצוא את המילה הכי טובה. זה עניין של לעולם לא לעצור.

אה, ויש גם אפקטי אריחים מיוחדים. אש, קרח, פצצות, ברקים. הם מפוצצים חלקים מהלוח ומגשימים אותיות חדשות. הפעם הראשונה שבטעות הפעלתי אריח פצצה באמצע רצף קומבו, אני חושב שממש צעקתי. נגיע לזה.`,
      },
      {
        title: 'איך מערכת הקומבו באמת עובדת',
        content: `אוקיי בואו נפרק את המתמטיקה של הקומבו, כי ברגע שהבנתי את המספרים, כל הגישה שלי השתנתה.

מגישים מילה, אתם ברמת קומבו 1. זה סתם 1x, כלום מיוחד. מכניסים עוד מילה תוך 3 שניות וקופצים לרמה 2 (1.5x). ממשיכים: רמה 3 זה 2x, רמה 4 זה 2.5x, רמה 5 זה 3x. וזה ממשיך לטפס.

אבל החלק המגעיל: חלון הקומבו מתכווץ ככל שמטפסים. ברמה 2 יש 3 שניות נוחות. ברמה 5 זה יורד ל-1.5 שניות. רמה 7 ומעלה? שנייה. אחת. בודדת. האצבעות שלכם חייבות לדעת מה הן עושות, כי למוח לא יהיה זמן להתלבט.

ועכשיו הדבר שפוצץ לי את הראש כשסוף סוף עשיתי את החשבון. נגיד שזיהיתם מילה נחמדה בת 5 אותיות ששווה 4 נקודות בסיס. ברמת קומבו 5 עם מכפיל 3x, זה 12 נקודות. לא רע, נכון? אבל מה אם במקום הייתם יורים ארבע מילים מהירות בנות 3 אותיות (2 נקודות בסיס כל אחת) ברמות 2 עד 5? זה 2 + 3 + 4 + 5 = 14 נקודות. וגם הקומבו שלכם עדיין חי למה שבא אחרי.

בכנות, זה היה נגד האינטואיציה שלי הרבה זמן. המוח של משחקי מילים שלי צרח "תמצא את המילה הגדולה!" אבל המתמטיקה לא משקרת. לשמור על שרשראות עם מילים קצרות בין ממצאים גדולים מנצח כמעט תמיד.`,
      },
      {
        title: 'אפקטי אריחים (הסיבה שצעקתי על הטלפון)',
        content: `אריחים מיוחדים מופיעים על הלוח עם סימנים ויזואליים. ללמוד לזהות אותם מהר ולהשתמש בהם בכוונה (ולא בטעות כמו שעשיתי ב-200 המשחקים הראשונים) זה גיים צ'יינג'ר.

אריחי אש עם זוהר אדום. משתמשים באחד במילה והוא מוחק את כל השורה. כל האותיות נעלמות, חדשות נופלות מלמעלה. אני אוהב להפעיל את אלה כשהלוח מרגיש עייף ונגמרו לי המילים הברורות. רענון מיידי.

אריחי קרח מנצנצים בכחול. כשמפעילים אחד, הוא מקפיא את האריחים שלידו במקום. הם לא זזים כשאריחים אחרים מתנקים. נשמע משעמם לעומת פיצוצים, נכון? טעות. להקפיא שילוב אותיות מעולה במקום כדי שתוכלו להשתמש בו במילה הבאה זה חזק ברמות מטורפות ברגע שמתחילים לעשות את זה בכוונה.

אריחי פצצה פועמים, והם האהובים עליי. הם מפוצצים הכל באזור 3x3 סביבם. תשעה אריחים הלכו, תשעה חדשים נופלים. כשהלוח מלא ק-ים וצ-ים בלי תנועה באופק, אריח פצצה הוא החבר הכי טוב שלכם.

אריחי ברק ניצוצות צהובים ומנקים עמודה שלמה. תשלבו אחד עם אריח אש באותה מילה ופשוט ניקיתם שורה שלמה ועמודה שלמה במכה אחת. המפל שבא אחרי זה כאוס יפהפה.

המהלך של מקצוענים אמיתיים: לבנות מילים שמכילות מספר אריחי אפקט. שני האפקטים מופעלים. פעם פגעתי במילה עם אש + פצצה וזה בעצם החליף חצי לוח. הקומבו שלי היה ברמה 6 והאריחים החדשים נתנו לי שלוש מילים קלות ברצף. זה החלום.`,
      },
      {
        title: 'להיכנס לאזור (אסטרטגיית שרשור)',
        content: `יש מצב שנכנסים אליו אחרי כמה מאות משחקי בלאסט שבו מילים פשוט... מופיעות. האצבעות מתחילות לזוז לפני שהמוח המודע בכלל קולט מה אתם מאייתים. הפעם הראשונה שזה קרה לי הגעתי לרמת קומבו 8 והידיים שלי ממש רעדו.

טעינה מוקדמת זה הכישרון. בזמן שהמילה הנוכחית עושה את האנימציה הקטנה של אימות, העיניים שלכם כבר צריכות להיות נעולות על המילה הבאה. עוקבים אחריה הרגע שהלוח מאפשר. עיניים מילה אחת לפני האצבעות, תמיד. אני לא יכול להגזים כמה זה חשוב. זה הכישרון של בלאסט.

אני משתמש במה שאני קורא חיץ 3 מילים. לפני שאני מגיש משהו, אני מזהה לפחות שלוש מילים קלות על הלוח. יורה את הראשונה, ובזמן שהיא מאומתת, מאשר את השנייה בראש. עד שהראשונה מתנקה ואריחים חדשים נופלים, מילה שלוש מוכנה לצאת. החיץ הזה נותן לי מרווח נשימה למצוא מילה רביעית בזמן שהידיים על טייס אוטומטי.

קצב גם חשוב. אני מחליף בין מילים קצרות וארוכות. מילה מהירה בת 3 אותיות לשמור על הקומבו, אז מילה שמנה בת 5-6 אותיות לנקודות גדולות עם המכפיל, ואז מיד חזרה למילה קצרה בזמן שאני סורק את הבאה. קצר-ארוך-קצר-ארוך. זה כמעט מוזיקלי ברגע שזה מתחיל לזרום.

תשמרו מילת חירום בכיס. ברצינות. אני תמיד יודע איפה לפחות מילה קלה אחת בת 3 אותיות על הלוח. אם אני מתרוקן, אני מגיש אותה כדי לקנות עוד חלון קומבו. הציל לי את השרשרת יותר פעמים ממה שאני יכול לספור.

וכשהקומבו נשבר (זה יקרה, אני עדיין מאבד קומבו כל הזמן), אל תיבהלו. קחו נשימה, השקיעו 2-3 שניות בסריקה, מצאו את שלוש מילות ההתחלה הבאות, ויאללה מחדש. שרשרת נקייה חדשה תמיד מנצחת הגשה נואשת של שטויות כדי להציל שרשרת גוססת.`,
      },
      {
        title: 'מהלכי בלאסט: תפסיקו לבזבז אותם',
        content: `פעם הייתי שורף את כל כוחות הערבוב והרמז שלי ב-30 השניות הראשונות של כל משחק. אסטרטגיה נוראית. תנו לי להציל אתכם מהטעויות שלי.

ערבוב מסדר מחדש את כל הלוח. תשתמשו רק כשהלוח באמת מת. כזה שסרקתם כל פינה ואין כלום. ובאופן קריטי, רק כשהקומבו כבר באפס. ערבוב באמצע קומבו הורג את השרשרת, וזה פשוט לזרוק נקודות לפח.

רמז מדגיש מילה שאפשר להגיש. מה שרוב האנשים עושים לא נכון: להשתמש ברמז ברמת קומבו 1 זה בעצם חסר ערך. תשמרו את זה לכשאתם ברמת קומבו גבוהה ומרגישים שזה מתחמק. רמז ברמה 6 או 7 לא סתם נותן לכם מילה, הוא שומר על המכפיל המסיבי שלכם. שם הערך האמיתי.

הקפאת זמן עוצרת את שעון המשחק לרגע. אני משתמש בזה כשיש קומבו טוב בבישול ואני צריך שנייה למצוא את המילה הבאה. אזהרה: טיימר הקומבו עדיין רץ במהלך הקפאה. אז אי אפשר סתם לשבת שם. צריכים למצוא ולהגיש מילה לפני שההקפאה נגמרת.

הכלל הכללי שלי: תתייחסו למהלכי בלאסט כאילו הם עולים בערך לאורך זמן. רמז ברמת קומבו 7 (מכפיל 4x) שווה פשוטו כמשמעו פי ארבע ממה שהוא שווה ברמה 1. תאגרו. תהיו קמצנים. התגמול על סבלנות הוא עצום.`,
      },
      {
        title: 'טריקים של ניקוד שהלוואי שידעתי קודם',
        content: `אחרי בערך 500 משחקים, התחלתי לשים לב לדפוסים שבאמת הזיזו את המחוג בניקוד שלי.

ברמת קומבו 7 ומעלה, התפקיד היחיד שלכם הוא לשמור על השרשרת חיה. תגישו כל דבר חוקי. לא אכפת לי אם זה "גם." מילה בת 3 אותיות במכפיל 5x זה 10 נקודות. מילה בת 6 אותיות בלי קומבו זה 5 נקודות. המכפיל הופך אפילו מילים זעירות ליקרות. אני קורא לזה גלישת קומבו וזה מאיפה באים הניקודים הגדולים באמת.

שרשור אפקטים זה הרמה הבאה. לפעמים מפל מאריח פצצה מוריד אריח אש למיקום מושלם. אם מצליחים לזהות את האפשרות הזאת לפני שהיא קורית ולתכנן מילה שפוגעת באריח האש במהלך הבא, אתם בעצם משחקים שחמט 4D. אני מצליח בזה אולי פעם כל עשרה משחקים. זה מספק ברמות מטורפות.

לפעמים המהלך הנכון הוא להגיש מילה בשביל מיקום על הלוח, לא נקודות. לנקות אריחים במקום אסטרטגי יכול לפתוח חלק שלם חדש של הלוח. אני חושב על זה כמו שחמט, להקריב מהלך בעל ערך נמוך כדי להכין משהו גדול יותר.

העצה הכי חשובה שלי: עקביות מוחצת שיאים. שחקן ששומר על קומבו רמה 4-5 לאורך כל המשחק ינקד יותר ממישהו שמגיע לרמה 8 פעם אחת ומשחק את השאר ברמות 1-2. אני עוקב אחרי רמת הקומבו הממוצעת שלי עכשיו, לא השיא. שינוי הגישה הזה דחף את הניקוד שלי יותר מכל טכניקה בודדת.`,
      },
    ],
    faq: [
      {
        question: 'איך עובדת מערכת הקומבו במצב בלאסט של לקסיקלאש?',
        answer: 'מגישים מילים ברצף בתוך חלון זמן שמתכווץ. כל מילה רצופה מעלה את רמת הקומבו, שמגדילה את מכפיל הניקוד מ-1x עד 5x+ ברמה 8. החלון מתחיל ב-3 שניות נוחות אבל מתכווץ לשנייה אחת ברמות הגבוהות. זה נהיה אינטנסיבי.',
      },
      {
        question: 'מה הם אפקטי אריחים במצב בלאסט?',
        answer: 'אריחים מיוחדים שעושים משהו דרמטי כשמשתמשים בהם במילה. אריחי אש מוחקים שורה שלמה, קרח מקפיא שכנים במקום, פצצה מפוצצת אזור 3x3, וברק מנקה עמודה שלמה. אם מצליחים לפגוע בשני אריחי אפקט במילה אחת, שניהם מופעלים. כאוס מוחלט בצורה הכי טובה.',
      },
      {
        question: 'עדיף למצוא מילים ארוכות או לשמור על קומבו?',
        answer: 'לשמור על קומבו, כמעט תמיד. המתמטיקה ברורה בזה: מילה זעירה בת 3 אותיות ברמת קומבו 5 (3x = 6 נקודות) מנצחת מילה מפוארת בת 6 אותיות ברמה 1 (5 נקודות). תשתמשו במילים קצרות כדבק קומבו בזמן שסורקים ארוכות יותר. המכפיל הוא הכל.',
      },
      {
        question: 'מתי כדאי להשתמש במהלכי בלאסט כמו ערבוב ורמז?',
        answer: 'מאוחר ובצמצום. רמז ברמת קומבו 7 שווה פי ארבע ממה שהוא שווה ברמה 1 כי הוא שומר על המכפיל. ערבוב רק כשהלוח באמת מת והקומבו כבר באפס. תחשבו על מהלכי בלאסט כהשקעות שעולות בערך ככל שמחכים.',
      },
    ],
    ctaText: 'יאללה לנסות בלאסט',
    ctaLink: '/singleplayer',
    backToGuides: 'חזרה למדריכים',
  },
  sv: {
    title: 'Blast-läge: Kombos, Kedjor och Hur Jag Slutade Choka på Nivå 7',
    subtitle: 'Allt jag lärt mig om kombos, platteffekter och att inte gå i stå efter 1 000+ bräden.',
    category: 'Strategi',
    readTime: '9 min läsning',
    authorName: 'Ordnörden',
    authorBio: 'Har rensat över 1 000 Blast-bräden och nått kombinivå 15+. Handerna skakade de första gångerna.',
    quickTips: [
      'Hastighet över allt. Ditt nästa ord är viktigare än ditt bästa ord.',
      'Spara redan nästa ord medan det nuvarande valideras. Den här vanan ändrade mina poäng totalt.',
      'Korta ord (3-4 bokstäver) är kombolim. Jag brukade ignorera dem. Enormt misstag.',
      'Eldplattor rensar rader, is fryser grannar, bomber spränger 3x3. Lär dig vad varje färg betyder.',
      'Kombofönstret krymper till 1 sekund på höga nivåer. Har du inte ett reservord redo är du körd.',
      'Innan du skickar något, hitta 3-4 lätta ord först. Den landningsbanan räddar dig.',
      'Längre ord ger större kombotimer-återställning. Bra för att hämta andan mitt i en kedja.',
    ],
    comboTable,
    sections: [
      {
        title: 'Varför Blast-läge Körde Sönder Min Hjärna (På Ett Bra Sätt)',
        content: `Jag spelade Klassiskt läge i månader innan jag provade Blast. Trodde jag var ganska bra på ordspel. Sen spelade jag min första Blast-runda och fick typ 200 poäng. Ödmjukande är för milt uttryckt.

Det som gör Blast helt annorlunda: det finns ett kombosystem som kör under allt. Du skickar ett ord, en timer börjar ticka. Få in ett till ord innan den går ut så går din multiplikator upp. Missa fönstret och du är tillbaka på 1x. Enkelt koncept. Otroligt svårt att göra bra.

Det här vänder upp ordspelsstrategi totalt. I Klassiskt läge kunde jag gladligen lägga 15 sekunder på att jaga ett underbart 7-bokstavsord. I Blast hade de 15 sekundernas tystnad mordat en kombokedja värd mycket mer poäng. Det handlar inte om att hitta det bästa ordet längre. Det handlar om att aldrig sluta.

Oja, och så finns det speciella platteffekter. Eld, is, bomber, blixt. De spränger delar av brädet och regnar ner färska bokstäver. Första gången jag av misstag utlöste en bombplatta mitt i en kombokedja tror jag att jag faktiskt skrek högt. Vi kommer till dem.`,
      },
      {
        title: 'Hur Kombosystemet Faktiskt Fungerar',
        content: `OK låt mig bryta ner kombomatten, för när jag väl fattade siffrorna andrades hela min approach.

Du skickar ett ord, du är på kombinivå 1. Det är bara 1x, inget speciellt. Få in ett till ord inom 3 sekunder och du hoppar till nivå 2 (1.5x). Fortsatt: nivå 3 är 2x, nivå 4 är 2.5x, nivå 5 är 3x. Det fortsatter uppåt därifrån.

Men den otäcka delen: kombofönstret krymper när du klattrar. På nivå 2 får du bekväma 3 sekunder. Vid nivå 5 är det nere på 1.5 sekunder. Nivå 7 och uppåt? En. Enda. Sekund. Dina fingrar måste veta vad de gör, för hjärnan hinner inte diskutera.

Nu grejen som sprangde mitt sinne när jag väl räknade. Sag att du hittar ett fint 5-bokstavsord värt 4 baspoäng. På kombinivå 5 med 3x multiplikator är det 12 poäng. Solitt, eller hur? Men tänk om du istället hade avfyrat fyra snabba 3-bokstavsord (2 baspoäng var) på nivåer 2 till 5? Det är 2 + 3 + 4 + 5 = 14 poäng. OCH din kombo lever fortfarande för vad som än kommer härnäst.

Jag ska våra ärlig, det här var kontraintuitivt för mig länge. Min ordspelshjärna skrek "hitta det stora ordet!" Men matten ljuger inte. Att halla kedjor vid liv med korta ord mellan stora fynd slår att jaga ett perfekt ord nästan varje gång.`,
      },
      {
        title: 'Platteffekter (Därför Skrek Jag Precis Aat Min Telefon)',
        content: `Specialplattor dyker upp på brädet med små visuella ledtrådar. Att lära sig känna igen dem snabbt och använda dem medvetet (inte av misstag som jag gjorde mina första 200 matcher) är en game changer.

Eldplattor här en röd glöd. Använd en i ett ord och den utplanar hela raden. Alla bokstäver försvinner, nya faller ner ovanifrån. Jag älskar att trigga dem när brädet känns uttorkat och jag här ont om uppenbara ord. Omedelbar uppfräschning.

Isplattor skimrar blått. När du triggar en fryser den plattorna intill på plats. De rör sig inte när andra plattor rensas. Later trakigt jämfört med explosioner, eller hur? Fel. Att frysa en killer-bokstavskombination på plats så du kan använda den i nästa ord är löjligt kraftfullt när du väl börjar gora det med flit.

Bombplattor pulserar, och de är mina favoriter. De spränger allt i ett 3x3-område runt dem. Nio plattor borta, nio färska plattor faller ner. När brädet är en röra av Q:n och X utan vokaler i sikte är en bombplatta din bästa vän.

Blixtplattor gnistar gult och rensar en hel kolumn. Kombinera en med en eldplatta i samma ord och du rensade precis en hel rad OCH en hel kolumn i ett drag. Kaskaden som följer är vackert kaos.

Det riktiga profsdraget: bygg ord som innehåller flera effektplattor. Båda effekterna triggas. Jag traffade en gång ett ord med eld + bomb och det ersatte i princip halva brädet. Min kombo var på nivå 6 och de färska plattorna gav mig tre lätta ord i rad. Det är drommen.`,
      },
      {
        title: 'Att Komma In I Zonen (Kedjestrategi)',
        content: `Det finns ett tillstånd du hamnar i efter några hundra Blast-matcher där ord bara... dyker upp. Fingrarna börjar röra sig innan det medvetna tänkandet ens registrerar vad du stavar. Första gången det hande mig nådde jag kombinivå 8 och handerna skakade bokstavligt talat.

Forladda är färdigheten. Medan ditt nuvarande ord gör sin lilla valideringsanimation borde dina ögon redan våra låsta på nästa ord. Du sparar det i samma sekund brädet låter dig. Ögon ett ord fore fingrarna, alltid. Jag kan inte överdriva hur mycket det här spelar roll. Det ÄR Blast-läge-färdigheten.

Jag använder vad jag kallar 3-Ords Bufferten. Innan jag skickar något hittar jag minst tre lätta ord på brädet. Jag avfyrar det första, och medan det valideras bekraftar jag det andra i huvudet. När det första rensar och nya plattor faller är ord tre redo att kora. Den bufferten ger mig andrum att hitta ord fyra medan handerna är på autopilot.

Rytm spelar roll också. Jag växlar korta och långa ord. Snabbt 3-bokstavsord för att halla komboen vid liv, sen ett bastant 5-6 bokstavsord för stora poäng med multiplikatorn, sen direkt tillbaka till ett kort ord medan jag skannar efter nästa stora. Kort-långt-kort-långt. Det är nästan musikaliskt när det flyter.

Håll ett nödord i bakfickan. På riktigt. Jag vet alltid var minst ett lätt 3-bokstavsord finns på brädet. Om jag blankar skickar jag det ordet för att köpa ett nytt kombofönster. Här räddat min kedja fler gånger än jag kan räkna.

Och när din kombo går sönder (det kommer handa, jag tappar fortfarande kombos konstant), få inte panik. Andas. Lägg 2-3 sekunder på att skanna. Hitta dina nästa tre startord. Kör igen. En ren ny kedja slår alltid att desperat skicka skrap för att försöka rädda en döende.`,
      },
      {
        title: 'Blast-drag: Sluta Slösa Dem',
        content: `Jag brukade elda igenom mina Blanda- och Ledtrad-krafter under de första 30 sekunderna varje match. Usel strategi. Låt mig rädda dig från mina misstag.

Blanda omarrangerar hela brädet. Använd bara när brädet är genuint dott. Typ, du här skannat varje hörn och det finns ingenting. Och kritiskt, blanda bara när din kombo redan är noll. Att blanda mitt i en kombo dödar din kedja, och det är att kasta bort poäng.

Ledtråd markerar ett ord du kan skicka. Det de flesta gör fel: att använda en Ledtråd på kombinivå 1 är i princip värdelöst. Spara den till när du är på hog kombinivå och känner att den glider ivag. En Ledtråd på nivå 6 eller 7 ger dig inte bara ett ord, den bevarar din massiva multiplikator. Där ligger det riktiga värdet.

Tidsfrys pausar spelklockan ett tag. Jag använder den när jag här en bra kombo på gång och behöver en sekund att hitta nästa ord. Varning dock: kombotimern kör fortfarande under en frys. Så du kan inte bara sitta där. Du måste hitta och skicka ett ord innan frysen tar slut.

Min generella regel: behandla Blast-drag som att de ökar i värde över tid. En Ledtråd på kombinivå 7 (4x multiplikator) är bokstavligen vard fyra gånger mer än på nivå 1. Hamstra dina drag. Var snål. Utdelningen för tålamod är enorm.`,
      },
      {
        title: 'Poängtrick Jag Önskade Att Jag Visste Tidigare',
        content: `Efter ungefär 500 matcher började jag märka mönster som faktiskt flyttade nålen på mina poäng.

På kombinivå 7 och uppåt är ditt enda jobb att halla kedjan vid liv. Skicka vad som helst giltigt. Jag bryr mig inte om det är "den." Ett 3-bokstavsord med 5x multiplikator är 10 poäng. Ett 6-bokstavsord utan kombo är 5 poäng. Multiplikatorn gör även små ord värdefulla. Jag kallar det kombosurfning och det är där de riktigt stora poängen kommer från.

Effektkedjning är nästa nivå. Ibland droppar en bomb-kaskad en eldplatta på precis rätt ställe. Om du kan se den möjligheten innan den händer och planera ett ord som träffar eldplattan på nästa drag spelar du i princip 4D-schack. Jag lyckas med det kanske en gång per tio matcher. Det är otroligt tillfredsställande.

Ibland är det ratta draget att skicka ett ord för bradposition, inte poäng. Att rensa plattor på en strategisk punkt kan öppna en helt ny del av brädet. Jag tänker på det som schack, offra ett lågvärdes-drag för att stå upp något större.

Mitt viktigaste rad: konsekvens krossar toppar. En spelare som håller kombinivå 4-5 genom hela matchen kommer överpoänga någon som när nivå 8 en gång och spelar resten på 1-2. Jag följer mitt genomsnittliga kombinivå nu, inte mitt toppvarde. Den mentalitetsändringen pushade mina poäng mer än någon enskild teknik.`,
      },
    ],
    faq: [
      {
        question: 'Hur fungerar kombosystemet i LexiClash Blast-läge?',
        answer: 'Du skickar ord i följd inom ett krympande tidsfönster. Varje nytt ord bumpar din kombinivå, som ökar din poängmultiplikator från 1x hela vägen upp till 5x+ på nivå 8. Fonstret börjar på bekväma 3 sekunder men krymper till bara 1 sekund på de högsta nivåerna. Det blir intensivt.',
      },
      {
        question: 'Vad är platteffekter i Blast-läge?',
        answer: 'Specialplattor som gör något dramatiskt när du använder dem i ett ord. Eldplattor utplanar en hel rad, isplattor fryser grannar på plats, bombplattor spränger ett 3x3-område, och blixtplattor rensar en hel kolumn. Lyckas du traffa två effektplattor i ett ord triggas bada. Totalt kaos på bästa sätt.',
      },
      {
        question: 'Är det bättre att hitta långa ord eller halla kombos igång?',
        answer: 'Håll kombos igång, nästan alltid. Matten är tydlig: ett litet 3-bokstavsord på kombinivå 5 (3x = 6 poäng) slår ett fint 6-bokstavsord på nivå 1 (5 poäng). Använd korta ord som kombolim medan du skannar efter längre. Multiplikatorn är allt.',
      },
      {
        question: 'När ska jag använda Blast-drag som Blanda och Ledtrad?',
        answer: 'Sent och sparsamt. En Ledtråd på kombinivå 7 är vard fyra gånger mer än på nivå 1 för att den bevarar din multiplikator. Blanda bara när brädet är genuint dott och din kombo redan är borta. Tänk på dina Blast-drag som investeringar som ökar i värde ju längre du vantar.',
      },
    ],
    ctaText: 'Testa Blast-läge',
    ctaLink: '/singleplayer',
    backToGuides: 'Tillbaka till guider',
  },
  ja: {
    title: 'ブラストモード攻略：コンボと爆発とハイスコアの話',
    subtitle: 'コンボの仕組み、タイルエフェクトの使い方、レベル7で詰まない方法。1,000ボード以上やって学んだことを全部書きます。',
    category: '攻略',
    readTime: '9分で読める',
    authorName: 'ワードオタク',
    authorBio: 'ブラストモードで1,000ボード以上クリアしてコンボレベル15+に到達した人。手が震えた回数は数え切れません。',
    quickTips: [
      'スピードが全て。次の単語は今の単語より大事。',
      '今の単語が検証されてる間にもう次をたどってる。この習慣だけでスコアが激変しました。',
      '短い単語（3-4文字）はコンボの接着剤。昔はバカにしてた。大間違いだった。',
      'ファイアタイルは行クリア、アイスは隣を凍結、ボムは3x3爆発。光り方を覚えよう。',
      'コンボウィンドウは高レベルで1秒まで縮む。次の単語の準備がなかったら終わり。',
      '何も送信する前に、簡単な単語を3-4個見つけておく。この助走が命を救います。',
      '長い単語はコンボタイマーを多めにリセットしてくれる。息継ぎに最適。',
    ],
    comboTable,
    sections: [
      {
        title: 'ブラストモードに脳を壊された話（いい意味で）',
        content: `クラシックモードを何ヶ月もやってからブラストに手を出しました。自分はワードゲームけっこうイケてると思ってたんですよ。初めてのブラストラウンドのスコア、200点くらい。謙虚になりました。

ブラストが全然違う理由：裏でコンボシステムが動いてます。単語を送信するとタイマーが始まって、切れる前にもう1つ送信すると倍率が上がる。切れたら1xに逆戻り。コンセプトはシンプル。でも実際にうまくやるのは死ぬほど難しい。

これでワードゲームの戦略が完全にひっくり返ります。クラシックだったら15秒かけてキレイな7文字の単語を探しても全然OK。ブラストでその15秒沈黙したら、はるかに価値の高いコンボチェーンが死にます。もう「一番いい単語を探す」ゲームじゃない。「絶対に止まらない」ゲームなんです。

あと、特殊タイルエフェクトもあります。ファイア、アイス、ボム、ライトニング。ボードの一部を吹き飛ばして新しい文字が降ってくる。初めてコンボ中にうっかりボムタイルを発動した時、たぶん声出ました。その話は後で。`,
      },
      {
        title: 'コンボシステムの仕組みを本気で解説',
        content: `コンボの計算を実際に理解してから、僕のアプローチは完全に変わりました。ちゃんと説明させてください。

単語を送信するとコンボレベル1。1x倍率で、特に何もない。3秒以内にもう1つ送信するとレベル2（1.5x）。続けて：レベル3は2x、レベル4は2.5x、レベル5は3x。どんどん上がります。

でもエグいのはここから：コンボウィンドウがレベルと共に縮む。レベル2は余裕の3秒。レベル5で1.5秒。レベル7以上？たった1秒。指が何をすべきか分かってないとダメです。脳が考える時間なんてありません。

計算してみて衝撃を受けたのがこれ。5文字の単語、ベース4ポイント。コンボレベル5の3x倍率で12ポイント。悪くないですよね？でもその代わりに3文字の短い単語を4連発（ベース2ポイント）でレベル2〜5を駆け上がると？2+3+4+5=14ポイント。しかもコンボはまだ生きてて次に続く。

正直、これは長い間ピンと来なかった。ワードゲーム脳が「大きい単語を探せ！」って叫び続けるんです。でも数字は嘘をつかない。短い単語でチェーンをつなぎながら大物を探す方が、1つの完璧な単語を狩るよりほぼ常に強いです。`,
      },
      {
        title: 'タイルエフェクト（スマホに叫んだ理由）',
        content: `特殊タイルはボード上で視覚的にちょっと違って見えます。これを素早く見分けて、意図的に使えるようになることが大事です。最初の200ゲームくらいは偶然発動してただけでしたけど。

ファイアタイル：赤く光ってます。単語に使うと行丸ごと消滅。全部消えて上から新しい文字が落ちてくる。ボードがマンネリ化して単語が見つからない時に発動すると最高。一瞬でリフレッシュ。

アイスタイル：青くキラキラしてます。発動すると隣のタイルが凍って動かなくなる。爆発と比べると地味に聞こえる？でも違います。次の単語で使いたい文字の組み合わせをその場に固定できるの、意図的にやり始めるとヤバいくらい強い。

ボムタイル：脈動してて、僕の一番のお気に入り。3x3エリアを吹っ飛ばす。9タイル消えて、9つの新しいタイルが降ってくる。QとXだらけで母音がどこにもないボード？ボムタイルが親友です。

ライトニングタイル：黄色い火花。列丸ごとクリア。ファイアタイルと同じ単語で使うと行と列を同時にクリアできます。その後のカスケードは美しいカオス。

真のプロ技：複数のエフェクトタイルを1つの単語に入れる。両方発動します。一度ファイア+ボムの単語を打った時、ボードの半分が入れ替わりました。コンボレベル6の状態で、新しいタイルから3つの簡単な単語が連続で見つかった。これが夢です。`,
      },
      {
        title: 'ゾーンに入る方法（チェーン戦略）',
        content: `数百ゲームやってると、単語が勝手に見える状態に入る瞬間があります。意識する前に指が動いてる。初めてこれが起きた時、コンボレベル8に到達して、手がガチで震えました。

プリローディング。これがスキルの核心。今の単語が検証アニメーション中に、目はもう次の単語をロックオンしてるべき。ボードが操作可能になった瞬間にたどり始める。目は常に指より1単語先。これがどれだけ大事か、いくら強調しても足りない。ブラストモードの「ザ・スキル」です。

僕は「3単語バッファ」を使ってます。何も送信する前に、簡単な単語を最低3つ見つける。1つ目を送信して、検証中に2つ目を頭の中で確認。1つ目がクリアされて新しいタイルが落ちてくる頃には、3つ目の準備ができてる。このバッファがある間に4つ目を探す余裕が生まれます。

リズムも大事。短い単語と長い単語を交互にする。短い3文字でコンボをつないで、次に5-6文字の大物で倍率を活かす。そしてすぐ短い単語に戻って次の大物を探す。短-長-短-長。リズムに乗ると、ほぼ音楽みたいになります。

あと、緊急用の単語を常にポケットに入れておく。マジで。ボード上の簡単な3文字の単語の場所を常に把握してます。頭が真っ白になったらそれを送信してコンボウィンドウを稼ぐ。これでチェーンが何回救われたか数え切れません。

コンボが切れた時（切れます。僕もまだしょっちゅう落とす）、パニックしない。一呼吸置いて、2-3秒スキャンして、次のスターター3単語を見つけて、再スタート。新しいクリーンなチェーンは、死にかけのチェーンをデタラメな単語で無理やり延命するより常にマシです。`,
      },
      {
        title: 'ブラストムーブの無駄遣いをやめよう',
        content: `昔の僕はシャッフルとヒントを毎ゲーム開始30秒で使い切ってました。最悪の戦略です。僕の失敗から学んでください。

シャッフル：ボード全体を並べ替えます。ボードが本当にもう何もない時だけ使う。角の隅々までスキャンして、それでもダメな時。そして重要：コンボがゼロの時だけシャッフルする。コンボ中のシャッフルはチェーンを殺します。ポイントを捨ててるのと同じ。

ヒント：送信できる単語をハイライトしてくれます。でもほとんどの人が間違えるポイント：コンボレベル1でヒントを使ってもほぼ無意味。コンボが高くて、落ちそうな時のために取っておく。レベル6か7でヒントを使うと、単語をくれるだけじゃなくて、超高い倍率を守ってくれる。そこに本当の価値がある。

タイムフリーズ：ゲームの時計を一時停止。良いコンボが走ってて、次の単語を見つける時間がもうちょっと欲しい時に使います。ただし注意：フリーズ中もコンボタイマーは動いてます。のんびり座ってられない。フリーズが終わる前に単語を見つけて送信する必要がある。

僕の基本ルール：ブラストムーブは時間と共に価値が上がるもの。コンボレベル7（4x倍率）でのヒントは、文字通りレベル1の4倍の価値があります。溜め込んで。ケチになって。我慢した分のリターンは巨大です。`,
      },
      {
        title: 'もっと早く知りたかったスコアのコツ',
        content: `500ゲームくらいやった後、スコアに本当に効くパターンが見えてきました。

コンボレベル7以上では、唯一の仕事はチェーンを生かし続けること。何でもいいから有効な単語を送信する。「the」でも構わない。5x倍率の3文字の単語は10ポイント。コンボなしの6文字の単語は5ポイント。倍率のおかげで短い単語でも価値が出る。これを「コンボサーフィン」と呼んでて、本当に大きいスコアはここから生まれます。

エフェクトチェーンは次のレベル。ボムタイルのカスケードでファイアタイルがちょうどいい場所に落ちることがある。それが起こる前に気づいて、次の手でファイアタイルを使う単語を計画できたら、もう4次元チェスです。10ゲームに1回くらい成功します。最高に気持ちいい。

ポイントのためじゃなくて「ボードの配置」のために単語を送信することもある。戦略的な場所のタイルをクリアすると、ボードの新しいセクションが開く。チェスの犠牲みたいなもの。低価値の手を打って、もっと大きい何かをセットアップする。

実績や報酬のスコア閾値を把握しておく。980ポイントの時にリラックスしてる場合じゃない。1,000まで頑張れ。報酬の差があるから。

一番大事なアドバイス：安定感はピークに勝つ。ゲーム全体でコンボレベル4-5をキープするプレイヤーは、一度レベル8に到達しても残りをレベル1-2でプレイする人を常に上回ります。僕は今、ピークじゃなくて平均コンボレベルを追ってます。この考え方の転換が、どの個別テクニックよりもスコアを伸ばしました。`,
      },
    ],
    faq: [
      {
        question: 'LexiClashブラストモードのコンボシステムってどういう仕組み？',
        answer: '縮んでいく時間ウィンドウの中で単語を連続送信して、コンボレベルを上げていきます。レベルが上がるとスコア倍率も上がって、1xからレベル8の5x+まで。ウィンドウは最初3秒だけど、高レベルだとたった1秒。なかなかエグいです。',
      },
      {
        question: 'ブラストモードのタイルエフェクトって何？',
        answer: '単語に使うとド派手なことが起きる特殊タイルです。ファイアは行丸ごと消す、アイスは隣のタイルを凍結、ボムは3x3エリアを爆破、ライトニングは列丸ごとクリア。1つの単語で2つのエフェクトタイルを使うと両方発動します。最高のカオス。',
      },
      {
        question: '長い単語を探すのとコンボを維持するの、どっちが大事？',
        answer: 'コンボ維持、ほぼ常に。計算がハッキリしてます：コンボレベル5の3文字の単語（3x = 6ポイント）はレベル1の6文字の単語（5ポイント）に勝つ。短い単語をコンボの接着剤にしながら長い単語を探す。倍率がすべてです。',
      },
      {
        question: 'シャッフルやヒントはいつ使うべき？',
        answer: 'ケチになってください。ヒントはコンボが高い時に使う。レベル7の4x倍率でのヒントはレベル1の4倍の価値。シャッフルはボードが完全に死んでて、かつコンボがゼロの時だけ。我慢した分のリターンがデカいです。',
      },
    ],
    ctaText: 'ブラストモードやってみよう',
    ctaLink: '/singleplayer',
    backToGuides: 'ガイドに戻る',
  },
  es: {
    title: 'Modo Blast: Combos, cadenas y como deje de ser malisimo',
    subtitle: 'Todo lo que he aprendido sobre combos, efectos de fichas y no arruinarlo todo en nivel 7 despues de 1.000+ tableros.',
    category: 'Estrategia',
    readTime: '9 min de lectura',
    authorName: 'El Nerd de las Palabras',
    authorBio: 'Fanatico del modo Blast. He limpiado mas de 1.000 tableros y llegue a combo nivel 15+. Mi presion arterial no lo agradece.',
    quickTips: [
      'Velocidad sobre todo. Tu siguiente palabra importa mas que tu mejor palabra.',
      'Ya deberias estar trazando la siguiente mientras la actual se valida. Este solo habito me cambio los puntajes por completo.',
      'Palabras cortas (3-4 letras) son el pegamento del combo. Yo las ignoraba. Error garrafal.',
      'Las fichas de fuego limpian filas, hielo congela vecinos, bomba explota areas 3x3. Aprende que significa cada brillo.',
      'La ventana de combo baja a 1 segundo en niveles altos. Si no tienes una palabra de respaldo lista, ya fuiste.',
      'Antes de mandar nada, localiza 3-4 palabras faciles. Esa pista de despegue te salva.',
      'Palabras largas te dan un reinicio mas generoso del timer de combo. Genial para tomar aire a media cadena.',
    ],
    comboTable,
    sections: [
      {
        title: 'Por que el modo Blast me frío el cerebro (en el buen sentido)',
        content: `Jugue modo Clasico durante meses antes de probar Blast. Pensaba que era bastante bueno en juegos de palabras. Entonces jugue mi primera ronda de Blast y saque como 200 puntos. Humillante se queda corto.

Lo que hace a Blast completamente diferente: hay un sistema de combos corriendo debajo de todo. Mandas una palabra, un temporizador empieza a correr. Metes otra palabra antes de que expire y tu multiplicador sube. Se te pasa la ventana y vuelves a 1x. Concepto simple. Increiblemente dificil de ejecutar bien.

Esto voltea la estrategia de juegos de palabras de cabeza. En modo Clasico, yo felizmente pasaba 15 segundos cazando una hermosa palabra de 7 letras. En Blast, esos 15 segundos de silencio asesinarían una cadena de combo que valia mucho mas puntos. Ya no se trata de encontrar la mejor palabra. Se trata de nunca parar.

Ah, y tambien hay efectos de fichas especiales. Fuego, hielo, bombas, rayos. Explotan secciones del tablero y llueven letras nuevas. La primera vez que accidentalmente active una ficha bomba durante una racha de combo, creo que grite en voz alta. Ya llegaremos a eso.`,
      },
      {
        title: 'Como funciona realmente el sistema de combos',
        content: `OK dejame desglosar las matematicas del combo, porque una vez que realmente entendi los numeros, todo mi enfoque cambio.

Mandas una palabra, estas en combo nivel 1. Eso es solo 1x, nada especial. Metes otra dentro de 3 segundos y saltas a nivel 2 (1.5x). Sigue: nivel 3 es 2x, nivel 4 es 2.5x, nivel 5 es 3x. Y sigue subiendo.

Pero la parte cruel: la ventana de combo se achica conforme subes. En nivel 2 tienes unos comodos 3 segundos. Para nivel 5 baja a 1.5 segundos. Nivel 7 en adelante? Un. Solo. Segundo. Tus dedos mas vale que sepan lo que hacen, porque tu cerebro no va a tener tiempo de deliberar.

Ahora lo que me volo la cabeza cuando finalmente hice las cuentas. Digamos que ves una bonita palabra de 5 letras que vale 4 puntos base. En combo nivel 5 con multiplicador 3x, son 12 puntos. Nada mal, no? Pero que tal si en vez de eso hubieras disparado cuatro palabras rapidas de 3 letras (2 puntos base cada una) en niveles 2 al 5? Eso es 2 + 3 + 4 + 5 = 14 puntos. Y TODAVIA tienes tu combo vivo para lo que venga despues.

Voy a ser honesto, esto fue contraintuitivo para mi durante mucho tiempo. Mi cerebro de jugador de palabras seguia gritando "encuentra la palabra grande!" Pero las matematicas no mienten. Mantener cadenas vivas con palabras cortas entre hallazgos grandes le gana a cazar una palabra perfecta casi siempre.`,
      },
      {
        title: 'Efectos de fichas (o por que acabo de gritarle a mi telefono)',
        content: `Las fichas especiales aparecen en el tablero con senales visuales. Aprender a detectarlas rapido y usarlas a proposito (no por accidente como yo hice mis primeras 200 partidas) lo cambia todo.

Fichas de Fuego tienen un brillo rojo. Usa una en una palabra y arrasa toda la fila. Todas esas letras desaparecen, letras nuevas caen desde arriba. Me encanta activar estas cuando el tablero se siente estancado y me estoy quedando sin palabras obvias. Refresco instantaneo.

Fichas de Hielo brillan azul. Cuando las activas, congela las fichas de al lado en su lugar. No se mueven cuando otras fichas se limpian. Suena aburrido comparado con explosiones, no? Pues no. Congelar una combinacion de letras genial en su sitio para usarla en tu siguiente palabra es ridiculamente poderoso una vez que empiezas a hacerlo a proposito.

Fichas de Bomba pulsan, y son mis favoritas. Explotan todo en un area 3x3 alrededor. Nueve fichas fuera, nueve fichas frescas cayendo. Cuando el tablero es un desastre de Q y X sin vocales a la vista, una ficha bomba es tu mejor amiga.

Fichas de Rayo brillan amarillo y limpian una columna entera. Combina una con una ficha de fuego en la misma palabra y acabas de limpiar una fila Y una columna de un solo golpe. La cascada que sigue es un hermoso caos.

La jugada pro de verdad: arma palabras que contengan multiples fichas de efecto. Ambos efectos se activan. Una vez le di a una palabra con fuego + bomba y basicamente reemplazo medio tablero. Mi combo estaba en nivel 6 y las fichas nuevas me dieron tres palabras faciles seguidas. Ese es el sueno.`,
      },
      {
        title: 'Entrar en la zona (estrategia de cadena)',
        content: `Hay un estado al que llegas despues de unos cientos de partidas de Blast donde las palabras simplemente... aparecen. Tus dedos empiezan a moverse antes de que tu cerebro consciente registre lo que estas deletreando. La primera vez que me paso llegue a combo nivel 8 y mis manos estaban literalmente temblando.

La pre-carga es la habilidad. Mientras tu palabra actual hace su animacion de validacion, tus ojos ya deberian estar pegados a tu siguiente palabra. La trazas en el instante en que el tablero te deja. Ojos una palabra adelante de tus dedos, siempre. No puedo exagerar cuanto importa esto. ES la habilidad del modo Blast.

Yo uso lo que llamo el Buffer de 3 Palabras. Antes de mandar nada, localizo al menos tres palabras faciles en el tablero. Disparo la primera, y mientras se valida, estoy confirmando la segunda en mi cabeza. Para cuando la primera se limpia y caen fichas nuevas, la palabra tres esta lista para ir. Ese buffer me da espacio para encontrar la cuatro mientras mis manos van en automatico.

El ritmo tambien importa. Alterno entre cortas y largas. Palabra rapida de 3 letras para mantener el combo vivo, luego una jugosa de 5-6 letras para puntos grandes con el multiplicador, luego inmediatamente de vuelta a una corta mientras busco la siguiente grande. Corta-larga-corta-larga. Es casi musical cuando lo agarras.

Ten siempre una palabra de emergencia en el bolsillo. En serio. Yo siempre se donde esta al menos una palabra facil de 3 letras en el tablero. Si me quedo en blanco, mando esa palabra para comprarme otra ventana de combo. Me ha salvado la cadena mas veces de las que puedo contar.

Y cuando tu combo se rompe (va a pasar, yo todavia pierdo combos constantemente), no entres en panico. Respira, pasa 2-3 segundos escaneando, encuentra tus siguientes tres palabras iniciadoras, y arranca de nuevo. Una cadena nueva limpia siempre le gana a mandar basura desesperadamente tratando de salvar una que se muere.`,
      },
      {
        title: 'Leyendo un tablero que no para de moverse',
        content: `Esto me complico durante mucho tiempo. En modo Clasico el tablero simplemente se queda ahi educadamente. En modo Blast esta vivo. Fichas se limpian, caen, aparecen. Tienes que leer un tablero que esta cambiando constantemente debajo de ti.

Consejo principal: concentrate en el tercio inferior. La gravedad jala las fichas nuevas hacia abajo, asi que la parte baja del tablero es la zona mas estable. Tus palabras ancla deberian vivir ahi abajo. La parte de arriba es caos, constantemente refrescandose con fichas nuevas.

Empieza a observar las cascadas. Cuando las fichas se limpian, todo lo de arriba cae, y letras frescas aparecen en la cima. Los buenos jugadores reaccionan a como se ve el tablero despues de que se asienta el polvo. Los grandes jugadores lo predicen. Si sabes que una ficha de fuego esta por limpiar una fila, ya puedes estar planeando que palabras podrian formarse cuando fichas nuevas llenen ese hueco. La verdad no soy genial en esto todavia. Pero las veces que lo he logrado se sintio increible.

Busca areas donde consonantes y vocales estan bien mezcladas. Ahi es donde estan las palabras. Si ves una esquina con cuatro consonantes apretadas, no pierdas tiempo mirandola.

Una ultima cosa: las fichas nuevas tienen un breve destello cuando entran al tablero. Entrena tus ojos para saltar a ese destello inmediatamente. Fichas frescas crean combinaciones que no existian hace un segundo, y frecuentemente son las palabras mas faciles del tablero porque nadie (incluyendote) ya paso la vista por encima de ellas.`,
      },
      {
        title: 'Movimientos Blast: deja de desperdiciarlos',
        content: `Yo gastaba mis poderes de Mezclar y Pista en los primeros 30 segundos de cada partida. Pesima estrategia. Dejame ahorrarte mis errores.

Mezclar reorganiza todo el tablero. Solo usalo cuando el tablero esta genuinamente muerto. O sea, escaneaste cada esquina y no hay nada. Y lo critico: solo mezcla cuando tu combo ya esta en cero. Mezclar a mitad de combo mata tu cadena, y eso es tirar puntos a la basura.

Pista resalta una palabra que puedes mandar. Lo que la mayoria no entiende: usar una Pista en combo nivel 1 es basicamente inutil. Guardala para cuando estes en un combo alto y sientas que se te escapa. Una Pista en nivel 6 o 7 no solo te da una palabra, preserva tu multiplicador masivo. Ahi es donde esta el valor real.

Congelacion de Tiempo pausa el reloj del juego un momento. Yo la uso cuando tengo un buen combo cocinandose y necesito un segundo para encontrar mi siguiente palabra. Pero ojo: el temporizador de combo SIGUE corriendo durante la congelacion. Asi que no puedes quedarte ahi sentado. Necesitas encontrar y mandar una palabra antes de que termine.

Mi regla general: trata los movimientos Blast como si se apreciaran con el tiempo. Una Pista en combo nivel 7 (multiplicador 4x) literalmente vale cuatro veces lo que vale en nivel 1. Acumula tus movimientos. Se tacano. La recompensa por la paciencia es enorme.`,
      },
      {
        title: 'Trucos de puntaje que ojala hubiera sabido antes',
        content: `Despues de como 500 partidas, empece a notar patrones que realmente movieron la aguja en mis puntajes.

En combo nivel 7 y arriba, tu unico trabajo es mantener la cadena viva. Manda lo que sea valido. No me importa si es "sol." Una palabra de 3 letras con multiplicador 5x son 10 puntos. Una de 6 letras sin combo son 5 puntos. El multiplicador hace que hasta las palabras diminutas valgan. Yo llamo a esto surfear el combo y es de donde vienen los puntajes realmente grandes.

Encadenar efectos es el siguiente nivel. A veces una cascada de ficha bomba deja caer una ficha de fuego en el lugar perfecto. Si puedes ver esa posibilidad antes de que pase y planear una palabra que le pegue a la ficha de fuego en tu siguiente turno, basicamente estas jugando ajedrez 4D. Me sale como una de cada diez partidas. Es increiblemente satisfactorio.

A veces la jugada correcta es mandar una palabra por posicion en el tablero, no por puntos. Limpiar fichas en un punto estrategico puede abrir una seccion nueva completa del tablero. Lo pienso como ajedrez: sacrificar una jugada de poco valor para armar algo mas grande.

Conoce los umbrales de puntaje para logros y recompensas. Cuando estas en 980 puntos, no es momento de relajarse. Empuja duro para 1.000 porque la diferencia de recompensa importa.

Mi consejo mas importante: la consistencia le gana a los picos. Un jugador que mantiene combo nivel 4-5 durante toda la partida va a superar a alguien que llega al nivel 8 una vez y juega el resto en 1-2. Yo ahora monitoreo mi nivel de combo promedio, no mi pico. Ese cambio de mentalidad subio mis puntajes mas que cualquier tecnica individual.`,
      },
    ],
    faq: [
      {
        question: 'Como funciona el sistema de combos en el modo Blast de LexiClash?',
        answer: 'Mandas palabras una tras otra dentro de una ventana de tiempo que se va achicando. Cada palabra consecutiva sube tu nivel de combo, que aumenta tu multiplicador de 1x hasta 5x+ en nivel 8. La ventana empieza en unos comodos 3 segundos pero baja a solo 1 segundo en los niveles mas altos. Se pone intenso.',
      },
      {
        question: 'Que son los efectos de fichas en modo Blast?',
        answer: 'Son fichas especiales que hacen algo dramatico cuando las usas en una palabra. Las de fuego arrasan una fila entera, las de hielo congelan fichas vecinas en su lugar, las de bomba explotan un area 3x3, y las de rayo limpian una columna completa. Si logras meter dos fichas de efecto en una palabra, ambas se activan. Caos absoluto de la mejor manera.',
      },
      {
        question: 'Es mejor encontrar palabras largas o mantener combos?',
        answer: 'Mantener combos, casi siempre. Las matematicas son claras: una palabrita de 3 letras en combo nivel 5 (3x = 6 puntos) le gana a una palabra elegante de 6 letras en nivel 1 (5 puntos). Usa palabras cortas como pegamento de combo mientras buscas las largas. El multiplicador lo es todo.',
      },
      {
        question: 'Cuando debo usar movimientos Blast como Mezclar y Pista?',
        answer: 'Tarde y con mesura. Una Pista en combo nivel 7 vale cuatro veces mas que en nivel 1 porque preserva tu multiplicador. Solo Mezcla cuando el tablero esta verdaderamente muerto y tu combo ya se fue. Piensa en tus movimientos Blast como inversiones que ganan valor mientras mas esperes.',
      },
    ],
    ctaText: 'Prueba el Modo Blast',
    ctaLink: '/singleplayer',
    backToGuides: 'Volver a guias',
  },
};
