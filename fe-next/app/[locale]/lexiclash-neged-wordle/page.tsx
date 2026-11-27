import type { Metadata } from 'next';
import Link from 'next/link';
import { CompareTable, CtaBand, FaqList, LandingButton, LandingHero, LandingPage, LinkPills, Prose, Section, TileGrid } from '@/components/landing/kit';
import { LANDING_ART } from '@/components/landing/kit/art';

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
          url: `${BASE_URL}/og-image-he.webp?v=2`,
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
      images: [`${BASE_URL}/og-image-he.webp?v=2`],
    },
    alternates: {
      canonical: pageUrl,
      languages: {
        'x-default': `${BASE_URL}/he/lexiclash-neged-wordle`,
        en: `${BASE_URL}/en/lexiclash-vs-wordle`,
        he: `${BASE_URL}/he/lexiclash-neged-wordle`,
        es: `${BASE_URL}/es/lexiclash-contra-wordle`,
        'he-IL': `${BASE_URL}/he/lexiclash-neged-wordle`,
        'en-US': `${BASE_URL}/en/lexiclash-vs-wordle`,
        'en-GB': `${BASE_URL}/en/lexiclash-vs-wordle`,
        'en-IL': `${BASE_URL}/en/lexiclash-vs-wordle`,
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
    <div dir="rtl">
      <LandingPage locale={locale} play={{ href: `/${locale}/quick-play`, label: 'שחקו עכשיו - בחינם!' }}>
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

        <LandingHero
          eyebrow="LexiClash vs Wordle"
          title="לקסיקלאש נגד וורדל - איזה משחק מילים באמת שווה את הזמן שלכם?"
          lead="אוקיי, בואו נהיה כנים - וורדל הוא משחק מעולה."
          actions={
            <>
              <LandingButton href={`/${locale}/quick-play`}>שחקו עכשיו - בחינם!</LandingButton>
              <LandingButton href={`/${locale}/daily`} variant="secondary">אתגר יומי</LandingButton>
            </>
          }
          art={LANDING_ART.duel('שני קמעות של LexiClash בדו-קרב מילים')}
          artTone="pink"
          more={
            <p>
              <Link href={`/${locale}/hamila-hayomit`}>המילה היומית</Link> הזו ממכרת, והריגוש של לפתור ב-3 ניחושים הוא
              אמיתי. אבל מה קורה אחרי שסיימתם את המילה של היום? אתם סוגרים את הטאב וממתינים 24 שעות. בלקסיקלאש? אתם רק
              מתחילים. מרובה משתתפים, קרבות בוסים, מצב Blast עם קומבואים מטורפים, והכי חשוב - הכל בעברית מלאה. בואו נעשה
              את ההשוואה.
            </p>
          }
        >
          <LinkPills items={[{ href: `/${locale}/multiplayer`, label: 'מרובה משתתפים' }]} />
        </LandingHero>

        <Section title="טבלת השוואה: לקסיקלאש מול וורדל">
          <CompareTable
            columns={['תכונה', 'וורדל', 'לקסיקלאש']}
            highlight={2}
            rows={comparisonRows.map((row) => [row.feature, row.wordle, row.lexiclash])}
          />
        </Section>

        <Section title="אז למה לעבור מוורדל ללקסיקלאש?">
          <TileGrid
            items={[
              { tone: 'lime', title: 'אינסוף משחקים', body: 'לא צריך לחכות ליום הבא. שחקו כמה שרוצים, מתי שרוצים.' },
              { tone: 'pink', title: 'משחק עם חברים', body: 'צרו חדר, שלחו לינק, ותתחרו בזמן אמת. וורדל לא מאפשר את זה.' },
              { tone: 'cyan', title: 'עברית אמיתית', body: '10,000+ מילים בעברית, ממשק בעברית מלאה, ותמיכה מושלמת ב-RTL.' },
              { tone: 'yellow', title: 'מגוון מצבים', body: 'Blast, ציד מילים, קרבות בוסים, הרפתקה, אתגר יומי - משעמם פה? בלתי אפשרי.' },
              { tone: 'orange', title: 'קומבואים ובוסים', body: 'מצאו מילים ברצף ותרגישו את הקומבו עולה. קרבות בוסים עם טוויסטים מפתיעים.' },
              { tone: 'purple', title: 'דירוגים ופרסים', body: 'לוח תוצאות גלובלי, הישגים, ואתגרים יומיים עם פרסים בלעדיים.' },
            ]}
          />
        </Section>

        <Section title="וורדל מעולה - אבל לקסיקלאש זה משחק מילים שלם">
          <Prose paper>
            <p>
              וורדל הצליח לעשות משהו גאוני: הוא הפך משחק מילים פשוט לתופעת אינטרנט. המגבלה של מילה אחת ביום יוצרת מחויבות
              יומית ותחושת FOMO שגורמת לאנשים לחזור. אין ספק שזה עובד.
            </p>
            <p>
              אבל מה אם אתם רוצים יותר? מה אם סיימתם את המילה בשתי דקות ואתם רוצים להמשיך? מה אם אתם רוצים לשחק עם חברים
              ולא רק לשתף ריבועים ירוקים בוואטסאפ? וגם - מה עם עברית? וורדל עובד רק באנגלית (ובכמה שיבוטים לא רשמיים).
            </p>
            <p>
              לקסיקלאש לוקח את הרעיון הבסיסי של &quot;מצא מילים ותרגיש גאון&quot; ומרחיב אותו לכל כיוון. רוצים להתחרות בזמן
              אמת? יש. רוצים אתגר יומי עם דירוג? יש. רוצים מצב Blast עם קומבואים שגורמים למסך לרעוד? בהחלט יש. רוצים לשחק
              בעברית עם מילון של 10,000+ מילים? ברור שיש.
            </p>
          </Prose>
        </Section>

        <Section title="שאלות נפוצות">
          <FaqList items={faqs} />
        </Section>

        <CtaBand
          tone="pink"
          title="רוצים לדעת עוד על משחקי מילים בעברית?"
          body="קראו את המדריך המלא שלנו למשחקי מילים מרובי משתתפים בעברית - כולל טיפים, אסטרטגיות וכל מה שצריך כדי לנצח."
          actions={<LandingButton href="/he/hebrew-multiplayer-word-game">למדריך המלא &larr;</LandingButton>}
          art={LANDING_ART.trophy('')}
        />
      </LandingPage>
    </div>
  );
}
