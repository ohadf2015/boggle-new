'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useTheme } from '@/utils/ThemeContext';
import { toBcp47Locale } from '@/utils/bcp47Locale';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { ArrowLeft, BookOpen, Clock, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AutoHideHeader from '@/components/AutoHideHeader';
import { AdPlaceholder } from '@/components/ads';

interface BlogPost {
  slug: string;
  image: string;
  date: string;
}

interface LocalizedPostContent {
  title: string;
  excerpt: string;
  readTime: string;
  category: string;
}

interface PageContent {
  pageTitle: string;
  pageSubtitle: string;
  footerText: string;
  posts: Record<string, LocalizedPostContent>;
}

// Blog post metadata (non-localized)
const blogPosts: BlogPost[] = [
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
];

// Localized content for all languages
const contentByLocale: Record<string, PageContent> = {
  en: {
    pageTitle: 'Blog & Resources',
    pageSubtitle: 'Tips, strategies, and insights for word game enthusiasts',
    footerText: 'Join thousands of word game enthusiasts improving their skills with LexiClash. Play solo, compete with friends, or challenge daily puzzles in Hebrew, English, Swedish, and Japanese.',
    posts: {
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
    },
  },
};

export default function BlogIndexPageClient(): React.ReactElement {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const params = useParams();
  const locale = params.locale as string;
  const isDarkMode = theme === 'dark';

  // Get localized content with fallback to English
  const content = contentByLocale[locale] || contentByLocale.en;

  return (
    <div className={cn(
      'min-h-screen flex flex-col',
      isDarkMode
        ? 'bg-neo-navy'
        : 'bg-linear-to-br from-neo-cream via-white to-neo-cream'
    )}>
      <AutoHideHeader />

      <div className="max-w-5xl mx-auto px-4 py-8 page-content-safe">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href={`/${locale}`}>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'rounded-neo border-3 border-neo-black shadow-hard',
                isDarkMode ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-white text-neo-black hover:bg-neo-cream'
              )}
            >
              <ArrowLeft className="w-4 h-4 me-1 rtl:rotate-180" />
              {t('common.back')}
            </Button>
          </Link>
          <div>
            <h1 className={cn(
              'text-4xl font-black uppercase flex items-center gap-3',
              isDarkMode ? 'text-white' : 'text-neo-black'
            )}>
              <BookOpen className="w-8 h-8 text-neo-yellow" />
              {content.pageTitle}
            </h1>
            <p className={cn('text-sm mt-2', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>
              {content.pageSubtitle}
            </p>
          </div>
        </div>

        {/* Ad: Between header and post grid */}
        <AdPlaceholder zone="content-page" className="mb-6" />

        {/* Blog Posts Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {blogPosts.map((post) => {
            const postContent = content.posts[post.slug];
            if (!postContent) return null;

            return (
              <Link
                key={post.slug}
                href={`/${locale}/blog/${post.slug}`}
                className={cn(
                  'group block rounded-neo border-3 border-neo-black transition-all hover:scale-[1.02] overflow-hidden',
                  isDarkMode
                    ? 'bg-slate-800 hover:bg-slate-700'
                    : 'bg-white hover:bg-neo-cream shadow-hard hover:shadow-hard-lg'
                )}
              >
                {/* Preview Image */}
                <div className="relative w-full aspect-video overflow-hidden">
                  <Image
                    src={post.image}
                    alt={postContent.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {/* Category Badge overlaid on image */}
                  <div className="absolute top-3 inset-s-3">
                    <span className={cn(
                      'inline-block px-3 py-1 text-xs font-bold uppercase rounded-neo border-2 border-neo-black',
                      'bg-neo-yellow text-neo-black'
                    )}>
                      {postContent.category}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">
                  {/* Title */}
                  <h2 className={cn(
                    'text-lg font-bold mb-2 group-hover:text-neo-yellow transition-colors line-clamp-2',
                    isDarkMode ? 'text-white' : 'text-neo-black'
                  )}>
                    {postContent.title}
                  </h2>

                  {/* Excerpt */}
                  <p className={cn('text-sm mb-4 line-clamp-2', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>
                    {postContent.excerpt}
                  </p>

                  {/* Meta */}
                  <div className={cn(
                    'flex items-center gap-4 text-xs',
                    isDarkMode ? 'text-gray-500' : 'text-gray-500'
                  )}>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(post.date).toLocaleDateString(toBcp47Locale(language), { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {postContent.readTime}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* SEO Footer Note */}
        <div className={cn(
          'mt-12 pt-6 border-t text-center',
          isDarkMode ? 'border-slate-700' : 'border-gray-200'
        )}>
          <p className={cn('text-sm', isDarkMode ? 'text-gray-500' : 'text-gray-600')}>
            {content.footerText}
          </p>
        </div>
      </div>
    </div>
  );
}
