import type { Metadata } from 'next';
import Link from 'next/link';
import {
  CheckList,
  CompareTable,
  CtaBand,
  FaqList,
  LandingButton,
  LandingHero,
  LandingPage,
  Prose,
  Section,
  Steps,
  TileGrid,
} from '@/components/landing/kit';
import { LANDING_ART } from '@/components/landing/kit/art';
import BoggleWordShakeGameClient from './PageClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isTargetLocale = locale === 'en';
  const pageUrl = `${BASE_URL}/en/boggle-word-shake-free`;

  return {
    title: 'Boggle WordShake Free Online — Play Boggle Shake | LexiClash',
    description: 'Wordplay boggle shake: shake a 4x4 letter grid, find words in 3 minutes. Play free in the browser — no download, no signup. Solo or with up to 50 friends live.',
    keywords: 'wordplay boggle shake, boggle wordshake, boggle shake, boggle shake free, wordshake boggle, play boggle shake online, free boggle online no download, boggle word shake free no download, boggle word shake online, word shake game free, boggle shake free online, word scramble game free no download, boggle word game free, word shake multiplayer',
    robots: isTargetLocale ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: {
      title: 'Boggle Word Shake Free — Play Online | LexiClash',
      description: 'Wordplay boggle shake: shake a 4x4 letter grid, find words in 3 minutes. Free, no download.',
      locale: 'en_US',
      type: 'website',
      url: pageUrl,
      images: [{ url: `${BASE_URL}/og-image-en.webp`, width: 1200, height: 630, alt: 'LexiClash - Boggle Word Shake Free' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Boggle Word Shake Free — No Download | LexiClash',
      description: 'Shake, find words, score — free online Boggle alternative!',
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

const WORDPLAY_BOGGLE_SHAKE_ANSWER =
  '"Boggle shake" is the opening move of classic Boggle, the letter-cube game Allan Turoff designed and Parker Brothers released in 1973. Sixteen letter cubes sit in a 4x4 grid under a clear dome. Players shake the dome so each cube shows one letter, then have 3 minutes to find words of at least 3 letters by linking letters that touch on a side or a corner. A cube may be used only once in a word, and the Qu face counts as two letters. Classic Boggle scoring is 1 point for a 3- or 4-letter word, 2 points for 5 letters, 3 for 6, 5 for 7, and 11 for 8 or more. LexiClash plays that same shake-and-find game free in the browser at lexiclash.live, with no download, no signup, 5×5, 6×6 and 7×7 boards, and live rooms for up to 50 players. Wordplay boggle shake is the game you shake, not the dictionary verb boggle (to be overwhelmed, from the old word bogle).';

const classicBoggleScoring = [
  { letters: '3-4', points: '1' },
  { letters: '5', points: '2' },
  { letters: '6', points: '3' },
  { letters: '7', points: '5' },
  { letters: '8+', points: '11' },
];

const faqs = [
  {
    q: 'Is this the British Council Wordshake game?',
    a: "No. Wordshake is the British Council's LearnEnglish game: a 4×4 board, three minutes, and you can pick letters from anywhere on the board. LexiClash plays the Boggle way: each word has to follow letters that touch, and multiplayer boards are 5×5, 6×6 or 7×7. If you liked Wordshake's three-minute rounds, set the round to 3 minutes in a multiplayer room.",
  },
  {
    q: 'What is wordplay boggle shake?',
    a: WORDPLAY_BOGGLE_SHAKE_ANSWER,
  },
  {
    q: 'What is Boggle Word Shake?',
    a: 'Boggle Word Shake is a word-finding game where letters are scrambled on a grid and you find words by connecting adjacent letters. LexiClash brings this classic gameplay online — free, no download, with rooms for up to 50 players.',
  },
  {
    q: 'Can I play Boggle Word Shake free with no download?',
    a: 'Yes! LexiClash runs entirely in your browser. No app download, no signup. Just visit the site and start playing instantly on phone, tablet, or desktop.',
  },
  {
    q: 'How is this different from the original Boggle Word Shake app?',
    a: 'LexiClash offers the same word-shake gameplay plus real-time multiplayer for up to 50 players, three board sizes (5×5, 6×6 and 7×7), daily challenges, combo scoring, and 6-language support — all free with no pay-to-win boosts.',
  },
  {
    q: 'Can I play Boggle Word Shake with friends online?',
    a: 'Absolutely! Create a room, share the link, and everyone plays the same scrambled grid simultaneously. No waiting for turns — everyone races to find words at the same time.',
  },
  {
    q: 'Is there a daily Boggle Word Shake challenge?',
    a: 'Yes! The Daily Word Wheel gives everyone the same puzzle each day. Find all possible words and compare your score on the global leaderboard.',
  },
];

/* Static JSON-LD structured data — all content is hardcoded string literals, safe for serialization */
const faqJsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.q,
    acceptedAnswer: { '@type': 'Answer', text: faq.a },
  })),
});

const howToJsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How to Play Boggle Word Shake Free Online',
  description: 'Start playing free online Boggle Word Shake in 3 simple steps.',
  totalTime: 'PT1M',
  step: [
    { '@type': 'HowToStep', name: 'Open LexiClash', text: 'Visit lexiclash.live in any browser. No download or signup needed.' },
    { '@type': 'HowToStep', name: 'Start a game', text: 'Choose Solo mode or create a multiplayer room and share the link with friends.' },
    { '@type': 'HowToStep', name: 'Shake & find words', text: 'The grid scrambles with random letters. Connect adjacent letters to form words. Longer words and fast combos score more!' },
  ],
});

export default async function BoggleWordShakeFreePage({ params }: PageProps) {
  const { locale } = await params;

  return (
    <LandingPage locale={locale} play={{ href: `/${locale}/quick-play`, label: 'Play Word Shake Solo — Free' }}>
      {/* JSON-LD: static hardcoded content only, no user input — safe for inline serialization */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqJsonLd }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: howToJsonLd }} />

      <LandingHero
        title="Boggle Shake Free Online — Play in Browser, No Download"
        lead="LexiClash is a free online Boggle Word Shake game: shake a letter grid, find hidden words, and compete live with friends — no download, no signup."
        actions={
          <>
            <LandingButton href={`/${locale}/quick-play`}>Play Word Shake Solo — Free</LandingButton>
            <LandingButton href={`/${locale}/multiplayer`} variant="secondary">
              Play With Friends
            </LandingButton>
          </>
        }
        art={LANDING_ART.solver('A LexiClash mascot hunting for words on a shaken letter grid')}
        artTone="yellow"
      >
        <Link href={`/${locale}/daily-word-wheel`} className="font-bold text-neo-lime underline underline-offset-4">
          Daily Word Wheel →
        </Link>
      </LandingHero>

      <section className="grid items-start gap-8 lg:grid-cols-[3fr_2fr] lg:gap-12" aria-labelledby="wordplay-boggle-shake">
        <Prose paper>
          <h2 id="wordplay-boggle-shake">What is wordplay boggle shake?</h2>
          <p>{WORDPLAY_BOGGLE_SHAKE_ANSWER}</p>
          <p>
            Miss the classic Boggle Shake game? LexiClash brings the same scramble-and-find gameplay to your browser —
            completely free, no download required. Shake up a grid of letters, find as many words as you can, and compete
            against friends or AI bots in real-time. Looking for free boggle online no download? You found it. Choose from
            5×5, 6×6 or 7×7 boards with combo scoring for extra challenge.
          </p>
        </Prose>
        <div className="flex flex-col gap-3">
          <h3 className="font-neo-display text-xl font-bold">Classic Boggle points by word length</h3>
          <CompareTable
            highlight={-1}
            columns={['Letters', 'Points']}
            rows={classicBoggleScoring.map((row) => [row.letters, row.points])}
            caption="Classic Boggle scoring (Parker Brothers, 1973). Page updated October 2026."
          />
        </div>
      </section>

      {/* Live playable Boggle Word Shake game: the shell holds the space until the game mounts as a full-screen layer */}
      <section aria-label="Play Boggle Word Shake" className="relative flex w-full flex-col [&_[data-phase=playing]]:h-0 [&_[data-phase=playing]]:min-h-0">
        <BoggleWordShakeGameClient />
      </section>

      <Section title="How to Play Boggle Word Shake Online">
        <Steps
          items={[
            { title: 'Open LexiClash', body: 'Visit lexiclash.live — works on any device. No download or signup.' },
            { title: 'Start a Game', body: 'Play solo vs AI bots, or create a room and invite up to 49 friends via link.' },
            { title: 'Shake & Find Words', body: 'Letters scramble on the grid. Connect adjacent letters to form words. Longer = more points!' },
          ]}
        />
      </Section>

      <Section title="Why LexiClash Beats the Original Word Shake">
        <CheckList
          items={[
            'Same scramble-and-find gameplay you love',
            'Real-time multiplayer for up to 50 players',
            'Three board sizes: 5×5, 6×6, 7×7',
            'Combo scoring for fast word chains',
            'No download — plays in any browser',
            'Daily challenges with global leaderboard',
            'Available in 6 languages',
            'Adventure mode with boss battles',
          ]}
        />
      </Section>

      <Section title="Frequently Asked Questions">
        <FaqList items={faqs} />
      </Section>

      <Section title="More Word Games">
        <TileGrid
          variant="paper"
          items={[
            { href: `/${locale}/play-boggle-online-free`, title: 'Play Boggle Online Free', body: 'The full free Boggle experience' },
            { href: `/${locale}/daily-word-wheel`, title: 'Daily Word Wheel', body: 'New puzzle every day' },
            { href: '/en/words-with-friends-alternative', title: 'vs Words With Friends', body: 'Real-time, not turn-based' },
          ]}
        />
      </Section>

      <CtaBand
        tone="yellow"
        title="Start Shaking Words Now"
        body={
          <>
            No need to search for &quot;boggle word shake free no download&quot; anymore — you found it.
            Play the best free Boggle Word Shake alternative right now in your browser.
          </>
        }
        actions={<LandingButton href={`/${locale}/quick-play`}>Play Boggle Word Shake Free</LandingButton>}
        art={LANDING_ART.trophy('')}
      />
    </LandingPage>
  );
}
