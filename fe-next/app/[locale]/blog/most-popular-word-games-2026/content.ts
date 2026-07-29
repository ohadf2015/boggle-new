// Article content — culturally adapted per locale.
// Hebrew written with native idiom (per project rule); he/sv/ja/es hand-styled
// from research, native review pending. Facts sourced — see citations in page.tsx.

export type Section = {
  title?: string;
  content: string;
  image?: { src: string; alt: string };
};

export type LocaleContent = {
  title: string;
  subtitle: string;
  category: string;
  readTime: string;
  authorName: string;
  authorBio: string;
  sections: Section[];
  backToBlog: string;
  tryDaily: string;
  practice: string;
  playMultiplayer: string;
};

const HERO = '/images/blog/most-popular-word-games-2026.jpg';
const IMG_MULTIPLAYER = '/images/blog/multiplayer-social.jpg';
const IMG_BRAIN = '/images/blog/brain-training-words.jpg';
const IMG_VOCAB = '/images/blog/vocabulary-building.jpg';

export const contentByLocale: Record<string, LocaleContent> = {
  en: {
    title: 'The Most Popular Online Word Games of 2026 — and Why They Exploded',
    subtitle:
      'From a puzzle one guy built for his girlfriend to a $3.36 billion industry. Here are the word games everyone is actually playing in 2026 — and the surprisingly human reasons each one took off.',
    category: 'Trends',
    readTime: '8 min read',
    authorName: 'Ohad Fisher',
    authorBio:
      "I build word games for a living, which means I also play everyone else's word games \"for research\" until 2am. Bias fully acknowledged.",
    sections: [
      {
        content: `Let me give you one number to start with: $3.36 billion.

That's the projected revenue of the word-games market in 2026 — up more than 50% since 2022, growing at roughly 9.6% a year. Five years ago, word games basically meant "the crossword your grandparent does in pen." Now it's a multi-billion dollar industry, and the games making it happen are deceptively simple.

So what are people actually playing? And — the more interesting question — why did each of these games blow up the way it did? I went down the rabbit hole. Here's the honest field guide to the most popular online word games of 2026, with the origin story behind each one.`,
        image: { src: '/images/blog/most-popular-word-games-2026.jpg', alt: 'Neo-brutalist illustration of word game letter tiles exploding upward like a rocket' },
      },
      {
        title: 'Wordle — the puzzle that went from 90 players to 2 million',
        content: `You cannot tell this story without starting here.

Josh Wardle, a software engineer from Wales, built Wordle in 2021 as a gift for his partner, who loved word games. He named it after himself — Wardle, Wordle, you get it. No ads. No accounts. No leaderboard. Just one five-letter word a day.

On November 1, 2021, it had 90 players. By the end of that month: 300,000. By January 2022: over 2 million daily players. That is not a typo — it's one of the fastest organic growth curves in the history of casual games, achieved with a marketing budget of exactly zero.

The New York Times bought it at the end of January 2022 for "a low seven figures." That price looks prescient now — Wordle became one of NYT Games' most reliable subscription drivers, and it's still pulling millions of daily players in 2026.

The genius wasn't the puzzle. It was the constraint: one game a day. You physically cannot binge it. Scarcity turned a simple word guess into a daily ritual.`,
      },
      {
        title: 'Connections — the sequel that nearly ate the original',
        content: `Here's the plot twist nobody saw coming: the New York Times built a second word game that, by some measures, out-plays Wordle itself.

Connections launched in June 2023, created by NYT puzzle editor Wyna Liu. The format is deceptively mean: 16 words, sort them into 4 hidden groups of 4. The catch is that the puzzle deliberately plants overlap — words that look like they belong together but don't — so your first instinct is usually a trap.

By 2024 it had settled in as the second-most-played game in the entire NYT Games lineup. For a lot of players it's now the *first* thing they open, before Wordle.

Why did it hit? Because it's argument fuel. Wordle is solitary. Connections is the puzzle you scream about in the group chat — "how did you not see the purple category?" — and that social friction becomes rocket fuel for a daily habit.`,
        image: { src: '/images/blog/multiplayer-social.jpg', alt: 'Friends arguing playfully over a word puzzle on their phones' },
      },
      {
        title: 'The multi-grid arms race and the depths players crave',
        content: `Wordle's success spawned a whole genre of "but harder" variants.

**Quordle** (2022): four Wordles at once, nine guesses total. **Octordle** (also 2022): *eight* grids, thirteen guesses. These exist for players who found one Wordle too easy and wanted their morning coffee to come with a small panic attack.

**Squaredle** took a different approach — a Boggle-style 4×4 grid where you trace adjacent letters to find every word hidden in the board. No single answer, no limited guesses; just you versus the grid, hunting for the long words that score big.

The lesson here is subtle but important: there is real, durable demand for *depth*. Not everyone wants a 30-second puzzle. A meaningful slice of players wants a grid they can really chew on.`,
        image: { src: '/images/blog/brain-training-words.jpg', alt: 'A dense letter grid puzzle illustration' },
      },
      {
        title: 'Words With Friends and the social lane that never died',
        content: `While the daily-puzzle world was exploding, the original word-game juggernaut just kept... going.

Words With Friends — now under Take-Two Interactive — has crossed 6 billion lifetime downloads, and in late 2025 it shipped a whole suite of new single-player modes.

It plays a completely different game from Wordle, literally and strategically. It's asynchronous, it's tile-based, and the whole point is *who* you're playing — your mum, your college roommate, that one friend who takes four days per turn. Wordle is a ritual. Words With Friends is a relationship.

That distinction matters, because it's the gap a lot of newer games are racing to fill: the daily puzzle gives you the habit, but the multiplayer game gives you the people.`,
      },
      {
        title: 'Why did all of them explode? Four forces.',
        content: `Step back and the same four engines show up under every one of these games.

**1. The daily habit loop.** One puzzle a day, a streak you'd hate to break. Scarcity beats abundance — you can't doom-scroll a thing that only exists once every 24 hours.

**2. "Brain-good" guilt-free screen time.** A widely-cited study of 19,000+ adults over 50 found frequent word-puzzle players performed on some reasoning measures as if they were up to a decade younger. Whether or not you buy the strongest version of that claim, the *framing* is gold: word games are the rare app nobody nags you for opening.

**3. The share button.** Wordle's spoiler-free emoji grid turned every solve into free marketing. TikTok and Reels did the rest — "watch me solve this" became genuinely watchable content.

**4. Going multilingual, finally.** For years, word games meant English. That's breaking fast — Hebrew daily-word games, Japanese kana puzzles, Spanish "juego de palabras" apps are all pulling real numbers. The next 100 million daily players won't be playing in English.`,
        image: { src: '/images/blog/vocabulary-building.jpg', alt: 'Word games spreading across multiple languages illustration' },
      },
      {
        content: `The real story of 2026 isn't any single game. It's that "word game" stopped being a hobby and became *infrastructure* — the default way streaming services, news apps, and brain-training products earn a daily open.

Five years ago that would have sounded ridiculous. Now there's a $3.36 billion industry, a Netflix tile, and a TikTok hashtag with billions of views all built on the simple pleasure of finding a word that wasn't obvious a second ago.

Grandma was right all along. The pen was just optional.`,
      },
    ],
    backToBlog: 'Back to Blog',
    tryDaily: 'Try the Daily Challenge',
    practice: 'Practice Solo',
    playMultiplayer: 'Play Multiplayer',
  },
  he: {
    title: 'משחקי המילים הכי פופולריים אונליין ב-2026 — ולמה הם התפוצצו',
    subtitle:
      'מחידה שבחור אחד בנה לחברה שלו ועד תעשייה של 3.36 מיליארד דולר. אלה משחקי המילים שכולם באמת משחקים ב-2026 — והסיבות האנושיות המפתיעות שכל אחד מהם המריא.',
    category: 'מגמות',
    readTime: '10 דקות קריאה',
    authorName: 'אוהד פישר',
    authorBio:
      'אני בונה משחקי מילים למחייתי, מה שאומר שאני גם משחק את כל משחקי המילים של כולם "לצורכי מחקר" עד 2 לפנות בוקר. ההטיה מוצהרת.',
    sections: [
      {
        content: `נתחיל ממספר אחד: 3.36 מיליארד דולר.

זו ההכנסה החזויה של שוק משחקי המילים ב-2026 — עלייה של יותר מ-50% מאז 2022, צמיחה של בערך 9.6% בשנה. לז'אנר שלפני חמש שנים בעצם היה "התשבץ שסבתא פותרת בעט", זו קפיצת מדרגה מטורפת.

אז מה אנשים באמת משחקים? והשאלה המעניינת יותר — למה כל אחד מהמשחקים האלה התפוצץ דווקא ככה? נכנסתי לעומק. הנה מדריך שטח כן למשחקי המילים הכי פופולריים אונליין ב-2026, עם סיפור המקור של כל אחד.`,
        image: { src: HERO, alt: 'איור נאו-ברוטליסטי של אריחי אותיות מתפוצצים כלפי מעלה כמו טיל' },
      },
      {
        title: 'Wordle — החידה שעברה מ-90 שחקנים ל-2 מיליון',
        content: `אי אפשר לספר את הסיפור הזה בלי להתחיל מכאן.

ג'וש וורדל, מהנדס תוכנה מוויילס, בנה את Wordle ב-2021 כמתנה לבת זוגו שאהבה משחקי מילים. הוא קרא לו על שמו — Wardle, Wordle, הבנתם. בלי פרסומות. בלי חשבונות. בלי טבלת מובילים. רק מילה בת חמש אותיות ביום.

ב-1 בנובמבר 2021 היו לו 90 שחקנים. בסוף אותו חודש: 300,000. עד ינואר 2022: יותר מ-2 מיליון שחקנים יומיים. זו לא טעות הקלדה — זו אחת מעקומות הצמיחה האורגנית המהירות בתולדות משחקי הקז'ואל, והיא קרתה עם תקציב שיווק של אפס בדיוק.

הניו יורק טיימס קנה אותו בסוף ינואר 2022 ב"שבע ספרות נמוכות". במבט לאחור זה נראה מציאה — Wordle הפך לאחד ממנועי המנויים האמינים של NYT Games, והוא עדיין מושך מיליוני שחקנים יומיים ב-2026.

הגאונות לא הייתה החידה. היא הייתה האילוץ: משחק אחד ביום. אי אפשר פיזית לזלול אותו. המחסור הפך ניחוש מילה פשוט לטקס יומי.`,
      },
      {
        title: 'Connections — ההמשך שכמעט בלע את המקור',
        content: `הנה התפנית שאף אחד לא ראה: הניו יורק טיימס בנה משחק מילים שני שלפי כמה מדדים משוחק יותר מ-Wordle עצמו.

Connections יצא ביוני 2023, מאת עורכת החידות וינה ליו. הפורמט מרושע בערמומיות: 16 מילים, מיינו אותן ל-4 קבוצות נסתרות של 4. הקטע הוא שהחידה שותלת חפיפה בכוונה — מילים שנראות שייכות יחד אבל לא — אז האינסטינקט הראשון שלכם הוא בדרך כלל מלכודת.

עד 2024 הוא צבר מיליארדי משחקים והתמקם כמשחק השני הכי משוחק בכל מערך NYT Games. להרבה שחקנים זה עכשיו הדבר הראשון שהם פותחים, לפני Wordle.

למה זה תפס? כי זה דלק לוויכוחים. Wordle הוא בודד. Connections הוא החידה שצורחים עליה בקבוצת הוואטסאפ — "איך לא ראית את הקטגוריה הסגולה" — והחיכוך החברתי הזה הוא דלק טילים להרגל יומי.`,
        image: { src: IMG_MULTIPLAYER, alt: 'חברים מתווכחים בכיף על חידת מילים בטלפונים' },
      },
      {
        title: 'Strands ו-Spelling Bee — שאר אימפריית החידות',
        content: `הניו יורק טיימס לא עצר בשניים.

**Spelling Bee** הוא הוותיק — חידה שבועית מודפסת מאז 2018, היום קבע יומי דיגיטלי. שבע אותיות, אות מרכזית אחת חובה, בנו כמה שיותר מילים. זה האנטי-Wordle: במקום תשובה אחת אתם רודפים אחרי עשרות, ותמיד יש "עוד מילה אחת" שמושכת אתכם בחזרה.

**Strands** הגיע במרץ 2024 — חיפוש מילים נושאי על לוח 6×8, עם "ספנגרם" שמתפתל על כל הלוח וקושר את הנושא. זה הנינוח. בלי טיימר, בלי מצב כישלון, רק וייב ונושא לפצח.

יחד, מדור החידות של NYT הפך לעסק מנויים אמיתי בפני עצמו. אנשים משלמים היום על *משחקים* מעיתון. המשפט הזה היה נשמע מטורף ב-2019.`,
      },
      {
        title: 'מרוץ החימוש של רשתות מרובות — Quordle, Octordle, Squaredle',
        content: `כל להיט מוליד גרסת "אבל קשה יותר", ו-Wordle הוליד ז'אנר שלם כזה.

**Quordle** (פרדי מאייר, תחילת 2022): ארבעה Wordle בו-זמנית, תשעה ניחושים סך הכול. **Octordle** (קנת קרופורד, גם 2022): *שמונה* רשתות, שלושה-עשר ניחושים. אלה קיימים בשביל שחקנים שמצאו ש-Wordle אחד קל מדי ורצו שהקפה של הבוקר יגיע עם התקף חרדה קטן.

**Squaredle** (מייקל ג'יופרידה, 2022) הלך לכיוון אחר — רשת 4×4 בסגנון בוגל שבה עוקבים אחרי אותיות סמוכות כדי למצוא כל מילה שמוסתרת בלוח. בלי תשובה אחת, בלי ניחושים מוגבלים; רק אתם מול הרשת, צדים את המילים הארוכות שמזכות בנקודות.

הלקח כאן עדין אבל חשוב: יש ביקוש אמיתי ועמיד ל*עומק*. לא כולם רוצים חידה של 30 שניות. נתח משמעותי של שחקנים רוצה רשת שאפשר באמת ללעוס.`,
        image: { src: IMG_BRAIN, alt: 'איור של חידת רשת אותיות צפופה' },
      },
      {
        title: 'משחקי מילים מרובי משתתפים — המסלול החברתי שלא מת',
        content: `בזמן שעולם החידות היומיות התפוצץ, ענק משחקי המילים המקורי פשוט המשיך... להתקדם.

Words With Friends — היום תחת Take-Two Interactive — חצה 6 מיליארד הורדות מצטברות, ובסוף 2025 שחרר חבילה שלמה של מצבי שחקן יחיד חדשים. אפילו עיבוד לתוכנית טלוויזיה בפיתוח.

הוא משחק משחק שונה לגמרי מ-Wordle, מילולית ואסטרטגית. הוא אסינכרוני, מבוסס אריחים, וכל הפואנטה היא *מי* אתם משחקים נגדו — אמא שלכם, השותף מהמכללה, החבר ההוא שלוקח לו ארבעה ימים לכל תור.

ההבחנה הזו חשובה, כי זה הפער שהרבה משחקים חדשים מתחרים למלא: החידה היומית נותנת לכם את ההרגל, אבל משחק מרובה המשתתפים נותן לכם את האנשים.`,
      },
      {
        title: 'נטפליקס מצטרפת למסיבה — Scattergories Daily',
        content: `הנה נקודת הנתונים הכי טרייה, ובכנות הסימן הכי ברור שמשחקי מילים "הגיעו".

באפריל 2026, נטפליקס הוסיפה את **Scattergories Daily** למרכז המשחקים שלה — אתגר מילים יומי של 60 שניות, בנושאי התוכניות שלה עצמה. בלי פרסומות, בלי רכישות בתוך האפליקציה, כלול במנוי.

קראו את זה שוב: שירות סטרימינג שמוציא מיליארדים על טלוויזיה יוקרתית עכשיו גם בעסקי חידת המילים היומית. למה? כי עונת טלוויזיה נותנת למנויים סיבה לפתוח את האפליקציה לכמה שבועות. משחק מילים יומי נותן להם סיבה לפתוח אותה *כל יום* — בעלות של משכורת מהנדס אחד. זה כלי השימור הזול בכל תעשיית התוכן.

כשנטפליקס מעתיקה את הז'אנר שלכם, הז'אנר רשמית הגיע.`,
      },
      {
        title: 'אז למה כולם התפוצצו? ארבעה כוחות.',
        content: `כשמתרחקים, אותם ארבעה מנועים מופיעים מתחת לכל אחד מהמשחקים האלה.

**1. לולאת ההרגל היומית.** חידה אחת ביום, רצף ששנוא לשבור. מחסור מנצח שפע — אי אפשר לגלול לדעת דבר שקיים רק פעם ב-24 שעות.

**2. זמן מסך "טוב למוח" בלי אשמה.** מחקר מצוטט נרחב על יותר מ-19,000 מבוגרים מעל גיל 50 מצא ששחקני חידות מילים תכופים ביצעו בכמה מדדי חשיבה כאילו היו צעירים בעד עשור. בין אם אתם קונים את הגרסה החזקה של הטענה ובין אם לא — ה*מיסגור* הוא זהב: משחקי מילים הם האפליקציה הנדירה שאף אחד לא נוזף בכם על שפתחתם.

**3. כפתור השיתוף.** רשת האימוג'י הקטנה ונטולת הספוילרים של Wordle הפכה כל פתרון לשיווק חינם. טיק-טוק ו-Reels עשו את השאר — "תראו אותי פותר את זה" הפך לתוכן צפייה אמיתי.

**4. סוף-סוף רב-לשוני.** במשך שנים, משחקי מילים פירושם אנגלית. זה נשבר מהר — משחקי מילת-היום בעברית, חידות קאנה ביפנית, אפליקציות "juego de palabras" בספרדית כולם מושכים מספרים אמיתיים. 100 המיליון השחקנים היומיים הבאים לא ישחקו באנגלית, ומי שיבנה את משחק המילים היומי הכי טוב שאינו אנגלי מחזיק בקטגוריה פתוחה לרווחה.`,
        image: { src: IMG_VOCAB, alt: 'איור של משחקי מילים מתפשטים על פני שפות רבות' },
      },
      {
        title: 'איפה LexiClash משתלב בכל זה',
        content: `בדיקת הטיה כנה ומהירה: אני מייצר את LexiClash, אז כמובן שאני חושב שיש פער ששווה למלא.

אבל הנה הפער האמיתי. משחקי החידה היומית ניצחו ב*הרגל*. משחקי מרובי המשתתפים הקלאסיים ניצחו ב*אנשים*. מעט מאוד משחקים עושים את שניהם — משחק מילים תחרותי בזמן אמת שהוא גם טקס יומי, ושעובד בחמש שפות כולל עברית מימין לשמאל.

זה המסלול שאנחנו בונים בו: המהירות והקנטור של מרובה משתתפים, המשיכה לחזור מחר של אתגר יומי, בלי פאוור-אפים של pay-to-win, חינם בדפדפן. אם כל המאמר הזה גרם לכם להתחשק לשחק משהו — אתם לא צריכים לעזוב את הטאב הזה.`,
      },
      {
        content: `הסיפור האמיתי של 2026 הוא לא משחק בודד. הוא שמשחק מילים הפסיק להיות תחביב והפך ל*תשתית* — הדרך שבה שירותי סטרימינג, אפליקציות חדשות ומוצרי אימון מוחי מרוויחים פתיחה יומית.

לפני חמש שנים זה היה נשמע מגוחך. עכשיו יש תעשייה של 3.36 מיליארד דולר, אריח בנטפליקס והאשטאג בטיק-טוק עם מיליארדי צפיות — הכול בנוי על העונג העתיק והפשוט של למצוא מילה שלא הייתה ברורה לפני שנייה.

סבתא צדקה כל הזמן. העט פשוט היה אופציונלי.`,
      },
    ],
    backToBlog: 'חזרה לבלוג',
    tryDaily: 'נסו את האתגר היומי',
    practice: 'תרגלו לבד',
    playMultiplayer: 'שחקו מרובה משתתפים',
  },

  sv: {
    title: 'De populäraste ordspelen online 2026 — och varför de exploderade',
    subtitle:
      'Från ett pussel en kille byggde åt sin flickvän till en industri värd 3,36 miljarder dollar. Här är ordspelen alla faktiskt spelar 2026 — och de förvånansvärt mänskliga skälen till varför vart och ett tog fart.',
    category: 'Trender',
    readTime: '10 min läsning',
    authorName: 'Ohad Fisher',
    authorBio:
      'Jag bygger ordspel för ett levebröd, vilket betyder att jag också spelar allas andras ordspel "i forskningssyfte" till klockan två på natten. Partiskhet noterad.',
    sections: [
      {
        content: `Låt mig börja med ett tal: 3,36 miljarder dollar.

Det är ordspelsmarknadens beräknade intäkter 2026 — upp mer än 50 % sedan 2022, med en tillväxt på runt 9,6 % per år. För en genre som för fem år sedan i princip betydde "korsordet din mormor löser med penna" är det en absurd uppgradering.

Så vad spelar folk faktiskt? Och — den intressantare frågan — varför exploderade vart och ett av de här spelen just så? Jag grävde ner mig. Här är en ärlig fältguide till de populäraste ordspelen online 2026, med ursprungshistorien bakom varje.`,
        image: { src: HERO, alt: 'Neo-brutalistisk illustration av bokstavsbrickor som exploderar uppåt som en raket' },
      },
      {
        title: 'Wordle — pusslet som gick från 90 spelare till 2 miljoner',
        content: `Man kan inte berätta den här historien utan att börja här.

Josh Wardle, en mjukvaruingenjör från Wales, byggde Wordle 2021 som en gåva till sin partner som älskade ordspel. Han döpte det efter sig själv — Wardle, Wordle, ni fattar. Inga annonser. Inga konton. Ingen topplista. Bara ett fembokstavsord om dagen.

Den 1 november 2021 hade det 90 spelare. I slutet av den månaden: 300 000. I januari 2022: över 2 miljoner dagliga spelare. Det är inget skrivfel — det är en av de snabbaste organiska tillväxtkurvorna i casualspelens historia, och den skedde med en marknadsföringsbudget på exakt noll.

New York Times köpte det i slutet av januari 2022 för "låga sjusiffriga belopp". I efterhand ser priset ut som ett fynd — Wordle blev en av NYT Games mest pålitliga prenumerationsdrivare och drar fortfarande miljoner dagliga spelare 2026.

Geniet var inte pusslet. Det var begränsningen: ett spel om dagen. Man kan fysiskt inte hetsspela det. Bristen förvandlade en enkel ordgissning till ett dagligt ritual.`,
      },
      {
        title: 'Connections — uppföljaren som nästan åt upp originalet',
        content: `Här är vändningen ingen såg komma: New York Times byggde ett andra ordspel som, enligt vissa mått, spelas mer än Wordle självt.

Connections lanserades i juni 2023, skapat av NYT-pusselredaktören Wyna Liu. Formatet är listigt elakt: 16 ord, sortera dem i 4 dolda grupper om 4. Haken är att pusslet medvetet planterar överlapp — ord som ser ut att höra ihop men inte gör det — så din första instinkt är oftast en fälla.

Vid 2024 hade det dragit ihop miljarder spelomgångar och etablerat sig som det näst mest spelade spelet i hela NYT Games-utbudet. För många spelare är det nu det *första* de öppnar, före Wordle.

Varför slog det? För att det är bränsle för diskussioner. Wordle är ensamt. Connections är pusslet man skriker om i gruppchatten — "hur såg du inte den lila kategorin" — och den sociala friktionen är raketbränsle för en daglig vana.`,
        image: { src: IMG_MULTIPLAYER, alt: 'Vänner som lekfullt bråkar om ett ordpussel på sina telefoner' },
      },
      {
        title: 'Strands & Spelling Bee — resten av pusselimperiet',
        content: `NYT stannade inte vid två.

**Spelling Bee** är veteranen — ett veckopussel i tryck sedan 2018, nu en daglig digital institution. Sju bokstäver, en obligatorisk mittbokstav, bygg så många ord du kan. Det är anti-Wordle: istället för ett svar jagar du dussintals, och det finns alltid "ett ord till" som drar tillbaka dig.

**Strands** kom i mars 2024 — ett tematiskt ordsök på ett 6×8-rutnät, med ett "spangram" som slingrar sig över hela brädet och knyter ihop temat. Det är det mysiga. Ingen timer, inget förlorartillstånd, bara vibbar och ett tema att knäcka.

Tillsammans har NYT:s pusselsektion blivit en riktig prenumerationsverksamhet i sig själv. Folk betalar nu för *spel* från en tidning. Den meningen hade låtit galen 2019.`,
      },
      {
        title: 'Kapprustningen med flera rutnät — Quordle, Octordle, Squaredle',
        content: `Varje succé föder en "fast svårare"-version, och Wordle födde en hel genre av dem.

**Quordle** (Freddie Meyer, tidigt 2022): fyra Wordle samtidigt, nio gissningar totalt. **Octordle** (Kenneth Crawford, också 2022): *åtta* rutnät, tretton gissningar. De finns för spelarna som tyckte att ett Wordle var för lätt och ville att morgonkaffet skulle komma med en liten panikattack.

**Squaredle** (Michael Giuffrida, 2022) gick åt ett annat håll — ett rutnät i Boggle-stil på 4×4 där du spårar intilliggande bokstäver för att hitta varje ord gömt i brädet. Inget enskilt svar, inga begränsade gissningar; bara du mot rutnätet.

Lärdomen här är subtil men viktig: det finns en verklig, varaktig efterfrågan på *djup*. Alla vill inte ha ett 30-sekunderspussel. En betydande del av spelarna vill ha ett rutnät de verkligen kan tugga på.`,
        image: { src: IMG_BRAIN, alt: 'Illustration av ett tätt bokstavsrutnätspussel' },
      },
      {
        title: 'Ordspel med flera spelare — det sociala spåret som aldrig dog',
        content: `Medan den dagliga pusselvärlden exploderade fortsatte ordspelens ursprungliga gigant bara... vidare.

Words With Friends — nu under Take-Two Interactive — har passerat 6 miljarder nedladdningar totalt, och i slutet av 2025 släppte det en hel uppsättning nya enspelarlägen. Det finns till och med en TV-spelshowanpassning under utveckling.

Det spelar ett helt annat spel än Wordle, bokstavligen och strategiskt. Det är asynkront, brickbaserat, och hela poängen är *vem* du spelar mot — din mamma, din rumskamrat från college, den där vännen som tar fyra dagar per drag.

Den distinktionen spelar roll, för det är gapet många nyare spel kapplöper om att fylla: det dagliga pusslet ger dig vanan, men flerspelarspelet ger dig människorna.`,
      },
      {
        title: 'Netflix ansluter till festen — Scattergories Daily',
        content: `Här är den färskaste datapunkten, och ärligt talat den tydligaste signalen att ordspel helt har "lyckats".

I april 2026 lade Netflix till **Scattergories Daily** i sitt spelnav — en daglig 60-sekunders ordutmaning, med teman från dess egna serier. Inga annonser, inga köp i appen, ingår i prenumerationen.

Läs det igen: en streamingtjänst som spenderar miljarder på prestigetelevision är nu också i den dagliga ordpusselbranschen. Varför? För att en TV-säsong ger prenumeranter en anledning att öppna appen i några veckor. Ett dagligt ordspel ger dem en anledning att öppna den *varje dag* — till priset av en ingenjörs lön. Det är det billigaste retentionsverktyget i hela innehållsindustrin.

När Netflix kopierar din genre har genren officiellt anlänt.`,
      },
      {
        title: 'Så varför exploderade ALLA? Fyra krafter.',
        content: `Ta ett steg tillbaka så dyker samma fyra motorer upp under vart och ett av de här spelen.

**1. Den dagliga vaneslingan.** Ett pussel om dagen, en svit man avskyr att bryta. Brist slår överflöd — man kan inte doom-scrolla en sak som bara finns en gång var 24:e timme.

**2. "Bra för hjärnan", skuldfri skärmtid.** En ofta citerad studie av över 19 000 vuxna över 50 fann att frekventa ordpusselspelare presterade på vissa resoneringsmått som om de vore upp till ett decennium yngre. Oavsett om du köper den starkaste versionen av påståendet är *inramningen* guld: ordspel är den sällsynta appen ingen tjatar på dig för att öppna.

**3. Delningsknappen.** Wordles lilla spoilerfria emoji-rutnät förvandlade varje lösning till gratis marknadsföring. TikTok och Reels gjorde resten — "se mig lösa det här" blev faktiskt sevärt innehåll.

**4. Äntligen flerspråkigt.** I åratal betydde ordspel engelska. Det bryts snabbt — hebreiska dagligordspel, japanska kana-pussel, spanska "juego de palabras"-appar drar alla riktiga siffror. De nästa 100 miljonerna dagliga spelarna kommer inte att spela på engelska, och den som bygger det bästa icke-engelska dagliga ordspelet äger en vidöppen kategori.`,
        image: { src: IMG_VOCAB, alt: 'Illustration av ordspel som sprids över flera språk' },
      },
      {
        title: 'Var LexiClash passar in i allt detta',
        content: `Snabb, ärlig partiskhetskontroll: jag gör LexiClash, så självklart tycker jag att det finns ett gap värt att fylla.

Men här är det faktiska gapet. De dagliga pusselspelen spikade *vanan*. De klassiska flerspelarspelen spikade *människorna*. Väldigt få spel gör båda — ett realtids-, tävlingsinriktat ordspel som också är ett dagligt ritual, och som fungerar på fem språk inklusive hebreiska från höger till vänster.

Det är spåret vi bygger i: hastigheten och snacket från flerspelarläge, kom-tillbaka-imorgon-dragningen från en daglig utmaning, inga pay-to-win power-ups, gratis i webbläsaren. Om hela den här artikeln fick dig att vilja spela något — du behöver inte lämna den här fliken.`,
      },
      {
        content: `Den verkliga historien om 2026 är inget enskilt spel. Det är att "ordspel" slutade vara en hobby och blev *infrastruktur* — standardsättet som streamingtjänster, nyhetsappar och hjärnträningsprodukter tjänar en daglig öppning.

För fem år sedan hade det låtit löjligt. Nu finns en industri värd 3,36 miljarder dollar, en Netflix-ruta och en TikTok-hashtag med miljarder visningar — allt byggt på det enkla, uråldriga nöjet att hitta ett ord som inte var självklart för en sekund sedan.

Mormor hade rätt hela tiden. Pennan var bara valfri.`,
      },
    ],
    backToBlog: 'Tillbaka till bloggen',
    tryDaily: 'Prova den dagliga utmaningen',
    practice: 'Öva solo',
    playMultiplayer: 'Spela flerspelare',
  },

  ja: {
    title: '2026年に最も人気のオンラインワードゲーム — そして、なぜ爆発したのか',
    subtitle:
      'ある男性が恋人のために作ったパズルから、33.6億ドル規模の産業へ。2026年にみんなが実際に遊んでいるワードゲームと、それぞれが急成長した驚くほど人間的な理由。',
    category: 'トレンド',
    readTime: '10分で読めます',
    authorName: 'オハッド・フィッシャー',
    authorBio:
      '仕事でワードゲームを作っています。つまり「研究のため」に他人のワードゲームを午前2時まで遊んでいるということです。バイアスは認めます。',
    sections: [
      {
        content: `まず一つの数字から始めましょう。33.6億ドル。

これは2026年のワードゲーム市場の予測収益です。2022年から50%以上の増加、年率約9.6%の成長。5年前は基本的に「おじいちゃんがペンで解くクロスワード」を意味していたジャンルにとって、これはとんでもない大化けです。

では、人々は実際に何を遊んでいるのか? そしてもっと面白い問い — なぜこれらのゲームはそれぞれこういう形で爆発したのか? 深掘りしました。これが、2026年の最も人気のオンラインワードゲームへの正直なフィールドガイド。それぞれの誕生秘話付きです。`,
        image: { src: HERO, alt: 'ロケットのように上に爆発する文字タイルのネオブルータリズム風イラスト' },
      },
      {
        title: 'Wordle — 90人から200万人になったパズル',
        content: `この話はここから始めずには語れません。

ウェールズ出身のソフトウェアエンジニア、ジョシュ・ワードルは2021年、ワードゲーム好きのパートナーへの贈り物としてWordleを作りました。自分の名前にちなんで名付けた — Wardle、Wordle、わかりますよね。広告なし。アカウントなし。ランキングなし。1日1つの5文字の単語だけ。

2021年11月1日、プレイヤーは90人でした。その月末には30万人。2022年1月には日間200万人超。誤植ではありません — カジュアルゲーム史上最速級のオーガニック成長曲線で、マーケティング予算はぴったりゼロでした。

ニューヨーク・タイムズは2022年1月末に「7桁の低い額」で買収しました。今思えば破格の安さ — WordleはNYT Gamesで最も信頼できる購読ドライバーの一つになり、2026年も日間数百万人を集めています。

天才的だったのはパズルではありません。制約です。1日1ゲーム。物理的に一気見できない。希少性が、単純な単語当てを毎日の儀式に変えました。`,
      },
      {
        title: 'Connections — オリジナルをほぼ食い尽くした続編',
        content: `誰も予想しなかった展開がこれ。ニューヨーク・タイムズは、一部の指標ではWordle自体より遊ばれている2つ目のワードゲームを作りました。

Connectionsは2023年6月に登場、NYTのパズル編集者ウィナ・リウが制作。形式は巧妙に意地悪です。16個の単語を、隠れた4つずつ4グループに分ける。仕掛けは、パズルが意図的に重なりを仕込んでいること — 一緒に属しそうで属さない単語 — なので、最初の直感はたいてい罠です。

2024年までに数十億回プレイされ、NYT Games全ラインナップで2番目に遊ばれるゲームとして定着しました。多くのプレイヤーにとって、今やWordleより先に開く*最初*のものです。

なぜヒットしたか? 議論の燃料だからです。Wordleは孤独。Connectionsはグループチャットで叫ぶパズル —「なんで紫のカテゴリーに気づかないの」— その社会的摩擦が毎日の習慣のロケット燃料になります。`,
        image: { src: IMG_MULTIPLAYER, alt: 'スマホのワードパズルで楽しく言い合う友人たち' },
      },
      {
        title: 'StrandsとSpelling Bee — パズル帝国の残り',
        content: `NYTは2つで止まりませんでした。

**Spelling Bee** は長老格 — 2018年からの週刊紙パズル、今は毎日のデジタル定番。7文字、必須の中央文字1つ、できるだけ多くの単語を作る。アンチWordleです。1つの答えではなく、何十もを追い求め、いつも「あと1単語」が引き戻してきます。

**Strands** は2024年3月に登場 — 6×8グリッドのテーマ別ワードサーチ、盤面全体を蛇行してテーマをつなぐ「スパングラム」付き。これは癒し系。タイマーなし、失敗状態なし、ただ雰囲気と解くべきテーマだけ。

合わせると、NYTのパズルセクションはそれ自体が本物の購読ビジネスになりました。人々は今、新聞社の*ゲーム*にお金を払う。この一文は2019年なら正気じゃないと思われたでしょう。`,
      },
      {
        title: '複数グリッドの軍拡競争 — Quordle、Octordle、Squaredle',
        content: `あらゆるヒットは「でももっと難しい」版を生み、Wordleはそのジャンルまるごとを生みました。

**Quordle**（フレディ・マイヤー、2022年初頭）：Wordleを同時に4つ、推測は合計9回。**Octordle**（ケネス・クロフォード、同じく2022年）：*8つ*のグリッド、13回の推測。Wordle1つでは簡単すぎると感じ、朝のコーヒーに小さなパニック発作を添えたいプレイヤーのために存在します。

**Squaredle**（マイケル・ジュフリーダ、2022年）は別方向へ — 隣接する文字をたどって盤面に隠れた全単語を見つけるBoggle風の4×4グリッド。単一の答えなし、推測回数制限なし。あなた対グリッドだけ。

ここでの教訓は微妙だが重要です。*深さ*への本物で持続的な需要があるということ。誰もが30秒のパズルを求めているわけではない。かなりの割合のプレイヤーは、じっくり噛みしめられるグリッドを求めています。`,
        image: { src: IMG_BRAIN, alt: '密な文字グリッドパズルのイラスト' },
      },
      {
        title: 'マルチプレイヤーのワードゲーム — 決して死ななかったソーシャルの道',
        content: `毎日のパズルの世界が爆発する一方で、元祖ワードゲームの巨人はただ…進み続けました。

Words With Friends — 今はTake-Two Interactive傘下 — は累計60億ダウンロードを超え、2025年後半には新しいシングルプレイヤーモード一式をリリースしました。テレビゲーム番組化まで開発中です。

Wordleとは文字通りにも戦略的にも全く違うゲームです。非同期、タイルベース、そして肝心なのは*誰と*遊ぶか — あなたの母親、大学のルームメイト、1手に4日かけるあの友人。

この区別は重要です。多くの新しいゲームが埋めようと競っているギャップだからです。毎日のパズルは習慣を与える、しかしマルチプレイヤーのゲームは人々を与えるのです。`,
      },
      {
        title: 'Netflixがパーティーに参加 — Scattergories Daily',
        content: `これが最も新しいデータポイント、そして正直、ワードゲームが完全に「成功した」最も明確なシグナルです。

2026年4月、Netflixはゲームハブに**Scattergories Daily**を追加しました — 自社番組をテーマにした、毎日60秒のワードチャレンジ。広告なし、アプリ内課金なし、購読に含まれます。

もう一度読んでください。プレステージTVに数十億ドルを使うストリーミングサービスが、今や毎日のワードパズル事業にも参入している。なぜ? テレビの1シーズンは購読者に数週間アプリを開く理由を与える。毎日のワードゲームは*毎日*開く理由を与える — エンジニア一人の給料のコストで。コンテンツ業界全体で最も安いリテンションツールです。

Netflixがあなたのジャンルをコピーするとき、そのジャンルは公式に到来したのです。`,
      },
      {
        title: 'では、なぜ全部が爆発したのか? 4つの力。',
        content: `一歩下がると、これらのゲームすべての下に同じ4つのエンジンが現れます。

**1. 毎日の習慣ループ。** 1日1パズル、途切れさせたくない連続記録。希少性は豊富さに勝つ — 24時間に一度しか存在しないものをドゥームスクロールはできません。

**2. 罪悪感のない「脳に良い」スクリーンタイム。** 50歳以上の1万9000人超を対象とした広く引用される研究では、頻繁にワードパズルをするプレイヤーが、一部の推論指標で最大10歳若いかのように成績を出しました。その主張の最も強い版を信じるかどうかは別として、*フレーミング*は金です。ワードゲームは、開いても誰にも小言を言われない稀なアプリなのです。

**3. シェアボタン。** Wordleの小さなネタバレなし絵文字グリッドは、あらゆる正解を無料マーケティングに変えました。TikTokとReelsが残りをやった —「解くのを見て」が実際に見応えのあるコンテンツになりました。

**4. ついに多言語化。** 長年、ワードゲームは英語を意味しました。それが急速に崩れています — ヘブライ語の今日の単語ゲーム、日本語のかなパズル、スペイン語の「juego de palabras」アプリがどれも本物の数字を出しています。次の1億人の毎日のプレイヤーは英語で遊びません。最高の非英語の毎日のワードゲームを作る者が、ガラ空きのカテゴリーを手にします。`,
        image: { src: IMG_VOCAB, alt: '複数の言語にまたがって広がるワードゲームのイラスト' },
      },
      {
        title: 'この中でLexiClashはどこに収まるか',
        content: `正直で素早いバイアスチェック。私はLexiClashを作っているので、当然、埋める価値のあるギャップがあると思っています。

でも、実際のギャップはこれです。毎日のパズルゲームは*習慣*を決めた。古典的なマルチプレイヤーゲームは*人々*を決めた。両方をやるゲームはごくわずか — 毎日の儀式でもあるリアルタイムの競争ワードゲーム、しかも右から左に書くヘブライ語を含む5言語で動くもの。

それが私たちが作っている道です。マルチプレイヤーのスピードと挑発、毎日のチャレンジの「明日また来たい」という引力、pay-to-winのパワーアップなし、ブラウザで無料。この記事全体で何か遊びたくなったなら — このタブを離れる必要はありません。`,
      },
      {
        content: `2026年の本当の物語は、特定の一つのゲームではありません。「ワードゲーム」が趣味であることをやめ、*インフラ*になったということです — ストリーミングサービス、ニュースアプリ、脳トレ製品が毎日の起動を稼ぐ、デフォルトの方法に。

5年前なら馬鹿げて聞こえたでしょう。今や33.6億ドルの産業、Netflixのタイル、数十億回再生のTikTokハッシュタグがあり、すべては「1秒前には自明でなかった単語を見つける」という、単純で古代からの喜びの上に築かれています。

おばあちゃんはずっと正しかった。ペンは、ただオプションだっただけです。`,
      },
    ],
    backToBlog: 'ブログに戻る',
    tryDaily: 'デイリーチャレンジを試す',
    practice: 'ソロで練習',
    playMultiplayer: 'マルチプレイヤーで遊ぶ',
  },

  es: {
    title: 'Los juegos de palabras online más populares de 2026 — y por qué explotaron',
    subtitle:
      'De un puzzle que un chico creó para su novia a una industria de 3.360 millones de dólares. Estos son los juegos de palabras que todos juegan de verdad en 2026 — y las razones sorprendentemente humanas por las que cada uno despegó.',
    category: 'Tendencias',
    readTime: '10 min de lectura',
    authorName: 'Ohad Fisher',
    authorBio:
      'Hago juegos de palabras para ganarme la vida, lo que significa que también juego los juegos de palabras de todos los demás "por investigación" hasta las 2 de la madrugada. Sesgo reconocido.',
    sections: [
      {
        content: `Déjame empezar con un número: 3.360 millones de dólares.

Esos son los ingresos previstos del mercado de juegos de palabras en 2026 — más de un 50 % por encima de 2022, creciendo a un ritmo de alrededor del 9,6 % anual. Para un género que hace cinco años básicamente significaba "el crucigrama que tu abuela hace con bolígrafo", es una transformación absurda.

Entonces, ¿a qué juega la gente realmente? Y — la pregunta más interesante — ¿por qué explotó cada uno de estos juegos de la forma en que lo hizo? Me metí de lleno. Esta es la guía de campo honesta de los juegos de palabras online más populares de 2026, con la historia de origen detrás de cada uno.`,
        image: { src: HERO, alt: 'Ilustración neobrutalista de fichas de letras explotando hacia arriba como un cohete' },
      },
      {
        title: 'Wordle — el puzzle que pasó de 90 jugadores a 2 millones',
        content: `No se puede contar esta historia sin empezar aquí.

Josh Wardle, un ingeniero de software de Gales, creó Wordle en 2021 como regalo para su pareja, a quien le encantaban los juegos de palabras. Lo nombró por sí mismo — Wardle, Wordle, ya lo pillas. Sin anuncios. Sin cuentas. Sin tabla de clasificación. Solo una palabra de cinco letras al día.

El 1 de noviembre de 2021 tenía 90 jugadores. A finales de ese mes: 300.000. En enero de 2022: más de 2 millones de jugadores diarios. No es una errata — es una de las curvas de crecimiento orgánico más rápidas en la historia de los juegos casuales, y ocurrió con un presupuesto de marketing de exactamente cero.

The New York Times lo compró a finales de enero de 2022 por "siete cifras bajas". En retrospectiva ese precio parece una ganga — Wordle se convirtió en uno de los motores de suscripción más fiables de NYT Games, y sigue atrayendo millones de jugadores diarios en 2026.

El genio no era el puzzle. Era la restricción: un juego al día. No puedes maratonearlo físicamente. La escasez convirtió una simple adivinanza de palabra en un ritual diario.`,
      },
      {
        title: 'Connections — la secuela que casi se comió al original',
        content: `Aquí está el giro que nadie vio venir: The New York Times creó un segundo juego de palabras que, según algunas métricas, se juega más que el propio Wordle.

Connections se lanzó en junio de 2023, creado por la editora de puzzles del NYT, Wyna Liu. El formato es ingeniosamente cruel: 16 palabras, ordénalas en 4 grupos ocultos de 4. La trampa es que el puzzle planta solapamiento a propósito — palabras que parecen ir juntas pero no — así que tu primer instinto suele ser una trampa.

Para 2024 había acumulado miles de millones de partidas y se asentó como el segundo juego más jugado de toda la línea de NYT Games. Para muchos jugadores ahora es lo *primero* que abren, antes que Wordle.

¿Por qué pegó? Porque es combustible para discusiones. Wordle es solitario. Connections es el puzzle por el que gritas en el chat grupal — "¿cómo no viste la categoría morada?" — y esa fricción social es combustible de cohete para un hábito diario.`,
        image: { src: IMG_MULTIPLAYER, alt: 'Amigos discutiendo en broma sobre un puzzle de palabras en sus móviles' },
      },
      {
        title: 'Strands y Spelling Bee — el resto del imperio de puzzles',
        content: `El NYT no se detuvo en dos.

**Spelling Bee** es el veterano — un puzzle semanal impreso desde 2018, ahora un fijo digital diario. Siete letras, una letra central obligatoria, construye tantas palabras como puedas. Es el anti-Wordle: en vez de una respuesta, persigues docenas, y siempre hay "una palabra más" que te arrastra de vuelta.

**Strands** llegó en marzo de 2024 — una sopa de letras temática en una cuadrícula de 6×8, con un "spangram" que serpentea por todo el tablero y une el tema. Es el acogedor. Sin temporizador, sin estado de fallo, solo buen rollo y un tema que descifrar.

Juntas, la sección de puzzles del NYT se ha convertido en un negocio de suscripción genuino por derecho propio. La gente ahora paga por *juegos* de un periódico. Esa frase habría sonado disparatada en 2019.`,
      },
      {
        title: 'La carrera armamentística de múltiples cuadrículas — Quordle, Octordle, Squaredle',
        content: `Cada éxito engendra una versión "pero más difícil", y Wordle engendró todo un género de ellas.

**Quordle** (Freddie Meyer, principios de 2022): cuatro Wordles a la vez, nueve intentos en total. **Octordle** (Kenneth Crawford, también 2022): *ocho* cuadrículas, trece intentos. Existen para los jugadores que encontraron un Wordle demasiado fácil y querían que su café de la mañana viniera con un pequeño ataque de pánico.

**Squaredle** (Michael Giuffrida, 2022) fue en otra dirección — una cuadrícula estilo Boggle de 4×4 donde trazas letras adyacentes para encontrar cada palabra escondida en el tablero. Sin una respuesta única, sin intentos limitados; solo tú contra la cuadrícula.

La lección aquí es sutil pero importante: hay una demanda real y duradera de *profundidad*. No todos quieren un puzzle de 30 segundos. Una parte significativa de los jugadores quiere una cuadrícula que puedan masticar de verdad.`,
        image: { src: IMG_BRAIN, alt: 'Ilustración de un denso puzzle de cuadrícula de letras' },
      },
      {
        title: 'Juegos de palabras multijugador — el carril social que nunca murió',
        content: `Mientras el mundo de los puzzles diarios explotaba, el gigante original de los juegos de palabras simplemente siguió... avanzando.

Words With Friends — ahora bajo Take-Two Interactive — ha superado los 6.000 millones de descargas acumuladas, y a finales de 2025 lanzó toda una serie de nuevos modos para un jugador. Hay incluso una adaptación a concurso de televisión en desarrollo.

Juega un juego completamente distinto a Wordle, literal y estratégicamente. Es asíncrono, basado en fichas, y todo el sentido es *con quién* juegas — tu madre, tu compañero de piso de la universidad, ese amigo que tarda cuatro días por turno.

Esa distinción importa, porque es el hueco que muchos juegos más nuevos compiten por llenar: el puzzle diario te da el hábito, pero el juego multijugador te da a las personas.`,
      },
      {
        title: 'Netflix se une a la fiesta — Scattergories Daily',
        content: `Aquí está el dato más fresco, y honestamente la señal más clara de que los juegos de palabras han "triunfado" del todo.

En abril de 2026, Netflix añadió **Scattergories Daily** a su hub de juegos — un desafío de palabras diario de 60 segundos, con temática de sus propias series. Sin anuncios, sin compras dentro de la app, incluido con tu suscripción.

Léelo otra vez: un servicio de streaming que gasta miles de millones en televisión de prestigio está ahora también en el negocio del puzzle de palabras diario. ¿Por qué? Porque una temporada de televisión da a los suscriptores una razón para abrir la app durante unas semanas. Un juego de palabras diario les da una razón para abrirla *cada día* — al coste del salario de un ingeniero. Es la herramienta de retención más barata de toda la industria del contenido.

Cuando Netflix copia tu género, el género ha llegado oficialmente.`,
      },
      {
        title: 'Entonces, ¿por qué explotaron TODOS? Cuatro fuerzas.',
        content: `Da un paso atrás y los mismos cuatro motores aparecen bajo cada uno de estos juegos.

**1. El bucle de hábito diario.** Un puzzle al día, una racha que odiarías romper. La escasez le gana a la abundancia — no puedes hacer doom-scrolling de algo que solo existe una vez cada 24 horas.

**2. Tiempo de pantalla "bueno para el cerebro" sin culpa.** Un estudio ampliamente citado de más de 19.000 adultos mayores de 50 años encontró que los jugadores frecuentes de puzzles de palabras rendían en algunas medidas de razonamiento como si fueran hasta una década más jóvenes. Creas o no la versión más fuerte de esa afirmación, el *encuadre* es oro: los juegos de palabras son la rara app por la que nadie te regaña por abrir.

**3. El botón de compartir.** La pequeña cuadrícula de emojis sin spoilers de Wordle convirtió cada solución en marketing gratuito. TikTok y Reels hicieron el resto — "mírame resolver esto" se convirtió en contenido genuinamente visible.

**4. Por fin multilingüe.** Durante años, los juegos de palabras significaban inglés. Eso se está rompiendo rápido — los juegos de palabra del día en hebreo, los puzzles de kana en japonés, las apps de "juego de palabras" en español están todos sacando cifras reales. Los próximos 100 millones de jugadores diarios no jugarán en inglés, y quien construya el mejor juego de palabras diario no inglés se queda con una categoría abierta de par en par.`,
        image: { src: IMG_VOCAB, alt: 'Ilustración de juegos de palabras extendiéndose por varios idiomas' },
      },
      {
        title: 'Dónde encaja LexiClash en todo esto',
        content: `Un rápido y honesto control de sesgo: yo hago LexiClash, así que por supuesto creo que hay un hueco que vale la pena llenar.

Pero este es el hueco real. Los juegos de puzzle diario clavaron el *hábito*. Los juegos multijugador clásicos clavaron a las *personas*. Muy pocos juegos hacen ambas cosas — un juego de palabras competitivo en tiempo real que también es un ritual diario, y que funciona en cinco idiomas incluido el hebreo de derecha a izquierda.

Ese es el carril en el que estamos construyendo: la velocidad y las pullas del multijugador, el tirón de vuelve-mañana de un desafío diario, sin potenciadores pay-to-win, gratis en el navegador. Si todo este artículo te dio ganas de jugar a algo — no tienes que salir de esta pestaña.`,
      },
      {
        content: `La verdadera historia de 2026 no es ningún juego concreto. Es que "juego de palabras" dejó de ser un pasatiempo y se convirtió en *infraestructura* — la forma por defecto en que los servicios de streaming, las apps de noticias y los productos de entrenamiento cerebral se ganan una apertura diaria.

Hace cinco años habría sonado ridículo. Ahora hay una industria de 3.360 millones de dólares, un mosaico en Netflix y un hashtag de TikTok con miles de millones de visualizaciones, todo construido sobre el placer simple y antiguo de encontrar una palabra que no era obvia un segundo antes.

La abuela tenía razón todo el tiempo. El bolígrafo solo era opcional.`,
      },
    ],
    backToBlog: 'Volver al blog',
    tryDaily: 'Prueba el Desafío Diario',
    practice: 'Practica en solitario',
    playMultiplayer: 'Jugar multijugador',
  },
};
