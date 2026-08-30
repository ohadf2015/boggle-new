import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { TopBackLink } from '@/components/navigation/TopBackLink';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_PATH = '/lexiclash-vs-quizlet';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isEnglish = locale === 'en';
  const pageUrl = `${BASE_URL}/en${PAGE_PATH}`;

  return {
    title: 'LexiClash vs Quizlet — Free Quizlet Alternative for Classrooms (2026) | LexiClash',
    description: 'LexiClash vs Quizlet compared: free word-formation games vs flashcard-based learning. No student signup, multiplayer for the whole class, 5 languages. The free Quizlet alternative for vocabulary teachers.',
    keywords: 'lexiclash vs quizlet, quizlet alternative, free quizlet alternative, quizlet alternative free, quizlet vs lexiclash, alternatives to quizlet, free flashcard alternative, vocabulary game vs quizlet, classroom vocabulary tool, quizlet for teachers free',
    openGraph: {
      title: 'LexiClash vs Quizlet — The Free Alternative',
      description: 'Word-formation games beat flashcards for spelling + recall. No student signup. 5 languages. Free forever.',
      locale: 'en_US',
      type: 'website',
      url: pageUrl,
      images: [{ url: `${BASE_URL}/og-image-en.webp`, width: 1200, height: 630, alt: 'LexiClash vs Quizlet comparison' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'LexiClash vs Quizlet — Free Alternative',
      description: 'Word games for the classroom. No signup. 5 languages. Free.',
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
  { q: 'Is LexiClash a free alternative to Quizlet?', a: 'Yes — LexiClash is fully free with no premium tier. Quizlet has a free tier but locks key features (offline mode, ad-free, custom images, advanced study modes) behind Quizlet Plus ($35.99/year). LexiClash never gates features behind a paywall.' },
  { q: 'Do students need to create accounts on LexiClash?', a: 'No. Students join a classroom session with a 6-character code displayed by the teacher. Quizlet requires an account (or parental consent for under-13 students) and an email address per student.' },
  { q: 'Is LexiClash like Quizlet?', a: 'Different category. Quizlet is flashcard-based — students drill term-definition pairs. LexiClash is a word-formation game — students search for words on Boggle-style grids, anagrams, and word wheels. Better for spelling, recall, and pattern recognition than memorization-focused flashcards.' },
  { q: 'Can teachers use their own word lists?', a: 'Yes on both platforms. LexiClash teachers upload custom vocabulary lists from any unit or curriculum and use them in 1v1 duels, whole-class games, or assigned practice. No import format restrictions.' },
  { q: 'Which is better for ESL or English language learners?', a: 'LexiClash has built-in dictionaries for English, Hebrew (RTL), Spanish, Swedish, and Japanese — useful for ESL, Hebrew immersion, and bilingual programs. Quizlet supports many languages for user-generated decks but the platform UI is English-first and doesn’t have multilingual classroom multiplayer.' },
  { q: 'Does LexiClash have multiplayer like Quizlet Live?', a: 'Yes — but with key differences. LexiClash multiplayer is real-time, free, and requires zero student accounts (6-character join code). Quizlet Live requires student accounts and is gated behind Quizlet Plus for full features.' },
  { q: 'How do I track student progress?', a: 'LexiClash teacher dashboard shows per-student accuracy, missed words, and class-wide patterns (which words tripped the most students). Quizlet has its own analytics but key views (mastery tracking, individual progress reports) are paid features.' },
];

const compareRows: ReadonlyArray<readonly [string, string, string]> = [
  ['Free tier (full features)', '✓ Everything free', '✗ Quizlet Plus $36/yr'],
  ['No student signup', '✓ 6-character join code', '✗ Account required'],
  ['Game type', 'Word-formation (Boggle/Wheel/Anagram)', 'Flashcards + multiple-choice'],
  ['Live whole-class multiplayer', '✓ Free', '✓ Quizlet Plus'],
  ['1v1 duels with student pairing', '✓', '✗'],
  ['5 languages with native dictionaries', '✓ EN/HE/SV/JA/ES', 'User-generated decks only'],
  ['Custom curriculum word lists', '✓', '✓'],
  ['Class analytics dashboard', '✓ Free', 'Limited free; paid for full'],
  ['Ads in classroom mode', '✗ None', 'Free tier shows ads'],
  ['Mobile + browser', 'Browser-only (works on any device)', 'iOS/Android apps + web'],
  ['Best for', 'Spelling, recall, pattern recognition', 'Term-definition memorization'],
  ['Setup time', 'Under 60 seconds', '5-10 minutes (deck creation)'],
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
      { '@type': 'ListItem', position: 3, name: 'LexiClash vs Quizlet', item: `${BASE_URL}/${locale}${PAGE_PATH}` },
    ],
  };

  return (
    <main className="min-h-screen bg-neo-navy text-neo-white">
      <Script id="ld-vs-quizlet-faq" type="application/ld+json">{JSON.stringify(faqJsonLd)}</Script>
      <Script id="ld-vs-quizlet-breadcrumb" type="application/ld+json">{JSON.stringify(breadcrumbJsonLd)}</Script>

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <TopBackLink className="mb-4" />

        <h1 className="mb-6 font-neo-display text-4xl font-bold leading-tight sm:text-5xl">
          Quizlet&apos;s great. LexiClash is what classrooms use when the budget is zero.
        </h1>

        <p className="mb-8 text-lg leading-relaxed text-neo-gray-200">
          Quizlet built the modern flashcard standard, and millions of students use it every day. But for teachers
          running classroom vocabulary review with no budget, no IT permissions, and no time to set up student
          accounts, LexiClash is built differently. Word-formation gameplay (not flashcards), no student signup
          (6-character join code), live whole-class multiplayer in the free tier, and five languages with native
          dictionaries. Same vocabulary goal, opposite philosophy.
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
                  <th className="px-4 py-3 text-center text-neo-gray-300">Quizlet</th>
                </tr>
              </thead>
              <tbody>
                {compareRows.map(([feature, lexi, quizlet]) => (
                  <tr key={feature} className="border-b border-neo-gray-400/50">
                    <td className="px-4 py-3 font-medium">{feature}</td>
                    <td className="px-4 py-3 text-center text-neo-cyan">{lexi}</td>
                    <td className="px-4 py-3 text-center text-neo-gray-300">{quizlet}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-neo-gray-300">Quizlet pricing as of 2026: free tier with ads + Quizlet Plus $35.99/year for ad-free + offline + advanced features.</p>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">When LexiClash beats Quizlet</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { title: 'No student accounts required', desc: 'A teacher with 30 students who don’t have email addresses (or parental consent for under-13s) can’t use Quizlet without setup friction. LexiClash uses a 6-character join code — students play instantly.' },
              { title: 'Spelling + word-pattern practice', desc: 'Flashcards drill memorization. Word-formation games drill spelling, letter patterns, and recall under time pressure — different cognitive skills, both useful.' },
              { title: 'Free whole-class multiplayer', desc: 'Quizlet Live full features need Quizlet Plus. LexiClash classroom multiplayer is free, full-featured, and supports up to 30 students.' },
              { title: '5 native-dictionary languages', desc: 'For ESL/EFL, Hebrew immersion, or Spanish bilingual programs, LexiClash has full dictionaries in EN/HE/ES/SV/JA. Quizlet relies on user-generated decks for non-English content.' },
              { title: 'No ads in classroom', desc: 'Quizlet free tier shows ads to students during sessions. LexiClash classroom mode is ad-free.' },
              { title: 'Faster setup', desc: 'Quizlet decks take 5-10 minutes to create. LexiClash word lists upload in under a minute, and most teachers use one of the built-in lists for instant play.' },
            ].map((item) => (
              <div key={item.title} className="rounded-neo border-3 border-neo-lime/40 bg-neo-navy/50 p-4 shadow-hard">
                <h3 className="mb-1 font-bold text-neo-lime">{item.title}</h3>
                <p className="text-sm text-neo-gray-200">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">When Quizlet still wins</h2>
          <p className="text-neo-gray-200">
            LexiClash isn&apos;t trying to replace Quizlet. If your students need term-definition memorization (foreign language vocabulary
            paired with translations, science terminology, anatomy memorization), Quizlet&apos;s flashcard system is the right tool.
            LexiClash shines for spelling practice, vocabulary recall under time pressure, ESL word-pattern drilling, and
            classroom-wide engagement. Many teachers use both: Quizlet for term-definition, LexiClash for review games.
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
            Pick a word list. Project the join code. Watch 30 students dive in. If LexiClash isn&apos;t a fit for your classroom,
            you&apos;ve lost 5 minutes — no signup, no credit card, no email capture. If it is a fit, you have a new tool that
            costs nothing and takes nothing to set up.
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
