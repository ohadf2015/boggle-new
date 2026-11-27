import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { EducationIntentCta } from '@/components/education/EducationIntentCta';
import { FRIENDS_ANSWER, PlayBoggleWithFriendsSection } from '@/components/seo/PlayBoggleWithFriendsSection';
import { ApalabradosSinDescargarLink } from '@/components/seo/ApalabradosSinDescargarLink';
import { AnagramSolverLink } from '@/components/seo/AnagramSolverLink';
import { DescargarScrabblePcLink } from '@/components/seo/DescargarScrabblePcLink';
import { RoundSetupSection, TWO_PLAYER_FAQ } from './RoundSetupSection';
import {
  CheckList,
  CompareTable,
  CtaBand,
  FaqList,
  LandingButton,
  LandingHero,
  LandingPage,
  Mark,
  Prose,
  Section,
  StatStrip,
  Steps,
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
  const pageUrl = `${BASE_URL}/en/play-boggle-online-free`;

  return {
    title: 'Play Boggle Online Free — No Download, No Signup | LexiClash',
    description: 'Play Boggle online free — 2–50 players, no signup or download needed. Solo vs bots or real-time multiplayer with friends. Start a word battle in seconds →',
    keywords: 'boggle app free, play boggle online free no download, boggle online free no download, play boggle online free, free boggle online no download, free online boggle no download, boggle game free no download, play boggle word shake free no download, play boggle online free with other players, boggle alternatives 2026, games like boggle online free, word game no download, boggle word shake free, word games online free, word making games, word hunt game online, free word game no download, word puzzle game free',
    openGraph: {
      title: 'Boggle Online Free — Play Solo or Multiplayer | LexiClash',
      description: 'Play boggle online free — no download, no signup. Real-time multiplayer with friends or solo challenge. Instant play in your browser!',
      locale: 'en_US',
      type: 'website',
      url: pageUrl,
      images: [
        {
          url: `${BASE_URL}/en/play-boggle-online-free/opengraph-image?v=2`,
          width: 1200,
          height: 630,
          alt: 'LexiClash - Play Boggle Online Free No Download',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Play Boggle Online Free - No Download | LexiClash',
      description: 'Play boggle free online — no download, no signup. Solo or with friends!',
      images: [`${BASE_URL}/en/play-boggle-online-free/opengraph-image?v=2`],
    },
    alternates: {
      canonical: pageUrl,
      languages: {
        'x-default': `${BASE_URL}/en/play-boggle-online-free`,
        en: `${BASE_URL}/en/play-boggle-online-free`,
      },
    },
    robots: isTargetLocale ? { index: true, follow: true } : { index: false, follow: true },
  };
}

const faqs = [
  {
    q: 'How do I play Boggle online with others?',
    a: FRIENDS_ANSWER,
  },
  {
    q: 'What is Boggle online?',
    a: 'Boggle online is the browser version of the classic letter-grid word game: you get a grid of random letters and race a timer to find as many words as possible by connecting adjacent letters. LexiClash is a free online Boggle-style game with no download — solo against AI bots, or real-time multiplayer where everyone plays the same grid at once.',
  },
  {
    q: 'Can I play Boggle online free with no download?',
    a: 'Yes! LexiClash lets you play boggle online completely free with no download and no signup required. Just visit lexiclash.live and start playing instantly in your browser on any device — phone, tablet, or desktop.',
  },
  {
    q: 'Is this like real Boggle?',
    a: "Close. Like Boggle, you find words by linking letters that touch, across, down or diagonally. Classic Boggle uses a 4×4 tray and a 3-minute sand timer; LexiClash rooms use 5×5, 6×6 or 7×7 boards and rounds from 1 to 3 minutes, and add real-time multiplayer, combo scoring, daily challenges and boss battles, all free.",
  },
  {
    q: 'Can I play with friends online?',
    a: 'Yes. Create a room in Multiplayer, then share the 4-letter code, the QR, or the share button. Friends join from any browser. No download and no account. One room holds up to 50 players.',
  },
  TWO_PLAYER_FAQ,
  {
    q: 'Is there a Boggle With Friends I can play in the browser?',
    a: "Boggle With Friends is the official app. If you want the same idea without installing anything, LexiClash runs in the browser: make a room, send the link, and everyone plays the same board at once. It's free, with no in-app purchases and no pay-to-win boosts, and nobody waits for a turn.",
  },
  {
    q: 'What are the best Boggle alternatives online?',
    a: 'LexiClash is one of the best free Boggle alternatives. It offers the classic letter-grid word-finding gameplay plus multiplayer battles, daily challenges, adventure mode with boss fights, and brain training drills. All free, no download needed, available in 6 languages.',
  },
  {
    q: 'Does it work on mobile without downloading an app?',
    a: "Yes! LexiClash works perfectly in your mobile browser — no app download needed. It's optimized for touch screens and works on iOS and Android. You can also install it as a Progressive Web App (PWA) from your browser for an app-like experience.",
  },
  {
    q: 'Can students play Boggle online free in a classroom?',
    a: 'Yes! LexiClash works great as a free classroom Boggle game — no accounts, no downloads, no setup. Teachers create a room in seconds and share the link or QR code. Up to 50 students compete simultaneously on the word grid, making it ideal for vocabulary practice, spelling drills, and ESL classes.',
  },
  {
    q: 'Is LexiClash Boggle unblocked at school?',
    a: "It runs in a normal browser tab with nothing to install, so it opens on school Chromebooks unless your school's filter blocks lexiclash.live. If it is blocked, ask the teacher or IT to allow the site; teachers can run a whole class from one room.",
  },
  {
    q: 'Is there a free Boggle app?',
    a: 'Yes. Boggle With Friends is the official free app: it has ads and in-app purchases, 1M+ Android installs, and a 316.7 MB iPhone download. LexiClash is the free option that is not an app — $0, no download, no in-app purchases. Open lexiclash.live in the browser and the grid starts.',
  },
];

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
  name: 'How to Play Boggle Online Free',
  description: 'Start playing free online Boggle in 3 simple steps — no download or account required.',
  totalTime: 'PT1M',
  step: [
    { '@type': 'HowToStep', name: 'Open LexiClash', text: 'Visit lexiclash.live in any browser — works on phone, tablet, and desktop. No download or signup needed.', url: 'https://www.lexiclash.live/en/quick-play' },
    { '@type': 'HowToStep', name: 'Choose Your Mode', text: 'Pick Solo (vs AI bots), Multiplayer (a room of up to 50), Daily Challenge (same puzzle worldwide), or Adventure Mode (boss battles).' },
    { '@type': 'HowToStep', name: 'Find Words & Score', text: 'Swipe or click to connect adjacent letters and form words. Longer words and fast combos score more points. Compete on the global leaderboard!' },
  ],
});

const softwareAppJsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'LexiClash — Free Online Boggle',
  url: 'https://www.lexiclash.live',
  applicationCategory: 'GameApplication',
  operatingSystem: 'Any',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  featureList: [
    'Real-time multiplayer up to 50 players',
    'No download required — play in browser',
    'Daily Word Wheel puzzle',
    '6 language support (EN, HE, SV, JA, ES, RU)',
    '5x5, 6x6, 7x7 grid sizes',
    'Adventure mode with boss battles',
    'Combo scoring system',
  ],
  browserRequirements: 'Requires a modern web browser',
  inLanguage: ['en', 'he', 'sv', 'ja', 'es', 'ru'],
});

const stickerBadges = ['NO DOWNLOAD', 'NO SIGNUP', 'NO ADS HELL', 'PLAY IN 5s', '6 LANGUAGES', 'REAL-TIME', 'INSTANT FUN'];

const modes = [
  { href: 'singleplayer', tone: 'lime', label: 'Solo', title: 'BEAT THE BOTS', desc: 'You vs sneaky AI rivals. Three difficulty tiers — pick your pain.', mascot: '/mascot/play.webp', cta: 'Play Solo Free' },
  { href: 'multiplayer', tone: 'pink', label: 'Multiplayer', title: 'BRING THE CHAOS', desc: 'Real-time word brawls with 2–50 friends. Share a code, drop in, fight.', mascot: '/mascot/dj.webp', cta: 'Play With Friends' },
  { href: 'daily', tone: 'cyan', label: 'Daily', title: 'WORD WHEEL', desc: 'One letter set, the whole world plays it. Chase the global record.', mascot: '/mascot/scholar.webp', cta: 'Spin The Wheel' },
] as const;

