/**
 * Connections (Word Bridge / rosh-zanav) landing copy.
 * Server-rendered for SEO indexability. Client components that need
 * interactive strings outside this route use translations.connections.landing.*.
 *
 * en + he live here; the other locales are one file each (content.<locale>.ts)
 * so no single file blows the 500-line limit. Shapes live in content.types.ts —
 * importing them from here would make the locale files circular.
 *
 * SUPPORTED_LANDING_LOCALES is the ONLY answer to "which locales have landing
 * copy". page.tsx and app/sitemap.ts both derive from it; they used to carry
 * their own hardcoded lists that disagreed with this one and with each other.
 */
export type {
  BenefitCard,
  CompareRow,
  ConnectionsLandingCopy,
  DemoPuzzle,
  FaqEntry,
} from './content.types';

import type { ConnectionsLandingCopy } from './content.types';
import { ES_COPY } from './content.es';
import { JA_COPY } from './content.ja';
import { RU_COPY } from './content.ru';
import { SV_COPY } from './content.sv';

const EN_COPY: ConnectionsLandingCopy = {
  metaTitle: 'Word Bridge — Find the Connecting Word | LexiClash',
  metaDescription:
    'Free online word puzzle. Two words, one bridge — find the word that links them. Also known as rosh-zanav, the classic Israeli word game. No signup, no downloads.',
  metaKeywords:
    'word bridge puzzle, word association game, bridge word game, rosh zanav, word link puzzle, free word games online, brain word puzzle',
  ogTitle: 'Word Bridge — Find the Connecting Word',
  ogDescription:
    'Two words, one bridge. The classic word-association puzzle, free online.',
  twitterTitle: 'Word Bridge — Free Online Puzzle',
  twitterDescription: 'Two words, one bridge. Find what links them.',
  badge: 'FREE • NO SIGNUP',
  h1Pre: 'Two words. One bridge.',
  h1Highlight: 'Find what links them.',
  h1Sub:
    'Word Bridge — also known as rosh-zanav, the classic Israeli word game',
  introP1:
    'Word Bridge gives you two words. Your job: find the single word that connects them. FIRE + ENGINE? TRUCK. SUN + SHINE? LIGHT. Easy to learn, hard to master.',
  introP2:
    'It’s the kind of game your brain wakes up for — fast rounds, vivid “aha” moments, and a vocabulary-stretching workout disguised as fun. Free, browser-based, no downloads.',
  ctaPrimary: 'Play Free Now',
  ctaSecondary: 'How it works ↓',
  demo: {
    label: 'Try one — tap the middle slot',
    puzzle: { word1: 'FIRE', word2: 'ENGINE', bridge: 'TRUCK', difficulty: 'easy' },
    reveal: 'Reveal bridge',
    success: 'That’s a bridge word!',
  },
  samples: {
    heading: 'Three to try',
    sub: 'Tap any card to reveal the bridge',
    revealLabel: 'Tap to reveal',
    difficultyLabels: { easy: 'Easy', medium: 'Medium', hard: 'Hard' },
    items: [
      { word1: 'SUN', word2: 'SHINE', bridge: 'LIGHT', difficulty: 'easy' },
      { word1: 'BREAK', word2: 'WATER', bridge: 'FAST', difficulty: 'medium' },
      { word1: 'BLACK', word2: 'STORM', bridge: 'THUNDER', difficulty: 'hard' },
    ],
  },
  why: {
    heading: 'Why it’s good for your brain',
    cards: [
      {
        title: 'Builds vocabulary fast',
        body: 'Every puzzle pulls from a different semantic neighborhood. You absorb word relationships without trying.',
      },
      {
        title: 'Trains lateral thinking',
        body: 'There’s rarely one path. Your brain learns to scan synonyms, compounds, and idioms at speed.',
      },
      {
        title: 'Strengthens semantic memory',
        body: 'Bridge-finding is recall + association together — the same skill behind quick wit and tip-of-the-tongue rescue.',
      },
    ],
  },
  heClassic: null,
  compare: {
    heading: 'How does it compare?',
    sub: 'We built Word Bridge to be different on purpose',
    columns: ['Game', 'What you do', 'Length', 'Skill tested'],
    rows: [
      {
        name: 'Word Bridge (this game)',
        doing: 'Find the word linking two given words',
        length: '30 sec / puzzle',
        skill: 'Association + vocab',
      },
      {
        name: 'NYT Connections',
        doing: 'Sort 16 words into 4 themed groups',
        length: '5–15 min',
        skill: 'Categorization',
      },
      {
        name: 'Wordle',
        doing: 'Guess one 5-letter word in 6 tries',
        length: '3–5 min',
        skill: 'Letter logic',
      },
      {
        name: 'Crossword',
        doing: 'Fill a grid from clues',
        length: '10–60 min',
        skill: 'Trivia + spelling',
      },
    ],
  },
  faq: {
    heading: 'Frequently asked',
    items: [
      {
        q: 'What is Word Bridge?',
        a: 'A word-association puzzle. You see two words and find the single word that bridges them. Example: TRAFFIC + STORM → JAM (traffic jam, jam storm). Both directions have to make sense.',
      },
      {
        q: 'Is this NYT Connections?',
        a: 'No. NYT Connections asks you to sort 16 words into 4 themed groups. Word Bridge gives you two words and asks for the linking word. Different mechanic, both fun.',
      },
      {
        q: 'Is it really free?',
        a: 'Yes. No signup required, no paywall. Optional rewarded ads buy you hints if you get stuck.',
      },
      {
        q: 'What does “rosh-zanav” mean?',
        a: 'Hebrew for “head-tail” (ראש זנב). It’s a classic Israeli car-trip word game where one player says a word and the next has to chain a related word. Word Bridge is its puzzle cousin.',
      },
      {
        q: 'Can I play in Hebrew?',
        a: 'Yes. Switch the locale and you’ll get a full Hebrew puzzle bank with native phrasing.',
      },
      {
        q: 'How do hints work?',
        a: 'One free hint per puzzle. Watch a quick rewarded ad or spend coins to reveal it. The hint never gives away the answer outright — just nudges you in the right direction.',
      },
    ],
  },
  footerCta: {
    heading: 'Ready to find some bridges?',
    body: 'Free. Browser-based. No downloads.',
    button: 'Start Playing',
  },
  videoGameName: 'Word Bridge (rosh-zanav)',
  videoGameDescription:
    'Free online word-association puzzle. Two words are shown, and players must find the single word that bridges them.',
};

