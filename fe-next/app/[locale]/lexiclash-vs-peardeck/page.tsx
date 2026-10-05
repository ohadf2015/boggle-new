import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { TopBackLink } from '@/components/navigation/TopBackLink';
import { PearDeckTeacherFreeHonestyStrip } from '@/components/education/PearDeckTeacherFreeHonestyStrip';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_PATH = '/lexiclash-vs-peardeck';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isEnglish = locale === 'en';
  const pageUrl = `${BASE_URL}/en${PAGE_PATH}`;

  return {
    title: 'LexiClash vs Pear Deck Teacher Free — Named-Response Honesty (2026) | LexiClash',
    description:
      'LexiClash vs Pear Deck Teacher Free: unlimited sessions/participants, but named student responses only via spreadsheet export or Flashcard Factory hover. Premium Teacher Dashboard shows names, hide/block, Drawing/Draggable, Reflect & Review, Teacher Feedback. LexiClash classroom roster + named feedback on free.',
    keywords:
      'lexiclash vs pear deck, peardeck teacher free named responses, pear deck free alternative, pear deck teacher dashboard premium, whole class vocabulary game',
    openGraph: {
      title: 'LexiClash vs Pear Deck Teacher Free — named-response honesty',
      description:
        'Pear Deck Teacher Free: anonymous projector; names via spreadsheet export. LexiClash: classroom roster + named feedback.',
      locale: 'en_US',
      type: 'website',
      url: pageUrl,
      images: [
        {
          url: `${BASE_URL}/og-image-en.webp`,
          width: 1200,
          height: 630,
          alt: 'LexiClash vs Pear Deck comparison',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'LexiClash vs Pear Deck Teacher Free — named-response honesty',
      description:
        'Teacher Free: anonymous projector; names via export. LexiClash: roster + named feedback.',
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
    q: "What does Pear Deck Teacher Free publish for named student responses?",
    a: 'Pear Deck pricing (peardeck.com/pricing, lastChecked September 30, 2026) lists Teacher Free with unlimited presentations, interactive questions, Sessions, and participants — and projects student answers anonymously. Help docs on handling inappropriate responses state Free plan options to identify who left a response are: export responses to a spreadsheet (Google only), or hover a Flashcard Factory card. Live named Teacher Dashboard (view/highlight by name, hide/block), Drawing/Draggable, Reflect & Review, and Teacher Feedback are Teacher Premium.',
  },
  {
    q: 'How does LexiClash foil Pear Deck Teacher Free named-response honesty?',
    a: 'LexiClash free classroom vocab runs a whole class (up to 50) with a classroom roster and named feedback disclosure on the free path — teachers see who submitted what without a Premium Teacher Dashboard or post-session spreadsheet export. Distinct from ClassPoint Basic Free Max 25 / 5 Q (#1202), Socrative Free 5/1/50 (#1196), Mentimeter Free 50/month (#1183), and Wooclap Starter 5 active (#1186).',
  },
  {
    q: 'Is LexiClash a Google Slides / PowerPoint add-in like Pear Deck?',
    a: 'Different category. Pear Deck is interactive slides (Google/Microsoft) with Free anonymous projector + Premium named Teacher Dashboard. LexiClash is word-formation (Boggle-style grids, anagrams, word wheels) for vocabulary practice — free whole-class seats and named roster feedback on the classroom loop, no slide add-in required.',
  },
  {
    q: 'Do students need accounts on LexiClash?',
    a: 'No. Students join with a 6-character code. Teacher Pro adds unlimited classes and printable reports; the free tier already covers a whole class of up to 50 for vocab word games with roster/named feedback.',
  },
];

const compareRows: ReadonlyArray<readonly [string, string, string]> = [
  [
    'Free sessions / participants',
    '✓ Whole-class free (up to 50)',
    'Teacher Free: unlimited Sessions + participants',
  ],
  [
    'Projector / live answers',
    '✓ Classroom loop + live play',
    'Teacher Free: project answers anonymously',
  ],
  [
    'Named student responses (Free)',
    '✓ Classroom roster + named feedback on free',
    'Free: names only via spreadsheet export or Flashcard Factory hover',
  ],
  [
    'Live named Teacher Dashboard',
    '✓ Roster / named disclosure without Premium gate',
    'Teacher Premium: view/highlight by name, hide/block',
  ],
  [
    'Drawing / Draggable responses',
    '— (word-formation modes)',
    'Teacher Premium: Drawing + Draggable',
  ],
  [
    'Reflect & Review / Teacher Feedback',
    '✓ Miss-gap → reteach Live + named feedback path',
    'Teacher Premium: Reflect & Review + Teacher Feedback',
  ],
  [
    'Miss → reteach Live',
    '✓ Free miss-gap → Live deep-link',
    'Slide sessions / Premium dashboard (plan-gated names)',
  ],
  ['No student signup', '✓ 6-character join code', 'Email login recommended to identify names'],
  [
    'Game / lesson type',
    'Word-formation (Boggle/Wheel/Anagram)',
    'Interactive slides (Google / Microsoft) + Pear Deck Learning suite',
  ],
  [
    'Evidence',
    '—',
    'peardeck.com/pricing + help.peardeck.com …/handling-inappropriate-responses',
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
        id="lexiclash-vs-peardeck-faq"
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
          LexiClash vs Pear Deck Teacher Free — named-response honesty
        </h1>
        <p className="text-base leading-relaxed text-neo-gray-200 sm:text-lg">
          Pear Deck <strong>Teacher Free</strong> publishes{' '}
          <strong>unlimited Sessions and participants</strong> and projects student answers{' '}
          <strong>anonymously</strong>. Named student responses on Free are only via{' '}
          <strong>export to spreadsheet</strong> (Google) or <strong>Flashcard Factory hover</strong>.{' '}
          <strong>Teacher Premium</strong> unlocks the live named Teacher Dashboard (view/highlight by
          name, hide/block), Drawing/Draggable, Reflect &amp; Review, and Teacher Feedback. LexiClash
          foils with whole-class free (50) + <strong>classroom roster / named feedback</strong> on the
          free path. Cite{' '}
          <a
            href="https://www.peardeck.com/pricing"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-neo-cyan/60"
          >
            peardeck.com/pricing
          </a>{' '}
          and{' '}
          <a
            href="https://help.peardeck.com/migration/en/handling-inappropriate-responses"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-neo-cyan/60"
          >
            Handling Inappropriate Responses
          </a>
          .
        </p>
      </header>

      <PearDeckTeacherFreeHonestyStrip locale={locale} />

      <section className="mb-12 overflow-x-auto">
        <h2 className="mb-4 font-neo-display text-2xl font-bold">Side-by-side</h2>
        <table className="w-full min-w-[640px] border-3 border-neo-gray-400 text-left text-sm">
          <thead className="bg-neo-navy/80">
            <tr>
              <th className="border-b-3 border-neo-gray-400 p-3">Feature</th>
              <th className="border-b-3 border-neo-gray-400 p-3 text-neo-lime">LexiClash</th>
              <th className="border-b-3 border-neo-gray-400 p-3">Pear Deck Teacher Free</th>
            </tr>
          </thead>
          <tbody>
            {compareRows.map(([feature, lexi, pd]) => (
              <tr key={feature} className="odd:bg-neo-navy/40">
                <td className="border-b border-neo-gray-500/40 p-3 font-medium">{feature}</td>
                <td className="border-b border-neo-gray-500/40 p-3">{lexi}</td>
                <td className="border-b border-neo-gray-500/40 p-3">{pd}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-neo-gray-400">
          ClassPoint Basic Free Max 25 / 5 Q is #1202. Socrative Free 5/1/50 is #1196. Mentimeter Free
          50/month is #1183. Wooclap Starter 5 active is #1186. Do NOT touch open #1204 audio PR.
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
        <Link href={`/${locale}/lexiclash-vs-classpoint`} className="underline">
          vs ClassPoint
        </Link>
        {' · '}
        <Link href={`/${locale}/lexiclash-vs-socrative`} className="underline">
          vs Socrative
        </Link>
        {' · '}
        <Link href={`/${locale}/lexiclash-vs-kahoot`} className="underline">
          vs Kahoot
        </Link>
      </p>
    </main>
  );
}
