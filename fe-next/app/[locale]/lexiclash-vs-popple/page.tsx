import type { Metadata } from 'next';
import Link from 'next/link';
import { CompareTable, CtaBand, FaqList, LandingButton, LandingHero, LandingPage, LinkPills, Prose, Section, TileGrid } from '@/components/landing/kit';
import { LANDING_ART } from '@/components/landing/kit/art';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isEnglish = locale === 'en';
  // Body is English-only. Canonical always points to /en/ to avoid cross-locale duplicate-content flags.
  const pageUrl = `${BASE_URL}/en/lexiclash-vs-popple`;

  return {
    title: 'LexiClash vs Popple — Which Grid Word Game Wins? | LexiClash',
    description: 'LexiClash vs Popple compared: 30+ game modes vs single-grid format, multiplayer rooms with friends, 6 languages, brain training, adventure RPG. Which word game fits your play style?',
    keywords: 'lexiclash vs popple, popple alternative, real-time multiplayer word game, grid word puzzle, word games like popple, free multiplayer word game, best word game 2026, popple vs lexiclash',
    openGraph: {
      title: 'LexiClash vs Popple — Which Word Game Wins in 2026?',
      description: 'Grid swipe vs letter-finding. Compare multiplayer, modes, languages, and why serious word gamers choose LexiClash.',
      locale: 'en_US',
      type: 'website',
      url: pageUrl,
      images: [{ url: `${BASE_URL}/og-image-en.webp`, width: 1200, height: 630, alt: 'LexiClash vs Popple Comparison' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'LexiClash vs Popple — Which Is Better?',
      description: 'Grid swipe vs letter-finding, 30+ modes vs single format. Full comparison inside.',
      images: [`${BASE_URL}/og-image-en.webp`],
    },
    alternates: {
      canonical: pageUrl,
      languages: {
        'x-default': `${BASE_URL}/en/lexiclash-vs-popple`,
        en: `${BASE_URL}/en/lexiclash-vs-popple`,
        he: `${BASE_URL}/he/lexiclash-vs-popple`,
      },
    },
    robots: { index: isEnglish, follow: true },
  };
}

// Static FAQ data — all values are hardcoded string literals, safe for JSON-LD serialization
const faqs = [
  {
    q: 'How is LexiClash different from Popple?',
    a: 'Popple is a mobile-first grid swipe puzzle: you trace words on a 4×4 to 6×6 grid by swiping your finger, rack up combos and multipliers, and strategically use attacks (fog, tornado, freeze, mirror) against opponents. LexiClash is letter-finding on a shared board: you race to connect adjacent letters, find unlimited words per round, same simultaneous vibe. Popple is tactical sabotage + multiplier strategy. LexiClash is scanning + pattern recognition. Both are real-time competitive, completely different mechanics.',
  },
  {
    q: 'Does LexiClash have attack systems like Popple?',
    a: 'No. Popple\'s attack/sabotage system (fog, tornado, freeze, mirror) is core to its identity and makes it unique. LexiClash doesn\'t include attacks — it focuses on finding as many words as you can and racing other players. Both are multiplayer-competitive, but LexiClash\'s energy comes from speed and volume, not strategic sabotage.',
  },
  {
    q: 'Can you play LexiClash on mobile?',
    a: 'Yes, web + Android (coming soon: iOS). Popple is iOS + Android + web. Both work on phones and tablets. LexiClash runs in your browser; Popple has native apps. LexiClash also works on desktop and TV, which Popple isn\'t optimized for.',
  },
  {
    q: 'What about game modes and solo play?',
    a: 'Popple is multiplayer-first with a single-grid format and a focus on competitive matchmaking. LexiClash has 30+ game modes: multiplayer (real-time, friends or matchmaking), adventure campaigns with 100+ levels and boss fights, five brain-training drill modes, daily challenges with global leaderboards, and solo classic games. If you want depth and variety, LexiClash has it. If you love Popple\'s focused multiplayer swipe-and-sabotage, that\'s its sweet spot.',
  },
  {
    q: 'Is LexiClash free like Popple?',
    a: 'Yes. LexiClash is completely free with rewarded-ad boosts (watch a short ad to unlock a power-up or reward). Popple is free with optional premium account + gem shop. Both are free to start; neither forces you to pay.',
  },
  {
    q: 'What about languages and accessibility?',
    a: 'LexiClash: 6 languages (English, Hebrew with full RTL support, Swedish, Japanese, Spanish, Russian), WCAG 2.1 AA accessibility. Popple is English-only. If you play in Hebrew or other languages, LexiClash is the only choice. LexiClash also fully supports reduced-motion preferences (important for people sensitive to animations).',
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

export default async function LexiClashVsPopplePage({ params }: PageProps) {
  const { locale } = await params;

  return (
    <LandingPage locale={locale} play={{ href: `/${locale}/multiplayer`, label: 'Try LexiClash Free' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: faqJsonLd }}
      />

      <LandingHero
        eyebrow="LexiClash vs Popple"
        title="LexiClash vs Popple — Grid Swipe vs Letter Hunt"
        lead="Both are real-time competitive multiplayer word games. Both are tactile, fast-paced, and weirdly addictive."
        actions={
          <>
            <LandingButton href={`/${locale}/multiplayer`}>Try LexiClash Free</LandingButton>
            <LandingButton href={`/${locale}/adventure`} variant="secondary">Adventure Mode</LandingButton>
          </>
        }
        art={LANDING_ART.duel('Two LexiClash mascots facing off in a word duel')}
        artTone="cyan"
        more={
          <p>
            But they play very differently. Popple puts you on a grid and you swipe words, rack up combos, and strategically attack your opponents with fog, tornado, freeze, and mirror effects. LexiClash drops you on a shared grid and asks you to find words by connecting adjacent letters, race everyone else simultaneously. Same vibe of real-time tension, wildly different playbooks. Here&apos;s the full breakdown so you can pick your game.
          </p>
        }
      >
        <LinkPills items={[{ href: `/${locale}/brain`, label: 'Brain Drills' }]} />
      </LandingHero>

      <Section title="The Honest Comparison">
        <CompareTable
          columns={['Feature', 'LexiClash', 'Popple']}
          rows={[
            ['Game type', 'Grid letter-finding, simultaneous', 'Grid swipe puzzle, simultaneous'],
            ['Tactile input', 'Click/tap adjacent letters', 'Finger swipe on grid'],
            ['Core mechanic', 'Find unlimited words per round', 'Swipe words, rack combos & multipliers'],
            ['Attack system', 'No (pure word-finding)', 'Yes (fog, tornado, freeze, mirror)'],
            ['Game modes', '30+', '1 main mode + daily'],
            ['Multiplayer', 'Real-time, 2-20+ players', 'Real-time, 1v1 or teams'],
            ['Solo gameplay', 'Extensive (adventure, drills, daily)', 'Minimal (daily streak only)'],
            ['Languages', '5 (EN, HE, SV, JA, ES)', '1 (English)'],
            ['RTL support', 'Yes (Hebrew)', 'No'],
            ['Platforms', 'Web + Android', 'iOS + Android + Web'],
            ['No download needed', 'Yes (browser only)', 'Yes + app available'],
            ['Free to play', 'Completely', 'Free with cosmetic/premium options'],
            ['Accessibility (WCAG)', 'AA standard', 'Standard'],
          ]}
        />
      </Section>

      <Section title="What LexiClash Does That Popple Doesn't">
        <TileGrid
          variant="paper"
          items={[
            { title: 'Adventure Campaign', body: '100+ levels across 10 worlds with boss battles, upgrades, and loot. A full story mode that turns word hunting into a journey.' },
            { title: 'Brain Training Drills', body: '5 dedicated modes (Memory Hunt, Combo Master, etc.) that sharpen specific cognitive skills. Gameplay designed around learning, not just winning.' },
            { title: 'Multilingual & RTL', body: 'English, Hebrew (full RTL), Swedish, Japanese, Spanish, Russian. Play word games in your language. Hebrew speakers especially — this is the only option.' },
            { title: 'Unlimited Game Modes', body: '30+ modes including Connections, Wordle-style daily, Blast (action), Party games, and more. Same core skill set, wildly different experiences.' },
            { title: 'Global Leaderboards', body: 'Daily challenges with worldwide rankings. Integrated into adventure progression and multiple game types.' },
            { title: 'No App Required', body: 'Runs in your browser. Open a link, play immediately. Popple has apps, which is nice, but a web game is always faster to jump into.' },
          ]}
        />
      </Section>

      <Section title="The Gameplay Difference: Swipe vs Hunt">
        <TileGrid
          columns={2}
          items={[
            {
              tone: 'cyan',
              title: 'Popple (Swipe Model)',
              body: "You get a grid (4×4 to 6×6). Your job: swipe words with your finger, rack up combo multipliers with consecutive words, and strategically deploy attacks (fog to obscure opponent grid, tornado to shuffle, freeze to lock input, mirror to flip view). Think Scrabble-meets-strategy-game. The sabotage system is what makes Popple unique — you're not just finding words, you're also managing what your opponent can do.",
            },
            {
              tone: 'pink',
              title: 'LexiClash (Hunt Model)',
              body: "You get a grid of random letters. Your job: find as many words as possible by tapping or swiping to connect adjacent letters. No limit on how many you can make. It's scanning + pattern recognition + speed. Less chess-like than Popple, more arcade-like. Anyone can find something, but finding everything (and finding it fast) takes practice.",
            },
          ]}
        />
      </Section>

      <Section title="Why Popple Is Brilliant">
        <Prose paper>
          <p>
            Popple&apos;s attack system is genuinely clever. Fog, tornado, freeze, mirror — they&apos;re not random power-ups, they&apos;re tactical choices that add a whole strategic layer. You have to think: do I use my attack now to disrupt them mid-round, or save it for the final turn? Do I go for a combo multiplier or play safe? That decision-making is what makes Popple special. If you love the tactile swipe input + the head-to-head puzzle of managing attacks, Popple is exactly what you need.
          </p>
        </Prose>
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
            { href: `/${locale}/lexiclash-vs-puzzly-words`, title: 'LexiClash vs Puzzly Words', body: 'Grid vs Rack gameplay' },
          ]}
        />
      </Section>

      <CtaBand
        tone="pink"
        title="So Which One?"
        body={
          <div className="flex flex-col gap-3">
            <p>
              Popple is a fantastic game. If you love the tactile swipe input, the combo strategy, and especially the attack system (fog, tornado, freeze, mirror), that&apos;s your game. Period. The sabotage mechanic is genuinely unique and excellent.
            </p>
            <p>
              LexiClash is for people who want more: the same multiplayer rush, but also story campaigns, brain training, daily challenges, six languages, party games, and the freedom to play as much as they want. It&apos;s bigger, deeper, and weird in the best way.
            </p>
            <p>
              Both are free. Both are real multiplayer. You honestly can&apos;t go wrong. But if you&apos;re scrolling this page, you probably want to see what LexiClash offers beyond the single-grid puzzle format. Here&apos;s your shot.
            </p>
          </div>
        }
        actions={<LandingButton href={`/${locale}/multiplayer`}>Play LexiClash Now — Free, No Download</LandingButton>}
        art={LANDING_ART.trophy('')}
      />
    </LandingPage>
  );
}
