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
  metaTitle: 'Free Brain Training Word Games — 5 Drills, 5 Cognitive Domains',
  metaDescription: 'Free brain training word games online — 5 research-backed drills (60 sec each) targeting processing speed, working memory, attention, flexibility, and vocabulary. No download, no signup, 5 languages.',
  metaKeywords: 'brain training games online free, free brain games for adults, word brain games, cognitive exercises online, brain workout games, memory training games, concentration drills, brain drills, mental fitness app free, lumosity alternative free, elevate alternative, free cognitive training, online brain exercises, brain games no download',
  ogTitle: 'Free Brain Training Word Games — 5 Drills, 5 Cognitive Domains',
  ogDescription: '5 research-backed brain drills, 60 seconds each. Free, no download, 5 languages. A free alternative to Lumosity, Elevate, and Peak.',
  twitterTitle: 'Free Brain Training Word Games — 60 sec, 5 Domains',
  twitterDescription: '5 research-backed cognitive drills. Free in your browser, no download.',

  marqueeBadges: ['5 DRILLS · 5 DOMAINS', '60 SECONDS EACH', 'RESEARCH-BACKED', 'FREE FOREVER', 'NO DOWNLOAD', 'BROWSER-BASED'],
  badge: '★ Free Brain Workout ★',
  h1Pre: 'Free brain training,',
  h1Highlight: '5 drills, 60 seconds each.',
  introP1: 'Five word-based cognitive drills. Each one takes a minute. Together they target the five domains brain scientists actually study — processing speed, working memory, attention, flexibility, and vocabulary.',
  introP2: 'No signup wall. No paywall. No 7-day trial that auto-renews. Just open the brain hub and start training. We track your progress on a 5-domain radar chart so you can see which mental muscle is weakest — and which is getting stronger.',
  ctaPrimary: 'Start Brain Training Free',
  ctaSecondary: 'Try Lightning Round (60 sec)',

  drillsHeading: 'The 5 drills, the 5 domains',
  drillsSub: 'Each drill maps to one cognitive domain studied by researchers like Adele Diamond (executive function), and the Duke School of Medicine (word-based memory training).',
  researchLabel: '★ Research basis',
  drills: [
    { name: 'Lightning Round', domain: 'Processing Speed', tagline: 'How fast can you find words?', blurb: 'Sixty seconds. One grid. Find as many valid words as possible. Lightning Round measures processing speed — the rate at which your brain retrieves and validates lexical patterns. It’s the closest a word game gets to a reaction-time test.', research: 'Processing speed declines with age earlier than most other cognitive functions and is one of the strongest predictors of overall cognitive performance. Speeded word-retrieval tasks are used clinically in verbal fluency assessments.' },
    { name: 'Memory Hunt', domain: 'Working Memory', tagline: 'Hold it in your head, then recall', blurb: 'A sequence of letter positions flashes. The grid clears. You recall and form words from memory. Memory Hunt directly trains working memory — the executive system that holds task-relevant information online while you manipulate it.', research: 'Working memory training is the most-studied cognitive intervention in the literature. NIH-indexed research (PMC5930973) finds reliable domain-specific gains.' },
    { name: 'Combo Master', domain: 'Sustained Attention', tagline: 'Build long uninterrupted chains', blurb: 'Build chains of valid words without breaking the streak. Combo Master targets sustained attention — the ability to maintain focus across many consecutive responses without lapses. Most word games reward bursts; this rewards endurance.', research: 'Sustained attention (vigilance) is operationalized in the Continuous Performance Test. It correlates with academic performance and is a clinical marker for ADHD.' },
    { name: 'Pattern Switcher', domain: 'Cognitive Flexibility', tagline: 'Switch rules mid-task', blurb: 'Find words. Then the rule changes. Then it changes again. Pattern Switcher targets cognitive flexibility — the executive function that lets you switch mental sets when the rules shift.', research: 'Cognitive flexibility is one of Adele Diamond’s three core executive functions (with working memory and inhibition). It predicts academic and life outcomes and shows substantial training gains.' },
    { name: 'Rare Gems', domain: 'Vocabulary Depth', tagline: 'Find uncommon, high-value words', blurb: 'Common words score little. Rare words score big. Rare Gems targets vocabulary depth — your access to low-frequency words in semantic memory. It rewards readers, crossword solvers, and word collectors.', research: 'Vocabulary is the most stable cognitive measure across the lifespan. The Duke crossword study (2022) showed word-based puzzles slowed memory decline more effectively than commercial brain apps.' },
  ],

  comparisonHeading: 'vs. the paid brain training apps',
  comparisonHeaders: ['Feature', 'LexiClash', 'Lumosity', 'Elevate', 'Peak'],
  comparisonRows: [
    ['Price', 'Free, no paywall', '$11.99/mo Premium', '$49.99/yr Pro', '$49.99/yr Pro'],
    ['Free games', '5 drills, all unlocked', '3/day rotation', '3/day rotation', '4/day rotation'],
    ['Signup required', 'No (optional)', 'Yes', 'Yes', 'Yes'],
    ['Word focus', '100% word-based', 'Mixed (math/logic)', 'Heavy on word', 'Mixed'],
    ['Domains tracked', '5 (radar chart)', '5 areas', '5 categories', '6 categories'],
    ['Languages', '5 (incl. RTL Hebrew)', 'English mainly', 'English/ES/PT', 'English mainly'],
    ['Browser play', 'Yes, no download', 'Web + app', 'App only', 'App only'],
    ['Research citations visible', 'Yes, in-app', 'Marketing pages', 'Marketing pages', 'Marketing pages'],
  ],
  comparisonFooter: 'FTC fined Lumosity $2M in 2016 for unsupported transfer claims. We don’t promise IQ gains. We promise domain-specific improvement on the drills themselves and on adjacent word skills — which is what the science actually supports.',

  howHeading: 'How it works',
  steps: [
    { step: '1', title: 'Pick a drill', sub: 'Five domains. Pick the one your radar chart says is weakest, or just the one that sounds fun.' },
    { step: '2', title: 'Play 60 seconds', sub: 'One short focused round. Find words, build combos, hunt rare gems. No interruptions.' },
    { step: '3', title: 'Score updates', sub: 'Domain score (0-100) + overall brain score + tier badge. All saved if you create a free profile.' },
    { step: '4', title: 'Train daily', sub: 'Three drills/day = under 5 min. Streaks unlock harder levels (1-5 per drill). All free.' },
  ],

  faqHeading: 'Frequently Asked Questions',
  faqs: [
    { q: 'Are brain training word games actually backed by research?', a: 'Yes — for word-based cognitive drills, the evidence is meaningful. A Duke School of Medicine study (2022) showed crossword-style games slowed memory loss in older adults more than commercial brain-training apps. NIH-published research (PMC5930973) finds working-memory training can produce transferable gains when drills target the right domain. LexiClash maps each of its 5 drills to a specific cognitive domain — processing speed, working memory, attention, flexibility, and vocabulary — based on Adele Diamond’s 2013 executive function framework.' },
    { q: 'How long does a brain training session need to be?', a: 'Each LexiClash drill is 60 seconds. Research suggests short, daily sessions (5-15 minutes total) outperform marathon training for skill retention. Three drills per day = under 5 minutes, hits all domains across the week, and respects how working memory consolidates between sessions.' },
    { q: 'Is LexiClash a free alternative to Lumosity, Elevate, or Peak?', a: 'Yes. Lumosity Premium is roughly $12/month, Elevate Pro about $50/year, Peak Pro $50+/year. LexiClash brain drills are free with no paywall, no signup wall, and no time limit. Trade-off: Lumosity covers 40+ games across math, logic, and word; LexiClash focuses on word-based drills only — narrower scope, deeper word vocabulary signal.' },
    { q: 'What cognitive domains do the 5 brain drills target?', a: 'Lightning Round trains processing speed. Memory Hunt trains working memory. Combo Master trains sustained attention. Pattern Switcher trains cognitive flexibility (similar to Stroop tasks). Rare Gems trains vocabulary depth. Each drill maps 1:1 to a domain on the brain-score radar chart.' },
    { q: 'How does LexiClash measure brain progress?', a: 'After every drill, your domain score (0-100) updates using a rolling average — so one bad day doesn’t crater your stats. Your overall brain score weights the 5 domains and lands you in one of 6 tiers from Novice to Master. A history chart shows daily progress; a radar chart shows which domains are weakest.' },
    { q: 'Are there brain training games for kids or seniors?', a: 'LexiClash drills work for ages 12+ with vocabulary scaled to player skill. For seniors, the Duke crossword research is the closest evidence — short, language-based drills are especially valuable for verbal fluency and lexical retrieval, which decline earlier than other functions. The 60-second drill length is also low-fatigue for older players.' },
    { q: 'Do brain games actually transfer to real-world thinking?', a: 'Honest answer: transfer is modest, not magic. The 2014 Stanford consensus letter cautioned against over-claims, and the 2016 FTC fined Lumosity $2M for unsupported transfer claims. What’s defensible: domain-specific gains (word-finding speed, vocabulary recall, sustained attention on text tasks) do transfer to similar tasks. LexiClash drills don’t promise IQ gains — just measurable improvements on the drills themselves and on adjacent word-based skills.' },
    { q: 'Can I track my brain training progress over time?', a: 'Yes. The brain hub shows your overall brain score, a 5-domain radar chart, daily/weekly/monthly history, drill-specific level progression (5 levels per drill), and a tier badge. Brain score history persists per-account; create a free profile to keep streaks across devices.' },
    { q: 'What languages do the brain drills support?', a: 'English, Hebrew, Swedish, Japanese, and Spanish. Each language has its own dictionary and rare-word frequency data. RTL is fully supported for Hebrew. All cognitive scoring is language-independent — your brain score is portable across the language you train in.' },
  ],

  relatedHeading: 'Related',
  relatedHubTitle: 'Brain Training Hub',
  relatedHubSub: '5-domain radar chart, history, all drills',
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
  finalCtaBody: 'Pick a drill. Spend a minute. See your brain score update on the radar chart. Repeat tomorrow. That’s the whole pitch — and the science says short, daily, domain-specific drills are exactly what works.',
  finalCtaPrimary: 'Open Brain Hub',
  finalCtaSecondary: 'Quick Start: Lightning Round',

  videoGameName: 'LexiClash Brain Drills',
  videoGameDescription: 'Free brain training word games — 5 research-backed cognitive drills (60 seconds each) targeting processing speed, working memory, attention, cognitive flexibility, and vocabulary. Browser-based, no download, no signup, 5 languages.',
  itemListName: '5 Brain Training Drills',
  itemListDescription: 'Five 60-second cognitive drills, each targeting a distinct domain of executive function and language cognition.',
  itemListDescriptions: [
    'Find as many words as possible in 60 seconds. Targets processing speed — how quickly the brain retrieves and validates lexical patterns.',
    'Memorize a sequence of letter positions, then recall words from them. Targets working memory — the system that holds information for active manipulation.',
    'Build long uninterrupted word chains. Targets sustained attention — focus across consecutive responses without lapses.',
    'Switch between word-finding rules mid-drill. Targets cognitive flexibility — the executive function studied via Stroop and task-switching paradigms.',
    'Find uncommon and high-value words. Targets vocabulary depth — lexical retrieval of low-frequency words from semantic memory.',
  ],
  howToName: 'How to Start Free Brain Training in 60 Seconds',
  howToDescription: 'Begin a daily brain workout with LexiClash drills — five domains, 60 seconds each, no signup required.',
  howToSteps: [
    { name: 'Open the brain hub', text: 'Visit lexiclash.live/en/brain. No signup required to play your first drills.' },
    { name: 'Pick a domain to train', text: 'Choose from 5 domains: processing speed, working memory, attention, cognitive flexibility, or vocabulary. Each drill takes 60 seconds.' },
    { name: 'Play the drill', text: 'Find words on a grid for one minute. Score, combo, and rare-word bonuses count toward your brain score.' },
    { name: 'Track your progress', text: 'View your brain score, 5-domain radar chart, and tier (Novice → Master). Create a free account to save progress across devices.' },
    { name: 'Train daily', text: 'Three drills per day takes under 5 minutes and exercises all 5 domains across a week. Streaks unlock harder levels.' },
  ],
};

