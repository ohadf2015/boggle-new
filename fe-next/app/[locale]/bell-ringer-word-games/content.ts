// Native per-locale copy for the bell-ringer landing page.
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
  faqTitle: string;
  faqs: Array<{ q: string; a: string }>;
  moreTitle: string;
  moreCards: Array<{ title: string; sub: string }>;
  finalTitle: string;
  finalBody: string;
  finalCta: string;
};

export const BELL_RINGER_LOCALES = ['en', 'he', 'sv', 'ja', 'es', 'ru'] as const;
export type BellRingerLocale = typeof BELL_RINGER_LOCALES[number];

const contentMap: Record<BellRingerLocale, LocaleContent> = {
  en: {
    metaTitle: 'Bell Ringer Word Games — Free 5-Minute ELA Warm-Ups (2026) | LexiClash',
    metaDescription:
      'Free bell ringer word games for ELA. A 5-minute start-of-class warm-up students join with a 6-character code — no login, no prep. Vocabulary and spelling word-formation games, your word lists, any device.',
    ogTitle: 'Bell Ringer Word Games — Free 5-Minute Warm-Ups',
    ogDescription: 'Start class with a live word game. Join with a code, no login, no prep. Your word lists. Free.',
    twitterTitle: 'Bell Ringer Word Games — Free',
    twitterDescription: '5-minute start-of-class word games. No login, no prep. Free.',
    heroTitle: 'A bell ringer the whole class is playing before the bell stops.',
    intro:
      'The best bell ringer is the one you can actually run every day. LexiClash is a 5-minute, no-login, no-prep word game: project a 6-character code, students join on any device, and a live word-formation round opens class with real vocabulary and spelling practice. Reuse this week\'s word list as the daily warm-up, or grab a built-in one for zero prep. Free, browser-based, and predictable enough to become a routine — productive, not just a time-filler.',
    ctaStart: 'Start a Warm-Up Free',
    ctaClassroom: 'All Classroom Word Games',
    ctaDuels: '1v1 Duel Warm-Up',
    fitsTitle: 'Why it works as a daily opener',
    fits: [
      { title: 'Instant start', desc: 'Project a code, students join, you\'re playing. No login or setup to burn the first five minutes.' },
      { title: 'Built for 5 minutes', desc: 'Short rounds fit the bell-ringer window exactly — energize the room, then transition to the lesson.' },
      { title: 'Tie it to the unit', desc: 'Reuse this week\'s vocabulary list as the daily warm-up so the bell ringer reinforces what you\'re teaching.' },
      { title: 'A real routine', desc: 'Zero prep means you can run it every day — a predictable academic opener students settle into fast.' },
      { title: 'Productive, not filler', desc: 'Students spell and form real words under time pressure — active recall, not a worksheet they ignore.' },
      { title: 'Any device, no download', desc: 'Chromebooks, tablets, phones — browser only. Works the same whether students are 1:1 or BYOD.' },
    ],
    stepsTitle: 'The 5-minute routine',
    steps: [
      { t: 'Project the code', d: 'As students walk in, the 6-character join code is already on the board.' },
      { t: 'They join and play', d: 'No login, any device. The round starts as the bell finishes ringing.' },
      { t: 'Transition warm', d: 'Five minutes later the room is awake and primed — move straight into the lesson.' },
    ],
    faqTitle: 'Frequently asked questions',
    faqs: [
      { q: 'What makes a good bell ringer word game?', a: 'It starts instantly, runs in about 5 minutes, and needs zero prep so it works every single day. LexiClash fits: project a 6-character code, students join on any device with no login, and a live word-formation round fills the first five minutes of class with vocabulary or spelling practice.' },
      { q: 'Do students need to log in for the warm-up?', a: 'No. A 6-character join code means students are playing in seconds — critical for a bell ringer, where any login friction eats the whole activity.' },
      { q: 'Can I tie the bell ringer to my current unit?', a: 'Yes. Upload your unit vocabulary once and reuse it all week as a warm-up, or use a built-in list when you want true zero prep. Same word list can power Monday\'s warm-up and Friday\'s review.' },
      { q: 'Is it free?', a: 'Yes — fully free, no premium tier, no per-class limit beyond 30 students in a live game.' },
      { q: 'What skills does it practice?', a: 'Word formation on Boggle-style grids, anagrams, and wheels drills spelling, vocabulary recall, and letter patterns — a productive academic warm-up, not just a time-filler.' },
      { q: 'Will it work as a daily routine?', a: 'That\'s the design. Because there is nothing to set up or log into, you can run it every day with a different word list, building a predictable start-of-class routine students recognize.' },
    ],
    moreTitle: 'More for teachers',
    moreCards: [
      { title: 'Classroom Word Games', sub: 'No login, no download' },
      { title: 'Substitute Teacher Games', sub: 'Zero-prep sub plans' },
      { title: 'Education Hub', sub: 'All classroom word games' },
    ],
    finalTitle: 'Use it tomorrow morning',
    finalBody: 'Drop in a word list tonight, and tomorrow\'s bell ringer is ready: project the code, students play, class starts warm. No signup, no install, no credit card.',
    finalCta: 'Start a Classroom Game Free',
  },
  he: {
    metaTitle: 'משחקי התחמומים — פעילויות פתיחה בחינם לעברית | LexiClash',
    metaDescription:
      'משחקי התחמומים בחינם לשיעורי עברית. פעילות פתיחה של 5 דקות שהתלמידים מצטרפים אליה בקוד בן 6 תווים — ללא התחברות, ללא הכנה. משחקי הרכבת מילים וזיהוי תחביר, רשימות המילים שלך, כל מכשיר.',
    ogTitle: 'משחקי התחמומים — פעילויות פתיחה בחינם',
    ogDescription: 'התחל שיעור עם משחק מילים חי. הצטרף בקוד, ללא התחברות, ללא הכנה. רשימות המילים שלך. בחינם.',
    twitterTitle: 'משחקי התחמומים — בחינם',
    twitterDescription: 'משחקי מילים של 5 דקות לפתיחת שיעור. ללא התחברות, ללא הכנה. בחינם.',
    heroTitle: 'משחק התחמומים שכל הכיתה משחקת לפני שהפעמון מפסיק להישמע.',
    intro:
      'התחמום הטוב ביותר הוא זה שאתה יכול בעצם להפעיל כל יום. LexiClash הוא משחק מילים של 5 דקות, ללא התחברות, ללא הכנה: תוציא קוד בן 6 תווים, התלמידים מצטרפים מכל מכשיר, ועיגול משחק מילים חי פותח את השיעור עם תרגול אוצר מילים וזיהוי תחביר אמיתי. השתמש בהרשימה של השבוע הזה כפעילות פתיחה יומית, או בחר מרשימה מובנית לאפס הכנה. בחינם, בדפדפן, וקבוע מספיק כדי להפוך לשגרה — פרודוקטיבי, לא רק ממלא זמן.',
    ctaStart: 'התחל התחמום בחינם',
    ctaClassroom: 'כל משחקי הכיתה',
    ctaDuels: 'דו קרב 1 על 1',
    fitsTitle: 'למה זה עובד כפתיחה יומית',
    fits: [
      { title: 'התחלה מיידית', desc: 'הוציא קוד, התלמידים מצטרפים, אתם משחקים. לא התחברות או הגדרות שהורסות את חמש הדקות הראשונות.' },
      { title: 'בנוי ל-5 דקות', desc: 'סיבובים קצרים מתחברים לחלון התחמום בדיוק — העיר את הכיתה, ואז עבור לשיעור.' },
      { title: 'קשור ליחידה שלך', desc: 'השתמש בהרשימה של השבוע הזה כפעילות פתיחה יומית כדי שהתחמום יחזק את מה שאתה מלמד.' },
      { title: 'שגרה אמיתית', desc: 'אפס הכנה אומר שאתה יכול להפעיל את זה כל יום — פתיחת כיתה צפויה שתלמידים מתרגלים בה במהירות.' },
      { title: 'פרודוקטיבי, לא ממלא', desc: 'התלמידים כותבים ויוצרים מילים אמיתיות תחת לחץ זמן — זיכרון פעיל, לא דף עבודה שהם משכחים.' },
      { title: 'כל מכשיר, ללא הורדה', desc: 'Chromebooks, טאבלטים, טלפונים — רק דפדפן. עובד אותו דבר בין אם תלמידים הם 1:1 או BYOD.' },
    ],
    stepsTitle: 'השגרה של 5 דקות',
    steps: [
      { t: 'הוציא את הקוד', d: 'כשהתלמידים נכנסים, קוד ההצטרפות של 6 תווים כבר על הלוח.' },
      { t: 'הם מצטרפים ומשחקים', d: 'ללא התחברות, כל מכשיר. הסיבוב מתחיל כשהפעמון מפסיק להישמע.' },
      { t: 'מעבר חם', d: 'חמש דקות אחר כך הכיתה ערה והמוכנה — עבור ישירות לשיעור.' },
    ],
    faqTitle: 'שאלות נפוצות',
    faqs: [
      { q: 'מה הופך משחק התחמומים לטוב?', a: 'זה מתחיל מיד, רץ בערך 5 דקות, וצריך אפס הכנה כדי שזה יעבוד כל יום. LexiClash מתחברת: תוציא קוד בן 6 תווים, התלמידים מצטרפים מכל מכשיר ללא התחברות, וסיבוב משחק מילים חי ממלא את חמש הדקות הראשונות של הכיתה עם תרגול אוצר מילים וזיהוי תחביר.' },
      { q: 'האם תלמידים צריכים להתחבר לפעילות הפתיחה?', a: 'לא. קוד הצטרפות של 6 תווים פירושו שתלמידים משחקים תוך שניות — קריטי לתחמום, כאשר כל חיכוך התחברות הורס את כל הפעילות.' },
      { q: 'האם אני יכול לקשור את התחמום ליחידה שלי?', a: 'כן. העלה את אוצר המילים שלך פעם אחת והשתמש בו כל השבוע כפעילות פתיחה, או בחר רשימה מובנית כשאתה רוצה אפס הכנה. אותה רשימה יכולה להנעות את פעילות יום שני ותיקומון של יום שישי.' },
      { q: 'זה בחינם?', a: 'כן — לגמרי בחינם, ללא גרסה פרימיום, ללא מגבלה לכל כיתה מעבר ל-30 תלמידים במשחק חי.' },
      { q: 'איזה מיומנויות זה מתרגל?', a: 'הרכבת מילים על רשתות בסגנון Boggle, אנגרמות, וגלגלים — מתרגלים כתיבה, אוצר מילים וזיהוי דפוסים — תרגול כיתה פרודוקטיבי, לא רק ממלא זמן.' },
      { q: 'האם זה יעבוד כשגרה יומית?', a: 'זה התכנון. כי אין כלום להגדיר או להתחבר אליו, אתה יכול להפעיל את זה כל יום עם רשימת מילים שונה, ולבנות שגרת פתיחה צפויה שתלמידים מכירים.' },
    ],
    moreTitle: 'עוד למורים',
    moreCards: [
      { title: 'משחקי הכיתה', sub: 'ללא התחברות, ללא הורדה' },
      { title: 'משחקי מחליפים', sub: 'אפס הכנה' },
      { title: 'רכز החינוך', sub: 'כל משחקי הכיתה' },
    ],
    finalTitle: 'השתמש בו מחר בבוקר',
    finalBody: 'הכנס רשימת מילים הערב, ותחמום מחר מוכן: הוציא את הקוד, תלמידים משחקים, השיעור מתחיל חם. ללא הרשמה, ללא התקנה, ללא כרטיס אשראי.',
    finalCta: 'התחל משחק כיתה בחינם',
  },
  sv: {
    metaTitle: 'Ringklocka-spel — gratis 5-minuters uppvärmning för engelska | LexiClash',
    metaDescription:
      'Gratis ringklocka-spel för engelskundervisning. En 5-minuters klassöppning där eleverna går med via kod på sex tecken — ingen inloggning, ingen förberedelse. Ordbildning, stavning, eget ordförråd, vilken enhet som helst.',
    ogTitle: 'Ringklocka-spel — gratis 5-minuters uppvärmning',
    ogDescription: 'Börja lektionen med ett live-ordspel. Eleverna kod, ingen inloggning, ingen prep. Ditt ordförråd. Gratis.',
    twitterTitle: 'Ringklocka-spel — gratis',
    twitterDescription: 'Ordspel på 5 minuter när lektionen börjar. Ingen inloggning, ingen förberedelse. Gratis.',
    heroTitle: 'En ringklocka som hela klassen spelar innan klockan slutar ringa.',
    intro:
      'Den bästa ringklockan är en du faktiskt kan köra varje dag. LexiClash är ett ordspel på 5 minuter, utan inloggning, utan förberedelse: visa en kod på sex tecken, eleverna går med från vilken enhet som helst, och ett live-ordspel öppnar lektionen med riktig ordträning och stavning. Använd den här veckans ordlista som daglig uppvärmning, eller välj en färdig lista för noll förberedelse. Gratis, i webbläsaren, och förutsägbar nog för att bli en rutin — lärorik, inte bara en tidsfyllare.',
    ctaStart: 'Börja en uppvärmning gratis',
    ctaClassroom: 'Alla klassrumsspel',
    ctaDuels: 'Dueller 1 mot 1',
    fitsTitle: 'Varför det funkar som daglig lektionsöppning',
    fits: [
      { title: 'Omedelbar start', desc: 'Visa koden, eleverna går med, ni spelar. Ingen inloggning eller installation för att slösa de första fem minuterna.' },
      { title: 'Gjort för 5 minuter', desc: 'Korta omgångar passar ringklocka-fönstret exakt — väck upp klassen, sen glid in i lektionen.' },
      { title: 'Koppla det till enheten', desc: 'Använd den här veckans ordlista som daglig uppvärmning så ringklockan förstärker det ni undervisar.' },
      { title: 'En riktig rutin', desc: 'Noll förberedelse betyder att ni kan köra det varje dag — en förutsägbar lektionsöppning eleverna väntar på.' },
      { title: 'Lärorik, inte fyllnad', desc: 'Eleverna staverar och bildar riktiga ord under tidspress — aktiv återkallelse, inte ett arbetsblad de ignorerar.' },
      { title: 'Vilken enhet som helst, ingen nedladdning', desc: 'Chromebooks, surfplattor, telefoner — bara webbläsare. Funkar lika bra om ni är 1:1 eller BYOD.' },
    ],
    stepsTitle: 'Fem minuters rutin',
    steps: [
      { t: 'Visa koden', d: 'Medan eleverna kommer in är den sex tecken långa koden redan på tavlan.' },
      { t: 'De går med och spelar', d: 'Ingen inloggning, vilken enhet som helst. Spelet börjar när klockan slutar ringa.' },
      { t: 'Övergång varm', d: 'Fem minuter senare är klassen vaken och beredd — gå direkt in i lektionen.' },
    ],
    faqTitle: 'Vanliga frågor',
    faqs: [
      { q: 'Vad gör ett bra ringklocka-spel?', a: 'Det startar direkt, tar ungefär 5 minuter och behöver noll förberedelse så det funkar varje dag. LexiClash passar: visa en kod på sex tecken, eleverna går med från valfri enhet utan inloggning, och ett live-ordspel fyller klassens första fem minuter med ordförråd och stavningsträning.' },
      { q: 'Behöver eleverna logga in för uppvärmningen?', a: 'Nej. En kod på sex tecken betyder att eleverna spelar på sekunder — kritiskt för en ringklocka, där all inloggningsfriktion äter upp hela aktiviteten.' },
      { q: 'Kan jag koppla ringklockan till min nuvarande enhet?', a: 'Ja. Ladda upp ditt enhetsordförråd en gång och återanvänd det hela veckan som uppvärmning, eller välj en färdig lista när du vill helt noll förberedelse. Samma ordlista kan driva måndagens uppvärmning och fredagens repetition.' },
      { q: 'Är det gratis?', a: 'Ja — helt gratis, ingen premiumversion, ingen gräns per klass utöver 30 elever i ett live-spel.' },
      { q: 'Vilka färdigheter tränar det?', a: 'Ordbildning på Boggle-rutnät, anagram och hjul tränar stavning, ordförråd och bokstavsmönster — träning för riktigt lärande, inte bara en tidsfyllare.' },
      { q: 'Funkar det som daglig rutin?', a: 'Det är designen. Eftersom det inte behövs installation eller inloggning kan ni köra det varje dag med olika ordlista och skapa en förutsägbar lektionsöppning eleverna känner igen.' },
    ],
    moreTitle: 'Mer för lärare',
    moreCards: [
      { title: 'Klassrumsspel', sub: 'Ingen inloggning, ingen nedladdning' },
      { title: 'Vikariespel', sub: 'Noll förberedelse' },
      { title: 'Utbildningshubb', sub: 'Alla klassrumsspel' },
    ],
    finalTitle: 'Använd det imorgon bitti',
    finalBody: 'Lägg in en ordlista ikväll så är imorgons ringklocka klar: visa koden, eleverna spelar, lektionen börjar varm. Ingen registrering, ingen installation, inget kreditkort.',
    finalCta: 'Börja ett klassrumsspel gratis',
  },
  ja: {
    metaTitle: 'チャイムゲーム — 無料5分間のウォームアップ | LexiClash',
    metaDescription:
      '英語の授業向け無料チャイムゲーム。6文字のコードで参加する5分間のレッスンスタート — ログインなし、準備なし。単語の組み立て、スペリング、自分たちの単語リスト、どの端末でも。',
    ogTitle: 'チャイムゲーム — 無料5分間のウォームアップ',
    ogDescription: 'ライブの単語ゲームでレッスンを始めましょう。コードで参加、ログインなし、準備なし。自分たちの単語リスト。無料。',
    twitterTitle: 'チャイムゲーム — 無料',
    twitterDescription: '授業スタートの5分間ゲーム。ログインなし、準備なし。無料。',
    heroTitle: 'チャイムが鳴り終わる前に、クラス全体が遊んでいるゲーム。',
    intro:
      '一番いいチャイムゲームは、実際に毎日できるやつです。LexiClashは5分間のゲーム、ログインなし、準備なし。6文字のコードを映すと、生徒はどの端末からでも参加して、ライブの単語ゲームが始まり、本物の単語練習とスペリングでレッスンを開きます。今週の単語リストを毎日のウォームアップとして再利用するか、準備ゼロの組み込みリストを選んでください。無料、ブラウザだけで、毎日できる予測可能なルーティンになるくらい信頼できる — 学習になる、時間つぶしじゃない。',
    ctaStart: 'ウォームアップを始める',
    ctaClassroom: 'すべての教室ゲーム',
    ctaDuels: '1対1の対戦',
    fitsTitle: 'なぜ毎日のスタートに使える',
    fits: [
      { title: '即座に始まる', desc: 'コードを映す、生徒が参加する、遊び始める。ログインも設定も、最初の5分を無駄にしない。' },
      { title: '5分向けに作られている', desc: '短いラウンドはチャイム時間にぴったり合う — 教室を起動して、そのままレッスンに流れ込む。' },
      { title: 'ユニットに合わせられる', desc: '今週の単語リストを毎日のウォームアップとして使えば、チャイムゲームが教えていることを強化します。' },
      { title: '本物のルーティン', desc: '準備ゼロなら毎日できる — 生徒が待つようになる、予測可能なレッスンスタート。' },
      { title: '学習になる、時間つぶしじゃない', desc: '生徒は時間制限の中で本物の単語のスペリングと形成をやる — 能動的な想起、無視されるワークシートじゃない。' },
      { title: 'どの端末でも、ダウンロード不要', desc: 'Chromebook、タブレット、スマホ — ブラウザだけ。1:1でもBYODでも同じく動きます。' },
    ],
    stepsTitle: '5分間のルーティン',
    steps: [
      { t: 'コードを映す', d: '生徒が入ってきたとき、6文字のコードはもう黒板に書いてあります。' },
      { t: '参加して、遊ぶ', d: 'ログインなし、どの端末でも。チャイムが鳴り終わるとゲームが始まります。' },
      { t: 'ウォームになったら移る', d: '5分後、クラスは目覚めて準備ができています — そのままレッスンに入ります。' },
    ],
    faqTitle: 'よくある質問',
    faqs: [
      { q: 'いいチャイムゲームとは？', a: 'すぐ始まって、5分くらいで、準備ゼロだから毎日できるやつです。LexiClashは：6文字のコードを映す、生徒はログインなしでどの端末からでも参加、ライブの単語ゲームがクラスの最初の5分を単語とスペリングの練習で埋めます。' },
      { q: '生徒はウォームアップのためにログインが必要？', a: 'いいえ。6文字のコードなら数秒で遊び始められる — チャイムゲームは決定的で、ログインの手間が全体を食います。' },
      { q: 'チャイムゲームを今やってるユニットに合わせられる？', a: 'はい。ユニットの単語を一度アップロードして一週間のウォームアップに使い直すか、準備ゼロの組み込みリストを選ぶかできます。同じリストが月曜のウォームアップと金曜の復習を動かせます。' },
      { q: '無料ですか？', a: 'はい — 完全に無料、プレミアムなし、ライブゲーム30人の制限以外に制限なし。' },
      { q: 'どんなスキルを練習しますか？', a: 'Boggleグリッドの単語形成、アナグラム、車輪ゲームはスペリング、語彙、文字パターンを練習する — 実学的なウォームアップ、時間つぶしじゃない。' },
      { q: '毎日のルーティンになりますか？', a: 'その通り。設定もログインも必要ないから、毎日違う単語リストで実行して、生徒が知ってる予測可能なレッスンスタートを作ります。' },
    ],
    moreTitle: '先生向けのその他',
    moreCards: [
      { title: '教室ゲーム', sub: 'ログインなし、ダウンロードなし' },
      { title: '代理教師向けゲーム', sub: '準備ゼロ' },
      { title: '教育ハブ', sub: 'すべての教室ゲーム' },
    ],
    finalTitle: '明日の朝に使える',
    finalBody: '今晩、単語リストを入れておけば、明日のチャイムゲームは準備完了。コードを映す、生徒が遊ぶ、レッスンが温かく始まる。登録なし、インストールなし、クレジットカードなし。',
    finalCta: '教室ゲームを始める',
  },
  es: {
    metaTitle: 'Juegos de Timbre — Calentamientos gratis de 5 minutos | LexiClash',
    metaDescription:
      'Juegos gratis para comenzar clase. Los estudiantes entran con un código de 6 caracteres — sin login, sin preparación. Formación de palabras, ortografía, tus listas, cualquier dispositivo.',
    ogTitle: 'Juegos de Timbre — Calentamientos gratis de 5 minutos',
    ogDescription: 'Comienza la clase con un juego en vivo. Código, sin login, sin prep. Tus palabras. Gratis.',
    twitterTitle: 'Juegos de Timbre — gratis',
    twitterDescription: 'Juegos de 5 minutos para empezar clase. Sin login, sin prep. Gratis.',
    heroTitle: 'Un juego de timbre que toda la clase juega antes de que suene.',
    intro:
      'El mejor juego de timbre es uno que realmente puedas hacer todos los días. LexiClash es un juego de 5 minutos, sin login, sin prep: proyectas un código de 6 caracteres, los estudiantes entran desde cualquier dispositivo, y un juego de palabras en vivo comienza la clase con ortografía y vocabulario de verdad. Reutiliza la lista de palabras de esta semana como calentamiento diario, o elige una lista incluida para cero preparación. Gratis, en el navegador, y predecible lo suficiente para convertirse en rutina — aprendizaje de verdad, no solo llenar tiempo.',
    ctaStart: 'Comenzar un calentamiento',
    ctaClassroom: 'Todos los juegos de clase',
    ctaDuels: 'Duelos 1 contra 1',
    fitsTitle: 'Por qué funciona para empezar el día',
    fits: [
      { title: 'Comienza al instante', desc: 'Proyecta el código, los estudiantes entran, juegan. Ningún login o configuración devorando los primeros cinco minutos.' },
      { title: 'Hecho para 5 minutos', desc: 'Rondas cortas encajan en la ventana del timbre exactamente — despierta el aula, luego fluye al contenido.' },
      { title: 'Conecta con la unidad', desc: 'Reutiliza la lista de palabras de esta semana como calentamiento diario para que el juego refuerce lo que enseñas.' },
      { title: 'Una rutina de verdad', desc: 'Cero prep significa que puedes hacerlo cada día — un comienzo predecible que los estudiantes reconocen.' },
      { title: 'Aprendizaje de verdad, no relleno', desc: 'Los estudiantes deletrean y forman palabras reales bajo presión de tiempo — recuperación activa, no una hoja que ignoran.' },
      { title: 'Cualquier dispositivo, sin descargar', desc: 'Chromebooks, tablets, teléfonos — solo navegador. Funciona igual si es 1:1 o BYOD.' },
    ],
    stepsTitle: 'Rutina de 5 minutos',
    steps: [
      { t: 'Proyecta el código', d: 'Mientras los estudiantes entran, el código de 6 caracteres ya está en la pizarra.' },
      { t: 'Entran y juegan', d: 'Sin login, cualquier dispositivo. El juego comienza cuando termina de sonar el timbre.' },
      { t: 'Transición en calor', d: 'Cinco minutos después el aula está despierta y lista — fluye directo al contenido.' },
    ],
    faqTitle: 'Preguntas frecuentes',
    faqs: [
      { q: '¿Qué hace un buen juego de timbre?', a: 'Que comience al instante, dure unos 5 minutos y necesite cero preparación para funcionar cada día. LexiClash encaja: proyectas un código de 6 caracteres, los estudiantes entran desde cualquier dispositivo sin login, y un juego de palabras en vivo llena los primeros cinco minutos con ortografía y vocabulario.' },
      { q: '¿Los estudiantes necesitan login para el calentamiento?', a: 'No. Un código de 6 caracteres significa que juegan en segundos — crítico para un juego de timbre, donde cualquier fricción de login destruye la actividad.' },
      { q: '¿Puedo conectar el juego de timbre a mi unidad actual?', a: 'Sí. Sube tu vocabulario una vez y reutilízalo toda la semana como calentamiento, o elige una lista incluida para cero prep. La misma lista puede manejar el calentamiento del lunes y la revisión del viernes.' },
      { q: '¿Es gratis?', a: 'Sí — totalmente gratis, sin premium, sin límite por clase más allá de 30 estudiantes en un juego en vivo.' },
      { q: '¿Qué destrezas practica?', a: 'Formación de palabras en cuadrículas Boggle, anagramas y ruedas entrenan ortografía, vocabulario y patrones de letras — aprendizaje productivo, no solo llenar tiempo.' },
      { q: '¿Funciona como rutina diaria?', a: 'Ese es el diseño. Porque no hay configuración ni login, puedes hacerlo cada día con listas diferentes y crear una rutina de apertura predecible que los estudiantes reconocen.' },
    ],
    moreTitle: 'Más para maestros',
    moreCards: [
      { title: 'Juegos de clase', sub: 'Sin login, sin descargar' },
      { title: 'Juegos para suplentes', sub: 'Cero prep' },
      { title: 'Centro de educación', sub: 'Todos los juegos de clase' },
    ],
    finalTitle: 'Úsalo mañana por la mañana',
    finalBody: 'Añade una lista de palabras esta noche y el juego de timbre de mañana está listo: proyecta el código, los estudiantes juegan, la clase comienza en calor. Sin signup, sin instalar, sin tarjeta.',
    finalCta: 'Comienza un juego de clase',
  },
  ru: {
    metaTitle: 'Игры-разминки — бесплатные 5-минутные разминки для урока | LexiClash',
    metaDescription:
      'Бесплатные игры-разминки для уроков. 5-минутная разминка в начале урока, к которой ученики присоединяются по коду из 6 символов — без входа, без подготовки. Игры на составление слов, орфография, ваши списки слов, любое устройство.',
    ogTitle: 'Игры-разминки — бесплатные 5-минутные разминки',
    ogDescription: 'Начни урок с живой словесной игрой. Присоединиться по коду, без входа, без подготовки. Твои слова. Бесплатно.',
    twitterTitle: 'Игры-разминки — бесплатно',
    twitterDescription: '5-минутные игры в начале урока. Без входа, без подготовки. Бесплатно.',
    heroTitle: 'Разминка, в которую весь класс играет до того, как прозвенит звонок.',
    intro:
      'Лучшая разминка — это та, которую ты можешь проводить каждый день. LexiClash — это 5-минутная словесная игра без входа и подготовки: покажи код из 6 символов, ученики присоединяются с любого устройства, и живая игра на составление слов открывает урок с реальной практикой словарного запаса и орфографии. Переиспользуй список слов этой недели как ежедневную разминку или возьми встроенный список с нулевой подготовкой. Бесплатно, в браузере, и настолько предсказуемо, что становится рутиной — продуктивно, не просто заполнение времени.',
    ctaStart: 'Начать разминку бесплатно',
    ctaClassroom: 'Все словесные игры для класса',
    ctaDuels: 'Дуэль 1 на 1',
    fitsTitle: 'Почему это работает как ежедневное начало',
    fits: [
      { title: 'Мгновенный старт', desc: 'Покажи код, ученики присоединяются, начинаете играть. Нет входа или настройки, которые съедят первые пять минут.' },
      { title: 'Сделано на 5 минут', desc: 'Короткие раунды идеально подходят для окна разминки — оживи класс, затем переходи к уроку.' },
      { title: 'Привяжи к теме урока', desc: 'Переиспользуй список слов этой недели как ежедневную разминку, чтобы разминка усиливала то, что ты преподаёшь.' },
      { title: 'Настоящая рутина', desc: 'Нулевая подготовка означает, что ты можешь проводить это каждый день — предсказуемое начало урока, которое ученики быстро принимают.' },
      { title: 'Продуктивно, не просто время', desc: 'Ученики пишут и составляют настоящие слова под давлением времени — активное воспроизведение, не рабочий лист, который они игнорируют.' },
      { title: 'Любое устройство, без загрузки', desc: 'Chromebook, планшеты, телефоны — только браузер. Одинаково работает, есть ли у всех свои устройства или они общие.' },
    ],
    stepsTitle: 'Рутина из 5 минут',
    steps: [
      { t: 'Покажи код', d: 'Пока ученики входят в класс, код из 6 символов уже на доске.' },
      { t: 'Они присоединяются и играют', d: 'Без входа, любое устройство. Раунд начинается, когда звонок перестаёт звенеть.' },
      { t: 'Переход на энергию', d: 'Через пять минут класс проснулся и готов — переходи прямо к уроку.' },
    ],
    faqTitle: 'Часто задаваемые вопросы',
    faqs: [
      { q: 'Что делает разминку хорошей?', a: 'Она начинается мгновенно, длится около 5 минут и требует нулевой подготовки, чтобы работать каждый день. LexiClash подходит: покажи код из 6 символов, ученики присоединяются с любого устройства без входа, и живая игра на составление слов заполняет первые пять минут класса практикой словарного запаса и орфографии.' },
      { q: 'Нужны ли ученикам учетные данные для разминки?', a: 'Нет. код из 6 символов означает, что ученики начинают играть за секунды — критично для разминки, где любое препятствие входа съедает всю активность.' },
      { q: 'Могу ли я привязать разминку к своей теме?', a: 'Да. Загрузи словарь своей темы один раз и переиспользуй его всю неделю как разминку, или выбери встроенный список, когда нужна нулевая подготовка. Один список может питать разминку понедельника и проверку пятницы.' },
      { q: 'Это бесплатно?', a: 'Да — полностью бесплатно, никаких премиум-версий, никаких ограничений по классам кроме 30 учеников в живой игре.' },
      { q: 'Какие навыки это тренирует?', a: 'Составление слов на сетках в стиле Boggle, анаграммы и колеса слов тренируют орфографию, словарный запас и распознавание букв — продуктивная разминка, а не просто заполнение времени.' },
      { q: 'Это будет работать как ежедневная рутина?', a: 'Так и задумано. Потому что нет ничего настраивать или во что входить, ты можешь проводить это каждый день с разными списками слов, создавая предсказуемое начало урока, которое ученики узнают.' },
    ],
    moreTitle: 'Ещё для учителей',
    moreCards: [
      { title: 'Словесные игры для класса', sub: 'Без входа, без загрузки' },
      { title: 'Игры для замены учителя', sub: 'Нулевая подготовка' },
      { title: 'Центр образования', sub: 'Все словесные игры для класса' },
    ],
    finalTitle: 'Используй завтра утром',
    finalBody: 'Добавь список слов сегодня вечером, и завтрашняя разминка готова: покажи код, ученики играют, урок начинается энергично. Без регистрации, без установки, без карты.',
    finalCta: 'Начать словесную игру для класса бесплатно',
  },
};

export function getBellRingerContent(locale: string): LocaleContent {
  return contentMap[(locale as BellRingerLocale)] ?? contentMap.en;
}
