// Kept out of page.tsx: a webpack prod build rejects non-Next named exports from a page file.

export const BASE_URL = 'https://www.lexiclash.live';
export const PAGE_PATH = '/he/mischaqey-safa-imun-kogniti';
export const CANONICAL = `${BASE_URL}${PAGE_PATH}`;

export const META_TITLE = 'משחקי שפה לאימון קוגניטיבי: מה הם מתרגלים ואיך לשחק 10 דקות ביום | LexiClash';
export const META_DESCRIPTION =
  'משחקי שפה לאימון קוגניטיבי: איזה משחק מילים מתרגל זיכרון, ריכוז, מהירות או אוצר מילים, תוכנית של 10 דקות ביום, התאמה לגילים שונים ותשובה כנה על מה המחקר כן ולא מראה. חינם, בעברית, בלי הרשמה.';

export const skills: { skill: string; game: string; text: string; href: string }[] = [
  {
    skill: 'מהירות עיבוד',
    game: 'מציאת מילים בלוח אותיות',
    text: 'לוח של אותיות, טיימר רץ, וצריך לזהות כמה שיותר מילים. המוח סורק, מזהה דפוס ומחליט מהר. זה הכי קרוב שמשחק מילים מגיע לתרגול של זמן תגובה.',
    href: '/he/brain/drills/lightning-round',
  },
  {
    skill: 'זיכרון עבודה',
    game: 'לזכור מילים ולמצוא אותן שוב',
    text: 'כמה מילים נדלקות על הלוח לכמה שניות ונעלמות. עכשיו מוצאים אותן מהזיכרון. מחזיקים מידע בראש וגם עושים איתו משהו, וזה בדיוק זיכרון עבודה.',
    href: '/he/brain/drills/memory-hunt',
  },
  {
    skill: 'ריכוז לאורך זמן',
    game: 'רצפים של מילים בלי טעות',
    text: 'בונים רצף של מילים נכונות, וטעות אחת שוברת אותו. המשחק לא מתגמל פרץ של מהירות אלא דיוק שנשמר לאורך הרבה תשובות ברצף.',
    href: '/he/brain/drills/combo-master',
  },
  {
    skill: 'אוצר מילים ושליפה',
    game: 'מילים נדירות ואנגרמות',
    text: 'מילה נפוצה שווה מעט, מילה נדירה שווה הרבה. באנגרמות מסדרים אותיות מחדש עד שמילה קופצת. שניהם מתרגלים את הגישה למילים שלא משתמשים בהן כל יום.',
    href: '/he/brain/drills/rare-gems',
  },
];

export const dailyPlan: { minutes: string; title: string; text: string; href: string }[] = [
  { minutes: 'דקה 0-1', title: 'חימום: מהירות', text: 'סיבוב אחד של 60 שניות במציאת מילים מהירה. לא מנסים לשבור שיא, רק להתעורר.', href: '/he/brain/drills/lightning-round' },
  { minutes: 'דקה 1-3', title: 'זיכרון', text: 'שני סיבובים של זכירת מילים. בסיבוב השני שימו לב אם הספקתם לזכור יותר.', href: '/he/brain/drills/memory-hunt' },
  { minutes: 'דקה 3-4', title: 'ריכוז', text: 'סיבוב אחד של רצפים. המטרה היא לא לטעות, לא להיות מהירים.', href: '/he/brain/drills/combo-master' },
  { minutes: 'דקה 4-6', title: 'המילה היומית', text: 'פאזל אחד ביום, אותו לוח לכל השחקנים. טוב לבנות הרגל קבוע.', href: '/he/daily' },
  { minutes: 'דקה 6-10', title: 'סיבוב עם אנשים', text: 'משחק מילים מרובה משתתפים מול חברים, משפחה או שחקנים אקראיים. התחרות שומרת על ריכוז בלי שתרגישו שאתם מתאמנים.', href: '/he/multiplayer' },
];

export const ageGroups: { who: string; text: string }[] = [
  {
    who: 'ילדים ונוער',
    text: 'התרגילים במרכז המוח מתאימים מגיל 12 בערך. לילדים צעירים יותר עדיף סיבוב משותף עם הורה או משחק בכיתה, שבו מבוגר בוחר את רמת המילים. סיבובים קצרים עובדים טוב יותר מסשן ארוך.',
  },
  {
    who: 'מבוגרים',
    text: '10 דקות בהפסקה או בדרך הביתה. הקושי בתרגילים מתאים את עצמו: עוברים רמה והוא עולה, נכשלים פעמיים ברצף והוא יורד. ככה המשחק נשאר מאתגר בלי לתסכל.',
  },
  {
    who: 'גיל הזהב',
    text: 'סיבוב של דקה אחת לא מעייף, ואפשר לעצור מתי שרוצים. אותיות גדולות ומשחק בדפדפן בלי התקנה עוזרים להתחיל. משחק מול הנכדים הופך את זה לזמן משותף. זה משחק, לא טיפול ולא בדיקה רפואית.',
  },
];