const he: BrainLandingCopy = {
  metaTitle: 'משחקי אימון מוח חינם — 5 תרגילים, 5 תחומים קוגניטיביים',
  metaDescription: 'משחקי אימון מוח חינם אונליין — 5 תרגילי מילים מבוססי מחקר (60 שניות כל אחד) שמכוונים למהירות עיבוד, זיכרון עבודה, ריכוז, גמישות ואוצר מילים. בלי הורדה, בלי הרשמה, ב-5 שפות.',
  metaKeywords: 'משחקי אימון מוח חינם, משחקי מוח לכולם, אימון קוגניטיבי, תרגילי זיכרון, משחקי מילים למוח, lumosity חלופה חינם, אימון מוח אונליין, משחקי ריכוז, תרגילי מוח, אימון מוחי, משחקי חשיבה',
  ogTitle: 'משחקי אימון מוח חינם — 5 תרגילים, 5 תחומים קוגניטיביים',
  ogDescription: '5 תרגילי מוח מבוססי מחקר, 60 שניות כל אחד. חינם, בלי הורדה, ב-5 שפות. חלופה חינמית ל-Lumosity, Elevate ו-Peak.',
  twitterTitle: 'אימון מוח חינם — 60 שניות, 5 תחומים',
  twitterDescription: '5 תרגילים קוגניטיביים מבוססי מחקר. חינם בדפדפן, בלי הורדה.',

  marqueeBadges: ['5 תרגילים · 5 תחומים', '60 שניות לכל אחד', 'מבוסס מחקר', 'חינם לתמיד', 'בלי הורדה', 'בדפדפן'],
  badge: '★ אימון מוח חינם ★',
  h1Pre: 'אימון מוח חינם,',
  h1Highlight: '5 תרגילים, 60 שניות כל אחד.',
  introP1: 'חמישה תרגילים קוגניטיביים מבוססי מילים. כל אחד נמשך דקה. ביחד הם מכוונים לחמישה תחומים שמדעני מוח באמת חוקרים — מהירות עיבוד, זיכרון עבודה, ריכוז, גמישות ואוצר מילים.',
  introP2: 'בלי קיר הרשמה. בלי תשלום. בלי תקופת ניסיון של 7 ימים שמתחדשת אוטומטית. פשוט פותחים את מרכז המוח ומתחילים. אנחנו עוקבים אחרי ההתקדמות בגרף ראדאר של 5 תחומים — תראו איזה שריר מנטלי הכי חלש ואיזה מתחזק.',
  ctaPrimary: 'התחילו אימון מוח חינם',
  ctaSecondary: 'נסו Lightning Round (60 שניות)',

  drillsHeading: '5 התרגילים, 5 התחומים',
  drillsSub: 'כל תרגיל ממופה לתחום קוגניטיבי אחד שנחקר על ידי חוקרים כמו אדל דיימונד (תפקודים ניהוליים) ובית הספר לרפואה של דיוק (אימון זיכרון מבוסס מילים).',
  researchLabel: '★ בסיס מחקרי',
  drills: [
    { name: 'Lightning Round', domain: 'מהירות עיבוד', tagline: 'כמה מהר תמצאו מילים?', blurb: 'שישים שניות. רשת אחת. למצוא כמה שיותר מילים תקפות. Lightning Round מודד מהירות עיבוד — הקצב שבו המוח שולף ומאמת תבניות לקסיקליות.', research: 'מהירות עיבוד יורדת עם הגיל מוקדם יותר מתפקודים קוגניטיביים אחרים והיא אחד המנבאים החזקים ביותר לביצוע קוגניטיבי כללי. משימות שליפה מהירה משמשות במבחני שטף מילולי קליניים.' },
    { name: 'Memory Hunt', domain: 'זיכרון עבודה', tagline: 'תזכרו, ואז תיזכרו', blurb: 'רצף של מיקומי אותיות נדלק. הרשת מתנקה. אתם נזכרים ובונים מילים מהזיכרון. Memory Hunt מאמן ישירות זיכרון עבודה — המערכת הניהולית שמחזיקה מידע רלוונטי בזמן עיבוד.', research: 'אימון זיכרון עבודה הוא ההתערבות הקוגניטיבית הנחקרת ביותר. מחקר שפורסם ב-NIH (PMC5930973) מראה רווחים אמינים ספציפיים לתחום.' },
    { name: 'Combo Master', domain: 'ריכוז ממושך', tagline: 'בנו רצפים ארוכים בלי להפסיק', blurb: 'בנו רצפים של מילים תקפות בלי לשבור את הרצף. Combo Master מכוון לריכוז ממושך — היכולת לשמור על מיקוד לאורך תגובות עוקבות בלי הסחות.', research: 'ריכוז ממושך נמדד במבחן הביצוע הרציף. הוא מתאם עם הישגים אקדמיים ומשמש סמן קליני לאבחון ADHD.' },
    { name: 'Pattern Switcher', domain: 'גמישות קוגניטיבית', tagline: 'החליפו חוקים תוך כדי משחק', blurb: 'מצאו מילים. אז החוק משתנה. אז שוב. Pattern Switcher מכוון לגמישות קוגניטיבית — התפקוד הניהולי שמאפשר להחליף סטים מנטליים.', research: 'גמישות קוגניטיבית היא אחד משלושת התפקודים הניהוליים המרכזיים של אדל דיימונד. היא מנבאת הצלחה אקדמית ושינויים משמעותיים מאימון.' },
    { name: 'Rare Gems', domain: 'עומק אוצר מילים', tagline: 'מצאו מילים נדירות ויקרות', blurb: 'מילים נפוצות שוות מעט. מילים נדירות שוות הרבה. Rare Gems מכוון לעומק אוצר המילים — הגישה שלכם למילים בתדירות נמוכה בזיכרון הסמנטי.', research: 'אוצר מילים הוא המדד הקוגניטיבי היציב ביותר לאורך החיים. מחקר תשבצים של אוניברסיטת דיוק (2022) הראה שחידות מבוססות מילים האטו ירידת זיכרון יותר מאפליקציות מוח מסחריות.' },
  ],

  comparisonHeading: 'בהשוואה לאפליקציות מוח בתשלום',
  comparisonHeaders: ['תכונה', 'LexiClash', 'Lumosity', 'Elevate', 'Peak'],
  comparisonRows: [
    ['מחיר', 'חינם, בלי תשלום', '$11.99/חודש Premium', '$49.99/שנה Pro', '$49.99/שנה Pro'],
    ['משחקי חינם', '5 תרגילים, הכל פתוח', '3 ביום ברוטציה', '3 ביום ברוטציה', '4 ביום ברוטציה'],
    ['הרשמה נדרשת', 'לא (אופציונלי)', 'כן', 'כן', 'כן'],
    ['מיקוד מילים', '100% מבוסס מילים', 'מעורב (מתמטיקה/לוגיקה)', 'דגש על מילים', 'מעורב'],
    ['תחומים נמדדים', '5 (תרשים ראדאר)', '5 תחומים', '5 קטגוריות', '6 קטגוריות'],
    ['שפות', '5 (כולל עברית RTL)', 'בעיקר אנגלית', 'אנגלית/ספרדית/פורט.', 'בעיקר אנגלית'],
    ['משחק בדפדפן', 'כן, בלי הורדה', 'אתר + אפליקציה', 'אפליקציה בלבד', 'אפליקציה בלבד'],
    ['ציטוטי מחקר גלויים', 'כן, באפליקציה', 'בעמודי שיווק', 'בעמודי שיווק', 'בעמודי שיווק'],
  ],
  comparisonFooter: 'ה-FTC קנס את Lumosity ב-2 מיליון דולר ב-2016 על טענות העברה לא מבוססות. אנחנו לא מבטיחים גידול ב-IQ. אנחנו מבטיחים שיפור ספציפי לתחום בתרגילים עצמם וביכולות מילוליות סמוכות — וזה מה שהמדע באמת תומך בו.',

  howHeading: 'איך זה עובד',
  steps: [
    { step: '1', title: 'בחרו תרגיל', sub: 'חמישה תחומים. בחרו מה שתרשים הראדאר אומר שחלש, או פשוט מה שנשמע כיף.' },
    { step: '2', title: 'שחקו 60 שניות', sub: 'סיבוב קצר וממוקד. למצוא מילים, לבנות קומבואים, לצוד אבני חן נדירות. בלי הפרעות.' },
    { step: '3', title: 'הציון מתעדכן', sub: 'ציון תחום (0-100) + ציון מוח כולל + תג דרגה. הכל נשמר אם תיצרו פרופיל חינם.' },
    { step: '4', title: 'התאמנו יומיומית', sub: 'שלושה תרגילים ביום = פחות מ-5 דקות. רצפים פותחים רמות קשות יותר (1-5 לכל תרגיל). הכל חינם.' },
  ],

  faqHeading: 'שאלות נפוצות',
  faqs: [
    { q: 'האם משחקי אימון מוח באמת מבוססי מחקר?', a: 'כן — לתרגילים קוגניטיביים מבוססי מילים, הראיות משמעותיות. מחקר של בית הספר לרפואה של דיוק (2022) הראה שמשחקי תשבצים האטו אובדן זיכרון אצל מבוגרים יותר מאפליקציות אימון מוח מסחריות. מחקר שפורסם ב-NIH (PMC5930973) מצא שאימון זיכרון עבודה יכול להפיק רווחים בני העברה כשהתרגילים מכוונים לתחום הנכון.' },
    { q: 'כמה זמן צריך אימון מוח?', a: 'כל תרגיל ב-LexiClash הוא 60 שניות. מחקר מציע ששינויים יומיים קצרים (5-15 דקות סך הכל) עולים על אימון מרתון לזכירת מיומנויות. שלושה תרגילים ביום = פחות מ-5 דקות, מכסה את כל התחומים במהלך השבוע.' },
    { q: 'האם LexiClash היא חלופה חינמית ל-Lumosity, Elevate או Peak?', a: 'כן. Lumosity Premium עולה כ-12$ לחודש, Elevate Pro כ-50$ בשנה, Peak Pro 50$+ בשנה. תרגילי המוח של LexiClash חינמיים ללא תשלום, בלי קיר הרשמה ובלי הגבלת זמן.' },
    { q: 'אילו תחומים קוגניטיביים מטופלים על ידי 5 התרגילים?', a: 'Lightning Round מאמן מהירות עיבוד. Memory Hunt מאמן זיכרון עבודה. Combo Master מאמן ריכוז ממושך. Pattern Switcher מאמן גמישות קוגניטיבית (דומה למשימות Stroop). Rare Gems מאמן עומק אוצר מילים. כל תרגיל ממופה 1:1 לתחום בתרשים הראדאר של ציון המוח.' },
    { q: 'איך LexiClash מודדת התקדמות מוחית?', a: 'אחרי כל תרגיל, ציון התחום (0-100) מתעדכן בעזרת ממוצע מתגלגל — כך שיום רע אחד לא הורס את הסטטיסטיקות. ציון המוח הכולל מציב אתכם באחת מ-6 דרגות מ-Novice ל-Master. גרף היסטוריה מציג התקדמות יומית; תרשים ראדאר מציג איזה תחומים חלשים.' },
    { q: 'האם יש משחקי אימון מוח לילדים או למבוגרים?', a: 'תרגילי LexiClash מתאימים לגילאי 12+ עם אוצר מילים שמותאם לרמת השחקן. לקשישים, מחקר התשבצים של דיוק הוא הראיה הקרובה ביותר — תרגילי שפה קצרים חשובים במיוחד לשטף מילולי ולשליפה לקסיקלית, שיורדים מוקדם יותר מתפקודים אחרים.' },
    { q: 'האם משחקי מוח באמת מועילים לחשיבה היומיומית?', a: 'תשובה כנה: ההעברה צנועה, לא קסם. ב-2016 ה-FTC קנס את Lumosity ב-2 מיליון דולר על טענות העברה לא מבוססות. מה שכן ניתן להגנה: רווחים ספציפיים לתחום (מהירות מציאת מילים, שליפת אוצר מילים, ריכוז ממושך) באמת מועברים למשימות דומות.' },
    { q: 'האם אני יכול לעקוב אחר ההתקדמות שלי לאורך זמן?', a: 'כן. מרכז המוח מציג את ציון המוח הכולל, תרשים ראדאר של 5 תחומים, היסטוריה יומית/שבועית/חודשית, התקדמות רמה לכל תרגיל (5 רמות לכל תרגיל) ותג דרגה. צרו פרופיל חינם כדי לשמור רצפים בין מכשירים.' },
    { q: 'אילו שפות תרגילי המוח תומכים?', a: 'אנגלית, עברית, שוודית, יפנית וספרדית. לכל שפה מילון משלה ונתוני תדירות מילים נדירות. RTL נתמך במלואו לעברית. כל הניקוד הקוגניטיבי בלתי תלוי שפה — ציון המוח שלכם נייד בין השפות.' },
  ],

  relatedHeading: 'קשור',
  relatedHubTitle: 'מרכז אימון המוח',
  relatedHubSub: 'תרשים ראדאר של 5 תחומים, היסטוריה, כל התרגילים',
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
  finalCtaBody: 'בחרו תרגיל. השקיעו דקה. תראו את ציון המוח מתעדכן בתרשים הראדאר. חזרו מחר. זה כל הרעיון — והמדע אומר שתרגילים יומיים קצרים וספציפיים זה בדיוק מה שעובד.',
  finalCtaPrimary: 'פתחו את מרכז המוח',
  finalCtaSecondary: 'התחלה מהירה: Lightning Round',

  videoGameName: 'תרגילי המוח של LexiClash',
  videoGameDescription: 'משחקי אימון מוח מבוססי מילים חינם — 5 תרגילים קוגניטיביים מבוססי מחקר (60 שניות כל אחד) שמכוונים למהירות עיבוד, זיכרון עבודה, ריכוז, גמישות קוגניטיבית ואוצר מילים. בדפדפן, בלי הורדה, בלי הרשמה, ב-5 שפות.',
  itemListName: '5 תרגילי אימון מוח',
  itemListDescription: 'חמישה תרגילים קוגניטיביים בני 60 שניות, כל אחד מכוון לתחום נפרד של תפקוד ניהולי וקוגניציית שפה.',
  itemListDescriptions: [
    'מצאו כמה שיותר מילים ב-60 שניות. מכוון למהירות עיבוד — באיזו מהירות המוח שולף ומאמת תבניות לקסיקליות.',
    'שננו רצף של מיקומי אותיות, ואז היזכרו במילים מהם. מכוון לזיכרון עבודה — המערכת שמחזיקה מידע למניפולציה פעילה.',
    'בנו רצפי מילים ארוכים. מכוון לריכוז ממושך — מיקוד לאורך תגובות עוקבות.',
    'החליפו בין כללי מציאת מילים תוך כדי תרגיל. מכוון לגמישות קוגניטיבית — תפקוד ניהולי שנחקר במשימות Stroop והחלפת משימות.',
    'מצאו מילים נדירות ויקרות. מכוון לעומק אוצר מילים — שליפה לקסיקלית של מילים בתדירות נמוכה מהזיכרון הסמנטי.',
  ],
  howToName: 'איך להתחיל אימון מוח חינם ב-60 שניות',
  howToDescription: 'התחילו אימון מוח יומי עם תרגילי LexiClash — חמישה תחומים, 60 שניות לכל אחד, בלי הרשמה.',
  howToSteps: [
    { name: 'פתחו את מרכז המוח', text: 'היכנסו ל-lexiclash.live/he/brain. אין צורך בהרשמה לתרגילים הראשונים.' },
    { name: 'בחרו תחום לאמן', text: 'בחרו מבין 5 תחומים: מהירות עיבוד, זיכרון עבודה, ריכוז, גמישות קוגניטיבית או אוצר מילים. כל תרגיל אורך 60 שניות.' },
    { name: 'שחקו את התרגיל', text: 'מצאו מילים על רשת לדקה. ניקוד, קומבואים ובונוסים על מילים נדירות נספרים לציון המוח שלכם.' },
    { name: 'עקבו אחר ההתקדמות', text: 'צפו בציון המוח, תרשים ראדאר של 5 תחומים ובדרגה (Novice → Master). צרו חשבון חינם לשמור התקדמות בין מכשירים.' },
    { name: 'התאמנו יומיומית', text: 'שלושה תרגילים ביום אורכים פחות מ-5 דקות ומאמנים את כל 5 התחומים במהלך השבוע. רצפים פותחים רמות קשות יותר.' },
  ],
};

