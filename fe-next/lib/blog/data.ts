// Centralized blog post manifest + localized content.
// Single source of truth for both the blog index (/[locale]/blog) and the
// homepage's "Latest from the Blog" section. Consumers sort/slice as needed.

export interface BlogPost {
  slug: string;
  image: string;
  date: string;
}

export interface LocalizedPostContent {
  title: string;
  excerpt: string;
  readTime: string;
  category: string;
}

export interface PageContent {
  pageTitle: string;
  pageSubtitle: string;
  footerText: string;
  posts: Record<string, LocalizedPostContent>;
}

export const blogPosts: BlogPost[] = [
  {
    slug: '10-surprising-benefits-word-games',
    image: '/images/blog/10-benefits.jpg',
    date: '2025-06-15',
  },
  {
    slug: 'science-behind-word-games',
    image: '/images/blog/science-brain.jpg',
    date: '2025-07-03',
  },
  {
    slug: 'daily-challenge-strategies',
    image: '/images/blog/daily-strategies.jpg',
    date: '2025-07-22',
  },
  {
    slug: 'multilingual-word-learning',
    image: '/images/blog/multilingual.jpg',
    date: '2025-08-10',
  },
  {
    slug: 'top-player-secrets',
    image: '/images/blog/top-secrets.jpg',
    date: '2025-08-28',
  },
  {
    slug: 'improve-word-game-skills',
    image: '/images/blog/improve-skills.jpg',
    date: '2025-09-15',
  },
  {
    slug: 'word-games-and-mental-health',
    image: '/images/blog/mental-health.jpg',
    date: '2025-10-05',
  },
  {
    slug: 'hebrew-word-games-guide',
    image: '/images/blog/hebrew-word-games.jpg',
    date: '2025-10-24',
  },
  {
    slug: 'why-word-games-are-addictive',
    image: '/images/blog/why-addictive.jpg',
    date: '2025-11-12',
  },
  {
    slug: 'best-boggle-alternatives-2026',
    image: '/images/blog/boggle-alternatives.jpg',
    date: '2025-12-01',
  },
  {
    slug: 'word-games-for-brain-training',
    image: '/images/blog/brain-training-words.jpg',
    date: '2025-12-20',
  },
  {
    slug: 'word-game-history',
    image: '/images/blog/word-game-history.jpg',
    date: '2026-01-08',
  },
  {
    slug: 'word-games-for-kids-education',
    image: '/images/blog/kids-education.jpg',
    date: '2026-01-27',
  },
  {
    slug: 'multiplayer-word-games-social',
    image: '/images/blog/multiplayer-social.jpg',
    date: '2026-02-15',
  },
  {
    slug: 'vocabulary-building-strategies',
    image: '/images/blog/vocabulary-building.jpg',
    date: '2026-03-05',
  },
  {
    slug: 'boggle-vs-wordle',
    image: '/images/blog/boggle-vs-wordle.jpg',
    date: '2026-03-28',
  },
  {
    slug: 'boggle-vs-scrabble',
    image: '/images/blog/boggle-vs-scrabble.jpg',
    date: '2026-03-28',
  },
  {
    slug: 'boggle-vs-words-with-friends',
    image: '/images/blog/boggle-vs-wwf.jpg',
    date: '2026-03-28',
  },
  {
    slug: 'netflix-word-game-2026-rise',
    image: '/images/blog/netflix-word-games.jpg',
    date: '2026-04-29',
  },
  {
    slug: 'most-popular-word-games-2026',
    image: '/images/blog/most-popular-word-games-2026.jpg',
    date: '2026-05-15',
  },
  {
    slug: 'free-word-games-online',
    image: '/images/blog/free-word-games-online.jpg',
    date: '2026-05-11',
  },
  {
    slug: 'milat-hayom-habit',
    image: '/images/blog/milat-hayom-habit.jpg',
    date: '2026-05-11',
  },
  {
    slug: 'mishachke-milim-chinuch',
    image: '/images/blog/mishachke-milim-chinuch.jpg',
    date: '2026-05-11',
  },
  {
    slug: 'alternativas-a-scrabble',
    image: '/images/blog/alternativas-a-scrabble.jpg',
    date: '2026-05-11',
  },
  {
    slug: 'juegos-palabras-gratis',
    image: '/images/blog/juegos-palabras-gratis.jpg',
    date: '2026-05-11',
  },
  {
    slug: 'ordspel-familjer',
    image: '/images/blog/ordspel-familjer.jpg',
    date: '2026-05-11',
  },
  {
    slug: 'multiplayer-strategy-guide',
    image: '/images/blog/strategy-tactics.jpg',
    date: '2026-08-03',
  },
  {
    slug: 'leaderboard-elo-explained',
    image: '/images/blog/top-player-secrets.jpg',
    date: '2026-08-03',
  },
];

