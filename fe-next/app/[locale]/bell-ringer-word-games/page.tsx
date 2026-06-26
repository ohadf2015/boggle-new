import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { TopBackLink } from '@/components/navigation/TopBackLink';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_PATH = '/bell-ringer-word-games';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isEnglish = locale === 'en';
  const pageUrl = `${BASE_URL}/en${PAGE_PATH}`;

  return {
    title: 'Bell Ringer Word Games — Free 5-Minute ELA Warm-Ups (2026) | LexiClash',
    description: 'Free bell ringer word games for ELA. A 5-minute start-of-class warm-up students join with a 4-digit code — no login, no prep. Vocabulary and spelling word-formation games, your word lists, any device.',
    keywords: 'bell ringer word games, bell ringer activities, ela bell ringers, vocabulary bell ringer, start of class word game, warm up word games, do now word game, morning warm up vocabulary, free bell ringer activities, 5 minute classroom game',
    openGraph: {
      title: 'Bell Ringer Word Games — Free 5-Minute Warm-Ups',
      description: 'Start class with a live word game. Join with a code, no login, no prep. Your word lists. Free forever.',
      locale: 'en_US',
      type: 'website',
      url: pageUrl,
      images: [{ url: `${BASE_URL}/images/education-hero-en.webp`, width: 1200, height: 675, alt: 'Bell ringer word games' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Bell Ringer Word Games — Free',
      description: '5-minute start-of-class word games. No login, no prep. Free.',
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
  { q: 'What makes a good bell ringer word game?', a: 'It starts instantly, runs in about 5 minutes, and needs zero prep so it works every single day. LexiClash fits: project a 4-digit code, students join on any device with no login, and a live word-formation round fills the first five minutes of class with vocabulary or spelling practice.' },
  { q: 'Do students need to log in for the warm-up?', a: 'No. A 4-digit join code means students are playing in seconds — critical for a bell ringer, where any login friction eats the whole activity.' },
  { q: 'Can I tie the bell ringer to my current unit?', a: 'Yes. Upload your unit vocabulary once and reuse it all week as a warm-up, or use a built-in list when you want true zero prep. Same word list can power Monday’s warm-up and Friday’s review.' },
  { q: 'Is it free?', a: 'Yes — fully free, no premium tier, no per-class limit beyond 30 students in a live game.' },
  { q: 'What skills does it practice?', a: 'Word formation on Boggle-style grids, anagrams, and wheels drills spelling, vocabulary recall, and letter patterns — a productive academic warm-up, not just a time-filler.' },
  { q: 'Will it work as a daily routine?', a: 'That’s the design. Because there is nothing to set up or log into, you can run it every day with a different word list, building a predictable start-of-class routine students recognize.' },
];

const fits = [
  { title: 'Instant start', desc: 'Project a code, students join, you’re playing. No login or setup to burn the first five minutes.' },
  { title: 'Built for 5 minutes', desc: 'Short rounds fit the bell-ringer window exactly — energize the room, then transition to the lesson.' },
  { title: 'Tie it to the unit', desc: 'Reuse this week’s vocabulary list as the daily warm-up so the bell ringer reinforces what you’re teaching.' },
  { title: 'A real routine', desc: 'Zero prep means you can run it every day — a predictable academic opener students settle into fast.' },
  { title: 'Productive, not filler', desc: 'Students spell and form real words under time pressure — active recall, not a worksheet they ignore.' },
  { title: 'Any device, no download', desc: 'Chromebooks, tablets, phones — browser only. Works the same whether students are 1:1 or BYOD.' },
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
      { '@type': 'ListItem', position: 3, name: 'Bell Ringer Word Games', item: `${BASE_URL}/${locale}${PAGE_PATH}` },
    ],
  };

  return (
    <main className="min-h-screen bg-neo-navy text-neo-white">
      <Script id="ld-bellringer-faq" type="application/ld+json">{JSON.stringify(faqJsonLd)}</Script>
      <Script id="ld-bellringer-breadcrumb" type="application/ld+json">{JSON.stringify(breadcrumbJsonLd)}</Script>

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <TopBackLink className="mb-4" />

        <h1 className="mb-6 font-neo-display text-4xl font-bold leading-tight sm:text-5xl">
          A bell ringer the whole class is playing before the bell stops.
        </h1>

        <p className="mb-8 text-lg leading-relaxed text-neo-gray-200">
          The best bell ringer is the one you can actually run every day. LexiClash is a <strong>5-minute, no-login, no-prep</strong>
          word game: project a 4-digit code, students join on any device, and a live word-formation round opens class with real
          vocabulary and spelling practice. Reuse this week&apos;s word list as the daily warm-up, or grab a built-in one for zero
          prep. Free, browser-based, and predictable enough to become a routine — productive, not just a time-filler.
        </p>

        <section className="mb-12 flex flex-col gap-3 sm:flex-row sm:gap-4">
          <Link href={`/${locale}/education/classroom-game`} className="rounded-neo border-4 border-neo-lime bg-neo-lime px-6 py-3 text-center font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg sm:px-8 sm:py-4">
            Start a Warm-Up Free
          </Link>
          <Link href={`/${locale}/education/duels`} className="rounded-neo border-4 border-neo-cyan bg-transparent px-6 py-3 text-center font-bold text-neo-cyan shadow-hard transition-all hover:bg-neo-cyan/10 sm:px-8 sm:py-4">
            1v1 Duel Warm-Up
          </Link>
          <Link href={`/${locale}/word-games-for-the-classroom`} className="rounded-neo border-4 border-neo-pink bg-transparent px-6 py-3 text-center font-bold text-neo-pink shadow-hard transition-all hover:bg-neo-pink/10 sm:px-8 sm:py-4">
            All Classroom Word Games
          </Link>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">Why it works as a daily opener</h2>
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
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">The 5-minute routine</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { n: '1', t: 'Project the code', d: 'As students walk in, the 4-digit join code is already on the board.' },
              { n: '2', t: 'They join and play', d: 'No login, any device. The round starts as the bell finishes ringing.' },
              { n: '3', t: 'Transition warm', d: 'Five minutes later the room is awake and primed — move straight into the lesson.' },
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
            <Link href={`/${locale}/vocabulary-games-for-middle-school`} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-lime/40">
              <h3 className="font-bold text-neo-cyan">Middle School Vocab Games</h3>
              <p className="mt-1 text-xs text-neo-gray-200">Free, no-login, grades 6–8</p>
            </Link>
            <Link href={`/${locale}/substitute-teacher-word-games`} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-lime/40">
              <h3 className="font-bold text-neo-cyan">Substitute Teacher Games</h3>
              <p className="mt-1 text-xs text-neo-gray-200">Zero-prep sub plans</p>
            </Link>
            <Link href={`/${locale}/education`} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-lime/40">
              <h3 className="font-bold text-neo-cyan">Education Hub</h3>
              <p className="mt-1 text-xs text-neo-gray-200">All classroom word games</p>
            </Link>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="font-neo-display text-2xl font-bold sm:text-3xl">Use it tomorrow morning</h2>
          <p className="mt-4 text-neo-gray-200">
            Drop in a word list tonight, and tomorrow&apos;s bell ringer is ready: project the code, students play, class starts
            warm. No signup, no install, no credit card.
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
