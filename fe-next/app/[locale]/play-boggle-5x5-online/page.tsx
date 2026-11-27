import type { Metadata } from 'next';
import Link from 'next/link';
import { fromDesc } from '@/components/landing/kit/fromDesc';
import {
  CompareTable,
  CtaBand,
  FaqList,
  LandingButton,
  LandingHero,
  LandingPage,
  Mark,
  Prose,
  Section,
  Steps,
  TileGrid,
} from '@/components/landing/kit';
import { LANDING_ART } from '@/components/landing/kit/art';
import { enOnlyAlternates } from '@/lib/seo/enOnlyAlternates';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PATH = '/play-boggle-5x5-online';
const PAGE_URL = `${BASE_URL}/en${PATH}`;

const EN_TITLE = 'Play Boggle 5x5 Online Free, Multiplayer | LexiClash';
const EN_DESCRIPTION =
  'Play 5x5 Boggle online free: pick the 5×5 board in a LexiClash room, share a 4-letter code and race up to 50 friends live. No download, no signup.';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;

  return {
    title: EN_TITLE,
    description: EN_DESCRIPTION,
    keywords: 'boggle online 5x5, 5x5 boggle, big boggle online, boggle online free multiplayer, play boggle 5x5 with friends',
    robots: locale === 'en' ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: {
      title: EN_TITLE,
      description: EN_DESCRIPTION,
      locale: 'en_US',
      type: 'article',
      url: PAGE_URL,
      images: [{ url: `${BASE_URL}/og-image-en.webp`, width: 1200, height: 630, alt: 'LexiClash: play Boggle 5x5 online free' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: EN_TITLE,
      description: EN_DESCRIPTION,
      images: [`${BASE_URL}/og-image-en.webp`],
    },
    alternates: enOnlyAlternates(PATH),
  };
}

const faqs = [
  {
    q: 'Can I play Boggle 5x5 online for free?',
    a: 'Yes. LexiClash is a free Boggle-style word game in the browser. Open Multiplayer, create a room, choose Board size 5×5 under Advanced settings and start the round. There is no download, no signup and no paywall on the board.',
  },
  {
    q: 'What board sizes can I play?',
    a: 'Multiplayer rooms offer three boards: 5×5 (labelled Easy), 6×6 (the default) and 7×7. The host picks one before the round; everyone in the room plays the same letters.',
  },
  {
    q: 'How many people can play 5x5 Boggle together?',
    a: 'Up to 50 players can join one room. The host shares the room link, the 4-letter room code or the QR code, and each player joins from their own phone, tablet or computer. Everyone plays the same board at the same time.',
  },
  {
    q: 'How long is a round?',
    a: 'The host chooses 1 minute, 1:30, 2 minutes or 3 minutes. 1:30 is the default. Pick 3 minutes if you want the classic Boggle timer on the bigger board.',
  },
  {
    q: 'What is the minimum word length?',
    a: 'The host sets it to 2, 3 or 4 letters; the default is 2. Big Boggle, the 5×5 edition of the board game, only counts words of 4 letters or more, so set the minimum to 4 letters for the closest match to those rules.',
  },
  {
    q: 'How is scoring different from classic Boggle?',
    a: 'Classic Boggle gives 1 point for a 3- or 4-letter word and 11 for 8 letters or more. LexiClash rewards length much more steeply: 2 letters 5 points, 3 letters 10, 4 letters 20, 5 letters 50, 6 letters 100, 7 letters 200 and 8 or more 500, plus a combo bonus for words found back to back. The same table applies on every board size.',
  },
  {
    q: 'Which languages can I play in?',
    a: 'Six: English, Hebrew, Swedish, Japanese, Spanish and Russian. The host sets the room language in Advanced settings, and the letters and dictionary follow it.',
  },
];

/* Static JSON-LD built from the string literals above. */
const faqJsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.q,
    acceptedAnswer: { '@type': 'Answer', text: faq.a },
  })),
});

const articleJsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Play Boggle 5x5 Online Free (Big Board)',
  description: EN_DESCRIPTION,
  url: PAGE_URL,
  inLanguage: 'en',
  mainEntityOfPage: PAGE_URL,
  author: { '@type': 'Organization', name: 'LexiClash', url: BASE_URL },
  publisher: { '@type': 'Organization', name: 'LexiClash', url: BASE_URL },
  about: {
    '@type': 'VideoGame',
    name: 'LexiClash',
    url: `${BASE_URL}/en/multiplayer`,
    genre: ['Word Game', 'Puzzle'],
    gamePlatform: ['Web Browser', 'Android'],
    playMode: ['MultiPlayer'],
    numberOfPlayers: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 50 },
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', availability: 'https://schema.org/InStock' },
  },
});

const STEPS = [
  { title: 'Open Multiplayer', desc: 'Go to lexiclash.live/en/multiplayer and create a room. No account needed.' },
  { title: 'Pick the 5×5 board', desc: 'Open Advanced settings and set Board size to 5×5. Set the timer and minimum word length while you are there.' },
  { title: 'Invite your friends', desc: 'Share the room link, the 4-letter code or the QR code. Friends join from any phone or computer.' },
  { title: 'Start and race', desc: 'Everyone gets the same 25 letters. Swipe or type words that connect through touching tiles, including diagonals, using each tile once.' },
];

const BOARD_ROWS: Array<[string, string, string, string]> = [
  ['Tiles', '16', '25', '36 / 49'],
  ['Tiles with all 8 neighbours', '4', '9', '16 / 25'],
  ['Where to play', 'Board game', 'LexiClash room (Easy)', 'LexiClash room (default / hardest)'],
];

const SCORE_ROWS: Array<[string, string, string]> = [
  ['2', '-', '5'],
  ['3', '1', '10'],
  ['4', '1', '20'],
  ['5', '2', '50'],
  ['6', '3', '100'],
  ['7', '5', '200'],
  ['8+', '11', '500'],
];

const TIPS = [
  { title: 'Work the middle', desc: 'Nine of the 25 tiles touch eight others. Start long words from the centre, where every letter has the most paths out.' },
  { title: 'Hunt endings', desc: 'Find -ING, -ED, -ER and -S first, then build back from them. One stem often gives three or four words.' },
  { title: 'Go long early', desc: 'A 6-letter word is worth 100 points, the same as ten 3-letter words. On 25 tiles six- and seven-letter words are far easier to find than on 4×4.' },
  { title: 'Keep the streak', desc: 'Words found back to back build a combo, and the combo bonus grows with word length. Do not stop to double-check a short word.' },
];

const SAMPLE_BOARD = 'STARELINOPCADEMRUGHTOWSNE'.split('');

