import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { TopBackLink } from '@/components/navigation/TopBackLink';
import { SocrativeFreeTierHonestyStrip } from '@/components/education/SocrativeFreeTierHonestyStrip';
import { TeacherProCompareCheckoutStrip } from '@/components/education/TeacherProCompareCheckoutStrip';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_PATH = '/lexiclash-vs-socrative';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isEnglish = locale === 'en';
  const pageUrl = `${BASE_URL}/en${PAGE_PATH}`;

  return {
    title: 'LexiClash vs Socrative Free — 5 Quizzes / 1 Room / 50 Honesty (2026) | LexiClash',
    description:
      'LexiClash vs Socrative Free: pricing publishes 5 Quizzes, 1 Room, 50 students per activity. Distinct from Wayground Basic 20 max storage. LexiClash whole-class free (50) + miss→reteach Live.',
    keywords:
      'lexiclash vs socrative, socrative free 5 quizzes, socrative free alternative, classroom quiz alternative, whole class vocabulary game',
    openGraph: {
      title: 'LexiClash vs Socrative Free — 5 Quizzes / 1 Room / 50 honesty',
      description:
        'Socrative Free: 5 Quizzes · 1 Room · 50 students. LexiClash: whole-class free vocab (50) + miss→Live.',
      locale: 'en_US',
      type: 'website',
      url: pageUrl,
      images: [
        {
          url: `${BASE_URL}/og-image-en.webp`,
          width: 1200,
          height: 630,
          alt: 'LexiClash vs Socrative comparison',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'LexiClash vs Socrative Free — 5 / 1 / 50 honesty',
      description: 'Socrative Free: 5 Quizzes · 1 Room · 50 students. LexiClash: whole-class free vocab.',
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
    q: "What is Socrative Free's published cap?",
    a: 'Socrative pricing (socrative.com/pricing, lastChecked September 29, 2026) lists Free: 5 Quizzes, 1 Room, 50 student per activity, plus 30-day report history. Help (choosing the right Socrative plan) notes Free keeps access to the last 5 modified quizzes and one room on downgrade. Distinct from Wayground Basic 20 max activity storage (#1189).',
  },
  {
    q: "How does LexiClash foil Socrative Free's 5 Quizzes / 1 Room / 50 cap?",
    a: 'LexiClash free classroom vocab runs a whole class (up to 50 students) with miss-gap → reteach Live — one published free seat cap per class, not a 5-quiz / 1-room Free library ceiling. Distinct from Wayground Basic 20 max/#1189, Mentimeter Free 50/month/#1183, Wooclap Starter 5 active/#1186, Nearpod Silver 40-join/#1169, Blooket Starter ≤60/#1166, and Gimkit Pro-Exclusive 5/#1137.',
  },
  {
    q: 'Is LexiClash a quiz-response tool like Socrative?',
    a: 'Different category. Socrative is formative assessment / quizzes / rooms with a Free quiz+room library ceiling. LexiClash is word-formation (Boggle-style grids, anagrams, word wheels) for vocabulary practice — free whole-class seats on the classroom loop.',
  },
  {
    q: 'Do students need accounts on LexiClash?',
    a: 'No. Students join with a 6-character code. Teacher Pro adds unlimited classes and printable reports; the free tier already covers a whole class of up to 50 for vocab word games.',
  },
];

const compareRows: ReadonlyArray<readonly [string, string, string]> = [
  ['Free quiz / activity library', '✓ Free classroom vocab loop (no 5-quiz ceiling)', 'Free: 5 Quizzes'],
  ['Free rooms / sessions', '✓ Whole-class Live + miss→reteach', 'Free: 1 Room'],
  ['Free student / seat model', '✓ Up to 50 students free per class', 'Free: 50 student per activity'],
  ['Report history (Free)', '—', '30-day report history'],
  ['Vs Wayground storage foil', '—', 'Distinct from Wayground Basic 20 max activity storage (#1189)'],
  ['Miss → reteach Live', '✓ Free miss-gap → Live deep-link', 'Quiz reports / rooms (plan-gated features vary)'],
  ['No student signup', '✓ 6-character join code', 'Students join Socrative rooms'],
  ['Game / lesson type', 'Word-formation (Boggle/Wheel/Anagram)', 'Formative quizzes / Space Race / Exit Tickets'],
  [
    'Evidence',
    '—',
    'socrative.com/pricing (Free: 5 Quizzes · 1 Room · 50) + Help choosing-the-right-plan',
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
        id="lexiclash-vs-socrative-faq"
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
          LexiClash vs Socrative Free — 5 Quizzes / 1 Room / 50 honesty
        </h1>
        <p className="text-base leading-relaxed text-neo-gray-200 sm:text-lg">
          Socrative Free publishes <strong>5 Quizzes</strong>, <strong>1 Room</strong>, and{' '}
          <strong>50 student per activity</strong> on the pricing page (plus 30-day report history).
          Distinct from Wayground Basic <strong>20 max</strong> activity storage. LexiClash foils with
          whole-class free (50) + miss→reteach Live — no 5-quiz / 1-room Free library ceiling. Cite{' '}
          <a
            href="https://www.socrative.com/pricing"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-neo-cyan/60"
          >
            socrative.com/pricing
          </a>{' '}
          and{' '}
          <a
            href="https://help.socrative.com/en/articles/8228775-choosing-the-right-socrative-plan"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-neo-cyan/60"
          >
            Socrative Help (choosing the right plan)
          </a>
          .
        </p>
      </header>

      <TeacherProCompareCheckoutStrip locale={locale} />

      <SocrativeFreeTierHonestyStrip locale={locale} />

      <section className="mb-12 overflow-x-auto">
        <h2 className="mb-4 font-neo-display text-2xl font-bold">Side-by-side</h2>
        <table className="w-full min-w-[640px] border-3 border-neo-gray-400 text-left text-sm">
          <thead className="bg-neo-navy/80">
            <tr>
              <th className="border-b-3 border-neo-gray-400 p-3">Feature</th>
              <th className="border-b-3 border-neo-gray-400 p-3 text-neo-lime">LexiClash</th>
              <th className="border-b-3 border-neo-gray-400 p-3">Socrative Free</th>
            </tr>
          </thead>
          <tbody>
            {compareRows.map(([feature, lexi, soc]) => (
              <tr key={feature} className="odd:bg-neo-navy/40">
                <td className="border-b border-neo-gray-500/40 p-3 font-medium">{feature}</td>
                <td className="border-b border-neo-gray-500/40 p-3">{lexi}</td>
                <td className="border-b border-neo-gray-500/40 p-3">{soc}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-neo-gray-400">
          Wayground Basic 20 max is #1189. Mentimeter Free 50/month is #1183. Wooclap Starter 5 active
          is #1186. Nearpod Silver 40-join is #1169. Skip open #1187 (CTR titles).
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
        <Link href={`/${locale}/lexiclash-vs-wayground`} className="underline">
          vs Wayground
        </Link>
        {' · '}
        <Link href={`/${locale}/lexiclash-vs-mentimeter`} className="underline">
          vs Mentimeter
        </Link>
        {' · '}
        <Link href={`/${locale}/lexiclash-vs-kahoot`} className="underline">
          vs Kahoot
        </Link>
      </p>
    </main>
  );
}
