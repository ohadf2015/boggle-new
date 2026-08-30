export type DrillMode = {
  title: string;
  desc: string;
};

export type TrainingWeek = {
  week: string;
  focus: string;
  activity: string;
};

export type FaqItem = {
  q: string;
  a: string;
};

export type LocaleContent = {
  metaTitle: string;
  metaDescription: string;
  heroTitle: string;
  heroSubtitle: string;
  badgeText: string;
  h1Part1: string;
  h1Part2: string;
  h1Part3: string;
  h1Part4: string;
  mainParagraph: string;
  startWordHuntLabel: string;
  freeLabel: string;
  duelLabel: string;
  pairWithCompetitorLabel: string;
  drillModesHeading: string;
  drillModes: DrillMode[];
  practiceNowLabel: string;
  trainingPlanHeading: string;
  trainingPlanIntro: string;
  trainingPlanItems: TrainingWeek[];
  faqHeading: string;
  faqs: FaqItem[];
  bottomSectionHeading1: string;
  bottomSectionHeading2: string;
  noAppText: string;
  startDrillingLabel: string;
  seeEducationHubLabel: string;
};

export const EDUCATION_LOCALES = ['en', 'he', 'sv', 'ja', 'es', 'ru'] as const;
export type EducationLocale = (typeof EDUCATION_LOCALES)[number];

