import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { getGamesForTeachersContent, EDUCATION_LOCALES, type EducationLocale } from './content';
import { TeacherAccessCTA } from '@/components/education/TeacherAccessCTA';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_PATH = '/education/games-for-teachers';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isTargetLocale = EDUCATION_LOCALES.includes(locale as EducationLocale);
  const pageUrl = `${BASE_URL}/${locale}${PAGE_PATH}`;
  const c = getGamesForTeachersContent(locale);
  const ogLocale = locale === 'he' ? 'he_IL' : locale === 'es' ? 'es_ES' : locale === 'sv' ? 'sv_SE' : locale === 'ja' ? 'ja_JP' : 'en_US';
  return {
    title: c.metaTitle,
    description: c.metaDescription,
    keywords: 'word games for teachers, vocabulary games for teachers, classroom games for teachers, teacher word games, free games for teachers, classroom activities for teachers, no-prep classroom games, sub day word games, brain break word games, teacher vocabulary tools',
    openGraph: {
      title: c.ogTitle,
      description: c.ogDescription,
      locale: ogLocale,
      type: 'website',
      url: pageUrl,
      images: [{ url: `${BASE_URL}/og-image-en.webp`, width: 1200, height: 630, alt: 'LexiClash word games for teachers' }],
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


const useCases = [
  { tag: '5-MIN', title: 'Lesson warm-up', desc: 'Open class with a quick Word Wheel from yesterday\'s vocab — wakes the room up.' },
  { tag: 'REVIEW', title: 'End-of-unit recap', desc: 'Boggle round on the unit\'s 30 target words; dashboard surfaces gaps for review.' },
  { tag: 'SUB-DAY', title: 'Substitute teacher', desc: 'Sub picks a saved list, projects code, students play. Zero permissions needed.' },
  { tag: 'BREAK', title: 'Mid-lesson brain break', desc: '3-minute vocabulary duel between desk partners — energizes without losing focus.' },
  { tag: 'ESL', title: 'Target-language drill', desc: 'Switch dictionaries (EN/ES/HE/SV/JA) per round for bilingual or ESL practice.' },
  { tag: 'CLUB', title: 'After-school club', desc: 'Word-game club runs itself — daily challenges + leaderboard create natural engagement.' },
];

const features = [
  { icon: '⏱️', text: 'Setup in under 60 seconds — pick list, share code, play' },
  { icon: '✅', text: 'Free student accounts — one-time setup, tracks XP and progress across sessions' },
  { icon: '📚', text: 'Upload custom curriculum word lists — any subject, any grade' },
  { icon: '📊', text: 'Per-student accuracy + class-wide missed-word patterns' },
  { icon: '👥', text: 'Live multiplayer up to 30 students; 1v1 duels for paired practice' },
  { icon: '🌍', text: 'Five languages: English, Hebrew (RTL), Spanish, Swedish, Japanese' },
  { icon: '💸', text: 'Free forever — no premium tier, no per-seat fee' },
  { icon: '🔒', text: 'Student-safe: no chat, no DMs, no external links during play' },
];

export default async function Page({ params }: PageProps) {
  const { locale } = await params;
  const c = getGamesForTeachersContent(locale);

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
    learningResourceType: 'Activity',
    educationalUse: ['Classroom Activity', 'Formative Assessment', 'Vocabulary Building', 'Brain Break', 'Substitute Teacher Activity'],
    educationalLevel: ['Primary', 'Secondary', 'Adult Education'],
    typicalAgeRange: '8-99',
    isAccessibleForFree: true,
    teaches: 'Vocabulary, spelling, word recognition, contextual usage',
    audience: { '@type': 'EducationalAudience', educationalRole: 'teacher' },
    provider: {
      '@type': 'EducationalOrganization',
      '@id': `${BASE_URL}/en/education#org`,
      name: 'LexiClash Education',
      url: `${BASE_URL}/en/education`,
    },
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE_URL}/${locale}` },
      { '@type': 'ListItem', position: 2, name: 'Education', item: `${BASE_URL}/${locale}/education` },
      { '@type': 'ListItem', position: 3, name: 'Games for Teachers', item: `${BASE_URL}/${locale}${PAGE_PATH}` },
    ],
  };

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-neo-navy text-neo-white texture-halftone">
      <Script id="ld-gft-faq" type="application/ld+json">{JSON.stringify(faqJsonLd)}</Script>
      <Script id="ld-gft-resource" type="application/ld+json">{JSON.stringify(learningResourceJsonLd)}</Script>
      <Script id="ld-gft-breadcrumb" type="application/ld+json">{JSON.stringify(breadcrumbJsonLd)}</Script>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">

        <section className="grid items-center gap-10 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <span className="inline-block rotate-[-3deg] rounded-neo border-3 border-neo-black bg-neo-purple px-3 py-1 font-neo-display text-xs font-black uppercase tracking-widest text-neo-white shadow-hard">
              {c.heroTag}
            </span>
            <h1 className="mt-5 font-neo-display text-5xl font-black leading-[0.92] tracking-tight sm:text-6xl lg:text-7xl">
              {c.heroH1.part1} <span className="inline-block rotate-[-2deg] bg-neo-purple px-3 text-neo-white shadow-hard">{c.heroH1.highlight}</span>
              <br /><span className="text-neo-lime">{c.heroH1.part2}</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-neo-gray-200 sm:text-xl">
              {c.heroSubtitle}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
              <Link href={`/${locale}/education/classroom-game`} className="rounded-neo border-4 border-neo-black bg-neo-purple px-7 py-4 text-center font-neo-display font-black uppercase tracking-wider text-neo-white shadow-hard-lg transition-all hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard-xl">
                <span className="block text-base sm:text-lg">▶ Start a Class Game</span>
                <span className="block text-[10px] font-bold uppercase tracking-widest opacity-70">{c.ctaSubLabel}</span>
              </Link>
              <Link href={`/${locale}/education`} className="rounded-neo border-4 border-neo-black bg-neo-cyan px-6 py-4 text-center font-neo-display font-black uppercase tracking-wider text-neo-navy shadow-hard transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg sm:px-7">
                <span className="block text-base sm:text-lg">⚙ Teacher Hub</span>
                <span className="block text-[10px] font-bold uppercase tracking-widest opacity-70">Word lists · Dashboard</span>
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-20">
          <h2 className="mb-8 font-neo-display text-3xl font-black uppercase sm:text-4xl">
            What you <span className="text-neo-purple">get</span>.
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {features.map((f, i) => (
              <li key={f.text} className="flex items-start gap-4 rounded-neo border-3 border-neo-black bg-neo-navy-light p-4 shadow-hard"
                  style={{ transform: i % 3 === 0 ? 'rotate(-0.4deg)' : i % 3 === 1 ? 'rotate(0.3deg)' : 'rotate(0deg)' }}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-neo border-3 border-neo-black bg-neo-purple text-xl shadow-hard-sm" aria-hidden="true">{f.icon}</span>
                <p className="pt-1.5 text-sm sm:text-base">{f.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-20">
          <h2 className="mb-8 font-neo-display text-3xl font-black uppercase sm:text-4xl">
            Six ways teachers <span className="text-neo-cyan">use it</span>.
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
          <Link href={`/${locale}/education/vocabulary-games-classroom`} className="rounded-neo border-2 border-neo-black bg-neo-navy-light px-4 py-2 text-neo-lime transition-all hover:bg-neo-navy">→ Classroom Vocabulary Games</Link>
          <Link href={`/${locale}/education/esl-word-games`} className="rounded-neo border-2 border-neo-black bg-neo-navy-light px-4 py-2 text-neo-cyan transition-all hover:bg-neo-navy">→ ESL Word Games</Link>
          <Link href={`/${locale}/education`} className="rounded-neo border-2 border-neo-black bg-neo-navy-light px-4 py-2 text-neo-white transition-all hover:bg-neo-navy">→ Education Hub</Link>
        </nav>

        <section className="mt-12 mb-12 rounded-neo border-4 border-neo-black bg-neo-purple p-8 text-neo-white shadow-hard-xl sm:p-12">
          <h2 className="font-neo-display text-4xl font-black leading-[0.95] sm:text-5xl">
            Stop searching.
            <br /><span className="bg-neo-navy px-3 text-neo-purple">Start playing.</span>
          </h2>
          <p className="mt-4 max-w-xl text-base font-bold sm:text-lg">Free forever. Free student accounts. Pick a list, students log in, watch them play.</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href={`/${locale}/education/classroom-game`} className="rounded-neo border-4 border-neo-black bg-neo-navy px-7 py-4 text-center font-neo-display text-base font-black uppercase tracking-wider text-neo-purple shadow-hard-lg transition-all hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard-xl sm:text-lg">
              ▶ Start a Game
            </Link>
            <Link href={`/${locale}/education/vocabulary-games-classroom`} className="rounded-neo border-4 border-neo-black bg-neo-cyan px-7 py-4 text-center font-neo-display text-base font-black uppercase tracking-wider text-neo-navy shadow-hard transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg sm:text-lg">
              See Classroom Games
            </Link>
          </div>
        </section>

        <TeacherAccessCTA />
      </div>
    </main>
  );
}