const sv: BrainLandingCopy = {
  metaTitle: 'Gratis hjärnträning ordspel — 5 övningar, 5 kognitiva domäner',
  metaDescription: 'Gratis hjärnträningsspel online — 5 forskningsbaserade övningar (60 sek vardera) som tränar processhastighet, arbetsminne, uppmärksamhet, flexibilitet och ordförråd. Ingen nedladdning, ingen registrering, 5 språk.',
  metaKeywords: 'gratis hjärnträning, hjärnträning online, ordspel hjärnträning, kognitiva övningar, minnesträning, koncentrationsövningar, lumosity gratis alternativ, elevate alternativ, mental träning, hjärngym, ordspel för minnet',
  ogTitle: 'Gratis hjärnträning ordspel — 5 övningar, 5 kognitiva domäner',
  ogDescription: '5 forskningsbaserade hjärnövningar, 60 sekunder vardera. Gratis, ingen nedladdning, 5 språk. Ett gratis alternativ till Lumosity, Elevate och Peak.',
  twitterTitle: 'Gratis hjärnträning — 60 sek, 5 domäner',
  twitterDescription: '5 forskningsbaserade kognitiva övningar. Gratis i webbläsaren.',

  marqueeBadges: ['5 ÖVNINGAR · 5 DOMÄNER', '60 SEKUNDER VARDERA', 'FORSKNINGSBASERAT', 'GRATIS FÖR ALLTID', 'INGEN NEDLADDNING', 'I WEBBLÄSAREN'],
  badge: '★ Gratis hjärngym ★',
  h1Pre: 'Gratis hjärnträning,',
  h1Highlight: '5 övningar, 60 sek vardera.',
  introP1: 'Fem ordbaserade kognitiva övningar. Var och en tar en minut. Tillsammans tränar de de fem domäner som hjärnforskare faktiskt studerar — processhastighet, arbetsminne, uppmärksamhet, flexibilitet och ordförråd.',
  introP2: 'Ingen registrering. Ingen betalvägg. Ingen 7-dagars gratis testperiod som förnyas automatiskt. Öppna bara hjärnnavet och börja träna. Vi följer dina framsteg på ett radardiagram med 5 domäner så du ser vilken mental muskel som är svagast — och vilken som blir starkare.',
  ctaPrimary: 'Börja gratis hjärnträning',
  ctaSecondary: 'Prova Lightning Round (60 sek)',

  drillsHeading: 'De 5 övningarna, de 5 domänerna',
  drillsSub: 'Varje övning kopplas till en kognitiv domän som forskare som Adele Diamond (exekutiva funktioner) och Duke School of Medicine (ordbaserad minnesträning) studerar.',
  researchLabel: '★ Forskningsgrund',
  drills: [
    { name: 'Lightning Round', domain: 'Processhastighet', tagline: 'Hur snabbt hittar du ord?', blurb: 'Sextio sekunder. En rutnät. Hitta så många giltiga ord som möjligt. Lightning Round mäter processhastighet — den hastighet med vilken hjärnan hämtar och validerar lexikala mönster.', research: 'Processhastighet minskar med åldern tidigare än de flesta andra kognitiva funktioner och är en av de starkaste prediktorerna för övergripande kognitiv prestanda. Snabba ordhämtningstester används kliniskt i bedömningar av verbal flyt.' },
    { name: 'Memory Hunt', domain: 'Arbetsminne', tagline: 'Behåll i minnet, sedan minns', blurb: 'En sekvens av bokstavspositioner blinkar. Rutnätet rensas. Du minns och bildar ord från minnet. Memory Hunt tränar direkt arbetsminnet — det exekutiva systemet som håller uppgiftsrelevant information online medan du manipulerar den.', research: 'Arbetsminnesträning är den mest studerade kognitiva interventionen i litteraturen. NIH-indexerad forskning (PMC5930973) hittar tillförlitliga domänspecifika vinster.' },
    { name: 'Combo Master', domain: 'Uthållig uppmärksamhet', tagline: 'Bygg långa obrutna kedjor', blurb: 'Bygg kedjor av giltiga ord utan att bryta sviten. Combo Master tränar uthållig uppmärksamhet — förmågan att bibehålla fokus över många på varandra följande svar utan luckor.', research: 'Uthållig uppmärksamhet (vakenhet) operationaliseras i Continuous Performance Test. Den korrelerar med akademisk prestation och är en klinisk markör för ADHD.' },
    { name: 'Pattern Switcher', domain: 'Kognitiv flexibilitet', tagline: 'Byt regler mitt i uppgiften', blurb: 'Hitta ord. Sedan ändras regeln. Sedan igen. Pattern Switcher tränar kognitiv flexibilitet — den exekutiva funktionen som låter dig byta mentala set när reglerna förändras.', research: 'Kognitiv flexibilitet är en av Adele Diamonds tre kärnexekutiva funktioner (med arbetsminne och inhibition). Den förutspår akademiska och livsutfall och visar betydande träningsvinster.' },
    { name: 'Rare Gems', domain: 'Ordförrådsdjup', tagline: 'Hitta ovanliga, värdefulla ord', blurb: 'Vanliga ord ger lite poäng. Sällsynta ord ger mycket. Rare Gems tränar ordförrådsdjup — din tillgång till lågfrekventa ord i semantiskt minne.', research: 'Ordförråd är det mest stabila kognitiva måttet över livstiden. Duke korsordsstudien (2022) visade att ordbaserade pussel bromsade minnesförsämring mer effektivt än kommersiella hjärnappar.' },
  ],

  comparisonHeading: 'jämfört med betalda hjärnträningsappar',
  comparisonHeaders: ['Funktion', 'LexiClash', 'Lumosity', 'Elevate', 'Peak'],
  comparisonRows: [
    ['Pris', 'Gratis, ingen betalvägg', '$11.99/mån Premium', '$49.99/år Pro', '$49.99/år Pro'],
    ['Gratisspel', '5 övningar, alla upplåsta', '3/dag rotation', '3/dag rotation', '4/dag rotation'],
    ['Registrering krävs', 'Nej (valfri)', 'Ja', 'Ja', 'Ja'],
    ['Ordfokus', '100% ordbaserad', 'Blandat (matte/logik)', 'Mycket ord', 'Blandat'],
    ['Domäner spårade', '5 (radardiagram)', '5 områden', '5 kategorier', '6 kategorier'],
    ['Språk', '5 (inkl. RTL hebreiska)', 'Främst engelska', 'Engelska/SP/PT', 'Främst engelska'],
    ['Spel i webbläsaren', 'Ja, ingen nedladdning', 'Webb + app', 'Endast app', 'Endast app'],
    ['Forskningscitat synliga', 'Ja, i appen', 'Marknadssidor', 'Marknadssidor', 'Marknadssidor'],
  ],
  comparisonFooter: 'FTC bötfällde Lumosity med $2M 2016 för obekräftade transferpåståenden. Vi lovar inga IQ-vinster. Vi lovar domänspecifik förbättring på själva övningarna och på närliggande ordfärdigheter — vilket är det vetenskapen faktiskt stöder.',

  howHeading: 'Så fungerar det',
  steps: [
    { step: '1', title: 'Välj en övning', sub: 'Fem domäner. Välj den ditt radardiagram säger är svagast, eller bara den som låter rolig.' },
    { step: '2', title: 'Spela 60 sekunder', sub: 'En kort fokuserad runda. Hitta ord, bygg kombos, jaga sällsynta ädelstenar. Inga avbrott.' },
    { step: '3', title: 'Poängen uppdateras', sub: 'Domänpoäng (0-100) + total hjärnpoäng + nivåmärke. Allt sparat om du skapar en gratis profil.' },
    { step: '4', title: 'Träna dagligen', sub: 'Tre övningar/dag = under 5 min. Sviter låser upp svårare nivåer (1-5 per övning). Allt gratis.' },
  ],

  faqHeading: 'Vanliga frågor',
  faqs: [
    { q: 'Är hjärnträningsspel verkligen forskningsbaserade?', a: 'Ja — för ordbaserade kognitiva övningar är bevisen meningsfulla. En studie från Duke School of Medicine (2022) visade att korsordsspel saktade minnesförlust hos äldre vuxna mer än kommersiella hjärnträningsappar. NIH-publicerad forskning (PMC5930973) finner att arbetsminnesträning kan producera överförbara vinster när övningar riktas mot rätt domän.' },
    { q: 'Hur lång behöver en hjärnträningssession vara?', a: 'Varje LexiClash-övning är 60 sekunder. Forskning föreslår att korta dagliga sessioner (5-15 minuter totalt) överträffar maratonträning för färdighetsbevarande. Tre övningar per dag = under 5 minuter, träffar alla domäner under veckan.' },
    { q: 'Är LexiClash ett gratis alternativ till Lumosity, Elevate eller Peak?', a: 'Ja. Lumosity Premium kostar cirka $12/månad, Elevate Pro cirka $50/år, Peak Pro $50+/år. LexiClash hjärnövningar är gratis utan betalvägg, registreringsvägg eller tidsgräns.' },
    { q: 'Vilka kognitiva domäner tränar de 5 hjärnövningarna?', a: 'Lightning Round tränar processhastighet. Memory Hunt tränar arbetsminne. Combo Master tränar uthållig uppmärksamhet. Pattern Switcher tränar kognitiv flexibilitet (liknande Stroop-uppgifter). Rare Gems tränar ordförrådsdjup. Varje övning kopplas 1:1 till en domän på hjärnpoängens radardiagram.' },
    { q: 'Hur mäter LexiClash hjärnframsteg?', a: 'Efter varje övning uppdateras din domänpoäng (0-100) med ett rullande genomsnitt — så en dålig dag krossar inte din statistik. Din totala hjärnpoäng landar dig i en av 6 nivåer från Novice till Master. Ett historikdiagram visar dagliga framsteg; ett radardiagram visar svaga domäner.' },
    { q: 'Finns det hjärnträningsspel för barn eller äldre?', a: 'LexiClash-övningar fungerar för åldrar 12+ med ordförråd skalat till spelarens nivå. För äldre är Duke korsordsstudien det närmaste beviset — korta språkbaserade övningar är särskilt värdefulla för verbal flyt och lexikal hämtning, som minskar tidigare än andra funktioner.' },
    { q: 'Överförs hjärnspel till verkligt tänkande?', a: 'Ärligt svar: överföringen är blygsam, inte magi. Stanford-konsensusbrevet 2014 varnade mot överdrivna påståenden, och 2016 bötfällde FTC Lumosity med $2M. Det som är försvarbart: domänspecifika vinster (ordfindshastighet, ordförrådsåterkallelse, uthållig uppmärksamhet på textuppgifter) överförs till liknande uppgifter.' },
    { q: 'Kan jag spåra mina hjärnträningsframsteg över tid?', a: 'Ja. Hjärnnavet visar din totala hjärnpoäng, ett 5-domäns radardiagram, daglig/veckovis/månatlig historik, övningsspecifik nivåprogression (5 nivåer per övning) och ett nivåmärke. Skapa en gratis profil för att behålla sviter över enheter.' },
    { q: 'Vilka språk stöder hjärnövningarna?', a: 'Engelska, hebreiska, svenska, japanska och spanska. Varje språk har sin egen ordbok och sällsynta-ord-frekvensdata. RTL stöds fullständigt för hebreiska. All kognitiv poängsättning är språkoberoende — din hjärnpoäng är portabel mellan språk.' },
  ],

  relatedHeading: 'Relaterat',
  relatedHubTitle: 'Hjärnträningsnav',
  relatedHubSub: '5-domäns radardiagram, historik, alla övningar',
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
  finalCtaBody: 'Välj en övning. Spendera en minut. Se din hjärnpoäng uppdateras på radardiagrammet. Upprepa imorgon. Det är hela pitchen — och vetenskapen säger att korta, dagliga, domänspecifika övningar är exakt vad som fungerar.',
  finalCtaPrimary: 'Öppna hjärnnav',
  finalCtaSecondary: 'Snabbstart: Lightning Round',

  videoGameName: 'LexiClash Hjärnövningar',
  videoGameDescription: 'Gratis hjärnträningsordspel — 5 forskningsbaserade kognitiva övningar (60 sekunder vardera) som tränar processhastighet, arbetsminne, uppmärksamhet, kognitiv flexibilitet och ordförråd. Webbläsarbaserad, ingen nedladdning, ingen registrering, 5 språk.',
  itemListName: '5 hjärnträningsövningar',
  itemListDescription: 'Fem 60-sekunders kognitiva övningar, var och en riktad mot en distinkt domän av exekutiv funktion och språkkognition.',
  itemListDescriptions: [
    'Hitta så många ord som möjligt på 60 sekunder. Tränar processhastighet — hur snabbt hjärnan hämtar och validerar lexikala mönster.',
    'Memorera en sekvens av bokstavspositioner, sedan minns ord från dem. Tränar arbetsminne — systemet som håller information för aktiv manipulation.',
    'Bygg långa obrutna ordkedjor. Tränar uthållig uppmärksamhet — fokus över på varandra följande svar utan luckor.',
    'Byt mellan ordfindregler mitt i övningen. Tränar kognitiv flexibilitet — den exekutiva funktionen studerad via Stroop och uppgiftsbyte.',
    'Hitta ovanliga och högvärdiga ord. Tränar ordförrådsdjup — lexikal hämtning av lågfrekventa ord från semantiskt minne.',
  ],
  howToName: 'Hur man startar gratis hjärnträning på 60 sekunder',
  howToDescription: 'Börja en daglig hjärnträning med LexiClash-övningar — fem domäner, 60 sekunder vardera, ingen registrering krävs.',
  howToSteps: [
    { name: 'Öppna hjärnnavet', text: 'Besök lexiclash.live/sv/brain. Ingen registrering krävs för dina första övningar.' },
    { name: 'Välj en domän att träna', text: 'Välj från 5 domäner: processhastighet, arbetsminne, uppmärksamhet, kognitiv flexibilitet eller ordförråd. Varje övning tar 60 sekunder.' },
    { name: 'Spela övningen', text: 'Hitta ord på en rutnät i en minut. Poäng, kombo och bonus för sällsynta ord räknas mot din hjärnpoäng.' },
    { name: 'Spåra dina framsteg', text: 'Visa din hjärnpoäng, 5-domäns radardiagram och nivå (Novice → Master). Skapa ett gratis konto för att spara framsteg över enheter.' },
    { name: 'Träna dagligen', text: 'Tre övningar per dag tar under 5 minuter och tränar alla 5 domäner under en vecka. Sviter låser upp svårare nivåer.' },
  ],
};

