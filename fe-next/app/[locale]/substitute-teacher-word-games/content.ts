// Native per-locale copy for the substitute-teacher landing page.
// Page is English-slug + canonical /en + index:isEnglish by design (no new SEO
// surface for non-en). Translations exist so a non-en visitor reaching this page
// via in-app cross-links reads native copy, not an English wall.

export type LocaleContent = {
  metaTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  twitterTitle: string;
  twitterDescription: string;
  heroTitle: string;
  intro: string;
  ctaStart: string;
  ctaClassroom: string;
  ctaDuels: string;
  fitsTitle: string;
  fits: Array<{ title: string; desc: string }>;
  stepsTitle: string;
  steps: Array<{ t: string; d: string }>;
  regularTitle: string;
  regularBody: string;
  faqTitle: string;
  faqs: Array<{ q: string; a: string }>;
  moreTitle: string;
  moreCards: Array<{ title: string; sub: string }>;
  finalTitle: string;
  finalBody: string;
  finalCta: string;
};

export const SUBSTITUTE_LOCALES = ['en', 'he', 'sv', 'ja', 'es', 'ru'] as const;
export type SubstituteLocale = typeof SUBSTITUTE_LOCALES[number];

const contentMap: Record<SubstituteLocale, LocaleContent> = {
  en: {
    metaTitle: 'Substitute Teacher Word Games — Free, Zero-Prep, No Login (2026) | LexiClash',
    metaDescription:
      'Free zero-prep word games for substitute teachers. Students join a live game with a 6-character code — no login, no accounts, no setup. Works on any device with built-in word lists. Perfect emergency sub plans and fillers.',
    ogTitle: 'Substitute Teacher Word Games — Free, Zero-Prep',
    ogDescription:
      'No login, no accounts, no setup. Project a code, students play. The emergency sub plan that always works. Free.',
    twitterTitle: 'Substitute Teacher Word Games — Free',
    twitterDescription: 'Zero-prep, no-login word games for sub days. Project a code, students play. Free.',
    heroTitle: 'The sub-day plan that needs nothing from you.',
    intro:
      'Sub plans fail when they assume prep, logins, or knowing the class. LexiClash assumes none of it. A substitute projects a 6-character code, students join on any device with no account, and a live word game runs from a built-in list — zero prep, zero login, zero roster. It holds a class better than a worksheet, keeps things academic (real spelling and vocabulary practice), and scales from a five-minute filler to most of a period when plans fall through. Free, browser-based, and reliable in a room the sub has never seen.',
    ctaStart: 'Start a Game Free',
    ctaClassroom: 'Classroom Word Games',
    ctaDuels: '1v1 Duels',
    fitsTitle: 'Why subs reach for it',
    fits: [
      { title: 'Nothing to prep', desc: 'Built-in word lists mean a sub starts a real game with zero preparation. The emergency plan that works when nothing was left.' },
      { title: 'No login, no roster', desc: 'A 6-character join code means the sub doesn’t need accounts, names, or a seating chart — students just join and play.' },
      { title: 'Works on any device', desc: 'Browser only — Chromebooks, tablets, phones, the room’s laptops. Nothing to install in an unfamiliar room.' },
      { title: 'Keeps the class engaged', desc: 'Live, competitive word rounds hold attention far better than a worksheet — fewer behavior problems on a sub day.' },
      { title: 'Actually academic', desc: 'Students practice spelling and vocabulary, so the regular teacher comes back to learning, not lost time.' },
      { title: 'Scales to fill time', desc: 'Run one round as a filler or several back-to-back when plans fall through and you need most of a period covered.' },
    ],
    stepsTitle: 'Running it cold, in 3 steps',
    steps: [
      { t: 'Open a built-in list', d: 'No prep needed — pick a ready word list and a time limit.' },
      { t: 'Project the code', d: 'Students type the 6-character code on any device. No accounts, no names needed.' },
      { t: 'Play, repeat', d: 'Run one round as a filler or several to cover the period. Live leaderboard keeps focus.' },
    ],
    regularTitle: 'For the regular teacher',
    regularBody:
      'Leaving a sub plan? Drop the LexiClash join link and a word list in your sub notes. Your students get academic word practice instead of a movie or busywork, the sub gets a plan that can’t fail, and you come back to a class that actually reviewed vocabulary while you were out — no make-up grading, no chaos to clean up.',
    faqTitle: 'Frequently asked questions',
    faqs: [
      { q: 'Why is this good for substitute teachers?', a: 'Because it needs nothing from you. There’s no login, no account setup, no materials to prep, and no class roster to know. A sub projects a 6-character code, students join on any device, and a live word game runs — even with no prior knowledge of the class or subject.' },
      { q: 'Do students or the sub need accounts?', a: 'No. Students join with a 6-character code, and a sub can start a game from a built-in word list without any account at all. Zero friction is the whole point for an unfamiliar room.' },
      { q: 'Is any prep required?', a: 'None. Built-in word lists mean a sub can start a full game with no preparation — ideal for emergency sub plans dropped in that morning. If the regular teacher wants it tied to the unit, they can leave a custom word list ready to play.' },
      { q: 'Is it free?', a: 'Free to start. The free tier covers 3 classes of up to 50 students, so a real class fits. Teacher Pro ($9/mo) adds unlimited classes and printable reports.' },
      { q: 'What grades does it suit?', a: 'Strongest for upper-elementary through high school and adult ESL. Board size and minimum word length let a sub pick a level that fits whatever class they walk into.' },
      { q: 'How long can it fill?', a: 'Rounds run about 5–10 minutes each and you can run several back-to-back, so it scales from a quick filler to most of a period when plans fall through.' },
    ],
    moreTitle: 'More for teachers',
    moreCards: [
      { title: 'Classroom Word Games', sub: 'No login, no download' },
      { title: 'Bell Ringer Word Games', sub: '5-minute openers' },
      { title: 'Education Hub', sub: 'All classroom word games' },
    ],
    finalTitle: 'Keep the link in your sub kit',
    finalBody:
      'Bookmark it now and it’s ready for any sub day — yours or someone else’s. No signup, no install, no credit card. Project a code and the room is playing in under a minute.',
    finalCta: 'Start a Classroom Game Free',
  },
  he: {
    metaTitle: 'משחקי מילים למורים מחליפים — חינם, בלי הכנה, בלי התחברות | LexiClash',
    metaDescription:
      'משחקי מילים חינם ובלי שום הכנה למורים מחליפים. התלמידים מצטרפים למשחק חי עם קוד בן 6 תווים — בלי התחברות, בלי חשבונות, בלי הגדרות. עובד על כל מכשיר, עם רשימות מילים מובנות. מושלם לשיעורי חילופין ולמילוי זמן.',
    ogTitle: 'משחקי מילים למורים מחליפים — חינם, בלי הכנה',
    ogDescription:
      'בלי התחברות, בלי חשבונות, בלי הגדרות. מקרינים קוד, התלמידים משחקים. תוכנית החילופין שתמיד עובדת. חינם.',
    twitterTitle: 'משחקי מילים למורים מחליפים — חינם',
    twitterDescription: 'משחקי מילים בלי הכנה ובלי התחברות לימי חילופין. מקרינים קוד, התלמידים משחקים. חינם.',
    heroTitle: 'תוכנית החילופין שלא דורשת ממך כלום.',
    intro:
      'תוכניות חילופין נופלות כשהן מניחות הכנה מראש, התחברות או היכרות עם הכיתה. LexiClash לא מניח כלום מזה. מקרינים קוד בן 6 תווים, התלמידים מצטרפים מכל מכשיר בלי חשבון, ומשחק מילים חי מתחיל מרשימה מובנית — בלי הכנה, בלי התחברות, בלי רשימת שמות. זה מחזיק כיתה טוב יותר מדף עבודה, נשאר לימודי (תרגול אמיתי של איות ואוצר מילים), ומתאים גם למילוי של חמש דקות וגם לכמעט שיעור שלם כשהתוכנית מתפרקת. חינם, רץ בדפדפן, ואמין גם בכיתה שהמורה המחליף לא הכיר עד היום.',
    ctaStart: 'התחילו משחק בחינם',
    ctaClassroom: 'משחקי מילים לכיתה',
    ctaDuels: 'דו-קרב 1 על 1',
    fitsTitle: 'למה מורים מחליפים בוחרים בזה',
    fits: [
      { title: 'שום דבר להכין', desc: 'רשימות מילים מובנות — מורה מחליף מתחיל משחק אמיתי בלי שום הכנה. התוכנית שעובדת גם כשלא השאירו כלום.' },
      { title: 'בלי התחברות, בלי רשימת שמות', desc: 'קוד הצטרפות בן 6 תווים אומר שאין צורך בחשבונות, בשמות או במפת הושבה — התלמידים פשוט מצטרפים ומשחקים.' },
      { title: 'עובד על כל מכשיר', desc: 'רק דפדפן — כרומבוקים, טאבלטים, טלפונים, המחשבים של הכיתה. אין מה להתקין בכיתה זרה.' },
      { title: 'שומר על הכיתה מרוכזת', desc: 'סבבי מילים תחרותיים וחיים מחזיקים תשומת לב הרבה יותר טוב מדף עבודה — פחות בעיות משמעת ביום חילופין.' },
      { title: 'באמת לימודי', desc: 'התלמידים מתרגלים איות ואוצר מילים, אז המורה הקבוע חוזר ללמידה, לא לזמן אבוד.' },
      { title: 'מתרחב למלא זמן', desc: 'סבב אחד למילוי או כמה ברצף כשהתוכנית מתפרקת ואתם צריכים לכסות כמעט שיעור שלם.' },
    ],
    stepsTitle: 'להפעיל בלי הכנה, ב-3 צעדים',
    steps: [
      { t: 'פותחים רשימה מובנית', d: 'בלי הכנה — בוחרים רשימת מילים מוכנה והגבלת זמן.' },
      { t: 'מקרינים את הקוד', d: 'התלמידים מקלידים קוד בן 6 תווים מכל מכשיר. בלי חשבונות, בלי שמות.' },
      { t: 'משחקים, חוזרים', d: 'סבב אחד למילוי או כמה כדי לכסות את השיעור. טבלת מובילים חיה שומרת על ריכוז.' },
    ],
    regularTitle: 'למורה הקבוע',
    regularBody:
      'משאירים תוכנית למחליף? צרפו לרשומות שלכם את קישור ההצטרפות של LexiClash ורשימת מילים. התלמידים מקבלים תרגול מילים לימודי במקום סרט או עבודה מיותרת, המחליף מקבל תוכנית שאי אפשר להיכשל בה, ואתם חוזרים לכיתה שבאמת חזרה על אוצר מילים בזמן שלא הייתם — בלי בדיקות השלמה, בלי בלגן לנקות.',
    faqTitle: 'שאלות נפוצות',
    faqs: [
      { q: 'למה זה טוב למורים מחליפים?', a: 'כי זה לא דורש מכם כלום. אין התחברות, אין הגדרת חשבון, אין חומרים להכין ואין צורך להכיר את רשימת הכיתה. המחליף מקרין קוד בן 6 תווים, התלמידים מצטרפים מכל מכשיר, ומשחק מילים חי רץ — גם בלי היכרות מוקדמת עם הכיתה או המקצוע.' },
      { q: 'התלמידים או המחליף צריכים חשבון?', a: 'לא. התלמידים מצטרפים עם קוד בן 6 תווים, והמחליף יכול להתחיל משחק מרשימת מילים מובנית בלי שום חשבון. אפס חיכוך זו כל המטרה בכיתה לא מוכרת.' },
      { q: 'צריך הכנה כלשהי?', a: 'שום דבר. רשימות מילים מובנות מאפשרות למחליף להתחיל משחק מלא בלי הכנה — מושלם לתוכניות חילופין שנחתו באותו בוקר. אם המורה הקבוע רוצה לקשור את זה ליחידה, אפשר להשאיר רשימת מילים מותאמת מוכנה למשחק.' },
      { q: 'זה בחינם?', a: 'כן — לגמרי חינם, בלי מסלול פרימיום. כל הכיתה במשחק חי אחד.' },
      { q: 'לאילו כיתות זה מתאים?', a: 'הכי חזק מכיתות ד׳–ו׳ ועד תיכון, וגם לאנגלית כשפה שנייה למבוגרים. גודל הלוח ואורך המילה המינימלי מאפשרים למחליף לבחור רמה שמתאימה לכל כיתה שנכנסים אליה.' },
      { q: 'כמה זמן זה ממלא?', a: 'כל סבב בערך 5–10 דקות ואפשר להריץ כמה ברצף, אז זה מתאים גם למילוי קצר וגם לכמעט שיעור שלם כשהתוכנית מתפרקת.' },
    ],
    moreTitle: 'עוד למורים',
    moreCards: [
      { title: 'משחקי מילים לכיתה', sub: 'בלי התחברות, בלי הורדה' },
      { title: 'משחקי מילים לפתיחת שיעור', sub: 'פתיחים של 5 דקות' },
      { title: 'מרכז החינוך', sub: 'כל משחקי המילים לכיתה' },
    ],
    finalTitle: 'שמרו את הקישור בערכת החילופין',
    finalBody:
      'סמנו אותו עכשיו והוא מוכן לכל יום חילופין — שלכם או של מישהו אחר. בלי הרשמה, בלי התקנה, בלי כרטיס אשראי. מקרינים קוד והכיתה משחקת תוך פחות מדקה.',
    finalCta: 'התחילו משחק כיתתי בחינם',
  },
  sv: {
    metaTitle: 'Ordspel för vikarier — gratis, noll förberedelse, ingen inloggning | LexiClash',
    metaDescription:
      'Gratis ordspel utan förberedelse för vikarier. Eleverna går med i ett live-spel med en fyrsiffrig kod — ingen inloggning, inga konton, ingen installation. Funkar på alla enheter, med färdiga ordlistor. Perfekt när vikarieplaneringen fallerar.',
    ogTitle: 'Ordspel för vikarier — gratis, noll förberedelse',
    ogDescription:
      'Ingen inloggning, inga konton, inget krångel. Visa en kod, eleverna spelar. Vikarieplanen som alltid håller. Gratis.',
    twitterTitle: 'Ordspel för vikarier — gratis',
    twitterDescription: 'Ordspel utan förberedelse och utan inloggning för vikariedagar. Visa en kod, eleverna spelar. Gratis.',
    heroTitle: 'Vikarieplanen som inte kräver något av dig.',
    intro:
      'Vikarieplaner faller när de förutsätter förberedelser, inloggningar eller att man känner klassen. LexiClash förutsätter inget av det. Vikarien visar en fyrsiffrig kod, eleverna går med från vilken enhet som helst utan konto, och ett live-ordspel drar igång från en färdig lista — noll förberedelse, ingen inloggning, ingen klasslista. Det håller en klass bättre än ett arbetsblad, håller sig akademiskt (riktig stavnings- och ordträning) och räcker från fem minuters utfyllnad till större delen av lektionen när planeringen spricker. Gratis, körs i webbläsaren och funkar i ett klassrum vikarien aldrig sett förut.',
    ctaStart: 'Starta ett spel gratis',
    ctaClassroom: 'Ordspel för klassrummet',
    ctaDuels: 'Dueller 1 mot 1',
    fitsTitle: 'Därför tar vikarier till det',
    fits: [
      { title: 'Inget att förbereda', desc: 'Färdiga ordlistor gör att en vikarie startar ett riktigt spel utan någon förberedelse. Nödplanen som funkar när inget lämnats efter sig.' },
      { title: 'Ingen inloggning, ingen klasslista', desc: 'En fyrsiffrig kod betyder att vikarien slipper konton, namn och placeringsschema — eleverna går bara med och spelar.' },
      { title: 'Funkar på alla enheter', desc: 'Bara webbläsare — Chromebooks, plattor, telefoner, klassrummets datorer. Inget att installera i ett obekant rum.' },
      { title: 'Håller klassen engagerad', desc: 'Live-tävlingar i ord fångar uppmärksamheten långt bättre än ett arbetsblad — färre bråk på en vikariedag.' },
      { title: 'Faktiskt akademiskt', desc: 'Eleverna tränar stavning och ordförråd, så ordinarie lärare kommer tillbaka till lärande, inte till förlorad tid.' },
      { title: 'Fyller ut tiden', desc: 'Kör en omgång som utfyllnad eller flera i rad när planeringen spricker och du behöver täcka nästan hela lektionen.' },
    ],
    stepsTitle: 'Kör igång kallt, i 3 steg',
    steps: [
      { t: 'Öppna en färdig lista', d: 'Ingen förberedelse — välj en klar ordlista och en tidsgräns.' },
      { t: 'Visa koden', d: 'Eleverna skriver den fyrsiffriga koden på valfri enhet. Inga konton, inga namn.' },
      { t: 'Spela, upprepa', d: 'En omgång som utfyllnad eller flera för att täcka lektionen. Live-topplistan håller fokus.' },
    ],
    regularTitle: 'Till ordinarie läraren',
    regularBody:
      'Lämnar du en vikarieplanering? Lägg in LexiClash-länken och en ordlista i dina vikarienoteringar. Eleverna får akademisk ordträning istället för en film eller sysslor, vikarien får en plan som inte kan misslyckas, och du kommer tillbaka till en klass som faktiskt repeterat ordförråd medan du var borta — ingen extrarättning, inget kaos att städa upp.',
    faqTitle: 'Vanliga frågor',
    faqs: [
      { q: 'Varför passar det vikarier?', a: 'För att det inte kräver något av dig. Ingen inloggning, ingen kontoregistrering, inget material att förbereda och ingen klasslista att kunna. Vikarien visar en fyrsiffrig kod, eleverna går med från valfri enhet, och ett live-ordspel körs — även utan någon förkunskap om klassen eller ämnet.' },
      { q: 'Behöver elever eller vikarie konton?', a: 'Nej. Eleverna går med med en fyrsiffrig kod, och en vikarie kan starta ett spel från en färdig ordlista utan något konto alls. Noll friktion är hela poängen i ett obekant rum.' },
      { q: 'Krävs någon förberedelse?', a: 'Ingen. Färdiga ordlistor gör att en vikarie kan starta ett helt spel utan förberedelse — perfekt för nödplaner som dyker upp samma morgon. Vill ordinarie lärare koppla det till kapitlet kan hen lämna en egen ordlista redo att spela.' },
      { q: 'Är det gratis?', a: 'Ja — helt gratis, ingen premiumnivå. Hela klassen per live-spel.' },
      { q: 'Vilka årskurser passar det?', a: 'Starkast från mellanstadiet upp till gymnasiet och vuxen-ESL. Brädstorlek och minsta ordlängd gör att vikarien kan välja en nivå som passar vilken klass som helst.' },
      { q: 'Hur länge räcker det?', a: 'Varje omgång tar ungefär 5–10 minuter och du kan köra flera i rad, så det räcker från snabb utfyllnad till större delen av en lektion när planeringen spricker.' },
    ],
    moreTitle: 'Mer för lärare',
    moreCards: [
      { title: 'Ordspel för klassrummet', sub: 'Ingen inloggning, ingen nedladdning' },
      { title: 'Ordspel för lektionsstart', sub: '5-minuters öppningar' },
      { title: 'Utbildningshubb', sub: 'Alla ordspel för klassrummet' },
    ],
    finalTitle: 'Ha länken i vikariekitet',
    finalBody:
      'Bokmärk den nu så är den redo för vilken vikariedag som helst — din eller någon annans. Ingen registrering, ingen installation, inget kreditkort. Visa en kod så spelar klassen på under en minut.',
    finalCta: 'Starta ett klassrumsspel gratis',
  },
  ja: {
    metaTitle: '代理の先生向け単語ゲーム — 無料・準備ゼロ・ログイン不要 | LexiClash',
    metaDescription:
      '代理の先生のための、準備ゼロで無料の単語ゲーム。生徒は6文字のコードでライブゲームに参加。ログインもアカウントも設定も不要。組み込みの単語リストでどの端末でも動きます。急な代理授業やすき間時間にぴったり。',
    ogTitle: '代理の先生向け単語ゲーム — 無料・準備ゼロ',
    ogDescription:
      'ログインもアカウントも設定も不要。コードを映せば生徒が遊べます。いつでも成立する代理授業プラン。無料。',
    twitterTitle: '代理の先生向け単語ゲーム — 無料',
    twitterDescription: '準備なし・ログインなしの単語ゲーム。コードを映すだけで生徒が遊べます。無料。',
    heroTitle: 'あなたに何も求めない、代理授業プラン。',
    intro:
      '代理授業のプランは、準備やログイン、クラスを知っていることを前提にすると崩れます。LexiClashはそのどれも前提にしません。6文字のコードを映すと、生徒はアカウントなしでどの端末からでも参加し、組み込みリストからライブの単語ゲームが始まります——準備ゼロ、ログインなし、名簿なし。プリントよりクラスをしっかり引きつけ、学習の中身（本物のスペルと語彙の練習）を保ち、5分のすき間から、プランが崩れたときの授業のほとんどまでカバーします。無料でブラウザだけ、初めて入る教室でも安心です。',
    ctaStart: '無料でゲームを始める',
    ctaClassroom: '教室向け単語ゲーム',
    ctaDuels: '1対1の対戦',
    fitsTitle: '代理の先生が選ぶ理由',
    fits: [
      { title: '準備するものなし', desc: '組み込みの単語リストがあるので、代理の先生は準備ゼロで本物のゲームを始められます。何も残されていないときに効く緊急プラン。' },
      { title: 'ログインも名簿もなし', desc: '6文字の参加コードがあれば、アカウントも名前も座席表もいりません——生徒はただ参加して遊ぶだけ。' },
      { title: 'どの端末でも動く', desc: 'ブラウザだけ——Chromebook、タブレット、スマホ、教室のノートPC。慣れない教室でもインストール不要。' },
      { title: 'クラスを引きつけ続ける', desc: 'ライブの対戦形式の単語ラウンドは、プリントよりずっと集中を保ちます——代理授業でのトラブルも減ります。' },
      { title: 'ちゃんと学習になる', desc: '生徒はスペルと語彙を練習するので、担任の先生は失われた時間ではなく学びに戻ってこられます。' },
      { title: '時間に合わせて伸ばせる', desc: 'すき間に1ラウンド、プランが崩れて授業のほとんどを埋める必要があるときは連続で数ラウンド。' },
    ],
    stepsTitle: '準備なしで始める3ステップ',
    steps: [
      { t: '組み込みリストを開く', d: '準備不要——できあいの単語リストと制限時間を選ぶだけ。' },
      { t: 'コードを映す', d: '生徒はどの端末でも6文字のコードを入力。アカウントも名前も不要。' },
      { t: '遊んで、繰り返す', d: 'すき間に1ラウンド、授業を埋めるなら数ラウンド。ライブのランキングで集中が続きます。' },
    ],
    regularTitle: '担任の先生へ',
    regularBody:
      '代理授業のプランを残しますか？ 引き継ぎメモにLexiClashの参加リンクと単語リストを入れておいてください。生徒は動画や作業のかわりに学習としての単語練習ができ、代理の先生は失敗しようのないプランを手にし、あなたは自分がいない間にちゃんと語彙を復習したクラスに戻れます——追加の採点も、片づける混乱もありません。',
    faqTitle: 'よくある質問',
    faqs: [
      { q: 'なぜ代理の先生に向いているの？', a: 'あなたに何も求めないからです。ログインもアカウント作成も、準備する教材も、覚えるべき名簿もありません。代理の先生が6文字のコードを映し、生徒はどの端末からでも参加し、ライブの単語ゲームが動きます——クラスや教科の予備知識がなくても。' },
      { q: '生徒や代理の先生にアカウントは必要？', a: 'いいえ。生徒は6文字のコードで参加し、代理の先生はアカウントなしで組み込みリストからゲームを始められます。慣れない教室では、この摩擦ゼロがすべてです。' },
      { q: '準備は必要？', a: 'まったく不要です。組み込みの単語リストで、代理の先生は準備なしで丸ごとゲームを始められます——その朝に渡される急な代理プランに最適。担任が単元に合わせたいなら、カスタムの単語リストを用意しておけます。' },
      { q: '無料ですか？', a: '無料で始められます。無料プランは3クラス・各クラス50人までなので、実際のクラスがそのまま入ります。Teacher Pro（月$9）でクラス数無制限と印刷可能なレポートが加わります。' },
      { q: 'どの学年に合う？', a: '小学校高学年から高校、そして大人のESLに最も向いています。盤のサイズと最小の単語の長さで、入った教室に合わせてレベルを選べます。' },
      { q: 'どのくらい時間を埋められる？', a: '1ラウンドは約5〜10分で、連続して数ラウンド回せます。だからちょっとしたすき間から、プランが崩れたときの授業のほとんどまで対応できます。' },
    ],
    moreTitle: '先生向けの他のページ',
    moreCards: [
      { title: '教室向け単語ゲーム', sub: 'ログインなし・ダウンロードなし' },
      { title: '授業開始の単語ゲーム', sub: '5分のウォームアップ' },
      { title: '教育ハブ', sub: '教室向け単語ゲームすべて' },
    ],
    finalTitle: '代理キットにリンクを入れておこう',
    finalBody:
      '今ブックマークしておけば、あなたのぶんも誰かのぶんも、どんな代理授業の日にもすぐ使えます。登録なし、インストールなし、クレジットカードなし。コードを映せば、1分もかからずクラスが遊び始めます。',
    finalCta: '無料で教室ゲームを始める',
  },
  es: {
    metaTitle: 'Juegos de palabras para profesores suplentes — gratis, sin preparación, sin registro | LexiClash',
    metaDescription:
      'Juegos de palabras gratis y sin preparación para profesores suplentes. Los alumnos entran a una partida en vivo con un código de 6 caracteres: sin registro, sin cuentas, sin configuración. Funciona en cualquier dispositivo, con listas de palabras incluidas. Ideal para cubrir clases de improviso.',
    ogTitle: 'Juegos de palabras para suplentes — gratis, sin preparación',
    ogDescription:
      'Sin registro, sin cuentas, sin configuración. Proyecta un código y los alumnos juegan. El plan de suplencia que nunca falla. Gratis.',
    twitterTitle: 'Juegos de palabras para suplentes — gratis',
    twitterDescription: 'Juegos de palabras sin preparación ni registro para días de suplencia. Proyecta un código y juegan. Gratis.',
    heroTitle: 'El plan de suplencia que no te pide nada.',
    intro:
      'Los planes de suplencia fallan cuando dan por hecho que hay preparación, cuentas o que conoces a la clase. LexiClash no da por hecho nada de eso. El suplente proyecta un código de 6 caracteres, los alumnos entran desde cualquier dispositivo sin cuenta, y arranca una partida de palabras en vivo desde una lista incluida: sin preparación, sin registro, sin lista de nombres. Mantiene a la clase mejor que una ficha, sigue siendo académico (práctica real de ortografía y vocabulario) y sirve desde un relleno de cinco minutos hasta casi toda la hora cuando el plan se cae. Gratis, en el navegador y fiable en un aula que el suplente nunca ha visto.',
    ctaStart: 'Empieza una partida gratis',
    ctaClassroom: 'Juegos de palabras para el aula',
    ctaDuels: 'Duelos 1 contra 1',
    fitsTitle: 'Por qué los suplentes recurren a esto',
    fits: [
      { title: 'Nada que preparar', desc: 'Las listas de palabras incluidas hacen que un suplente empiece una partida de verdad sin ninguna preparación. El plan de emergencia que funciona cuando no dejaron nada.' },
      { title: 'Sin registro, sin lista de nombres', desc: 'Un código de 6 caracteres significa que el suplente no necesita cuentas, nombres ni plano de asientos: los alumnos solo entran y juegan.' },
      { title: 'Funciona en cualquier dispositivo', desc: 'Solo navegador: Chromebooks, tablets, móviles, los portátiles del aula. Nada que instalar en un aula desconocida.' },
      { title: 'Mantiene a la clase enganchada', desc: 'Las rondas de palabras en vivo y competitivas captan la atención mucho mejor que una ficha: menos problemas de conducta en un día de suplencia.' },
      { title: 'De verdad académico', desc: 'Los alumnos practican ortografía y vocabulario, así que el profesor titular vuelve al aprendizaje, no al tiempo perdido.' },
      { title: 'Se adapta para llenar el tiempo', desc: 'Una ronda de relleno o varias seguidas cuando el plan se cae y necesitas cubrir casi toda la hora.' },
    ],
    stepsTitle: 'Arrancar en frío, en 3 pasos',
    steps: [
      { t: 'Abre una lista incluida', d: 'Sin preparación: elige una lista de palabras lista y un límite de tiempo.' },
      { t: 'Proyecta el código', d: 'Los alumnos escriben el código de 6 caracteres en cualquier dispositivo. Sin cuentas, sin nombres.' },
      { t: 'Juega, repite', d: 'Una ronda de relleno o varias para cubrir la hora. La tabla en vivo mantiene el foco.' },
    ],
    regularTitle: 'Para el profesor titular',
    regularBody:
      '¿Dejas un plan de suplencia? Añade el enlace de LexiClash y una lista de palabras a tus notas para el suplente. Tus alumnos practican vocabulario académico en lugar de ver una peli o hacer relleno, el suplente recibe un plan que no puede fallar, y vuelves a una clase que de verdad repasó vocabulario mientras no estabas: sin correcciones extra, sin caos que limpiar.',
    faqTitle: 'Preguntas frecuentes',
    faqs: [
      { q: '¿Por qué es bueno para profesores suplentes?', a: 'Porque no te pide nada. No hay registro, ni cuentas que crear, ni materiales que preparar, ni lista de la clase que conocer. El suplente proyecta un código de 6 caracteres, los alumnos entran desde cualquier dispositivo y arranca una partida de palabras en vivo, incluso sin conocer de antemano la clase o la materia.' },
      { q: '¿Los alumnos o el suplente necesitan cuenta?', a: 'No. Los alumnos entran con un código de 6 caracteres, y el suplente puede empezar una partida desde una lista incluida sin ninguna cuenta. La fricción cero es justo el objetivo en un aula desconocida.' },
      { q: '¿Hace falta preparación?', a: 'Ninguna. Las listas incluidas permiten que un suplente empiece una partida completa sin preparación, ideal para planes de emergencia que llegan esa misma mañana. Si el titular quiere ligarlo a la unidad, puede dejar una lista de palabras personalizada lista para jugar.' },
      { q: '¿Es gratis?', a: 'Gratis para empezar. El plan gratuito cubre 3 clases de hasta 50 alumnos, así que cabe una clase real. Teacher Pro ($9/mes) añade clases ilimitadas e informes.' },
      { q: '¿Para qué cursos sirve?', a: 'Funciona mejor desde el último ciclo de primaria hasta secundaria y ESL para adultos. La dificultad la fijas tú: tamaño del tablero y longitud mínima de palabra, así el suplente elige un nivel que encaje con la clase que le toque.' },
      { q: '¿Cuánto tiempo llena?', a: 'Cada ronda dura unos 5–10 minutos y puedes encadenar varias, así que sirve desde un relleno rápido hasta casi toda una hora cuando el plan se cae.' },
    ],
    moreTitle: 'Más para profesores',
    moreCards: [
      { title: 'Juegos de palabras para el aula', sub: 'Sin registro, sin descargas' },
      { title: 'Juegos para empezar la clase', sub: 'Arranques de 5 minutos' },
      { title: 'Centro de educación', sub: 'Todos los juegos de palabras para el aula' },
    ],
    finalTitle: 'Guarda el enlace en tu kit de suplencia',
    finalBody:
      'Guárdalo ahora y estará listo para cualquier día de suplencia, tuyo o de otra persona. Sin registro, sin instalación, sin tarjeta. Proyecta un código y el aula está jugando en menos de un minuto.',
    finalCta: 'Empieza una partida de aula gratis',
  },
  ru: {
    metaTitle: 'Словесные игры для учителей на замене — бесплатно, без подготовки и регистрации | LexiClash',
    metaDescription:
      'Бесплатные словесные игры без подготовки для учителей на замене. Ученики входят в живую игру по коду из 6 символов — без регистрации, без аккаунтов, без настройки. Работает на любом устройстве, со встроенными списками слов. Идеально, когда план замены сорвался.',
    ogTitle: 'Словесные игры для учителей на замене — бесплатно, без подготовки',
    ogDescription:
      'Без регистрации, без аккаунтов, без настройки. Показали код — ученики играют. План замены, который всегда срабатывает. Бесплатно.',
    twitterTitle: 'Словесные игры для учителей на замене — бесплатно',
    twitterDescription: 'Словесные игры без подготовки и без входа для дней замены. Показали код — ученики играют. Бесплатно.',
    heroTitle: 'План замены, которому от вас ничего не нужно.',
    intro:
      'Планы замены рушатся, когда рассчитывают на подготовку, вход в аккаунт или знание класса. LexiClash не рассчитывает ни на что из этого. Учитель на замене показывает код из 6 символов, ученики заходят с любого устройства без аккаунта, и живая словесная игра запускается из встроенного списка — без подготовки, без входа, без списка класса. Она держит класс лучше рабочего листа, остаётся учебной (настоящая практика орфографии и словарного запаса) и растягивается от пятиминутной паузы до почти всего урока, когда план сорвался. Бесплатно, прямо в браузере и надёжно даже в классе, который учитель видит впервые.',
    ctaStart: 'Начать игру бесплатно',
    ctaClassroom: 'Словесные игры для класса',
    ctaDuels: 'Дуэли 1 на 1',
    fitsTitle: 'Почему учителя на замене берут именно это',
    fits: [
      { title: 'Нечего готовить', desc: 'Встроенные списки слов означают, что учитель на замене начинает настоящую игру без всякой подготовки. План на крайний случай, который работает, когда ничего не оставили.' },
      { title: 'Без входа, без списка класса', desc: 'код из 6 символов для входа означает, что не нужны аккаунты, имена или схема рассадки — ученики просто заходят и играют.' },
      { title: 'Работает на любом устройстве', desc: 'Только браузер — Chromebook, планшеты, телефоны, ноутбуки класса. Ничего не нужно устанавливать в незнакомом кабинете.' },
      { title: 'Держит класс вовлечённым', desc: 'Живые соревновательные раунды со словами держат внимание гораздо лучше рабочего листа — меньше проблем с поведением в день замены.' },
      { title: 'По-настоящему учебное', desc: 'Ученики тренируют орфографию и словарный запас, так что постоянный учитель возвращается к учёбе, а не к потерянному времени.' },
      { title: 'Растягивается под время', desc: 'Один раунд как пауза или несколько подряд, когда план сорвался и нужно закрыть почти весь урок.' },
    ],
    stepsTitle: 'Запуск с нуля, за 3 шага',
    steps: [
      { t: 'Откройте встроенный список', d: 'Без подготовки — выберите готовый список слов и лимит времени.' },
      { t: 'Покажите код', d: 'Ученики вводят код из 6 символов на любом устройстве. Без аккаунтов, без имён.' },
      { t: 'Играйте, повторяйте', d: 'Один раунд как пауза или несколько, чтобы закрыть урок. Живая таблица лидеров держит фокус.' },
    ],
    regularTitle: 'Постоянному учителю',
    regularBody:
      'Оставляете план замене? Добавьте в свои заметки ссылку на вход в LexiClash и список слов. Ученики получают учебную практику слов вместо фильма или занятости ради занятости, заменяющий получает план, который не может провалиться, а вы возвращаетесь к классу, который действительно повторил словарь, пока вас не было — без дополнительной проверки, без беспорядка, который надо разгребать.',
    faqTitle: 'Частые вопросы',
    faqs: [
      { q: 'Чем это хорошо для учителей на замене?', a: 'Тем, что от вас ничего не нужно. Нет входа, нет создания аккаунта, нет материалов для подготовки и нет списка класса, который надо знать. Заменяющий показывает код из 6 символов, ученики заходят с любого устройства, и живая словесная игра запускается — даже без предварительного знания класса или предмета.' },
      { q: 'Нужны ли аккаунты ученикам или заменяющему?', a: 'Нет. Ученики заходят по коду из 6 символов, а заменяющий может начать игру из встроенного списка слов вообще без аккаунта. Нулевое трение — весь смысл в незнакомом классе.' },
      { q: 'Нужна ли подготовка?', a: 'Никакой. Встроенные списки слов позволяют заменяющему начать полноценную игру без подготовки — идеально для срочных планов замены, которые дают тем же утром. Если постоянный учитель хочет привязать это к теме, он может оставить готовый список слов.' },
      { q: 'Это бесплатно?', a: 'Да — полностью бесплатно, без платного тарифа. Весь класс в одной живой игре.' },
      { q: 'Для каких классов подходит?', a: 'Сильнее всего от старших классов начальной школы до старшей школы и взрослого ESL. Размер доски и минимальная длина слова позволяют заменяющему выбрать уровень под любой класс, в который он попадает.' },
      { q: 'Сколько времени можно закрыть?', a: 'Каждый раунд около 5–10 минут, и их можно запускать несколько подряд, так что это растягивается от быстрой паузы до почти всего урока, когда план сорвался.' },
    ],
    moreTitle: 'Ещё для учителей',
    moreCards: [
      { title: 'Словесные игры для класса', sub: 'Без входа, без загрузки' },
      { title: 'Игры для начала урока', sub: '5-минутные разминки' },
      { title: 'Образовательный центр', sub: 'Все словесные игры для класса' },
    ],
    finalTitle: 'Держите ссылку в наборе для замены',
    finalBody:
      'Добавьте её в закладки сейчас — и она готова к любому дню замены, вашему или чужому. Без регистрации, без установки, без карты. Показали код — и класс играет меньше чем через минуту.',
    finalCta: 'Начать игру для класса бесплатно',
  },
};

export function getSubstituteContent(locale: string): LocaleContent {
  return contentMap[(locale as SubstituteLocale)] ?? contentMap.en;
}
