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
    title: 'From Ancient Tiles to Digital Grids: The Wild History of Word Games',
    subtitle: 'Stolen ideas, crossword mania, a stay-at-home dad\'s invention, and one five-letter word that broke the internet.',
    category: 'History',
    readTime: '6 min read',
    authorName: 'Ohad Fisher',
    authorBio: 'Obsessive word game player, amateur historian of useless knowledge, and the person who owns three different editions of Scrabble.',
    sections: [
      {
        content: `I own a replica of a Roman wax tablet. It sits on my desk next to my monitor, right below the sticky note that says "REMEMBER TO EAT LUNCH." I bought it because Roman schoolchildren practiced word games on these things almost two thousand years ago, and that felt like the coolest thing I'd ever heard.

My partner thinks I need an intervention. She's probably right.

But here's the thing: the history of word games is genuinely one of the wildest stories in human culture. Ancient Egyptian riddles. Medieval monks with too much free time. A bitter IP dispute that tore apart friendships. A newspaper craze that got people fired. A Welsh software engineer who accidentally created a global phenomenon during lockdown.

Word games have been making us slightly unhinged for four thousand years.`,
      },
      {
        title: 'Ancient origins: when words were magic',
        content: `The oldest known word games date back roughly four thousand years, and they weren't played for fun. They were genuinely believed to have magical power.

The ancient Egyptians were obsessed with wordplay. The Leiden Papyrus, dating to around 1200 BCE, contains riddles and word puzzles that scribes used to test each other. In Egyptian culture, knowing the "true name" of something gave you power over it. Word mastery was literally a form of magic.

The Greeks invented the acrostic, poems where the first letters of each line spell out a word or message. The Romans were particularly fond of word squares, grids where the same words read both horizontally and vertically. The most famous is the SATOR Square, found scratched into walls across the Roman Empire from Pompeii to Manchester. It reads SATOR AREPO TENET OPERA ROTAS, and scholars have been arguing about what it means for centuries. Some think it's a Christian prayer encoded to avoid persecution. Others think it's just an ancient Roman doodling in the margins during a boring meeting.

I like to think about those Roman soldiers scratching word puzzles into stone walls while waiting for something to happen. People have always needed something to do with their brains during downtime. We're not so different.`,
      },
      {
        title: 'The Scrabble story: genius, theft, or both?',
        content: `Alfred Mosher Butts spent months analyzing the front pages of The New York Times, counting letter frequencies by hand. It was 1933. The Great Depression had gutted the construction industry, and Butts, an unemployed architect, needed something to do.

He created "Lexiko," then refined it into "Criss-Crosswords" — essentially Scrabble. Same letter tiles, same board, same scoring system. Nobody wanted it. Parker Brothers rejected it. Milton Bradley rejected it. Every major game company said no.

Then James Brunot came along. In 1948, he bought the rights, simplified the rules, changed the name to "Scrabble," and started manufacturing sets in his living room. For the first few years it barely sold. But then, in 1952, the president of Macy's played Scrabble on vacation and loved it. He ordered sets for all Macy's stores. Sales exploded. Within two years, Scrabble was selling millions of copies.

Butts, the inventor, received royalties. Brunot became wealthy. It's a pattern we'll see again: the creators rarely capture the value they create.`,
      },
      {
        title: 'The crossword craze (1920s viral)',
        content: `The first crossword puzzle appeared on December 21, 1913, in the New York World newspaper. It was created by Arthur Wynne, a journalist from Liverpool, and it was diamond-shaped. Wynne called it a "Word-Cross."

For about ten years, crosswords were a minor newspaper feature. Then, in 1924, two young publishers named Richard Simon and M. Lincoln Schuster had an idea. Simon's aunt was a crossword fan and couldn't find a book of them. So Simon and Schuster published one. Their very first book as a brand-new publishing company.

What happened next was one of the first viral phenomena in American media history. The book sold over 350,000 copies in its first year. Crossword puzzle books became the hottest gift in America. Newspapers that didn't run crosswords started losing subscribers. The New York Times, which would eventually become synonymous with crosswords, initially refused to run them, calling them "a primitive form of mental exercise" in a snooty 1924 editorial.

Employers complained that workers were doing crosswords instead of working. The Baltimore and Ohio Railroad put dictionaries on all its trains because passengers kept arguing about spellings. A Chicago woman sued her husband for divorce because he was "a crossword puzzle addict" who wouldn't talk to her.

Libraries reported that dictionaries were being stolen. Not borrowed. Stolen. People were cutting pages out of reference books to settle crossword disputes.

This is what word games do to people. The 1920s crossword craze looked remarkably like the 2022 Wordle phenomenon: global obsession, workplace distraction, shared experience.`,
      },
      {
        title: 'Boggle and the speed revolution',
        content: `In 1972, toy inventor Allan Turoff created something that fundamentally changed how word games work. His insight was brilliantly simple: what if, instead of taking turns, everyone played at the same time? What if the challenge wasn't just vocabulary, but speed?

He designed a 4x4 grid of letter dice in a covered tray. Shake it, flip it over, start a three-minute timer, and everyone simultaneously hunts for words. When the timer buzzes, you compare lists. Any word that more than one person found gets crossed out. Only your unique finds count.

This was revolutionary. Scrabble and crosswords were cerebral and patient. Boggle was frantic, competitive, visceral. It turned word games from a solitary intellectual exercise into a social experience with genuine tension. Parker Brothers picked it up and it became a massive hit. By the 1980s, it was one of the best-selling word games in the world.

What I love about Boggle is that it democratized word games. In Scrabble, experienced players have a massive advantage. In Boggle, a twelve-year-old with a good eye for patterns can beat a literature professor. Speed and pattern recognition matter as much as vocabulary size.

This is the DNA that LexiClash inherits: everyone plays simultaneously on the same grid, racing against the clock.`,
      },
      {
        title: 'Wordle: lightning in a bottle',
        content: `In October 2021, a Welsh software engineer named Josh Wardle released a little web game he'd made for his partner during lockdown. She liked word games, and he wanted to give her something to play.

He called it Wordle. One puzzle per day. Six guesses to find a five-letter word. No app, no account, no ads, no monetization whatsoever. Just a clean grid on a website.

By January 2022, Wordle had 300,000 daily players. By February, it had millions. The New York Times bought it for a reported seven figures.

What made Wordle special wasn't the gameplay. Guess-the-word games had existed for decades. It was the combination of design choices. One puzzle per day meant everyone was solving the same puzzle. Shared experience. You could discuss it without spoiling it. Those colored squares people shared on social media were genius.

No endless play meant it respected your time. No dopamine trap, no "one more round" manipulation.

No monetization meant it felt genuine. In a world of predatory free-to-play games, Wordle felt like a gift.

Josh Wardle, like Alfred Butts before him, created something that brought joy to millions. Unlike Butts, he at least got a good payout. But the pattern held: the game transcended its creator almost immediately.

What interests me most about Wordle: it proved that word games don't need complex mechanics to captivate people. The appeal is in the language itself. The satisfaction of narrowing down possibilities. The "aha" moment when the letters click. Same dopamine hit people have been chasing since Egyptian scribes tested each other with riddles four thousand years ago.`,
      },
      {
        content: `Sources:
- The Leiden Papyrus: Ancient Egyptian word puzzles and scribal education (c. 1200 BCE)
- Wynne, Arthur — First crossword puzzle, New York World, December 21, 1913
- Simon & Schuster — First crossword puzzle book (1924), company founding story
- Butts, Alfred Mosher — Letter frequency analysis and the invention of Scrabble (1933-1948)
- Turoff, Allan — Boggle invention and Parker Brothers deal (1972)
- Wardle, Josh — Wordle creation story, New York Times acquisition (2022)`,
      },
    ],
    backToBlog: 'Back to Blog',
    tryDaily: 'Daily Challenge',
    practice: 'Practice',
  },
  he: {
    title: 'מאריחים עתיקים ועד רשתות דיגיטליות: ההיסטוריה המטורפת של משחקי מילים',
    subtitle: 'רעיונות גנובים, טירוף תשבצים, המצאה של אבא בבית, ומילה אחת בת חמש אותיות ששברה את האינטרנט.',
    category: 'היסטוריה',
    readTime: 'זמן קריאה: 11 דקות',
    authorName: 'חנון המילים',
    authorBio: 'שחקן משחקי מילים אובססיבי, היסטוריון חובב של ידע חסר תועלת, והבן אדם שיש לו שלושה מהדורות שונות של סקרבל.',
    sections: [
      {
        content: `יש לי הודאה. יש לי העתק של לוח שעווה רומאי. הוא יושב על השולחן שלי ליד המסך, ממש מתחת לפתק שכתוב עליו "תזכור לאכול צהריים". קניתי אותו כי גיליתי שילדי בית ספר רומאים התאמנו על משחקי מילים על הדברים האלה לפני כמעט אלפיים שנה, וחשבתי שזה הדבר הכי מגניב ששמעתי אי פעם.

בת הזוג שלי חושבת שאני צריך התערבות. היא כנראה צודקת.

אבל הנה העניין: ההיסטוריה של משחקי מילים היא באמת אחד הסיפורים הכי פרועים ובלתי צפויים בכל התרבות האנושית. היא כוללת חידות מצריות עתיקות, נזירים מימי הביניים עם יותר מדי זמן פנוי, סכסוך קניין רוחני מר שקרע חברויות, טירוף עיתונאי שגרם לפיטורי אנשים מעבודתם, ומהנדס תוכנה ולשי שבמקרה יצר תופעה עולמית בזמן הסגר.

אם אתם חושבים שמשחקי מילים הם סתם תחביב — תתכוננו. לסיפור הזה יש יותר פיתולי עלילה מטלנובלה.`,
      },
      {
        title: 'מקורות עתיקים: כשמילים היו קסם',
        content: `משחקי המילים העתיקים ביותר הידועים מתוארכים לפני כארבעת אלפים שנה, והם לא שוחקו לשם כיף. האמינו באמת שיש להם כוח קסום.

המצרים הקדמונים היו אובססיביים לגבי משחקי מילים. פפירוס ליידן, שמתוארך לסביבות 1200 לפני הספירה, מכיל אוסף של חידות ופאזלים מילוליים שסופרים השתמשו בהם כדי לבחון זה את זה. אבל אלה לא היו טריקים — בתרבות המצרית, לדעת את "השם האמיתי" של דבר נתן לך כוח עליו. שליטה במילים הייתה ממש סוג של קסם.

היוונים לקחו את זה צעד קדימה. הם המציאו את האקרוסטיכון — שירים שבהם האותיות הראשונות של כל שורה מאייתות מילה או הודעה. דיוניסיוס מהליקרנסוס, היסטוריון מהמאה הראשונה לפני הספירה, כתב על פאזלי מילים מורכבים שנהגו בחינוך ובסאטירה פוליטית.

הרומאים היו מחבבים במיוחד ריבועי מילים — רשתות שבהן אותן מילים נקראות גם אופקית וגם אנכית. המפורסם ביותר הוא ריבוע SATOR, שנמצא משורט על קירות ברחבי האימפריה הרומית מפומפיי עד מנצ'סטר.`,
      },
      {
        title: 'נזירי ימי הביניים וחידות הרנסנס',
        content: `אחרי נפילת רומא, משחקי המילים לא נעלמו. הם עברו למנזרים.

נזירים מימי הביניים, עם השילוב שלהם של אוריינות, שעמום וגישה לחומרי כתיבה, הפכו לממציאי משחקי מילים נלהבים. הם יצרו פאזלי אנגרמות, פלינדרומים ואוספי חידות מפורטים. ספר אקסטר, כתב יד אנגלו-סכסי מהמאה העשירית, מכיל כמעט מאה חידות שהן בעצם משחקי מילים בצורה שירית.

הרנסנס הביא גישה יותר שיטתית. חוקרים איטלקים פיתחו את ה"רבוס" — פאזלים שבהם תמונות ואותיות משתלבות ליצירת מילים או ביטויים. אלה התפשטו ברחבי אירופה. חצר הנרי השמיני בידרה את עצמה עם משחקי מילים מורכבים ופאזלי אנגרמות.

אבל המהפכה האמיתית לא תגיע עד העידן התעשייתי, כשאוריינות המונים, נייר זול ועיתונים יצרו את התנאים למשחקי מילים להפוך באמת למיינסטרים.`,
      },
      {
        title: 'סיפור הסקרבל: גאונות, גניבה, או שניהם?',
        content: `תרשו לי לספר לכם על אלפרד מושר באטס, כי הסיפור שלו גם מעורר השראה וגם מעצבן.

ב-1933, באטס היה אדריכל מובטל בניו יורק — השפל הגדול חיסל את ענף הבנייה. עם שום דבר חוץ מזמן, הוא החליט להמציא משחק לוח. הוא בילה חודשים בניתוח שערי העיתון ניו יורק טיימס, סופר תדירויות אותיות ביד, כדי לקבוע כמה אריחים מכל אות המשחק צריך לכלול.

הוא יצר משהו שנקרא "לקסיקו", ואז שיכלל אותו ל"קריס-קרוסוורדס". זה היה, בעצם, סקרבל. אותם אריחי אותיות, אותו לוח בסגנון תשבץ, אותה שיטת ניקוד.

ואף אחד לא רצה את זה. באטס פנה לכל חברת משחקים גדולה באמריקה. כולם אמרו לא. פארקר ברדרס דחו. מילטון ברדלי דחו. כולם דחו.

ואז ג'יימס ברונוט נכנס לתמונה. ב-1948 הוא קנה את הזכויות, שינה את השם ל"סקרבל", והתחיל לייצר סטים בסלון שלו. ב-1952, נשיא מייסיס שיחק בחופשה ונדלק. הוא הזמין סטים לכל החנויות. המכירות התפוצצו.

באטס, הממציא, קיבל תמלוגים — אבל ברונוט התעשר. באטס חי בנוחות אבל מעולם לא התעשר מהמשחק שהמציא. הוא דפוס שנראה שוב ושוב בעולם משחקי המילים.`,
      },
      {
        title: 'טירוף התשבצים: כשמשחקי מילים הפכו ויראליים (גרסת שנות ה-20)',
        content: `לפני סקרבל, היה את התשבץ — ועלייתו הייתה מטורפת לחלוטין.

תשבץ המילים הראשון הופיע ב-21 בדצמבר 1913 בעיתון ניו יורק וורלד. הוא נוצר על ידי ארתור וין, עיתונאי מליברפול. וין קרא לו "Word-Cross" (סדרן דפוס הפך אותו בטעות ל"Cross-Word", והשם החדש נשאר).

ב-1924, שני מו"לים צעירים בשם ריצ'רד סיימון ומ. לינקולן שוסטר פרסמו את ספר התשבצים הראשון — הספר הראשון שלהם כהוצאה חדשה. מה שקרה אחר כך היה אחת מתופעות הויראליות הראשונות בהיסטוריה של המדיה האמריקאית.

הספר מכר מעל 350,000 עותקים בשנה הראשונה. ספרי תשבצים הפכו למתנה הכי חמה באמריקה. מעסיקים התלוננו שעובדים פותרים תשבצים במקום לעבוד. רכבת בולטימור ואוהיו שמה מילונים בכל הרכבות כי נוסעים המשיכו להתווכח על איותים. אישה משיקגו תבעה את בעלה לגירושין כי הוא היה "מכור לתשבצים" ולא דיבר איתה.

ספריות דיווחו שמילונים נגנבים. לא מושאלים — נגנבים. אנשים חתכו דפים מספרי עיון כדי ליישב ויכוחי תשבצים.`,
      },
      {
        title: 'בוגל: אבא בבית שהמציא את הכל מחדש',
        content: `ב-1972, ממציא צעצועים בשם אלן טורוף יצר משהו שישנה באופן מהותי את הדרך שבה משחקי מילים עובדים.

התובנה של טורוף הייתה פשוטה בגאונותה: מה אם, במקום לשחק בתורות, כולם ישחקו באותו זמן? מה אם האתגר הוא לא רק אוצר מילים, אלא מהירות?

הוא עיצב רשת 4x4 של קוביות אותיות במגש מכוסה. מנערים, הופכים, מתחילים טיימר של שלוש דקות, וכולם בו-זמנית מחפשים מילים. כשהטיימר מצפצף, משווים רשימות. כל מילה שיותר מאדם אחד מצא נמחקת. רק המילים הייחודיות שלכם נספרות.

זו הייתה מהפכה. סקרבל ותשבצים היו פעילויות רציפות, אינטלקטואליות, סבלניות. בוגל היה קדחתני, תחרותי וויסצרלי. הוא הפך משחקי מילים מתרגיל אינטלקטואלי בודד לחוויה חברתית עם מתח והתרגשות אמיתיים.

פארקר ברדרס — אירונית, אותה חברה שדחתה את סקרבל עשרות שנים קודם — לקחה את בוגל והוא הפך ללהיט ענק. זה הקו הגנטי שלקסיקלאש יורש — כולם משחקים בו-זמנית על אותה רשת, במירוץ נגד השעון.`,
      },
      {
        title: 'המהפכה הדיגיטלית: מ-Words With Friends ועד וורדל',
        content: `קפיצה ל-2009. האייפון יצא לפני שנתיים. חנות האפליקציות הייתה חדשה. ושני מפתחים בשם פול ודיוויד בטנר יצרו את Words With Friends.

בואו נהיה כנים: Words With Friends היה סקרבל. הלוח היה קצת שונה, חלוקת האריחים הייתה קצת שונה, אבל ליבת המשחק הייתה זהה. האסברו תבעו. הם הגיעו לפשרה. אבל עד אז, השד כבר יצא מהבקבוק.

Words With Friends עשה משהו שסקרבל מעולם לא יכל: הוא הפך משחקי מילים לרשת חברתית. בשיא, ל-Words With Friends היו מעל 20 מיליון משתמשים יומיים פעילים.

ואז, באוקטובר 2021, מהנדס תוכנה ולשי בשם ג'וש וורדל שחרר משחק קטן שעשה בשביל בת הזוג שלו. הוא קרא לו Wordle. פאזל אחד ביום. שישה ניחושים למצוא מילה בת חמש אותיות. ללא אפליקציה, ללא חשבון, ללא פרסומות.

עד ינואר 2022, לוורדל היו 300,000 שחקנים יומיים. עד פברואר — מיליונים. הניו יורק טיימס קנו אותו בסכום של שבע ספרות.

מה שמלהיב אותי הכי הרבה זה שמשחקי מילים הופכים שוב לחברתיים. מרושבים רומאים שגירדו ריבועי SATOR על קירות, דרך אנשי חברה בשנות ה-20 שהתווכחו על תשבצים ברכבות, ועד שחקנים מודרניים שמתחרים זה בזה על רשתות דיגיטליות — החוט הוא אותו חוט. בני אדם אוהבים מילים. תמיד אהבו. תמיד יאהבו.`,
      },
      {
        content: `מקורות:
- פפירוס ליידן: פאזלי מילים מצריים עתיקים וחינוך סופרים (כ-1200 לפנה"ס)
- חידות ספר אקסטר: ספרות אנגלו-סכסית, המאה ה-10
- וין, ארתור — תשבץ ראשון, ניו יורק וורלד, 21 בדצמבר 1913
- סיימון ושוסטר — ספר תשבצים ראשון (1924)
- באטס, אלפרד מושר — ניתוח תדירות אותיות והמצאת סקרבל (1933-1948)
- טורוף, אלן — המצאת בוגל (1972)
- וורדל, ג'וש — סיפור יצירת Wordle, רכישת הניו יורק טיימס (2022)`,
      },
    ],
    backToBlog: 'חזרה לבלוג',
    tryDaily: 'אתגר יומי',
    practice: 'תרגול',
  },
  sv: {
    title: 'Från Antika Brickor till Digitala Rutnät: Ordspelens Vilda Historia',
    subtitle: 'Stulna idéer, korsordsvansinne, en hemmapappas uppfinning och ett ord med fem bokstäver som krossade internet.',
    category: 'Historia',
    readTime: '11 min läsning',
    authorName: 'Ohad Fisher',
    authorBio: 'Besatt ordspelare, amatörhistoriker av onödig kunskap, och personen som äger tre olika utgåvor av Scrabble.',
    sections: [
      {
        content: `Jag har en bekännelse. Jag äger en kopia av en romersk vaxtavla. Den sitter på mitt skrivbord bredvid min skärm, precis under lappen som säger "KOM IHÅG ATT ÄTA LUNCH." Jag köpte den för att jag fick reda på att romerska skolbarn brukade öva ordspel på sådana här saker för nästan tvåtusen år sedan, och jag tyckte det var det coolaste jag någonsin hört.

Min partner tycker jag behöver en intervention. Hon har förmodligen rätt.

Men grejen är: ordspelens historia är genuint en av de vildaste, mest oväntade berättelserna i hela mänsklig kultur. Den involverar forntida egyptiska gåtor, medeltida munkar med för mycket fritid, en bitter immaterialrättstvist som slet isär vänskaper, en tidningsgalning som fick folk sparkade från sina jobb, och en walesisk mjukvaruingenjör som av misstag skapade ett globalt fenomen under lockdown.`,
      },
      {
        title: 'Antika Ursprung: När Ord Var Magi',
        content: `De äldsta kända ordspelen dateras tillbaka ungefär fyratusen år, och de spelades inte för nöjes skull. Man trodde genuint att de hade magisk kraft.

De gamla egyptierna var besatta av ordlekar. Leidenpapyrusen, daterad till cirka 1200 f.Kr., innehåller en samling gåtor och ordpussel som skrivare använde för att testa varandra. Men det var inga partytricks — i egyptisk kultur gav det dig makt över något att känna till dess "sanna namn". Ordmästerskap var bokstavligen en form av magi.

Grekerna tog det vidare med akrostikonpoesi. Romarna älskade ordrutor — rutnät där samma ord läses både horisontellt och vertikalt. Den mest kända är SATOR-rutan, som hittats inristad på väggar över hela Romarriket från Pompeji till Manchester.`,
      },
      {
        title: 'Medeltida Munkar och Renässansens Gåtor',
        content: `Efter Roms fall försvann inte ordspelen. De flyttade in i klostren.

Medeltida munkar, med sin kombination av läskunnighet, tristess och tillgång till skrivmaterial, blev entusiastiska ordspelsuppfinnare. De skapade anagrampussel, palindromer och detaljerade gåtsamlingar. Exeterboken, ett anglosaxiskt manuskript från 900-talet, innehåller nästan hundra gåtor som i grunden är ordspel i poetisk form.

Renässansen förde med sig ett mer systematiskt tillvägagångssätt. Italienska forskare utvecklade "rebusen" — pussel där bilder och bokstäver kombineras till ord eller fraser. Dessa spreds som en löpeld över Europa. Henrik VIII:s hov underhöll sig med ordspel och anagrampussel.`,
      },
      {
        title: 'Scrabbleberättelsen: Genialitet, Stöld, eller Båda?',
        content: `Låt mig berätta om Alfred Mosher Butts, för hans historia är både inspirerande och frustrerande.

1933 var Butts en arbetslös arkitekt i New York — den stora depressionen hade ödelagt byggbranschen. Med inget annat än tid skapade han ett brädspel. Han tillbringade månader med att analysera förstasidorna i New York Times, räknade bokstavsfrekvenser för hand.

Han skapade "Lexiko", förfinade det till "Criss-Crosswords" — i princip Scrabble. Och ingen ville ha det. Varje spelföretag sa nej.

Sedan kom James Brunot in i bilden. 1948 köpte han rättigheterna, ändrade namnet till "Scrabble" och började tillverka set i sitt vardagsrum. 1952 spelade chefen för Macy's Scrabble på semestern och blev förälskad. Försäljningen exploderade.

Butts, uppfinnaren, fick royalties — men blev aldrig rik. Brunot blev förmögen. Det är ett mönster vi ser om och om igen med ordspel: skaparna fångar sällan det värde de skapar.`,
      },
      {
        title: 'Korsordsgalenskapen: När Ordspel Blev Virala (1920-talsversionen)',
        content: `Det första korsordet publicerades den 21 december 1913 i tidningen New York World, skapat av Arthur Wynne från Liverpool.

1924 publicerade Richard Simon och M. Lincoln Schuster den första korsordsoken — deras allra första bok som ett splitternytt förlag. Boken sålde över 350 000 exemplar det första året. Korsordspusselböcker blev den hetaste presenten i Amerika.

Arbetsgivare klagade på att arbetare löste korsord istället för att jobba. Baltimore and Ohio Railroad lade ordböcker på alla sina tåg eftersom passagerare ständigt bråkade om stavningar. En kvinna i Chicago stämde sin man för skilsmässa för att han var "korsordsknarkare" som inte pratade med henne.

Bibliotek rapporterade att ordböcker blev stulna. Inte lånade — stulna. Folk klippte ut sidor ur referensböcker.`,
      },
      {
        title: 'Boggle: Hemmapappan Som Förändrade Allt',
        content: `1972 skapade leksaksuppfinnaren Allan Turoff något som fundamentalt förändrade hur ordspel fungerar.

Turoffs insikt var briljant enkel: tänk om alla spelade samtidigt istället för att turas om? Tänk om utmaningen inte bara var ordförråd utan snabbhet?

Han designade ett 4x4-rutnät av bokstavstärningar i ett täckt fack. Skaka, vänd, starta en treminterstimer, och alla jagar ord samtidigt. Det var revolutionerande. Scrabble var sekventiellt och tålmodigt. Boggle var hektiskt, tävlingsinriktat och visceralt.

Det här är arvet som LexiClash för vidare — alla spelar samtidigt på samma rutnät, i ett race mot klockan.`,
      },
      {
        title: 'Den Digitala Revolutionen: Från Words With Friends till Wordle',
        content: `2009 skapade Paul och David Bettner Words With Friends. Låt oss vara ärliga: det var Scrabble. Hasbro stämde. De förlikades. Men vid det laget var anden ur flaskan.

Words With Friends hade över 20 miljoner dagliga användare vid sin topp. Det var förmodligen den största inkörsporten till ordspel i historien.

Sedan, i oktober 2021, släppte en walesisk mjukvaruingenjör vid namn Josh Wardle ett litet webbspel han gjort åt sin partner. Han kallade det Wordle. Ett pussel om dagen. Sex gissningar för att hitta ett ord med fem bokstäver. Ingen app, inget konto, inga annonser.

I januari 2022 hade Wordle 300 000 dagliga spelare. I februari — miljoner. New York Times köpte det för en rapporterad sjusiffrig summa.

Det som gör mig mest entusiastisk är att ordspel blir sociala igen. Från romerska soldater som ristade SATOR-rutor i väggar, via tjugotalets sällskapsmänniskor som bråkade om korsord på tåg, till moderna spelare som tävlar på digitala rutnät — tråden är densamma. Människor älskar ord. Alltid har. Alltid kommer.`,
      },
      {
        content: `Källor:
- Leidenpapyrusen: Forntida egyptiska ordpussel (ca 1200 f.Kr.)
- Exeterbokens gåtor: Anglosaxisk litteratur, 900-talet
- Wynne, Arthur — Första korsordet, New York World, 21 december 1913
- Simon & Schuster — Första korsordsoken (1924)
- Butts, Alfred Mosher — Scrabbles uppfinning (1933-1948)
- Turoff, Allan — Boggles uppfinning (1972)
- Wardle, Josh — Wordles skapelseberättelse, New York Times-förvärvet (2022)`,
      },
    ],
    backToBlog: 'Tillbaka till bloggen',
    tryDaily: 'Daglig utmaning',
    practice: 'Öva',
  },
  ja: {
    title: '古代のタイルからデジタルグリッドへ：ワードゲームの驚くべき歴史',
    subtitle: '盗まれたアイデア、クロスワードパニック、あるお父さんの発明、そしてインターネットを壊した5文字の単語。',
    category: '歴史',
    readTime: '読了時間：11分',
    authorName: 'Ohad Fisher',
    authorBio: 'ワードゲームに取り憑かれたプレイヤー、無駄な知識のアマチュア歴史家、スクラブルを3つの異なるエディションで持っている人間。',
    sections: [
      {
        content: `告白があります。私はローマ時代の蝋板のレプリカを持っています。モニターの横の机に置いてあります。「昼食を食べるのを忘れるな」と書いたメモのすぐ下です。約2000年前にローマの学校の子供たちがこれでワードゲームの練習をしていたと知って、これまで聞いた中で一番クールなことだと思って買いました。

パートナーは介入が必要だと思っています。たぶん正しいでしょう。

でもね、ワードゲームの歴史は、人類文化の中で最もワイルドで予想外の物語の一つなんです。古代エジプトの謎々、暇を持て余した中世の修道士、友情を引き裂いた知的財産権の争い、人々を解雇させた新聞の熱狂、そしてロックダウン中に偶然世界的な現象を生み出したウェールズのソフトウェアエンジニアが登場します。`,
      },
      {
        title: '古代の起源：言葉が魔法だった時代',
        content: `最も古い既知のワードゲームは約4000年前に遡りますが、娯楽のためにプレイされたのではありませんでした。本当に魔力があると信じられていたのです。

古代エジプト人は言葉遊びに夢中でした。紀元前1200年頃のライデンパピルスには、書記官が互いの腕前を試すために使った謎々やワードパズルのコレクションが含まれています。エジプト文化では、何かの「真の名前」を知ることはそれに対する力を与えました。言葉の達人であることは、文字通り魔法の一形態でした。

ギリシャ人はアクロスティック（各行の最初の文字が単語やメッセージを綴る詩）を発明しました。ローマ人は特にワードスクエア（同じ単語が水平方向と垂直方向の両方で読めるグリッド）を好みました。最も有名なのはSATORスクエアで、ポンペイからマンチェスターまでローマ帝国中の壁に刻まれています。`,
      },
      {
        title: '中世の修道士とルネサンスの謎々',
        content: `ローマ滅亡後、ワードゲームは消えませんでした。修道院に移りました。

中世の修道士たちは、識字能力、退屈、そして筆記用具へのアクセスという組み合わせにより、熱心なワードゲーム発明家になりました。彼らはアナグラムパズル、回文、精巧な謎々コレクションを作りました。10世紀のアングロサクソン写本であるエクセター・ブックには、本質的に詩の形をしたワードゲームであるほぼ100の謎々が含まれています。

ルネサンスはより体系的なアプローチをもたらしました。イタリアの学者たちは「判じ絵」を開発しました。これらはヨーロッパ中に野火のように広がりました。`,
      },
      {
        title: 'スクラブル物語：天才か、盗作か、その両方か？',
        content: `アルフレッド・モッシャー・バッツについてお話しさせてください。彼の物語はインスピレーションを与えると同時に腹立たしいものです。

1933年、バッツはニューヨークの失業中の建築家でした。大恐慌が建設業界を壊滅させたのです。時間だけはあった彼は、ボードゲームを発明することにしました。彼はニューヨーク・タイムズの一面を何ヶ月も分析し、手作業で文字の頻度を数えました。

彼は「レキシコ」を作り、「クリスクロスワーズ」に改良しました。本質的にスクラブルでした。そして誰も欲しがりませんでした。

1948年、ジェームズ・ブルーノが権利を購入し、名前を「スクラブル」に変え、リビングルームでセットの製造を始めました。1952年、メイシーズの社長が休暇中にスクラブルをプレイして気に入りました。売上が爆発しました。

バッツは発明者としてロイヤルティを受け取りましたが、裕福にはなりませんでした。ワードゲームの世界では繰り返されるパターンです。`,
      },
      {
        title: 'クロスワードの熱狂：1920年代のバイラル現象',
        content: `最初のクロスワードパズルは1913年12月21日にニューヨーク・ワールド紙に掲載されました。リバプール出身のジャーナリスト、アーサー・ウィンが作成しました。

1924年、リチャード・サイモンとM・リンカーン・シュスターが最初のクロスワードパズル本を出版しました。初年度で35万部以上を売り上げました。

雇用主は従業員が仕事の代わりにクロスワードを解いていると苦情を言いました。ボルチモア・アンド・オハイオ鉄道は、乗客がスペルについて口論し続けるため、全列車に辞書を置きました。シカゴのある女性は、夫が「クロスワードパズル中毒者」で話しかけてこないとして離婚を訴えました。

図書館は辞書が盗まれていると報告しました。借りられたのではなく、盗まれたのです。`,
      },
      {
        title: 'ボグル：すべてを変えたお父さん',
        content: `1972年、おもちゃ発明家のアラン・ターロフが、ワードゲームの仕組みを根本的に変えるものを作りました。

ターロフの洞察は見事にシンプルでした：順番にプレイする代わりに、全員が同時にプレイしたらどうだろう？語彙だけでなく、スピードが挑戦になったら？

4x4の文字サイコロのグリッドを覆い付きのトレイにデザインしました。振って、ひっくり返して、3分タイマーを開始し、全員が同時に単語を探します。革命的でした。

これがレキシクラッシュが受け継ぐDNAです。同じグリッドで全員が同時にプレイし、時計との競争。`,
      },
      {
        title: 'デジタル革命：Words With FriendsからWordleまで',
        content: `2009年、ポールとデイビッド・ベットナーがWords With Friendsを作りました。正直に言いましょう：それはスクラブルでした。ハズブロが訴えました。和解に至りました。

ピーク時にWords With Friendsは2000万人以上のデイリーアクティブユーザーがいました。

そして2021年10月、ウェールズのソフトウェアエンジニア、ジョシュ・ウォードルがパートナーのために作った小さなウェブゲームをリリースしました。Wordleと名付けました。1日1パズル。5文字の単語を当てるのに6回の推測。アプリなし、アカウントなし、広告なし。

2022年1月までにWordleは30万人のデイリープレイヤーがいました。2月までに数百万人。ニューヨーク・タイムズが7桁の金額で買収しました。

最もワクワクするのは、ワードゲームが再び社会的になっていることです。壁にSATORスクエアを刻んだローマ兵から、列車でクロスワードについて口論した1920年代の社交界の人々、デジタルグリッドで競い合う現代のプレイヤーまで、糸は同じです。人間は言葉を愛しています。いつもそうでした。いつもそうでしょう。`,
      },
      {
        content: `出典：
- ライデンパピルス：古代エジプトのワードパズル（紀元前1200年頃）
- エクセター・ブックの謎々：アングロサクソン文学、10世紀
- ウィン、アーサー — 最初のクロスワード、ニューヨーク・ワールド、1913年12月21日
- サイモン＆シュスター — 最初のクロスワードパズル本（1924年）
- バッツ、アルフレッド・モッシャー — スクラブルの発明（1933-1948年）
- ターロフ、アラン — ボグルの発明（1972年）
- ウォードル、ジョシュ — Wordle誕生物語、ニューヨーク・タイムズ買収（2022年）`,
      },
    ],
    backToBlog: 'ブログに戻る',
    tryDaily: 'デイリーチャレンジ',
    practice: '練習',
  },
  es: {
    title: 'De Azulejos Antiguos a Cuadrículas Digitales: La Alocada Historia de los Juegos de Palabras',
    subtitle: 'Ideas robadas, manía de crucigramas, la invención de un padre en casa, y una palabra de cinco letras que rompió internet.',
    category: 'Historia',
    readTime: '11 min de lectura',
    authorName: 'Ohad Fisher',
    authorBio: 'Jugador obsesivo de juegos de palabras, historiador aficionado de conocimiento inútil, y la persona que tiene tres ediciones diferentes de Scrabble.',
    sections: [
      {
        content: `Tengo una confesión. Tengo una réplica de una tablilla de cera romana. Está en mi escritorio junto al monitor, justo debajo de la nota que dice "RECUERDA COMER". La compré porque descubrí que los niños romanos practicaban juegos de palabras en estas cosas hace casi dos mil años, y pensé que era lo más genial que había escuchado jamás.

Mi pareja piensa que necesito una intervención. Probablemente tenga razón.

Pero aquí está la cosa: la historia de los juegos de palabras es genuinamente una de las historias más salvajes e inesperadas de toda la cultura humana. Involucra acertijos egipcios antiguos, monjes medievales con demasiado tiempo libre, una amarga disputa de propiedad intelectual que destruyó amistades, una locura periodística que hizo que despidieran gente, y un ingeniero de software galés que accidentalmente creó un fenómeno global durante el confinamiento.`,
      },
      {
        title: 'Orígenes Antiguos: Cuando las Palabras Eran Magia',
        content: `Los juegos de palabras más antiguos conocidos datan de hace aproximadamente cuatro mil años, y no se jugaban por diversión. Se creía genuinamente que tenían poder mágico.

Los antiguos egipcios estaban obsesionados con los juegos de palabras. El Papiro de Leiden, datado alrededor del 1200 a.C., contiene una colección de acertijos y rompecabezas que los escribas usaban para ponerse a prueba mutuamente. En la cultura egipcia, conocer el "nombre verdadero" de algo te daba poder sobre ello. El dominio de las palabras era literalmente una forma de magia.

Los griegos inventaron el acróstico. Los romanos amaban los cuadrados de palabras — cuadrículas donde las mismas palabras se leen tanto horizontal como verticalmente. El más famoso es el Cuadrado SATOR, encontrado grabado en muros a lo largo del Imperio Romano desde Pompeya hasta Manchester.`,
      },
      {
        title: 'Monjes Medievales y Acertijos del Renacimiento',
        content: `Después de la caída de Roma, los juegos de palabras no desaparecieron. Se mudaron a los monasterios.

Los monjes medievales, con su combinación de alfabetización, aburrimiento y acceso a materiales de escritura, se convirtieron en entusiastas inventores de juegos de palabras. Crearon anagramas, palíndromos y elaboradas colecciones de acertijos. El Libro de Exeter, un manuscrito anglosajón del siglo X, contiene casi cien acertijos que son esencialmente juegos de palabras en forma poética.

El Renacimiento trajo un enfoque más sistemático. Los eruditos italianos desarrollaron el "jeroglífico" — puzzles donde imágenes y letras se combinan para formar palabras. Estos se extendieron por Europa como un reguero de pólvora.`,
      },
      {
        title: 'La Historia del Scrabble: ¿Genialidad, Robo, o Ambos?',
        content: `Déjenme contarles sobre Alfred Mosher Butts, porque su historia es tanto inspiradora como frustrante.

En 1933, Butts era un arquitecto desempleado en Nueva York — la Gran Depresión había destrozado la industria de la construcción. Sin nada más que tiempo, decidió inventar un juego de mesa. Pasó meses analizando las portadas del New York Times, contando frecuencias de letras a mano.

Creó "Lexiko", luego lo refinó a "Criss-Crosswords" — esencialmente, Scrabble. Y nadie lo quería.

En 1948, James Brunot compró los derechos, cambió el nombre a "Scrabble" y empezó a fabricar sets en su sala de estar. En 1952, el presidente de Macy's jugó Scrabble de vacaciones y le encantó. Las ventas explotaron.

Butts, el inventor, recibió regalías pero nunca se hizo rico. Brunot se volvió adinerado. Es un patrón que se repite en el mundo de los juegos de palabras: los creadores rara vez capturan el valor que crean.`,
      },
      {
        title: 'La Locura de los Crucigramas: Cuando los Juegos de Palabras Se Hicieron Virales (Edición 1920s)',
        content: `El primer crucigrama apareció el 21 de diciembre de 1913 en el periódico New York World, creado por Arthur Wynne de Liverpool.

En 1924, Richard Simon y M. Lincoln Schuster publicaron el primer libro de crucigramas — su primer libro como editorial nueva. Vendió más de 350,000 copias en su primer año.

Los empleadores se quejaban de que los trabajadores hacían crucigramas en vez de trabajar. El ferrocarril Baltimore and Ohio puso diccionarios en todos sus trenes porque los pasajeros no dejaban de discutir sobre ortografía. Una mujer de Chicago demandó a su esposo por divorcio porque era un "adicto a los crucigramas" que no le hablaba.

Las bibliotecas reportaron que los diccionarios estaban siendo robados. No prestados — robados. La gente arrancaba páginas de los libros de referencia.`,
      },
      {
        title: 'Boggle: El Padre en Casa Que Lo Cambió Todo',
        content: `En 1972, un inventor de juguetes llamado Allan Turoff creó algo que cambiaría fundamentalmente cómo funcionan los juegos de palabras.

La idea de Turoff fue brillantemente simple: ¿y si, en lugar de turnarse, todos jugaran al mismo tiempo? ¿Y si el desafío no fuera solo vocabulario, sino velocidad?

Diseñó una cuadrícula de 4x4 de dados de letras en una bandeja cubierta. Agitar, voltear, iniciar un temporizador de tres minutos, y todos cazan palabras simultáneamente. Fue revolucionario. Scrabble era secuencial y paciente. Boggle era frenético, competitivo y visceral.

Este es el ADN que hereda LexiClash — todos juegan simultáneamente en la misma cuadrícula, en una carrera contra el reloj.`,
      },
      {
        title: 'La Revolución Digital: De Words With Friends a Wordle',
        content: `En 2009, Paul y David Bettner crearon Words With Friends. Seamos honestos: era Scrabble. Hasbro demandó. Llegaron a un acuerdo.

En su pico, Words With Friends tenía más de 20 millones de usuarios activos diarios. Fue probablemente la mayor puerta de entrada a los juegos de palabras en la historia.

Luego, en octubre de 2021, un ingeniero de software galés llamado Josh Wardle lanzó un pequeño juego web que había hecho para su pareja. Lo llamó Wordle. Un puzzle por día. Seis intentos para encontrar una palabra de cinco letras. Sin app, sin cuenta, sin anuncios.

Para enero de 2022, Wordle tenía 300,000 jugadores diarios. Para febrero, millones. El New York Times lo compró por una cifra reportada de siete dígitos.

Lo que más me emociona es que los juegos de palabras se están volviendo sociales de nuevo. Desde soldados romanos grabando cuadrados SATOR en muros, pasando por los socialités de los años 20 discutiendo sobre crucigramas en trenes, hasta jugadores modernos compitiendo en cuadrículas digitales — el hilo es el mismo. Los humanos aman las palabras. Siempre lo han hecho. Siempre lo harán.`,
      },
      {
        content: `Fuentes:
- El Papiro de Leiden: Puzzles de palabras del antiguo Egipto (c. 1200 a.C.)
- Acertijos del Libro de Exeter: Literatura anglosajona, siglo X
- Wynne, Arthur — Primer crucigrama, New York World, 21 de diciembre de 1913
- Simon & Schuster — Primer libro de crucigramas (1924)
- Butts, Alfred Mosher — Invención del Scrabble (1933-1948)
- Turoff, Allan — Invención de Boggle (1972)
- Wardle, Josh — Historia de la creación de Wordle, adquisición del New York Times (2022)`,
      },
    ],
    backToBlog: 'Volver al blog',
    tryDaily: 'Desafío diario',
    practice: 'Practicar',
  },
};