const stats = [
  { value: '5×5-7×7', label: 'Grid Sizes' },
  { value: '6', label: 'Languages' },
  { value: '50', label: 'Max Players' },
  { value: '8', label: 'Game Modes' },
];

const features = [
  'Free online — no download, no signup, no ads-hell',
  'Solo mode vs AI bots at three sass levels',
  'Real-time multiplayer with 2–50 players',
  'Three grid sizes: 5×5, 6×6, 7×7',
  'Daily Word Wheel — chase the global record',
  'Combo scoring rewards lightning chains',
  'Phone, tablet, desktop — same game everywhere',
  'Six languages: EN · HE · SV · JA · ES · RU',
  'Adventure mode with boss battles & loot',
  'Brain drills to sharpen the word-brain',
];

const compareRows: ReadonlyArray<readonly [string, string, string, string]> = [
  ['Free to play', '✓', '✗ board game', '✓ with ads'],
  ['No download', '✓', '✗', '✗ app required'],
  ['Real-time MP', '✓', '✓ in person', '✗ turn-based'],
  ['Online with friends', '✓', '✗', '✓'],
  ['Daily challenges', '✓', '✗', '✗'],
  ['Multi-language', '6 langs', '✗', '✗'],
  ['Boss battles', '✓', '✗', '✗'],
  ['Grid sizes', '5×5 · 6×6 · 7×7', '4×4 only', 'N/A'],
];

const LINK_LINE = 'font-neo-body text-sm leading-relaxed text-neo-white';
const H3 = 'font-neo-display text-xl font-bold';

