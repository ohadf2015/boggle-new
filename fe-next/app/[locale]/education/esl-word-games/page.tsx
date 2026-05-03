import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_PATH = '/education/esl-word-games';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isTargetLocale = locale === 'en';
  const pageUrl = `${BASE_URL}/en${PAGE_PATH}`;
  return {
    title: 'ESL Word Games Online — Free, No Signup, 5 Languages | LexiClash',
    description: 'Free ESL word games online. Multiplayer + 1v1 vocabulary duels for English language learners. No student signup, runs in any browser, supports English, Spanish, Hebrew, Swedish, and Japanese dictionaries.',
    keywords: 'esl word games online, esl word games free, free esl games online, esl vocabulary games, english word games for esl students, esl games online no signup, free word games for english learners, efl word games, esl spelling games, vocabulary games for english learners',
    openGraph: {
      title: 'ESL Word Games Online — Free | LexiClash',
      description: 'Multiplayer + 1v1 word games for ESL classes. No student signup. 5 languages.',
      locale: 'en_US',
      type: 'website',
      url: pageUrl,
      images: [{ url: `${BASE_URL}/og-image-en.webp`, width: 1200, height: 630, alt: 'LexiClash ESL word games' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Free ESL Word Games Online | LexiClash',
      description: 'Multiplayer + 1v1 word games for ESL classes. No signup.',
      images: [`${BASE_URL}/og-image-en.webp`],
    },
    alternates: {
      canonical: pageUrl,
      languages: {
        'x-default': pageUrl,
        en: pageUrl,
        he: `${BASE_URL}/he/education`,
        sv: `${BASE_URL}/sv/education`,
        ja: `${BASE_URL}/ja/education`,
        es: `${BASE_URL}/es/education`,
      },
    },
    robots: isTargetLocale ? { index: true, follow: true } : { index: false, follow: true },
  };
}

const faqs = [
  { q: 'What are the best free ESL word games online?', a: 'For ESL classrooms, the best free word games are ones that combine spelling practice with social play. LexiClash runs Boggle-style word search, scrambled-letter wheels, and 1v1 vocabulary duels — all free, no student signup, and with full English dictionaries (plus Spanish, Hebrew, Swedish, Japanese for bilingual programs).' },
  { q: 'Do ESL students need an account?', a: 'No. Students join with a 4-digit code on any phone or laptop browser. Reduces ESL-classroom friction (account confusion, password resets, parental email requirements).' },
  { q: 'How do these games help English learners?', a: 'Word-formation games practice spelling, letter patterns, sight-word recognition, and vocabulary recall — the four bottlenecks for early ESL/EFL learners. Real-time multiplayer keeps engagement high without high-stakes pressure.' },
  { q: 'Can I scaffold for different proficiency levels?', a: 'Yes. Set difficulty per session: shorter words and longer time for beginners; longer words and tight timers for advanced learners. You can also load custom vocabulary lists from your unit.' },
  { q: 'Does it work for adult ESL/EFL classes?', a: 'Yes. Adult learners get the same browser-based access (no app store), no childish UI, and competitive multiplayer that adults find more engaging than flashcards.' },
  { q: 'What about bilingual or dual-language programs?', a: 'LexiClash has full dictionaries in 5 languages (English, Spanish, Hebrew with RTL, Swedish, Japanese). Switch languages between rounds to practice each side of a bilingual program.' },
  { q: 'Is it free for non-profit ESL programs?', a: 'Yes — fully free for any classroom use. No premium tier, no per-student fee, no district license required.' },
];

const features = [
  { icon: '🌍', text: 'Five built-in dictionaries: English, Spanish, Hebrew (RTL), Swedish, Japanese' },
  { icon: '⚡', text: 'No student accounts — drops a major ESL-class onboarding bottleneck' },
  { icon: '👥', text: 'Live multiplayer up to 30 students; pair-up duels for 2-by-2 practice' },
  { icon: '📈', text: 'Per-student accuracy + class-wide missed-word patterns' },
  { icon: '🎯', text: 'Three game modes: Boggle grid, Word Hunt, Word Wheel' },
  { icon: '📱', text: 'Works on any phone, tablet, Chromebook, or laptop browser' },
  { icon: '⏱️', text: '5-minute warm-up format fits any lesson plan' },
  { icon: '💸', text: 'Completely free — no premium tier, no per-seat fee' },
];

const proficiencyLevels = [
  { tag: 'A1-A2', title: 'Beginner', desc: '3-4 letter words, longer timer, sight-word focus. Use the Word Wheel mode for guided practice.' },
  { tag: 'B1-B2', title: 'Intermediate', desc: 'Mixed lengths, standard timer. Boggle grid surfaces vocabulary patterns and prefixes.' },
  { tag: 'C1-C2', title: 'Advanced', desc: 'Long words, tight timer, custom advanced lists (TOEFL, IELTS, academic vocab).' },
];

export default async function Page({ params }: PageProps) {
  const { locale } = await params;

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${BASE_URL}/en${PAGE_PATH}#faq`,
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };

  const learningResourceJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    '@id': `${BASE_URL}/en${PAGE_PATH}#resource`,
    name: 'ESL Word Games Online — Free',
    url: `${BASE_URL}/en${PAGE_PATH}`,
    inLanguage: 'en',
    learningResourceType: 'Game',
    educationalUse: ['ESL Practice', 'EFL Practice', 'Vocabulary Building', 'Spelling Practice', 'Bilingual Programs'],
    educationalLevel: ['Beginner', 'Intermediate', 'Advanced', 'Adult Education'],
    typicalAgeRange: '8-99',
    isAccessibleForFree: true,
    teaches: 'English vocabulary, spelling, letter patterns, sight-word recognition',
    audience: { '@type': 'EducationalAudience', educationalRole: 'student', audienceType: 'ESL/EFL learners' },
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
      { '@type': 'ListItem', position: 3, name: 'ESL Word Games', item: `${BASE_URL}/${locale}${PAGE_PATH}` },
    ],
  };

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-neo-navy text-neo-white texture-halftone">
      <Script id="ld-esl-faq" type="application/ld+json">{JSON.stringify(faqJsonLd)}</Script>
      <Script id="ld-esl-resource" type="application/ld+json">{JSON.stringify(learningResourceJsonLd)}</Script>
      <Script id="ld-esl-breadcrumb" type="application/ld+json">{JSON.stringify(breadcrumbJsonLd)}</Script>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">

        <section className="grid items-center gap-10 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <span className="inline-block rotate-[-3deg] rounded-neo border-3 border-neo-black bg-neo-cyan px-3 py-1 font-neo-display text-xs font-black uppercase tracking-widest text-neo-navy shadow-hard">
              ★ ESL / EFL ★ Free Forever ★
            </span>
            <h1 className="mt-5 font-neo-display text-5xl font-black leading-[0.92] tracking-tight sm:text-6xl lg:text-7xl">
              <span className="inline-block rotate-[-2deg] bg-neo-cyan px-3 text-neo-navy shadow-hard">ESL</span> Word Games.
              <br /><span className="text-neo-lime">Online.</span> <span className="text-neo-pink">Free.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-neo-gray-200 sm:text-xl">
              Word-formation games designed for English language learners. No student signup, five dictionaries, and a teacher dashboard that surfaces which words tripped which students.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
              <Link href={`/${locale}/education/classroom-game`} className="rounded-neo border-4 border-neo-black bg-neo-cyan px-7 py-4 text-center font-neo-display font-black uppercase tracking-wider text-neo-navy shadow-hard-lg transition-all hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard-xl">
                <span className="block text-base sm:text-lg">▶ Run an ESL Game</span>
                <span className="block text-[10px] font-bold uppercase tracking-widest opacity-70">Whole-class · 5 minutes</span>
              </Link>
              <Link href={`/${locale}/education/duels`} className="rounded-neo border-4 border-neo-black bg-neo-pink px-6 py-4 text-center font-neo-display font-black uppercase tracking-wider text-neo-white shadow-hard transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg sm:px-7">
                <span className="block text-base sm:text-lg">⚔ Pair-up Duels</span>
                <span className="block text-[10px] font-bold uppercase tracking-widest opacity-80">2-by-2 practice</span>
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-20">
          <h2 className="mb-8 font-neo-display text-3xl font-black uppercase sm:text-4xl">
            Built for <span className="text-neo-cyan">English learners</span>.
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {features.map((f, i) => (
              <li key={f.text} className="flex items-start gap-4 rounded-neo border-3 border-neo-black bg-neo-navy-light p-4 shadow-hard"
                  style={{ transform: i % 3 === 0 ? 'rotate(-0.4deg)' : i % 3 === 1 ? 'rotate(0.3deg)' : 'rotate(0deg)' }}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-neo border-3 border-neo-black bg-neo-cyan text-xl shadow-hard-sm" aria-hidden="true">{f.icon}</span>
                <p className="pt-1.5 text-sm sm:text-base">{f.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-20">
          <h2 className="mb-6 font-neo-display text-3xl font-black uppercase sm:text-4xl">
            Scale to <span className="text-neo-lime">CEFR</span> level.
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {proficiencyLevels.map((p) => (
              <div key={p.title} className="relative rounded-neo border-3 border-neo-black bg-neo-navy-light p-5 shadow-hard">
                <span className="absolute -top-3 left-3 border-2 border-neo-black bg-neo-yellow px-2 py-0.5 font-neo-display text-[10px] font-black uppercase tracking-widest text-neo-navy">{p.tag}</span>
                <h3 className="mt-2 font-neo-display text-lg font-black">{p.title}</h3>
                <p className="mt-2 text-sm text-neo-gray-200">{p.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20">
          <h2 className="mb-6 font-neo-display text-3xl font-black uppercase sm:text-4xl">
            ESL teacher <span className="text-neo-cyan">FAQ</span>.
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

        <section className="mt-20 mb-12 rounded-neo border-4 border-neo-black bg-neo-cyan p-8 text-neo-navy shadow-hard-xl sm:p-12">
          <h2 className="font-neo-display text-4xl font-black leading-[0.95] sm:text-5xl">
            Five minutes left?
            <br /><span className="bg-neo-navy px-3 text-neo-cyan">Run a vocab round.</span>
          </h2>
          <p className="mt-4 max-w-xl text-base font-bold sm:text-lg">No student accounts, no app downloads, no prep. Pick a list, share the code, play.</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href={`/${locale}/education/classroom-game`} className="rounded-neo border-4 border-neo-black bg-neo-navy px-7 py-4 text-center font-neo-display text-base font-black uppercase tracking-wider text-neo-cyan shadow-hard-lg transition-all hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard-xl sm:text-lg">
              ▶ Start ESL Game
            </Link>
            <Link href={`/${locale}/education/vocabulary-games-classroom`} className="rounded-neo border-4 border-neo-black bg-neo-pink px-7 py-4 text-center font-neo-display text-base font-black uppercase tracking-wider text-neo-white shadow-hard transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg sm:text-lg">
              See Classroom Games
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
