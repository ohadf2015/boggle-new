import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { TopBackLink } from '@/components/navigation/TopBackLink';
import { MentimeterFreeTierHonestyStrip } from '@/components/education/MentimeterFreeTierHonestyStrip';
import { TeacherProCompareCheckoutStrip } from '@/components/education/TeacherProCompareCheckoutStrip';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_PATH = '/lexiclash-vs-mentimeter';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isEnglish = locale === 'en';
  const pageUrl = `${BASE_URL}/en${PAGE_PATH}`;

  return {
    title: 'LexiClash vs Mentimeter Free — 50 Participants/Month Honesty (2026) | LexiClash',
    description:
      'LexiClash vs Mentimeter Free: Help + pricing table publish 50 participants per month (reset on account-creation date; 8-hour grace). Free marketing bullets say Unlimited participants once per month. LexiClash whole-class free (50) + miss→reteach Live.',
    keywords:
      'lexiclash vs mentimeter, mentimeter free 50 participants, mentimeter free alternative, classroom presentation alternative, whole class vocabulary game',
    openGraph: {
      title: 'LexiClash vs Mentimeter Free — 50 participants/month honesty',
      description:
        'Mentimeter Free: 50 participants per month (Help + pricing table). LexiClash: whole-class free vocab (50) + miss→Live.',
      locale: 'en_US',
      type: 'website',
      url: pageUrl,
      images: [
        {
          url: `${BASE_URL}/og-image-en.webp`,
          width: 1200,
          height: 630,
          alt: 'LexiClash vs Mentimeter comparison',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'LexiClash vs Mentimeter Free — 50/month honesty',
      description: 'Mentimeter Free: 50 participants/month. LexiClash: whole-class free vocab.',
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
    q: 'What is Mentimeter Free’s participant cap?',
    a: 'Mentimeter Help (help.mentimeter.com/en/articles/1258367, lastChecked September 29, 2026): Up to 50 participants per month. Once you hit the 50-participant limit, upgrade or wait until the counter resets — every month on the date you created your account. One presentation may exceed 50 with an 8-hour grace, then you are blocked from presenting again until reset or upgrade. The pricing table (mentimeter.com/plans?view=standard) lists Free “Participants per month: 50”. Free marketing bullets say “Unlimited participants once per month” — the Help/table number is 50.',
  },
  {
    q: 'How does LexiClash foil Mentimeter Free’s 50 participants/month cap?',
    a: 'LexiClash free classroom vocab runs a whole class (up to 50 students) with miss-gap → reteach Live — one published free seat cap per class, not a monthly participant counter that resets on the account-creation date. Distinct from Nearpod Silver 40-join/#1169, Blooket Starter ≤60/#1166, Gimkit Pro-Exclusive 5/#1137, Wayground, and Kahoot Go Free.',
  },
  {
    q: 'Is LexiClash a live-polling tool like Mentimeter?',
    a: 'Different category. Mentimeter is interactive presentations / polls / quizzes with a Free monthly participant counter. LexiClash is word-formation (Boggle-style grids, anagrams, word wheels) for vocabulary practice — free whole-class seats on the classroom loop.',
  },
  {
    q: 'Do students need accounts on LexiClash?',
    a: 'No. Students join with a 6-character code. Teacher Pro adds unlimited classes and printable reports; the free tier already covers a whole class of up to 50 for vocab word games.',
  },
];

const compareRows: ReadonlyArray<readonly [string, string, string]> = [
  ['Free participant / seat model', '✓ Up to 50 students free per class', 'Free: 50 participants per month'],
  ['Reset / grace rule', '—', 'Resets on account-creation date; 8-hour grace for one over-50 presentation'],
  ['Pricing table Free row', '—', 'Participants per month: 50'],
  ['Free marketing bullet vs table', '—', 'Bullets: “Unlimited participants once per month” vs table/Help: 50'],
  ['Miss → reteach Live', '✓ Free miss-gap → Live deep-link', 'Presentation replay / reports (plan-gated features vary)'],
  ['No student signup', '✓ 6-character join code', 'Audience joins Mentimeter presentations'],
  ['Game / lesson type', 'Word-formation (Boggle/Wheel/Anagram)', 'Interactive presentations / polls / quizzes'],
  [
    'Evidence',
    '—',
    'help…/1258367 + mentimeter.com/plans?view=standard (Free: 50/month)',
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
        id="lexiclash-vs-mentimeter-faq"
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
          LexiClash vs Mentimeter Free — 50 participants/month honesty
        </h1>
        <p className="text-base leading-relaxed text-neo-gray-200 sm:text-lg">
          Mentimeter Free publishes <strong>50 participants per month</strong> in Help and on the
          pricing table (<strong>Participants per month: 50</strong>); the counter resets on the
          account-creation date, with an 8-hour grace for one over-50 presentation. Free marketing
          bullets say “Unlimited participants once per month.” LexiClash foils with whole-class free
          (50) + miss→reteach Live. Cite{' '}
          <a
            href="https://help.mentimeter.com/en/articles/1258367-what-is-included-in-the-free-account"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-neo-cyan/60"
          >
            Mentimeter Help (Free account)
          </a>{' '}
          and{' '}
          <a
            href="https://www.mentimeter.com/plans?view=standard"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-neo-cyan/60"
          >
            mentimeter.com/plans
          </a>
          .
        </p>
      </header>

      <TeacherProCompareCheckoutStrip locale={locale} />

      <MentimeterFreeTierHonestyStrip locale={locale} />

      <section className="mb-12 overflow-x-auto">
        <h2 className="mb-4 font-neo-display text-2xl font-bold">Side-by-side</h2>
        <table className="w-full min-w-[640px] border-3 border-neo-gray-400 text-left text-sm">
          <thead className="bg-neo-navy/80">
            <tr>
              <th className="border-b-3 border-neo-gray-400 p-3">Feature</th>
              <th className="border-b-3 border-neo-gray-400 p-3 text-neo-lime">LexiClash</th>
              <th className="border-b-3 border-neo-gray-400 p-3">Mentimeter Free</th>
            </tr>
          </thead>
          <tbody>
            {compareRows.map(([feature, lexi, menti]) => (
              <tr key={feature} className="odd:bg-neo-navy/40">
                <td className="border-b border-neo-gray-500/40 p-3 font-medium">{feature}</td>
                <td className="border-b border-neo-gray-500/40 p-3">{lexi}</td>
                <td className="border-b border-neo-gray-500/40 p-3">{menti}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-neo-gray-400">
          Nearpod Silver 40-join / 300 MB is #1169. Blooket Starter ≤60 is #1166. Gimkit Pro-Exclusive
          5 is #1137.
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
        <Link href={`/${locale}/lexiclash-vs-nearpod`} className="underline">
          vs Nearpod
        </Link>
        {' · '}
        <Link href={`/${locale}/lexiclash-vs-blooket`} className="underline">
          vs Blooket
        </Link>
        {' · '}
        <Link href={`/${locale}/lexiclash-vs-kahoot`} className="underline">
          vs Kahoot
        </Link>
      </p>
    </main>
  );
}
