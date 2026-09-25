// Locale-aware copy for the Brain Training Word Games landing page.
// Native review pending for HE/SV/JA/ES — flagged in MEMORY for follow-up.

export type Locale = 'en' | 'he' | 'sv' | 'ja' | 'es' | 'ru';

export interface DrillCopy {
  name: string;
  domain: string;
  tagline: string;
  blurb: string;
  research: string;
}

export interface FaqCopy {
  q: string;
  a: string;
}

export interface StepCopy {
  step: string;
  title: string;
  sub: string;
}

export interface BrainLandingCopy {
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  ogTitle: string;
  ogDescription: string;
  twitterTitle: string;
  twitterDescription: string;

  marqueeBadges: string[];
  badge: string;
  h1Pre: string;
  h1Highlight: string;
  introP1: string;
  introP2: string;
  ctaPrimary: string;
  ctaSecondary: string;

  drillsHeading: string;
  drillsSub: string;
  researchLabel: string;
  drills: DrillCopy[];

  comparisonHeading: string;
  comparisonHeaders: string[];
  comparisonRows: string[][];
  comparisonFooter: string;

  howHeading: string;
  steps: StepCopy[];

  faqHeading: string;
  faqs: FaqCopy[];

  relatedHeading: string;
  relatedHubTitle: string;
  relatedHubSub: string;
  relatedScienceTitle: string;
  relatedScienceSub: string;
  relatedBestTitle: string;
  relatedBestSub: string;
  relatedDailyTitle: string;
  relatedDailySub: string;
  relatedWotdTitle: string;
  relatedWotdSub: string;
  relatedMpTitle: string;
  relatedMpSub: string;

  finalCtaHeading: string;
  finalCtaBody: string;
  finalCtaPrimary: string;
  finalCtaSecondary: string;

  videoGameName: string;
  videoGameDescription: string;
  itemListName: string;
  itemListDescription: string;
  itemListDescriptions: string[];
  howToName: string;
  howToDescription: string;
  howToSteps: { name: string; text: string }[];
}

const en: BrainLandingCopy = {
  metaTitle: 'Free Brain Training Word Games — 4 Drills, 4 Focus Areas',
  metaDescription: 'Free brain training word games — 4 drills plus a daily Brain Check. No download, no signup, 6 languages.',
  metaKeywords: 'brain training games online free, free brain games for adults, word brain games, cognitive exercises online, brain workout games, memory training games, concentration drills, brain drills, mental fitness app free, lumosity alternative free, elevate alternative, free cognitive training, online brain exercises, brain games no download',
  ogTitle: 'Free Brain Training Word Games — 4 Drills, 4 Focus Areas',
  ogDescription: '4 word drills, 60 seconds each, plus a daily Brain Check. Free, no download, 6 languages. A free alternative to Lumosity, Elevate, and Peak.',
  twitterTitle: 'Free Brain Training Word Games — 60 sec, 4 Areas',
  twitterDescription: '4 word drills plus a daily Brain Check. Free in your browser, no download.',

  marqueeBadges: ['4 DRILLS · 4 AREAS', '60 SECONDS EACH', 'DAILY BRAIN CHECK', 'FREE TO PLAY', 'NO DOWNLOAD', 'BROWSER-BASED'],
  badge: '★ Free Brain Workout ★',
  h1Pre: 'Free brain training,',
  h1Highlight: '4 drills, 60 seconds each.',
  introP1: 'Four word-based drills. Each one takes a minute. They’re inspired by tasks researchers use to study processing speed, working memory, attention, and vocabulary.',
  introP2: 'No signup wall. No paywall. No 7-day trial that auto-renews. Just open the brain hub and start training. Once a day per drill you can run a Brain Check — same fixed setup every time — and after about a week we’ll tell you, honestly, whether your numbers are trending up, holding steady, or it’s too early to say.',
  ctaPrimary: 'Start Brain Training Free',
  ctaSecondary: 'Try Lightning Round (60 sec)',

  drillsHeading: 'The 4 drills, the 4 areas',
  drillsSub: 'Each drill is inspired by tasks researchers like Adele Diamond (executive function) and Duke University (word-based memory studies) use to study these skills — it’s not a clinical instrument, just a game built in that spirit.',
  researchLabel: '★ Research context',
  drills: [
    { name: 'Lightning Round', domain: 'Processing Speed', tagline: 'How fast can you find words?', blurb: 'Sixty seconds. One grid. Find as many valid words as possible. Lightning Round is a speeded word-finding task — the closest a word game gets to a reaction-time test.', research: 'Processing speed is widely studied in cognitive-aging research and tends to decline earlier than other functions. Speeded word-retrieval tasks like this one resemble those used in verbal fluency research — we don’t claim playing this drill slows that decline.' },
    { name: 'Memory Hunt', domain: 'Working Memory', tagline: 'Hold it in your head, then recall', blurb: 'A sequence of letter positions flashes. The grid clears. You recall and form words from memory. Memory Hunt is a letter-sequence recall task — the kind of short-term hold-and-use challenge working-memory research is built around.', research: 'Working-memory span tasks are among the most-studied paradigms in cognitive-training literature (e.g., NIH-indexed PMC5930973), though how far any gains transfer beyond the task itself is still debated.' },
    { name: 'Combo Master', domain: 'Attention', tagline: 'Build long uninterrupted chains', blurb: 'Build chains of valid words without breaking the streak. Combo Master is a sustained-attention task — staying accurate across many consecutive responses without a lapse. Most word games reward bursts; this rewards endurance.', research: 'Sustained attention (vigilance) is studied via tasks like the Continuous Performance Test, and is linked to academic performance in the research literature.' },
    { name: 'Rare Gems', domain: 'Vocabulary', tagline: 'Find uncommon, high-value words', blurb: 'Common words score little. Rare words score big. Rare Gems is a vocabulary-depth task — your access to low-frequency words in memory. It rewards readers, crossword solvers, and word collectors.', research: 'Vocabulary is widely studied as one of the more stable cognitive measures across the lifespan, and word puzzles like crosswords are a well-known research area here (e.g., Duke, 2022) — Rare Gems is built in that spirit, not as a proven memory treatment.' },
  ],

  comparisonHeading: 'vs. the paid brain training apps',
  comparisonHeaders: ['Feature', 'LexiClash', 'Lumosity', 'Elevate', 'Peak'],
  comparisonRows: [
    ['Price', 'Free, no paywall', '$11.99/mo Premium', '$49.99/yr Pro', '$49.99/yr Pro'],
    ['Free games', '4 drills, all unlocked', '3/day rotation', '3/day rotation', '4/day rotation'],
    ['Signup required', 'No (optional)', 'Yes', 'Yes', 'Yes'],
    ['Word focus', '100% word-based', 'Mixed (math/logic)', 'Heavy on word', 'Mixed'],
    ['Areas tracked', '4, via daily Brain Check', '5 areas', '5 categories', '6 categories'],
    ['Languages', '5 (incl. RTL Hebrew)', 'English mainly', 'English/ES/PT', 'English mainly'],
    ['Browser play', 'Yes, no download', 'Web + app', 'App only', 'App only'],
    ['Research citations visible', 'Yes, in-app', 'Marketing pages', 'Marketing pages', 'Marketing pages'],
  ],
  comparisonFooter: 'FTC fined Lumosity $2M in 2016 for unsupported transfer claims. We don’t promise IQ, memory, or general cognitive gains. Brain Check just shows you, honestly, whether your performance on these specific word tasks is trending up over time.',

  howHeading: 'How it works',
  steps: [
    { step: '1', title: 'Pick a drill', sub: 'Four areas: speed, memory, attention, vocabulary. All unlocked from day one — play any, any order.' },
    { step: '2', title: 'Play 60 seconds', sub: 'One short focused round. Difficulty adapts — clear a level and it steps up, struggle twice in a row and it eases off.' },
    { step: '3', title: 'Run a Brain Check', sub: 'Once a day per drill, under the same fixed setup every time — no boosts. Your first check is just a warm-up.' },
    { step: '4', title: 'Get an honest verdict', sub: 'After about a week of checks, we tell you if you’re trending up, holding steady, or if it’s too early to say — no 0-100 score, no tiers.' },
  ],

  faqHeading: 'Frequently Asked Questions',
  faqs: [
    { q: 'Are brain training word games actually backed by research?', a: 'Our drills are inspired by tasks researchers use to study specific skills — for example, speeded word-retrieval resembles verbal fluency tests, and letter-sequence recall resembles classic working-memory span tasks. That’s different from saying LexiClash itself has been proven to improve memory, IQ, or general cognition — no consumer brain-training app has robust evidence for that, and we don’t claim it. What we do measure honestly is your performance on these specific tasks, via daily Brain Check.' },
    { q: 'How long does a brain training session need to be?', a: 'Each LexiClash drill is 60 seconds. Short, frequent sessions are easier to stick with than long ones. Three drills a day is under 5 minutes and touches all four areas across a week.' },
    { q: 'Is LexiClash a free alternative to Lumosity, Elevate, or Peak?', a: 'Yes. Lumosity Premium is roughly $12/month, Elevate Pro about $50/year, Peak Pro $50+/year. LexiClash’s 4 drills are free with no paywall, no signup wall, and no time limit. Trade-off: Lumosity covers 40+ games across math, logic, and word; LexiClash focuses on word-based drills only — narrower scope, deeper word-skill signal.' },
    { q: 'What cognitive areas do the 4 brain drills target?', a: 'Lightning Round is a word-finding speed task. Memory Hunt is a letter-sequence recall task. Combo Master is a sustained-attention task. Rare Gems is a vocabulary-depth task. Each one is inspired by a type of task researchers use to study that skill, and Brain Check tracks your own trend on each — there’s no combined 0-100 score.' },
    { q: 'What is Brain Check, and how does it work?', a: 'Once a day per drill, you can run a Brain Check — the exact same fixed difficulty every time, no boosts, so results are comparable day to day. Your first check is a warm-up and doesn’t count. Checks 2 and 3 set your baseline. After that, we only report a change once your recent checks move more than your own normal day-to-day variation, over at least a week — a method called the Reliable Change Index. Otherwise you’ll see “keep going” or “holding steady.” Honest limit: Brain Check measures your performance on these specific word tasks under fixed conditions. It’s not a memory test, an IQ score, or proof of general cognitive change.' },
    { q: 'Are there brain training games for kids or seniors?', a: 'LexiClash drills work for ages 12+, with vocabulary scaled to player skill. For older players, short language-based tasks like these sit in a well-studied area of cognitive-aging research — verbal fluency and word retrieval tend to decline earlier than other skills. The 60-second format is also low-fatigue. Brain Check tracks performance on these tasks only — it’s not a medical or diagnostic assessment.' },
    { q: 'Do brain games actually transfer to real-world thinking?', a: 'Honest answer: we don’t claim they do, and you should be skeptical of any app that does. The 2014 Stanford consensus letter and the 2016 FTC case against Lumosity ($2M fine) both called out unsupported transfer claims. LexiClash doesn’t promise IQ gains, memory improvement, or slowed cognitive decline. What Brain Check measures is your performance on these specific word tasks, honestly, over time — nothing more.' },
    { q: 'Can I track my progress over time?', a: 'Yes, two ways. Training runs use an adaptive staircase — clear a level and it gets harder next time; struggle twice in a row and it eases off, so you’re always playing at your edge. Brain Check runs (once a day per drill, fixed difficulty) build a history, and after at least a week of checks you get a reliable-change verdict instead of a noisy score.' },
    { q: 'What languages do the brain drills support?', a: 'English, Hebrew, Swedish, Japanese, Spanish, and Russian. Each language has its own dictionary and rare-word frequency data, and RTL is fully supported for Hebrew. Brain Check results are specific to the language and drill you played.' },
  ],

  relatedHeading: 'Related',
  relatedHubTitle: 'Brain Training Hub',
  relatedHubSub: '4 drills, Brain Check history, adaptive levels',
  relatedScienceTitle: 'The Science of Word Games',
  relatedScienceSub: 'Long-form: research, citations, training tips',
  relatedBestTitle: 'Best Online Word Games 2026',
  relatedBestSub: '9 games ranked, honest pros & cons',
  relatedDailyTitle: 'Daily Challenge',
  relatedDailySub: 'Word Wheel + Word Hunt Survival',
  relatedWotdTitle: 'Word of the Day',
  relatedWotdSub: 'Vocabulary depth, daily ritual',
  relatedMpTitle: 'Multiplayer',
  relatedMpSub: 'Real-time word-finding, 2-20+ players',

  finalCtaHeading: 'Ready for a 60-second workout?',
  finalCtaBody: 'Pick a drill. Spend a minute. Come back tomorrow for another. Run a Brain Check once a day if you want an honest read on your trend — no score, no tiers, just your own numbers over time.',
  finalCtaPrimary: 'Open Brain Hub',
  finalCtaSecondary: 'Quick Start: Lightning Round',

  videoGameName: 'LexiClash Brain Drills',
  videoGameDescription: 'Free brain training word games — 4 drills (60 seconds each) inspired by tasks researchers use to study processing speed, working memory, attention, and vocabulary, plus a daily Brain Check that tracks your trend honestly. Browser-based, no download, no signup, 6 languages.',
  itemListName: '4 Brain Training Drills',
  itemListDescription: 'Four 60-second word drills, each inspired by a task researchers use to study a distinct cognitive skill.',
  itemListDescriptions: [
    'Find as many words as possible in 60 seconds. Inspired by speeded word-retrieval tasks used to study processing speed.',
    'Memorize a sequence of letter positions, then recall words from them. Inspired by working-memory span tasks.',
    'Build long uninterrupted word chains. Inspired by sustained-attention tasks like the Continuous Performance Test.',
    'Find uncommon and high-value words. Inspired by vocabulary-depth and lexical-retrieval tasks.',
  ],
  howToName: 'How to Start Free Brain Training in 60 Seconds',
  howToDescription: 'Begin a daily brain workout with LexiClash drills — four areas, 60 seconds each, no signup required.',
  howToSteps: [
    { name: 'Open the brain hub', text: 'Visit lexiclash.live/en/brain. No signup required to play your first drills.' },
    { name: 'Pick an area to train', text: 'Choose from 4 areas: processing speed, working memory, attention, or vocabulary. Each drill takes 60 seconds.' },
    { name: 'Play the drill', text: 'Find words on a grid for one minute. Difficulty adapts — clear a level and it steps up, struggle twice and it eases off.' },
    { name: 'Run a Brain Check', text: 'Once a day per drill, play under the same fixed setup as everyone else. After about a week of checks, get an honest verdict: trending up, holding steady, or not enough data yet.' },
    { name: 'Train daily', text: 'Three drills per day takes under 5 minutes and covers all 4 areas across a week.' },
  ],
};

