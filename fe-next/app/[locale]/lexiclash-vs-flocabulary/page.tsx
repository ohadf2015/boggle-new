import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { TopBackLink } from '@/components/navigation/TopBackLink';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_PATH = '/lexiclash-vs-flocabulary';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isEnglish = locale === 'en';
  const pageUrl = `${BASE_URL}/en${PAGE_PATH}`;

  return {
    title: 'LexiClash vs Flocabulary — Free Vocabulary-Game Alternative (2026) | LexiClash',
    description: 'LexiClash vs Flocabulary compared: active word-formation gameplay vs hip-hop vocabulary videos. No subscription, no student signup, live multiplayer, 6 languages. The free Flocabulary alternative for vocabulary practice.',
    keywords: 'lexiclash vs flocabulary, flocabulary alternative, free flocabulary alternative, flocabulary alternative free, flocabulary vs lexiclash, alternatives to flocabulary, vocabulary game alternative, classroom vocabulary game, free vocabulary practice',
    openGraph: {
      title: 'LexiClash vs Flocabulary — The Free Vocabulary Alternative',
      description: 'Active word games beat watching vocabulary videos for recall. No subscription. 6 languages. Whole class free.',
      locale: 'en_US',
      type: 'website',
      url: pageUrl,
      images: [{ url: `${BASE_URL}/og-image-en.webp`, width: 1200, height: 630, alt: 'LexiClash vs Flocabulary comparison' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'LexiClash vs Flocabulary — Free Alternative',
      description: 'Play vocabulary, don’t just watch it. No signup. 6 languages. Free.',
      images: [`${BASE_URL}/og-image-en.webp`],
    },
    alternates: {
      canonical: pageUrl,
      languages: {
        'x-default': pageUrl,
        en: pageUrl,
      },
    },
    robots: { index: isEnglish, follow: true },
  };
}

const faqs = [
  { q: 'Is LexiClash a free alternative to Flocabulary?', a: 'Yes — LexiClash is free for a whole class of up to 50 with no subscription. Flocabulary is a paid product (individual and school plans, billed annually). LexiClash never gates classroom features behind a paywall.' },
  { q: 'How is LexiClash different from Flocabulary?', a: 'Flocabulary teaches vocabulary through hip-hop videos plus follow-up activities like vocab cards and Lyric Lab — students mostly watch and respond. LexiClash is an active word game: students find and form words on Boggle-style grids, anagrams, and wheels in live rounds. Different cognitive load — production and recall under time pressure rather than reception.' },
  { q: 'Do students need accounts on LexiClash?', a: 'No. Students join a classroom session with a 6-character code shown by the teacher — no email or signup. Flocabulary student access is tied to class rosters and accounts.' },
  { q: 'Is LexiClash good for ESL / English language learners?', a: 'Yes. LexiClash has native dictionaries for English, Hebrew (RTL), Spanish, Swedish, and Japanese with CEFR-scaled difficulty (A1–C2). Flocabulary is English-content-first (its songs and lessons are in English).' },
  { q: 'Can I use my own vocabulary words?', a: 'Yes — LexiClash teachers upload custom word lists from any unit and use them in duels, whole-class games, or practice. Flocabulary centers on its produced song-and-lesson library; custom word lists feed its activities differently.' },
  { q: 'Does LexiClash have multiplayer?', a: 'Yes — real-time, free, whole-class multiplayer for up to 30 students, plus 1v1 vocabulary duels. Flocabulary has interactive activities but is not built around live head-to-head multiplayer.' },
];

const compareRows: ReadonlyArray<readonly [string, string, string]> = [
  ['Free tier (full features)', '✓ Whole class free (50)', '✗ Paid subscription'],
  ['No student signup', '✓ 6-character join code', '✗ Roster / account access'],
  ['Core format', 'Active word-formation games', 'Hip-hop videos + activities'],
  ['Student action', 'Produce & form words', 'Watch, then respond'],
  ['Live whole-class multiplayer', '✓ Free, up to 30', '✗ (interactive lessons, not live PvP)'],
  ['1v1 duels with student pairing', '✓', '✗'],
  ['Vocabulary / spelling focus', '✓ Word game core', '✓ Vocabulary-first content'],
  ['6 languages with native dictionaries', '✓ EN/HE/SV/JA/ES', 'English content-first'],
  ['Custom curriculum word lists', '✓', 'Within its activity model'],
  ['Class analytics dashboard', '✓ Free', '✓ (paid)'],
  ['Best for', 'Active recall + review games', 'Vocabulary introduction via video'],
  ['Setup time', 'Under 60 seconds', 'Pick a lesson / assign'],
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
      { '@type': 'ListItem', position: 2, name: 'Comparisons', item: `${BASE_URL}/${locale}/best-online-word-games` },
      { '@type': 'ListItem', position: 3, name: 'LexiClash vs Flocabulary', item: `${BASE_URL}/${locale}${PAGE_PATH}` },
    ],
  };

  return (
    <main className="min-h-screen bg-neo-navy text-neo-white">
      <Script id="ld-vs-flocabulary-faq" type="application/ld+json">{JSON.stringify(faqJsonLd)}</Script>
      <Script id="ld-vs-flocabulary-breadcrumb" type="application/ld+json">{JSON.stringify(breadcrumbJsonLd)}</Script>

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <TopBackLink className="mb-4" />

        <h1 className="mb-6 font-neo-display text-4xl font-bold leading-tight sm:text-5xl">
          Flocabulary plays the song. LexiClash makes students play the words.
        </h1>

        <p className="mb-8 text-lg leading-relaxed text-neo-gray-200">
          Flocabulary nailed vocabulary hooks — its hip-hop videos make terms stick, and students enjoy them. But it&apos;s a
          reception-first model: watch the song, then do the activity. For teachers who want <strong>active recall and
          review</strong> on a zero budget, LexiClash flips it. Students form and spell real words on Boggle-style grids,
          anagrams, and wheels in live rounds — no subscription, no student signup, six languages. Many teachers introduce
          words with Flocabulary and <em>review</em> them with LexiClash.
        </p>

        <section className="mb-12 flex flex-col gap-3 sm:flex-row sm:gap-4">
          <Link href={`/${locale}/education/classroom-game`} className="rounded-neo border-4 border-neo-lime bg-neo-lime px-6 py-3 text-center font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg sm:px-8 sm:py-4">
            Try LexiClash Free
          </Link>
          <Link href={`/${locale}/education/vocabulary-games-classroom`} className="rounded-neo border-4 border-neo-cyan bg-transparent px-6 py-3 text-center font-bold text-neo-cyan shadow-hard transition-all hover:bg-neo-cyan/10 sm:px-8 sm:py-4">
            Classroom Games
          </Link>
          <Link href={`/${locale}/education/esl-word-games`} className="rounded-neo border-4 border-neo-pink bg-transparent px-6 py-3 text-center font-bold text-neo-pink shadow-hard transition-all hover:bg-neo-pink/10 sm:px-8 sm:py-4">
            ESL Word Games
          </Link>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">Side-by-side, no spin</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse rounded-neo border-3 border-neo-gray-400 text-sm sm:text-base">
              <thead>
                <tr className="border-b-3 border-neo-gray-400 bg-neo-navy/80">
                  <th className="px-4 py-3 text-left font-bold text-neo-lime">Feature</th>
                  <th className="px-4 py-3 text-center font-bold text-neo-cyan">LexiClash</th>
                  <th className="px-4 py-3 text-center text-neo-gray-300">Flocabulary</th>
                </tr>
              </thead>
              <tbody>
                {compareRows.map(([feature, lexi, floc]) => (
                  <tr key={feature} className="border-b border-neo-gray-400/50">
                    <td className="px-4 py-3 font-medium">{feature}</td>
                    <td className="px-4 py-3 text-center text-neo-cyan">{lexi}</td>
                    <td className="px-4 py-3 text-center text-neo-gray-300">{floc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-neo-gray-300">Flocabulary plan details and pricing as of 2026 — check flocabulary.com for current individual and school plans.</p>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">When LexiClash beats Flocabulary</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { title: 'Free, no subscription', desc: 'Flocabulary is a paid annual plan. LexiClash classroom features are free and full — useful when there is no budget line for another license.' },
              { title: 'Active recall, not reception', desc: 'Watching a song builds recognition. Forming and spelling words under time pressure builds production and retrieval — the harder, stickier skill.' },
              { title: 'No student accounts', desc: 'A 6-character join code means any class plays instantly, including students without emails or rostered logins.' },
              { title: 'Live multiplayer + duels', desc: 'Whole-class real-time games and 1v1 vocabulary duels add competitive energy Flocabulary’s lesson model doesn’t.' },
              { title: '5 native-dictionary languages', desc: 'For ESL/EFL, Hebrew immersion, or Spanish bilingual programs, LexiClash validates real words in EN/HE/ES/SV/JA. Flocabulary content is English-first.' },
              { title: 'Instant setup', desc: 'Pick a list, project the code, go. No lesson to assign, no roster to manage.' },
            ].map((item) => (
              <div key={item.title} className="rounded-neo border-3 border-neo-lime/40 bg-neo-navy/50 p-4 shadow-hard">
                <h3 className="mb-1 font-bold text-neo-lime">{item.title}</h3>
                <p className="text-sm text-neo-gray-200">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">When Flocabulary still wins</h2>
          <p className="text-neo-gray-200">
            LexiClash doesn&apos;t teach new vocabulary the way Flocabulary does. If you want to <em>introduce</em> a unit&apos;s words
            with memorable, standards-aligned songs and structured lessons, Flocabulary&apos;s produced content is excellent and
            hard to replicate. LexiClash shines at the next step: turning those words into fast, competitive review that students
            actually play. The two pair naturally — introduce with Flocabulary, review with LexiClash.
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
          <h2 className="mb-4 font-neo-display text-2xl font-bold sm:text-3xl">More comparisons</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Link href={`/${locale}/lexiclash-vs-quizlet`} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-lime/40">
              <h3 className="font-bold text-neo-cyan">LexiClash vs Quizlet</h3>
              <p className="mt-1 text-xs text-neo-gray-200">Word games vs flashcards. Free.</p>
            </Link>
            <Link href={`/${locale}/lexiclash-vs-vocabularyspellingcity`} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-lime/40">
              <h3 className="font-bold text-neo-cyan">LexiClash vs SpellingCity</h3>
              <p className="mt-1 text-xs text-neo-gray-200">Multiplayer vs individual drills</p>
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
            Take this week&apos;s vocabulary list, drop it in, project the join code. Students play the words instead of watching
            them. No subscription, no signup, no email capture — five minutes to find out if it fits your class.
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