export default async function PlayBoggle5x5OnlinePage({ params }: PageProps) {
  const { locale } = await params;

  return (
    <LandingPage locale={locale} play={{ href: `/${locale}/multiplayer`, label: 'Start a 5×5 Room' }}>
      <script id="ld-faq-boggle-5x5" type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqJsonLd }} />
      <script id="ld-article-boggle-5x5" type="application/ld+json" dangerouslySetInnerHTML={{ __html: articleJsonLd }} />

      <LandingHero
        title={
          <>
            Play Boggle <Mark>5x5</Mark> Online Free, With Friends
          </>
        }
        lead={
          <span data-speakable="true">
            You can play 5x5 Boggle online free on LexiClash: create a multiplayer room, set the board to 5×5
            and share the 4-letter code. Up to 50 players race the same 25 letters live, in the browser, with no
            download and no signup.
          </span>
        }
        actions={
          <>
            <LandingButton href={`/${locale}/multiplayer`}>Start a 5×5 Room</LandingButton>
            <LandingButton href={`/${locale}/how-to-play`} variant="secondary">
              How to Play
            </LandingButton>
          </>
        }
        art={LANDING_ART.solver('A LexiClash mascot studying a grid of letter tiles')}
        artTone="cyan"
      />

      <Section title="What Is 5x5 Boggle?">
        <div className="grid items-start gap-8 lg:grid-cols-[1fr_auto] lg:gap-12">
          <div className="flex flex-col gap-6">
            <Prose>
              <p data-speakable="true">
                Classic Boggle is a 4×4 grid of 16 letter cubes. Big Boggle, the board game&apos;s bigger edition,
                uses a 5×5 grid of 25 cubes. The rules stay the same: link letters that touch on a side or a corner,
                use each tile once per word, and find as many words as you can before time runs out. Nine more tiles
                means far more long words, which is why players who find 4×4 too cramped move up to 5×5.
              </p>
            </Prose>
            <CompareTable
              highlight={2}
              columns={['Board', '4×4 (classic)', '5×5 (big board)', '6×6 / 7×7']}
              rows={BOARD_ROWS.map((r) => [...r])}
            />
          </div>
          <div aria-hidden className="mx-auto grid w-fit rotate-2 grid-cols-5 gap-1.5 rounded-neo-lg border-3 border-neo-black bg-neo-pink p-3 shadow-hard-xl">
            {SAMPLE_BOARD.map((ch, i) => (
              <span
                key={i}
                className="grid h-11 w-11 place-items-center rounded-neo border-3 border-neo-black bg-neo-yellow font-neo-display text-xl font-bold text-neo-black sm:h-14 sm:w-14 sm:text-2xl"
              >
                {ch}
              </span>
            ))}
          </div>
        </div>
      </Section>

      <Section title="How to Play Boggle 5x5 Online Free">
        <Steps items={STEPS.map(fromDesc)} />
      </Section>

      <Section title="5x5 Multiplayer: Play With Friends in Real Time">
        <Prose>
          <p data-speakable="true">
            Every player in a LexiClash room sees the same 5×5 board at the same moment, and the round ends for
            everyone together. There are no turns to wait for, and the standings show as soon as the round ends,
            so you can run a rematch on a fresh board straight away.
          </p>
          <p>
            Friends can join from anywhere with the link or the 4-letter code. For a group in one room, put the
            board on a TV and let everyone play on their phones. The host picks 5×5, 6×6 or 7×7 in the lobby, so a
            mixed group can start on 5×5 and move up when it gets easy.
          </p>
        </Prose>
      </Section>

      <Section
        title="Scoring on the 5x5 Board"
        intro="LexiClash uses one scoring table on every board, and it pays far more for length than the board game does. The host also sets the minimum word length to 2, 3 or 4 letters. For Big Boggle rules, choose 4 letters and a 3-minute timer."
      >
        <div className="max-w-2xl">
          <CompareTable
            highlight={2}
            columns={['Word length', 'Classic Boggle points', 'LexiClash points']}
            rows={SCORE_ROWS.map((r) => [...r])}
          />
        </div>
      </Section>

      <Section title="Strategy Tips for the Bigger Grid">
        <TileGrid columns={4} items={TIPS.map(fromDesc)} />
      </Section>

      <Section title="FAQ: Board Sizes, Timers and Languages">
        <FaqList items={faqs.map((f) => ({ q: f.q, a: <span data-speakable="true">{f.a}</span> }))} />
      </Section>

      <Section title="More Boggle-Style Games">
        <TileGrid
          variant="paper"
          items={(
            [
              ['play-boggle-online-free', 'Play Boggle Online Free', 'Every mode, solo and multiplayer'],
              ['boggle-word-shake-free', 'Boggle Word Shake', 'The classic 4×4 rules explained'],
              ['daily-word-wheel', 'Daily Word Wheel', 'One new puzzle every day'],
            ] as const
          ).map(([slug, title, body]) => ({ href: `/${locale}/${slug}`, title, body }))}
        />
      </Section>

      <CtaBand
        tone="lime"
        title="Start a 5×5 Game Now"
        body="Create a room, set Board size to 5×5 and send the code to your friends. The first round starts as soon as you press Start."
        actions={
          <LandingButton href={`/${locale}/multiplayer`} variant="dark">
            Play Boggle 5x5 Online
          </LandingButton>
        }
        art={LANDING_ART.trophy('')}
      />
    </LandingPage>
  );
}