const he: BrainLandingCopy = {
  metaTitle: 'משחקי אימון מוח חינם — 4 תרגילים, 4 תחומים',
  metaDescription: 'משחקי אימון מוח חינם אונליין — 4 תרגילי מילים למהירות עיבוד, זיכרון עבודה, ריכוז ואוצר מילים, ובדיקת מוח יומית. בלי הורדה, בלי הרשמה, ב-6 שפות.',
  metaKeywords: 'משחקי אימון מוח חינם, משחקי מוח לכולם, אימון קוגניטיבי, תרגילי זיכרון, משחקי מילים למוח, lumosity חלופה חינם, אימון מוח אונליין, משחקי ריכוז, תרגילי מוח, אימון מוחי, משחקי חשיבה',
  ogTitle: 'משחקי אימון מוח חינם — 4 תרגילים, 4 תחומים',
  ogDescription: '4 תרגילי מילים, 60 שניות כל אחד, ובדיקת מוח יומית. חינם, בלי הורדה, ב-6 שפות. חלופה חינמית ל-Lumosity, Elevate ו-Peak.',
  twitterTitle: 'אימון מוח חינם — 60 שניות, 4 תחומים',
  twitterDescription: '4 תרגילי מילים ובדיקת מוח יומית. חינם בדפדפן, בלי הורדה.',

  marqueeBadges: ['4 תרגילים · 4 תחומים', '60 שניות לכל אחד', 'בדיקת מוח יומית', 'חינם לשחק', 'בלי הורדה', 'בדפדפן'],
  badge: '★ אימון מוח חינם ★',
  h1Pre: 'אימון מוח חינם,',
  h1Highlight: '4 תרגילים, 60 שניות כל אחד.',
  introP1: 'ארבעה תרגילים קוגניטיביים מבוססי מילים. כל אחד נמשך דקה. הם בנויים בהשראת משימות שחוקרים משתמשים בהן כדי לבחון מהירות עיבוד, זיכרון עבודה, ריכוז ואוצר מילים.',
  introP2: 'בלי קיר הרשמה. בלי תשלום. בלי תקופת ניסיון של 7 ימים שמתחדשת אוטומטית. פשוט פותחים את מרכז המוח ומתחילים. פעם ביום לכל תרגיל אפשר להריץ בדיקת מוח — באותו סטאפ קבוע בכל פעם — ואחרי כשבוע נגיד לכם בכנות אם המספרים במגמת עלייה, יציבים, או שעוד מוקדם לדעת.',
  ctaPrimary: 'התחילו אימון מוח חינם',
  ctaSecondary: 'נסו Lightning Round (60 שניות)',

  drillsHeading: '4 התרגילים, 4 התחומים',
  drillsSub: 'כל תרגיל בנוי בהשראת משימות שחוקרים כמו אדל דיימונד (תפקודים ניהוליים) ואוניברסיטת דיוק (אימון זיכרון מבוסס מילים) משתמשים בהן כדי לבחון את התחומים האלה — זה לא כלי קליני, רק משחק שנבנה באותה רוח.',
  researchLabel: '★ הקשר מחקרי',
  drills: [
    { name: 'Lightning Round', domain: 'מהירות עיבוד', tagline: 'כמה מהר תמצאו מילים?', blurb: 'שישים שניות. רשת אחת. למצוא כמה שיותר מילים תקפות. Lightning Round הוא תרגיל מציאת מילים במהירות — הדבר הכי קרוב שמשחק מילים מגיע לבחינת זמן תגובה.', research: 'מהירות עיבוד נחקרת רבות בתחום ההזדקנות הקוגניטיבית ונוטה לרדת מוקדם יותר מתפקודים אחרים. משימות שליפת מילים מהירה כמו זו דומות לאלו שמשמשות במחקרי שטף מילולי — אנחנו לא טוענים שהתרגיל מאט את הירידה הזו.' },
    { name: 'Memory Hunt', domain: 'זיכרון עבודה', tagline: 'תזכרו, ואז תיזכרו', blurb: 'רצף של מיקומי אותיות נדלק. הרשת מתנקה. אתם נזכרים ובונים מילים מהזיכרון. Memory Hunt הוא תרגיל זכירת רצף אותיות — סוג האתגר שמחקר זיכרון העבודה בנוי סביבו.', research: 'משימות טווח זיכרון עבודה הן מהנחקרות ביותר בספרות המחקר (למשל מחקר ב-NIH, PMC5930973), אך עד כמה רווחים כאלה עוברים מעבר למשימה עצמה עדיין שנוי במחלוקת.' },
    { name: 'Combo Master', domain: 'ריכוז', tagline: 'בנו רצפים ארוכים בלי להפסיק', blurb: 'בנו רצפים של מילים תקפות בלי לשבור את הרצף. Combo Master הוא תרגיל ריכוז ממושך — לשמור על דיוק לאורך הרבה תגובות עוקבות בלי הסחות. רוב משחקי המילים מתגמלים פרצי מהירות; זה מתגמל התמדה.', research: 'ריכוז ממושך נחקר במשימות כמו מבחן הביצוע הרציף, וקשור בספרות המחקר להישגים אקדמיים.' },
    { name: 'Rare Gems', domain: 'אוצר מילים', tagline: 'מצאו מילים נדירות ויקרות', blurb: 'מילים נפוצות שוות מעט. מילים נדירות שוות הרבה. Rare Gems הוא תרגיל עומק אוצר מילים — הגישה שלכם למילים בתדירות נמוכה בזיכרון. הוא מתגמל קוראים, פותרי תשבצים ואספני מילים.', research: 'אוצר מילים נחשב לאחד המדדים הקוגניטיביים היציבים ביותר לאורך החיים, וחידות מילים כמו תשבצים הן תחום מחקר מוכר (למשל דיוק, 2022) — Rare Gems נבנה באותה רוח, לא כטיפול מוכח לזיכרון.' },
  ],

  comparisonHeading: 'בהשוואה לאפליקציות מוח בתשלום',
  comparisonHeaders: ['תכונה', 'LexiClash', 'Lumosity', 'Elevate', 'Peak'],
  comparisonRows: [
    ['מחיר', 'חינם, בלי תשלום', '$11.99/חודש Premium', '$49.99/שנה Pro', '$49.99/שנה Pro'],
    ['משחקי חינם', '4 תרגילים, הכל פתוח', '3 ביום ברוטציה', '3 ביום ברוטציה', '4 ביום ברוטציה'],
    ['הרשמה נדרשת', 'לא (אופציונלי)', 'כן', 'כן', 'כן'],
    ['מיקוד מילים', '100% מבוסס מילים', 'מעורב (מתמטיקה/לוגיקה)', 'דגש על מילים', 'מעורב'],
    ['תחומים נמדדים', '4, דרך בדיקת מוח יומית', '5 תחומים', '5 קטגוריות', '6 קטגוריות'],
    ['שפות', '5 (כולל עברית RTL)', 'בעיקר אנגלית', 'אנגלית/ספרדית/פורט.', 'בעיקר אנגלית'],
    ['משחק בדפדפן', 'כן, בלי הורדה', 'אתר + אפליקציה', 'אפליקציה בלבד', 'אפליקציה בלבד'],
    ['ציטוטי מחקר גלויים', 'כן, באפליקציה', 'בעמודי שיווק', 'בעמודי שיווק', 'בעמודי שיווק'],
  ],
  comparisonFooter: 'ה-FTC קנס את Lumosity ב-2 מיליון דולר ב-2016 על טענות העברה לא מבוססות. אנחנו לא מבטיחים עלייה ב-IQ, בזיכרון או בקוגניציה הכללית. בדיקת המוח פשוט מראה לכם, בכנות, אם הביצועים שלכם במשימות המילים הספציפיות האלה במגמת עלייה לאורך זמן.',

  howHeading: 'איך זה עובד',
  steps: [
    { step: '1', title: 'בחרו תרגיל', sub: 'ארבעה תחומים: מהירות, זיכרון, ריכוז ואוצר מילים. הכל פתוח מהיום הראשון — שחקו בכל תרגיל, בכל סדר.' },
    { step: '2', title: 'שחקו 60 שניות', sub: 'סיבוב קצר וממוקד. הקושי מתאים את עצמו — עוברים רמה והיא עולה, נכשלים פעמיים ברצף והיא יורדת.' },
    { step: '3', title: 'הריצו בדיקת מוח', sub: 'פעם ביום לכל תרגיל, באותו סטאפ קבוע בכל פעם — בלי בוסטים. הבדיקה הראשונה היא רק חימום.' },
    { step: '4', title: 'קבלו תשובה כנה', sub: 'אחרי כשבוע של בדיקות נגיד לכם אם אתם במגמת עלייה, יציבים, או שעוד מוקדם לדעת — בלי ציון 0-100, בלי דרגות.' },
  ],

  faqHeading: 'שאלות נפוצות',
  faqs: [
    { q: 'האם משחקי אימון מוח באמת מבוססי מחקר?', a: 'התרגילים שלנו בנויים בהשראת משימות שחוקרים משתמשים בהן לבחון מיומנויות ספציפיות — למשל, שליפת מילים מהירה דומה למבחני שטף מילולי, וזכירת רצף אותיות דומה למשימות טווח זיכרון עבודה קלאסיות. זה שונה מלהגיד ש-LexiClash הוכיחה שהיא משפרת זיכרון, IQ או קוגניציה כללית — לאף אפליקציית אימון מוח צרכנית אין הוכחה מוצקה לכך, ואנחנו לא טוענים את זה. מה שאנחנו כן מודדים בכנות זה הביצועים שלכם במשימות הספציפיות האלה, דרך בדיקת המוח היומית.' },
    { q: 'כמה זמן צריך אימון מוח?', a: 'כל תרגיל ב-LexiClash הוא 60 שניות. סשנים קצרים ותכופים קל יותר להתמיד בהם מסשנים ארוכים. שלושה תרגילים ביום זה פחות מ-5 דקות ונוגע בכל ארבעת התחומים במהלך השבוע.' },
    { q: 'האם LexiClash היא חלופה חינמית ל-Lumosity, Elevate או Peak?', a: 'כן. Lumosity Premium עולה כ-12$ לחודש, Elevate Pro כ-50$ בשנה, Peak Pro 50$+ בשנה. 4 התרגילים של LexiClash חינמיים ללא תשלום, בלי קיר הרשמה ובלי הגבלת זמן. הטרייד-אוף: Lumosity מכסה 40+ משחקים במתמטיקה, לוגיקה ומילים; LexiClash מתמקדת רק בתרגילי מילים — טווח צר יותר, סיגנל עמוק יותר על כישורי מילים.' },
    { q: 'אילו תחומים קוגניטיביים מטופלים על ידי 4 התרגילים?', a: 'Lightning Round הוא תרגיל מהירות מציאת מילים. Memory Hunt הוא תרגיל זכירת רצף אותיות. Combo Master הוא תרגיל ריכוז ממושך. Rare Gems הוא תרגיל עומק אוצר מילים. כל אחד בנוי בהשראת סוג משימה שחוקרים משתמשים בה כדי לבחון את המיומנות הזו, ובדיקת המוח עוקבת אחרי המגמה שלכם בכל אחד — אין ציון משולב מ-0 עד 100.' },
    { q: 'מהי בדיקת המוח, ואיך היא עובדת?', a: 'פעם ביום לכל תרגיל אפשר להריץ בדיקת מוח — אותו קושי קבוע בכל פעם, בלי בוסטים, כך שהתוצאות ניתנות להשוואה מיום ליום. הבדיקה הראשונה היא חימום ולא נספרת. בדיקות 2 ו-3 קובעות את קו הבסיס שלכם. אחרי זה, אנחנו מדווחים על שינוי רק כשהבדיקות האחרונות זזות יותר מהתנודתיות היומיומית הרגילה שלכם, לאורך שבוע לפחות — שיטה שנקראת Reliable Change Index. אחרת תראו "המשיכו" או "יציבים". המגבלה הכנה: בדיקת המוח מודדת ביצועים במשימות המילים הספציפיות האלה בתנאים קבועים. זה לא מבחן זיכרון, לא ציון IQ ולא הוכחה לשינוי קוגניטיבי כללי.' },
    { q: 'האם יש משחקי אימון מוח לילדים או למבוגרים?', a: 'תרגילי LexiClash מתאימים לגילאי 12+ עם אוצר מילים שמותאם לרמת השחקן. למבוגרים, משימות שפה קצרות כמו אלה נמצאות בתחום מחקר מוכר של הזדקנות קוגניטיבית — שטף מילולי ושליפת מילים נוטים לרדת מוקדם יותר מיכולות אחרות. הפורמט של 60 שניות גם פחות מעייף. בדיקת המוח עוקבת רק אחרי ביצועים במשימות האלה — זו לא בדיקה רפואית או אבחנתית.' },
    { q: 'האם משחקי מוח באמת מועילים לחשיבה היומיומית?', a: 'תשובה כנה: אנחנו לא טוענים את זה, וכדאי להיות סקפטיים כלפי כל אפליקציה שכן. מכתב הקונצנזוס של סטנפורד ב-2014 והתביעה של ה-FTC נגד Lumosity ב-2016 (קנס של 2 מיליון דולר) שניהם הצביעו על טענות העברה לא מבוססות. LexiClash לא מבטיחה עלייה ב-IQ, שיפור זיכרון או האטת ירידה קוגניטיבית. מה שבדיקת המוח מודדת זה הביצועים שלכם במשימות המילים הספציפיות האלה, בכנות, לאורך זמן — לא יותר מזה.' },
    { q: 'האם אני יכול לעקוב אחר ההתקדמות שלי לאורך זמן?', a: 'כן, בשתי דרכים. סבבי אימון משתמשים בסולם מתאים — עוברים רמה והיא קשה יותר בפעם הבאה; נכשלים פעמיים ברצף והיא קלה יותר, כך שתמיד משחקים בגבול היכולת שלכם. הריצות של בדיקת המוח (פעם ביום לכל תרגיל, קושי קבוע) בונות היסטוריה, ואחרי שבוע לפחות של בדיקות תקבלו פסק דין מהימן על שינוי במקום ציון רועש.' },
    { q: 'אילו שפות תרגילי המוח תומכים?', a: 'אנגלית, עברית, שוודית, יפנית, ספרדית ורוסית. לכל שפה מילון משלה ונתוני תדירות מילים נדירות. RTL נתמך במלואו לעברית. תוצאות בדיקת המוח ספציפיות לשפה ולתרגיל ששיחקתם.' },
  ],

  relatedHeading: 'קשור',
  relatedHubTitle: 'מרכז אימון המוח',
  relatedHubSub: '4 תרגילים, היסטוריית בדיקת מוח, רמות מתאימות',
  relatedScienceTitle: 'המדע של משחקי מילים',
  relatedScienceSub: 'מאמר ארוך: מחקר, ציטוטים, טיפים לאימון',
  relatedBestTitle: 'משחקי המילים הטובים ביותר 2026',
  relatedBestSub: '9 משחקים מדורגים, יתרונות וחסרונות כנים',
  relatedDailyTitle: 'אתגר יומי',
  relatedDailySub: 'גלגל המילים + הישרדות ציד מילים',
  relatedWotdTitle: 'מילת היום',
  relatedWotdSub: 'עומק אוצר מילים, טקס יומי',
  relatedMpTitle: 'מולטיפלייר',
  relatedMpSub: 'מציאת מילים בזמן אמת, 2-20+ שחקנים',

  finalCtaHeading: 'מוכנים לאימון של 60 שניות?',
  finalCtaBody: 'בחרו תרגיל. השקיעו דקה. חזרו מחר לעוד אחד. הריצו בדיקת מוח פעם ביום אם אתם רוצים תשובה כנה על המגמה שלכם — בלי ציון, בלי דרגות, רק המספרים שלכם לאורך זמן.',
  finalCtaPrimary: 'פתחו את מרכז המוח',
  finalCtaSecondary: 'התחלה מהירה: Lightning Round',

  videoGameName: 'תרגילי המוח של LexiClash',
  videoGameDescription: 'משחקי אימון מוח מבוססי מילים חינם — 4 תרגילים (60 שניות כל אחד) בהשראת משימות שחוקרים משתמשים בהן לבחון מהירות עיבוד, זיכרון עבודה, ריכוז ואוצר מילים, ובדיקת מוח יומית שעוקבת אחרי המגמה שלכם בכנות. בדפדפן, בלי הורדה, בלי הרשמה, ב-6 שפות.',
  itemListName: '4 תרגילי אימון מוח',
  itemListDescription: 'ארבעה תרגילים בני 60 שניות, כל אחד בהשראת משימה שחוקרים משתמשים בה לבחון מיומנות קוגניטיבית מסוימת.',
  itemListDescriptions: [
    'מצאו כמה שיותר מילים ב-60 שניות. בהשראת משימות שליפת מילים מהירה שמשמשות לבחון מהירות עיבוד.',
    'שננו רצף של מיקומי אותיות, ואז היזכרו במילים מהם. בהשראת משימות טווח זיכרון עבודה.',
    'בנו רצפי מילים ארוכים. בהשראת משימות ריכוז ממושך כמו מבחן הביצוע הרציף.',
    'מצאו מילים נדירות ויקרות. בהשראת משימות עומק אוצר מילים ושליפה לקסיקלית.',
  ],
  howToName: 'איך להתחיל אימון מוח חינם ב-60 שניות',
  howToDescription: 'התחילו אימון מוח יומי עם תרגילי LexiClash — ארבעה תחומים, 60 שניות לכל אחד, בלי הרשמה.',
  howToSteps: [
    { name: 'פתחו את מרכז המוח', text: 'היכנסו ל-lexiclash.live/he/brain. אין צורך בהרשמה לתרגילים הראשונים.' },
    { name: 'בחרו תחום לאמן', text: 'בחרו מבין 4 תחומים: מהירות עיבוד, זיכרון עבודה, ריכוז או אוצר מילים. כל תרגיל אורך 60 שניות.' },
    { name: 'שחקו את התרגיל', text: 'מצאו מילים על רשת לדקה. הקושי מתאים את עצמו — עוברים רמה והיא עולה, נכשלים פעמיים והיא יורדת.' },
    { name: 'הריצו בדיקת מוח', text: 'פעם ביום לכל תרגיל, שחקו באותו סטאפ קבוע כמו כולם. אחרי כשבוע של בדיקות תקבלו תשובה כנה: במגמת עלייה, יציבים, או שעוד אין מספיק נתונים.' },
    { name: 'התאמנו יומיומית', text: 'שלושה תרגילים ביום אורכים פחות מ-5 דקות ומכסים את כל 4 התחומים במהלך השבוע.' },
  ],
};

