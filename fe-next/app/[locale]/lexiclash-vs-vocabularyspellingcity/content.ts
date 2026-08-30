// Native per-locale copy for the LexiClash vs VocabularySpellingCity comparison page.
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
  ctaSpelling: string;
  ctaDuels: string;
  compareTitle: string;
  compareFootnote: string;
  compareRows: ReadonlyArray<readonly [string, string, string]>;
  beatsTitle: string;
  beats: Array<{ title: string; desc: string }>;
  stillWinsTitle: string;
  stillWinsBody: string;
  faqTitle: string;
  faqs: Array<{ q: string; a: string }>;
  moreTitle: string;
  moreCards: Array<{ title: string; sub: string }>;
  finalTitle: string;
  finalBody: string;
  finalCta: string;
};

export const COMPARISON_LOCALES = ['en', 'he', 'sv', 'ja', 'es', 'ru'] as const;
export type ComparisonLocale = typeof COMPARISON_LOCALES[number];

const contentMap: Record<ComparisonLocale, LocaleContent> = {
  en: {
    metaTitle: 'LexiClash vs VocabularySpellingCity — Free Multiplayer Alternative (2026) | LexiClash',
    metaDescription:
      'LexiClash vs VocabularySpellingCity compared: live whole-class multiplayer word games vs individual spelling drills. No student login, free, 5 languages, custom word lists. The free SpellingCity alternative for spelling and vocabulary.',
    ogTitle: 'LexiClash vs VocabularySpellingCity — The Free Alternative',
    ogDescription:
      'Live multiplayer word games beat solo spelling drills for engagement. No login. 5 languages. Free forever.',
    twitterTitle: 'LexiClash vs SpellingCity — Free Alternative',
    twitterDescription: 'Multiplayer spelling + vocabulary games. No login. 5 languages. Free.',
    heroTitle: 'SpellingCity drills alone. LexiClash plays the whole class.',
    intro:
      'VocabularySpellingCity built a deep library of spelling and vocabulary games students work through one device at a time. It works — but it\'s a solo, log-in, mostly-Premium model. LexiClash takes the same custom word lists and turns them into live, no-login multiplayer: whole-class games and 1v1 duels on Boggle-style grids, anagrams, and wheels, free, in five languages. Practice the same words; replace solo drilling with competitive review.',
    ctaStart: 'Try LexiClash Free',
    ctaSpelling: 'Spelling Practice',
    ctaDuels: 'Vocabulary Duels',
    compareTitle: 'Side-by-side, no spin',
    compareFootnote:
      'VocabularySpellingCity tier features and pricing as of 2026 — check the vendor for current Premium plans.',
    compareRows: [
      ['Free tier (full features)', '✓ Everything free', '✗ Premium for most games'],
      ['No student login', '✓ 6-character join code', '✗ Student accounts'],
      ['Core format', 'Live multiplayer word games', 'Individual self-paced games'],
      ['Live whole-class multiplayer', '✓ Free, up to 30', '✗ Solo practice model'],
      ['1v1 duels with student pairing', '✓', '✗'],
      ['Spelling + vocabulary focus', '✓ Word game core', '✓ Spelling-first'],
      ['Custom curriculum word lists', '✓', '✓'],
      ['5 languages with native dictionaries', '✓ EN/HE/SV/JA/ES', 'English spelling-first'],
      ['Class analytics dashboard', '✓ Free', '✓ (Premium)'],
      ['Best grade band', 'Upper-elem → adult ESL', 'K-5 heavy'],
      ['Best for', 'Engaging review games', 'Individual spelling practice'],
      ['Setup time', 'Under 60 seconds', 'Build list + assign'],
    ] as const,
    beatsTitle: 'When LexiClash beats SpellingCity',
    beats: [
      {
        title: 'Whole-class engagement',
        desc: 'SpellingCity is individual practice. LexiClash is live multiplayer — the energy of the whole class playing the same word list at once.',
      },
      {
        title: 'No student logins',
        desc: 'A 6-character join code means no account provisioning. Every student plays in seconds, including those without rostered logins.',
      },
      {
        title: 'Free, full features',
        desc: 'Most SpellingCity games sit behind Premium. LexiClash classroom features are free, up to 30 students, no upsell.',
      },
      {
        title: '1v1 duels',
        desc: 'Pair students head-to-head on your word list for a fast, competitive review format SpellingCity does not offer.',
      },
      {
        title: 'Spans older + ESL learners',
        desc: 'CEFR A1–C2 dictionaries fit middle school and adult ESL, not just K-5 spelling.',
      },
      {
        title: '5 native-dictionary languages',
        desc: 'EN/HE/ES/SV/JA word validation for bilingual and language programs. SpellingCity is English-spelling-first.',
      },
    ],
    stillWinsTitle: 'When SpellingCity still wins',
    stillWinsBody:
      'If you teach early elementary and need structured, self-paced spelling and sight-word practice with audio of each word read aloud, VocabularySpellingCity\'s K-5 library and per-student recordkeeping are purpose-built for that. LexiClash is stronger for upper-elementary through adult ESL and for live, whole-class review. Many teachers assign SpellingCity for individual practice and run LexiClash for the in-class review game.',
    faqTitle: 'Frequently asked questions',
    faqs: [
      {
        q: 'Is LexiClash a free alternative to VocabularySpellingCity?',
        a: 'Yes — LexiClash is fully free with no premium tier. VocabularySpellingCity (part of the Learning A-Z / Vocabulary A-Z family) has a free tier but locks most games, recordkeeping, and class management behind a paid Premium membership. LexiClash never gates classroom features.',
      },
      {
        q: 'What is the main difference?',
        a: 'VocabularySpellingCity is built around individual, self-paced spelling and vocabulary games students rotate through on their own devices. LexiClash is live and social — whole-class multiplayer and 1v1 duels on Boggle-style grids, anagrams, and word wheels. Same spelling/vocabulary goal, but engagement comes from real-time competition rather than solo practice.',
      },
      {
        q: 'Do students need logins on LexiClash?',
        a: 'No. Students join with a 6-character code shown by the teacher — no individual accounts. SpellingCity students typically log into assigned accounts to track their practice.',
      },
      {
        q: 'Can I use my own spelling lists?',
        a: 'Yes on both. LexiClash teachers upload custom word lists from any unit and play them in duels, whole-class games, or practice. SpellingCity is also built around custom lists — the difference is multiplayer and zero login on LexiClash.',
      },
      {
        q: 'Is LexiClash only for older students?',
        a: 'LexiClash is strongest for upper-elementary through adult ESL — its CEFR-scaled dictionaries (A1–C2) span beginner to advanced. SpellingCity skews K-5. For early elementary sight-word drilling, SpellingCity may fit better; for middle school, ESL, and review games, LexiClash fits better.',
      },
      {
        q: 'Does LexiClash support other languages?',
        a: 'Yes — native dictionaries for English, Hebrew (RTL), Spanish, Swedish, and Japanese. SpellingCity is English-spelling focused.',
      },
    ],
    moreTitle: 'More comparisons',
    moreCards: [
      { title: 'LexiClash vs Quizlet', sub: 'Word games vs flashcards. Free.' },
      { title: 'LexiClash vs Flocabulary', sub: 'Play words vs watch videos' },
      { title: 'Education Hub', sub: 'All classroom word games' },
    ],
    finalTitle: 'Try it before next class',
    finalBody:
      'Upload this week\'s spelling list, project the join code, and let the whole class play it at once. No logins to provision, no Premium upsell, no credit card — five minutes to see if live beats solo for your students.',
    finalCta: 'Start a Classroom Game Free',
  },
  he: {
    metaTitle: 'LexiClash מול VocabularySpellingCity — חלופה ללא תשלום מרובה שחקנים (2026) | LexiClash',
    metaDescription:
      'השוואה בין LexiClash ו-VocabularySpellingCity: משחקי מילים בחיים ולכל הכיתה מול תרגול כתיב אישי. ללא התחברות תלמיד, בחינם, 5 שפות, רשימות מילים מותאמות. החלופה החינמית של SpellingCity לכתיב ולאוצר מילים.',
    ogTitle: 'LexiClash מול VocabularySpellingCity — החלופה החינמית',
    ogDescription:
      'משחקי מילים בחיים מרובי שחקנים עוקפים תרגול כתיב בודד בהתאמה. ללא התחברות. 5 שפות. בחינם לנצח.',
    twitterTitle: 'LexiClash מול SpellingCity — חלופה חינמית',
    twitterDescription: 'משחקי כתיב + אוצר מילים מרובי שחקנים. ללא התחברות. 5 שפות. בחינם.',
    heroTitle: 'SpellingCity תורגל לבד. LexiClash משחק כל כיתה.',
    intro:
      'VocabularySpellingCity בנתה ספריה עמוקה של משחקי כתיב ואוצר מילים שתלמידים עובדים דרכם הכשב אחד. זה עובד — אבל זה מודל בודד, כניסה לחשבון, בעיקר Premium. LexiClash לוקח את אותן רשימות מילים מותאמות והופכן למשחקי מרובי שחקנים בחיים ללא התחברות: משחקי כיתה שלמה ודו-קרבות 1v1 בגרידים דמויי Boggle, אנגרמות וגלגלים, בחינם, ב-5 שפות. תרגול של אותן מילים; החליפו תרגול בודד בביקורת תחרותית.',
    ctaStart: 'נסו את LexiClash בחינם',
    ctaSpelling: 'תרגול כתיב',
    ctaDuels: 'דו-קרבות אוצר מילים',
    compareTitle: 'זה לצד זה, ללא הטיה',
    compareFootnote:
      'תכונות רמה וקביעת מחיר של VocabularySpellingCity עד 2026 — בדוקו אצל הספק לתוכניות Premium נוכחיות.',
    compareRows: [
      ['רמה חינמית (כל התכונות)', '✓ הכל בחינם', '✗ Premium לרוב המשחקים'],
      ['ללא התחברות תלמיד', '✓ קוד הצטרפות ל-6 תווים', '✗ חשבונות תלמידים'],
      ['פורמט ליבה', 'משחקי מילים בחיים מרובי שחקנים', 'משחקים אישיים בקצב עצמי'],
      ['מרובה שחקנים בחיים לכל הכיתה', '✓ בחינם, עד 30', '✗ מודל תרגול בודד'],
      ['דו-קרבות 1v1 עם זיווג תלמידים', '✓', '✗'],
      ['מיקוד כתיב + אוצר מילים', '✓ ליבת משחק מילים', '✓ כתיב ראשון'],
      ['רשימות מילים של תכנית לימודים מותאמות', '✓', '✓'],
      ['5 שפות עם מילונים מקוריים', '✓ EN/HE/SV/JA/ES', 'כתיב אנגלית ראשון'],
      ['לוח מחוונים של ניתוח כיתה', '✓ בחינם', '✓ (Premium)'],
      ['רצועת כיתה הטובה ביותר', 'חטיבה עליונה → ESL למבוגרים', 'כיתות א-ה כבדות'],
      ['הטוב ביותר עבור', 'משחקי ביקורת משכנעים', 'תרגול כתיב אישי'],
      ['זמן הגדרה', 'פחות מ-60 שניות', 'בנייה + הקצאה'],
    ] as const,
    beatsTitle: 'כאשר LexiClash מנצח את SpellingCity',
    beats: [
      {
        title: 'הישתתפות כיתה שלמה',
        desc: 'SpellingCity הוא תרגול אישי. LexiClash הוא מרובה שחקנים בחיים — האנרגיה של כל הכיתה משחקת את אותה רשימת מילים בו-זמנית.',
      },
      {
        title: 'ללא התחברות תלמיד',
        desc: 'קוד הצטרפות ל-6 תווים פירושו ללא הספקת חשבון. כל תלמיד משחק תוך שניות, כולל אלה ללא התחברות רשומה.',
      },
      {
        title: 'בחינם, כל התכונות',
        desc: 'רוב משחקי SpellingCity יושבים מאחורי Premium. תכונות כיתה של LexiClash בחינם, עד 30 תלמידים, ללא מכירה נוספת.',
      },
      {
        title: 'דו-קרבות 1v1',
        desc: 'שימו תלמידים זה מול זה על רשימת המילים שלכם לפורמט ביקורת מהיר ותחרותי ש-SpellingCity לא מציע.',
      },
      {
        title: 'מכסה תלמידים מבוגרים יותר + ESL',
        desc: 'מילונים מסולמי CEFR A1–C2 משתלבים בחטיבה ו-ESL למבוגרים, לא רק כתיב כיתות ייסוד.',
      },
      {
        title: '5 שפות עם מילונים מקוריים',
        desc: 'אימות מילים EN/HE/ES/SV/JA לתוכניות דו-לשוניות ותוכניות שפה. SpellingCity הוא כתיב אנגלית ראשון.',
      },
    ],
    stillWinsTitle: 'כאשר SpellingCity עדיין מנצח',
    stillWinsBody:
      'אם אתה מלמד חטיבה יסודית מוקדמת וצריך תרגול כתיב וביקורת במילות ראייה מובנה, בקצב עצמי, עם אודיו של כל מילה נקראת בקול רם, ספריית כיתות ייסוד של VocabularySpellingCity וניהול רשומות לכל תלמיד בנויים לכך. LexiClash חזק יותר לחטיבה עליונה עד ESL למבוגרים ולביקורת כיתה שלמה בחיים. מורים רבים משייכים SpellingCity לתרגול אישי ומנהלים LexiClash למשחק ביקורת בכיתה.',
    faqTitle: 'שאלות נפוצות',
    faqs: [
      {
        q: 'האם LexiClash היא חלופה חינמית ל-VocabularySpellingCity?',
        a: 'כן — LexiClash בחינם לחלוטין ללא רמה Premium. VocabularySpellingCity (חלק מ-Learning A-Z / Vocabulary A-Z) יש רמה חינמית אבל נועלת רוב המשחקים, ניהול רשומות וניהול כיתה מאחורי חברות Premium בתשלום. LexiClash לעולם לא נועלת תכונות כיתה.',
      },
      {
        q: 'מה ההבדל העיקרי?',
        a: 'VocabularySpellingCity בנויה סביב משחקי כתיב ואוצר מילים אישיים בקצב עצמי שתלמידים מסתובבים דרכם במכשיריהם. LexiClash בחיים ותחברתית — מרובה שחקנים בכיתה שלמה ודו-קרבות 1v1 בגרידים דמויי Boggle, אנגרמות וגלגלי מילים. אותה מטרה כתיב/אוצר מילים, אבל ההשתתפות מגיעה מתחרות בזמן אמת במקום תרגול בודד.',
      },
      {
        q: 'האם תלמידים צריכים התחברות ב-LexiClash?',
        a: 'לא. תלמידים מצטרפים עם קוד ל-6 תווים המוצג על ידי המורה — ללא חשבונות אישיים. תלמידי SpellingCity בדרך כלל מתחברים לחשבונות מוקצים לתחקור התרגול שלהם.',
      },
      {
        q: 'האם אוכל להשתמש ברשימות הכתיב שלי?',
        a: 'כן בשניהם. מורים LexiClash מעלים רשימות מילים מותאמות מכל יחידה ומשחקים אותן בדו-קרבות, משחקי כיתה שלמה או תרגול. SpellingCity גם בנויה סביב רשימות מותאמות — ההבדל הוא מרובה שחקנים והתחברות אפס ב-LexiClash.',
      },
      {
        q: 'האם LexiClash רק לתלמידים מבוגרים יותר?',
        a: 'LexiClash חזקה ביותר לחטיבה עליונה עד ESL למבוגרים — המילונים המסולמים שלה (A1–C2) משתרעים מתחילים לגבוה. SpellingCity סוטה לכיתות ייסוד. לתרגול במילות ראייה מוקדם, SpellingCity עשויה להתאים טוב יותר; לחטיבה, ESL ומשחקי ביקורת, LexiClash מתאימה יותר.',
      },
      {
        q: 'האם LexiClash תומכת בשפות אחרות?',
        a: 'כן — מילונים מקוריים לאנגלית, עברית (RTL), ספרדית, שוודית ויפנית. SpellingCity היא כתיב אנגלית מיוחדת.',
      },
    ],
    moreTitle: 'עוד השוואות',
    moreCards: [
      { title: 'LexiClash מול Quizlet', sub: 'משחקי מילים מול כרטיסי פלאש. בחינם.' },
      { title: 'LexiClash מול Flocabulary', sub: 'נגן מילים מול צפיה בסרטונים' },
      { title: 'מרכז חינוך', sub: 'כל משחקי מילים בכיתה' },
    ],
    finalTitle: 'נסו זאת לפני השיעור הבא',
    finalBody:
      'העלו את רשימת הכתיב של השבוע הזה, הקרינו את קוד ההצטרפות, והשאירו את כל הכיתה למשחק בבת אחת. ללא התחברויות לספקו, ללא מכירה Premium, ללא כרטיס אשראי — חמש דקות כדי לראות אם ישיר מנצח בודד לתלמידים שלכם.',
    finalCta: 'התחל משחק כיתה בחינם',
  },
  sv: {
    metaTitle: 'LexiClash vs VocabularySpellingCity — Gratis multiplayer-alternativ (2026) | LexiClash',
    metaDescription:
      'LexiClash vs VocabularySpellingCity jamfort: live multiplayer-ordspel for hela klassen mot individuell stavningstraning. Ingen elevloggning, gratis, 5 sprak, anpassade ordlistor. Det kostnadsfria SpellingCity-alternativet for stavning och ordforrad.',
    ogTitle: 'LexiClash vs VocabularySpellingCity — Det kostnadsfria alternativet',
    ogDescription:
      'Live multiplayer-ordspel slar solo-stavningsovningar nar det galler engagemang. Ingen inloggning. 5 sprak. For alltid gratis.',
    twitterTitle: 'LexiClash vs SpellingCity — Gratis alternativ',
    twitterDescription: 'Multiplayer stavning + ordforradordspel. Ingen inloggning. 5 sprak. Gratis.',
    heroTitle: 'SpellingCity ovar ensamt. LexiClash spelar hela klassen.',
    intro:
      'VocabularySpellingCity byggde ett omfattande bibliotek med stavnings- och ordforradsordspel som eleverna arbetar genom ett och ett pa sina enheter. Det fungerar — men det ar en solo-, inloggnings-, mestadels Premium-modell. LexiClash tar samma anpassade ordlistor och forvandlar dem till live, ingen-inloggning multiplayer: helklassspel och 1v1-dueller pa Boggle-liknande rutnät, anagram och hjul, gratis, pa fem sprak. Trana samma ord; ersätt solo-traning med konkurrenskraftig repetition.',
    ctaStart: 'Prova LexiClash gratis',
    ctaSpelling: 'Stavningstraning',
    ctaDuels: 'Ordforraadsdueller',
    compareTitle: 'Sida vid sida, ingen spin',
    compareFootnote:
      'VocabularySpellingCity nivaafunktioner och prisstättning fran 2026 — kontrollera leverantoren for aktuella Premium-planer.',
    compareRows: [
      ['Gratis niva (alla funktioner)', '✓ Allt gratis', '✗ Premium for de flesta spel'],
      ['Ingen elevloggning', '✓ Anslutningskod på sex tecken', '✗ Elevkonton'],
      ['Kärnformat', 'Live multiplayer-ordspel', 'Individuella självstudier'],
      ['Live helklassmultiplayer', '✓ Gratis, upp till 30', '✗ Solo-övningsmodell'],
      ['1v1-dueller med elevparning', '✓', '✗'],
      ['Stavnings- + ordförrådfokus', '✓ Ordspelskärna', '✓ Stavnings-först'],
      ['Anpassade curriculumordlistor', '✓', '✓'],
      ['5 sprak med infödda ordlistor', '✓ EN/HE/SV/JA/ES', 'Engelsk stavning-först'],
      ['Klassanalytikdashboard', '✓ Gratis', '✓ (Premium)'],
      ['Bästa årskurs', 'Mellanstadiet → vuxen-ESL', 'Mellanstadiet tung'],
      ['Bäst för', 'Engagerande återhopp', 'Individuell stavningstraning'],
      ['Starttid', 'Under 60 sekunder', 'Bygg lista + tilldela'],
    ] as const,
    beatsTitle: 'Nar LexiClash slar SpellingCity',
    beats: [
      {
        title: 'Helklassengagemang',
        desc: 'SpellingCity är individuell traning. LexiClash är live multiplayer — energin fran hela klassen som spelar samma ordlista pa en gang.',
      },
      {
        title: 'Ingen elevloggning',
        desc: 'En anslutningskod på sex tecken betyder ingen kontoprovisioning. Varje elev spelar pa sekunder, inklusive de utan rostered loggning.',
      },
      {
        title: 'Gratis, alla funktioner',
        desc: 'De flesta SpellingCity-spel ligger bakom Premium. LexiClash klassrumsfunktioner är gratis, upp till 30 elever, ingen uppgradering.',
      },
      {
        title: '1v1-dueller',
        desc: 'Para ihop elever sinsemellan pa din ordlista for ett snabbt, konkurrenskraftigt repetitionsformat som SpellingCity inte erbjuder.',
      },
      {
        title: 'Omfattar äldre + ESL-elever',
        desc: 'CEFR A1–C2-ordlistor passar mellanstadiet och vuxen-ESL, inte bara mellanstadiet stavning.',
      },
      {
        title: '5 infödda-ordlistassprak',
        desc: 'EN/HE/ES/SV/JA ordvalidering for tvasprakiga och sprakprogram. SpellingCity är engelsk stavning-först.',
      },
    ],
    stillWinsTitle: 'Nar SpellingCity fortfarande vinner',
    stillWinsBody:
      'Om du undervisar tidiga mellanstadieelever och behover strukturerad, självstuderad stavnings- och blickordtraning med ljud fran varje ord last hogt, är VocabularySpellingCity\'s mellanstadiebibliotek och per-elevstatistik byggt for det. LexiClash är starkare for mellanstadiet genom vuxen-ESL och for live, helklassrepetition. Manga larare tilldelar SpellingCity for individuell traning och kor LexiClash for klassrummets repetitionsspel.',
    faqTitle: 'Vanliga fragor',
    faqs: [
      {
        q: 'Är LexiClash ett kostnadsfritt alternativ till VocabularySpellingCity?',
        a: 'Ja — LexiClash är helt gratis utan premiumniva. VocabularySpellingCity (del av Learning A-Z / Vocabulary A-Z-familjen) har en gratis niva men låser de flesta spel, statistik och klasshantering bakom ett betalt Premium-medlemskap. LexiClash låser aldrig klassrumsfunktioner.',
      },
      {
        q: 'Vad är huvudskillnaden?',
        a: 'VocabularySpellingCity är byggt runt individuella, självstuderade stavnings- och ordforraadsordspel som eleverna arbetar genom pa sina enheter. LexiClash är live och socialt — helklassmultiplayer och 1v1-dueller pa Boggle-liknande rutnät, anagram och ordhjul. Samma stavnings-/ordforraadsmal, men engagemang kommer fran realtidskompetition snarare än solo-traning.',
      },
      {
        q: 'Behover elever loggning pa LexiClash?',
        a: 'Nej. Elever ansluter med en kod på sex tecken som visas av lararen — inga individuella konton. SpellingCity-elever loggar vanligtvis in pa tilldelade konton for att spara sin traning.',
      },
      {
        q: 'Kan jag anvanda mina egna stavningslistor?',
        a: 'Ja pa båda. LexiClash-larare laddar upp anpassade ordlistor fran vilken enhet som helst och spelar dem i dueller, helklassspel eller traning. SpellingCity är också byggt runt anpassade listor — skillnaden är multiplayer och noll inloggning pa LexiClash.',
      },
      {
        q: 'Är LexiClash bara for äldre elever?',
        a: 'LexiClash är starkast for mellanstadiet genom vuxen-ESL — dess CEFR-skalerade ordlistor (A1–C2) stracker sig fran nybörjare till avancerad. SpellingCity lutar mot mellanstadiet. For tidigt mellanstadiestavningstraning kan SpellingCity passa bättre; for mellanstadiet, ESL och repetitionsspel passar LexiClash bättre.',
      },
      {
        q: 'Stoder LexiClash andra sprak?',
        a: 'Ja — infödda ordlistor for engelska, hebreiska (RTL), spanska, svenska och japanska. SpellingCity är engelsk stavning-fokuserad.',
      },
    ],
    moreTitle: 'Fler jamforelser',
    moreCards: [
      { title: 'LexiClash vs Quizlet', sub: 'Ordspel vs laroeflashcards. Gratis.' },
      { title: 'LexiClash vs Flocabulary', sub: 'Spela ord vs titta pa videor' },
      { title: 'Utbildningshubben', sub: 'Alla klassrumordspel' },
    ],
    finalTitle: 'Prova det fore nästa lektion',
    finalBody:
      'Ladda upp denna veckas stavningslista, projicera anslutningskoden och lat hela klassen spela pa en gang. Ingen loggning att tillhandahala, ingen Premium-uppgradering, inget kreditkort — fem minuter for att se om live slar solo for dina elever.',
    finalCta: 'Starta ett klassrumsspel gratis',
  },
  ja: {
    metaTitle: 'LexiClash vs VocabularySpellingCity — muryou maruchipurei daieteinan (2026nen) | LexiClash',
    metaDescription:
      'LexiClash vs VocabularySpellingCity hikaku: raibu zenukurasu maruchipurei tanngogemu vs kobetsu supeingu renshuu. gakusei roguin fujuyo, muryou, 5gengo, kasutamu tanngoriisuto. supeingu tanngogemu gakushuu muke no muryou SpellingCity daieteinan.',
    ogTitle: 'LexiClash vs VocabularySpellingCity — muryou daieteinan',
    ogDescription:
      'raibu maruchipurei tanngogemu wa, engejimento ni kanshite wa, soro supeingu renshuu wo ututimasu. roguin fujuyo. 5gengo. eien ni muryou.',
    twitterTitle: 'LexiClash vs SpellingCity — muryou daieteinan',
    twitterDescription: 'maruchipurei supeingu + gochuubuiryoku tanngogemu. roguin fujuyo. 5gengo. muryou.',
    heroTitle: 'SpellingCity wa tandoku de renshuu shimasu. LexiClash wa kurasu zenkaisi de purei shimasu.',
    intro:
      'VocabularySpellingCity wa, gakusei ga jibun no debaisu de hitori zutsu susumeru, supeingu tanngogemu to gochuubuiryoku gemu no fukai raiburari wo kouchiku shimashita. sore wa kinoo shimasu — shikashi, sore wa tandoku de, roguin, hotondo puremiamu moderu desu. LexiClash wa onaji kasutamu tanngoriisuto wo shutoku shi, sore wo raibu, nan-roguin maruchipurei ni henkan shimasu: zenukurasu gemu to 1tai1 dyueru, Boggle sutairu guriddo, anaguramu, oyobi 5tsu no gengo de jiyuu no kuruuma ni tsuite. onaji tanngoto renshuu shimasu; tandoku doriru wo kyousougekiteki rebyu ni okikae shimasu.',
    ctaStart: 'LexiClash muryou de tameshite mite kudasai',
    ctaSpelling: 'supeingu renshuu',
    ctaDuels: 'gochuubuiryoku dyueru',
    compareTitle: 'narande, suppin nashi',
    compareFootnote:
      '2026nen no jiten de no VocabularySpellingCity tiashuukino to nedan setei — genzai no puremiamu puran ni tsuite wa, bendaa wo gokakurenin kudasai.',
    compareRows: [
      ['muryou tiashu (subete no kinoo)', 'subete muryou', 'hotondo no gemu ni taisuru puremiamu'],
      ['gakusei roguin fujuyo', '4keta sanka kodo', 'gakusei akkaunto'],
      ['koa format', 'raibu maruchipurei tanngogemu', 'kobetsu no serepesu gemu'],
      ['raibu zenukurasu maruchipurei', 'muryou, saidai 30', 'soro purakutisu moderu'],
      ['gakusei pairingu zuki 1tai1 dyueru', 'ok', 'x'],
      ['supeingu + gochuubuiryoku fokarasu', 'tanngogemu koa', 'supeingu daiyon'],
      ['kasutamu karikyuramu tanngoriisuto', 'ok', 'ok'],
      ['neitibu jisho zuki 5 gengo', 'en/he/sv/ja/es', 'eigo supeingu daiyon'],
      ['kurasu bunseki dashubodo', 'muryou', 'puremiamu'],
      ['saidai gakugari', 'ueyoushougaku - seijin esl', 'shougaku chuushin'],
      ['saidai', 'engejingu rebyu gemu', 'kobetsu supeingu renshuu'],
      ['setei jikan', '60byou ika', 'riisuto kasetsuritsu + wariate'],
    ] as const,
    beatsTitle: 'LexiClash ga SpellingCity wo tatsu baai',
    beats: [
      {
        title: 'Zenukurasu engejimento',
        desc: 'SpellingCity wa kobetsu no purakutisu desu. LexiClash wa raibu maruchipurei — onaji tanngoriisuto wo ichido ni suru kurasu zenkaisi no enerugii.',
      },
      {
        title: 'Gakusei roguin fujuyo',
        desc: '4keta no sanka kodo wa, akkaunto kyokyu ga fujuyo desu. subete no gakusei wa suurisukan de purei dekimasu, rosutado roguin no nai gakusei mo fukumarete imasu.',
      },
      {
        title: 'Muryou, subete no kinoo',
        desc: 'hotondo no SpellingCity gemu wa puremiamu no ushiro ni arimasu. LexiClash kurasu kinoo wa muryou, saidai 30 jinno gakusei, baikyaku nashi.',
      },
      {
        title: '1tai1 dyueru',
        desc: 'gakusei wo tanngoriisuto de 1tai1 de pea ringu shite, SpellingCity ga teikyo shinai hayai, kyousouryokuteki na rebyu format wo teikyo shimasu.',
      },
      {
        title: 'Toshin + esl gakushachasain o soumatomeru',
        desc: 'cefr a1 - c2 jisho wa chuugakkoutou to seijin esl ni tekigou suru, shougaku supeingu dake de wa arimasen.',
      },
      {
        title: '5 neitibu jisho gengo',
        desc: 'en/he/es/sv/ja tanngoshoumei nisoku gengo puroguramu no tame. SpellingCity wa eigo supeingu daiyon desu.',
      },
    ],
    stillWinsTitle: 'SpellingCity ga mada katsu baai',
    stillWinsBody:
      'Shoki no shougaku o oshiete ite, kouzoukaiserarета, jisoku no supeingu to genten no tango renshuu audio ga hitsuyouna baai, VocabularySpellingCity\'s shougaku raiburari to gakusei goto no kirokugaeri wa sono tame ni kasetsuritsuされ te imasu. LexiClash wa toshin shougaku kara seijin esl made oyobi raibu, zenukurasu shousai no hou ga tsuyoi desu. takusan no kyoushi wa kobetsu purakutisu no tame ni SpellingCity o wariate shi, kurashitsu rebyu gemu no tame ni LexiClash o jikkou shimasu.',
    faqTitle: 'yoku aru shitumon',
    faqs: [
      {
        q: 'LexiClash wa VocabularySpellingCity no muryou daieteinan desu ka?',
        a: 'hai — LexiClash wa puremiamu so nashi de kanzen ni muryou desu. VocabularySpellingCity (learning a-z / vocabulary a-z famiri no ichibu) wa muryou so ga arimasu ga, hotondo no gemu, kirokugaeri, kurasu kanri wo shibarou puremiamu menbashippunosirona de rokku shimasu. LexiClash wa kurasu kinoo wo rokku shimasen.',
      },
      {
        q: 'shuyounacha wa nani desu ka?',
        a: 'VocabularySpellingCity wa, gakusei ga jibun no debaisu de kaiten suru kobetsu no jisoku supeingu oyobi gochuubuiryoku gemu no mawari ni kouchiku sarete imasu. LexiClash wa raibu de sousharu desu — zenukurasu maruchipurei oyobi 1tai1 dyueru boggle sutairu guriddo, anaguramu, oyobi tanngosharin de. onaji supeingu / gochuubuiryoku mokuteki desu ga, engejimento wa jisoku purakutisu de wa naku rearyutaimukompetisyon kara kimasu.',
      },
      {
        q: 'LexiClash de gakusei wa roguin ga hitsuyou desu ka?',
        a: 'iie. gakusei wa kyoushi ga shimeshita 4keta no kodo de sanka shimasu — akkaunto nashi. SpellingCity gakusei wa tutayou wariate akkaunto ni roguin shimasu.',
      },
      {
        q: 'jibun no supeingu riisuto o tsukau koto ga dekimasu ka?',
        a: 'hai tsuyoi. LexiClash kyoushi wa dotoshit tasu kara kasutamu tanngoriisuto o apu robado shi, dyueru, zenukurasu gemu, oyobi purakutisu de saiseigen shimasu. SpellingCity wa kasutamu riisuto no mawari ni mo kouchiku sarete imasu — sa wa maruchipurei to zero roguin desu.',
      },
      {
        q: 'LexiClash wa toshin gakusei dake no tame desu ka?',
        a: 'LexiClash wa toshin shougaku kara seijin esl made saikou desu — sono cefr sukeru jisho (a1 - c2) wa shosinsha kara joushou made no han i desu. spellingcity wa shougaku skyu shimasu. shoki no shougaku genten no tango doriru no tame ni, spellingcity ga yori yoku tekigou suru kamo shiremaseN; chuugakkoutou, esl, oyobi rebyu gemu, lexiclash wa yori yoku tekigou shimasu.',
      },
      {
        q: 'LexiClash wa ta no gengo o sapoto shimasu ka?',
        a: 'hai — eigo, heburugo (rtl), supeingo, suweeden, oyobi nihongo no neitibu jisho. spellingcity wa eigo supeingu fokarasu desu.',
      },
    ],
    moreTitle: 'mora kurabeteka',
    moreCards: [
      { title: 'LexiClash vs Quizlet', sub: 'furashukado vs tanngogemu. muryou.' },
      { title: 'LexiClash vs Flocabulary', sub: 'bideo o mite purei tanngogo' },
      { title: 'kyouikutanto', sub: 'kurashitsu tanngogemu subete' },
    ],
    finalTitle: 'tsugi no kurasu mae ni tameshite mite kudasai',
    finalBody:
      'kono shuukan no supeingu riisuto o apu robado shi, sanka kodo o tousui shi, kurasu zenkaisi ga ichido ni purei deki masu. sokoku suru roguin nashi, puremiamu baikyaku nashi, kureditokado nashi — raibu ga tannsoku no gakusei no tame ni uchikateiru ka douka kakunin suru tame no go fun.',
    finalCta: 'kurasu roomugemu o muryou de kaishi shimasu',
  },
  es: {
    metaTitle: 'LexiClash vs VocabularySpellingCity — Alternativa gratuita multijugador (2026) | LexiClash',
    metaDescription:
      'LexiClash vs VocabularySpellingCity comparacion: juegos de palabras multijugador en vivo de toda la clase versus ejercicios de ortografia individual. Sin inicio de sesion de estudiante, gratis, 5 idiomas, listas de palabras personalizadas. La alternativa gratuita de SpellingCity para ortografia y vocabulario.',
    ogTitle: 'LexiClash vs VocabularySpellingCity — La alternativa gratuita',
    ogDescription:
      'Los juegos de palabras multijugador en vivo vencen los ejercicios de ortografia en solitario para el compromiso. Sin inicio de sesion. 5 idiomas. Gratis por siempre.',
    twitterTitle: 'LexiClash vs SpellingCity — Alternativa gratuita',
    twitterDescription: 'Juegos de ortografia + vocabulario multijugador. Sin inicio de sesion. 5 idiomas. Gratis.',
    heroTitle: 'SpellingCity practica solo. LexiClash juega toda la clase.',
    intro:
      'VocabularySpellingCity construyo una biblioteca profunda de juegos de ortografia y vocabulario por los que los estudiantes trabajan de uno en uno en sus dispositivos. Funciona — pero es un modelo solo, inicio de sesion, principalmente Premium. LexiClash toma las mismas listas de palabras personalizadas y las convierte en multijugador en vivo, sin inicio de sesion: juegos de clase completa y duelos 1v1 en cuadriculas de estilo Boggle, anagramas y ruedas, gratis, en cinco idiomas. Practica las mismas palabras; reemplaza la practica solo con revision competitiva.',
    ctaStart: 'Prueba LexiClash gratis',
    ctaSpelling: 'Practica de ortografia',
    ctaDuels: 'Duelos de vocabulario',
    compareTitle: 'Lado a lado, sin sesgo',
    compareFootnote:
      'Caracteristicas de nivel de VocabularySpellingCity y precios a partir de 2026 — verifique con el proveedor los planes Premium actuales.',
    compareRows: [
      ['Nivel gratuito (todas las caracteristicas)', 'Todo gratis', 'Premium para la mayoria de juegos'],
      ['Sin inicio de sesion de estudiante', 'Codigo de union de 6-characteros', 'Cuentas de estudiante'],
      ['Formato central', 'Juegos de palabras multijugador en vivo', 'Juegos individuales a su propio ritmo'],
      ['Multijugador de clase completa en vivo', 'Gratis, hasta 30', 'Modelo de practica solo'],
      ['Duelos 1v1 con emparejamiento de estudiantes', 'ok', 'x'],
      ['Foco de ortografia + vocabulario', 'Nucleo de juego de palabras', 'Ortografia primero'],
      ['Listas de palabras curriculares personalizadas', 'ok', 'ok'],
      ['5 idiomas con diccionarios nativos', 'EN/HE/SV/JA/ES', 'Ortografia inglesa primero'],
      ['Panel de analisis de clase', 'Gratis', 'Premium'],
      ['Mejor banda de grado', 'Primaria superior → ESL adulto', 'Primaria pesada'],
      ['Mejor para', 'Juegos de revision atractivos', 'Practica de ortografia individual'],
      ['Tiempo de instalacion', 'Menos de 60 segundos', 'Generar lista + asignar'],
    ] as const,
    beatsTitle: 'Cuando LexiClash vence a SpellingCity',
    beats: [
      {
        title: 'Participacion de toda la clase',
        desc: 'SpellingCity es practica individual. LexiClash es multijugador en vivo — la energia de toda la clase jugando la misma lista de palabras a la vez.',
      },
      {
        title: 'Sin inicio de sesion de estudiante',
        desc: 'Un codigo de union de 6-characteros significa sin aprovisionamiento de cuentas. Todos los estudiantes juegan en segundos, incluidos los sin inicios de sesion registrados.',
      },
      {
        title: 'Gratis, todas las caracteristicas',
        desc: 'La mayoria de los juegos de SpellingCity estan detras de Premium. Las caracteristicas del aula de LexiClash son gratuitas, hasta 30 estudiantes, sin venta adicional.',
      },
      {
        title: 'Duelos 1v1',
        desc: 'Empareja estudiantes entre si en tu lista de palabras para un formato de revision rapido y competitivo que SpellingCity no ofrece.',
      },
      {
        title: 'Abarca estudiantes mayores + ESL',
        desc: 'Los diccionarios escalados por MCER A1–C2 se ajustan a la escuela secundaria y ESL adulto, no solo a la ortografia de primaria.',
      },
      {
        title: '5 idiomas con diccionarios nativos',
        desc: 'Validacion de palabras EN/HE/ES/SV/JA para programas bilingues y de idiomas. SpellingCity es ortografia inglesa primero.',
      },
    ],
    stillWinsTitle: 'Cuando SpellingCity aun gana',
    stillWinsBody:
      'Si ensena primaria temprana y necesita practica de ortografia y palabras de vista estructurada, a su propio ritmo, con audio de cada palabra leida en voz alta, la biblioteca de primaria de VocabularySpellingCity y el mantenimiento de registros por estudiante estan construidos para eso. LexiClash es mas fuerte para primaria superior a traves de ESL adulto y para revision de clase completa en vivo. Muchos maestros asignan SpellingCity para practica individual y ejecutan LexiClash para el juego de revision en clase.',
    faqTitle: 'Preguntas frecuentes',
    faqs: [
      {
        q: 'Zs LexiClash una alternativa gratuita a VocabularySpellingCity?',
        a: 'Si — LexiClash es completamente gratuito sin nivel premium. VocabularySpellingCity (parte de la familia Learning A-Z / Vocabulary A-Z) tiene un nivel gratuito pero bloquea la mayoria de juegos, mantenimiento de registros y gestion de clases detras de una membresia Premium paga. LexiClash nunca bloquea las caracteristicas del aula.',
      },
      {
        q: 'Cual es la principal diferencia?',
        a: 'VocabularySpellingCity esta construido en torno a juegos de ortografia y vocabulario individuales, a su propio ritmo, que los estudiantes trabajan en sus dispositivos. LexiClash es en vivo y social — multijugador de clase completa y duelos 1v1 en cuadriculas de estilo Boggle, anagramas y ruedas de palabras. El mismo objetivo de ortografia/vocabulario, pero el compromiso viene de la competencia en tiempo real en lugar de la practica solo.',
      },
      {
        q: 'Los estudiantes necesitan inicios de sesion en LexiClash?',
        a: 'No. Los estudiantes se unen con un codigo de 6-characteros mostrado por el maestro — sin cuentas individuales. Los estudiantes de SpellingCity generalmente inician sesion en cuentas asignadas para rastrear su practica.',
      },
      {
        q: 'Puedo usar mis propias listas de ortografia?',
        a: 'Si en ambos. Los maestros de LexiClash cargan listas de palabras personalizadas de cualquier unidad y las juegan en duelos, juegos de clase completa o practica. SpellingCity tambien se construye alrededor de listas personalizadas — la diferencia es multijugador e inicio de sesion cero en LexiClash.',
      },
      {
        q: 'ZEs LexiClash solo para estudiantes mayores?',
        a: 'LexiClash es mas fuerte para primaria superior a traves de ESL adulto — sus diccionarios escalados por MCER (A1–C2) abarcan desde principiante hasta avanzado. SpellingCity se inclina hacia la primaria. Para la practica de palabras de vista de primaria temprana, SpellingCity puede ser mejor; para la escuela secundaria, ESL y juegos de revision, LexiClash es mejor.',
      },
      {
        q: 'ZLexiClash admite otros idiomas?',
        a: 'Si — diccionarios nativos para ingles, hebreo (RTL), espanol, sueco y japones. SpellingCity se enfoca en la ortografia inglesa.',
      },
    ],
    moreTitle: 'Mas comparaciones',
    moreCards: [
      { title: 'LexiClash vs Quizlet', sub: 'Juegos de palabras vs tarjetas. Gratis.' },
      { title: 'LexiClash vs Flocabulary', sub: 'Juega palabras vs mira videos' },
      { title: 'Centro educativo', sub: 'Todos los juegos de palabras de aula' },
    ],
    finalTitle: 'Pruebalo antes de la proxima clase',
    finalBody:
      'Carga la lista de ortografia de esta semana, proyecta el codigo de union y deja que toda la clase juegue a la vez. Sin inicios de sesion para aprovisionar, sin venta premium, sin tarjeta de credito — cinco minutos para ver si en vivo vence al solo para tus estudiantes.',
    finalCta: 'Inicia un juego de aula gratis',
  },
  ru: {
    metaTitle: 'LexiClash vs VocabularySpellingCity — бесплатная альтернатива для многопользовательской игры (2026) | LexiClash',
    metaDescription:
      'LexiClash vs VocabularySpellingCity сравнение: живые многопользовательские словесные игры всего класса против индивидуальных упражнений по орфографии. Без входа учащегося, бесплатно, 5 языков, пользовательские списки слов. Бесплатная альтернатива SpellingCity для орфографии и словарного запаса.',
    ogTitle: 'LexiClash vs VocabularySpellingCity — бесплатная альтернатива',
    ogDescription:
      'Живые многопользовательские словесные игры превосходят отдельные упражнения по орфографии в плане вовлечения. Без входа. 5 языков. Бесплатно навсегда.',
    twitterTitle: 'LexiClash vs SpellingCity — бесплатная альтернатива',
    twitterDescription: 'Многопользовательские игры орфографии + словарного запаса. Без входа. 5 языков. Бесплатно.',
    heroTitle: 'SpellingCity тренируется в одиночку. LexiClash играет весь класс.',
    intro:
      'VocabularySpellingCity создала обширную библиотеку игр по орфографии и словарному запасу, через которые учащиеся работают один за другим на своих устройствах. Это работает — но это модель для одного пользователя, с входом, в основном платный. LexiClash берет те же пользовательские списки слов и превращает их в живую многопользовательскую игру без входа: игры для всего класса и дуэли 1v1 на сетках в стиле Boggle, анаграммы и колеса, бесплатно, на пяти языках. Практикуйте одни и те же слова; замените отдельные упражнения на конкурентный обзор.',
    ctaStart: 'Попробуйте LexiClash бесплатно',
    ctaSpelling: 'Тренировка орфографии',
    ctaDuels: 'Дуэли словарного запаса',
    compareTitle: 'Рядом, без пристрастия',
    compareFootnote:
      'Функции уровня VocabularySpellingCity и цены по состоянию на 2026 — проверьте у поставщика текущие планы Premium.',
    compareRows: [
      ['Бесплатный уровень (все функции)', '✓ Всё бесплатно', '✗ Premium для большинства игр'],
      ['Без входа учащегося', '✓ код из 6 символов присоединения', '✗ Учетные записи учащихся'],
      ['Основной формат', 'Живые многопользовательские словесные игры', 'Индивидуальные игры с собственным темпом'],
      ['Живая многопользовательская игра для всего класса', '✓ Бесплатно, до 30', '✗ Модель отдельных упражнений'],
      ['Дуэли 1v1 с парованием учащихся', '✓', '✗'],
      ['Фокус на орфографию + словарный запас', '✓ Суть словесной игры', '✓ Орфография в первую очередь'],
      ['Пользовательские списки слов программы', '✓', '✓'],
      ['5 языков с собственными словарями', '✓ EN/HE/SV/JA/ES', 'Английская орфография в первую очередь'],
      ['Панель аналитики класса', '✓ Бесплатно', '✓ (Premium)'],
      ['Лучший диапазон классов', 'Старшие классы начальной школы → ESL для взрослых', 'Начальные классы, основной акцент'],
      ['Лучше всего для', 'Увлекательные игры на повторение', 'Отдельные упражнения по орфографии'],
      ['Время настройки', 'Менее 60 секунд', 'Создание списка + назначение'],
    ] as const,
    beatsTitle: 'Когда LexiClash побеждает SpellingCity',
    beats: [
      {
        title: 'Вовлечение всего класса',
        desc: 'SpellingCity это отдельные упражнения. LexiClash это живая многопользовательская игра — энергия всего класса, играющего в один и тот же список слов одновременно.',
      },
      {
        title: 'Без входа учащегося',
        desc: 'код из 6 символов присоединения означает отсутствие необходимости в подготовке учетной записи. Каждый ученик может начать играть за секунды, включая тех, кто не зарегистрирован в системе.',
      },
      {
        title: 'Бесплатно, все функции',
        desc: 'Большинство игр SpellingCity находятся за платным планом. Функции класса LexiClash бесплатны, до 30 учащихся, без дополнительных платежей.',
      },
      {
        title: 'Дуэли 1v1',
        desc: 'Расставьте учащихся друг против друга на ваш список слов для быстрого и конкурентного формата повторения, который SpellingCity не предлагает.',
      },
      {
        title: 'Охватывает старших учащихся + ESL',
        desc: 'Словари с масштабированием CEFR A1–C2 подходят для средней школы и ESL для взрослых, а не только для орфографии начальной школы.',
      },
      {
        title: '5 языков с собственными словарями',
        desc: 'Проверка слов EN/HE/ES/SV/JA для двуязычных и языковых программ. SpellingCity это орфография на английском языке в первую очередь.',
      },
    ],
    stillWinsTitle: 'Когда SpellingCity все еще побеждает',
    stillWinsBody:
      'Если вы преподаете в начальной школе и вам нужны структурированные упражнения по орфографии и работе со словами для зрительного восприятия в собственном темпе с аудиопроизношением каждого слова, библиотека начальной школы VocabularySpellingCity и ведение записей по каждому учащемуся специально для этого созданы. LexiClash сильнее для старших классов начальной школы до ESL для взрослых и для живого повторения всего класса. Многие учителя назначают SpellingCity для отдельных упражнений и используют LexiClash для игры на повторение в классе.',
    faqTitle: 'Часто задаваемые вопросы',
    faqs: [
      {
        q: 'LexiClash это бесплатная альтернатива VocabularySpellingCity?',
        a: 'Да — LexiClash полностью бесплатна без платного уровня. VocabularySpellingCity (часть семейства Learning A-Z / Vocabulary A-Z) имеет бесплатный уровень, но большинство игр, ведение записей и управление классом находятся за платной подпиской Premium. LexiClash никогда не запирает функции класса.',
      },
      {
        q: 'В чем главное отличие?',
        a: 'VocabularySpellingCity построена на основе отдельных игр по орфографии и словарному запасу с собственным темпом, через которые учащиеся проходят на своих устройствах. LexiClash живая и социальная — многопользовательская игра для всего класса и дуэли 1v1 на сетках в стиле Boggle, анаграммы и колеса. Одна и та же цель по орфографии и словарному запасу, но вовлечение достигается за счет конкуренции в реальном времени, а не отдельных упражнений.',
      },
      {
        q: 'Нужны ли учащимся учетные записи для входа в LexiClash?',
        a: 'Нет. Учащиеся присоединяются по коду из 6 символов, который показывает учитель — без отдельных учетных записей. Учащиеся SpellingCity обычно входят в назначенные им учетные записи для отслеживания своих упражнений.',
      },
      {
        q: 'Могу ли я использовать свои списки слов по орфографии?',
        a: 'Да в обоих случаях. Учителя LexiClash загружают пользовательские списки слов из любого блока и играют в них в дуэлях, играх для всего класса или упражнениях. SpellingCity также построена на основе пользовательских списков — разница в многопользовательской игре и отсутствии входа в LexiClash.',
      },
      {
        q: 'LexiClash только для старших учащихся?',
        a: 'LexiClash сильнее всего для старших классов начальной школы до ESL для взрослых — её словари с масштабированием CEFR (A1–C2) охватывают от начинающих до продвинутых. SpellingCity ориентирована на начальные классы. Для упражнений на работу со словами для зрительного восприятия в начальной школе SpellingCity может подойти лучше; для средней школы, ESL и игр на повторение LexiClash подходит лучше.',
      },
      {
        q: 'Поддерживает ли LexiClash другие языки?',
        a: 'Да — собственные словари для английского, иврита (RTL), испанского, шведского и японского языков. SpellingCity ориентирована на английскую орфографию.',
      },
    ],
    moreTitle: 'Еще сравнения',
    moreCards: [
      { title: 'LexiClash vs Quizlet', sub: 'Словесные игры vs флешкарты. Бесплатно.' },
      { title: 'LexiClash vs Flocabulary', sub: 'Игра со словами vs просмотр видео' },
      { title: 'Образовательный центр', sub: 'Все словесные игры класса' },
    ],
    finalTitle: 'Попробуйте это перед следующим уроком',
    finalBody:
      'Загрузите список орфографии на эту неделю, проецируйте код присоединения и дайте всему классу играть одновременно. Никаких входов для подготовки, никакого платного плана Premium, никакой кредитной карты — пять минут чтобы увидеть, будут ли ваши ученики предпочитать живую игру отдельным упражнениям.',
    finalCta: 'Начать игру класса бесплатно',
  },
};

export function getComparisonContent(locale: string): LocaleContent {
  return contentMap[(locale as ComparisonLocale)] ?? contentMap.en;
}
