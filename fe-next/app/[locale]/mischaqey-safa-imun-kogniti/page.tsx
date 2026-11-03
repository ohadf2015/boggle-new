import type { Metadata } from 'next';
import Link from 'next/link';
import {
  BASE_URL,
  CANONICAL,
  META_TITLE,
  META_DESCRIPTION,
  skills,
  dailyPlan,
  ageGroups,
  faqs,
  buildJsonLd,
} from './seo';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const primaryCta =
  'inline-flex items-center justify-center rounded-neo border-neo-thick border-neo-black bg-neo-lime px-6 py-3 font-neo-display text-lg font-bold text-neo-black shadow-hard transition-transform hover:-translate-y-0.5 active:translate-y-0';
const secondaryCta =
  'inline-flex items-center justify-center rounded-neo border-neo-thick border-neo-black bg-neo-cyan px-6 py-3 font-neo-display text-lg font-bold text-neo-black shadow-hard transition-transform hover:-translate-y-0.5 active:translate-y-0';
const card = 'rounded-neo border-neo border-neo-black bg-neo-navy-light p-5 shadow-hard-sm';
const inlineLink = 'font-bold text-neo-lime underline';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;

  return {
    title: META_TITLE,
    description: META_DESCRIPTION,
    keywords: 'משחקי שפה, אימון קוגניטיבי, משחקי שפה לאימון קוגניטיבי, משחקי מילים לזיכרון, משחקי חשיבה, אימון זיכרון, משחקי מילים למבוגרים, משחקי מילים לגיל השלישי',
    openGraph: {
      title: 'משחקי שפה לאימון קוגניטיבי',
      description: 'איזה משחק מילים מתרגל איזו יכולת, תוכנית של 10 דקות ביום ותשובה כנה על מה המחקר מראה.',
      locale: 'he_IL',
      type: 'article',
      url: CANONICAL,
      images: [{ url: `${BASE_URL}/og-image-he.webp`, width: 1200, height: 630, alt: 'משחקי שפה לאימון קוגניטיבי — LexiClash' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'משחקי שפה לאימון קוגניטיבי | LexiClash',
      description: META_DESCRIPTION,
      images: [`${BASE_URL}/og-image-he.webp`],
    },
    alternates: {
      canonical: CANONICAL,
      languages: {
        'x-default': `${BASE_URL}/en/brain-training-word-games`,
        he: CANONICAL,
        'he-IL': CANONICAL,
      },
    },
    robots: { index: locale === 'he', follow: true },
  };
}

export default async function LanguageGamesCognitivePage({ params }: PageProps) {
  await params;
  const jsonLd = JSON.stringify(buildJsonLd());

  return (
    <main className="min-h-screen bg-neo-navy text-neo-white" dir="rtl" lang="he">
      <script type="application/ld+json">{jsonLd}</script>

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="font-neo-display text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
          משחקי שפה לאימון קוגניטיבי
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-neo-white">
          משחק מילים טוב מעסיק את הראש: צריך לזכור, להתרכז, לחשוב מהר ולשלוף מילים שלא אומרים כל יום.
          כאן תמצאו איזה סוג משחק מתרגל איזו יכולת, תוכנית של 10 דקות ביום, התאמה לגילים שונים, ותשובה כנה
          על מה <strong>אימון קוגניטיבי</strong> במשחקים כן ולא עושה.
        </p>

        <section className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
          <Link href="/he/brain" className={primaryCta}>
            התחילו תרגיל של דקה ▶
          </Link>
          <Link href="/he/multiplayer" className={secondaryCta}>
            שחקו מול חברים
          </Link>
        </section>

        <section className="mt-14">
          <h2 className="font-neo-display text-2xl font-bold sm:text-3xl">מה זה אימון קוגניטיבי, ולמה דווקא משחקי שפה?</h2>
          <p className="mt-4 text-lg leading-relaxed text-neo-white">
            אימון קוגניטיבי הוא תרגול קבוע של יכולות חשיבה מסוימות דרך משימות קצרות שחוזרים עליהן.
            ארבע היכולות שמשחקי מילים נוגעים בהן הכי ישירות הן <strong>זיכרון עבודה</strong>,{' '}
            <strong>ריכוז</strong>, <strong>מהירות עיבוד</strong> ו<strong>אוצר מילים</strong>.
          </p>
          <p className="mt-4 text-lg leading-relaxed text-neo-white">
            היתרון של משחקי שפה הוא שהחומר כבר מוכר. לא צריך ללמוד כללים של מתמטיקה או לוגיקה, רק לחפש מילים.
            הטיימר, הניקוד ורמת הקושי הופכים את זה לאתגר. התרגילים של LexiClash בנויים בהשראת משימות שחוקרים
            משתמשים בהן כדי לבחון את היכולות האלה, אבל הם משחק ולא כלי קליני.
          </p>
        </section>

        <section className="mt-14">
          <h2 className="font-neo-display text-2xl font-bold sm:text-3xl">איזה משחק שפה מתרגל איזו יכולת</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {skills.map((s) => (
              <div key={s.skill} className={card}>
                <h3 className="font-neo-display text-lg font-bold">{s.skill}</h3>
                <p className="mt-1 text-sm font-bold text-neo-cyan">{s.game}</p>
                <p className="mt-2 leading-relaxed text-neo-white">{s.text}</p>
                <Link href={s.href} className={`mt-3 inline-block ${inlineLink}`}>
                  לתרגיל
                </Link>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14">
          <h2 className="font-neo-display text-2xl font-bold sm:text-3xl">איך מתחילים לשחק ב-LexiClash</h2>
          <ol className="mt-4 list-decimal space-y-2 pe-6 text-lg leading-relaxed text-neo-white">
            <li>
              נכנסים ל<Link href="/he/brain" className={inlineLink}>מרכז המוח</Link> ובוחרים תרגיל. אין הרשמה ואין הורדה.
            </li>
            <li>משחקים סיבוב של 60 שניות. הקושי עולה כשמצליחים ויורד כשנתקעים.</li>
            <li>
              רוצים לשחק עם אחרים? פותחים חדר ב<Link href="/he/multiplayer" className={inlineLink}>משחק מרובה משתתפים</Link>, שולחים
              לינק, וכולם משחקים על אותו לוח בזמן אמת.
            </li>
            <li>הלוח בעברית כשהאתר בעברית. כדי לתרגל אנגלית מחליפים שפה בתפריט.</li>
          </ol>
        </section>

        <section className="mt-14">
          <h2 className="font-neo-display text-2xl font-bold sm:text-3xl">תוכנית של 10 דקות ביום</h2>
          <p className="mt-4 text-lg leading-relaxed text-neo-white">
            קצת כל יום עדיף על הרבה פעם בשבוע. כל שלב קצר, ואפשר לעצור באמצע.
          </p>
          <ol className="mt-6 space-y-3">
            {dailyPlan.map((step) => (
              <li key={step.minutes} className={card}>
                <p className="text-sm font-bold text-neo-cyan">{step.minutes}</p>
                <h3 className="mt-1 font-neo-display text-lg font-bold">
                  <Link href={step.href} className="underline">{step.title}</Link>
                </h3>
                <p className="mt-1 leading-relaxed text-neo-white">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-14">
          <h2 className="font-neo-display text-2xl font-bold sm:text-3xl">משחקי שפה לפי גיל</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {ageGroups.map((g) => (
              <div key={g.who} className={card}>
                <h3 className="font-neo-display text-lg font-bold">{g.who}</h3>
                <p className="mt-2 leading-relaxed text-neo-white">{g.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14">
          <h2 className="font-neo-display text-2xl font-bold sm:text-3xl">שאלות נפוצות</h2>
          <div className="mt-6 space-y-3">
            {faqs.map((f) => (
              <details key={f.q} className="rounded-neo border-neo border-neo-black bg-neo-navy-light p-4 shadow-hard-sm">
                <summary className="cursor-pointer font-neo-display text-lg font-bold">{f.q}</summary>
                <p className="mt-2 leading-relaxed text-neo-white">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-14">
          <h2 className="font-neo-display text-2xl font-bold sm:text-3xl">לקריאה נוספת</h2>
          <ul className="mt-4 list-disc space-y-2 pe-6 text-lg leading-relaxed text-neo-white">
            <li>
              <Link href="/he/blog/word-games-for-brain-training" className={inlineLink}>מה המחקר באמת אומר על משחקי מילים ובריאות המוח</Link>
            </li>
            <li>
              <Link href="/he/brain-training-word-games" className={inlineLink}>4 תרגילי אימון מוח חינם, 60 שניות כל אחד</Link>
            </li>
            <li>
              <Link href="/he/hamila-hayomit" className={inlineLink}>המילה היומית: מה זה ואיך משחקים</Link>
            </li>
          </ul>
        </section>

        <section className="mt-14 rounded-neo border-neo-thick border-neo-black bg-neo-navy-light p-6 shadow-hard">
          <h2 className="font-neo-display text-2xl font-bold sm:text-3xl">דקה אחת, בלי הרשמה</h2>
          <p className="mt-3 text-lg leading-relaxed text-neo-white">
            בחרו תרגיל, שחקו 60 שניות, ותראו איך זה מרגיש.
          </p>
          <Link href="/he/brain" className={`mt-5 ${primaryCta}`}>
            למרכז המוח ▶
          </Link>
        </section>
      </div>
    </main>
  );
}