const sv: BrainLandingCopy = {
  metaTitle: 'Gratis hjärnträning ordspel — 4 övningar, 4 fokusområden',
  metaDescription: 'Gratis hjärnträningsspel — 4 ordövningar plus daglig Hjärnkoll. Ingen nedladdning, ingen registrering, 6 språk.',
  metaKeywords: 'gratis hjärnträning, hjärnträning online, ordspel hjärnträning, kognitiva övningar, minnesträning, koncentrationsövningar, lumosity gratis alternativ, elevate alternativ, mental träning, hjärngym, ordspel för minnet',
  ogTitle: 'Gratis hjärnträning ordspel — 4 övningar, 4 fokusområden',
  ogDescription: '4 ordövningar, 60 sekunder vardera, plus daglig Hjärnkoll. Gratis, ingen nedladdning, 6 språk. Ett gratis alternativ till Lumosity, Elevate och Peak.',
  twitterTitle: 'Gratis hjärnträning — 60 sek, 4 områden',
  twitterDescription: '4 ordövningar plus daglig Hjärnkoll. Gratis i webbläsaren.',

  marqueeBadges: ['4 ÖVNINGAR · 4 OMRÅDEN', '60 SEKUNDER VARDERA', 'DAGLIG HJÄRNKOLL', 'GRATIS ATT SPELA', 'INGEN NEDLADDNING', 'I WEBBLÄSAREN'],
  badge: '★ Gratis hjärngym ★',
  h1Pre: 'Gratis hjärnträning,',
  h1Highlight: '4 övningar, 60 sek vardera.',
  introP1: 'Fyra ordbaserade övningar. Var och en tar en minut. De är inspirerade av uppgifter forskare använder för att studera processhastighet, arbetsminne, uppmärksamhet och ordförråd.',
  introP2: 'Ingen registrering. Ingen betalvägg. Ingen 7-dagars gratis testperiod som förnyas automatiskt. Öppna bara hjärnnavet och börja träna. En gång om dagen per övning kan du köra en Hjärnkoll — samma fasta upplägg varje gång — och efter ungefär en vecka berättar vi ärligt om dina siffror pekar uppåt, håller sig stabila, eller om det är för tidigt att säga.',
  ctaPrimary: 'Börja gratis hjärnträning',
  ctaSecondary: 'Prova Lightning Round (60 sek)',

  drillsHeading: 'De 4 övningarna, de 4 områdena',
  drillsSub: 'Varje övning är inspirerad av uppgifter som forskare som Adele Diamond (exekutiva funktioner) och Duke University (ordbaserad minnesträning) använder för att studera dessa förmågor — det är inget kliniskt instrument, bara ett spel byggt i samma anda.',
  researchLabel: '★ Forskningskontext',
  drills: [
    { name: 'Lightning Round', domain: 'Processhastighet', tagline: 'Hur snabbt hittar du ord?', blurb: 'Sextio sekunder. Ett rutnät. Hitta så många giltiga ord som möjligt. Lightning Round är en snabb ordsökningsövning — det närmaste ett ordspel kommer ett reaktionstest.', research: 'Processhastighet är väl studerat inom forskning om kognitivt åldrande och tenderar att minska tidigare än andra funktioner. Snabba ordhämtningsuppgifter som denna liknar dem som används i forskning om verbal flyt — vi påstår inte att övningen bromsar den nedgången.' },
    { name: 'Memory Hunt', domain: 'Arbetsminne', tagline: 'Behåll i minnet, sedan minns', blurb: 'En sekvens av bokstavspositioner blinkar. Rutnätet rensas. Du minns och bildar ord från minnet. Memory Hunt är en uppgift för att minnas en bokstavssekvens — den typ av kortvarigt håll-och-använd-utmaning som arbetsminnesforskning bygger på.', research: 'Uppgifter om arbetsminnesspann hör till de mest studerade paradigmen i forskningslitteraturen (t.ex. NIH-indexerad PMC5930973), men hur långt eventuella vinster sträcker sig bortom själva uppgiften diskuteras fortfarande.' },
    { name: 'Combo Master', domain: 'Uppmärksamhet', tagline: 'Bygg långa obrutna kedjor', blurb: 'Bygg kedjor av giltiga ord utan att bryta sviten. Combo Master är en uppgift för uthållig uppmärksamhet — att hålla precisionen genom många svar i rad utan luckor. De flesta ordspel belönar korta ryck; det här belönar uthållighet.', research: 'Uthållig uppmärksamhet studeras via uppgifter som Continuous Performance Test, och kopplas i forskningslitteraturen till akademiska prestationer.' },
    { name: 'Rare Gems', domain: 'Ordförråd', tagline: 'Hitta ovanliga, värdefulla ord', blurb: 'Vanliga ord ger lite poäng. Sällsynta ord ger mycket. Rare Gems är en ordförrådsdjupsövning — din tillgång till lågfrekventa ord i minnet. Den belönar läsare, korsordslösare och ordsamlare.', research: 'Ordförråd räknas som ett av de mer stabila kognitiva måtten över livstiden, och ordpussel som korsord är ett välkänt forskningsområde här (t.ex. Duke, 2022) — Rare Gems är byggt i samma anda, inte som en bevisad minnesbehandling.' },
  ],

  comparisonHeading: 'jämfört med betalda hjärnträningsappar',
  comparisonHeaders: ['Funktion', 'LexiClash', 'Lumosity', 'Elevate', 'Peak'],
  comparisonRows: [
    ['Pris', 'Gratis, ingen betalvägg', '$11.99/mån Premium', '$49.99/år Pro', '$49.99/år Pro'],
    ['Gratisspel', '4 övningar, alla upplåsta', '3/dag rotation', '3/dag rotation', '4/dag rotation'],
    ['Registrering krävs', 'Nej (valfri)', 'Ja', 'Ja', 'Ja'],
    ['Ordfokus', '100% ordbaserad', 'Blandat (matte/logik)', 'Mycket ord', 'Blandat'],
    ['Områden som följs', '4, via daglig Hjärnkoll', '5 områden', '5 kategorier', '6 kategorier'],
    ['Språk', '5 (inkl. RTL hebreiska)', 'Främst engelska', 'Engelska/SP/PT', 'Främst engelska'],
    ['Spel i webbläsaren', 'Ja, ingen nedladdning', 'Webb + app', 'Endast app', 'Endast app'],
    ['Forskningscitat synliga', 'Ja, i appen', 'Marknadssidor', 'Marknadssidor', 'Marknadssidor'],
  ],
  comparisonFooter: 'FTC bötfällde Lumosity med $2M 2016 för obekräftade transferpåståenden. Vi lovar inga vinster i IQ, minne eller allmän kognition. Hjärnkoll visar dig bara, ärligt, om dina resultat på just dessa ordövningar pekar uppåt över tid.',

  howHeading: 'Så fungerar det',
  steps: [
    { step: '1', title: 'Välj en övning', sub: 'Fyra områden: hastighet, minne, uppmärksamhet, ordförråd. Alla upplåsta från dag ett — spela vilken som helst, i valfri ordning.' },
    { step: '2', title: 'Spela 60 sekunder', sub: 'En kort fokuserad runda. Svårigheten anpassar sig — klarar du en nivå går den upp, misslyckas du två gånger i rad går den ner.' },
    { step: '3', title: 'Kör en Hjärnkoll', sub: 'En gång om dagen per övning, med samma fasta upplägg varje gång — inga boostar. Din första koll är bara en uppvärmning.' },
    { step: '4', title: 'Få ett ärligt besked', sub: 'Efter ungefär en vecka av kollar berättar vi om du pekar uppåt, håller dig stabil, eller om det är för tidigt att säga — ingen poäng 0-100, inga nivåmärken.' },
  ],

  faqHeading: 'Vanliga frågor',
  faqs: [
    { q: 'Är hjärnträningsspel verkligen forskningsbaserade?', a: 'Våra övningar är inspirerade av uppgifter forskare använder för att studera specifika förmågor — snabb ordhämtning liknar till exempel test av verbal flyt, och att minnas en bokstavssekvens liknar klassiska arbetsminnesuppgifter. Det är något annat än att säga att LexiClash i sig har bevisats förbättra minne, IQ eller allmän kognition — ingen konsumentapp för hjärnträning har robusta bevis för det, och vi påstår inte det. Det vi mäter ärligt är dina resultat på just dessa uppgifter, via daglig Hjärnkoll.' },
    { q: 'Hur lång behöver en hjärnträningssession vara?', a: 'Varje LexiClash-övning är 60 sekunder. Korta, täta pass är lättare att hålla fast vid än långa. Tre övningar om dagen tar under 5 minuter och rör alla fyra områden under en vecka.' },
    { q: 'Är LexiClash ett gratis alternativ till Lumosity, Elevate eller Peak?', a: 'Ja. Lumosity Premium kostar cirka $12/månad, Elevate Pro cirka $50/år, Peak Pro $50+/år. LexiClashs 4 övningar är gratis utan betalvägg, registreringsvägg eller tidsgräns. Avvägningen: Lumosity täcker 40+ spel inom matte, logik och ord; LexiClash fokuserar bara på ordövningar — smalare omfång, djupare signal om ordfärdigheter.' },
    { q: 'Vilka kognitiva områden tränar de 4 hjärnövningarna?', a: 'Lightning Round är en uppgift för att hitta ord snabbt. Memory Hunt är en uppgift för att minnas en bokstavssekvens. Combo Master är en uppgift för uthållig uppmärksamhet. Rare Gems är en ordförrådsdjupsövning. Var och en är inspirerad av en typ av uppgift forskare använder för att studera just den förmågan, och Hjärnkoll följer din egen trend på var och en — det finns ingen sammanslagen poäng 0-100.' },
    { q: 'Vad är Hjärnkoll och hur fungerar det?', a: 'En gång om dagen per övning kan du köra en Hjärnkoll — exakt samma fasta svårighetsgrad varje gång, inga boostar, så resultaten går att jämföra dag för dag. Din första koll är en uppvärmning och räknas inte. Kollar 2 och 3 sätter din baslinje. Efter det rapporterar vi bara en förändring när dina senaste kollar rör sig mer än din egen normala dag-till-dag-variation, under minst en vecka — en metod som kallas Reliable Change Index. Annars ser du "fortsätt" eller "stabilt läge". Den ärliga begränsningen: Hjärnkoll mäter dina resultat på just dessa ordövningar under fasta villkor. Det är inte ett minnestest, ett IQ-värde eller ett bevis på allmän kognitiv förändring.' },
    { q: 'Finns det hjärnträningsspel för barn eller äldre?', a: 'LexiClash-övningar fungerar för åldrar 12+ med ordförråd skalat till spelarens nivå. För äldre spelare hör korta språkbaserade uppgifter som dessa till ett välstuderat område inom forskning om kognitivt åldrande — verbal flyt och ordhämtning tenderar att minska tidigare än andra förmågor. Den 60-sekunders korta formen är också skonsam. Hjärnkoll följer bara resultat på dessa uppgifter — det är ingen medicinsk eller diagnostisk bedömning.' },
    { q: 'Överförs hjärnspel till verkligt tänkande?', a: 'Ärligt svar: vi påstår inte det, och du bör vara skeptisk mot appar som gör det. Stanford-konsensusbrevet 2014 och FTC:s fall mot Lumosity 2016 ($2M i böter) pekade båda ut obekräftade transferpåståenden. LexiClash lovar inga vinster i IQ, förbättrat minne eller bromsad kognitiv nedgång. Det Hjärnkoll mäter är dina resultat på just dessa ordövningar, ärligt, över tid — inget mer.' },
    { q: 'Kan jag spåra mina hjärnträningsframsteg över tid?', a: 'Ja, på två sätt. Träningspass använder en anpassad svårighetstrappa — klarar du en nivå blir den svårare nästa gång, misslyckas du två gånger i rad blir den lättare, så du alltid spelar vid din gräns. Hjärnkoll-passen (en gång om dagen per övning, fast svårighetsgrad) bygger en historik, och efter minst en vecka av kollar får du ett tillförlitligt besked om förändring istället för en brusig siffra.' },
    { q: 'Vilka språk stöder hjärnövningarna?', a: 'Engelska, hebreiska, svenska, japanska, spanska och ryska. Varje språk har sin egen ordbok och sällsynta-ord-frekvensdata. RTL stöds fullständigt för hebreiska. Hjärnkoll-resultat är specifika för det språk och den övning du spelade.' },
  ],

  relatedHeading: 'Relaterat',
  relatedHubTitle: 'Hjärnträningsnav',
  relatedHubSub: '4 övningar, Hjärnkoll-historik, anpassade nivåer',
  relatedScienceTitle: 'Vetenskapen om ordspel',
  relatedScienceSub: 'Långform: forskning, citat, träningstips',
  relatedBestTitle: 'Bästa ordspel online 2026',
  relatedBestSub: '9 spel rankade, ärliga för- och nackdelar',
  relatedDailyTitle: 'Daglig utmaning',
  relatedDailySub: 'Word Wheel + Word Hunt Survival',
  relatedWotdTitle: 'Dagens ord',
  relatedWotdSub: 'Ordförrådsdjup, dagligt ritual',
  relatedMpTitle: 'Multiplayer',
  relatedMpSub: 'Realtidsordsökning, 2-20+ spelare',

  finalCtaHeading: 'Redo för en 60-sekunders träning?',
  finalCtaBody: 'Välj en övning. Spendera en minut. Kom tillbaka imorgon för en till. Kör en Hjärnkoll en gång om dagen om du vill ha ett ärligt besked om din trend — ingen poäng, inga nivåmärken, bara dina egna siffror över tid.',
  finalCtaPrimary: 'Öppna hjärnnav',
  finalCtaSecondary: 'Snabbstart: Lightning Round',

  videoGameName: 'LexiClash Hjärnövningar',
  videoGameDescription: 'Gratis hjärnträningsordspel — 4 övningar (60 sekunder vardera) inspirerade av uppgifter forskare använder för att studera processhastighet, arbetsminne, uppmärksamhet och ordförråd, plus en daglig Hjärnkoll som ärligt visar din trend. Webbläsarbaserad, ingen nedladdning, ingen registrering, 6 språk.',
  itemListName: '4 hjärnträningsövningar',
  itemListDescription: 'Fyra 60-sekunders ordövningar, var och en inspirerad av en uppgift forskare använder för att studera en distinkt kognitiv förmåga.',
  itemListDescriptions: [
    'Hitta så många ord som möjligt på 60 sekunder. Inspirerad av snabba ordhämtningsuppgifter som används för att studera processhastighet.',
    'Memorera en sekvens av bokstavspositioner, sedan minns ord från dem. Inspirerad av uppgifter om arbetsminnesspann.',
    'Bygg långa obrutna ordkedjor. Inspirerad av uppgifter om uthållig uppmärksamhet som Continuous Performance Test.',
    'Hitta ovanliga och högvärdiga ord. Inspirerad av uppgifter om ordförrådsdjup och lexikal hämtning.',
  ],
  howToName: 'Hur man startar gratis hjärnträning på 60 sekunder',
  howToDescription: 'Börja en daglig hjärnträning med LexiClash-övningar — fyra områden, 60 sekunder vardera, ingen registrering krävs.',
  howToSteps: [
    { name: 'Öppna hjärnnavet', text: 'Besök lexiclash.live/sv/brain. Ingen registrering krävs för dina första övningar.' },
    { name: 'Välj ett område att träna', text: 'Välj bland 4 områden: processhastighet, arbetsminne, uppmärksamhet eller ordförråd. Varje övning tar 60 sekunder.' },
    { name: 'Spela övningen', text: 'Hitta ord på ett rutnät i en minut. Svårigheten anpassar sig — klarar du en nivå går den upp, misslyckas du två gånger går den ner.' },
    { name: 'Kör en Hjärnkoll', text: 'En gång om dagen per övning, spela med samma fasta upplägg som alla andra. Efter ungefär en vecka av kollar får du ett ärligt besked: uppåtgående trend, stabilt läge, eller inte tillräckligt med data än.' },
    { name: 'Träna dagligen', text: 'Tre övningar per dag tar under 5 minuter och täcker alla 4 områden under en vecka.' },
  ],
};