export const blogPostsContent: Record<string, PageContent> = {
  en: {
    pageTitle: 'Blog & Resources',
    pageSubtitle: 'Tips, strategies, and insights for word game enthusiasts',
    footerText: 'Join thousands of word game enthusiasts improving their skills with LexiClash. Play solo, compete with friends, or challenge daily puzzles in Hebrew, English, Swedish, and Japanese.',
    posts: {
      'multiplayer-strategy-guide': {
        title: 'The Multiplayer Strategy Guide: How to Actually Win Word Battles',
        excerpt: 'Multiplayer is a different sport from solo play. Pacing, combo management, room-size tactics, fire rounds, and the mental game — the full playbook.',
        readTime: '10 min read',
        category: 'Strategy',
      },
      'leaderboard-elo-explained': {
        title: 'How the LexiClash Leaderboard Actually Works: ELO, Tiers, and Seasons Explained',
        excerpt: 'The real rating mechanics from the actual code: ELO for 1v1, Weng-Lin for multiplayer, K-factor calibration, and every tier threshold from Bronze to Grandmaster.',
        readTime: '9 min read',
        category: 'Guide',
      },
      '10-surprising-benefits-word-games': {
        title: '10 Surprising Benefits of Playing Word Games Daily',
        excerpt: 'Science-backed reasons why word games are more than just fun—they\'re essential brain training that can slow aging by up to 5 years.',
        readTime: '5 min read',
        category: 'Research',
      },
      'science-behind-word-games': {
        title: 'The Science Behind Word Games and Brain Health',
        excerpt: 'Explore the cognitive benefits of word games and how they improve memory, vocabulary, and mental agility backed by neuroscience.',
        readTime: '6 min read',
        category: 'Research',
      },
      'daily-challenge-strategies': {
        title: '7 Proven Daily Challenge Strategies to Dominate the Leaderboard',
        excerpt: 'Master these expert tactics to maximize your score and consistently rank among the top players in word game competitions.',
        readTime: '7 min read',
        category: 'Strategy',
      },
      'multilingual-word-learning': {
        title: 'The Ultimate Guide to Multilingual Word Learning Through Games',
        excerpt: 'How playing word games in Hebrew, English, Swedish, and Japanese accelerates vocabulary acquisition and supercharges your brain.',
        readTime: '8 min read',
        category: 'Language Learning',
      },
      'top-player-secrets': {
        title: '7 Secrets Top Word Game Players Don\'t Want You to Know',
        excerpt: 'Discover the insider techniques that separate champions from casual players—psychological tricks and training methods from the pros.',
        readTime: '9 min read',
        category: 'Insider Secrets',
      },
      'improve-word-game-skills': {
        title: 'How to Improve Your Word Game Skills',
        excerpt: 'Discover proven strategies to boost your word game performance, from vocabulary expansion to pattern recognition.',
        readTime: '8 min read',
        category: 'Strategy',
      },
      'why-word-games-are-addictive': {
        title: 'Why You Can\'t Stop Playing Word Games (And Why Your Brain Doesn\'t Want You To)',
        excerpt: 'The science behind word game addiction — dopamine, flow states, and the psychology that keeps you coming back for "just one more round."',
        readTime: '11 min read',
        category: 'Psychology',
      },
      'best-boggle-alternatives-2026': {
        title: 'I Tried Every Boggle Alternative I Could Find. Most of Them Suck.',
        excerpt: 'Honest reviews of every Boggle alternative worth playing in 2026. No sponsored fluff — just real opinions from someone who\'s played them all.',
        readTime: '10 min read',
        category: 'Reviews',
      },
      'word-games-for-brain-training': {
        title: 'My Dad\'s Neurologist Told Him to Play Word Games. So I Did the Research.',
        excerpt: 'What 19,000-person studies actually say about word games and brain health. Spoiler: it\'s more nuanced than the clickbait claims.',
        readTime: '12 min read',
        category: 'Brain Health',
      },
      'word-game-history': {
        title: 'From Ancient Tiles to Digital Grids: The Wild History of Word Games',
        excerpt: 'Stolen ideas, crossword mania, a stay-at-home dad\'s invention, and one five-letter word that broke the internet.',
        readTime: '10 min read',
        category: 'History',
      },
      'word-games-for-kids-education': {
        title: 'Why Every Teacher Should Have a Word Game in Their Toolkit',
        excerpt: 'The vocabulary gap is real, the research is compelling, and your students are already gamers — meet them where they are.',
        readTime: '11 min read',
        category: 'Education',
      },
      'word-games-and-mental-health': {
        title: 'How Word Games Became My Anxiety Hack (And What Therapists Think About That)',
        excerpt: 'Flow states, digital meditation, and the surprisingly thin line between healthy coping and avoidance.',
        readTime: '10 min read',
        category: 'Mental Health',
      },
      'hebrew-word-games-guide': {
        title: 'Playing Word Games in Hebrew: The Beautiful Chaos of Right-to-Left',
        excerpt: 'Root systems, missing vowels, and why designing a word game for Hebrew is like solving a puzzle inside a puzzle.',
        readTime: '9 min read',
        category: 'Language',
      },
      'multiplayer-word-games-social': {
        title: 'Why Playing Word Games With Friends Hits Different',
        excerpt: 'Cooperative cognition, competitive trash talk, and why your brain literally lights up more when other humans are involved.',
        readTime: '10 min read',
        category: 'Social Science',
      },
      'vocabulary-building-strategies': {
        title: 'I Learned 500 New Words in 30 Days (Here\'s Exactly How)',
        excerpt: 'Spaced repetition, active recall, morphology hacks, and the daily routines that actually stick.',
        readTime: '11 min read',
        category: 'Learning',
      },
      'boggle-vs-wordle': {
        title: 'Boggle vs Wordle: One Grid, Two Completely Different Brain Workouts',
        excerpt: 'Pattern recognition versus deductive logic. Unlimited rounds versus one a day. Which word game actually fits your brain?',
        readTime: '9 min read',
        category: 'Comparison',
      },
      'boggle-vs-scrabble': {
        title: 'Boggle vs Scrabble: Speed Demon or Strategic Mastermind?',
        excerpt: 'One gives you 3 minutes and chaos. The other lets you stare at tiles for 20. Which classic word game is actually better?',
        readTime: '10 min read',
        category: 'Comparison',
      },
      'boggle-vs-words-with-friends': {
        title: 'Boggle vs Words With Friends: Real-Time Rush or Async Chess Match?',
        excerpt: 'Grid scanning at 100mph versus carefully placing tiles over three days. Plus: one of them charges you for power-ups.',
        readTime: '9 min read',
        category: 'Comparison',
      },
      'netflix-word-game-2026-rise': {
        title: "Netflix Just Dropped a Word Game — 2026 Is the Year Word Games Took Over",
        excerpt: 'Streaming giants, daily-puzzle obsession, brain-training boom and a TikTok-shaped social loop. Why every screen you own suddenly wants you spelling things.',
        readTime: '9 min read',
        category: 'Trends',
      },
      'most-popular-word-games-2026': {
        title: 'The Most Popular Online Word Games of 2026 — and Why They Exploded',
        excerpt: 'A field guide to the word games everyone is actually playing in 2026 — Wordle, Connections, Strands, Words With Friends, Netflix Scattergories — and the four forces behind a $3.36B boom.',
        readTime: '10 min read',
        category: 'Trends',
      },
      'free-word-games-online': {
        title: 'Free Word Games Online: The Honest Guide (No Pay-to-Win)',
        excerpt: 'A field guide to free word games that respect your time and wallet. Five-question red-flag checklist + the daily puzzle and PWA patterns that actually work in 2026.',
        readTime: '11 min read',
        category: 'Guide',
      },
    },
  },
  he: {
    pageTitle: 'בלוג ומשאבים',
    pageSubtitle: 'טיפים, אסטרטגיות ותובנות לחובבי משחקי מילים',
    footerText: 'הצטרפו לאלפי חובבי משחקי מילים שמשפרים את הכישורים שלהם עם LexiClash. שחקו לבד, התחרו עם חברים, או התמודדו עם אתגרים יומיים בעברית, אנגלית, שוודית ויפנית.',
    posts: {
      '10-surprising-benefits-word-games': {
        title: '10 יתרונות מפתיעים של משחקי מילים יומיים',
        excerpt: 'סיבות מבוססות מדע למה משחקי מילים הם הרבה יותר מבידור - אימון מוחי חיוני שיכול להאט הזדקנות ב-5 שנים.',
        readTime: '5 דקות קריאה',
        category: 'מחקר',
      },
      'science-behind-word-games': {
        title: 'המדע מאחורי משחקי מילים ובריאות המוח',
        excerpt: 'גלו את היתרונות הקוגניטיביים של משחקי מילים ואיך הם משפרים זיכרון, אוצר מילים וזריזות מנטלית על פי מדע העצבים.',
        readTime: '6 דקות קריאה',
        category: 'מחקר',
      },
      'daily-challenge-strategies': {
        title: '7 אסטרטגיות מוכחות לשליטה בטבלת המובילים',
        excerpt: 'שלטו בטקטיקות מומחים אלו כדי למקסם את הניקוד שלכם ולהיות באופן עקבי בין השחקנים המובילים בתחרויות.',
        readTime: '7 דקות קריאה',
        category: 'אסטרטגיה',
      },
      'multilingual-word-learning': {
        title: 'המדריך המקיף ללמידת מילים רב-לשונית דרך משחקים',
        excerpt: 'איך משחקי מילים בעברית, אנגלית, שוודית ויפנית מאיצים רכישת אוצר מילים ומטעינים את המוח שלכם.',
        readTime: '8 דקות קריאה',
        category: 'לימוד שפות',
      },
      'top-player-secrets': {
        title: '7 סודות שהשחקנים המובילים לא רוצים שתדעו',
        excerpt: 'גלו את הטכניקות הפנימיות שמפרידות בין אלופים לשחקנים מזדמנים - טריקים פסיכולוגיים ושיטות אימון מהמקצוענים.',
        readTime: '9 דקות קריאה',
        category: 'סודות פנימיים',
      },
      'improve-word-game-skills': {
        title: 'איך לשפר את כישורי משחקי המילים שלכם',
        excerpt: 'גלו אסטרטגיות מוכחות לשיפור הביצועים במשחקי מילים, מהרחבת אוצר מילים ועד זיהוי דפוסים.',
        readTime: '8 דקות קריאה',
        category: 'אסטרטגיה',
      },
      'why-word-games-are-addictive': {
        title: 'למה אתם לא יכולים להפסיק לשחק משחקי מילים (ולמה המוח שלכם לא רוצה שתפסיקו)',
        excerpt: 'המדע מאחורי ההתמכרות למשחקי מילים — דופמין, מצבי זרימה והפסיכולוגיה שגורמת לכם לחזור ל"עוד סיבוב אחד."',
        readTime: '11 דקות קריאה',
        category: 'פסיכולוגיה',
      },
      'best-boggle-alternatives-2026': {
        title: 'ניסיתי כל חלופת בוגל שמצאתי. רובן לא שוות.',
        excerpt: 'ביקורות כנות על כל חלופת בוגל ששווה לשחק ב-2026. בלי שיווק — רק דעות אמיתיות ממישהו ששיחק בכולן.',
        readTime: '10 דקות קריאה',
        category: 'ביקורות',
      },
      'word-games-for-brain-training': {
        title: 'הנוירולוג של אבא שלי אמר לו לשחק משחקי מילים. אז עשיתי מחקר.',
        excerpt: 'מה מחקרים על 19,000 אנשים באמת אומרים על משחקי מילים ובריאות המוח. ספוילר: זה מורכב יותר ממה שהכותרות טוענות.',
        readTime: '12 דקות קריאה',
        category: 'בריאות המוח',
      },
      'word-game-history': {
        title: 'מאריחים עתיקים ללוחות דיגיטליים: ההיסטוריה המטורפת של משחקי מילים',
        excerpt: 'רעיונות גנובים, טירוף תשבצים, המצאה של אבא בבית, ומילה בת חמש אותיות ששברה את האינטרנט.',
        readTime: '10 דקות קריאה',
        category: 'היסטוריה',
      },
      'word-games-for-kids-education': {
        title: 'למה כל מורה צריך משחק מילים בארגז הכלים',
        excerpt: 'הפער באוצר המילים אמיתי, המחקר משכנע, והתלמידים שלכם כבר גיימרים — תפגשו אותם איפה שהם.',
        readTime: '11 דקות קריאה',
        category: 'חינוך',
      },
      'word-games-and-mental-health': {
        title: 'איך משחקי מילים הפכו לטריק שלי נגד חרדה (ומה מטפלים חושבים על זה)',
        excerpt: 'מצבי זרימה, מדיטציה דיגיטלית, והקו הדק בין התמודדות בריאה להימנעות.',
        readTime: '10 דקות קריאה',
        category: 'בריאות נפשית',
      },
      'hebrew-word-games-guide': {
        title: 'לשחק משחקי מילים בעברית: הכאוס היפה של ימין-לשמאל',
        excerpt: 'שורשים, ניקוד חסר, ולמה לעצב משחק מילים בעברית זה כמו לפתור חידה בתוך חידה.',
        readTime: '9 דקות קריאה',
        category: 'שפה',
      },
      'multiplayer-word-games-social': {
        title: 'למה לשחק משחקי מילים עם חברים זה משהו אחר לגמרי',
        excerpt: 'קוגניציה שיתופית, טראש טוק תחרותי, ולמה המוח שלכם ממש נדלק יותר כשיש אנשים אחרים.',
        readTime: '10 דקות קריאה',
        category: 'מדע חברתי',
      },
      'vocabulary-building-strategies': {
        title: 'למדתי 500 מילים חדשות ב-30 יום (ככה בדיוק)',
        excerpt: 'חזרה מרווחת, זכירה אקטיבית, טריקים מורפולוגיים, ושגרות יומיות שבאמת נתקעות.',
        readTime: '11 דקות קריאה',
        category: 'למידה',
      },
      'boggle-vs-wordle': {
        title: 'בוגל מול וורדל: שני משחקי מילים, שני מוחות שונים לגמרי',
        excerpt: 'זיהוי דפוסים מול היגיון דדוקטיבי. סיבובים אינסופיים מול פעם ביום. איזה משחק מילים באמת מתאים לכם?',
        readTime: '9 דקות קריאה',
        category: 'השוואה',
      },
      'boggle-vs-scrabble': {
        title: 'בוגל מול סקרבל: מהירות או אסטרטגיה?',
        excerpt: 'אחד נותן לכם 3 דקות וכאוס. השני נותן לכם לבהות באריחים 20 דקות. איזה קלאסיקה באמת יותר טובה?',
        readTime: '10 דקות קריאה',
        category: 'השוואה',
      },
      'boggle-vs-words-with-friends': {
        title: 'בוגל מול Words With Friends: מרוץ בזמן אמת או שחמט איטי?',
        excerpt: 'סריקת לוח ב-100 קמ״ש מול הנחת אריחים לאורך שלושה ימים. ואחד מהם גובה כסף על פאוור-אפס.',
        readTime: '9 דקות קריאה',
        category: 'השוואה',
      },
      'netflix-word-game-2026-rise': {
        title: 'נטפליקס שחררה משחק מילים — 2026 היא השנה של משחקי המילים',
        excerpt: 'סטרימינג ענק, התמכרות לפאזל היומי, גל אימון מוחי וטיק־טוק שהפך פתרון לספורט צפייה. למה כל מסך פתאום רוצה שתאייתו.',
        readTime: '9 דקות קריאה',
        category: 'טרנדים',
      },
      'most-popular-word-games-2026': {
        title: 'משחקי המילים הכי פופולריים אונליין ב-2026 — ולמה הם התפוצצו',
        excerpt: 'מדריך שטח למשחקי המילים שכולם באמת משחקים ב-2026 — Wordle, Connections, Strands, Words With Friends, Scattergories של נטפליקס — וארבעת הכוחות מאחורי תעשייה של 3.36 מיליארד דולר.',
        readTime: '10 דקות קריאה',
        category: 'טרנדים',
      },
      'milat-hayom-habit': {
        title: 'מילת היום: איך משחק קטן של שלוש דקות הופך להרגל של שנה שלמה',
        excerpt: 'מה קורה במוח כשמשחקים מילה אחת ביום, ולמה דווקא בעברית זה עבד רק החל מ-2024. מדריך מלא להרגל היומי.',
        readTime: '9 דקות קריאה',
        category: 'הרגלים',
      },
      'mishachke-milim-chinuch': {
        title: 'משחקי מילים בכיתה: מה קורה כשמורה לעברית מחליפה דף עבודה במשחק',
        excerpt: 'שלושה מודלים של משחקי מילים בכיתת עברית - דואלים, תחרות כיתה, וגשר בין הבית לבית הספר. מה שעבד ומה שלא.',
        readTime: '10 דקות קריאה',
        category: 'חינוך',
      },
    },
  },
  sv: {
    pageTitle: 'Blogg & Resurser',
    pageSubtitle: 'Tips, strategier och insikter för ordspelsentusiaster',
    footerText: 'Gå med tusentals ordspelsentusiaster som förbättrar sina färdigheter med LexiClash. Spela solo, tävla med vänner eller utmana dagliga pussel på hebreiska, engelska, svenska och japanska.',
    posts: {
      '10-surprising-benefits-word-games': {
        title: '10 överraskande fördelar med att spela ordspel dagligen',
        excerpt: 'Vetenskapligt bevisade skäl till varför ordspel är mer än bara skoj—de är viktig hjärnträning som kan bromsa åldrandet med upp till 5 år.',
        readTime: '5 min läsning',
        category: 'Forskning',
      },
      'science-behind-word-games': {
        title: 'Vetenskapen bakom ordspel och hjärnhälsa',
        excerpt: 'Utforska de kognitiva fördelarna med ordspel och hur de förbättrar minne, ordförråd och mental smidighet enligt neurovetenskap.',
        readTime: '6 min läsning',
        category: 'Forskning',
      },
      'daily-challenge-strategies': {
        title: '7 beprövade strategier för att dominera topplistan',
        excerpt: 'Bemästra dessa experttaktiker för att maximera din poäng och konsekvent rankas bland toppspelarna i ordspelstävlingar.',
        readTime: '7 min läsning',
        category: 'Strategi',
      },
      'multilingual-word-learning': {
        title: 'Den ultimata guiden till flerspråkig ordinlärning genom spel',
        excerpt: 'Hur ordspel på hebreiska, engelska, svenska och japanska accelererar ordförrådsinlärning och superladdar din hjärna.',
        readTime: '8 min läsning',
        category: 'Språkinlärning',
      },
      'top-player-secrets': {
        title: '7 hemligheter som toppspelare inte vill att du ska veta',
        excerpt: 'Upptäck insider-teknikerna som skiljer mästare från casual-spelare—psykologiska knep och träningsmetoder från proffsen.',
        readTime: '9 min läsning',
        category: 'Insiderhemligheter',
      },
      'improve-word-game-skills': {
        title: 'Hur du förbättrar dina ordspelsfärdigheter',
        excerpt: 'Upptäck beprövade strategier för att öka din prestation i ordspel, från ordförrådsutvidgning till mönsterigenkänning.',
        readTime: '8 min läsning',
        category: 'Strategi',
      },
      'why-word-games-are-addictive': {
        title: 'Varför du inte kan sluta spela ordspel (och varför din hjärna inte vill att du ska)',
        excerpt: 'Vetenskapen bakom ordspelsberoende — dopamin, flow-tillstånd och psykologin som får dig att vilja spela "bara en runda till."',
        readTime: '11 min läsning',
        category: 'Psykologi',
      },
      'best-boggle-alternatives-2026': {
        title: 'Jag testade alla Boggle-alternativ jag hittade. De flesta suger.',
        excerpt: 'Ärliga recensioner av varje Boggle-alternativ värt att spela 2026. Ingen sponsrad smörja — bara riktiga åsikter.',
        readTime: '10 min läsning',
        category: 'Recensioner',
      },
      'word-games-for-brain-training': {
        title: 'Min pappas neurolog sa åt honom att spela ordspel. Så jag gjorde research.',
        excerpt: 'Vad studier med 19 000 deltagare faktiskt säger om ordspel och hjärnhälsa. Spoiler: det är mer nyanserat än klickbetet.',
        readTime: '12 min läsning',
        category: 'Hjärnhälsa',
      },
      'word-game-history': {
        title: 'Från antika brickor till digitala rutnät: Ordspelens vilda historia',
        excerpt: 'Stulna idéer, korsordsmani, en hemmapappas uppfinning och ett ord på fem bokstäver som bröt internet.',
        readTime: '10 min läsning',
        category: 'Historia',
      },
      'word-games-for-kids-education': {
        title: 'Varför varje lärare bör ha ett ordspel i verktygslådan',
        excerpt: 'Ordförrådsgapet är verkligt, forskningen är övertygande, och dina elever är redan gamers.',
        readTime: '11 min läsning',
        category: 'Utbildning',
      },
      'word-games-and-mental-health': {
        title: 'Hur ordspel blev mitt ångestknep (och vad terapeuter tycker om det)',
        excerpt: 'Flow-tillstånd, digital meditation och den överraskande tunna linjen mellan hälsosam coping och undvikande.',
        readTime: '10 min läsning',
        category: 'Mental hälsa',
      },
      'hebrew-word-games-guide': {
        title: 'Att spela ordspel på hebreiska: Det vackra kaoset med höger-till-vänster',
        excerpt: 'Rotsystem, saknade vokaler och varför det är som att lösa ett pussel inuti ett pussel.',
        readTime: '9 min läsning',
        category: 'Språk',
      },
      'multiplayer-word-games-social': {
        title: 'Varför ordspel med vänner känns annorlunda',
        excerpt: 'Kooperativ kognition, tävlingsinriktat trash talk och varför din hjärna bokstavligen lyser mer med andra.',
        readTime: '10 min läsning',
        category: 'Samhällsvetenskap',
      },
      'vocabulary-building-strategies': {
        title: 'Jag lärde mig 500 nya ord på 30 dagar (så här gjorde jag)',
        excerpt: 'Repetition med intervall, aktiv återkallning, morfologiknep och dagliga rutiner som faktiskt fastnar.',
        readTime: '11 min läsning',
        category: 'Lärande',
      },
      'boggle-vs-wordle': {
        title: 'Boggle vs Wordle: Två ordspel, två helt olika hjärnträningar',
        excerpt: 'Mönsterigenkänning mot deduktiv logik. Obegränsade rundor mot en om dagen. Vilket ordspel passar din hjärna?',
        readTime: '9 min läsning',
        category: 'Jämförelse',
      },
      'boggle-vs-scrabble': {
        title: 'Boggle vs Scrabble: Fartdemon eller strategiskt geni?',
        excerpt: 'Det ena ger dig 3 minuter och kaos. Det andra låter dig stirra på brickor i 20. Vilken klassiker är bäst?',
        readTime: '10 min läsning',
        category: 'Jämförelse',
      },
      'boggle-vs-words-with-friends': {
        title: 'Boggle vs Words With Friends: Realtidsrush eller asynkront schack?',
        excerpt: 'Rutnätsskanning i 100 km/h mot att lägga brickor under tre dagar. Plus: ett av dem tar betalt för power-ups.',
        readTime: '9 min läsning',
        category: 'Jämförelse',
      },
      'netflix-word-game-2026-rise': {
        title: 'Netflix släppte ett ordspel — 2026 är ordspelens år',
        excerpt: 'Streamingjättar, daglig pusselbesatthet, hjärnträningsboom och en TikTok-driven social loop. Varför varenda skärm plötsligt vill att du stavar.',
        readTime: '9 min läsning',
        category: 'Trender',
      },
      'most-popular-word-games-2026': {
        title: 'De populäraste ordspelen online 2026 — och varför de exploderade',
        excerpt: 'En fältguide till ordspelen alla faktiskt spelar 2026 — Wordle, Connections, Strands, Words With Friends, Netflix Scattergories — och de fyra krafterna bakom en boom på 3,36 miljarder dollar.',
        readTime: '10 min läsning',
        category: 'Trender',
      },
      'ordspel-familjer': {
        title: 'Ordspel för Familjer: Hur Vi Hittade Något Att Göra Tillsammans Som Faktiskt Funkar',
        excerpt: 'En ärlig redogörelse om hur ordspel blev söndagens familjetradition: från sexåring till mormor på FaceTime. Vad fungerar och vad du bör undvika.',
        readTime: '9 minuters läsning',
        category: 'Familj',
      },
    },
  },
  ja: {
    pageTitle: 'ブログ＆リソース',
    pageSubtitle: 'ワードゲーム愛好家のためのヒント、戦略、洞察',
    footerText: 'LexiClashでスキルを向上させている何千人ものワードゲーム愛好家に参加しましょう。ソロプレイ、友達との対戦、ヘブライ語、英語、スウェーデン語、日本語でのデイリーチャレンジに挑戦しましょう。',
    posts: {
      '10-surprising-benefits-word-games': {
        title: '毎日のワードゲームで得られる10の驚くべきメリット',
        excerpt: 'ワードゲームが単なる娯楽以上である科学的理由—脳の老化を最大5年遅らせる必須の脳トレーニング。',
        readTime: '5分で読める',
        category: '研究',
      },
      'science-behind-word-games': {
        title: 'ワードゲームと脳の健康の背後にある科学',
        excerpt: '神経科学に裏付けられた、ワードゲームが記憶力、語彙力、精神的敏捷性を向上させる認知的メリットを探ります。',
        readTime: '6分で読める',
        category: '研究',
      },
      'daily-challenge-strategies': {
        title: 'リーダーボードを制覇する7つの実証済み戦略',
        excerpt: 'これらの専門家戦術をマスターして、スコアを最大化し、ワードゲーム大会で常にトップランクを維持しましょう。',
        readTime: '7分で読める',
        category: '戦略',
      },
      'multilingual-word-learning': {
        title: 'ゲームで学ぶ多言語単語習得の究極ガイド',
        excerpt: 'ヘブライ語、英語、スウェーデン語、日本語でのワードゲームが語彙習得を加速し、脳をスーパーチャージする方法。',
        readTime: '8分で読める',
        category: '言語学習',
      },
      'top-player-secrets': {
        title: 'トッププレイヤーが教えたくない7つの秘密',
        excerpt: 'チャンピオンとカジュアルプレイヤーを分けるインサイダーテクニックを発見—プロからの心理的トリックとトレーニング方法。',
        readTime: '9分で読める',
        category: 'インサイダー',
      },
      'improve-word-game-skills': {
        title: 'ワードゲームスキルを向上させる方法',
        excerpt: '語彙の拡張からパターン認識まで、ワードゲームのパフォーマンスを向上させる実証済みの戦略を発見しましょう。',
        readTime: '8分で読める',
        category: '戦略',
      },
      'why-word-games-are-addictive': {
        title: 'ワードゲームをやめられない理由（そして脳がやめさせたくない理由）',
        excerpt: 'ワードゲーム中毒の科学 — ドーパミン、フロー状態、そして「もう1ラウンドだけ」と思わせる心理学。',
        readTime: '11分で読める',
        category: '心理学',
      },
      'best-boggle-alternatives-2026': {
        title: '見つけられるBoggle代替ゲームを全部試してみた。ほとんどはイマイチ。',
        excerpt: '2026年にプレイする価値のあるBoggle代替ゲームの正直なレビュー。スポンサーなし — 全部プレイした人間のリアルな意見。',
        readTime: '10分で読める',
        category: 'レビュー',
      },
      'word-games-for-brain-training': {
        title: '父の神経科医がワードゲームを勧めた。だから私は論文を調べた。',
        excerpt: '19,000人規模の研究がワードゲームと脳の健康について実際に示すこと。ネタバレ：クリックベイトよりずっと複雑。',
        readTime: '12分で読める',
        category: '脳の健康',
      },
      'word-game-history': {
        title: '古代のタイルからデジタルグリッドへ：ワードゲームの波乱万丈な歴史',
        excerpt: '盗まれたアイデア、クロスワードマニア、専業主夫の発明、そしてインターネットを壊した5文字の単語。',
        readTime: '10分で読める',
        category: '歴史',
      },
      'word-games-for-kids-education': {
        title: 'すべての教師がワードゲームを持つべき理由',
        excerpt: '語彙格差は現実、研究は説得力あり、生徒たちはすでにゲーマー — 彼らのいる場所で会いましょう。',
        readTime: '11分で読める',
        category: '教育',
      },
      'word-games-and-mental-health': {
        title: 'ワードゲームが私の不安対策になった経緯（セラピストの見解も）',
        excerpt: 'フロー状態、デジタル瞑想、健全な対処と回避の驚くほど薄い境界線。',
        readTime: '10分で読める',
        category: 'メンタルヘルス',
      },
      'hebrew-word-games-guide': {
        title: 'ヘブライ語でワードゲーム：右から左の美しいカオス',
        excerpt: '語根システム、母音なし、ヘブライ語のワードゲーム設計がパズルの中のパズルである理由。',
        readTime: '9分で読める',
        category: '言語',
      },
      'multiplayer-word-games-social': {
        title: '友達とのワードゲームが特別な理由',
        excerpt: '協調的認知、競争的トラッシュトーク、他の人間がいると脳が文字通りもっと輝く理由。',
        readTime: '10分で読める',
        category: '社会科学',
      },
      'boggle-vs-wordle': {
        title: 'Boggle vs Wordle：同じ「言葉」でも全く違う脳トレ',
        excerpt: 'パターン認識 vs 演繹的推理。無制限ラウンド vs 1日1回。あなたの脳に合うワードゲームはどっち？',
        readTime: '9分で読める',
        category: '比較',
      },
      'boggle-vs-scrabble': {
        title: 'Boggle vs Scrabble：スピード狂か戦略の達人か？',
        excerpt: '一方は3分間のカオス。もう一方は20分間タイルを見つめる。どっちのクラシックが本当に優れてる？',
        readTime: '10分で読める',
        category: '比較',
      },
      'boggle-vs-words-with-friends': {
        title: 'Boggle vs Words With Friends：リアルタイムの疾走 vs 非同期チェス',
        excerpt: 'グリッドを時速100kmでスキャン vs 3日かけてタイルを配置。しかも片方はパワーアップに課金。',
        readTime: '9分で読める',
        category: '比較',
      },
      'vocabulary-building-strategies': {
        title: '30日で500の新しい単語を覚えた方法（具体的に教えます）',
        excerpt: '間隔反復、能動的想起、形態学ハック、実際に定着する日課。',
        readTime: '11分で読める',
        category: '学習',
      },
      'netflix-word-game-2026-rise': {
        title: 'Netflixがワードゲームを投入 — 2026年はワードゲームの年',
        excerpt: 'ストリーミング大手、デイリーパズル中毒、脳トレブーム、TikTok型ソーシャルループ。なぜあなたの全画面が突然「綴れ」と言ってくるのか。',
        readTime: '9分で読める',
        category: 'トレンド',
      },
      'most-popular-word-games-2026': {
        title: '2026年に最も人気のオンラインワードゲーム — そして、なぜ爆発したのか',
        excerpt: '2026年にみんなが実際に遊んでいるワードゲームへのフィールドガイド — Wordle、Connections、Strands、Words With Friends、Netflix Scattergories — そして33.6億ドルのブームを支える4つの力。',
        readTime: '10分で読めます',
        category: 'トレンド',
      },
    },
  },
  es: {
    pageTitle: 'Blog y Recursos',
    pageSubtitle: 'Consejos, estrategias e ideas para entusiastas de juegos de palabras',
    footerText: 'Únete a miles de entusiastas de juegos de palabras que mejoran sus habilidades con LexiClash. Juega solo, compite con amigos o desafía puzzles diarios en hebreo, inglés, sueco, japonés y español.',
    posts: {
      '10-surprising-benefits-word-games': {
        title: '10 Beneficios Sorprendentes de Jugar Juegos de Palabras',
        excerpt: 'Razones respaldadas por la ciencia de por qué los juegos de palabras son entrenamiento cerebral esencial.',
        readTime: '5 min de lectura',
        category: 'Investigación',
      },
      'science-behind-word-games': {
        title: 'La Ciencia Detrás de los Juegos de Palabras y la Salud Cerebral',
        excerpt: 'Explora los beneficios cognitivos respaldados por la neurociencia.',
        readTime: '6 min de lectura',
        category: 'Investigación',
      },
      'daily-challenge-strategies': {
        title: '7 Estrategias Probadas para Dominar el Desafío Diario',
        excerpt: 'Domina estas tácticas expertas para maximizar tu puntuación.',
        readTime: '7 min de lectura',
        category: 'Estrategia',
      },
      'multilingual-word-learning': {
        title: 'La Guía Definitiva para Aprender Palabras en Varios Idiomas',
        excerpt: 'Cómo los juegos de palabras en múltiples idiomas aceleran tu vocabulario.',
        readTime: '8 min de lectura',
        category: 'Aprendizaje',
      },
      'top-player-secrets': {
        title: '7 Secretos que los Mejores Jugadores No Quieren que Sepas',
        excerpt: 'Descubre las técnicas que separan a los campeones de los jugadores casuales.',
        readTime: '9 min de lectura',
        category: 'Secretos',
      },
      'improve-word-game-skills': {
        title: 'Cómo Mejorar en los Juegos de Palabras',
        excerpt: 'Estrategias probadas desde expansión de vocabulario hasta reconocimiento de patrones.',
        readTime: '8 min de lectura',
        category: 'Estrategia',
      },
      'why-word-games-are-addictive': {
        title: 'Por Qué No Puedes Dejar de Jugar Juegos de Palabras',
        excerpt: 'La ciencia detrás de la adicción — dopamina, estados de flujo y la psicología de "una ronda más."',
        readTime: '11 min de lectura',
        category: 'Psicología',
      },
      'best-boggle-alternatives-2026': {
        title: 'Probé Todas las Alternativas a Boggle. La Mayoría No Valen la Pena.',
        excerpt: 'Reseñas honestas de cada alternativa a Boggle que vale la pena jugar en 2026.',
        readTime: '10 min de lectura',
        category: 'Reseñas',
      },
      'word-games-for-brain-training': {
        title: 'El Neurólogo de Mi Papá le Dijo que Jugara Juegos de Palabras. Así que Investigué.',
        excerpt: 'Lo que los estudios con 19.000 personas realmente dicen sobre juegos de palabras y salud cerebral.',
        readTime: '12 min de lectura',
        category: 'Salud Cerebral',
      },
      'word-game-history': {
        title: 'De Fichas Antiguas a Grillas Digitales: La Loca Historia de los Juegos de Palabras',
        excerpt: 'Ideas robadas, la manía de los crucigramas, la invención de un padre hogareño y una palabra de cinco letras que rompió internet.',
        readTime: '10 min de lectura',
        category: 'Historia',
      },
      'word-games-for-kids-education': {
        title: 'Por Qué Todo Profesor Debería Tener un Juego de Palabras',
        excerpt: 'La brecha de vocabulario es real, la investigación es convincente, y tus alumnos ya son gamers.',
        readTime: '11 min de lectura',
        category: 'Educación',
      },
      'word-games-and-mental-health': {
        title: 'Cómo los Juegos de Palabras Se Convirtieron en Mi Truco Anti-Ansiedad',
        excerpt: 'Estados de flujo, meditación digital y la línea sorprendentemente fina entre afrontamiento sano y evasión.',
        readTime: '10 min de lectura',
        category: 'Salud Mental',
      },
      'hebrew-word-games-guide': {
        title: 'Jugar Juegos de Palabras en Hebreo: El Hermoso Caos de Derecha a Izquierda',
        excerpt: 'Sistemas de raíces, vocales ausentes y por qué diseñar un juego de palabras en hebreo es un rompecabezas dentro de otro.',
        readTime: '9 min de lectura',
        category: 'Idioma',
      },
      'multiplayer-word-games-social': {
        title: 'Por Qué Jugar Juegos de Palabras con Amigos Es Diferente',
        excerpt: 'Cognición cooperativa, trash talk competitivo y por qué tu cerebro literalmente se ilumina más con otros humanos.',
        readTime: '10 min de lectura',
        category: 'Ciencia Social',
      },
      'vocabulary-building-strategies': {
        title: 'Aprendí 500 Palabras Nuevas en 30 Días (Así Es Exactamente Cómo)',
        excerpt: 'Repetición espaciada, recuerdo activo, trucos morfológicos y rutinas diarias que realmente se quedan.',
        readTime: '11 min de lectura',
        category: 'Aprendizaje',
      },
      'boggle-vs-wordle': {
        title: 'Boggle vs Wordle: Dos Juegos de Palabras, Dos Cerebros Distintos',
        excerpt: 'Reconocimiento de patrones vs lógica deductiva. Rondas ilimitadas vs una al día. ¿Cuál le va mejor a tu cerebro?',
        readTime: '9 min de lectura',
        category: 'Comparación',
      },
      'boggle-vs-scrabble': {
        title: 'Boggle vs Scrabble: ¿Velocidad o Estrategia?',
        excerpt: 'Uno te da 3 minutos de caos. El otro te deja mirar fichas 20 minutos. ¿Cuál clásico es realmente mejor?',
        readTime: '10 min de lectura',
        category: 'Comparación',
      },
      'boggle-vs-words-with-friends': {
        title: 'Boggle vs Words With Friends: Adrenalina en Tiempo Real o Partida Eterna',
        excerpt: 'Escanear grillas a toda velocidad vs colocar fichas durante tres días. Y uno de ellos cobra por power-ups.',
        readTime: '9 min de lectura',
        category: 'Comparación',
      },
      'netflix-word-game-2026-rise': {
        title: 'Netflix lanza un juego de palabras — 2026, el año de los juegos de palabras',
        excerpt: 'Gigantes del streaming, obsesión por el puzzle diario, boom del entrenamiento cerebral y un bucle social al estilo TikTok. Por qué cada pantalla quiere que deletrees.',
        readTime: '9 min de lectura',
        category: 'Tendencias',
      },
      'most-popular-word-games-2026': {
        title: 'Los juegos de palabras online más populares de 2026 — y por qué explotaron',
        excerpt: 'Una guía de campo de los juegos de palabras que todos juegan de verdad en 2026 — Wordle, Connections, Strands, Words With Friends, Netflix Scattergories — y las cuatro fuerzas detrás de un boom de 3.360 millones de dólares.',
        readTime: '10 min de lectura',
        category: 'Tendencias',
      },
      'alternativas-a-scrabble': {
        title: 'Alternativas a Scrabble: 4 Juegos de Palabras que Realmente Valen la Pena (2026)',
        excerpt: 'Cuatro alternativas modernas al clásico juego de letras en tablero: velocidad pura, caza objetivo, duelos online y agrupación tipo Connections.',
        readTime: '11 min de lectura',
        category: 'Comparativa',
      },
      'juegos-palabras-gratis': {
        title: 'Juegos de Palabras Gratis 2026: Cómo Detectar las Trampas en 30 Segundos',
        excerpt: 'Cinco señales de alerta para identificar juegos "gratis" que en realidad son trampas de pago. Guía honesta para hispanohablantes con acentos, eñe y RAE.',
        readTime: '10 min de lectura',
        category: 'Guía',
      },
    },
  },
  ru: {
    pageTitle: 'Блог и ресурсы',
    pageSubtitle: 'Советы, стратегии и инсайты для любителей словесных игр',
    footerText: 'Присоединяйтесь к тысячам любителей словесных игр, которые совершенствуют свои навыки с LexiClash. Играйте соло, соревнуйтесь с друзьями или решайте ежедневные головоломки на иврите, английском, шведском, японском и русском языках.',
    posts: {
      '10-surprising-benefits-word-games': {
        title: 'Я играл в словесные игры каждый день целый год. Вот что произошло на самом деле.',
        excerpt: 'Научно подтверждённые причины, почему словесные игры — это не просто развлечение: они необходимый мозговой тренинг, который может замедлить старение на 5 лет.',
        readTime: '5 мин чтения',
        category: 'Исследования',
      },
      'science-behind-word-games': {
        title: 'Наука о словесных играх: что на самом деле происходит в твоём мозге',
        excerpt: 'Познакомьтесь с когнитивными преимуществами словесных игр и тем, как они улучшают память, словарный запас и умственную гибкость на основе нейронауки.',
        readTime: '6 мин чтения',
        category: 'Исследования',
      },
      'daily-challenge-strategies': {
        title: 'Стратегии ежедневного челленджа: что на самом деле помогает',
        excerpt: 'Овладейте этими экспертными тактиками, чтобы максимизировать свой результат и постоянно занимать место среди лучших игроков в словесных соревнованиях.',
        readTime: '7 мин чтения',
        category: 'Стратегия',
      },
      'multilingual-word-learning': {
        title: 'Почему твой мозг смешивает языки (и почему это на самом деле хорошо)',
        excerpt: 'Как игры в словесные игры на иврите, английском, шведском и японском языках ускоряют расширение словарного запаса и суперзаряжают ваш мозг.',
        readTime: '8 мин чтения',
        category: 'Изучение языков',
      },
      'top-player-secrets': {
        title: 'Я дошёл до финала турнира по Скрэбблу. Вот что было дальше.',
        excerpt: 'Откройте для себя инсайдерские техники, которые отличают чемпионов от случайных игроков — психологические хитрости и методы тренировки от профессионалов.',
        readTime: '9 мин чтения',
        category: 'Секреты',
      },
      'improve-word-game-skills': {
        title: 'Я потратил 3 года на то, чтобы стать лучше в словесных играх. Большую часть попробованного я мог пропустить.',
        excerpt: 'Всё то, что действительно работает, поместится на салфетке. Остальное — это эго и интернет-драма — но есть техники, которые можно применить прямо сейчас.',
        readTime: '9 мин чтения',
        category: 'Стратегия',
      },
      'why-word-games-are-addictive': {
        title: 'Почему ты не можешь остановиться (и почему твой мозг не хочет, чтобы ты это делал)',
        excerpt: 'Наука пристрастия к словесным играм — дофамин, состояния потока и психология, которая заставляет вас возвращаться на «ещё один раунд».',
        readTime: '11 мин чтения',
        category: 'Психология',
      },
      'best-boggle-alternatives-2026': {
        title: 'Я попробовал все альтернативы Boggle. Большинство из них не стоят внимания.',
        excerpt: 'Честные отзывы о каждой альтернативе Boggle, которая стоит внимания в 2026. Без спонсорского контента — только реальное мнение человека, который их все попробовал.',
        readTime: '10 мин чтения',
        category: 'Отзывы',
      },
      'word-games-for-brain-training': {
        title: 'Невролог моего отца сказал ему играть в словесные игры. Поэтому я провел исследование.',
        excerpt: 'Что на самом деле говорят исследования с участием 19 000 человек о словесных играх и здоровье мозга. Спойлер: это сложнее, чем обещают сенсационные заголовки.',
        readTime: '10 мин чтения',
        category: 'Здоровье мозга',
      },
      'word-game-history': {
        title: 'От древних плиток к цифровым сеткам: дикая история словесных игр',
        excerpt: 'Украденные идеи, мания к кроссвордам, изобретение домохозяина и одно пятибуквенное слово, которое сломало интернет.',
        readTime: '10 мин чтения',
        category: 'История',
      },
      'word-games-for-kids-education': {
        title: 'Почему каждому учителю нужна словесная игра в своем арсенале',
        excerpt: 'Разрыв в словарном запасе реален, исследования убедительны, и ваши ученики уже геймеры — встречайте их там, где они находятся.',
        readTime: '11 мин чтения',
        category: 'Образование',
      },
      'word-games-and-mental-health': {
        title: 'Как словесные игры спасают меня от тревоги (и что об этом думают психологи)',
        excerpt: 'Состояния потока, цифровая медитация и удивительно тонкая линия между здоровым преодолением и избеганием.',
        readTime: '10 мин чтения',
        category: 'Психическое здоровье',
      },
      'hebrew-word-games-guide': {
        title: 'Играть в словесные игры на иврите: прекрасный хаос справа налево',
        excerpt: 'Корневые системы, отсутствующие гласные и почему проектировать словесную игру на иврите — это как решать головоломку внутри головоломки.',
        readTime: '9 мин чтения',
        category: 'Язык',
      },
      'multiplayer-word-games-social': {
        title: 'Словесные игры с друзьями — совсем другое дело (вот почему)',
        excerpt: 'Кооперативное познание, состязательный трэш-ток и почему ваш мозг буквально светится ярче рядом с другими людьми.',
        readTime: '10 мин чтения',
        category: 'Социальная наука',
      },
      'vocabulary-building-strategies': {
        title: 'Выучил 500 новых слов за 30 дней — и вот как я это сделал',
        excerpt: 'Интервальное повторение, активное припоминание, морфологические трюки и ежедневные привычки, которые действительно работают.',
        readTime: '14 мин чтения',
        category: 'Обучение',
      },
      'boggle-vs-wordle': {
        title: 'Boggle vs Wordle: одна сетка, два совершенно разных мозговых тренинга',
        excerpt: 'Распознавание паттернов против дедуктивной логики. Неограниченные раунды против одного в день. Какая словесная игра действительно подходит вашему мозгу?',
        readTime: '9 мин чтения',
        category: 'Сравнение',
      },
      'boggle-vs-scrabble': {
        title: 'Boggle vs Scrabble: демон скорости или стратегический гений?',
        excerpt: 'Одна даёт вам 3 минуты и хаос. Другая позволяет вам смотреть на плитки 20 минут. Какой классик на самом деле лучше?',
        readTime: '10 мин чтения',
        category: 'Сравнение',
      },
      'boggle-vs-words-with-friends': {
        title: 'Boggle vs Words With Friends: реал-тайм спешка или асинхронные шахматы?',
        excerpt: 'Сканирование сетки на скорости 100 км/ч против размещения плиток в течение трёх дней. И один из них берёт деньги за power-ups.',
        readTime: '9 мин чтения',
        category: 'Сравнение',
      },
      'netflix-word-game-2026-rise': {
        title: 'Netflix выпустила словесную игру — 2026 год стал годом словесных игр',
        excerpt: 'Гиганты потокового вещания, одержимость ежедневными головоломками, бум мозговых тренировок и социальный цикл в стиле TikTok. Почему каждый экран вас заставляет писать слова.',
        readTime: '9 мин чтения',
        category: 'Тренды',
      },
      'most-popular-word-games-2026': {
        title: 'Самые популярные онлайн-игры в слова в 2026 году — и почему они взорвались',
        excerpt: 'Путеводитель по словесным играм, в которые все реально играют в 2026 — Wordle, Connections, Strands, Words With Friends, Netflix Scattergories — и четыре силы, стоящие за 3,36-миллиардным бумом.',
        readTime: '10 мин чтения',
        category: 'Тренды',
      },
      'free-word-games-online': {
        title: 'Бесплатные словесные игры онлайн: честный гайд (без pay-to-win)',
        excerpt: 'Путеводитель по словесным играм, которые уважают твоё время, кошелёк и внимание. Пять красных флагов плюс дневные и прогрессивные веб-приложения, которые действительно работают в 2026.',
        readTime: '11 мин чтения',
        category: 'Гайд',
      },
    },
  },
};

/**
 * Returns posts sorted by date descending (newest first).
 * Ties broken by slug for stable order across renders.
 */
export function getSortedBlogPosts(): BlogPost[] {
  return [...blogPosts].sort((a, b) => {
    if (a.date === b.date) return a.slug.localeCompare(b.slug);
    return b.date.localeCompare(a.date);
  });
}

/**
 * Returns the n most recent posts. Used by the homepage blog teaser.
 */
export function getRecentBlogPosts(n: number): BlogPost[] {
  return getSortedBlogPosts().slice(0, n);
}

/**
 * Returns the n most recent posts that have localized content for the given locale.
 * Locale-targeted posts (e.g. Spanish-only `alternativas-a-scrabble`) are skipped
 * for other locales so the homepage teaser never renders an empty card.
 */
export function getRecentBlogPostsForLocale(locale: string, n: number): BlogPost[] {
  const localeContent = blogPostsContent[locale] || blogPostsContent.en;
  return getSortedBlogPosts()
    .filter((p) => p.slug in localeContent.posts)
    .slice(0, n);
}