const HE_COPY: ConnectionsLandingCopy = {
  metaTitle: 'ראש זנב — מצא את המילה המקשרת | LexiClash',
  metaDescription:
    'המשחק הקלאסי של ראש זנב — שתי מילים, וצריך למצוא את המילה שמחברת ביניהן. חינם, בעברית, בדפדפן. בלי הורדות, בלי הרשמה.',
  metaKeywords:
    'ראש זנב, משחקי מילים, חידות מילים, משחק קישור מילים, משחקי מוח, משחק מילים אונליין, משחקי מילים בעברית, חידות בעברית',
  ogTitle: 'ראש זנב — מצא את המילה המקשרת',
  ogDescription:
    'שתי מילים, גשר אחד. המשחק הקלאסי של נסיעות וטיולים — עכשיו אונליין.',
  twitterTitle: 'ראש זנב — חידות מילים בעברית',
  twitterDescription:
    'שתי מילים, מילה אחת באמצע. תצליח?',
  badge: 'חינם • ללא הרשמה',
  h1Pre: 'שתי מילים. מילה אחת באמצע.',
  h1Highlight: 'תמצא את הגשר?',
  h1Sub:
    'ראש זנב — המשחק הקלאסי של נסיעות, טיולים, וטרמפים',
  introP1:
    'ראש זנב נותן לך שתי מילים. המשימה: למצוא את המילה האחת שמקשרת ביניהן. אש + לוחם? כיבוי. שמש + יום? אור. פשוט להבין, מאתגר לפצח.',
  introP2:
    'זה משחק שמעיר את המוח — סבבים מהירים, רגעי אהה! חזקים, ואימון אוצר מילים שמרגיש כמו כיף. בחינם, ישירות בדפדפן, בלי הורדות.',
  ctaPrimary: 'התחל לשחק',
  ctaSecondary: 'איך זה עובד ↓',
  demo: {
    label: 'נסה אחת — לחץ על המשבצת באמצע',
    puzzle: { word1: 'אש', word2: 'לוחם', bridge: 'כיבוי', difficulty: 'easy' },
    reveal: 'חשוף גשר',
    success: 'זאת מילת גשר!',
  },
  samples: {
    heading: 'שלוש לדוגמה',
    sub: 'לחץ על כרטיס לחשיפת התשובה',
    revealLabel: 'לחץ לחשיפה',
    difficultyLabels: { easy: 'קל', medium: 'בינוני', hard: 'קשה' },
    items: [
      { word1: 'שמש', word2: 'יום', bridge: 'אור', difficulty: 'easy' },
      { word1: 'מים', word2: 'רחצה', bridge: 'חמים', difficulty: 'medium' },
      { word1: 'חשמל', word2: 'סופה', bridge: 'רעם', difficulty: 'hard' },
    ],
  },
  why: {
    heading: 'למה זה טוב למוח שלך',
    cards: [
      {
        title: 'מרחיב אוצר מילים',
        body: 'כל חידה שואבת ממרחב סמנטי אחר. אתה קולט קשרים בין מילים בלי לשים לב.',
      },
      {
        title: 'מאמן חשיבה צידית',
        body: 'כמעט תמיד יש יותר מדרך אחת. המוח לומד לסרוק נרדפות, צירופים וביטויים במהירות.',
      },
      {
        title: 'מחזק זיכרון סמנטי',
        body: 'מציאת גשרים = שליף + אסוציאציה ביחד — אותה מיומנות שמאחורי שנינות מהירה ופתרון של “על קצה הלשון”.',
      },
    ],
  },
  heClassic: {
    badge: 'קלאסיקה ישראלית',
    title: 'המשחק של כל טיול',
    body: 'ראש זנב הוא חלק מהזיכרון הקיבוצי של ישראל — בנסיעות לים הכינרת, בטיולים של בית ספר, בעצירות לנוחיות ובטיילי שבת. הבאנו אותו אונליין עם חידות שנכתבו וניסוחו בעברית.',
    imageAlt: 'דמות LexiClash — ראש זנב',
  },
  compare: {
    heading: 'מה ההבדל ממשחקים אחרים?',
    sub: 'בנינו את ראש זנב להיות שונה — בכוונה',
    columns: ['משחק', 'מה עושים', 'אורך', 'מיומנות'],
    rows: [
      {
        name: 'ראש זנב (המשחק הזה)',
        doing: 'מוצאים את המילה שמקשרת בין שתיים',
        length: '30 שניות לחידה',
        skill: 'אסוציאציה + אוצר מילים',
      },
      {
        name: 'NYT Connections',
        doing: 'ממיינים 16 מילים לארבע קבוצות',
        length: '5–15 דקות',
        skill: 'קטגוריזציה',
      },
      {
        name: 'Wordle',
        doing: 'מנחשים מילה בת 5 אותיות בשישה ניסיונות',
        length: '3–5 דקות',
        skill: 'לוגיקת אותיות',
      },
      {
        name: 'תשבץ',
        doing: 'ממלאים רשת לפי הגדרות',
        length: '10–60 דקות',
        skill: 'ידע כללי + איות',
      },
    ],
  },
  faq: {
    heading: 'שאלות נפוצות',
    items: [
      {
        q: 'מה זה ראש זנב?',
        a: 'משחק חידות אסוציאציה. מקבלים שתי מילים, וצריך למצוא את המילה האחת שמקשרת ביניהן. דוגמה: שמש + יום → אור. שני הכיוונים חייבים להישמע טבעי.',
      },
      {
        q: 'זה NYT Connections?',
        a: 'לא. ב-NYT Connections ממיינים 16 מילים לארבע קבוצות לפי נושא. ראש זנב נותן שתי מילים ושואל מה המילה שמחברת ביניהן. שני משחקים שונים, שניהם כיף.',
      },
      {
        q: 'זה באמת חינם?',
        a: 'כן. בלי הרשמה, בלי תשלום. אפשר לצפות בפרסומת קצרה כדי לקבל רמז אם נתקעת — אופציונלי.',
      },
      {
        q: 'מאיפה השם “ראש זנב”?',
        a: 'המשחק הקלאסי הישראלי של נסיעות וטיולים — שחקן אומר מילה, הבא צריך מילה שקשורה אליה, וכך הלאה. ראש זנב הדיגיטלי הוא בן הדוד החידתי שלו.',
      },
      {
        q: 'האם יש בנק חידות בעברית?',
        a: 'כן. בנק חידות מלא בעברית, עם ניסוח מקורי (לא תרגום). מתחלף ומתעדכן.',
      },
      {
        q: 'איך הרמזים עובדים?',
        a: 'רמז אחד חינם בכל חידה. צופים בפרסומת קצרה או משלמים מטבעות כדי לחשוף אותו. הרמז לא חושף את התשובה — רק נותן כיוון.',
      },
    ],
  },
  footerCta: {
    heading: 'מוכן למצוא גשרים?',
    body: 'חינם. ישירות בדפדפן. בלי הורדות.',
    button: 'התחל לשחק',
  },
  videoGameName: 'ראש זנב (Word Bridge)',
  videoGameDescription:
    'משחק חידות אסוציאציה חינם בעברית. השחקן מקבל שתי מילים, ועליו למצוא את המילה האחת שמקשרת ביניהן.',
};

