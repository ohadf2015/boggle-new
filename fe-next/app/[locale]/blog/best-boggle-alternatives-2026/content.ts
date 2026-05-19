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
    slug?: string;
    title?: string;
    content: string;
  }>;
  backToBlog: string;
  playDaily: string;
  startPracticing: string;
};

export const contentByLocale: Record<string, LocaleContent> = {
  en: {
    title: 'I Tried Every Boggle Alternative I Could Find. Most of Them Suck.',
    subtitle: 'An honest, slightly unhinged ranking of the best word games in 2026.',
    category: 'Reviews',
    readTime: '10 min read',
    authorName: 'Ohad Fisher',
    authorBio: 'Has played more word games than is socially acceptable. Still can\'t beat my mom at Scrabble.',
    sections: [
      {
        slug: 'intro',
        content: `I've been chasing the Boggle high since I was twelve. That plastic grid, sand timer, everyone hunched over notepads while your uncle insists "QAT" is a word—it is, Uncle Dave—and that specific cocktail of time pressure, pattern recognition, and competitive spite? Nothing else hits.

So naturally, I've spent an embarrassing amount of time and money trying every digital alternative to Boggle that promises to capture that feeling. Most of them don't. Some actively anger me. A handful are genuinely great.

Below is my completely honest, occasionally unhinged ranking of the best alternatives to Boggle and other word games in 2026.`,
      },
      {
        slug: 'what-makes-good-word-game',
        title: 'What makes a good word game',
        content: `Before I trash half this list, three things matter. A great word game needs:

That "aha" moment when you spot a word nobody else sees. Time pressure that makes your palms sweat. And a reason to come back tomorrow.

Bonus: it doesn't beg for $4.99 every time you lose.`,
      },
      {
        slug: 'wordle',
        title: '1. Wordle',
        content: `Wordle is brilliant. One puzzle a day, six guesses. The constraint is the game. Josh Wardle created something genuinely perfect, and the shared experience of millions solving the same puzzle every day worldwide is why it became a cultural phenomenon when the New York Times acquired it in early 2022.

My actual problem with it? It takes three minutes total.

I finish it on the toilet before my coffee kicks in. That's it for the entire day. One puzzle. Nothing else. I'm an addict and you're giving me a single hit? Come on.

Also, and this will be controversial, it's not really a "word game" in the classic Boggle sense. It's a logic puzzle wearing word-game clothes. You're eliminating options methodically, not searching for words across a grid. It's a different skill entirely. Still great. Just different.

Verdict: Perfect for what it is. Terrible if you want sustained daily entertainment.`,
      },
      {
        slug: 'words-with-friends-2',
        title: '2. Words With Friends 2',
        content: `Words With Friends has been around since 2009 (ancient in app years). Biggest playerbase of any word game, period. Your aunt plays it. Your coworker plays it.

The core game is solid. It's Scrabble with a different board layout, which means the gameplay mechanics are proven. The dictionary is generous, maybe too generous. Finding opponents is never a problem given the massive playerbase.

But the monetization kills any semblance of fair play.

Power-ups like "Word Radar" literally show you the best word on the board. "Swap+" lets you trade tiles without losing a turn. These aren't quality-of-life convenience features. They're genuine pay-to-win advantages that shift outcomes. I've lost multiple games where I found significantly more words than my opponent, but they spent money on power-ups and I didn't.

The async format also means waiting hours, sometimes days, between plays. I have games from three weeks ago that are still sitting unfinished.

Verdict: Huge community, solid foundation, ruined by pay-to-win power-ups and glacial pace.`,
      },
      {
        slug: 'wordscapes',
        title: '3. Wordscapes',
        content: `Wordscapes is genuinely beautiful. The backgrounds are gorgeous. Unlocking new landscapes as you progress scratches that completionist itch.

For about two weeks.

Then you realize every puzzle is basically identical. Find words from letters. Fill in the crossword. Move to the next landscape. No competition, no time pressure, no other humans involved. It's word game meditation, which is perfectly fine for some people, but I personally want my heart racing when I play.

Also the ads. Thirty-second spot every four puzzles unless you pay for premium. I once watched an ad for a worse game than the one I was playing.

Verdict: Beautiful, relaxing, about as exciting as alphabetizing your spice rack.`,
      },
      {
        slug: 'boggle-with-friends',
        title: '4. Boggle With Friends',
        content: `This one hurts most because it should be the best. It's literally Boggle. The grid, the timer, real-time word-finding against other players. This is what Boggle alternatives should aspire to be.

Then Zynga did what Zynga does best: monetize everything.

Power-ups that freeze time, reveal words, scramble the board strategically. These features fundamentally break the competitive integrity that makes word games fair. I've lost numerous games where I found 47 words versus an opponent with 31 words, but they purchased power-ups and bonuses that outweighed pure skill.

The App Store reviews tell the whole story. Thousands of one-star ratings saying: "Great game ruined by pay-to-win." "I loved this until they added power-ups." "Losing to people who spend money isn't fun."

They took the purest word game ever created and turned it into a slot machine.

Verdict: Closest thing to real Boggle, buried under a mountain of pay-to-win garbage.`,
      },
      {
        slug: 'word-blitz',
        title: '5. Word Blitz',
        content: `Word Blitz gets real-time competition right. You and your opponent stare at the same grid simultaneously, swiping words as fast as your thumbs can physically move. No waiting between turns. No power-ups ruining the experience (mostly). Pure speed and reflexes.

It's genuinely fun! For the 90 seconds each round lasts.

Then you realize there's nothing else. No progression system. No daily challenges. No special modes. It's one thing—fast Boggle—and it does that well. But I burned out in a month with nothing pulling me back except "do the same thing again."

It's like a restaurant that serves amazing fries and literally nothing else.

Verdict: Fast, pure, and fun. But thin. You'll love it for a month and then forget it exists.`,
      },
      {
        slug: 'lexiclash',
        title: '6. LexiClash',
        content: `Full disclosure: this is what I've been playing most lately. I'll try to be fair.

LexiClash is what happens when someone looks at Boggle and says "what if this, but more?" Real-time multiplayer on the same board with actual humans. Not async, not turn-based. Real-time. That alone makes it different from 90% of this list.

But what hooked me was variety. Daily challenges with global leaderboards. Boss battles against AI with special abilities. A blast mode that's basically Boggle with combos and chain reactions. Word Hunt where everyone races to find target words.

It supports four languages (English, Hebrew, Swedish, Japanese), which is useful if you want vocabulary practice in another language while native speakers destroy you. Educational masochism.

Most importantly. It's free. Genuinely, actually free. No pay-to-win power-ups. No "watch an ad to continue." Monetization doesn't interfere with gameplay at all, which in 2026 feels almost radical and refreshing.

Honest part: it's newer, so during off-peak hours you might wait for a match. Solo modes fill the gap (and they're good), but if you specifically want opponents at 3 AM on Tuesday, Words With Friends still wins on player count. For now.

UI can feel overwhelming at first—boss battles, daily challenges, practice mode, multiplayer lobbies, and more. Took me a day to navigate. Once I did, I was hooked. But there's a real learning curve.

Verdict: Most fun I've had with a word game since physical Boggle. Not perfect, but it's the only one on this list I'm still playing daily three months later.`,
      },
      {
        slug: 'comparison',
        title: 'The quick comparison',
        content: `Want raw gameplay? Wordle for logic puzzles, Word Blitz for pure speed, LexiClash for depth and variety. Want a massive community? Words With Friends (bring your wallet). Want to relax? Wordscapes. Want to feel betrayed by capitalism? Boggle With Friends.

What matters most to me when evaluating alternatives: does the game respect my time investment and my wallet? Let me break it down.

Wordle respects both but offers too little content. Words With Friends respects your time but not your wallet. Wordscapes respects neither (the constant ads are relentless). Boggle With Friends actively disrespects your wallet with essential power-ups. Word Blitz respects both your time and money but feels too shallow for long-term engagement. LexiClash respects both and actually keeps me coming back month after month.

Your personal preferences will differ based on what matters most to you.

That's the complete picture.`,
      },
      {
        slug: 'which-one-right-for-you',
        title: 'Which one is right for you',
        content: `If you want one daily puzzle to obsess over—Wordle. Perfect for that, nothing else.

If you want the biggest community with turn-based gameplay—Words With Friends. Just bring your wallet.

If you want real-time chaos with actual competition—LexiClash. That's the Boggle energy.

If you want relaxing solo play—Wordscapes.

If you want classic Boggle feel without pay-to-win mechanics—also LexiClash. I tried to find another option. Couldn't.`,
      },
      {
        slug: 'getting-sentimental',
        title: 'Why this matters',
        content: `Word games make you feel genuinely smart. Not in a pretentious or condescending way. In a "holy crap, I found QUATERNION in a 4x4 grid" way. That moment of recognition when your brain connects letters nobody else connected. That's the dopamine hit I've been chasing since age twelve.

The best games preserve that feeling. The worst bury it under monetization and gimmicks.

There's no single perfect word game. Wordle comes closest for its format. LexiClash for mine. Your perfect game depends on whether you want a daily ritual or competitive obsession, solo meditation or multiplayer mayhem.

But whatever you pick, make sure it's one where you actually feel something when you find a great word. That's the whole point.

Now excuse me, I have a daily challenge to finish and a boss to defeat. My streak won't maintain itself.`,
      },
    ],
    backToBlog: 'Back to Blog',
    playDaily: 'Try LexiClash Free',
    startPracticing: 'Play Now',
  },
  he: {
    title: 'ניסיתי כל משחק מילים שמצאתי. רובם מאכזבים.',
    subtitle: 'דירוג כנה (ומעט מטורף) של משחקי המילים הטובים ביותר ב-2026.',
    category: 'ביקורות',
    readTime: '10 דקות קריאה',
    authorName: 'חנון המילים',
    authorBio: 'שיחק יותר משחקי מילים ממה שנחשב חברתית מקובל. עדיין לא מצליח לנצח את אמא שלי ברמיקוב מילים.',
    sections: [
      {
        slug: 'intro',
        content: `אני רודף אחרי ההרגשה של באגל מאז שהייתי בן שתים עשרה.

אתם יודעים את ההרגשה. הקוביות שמתערבבות, שעון החול שמתהפך, כולם שחוחים מעל הדף וכותבים כמו משוגעים בזמן שהדוד מתעקש ש"קטע" זו מילה של שלוש אותיות (הוא צודק, אבל הוא איית את זה לא נכון). השילוב הזה של לחץ זמן, זיהוי דפוסים ותחרותיות? שום דבר אחר לא מגיע לזה.

אז באופן טבעי, בזבזתי כמות מביכה של זמן — ובואו נהיה כנים, גם כסף — על כל משחק מילים דיגיטלי שמבטיח לשחזר את ההרגשה הזו. רובם לא מצליחים. חלקם ממש מעצבנים. כמה מהם באמת מעולים.

אני הולך להיות כנה לגבי כולם. גם לגבי זה שבסוף הכי אהבתי.`,
      },
      {
        slug: 'what-makes-good-word-game',
        title: 'קודם כל — מה הופך משחק מילים לטוב?',
        content: `לפני שאני מרסק חצי מהרשימה (ואני אעשה את זה), הנה מה שאני מחפש. משחק מילים טוב צריך שלושה דברים:

הרגע שבו אתה מזהה מילה שאף אחד אחר לא ראה. לחץ זמן שגורם ללב לפעום מהר. וסיבה לחזור מחר.

בונוס אם הוא לא מנסה לסחוט ממני 20 שקל כל פעם שאני מפסיד. נגיע לזה.`,
      },
      {
        slug: 'wordle',
        title: '1. Wordle — זה שכולם מכירים',
        content: `בואו נתחיל עם הברור. Wordle הוא גאוני. חידה אחת ביום, שישה ניחושים, לא יותר. ההגבלה היא המשחק. החוויה המשותפת של כולם פותרים את אותו חידה היא מה שהפך את זה לתופעה תרבותית.

אבל הבעיה שלי: זה לוקח שלוש דקות.

אני מסיים את זה בשירותים לפני שהקפה מתחיל לפעול ואז אין לי כלום לשאר היום. חידה אחת. זהו. אני מכור ואתם נותנים לי מנה אחת? חבל.

וגם — וזה שנוי במחלוקת — Wordle זה לא באמת "משחק מילים" במובן הקלאסי. זה חידת היגיון שלובשת תחפושת של משחק מילים. אתה עושה אלימינציה, לא מחפש מילים. מיומנות שונה.

פסק דין: מושלם למה שהוא. גרוע אם אתה רוצה יותר משלוש דקות של בידור יומי.`,
      },
      {
        slug: 'words-with-friends-2',
        title: '2. Words With Friends 2 — זה שאמא שלך משחקת',
        content: `Words With Friends קיים מ-2009. בשנות אפליקציה זה בערך 400 שנה. יש לו את בסיס השחקנים הגדול ביותר. הדודה שלך משחקת. הקולגה שלך משחק. כולם.

המשחק הבסיסי סולידי. זה בעצם שבץ נא עם לוח אחר. המילון נדיב (מדי נדיב — הוא מקבל מילים שאני כמעט בטוח שלא קיימות).

אבל. המוניטיזציה.

הפאוור-אפים. "Word Radar" פשוט מראה לך את המילה הטובה ביותר על הלוח. "Swap+" נותן לך להחליף אותיות בלי להפסיד תור. אלה לא פיצ'רים של נוחות — אלה יתרונות של תשלום-כדי-לנצח.

והפורמט האסינכרוני אומר שאתה מחכה שעות (לפעמים ימים) ליריב. יש לי משחקים מלפני שלושה שבועות שעדיין פתוחים.

פסק דין: קהילה ענקית, בסיס סולידי, הרוס על ידי פאוור-אפים של תשלום-כדי-לנצח.`,
      },
      {
        slug: 'wordscapes',
        title: '3. Wordscapes — היפה',
        content: `Wordscapes באמת יפה. הרקעים מדהימים. מערכת ההתקדמות — פתיחת נופים חדשים כשפותרים חידות — מספקת את הדחף ההישגי.

בערך שבועיים.

ואז אתה מבין שכל חידה בעצם אותו דבר. אין תחרות, אין לחץ זמן, אין בני אדם אחרים מעורבים. זה משחק מילים למי שרוצה להירגע, מה שזה בסדר, אבל אני רוצה להרגיש את הלב פועם.

גם הפרסומות. אם לא משלמים על פרימיום, צופים בפרסומת של 30 שניות כל ארבע חידות.

פסק דין: יפה, מרגיע, ומרגש כמו לסדר ארון תבלינים לפי א"ב.`,
      },
      {
        slug: 'boggle-with-friends',
        title: '4. Boggle With Friends (Zynga) — הבגידה',
        content: `זה כואב הכי הרבה כי זה אמור להיות הכי טוב. זה פשוט באגל. באגל רשמי. הלוח, הטיימר, חיפוש המילים — הכל שם.

ואז Zynga עשתה את מה ש-Zynga עושה.

פאוור-אפים. הקפאת זמן. חשיפת מילים. ערבוב הלוח. דברים שמשברים את השוויון של מה שאמור להיות משחק מיומנות טהור. הפסדתי משחק אחרי משחק כי סירבתי להוציא כסף. ואני יודע שמצאתי יותר מילים מהיריב. אבל להם היה "Word Clue" ו-"Freeze" ופתאום 47 המילים שלי מפסידות ל-31 המילים שלהם פלוס בונוסים.

הביקורות באפ סטור מספרות הכל. אלפי ביקורות של כוכב אחד: "משחק מעולה שנהרס על ידי פאוור-אפים."

לקחו את משחק המילים הטהור ביותר שנוצר אי פעם והפכו אותו למכונת מזל. אני לא כועס. אני מאוכזב. (גם כועס.)

פסק דין: הדבר הכי קרוב לבאגל אמיתי, קבור מתחת להר של pay-to-win.`,
      },
      {
        slug: 'word-blitz',
        title: '5. Word Blitz — הספרינטר',
        content: `Word Blitz עושה משהו נכון שהרבה משחקים מפספסים: תחרות בזמן אמת. אתה והיריב מסתכלים על אותו לוח באותו זמן, מחליקים מילים כמה שהאצבעות יכולות. בלי המתנה. בלי פאוור-אפים (בעיקר). רק מהירות.

זה כיף! באמת כיף! ל-90 השניות של כל סיבוב.

הבעיה — אין הרבה יותר. אין מערכת התקדמות. אין אתגרים יומיים. אין מצבי משחק מיוחדים. זה דבר אחד — באגל מהיר — והוא עושה את הדבר האחד הזה טוב. אבל נשרפתי אחרי חודש.

פסק דין: מהיר, טהור וכיף — אבל רזה. תאהבו את זה חודש ואז תשכחו שהוא קיים.`,
      },
      {
        slug: 'lexiclash',
        title: '6. LexiClash — הילד החדש עם מה להוכיח',
        content: `גילוי נאות: זה המשחק שאני משחק הכי הרבה לאחרונה. אנסה להיות הוגן.

LexiClash זה מה שקורה כשמישהו מסתכל על באגל ואומר "מה אם עוד?" מולטיפלייר בזמן אמת — לא אסינכרוני, לא מבוסס תורות — זמן אמת. זה לבד הופך אותו לשונה מ-90% מהרשימה.

מה שבאמת תפס אותי היה המגוון. אתגרים יומיים שמשתנים כל יום (עם לוחות תוצאות גלובליים). קרבות בוסים נגד AI עם יכולות מיוחדות. מצב Blast שזה בעצם "מה אם לבאגל היו קומבוס ותגובות שרשרת." Word Hunt שבו כולם מתחרים למצוא מילות מטרה.

הוא תומך בארבע שפות — אנגלית, עברית, שוודית ויפנית — מה שאומר שאפשר לתרגל אוצר מילים בשפה אחרת בזמן שמקומיים מוחצים אותך. מזוכיזם חינוכי.

והוא חינמי. באמת חינמי. בלי pay-to-win. בלי "צפה בפרסומת כדי להמשיך."

עכשיו הנה החלק הכנה: הוא חדש יותר, אז הקהילה עדיין גדלה. בשעות שקטות, אולי תחכו קצת למשחק מולטיפלייר. המצבים הסולו ממלאים את הפער (והם טובים), אבל אם אתם מחפשים משחק עם יריבים בשלוש בלילה ביום שלישי, ל-Words With Friends עדיין יש יתרון בכמות שחקנים. לעת עתה.

עוד דבר — וזה קטן — הממשק יכול להרגיש עמוס כשפותחים בפעם הראשונה. קרבות בוסים ואתגרים יומיים ומצב תרגול ולובי מולטיפלייר ו... לקח לי יום להבין איפה הכל. אחרי שהבנתי, נתפסתי. אבל עקומת הלמידה אמיתית.

פסק דין: הכי כיף שהיה לי עם משחק מילים מאז באגל פיזי. לא מושלם, אבל זה היחיד ברשימה שאני עדיין משחק כל יום אחרי שלושה חודשים.`,
      },
      {
        slug: 'comparison',
        title: 'השוואה כנה שאף אחד לא ביקש',
        content: `אני אחסוך לכם זמן.

רוצים גיימפליי גולמי? Wordle ללוגיקה, Word Blitz למהירות, LexiClash לעומק. רוצים קהילה ענקית? Words With Friends (תביאו ארנק). רוצים להירגע? Wordscapes. רוצים להרגיש נבגדים על ידי הקפיטליזם? Boggle With Friends.

מה שבאמת חשוב לי: האם המשחק מכבד את הזמן שלי ואת הארנק שלי? LexiClash עושה את שניהם ומחזיר אותי. הקילומטראז' שלכם עשוי להשתנות.`,
      },
      {
        slug: 'which-one-right-for-you',
        title: 'איזה משחק מילים מתאים לך?',
        content: `כי כל מוח עובד אחרת, בואו נעשה את זה קל.

אם אתם רוצים חידה יומית אחת שמשגעת — Wordle. מושלם לזה ולשום דבר אחר.

אם אתם רוצים משחקים מבוססי תורות עם הקהילה הכי גדולה בעולם — Words With Friends. רק תביאו ארנק, כי תצטרכו פאוור-אפים ברמות גבוהות.

אם אתם רוצים כאוס בזמן אמת עם חברים, סוג המשחק שגורם לכם לצעוק על הטלפון — LexiClash. זו אנרגיית הבאגל.

אם אתם רוצים מצב זן סולו, משהו להירגע איתו בזמן האזנה לפודקאסט — Wordscapes.

אם אתם רוצים את תחושת הבאגל הקלאסית בלי הזבל של pay-to-win — גם LexiClash, בכנות. ניסיתי למצוא אופציה אחרת. לא הצלחתי.`,
      },
      {
        slug: 'getting-sentimental',
        title: 'החלק שבו אני נהיה רגשני',
        content: `הנה העניין עם משחקי מילים שאף תיאור באפ סטור לא תופס: הם גורמים לך להרגיש חכם. לא בצורה יהירה. בצורה של "רגע, מצאתי את המילה 'התקשרויות' בלוח 4x4." הרגע הזה של זיהוי, כשהמוח שלך מחבר אותיות שאף אחד אחר לא חיבר — זה הדופמין שאני רודף אחריו מאז גיל שתים עשרה.

משחקי המילים הטובים שומרים על ההרגשה הזו. הגרועים קוברים אותה מתחת למוניטיזציה ולגימיקים.

אין משחק מילים מושלם אחד. Wordle מגיע קרוב לפורמט שלו. LexiClash מגיע קרוב לשלי. המשחק המושלם שלכם תלוי בשאלה אם אתם רוצים טקס יומי או אובססיה תחרותית, מדיטציה סולו או טירוף מולטיפלייר.

אבל מה שלא תבחרו, ודאו שזה משחק שבו אתם באמת מרגישים משהו כשמוצאים מילה מדהימה. זו כל הפואנטה.

עכשיו סליחה, יש לי אתגר יומי לסיים ובוס להביס. הסטריק של 63 ימים לא ישמור על עצמו.`,
      },
    ],
    backToBlog: 'חזרה לבלוג',
    playDaily: 'נסו את LexiClash בחינם',
    startPracticing: 'שחקו עכשיו',
  },

  sv: {
    title: 'Jag testade alla Boggle-alternativ jag kunde hitta. De flesta suger.',
    subtitle: 'En ärlig (och lite galen) ranking av de bästa ordspelen 2026.',
    category: 'Recensioner',
    readTime: '10 min läsning',
    authorName: 'Ordnörden',
    authorBio: 'Har spelat fler ordspel än vad som är socialt acceptabelt. Förlorar fortfarande mot mamma i Alfapet.',
    sections: [
      {
        slug: 'intro',
        content: `Jag har jagat Boggle-känslan sedan jag var tolv.

Ni vet vilken jag menar. Det skramliga plastgallret, sandklockan som vänds, alla lutade över sina block och skriver som galningar medan farbror insisterar på att "QAT" är ett ord. Den specifika blandningen av tidspress, mönsterigenkänning och tävlingsinstinkt? Inget annat ger samma kick.

Så naturligtvis har jag spenderat en pinsam mängd tid — och ska vi vara ärliga, pengar — på att testa varje digitalt ordspel som lovar att återskapa den känslan. De flesta lyckas inte. Några gör mig aktivt arg. Några få är genuint bra.

Jag ska vara ärlig om alla. Även det jag gillade mest i slutändan.`,
      },
      {
        slug: 'what-makes-good-word-game',
        title: 'Först — vad gör ett ordspel bra?',
        content: `Innan jag sablar ner halva listan (och det kommer jag att göra), låt mig förklara vad jag letar efter. Ett bra ordspel behöver tre saker:

Den där "aha"-stunden när du hittar ett ord som ingen annan ser. Tidspress som får handflatorna att svettas. Och en anledning att komma tillbaka imorgon.

Bonuspoäng om det inte försöker skaka ur mig 50 kronor varje gång jag förlorar.`,
      },
      {
        slug: 'wordle',
        title: '1. Wordle — Den alla känner till',
        content: `Wordle är briljant. Ett pussel om dagen, sex gissningar, inte mer, inte mindre. Begränsningen ÄR spelet. Den delade upplevelsen av att alla löser samma pussel är vad som gjorde det till ett kulturfenomen.

Men mitt problem: det tar ungefär tre minuter.

Jag menar inte det som en komplimang. Jag menar att jag gör klart det på toaletten innan kaffet kickar in och sen har jag inget resten av dagen. Ett pussel. Det är allt. Jag är en missbrukare och ni ger mig en enda dos?

Och — det här blir kontroversiellt — det är egentligen inte ett "ordspel" i Boggle-bemärkelsen. Det är ett logikpussel i ordspelskläder.

Omdöme: Perfekt för vad det är. Uselt om du vill ha mer än tre minuters daglig underhållning.`,
      },
      {
        slug: 'words-with-friends-2',
        title: '2. Words With Friends 2 — Det din mamma spelar',
        content: `Words With Friends har funnits sedan 2009. I app-år är det ungefär 400 år gammalt. Det har den största spelarbasen av alla ordspel. Din moster spelar det. Din kollega spelar det.

Grundspelet är solitt. Det är Alfapet med en annan brädlayout. Ordboken är generös (för generös, ärligt talat). Att hitta motståndare är aldrig ett problem.

Men herregud, monetariseringen.

Power-ups. "Word Radar" visar bokstavligen det bästa ordet på brädet. "Swap+" låter dig byta brickor utan att förlora en tur. Det här är inte quality-of-life-funktioner — det är rena pay-to-win-fördelar.

Och det asynkrona formatet betyder att du väntar timmar (ibland dagar) på att motståndaren ska spela. Jag har spel från tre veckor sedan som fortfarande pågår.

Omdöme: Enorm community, solid grund, förstörd av pay-to-win och tempot av ett schackparti via brevduva.`,
      },
      {
        slug: 'wordscapes',
        title: '3. Wordscapes — Den snygga',
        content: `Wordscapes är genuint vackert. Bakgrunderna är fantastiska. Progressionssystemet — att låsa upp nya landskap när man löser pussel — tilltalar samlaren i en.

I ungefär två veckor.

Sen inser du att varje pussel i princip är likadant. Ingen tävling, ingen tidspress, inga andra människor inblandade. Det är ett ordspel för den som vill slappna av, vilket är helt okej, men jag vill känna hjärtat bulta.

Omdöme: Vackert, avslappnande, och ungefär lika spännande som att sortera kryddburkar i bokstavsordning.`,
      },
      {
        slug: 'boggle-with-friends',
        title: '4. Boggle With Friends (Zynga) — Sveket',
        content: `Den här gör mest ont för att den borde vara bäst. Det är bokstavligen Boggle. Officiellt Boggle. Rutnätet, timern, ordletandet — allt finns där.

Och sen gjorde Zynga det Zynga gör.

Power-ups. Frysa tid. Avslöja ord. Blanda brädet. Saker som fundamentalt bryter den kompetitiva integriteten i vad som borde vara ett rent skicklighetsspel. Jag har förlorat match efter match för att jag vägrar spendera pengar. Och jag VET att jag hittade fler ord. Men motståndaren hade "Word Clue" och "Freeze" och plötsligt förlorar mina 47 ord mot deras 31-ord-plus-bonusar.

Recensionerna berättar hela historien. Tusentals 1-stjärniga recensioner: "Bra spel förstört av pay-to-win."

De tog det renaste ordspelet som någonsin skapats och förvandlade det till en enarmad bandit.

Omdöme: Det närmaste verklig Boggle, begravt under ett berg av pay-to-win-skräp. En tragedi.`,
      },
      {
        slug: 'word-blitz',
        title: '5. Word Blitz — Sprintern',
        content: `Word Blitz gör något rätt som många spel missar: realtidstävling. Du och motståndaren stirrar på samma rutnät samtidigt och sveper ord så fort fingrarna hinner. Ingen väntan. Inga power-ups (mestadels). Bara ren hastighet.

Det är kul! Genuint kul! I de 90 sekunder varje runda varar.

Problemet är att det inte finns mycket mer. Inget progressionssystem värt att nämna. Inga dagliga utmaningar. Inget som drar dig tillbaka förutom "gör samma sak igen."

Omdöme: Snabbt, rent och kul — men tunt. Du älskar det en månad och glömmer sen att det finns.`,
      },
      {
        slug: 'lexiclash',
        title: '6. LexiClash — Nykomlingen med något att bevisa',
        content: `Full transparens: det här är det jag har spelat mest på sistone. Jag ska försöka vara rättvis.

LexiClash är vad som händer när någon tittar på Boggle och säger "tänk om det här, fast mer?" Multiplayer i realtid där du tävlar mot riktiga människor på samma bräde samtidigt (inte asynkront, inte turbaserat — realtid). Det ensamt gör det annorlunda från 90% av den här listan.

Men det som faktiskt hookade mig var variationen. Dagliga utmaningar som ändras varje dag (med globala topplistor). Boss-strider mot AI-motståndare med specialförmågor. Ett blast-läge som i princip är "tänk om Boggle hade combos och kedjereaktioner." Word Hunt-läge där alla tävlar om att hitta specifika målord.

Det stöder fyra språk — engelska, hebreiska, svenska och japanska — vilket är en konstig flex men betyder att du kan öva ordförråd på ett annat språk. I Sverige ger det en unik möjlighet att spela på svenska, något de flesta ordspel inte erbjuder.

Och det är gratis. Faktiskt gratis. Inga pay-to-win power-ups.

Nu den ärliga delen: det är nyare, så communityn växer fortfarande. Under lugna timmar kan du behöva vänta lite på multiplayer-matcher. Solo-lägena fyller gapet (och de är bra), men om du specifikt vill hitta motståndare klockan tre på natten har Words With Friends fortfarande fler spelare. Tills vidare.

En annan sak — gränssnittet kan kännas som mycket när du öppnar det första gången. Det tog mig en dag att hitta allt. Sen var jag fast.

Omdöme: Det roligaste jag haft med ett ordspel sedan fysisk Boggle. Inte perfekt, men det enda på listan jag fortfarande spelar dagligen tre månader senare.`,
      },
      {
        slug: 'comparison',
        title: 'Den ärliga jämförelsen ingen bad om',
        content: `Jag sparar er tid.

Vill ni ha rå spelkänsla? Wordle för logik, Word Blitz för hastighet, LexiClash för djup. Vill ni ha en enorm community? Words With Friends (ta med plånboken). Vill ni slappna av? Wordscapes. Vill ni känna er svikna av kapitalismen? Boggle With Friends.

Det som faktiskt spelar roll för mig: respekterar spelet min tid och min plånbok? LexiClash gör bådadera och får mig att komma tillbaka.`,
      },
      {
        slug: 'which-one-right-for-you',
        title: 'Vilket ordspel passar dig?',
        content: `Eftersom allas hjärnor funkar olika, gör vi det enkelt.

Om du vill ha ett dagligt pussel att tjata om på lunchen — Wordle.

Om du vill ha turbaserade spel med den största communityn på planeten — Words With Friends. Ta med plånboken.

Om du vill ha realtidskaos med vänner, den sortens spel där du skriker åt telefonen — LexiClash. Det är Boggle-energin.

Om du vill ha solo-zen, något att varva ner med — Wordscapes.

Om du vill ha den klassiska Boggle-känslan utan pay-to-win-skräpet — också LexiClash, ärligt talat. Jag försökte hitta ett annat alternativ. Det gick inte.`,
      },
      {
        slug: 'getting-sentimental',
        title: 'Delen där jag blir sentimental',
        content: `Här är grejen med ordspel som ingen app-beskrivning fångar: de får dig att känna dig smart. Inte på ett pretentiöst sätt. På ett "herregud, jag hittade KONSTITUTION i ett 4x4-rutnät"-sätt. Det ögonblicket av igenkänning, när din hjärna kopplar ihop bokstäver som ingen annan kopplat — det är dopaminkicken jag har jagat sedan jag var tolv.

De bästa ordspelen bevarar den känslan. De sämsta begraver den under monetarisering och gimmickar.

Det finns inget enskilt perfekt ordspel. Wordle kommer nära för sitt format. LexiClash kommer nära för mitt. Ditt perfekta spel beror på om du vill ha en daglig ritual eller en tävlingsbesatthet, solo-meditation eller multiplayer-kaos.

Men vad du än väljer, se till att det är ett spel där du faktiskt känner något när du hittar ett fantastiskt ord. Det är hela poängen.

Nu måste ni ursäkta mig, jag har en daglig utmaning att avsluta och en boss att besegra. Min 63-dagars streak sköter sig inte själv.`,
      },
    ],
    backToBlog: 'Tillbaka till bloggen',
    playDaily: 'Prova LexiClash gratis',
    startPracticing: 'Spela nu',
  },

  ja: {
    title: 'Boggle系ゲームを片っ端から試した。ほとんどハズレだった。',
    subtitle: '2026年のワードゲームを本音でランキング。忖度なし。',
    category: 'レビュー',
    readTime: '10分で読める',
    authorName: 'ワードオタク',
    authorBio: '社会的に許容される量をはるかに超えるワードゲームをプレイ済み。それでも母親にしりとりで勝てない。',
    sections: [
      {
        slug: 'intro',
        content: `12歳の時からBoggleの快感を追い求めている。

あの感覚、わかるでしょう。プラスチックのグリッドがカタカタ鳴って、砂時計がひっくり返って、みんな必死にメモ帳に書き殴る。時間のプレッシャー、パターン認識、そして負けたくないという意地。あの組み合わせに匹敵するものは他にない。

だから当然、あの感覚を再現すると謳うデジタルワードゲームに、恥ずかしい量の時間（正直に言えば、お金も）を費やしてきた。ほとんどはダメだった。いくつかは本気でイライラした。でも数本は本当に素晴らしかった。

全部について正直に書く。一番気に入ったやつについても。`,
      },
      {
        slug: 'what-makes-good-word-game',
        title: 'まず — 良いワードゲームの条件',
        content: `リストの半分をこき下ろす前に（そうするつもりだ）、何を求めているか説明させてほしい。良いワードゲームには3つの要素が必要だ。

誰も見つけていない単語を発見した時の「あっ！」という瞬間。手のひらが汗ばむ時間のプレッシャー。そして明日もやりたくなる理由。

負けるたびに500円要求してこないならボーナスポイント。`,
      },
      {
        slug: 'wordle',
        title: '1. Wordle — みんなが知っているやつ',
        content: `まずこれから片付けよう。Wordleは天才的だ。1日1問、6回の推測、それ以上でもそれ以下でもない。制約こそがゲームだ。全員が同じパズルを解くという共有体験が、これを文化現象にした。

でも問題がある。3分で終わる。

褒めてるんじゃない。コーヒーが効く前にトイレで終わらせて、あとは一日中何もない。1問。以上。中毒者に1回分だけ渡すの？勘弁してくれ。

それに — 議論を呼ぶだろうけど — これは厳密には「ワードゲーム」じゃない。ワードゲームの皮を被った論理パズルだ。消去法であって、単語発見じゃない。別のスキル。でも素晴らしい。ただ違う。

日本ではWordleの日本語版やそれに触発されたゲーム（「ことのは」など）も人気だけど、同じ「1日1問」の制約がある。

評決：それ自体としては完璧。1日3分以上の娯楽が欲しいなら物足りない。`,
      },
      {
        slug: 'words-with-friends-2',
        title: '2. Words With Friends 2 — お母さんがやっているやつ',
        content: `Words With Friendsは2009年から存在している。アプリ年齢では約400歳だ。ワードゲームで最大のプレイヤーベースを誇る。

基本ゲームは堅実。別のボードレイアウトのScrabbleだ。辞書は寛大（寛大すぎる — 本当に存在するか90%疑わしい単語も受け入れる）。

しかし。課金要素。

パワーアップ。「Word Radar」はボード上の最適な単語をそのまま表示する。「Swap+」はターンを失わずにタイルを交換できる。これは利便性の機能じゃない — 純粋な課金勝利のアドバンテージだ。

非同期フォーマットは相手のプレイを何時間（時には何日も）待つことを意味する。

日本ではScrabble文化が薄いので、このゲームの魅力は海外ほどは伝わらないかもしれない。でも英語学習者にとっては良い練習になる（課金しなければ）。

評決：巨大コミュニティ、堅実な基盤、課金勝利パワーアップと郵便チェスのペースで台無し。`,
      },
      {
        slug: 'wordscapes',
        title: '3. Wordscapes — きれいなやつ',
        content: `Wordscapesは本当に美しい。背景は素晴らしい。パズルを解くと新しい風景が解放される進行システムは、コンプリート欲を満たしてくれる。

約2週間は。

そのあと、全部のパズルが基本的に同じだと気づく。競争もない、時間のプレッシャーもない、他の人間も関係ない。リラックスしたい人向けのワードゲームで、それはそれでいいけど、心臓がバクバクする感覚が欲しいんだ。

広告も。プレミアムを払わなければ、4パズルごとに30秒の広告を見せられる。

評決：美しく、リラックスでき、スパイスラックをアイウエオ順に並べるのと同じくらいエキサイティング。`,
      },
      {
        slug: 'boggle-with-friends',
        title: '4. Boggle With Friends (Zynga) — 裏切り',
        content: `これが一番つらい。最高のはずだから。文字通りBoggleだ。公式Boggle。グリッド、タイマー、単語探し — 全部ある。

そしてZyngaがZyngaらしいことをした。

パワーアップ。時間凍結。単語の表示。ボードのシャッフル。純粋なスキルゲームであるべきものの競争的公平性を根本的に壊す要素。お金を使うことを拒否したせいで何度も負けた。相手より多く単語を見つけたとわかっているのに。でも相手には「Word Clue」と「Freeze」があって、突然こっちの47単語が相手の31単語+ボーナスに負ける。

App Storeのレビューが全てを物語っている。何千もの1つ星レビュー：「課金で台無し。」

史上最も純粋なワードゲームをスロットマシンに変えた。怒ってない。がっかりしてる。（怒ってもいる。）

評決：本物のBoggleに最も近いが、課金勝利のゴミの山に埋もれている。悲劇。`,
      },
      {
        slug: 'word-blitz',
        title: '5. Word Blitz — スプリンター',
        content: `Word Blitzは多くのゲームが見逃していることを正しくやっている：リアルタイム対戦。自分と相手が同時に同じグリッドを見て、指が追いつく限りの速さで単語をスワイプする。待ち時間なし。パワーアップなし（ほぼ）。純粋なスピード。

楽しい！本当に楽しい！各ラウンドの90秒間は。

問題は、それ以外があまりないこと。進行システムなし。デイリーチャレンジなし。スペシャルモードなし。一つのこと — 高速Boggle — をうまくやるが、それだけ。1ヶ月で燃え尽きた。

評決：速く、純粋で、楽しい — でも薄い。1ヶ月好きになって、その後存在を忘れる。`,
      },
      {
        slug: 'lexiclash',
        title: '6. LexiClash — 何かを証明しようとしている新顔',
        content: `正直に言う：最近一番プレイしているゲームだ。公平に評価しようと思う。

LexiClashは誰かがBoggleを見て「これをもっと膨らませたら？」と言った結果だ。リアルタイムマルチプレイヤー — 非同期でもターン制でもない、リアルタイム。それだけでリストの90%と差別化される。

でも本当にハマったのはバラエティだ。毎日変わるデイリーチャレンジ（グローバルリーダーボードつき）。特殊能力を持つAI相手のボスバトル。コンボとチェインリアクションのあるBlastモード。全員が特定のターゲットワードを探すWord Huntモード。

4言語対応 — 英語、ヘブライ語、スウェーデン語、日本語。日本語でプレイできるBoggle系ゲームは実は少ない。日本には「もじぴったん」や「ことばのパズル」など独自の素晴らしいワードゲーム文化があるけど、リアルタイム対戦で文字を探すタイプのゲームは意外と選択肢が限られている。LexiClashはそのニッチを埋めてくれる。

そして無料。本当に無料。課金勝利パワーアップなし。「広告を見て続ける」もなし。

正直な部分：新しいので、コミュニティはまだ成長中。オフピーク時はマルチプレイヤーマッチに少し待つかもしれない。ソロモードがギャップを埋めてくれるし、それも良い出来だけど、火曜の午前3時に対戦相手を探すなら、Words With Friendsのほうがプレイヤー数では上。今のところ。

もう一つ — UIは最初開いた時に情報量が多く感じるかもしれない。ボスバトルにデイリーチャレンジに練習モードにマルチプレイヤーロビーに…全部把握するのに1日かかった。把握したらハマった。でも学習曲線はある。

評決：物理的なBoggle以来最も楽しいワードゲーム体験。完璧じゃないけど、3ヶ月後もまだ毎日プレイしているのはリストでこれだけ。`,
      },
      {
        slug: 'comparison',
        title: '誰も頼んでいない正直な比較',
        content: `時間を節約しよう。

生のゲームプレイが欲しい？ロジックならWordle、スピードならWord Blitz、深さならLexiClash。巨大コミュニティが欲しい？Words With Friends（財布を持ってきて）。リラックスしたい？Wordscapes。資本主義に裏切られた気分になりたい？Boggle With Friends。

自分にとって本当に大事なこと：ゲームは自分の時間と財布を尊重しているか？LexiClashは両方尊重して、毎日戻ってくる理由をくれる。`,
      },
      {
        slug: 'which-one-right-for-you',
        title: 'あなたに合うワードゲームは？',
        content: `脳の仕組みはみんな違うから、シンプルにしよう。

1日1問のパズルに取り憑かれたいなら — Wordle。それに完璧で、それ以外には不向き。

最大のコミュニティでターン制ゲームがしたいなら — Words With Friends。ただし財布は必要。上のレベルで戦うにはパワーアップがいる。

友達とリアルタイムのカオスがしたいなら、スマホに叫ぶような体験がしたいなら — LexiClash。これがBoggleのエネルギー。

ソロでゼンモードがしたいなら、ポッドキャスト聴きながらリラックスするものが欲しいなら — Wordscapes。

課金勝利のゴミなしでクラシックBoggleの感覚が欲しいなら — これもLexiClash、正直に言って。他の選択肢を探した。見つからなかった。`,
      },
      {
        slug: 'getting-sentimental',
        title: 'センチメンタルになるパート',
        content: `ワードゲームについて、どのアプリ説明文も捉えていないことがある：賢くなった気分にさせてくれる。嫌味な意味じゃなく。「4x4のグリッドで"国際連合"を見つけた！」という意味で。あの認識の瞬間、自分の脳が誰も繋げなかった文字を繋げた時 — それが12歳から追い求めているドーパミンだ。

最高のワードゲームはその感覚を守る。最悪のものは課金とギミックの下に埋もれさせる。

完璧なワードゲームは一つもない。Wordleはそのフォーマットで近づく。LexiClashは自分のフォーマットで近づく。あなたの完璧なゲームは、日課が欲しいのか競争への執着が欲しいのか、ソロの瞑想かマルチプレイヤーの狂乱かによる。

でも何を選んでも、素晴らしい単語を見つけた時に本当に何かを感じるゲームを選んでほしい。それが全てのポイントだ。

さて失礼、デイリーチャレンジを終わらせてボスを倒さないと。63日のストリークは勝手には続かないから。`,
      },
    ],
    backToBlog: 'ブログに戻る',
    playDaily: 'LexiClashを無料で試す',
    startPracticing: '今すぐプレイ',
  },
};
