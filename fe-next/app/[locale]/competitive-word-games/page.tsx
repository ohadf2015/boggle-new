import type { Metadata } from 'next';
import Link from 'next/link';
import {
  CompareTable,
  CtaBand,
  FaqList,
  LandingButton,
  LandingHero,
  LandingPage,
  Prose,
  Section,
  TileGrid,
} from '@/components/landing/kit';
import { LANDING_ART } from '@/components/landing/kit/art';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';

/** Differentiator before brand; ≤60 chars. SERP neighbors (WordHoot, WordDuel) sell Wordle-vs-friends — we sell free ranked vs real players, no download. */
const EN_TITLE = 'Free ranked word games vs real players | LexiClash';
/** Answer in the first 120 chars. */
const EN_DESCRIPTION =
  'Play competitive word games free — live ranked matches vs real players, global leaderboard, no download. Open your browser and start a match in seconds.';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isTargetLocale = locale === 'en';
  const pageUrl = `${BASE_URL}/en/competitive-word-games`;

  return {
    title: EN_TITLE,
    description: EN_DESCRIPTION,
    keywords: 'best competitive word games with global leaderboards, competitive word games, word games with leaderboards, ranked word games, multiplayer word game leaderboard, real-time word game competition, free competitive word games online',
    robots: isTargetLocale ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: {
      title: EN_TITLE,
      description: EN_DESCRIPTION,
      locale: 'en_US',
      type: 'website',
      url: pageUrl,
      images: [{ url: `${BASE_URL}/og-image-en.webp`, width: 1200, height: 630, alt: 'LexiClash - Competitive Word Games with Global Leaderboards' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: EN_TITLE,
      description: EN_DESCRIPTION,
      images: [`${BASE_URL}/og-image-en.webp`],
    },
    alternates: {
      canonical: pageUrl,
      languages: {
        'x-default': pageUrl,
        en: pageUrl,
      },
    },
  };
}

const faqs = [
  {
    q: 'What are the best competitive word games with global leaderboards?',
    a: 'LexiClash is a free, browser-based competitive word game with a worldwide leaderboard, real-time multiplayer battles for 2-20+ players, and ranked daily challenges where everyone solves the same puzzle. NYT Spelling Bee and Wordle have informal score-sharing, but LexiClash is built around live competition and persistent rankings — no download, no pay-to-win.',
  },
  {
    q: 'Which online puzzle games have an active leaderboard or competitive element?',
    a: "LexiClash does, and it is free in the browser with no download. Each daily puzzle gives everyone the same board and ranks them on its own leaderboard, and those scores feed a global ranking with a monthly season. In a multiplayer room you race other players on the same letter grid and watch the standings change live.",
  },
  {
    q: 'Is there a free competitive word game I can play in the browser?',
    a: 'Yes. LexiClash runs entirely in the browser on phone, tablet, or desktop. Create or join a room, race opponents on the same letter grid in real time, and climb the global and daily leaderboards — all free, no signup required to start.',
  },
  {
    q: 'How does the LexiClash global leaderboard work?',
    a: 'Every ranked match and daily challenge feeds a worldwide leaderboard. Daily challenges give all players the identical puzzle so scores are directly comparable, and seasonal rankings reset to keep competition fresh. You can see where you stand globally and against friends.',
  },
  {
    q: 'Can I compete against friends and strangers?',
    a: 'Both. Create a private room and share the link to battle friends directly, or join the public daily challenge to compete against players worldwide on the global leaderboard. Matches are real-time — everyone races the same grid at once, no waiting for turns.',
  },
  {
    q: 'What game modes are good for competitive play?',
    a: 'Multiplayer Grid Battle (real-time head-to-head), the ranked Daily Word Wheel and Daily Word Hunt (same puzzle for everyone, leaderboard-scored), and Party mode for 20+ players. Each feeds into your global ranking.',
  },
  {
    q: 'Which browser word games are best for building vocabulary over time?',
    a: 'Competitive play builds vocabulary as a side effect — every ranked match and daily challenge scores real dictionary words, so repeat players pick up new words under time pressure. If you want vocabulary practice as the main goal rather than the leaderboard, LexiClash also runs a dedicated ESL and classroom vocabulary mode with themed word lists and no ranking pressure.',
  },
];

/* Static JSON-LD — all content is hardcoded string literals, rendered via next/script (no dangerouslySetInnerHTML). */
const faqJsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.q,
    acceptedAnswer: { '@type': 'Answer', text: faq.a },
  })),
});

const videoGameJsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'VideoGame',
  name: 'LexiClash — Competitive Word Games',
  url: `${BASE_URL}/en/competitive-word-games`,
  description: 'Free real-time multiplayer competitive word game with a global leaderboard and ranked daily challenges. Browser-based, no download, 6 languages.',
  genre: ['Word Game', 'Puzzle', 'Multiplayer'],
  gamePlatform: ['Web Browser', 'Android'],
  playMode: ['MultiPlayer', 'SinglePlayer'],
  numberOfPlayers: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 20 },
  applicationCategory: 'GameApplication',
  operatingSystem: 'Any (Web Browser)',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', availability: 'https://schema.org/InStock', url: `${BASE_URL}/en/multiplayer` },
  publisher: { '@type': 'Organization', name: 'LexiClash', url: BASE_URL },
});