const ja: BrainLandingCopy = {
  metaTitle: '無料の脳トレ単語ゲーム — 5つのドリル、5つの認知領域',
  metaDescription: '無料の脳トレ単語ゲーム — 処理速度、ワーキングメモリ、注意、柔軟性、語彙を鍛える研究ベースの5ドリル(各60秒)。ダウンロード不要、登録不要、5言語対応。',
  metaKeywords: '脳トレゲーム 無料, 無料脳トレ, 単語脳トレ, 認知トレーニング, 記憶トレーニング, 集中力トレーニング, ルモシティ 代替 無料, 脳トレ オンライン, 大人の脳トレ, 言葉のゲーム 脳トレ',
  ogTitle: '無料の脳トレ単語ゲーム — 5つのドリル、5つの認知領域',
  ogDescription: '研究ベースの5つの脳トレドリル、各60秒。無料、ダウンロード不要、5言語。Lumosity・Elevate・Peakの無料代替。',
  twitterTitle: '無料脳トレ — 60秒、5領域',
  twitterDescription: '研究ベースの5つの認知ドリル。ブラウザで無料、ダウンロード不要。',

  marqueeBadges: ['5ドリル · 5領域', '各60秒', '研究ベース', 'ずっと無料', 'ダウンロード不要', 'ブラウザ対応'],
  badge: '★ 無料の脳トレ ★',
  h1Pre: '無料の脳トレ、',
  h1Highlight: '5ドリル、各60秒。',
  introP1: '5つの単語ベースの認知ドリル。各ドリル1分間。脳科学者が実際に研究する5領域 — 処理速度、ワーキングメモリ、注意、柔軟性、語彙 — をまとめて鍛えます。',
  introP2: '登録の壁なし。有料の壁なし。自動更新の7日間トライアルもなし。脳ハブを開いて始めるだけ。5領域のレーダーチャートで進捗を追い、どの精神的筋肉が最も弱いか — そしてどれが強くなっているかが見えます。',
  ctaPrimary: '無料で脳トレを始める',
  ctaSecondary: 'Lightning Round (60秒)を試す',

  drillsHeading: '5つのドリル、5つの領域',
  drillsSub: '各ドリルは、アデル・ダイアモンド (実行機能) やデューク医学校 (単語ベースの記憶トレーニング) などの研究者が研究した認知領域に1対1で対応しています。',
  researchLabel: '★ 研究的根拠',
  drills: [
    { name: 'Lightning Round', domain: '処理速度', tagline: 'どれだけ速く単語を見つけられる?', blurb: '60秒間。1つのグリッド。できるだけ多くの有効な単語を見つけます。Lightning Roundは処理速度 — 脳が語彙パターンを取得し検証する速度 — を測定します。', research: '処理速度は他のほとんどの認知機能より早く加齢で低下し、全体的な認知パフォーマンスの最も強力な予測因子の一つです。速度のある単語検索課題は、言語流暢性検査などで臨床的に使用されます。' },
    { name: 'Memory Hunt', domain: 'ワーキングメモリ', tagline: '頭に保持し、後で思い出す', blurb: '文字位置の連続が点滅。グリッドが消える。記憶から単語を思い出して構築。Memory Huntはワーキングメモリ — 課題関連情報を操作中に保持する実行系 — を直接トレーニングします。', research: 'ワーキングメモリトレーニングは文献中最も研究されている認知介入です。NIH掲載の研究 (PMC5930973) は信頼できる領域特異的利得を見出しています。' },
    { name: 'Combo Master', domain: '持続的注意', tagline: '長く途切れないチェーンを構築', blurb: '連続を途切れさせずに有効な単語のチェーンを構築。Combo Masterは持続的注意 — 多くの連続応答にわたって途切れなく集中を維持する能力 — を鍛えます。', research: '持続的注意 (覚醒) は連続パフォーマンステストで操作化されます。学業成績と相関し、ADHDの臨床マーカーです。' },
    { name: 'Pattern Switcher', domain: '認知的柔軟性', tagline: 'タスク中にルールを切り替え', blurb: '単語を見つける。それからルールが変わる。また変わる。Pattern Switcherは認知的柔軟性 — ルールが変わったときに精神的セットを切り替える実行機能 — を鍛えます。', research: '認知的柔軟性はアデル・ダイアモンドの3つの中核実行機能の一つ (ワーキングメモリと抑制と並んで)。学業と人生の結果を予測し、トレーニングで大きく改善します。' },
    { name: 'Rare Gems', domain: '語彙の深さ', tagline: '珍しく価値の高い単語を見つける', blurb: 'よくある単語は得点が低い。珍しい単語は得点が高い。Rare Gemsは語彙の深さ — 意味記憶内の低頻度語へのアクセス — を鍛えます。', research: '語彙は生涯で最も安定した認知測定値です。デューク大学のクロスワード研究 (2022) は、単語ベースのパズルが商用脳アプリよりも記憶低下を効果的に遅らせることを示しました。' },
  ],

  comparisonHeading: '有料の脳トレアプリと比較',
  comparisonHeaders: ['機能', 'LexiClash', 'Lumosity', 'Elevate', 'Peak'],
  comparisonRows: [
    ['価格', '無料、有料の壁なし', '$11.99/月 Premium', '$49.99/年 Pro', '$49.99/年 Pro'],
    ['無料ゲーム', '5ドリル、すべて開放', '1日3つローテーション', '1日3つローテーション', '1日4つローテーション'],
    ['登録必要', 'いいえ (任意)', 'はい', 'はい', 'はい'],
    ['単語特化', '100% 単語ベース', '混合 (数学/論理)', '単語が多い', '混合'],
    ['追跡領域数', '5 (レーダーチャート)', '5領域', '5カテゴリ', '6カテゴリ'],
    ['言語', '5 (RTLヘブライ語含む)', '主に英語', '英語/ES/PT', '主に英語'],
    ['ブラウザでプレイ', 'はい、ダウンロード不要', 'ウェブ+アプリ', 'アプリのみ', 'アプリのみ'],
    ['研究引用の表示', 'はい、アプリ内', 'マーケティングページ', 'マーケティングページ', 'マーケティングページ'],
  ],
  comparisonFooter: 'FTCは2016年にLumosityに対し未確認の転移主張で200万ドルの罰金を科しました。私たちはIQ向上を約束しません。ドリル自体および隣接する単語スキルにおける領域特異的な改善 — 科学が実際に支持するもの — を約束します。',

  howHeading: '使い方',
  steps: [
    { step: '1', title: 'ドリルを選ぶ', sub: '5つの領域。レーダーチャートが最も弱いと示すもの、または面白そうなものを選択。' },
    { step: '2', title: '60秒プレイ', sub: '短く集中したラウンド。単語を見つけ、コンボを構築し、レアな宝石を狩る。中断なし。' },
    { step: '3', title: 'スコア更新', sub: '領域スコア (0-100) + 総合脳スコア + ティアバッジ。無料プロフィール作成で全て保存。' },
    { step: '4', title: '毎日トレーニング', sub: '1日3ドリル = 5分未満。連続記録で難しいレベル (各ドリル1-5) が解放。すべて無料。' },
  ],

  faqHeading: 'よくある質問',
  faqs: [
    { q: '脳トレ単語ゲームは本当に研究に裏付けられていますか?', a: 'はい — 単語ベースの認知ドリルについては、証拠は意義深いものです。デューク医学校の研究 (2022) は、クロスワード形式のゲームが商用脳トレアプリよりも高齢者の記憶低下を遅らせることを示しました。NIH掲載の研究 (PMC5930973) は、ドリルが正しい領域を対象とすればワーキングメモリトレーニングは転移可能な利得を生むことを見出しています。' },
    { q: '脳トレセッションはどのくらいの長さが必要ですか?', a: 'LexiClashの各ドリルは60秒です。研究は、短い毎日のセッション (合計5-15分) がスキル維持のためにマラソントレーニングを上回ることを示唆しています。1日3ドリル = 5分未満で、週を通してすべての領域に当たります。' },
    { q: 'LexiClashはLumosity、Elevate、Peakの無料代替ですか?', a: 'はい。Lumosity Premiumは月額約12ドル、Elevate Proは年間約50ドル、Peak Proは年間50ドル超です。LexiClash脳ドリルは有料の壁、登録の壁、時間制限なしで無料です。' },
    { q: '5つの脳ドリルが対象とする認知領域は何ですか?', a: 'Lightning Roundは処理速度を鍛えます。Memory Huntはワーキングメモリ。Combo Masterは持続的注意。Pattern Switcherは認知的柔軟性 (Stroop課題に類似)。Rare Gemsは語彙の深さ。各ドリルは脳スコアレーダーチャートの領域に1:1でマッピングされます。' },
    { q: 'LexiClashはどのように脳の進捗を測定しますか?', a: '各ドリル後、領域スコア (0-100) はローリング平均で更新されます — そのため悪い日が一日あっても統計が崩れません。総合脳スコアは5領域を重み付けし、Novice から Master までの6ティアの一つに配置します。履歴チャートは毎日の進捗を示します。' },
    { q: '子供や高齢者向けの脳トレはありますか?', a: 'LexiClashドリルは12歳以上で、語彙はプレイヤーのスキルに合わせてスケールされます。高齢者にはデュークのクロスワード研究が最も近い証拠です — 短い言語ベースのドリルは、他の機能より早く低下する言語流暢性と語彙検索に特に価値があります。' },
    { q: '脳ゲームは実世界の思考に転移しますか?', a: '正直な答え: 転移は控えめで、魔法ではありません。2014年のスタンフォードの合意レターは過度の主張に警告し、2016年にFTCはLumosityに200万ドルの罰金を科しました。擁護できるもの: 領域特異的な利得 (単語検索速度、語彙想起、テキスト課題の持続的注意) は類似の課題に転移します。' },
    { q: '脳トレの進捗を時間とともに追跡できますか?', a: 'はい。脳ハブには総合脳スコア、5領域レーダーチャート、毎日/毎週/毎月の履歴、ドリル別レベル進行 (各ドリル5レベル)、ティアバッジが表示されます。デバイス間で連続記録を保持するには無料プロフィールを作成してください。' },
    { q: '脳ドリルはどの言語をサポートしますか?', a: '英語、ヘブライ語、スウェーデン語、日本語、スペイン語。各言語に独自の辞書とレア単語頻度データがあります。ヘブライ語のRTLは完全にサポートされます。すべての認知スコアは言語独立です — 脳スコアは言語間で持ち運び可能です。' },
  ],

  relatedHeading: '関連',
  relatedHubTitle: '脳トレハブ',
  relatedHubSub: '5領域レーダーチャート、履歴、すべてのドリル',
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
  finalCtaBody: 'ドリルを選ぶ。1分かける。レーダーチャートで脳スコアが更新されるのを見る。明日も繰り返す。それが全てのピッチです — そして科学は短く、毎日の、領域特異的なドリルがまさに効果的だと言っています。',
  finalCtaPrimary: '脳ハブを開く',
  finalCtaSecondary: 'クイックスタート: Lightning Round',

  videoGameName: 'LexiClash 脳ドリル',
  videoGameDescription: '無料の脳トレ単語ゲーム — 処理速度、ワーキングメモリ、注意、認知的柔軟性、語彙を鍛える研究ベースの5つの認知ドリル (各60秒)。ブラウザベース、ダウンロード不要、登録不要、5言語。',
  itemListName: '5つの脳トレドリル',
  itemListDescription: '5つの60秒の認知ドリル、それぞれが実行機能と言語認知の異なる領域を対象としています。',
  itemListDescriptions: [
    '60秒でできるだけ多くの単語を見つける。処理速度を対象 — 脳が語彙パターンを取得し検証する速度。',
    '文字位置の連続を記憶し、それから単語を思い出す。ワーキングメモリを対象 — 能動的操作のために情報を保持するシステム。',
    '長く途切れない単語チェーンを構築。持続的注意を対象 — 途切れなく連続応答にわたる集中。',
    'ドリル中に単語検索ルールを切り替える。認知的柔軟性を対象 — Stroopとタスクスイッチングのパラダイムで研究される実行機能。',
    '珍しく価値の高い単語を見つける。語彙の深さを対象 — 意味記憶からの低頻度語の語彙検索。',
  ],
  howToName: '60秒で無料の脳トレを始める方法',
  howToDescription: 'LexiClashドリルで毎日の脳ワークアウトを始める — 5領域、各60秒、登録不要。',
  howToSteps: [
    { name: '脳ハブを開く', text: 'lexiclash.live/ja/brain にアクセス。最初のドリルに登録は不要。' },
    { name: 'トレーニングする領域を選ぶ', text: '5つの領域から選択: 処理速度、ワーキングメモリ、注意、認知的柔軟性、または語彙。各ドリルは60秒。' },
    { name: 'ドリルをプレイ', text: '1分間グリッド上で単語を見つける。スコア、コンボ、レア単語ボーナスが脳スコアにカウント。' },
    { name: '進捗を追跡', text: '脳スコア、5領域レーダーチャート、ティア (Novice → Master) を表示。デバイス間で進捗を保存するには無料アカウントを作成。' },
    { name: '毎日トレーニング', text: '1日3ドリルは5分未満で、週を通してすべての5領域を鍛えます。連続記録で難しいレベルが解放。' },
  ],
};

