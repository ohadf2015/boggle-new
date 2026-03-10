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
    title: 'Classic Mode Strategy Guide: Find More Words, Score Higher',
    subtitle: 'Master the grid with proven scanning patterns, time management, and scoring strategies.',
    category: 'Strategy',
    readTime: '8 min read',
    authorName: 'The Word Nerd',
    authorBio: 'Competitive word game player with 500+ hours of Classic mode gameplay.',
    quickTips: [
      'Start from corners - they connect to fewer tiles, so words are easier to trace',
      'Look for common prefixes like UN-, RE-, PRE- and suffixes like -ING, -TION, -ED',
      'Submit short words first to build momentum, then hunt for longer ones',
      'Spend the first 15 seconds scanning the entire board before submitting anything',
      'Focus on vowel-consonant clusters - they form the backbone of most words',
      'Dont forget diagonal connections - they unlock hidden words others miss',
      'In the final 30 seconds, rapid-fire any 3-letter words you spot',
    ],
    scoringTable,
    sections: [
      {
        title: 'Understanding the Classic Grid',
        content: `Classic mode drops you into a grid of letters with a ticking clock. Your mission: find as many valid words as possible by connecting adjacent tiles - horizontally, vertically, or diagonally. Each tile can only be used once per word, and words must be at least 3 letters long.

The scoring is straightforward: longer words earn more points. A 3-letter word gives you 2 points (word length minus one), while an 8-letter word earns 7 points. But the real skill lies not in knowing this, but in developing systematic approaches to find words faster and more consistently.

What separates casual players from top scorers is not vocabulary size alone - its pattern recognition and board-reading technique. The strategies in this guide are used by players who consistently score in the top 10%.`,
      },
      {
        title: 'The Corner-Edge-Center Scanning Pattern',
        content: `The most effective scanning strategy follows a specific order: corners first, then edges, then center.

Why corners? Corner tiles connect to only 3 adjacent tiles (compared to 8 for center tiles). This means words starting from corners are easier to trace mentally, and you are less likely to lose your path. Start at the top-left corner and look for 3-4 letter words radiating outward.

Edge tiles connect to 5 neighbors. After exhausting corner starts, move along each edge. Many players skip edges entirely and jump to the center - this is a mistake. Edge-starting words are often overlooked by opponents in multiplayer.

Center tiles are the trickiest. They have maximum connections (up to 8 adjacent tiles), which means more possible paths but also more confusion. Save these for after you have found the easy corner and edge words. By then, you will have internalized the board layout and can trace complex center paths more confidently.

A full corner-edge-center scan takes about 30-40 seconds. After that, shift to targeted hunting for specific patterns.`,
      },
      {
        title: 'Prefix and Suffix Hunting',
        content: `Once you have done your initial scan, switch to prefix/suffix mode. This is where experienced players separate themselves from beginners.

Common prefixes to hunt for: UN- (undo, unit, under), RE- (redo, rest, react), PRE- (press, prey), OUT- (out, outer), OVER- (over, overt). When you spot one of these letter combinations on the board, immediately look for what can follow.

Suffixes are equally powerful: -ING (turning any verb into a present participle), -ED (past tense), -ER (comparative or agent noun), -TION (turns verbs to nouns), -LY (turns adjectives to adverbs), -NESS, -ABLE, -MENT.

The advanced technique is "bridge building": find a prefix on one side of the board and a suffix on the other, then see if the middle tiles connect them into a valid word. This is how most 6+ letter words are discovered.

Pro tip: the letter S is incredibly valuable. Any noun or verb you have already found might have an S adjacent to its last letter. Always check for plurals and third-person verb forms.`,
      },
      {
        title: 'Time Management: The 3-Phase Approach',
        content: `Top players divide their time into three distinct phases, regardless of the total timer length.

Phase 1 - Rapid Harvest (first 30%): Submit every word you see without overthinking. Speed matters more than word length here. Three-letter words are perfectly fine. Your goal is to bank guaranteed points and get a feel for the board.

Phase 2 - Deep Mining (middle 40%): Slow down. This is when you apply the prefix/suffix technique and look for longer words. Study tile clusters you have not explored. Try mentally tracing unusual paths. Most of your high-scoring words will come from this phase.

Phase 3 - Desperation Sweep (final 30%): Speed up again. Go back to areas you skimmed over in Phase 1. Try new starting tiles. Submit anything that looks remotely valid - the penalty for wrong guesses is minimal compared to the reward for finding forgotten words.

Many players make the mistake of spending too long in Phase 2. Set a mental checkpoint: if you have not found a new word in 10 seconds, force yourself to move to a different area of the board.`,
      },
      {
        title: 'Tile Cluster Recognition',
        content: `Expert players dont read letter by letter - they recognize clusters. With practice, certain letter groupings will jump out at you instantly.

High-value clusters: TH (the most common English bigram), IN, ER, AN, ON, AT, EN, ST, RE, ES. When you spot TH on the board, your brain should immediately start appending: THE, THEN, THEM, THIN, THIS, THAT, THOSE, THREE.

Vowel islands: Look for spots where 2-3 vowels cluster together. These are goldmines because they form the core of many words. A-I next to each other? Think AID, AIR, AIM, RAIN, MAIN, PAIR. O-U together? OUT, OUR, POUR, TOUR, FOUR.

Consonant blends: BL, BR, CL, CR, DR, FL, FR, GL, GR, PL, PR, SC, SH, SK, SL, SM, SN, SP, ST, SW, TR. These typically start words, so when you find one, trace paths forward to build words.

Dead zones: Some areas of the board will have awkward letter combinations (QX, ZJ, VV). Identify these quickly and stop wasting time on them. Not every tile will be part of a word.`,
      },
      {
        title: 'When to Submit vs. Keep Searching',
        content: `This is one of the most debated aspects of Classic strategy. Should you submit a word immediately, or keep tracing to see if it extends into something longer?

The general rule: submit first, extend second. If you see CAT, submit it. Then check if CATS, CATCH, or CATER is available. You lock in guaranteed points and can always build on them.

Exception: if you are within the first few seconds and you clearly see a 6+ letter word forming, trace the whole thing first. The point difference between a 3-letter word (2 pts) and a 7-letter word (6 pts) is significant enough to justify the brief delay.

In multiplayer specifically, submitting fast matters even more. If another player submits the same word before you, you both get credit, but speed affects tiebreakers. Get your words in early.

Never hold a word hoping to "save" it. There is no strategic benefit to delayed submission. The clock is always your enemy.`,
      },
      {
        title: 'Common Mistakes and How to Avoid Them',
        content: `Tunnel vision: The most common mistake is getting stuck trying to make one specific word work. If you have been staring at the same cluster for more than 5 seconds, move on. The board has dozens of words - do not fixate on one.

Ignoring short words: Some players skip 3-letter words because they seem "not worth it." Wrong. Ten 3-letter words (20 points) outscore two 6-letter words (10 points). Volume matters.

Forgetting diagonals: About 40% of words use at least one diagonal connection. Players who only scan horizontally and vertically miss nearly half the board. Force yourself to trace diagonal paths.

Not adapting to the board: Every board is different. Some boards are vowel-heavy and favor lots of short words. Others have rare consonant clusters that enable a few long words. Read the board in the first 10 seconds and adjust your strategy accordingly.

Panic in the last minute: When the timer gets low, many players freeze or start making wild guesses. Instead, fall back to your Phase 3 strategy - rapid sweeping of unexplored areas with quick submissions.`,
      },
    ],
    faq: [
      {
        question: 'What is the best starting strategy for Classic mode in LexiClash?',
        answer: 'Start by scanning corners first, then edges, then center tiles. Corner tiles have fewer connections, making words easier to trace. Spend the first 15 seconds getting a feel for the board layout before rapid-firing submissions.',
      },
      {
        question: 'How does scoring work in LexiClash Classic mode?',
        answer: 'Points equal word length minus one. A 3-letter word scores 2 points, a 4-letter word scores 3, and so on. Longer words are worth more, but submitting many short words is often more effective than hunting for a single long word.',
      },
      {
        question: 'How can I find longer words on the grid?',
        answer: 'Use the prefix/suffix hunting technique. Look for common beginnings like UN-, RE-, PRE- and endings like -ING, -ED, -TION. Then bridge-build between them using middle tiles. Most 6+ letter words are found this way.',
      },
      {
        question: 'Is it better to submit short words or look for long words?',
        answer: 'Submit short words first to lock in points, then hunt for longer ones. Ten 3-letter words (20 points) outscore three 5-letter words (12 points). Volume combined with occasional long finds is the winning formula.',
      },
    ],
    ctaText: 'Practice these strategies now',
    ctaLink: '/singleplayer',
    backToGuides: 'Back to Guides',
  },
  he: {
    title: 'מדריך אסטרטגיה למצב קלאסי: מצאו יותר מילים, השיגו ניקוד גבוה יותר',
    subtitle: 'שלטו בלוח עם טכניקות סריקה מוכחות, ניהול זמן ואסטרטגיות ניקוד.',
    category: 'אסטרטגיה',
    readTime: '8 דקות קריאה',
    authorName: 'חנון המילים',
    authorBio: 'שחקן משחקי מילים תחרותי עם 500+ שעות משחק במצב קלאסי.',
    quickTips: [
      'התחילו מהפינות - הן מתחברות לפחות אריחים, אז מילים קלות יותר לאיתור',
      'חפשו תחיליות נפוצות כמו ה-, מ-, ל- וסיומות כמו -ים, -ות, -ה',
      'הגישו מילים קצרות קודם כדי לבנות מומנטום, אז חפשו ארוכות יותר',
      'הקדישו 15 שניות ראשונות לסריקת כל הלוח לפני שמגישים משהו',
      'התמקדו באשכולות תנועות-עיצורים - הם עמוד השדרה של רוב המילים',
      'אל תשכחו חיבורים אלכסוניים - הם חושפים מילים נסתרות',
      'ב-30 השניות האחרונות, ירו מהר כל מילה בת 3 אותיות שאתם רואים',
    ],
    scoringTable,
    sections: [
      {
        title: 'הבנת הלוח הקלאסי',
        content: `מצב קלאסי מציב אתכם מול לוח אותיות עם שעון מתקתק. המשימה שלכם: למצוא כמה שיותר מילים חוקיות על ידי חיבור אריחים סמוכים - אופקית, אנכית או אלכסונית. כל אריח ניתן לשימוש פעם אחת בלבד למילה, ומילים חייבות להיות בנות 3 אותיות לפחות.

הניקוד פשוט: מילים ארוכות יותר מרוויחות יותר נקודות. מילה בת 3 אותיות נותנת 2 נקודות (אורך המילה פחות אחד), בעוד מילה בת 8 אותיות מרוויחה 7 נקודות. אבל המיומנות האמיתית היא לא בידיעת זה, אלא בפיתוח גישות שיטתיות למציאת מילים מהר יותר ובעקביות.

מה שמפריד בין שחקנים מזדמנים לבין מובילי הטבלה הוא לא גודל אוצר המילים בלבד - זה זיהוי תבניות וטכניקת קריאת לוח. האסטרטגיות במדריך הזה משמשות שחקנים שמשיגים באופן עקבי ניקוד ב-10% העליונים.`,
      },
      {
        title: 'תבנית סריקה: פינה-שוליים-מרכז',
        content: `אסטרטגיית הסריקה היעילה ביותר עוקבת אחר סדר ספציפי: פינות קודם, אז שוליים, אז מרכז.

למה פינות? אריחי פינה מתחברים רק ל-3 אריחים סמוכים (לעומת 8 לאריחי מרכז). זה אומר שמילים שמתחילות מפינות קלות יותר לאיתור מנטלי, ופחות סביר שתאבדו את הנתיב. התחילו בפינה העליונה וחפשו מילים בנות 3-4 אותיות שמתפשטות החוצה.

אריחי שוליים מתחברים ל-5 שכנים. אחרי שמיציתם התחלות מפינות, עברו לאורך כל שוליים. שחקנים רבים מדלגים על שוליים ישירות למרכז - זו טעות.

אריחי מרכז הם הכי מאתגרים. יש להם מקסימום חיבורים (עד 8 אריחים סמוכים), מה שאומר יותר נתיבים אפשריים אבל גם יותר בלבול. שמרו אותם לאחר שמצאתם את מילות הפינה והשוליים הקלות.`,
      },
      {
        title: 'ציד תחיליות וסיומות',
        content: `אחרי שביצעתם את הסריקה הראשונית, עברו למצב תחיליות/סיומות. כאן שחקנים מנוסים מתבדלים ממתחילים.

תחיליות נפוצות לחפש: ה- (הזמנה, הגנה), מ- (מכתב, מנוחה), ל- (לשון, לימוד), ב- (בניין, ברכה). כשאתם מזהים שילוב אותיות כזה על הלוח, חפשו מיד מה יכול להמשיך.

סיומות חזקות באותה מידה: -ים (רבים זכר), -ות (רבים נקבה), -ה (יחידה נקבה), -ת (סיומת פועל), -ן, -ית, -ני. הטכניקה המתקדמת היא "בניית גשרים": מצאו תחילית בצד אחד של הלוח וסיומת בצד השני, ובדקו אם האריחים באמצע מחברים אותם למילה חוקית.

טיפ מקצועי: האות י מאוד חשובה בעברית. היא מופיעה בתחיליות, סיומות ובאמצע מילים רבות. תמיד בדקו מה ניתן לבנות סביבה.`,
      },
      {
        title: 'ניהול זמן: גישת 3 השלבים',
        content: `שחקני עילית מחלקים את הזמן שלהם לשלושה שלבים ברורים.

שלב 1 - קציר מהיר (30% ראשונים): הגישו כל מילה שאתם רואים בלי לחשוב יותר מדי. מהירות חשובה יותר מאורך מילה כאן. מילים בנות 3 אותיות מצוינות. המטרה היא לצבור נקודות מובטחות ולהרגיש את הלוח.

שלב 2 - כרייה עמוקה (40% אמצעיים): האטו. זה הזמן ליישם את טכניקת התחיליות/סיומות ולחפש מילים ארוכות. חקרו אשכולות אריחים שלא בדקתם. רוב המילים בעלות הניקוד הגבוה יגיעו מהשלב הזה.

שלב 3 - סריקת ייאוש (30% אחרונים): האיצו שוב. חזרו לאזורים שרפרפתם עליהם בשלב 1. נסו אריחי התחלה חדשים. הגישו כל דבר שנראה חוקי מרחוק.

שחקנים רבים עושים את הטעות של לבלות יותר מדי זמן בשלב 2. הציבו נקודת ביקורת מנטלית: אם לא מצאתם מילה חדשה ב-10 שניות, הכריחו את עצמכם לעבור לאזור אחר בלוח.`,
      },
      {
        title: 'זיהוי אשכולות אריחים',
        content: `שחקנים מומחים לא קוראים אות אות - הם מזהים אשכולות. עם תרגול, שילובי אותיות מסוימים יקפצו לכם לעין מיד.

אשכולות בעלי ערך גבוה בעברית: שׁ-ת (שתיים, שתייה), מ-ת (מתנה, מתכון), ב-ר (ברכה, בריאות). כשאתם מזהים אשכול כזה על הלוח, המוח שלכם צריך להתחיל להוסיף אותיות מיד.

איי תנועות: חפשו מקומות שבהם 2-3 תנועות מתקבצות יחד. אלה מכרות זהב כי הם יוצרים את הליבה של מילים רבות.

אזורים מתים: חלק מאזורי הלוח יכילו שילובי אותיות מביכים. זהו אותם מהר והפסיקו לבזבז זמן עליהם. לא כל אריח יהיה חלק ממילה.`,
      },
      {
        title: 'מתי להגיש ומתי להמשיך לחפש',
        content: `זה אחד ההיבטים השנויים ביותר במחלוקת באסטרטגיית קלאסי. האם כדאי להגיש מילה מיד, או להמשיך לאתר כדי לראות אם היא מתארכת למשהו יותר ארוך?

הכלל הכללי: הגישו קודם, הרחיבו אחר כך. אם אתם רואים חתול, הגישו. אז בדקו אם חתולים או חתלתול זמינים. אתם נועלים נקודות מובטחות ותמיד יכולים לבנות עליהן.

חריג: אם אתם בתוך השניות הראשונות ואתם רואים בבירור מילה בת 6+ אותיות נבנית, אתרו את כולה קודם.

במרובה משתתפים ספציפית, הגשה מהירה חשובה עוד יותר. אם שחקן אחר מגיש את אותה מילה לפניכם, שניכם מקבלים קרדיט, אבל מהירות משפיעה על שוברי שוויון.

לעולם אל תחזיקו מילה בתקווה "לשמור" אותה. אין יתרון אסטרטגי להגשה מאוחרת. השעון תמיד האויב שלכם.`,
      },
      {
        title: 'טעויות נפוצות ואיך להימנע מהן',
        content: `ראייה מנהרתית: הטעות הנפוצה ביותר היא להיתקע בניסיון לגרום למילה ספציפית לעבוד. אם בהיתם באותו אשכול יותר מ-5 שניות, המשיכו הלאה.

התעלמות ממילים קצרות: חלק מהשחקנים מדלגים על מילים בנות 3 אותיות כי הן נראות "לא שוות". טעות. עשר מילים בנות 3 אותיות (20 נקודות) מנצחות שתי מילים בנות 6 אותיות (10 נקודות).

שכחת אלכסונים: כ-40% מהמילים משתמשות בחיבור אלכסוני אחד לפחות. שחקנים שסורקים רק אופקית ואנכית מפספסים כמעט חצי מהלוח.

אי-התאמה ללוח: כל לוח שונה. חלק מהלוחות עשירים בתנועות ומעדיפים מילים קצרות רבות. אחרים מכילים אשכולות עיצורים נדירים שמאפשרים כמה מילים ארוכות. קראו את הלוח ב-10 השניות הראשונות והתאימו.

פאניקה בדקה האחרונה: כשהטיימר יורד, שחקנים רבים קופאים. במקום, חזרו לאסטרטגיית שלב 3 - סריקה מהירה של אזורים לא חקורים.`,
      },
    ],
    faq: [
      {
        question: 'מהי אסטרטגיית ההתחלה הטובה ביותר למצב קלאסי בלקסיקלאש?',
        answer: 'התחילו בסריקת פינות קודם, אז שוליים, אז אריחי מרכז. לאריחי פינה יש פחות חיבורים, מה שהופך מילים לקלות יותר לאיתור. הקדישו 15 שניות ראשונות להבנת מבנה הלוח.',
      },
      {
        question: 'איך עובד הניקוד במצב קלאסי של לקסיקלאש?',
        answer: 'נקודות שוות לאורך המילה פחות אחד. מילה בת 3 אותיות מקבלת 2 נקודות, בת 4 אותיות 3 נקודות, וכן הלאה. מילים ארוכות שוות יותר, אבל הגשת מילים קצרות רבות לעיתים קרובות יעילה יותר.',
      },
      {
        question: 'איך אפשר למצוא מילים ארוכות יותר על הלוח?',
        answer: 'השתמשו בטכניקת ציד תחיליות/סיומות. חפשו התחלות נפוצות כמו ה-, מ-, ל- וסיומות כמו -ים, -ות, -ה. אז בנו גשרים ביניהן באמצעות אריחים אמצעיים.',
      },
      {
        question: 'עדיף להגיש מילים קצרות או לחפש מילים ארוכות?',
        answer: 'הגישו מילים קצרות קודם כדי לנעול נקודות, אז חפשו ארוכות יותר. עשר מילים בנות 3 אותיות (20 נקודות) מנצחות שלוש מילים בנות 5 אותיות (12 נקודות). נפח בשילוב עם ממצאים ארוכים מזדמנים הוא הנוסחה המנצחת.',
      },
    ],
    ctaText: 'תרגלו את האסטרטגיות עכשיו',
    ctaLink: '/singleplayer',
    backToGuides: 'חזרה למדריכים',
  },
  sv: {
    title: 'Strategiguide for Klassiskt Lage: Hitta Fler Ord, Fa Hogre Poang',
    subtitle: 'Bemestra rutnatet med bevisade skanningsmonster, tidshantering och poangstrategier.',
    category: 'Strategi',
    readTime: '8 min lasning',
    authorName: 'Ordnorden',
    authorBio: 'Tavlingsspelare med 500+ timmar i klassiskt lage.',
    quickTips: [
      'Borja fran horn - de ansluter till farre plattor, sa ord ar lattare att spara',
      'Leta efter vanliga prefix som O-, FOR-, UT- och suffix som -ING, -NING, -AR',
      'Skicka in korta ord forst for att bygga momentum, sedan jaga langre',
      'Lagg de forsta 15 sekunderna pa att skanna hela bradet innan du skickar nagot',
      'Fokusera pa vokal-konsonant-kluster - de bildar ryggraden i de flesta ord',
      'Glom inte diagonala kopplingar - de avsljar dolda ord som andra missar',
      'Under de sista 30 sekunderna, snabbskjut alla 3-bokstavsord du ser',
    ],
    scoringTable,
    sections: [
      {
        title: 'Forsta det Klassiska Rutnatet',
        content: `Klassiskt lage placerar dig framfor ett rutnat av bokstaver med en tickande klocka. Ditt uppdrag: hitta sa manga giltiga ord som mojligt genom att koppla intilliggande plattor - horisontellt, vertikalt eller diagonalt. Varje platta kan bara anvandas en gang per ord, och ord maste vara minst 3 bokstaver langa.

Poangsattningen ar enkel: langre ord ger mer poang. Ett 3-bokstavsord ger 2 poang (ordlangd minus ett), medan ett 8-bokstavsord ger 7 poang. Men den verkliga skickligheten ligger inte i att veta detta, utan i att utveckla systematiska metoder for att hitta ord snabbare.

Det som skiljer vanliga spelare fran toppspelare ar inte ordforrad ensamt - det ar monsterigenkanning och bradlasingsteknik. Strategierna i denna guide anvands av spelare som konsekvent placerar sig i topp 10%.`,
      },
      {
        title: 'Horn-Kant-Center Skanningsmonster',
        content: `Den mest effektiva skanningsstrategin foljer en specifik ordning: horn forst, sedan kanter, sedan center.

Varfor horn? Hornplattor ansluter till bara 3 intilliggande plattor (jamfort med 8 for centerplattor). Det innebar att ord som borjar fran horn ar lattare att spara mentalt. Borja i det ovre vanstra hornet och leta efter 3-4 bokstavsord som straalar utaat.

Kantplattor ansluter till 5 grannar. Efter att ha uttornat hornstarter, ror dig langs varje kant. Manga spelare hoppar over kanter och gar direkt till center - detta ar ett misstag.

Centerplattor ar svaarast. De har maximalt antal kopplingar (upp till 8 intilliggande plattor), vilket innebar fler mojliga vagar men ocksa mer forvirring. Spara dessa till efter att du har hittat de latta horn- och kantorden.

En fullstandig horn-kant-center skanning tar ungefar 30-40 sekunder. Efter det, overgaa till riktat soke efter specifika monster.`,
      },
      {
        title: 'Prefix- och Suffixjakt',
        content: `Nar du har gjort din initiala skanning, byt till prefix/suffix-lage. Har ar dar erfarna spelare skiljer sig fran nyborjare.

Vanliga prefix att jaga: O- (om, ord), FOR- (for, fordel), UT- (ut, utan), AV- (av, avgift), AN- (an, anda). Nar du upptacker en sadan bokstavskombination pa bradet, leta omedelbart efter vad som kan folja.

Suffix ar lika kraftfulla: -ING (vandning), -NING (borjan), -AR (plural), -ER (komparativ), -EN (bestamnd form), -ANDE, -TION, -SKAP.

Den avancerade tekniken ar "brobyggande": hitta ett prefix pa ena sidan av bradet och ett suffix pa den andra, se sedan om mellanbokstaverna forbinder dem till ett giltigt ord. Sa hittas de flesta 6+ bokstavsord.

Proffstips: bokstaven S ar otroligt vardefull pa svenska. Nagon substantiv eller verb du redan hittat kan ha ett S intill sin sista bokstav. Kontrollera alltid for pluraler.`,
      },
      {
        title: 'Tidshantering: 3-Fas Metoden',
        content: `Toppspelare delar sin tid i tre distinkta faser.

Fas 1 - Snabbskord (forsta 30%): Skicka in varje ord du ser utan att overtanka. Hastighet ar viktigare an ordlangd har. Trebokstavsord ar helt okej. Malet ar att banka garanterade poang och fa en kansla for bradet.

Fas 2 - Djupbrytning (mellersta 40%): Sakta ner. Nu tillaampar du prefix/suffix-tekniken och letar efter langre ord. Studera plattkluster du inte utforskat. De flesta av dina hogpoangord kommer fran denna fas.

Fas 3 - Desperationsskanning (sista 30%): Oka farten igen. Gaa tillbaka till omraden du skummade over i Fas 1. Prova nya startplattor. Skicka in allt som ser remoterligt giltigt ut.

Manga spelare gor misstaget att tillbringa for lang tid i Fas 2. Satt en mental kontrollpunkt: om du inte har hittat ett nytt ord pa 10 sekunder, tvinga dig att flytta till ett annat omrade.`,
      },
      {
        title: 'Plattkluster-Igenkanning',
        content: `Expertspelare laser inte bokstav for bokstav - de kanner igen kluster. Med ovning kommer vissa bokstavsgrupperingar att hoppa ut omedelbart.

Hogvardiga kluster pa svenska: ST (start, sten), AN (and, ande), ER (er, ert), IN (in, inne), OR (ord, ort). Nar du ser ST pa bradet bor din hjarna omedelbart borja bygga: STEN, STOL, STOR, STARK.

Vokalgrupper: Leta efter platser dar 2-3 vokaler klustrar ihop. Dessa ar guldgruvor. A-I intill varandra? Tank AID, AIR. O-U tillsammans? OUT, OUR.

Konsonantblandningar: BL, BR, DR, FL, FR, GL, GR, KL, KR, PL, PR, SK, SL, SM, SN, SP, ST, SV, TR. Dessa borjar vanligtvis ord.

Doda zoner: Vissa omraden pa bradet har klumpiga bokstavskombinationer. Identifiera dessa snabbt och sluta slosa tid pa dem.`,
      },
      {
        title: 'Vanliga Misstag och Hur Du Undviker Dem',
        content: `Tunnelseende: Det vanligaste misstaget ar att fastna i att forsoka fa ett specifikt ord att fungera. Om du har stirrat pa samma kluster i mer an 5 sekunder, gaa vidare.

Ignorera korta ord: Vissa spelare hoppar over 3-bokstavsord for att de verkar "inte varda det." Fel. Tio 3-bokstavsord (20 poang) overtraffar tva 6-bokstavsord (10 poang). Volym spelar roll.

Glomma diagonaler: Ungefar 40% av orden anvander minst en diagonal koppling. Spelare som bara skannar horisontellt och vertikalt missar nastan halva bradet.

Att inte anpassa sig till bradet: Varje brade ar annorlunda. Vissa braden ar vokaltunga och gynnar manga korta ord. Andra har sallsynta konsonantkluster som mojliggor nagra langa ord. Las bradet de forsta 10 sekunderna och justera.

Panik sista minuten: Nar timern blir lag fryser manga spelare. Fall istallet tillbaka till din Fas 3-strategi - snabb svepning av outforskade omraden.`,
      },
    ],
    faq: [
      {
        question: 'Vad ar den basta startstrategin for Klassiskt lage i LexiClash?',
        answer: 'Borja med att skanna horn forst, sedan kanter, sedan centerplattor. Hornplattor har farre kopplingar, vilket gor ord lattare att spara. Lagg de forsta 15 sekunderna pa att fa en kansla for bradets layout.',
      },
      {
        question: 'Hur fungerar poangsattningen i LexiClash Klassiskt lage?',
        answer: 'Poang ar lika med ordlangd minus ett. Ett 3-bokstavsord ger 2 poang, ett 4-bokstavsord ger 3, och sa vidare. Langre ord ar varda mer, men att skicka manga korta ord ar ofta effektivare.',
      },
      {
        question: 'Hur hittar jag langre ord pa rutnatet?',
        answer: 'Anvand prefix/suffix-jakttekniken. Leta efter vanliga borjor som O-, FOR-, UT- och slut som -ING, -NING, -AR. Bygg sedan broar mellan dem med mellanplattor.',
      },
      {
        question: 'Ar det battre att skicka korta ord eller leta efter langa ord?',
        answer: 'Skicka korta ord forst for att lasa in poang, sedan jaga langre. Tio 3-bokstavsord (20 poang) overtraffar tre 5-bokstavsord (12 poang). Volym kombinerat med tillfaalliga langa fynd ar vinnarformeln.',
      },
    ],
    ctaText: 'Ova dessa strategier nu',
    ctaLink: '/singleplayer',
    backToGuides: 'Tillbaka till guider',
  },
  ja: {
    title: 'クラシックモード攻略ガイド：もっと単語を見つけて高得点を狙おう',
    subtitle: '実証済みのスキャンパターン、時間管理、スコアリング戦略でグリッドをマスター。',
    category: '攻略',
    readTime: '8分で読める',
    authorName: 'ワードオタク',
    authorBio: 'クラシックモードで500時間以上プレイした競技ワードゲームプレイヤー。',
    quickTips: [
      '角から始める - 接続タイルが少ないので単語が追跡しやすい',
      '一般的な接頭辞や接尾辞を探す',
      '短い単語を先に送信してモメンタムを作り、その後長い単語を探す',
      '最初の15秒はボード全体をスキャンしてから送信を始める',
      '母音と子音のクラスターに注目 - ほとんどの単語の骨格を形成する',
      '対角線の接続を忘れない - 他の人が見逃す隠れた単語を発見できる',
      '最後の30秒は見つけた3文字の単語をすべて素早く送信する',
    ],
    scoringTable,
    sections: [
      {
        title: 'クラシックグリッドを理解する',
        content: `クラシックモードでは、制限時間内に文字のグリッドから単語を見つけます。隣接するタイル（水平、垂直、または対角線）を接続して、できるだけ多くの有効な単語を見つけることが目標です。各タイルは1つの単語につき1回のみ使用でき、単語は3文字以上でなければなりません。

スコアリングはシンプルです。長い単語ほど多くのポイントを獲得します。3文字の単語は2ポイント（単語の長さマイナス1）、8文字の単語は7ポイントを獲得します。しかし、本当のスキルはこれを知ることではなく、より速く一貫して単語を見つけるための体系的なアプローチを開発することにあります。

カジュアルプレイヤーとトップスコアラーを分けるのは語彙力だけではありません。パターン認識とボード読みのテクニックです。このガイドの戦略は、常にトップ10%のスコアを出すプレイヤーが使用しています。`,
      },
      {
        title: '角-辺-中央スキャンパターン',
        content: `最も効果的なスキャン戦略は、特定の順序に従います：まず角、次に辺、そして中央。

なぜ角から？角のタイルは隣接する3つのタイルにのみ接続します（中央タイルの8つと比較して）。つまり、角から始まる単語は精神的に追跡しやすく、パスを見失う可能性が低くなります。左上の角から始めて、外側に広がる3-4文字の単語を探しましょう。

辺のタイルは5つの隣接タイルに接続します。角の開始を使い切った後、各辺に沿って移動します。多くのプレイヤーは辺を飛ばして中央に直行しますが、これは間違いです。

中央のタイルは最も難しいです。最大接続数（最大8つの隣接タイル）を持つため、可能なパスは多いですが混乱も多くなります。角と辺の簡単な単語を見つけた後に取り組みましょう。

完全な角-辺-中央スキャンには約30-40秒かかります。その後、特定のパターンを狙った探索に切り替えます。`,
      },
      {
        title: '接頭辞と接尾辞の探索',
        content: `初期スキャンが終わったら、接頭辞/接尾辞モードに切り替えます。ここで経験豊富なプレイヤーは初心者と差をつけます。

日本語のワードゲームでも、文字の組み合わせパターンを認識することが重要です。よく出現する文字の並びを覚えておくと、素早く単語を見つけることができます。

上級テクニックは「ブリッジビルディング」：ボードの一方に接頭辞を見つけ、もう一方に接尾辞を見つけ、中間のタイルがそれらを有効な単語に接続するかどうかを確認します。6文字以上の単語のほとんどはこの方法で発見されます。

プロのヒント：よく使われる文字は非常に価値があります。すでに見つけた単語に隣接する文字を確認し、拡張できないか常にチェックしましょう。`,
      },
      {
        title: '時間管理：3フェーズアプローチ',
        content: `トッププレイヤーは時間を3つの明確なフェーズに分けます。

フェーズ1 - 高速収穫（最初の30%）：見つけた単語をすべて考えすぎずに送信します。ここではスピードが単語の長さより重要です。3文字の単語で十分です。目標は確実なポイントを稼ぎ、ボードの感触をつかむことです。

フェーズ2 - 深掘り（中間の40%）：ペースを落とします。接頭辞/接尾辞テクニックを適用し、長い単語を探す時間です。まだ探索していないタイルクラスターを研究します。高得点の単語のほとんどはこのフェーズで見つかります。

フェーズ3 - 最後の追い込み（最後の30%）：再びスピードアップします。フェーズ1で軽く見た領域に戻ります。新しい開始タイルを試します。有効に見えるものは何でも送信します。

多くのプレイヤーはフェーズ2に時間をかけすぎるという間違いを犯します。メンタルチェックポイントを設定しましょう：10秒間新しい単語が見つからなければ、ボードの別のエリアに移動することを強制してください。`,
      },
      {
        title: 'タイルクラスター認識',
        content: `エキスパートプレイヤーは文字を1つずつ読むのではなく、クラスターを認識します。練習を重ねると、特定の文字の組み合わせが瞬時に目に飛び込んでくるようになります。

高価値クラスター：よく使われる文字の組み合わせを見つけたら、脳はすぐに単語を構築し始めるべきです。

母音のアイランド：2-3つの母音がまとまっている場所を探しましょう。これらは多くの単語のコアを形成するため、宝の山です。

子音ブレンド：これらは通常単語の始まりに来るので、見つけたら前方にパスをたどって単語を構築します。

デッドゾーン：ボードの一部のエリアには扱いにくい文字の組み合わせがあります。これらを素早く特定し、時間を無駄にするのをやめましょう。すべてのタイルが単語の一部になるわけではありません。`,
      },
      {
        title: 'よくある間違いとその回避方法',
        content: `トンネルビジョン：最も一般的な間違いは、特定の単語を作ろうとして行き詰まることです。同じクラスターを5秒以上見つめていたら、先に進みましょう。

短い単語の無視：一部のプレイヤーは3文字の単語を「価値がない」と思ってスキップします。間違いです。10個の3文字の単語（20ポイント）は、2個の6文字の単語（10ポイント）を上回ります。量が重要です。

対角線を忘れる：単語の約40%は少なくとも1つの対角線接続を使用します。水平と垂直のみをスキャンするプレイヤーは、ボードのほぼ半分を見逃しています。

ボードに適応しない：すべてのボードは異なります。母音が多いボードもあれば、珍しい子音クラスターがあるボードもあります。最初の10秒でボードを読み、戦略を調整しましょう。

最後の1分のパニック：タイマーが残り少なくなると、多くのプレイヤーがフリーズします。代わりに、フェーズ3の戦略に戻りましょう。`,
      },
    ],
    faq: [
      {
        question: 'LexiClashのクラシックモードで最良の開始戦略は何ですか？',
        answer: 'まず角をスキャンし、次に辺、そして中央タイルの順に進みます。角タイルは接続が少ないため、単語を追跡しやすくなります。最初の15秒はボードレイアウトの把握に使いましょう。',
      },
      {
        question: 'LexiClashクラシックモードのスコアリングはどのように機能しますか？',
        answer: 'ポイントは単語の長さマイナス1です。3文字の単語は2ポイント、4文字は3ポイント、というように続きます。長い単語はより価値がありますが、多くの短い単語を送信する方がしばしば効果的です。',
      },
      {
        question: 'グリッド上でより長い単語を見つけるにはどうすればよいですか？',
        answer: '接頭辞/接尾辞探索テクニックを使用します。一般的な始まりと終わりを探し、中間タイルでそれらをつなぎます。6文字以上の単語のほとんどはこの方法で見つかります。',
      },
      {
        question: '短い単語を送信するのと長い単語を探すのとではどちらが良いですか？',
        answer: 'まず短い単語を送信してポイントを確保し、その後長い単語を探します。10個の3文字の単語（20ポイント）は3個の5文字の単語（12ポイント）を上回ります。量と時折の長い発見の組み合わせが勝利の方程式です。',
      },
    ],
    ctaText: 'これらの戦略を今すぐ練習する',
    ctaLink: '/singleplayer',
    backToGuides: 'ガイドに戻る',
  },
  es: {
    title: 'Guia de Estrategia del Modo Clasico: Encuentra Mas Palabras, Obtiene Mayor Puntaje',
    subtitle: 'Domina la cuadricula con patrones de escaneo probados, gestion del tiempo y estrategias de puntuacion.',
    category: 'Estrategia',
    readTime: '8 min de lectura',
    authorName: 'El Nerd de las Palabras',
    authorBio: 'Jugador competitivo de juegos de palabras con mas de 500 horas en modo clasico.',
    quickTips: [
      'Comienza desde las esquinas - se conectan a menos fichas, asi que las palabras son mas faciles de trazar',
      'Busca prefijos comunes como DES-, RE-, PRE- y sufijos como -CION, -MENTE, -ANDO',
      'Envia palabras cortas primero para generar impulso, luego busca las largas',
      'Dedica los primeros 15 segundos a escanear todo el tablero antes de enviar nada',
      'Concentrate en grupos de vocales y consonantes - forman la columna vertebral de la mayoria de las palabras',
      'No olvides las conexiones diagonales - revelan palabras ocultas que otros pasan por alto',
      'En los ultimos 30 segundos, dispara rapido cualquier palabra de 3 letras que veas',
    ],
    scoringTable,
    sections: [
      {
        title: 'Entendiendo la Cuadricula Clasica',
        content: `El modo clasico te coloca frente a una cuadricula de letras con un reloj en marcha. Tu mision: encontrar tantas palabras validas como sea posible conectando fichas adyacentes - horizontal, vertical o diagonalmente. Cada ficha solo puede usarse una vez por palabra, y las palabras deben tener al menos 3 letras.

La puntuacion es directa: las palabras mas largas ganan mas puntos. Una palabra de 3 letras te da 2 puntos (longitud de la palabra menos uno), mientras que una de 8 letras gana 7 puntos. Pero la verdadera habilidad no esta en saber esto, sino en desarrollar enfoques sistematicos para encontrar palabras mas rapido y de manera consistente.

Lo que separa a los jugadores casuales de los mejores puntuadores no es solo el tamano del vocabulario, es el reconocimiento de patrones y la tecnica de lectura del tablero. Las estrategias en esta guia son utilizadas por jugadores que consistentemente puntuan en el top 10%.`,
      },
      {
        title: 'El Patron de Escaneo Esquina-Borde-Centro',
        content: `La estrategia de escaneo mas efectiva sigue un orden especifico: esquinas primero, luego bordes, luego centro.

Por que esquinas? Las fichas de esquina se conectan a solo 3 fichas adyacentes (comparado con 8 para fichas del centro). Esto significa que las palabras que comienzan desde esquinas son mas faciles de trazar mentalmente. Comienza en la esquina superior izquierda y busca palabras de 3-4 letras que se expandan hacia afuera.

Las fichas de borde se conectan a 5 vecinos. Despues de agotar los inicios de esquina, muevete a lo largo de cada borde. Muchos jugadores saltan los bordes y van directo al centro - esto es un error.

Las fichas del centro son las mas complicadas. Tienen el maximo de conexiones (hasta 8 fichas adyacentes), lo que significa mas caminos posibles pero tambien mas confusion. Guardalas para despues de haber encontrado las palabras faciles de esquinas y bordes.

Un escaneo completo de esquina-borde-centro toma unos 30-40 segundos. Despues de eso, cambia a busqueda dirigida de patrones especificos.`,
      },
      {
        title: 'Caza de Prefijos y Sufijos',
        content: `Una vez que hayas hecho tu escaneo inicial, cambia al modo prefijo/sufijo. Aqui es donde los jugadores experimentados se separan de los principiantes.

Prefijos comunes para buscar: DES- (deshacer, despertar), RE- (repetir, revisar), PRE- (prevenir, preparar), IN- (incapaz, incierto), CON- (contener, confiar). Cuando detectes una de estas combinaciones en el tablero, busca inmediatamente que puede seguir.

Los sufijos son igualmente poderosos: -CION (accion, cancion), -MENTE (rapidamente), -ANDO/-IENDO (gerundios), -ADO/-IDO (participios), -ABLE (notable), -DAD (ciudad).

La tecnica avanzada es la "construccion de puentes": encuentra un prefijo en un lado del tablero y un sufijo en el otro, luego ve si las fichas intermedias los conectan en una palabra valida. Asi es como se descubren la mayoria de las palabras de 6+ letras.

Consejo profesional: la letra S es increiblemente valiosa. Cualquier sustantivo o verbo que ya hayas encontrado puede tener una S adyacente a su ultima letra. Siempre verifica los plurales.`,
      },
      {
        title: 'Gestion del Tiempo: El Enfoque de 3 Fases',
        content: `Los mejores jugadores dividen su tiempo en tres fases distintas.

Fase 1 - Cosecha Rapida (primer 30%): Envia cada palabra que veas sin pensar demasiado. La velocidad importa mas que la longitud de la palabra aqui. Las palabras de 3 letras estan perfectamente bien. Tu objetivo es acumular puntos garantizados y sentir el tablero.

Fase 2 - Mineria Profunda (40% medio): Reduce la velocidad. Este es el momento de aplicar la tecnica de prefijo/sufijo y buscar palabras mas largas. Estudia grupos de fichas que no hayas explorado. La mayoria de tus palabras de alta puntuacion vendran de esta fase.

Fase 3 - Barrido Desesperado (ultimo 30%): Acelera de nuevo. Vuelve a areas que pasaste por encima en la Fase 1. Prueba nuevas fichas de inicio. Envia cualquier cosa que parezca remotamente valida.

Muchos jugadores cometen el error de pasar demasiado tiempo en la Fase 2. Establece un punto de control mental: si no has encontrado una nueva palabra en 10 segundos, forzate a moverte a un area diferente del tablero.`,
      },
      {
        title: 'Reconocimiento de Grupos de Fichas',
        content: `Los jugadores expertos no leen letra por letra - reconocen grupos. Con practica, ciertas agrupaciones de letras te saltaran a la vista instantaneamente.

Grupos de alto valor en espanol: ST (estar, este), AN (ante, andar), ER (era, error), EN (en, entre), AR (arbol, arar). Cuando veas uno de estos en el tablero, tu cerebro deberia comenzar a construir palabras inmediatamente.

Islas de vocales: Busca lugares donde 2-3 vocales se agrupen juntas. Estas son minas de oro porque forman el nucleo de muchas palabras. A-E juntas? Piensa en CAER, NACER. I-O juntas? RIO, FRIO.

Mezclas de consonantes: BL, BR, CL, CR, DR, FL, FR, GL, GR, PL, PR, TR. Estas tipicamente inician palabras, asi que cuando encuentres una, traza caminos hacia adelante.

Zonas muertas: Algunas areas del tablero tendran combinaciones de letras incomodas. Identificalas rapidamente y deja de perder tiempo en ellas.`,
      },
      {
        title: 'Errores Comunes y Como Evitarlos',
        content: `Vision de tunel: El error mas comun es quedarse atrapado intentando hacer funcionar una palabra especifica. Si has estado mirando el mismo grupo por mas de 5 segundos, sigue adelante.

Ignorar palabras cortas: Algunos jugadores saltan las palabras de 3 letras porque parecen "no valer la pena." Incorrecto. Diez palabras de 3 letras (20 puntos) superan dos palabras de 6 letras (10 puntos). El volumen importa.

Olvidar las diagonales: Aproximadamente el 40% de las palabras usan al menos una conexion diagonal. Los jugadores que solo escanean horizontal y verticalmente pierden casi la mitad del tablero.

No adaptarse al tablero: Cada tablero es diferente. Algunos tableros tienen muchas vocales y favorecen muchas palabras cortas. Otros tienen grupos de consonantes raras que permiten unas pocas palabras largas. Lee el tablero en los primeros 10 segundos y ajusta tu estrategia.

Panico en el ultimo minuto: Cuando el temporizador baja, muchos jugadores se paralizan. En su lugar, vuelve a tu estrategia de Fase 3 - barrido rapido de areas inexploradas con envios rapidos.`,
      },
    ],
    faq: [
      {
        question: 'Cual es la mejor estrategia inicial para el modo Clasico en LexiClash?',
        answer: 'Comienza escaneando esquinas primero, luego bordes, luego fichas del centro. Las fichas de esquina tienen menos conexiones, haciendo las palabras mas faciles de trazar. Dedica los primeros 15 segundos a entender el diseno del tablero.',
      },
      {
        question: 'Como funciona la puntuacion en el modo Clasico de LexiClash?',
        answer: 'Los puntos son iguales a la longitud de la palabra menos uno. Una palabra de 3 letras obtiene 2 puntos, una de 4 letras obtiene 3, y asi sucesivamente. Las palabras largas valen mas, pero enviar muchas palabras cortas es frecuentemente mas efectivo.',
      },
      {
        question: 'Como puedo encontrar palabras mas largas en la cuadricula?',
        answer: 'Usa la tecnica de caza de prefijos/sufijos. Busca comienzos comunes como DES-, RE-, PRE- y terminaciones como -CION, -MENTE, -ANDO. Luego construye puentes entre ellos usando fichas intermedias.',
      },
      {
        question: 'Es mejor enviar palabras cortas o buscar palabras largas?',
        answer: 'Envia palabras cortas primero para asegurar puntos, luego busca las largas. Diez palabras de 3 letras (20 puntos) superan tres palabras de 5 letras (12 puntos). Volumen combinado con hallazgos largos ocasionales es la formula ganadora.',
      },
    ],
    ctaText: 'Practica estas estrategias ahora',
    ctaLink: '/singleplayer',
    backToGuides: 'Volver a guias',
  },
};