const ja: BrainLandingCopy = {
  metaTitle: '無料の脳トレ単語ゲーム — 4つのドリル、4つの分野',
  metaDescription: '無料の脳トレ単語ゲーム — 処理速度、ワーキングメモリ、注意、語彙を鍛える4つのドリルと、毎日のブレインチェック。ダウンロード不要、登録不要、6言語対応。',
  metaKeywords: '脳トレゲーム 無料, 無料脳トレ, 単語脳トレ, 認知トレーニング, 記憶トレーニング, 集中力トレーニング, ルモシティ 代替 無料, 脳トレ オンライン, 大人の脳トレ, 言葉のゲーム 脳トレ',
  ogTitle: '無料の脳トレ単語ゲーム — 4つのドリル、4つの分野',
  ogDescription: '4つの単語ドリル、各60秒、そして毎日のブレインチェック。無料、ダウンロード不要、6言語。Lumosity・Elevate・Peakの無料代替。',
  twitterTitle: '無料脳トレ — 60秒、4分野',
  twitterDescription: '4つの単語ドリルと毎日のブレインチェック。ブラウザで無料、ダウンロード不要。',

  marqueeBadges: ['4ドリル · 4分野', '各60秒', '毎日のブレインチェック', '無料でプレイ', 'ダウンロード不要', 'ブラウザ対応'],
  badge: '★ 無料の脳トレ ★',
  h1Pre: '無料の脳トレ、',
  h1Highlight: '4ドリル、各60秒。',
  introP1: '4つの単語ベースのドリル。各ドリル1分間。研究者が処理速度、ワーキングメモリ、注意、語彙を調べるために使う課題からヒントを得ています。',
  introP2: '登録の壁なし。有料の壁なし。自動更新の7日間トライアルもなし。脳ハブを開いて始めるだけ。1日1回、各ドリルでブレインチェックを実行できます — 毎回同じ固定セットアップで。約1週間後、数値が上昇傾向か、横ばいか、まだ判断が早いかを正直にお伝えします。',
  ctaPrimary: '無料で脳トレを始める',
  ctaSecondary: 'Lightning Round (60秒)を試す',

  drillsHeading: '4つのドリル、4つの分野',
  drillsSub: '各ドリルは、アデル・ダイアモンド (実行機能) やデューク大学 (単語ベースの記憶研究) などの研究者が実際にこれらの領域を調べる際に使う課題からヒントを得ています — 臨床的な検査ツールではなく、その精神で作られたゲームです。',
  researchLabel: '★ 研究的背景',
  drills: [
    { name: 'Lightning Round', domain: '処理速度', tagline: 'どれだけ速く単語を見つけられる?', blurb: '60秒間。1つのグリッド。できるだけ多くの有効な単語を見つけます。Lightning Roundは素早い単語探しの課題 — 単語ゲームが反応速度テストに最も近づく形です。', research: '処理速度は加齢研究で広く調べられており、他の機能より早く低下する傾向があります。このような素早い単語検索課題は言語流暢性研究で使われるものに似ています — このドリルがその低下を遅らせると主張するものではありません。' },
    { name: 'Memory Hunt', domain: 'ワーキングメモリ', tagline: '頭に保持し、後で思い出す', blurb: '文字位置の連続が点滅。グリッドが消える。記憶から単語を思い出して構築。Memory Huntは文字順序の記憶課題 — ワーキングメモリ研究の土台となっている、短期保持と操作の課題です。', research: 'ワーキングメモリのスパン課題は文献の中で最も研究されているパラダイムの一つです (NIH掲載のPMC5930973など)。ただし課題そのものを超えてどこまで効果が及ぶかは今も議論が続いています。' },
    { name: 'Combo Master', domain: '注意', tagline: '長く途切れないチェーンを構築', blurb: '連続を途切れさせずに有効な単語のチェーンを構築。Combo Masterは持続的注意の課題 — 多くの連続応答にわたって途切れなく正確さを保つこと。多くの単語ゲームは瞬発力に報酬を与えますが、これは持続力に報酬を与えます。', research: '持続的注意は連続パフォーマンステストのような課題で研究され、研究文献では学業成績と関連づけられています。' },
    { name: 'Rare Gems', domain: '語彙', tagline: '珍しく価値の高い単語を見つける', blurb: 'よくある単語は得点が低い。珍しい単語は得点が高い。Rare Gemsは語彙の深さの課題 — 記憶内の低頻度語へのアクセスです。読書家、クロスワード愛好家、単語コレクターに向いています。', research: '語彙は生涯を通じて比較的安定した認知指標の一つとされており、クロスワードのような単語パズルはよく知られた研究分野です (デューク大学、2022年など) — Rare Gemsはその精神で作られたもので、記憶治療として実証されたものではありません。' },
  ],

  comparisonHeading: '有料の脳トレアプリと比較',
  comparisonHeaders: ['機能', 'LexiClash', 'Lumosity', 'Elevate', 'Peak'],
  comparisonRows: [
    ['価格', '無料、有料の壁なし', '$11.99/月 Premium', '$49.99/年 Pro', '$49.99/年 Pro'],
    ['無料ゲーム', '4ドリル、すべて開放', '1日3つローテーション', '1日3つローテーション', '1日4つローテーション'],
    ['登録必要', 'いいえ (任意)', 'はい', 'はい', 'はい'],
    ['単語特化', '100% 単語ベース', '混合 (数学/論理)', '単語が多い', '混合'],
    ['追跡する分野', '4、毎日のブレインチェックで', '5領域', '5カテゴリ', '6カテゴリ'],
    ['言語', '5 (RTLヘブライ語含む)', '主に英語', '英語/ES/PT', '主に英語'],
    ['ブラウザでプレイ', 'はい、ダウンロード不要', 'ウェブ+アプリ', 'アプリのみ', 'アプリのみ'],
    ['研究引用の表示', 'はい、アプリ内', 'マーケティングページ', 'マーケティングページ', 'マーケティングページ'],
  ],
  comparisonFooter: 'FTCは2016年にLumosityに対し未確認の転移主張で200万ドルの罰金を科しました。私たちはIQ、記憶、全般的な認知能力の向上を約束しません。ブレインチェックは、これらの単語課題における実際の成績が時間とともに上昇傾向にあるかどうかを正直に示すだけです。',

  howHeading: '使い方',
  steps: [
    { step: '1', title: 'ドリルを選ぶ', sub: '4つの分野: 速度、記憶、注意、語彙。初日からすべて開放 — どれでも好きな順番でプレイ。' },
    { step: '2', title: '60秒プレイ', sub: '短く集中したラウンド。難易度は自動調整 — クリアすれば上がり、2回連続で苦戦すれば下がる。' },
    { step: '3', title: 'ブレインチェックを実行', sub: '1日1回、各ドリルで、毎回同じ固定セットアップ — ブーストなし。最初のチェックはただのウォームアップ。' },
    { step: '4', title: '正直な判定を受け取る', sub: '約1週間分のチェックの後、上昇傾向か、横ばいか、まだ判断が早いかをお伝えします — 0〜100のスコアもティアもありません。' },
  ],

  faqHeading: 'よくある質問',
  faqs: [
    { q: '脳トレ単語ゲームは本当に研究に裏付けられていますか?', a: '私たちのドリルは、研究者が特定のスキルを調べるために使う課題からヒントを得ています — 例えば素早い単語検索は言語流暢性テストに似ており、文字順序の記憶は古典的なワーキングメモリのスパン課題に似ています。これは、LexiClash自体が記憶力、IQ、全般的な認知能力を向上させると証明された、というのとは違います。市販の脳トレアプリにそれを裏付ける確かな証拠はなく、私たちもそう主張しません。正直に測定しているのは、毎日のブレインチェックを通じたこれらの課題そのものでの成績です。' },
    { q: '脳トレセッションはどのくらいの長さが必要ですか?', a: 'LexiClashの各ドリルは60秒です。短く頻繁なセッションは長いセッションより続けやすいものです。1日3ドリルなら5分未満で、週を通して4つの分野すべてに触れられます。' },
    { q: 'LexiClashはLumosity、Elevate、Peakの無料代替ですか?', a: 'はい。Lumosity Premiumは月額約12ドル、Elevate Proは年間約50ドル、Peak Proは年間50ドル超です。LexiClashの4ドリルは有料の壁、登録の壁、時間制限なしで無料です。トレードオフとして、Lumosityは数学・論理・単語にまたがる40以上のゲームをカバーしますが、LexiClashは単語ドリルのみに集中しています — 範囲は狭いですが、単語スキルについてより深いシグナルが得られます。' },
    { q: '4つの脳ドリルが対象とする認知分野は何ですか?', a: 'Lightning Roundは単語を素早く見つける課題です。Memory Huntは文字順序を記憶する課題です。Combo Masterは持続的注意の課題です。Rare Gemsは語彙の深さの課題です。それぞれ研究者がそのスキルを調べるために使う課題の種類からヒントを得ており、ブレインチェックがそれぞれの傾向を追跡します — 統合された0〜100のスコアはありません。' },
    { q: 'ブレインチェックとは何ですか、どのように機能しますか?', a: '1日1回、各ドリルでブレインチェックを実行できます — 毎回まったく同じ固定難易度で、ブーストなし。そのため結果は日々比較可能です。最初のチェックはウォームアップで、カウントされません。2回目と3回目のチェックがベースラインを設定します。その後は、直近のチェックが自分自身の通常の日々の変動を超えて動いた場合にのみ — 少なくとも1週間かけて — 変化を報告します。これはReliable Change Indexと呼ばれる方法です。それ以外の場合は「続けよう」または「横ばい」と表示されます。正直な限界: ブレインチェックは固定条件下でのこれらの単語課題での成績を測定するものです。記憶力テストでも、IQスコアでも、全般的な認知変化の証明でもありません。' },
    { q: '子供や高齢者向けの脳トレはありますか?', a: 'LexiClashドリルは12歳以上向けで、語彙はプレイヤーのスキルに合わせてスケールされます。高齢のプレイヤーにとって、このような短い言語ベースの課題は加齢に関する認知研究のよく研究された分野に位置します — 言語流暢性と単語検索は他のスキルより早く低下する傾向があります。60秒という短い形式も疲れにくい設計です。ブレインチェックはこれらの課題での成績のみを追跡するもので、医学的・診断的な評価ではありません。' },
    { q: '脳ゲームは実世界の思考に転移しますか?', a: '正直な答え: 私たちはそう主張しませんし、そう主張するアプリには懐疑的になるべきです。2014年のスタンフォードの合意レターと2016年のFTCによるLumosityへの措置 (200万ドルの罰金) は、どちらも根拠のない転移の主張を問題視しました。LexiClashはIQの向上、記憶力の改善、認知機能低下の抑制を約束しません。ブレインチェックが測定するのは、これらの単語課題での成績を時間とともに正直に示すことだけです。' },
    { q: '脳トレの進捗を時間とともに追跡できますか?', a: 'はい、2つの方法があります。トレーニングでは適応型の難易度階段を使います — レベルをクリアすれば次はもっと難しくなり、2回連続で苦戦すればやさしくなるので、常に自分の限界のあたりでプレイできます。ブレインチェック (1日1回、各ドリルで、固定難易度) は履歴を蓄積し、少なくとも1週間分のチェックの後には、ノイズの多い数値ではなく、信頼できる変化の判定が得られます。' },
    { q: '脳ドリルはどの言語をサポートしますか?', a: '英語、ヘブライ語、スウェーデン語、日本語、スペイン語、ロシア語。各言語に独自の辞書とレア単語頻度データがあります。ヘブライ語のRTLは完全にサポートされます。ブレインチェックの結果は、プレイした言語とドリルに固有のものです。' },
  ],

  relatedHeading: '関連',
  relatedHubTitle: '脳トレハブ',
  relatedHubSub: '4ドリル、ブレインチェックの履歴、適応するレベル',
  relatedScienceTitle: '単語ゲームの科学',
  relatedScienceSub: 'ロングフォーム: 研究、引用、トレーニングのヒント',
  relatedBestTitle: '2026年最高のオンライン単語ゲーム',
  relatedBestSub: '9ゲームをランク付け、率直な長所と短所',
  relatedDailyTitle: '毎日のチャレンジ',
  relatedDailySub: 'Word Wheel + Word Hunt Survival',
  relatedWotdTitle: '今日の単語',
  relatedWotdSub: '語彙の深さ、毎日の儀式',
  relatedMpTitle: 'マルチプレイヤー',
  relatedMpSub: 'リアルタイム単語検索、2-20+プレイヤー',

  finalCtaHeading: '60秒のワークアウトの準備はできましたか?',
  finalCtaBody: 'ドリルを選ぶ。1分かける。また明日戻ってきてもう一度。傾向について正直な答えが欲しければ、1日1回ブレインチェックを実行しましょう — スコアもティアもなく、時間とともに変化する自分自身の数値だけです。',
  finalCtaPrimary: '脳ハブを開く',
  finalCtaSecondary: 'クイックスタート: Lightning Round',

  videoGameName: 'LexiClash 脳ドリル',
  videoGameDescription: '無料の脳トレ単語ゲーム — 研究者が処理速度、ワーキングメモリ、注意、語彙を調べるために使う課題からヒントを得た4つのドリル (各60秒)、そして傾向を正直に示す毎日のブレインチェック。ブラウザベース、ダウンロード不要、登録不要、6言語。',
  itemListName: '4つの脳トレドリル',
  itemListDescription: '4つの60秒ドリル、それぞれが研究者が特定の認知スキルを調べるために使う課題からヒントを得ています。',
  itemListDescriptions: [
    '60秒でできるだけ多くの単語を見つける。処理速度を調べるために使われる素早い単語検索課題からヒントを得ています。',
    '文字位置の連続を記憶し、それから単語を思い出す。ワーキングメモリのスパン課題からヒントを得ています。',
    '長く途切れない単語チェーンを構築。連続パフォーマンステストのような持続的注意の課題からヒントを得ています。',
    '珍しく価値の高い単語を見つける。語彙の深さと語彙検索の課題からヒントを得ています。',
  ],
  howToName: '60秒で無料の脳トレを始める方法',
  howToDescription: 'LexiClashドリルで毎日の脳ワークアウトを始める — 4つの分野、各60秒、登録不要。',
  howToSteps: [
    { name: '脳ハブを開く', text: 'lexiclash.live/ja/brain にアクセス。最初のドリルに登録は不要。' },
    { name: 'トレーニングする分野を選ぶ', text: '4つの分野から選択: 処理速度、ワーキングメモリ、注意、または語彙。各ドリルは60秒。' },
    { name: 'ドリルをプレイ', text: '1分間グリッド上で単語を見つける。難易度は自動調整 — クリアすれば上がり、2回苦戦すれば下がる。' },
    { name: 'ブレインチェックを実行', text: '1日1回、各ドリルで、みんなと同じ固定セットアップでプレイ。約1週間分のチェックの後、正直な判定が得られます: 上昇傾向、横ばい、またはまだデータが足りない。' },
    { name: '毎日トレーニング', text: '1日3ドリルは5分未満で、週を通して4つの分野すべてを鍛えます。' },
  ],
};

