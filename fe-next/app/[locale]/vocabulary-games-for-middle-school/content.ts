// Native per-locale copy for the vocabulary-games-for-middle-school landing page.
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
  ctaDuels: string;
  ctaMore: string;
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

export const MIDDLE_SCHOOL_LOCALES = ['en', 'he', 'sv', 'ja', 'es', 'ru'] as const;
export type MiddleSchoolLocale = typeof MIDDLE_SCHOOL_LOCALES[number];

const contentMap: Record<MiddleSchoolLocale, LocaleContent> = {
  en: {
    metaTitle: 'Vocabulary Games for Middle School — Free, No-Login Multiplayer (2026) | LexiClash',
    metaDescription:
      'Free vocabulary games for middle school. Live whole-class multiplayer and 1v1 duels students join with a 4-digit code — no logins, no signup. Use your own word lists, CEFR-scaled for ESL, ready in under a minute.',
    ogTitle: 'Vocabulary Games for Middle School — Free & No-Login',
    ogDescription:
      'Live multiplayer vocabulary games for grades 6–8. Join with a code, no signup. Your word lists. Free forever.',
    twitterTitle: 'Vocabulary Games for Middle School — Free',
    twitterDescription: 'Live multiplayer vocabulary games, grades 6–8. No login. Free.',
    heroTitle: 'Vocabulary games middle schoolers actually want to play.',
    intro:
      'Middle school vocabulary review dies when it\'s a worksheet and stalls when it needs 30 logins. LexiClash is the fix: free, live word games your students join with a 4-digit code — no accounts, no signup. Drop in this week\'s word list, project the code, and the whole class plays at once. Word-formation gameplay drills spelling and recall (not lucky guessing), difficulty scales A1–C2 for ESL and advanced readers, and you get a teacher dashboard for instant formative data. Ready in under a minute.',
    ctaStart: 'Start a Class Game Free',
    ctaDuels: 'Run a 1v1 Duel',
    ctaMore: 'All Classroom Games',
    fitsTitle: 'Why it works for grades 6–8',
    fits: [
      {
        title: 'No logins to slow you down',
        desc: 'A 4-digit join code beats provisioning 30 accounts. Perfect for 1:1 Chromebook carts and BYOD where students don\'t all have school emails.'
      },
      {
        title: 'Your word list, not ours',
        desc: 'Drop in this unit\'s Tier 2 vocabulary and play it the same day. Built-in lists are there too when you want zero prep.'
      },
      {
        title: 'Spelling + recall, not guessing',
        desc: 'Students form and spell real words on Boggle-style grids, anagrams, and wheels — active retrieval, the skill that sticks.'
      },
      {
        title: 'Differentiate in one class',
        desc: 'CEFR A1–C2 scaling lets newcomers and advanced readers play the same activity at the right level.'
      },
      {
        title: 'Whole-class + 1v1',
        desc: 'Run a live class game on the projector, or pair students head-to-head for a fast competitive review.'
      },
      {
        title: 'Teacher dashboard',
        desc: 'See per-student accuracy and the words that tripped the whole class — instant formative data, no grading.'
      },
    ],
    stepsTitle: 'From word list to live game in 3 steps',
    steps: [
      {
        t: 'Pick a list',
        d: 'Upload your unit vocabulary or use a built-in list. Choose a mode and time limit.'
      },
      {
        t: 'Project the code',
        d: 'Students open the link and type the 4-digit join code. No accounts, any device.'
      },
      {
        t: 'Play + review',
        d: 'Live leaderboard during play; per-student accuracy and class-wide gaps after.'
      },
    ],
    faqTitle: 'Frequently asked questions',
    faqs: [
      {
        q: 'Are these vocabulary games really free for middle school?',
        a: 'Yes — LexiClash is fully free with no premium tier. Whole-class multiplayer, 1v1 duels, custom word lists, and the teacher dashboard are all free, with no per-student or per-class limit beyond 30 students per live game.'
      },
      {
        q: 'Do my middle schoolers need accounts or logins?',
        a: 'No. Students join a classroom game with a 4-digit code you project — no email, no signup, no rostering. That removes the biggest setup friction for 1:1 and BYOD classrooms.'
      },
      {
        q: 'Can I use my own vocabulary words?',
        a: 'Yes. Upload your unit or curriculum word list in under a minute and play it in whole-class games, 1v1 duels, or assigned practice. No import-format restrictions.'
      },
      {
        q: 'Is it a good fit for 6th, 7th, and 8th grade?',
        a: 'Middle school is the sweet spot. Difficulty is CEFR-scaled (A1–C2), so you can pitch it at grade level or stretch advanced students, and the word-formation gameplay rewards spelling and recall rather than guessing.'
      },
      {
        q: 'Does it work for ESL and newcomers in middle school?',
        a: 'Yes — native dictionaries for English, Spanish, Hebrew (RTL), Swedish, Japanese, and Russian let you run the same activity for ESL and bilingual students. Scale the difficulty down for newcomers and up for on-level students in the same class.'
      },
      {
        q: 'How long does a game take?',
        a: 'A typical round is 5–10 minutes — short enough for a warm-up, bell ringer, or end-of-class review, long enough to cover a full word list.'
      },
    ],
    moreTitle: 'More for teachers',
    moreCards: [
      { title: 'Bell Ringer Word Games', sub: '5-minute start-of-class openers' },
      { title: 'ESL Word Games', sub: 'CEFR-scaled, 6 languages' },
      { title: 'Education Hub', sub: 'All classroom word games' },
    ],
    finalTitle: 'Try it before next class',
    finalBody:
      'Take this week\'s vocabulary list, project a join code, and watch the whole class compete. No signup, no credit card, no email capture — if it isn\'t a fit, you\'ve lost five minutes.',
    finalCta: 'Start a Classroom Game Free',
  },
  he: {
    metaTitle: 'משחקי אוצר מילים לחטיבת ביניים — חינם, ללא התחברות, מולטיפלייר (2026) | LexiClash',
    metaDescription:
      'משחקי אוצר מילים חינם לחטיבת ביניים. מולטיפלייר כיתתי חי ודיואלים 1v1 שהתלמידים מצטרפים אליהם עם קוד 4 ספרות — ללא התחברות, ללא הרשמה. השתמש ברשימות המילים שלך, מותאם CEFR לאנגלית כשפה זרה, מוכן בפחות מדקה.',
    ogTitle: 'משחקי אוצר מילים לחטיבת ביניים — חינם וללא התחברות',
    ogDescription:
      'משחקי אוצר מילים מולטיפלייר חיים לכיתות 6–8. הצטרף עם קוד, ללא הרשמה. רשימות המילים שלך. חינם לתמיד.',
    twitterTitle: 'משחקי אוצר מילים לחטיבת ביניים — חינם',
    twitterDescription: 'משחקי אוצר מילים מולטיפלייר חיים, כיתות 6–8. ללא התחברות. חינם.',
    heroTitle: 'משחקי אוצר מילים שתלמידי חטיבת ביניים באמת רוצים לשחק.',
    intro:
      'חזרה על אוצר מילים בחטיבת ביניים מתה כשזה דף עבודה ונתקעת כשצריך 30 התחברויות. LexiClash היא הפתרון: משחקי מילים חיים וחינם שהתלמידים שלך מצטרפים אליהם עם קוד 4 ספרות — ללא חשבונות, ללא הרשמה. הוסף את רשימת המילים של השבוע, הקרן את הקוד, וכל הכיתה משחקת בו-זמנית. משחקיית היווצרות מילים מתרגלת איות ושליפה (לא ניחוש מזל), רמות קושי A1–C2 לתלמידי אנגלית כשפה זרה וקוראים מתקדמים, ואתה מקבל לוח קבלות למורה עם נתונים פורמטיביים מיידיים. מוכן בפחות מדקה.',
    ctaStart: 'התחל משחק כיתתי חינם',
    ctaDuels: 'השחק דואל 1v1',
    ctaMore: 'כל משחקי הכיתה',
    fitsTitle: 'למה זה עובד לכיתות 6–8',
    fits: [
      {
        title: 'ללא התחברויות שמאטות אותך',
        desc: 'קוד הצטרפות 4 ספרות עדיף על התקנת 30 חשבונות. מושלם לעגלות Chromebook 1:1 וBYOD שבהם לא כל התלמידים יש דוא״ל בית ספר.'
      },
      {
        title: 'רשימת המילים שלך, לא שלנו',
        desc: 'הוסף את אוצר המילים של יחידה זו והשחק אותו באותו היום. רשימות מובנות גם זמינות כשאתה רוצה אפס הכנה.'
      },
      {
        title: 'איות + שליפה, לא ניחוש',
        desc: 'התלמידים יוצרים ומאיתים מילים ממשיות על רשתות סגנון Boggle, אנגרמות וגלגלים — שליפה פעילה, המיומנות שנשארת.'
      },
      {
        title: 'הבחנה בכיתה אחת',
        desc: 'קנה מידה CEFR A1–C2 מאפשר למתחילים וקוראים מתקדמים לשחק באותה פעילות ברמה נכונה.'
      },
      {
        title: 'כיתה מלאה + 1v1',
        desc: 'הרץ משחק כיתתי חי על הפרוג׳קטור, או זווג תלמידים פנים אל פנים לסקירה תחרותית מהירה.'
      },
      {
        title: 'לוח קבלות למורה',
        desc: 'ראה דיוק לתלמיד ומילים שבלבלו את כל הכיתה — נתונים פורמטיביים מיידיים, ללא ציונים.'
      },
    ],
    stepsTitle: 'מרשימת מילים למשחק חי ב-3 שלבים',
    steps: [
      {
        t: 'בחר רשימה',
        d: 'העלה את אוצר המילים של היחידה שלך או השתמש ברשימה מובנית. בחר מצב ומגבלת זמן.'
      },
      {
        t: 'הקרן את הקוד',
        d: 'התלמידים פותחים את הקישור וקלטים את קוד ההצטרפות 4 ספרות. ללא חשבונות, כל מכשיר.'
      },
      {
        t: 'שחק + סקור',
        d: 'טבלת הדירוג חי במהלך המשחק; דיוק לתלמיד ופערים בכיתה לאחר.'
      },
    ],
    faqTitle: 'שאלות נפוצות',
    faqs: [
      {
        q: 'משחקי אוצר מילים אלה באמת חינם לחטיבת ביניים?',
        a: 'כן — LexiClash חינם לחלוטין ללא שכבה פרמיום. מולטיפלייר כיתתי, דואלים 1v1, רשימות מילים מותאמות ולוח הקבלות למורה הם כולם חינם, ללא מגבלה לתלמיד או לכיתה מעבר ל-30 תלמידים למשחק חי.'
      },
      {
        q: 'האם תלמידי חטיבת ביניים שלי צריכים חשבונות או התחברויות?',
        a: 'לא. התלמידים מצטרפים למשחק כיתתי עם קוד 4 ספרות שאתה משדר — ללא דוא״ל, ללא הרשמה, ללא רשימת כיתה. זה מסיר את החיכוך ההתקנה הגדול ביותר לכיתות 1:1 וBYOD.'
      },
      {
        q: 'האם אני יכול להשתמש במילים אוצר המילים שלי?',
        a: 'כן. העלה את רשימת המילים של היחידה או התוכנית שלך בפחות מדקה והשחק אותה במשחקי כיתה מלאה, דואלים 1v1 או תרגול מוקצה. ללא הגבלות פורמט ייבוא.'
      },
      {
        q: 'האם זה התאמה טובה לכיתה 6, 7 ו-8?',
        a: 'חטיבת ביניים היא הנקודה המתוקה. קושי מודרג CEFR (A1–C2), כך שאתה יכול לכוון לרמת כיתה או להתיש תלמידים מתקדמים, ומשחקיית היווצרות המילים תגמול איות ושליפה במקום ניחוש.'
      },
      {
        q: 'האם זה עובד לאנגלית כשפה זרה ולמתחילים בחטיבת ביניים?',
        a: 'כן — מילונים תאימים לאנגלית, ספרדית, עברית (RTL), שוודית, יפנית ורוסית מאפשרים לך להפעיל את אותה פעילות לתלמידי אנגלית כשפה זרה ולתלמידים דו-לשוניים. הנמך את הקושי למתחילים והעלה לתלמידים ברמה בו-זמנית בכיתה אחת.'
      },
      {
        q: 'כמה זמן משחק לוקח?',
        a: 'סיבוב טיפוסי הוא 5–10 דקות — קצר מספיק להתחממות, פעמון התחלה או סקירת סיום כיתה, ארוך מספיק לכיסוי רשימת מילים מלאה.'
      },
    ],
    moreTitle: 'עוד למורים',
    moreCards: [
      { title: 'משחקי מילים פעמון התחלה', sub: 'פתיחות התחלת כיתה של 5 דקות' },
      { title: 'משחקי מילים אנגלית כשפה זרה', sub: 'מודרג CEFR, 6 שפות' },
      { title: 'Hub החינוך', sub: 'כל משחקי מילים בכיתה' },
    ],
    finalTitle: 'נסה את זה לפני הכיתה הבאה',
    finalBody:
      'קח את רשימת אוצר המילים של השבוע, הקרן קוד הצטרפות וצפה בכל הכיתה מתחרה. ללא הרשמה, ללא כרטיס אשראי, ללא לכידת דוא״ל — אם זה לא התאמה, הפסדת חמש דקות.',
    finalCta: 'התחל משחק כיתתי חינם',
  },
  sv: {
    metaTitle: 'Ordförrådslekar för mellanstadiet — gratis, ingen inloggning, multiplayer (2026) | LexiClash',
    metaDescription:
      'Gratis ordförrådslekar för mellanstadiet. Live hel-klass-multiplayer och 1v1-dueller som elever ansluter till med en fyrsiffrig kod — ingen inloggning, ingen registrering. Använd dina egna ordlistor, CEFR-skalad för ESL, klara på under en minut.',
    ogTitle: 'Ordförrådslekar för mellanstadiet — gratis & ingen inloggning',
    ogDescription:
      'Live multiplayer-ordförrådslekar för årskurs 6–8. Gå med med en kod, ingen registrering. Dina ordlistor. Gratis för alltid.',
    twitterTitle: 'Ordförrådslekar för mellanstadiet — gratis',
    twitterDescription: 'Live multiplayer ordförrådslekar, årskurs 6–8. Ingen inloggning. Gratis.',
    heroTitle: 'Ordförrådslekar som mellanstadieelever faktiskt vill spela.',
    intro:
      'Ordförrådsrepetition i mellanstadiet dör när det är ett arbetsblad och stannar när det behövs 30 inloggningar. LexiClash är lösningen: gratis, live ordlekar som dina elever ansluter till med en fyrsiffrig kod — inga konton, ingen registrering. Släpp in denna veckas ordlista, projicera koden, och hela klassen spelar tillsammans. Ordbildningsspelmekaniken tränar stavning och återkallelse (inte slumpmässig gissning), svårighetsnivå skalas A1–C2 för ESL och avancerade läsare, och du får en lärardashboard för omedelbar formativ data. Klara på under en minut.',
    ctaStart: 'Starta ett klassrum-spel gratis',
    ctaDuels: 'Kör en 1v1-duell',
    ctaMore: 'Alla klassrumsspel',
    fitsTitle: 'Varför det fungerar för årskurs 6–8',
    fits: [
      {
        title: 'Ingen inloggning som bromsar dig',
        desc: 'En fyrsiffrig anslutningskod slår att etablera 30 konton. Perfekt för 1:1 Chromebook-vagnar och BYOD där elever inte alla har skolmejl.'
      },
      {
        title: 'Din ordlista, inte vår',
        desc: 'Släpp in denna enhets nivå-2-ordförråd och spela det samma dag. Inbyggda listor finns också när du vill ha noll förberedelse.'
      },
      {
        title: 'Stavning + återkallelse, inte gissning',
        desc: 'Elever bildar och staverar verkliga ord på Boggle-liknande rutnät, anagram och hjul — aktiv återkallelse, färdigheten som sitter fast.'
      },
      {
        title: 'Differentiera i en klass',
        desc: 'CEFR A1–C2-skalning låter nybörjare och avancerade läsare spela samma aktivitet på rätt nivå.'
      },
      {
        title: 'Hel klass + 1v1',
        desc: 'Kör ett live klassrumsspel på projektorn, eller para ihop elever ansikte mot ansikte för en snabb konkurrenskraftig genomgång.'
      },
      {
        title: 'Lärardashboard',
        desc: 'Se per-elev-noggrannhet och orden som vilseförde hela klassen — omedelbar formativ data, ingen betygssättning.'
      },
    ],
    stepsTitle: 'Från ordlista till live-spel i 3 steg',
    steps: [
      {
        t: 'Välj en lista',
        d: 'Ladda upp din enhets ordförråd eller använd en inbyggd lista. Välj ett läge och tidsgräns.'
      },
      {
        t: 'Projicera koden',
        d: 'Elever öppnar länken och skriver in den fyrsiffriga anslutningskoden. Inga konton, vilken enhet som helst.'
      },
      {
        t: 'Spela + granska',
        d: 'Live poängtabell under spel; per-elev-noggrannhet och klassomfattande luckor efteråt.'
      },
    ],
    faqTitle: 'Vanliga frågor',
    faqs: [
      {
        q: 'Är dessa ordförrådslekar verkligen gratis för mellanstadiet?',
        a: 'Ja — LexiClash är helt gratis utan premiumnivå. Hel-klass-multiplayer, 1v1-dueller, anpassade ordlistor och lärardashboarden är alla gratis, utan per-elev- eller per-klasssgräns bortom 30 elever per live-spel.'
      },
      {
        q: 'Behöver mina mellanstadieelever konton eller inloggningar?',
        a: 'Nej. Elever ansluter till ett klassrumsspel med en fyrsiffrig kod du projicerar — ingen mejl, ingen registrering, ingen klassbok. Det eliminerar den största installationsfriktionen för 1:1 och BYOD-klassrum.'
      },
      {
        q: 'Kan jag använda mina egna ordförrådsord?',
        a: 'Ja. Ladda upp din enhet eller läroplanets ordlista på under en minut och spela den i hel-klass-spel, 1v1-dueller eller tilldelad träning. Inga begränsningar för importformat.'
      },
      {
        q: 'Är det en bra passform för årskurs 6, 7 och 8?',
        a: 'Mellanstadiet är den perfekta punkten. Svårigheten är CEFR-skalad (A1–C2), så du kan rikta den på årskursnivå eller sträcka avancerade elever, och ordbildningsspelmekaniken belönar stavning och återkallelse snarare än gissning.'
      },
      {
        q: 'Fungerar det för ESL och nybörjare i mellanstadiet?',
        a: 'Ja — ursprungliga ordböcker för engelska, spanska, hebreiska (RTL), svenska, japanska och ryska låter dig köra samma aktivitet för ESL- och tvåspråkiga elever. Skala ner svårigheten för nybörjare och upp för elever på nivå i samma klass.'
      },
      {
        q: 'Hur lång tid tar ett spel?',
        a: 'En typisk runda tar 5–10 minuter — kort nog för ett uppvärmning, klassrumsstartare eller klassslutgranskning, långt nog för att täcka en fullständig ordlista.'
      },
    ],
    moreTitle: 'Mer för lärare',
    moreCards: [
      { title: 'Klassrumsstarter-ordlekar', sub: '5-minuters klassrumsstarter' },
      { title: 'ESL-ordlekar', sub: 'CEFR-skalad, 6 språk' },
      { title: 'Utbildningsnav', sub: 'Alla klassrumsordslekar' },
    ],
    finalTitle: 'Prova det före nästa lektion',
    finalBody:
      'Ta denna veckas ordlista, projicera en anslutningskod och se hur hela klassen tävlar. Ingen registrering, inget kreditkort, ingen e-postfångst — om det inte passar, har du förlorat fem minuter.',
    finalCta: 'Starta ett klassrum-spel gratis',
  },
  ja: {
    metaTitle: 'Vocabulary Games for Middle School — Free, No-Login Multiplayer (2026) | LexiClash',
    metaDescription:
      'Free vocabulary games for middle school. Live whole-class multiplayer and 1v1 duels students join with a 4-digit code — no logins, no signup. Use your own word lists, CEFR-scaled for ESL, ready in under a minute.',
    ogTitle: 'Vocabulary Games for Middle School — Free & No-Login',
    ogDescription:
      'Live multiplayer vocabulary games for grades 6–8. Join with a code, no signup. Your word lists. Free forever.',
    twitterTitle: 'Vocabulary Games for Middle School — Free',
    twitterDescription: 'Live multiplayer vocabulary games, grades 6–8. No login. Free.',
    heroTitle: '中学生が本当にやりたい語彙ゲーム。',
    intro:
      'Middle school vocabulary review dies when it\'s a worksheet and stalls when it needs 30 logins. LexiClash is the fix: free, live word games your students join with a 4-digit code — no accounts, no signup. Drop in this week\'s word list, project the code, and the whole class plays at once. Word-formation gameplay drills spelling and recall (not lucky guessing), difficulty scales A1–C2 for ESL and advanced readers, and you get a teacher dashboard for instant formative data. Ready in under a minute.',
    ctaStart: 'クラスゲームを無料で開始',
    ctaDuels: '1v1デュエルを実行',
    ctaMore: 'すべてのクラスルームゲーム',
    fitsTitle: '6～8年生に最適な理由',
    fits: [
      {
        title: 'ログインの手間がない',
        desc: 'A 4-digit join code beats provisioning 30 accounts. Perfect for 1:1 Chromebook carts and BYOD where students don\'t all have school emails.'
      },
      {
        title: 'あなたの単語リスト、私たちのではなく',
        desc: 'Drop in this unit\'s Tier 2 vocabulary and play it the same day. Built-in lists are there too when you want zero prep.'
      },
      {
        title: 'スペル＋リコール、推測ではなく',
        desc: 'Students form and spell real words on Boggle-style grids, anagrams, and wheels — active retrieval, the skill that sticks.'
      },
      {
        title: '1つのクラスで差別化',
        desc: 'CEFR A1–C2 scaling lets newcomers and advanced readers play the same activity at the right level.'
      },
      {
        title: 'クラス全体+ 1v1',
        desc: 'Run a live class game on the projector, or pair students head-to-head for a fast competitive review.'
      },
      {
        title: '教師ダッシュボード',
        desc: 'See per-student accuracy and the words that tripped the whole class — instant formative data, no grading.'
      },
    ],
    stepsTitle: '単語リストからライブゲームまで3ステップ',
    steps: [
      {
        t: 'リストを選ぶ',
        d: 'Upload your unit vocabulary or use a built-in list. Choose a mode and time limit.'
      },
      {
        t: 'コードを表示',
        d: 'Students open the link and type the 4-digit join code. No accounts, any device.'
      },
      {
        t: 'プレイ+レビュー',
        d: 'Live leaderboard during play; per-student accuracy and class-wide gaps after.'
      },
    ],
    faqTitle: 'よくある質問',
    faqs: [
      {
        q: 'これらの語彙ゲームは本当に中学生向けに無料ですか？',
        a: 'Yes — LexiClash is fully free with no premium tier. Whole-class multiplayer, 1v1 duels, custom word lists, and the teacher dashboard are all free, with no per-student or per-class limit beyond 30 students per live game.'
      },
      {
        q: '中学生はアカウントまたはログインが必要ですか？',
        a: 'No. Students join a classroom game with a 4-digit code you project — no email, no signup, no rostering. That removes the biggest setup friction for 1:1 and BYOD classrooms.'
      },
      {
        q: '自分の語彙を使用できますか？',
        a: 'Yes. Upload your unit or curriculum word list in under a minute and play it in whole-class games, 1v1 duels, or assigned practice. No import-format restrictions.'
      },
      {
        q: '6年生、7年生、8年生に適していますか？',
        a: 'Middle school is the sweet spot. Difficulty is CEFR-scaled (A1–C2), so you can pitch it at grade level or stretch advanced students, and the word-formation gameplay rewards spelling and recall rather than guessing.'
      },
      {
        q: '中学校のESLと初心者に対応していますか？',
        a: 'Yes — native dictionaries for English, Spanish, Hebrew (RTL), Swedish, Japanese, and Russian let you run the same activity for ESL and bilingual students. Scale the difficulty down for newcomers and up for on-level students in the same class.'
      },
      {
        q: 'ゲームにはどのくらい時間がかかりますか？',
        a: 'A typical round is 5–10 minutes — short enough for a warm-up, bell ringer, or end-of-class review, long enough to cover a full word list.'
      },
    ],
    moreTitle: '教師向けその他',
    moreCards: [
      { title: 'ベルリンガーワードゲーム', sub: '5分間のクラス開始オープナー' },
      { title: 'ESLワードゲーム', sub: 'CEFR対応、6言語' },
      { title: 'EducationHub', sub: 'すべてのクラスルームワードゲーム' },
    ],
    finalTitle: '次のクラスの前に試してください',
    finalBody:
      'Take this week\'s vocabulary list, project a join code, and watch the whole class compete. No signup, no credit card, no email capture — if it isn\'t a fit, you\'ve lost five minutes.',
    finalCta: 'クラスゲームを無料で開始',
  },
  es: {
    metaTitle: 'Juegos de Vocabulario para Secundaria — Gratis, Sin Inicio de Sesión, Multijugador (2026) | LexiClash',
    metaDescription:
      'Juegos de vocabulario gratuitos para la secundaria. Multijugador en directo de toda la clase y duelos 1v1 a los que los estudiantes se unen con un código de 4 dígitos — sin inicio de sesión, sin registro. Usa tus propias listas de palabras, escalada CEFR para ESL, lista en menos de un minuto.',
    ogTitle: 'Juegos de Vocabulario para Secundaria — Gratis y Sin Inicio de Sesión',
    ogDescription:
      'Juegos de vocabulario multijugador en directo para los grados 6–8. Únete con un código, sin registro. Tus listas de palabras. Gratis para siempre.',
    twitterTitle: 'Juegos de Vocabulario para Secundaria — Gratis',
    twitterDescription: 'Juegos de vocabulario multijugador en directo, grados 6–8. Sin inicio de sesión. Gratis.',
    heroTitle: 'Juegos de vocabulario que los estudiantes de secundaria realmente quieren jugar.',
    intro:
      'La revisión de vocabulario de secundaria muere cuando es una hoja de trabajo y se detiene cuando necesita 30 inicios de sesión. LexiClash es la solución: juegos de palabras en directo y gratuitos a los que tus estudiantes se unen con un código de 4 dígitos — sin cuentas, sin registro. Agrega la lista de palabras de esta semana, proyecta el código, y toda la clase juega a la vez. La mecánica de juego de formación de palabras practica la ortografía y el recuerdo (no adivinanzas de suerte), la dificultad se escala A1–C2 para ESL y lectores avanzados, y obtienes un panel de control de maestro para datos formativos instantáneos. Listo en menos de un minuto.',
    ctaStart: 'Inicia un Juego de Clase Gratis',
    ctaDuels: 'Ejecutar un Duelo 1v1',
    ctaMore: 'Todos los Juegos de Aula',
    fitsTitle: 'Por qué funciona para los grados 6–8',
    fits: [
      {
        title: 'Sin inicios de sesión que te ralenticen',
        desc: 'Un código de unión de 4 dígitos supera el aprovisionamiento de 30 cuentas. Perfecto para carritos Chromebook 1:1 y BYOD donde no todos los estudiantes tienen correos electrónicos escolares.'
      },
      {
        title: 'Tu lista de palabras, no la nuestra',
        desc: 'Agrega el vocabulario de nivel 2 de esta unidad y juégalo el mismo día. Las listas integradas también están allí cuando quieras cero preparación.'
      },
      {
        title: 'Ortografía + recuerdo, no adivinanzas',
        desc: 'Los estudiantes forman y deletrean palabras reales en cuadrículas estilo Boggle, anagramas y ruedas — recuperación activa, la habilidad que se mantiene.'
      },
      {
        title: 'Diferenciar en una clase',
        desc: 'El escalado CEFR A1–C2 permite que los principiantes y los lectores avanzados jueguen la misma actividad en el nivel correcto.'
      },
      {
        title: 'Clase completa + 1v1',
        desc: 'Ejecuta un juego de clase en directo en el proyector, o empareja a los estudiantes cara a cara para una rápida revisión competitiva.'
      },
      {
        title: 'Panel de control del maestro',
        desc: 'Visualiza la precisión por estudiante y las palabras que confundieron a toda la clase — datos formativos instantáneos, sin calificación.'
      },
    ],
    stepsTitle: 'De la lista de palabras al juego en directo en 3 pasos',
    steps: [
      {
        t: 'Elige una lista',
        d: 'Carga tu vocabulario de unidad o usa una lista integrada. Elige un modo y límite de tiempo.'
      },
      {
        t: 'Proyecta el código',
        d: 'Los estudiantes abren el enlace y escriben el código de unión de 4 dígitos. Sin cuentas, cualquier dispositivo.'
      },
      {
        t: 'Juega + revisa',
        d: 'Tabla de clasificación en directo durante el juego; precisión por estudiante e huecos en toda la clase después.'
      },
    ],
    faqTitle: 'Preguntas frecuentes',
    faqs: [
      {
        q: '¿Estos juegos de vocabulario son realmente gratuitos para la secundaria?',
        a: 'Sí — LexiClash es completamente gratis sin nivel premium. Multijugador de toda la clase, duelos 1v1, listas de palabras personalizadas y el panel de control del maestro son todos gratuitos, sin límite por estudiante o por clase más allá de 30 estudiantes por juego en directo.'
      },
      {
        q: '¿Mis estudiantes de secundaria necesitan cuentas o inicios de sesión?',
        a: 'No. Los estudiantes se unen a un juego de clase con un código de 4 dígitos que proyectas — sin correo electrónico, sin registro, sin lista de clases. Esto elimina la mayor fricción de instalación para aulas 1:1 y BYOD.'
      },
      {
        q: '¿Puedo usar mis propias palabras de vocabulario?',
        a: 'Sí. Carga tu unidad o lista de palabras del plan de estudios en menos de un minuto y juégala en juegos de clase completa, duelos 1v1 o práctica asignada. Sin restricciones de formato de importación.'
      },
      {
        q: '¿Es un buen ajuste para 6º, 7º y 8º grado?',
        a: 'La secundaria es el punto dulce. La dificultad se escala CEFR (A1–C2), por lo que puedes dirigirla al nivel de grado o extender a estudiantes avanzados, y la mecánica de juego de formación de palabras recompensa la ortografía y el recuerdo en lugar de adivinar.'
      },
      {
        q: '¿Funciona para ESL y principiantes en la secundaria?',
        a: 'Sí — diccionarios nativos para inglés, español, hebreo (RTL), sueco, japonés y ruso te permiten ejecutar la misma actividad para estudiantes de ESL y bilingües. Escala la dificultad hacia abajo para principiantes y hacia arriba para estudiantes de nivel en la misma clase.'
      },
      {
        q: '¿Cuánto tiempo tarda un juego?',
        a: 'Una ronda típica dura de 5 a 10 minutos — lo suficientemente corta para un calentamiento, llamada de campana o revisión de fin de clase, lo suficientemente larga para cubrir una lista de palabras completa.'
      },
    ],
    moreTitle: 'Más para maestros',
    moreCards: [
      { title: 'Juegos de Palabras de Llamada de Campana', sub: 'Aperturas de inicio de clase de 5 minutos' },
      { title: 'Juegos de Palabras ESL', sub: 'Escalado CEFR, 6 idiomas' },
      { title: 'Centro de Educación', sub: 'Todos los juegos de palabras del aula' },
    ],
    finalTitle: 'Pruébalo antes de la próxima clase',
    finalBody:
      'Toma la lista de vocabulario de esta semana, proyecta un código de unión y mira cómo compite toda la clase. Sin registro, sin tarjeta de crédito, sin captura de correo electrónico — si no es un ajuste, has perdido cinco minutos.',
    finalCta: 'Inicia un Juego de Clase Gratis',
  },
  ru: {
    metaTitle: 'Словарные игры для средней школы — бесплатно, без входа, мультиплеер (2026) | LexiClash',
    metaDescription:
      'Бесплатные словарные игры для средней школы. Живой мультиплеер для целого класса и дуэли 1v1, к которым ученики присоединяются по 4-значному коду — без входа, без регистрации. Используйте свои списки слов, адаптированные по CEFR для ESL, готово менее чем за минуту.',
    ogTitle: 'Словарные игры для средней школы — бесплатно и без входа',
    ogDescription:
      'Живые многопользовательские словарные игры для 6–8 классов. Присоединитесь по коду, без регистрации. Ваши списки слов. Бесплатно навсегда.',
    twitterTitle: 'Словарные игры для средней школы — бесплатно',
    twitterDescription: 'Живые многопользовательские словарные игры, 6–8 классы. Без входа. Бесплатно.',
    heroTitle: 'Словарные игры, которые учащиеся средней школы действительно хотят играть.',
    intro:
      'Повторение словарного запаса в средней школе умирает, когда это рабочий лист, и застревает, когда требуется 30 входов. LexiClash — решение: бесплатные живые словесные игры, к которым ваши ученики присоединяются по 4-значному коду — без учетных записей, без регистрации. Загрузите список слов этой недели, проецируйте код, и весь класс играет одновременно. Геймплей образования слов тренирует орфографию и извлечение из памяти (не удачное угадывание), уровни сложности масштабируются A1–C2 для ESL и продвинутых читателей, и вы получаете панель инструментов учителя для мгновенных формирующих данных. Готово менее чем за минуту.',
    ctaStart: 'Начать классную игру бесплатно',
    ctaDuels: 'Провести дуэль 1v1',
    ctaMore: 'Все игры класса',
    fitsTitle: 'Почему это работает для 6–8 классов',
    fits: [
      {
        title: 'Никаких входов, чтобы замедлить вас',
        desc: '4-значный код присоединения лучше, чем подготовка 30 учетных записей. Идеально для тележек Chromebook 1:1 и BYOD, где не все студенты имеют школьные электронные письма.'
      },
      {
        title: 'Ваш список слов, не наш',
        desc: 'Добавьте словарь Уровня 2 этого модуля и играйте в тот же день. Встроенные списки также доступны, когда вам не требуется подготовка.'
      },
      {
        title: 'Орфография + извлечение из памяти, не угадывание',
        desc: 'Учащиеся образуют и пишут реальные слова на сетках в стиле Boggle, анаграммах и колесах — активное извлечение, навык, который остается.'
      },
      {
        title: 'Дифференциация в одном классе',
        desc: 'Масштабирование CEFR A1–C2 позволяет новичкам и продвинутым читателям играть в одно и то же действие на нужном уровне.'
      },
      {
        title: 'Весь класс + 1v1',
        desc: 'Проведите живую классную игру на проекторе или сопоставьте учащихся лицом к лицу для быстрого конкурентного обзора.'
      },
      {
        title: 'Панель инструментов учителя',
        desc: 'Посмотрите точность на одного студента и слова, которые озадачили весь класс — мгновенные формирующие данные, без оценок.'
      },
    ],
    stepsTitle: 'От списка слов к живой игре в 3 шага',
    steps: [
      {
        t: 'Выберите список',
        d: 'Загрузите словарь вашего модуля или используйте встроенный список. Выберите режим и временное ограничение.'
      },
      {
        t: 'Проецируйте код',
        d: 'Студенты открывают ссылку и вводят 4-значный код присоединения. Нет учетных записей, любое устройство.'
      },
      {
        t: 'Играйте + просматривайте',
        d: 'Живая таблица лидеров во время игры; точность по студентам и пробелы в классе после.'
      },
    ],
    faqTitle: 'Часто задаваемые вопросы',
    faqs: [
      {
        q: 'Эти словарные игры действительно бесплатны для средней школы?',
        a: 'Да — LexiClash полностью бесплатен без премиум-уровня. Мультиплеер для целого класса, дуэли 1v1, пользовательские списки слов и панель инструментов учителя — все бесплатно, без ограничений на одного ученика или на класс, кроме 30 учащихся за живую игру.'
      },
      {
        q: 'Нужны ли учащимся средней школы учетные записи или входы?',
        a: 'Нет. Учащиеся присоединяются к классной игре с 4-значным кодом, который вы проецируете — без электронной почты, без регистрации, без реестра класса. Это устраняет наибольшее трение при настройке для классов 1:1 и BYOD.'
      },
      {
        q: 'Могу ли я использовать свои собственные словарные слова?',
        a: 'Да. Загрузите список слов вашего модуля или учебного плана менее чем за минуту и играйте его в играх для целого класса, дуэлях 1v1 или назначенной практике. Никаких ограничений на формат импорта.'
      },
      {
        q: 'Это хорошее соответствие для 6-го, 7-го и 8-го класса?',
        a: 'Средняя школа — это сладкое место. Сложность масштабируется CEFR (A1–C2), поэтому вы можете настроить её на уровень класса или бросить вызов продвинутым студентам, и геймплей образования слов награждает орфографию и извлечение из памяти, а не угадывание.'
      },
      {
        q: 'Это работает для ESL и новичков в средней школе?',
        a: 'Да — встроенные словари для английского, испанского, иврита (RTL), шведского, японского и русского языков позволяют вам проводить одно и то же занятие для учащихся ESL и двуязычных учащихся. Снижайте уровень сложности для новичков и повышайте его для учащихся на уровне класса одновременно.'
      },
      {
        q: 'Сколько времени занимает игра?',
        a: 'Типичный раунд занимает 5–10 минут — достаточно короткий для разминки, сигнала или обзора в конце класса, достаточно длинный, чтобы охватить полный список слов.'
      },
    ],
    moreTitle: 'Больше для учителей',
    moreCards: [
      { title: 'Словарные игры сигнала начала', sub: 'Открытие начала класса в 5 минут' },
      { title: 'Словарные игры ESL', sub: 'Масштабируется CEFR, 6 языков' },
      { title: 'Образовательный центр', sub: 'Все классные словарные игры' },
    ],
    finalTitle: 'Попробуйте перед следующим классом',
    finalBody:
      'Возьмите список словарного запаса этой недели, проецируйте код присоединения и смотрите, как весь класс конкурирует. Без регистрации, без кредитной карты, без перехвата электронной почты — если это не подходит, вы потеряли пять минут.',
    finalCta: 'Начать классную игру бесплатно',
  },
};

export function getMiddleSchoolContent(locale: string): LocaleContent {
  const validLocale = MIDDLE_SCHOOL_LOCALES.includes(locale as MiddleSchoolLocale) ? (locale as MiddleSchoolLocale) : 'en';
  return contentMap[validLocale];
}
