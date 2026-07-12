import type { Metadata } from 'next';
import Link from 'next/link';
import { BASE_URL, CANONICAL, DAILY_URL, dailyWordHeFaqs, buildHamilaHayomitJsonLd } from './seo';


interface PageProps {
  params: Promise<{ locale: string }>;
}


const features = [
  { icon: '🗓️', title: 'מילה יומית חדשה כל בוקר', text: 'לוח חדש בכל יום בחצות. כולם בעולם מפצחים את אותה מילת היום.' },
  { icon: '🌍', title: 'אותו לוח לכל העולם', text: 'תחרות הוגנת — אין יתרון לאף אחד. רק אתם והמילה.' },
  { icon: '🎯', title: 'ציד מילים וגלגל מילים', text: 'שתי גרסאות יומיות שונות, חוויה אחרת בכל פעם.' },
  { icon: '📲', title: 'שתפו תוצאות אמוג\'י', text: 'סיכום ויזואלי לשיתוף בלי ספוילרים, כמו וורדל.' },
  { icon: '🔥', title: 'רצף יומי', text: 'חזרו כל יום ובנו רצף — תגמולים על עקביות.' },
  { icon: '🏆', title: 'טבלת מובילים גלובלית', text: 'התחרו מול שחקנים מכל העולם, מתאפסת כל יום.' },
];

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isHe = locale === 'he';

  // Definition/guide intent — deliberately NOT a second "play here" title, so this
  // page does not cannibalize /he/daily (the play-intent doorway) on the SERP.
  const title = 'המילה היומית — מדריך + פאזל מילים יומי חינמי | LexiClash';
  const description = 'המילה היומית של LexiClash — פאזל מילים חינמי ללא הרשמה. אותו לוח לכל העולם בחצות, ציד מילים וגלגל מילים, שיתוף תוצאות וטבלת מובילים. מדריך מלא + משחק.';

  return {
    title,
    description,
    keywords: 'המילה היומית, מילת היום, אתגר יומי, פאזל מילים יומי, משחק מילים יומי, ציד מילים, גלגל מילים, וורדל בעברית, משחק מילים חינם',
    openGraph: {
      title: 'המילה היומית — מה זה ואיך משחקים את מילת היום',
      description: 'המדריך המלא ל"המילה היומית" של LexiClash + הפאזל היומי החינמי. אותו לוח לכל העולם, ציד מילים וגלגל מילים.',
      locale: 'he_IL',
      type: 'website',
      url: CANONICAL,
      images: [{ url: `${BASE_URL}/og-image-he.webp`, width: 1200, height: 630, alt: 'המילה היומית — LexiClash' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'המילה היומית — פאזל המילים של היום | LexiClash',
      description,
      images: [`${BASE_URL}/og-image-he.webp`],
    },
    alternates: {
      // Self-referencing Hebrew cluster — the page is Hebrew-only by intent.
      canonical: CANONICAL,
      languages: {
        'x-default': DAILY_URL,
        he: CANONICAL,
        'he-IL': CANONICAL,
      },
    },
    // Locale-gate: only the Hebrew variant is indexable; others consolidate via canonical.
    robots: { index: isHe, follow: true },
  };
}


export default async function HamilaHayomitPage({ params }: PageProps) {
  await params;
  // JSON-LD is hardcoded + angle-bracket-free, so React <script> text children
  // emit valid JSON without escaping — no dangerouslySetInnerHTML needed.
  const jsonLd = JSON.stringify(buildHamilaHayomitJsonLd());

  return (
    <main className="min-h-screen bg-neo-navy text-neo-white" dir="rtl">
      <script type="application/ld+json">{jsonLd}</script>

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="font-neo-display text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
          המילה היומית — מה זה, ואיך משחקים את מילת היום
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-neo-white">
          מחפשים את <strong>המילה היומית</strong>? ב-LexiClash מחכה לכם <strong>מילת היום</strong> בפאזל
          חדש מדי בוקר. כל שחקן בעולם מקבל בדיוק את אותו הלוח — מפצחים, שומרים על הרצף ומשתפים את התוצאה.
          ללא הרשמה, ללא הורדה, חינם לגמרי.
        </p>

        <section className="mt-8 flex flex-col gap-3 sm:flex-row-reverse sm:gap-4">
          <Link
            href="/he/daily"
            className="inline-flex items-center justify-center rounded-neo border-neo-thick border-neo-black bg-neo-lime px-6 py-3 font-neo-display text-lg font-bold text-neo-black shadow-hard transition-transform hover:-translate-y-0.5 active:translate-y-0"
          >
            שחקו את המילה היומית עכשיו ▶
          </Link>
          <Link
            href="/he/daily/word-wheel"
            className="inline-flex items-center justify-center rounded-neo border-neo-thick border-neo-black bg-neo-cyan px-6 py-3 font-neo-display text-lg font-bold text-neo-black shadow-hard transition-transform hover:-translate-y-0.5 active:translate-y-0"
          >
            גלגל המילים היומי
          </Link>
        </section>

        <section className="mt-14">
          <h2 className="font-neo-display text-2xl font-bold sm:text-3xl">מה זה &quot;המילה היומית&quot;?</h2>
          <p className="mt-4 text-lg leading-relaxed text-neo-white">
            <strong>המילה היומית</strong> היא פאזל מילים יומי שבו כל השחקנים מקבלים את אותו אתגר בדיוק.
            ב-LexiClash היא מגיעה בשתי גרסאות: <strong>ציד המילים</strong> — שילוב של וורדל ובוגל שבו
            מאתרים מילה נסתרת ב-10 ניסיונות, ו<strong>גלגל המילים</strong> — שבו מרכיבים כמה שיותר מילים
            מאותיות סביב אות מרכזית. כל בוקר בחצות מתחיל אתגר חדש וטבלת מובילים נקייה.
          </p>
        </section>

        <section className="mt-14">
          <h2 className="font-neo-display text-2xl font-bold sm:text-3xl">למה לשחק את המילה היומית של LexiClash?</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-neo border-neo border-neo-black bg-neo-navy-light p-5 shadow-hard-sm"
              >
                <div className="text-2xl" aria-hidden="true">{f.icon}</div>
                <h3 className="mt-2 font-neo-display text-lg font-bold">{f.title}</h3>
                <p className="mt-1 text-neo-white">{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14">
          <h2 className="font-neo-display text-2xl font-bold sm:text-3xl">איך משחקים — צעד אחר צעד</h2>
          <ol className="mt-4 list-decimal space-y-2 pe-6 text-lg leading-relaxed text-neo-white">
            <li>נכנסים ל<Link href="/he/daily" className="font-bold text-neo-lime underline">עמוד האתגר היומי</Link>.</li>
            <li>בוחרים בין ציד המילים לגלגל המילים.</li>
            <li>מפצחים את מילת היום במספר הניסיונות המותר.</li>
            <li>משתפים את תוצאת האמוג&apos;י ובונים את הרצף היומי שלכם.</li>
          </ol>
        </section>

        <section className="mt-14">
          <h2 className="font-neo-display text-2xl font-bold sm:text-3xl">שאלות נפוצות על המילה היומית</h2>
          <div className="mt-6 space-y-3">
            {dailyWordHeFaqs.map((f) => (
              <details
                key={f.q}
                className="rounded-neo border-neo border-neo-black bg-neo-navy-light p-4 shadow-hard-sm"
              >
                <summary className="cursor-pointer font-neo-display text-lg font-bold">{f.q}</summary>
                <p className="mt-2 leading-relaxed text-neo-white">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-14 rounded-neo border-neo-thick border-neo-black bg-neo-navy-light p-6 shadow-hard">
          <h2 className="font-neo-display text-2xl font-bold sm:text-3xl">מוכנים לפצח את מילת היום?</h2>
          <p className="mt-3 text-lg leading-relaxed text-neo-white">
            המילה היומית מחכה. הצטרפו לשחקנים מכל העולם, התחילו רצף ותראו עד לאן תגיעו בטבלת המובילים.
          </p>
          <Link
            href="/he/daily"
            className="mt-5 inline-flex items-center justify-center rounded-neo border-neo-thick border-neo-black bg-neo-lime px-6 py-3 font-neo-display text-lg font-bold text-neo-black shadow-hard transition-transform hover:-translate-y-0.5 active:translate-y-0"
          >
            שחקו עכשיו ▶
          </Link>
        </section>
      </div>
    </main>
  );
}
