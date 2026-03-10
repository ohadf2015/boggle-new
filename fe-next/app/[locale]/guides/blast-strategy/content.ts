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
    subtitle: 'Unlock the combo system, master tile effects, and chain your way to massive scores.',
    category: 'Strategy',
    readTime: '9 min read',
    authorName: 'The Word Nerd',
    authorBio: 'Blast mode enthusiast who has cleared over 1,000 boards and reached combo level 15+.',
    quickTips: [
      'Speed is everything - submit words as fast as possible to maintain your combo chain',
      'Plan your next word WHILE the current one is being validated',
      'Short words (3-4 letters) are combo fuel - use them to keep chains alive between big finds',
      'Watch for tile effects: fire tiles clear rows, ice tiles freeze neighbors, bomb tiles explode areas',
      'The combo window shrinks at higher levels - have backup words ready',
      'Start each board by identifying 3-4 easy words you can fire off rapidly',
      'Longer words reset your combo timer with more breathing room',
    ],
    comboTable,
    sections: [
      {
        title: 'What Makes Blast Mode Different',
        content: `Blast mode transforms the classic word-finding experience into an adrenaline-fueled scoring frenzy. While Classic mode rewards methodical scanning, Blast mode rewards speed, chaining, and strategic use of tile effects.

The core mechanic is the combo system. Every time you submit a valid word, a combo timer starts. Submit another word before it expires, and your combo level increases - along with your score multiplier. Let the timer run out, and your combo resets to zero. The higher your combo, the more each word is worth.

This changes everything about how you play. In Classic mode, you might spend 10 seconds tracing a 6-letter word. In Blast mode, those 10 seconds could cost you a combo chain worth far more than any single long word. The game becomes about continuous flow, not individual discoveries.

Blast mode also introduces special tile effects that can clear sections of the board, freeze tiles in place, or explode entire areas. Mastering when and how to trigger these effects is the difference between a good score and a legendary one.`,
      },
      {
        title: 'The Combo System Explained',
        content: `The combo system is the heart of Blast mode. Understanding how it works is essential for high scores.

When you submit your first valid word, you are at combo level 1 (1x multiplier). Submit another word within the combo window, and you jump to level 2 (1.5x). Each subsequent word within the window raises your level further: level 3 (2x), level 4 (2.5x), level 5 (3x), and beyond.

The combo window starts at 3 seconds at level 2 and shrinks as you climb. By level 5, you only have 1.5 seconds between words. At level 7+, its just 1 second. This is why speed matters so much - at high combo levels, you need words ready to submit almost instantly.

Heres the key insight most players miss: the combo multiplier applies to the BASE score of each word. A 5-letter word (4 base points) at combo level 5 (3x multiplier) earns 12 points. But four 3-letter words (2 base points each) at levels 2-5 earn 2 + 3 + 4 + 5 = 14 points total, PLUS they maintain your combo for the next big word.

The math is clear: maintaining combo chains with short words between longer finds is almost always more valuable than breaking your chain to hunt for a single long word.`,
      },
      {
        title: 'Tile Effects: Your Secret Weapons',
        content: `Blast mode introduces special tiles that appear on the board with visual indicators. Learning to use them strategically can double or triple your score.

Fire Tiles (red glow): When used in a word, fire tiles clear their entire row. This removes letters and drops new ones from above, often creating fresh word opportunities. Trigger fire tiles when the board feels stale or when you are running out of easy words.

Ice Tiles (blue shimmer): Ice tiles freeze adjacent tiles in place when triggered. Frozen tiles dont move when other tiles are cleared, making them reliable anchors for future words. Use ice strategically to preserve valuable letter combinations.

Bomb Tiles (pulsing): The most powerful effect. Bomb tiles explode a 3x3 area around them, clearing 9 tiles at once. This massive board disruption creates entirely new possibilities. Save bomb tiles for when your board is congested with difficult letter combinations.

Lightning Tiles (yellow spark): Lightning tiles clear their entire column when used. Combined with fire tiles (which clear rows), you can dramatically reshape the board in a single word.

The advanced technique: chain multiple effect tiles in a single word. If a word contains both a fire tile and a bomb tile, both effects trigger, creating a massive cascade that refreshes most of the board.`,
      },
      {
        title: 'Chain Strategy: The Flow State',
        content: `The best Blast mode players enter a flow state where words come almost automatically. Heres how to develop that skill.

Pre-loading: While your current word is being validated (the brief animation), you should already be tracing your next word on the board. Your eyes should be one word ahead of your fingers at all times. This is the single most important Blast mode skill.

The 3-Word Buffer: Before you start submitting, identify at least 3 easy words on the board. Submit the first, and while it validates, confirm the second. By the time the first word clears and new tiles drop, you should be ready with word three. This buffer gives you breathing room to find word four and beyond.

Short-Long Rhythm: The optimal pattern alternates short and long words. Submit a 3-letter word (quick, keeps combo alive) while scanning for a 5-6 letter word. Submit the long word (big points with multiplier), then immediately follow with another short word while scanning again.

Emergency Reserves: Always keep at least one easy 3-letter word in reserve. If you are struggling to find a new word, submit your reserve word to buy another combo window. Then use that time to scan fresh areas of the board.

When your combo breaks (and it will), dont panic. Take 2-3 seconds to scan the board, identify your starting buffer, and begin a new chain. A fresh combo chain is always better than random individual words.`,
      },
      {
        title: 'Board Reading for Blast Mode',
        content: `Board reading in Blast mode is fundamentally different from Classic mode because the board constantly changes as tiles are cleared and replaced.

Focus on the bottom third: Gravity pulls new tiles downward. After clearing words, fresh letters appear at the top and fall. The bottom of the board is the most stable area, so your anchor words should start there.

Watch the cascade: When tiles clear, remaining tiles fall and new ones appear. Experienced players predict what the board will look like AFTER their word clears. If you know a fire tile will clear a row, think about what words become possible with the tiles that drop into that empty space.

Tile density: Look for areas of the board with high consonant-vowel mixing. These areas will have the most words available. Avoid fixating on corners where letter variety is lower.

Fresh tile awareness: New tiles entering the board are highlighted briefly. Train yourself to immediately check new tiles for word opportunities. Often the best words appear in the aftermath of a cascade, when fresh tiles create combinations that werent possible before.`,
      },
      {
        title: 'When to Use Blast Moves',
        content: `Blast moves are special abilities you can activate during gameplay. Using them at the right time is crucial.

Shuffle: Rearranges all tiles on the board. Use this when the board is truly dead - when you have scanned every area and cannot find any words. Dont waste it just because words are hard to find. A shuffle mid-combo will break your chain, so only use it when your combo is already at zero.

Hint: Highlights a valid word on the board. Save hints for when you are at a high combo level and about to lose it. The hint preserves your combo by giving you an instant word to submit. Using a hint at combo level 1 wastes its value.

Time Freeze: Pauses the game timer briefly. Use this when you have a high combo going and need a moment to scan for your next word. The combo timer still runs during a time freeze, so you need to find and submit a word before it unfreezes.

The optimal strategy: hoard your blast moves for critical moments. A hint at combo level 7 (4x multiplier) is worth four times more than a hint at level 1. Think of blast moves as investments - their value increases with your combo level.`,
      },
      {
        title: 'Advanced Scoring Optimization',
        content: `Once you have mastered the basics, these advanced techniques will push your scores even higher.

Combo Surfing: At very high combo levels (7+), your only goal is keeping the chain alive. Submit any valid word, no matter how short. A 3-letter word at 5x multiplier (10 points) is worth more than a 6-letter word at 1x (5 points). The multiplier makes everything more valuable.

Effect Chaining: Plan words that trigger multiple tile effects in sequence. A cascade from a bomb tile might drop a fire tile into a perfect position. Recognizing these chain opportunities separates good players from great ones.

Board Manipulation: Sometimes its worth submitting a word specifically to rearrange the board rather than for its point value. Clearing tiles in strategic locations can create openings for much higher-value words on your next move.

Score Thresholds: Many game rewards and achievements trigger at specific score thresholds. Know what they are and push hard when you are close. The difference between 999 and 1,000 points might be a new achievement or bonus coins.

Practice Consistency: High scores come from consistent chains, not lucky individual words. A player who maintains a level 4-5 combo throughout the game will always outscore someone who hits level 8 once but plays the rest at level 1-2.`,
      },
    ],
    faq: [
      {
        question: 'How does the combo system work in LexiClash Blast mode?',
        answer: 'Submit words consecutively within a shrinking time window to build combo levels. Each level increases your score multiplier (1x at level 1, up to 5x+ at level 8). The window starts at 3 seconds and shrinks to 1 second at higher levels.',
      },
      {
        question: 'What are tile effects in Blast mode?',
        answer: 'Special tiles that trigger board-changing effects when used in words. Fire tiles clear rows, ice tiles freeze neighbors, bomb tiles explode 3x3 areas, and lightning tiles clear columns. Chain multiple effects in one word for massive cascades.',
      },
      {
        question: 'Is it better to find long words or keep combos going?',
        answer: 'Keep combos going. A 3-letter word at combo level 5 (3x multiplier = 6 points) often outvalues a 6-letter word at level 1 (5 points). Use short words to maintain chains while scanning for longer words.',
      },
      {
        question: 'When should I use Blast moves like Shuffle and Hint?',
        answer: 'Save them for high-value moments. Use Hints when your combo is high and about to drop. Use Shuffle only when the board is truly dead and your combo is already at zero. Their value scales with your current combo level.',
      },
    ],
    ctaText: 'Try Blast Mode',
    ctaLink: '/singleplayer',
    backToGuides: 'Back to Guides',
  },
  he: {
    title: 'מצב בלאסט: קומבו, שרשראות וניקוד גבוה',
    subtitle: 'פענחו את מערכת הקומבו, שלטו באפקטי אריחים ושרשרו את דרככם לניקוד מסיבי.',
    category: 'אסטרטגיה',
    readTime: '9 דקות קריאה',
    authorName: 'חנון המילים',
    authorBio: 'חובב מצב בלאסט שניקה מעל 1,000 לוחות והגיע לרמת קומבו 15+.',
    quickTips: [
      'מהירות זה הכל - הגישו מילים הכי מהר שאפשר כדי לשמור על שרשרת הקומבו',
      'תכננו את המילה הבאה בזמן שהנוכחית מאומתת',
      'מילים קצרות (3-4 אותיות) הן דלק קומבו - השתמשו בהן לשמירה על שרשראות',
      'שימו לב לאפקטי אריחים: אש מנקה שורות, קרח מקפיא שכנים, פצצה מפוצצת אזורים',
      'חלון הקומבו מתכווץ ברמות גבוהות - החזיקו מילים גיבוי מוכנות',
      'התחילו כל לוח בזיהוי 3-4 מילים קלות שאפשר לירות מהר',
      'מילים ארוכות מאפסות את טיימר הקומבו עם יותר מרווח נשימה',
    ],
    comboTable,
    sections: [
      {
        title: 'מה הופך את מצב בלאסט לשונה',
        content: `מצב בלאסט הופך את חוויית מציאת המילים הקלאסית לטירוף ניקוד מלא אדרנלין. בעוד מצב קלאסי מתגמל סריקה שיטתית, מצב בלאסט מתגמל מהירות, שרשור ושימוש אסטרטגי באפקטי אריחים.

המכניקה המרכזית היא מערכת הקומבו. בכל פעם שמגישים מילה חוקית, טיימר קומבו מתחיל. הגישו מילה נוספת לפני שהוא פוקע, ורמת הקומבו שלכם עולה - יחד עם מכפיל הניקוד. תנו לטיימר לפקוע, והקומבו מתאפס לאפס.

זה משנה הכל לגבי איך שאתם משחקים. במצב קלאסי, אולי תבזבזו 10 שניות על מילה בת 6 אותיות. במצב בלאסט, 10 שניות אלו יכולות לעלות לכם שרשרת קומבו ששווה הרבה יותר מכל מילה ארוכה בודדת.

מצב בלאסט גם מציג אפקטי אריחים מיוחדים שיכולים לנקות חלקים מהלוח, להקפיא אריחים במקום או לפוצץ אזורים שלמים. שליטה במתי ואיך להפעיל אפקטים אלו היא ההבדל בין ניקוד טוב לאגדי.`,
      },
      {
        title: 'מערכת הקומבו מוסברת',
        content: `מערכת הקומבו היא הלב של מצב בלאסט. הבנה כיצד היא עובדת חיונית לניקוד גבוה.

כשמגישים את המילה החוקית הראשונה, אתם ברמת קומבו 1 (מכפיל 1x). הגישו מילה נוספת בתוך חלון הקומבו, ואתם קופצים לרמה 2 (1.5x). כל מילה עוקבת בתוך החלון מעלה את הרמה: רמה 3 (2x), רמה 4 (2.5x), רמה 5 (3x), ומעבר.

חלון הקומבו מתחיל ב-3 שניות ברמה 2 ומתכווץ ככל שמטפסים. ברמה 5, יש רק 1.5 שניות בין מילים. ברמה 7+, רק שנייה אחת. לכן מהירות כל כך חשובה.

הנה התובנה המרכזית שרוב השחקנים מפספסים: מכפיל הקומבו חל על הניקוד הבסיסי של כל מילה. מילה בת 5 אותיות (4 נקודות בסיס) ברמת קומבו 5 (מכפיל 3x) מרוויחה 12 נקודות. אבל ארבע מילים בנות 3 אותיות ברמות 2-5 מרוויחות 14 נקודות סך הכל, ועוד שומרות על הקומבו.

המתמטיקה ברורה: שמירה על שרשראות קומבו עם מילים קצרות בין ממצאים ארוכים כמעט תמיד שווה יותר.`,
      },
      {
        title: 'אפקטי אריחים: הנשק הסודי שלכם',
        content: `מצב בלאסט מציג אריחים מיוחדים עם אינדיקטורים חזותיים. למידה להשתמש בהם אסטרטגית יכולה להכפיל או לשלש את הניקוד.

אריחי אש (זוהר אדום): כשמשתמשים בהם במילה, הם מנקים את כל השורה. זה מסיר אותיות ומוריד חדשות מלמעלה, ויוצר הזדמנויות חדשות.

אריחי קרח (נצנוץ כחול): מקפיאים אריחים סמוכים כשמופעלים. אריחים קפואים לא זזים כשאריחים אחרים מתנקים.

אריחי פצצה (פועם): האפקט החזק ביותר. מפוצצים אזור 3x3, מנקים 9 אריחים בבת אחת.

אריחי ברק (ניצוץ צהוב): מנקים את כל העמודה כשמשתמשים בהם.

הטכניקה המתקדמת: שרשרו מספר אריחי אפקט במילה אחת. אם מילה מכילה גם אריח אש וגם אריח פצצה, שני האפקטים מופעלים ויוצרים מפל מסיבי.`,
      },
      {
        title: 'אסטרטגיית שרשור: מצב זרימה',
        content: `שחקני בלאסט הטובים ביותר נכנסים למצב זרימה שבו מילים באות כמעט אוטומטית.

טעינה מוקדמת: בזמן שהמילה הנוכחית מאומתת, כבר צריכים לאתר את המילה הבאה על הלוח. העיניים צריכות להיות מילה אחת לפני האצבעות בכל רגע.

חיץ 3 מילים: לפני שמתחילים להגיש, זהו לפחות 3 מילים קלות על הלוח. הגישו את הראשונה, ובזמן שהיא מאומתת, אשרו את השנייה.

קצב קצר-ארוך: הדפוס האופטימלי מחליף בין מילים קצרות וארוכות. הגישו מילה בת 3 אותיות תוך סריקה למילה בת 5-6 אותיות.

רזרבות חירום: תמיד שמרו לפחות מילה קלה אחת בת 3 אותיות ברזרבה. אם מתקשים למצוא מילה חדשה, הגישו את מילת הרזרבה כדי לקנות עוד חלון קומבו.`,
      },
      {
        title: 'מתי להשתמש במהלכי בלאסט',
        content: `מהלכי בלאסט הם יכולות מיוחדות שאפשר להפעיל במהלך המשחק. שימוש בהם בזמן הנכון הוא קריטי.

ערבוב: מסדר מחדש את כל האריחים על הלוח. השתמשו כשהלוח באמת מת - כשסרקתם כל אזור ולא מוצאים מילים. ערבוב באמצע קומבו ישבור את השרשרת, אז השתמשו רק כשהקומבו כבר באפס.

רמז: מדגיש מילה חוקית על הלוח. שמרו רמזים לכשהקומבו גבוה ועומד ליפול. הרמז שומר על הקומבו על ידי מתן מילה מיידית להגשה.

הקפאת זמן: משהה את טיימר המשחק לרגע. השתמשו כשיש קומבו גבוה וצריכים רגע לסרוק.

האסטרטגיה האופטימלית: אגרו מהלכי בלאסט לרגעים קריטיים. רמז ברמת קומבו 7 (מכפיל 4x) שווה פי ארבע מרמז ברמה 1.`,
      },
      {
        title: 'אופטימיזציית ניקוד מתקדמת',
        content: `אחרי ששלטתם ביסודות, טכניקות מתקדמות אלו ידחפו את הניקוד שלכם עוד יותר.

גלישת קומבו: ברמות קומבו גבוהות מאוד (7+), המטרה היחידה היא לשמור על השרשרת חיה. הגישו כל מילה חוקית, לא משנה כמה קצרה. מילה בת 3 אותיות במכפיל 5x (10 נקודות) שווה יותר ממילה בת 6 אותיות ב-1x (5 נקודות).

שרשור אפקטים: תכננו מילים שמפעילות מספר אפקטי אריחים ברצף. מפל מאריח פצצה עשוי להוריד אריח אש למיקום מושלם.

מניפולציית לוח: לפעמים שווה להגיש מילה במיוחד כדי לסדר מחדש את הלוח ולא בגלל ערך הנקודות.

עקביות תרגול: ניקוד גבוה מגיע משרשראות עקביות, לא ממילים בודדות מזלניות. שחקן ששומר על קומבו רמה 4-5 לאורך כל המשחק תמיד ינקד יותר.`,
      },
    ],
    faq: [
      {
        question: 'איך עובדת מערכת הקומבו במצב בלאסט של לקסיקלאש?',
        answer: 'הגישו מילים ברצף בתוך חלון זמן מתכווץ כדי לבנות רמות קומבו. כל רמה מגדילה את מכפיל הניקוד (1x ברמה 1, עד 5x+ ברמה 8). החלון מתחיל ב-3 שניות ומתכווץ לשנייה ברמות גבוהות.',
      },
      {
        question: 'מה הם אפקטי אריחים במצב בלאסט?',
        answer: 'אריחים מיוחדים שמפעילים אפקטים משני לוח כשמשתמשים בהם במילים. אריחי אש מנקים שורות, קרח מקפיא שכנים, פצצה מפוצצת אזורי 3x3, וברק מנקה עמודות.',
      },
      {
        question: 'עדיף למצוא מילים ארוכות או לשמור על קומבו?',
        answer: 'שמרו על קומבו. מילה בת 3 אותיות ברמת קומבו 5 (מכפיל 3x = 6 נקודות) לעיתים קרובות שווה יותר ממילה בת 6 אותיות ברמה 1 (5 נקודות).',
      },
      {
        question: 'מתי כדאי להשתמש במהלכי בלאסט כמו ערבוב ורמז?',
        answer: 'שמרו אותם לרגעים בעלי ערך גבוה. השתמשו ברמזים כשהקומבו גבוה ועומד ליפול. השתמשו בערבוב רק כשהלוח באמת מת והקומבו כבר באפס.',
      },
    ],
    ctaText: 'נסו מצב בלאסט',
    ctaLink: '/singleplayer',
    backToGuides: 'חזרה למדריכים',
  },
  sv: {
    title: 'Blast-lage Mesterskap: Kombos, Kedjor och Hogsta Poang',
    subtitle: 'Las upp kombosystemet, bemestra platteffekter och kedja dig till massiva poang.',
    category: 'Strategi',
    readTime: '9 min lasning',
    authorName: 'Ordnorden',
    authorBio: 'Blast-lage entusiast som rensat over 1 000 braden och natt kombiniva 15+.',
    quickTips: [
      'Hastighet ar allt - skicka ord sa snabbt som mojligt for att halla kombokedjan',
      'Planera nasta ord MEDAN det nuvarande valideras',
      'Korta ord (3-4 bokstaver) ar kombobransle - anvand dem for att halla kedjor levande',
      'Se upp for platteffekter: eldplattor rensar rader, isplattor fryser grannar, bombplattor sprangger omraden',
      'Kombofonstret krymper pa hogre nivaer - ha reservord redo',
      'Borja varje brade med att identifiera 3-4 latta ord du kan skjuta ivaag snabbt',
      'Langre ord aterstaaller din kombotimer med mer andrum',
    ],
    comboTable,
    sections: [
      {
        title: 'Vad Gor Blast-lage Annorlunda',
        content: `Blast-lage forvandlar den klassiska ordsokarupplevelsen till ett adrenalinfyllt poangraseri. Medan Klassiskt lage belonar metodisk skanning, belonar Blast-lage hastighet, kedjning och strategisk anvandning av platteffekter.

Karnmekaniken ar kombosystemet. Varje gang du skickar ett giltigt ord startar en kombotimer. Skicka ett till ord innan den gar ut, och din kombiniva okar - tillsammans med din poangmultiplikator. Lat timern ga ut, och din kombo aterstalls till noll.

Detta andrar allt om hur du spelar. I Klassiskt lage kan du lagga 10 sekunder pa att spara ett 6-bokstavsord. I Blast-lage kan de 10 sekunderna kosta dig en kombokedja vard mycket mer.

Blast-lage introducerar ocksa speciella platteffekter som kan rensa sektioner av bradet, frysa plattor pa plats eller sprangga hela omraden.`,
      },
      {
        title: 'Kombosystemet Forklarat',
        content: `Kombosystemet ar hjartat av Blast-lage. Att forsta hur det fungerar ar avggorande for hoga poang.

Nar du skickar ditt forsta giltiga ord ar du pa kombiniva 1 (1x multiplikator). Skicka ett ord till inom kombofonstret, och du hoppar till niva 2 (1.5x). Varje efterfoljande ord hojer din niva ytterligare.

Kombofonstret borjar pa 3 sekunder vid niva 2 och krymper nar du klattrar. Vid niva 5 har du bara 1.5 sekunder mellan ord. Vid niva 7+ ar det bara 1 sekund.

Nyckelinsikten de flesta spelare missar: kombomultiplikatorn galler for BASPOANGEN for varje ord. Ett 5-bokstavsord (4 baspoang) vid kombiniva 5 (3x multiplikator) ger 12 poang. Men fyra 3-bokstavsord vid nivaer 2-5 ger 14 poang totalt, PLUS att de bibehaller din kombo.

Matten ar tydlig: att bibehalla kombokedjor med korta ord mellan langre fynd ar nastan alltid mer vardefullt.`,
      },
      {
        title: 'Platteffekter: Dina Hemliga Vapen',
        content: `Blast-lage introducerar specialplattor med visuella indikatorer.

Eldplattor (rod glod): Rensar hela raden. Tar bort bokstaver och slappper nya ovifran, skapar nya ordmojligheter.

Isplattor (blaa skimmer): Fryser intilliggande plattor. Frusna plattor ror sig inte nar andra plattor rensas.

Bombplattor (pulserande): Den kraftfullaste effekten. Sprangger ett 3x3-omrade runt dem, rensar 9 plattor pa en gang.

Blixtplattor (gul gnista): Rensar hela kolumnen nar de anvands.

Den avancerade tekniken: kedja flera effektplattor i ett enda ord. Om ett ord innehaller bade en eldplatta och en bombplatta utloses bada effekterna, vilket skapar en massiv kaskad.`,
      },
      {
        title: 'Kedjestrategier: Flodestillstand',
        content: `De basta Blast-lage spelarna gar in i ett flodestillstand dar ord kommer nastan automatiskt.

Forladda: Medan ditt nuvarande ord valideras bor du redan spara ditt nasta ord pa bradet. Dina ogon bor vara ett ord fore dina fingrar.

3-Ords Buffert: Innan du borjar skicka, identifiera minst 3 latta ord pa bradet. Denna buffert ger dig andrum att hitta ord fyra och bortom.

Kort-Lang Rytm: Det optimala monstret vaxlar mellan korta och langa ord. Skicka ett 3-bokstavsord medan du skannar efter ett langre. Folj med ett kort ord igen.

Nodreserver: Hall alltid minst ett latt 3-bokstavsord i reserv. Om du kampar for att hitta ett nytt ord, skicka ditt reservord for att kopa ett nytt kombofonstre.`,
      },
      {
        title: 'Nar ska man Anvanda Blast-drag',
        content: `Blast-drag ar speciella formaagor du kan aktivera under spelet.

Blanda: Omarrangerar alla plattor. Anvand nar bradet ar helt dott. Blanda mitt i en kombo bryter kedjan.

Ledtrad: Markerar ett giltigt ord. Spara ledtraadar for nar din kombo ar hog och pa vag att sjunka.

Tidsfrys: Pausar speltimern kort. Anvand nar du har en hog kombo och behover en stund att skanna.

Den optimala strategin: hamstra dina blast-drag for kritiska ogonblick. En ledtrad vid kombiniva 7 (4x multiplikator) ar vard fyra ganger mer an vid niva 1.`,
      },
      {
        title: 'Avancerad Poangoptimering',
        content: `Nar du bemasttrat grunderna, trycker dessa avancerade tekniker dina poang annu hogre.

Kombosurfning: Vid mycket hoga kombinivaaer (7+) ar ditt enda mal att halla kedjan vid liv. Skicka vilket giltigt ord som helst. Ett 3-bokstavsord vid 5x multiplikator (10 poang) ar vart mer an ett 6-bokstavsord vid 1x (5 poang).

Effektkedjning: Planera ord som utloser flera platteffekter i sekvens.

Bradmanipulation: Ibland ar det vart att skicka ett ord specifikt for att omarrangera bradet snarare an for dess poangvarde.

Ova konsekvens: Hoga poang kommer fran konsekventa kedjor, inte lyckliga enskilda ord.`,
      },
    ],
    faq: [
      {
        question: 'Hur fungerar kombosystemet i LexiClash Blast-lage?',
        answer: 'Skicka ord i foljd inom ett krympande tidsfonstre for att bygga kombinivaaer. Varje niva okar din poangmultiplikator (1x vid niva 1, upp till 5x+ vid niva 8).',
      },
      {
        question: 'Vad ar platteffekter i Blast-lage?',
        answer: 'Specialplattor som utloser bradandrande effekter. Eldplattor rensar rader, isplattor fryser grannar, bombplattor sprangger 3x3-omraden, blixtplattor rensar kolumner.',
      },
      {
        question: 'Ar det battre att hitta langa ord eller halla kombos igaang?',
        answer: 'Hall kombos igaang. Ett 3-bokstavsord vid kombiniva 5 (3x multiplikator = 6 poang) overtraffar ofta ett 6-bokstavsord vid niva 1 (5 poang).',
      },
      {
        question: 'Nar ska jag anvanda Blast-drag som Blanda och Ledtrad?',
        answer: 'Spara dem for hogvardiga ogonblick. Anvand Ledtraadar nar din kombo ar hog. Anvand Blanda nar bradet ar dott och komboen redan ar noll.',
      },
    ],
    ctaText: 'Prova Blast-lage',
    ctaLink: '/singleplayer',
    backToGuides: 'Tillbaka till guider',
  },
  ja: {
    title: 'ブラストモード攻略：コンボ、チェーン、ハイスコア',
    subtitle: 'コンボシステムを解き明かし、タイルエフェクトをマスターし、大量スコアへの道を切り開こう。',
    category: '攻略',
    readTime: '9分で読める',
    authorName: 'ワードオタク',
    authorBio: '1,000以上のボードをクリアし、コンボレベル15+に到達したブラストモード愛好家。',
    quickTips: [
      'スピードがすべて - コンボチェーンを維持するためにできるだけ速く単語を送信する',
      '現在の単語が検証されている間に次の単語を計画する',
      '短い単語（3-4文字）はコンボの燃料 - 大きな発見の間にチェーンを維持するために使う',
      'タイルエフェクトに注目：ファイアは行をクリア、アイスは隣を凍結、ボムはエリアを爆発',
      'コンボウィンドウは高レベルで縮小する - バックアップの単語を準備しておく',
      '各ボードの開始時に素早く発射できる3-4個の簡単な単語を特定する',
      '長い単語はコンボタイマーをより多くの余裕を持ってリセットする',
    ],
    comboTable,
    sections: [
      {
        title: 'ブラストモードの違い',
        content: `ブラストモードは、クラシックな単語探しの体験をアドレナリン全開のスコアリングフレンジーに変えます。クラシックモードが系統的なスキャンを報酬にするのに対し、ブラストモードはスピード、チェーン、タイルエフェクトの戦略的使用を報酬にします。

コアメカニクスはコンボシステムです。有効な単語を送信するたびにコンボタイマーが始まります。タイマーが切れる前に別の単語を送信すると、コンボレベルが上がり、スコア倍率も上がります。タイマーが切れるとコンボはゼロにリセットされます。

これによりプレイ方法が完全に変わります。クラシックモードでは6文字の単語のトレースに10秒かけるかもしれません。ブラストモードでは、その10秒が単一の長い単語よりもはるかに価値のあるコンボチェーンを失うコストになり得ます。

ブラストモードはまた、ボードのセクションをクリアしたり、タイルを固定したり、エリア全体を爆発させたりする特殊タイルエフェクトを導入します。`,
      },
      {
        title: 'コンボシステムの説明',
        content: `コンボシステムはブラストモードの心臓部です。その仕組みを理解することはハイスコアに不可欠です。

最初の有効な単語を送信すると、コンボレベル1（1x倍率）になります。コンボウィンドウ内にもう1つの単語を送信すると、レベル2（1.5x）にジャンプします。以降の各単語はレベルをさらに上げます。

コンボウィンドウはレベル2で3秒から始まり、上昇するにつれて縮小します。レベル5では単語間が1.5秒しかありません。レベル7以上では1秒だけです。

ほとんどのプレイヤーが見逃す重要な洞察：コンボ倍率は各単語のベーススコアに適用されます。5文字の単語（4ベースポイント）がコンボレベル5（3x倍率）で12ポイントを獲得します。しかし、レベル2-5での4つの3文字の単語は合計14ポイントを獲得し、さらにコンボを維持します。

数学は明確です：長い発見の間に短い単語でコンボチェーンを維持することは、ほぼ常により価値があります。`,
      },
      {
        title: 'タイルエフェクト：あなたの秘密兵器',
        content: `ブラストモードは視覚的インジケーター付きの特殊タイルを導入します。

ファイアタイル（赤い輝き）：単語で使用すると行全体をクリアします。文字を除去し、上から新しいものを落とし、新しい単語の機会を作ります。

アイスタイル（青いきらめき）：発動時に隣接タイルを凍結します。凍結タイルは他のタイルがクリアされても動きません。

ボムタイル（脈動）：最も強力なエフェクト。周囲の3x3エリアを爆発させ、一度に9タイルをクリアします。

ライトニングタイル（黄色い火花）：使用時に列全体をクリアします。

上級テクニック：1つの単語で複数のエフェクトタイルをチェーンします。単語にファイアタイルとボムタイルの両方が含まれていると、両方のエフェクトが発動し、ボードの大部分をリフレッシュする大規模なカスケードを作ります。`,
      },
      {
        title: 'チェーン戦略：フロー状態',
        content: `最高のブラストモードプレイヤーは、単語がほぼ自動的に出てくるフロー状態に入ります。

プリローディング：現在の単語が検証されている間に、次の単語をすでにボード上でトレースしているべきです。目は常に指より1つの単語先にあるべきです。

3単語バッファ：送信を始める前に、ボード上で少なくとも3つの簡単な単語を特定します。このバッファにより、4つ目以降の単語を見つける余裕が生まれます。

短-長リズム：最適なパターンは短い単語と長い単語を交互にします。3文字の単語を送信しながら5-6文字の単語をスキャンします。

緊急予備：常に少なくとも1つの簡単な3文字の単語を予備に持っておきます。新しい単語が見つからない場合、予備の単語を送信してコンボウィンドウを延長できます。`,
      },
      {
        title: 'ブラストムーブの使用タイミング',
        content: `ブラストムーブはゲームプレイ中に発動できる特殊能力です。

シャッフル：ボード上のすべてのタイルを並べ替えます。ボードが完全に行き詰まった時にのみ使用します。コンボ中のシャッフルはチェーンを壊すので、コンボがゼロの時だけ使いましょう。

ヒント：ボード上の有効な単語をハイライトします。コンボが高く、落ちそうな時のためにヒントを温存しましょう。

タイムフリーズ：ゲームタイマーを一時的に停止します。高いコンボがあり、次の単語をスキャンする時間が必要な時に使用します。

最適な戦略：ブラストムーブを重要な瞬間のために蓄えます。コンボレベル7（4x倍率）でのヒントは、レベル1でのヒントの4倍の価値があります。`,
      },
      {
        title: '上級スコア最適化',
        content: `基本をマスターしたら、これらの上級テクニックでスコアをさらに押し上げます。

コンボサーフィン：非常に高いコンボレベル（7+）では、チェーンを維持することだけが目標です。どんなに短くても有効な単語を送信します。5x倍率での3文字の単語（10ポイント）は、1xでの6文字の単語（5ポイント）より価値があります。

エフェクトチェーン：複数のタイルエフェクトを連続して発動する単語を計画します。

ボード操作：ポイント値ではなく、ボードを再配置するために特定の単語を送信する価値がある場合もあります。

一貫性の練習：ハイスコアは一貫したチェーンから来ます。ゲーム全体でレベル4-5のコンボを維持するプレイヤーは、一度レベル8に到達しても残りをレベル1-2でプレイする人を常に上回ります。`,
      },
    ],
    faq: [
      {
        question: 'LexiClashブラストモードのコンボシステムはどう機能しますか？',
        answer: '縮小する時間ウィンドウ内で連続して単語を送信してコンボレベルを構築します。各レベルでスコア倍率が増加します（レベル1で1x、レベル8で5x+）。',
      },
      {
        question: 'ブラストモードのタイルエフェクトとは何ですか？',
        answer: '単語で使用するとボードを変えるエフェクトを発動する特殊タイルです。ファイアタイルは行をクリア、アイスタイルは隣を凍結、ボムタイルは3x3エリアを爆発、ライトニングタイルは列をクリアします。',
      },
      {
        question: '長い単語を見つけるのとコンボを維持するのとではどちらが良いですか？',
        answer: 'コンボを維持しましょう。コンボレベル5での3文字の単語（3x倍率 = 6ポイント）は、レベル1での6文字の単語（5ポイント）を上回ることが多いです。',
      },
      {
        question: 'シャッフルやヒントなどのブラストムーブはいつ使うべきですか？',
        answer: '高価値の瞬間のために温存します。コンボが高い時にヒントを使い、ボードが行き詰まってコンボがゼロの時にシャッフルを使います。',
      },
    ],
    ctaText: 'ブラストモードを試す',
    ctaLink: '/singleplayer',
    backToGuides: 'ガイドに戻る',
  },
  es: {
    title: 'Dominio del Modo Blast: Combos, Cadenas y Puntajes Altos',
    subtitle: 'Desbloquea el sistema de combos, domina los efectos de fichas y encadena tu camino a puntajes masivos.',
    category: 'Estrategia',
    readTime: '9 min de lectura',
    authorName: 'El Nerd de las Palabras',
    authorBio: 'Entusiasta del modo Blast que ha limpiado mas de 1.000 tableros y alcanzado combo nivel 15+.',
    quickTips: [
      'La velocidad es todo - envia palabras lo mas rapido posible para mantener la cadena de combos',
      'Planea tu siguiente palabra MIENTRAS la actual se valida',
      'Palabras cortas (3-4 letras) son combustible de combo - usalas para mantener cadenas vivas',
      'Observa los efectos de fichas: fuego limpia filas, hielo congela vecinos, bomba explota areas',
      'La ventana de combo se reduce en niveles altos - ten palabras de reserva listas',
      'Comienza cada tablero identificando 3-4 palabras faciles que puedas disparar rapidamente',
      'Palabras mas largas reinician tu temporizador de combo con mas margen',
    ],
    comboTable,
    sections: [
      {
        title: 'Que Hace Diferente al Modo Blast',
        content: `El modo Blast transforma la experiencia clasica de buscar palabras en un frenetico festin de puntaje lleno de adrenalina. Mientras el modo Clasico recompensa el escaneo metodico, el modo Blast recompensa la velocidad, el encadenamiento y el uso estrategico de efectos de fichas.

La mecanica central es el sistema de combos. Cada vez que envias una palabra valida, un temporizador de combo comienza. Envia otra palabra antes de que expire, y tu nivel de combo aumenta - junto con tu multiplicador de puntaje. Deja que el temporizador se agote, y tu combo se reinicia a cero.

Esto cambia todo sobre como juegas. En modo Clasico, podrias gastar 10 segundos trazando una palabra de 6 letras. En modo Blast, esos 10 segundos podrian costarte una cadena de combo que vale mucho mas que cualquier palabra larga individual.

El modo Blast tambien introduce efectos de fichas especiales que pueden limpiar secciones del tablero, congelar fichas en su lugar o explotar areas enteras.`,
      },
      {
        title: 'El Sistema de Combos Explicado',
        content: `El sistema de combos es el corazon del modo Blast. Entender como funciona es esencial para puntajes altos.

Cuando envias tu primera palabra valida, estas en combo nivel 1 (multiplicador 1x). Envia otra palabra dentro de la ventana de combo, y saltas al nivel 2 (1.5x). Cada palabra subsiguiente eleva tu nivel mas.

La ventana de combo comienza en 3 segundos en el nivel 2 y se reduce a medida que subes. En el nivel 5, solo tienes 1.5 segundos entre palabras. En el nivel 7+, solo 1 segundo.

La perspectiva clave que la mayoria de los jugadores pierden: el multiplicador de combo se aplica al puntaje BASE de cada palabra. Una palabra de 5 letras (4 puntos base) en combo nivel 5 (multiplicador 3x) gana 12 puntos. Pero cuatro palabras de 3 letras en niveles 2-5 ganan 14 puntos en total, MAS mantienen tu combo.

Las matematicas son claras: mantener cadenas de combo con palabras cortas entre hallazgos largos es casi siempre mas valioso.`,
      },
      {
        title: 'Efectos de Fichas: Tus Armas Secretas',
        content: `El modo Blast introduce fichas especiales con indicadores visuales.

Fichas de Fuego (brillo rojo): Cuando se usan en una palabra, limpian toda la fila. Esto elimina letras y deja caer nuevas desde arriba.

Fichas de Hielo (destello azul): Congelan fichas adyacentes cuando se activan. Las fichas congeladas no se mueven cuando otras se limpian.

Fichas de Bomba (pulsante): El efecto mas poderoso. Explotan un area de 3x3, limpiando 9 fichas de una vez.

Fichas de Rayo (chispa amarilla): Limpian toda la columna cuando se usan.

La tecnica avanzada: encadena multiples fichas de efecto en una sola palabra. Si una palabra contiene tanto una ficha de fuego como una de bomba, ambos efectos se activan, creando una cascada masiva.`,
      },
      {
        title: 'Estrategia de Cadenas: El Estado de Flujo',
        content: `Los mejores jugadores de Blast entran en un estado de flujo donde las palabras vienen casi automaticamente.

Pre-carga: Mientras tu palabra actual se valida, ya deberias estar trazando la siguiente en el tablero. Tus ojos deben estar una palabra adelante de tus dedos en todo momento.

Buffer de 3 Palabras: Antes de empezar a enviar, identifica al menos 3 palabras faciles en el tablero. Este buffer te da margen para encontrar la cuarta y mas alla.

Ritmo Corto-Largo: El patron optimo alterna palabras cortas y largas. Envia una palabra de 3 letras mientras escaneas una mas larga. Sigue con otra corta mientras escaneas de nuevo.

Reservas de Emergencia: Siempre ten al menos una palabra facil de 3 letras en reserva. Si luchas por encontrar una nueva palabra, envia tu reserva para comprar otra ventana de combo.`,
      },
      {
        title: 'Cuando Usar Movimientos Blast',
        content: `Los movimientos Blast son habilidades especiales que puedes activar durante el juego.

Mezclar: Reorganiza todas las fichas. Usa cuando el tablero esta realmente muerto. Mezclar a mitad de combo rompe la cadena.

Pista: Resalta una palabra valida. Guarda pistas para cuando tu combo es alto y esta a punto de caer.

Congelacion de Tiempo: Pausa brevemente el temporizador del juego. Usa cuando tienes un combo alto y necesitas un momento para escanear.

La estrategia optima: acumula tus movimientos Blast para momentos criticos. Una pista en combo nivel 7 (multiplicador 4x) vale cuatro veces mas que en nivel 1.`,
      },
      {
        title: 'Optimizacion Avanzada de Puntaje',
        content: `Una vez que domines los basicos, estas tecnicas avanzadas elevaran tus puntajes aun mas.

Surfeo de Combo: En niveles de combo muy altos (7+), tu unico objetivo es mantener la cadena viva. Envia cualquier palabra valida. Una palabra de 3 letras con multiplicador 5x (10 puntos) vale mas que una de 6 letras con 1x (5 puntos).

Encadenamiento de Efectos: Planea palabras que activen multiples efectos de fichas en secuencia.

Manipulacion del Tablero: A veces vale la pena enviar una palabra especificamente para reorganizar el tablero.

Practica la Consistencia: Los puntajes altos vienen de cadenas consistentes, no de palabras individuales con suerte. Un jugador que mantiene combo nivel 4-5 durante todo el juego siempre superara a alguien que llega al nivel 8 una vez pero juega el resto en nivel 1-2.`,
      },
    ],
    faq: [
      {
        question: 'Como funciona el sistema de combos en el modo Blast de LexiClash?',
        answer: 'Envia palabras consecutivamente dentro de una ventana de tiempo que se reduce para construir niveles de combo. Cada nivel aumenta tu multiplicador de puntaje (1x en nivel 1, hasta 5x+ en nivel 8).',
      },
      {
        question: 'Que son los efectos de fichas en modo Blast?',
        answer: 'Fichas especiales que activan efectos que cambian el tablero. Fichas de fuego limpian filas, hielo congela vecinos, bomba explota areas 3x3, rayo limpia columnas.',
      },
      {
        question: 'Es mejor encontrar palabras largas o mantener combos?',
        answer: 'Mantener combos. Una palabra de 3 letras en combo nivel 5 (multiplicador 3x = 6 puntos) frecuentemente supera una palabra de 6 letras en nivel 1 (5 puntos).',
      },
      {
        question: 'Cuando debo usar movimientos Blast como Mezclar y Pista?',
        answer: 'Guardalos para momentos de alto valor. Usa Pistas cuando tu combo es alto. Usa Mezclar solo cuando el tablero esta muerto y el combo ya esta en cero.',
      },
    ],
    ctaText: 'Prueba el Modo Blast',
    ctaLink: '/singleplayer',
    backToGuides: 'Volver a guias',
  },
};