const es: BrainLandingCopy = {
  metaTitle: 'Juegos de entrenamiento cerebral gratis — 5 ejercicios, 5 dominios cognitivos',
  metaDescription: 'Juegos de entrenamiento cerebral gratis online — 5 ejercicios respaldados por investigación (60 seg cada uno) que entrenan velocidad de procesamiento, memoria de trabajo, atención, flexibilidad y vocabulario. Sin descarga, sin registro, 5 idiomas.',
  metaKeywords: 'juegos de entrenamiento cerebral gratis, juegos cerebrales gratis adultos, juegos de palabras cerebro, ejercicios mentales online, entrenamiento cognitivo gratis, juegos de memoria, ejercicios de concentración, alternativa lumosity gratis, alternativa elevate, gimnasio mental, juegos para el cerebro',
  ogTitle: 'Juegos de entrenamiento cerebral gratis — 5 ejercicios, 5 dominios cognitivos',
  ogDescription: '5 ejercicios cerebrales respaldados por investigación, 60 segundos cada uno. Gratis, sin descarga, 5 idiomas. Una alternativa gratis a Lumosity, Elevate y Peak.',
  twitterTitle: 'Entrenamiento cerebral gratis — 60 seg, 5 dominios',
  twitterDescription: '5 ejercicios cognitivos respaldados por investigación. Gratis en el navegador.',

  marqueeBadges: ['5 EJERCICIOS · 5 DOMINIOS', '60 SEGUNDOS CADA UNO', 'RESPALDADO POR CIENCIA', 'GRATIS PARA SIEMPRE', 'SIN DESCARGA', 'EN EL NAVEGADOR'],
  badge: '★ Gimnasio cerebral gratis ★',
  h1Pre: 'Entrenamiento cerebral gratis,',
  h1Highlight: '5 ejercicios, 60 segundos cada uno.',
  introP1: 'Cinco ejercicios cognitivos basados en palabras. Cada uno toma un minuto. Juntos entrenan los cinco dominios que los neurocientíficos realmente estudian — velocidad de procesamiento, memoria de trabajo, atención, flexibilidad y vocabulario.',
  introP2: 'Sin muro de registro. Sin muro de pago. Sin prueba de 7 días que se renueva automáticamente. Solo abre el centro cerebral y comienza a entrenar. Seguimos tu progreso en un gráfico de radar de 5 dominios para que veas qué músculo mental es el más débil — y cuál se está fortaleciendo.',
  ctaPrimary: 'Empieza gratis',
  ctaSecondary: 'Prueba Lightning Round (60 seg)',

  drillsHeading: 'Los 5 ejercicios, los 5 dominios',
  drillsSub: 'Cada ejercicio se mapea a un dominio cognitivo estudiado por investigadores como Adele Diamond (función ejecutiva) y la Escuela de Medicina de Duke (entrenamiento de memoria basado en palabras).',
  researchLabel: '★ Base de investigación',
  drills: [
    { name: 'Lightning Round', domain: 'Velocidad de procesamiento', tagline: '¿Qué tan rápido encuentras palabras?', blurb: 'Sesenta segundos. Una cuadrícula. Encuentra tantas palabras válidas como sea posible. Lightning Round mide la velocidad de procesamiento — la rapidez con que tu cerebro recupera y valida patrones léxicos.', research: 'La velocidad de procesamiento disminuye con la edad antes que la mayoría de otras funciones cognitivas y es uno de los predictores más fuertes del rendimiento cognitivo general. Las tareas de recuperación rápida de palabras se usan clínicamente en pruebas de fluidez verbal.' },
    { name: 'Memory Hunt', domain: 'Memoria de trabajo', tagline: 'Mantenlo en la cabeza, luego recuérdalo', blurb: 'Una secuencia de posiciones de letras parpadea. La cuadrícula se borra. Recuerdas y formas palabras de memoria. Memory Hunt entrena directamente la memoria de trabajo — el sistema ejecutivo que mantiene información relevante mientras la manipulas.', research: 'El entrenamiento de memoria de trabajo es la intervención cognitiva más estudiada en la literatura. La investigación indexada en NIH (PMC5930973) encuentra ganancias específicas del dominio confiables.' },
    { name: 'Combo Master', domain: 'Atención sostenida', tagline: 'Construye cadenas largas e ininterrumpidas', blurb: 'Construye cadenas de palabras válidas sin romper la racha. Combo Master apunta a la atención sostenida — la capacidad de mantener el enfoque a través de muchas respuestas consecutivas sin lapsus.', research: 'La atención sostenida (vigilancia) se operacionaliza en la Prueba de Rendimiento Continuo. Se correlaciona con el rendimiento académico y es un marcador clínico para el TDAH.' },
    { name: 'Pattern Switcher', domain: 'Flexibilidad cognitiva', tagline: 'Cambia las reglas a mitad de tarea', blurb: 'Encuentra palabras. Luego la regla cambia. Luego cambia otra vez. Pattern Switcher apunta a la flexibilidad cognitiva — la función ejecutiva que te permite cambiar conjuntos mentales cuando las reglas cambian.', research: 'La flexibilidad cognitiva es una de las tres funciones ejecutivas centrales de Adele Diamond (junto con memoria de trabajo e inhibición). Predice resultados académicos y de vida y muestra ganancias sustanciales por entrenamiento.' },
    { name: 'Rare Gems', domain: 'Profundidad de vocabulario', tagline: 'Encuentra palabras raras y valiosas', blurb: 'Las palabras comunes valen poco. Las raras valen mucho. Rare Gems apunta a la profundidad del vocabulario — tu acceso a palabras de baja frecuencia en la memoria semántica.', research: 'El vocabulario es la medida cognitiva más estable a lo largo de la vida. El estudio de crucigramas de Duke (2022) mostró que los rompecabezas basados en palabras retrasaron el deterioro de la memoria más eficazmente que las aplicaciones cerebrales comerciales.' },
  ],

  comparisonHeading: 'vs. las apps de entrenamiento cerebral de pago',
  comparisonHeaders: ['Característica', 'LexiClash', 'Lumosity', 'Elevate', 'Peak'],
  comparisonRows: [
    ['Precio', 'Gratis, sin muro de pago', '$11.99/mes Premium', '$49.99/año Pro', '$49.99/año Pro'],
    ['Juegos gratis', '5 ejercicios, todos abiertos', '3/día rotación', '3/día rotación', '4/día rotación'],
    ['Registro requerido', 'No (opcional)', 'Sí', 'Sí', 'Sí'],
    ['Enfoque en palabras', '100% basado en palabras', 'Mixto (mate/lógica)', 'Mucho de palabras', 'Mixto'],
    ['Dominios rastreados', '5 (gráfico radar)', '5 áreas', '5 categorías', '6 categorías'],
    ['Idiomas', '5 (incl. hebreo RTL)', 'Inglés principalmente', 'Inglés/ES/PT', 'Inglés principalmente'],
    ['Juego en navegador', 'Sí, sin descarga', 'Web + app', 'Solo app', 'Solo app'],
    ['Citas de investigación visibles', 'Sí, en la app', 'Páginas de marketing', 'Páginas de marketing', 'Páginas de marketing'],
  ],
  comparisonFooter: 'La FTC multó a Lumosity con $2M en 2016 por afirmaciones de transferencia no respaldadas. No prometemos ganancias de IQ. Prometemos mejora específica de dominio en los ejercicios mismos y en habilidades de palabras adyacentes — que es lo que la ciencia realmente respalda.',

  howHeading: 'Cómo funciona',
  steps: [
    { step: '1', title: 'Elige un ejercicio', sub: 'Cinco dominios. Elige el que tu gráfico de radar dice que es más débil, o simplemente el que suene divertido.' },
    { step: '2', title: 'Juega 60 segundos', sub: 'Una ronda corta y enfocada. Encuentra palabras, construye combos, caza gemas raras. Sin interrupciones.' },
    { step: '3', title: 'Puntaje actualizado', sub: 'Puntaje de dominio (0-100) + puntaje cerebral total + insignia de nivel. Todo guardado si creas un perfil gratis.' },
    { step: '4', title: 'Entrena diariamente', sub: 'Tres ejercicios/día = menos de 5 min. Las rachas desbloquean niveles más difíciles (1-5 por ejercicio). Todo gratis.' },
  ],

  faqHeading: 'Preguntas frecuentes',
  faqs: [
    { q: '¿Los juegos de entrenamiento cerebral con palabras están realmente respaldados por investigación?', a: 'Sí — para los ejercicios cognitivos basados en palabras, la evidencia es significativa. Un estudio de la Escuela de Medicina de Duke (2022) mostró que los juegos tipo crucigrama retrasaron la pérdida de memoria en adultos mayores más que las apps comerciales de entrenamiento cerebral. La investigación publicada por NIH (PMC5930973) encuentra que el entrenamiento de memoria de trabajo puede producir ganancias transferibles cuando los ejercicios apuntan al dominio correcto.' },
    { q: '¿Cuánto tiempo necesita una sesión de entrenamiento cerebral?', a: 'Cada ejercicio de LexiClash es de 60 segundos. La investigación sugiere que las sesiones cortas diarias (5-15 minutos en total) superan al entrenamiento maratón para la retención de habilidades. Tres ejercicios por día = menos de 5 minutos, cubre todos los dominios durante la semana.' },
    { q: '¿Es LexiClash una alternativa gratis a Lumosity, Elevate o Peak?', a: 'Sí. Lumosity Premium cuesta aproximadamente $12/mes, Elevate Pro alrededor de $50/año, Peak Pro $50+/año. Los ejercicios cerebrales de LexiClash son gratuitos sin muro de pago, sin muro de registro y sin límite de tiempo.' },
    { q: '¿Qué dominios cognitivos abordan los 5 ejercicios cerebrales?', a: 'Lightning Round entrena la velocidad de procesamiento. Memory Hunt entrena la memoria de trabajo. Combo Master entrena la atención sostenida. Pattern Switcher entrena la flexibilidad cognitiva (similar a las tareas Stroop). Rare Gems entrena la profundidad del vocabulario. Cada ejercicio se mapea 1:1 a un dominio en el gráfico radar del puntaje cerebral.' },
    { q: '¿Cómo mide LexiClash el progreso cerebral?', a: 'Después de cada ejercicio, tu puntaje de dominio (0-100) se actualiza usando un promedio móvil — así un mal día no destroza tus estadísticas. Tu puntaje cerebral general te coloca en uno de 6 niveles desde Novicio hasta Maestro. Un gráfico de historial muestra el progreso diario.' },
    { q: '¿Hay juegos de entrenamiento cerebral para niños o personas mayores?', a: 'Los ejercicios de LexiClash funcionan para edades 12+, con vocabulario escalado al nivel del jugador. Para personas mayores, la investigación de crucigramas de Duke es la evidencia más cercana — los ejercicios cortos basados en lenguaje son especialmente valiosos para la fluidez verbal y la recuperación léxica, que disminuyen antes que otras funciones.' },
    { q: '¿Los juegos cerebrales realmente se transfieren al pensamiento del mundo real?', a: 'Respuesta honesta: la transferencia es modesta, no mágica. La carta de consenso de Stanford de 2014 advirtió contra exageraciones, y en 2016 la FTC multó a Lumosity con $2M. Lo defendible: las ganancias específicas del dominio (velocidad de búsqueda de palabras, recuerdo de vocabulario, atención sostenida en tareas de texto) sí se transfieren a tareas similares.' },
    { q: '¿Puedo seguir mi progreso de entrenamiento cerebral con el tiempo?', a: 'Sí. El centro cerebral muestra tu puntaje cerebral general, gráfico radar de 5 dominios, historial diario/semanal/mensual, progresión de nivel específica del ejercicio (5 niveles por ejercicio) y una insignia de nivel. Crea un perfil gratis para mantener rachas entre dispositivos.' },
    { q: '¿Qué idiomas admiten los ejercicios cerebrales?', a: 'Inglés, hebreo, sueco, japonés y español. Cada idioma tiene su propio diccionario y datos de frecuencia de palabras raras. RTL es totalmente compatible con hebreo. Toda la puntuación cognitiva es independiente del idioma — tu puntaje cerebral es portable entre idiomas.' },
  ],

  relatedHeading: 'Relacionado',
  relatedHubTitle: 'Centro de entrenamiento cerebral',
  relatedHubSub: 'Gráfico radar de 5 dominios, historial, todos los ejercicios',
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
  finalCtaBody: 'Elige un ejercicio. Pasa un minuto. Mira cómo tu puntaje cerebral se actualiza en el gráfico radar. Repite mañana. Esa es toda la propuesta — y la ciencia dice que los ejercicios cortos, diarios y específicos del dominio son exactamente lo que funciona.',
  finalCtaPrimary: 'Abrir centro cerebral',
  finalCtaSecondary: 'Inicio rápido: Lightning Round',

  videoGameName: 'Ejercicios cerebrales LexiClash',
  videoGameDescription: 'Juegos de entrenamiento cerebral con palabras gratis — 5 ejercicios cognitivos respaldados por investigación (60 segundos cada uno) que abordan velocidad de procesamiento, memoria de trabajo, atención, flexibilidad cognitiva y vocabulario. Basado en navegador, sin descarga, sin registro, 5 idiomas.',
  itemListName: '5 ejercicios de entrenamiento cerebral',
  itemListDescription: 'Cinco ejercicios cognitivos de 60 segundos, cada uno apuntando a un dominio distinto de función ejecutiva y cognición lingüística.',
  itemListDescriptions: [
    'Encuentra tantas palabras como sea posible en 60 segundos. Apunta a la velocidad de procesamiento — qué tan rápido el cerebro recupera y valida patrones léxicos.',
    'Memoriza una secuencia de posiciones de letras, luego recuerda palabras de ellas. Apunta a la memoria de trabajo — el sistema que mantiene información para manipulación activa.',
    'Construye cadenas largas e ininterrumpidas de palabras. Apunta a la atención sostenida — enfoque a través de respuestas consecutivas sin lapsus.',
    'Cambia entre reglas de búsqueda de palabras a mitad del ejercicio. Apunta a la flexibilidad cognitiva — la función ejecutiva estudiada vía Stroop y paradigmas de cambio de tarea.',
    'Encuentra palabras poco comunes y de alto valor. Apunta a la profundidad del vocabulario — recuperación léxica de palabras de baja frecuencia desde la memoria semántica.',
  ],
  howToName: 'Cómo empezar entrenamiento cerebral gratis en 60 segundos',
  howToDescription: 'Comienza un entrenamiento cerebral diario con ejercicios de LexiClash — cinco dominios, 60 segundos cada uno, sin registro requerido.',
  howToSteps: [
    { name: 'Abre el centro cerebral', text: 'Visita lexiclash.live/es/brain. No se requiere registro para tus primeros ejercicios.' },
    { name: 'Elige un dominio para entrenar', text: 'Elige entre 5 dominios: velocidad de procesamiento, memoria de trabajo, atención, flexibilidad cognitiva o vocabulario. Cada ejercicio toma 60 segundos.' },
    { name: 'Juega el ejercicio', text: 'Encuentra palabras en una cuadrícula durante un minuto. El puntaje, los combos y los bonos de palabras raras cuentan para tu puntaje cerebral.' },
    { name: 'Sigue tu progreso', text: 'Ve tu puntaje cerebral, gráfico radar de 5 dominios y nivel (Novicio → Maestro). Crea una cuenta gratis para guardar el progreso entre dispositivos.' },
    { name: 'Entrena diariamente', text: 'Tres ejercicios al día toman menos de 5 minutos y ejercitan los 5 dominios durante una semana. Las rachas desbloquean niveles más difíciles.' },
  ],
};