const es: BrainLandingCopy = {
  metaTitle: 'Juegos de entrenamiento cerebral gratis — 4 ejercicios, 4 áreas',
  metaDescription: 'Juegos de entrenamiento cerebral gratis — 4 ejercicios más un Chequeo mental diario. Sin descarga, sin registro, 6 idiomas.',
  metaKeywords: 'juegos de entrenamiento cerebral gratis, juegos cerebrales gratis adultos, juegos de palabras cerebro, ejercicios mentales online, entrenamiento cognitivo gratis, juegos de memoria, ejercicios de concentración, alternativa lumosity gratis, alternativa elevate, gimnasio mental, juegos para el cerebro',
  ogTitle: 'Juegos de entrenamiento cerebral gratis — 4 ejercicios, 4 áreas',
  ogDescription: '4 ejercicios de palabras, 60 segundos cada uno, más un Chequeo mental diario. Gratis, sin descarga, 6 idiomas. Una alternativa gratis a Lumosity, Elevate y Peak.',
  twitterTitle: 'Entrenamiento cerebral gratis — 60 seg, 4 áreas',
  twitterDescription: '4 ejercicios de palabras más un Chequeo mental diario. Gratis en el navegador.',

  marqueeBadges: ['4 EJERCICIOS · 4 ÁREAS', '60 SEGUNDOS CADA UNO', 'CHEQUEO MENTAL DIARIO', 'GRATIS PARA JUGAR', 'SIN DESCARGA', 'EN EL NAVEGADOR'],
  badge: '★ Gimnasio cerebral gratis ★',
  h1Pre: 'Entrenamiento cerebral gratis,',
  h1Highlight: '4 ejercicios, 60 segundos cada uno.',
  introP1: 'Cuatro ejercicios basados en palabras. Cada uno toma un minuto. Están inspirados en tareas que los investigadores usan para estudiar velocidad de procesamiento, memoria de trabajo, atención y vocabulario.',
  introP2: 'Sin muro de registro. Sin muro de pago. Sin prueba de 7 días que se renueva automáticamente. Solo abre el centro cerebral y comienza a entrenar. Una vez al día por ejercicio puedes hacer un Chequeo mental — con la misma configuración fija cada vez — y después de aproximadamente una semana te diremos con honestidad si tus números están mejorando, se mantienen estables, o si aún es pronto para saberlo.',
  ctaPrimary: 'Empieza gratis',
  ctaSecondary: 'Prueba Lightning Round (60 seg)',

  drillsHeading: 'Los 4 ejercicios, las 4 áreas',
  drillsSub: 'Cada ejercicio está inspirado en tareas que investigadores como Adele Diamond (función ejecutiva) y la Universidad de Duke (entrenamiento de memoria basado en palabras) usan para estudiar estas habilidades — no es un instrumento clínico, solo un juego construido en ese espíritu.',
  researchLabel: '★ Contexto de investigación',
  drills: [
    { name: 'Lightning Round', domain: 'Velocidad de procesamiento', tagline: '¿Qué tan rápido encuentras palabras?', blurb: 'Sesenta segundos. Una cuadrícula. Encuentra tantas palabras válidas como sea posible. Lightning Round es una tarea de búsqueda rápida de palabras — lo más cercano que un juego de palabras llega a una prueba de tiempo de reacción.', research: 'La velocidad de procesamiento se estudia ampliamente en la investigación sobre el envejecimiento cognitivo y tiende a disminuir antes que otras funciones. Tareas de recuperación rápida de palabras como esta se parecen a las usadas en la investigación de fluidez verbal — no afirmamos que este ejercicio retrase ese declive.' },
    { name: 'Memory Hunt', domain: 'Memoria de trabajo', tagline: 'Mantenlo en la cabeza, luego recuérdalo', blurb: 'Una secuencia de posiciones de letras parpadea. La cuadrícula se borra. Recuerdas y formas palabras de memoria. Memory Hunt es una tarea de recuerdo de secuencias de letras — el tipo de desafío de retención y uso a corto plazo en el que se basa la investigación de la memoria de trabajo.', research: 'Las tareas de amplitud de memoria de trabajo están entre los paradigmas más estudiados en la literatura (por ejemplo, la investigación indexada en NIH PMC5930973), aunque hasta qué punto las ganancias se transfieren más allá de la propia tarea sigue siendo debatido.' },
    { name: 'Combo Master', domain: 'Atención', tagline: 'Construye cadenas largas e ininterrumpidas', blurb: 'Construye cadenas de palabras válidas sin romper la racha. Combo Master es una tarea de atención sostenida — mantener la precisión a través de muchas respuestas consecutivas sin fallos. La mayoría de los juegos de palabras premian los arranques; este premia la resistencia.', research: 'La atención sostenida se estudia mediante tareas como la Prueba de Rendimiento Continuo, y en la literatura de investigación se relaciona con el rendimiento académico.' },
    { name: 'Rare Gems', domain: 'Vocabulario', tagline: 'Encuentra palabras raras y valiosas', blurb: 'Las palabras comunes valen poco. Las raras valen mucho. Rare Gems es una tarea de profundidad de vocabulario — tu acceso a palabras de baja frecuencia en la memoria. Premia a lectores, aficionados a los crucigramas y coleccionistas de palabras.', research: 'El vocabulario se considera una de las medidas cognitivas más estables a lo largo de la vida, y los rompecabezas de palabras como los crucigramas son un área de investigación bien conocida (por ejemplo, Duke, 2022) — Rare Gems está construido en ese espíritu, no como un tratamiento probado para la memoria.' },
  ],

  comparisonHeading: 'vs. las apps de entrenamiento cerebral de pago',
  comparisonHeaders: ['Característica', 'LexiClash', 'Lumosity', 'Elevate', 'Peak'],
  comparisonRows: [
    ['Precio', 'Gratis, sin muro de pago', '$11.99/mes Premium', '$49.99/año Pro', '$49.99/año Pro'],
    ['Juegos gratis', '4 ejercicios, todos abiertos', '3/día rotación', '3/día rotación', '4/día rotación'],
    ['Registro requerido', 'No (opcional)', 'Sí', 'Sí', 'Sí'],
    ['Enfoque en palabras', '100% basado en palabras', 'Mixto (mate/lógica)', 'Mucho de palabras', 'Mixto'],
    ['Áreas seguidas', '4, con Chequeo mental diario', '5 áreas', '5 categorías', '6 categorías'],
    ['Idiomas', '5 (incl. hebreo RTL)', 'Inglés principalmente', 'Inglés/ES/PT', 'Inglés principalmente'],
    ['Juego en navegador', 'Sí, sin descarga', 'Web + app', 'Solo app', 'Solo app'],
    ['Citas de investigación visibles', 'Sí, en la app', 'Páginas de marketing', 'Páginas de marketing', 'Páginas de marketing'],
  ],
  comparisonFooter: 'La FTC multó a Lumosity con $2M en 2016 por afirmaciones de transferencia no respaldadas. No prometemos ganancias de IQ, memoria ni cognición general. El Chequeo mental simplemente te muestra, con honestidad, si tu rendimiento en estas tareas de palabras específicas mejora con el tiempo.',

  howHeading: 'Cómo funciona',
  steps: [
    { step: '1', title: 'Elige un ejercicio', sub: 'Cuatro áreas: velocidad, memoria, atención, vocabulario. Todas desbloqueadas desde el primer día — juega cualquiera, en el orden que quieras.' },
    { step: '2', title: 'Juega 60 segundos', sub: 'Una ronda corta y enfocada. La dificultad se adapta — superas un nivel y sube, fallas dos veces seguidas y baja.' },
    { step: '3', title: 'Haz un Chequeo mental', sub: 'Una vez al día por ejercicio, con la misma configuración fija cada vez — sin potenciadores. Tu primer chequeo es solo un calentamiento.' },
    { step: '4', title: 'Recibe un veredicto honesto', sub: 'Después de aproximadamente una semana de chequeos, te decimos si mejoras, te mantienes estable, o si aún es pronto para saberlo — sin puntaje 0-100, sin insignias de nivel.' },
  ],

  faqHeading: 'Preguntas frecuentes',
  faqs: [
    { q: '¿Los juegos de entrenamiento cerebral con palabras están realmente respaldados por investigación?', a: 'Nuestros ejercicios están inspirados en tareas que los investigadores usan para estudiar habilidades específicas — por ejemplo, la recuperación rápida de palabras se parece a las pruebas de fluidez verbal, y recordar una secuencia de letras se parece a las clásicas tareas de amplitud de memoria de trabajo. Eso es distinto de decir que LexiClash en sí ha demostrado mejorar la memoria, el IQ o la cognición general — ninguna app de entrenamiento cerebral para consumidores tiene evidencia sólida de eso, y nosotros tampoco lo afirmamos. Lo que sí medimos con honestidad es tu rendimiento en estas tareas específicas, mediante el Chequeo mental diario.' },
    { q: '¿Cuánto tiempo necesita una sesión de entrenamiento cerebral?', a: 'Cada ejercicio de LexiClash es de 60 segundos. Las sesiones cortas y frecuentes son más fáciles de mantener que las largas. Tres ejercicios al día son menos de 5 minutos y tocan las cuatro áreas a lo largo de la semana.' },
    { q: '¿Es LexiClash una alternativa gratis a Lumosity, Elevate o Peak?', a: 'Sí. Lumosity Premium cuesta aproximadamente $12/mes, Elevate Pro alrededor de $50/año, Peak Pro $50+/año. Los 4 ejercicios de LexiClash son gratuitos sin muro de pago, sin muro de registro y sin límite de tiempo. La contrapartida: Lumosity cubre más de 40 juegos entre matemáticas, lógica y palabras; LexiClash se centra solo en ejercicios de palabras — alcance más estrecho, señal más profunda sobre habilidades verbales.' },
    { q: '¿Qué áreas cognitivas abordan los 4 ejercicios cerebrales?', a: 'Lightning Round es una tarea de velocidad para encontrar palabras. Memory Hunt es una tarea de recuerdo de secuencias de letras. Combo Master es una tarea de atención sostenida. Rare Gems es una tarea de profundidad de vocabulario. Cada uno está inspirado en un tipo de tarea que los investigadores usan para estudiar esa habilidad, y el Chequeo mental sigue tu propia tendencia en cada una — no hay un puntaje combinado de 0 a 100.' },
    { q: '¿Qué es el Chequeo mental y cómo funciona?', a: 'Una vez al día por ejercicio, puedes hacer un Chequeo mental — exactamente la misma dificultad fija cada vez, sin potenciadores, para que los resultados sean comparables día a día. Tu primer chequeo es un calentamiento y no cuenta. Los chequeos 2 y 3 establecen tu línea base. Después de eso, solo reportamos un cambio cuando tus chequeos recientes se mueven más que tu propia variación diaria normal, durante al menos una semana — un método llamado Índice de Cambio Confiable (Reliable Change Index). De lo contrario verás "sigue así" o "te mantienes estable". El límite honesto: el Chequeo mental mide tu rendimiento en estas tareas de palabras específicas bajo condiciones fijas. No es una prueba de memoria, ni un puntaje de IQ, ni una prueba de cambio cognitivo general.' },
    { q: '¿Hay juegos de entrenamiento cerebral para niños o personas mayores?', a: 'Los ejercicios de LexiClash funcionan para edades 12+, con vocabulario escalado al nivel del jugador. Para los jugadores mayores, tareas cortas basadas en el lenguaje como estas forman parte de un área bien estudiada en la investigación del envejecimiento cognitivo — la fluidez verbal y la recuperación de palabras tienden a disminuir antes que otras habilidades. El formato de 60 segundos también es poco fatigante. El Chequeo mental solo sigue el rendimiento en estas tareas — no es una evaluación médica ni diagnóstica.' },
    { q: '¿Los juegos cerebrales realmente se transfieren al pensamiento del mundo real?', a: 'Respuesta honesta: no afirmamos que lo hagan, y deberías ser escéptico con cualquier app que lo haga. La carta de consenso de Stanford de 2014 y el caso de la FTC contra Lumosity en 2016 (multa de $2M) señalaron ambos afirmaciones de transferencia no respaldadas. LexiClash no promete ganancias de IQ, mejora de la memoria ni un menor deterioro cognitivo. Lo que mide el Chequeo mental es tu rendimiento en estas tareas de palabras específicas, con honestidad, a lo largo del tiempo — nada más.' },
    { q: '¿Puedo seguir mi progreso de entrenamiento cerebral con el tiempo?', a: 'Sí, de dos formas. Las sesiones de entrenamiento usan una escalera adaptativa de dificultad — superas un nivel y la próxima vez es más difícil; fallas dos veces seguidas y baja, así siempre juegas en tu límite. Las sesiones de Chequeo mental (una vez al día por ejercicio, dificultad fija) construyen un historial, y tras al menos una semana de chequeos obtienes un veredicto de cambio confiable en lugar de un número ruidoso.' },
    { q: '¿Qué idiomas admiten los ejercicios cerebrales?', a: 'Inglés, hebreo, sueco, japonés, español y ruso. Cada idioma tiene su propio diccionario y datos de frecuencia de palabras raras. RTL es totalmente compatible con hebreo. Los resultados del Chequeo mental son específicos del idioma y el ejercicio que jugaste.' },
  ],

  relatedHeading: 'Relacionado',
  relatedHubTitle: 'Centro de entrenamiento cerebral',
  relatedHubSub: '4 ejercicios, historial de Chequeo mental, niveles adaptativos',
  relatedScienceTitle: 'La ciencia de los juegos de palabras',
  relatedScienceSub: 'Formato largo: investigación, citas, consejos de entrenamiento',
  relatedBestTitle: 'Mejores juegos de palabras online 2026',
  relatedBestSub: '9 juegos clasificados, pros y contras honestos',
  relatedDailyTitle: 'Desafío diario',
  relatedDailySub: 'Word Wheel + Word Hunt Survival',
  relatedWotdTitle: 'Palabra del día',
  relatedWotdSub: 'Profundidad de vocabulario, ritual diario',
  relatedMpTitle: 'Multijugador',
  relatedMpSub: 'Búsqueda de palabras en tiempo real, 2-20+ jugadores',

  finalCtaHeading: '¿Listo para un entrenamiento de 60 segundos?',
  finalCtaBody: 'Elige un ejercicio. Pasa un minuto. Vuelve mañana por otro. Haz un Chequeo mental una vez al día si quieres una lectura honesta de tu tendencia — sin puntaje, sin insignias, solo tus propios números a lo largo del tiempo.',
  finalCtaPrimary: 'Abrir centro cerebral',
  finalCtaSecondary: 'Inicio rápido: Lightning Round',

  videoGameName: 'Ejercicios cerebrales LexiClash',
  videoGameDescription: 'Juegos de entrenamiento cerebral con palabras gratis — 4 ejercicios (60 segundos cada uno) inspirados en tareas que los investigadores usan para estudiar velocidad de procesamiento, memoria de trabajo, atención y vocabulario, más un Chequeo mental diario que muestra tu tendencia con honestidad. Basado en navegador, sin descarga, sin registro, 6 idiomas.',
  itemListName: '4 ejercicios de entrenamiento cerebral',
  itemListDescription: 'Cuatro ejercicios de palabras de 60 segundos, cada uno inspirado en una tarea que los investigadores usan para estudiar una habilidad cognitiva distinta.',
  itemListDescriptions: [
    'Encuentra tantas palabras como sea posible en 60 segundos. Inspirado en tareas de recuperación rápida de palabras usadas para estudiar la velocidad de procesamiento.',
    'Memoriza una secuencia de posiciones de letras, luego recuerda palabras de ellas. Inspirado en tareas de amplitud de memoria de trabajo.',
    'Construye cadenas largas e ininterrumpidas de palabras. Inspirado en tareas de atención sostenida como la Prueba de Rendimiento Continuo.',
    'Encuentra palabras poco comunes y de alto valor. Inspirado en tareas de profundidad de vocabulario y recuperación léxica.',
  ],
  howToName: 'Cómo empezar entrenamiento cerebral gratis en 60 segundos',
  howToDescription: 'Comienza un entrenamiento cerebral diario con ejercicios de LexiClash — cuatro áreas, 60 segundos cada uno, sin registro requerido.',
  howToSteps: [
    { name: 'Abre el centro cerebral', text: 'Visita lexiclash.live/es/brain. No se requiere registro para tus primeros ejercicios.' },
    { name: 'Elige un área para entrenar', text: 'Elige entre 4 áreas: velocidad de procesamiento, memoria de trabajo, atención o vocabulario. Cada ejercicio toma 60 segundos.' },
    { name: 'Juega el ejercicio', text: 'Encuentra palabras en una cuadrícula durante un minuto. La dificultad se adapta — superas un nivel y sube, fallas dos veces y baja.' },
    { name: 'Haz un Chequeo mental', text: 'Una vez al día por ejercicio, juega con la misma configuración fija que todos. Tras aproximadamente una semana de chequeos obtienes un veredicto honesto: tendencia al alza, estable, o aún sin datos suficientes.' },
    { name: 'Entrena diariamente', text: 'Tres ejercicios al día toman menos de 5 minutos y ejercitan las 4 áreas durante una semana.' },
  ],
};

