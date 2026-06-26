import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { TopBackLink } from '@/components/navigation/TopBackLink';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_PATH = '/word-games-for-the-classroom';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isEnglish = locale === 'en';
  const pageUrl = `${BASE_URL}/en${PAGE_PATH}`;

  return {
    title: 'Word Games for the Classroom — Free, No Login, No Download (2026) | LexiClash',
    description: 'Free word games for the classroom with no login and no download. Students join live multiplayer games with a 4-digit code in seconds. Use your own word lists, 5 languages, works on any device. Zero prep for teachers.',
    keywords: 'word games for the classroom, classroom word games, free word games classroom, word games no login, word games no download, online word games classroom, word games for students, free educational games no login, whole class word game',
    openGraph: {
      title: 'Word Games for the Classroom — Free, No Login',
      description: 'Live multiplayer word games students join with a code. No download, no signup. Any device. Free forever.',
      locale: 'en_US',
      type: 'website',
      url: pageUrl,
      images: [{ url: `${BASE_URL}/og-image-en.webp`, width: 1200, height: 630, alt: 'Word games for the classroom' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Word Games for the Classroom — Free',
      description: 'Live multiplayer word games. No login, no download. Free.',
      images: [`${BASE_URL}/og-image-en.webp`],
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
  { q: 'Do students need a login to play these classroom word games?', a: 'No. Students join a live game with a 4-digit code you project — no email, no account, no signup. That is the whole point: zero login friction so you can start a game the moment you decide to.' },
  { q: 'Is there anything to download or install?', a: 'No. LexiClash runs in any browser on Chromebooks, laptops, tablets, and phones. Nothing to install, no app-store approval, no IT ticket.' },
  { q: 'Are the word games actually free?', a: 'Yes — fully free, no premium tier. Whole-class multiplayer, 1v1 duels, custom word lists, and the teacher dashboard are all included.' },
  { q: 'What kinds of word games are there?', a: 'Word-formation gameplay on Boggle-style grids, anagrams, and word wheels, played live as a whole class or 1v1. Students find and spell real words against the clock — great for vocabulary review, spelling, and brain breaks.' },
  { q: 'Can I use my own words or curriculum list?', a: 'Yes. Upload your unit vocabulary in under a minute, or use a built-in list for instant play. No format restrictions.' },
  { q: 'How many students can play at once?', a: 'Up to 30 students in a single live game, on any mix of devices. Pair students 1v1 for duels when you want head-to-head.' },
];

const fits = [
  { title: 'No login, ever', desc: 'A 4-digit join code replaces 30 accounts. Works in 1:1, BYOD, and shared-device rooms where students don’t all have school emails.' },
  { title: 'No download, no IT ticket', desc: 'Pure browser. Chromebooks, tablets, phones, laptops — open a link and play. Nothing to install or approve.' },
  { title: 'Zero prep', desc: 'Built-in word lists mean you can start a game with no setup. Bring your own list when you want it tied to the unit.' },
  { title: 'Real word practice', desc: 'Students spell and form words under time pressure — active recall, not multiple-choice guessing.' },
  { title: 'Whole-class or 1v1', desc: 'Run it on the projector for the whole room, or pair students head-to-head for fast competitive review.' },
  { title: '5 languages', desc: 'Native dictionaries in English, Spanish, Hebrew (RTL), Swedish, and Japanese, CEFR-scaled for ESL and language classes.' },
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
      { '@type': 'ListItem', position: 3, name: 'Word Games for the Classroom', item: `${BASE_URL}/${locale}${PAGE_PATH}` },
    ],
  };

  return (
    <main className="min-h-screen bg-neo-navy text-neo-white">
      <Script id="ld-classwordgames-faq" type="application/ld+json">{JSON.stringify(faqJsonLd)}</Script>
      <Script id="ld-classwordgames-breadcrumb" type="application/ld+json">{JSON.stringify(breadcrumbJsonLd)}</Script>

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <TopBackLink className="mb-4" />

        <h1 className="mb-6 font-neo-display text-4xl font-bold leading-tight sm:text-5xl">
          Word games for the classroom — no login, no download, no prep.
        </h1>

        <p className="mb-8 text-lg leading-relaxed text-neo-gray-200">
          Most &quot;classroom games&quot; want student accounts, an app install, or both. LexiClash wants a <strong>4-digit
          code</strong>. Project it, students type it on any device, and the whole class is playing a live word game in seconds —
          free, browser-based, nothing to install. Word-formation gameplay (find and spell real words on Boggle-style grids,
          anagrams, and wheels) makes it perfect for vocabulary review, spelling, and brain breaks. Bring your own word list or
          use a built-in one for true zero prep.
        </p>

        <section className="mb-12 flex flex-col gap-3 sm:flex-row sm:gap-4">
          <Link href={`/${locale}/education/classroom-game`} className="rounded-neo border-4 border-neo-lime bg-neo-lime px-6 py-3 text-center font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg sm:px-8 sm:py-4">
            Start a Class Game Free
          </Link>
          <Link href={`/${locale}/education/duels`} className="rounded-neo border-4 border-neo-cyan bg-transparent px-6 py-3 text-center font-bold text-neo-cyan shadow-hard transition-all hover:bg-neo-cyan/10 sm:px-8 sm:py-4">
            Run a 1v1 Duel
          </Link>
          <Link href={`/${locale}/vocabulary-games-for-middle-school`} className="rounded-neo border-4 border-neo-pink bg-transparent px-6 py-3 text-center font-bold text-neo-pink shadow-hard transition-all hover:bg-neo-pink/10 sm:px-8 sm:py-4">
            Middle School Games
          </Link>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">Built for real classrooms</h2>
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
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">Live in three steps</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { n: '1', t: 'Pick a list', d: 'Use a built-in word list or upload your own. Choose a mode and timer.' },
              { n: '2', t: 'Project the code', d: 'Students open the link and type the 4-digit code. No login, any device.' },
              { n: '3', t: 'Play + review', d: 'Live leaderboard during play; accuracy and class-wide gaps after.' },
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
            <Link href={`/${locale}/substitute-teacher-word-games`} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-lime/40">
              <h3 className="font-bold text-neo-cyan">Substitute Teacher Games</h3>
              <p className="mt-1 text-xs text-neo-gray-200">Zero-prep sub plans</p>
            </Link>
            <Link href={`/${locale}/bell-ringer-word-games`} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-lime/40">
              <h3 className="font-bold text-neo-cyan">Bell Ringer Word Games</h3>
              <p className="mt-1 text-xs text-neo-gray-200">5-minute openers</p>
            </Link>
            <Link href={`/${locale}/education`} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-lime/40">
              <h3 className="font-bold text-neo-cyan">Education Hub</h3>
              <p className="mt-1 text-xs text-neo-gray-200">All classroom word games</p>
            </Link>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="font-neo-display text-2xl font-bold sm:text-3xl">Start one right now</h2>
          <p className="mt-4 text-neo-gray-200">
            No account to create, nothing to install, no credit card. Pick a word list, project the join code, and the room is
            playing in under a minute.
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
