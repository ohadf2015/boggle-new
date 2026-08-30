import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_PATH = '/lexiclash-vs-wordwall-kahoot-quizlet';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  // Body is Hebrew-only (RTL). Non-Hebrew routes exist only because of the [locale]
  // dynamic segment and render the same Hebrew content — a near-duplicate. Canonical
  // always points to /he; index only the Hebrew route. AdSense thin/dup sweep 2026-06-17.
  const isHebrew = locale === 'he';
  const pageUrl = `${BASE_URL}/he${PAGE_PATH}`;
  return {
    title: 'LexiClash מול Wordwall, Kahoot ו-Quizlet — משחקי מילים לכיתה בעברית | השוואה',
    description: 'השוואה כנה בין כלי משחקי המילים לכיתה: LexiClash, Wordwall, Kahoot ו-Quizlet. מה כל כלי עושה הכי טוב, ואיפה LexiClash שונה — משחק אוצר מילים חי בעברית, בלי חשבונות ובלי פרסומות.',
    keywords: 'LexiClash מול Wordwall, חלופה ל-Wordwall, Wordwall בעברית, חלופה ל-Quizlet, Kahoot בעברית, משחקי מילים לכיתה, השוואת משחקים לכיתה, כלים דיגיטליים למורים, משחק אוצר מילים בעברית',
    openGraph: {
      title: 'LexiClash מול Wordwall, Kahoot ו-Quizlet — השוואה כנה למורים',
      description: 'מה כל כלי עושה הכי טוב, ואיפה LexiClash שונה: משחק אוצר מילים חי בעברית, בלי חשבונות לתלמידים ובלי פרסומות.',
      locale: 'he_IL',
      type: 'website',
      url: pageUrl,
      images: [{ url: `${BASE_URL}/og-image-he.webp`, width: 1200, height: 630, alt: 'LexiClash מול Wordwall, Kahoot ו-Quizlet' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'LexiClash מול Wordwall, Kahoot ו-Quizlet',
      description: 'השוואה כנה למורים: משחקי מילים לכיתה בעברית. מה כל כלי עושה הכי טוב.',
      images: [`${BASE_URL}/og-image-he.webp`],
    },
    alternates: {
      canonical: pageUrl,
      languages: {
        'x-default': pageUrl,
        he: pageUrl,
        'he-IL': pageUrl,
      },
    },
    robots: { index: isHebrew, follow: true },
  };
}

// Honest comparison matrix. Mirrors the live ComparisonStrip on /education so the
// site never contradicts itself. LexiClash loses variety / printables / community
// on purpose — a balanced table is what AI engines cite.
type Tool = 'lexi' | 'wordwall' | 'kahoot' | 'quizlet';
const rows: { label: string; marks: Record<Tool, boolean> }[] = [
  { label: 'מנוע ילידי לחמש שפות (עברית RTL, יפנית IME)', marks: { lexi: true, wordwall: false, kahoot: false, quizlet: false } },
  { label: 'משחקי בניית-מילים לאוצר מילים', marks: { lexi: true, wordwall: false, kahoot: false, quizlet: false } },
  { label: 'משחק רב-משתתפים חי לכל הכיתה', marks: { lexi: true, wordwall: false, kahoot: true, quizlet: false } },
  { label: 'ללא חשבון לתלמיד — מצטרפים בקוד', marks: { lexi: true, wordwall: true, kahoot: true, quizlet: false } },
  { label: 'ללא פרסומות לתלמידים', marks: { lexi: true, wordwall: false, kahoot: false, quizlet: false } },
  { label: 'אימוני מוח וקוגניציה', marks: { lexi: true, wordwall: false, kahoot: false, quizlet: false } },
  { label: 'חינם מלא למורים', marks: { lexi: true, wordwall: false, kahoot: false, quizlet: false } },
  { label: 'מגוון רחב של תבניות פעילות', marks: { lexi: false, wordwall: true, kahoot: false, quizlet: false } },
  { label: 'דפי עבודה להדפסה', marks: { lexi: false, wordwall: true, kahoot: false, quizlet: false } },
  { label: 'ספריית תוכן קהילתית ענקית', marks: { lexi: false, wordwall: true, kahoot: true, quizlet: true } },
];

const cols: { key: Tool; name: string; highlight?: boolean }[] = [
  { key: 'lexi', name: 'LexiClash', highlight: true },
  { key: 'wordwall', name: 'Wordwall' },
  { key: 'kahoot', name: 'Kahoot' },
  { key: 'quizlet', name: 'Quizlet' },
];

const verdicts = [
  { name: 'LexiClash', accent: 'bg-neo-lime', when: 'כשרוצים משחק אוצר מילים תחרותי וחי לכל הכיתה — בעברית מלאה (RTL), בלי חשבונות לתלמידים ובלי פרסומות. מעלים רשימת מילים משלכם ומשחקים תוך דקה, בלי הכנה.' },
  { name: 'Wordwall', accent: 'bg-neo-cyan', when: 'כשצריך מגוון רחב של תבניות פעילות (התאמה, גרירה, חיפוש מילים) או דפי עבודה להדפסה. ספריית הקהילה עצומה — אבל את כל משחק בונים לבד מראש.' },
  { name: 'Kahoot', accent: 'bg-neo-pink', when: 'כשרוצים אנרגיית "שעשועון" מהירה לחזרה בשאלות רב-ברירה. מוכר, קליל ומלא חיים — אבל המיקוד הוא בחידון, לא במשחק בניית מילים לאוצר מילים.' },
  { name: 'Quizlet', accent: 'bg-neo-purple', when: 'כשצריך ספריית כרטיסיות אדירה ולמידה עצמית לקראת מבחן. חזק לשינון אישי — אבל Quizlet Live דורש חשבונות, והגרסה החינמית כוללת פרסומות.' },
];

const faqs = [
  { q: 'מה ההבדל בין LexiClash ל-Wordwall?', a: 'Wordwall הוא בונה-פעילויות: המורה בונה משחק מתבנית (התאמה, גרירה, חיפוש מילים) ומשתף אותו. LexiClash הוא משחק אוצר מילים מוכן לשחק: מעלים רשימת מילים וכל הכיתה משחקת יחד בזמן אמת, בלי הכנה. Wordwall מנצח במגוון התבניות ובדפי העבודה להדפסה; LexiClash מנצח במשחק התחרותי החי, בעברית מלאה ובלי חשבונות לתלמידים.' },
  { q: 'LexiClash או Kahoot — מה עדיף לאוצר מילים?', a: 'Kahoot מצוין לחזרה מהירה בשאלות רב-ברירה ולאנרגיית שעשועון, אבל הוא חידון — לא משחק בניית מילים. LexiClash בנוי סביב אוצר מילים: התלמידים מרכיבים מילים על לוח אותיות, גלגל או אנגרמה, וכך מתאמנים על איות, שליפה וזיהוי דפוסים — לא רק על בחירת תשובה מוכנה. שניהם חינמיים לפתיחה ושניהם בלי חשבון לתלמיד.' },
  { q: 'יש חלופה ל-Quizlet בעברית בלי חשבונות לתלמידים?', a: 'כן. Quizlet Live דורש שהתלמידים יפתחו חשבונות, והגרסה החינמית כוללת פרסומות. ב-LexiClash התלמידים מצטרפים בקוד בן 6 תווים בלי הרשמה ובלי פרסומות, ומשחקים משחק אוצר מילים חי במקום כרטיסיות. רשימת מילים קיימת אפשר פשוט להדביק לייבוא מהיר.' },
  { q: 'מה הכלי הכי טוב למשחקי אוצר מילים לכיתה בעברית?', a: 'אין כלי אחד שמנצח בהכול. ל-LexiClash היתרון כשרוצים משחק אוצר מילים תחרותי וחי לכל הכיתה בעברית מלאה (RTL), בלי חשבונות לתלמידים ובלי פרסומות. Wordwall עדיף למגוון תבניות ולדפי עבודה להדפסה, Kahoot לחזרה בשאלות רב-ברירה, ו-Quizlet לשינון עצמי עם ספריית כרטיסיות גדולה.' },
  { q: 'האם LexiClash בחינם?', a: 'כן. המשחק הכיתתי, הדו-קרבות ולוח הבקרה למורה חינמיים למורים, בלי פרסומות לתלמידים. מעלים רשימת מילים משלכם ומתחילים — בלי הורדה ובלי כרטיס אשראי.' },
  { q: 'צריך להתקין אפליקציה או לפתוח חשבונות?', a: 'לא. LexiClash עובד בכל דפדפן — מחשב, טאבלט או טלפון. המורה פותח חשבון חינם; התלמידים מצטרפים בקוד בלי הרשמה ובלי הורדה.' },
];

export default async function Page({ params }: PageProps) {
  const { locale } = await params;

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${BASE_URL}/he${PAGE_PATH}#faq`,
    inLanguage: 'he',
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'בית', item: `${BASE_URL}/${locale}` },
      { '@type': 'ListItem', position: 2, name: 'חינוך', item: `${BASE_URL}/${locale}/education` },
      { '@type': 'ListItem', position: 3, name: 'השוואה: LexiClash מול Wordwall, Kahoot ו-Quizlet', item: `${BASE_URL}/${locale}${PAGE_PATH}` },
    ],
  };

  const cell = (on: boolean) =>
    on ? (
      <span className="grid h-7 w-7 place-items-center rounded border-2 border-neo-black bg-neo-lime font-black text-neo-navy shadow-hard-sm" aria-label="כן">✓</span>
    ) : (
      <span className="grid h-7 w-7 place-items-center rounded border-2 border-neo-black/30 text-lg text-neo-gray-200/40" aria-label="לא">—</span>
    );

  return (
    <main dir="rtl" className="relative min-h-screen overflow-x-hidden bg-neo-navy text-neo-white texture-halftone">
      <Script id="ld-he-vs-faq" type="application/ld+json">{JSON.stringify(faqJsonLd)}</Script>
      <Script id="ld-he-vs-breadcrumb" type="application/ld+json">{JSON.stringify(breadcrumbJsonLd)}</Script>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">

        <section className="max-w-3xl">
          <span className="inline-block rotate-[-3deg] rounded-neo border-3 border-neo-black bg-neo-yellow px-3 py-1 font-neo-display text-xs font-black uppercase tracking-widest text-neo-navy shadow-hard">
            ★ השוואה כנה · למורים ★
          </span>
          <h1 className="mt-5 font-neo-display text-4xl font-black leading-[0.95] tracking-tight sm:text-5xl lg:text-6xl">
            LexiClash מול <span className="inline-block rotate-[-2deg] bg-neo-cyan px-3 text-neo-navy shadow-hard">Wordwall</span>, Kahoot ו-Quizlet
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-neo-gray-200 sm:text-xl">
            כל הכלים האלה טובים — אבל לכל אחד נקודת חוזק אחרת. הנה השוואה כנה למורים שמחפשים <strong className="text-neo-white">משחקי מילים לכיתה בעברית</strong>: מה כל כלי עושה הכי טוב, ואיפה LexiClash שונה — משחק אוצר מילים חי, בעברית מלאה, בלי חשבונות לתלמידים ובלי פרסומות.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
            <Link href={`/${locale}/education/classroom-game`} className="rounded-neo border-4 border-neo-black bg-neo-yellow px-7 py-4 text-center font-neo-display font-black uppercase tracking-wider text-neo-navy shadow-hard-lg transition-all hover:translate-x-1 hover:-translate-y-1 hover:shadow-hard-xl">
              <span className="block text-base sm:text-lg">▶ התחילו משחק כיתתי</span>
              <span className="block text-[10px] font-bold uppercase tracking-widest opacity-70">חינם · ללא הרשמה לתלמידים</span>
            </Link>
            <Link href={`/${locale}/hebrew-classroom-vocabulary-games`} className="rounded-neo border-4 border-neo-black bg-neo-navy-light px-7 py-4 text-center font-neo-display font-black uppercase tracking-wider text-neo-white shadow-hard transition-all hover:translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg">
              מדריך משחקי המילים לכיתה →
            </Link>
          </div>
        </section>

        <section className="mt-16 sm:mt-20">
          <h2 className="mb-6 font-neo-display text-3xl font-black uppercase sm:text-4xl">
            טבלת <span className="text-neo-lime">השוואה</span>.
          </h2>
          <div className="overflow-x-auto rounded-neo border-3 border-neo-black bg-neo-navy-light shadow-hard">
            <table className="w-full min-w-[560px] border-collapse text-right">
              <thead>
                <tr className="border-b-3 border-neo-black">
                  <th className="p-4 text-sm font-black sm:text-base" scope="col"> </th>
                  {cols.map((c) => (
                    <th key={c.key} scope="col" className={`p-3 text-center font-neo-display text-sm font-black sm:text-base ${c.highlight ? 'bg-neo-lime/15 text-neo-lime' : ''}`}>
                      {c.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.label} className={i % 2 ? 'bg-neo-navy/30' : ''}>
                    <th scope="row" className="p-4 text-sm font-bold sm:text-base">{r.label}</th>
                    {cols.map((c) => (
                      <td key={c.key} className={`p-3 ${c.highlight ? 'bg-neo-lime/10' : ''}`}>
                        <span className="flex justify-center">{cell(r.marks[c.key])}</span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-neo-gray-200/70">נכון ליוני 2026. כלים מתעדכנים — שווה לבדוק את האתר של כל מוצר.</p>
        </section>

        <section className="mt-16 sm:mt-20">
          <h2 className="mb-8 font-neo-display text-3xl font-black uppercase sm:text-4xl">
            מתי לבחור <span className="text-neo-cyan">כל כלי</span>.
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {verdicts.map((v) => (
              <div key={v.name} className="rounded-neo border-3 border-neo-black bg-neo-navy-light p-5 shadow-hard">
                <span className={`inline-block rounded border-2 border-neo-black ${v.accent} px-3 py-1 font-neo-display text-sm font-black text-neo-navy`}>{v.name}</span>
                <p className="mt-3 text-sm leading-relaxed text-neo-gray-200 sm:text-base">{v.when}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 sm:mt-20">
          <h2 className="mb-6 font-neo-display text-3xl font-black uppercase sm:text-4xl">
            שאלות <span className="text-neo-cyan">נפוצות</span>.
          </h2>
          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <details key={`faq-${idx}`} className="group rounded-neo border-3 border-neo-black bg-neo-navy-light shadow-hard transition-all open:shadow-hard-lg">
                <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-neo-display font-black uppercase tracking-wide sm:px-6">
                  <span>{faq.q}</span>
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded border-2 border-neo-black bg-neo-yellow text-neo-navy transition-transform group-open:rotate-45">+</span>
                </summary>
                <div className="border-t-3 border-neo-black bg-neo-navy/40 px-5 py-4 text-sm text-neo-gray-200 sm:px-6 sm:text-base">{faq.a}</div>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-16 mb-12 rounded-neo border-4 border-neo-black bg-neo-lime p-8 text-neo-navy shadow-hard-xl sm:mt-20 sm:p-12">
          <h2 className="font-neo-display text-3xl font-black leading-[0.95] sm:text-4xl">
            הדרך היחידה לדעת — לשחק סיבוב אחד.
          </h2>
          <p className="mt-4 max-w-xl text-base font-bold sm:text-lg">בוחרים רשימת מילים, מציגים קוד לכיתה, ומשחקים. חמש דקות, בלי הרשמה לתלמידים.</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href={`/${locale}/education/classroom-game`} className="rounded-neo border-4 border-neo-black bg-neo-navy px-7 py-4 text-center font-neo-display text-base font-black uppercase tracking-wider text-neo-lime shadow-hard-lg transition-all hover:translate-x-1 hover:-translate-y-1 hover:shadow-hard-xl sm:text-lg">
              ▶ התחילו משחק כיתתי
            </Link>
            <Link href={`/${locale}/education`} className="rounded-neo border-4 border-neo-black bg-neo-navy-light px-7 py-4 text-center font-neo-display text-base font-black uppercase tracking-wider text-neo-white shadow-hard transition-all hover:translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg sm:text-lg">
              למרכז החינוך
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