/**
 * Every locale with a puzzle pool and native landing copy. page.tsx (robots +
 * hreflang) and app/sitemap.ts both derive from this list — it is the only
 * answer to "which locales have landing copy".
 *
 * `ja` was excluded until 2026-08-09: PageClient short-circuited `locale ===
 * 'ja'` to a "not available" wall added in 7161c59ac (2026-05-12), three months
 * BEFORE the Japanese pool was built. The pool now has 194 active puzzles, so
 * both the wall and the landing-card gate were removed together. A test asserts
 * the pair stays consistent in both directions.
 */
export const SUPPORTED_LANDING_LOCALES = ['en', 'he', 'sv', 'ja', 'es', 'ru'] as const;
export type SupportedLandingLocale = (typeof SUPPORTED_LANDING_LOCALES)[number];

// Keyed by SupportedLandingLocale | 'ja': the Record stays exhaustive over the
// landing locales (add one to the list → TS demands the copy), while 'ja' rides
// along so direct visitors to /ja/connections would get Japanese copy the moment
// the PageClient wall comes down. See the note on SUPPORTED_LANDING_LOCALES.
const COPY_BY_LOCALE: Record<SupportedLandingLocale | 'ja', ConnectionsLandingCopy> = {
  en: EN_COPY,
  he: HE_COPY,
  sv: SV_COPY,
  ja: JA_COPY,
  es: ES_COPY,
  ru: RU_COPY,
};

export function getConnectionsLandingCopy(locale: string): ConnectionsLandingCopy {
  return COPY_BY_LOCALE[locale as keyof typeof COPY_BY_LOCALE] ?? EN_COPY;
}

export function isSupportedLandingLocale(locale: string): locale is SupportedLandingLocale {
  return (SUPPORTED_LANDING_LOCALES as readonly string[]).includes(locale);
}
