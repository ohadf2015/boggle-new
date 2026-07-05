import type { Metadata } from 'next';
import Link from 'next/link';
import NativePageEnhancements from '@/components/landing/NativePageEnhancements';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  await params;
  const pageUrl = `${BASE_URL}/he/hebrew-multiplayer-word-game`;

  return {
    title: 'סקראבל ובוגל בעברית אונליין — חינם, ללא הרשמה | לקסיקלאש',
    description: 'שחקו סקראבל ובוגל בעברית אונליין — בזמן אמת, ללא המתנה לתורות. 10,000+ מילים בעברית, ללא הרשמה, חינם לגמרי. עד 50 שחקנים בחדר.',
    keywords: 'משחק מילים בעברית, משחק מילים מרובה משתתפים, בוגל בעברית, סקראבל בעברית, משחק מילים אונליין, קרב מילים, משחק מילים לחברים',
    openGraph: {
      title: 'סקראבל ובוגל בעברית אונליין | לקסיקלאש',
      description: 'שחקו סקראבל ובוגל בעברית אונליין בזמן אמת — ללא המתנה לתורות. עד 50 שחקנים, חינם וללא הרשמה!',
      locale: 'he_IL',
      type: 'website',
      url: pageUrl,
      images: [
        {
          url: `${BASE_URL}/og-image-he.webp`,
          width: 1200,
          height: 630,
          alt: 'לקסיקלאש - משחק מילים בעברית',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'משחק מילים בעברית - לקסיקלאש',
      description: 'משחק מילים מרובה משתתפים בעברית! צרו חדר, שלחו לינק והתחרו בזמן אמת. חינם!',
      images: [`${BASE_URL}/og-image-he.webp`],
    },
    alternates: {
      canonical: pageUrl,
      languages: {
        'x-default': `${BASE_URL}/en/multiplayer-word-game-online`,
        en: `${BASE_URL}/en/multiplayer-word-game-online`,
        he: `${BASE_URL}/he/hebrew-multiplayer-word-game`,
        sv: `${BASE_URL}/sv/swedish-multiplayer-word-game`,
        ja: `${BASE_URL}/ja/japanese-word-game`,
        es: `${BASE_URL}/es/juego-de-palabras-multijugador`,
        'en-IL': `${BASE_URL}/en/multiplayer-word-game-online`,
        'he-IL': `${BASE_URL}/he/hebrew-multiplayer-word-game`,
        'en-US': `${BASE_URL}/en/multiplayer-word-game-online`,
        'es-US': `${BASE_URL}/es/juego-de-palabras-multijugador`,
        'en-GB': `${BASE_URL}/en/multiplayer-word-game-online`,
        'en-SE': `${BASE_URL}/en/multiplayer-word-game-online`,
        'sv-SE': `${BASE_URL}/sv/swedish-multiplayer-word-game`,
        'en-JP': `${BASE_URL}/en/multiplayer-word-game-online`,
        'ja-JP': `${BASE_URL}/ja/japanese-word-game`,
        'en-ES': `${BASE_URL}/en/multiplayer-word-game-online`,
        'es-ES': `${BASE_URL}/es/juego-de-palabras-multijugador`,
        'en-MX': `${BASE_URL}/en/multiplayer-word-game-online`,
        'es-MX': `${BASE_URL}/es/juego-de-palabras-multijugador`,
        'en-AU': `${BASE_URL}/en/multiplayer-word-game-online`,
        'es-AR': `${BASE_URL}/es/juego-de-palabras-multijugador`,
        'es-CO': `${BASE_URL}/es/juego-de-palabras-multijugador`,
      },
    },
    robots: { index: true, follow: true },
  };
}

export default async function HebrewMultiplayerWordGamePage({ params }: PageProps) {
  const { locale } = await params;

  const faqs = [
    {
      q: 'איך מתחילים לשחק משחק מילים מרובה משתתפים?',
      a: 'פשוט לחצו על "צור חדר" או "הצטרפות לחדר" בעמוד המרובה משתתפים. שתפו את הלינק עם חברים, ותוכלו להתחיל להתחרות בזמן אמת! לא צריך חשבון.',
    },
    {
      q: 'מה הופך את לקסיקלאש להשונה ממשחקי מילים אחרים?',
      a: 'לקסיקלאש משלב את היתרונות של בוגל, סקראבל ווורדל. התחרו בזמן אמת עם משוב ניקוד מיידי, מצבי משחק מרובים, קרבות בוסים ואתגרים יומיים.',
    },
    {
      q: 'האם אוכל לשחק עם חברים בחינם?',
      a: 'כן! לקסיקלאש הוא לגמרי חינם. צרו חדרים, הזמינו חברים דרך לינק, והתחרו ללא הורדה או הרשמה.',
    },
    {
      q: 'כמה מילים בעברית יש בלקסיקלאש?',
      a: 'לקסיקלאש כולל 10,000+ מילים בעברית. המילון שלנו מתעדכן כל הזמן.',
    },
    {
      q: 'אילו מצבי משחק קיימים?',
      a: 'שחקו חדרים מרובי משתתפים, אתגרים יומיים, ציידי מילים, מצב Blast ועוד. לכל מצב יש חוקים וניקוד ייחודיים.',
    },
  ];

  return (
    <main className="min-h-screen bg-neo-navy text-neo-white" dir="rtl">
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
        <h1 className="mb-6 font-neo-display text-4xl font-bold leading-tight sm:text-5xl">
          משחק מילים בעברית אונליין — סקראבל, בוגל וראש בראש מרובה משתתפים
        </h1>

        <p className="mb-8 text-lg leading-relaxed text-neo-gray-200">
          ברוכים הבאים ללקסיקלאש - משחק המילים בעברית הטוב באינטרנט למשחק ראש בראש אונליין עם חברים. אם אתם
          מחפשים סקראבל אונליין, בוגל בעברית או אתגר יומי בסגנון וורדל — הפלטפורמה שלנו משלבת את הטוב ביותר
          מכל אחד. צרו חדר, שלחו לינק, והתחרו בקרבות מילים בזמן אמת, ראש בראש, מול חברים או שחקנים מכל העולם.
          עם 10,000+ מילים במילון בעברית, ללא הורדה וללא הרשמה, לקסיקלאש היא משחק המילים האידיאלי לכם.
        </p>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">
            למה לשחק בלקסיקלאש?
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              'קרבות מרובי משתתפים בזמן אמת עם משוב ניקוד מיידי',
              'צרו חדרים ושלחו לינק לחברים',
              '10,000+ מילים בעברית',
              'מצבי משחק מרובים (בוגל, ציד, בלסט)',
              'אתגרים יומיים ודירוגים',
              'קרבות בוסים עם הפתעות ייחודיות',
              'לגמרי חינם, ללא הורדה',
              'שחקו בעברית, אנגלית, שוודית, יפנית וספרדית',
            ].map((feature) => (
              <div
                key={feature}
                className="flex gap-3 rounded-neo border-3 border-neo-yellow bg-neo-navy/50 p-4 shadow-hard"
              >
                <span className="text-neo-yellow">✓</span>
                <p className="text-sm sm:text-base">{feature}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12 flex flex-col gap-3 sm:flex-row-reverse sm:gap-4">
          <Link
            href={`/${locale}/multiplayer`}
            className="rounded-neo border-4 border-neo-yellow bg-neo-yellow px-6 py-3 font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg sm:px-8 sm:py-4"
          >
            התחילו לשחק
          </Link>
          <Link
            href={`/${locale}/singleplayer`}
            className="rounded-neo border-4 border-neo-cyan bg-transparent px-6 py-3 font-bold text-neo-cyan shadow-hard transition-all hover:bg-neo-cyan/10 sm:px-8 sm:py-4"
          >
            משחק יחיד
          </Link>
          <Link
            href={`/${locale}/daily`}
            className="rounded-neo border-4 border-neo-pink bg-transparent px-6 py-3 font-bold text-neo-pink shadow-hard transition-all hover:bg-neo-pink/10 sm:px-8 sm:py-4"
          >
            אתגר יומי
          </Link>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">שאלות נפוצות</h2>
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <details
                key={`faq-${idx}-${faq.q}`}
                className="group rounded-neo border-3 border-neo-gray-400 bg-neo-navy/50 shadow-hard"
              >
                <summary className="flex cursor-pointer items-center justify-between px-6 py-4 font-bold">
                  <span className="text-neo-yellow transition-transform group-open:rotate-180">▼</span>
                  <span>{faq.q}</span>
                </summary>
                <div className="border-t border-neo-gray-400 px-6 py-4 text-neo-gray-200">{faq.a}</div>
              </details>
            ))}
          </div>
        </section>

        <section className="mb-12 max-w-none">
          <h2 className="font-neo-display text-2xl font-bold sm:text-3xl">על לקסיקלאש</h2>
          <p className="mt-4 text-neo-gray-200">
            לקסיקלאש מסיבת משחקי מילים אונליין על ידי שילוב של עומק אסטרטגי של סקראבל, מהירות זמן אמת של בוגל,
            וסיפוק חידות של וורדל. הפלטפורמה שלנו מעוצבת לאוהבי מילים, שחקנים רגילים ושחקנים תחרותיים כאחד.
          </p>
          <p className="mt-4 text-neo-gray-200">
            שחקו משחקי מילים מרובי משתתפים עם חברים, משפחה ותושבי עולם. בין אם אתם רוצים משחק מהיר של 15 דקות
            או הושב תחרותי ארוך יותר, לקסיקלאש מתאימה לכל סגנון משחק. הממשק האינטואיטיבי עובד במחשב ובנייד,
            מה שמאפשר לכם לשחק כל היום בכל מקום.
          </p>
          <p className="mt-4 text-neo-gray-200">
            התחרו בדירוגים גלובליים, אור הישגים, וביטלו מצבי משחק מיוחדים. קרבות הבוסים שלנו מוסיפים טוויסט
            PvE ייחודי שבו שחקנים שיתפו פעולה נגד יריבים בינה מלאכותית.{' '}
            <Link href={`/${locale}/daily`} className="text-neo-lime underline underline-offset-2 hover:text-neo-lime/80">
              המילה היומית
            </Link>{' '}
            מציעה חידות טריות כל יום עם פרסים בלעדיים.
          </p>
        </section>

        <section className="mb-12" dir="rtl">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">כלים ומשאבים בעברית</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href={`/${locale}/daily`}
              className="rounded-neo border-3 border-neo-lime/60 bg-neo-navy-light p-4 shadow-hard transition-all hover:border-neo-lime"
            >
              <h3 className="font-neo-display font-bold text-neo-lime">המילה היומית — מילת היום</h3>
              <p className="mt-1 text-xs text-slate-300">גלגל מילים וציד מילים — חידה חדשה כל יום עם טבלת מובילים גלובלית.</p>
            </Link>
            <Link
              href={`/${locale}/words`}
              className="rounded-neo border-3 border-neo-cyan/60 bg-neo-navy-light p-4 shadow-hard transition-all hover:border-neo-cyan"
            >
              <h3 className="font-neo-display font-bold text-neo-cyan">מילון מילים בעברית</h3>
              <p className="mt-1 text-xs text-slate-300">חפשו לפי אורך מילה או אות ראשונה — כל המילים התקניות במשחק.</p>
            </Link>
            <Link
              href={`/${locale}/anagram`}
              className="rounded-neo border-3 border-neo-pink/60 bg-neo-navy-light p-4 shadow-hard transition-all hover:border-neo-pink"
            >
              <h3 className="font-neo-display font-bold text-neo-pink">פותר אנגרמות בעברית</h3>
              <p className="mt-1 text-xs text-slate-300">הכניסו אותיות וגלו כל המילים האפשריות שאפשר לבנות.</p>
            </Link>
            <Link
              href={`/${locale}/leaderboard`}
              className="rounded-neo border-3 border-neo-yellow/60 bg-neo-navy-light p-4 shadow-hard transition-all hover:border-neo-yellow"
            >
              <h3 className="font-neo-display font-bold text-neo-yellow">טבלת מובילים</h3>
              <p className="mt-1 text-xs text-slate-300">דירוגים יומיים, שבועיים וכלליים — עלו בדירוג הגלובלי.</p>
            </Link>
          </div>
        </section>
        <NativePageEnhancements locale={locale} />
      </div>
    </main>
  );
}
