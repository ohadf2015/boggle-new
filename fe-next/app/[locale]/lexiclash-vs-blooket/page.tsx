import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { TopBackLink } from '@/components/navigation/TopBackLink';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_PATH = '/lexiclash-vs-blooket';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isEnglish = locale === 'en';
  const pageUrl = `${BASE_URL}/en${PAGE_PATH}`;

  return {
    title: 'LexiClash vs Blooket — Free Word-Game Alternative for Classrooms (2026) | LexiClash',
    description: 'LexiClash vs Blooket compared: pre-built word-formation games vs build-your-own quiz game shows. No student signup, no question-writing, vocabulary-focused, 6 languages. The free Blooket alternative for word and vocabulary review.',
    keywords: 'lexiclash vs blooket, blooket alternative, free blooket alternative, blooket alternative free, blooket vs lexiclash, alternatives to blooket, blooket for vocabulary, classroom word game, word game like blooket, vocabulary review game',
    openGraph: {
      title: 'LexiClash vs Blooket — The Free Word-Game Alternative',
      description: 'Pre-built word games beat building quiz sets from scratch. No student signup. 6 languages. Whole class free.',
      locale: 'en_US',
      type: 'website',
      url: pageUrl,
      images: [{ url: `${BASE_URL}/og-image-en.webp`, width: 1200, height: 630, alt: 'LexiClash vs Blooket comparison' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'LexiClash vs Blooket — Free Alternative',
      description: 'Word games for the classroom. No signup. No question-writing. Free.',
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
  { q: 'Is LexiClash a free alternative to Blooket?', a: 'Yes — LexiClash runs a whole class of up to 50 students free, on 3 classes. Teacher Pro ($9/mo) adds unlimited classes and printable reports. Blooket has a free plan but gates higher player caps, hosting history, and some game modes behind Blooket Plus (a paid subscription). Running the games themselves is never limited — every game mode is free for the whole class.' },
  { q: 'Do students need accounts to play LexiClash?', a: 'No. Students join with a 6-character code shown by the teacher — no email, no signup. Blooket lets students join a live game with a code too, but creating sets, saving stats, and homework assignments are tied to teacher (and sometimes student) accounts.' },
  { q: 'What is the difference between LexiClash and Blooket?', a: 'Blooket is a build-your-own quiz platform — you write question-and-answer sets, then students play them through arcade-style game modes. LexiClash is a ready-to-play word game: students find words on Boggle-style grids, anagrams, and word wheels. No question-writing required, and it is purpose-built for vocabulary and spelling, not generic trivia.' },
  { q: 'Can I use Blooket for vocabulary practice?', a: 'You can, but you have to author every term-definition question yourself, and the gameplay rewards fast clicking on multiple-choice answers rather than actually producing words. LexiClash drills spelling, recall, and letter patterns directly through word-formation gameplay — closer to the skill you are teaching.' },
  { q: 'Does LexiClash work for ESL and multilingual classrooms?', a: 'Yes. LexiClash has native dictionaries for English, Hebrew (RTL), Spanish, Swedish, and Japanese, with CEFR-scaled difficulty (A1–C2). Blooket content is whatever you type in — it has no built-in multilingual word validation.' },
  { q: 'How fast can I start a game compared to Blooket?', a: 'LexiClash is under 60 seconds: pick a built-in or custom word list, project the join code, students play. Blooket requires you to find or build a question set first, which can take 5–15 minutes per topic unless you reuse the community library.' },
];

const compareRows: ReadonlyArray<readonly [string, string, string]> = [
  ['Free tier (full classroom features)', '✓ Whole class free (50)', 'Free plan; Plus is paid'],
  ['No student signup', '✓ 6-character join code', '✓ Join code (accounts for full features)'],
  ['Game type', 'Word-formation (Boggle/Wheel/Anagram)', 'Trivia quiz + arcade game modes'],
  ['Content setup', 'Built-in or upload word list', 'Write your own question sets'],
  ['Vocabulary / spelling focus', '✓ Purpose-built', 'Generic — depends on your questions'],
  ['Live whole-class multiplayer', '✓ Free, up to 30', '✓ (player cap higher on Plus)'],
  ['1v1 duels with student pairing', '✓', '✗'],
  ['6 languages with native dictionaries', '✓ EN/HE/SV/JA/ES', 'No built-in language validation'],
  ['Class analytics dashboard', '✓ Free', 'Reports (some gated on Plus)'],
  ['Best for', 'Word + vocabulary review games', 'Any-subject quiz review shows'],
  ['Setup time', 'Under 60 seconds', '5–15 minutes (build a set)'],
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
      { '@type': 'ListItem', position: 3, name: 'LexiClash vs Blooket', item: `${BASE_URL}/${locale}${PAGE_PATH}` },
    ],
  };

  return (
    <main className="min-h-screen bg-neo-navy text-neo-white">
      <Script id="ld-vs-blooket-faq" type="application/ld+json">{JSON.stringify(faqJsonLd)}</Script>
      <Script id="ld-vs-blooket-breadcrumb" type="application/ld+json">{JSON.stringify(breadcrumbJsonLd)}</Script>

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <TopBackLink className="mb-4" />

        <h1 className="mb-6 font-neo-display text-4xl font-bold leading-tight sm:text-5xl">
          Blooket makes you build the game. LexiClash already is one.
        </h1>

        <p className="mb-8 text-lg leading-relaxed text-neo-gray-200">
          Blooket turned quiz review into an arcade, and students love the game modes. But every Blooket session
          starts the same way: you write a question set. For teachers running <strong>vocabulary and word review</strong>,
          that&apos;s a lot of authoring for a game that still rewards multiple-choice clicking over actually producing
          words. LexiClash is the opposite — pre-built word-formation gameplay (Boggle grids, anagrams, word wheels),
          no question-writing, no student signup, six languages. Same competitive energy, zero prep.
        </p>

        <section className="mb-12 flex flex-col gap-3 sm:flex-row sm:gap-4">
          <Link href={`/${locale}/education/classroom-game`} className="rounded-neo border-4 border-neo-lime bg-neo-lime px-6 py-3 text-center font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg sm:px-8 sm:py-4">
            Try LexiClash Free
          </Link>
          <Link href={`/${locale}/education/vocabulary-games-classroom`} className="rounded-neo border-4 border-neo-cyan bg-transparent px-6 py-3 text-center font-bold text-neo-cyan shadow-hard transition-all hover:bg-neo-cyan/10 sm:px-8 sm:py-4">
            Classroom Games
          </Link>
          <Link href={`/${locale}/education/duels`} className="rounded-neo border-4 border-neo-pink bg-transparent px-6 py-3 text-center font-bold text-neo-pink shadow-hard transition-all hover:bg-neo-pink/10 sm:px-8 sm:py-4">
            Vocabulary Duels
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
                  <th className="px-4 py-3 text-center text-neo-gray-300">Blooket</th>
                </tr>
              </thead>
              <tbody>
                {compareRows.map(([feature, lexi, blooket]) => (
                  <tr key={feature} className="border-b border-neo-gray-400/50">
                    <td className="px-4 py-3 font-medium">{feature}</td>
                    <td className="px-4 py-3 text-center text-neo-cyan">{lexi}</td>
                    <td className="px-4 py-3 text-center text-neo-gray-300">{blooket}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-neo-gray-300">Blooket plan features and pricing as of 2026 — check blooket.com for current Blooket Plus tiers.</p>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">When LexiClash beats Blooket</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { title: 'No question sets to write', desc: 'Blooket needs a finished question set before anyone plays. LexiClash uses built-in word lists or a one-minute custom upload — no authoring step at all.' },
              { title: 'Actually practices words', desc: 'Blooket gameplay rewards fast multiple-choice clicking. LexiClash makes students spell and form words under time pressure — the skill you are actually teaching.' },
              { title: 'Purpose-built for vocabulary', desc: 'Blooket is subject-agnostic trivia. LexiClash is a word game with real dictionaries, so every round reinforces spelling, recall, and letter patterns.' },
              { title: '5 native-dictionary languages', desc: 'For ESL/EFL, Hebrew immersion, or Spanish bilingual programs, LexiClash validates real words in EN/HE/ES/SV/JA. Blooket only knows the answers you typed.' },
              { title: 'Whole class free', desc: 'Blooket caps players and gates some modes/reports on Blooket Plus. LexiClash classroom features are free and full, up to 30 students.' },
              { title: 'Faster to live', desc: 'Reuse-a-set still means finding the right Blooket set. LexiClash goes from idea to join code in under a minute.' },
            ].map((item) => (
              <div key={item.title} className="rounded-neo border-3 border-neo-lime/40 bg-neo-navy/50 p-4 shadow-hard">
                <h3 className="mb-1 font-bold text-neo-lime">{item.title}</h3>
                <p className="text-sm text-neo-gray-200">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">When Blooket still wins</h2>
          <p className="text-neo-gray-200">
            LexiClash isn&apos;t a Blooket replacement for every subject. If you teach science, history, or math and want
            game-show review across any content you write, Blooket&apos;s mode variety and community set library are excellent.
            LexiClash is laser-focused: vocabulary, spelling, and word-pattern practice for ELA and language classes. Plenty of
            teachers run Blooket for general review and LexiClash for word work.
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
            <Link href={`/${locale}/lexiclash-vs-kahoot`} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-lime/40">
              <h3 className="font-bold text-neo-cyan">LexiClash vs Kahoot</h3>
              <p className="mt-1 text-xs text-neo-gray-200">Word games vs quiz-only. Free vs Kahoot+.</p>
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
            Pick a word list. Project the join code. Watch 30 students dive in. No set to build, no signup, no credit card.
            If LexiClash isn&apos;t a fit, you&apos;ve lost five minutes. If it is, you have a zero-prep word-review game for the rest of the year.
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
