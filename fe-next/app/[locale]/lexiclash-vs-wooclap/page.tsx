import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { TopBackLink } from '@/components/navigation/TopBackLink';
import { WooclapStarterHonestyStrip } from '@/components/education/WooclapStarterHonestyStrip';
import { TeacherProCompareCheckoutStrip } from '@/components/education/TeacherProCompareCheckoutStrip';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_PATH = '/lexiclash-vs-wooclap';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isEnglish = locale === 'en';
  const pageUrl = `${BASE_URL}/en${PAGE_PATH}`;

  return {
    title: 'LexiClash vs Wooclap Starter — 5 Active Questions / 30d Honesty (2026) | LexiClash',
    description:
      'LexiClash vs Wooclap Starter: Help (June 2, 2026) publishes free up to 5 active questions; >5 active in 30 days → upgrade. Active = 3+ responses from unique participants. Pricing: 5 questions per month + Unlimited participants (up to 1000). LexiClash free classroom play without an active-question meter.',
    keywords:
      'lexiclash vs wooclap, wooclap starter 5 active questions, wooclap free alternative, classroom vocabulary game, active question meter',
    openGraph: {
      title: 'LexiClash vs Wooclap Starter — 5 active / 30d honesty',
      description:
        'Wooclap Starter: 5 active questions / 30 days (Help). LexiClash: free classroom vocab without an active-question meter.',
      locale: 'en_US',
      type: 'website',
      url: pageUrl,
      images: [
        {
          url: `${BASE_URL}/og-image-en.webp`,
          width: 1200,
          height: 630,
          alt: 'LexiClash vs Wooclap comparison',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'LexiClash vs Wooclap Starter — 5 active / 30d honesty',
      description: 'Wooclap Starter: 5 active questions / 30d. LexiClash: free classroom, no active-question meter.',
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
    q: "What is Wooclap Starter's free question limit?",
    a: 'Wooclap Help (docs.wooclap.com/en/articles/14402104, June 2, 2026): Starter is free and lets you present up to 5 active questions. A question becomes active when it receives 3 or more responses from unique participants in a single event. If you present more than 5 active questions in 30 days, you are prompted to upgrade. The education pricing page lists “5 questions per month” and “Unlimited participants” on Starter. Up to 1000 participants on all plans.',
  },
  {
    q: "How does LexiClash foil Wooclap Starter's 5 active / 30d meter?",
    a: 'LexiClash free classroom vocab runs without Wooclap’s active-question meter — question-quota honesty (5 active / 30 days), not a participant-cap fight. Distinct from Mentimeter Free 50/month/#1183, Nearpod Silver 40-join/#1169, Blooket Starter, Gimkit Pro-Exclusive, Wayground, and Kahoot Go Free.',
  },
  {
    q: 'Is LexiClash a live-polling tool like Wooclap?',
    a: 'Different category. Wooclap is interactive presentations / polls / quizzes with a Starter active-question counter. LexiClash is word-formation (Boggle-style grids, anagrams, word wheels) for vocabulary practice — free classroom play on the classroom loop.',
  },
  {
    q: 'Do students need accounts on LexiClash?',
    a: 'No. Students join with a 6-character code. Teacher Pro adds unlimited classes and printable reports; the free tier already covers classroom vocab word games without an active-question meter.',
  },
];

const compareRows: ReadonlyArray<readonly [string, string, string]> = [
  ['Free question / activity model', '✓ Free classroom vocab — no active-question meter', 'Starter: up to 5 active questions / 30 days'],
  ['What counts as “active”', '—', '3+ responses from unique participants in one event'],
  ['Pricing page Starter row', '—', '5 questions per month · Unlimited participants'],
  ['Participant cap', 'Whole-class free classroom seats (published LexiClash free limit)', 'Up to 1000 participants on all plans'],
  ['Miss → reteach Live', '✓ Free miss-gap → Live deep-link', 'Session results (export gated on paid plans)'],
  ['No student signup', '✓ 6-character join code', 'Audience joins Wooclap events'],
  ['Game / lesson type', 'Word-formation (Boggle/Wheel/Anagram)', 'Interactive presentations / polls / quizzes'],
  [
    'Evidence',
    '—',
    'docs…/14402104 (June 2, 2026) + wooclap.com/…/pricing-education',
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
        id="lexiclash-vs-wooclap-faq"
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
          LexiClash vs Wooclap Starter — 5 active questions / 30d honesty
        </h1>
        <p className="text-base leading-relaxed text-neo-gray-200 sm:text-lg">
          Wooclap Starter is free up to <strong>5 active questions</strong>; more than 5 active in{' '}
          <strong>30 days</strong> prompts an upgrade. Active = <strong>3+ responses from unique
          participants</strong>. The education pricing page lists <strong>5 questions per month</strong>{' '}
          and <strong>Unlimited participants</strong> (up to 1000 on all plans). LexiClash foils with
          free classroom vocab play <strong>without an active-question meter</strong> (question-quota
          honesty, not a participant-cap fight). Cite{' '}
          <a
            href="https://docs.wooclap.com/en/articles/14402104-what-is-wooclap-s-pricing"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-neo-cyan/60"
          >
            Wooclap Help (pricing, June 2, 2026)
          </a>{' '}
          and{' '}
          <a
            href="https://www.wooclap.com/en/pricing/pricing-education/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-neo-cyan/60"
          >
            wooclap.com pricing-education
          </a>
          .
        </p>
      </header>

      <TeacherProCompareCheckoutStrip locale={locale} />

      <WooclapStarterHonestyStrip locale={locale} />

      <section className="mb-12 overflow-x-auto">
        <h2 className="mb-4 font-neo-display text-2xl font-bold">Side-by-side</h2>
        <table className="w-full min-w-[640px] border-3 border-neo-gray-400 text-left text-sm">
          <thead className="bg-neo-navy/80">
            <tr>
              <th className="border-b-3 border-neo-gray-400 p-3">Feature</th>
              <th className="border-b-3 border-neo-gray-400 p-3 text-neo-lime">LexiClash</th>
              <th className="border-b-3 border-neo-gray-400 p-3">Wooclap Starter</th>
            </tr>
          </thead>
          <tbody>
            {compareRows.map(([feature, lexi, woo]) => (
              <tr key={feature} className="odd:bg-neo-navy/40">
                <td className="border-b border-neo-gray-500/40 p-3 font-medium">{feature}</td>
                <td className="border-b border-neo-gray-500/40 p-3">{lexi}</td>
                <td className="border-b border-neo-gray-500/40 p-3">{woo}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-neo-gray-400">
          Mentimeter Free 50/month is #1183. Nearpod Silver 40-join / 300 MB is #1169. Distinct from
          Blooket, Gimkit, Wayground, Kahoot Go.
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
