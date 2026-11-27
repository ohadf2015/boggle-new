import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckList, CompareTable, CtaBand, FaqList, LandingButton, LandingHero, LandingPage, LinkPills, Section, TileGrid } from '@/components/landing/kit';
import { LANDING_ART } from '@/components/landing/kit/art';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isEnglish = locale === 'en';
  // Body is English-only. Canonical always points to /en/ to avoid cross-locale duplicate-content flags.
  const pageUrl = `${BASE_URL}/en/lexiclash-vs-cabanagrams`;

  return {
    title: 'LexiClash vs Cabanagrams — Which Word Game Wins? | LexiClash',
    description: 'LexiClash vs Cabanagrams compared: 30+ game modes, mobile + web, competitive ladder vs single Bananagrams mode, no signup. Free comparison for multiplayer word gamers.',
    keywords: 'lexiclash vs cabanagrams, cabanagrams alternative, multiplayer word game, bananagrams online, word games like cabanagrams, free multiplayer word game, best word game 2026, cabanagrams vs lexiclash',
    openGraph: {
      title: 'LexiClash vs Cabanagrams — Which Word Game Wins in 2026?',
      description: 'Bananagrams meets 30 game modes. Compare features, gameplay, and why competitive word gamers choose LexiClash.',
      locale: 'en_US',
      type: 'website',
      url: pageUrl,
      images: [{ url: `${BASE_URL}/og-image-en.webp`, width: 1200, height: 630, alt: 'LexiClash vs Cabanagrams Comparison' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'LexiClash vs Cabanagrams — Which Is Better?',
      description: 'Bananagrams online with 30+ modes, mobile, ranked play. Full comparison inside.',
      images: [`${BASE_URL}/og-image-en.webp`],
    },
    alternates: {
      canonical: pageUrl,
      languages: {
        'x-default': `${BASE_URL}/en/lexiclash-vs-cabanagrams`,
        en: `${BASE_URL}/en/lexiclash-vs-cabanagrams`,
      },
    },
    robots: { index: isEnglish, follow: true },
  };
}

// Static FAQ data — all values are hardcoded string literals, safe for JSON-LD serialization
const faqs = [
  {
    q: 'How is LexiClash different from Cabanagrams?',
    a: 'Cabanagrams is a Bananagrams-style word game: you race to build a personal grid of connected tiles. LexiClash is grid-based letter finding: you race to find words by connecting adjacent letters on a shared board. Same "no setup, no scoring, just build words fast" vibe, completely different mechanics. Cabanagrams is beautifully laser-focused on one mode; LexiClash offers 30+ modes and progression systems.',
  },
  {
    q: 'Does LexiClash work on mobile?',
    a: 'Yes, web + Android. Cabanagrams is web-only — no native iOS or Android apps. Both work in your browser. LexiClash is also available as an Android app if you prefer downloading.',
  },
  {
    q: 'Can you play solo in both games?',
    a: 'Cabanagrams: Solo play exists (vs AI at 3 difficulty levels). LexiClash: Extensive solo content — adventure mode with 100+ levels, five brain-training drills, daily challenges, and solo classic games. If you want a game that\'s great solo AND with friends, LexiClash wins. If you just want quick Bananagrams sessions, Cabanagrams is simpler.',
  },
  {
    q: 'What about languages and accessibility?',
    a: 'LexiClash: 6 languages (English, Hebrew with RTL support, Swedish, Japanese, Spanish, Russian), WCAG 2.1 AA accessibility standards. Cabanagrams: 11 languages supported, including many European and Asian languages. Cabanagrams has broader language reach; LexiClash uniquely supports Hebrew RTL and combines language with 30+ game modes.',
  },
  {
    q: 'How is progression different?',
    a: 'Cabanagrams: No progression system — each session is independent. Great for casual play. LexiClash: Ranked ladder, daily challenges with leaderboards, adventure campaign with unlocks, brain-drill levels. If you like casual drop-in play, Cabanagrams wins. If you want long-term goals, LexiClash offers it.',
  },
  {
    q: 'What about the business model?',
    a: 'Cabanagrams: Free, donationware (Buy Me a Coffee). Sustains the game via voluntary donations. LexiClash: Free, supported by ads (optional, can be skipped). Both are truly free to play. Cabanagrams is donation-based (great for minimal interruptions); LexiClash offers sustainable freemium with ads and a thriving competitive community.',
  },
];

// Static JSON-LD for FAQ rich results — hardcoded content only, no user input
const faqJsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.q,
    acceptedAnswer: { '@type': 'Answer', text: faq.a },
  })),
});

