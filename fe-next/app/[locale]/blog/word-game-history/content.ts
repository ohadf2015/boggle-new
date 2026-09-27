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
    title: 'מהאריחים העתיקים ועד רשתות דיגיטליות: ההיסטוריה האמיתית של משחקי מילים',
    subtitle: 'רעיונות גנובים, טירוף תשבצים, אבא בבית שהמציא כל הכל, ומילה אחת בת חמש אותיות ששברה את האינטרנט.',
    category: 'היסטוריה',
    readTime: 'זמן קריאה: 7 דקות',
    authorName: 'אוהד פישר',
    authorBio: 'שחקן משחקי מילים אובססיבי, היסטוריון חובב של טריוויה חסרת ערך, והאדם שיש לו שלוש מהדורות שונות של סקרבל.',
    sections: [
      {
        content: `יש לי עותק של לוח שעווה רומאי על השולחן שלי. הוא יושב ממש לצד המסך, מתחת לפתק שכתוב עליו "תזכור לאכול צהריים". קניתי אותו כשגיליתי שילדי בית ספר רומאים התרגלו משחקי מילים על הדברים האלה לפני כמעט אלפיים שנה. חשבתי שזה הדבר הכי מגניב ששמעתי אי פעם.

בת הזוג שלי חושבת שאני צריך קצת עזרה. היא כנראה צודקת.

אבל הנה העניין: ההיסטוריה של משחקי מילים היא באמת אחד הסיפורים הכי פרועים בתרבות האנושית. חידות מצריות, נזירי ימי הביניים שלא הספיקו לנמאס להם, סכסוך קניין רוחני שקרע חברויות, טירוף עיתונאי שהחזיק מעמד דור שלם, ומהנדס תוכנה ולשי שבמקרה יצר תופעה עולמית בזמן הסגר.

משחקי מילים לא חדלו למטרוד בנו במשך ארבעת אלפים שנה.`,
      },
      {
        title: 'מקורות עתיקים: כשמילים היו כוח אמיתי',
        content: `משחקי המילים העתיקים ביותר שנמצאו מתוארכים לפני כארבעת אלפים שנה. והם לא שוחקו לשם בדיחה.

המצרים הקדמונים היו אובססיביים לגבי משחקי מילים. הפפירוס של ליידן, משנת 1200 לפני הספירה בערך, הוא מלא בחידות ופאזלים שסופרים השתמשו כדי לבחון זה את זה. בתרבות המצרית, לדעת את "השם האמיתי" של משהו זה ממש הייתה עוצמה. לשלוט במילים היה קסם.

היוונים המציאו את האקרוסטיכון — שירים שבהם האות הראשונה של כל שורה מאייתת משהו. הרומאים היו מטורפים אחרי ריבועי מילים, רשתות שנקראו באותו אופן בשתי כיווניים. המפורסם ביותר הוא SATOR, שנחרט על כל הקירות ברחבי האימפריה — מפומפיי עד מנצ'סטר. עד היום אף אחד לא יודע בדיוק מה המשמעות שלו.`,
      },
      {
        title: 'נזירים ותשבצים שלא עזבו',
        content: `אחרי שרומא נפלה, משחקי המילים לא נעלמו. הם עברו למנזרים.

נזירים מימי הביניים היו בעלי שילוב מושלם: אוריינות, שעמום אדיר, וגישה בלתי מוגבלת לנייר. הם המציאו אנגרמות, פלינדרומים, וחידות בערימות. ספר אקסטר, כתב יד מהמאה העשירית, מלא בחידות שהן בעצם משחקי מילים בתחפושת שירה.

לפי שהזמן התקדם, התשבץ הפך למקום בעולם. בתחילת המאה העשרים, התשבץ היה אפילו טריק עתיק במדי ובמעברון של עיתונים בריטים. אבל ההיסטוריה ממשיכה.`,
      },
      {
        title: 'סקרבל: המצאה שסתם קרתה להצליח',
        content: `אלפרד מושר באטס היה אדריכל מובטל בניו יורק. שנת 1933, השפל הגדול הרגע ניסה לחנוק את ענף הבנייה. באטס בילה חודשים בניתוח שערי הניו יורק טיימס, סופר תדירויות אותיות ביד, לא בגלל שהוא משוגע (אוקיי, אולי קצת) אלא כי היה צריך לדעת כמה אריחים מכל אות צריך המשחק.

הוא יצר "לקסיקו", ואז שיכלל אותו ל"קריס-קרוסוורדס". זה היה, בעצם, סקרבל. אותם אריחים, אותו לוח, אותה שיטת ניקוד. ואף אחד לא רצה את זה. באטס פנה להם כולם. פארקר ברדרס — לא. מילטון ברדלי — לא.

ואז בא ג'יימס ברונוט, שקנה את הזכויות ב-1948 והתחיל לייצר סקרבל בסלון שלו. ב-1952 שיחק נשיא מייסיס בחופשה, נדלק, והזמין לכל החנויות שלו. המכירות התפוצצו.

באטס קיבל תמלוגים. ברונוט נעשה עשיר. זה הדפוס שנראה שוב ושוב: ממציא = תמלוגים, בן זוג = עושק.`,
      },
      {
        title: 'התשבץ ויראלי: שנות ה-20 קודם שנות ה-20',
        content: `סתם דקה. התשבץ קדם לסקרבל.

התשבץ הראשון הופיע ב-21 בדצמבר 1913 בניו יורק וורלד. ארתור וין, עיתונאי מליברפול, צייר אותו בצורת יהלום. קרא לו "Word-Cross". (סדרן הדפוס טעה וכתב "Cross-Word" — השם של עַל.)

לפני 1924, תשבצים היו פיצ'ר בעיתון כמו כל דבר אחר. ואז ריצ'רד סיימון ומ. לינקולן שוסטר, שני מו"לים צעירים, פרסמו את ספר התשבצים הראשון. את ספרם הראשון.

מה שקרה היה אחד הדברים הראשונים שהיו "ויראליים" בהיסטוריה של אמריקה. מעל 350,000 עותקים בשנה הראשונה. מעסיקים הציעו כללים: אין תשבצים בעבודה. רכבת בולטימור ואוהיו שמה מילונים בכל הרכבות (כי נוסעים התווכחו על איות כל הזמן). אישה בשיקגו תבעה את בעלה לגירושין כי הוא היה "מכור לתשבצים" ולא דיבר איתה.

ספריות דיווחו שמילונים נגנבים. לא מושאלים. נגנבים. אנשים פשוט חתכו דפים.

זה מה משחקי מילים עושים לאנשים.`,
      },
      {
        title: 'בוגל: המהפכה של המהירות',
        content: `ב-1972, אלן טורוף (ממציא צעצועים) עשה משהו ששינה לתמיד את משחקי המילים.

התובנה שלו הייתה פשוטה: מה אם במקום לשחק בתורות, כולם משחקים בו-זמנית? מה אם זה לא רק על אוצר מילים, אלא על מהירות?

4x4 רשת של קוביות אותיות. מנערים, הופכים, טיימר של שלוש דקות, וכולם חוצים המרחב בחיפוש אחר מילים. כל מילה שיותר מאדם אחד מצא? ברחוק. רק המילים שלך בלבד נספרות.

סקרבל היה סבלני ואינטלקטואלי. בוגל היה קדחתני ותחרותי. זה הפך משחקי מילים לחוויה חברתית עם מתח אמיתי.

פארקר ברדרס (אתה מרגיש כאן סירנה?) לקחה את בוגל והוא הפך להיט ענק. זה כן בדיוק היא ה-DNA שלקסיקלאש יורש: כולם משחקים בו-זמנית, אותה רשת, מרוץ נגד השעון.`,
      },
      {
        title: 'וורדל: מהנדס לבודד שעשה משהו קטן שדרך את העולם',
        content: `אוקטובר 2021. מהנדס תוכנה ולשי בשם ג'וש וורדל יצר משחק קטן לבת הזוג שלו בזמן הסגר. היא אהבה משחקי מילים. הוא רצה לתת לה משהו לעשות.

קרא לו Wordle. פאזל אחד ביום. שישה ניחושים בשביל מילה בת חמש אותיות. בלא אפליקציה, בלא חשבון, בלא פרסומות. רק רשת על אתר.

בינואר 2022 — 300,000 שחקנים יומיים. בפברואר — מיליונים. הניו יורק טיימס קנתה אותו בסכום של שבע ספרות.

מה עשה את וורדל לכזה רעיון שלא היה ניתן להגן עליו? לא הייתה זו המכניקה. "תאר לי מילה" היה קיים כבר עשרות שנים. זה היה צירוף של בחירות עיצוב קטנות. פאזל אחד ביום = כולם פותרים את אותו דבר = ניתן לדבר עליו ללא ספוילר. הריבועים הצבעוניים שחברים שלחו בציוצים? גאוני ממש. אין אפליקציה אומרת: אני מכבדת את הזמן שלך. אין לולאה בדופמין. אין "עוד סיבוב אחד". אין מונטיזציה אומרת: אני הולך להיות כנה.

בעולם של משחקים שלוחים אדם רעל דופמין, וורדל הרגיש כמו מתנה.

גם וורדל וגם באטס יצרו משהו שהביא שמחה למיליונים. בניגוד לבאטס, וורדל לפחות קיבל משכורת טובה. אבל הדפוס הזה קרה שוב: המשחק עלה מעל למי שיצרו אותו.

מה שמעניין אותי הכי הרבה: וורדל הוכיח שמשחקי מילים לא צריכים מכניקה מסובכת כדי להקסים. הקסם הוא בשפה עצמה. הסיפוק של ניקוד אפשרויות. הרגע של "יורקה" כשהאותיות נופלות למקום. אותו קורוקמה שאנשים מרדפים מאז סופרים מצריים בדקו זה בזה עם חידות לפני ארבעת אלפים שנה.`,
      },
      {
        content: `מקורות:
- פפירוס ליידן: פאזלי מילים מצריים עתיקים ותרבות סופרים (c. 1200 לפנה"ס)
- ספר אקסטר: גאות אנגלו-סכסית, המאה ה-10
- וין, ארתור — התשבץ הראשון, ניו יורק וורלד, 21 בדצמבר 1913
- סיימון ושוסטר — ספר התשבציס הראשון (1924)
- באטס, אלפרד מושר — ניתוח תדירויות אותיות והמצאת סקרבל (1933–1948)
- טורוף, אלן — המצאת בוגל (1972)
- וורדל, ג'וש — סיפור יצירת וורדל, רכישת הניו יורק טיימס (2022)`,
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
    readTime: '6 min de lectura',
    authorName: 'Ohad Fisher',
    authorBio: 'Jugador obsesivo de juegos de palabras, historiador aficionado de conocimiento inútil, y la persona que tiene tres ediciones diferentes de Scrabble.',
    sections: [
      {
        content: `Tengo una réplica de una tablilla de cera romana en mi escritorio. Está junto al monitor, bajo la nota que dice "ACUÉRDATE DE COMER". La compré porque descubrí que los niños romanos practicaban juegos de palabras en estas cosas hace casi dos mil años.

Mi pareja piensa que necesito ayuda. Probablemente tenga razón.

Pero acá viene lo bueno: la historia de los juegos de palabras es genuinamente una de las historias más salvajes que ha producido la humanidad. Acertijos egipcios, monjes medievales con demasiado tiempo libre, una disputa de patentes que destrozó amistades, histeria periodística que costó empleos, e ingeniero de software galés que sin quererlo creó un fenómeno mundial en el confinamiento.

Los juegos de palabras llevan cuatro mil años desquiciando a la gente.`,
      },
      {
        title: 'Orígenes antiguos: cuando las palabras eran magia',
        content: `Los juegos de palabras más antiguos datan de hace cuatro mil años, y no se jugaban por diversión. Se creía que tenían poder mágico.

Los antiguos egipcios estaban obsesionados. El Papiro de Leiden, datado alrededor de 1200 a.C., contiene acertijos y rompecabezas que los escribas usaban para competir. En la cultura egipcia, conocer el "nombre verdadero" de algo te daba poder sobre ello. Dominar las palabras era literalmente magia.

Los griegos inventaron el acróstico — poemas donde la primera letra de cada línea forma una palabra. Los romanos amaban los cuadrados de palabras, cuadrículas donde las mismas palabras se leen horizontal y verticalmente. El más famoso es el Cuadrado SATOR, grabado en muros desde Pompeya hasta Manchester. Llevaba siglos siendo estudiado y debatido.

Me gusta imaginar a esos soldados romanos raspando palabras en piedra mientras esperaban algo. La gente siempre necesitó entretenerse mentalmente.`,
      },
      {
        title: 'El Scrabble y el robo de ideas',
        content: `Alfred Mosher Butts pasaba meses analizando las portadas del New York Times, contando frecuencias de letras a mano. Corría el 1933. La Gran Depresión había destrozado la construcción, y Butts, arquitecto desempleado, necesitaba algo en qué pensar.

Creó "Lexiko", luego "Criss-Crosswords" — esencialmente, Scrabble. Las mismas fichas, el mismo tablero. Nadie lo quería. Parker Brothers dijo que no. Milton Bradley dijo que no. Todos dijeron que no.

Entonces llegó James Brunot. En 1948 compró los derechos, simplificó las reglas, cambió el nombre a "Scrabble" y comenzó a fabricar sets en su sala de estar. Los primeros años no vendía. Pero en 1952 el presidente de Macy's jugó Scrabble en vacaciones y quedó enganchado. Pidió para todas las tiendas Macy's. Las ventas explotaron. Dos años después, millones de copias.

Butts, el inventor, recibió regalías. Brunot se hizo rico. Es un patrón que veremos una y otra vez: los creadores rara vez capturan el valor que generan.`,
      },
      {
        title: 'El craze de los crucigramas (viral de los años 20)',
        content: `El primer crucigrama apareció el 21 de diciembre de 1913 en el New York World. Lo creó Arthur Wynne, periodista de Liverpool, en forma de diamante. Wynne lo llamó "Word-Cross".

Durante diez años, los crucigramas fueron una sección menor. Luego, en 1924, Richard Simon y M. Lincoln Schuster tuvieron una idea. La tía de Simon coleccionaba crucigramas y no encontraba un libro. Así que publicaron uno. Su primer libro como editorial nueva.

Lo que sucedió fue uno de los primeros fenómenos virales de la historia mediática americana. Más de 350.000 copias el primer año. Los periódicos que no publicaban crucigramas perdían suscriptores. El New York Times, que después sería sinónimo de crucigramas, inicialmente se negó, llamándolos "una forma primitiva de ejercicio mental" en un editorial de 1924.

Los empleadores se quejaban de que los trabajadores resolvían en lugar de trabajar. El ferrocarril Baltimore and Ohio ponía diccionarios en todos sus trenes — los pasajeros no dejaban de discutir sobre ortografía. Una mujer de Chicago demandó a su marido por divorcio: era un "adicto a los crucigramas" que no le hablaba.

Las bibliotecas reportaron diccionarios robados. No prestados — robados. Gente arrancaba páginas de libros de referencia para resolver disputas sobre palabras.

Esto es lo que hacen los juegos de palabras. El craze de crucigramas de 1920 fue idéntico al fenómeno Wordle de 2022: obsesión global, distracción en el trabajo, experiencia compartida.`,
      },
      {
        title: 'Boggle y la revolución de la velocidad',
        content: `En 1972, Allan Turoff, inventor de juguetes, creó algo que cambió fundamentalmente cómo funcionan los juegos de palabras. Su idea era brillantemente simple: ¿y si en lugar de tomar turnos, todos jugaran al mismo tiempo? ¿Y si el desafío no fuera solo vocabulario, sino velocidad?

Diseñó una cuadrícula de 4x4 de dados de letras en una bandeja cubierta. Agitas, volteas, inicia un temporizador de tres minutos, y todos buscan palabras simultáneamente. Cuando suena el timbre, comparan listas. Cualquier palabra que encontró más de uno se tilda. Solo tus hallazgos únicos cuentan.

Fue revolucionario. Scrabble era cerebral y paciente. Boggle era frenético, competitivo, visceral. Transformó los juegos de palabras de un ejercicio intelectual solitario a experiencia social con tensión real. Parker Brothers lo comercializó y se volvió un éxito masivo. Para los años 80, era uno de los juegos de palabras más vendidos del mundo.

Lo que amo de Boggle: democratizó los juegos de palabras. En Scrabble, los jugadores experimentados tienen ventaja enorme. En Boggle, un chico de doce años con buen ojo para patrones puede ganarle a un profesor de Literatura. La velocidad importa tanto como el vocabulario.

Este es el ADN que LexiClash hereda: todos juegan simultáneamente en la misma cuadrícula, carrera contra el reloj.`,
      },
      {
        title: 'El fenómeno Wordle',
        content: `En octubre de 2021, Josh Wardle, ingeniero de software galés, lanzó un pequeño juego web que había hecho para su pareja durante el confinamiento. Le gustaban los juegos de palabras, y él quería darle algo para jugar.

Lo llamó Wordle. Un puzzle por día. Seis intentos para encontrar una palabra de cinco letras. Sin app, sin cuenta, sin publicidades. Solo una cuadrícula limpia en un sitio web.

Para enero de 2022, Wordle tenía 300.000 jugadores diarios. Para febrero, millones. El New York Times lo compró por una cifra reportada de siete dígitos.

Lo que hizo a Wordle especial no fue la mecánica. Juegos de "adivina la palabra" existían desde hace décadas. Fue la combinación de decisiones de diseño. Un puzzle por día significaba que todos resolvían el mismo. Experiencia compartida. Podías discutirlo sin spoilear. Esos cuadraditos de color que compartían en redes fueron geniales.

Sin juego infinito, respetaba tu tiempo. Sin trampa de dopamina, sin "una ronda más" manipulatoria.

Sin monetización, se sentía genuino. En un mundo de juegos predatorios, Wordle era un regalo.

Josh Wardle, como Alfred Butts antes, creó algo que trajo alegría a millones. A diferencia de Butts, al menos recibió un buen pago. Pero el patrón se mantuvo: el juego transcendió a su creador casi instantáneamente.

Lo que más me fascina: Wordle probó que los juegos de palabras no necesitan mecánica compleja para cautivar. El atractivo está en el lenguaje mismo. La satisfacción de descartar posibilidades. El "eureka" cuando las letras encajan. Mismo dopamina que la gente persigue desde que escribas egipcios se retaban mutuamente con acertijos hace cuatro mil años.`,
      },
      {
        content: `Fuentes:
- El Papiro de Leiden: Acertijos del antiguo Egipto y educación de escribas (c. 1200 a.C.)
- Wynne, Arthur — Primer crucigrama, New York World, 21 de diciembre de 1913
- Simon & Schuster — Primer libro de crucigramas (1924), historia de la fundación
- Butts, Alfred Mosher — Análisis de frecuencia de letras e invención del Scrabble (1933-1948)
- Turoff, Allan — Invención de Boggle y acuerdo con Parker Brothers (1972)
- Wardle, Josh — Historia de creación de Wordle, adquisición del New York Times (2022)`,
      },
    ],
    backToBlog: 'Volver al blog',
    tryDaily: 'Desafío diario',
    practice: 'Practicar',
  },
  ru: {
    title: 'От древних плиток к цифровым сеткам: дикая история словесных игр',
    subtitle: 'Украденные идеи, мания кроссвордов, изобретение папы из дома и пять букв, что сломали интернет.',
    category: 'История',
    readTime: '6 мин чтения',
    authorName: 'Ohad Fisher',
    authorBio: 'Одержимый игрок в словесные игры, любитель истории бесполезных знаний и обладатель трёх разных изданий Эрудита.',
    sections: [
      {
        content: `На моём столе стоит копия римской восковой дощечки. Она лежит прямо рядом с монитором, под стикером с надписью «НЕ ЗАБЫТЬ ПООБЕДАТЬ». Купил я её потому, что узнал: римские школьники уже две тысячи лет назад тренировались в словесных играх вот на таких штучках. Показалось мне это самым крутым, что я когда-либо слышал.

Мой партнёр думает, что мне нужна помощь. Наверное, он прав.

Но вот в чём суть: история словесных игр — это, честное слово, одна из самых диких и неожиданных историй в человеческой культуре. Древнеегипетские загадки. Средневековые монахи с кучей свободного времени. Кровавая война из-за авторских прав, что разрушила дружбы. Газетный ажиотаж, за который люди теряли работу. И один валлийский программист, который совершенно случайно создал глобальный феномен во время карантина.

Четыре тысячи лет словесные игры сводят людей с ума.`,
      },
      {
        title: 'Древние корни: когда слова были магией',
        content: `Самые старые из известных нам словесных игр датируются примерно четырьмя тысячами лет назад. И играли в них не для удовольствия. В них верили как в магию.

Древние египтяне были одержимы словесными играми. Папирус из Лейдена, датированный примерно 1200 годом до нашей эры, полон загадок и головоломок, которыми писцы проверяли друг друга. В египетской культуре знание «истинного имени» чего-либо давало тебе над ним власть. Мастерство в словах было буквально формой магии.

Греки придумали акростих — стихи, где первая буква каждой строки составляет слово или фразу. Римляне сходили с ума по словесным квадратам, квадратам, где одинаковые слова читаются и горизонтально, и вертикально. Самый известный — квадрат SATOR, вырезанный на стенах по всей Римской империи от Помпей до Манчестера. Учёные спорят о его значении уже много веков. Кто-то видит в нём закодированную христианскую молитву. Другие думают, что это просто древний римлянин развлекался, ничего не делая.

Я люблю представлять себе этих римских солдат, вырезающих словесные головоломки в каменные стены, пока ждут приказа. Люди всегда нуждались в том, чтобы занять свой мозг. Мы не так сильно изменились.`,
      },
      {
        title: 'Скрабл: история краж и везения',
        content: `Альфред Мошер Баттс месяцами анализировал первые полосы New York Times, вручную подсчитывая частоту букв. Это был 1933 год. Великая депрессия убила строительную отрасль, а Баттс, безработный архитектор, искал, чем себя занять.

Он создал «Лексико», потом переделал его в «Крисс-кроссворд» — по сути, Эрудит. Те же фишки, та же доска, та же система подсчёта очков. Никому это не нужно было. Parker Brothers отказали. Milton Bradley отказали. Все отказали.

Потом появился Джеймс Бруно. В 1948 году он купил права, упростил правила, переименовал игру в «Скрабл» (в России она известна как Эрудит) и начал её производить прямо в своей гостиной. Первые несколько лет продавалось плохо. Но в 1952 году президент Macy's сыграл в Скрабл на отпуске и влюбился в неё. Он заказал наборы для всех магазинов Macy's. Продажи взлетели. За два года Скрабл продавался миллионами копий.

Баттс, изобретатель, получал роялти. Бруно разбогател. И это закономерность, которую мы видим снова и снова: авторы редко присваивают стоимость, которую они создают. Между прочим, в России всегда была своя классика — игра «Балда», где игроки добавляют буквы к растущей сетке букв. Совсем другая механика, но такой же кайф от словесной магии.`,
      },
      {
        title: 'Кроссворды: вирус двадцатых',
        content: `Первый кроссворд опубликовался 21 декабря 1913 года в газете New York World. Его создал Артур Вин, журналист из Ливерпуля. Головоломка была ромбом. Вин называл её «Word-Cross».

Около десяти лет кроссворды были просто колонкой в газете. Потом, в 1924 году, два молодых издателя, Ричард Саймон и Линкольн Шустер, придумали идею. Тётя Саймона любила кроссворды, но не могла найти книгу с ними. Вот они и издали её. Первая книга совершенно новой издательской компании.

То, что произошло дальше, было одним из первых вирусных явлений в истории американской прессы. Книга продалась 350 тысячами копий в первый год. Книги с кроссвордами стали самым горячим подарком в Америке. Газеты, которые не печатали кроссворды, теряли читателей. New York Times, которая потом стала синонимом кроссвордов, сначала отказывалась их печатать, называя их в редакционной статье 1924 года «примитивной формой умственной деятельности».

Работодатели жаловались, что сотрудники решают кроссворды вместо работы. Железная дорога Baltimore and Ohio положила словари на все свои поезда — пассажиры постоянно спорили из-за орфографии. Одна чикагская женщина подала в суд на мужа, потому что он был «кроссвордной наркоманом» и не разговаривал с ней.

Библиотеки сообщали о краже словарей. Не займах — краже. Люди вырывали страницы из справочников.

Вот что делают со людьми словесные игры. Эпидемия кроссвордов в 1920-х выглядела точно так же, как феномен Wordle в 2022 году: глобальная одержимость, отвлечение на работе, общее переживание.`,
      },
      {
        title: 'Боггл и революция скорости',
        content: `В 1972 году изобретатель игрушек Аллан Туроф создал кое-что, что кардинально изменило, как работают словесные игры. Его идея была гениально проста: а что если вместо очередёдности все будут играть одновременно? А что если испытание — это не только словарный запас, но и скорость?

Он спроектировал сетку 4×4 с буквенными кубиками в закрывающемся подносе. Встряхиваешь, переворачиваешь, запускаешь таймер на три минуты, и все одновременно охотятся за словами. Когда таймер пищит, сравниваешь списки. Любое слово, найденное больше чем одним игроком, вычёркивается. Считаются только твои уникальные находки.

Это была революция. Скрабл и кроссворды — это были достоинство и терпение. Боггл был хаотичным, соревновательным, вязким. Это превратило словесные игры из одинокого интеллектуального упражнения в социальный опыт с настоящим напряжением. Parker Brothers подхватила игру, и она стала огромным хитом. К 1980-м годам это была одна из самых продаваемых словесных игр в мире.

То, что мне нравится в Боггле: она была демократична. В Скраббле опытные игроки имели огромное преимущество. В Боггле двенадцатилетний парень с хорошим глазом для паттернов может обыграть профессора литературы. Скорость и распознавание паттернов имеют значение не меньше, чем размер словаря.

Это ДНК, который LexiClash унаследовал: все играют одновременно на одной сетке, гонка против времени.`,
      },
      {
        title: 'Wordle: молния в бутылке',
        content: `В октябре 2021 года валлийский программист по имени Джош Вордл выпустил маленькую веб-игру, которую он создал для своей подруги во время карантина. Ей нравились словесные игры, и он хотел дать ей что-нибудь поиграть.

Он назвал её Wordle. Одна головоломка в день. Шесть попыток найти пятибуквенное слово. Никакого приложения, никакого аккаунта, никакой рекламы, никакой монетизации вообще. Просто чистая сетка на сайте.

К январю 2022 года у Wordle было 300 тысяч ежедневных игроков. К февралю — миллионы. New York Times купила её за семизначную сумму.

Что делало Wordle особенной, так это не геймплей. Игры «угадай слово» существовали уже десятки лет. Это была комбинация дизайнерских решений. Одна головоломка в день означала, что все решают одну и ту же. Общий опыт. Можно обсуждать, не спойлеря. Эти цветные квадратики, которые люди делились в соцсетях, были гением.

Бесконечная игра не была предусмотрена — она уважала твоё время. Никакой ловушки дофамина, никакого манипулятивного «ещё один раунд».

Никакой монетизации — ощущалась подлинностью. В мире хищнических free-to-play-игр Wordle казалась подарком.

Джош Вордл, как Альфред Баттс до него, создал кое-что, что принесло радость миллионам. В отличие от Баттса, он хотя бы получил нормальный выкуп. Но закономерность сохранилась: игра трансцендировала своего создателя почти мгновенно.

Что меня больше всего интересует в Wordle: она доказала, что словесным играм не нужна сложная механика, чтобы пленить людей. Привлекательность — в самом языке. Удовлетворение от сужения возможностей. Момент озарения, когда буквы встают на место. То же самое, что люди ищут четыре тысячи лет, с тех пор как египетские писцы проверяли друг друга загадками.`,
      },
      {
        content: `Источники:
- Папирус из Лейдена: древнеегипетские словесные головоломки (ок. 1200 г. до н.э.)
- Вин, Артур — Первый кроссворд, New York World, 21 декабря 1913
- Саймон и Шустер — Первая книга кроссвордов (1924), история основания
- Баттс, Альфред Мошер — Анализ частоты букв и изобретение Скрабла (1933–1948)
- Туроф, Аллан — Изобретение Боггла (1972)
- Вордл, Джош — История создания Wordle, покупка New York Times (2022)`,
      },
    ],
    backToBlog: 'Вернуться в блог',
    tryDaily: 'Ежедневный вызов',
    practice: 'Практика',
  },

};