const ru: BrainLandingCopy = {
  metaTitle: 'Бесплатные игры для тренировки мозга — 4 упражнения, 4 области',
  metaDescription: 'Бесплатные игры для тренировки мозга — 4 упражнения и ежедневная Проверка мозга. Без скачивания, без регистрации, 6 языков.',
  metaKeywords: 'игры для тренировки мозга, бесплатные головоломки, развивающие игры, когнитивные упражнения, тренировка памяти, упражнения на концентрацию, головоломки со словами, альтернатива lumosity, тренировка мышления, игры для мозга, словесные игры',
  ogTitle: 'Бесплатные игры для тренировки мозга — 4 упражнения, 4 области',
  ogDescription: '4 упражнения со словами, по 60 секунд каждое, плюс ежедневная Проверка мозга. Бесплатно, без скачивания, 6 языков. Альтернатива Lumosity, Elevate и Peak.',
  twitterTitle: 'Тренировка мозга — 60 сек, 4 области',
  twitterDescription: '4 упражнения со словами плюс ежедневная Проверка мозга. Бесплатно в браузере.',

  marqueeBadges: ['4 УПРАЖНЕНИЯ · 4 ОБЛАСТИ', 'ПО 60 СЕКУНД', 'ЕЖЕДНЕВНАЯ ПРОВЕРКА МОЗГА', 'БЕСПЛАТНАЯ ИГРА', 'БЕЗ СКАЧИВАНИЯ', 'В БРАУЗЕРЕ'],
  badge: '★ Бесплатный фитнес для мозга ★',
  h1Pre: 'Тренировка мозга,',
  h1Highlight: '4 упражнения, по 60 секунд.',
  introP1: 'Четыре упражнения на основе слов. Каждое длится одну минуту. Они вдохновлены заданиями, которые учёные используют для изучения скорости обработки, рабочей памяти, внимания и словарного запаса.',
  introP2: 'Без стены регистрации. Без платного доступа. Без 7-дневного пробного периода, который продлевается автоматически. Просто откройте центр мозга и начинайте. Раз в день по каждому упражнению можно пройти Проверку мозга — каждый раз в одинаковых фиксированных условиях — и примерно через неделю мы честно скажем, растут ли ваши результаты, остаются стабильными, или пока рано судить.',
  ctaPrimary: 'Начать тренировку бесплатно',
  ctaSecondary: 'Попробовать Lightning Round (60 сек)',

  drillsHeading: '4 упражнения, 4 области',
  drillsSub: 'Каждое упражнение вдохновлено заданиями, которые такие учёные, как Адель Даймонд (исполнительные функции) и Дьюкский университет (тренировка памяти со словами), используют для изучения этих навыков — это не клинический инструмент, а игра, созданная в том же духе.',
  researchLabel: '★ Научный контекст',
  drills: [
    { name: 'Lightning Round', domain: 'Скорость обработки', tagline: 'Как быстро ты найдешь слова?', blurb: 'Шестьдесят секунд. Одна сетка. Найди как можно больше правильных слов. Lightning Round — это задание на быстрый поиск слов, ближайший аналог теста на время реакции среди словесных игр.', research: 'Скорость обработки широко изучается в исследованиях когнитивного старения и обычно снижается раньше других функций. Такие задания на быстрый поиск слов похожи на те, что используются в исследованиях вербальной беглости — мы не утверждаем, что это упражнение замедляет такое снижение.' },
    { name: 'Memory Hunt', domain: 'Рабочая память', tagline: 'Запомни, потом вспомни', blurb: 'Последовательность позиций букв мигает. Сетка исчезает. Ты вспоминаешь и составляешь слова по памяти. Memory Hunt — это задание на запоминание последовательности букв, тот тип кратковременного удержания и использования информации, на котором строятся исследования рабочей памяти.', research: 'Задания на объём рабочей памяти — одни из самых изученных в научной литературе (например, исследования, опубликованные в NIH, PMC5930973), но насколько результаты переносятся за пределы самого задания, всё ещё обсуждается.' },
    { name: 'Combo Master', domain: 'Внимание', tagline: 'Строй длинные непрерывные цепочки', blurb: 'Строй цепочки правильных слов без разрывов. Combo Master — это задание на устойчивое внимание: сохранять точность на протяжении множества последовательных ответов без сбоев. Большинство словесных игр вознаграждают быстрые рывки; это упражнение вознаграждает выносливость.', research: 'Устойчивое внимание изучается с помощью таких заданий, как тест непрерывного выполнения, и в научной литературе связано с академическими достижениями.' },
    { name: 'Rare Gems', domain: 'Словарный запас', tagline: 'Найди редкие, ценные слова', blurb: 'Обычные слова дают мало баллов. Редкие слова дают много. Rare Gems — это задание на глубину словарного запаса: твой доступ к редким словам в памяти. Оно нравится читателям, любителям кроссвордов и коллекционерам слов.', research: 'Словарный запас считается одним из наиболее устойчивых когнитивных показателей на протяжении жизни, а словесные головоломки, такие как кроссворды, — хорошо известная область исследований (например, Дьюкский университет, 2022) — Rare Gems создано в том же духе, а не как доказанное средство от снижения памяти.' },
  ],

  comparisonHeading: 'vs. платные приложения для тренировки мозга',
  comparisonHeaders: ['Функция', 'LexiClash', 'Lumosity', 'Elevate', 'Peak'],
  comparisonRows: [
    ['Цена', 'Бесплатно, без платного доступа', '$11.99/мес Premium', '$49.99/год Pro', '$49.99/год Pro'],
    ['Бесплатные игры', '4 упражнения, все доступны', '3/день по ротации', '3/день по ротации', '4/день по ротации'],
    ['Требуется регистрация', 'Нет (опционально)', 'Да', 'Да', 'Да'],
    ['Фокус на словах', '100% игры со словами', 'Смешанные (математика/логика)', 'В основном слова', 'Смешанные'],
    ['Отслеживаемые области', '4, через ежедневную Проверку мозга', '5 областей', '5 категорий', '6 категорий'],
    ['Языки', '5 (включая иврит RTL)', 'В основном английский', 'Английский/ИС/ПТ', 'В основном английский'],
    ['Игра в браузере', 'Да, без скачивания', 'Веб + приложение', 'Только приложение', 'Только приложение'],
    ['Ссылки на научные исследования видны', 'Да, в приложении', 'На страницах маркетинга', 'На страницах маркетинга', 'На страницах маркетинга'],
  ],
  comparisonFooter: 'В 2016 году FTC оштрафовала Lumosity на $2 млн за необоснованные заявления о переносе умений. Мы не обещаем рост IQ, памяти или общих когнитивных способностей. Проверка мозга просто честно показывает, растут ли твои результаты в этих конкретных словесных заданиях со временем.',

  howHeading: 'Как это работает',
  steps: [
    { step: '1', title: 'Выбери упражнение', sub: 'Четыре области: скорость, память, внимание, словарный запас. Все доступны с первого дня — играй в любое, в любом порядке.' },
    { step: '2', title: 'Играй 60 секунд', sub: 'Короткий сосредоточенный раунд. Сложность подстраивается — прошёл уровень, и он усложняется; дважды подряд не справился — упрощается.' },
    { step: '3', title: 'Пройди Проверку мозга', sub: 'Раз в день по каждому упражнению, каждый раз в одинаковых фиксированных условиях — без бустов. Первая проверка — просто разминка.' },
    { step: '4', title: 'Получи честный вердикт', sub: 'Примерно через неделю проверок мы скажем, растут ли твои результаты, остаются стабильными, или пока рано судить — без баллов 0-100, без значков уровня.' },
  ],

  faqHeading: 'Часто задаваемые вопросы',
  faqs: [
    { q: 'Игры для тренировки мозга со словами действительно научно обоснованы?', a: 'Наши упражнения вдохновлены заданиями, которые учёные используют для изучения конкретных навыков — например, быстрый поиск слов похож на тесты вербальной беглости, а запоминание последовательности букв похоже на классические задания на объём рабочей памяти. Это не то же самое, что сказать, будто сам LexiClash доказанно улучшает память, IQ или общие когнитивные способности — ни одно потребительское приложение для тренировки мозга не имеет убедительных доказательств этого, и мы этого не утверждаем. Что мы честно измеряем — это твои результаты именно в этих заданиях, с помощью ежедневной Проверки мозга.' },
    { q: 'Сколько времени нужна сессия тренировки мозга?', a: 'Каждое упражнение LexiClash — 60 секунд. Короткие, частые сессии легче поддерживать, чем длинные. Три упражнения в день — это меньше 5 минут, и они затрагивают все четыре области за неделю.' },
    { q: 'LexiClash — это бесплатная альтернатива Lumosity, Elevate или Peak?', a: 'Да. Lumosity Premium стоит примерно $12/месяц, Elevate Pro примерно $50/год, Peak Pro $50+/год. 4 упражнения LexiClash полностью бесплатны, без платного доступа, без стены регистрации и без ограничений по времени. Компромисс: Lumosity охватывает более 40 игр по математике, логике и словам; LexiClash фокусируется только на словесных упражнениях — более узкий охват, зато более глубокий сигнал о словесных навыках.' },
    { q: 'Какие когнитивные области затрагивают 4 упражнения для мозга?', a: 'Lightning Round — это задание на скорость поиска слов. Memory Hunt — задание на запоминание последовательности букв. Combo Master — задание на устойчивое внимание. Rare Gems — задание на глубину словарного запаса. Каждое вдохновлено типом задания, которое учёные используют для изучения этого навыка, и Проверка мозга отслеживает твою собственную динамику по каждому из них — единого балла от 0 до 100 нет.' },
    { q: 'Что такое Проверка мозга и как она работает?', a: 'Раз в день по каждому упражнению можно пройти Проверку мозга — каждый раз с одной и той же фиксированной сложностью, без бустов, поэтому результаты можно сравнивать день ото дня. Первая проверка — разминка, она не засчитывается. Проверки 2 и 3 задают твой базовый уровень. После этого мы сообщаем об изменении только тогда, когда последние проверки отклоняются больше, чем твои обычные повседневные колебания, на протяжении как минимум недели — этот метод называется индексом надёжного изменения (Reliable Change Index). В остальных случаях ты увидишь «продолжай» или «стабильно». Честное ограничение: Проверка мозга измеряет твои результаты именно в этих словесных заданиях при фиксированных условиях. Это не тест памяти, не показатель IQ и не доказательство общих когнитивных изменений.' },
    { q: 'Есть ли игры для тренировки мозга для детей или пожилых людей?', a: 'Упражнения LexiClash подходят для 12+ лет, со словарным запасом, адаптированным под уровень игрока. Для пожилых игроков короткие языковые задания вроде этих относятся к хорошо изученной области исследований когнитивного старения — вербальная беглость и поиск слов обычно снижаются раньше других навыков. Формат в 60 секунд также не утомляет. Проверка мозга отслеживает только результаты в этих заданиях — это не медицинская и не диагностическая оценка.' },
    { q: 'Игры для мозга действительно помогают в реальном мышлении?', a: 'Честный ответ: мы этого не утверждаем, и к любому приложению, которое так заявляет, стоит относиться скептически. Письмо консенсуса Стэнфорда 2014 года и дело FTC против Lumosity в 2016 году (штраф $2 млн) оба указали на необоснованные заявления о переносе навыков. LexiClash не обещает рост IQ, улучшение памяти или замедление когнитивного снижения. Проверка мозга измеряет твои результаты именно в этих словесных заданиях, честно, во времени — и ничего больше.' },
    { q: 'Я могу отслеживать мой прогресс тренировки мозга со временем?', a: 'Да, двумя способами. Тренировочные раунды используют адаптивную лестницу сложности — прошёл уровень, и в следующий раз он сложнее; дважды подряд не справился — становится легче, так что ты всегда играешь на грани своих возможностей. Проверки мозга (раз в день по каждому упражнению, фиксированная сложность) формируют историю, и после как минимум недели проверок ты получаешь надёжный вердикт об изменении вместо шумного числа.' },
    { q: 'Какие языки поддерживают упражнения для мозга?', a: 'Английский, иврит, шведский, японский, испанский и русский. Каждый язык имеет свой словарь и данные частоты редких слов. RTL полностью поддерживается для иврита. Результаты Проверки мозга относятся именно к тому языку и упражнению, в которое ты играл.' },
  ],

  relatedHeading: 'Связанное',
  relatedHubTitle: 'Центр тренировки мозга',
  relatedHubSub: '4 упражнения, история Проверки мозга, адаптивные уровни',
  relatedScienceTitle: 'Наука словесных игр',
  relatedScienceSub: 'Полная версия: исследования, ссылки, советы по тренировке',
  relatedBestTitle: 'Лучшие онлайн-игры со словами 2026',
  relatedBestSub: '9 игр рейтинговано, честные плюсы и минусы',
  relatedDailyTitle: 'Ежедневное испытание',
  relatedDailySub: 'Word Wheel + Word Hunt Survival',
  relatedWotdTitle: 'Слово дня',
  relatedWotdSub: 'Глубина словарного запаса, ежедневный ритуал',
  relatedMpTitle: 'Многопользовательский',
  relatedMpSub: 'Поиск слов в реальном времени, 2-20+ игроков',

  finalCtaHeading: 'Готов к 60-секундной тренировке?',
  finalCtaBody: 'Выбери упражнение. Потрать минуту. Возвращайся завтра ещё раз. Проходи Проверку мозга раз в день, если хочешь честно узнать свою динамику — без баллов, без значков, только твои собственные цифры во времени.',
  finalCtaPrimary: 'Открыть центр мозга',
  finalCtaSecondary: 'Быстрый старт: Lightning Round',

  videoGameName: 'Упражнения для мозга LexiClash',
  videoGameDescription: 'Бесплатные игры для тренировки мозга со словами — 4 упражнения (по 60 секунд каждое), вдохновлённые заданиями, которые учёные используют для изучения скорости обработки, рабочей памяти, внимания и словарного запаса, плюс ежедневная Проверка мозга, которая честно показывает динамику. В браузере, без скачивания, без регистрации, 6 языков.',
  itemListName: '4 упражнения для тренировки мозга',
  itemListDescription: 'Четыре 60-секундных упражнения со словами, каждое вдохновлено заданием, которое учёные используют для изучения отдельного когнитивного навыка.',
  itemListDescriptions: [
    'Найди как можно больше слов за 60 секунд. Вдохновлено заданиями на быстрый поиск слов, которые используют для изучения скорости обработки.',
    'Запомни последовательность позиций букв, потом вспомни слова. Вдохновлено заданиями на объём рабочей памяти.',
    'Строй длинные непрерывные цепочки слов. Вдохновлено заданиями на устойчивое внимание, такими как тест непрерывного выполнения.',
    'Найди редкие и ценные слова. Вдохновлено заданиями на глубину словарного запаса и извлечение слов из памяти.',
  ],
  howToName: 'Как начать бесплатную тренировку мозга за 60 секунд',
  howToDescription: 'Начни ежедневную тренировку мозга с упражнениями LexiClash — четыре области, по 60 секунд каждое, без регистрации.',
  howToSteps: [
    { name: 'Открой центр мозга', text: 'Перейди на lexiclash.live/ru/brain. Регистрация не требуется для первых упражнений.' },
    { name: 'Выбери область для тренировки', text: 'Выбери из 4 областей: скорость обработки, рабочая память, внимание или словарный запас. Каждое упражнение длится 60 секунд.' },
    { name: 'Играй в упражнение', text: 'Находи слова на сетке одну минуту. Сложность подстраивается — прошёл уровень, и он усложняется; не справился дважды — упрощается.' },
    { name: 'Пройди Проверку мозга', text: 'Раз в день по каждому упражнению играй в тех же фиксированных условиях, что и все. Примерно через неделю проверок получишь честный вердикт: рост, стабильность, или пока недостаточно данных.' },
    { name: 'Тренируйся ежедневно', text: 'Три упражнения в день занимают менее 5 минут и охватывают все 4 области за неделю.' },
  ],
};

const COPY: Record<Locale, BrainLandingCopy> = { en, he, sv, ja, es, ru };

export function getBrainLandingCopy(locale: string): BrainLandingCopy {
  return COPY[(locale as Locale)] ?? en;
}
