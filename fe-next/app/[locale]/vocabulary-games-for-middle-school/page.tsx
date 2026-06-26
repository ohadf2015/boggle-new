import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { TopBackLink } from '@/components/navigation/TopBackLink';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_PATH = '/vocabulary-games-for-middle-school';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isEnglish = locale === 'en';
  const pageUrl = `${BASE_URL}/en${PAGE_PATH}`;

  return {
    title: 'Vocabulary Games for Middle School — Free, No-Login Multiplayer (2026) | LexiClash',
    description: 'Free vocabulary games for middle school. Live whole-class multiplayer and 1v1 duels students join with a 4-digit code — no logins, no signup. Use your own word lists, CEFR-scaled for ESL, ready in under a minute.',
    keywords: 'vocabulary games for middle school, middle school vocabulary games, free vocabulary games middle school, 6th grade vocabulary games, 7th grade vocabulary games, 8th grade vocabulary games, vocabulary review games middle school, no login vocabulary game, classroom vocabulary game middle school',
    openGraph: {
      title: 'Vocabulary Games for Middle School — Free & No-Login',
      description: 'Live multiplayer vocabulary games for grades 6–8. Join with a code, no signup. Your word lists. Free forever.',
      locale: 'en_US',
      type: 'website',
      url: pageUrl,
      images: [{ url: `${BASE_URL}/images/education-hero-en.webp`, width: 1200, height: 675, alt: 'Vocabulary games for middle school' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Vocabulary Games for Middle School — Free',
      description: 'Live multiplayer vocabulary games, grades 6–8. No login. Free.',
      images: [`${BASE_URL}/images/education-hero-en.webp`],
    },
    alternates: {
      canonical: pageUrl,
      languages: {
        'x-default': pageUrl,
        en: pageUrl,
        he: `${BASE_URL}/he/hebrew-classroom-vocabulary-games`,
        sv: `${BASE_URL}/sv/education`,
        ja: `${BASE_URL}/ja/education`,
        es: `${BASE_URL}/es/juegos-vocabulario-aula`,
      },
    },
    robots: { index: isEnglish, follow: true },
  };
}

const faqs = [
  { q: 'Are these vocabulary games really free for middle school?', a: 'Yes — LexiClash is fully free with no premium tier. Whole-class multiplayer, 1v1 duels, custom word lists, and the teacher dashboard are all free, with no per-student or per-class limit beyond 30 students per live game.' },
  { q: 'Do my middle schoolers need accounts or logins?', a: 'No. Students join a classroom game with a 4-digit code you project — no email, no signup, no rostering. That removes the biggest setup friction for 1:1 and BYOD classrooms.' },
  { q: 'Can I use my own vocabulary words?', a: 'Yes. Upload your unit or curriculum word list in under a minute and play it in whole-class games, 1v1 duels, or assigned practice. No import-format restrictions.' },
  { q: 'Is it a good fit for 6th, 7th, and 8th grade?', a: 'Middle school is the sweet spot. Difficulty is CEFR-scaled (A1–C2), so you can pitch it at grade level or stretch advanced students, and the word-formation gameplay rewards spelling and recall rather than guessing.' },
  { q: 'Does it work for ESL and newcomers in middle school?', a: 'Yes — native dictionaries for English, Spanish, Hebrew (RTL), Swedish, and Japanese let you run the same activity for ESL and bilingual students. Scale the difficulty down for newcomers and up for on-level students in the same class.' },
  { q: 'How long does a game take?', a: 'A typical round is 5–10 minutes — short enough for a warm-up, bell ringer, or end-of-class review, long enough to cover a full word list.' },
];

const fits = [
  { title: 'No logins to slow you down', desc: 'A 4-digit join code beats provisioning 30 accounts. Perfect for 1:1 Chromebook carts and BYOD where students don’t all have school emails.' },
  { title: 'Your word list, not ours', desc: 'Drop in this unit’s Tier 2 vocabulary and play it the same day. Built-in lists are there too when you want zero prep.' },
  { title: 'Spelling + recall, not guessing', desc: 'Students form and spell real words on Boggle-style grids, anagrams, and wheels — active retrieval, the skill that sticks.' },
  { title: 'Differentiate in one class', desc: 'CEFR A1–C2 scaling lets newcomers and advanced readers play the same activity at the right level.' },
  { title: 'Whole-class + 1v1', desc: 'Run a live class game on the projector, or pair students head-to-head for a fast competitive review.' },
  { title: 'Teacher dashboard', desc: 'See per-student accuracy and the words that tripped the whole class — instant formative data, no grading.' },
];

export default async function Page({ params }: PageProps) {
  const { locale } = await params;

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${BASE_URL}/en${PAGE_PATH}#faq`,
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE_URL}/${locale}` },
      { '@type': 'ListItem', position: 2, name: 'Education', item: `${BASE_URL}/${locale}/education` },
      { '@type': 'ListItem', position: 3, name: 'Vocabulary Games for Middle School', item: `${BASE_URL}/${locale}${PAGE_PATH}` },
    ],
  };

  return (
    <main className="min-h-screen bg-neo-navy text-neo-white">
      <Script id="ld-msvocab-faq" type="application/ld+json">{JSON.stringify(faqJsonLd)}</Script>
      <Script id="ld-msvocab-breadcrumb" type="application/ld+json">{JSON.stringify(breadcrumbJsonLd)}</Script>

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <TopBackLink className="mb-4" />

        <h1 className="mb-6 font-neo-display text-4xl font-bold leading-tight sm:text-5xl">
          Vocabulary games middle schoolers actually want to play.
        </h1>

        <p className="mb-8 text-lg leading-relaxed text-neo-gray-200">
          Middle school vocabulary review dies when it&apos;s a worksheet and stalls when it needs 30 logins. LexiClash is the
          fix: free, live word games your students join with a <strong>4-digit code — no accounts, no signup</strong>. Drop in
          this week&apos;s word list, project the code, and the whole class plays at once. Word-formation gameplay drills spelling
          and recall (not lucky guessing), difficulty scales A1–C2 for ESL and advanced readers, and you get a teacher dashboard
          for instant formative data. Ready in under a minute.
        </p>

        <section className="mb-12 flex flex-col gap-3 sm:flex-row sm:gap-4">
          <Link href={`/${locale}/education/classroom-game`} className="rounded-neo border-4 border-neo-lime bg-neo-lime px-6 py-3 text-center font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg sm:px-8 sm:py-4">
            Start a Class Game Free
          </Link>
          <Link href={`/${locale}/education/duels`} className="rounded-neo border-4 border-neo-cyan bg-transparent px-6 py-3 text-center font-bold text-neo-cyan shadow-hard transition-all hover:bg-neo-cyan/10 sm:px-8 sm:py-4">
            Run a 1v1 Duel
          </Link>
          <Link href={`/${locale}/education/vocabulary-games-classroom`} className="rounded-neo border-4 border-neo-pink bg-transparent px-6 py-3 text-center font-bold text-neo-pink shadow-hard transition-all hover:bg-neo-pink/10 sm:px-8 sm:py-4">
            All Classroom Games
          </Link>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">Why it works for grades 6–8</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {fits.map((item) => (
              <div key={item.title} className="rounded-neo border-3 border-neo-lime/40 bg-neo-navy/50 p-4 shadow-hard">
                <h3 className="mb-1 font-bold text-neo-lime">{item.title}</h3>
                <p className="text-sm text-neo-gray-200">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">From word list to live game in 3 steps</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { n: '1', t: 'Pick a list', d: 'Upload your unit vocabulary or use a built-in list. Choose a mode and time limit.' },
              { n: '2', t: 'Project the code', d: 'Students open the link and type the 4-digit join code. No accounts, any device.' },
              { n: '3', t: 'Play + review', d: 'Live leaderboard during play; per-student accuracy and class-wide gaps after.' },
            ].map((s) => (
              <div key={s.n} className="rounded-neo border-3 border-neo-cyan/40 bg-neo-navy/50 p-5 shadow-hard">
                <div className="mb-2 grid h-9 w-9 place-items-center rounded-neo border-3 border-neo-black bg-neo-cyan font-bold text-neo-navy">{s.n}</div>
                <h3 className="mb-1 font-bold text-neo-cyan">{s.t}</h3>
                <p className="text-sm text-neo-gray-200">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">Frequently asked questions</h2>
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <details key={`faq-${idx}`} className="group rounded-neo border-3 border-neo-gray-400 bg-neo-navy/50 shadow-hard">
                <summary className="flex cursor-pointer items-center justify-between px-6 py-4 font-bold">
                  <span>{faq.q}</span>
                  <span className="text-neo-lime transition-transform group-open:rotate-180">▼</span>
                </summary>
                <div className="border-t border-neo-gray-400 px-6 py-4 text-neo-gray-200">{faq.a}</div>
              </details>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-4 font-neo-display text-2xl font-bold sm:text-3xl">More for teachers</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Link href={`/${locale}/bell-ringer-word-games`} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-lime/40">
              <h3 className="font-bold text-neo-cyan">Bell Ringer Word Games</h3>
              <p className="mt-1 text-xs text-neo-gray-200">5-minute start-of-class openers</p>
            </Link>
            <Link href={`/${locale}/education/esl-word-games`} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-lime/40">
              <h3 className="font-bold text-neo-cyan">ESL Word Games</h3>
              <p className="mt-1 text-xs text-neo-gray-200">CEFR-scaled, 5 languages</p>
            </Link>
            <Link href={`/${locale}/education`} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-lime/40">
              <h3 className="font-bold text-neo-cyan">Education Hub</h3>
              <p className="mt-1 text-xs text-neo-gray-200">All classroom word games</p>
            </Link>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="font-neo-display text-2xl font-bold sm:text-3xl">Try it before next class</h2>
          <p className="mt-4 text-neo-gray-200">
            Take this week&apos;s vocabulary list, project a join code, and watch the whole class compete. No signup, no credit
            card, no email capture — if it isn&apos;t a fit, you&apos;ve lost five minutes.
          </p>
          <div className="mt-6">
            <Link href={`/${locale}/education/classroom-game`} className="inline-block rounded-neo border-4 border-neo-lime bg-neo-lime px-8 py-4 font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg">
              Start a Classroom Game Free
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
