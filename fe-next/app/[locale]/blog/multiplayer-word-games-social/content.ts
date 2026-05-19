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
  scrabbleAlternativeCta: string;
};

export const contentByLocale: Record<string, LocaleContent> = {
  en: {
    title: 'Why Playing Word Games With Friends Hits Different (The Science of Social Gaming)',
    subtitle: 'What happens in your brain when you add other humans to the mix, and why solo puzzling only gets you halfway there.',
    category: 'Social Science',
    readTime: '6 min read',
    authorName: 'Ohad Fisher',
    authorBio: 'Once made a stranger on a train play Boggle four stops past their destination. No regrets on either side.',
    sections: [
      {
        content: `I track my word game scores. Two years of data, split by solo vs. group play. The solo column is respectable. The group column is consistently 15-20% higher.

At first I figured it was pure ego. Then I found the real explanation: your brain literally switches to different software when other people show up. Actual different neural networks light up. The research on this is surprisingly clear, and once you know it, you can't unsee it.`,
      },
      {
        title: 'Your brain on solo vs. multiplayer',
        content: `Solo word games activate the expected regions: Broca's area (phonological processing), Wernicke's area (meaning retrieval), dorsolateral prefrontal cortex (working memory). Standard language circuits.

Add one other person and a whole second network activates. Redcay's 2010 fMRI study (Cerebral Cortex) compared solo tasks against interactive ones. The interactive condition lit up mentalizing regions—the temporoparietal junction, posterior superior temporal sulcus—significantly more. Your brain wasn't just searching for words. It was tracking what your opponent might find, reading their body language, strategizing in real time. You're multitasking at a level you never do solo.

And somehow it doesn't feel exhausting. The social brain network and reward system activate together. More cognitive load, more pleasure. Weird trade, but neurologically sound.`,
      },
      {
        title: 'Why rivalry makes you sharper',
        content: `Decety's group ran a 2004 study showing something wild: participants told they were competing against a human showed ramped-up activation in strategic planning and reward anticipation regions. Half the time, the "human" was actually an algorithm. Didn't matter. The brain doesn't care about truth. It cares about belief.

When you play against a bot, you're engaged. When you play against someone who will roast you if you lose, every neuron is hunting for long words. Festinger called this social comparison theory (1954): we evaluate ourselves relative to other people, not abstract standards. In a word game, every word your opponent finds recalibrates your internal "am I good enough?" meter.

The sweet spot is low-stakes competition. Bragging rights only. Too much pressure flips from motivation to anxiety, and anxious brains are bad at creative word-finding.`,
      },
      {
        title: 'The lockdown effect',
        content: `Words With Friends gained 40% more daily users in March 2020. Scrabble GO launched mid-pandemic and got downloaded millions of times.

Vuorre's 2021 study (Computers in Human Behavior) found that social gaming during lockdown was linked to better mental health—but only when it involved actual back-and-forth interaction. Playing asynchronously or just alongside someone didn't have the same effect. The communication was the active ingredient.

My college friends and I started weekly Boggle over Zoom that spring. We told ourselves it was about the game. It wasn't. It was about yelling at each other about whether obscure words count, then catching up on life while pretending we were still discussing the rules. Looking back at 2020, those Thursday nights are among the clearest memories I have—not because the games were good, but because the connection was.`,
      },
      {
        title: 'In-person changes how you think together',
        content: `Board game cafes went from under 1,000 worldwide in 2015 to over 5,000 by 2023. The appetite for in-person play didn't die. It got stronger.

I started hosting monthly word game nights. Snacks, timer, letter tiles, whoever shows up. No formal invitations. What surprises me is how different it feels from online. Online is fun, but in person, information flows that a screen can't transmit. Someone's knee bouncing because they're stuck. A raised eyebrow when your friend plays something unexpected.

Baltes's 2002 meta-analysis compared face-to-face groups against remote ones. Face-to-face won on coordination and creative problem-solving. The effect size was bigger than expected. Physical proximity doesn't just change how people feel about being together. It changes how they think together.`,
      },
      {
        title: 'Playful insults strengthen friendships',
        content: `The trash talk is half the point. Calling someone a "lexical fraud" for playing AT. Gasping theatrically when they find a seven-letter word. The mock outrage, the fake grudges.

Keltner's 2001 research on affiliative teasing showed that playful insults actually strengthen social bonds. They signal trust. You can only call someone a cheater if both of you know you don't mean it. In word games, trash talk turns a vocabulary exercise into a shared story. My friend group still references the Sarah Incident—a rules debate from three years ago that split the table. We bring it up at least monthly.

Every game night generates inside jokes, recurring bits, grudge matches. Couples and friend groups who do exciting things together report higher satisfaction. Word games check that box if you play them right.`,
      },
      {
        title: 'Why family game nights matter more than you think',
        content: `I played Scrabble with my parents every Sunday growing up. At twelve I thought it was boring. At thirty I realized it might've been one of the most important things they did for me.

Coyl-Shepherd and Newland's 2013 longitudinal study (Journal of Family Issues) tracked families over time. Those who played games together regularly had stronger cohesion, better parent-child communication, and higher satisfaction scores—even controlling for other family activities.

Word games don't require everyone at the same level. My niece started at seven, finding CAT and DOG while adults hunted longer words. She's eleven now, just beat two of them. No flashcards. She absorbed vocabulary by sitting at the table.

There's newer research on grandparent-grandchild gameplay. Both sides benefit. Grandparents get cognitive stimulation and social engagement—two of the strongest protective factors against cognitive decline. Kids get undivided attention and vocabulary immersion in a low-anxiety environment. A 2022 review (Educational Psychology Review) called it that: low-anxiety learning. Games create warmth that reduces performance anxiety. Kids retain new words better from play than drills.`,
      },
      {
        title: 'Start a game night',
        content: `Every study and every personal experience points the same direction. Word games are better with people. Solo, they activate language networks. With others, they activate reward systems, social brain networks, and strategic planning simultaneously. You play better. You feel more. You remember it longer. You end up closer to the people you played with.

I didn't set out to build a community around word games. It just happened. A group chat where we share daily scores. Monthly in-person nights. The occasional online tournament. These are now the people I see most often. The people I have the most inside jokes with.

Ray Oldenburg wrote about "third places"—social spaces that aren't home or work. Bars, barbershops, community centers. You show up regularly, the vibe is low-pressure, belonging happens gradually. A word game night is a third place. You don't have to be good. You don't have to know obscure words. You just have to show up.

So grab some friends. Open some snacks. Set a timer. The seven-letter word hits different when the whole room hears it.`,
      },
      {
        content: `Sources:
- Redcay, E., et al. (2010). "fMRI evidence of a neural modulation by social norm information." Cerebral Cortex.
- Decety, J., et al. (2004). "The functional architecture of the human brain for the conscious recognition of human beings." Brain Research.
- Festinger, L. (1954). "A theory of social comparison processes." Psychological Review.
- Vuorre, M., et al. (2021). "Social gaming during the COVID-19 pandemic." Computers in Human Behavior.
- Baltes, B.B., et al. (2002). "A meta-analysis of the effects of face-to-face vs. computer-mediated task groups." Group Dynamics.
- Coyl-Shepherd, A.N. & Newland, L.A. (2013). "Parental management of children's peer relationships." Journal of Family Issues.
- Keltner, D., et al. (2001). "The functional roles of laughter and humor." Evolution and Human Behavior.
- Educational Psychology Review (2022). "Low-anxiety learning environments in games-based education."`,
      },
    ],
    backToBlog: 'Back to Blog',
    tryDaily: 'Try Daily Challenge',
    practice: 'Play Multiplayer',
    scrabbleAlternativeCta: 'Free Multiplayer Word Game',
  },
  he: {
    title: 'משחקי מילים עם חברים זה סיפור אחר לגמרי (המדע מסביר)',
    subtitle: 'למה הציון שלך עולה 15-20% כשחברים צופים. (רמז: זה לא רק אגו.)',
    category: 'מדע חברתי',
    readTime: 'קריאה של 11 דקות',
    authorName: 'אוהד פישר',
    authorBio: 'כתב טבלת אקסל עם ציוני משחקי מילים. כן, יודע. אבל הנתונים לא שקרים.',
    sections: [
      {
        content: `טבלה. קיימת לי טבלה עם ציוני משחקי מילים משנתיים. עמודה אחת לשיחקתי לבד, עמודה שנייה לשיחקתי עם אנשים. העמודה של סולו? סביר. שגרתי. העמודה של קבוצתי? 15-20% גבוה יותר. תמיד.

בהתחלה חשבתי שזה פשוט אני מתאמץ יותר כשמישהו מסתכל. לא לגמרי שגוי. אבל ההסבר האמיתי הוא משהו אחר לגמרי.

בפעם האחרונה שיחקתי עם ארבעה חברים, שלוש שעות, חטיפים כל כמה דקות. בשלב מסוים מצאתי מילה של שבע אותיות. חבר אמר "אתה נורא." הרגע הזה, הציון הגבוה כשחברים שמעו - בכל כספי שלי הוא היה טוב יותר מכל ציון גבוה שהשגתי לבד.

ויש לזה הסבר. המוח מריץ קוד שונה לחלוטין כשיש אנשים בחדר. לא מטפורה. ממש רשתות עצביות אחרות. והמחקר על זה הרבה יותר ברור ממה שחשבתי. שינה לי את ההיבט על דבר שעשיתי כל הזמן בלי לחשוב.`,
      },
      {
        title: 'המוח בודד מול המוח בעקבות משנה',
        content: `משחק מילים לבד? נדלקות אזור ברוקה, אזור ורניקה, קורטקס פרה-פרונטלי. השגרה. עיבוד שפה, זיכרון עבודה. בדיוק מה שציפית.

שם אדם שני לשולחן, ורשת שלמה שונה מתעוררת. המדעים קוראים לה "מוח חברתי." הקורטקס הפרה-פרונטלי המדיאלי, קרני הצומת הטמפורו-פריאטלית - בעצם המערכות שהתאימו לעשות משהו אחד: להבין מה האדם השני חושב. לא רק את המילים שלו. את הכל.

בשנת 2010 הכניסו אנשים למכונת fMRI והשוו משימות לבד מול משימות עם חברה לשולחן. כשהיה חברה, התפעל מדליק "תיאוריית נפש" בצורה כבדה יותר. Cerebral Cortex, אם רוצים להעמיק.

מה זה אומר בחיים האמיתיים: לבד אני מחפש מילים. עם חברה אני מחפש מילים, מעקב אחרי מה שהיא עלולה למצוא, חזי תנועות שלה, וחוסה על עצמי שלא לגלות שאני צפוי. ריצה כפולה בו זמנית. זה לא כל יום שהמוח עושה את זה.

וזה לא מתיש. רשת המוח החברתי ומערכת התגמול נדלקות ביחד. עבודה קוגניטיבית כבדה יותר, הנאה יותר. עסקה מוזרה, לכן אני עם הזרם.`,
      },
      {
        title: 'יריבות כחושן',
        content: `מחקר מ-2004 של קבוצת Decety שלא הוצאתי מהראש. הם אמרו לאנשים כמה דברים שווקריים: "אתה מתחרה כנגד אדם" או "אתה מתחרה כנגד מחשב." בחלק מהמקרים ה"אדם" היה בכלל אלגוריתם. לא חשוב. מה שהאדם חשב היה אמיתי? הוא השתמש בתכנון קוגניטיבי ותוקף יותר. הלחץ של מישהו אמיתי, או האמונה בזה.

המוח לא אכפת לו מה זה. אכפת לו מה אתה מאמין.

וזה תאים. בוט? אני מחפש מילים. מישהו שבטוח יצחק עלי אם אני מפסיד? כל נוירון במוח שלי הופך לחוקר מילים ארוכות. זה הלחץ התחרותי. לא מילים על הלוח, לא טבלה של שיאים. הלחץ של משחק אמיתי.

Festinger קרא לזה "תיאוריית השוואה חברתית" ב-1954. אנחנו לא מעריכים עצמנו מול קו מטרה מופשט. מול אנשים. בכל מילה שהיריבה מוצאת, הגלומטר הפנימי שלך מדוד "מי אני בעצם?" קצר? למעלה. מובילה? לא לרפות.

יש גבול. יותר מדי לחץ זה מדיכאון. מוח מדוכא רע בזה לחפש מילים יצירתי. הנקודה הטובה: תחרות בשקלים נמוכים. זכויות לשנאות חברים. בגלל זה ערב משחקים במהלך שבוע טוב יותר מטורניר רשמי.`,
      },
      {
        title: 'כולם מרימים יד בו זמנית',
        content: `Jackbox השברתי. לפני Jackbox חשבתי משחקי מילים זה שקט, מוחי. Quiplash בחגיגה? סם לגמרי שונה.

מעצבים קוראים לזה "מרחב יצירה משותף" - אנשים הופכים רעיונות בו זמנית, זורמים אחד מהשני, ומה שיוצא מהקבוצה זה מקום שאחד אינו הגיע אליו לבד. אבל הערה חשובה: בחקר סיעור מוחות מהשנות 50, אנשים בודדים ייצרו יותר רעיונות מקבוצות. קבוצות יוצרות חיכוך - אנשים מרסנים את עצמם, מדברים זה על זה, מצנזרים.

אבל הרעיונות שכן יוצאים מקבוצה? מוזרים יותר. יצירתיים יותר. במיוחד עם פורמט נכון. משחקי מילים הם פורמט נכון. יש מבנה (מילה אמיתית), זמן (בלי overthink), ותגובה מיידית מהקהל ("רגע, זו מילה?").

זוכר בוגל מלפני שנתיים כשחברה מצאה מילה שאף אחד לא הכיר. חצי השולחן טוען לא. היא שלפה מילון. הויכוח זקוק יותר מהסיבוב. זה לא קורה בחצות עם הטלפון.`,
      },
      {
        title: 'בתקופת הסגר',
        content: `Words With Friends קיבל 40% יותר משתמשים ביומי במרץ 2020. Scrabble GO משוגר באמצע קורונה ויורד מיליוני פעמים. אנשים תקועים בבית צריכים דרך להיות קרובים בלי Happy Hour בזום.

Vuorre ועמיתים פרסמו בـ Computers in Human Behavior ב-2021 שגיימינג חברתי בסגר קשור להנאה מנטלית טובה יותר. אבל רק כשהיה ממשק אמיתי הלוך וחזור. לשחק ליד מישהו, או משחק אסינכרוני בלא צ'אט - לא אותו דבר. תקשורת הייתה המרכיב הפעיל.

אני יכול להעיד. אני וחברים מהאוניברסיטה התחלנו בוגל שבועי בזום באותו אביב. אמרנו לעצמנו שזה על המשחק. לא היה זה על המשחק. היה זה שעה של צריחות על מילים מפוקפקות, ועוד עשרים דקות על חיים כשהתיימנו שדיברנו על הכללים.

כשאני חוזר ל-2020, ערבי בוגל של יום חמישי הם מהזיכרונות הבהירים ביותר שיש לי. לא כי המשחקים היו טובים. כי ההתחברות הייתה. אפילו דרך מסך, אפילו עם צליל גרוע וחתול על המקלדת - זה עבד. משחקי מילים נתנו לנו תירוץ להופיע לזה בלי להגיד "אני בודד ואני צריך לראות את הפרצוף שלכם."`,
      },
      {
        title: 'אותו חדר, משחק חדש',
        content: `בתי משחקי לוח עברו מפחות מ-1,000 בעולם ל-5,000+ ב-2023. כוח המשחקים החברתיים. קורונה לא הרגה את הרעיון של משחק יחד פנים אל פנים. אם כל דבר זה עזב אותו.

אני מארח ערבי משחקי מילים מדי חודש. פשוט: חטיפים, טיימר, אותיות, מי שהגיע. בלא הזמנות רשמיות. בלא כללים מורכבים.

מה משמח אותי: כמה זה שונה מאונליין. אונליין זה כיף. אבל בחדר זה מידע שמסך לא יכול להעביר. הברך קופצת כי מישהו תקוע. זוקף דקה כשהלוח גרוע. גבה מורמת כשמישהו משחק משהו בלתי צפוי.

בשנת 2002 Baltes השוו קבוצות פנים-אל-פנים מול קבוצות מרחוק. פנים-אל-פנים ניצח בתיאום וברעיונות יצירתיים. לא מפתיע, אבל גודל ההשפעה היה גדול יותר ממה שחשבתי. קרבה פיזית משנה איך אנשים חושבים ביחד, לא רק איך הם מרגישים בקבוצה.`,
      },
      {
        title: 'האמנות של לקרוא לחברה "רמאית"',
        content: `אף אחד לא מדבר על זה אבל הטראש טוק הוא חצי מהעניין.

קריאה ל"רמאית לקסיקלית" כשהיא משחקת שתי נקודות. להרים גבה דרמטי כשהיא מוצאת שבע אותיות. זעם מזויף, חרטה משחקית, טינה שנגמרת כשהסיבוב הבא מתחיל.

יש לפסיכולוגים שם לזה: "התגרות שייכות אמיתית." Keltner פרסם ב-2001 שעלבונות משחקיים משפרים קשרים. הם מאותתים אמון. אתה יכול להגיד למישהו שהוא רמאי רק אם שניכם יודעים שלא בכל הלב. זה מבחן לחץ בזיווג שגם משעשע.

במשחקי מילים זה עושה משהו אחר. הוא הופך תרגיל אוצר מילים לסיפור. אנשים שלי עדיין מדברים על "אירוע שרה" מלפני שלוש שנים. היא שיחקה מילה שפיצלה את השולחן וויכוח של עשרים דקות על הכללים. אנחנו מעלים את זה כל חודש. בלי הויכוח הזה, הסיבוב הזה היה נשכח.

כל ערב משחקים מייצר חומר כזה. בדיחות פנימיות, קטעים קבועים, התרות קבועות. מחקר על טעם ביחד ויחסים אומרים שזה חשוב. זוגות וחברים שעושים דברים מעניינים ביחד מדווחים על שביעות רצון יותר. משחקי מילים עולים על שני הדברים. לוח חדש בכל פעם, זמן שומר אדרנלין, תחרות שמרגישה כמו משהו על הכף. אפילו כשהדבר היחיד על הכף הוא מי קונה חטיפים בפעם הבאה.`,
      },
      {
        title: 'סקראבל עם אבא ואמא',
        content: `סקראבל כל יום ראשון כשגדלתי. בגיל 12? משעמם. בגיל 30? אולי הדבר החשוב ביותר שהם עשו בשבילי.

Coyl-Shepherd וNewland עקבו אחרי משפחות ב-2013. משפחות ששיחקו משחקים יחד בקביעות? קשר חזק יותר, דברים בין הורים לילדים יותר טובים, שביעות רצון גבוה יותר. גם כשהם שלטו על דברים אחרים.

משחקי מילים בשפחה בעלת טריק: לא צריך שכולם טובים. האחיינית שלי התחילה בגיל שבע - מצאה חתול וכלב כשאני וחברים חיפשנו מילים ארוכות. עכשיו היא 11. בחודש שעבר היא ניצחה שניים מהבני נוער. בלא הוראה, בלא כרטיסיות. היא ספגה אוצר מילים מלשבת שם.

גם סבים וארנים יחד? שתי צדדים מרוויחים. סבים מקבלים גירוי קוגניטיבי ובריאות חברתית - שתיים מגורמי ההגנה החזקים ביותר נגד הישנות קוגניטיבית. נכדות מקבלות אוצר מילים מבוגר שלא מנסה לעשות מולטיטסקינג.

ב-2022 Educational Psychology Review קרא לזה "סביבת למידה עם חרדה נמוכה." משחקים יוצרים חום. חום מוריד חרדה. ילדות שוללות מילים יותר טוב ממשחק מאשר דרילים. הגיוני. אף אחד מעולם לא התוחך ממשחק בוגל עם סבתא.`,
      },
      {
        title: 'תתחילו ערב משחקים',
        content: `הכל שקראתי והכל שחוויתי מצביע לאותו כיוון. משחקי מילים עם אנשים זה טוב יותר. היתרונות הקוגניטיביים אמיתיים בכל מקרה. אבל הגרסה החברתית מוסיפה שכבות: אתה משחק יותר טוב, מרגיש יותר, זוכר יותר זמן, ויוצא קרוב יותר לאנשים ששיחקת איתם.

לא תכננתי קהילה סביב משחקי מילים. זה קרה. וואטסאפ עם ציונים יומיים. ערב חודשי. טורניר אונליין כשמישהו בטיול. אם מישהו היה אומר לי לפני חמש שנים "החוג הקבוע שלך יהיה חברי משחקי מילים," הייתי צוחק. אבל כך זה. האנשים האלה? אני רואה אותם הכי הרבה. הם בעלי הבדיחות הפנימיות הרבות ביותר שלי.

Ray Oldenburg כתב על "המקום השלישי" - מרחבים חברתיים שלא בית או עבודה. בר, מספרה, מרכז קהילתי. אתה בא בקביעות, האוויר רגוע, הזהות נבנית לאט. ערב משחקי מילים הוא מקום שלישי. לא צריך להיות טוב. לא צריך למצוא מילים נדירות. פשוט בוא.

אז קח חברים. פתח חטיפים. כוונן טיימר. תתווכח על כללים. ראה מה קורה כשמפסיקים להיות לבד.

שבע אותיות פוגעות אחרת כשכל החדר שומע.`,
      },
    ],
    backToBlog: 'חזרה לבלוג',
    tryDaily: 'נסו אתגר יומי',
    practice: 'שחקו מולטיפלייר',
    scrabbleAlternativeCta: 'משחק מילים בעברית רב-משתתפים',
  },
  sv: {
    title: 'Ordspel är bättre med folk. Forskningen förklarar varför det känns så.',
    subtitle: 'Om tävlingsinstinkt, skitsnack som bygger vänskap, och varför hjärnan vaknar till liv på ett sätt den aldrig gör när du sitter ensam med telefonen.',
    category: 'Samhällsvetenskap',
    readTime: '11 min läsning',
    authorName: 'Ordnörden',
    authorBio: 'Fick en gång en främling på pendeln att spela Boggle fyra stationer för långt. Ingen av oss ångrade det.',
    sections: [
      {
        content: `Jag för ett kalkylark över mina ordspelsresultat. Har gjort det i två år nu. Varje omgång taggad: solo eller med andra. Solokolumnen är okej. Hyfsad. Men kolumnen för gruppspel ligger konsekvent 15 till 20 procent högre.

Länge trodde jag att jag bara ansträngde mig mer när någon satt mittemot. Delvis sant. Men den riktiga förklaringen är konstigare än så.

Förra fredagen stod valet mellan att ligga i soffan med pussel eller att samla fyra kompisar, köpa chips och skrika åt varandra i tre timmar över ett bokstavsrutnät. Jag valde skrikandet. Någon gång under kvällen hittade jag ett sjubokstavsord och Erik kallade mig självgod, och den kombinationen av prestation plus social reaktion var, ja. Bättre än något poängrekord jag någonsin satt ensam.

Det visar sig att hjärnan kör annorlunda mjukvara när andra människor är i rummet. Inte bildligt talat. Faktiskt andra neurala nätverk. Forskningen är överraskande tydlig på den punkten och den förändrade hur jag ser på någonting jag gjort slentrianmässigt i åratal.`,
      },
      {
        title: 'Hjärnan solo, hjärnan med sällskap',
        content: `Ensam aktiverar ordspel ungefär det du förväntar dig. Brocas område. Wernickes område. Dorsolaterala prefrontala cortex. Språkprocessering, arbetsminne, de vanliga.

Lägg till en enda människa och ett helt nytt nätverk vaknar. Neuroforskare kallar det "det sociala hjärnnätverket", vilket låter högtravande men egentligen bara är mediala prefrontala cortex, temporoparietala knutpunkten och bakre övre temporala sulcus som gör det de utvecklades för: lista ut vad den andra personen tänker.

Redcay och kollegor stoppade in folk i en fMRI-maskin 2010 och jämförde solo mot interaktiva uppgifter. De interaktiva tände upp mentaliseringsregioner rejält mer. Publicerades i Cerebral Cortex om du vill kolla själv.

Rent praktiskt: när jag spelar ensam letar jag efter ord. När jag spelar mot Erik letar jag efter ord OCH hakar på vad han kan ha sett OCH justerar strategi utifrån hans kroppsspråk OCH försöker dölja att jag kört fast. Hjärnan kör dubbelskift.

Man skulle kunna tro att det är uttömmande. Tvärtom. Sociala nätverket och belöningssystemet aktiveras ihop. Mer kognitiv ansträngning, mer njutning. Konstig byteshandel, men jag tar den.`,
      },
      {
        title: 'Rivalitet gör dig smartare (till en viss gräns)',
        content: `Decetys forskargrupp publicerade någonting 2004 som jag tänker på ofta. De sa till vissa deltagare att de tävlade mot en människa, andra att det var en dator. Ibland var "människan" i själva verket en algoritm. Spelade ingen roll. De som trodde att en riktig person satt på andra sidan visade högre aktivering i områden för belöningsförväntan och strategisk planering.

Hjärnan bryr sig inte om sanningen. Den bryr sig om vad den tror.

Det stämmer. När jag spelar mot en bot är jag engagerad. Lagom. Men när jag spelar mot någon som garanterat kommer håna mig om jag förlorar? Då jobbar varje neuron jag har på att hitta långa ord. Tävlingstrycket gör något som inget poängmål eller topplista kan replikera.

Leon Festinger kallade det social jämförelseteori redan 1954. Vi bedömer oss själva i relation till andra, inte mot någon abstrakt standard. I ett ordspel kalibrerar varje ord motståndaren hittar din interna "är jag tillräckligt bra?"-mätare. Ligger du efter? Push harder. Ligger du före? Slappna inte av.

Fast det finns ett tak. För mycket press flippar omkopplaren från "motiverad" till "ångestfylld", och ångestfyllda hjärnor är urusla på kreativ ordsökning. Sweetspoten är låginsats-tävling. Skryträttigheter, inget mer. Därför känns en avslappnad spelkväll så mycket bättre än en turnering.`,
      },
      {
        title: 'När alla hittar på saker samtidigt',
        content: `Jackbox förstörde mig. Före Jackbox trodde jag att ordspel var en lugn, cerebral grej. Sen spelade jag Quiplash på en fest och insåg att ordlek inför publik är ett helt annat rus.

Speldesigners kallar det "delat kreativt utrymme." Flera människor som genererar idéer samtidigt, studsar av varandra, och slutresultatet hamnar någonstans dit ingen av dem hade kommit ensam. En brasklapp dock: Osborns brainstorming-forskning från 1950-talet visade att individer faktiskt producerar fler idéer solo än i grupp, för grupper har social friktion. Folk håller tillbaka, pratar över varandra, självcensurerar.

Men idéerna som faktiskt kommer ur grupper tenderar att vara märkligare och mer kreativa. Särskilt när formatet är rätt. Ordspel är rätt format. Du har struktur (måste vara ett riktigt ord), tidspress (ingen övertänkning), och direkt publikreaktion ("VÄNTA, är det där ett ORD?!").

Jag minns fortfarande en Boggle-runda för två år sen där min kompis hittade ZOEAE. Halva bordet påstod att det inte var ett ord. Hon drog upp ordboken. Det är plural av zoea, en kräftdjurslarv. Diskussionen varade längre än omgången. Det där är grejen med att spela med folk. Så där händer aldrig när du sitter med telefonen vid midnatt.

Spegelneuroner är en del av förklaringen. När någon reagerar på ditt ord med genuin chock speglar din hjärna den känslan och förstärker den ursprungliga glädjen. Det blir en feedbackloop. Bra ord, stor reaktion, större känsla, försök toppa det nästa runda.`,
      },
      {
        title: 'Så vad hände under pandemin då',
        content: `Words With Friends fick 40 procent fler dagliga användare i mars 2020. Scrabble GO lanserades mitt under covid och laddades ner miljontals gånger. Folk satt instängda och behövde ett sätt att känna samhörighet som inte krävde ännu en Zoom-AW.

Vuorre och kollegor publicerade en studie i Computers in Human Behavior 2021 som visade att socialt spelande under nedstängningen var kopplat till bättre psykisk hälsa. Men bara när det var faktisk interaktion fram och tillbaka. Att bara spela bredvid någon, eller asynkront utan att chatta, hade inte samma effekt. Kommunikationen var den aktiva ingrediensen.

Jag kan bekräfta det från egen erfarenhet. Jag och mina universitetskompisar startade en Boggle-kväll över Zoom den våren. Vi sa till oss själva att det handlade om spelet. Det handlade inte om spelet. Det handlade om att sitta en timme och skrika åt varandra om obskyra ord och sen tjugo minuter till och prata om livet medan vi låtsades att vi fortfarande diskuterade reglerna.

När jag tänker tillbaka på 2020 är de där torsdagskvällarna bland de tydligaste minnena jag har. Inte för att spelen var bra. För att kontakten var det. Även genom en skärm, med dåligt ljud och någons katt som gick över tangentbordet, funkade det. Ordspelen gav oss en ursäkt att dyka upp för varandra utan att behöva säga "jag är ensam och behöver se ditt ansikte."`,
      },
      {
        title: 'Samma rum, helt annan grej',
        content: `Brädspelscaféer gick från under 1 000 globalt 2015 till över 5 000 år 2023. Försäljningen av festspel har slagit alla andra brädspelskategorier sedan 2019. Aptiten för att spela ihop på riktigt dog inte under pandemin. Snarare blev folk hungrigare.

Jag började hålla ordspelskväll en gång i månaden efter nedstängningarna. Upplägget är löjligt enkelt. Snacks, en timer, bokstavsbrickor, och vem som än dyker upp. Inga formella inbjudningar. Inga krångliga regler. Bara kom och spela.

Det som fortsätter förvåna mig är hur annorlunda det känns mot våra onlinesessioner. Online är kul, men i samma rum finns information som en skärm inte kan överföra. Någons knä som studsar för att de kört fast. Den lilla utandningen när rutnätet är dåligt. Ett höjt ögonbryn över bordet när din kompis spelar något oväntat.

Baltes metaanalys från 2002 jämförde grupper som träffades fysiskt mot grupper som jobbade på distans. Fysiska grupper vann på koordination och kreativ problemlösning. Ingen överraskning kanske, men effektstorleken var större än jag väntade mig. Fysisk närhet förändrar hur folk tänker tillsammans, inte bara hur de känns om att vara tillsammans. När jag sitter mittemot någon fångar jag upp signaler jag aldrig skulle se genom en webbkamera, och de signalerna förändrar hur jag spelar.`,
      },
      {
        title: 'Att kalla sin kompis för ordbedragare är halva poängen',
        content: `Ingen pratar om det här men skitsnacket är halva grejen.

Att kalla någon "lexikal bedragare" när de spelar PÅ för två poäng. Att flåma teatraliskt när motståndaren hittar ett sjubokstavsord. Den fejkade ilskan, den spelade förtvivlan, agg som varar exakt tills nästa omgång börjar.

Psykologer har ett begrepp för det: affiliativ retsamhet. Keltners forskargrupp publicerade någonting om det 2001 som visade att lekfulla förnärmelser faktiskt stärker sociala band. De signalerar tillit. Du kan bara kalla någon fuskare om ni båda vet att du inte menar det. Det är ett relationstest som också fungerar som underhållning.

Men i ordspel gör skitsnacket något mer. Det förvandlar en ordförrådsövning till en berättelse. Min kompiskrets refererar fortfarande till Maja-incidenten. Tre år sen spelade hon QOPH (en hebreisk bokstav, tekniskt godkänt) och utlöste en tjugo minuter lång regeldebatt som klöv rummet. Vi tar upp det minst en gång i månaden. Utan bråket hade den omgången varit glömd nästa morgon.

Varje spelkväll producerar sådant material. Interna skämt, återkommande bits, revanschmatcher. Och forskningen om delade nya upplevelser och relationskvalitet säger att det här spelar roll. Par och vänkretsar som gör spännande saker ihop rapporterar högre tillfredsställelse. Ordspel checkar båda boxarna om man spelar dem rätt. Nytt rutnät varje gång, tidspress som håller adrenalinet uppe, och precis tillräckligt tävlingsspänning för att det ska kännas som att något står på spel. Även när det enda som står på spel är vem som köper snacks nästa gång.`,
      },
      {
        title: 'Scrabble med föräldrar var viktigare än du tror',
        content: `Jag spelade Scrabble med mina föräldrar varje söndagskväll under hela uppväxten. Vid tolv tyckte jag det var det tråkigaste som fanns. Vid trettio insåg jag att det kanske var en av de viktigaste sakerna de gjorde för mig.

En longitudinell studie av Coyl-Shepherd och Newland, publicerad i Journal of Family Issues 2013, följde familjer över tid. De som spelade spel ihop regelbundet hade starkare sammanhållning, bättre kommunikation mellan föräldrar och barn, och högre tillfredsställelse. Det höll även när de kontrollerade för andra familjeaktiviteter som gemensamma måltider eller delade hobbyer.

Ordspel har en specifik fördel för familjer: alla behöver inte vara på samma nivå. Min systerdotter började komma på spelkvällarna vid sju, hittade KAT och SOL medan de vuxna jagade längre ord. Hon är elva nu. Förra månaden slog hon två av de vuxna. Ingen formell undervisning, inga gloslappar. Hon absorberade ordförråd genom att sitta vid bordet.

Det finns nyare forskning om morföräldrar och barnbarn som spelar ihop som jag tycker är intressant. Båda sidor vinner. Morföräldern får kognitiv stimulans och social kontakt, som är två av de starkaste skyddsfaktorerna mot kognitivt förfall. Barnet får ordförråd och odelad uppmärksamhet från en vuxen som inte försöker multitaska.

En forskningsöversikt i Educational Psychology Review från 2022 kallade det "lågintensiv lärandemiljö." Spel skapar värme. Värme minskar prestationsångesten som gör inlärning svårare. Barn behåller nya ord bättre när de plockar upp dem under lek än när någon driller dem med flashcards. Vilket är logiskt. Ingen har någonsin blivit stressad av att spela Boggle med mormor.`,
      },
      {
        title: 'Starta en spelkväll. På riktigt.',
        content: `Allt jag läst och allt jag upplevt pekar åt samma håll. Ordspel är bättre med folk. De kognitiva fördelarna är verkliga hursomhelst, solo eller socialt. Men den sociala versionen lägger till lager som solo inte kan röra: du spelar bättre, du känner mer, du minns det längre, och du hamnar närmare de människor du spelade med.

Jag hade inte för avsikt att bygga en gemenskap kring ordspel. Det bara hände. En gruppchatt där vi delar dagliga resultat. En spelkväll i månaden. Någon onlineturnering när någon är bortrest. Hade du sagt till mig för fem år sen att min mest stabila umgängeskrets skulle vara "ordspelsvänner" hade jag skrattat. Men så är det. Det är de människorna jag träffar oftast. De jag har flest interna skämt med.

Sociologen Ray Oldenburg skrev om "tredje platser," sociala rum som varken är hemma eller jobbet. Barer, frisörer, möten. Platser dit du kommer regelbundet, stämningen är avslappnad, och tillit byggs gradvis. En ordspelskväll är en tredje plats. Du behöver inte vara bra. Du behöver inte kunna obskyra ord. Du behöver bara dyka upp.

Så. Samla några kompisar. Öppna chips. Ställ en timer. Bråka om huruvida QI räknas. (Det gör det. Det är den cirkulerande livskraften i kinesisk filosofi, och jag tar den striden med vem som helst.) Se vad som händer när du slutar pussla ensam och börjar pussla ihop.

Sjubokstavsordet träffar annorlunda när hela rummet hör det.`,
      },
    ],
    backToBlog: 'Tillbaka till bloggen',
    tryDaily: 'Prova daglig utmaning',
    practice: 'Spela multiplayer',
    scrabbleAlternativeCta: 'Spela Scrabble Online på Svenska',
  },
  ja: {
    title: '一人で解いてる場合じゃない：誰かと遊ぶとワードゲームの脳が変わる話',
    subtitle: 'スコアが上がる。記憶に残る。友達が増える。全部、科学的に説明がつく。',
    category: '社会科学',
    readTime: '11分',
    authorName: 'ワードオタク',
    authorBio: '電車で隣の人をボグルに巻き込み、降りる駅を4つ過ぎさせた前科あり。後悔はしていない。',
    sections: [
      {
        content: `2年分のワードゲームのスコアを記録している。我ながらどうかと思うけど、やめられない。

面白いのは、一人で遊んだ時と誰かと遊んだ時でスコアを分けて記録していること。一人の列はまあ普通。悪くない。でも誰かと遊んだ列は、一貫して15〜20%高い。

最初は「人に見られてるから頑張ってるだけでしょ」と思ってた。それも多少あるだろう。でも本当の理由はもっと変で、もっと面白い。

先週の金曜、友達4人を呼んでお菓子広げて3時間ぶっ通しで遊んだ。途中で7文字の単語を見つけた時、友達に「調子乗んな」と即座に言われて、そのやりとりだけで今まで出したどのハイスコアよりも気持ちよかった。

なぜか。人がいると脳のソフトウェアが切り替わるからだ。比喩じゃなく、実際に別の神経ネットワークが起動する。この研究結果を知ってから、何年もなんとなくやってたことの見え方が完全に変わった。`,
      },
      {
        title: '一人の脳、みんなの脳',
        content: `一人でワードゲームをやる時に動くのは、まあ予想通りの場所だ。ブローカ野。ウェルニッケ野。背外側前頭前皮質。言語処理と作業記憶。教科書的。

ところが相手が一人でも加わると、全然別の回路が目を覚ます。

神経科学では「社会脳ネットワーク」と呼ばれていて、内側前頭前皮質とか側頭頭頂接合部とか、要するに「相手が何考えてるか読む」ための装置一式が稼働し始める。2010年にRedcayたちがfMRIで一人作業と対人作業を比較した実験がある。対人条件では「心の理論」に関わる領域が明らかに強く反応していた。Cerebral Cortex掲載。

具体的に何が起きてるかというと、一人プレイ中は単語を探すだけ。対人プレイ中は単語を探しながら、相手が何を見つけそうか予測して、体の動きから状況を読んで、自分が詰まってることを悟られないようにしている。脳の仕事量は倍。

でも不思議と疲れない。社会脳と報酬系が同時に動くから、負荷が増えるほど快感も増えるという変な取引が成立している。`,
      },
      {
        title: '競争すると賢くなる（限度はあるけど）',
        content: `Decetyのグループが2004年にやった実験が面白い。被験者に「人間と対戦してます」と伝える場合と「コンピュータと対戦してます」と伝える場合を比較した。実際には相手がアルゴリズムの時もある。でも関係なかった。人間が相手だと信じた被験者は、報酬予測と戦略的計画に関わる領域が強く活性化した。

脳は真実に興味がない。信念に反応する。

これ、体感でもわかる。botが相手だと普通に集中できる。でも負けたら確実にいじられる友達が相手の時は、全神経が長い単語を探しに行く。リーダーボードやハイスコア目標では再現できない何かが、対人の競争圧にはある。

1954年にフェスティンガーが提唱した社会的比較理論がまさにこれで、人は抽象的な基準じゃなく他者との相対評価で自分を測る。ワードゲームなら、相手が見つけた単語一つ一つが「自分、大丈夫？」メーターを動かしてくる。

ただし、圧がかかりすぎると話が変わる。「やる気」が「不安」にひっくり返ると、創造的な単語探しがガタ落ちする。ちょうどいいのは、負けてもお菓子代を出すくらいの軽い賭け。だからカジュアルなゲーム会が一番楽しい。`,
      },
      {
        title: 'あの空間で起きていること',
        content: `Jackboxを初めてやった時、ワードゲームに対する認識が壊れた。それまで「静かに頭を使う遊び」だと思ってたのが、Quiplashをパーティーでやった瞬間、ライブの観客がいる言葉遊びは完全に別の薬だと気づいた。

ゲームデザインの用語で「共有創造空間」という概念がある。複数人が同時にアイデアを出すと、一人では到達できない場所にたどり着く、という話。ただこれ、実はちょっと注意が必要で、1950年代のオズボーンのブレスト研究では、個人の方がグループよりアイデアの数は多いという結果が出ている。集団だと遠慮したり、かぶったりするから。

でもグループから出てくるアイデアは、質的に変で面白いものが多い。特にフォーマットが合っている時。ワードゲームはまさにそのフォーマット。構造がある（実在する単語じゃないとダメ）、時間制限がある（考えすぎる暇がない）、観客の即時反応がある（「え、それ単語なの！？」）。

2年前のボグルで友達がZOEAEを出した時のことを今でも覚えてる。テーブルの半分が「そんな単語ない」と言い張って、友達が辞書を引いたらzoea（甲殻類の幼生）の複数形だった。その議論はラウンドより長く続いた。深夜に一人でスマホをいじってたら絶対に生まれない体験。

ミラーニューロンがこの仕組みの一端を担っている。自分の出した単語に誰かが本気で驚くと、脳がその感情を鏡写しにして元の快感を増幅する。フィードバックループが回り始めて、次のラウンドでもっとすごい単語を探したくなる。`,
      },
      {
        title: '2020年に起きたこと',
        content: `Words With Friendsの日次アクティブユーザーは2020年3月に40%増えた。Scrabble GOはパンデミックのど真ん中にリリースされて数百万ダウンロード。みんな家に閉じ込められて、Zoom飲み以外のつながり方を探してた。

ワードゲームがその受け皿になったのは偶然じゃない。

Vuorreたちが2021年にComputers in Human Behaviorに出した論文によると、ロックダウン中のソーシャルゲーミングはメンタルヘルスの改善と相関していた。ただし条件がある。実際にやりとりが発生している場合に限る。横で同時にプレイするだけとか、チャットなしの非同期対戦では効果がなかった。コミュニケーションそのものが有効成分だった。

正直に言うと、あの時期に大学の友達と始めた毎週のZoomボグルは、ゲームのためにやっていたわけじゃない。マイナーな単語が辞書に載ってるかで1時間揉めて、そのあと20分くらいルールの話をするフリをしながら近況報告をする。それが目的だった。

2020年を振り返ると、木曜夜のボグル会は一番はっきり残っている記憶の一つだ。ゲームの内容じゃなくて、あのつながりが良かったから。音声は途切れるし、誰かの猫がキーボードの上を歩くし、それでも成立してた。「寂しいから顔見せて」とは誰も言えなかったけど、ワードゲームがその言い訳になってくれた。`,
      },
      {
        title: '同じ部屋で遊ぶということ',
        content: `ボードゲームカフェは2015年に世界で1,000軒未満だったのが、2023年には5,000軒を超えた。パーティーゲームの売上は2019年からずっと他のカテゴリーを上回っている。対面で一緒に遊びたいという欲求は、パンデミックで消えるどころかむしろ強まった。

自分はロックダウン明けから月1のワードゲーム会をやっている。準備は簡単。お菓子、タイマー、文字タイル、あとは来る人。招待状なし。複雑なルールなし。来て、遊ぶ。

毎回驚くのは、オンラインと全然違うこと。画面越しでも楽しいけど、対面だと画面では伝わらない情報が流れてくる。詰まってる人の膝の揺れ。ハズレの盤面を見た時の小さなため息。予想外の単語を出した友達に向ける片眉。

Baltesたちが2002年に出したメタ分析では、対面グループとリモートグループを比較して、対面が協調性と創造的問題解決で勝っていた。想像はつくけど、効果量が思ったより大きかった。物理的に近くにいると、考え方自体が変わる。一緒にいる気分だけじゃなく、一緒に考える能力が変わる。`,
      },
      {
        title: '煽りの効用',
        content: `誰もあまり言わないけど、煽りがゲームの半分を占めている。

2文字の単語で2点を取った友達に「語彙力の詐欺師」と言い放つ。相手が7文字の単語を見つけた時に大げさに絶望する。嘘の怒り、芝居がかった悔しさ、次のラウンドが始まった瞬間に消える恨み。

心理学ではこれを「親和的からかい」と呼ぶ。Keltnerのグループが2001年に発表した研究で、遊び心のある悪口が社会的絆を強化することが示されている。信頼のシグナルだ。相手をインチキ呼ばわりできるのは、お互いに本気じゃないとわかっている時だけ。関係性のストレステストであり、同時にエンターテインメント。

ワードゲームだと、煽りにはもう一つ効果がある。語彙の練習をストーリーに変える。うちのグループには「サラ事件」と呼ばれる伝説がある。3年前にサラがQOPH（ヘブライ文字の名前。一応有効）を出して、部屋が真っ二つに割れる20分のルール論争が勃発した。月に一度は話題に上る。あの口論がなければ、あのラウンドは翌朝には忘れられていた。

毎回のゲーム会がこういう素材を生む。内輪ネタ、定番のいじり、因縁の対決。新しい体験を共有したカップルや友人グループは満足度が高いという研究結果があるけど、ワードゲームはその条件を見事に満たす。毎回違う盤面、時間制限のアドレナリン、何かがかかっている感じ。たとえ賭かっているのが「次のお菓子は誰が買うか」だけだとしても。`,
      },
      {
        title: '子供の頃の家族スクラブル、意外と大事だったかもしれない',
        content: `毎週日曜の夜に親とスクラブルをやっていた。12歳の時はこの世で一番退屈な時間だと思ってた。30歳になって、親がやってくれた中で最も重要なことの一つだったんじゃないかと気づいた。

Coyl-ShepherdとNewlandが2013年にJournal of Family Issuesに出した縦断研究がある。定期的にゲームをする家族は、結束が強く、親子のコミュニケーションが良く、満足度が高かった。食事を一緒にするとか他の活動の影響を除外しても、この結果は変わらなかった。

ワードゲームの家族向きなところは、全員が同じレベルじゃなくても成り立つこと。姪っ子は7歳からゲーム会に参加して、大人が長い単語を探す横で「ねこ」「いぬ」を見つけていた。今は11歳。先月、大人2人に勝った。教材もフラッシュカードも使ってない。ただテーブルに座って吸収しただけ。

祖父母と孫のゲーム研究も興味深い。祖父母側は認知的刺激と社会的関わりを得る。これは認知機能低下に対する最も強い防御因子のうちの二つだ。孫の側は語彙と、マルチタスクしていない大人からの集中した注目を得る。

2022年のEducational Psychology Reviewのレビューはこれを「低不安学習環境」と呼んでいた。ゲームは温かさを生む。温かさは学習を妨げるパフォーマンス不安を下げる。フラッシュカードで叩き込まれるより、遊びの中で拾った単語の方が定着する。まあそうだろう。おばあちゃんとのボグルでストレスを感じた人はいない。`,
      },
      {
        title: 'ゲーム会、やろう',
        content: `読んできた研究も、自分の体験も、全部同じ方向を向いている。ワードゲームは人と一緒の方がいい。認知的な効果はソロでもある。でも対人だと、プレイの質が上がり、感情が深くなり、記憶に残りやすくなり、一緒に遊んだ相手との距離が縮まる。ソロでは手が届かない層がいくつもある。

ワードゲームでコミュニティを作ろうと思ったわけじゃない。気づいたらそうなっていた。スコアを共有するグループチャット。月1の対面ゲーム会。誰かが出張中の時のオンライントーナメント。5年前に「一番よく会う友達がワードゲーム仲間になるよ」と言われたら笑っていたと思う。でもそうなった。一番内輪ネタが多い相手がこの人たちだ。

社会学者のレイ・オルデンバーグは「第三の場所」について書いた。家でも職場でもない社会的空間。バー、床屋、コミュニティセンター。定期的に顔を出して、空気がゆるくて、気づいたら居場所になっている場所。ワードゲーム会はまさにそれだ。上手くなくていい。マニアックな単語を知ってなくていい。ただ来ればいい。

だから。友達を誘って。お菓子を開けて。タイマーをセットして。「気」が有効かどうかで揉めて。（有効だ。中国哲学における生命エネルギーの循環のことで、文句がある人には全力で反論する。）一人で解いてた時間を、誰かと一緒に解く時間に変えてみてほしい。

7文字の単語、部屋中に聞こえた方が気持ちいいから。`,
      },
    ],
    backToBlog: 'ブログに戻る',
    tryDaily: 'デイリーチャレンジを試す',
    practice: 'マルチプレイヤーで遊ぶ',
    scrabbleAlternativeCta: '日本語ワードゲームをプレイ',
  },
  es: {
    title: 'Juegos de palabras con amigos: por que tu cerebro los necesita mas de lo que crees',
    subtitle: 'La neurociencia detras de gritar, competir y encontrar palabras imposibles cuando hay gente mirando.',
    category: 'Ciencia Social',
    readTime: '11 min de lectura',
    authorName: 'El Nerd de las Palabras',
    authorBio: 'Llevo una hoja de calculo con mis puntuaciones de los ultimos dos anos. Si, lo se. Pero los datos no mienten.',
    sections: [
      {
        content: `Tengo un dato raro. Llevo dos anos registrando mis puntuaciones en juegos de palabras, separadas por si jugue solo o con gente. La columna de "solo" es decente. Nada del otro mundo. La columna de "con amigos" es consistentemente un 15-20% mas alta.

Al principio pense que era puro ego. O sea, claro que te esfuerzas mas cuando alguien te esta mirando. Pero resulta que la explicacion real es bastante mas rara que "no quiero quedar mal delante de mis amigos."

El viernes pasado me pase tres horas jugando con cuatro amigos. Snacks por todas partes, gritos, risas. En un momento encontre una palabra de siete letras y mi amigo Carlos me dijo "eres insoportable." La verdad es que ese momento me dio mas satisfaccion que cualquier puntuacion alta que haya conseguido solo en mi vida. Y no es una metafora. Tu cerebro activa redes neuronales completamente diferentes cuando hay otras personas en la ecuacion. La ciencia sobre esto es bastante contundente, y me cambio la forma de ver algo que llevaba anos haciendo sin pensar.`,
      },
      {
        title: 'Lo que pasa en tu cerebro cuando dejas de jugar solo',
        content: `Las zonas que se activan jugando solo son las esperables. Area de Broca, area de Wernicke, corteza prefrontal dorsolateral. Procesamiento del lenguaje. Memoria de trabajo. Lo tipico.

Metes a una sola persona mas y se enciende una segunda red entera. Los neurocientificos la llaman "red del cerebro social", que suena grandilocuente pero basicamente es la corteza prefrontal medial, la union temporoparietal y el surco temporal superior posterior haciendo lo que evolucionaron para hacer: intentar adivinar que piensa el otro.

En 2010, el equipo de Redcay metio gente en una maquina de fMRI y comparo tareas en solitario con tareas interactivas. Las zonas de mentalizacion se activaron significativamente mas en la condicion social. Lo publicaron en Cerebral Cortex, por si quieres buscarlo.

En la practica esto significa que cuando juego solo, busco palabras. Cuando juego con Carlos enfrente, busco palabras Y vigilo que podria encontrar el Y ajusto mi estrategia segun su lenguaje corporal Y intento que no note que estoy atascado. Mi cerebro esta haciendo multitarea de una forma que nunca hace en solitario.

Pensarias que eso agota. Pues no. La red social y el sistema de recompensa se activan juntos. Mas esfuerzo cognitivo, mas placer. Un intercambio raro, pero lo acepto.`,
      },
      {
        title: 'Competir contra personas te hace mas listo (hasta cierto punto)',
        content: `Hay un estudio del grupo de Decety de 2004 que me viene a la cabeza constantemente. A unos participantes les dijeron que competian contra otra persona, a otros que contra un ordenador. A veces la "persona" era en realidad un algoritmo. Daba igual. Los que creian que habia un humano al otro lado mostraron mayor activacion en zonas de anticipacion de recompensa y planificacion estrategica.

Al cerebro le da igual la verdad. Le importa lo que crees.

Esto cuadra totalmente con mi experiencia. Contra un bot, bien. Estoy presente. Pero contra alguien que se que me va a vaciar si pierdo? Cada neurona que tengo se pone a buscar palabras largas. La presion competitiva hace algo que no puedes replicar con una tabla de clasificacion.

Leon Festinger llamo a esto teoria de la comparacion social alla por 1954. Nos evaluamos en relacion a otras personas, no en relacion a un estandar abstracto. En un juego de palabras, cada palabra que encuentra tu rival recalibra tu metro interno de "lo estoy haciendo bien o no." Vas detras? A apretar. Vas delante? Ni te relajes.

Eso si, hay un techo. Demasiada presion y pasas de "motivado" a "ansioso", y un cerebro ansioso es pesimo encontrando palabras creativas. El punto ideal es la competencia de bajo riesgo. Derechos a fardar y poco mas. Probablemente por eso una noche de juegos casual sienta tan bien comparada con un torneo.`,
      },
      {
        title: 'Cuando todo el mundo se pone creativo a la vez',
        content: `Jackbox me arruino. Antes de Jackbox pensaba que los juegos de palabras eran una actividad tranquila, cerebral. Luego jugue Quiplash en una fiesta y descubri que los juegos de palabras con publico en directo son una droga completamente distinta.

Los disenadores de juegos lo llaman "espacio creativo compartido." Varias personas generando ideas al mismo tiempo, rebotando unas contra otras, y el resultado del grupo acaba en un sitio donde ninguno habria llegado solo. Bueno, con un matiz. La investigacion de Osborn sobre brainstorming en los anos 50 encontro que los individuos producen mas ideas solos que en grupo, porque los grupos tienen friccion social. La gente se corta, se interrumpe, se autocensura.

Pero las ideas que SI salen de los grupos tienden a ser mas raras y creativas, sobre todo cuando el formato es el adecuado. Los juegos de palabras son el formato adecuado. Tienes estructura (tiene que ser una palabra real), presion de tiempo (no le des muchas vueltas), y reaccion inmediata del publico ("ESPERA, eso es una PALABRA?!").

Me acuerdo de una ronda hace un par de anos donde una amiga encontro ZOEAS. Media mesa dijo que no existia. Busco el diccionario. Es el plural de zoea, una larva de crustaceo. La discusion duro mas que la ronda. Ese tipo de experiencia no te la da jugar con el movil a las doce de la noche.

Las neuronas espejo tienen algo que ver con que esto funcione. Cuando ves a alguien reaccionar a tu palabra con sorpresa genuina, tu cerebro refleja esa emocion y amplifica el placer original. Se convierte en un bucle. Buena palabra, reaccion grande, sensacion mas grande, intentar superarla en la siguiente ronda.`,
      },
      {
        title: 'Lo que paso en 2020',
        content: `Words With Friends gano un 40% mas de usuarios diarios en marzo de 2020. Scrabble GO se lanzo en plena pandemia y acumulo millones de descargas. La gente estaba encerrada y necesitaba una forma de sentirse conectada que no requiriera otro "after" por Zoom.

Un trabajo de Vuorre y colegas publicado en Computers in Human Behavior en 2021 encontro que jugar videojuegos socialmente durante el confinamiento se asociaba con mejor salud mental. Pero solo cuando el juego implicaba interaccion real de ida y vuelta. Jugar al lado de alguien, o jugar de forma asincrona sin hablar, no tenia el mismo efecto. La comunicacion era el ingrediente activo.

Puedo confirmar esto desde mi experiencia. Mis amigos de la universidad y yo montamos una noche de Boggle semanal por Zoom esa primavera. Nos deciamos que era por el juego. No era por el juego. Era pasar una hora gritandonos sobre si tal palabra cuenta, y luego veinte minutos mas poniendose al dia de la vida mientras haciamos como que seguiamos discutiendo las reglas.

Cuando miro atras a 2020, esas noches de los jueves son de los recuerdos mas nitidos que tengo. No porque las partidas fueran buenas. Porque la conexion lo era. Incluso a traves de una pantalla, con audio malo y el gato de alguien caminando sobre el teclado, funcionaba. Los juegos de palabras nos daban una excusa para estar ahi los unos para los otros sin tener que decir "me siento solo y necesito verte."`,
      },
      {
        title: 'En la misma habitacion es otro juego',
        content: `Los cafes de juegos de mesa pasaron de menos de 1.000 en todo el mundo en 2015 a mas de 5.000 en 2023. Los juegos de fiesta llevan desde 2019 vendiendo mas que cualquier otra categoria de juegos de mesa. Hay un apetito claro por jugar juntos en persona que la pandemia no mato. Si acaso, dejo a la gente con mas ganas.

Yo empece a organizar una noche mensual de juegos de palabras cuando se acabaron los confinamientos. El montaje es ridiculo de simple. Snacks, un cronometro, fichas de letras y quien se apunte. Sin invitaciones formales. Sin reglas complicadas. Solo ven y juega.

Lo que me sigue sorprendiendo es lo diferente que se siente respecto a las sesiones online. Online mola, pero en persona hay informacion fluyendo que una pantalla no transmite. La rodilla de alguien rebotando porque esta atascado. Ese suspiro pequeno cuando la cuadricula es mala. Una ceja levantada al otro lado de la mesa cuando tu amigo juega algo inesperado.

Baltes y colegas hicieron un metaanalisis en 2002 comparando grupos presenciales con remotos. Presencial ganaba en coordinacion y resolucion creativa de problemas. No es ninguna sorpresa, pero el tamano del efecto era mayor de lo que esperaba. La proximidad fisica cambia como la gente piensa junta, no solo como se siente estando junta. Cuando estoy sentado enfrente de alguien, pillo senales que nunca notaria por una webcam, y esas senales cambian mi forma de jugar.`,
      },
      {
        title: 'El poder de llamar a tu amigo farsante lexico',
        content: `Nadie habla de esto pero el vacile es la mitad de la gracia.

Llamar a alguien "farsante lexico" cuando juega EN por dos puntos. La exclamacion teatral cuando tu rival encuentra una palabra de siete letras. La indignacion fingida, la devastacion de broma, los rencores que duran exactamente hasta que empieza la siguiente ronda.

Los psicologos tienen un termino para esto: burla afiliativa. El grupo de Keltner publico un trabajo en 2001 mostrando que los insultos juguetones en realidad refuerzan los lazos sociales. Son una senal de confianza. Solo puedes llamar a alguien tramposo si los dos sabeis que no lo dices en serio. Es un test de estres de la relacion que ademas funciona como entretenimiento.

Pero en los juegos de palabras, el vacile hace algo mas. Convierte un ejercicio de vocabulario en una historia. Mi grupo de amigos todavia habla del Incidente de Laura. Hace tres anos jugo QUOF (si, existe) y desato un debate de veinte minutos que dividio la mesa. Lo sacamos a relucir al menos una vez al mes. Sin la discusion, esa ronda se habria olvidado para la manana siguiente.

Cada noche de juegos genera este tipo de material. Chistes internos, bromas recurrentes, revancha pendientes. La investigacion sobre experiencias nuevas compartidas y calidad de las relaciones dice que esto importa. Parejas y grupos de amigos que hacen cosas emocionantes juntos reportan mayor satisfaccion. Los juegos de palabras cumplen ambos requisitos si juegas bien. Cuadricula nueva cada vez, la presion del tiempo manteniendo la adrenalina, y la tension competitiva justa para que sientas que algo esta en juego. Aunque lo unico en juego sea quien compra los snacks la proxima vez.`,
      },
      {
        title: 'Puede que el Scrabble con tus padres fuera mas importante de lo que piensas',
        content: `Jugaba Scrabble con mis padres todos los domingos por la noche. A los doce me parecia lo mas aburrido del universo. A los treinta me di cuenta de que probablemente fue una de las cosas mas importantes que hicieron por mi.

Un estudio longitudinal de Coyl-Shepherd y Newland, publicado en el Journal of Family Issues en 2013, siguio a familias durante anos. Las que jugaban juntas con regularidad tenian mejor cohesion, mejor comunicacion entre padres e hijos, y puntuaciones mas altas de satisfaccion. Y esto se mantenia incluso controlando otras actividades familiares como cenar juntos o aficiones compartidas.

Los juegos de palabras tienen una ventaja concreta para las familias: no necesitan que todos esten al mismo nivel. Mi sobrina empezo a venir a las noches de juegos con siete anos, encontrando SOL y PAN mientras los adultos buscaban palabras mas largas. Ahora tiene once. El mes pasado le gano a dos adultos. Sin clases formales, sin fichas de estudio. Simplemente absorbio vocabulario sentandose a la mesa.

Hay una linea de investigacion mas reciente sobre juegos entre abuelos y nietos que me parece interesante. Los dos salen ganando. El abuelo recibe estimulacion cognitiva y conexion social, que son dos de los factores protectores mas fuertes contra el deterioro cognitivo. El nino recibe exposicion a vocabulario y atencion exclusiva de un adulto que no esta intentando hacer tres cosas a la vez.

Una revision de 2022 en Educational Psychology Review llamo a esto "entorno de aprendizaje de baja ansiedad." Los juegos crean calidez. La calidez reduce la ansiedad de rendimiento que dificulta el aprendizaje. Los ninos retienen mejor las palabras nuevas cuando las aprenden jugando que cuando alguien se las machaca con fichas. Lo cual tiene todo el sentido del mundo. A nadie le ha dado estres jugando Boggle con la abuela.`,
      },
      {
        title: 'Monta una noche de juegos. En serio.',
        content: `Todo lo que he leido y todo lo que he vivido apunta en la misma direccion. Los juegos de palabras son mejores con gente. Los beneficios cognitivos son reales de cualquier forma, solo o en grupo. Pero la version social anade capas que la solitaria no puede tocar: juegas mejor, sientes mas, lo recuerdas mas tiempo, y terminas mas cerca de las personas con las que jugaste.

No me propuse crear una comunidad alrededor de los juegos de palabras. Simplemente paso. Un grupo de WhatsApp donde compartimos puntuaciones diarias. Una noche presencial al mes. Algun torneo online cuando alguien esta de viaje. Si me hubieran dicho hace cinco anos que mi circulo social mas constante iba a ser "los amigos de los juegos de palabras", me habria reido. Pero asi es. Son las personas que veo mas a menudo. Con las que tengo mas chistes internos.

El sociologo Ray Oldenburg escribio sobre los "terceros lugares", espacios sociales que no son ni casa ni trabajo. Bares, peluquerias, centros comunitarios. Sitios donde vas con regularidad, el ambiente es relajado, y la sensacion de pertenencia va llegando poco a poco. Una noche de juegos de palabras es un tercer lugar. No tienes que ser bueno. No tienes que conocer palabras raras. Solo tienes que aparecer.

Asi que nada. Junta a unos amigos. Abre algo para picar. Pon un cronometro. Discutid sobre si QI vale. (Vale. Es la fuerza vital circulante en la filosofia china, y le discuto a quien haga falta.) Mira que pasa cuando dejas de jugar solo y empiezas a jugar con gente.

La palabra de siete letras pega distinto cuando la oye toda la sala.`,
      },
    ],
    backToBlog: 'Volver al blog',
    tryDaily: 'Prueba el desafio diario',
    practice: 'Jugar multijugador',
    scrabbleAlternativeCta: 'Jugar Scrabble Online en Español',
  },
};
