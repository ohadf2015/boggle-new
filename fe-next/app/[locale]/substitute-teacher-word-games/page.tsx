import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { TopBackLink } from '@/components/navigation/TopBackLink';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_PATH = '/substitute-teacher-word-games';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isEnglish = locale === 'en';
  const pageUrl = `${BASE_URL}/en${PAGE_PATH}`;

  return {
    title: 'Substitute Teacher Word Games — Free, Zero-Prep, No Login (2026) | LexiClash',
    description: 'Free zero-prep word games for substitute teachers. Students join a live game with a 4-digit code — no login, no accounts, no setup. Works on any device with built-in word lists. Perfect emergency sub plans and fillers.',
    keywords: 'substitute teacher word games, substitute teacher activities, sub plans games, emergency sub plans, no prep substitute activities, free games for substitute teachers, zero prep classroom games, sub day word games, filler activities classroom, no login game substitute',
    openGraph: {
      title: 'Substitute Teacher Word Games — Free, Zero-Prep',
      description: 'No login, no accounts, no setup. Project a code, students play. The emergency sub plan that always works. Free.',
      locale: 'en_US',
      type: 'website',
      url: pageUrl,
      images: [{ url: `${BASE_URL}/images/education-hero-en.webp`, width: 1200, height: 675, alt: 'Substitute teacher word games' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Substitute Teacher Word Games — Free',
      description: 'Zero-prep, no-login word games for sub days. Project a code, students play. Free.',
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
  { q: 'Why is this good for substitute teachers?', a: 'Because it needs nothing from you. There’s no login, no account setup, no materials to prep, and no class roster to know. A sub projects a 4-digit code, students join on any device, and a live word game runs — even with no prior knowledge of the class or subject.' },
  { q: 'Do students or the sub need accounts?', a: 'No. Students join with a 4-digit code, and a sub can start a game from a built-in word list without any account at all. Zero friction is the whole point for an unfamiliar room.' },
  { q: 'Is any prep required?', a: 'None. Built-in word lists mean a sub can start a full game with no preparation — ideal for emergency sub plans dropped in that morning. If the regular teacher wants it tied to the unit, they can leave a custom word list ready to play.' },
  { q: 'Is it free?', a: 'Yes — fully free, no premium tier. Up to 30 students per live game.' },
  { q: 'What grades does it suit?', a: 'Strongest for upper-elementary through high school and adult ESL. CEFR-scaled difficulty (A1–C2) lets a sub pick a level that fits whatever class they walk into.' },
  { q: 'How long can it fill?', a: 'Rounds run about 5–10 minutes each and you can run several back-to-back, so it scales from a quick filler to most of a period when plans fall through.' },
];

const fits = [
  { title: 'Nothing to prep', desc: 'Built-in word lists mean a sub starts a real game with zero preparation. The emergency plan that works when nothing was left.' },
  { title: 'No login, no roster', desc: 'A 4-digit join code means the sub doesn’t need accounts, names, or a seating chart — students just join and play.' },
  { title: 'Works on any device', desc: 'Browser only — Chromebooks, tablets, phones, the room’s laptops. Nothing to install in an unfamiliar room.' },
  { title: 'Keeps the class engaged', desc: 'Live, competitive word rounds hold attention far better than a worksheet — fewer behavior problems on a sub day.' },
  { title: 'Actually academic', desc: 'Students practice spelling and vocabulary, so the regular teacher comes back to learning, not lost time.' },
  { title: 'Scales to fill time', desc: 'Run one round as a filler or several back-to-back when plans fall through and you need most of a period covered.' },
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
      { '@type': 'ListItem', position: 3, name: 'Substitute Teacher Word Games', item: `${BASE_URL}/${locale}${PAGE_PATH}` },
    ],
  };

  return (
    <main className="min-h-screen bg-neo-navy text-neo-white">
      <Script id="ld-substitute-faq" type="application/ld+json">{JSON.stringify(faqJsonLd)}</Script>
      <Script id="ld-substitute-breadcrumb" type="application/ld+json">{JSON.stringify(breadcrumbJsonLd)}</Script>

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <TopBackLink className="mb-4" />

        <h1 className="mb-6 font-neo-display text-4xl font-bold leading-tight sm:text-5xl">
          The sub-day plan that needs nothing from you.
        </h1>

        <p className="mb-8 text-lg leading-relaxed text-neo-gray-200">
          Sub plans fail when they assume prep, logins, or knowing the class. LexiClash assumes none of it. A substitute
          projects a <strong>4-digit code</strong>, students join on any device with no account, and a live word game runs from a
          built-in list — <strong>zero prep, zero login, zero roster</strong>. It holds a class better than a worksheet, keeps
          things academic (real spelling and vocabulary practice), and scales from a five-minute filler to most of a period when
          plans fall through. Free, browser-based, and reliable in a room the sub has never seen.
        </p>

        <section className="mb-12 flex flex-col gap-3 sm:flex-row sm:gap-4">
          <Link href={`/${locale}/education/classroom-game`} className="rounded-neo border-4 border-neo-lime bg-neo-lime px-6 py-3 text-center font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg sm:px-8 sm:py-4">
            Start a Game Free
          </Link>
          <Link href={`/${locale}/word-games-for-the-classroom`} className="rounded-neo border-4 border-neo-cyan bg-transparent px-6 py-3 text-center font-bold text-neo-cyan shadow-hard transition-all hover:bg-neo-cyan/10 sm:px-8 sm:py-4">
            Classroom Word Games
          </Link>
          <Link href={`/${locale}/education/duels`} className="rounded-neo border-4 border-neo-pink bg-transparent px-6 py-3 text-center font-bold text-neo-pink shadow-hard transition-all hover:bg-neo-pink/10 sm:px-8 sm:py-4">
            1v1 Duels
          </Link>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">Why subs reach for it</h2>
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
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">Running it cold, in 3 steps</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { n: '1', t: 'Open a built-in list', d: 'No prep needed — pick a ready word list and a time limit.' },
              { n: '2', t: 'Project the code', d: 'Students type the 4-digit code on any device. No accounts, no names needed.' },
              { n: '3', t: 'Play, repeat', d: 'Run one round as a filler or several to cover the period. Live leaderboard keeps focus.' },
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
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">For the regular teacher</h2>
          <p className="text-neo-gray-200">
            Leaving a sub plan? Drop the LexiClash join link and a word list in your sub notes. Your students get academic word
            practice instead of a movie or busywork, the sub gets a plan that can&apos;t fail, and you come back to a class that
            actually reviewed vocabulary while you were out — no make-up grading, no chaos to clean up.
          </p>
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
            <Link href={`/${locale}/word-games-for-the-classroom`} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-lime/40">
              <h3 className="font-bold text-neo-cyan">Classroom Word Games</h3>
              <p className="mt-1 text-xs text-neo-gray-200">No login, no download</p>
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
          <h2 className="font-neo-display text-2xl font-bold sm:text-3xl">Keep the link in your sub kit</h2>
          <p className="mt-4 text-neo-gray-200">
            Bookmark it now and it&apos;s ready for any sub day — yours or someone else&apos;s. No signup, no install, no credit
            card. Project a code and the room is playing in under a minute.
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
