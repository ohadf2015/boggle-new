import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { TopBackLink } from '@/components/navigation/TopBackLink';
import { NearpodSilverFreeTierHonestyStrip } from '@/components/education/NearpodSilverFreeTierHonestyStrip';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_PATH = '/lexiclash-vs-nearpod';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isEnglish = locale === 'en';
  const pageUrl = `${BASE_URL}/en${PAGE_PATH}`;

  return {
    title: 'LexiClash vs Nearpod Silver — 40 Joins / 300 MB Free Foil (2026) | LexiClash',
    description:
      'LexiClash vs Nearpod Silver free: 40 joins per lesson + 300 MB storage (Gold 75 / Platinum 90 / School 250). LexiClash whole-class free (50) + miss→reteach Live. Cite nearpod.com/pricing.',
    keywords:
      'lexiclash vs nearpod, nearpod silver alternative, nearpod 40 students, nearpod 300 MB, free nearpod alternative, whole class vocabulary game',
    openGraph: {
      title: 'LexiClash vs Nearpod Silver — 40 joins / 300 MB free foil',
      description:
        'Nearpod Silver free: 40 joins per lesson + 300 MB. LexiClash: whole-class free vocab (50) + miss→Live.',
      locale: 'en_US',
      type: 'website',
      url: pageUrl,
      images: [
        {
          url: `${BASE_URL}/og-image-en.webp`,
          width: 1200,
          height: 630,
          alt: 'LexiClash vs Nearpod comparison',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'LexiClash vs Nearpod Silver — 40 / 300 MB free foil',
      description: 'Nearpod Silver: 40 joins + 300 MB. LexiClash: whole-class free vocab.',
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
    q: 'What are Nearpod Silver free join and storage caps?',
    a: 'Nearpod pricing (nearpod.com/pricing, lastChecked September 28, 2026): Silver $0 includes 40 joins per lesson and 300 MB storage. Gold raises joins to 75 (1 GB); Platinum to 90 (5 GB); School/District licenses list 250 joins and unlimited storage.',
  },
  {
    q: 'How does LexiClash foil Nearpod Silver’s 40-join / 300 MB free caps?',
    a: 'LexiClash free classroom vocab runs a whole class (up to 50 students) with miss-gap → reteach Live — one published free seat cap, no separate 300 MB lesson-storage gate on the free reteach path. Distinct from Blooket Starter ≤60/#1166, Wayground Starter 20-activity/#1136, Gimkit Pro-Exclusive 5/#1137, Kahoot Go 40vs10/#1132, and Blooket Gaps/#1125.',
  },
  {
    q: 'Is LexiClash a slide/lesson platform like Nearpod?',
    a: 'Different category. Nearpod is interactive lessons / slides / formative assessments with storage and join caps by plan. LexiClash is word-formation (Boggle-style grids, anagrams, word wheels) for vocabulary practice — free whole-class seats on the classroom loop.',
  },
  {
    q: 'Do students need accounts on LexiClash?',
    a: 'No. Students join with a 6-character code. Teacher Pro adds unlimited classes and printable reports; the free tier already covers a whole class of up to 50 for vocab word games.',
  },
];

const compareRows: ReadonlyArray<readonly [string, string, string]> = [
  ['Free joins / seats', '✓ Up to 50 students free', 'Silver: 40 joins per lesson'],
  ['Free storage / lesson library gate', '✓ No 300 MB free storage cliff on reteach Live', 'Silver: 300 MB storage'],
  ['Paid join ladders', '—', 'Gold 75 · Platinum 90 · School/District 250'],
  ['Miss → reteach Live', '✓ Free miss-gap → Live deep-link', 'Lesson replay / reports (plan-gated features vary)'],
  ['No student signup', '✓ 6-character join code', 'Students join Nearpod lessons'],
  ['Game / lesson type', 'Word-formation (Boggle/Wheel/Anagram)', 'Interactive lessons / slides / assessments'],
  ['Evidence', '—', 'nearpod.com/pricing (Silver $0: 40 joins · 300 MB)'],
];

export default async function Page({ params }: PageProps) {
  const { locale } = await params;

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
    <main className="mx-auto max-w-4xl px-4 py-10 text-neo-gray-100">
      <Script
        id="lexiclash-vs-nearpod-faq"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      {/* Do not pass locale to TopBackLink — it has no locale prop (#1136 type pitfall). */}
      <TopBackLink className="mb-4" />

      <header className="mb-10">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-neo-cyan">
          Compare · honesty foil
        </p>
        <h1 className="mb-4 font-neo-display text-3xl font-bold sm:text-4xl">
          LexiClash vs Nearpod Silver — free 40 joins / 300 MB foil
        </h1>
        <p className="text-base leading-relaxed text-neo-gray-200 sm:text-lg">
          Nearpod Silver ($0) publishes <strong>40 joins per lesson</strong> and{' '}
          <strong>300 MB</strong> storage; Gold 75 / Platinum 90 / School·District 250. LexiClash
          foils with whole-class free (50) + miss→reteach Live. Cite{' '}
          <a
            href="https://nearpod.com/pricing"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-neo-cyan/60"
          >
            nearpod.com/pricing
          </a>
          .
        </p>
      </header>

      <NearpodSilverFreeTierHonestyStrip locale={locale} />

      <section className="mb-12 overflow-x-auto">
        <h2 className="mb-4 font-neo-display text-2xl font-bold">Side-by-side</h2>
        <table className="w-full min-w-[640px] border-3 border-neo-gray-400 text-left text-sm">
          <thead className="bg-neo-navy/80">
            <tr>
              <th className="border-b-3 border-neo-gray-400 p-3">Feature</th>
              <th className="border-b-3 border-neo-gray-400 p-3 text-neo-lime">LexiClash</th>
              <th className="border-b-3 border-neo-gray-400 p-3">Nearpod Silver</th>
            </tr>
          </thead>
          <tbody>
            {compareRows.map(([feature, lexi, np]) => (
              <tr key={feature} className="odd:bg-neo-navy/40">
                <td className="border-b border-neo-gray-500/40 p-3 font-medium">{feature}</td>
                <td className="border-b border-neo-gray-500/40 p-3">{lexi}</td>
                <td className="border-b border-neo-gray-500/40 p-3">{np}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-neo-gray-400">
          Blooket Starter ≤60 + homework 14d is #1166. Gimkit Pro-Exclusive 5 is #1137. Wayground
          Starter 20-activity is #1136. Kahoot Go 40 vs FAQ 10 is #1132.
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
        <Link href={`/${locale}/lexiclash-vs-blooket`} className="underline">
          vs Blooket
        </Link>
        {' · '}
        <Link href={`/${locale}/lexiclash-vs-gimkit`} className="underline">
          vs Gimkit
        </Link>
        {' · '}
        <Link href={`/${locale}/lexiclash-vs-kahoot`} className="underline">
          vs Kahoot
        </Link>
      </p>
    </main>
  );
}
