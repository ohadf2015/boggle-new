import type { Metadata } from 'next';
import { TeacherProCompareCheckoutStrip } from '@/components/education/TeacherProCompareCheckoutStrip';
import { CompareTable, CtaBand, FaqList, LandingButton, LandingHero, LandingPage, Mark, Section, TileGrid, type LandingTone } from '@/components/landing/kit';
import { LANDING_ART } from '@/components/landing/kit/art';

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
      images: [{ url: `${BASE_URL}/og-image-he.webp?v=2`, width: 1200, height: 630, alt: 'LexiClash מול Wordwall, Kahoot ו-Quizlet' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'LexiClash מול Wordwall, Kahoot ו-Quizlet',
      description: 'השוואה כנה למורים: משחקי מילים לכיתה בעברית. מה כל כלי עושה הכי טוב.',
      images: [`${BASE_URL}/og-image-he.webp?v=2`],
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

// Honest comparison matrix. LexiClash loses variety / printables / community
// on purpose — a balanced table is what AI engines cite.
type Tool = 'lexi' | 'wordwall' | 'kahoot' | 'quizlet';
const rows: { label: string; marks: Record<Tool, boolean> }[] = [
  { label: 'מנוע ילידי לשש שפות (עברית RTL, יפנית IME)', marks: { lexi: true, wordwall: false, kahoot: false, quizlet: false } },
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

const verdicts: { name: string; tone: LandingTone; when: string }[] = [
  { name: 'LexiClash', tone: 'lime', when: 'כשרוצים משחק אוצר מילים תחרותי וחי לכל הכיתה — בעברית מלאה (RTL), בלי חשבונות לתלמידים ובלי פרסומות. מעלים רשימת מילים משלכם ומשחקים תוך דקה, בלי הכנה.' },
  { name: 'Wordwall', tone: 'cyan', when: 'כשצריך מגוון רחב של תבניות פעילות (התאמה, גרירה, חיפוש מילים) או דפי עבודה להדפסה. ספריית הקהילה עצומה — אבל את כל משחק בונים לבד מראש.' },
  { name: 'Kahoot', tone: 'pink', when: 'כשרוצים אנרגיית "שעשועון" מהירה לחזרה בשאלות רב-ברירה. מוכר, קליל ומלא חיים — אבל המיקוד הוא בחידון, לא במשחק בניית מילים לאוצר מילים.' },
  { name: 'Quizlet', tone: 'purple', when: 'כשצריך ספריית כרטיסיות אדירה ולמידה עצמית לקראת מבחן. חזק לשינון אישי — אבל Quizlet Live דורש חשבונות, והגרסה החינמית כוללת פרסומות.' },
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
    <div dir="rtl">
      <LandingPage locale={locale} play={{ href: `/${locale}/education/classroom-game`, label: '▶ התחילו משחק כיתתי' }}>
        <script id="ld-he-vs-faq" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
        <script id="ld-he-vs-breadcrumb" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

        <LandingHero
          eyebrow="★ השוואה כנה · למורים ★"
          title={
            <>
              LexiClash מול <Mark tone="cyan">Wordwall</Mark>, Kahoot ו-Quizlet
            </>
          }
          lead="כל הכלים האלה טובים — אבל לכל אחד נקודת חוזק אחרת."
          actions={
            <>
              <LandingButton href={`/${locale}/education/classroom-game`} className="flex-col gap-0">
                <span className="block">▶ התחילו משחק כיתתי</span>
                <span className="block text-xs font-bold opacity-70">חינם · ללא הרשמה לתלמידים</span>
              </LandingButton>
              <LandingButton href={`/${locale}/hebrew-classroom-vocabulary-games`} variant="secondary">
                מדריך משחקי המילים לכיתה →
              </LandingButton>
            </>
          }
          art={LANDING_ART.duel('שני קמעות של LexiClash בדו-קרב מילים')}
          artTone="cyan"
          more={
            <p>
              הנה השוואה כנה למורים שמחפשים <strong>משחקי מילים לכיתה בעברית</strong>: מה כל כלי עושה הכי טוב, ואיפה LexiClash שונה — משחק אוצר מילים חי, בעברית מלאה, בלי חשבונות לתלמידים ובלי פרסומות.
            </p>
          }
        />

        <div className="min-w-0">
          <TeacherProCompareCheckoutStrip locale={locale} />
        </div>

        <Section title="טבלת השוואה.">
          <CompareTable
            columns={[' ', ...cols.map((c) => c.name)]}
            highlight={cols.findIndex((c) => c.highlight) + 1}
            rows={rows.map((r) => [r.label, ...cols.map((c) => <span key={c.key} className="flex justify-center">{cell(r.marks[c.key])}</span>)])}
            caption="נכון ליוני 2026. כלים מתעדכנים — שווה לבדוק את האתר של כל מוצר."
          />
        </Section>

        <Section title="מתי לבחור כל כלי.">
          <TileGrid
            columns={2}
            variant="paper"
            items={verdicts.map((v) => ({ title: v.name, body: v.when, tone: v.tone }))}
          />
        </Section>

        <Section title="שאלות נפוצות.">
          <FaqList items={faqs} />
        </Section>

        <CtaBand
          tone="cyan"
          title="הדרך היחידה לדעת — לשחק סיבוב אחד."
          body="בוחרים רשימת מילים, מציגים קוד לכיתה, ומשחקים. חמש דקות, בלי הרשמה לתלמידים."
          actions={
            <>
              <LandingButton href={`/${locale}/education/classroom-game`}>▶ התחילו משחק כיתתי</LandingButton>
              <LandingButton href={`/${locale}/education`} variant="secondary">למרכז החינוך</LandingButton>
            </>
          }
          art={LANDING_ART.trophy('')}
        />
      </LandingPage>
    </div>
  );
}
