export type GuideContent = {
  title: string;
  subtitle: string;
  category: string;
  readTime: string;
  authorName: string;
  authorBio: string;
  quickTips: string[];
  sections: Array<{ title?: string; content: string }>;
  faq: Array<{ question: string; answer: string }>;
  ctaText: string;
  ctaLink: string;
  backToGuides: string;
};

export const contentByLocale: Record<string, GuideContent> = {
  en: {
    title: 'How to Get Better at Word Hunt: Grid Tips That Actually Help',
    subtitle: 'How to scan a letter grid, spot word families and keep long words coming, plus what is different in LexiClash Word Hunt.',
    category: 'Strategy',
    readTime: '7 min read',
    authorName: 'Ohad Fisher',
    authorBio: 'I build LexiClash and play its grid modes every day.',
    quickTips: [
      'Hunt endings first. -ING, -ED, -ER, -EST and a final S turn one word into three.',
      'Every tile touches up to 8 neighbors, diagonals included. Read the grid in all directions, not just left to right.',
      'Found a word? Try it with a letter added at the front or the back before you move on.',
      'Short words are fast points and keep your rhythm. Long words are where the big scores are.',
      'Rare letters like Q, J, X and Z have few partners. Check them once, then ignore them.',
      'Trace cleanly. A wrong swipe costs more time than a one-second look before you drag.',
      'In LexiClash Word Hunt, the hidden target is always on the board, and board words keep you alive while you look for it.',
    ],
    sections: [
      {
        title: 'Two games called Word Hunt',
        content: `Most people searching for Word Hunt tips mean the timed letter-grid game from the GamePigeon pack in iMessage: a small grid of letters, a short clock, and you swipe through touching letters to make as many words as you can. Longer words score more.

LexiClash has its own Word Hunt mode on the same kind of grid, with a twist. A secret target word is hidden on the board. Your life bar drains every second, and every word you find on the board heals you and lights up clue letters about the target. Trace the target before your life runs out and you win the round.

The grid skills below work for both games. The last two sections are about the LexiClash version.`,
      },
      {
        title: 'Scan the grid with a system',
        content: `The most common mistake is staring at one corner. Your eyes lock onto a word you almost see, the clock runs, and the rest of the grid goes unread.

Give yourself a route. Start at one corner tile and ask what it connects to: up, down, sideways and the four diagonals. Then move to the next tile. You will not check every tile every round, but a route stops you from rereading the same patch.

Look for common pairs and triples before full words. TH, ST, CH, SH, ER, RE, IN and AN show up everywhere in English. When you see one, try to grow it in both directions: ST can become STAR, REST, STARE or TASTE, depending on what sits around it.

Vowels are your anchors. A tile with a vowel in the middle of the grid has the most neighbors and usually sits inside the most words. Start there when you are stuck.`,
      },
      {
        title: 'Turn one word into a family',
        content: `This is the habit that adds the most words per round. When you find a word, do not move on yet. Check for:

Plurals and verb endings. If there is an S next to the last letter, you probably have a second word. Same for -ED, -ER and -ING when those letters touch the end of the word.

Letters in front. RATE can become CRATE, GRATE or IRATE if the right letter touches the R. LATE can become PLATE or SLATE.

Words inside the word. If you traced STARE, you also passed through STAR, TAR, ARE and TARE. Each one usually counts on its own.

Swaps around a shared core. Once you see -ATE in a corner, every consonant touching the A is a candidate: DATE, GATE, HATE, LATE, MATE.

In a timed round, one find can turn into four or five words this way, and you already know where they are.`,
      },
      {
        title: 'Short words, long words and the clock',
        content: `In a timed grid game you are balancing two things: how many words you find and how long they are.

Short words (three and four letters) are quick. They keep you moving and stop you freezing at the start of a round. Long words take longer to spot but score far more, so a single six- or seven-letter word can beat a handful of short ones.

A rhythm that works for a lot of players: clear the obvious short words in the first part of the round to get going, then spend the rest looking for long words built on the endings and families you have already spotted. If you notice yourself hunting for long words with nothing to show for it, drop back to short ones for a few seconds to reset.

Trace accurately. A rejected swipe costs you the time it took, plus the time to find your place again. If you are not sure the letters touch, look for one second before you drag.`,
      },
      {
        title: 'LexiClash Word Hunt: finding the hidden word',
        content: `In LexiClash Word Hunt you are looking for one specific word, and the game tells you how long it is. The target is always somewhere on the board, so you are hunting, not guessing blind.

Clues come from the words you find. Board words that share letters with the target light up the clue boxes at the top: green means the letter is in that spot, yellow means it is in the word but somewhere else, gray means it is not in the word. The more words you find, the more of the target you can see.

Tracing a word that is the same length as the target counts as a guess at it. Shorter words do not use a guess, so they are a free way to collect clues and life.

A wrong guess at the target costs you life, so build up a few clues first. Once you have two or three green letters, look at the board for a path that spells a word of the right length with those letters in those spots. The target has to be traceable, which rules out most of the words that fit the clues on paper.`,
      },
      {
        title: 'LexiClash Word Hunt: staying alive',
        content: `Your life bar starts full and drains every second, and it drains faster the longer the round goes on. Finding a word on the board heals you, and longer words heal more than short ones.

That changes how you play compared with a plain timed grid. Early in the round, a quick stream of short words keeps your bar safe while the clue boxes fill in. Later, when the drain speeds up, one long word is worth several short ones for the life it gives back.

If your bar gets low, stop hunting for the target and find any words you can until you are safe again. Running out of life ends your round, while the target will still be on the board in ten seconds.

There is a daily Word Hunt with the same board for everyone, so you can compare with friends, and a live multiplayer version where the first player to trace the target wins the round.`,
      },
    ],
    faq: [
      {
        question: 'How do I get better at Word Hunt?',
        answer: 'Scan the grid on a route instead of staring at one spot, hunt common endings like -ING, -ED, -ER and a final S, and when you find a word, check for longer versions of it before moving on. Most improvement comes from finding families of words around the ones you already have.',
      },
      {
        question: 'Can you go diagonally in Word Hunt?',
        answer: 'Yes. On a letter grid each tile connects to the tiles touching it in all 8 directions, including diagonals. You cannot use the same tile twice in one word.',
      },
      {
        question: 'Should I go for short words or long words?',
        answer: 'Both. Short words are fast and keep you moving, long words score much more. Many players clear easy short words first, then spend the rest of the round building long words from the endings they have spotted.',
      },
      {
        question: 'How is LexiClash Word Hunt different?',
        answer: 'It adds a hidden target word to the grid. Your life drains over time, board words heal you and reveal green, yellow and gray clue letters about the target, and you win by tracing the target before your life runs out. You can play it free in the browser, solo as a daily puzzle or live against other players.',
      },
    ],
    ctaText: 'Play Word Hunt',
    ctaLink: '/daily',
    backToGuides: 'Back to Guides',
  },
  he: {
    title: 'איך להשתפר בציד מילים: טיפים ללוח האותיות שבאמת עוזרים',
    subtitle: 'איך לסרוק לוח אותיות, לזהות משפחות של מילים ולהמשיך למצוא מילים ארוכות, ומה שונה בציד המילים של LexiClash.',
    category: 'אסטרטגיה',
    readTime: '7 דקות קריאה',
    authorName: 'Ohad Fisher',
    authorBio: 'אני בונה את LexiClash ומשחק במצבי הלוח שלו כל יום.',
    quickTips: [
      'חפשו סיומות קודם. ים, ות, ה ו-ת בסוף מילה הופכות מילה אחת לכמה: ספר וספרים, תלמיד ותלמידה.',
      'כל אות נוגעת בעד 8 שכנות, כולל באלכסון. קראו את הלוח לכל הכיוונים, לא רק מימין לשמאל.',
      'מצאתם מילה? לפני שממשיכים, בדקו אם אפשר להוסיף לה אות בהתחלה או בסוף.',
      'מילים קצרות נותנות נקודות מהירות ושומרות על הקצב. הניקוד הגדול נמצא במילים הארוכות.',
      'לאותיות פחות נפוצות כמו ז, ט ו-צ יש מעט שותפות. בדקו אותן פעם אחת ותמשיכו הלאה.',
      'סמנו בדיוק. החלקה שגויה עולה יותר זמן משנייה של מבט לפני שגוררים.',
      'בציד המילים של LexiClash מילת המטרה תמיד נמצאת על הלוח, והמילים שאתם מוצאים בדרך שומרות אתכם בחיים בזמן שאתם מחפשים אותה.',
    ],
    sections: [
      {
        title: 'שני משחקים שנקראים Word Hunt',
        content: `רוב מי שמחפש טיפים ל-Word Hunt מתכוון למשחק לוח האותיות עם השעון מחבילת GamePigeon ב-iMessage. גם בארץ קוראים לו פשוט Word Hunt: לוח קטן של אותיות, מעט זמן, ומחליקים על אותיות סמוכות כדי ליצור כמה שיותר מילים. מילה ארוכה יותר שווה יותר נקודות.

ב-LexiClash יש מצב משלו בשם ציד מילים, על אותו סוג של לוח, עם טוויסט. על הלוח מסתתרת מילת מטרה סודית. פס החיים שלכם יורד כל שנייה, וכל מילה שאתם מוצאים על הלוח מרפאת אתכם ומדליקה רמזים על מילת המטרה. סמנו את המטרה על הלוח לפני שהחיים נגמרים, והסיבוב שלכם.

הטיפים על הלוח מתאימים לשני המשחקים. שני החלקים האחרונים עוסקים בגרסה של LexiClash.`,
      },
      {
        title: 'לסרוק את הלוח בשיטה',
        content: `הטעות הכי נפוצה היא להיתקע על פינה אחת. העין ננעלת על מילה שכמעט רואים, השעון רץ, ושאר הלוח נשאר בלי שקראתם אותו.

תנו לעצמכם מסלול. התחילו מאות בפינה ובדקו לאן היא מתחברת: למעלה, למטה, לצדדים ולארבעת האלכסונים. אחר כך עברו לאות הבאה. לא תספיקו לבדוק כל אות בכל סיבוב, אבל מסלול מונע מכם לקרוא שוב ושוב את אותו אזור.

חפשו צירופים מוכרים לפני מילים שלמות. בעברית כדאי לחשוב בשורשים: אם ראיתם כ, ת ו-ב צמודות, נסו כתב, מכתב, כתבה וכתיבה, לפי מה שנמצא מסביב. אותו דבר עם ש-מ-ר (שמר, שומר, משמר) או ל-מ-ד (למד, מלמד, תלמיד).

האותיות א, ה, ו ו-י הן העוגנים. בעברית הן ממלאות הרבה פעמים את תפקיד התנועות, ואות כזאת באמצע הלוח נוגעת בהכי הרבה שכנות ובדרך כלל נמצאת בתוך הכי הרבה מילים. כשנתקעים, התחילו משם.`,
      },
      {
        title: 'להפוך מילה אחת למשפחה',
        content: `זה ההרגל שמוסיף הכי הרבה מילים לסיבוב. מצאתם מילה? אל תמשיכו עדיין. בדקו:

רבים ורבות. אם ים או ות נוגעות בסוף המילה, כנראה יש לכם עוד מילה: ספר וספרים, דלת ודלתות. שימו לב שלפעמים אות נופלת בדרך, כמו מילה שהופכת למילים.

זכר ונקבה. תלמיד ותלמידה, גנן וגננת. ה או ת שנוגעות בסוף המילה פותחות עוד מילה.

אותיות בהתחלה. הרבה שמות עצם נבנים מהשורש עם מ בהתחלה: גדל ומגדל, כתב ומכתב, חשב ומחשב. גם ה, ו, ב, ל ו-ש נפוצות מאוד בתחילת מילים, אז כדאי לבדוק מה נוגע באות הראשונה.

מילים בתוך המילה. מכתב מכיל את כתב, ותלמידה מכילה את תלמיד. כל אחת נחשבת בדרך כלל מילה בפני עצמה.

החלפות סביב גרעין משותף. ראיתם ור באיזו פינה? כל אות שנוגעת ב-ו היא מועמדת: אור, בור, דור, שור, תור.

בסיבוב עם שעון, מציאה אחת יכולה להפוך כך לארבע או חמש מילים, ואתם כבר יודעים איפה הן.`,
      },
      {
        title: 'מילים קצרות, מילים ארוכות והשעון',
        content: `במשחק לוח עם שעון אתם מאזנים בין שני דברים: כמה מילים מצאתם וכמה הן ארוכות.

מילים קצרות, של שלוש וארבע אותיות, נמצאות מהר. הן שומרות אתכם בתנועה ולא נותנות לכם לקפוא בתחילת הסיבוב. מילים ארוכות לוקח יותר זמן לראות, אבל הן שוות הרבה יותר, כך שמילה אחת של שש או שבע אותיות יכולה לנצח חופן של קצרות.

קצב שעובד להרבה שחקנים: קודם לנקות את המילים הקצרות הברורות כדי להתחמם, ואז להקדיש את שאר הזמן למילים ארוכות שנבנות על הסיומות והמשפחות שכבר זיהיתם. אם אתם מרגישים שאתם מחפשים מילים ארוכות ולא מוצאים כלום, חזרו לכמה שניות למילים קצרות כדי לאפס את הראש.

סמנו בדיוק. החלקה שנדחתה עולה לכם את הזמן שלקחה, ועוד את הזמן שלוקח למצוא שוב את המקום. אם אתם לא בטוחים שהאותיות נוגעות, הסתכלו שנייה לפני שגוררים.`,
      },
      {
        title: 'ציד מילים ב-LexiClash: למצוא את המילה הנסתרת',
        content: `בציד המילים של LexiClash אתם מחפשים מילה אחת מסוימת, והמשחק מראה לכם כמה אותיות יש בה. המטרה תמיד נמצאת איפשהו על הלוח, כך שאתם צדים ולא מנחשים בעיוורון.

הרמזים מגיעים מהמילים שאתם מוצאים. מילים מהלוח שיש להן אותיות משותפות עם המטרה מדליקות את תיבות הרמז למעלה: ירוק אומר שהאות במקום הנכון, צהוב אומר שהיא במילה אבל במקום אחר, ואפור אומר שהיא לא במילה. ככל שתמצאו יותר מילים, תראו יותר מהמטרה.

מילה שסימנתם באורך של המטרה נחשבת ניחוש. מילים קצרות יותר לא נחשבות ניחוש, אז הן דרך חינמית לאסוף רמזים וחיים.

ניחוש שגוי עולה לכם בחיים, אז כדאי לאסוף קודם כמה רמזים. כשיש לכם שתיים או שלוש אותיות ירוקות, חפשו על הלוח מסלול שיוצר מילה באורך הנכון עם האותיות האלה במקומות האלה. המטרה חייבת להיות מילה שאפשר לסמן על הלוח, וזה פוסל את רוב המילים שמתאימות לרמזים רק על הנייר.`,
      },
      {
        title: 'ציד מילים ב-LexiClash: להישאר בחיים',
        content: `פס החיים מתחיל מלא ויורד כל שנייה, וככל שהסיבוב נמשך הוא יורד מהר יותר. כל מילה שאתם מוצאים על הלוח מרפאת אתכם, ומילים ארוכות מרפאות יותר מקצרות.

זה משנה את המשחק לעומת לוח רגיל עם שעון. בתחילת הסיבוב, רצף מהיר של מילים קצרות שומר על הפס בזמן שתיבות הרמז מתמלאות. בהמשך, כשהירידה מואצת, מילה ארוכה אחת שווה כמה קצרות בזכות החיים שהיא מחזירה.

אם הפס נמוך, עזבו לרגע את המטרה ומצאו כל מילה שאפשר עד שאתם שוב בטוחים. כשהחיים נגמרים הסיבוב נגמר, והמטרה תחכה לכם על הלוח גם בעוד עשר שניות.

יש ציד מילים יומי עם אותו לוח לכולם, כדי שתוכלו להשוות עם חברים, וגרסה מרובת משתתפים בלייב שבה מי שמסמן ראשון את המטרה מנצח בסיבוב.`,
      },
    ],
    faq: [
      {
        question: 'איך משתפרים ב-Word Hunt?',
        answer: 'סרקו את הלוח במסלול במקום להיתקע על נקודה אחת, חפשו סיומות נפוצות כמו ים, ות ו-ה, וכשמצאתם מילה בדקו גרסאות ארוכות שלה לפני שממשיכים. רוב השיפור מגיע ממציאת משפחות של מילים סביב אלה שכבר מצאתם.',
      },
      {
        question: 'אפשר ללכת באלכסון ב-Word Hunt?',
        answer: 'כן. בלוח אותיות כל משבצת מתחברת למשבצות שנוגעות בה בכל 8 הכיוונים, כולל אלכסונים. אי אפשר להשתמש באותה משבצת פעמיים באותה מילה.',
      },
      {
        question: 'עדיף ללכת על מילים קצרות או ארוכות?',
        answer: 'גם וגם. מילים קצרות נמצאות מהר ושומרות על הקצב, ארוכות שוות הרבה יותר. הרבה שחקנים מנקים קודם את הקצרות הקלות, ואז מקדישים את שאר הסיבוב לבניית מילים ארוכות מהסיומות שזיהו.',
      },
      {
        question: 'מה שונה בציד המילים של LexiClash?',
        answer: 'יש בו מילת מטרה נסתרת על הלוח. החיים שלכם יורדים עם הזמן, מילים מהלוח מרפאות אתכם וחושפות רמזים בירוק, בצהוב ובאפור על המטרה, ומנצחים כשמסמנים את המטרה לפני שהחיים נגמרים. אפשר לשחק בחינם בדפדפן, לבד כפאזל יומי או בלייב מול שחקנים אחרים.',
      },
    ],
    ctaText: 'לשחק ציד מילים',
    ctaLink: '/daily',
    backToGuides: 'חזרה למדריכים',
  },
  sv: {
    title: 'Bli bättre på Word Hunt: tips för rutnätet som faktiskt hjälper',
    subtitle: 'Så läser du av ett bokstavsrutnät, hittar ordfamiljer och fortsätter hitta långa ord, och vad som är annorlunda i Ordjakt på LexiClash.',
    category: 'Strategi',
    readTime: '7 min läsning',
    authorName: 'Ohad Fisher',
    authorBio: 'Jag bygger LexiClash och spelar rutnätslägena i spelet varje dag.',
    quickTips: [
      'Leta efter ändelser först. -en, -et, -na, -ar, -or och -er gör ett ord till flera: bil, bilen, bilar, bilarna.',
      'Varje bricka har upp till 8 grannar, diagonalerna inräknade. Läs rutnätet åt alla håll, inte bara från vänster till höger.',
      'Hittat ett ord? Testa att sätta en bokstav före eller efter innan du går vidare.',
      'Korta ord ger snabba poäng och håller tempot uppe. De stora poängen finns i de långa orden.',
      'Ovanliga bokstäver som Q, W, X och Z har få partner. Kolla dem en gång och släpp dem sedan.',
      'Svep noggrant. Ett felsvep kostar mer tid än att titta en sekund innan du drar.',
      'I Ordjakt på LexiClash finns det dolda målordet alltid på brädet, och orden du hittar på vägen håller dig vid liv medan du letar.',
    ],
    sections: [
      {
        title: 'Två spel som heter Word Hunt',
        content: `De flesta som söker tips om Word Hunt menar det tidsbegränsade bokstavsspelet i GamePigeon-paketet i iMessage. Det heter Word Hunt även på svenska: ett litet rutnät med bokstäver, en kort klocka, och du sveper över bokstäver som ligger intill varandra för att bilda så många ord som möjligt. Längre ord ger mer poäng.

LexiClash har ett eget läge, Ordjakt, på samma sorts rutnät men med en twist. Ett hemligt målord är gömt på brädet. Din livmätare töms varje sekund, och varje ord du hittar på brädet ger dig liv tillbaka och tänder ledtrådsbokstäver om målordet. Svep målordet innan livet tar slut så vinner du rundan.

Tipsen om rutnätet nedan fungerar i båda spelen. De två sista avsnitten handlar om LexiClash-versionen.`,
      },
      {
        title: 'Läs av rutnätet med en metod',
        content: `Det vanligaste misstaget är att stirra på ett hörn. Blicken fastnar på ett ord du nästan ser, klockan tickar och resten av rutnätet blir aldrig läst.

Ge dig själv en rutt. Börja i en hörnbricka och se vad den hänger ihop med: uppåt, nedåt, åt sidorna och de fyra diagonalerna. Gå sedan vidare till nästa bricka. Du hinner inte kolla varje bricka varje runda, men med en rutt slipper du läsa samma hörna om och om igen.

Leta efter vanliga bokstavspar och bokstavsgrupper innan du letar efter hela ord. ST, SK, SP, TR, ER, EN, AR och OR finns överallt i svenskan. När du ser en av dem, försök bygga ut den åt båda hållen: ST kan bli STOR, STEN, BÄST eller REST, beroende på vad som ligger runt omkring.

Vokalerna är dina ankare, och i svenskan hör Å, Ä och Ö dit. En vokal mitt i rutnätet har flest grannar och sitter oftast i flest ord. Börja där när du kör fast.`,
      },
      {
        title: 'Gör ett ord till en familj',
        content: `Det här är vanan som ger flest extra ord per runda. När du hittar ett ord, gå inte vidare direkt. Kolla efter:

Bestämd form och plural. Svenska ord växer med ändelser. BIL blir BILEN, BILAR och BILARNA. HUS blir HUSET och HUSEN. FLICKA blir FLICKOR och FLICKORNA. Ligger rätt bokstäver intill slutet av ordet har du troligen ett ord till.

Bokstäver framför. ARM kan bli VARM eller LARM om rätt bokstav ligger intill A:et. ÖRA kan bli HÖRA eller KÖRA.

Sammansättningar. Svenskan bygger gärna ihop ord. Hittar du SOL, kolla om ROS ligger intill så att det blir SOLROS. Långa sammansättningar ryms sällan på ett litet bräde, men korta är värda att leta efter.

Ord inuti ordet. Om du drog STRAND passerade du också RAND och AND. Vart och ett räknas oftast för sig.

Byten kring en gemensam kärna. Ser du -AND i ett hörn är varje konsonant som ligger intill A:et en kandidat: BAND, HAND, LAND, SAND.

I en runda med klocka kan ett fynd bli fyra eller fem ord på det här sättet, och du vet redan var de ligger.`,
      },
      {
        title: 'Korta ord, långa ord och klockan',
        content: `I ett rutnätsspel med klocka väger du två saker mot varandra: hur många ord du hittar och hur långa de är.

Korta ord, med tre eller fyra bokstäver, går snabbt. De håller dig igång och gör att du inte låser dig i början av rundan. Långa ord tar längre tid att se men ger betydligt mer, så ett enda ord på sex eller sju bokstäver kan slå en handfull korta.

En rytm som funkar för många: ta de uppenbara korta orden först för att komma igång, och lägg sedan resten av tiden på långa ord som bygger på ändelserna och familjerna du redan har sett. Märker du att du jagar långa ord utan att något händer, gå tillbaka till korta ord i några sekunder för att komma ur det.

Svep exakt. Ett nekat svep kostar tiden det tog plus tiden det tar att hitta tillbaka. Är du osäker på om bokstäverna ligger intill varandra, titta en sekund innan du drar.`,
      },
      {
        title: 'Ordjakt på LexiClash: hitta det dolda ordet',
        content: `I Ordjakt letar du efter ett bestämt ord, och spelet visar hur långt det är. Målordet finns alltid någonstans på brädet, så du jagar det i stället för att gissa i blindo.

Ledtrådarna kommer från orden du hittar. Ord på brädet som har bokstäver gemensamma med målordet tänder ledtrådsrutorna högst upp: grönt betyder att bokstaven står på rätt plats, gult att den finns i ordet men på en annan plats, och grått att den inte finns i ordet. Ju fler ord du hittar, desto mer av målordet ser du.

Ett ord du drar som är lika långt som målordet räknas som en gissning. Kortare ord räknas inte som gissningar, så de är ett gratis sätt att samla ledtrådar och liv.

En felaktig gissning kostar liv, så samla några ledtrådar först. När du har två eller tre gröna bokstäver, leta på brädet efter en väg som stavar ett ord av rätt längd med de bokstäverna på de platserna. Målordet måste gå att dra på brädet, och det utesluter de flesta ord som passar ledtrådarna på papperet.`,
      },
      {
        title: 'Ordjakt på LexiClash: håll dig vid liv',
        content: `Livmätaren börjar full och töms varje sekund, och den töms snabbare ju längre rundan pågår. Varje ord du hittar på brädet ger dig liv tillbaka, och långa ord ger mer än korta.

Det ändrar hur du spelar jämfört med ett vanligt rutnät med klocka. Tidigt i rundan håller en jämn ström av korta ord mätaren på en säker nivå medan ledtrådsrutorna fylls i. Senare, när mätaren töms snabbare, är ett långt ord värt flera korta för livet det ger tillbaka.

Blir mätaren låg, sluta jaga målordet och ta alla ord du kan hitta tills du är säker igen. Tar livet slut är rundan över, medan målordet ligger kvar på brädet om tio sekunder också.

Det finns en daglig Ordjakt med samma bräde för alla, så att du kan jämföra med kompisar, och en version där ni spelar live mot varandra och den som först drar målordet vinner rundan.`,
      },
    ],
    faq: [
      {
        question: 'Hur blir man bättre på Word Hunt?',
        answer: 'Läs av rutnätet längs en rutt i stället för att stirra på ett ställe, leta efter vanliga ändelser som -en, -et, -ar och -na, och när du hittar ett ord, kolla efter längre varianter innan du går vidare. Det mesta av förbättringen kommer från att hitta ordfamiljer kring de ord du redan har.',
      },
      {
        question: 'Kan man gå diagonalt i Word Hunt?',
        answer: 'Ja. I ett bokstavsrutnät hänger varje bricka ihop med brickorna runt den i alla 8 riktningar, även diagonalt. Du kan inte använda samma bricka två gånger i ett ord.',
      },
      {
        question: 'Ska jag satsa på korta eller långa ord?',
        answer: 'Båda. Korta ord går snabbt och håller tempot uppe, långa ger mycket mer poäng. Många tar de lätta korta orden först och lägger resten av rundan på att bygga långa ord av ändelserna de har sett.',
      },
      {
        question: 'Vad är annorlunda i Ordjakt på LexiClash?',
        answer: 'Det finns ett dolt målord på brädet. Ditt liv töms med tiden, ord på brädet ger dig liv tillbaka och visar gröna, gula och grå ledtrådsbokstäver om målordet, och du vinner genom att dra målordet innan livet tar slut. Du kan spela gratis i webbläsaren, ensam som dagligt pussel eller live mot andra spelare.',
      },
    ],
    ctaText: 'Spela Ordjakt',
    ctaLink: '/daily',
    backToGuides: 'Tillbaka till guider',
  },
  ja: {
    title: 'Word Hunt上達のコツ：文字盤で本当に役立つ攻略法',
    subtitle: '文字盤の見方、単語の仲間の見つけ方、長い単語を探し続けるコツをまとめました。LexiClashのワードハントならではの違いも解説します。',
    category: '攻略',
    readTime: '7分で読めます',
    authorName: 'Ohad Fisher',
    authorBio: 'LexiClashを開発していて、文字盤のモードを毎日プレイしています。',
    quickTips: [
      '語尾から探しましょう。「い」で終わる形容詞や「る」で終わる動詞は、ひとつ見つかると仲間が続きます。',
      'どのマスも周りの最大8マスとつながっています。斜めも含めて、左から右だけでなく全方向に読みましょう。',
      '単語を見つけたら、次に行く前に、前か後ろに1文字足せないか試してみましょう。',
      '短い単語はすばやく点が取れて、リズムも保てます。大きな得点は長い単語にあります。',
      '「ぬ」「へ」のようにあまり使われないかなは、つながる相手も少なめです。一度確認したら、あとは気にしなくて大丈夫です。',
      'なぞるときは正確に。なぞり間違いは、なぞる前に1秒見るよりも多くの時間を失います。',
      'LexiClashのワードハントでは、隠された単語は必ず盤面のどこかにあります。探しているあいだも、盤面で見つけた単語がライフを支えてくれます。',
    ],
    sections: [
      {
        title: '「Word Hunt」という名前のゲームは2つある',
        content: `Word Huntのコツを検索する人の多くは、iMessageのGamePigeonに入っている、制限時間つきの文字盤ゲームのことを指しています。日本でもそのまま「Word Hunt」と呼ばれています。小さな文字盤と短い制限時間があり、隣り合う文字を指でなぞって、できるだけ多くの単語を作ります。長い単語ほど高得点です。

LexiClashにも同じような文字盤を使った独自の「ワードハント」モードがあり、日本語の盤面はひらがなです。ただし、ひとひねりあります。盤面には秘密の正解の単語が隠されています。ライフゲージは毎秒減っていき、盤面で単語を見つけるたびに回復して、正解についてのヒントの文字が点灯します。ライフが尽きる前に正解の単語をなぞれば、そのラウンドはあなたの勝ちです。

このあとの文字盤のコツは、どちらのゲームにも使えます。最後の2つのセクションはLexiClash版の話です。`,
      },
      {
        title: '決まった順番で盤面を見る',
        content: `いちばん多い失敗は、ひとつの角ばかり見つめてしまうことです。あと少しで見えそうな単語に目が釘付けになり、時間だけが過ぎて、盤面の残りは読まれないまま終わります。

自分なりの順路を決めましょう。角のマスから始めて、そのマスが上、下、左右、斜め4方向のどこにつながっているかを見ます。それから次のマスへ移ります。毎ラウンドすべてのマスを確認できるわけではありませんが、順路があれば同じ場所を何度も読み直さずにすみます。

単語全体より先に、よく出る文字の組み合わせを探しましょう。ひらがなの盤面では「か」「し」「た」「な」「い」「う」などがよく使われます。見つけたら、その前後に文字を足して広げてみます。たとえば「くら」があれば、周りの文字しだいで「さくら」や「くらし」になるかもしれません。

「い」「う」「ん」は多くの単語の途中や最後に出てくるので、盤面の真ん中にあれば、周りのたくさんのマスとつながって多くの単語に関わります。行き詰まったら、そこから始めてみましょう。`,
      },
      {
        title: '1つの単語を仲間に広げる',
        content: `1ラウンドで見つかる単語をいちばん増やしてくれるのがこの習慣です。単語を見つけても、すぐに次へ行かずに確認しましょう。

語尾。「あか」の隣に「い」があれば「あかい」、「はな」の隣に「し」があれば「はなし」になります。形容詞の「い」や動詞の「る」が最後の文字に接していれば、もう1語あるかもしれません。

前に足す文字。「かな」の前に「さ」があれば「さかな」、「なか」の前に「お」があれば「おなか」になります。

単語の中の単語。「さくら」をなぞったなら、「さく」と「くら」も通っています。たいていはそれぞれ1語として数えられます。

共通の部分を使った入れ替え。盤面のどこかに「かい」を見つけたら、「か」に接している文字はすべて候補です。「あかい」「たかい」「ちかい」「ふかい」のように広がります。

制限時間のあるラウンドでは、こうして1つの発見が4〜5語になることもあり、しかも場所はもうわかっています。`,
      },
      {
        title: '短い単語、長い単語、そして制限時間',
        content: `制限時間のある文字盤ゲームでは、見つける単語の数と長さのバランスを取ることになります。

短い単語はすぐに見つかります。手が止まらず、ラウンドの出だしで固まるのを防いでくれます。長い単語は見つけるのに時間がかかりますが、得点はずっと高いので、長い単語1つが短い単語いくつ分にもなることがあります。

多くのプレイヤーに合うのはこんなリズムです。最初は目につく短い単語を片づけて調子を上げ、残りの時間は、すでに見つけた語尾や仲間をもとに長い単語を探します。長い単語を探しているのに何も見つからないと感じたら、数秒だけ短い単語に戻って仕切り直しましょう。

正確になぞりましょう。認められなかったなぞりは、それにかかった時間に加えて、元の場所を探し直す時間も失います。文字がつながっているか自信がないときは、なぞる前に1秒だけ確認しましょう。`,
      },
      {
        title: 'LexiClashのワードハント：隠された単語を見つける',
        content: `LexiClashのワードハントでは、決まった1つの単語を探します。ゲームはその単語の文字数を教えてくれます。正解は必ず盤面のどこかにあるので、やみくもに当てるのではなく、探し出すゲームです。

ヒントは見つけた単語から得られます。正解と同じ文字を含む単語を盤面で見つけると、上にあるヒントのマスが点灯します。緑はその位置で合っている文字、黄色は単語に含まれているが位置が違う文字、灰色は単語に含まれていない文字です。単語を見つけるほど、正解が見えてきます。

正解と同じ文字数の単語をなぞると、それが1回の回答として扱われます。それより短い単語は回答の回数を使わないので、ヒントとライフを集めるのにコストのかからない手段です。

回答を間違えるとライフが減るので、まずはヒントをいくつか集めましょう。緑の文字が2つか3つそろったら、その文字がその位置に来る、正しい文字数の単語をなぞれる道筋を盤面で探します。正解は盤面でなぞれる単語でなければならないので、ヒントに合うだけの単語の多くはこれで外れます。`,
      },
      {
        title: 'LexiClashのワードハント：生き残るコツ',
        content: `ライフゲージは満タンから始まって毎秒減り、ラウンドが進むほど減るのが速くなります。盤面で単語を見つけると回復し、長い単語ほど多く回復します。

そのため、普通の制限時間つき文字盤とは戦い方が変わります。ラウンドの序盤は、短い単語をテンポよく見つけてゲージを保ちながら、ヒントのマスを埋めていきます。終盤、減りが速くなってきたら、長い単語1つで短い単語何個分ものライフが戻ってきます。

ゲージが少なくなったら、いったん正解探しをやめて、安全になるまで見つけられる単語をどんどん見つけましょう。ライフが尽きればラウンドは終わりですが、正解は10秒後も盤面に残っています。

毎日のワードハントは全員が同じ盤面なので、友だちと結果を比べられます。また、ほかのプレイヤーとリアルタイムで対戦するマルチプレイ版もあり、最初に正解をなぞった人がそのラウンドの勝者になります。`,
      },
    ],
    faq: [
      {
        question: 'Word Huntがうまくなるには？',
        answer: '1か所を見つめるのではなく順路を決めて盤面を見ること、よく使われる語尾を探すこと、そして単語を見つけたら次に行く前にもっと長い形がないか確かめることです。上達の多くは、すでに見つけた単語の周りで仲間を見つけることから生まれます。',
      },
      {
        question: 'Word Huntは斜めにつなげられますか？',
        answer: 'はい。文字盤では、各マスは接している周囲8方向すべてのマスとつながっていて、斜めも含まれます。1つの単語で同じマスを2回使うことはできません。',
      },
      {
        question: '短い単語と長い単語、どちらを狙うべき？',
        answer: '両方です。短い単語はすばやく見つかってリズムを保てますし、長い単語はずっと高得点です。多くのプレイヤーは、まず簡単な短い単語を片づけ、残りの時間で見つけた語尾をもとに長い単語を組み立てています。',
      },
      {
        question: 'LexiClashのワードハントは何が違うの？',
        answer: '盤面に正解の単語が隠されていることです。ライフは時間とともに減り、盤面の単語を見つけると回復して、正解について緑・黄・灰色のヒントの文字が表示されます。ライフが尽きる前に正解をなぞれば勝ちです。ブラウザで無料で遊べて、毎日のパズルとして1人で、またはほかのプレイヤーとリアルタイムで対戦できます。',
      },
    ],
    ctaText: 'ワードハントをプレイする',
    ctaLink: '/daily',
    backToGuides: 'ガイドに戻る',
  },
  es: {
    title: 'Cómo mejorar en Word Hunt: consejos para la cuadrícula que funcionan de verdad',
    subtitle: 'Cómo recorrer una cuadrícula de letras, detectar familias de palabras y seguir encontrando palabras largas, y qué cambia en Caza de palabras de LexiClash.',
    category: 'Estrategia',
    readTime: '7 min de lectura',
    authorName: 'Ohad Fisher',
    authorBio: 'Desarrollo LexiClash y juego a sus modos de cuadrícula todos los días.',
    quickTips: [
      'Busca primero las terminaciones. -S, -ES, -AR, -ER, -IR y -ANDO convierten una palabra en varias: CANTA, CANTAR, CANTANDO.',
      'Cada casilla toca hasta 8 vecinas, incluidas las diagonales. Lee la cuadrícula en todas las direcciones, no solo de izquierda a derecha.',
      '¿Encontraste una palabra? Antes de seguir, prueba a añadirle una letra delante o detrás.',
      'Las palabras cortas dan puntos rápidos y mantienen el ritmo. Las puntuaciones grandes están en las largas.',
      'Letras poco frecuentes como K, W y X tienen pocas compañeras. Revísalas una vez y olvídate de ellas.',
      'Traza con precisión. Un trazo fallido cuesta más tiempo que mirar un segundo antes de arrastrar.',
      'En Caza de palabras de LexiClash, la palabra objetivo siempre está en el tablero, y las palabras que encuentras por el camino te mantienen con vida mientras la buscas.',
    ],
    sections: [
      {
        title: 'Dos juegos llamados Word Hunt',
        content: `Casi todo el que busca consejos para Word Hunt se refiere al juego de cuadrícula con cronómetro del paquete GamePigeon de iMessage. En español también se le llama Word Hunt: una cuadrícula pequeña de letras, poco tiempo, y deslizas el dedo por letras que se tocan para formar todas las palabras que puedas. Las palabras más largas valen más puntos.

LexiClash tiene su propio modo, Caza de palabras, sobre el mismo tipo de cuadrícula y con un giro. En el tablero hay escondida una palabra objetivo secreta. Tu barra de vida baja cada segundo, y cada palabra que encuentras en el tablero te cura y enciende pistas sobre el objetivo. Si trazas el objetivo antes de quedarte sin vida, ganas la ronda.

Los consejos sobre la cuadrícula sirven para los dos juegos. Las dos últimas secciones tratan de la versión de LexiClash.`,
      },
      {
        title: 'Recorre la cuadrícula con un método',
        content: `El error más común es quedarse mirando una esquina. La vista se engancha en una palabra que casi ves, el reloj corre y el resto de la cuadrícula se queda sin leer.

Márcate un recorrido. Empieza por una casilla de una esquina y mira con qué conecta: arriba, abajo, a los lados y en las cuatro diagonales. Luego pasa a la siguiente. No vas a revisar todas las casillas en cada ronda, pero con un recorrido no vuelves a leer la misma zona una y otra vez.

Busca grupos de letras frecuentes antes que palabras enteras. En español aparecen por todas partes ES, EN, AR, ER, OS, AS, TR y PR. Cuando veas uno, intenta hacerlo crecer hacia los dos lados: AR puede convertirse en MAR, PARA, CARO o ARTE, según lo que tenga alrededor.

Las vocales son tus anclas. En español casi todas las palabras alternan vocales y consonantes, y una vocal en el centro de la cuadrícula tiene el mayor número de vecinas, así que suele estar dentro de muchas palabras. Empieza por ahí cuando te atasques.`,
      },
      {
        title: 'Convierte una palabra en una familia',
        content: `Este es el hábito que más palabras suma por ronda. Cuando encuentres una, no pases a otra todavía. Revisa:

Plurales. Si hay una S junto a la última letra, seguramente tienes otra palabra: CASA y CASAS. Si la palabra acaba en consonante, busca -ES: MAR y MARES, PAN y PANES.

Género y verbos. Muchas palabras cambian de -O a -A, como GATO y GATA o NIÑO y NIÑA. De CANTA pueden salir CANTAR, CANTO y CANTANDO si las letras están cerca. Cada vez que veas una raíz verbal, échale un vistazo a -AR, -ER, -IR y -ANDO.

Letras delante. ORO puede convertirse en LORO, TORO o CORO si la letra adecuada toca la O. RATO puede ser GRATO.

Palabras dentro de la palabra. Si trazaste SALTO, también pasaste por SAL y ALTO. Normalmente cada una cuenta por separado.

Cambios alrededor de un núcleo común. Si ves -ASA en una esquina, cualquier consonante que toque la A es candidata: CASA, MASA, PASA, TASA.

En una ronda con reloj, un hallazgo puede convertirse así en cuatro o cinco palabras, y ya sabes dónde están.`,
      },
      {
        title: 'Palabras cortas, palabras largas y el reloj',
        content: `En un juego de cuadrícula con tiempo estás equilibrando dos cosas: cuántas palabras encuentras y cuánto miden.

Las cortas, de tres y cuatro letras, salen rápido. Te mantienen en movimiento y evitan que te bloquees al empezar la ronda. Las largas cuesta más verlas, pero valen mucho más, así que una sola de seis o siete letras puede superar a un puñado de cortas.

Un ritmo que funciona a muchos jugadores: saca primero las palabras cortas evidentes para arrancar y dedica el resto del tiempo a buscar palabras largas a partir de las terminaciones y familias que ya has visto. Si notas que llevas un rato buscando largas sin sacar nada, vuelve a las cortas unos segundos para despejarte.

Traza con cuidado. Un trazo rechazado te cuesta el tiempo que tardaste, más el que tardas en volver a ubicarte. Si no estás seguro de que las letras se tocan, mira un segundo antes de arrastrar.`,
      },
      {
        title: 'Caza de palabras en LexiClash: encontrar la palabra oculta',
        content: `En Caza de palabras buscas una palabra concreta, y el juego te dice cuántas letras tiene. El objetivo siempre está en algún lugar del tablero, así que estás cazando, no adivinando a ciegas.

Las pistas salen de las palabras que encuentras. Las palabras del tablero que comparten letras con el objetivo encienden las casillas de pista de arriba: verde significa que la letra está en esa posición, amarillo que está en la palabra pero en otro sitio, y gris que no está en la palabra. Cuantas más palabras encuentres, más verás del objetivo.

Trazar una palabra con la misma longitud que el objetivo cuenta como un intento. Las palabras más cortas no gastan intentos, así que son una forma gratis de reunir pistas y vida.

Un intento fallido te cuesta vida, así que junta unas cuantas pistas primero. Cuando tengas dos o tres letras en verde, busca en el tablero un camino que forme una palabra de la longitud correcta con esas letras en esas posiciones. El objetivo tiene que poder trazarse en el tablero, y eso descarta la mayoría de las palabras que encajan con las pistas sobre el papel.`,
      },
      {
        title: 'Caza de palabras en LexiClash: seguir con vida',
        content: `Tu barra de vida empieza llena y baja cada segundo, y baja más rápido cuanto más avanza la ronda. Cada palabra que encuentras en el tablero te cura, y las largas curan más que las cortas.

Eso cambia tu forma de jugar respecto a una cuadrícula normal con reloj. Al principio de la ronda, una racha rápida de palabras cortas mantiene la barra a salvo mientras se van llenando las pistas. Más adelante, cuando la vida baja más deprisa, una palabra larga vale por varias cortas por la vida que te devuelve.

Si la barra está baja, deja de buscar el objetivo y encuentra cualquier palabra que puedas hasta estar a salvo. Si te quedas sin vida se acaba la ronda, y el objetivo seguirá en el tablero dentro de diez segundos.

Hay una Caza de palabras diaria con el mismo tablero para todos, para que puedas compararte con tus amigos, y una versión multijugador en vivo donde gana la ronda el primero que traza el objetivo.`,
      },
    ],
    faq: [
      {
        question: '¿Cómo mejorar en Word Hunt?',
        answer: 'Recorre la cuadrícula con un método en lugar de quedarte mirando un punto, busca terminaciones comunes como -S, -ES, -AR o -ANDO y, cuando encuentres una palabra, revisa sus versiones más largas antes de seguir. La mayor parte de la mejora viene de encontrar familias de palabras alrededor de las que ya tienes.',
      },
      {
        question: '¿Se puede ir en diagonal en Word Hunt?',
        answer: 'Sí. En una cuadrícula de letras cada casilla conecta con las que la tocan en las 8 direcciones, incluidas las diagonales. No puedes usar la misma casilla dos veces en una palabra.',
      },
      {
        question: '¿Conviene buscar palabras cortas o largas?',
        answer: 'Las dos. Las cortas son rápidas y mantienen el ritmo, las largas valen mucho más. Muchos jugadores sacan primero las cortas fáciles y dedican el resto de la ronda a construir palabras largas con las terminaciones que han visto.',
      },
      {
        question: '¿Qué tiene de distinto Caza de palabras de LexiClash?',
        answer: 'Añade una palabra objetivo oculta en el tablero. Tu vida baja con el tiempo, las palabras del tablero te curan y revelan letras de pista en verde, amarillo y gris sobre el objetivo, y ganas si trazas el objetivo antes de quedarte sin vida. Puedes jugar gratis en el navegador, en solitario como reto diario o en vivo contra otros jugadores.',
      },
    ],
    ctaText: 'Jugar a Caza de palabras',
    ctaLink: '/daily',
    backToGuides: 'Volver a guías',
  },
};
