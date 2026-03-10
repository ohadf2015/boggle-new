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
    title: 'Word Hunt Strategy: Find the Hidden Word in Fewer Attempts',
    subtitle: 'Master elimination strategy, vowel placement, and clue interpretation to solve Word Hunt puzzles efficiently.',
    category: 'Strategy',
    readTime: '8 min read',
    authorName: 'The Word Nerd',
    authorBio: 'Word Hunt specialist with a 95% solve rate and an average of 3.2 attempts per puzzle.',
    quickTips: [
      'Start with a word that has common vowels (A, E, I) and common consonants (R, S, T, N, L)',
      'Never reuse a letter you already know is wrong - every guess should test new information',
      'Pay attention to position clues: green means right letter right spot, yellow means right letter wrong spot',
      'If you get a yellow letter, try it in every OTHER position in your next guess',
      'Use your first two guesses to test 10 different letters - maximize information gathering',
      'Common word endings: -IGHT, -OUND, -TION, -NESS narrow options dramatically',
      'When stuck with 2-3 options, choose the word with the most common letter patterns',
    ],
    sections: [
      {
        title: 'How Word Hunt Works',
        content: `Word Hunt is LexiClash's Wordle-inspired puzzle mode. You have a limited number of attempts to guess a hidden target word. After each guess, the game gives you color-coded feedback on every letter.

Green means the letter is correct and in the right position. Yellow means the letter exists in the target word but is in the wrong position. Gray means the letter is not in the target word at all.

The challenge is to use this feedback strategically to narrow down possibilities and find the target word in as few attempts as possible. Unlike Classic or Blast mode where you work with visible letters, Word Hunt requires deductive reasoning and vocabulary knowledge.

Each day brings a new Word Hunt puzzle in the Daily Challenge. You can also play unlimited practice rounds in single player mode. Your performance is tracked, and solving in fewer attempts earns more points and coins.`,
      },
      {
        title: 'The Opening Move: Information Maximization',
        content: `Your first guess is the most important move in Word Hunt. It sets the foundation for everything that follows. The goal of your opening word is NOT to guess the answer - its to gather maximum information.

The ideal opening word has: common vowels (at least 2), common consonants, and no repeated letters. Words like STARE, CRANE, SLATE, ADIEU, or ROAST are popular openers because they test frequently-used letters.

Why does this matter? English has 26 letters, but their frequency varies enormously. E, T, A, O, I, N, S, R appear in the vast majority of words. By testing these high-frequency letters first, you eliminate or confirm the building blocks of most possible answers.

Bad opening words include: words with repeated letters (TEETH tests only 3 unique letters), words with rare letters (JAZZY wastes guesses on Q, J, Z, X), and overly long or short words that dont match the target length.

Advanced opener strategy: use two complementary words as your first two guesses. For example, STARE followed by COIL tests 9 unique letters across two guesses, covering all 5 major vowels and 4 common consonants.`,
      },
      {
        title: 'Reading the Clues: Green, Yellow, and Gray',
        content: `After your first guess, the clues tell you exactly what to focus on. Heres how to extract maximum value from each color.

Green letters are locked in. They go in the same position in every future guess. Never move a green letter. If you get S in position 1 as green, every subsequent guess must start with S.

Yellow letters are the trickiest to use well. A yellow letter tells you two things: the letter IS in the word, but NOT in that position. Many players make the mistake of moving a yellow letter to a random new position. Instead, be systematic - try it in each remaining position you havent tested.

Gray letters are eliminations. Cross them off mentally. Never use a gray letter again. This is where many players waste guesses - they forget which letters were already eliminated and accidentally reuse them.

Combination reading: The real power comes from combining clues. If you know the word has an A (yellow from position 2) and an R (green in position 4), you can start thinking about words with the pattern _ _ _ R _ where A appears somewhere other than position 2.`,
      },
      {
        title: 'Elimination Strategy: Narrowing the Field',
        content: `After 2-3 guesses, you should have enough information to dramatically narrow the possibilities. Heres the systematic approach.

Letter elimination: Count how many letters you have tested. After two good guesses with no repeated letters, you have tested 10 of 26 letters. Thats almost 40% of the alphabet. The remaining letters are your candidates.

Position locking: Green letters fix positions. If you have 2 green letters after 2 guesses, you have reduced possibilities by roughly 95% for those positions.

Pattern matching: With green and yellow information combined, start listing words that fit the pattern. For example, if you know: position 1 is S (green), position 3 is not A (yellow A elsewhere), position 4 is R (green), you are looking for S_?R? words where A appears in position 2, 3, or 5.

The constraint tightening technique: Each new piece of information should dramatically reduce your candidate list. If it doesnt, your guess was not informative enough. Aim for guesses that halve your remaining options each time.

When you are down to 2-3 possible words, choose the one with the most common letter patterns in English. SHARE is more likely than SNARE, and SNARE is more likely than SCARE, based on letter frequency data.`,
      },
      {
        title: 'Using Clues Effectively',
        content: `Word Hunt provides additional clue mechanics beyond the basic color coding that many players overlook.

Hint system: If you are stuck, you can use a hint that reveals one additional letter position. Save hints for when you have 2+ equally likely candidates and cant distinguish between them. Using a hint when you have 5+ possibilities is wasteful - another guess would give you more information.

Letter frequency awareness: Even without hints, you can use English letter frequency to make smarter guesses. After E, T, A, O, I, N, S, R, the next most common letters are H, L, D, C, U, M, F, P. If you havent tested these yet, prioritize them.

Word pattern databases: Experienced players maintain mental databases of common word patterns. Words ending in -IGHT (light, right, sight, might, night, fight, tight) form a cluster. If you identify that pattern early, you can work through the cluster systematically.

Double letter awareness: Many target words contain double letters (SLEEP, TEETH, LLAMA). If your first guesses all come back with no doubles, you might be dealing with a double-letter word. Try guesses that test common doubles: LL, SS, EE, TT, OO.`,
      },
      {
        title: 'Common Traps and How to Avoid Them',
        content: `Even experienced players fall into these Word Hunt traps. Knowing them helps you avoid them.

The tunnel vision trap: You become convinced the answer is a specific word and keep trying variations of it instead of considering completely different options. If CRANE gives you no green or yellow letters, the answer shares NONE of those letters. Think completely differently.

The rare word trap: You waste a guess on an obscure word hoping for a lucky break. Word Hunt targets are common, everyday words. If you are considering a word you would never use in conversation, its probably not the answer.

The position fixation trap: You get a yellow letter and keep trying it in the same wrong positions. Track which positions you have already tested for each yellow letter so you dont repeat experiments.

The panic guess trap: With only 1-2 guesses remaining, players panic and submit the first word that comes to mind. Instead, take a moment to review ALL your clues. List every constraint. The answer must satisfy ALL of them simultaneously.

The double letter blind spot: Players often forget that words can have repeated letters. If you have tested E once and it came back yellow, the word might have two Es. Keep this possibility open.`,
      },
      {
        title: 'Advanced Techniques for Expert Players',
        content: `These techniques are used by players who consistently solve in 2-3 attempts.

Information theory approach: Each guess should maximize the expected information gain. This means choosing words that are likely to produce the most varied feedback patterns. A word that could result in many different green/yellow/gray combinations is more informative than one with few possible outcomes.

Conditional planning: Before submitting a guess, plan your response to EACH possible outcome. "If A comes back green, I will try X. If A comes back yellow, I will try Y. If A comes back gray, I will try Z." This pre-planning saves critical thinking time.

Hard mode discipline: Even if the game doesnt enforce it, play in "hard mode" - always use confirmed green and yellow letters in subsequent guesses. This forces efficient play and prevents wasted information.

Frequency-weighted guessing: When you have multiple candidate words, choose the one whose untested letters have the highest combined frequency in English. This maximizes the probability of each guess being correct while also maximizing information if wrong.

Pattern recognition speed: Build a mental library of common word patterns. -ATCH (batch, catch, hatch, match, patch, watch), -OUND (bound, found, hound, mound, pound, round, sound, wound), -IGHT (eight, fight, light, might, night, right, sight, tight, weight). Recognizing these patterns instantly saves valuable thinking time.`,
      },
    ],
    faq: [
      {
        question: 'What is the best starting word for Word Hunt in LexiClash?',
        answer: 'STARE, CRANE, or SLATE are excellent openers because they test common vowels (A, E) and consonants (S, T, R, N, L) with no repeated letters. The goal is maximum information gathering, not guessing the answer.',
      },
      {
        question: 'How many attempts do I get in Word Hunt?',
        answer: 'You get a limited number of attempts to find the hidden word. Solving in fewer attempts earns more points and coins. The daily Word Hunt puzzle gives everyone the same target word.',
      },
      {
        question: 'What do the colors mean in Word Hunt clues?',
        answer: 'Green means the letter is correct and in the right position. Yellow means the letter is in the word but in the wrong position. Gray means the letter is not in the target word at all.',
      },
      {
        question: 'How can I improve my Word Hunt solve rate?',
        answer: 'Use information-maximizing openers, never reuse eliminated letters, systematically test yellow letters in new positions, and maintain mental databases of common word patterns like -IGHT, -OUND, -ATCH.',
      },
    ],
    ctaText: 'Play Word Hunt',
    ctaLink: '/daily',
    backToGuides: 'Back to Guides',
  },
  he: {
    title: 'אסטרטגיית ציד מילים: מצאו את המילה הנסתרת בפחות ניסיונות',
    subtitle: 'שלטו באסטרטגיית אלימינציה, מיקום תנועות ופירוש רמזים כדי לפתור חידות ציד מילים ביעילות.',
    category: 'אסטרטגיה',
    readTime: '8 דקות קריאה',
    authorName: 'חנון המילים',
    authorBio: 'מומחה ציד מילים עם שיעור פתרון של 95% וממוצע של 3.2 ניסיונות לחידה.',
    quickTips: [
      'התחילו עם מילה שיש בה תנועות נפוצות ועיצורים נפוצים',
      'לעולם אל תשתמשו שוב באות שכבר ידוע שהיא שגויה - כל ניחוש צריך לבדוק מידע חדש',
      'שימו לב לרמזי מיקום: ירוק = אות נכונה במקום נכון, צהוב = אות נכונה במקום שגוי',
      'אם קיבלתם אות צהובה, נסו אותה בכל מיקום אחר בניחוש הבא',
      'השתמשו בשני הניחושים הראשונים כדי לבדוק 10 אותיות שונות - מקסמו איסוף מידע',
      'סיומות מילים נפוצות מצמצמות אפשרויות דרמטית',
      'כשתקועים עם 2-3 אפשרויות, בחרו את המילה עם דפוסי האותיות הנפוצים ביותר',
    ],
    sections: [
      {
        title: 'איך ציד מילים עובד',
        content: `ציד מילים הוא מצב חידה בהשראת וורדל בלקסיקלאש. יש לכם מספר מוגבל של ניסיונות לנחש מילה נסתרת. אחרי כל ניחוש, המשחק נותן משוב צבעוני על כל אות.

ירוק אומר שהאות נכונה ובמיקום הנכון. צהוב אומר שהאות קיימת במילת היעד אבל במיקום שגוי. אפור אומר שהאות לא נמצאת במילת היעד כלל.

האתגר הוא להשתמש במשוב הזה באופן אסטרטגי כדי לצמצם אפשרויות ולמצוא את מילת היעד במינימום ניסיונות. בניגוד למצב קלאסי או בלאסט שבהם עובדים עם אותיות גלויות, ציד מילים דורש חשיבה דדוקטיבית וידע באוצר מילים.

כל יום מביא חידת ציד מילים חדשה באתגר היומי. אפשר גם לשחק סיבובי תרגול בלתי מוגבלים. הביצועים שלכם נמדדים, ופתרון בפחות ניסיונות מרוויח יותר נקודות ומטבעות.`,
      },
      {
        title: 'המהלך הפותח: מקסום מידע',
        content: `הניחוש הראשון הוא המהלך החשוב ביותר בציד מילים. הוא מניח את הבסיס לכל מה שבא אחריו. מטרת המילה הפותחת היא לא לנחש את התשובה - אלא לאסוף מקסימום מידע.

המילה הפותחת האידיאלית מכילה: תנועות נפוצות (לפחות 2), עיצורים נפוצים, ואין אותיות חוזרות. מילים פותחות פופולריות בוחנות אותיות בשימוש תכוף.

למה זה חשוב? יש אותיות שמופיעות ברוב המכריע של המילים. על ידי בדיקת אותיות בתדירות גבוהה קודם, מבטלים או מאשרים את אבני הבניין של רוב התשובות האפשריות.

מילים פותחות גרועות כוללות: מילים עם אותיות חוזרות (בודקות פחות אותיות ייחודיות), מילים עם אותיות נדירות (מבזבזות ניחושים), ומילים שלא תואמות את אורך היעד.

אסטרטגיית פותחת מתקדמת: השתמשו בשתי מילים משלימות כשני הניחושים הראשונים כדי לבדוק 9-10 אותיות ייחודיות.`,
      },
      {
        title: 'קריאת הרמזים: ירוק, צהוב ואפור',
        content: `אחרי הניחוש הראשון, הרמזים אומרים בדיוק על מה להתמקד.

אותיות ירוקות נעולות. הן נשארות באותו מיקום בכל ניחוש עתידי. לעולם אל תזיזו אות ירוקה.

אותיות צהובות הן הכי מסובכות לשימוש. אות צהובה אומרת שני דברים: האות נמצאת במילה, אבל לא במיקום הזה. שחקנים רבים עושים את הטעות של להזיז אות צהובה למיקום אקראי חדש. במקום, היו שיטתיים - נסו אותה בכל מיקום שטרם בדקתם.

אותיות אפורות הן אלימינציות. מחקו אותן מנטלית. לעולם אל תשתמשו באות אפורה שוב. כאן שחקנים רבים מבזבזים ניחושים.

קריאה משולבת: הכוח האמיתי בא משילוב רמזים. אם אתם יודעים שבמילה יש א (צהוב ממיקום 2) ו-ר (ירוק במיקום 4), אפשר להתחיל לחשוב על מילים עם הדפוס _ _ _ ר _ שבהן א מופיעה במקום שאינו מיקום 2.`,
      },
      {
        title: 'אסטרטגיית אלימינציה: צמצום השדה',
        content: `אחרי 2-3 ניחושים, צריך להיות מספיק מידע לצמצם דרמטית את האפשרויות.

אלימינציית אותיות: ספרו כמה אותיות בדקתם. אחרי שני ניחושים טובים ללא אותיות חוזרות, בדקתם 10 מתוך האותיות. זה כמעט 40% מהאלפבית.

נעילת מיקום: אותיות ירוקות מקבעות מיקומים. אם יש 2 אותיות ירוקות אחרי 2 ניחושים, צמצמתם אפשרויות בכ-95% למיקומים אלו.

התאמת דפוסים: עם מידע ירוק וצהוב משולב, התחילו לרשום מילים שמתאימות לדפוס.

טכניקת הידוק מגבלות: כל פיסת מידע חדשה צריכה לצמצם דרמטית את רשימת המועמדים. אם היא לא עושה זאת, הניחוש לא היה אינפורמטיבי מספיק.

כשנותרים 2-3 מילים אפשריות, בחרו את זו עם דפוסי האותיות הנפוצים ביותר.`,
      },
      {
        title: 'שימוש יעיל ברמזים',
        content: `ציד מילים מספק מכניקות רמז נוספות מעבר לקידוד צבעים בסיסי שרוב השחקנים מתעלמים מהן.

מערכת רמזים: אם תקועים, אפשר להשתמש ברמז שחושף מיקום אות נוסף. שמרו רמזים לכשיש 2+ מועמדים שווי סיכוי ואי אפשר להבחין ביניהם.

מודעות לתדירות אותיות: גם ללא רמזים, אפשר להשתמש בתדירות אותיות כדי לבצע ניחושים חכמים יותר. תעדפו אותיות נפוצות שטרם נבדקו.

מאגרי דפוסי מילים: שחקנים מנוסים שומרים מאגרים מנטליים של דפוסי מילים נפוצים. זיהוי דפוסים מוקדם מאפשר עבודה שיטתית.

מודעות לאותיות כפולות: מילות יעד רבות מכילות אותיות כפולות. אם כל הניחושים הראשונים חזרו ללא כפולות, ייתכן שמדובר במילה עם אות כפולה.`,
      },
      {
        title: 'מלכודות נפוצות ואיך להימנע מהן',
        content: `גם שחקנים מנוסים נופלים למלכודות אלו.

מלכודת ראיית המנהרה: אתם משוכנעים שהתשובה היא מילה ספציפית וממשיכים לנסות וריאציות שלה במקום לשקול אפשרויות שונות לחלוטין.

מלכודת המילה הנדירה: מבזבזים ניחוש על מילה לא מוכרת בתקווה למזל. מילות היעד הן מילים יומיומיות נפוצות.

מלכודת קיבוע המיקום: מקבלים אות צהובה וממשיכים לנסות אותה באותם מיקומים שגויים. עקבו אחר אילו מיקומים כבר נבדקו לכל אות צהובה.

מלכודת ניחוש הפאניקה: כשנותרים רק 1-2 ניחושים, שחקנים נבהלים ומגישים את המילה הראשונה שעולה בראש. במקום, הקדישו רגע לסקור את כל הרמזים.

הנקודה העיוורת של אותיות כפולות: שחקנים שוכחים שמילים יכולות להכיל אותיות חוזרות. שמרו אפשרות זו פתוחה.`,
      },
      {
        title: 'טכניקות מתקדמות לשחקנים מומחים',
        content: `טכניקות אלו משמשות שחקנים שפותרים באופן עקבי ב-2-3 ניסיונות.

גישת תורת המידע: כל ניחוש צריך למקסם את הרווח המידע הצפוי. זה אומר לבחור מילים שסביר שייצרו את דפוסי המשוב המגוונים ביותר.

תכנון מותנה: לפני הגשת ניחוש, תכננו את תגובתכם לכל תוצאה אפשרית. "אם א חוזרת ירוקה, אנסה X. אם א חוזרת צהובה, אנסה Y."

משמעת מצב קשה: גם אם המשחק לא מכריח, שחקו ב"מצב קשה" - תמיד השתמשו באותיות ירוקות וצהובות מאושרות בניחושים הבאים.

ניחוש משוקלל תדירות: כשיש מספר מילים מועמדות, בחרו את זו שהאותיות שטרם נבדקו שלה בעלות התדירות המשולבת הגבוהה ביותר.

מהירות זיהוי דפוסים: בנו ספרייה מנטלית של דפוסי מילים נפוצים. זיהוי מיידי של דפוסים אלו חוסך זמן חשיבה יקר.`,
      },
    ],
    faq: [
      {
        question: 'מהי מילת הפתיחה הטובה ביותר לציד מילים בלקסיקלאש?',
        answer: 'מילים פותחות מצוינות בוחנות תנועות נפוצות ועיצורים נפוצים ללא אותיות חוזרות. המטרה היא מקסום איסוף מידע, לא ניחוש התשובה.',
      },
      {
        question: 'כמה ניסיונות יש בציד מילים?',
        answer: 'יש מספר מוגבל של ניסיונות למצוא את המילה הנסתרת. פתרון בפחות ניסיונות מרוויח יותר נקודות ומטבעות. חידת ציד המילים היומית נותנת לכולם את אותה מילת יעד.',
      },
      {
        question: 'מה המשמעות של הצבעים ברמזי ציד מילים?',
        answer: 'ירוק אומר שהאות נכונה ובמיקום הנכון. צהוב אומר שהאות נמצאת במילה אבל במיקום שגוי. אפור אומר שהאות לא נמצאת במילת היעד כלל.',
      },
      {
        question: 'איך אפשר לשפר את שיעור הפתרון בציד מילים?',
        answer: 'השתמשו במילים פותחות שממקסמות מידע, לעולם אל תשתמשו שוב באותיות שנפסלו, בדקו אותיות צהובות במיקומים חדשים באופן שיטתי, ושמרו מאגרים מנטליים של דפוסי מילים נפוצים.',
      },
    ],
    ctaText: 'שחקו ציד מילים',
    ctaLink: '/daily',
    backToGuides: 'חזרה למדריכים',
  },
  sv: {
    title: 'Word Hunt Strategi: Hitta det Dolda Ordet pa Farre Forsok',
    subtitle: 'Bemestra elimineringsstrategi, vokalplacering och ledtradstolkning for att losa Word Hunt-pussel effektivt.',
    category: 'Strategi',
    readTime: '8 min lasning',
    authorName: 'Ordnorden',
    authorBio: 'Word Hunt-specialist med 95% losningsgrad och i genomsnitt 3.2 forsok per pussel.',
    quickTips: [
      'Borja med ett ord som har vanliga vokaler (A, E, I) och vanliga konsonanter (R, S, T, N, L)',
      'Ateranvand aldrig en bokstav du redan vet ar fel - varje gissning ska testa ny information',
      'Var uppmarksam pa positionsledtradar: gront = ratt bokstav ratt plats, gult = ratt bokstav fel plats',
      'Om du far en gul bokstav, prova den i varje ANNAN position i nasta gissning',
      'Anvand dina forsta tva gissningar for att testa 10 olika bokstaver',
      'Vanliga ordslut smalnar av alternativen dramatiskt',
      'Nar du ar fast med 2-3 alternativ, valj ordet med vanligaste bokstavsmonster',
    ],
    sections: [
      {
        title: 'Hur Word Hunt Fungerar',
        content: `Word Hunt ar LexiClashs Wordle-inspirerade pusselmod. Du har ett begraaansat antal forsok att gissa ett dolt malord. Efter varje gissning ger spelet fargkodad feedback pa varje bokstav.

Gront betyder att bokstaven ar korrekt och pa ratt plats. Gult betyder att bokstaven finns i malordet men pa fel plats. Gratt betyder att bokstaven inte finns i malordet alls.

Utmaningen ar att anvanda denna feedback strategiskt for att begransaa mojligheterna och hitta malordet pa sa fa forsok som mojligt. Till skillnad fran Klassiskt eller Blast-lage dar du arbetar med synliga bokstaver, kraver Word Hunt deduktivt resonemang och ordforrad.

Varje dag ger ett nytt Word Hunt-pussel i den Dagliga Utmaningen. Du kan ocksa spela obegransade ovningsrundor.`,
      },
      {
        title: 'Oppningsdraget: Informationsmaximering',
        content: `Din forsta gissning ar det viktigaste draget. Malet med ditt oppningsord ar INTE att gissa svaret - det ar att samla maximal information.

Det ideala oppningsordet har: vanliga vokaler (minst 2), vanliga konsonanter, och inga upprepade bokstaver.

Varfor spelar detta roll? Det finns bokstaver som forekommer i de allra flesta ord. Genom att testa dessa hogfrekventa bokstaver forst eliminerar eller bekraftar du byggstenarna for de flesta mojliga svar.

Daliga oppningsord inkluderar: ord med upprepade bokstaver, ord med sallsynta bokstaver, och ord som inte matchar mallangden.

Avancerad oppningsstrategi: anvand tva kompletterande ord som dina forsta tva gissningar for att testa 9-10 unika bokstaver.`,
      },
      {
        title: 'Lasa Ledtradarna: Gront, Gult och Gratt',
        content: `Efter din forsta gissning beraaattar ledtradarna exakt vad du ska fokusera pa.

Grona bokstaver ar laasta. De gar pa samma plats i varje framtida gissning. Flytta aldrig en gron bokstav.

Gula bokstaver ar svaarast att anvanda val. En gul bokstav beraaattar tva saker: bokstaven FINNS i ordet, men INTE pa den platsen. Var systematisk - prova den pa varje aaterstaende position du inte testat.

Graa bokstaver ar elimineringar. Stryk dem mentalt. Anvand aldrig en graa bokstav igen.

Kombinationslasning: Den verkliga kraften kommer fran att kombinera ledtradar. Om du vet att ordet har ett A (gult fran position 2) och ett R (gront i position 4), kan du borja tanka pa ord med monstret _ _ _ R _ dar A forekommer nagon annanstans an position 2.`,
      },
      {
        title: 'Elimineringsstrategi: Begransaa Faltet',
        content: `Efter 2-3 gissningar bor du ha tillrackligt med information for att dramatiskt begransaa mojligheterna.

Bokstavseliminering: Raakna hur manga bokstaver du har testat. Efter tva bra gissningar utan upprepade bokstaver har du testat 10 av bokstaverna.

Positionslaasning: Grona bokstaver fixerar positioner. Om du har 2 grona bokstaver efter 2 gissningar har du reducerat mojligheterna med ungefar 95%.

Monstermatching: Med gron och gul information kombinerad, borja lista ord som passar monstret.

Nar du ar nere pa 2-3 mojliga ord, valj det med vanligaste bokstavsmonster baserat pa bokstavsfrekvensdata.`,
      },
      {
        title: 'Anvanda Ledtradar Effektivt',
        content: `Word Hunt erbjuder ytterligare ledtradsmekaniker utover grundlaggande fargkodning.

Ledtradssystem: Om du ar fast kan du anvanda en ledtrad som avsloojar en ytterligare bokstavsposition. Spara ledtradar for nar du har 2+ lika sannolika kandidater.

Bokstavsfrekvensmedvetenhet: Aven utan ledtradar kan du anvanda bokstavsfrekvens for smartare gissningar.

Ordmonsterdatabaser: Erfarna spelare underhaller mentala databaser av vanliga ordmonster. Att identifiera monster tidigt mojliggor systematiskt arbete.

Dubbelbokstavsmedvetenhet: Manga malord innehaller dubbla bokstaver. Hall denna mojlighet oppen.`,
      },
      {
        title: 'Vanliga Fallor och Hur Du Undviker Dem',
        content: `Aven erfarna spelare faller i dessa fallor.

Tunnelseendefaallan: Du blir overtygad om att svaret ar ett specifikt ord och fortsatter prova variationer istallet for att overvaaga helt andra alternativ.

Sallsynt-ord-faallan: Du sloosar en gissning pa ett obskyrt ord. Word Hunt-mal ar vanliga, vardagliga ord.

Positionsfixeringsfaallan: Du far en gul bokstav och fortsatter prova den pa samma felaktiga positioner.

Panikgissningsfaallan: Med bara 1-2 gissningar kvar, panikskickar spelare det forsta ordet som dyker upp. Ta istallet en stund att granska ALLA ledtradar.

Dubbelbokstavs blinda flack: Spelare glommerr ofta att ord kan ha upprepade bokstaver.`,
      },
      {
        title: 'Avancerade Tekniker for Expertspelare',
        content: `Dessa tekniker anvands av spelare som konsekvent loser pa 2-3 forsok.

Informationsteoretisk metod: Varje gissning bor maximera den forvantade informationsvinsten.

Villkorlig planering: Innan du skickar en gissning, planera din respons pa VARJE mojligt utfall.

Svart lage-disciplin: Spela alltid i "svart lage" - anvand alltid bekraftade grona och gula bokstaver i efterfoljande gissningar.

Frekvensvaagd gissning: Nar du har flera kandidatord, valj det vars otestade bokstaver har hogst kombinerad frekvens.

Monsterigenkanning: Bygg ett mentalt bibliotek av vanliga ordmonster for omedelbar identifiering.`,
      },
    ],
    faq: [
      {
        question: 'Vad ar det basta startordet for Word Hunt i LexiClash?',
        answer: 'Ord som testar vanliga vokaler och konsonanter utan upprepade bokstaver ar utmarkta oppnare. Malet ar maximal informationsinsamling.',
      },
      {
        question: 'Hur manga forsok far jag i Word Hunt?',
        answer: 'Du far ett begraaansat antal forsok. Att losa pa farre forsok ger mer poang och mynt.',
      },
      {
        question: 'Vad betyder fargerna i Word Hunt-ledtradar?',
        answer: 'Gront = ratt bokstav ratt plats. Gult = ratt bokstav fel plats. Gratt = bokstaven finns inte i malordet.',
      },
      {
        question: 'Hur kan jag forbattra min losningsgrad i Word Hunt?',
        answer: 'Anvand informationsmaximerand oppnare, ateranvand aldrig eliminerade bokstaver, testa gula bokstaver systematiskt i nya positioner.',
      },
    ],
    ctaText: 'Spela Word Hunt',
    ctaLink: '/daily',
    backToGuides: 'Tillbaka till guider',
  },
  ja: {
    title: 'ワードハント攻略：より少ない試行で隠された単語を見つける',
    subtitle: '消去法、母音配置、ヒントの解釈をマスターしてワードハントパズルを効率的に解こう。',
    category: '攻略',
    readTime: '8分で読める',
    authorName: 'ワードオタク',
    authorBio: '95%の解決率と1パズルあたり平均3.2回の試行のワードハントスペシャリスト。',
    quickTips: [
      '一般的な母音と子音を含む単語で始める',
      '既に間違いと分かった文字は絶対に再使用しない - 各推測で新しい情報をテストする',
      '位置ヒントに注意：緑=正しい文字正しい位置、黄色=正しい文字間違った位置',
      '黄色の文字を得たら、次の推測で他のすべての位置で試す',
      '最初の2回の推測で10個の異なる文字をテスト - 情報収集を最大化',
      '一般的な単語の末尾パターンが選択肢を劇的に絞り込む',
      '2-3個の選択肢で行き詰まったら、最も一般的な文字パターンの単語を選ぶ',
    ],
    sections: [
      {
        title: 'ワードハントの仕組み',
        content: `ワードハントはLexiClashのWordle風パズルモードです。限られた回数の試行で隠されたターゲット単語を推測します。各推測後、ゲームはすべての文字に色分けされたフィードバックを提供します。

緑は文字が正しく正しい位置にあることを意味します。黄色は文字がターゲット単語に存在するが間違った位置にあることを意味します。灰色は文字がターゲット単語に全く含まれていないことを意味します。

チャレンジは、このフィードバックを戦略的に使用して可能性を絞り込み、できるだけ少ない試行でターゲット単語を見つけることです。文字が見えるクラシックやブラストモードとは異なり、ワードハントは演繹的推論と語彙知識を必要とします。

毎日新しいワードハントパズルがデイリーチャレンジに登場します。シングルプレイヤーモードで無制限の練習ラウンドもプレイできます。`,
      },
      {
        title: 'オープニングムーブ：情報の最大化',
        content: `最初の推測はワードハントで最も重要な手です。すべての後続の基盤を築きます。オープニングワードの目標は答えを推測することではなく、最大限の情報を収集することです。

理想的なオープニングワードは：一般的な母音（少なくとも2つ）、一般的な子音、重複する文字がないものです。

なぜこれが重要なのか？文字の頻度は大きく異なります。高頻度の文字を最初にテストすることで、ほとんどの可能な答えの構成要素を排除または確認できます。

悪いオープニングワード：重複文字のある単語（テストするユニークな文字が少ない）、珍しい文字のある単語、ターゲットの長さに合わない単語。

上級オープナー戦略：最初の2回の推測として2つの補完的な単語を使用し、9-10個のユニークな文字をテストします。`,
      },
      {
        title: 'ヒントを読む：緑、黄色、灰色',
        content: `最初の推測後、ヒントは正確に何に集中すべきかを教えてくれます。

緑の文字はロックされます。将来のすべての推測で同じ位置に配置します。緑の文字は絶対に動かさないでください。

黄色の文字は最もうまく使うのが難しいです。黄色の文字は2つのことを示します：文字は単語に存在するが、その位置にはない。多くのプレイヤーは黄色の文字をランダムな新しい位置に移動する間違いを犯します。代わりに、系統的にまだテストしていない各位置で試してください。

灰色の文字は排除です。精神的に消してください。灰色の文字は二度と使わないでください。

組み合わせ読み：本当の力はヒントを組み合わせることから生まれます。`,
      },
      {
        title: '消去法：フィールドの絞り込み',
        content: `2-3回の推測後、可能性を劇的に絞り込むのに十分な情報があるはずです。

文字の消去：テストした文字の数を数えます。重複なしの2回の良い推測で、文字の約40%をテストしたことになります。

位置のロック：緑の文字は位置を固定します。2回の推測後に2つの緑の文字があれば、それらの位置の可能性を約95%削減しています。

パターンマッチング：緑と黄色の情報を組み合わせて、パターンに合う単語をリストアップし始めます。

制約の強化テクニック：新しい情報の各ピースが候補リストを劇的に減らすべきです。

2-3個の可能な単語に絞り込んだら、最も一般的な文字パターンを持つものを選びます。`,
      },
      {
        title: 'ヒントの効果的な使用',
        content: `ワードハントは基本的な色分け以外にも多くのプレイヤーが見落とすヒントメカニクスを提供します。

ヒントシステム：行き詰まった場合、追加の文字位置を明らかにするヒントを使用できます。2つ以上の同様に可能性のある候補がある場合にヒントを温存してください。

文字頻度の認識：ヒントなしでも、文字頻度を使用してよりスマートな推測ができます。

単語パターンデータベース：経験豊富なプレイヤーは一般的な単語パターンのメンタルデータベースを維持します。

二重文字の認識：多くのターゲット単語には二重文字が含まれています。この可能性を開いておいてください。`,
      },
      {
        title: 'よくある罠とその回避方法',
        content: `経験豊富なプレイヤーでもこれらの罠に陥ります。

トンネルビジョンの罠：答えが特定の単語だと確信し、完全に異なるオプションを考慮する代わりにそのバリエーションを試し続ける。

珍しい単語の罠：ラッキーブレイクを期待して稀な単語で推測を浪費する。ワードハントのターゲットは一般的な日常の単語です。

位置固定の罠：黄色の文字を得て、同じ間違った位置で試し続ける。

パニック推測の罠：残り1-2回の推測で、プレイヤーがパニックになり最初に思いついた単語を送信する。代わりに、すべてのヒントを確認する時間を取りましょう。

二重文字の盲点：単語に繰り返し文字が含まれる可能性を忘れる。`,
      },
      {
        title: 'エキスパートプレイヤーのための上級テクニック',
        content: `これらのテクニックは一貫して2-3回の試行で解決するプレイヤーが使用します。

情報理論アプローチ：各推測は期待される情報利得を最大化すべきです。

条件付き計画：推測を送信する前に、考えられる各結果への対応を計画します。

ハードモード規律：ゲームが強制しなくても、確認された緑と黄色の文字を常に後続の推測で使用する「ハードモード」でプレイします。

頻度加重推測：複数の候補単語がある場合、テストされていない文字の合計頻度が最も高いものを選びます。

パターン認識速度：一般的な単語パターンのメンタルライブラリを構築します。`,
      },
    ],
    faq: [
      {
        question: 'LexiClashのワードハントで最良の開始単語は何ですか？',
        answer: '一般的な母音と子音をテストし、重複文字のない単語が優れたオープナーです。目標は情報収集の最大化であり、答えの推測ではありません。',
      },
      {
        question: 'ワードハントでは何回試行できますか？',
        answer: '隠された単語を見つけるための限られた試行回数があります。より少ない試行で解決するとより多くのポイントとコインを獲得します。',
      },
      {
        question: 'ワードハントのヒントの色は何を意味しますか？',
        answer: '緑=正しい文字正しい位置。黄色=正しい文字間違った位置。灰色=文字はターゲット単語に含まれていない。',
      },
      {
        question: 'ワードハントの解決率を向上させるにはどうすればよいですか？',
        answer: '情報を最大化するオープナーを使用し、排除された文字を再使用せず、黄色の文字を系統的に新しい位置でテストし、一般的な単語パターンのメンタルデータベースを維持してください。',
      },
    ],
    ctaText: 'ワードハントをプレイ',
    ctaLink: '/daily',
    backToGuides: 'ガイドに戻る',
  },
  es: {
    title: 'Estrategia de Word Hunt: Encuentra la Palabra Oculta en Menos Intentos',
    subtitle: 'Domina la estrategia de eliminacion, colocacion de vocales e interpretacion de pistas para resolver puzzles eficientemente.',
    category: 'Estrategia',
    readTime: '8 min de lectura',
    authorName: 'El Nerd de las Palabras',
    authorBio: 'Especialista en Word Hunt con 95% de tasa de resolucion y promedio de 3.2 intentos por puzzle.',
    quickTips: [
      'Comienza con una palabra que tenga vocales comunes (A, E, I) y consonantes comunes (R, S, T, N, L)',
      'Nunca reutilices una letra que ya sabes que esta mal - cada intento debe probar informacion nueva',
      'Presta atencion a las pistas de posicion: verde = letra correcta lugar correcto, amarillo = letra correcta lugar equivocado',
      'Si obtienes una letra amarilla, pruebala en cada OTRA posicion en tu siguiente intento',
      'Usa tus dos primeros intentos para probar 10 letras diferentes - maximiza la recopilacion de informacion',
      'Terminaciones comunes de palabras reducen las opciones dramaticamente',
      'Cuando estes atascado con 2-3 opciones, elige la palabra con los patrones de letras mas comunes',
    ],
    sections: [
      {
        title: 'Como Funciona Word Hunt',
        content: `Word Hunt es el modo puzzle inspirado en Wordle de LexiClash. Tienes un numero limitado de intentos para adivinar una palabra objetivo oculta. Despues de cada intento, el juego te da retroalimentacion codificada por colores en cada letra.

Verde significa que la letra es correcta y esta en la posicion correcta. Amarillo significa que la letra existe en la palabra objetivo pero esta en la posicion equivocada. Gris significa que la letra no esta en la palabra objetivo.

El desafio es usar esta retroalimentacion estrategicamente para reducir posibilidades y encontrar la palabra objetivo en el menor numero de intentos posible. A diferencia del modo Clasico o Blast donde trabajas con letras visibles, Word Hunt requiere razonamiento deductivo y conocimiento de vocabulario.

Cada dia trae un nuevo puzzle de Word Hunt en el Desafio Diario. Tambien puedes jugar rondas de practica ilimitadas.`,
      },
      {
        title: 'El Movimiento de Apertura: Maximizacion de Informacion',
        content: `Tu primer intento es el movimiento mas importante. El objetivo de tu palabra de apertura NO es adivinar la respuesta - es recopilar maxima informacion.

La palabra de apertura ideal tiene: vocales comunes (al menos 2), consonantes comunes, y sin letras repetidas.

Por que importa? Las letras tienen frecuencias muy diferentes. Al probar letras de alta frecuencia primero, eliminas o confirmas los bloques de construccion de la mayoria de las respuestas posibles.

Malas palabras de apertura incluyen: palabras con letras repetidas, palabras con letras raras, y palabras que no coinciden con la longitud objetivo.

Estrategia de apertura avanzada: usa dos palabras complementarias como tus dos primeros intentos para probar 9-10 letras unicas.`,
      },
      {
        title: 'Leyendo las Pistas: Verde, Amarillo y Gris',
        content: `Despues de tu primer intento, las pistas te dicen exactamente en que enfocarte.

Letras verdes estan bloqueadas. Van en la misma posicion en cada intento futuro. Nunca muevas una letra verde.

Letras amarillas son las mas dificiles de usar bien. Una letra amarilla te dice dos cosas: la letra ESTA en la palabra, pero NO en esa posicion. Se sistematico - pruebala en cada posicion restante que no hayas probado.

Letras grises son eliminaciones. Tachalas mentalmente. Nunca uses una letra gris de nuevo.

Lectura combinada: El verdadero poder viene de combinar pistas. Si sabes que la palabra tiene una A (amarilla de posicion 2) y una R (verde en posicion 4), puedes empezar a pensar en palabras con el patron _ _ _ R _ donde A aparece en otro lugar que no sea posicion 2.`,
      },
      {
        title: 'Estrategia de Eliminacion: Reduciendo el Campo',
        content: `Despues de 2-3 intentos, deberias tener suficiente informacion para reducir dramaticamente las posibilidades.

Eliminacion de letras: Cuenta cuantas letras has probado. Despues de dos buenos intentos sin letras repetidas, has probado 10 letras. Eso es casi 40% del alfabeto.

Bloqueo de posicion: Letras verdes fijan posiciones. Si tienes 2 letras verdes despues de 2 intentos, has reducido posibilidades en aproximadamente 95%.

Coincidencia de patrones: Con informacion verde y amarilla combinada, empieza a listar palabras que encajen en el patron.

La tecnica de ajuste de restricciones: Cada nueva pieza de informacion deberia reducir dramaticamente tu lista de candidatos.

Cuando te quedan 2-3 palabras posibles, elige la que tenga los patrones de letras mas comunes.`,
      },
      {
        title: 'Usando Pistas Efectivamente',
        content: `Word Hunt proporciona mecanicas de pistas adicionales mas alla de la codificacion basica de colores.

Sistema de pistas: Si estas atascado, puedes usar una pista que revela una posicion de letra adicional. Guarda pistas para cuando tengas 2+ candidatos igualmente probables.

Conciencia de frecuencia de letras: Incluso sin pistas, puedes usar la frecuencia de letras para hacer intentos mas inteligentes.

Bases de datos de patrones de palabras: Los jugadores experimentados mantienen bases de datos mentales de patrones comunes. Identificar patrones temprano permite trabajo sistematico.

Conciencia de letras dobles: Muchas palabras objetivo contienen letras dobles. Mantiene esta posibilidad abierta.`,
      },
      {
        title: 'Trampas Comunes y Como Evitarlas',
        content: `Incluso jugadores experimentados caen en estas trampas.

La trampa de vision de tunel: Te convences de que la respuesta es una palabra especifica y sigues probando variaciones en lugar de considerar opciones completamente diferentes.

La trampa de la palabra rara: Desperdicias un intento en una palabra oscura. Los objetivos de Word Hunt son palabras comunes y cotidianas.

La trampa de fijacion de posicion: Obtienes una letra amarilla y sigues probandola en las mismas posiciones equivocadas.

La trampa del intento panico: Con solo 1-2 intentos restantes, los jugadores entran en panico. Toma un momento para revisar TODAS tus pistas.

El punto ciego de letras dobles: Los jugadores olvidan que las palabras pueden tener letras repetidas.`,
      },
      {
        title: 'Tecnicas Avanzadas para Jugadores Expertos',
        content: `Estas tecnicas son usadas por jugadores que consistentemente resuelven en 2-3 intentos.

Enfoque de teoria de la informacion: Cada intento debe maximizar la ganancia de informacion esperada.

Planificacion condicional: Antes de enviar un intento, planifica tu respuesta a CADA resultado posible.

Disciplina de modo dificil: Siempre usa letras verdes y amarillas confirmadas en intentos subsiguientes.

Adivinanza ponderada por frecuencia: Cuando tienes multiples palabras candidatas, elige la cuyas letras no probadas tengan la frecuencia combinada mas alta.

Velocidad de reconocimiento de patrones: Construye una biblioteca mental de patrones comunes de palabras para identificacion instantanea.`,
      },
    ],
    faq: [
      {
        question: 'Cual es la mejor palabra inicial para Word Hunt en LexiClash?',
        answer: 'Palabras que prueban vocales y consonantes comunes sin letras repetidas son excelentes aperturas. El objetivo es maximizar la recopilacion de informacion.',
      },
      {
        question: 'Cuantos intentos tengo en Word Hunt?',
        answer: 'Tienes un numero limitado de intentos. Resolver en menos intentos gana mas puntos y monedas.',
      },
      {
        question: 'Que significan los colores en las pistas de Word Hunt?',
        answer: 'Verde = letra correcta lugar correcto. Amarillo = letra correcta lugar equivocado. Gris = la letra no esta en la palabra objetivo.',
      },
      {
        question: 'Como puedo mejorar mi tasa de resolucion en Word Hunt?',
        answer: 'Usa aperturas que maximicen informacion, nunca reutilices letras eliminadas, prueba letras amarillas sistematicamente en nuevas posiciones.',
      },
    ],
    ctaText: 'Juega Word Hunt',
    ctaLink: '/daily',
    backToGuides: 'Volver a guias',
  },
};
