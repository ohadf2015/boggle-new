import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { TopBackLink } from '@/components/navigation/TopBackLink';
import { PadletNeonFreeHonestyStrip } from '@/components/education/PadletNeonFreeHonestyStrip';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_PATH = '/lexiclash-vs-padlet';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isEnglish = locale === 'en';
  const pageUrl = `${BASE_URL}/en${PAGE_PATH}`;

  return {
    title: 'LexiClash vs Padlet Neon Free — 3 Padlets + 20MB Honesty (2026) | LexiClash',
    description:
      'LexiClash vs Padlet Neon Free: 3 active padlets + 20MB upload/file (1 user, 2-min video / 5-min audio). Platinum = unlimited padlets + 500MB. LexiClash whole-class free vocab (50) — no 3-board Neon Free gate.',
    keywords:
      'lexiclash vs padlet, padlet neon free 3 padlets, padlet 20MB upload limit, padlet free alternative, whole class vocabulary game',
    openGraph: {
      title: 'LexiClash vs Padlet Neon Free — 3 padlets + 20MB honesty',
      description:
        'Padlet Neon Free: 3 active padlets + 20MB/file. LexiClash: whole-class free vocab (50).',
      locale: 'en_US',
      type: 'website',
      url: pageUrl,
      images: [
        {
          url: `${BASE_URL}/og-image-en.webp`,
          width: 1200,
          height: 630,
          alt: 'LexiClash vs Padlet comparison',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'LexiClash vs Padlet Neon Free — 3 padlets + 20MB honesty',
      description:
        'Neon Free: 3 active padlets + 20MB/file. LexiClash: whole-class free (50).',
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
    q: 'What does Padlet Neon Free publish for active boards and uploads?',
    a: 'Padlet help (padlet.help …/is-it-free, lastChecked September 30, 2026) and subscriptions (padlet.com/site/subscriptions) list Neon / Free with 3 fully customizable / active padlets, a 20MB upload limit per file/attachment, 1 user, 2-minute video recordings, and 5-minute audio recordings. Unlimited posts are allowed under those upload limits. Platinum unlocks unlimited padlets and 500MB file uploads.',
  },
  {
    q: 'How does LexiClash foil Padlet Neon Free honesty?',
    a: 'LexiClash free classroom vocab runs a whole class (up to 50) for word-formation games with miss-gap → reteach Live — no Neon Free 3-active-padlet or 20MB board-upload gate for classroom play. Distinct from Pear Deck Teacher Free named-response (#1205), Nearpod Silver (#1169), Mentimeter Free 50/month (#1183), Wayground Starter (#1189), Kahoot Go (#1132), Socrative Free (#1196), and ClassPoint Basic Free (#1202).',
  },
  {
    q: 'Is LexiClash a digital canvas / board tool like Padlet?',
    a: 'Different category. Padlet is a digital canvas for visual collaboration with Neon Free capped at 3 active padlets + 20MB uploads. LexiClash is word-formation (Boggle-style grids, anagrams, word wheels) for vocabulary practice — free whole-class seats without a 3-board Neon Free gate.',
  },
  {
    q: 'Do students need accounts on LexiClash?',
    a: 'No. Students join with a 6-character code. Teacher Pro adds unlimited classes and printable reports; the free tier already covers a whole class of up to 50 for vocab word games.',
  },
];

const compareRows: ReadonlyArray<readonly [string, string, string]> = [
  [
    'Free active boards / classes',
    '✓ Whole-class free (up to 50)',
    'Neon Free: 3 active padlets',
  ],
  [
    'Upload / attachment size (Free)',
    '— (live word-formation play; no board-upload gate)',
    'Neon Free: 20MB upload/file',
  ],
  [
    'Users on Free',
    '✓ Teacher host + students via join code',
    'Neon Free: 1 user',
  ],
  [
    'Video / audio recording caps (Free)',
    '— (vocab game modes)',
    'Neon Free: 2-min video / 5-min audio',
  ],
  [
    'Unlimited boards / higher uploads',
    'Teacher Pro: unlimited classes + reports',
    'Platinum: unlimited padlets + 500MB uploads',
  ],
  [
    'Miss → reteach Live',
    '✓ Free miss-gap → Live deep-link',
    'Canvas boards / paid Classroom-School plans',
  ],
  ['No student signup', '✓ 6-character join code', 'Padlet account / free student seats on Classroom'],
  [
    'Game / lesson type',
    'Word-formation (Boggle/Wheel/Anagram)',
    'Digital canvas / boards + Sandbox + Slideshow',
  ],
  [
    'Evidence',
    '—',
    'padlet.help …/is-it-free + padlet.com/site/subscriptions',
  ],
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
        id="lexiclash-vs-padlet-faq"
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
          LexiClash vs Padlet Neon Free — 3 padlets + 20MB honesty
        </h1>
        <p className="text-base leading-relaxed text-neo-gray-200 sm:text-lg">
          Padlet <strong>Neon Free</strong> publishes{' '}
          <strong>3 fully customizable / active padlets</strong> and a{' '}
          <strong>20MB upload limit per file</strong> (plus 1 user, 2-minute video / 5-minute audio
          recordings). <strong>Platinum</strong> unlocks unlimited padlets and 500MB uploads.
          LexiClash foils with whole-class free (50) for word-formation vocab —{' '}
          <strong>no 3-active-padlet Neon Free gate</strong>. Cite{' '}
          <a
            href="https://padlet.help/l/en/article/d7d009lugq-is-it-free"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-neo-cyan/60"
          >
            padlet.help …/is-it-free
          </a>{' '}
          and{' '}
          <a
            href="https://padlet.com/site/subscriptions"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-neo-cyan/60"
          >
            padlet.com/site/subscriptions
          </a>
          .
        </p>
      </header>

      <PadletNeonFreeHonestyStrip locale={locale} />

      <section className="mb-12 overflow-x-auto">
        <h2 className="mb-4 font-neo-display text-2xl font-bold">Side-by-side</h2>
        <table className="w-full min-w-[640px] border-3 border-neo-gray-400 text-left text-sm">
          <thead className="bg-neo-navy/80">
            <tr>
              <th className="border-b-3 border-neo-gray-400 p-3">Feature</th>
              <th className="border-b-3 border-neo-gray-400 p-3 text-neo-lime">LexiClash</th>
              <th className="border-b-3 border-neo-gray-400 p-3">Padlet Neon Free</th>
            </tr>
          </thead>
          <tbody>
            {compareRows.map(([feature, lexi, padlet]) => (
              <tr key={feature} className="odd:bg-neo-navy/40">
                <td className="border-b border-neo-gray-500/40 p-3 font-medium">{feature}</td>
                <td className="border-b border-neo-gray-500/40 p-3">{lexi}</td>
                <td className="border-b border-neo-gray-500/40 p-3">{padlet}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-neo-gray-400">
          Pear Deck Teacher Free named-response is #1205. Nearpod Silver is #1169. Mentimeter Free
          50/month is #1183. Wayground Starter is #1189. Kahoot Go is #1132. Socrative Free is #1196.
          ClassPoint Basic Free is #1202. Do NOT touch open #1204 audio PR.
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
        <Link href={`/${locale}/lexiclash-vs-peardeck`} className="underline">
          vs Pear Deck
        </Link>
        {' · '}
        <Link href={`/${locale}/lexiclash-vs-nearpod`} className="underline">
          vs Nearpod
        </Link>
        {' · '}
        <Link href={`/${locale}/lexiclash-vs-kahoot`} className="underline">
          vs Kahoot
        </Link>
      </p>
    </main>
  );
}