export default async function LexiClashVsCabanagramsPage({ params }: PageProps) {
  const { locale } = await params;

  return (
    <LandingPage locale={locale} play={{ href: `/${locale}/multiplayer`, label: 'Try LexiClash Free' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: faqJsonLd }}
      />

      <LandingHero
        eyebrow="LexiClash vs Cabanagrams"
        title="LexiClash vs Cabanagrams — Which Word Game Wins?"
        lead="Both are free, no-signup word games built on the foundation of Bananagrams — build words fast, race other players, no complicated scoring."
        actions={
          <>
            <LandingButton href={`/${locale}/multiplayer`}>Try LexiClash Free</LandingButton>
            <LandingButton href={`/${locale}/adventure`} variant="secondary">Adventure Mode</LandingButton>
          </>
        }
        art={LANDING_ART.duel('Two LexiClash mascots facing off in a word duel')}
        artTone="yellow"
        more={
          <p>
            But they diverge from there. Cabanagrams nails the purist Bananagrams experience in your browser with 11 languages. LexiClash swaps the personal-grid mechanic for shared-board word finding and wraps it in 30+ game modes, progression systems, and mobile apps. Here&apos;s the breakdown.
          </p>
        }
      >
        <LinkPills items={[{ href: `/${locale}/brain`, label: 'Brain Drills' }]} />
      </LandingHero>

      <Section title="The Honest Comparison">
        <CompareTable
          columns={['Feature', 'LexiClash', 'Cabanagrams']}
          rows={[
            ['Game mechanic', 'Shared grid, connect letters', 'Personal grid, build words'],
            ['Game modes', '30+', '1 main mode (Bananagrams-style)'],
            ['Solo vs AI', 'Yes, extensive solo + adventure', 'Yes, 3 difficulty tiers'],
            ['Multiplayer', 'Real-time, 2-20+ players', 'Real-time, up to 4 players'],
            ['Languages', '5 (EN, HE, SV, JA, ES)', '11 (broad multilingual support)'],
            ['RTL support', 'Yes (Hebrew)', 'No'],
            ['Platforms', 'Web + Android app', 'Web-only'],
            ['No download needed', 'Yes (browser only)', 'Yes (browser only)'],
            ['Free to play', 'Completely', 'Completely'],
            ['Monetization', 'Ad-supported (optional)', 'Donationware (Buy Me a Coffee)'],
            ['Progression system', 'Ranked ladder, achievements', 'None (session-based)'],
            ['Daily challenges', 'Yes, with leaderboards', 'Word of the day (varies)'],
            ['Adventure/Story', 'Yes (100+ levels, boss fights)', 'No'],
            ['Accessibility', 'WCAG 2.1 AA', 'Standard'],
          ]}
        />
      </Section>

      <Section title="What LexiClash Offers That Cabanagrams Doesn't">
        <TileGrid
          variant="paper"
          items={[
            { title: 'Adventure Campaign', body: '100+ levels, story progression, boss battles, loot upgrades. A full narrative experience that turns word games into exploration.' },
            { title: 'Brain Training Drills', body: '5 dedicated modes (Memory Hunt, Combo Master, etc.) designed around cognitive improvement, not just competition.' },
            { title: '30+ Game Modes', body: 'Connections, Wordle-style daily, Blast action mode, party games, ranked competitive, and more. Same skill set, wildly different feels.' },
            { title: 'Native Android App', body: 'Play from your home screen. Cabanagrams is web-only; LexiClash has a proper Android app with offline access and shortcuts.' },
            { title: 'Ranked Competitive Play', body: 'ELO ladder, ranked seasons, leaderboards. Cabanagrams is casual drop-in; LexiClash has infrastructure for serious players.' },
            { title: 'Cross-Locale Progression', body: '6 languages (EN, HE, SV, JA, ES) with full progression sync. Hebrew speakers get a full RTL experience.' },
          ]}
        />
      </Section>

      <Section title="The Gameplay Difference: Shared Grid vs Personal Grid">
        <TileGrid
          columns={2}
          items={[
            {
              tone: 'cyan',
              title: 'Cabanagrams (Personal Grid)',
              body: "You each get your own grid of random tiles. Your job: rearrange them into a connected, valid word grid as fast as possible. Think Bananagrams — competitive scrabble where setup and strategy matter. You win by finishing first. It's clever, tactile, and multiplayer-focused but simple in scope.",
            },
            {
              tone: 'pink',
              title: 'LexiClash (Shared Grid)',
              body: "Everyone sees the same grid of random letters (like Boggle). Your job: find as many words as possible by connecting adjacent letters. Unlimited words per round. It's scanning + pattern recognition + speed. Less chess-like than Cabanagrams, more arcade-like. The same energy (real-time, competitive, frantic) but completely different puzzle-solving path.",
            },
          ]}
        />
      </Section>

      <Section title="Why Choose Each Game">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-3">
            <h3 className="font-neo-display text-xl font-bold text-neo-cyan">Choose Cabanagrams If You Want:</h3>
            <CheckList
              items={[
                'Pure Bananagrams experience in your browser',
                'Minimal, focused gameplay (one great mode)',
                '11 language options for global play',
                'No ads, fully supported by donations',
                'Quick, casual sessions with friends',
              ]}
            />
          </div>
          <div className="flex flex-col gap-3">
            <h3 className="font-neo-display text-xl font-bold text-neo-lime">Choose LexiClash If You Want:</h3>
            <CheckList
              items={[
                '30+ game modes (variety + replayability)',
                'Adventure campaign + brain training',
                'Native Android app (no browser required)',
                'Ranked competitive play with progression',
                'Hebrew, Swedish, Japanese support',
                'Everything for free with optional ads',
              ]}
            />
          </div>
        </div>
      </Section>

      <Section title="Frequently Asked Questions">
        <FaqList items={faqs} />
      </Section>

      <Section title="More Comparisons">
        <TileGrid
          variant="paper"
          items={[
            { href: `/${locale}/lexiclash-vs-wordle`, title: 'LexiClash vs Wordle', body: 'Unlimited vs 1 puzzle/day' },
            { href: `/${locale}/lexiclash-vs-scrabble`, title: 'LexiClash vs Scrabble GO', body: 'No interruptions, no bots' },
            { href: `/${locale}/best-online-word-games`, title: 'Best Word Games 2026', body: 'Complete comparison guide' },
          ]}
        />
      </Section>

      <CtaBand
        tone="pink"
        title="So Which One?"
        body={
          <div className="flex flex-col gap-3">
            <p>
              Cabanagrams is a fantastic game. It nails the Bananagrams experience and has incredible language breadth. If you love that personal-grid-building puzzle and want it with real players online, that&apos;s exactly what you get. The donation model is honest and friction-free.
            </p>
            <p>
              LexiClash is for people who want more: the same multiplayer adrenaline, but also adventure campaigns, brain training, 30+ modes, mobile apps, ranked play, and progression systems. It&apos;s bigger, deeper, and built for players who want to invest hours, not just sessions.
            </p>
            <p>
              Both are free. Both are real multiplayer. You honestly can&apos;t go wrong. But if you&apos;re scrolling this page, you probably want to see what LexiClash has to offer. Here&apos;s your shot.
            </p>
          </div>
        }
        actions={<LandingButton href={`/${locale}/multiplayer`}>Play LexiClash Now — Free, No Download</LandingButton>}
        art={LANDING_ART.trophy('')}
      />
    </LandingPage>
  );
}
