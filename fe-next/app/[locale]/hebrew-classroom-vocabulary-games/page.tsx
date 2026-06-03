import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_PATH = '/hebrew-classroom-vocabulary-games';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  await params;
  const pageUrl = `${BASE_URL}/he${PAGE_PATH}`;
  return {
    title: 'משחקי מילים לכיתה בעברית — אוצר מילים חינם למורים | LexiClash',
    description: 'משחקי מילים לכיתה בעברית — חינם וללא הרשמה לתלמידים. דו-קרבות אוצר מילים ומשחק כיתתי חי: מצרפים את הכיתה בקוד, בוחרים רשימת מילים ומשחקים. עובד בכל דפדפן.',
    keywords: 'משחקי מילים לכיתה, משחקים לימודיים, משחק אוצר מילים, העשרת אוצר מילים, כלים דיגיטליים למורים, פעילות לכיתה, משחקי מילים בעברית, משחקי מילים למורים, משחק מילים אונליין לכיתה, משחקי מילים חינם',
    openGraph: {
      title: 'משחקי מילים לכיתה — חינם, ללא הרשמה לתלמידים | LexiClash',
      description: 'משחקי אוצר מילים לכיתה בעברית. דו-קרבות 1v1, משחק כיתתי חי, בלי הרשמה לתלמידים.',
      locale: 'he_IL',
      type: 'website',
      url: pageUrl,
      images: [{ url: `${BASE_URL}/og-image-he.webp`, width: 1200, height: 630, alt: 'LexiClash משחקי מילים לכיתה' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'משחקי מילים לכיתה - LexiClash',
      description: 'חינם, בלי הרשמה, עובד בדפדפן. דו-קרבות אוצר מילים + משחק כיתתי חי.',
      images: [`${BASE_URL}/og-image-he.webp`],
    },
    alternates: {
      canonical: pageUrl,
      languages: {
        'x-default': `${BASE_URL}/en/education/vocabulary-games-classroom`,
        en: `${BASE_URL}/en/education/vocabulary-games-classroom`,
        he: pageUrl,
        sv: `${BASE_URL}/sv/education`,
        ja: `${BASE_URL}/ja/education`,
        es: `${BASE_URL}/es/juegos-vocabulario-aula`,
        'he-IL': pageUrl,
        'en-IL': `${BASE_URL}/en/education/vocabulary-games-classroom`,
        'en-US': `${BASE_URL}/en/education/vocabulary-games-classroom`,
      },
    },
    robots: { index: true, follow: true },
  };
}

const faqs = [
  { q: 'מה הם משחקי המילים הטובים ביותר לכיתה בעברית?', a: 'LexiClash Education נבנה במיוחד לכיתות בעברית: התלמידים מצטרפים בקוד בן 4 ספרות (בלי הרשמה), המורה בוחר רשימת מילים, וכל הכיתה משחקת יחד בזמן אמת 5–10 דקות. המשחק עובד בכל דפדפן ותומך בעברית, אנגלית, ספרדית, שוודית ויפנית — ולכן מתאים גם לכיתות עברית כשפה שנייה ולשיעורי שפה.' },
  { q: 'האם התלמידים צריכים לפתוח חשבון?', a: 'לא. התלמידים מקלידים קוד בן 4 ספרות שהמורה מציג על המסך ומתחילים לשחק מיד. רק המורים פותחים חשבון — בחינם — כדי לשמור רשימות מילים ולעקוב אחרי ההתקדמות של הכיתה.' },
  { q: 'אפשר לייבא רשימת אוצר מילים משלי?', a: 'כן. אפשר להעלות כל רשימת מילים — מיחידת לימוד, מספר לימוד או מתכנית הלימודים — ולשחק איתה בדו-קרבות אחד-על-אחד, במשחק לכל הכיתה או בתרגול אישי שמוקצה לתלמידים.' },
  { q: 'במה זה שונה מ-Quizlet, Kahoot או Wordwall?', a: 'Quizlet, Kahoot ו-Wordwall בנויים על כרטיסיות ועל חידוני רב-ברירה. LexiClash הוא משחק בניית מילים: התלמידים מרכיבים מילים על לוח אותיות, גלגל אותיות או אנגרמה. כך מתאמנים על איות, שליפה וזיהוי דפוסים — לא רק בחירה מתוך תשובות מוכנות. ובנוסף: בלי חשבונות לתלמידים, והכול חינם.' },
  { q: 'כמה זמן אורך מפגש כיתתי?', a: 'דו-קרב אוצר מילים אורך 2–3 דקות. סיבוב לכל הכיתה אורך 5–10 דקות. רוב המורים מריצים את זה כפעילות פתיחה של חמש דקות, כאתנחתא באמצע השיעור או כחזרה לקראת סוף השיעור.' },
  { q: 'זה מתאים ליסודי, לחטיבה ולתיכון?', a: 'לכל השלוש. רמת הקושי, מגבלת הזמן ורשימת המילים נקבעות לכל מפגש בנפרד. תלמידים צעירים משחקים עם מילים קצרות ורשימות קלות; תלמידי תיכון מנהלים דו-קרבות אוצר מילים מתקדמים בזמן קצוב.' },
  { q: 'זה עובד לכיתות עברית כשפה שנייה?', a: 'כן. חמישה מילונים מובנים בתוך המשחק (עברית, אנגלית, ספרדית, שוודית ויפנית) הופכים את LexiClash למתאים לעברית כשפה שנייה, לאנגלית כשפה זרה (ESL) ולכיתות קליטת עולים. התלמידים מתרגלים איות ושליפה ישירות בשפת היעד.' },
  { q: 'אפשר לעקוב אחרי המילים שכל תלמיד שולט בהן?', a: 'כן. לוח הבקרה למורה מציג דיוק לכל תלמיד, אילו מילים פוספסו, ואילו מילים הכשילו הכי הרבה תלמידים בכיתה — בסיס מצוין להערכה מעצבת ולתכנון החזרה הבאה.' },
];

const features = [
  { icon: '⚡', text: 'התלמידים מצטרפים תוך 5 שניות עם קוד בן 4 ספרות — בלי התחברות ובלי אימייל' },
  { icon: '🎯', text: 'שלושה מצבי משחק: לוח אותיות, ציד מילים וגלגל מילים' },
  { icon: '👥', text: 'משחק רב-משתתפים חי — עד 30 תלמידים יחד' },
  { icon: '⚔️', text: 'דו-קרבות אוצר מילים אחד-על-אחד — לתרגול בזוגות או בקבוצות קטנות' },
  { icon: '📚', text: 'מעלים את רשימות המילים שלכם — מכל יחידה, מכל נושא, מכל ספר לימוד' },
  { icon: '🌍', text: 'חמש שפות: אנגלית, עברית (מימין לשמאל), ספרדית, שוודית ויפנית' },
  { icon: '📊', text: 'לוח בקרה למורה: דיוק לכל תלמיד והמילים שהכי הרבה תלמידים פספסו' },
  { icon: '💸', text: 'הכול חינם — בלי גרסת פרימיום ובלי תשלום נסתר' },
];

const useCases = [
  { tag: 'פתיחה', title: 'פעילות פתיחה לשיעור', desc: 'גלגל מילים מהיר מרשימת המילים של אתמול — מעיר את הכיתה תוך חמש דקות.' },
  { tag: 'חזרה', title: 'סיכום סוף יחידה', desc: 'סיבוב לכל הכיתה על מילות המפתח של היחידה; הלוח חושף מיד על מה כדאי לחזור.' },
  { tag: 'שפה שנייה', title: 'תרגול בשפת היעד', desc: 'משחקים בשפת היעד של התלמידים — חמישה מילונים: עברית, אנגלית, ספרדית, שוודית ויפנית.' },
  { tag: 'ממלא מקום', title: 'שיעור בלי הכנה', desc: 'אפס הכנה מראש: בוחרים רשימה, מקרינים קוד, התלמידים משחקים. נגמר תוך 10 דקות.' },
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

  const learningResourceJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    '@id': `${BASE_URL}/he${PAGE_PATH}#resource`,
    name: 'משחקי מילים לכיתה בעברית',
    url: `${BASE_URL}/he${PAGE_PATH}`,
    inLanguage: 'he',
    learningResourceType: 'Game',
    educationalUse: ['Vocabulary Building', 'Classroom Activity', 'Hebrew Immersion', 'Formative Assessment', 'ESL Practice'],
    educationalLevel: ['Primary', 'Secondary', 'Adult Education'],
    typicalAgeRange: '8-99',
    isAccessibleForFree: true,
    teaches: 'העשרת אוצר מילים, איות, שליפה וזיהוי דפוסי מילים',
    audience: { '@type': 'EducationalAudience', educationalRole: 'student' },
    provider: {
      '@type': 'EducationalOrganization',
      '@id': `${BASE_URL}/he/education#org`,
      name: 'LexiClash Education',
      url: `${BASE_URL}/he/education`,
    },
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'בית', item: `${BASE_URL}/${locale}` },
      { '@type': 'ListItem', position: 2, name: 'חינוך', item: `${BASE_URL}/${locale}/education` },
      { '@type': 'ListItem', position: 3, name: 'משחקי מילים לכיתה', item: `${BASE_URL}/${locale}${PAGE_PATH}` },
    ],
  };

  return (
    <main dir="rtl" className="relative min-h-screen overflow-x-hidden bg-neo-navy text-neo-white texture-halftone">
      <Script id="ld-he-cvg-faq" type="application/ld+json">{JSON.stringify(faqJsonLd)}</Script>
      <Script id="ld-he-cvg-resource" type="application/ld+json">{JSON.stringify(learningResourceJsonLd)}</Script>
      <Script id="ld-he-cvg-breadcrumb" type="application/ld+json">{JSON.stringify(breadcrumbJsonLd)}</Script>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">

        <section className="grid items-center gap-10 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <span className="inline-block rotate-[-3deg] rounded-neo border-3 border-neo-black bg-neo-yellow px-3 py-1 font-neo-display text-xs font-black uppercase tracking-widest text-neo-navy shadow-hard">
              ★ למורים ★ חינם לתמיד ★
            </span>
            <h1 className="mt-5 font-neo-display text-5xl font-black leading-[0.92] tracking-tight sm:text-6xl lg:text-7xl">
              משחקי <span className="inline-block rotate-[-2deg] bg-neo-lime px-3 text-neo-navy shadow-hard">מילים</span>
              <br />לכיתה. <span className="text-neo-pink">חינם.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-neo-gray-200 sm:text-xl">
              LexiClash היא פלטפורמת משחקי מילים לכיתה להעשרת אוצר מילים: משחק כיתתי חי, דו-קרבות אחד-על-אחד, רשימות המילים שלכם וחמש שפות — והתלמידים אף פעם לא פותחים חשבון.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
              <Link href={`/${locale}/education/classroom-game`} className="rounded-neo border-4 border-neo-black bg-neo-yellow px-7 py-4 text-center font-neo-display font-black uppercase tracking-wider text-neo-navy shadow-hard-lg transition-all hover:translate-x-1 hover:-translate-y-1 hover:shadow-hard-xl">
                <span className="block text-base sm:text-lg">▶ התחילו משחק כיתתי</span>
                <span className="block text-[10px] font-bold uppercase tracking-widest opacity-70">חינם · ללא הרשמה לתלמידים</span>
              </Link>
              <Link href={`/${locale}/education/duels`} className="rounded-neo border-4 border-neo-black bg-neo-pink px-6 py-4 text-center font-neo-display font-black uppercase tracking-wider text-neo-white shadow-hard transition-all hover:translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg sm:px-7">
                <span className="block text-base sm:text-lg">⚔ הריצו דו-קרב 1v1</span>
                <span className="block text-[10px] font-bold uppercase tracking-widest opacity-80">תלמידים פנים מול פנים</span>
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-20">
          <h2 className="mb-8 font-neo-display text-3xl font-black uppercase sm:text-4xl">
            מה <span className="text-neo-lime">מקבלים</span>.
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {features.map((f, i) => (
              <li key={f.text} className="flex items-start gap-4 rounded-neo border-3 border-neo-black bg-neo-navy-light p-4 shadow-hard"
                  style={{ transform: i % 3 === 0 ? 'rotate(-0.4deg)' : i % 3 === 1 ? 'rotate(0.3deg)' : 'rotate(0deg)' }}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-neo border-3 border-neo-black bg-neo-lime text-xl shadow-hard-sm" aria-hidden="true">{f.icon}</span>
                <p className="pt-1.5 text-sm sm:text-base">{f.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-20">
          <h2 className="mb-8 font-neo-display text-3xl font-black uppercase sm:text-4xl">
            איך <span className="text-neo-cyan">מורים</span> משתמשים.
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {useCases.map((u) => (
              <div key={u.title} className="relative rounded-neo border-3 border-neo-black bg-neo-navy-light p-5 shadow-hard">
                <span className="absolute -top-3 right-3 border-2 border-neo-black bg-neo-yellow px-2 py-0.5 font-neo-display text-[10px] font-black uppercase tracking-widest text-neo-navy">{u.tag}</span>
                <h3 className="mt-2 font-neo-display text-base font-black">{u.title}</h3>
                <p className="mt-2 text-sm text-neo-gray-200">{u.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20">
          <h2 className="mb-6 font-neo-display text-3xl font-black uppercase sm:text-4xl">
            שאלות <span className="text-neo-cyan">למורים</span>.
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

        <section className="mt-20 mb-12 rounded-neo border-4 border-neo-black bg-neo-yellow p-8 text-neo-navy shadow-hard-xl sm:p-12">
          <h2 className="font-neo-display text-4xl font-black leading-[0.95] sm:text-5xl">
            עשר דקות נשארו בשיעור?
            <br /><span className="bg-neo-navy px-3 text-neo-yellow">הריצו משחק אוצר מילים.</span>
          </h2>
          <p className="mt-4 max-w-xl text-base font-bold sm:text-lg">בוחרים רשימה. מציגים קוד. משחקים. מסתכלים על הלוח. וזהו — כל המחזור.</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href={`/${locale}/education/classroom-game`} className="rounded-neo border-4 border-neo-black bg-neo-navy px-7 py-4 text-center font-neo-display text-base font-black uppercase tracking-wider text-neo-yellow shadow-hard-lg transition-all hover:translate-x-1 hover:-translate-y-1 hover:shadow-hard-xl sm:text-lg">
              ▶ התחילו משחק כיתתי
            </Link>
            <Link href={`/${locale}/education`} className="rounded-neo border-4 border-neo-black bg-neo-pink px-7 py-4 text-center font-neo-display text-base font-black uppercase tracking-wider text-neo-white shadow-hard transition-all hover:translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg sm:text-lg">
              ראו את מרכז החינוך
            </Link>
          </div>
          <p className="mt-6 text-sm font-bold text-neo-navy/70">
            מתלבטים בין הכלים?{' '}
            <Link href={`/${locale}/lexiclash-vs-wordwall-kahoot-quizlet`} className="underline decoration-2 underline-offset-2 hover:text-neo-navy">
              השוואה כנה: LexiClash מול Wordwall, Kahoot ו-Quizlet ←
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
