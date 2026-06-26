import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { TopBackLink } from '@/components/navigation/TopBackLink';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_PATH = '/lexiclash-vs-vocabularyspellingcity';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isEnglish = locale === 'en';
  const pageUrl = `${BASE_URL}/en${PAGE_PATH}`;

  return {
    title: 'LexiClash vs VocabularySpellingCity — Free Multiplayer Alternative (2026) | LexiClash',
    description: 'LexiClash vs VocabularySpellingCity compared: live whole-class multiplayer word games vs individual spelling drills. No student login, free, 5 languages, custom word lists. The free SpellingCity alternative for spelling and vocabulary.',
    keywords: 'lexiclash vs vocabularyspellingcity, vocabularyspellingcity alternative, spellingcity alternative, free spellingcity alternative, spelling city alternative, alternatives to spellingcity, free spelling game classroom, multiplayer spelling game, custom spelling list game',
    openGraph: {
      title: 'LexiClash vs VocabularySpellingCity — The Free Alternative',
      description: 'Live multiplayer word games beat solo spelling drills for engagement. No login. 5 languages. Free forever.',
      locale: 'en_US',
      type: 'website',
      url: pageUrl,
      images: [{ url: `${BASE_URL}/og-image-en.webp`, width: 1200, height: 630, alt: 'LexiClash vs VocabularySpellingCity comparison' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'LexiClash vs SpellingCity — Free Alternative',
      description: 'Multiplayer spelling + vocabulary games. No login. 5 languages. Free.',
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
  { q: 'Is LexiClash a free alternative to VocabularySpellingCity?', a: 'Yes — LexiClash is fully free with no premium tier. VocabularySpellingCity (part of the Learning A-Z / Vocabulary A-Z family) has a free tier but locks most games, recordkeeping, and class management behind a paid Premium membership. LexiClash never gates classroom features.' },
  { q: 'What is the main difference?', a: 'VocabularySpellingCity is built around individual, self-paced spelling and vocabulary games students rotate through on their own devices. LexiClash is live and social — whole-class multiplayer and 1v1 duels on Boggle-style grids, anagrams, and word wheels. Same spelling/vocabulary goal, but engagement comes from real-time competition rather than solo practice.' },
  { q: 'Do students need logins on LexiClash?', a: 'No. Students join with a 4-digit code shown by the teacher — no individual accounts. SpellingCity students typically log into assigned accounts to track their practice.' },
  { q: 'Can I use my own spelling lists?', a: 'Yes on both. LexiClash teachers upload custom word lists from any unit and play them in duels, whole-class games, or practice. SpellingCity is also built around custom lists — the difference is multiplayer and zero login on LexiClash.' },
  { q: 'Is LexiClash only for older students?', a: 'LexiClash is strongest for upper-elementary through adult ESL — its CEFR-scaled dictionaries (A1–C2) span beginner to advanced. SpellingCity skews K-5. For early elementary sight-word drilling, SpellingCity may fit better; for middle school, ESL, and review games, LexiClash fits better.' },
  { q: 'Does LexiClash support other languages?', a: 'Yes — native dictionaries for English, Hebrew (RTL), Spanish, Swedish, and Japanese. SpellingCity is English-spelling focused.' },
];

const compareRows: ReadonlyArray<readonly [string, string, string]> = [
  ['Free tier (full features)', '✓ Everything free', '✗ Premium for most games'],
  ['No student login', '✓ 4-digit join code', '✗ Student accounts'],
  ['Core format', 'Live multiplayer word games', 'Individual self-paced games'],
  ['Live whole-class multiplayer', '✓ Free, up to 30', '✗ Solo practice model'],
  ['1v1 duels with student pairing', '✓', '✗'],
  ['Spelling + vocabulary focus', '✓ Word game core', '✓ Spelling-first'],
  ['Custom curriculum word lists', '✓', '✓'],
  ['5 languages with native dictionaries', '✓ EN/HE/SV/JA/ES', 'English spelling-first'],
  ['Class analytics dashboard', '✓ Free', '✓ (Premium)'],
  ['Best grade band', 'Upper-elem → adult ESL', 'K-5 heavy'],
  ['Best for', 'Engaging review games', 'Individual spelling practice'],
  ['Setup time', 'Under 60 seconds', 'Build list + assign'],
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
      { '@type': 'ListItem', position: 3, name: 'LexiClash vs VocabularySpellingCity', item: `${BASE_URL}/${locale}${PAGE_PATH}` },
    ],
  };

  return (
    <main className="min-h-screen bg-neo-navy text-neo-white">
      <Script id="ld-vs-spellingcity-faq" type="application/ld+json">{JSON.stringify(faqJsonLd)}</Script>
      <Script id="ld-vs-spellingcity-breadcrumb" type="application/ld+json">{JSON.stringify(breadcrumbJsonLd)}</Script>

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <TopBackLink className="mb-4" />

        <h1 className="mb-6 font-neo-display text-4xl font-bold leading-tight sm:text-5xl">
          SpellingCity drills alone. LexiClash plays the whole class.
        </h1>

        <p className="mb-8 text-lg leading-relaxed text-neo-gray-200">
          VocabularySpellingCity built a deep library of spelling and vocabulary games students work through one device at a
          time. It works — but it&apos;s a solo, log-in, mostly-Premium model. LexiClash takes the same custom word lists and turns
          them into <strong>live, no-login multiplayer</strong>: whole-class games and 1v1 duels on Boggle-style grids,
          anagrams, and wheels, free, in five languages. Practice the same words; replace solo drilling with competitive review.
        </p>

        <section className="mb-12 flex flex-col gap-3 sm:flex-row sm:gap-4">
          <Link href={`/${locale}/education/classroom-game`} className="rounded-neo border-4 border-neo-lime bg-neo-lime px-6 py-3 text-center font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg sm:px-8 sm:py-4">
            Try LexiClash Free
          </Link>
          <Link href={`/${locale}/education/spelling-bee-practice`} className="rounded-neo border-4 border-neo-cyan bg-transparent px-6 py-3 text-center font-bold text-neo-cyan shadow-hard transition-all hover:bg-neo-cyan/10 sm:px-8 sm:py-4">
            Spelling Practice
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
                  <th className="px-4 py-3 text-center text-neo-gray-300">SpellingCity</th>
                </tr>
              </thead>
              <tbody>
                {compareRows.map(([feature, lexi, sc]) => (
                  <tr key={feature} className="border-b border-neo-gray-400/50">
                    <td className="px-4 py-3 font-medium">{feature}</td>
                    <td className="px-4 py-3 text-center text-neo-cyan">{lexi}</td>
                    <td className="px-4 py-3 text-center text-neo-gray-300">{sc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-neo-gray-300">VocabularySpellingCity tier features and pricing as of 2026 — check the vendor for current Premium plans.</p>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">When LexiClash beats SpellingCity</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { title: 'Whole-class engagement', desc: 'SpellingCity is individual practice. LexiClash is live multiplayer — the energy of the whole class playing the same word list at once.' },
              { title: 'No student logins', desc: 'A 4-digit join code means no account provisioning. Every student plays in seconds, including those without rostered logins.' },
              { title: 'Free, full features', desc: 'Most SpellingCity games sit behind Premium. LexiClash classroom features are free, up to 30 students, no upsell.' },
              { title: '1v1 duels', desc: 'Pair students head-to-head on your word list for a fast, competitive review format SpellingCity doesn’t offer.' },
              { title: 'Spans older + ESL learners', desc: 'CEFR A1–C2 dictionaries fit middle school and adult ESL, not just K-5 spelling.' },
              { title: '5 native-dictionary languages', desc: 'EN/HE/ES/SV/JA word validation for bilingual and language programs. SpellingCity is English-spelling-first.' },
            ].map((item) => (
              <div key={item.title} className="rounded-neo border-3 border-neo-lime/40 bg-neo-navy/50 p-4 shadow-hard">
                <h3 className="mb-1 font-bold text-neo-lime">{item.title}</h3>
                <p className="text-sm text-neo-gray-200">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">When SpellingCity still wins</h2>
          <p className="text-neo-gray-200">
            If you teach early elementary and need structured, self-paced spelling and sight-word practice with audio of each
            word read aloud, VocabularySpellingCity&apos;s K-5 library and per-student recordkeeping are purpose-built for that.
            LexiClash is stronger for upper-elementary through adult ESL and for live, whole-class review. Many teachers assign
            SpellingCity for individual practice and run LexiClash for the in-class review game.
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
            <Link href={`/${locale}/lexiclash-vs-flocabulary`} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-lime/40">
              <h3 className="font-bold text-neo-cyan">LexiClash vs Flocabulary</h3>
              <p className="mt-1 text-xs text-neo-gray-200">Play words vs watch videos</p>
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
            Upload this week&apos;s spelling list, project the join code, and let the whole class play it at once. No logins to
            provision, no Premium upsell, no credit card — five minutes to see if live beats solo for your students.
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
