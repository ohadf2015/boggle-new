import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { TopBackLink } from '@/components/navigation/TopBackLink';
import { GimkitProExclusiveModesHonestyStrip } from '@/components/education/GimkitProExclusiveModesHonestyStrip';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_PATH = '/lexiclash-vs-gimkit';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isEnglish = locale === 'en';
  const pageUrl = `${BASE_URL}/en${PAGE_PATH}`;

  return {
    title: 'LexiClash vs Gimkit Basic — Pro-Exclusive Modes 5-Player Foil (2026) | LexiClash',
    description:
      'LexiClash vs Gimkit Basic: Pro-Exclusive modes limited to 5 players on free Gimkit Basic. LexiClash whole-class free vocab (up to 50). Cite Gimkit player maximums + Pro FAQ.',
    keywords:
      'lexiclash vs gimkit, gimkit basic alternative, gimkit pro exclusive 5 players, free gimkit alternative, whole class vocabulary game, gimkit basic player limit',
    openGraph: {
      title: 'LexiClash vs Gimkit Basic — Pro-Exclusive modes capped at 5',
      description:
        'Gimkit Basic: Pro-Exclusive modes limited to 5 players. LexiClash: whole-class free vocab.',
      locale: 'en_US',
      type: 'website',
      url: pageUrl,
      images: [
        {
          url: `${BASE_URL}/og-image-en.webp`,
          width: 1200,
          height: 630,
          alt: 'LexiClash vs Gimkit comparison',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'LexiClash vs Gimkit Basic — 5-player Pro-Exclusive foil',
      description: 'Pro-Exclusive modes: 5 players on Basic. LexiClash: whole-class free vocab.',
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
    q: 'Are Gimkit Pro-Exclusive modes limited on Gimkit Basic?',
    a: 'Yes. Gimkit help “Player maximums” states: Gimkit Pro Exclusive modes are limited to 5 players for Gimkit Basic members. Featured modes on Basic are unlimited; Pro Exclusive modes rotate and stay capped at 5 until you upgrade. Cite help.gimkit.com player-maximums-18mbcz0 and gimkit-pro-faq-14h6d62.',
  },
  {
    q: 'How does LexiClash foil Gimkit Basic’s 5-player Pro-Exclusive cap?',
    a: 'LexiClash free classroom vocab runs a whole class (up to 50 students) without a Pro-Exclusive-style mode that drops to 5 seats. Distinct from Wayground Starter’s 20-activity library ceiling (#1136), Kahoot Go Free table 40 vs FAQ 10 (#1132), and Blooket Gaps Set rebuild (#1125).',
  },
  {
    q: 'What is the difference between Gimkit Basic and Gimkit Pro?',
    a: 'Gimkit Pro FAQ: Basic lets you play featured modes with as many students as you want; Pro unlocks all modes (Pro Exclusives), Assignments, and media uploads. On Basic, those Pro Exclusive modes stay limited to 5 players.',
  },
  {
    q: 'Do students need accounts on LexiClash?',
    a: 'No. Students join with a 6-character code. Teacher Pro adds unlimited classes and printable reports; the free tier already covers a whole class of up to 50 for vocab word games.',
  },
  {
    q: 'Is LexiClash a quiz platform like Gimkit?',
    a: 'Different category. Gimkit is kit/quiz live modes (featured + Pro Exclusives). LexiClash is word-formation (Boggle-style grids, anagrams, word wheels) for vocabulary and language practice — free whole-class seats on the classroom loop.',
  },
];

const compareRows: ReadonlyArray<readonly [string, string, string]> = [
  ['Pro-Exclusive / premium modes on free tier', '✓ Whole-class free vocab (no 5-seat mode)', 'Basic: Pro Exclusive modes → 5 players'],
  ['Featured / core free play', '✓ Up to 50 students free', 'Unlimited on featured modes (Basic)'],
  ['No student signup', '✓ 6-character join code', 'Join / kit codes'],
  ['Game type', 'Word-formation (Boggle/Wheel/Anagram)', 'Quiz kits / live game modes'],
  ['Best for', 'Vocabulary, spelling, ESL', 'Trivia kits, money modes, Pro Exclusives'],
  ['Evidence (Basic Pro Exclusive)', '—', 'Player maximums: limited to 5 players'],
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
        id="lexiclash-vs-gimkit-faq-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      {/* Do not pass locale to TopBackLink — it has no locale prop (#1136 type pitfall). */}
      <TopBackLink className="mb-4" />

      <header className="mb-8">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-neo-cyan">
          Compare · education foil
        </p>
        <h1 className="mb-3 font-neo-display text-3xl font-bold sm:text-4xl">
          LexiClash vs Gimkit Basic
        </h1>
        <p className="text-base leading-relaxed text-neo-gray-200 sm:text-lg">
          Gimkit Basic offers featured modes with unlimited players, but{' '}
          <strong>Gimkit Pro Exclusive modes are limited to 5 players</strong> for Basic members.
          LexiClash whole-class free vocab keeps a clear classroom seat cap (up to 50) — no
          Pro-Exclusive mode that shrinks to five. Distinct from Wayground Starter 20-activity,
          Kahoot Go Free 40 vs FAQ 10, and Blooket Gaps Set rebuilds.
        </p>
        <p className="mt-2 text-sm text-neo-gray-300">
          Evidence:{' '}
          <a
            href="https://help.gimkit.com/en/article/player-maximums-18mbcz0/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-neo-cyan/60"
          >
            help.gimkit.com Player maximums
          </a>
          {' · '}
          <a
            href="https://help.gimkit.com/en/article/gimkit-pro-faq-14h6d62/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-neo-cyan/60"
          >
            Gimkit Pro FAQ
          </a>
        </p>
      </header>

      <GimkitProExclusiveModesHonestyStrip locale={locale} />

      <section className="mb-12 overflow-x-auto">
        <h2 className="mb-4 font-neo-display text-2xl font-bold">Side-by-side</h2>
        <table className="w-full min-w-[640px] border-3 border-neo-gray-400 text-left text-sm">
          <thead className="bg-neo-navy/80">
            <tr>
              <th className="border-b-3 border-neo-gray-400 p-3">Feature</th>
              <th className="border-b-3 border-neo-gray-400 p-3 text-neo-lime">LexiClash</th>
              <th className="border-b-3 border-neo-gray-400 p-3">Gimkit Basic</th>
            </tr>
          </thead>
          <tbody>
            {compareRows.map(([feature, lexi, gk]) => (
              <tr key={feature} className="odd:bg-neo-navy/40">
                <td className="border-b border-neo-gray-500/40 p-3 font-medium">{feature}</td>
                <td className="border-b border-neo-gray-500/40 p-3">{lexi}</td>
                <td className="border-b border-neo-gray-500/40 p-3">{gk}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-neo-gray-400">
          20-activity library ceiling is Wayground Starter (#1136). Participant limit 40 / FAQ 10
          is Kahoot Go (#1132). Gaps Set rebuild is Blooket (#1125).
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
        <Link href={`/${locale}/lexiclash-vs-wayground`} className="underline">
          vs Wayground
        </Link>
        {' · '}
        <Link href={`/${locale}/lexiclash-vs-blooket`} className="underline">
          vs Blooket
        </Link>
      </p>
    </main>
  );
}
