import type { Metadata } from 'next';
import { ComparisonLanding } from '@/components/landing/comparison/ComparisonLanding';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isEnglish = locale === 'en';
  const pageUrl = `${BASE_URL}/${locale}/lexiclash-vs-scrabble`;
  const canonicalUrl = `${BASE_URL}/en/lexiclash-vs-scrabble`;

  return {
    title: 'LexiClash vs Scrabble GO — No Interruptions, No Bots, Real Competition | LexiClash',
    description: 'Tired of Scrabble GO interstitials and fake bot opponents? LexiClash is a real-time word game with real players, no mid-game ad interruptions, and no pay-to-win. Free comparison.',
    keywords: 'lexiclash vs scrabble, scrabble go alternative, scrabble go too many ads, scrabble go bots, scrabble go pay to win, best scrabble alternative 2026, no interstitial word games, real multiplayer word game',
    openGraph: {
      title: 'LexiClash vs Scrabble GO — Honest Comparison 2026',
      description: 'No interruptions, no bots, no pay-to-win. See why players are switching from Scrabble GO.',
      locale: 'en_US',
      type: 'website',
      url: pageUrl,
      images: [{ url: `${BASE_URL}/og-image-en.webp`, width: 1200, height: 630, alt: 'LexiClash vs Scrabble GO Comparison' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'LexiClash vs Scrabble GO — No Interruptions, Real Players',
      description: 'Tired of Scrabble GO interstitials? LexiClash is the clean alternative.',
      images: [`${BASE_URL}/og-image-en.webp`],
    },
    alternates: {
      canonical: canonicalUrl,
      languages: {
        'x-default': `${BASE_URL}/en/lexiclash-vs-scrabble`,
        en: `${BASE_URL}/en/lexiclash-vs-scrabble`,
      },
    },
    robots: { index: isEnglish, follow: true },
  };
}

// Static FAQ data — all values are hardcoded string literals, safe for JSON-LD serialization
const faqs = [
  {
    q: 'Why are people leaving Scrabble GO?',
    a: 'Honestly? The ads broke people. You finish a game, get an ad. You open the app, get an ad. You breathe near your phone, believe it or not — ad. Then you realize half your opponents were bots the whole time, and the other half bought Word Radar so they never actually had to think. People aren\'t leaving because they stopped loving word games. They\'re leaving because Scrabble GO stopped respecting them.',
  },
  {
    q: 'Does LexiClash have ads like Scrabble GO?',
    a: 'Not even close. LexiClash has optional rewarded ads — you can choose to watch one to double your coins after a game. That\'s it. No forced ads between rounds, no pop-ups mid-game, no "watch this 30-second video to continue playing the game you already downloaded for free." You play when you want, uninterrupted.',
  },
  {
    q: 'Are there bots pretending to be real players?',
    a: 'No, and this one really matters. In LexiClash multiplayer, every single opponent is a real human being. When you play solo, the AI bots are clearly labeled with their difficulty level — because treating players like adults who can handle the truth shouldn\'t be revolutionary, but here we are.',
  },
  {
    q: 'Is LexiClash pay-to-win?',
    a: 'Absolutely not. You can\'t buy your way to a win. Coins are earned by playing and can only buy cosmetic stuff — skins, avatar parts, that kind of thing. Your vocabulary is your advantage, not your credit card. Scrabble GO sells boosters that literally reveal the best word on the board. At that point, what are you even playing?',
  },
  {
    q: 'How is the gameplay different?',
    a: 'Scrabble is turn-based tile placement on a shared board — and to be clear, that\'s a genuinely great game design. The board game is a classic for a reason. LexiClash is a different beast: everyone plays the same letter grid at the same time, racing to find words by connecting adjacent letters. Games take 60 to 180 seconds instead of hours. It\'s less chess, more arena.',
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

export default async function LexiClashVsScrabblePage({ params }: PageProps) {
  const { locale } = await params;

  return (
    <>
      {/* Static JSON-LD for FAQ rich results — hardcoded content only, no user input */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: faqJsonLd }}
      />

      <ComparisonLanding
        locale={locale}
        showBackLink={true}
        h1="LexiClash vs Scrabble GO — No Interruptions, No Bots, Real Competition"
        intro={[
          "Let's get one thing straight: Scrabble is a brilliant game. The board game has earned every bit of its 80-year reputation. But Scrabble GO — the app — is a different story entirely.",
          "If you've played it recently, you already know. The ads that hit you every 30 seconds. The \"opponents\" who are obviously bots but the app pretends they're real. The boosters that let people pay to skip the whole \"thinking\" part of a word game. I spent two years on Scrabble GO before I snapped. LexiClash is what I wish that app had been. Here's the honest breakdown.",
        ]}
        quickCtas={[
          { href: `/${locale}/multiplayer`, label: 'Play Real Multiplayer', variant: 'lime' },
          { href: `/${locale}/singleplayer`, label: 'Solo vs Labeled Bots', variant: 'cyan' },
          { href: `/${locale}/daily`, label: 'Daily Challenge', variant: 'pink' },
        ]}
        competitorName="Scrabble GO"
        comparisonRows={[
          ['Price', 'Free', 'Free (but good luck with that)'],
          ['Ads', 'Optional rewarded only', 'Mandatory, every 30s'],
          ['Real opponents', 'Yes, always', 'Mixed with unlabeled bots'],
          ['Pay-to-win', 'No', 'Yes (Word Radar, Swap+)'],
          ['Game speed', '60-180 sec rounds', 'Hours or days per game'],
          ['Multiplayer type', 'Real-time simultaneous', 'Turn-based'],
          ['Players per game', '2-20+', '2'],
          ['No download needed', 'Yes (runs in browser)', 'No (app required)'],
          ['Languages', '5', '1'],
          ['Adventure mode', 'Yes, 100+ levels', 'No'],
          ['Daily challenges', 'Yes + global leaderboard', 'Yes (limited)'],
          ['UI complexity', 'Clean, game-focused', 'Gems, energy, events, popups'],
        ]}
        featuresTitle="The Scrabble GO Pain Points (You Know the Ones)"
        features={[
          { title: 'Ads every 30 seconds, sometimes mid-game', desc: 'Optional rewarded ads only. You choose. Zero interruptions, ever.' },
          { title: 'Bot opponents dressed up as real players', desc: 'Multiplayer is 100% real humans. Bots in solo mode are clearly labeled.' },
          { title: 'Pay-to-win boosters (Word Radar, Swap+)', desc: 'Coins buy cosmetics only. Your brain is the only advantage here.' },
          { title: 'A UI buried under gems, energy bars, and event popups', desc: 'Clean interface. You open the app, you play the game. That\'s it.' },
          { title: 'Games that drag on for hours or even days', desc: 'Fast 60-180 second rounds. Quick, intense, done.' },
          { title: 'Have to download a 300MB+ app', desc: 'Runs in your browser. Click and play, nothing to install.' },
        ]}
        featuresStyle="pain"
        faqs={faqs}
        moreComparisons={[
          { href: `/${locale}/scrabble-alternative-online`, title: 'Scrabble Alternative Online', subtitle: 'Real-time, browser-based, 2-20 players' },
          { href: `/${locale}/lexiclash-vs-wordle`, title: 'LexiClash vs Wordle', subtitle: 'Unlimited play vs 1 puzzle/day' },
          { href: `/${locale}/best-online-word-games`, title: 'Best Word Games 2026', subtitle: 'Complete comparison guide' },
          { href: `/${locale}/play-boggle-online-free`, title: 'Play Boggle Online Free', subtitle: 'No download, instant play' },
        ]}
        finalCta={{
          title: 'Look, Just Try It',
          body: [
            "I'm not going to pretend LexiClash is perfect. But it does the one thing Scrabble GO forgot how to do: it lets you play a word game without constantly trying to sell you something. No interstitials ambushing you between rounds. No bots wearing human masks. No $9.99 booster that plays the game for you.",
            "Just your brain, a grid of letters, and someone real on the other side. It's free, it runs in your browser, and you'll know within one round whether it's for you.",
          ],
          href: `/${locale}/multiplayer`,
          label: 'Play LexiClash — No Interruptions, No Bots',
        }}
      />
    </>
  );
}
