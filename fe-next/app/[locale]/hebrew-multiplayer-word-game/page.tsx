import type { Metadata } from 'next';
import Link from 'next/link';
import NativePageEnhancements from '@/components/landing/NativePageEnhancements';
import {
  CheckList,
  FaqList,
  LandingButton,
  LandingHero,
  LandingPage,
  Mark,
  Prose,
  Section,
  TileGrid,
} from '@/components/landing/kit';
import { LANDING_ART } from '@/components/landing/kit/art';
import { dictionaryFloor } from '@/lib/seo/dictionaryStats';

const HE_DICT_FLOOR = dictionaryFloor('he', 'he');

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
          url: `${BASE_URL}/og-image-he.webp?v=2`,
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
      images: [`${BASE_URL}/og-image-he.webp?v=2`],
    },
    alternates: {
      canonical: pageUrl,
      languages: {
        'x-default': `${BASE_URL}/en/free-multiplayer-word-game`,
        en: `${BASE_URL}/en/free-multiplayer-word-game`,
        he: `${BASE_URL}/he/hebrew-multiplayer-word-game`,
        sv: `${BASE_URL}/sv/swedish-multiplayer-word-game`,
        ja: `${BASE_URL}/ja/japanese-word-game`,
        es: `${BASE_URL}/es/juego-de-palabras-multijugador`,
        'en-IL': `${BASE_URL}/en/free-multiplayer-word-game`,
        'he-IL': `${BASE_URL}/he/hebrew-multiplayer-word-game`,
        'en-US': `${BASE_URL}/en/free-multiplayer-word-game`,
        'es-US': `${BASE_URL}/es/juego-de-palabras-multijugador`,
        'en-GB': `${BASE_URL}/en/free-multiplayer-word-game`,
        'en-SE': `${BASE_URL}/en/free-multiplayer-word-game`,
        'sv-SE': `${BASE_URL}/sv/swedish-multiplayer-word-game`,
        'en-JP': `${BASE_URL}/en/free-multiplayer-word-game`,
        'ja-JP': `${BASE_URL}/ja/japanese-word-game`,
        'en-ES': `${BASE_URL}/en/free-multiplayer-word-game`,
        'es-ES': `${BASE_URL}/es/juego-de-palabras-multijugador`,
        'en-MX': `${BASE_URL}/en/free-multiplayer-word-game`,
        'es-MX': `${BASE_URL}/es/juego-de-palabras-multijugador`,
        'en-AU': `${BASE_URL}/en/free-multiplayer-word-game`,
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
      a: `לקסיקלאש כולל ${HE_DICT_FLOOR}+ מילים בעברית. המילון שלנו מתעדכן כל הזמן.`,
    },
    {
      q: 'אילו מצבי משחק קיימים?',
      a: 'שחקו חדרים מרובי משתתפים, אתגרים יומיים, ציידי מילים, מצב Blast ועוד. לכל מצב יש חוקים וניקוד ייחודיים.',
    },
  ];

  return (
    <LandingPage locale={locale} dir="rtl" play={{ href: `/${locale}/multiplayer`, label: 'התחילו לשחק' }}>
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
        title={
          <>
            משחק מילים <Mark>בעברית</Mark> אונליין — סקראבל, בוגל וראש בראש מרובה משתתפים
          </>
        }
        lead="ברוכים הבאים ללקסיקלאש - משחק המילים בעברית הטוב באינטרנט למשחק ראש בראש אונליין עם חברים."
        actions={
          <>
            <LandingButton href={`/${locale}/multiplayer`}>התחילו לשחק</LandingButton>
            <LandingButton href={`/${locale}/quick-play`} variant="secondary">
              משחק יחיד
            </LandingButton>
          </>
        }
        art={LANDING_ART.duel('שתי דמויות של לקסיקלאש בקרב מילים מול לוח אותיות')}
        artTone="cyan"
        more={
          <p>
            אם אתם מחפשים סקראבל אונליין, בוגל בעברית או אתגר יומי בסגנון וורדל — הפלטפורמה שלנו משלבת את הטוב ביותר
            מכל אחד. צרו חדר, שלחו לינק, והתחרו בקרבות מילים בזמן אמת, ראש בראש, מול חברים או שחקנים מכל העולם.
            עם {HE_DICT_FLOOR}+ מילים במילון בעברית, ללא הורדה וללא הרשמה, לקסיקלאש היא משחק המילים האידיאלי לכם.
          </p>
        }
      />

      <Section title="למה לשחק בלקסיקלאש?">
        <CheckList
          items={[
            'קרבות מרובי משתתפים בזמן אמת עם משוב ניקוד מיידי',
            'צרו חדרים ושלחו לינק לחברים',
            `${HE_DICT_FLOOR}+ מילים בעברית`,
            'מצבי משחק מרובים (בוגל, ציד, בלסט)',
            'אתגרים יומיים ודירוגים',
            'קרבות בוסים עם הפתעות ייחודיות',
            'לגמרי חינם, ללא הורדה',
            'שחקו בעברית, אנגלית, שוודית, יפנית, ספרדית ורוסית',
          ]}
        />
      </Section>

      <Section title="סקראבל בעברית מול לקסיקלאש">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-neo-lg border-3 border-neo-black bg-neo-cream p-6 leading-relaxed text-neo-black shadow-hard-xl">
            <p>
              בסקראבל הקלאסי משחקים שניים עד ארבעה. כל אחד מחזיק שבע אותיות, מניח מילה על לוח של 15 על 15 ומחכה
              לתור הבא. הכיף הוא בתכנון: איפה לשים אות יקרה ואיך לתפוס משבצת שמכפילה את הניקוד.
            </p>
          </div>
          <div className="rounded-neo-lg border-3 border-neo-black bg-neo-lime p-6 leading-relaxed text-neo-black shadow-hard-xl">
            <p>
              בלקסיקלאש אין תורות. כולם רואים את אותו לוח אותיות ומחפשים מילים בעברית באותו הזמן, עד שהשעון נגמר.
              גם בחדר של 50 שחקנים אף אחד לא יושב ומחכה.
            </p>
          </div>
        </div>
        <p className="text-neo-white/85">
          רוצים את ההשוואה המלאה?{' '}
          <Link href={`/${locale}/lexiclash-vs-scrabble`} className="font-bold text-neo-cyan underline underline-offset-2">
            לקסיקלאש מול סקראבל
          </Link>
        </p>
      </Section>

      <TileGrid
        items={[
          { href: `/${locale}/multiplayer`, title: 'התחילו לשחק ←', tone: 'yellow' },
          { href: `/${locale}/quick-play`, title: 'משחק יחיד ←', tone: 'cyan' },
          { href: `/${locale}/daily`, title: 'אתגר יומי ←', tone: 'pink' },
        ]}
      />

      <Section title="שאלות נפוצות">
        <FaqList items={faqs} />
      </Section>

      <Section title="על לקסיקלאש">
        <Prose>
          <p>
            לקסיקלאש היא מסיבת משחקי מילים אונליין שמשלבת עומק אסטרטגי של סקראבל, מהירות בזמן אמת של בוגל
            וסיפוק של חידת וורדל. הפלטפורמה שלנו מעוצבת לאוהבי מילים, לשחקנים מזדמנים ולשחקנים תחרותיים כאחד.
          </p>
          <p>
            שחקו משחקי מילים מרובי משתתפים עם חברים, משפחה ושחקנים מכל העולם. בין אם אתם רוצים משחק מהיר של 15
            דקות או מושב תחרותי ארוך יותר, לקסיקלאש מתאימה לכל סגנון משחק. הממשק האינטואיטיבי עובד במחשב ובנייד,
            כך שאפשר לשחק בכל מקום ובכל שעה.
          </p>
          <p>
            התחרו בדירוגים עולמיים, צברו הישגים ופתחו מצבי משחק מיוחדים. קרבות הבוסים שלנו מוסיפים טוויסט PvE
            ייחודי שבו שחקנים משתפים פעולה נגד יריבי בינה מלאכותית.{' '}
            <Link href={`/${locale}/daily`}>המילה היומית</Link> מציעה חידות טריות כל יום עם פרסים בלעדיים.
          </p>
        </Prose>
      </Section>

      <Section title="כלים ומשאבים בעברית">
        <TileGrid
          variant="paper"
          columns={4}
          items={[
            { href: `/${locale}/daily`, title: 'המילה היומית — מילת היום', body: 'גלגל מילים וציד מילים — חידה חדשה כל יום עם טבלת מובילים גלובלית.' },
            { href: `/${locale}/words`, title: 'מילון מילים בעברית', body: 'חפשו לפי אורך מילה או אות ראשונה — כל המילים התקניות במשחק.' },
            { href: `/${locale}/anagram`, title: 'פותר אנגרמות בעברית', body: 'הכניסו אותיות וגלו כל המילים האפשריות שאפשר לבנות.' },
            { href: `/${locale}/leaderboard`, title: 'טבלת מובילים', body: 'דירוגים יומיים, שבועיים וכלליים — עלו בדירוג הגלובלי.' },
          ]}
        />
      </Section>

      <NativePageEnhancements locale={locale} />
    </LandingPage>
  );
}
