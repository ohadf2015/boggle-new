import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { TopBackLink } from '@/components/navigation/TopBackLink';
import { WaygroundStarterLimitHonestyStrip } from '@/components/education/WaygroundStarterLimitHonestyStrip';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_PATH = '/lexiclash-vs-wayground';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isEnglish = locale === 'en';
  const pageUrl = `${BASE_URL}/en${PAGE_PATH}`;

  return {
    title: 'LexiClash vs Wayground (Quizizz) — Free Classroom Word Games (2026) | LexiClash',
    description:
      'LexiClash vs Wayground (Quizizz) Starter: no 20-activity library limit. Classroom reteach / Live deep-links miss gaps. Free whole-class word games vs Starter “Store up to 20 resources” (Updated 12 May 2026).',
    keywords:
      'lexiclash vs wayground, wayground alternative, quizizz alternative, wayground starter 20 activity limit, free quizizz alternative, classroom reteach live, vocabulary wayground alternative',
    openGraph: {
      title: 'LexiClash vs Wayground (Quizizz) — No 20-activity library cap',
      description:
        'Wayground Starter stores up to 20 resources. LexiClash reteach Live has no 20-resource ceiling.',
      locale: 'en_US',
      type: 'website',
      url: pageUrl,
      images: [
        {
          url: `${BASE_URL}/og-image-en.webp`,
          width: 1200,
          height: 630,
          alt: 'LexiClash vs Wayground comparison',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'LexiClash vs Wayground — Free classroom foil',
      description: 'No 20-activity library limit. Reteach Live from miss gaps.',
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
  {
    q: 'Does Wayground Starter limit how many activities I can store?',
    a: 'Yes. Wayground (Quizizz Inc. DBA Wayground) Starter (Basic) help — Updated 12 May 2026 — lists “20 activity limit: Store up to 20 resources on your account.” Hit 20 and you archive or upgrade before creating more. Cite help.wayground.com Starter plan article 158000404038.',
  },
  {
    q: 'How does LexiClash foil the Wayground Starter 20-activity library limit?',
    a: 'LexiClash classroom reteach / Live turns miss gaps into a Live deep-link — no 20-resource library ceiling on the free classroom loop. Distinct from Kahoot Go Free table 40 vs FAQ 10 (#1132) and Blooket Gaps Set rebuild (#1125).',
  },
  {
    q: 'Is Wayground the same as Quizizz?',
    a: 'Wayground is Quizizz Inc. DBA Wayground (support@wayground.com on the Starter help article). The Starter plan still enforces the 20 activity / resource library limit described above.',
  },
  {
    q: 'Do students need accounts on LexiClash?',
    a: 'No. Students join with a 6-character code. Teacher Pro adds unlimited classes and printable reports; the free tier already covers a whole class of up to 50 without a 20-activity library cap.',
  },
  {
    q: 'Is LexiClash a quiz platform like Wayground?',
    a: 'Different category. Wayground is Assessments/Quizzes, Lessons, Interactive Videos, Flashcards. LexiClash is word-formation (Boggle-style grids, anagrams, word wheels) for vocabulary and language practice — with classroom reteach Live from miss gaps.',
  },
];

const compareRows: ReadonlyArray<readonly [string, string, string]> = [
  ['Free-tier library / activity storage', '✓ No 20-resource ceiling', 'Starter: 20 activity limit'],
  ['Reteach from miss gaps', '✓ Live deep-link', 'Rebuild / host from library'],
  ['No student signup', '✓ 6-character join code', 'PIN / join code'],
  ['Game type', 'Word-formation (Boggle/Wheel/Anagram)', 'Quiz / lesson / interactive video'],
  ['Best for', 'Vocabulary, spelling, ESL', 'Trivia, quizzes, lessons'],
  ['Whole-class multiplayer', '✓ Up to 50 students free', 'Up to 100 participants (Starter)'],
  ['Evidence (Starter)', '—', 'Updated 12 May 2026 — Store up to 20 resources'],
];

export default async function Page({ params }: PageProps) {
  const { locale } = await params;
  const pageUrl = `${BASE_URL}/en${PAGE_PATH}`;

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Script
        id="lexiclash-vs-wayground-faq-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <TopBackLink className="mb-4" />

      <header className="mb-8">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-neo-cyan">
          Compare · education foil
        </p>
        <h1 className="mb-3 font-neo-display text-3xl font-bold sm:text-4xl">
          LexiClash vs Wayground (Quizizz)
        </h1>
        <p className="text-base leading-relaxed text-neo-gray-200 sm:text-lg">
          Wayground Starter (Basic) — Updated 12 May 2026 — publishes a{' '}
          <strong>20 activity limit: Store up to 20 resources</strong>. LexiClash classroom
          reteach / Live deep-links miss gaps without that library ceiling. Distinct from Kahoot
          Go Free 40 vs FAQ 10 and Blooket Gaps Set rebuilds.
        </p>
        <p className="mt-2 text-sm text-neo-gray-300">
          Evidence:{' '}
          <a
            href="https://help.wayground.com/support/solutions/articles/158000404038-wayground-starter-basic-plan"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-neo-cyan/60"
          >
            help.wayground.com Starter plan
          </a>
        </p>
      </header>

      <WaygroundStarterLimitHonestyStrip locale={locale} />

      <section className="mb-12 overflow-x-auto">
        <h2 className="mb-4 font-neo-display text-2xl font-bold">Side-by-side</h2>
        <table className="w-full min-w-[640px] border-3 border-neo-gray-400 text-left text-sm">
          <thead className="bg-neo-navy/80">
            <tr>
              <th className="border-b-3 border-neo-gray-400 p-3">Feature</th>
              <th className="border-b-3 border-neo-gray-400 p-3 text-neo-lime">LexiClash</th>
              <th className="border-b-3 border-neo-gray-400 p-3">Wayground Starter</th>
            </tr>
          </thead>
          <tbody>
            {compareRows.map(([feature, lexi, wg]) => (
              <tr key={feature} className="odd:bg-neo-navy/40">
                <td className="border-b border-neo-gray-500/40 p-3 font-medium">{feature}</td>
                <td className="border-b border-neo-gray-500/40 p-3">{lexi}</td>
                <td className="border-b border-neo-gray-500/40 p-3">{wg}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-neo-gray-400">
          Participant limit 40 / FAQ 10 is a Kahoot Go claim (#1132) — not this Wayground foil.
          Gaps Set rebuild is Blooket (#1125).
        </p>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 font-neo-display text-2xl font-bold">FAQ</h2>
        <dl className="space-y-4">
          {faqs.map((f) => (
            <div key={f.q} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/40 p-4">
              <dt className="font-bold">{f.q}</dt>
              <dd className="mt-2 text-sm text-neo-gray-200">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <p className="text-sm text-neo-gray-300">
        <Link href={`/${locale}/education/classroom-game`} className="text-neo-lime underline">
          Start a classroom game
        </Link>
        {' · '}
        <Link href={`/${locale}/lexiclash-vs-kahoot`} className="underline">
          vs Kahoot
        </Link>
        {' · '}
        <Link href={`/${locale}/lexiclash-vs-blooket`} className="underline">
          vs Blooket
        </Link>
      </p>
    </main>
  );
}