const content: Record<EducationLocale, LocaleContent> = {
  en: {
    metaTitle: 'Spelling Bee Practice Online — Free Word Games for Spelling Champions | LexiClash',
    metaDescription: 'Free online spelling bee practice through word games. Boggle-style grids, anagram drills, word wheels, and 1v1 spelling duels. No signup, no app — just open the browser and start practicing for Scripps, regional bees, or classroom spelling tests.',
    heroTitle: 'Spelling Bee Practice Online. Free.',
    heroSubtitle: 'Free online spelling bee practice through word games. Boggle-style grids, anagram drills, word wheels, and 1v1 spelling duels. No signup, no app — just open the browser and start practicing for Scripps, regional bees, or classroom spelling tests.',
    badgeText: '★ Spelling Bee Prep ★ Free Forever ★',
    h1Part1: 'Spelling Bee',
    h1Part2: 'Practice',
    h1Part3: 'Online.',
    h1Part4: 'Free.',
    mainParagraph: 'Word games designed for spelling-bee competitors. Boggle grids, anagram drills, word wheels, 1v1 duels — free practice that builds pattern recognition, recall under pressure, and vocabulary depth. No signup, no app, browser-based.',
    startWordHuntLabel: '▶ Start Word Hunt Drill',
    freeLabel: 'Free · 90 seconds',
    duelLabel: '⚔ 1v1 Duel',
    pairWithCompetitorLabel: 'Pair with a competitor',
    drillModesHeading: 'Four drill modes.',
    drillModes: [
      { title: 'Word Hunt (Boggle-style)', desc: 'Find every valid word on a grid in 90-180 seconds. Trains scan-and-recognize under time pressure.' },
      { title: 'Word Wheel', desc: 'Form as many words as possible from a letter set; longer words score more. Trains pattern recognition + recall.' },
      { title: 'Classic Boggle', desc: 'Adjacent-letter word search on a 4x4, 5x5, or 6x6 grid. Trains spatial pattern matching.' },
      { title: '1v1 Vocabulary Duel', desc: 'Pair two students head-to-head. Direct competitive practice for serious bee competitors.' },
    ],
    practiceNowLabel: 'Practice now →',
    trainingPlanHeading: '4-week training plan.',
    trainingPlanIntro: 'A structured prep routine for serious spelling-bee competitors. 10-15 minute daily sessions, distributed over 4 weeks.',
    trainingPlanItems: [
      { week: 'Week 1', focus: 'Letter pattern recognition', activity: 'Daily 10-min Word Hunt + 5-min Word Wheel; build comfort with scanning grids and forming common letter patterns.' },
      { week: 'Week 2', focus: 'Vocabulary expansion', activity: 'Add custom word lists from grade-level vocabulary or Scripps study lists; drill 5 mins solo + 5 mins paired duel.' },
      { week: 'Week 3', focus: 'Speed under pressure', activity: 'Reduce timer to 60-90 seconds. Run 1v1 duels with peers. Track which words tripped you.' },
      { week: 'Week 4+', focus: 'Targeted weakness drilling', activity: 'Use the per-student accuracy dashboard to identify weak word categories (Greek roots, silent letters, homophones) and build drill lists for each.' },
    ],
    faqHeading: 'Spelling-bee FAQ.',
    faqs: [
      { q: 'How can I practice for a spelling bee online for free?', a: 'LexiClash gives spelling-bee competitors three complementary practice formats: Boggle-style grids (find every valid word from random letters), Word Wheel (form long words from a curated letter set), and Anagram puzzles (rearrange letters into target words). All free, no signup, no app — just open the browser and play. Multiple short sessions per day build pattern recognition and recall under time pressure.' },
      { q: 'How does this help spelling-bee preparation?', a: 'Spelling bees test recall under stress + word-pattern recognition + spelling under audio cue. Word games drill the first two directly. Word Wheel and Boggle force students to scan letter patterns and recognize valid words quickly. Anagrams train letter-rearrangement under pressure — the same mental motion as spelling unfamiliar words letter by letter.' },
      { q: 'Can I practice 1v1 with another spelling-bee competitor?', a: 'Yes. Use Vocabulary Duels mode to pair two students head-to-head on the same letter grid. First to a target score wins. Excellent simulation of competitive pressure for serious spelling-bee competitors training together.' },
      { q: 'Is this suitable for elementary, middle, and high school spelling bees?', a: 'Yes — difficulty is configurable. Younger competitors can play with shorter words and longer timers; older competitors face longer words and tighter time limits. Custom advanced word lists can drill spelling-bee-specific vocabulary (Greek/Latin roots, scientific terms, geographic names).' },
      { q: 'Does LexiClash use Scripps National Spelling Bee word lists?', a: 'LexiClash supports custom word-list upload, so teachers and parents can paste in any list — including Scripps study lists, regional bee word banks, or grade-specific vocabulary from textbooks. Built-in lists cover general English vocabulary for warm-up practice; custom lists handle competition-specific drilling.' },
      { q: 'How often should a spelling-bee competitor practice?', a: 'Research on retrieval practice (Roediger & Karpicke 2006) and spaced repetition (Cepeda et al. 2008) suggests 10-15 minute sessions, 4-5 days per week, distributed over weeks rather than crammed in days. LexiClash sessions are designed to fit that pattern: 5-10 minute multiplayer rounds + 2-3 minute solo drills.' },
      { q: 'Is LexiClash classroom-ready for school spelling bees?', a: 'Yes. Teachers can run whole-class spelling-bee warm-ups (up to 30 students join with a 6-character code, no student accounts), 1v1 elimination brackets, or assign solo practice. The teacher dashboard shows per-student accuracy and which words tripped the most competitors — useful for targeting review sessions.' },
      { q: 'Is it free for individual students preparing at home?', a: 'Yes — fully free, no premium tier, no per-user fee. Open the browser, pick a mode, start practicing. No account required (though optional account saves your progress and unlocks streak tracking).' },
    ],
    bottomSectionHeading1: '10 minutes a day.',
    bottomSectionHeading2: 'Better speller by spring.',
    noAppText: 'No app to install, no subscription, no email signup. Pick a mode, start drilling.',
    startDrillingLabel: '▶ Start Drilling',
    seeEducationHubLabel: 'See Education Hub',
  },
  he: {
    metaTitle: 'תרגול איות חינם — משחקי מילים להתכוננות לתחרויות | LexiClash',
    metaDescription: 'תרגול איות בחינם דרך משחקי מילים: Boggle, אנגרמות, גלגל מילים ודו-קרבות 1v1. בלי הרשמה, בלי אפליקציה — רק דפדפן.',
    heroTitle: 'תרגול איות בחינם.',
    heroSubtitle: 'תרגול איות בחינם דרך משחקי מילים. לוחות Boggle, אנגרמות, גלגל מילים ודו-קרבות 1v1. בלי הרשמה, בלי אפליקציה — פשוט פתחו דפדפן והתחילו לתרגל.',
    badgeText: '★ הכנה לתחרויות איות ★ חינם לנצח ★',
    h1Part1: 'תרגול',
    h1Part2: 'איות',
    h1Part3: 'בחינם.',
    h1Part4: 'עכשיו.',
    mainParagraph: 'משחקי מילים שתורמים להכנה לתחרויות איות. לוחות Boggle, אנגרמות, גלגל מילים ודו-קרבות — תרגול חינם שמפתח כישורים בסריקת דפוסים, זכירה תחת לחץ זמן ועומק אוצר מילים. בלי הרשמה, בלי אפליקציה, ישירות בדפדפן.',
    startWordHuntLabel: '▶ התחילו עם ציד מילים',
    freeLabel: 'חינם · 90 שניות',
    duelLabel: '⚔ דו-קרב 1v1',
    pairWithCompetitorLabel: 'התחרו עם חבר',
    drillModesHeading: 'ארבע דרכי תרגול.',
    drillModes: [
      { title: 'ציד מילים (סגנון Boggle)', desc: 'מצאו כל מילה תקפה בלוח ב-90 עד 180 שניות. מתרגל סריקה מהירה וזיהוי מילים תחת לחץ זמן.' },
      { title: 'גלגל מילים', desc: 'בנו כמה שיותר מילים מסט של אותיות; מילים ארוכות מניבות יותר נקודות. מתרגל הכרה בעיצורים, זכירה והרחבת אוצר.' },
      { title: 'Boggle קלאסי', desc: 'חיפוש מילים עם אותיות צמודות על לוח 4x4, 5x5 או 6x6. מתרגל עבודה בשטח ודפוסים מרחביים.' },
      { title: 'דו-קרב אוצר מילים 1v1', desc: 'שני מתחרים זה מול זה על אותו לוח. תרגול תחרותי לחניכי תחרויות אמתיים.' },
    ],
    practiceNowLabel: 'התחילו עכשיו →',
    trainingPlanHeading: 'תוכנית הכנה 4 שבועות.',
    trainingPlanIntro: 'שגרת הכנה ממוקדת לחניכי תחרויות איות. 10-15 דקות כל יום, מפוזרות על פני 4 שבועות.',
    trainingPlanItems: [
      { week: 'שבוע 1', focus: 'דפוסי אותיות וסריקה', activity: '10 דקות ציד מילים יומי + 5 דקות גלגל מילים. פתחו הרגלות בסריקה מהירה וזיהוי דפוסים נפוצים.' },
      { week: 'שבוע 2', focus: 'הרחבת אוצר מילים', activity: 'הוסיפו רשימות מילים מהכיתה שלכם או מקורות שיוויים. תרגלו 5 דקות בודד + 5 דקות במשחק זוגי.' },
      { week: 'שבוע 3', focus: 'מהירות תחת לחץ', activity: 'קצרו הטיימר ל-60-90 שניות. משחקו דו-קרבות 1v1 עם חברים. עקבו אחר טעויותיכם.' },
      { week: 'שבוע 4+', focus: 'תרגול ממוקד של החלשות', activity: 'השתמשו בנתונים על הבחנות של כל תלמיד כדי לעמוד על קטגוריות חלשות (שורשים יווניים, אותיות שקטות, הומופונים) ובנו רשימות מיוחדות לכל אחת.' },
    ],
    faqHeading: 'שאלות תכופות על איות.',
    faqs: [
      { q: 'איך לתרגל איות בחינם באינטרנט?', a: 'LexiClash מציעה שלוש דרכי תרגול המשלימות זו את זו: לוחות Boggle (מצאו כל מילה תקפה מאותיות אקראיות), גלגל מילים (בנו מילים ארוכות מסט בחור), חידות אנגרמות (סדרו מחדש אותיות למילה). הכל חינם, בלי הרשמה, בלי אפליקציה — פשוט דפדפן. מגוון פעילויות קצרות ביום בונות יכולת לזהות דפוסים וזכירה תחת לחץ.' },
      { q: 'איך זה עוזר להכנה לתחרויות?', a: 'תחרויות איות בודקות שלוש יכולות: זכירה תחת לחץ, הכרה בדפוסי מילים, וכתיבה לפי הוראה. משחקי מילים מתרגלים את שתי הראשונות ישירות. גלגל מילים ו-Boggle מאלצים סריקה של דפוסים וזיהוי מילים תקפות במהירות. אנגרמות מתרגלות סידור מחדש של אותיות תחת לחץ — אותו תהליך נפשי כמו כתיבת מילה זרה אות אחר אות.' },
      { q: 'אפשר לתרגל דו-קרב עם מתחרה אחר?', a: 'כן. הפעילו את מצב דו-קרבות אוצר מילים כדי לשבץ שני תלמידים זה מול זה על לוח משותף. מי שמגיע לניקוד המטרה ראשון — מנצח. דומה מאד ללחץ האמיתי של תחרות.' },
      { q: 'מתאים לתחרויות ביסודי, חטיבה וחינוך תיכון?', a: 'כן — ניתן לשנות את הקושי. תלמידים צעירים משחקים עם מילים קצרות וזמן ארוך יותר; מבוגרים בוודאי מתמודדים עם מילים ארוכות ותזמונים הדוקים. רשימות מילים בשכוללה יכולות לתרגל אוצר ספציפי לתחרויות: שורשים יווני-לטיניים, מונחים מדעיים, שמות גיאוגרפיים.' },
      { q: 'האם LexiClash משתמשת ברשימות מטרה רשמיות?', a: 'LexiClash מאפשרת להעלות רשימות מילים בעצמכם, כך שמורים והורים יכולים להדביק כל רשימה — כולל רשימות מקורות שיוויים, בנקי מילים אזוריים או אוצר כיתתי מספרי לימוד. רשימות מובנות מכסות אוצר אנגלית כללי לתחימום; רשימות משלכם מטפלות בתרגול ספציפי.' },
      { q: 'כמה פעמים ביום צריך לתרגל?', a: 'מחקרים על למידה (Roediger & Karpicke 2006) והישנון בהפסקות (Cepeda et al. 2008) מראים: 10-15 דקות, 4-5 ימים בשבוע, מפוזר לאורך שבועות — לא דחוסה. פעילויות LexiClash בנויות כך: 5-10 דקות משחק קבוצתי + 2-3 דקות תרגול בודד.' },
      { q: 'מתאים לכיתה שלמה?', a: 'כן. מורים יכולים להנהל תרגול לכל הכיתה (עד 30 תלמידים עם קוד 4 ספרות, בלי חשבונות), תחרויות דו-קרב או תרגול בודד. לוח המורה מראה דיוק לתלמיד ואילו מילים טרידו את רוב המתחרים — כך אתם יודעים מה לתרגל בחזרה.' },
      { q: 'חינם לילדים בביתם?', a: 'כן — לגמרי חינם, בלי תשלום, בלי הגבלה למשתמש. פתחו דפדפן, בחרו משחק, התחילו. חשבון לא הכרחי (אבל אם תפתחו — הוא שומר התקדמות ופותח עקבות הישגים).' },
    ],
    bottomSectionHeading1: '10 דקות בכל יום.',
    bottomSectionHeading2: 'איות טוב יותר עד הקיץ.',
    noAppText: 'אין אפליקציה, אין מנוי, אין אימייל. בחרו משחק, התחילו לתרגל.',
    startDrillingLabel: '▶ התחילו לתרגל',
    seeEducationHubLabel: 'הצגת מרכז החינוך',
  },
  sv: {
    metaTitle: 'Stavningspraktik Online — Gratis Ordspel | LexiClash',
    metaDescription: 'Gratis stavningspraktik genom ordspel. Boggle, anagram, hjul, dueller. Ingen registrering, ingen app — bara webbläsare.',
    heroTitle: 'Stavningspraktik Online. Gratis.',
    heroSubtitle: 'Gratis stavningspraktik genom ordspel. Boggle-rutnät, anagram, ordhjul och 1v1-dueller. Ingen registrering, ingen app — bara öppna webbläsaren och börja träna.',
    badgeText: '★ Stavningspraktik ★ Gratis För Alltid ★',
    h1Part1: 'Stavning',
    h1Part2: 'Praktik',
    h1Part3: 'Online.',
    h1Part4: 'Gratis.',
    mainParagraph: 'Ordspel designade för stavningsdelagare. Boggle-rutnät, anagram, ordhjul, 1v1-dueller — gratis träning som bygger mönsterigenkänning, återkallelse under tidspress och ordförrådsdjup. Ingen registrering, ingen app, webbläsarbaserad.',
    startWordHuntLabel: '▶ Börja Med Ordjakt',
    freeLabel: 'Gratis · 90 sekunder',
    duelLabel: '⚔ 1v1 Duell',
    pairWithCompetitorLabel: 'Tävla med en motståndare',
    drillModesHeading: 'Fyra träningsmetoder.',
    drillModes: [
      { title: 'Ordjakt (Boggle-stil)', desc: 'Hitta alla giltiga ord på ett rutnät på 90–180 sekunder. Tränar sökning och igenkänning under tidspress.' },
      { title: 'Ordhjul', desc: 'Forma så många ord som möjligt från en uppsättning bokstäver; längre ord ger mer poäng. Tränar mönsterigenkänning och återkallelse.' },
      { title: 'Klassisk Boggle', desc: 'Ordsökning på ett 4x4, 5x5 eller 6x6 rutnät. Tränar rumslig mönstermatchning.' },
      { title: '1v1 Ordförrådsduell', desc: 'Två deltare ansikte mot ansikte. Direkt tävlingstraning för seriösa stavningsdelagare.' },
    ],
    practiceNowLabel: 'Träna nu →',
    trainingPlanHeading: '4-veckors träningsplan.',
    trainingPlanIntro: 'En strukturerad träningsrutin för seriösa stavningsdelagare. 10–15 minuters dagliga pass, fördelade över 4 veckor.',
    trainingPlanItems: [
      { week: 'Vecka 1', focus: 'Mönsterigenkänning av bokstäver', activity: 'Daglig 10 min ordjakt + 5 min ordhjul; bygga bekvämlighet med att söka rutnät och forma vanliga bokstavsmönster.' },
      { week: 'Vecka 2', focus: 'Ordförrådsutvidgning', activity: 'Lägg till anpassade ordlistor från klassrumsmässig ordförråd eller Scripps-studielistor; träna 5 min solo + 5 min parduell.' },
      { week: 'Vecka 3', focus: 'Hastighet under tidspress', activity: 'Minska timern till 60–90 sekunder. Kör 1v1-dueller med jämnåriga. Spåra vilka ord som trippade dig.' },
      { week: 'Vecka 4+', focus: 'Målinriktad träning av svaga sidor', activity: 'Använd testeringens noggrannhetsinstrumentpanel för att identifiera svaga ordförrådsområden (grekiska/latinska rötter, tysta bokstäver, homofoner) och bygg träningslistor för var och en.' },
    ],
    faqHeading: 'Vanliga frågor om stavning.',
    faqs: [
      { q: 'Hur kan jag träna stavning online gratis?', a: 'LexiClash ger stavningsdelagare tre kompletterande träningsformat: Boggle-rutnät (hitta alla giltiga ord från slumpmässiga bokstäver), ordhjul (forma långa ord från en kurerad uppsättning bokstäver) och anagrampussel (ordna om bokstäver till målord). Allt gratis, ingen registrering, ingen app — bara öppna webbläsaren och spela. Flera korta pass per dag bygger mönsterigenkänning och återkallelse under tidspress.' },
      { q: 'Hur hjälper det till med stavningsförberedelse?', a: 'Stavningstävlingar testar återkallelse under stress + ordbokstavsmönsterigenkänning + stavning under ljudledning. Ordspel tränar de två första direkt. Ordhjul och Boggle tvingar elever att skanna bokstavsmönster och känna igen giltiga ord snabbt. Anagram tränar omordning av bokstäver under tidspress — samma mentala rörelse som stavning av okända ord bokstav för bokstav.' },
      { q: 'Kan jag träna 1v1 med en annan stavningstävlingsmonstrant?', a: 'Ja. Använd ordförrådsduellläge för att para två elever ansikte mot ansikte på samma bokstavsnät. Först till målsiffra vinner. Utmärkt simulering av tävlingstryck för seriösa stavningsdelagare som tränar tillsammans.' },
      { q: 'Är det lämpligt för stavningstävlingar i grundskola, högstadium och gymnasium?', a: 'Ja — svårighetsnivån är justerbar. Yngre deltagare kan spela med kortare ord och längre timer; äldre deltagare möter längre ord och snävare tidsgränser. Anpassade ordlistor kan träna stavningsspecifik ordförråd (grekisk/latinska rötter, vetenskapliga termer, geografiska namn).' },
      { q: 'Använder LexiClash Scripps National Spelling Bee-ordlistor?', a: 'LexiClash stöder anpassad ordlisteöverföring, så lärare och föräldrar kan klistra in valfri lista — inklusive Scripps-studielistor, regionala stavningsordlistor eller klassspecifik ordförråd från läroböcker. Inbyggda listor täcker allmän engelsk ordförråd för uppvärmningstraning; anpassade listor hanterar stavningsspecifik träning.' },
      { q: 'Hur ofta bör en stavningsdetagare träna?', a: 'Forskning om retrieval practice (Roediger & Karpicke 2006) och spaced repetition (Cepeda et al. 2008) föreslår 10–15 minuters pass, 4–5 dagar per vecka, fördelat över veckor snarare än pakrat på dagar. LexiClash-pass är designade för att passa det mönstret: 5–10 minuters multiplayer-omgångar + 2–3 minuters soloträning.' },
      { q: 'Är LexiClash klassrumsklar för stavningstävlingar i skolor?', a: 'Ja. Lärare kan köra stavningsuppvärmning för hela klassen (upp till 30 elever ansluter med en 4-siffrig kod, utan elevkonton), 1v1-eliminationsmatcher eller tilldela soloträning. Lärarinstrumentpanelen visar noggrannhet per elev och vilka ord som trippade de flesta deltagarna — användbar för att rikta in granskningssessioner.' },
      { q: 'Är det gratis för enskilda elever som förbereder sig hemma?', a: 'Ja — helt gratis, ingen premium-nivå, ingen avgift per användare. Öppna webbläsaren, välj ett läge, börja träna. Inget konto krävs (även om valfritt konto sparar din progress och låser upp streakspårning).' },
    ],
    bottomSectionHeading1: '10 minuter om dagen.',
    bottomSectionHeading2: 'Bättre stavning före våren.',
    noAppText: 'Ingen app att installera, ingen prenumeration, ingen e-postregistrering. Välj ett läge, börja träna.',
    startDrillingLabel: '▶ Börja Träna',
    seeEducationHubLabel: 'Se Utbildningsmöte',
  },
  ja: {
    metaTitle: 'スペリング練習オンライン — 無料単語ゲーム | LexiClash',
    metaDescription: '無料のスペリング練習。Boggle、アナグラム、ホイール、デュエル。登録なし、アプリなし — ブラウザだけ。',
    heroTitle: 'スペリング練習オンライン。無料。',
    heroSubtitle: '無料のスペリング練習を単語ゲームで。Boggleグリッド、アナグラム、ワードホイール、1v1デュエル。登録なし、アプリなし — ブラウザを開いて練習を始めましょう。',
    badgeText: '★ スペリング練習 ★ 永遠に無料 ★',
    h1Part1: 'スペリング',
    h1Part2: '練習',
    h1Part3: 'オンライン。',
    h1Part4: '無料。',
    mainParagraph: 'スペリング選手権向けに設計された単語ゲーム。Boggleグリッド、アナグラム、ワードホイール、1v1デュエル — パターン認識、プレッシャー下での思い出、語彙の深さを構築する無料練習。登録なし、アプリなし、ブラウザベース。',
    startWordHuntLabel: '▶ ワードハント開始',
    freeLabel: '無料 · 90秒',
    duelLabel: '⚔ 1v1デュエル',
    pairWithCompetitorLabel: '競争者とペアリング',
    drillModesHeading: '4つの練習モード。',
    drillModes: [
      { title: 'ワードハント（Boggleスタイル）', desc: 'グリッド上のすべての有効な単語を90～180秒で見つけます。時間プレッシャーの下でのスキャンと認識を練習します。' },
      { title: 'ワードホイール', desc: '文字セットから可能な限り多くの単語を形成します。より長い単語はより多くのポイントを獲得します。パターン認識と想起を練習します。' },
      { title: 'クラシックBoggle', desc: '4x4、5x5、または6x6グリッド上の隣接文字単語検索。空間パターンマッチングを練習します。' },
      { title: '1v1語彙デュエル', desc: '2人の選手が対面します。真摯なスペリング選手向けの直接的な競争練習。' },
    ],
    practiceNowLabel: '今すぐ練習 →',
    trainingPlanHeading: '4週間のトレーニングプラン。',
    trainingPlanIntro: '真摯なスペリング選手向けの構造化された練習ルーチン。1日10～15分のセッション、4週間かけて分散。',
    trainingPlanItems: [
      { week: '週1', focus: '文字パターン認識', activity: '毎日10分のワードハント + 5分のワードホイール。グリッドのスキャンと一般的な文字パターンの形成に慣れます。' },
      { week: '週2', focus: '語彙の拡張', activity: '学年レベルの語彙またはScripps研究リストからカスタム単語リストを追加します。5分のソロ + 5分のペアデュエルで練習します。' },
      { week: '週3', focus: 'プレッシャー下でのスピード', activity: 'タイマーを60～90秒に短縮します。ピアとの1v1デュエルを実行します。あなたがトリップした単語を追跡します。' },
      { week: '週4+', focus: '対象を絞った弱点ドリル', activity: 'クラスごとのダッシュボードを使用して、弱い単語カテゴリ（ギリシャ語/ラテン語のルーツ、静かな文字、同音異義語）を特定し、それぞれのドリルリストを構築します。' },
    ],
    faqHeading: 'スペリングFAQ。',
    faqs: [
      { q: 'オンラインでスペリング練習を無料でできますか？', a: 'LexiClashはスペリング選手に3つの補完的な練習形式を提供します。Boggleグリッド（ランダムな文字から有効なすべての単語を見つける）、ワードホイール（キュレーションされた文字セットから長い単語を形成する）、アナグラムパズル（文字を目標単語に並べ替える）。すべて無料、登録なし、アプリなし — ブラウザを開いて遊ぶだけです。1日複数の短いセッションはパターン認識と時間プレッシャー下での想起を構築します。' },
      { q: 'スペリング準備にどのように役立ちますか？', a: 'スペリング競争はストレス下での想起+単語パターン認識+音声キューの下でのスペリングをテストします。単語ゲームは最初の2つを直接練習します。ワードホイールとBoggleは生徒に文字パターンをスキャンし、有効な単語を素早く認識させます。アナグラムは時間プレッシャー下での文字の並べ替えを練習します — 不慣れな単語を文字ごとにスペリングするのと同じメンタルモーション。' },
      { q: '別のスペリング選手と1v1で練習できますか？', a: 'はい。語彙デュエルモードを使用して、2人の生徒を同じ文字グリッド上でペアリングします。ターゲットスコアに最初に到達した方が勝ちます。真摯なスペリング選手が一緒に練習するための競争プレッシャーの優れたシミュレーション。' },
      { q: 'これは小学校、中学校、高校のスペリングに適していますか？', a: 'はい — 難易度は構成可能です。若い選手はより短い単語とより長いタイマーでプレイできます。年上の選手はより長い単語とより厳しい制限時間に直面します。カスタム高度な単語リストはスペリング固有の語彙（ギリシャ語/ラテン語のルーツ、科学用語、地理的な名前）を練習できます。' },
      { q: 'LexiClashはScripps National Spelling Bee単語リストを使用していますか？', a: 'LexiClashはカスタム単語リストのアップロードをサポートしているため、教師と保護者はScripps研究リスト、地域のスペリング単語銀行、教科書からの学年固有の語彙を含むリストを貼り付けることができます。組み込みリストは熱身練習のための一般的な英語語彙をカバーしています。カスタムリストは競争固有の練習を処理します。' },
      { q: 'スペリング選手はどのくらいの頻度で練習する必要がありますか？', a: '想起練習（Roediger & Karpicke 2006）と分散反復（Cepeda et al. 2008）に関する研究は、週4～5日、10～15分のセッション、数日の間隔を示唆しています。LexiClashセッションはそのパターンに適合するように設計されています。5～10分のマルチプレイヤーラウンド + 2～3分のソロドリル。' },
      { q: 'LexiClashは学校のスペリング競争に対応していますか？', a: 'はい。教師は全クラスのスペリング暖房を実行できます（最大30人の生徒が4桁のコードで参加、学生アカウントなし）、1v1排除戦、またはソロ練習を割り当てます。教師のダッシュボードは生徒ごとの精度と、ほとんどの競争者がつまずいた単語を示しています — レビューセッションのターゲット化に役立ちます。' },
      { q: '家で準備している個々の学生にとって無料ですか？', a: 'はい — 完全無料、プレミアム層なし、ユーザーごとの手数料なし。ブラウザを開き、モードを選択し、練習を開始します。アカウント不要（オプションのアカウントは進捗を保存し、ストリーク追跡をロック解除します）。' },
    ],
    bottomSectionHeading1: '毎日10分。',
    bottomSectionHeading2: '春までにより良いスペラー。',
    noAppText: 'インストールするアプリなし、サブスクリプションなし、メール登録なし。モードを選択して、ドリルを開始します。',
    startDrillingLabel: '▶ ドリル開始',
    seeEducationHubLabel: '教育ハブを見る',
  },
  es: {
    metaTitle: 'Práctica de Ortografía Online — Juegos Gratis | LexiClash',
    metaDescription: 'Práctica de ortografía gratis a través de juegos. Boggle, anagramas, ruedas, duelos. Sin registro, sin app — solo navegador.',
    heroTitle: 'Práctica de Ortografía Online. Gratis.',
    heroSubtitle: 'Práctica de ortografía gratis a través de juegos. Cuadrículas Boggle, anagramas, ruedas de palabras y duelos 1v1. Sin registro, sin app — solo abre el navegador y empieza a practicar.',
    badgeText: '★ Práctica de Ortografía ★ Gratis Por Siempre ★',
    h1Part1: 'Práctica',
    h1Part2: 'de',
    h1Part3: 'Ortografía.',
    h1Part4: 'Gratis.',
    mainParagraph: 'Juegos diseñados para competidores de ortografía. Cuadrículas Boggle, anagramas, ruedas de palabras, duelos 1v1 — práctica gratuita que construye reconocimiento de patrones, recuerdo bajo presión y profundidad de vocabulario. Sin registro, sin app, basado en navegador.',
    startWordHuntLabel: '▶ Comenzar Caza de Palabras',
    freeLabel: 'Gratis · 90 segundos',
    duelLabel: '⚔ Duelo 1v1',
    pairWithCompetitorLabel: 'Compite con un rival',
    drillModesHeading: 'Cuatro modos de práctica.',
    drillModes: [
      { title: 'Caza de Palabras (estilo Boggle)', desc: 'Encuentra todas las palabras válidas en una cuadrícula en 90-180 segundos. Entrena el escaneo y reconocimiento bajo presión de tiempo.' },
      { title: 'Rueda de Palabras', desc: 'Forma tantas palabras como sea posible a partir de un conjunto de letras; las palabras más largas puntúan más. Entrena el reconocimiento de patrones y la memoria.' },
      { title: 'Boggle Clásico', desc: 'Búsqueda de palabras con letras adyacentes en una cuadrícula de 4x4, 5x5 o 6x6. Entrena la coincidencia de patrones espaciales.' },
      { title: 'Duelo de Vocabulario 1v1', desc: 'Dos competidores cara a cara. Práctica competitiva directa para competidores serios.' },
    ],
    practiceNowLabel: 'Practicar ahora →',
    trainingPlanHeading: 'Plan de entrenamiento de 4 semanas.',
    trainingPlanIntro: 'Una rutina de preparación estructurada para competidores serios de ortografía. Sesiones diarias de 10-15 minutos, distribuidas en 4 semanas.',
    trainingPlanItems: [
      { week: 'Semana 1', focus: 'Reconocimiento de patrones de letras', activity: 'Caza de palabras de 10 minutos diarios + Rueda de palabras de 5 minutos; construye comodidad escaneando cuadrículas y formando patrones de letras comunes.' },
      { week: 'Semana 2', focus: 'Expansión de vocabulario', activity: 'Añade listas de palabras personalizadas del vocabulario de tu grado o listas de estudio de Scripps; practica 5 minutos solo + 5 minutos de duelo en pareja.' },
      { week: 'Semana 3', focus: 'Velocidad bajo presión', activity: 'Reduce el temporizador a 60-90 segundos. Corre duelos 1v1 con compañeros. Registra qué palabras te derribaron.' },
      { week: 'Semana 4+', focus: 'Práctica dirigida de debilidades', activity: 'Usa el panel de precisión por estudiante para identificar categorías de palabras débiles (raíces griegas/latinas, letras silenciosas, homófonos) y construye listas de práctica para cada una.' },
    ],
    faqHeading: 'Preguntas frecuentes sobre ortografía.',
    faqs: [
      { q: '¿Cómo puedo practicar ortografía en línea gratis?', a: 'LexiClash ofrece a los competidores de ortografía tres formatos de práctica complementarios: cuadrículas Boggle (encuentra todas las palabras válidas de letras aleatorias), rueda de palabras (forma palabras largas de un conjunto de letras seleccionadas) y acertijos de anagramas (reorganiza letras en palabras objetivo). Todo gratis, sin registro, sin app — solo abre el navegador y juega. Varias sesiones cortas al día construyen el reconocimiento de patrones y el recuerdo bajo presión de tiempo.' },
      { q: '¿Cómo ayuda esto a la preparación para competencias de ortografía?', a: 'Las competencias de ortografía prueban el recuerdo bajo estrés + el reconocimiento de patrones de palabras + la ortografía bajo pistas de audio. Los juegos de palabras entrenan los dos primeros directamente. La rueda de palabras y Boggle obligan a los estudiantes a escanear patrones de letras y reconocer palabras válidas rápidamente. Los anagramas entrenan la reorganización de letras bajo presión — el mismo movimiento mental que deletrear palabras desconocidas letra por letra.' },
      { q: '¿Puedo practicar 1v1 con otro competidor de ortografía?', a: 'Sí. Usa el modo de duelos de vocabulario para emparejar a dos estudiantes cara a cara en la misma cuadrícula de letras. El primero en alcanzar la puntuación objetivo gana. Excelente simulación de presión competitiva para competidores serios entrenando juntos.' },
      { q: '¿Es apropiado para competencias de ortografía en primaria, secundaria y preparatoria?', a: 'Sí — la dificultad es configurable. Los competidores más jóvenes pueden jugar con palabras más cortas y temporizadores más largos; los competidores mayores enfrentan palabras más largas y límites de tiempo más estrictos. Las listas de palabras avanzadas personalizadas pueden entrenar vocabulario específico de ortografía (raíces griego-latinas, términos científicos, nombres geográficos).' },
      { q: '¿Usa LexiClash las listas de palabras del Scripps National Spelling Bee?', a: 'LexiClash admite la carga de listas de palabras personalizadas, por lo que maestros y padres pueden pegar cualquier lista — incluyendo listas de estudio de Scripps, bancos de palabras regionales o vocabulario específico del grado de los libros de texto. Las listas incorporadas cubren vocabulario inglés general para práctica de calentamiento; las listas personalizadas manejan la práctica específica de competencia.' },
      { q: '¿Con qué frecuencia debe practicar un competidor de ortografía?', a: 'La investigación sobre práctica de recuperación (Roediger & Karpicke 2006) y repetición espaciada (Cepeda et al. 2008) sugiere sesiones de 10-15 minutos, 4-5 días por semana, distribuidas en semanas en lugar de apretadas en días. Las sesiones de LexiClash están diseñadas para ajustarse a ese patrón: rondas multijugador de 5-10 minutos + ejercicios solo de 2-3 minutos.' },
      { q: '¿Está LexiClash lista para competencias de ortografía en escuelas?', a: 'Sí. Los maestros pueden ejecutar calentamientos de ortografía para toda la clase (hasta 30 estudiantes se unen con un código de 4 dígitos, sin cuentas de estudiante), torneos de eliminación 1v1 o asignar práctica solo. El panel del maestro muestra la precisión por estudiante y qué palabras tropezaron con la mayoría de los competidores — útil para dirigirse a sesiones de revisión.' },
      { q: '¿Es gratis para estudiantes individuales preparándose en casa?', a: 'Sí — completamente gratis, sin nivel premium, sin tarifa por usuario. Abre el navegador, elige un modo, empieza a practicar. Sin cuenta requerida (aunque la cuenta opcional guarda tu progreso y desbloquea el seguimiento de racha).' },
    ],
    bottomSectionHeading1: '10 minutos al día.',
    bottomSectionHeading2: 'Mejor ortografía antes de primavera.',
    noAppText: 'Sin app para instalar, sin suscripción, sin registro de correo. Elige un modo, empieza a practicar.',
    startDrillingLabel: '▶ Comenzar a Practicar',
    seeEducationHubLabel: 'Ver Centro de Educación',
  },
  ru: {
    metaTitle: 'Практика орфографии бесплатно — словесные игры для подготовки к конкурсам | LexiClash',
    metaDescription: 'Практика орфографии в интернете. Boggle, анаграммы, словесные колеса, дуэли 1v1. Без регистрации и приложения — только браузер.',
    heroTitle: 'Практика орфографии бесплатно.',
    heroSubtitle: 'Готовьтесь к орфографическому конкурсу через словесные игры. Сетки Boggle, анаграммы, словесные колеса и дуэли 1v1. Регистрация не требуется, приложение не нужно — откройте браузер и начните тренировку.',
    badgeText: '★ Подготовка к конкурсам ★ Всегда бесплатно ★',
    h1Part1: 'Практика',
    h1Part2: 'орфографии',
    h1Part3: 'бесплатно.',
    h1Part4: 'Прямо сейчас.',
    mainParagraph: 'Словесные игры для подготовки к орфографическим конкурсам. Сетки Boggle, анаграммы, колеса слов, дуэли 1v1 — свободная тренировка, которая развивает узнавание орфографических паттернов, запоминание под давлением времени и словарный запас. Без регистрации, без приложения, прямо в браузере.',
    startWordHuntLabel: '▶ Начать охоту за словами',
    freeLabel: 'Бесплатно · 90 секунд',
    duelLabel: '⚔ Дуэль 1v1',
    pairWithCompetitorLabel: 'Соревнуйтесь с друзьями',
    drillModesHeading: 'Четыре способа тренировки.',
    drillModes: [
      { title: 'Охота за словами (Boggle)', desc: 'Найдите все возможные слова в сетке за 90-180 секунд. Тренирует быстрый поиск и распознавание слов под давлением времени.' },
      { title: 'Словесное колесо', desc: 'Составьте максимум слов из набора букв; длинные слова приносят больше очков. Развивает распознавание комбинаций и вспоминание.' },
      { title: 'Классический Boggle', desc: 'Поиск слов на соседних буквах в сетке 4x4, 5x5 или 6x6. Совершенствует пространственное восприятие паттернов.' },
      { title: 'Дуэль словарного запаса 1v1', desc: 'Два участника играют на одной сетке. Прямое соревновательное состязание для серьёзных претендентов на победу.' },
    ],
    practiceNowLabel: 'Начать прямо сейчас →',
    trainingPlanHeading: 'Программа подготовки на 4 недели.',
    trainingPlanIntro: 'Структурированный план тренировок для серьёзных участников конкурсов. 10-15 минут ежедневно, распределённые на 4 недели.',
    trainingPlanItems: [
      { week: 'Неделя 1', focus: 'Распознавание буквенных комбинаций', activity: 'Ежедневная охота за словами 10 мин + словесное колесо 5 мин. Привыкайте сканировать сетки и находить типичные комбинации букв.' },
      { week: 'Неделя 2', focus: 'Расширение словарного запаса', activity: 'Загрузите пользовательские списки слов из учебников или справочников. Тренируйтесь 5 минут одиночно + 5 минут в дуэли с партнёром.' },
      { week: 'Неделя 3', focus: 'Скорость и точность под давлением', activity: 'Сократите время до 60-90 секунд. Играйте дуэли 1v1 с друзьями. Отмечайте, какие слова вызывают сложность.' },
      { week: 'Неделя 4+', focus: 'Целевая работа с проблемными словами', activity: 'Используйте статистику по ошибкам каждого участника, чтобы выявить слабые места (греко-латинские корни, молчаливые буквы, омофоны), и составьте специальный список для тренировки.' },
    ],
    faqHeading: 'Вопросы о подготовке к конкурсам.',
    faqs: [
      { q: 'Как бесплатно практиковать орфографию онлайн?', a: 'LexiClash предлагает три взаимодополняющих способа тренировки: сетки Boggle (находите все действительные слова из случайных букв), словесное колесо (составляйте длинные слова из выбранного набора) и анаграммы (переставляйте буквы для получения целевого слова). Всё полностью бесплатно, без регистрации, без приложения — просто откройте браузер и играйте. Несколько коротких сеансов в день укрепляют навык распознавания паттернов и тренируют запоминание в условиях спешки.' },
      { q: 'Как это помогает при подготовке к конкурсу?', a: 'Конкурсы проверяют три навыка: вспоминание под стрессом, распознавание орфографических паттернов и написание слова на слух. Словесные игры прямо тренируют первые два. Колесо и Boggle заставляют ваш мозг быстро сканировать комбинации букв и узнавать правильные слова. Анаграммы тренируют перестановку букв под нажимом — точно то же мышление, которое требуется при написании незнакомого слова по буквам.' },
      { q: 'Можно ли тренироваться в дуэли 1v1 с другим участником?', a: 'Да. Используйте режим дуэлей, чтобы встать один на один с соперником на одной сетке. Кто первый наберёт нужное количество очков — побеждает. Это отличная имитация реального конкурентного давления.' },
      { q: 'Подходит ли для конкурсов в школе, гимназии и университете?', a: 'Да — сложность полностью настраивается. Младшие участники могут использовать более короткие слова и больше времени; старшие сталкиваются с длинными и сложными словами с жёсткими ограничениями по времени. Вы можете загрузить специализированные списки для тренировки редких слов, научных терминов, географических названий и других сложных категорий.' },
      { q: 'Использует ли LexiClash списки слов из известных конкурсов?', a: 'LexiClash позволяет вам загружать любые собственные списки слов. Учителя и родители могут вставить списки из справочников, рекомендуемые для подготовки, или специальные словари по изучаемым дисциплинам. Встроенные списки содержат общий словарный запас для общей подготовки; ваши списки используются для узкоспециализированной тренировки.' },
      { q: 'Как часто нужно тренироваться?', a: 'Исследования показывают (Roediger & Karpicke 2006, Cepeda et al. 2008), что эффективнее всего: 10-15 минут 4-5 раз в неделю, распределённые по времени, а не интенсивная подготовка в последний момент. Сеансы LexiClash рассчитаны именно на такой режим: 5-10 минут совместной игры + 2-3 минуты индивидуальной работы.' },
      { q: 'Подходит ли для класса?', a: 'Да. Учитель может провести занятие для всего класса (до 30 человек присоединяются по коду из 4 цифр, без личных аккаунтов), организовать турниры с выбыванием или задать индивидуальные упражнения. Панель учителя показывает результаты каждого ученика и какие слова вызывают сложность — это помогает сосредоточить дополнительную работу на слабых местах.' },
      { q: 'Это бесплатно для отдельных учеников, занимающихся дома?', a: 'Да — полностью бесплатно, никаких платных функций, никакой подписки. Откройте браузер, выберите режим, начните тренироваться. Аккаунт не обязателен (но если создадите — будет сохранять ваши результаты и показывать вашу полоску успехов).' },
    ],
    bottomSectionHeading1: '10 минут в день.',
    bottomSectionHeading2: 'Грамотный до конца года.',
    noAppText: 'Нет приложения для установки, никакой подписки, никаких писем. Выберите режим и начните тренировку.',
    startDrillingLabel: '▶ Начать тренировку',
    seeEducationHubLabel: 'Посетить образовательный центр',
  },
};

export function getSpellingBeeContent(locale: string): LocaleContent {
  const normalizedLocale = locale.toLowerCase().split('-')[0];

  if (normalizedLocale === 'en' || !(EDUCATION_LOCALES as readonly string[]).includes(normalizedLocale)) {
    return content.en;
  }

  return content[normalizedLocale as EducationLocale];
}
