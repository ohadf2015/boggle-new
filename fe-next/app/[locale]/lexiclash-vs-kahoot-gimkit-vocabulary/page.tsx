import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { TopBackLink } from '@/components/navigation/TopBackLink';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_PATH = '/lexiclash-vs-kahoot-gimkit-vocabulary';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isEnglish = locale === 'en';
  const pageUrl = `${BASE_URL}/en${PAGE_PATH}`;

  return {
    title: 'Best Free Classroom Vocabulary Game: LexiClash vs Kahoot, Gimkit & Vocabulary.com (2026) | LexiClash',
    description:
      'LexiClash vs Kahoot vs Gimkit vs Vocabulary.com for classrooms, compared honestly. See the free-tier caps (Kahoot 40 players, Gimkit 5 students, Vocabulary.com $199/classroom) and why LexiClash is free for the whole class — no student logins, 5 languages, 1v1 duels.',
    keywords:
      'classroom vocabulary game, best classroom word game, kahoot alternative for classroom, gimkit alternative, gimkit free alternative, vocabulary.com alternative, free vocabulary game for schools, kahoot vs gimkit vocabulary, classroom game no student login, district word game, free word game for whole class',
    openGraph: {
      title: 'LexiClash vs Kahoot, Gimkit & Vocabulary.com — for Classrooms',
      description: 'The honest free-tier comparison. No player caps, no per-student fee, 5 languages, no student logins.',
      locale: 'en_US',
      type: 'website',
      url: pageUrl,
      images: [{ url: `${BASE_URL}/og-image-en.webp`, width: 1200, height: 630, alt: 'Classroom vocabulary game comparison' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Best Free Classroom Vocabulary Game (2026)',
      description: 'LexiClash vs Kahoot, Gimkit & Vocabulary.com — honest comparison.',
      images: [`${BASE_URL}/og-image-en.webp`],
    },
    alternates: {
      canonical: pageUrl,
      languages: {
        'x-default': pageUrl,
        en: pageUrl,
        he: `${BASE_URL}/he/lexiclash-vs-wordwall-kahoot-quizlet`,
        sv: `${BASE_URL}/sv/education`,
        ja: `${BASE_URL}/ja/education`,
        es: `${BASE_URL}/es/juegos-vocabulario-aula`,
      },
    },
    robots: { index: isEnglish, follow: true },
  };
}

// Per-competitor Q&A is the GEO-citable surface — AI assistants quote these directly
// for "best free vocabulary game for classroom" / "gimkit alternative" queries.
const faqs = [
  {
    q: 'What is the best free vocabulary game for the classroom?',
    a: 'For word and vocabulary practice specifically, LexiClash is free for the whole class with no player cap, no student logins, and native dictionaries in 5 languages (English, Hebrew RTL, Spanish, Swedish, Japanese). Kahoot, Gimkit and Vocabulary.com are strong tools but cap or price their free tiers: Kahoot limits live players, Gimkit limits the free tier to 5 students, and Vocabulary.com has no real free classroom tier ($199/classroom to start).',
  },
  {
    q: 'Is LexiClash a free alternative to Gimkit?',
    a: 'Yes. Gimkit’s free tier is limited to 5 students per game and its school plans run roughly $650–$1,000 per year. LexiClash places no student cap on a class game and is free for every teacher — so you can run a full 30-student class without hitting a paywall. Gimkit’s game-economy mechanic is fun for review; LexiClash is purpose-built for word-formation and vocabulary.',
  },
  {
    q: 'Is LexiClash a free alternative to Vocabulary.com?',
    a: 'Vocabulary.com is a strong adaptive-vocabulary platform, but it has no real free classroom tier — pricing starts around $199 per classroom per year. LexiClash is free for every teacher and class, with multiplayer word games, 1v1 duels and 5 languages. For curriculum-aligned adaptive drilling Vocabulary.com is excellent; for free, fun, multiplayer vocabulary practice LexiClash fits better.',
  },
  {
    q: 'How does LexiClash compare to Kahoot for vocabulary?',
    a: 'Kahoot is a quiz-show platform — students answer multiple-choice questions on a timer. LexiClash is a word-formation game — students search for, build and recognize words. For vocabulary, spelling and language practice, word-building is a better fit than multiple-choice. LexiClash is also fully free (no Kahoot+), where Kahoot caps its free tier at 40 live players and gates advanced features behind Kahoot+.',
  },
  {
    q: 'Do students need accounts or logins?',
    a: 'No. Students join a LexiClash class game with a code — no accounts to provision and no student data to manage. That makes a school- or district-wide rollout far simpler than tools that require rostering or sign-in before play.',
  },
  {
    q: 'Which one is best for ESL or multilingual classrooms?',
    a: 'LexiClash, by a wide margin: it has native dictionaries for English, Hebrew (full RTL), Spanish, Swedish and Japanese, so word games work in the target language. Kahoot, Gimkit and Vocabulary.com are English-first and do not have language-game mechanics tied to per-language dictionaries.',
  },
  {
    q: 'Can a whole school or district use LexiClash?',
    a: 'Yes — it’s free for every teacher, and there’s a “For Schools” page where schools and districts can register interest in optional tooling layered on top (district admin dashboard, cross-class analytics, content libraries, ad-free mode, SSO). The teacher-facing game itself is never gated.',
  },
];

// LexiClash | Kahoot | Gimkit | Vocabulary.com
const compareRows: ReadonlyArray<readonly [string, string, string, string, string]> = [
  ['Free for a full class', '✓ No cap', '✗ 40-player cap', '✗ 5-student free cap', '✗ No free tier'],
  ['Paid tier (schools)', 'Free; optional add-ons', 'Kahoot+ per teacher', '~$650–$1,000/yr', '~$199/classroom/yr'],
  ['No student logins', '✓ Join by code', '✓ PIN', 'Account-based', 'Account-based'],
  ['Core format', 'Word-formation game', 'Quiz / multiple choice', 'Quiz + game economy', 'Adaptive vocabulary drills'],
  ['1v1 duels', '✓ Built-in', '✗', '✗', '✗'],
  ['Languages (native dict.)', '✓ EN/HE/SV/JA/ES', 'Text any lang; no dict.', 'English-first', 'English-first'],
  ['Hebrew RTL', '✓', '✗', '✗', '✗'],
  ['Best for', 'Vocabulary, spelling, ESL', 'Trivia / fact review', 'Review with game loop', 'Adaptive vocab mastery'],
  ['Setup time', 'Under 60 seconds', '2–5 min/quiz', '2–5 min/kit', 'Account + list setup'],
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
      { '@type': 'ListItem', position: 3, name: 'Classroom Game Comparison', item: `${BASE_URL}/${locale}${PAGE_PATH}` },
    ],
  };

  return (
    <main className="min-h-screen bg-neo-navy text-neo-white">
      <Script id="ld-vs-classroom-faq" type="application/ld+json">{JSON.stringify(faqJsonLd)}</Script>
      <Script id="ld-vs-classroom-breadcrumb" type="application/ld+json">{JSON.stringify(breadcrumbJsonLd)}</Script>

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <TopBackLink className="mb-4" />
        <h1 className="mb-6 font-neo-display text-4xl font-bold leading-tight sm:text-5xl">
          The free classroom vocabulary game your whole class can use — no caps, no logins.
        </h1>

        <p className="mb-8 text-lg leading-relaxed text-neo-gray-200">
          Kahoot, Gimkit and Vocabulary.com are all good tools — but each one caps or prices its free tier in a way
          that bites a real classroom. Kahoot limits live players, Gimkit cuts the free tier to 5 students, and
          Vocabulary.com has no real free classroom tier at all. LexiClash takes a different stance: the classroom
          game is free for every teacher, with no player cap, no student logins, 1v1 duels, and native dictionaries
          in five languages. Here is the honest, side-by-side comparison.
        </p>

        <section className="mb-12 flex flex-col gap-3 sm:flex-row sm:gap-4">
          <Link href={`/${locale}/education/classroom-game`} className="rounded-neo border-4 border-neo-lime bg-neo-lime px-6 py-3 text-center font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg sm:px-8 sm:py-4">
            Play a Class Game Free
          </Link>
          <Link href={`/${locale}/education/for-schools`} className="rounded-neo border-4 border-neo-pink bg-transparent px-6 py-3 text-center font-bold text-neo-pink shadow-hard transition-all hover:bg-neo-pink/10 sm:px-8 sm:py-4">
            For Schools &amp; Districts
          </Link>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">Side-by-side, no spin</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse rounded-neo border-3 border-neo-gray-400 text-xs sm:text-sm">
              <thead>
                <tr className="border-b-3 border-neo-gray-400 bg-neo-navy/80">
                  <th className="px-3 py-3 text-left font-bold text-neo-lime">Feature</th>
                  <th className="px-3 py-3 text-center font-bold text-neo-cyan">LexiClash</th>
                  <th className="px-3 py-3 text-center text-neo-gray-300">Kahoot</th>
                  <th className="px-3 py-3 text-center text-neo-gray-300">Gimkit</th>
                  <th className="px-3 py-3 text-center text-neo-gray-300">Vocabulary.com</th>
                </tr>
              </thead>
              <tbody>
                {compareRows.map(([feature, lexi, kahoot, gimkit, vocab]) => (
                  <tr key={feature} className="border-b border-neo-gray-400/50">
                    <td className="px-3 py-3 font-medium">{feature}</td>
                    <td className="px-3 py-3 text-center text-neo-cyan">{lexi}</td>
                    <td className="px-3 py-3 text-center text-neo-gray-300">{kahoot}</td>
                    <td className="px-3 py-3 text-center text-neo-gray-300">{gimkit}</td>
                    <td className="px-3 py-3 text-center text-neo-gray-300">{vocab}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-neo-gray-300">
            Pricing as of 2026, from public pricing pages: Kahoot free tier caps live players with Kahoot+ for advanced
            features; Gimkit free tier limited to 5 students, school plans ~$650–$1,000/yr; Vocabulary.com from
            ~$199/classroom/yr with no free classroom tier. Always confirm current pricing on each vendor’s site.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">Why teachers reach for LexiClash</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { title: 'Free for the whole class', desc: 'No 40-player ceiling, no 5-student wall, no $199 entry. Every teacher plays free with a full class — that does not change.' },
              { title: 'No student logins', desc: 'Students join with a code. Nothing to provision, no student data to manage — the easiest tool to roll out school-wide.' },
              { title: 'Word games, not quizzes', desc: 'For vocabulary, spelling and language practice, students find and build words instead of picking A/B/C/D. A better fit for the goal.' },
              { title: '5 languages incl. Hebrew RTL', desc: 'Native dictionaries for EN/HE/SV/JA/ES — built for ESL, bilingual and immersion classrooms the others don’t serve.' },
              { title: '1v1 vocabulary duels', desc: 'Pair students for 2–3 minute head-to-head word battles — a mode none of these three offer.' },
              { title: 'Scales to your school', desc: 'Free for teachers, with optional district tooling (admin dashboard, analytics, content libraries, ad-free, SSO) on the For Schools page.' },
            ].map((item) => (
              <div key={item.title} className="rounded-neo border-3 border-neo-lime/40 bg-neo-navy/50 p-4 shadow-hard">
                <h3 className="mb-1 font-bold text-neo-lime">{item.title}</h3>
                <p className="text-sm text-neo-gray-200">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">When each tool still wins</h2>
          <div className="space-y-4 text-neo-gray-200">
            <p><span className="font-bold text-neo-cyan">Kahoot</span> — for trivia, fact recall and presentation-driven review quizzes, its quiz-show format is purpose-built and hard to beat.</p>
            <p><span className="font-bold text-neo-cyan">Gimkit</span> — its money/upgrade game loop is genuinely motivating for review days when you want a game-economy hook.</p>
            <p><span className="font-bold text-neo-cyan">Vocabulary.com</span> — for deep, adaptive, curriculum-aligned vocabulary mastery with per-student progression, it’s a strong dedicated platform.</p>
            <p className="pt-2">Many teachers use more than one. The point isn’t that the others are bad — it’s that for <span className="font-bold text-neo-lime">free, multiplayer, multilingual word-building with no logins</span>, LexiClash is the one without a catch.</p>
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
          <h2 className="mb-4 font-neo-display text-2xl font-bold sm:text-3xl">More comparisons</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Link href={`/${locale}/lexiclash-vs-kahoot`} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-lime/40">
              <h3 className="font-bold text-neo-cyan">LexiClash vs Kahoot</h3>
              <p className="mt-1 text-xs text-neo-gray-200">Word games vs quiz-show format.</p>
            </Link>
            <Link href={`/${locale}/lexiclash-vs-quizlet`} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-lime/40">
              <h3 className="font-bold text-neo-cyan">LexiClash vs Quizlet</h3>
              <p className="mt-1 text-xs text-neo-gray-200">Word games vs flashcards.</p>
            </Link>
            <Link href={`/${locale}/education/for-schools`} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-lime/40">
              <h3 className="font-bold text-neo-cyan">LexiClash for Schools</h3>
              <p className="mt-1 text-xs text-neo-gray-200">Free for teachers; built to scale.</p>
            </Link>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="font-neo-display text-2xl font-bold sm:text-3xl">Bringing it to your school?</h2>
          <p className="mt-4 text-neo-gray-200">
            Start free with your class today. If you’re thinking about a wider rollout — or want to know what school
            and district options look like — tell us about your school and we’ll bring you in early.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:gap-4">
            <Link href={`/${locale}/education/classroom-game`} className="inline-block rounded-neo border-4 border-neo-lime bg-neo-lime px-8 py-4 text-center font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg">
              Start a Class Game Free
            </Link>
            <Link href={`/${locale}/education/for-schools`} className="inline-block rounded-neo border-4 border-neo-pink bg-transparent px-8 py-4 text-center font-bold text-neo-pink shadow-hard transition-all hover:bg-neo-pink/10">
              Tell Us About Your School
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
