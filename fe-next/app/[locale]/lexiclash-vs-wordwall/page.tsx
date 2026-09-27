import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_PATH = '/lexiclash-vs-wordwall';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isEnglish = locale === 'en';
  const pageUrl = `${BASE_URL}/en${PAGE_PATH}`;

  return {
    title: 'LexiClash vs Wordwall — Free Wordwall Alternative for Word Games (2026) | LexiClash',
    description: 'LexiClash vs Wordwall compared: dedicated word-formation gameplay vs templated activities. Whole class free, no Wordwall subscription, no student signup, 6 native dictionaries. The free Wordwall alternative for vocabulary teachers.',
    keywords: 'lexiclash vs wordwall, wordwall alternative, free wordwall alternative, wordwall vs lexiclash, alternatives to wordwall, free wordwall replacement, wordwall for free, classroom word game wordwall, vocabulary tool wordwall, wordwall classroom multiplayer',
    openGraph: {
      title: 'LexiClash vs Wordwall — The Free Alternative',
      description: 'Dedicated word games beat templated activities. No subscription. 6 languages. Whole class free.',
      locale: 'en_US',
      type: 'website',
      url: pageUrl,
      images: [{ url: `${BASE_URL}/og-image-en.webp`, width: 1200, height: 630, alt: 'LexiClash vs Wordwall comparison' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'LexiClash vs Wordwall — Free Alternative',
      description: 'Word games for the classroom. No subscription. 6 languages.',
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
  { q: 'Is LexiClash a free alternative to Wordwall?', a: 'Yes — LexiClash runs a whole class of up to 50 students free, on 3 classes. Teacher Pro ($9/mo) adds unlimited classes and printable reports. Wordwall has a free tier (limited to 5 active activities, basic templates) and paid plans starting at £4-9/month for unlimited activities and advanced templates. LexiClash never gates features behind a paywall.' },
  { q: 'How is LexiClash different from Wordwall?', a: 'Wordwall is a templated activity platform — teachers fill in word lists and get pre-built activities (match-up, anagram, balloon pop, quiz). LexiClash is a dedicated word-formation game — students play actual Boggle-style grids, anagrams, and word wheels with real multiplayer mechanics. Wordwall favors variety of templates; LexiClash favors depth of word-game experience.' },
  { q: 'Do students need accounts on LexiClash?', a: 'No. Students join a classroom session with a 6-character code. Wordwall activities are typically student-account-free too (just a link), but Wordwall gates leaderboards, time limits, and tracking behind teacher accounts and paid tiers.' },
  { q: 'Can teachers upload their own word lists?', a: 'Yes on both. LexiClash word lists upload as plain CSV or paste-in. Wordwall has a similar workflow but requires you to pick a template + redo for each new activity type.' },
  { q: 'Which is better for ESL or language classes?', a: 'LexiClash has built-in dictionaries for English, Hebrew (RTL), Spanish, Swedish, Japanese and Russian — vocabulary games run natively in each language. Wordwall supports any language for activity text but doesn’t have native word-game mechanics tied to language dictionaries.' },
  { q: 'Does LexiClash have whole-class multiplayer?', a: 'Yes — real-time, up to 30 students per session, all free. Wordwall’s "Race The Clock" and similar live modes are mostly Wordwall Pro/Plus features.' },
  { q: 'How long is a typical session?', a: '5-10 minutes for whole-class multiplayer; 2-3 minutes for 1v1 vocabulary duels. Same 5-minute warm-up window Wordwall is used for, but with deeper word-game mechanics.' },
];

const compareRows: ReadonlyArray<readonly [string, string, string]> = [
  ['Free tier (full features)', '✓ Whole class free (50)', '✗ 5 activity limit free'],
  ['Pricing', '$0 forever', 'Pro £4-9/mo, Plus £15/mo'],
  ['No student signup', '✓ 6-character join code', '✓ link-based'],
  ['Game type', 'Dedicated word-formation games', 'Templated activities (match/quiz/spin)'],
  ['Word-game depth (Boggle/Wheel/Anagram)', '✓ Native mechanics', 'Anagram template only'],
  ['Live whole-class multiplayer', '✓ Free', '✓ Pro tier'],
  ['1v1 student duels', '✓ Built-in', '✗'],
  ['6 native-dictionary languages', '✓ EN/HE/SV/JA/ES', 'Activity text any language; no dictionaries'],
  ['Custom curriculum word lists', '✓', '✓'],
  ['Class analytics', '✓ Free', 'Limited free; Pro for full'],
  ['Activity templates variety', '3 word-game modes', '50+ templates (varied formats)'],
  ['Setup time', 'Under 60 seconds', '2-5 minutes per activity'],
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
      { '@type': 'ListItem', position: 3, name: 'LexiClash vs Wordwall', item: `${BASE_URL}/${locale}${PAGE_PATH}` },
    ],
  };

  return (
    <main className="min-h-screen bg-neo-navy text-neo-white">
      <Script id="ld-vs-wordwall-faq" type="application/ld+json">{JSON.stringify(faqJsonLd)}</Script>
      <Script id="ld-vs-wordwall-breadcrumb" type="application/ld+json">{JSON.stringify(breadcrumbJsonLd)}</Script>

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="mb-6 font-neo-display text-4xl font-bold leading-tight sm:text-5xl">
          Wordwall&apos;s template library is huge. LexiClash goes deeper on word games.
        </h1>

        <p className="mb-8 text-lg leading-relaxed text-neo-gray-200">
          Wordwall is the swiss-army knife of classroom activities — 50+ templates, fill-in-the-blanks, balloon pops,
          quiz games, the works. Great breadth. But for vocabulary teachers who specifically want word-formation
          gameplay (find words on a grid, build anagrams, spin word wheels), Wordwall&apos;s anagram template is
          shallow compared to a purpose-built word-game platform. LexiClash trades template variety for depth in
          the one category teachers reach for most: word games. Whole class free, no Wordwall subscription, no student
          signup, six languages with native dictionaries.
        </p>

        <section className="mb-12 flex flex-col gap-3 sm:flex-row sm:gap-4">
          <Link href={`/${locale}/education/classroom-game`} className="rounded-neo border-4 border-neo-lime bg-neo-lime px-6 py-3 text-center font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg sm:px-8 sm:py-4">
            Try LexiClash Free
          </Link>
          <Link href={`/${locale}/education/vocabulary-games-classroom`} className="rounded-neo border-4 border-neo-cyan bg-transparent px-6 py-3 text-center font-bold text-neo-cyan shadow-hard transition-all hover:bg-neo-cyan/10 sm:px-8 sm:py-4">
            Classroom Games
          </Link>
          <Link href={`/${locale}/education/games-for-teachers`} className="rounded-neo border-4 border-neo-pink bg-transparent px-6 py-3 text-center font-bold text-neo-pink shadow-hard transition-all hover:bg-neo-pink/10 sm:px-8 sm:py-4">
            For Teachers
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
                  <th className="px-4 py-3 text-center text-neo-gray-300">Wordwall</th>
                </tr>
              </thead>
              <tbody>
                {compareRows.map(([feature, lexi, wordwall]) => (
                  <tr key={feature} className="border-b border-neo-gray-400/50">
                    <td className="px-4 py-3 font-medium">{feature}</td>
                    <td className="px-4 py-3 text-center text-neo-cyan">{lexi}</td>
                    <td className="px-4 py-3 text-center text-neo-gray-300">{wordwall}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-neo-gray-300">Wordwall pricing as of 2026: free tier limited to 5 active activities; Wordwall Pro £4-9/month, Plus £15/month per teacher.</p>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">When LexiClash beats Wordwall</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { title: 'Word-formation depth', desc: 'Wordwall\'s anagram template scrambles letters; that\'s it. LexiClash has Boggle-style grids, multi-letter word wheels with center-letter rules, and proper anagram puzzles — actual word-game mechanics.' },
              { title: 'Real-time multiplayer in free tier', desc: 'Wordwall\'s live multiplayer modes are mostly Pro features. LexiClash classroom multiplayer is free, full-featured, and supports up to 30 students.' },
              { title: '6 native-dictionary languages', desc: 'For ESL, Hebrew immersion, Spanish bilingual — LexiClash has full dictionaries in EN/HE/ES/SV/JA. Wordwall is text-only multilingual, no language-game depth.' },
              { title: '1v1 vocabulary duels', desc: 'Pair students for head-to-head 2-3 minute word battles. Wordwall doesn\'t have a paired-student game format.' },
              { title: 'No 5-activity limit', desc: 'Wordwall\'s free tier caps you at 5 active activities. LexiClash has no activity cap — make as many word lists as you want, at no cost — custom lists are a free-tier feature.' },
              { title: 'Faster setup for word games', desc: 'Wordwall: pick template, paste words, configure. LexiClash: pick a list, share the code. Under 60 seconds vs 2-5 minutes per activity.' },
            ].map((item) => (
              <div key={item.title} className="rounded-neo border-3 border-neo-lime/40 bg-neo-navy/50 p-4 shadow-hard">
                <h3 className="mb-1 font-bold text-neo-lime">{item.title}</h3>
                <p className="text-sm text-neo-gray-200">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">When Wordwall still wins</h2>
          <p className="text-neo-gray-200">
            Wordwall&apos;s breadth is unmatched. If you need quiz games, fill-in-the-blanks, image-matching, balloon
            pops, sorting activities, or any of 40+ non-word-game templates, Wordwall is the right tool. LexiClash
            is purpose-built for word-formation games specifically — if that&apos;s your need, the depth wins; if you
            need a Swiss-army knife of activity formats, Wordwall is the better pick. Many teachers use both: Wordwall
            for varied activity formats, LexiClash for vocabulary and word-game review.
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
              <p className="mt-1 text-xs text-neo-gray-200">Word games vs flashcards.</p>
            </Link>
            <Link href={`/${locale}/lexiclash-vs-kahoot`} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-lime/40">
              <h3 className="font-bold text-neo-cyan">LexiClash vs Kahoot</h3>
              <p className="mt-1 text-xs text-neo-gray-200">Word games vs quizzes.</p>
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
            5-minute slot, vocabulary list ready, code on the projector. If word-game depth matters more than template
            variety for your classroom, LexiClash is built for that. Free, no signup, no Wordwall Pro upgrade prompts.
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
