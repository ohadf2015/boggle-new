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
    title: 'LexiClash vs Wayground (Quizizz) — Free Classroom Vocab, No 20-Max Cap (2026) | LexiClash',
    description:
      'LexiClash vs Wayground Basic: free classroom vocab without the 20 max activity storage ceiling. Plans page “20 max” + Starter help “Store up to 20 resources” (Updated 12 May 2026). Distinct from Mentimeter / Wooclap / Nearpod / Blooket / Gimkit foils.',
    keywords:
      'lexiclash vs wayground, wayground alternative, quizizz alternative, wayground basic 20 max, wayground starter 20 activity limit, free quizizz alternative, classroom vocabulary games, reteach live',
    openGraph: {
      title: 'LexiClash vs Wayground Basic — No 20 max activity storage cap',
      description:
        'Wayground Basic plans list “20 max” activity storage. LexiClash free classroom vocab has no 20-resource ceiling.',
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
      description: 'No 20 max activity storage ceiling. Free classroom vocab + reteach Live.',
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
    q: 'Does Wayground Basic limit how many activities I can store?',
    a: 'Yes. Wayground (Quizizz Inc. DBA Wayground) Basic on wayground.com/home/plans lists “Unlimited activity storage → 20 max.” The Starter (Basic) help article — Updated 12 May 2026 — says “20 activity limit: Store up to 20 resources on your account.” Hit 20 and you archive or upgrade before creating more.',
  },
  {
    q: 'How does LexiClash foil the Wayground Basic 20 max activity storage limit?',
    a: 'LexiClash free classroom vocab + reteach / Live turns miss gaps into a Live deep-link — no 20-resource library ceiling on the free classroom loop. Distinct from Mentimeter Free 50 participants/month (#1183), Wooclap Starter 5 active questions (#1186), Nearpod Silver 40-join (#1169), Blooket free-tier caps (#1166), and Gimkit Pro-Exclusive 5-player (#1137).',
  },
  {
    q: 'Is Wayground the same as Quizizz?',
    a: 'Wayground is Quizizz Inc. DBA Wayground (support@wayground.com on the Starter help article). Basic / Starter still enforces the 20 max activity / resource library limit described above.',
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
  ['Free-tier library / activity storage', '✓ No 20-resource ceiling', 'Basic: 20 max'],
  ['Reteach from miss gaps', '✓ Live deep-link', 'Rebuild / host from library'],
  ['No student signup', '✓ 6-character join code', 'PIN / join code'],
  ['Game type', 'Word-formation (Boggle/Wheel/Anagram)', 'Quiz / lesson / interactive video'],
  ['Best for', 'Vocabulary, spelling, ESL', 'Trivia, quizzes, lessons'],
  ['Whole-class multiplayer', '✓ Up to 50 students free', 'Up to 100 students (Basic)'],
  ['Evidence (Basic / Starter)', '—', 'Plans “20 max” + help Updated 12 May 2026'],
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
          Wayground Basic on{' '}
          <a
            href="https://wayground.com/home/plans"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-neo-cyan/60"
          >
            wayground.com/home/plans
          </a>{' '}
          publishes <strong>20 max</strong> under “Unlimited activity storage.” Starter (Basic)
          help — Updated 12 May 2026 — confirms{' '}
          <a
            href="https://help.wayground.com/support/solutions/articles/158000404038-wayground-starter-basic-plan"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-neo-cyan/60"
          >
            help.wayground.com Starter plan
          </a>
          : “Store up to 20 resources.” LexiClash free classroom vocab has no 20-resource ceiling.
        </p>
      </header>

      <WaygroundStarterLimitHonestyStrip locale={locale} />

      <section className="mb-12 overflow-x-auto">
        <h2 className="mb-4 font-neo-display text-2xl font-bold">Side-by-side</h2>
        <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
          <thead>
            <tr className="text-neo-gray-300">
              <th className="border-b-3 border-neo-gray-400 p-3">Capability</th>
              <th className="border-b-3 border-neo-gray-400 p-3">LexiClash</th>
              <th className="border-b-3 border-neo-gray-400 p-3">Wayground Basic</th>
            </tr>
          </thead>
          <tbody>
            {compareRows.map(([cap, lexi, wg]) => (
              <tr key={cap}>
                <td className="border-b border-neo-gray-500/40 p-3 font-medium">{cap}</td>
                <td className="border-b border-neo-gray-500/40 p-3">{lexi}</td>
                <td className="border-b border-neo-gray-500/40 p-3">{wg}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-neo-gray-400">
          Mentimeter Free 50/month is #1183. Wooclap Starter 5 active is #1186. Nearpod Silver
          40-join / 300 MB is #1169. Blooket free-tier is #1166. Gimkit Pro-Exclusive 5 is #1137.
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
        <Link href={`/${locale}/lexiclash-vs-mentimeter`} className="underline">
          vs Mentimeter
        </Link>
        {' · '}
        <Link href={`/${locale}/lexiclash-vs-wooclap`} className="underline">
          vs Wooclap
        </Link>
        {' · '}
        <Link href={`/${locale}/lexiclash-vs-nearpod`} className="underline">
          vs Nearpod
        </Link>
        {' · '}
        <Link href={`/${locale}/lexiclash-vs-blooket`} className="underline">
          vs Blooket
        </Link>
        {' · '}
        <Link href={`/${locale}/lexiclash-vs-gimkit`} className="underline">
          vs Gimkit
        </Link>
      </p>
    </main>
  );
}
