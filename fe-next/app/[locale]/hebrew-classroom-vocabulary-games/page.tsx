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
    title: 'משחקי מילים לכיתה - אוצר מילים חינוכי בעברית | LexiClash Education',
    description: 'משחקי מילים חינמיים לכיתה בעברית! דואלי אוצר מילים, משחק כיתתי חי, ללא הרשמה לתלמידים. תומך ב-5 שפות, מותאם לתכנית הלימודים, פועל בכל דפדפן. שימוש חינמי לכל המורים.',
    keywords: 'משחקי מילים לכיתה, משחקי מילים חינוכיים, משחק אוצר מילים, משחקי מילים למורים, משחקי מילים לתלמידים, משחקי מילים בעברית, משחקי מילים חינם, אוצר מילים לבית ספר, משחק מילים אונליין לכיתה, פעילות אוצר מילים',
    openGraph: {
      title: 'משחקי מילים לכיתה - חינם, ללא הרשמה | LexiClash Education',
      description: 'משחקי אוצר מילים חינמיים לכיתות בעברית. דואלי 1v1, משחק כיתתי חי, ללא הרשמה לתלמידים.',
      locale: 'he_IL',
      type: 'website',
      url: pageUrl,
      images: [{ url: `${BASE_URL}/og-image-he.webp`, width: 1200, height: 630, alt: 'LexiClash משחקי מילים לכיתה' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'משחקי מילים לכיתה - LexiClash',
      description: 'חינם, ללא הרשמה, פועל בדפדפן. דואלי אוצר מילים + משחק כיתתי חי.',
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
  { q: 'מה הם משחקי המילים הטובים ביותר לכיתה בעברית?', a: 'LexiClash Education נבנה במיוחד לכיתות: תלמידים מצטרפים עם קוד בן 4 ספרות (ללא הרשמה), המורה בוחר רשימת מילים, וכל הכיתה משחקת רב-משתתפים בזמן אמת ל-5-10 דקות. פועל בכל דפדפן ותומך בעברית, אנגלית, ספרדית, שוודית ויפנית — שימושי לכיתות עברית כשפה שנייה ושיעורי שפה.' },
  { q: 'האם תלמידים צריכים ליצור חשבונות?', a: 'לא. תלמידים מקלידים קוד בן 4 ספרות שהמורה מציג ומשחקים מיידית. רק מורים יוצרים חשבונות (חינם) כדי לשמור רשימות מילים ולצפות בלוחות התקדמות.' },
  { q: 'האם אני יכול לייבא רשימת אוצר מילים משלי?', a: 'כן. מורים יכולים להעלות רשימות מילים מותאמות אישית מכל יחידה, ספר לימוד או תכנית לימודים. השתמשו בהן בדואלי 1v1, משחקי מילים לכל הכיתה או תרגול מוקצה.' },
  { q: 'במה זה שונה מ-Quizlet, Kahoot או Wordwall?', a: 'הכלים האלה מבוססי כרטיסיות או חידונים. LexiClash הוא משחק בניית מילים: תלמידים מחפשים מילים על לוח בסגנון Boggle, גלגל אותיות או לוח אנגרמות. עדיף לאיות, היזכרות וזיהוי דפוסי מילים מאשר חידוני רב-ברירה. בנוסף, ללא חשבונות תלמידים ושכבה חינמית מלאה.' },
  { q: 'כמה זמן אורך מפגש כיתתי?', a: 'דואל אוצר מילים אורך 2-3 דקות. סיבוב רב-משתתפים לכל הכיתה אורך 5-10 דקות. רוב המורים משתמשים בו כחימום של 5 דקות, הפסקת מוח באמצע השיעור או סקירה בסוף השיעור.' },
  { q: 'האם זה מתאים ליסודי, חטיבה או תיכון?', a: 'לכל השלושה. רמת קושי, מגבלת זמן ורשימת מילים מוגדרים לכל מפגש. תלמידים צעירים משחקים עם מילים קצרות ורשימות קלות יותר; תלמידי תיכון יכולים לנהל דואלי אוצר מילים מתקדם בזמן מוגבל.' },
  { q: 'האם זה עובד לכיתות עברית כשפה שנייה?', a: 'כן — חמישה מילונים מובנים (אנגלית, עברית, ספרדית, שוודית, יפנית) הופכים את LexiClash למתאים לעברית כשפה שנייה, ESL, וקליטת עולים. תלמידים מתרגלים איות והיזכרות בשפת היעד.' },
  { q: 'האם אני יכול לעקוב אחרי אילו מילים תלמידים שלטו?', a: 'כן. לוח המורה מציג דיוק לכל תלמיד, מילים שהוחמצו ודפוסים בכל הכיתה (אילו מילים הכשילו הכי הרבה תלמידים). השתמשו בו להערכה מעצבת.' },
];

const features = [
  { icon: '⚡', text: 'תלמידים מצטרפים תוך 5 שניות עם קוד בן 4 ספרות — ללא התחברות, ללא אימייל' },
  { icon: '🎯', text: 'שלושה מצבי משחק: לוח Boggle, ציד מילים, גלגל מילים' },
  { icon: '👥', text: 'רב-משתתפים חי עד 30 תלמידים למפגש' },
  { icon: '⚔️', text: 'דואלי אוצר מילים 1v1 לתרגול מזווג או סיבובי תת-קבוצה' },
  { icon: '📚', text: 'העלו רשימות מילים מתכנית הלימודים שלכם — כל יחידה, כל נושא' },
  { icon: '🌍', text: 'חמש שפות: אנגלית, עברית (RTL), ספרדית, שוודית, יפנית' },
  { icon: '📊', text: 'לוח מורה: דיוק לכל תלמיד + דפוסי מילים שהוחמצו בכל הכיתה' },
  { icon: '💸', text: 'שכבה חינמית מכסה הכל — ללא שדרוג פרימיום' },
];

const useCases = [
  { tag: 'חימום', title: 'פתיחה של 5 דקות', desc: 'הריצו גלגל מילים מהיר מרשימת אוצר המילים של אתמול כדי להעיר את הכיתה.' },
  { tag: 'סקירה', title: 'סיכום סוף יחידה', desc: 'הריצו סיבוב Boggle לכל הכיתה על 30 מילות יעד של היחידה; הלוח מאיר פערים.' },
  { tag: 'ESL/עברית', title: 'תרגול שפת יעד', desc: 'שחקו בשפת היעד של התלמידים — תומך במילוני EN, HE, ES, SV, JA.' },
  { tag: 'מורה ממלא מקום', title: 'פעילות מורה ממלא מקום', desc: 'אפס הכנה — המורה הממלא בוחר רשימה, מקרין קוד, התלמידים משחקים. סיום ב-10 דקות.' },
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
    teaches: 'אוצר מילים, איות, זיהוי מילים, שימוש בהקשר',
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
              משחק אוצר המילים שמורים באמת משתמשים בו. רב-משתתפים חי, דואלי 1v1, רשימות המילים שלכם, חמש שפות — והתלמידים אף פעם לא צריכים חשבון.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
              <Link href={`/${locale}/education/classroom-game`} className="rounded-neo border-4 border-neo-black bg-neo-yellow px-7 py-4 text-center font-neo-display font-black uppercase tracking-wider text-neo-navy shadow-hard-lg transition-all hover:translate-x-1 hover:-translate-y-1 hover:shadow-hard-xl">
                <span className="block text-base sm:text-lg">▶ התחילו משחק כיתתי</span>
                <span className="block text-[10px] font-bold uppercase tracking-widest opacity-70">חינם · ללא הרשמה לתלמידים</span>
              </Link>
              <Link href={`/${locale}/education/duels`} className="rounded-neo border-4 border-neo-black bg-neo-pink px-6 py-4 text-center font-neo-display font-black uppercase tracking-wider text-neo-white shadow-hard transition-all hover:translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg sm:px-7">
                <span className="block text-base sm:text-lg">⚔ הריצו דואל 1v1</span>
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
          <p className="mt-4 max-w-xl text-base font-bold sm:text-lg">בחרו רשימה. הראו קוד. שחקו. סקרו את הלוח. זה כל הלולאה.</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href={`/${locale}/education/classroom-game`} className="rounded-neo border-4 border-neo-black bg-neo-navy px-7 py-4 text-center font-neo-display text-base font-black uppercase tracking-wider text-neo-yellow shadow-hard-lg transition-all hover:translate-x-1 hover:-translate-y-1 hover:shadow-hard-xl sm:text-lg">
              ▶ התחילו משחק כיתתי
            </Link>
            <Link href={`/${locale}/education`} className="rounded-neo border-4 border-neo-black bg-neo-pink px-7 py-4 text-center font-neo-display text-base font-black uppercase tracking-wider text-neo-white shadow-hard transition-all hover:translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg sm:text-lg">
              ראו את מרכז החינוך
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
