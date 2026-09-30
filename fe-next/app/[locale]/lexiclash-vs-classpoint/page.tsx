import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { TopBackLink } from '@/components/navigation/TopBackLink';
import { ClassPointBasicFreeHonestyStrip } from '@/components/education/ClassPointBasicFreeHonestyStrip';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_PATH = '/lexiclash-vs-classpoint';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isEnglish = locale === 'en';
  const pageUrl = `${BASE_URL}/en${PAGE_PATH}`;

  return {
    title: 'LexiClash vs ClassPoint Basic Free — 25 seats / 5 Q Honesty (2026) | LexiClash',
    description:
      'LexiClash vs ClassPoint Basic Free: pricing publishes Max 25 class size, 5 Questions per PPT, 5 Question types, 3 Draggable objects, 3 saved classes. LexiClash whole-class free (50) + miss→reteach Live.',
    keywords:
      'lexiclash vs classpoint, classpoint basic free 25, classpoint free alternative, powerpoint classroom quiz alternative, whole class vocabulary game',
    openGraph: {
      title: 'LexiClash vs ClassPoint Basic Free — 25 seats / 5 Q honesty',
      description:
        'ClassPoint Basic Free: Max 25 · 5 Q/PPT. LexiClash: whole-class free vocab (50) + miss→Live.',
      locale: 'en_US',
      type: 'website',
      url: pageUrl,
      images: [
        {
          url: `${BASE_URL}/og-image-en.webp`,
          width: 1200,
          height: 630,
          alt: 'LexiClash vs ClassPoint comparison',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'LexiClash vs ClassPoint Basic Free — 25 / 5 Q honesty',
      description: 'ClassPoint Basic Free: Max 25 · 5 Q/PPT. LexiClash: whole-class free vocab.',
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
    q: "What is ClassPoint Basic Free's published cap?",
    a: 'ClassPoint pricing (classpoint.io/pricing, lastChecked September 30, 2026) lists Basic Free: Max 25 class size, 5 Questions per PPT, 5 Question types, 3 Draggable objects, 3 saved classes (plus 20 free AI quiz credits and Basic gamification). Distinct from Socrative Free 5 Quizzes / 1 Room / 50 (#1190).',
  },
  {
    q: "How does LexiClash foil ClassPoint Basic Free's Max 25 / 5 Q cap?",
    a: 'LexiClash free classroom vocab runs a whole class (up to 50 students) with miss-gap → reteach Live — one published free seat cap per class, not a Max-25 PowerPoint class-size / 5-questions-per-PPT Free ceiling. Distinct from Socrative Free 5/1/50/#1190, Wayground Basic 20 max/#1189, Mentimeter Free 50/month/#1183, Wooclap Starter 5 active/#1186, Nearpod Silver 40-join/#1169, Blooket Starter ≤60/#1166, and Gimkit Pro-Exclusive 5/#1137.',
  },
  {
    q: 'Is LexiClash a PowerPoint add-in like ClassPoint?',
    a: 'Different category. ClassPoint is interactive questions / gamification inside PowerPoint with a Basic Free class-size and questions-per-PPT ceiling. LexiClash is word-formation (Boggle-style grids, anagrams, word wheels) for vocabulary practice — free whole-class seats on the classroom loop, no PowerPoint install required.',
  },
  {
    q: 'Do students need accounts on LexiClash?',
    a: 'No. Students join with a 6-character code. Teacher Pro adds unlimited classes and printable reports; the free tier already covers a whole class of up to 50 for vocab word games.',
  },
];

const compareRows: ReadonlyArray<readonly [string, string, string]> = [
  ['Free class / seat size', '✓ Up to 50 students free per class', 'Basic Free: Max 25 class size'],
  ['Free questions / activities', '✓ Free classroom vocab loop (no 5-Q/PPT ceiling)', 'Basic Free: 5 Questions per PPT'],
  ['Question / activity types', '✓ Word-formation modes (Boggle/Wheel/Anagram)', 'Basic Free: 5 Question types'],
  ['Saved classes / library', '✓ Free classroom loop + Live', 'Basic Free: 3 saved classes'],
  ['Draggable / interactive objects', '—', 'Basic Free: 3 Draggable objects'],
  ['Vs Socrative Free foil', '—', 'Distinct from Socrative Free 5 Quizzes / 1 Room / 50 (#1190)'],
  ['Miss → reteach Live', '✓ Free miss-gap → Live deep-link', 'In-PPT questions / reports (plan-gated)'],
  ['No student signup', '✓ 6-character join code', 'Students join ClassPoint sessions'],
  ['Game / lesson type', 'Word-formation (Boggle/Wheel/Anagram)', 'PowerPoint interactive questions / gamification'],
  [
    'Evidence',
    '—',
    'classpoint.io/pricing (Basic Free: Max 25 · 5 Q/PPT · 5 types · 3 drag · 3 saved)',
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
        id="lexiclash-vs-classpoint-faq"
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
          LexiClash vs ClassPoint Basic Free — Max 25 / 5 Questions honesty
        </h1>
        <p className="text-base leading-relaxed text-neo-gray-200 sm:text-lg">
          ClassPoint Basic Free publishes <strong>Max 25 class size</strong>,{' '}
          <strong>5 Questions per PPT</strong>, <strong>5 Question types</strong>,{' '}
          <strong>3 Draggable objects</strong>, and <strong>3 saved classes</strong> on the pricing
          page. Distinct from Socrative Free <strong>5 Quizzes / 1 Room / 50</strong>. LexiClash
          foils with whole-class free (50) + miss→reteach Live — no Max-25 / 5-Q-per-PPT Free
          ceiling. Cite{' '}
          <a
            href="https://www.classpoint.io/pricing"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-neo-cyan/60"
          >
            classpoint.io/pricing
          </a>{' '}
          and{' '}
          <a
            href="https://www.classpoint.io/schools-districts"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-neo-cyan/60"
          >
            ClassPoint schools & districts
          </a>
          .
        </p>
      </header>

      <ClassPointBasicFreeHonestyStrip locale={locale} />

      <section className="mb-12 overflow-x-auto">
        <h2 className="mb-4 font-neo-display text-2xl font-bold">Side-by-side</h2>
        <table className="w-full min-w-[640px] border-3 border-neo-gray-400 text-left text-sm">
          <thead className="bg-neo-navy/80">
            <tr>
              <th className="border-b-3 border-neo-gray-400 p-3">Feature</th>
              <th className="border-b-3 border-neo-gray-400 p-3 text-neo-lime">LexiClash</th>
              <th className="border-b-3 border-neo-gray-400 p-3">ClassPoint Basic Free</th>
            </tr>
          </thead>
          <tbody>
            {compareRows.map(([feature, lexi, cp]) => (
              <tr key={feature} className="odd:bg-neo-navy/40">
                <td className="border-b border-neo-gray-500/40 p-3 font-medium">{feature}</td>
                <td className="border-b border-neo-gray-500/40 p-3">{lexi}</td>
                <td className="border-b border-neo-gray-500/40 p-3">{cp}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-neo-gray-400">
          Socrative Free 5/1/50 is #1190. Wayground Basic 20 max is #1189. Mentimeter Free 50/month
          is #1183. Wooclap Starter 5 active is #1186. Nearpod Silver 40-join is #1169. Skip open
          #1187 (CTR titles).
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
        <Link href={`/${locale}/lexiclash-vs-socrative`} className="underline">
          vs Socrative
        </Link>
        {' · '}
        <Link href={`/${locale}/lexiclash-vs-wayground`} className="underline">
          vs Wayground
        </Link>
        {' · '}
        <Link href={`/${locale}/lexiclash-vs-kahoot`} className="underline">
          vs Kahoot
        </Link>
      </p>
    </main>
  );
}
