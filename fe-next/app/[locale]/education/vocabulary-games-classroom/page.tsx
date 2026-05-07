import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { getVocabClassroomContent, EDUCATION_LOCALES, type EducationLocale } from './content';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_PATH = '/education/vocabulary-games-classroom';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isTargetLocale = EDUCATION_LOCALES.includes(locale as EducationLocale);
  const pageUrl = `${BASE_URL}/${locale}${PAGE_PATH}`;
  const c = getVocabClassroomContent(locale);
  const ogLocale = locale === 'he' ? 'he_IL' : locale === 'es' ? 'es_ES' : locale === 'sv' ? 'sv_SE' : locale === 'ja' ? 'ja_JP' : 'en_US';
  return {
    title: c.metaTitle,
    description: c.metaDescription,
    keywords: 'vocabulary games for classroom, classroom vocabulary games, free vocabulary games, classroom word games, vocabulary games for students, vocabulary games online free, multiplayer vocabulary game, free vocabulary game for teachers, free word games for kids classroom',
    openGraph: {
      title: c.ogTitle,
      description: c.ogDescription,
      locale: ogLocale,
      type: 'website',
      url: pageUrl,
      images: [{ url: `${BASE_URL}/og-image-en.webp`, width: 1200, height: 630, alt: 'LexiClash classroom vocabulary games' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: c.ogTitle,
      description: c.twitterDescription,
      images: [`${BASE_URL}/og-image-en.webp`],
    },
    alternates: {
      canonical: pageUrl,
      languages: {
        'x-default': `${BASE_URL}/en${PAGE_PATH}`,
        en: `${BASE_URL}/en${PAGE_PATH}`,
        he: `${BASE_URL}/he${PAGE_PATH}`,
        sv: `${BASE_URL}/sv${PAGE_PATH}`,
        ja: `${BASE_URL}/ja${PAGE_PATH}`,
        es: `${BASE_URL}/es${PAGE_PATH}`,
      },
    },
    robots: isTargetLocale ? { index: true, follow: true } : { index: false, follow: true },
  };
}


const compareRows: ReadonlyArray<readonly [string, string, string, string, string]> = [
  ['Free tier (full features)', '✓', 'Limited', '✓ basic', 'Limited'],
  ['Free student accounts', '✓ always free', '✗ paid tiers', '✗ paid tiers', '✗ paid tiers'],
  ['Word-formation gameplay', '✓ Boggle/Wheel/Anagram', '✗ flashcards', '✗ templates', '✗ quizzes'],
  ['Live whole-class multiplayer', '✓', '✓ paid', '✗', '✓'],
  ['1v1 vocabulary duels', '✓', '✓ paid', '✗', '✗'],
  ['5 languages incl. RTL', '✓', '✗', '✗', '✗'],
  ['Custom word lists', '✓', '✓', '✓', '✓'],
  ['Class analytics dashboard', '✓ free', '✓ paid', 'Basic', '✓ paid'],
];

const features = [
  { icon: '⚡', text: 'Free student accounts — quick signup, tracks XP and progress across sessions' },
  { icon: '🎯', text: 'Three game modes: Boggle grid, Word Hunt, Word Wheel' },
  { icon: '👥', text: 'Live multiplayer up to 30 students per session' },
  { icon: '⚔️', text: '1v1 vocabulary duels for paired practice or sub-team rounds' },
  { icon: '📚', text: 'Upload your own curriculum word lists — any unit, any subject' },
  { icon: '🌍', text: 'Five languages: English, Hebrew (RTL), Spanish, Swedish, Japanese' },
  { icon: '📊', text: 'Teacher dashboard: per-student accuracy + missed-word patterns' },
  { icon: '💸', text: 'Free tier covers everything — no premium upsell' },
];

const useCases = [
  { tag: 'WARM-UP', title: '5-minute opener', desc: 'Spin a quick Word Wheel from yesterday\'s vocabulary list to wake the class up.' },
  { tag: 'REVIEW', title: 'End-of-unit recap', desc: 'Run a whole-class Boggle round on the unit\'s 30 target words; dashboard surfaces gaps.' },
  { tag: 'ESL', title: 'Target-language practice', desc: 'Play in students\' target language — supports EN, HE, ES, SV, JA dictionaries.' },
  { tag: 'SUB DAY', title: 'Substitute teacher activity', desc: 'Zero prep — sub picks a list, projects a code, students play. Done in 10 minutes.' },
];

export default async function Page({ params }: PageProps) {
  const { locale } = await params;
  const c = getVocabClassroomContent(locale);

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${BASE_URL}/${locale}${PAGE_PATH}#faq`,
    mainEntity: c.faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };

  const learningResourceJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    '@id': `${BASE_URL}/${locale}${PAGE_PATH}#resource`,
    name: c.metaTitle,
    url: `${BASE_URL}/${locale}${PAGE_PATH}`,
    inLanguage: 'en',
    learningResourceType: 'Game',
    educationalUse: ['Vocabulary Building', 'Classroom Activity', 'Whole-Class Multiplayer', 'Formative Assessment', 'ESL Practice'],
    educationalLevel: ['Primary', 'Secondary', 'Adult Education'],
    typicalAgeRange: '8-99',
    isAccessibleForFree: true,
    teaches: 'Vocabulary, spelling, word recognition, contextual word usage',
    audience: { '@type': 'EducationalAudience', educationalRole: 'student' },
    provider: {
      '@type': 'EducationalOrganization',
      '@id': `${BASE_URL}/en/education#org`,
      name: 'LexiClash Education',
      url: `${BASE_URL}/en/education`,
    },
  };

  const howToJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    '@id': `${BASE_URL}/en${PAGE_PATH}#howto`,
    name: 'How to Run a Vocabulary Game in Your Classroom',
    description: 'Three steps to a live classroom vocabulary game — under 60 seconds setup once students have their free accounts.',
    totalTime: 'PT1M',
    step: [
      { '@type': 'HowToStep', position: 1, name: 'Pick a word list', text: 'Open the teacher dashboard, choose a curriculum list (yours or one of ours), and pick game mode + time limit.' },
      { '@type': 'HowToStep', position: 2, name: 'Students join', text: 'Students log in with their free LexiClash account on any device. The teacher\'s session appears in their dashboard.' },
      { '@type': 'HowToStep', position: 3, name: 'Play and review', text: 'Students play live for 5–10 minutes. Live leaderboard during play; per-student accuracy + class-wide gaps after.' },
    ],
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE_URL}/${locale}` },
      { '@type': 'ListItem', position: 2, name: 'Education', item: `${BASE_URL}/${locale}/education` },
      { '@type': 'ListItem', position: 3, name: 'Vocabulary Games for Classroom', item: `${BASE_URL}/${locale}${PAGE_PATH}` },
    ],
  };

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-neo-navy text-neo-white texture-halftone">
      <Script id="ld-vgc-faq" type="application/ld+json">{JSON.stringify(faqJsonLd)}</Script>
      <Script id="ld-vgc-resource" type="application/ld+json">{JSON.stringify(learningResourceJsonLd)}</Script>
      <Script id="ld-vgc-howto" type="application/ld+json">{JSON.stringify(howToJsonLd)}</Script>
      <Script id="ld-vgc-breadcrumb" type="application/ld+json">{JSON.stringify(breadcrumbJsonLd)}</Script>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">

        <section className="grid items-center gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <span className="inline-block rotate-[-3deg] rounded-neo border-3 border-neo-black bg-neo-yellow px-3 py-1 font-neo-display text-xs font-black uppercase tracking-widest text-neo-navy shadow-hard">
              {c.heroTag}
            </span>
            <h1 className="mt-5 font-neo-display text-5xl font-black leading-[0.92] tracking-tight sm:text-6xl lg:text-7xl">
              {c.heroH1.line1} <span className="inline-block rotate-[-2deg] bg-neo-lime px-3 text-neo-navy shadow-hard">{c.heroH1.highlight}</span>
              <br />{c.heroH1.line2}
              <br /><span className="text-neo-pink">{c.heroH1.line3}</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-neo-gray-200 sm:text-xl">
              {c.heroSubtitle}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
              <Link href={`/${locale}/education/classroom-game`} className="rounded-neo border-4 border-neo-black bg-neo-yellow px-7 py-4 text-center font-neo-display font-black uppercase tracking-wider text-neo-navy shadow-hard-lg transition-all hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard-xl">
                <span className="block text-base sm:text-lg">▶ Start a Classroom Game</span>
                <span className="block text-[10px] font-bold uppercase tracking-widest opacity-70">{c.ctaSubLabel}</span>
              </Link>
              <Link href={`/${locale}/education/duels`} className="rounded-neo border-4 border-neo-black bg-neo-pink px-6 py-4 text-center font-neo-display font-black uppercase tracking-wider text-neo-white shadow-hard transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg sm:px-7">
                <span className="block text-base sm:text-lg">⚔ Run a 1v1 Duel</span>
                <span className="block text-[10px] font-bold uppercase tracking-widest opacity-80">Pair students head-to-head</span>
              </Link>
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs uppercase tracking-widest text-neo-gray-200">
              <span className="inline-flex items-center gap-2"><span className="text-neo-lime">●</span> 5 languages</span>
              <span>K-12 + adult ESL</span>
              <span className="text-neo-yellow">free student accounts</span>
              <span>5-min sessions</span>
            </div>
          </div>
          <div className="lg:col-span-5">
            <div className="rounded-neo border-4 border-neo-black bg-neo-navy-light p-6 shadow-hard-xl">
              <h2 className="font-neo-display text-xl font-black uppercase tracking-wide text-neo-yellow">{c.whyTitle}</h2>
              <ul className="mt-4 space-y-3 text-sm text-neo-gray-200">
                {c.whyPoints.map((point, i) => (
                  <li key={i} className="flex gap-3"><span className="text-neo-lime">✓</span><span>{point}</span></li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="mt-20">
          <h2 className="mb-8 font-neo-display text-3xl font-black uppercase sm:text-4xl">
            What you <span className="text-neo-lime">get</span>.
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
          <h2 className="mb-2 font-neo-display text-3xl font-black uppercase sm:text-4xl">
            LexiClash <span className="text-neo-pink">vs</span> the usual suspects.
          </h2>
          <p className="mb-6 text-sm text-neo-gray-300 sm:text-base">A teacher-honest comparison. We&apos;re not for everyone — just for teachers who want word games without a paywall.</p>
          <div className="overflow-x-auto rounded-neo border-4 border-neo-black bg-neo-navy-light shadow-hard-lg">
            <table className="w-full border-collapse text-sm sm:text-base">
              <thead>
                <tr className="border-b-3 border-neo-black bg-neo-navy">
                  <th className="px-4 py-4 text-left font-neo-display font-black uppercase tracking-wider text-neo-yellow">Feature</th>
                  <th className="px-4 py-4 text-center font-neo-display font-black uppercase tracking-wider text-neo-lime">LexiClash</th>
                  <th className="px-4 py-4 text-center font-neo-display font-black uppercase tracking-wider text-neo-gray-300">Quizlet</th>
                  <th className="px-4 py-4 text-center font-neo-display font-black uppercase tracking-wider text-neo-gray-300">Wordwall</th>
                  <th className="px-4 py-4 text-center font-neo-display font-black uppercase tracking-wider text-neo-gray-300">Kahoot</th>
                </tr>
              </thead>
              <tbody>
                {compareRows.map((row, i) => (
                  <tr key={row[0]} className={`border-b border-neo-gray-400/20 ${i % 2 ? 'bg-neo-navy/30' : ''}`}>
                    <td className="px-4 py-3 font-bold">{row[0]}</td>
                    <td className="px-4 py-3 text-center font-bold text-neo-lime">{row[1]}</td>
                    <td className="px-4 py-3 text-center text-neo-gray-300">{row[2]}</td>
                    <td className="px-4 py-3 text-center text-neo-gray-300">{row[3]}</td>
                    <td className="px-4 py-3 text-center text-neo-gray-300">{row[4]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-20">
          <h2 className="mb-8 font-neo-display text-3xl font-black uppercase sm:text-4xl">
            How <span className="text-neo-cyan">teachers</span> use it.
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {useCases.map((u) => (
              <div key={u.title} className="relative rounded-neo border-3 border-neo-black bg-neo-navy-light p-5 shadow-hard">
                <span className="absolute -top-3 left-3 border-2 border-neo-black bg-neo-yellow px-2 py-0.5 font-neo-display text-[10px] font-black uppercase tracking-widest text-neo-navy">{u.tag}</span>
                <h3 className="mt-2 font-neo-display text-base font-black">{u.title}</h3>
                <p className="mt-2 text-sm text-neo-gray-200">{u.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20">
          <h2 className="mb-6 font-neo-display text-3xl font-black uppercase sm:text-4xl">
            {c.faqTitle}
          </h2>
          <div className="space-y-3">
            {c.faqs.map((faq, idx) => (
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

        <nav className="mt-16 flex flex-wrap gap-3 text-sm font-bold" aria-label="Related education resources">
          <Link href={`/${locale}/education/esl-word-games`} className="rounded-neo border-2 border-neo-black bg-neo-navy-light px-4 py-2 text-neo-cyan transition-all hover:bg-neo-navy">→ ESL Word Games</Link>
          <Link href={`/${locale}/education/games-for-teachers`} className="rounded-neo border-2 border-neo-black bg-neo-navy-light px-4 py-2 text-neo-lime transition-all hover:bg-neo-navy">→ Games for Teachers</Link>
          <Link href={`/${locale}/education`} className="rounded-neo border-2 border-neo-black bg-neo-navy-light px-4 py-2 text-neo-white transition-all hover:bg-neo-navy">→ Education Hub</Link>
        </nav>

        <section className="mt-12 mb-12 rounded-neo border-4 border-neo-black bg-neo-yellow p-8 text-neo-navy shadow-hard-xl sm:p-12">
          <h2 className="font-neo-display text-4xl font-black leading-[0.95] sm:text-5xl">
            Ten minutes left in class?
            <br /><span className="bg-neo-navy px-3 text-neo-yellow">Run a vocab game.</span>
          </h2>
          <p className="mt-4 max-w-xl text-base font-bold sm:text-lg">
            Pick a list. Show the code. Play. Review the dashboard. That&apos;s the whole loop.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href={`/${locale}/education/classroom-game`} className="rounded-neo border-4 border-neo-black bg-neo-navy px-7 py-4 text-center font-neo-display text-base font-black uppercase tracking-wider text-neo-lime shadow-hard-lg transition-all hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard-xl sm:text-lg">
              ▶ Start Classroom Game
            </Link>
            <Link href={`/${locale}/education`} className="rounded-neo border-4 border-neo-black bg-neo-pink px-7 py-4 text-center font-neo-display text-base font-black uppercase tracking-wider text-neo-white shadow-hard transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg sm:text-lg">
              See Education Hub
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