export default async function CompetitiveWordGamesPage({ params }: PageProps) {
  const { locale } = await params;

  return (
    <LandingPage locale={locale} play={{ href: `/${locale}/multiplayer`, label: 'Play a Ranked Match' }}>
      <script id="ld-faq-competitive" type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqJsonLd }} />
      <script id="ld-videogame-competitive" type="application/ld+json" dangerouslySetInnerHTML={{ __html: videoGameJsonLd }} />

      <LandingHero
        title="The Best Competitive Word Games with Global Leaderboards"
        lead={
          <span data-speakable="true">
            Play competitive word games free — live ranked matches vs real players, a global
            leaderboard, and no download. Most word games are solitary. LexiClash is the other way
            around: real-time grid battles and ranked daily puzzles where everyone gets the same board.
            No pay-to-win. Start a match in your browser now.
          </span>
        }
        actions={
          <>
            <LandingButton href={`/${locale}/multiplayer`}>Play a Ranked Match</LandingButton>
            <LandingButton href={`/${locale}/leaderboard`} variant="secondary">
              View Global Leaderboard
            </LandingButton>
          </>
        }
        art={LANDING_ART.trophy('A LexiClash mascot holding a trophy on a winners podium')}
        artTone="yellow"
      >
        <Link href={`/${locale}/daily-word-wheel`} className="font-bold text-neo-lime underline underline-offset-4">
          Ranked Daily Challenge →
        </Link>
      </LandingHero>

      <Section title="What Makes a Word Game Genuinely Competitive">
        <TileGrid
          columns={4}
          items={[
            { title: 'Real-time, not turn-based', body: 'Everyone races the same grid at once. No four-day waits between turns — a match ends in 2-3 minutes.' },
            { title: 'A leaderboard that persists', body: 'Daily and seasonal global rankings. Your score is comparable because everyone solved the identical puzzle.' },
            { title: 'No pay-to-win', body: 'No bought power-ups freezing the clock or revealing words. Skill decides the match, not your wallet.' },
            { title: 'Same puzzle for everyone', body: 'Ranked daily challenges hand every player the exact same board, so the leaderboard reflects real skill.' },
          ]}
        />
      </Section>

      <Section title="Competitive Game Modes on LexiClash">
        <TileGrid
          variant="paper"
          columns={4}
          items={[
            { href: `/${locale}/multiplayer`, title: 'Multiplayer Grid Battle', body: 'Real-time head-to-head for 2-20+ players on a shared grid. The core competitive mode.', tone: 'pink' },
            { href: `/${locale}/daily-word-wheel`, title: 'Daily Word Wheel', body: 'Same puzzle for everyone, every day. Leaderboard-scored — pure skill comparison.', tone: 'lime' },
            { href: `/${locale}/daily`, title: 'Daily Word Hunt', body: 'A daily target-word hunt on a Boggle-style grid. Ranked on the global board.', tone: 'cyan' },
            { href: `/${locale}/leaderboard`, title: 'Global Leaderboard', body: 'Where every ranked match and daily challenge lands. See your worldwide standing.', tone: 'yellow' },
          ]}
        />
      </Section>

      <Section title="Leaderboard Games Online: How Each LexiClash Board Ranks You">
        <div className="grid items-start gap-8 lg:grid-cols-[2fr_3fr]">
          <Prose>
            <p data-speakable="true">
              LexiClash is a free online word game with four leaderboards you can climb from a browser,
              no download: an all-time global board, a board for each daily puzzle, a friends board, and
              the live standings inside every multiplayer room. The daily boards are the fairest test,
              because every player gets the identical puzzle, so a higher score means more words found,
              not an easier board.
            </p>
          </Prose>
          <CompareTable
            highlight={-1}
            columns={['Leaderboard', 'Who you are ranked against', 'What decides your rank']}
            rows={[
              ['Global (all-time)', 'Every LexiClash player worldwide', 'Total points across your ranked games'],
              ['Daily Word Wheel and Daily Word Hunt', 'Everyone who plays that day’s puzzle', 'Your score on the same board everyone got'],
              ['Friends', 'The friends you have added', 'Who scored most on today’s puzzle'],
              ['Multiplayer room', 'The 2-20+ players in your room', 'Points per round; unique words score more'],
            ]}
          />
        </div>
      </Section>

      <Section title="Frequently Asked Questions">
        <FaqList items={faqs.map((f) => ({ q: f.q, a: <span data-speakable="true">{f.a}</span> }))} />
      </Section>

      <Section title="More Word Games">
        <TileGrid
          variant="paper"
          items={[
            { href: `/${locale}/blog/most-popular-word-games-2026`, title: 'Most Popular Word Games 2026', body: 'The games everyone is playing — and why' },
            { href: `/${locale}/best-online-word-games`, title: 'Best Online Word Games', body: '9 honest picks, no download' },
            { href: `/${locale}/free-multiplayer-word-game`, title: 'Multiplayer Word Game Online', body: 'Real-time, browser-based, free' },
            { href: `/${locale}/education/esl-word-games`, title: 'Vocabulary Games for the Classroom', body: 'ESL & classroom vocabulary practice mode' },
            { href: `/${locale}/play-boggle-online-free`, title: 'Boggle Online', body: 'Free, 2 to 50 players on one board' },
          ]}
        />
      </Section>

      <CtaBand
        tone="pink"
        title="Climb the Leaderboard Now"
        body={
          <>
            Stop searching for &quot;competitive word games with global leaderboards&quot; — you found the
            one that is free, real-time, and runs in your browser. Play a ranked match and see where you
            land worldwide.
          </>
        }
        actions={<LandingButton href={`/${locale}/multiplayer`}>Play a Ranked Match</LandingButton>}
        art={LANDING_ART.duel('')}
      />
    </LandingPage>
  );
}