export default async function PlayBoggleOnlineFreePage({ params }: PageProps) {
  const { locale } = await params;

  return (
    <LandingPage locale={locale} play={{ href: `/${locale}/quick-play`, label: 'Play Free Now' }}>
      <script id="ld-faq" type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqJsonLd }} />
      <script id="ld-howto" type="application/ld+json" dangerouslySetInnerHTML={{ __html: howToJsonLd }} />
      <script id="ld-app" type="application/ld+json" dangerouslySetInnerHTML={{ __html: softwareAppJsonLd }} />

      <LandingHero
        eyebrow="★ Browser-Native ★ Zero Install ★"
        title={
          <>
            Play <Mark>Boggle</Mark>
            <br />
            Online Free.
            <br />
            No downloads.
          </>
        }
        lead={
          <>
            A free Boggle-style word game that runs in your browser, in 6 languages. Find words on a letter grid
            solo, or throw up to 50 friends into a real-time word brawl. Open the browser. Start playing. That&apos;s it.
            If you searched for a boggle app free, this is the one that skips the store.
          </>
        }
        actions={
          <>
            <LandingButton href={`/${locale}/quick-play`}>▶ Play Free Now</LandingButton>
            <LandingButton href={`/${locale}/multiplayer`} variant="secondary">
              ★ Play w/ Friends
            </LandingButton>
          </>
        }
        art={{ src: '/landing/play-boggle-hero.webp', alt: 'LexiClash Boggle letter grid with kawaii mascot character', width: 1920, height: 1072 }}
        artTone="lime"
      >
        <p className="text-xs font-bold uppercase tracking-wide text-neo-white/70">
          No download · No login · <span className="text-neo-lime">● live now</span> · browser-based · 6 languages · 2-50 players
        </p>
        <ul className="flex flex-wrap gap-2">
          {stickerBadges.map((b) => (
            <li key={b} className="rounded-full border-2 border-neo-black bg-neo-cream px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-neo-black">
              {b}
            </li>
          ))}
        </ul>
      </LandingHero>

      <StatStrip items={stats} />

      <div className="flex flex-col gap-4">
        <PlayBoggleWithFriendsSection locale={locale} />
        <div className="flex flex-col gap-1">
          <ApalabradosSinDescargarLink className={LINK_LINE} />
          <DescargarScrabblePcLink lead="En español, para el PC sin instalar nada:" className={LINK_LINE} />
          <AnagramSolverLink lead="Can't find a word on the grid? Run your letters through the free" className={LINK_LINE} />
        </div>
      </div>

      <Link
        href="/en/words-with-friends-alternative"
        className="flex flex-col items-start gap-4 rounded-neo-lg border-3 border-neo-black bg-neo-cyan p-6 text-neo-black shadow-hard-xl motion-safe:transition-transform motion-safe:hover:-translate-y-1 sm:flex-row sm:items-center sm:justify-between sm:p-8"
      >
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold uppercase tracking-wide">★ Looking for Words With Friends? ★</span>
          <h3 className="font-neo-display text-2xl font-bold leading-tight">
            The free Words With Friends alternative — but real-time.
          </h3>
          <p className="max-w-xl">2-50 friends play the same grid simultaneously. Match takes 2-3 min, not 3 days. No download.</p>
        </div>
        <span className="shrink-0 rounded-neo-lg border-3 border-neo-black bg-neo-cream px-5 py-2.5 font-neo-display font-bold shadow-hard-lg">
          Compare →
        </span>
      </Link>

      <Section title="Pick your poison." intro="// 3 modes · 0 paywalls">
        <TileGrid
          items={modes.map((m) => ({
            href: `/${locale}/${m.href}`,
            tone: m.tone,
            icon: (
              <span className="mb-1 flex items-center justify-between">
                <span className="relative block h-20 w-20">
                  <Image src={m.mascot} alt="" fill sizes="80px" className="object-contain" unoptimized />
                </span>
                <span className="rounded-full border-2 border-neo-black bg-neo-cream px-2.5 py-0.5 text-[11px] font-bold uppercase">{m.label}</span>
              </span>
            ),
            title: m.title,
            body: (
              <>
                {m.desc}
                <span className="mt-3 block font-neo-display font-bold">{m.cta} →</span>
              </>
            ),
          }))}
        />
      </Section>

      <Section
        title="Three steps. One minute."
        intro="No tutorials. No onboarding wall. You'll be finding words before the kettle boils."
      >
        <Steps
          items={[
            { title: 'Open the browser', body: 'Hit lexiclash.live on phone, tablet, or laptop. No app store. No account. No vibe-killers.' },
            { title: 'Pick a mode', body: 'Solo vs bots, real-time multiplayer, daily Word Wheel, or boss-battle adventure mode.' },
            { title: 'Find words. Score. Win.', body: 'Connect adjacent letters. Longer words + faster chains = a fatter score and louder bragging rights.' },
          ]}
        />
      </Section>

      <section className="grid items-center overflow-hidden rounded-neo-lg border-3 border-neo-black bg-neo-pink text-neo-black shadow-hard-xl lg:grid-cols-2">
        <div className="relative aspect-[16/10] w-full border-b-3 border-neo-black lg:h-full lg:border-b-0 lg:border-e-3">
          <Image
            src="/landing/play-boggle-multiplayer.webp"
            alt="Three mascots competing on a multiplayer Boggle word board"
            fill
            sizes="(min-width: 1024px) 600px, 100vw"
            className="object-cover"
          />
        </div>
        <div className="flex flex-col items-start gap-4 p-6 sm:p-10">
          <span className="text-xs font-bold uppercase tracking-wide">★ MULTIPLAYER ★</span>
          <h2 className="font-neo-display text-2xl font-bold leading-tight sm:text-3xl">The party starts when friends join.</h2>
          <p className="leading-relaxed">
            Play boggle online with up to 50 people at once. Spin up a room in 3 seconds, share a 4-letter code or
            QR, 20 people on phones, one TV in the middle — chaos in six languages. Real-time scoring, combo
            streaks, the works.
          </p>
          <p className="leading-relaxed">
            Want the bigger board?{' '}
            <Link href={`/${locale}/play-boggle-5x5-online`} className="font-bold underline underline-offset-2">
              Play Boggle 5x5 online
            </Link>{' '}
            with 25 letters per round.
          </p>
          <LandingButton href={`/${locale}/multiplayer`} variant="dark">
            Start a Room →
          </LandingButton>
        </div>
      </section>

      <Section title="Boggle online for the classroom.">
        <Prose>
          <p>
            Teachers use LexiClash as a free classroom Boggle game — no accounts, no downloads, no setup. Spin up a
            room in seconds, share the link or QR code, and up to 50 students compete live on the same word grid. Great
            for vocabulary practice, spelling drills, and ESL classes. Run{' '}
            <Link href={`/${locale}/education/esl-word-games`}>vocabulary games for the classroom</Link>, see the{' '}
            <Link href={`/${locale}/education/boggle-for-the-classroom`}>Boggle for the classroom guide</Link> or check
            out <Link href={`/${locale}/education/for-schools`}>LexiClash for Schools</Link>.
          </p>
        </Prose>
      </Section>

      <RoundSetupSection />

      <Section
        title="Is there a free Boggle app?"
        intro="Yes. Boggle With Friends is the official free app — ads, in-app purchases, and a download. LexiClash is the free option that is not an app: $0, no install, no token packs. Open the browser, the grid starts. Store figures below were read from the public listings on 25 Oct 2026, not from our analytics."
      >
        <h3 className={H3}>Free Boggle apps, compared</h3>
        <CompareTable
          columns={['', 'LexiClash', 'Boggle With Friends, Android', 'Boggle With Friends, iPhone']}
          rows={[
            ['Price', '$0, no in-app purchases', 'Free, ads + in-app purchases', 'Free, in-app purchases from US$0.99'],
            ['Download', 'None — browser', 'Required. 1M+ installs', 'Required. 316.7 MB'],
            ['Rating', 'Not a store app', '3.8★ from 26.8K reviews', '4.5 from 45K ratings'],
            ['Age', 'No store rating', 'Everyone', '4+'],
            ['Offline', 'A room needs a connection', 'Listing says offline 24/7', 'Same listing: offline 24/7'],
            ['Players', '2–50 on one grid, live', 'Match, friends, tournaments', 'Same, plus a #92 Word chart rank'],
            ['Languages', '6: EN, HE, SV, JA, ES, RU', '9, including EN', 'EN + 8 more'],
            ['Round', '2–3 min', '2 min', '2 min'],
            ['Updated', 'Live in the browser', '21 Sep 2026', 'Listing current 25 Oct 2026'],
          ]}
          caption="Android: Google Play, com.zynga.boggle. iPhone: App Store id 1197041040. Token packs on that listing start at the Small Token Package, US$0.99. A Large Mega Freeze pack on the same listing is US$19.99. LexiClash charges neither."
        />
        <Prose className="pt-4">
          <h3>Play offline, or skip the install</h3>
          <p>
            The store pages lead with offline play, daily prizes, and power-ups. Those are real: the listing
            says you can play Boggle With Friends offline, and the prizes are how the free app sells tokens.
            LexiClash does not do offline rooms. A match needs a connection, because everyone is on the same
            grid at once. What you skip is the 316.7 MB install, the ads, and the token pack.
          </p>
          <h3>A free round, scored — our points, not the classic 1</h3>
          <p>
            Browser Boggle sites publish the classic table: 3–4 letters score 1, 5 scores 2, 6 scores 3,
            7 scores 5, 8+ scores 11. LexiClash does not use that table. Base points, before any combo, are
            3 letters = 10, 4 = 20, 5 = 50, 6 = 100, 7 = 200, 8 or more = 500. Here is one 4×4 you can trace.
            Letters touch horizontally, vertically, or diagonally. No tile is reused inside a word.
          </p>
        </Prose>
        <div className="grid items-start gap-6 lg:grid-cols-[auto_1fr] lg:gap-10">
          <div className="mx-auto grid w-fit -rotate-2 grid-cols-4 gap-1.5 rounded-neo-lg border-3 border-neo-black bg-neo-cyan p-3 shadow-hard-xl">
            {['C', 'A', 'T', 'S', 'O', 'P', 'E', 'N', 'R', 'L', 'I', 'D', 'M', 'U', 'G', 'Y'].map((letter) => (
              <span
                key={letter}
                className="grid h-14 w-14 place-items-center rounded-neo border-3 border-neo-black bg-neo-yellow font-neo-display text-2xl font-bold text-neo-black sm:h-16 sm:w-16"
              >
                {letter}
              </span>
            ))}
          </div>
          <CompareTable
            highlight={2}
            columns={['Word', 'Path', 'LexiClash', 'Classic']}
            rows={[
              ['CAT', 'C-A-T across the top row', '10', '1'],
              ['OPEN', 'O-P-E-N across the second row', '20', '1'],
              ['TEND', 'T down to E, across to N, down to D', '20', '1'],
              ['PINE', 'P diagonal to I, diagonal to N, back to E', '20', '1'],
              ['Four words, same board', '', '70', '4'],
            ]}
            caption="70 versus 4 is the gap the store listings never show. Combos add more on top of the 70; the classic column stays at 1 point per 3–4 letter word. That scoring table is the one the game uses."
          />
        </div>
      </Section>

      <Section title="The good stuff, all included.">
        <CheckList items={features} />
      </Section>

      <Section title="LexiClash vs The World." intro="Where Boggle and Words With Friends fall short, LexiClash struts.">
        <CompareTable columns={['Feature', 'LexiClash', 'Boggle', 'WWF']} rows={compareRows.map((r) => [...r])} />
      </Section>

      <Section title="Quick questions.">
        <FaqList items={faqs} />
      </Section>

      <Section title="More word fights.">
        <TileGrid
          variant="paper"
          columns={4}
          items={[
            { href: 'daily-word-wheel', tag: 'DAILY', title: 'Daily Word Wheel', desc: 'New letter puzzle every day' },
            { href: 'lexiclash-vs-wordle', tag: 'VS', title: 'LexiClash vs Wordle', desc: 'Unlimited play vs 1 puzzle/day' },
            { href: 'lexiclash-vs-scrabble', tag: 'VS', title: 'LexiClash vs Scrabble GO', desc: 'No pay-to-win, real players' },
            { href: 'best-online-word-games', tag: 'GUIDE', title: 'Best Word Games 2026', desc: 'Complete comparison guide' },
          ].map((c) => ({
            href: `/${locale}/${c.href}`,
            icon: <span className="text-xs font-bold uppercase tracking-wide text-neo-black/60">{c.tag}</span>,
            title: c.title,
            body: c.desc,
          }))}
        />
      </Section>

      <EducationIntentCta locale={locale} variant="teachers" />

      <CtaBand
        tone="yellow"
        title={
          <>
            Stop searching.
            <br />
            Start playing.
          </>
        }
        body={
          <>
            You searched &ldquo;boggle online free no download&rdquo; and you found it. The browser is open. The game is free.
            The friends are waiting. Push the button.
          </>
        }
        actions={
          <>
            <LandingButton href={`/${locale}/quick-play`}>▶ Play Boggle Now</LandingButton>
            <LandingButton href={`/${locale}/multiplayer`} variant="secondary">
              ★ Invite Friends
            </LandingButton>
          </>
        }
        art={LANDING_ART.trophy('')}
      />
    </LandingPage>
  );
}
