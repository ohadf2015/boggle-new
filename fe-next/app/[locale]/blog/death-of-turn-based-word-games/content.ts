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
  playDaily: string;
  startPracticing: string;
};

export const contentByLocale: Record<string, LocaleContent> = {
  en: {
    title: `I Waited 11 Days for Someone to Play 'QI.' Then I Deleted the App.`,
    subtitle: 'Turn-based word games taught a whole generation that playing with friends means waiting for friends. Real-time word games are correcting that mistake.',
    category: 'Opinion',
    readTime: '9 min read',
    authorName: 'Ohad Fisher',
    authorBio: 'Has 4 unfinished turn-based matches haunting his phone and zero regrets about abandoning them.',
    sections: [
      {
        content: `The notification arrived on a Tuesday: "Karen played QI for 22 points."

Eleven days. That's how long Karen — lovely Karen, mother of two, woman I see every week at trivia night — took to play a two-letter word. And here's the embarrassing part: when her move finally landed, I didn't feel excitement. I felt obligation. Now it was my turn, and the clock of social guilt had started ticking again.

I stared at the board for a second, realized I couldn't remember why either of us cared, and did what millions of people quietly do every year: I closed the app, and I never opened it again.

That's the dirty secret of turn-based word games. We don't finish them. We just stop, mutually, wordlessly, like two people who both pretended to enjoy a bad movie.`,
      },
      {
        title: 'Turn-based was a compromise, not a feature',
        content: `Here's something the app stores won't tell you: nobody designed turn-based multiplayer because it was fun. It was a workaround.

In 2009, when Words With Friends launched, phones had spotty connections, battery life was measured in hours, and push notifications were a novelty. "Your opponent will move eventually, we'll ping you" was the only multiplayer that technically worked. Async wasn't a design philosophy. It was a concession to hardware.

And it was fine! For 2010, it was great. But the constraint disappeared and the compromise stayed. We kept playing word games as a series of unread notifications long after our phones became capable of running real-time anything. The technology grew up. The genre didn't.

Compare it to every other kind of game you play with friends. You don't play Mario Kart by mail. You don't take a free kick, close the PlayStation, and wait for your friend to log in Thursday. The whole point of a game with another person is that the other person is there.`,
      },
      {
        title: 'The math of a dead match',
        content: `I did an audit of my own phone before writing this. Fourteen turn-based matches started in the past year. Nine died before move 20. Three are technically "active" but haven't seen a move in over a month — the multiplayer equivalent of a houseplant you keep forgetting to water. Two actually finished. Two.

And the finishing rate isn't even the worst part. The worst part is what async does to the feeling of competition. A word game is supposed to have tension — you're ahead, they're catching up, someone pulls a ridiculous word out of nowhere and the whole dynamic flips. Spread that across eleven days and it's not tension. It's a correspondence course.

Psychologists call it "context switching cost": every time a game asks you to re-enter days later, your brain has to reload the whole situation. Who am I playing? What's the score? What was my plan? Most of the time, the honest answer is "who cares," and the match quietly joins the nine others in the graveyard.`,
      },
      {
        title: 'Group chats killed the two-player duel anyway',
        content: `Even if you're the rare disciplined soul who finishes async matches, notice who they're with: exactly one other person, the two of you locked in a months-long duel neither remembers starting.

That's not how people socialize anymore. We socialize in group chats, in Discord servers, in family WhatsApp threads with one chaotic aunt. And async word games have no answer for the group. You can't run a turn-based game with eight friends — by the time turn six comes around, two people have changed phones.

The groups I know that still play word games together all converged on the same solution: one live room, one shared grid, everyone in at the same time. Not because someone pitched them on it. Because it's the only format that survives contact with a real group of humans who all have somewhere to be in twenty minutes.`,
      },
      {
        title: 'What real-time actually feels like',
        content: `The first time I played a real-time word battle, it was almost embarrassing how fast it escalated.

Same setup as always — a grid of letters, find words — except eight of us were on the same grid at the same moment, and the round lasted three minutes. Thirty seconds in, someone found QUARTZ and the group chat erupted. A minute later my brother-in-law, a man who has never beaten me at anything involving vocabulary, strung together a seven-letter word I'd scrolled past four times, and he will be dining out on it until roughly 2031.

Three minutes. One winner. Zero notifications. When it ended, nobody said "your move." Everybody said "again."

That's the thing async could never deliver: a story. Something that happened to all of you, at the same time, that you can be insufferable about at dinner. Turn-based games generate admin. Real-time games generate lore.`,
      },
      {
        title: 'When turn-based still wins (yes, really)',
        content: `I'll be honest rather than right: async isn't dead for everyone.

If your word-game partner lives twelve time zones away, turn-based is genuinely the only way to share a game — and there's something sweet about a match that ambles along for months between two old friends. If you love the slow chess of Scrabble-style board control, where a single move deserves twenty minutes of thought, real-time will feel like being yelled at. And some people simply don't want another real-time thing in their lives. Fair. Genuinely.

But that's a niche, and we should call it one. "I want a slow, thoughtful, two-person word correspondence" is a taste. "I want to play word games with my friends" — the thing hundreds of millions of downloads were sold on — was never actually being served by apps that made you wait eleven days for QI.`,
      },
      {
        title: 'How to get your friends actually playing tonight',
        content: `The bar for a real-time word game night is comically low, which is kind of the point:

1. Pick a browser-based game. If anyone has to download an app or make an account, you'll lose two people immediately. (I run LexiClash rooms for exactly this reason — you share a link, people tap it, they're in. But the principle holds whatever you play.)
2. Put the grid on the biggest screen you have. TV, laptop propped on a shelf, whatever. Everyone else plays from their phone. Instant party.
3. Keep rounds short. Three minutes is the sweet spot — long enough for a comeback, short enough that losing stings for exactly as long as it takes to hit "rematch."
4. Play best-of-five and stop while it's still fun. The goal is that next week, someone else suggests it.`,
      },
      {
        title: 'FAQ',
        content: `Are turn-based word games dying?
Not dead, but shrinking into a niche. The apps still have loyal daily players, but the cultural energy — downloads, group play, word-of-mouth — has moved to real-time and daily-puzzle formats. Turn-based increasingly serves long-distance duels and slow, deliberate play rather than mainstream social gaming.

What should I play instead of Words With Friends online?
Look for a real-time word game that runs in the browser with no download and no account — that's what makes group play actually happen. LexiClash is built for exactly this: create a room, share one link, and up to 50 friends play the same letter grid live. Rounds take 2-3 minutes instead of days.

Is real-time better for parties and groups?
Yes — real-time is the only format that scales past two players. Everyone plays simultaneously, so a round fits into a party, a classroom, or a family dinner. Turn-based games break down in groups because each turn multiplies the waiting.

Can I play word games with friends online for free?
Yes. LexiClash is free, runs in any browser, and needs no signup: create a room, share the link or QR code, and friends join instantly from phones or laptops. Solo play against AI bots is free too.`,
      },
    ],
    backToBlog: 'Back to Blog',
    playDaily: 'Try the Daily Challenge',
    startPracticing: 'Play Free Now',
  },
  he: {
    title: 'חיכיתי 11 יום שמישהי תשחק את המילה "את". ואז מחקתי את האפליקציה.',
    subtitle: 'משחקי מילים מבוססי תורות לימדו דור שלם שלשחק עם חברים זה לחכות לחברים. משחקי מילים בזמן אמת מתקנים את הטעות הזו.',
    category: 'דעה',
    readTime: '9 דקות קריאה',
    authorName: 'אוהד פישר',
    authorBio: 'ארבעה דו-קרבות לא גמורים רודפים אותו בטלפון. אפס חרטות.',
    sections: [
      {
        content: `ההתראה הגיעה ביום שלישי: "סיגלית שיחקה את המילה 'את' ב-22 נקודות."

אחד עשר יום. זה כמה זמן שלקח לסיגלית — סיגלית המקסימה, אמא לשניים, שאני פוגש כל שבוע בערב הטריוויה בפאב — לשחק מילה בת שתי אותיות. והנה החלק המביך: כשהמהלך שלה סוף סוף נחת, לא הרגשתי התרגשות. הרגשתי מחויבות. עכשיו התור שלי, ושעון האשמה החברתית התחיל לתקתק מחדש.

בהיתי בלוח שנייה, הבנתי שאני כבר לא זוכר למה מישהו מאיתנו התחיל את זה, ועשיתי מה שמיליוני אנשים עושים בשקט כל שנה: סגרתי את האפליקציה, ולא פתחתי אותה יותר.

זה הסוד המלוכלך של משחקי מילים מבוססי תורות. אנחנו לא מסיימים אותם. אנחנו פשוט מפסיקים, שנינו, בלי מילה, כמו זוג שיוצא מסרט גרוע ושני הצדדים מעמידים פנים שנהנו.`,
      },
      {
        title: 'מבוסס התורות היה פשרה, לא פיצ\'ר',
        content: `הנה משהו שחנויות האפליקציות לא יספרו לכם: אף אחד לא תכנן מולטיפלייר מבוסס תורות כי זה כיף. זה היה מעקף.

ב-2009, כש-Words With Friends עלתה, לטלפונים הייתה קליטה רעועה, סוללה שנמדדת בשעות, והתראות פוש היו קסם חדש. "היריב שלך יזוז מתישהו, אנחנו נצפצף לך" היה המולטיפלייר היחיד שעבד טכנית. אסינכרוני לא הייתה פילוסופיית עיצוב. זה היה ויתור לחומרה.

וזה היה בסדר! ל-2010, זה היה נהדר. אבל האילוץ נעלם והפשרה נשארה. המשכנו לשחק משחקי מילים כסדרה של התראות שלא נקראות, הרבה אחרי שהטלפונים שלנו כבר יכלו להריץ כל דבר בזמן אמת. הטכנולוגיה גדלה. הז'אנר לא.

תשוו לכל סוג אחר של משחק שמשחקים עם חברים. לא משחקים מריו קארט בדואר. אף אחד לא בועט בעיטה חופשית, סוגר את הפלייסטיישן ומחכה שהחבר יתחבר ביום חמישי. כל הקטע של משחק עם בן אדם אחר הוא שהבן אדם האחר שם.`,
      },
      {
        title: 'המתמטיקה של דו-קרב מת',
        content: `לפני שכתבתי את זה עשיתי ביקורת על הטלפון שלי. ארבעה עשר דו-קרבות מבוססי תורות שנפתחו בשנה האחרונה. תשעה מתו לפני מהלך 20. שלושה עדיין "פעילים" טכנית אבל לא ראו מהלך יותר מחודש — המקבילה המולטיפליירית של עציץ ששוכחים להשקות. שניים באמת הסתיימו. שניים.

ואחוז הסיום הוא אפילו לא החלק הגרוע. החלק הגרוע הוא מה שאסינכרוני עושה לתחושת התחרות. משחק מילים אמור להיות מתח — אתה ביתרון, הם מדביקים, מישהו שולף מילה מטורפת משום מקום וכל הדינמיקה מתהפכת. תפרסו את זה על פני אחד עשר יום וזה כבר לא מתח. זה קורס של האוניברסיטה הפתוחה.

פסיכולוגים קוראים לזה "מחיר מעבר ההקשר": כל פעם שמשחק מבקש מכם לחזור אליו אחרי ימים, המוח צריך לטעון מחדש את כל הסיטואציה. נגד מי אני משחק? מה התוצאה? מה הייתה התוכנית שלי? רוב הזמן, התשובה הכנה היא "למי אכפת", והדו-קרב מצטרף בשקט לתשעת האחרים בבית הקברות.`,
      },
      {
        title: 'קבוצות הוואטסאפ הרגו את הדו-קרב ממילא',
        content: `גם אם אתם מהממושעים הנדירים שמסיימים דו-קרבות אסינכרוניים, תשימו לב מול מי הם: בן אדם אחד בדיוק, שניכם נעולים בדו-קרב בן חודשים שאף אחד מכם לא זוכר מתי התחיל.

ככה לא מסתובבים יותר. אנחנו מסתובבים בקבוצות, בשרתי דיסקורד, בקבוצות וואטסאפ משפחתיות עם דודה אחת כאוטית. ולמשחקי מילים אסינכרוניים אין תשובה לקבוצה. אי אפשר לנהל משחק מבוסס תורות עם שמונה חברים — עד שמגיע תור שש, שניים כבר החליפו טלפון.

כל הקבוצות שאני מכיר שעדיין משחקות משחקי מילים ביחד הגיעו לאותו פתרון: חדר אחד חי, לוח אחד משותף, כולם בפנים באותו רגע. לא כי מישהו מכר להם את זה. כי זה הפורמט היחיד ששורד מגע עם קבוצת בני אדם אמיתית שכולם צריכים להיות במקום אחר בעוד עשרים דקות.`,
      },
      {
        title: 'איך זה באמת מרגיש בזמן אמת',
        content: `בפעם הראשונה ששיחקתי קרב מילים בזמן אמת, היה כמעט מביך כמה מהר זה הסלים.

אותו סט-אפ כמו תמיד — לוח אותיות, למצוא מילים — חוץ מזה ששמונה מאיתנו היו על אותו לוח באותה שנייה, והסיבוב נמשך שלוש דקות. שלושים שניות בפנים, מישהו מצא "קוורץ" וקבוצת הוואטסאפ התפוצצה. דקה אחר כך הגיס שלי, בן אדם שמעולם לא ניצח אותי בשום דבר שקשור לאוצר מילים, הרכיב מילה בת שבע אותיות שעברתי עליה ארבע פעמים, והוא יספר את זה בכל ארוחת שישי עד 2031 בערך.

שלוש דקות. מנצח אחד. אפס התראות. כשזה נגמר, אף אחד לא אמר "התור שלך". כולם אמרו "עוד פעם".

וזה הדבר שאסינכרוני אף פעם לא יכול היה לתת: סיפור. משהו שקרה לכולכם, באותו זמן, שאפשר להיות בלתי נסבלים איתו בארוחת ערב. משחקים מבוססי תורות מייצרים בירוקרטיה. משחקי זמן אמת מייצרים פולקלור.`,
      },
      {
        title: 'מתי מבוסס תורות עדיין מנצח (כן, באמת)',
        content: `אני אעדיף להיות כנה מאשר צודק: אסינכרוני לא מת לכולם.

אם שותף המשחק שלכם גר שתים עשרה אזורי זמן מכאן, מבוסס תורות הוא באמת הדרך היחידה לחלוק משחק — ויש משהו מתוק בדו-קרב שמתהלך לאורך חודשים בין שני חברים ותיקים. אם אתם אוהבים את השחמט האיטי של שליטה בלוח בסגנון סקראבל, שבו מהלך אחד ראוי לעשרים דקות של מחשבה, זמן אמת ירגיש לכם כמו שצועקים עליכם. ויש אנשים שפשוט לא רוצים עוד דבר אחד בזמן אמת בחיים שלהם. הוגן. באמת.

אבל זו נישה, וכדאי לקרוא לה נישה. "אני רוצה התכתבות מילים איטית ומתחשבת בין שני אנשים" זה טעם. "אני רוצה לשחק משחקי מילים עם החברים שלי" — הדבר שעליו נמכרו מאות מיליוני הורדות — מעולם באמת לא קיבל מענה מאפליקציות שגרמו לכם לחכות אחד עשר יום בשביל "את".`,
      },
      {
        title: 'איך לגרום לחברים שלכם באמת לשחק הערב',
        content: `הסף לערב משחק מילים בזמן אמת נמוך באופן קומי, וזו בדיוק הנקודה:

1. תבחרו משחק שרץ בדפדפן. אם מישהו צריך להוריד אפליקציה או לפתוח חשבון, תאבדו שני אנשים מיד. (אני מפעיל חדרים ב-LexiClash בדיוק מהסיבה הזו — משתפים לינק, אנשים לוחצים, הם בפנים. אבל העיקרון תקף לא משנה במה משחקים.)

2. תשימו את הלוח על המסך הכי גדול שיש. טלוויזיה, לפטופ שהונח על מדף, מה שיש. כל השאר משחקים מהטלפון. מסיבה מיידית.

3. תשאירו סיבובים קצרים. שלוש דקות זו הנקודה המושלמת — מספיק ארוך לקמבק, מספיק קצר שהפסד כואב בדיוק כמה זמן שלוקח ללחוץ "רימאצ'".

4. תשחקו מיטב החמישה ותעצרו בזמן שעדיין כיף. המטרה היא שבשבוע הבא מישהו אחר יציע את זה.`,
      },
      {
        title: 'שאלות נפוצות',
        content: `האם משחקי מילים מבוססי תורות גוססים?
לא מתים, אבל מצטמצמים לנישה. לאפליקציות עדיין יש שחקנים יומיים נאמנים, אבל הבאזז התרבותי — הורדות, משחק קבוצתי, פה לאוזן — עבר לפורמטים של זמן אמת וחידות יומיות. מבוסס תורות משרת יותר ויותר דו-קרבות למרחקים ארוכים ומשחק איטי ומתחשב, ופחות משחק חברתי מיינסטרים.

מה כדאי לשחק במקום Words With Friends אונליין?
חפשו משחק מילים בזמן אמת שרץ בדפדפן, בלי הורדה ובלי הרשמה — זה מה שגורם למשחק קבוצתי באמת לקרות. LexiClash בנוי בדיוק לזה: פותחים חדר, משתפים לינק אחד, ועד 50 חברים משחקים את אותו לוח אותיות בשידור חי. סיבובים לוקחים 2-3 דקות במקום ימים.

האם זמן אמת יותר טוב למסיבות וקבוצות?
כן — זמן אמת הוא הפורמט היחיד שמתרחב מעבר לשני שחקנים. כולם משחקים בו-זמנית, אז סיבוב נכנס במסיבה, בכיתה או בארוחת משפחה. משחקים מבוססי תורות קורסים בקבוצות כי כל תור מכפיל את ההמתנה.

אפשר לשחק משחקי מילים עם חברים אונליין בחינם?
כן. LexiClash בחינם, רץ בכל דפדפן, ולא דורש הרשמה: פותחים חדר, משתפים את הלינק או קוד ה-QR, וחברים מצטרפים מיד מהטלפון או מהמחשב. גם משחק סולו נגד בוטים של בינה מלאכותית חינמי.`,
      },
    ],
    backToBlog: 'חזרה לבלוג',
    playDaily: 'נסו את האתגר היומי',
    startPracticing: 'שחקו עכשיו',
  },
  sv: {
    title: 'Jag väntade 11 dagar på att någon skulle lägga "ZOO". Sen raderade jag appen.',
    subtitle: 'Turbaserade ordspel lärde en hel generation att spela med vänner betyder att vänta på vänner. Ordspel i realtid rättar nu till det misstaget.',
    category: 'Krönika',
    readTime: '9 min läsning',
    authorName: 'Ohad Fisher',
    authorBio: 'Har fyra oavslutade turbaserade matcher som hemsöker mobilen – och noll ånger över att ha övergett dem.',
    sections: [
      {
        content: `Notisen dök upp en tisdag: "Karin la ZOO för 22 poäng."

Elva dagar. Så lång tid tog det för Karin – goa Karin, tvåbarnsmamma, hon jag träffar varje vecka på pubquizet – att lägga ett ord på tre bokstäver. Och här kommer det pinsamma: när hennes drag äntligen landade kände jag ingen glädje. Jag kände skyldighet. Nu var det min tur, och skuldklockan började ticka igen.

Jag stirrade på brädet en sekund, insåg att jag inte längre mindes varför någon av oss brydde sig, och gjorde det som miljontals människor tyst gör varje år: jag stängde appen och öppnade den aldrig igen.

Det är turbaserade ordspels smutsiga hemlighet. Vi avslutar dem inte. Vi bara slutar, ömsesidigt, ordlöst – som två personer som båda låtsats gilla en dålig film.`,
      },
      {
        title: 'Turbaserat var en kompromiss, inte en funktion',
        content: `Här är något appbutikerna inte berättar för dig: ingen designade turbaserad multiplayer för att det var roligt. Det var en nödlösning.

2009, när Words With Friends lanserades, hade mobilerna fladdrig uppkoppling, batteritid som mättes i timmar och push-notiser som fortfarande var en nyhet. "Motståndaren gör sitt drag förr eller senare, så pingar vi dig" var den enda multiplayer som tekniskt fungerade. Asynkront spelande var ingen designfilosofi. Det var en kapitulation för hårdvarans begränsningar.

Och visst, det funkade! För 2010 var det till och med bra. Men begränsningen försvann och kompromissen stannade kvar. Vi fortsatte spela ordspel som en rad olästa notiser långt efter att våra mobiler blivit kapabla att köra vad som helst i realtid. Tekniken växte upp. Genren gjorde det inte.

Jämför med vartenda annat spel du spelar med vänner. Du spelar inte Mario Kart per post. Du lägger inte en frispark i FIFA, stänger av Playstationen och väntar på att kompisen loggar in på torsdag. Hela poängen med att spela mot en annan människa är att den andra människan faktiskt är där.`,
      },
      {
        title: 'En död match i siffror',
        content: `Jag gjorde en inventering av min egen mobil innan jag skrev det här. Fjorton turbaserade matcher påbörjade under det senaste året. Nio dog före drag tjugo. Tre är tekniskt sett "aktiva" men har inte sett ett drag på över en månad – multiplayerns motsvarighet till en krukväxt man hela tiden glömmer vattna. Två tog faktiskt slut. Två.

Och andelen matcher som faktiskt tar slut är inte ens det värsta. Det värsta är vad asynkront spelande gör med känslan av tävling. Ett ordspel ska ha spänning – du leder, någon hinner ikapp, någon drar fram ett absurt ord ur tomma intet och hela dynamiken vänder. Sprid ut det över elva dagar och det är inte spänning längre. Det är en brevkurs.

Psykologer talar om kostnaden för kontextbyte: varje gång ett spel ber dig kliva in igen flera dagar senare måste hjärnan ladda om hela situationen. Vem spelar jag mot? Vad står det? Vad var nu min plan? För det mesta är det ärliga svaret "vem bryr sig", och matchen flyttar tyst in på kyrkogården bredvid de nio andra.`,
      },
      {
        title: 'Gruppchattarna dödade ändå duellen',
        content: `Även om du tillhör de sällsynta disciplinerade själar som faktiskt avslutar asynkrona matcher – lägg märke till vem du spelar mot: exakt en annan person, ni två inlåsta i en månadslång duell som ingen av er minns vem som startade.

Så umgås inte människor längre. Vi umgås i gruppchatter, på Discord-servrar, i familjens WhatsApp-tråd med en kaotisk moster. Och asynkrona ordspel har ingen lösning för gruppen. Du kan inte köra ett turbaserat spel med åtta kompisar – innan sjätte turen är framme har två personer hunnit byta mobil.

De grupper jag känner som fortfarande spelar ordspel tillsammans har alla landat i samma lösning: ett liverum, ett delat rutnät, alla inne samtidigt. Inte för att någon sålde in idén för dem. Utan för att det är det enda format som överlever mötet med en riktig grupp människor som alla ska någon annanstans om tjugo minuter.`,
      },
      {
        title: 'Så här känns realtid på riktigt',
        content: `Första gången jag spelade en ordstrid i realtid var det nästan pinsamt hur fort det eskalerade.

Samma upplägg som alltid – ett rutnät med bokstäver, hitta ord – men vi var åtta personer på samma rutnät samtidigt, och rundan tog tre minuter. Efter trettio sekunder hittade någon ZOMBIE och gruppchatten exploderade. En minut senare satte min svåger – en man som aldrig slagit mig i något som involverar ordförråd – ihop ett sjubokstavsord som jag tittat rakt på fyra gånger utan att se det, och han kommer att leva på den historien fram till ungefär 2031.

Tre minuter. En vinnare. Noll notiser. När det var över sa ingen "din tur". Alla sa "en runda till".

Det är det som asynkront spelande aldrig kunde leverera: en historia. Något som hände er alla, samtidigt, som ni kan skryta om vid middagsbordet tills alla tröttnat. Turbaserade spel föder administration. Realtidsspel föder legender.`,
      },
      {
        title: 'När turbaserat ändå vinner (ja, faktiskt)',
        content: `Jag väljer att vara ärlig hellre än att ha rätt: asynkront är inte dött för alla.

Bor din ordspelspartner tolv tidszoner bort är turbaserat ärligt talat det enda sättet att dela ett spel – och det finns något rörande över en match som lunkar på i månader mellan två gamla vänner. Älskar du det långsamma schacket i Alfapet-liknande brädkontroll, där ett enda drag förtjänar tjugo minuters eftertanke, kommer realtid att kännas som att någon skriker åt dig. Och vissa vill helt enkelt inte ha ännu en realtidsgrej i sitt liv. Fullt rimligt. Ärligt menat.

Men det är en nisch, och vi borde kalla den det. "Jag vill föra en långsam, eftertänksam ordkorrespondens med en annan person" är en smak. "Jag vill spela ordspel med mina vänner" – det som hundratals miljoner nedladdningar såldes på – betjänades aldrig riktigt av appar som fick dig att vänta elva dagar på ZOO.`,
      },
      {
        title: 'Så får du igång kompisarna redan ikväll',
        content: `Tröskeln för en ordspelskväll i realtid är löjligt låg, vilket liksom är hela poängen:

1. Välj ett spel som körs i webbläsaren. Måste någon ladda ner en app eller skapa ett konto tappar du två personer direkt. (Jag kör LexiClash-rum av exakt den anledningen – du delar en länk, folk trycker på den, de är inne. Spelet finns dessutom på sex språk. Men principen gäller oavsett vad du spelar.)

2. Visa rutnätet på den största skärmen du har. TV:n, en laptop uppallad på en hylla, vad som helst. Alla andra spelar från mobilen. Färdig fest.

3. Håll rundorna korta. Tre minuter är lagom – tillräckligt länge för en vändning, tillräckligt kort för att förlusten bara svider exakt så länge som det tar att trycka på "revansch".

4. Spela bäst av fem och sluta medan det fortfarande är kul. Målet är att någon annan föreslår det nästa vecka.`,
      },
      {
        title: 'Vanliga frågor',
        content: `Dör turbaserade ordspel ut?
Inte döda, men de krymper mot en nisch. Apparna har fortfarande lojala dagliga spelare, men den kulturella energin – nedladdningar, gruppspel, mun-till-mun – har flyttat till realtidsformat och dagliga pussel. Turbaserat tjänar alltmer långdistanssdueller och långsamt, eftertänksamt spel snarare än mainstream-spelande med vänner.

Vad ska jag spela istället för Wordfeud online?
Leta efter ett ordspel i realtid som körs i webbläsaren utan nedladdning och utan konto – det är det som får gruppspel att faktiskt bli av. LexiClash är byggt för exakt det: skapa ett rum, dela en länk, och upp till 50 vänner spelar samma bokstavrutnät live. Rundorna tar 2–3 minuter istället för dagar.

Är realtid bättre för fester och grupper?
Ja – realtid är det enda format som växer bortom två spelare. Alla spelar samtidigt, så en runda får plats på en fest, i ett klassrum eller vid en familjemiddag. Turbaserade spel fallerar i grupper eftersom varje tur multiplicerar väntan.

Kan jag spela ordspel med vänner online gratis?
Ja. LexiClash är gratis, körs i vilken webbläsare som helst och kräver ingen registrering: skapa ett rum, dela länken eller QR-koden, så hoppar vännerna in direkt från mobil eller laptop. Solospel mot AI-motståndare är gratis det också.`,
      },
    ],
    backToBlog: 'Tillbaka till bloggen',
    playDaily: 'Prova dagens utmaning',
    startPracticing: 'Spela nu',
  },
  ja: {
    title: '11日待って届いた一手は「QI」。私はアプリを消した',
    subtitle: 'ターンベースの言葉ゲームは、私たちに「友達と遊ぶ=友達を待つ」と教え込んだ。リアルタイム言葉ゲームは、その間違いを正しに来ている。',
    category: 'コラム',
    readTime: '9分で読める',
    authorName: 'Ohad Fisher',
    authorBio: 'スマホには終わる気配のないターンベース対局が4件。放棄したことへの後悔はゼロ。',
    sections: [
      {
        content: `通知が届いたのは火曜日だった。「佳代子さんが『QI』をプレイしました。22点」。

11日。クイズ大会で毎週顔を合わせる、二人の子を持つ素敵な佳代子さんが、2文字の単語をひとつ置くのにかかった時間だ。そして情けないことに、その一手が届いたとき、私が感じたのは興奮ではなく義務感だった。今度はこっちの番。社会的罪悪感の時計が、またチクタク動き出した。

しばらく盤面を見つめ、なぜ私たちがこんなことを気にしていたのか思い出せず、世界中で毎年何百万人もの人がこっそりやっていることをやった。アプリを閉じて、二度と開かなかった。

これがターンベース言葉ゲームの不都合な真実だ。私たちは対局を「終わらせない」。ただ、お互い無言のまま、止まる。つまらない映画を二人とも面白いフリをして観続けた末に、そっと帰るときみたいに。`,
      },
      {
        title: 'ターンベースは機能じゃなくて妥協だった',
        content: `アプリストアが絶対に教えてくれない事実がある。ターンベースのマルチプレイは「楽しいから」設計されたわけじゃない。あれは回避策だった。

2009年、Words With Friendsが登場した頃——日本ではあまり知られていないが、スクラブル風の対戦アプリとして海外で爆発的にヒットした——スマホの回線は不安定で、バッテリーは数時間しか持たず、プッシュ通知自体が新発明だった。「相手はそのうち指します。通知でお知らせします」は、当時の技術で動く唯一のマルチプレイだった。非同期は設計哲学ではない。ハードウェアへの譲歩だった。

そしてそれでよかった。2010年には、あれで十分よかった。でも制約は消え、妥協だけが残った。スマホがリアルタイムで何でも動くようになってからも、私たちは「未読通知の連続」として言葉ゲームを遊び続けた。技術は大人になった。ジャンルはならなかった。

他のあらゆる「友達と遊ぶゲーム」と比べてみてほしい。マリオカートを郵便でやる人はいない。フリーキックを蹴ってゲーム機を閉じ、友達が木曜日にログインするのを待つ人もいない。人と遊ぶゲームの醍醐味は、相手が「そこにいる」ことだ。`,
      },
      {
        title: '死んだ対局の算数',
        content: `この記事を書く前に、自分のスマホを監査した。過去1年で始めたターンベース対局は14件。うち9件は20手を待たずに死亡。3件は形式上「進行中」だが、1ヶ月以上誰も指していない。水やりを忘れ続ける観葉植物のマルチプレイ版だ。実際に終局したのは2件。2件だ。

そして終局率は最悪の部分ですらない。最悪なのは、非同期が「勝負の感覚」にすることだ。言葉ゲームには緊張感があるべきだ。リードして、追い上げられ、誰かがとんでもない単語をどこからともなく出して、形勢がひっくり返る。それを11日かけて引き延ばしたら、緊張感ではない。通信講座だ。

心理学者はこれを「コンテキストスイッチコスト」と呼ぶ。数日後にゲームに戻るたび、脳は状況を全部読み直さなければならない。相手は誰だっけ。点数は。作戦は何だったっけ。正直な答えはだいたい「どうでもいいか」で、その対局は静かに墓場の9件に加わる。`,
      },
      {
        title: 'どうせグループLINEが2人対戦を殺した',
        content: `仮にあなたが、非同期対局を最後までやり遂げる希少な自制の人だとしても、対戦相手を見てほしい。きっかり1人。数ヶ月にわたるデュエルに閉じ込められた2人で、どちらも始めたきっかけを覚えていない。

もう人はそうやって付き合わない。私たちはLINEのグループで、Discordのサーバーで、必ず一人は騒がしいおばさんがいる家族スレッドで付き合う。そして非同期言葉ゲームには「グループ」への答えがない。8人でターンベースを回すなんて無理だ——6巡目が来る頃には、2人が機種変している。

私の知る「今も言葉ゲームで遊んでいる」グループは、全員同じ解決策に収束した。ライブルームをひとつ、共有グリッドをひとつ、全員が同時に参加。誰かに売り込まれたからじゃない。「あと20分で次の予定がある」リアルな人間の集団に耐えられる、唯一のフォーマットだからだ。`,
      },
      {
        title: 'リアルタイムは実際どんな感じか',
        content: `初めてリアルタイムの言葉バトルをやったとき、盛り上がる速さがほとんど恥ずかしいレベルだった。

セットアップはいつもと同じ——文字のグリッド、単語を探せ。ただし8人が同じ瞬間に同じグリッドを見ていて、1ラウンドは3分。開始30秒で誰かが「QUARTZ」を見つけ、LINEグループが大爆発。1分後、語彙勝負で私に一度も勝ったことのない義兄が、私が4回見逃していた7文字の単語を繋げた。彼は2031年頃までこの話を肴に酒を飲むだろう。

3分。勝者は1人。通知はゼロ。終わったとき、誰も「あなたの番です」と言わなかった。全員が言ったのは「もう一回」だった。

これが非同期には絶対に届けられなかったもの——「物語」だ。全員が同じ瞬間に一緒に体験して、飯の席でうるさいくらい語れる何か。ターンベースが生むのは事務作業。リアルタイムが生むのは語り草だ。`,
      },
      {
        title: 'ターンベースが勝る場面（本当にあります）',
        content: `正しさより正直さを取ろう。非同期は、全員にとって死んだわけじゃない。

対戦相手が時差12時間の向こうに住んでいるなら、ターンベースは実質唯一の共有方法だ。数ヶ月かけてのんびり進む古い友人との対局には、それはそれで味わいがある。スクラブル的な盤面支配の「遅い将棋」——1手に20分の熟考が値するプレイ——が好きなら、リアルタイムは怒鳴られているみたいに感じるだろう。そして、人生に「リアルタイムの何か」をこれ以上増やしたくない人もいる。正しい。心からそう思う。

でもそれはニッチであり、ニッチと呼ぶべきだ。「ゆっくり考える、2人だけの文通言葉ゲームがしたい」は嗜好だ。「友達と言葉ゲームで遊びたい」——何億ダウンロードも売れた、あの約束——は、「QI」に11日待たせるアプリでは一度も満たされていなかった。`,
      },
      {
        title: '今夜、友達と実際に遊ぶ方法',
        content: `リアルタイム言葉ゲームの会を開くハードルは、おかしいくらい低い。それがポイントなのだけど。

1. ブラウザで動くゲームを選ぶ。 アプリのダウンロードやアカウント作成が必要な時点で、2人は確実に脱落する。(私がLexiClashのルームを使うのはまさにこのため——リンクを共有して、みんながタップして、それで入室。ただしこの原則は何で遊んでも同じだ。)
2. グリッドを一番大きい画面に映す。 テレビでも、棚に立てかけたノートPCでも。他の全員はスマホでプレイ。即席パーティーの完成。
3. ラウンドは短く。 3分がスイートスポット——逆転するには十分な長さ、負けても「リマッチ」を押す時間だけしか痛まない短さ。
4. 5本勝負にして、楽しいうちにやめる。 目標は、来週「またやろう」と誰かが言い出すことだ。`,
      },
      {
        title: 'よくある質問',
        content: `ターンベースの言葉ゲームは死んだの？
死んでいないが、ニッチに縮小している。アプリには今も熱心なデイリープレイヤーがいる。ただ文化的な熱量——ダウンロード、グループプレイ、口コミ——はリアルタイムとデイリーパズル形式に移った。ターンベースは今や、遠距離の2人対局や、じっくり考えるプレイ向けの存在になりつつある。

Words With Friendsの代わりにオンラインで何を遊べばいい？
ダウンロード不要、アカウント不要の、ブラウザで動くリアルタイム言葉ゲームを探そう。グループプレイが実際に成立するかどうかはそこにかかっている。LexiClashはまさにそのためのゲーム——ルームを作ってリンクをひとつ共有すれば、最大50人の友達が同じ文字グリッドでライブ対戦できる。1ラウンドは数日ではなく2〜3分。日本語を含む6言語に対応。

リアルタイムはパーティーやグループに向いている？
向いている——というか、2人を超えた時点でスケールするのはリアルタイムだけだ。全員が同時にプレイするので、1ラウンドがパーティーや教室、家族の食卓にそのまま収まる。ターンベースはターンごとに待ち時間が倍増するため、グループでは崩壊する。

友達と無料でオンライン言葉ゲームはできる？
できる。LexiClashは無料で、どんなブラウザでも動き、登録も不要。ルームを作ってリンクかQRコードを共有すれば、友達はスマホやパソコンから即座に参加できる。AIボットとのソロプレイも無料だ。`,
      },
    ],
    backToBlog: 'ブログに戻る',
    playDaily: 'デイリーチャレンジを試す',
    startPracticing: '今すぐプレイ',
  },
  es: {
    title: 'Esperé 11 días a que alguien jugara "FE". Después desinstalé la aplicación.',
    subtitle: 'Los juegos de palabras por turnos le enseñaron a toda una generación que jugar con amigos significa esperar a los amigos. Los juegos en tiempo real están corrigiendo ese error.',
    category: 'Opinión',
    readTime: '9 min de lectura',
    authorName: 'Ohad Fisher',
    authorBio: 'Tiene 4 partidas por turnos sin terminar rondando su teléfono y cero remordimientos por haberlas abandonado.',
    sections: [
      {
        content: `La notificación llegó un martes: "Karina jugó FE por 22 puntos."

Once días. Eso fue lo que Karina —la adorable Karina, madre de dos, la misma con la que coincido cada semana en la noche de trivia— tardó en jugar una palabra de dos letras. Y aquí viene la parte vergonzosa: cuando por fin cayó su jugada, no sentí emoción. Sentí obligación. Ahora era mi turno, y el reloj de la culpa social había vuelto a ponerse en marcha.

Miré el tablero un segundo, me di cuenta de que ninguno de los dos recordaba por qué nos importaba, e hice lo que millones de personas hacen en silencio cada año: cerré la aplicación y nunca volví a abrirla.

Ese es el secreto sucio de los juegos de palabras por turnos. No los terminamos. Simplemente los dejamos morir, de mutuo acuerdo y sin decir una palabra, como dos personas que fingieron disfrutar una mala película.`,
      },
      {
        title: 'El juego por turnos fue un parche, no una característica',
        content: `Aquí va algo que las tiendas de aplicaciones no te van a contar: nadie diseñó el multijugador por turnos porque fuera divertido. Fue un apaño.

En 2009, cuando salió Words With Friends, los teléfonos tenían una conexión que iba y venía, la batería se medía en horas y las notificaciones push eran una novedad. "Tu rival jugará cuando pueda, ya te avisaremos" era el único multijugador que funcionaba técnicamente. El modo asíncrono no era una filosofía de diseño. Era una concesión al hardware de la época.

¡Y estaba bien! Para 2010 era genial. Pero la limitación desapareció y el parche se quedó. Seguimos jugando a las palabras como una colección de notificaciones sin leer mucho después de que nuestros teléfonos pudieran con cualquier cosa en tiempo real. La tecnología creció. El género, no.

Compáralo con cualquier otro juego que juegas con amigos. Nadie juega al Mario Kart por correo. Nadie cobra un penal, apaga la consola y espera a que su amigo se conecte el jueves. La gracia de jugar con otra persona es que la otra persona está ahí.`,
      },
      {
        title: 'Las matemáticas de una partida muerta',
        content: `Antes de escribir esto hice una auditoría de mi propio teléfono. Catorce partidas por turnos empezadas en el último año. Nueve murieron antes del movimiento veinte. Tres siguen técnicamente "activas" pero llevan más de un mes sin una jugada: el equivalente multijugador de esa planta que siempre olvidas regar. Dos terminaron de verdad. Dos.

Y el porcentaje de partidas terminadas ni siquiera es lo peor. Lo peor es lo que el modo asíncrono le hace a la emoción de competir. Un juego de palabras debería tener tensión: vas ganando, el otro te alcanza, alguien saca una palabra ridícula de la nada y la partida se da vuelta. Estira eso a lo largo de once días y ya no es tensión. Es un curso por correspondencia.

Los psicólogos lo llaman "costo de cambio de contexto": cada vez que un juego te pide volver días después, tu cerebro tiene que recargar toda la situación. ¿Contra quién juego? ¿Cómo va el marcador? ¿Cuál era mi plan? La mayoría de las veces la respuesta honesta es "qué más da", y la partida se va en silencio al cementerio con las otras nueve.`,
      },
      {
        title: 'Los grupos de chat mataron el duelo de dos jugadores de todos modos',
        content: `Aunque seas de esas raras almas disciplinadas que terminan sus partidas asíncronas, fíjate con quién juegas: exactamente una persona más, los dos atrapados en un duelo de meses que ninguno recuerda haber empezado.

La gente ya no socializa así. Socializamos en grupos de chat, en servidores de Discord, en el grupo familiar de WhatsApp con la tía caótica. Y los juegos de palabras por turnos no tienen respuesta para el grupo. No puedes organizar una partida por turnos con ocho amigos: para cuando llega el sexto turno, dos ya cambiaron de teléfono.

Todos los grupos que conozco que todavía juegan juegos de palabras juntos llegaron a la misma solución: una sala en vivo, una cuadrícula compartida, todos dentro al mismo tiempo. No porque alguien se lo vendiera. Porque es el único formato que sobrevive al contacto con un grupo real de humanos que tienen que estar en otro lado en veinte minutos.`,
      },
      {
        title: 'Cómo se siente el tiempo real de verdad',
        content: `La primera vez que jugué una batalla de palabras en tiempo real, fue casi vergonzoso lo rápido que se puso la cosa.

El formato de siempre —una cuadrícula de letras, encuentra palabras— salvo que éramos ocho sobre la misma cuadrícula al mismo tiempo, y la ronda duraba tres minutos. A los treinta segundos alguien encontró CUARZO y el grupo de chat explotó. Un minuto después mi cuñado, un hombre que jamás me había ganado en nada que involucrara vocabulario, encadenó una palabra de siete letras que yo había pasado por alto cuatro veces, y la va a estar sacando a relucir en las cenas hasta más o menos 2031.

Tres minutos. Un ganador. Cero notificaciones. Cuando terminó, nadie dijo "te toca". Todos dijeron "otra".

Eso es lo que el modo asíncrono nunca pudo dar: una historia. Algo que les pasó a todos, al mismo tiempo, y de lo que puedes ser insoportable en la cena. Los juegos por turnos generan trámites. Los juegos en tiempo real generan anécdotas.`,
      },
      {
        title: 'Cuándo el juego por turnos sigue ganando (sí, en serio)',
        content: `Voy a ser honesto antes que tener la razón: el modo asíncrono no está muerto para todo el mundo.

Si tu compañero de juegos de palabras vive a doce husos horarios de distancia, el juego por turnos es de verdad la única manera de compartir una partida, y hay algo bonito en un duelo que avanza despacito durante meses entre dos viejos amigos. Si te encanta el ajedrez lento del control del tablero estilo Scrabble, donde una sola jugada merece veinte minutos de reflexión, el tiempo real te va a sonar a gritos. Y hay gente que sencillamente no quiere otra cosa en tiempo real en su vida. Me parece justo. De verdad.

Pero eso es un nicho, y conviene llamarlo por su nombre. "Quiero una correspondencia de palabras lenta y meditada entre dos personas" es un gusto. "Quiero jugar juegos de palabras con mis amigos" —la promesa sobre la que se vendieron cientos de millones de descargas— nunca estuvo siendo atendida por aplicaciones que te hacían esperar once días por un FE.`,
      },
      {
        title: 'Cómo lograr que tus amigos jueguen esta misma noche',
        content: `Organizar una noche de juegos de palabras en tiempo real es ridículamente fácil, que es un poco la idea:

1. Elige un juego que funcione en el navegador. Si alguien tiene que descargar una aplicación o crearse una cuenta, pierdes a dos personas de inmediato. (Yo organizo salas de LexiClash justo por eso: compartes un enlace, la gente toca el enlace y ya está dentro. Pero el principio vale para cualquier juego.)

2. Pon la cuadrícula en la pantalla más grande que tengas. La tele, la laptop sobre un estante, lo que sea. Los demás juegan desde su teléfono. Fiesta instantánea.

3. Rondas cortas. Tres minutos es el punto justo: suficiente para una remontada, tan corto que perder duele exactamente lo que tardas en tocar "revancha".

4. Juega al mejor de cinco y para mientras siga siendo divertido. La meta es que la semana que viene lo proponga otro.`,
      },
      {
        title: 'Preguntas Frecuentes',
        content: `¿Se están muriendo los juegos de palabras por turnos?
Muertos no, pero se están convirtiendo en un nicho. Las aplicaciones siguen teniendo jugadores fieles a diario, pero la energía cultural —las descargas, el juego en grupo, el boca a boca— se mudó al tiempo real y a los formatos de acertijo diario. El modo por turnos cada vez sirve más para duelos a larga distancia y partidas lentas y meditadas que para el juego social masivo.

¿Con qué puedo reemplazar a Words With Friends online?
Busca un juego de palabras en tiempo real que funcione en el navegador, sin descarga y sin cuenta: eso es lo que hace que jugar en grupo ocurra de verdad. LexiClash está hecho justo para eso: creas una sala, compartes un solo enlace y hasta 50 amigos juegan la misma cuadrícula de letras en vivo. Las rondas duran 2 o 3 minutos en vez de días.

¿El tiempo real es mejor para fiestas y grupos?
Sí. El tiempo real es el único formato que escala más allá de dos jugadores. Todos juegan a la vez, así que una ronda cabe en una fiesta, una clase o una cena familiar. Los juegos por turnos se rompen en grupo porque cada turno multiplica la espera.

¿Puedo jugar juegos de palabras con amigos online gratis?
Sí. LexiClash es gratis, funciona en cualquier navegador y no pide registro: creas una sala, compartes el enlace o el código QR, y tus amigos entran al instante desde el teléfono o la computadora. Jugar en solitario contra bots también es gratis.`,
      },
    ],
    backToBlog: 'Volver al Blog',
    playDaily: 'Prueba la Palabra del Día',
    startPracticing: 'Jugar Ahora',
  },
};
