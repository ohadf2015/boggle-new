import type { Metadata } from 'next';
import Link from 'next/link';
import { TopBackLink } from '@/components/navigation/TopBackLink';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isTargetLocale = locale === 'he';
  const pageUrl = `${BASE_URL}/he/lexiclash-neged-wordle`;

  return {
    title: 'לקסיקלאש נגד וורדל - מה עדיף? השוואה מלאה של משחקי מילים | LexiClash',
    description:
      'וורדל זה כיף, אבל לקסיקלאש לוקח את זה הרבה יותר רחוק. מרובה משתתפים, אתגרים יומיים, מצב Blast, קרבות בוסים ו-10,000+ מילים בעברית. השוואה מלאה בפנים!',
    keywords:
      'לקסיקלאש נגד וורדל, wordle בעברית, משחק מילים בעברית, חלופה לוורדל, משחק מילים אונליין, בוגל אונליין, משחק מילים מרובה משתתפים',
    openGraph: {
      title: 'לקסיקלאש נגד וורדל - איזה משחק מילים עדיף?',
      description:
        'וורדל = מילה אחת ביום. לקסיקלאש = אינסוף מילים, מרובה משתתפים, אתגרים יומיים, מצב Blast ועוד. השוואה מלאה!',
      locale: 'he_IL',
      type: 'website',
      url: pageUrl,
      images: [
        {
          url: `${BASE_URL}/og-image-he.webp`,
          width: 1200,
          height: 630,
          alt: 'לקסיקלאש נגד וורדל - השוואת משחקי מילים',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'לקסיקלאש נגד וורדל - מה עדיף?',
      description:
        'וורדל = מילה אחת ביום. לקסיקלאש = אינסוף, מרובה משתתפים, עברית מלאה. השוואה בפנים!',
      images: [`${BASE_URL}/og-image-he.webp`],
    },
    alternates: {
      canonical: pageUrl,
      languages: {
        'x-default': `${BASE_URL}/en/lexiclash-vs-wordle`,
        en: `${BASE_URL}/en/lexiclash-vs-wordle`,
        he: `${BASE_URL}/he/lexiclash-neged-wordle`,
        sv: `${BASE_URL}/sv/swedish-multiplayer-word-game`,
        ja: `${BASE_URL}/ja/japanese-word-game`,
        es: `${BASE_URL}/es/lexiclash-contra-wordle`,
        'he-IL': `${BASE_URL}/he/lexiclash-neged-wordle`,
        'en-US': `${BASE_URL}/en/lexiclash-vs-wordle`,
        'en-GB': `${BASE_URL}/en/lexiclash-vs-wordle`,
        'en-IL': `${BASE_URL}/en/lexiclash-vs-wordle`,
        'sv-SE': `${BASE_URL}/sv/swedish-multiplayer-word-game`,
        'ja-JP': `${BASE_URL}/ja/japanese-word-game`,
        'es-ES': `${BASE_URL}/es/lexiclash-contra-wordle`,
        'es-MX': `${BASE_URL}/es/lexiclash-contra-wordle`,
        'es-US': `${BASE_URL}/es/lexiclash-contra-wordle`,
        'es-AR': `${BASE_URL}/es/lexiclash-contra-wordle`,
        'es-CO': `${BASE_URL}/es/lexiclash-contra-wordle`,
      },
    },
    robots: { index: true, follow: true },
  };
}

export default async function LexiClashVsWordlePage({ params }: PageProps) {
  const { locale } = await params;
  const isTargetLocale = locale === 'he';

  // Static FAQ data — all hardcoded strings, safe for dangerouslySetInnerHTML (no user input)
  const faqs = [
    {
      q: 'מה ההבדל בין לקסיקלאש לוורדל?',
      a: 'וורדל נותן לכם מילה אחת ליום עם 6 ניחושים. לקסיקלאש הוא משחק מילים מלא עם מצבים מרובים — שחקו כמה שרוצים, מתי שרוצים, לבד או עם חברים בזמן אמת.',
    },
    {
      q: 'האם אפשר לשחק לקסיקלאש בעברית?',
      a: 'בהחלט! לקסיקלאש תומך בעברית מלאה עם מילון של 10,000+ מילים. גם הממשק וגם המילים בעברית, כולל תמיכה ב-RTL מושלמת.',
    },
    {
      q: 'האם לקסיקלאש חינם?',
      a: 'כן, לגמרי חינם. אין תשלומים נסתרים, אין הורדה, אין הרשמה חובה. פשוט נכנסים ומשחקים.',
    },
    {
      q: 'אילו מצבי משחק יש בלקסיקלאש שאין בוורדל?',
      a: 'לקסיקלאש כולל מרובה משתתפים בזמן אמת, אתגר יומי, מצב Blast עם קומבואים, ציד מילים, קרבות בוסים ומצב הרפתקה עם עולמות ושדרוגים. וורדל מציע רק ניחוש מילה אחת ביום.',
    },
    {
      q: 'אפשר לשחק לקסיקלאש עם חברים?',
      a: 'ברור! צרו חדר פרטי, שלחו לינק לחברים, והתחרו בזמן אמת. אפשר גם לשחק אקראי נגד שחקנים מכל העולם.',
    },
  ];

  const comparisonRows = [
    { feature: 'מילים ביום', wordle: 'מילה אחת', lexiclash: 'אינסוף' },
    { feature: 'מרובה משתתפים', wordle: 'אין', lexiclash: 'זמן אמת עם חברים' },
    { feature: 'עברית', wordle: 'אנגלית בלבד', lexiclash: 'עברית + 4 שפות' },
    { feature: 'מצבי משחק', wordle: 'ניחוש מילה', lexiclash: '6+ מצבים (Blast, ציד, בוס, הרפתקה...)' },
    { feature: 'אתגר יומי', wordle: 'יש', lexiclash: 'יש + דירוגים ופרסים' },
    { feature: 'קרבות בוסים', wordle: 'אין', lexiclash: 'יש! עם טוויסטים ייחודיים' },
    { feature: 'מילון', wordle: '~2,300 מילים', lexiclash: '10,000+ מילים בעברית' },
    { feature: 'מחיר', wordle: 'חינם', lexiclash: 'חינם' },
  ];

  return (
    <main className="min-h-screen bg-neo-navy text-neo-white" dir="rtl">
      {/* Static JSON-LD content — all hardcoded strings, safe for dangerouslySetInnerHTML */}
      <script
        type="application/ld+json"
         
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqs.map((faq) => ({
              '@type': 'Question',
              name: faq.q,
              acceptedAnswer: {
                '@type': 'Answer',
                text: faq.a,
              },
            })),
          }),
        }}
      />

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <TopBackLink className="mb-4" />
        <h1 className="mb-6 font-neo-display text-4xl font-bold leading-tight sm:text-5xl">
          לקסיקלאש נגד וורדל - איזה משחק מילים באמת שווה את הזמן שלכם?
        </h1>

        <p className="mb-8 text-lg leading-relaxed text-neo-gray-200">
          אוקיי, בואו נהיה כנים - וורדל הוא משחק מעולה. המילה היומית הזו ממכרת, והריגוש של לפתור ב-3 ניחושים
          הוא אמיתי. אבל מה קורה אחרי שסיימתם את המילה של היום? אתם סוגרים את הטאב וממתינים 24 שעות.
          בלקסיקלאש? אתם רק מתחילים. מרובה משתתפים, קרבות בוסים, מצב Blast עם קומבואים מטורפים, והכי
          חשוב - הכל בעברית מלאה. בואו נעשה את ההשוואה.
        </p>

        {/* Comparison Table */}
        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">
            טבלת השוואה: לקסיקלאש מול וורדל
          </h2>
          <div className="overflow-x-auto rounded-neo border-3 border-neo-lime shadow-hard">
            <table className="w-full text-right">
              <thead>
                <tr className="border-b-3 border-neo-lime bg-neo-lime/10">
                  <th className="px-4 py-3 font-bold text-neo-lime">תכונה</th>
                  <th className="px-4 py-3 font-bold text-neo-gray-200">וורדל</th>
                  <th className="px-4 py-3 font-bold text-neo-cyan">לקסיקלאש</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, idx) => (
                  <tr
                    key={row.feature}
                    className={`border-b border-neo-gray-400/30 ${idx % 2 === 0 ? 'bg-neo-navy/50' : ''}`}
                  >
                    <td className="px-4 py-3 font-bold">{row.feature}</td>
                    <td className="px-4 py-3 text-neo-gray-200">{row.wordle}</td>
                    <td className="px-4 py-3 text-neo-cyan">{row.lexiclash}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Why LexiClash */}
        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">
            אז למה לעבור מוורדל ללקסיקלאש?
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-neo border-3 border-neo-lime bg-neo-navy/50 p-5 shadow-hard">
              <h3 className="mb-2 font-bold text-neo-lime">אינסוף משחקים</h3>
              <p className="text-sm text-neo-gray-200">
                לא צריך לחכות ליום הבא. שחקו כמה שרוצים, מתי שרוצים.
              </p>
            </div>
            <div className="rounded-neo border-3 border-neo-pink bg-neo-navy/50 p-5 shadow-hard">
              <h3 className="mb-2 font-bold text-neo-pink">משחק עם חברים</h3>
              <p className="text-sm text-neo-gray-200">
                צרו חדר, שלחו לינק, ותתחרו בזמן אמת. וורדל לא מאפשר את זה.
              </p>
            </div>
            <div className="rounded-neo border-3 border-neo-cyan bg-neo-navy/50 p-5 shadow-hard">
              <h3 className="mb-2 font-bold text-neo-cyan">עברית אמיתית</h3>
              <p className="text-sm text-neo-gray-200">
                10,000+ מילים בעברית, ממשק בעברית מלאה, ותמיכה מושלמת ב-RTL.
              </p>
            </div>
            <div className="rounded-neo border-3 border-neo-pink bg-neo-navy/50 p-5 shadow-hard">
              <h3 className="mb-2 font-bold text-neo-pink">מגוון מצבים</h3>
              <p className="text-sm text-neo-gray-200">
                Blast, ציד מילים, קרבות בוסים, הרפתקה, אתגר יומי - משעמם פה? בלתי אפשרי.
              </p>
            </div>
            <div className="rounded-neo border-3 border-neo-lime bg-neo-navy/50 p-5 shadow-hard">
              <h3 className="mb-2 font-bold text-neo-lime">קומבואים ובוסים</h3>
              <p className="text-sm text-neo-gray-200">
                מצאו מילים ברצף ותרגישו את הקומבו עולה. קרבות בוסים עם טוויסטים מפתיעים.
              </p>
            </div>
            <div className="rounded-neo border-3 border-neo-cyan bg-neo-navy/50 p-5 shadow-hard">
              <h3 className="mb-2 font-bold text-neo-cyan">דירוגים ופרסים</h3>
              <p className="text-sm text-neo-gray-200">
                לוח תוצאות גלובלי, הישגים, ואתגרים יומיים עם פרסים בלעדיים.
              </p>
            </div>
          </div>
        </section>

        {/* Detailed comparison prose */}
        <section className="mb-12">
          <h2 className="mb-4 font-neo-display text-2xl font-bold sm:text-3xl">
            וורדל מעולה - אבל לקסיקלאש זה משחק מילים שלם
          </h2>
          <p className="mt-4 text-neo-gray-200">
            וורדל הצליח לעשות משהו גאוני: הוא הפך משחק מילים פשוט לתופעת אינטרנט. המגבלה של מילה אחת ביום
            יוצרת מחויבות יומית ותחושת FOMO שגורמת לאנשים לחזור. אין ספק שזה עובד.
          </p>
          <p className="mt-4 text-neo-gray-200">
            אבל מה אם אתם רוצים יותר? מה אם סיימתם את המילה בשתי דקות ואתם רוצים להמשיך? מה אם אתם
            רוצים לשחק עם חברים ולא רק לשתף ריבועים ירוקים בוואטסאפ? וגם - מה עם עברית? וורדל עובד רק
            באנגלית (ובכמה שיבוטים לא רשמיים).
          </p>
          <p className="mt-4 text-neo-gray-200">
            לקסיקלאש לוקח את הרעיון הבסיסי של &quot;מצא מילים ותרגיש גאון&quot; ומרחיב אותו לכל כיוון.
            רוצים להתחרות בזמן אמת? יש. רוצים אתגר יומי עם דירוג? יש. רוצים מצב Blast עם קומבואים
            שגורמים למסך לרעוד? בהחלט יש. רוצים לשחק בעברית עם מילון של 10,000+ מילים? ברור שיש.
          </p>
        </section>

        {/* CTA Section */}
        <section className="mb-12 flex flex-col gap-3 sm:flex-row-reverse sm:gap-4">
          <Link
            href={`/${locale}/singleplayer`}
            className="rounded-neo border-4 border-neo-lime bg-neo-lime px-6 py-3 text-center font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg sm:px-8 sm:py-4"
          >
            שחקו עכשיו - בחינם!
          </Link>
          <Link
            href={`/${locale}/daily`}
            className="rounded-neo border-4 border-neo-pink bg-transparent px-6 py-3 text-center font-bold text-neo-pink shadow-hard transition-all hover:bg-neo-pink/10 sm:px-8 sm:py-4"
          >
            אתגר יומי
          </Link>
          <Link
            href={`/${locale}/multiplayer`}
            className="rounded-neo border-4 border-neo-cyan bg-transparent px-6 py-3 text-center font-bold text-neo-cyan shadow-hard transition-all hover:bg-neo-cyan/10 sm:px-8 sm:py-4"
          >
            מרובה משתתפים
          </Link>
        </section>

        {/* FAQ */}
        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">שאלות נפוצות</h2>
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <details
                key={`faq-${idx}-${faq.q}`}
                className="group rounded-neo border-3 border-neo-gray-400 bg-neo-navy/50 shadow-hard"
              >
                <summary className="flex cursor-pointer items-center justify-between px-6 py-4 font-bold">
                  <span className="text-neo-lime transition-transform group-open:rotate-180">▼</span>
                  <span>{faq.q}</span>
                </summary>
                <div className="border-t border-neo-gray-400 px-6 py-4 text-neo-gray-200">{faq.a}</div>
              </details>
            ))}
          </div>
        </section>

        {/* Cross-link */}
        <section className="mb-12 rounded-neo border-3 border-neo-pink bg-neo-navy/50 p-6 shadow-hard">
          <h2 className="mb-3 font-neo-display text-xl font-bold sm:text-2xl">
            רוצים לדעת עוד על משחקי מילים בעברית?
          </h2>
          <p className="mb-4 text-neo-gray-200">
            קראו את המדריך המלא שלנו למשחקי מילים מרובי משתתפים בעברית - כולל טיפים, אסטרטגיות וכל מה
            שצריך כדי לנצח.
          </p>
          <Link
            href="/he/hebrew-multiplayer-word-game"
            className="inline-block rounded-neo border-3 border-neo-pink bg-neo-pink/10 px-5 py-2 font-bold text-neo-pink transition-all hover:bg-neo-pink/20"
          >
            למדריך המלא &larr;
          </Link>
        </section>
      </div>
    </main>
  );
}
