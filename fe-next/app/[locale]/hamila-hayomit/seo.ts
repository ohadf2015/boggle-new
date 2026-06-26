// SEO data + JSON-LD for /he/hamila-hayomit. Extracted from page.tsx because a
// webpack prod build rejects non-Next named exports from a page file. Imported by
// the page (generateMetadata + render) and unit-tested directly.

export const BASE_URL = 'https://www.lexiclash.live';
export const CANONICAL = `${BASE_URL}/he/hamila-hayomit`;
export const DAILY_URL = `${BASE_URL}/he/daily`;

// Native Hebrew FAQ — exported so the GEO/AI-citation gap is test-enforceable.
export const dailyWordHeFaqs: { q: string; a: string }[] = [
  {
    q: 'מה זה "המילה היומית"?',
    a: 'המילה היומית היא פאזל מילים יומי וחינמי: כל יום נחשף לוח חדש, וכל השחקנים בעולם מקבלים בדיוק את אותה מילת היום לפצח. ב-LexiClash יש שתי גרסאות יומיות — ציד המילים וגלגל המילים — שמתחדשות בכל בוקר.',
  },
  {
    q: 'מתי מתאפסת המילה היומית?',
    a: 'מילה יומית חדשה נוצרת כל יום בחצות לפי שעון UTC. ההתקדמות מתאפסת וטבלת מובילים חדשה מתחילה, כך שכולם מתחילים מאותה נקודה ביום חדש.',
  },
  {
    q: 'איך משחקים את המילה היומית של LexiClash?',
    a: 'נכנסים לעמוד האתגר היומי, בוחרים בין ציד המילים לגלגל המילים, ומנסים לפצח את מילת היום במספר הניסיונות המותר. אין צורך בחשבון — פשוט נכנסים ומשחקים ישר מהדפדפן.',
  },
  {
    q: 'האם המילה היומית בחינם?',
    a: 'כן, לגמרי חינם. אין הרשמה, אין הורדה ואין תשלום — נכנסים מהדפדפן בנייד או במחשב ומתחילים מיד.',
  },
  {
    q: 'אפשר לשתף את התוצאות?',
    a: 'בהחלט. בסיום הפאזל לוחצים על כפתור השיתוף ומעתיקים סיכום אמוג\'י של הביצועים — אפשר לשתף ברשתות ובאפליקציות הודעות בלי לחשוף את הפתרון, בדיוק כמו בוורדל.',
  },
  {
    q: 'מה ההבדל בין ציד המילים לגלגל המילים?',
    a: 'בציד המילים מקבלים 10 ניסיונות לאתר מילה נסתרת על הלוח — שילוב של וורדל ובוגל. בגלגל המילים מרכיבים כמה שיותר מילים מאוסף אותיות שמסודרות בגלגל, כשכל מילה חייבת לכלול את האות המרכזית, ומילים ארוכות שוות יותר נקודות.',
  },
];

/**
 * Pure JSON-LD builder. All strings are hardcoded literals (no user input) and
 * contain no angle brackets, so the array can be embedded as React <script> text
 * children without escaping. Exported so the structured-data contract (FAQPage +
 * DefinedTerm + Breadcrumb + WebApplication) is unit-testable.
 */
export function buildHamilaHayomitJsonLd(): Array<Record<string, unknown>> {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'DefinedTerm',
      '@id': `${CANONICAL}#term`,
      name: 'המילה היומית',
      description:
        'המילה היומית (מילת היום) היא פאזל מילים יומי שבו כל השחקנים בעולם מקבלים את אותו לוח ואותה מילה לפצח, עם איפוס וטבלת מובילים חדשה בכל יום. ב-LexiClash מופיעה כציד מילים וכגלגל מילים.',
      inDefinedTermSet: `${BASE_URL}/he`,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      '@id': `${CANONICAL}#app`,
      name: 'המילה היומית — LexiClash',
      url: DAILY_URL,
      applicationCategory: 'GameApplication',
      operatingSystem: 'Web',
      inLanguage: 'he',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'ILS' },
      description:
        'פאזל המילה היומית של LexiClash — מילת היום חינמית, אותו לוח לכל העולם, ציד מילים וגלגל מילים, שיתוף תוצאות וטבלת מובילים יומית.',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      '@id': `${CANONICAL}#faq`,
      mainEntity: dailyWordHeFaqs.map((f) => ({
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
        { '@type': 'ListItem', position: 2, name: 'המילה היומית', item: CANONICAL },
      ],
    },
  ];
}
