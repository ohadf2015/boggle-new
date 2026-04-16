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
    title: 'Word Hunt Strategy: How I Went From 5 Guesses to Solving in 3',
    subtitle: 'Real tactics from hundreds of rounds. Opener picks, clue reading tricks, and the traps I kept falling into.',
    category: 'Strategy',
    readTime: '8 min read',
    authorName: 'Ohad Fisher',
    authorBio: 'I track my stats obsessively. 95% solve rate, 3.2 average attempts. Yes, I have a spreadsheet.',
    quickTips: [
      'STARE or CRANE as openers. I flip between them depending on my mood. Both cover the letters that matter.',
      'Reusing a gray letter is the #1 beginner mistake. I still catch myself doing it when I rush.',
      'Green = right letter, right spot. Yellow = right letter, wrong spot. Tattoo this on your brain.',
      'Got a yellow? Dont just move it randomly. Try it in every position you havent tested yet.',
      'Two good openers with no overlapping letters = 10 letters tested. Thats 40% of the alphabet in 2 guesses.',
      'Learn the -IGHT, -OUND, -ATCH clusters. Once you spot one, the answer is usually hiding in there.',
      'Down to 2-3 options? Go with the more common word. The answer is almost never the obscure one.',
    ],
    sections: [
      {
        title: 'So What Actually Is Word Hunt?',
        content: `If youve played Wordle, you already get it. Word Hunt is LexiClashs take on the formula: guess the hidden word, get color-coded feedback, repeat until you nail it or run out of attempts.

Green tile means right letter, right spot. Yellow means the letter is in the word but youve got it in the wrong place. Gray means that letter isnt in the word at all. Simple enough on paper, but the deductive puzzle it creates is genuinely addictive.

What makes it different from Classic or Blast mode (where the letters are right there on the board) is that youre working blind. Its pure deduction and vocabulary. I find it way more satisfying when I crack one in 2 tries than anything else in the game, honestly.

Theres a fresh puzzle every day in the Daily Challenge, plus unlimited practice rounds if youre like me and cant stop after just one. Fewer guesses = more points and coins, which is the carrot that turned me from a casual player into someone who genuinely thinks about letter frequency at breakfast.`,
      },
      {
        title: 'Your Opener Matters More Than You Think',
        content: `Heres a mistake I made for my first 50+ rounds: I tried to guess the actual word on attempt one. Dont do this. Your first guess isnt about being right. Its about learning as much as possible.

I rotate between STARE and CRANE. Both hit common vowels (A, E) and high-frequency consonants (S, T, R, N) with zero repeated letters. SLATE and ROAST work great too. The point is youre testing the letters that show up in the most English words.

Think about it: E, T, A, O, I, N, S, R appear in something like 80% of common words. If your opener checks 5 of those, youve immediately got a massive head start.

What NOT to open with: TEETH (only tests 3 unique letters, total waste), JAZZY (cool word, terrible opener), or anything with Q, X, or Z. Those letters almost never show up in the answer.

My favorite trick: pair two complementary openers. STARE then COIL gives you 9 unique letters across two guesses and covers all 5 vowels. After those two, I usually know enough to start zeroing in.`,
      },
      {
        title: 'Reading the Clues Without Losing Your Mind',
        content: `OK so youve made your first guess and the colors come back. Heres where most people (including past me) go wrong.

Green letters are easy. Lock them in. If S lights up green in position 1, every guess from now on starts with S. No exceptions, no cleverness. Just lock it.

Yellow letters are where it gets tricky, and where I wasted the most guesses early on. A yellow A in position 2 means two things: A IS in the word, and A is NOT in position 2. The trap is moving it to some random spot. Instead, be methodical. Try position 1, then 3, then 4. Check them off as you go.

Gray letters are gone. Dead to you. Forget they exist. I cannot tell you how many times Ive caught myself trying an R that I already knew was gray because I wasnt paying attention. If you remember one thing from this guide, its this: never reuse gray letters.

The real magic happens when you combine everything. Say you know A is yellow from position 2 and R is green in position 4. Now youre looking for _ _ _ R _ with an A somewhere thats not position 2. That constraint alone usually cuts your options down to a handful.`,
      },
      {
        title: 'Narrowing It Down (The Fun Part)',
        content: `After 2 good guesses, you should have tested around 10 letters. Thats nearly 40% of the alphabet eliminated or confirmed. If you dont feel like the field has narrowed dramatically, your guesses probably had too much overlap.

Green letters are the best. Two greens after two guesses means roughly 95% of possibilities for those positions are gone. Its a beautiful feeling.

This is where I start scribbling (mentally or literally). I take the pattern I know and just list words that fit. Position 1 is S, position 4 is R, A goes somewhere thats not position 2? OK: SHARP, SNARE, SUGAR, SOLAR... then I cross-reference against my gray letters and the list shrinks fast.

Heres a principle that changed my game: every guess should roughly halve your remaining options. If a guess only eliminates one or two words, it wasnt a good guess. You want maximum carnage with each attempt.

When Im down to 2-3 candidates, I go with gut frequency. SHARE before SNARE. SNARE before SCARE. The more common the word feels, the more likely it is to be the answer. The puzzle designers arent trying to stump you with obscure vocab.`,
      },
      {
        title: 'Getting More Out of Hints and Patterns',
        content: `Theres a hint system in Word Hunt that reveals an extra letter position, and I have opinions about when to use it.

Dont use a hint when you still have 5+ possible words. Another guess will give you way more information than a single letter reveal. Save hints for when youre staring at 2-3 equally plausible candidates and you genuinely cant tell which one it is. Thats when a hint pays for itself.

Even without hints, letter frequency is your secret weapon. After the big ones (E, T, A, O, I, N, S, R), the next tier is H, L, D, C, U, M, F, P. If your first two guesses havent touched any of those, make sure guess 3 does.

I keep mental "clusters" of word endings, and this has probably saved me more guesses than anything else. Once I see _IGHT forming, I know Im looking at light/right/sight/might/night/fight/tight and I can usually nail it in one more guess. Same with -OUND (bound/found/hound/mound/pound/round/sound/wound). Build these clusters in your head and you start recognizing patterns almost instantly.

Oh, and double letters. They get me every time. SLEEP, TEETH, LLAMA. If all your guesses come back clean with no doubles, thats actually a signal that the answer might HAVE doubles. Try words with LL, SS, EE, TT. I once spent 4 guesses not considering doubles and felt extremely foolish.`,
      },
      {
        title: 'Traps I Keep Falling Into (And You Will Too)',
        content: `I want to be honest: I still fall into some of these. Knowing about them helps, but in the moment, your brain just does what it wants.

Tunnel vision. This is the big one. You convince yourself its CRANE, so you try CRANE, CRONE, CRAZE... meanwhile the answer is PLUMB and shares zero letters. If your guess comes back all gray, that means the answer has NOTHING in common with what you tried. Force yourself to think in a completely different direction.

Rare word syndrome. Ive done it. "Maybe its KNOLL? FJORD?" No. Its almost certainly a word you use in everyday conversation. If you wouldnt say it to a friend, its probably not the answer.

Position fixation. You get a yellow T, try it in position 3, still yellow, try position 3 again because you forgot. Keep a mental (or physical) checklist of where youve tested each yellow letter. I actually mouth the positions to myself: "T not 1, not 3, try 4."

The panic guess. Two guesses left, brain goes blank, you slam in whatever word pops into your head. Stop. Take 10 seconds. Re-read every clue. List every constraint. The answer has to satisfy ALL of them. That moment of calm has saved my solve streak more than once.

Double letter blindness. If E came back yellow once, remember: the word might have TWO Es. I lost a really obvious GEESE once because I assumed one E was enough. Embarrassing, but educational.`,
      },
      {
        title: 'The Tricks That Got Me to a 2-3 Average',
        content: `This is the stuff that separated "pretty good" from "annoying my friends with my solve rate."

Before I submit a guess, I play out every scenario in my head. If A comes back green, Ill try THIS. Yellow, Ill try THAT. Gray, something else entirely. It sounds slow but it actually speeds you up because youre not sitting there re-analyzing after every result.

I play hard mode even when the game doesnt force it. That means every guess uses all confirmed green and yellow letters. It feels restrictive at first, but it forces you into efficient play. You cant waste a guess on a throwaway word that ignores what you already know.

Frequency-weighted picking. When Ive got 3 candidate words, I dont just pick one randomly. I look at which untested letters are most common in English. If one candidate tests an H and another tests a Z, I go with H every time. Even if that guess is wrong, the feedback will be more useful.

And honestly? Just play a lot. After a few hundred rounds, you start seeing patterns without thinking about them. -ATCH, -OUND, -IGHT, -TION, -NESS. Your brain builds a lookup table over time, and that pattern recognition is what turns a 4-guess average into a 3-guess average. Theres no shortcut for it. But thats also what makes the improvement feel earned.`,
      },
    ],
    faq: [
      {
        question: 'What is the best starting word for Word Hunt in LexiClash?',
        answer: 'I personally go back and forth between STARE and CRANE. Both hit the most common vowels and consonants without repeating any letters. The whole point of your opener is to learn stuff, not to get lucky and guess right.',
      },
      {
        question: 'How many attempts do I get in Word Hunt?',
        answer: 'You get a limited number of tries. The fewer guesses you need, the more points and coins you walk away with. The daily puzzle is the same word for everyone, which makes it fun to compare with friends.',
      },
      {
        question: 'What do the colors mean in Word Hunt clues?',
        answer: 'Green = right letter, right position. Yellow = letter is in the word but you put it in the wrong spot. Gray = not in the word at all. Green is great, yellow is useful, gray is information too (now you know what to avoid).',
      },
      {
        question: 'How can I improve my Word Hunt solve rate?',
        answer: 'Start with a strong opener like STARE or CRANE, never reuse gray letters (seriously, this alone will help), be systematic about testing yellow letters in new positions, and start memorizing word-ending clusters like -IGHT and -OUND. Itll feel slow at first but your average will drop fast.',
      },
    ],
    ctaText: 'Play Word Hunt',
    ctaLink: '/daily',
    backToGuides: 'Back to Guides',
  },
  he: {
    title: 'אסטרטגיית ציד מילים: איך ירדתי מ-5 ניחושים לפתרון ב-3',
    subtitle: 'טקטיקות אמיתיות ממאות סיבובים. בחירת מילה פותחת, טריקים לקריאת רמזים, והמלכודות שנפלתי אליהן שוב ושוב.',
    category: 'אסטרטגיה',
    readTime: '8 דקות קריאה',
    authorName: 'חנון המילים',
    authorBio: 'אני עוקב אחרי הסטטיסטיקות שלי באובססיביות. 95% פתרון, ממוצע 3.2 ניסיונות. כן, יש לי אקסל.',
    quickTips: [
      'אני מחליף בין כמה מילים פותחות טובות בהתאם למצב רוח. שתיהן בודקות את האותיות שחשובות.',
      'שימוש חוזר באות אפורה זו טעות מספר 1 של מתחילים. אני עדיין תופס את עצמי עושה את זה כשממהר.',
      'ירוק = אות נכונה, מקום נכון. צהוב = אות נכונה, מקום לא נכון. תקעקעו את זה על המוח.',
      'קיבלתם צהוב? אל תזיזו את האות סתם. נסו אותה בכל מיקום שטרם בדקתם.',
      'שתי מילים פותחות טובות בלי אותיות חופפות = 10 אותיות בדוקות. זה 40% מהאלפבית ב-2 ניחושים.',
      'תלמדו את האשכולות -ים, -ות, -ון, -ית. ברגע שמזהים אחד, התשובה בדרך כלל מסתתרת שם.',
      'נותרו 2-3 אפשרויות? לכו על המילה הנפוצה יותר. התשובה כמעט אף פעם לא המילה המוזרה.',
    ],
    sections: [
      {
        title: 'אז מה זה בעצם ציד מילים?',
        content: `אם שיחקתם וורדל, אתם כבר מבינים. ציד מילים זה הגרסה של לקסיקלאש לנוסחה: נחשו את המילה הנסתרת, קבלו משוב צבעוני, חזרו על זה עד שפוצחים או שנגמרים הניסיונות.

אריח ירוק אומר אות נכונה, מקום נכון. צהוב אומר שהאות נמצאת במילה אבל שמתם אותה במקום הלא נכון. אפור אומר שהאות לא נמצאת במילה בכלל. פשוט על הנייר, אבל הפאזל הדדוקטיבי שזה יוצר ממכר ברמות מטורפות.

מה שהופך את זה לשונה ממצב קלאסי או בלאסט (שם האותיות נמצאות שם על הלוח) הוא שעובדים בעיוורון. זה דדוקציה טהורה ואוצר מילים. אני מרגיש הרבה יותר סיפוק כשפוצח אחד ב-2 ניסיונות מאשר כל דבר אחר במשחק, בכנות.

יש חידה חדשה כל יום באתגר היומי, פלוס סיבובי תרגול בלתי מוגבלים למי שכמוני ולא יכול לעצור אחרי אחד. פחות ניחושים = יותר נקודות ומטבעות, שזה הגזר שהפך אותי משחקן מזדמן למישהו שבאמת חושב על תדירות אותיות בארוחת בוקר.`,
      },
      {
        title: 'המילה הפותחת חשובה יותר ממה שחושבים',
        content: `הנה טעות שעשיתי ב-50+ הסיבובים הראשונים: ניסיתי לנחש את המילה בפועל בניסיון הראשון. אל תעשו את זה. הניחוש הראשון הוא לא בשביל לצדוק. הוא בשביל ללמוד כמה שיותר.

אני מחליף בין כמה מילים פותחות שבודקות תנועות נפוצות ועיצורים בתדירות גבוהה בלי אותיות חוזרות. העיקר הוא שבודקים את האותיות שמופיעות בהכי הרבה מילים.

חשבו על זה: יש אותיות שמופיעות בבערך 80% מהמילים הנפוצות. אם המילה הפותחת שלכם בודקת 5 מהן, יש לכם מיד יתרון מסיבי.

עם מה לא לפתוח: מילים עם אותיות כפולות (בודקות פחות אותיות ייחודיות, בזבוז), מילים עם אותיות נדירות, או כל דבר שלא תואם את אורך היעד.

הטריק האהוב עליי: לשלב שתי מילים פותחות משלימות. שתי מילים בלי חפיפה נותנות 9-10 אותיות ייחודיות על פני שני ניחושים. אחרי שתיהן, בדרך כלל יש לי מספיק מידע להתחיל לצמצם.`,
      },
      {
        title: 'לקרוא את הרמזים בלי לאבד את השפיות',
        content: `אוקיי אז עשיתם את הניחוש הראשון והצבעים חוזרים. הנה איפה רוב האנשים (כולל אני בעבר) טועים.

אותיות ירוקות קלות. נועלים אותן. אם ש נדלקת ירוקה במיקום 1, כל ניחוש מעכשיו מתחיל ב-ש. בלי חריגים, בלי יצירתיות. פשוט לנעול.

אותיות צהובות זה איפה שזה נהיה מסובך, ואיפה שבזבזתי הכי הרבה ניחושים בהתחלה. א צהובה במיקום 2 אומרת שני דברים: א כן נמצאת במילה, ו-א לא נמצאת במיקום 2. המלכודת היא להזיז אותה למיקום אקראי. במקום, תהיו שיטתיים. נסו מיקום 1, אז 3, אז 4. תסמנו תוך כדי.

אותיות אפורות נעלמו. מתות בשבילכם. תשכחו שהן קיימות. אני לא יכול לספר כמה פעמים תפסתי את עצמי מנסה ר שכבר ידעתי שהיא אפורה כי לא שמתי לב. אם תזכרו דבר אחד מהמדריך הזה, זה: לעולם אל תשתמשו שוב באות אפורה.

הקסם האמיתי קורה כשמשלבים הכל. נגיד שאתם יודעים ש-א צהובה ממיקום 2 ו-ר ירוקה במיקום 4. עכשיו מחפשים _ _ _ ר _ עם א במקום שזה לא מיקום 2. המגבלה הזו לבד בדרך כלל מצמצמת את האפשרויות לקומץ.`,
      },
      {
        title: 'לצמצם את זה (החלק הכיפי)',
        content: `אחרי 2 ניחושים טובים, הייתם צריכים לבדוק בערך 10 אותיות. זה כמעט 40% מהאלפבית שנפסלו או אושרו. אם לא מרגיש שהשדה הצטמצם דרמטית, כנראה שהניחושים שלכם חפפו יותר מדי.

אותיות ירוקות הן הכי טובות. שתי ירוקות אחרי שני ניחושים אומר שבערך 95% מהאפשרויות למיקומים האלה נפסלו. תחושה מדהימה.

פה אני מתחיל לשרבט (מנטלית או ממש). לוקח את הדפוס שאני יודע ופשוט מפרט מילים שמתאימות. מיקום 1 זה ש, מיקום 4 זה ר, א הולכת למקום שזה לא מיקום 2? אוקיי: שמירה, שעורה, שחררה... אז מצליבים עם האותיות האפורות והרשימה מצטמצמת מהר.

הנה עיקרון ששינה לי את המשחק: כל ניחוש צריך לצמצם בערך חצי מהאפשרויות שנשארו. אם ניחוש מבטל רק מילה אחת או שתיים, הוא לא היה ניחוש טוב. רוצים טבח מקסימלי עם כל ניסיון.

כשנשארים עם 2-3 מועמדים, אני הולך עם תחושת תדירות. מילה נפוצה לפני מילה נדירה. מעצבי החידות לא מנסים לתקוע אתכם עם אוצר מילים אקזוטי.`,
      },
      {
        title: 'להוציא יותר מרמזים ודפוסים',
        content: `יש מערכת רמזים בציד מילים שחושפת מיקום אות נוסף, ויש לי דעות לגבי מתי להשתמש בזה.

אל תשתמשו ברמז כשעדיין יש 5+ מילים אפשריות. ניחוש נוסף ייתן הרבה יותר מידע מחשיפת אות אחת. תשמרו רמזים לכשבוהים ב-2-3 מועמדים שווים ובאמת אי אפשר לדעת מי מהם. שם רמז משלם על עצמו.

גם בלי רמזים, תדירות אותיות היא הנשק הסודי שלכם. אחרי האותיות הגדולות, השכבה הבאה היא ל, ד, כ, מ, פ. אם שני הניחושים הראשונים לא נגעו באלה, תוודאו שניחוש 3 כן.

אני שומר "אשכולות" מנטליים של סיומות מילים, וזה כנראה חסך לי יותר ניחושים מכל דבר אחר. ברגע שרואים _ות מתגבש, יודעים שמחפשים משהו כמו שמירות/ברכות/מתנות ובדרך כלל אפשר לסגור את זה בעוד ניחוש. אותו דבר עם -ים, -ון, -ית. בנו את האשכולות האלה בראש ותתחילו לזהות דפוסים כמעט מיידית.

אה, ואותיות כפולות. הן תופסות אותי כל פעם. אם כל הניחושים חוזרים נקיים בלי כפולות, זה דווקא סימן שלתשובה אולי יש כפולות. לקח לי חודשים להבין את זה.`,
      },
      {
        title: 'מלכודות שאני ממשיך ליפול אליהן (וגם אתם)',
        content: `אני רוצה להיות כנה: אני עדיין נופל לחלק מאלה. לדעת עליהן עוזר, אבל ברגע האמת, המוח פשוט עושה מה שהוא רוצה.

ראיית מנהרה. זו הגדולה. משכנעים את עצמכם שזה בטוח מילה ספציפית, אז מנסים את זה, וריאציה, עוד וריאציה... בינתיים התשובה היא משהו אחר לגמרי שלא חולק אף אות. אם הניחוש חוזר כולו אפור, זה אומר שלתשובה אין שום דבר משותף עם מה שניסיתם. תכריחו את עצמכם לחשוב בכיוון אחר לגמרי.

סינדרום המילה הנדירה. עשיתי את זה. "אולי זה קוקייה? פלפלון?" לא. זו כמעט בוודאות מילה שמשתמשים בה בשיחה יומיומית. אם לא הייתם אומרים את זה לחבר, זו כנראה לא התשובה.

קיבוע מיקום. מקבלים ת צהובה, מנסים אותה במיקום 3, עדיין צהובה, מנסים מיקום 3 שוב כי שכחתם. תשמרו צ'קליסט מנטלי (או פיזי) של איפה בדקתם כל אות צהובה. אני ממש ממלמל לעצמי את המיקומים: "ת לא 1, לא 3, ננסה 4."

ניחוש הפאניקה. נשארו שני ניחושים, המוח מתרוקן, דוחפים פנימה את המילה הראשונה שקופצת לראש. עצרו. קחו 10 שניות. קראו מחדש כל רמז. פרטו כל מגבלה. התשובה חייבת לענות על כולן. הרגע הזה של רוגע הציל לי את רצף הפתרונות יותר מפעם אחת.

עיוורון אותיות כפולות. אם א חזרה צהובה פעם, זכרו: אולי יש שתי אותיות א במילה. פעם הפסדתי מילה ממש ברורה כי הנחתי שמספיק א אחת. מביך, אבל לימודי.`,
      },
      {
        title: 'הטריקים שהורידו אותי לממוצע 2-3',
        content: `זה המאטריאל שהפריד בין "די טוב" ל"מעצבן את החברים עם אחוז הפתרון שלי."

לפני שאני מגיש ניחוש, אני מנגן בראש כל תרחיש. אם א חוזרת ירוקה, אנסה את זה. צהובה, אנסה את זה. אפורה, משהו אחר לגמרי. נשמע איטי אבל זה בעצם מזרז אתכם כי לא יושבים שם ומנתחים מחדש אחרי כל תוצאה.

אני משחק מצב קשה גם כשהמשחק לא מכריח. זה אומר שכל ניחוש משתמש בכל האותיות הירוקות והצהובות שכבר אושרו. מרגיש מגביל בהתחלה, אבל זה מכריח משחק יעיל. אי אפשר לבזבז ניחוש על מילה זריקה שמתעלמת ממה שכבר יודעים.

בחירה משוקללת תדירות. כשיש 3 מילים מועמדות, אני לא בוחר אחת באקראי. מסתכל אילו אותיות שטרם נבדקו הכי נפוצות. אם מועמד אחד בודק ל ואחר בודק ץ, אני הולך עם ל כל פעם. גם אם הניחוש לא נכון, המשוב יהיה שימושי יותר.

ובכנות? פשוט תשחקו הרבה. אחרי כמה מאות סיבובים, מתחילים לראות דפוסים בלי לחשוב עליהם. -ות, -ים, -ון, -ית, -ות. המוח בונה טבלת חיפוש לאורך הזמן, וזיהוי הדפוסים הזה הוא מה שהופך ממוצע 4 ניחושים לממוצע 3. אין לזה קיצור דרך. אבל בדיוק בגלל זה ההתקדמות מרגישה מגיעה.`,
      },
    ],
    faq: [
      {
        question: 'מהי מילת הפתיחה הטובה ביותר לציד מילים בלקסיקלאש?',
        answer: 'אני אישית מחליף בין כמה מילים טובות שבודקות את התנועות והעיצורים הנפוצים ביותר בלי אותיות חוזרות. כל העניין של המילה הפותחת הוא ללמוד דברים, לא להצליח בניחוש מזל.',
      },
      {
        question: 'כמה ניסיונות יש בציד מילים?',
        answer: 'יש מספר מוגבל של ניסיונות. ככל שצריכים פחות ניחושים, מקבלים יותר נקודות ומטבעות. החידה היומית היא אותה מילה לכולם, מה שהופך את זה לכיף להשוות עם חברים.',
      },
      {
        question: 'מה המשמעות של הצבעים ברמזי ציד מילים?',
        answer: 'ירוק = אות נכונה, מיקום נכון. צהוב = האות נמצאת במילה אבל שמתם אותה במקום לא נכון. אפור = לא נמצאת במילה בכלל. ירוק זה מעולה, צהוב זה שימושי, אפור זה גם מידע (עכשיו יודעים מה להימנע ממנו).',
      },
      {
        question: 'איך אפשר לשפר את שיעור הפתרון בציד מילים?',
        answer: 'תתחילו עם מילה פותחת חזקה, לעולם אל תשתמשו שוב באותיות אפורות (ברצינות, רק זה לבד יעזור), תהיו שיטתיים בבדיקת אותיות צהובות במיקומים חדשים, ותתחילו לשנן אשכולות סיומות כמו -ים ו-ות. ירגיש איטי בהתחלה אבל הממוצע יירד מהר.',
      },
    ],
    ctaText: 'יאללה לשחק ציד מילים',
    ctaLink: '/daily',
    backToGuides: 'חזרה למדריכים',
  },
  sv: {
    title: 'Word Hunt Strategi: Hur Jag Gick Från 5 Försök till Att Lösa På 3',
    subtitle: 'Riktiga taktiker från hundratals rundor. Val av öppnare, ledtrådsknep och fallorna jag hela tiden gick i.',
    category: 'Strategi',
    readTime: '8 min läsning',
    authorName: 'Ordnörden',
    authorBio: 'Jag följer min statistik besatt. 95% lösningsgrad, 3.2 i genomsnitt. Ja, jag har ett kalkylark.',
    quickTips: [
      'STARE eller CRANE som öppnare. Jag växlar mellan dem beroende på humor. Båda träffar bokstaverna som spelar roll.',
      'Att återanvända en grå bokstav är det största nybörjarmisstaget. Jag ertappar mig fortfarande med det när jag stressar.',
      'Grönt = rätt bokstav, rätt plats. Gult = rätt bokstav, fel plats. Tatuera det på hjärnan.',
      'Fick du en gul? Flytta den inte slumpmässigt. Prova den i varje position du inte testat än.',
      'Två bra öppnare utan överlappande bokstäver = 10 testade bokstäver. Det är 40% av alfabetet på 2 gissningar.',
      'Lär dig -IGHT, -OUND, -ATCH-klustren. När du ser ett är svaret oftast gömt där.',
      'Nere på 2-3 alternativ? Gå med det vanligare ordet. Svaret är nästan aldrig det obskyra.',
    ],
    sections: [
      {
        title: 'Så Vad Är Egentligen Word Hunt?',
        content: `Om du spelat Wordle fattar du redan grejen. Word Hunt är LexiClashs variant på formeln: gissa det dolda ordet, få färgkodad feedback, upprepa tills du når det eller kör slut på försök.

Grön platta betyder rätt bokstav, rätt plats. Gul betyder att bokstaven finns i ordet men du har den på fel ställe. Grå betyder att bokstaven inte finns i ordet alls. Enkelt på pappret, men det deduktiva pusslet det skapar är genuint beroendeframkallande.

Det som skiljer det från Klassiskt eller Blast-läge (där bokstaverna ligger framför dig på brädet) är att du jobbar i blindo. Det är ren deduktion och ordförråd. Jag tycker ärligt talat att det är mycket mer tillfredsställande när jag knacker ett på 2 försök än något annat i spelet.

Det finns ett farskt pussel varje dag i Dagliga Utmaningen, plus obegransade övningsrundor om du är som jag och inte kan sluta efter bara ett. Färre gissningar = mer poäng och mynt, vilket är moroten som förvandlade mig från en casual spelare till någon som genuint tänker på bokstavsfrekvens vid frukosten.`,
      },
      {
        title: 'Din Öppnare Spelar Större Roll Än Du Tror',
        content: `Här är ett misstag jag gjorde mina första 50+ rundor: jag försökte gissa det riktiga ordet på försök ett. Gör inte det. Din första gissning handlar inte om att ha rätt. Den handlar om att lära sig så mycket som möjligt.

Jag växlar mellan STARE och CRANE. Båda träffar vanliga vokaler (A, E) och hogfrekventa konsonanter (S, T, R, N) utan upprepade bokstäver. SLATE och ROAST funkar också bra. Poängen är att du testar bokstaverna som dyker upp i flest ord.

Tänk på det: E, T, A, O, I, N, S, R forekommer i något i stil med 80% av alla vanliga ord. Om din öppnare testar 5 av dem här du omedelbart ett massivt forsprang.

Vad du INTE ska öppna med: TEETH (testar bara 3 unika bokstäver, totalt slaseri), JAZZY (coolt ord, hemsk öppnare), eller något med Q, X eller Z. De bokstaverna dyker nästan aldrig upp i svaret.

Mitt favorittrick: para ihop två kompletterande öppnare. STARE sen COIL ger dig 9 unika bokstäver över två gissningar och täcker alla 5 vokaler. Efter de två vet jag oftast tillräckligt för att börja ringa in.`,
      },
      {
        title: 'Att Lasa Ledtradarna Utan Att Tappa Förståndet',
        content: `OK så du här gjort din första gissning och färgerna kommer tillbaka. Här är där de flesta (inklusive gamla jag) går fel.

Grona bokstäver är lätta. Läs dem. Om S lyser grönt på position 1 börjar varje gissning harifrån med S. Inga undantag, inget smarthetförsök. Bara läs den.

Gula bokstäver är där det blir klurigare, och där jag slösade flest gissningar i början. Ett gult A på position 2 betyder två saker: A FINNS i ordet, och A är INTE på position 2. Fallan är att flytta det till något slumpmässigt ställe. Var istället metodisk. Prova position 1, sen 3, sen 4. Bocka av när du går.

Grå bokstäver är borta. Doda för dig. Glöm att de existerar. Jag kan inte beskriva hur många gånger jag ertappat mig med att prova ett R som jag redan visste var gråt för att jag inte var uppmärksam. Om du minns en sak från den här guiden så är det det här: återanvänd aldrig grå bokstäver.

Den riktiga magin händer när du kombinerar allt. Sag att du vet att A är gult från position 2 och R är grönt på position 4. Nu letar du efter _ _ _ R _ med ett A någonstans som inte är position 2. Den begränsningen ensam brukar skara ner alternativen till en handfull.`,
      },
      {
        title: 'Att Begränsa Alternativen (Den Roliga Delen)',
        content: `Efter 2 bra gissningar borde du ha testat runt 10 bokstäver. Det är nästan 40% av alfabetet eliminerat eller bekraftat. Om det inte känns som att faltet här smalnat dramatiskt hade dina gissningar förmodligen för mycket överlapp.

Grona bokstäver är det bästa. Två grona efter två gissningar betyder att ungefär 95% av möjligheterna för de positionerna är borta. Det är en underbar känsla.

Det är här jag börjar klottra (mentalt eller bokstavligen). Jag tar mönstret jag vet och listar bara ord som passar. Position 1 är S, position 4 är R, A går någonstans som inte är position 2? OK: SHARP, SNARE, SUGAR, SOLAR... sen korskontrollerar jag mot mina grå bokstäver och listan krymper snabbt.

Här är en princip som ändrade mitt spel: varje gissning borde ungefär halvera dina återstående alternativ. Om en gissning bara eliminerar ett eller två ord var det inte en bra gissning. Du vill maximal förödelse med varje försök.

När jag är nere på 2-3 kandidater går jag på magkänsla och frekvens. SHARE fore SNARE. SNARE fore SCARE. Ju vanligare ordet känns, desto troligare är det att våra svaret. Pusseldesignerna försökter inte stumpa dig med obskyrt ordförråd.`,
      },
      {
        title: 'Att Få Mer Ut Av Ledtradar och Monster',
        content: `Det finns ett ledtrådssystem i Word Hunt som avslöjar en extra bokstavsposition, och jag här asikter om när man ska använda det.

Använd inte en ledtråd när du fortfarande här 5+ möjliga ord. En gissning till ger dig mycket mer information än en enda bokstavsavslöjning. Spara ledtrådar för när du stirrar på 2-3 lika sannolika kandidater och genuint inte kan avgöra vilken det är. Da betalar en ledtråd för sig själv.

Även utan ledtrådar är bokstavsfrekvens ditt hemliga vapen. Efter de stora (E, T, A, O, I, N, S, R) är nästa nivå H, L, D, C, U, M, F, P. Om dina första två gissningar inte rort någon av dem, se till att gissning 3 gör det.

Jag här mentala "kluster" av ordanslutningar, och det här förmodligen sparat mig fler gissningar än något annat. När jag ser _IGHT ta form vet jag att jag tittar på light/right/sight/might/night/fight/tight och kan oftast spika det på en gissning till. Samma med -OUND (bound/found/hound/mound/pound/round/sound/wound). Bygg de här klustren i huvudet och du börjar känna igen mönster nästan direkt.

Och dubbla bokstäver. De får mig varje gång. SLEEP, TEETH, LLAMA. Om alla dina gissningar kommer tillbaka rena utan dubblar är det faktiskt en signal att svaret kanske HAR dubblar. Prova ord med LL, SS, EE, TT. Jag spenderade en gång 4 gissningar utan att överväga dubblar och kande mig extremt dum.`,
      },
      {
        title: 'Fallor Jag Fortsatter Gå I (Och Du Också Kommer)',
        content: `Jag vill våra ärlig: jag går fortfarande i några av de här. Att veta om dem hjälper, men i stundens hetta gör hjärnan bara vad den vill.

Tunnelseende. Det här är det stora. Du övertygar dig om att det är CRANE, så du provar CRANE, CRONE, CRAZE... samtidigt är svaret PLUMB och delar noll bokstäver. Om din gissning kommer tillbaka hel-grå betyder det att svaret här INGENTING gemensamt med det du provade. Tvinga dig att tänka i en helt annan riktning.

Sällsynt-ord-syndromet. Jag här gjort det. "Kanske är det KNOLL? FJORD?" Nej. Det är nästan säkert ett ord du använder i vardagligt tal. Om du inte skulle saga det till en vän är det förmodligen inte svaret.

Positionsfixering. Du får ett gult T, provar det på position 3, fortfarande gult, provar position 3 igen för att du glömde. Håll en mental (eller fysisk) checklista över var du testat varje gul bokstav. Jag mumlar faktiskt positionerna för mig själv: "T inte 1, inte 3, prova 4."

Panikgissningen. Två gissningar kvar, hjärnan blankar, du slamrar in vilket ord som helst som dyker upp. Stanna. Ta 10 sekunder. Läs om varje ledtrad. Lista varje begråansning. Svaret måste uppfylla ALLA. Det där lugna ögonblicket här räddat min lösningssvit mer än en gång.

Dubbelbokstavsblindhet. Om E kom tillbaka gult en gang, kom ihag: ordet kanske här TVÅ E. Jag förlorade en gång ett uppenbart GEESE för att jag antog att ett E räckte. Pinsamt, men lärorikt.`,
      },
      {
        title: 'Tricken Som Fick Mig Till 2-3 I Genomsnitt',
        content: `Det här är det som skilde "ganska bra" från "irriterar mina vänner med min lösningsgrad."

Innan jag skickar en gissning spelar jag igenom varje scenario i huvudet. Om A kommer tillbaka grönt provar jag DET HAR. Gult, jag provar DET DAR. Gråt, något helt annat. Det låter langsamt men det snabbar faktiskt upp dig för att du inte sitter och omanalyserar efter varje resultat.

Jag spelar svårt läge även när spelet inte tvingar det. Det betyder att varje gissning använder alla bekraftade grona och gula bokstäver. Det känns begransande först, men det tvingar dig till effektivt spel. Du kan inte slösa en gissning på ett slangord som ignorerar det du redan vet.

Frekvensviktad gissning. När jag här 3 kandidatord valjer jag inte bara slumpmässigt. Jag kollar vilka otestade bokstäver som är vanligast. Om en kandidat testar ett H och en annan testar ett Z går jag med H varje gång. Även om den gissningen är fel kommer feedbacken våra mer anvandbar.

Och ärligt talat? Bara spela mycket. Efter några hundra rundor börjar du se mönster utan att tänka på dem. -ATCH, -OUND, -IGHT, -TION, -NESS. Hjärnan bygger en uppslagstabell över tid, och det är den mönsterigenkänningen som förvandlar ett 4-gissningssnitt till ett 3-gissningssnitt. Det finns ingen genvag. Men det är också det som gör att förbättringen känns fortjanad.`,
      },
    ],
    faq: [
      {
        question: 'Vad är det bästa startordet för Word Hunt i LexiClash?',
        answer: 'Jag personligen växlar mellan STARE och CRANE. Båda träffar de vanligaste vokalerna och konsonanterna utan att upprepa bokstäver. Hela poängen med din öppnare är att lära dig saker, inte att ha tur och gissa rätt.',
      },
      {
        question: 'Hur många försök får jag i Word Hunt?',
        answer: 'Du får ett begränsat antal försök. Ju färre gissningar du behöver, desto mer poäng och mynt går du ifrån med. Det dagliga pusslet är samma ord för alla, vilket gör det kul att jämföra med vänner.',
      },
      {
        question: 'Vad betyder färgerna i Word Hunt-ledtrådar?',
        answer: 'Grönt = rätt bokstav, rätt position. Gult = bokstaven finns i ordet men du la den på fel plats. Gråt = inte i ordet alls. Grönt är toppen, gult är anvandbart, gråt är också information (nu vet du vad du ska undvika).',
      },
      {
        question: 'Hur kan jag förbättra min lösningsgrad i Word Hunt?',
        answer: 'Börja med en stark öppnare som STARE eller CRANE, återanvänd aldrig grå bokstäver (serioost, det ensamt hjälper), var systematisk med att testa gula bokstäver i nya positioner, och börja memorera ordsluts-kluster som -IGHT och -OUND. Det känns langsamt först men ditt genomsnitt kommer sjunka snabbt.',
      },
    ],
    ctaText: 'Spela Word Hunt',
    ctaLink: '/daily',
    backToGuides: 'Tillbaka till guider',
  },
  ja: {
    title: 'ワードハント攻略：5回かかってたのを3回で解けるようになった話',
    subtitle: '何百ラウンドもやって見つけたリアルなコツ。オープナーの選び方、ヒントの読み方、僕がハマり続けた罠の話。',
    category: '攻略',
    readTime: '8分で読める',
    authorName: 'ワードオタク',
    authorBio: '統計を異常なほど記録してます。解決率95%、平均試行3.2回。はい、スプレッドシートがあります。',
    quickTips: [
      'STAREかCRANEでスタート。気分で使い分けてます。どっちも重要な文字をカバーしてくれる。',
      '灰色の文字を再利用するのが初心者の一番の失敗。焦ると僕もまだやっちゃう。',
      '緑=正しい文字、正しい場所。黄色=正しい文字、間違った場所。脳に刻んで。',
      '黄色が出た？適当に動かさない。まだ試してない位置を1つずつ潰していく。',
      '被りなしの良いオープナー2つで10文字テスト。アルファベットの40%を2手でカバー。',
      '-IGHT、-OUND、-ATCHのクラスターを覚えよう。見つけたら答えはだいたいそこにいる。',
      '2-3個まで絞れた？より一般的な単語を選べ。答えがマニアックな単語だった試しはほぼない。',
    ],
    sections: [
      {
        title: 'そもそもワードハントって何？',
        content: `Wordleをやったことがあるなら、もう分かります。ワードハントはLexiClash版のあのゲーム。隠された単語を推測して、色付きのフィードバックをもらって、当たるか回数切れになるまで繰り返す。

緑のタイルは正しい文字が正しい位置にあるということ。黄色はその文字は単語に入ってるけど位置が違う。灰色はその文字は単語にない。紙の上ではシンプルだけど、これが生み出す推理パズルは本当に中毒性がある。

クラシックやブラストモード（文字がボードに見えてる）と違うのは、完全にブラインドで戦うこと。純粋な推理力と語彙力の勝負。正直に言うと、2手で正解した時の快感はゲーム内の何よりも上です。

デイリーチャレンジで毎日新しいパズルが出るし、僕みたいに1問で止められない人には無制限の練習ラウンドもある。少ない推測ほど多くのポイントとコインがもらえる。これが僕をカジュアルプレイヤーから、朝食中に文字の出現頻度を考える人間に変えました。`,
      },
      {
        title: '最初の1手は思ってる以上に大事',
        content: `最初の50ラウンドくらいで僕がやった間違い：1手目で答えを当てようとすること。これはダメ。最初の推測は当てるためじゃない。できるだけ多くの情報を集めるため。

僕はSTAREとCRANEを使い分けてます。どっちも頻出母音（A、E）と高頻度子音（S、T、R、N）をカバーして、文字の被りがゼロ。SLATEやROASTもいい。ポイントは、一番多くの英単語に登場する文字をテストすること。

考えてみてください：E、T、A、O、I、N、S、Rは一般的な単語の約80%に出現します。オープナーでこのうち5つをチェックできたら、もう巨大なアドバンテージ。

ダメなオープナー：TEETH（ユニークな文字が3つしかない、無駄）、JAZZY（カッコいい単語だけどオープナーとしては最悪）、Q、X、Zが入ってる単語。これらの文字が答えに出ることはほぼない。

僕のお気に入りのワザ：補完的なオープナー2つをセットで使う。STAREの後にCOILで、2手で9個のユニークな文字をテストして母音5つ全部カバー。この2手の後はだいたい絞り込みに入れます。`,
      },
      {
        title: 'ヒントの読み方（頭を爆発させないために）',
        content: `1手目を打って色が返ってきた。ここで大半の人（昔の僕を含む）がミスる。

緑の文字は簡単。ロックする。Sが1番目で緑になったら、これ以降のすべての推測はSで始まる。例外なし。ひねりなし。固定。

黄色が厄介で、僕が一番推測を無駄にした部分。2番目にAが黄色で出たということは2つ意味がある：Aはこの単語に入ってる、そしてAは2番目の位置にはない。罠は適当な場所に動かすこと。代わりに、系統的にやる。位置1、次に3、次に4。1つずつ潰していく。

灰色の文字は死んだ文字。存在を忘れる。何回やったか分からないけど、もう灰色って分かってるRを使おうとしたこと。集中してなかっただけ。このガイドから1つだけ覚えるなら、これ：灰色の文字は二度と使わない。

本当の魔法は全部組み合わせた時に起きます。Aが2番目で黄色、Rが4番目で緑。ということは「_ _ _ R _」でAが2番目以外のどこかにある。この制約だけで候補が一気に数個まで減ります。`,
      },
      {
        title: '絞り込み（一番楽しいパート）',
        content: `良い推測を2回した後、10文字くらいテストできてるはず。アルファベットの約40%が消去済みか確認済み。もし「だいぶ絞れた」感覚がなかったら、推測の文字が被りすぎてた可能性が高いです。

緑の文字は最高。2手で緑が2つあれば、その位置の可能性の約95%が消えたことになる。気持ちいい。

ここで僕は頭の中（か実際に）でメモを取り始めます。分かってるパターンを並べて、当てはまる単語をリストアップ。1番目がS、4番目がR、Aは2番目以外のどこか？OK：SHARP、SNARE、SUGAR、SOLAR...で灰色の文字と照合するとリストがどんどん縮む。

ゲームを変えた原則：1回の推測で候補をだいたい半分に減らすべき。推測の結果、1-2個しか消えなかったら、良い推測じゃなかった。1手ごとに最大限の絞り込みを狙う。

2-3個の候補に絞れたら、直感的な頻度で選ぶ。SHAREの方がSNAREより先。SNAREの方がSCAREより先。より日常的に使いそうな単語ほど正解の確率が高い。パズルの出題者はマニアックな語彙で引っかけようとはしてません。`,
      },
      {
        title: 'ヒントシステムとパターン認識',
        content: `ワードハントには追加の文字位置を教えてくれるヒントシステムがあって、使うタイミングについて僕なりの考えがあります。

まだ候補が5個以上ある時にヒントを使わない。もう1回推測する方がずっと多くの情報が手に入る。ヒントは候補が2-3個で、本当にどれか分からない時に使う。その時こそヒントの元が取れます。

ヒントなしでも、文字頻度は最強の武器です。頻出文字（E、T、A、O、I、N、S、R）の次のグループはH、L、D、C、U、M、F、P。最初の2手でこのグループに全く触れてなかったら、3手目で必ず入れる。

僕は頭の中に単語末尾の「クラスター」を持ってて、これが一番推測を節約してくれてる。_IGHTのパターンが見えたら、light/right/sight/might/night/fight/tightのどれかで、だいたいあと1手で当たる。-OUND（bound/found/hound/mound/pound/round/sound/wound）も同じ。こういうクラスターを頭に作ると、パターン認識がほぼ瞬間的になります。

それと二重文字。毎回やられる。SLEEP、TEETH、LLAMA。すべての推測がキレイに返ってきて二重文字が1つもないなら、逆にそれが信号。答えに二重文字があるかも。LL、SS、EE、TTが入った単語を試す。一度、4回も二重文字を考慮しなくて、自分が本当にバカだと思いました。`,
      },
      {
        title: '僕が何度もハマる罠（あなたもハマるでしょう）',
        content: `正直に言います：これらの罠、今でも引っかかります。知ってても、その瞬間は脳が勝手にやります。

トンネルビジョン。これが最大。CRANEだと確信して、CRANE、CRONE、CRAZE...と試し続ける。一方で答えはPLUMBで共通する文字がゼロ。全部灰色で返ってきたら、それは答えがあなたの試した単語と何も共通してないということ。全く違う方向に頭を切り替えて。

珍しい単語症候群。やったことあります。「もしかしてKNOLL？FJORD？」いいえ。答えはほぼ確実に日常会話で使う単語です。友達に言わないような単語は、たぶん答えじゃない。

位置固定。黄色のTが出て、位置3で試して、まだ黄色で、また位置3で試す。忘れてたから。黄色の文字をどこで試したかのメンタルチェックリストを作る。僕は実際に口でつぶやいてます：「Tは1番目じゃない、3番目じゃない、4番目を試す。」

パニック推測。残り2手、頭が真っ白、思いついた単語をバーンと入力。ストップ。10秒取る。全部のヒントを読み直す。すべての制約をリストアップ。答えはその全部を満たさないといけない。この10秒の冷静さが、連続正解記録を何度も救ってくれました。

二重文字の盲点。Eが黄色で1回出たとして、覚えておいて：その単語にEが2つあるかもしれない。一度、明らかなGEESEを逃しました。Eは1個で十分だと思い込んでたから。恥ずかしいけど、勉強になった。`,
      },
      {
        title: '平均2-3手に到達した方法',
        content: `ここが「まあまあ上手い」から「友達に解決率を自慢してウザがられる」に変わったコツです。

推測を送信する前に、あらゆるシナリオを頭の中でシミュレーションします。Aが緑で返ったらこれを試す。黄色ならあれ。灰色なら全然別のやつ。遅そうに聞こえるけど、実はスピードアップする。結果が返ってきた後に改めて分析する必要がなくなるから。

ゲームが強制しなくてもハードモードでプレイしてます。つまり確認された緑と黄色の文字を必ず次の推測に含める。最初は窮屈に感じるけど、効率的なプレイを強制される。既に分かっていることを無視した捨て推測ができなくなる。

頻度加重で候補を選ぶ。3つの候補単語があったら、ランダムには選ばない。まだテストしていない文字のうち、英語で出現頻度が一番高いのはどれかを見る。一方がHをテストして、もう一方がZなら、毎回Hの方を選ぶ。外れても、そのフィードバックの方が有用。

そして正直なところ、たくさんプレイすること。数百ラウンドやると、考えなくてもパターンが見えるようになる。-ATCH、-OUND、-IGHT、-TION、-NESS。脳が勝手にルックアップテーブルを作ってくれて、そのパターン認識が4手平均を3手平均に変えてくれる。近道はありません。でもだからこそ、上達した時の達成感があるんです。`,
      },
    ],
    faq: [
      {
        question: 'LexiClashのワードハントで一番いい最初の単語は？',
        answer: '僕はSTAREとCRANEを使い分けてます。どっちも頻出の母音と子音をカバーして文字の被りがない。オープナーの目的はラッキーで当てることじゃなくて、情報を集めること。',
      },
      {
        question: 'ワードハントって何回推測できるの？',
        answer: '回数は限られてます。少ない推測で解くほど、もらえるポイントとコインが多い。デイリーパズルはみんな同じ単語なので、友達と比べるのが楽しいですよ。',
      },
      {
        question: 'ワードハントのヒントの色って何？',
        answer: '緑=正しい文字、正しい位置。黄色=その文字は単語にいるけど場所が違う。灰色=単語にない。緑は最高、黄色は役立つ、灰色も情報（何を避けるべきか分かるから）。',
      },
      {
        question: 'ワードハントの正解率を上げるには？',
        answer: 'STAREやCRANEみたいな強いオープナーで始める。灰色の文字は二度と使わない（マジでこれだけでも変わる）。黄色の文字は新しい位置で系統的にテスト。そして-IGHTや-OUNDみたいな単語末尾のクラスターを覚え始める。最初はゆっくりだけど、平均はすぐ下がりますよ。',
      },
    ],
    ctaText: 'ワードハントをやってみよう',
    ctaLink: '/daily',
    backToGuides: 'ガイドに戻る',
  },
  es: {
    title: 'Estrategia Word Hunt: como pase de 5 intentos a resolverlo en 3',
    subtitle: 'Tacticas reales de cientos de rondas. Eleccion de palabra inicial, trucos para leer pistas, y las trampas en las que yo caia.',
    category: 'Estrategia',
    readTime: '8 min de lectura',
    authorName: 'El Nerd de las Palabras',
    authorBio: 'Registro mis estadisticas obsesivamente. 95% de tasa de resolucion, 3.2 intentos promedio. Si, tengo una hoja de calculo.',
    quickTips: [
      'Empieza con una palabra que tenga vocales y consonantes comunes sin repetir letras. Yo alterno dependiendo del humor.',
      'Reutilizar una letra gris es el error #1 de principiante. Yo todavia me pillo haciendolo cuando voy apurado.',
      'Verde = letra correcta, lugar correcto. Amarillo = letra correcta, lugar equivocado. Tatuate esto en el cerebro.',
      'Tienes una amarilla? No la muevas al azar. Pruebala en cada posicion que no hayas testeado.',
      'Dos buenas aperturas sin letras repetidas = 10 letras probadas. Eso es 40% del alfabeto en 2 intentos.',
      'Aprende los grupos -CION, -MENTE, -ABLE, -ANDO. Cuando los detectas, la respuesta generalmente esta escondida ahi.',
      'Te quedan 2-3 opciones? Ve con la palabra mas comun. La respuesta casi nunca es la rebuscada.',
    ],
    sections: [
      {
        title: 'Que es Word Hunt en realidad?',
        content: `Si jugaste Wordle, ya lo entiendes. Word Hunt es la version de LexiClash de la formula: adivina la palabra oculta, recibe pistas con colores, repite hasta que la claves o te quedes sin intentos.

Ficha verde significa letra correcta en el lugar correcto. Amarillo significa que la letra esta en la palabra pero la pusiste en el lugar equivocado. Gris significa que esa letra no esta en la palabra para nada. Bastante simple en papel, pero el puzzle deductivo que crea es genuinamente adictivo.

Lo que lo hace diferente del modo Clasico o Blast (donde las letras estan ahi en el tablero) es que trabajas a ciegas. Es pura deduccion y vocabulario. La verdad me da mucha mas satisfaccion acertar en 2 intentos que cualquier otra cosa en el juego.

Hay un puzzle nuevo cada dia en el Desafio Diario, mas rondas de practica ilimitadas si eres como yo y no puedes parar despues de solo uno. Menos intentos = mas puntos y monedas, que es la zanahoria que me convirtio de jugador casual a alguien que genuinamente piensa en frecuencia de letras durante el desayuno.`,
      },
      {
        title: 'Tu palabra inicial importa mas de lo que crees',
        content: `Aqui va un error que cometi durante mis primeras 50+ rondas: intentaba adivinar la palabra real en el primer intento. No hagas esto. Tu primer intento no se trata de acertar. Se trata de aprender lo mas posible.

La apertura ideal tiene vocales comunes (al menos 2), consonantes frecuentes, y cero letras repetidas. El punto es que estes probando las letras que aparecen en la mayor cantidad de palabras.

Piensalo: hay letras que aparecen en algo asi como el 80% de las palabras comunes. Si tu apertura checa 5 de esas, inmediatamente tienes una ventaja enorme.

Con que NO abrir: palabras con letras repetidas (prueban menos letras unicas, desperdicio total), palabras con letras raras como Q, X, Z (esas letras casi nunca aparecen en la respuesta), o cualquier cosa que no coincida con la longitud del objetivo.

Mi truco favorito: combinar dos aperturas complementarias. Dos palabras sin letras compartidas te dan 9-10 letras unicas en dos intentos y cubren un monton de terreno. Despues de esas dos, generalmente ya se lo suficiente para empezar a afinar.`,
      },
      {
        title: 'Leer las pistas sin perder la cabeza',
        content: `OK, hiciste tu primer intento y los colores vuelven. Aqui es donde la mayoria de la gente (incluyendo el yo del pasado) la riega.

Letras verdes son faciles. Bloqueadas. Si la S sale verde en posicion 1, cada intento de aqui en adelante empieza con S. Sin excepciones, sin intentar ser listo. Solo bloquealas.

Letras amarillas es donde se pone dificil, y donde yo desperdicie mas intentos al principio. Una A amarilla en posicion 2 significa dos cosas: la A SI esta en la palabra, y la A NO esta en posicion 2. La trampa es moverla a cualquier lugar al azar. En vez de eso, se metodico. Prueba posicion 1, luego 3, luego 4. Ve tachandolas conforme avanzas.

Letras grises estan muertas. Muertas para ti. Olvida que existen. No puedo decirte cuantas veces me cache intentando una R que ya sabia que era gris porque no estaba poniendo atencion. Si recuerdas una sola cosa de esta guia, que sea esta: nunca reutilices letras grises.

La magia real pasa cuando combinas todo. Digamos que sabes que A es amarilla de posicion 2 y R es verde en posicion 4. Ahora estas buscando _ _ _ R _ con una A en algun lugar que no sea posicion 2. Solo esa restriccion generalmente reduce tus opciones a un punado.`,
      },
      {
        title: 'Reduciendo las opciones (la parte divertida)',
        content: `Despues de 2 buenos intentos, deberias haber probado unas 10 letras. Eso es casi 40% del alfabeto eliminado o confirmado. Si no sientes que el campo se redujo dramaticamente, tus intentos probablemente tenian demasiada superposicion.

Letras verdes son lo mejor. Dos verdes despues de dos intentos significa que como el 95% de posibilidades para esas posiciones se fue. Es una sensacion hermosa.

Aqui es donde empiezo a anotar (mental o literalmente). Tomo el patron que conozco y simplemente listo palabras que encajen. Posicion 1 es S, posicion 4 es R, la A va en algun lugar que no sea posicion 2? OK: SOLAR, SANAR, SONAR, SUMAR... luego cruzo con mis letras grises y la lista se achica rapido.

Un principio que me cambio el juego: cada intento deberia reducir tus opciones restantes mas o menos a la mitad. Si un intento solo elimina una o dos palabras, no fue un buen intento. Quieres maxima destruccion con cada oportunidad.

Cuando me quedan 2-3 candidatos, voy con instinto de frecuencia. La palabra que se sienta mas comun, mas probable de escuchar en una conversacion, esa suele ser la respuesta. Los disenadores del puzzle no estan tratando de sorprenderte con vocabulario rebuscado.`,
      },
      {
        title: 'Sacandole mas jugo a las pistas y los patrones',
        content: `Hay un sistema de pistas en Word Hunt que revela una posicion de letra extra, y tengo opiniones sobre cuando usarlo.

No uses una pista cuando todavia tienes 5+ palabras posibles. Otro intento te va a dar mucha mas informacion que revelar una sola letra. Guarda las pistas para cuando estes mirando 2-3 candidatos igualmente plausibles y genuinamente no puedas distinguir cual es. Ahi es cuando una pista se paga sola.

Incluso sin pistas, la frecuencia de letras es tu arma secreta. Despues de las grandes (E, A, O, S, R, N, I, L), la siguiente camada es D, C, T, U, M, P. Si tus primeros dos intentos no tocaron ninguna de esas, asegurate de que el tercero lo haga.

Yo mantengo "grupos" mentales de terminaciones de palabras, y esto probablemente me ha ahorrado mas intentos que cualquier otra cosa. Una vez que veo _CION formandose, se que estoy viendo accion/cancion/opcion/nacion y generalmente puedo clavarla en un intento mas. Igual con -MENTE, -ABLE, -ANDO. Construye estos grupos en tu cabeza y empezaras a reconocer patrones casi al instante.

Ah, y las letras dobles. Me atrapan siempre. LLAMA, PERRO, CALLE. Si todos tus intentos vuelven limpios sin dobles, eso es en realidad una senal de que la respuesta podria TENER dobles. Prueba palabras con LL, RR, CC. Una vez gaste 4 intentos sin considerar dobles y me senti tremendamente tonto.`,
      },
      {
        title: 'Trampas en las que sigo cayendo (y tu tambien vas a caer)',
        content: `Quiero ser honesto: todavia caigo en algunas de estas. Saber de ellas ayuda, pero en el momento, tu cerebro simplemente hace lo que quiere.

Vision de tunel. Esta es la grande. Te convences de que es TRAJE, entonces pruebas TRAJE, TRAGO, TRAZO... mientras tanto la respuesta es PLUMA y no comparte ni una letra. Si tu intento vuelve todo gris, significa que la respuesta no tiene NADA en comun con lo que probaste. Forzate a pensar en una direccion completamente diferente.

Sindrome de palabra rara. Lo he hecho. "Quizas es ENJUTO? AZOGUE?" No. Casi seguro es una palabra que usas en conversacion diaria. Si no se la dirias a un amigo, probablemente no es la respuesta.

Fijacion de posicion. Te sale una T amarilla, la pruebas en posicion 3, sigue amarilla, la pruebas en posicion 3 de nuevo porque se te olvido. Lleva un checklist mental (o fisico) de donde has probado cada letra amarilla. Yo literalmente murmuro las posiciones: "T no 1, no 3, probar 4."

El intento panico. Quedan 2 intentos, el cerebro se pone en blanco, metes la primera palabra que te viene a la mente. Para. Tomate 10 segundos. Relee cada pista. Lista cada restriccion. La respuesta tiene que satisfacer TODAS. Ese momento de calma me ha salvado la racha de resoluciones mas de una vez.

Ceguera de letras dobles. Si la E salio amarilla una vez, recuerda: la palabra podria tener DOS Es. Una vez perdi una palabra obvia porque asumi que una E era suficiente. Vergonzoso, pero educativo.`,
      },
      {
        title: 'Los trucos que me llevaron a un promedio de 2-3',
        content: `Esto es lo que separo "bastante bueno" de "mis amigos ya no quieren jugar conmigo por mi tasa de resolucion."

Antes de mandar un intento, juego cada escenario en mi cabeza. Si la A vuelve verde, pruebo ESTO. Amarilla, pruebo AQUELLO. Gris, algo completamente diferente. Suena lento pero en realidad te acelera porque no te quedas ahi re-analizando despues de cada resultado.

Juego en modo dificil aunque el juego no me obligue. Eso significa que cada intento usa todas las letras verdes y amarillas confirmadas. Se siente restrictivo al principio, pero te fuerza a jugar eficientemente. No puedes desperdiciar un intento en una palabra que ignora lo que ya sabes.

Seleccion ponderada por frecuencia. Cuando tengo 3 palabras candidatas, no elijo una al azar. Miro cuales letras no probadas son mas comunes. Si un candidato prueba una D y otro prueba una Z, voy con la D siempre. Aunque ese intento sea incorrecto, la retroalimentacion va a ser mas util.

Y honestamente? Simplemente juega mucho. Despues de unos cientos de rondas, empiezas a ver patrones sin pensarlos. -CION, -MENTE, -ABLE, -ANDO, -ENTE. Tu cerebro construye una tabla de busqueda con el tiempo, y ese reconocimiento de patrones es lo que convierte un promedio de 4 intentos en uno de 3. No hay atajo. Pero eso tambien es lo que hace que la mejora se sienta ganada.`,
      },
    ],
    faq: [
      {
        question: 'Cual es la mejor palabra inicial para Word Hunt en LexiClash?',
        answer: 'Yo personalmente busco palabras que tengan las vocales y consonantes mas comunes sin repetir ninguna letra. El punto de tu apertura es aprender cosas, no tener suerte y acertar a la primera.',
      },
      {
        question: 'Cuantos intentos tengo en Word Hunt?',
        answer: 'Tienes un numero limitado de intentos. Mientras menos necesites, mas puntos y monedas te llevas. El puzzle diario es la misma palabra para todos, lo cual lo hace divertido para comparar con amigos.',
      },
      {
        question: 'Que significan los colores en las pistas de Word Hunt?',
        answer: 'Verde = letra correcta, posicion correcta. Amarillo = la letra esta en la palabra pero la pusiste en el lugar equivocado. Gris = no esta en la palabra para nada. Verde es genial, amarillo es util, gris tambien es informacion (ahora sabes que evitar).',
      },
      {
        question: 'Como puedo mejorar mi tasa de resolucion en Word Hunt?',
        answer: 'Empieza con una apertura fuerte, nunca reutilices letras grises (en serio, solo esto ya te ayuda un monton), se sistematico probando letras amarillas en posiciones nuevas, y empieza a memorizar grupos de terminaciones como -CION y -MENTE. Se siente lento al principio pero tu promedio va a bajar rapido.',
      },
    ],
    ctaText: 'Juega Word Hunt',
    ctaLink: '/daily',
    backToGuides: 'Volver a guias',
  },
};
