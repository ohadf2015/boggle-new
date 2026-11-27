import type { Metadata } from 'next';
import Link from 'next/link';
import {
  CtaBand,
  FaqList,
  LandingButton,
  LandingHero,
  LandingPage,
  Mark,
  Section,
  TileGrid,
} from '@/components/landing/kit';
import { LANDING_ART } from '@/components/landing/kit/art';


interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isTargetLocale = locale === 'en';
  const pageUrl = `${BASE_URL}/en/word-games-online-free`;

  return {
    title: 'Word Games Online Free — No Download | LexiClash',
    description: 'Play word games online free — no download, no signup. Multiplayer battles, daily word wheels, word hunts, brain training, and adventure mode. Start now →',
    keywords: 'word games online free, free word games, word games no download, online word games, word puzzle games free, word games for groups, multiplayer word games online free, word games like boggle, word game free no download, brain training word games, daily word puzzle',
    openGraph: {
      title: 'Word Games Online Free — Play Instantly | LexiClash',
      description: 'Free word games you can play instantly — multiplayer battles, daily challenges, adventure mode, brain training. No download needed!',
      locale: 'en_US',
      type: 'website',
      url: pageUrl,
      images: [{ url: `${BASE_URL}/og-image-en.webp`, width: 1200, height: 630, alt: 'LexiClash - Free Word Games Online' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Word Games Online Free — No Download | LexiClash',
      description: 'Play free word games instantly — multiplayer, daily puzzles, adventure mode. No download!',
      images: [`${BASE_URL}/og-image-en.webp`],
    },
    alternates: {
      canonical: pageUrl,
      languages: {
        'x-default': pageUrl,
        en: pageUrl,
      },
    },
    robots: isTargetLocale ? { index: true, follow: true } : { index: false, follow: true },
  };
}

const faqs = [
  {
    q: 'What free word games can I play online without downloading?',
    a: 'LexiClash offers 7+ word games you can play free in your browser: Classic mode (find words on a grid), Multiplayer battles (2-20+ players), Daily Word Wheel (daily puzzle everyone plays), Word Hunt (find target words), Blast mode (chain combos for high scores), Adventure mode (boss fights and upgrades), and Brain Training drills. All free, no download.',
  },
  {
    q: 'What are the best online word games for groups?',
    a: 'LexiClash is ideal for groups — up to 20+ players can join a room via link or QR code. Everyone plays the same grid simultaneously in real-time. Perfect for parties, family game nights, classrooms, and team building. No accounts needed.',
  },
  {
    q: 'Are these word games good for learning vocabulary?',
    a: 'Yes! LexiClash helps build vocabulary in 6 languages (English, Hebrew, Swedish, Japanese, Spanish, Russian). The brain training drills specifically target pattern recognition and word recall. Teachers use it in classrooms for engaging vocabulary practice.',
  },
  {
    q: 'How is LexiClash different from Wordle or Scrabble?',
    a: "Unlike Wordle (one puzzle per day, single player), LexiClash has unlimited games and real-time multiplayer. Unlike Scrabble (turn-based, one word at a time), LexiClash is simultaneous — everyone races to find words on the same grid at the same time. It's faster, more social, and completely free.",
  },
];

// Static JSON-LD — all content is hardcoded string literals, not user input
const faqJsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.q,
    acceptedAnswer: { '@type': 'Answer', text: faq.a },
  })),
});

export default async function WordGamesOnlineFreePage({ params }: PageProps) {
  const { locale } = await params;

  return (
    <LandingPage locale={locale} play={{ href: `/${locale}/quick-play`, label: 'Play Free — Solo Mode' }}>
      {/* JSON-LD structured data for FAQ rich results — static content only, no user input */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqJsonLd }} />

      <LandingHero
        title={
          <>
            Word Games Online <Mark>Free</Mark> — Play Instantly
          </>
        }
        lead="Looking for free word games you can play online right now? LexiClash has 7+ word game modes — all free, no download, no signup. Play solo against AI, challenge friends in real-time multiplayer, or try daily puzzles. Available in 6 languages on any device."
        actions={
          <>
            <LandingButton href={`/${locale}/quick-play`}>Play Free — Solo Mode</LandingButton>
            <LandingButton href={`/${locale}/multiplayer`} variant="secondary">
              Multiplayer With Friends
            </LandingButton>
          </>
        }
        art={LANDING_ART.wheel('A LexiClash mascot spinning a wheel of letter tiles')}
        artTone="lime"
      >
        <Link href={`/${locale}/daily`} className="font-bold text-neo-cyan underline underline-offset-4">
          Daily Challenges →
        </Link>
      </LandingHero>

      <Section title="7+ Free Word Games to Play">
        <TileGrid
          items={[
            { title: 'Classic Word Battle', body: 'Find words on a grid — solo or multiplayer. Like Boggle but better.' },
            { title: 'Daily Word Wheel', body: 'A new puzzle every day. Find words from a wheel of letters. Chase the world record.' },
            { title: 'Word Hunt', body: 'Find specific target words hidden in the grid before time runs out.' },
            { title: 'Blast Mode', body: 'Chain combos for explosive scores. Rapid-fire word finding at its best.' },
            { title: 'Adventure Mode', body: 'Boss battles, upgrades, and quests. An RPG word game experience.' },
            { title: 'Brain Training', body: '5 drill types to sharpen pattern recognition, memory, and speed.' },
          ]}
        />
      </Section>

      <Section title="Frequently Asked Questions">
        <FaqList items={faqs} />
      </Section>

      <Section title="Explore More Word Games">
        <TileGrid
          variant="paper"
          items={[
            { href: `/${locale}/free-multiplayer-word-game`, title: 'Multiplayer Word Game Online', body: 'Real-time Scrabble alternative — play live against friends' },
            { href: `/${locale}/online-word-games-with-friends`, title: 'Word Games With Friends', body: 'Create a room, share the link, play together' },
            { href: `/${locale}/play-boggle-online-free`, title: 'Play Boggle Free', body: 'No download, instant browser play' },
          ]}
        />
      </Section>

      <CtaBand
        tone="cyan"
        title="Start Playing Free Word Games Now"
        body="No more searching for word games online free — LexiClash has everything. Multiplayer word battles, daily puzzles, brain training, adventure mode, and more. All completely free in your browser."
        actions={<LandingButton href={`/${locale}/quick-play`}>Play Free Word Games Now</LandingButton>}
        art={LANDING_ART.trophy('')}
      />
    </LandingPage>
  );
}