const ru: BrainLandingCopy = {
  metaTitle: 'Бесплатные игры для тренировки мозга — 5 упражнений, 5 когнитивных областей',
  metaDescription: 'Бесплатные игры для тренировки мозга онлайн — 5 научно обоснованных упражнений (по 60 сек каждое) для развития скорости обработки, рабочей памяти, внимания, когнитивной гибкости и словарного запаса. Без скачивания, без регистрации, 5 языков.',
  metaKeywords: 'игры для тренировки мозга, бесплатные головоломки, развивающие игры, когнитивные упражнения, тренировка памяти, упражнения на концентрацию, головоломки со словами, альтернатива lumosity, тренировка мышления, игры для мозга, словесные игры',
  ogTitle: 'Бесплатные игры для тренировки мозга — 5 упражнений, 5 когнитивных областей',
  ogDescription: '5 научно обоснованных упражнений для мозга, по 60 секунд каждое. Бесплатно, без скачивания, 5 языков. Альтернатива Lumosity, Elevate и Peak.',
  twitterTitle: 'Тренировка мозга — 60 сек, 5 областей',
  twitterDescription: '5 научно обоснованных когнитивных упражнений. Бесплатно в браузере.',

  marqueeBadges: ['5 УПРАЖНЕНИЙ · 5 ОБЛАСТЕЙ', 'ПО 60 СЕКУНД', 'НАУЧНЫЙ ПОДХОД', 'ВСЕГДА БЕСПЛАТНО', 'БЕЗ СКАЧИВАНИЯ', 'В БРАУЗЕРЕ'],
  badge: '★ Бесплатный фитнес для мозга ★',
  h1Pre: 'Тренировка мозга,',
  h1Highlight: '5 упражнений, по 60 секунд.',
  introP1: 'Пять упражнений на развитие когнитивных навыков, основанных на словах. Каждое длится одну минуту. Вместе они тренируют пять областей, которые изучают нейробиологи — скорость обработки, рабочая память, внимание, когнитивная гибкость и словарный запас.',
  introP2: 'Без стены регистрации. Без платного доступа. Без 7-дневного пробного периода, который продлевается автоматически. Просто откройте центр мозга и начинайте. Мы отслеживаем ваш прогресс на диаграмме из 5 областей, чтобы вы видели, какой «мозговой мускул» самый слабый — и какой становится сильнее.',
  ctaPrimary: 'Начать тренировку бесплатно',
  ctaSecondary: 'Попробовать Lightning Round (60 сек)',

  drillsHeading: '5 упражнений, 5 областей',
  drillsSub: 'Каждое упражнение соответствует одной когнитивной области, которую изучают учёные, такие как Адель Даймонд (исполнительные функции) и Медицинская школа Дьюка (тренировка памяти со словами).',
  researchLabel: '★ Научная база',
  drills: [
    { name: 'Lightning Round', domain: 'Скорость обработки', tagline: 'Как быстро ты найдешь слова?', blurb: 'Шестьдесят секунд. Одна сетка. Найди как можно больше правильных слов. Lightning Round измеряет скорость обработки — как быстро твой мозг извлекает и проверяет лексические паттерны.', research: 'Скорость обработки снижается с возрастом быстрее большинства других когнитивных функций и является одним из сильнейших предикторов общего когнитивного уровня. Тесты скорости извлечения слов используются клинически в оценке вербальной беглости.' },
    { name: 'Memory Hunt', domain: 'Рабочая память', tagline: 'Запомни, потом вспомни', blurb: 'Последовательность позиций букв мигает. Сетка исчезает. Ты вспоминаешь и составляешь слова по памяти. Memory Hunt прямо тренирует рабочую память — исполнительную систему, которая удерживает нужную информацию во время её обработки.', research: 'Тренировка рабочей памяти — самое изученное когнитивное вмешательство в научной литературе. Исследования, опубликованные в NIH (PMC5930973), показывают надёжные улучшения, специфичные для области.' },
    { name: 'Combo Master', domain: 'Устойчивое внимание', tagline: 'Строй длинные непрерывные цепочки', blurb: 'Строй цепочки правильных слов без разрывов. Combo Master тренирует устойчивое внимание — способность сохранять концентрацию на множество последовательных действий без перерывов.', research: 'Устойчивое внимание (бдительность) измеряется тестом непрерывного выполнения. Оно коррелирует с академическими достижениями и является клинических маркером СДВГ.' },
    { name: 'Pattern Switcher', domain: 'Когнитивная гибкость', tagline: 'Меняй правила во время игры', blurb: 'Найди слова. Потом правила меняются. Потом меняются снова. Pattern Switcher тренирует когнитивную гибкость — исполнительную функцию, которая позволяет менять мыслительные стратегии, когда меняются условия.', research: 'Когнитивная гибкость — одна из трёх ключевых исполнительных функций Адель Даймонд (вместе с рабочей памятью и торможением). Она предсказывает академические и жизненные успехи и показывает значительные улучшения при тренировке.' },
    { name: 'Rare Gems', domain: 'Глубина словарного запаса', tagline: 'Найди редкие, ценные слова', blurb: 'Обычные слова дают мало баллов. Редкие слова дают много. Rare Gems тренирует глубину словарного запаса — твой доступ к редким словам в семантической памяти.', research: 'Словарный запас — самое устойчивое когнитивное измерение на протяжении жизни. Исследование кроссвордов в Дьюке (2022) показало, что словесные головоломки замедляют потерю памяти у пожилых людей эффективнее, чем коммерческие приложения для тренировки мозга.' },
  ],

  comparisonHeading: 'vs. платные приложения для тренировки мозга',
  comparisonHeaders: ['Функция', 'LexiClash', 'Lumosity', 'Elevate', 'Peak'],
  comparisonRows: [
    ['Цена', 'Бесплатно, без платного доступа', '$11.99/мес Premium', '$49.99/год Pro', '$49.99/год Pro'],
    ['Бесплатные игры', '5 упражнений, все доступны', '3/день по ротации', '3/день по ротации', '4/день по ротации'],
    ['Требуется регистрация', 'Нет (опционально)', 'Да', 'Да', 'Да'],
    ['Фокус на словах', '100% игры со словами', 'Смешанные (математика/логика)', 'В основном слова', 'Смешанные'],
    ['Отслеживаемые области', '5 (радарная диаграмма)', '5 областей', '5 категорий', '6 категорий'],
    ['Языки', '5 (включая иврит RTL)', 'В основном английский', 'Английский/ИС/ПТ', 'В основном английский'],
    ['Игра в браузере', 'Да, без скачивания', 'Веб + приложение', 'Только приложение', 'Только приложение'],
    ['Ссылки на научные исследования видны', 'Да, в приложении', 'На страницах маркетинга', 'На страницах маркетинга', 'На страницах маркетинга'],
  ],
  comparisonFooter: 'В 2016 году FTC оштрафовала Lumosity на $2 млн за необоснованные заявления о переносе умений. Мы не обещаем увеличение IQ. Мы обещаем специфичные для области улучшения в самих упражнениях и в смежных словесных навыках — что действительно поддерживает наука.',

  howHeading: 'Как это работает',
  steps: [
    { step: '1', title: 'Выбери упражнение', sub: 'Пять областей. Выбери ту, что твоя диаграмма показывает как самую слабую, или ту, что кажется интереснее.' },
    { step: '2', title: 'Играй 60 секунд', sub: 'Короткий сосредоточенный раунд. Находи слова, строй комбо, охотьсь на редкие самоцветы. Без перерывов.' },
    { step: '3', title: 'Баллы обновляются', sub: 'Баллы области (0-100) + общий балл мозга + значок уровня. Всё сохраняется, если создашь бесплатный профиль.' },
    { step: '4', title: 'Тренируйся ежедневно', sub: 'Три упражнения/день = менее 5 минут. Серии открывают более сложные уровни (1-5 за упражнение). Всё бесплатно.' },
  ],

  faqHeading: 'Часто задаваемые вопросы',
  faqs: [
    { q: 'Игры для тренировки мозга со словами действительно научно обоснованы?', a: 'Да — для упражнений, основанных на словах, доказательства убедительны. Исследование Медицинской школы Дьюка (2022) показало, что игры в кроссворды замедляют потерю памяти у пожилых людей эффективнее коммерческих приложений. Исследования, опубликованные в NIH (PMC5930973), находят, что тренировка рабочей памяти может дать переносимые результаты, если упражнения нацелены правильно.' },
    { q: 'Сколько времени нужна сессия тренировки мозга?', a: 'Каждое упражнение LexiClash — 60 секунд. Исследования показывают, что короткие ежедневные сессии (всего 5-15 минут) превосходят интенсивную тренировку для удержания навыков. Три упражнения/день = менее 5 минут, охватывает все области за неделю.' },
    { q: 'LexiClash — это бесплатная альтернатива Lumosity, Elevate или Peak?', a: 'Да. Lumosity Premium стоит примерно $12/месяц, Elevate Pro примерно $50/год, Peak Pro $50+/год. Упражнения LexiClash полностью бесплатны без платного доступа и без ограничений по времени.' },
    { q: 'Какие когнитивные области тренируют 5 упражнений для мозга?', a: 'Lightning Round тренирует скорость обработки. Memory Hunt тренирует рабочую память. Combo Master тренирует устойчивое внимание. Pattern Switcher тренирует когнитивную гибкость (похоже на тесты Струпа). Rare Gems тренирует глубину словарного запаса. Каждое упражнение соответствует 1:1 области на диаграмме баллов мозга.' },
    { q: 'Как LexiClash измеряет прогресс мозга?', a: 'После каждого упражнения баллы области (0-100) обновляются с использованием скользящего среднего — так один плохой день не сломает твою статистику. Общий балл мозга помещает тебя в один из 6 уровней от Новичка до Мастера. График истории показывает ежедневный прогресс; диаграмма показывает слабые области.' },
    { q: 'Есть ли игры для тренировки мозга для детей или пожилых людей?', a: 'Упражнения LexiClash подходят для 12+ лет со словарным запасом, адаптированным к уровню игрока. Для пожилых людей исследование кроссвордов Дьюка — ближайшее доказательство — короткие упражнения на основе языка особенно ценны для вербальной беглости и извлечения слов, которые снижаются раньше других функций.' },
    { q: 'Игры для мозга действительно помогают в реальном мышлении?', a: 'Честный ответ: перенос умений скромен, не волшебен. Письмо консенсуса Стэнфорда 2014 года предупреждало против чрезмерных заявлений, и в 2016 году FTC оштрафовала Lumosity на $2 млн. Что можно защитить: специфичные для области улучшения (скорость поиска слов, вспоминание словарного запаса, устойчивое внимание на текстовых задачах) переносятся на похожие задачи.' },
    { q: 'Я могу отслеживать мой прогресс тренировки мозга со временем?', a: 'Да. Центр мозга показывает общий балл мозга, радарную диаграмму 5 областей, ежедневную/еженедельную/ежемесячную историю, специфичную прогрессию уровня упражнения (5 уровней за упражнение) и значок уровня. Создай бесплатный профиль, чтобы сохранить серии на разных устройствах.' },
    { q: 'Какие языки поддерживают упражнения для мозга?', a: 'Английский, иврит, шведский, японский и испанский. Каждый язык имеет свой словарь и данные частоты редких слов. RTL полностью поддерживается для иврита. Все когнитивные баллы независимы от языка — твой балл мозга портативен между языками.' },
  ],

  relatedHeading: 'Связанное',
  relatedHubTitle: 'Центр тренировки мозга',
  relatedHubSub: 'Радарная диаграмма 5 областей, история, все упражнения',
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
  finalCtaBody: 'Выбери упражнение. Трать одну минуту. Смотри, как твой балл мозга обновляется на диаграмме. Повтори завтра. Вот вся идея — и наука говорит, что короткие, ежедневные, специфичные для области упражнения — это именно то, что работает.',
  finalCtaPrimary: 'Открыть центр мозга',
  finalCtaSecondary: 'Быстрый старт: Lightning Round',

  videoGameName: 'Упражнения для мозга LexiClash',
  videoGameDescription: 'Бесплатные игры для тренировки мозга со словами — 5 научно обоснованных когнитивных упражнений (по 60 секунд каждое) для развития скорости обработки, рабочей памяти, внимания, когнитивной гибкости и словарного запаса. В браузере, без скачивания, без регистрации, 5 языков.',
  itemListName: '5 упражнений для тренировки мозга',
  itemListDescription: 'Пять 60-секундных когнитивных упражнений, каждое нацелено на отдельную область исполнительной функции и языковой когниции.',
  itemListDescriptions: [
    'Найди как можно больше слов за 60 секунд. Нацелено на скорость обработки — как быстро мозг извлекает и проверяет лексические паттерны.',
    'Запомни последовательность позиций букв, потом вспомни слова. Нацелено на рабочую память — систему, которая удерживает информацию для активной обработки.',
    'Строй длинные непрерывные цепочки слов. Нацелено на устойчивое внимание — концентрация на множество последовательных действий без перерывов.',
    'Меняй правила поиска слов во время упражнения. Нацелено на когнитивную гибкость — исполнительную функцию, изучаемую через тесты Струпа и смену задач.',
    'Найди редкие и ценные слова. Нацелено на глубину словарного запаса — извлечение редких слов из семантической памяти.',
  ],
  howToName: 'Как начать бесплатную тренировку мозга за 60 секунд',
  howToDescription: 'Начни ежедневную тренировку мозга с упражнениями LexiClash — пять областей, по 60 секунд каждое, без регистрации.',
  howToSteps: [
    { name: 'Открой центр мозга', text: 'Перейди на lexiclash.live/ru/brain. Регистрация не требуется для первых упражнений.' },
    { name: 'Выбери область для тренировки', text: 'Выбери из 5 областей: скорость обработки, рабочая память, внимание, когнитивная гибкость или словарный запас. Каждое упражнение длится 60 секунд.' },
    { name: 'Играй в упражнение', text: 'Находи слова на сетке одну минуту. Баллы, комбо и бонусы за редкие слова считаются в твой балл мозга.' },
    { name: 'Отслеживай прогресс', text: 'Смотри балл мозга, радарную диаграмму 5 областей и уровень (Новичок → Мастер). Создай бесплатный аккаунт, чтобы сохранить прогресс на устройствах.' },
    { name: 'Тренируйся ежедневно', text: 'Три упражнения в день занимают менее 5 минут и тренируют все 5 областей в неделю. Серии открывают более сложные уровни.' },
  ],
};

const COPY: Record<Locale, BrainLandingCopy> = { en, he, sv, ja, es, ru };

export function getBrainLandingCopy(locale: string): BrainLandingCopy {
  return COPY[(locale as Locale)] ?? en;
}
