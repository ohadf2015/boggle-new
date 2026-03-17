// Article content — "The Word Nerd" persona
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
    title: 'Playing Word Games in Hebrew: The Beautiful Chaos of Right-to-Left',
    subtitle: 'Root systems, missing vowels, and why designing a word game for Hebrew is like solving a puzzle inside a puzzle. A love letter to the most stubborn language I\'ve ever played in.',
    category: 'Language',
    readTime: '12 min read',
    authorName: 'The Word Nerd',
    authorBio: 'Multilingual word game obsessive who spent six months learning Hebrew roots just to be less terrible at Israeli Scrabble nights.',
    sections: [
      {
        content: `I'm going to let you in on a secret that Hebrew word game players already know: playing word games in Hebrew is a fundamentally different experience from playing in English. Not harder, not easier — different. Like, structurally different at the DNA level.

In English, you look at a grid of letters and your brain searches for familiar patterns. C-A-T, T-H-E, S-T-R. You scan left to right, top to bottom, and letter combinations jump out at you because you've seen them a million times.

In Hebrew, you look at a grid of letters and your brain has to do something much more interesting. It has to reconstruct words from consonant skeletons, mentally insert vowels that aren't there, deal with a right-to-left reading direction that flips your spatial processing, and — this is the wild part — recognize that three seemingly random letters might share a root that connects them to dozens of different words.

I fell in love with Hebrew word games about two years ago, when an Israeli friend invited me to a Scrabble night in Tel Aviv. I walked in knowing maybe 200 Hebrew words. I walked out four hours later having lost spectacularly, but understanding something real about how the Hebrew language works — something no textbook had ever made click.

This article is about that understanding. Whether you're a native Hebrew speaker curious about why your language is so unique for word games, a learner trying to level up, or a game designer wondering how to handle RTL languages, I think you'll find something here.

Here's what I've learned about the most beautiful linguistic chaos I've ever encountered.`,
      },
      {
        title: 'Why Hebrew Is Special for Word Games: The Shoresh System',
        content: `Every Hebrew word game player needs to understand one concept that has no real equivalent in English: the shoresh (שורש), or root system.

In English, words are mostly arbitrary sequences of letters. CAT doesn't relate to CATALOG except by coincidence. RUNNING relates to RUN, but the connection is through adding a suffix, not through a deeper structural system.

Hebrew is built entirely differently. Almost every word in the language derives from a three-letter root — the shoresh — that carries a core meaning. By inserting that root into different patterns (called mishkalim, or templates), you generate a family of related words.

Take the root כ-ת-ב (K-T-V), which relates to writing:

כָּתַב (katav) — he wrote
כּוֹתֵב (kotev) — writes / writer
כְּתִיבָה (ktiva) — writing (the act)
מִכְתָּב (mikhtav) — letter (correspondence)
כַּתָּב (katav) — reporter / journalist
כְּתוֹבֶת (ktovet) — address
הַכְתָּבָה (hakhtava) — dictation
תַּכְתִּיב (takhtiv) — dictate / format

Eight words, all from three letters. And that's not even the full list.

Now imagine you're playing a word game and you spot the letters כ, ת, and ב scattered across the grid. In English, seeing C, T, and B together doesn't trigger much. In Hebrew, your brain lights up: those three letters are a root. You know immediately that there's a family of words hiding in that combination. The question isn't IF there's a word — it's WHICH word you can form given the other letters available.

This is what makes Hebrew word games intellectually thrilling in a way that's hard to describe to non-Hebrew speakers. Every root you recognize is a key that unlocks multiple doors. The more roots you know, the more the grid transforms from random letters into a web of interconnected possibilities.

I once played a round where I found seven different words from a single three-letter root. My Israeli friend just nodded and said, "Now you're thinking in Hebrew." It was one of the best compliments I've ever received.`,
      },
      {
        title: 'No Vowels, No Problem (Well, Some Problems)',
        content: `Here's something that blows the minds of English speakers encountering Hebrew for the first time: written Hebrew mostly doesn't include vowels.

The letters you see on the page (or in a word game grid) are consonants. The vowels are implied. Native speakers just... know them. It's like reading "Cn y rd ths sntnc?" — except Hebrew speakers do it effortlessly because the language was designed this way from the ground up.

In formal or educational texts, you'll see tiny dots and dashes (nikkud) above and below the letters that indicate vowels. But in everyday Hebrew — newspapers, signs, text messages, and yes, word games — the nikkud is absent. You're reading consonant skeletons and your brain fills in the rest.

For word games, this creates a fascinating dynamic.

First, it means that the same sequence of consonants can sometimes represent different words depending on which vowels you insert. The letters ד-ב-ר (D-V-R) could be davar (thing), diber (spoke), dever (plague), or dvar (word of). Context usually disambiguates, but in a word game grid, there IS no context. So players need to know all the possible readings.

Second, it means the information density of Hebrew letters is higher than English letters. Each Hebrew letter carries more semantic weight because it's doing the job of a consonant AND implying possible vowel patterns. This makes Hebrew word games feel more... compressed. More concentrated. Every letter matters more.

Third — and this is where it gets tricky for game design — it means that validating words is more complex. In English, C-A-T is a word and C-T-A is not. Simple. In Hebrew, you need to check whether a consonant sequence, combined with any valid vowel pattern, produces a real word. The dictionary lookup is fundamentally more complex.

I've heard Hebrew Scrabble players describe this as "reading between the letters." You're not just seeing what's there — you're seeing what could be there. It's pattern recognition at a deeper level.

When I first started playing in Hebrew, I was terrible at this. I'd see three consonants and think, "Is that a word?" My Israeli friends would see the same three consonants and think, "That's at least four words." The gap between beginner and native is enormous, and most of it comes down to vowel intuition — the automatic, unconscious knowledge of which vowel patterns are valid.`,
      },
      {
        title: 'RTL: When Everything You Know About Layout Is Wrong',
        content: `Okay, let's talk about the elephant in the room — or rather, the elephant reading from the wrong side of the room.

Hebrew is written and read right-to-left (RTL). If you're a game designer or developer, that single fact creates a cascade of design challenges that are genuinely fascinating.

In an English word game, you scan the grid left to right, top to bottom. Your eyes naturally follow the reading direction of your language. Word patterns emerge along familiar axes.

In Hebrew, the primary scanning direction flips. But here's the thing — it doesn't just flip horizontally. The entire spatial cognitive framework shifts. Hebrew speakers process visual information differently in game contexts because their reading direction has trained their spatial attention.

Research from the University of Haifa (2018) found that Hebrew speakers show a rightward spatial attention bias, while English speakers show a leftward bias. This means Hebrew players literally look at a letter grid differently. They start from the right side. Their eyes move differently. The words they find first are different.

For game design, this has real implications:

UI elements need to flip. Navigation arrows, progress bars, shadow directions — everything that implies directionality needs to mirror. At LexiClash, we flip our hard shadows from right-cast (4px 4px) to left-cast (-4px 4px) in RTL mode. It sounds small, but players notice when it's wrong. It creates a subtle feeling of "something is off" that breaks immersion.

Score displays and timers need to respect reading direction. In English, you might put the timer on the left and score on the right. In Hebrew, that feels backwards.

Text input and word formation need special handling. When a Hebrew player builds a word letter by letter, the new letter should appear on the left side of the growing word, pushing existing letters right. Get this wrong and the word appears to form backwards, which is deeply disorienting.

Animations need to respect directionality. A word sliding in from the left feels natural in English. In Hebrew, it should slide in from the right. Same for transitions, reveals, and any motion that implies sequence or direction.

The hardest part? Bidirectional (BiDi) text. Hebrew text that includes English words, numbers, or abbreviations switches direction mid-line. The Unicode Bidirectional Algorithm handles this in plain text, but in a game UI with animations, transitions, and custom layouts, BiDi support requires careful, manual testing.

I've seen games that clearly tested only in English. You can always tell because the Hebrew feels like wearing a shirt inside out — technically functional, but clearly not right. The best Hebrew word games feel native from the first moment. The UI doesn't just work in RTL — it thinks in RTL.`,
      },
      {
        title: 'Hebrew Word Game Culture in Israel',
        content: `Israel has a word game culture that rivals any country I've visited, and it has a uniquely Israeli flavor.

Scrabble (or as it's known in Hebrew, שבץ נא — "Shvatz Na") has a dedicated following. There's something deeply satisfying about playing Scrabble in a language where the root system means that every rack of tiles contains hidden families of words waiting to be discovered.

But the culture goes beyond Scrabble. Hebrew crossword puzzles (תשבצים — "tashbetzim") are a national institution. Friday newspaper crosswords are a weekend ritual for many Israelis — so much so that there are crossword celebrities. Puzzle constructors like Dan Orion are genuine cultural figures.

Then there's the wordplay tradition. Hebrew is a language that loves puns and double meanings. The root system makes wordplay almost inevitable — when so many words share consonant patterns, double meanings are everywhere. Israeli humor relies heavily on this. Walk through Tel Aviv and you'll see shop names, restaurant names, and street art that play on Hebrew roots in clever ways.

Hebrew also has a unique relationship with word creation. Because Modern Hebrew was essentially revived and modernized in the late 19th and 20th centuries — largely through the work of Eliezer Ben-Yehuda and the Academy of the Hebrew Language — there's a tradition of intentional word creation that English doesn't have.

New Hebrew words are often constructed by fitting modern concepts into ancient root patterns. The word for "telephone" (טלפון, "telefon") is a direct loanword, but "computer" (מחשב, "makhshev") comes from the root ח-ש-ב (to think/calculate). "Electricity" (חשמל, "khashmal") was pulled from an obscure biblical word that originally referred to a mysterious gleaming substance in the Book of Ezekiel.

For word game players, this means Hebrew has layers. Ancient words coexist with modern coinages. Biblical Hebrew, Mishnaic Hebrew, and Modern Hebrew all contribute vocabulary. A single game might include a 3,000-year-old word from the Torah sitting next to a word that was invented in 2015 for a concept that didn't exist before smartphones.

This layered vocabulary makes Hebrew word games uniquely rich. You're not just playing with words — you're playing with linguistic archaeology.

I asked an Israeli competitive Scrabble player what makes Hebrew Scrabble special. She said: "In English, you memorize words. In Hebrew, you understand structures. Once you know the patterns, new words aren't surprises — they're predictions." That distinction captures something essential about the Hebrew word game experience.`,
      },
      {
        title: 'Tips for Hebrew Learners Playing Word Games',
        content: `If you're learning Hebrew and want to use word games as a study tool — which I highly recommend — here are the strategies that actually work, based on my own painful learning curve.

Learn roots, not words. This is the single most important tip. When you encounter a new Hebrew word, don't just memorize it in isolation. Look up its three-letter root. Then look up other words from the same root. Suddenly, instead of learning one word, you've learned five. In a word game, root knowledge is exponentially more valuable than vocabulary size because one root unlocks many words.

Start with high-frequency roots. There are about 500 roots that cover the vast majority of everyday Hebrew. Learn those before diving into obscure ones. Roots like כ-ת-ב (write), ל-מ-ד (learn), ד-ב-ר (speak), ש-מ-ע (hear), and ר-א-ה (see) will appear constantly in word games.

Play with nikkud turned on (if the game supports it). Some Hebrew word games offer a mode with vowel markings. Use this at first. It dramatically reduces the cognitive load because you don't have to guess which vowel pattern a consonant sequence uses. As you improve, turn nikkud off and challenge yourself to read without them.

Pay attention to mishkalim (word patterns). Hebrew words aren't random assemblies of root consonants. They follow specific templates. For example, the template מִ__ָ_ (mi_a_) often creates "place of" nouns: מִקְדָּשׁ (mikdash — temple, from ק-ד-ש, holy), מִסְפָּר (mispar — number, from ס-פ-ר, count). Recognizing these patterns helps you predict valid words even if you've never seen them before.

Don't be afraid of slang. Modern Hebrew is full of slang and informal words that are perfectly valid in word games. Words like סבבה (sababa — cool), יאללה (yalla — let's go), and חפיף (khafif — easy/casual) are real Hebrew words with real roots. Playing with native speakers will expose you to vocabulary that textbooks skip.

Use word games to practice reading speed. One of the hardest things about learning Hebrew is reading fluency — the ability to see a consonant sequence and instantly recognize the word. Word games force this. You can't spend 30 seconds sounding out each word when the timer is ticking. The time pressure is actually a feature, not a bug, because it trains automatic recognition.

Accept that you will lose. A lot. For a long time. Hebrew has a steeper word game learning curve than English because of the vowel system, the root system, and the richer morphology. But every game teaches you something, and the learning compounds. My scores in Hebrew word games have roughly tripled over two years. I still lose to native speakers, but the gap is shrinking.`,
      },
      {
        title: 'Hebrew Slang and Modern Words in Word Games',
        content: `One of the joys of Hebrew word games is encountering the wild, creative, sometimes hilarious world of modern Hebrew slang.

Hebrew slang is a beautiful mashup of influences. You'll find words borrowed from Arabic (יאללה — yalla, אחלה — akhla), English (קול — cool, literally spelled as "kol"), Russian (especially in older slang from 1990s immigration), and entirely homegrown creations that play with Hebrew's root system in clever ways.

Take the word פרייר (fraier/freier), which means a sucker or someone who lets others take advantage of them. It comes from German/Yiddish, and it's one of the most culturally loaded words in Israeli Hebrew. "Don't be a fraier" is practically a national motto. In a word game, it's a perfectly valid play — and it always gets a reaction from the table.

Or consider the word חבל על הזמן (khaval al hazman) — literally "a waste of time" but idiomatically meaning "amazing" or "incredible." This is the kind of semantic flip that makes Hebrew slang endlessly entertaining. The phrase shows up in word game contexts because players often use it to react to impressive plays: "That seven-letter word? Khaval al hazman!"

Modern Hebrew also constantly generates new words through its root system. The root ג-ל-ש (G-L-SH), which originally meant "to slide" or "to ski," now also means "to surf" — both ocean surfing and internet browsing. A גולש (golesh) is a surfer or a web browser. This kind of semantic extension means Hebrew speakers playing word games regularly encounter words where ancient roots have been repurposed for modern concepts.

Social media has accelerated Hebrew word creation. Hebrew speakers have coined words like לייקק (to "like" something, fitting English "like" into a Hebrew verb pattern), תיירג (to "tag" someone), and שיירר (to "share" content). These words follow proper Hebrew morphological rules — they've taken English concepts and dressed them in Hebrew grammatical clothing. Some purists hate them. Most word game players love them because they're additional valid plays.

The military contributes heavily to Hebrew slang as well, given that most Israelis serve in the IDF. Words like גרבי (garbi — useless/bad, from the word for sock), משופשף (meshupshaf — experienced/seasoned, literally "rubbed"), and סמנכ"ל (samankhal — deputy CEO, an acronym) all originated in military culture and migrated to general use.

For word game players, Hebrew slang never sits still, so the vocabulary keeps growing. New words become valid plays within years of their coinage. It keeps the game fresh in a way that more conservative languages don't experience.`,
      },
      {
        title: 'LexiClash\'s Hebrew Experience: Design Decisions',
        content: `I want to pull back the curtain on how word games handle Hebrew, because the design decisions are genuinely interesting — and they reveal a lot about the relationship between language and game design.

The first challenge is the dictionary. Which Hebrew words are "valid"? This sounds simple but it's deeply complex. Do you include biblical words that nobody uses in conversation? Talmudic Aramaic loan-words that have become part of Hebrew? Slang that's universally understood but technically not in the Academy's dictionary? Military abbreviations? Arabic-origin words?

Most Hebrew word games use a curated word list that balances inclusivity with authenticity. The goal is: if a Hebrew speaker would recognize it as a real word, it should be valid. This is a wider net than a strict dictionary definition, but it produces better gameplay.

The second challenge is letter frequency. In English Scrabble, tile distribution roughly matches English letter frequency — lots of E's and S's, few Z's and Q's. Hebrew letter frequency is different. The letters ה (he), ו (vav), י (yod), and ל (lamed) are extremely common because they serve both as consonants and as parts of the grammatical framework. ו in particular appears at the beginning of nearly half of all Hebrew words because it means "and."

Getting letter distribution right is critical for Hebrew word games. Too many rare letters and players can't form words. Too many common letters and every round feels the same. The sweet spot requires testing with native speakers and analyzing real Hebrew text corpora.

The third challenge is the one I've been dancing around this whole article: right-to-left everything. In LexiClash, switching to Hebrew doesn't just flip the text. It flips the entire cognitive frame. Shadows reverse. Animations mirror. The grid is scanned from a different starting point. Player feedback appears on the opposite side. Even the "feel" of swiping to form words changes because you're moving in the opposite direction.

Getting this right required extensive testing with Hebrew-speaking players. We learned that even small directional inconsistencies — a shadow that falls the wrong way, a progress bar that fills from the wrong side — create cognitive friction that degrades the experience. Hebrew players might not consciously notice these details, but they feel them.

The result, when it works, is something I'm genuinely proud of: a word game that feels native in Hebrew. Not translated. Not adapted. Native. The grid feels right. The words flow naturally. The UI thinks in RTL. And when you find a seven-letter word built from a three-consonant root, with vowels your brain supplied automatically, reading right-to-left across a grid that shadows left — that's an experience that only Hebrew can offer.`,
      },
      {
        title: 'Why I Keep Coming Back to Hebrew Word Games',
        content: `I started learning Hebrew because of a friend. I kept learning because of word games. That's not a joke — it's literally what happened.

The shoresh system transformed my understanding of how languages can work. The vowel-less reading trained a kind of pattern recognition I didn't know I was capable of. The RTL shift made me aware of spatial biases I never knew I had. And the culture — the Friday crosswords, the Scrabble nights, the puns that only work if you know the roots — gave me a window into Israeli life that no guidebook could.

Hebrew word games are harder than English ones. I won't pretend otherwise. The learning curve is steeper, the cognitive demands are higher, and native speakers have an enormous advantage because they've been reading vowel-less consonant skeletons since childhood.

But they're also richer. More layered. More rewarding when things click. Finding a word in Hebrew feels like excavating something — uncovering a root, recognizing a pattern, reconstructing a word that existed in some form three thousand years ago and still works today.

If you've never tried playing a word game in Hebrew, I encourage you to start. You'll be terrible at first. That's okay. Everyone is. But somewhere between your first three-letter word and your first root-based revelation, you'll understand what I mean when I say: Hebrew word games aren't just games. They're a different way of seeing language itself.

And if you're a native Hebrew speaker who's been nodding along to this entire article thinking "yeah, obviously" — thank you for your patience. Now teach me the root for "gratitude." I know it starts with ת.`,
      },
      {
        content: `Sources:
- Shimron, J. (2006). "Reading Hebrew: The Language and the Psychology of Reading It." Lawrence Erlbaum.
- University of Haifa (2018). Spatial attention bias in RTL vs LTL readers.
- Ravid, D. (2012). "Spelling Morphology: The Psycholinguistics of Hebrew Spelling." Springer.
- Schwarzwald, O. (2001). "Modern Hebrew." Languages of the World/Materials. Lincom Europa.
- Even-Shoshan, A. "The New Dictionary" — standard Hebrew dictionary reference.
- Ben-Yehuda Project — comprehensive online Hebrew dictionary and historical corpus.
- Academy of the Hebrew Language — official Hebrew word adoption and standardization body.
- Bolozky, S. (1997). "Israeli Hebrew Phonology." In Phonologies of Asia and Africa. Eisenbrauns.`,
      },
    ],
    backToBlog: 'Back to Blog',
    tryDaily: 'Daily Challenge',
    practice: 'Practice',
  },
  he: {
    title: 'לשחק משחקי מילים בעברית: הכאוס היפה של ימין-לשמאל',
    subtitle: 'שורשים, ניקוד חסר, ולמה לעצב משחק מילים לעברית זה כמו לפתור חידה בתוך חידה. מכתב אהבה לשפה הכי עקשנית שאי פעם שיחקתי בה.',
    category: 'שפה',
    readTime: 'זמן קריאה: 12 דקות',
    authorName: 'The Word Nerd',
    authorBio: 'אובססיבית רב-לשונית של משחקי מילים שבילתה שישה חודשים בלימוד שורשים עבריים רק כדי להיות פחות גרועה בערבי סקרבל ישראליים.',
    sections: [
      {
        content: `אני הולכת לחשוף בפניכם סוד שכל שחקני משחקי מילים בעברית כבר יודעים: לשחק משחקי מילים בעברית זו חוויה שונה מהותית מלשחק באנגלית. לא יותר קשה, לא יותר קל — שונה. כמו, שונה מבחינה מבנית ברמת ה-DNA.

באנגלית, מסתכלים על לוח של אותיות והמוח מחפש דפוסים מוכרים. C-A-T, T-H-E. סורקים משמאל לימין, מלמעלה למטה, וצירופי אותיות קופצים לעיניים כי ראיתם אותם מיליון פעמים.

בעברית, מסתכלים על לוח של אותיות והמוח צריך לעשות משהו הרבה יותר מעניין. הוא צריך לשחזר מילים משלדי עיצורים, להכניס מנטלית תנועות שלא נמצאות שם, לנווט כיוון קריאה מימין לשמאל שמהפך את העיבוד המרחבי שלכם, ו — וזה החלק המטורף — לזהות ששלוש אותיות שנראות אקראיות עשויות לחלוק שורש שמחבר אותן לעשרות מילים שונות.

התאהבתי במשחקי מילים בעברית לפני בערך שנתיים, כשחברה ישראלית הזמינה אותי לערב סקרבל בתל אביב. נכנסתי כשאני יודעת אולי 200 מילים בעברית. יצאתי ארבע שעות אחר כך אחרי שהפסדתי באופן מרהיב, אבל עם הבנה עמוקה של איך השפה העברית עובדת — משהו ששום ספר לימוד אף פעם לא הצליח להעביר.`,
      },
      {
        title: 'למה עברית מיוחדת למשחקי מילים: מערכת השורשים',
        content: `כל שחקן משחקי מילים בעברית צריך להבין מושג אחד שאין לו מקבילה אמיתית באנגלית: השורש.

באנגלית, מילים הן בעיקר רצפים שרירותיים של אותיות. CAT לא קשורה ל-CATALOG אלא במקרה. בעברית, כמעט כל מילה בשפה נגזרת משורש תלת-אותי שנושא משמעות ליבה.

קחו את השורש כ-ת-ב, שקשור לכתיבה: כָּתַב, כּוֹתֵב, כְּתִיבָה, מִכְתָּב, כַּתָּב, כְּתוֹבֶת, הַכְתָּבָה, תַּכְתִּיב. שמונה מילים, כולן משלוש אותיות.

עכשיו דמיינו שאתם משחקים ואתם רואים את האותיות כ, ת, ו-ב מפוזרות על הלוח. המוח שלכם נדלק: שלוש האותיות האלה הן שורש. אתם יודעים מיד שיש משפחה של מילים מתחבאת בצירוף הזה. השאלה היא לא אם יש מילה — השאלה היא איזו מילה אפשר ליצור עם שאר האותיות הזמינות.

זה מה שהופך משחקי מילים בעברית למרגשים אינטלקטואלית בצורה שקשה לתאר. כל שורש שאתם מזהים הוא מפתח שפותח דלתות רבות.

פעם שיחקתי סיבוב שבו מצאתי שבע מילים שונות משורש תלת-אותי אחד. החברה הישראלית שלי רק הנהנה ואמרה, "עכשיו את חושבת בעברית." זו אחת המחמאות הכי טובות שקיבלתי.`,
      },
      {
        title: 'בלי ניקוד, בלי בעיה (טוב, עם קצת בעיות)',
        content: `הנה משהו שמפוצץ את הראש של דוברי אנגלית שפוגשים עברית בפעם הראשונה: עברית כתובה בדרך כלל לא כוללת תנועות.

האותיות על הדף (או בלוח משחק מילים) הן עיצורים. התנועות מרומזות. דוברי השפה פשוט... יודעים אותן. זה כמו לקרוא "הל אתם יכלם לקרא את ז?" — רק שדוברי עברית עושים את זה בקלות כי השפה תוכננה ככה מהיסוד.

למשחקי מילים, זה יוצר דינמיקה מרתקת. אותו רצף של עיצורים יכול לפעמים לייצג מילים שונות בהתאם לאיזה תנועות מכניסים. האותיות ד-ב-ר יכולות להיות דָּבָר, דִּבֵּר, דֶּבֶר, או דְּבַר. בלוח משחק אין הקשר. אז שחקנים צריכים להכיר את כל הקריאות האפשריות.

צפיפות המידע של אותיות עבריות גבוהה יותר מאותיות אנגליות. כל אות עברית נושאת יותר משקל סמנטי כי היא עושה את העבודה של עיצור וגם מרמזת על דפוסי תנועות אפשריים.

שמעתי שחקני סקרבל עבריים מתארים את זה כ"קריאה בין האותיות." אתם לא רק רואים מה יש שם — אתם רואים מה יכול להיות שם.`,
      },
      {
        title: 'RTL: כשכל מה שידעתם על עיצוב מתהפך',
        content: `עברית נכתבת ונקראת מימין לשמאל. אם אתם מעצבים או מפתחים, העובדה הבודדת הזו יוצרת מפל של אתגרי עיצוב.

במשחק מילים באנגלית, סורקים את הלוח משמאל לימין, מלמעלה למטה. בעברית, כיוון הסריקה הראשי מתהפך. אבל זה לא רק מתהפך אופקית. כל המסגרת הקוגניטיבית המרחבית זזה.

מחקר מאוניברסיטת חיפה (2018) מצא שדוברי עברית מראים הטיית קשב מרחבית ימינה, בעוד דוברי אנגלית מראים הטיה שמאלה. שחקנים עבריים ממש מסתכלים על לוח אותיות אחרת. הם מתחילים מהצד הימני.

לעיצוב משחקים, לזה יש השלכות אמיתיות: אלמנטי UI צריכים להתהפך. חצי ניווט, סרגלי התקדמות, כיוני צללים — כל מה שמרמז על כיוון צריך להשתקף. הצללים הקשים שלנו מתהפכים ממוטל ימינה ל-מוטל שמאלה במצב RTL. נשמע קטן, אבל שחקנים שמים לב כשזה לא נכון.

קלט טקסט ויצירת מילים צריכים טיפול מיוחד. כששחקן עברי בונה מילה אות אות, האות החדשה צריכה להופיע בצד שמאל של המילה הגדלה. אנימציות צריכות לכבד כיווניות.

החלק הקשה ביותר? טקסט דו-כיווני. טקסט עברי שכולל מילים באנגלית, מספרים או קיצורים מחליף כיוון באמצע השורה.

ראיתי משחקים שבבירור נבדקו רק באנגלית. תמיד אפשר להגיד כי העברית מרגישה כמו ללבוש חולצה הפוך — טכנית עובד, אבל ברור שלא נכון.`,
      },
      {
        title: 'תרבות משחקי מילים בישראל',
        content: `לישראל יש תרבות משחקי מילים שמתחרה בכל מדינה שביקרתי בה, עם טעם ישראלי ייחודי.

סקרבל (או כפי שהוא מוכר בעברית, שבץ נא) הוא עם קהל מסור. יש משהו מספק עמוקות בלשחק סקרבל בשפה שבה מערכת השורשים אומרת שכל מגש אריחים מכיל משפחות מילים מוסתרות.

תשבצים הם מוסד לאומי. תשבצי העיתון של יום שישי הם טקס סוף שבוע לישראלים רבים — עד כדי כך שיש סלבריטאים של תשבצים. יוצרי חידות כמו דן אוריון הם דמויות תרבותיות אמיתיות.

ואז יש מסורת משחקי המילים. עברית היא שפה שאוהבת משחקי מילים וכפל משמעות. מערכת השורשים הופכת משחקי מילים לכמעט בלתי נמנעים — כשכל כך הרבה מילים חולקות דפוסי עיצורים, כפל משמעויות הוא בכל מקום.

לעברית יש גם יחס ייחודי ליצירת מילים. כי עברית מודרנית בעצם הוחייתה ומודרנה במאות ה-19 וה-20, יש מסורת של יצירת מילים מכוונת. "מחשב" בא מהשורש ח-ש-ב (לחשוב/לחשב). "חשמל" נשלף ממילה מקראית עמומה שהתייחסה במקור לחומר נוצץ מסתורי בספר יחזקאל.

עבור שחקנים, זה אומר שלעברית יש שכבות. מילים קדומות דרות בצוותא עם מטבעות מודרניות. עברית מקראית, עברית של חז"ל, ועברית מודרנית — כולן תורמות אוצר מילים. משחק אחד עשוי לכלול מילה בת 3,000 שנה מהתורה ליד מילה שהומצאה ב-2015.`,
      },
      {
        title: 'טיפים ללומדי עברית שמשחקים משחקי מילים',
        content: `אם אתם לומדים עברית ורוצים להשתמש במשחקי מילים ככלי לימוד — מה שאני מאוד ממליצה — הנה האסטרטגיות שבאמת עובדות:

למדו שורשים, לא מילים. זה הטיפ החשוב ביותר. כשאתם נתקלים במילה חדשה, אל תשננו אותה בבידוד. חפשו את השורש התלת-אותי. אחר כך חפשו מילים אחרות מאותו שורש. פתאום, במקום ללמוד מילה אחת, למדתם חמש.

התחילו עם שורשים בתדירות גבוהה. יש כ-500 שורשים שמכסים את רוב העברית היומיומית. שורשים כמו כ-ת-ב, ל-מ-ד, ד-ב-ר, ש-מ-ע ו-ר-א-ה יופיעו כל הזמן במשחקים.

שחקו עם ניקוד פועל (אם המשחק תומך). זה מפחית דרמטית את העומס הקוגניטיבי. כשמשתפרים, כבו את הניקוד.

שימו לב למשקלים. מילים עבריות עוקבות אחרי תבניות ספציפיות. למשל, התבנית מִ__ָ_ יוצרת לעתים קרובות שמות מקום: מִקְדָּשׁ, מִסְפָּר. זיהוי הדפוסים האלה עוזר לחזות מילים תקפות.

אל תפחדו מסלנג. "סבבה," "יאללה," "חפיף" — כולן מילים עבריות אמיתיות עם שורשים אמיתיים.

השתמשו במשחקי מילים לתרגול מהירות קריאה. משחקי מילים מכריחים אתכם לקרוא מהר. אי אפשר לבלות 30 שניות על כל מילה כשהטיימר רץ. לחץ הזמן הוא למעשה יתרון כי הוא מאמן זיהוי אוטומטי.

קבלו שתפסידו. הרבה. לזמן רב. אבל כל משחק מלמד אתכם משהו, והלמידה מצטברת.`,
      },
      {
        title: 'סלנג עברי ומילים מודרניות במשחקי מילים',
        content: `אחת השמחות של משחקי מילים בעברית היא המפגש עם העולם הפרוע והיצירתי של סלנג עברי מודרני.

סלנג עברי הוא מיקס יפהפה של השפעות. תמצאו מילים שאולות מערבית (יאללה, אחלה), אנגלית (קול), רוסית (במיוחד בסלנג ישן מהגירת שנות ה-90), ויצירות מקומיות שמשחקות עם מערכת השורשים של עברית.

קחו את המילה "פראייר" — פרייר שמשמעותה מי שנותן לאחרים לנצל אותו. היא באה מגרמנית/יידיש, והיא אחת המילים הכי טעונות תרבותית בעברית ישראלית. "אל תהיה פראייר" זה כמעט מוטו לאומי.

או "חבל על הזמן" — מילולית "בזבוז זמן" אבל אידיומטית "מדהים." ההיפוך הסמנטי הזה הופך סלנג עברי למבדר אינסופית.

רשתות חברתיות האיצו יצירת מילים עבריות. דוברי עברית טבעו מילים כמו "לייקק," "תיירג," ו"שיירר." המילים האלה עוקבות אחרי כללי מורפולוגיה עבריים — לקחו מושגים אנגליים והלבישו אותם בבגדים דקדוקיים עבריים.

הצבא תורם רבות לסלנג העברי. מילים כמו "גרבי," "משופשף," ו"סמנכ"ל" נולדו בתרבות הצבאית והגרו לשימוש כללי.

עבור שחקנים, האופי המתפתח כל הזמן של סלנג עברי אומר שאוצר המילים הוא דבר חי ונושם. מילים חדשות הופכות למשחקים תקפים תוך שנים מטביעתן.`,
      },
      {
        title: 'למה אני ממשיכה לחזור למשחקי מילים בעברית',
        content: `התחלתי ללמוד עברית בגלל חברה. המשכתי בגלל משחקי מילים. זו לא בדיחה — זה ממש מה שקרה.

מערכת השורשים שינתה את ההבנה שלי לגבי איך שפות יכולות לעבוד. הקריאה ללא ניקוד אימנה סוג של זיהוי דפוסים שלא ידעתי שאני מסוגלת לו. המעבר ל-RTL גרם לי להיות מודעת להטיות מרחביות שמעולם לא ידעתי שיש לי.

משחקי מילים בעברית קשים יותר מאנגלית. לא אעמיד פנים אחרת. עקומת הלמידה תלולה יותר, הדרישות הקוגניטיביות גבוהות יותר, ולדוברים ילידים יש יתרון עצום.

אבל הם גם עשירים יותר. מרובדים יותר. מתגמלים יותר כשדברים מתחברים. למצוא מילה בעברית מרגיש כמו חפירה ארכיאולוגית — לחשוף שורש, לזהות דפוס, לשחזר מילה שהתקיימה באיזושהי צורה לפני שלושת אלפים שנה ועדיין עובדת היום.

ואם אתם דוברי עברית ילידים שהנהנתם לאורך כל המאמר הזה וחשבתם "כן, ברור" — תודה על הסבלנות. עכשיו תלמדו אותי את השורש של "הכרת תודה." אני יודעת שהוא מתחיל בנו"ן... או שלא. עזרו לי.`,
      },
      {
        content: `מקורות:
- Shimron, J. (2006). "Reading Hebrew: The Language and the Psychology of Reading It."
- אוניברסיטת חיפה (2018). הטיית קשב מרחבית בקוראי RTL מול LTL.
- Ravid, D. (2012). "Spelling Morphology: The Psycholinguistics of Hebrew Spelling."
- אבן-שושן, א. "המילון החדש" — מילון עברי סטנדרטי.
- פרויקט בן-יהודה — מילון עברי מקוון מקיף.
- האקדמיה ללשון העברית — גוף אימוץ ותקנון מילים רשמי.`,
      },
    ],
    backToBlog: 'חזרה לבלוג',
    tryDaily: 'אתגר יומי',
    practice: 'תרגול',
  },
  sv: {
    title: 'Att Spela Ordspel på Hebreiska: Det Vackra Kaoset med Höger-till-Vänster',
    subtitle: 'Rotsystem, saknade vokaler och varför att designa ett ordspel för hebreiska är som att lösa ett pussel inuti ett pussel.',
    category: 'Språk',
    readTime: '12 min läsning',
    authorName: 'The Word Nerd',
    authorBio: 'Flerspråkig ordspelsentusiast som ägnade sex månader åt att lära sig hebreiska rötter bara för att vara mindre dålig på israeliska Scrabble-kvällar.',
    sections: [
      {
        content: `Jag ska avslöja en hemlighet som hebreiska ordspelsspelare redan känner till: att spela ordspel på hebreiska är en fundamentalt annorlunda upplevelse jämfört med att spela på engelska. Inte svårare, inte lättare — annorlunda. Strukturellt annorlunda på DNA-nivå.

På engelska tittar du på ett bokstavsrutnät och din hjärna söker efter bekanta mönster. C-A-T, T-H-E. Du skannar vänster till höger, uppifrån och ner.

På hebreiska måste din hjärna göra något mycket mer intressant. Den måste rekonstruera ord från konsonantskelett, mentalt infoga vokaler som inte finns där, navigera en höger-till-vänster läsriktning, och — det här är den vilda delen — inse att tre till synes slumpmässiga bokstäver kan dela en rot som kopplar dem till dussintals olika ord.

Jag blev kär i hebreiska ordspel för ungefär två år sedan, när en israelisk vän bjöd in mig till en Scrabble-kväll i Tel Aviv. Jag gick in med kanske 200 hebreiska ord. Jag gick ut fyra timmar senare efter att ha förlorat spektakulärt, men med en förståelse för hur det hebreiska språket fungerar som ingen lärobok hade gett mig.`,
      },
      {
        title: 'Varför Hebreiska Är Speciellt: Shoresh-systemet',
        content: `Varje hebreisk ordspelsspelare behöver förstå ett koncept utan riktig motsvarighet på engelska: shoresh (שורש), eller rotsystemet.

På engelska är ord mestadels godtyckliga sekvenser. På hebreiska härstammar nästan varje ord från en trebokstavsrot som bär en kärnbetydelse. Genom att sätta in roten i olika mönster (mishkalim) genererar du en familj av relaterade ord.

Ta roten כ-ת-ב (K-T-V), relaterad till skrivande: katav (skrev), kotev (skriver), ktiva (skrivning), mikhtav (brev), katav (reporter), ktovet (adress). Åtta ord, alla från tre bokstäver.

Föreställ dig att du spelar och ser bokstäverna כ, ת och ב utspridda på brädet. Din hjärna tänds: de tre bokstäverna är en rot. Du vet omedelbart att det finns en ordfamilj gömd i den kombinationen.

Det här är vad som gör hebreiska ordspel intellektuellt spännande. Varje rot du känner igen är en nyckel som öppnar flera dörrar.`,
      },
      {
        title: 'Inga Vokaler, Inga Problem (Nåja, Vissa Problem)',
        content: `Skriven hebreiska inkluderar mestadels inte vokaler. Bokstäverna du ser är konsonanter. Vokalerna är underförstådda. Det är som att läsa "Kn d läs dnn mnnng?" — fast hebreisktalande gör det utan ansträngning.

För ordspel skapar detta en fascinerande dynamik. Samma konsonantsekvens kan representera olika ord beroende på vilka vokaler du sätter in. Bokstäverna ד-ב-ר kan vara davar (sak), diber (talade), dever (pest), eller dvar (ord av).

Informationstätheten i hebreiska bokstäver är högre. Varje bokstav bär mer semantisk vikt. Det gör att hebreiska ordspel känns mer komprimerade, mer koncentrerade.

Jag har hört hebreiska Scrabble-spelare beskriva det som "att läsa mellan bokstäverna." Du ser inte bara vad som finns där — du ser vad som kan finnas där.`,
      },
      {
        title: 'RTL: När Allt Du Vet Om Layout Är Fel',
        content: `Hebreiska skrivs och läses höger till vänster. Det skapar en kaskad av designutmaningar.

Forskning från Haifas universitet (2018) fann att hebreisktalande visar en högerriktad uppmärksamhetsbias, medan engelsktalande visar vänsterbias. Hebreiska spelare tittar bokstavligen annorlunda på ett bokstavsrutnät.

UI-element behöver spegelvändas. Navigationspilar, framstegsbalkar, skuggriktningar — allt som antyder riktning behöver speglas. Textinmatning och ordbildning behöver särskild hantering. Animationer behöver respektera riktning.

Den svåraste delen? Dubbelriktad text. Hebreisk text som innehåller engelska ord byter riktning mitt i raden.

De bästa hebreiska ordspelen känns inhemska från första stund. UI:t fungerar inte bara i RTL — det tänker i RTL.`,
      },
      {
        title: 'Hebreisk Ordspelskultur i Israel',
        content: `Israel har en ordspelskultur som rivaliserar med alla länder jag besökt. Scrabble (שבץ נא) har en hängiven följarskara. Hebreiska korsord (tashbetzim) är en nationell institution. Fredagstidningens korsord är en helgritual.

Hebreiskan älskar ordlekar. Rotsystemet gör ordlekar nästan oundvikliga. Israelisk humor bygger tungt på detta.

Modern hebreiska har en unik relation till ordsskapande. Nya ord konstrueras genom att passa moderna koncept i urgamla rotmönster. "Dator" (makhshev) kommer från roten ח-ש-ב (tänka/beräkna). "Elektricitet" (khashmal) hämtades från ett obskyrt bibliskt ord.

En israelisk tävlings-Scrabble-spelare sa: "På engelska memorerar man ord. På hebreiska förstår man strukturer. När du kan mönstren är nya ord inte överraskningar — de är förutsägelser."`,
      },
      {
        title: 'Tips för Hebreiskstuderande',
        content: `Lär dig rötter, inte ord. Det här är det viktigaste tipset. När du stöter på ett nytt hebreiskt ord, slå upp dess trebokstavsrot. Sedan slå upp andra ord från samma rot. Plötsligt har du lärt dig fem ord istället för ett.

Börja med högfrekventa rötter. Ungefär 500 rötter täcker majoriteten av vardagshebreiskan.

Spela med vokaltecken (nikkud) påslagna om spelet stödjer det. Stäng av dem när du förbättras.

Var inte rädd för slang. "Sababa," "yalla," "khafif" — alla är riktiga hebreiska ord med riktiga rötter.

Använd ordspel för att öva läshastighet. Tidspressen är en funktion, inte en bugg.

Acceptera att du kommer förlora. Mycket. Länge. Men varje spel lär dig något.`,
      },
      {
        title: 'Hebreisk Slang i Ordspel',
        content: `Hebreisk slang är en vacker blandning av influenser. Arabiska (yalla, akhla), engelska (kol — cool), ryska, och hemmagjorda skapelser.

Ordet "fraier" (lurad) kommer från tyska/jiddisch. "Khaval al hazman" betyder bokstavligen "synd om tiden" men idiomatiskt "fantastiskt."

Sociala medier har accelererat hebreiskt ordsskapande. Ord som "laikek" (gilla), "taireg" (tagga), "shairer" (dela) följer hebreiska morfologiska regler.

Militären bidrar tungt till slang. Ord som "garbi" (värdelös) och "meshupshaf" (erfaren) föddes i militärkulturen.

Det ständigt utvecklande slanglandskapet håller ordspelen fräscha.`,
      },
      {
        content: `Källor:
- Shimron, J. (2006). "Reading Hebrew: The Language and the Psychology of Reading It."
- Haifas universitet (2018). Rumslig uppmärksamhetsbias hos RTL vs LTR-läsare.
- Ravid, D. (2012). "Spelling Morphology: The Psycholinguistics of Hebrew Spelling."
- Even-Shoshan, A. "Den Nya Ordboken."
- Ben-Yehuda-projektet — omfattande hebreisk ordbok online.`,
      },
    ],
    backToBlog: 'Tillbaka till Bloggen',
    tryDaily: 'Daglig Utmaning',
    practice: 'Öva',
  },
  ja: {
    title: 'ヘブライ語でワードゲーム：右から左への美しいカオス',
    subtitle: 'ルートシステム、消えた母音、そしてヘブライ語のワードゲームをデザインすることがパズルの中のパズルである理由。',
    category: '言語',
    readTime: '12分で読めます',
    authorName: 'The Word Nerd',
    authorBio: 'イスラエルのスクラブルナイトでマシになるためだけに6ヶ月間ヘブライ語の語根を学んだ多言語ワードゲームマニア。',
    sections: [
      {
        content: `ヘブライ語のワードゲームプレイヤーがすでに知っている秘密をお教えします：ヘブライ語でワードゲームをプレイすることは、英語でプレイすることとは根本的に異なる体験です。より難しいわけでも、より簡単なわけでもない — 違うのです。DNA レベルで構造的に異なります。

英語では、文字のグリッドを見て脳が馴染みのあるパターンを探します。C-A-T、T-H-E。左から右、上から下にスキャンします。

ヘブライ語では、脳はもっと興味深いことをしなければなりません。子音の骨格から単語を再構築し、存在しない母音を頭の中で挿入し、空間処理を反転させる右から左への読み方向をナビゲートし、そして — これが驚きの部分 — 一見ランダムな3つの文字が、数十の異なる単語につながるルートを共有しているかもしれないことを認識しなければなりません。

2年ほど前、イスラエル人の友人にテルアビブのスクラブルナイトに招待されて、ヘブライ語のワードゲームに恋に落ちました。ヘブライ語の単語を200語ほど知って入り、4時間後に見事に負けて出てきましたが、ヘブライ語がどう機能するかについて深い理解を得ました。`,
      },
      {
        title: 'なぜヘブライ語はワードゲームに特別か：ショレシュシステム',
        content: `ヘブライ語のワードゲームプレイヤーは、英語には本当の同等物がない一つの概念を理解する必要があります：ショレシュ（שורש）、つまりルートシステムです。

英語では単語はほとんど任意の文字列です。ヘブライ語では、ほぼすべての単語が核心的な意味を持つ3文字のルートから派生します。そのルートを異なるパターン（ミシュカリム）に挿入することで、関連する単語のファミリーを生成します。

ルート כ-ת-ב（K-T-V、書くことに関連）を例に取ると：katav（書いた）、kotev（書く）、ktiva（書くこと）、mikhtav（手紙）、katav（記者）、ktovet（住所）。3文字から8つの単語。

ゲーム中にכ、ת、בの文字がグリッドに散らばっているのを見ると、脳が点灯します：これら3文字はルートだ。その組み合わせに隠れた単語ファミリーがあることがすぐにわかります。

認識するすべてのルートが複数のドアを開く鍵です。これがヘブライ語のワードゲームを知的にスリリングにするものです。`,
      },
      {
        title: '母音なし、問題なし（まあ、いくつかの問題はある）',
        content: `英語話者を驚かせること：書かれたヘブライ語にはほとんど母音が含まれていません。ページ上の文字は子音です。母音は暗示されています。ネイティブスピーカーはただ...知っています。

ワードゲームにとって、これは魅力的なダイナミクスを生み出します。同じ子音列が、挿入する母音によって異なる単語を表すことがあります。ד-ב-ר は davar（もの）、diber（話した）、dever（疫病）、または dvar（〜の言葉）になり得ます。

ヘブライ語の文字の情報密度は英語より高いです。各文字は子音の役割を果たしながら、可能な母音パターンも暗示するため、より多くの意味的重みを持ちます。

ヘブライ語のスクラブルプレイヤーがこれを「文字の間を読む」と表現するのを聞きました。そこにあるものだけでなく、そこにあり得るものを見ているのです。`,
      },
      {
        title: 'RTL：レイアウトの常識が覆されるとき',
        content: `ヘブライ語は右から左に書かれ、読まれます。ゲームデザイナーにとって、この一つの事実がデザイン上の課題の連鎖を生み出します。

ハイファ大学の研究（2018年）は、ヘブライ語話者が右向きの空間注意バイアスを示し、英語話者が左向きのバイアスを示すことを発見しました。ヘブライ語プレイヤーは文字通り文字グリッドを異なる方法で見ています。

UI要素はミラーリングが必要です。ナビゲーション矢印、プログレスバー、影の方向 — 方向性を暗示するすべてのものを反転する必要があります。テキスト入力とワード形成には特別な処理が必要です。アニメーションは方向性を尊重する必要があります。

最も難しい部分は双方向テキストです。英語の単語を含むヘブライ語テキストは行の途中で方向が切り替わります。

最高のヘブライ語ワードゲームは最初の瞬間からネイティブに感じます。UIはRTLで動作するだけでなく、RTLで考えます。`,
      },
      {
        title: 'イスラエルのワードゲーム文化',
        content: `イスラエルには、訪れたどの国にも匹敵するワードゲーム文化があり、独特のイスラエル風味があります。

スクラブル（ヘブライ語ではשבץ נא）には熱心なファンがいます。ヘブライ語のクロスワードパズル（タシュベツィム）は国民的制度です。金曜日の新聞のクロスワードは多くのイスラエル人の週末の儀式です。

ルートシステムは言葉遊びをほぼ不可避にします。多くの単語が子音パターンを共有するため、二重の意味はどこにでもあります。

現代ヘブライ語には独自の造語の伝統があります。「コンピュータ」（makhshev）はルートח-ש-ב（考える/計算する）から。「電気」（khashmal）はエゼキエル書の不明瞭な聖書の言葉から引き出されました。

イスラエルの競技スクラブルプレイヤーが言いました：「英語では単語を暗記する。ヘブライ語では構造を理解する。パターンを知れば、新しい単語は驚きではなく予測になる。」`,
      },
      {
        title: 'ヘブライ語学習者向けのヒント',
        content: `単語ではなくルートを学びましょう。これが最も重要なヒントです。新しいヘブライ語の単語に出会ったら、3文字のルートを調べてください。1つの単語の代わりに5つ学べます。

高頻度ルートから始めましょう。約500のルートが日常ヘブライ語の大部分をカバーします。

ゲームが対応していれば、母音記号（ニクード）をオンにしてプレイしましょう。上達したらオフにしてください。

スラングを恐れないでください。「サバーバ」「ヤッラ」「ハフィフ」はすべて本物のヘブライ語です。

ワードゲームを読む速度の練習に使いましょう。時間のプレッシャーは実はバグではなく機能です。

負けることを受け入れましょう。たくさん。長い間。でもすべてのゲームが何かを教えてくれます。`,
      },
      {
        title: 'ヘブライ語スラングとワードゲーム',
        content: `ヘブライ語スラングはアラビア語（ヤッラ、アフラ）、英語（コール=cool）、ロシア語、そして独自の創造物の美しいミックスです。

「フライエル」（お人好し）はドイツ語/イディッシュ語から。「ハヴァル・アル・ハズマン」は文字通り「時間のもったいない」ですが、慣用的には「すごい」という意味。

ソーシャルメディアがヘブライ語の造語を加速させました。「ライケク」（いいねする）、「タイレグ」（タグ付けする）、「シャイレル」（シェアする）はすべてヘブライ語の形態論規則に従っています。

軍隊もスラングに大きく貢献しています。常に進化するスラングの景観がワードゲームを新鮮に保ちます。`,
      },
      {
        content: `出典：
- Shimron, J. (2006). "Reading Hebrew: The Language and the Psychology of Reading It."
- ハイファ大学 (2018). RTL vs LTR読者の空間注意バイアス。
- Ravid, D. (2012). "Spelling Morphology: The Psycholinguistics of Hebrew Spelling."
- ベン・イェフダ・プロジェクト — 包括的ヘブライ語オンライン辞書。`,
      },
    ],
    backToBlog: 'ブログに戻る',
    tryDaily: 'デイリーチャレンジ',
    practice: '練習',
  },
  es: {
    title: 'Jugar Juegos de Palabras en Hebreo: El Hermoso Caos de Derecha a Izquierda',
    subtitle: 'Sistemas de raíces, vocales ausentes y por qué diseñar un juego de palabras para hebreo es como resolver un rompecabezas dentro de otro.',
    category: 'Idioma',
    readTime: '12 min de lectura',
    authorName: 'The Word Nerd',
    authorBio: 'Obsesiva multilingüe de juegos de palabras que pasó seis meses aprendiendo raíces hebreas solo para ser menos terrible en las noches de Scrabble israelíes.',
    sections: [
      {
        content: `Voy a revelarles un secreto que los jugadores de juegos de palabras en hebreo ya conocen: jugar juegos de palabras en hebreo es una experiencia fundamentalmente diferente a jugar en inglés. No más difícil, no más fácil — diferente. Estructuralmente diferente a nivel de ADN.

En inglés, miras una cuadrícula de letras y tu cerebro busca patrones familiares. C-A-T, T-H-E. Escaneas de izquierda a derecha, de arriba a abajo.

En hebreo, tu cerebro tiene que hacer algo mucho más interesante. Tiene que reconstruir palabras a partir de esqueletos de consonantes, insertar mentalmente vocales que no están allí, navegar una dirección de lectura de derecha a izquierda, y reconocer que tres letras aparentemente aleatorias podrían compartir una raíz que las conecta con docenas de palabras diferentes.

Me enamoré de los juegos de palabras en hebreo hace unos dos años, cuando una amiga israelí me invitó a una noche de Scrabble en Tel Aviv. Entré conociendo unas 200 palabras en hebreo. Salí cuatro horas después habiendo perdido espectacularmente, pero comprendiendo algo profundo sobre cómo funciona el idioma hebreo.`,
      },
      {
        title: 'Por Qué el Hebreo Es Especial: El Sistema Shoresh',
        content: `Cada jugador de juegos de palabras en hebreo necesita entender un concepto sin equivalente real en inglés: el shoresh (שורש), o sistema de raíces.

En inglés, las palabras son secuencias mayormente arbitrarias. En hebreo, casi cada palabra deriva de una raíz de tres letras que lleva un significado central. Al insertar esa raíz en diferentes patrones (mishkalim), generas una familia de palabras relacionadas.

Toma la raíz כ-ת-ב (K-T-V), relacionada con la escritura: katav (escribió), kotev (escribe), ktiva (escritura), mikhtav (carta), katav (reportero), ktovet (dirección). Ocho palabras, todas de tres letras.

Cuando ves las letras כ, ת y ב en el tablero, tu cerebro se ilumina: son una raíz. Sabes inmediatamente que hay una familia de palabras escondida. Cada raíz que reconoces es una llave que abre múltiples puertas.`,
      },
      {
        title: 'Sin Vocales, Sin Problema (Bueno, Algunos Problemas)',
        content: `El hebreo escrito generalmente no incluye vocales. Las letras son consonantes. Las vocales están implícitas. Los hablantes nativos simplemente... las saben.

Para juegos de palabras, esto crea una dinámica fascinante. La misma secuencia de consonantes puede representar diferentes palabras. ד-ב-ר puede ser davar (cosa), diber (habló), dever (plaga), o dvar (palabra de).

La densidad de información de las letras hebreas es mayor. Cada letra carga más peso semántico porque hace el trabajo de consonante e implica patrones vocálicos posibles.

Los jugadores de Scrabble hebreo describen esto como "leer entre las letras." No solo ves lo que está allí — ves lo que podría estar allí.`,
      },
      {
        title: 'RTL: Cuando Todo Lo Que Sabes Sobre Diseño Está Mal',
        content: `El hebreo se escribe de derecha a izquierda. Investigación de la Universidad de Haifa (2018) encontró que los hablantes de hebreo muestran un sesgo de atención espacial hacia la derecha. Los jugadores hebreos literalmente miran una cuadrícula de letras de forma diferente.

Los elementos de UI necesitan invertirse. Flechas de navegación, barras de progreso, direcciones de sombra — todo lo que implica dirección necesita reflejarse. La entrada de texto necesita manejo especial. Las animaciones deben respetar la direccionalidad.

La parte más difícil es el texto bidireccional. El texto hebreo que incluye palabras en inglés cambia de dirección a mitad de línea.

Los mejores juegos de palabras en hebreo se sienten nativos desde el primer momento. La interfaz no solo funciona en RTL — piensa en RTL.`,
      },
      {
        title: 'Cultura de Juegos de Palabras en Israel',
        content: `Israel tiene una cultura de juegos de palabras que rivaliza con cualquier país. Scrabble (שבץ נא) tiene seguidores dedicados. Los crucigramas hebreos (tashbetzim) son una institución nacional.

El sistema de raíces hace los juegos de palabras casi inevitables. El humor israelí depende mucho de esto.

El hebreo moderno tiene una relación única con la creación de palabras. "Computadora" (makhshev) viene de la raíz ח-ש-ב (pensar/calcular). "Electricidad" (khashmal) fue extraída de una oscura palabra bíblica.

Una jugadora competitiva israelí dijo: "En inglés memorizas palabras. En hebreo entiendes estructuras. Una vez que conoces los patrones, las nuevas palabras no son sorpresas — son predicciones."`,
      },
      {
        title: 'Consejos para Estudiantes de Hebreo',
        content: `Aprende raíces, no palabras. Este es el consejo más importante. Cuando encuentres una nueva palabra, busca su raíz de tres letras. Luego busca otras palabras de la misma raíz. De repente, aprendiste cinco palabras en vez de una.

Empieza con raíces de alta frecuencia. Unas 500 raíces cubren la mayoría del hebreo cotidiano.

Juega con marcas vocálicas (nikkud) activadas si el juego lo permite. Desactívalas cuando mejores.

No tengas miedo del argot. "Sababa," "yalla," "khafif" son palabras hebreas reales.

Usa juegos de palabras para practicar velocidad de lectura. La presión del tiempo es una característica, no un defecto.

Acepta que perderás. Mucho. Por mucho tiempo. Pero cada juego te enseña algo.`,
      },
      {
        title: 'Argot Hebreo en Juegos de Palabras',
        content: `El argot hebreo es una hermosa mezcla de influencias. Árabe (yalla, akhla), inglés (kol — cool), ruso, y creaciones propias.

"Fraier" (tonto/ingenuo) viene del alemán/yiddish. "Khaval al hazman" significa literalmente "desperdicio de tiempo" pero idiomáticamente "increíble."

Las redes sociales han acelerado la creación de palabras. "Laikek" (dar like), "taireg" (etiquetar), "shairer" (compartir) siguen reglas morfológicas hebreas.

El ejército contribuye mucho al argot. El paisaje de argot en constante evolución mantiene los juegos frescos.`,
      },
      {
        content: `Fuentes:
- Shimron, J. (2006). "Reading Hebrew: The Language and the Psychology of Reading It."
- Universidad de Haifa (2018). Sesgo de atención espacial en lectores RTL vs LTR.
- Ravid, D. (2012). "Spelling Morphology: The Psycholinguistics of Hebrew Spelling."
- Proyecto Ben-Yehuda — diccionario hebreo completo en línea.`,
      },
    ],
    backToBlog: 'Volver al Blog',
    tryDaily: 'Desafío Diario',
    practice: 'Practicar',
  },
};