export const faqs: { q: string; a: string }[] = [
  {
    q: 'מה זה אימון קוגניטיבי?',
    a: 'אימון קוגניטיבי הוא תרגול קבוע של יכולות חשיבה מסוימות, כמו זיכרון עבודה, ריכוז, מהירות עיבוד ושליפת מילים, דרך משימות קצרות שחוזרים עליהן. משחקי שפה הם דרך נוחה לעשות את זה, כי הם משתמשים במילים שכבר מכירים ומוסיפים להן טיימר, ניקוד ורמות קושי.',
  },
  {
    q: 'האם משחקי מילים באמת משפרים תפקודים קוגניטיביים?',
    a: 'תשובה כנה: מתרגלים משתפרים במשימה שהם מתרגלים. האם השיפור עובר לחיי היום יום, כמו לזכור איפה שמתם את המפתחות, עדיין שנוי במחלוקת במחקר. ב-2016 ה-FTC קנס את Lumosity ב-2 מיליון דולר על הבטחות כאלה. אנחנו לא מבטיחים עלייה ב-IQ או שיפור זיכרון כללי. מה שכן: משחק קצר ומאתגר הוא דרך טובה להעסיק את הראש, ללמוד מילים ולבלות עם אנשים.',
  },
  {
    q: 'אילו משחקי שפה הכי טובים לאימון זיכרון?',
    a: 'משחקים שבהם צריך להחזיק מילים בראש ואז להשתמש בהן. ב-LexiClash זה תרגיל Memory Hunt: מילים נדלקות על הלוח לכמה שניות, נעלמות, ומוצאים אותן מהזיכרון. אנגרמות ומציאת מילים בלוח מתרגלות יותר מהירות ושליפה.',
  },
  {
    q: 'כמה זמן ביום כדאי לשחק?',
    a: '10 דקות מספיקות. עדיף לשחק קצת כל יום מאשר שעה פעם בשבוע. התוכנית בעמוד הזה בנויה מסיבובים של דקה, כך שאפשר לעצור בכל שלב.',
  },
  {
    q: 'אפשר לשחק בעברית וגם באנגלית?',
    a: 'כן. LexiClash עובד בעברית מימין לשמאל ובאנגלית, ושפת הלוח נקבעת לפי שפת האתר. רוצים לתרגל אנגלית? מחליפים שפה בתפריט ומשחקים על לוח באנגלית.',
  },
  {
    q: 'זה מתאים לגיל השלישי?',
    a: 'כן, כמשחק. סיבוב נמשך דקה, אין צורך בהרשמה או בהתקנה, ואפשר לשחק בטלפון, בטאבלט או במחשב. זה לא כלי רפואי ולא מחליף ייעוץ של רופא. מי שמודאג מהזיכרון שלו צריך לדבר עם רופא.',
  },
  {
    q: 'כמה זה עולה?',
    a: 'התרגילים במרכז המוח, המילה היומית ומשחק מרובה משתתפים פתוחים בחינם, בלי הרשמה ובלי הורדה. נכנסים מהדפדפן ומשחקים.',
  },
];

// All strings are hardcoded and contain no angle brackets, so the JSON can be
// emitted as <script> text children without escaping.
export function buildJsonLd(): Array<Record<string, unknown>> {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      '@id': `${CANONICAL}#article`,
      headline: 'משחקי שפה לאימון קוגניטיבי',
      description: META_DESCRIPTION,
      inLanguage: 'he',
      url: CANONICAL,
      mainEntityOfPage: CANONICAL,
      author: { '@type': 'Person', name: 'Ohad Fisher', url: `${BASE_URL}/en/about/ohad-fisher` },
      publisher: { '@type': 'Organization', name: 'LexiClash', url: BASE_URL },
      image: `${BASE_URL}/og-image-he.webp`,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      '@id': `${CANONICAL}#faq`,
      inLanguage: 'he',
      mainEntity: faqs.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      '@id': `${CANONICAL}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'דף הבית', item: `${BASE_URL}/he` },
        { '@type': 'ListItem', position: 2, name: 'אימון מוח', item: `${BASE_URL}/he/brain-training-word-games` },
        { '@type': 'ListItem', position: 3, name: 'משחקי שפה לאימון קוגניטיבי', item: CANONICAL },
      ],
    },
  ];
}
