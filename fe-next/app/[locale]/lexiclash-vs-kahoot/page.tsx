import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { TopBackLink } from '@/components/navigation/TopBackLink';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_PATH = '/lexiclash-vs-kahoot';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isEnglish = locale === 'en';
  const pageUrl = `${BASE_URL}/en${PAGE_PATH}`;

  return {
    title: 'LexiClash vs Kahoot — Free Kahoot Alternative for Vocabulary (2026) | LexiClash',
    description: 'LexiClash vs Kahoot compared: free word-formation games vs quiz-show format. No student signup, no Kahoot+ subscription, 6 languages, full multiplayer. The free Kahoot alternative for vocabulary and language teachers.',
    keywords: 'lexiclash vs kahoot, kahoot alternative, free kahoot alternative, kahoot vs lexiclash, alternatives to kahoot, free quiz game alternative, kahoot for free, classroom multiplayer free, vocabulary kahoot alternative, kahoot for teachers free',
    openGraph: {
      title: 'LexiClash vs Kahoot — The Free Alternative',
      description: 'Word games beat quiz format for vocabulary. No student signup. No Kahoot+ paywall. 6 languages.',
      locale: 'en_US',
      type: 'website',
      url: pageUrl,
      images: [{ url: `${BASE_URL}/og-image-en.webp`, width: 1200, height: 630, alt: 'LexiClash vs Kahoot comparison' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'LexiClash vs Kahoot — Free Alternative',
      description: 'Vocabulary word games. No signup. No paywall. Free.',
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
  { q: 'Is LexiClash a free alternative to Kahoot?', a: 'Yes — LexiClash is free for your whole class: 3 classes of up to 50 students, no per-seat fee and no district licence required. Teacher Pro ($9/mo) adds unlimited classes and printable reports. Kahoot has a free tier (10-40 players depending on account type, basic features) but most classroom-quality features (advanced reports, slide layouts, larger games) require Kahoot+ at $4-15/month per teacher.' },
  { q: 'Do students need accounts on LexiClash?', a: 'No. Students join with a 6-character code (just like Kahoot’s PIN system). The difference: LexiClash student accounts are entirely optional, while Kahoot increasingly pushes students toward sign-in for progress tracking.' },
  { q: 'Is LexiClash like Kahoot?', a: 'Different category. Kahoot is a quiz-show platform — students answer multiple-choice questions on a shared timer, often projected on screen. LexiClash is a word-formation game — students search for words on Boggle-style grids, anagrams, or word wheels. Better for vocabulary, spelling, and language practice than multiple-choice trivia.' },
  { q: 'Can I use Kahoot quizzes in LexiClash?', a: 'No — different formats. But you can upload your vocabulary lists from any source (Quizlet exports, CSV, manual entry) and use them in LexiClash word games. For trivia-style quizzes, Kahoot remains the right tool; for word/vocabulary practice, LexiClash is purpose-built.' },
  { q: 'Does LexiClash have multiplayer for a whole class?', a: 'Yes — LexiClash supports up to 50 students per classroom session, all in real time, and a whole class of that size is free. Kahoot’s free tier supports 10-40 players depending on account type, but advanced game modes and analytics are Kahoot+ only.' },
  { q: 'What about ESL or language classrooms?', a: 'LexiClash has built-in dictionaries for English, Hebrew (RTL), Spanish, Swedish, Japanese and Russian — so vocabulary games work natively in each language. Kahoot supports any language for question text but doesn’t have native word-game mechanics tied to language dictionaries.' },
  { q: 'How long is a LexiClash classroom session?', a: 'A whole-class round runs 5-10 minutes. A 1v1 vocabulary duel runs 2-3 minutes. Most teachers use it as a 5-minute warm-up, mid-lesson brain break, or end-of-class review — same use cases Kahoot fills, but with word-formation gameplay instead of quiz format.' },
];

const compareRows: ReadonlyArray<readonly [string, string, string]> = [
  ['Free tier (full features)', '✓ Whole class free (50)', '✗ Kahoot+ $4-15/mo'],
  ['No student signup', '✓ 6-character join code', '✓ PIN code'],
  ['Game type', 'Word-formation (Boggle/Wheel/Anagram)', 'Quiz / multiple choice'],
  ['Best for', 'Vocabulary, spelling, ESL', 'Trivia, fact recall, review quizzes'],
  ['1v1 duels', '✓ Built-in', '✗'],
  ['6 languages with native dictionaries', '✓ EN/HE/SV/JA/ES', 'Question text any language; no dictionaries'],
  ['Custom curriculum content', '✓ Word lists', '✓ Quiz questions'],
  ['Class analytics', '✓ Free', 'Limited free; Kahoot+ for full'],
  ['Ad-free in classroom', '✓ Free', 'Free shows promos; Kahoot+ ad-free'],
  ['Mobile + browser', 'Browser-only', 'Apps + web'],
  ['Whole-class multiplayer', '✓ Up to 30 students', '✓ Up to 40 free; more on Kahoot+'],
  ['Setup time', 'Under 60 seconds', '2-5 minutes per quiz'],
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
      { '@type': 'ListItem', position: 3, name: 'LexiClash vs Kahoot', item: `${BASE_URL}/${locale}${PAGE_PATH}` },
    ],
  };

  return (
    <main className="min-h-screen bg-neo-navy text-neo-white">
      <Script id="ld-vs-kahoot-faq" type="application/ld+json">{JSON.stringify(faqJsonLd)}</Script>
      <Script id="ld-vs-kahoot-breadcrumb" type="application/ld+json">{JSON.stringify(breadcrumbJsonLd)}</Script>

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <TopBackLink className="mb-4" />
        <h1 className="mb-6 font-neo-display text-4xl font-bold leading-tight sm:text-5xl">
          Kahoot is fun. For vocabulary, LexiClash is faster, freer, and word-game native.
        </h1>

        <p className="mb-8 text-lg leading-relaxed text-neo-gray-200">
          Kahoot owns the quiz-show classroom moment — that&apos;s their genre and they&apos;re great at it. But for
          vocabulary, spelling, and language practice, the right tool isn&apos;t a quiz with multiple-choice answers
          — it&apos;s a word-formation game where students actually search for, build, and recognize words. LexiClash
          is built for exactly that. Whole class free (no Kahoot+ subscription), no student signup required, six languages
          with native dictionaries, and the same 5-minute classroom flow Kahoot pioneered.
        </p>

        <section className="mb-12 flex flex-col gap-3 sm:flex-row sm:gap-4">
          <Link href={`/${locale}/education/classroom-game`} className="rounded-neo border-4 border-neo-lime bg-neo-lime px-6 py-3 text-center font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg sm:px-8 sm:py-4">
            Try LexiClash Free
          </Link>
          <Link href={`/${locale}/education/games-for-teachers`} className="rounded-neo border-4 border-neo-cyan bg-transparent px-6 py-3 text-center font-bold text-neo-cyan shadow-hard transition-all hover:bg-neo-cyan/10 sm:px-8 sm:py-4">
            For Teachers
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
                  <th className="px-4 py-3 text-center text-neo-gray-300">Kahoot</th>
                </tr>
              </thead>
              <tbody>
                {compareRows.map(([feature, lexi, kahoot]) => (
                  <tr key={feature} className="border-b border-neo-gray-400/50">
                    <td className="px-4 py-3 font-medium">{feature}</td>
                    <td className="px-4 py-3 text-center text-neo-cyan">{lexi}</td>
                    <td className="px-4 py-3 text-center text-neo-gray-300">{kahoot}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-neo-gray-300">Kahoot pricing as of 2026: free for K-12 teachers (10-40 players depending on account type, limited features); Kahoot+ Premier $7.99/month and Kahoot+ Max $11.99/month per teacher.</p>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">When LexiClash beats Kahoot</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { title: 'Word games, not quizzes', desc: 'For vocabulary, spelling, and language practice, students need to find, build, and recognize words — not pick from A/B/C/D. Different cognitive workout, better fit for the goal.' },
              { title: 'Free, no Kahoot+ ceiling', desc: 'Kahoot pushes you to Kahoot+ for advanced reports, larger games, and certain modes. LexiClash gives you everything in the free tier — no upgrade screen, ever.' },
              { title: 'Native multilingual dictionaries', desc: 'For ESL/EFL, Hebrew immersion, Spanish bilingual classrooms — LexiClash has full dictionaries in 6 languages. Kahoot supports any text but doesn’t have language-game mechanics.' },
              { title: '1v1 vocabulary duels', desc: 'Pair students for 2-3 minute head-to-head word battles. Kahoot’s format doesn’t support paired-student practice the same way.' },
              { title: 'Faster setup', desc: 'Kahoot quizzes take 2-5 minutes per quiz to author. LexiClash word lists upload in under a minute, and many teachers use built-in lists for instant play.' },
              { title: 'Ad-free classroom', desc: 'Free Kahoot occasionally surfaces promos to students. LexiClash classroom mode is ad-free in all tiers.' },
            ].map((item) => (
              <div key={item.title} className="rounded-neo border-3 border-neo-lime/40 bg-neo-navy/50 p-4 shadow-hard">
                <h3 className="mb-1 font-bold text-neo-lime">{item.title}</h3>
                <p className="text-sm text-neo-gray-200">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">When Kahoot still wins</h2>
          <p className="text-neo-gray-200">
            Kahoot is built for trivia, review quizzes, and presentation-driven learning. If your goal is to
            quiz students on history facts, science vocabulary in question form, or end-of-unit multiple-choice
            review, Kahoot&apos;s format is purpose-built for that. LexiClash is the better fit for vocabulary
            spelling, language pattern recognition, ESL/EFL practice, and word-formation games. Many teachers
            use both: Kahoot for fact-quiz review, LexiClash for vocabulary and spelling games.
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
              <p className="mt-1 text-xs text-neo-gray-200">Word games vs flashcards. Free vs Quizlet Plus.</p>
            </Link>
            <Link href={`/${locale}/lexiclash-vs-wordle`} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-lime/40">
              <h3 className="font-bold text-neo-cyan">LexiClash vs Wordle</h3>
              <p className="mt-1 text-xs text-neo-gray-200">Unlimited play vs 1 puzzle/day</p>
            </Link>
            <Link href={`/${locale}/best-online-word-games`} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-lime/40">
              <h3 className="font-bold text-neo-cyan">Best Word Games 2026</h3>
              <p className="mt-1 text-xs text-neo-gray-200">Complete comparison guide</p>
            </Link>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="font-neo-display text-2xl font-bold sm:text-3xl">Try it before next class</h2>
          <p className="mt-4 text-neo-gray-200">
            Same join-code, same 5-minute slot Kahoot taught classrooms to expect. But word games instead of quizzes,
            free instead of Kahoot+, and ready in 60 seconds instead of 5. If it&apos;s not for your classroom,
            you&apos;ve lost five minutes — and gained a tool to keep in mind for vocabulary review days.
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
