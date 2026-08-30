import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';
import { ComparisonLanding } from '@/components/landing/comparison/ComparisonLanding';
import { englishComparisonRedirect } from '@/lib/comparison/enOnlyRedirect';
import { loadTranslation } from '@/translations/loadTranslation';
import { buildComparisonRows, WORDLE_ROW_DEFS } from '@/lib/comparison/comparisonTable';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isEnglish = locale === 'en';
  // Body is English-only. Non-English routes exist only because of the [locale] dynamic segment.
  // Canonical must always point to the English URL to avoid cross-locale duplicate-content flags.
  const pageUrl = `${BASE_URL}/en/lexiclash-vs-wordle`;

  return {
    title: 'Wordle vs LexiClash 2026 — I Played Both Daily, Here\'s My Verdict',
    description: 'I played Wordle and LexiClash side-by-side for 30 days. Wordle: 1 puzzle, 6 guesses, done in 90 seconds. LexiClash: unlimited rounds, multiplayer, 6 languages, adventure mode. Honest comparison from someone who used to be a Wordle purist.',
    keywords: 'lexiclash vs wordle, wordle alternative, wordle multiplayer, word games like wordle, wordle with friends, unlimited wordle, best word games 2026, wordle vs boggle, word game comparison',
    openGraph: {
      title: 'LexiClash vs Wordle — Full Comparison 2026',
      description: 'One puzzle a day or unlimited word battles? Compare features, gameplay, and why players are switching.',
      locale: 'en_US',
      type: 'website',
      url: pageUrl,
      images: [{ url: `${BASE_URL}/og-image-en.webp`, width: 1200, height: 630, alt: 'LexiClash vs Wordle Comparison' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'LexiClash vs Wordle — Which Is Better?',
      description: 'One puzzle a day or unlimited word battles? Full comparison inside.',
      images: [`${BASE_URL}/og-image-en.webp`],
    },
    alternates: {
      canonical: pageUrl,
      languages: {
        'x-default': `${BASE_URL}/en/lexiclash-vs-wordle`,
        en: `${BASE_URL}/en/lexiclash-vs-wordle`,
        he: `${BASE_URL}/he/lexiclash-neged-wordle`,
        es: `${BASE_URL}/es/lexiclash-contra-wordle`,
      },
    },
    // Only English body exists; noindex non-en routes so crawler treats /en/ as the single indexable version.
    robots: { index: isEnglish, follow: true },
  };
}

// Static FAQ data — all values are hardcoded string literals, safe for JSON-LD serialization
const faqs = [
  {
    q: 'Is LexiClash like Wordle?',
    a: 'Honestly, not really — they just both involve words. Wordle gives you six tries to guess a single 5-letter word using color-coded clues. LexiClash drops you onto a grid of letters and says "go find every word you can, as fast as you can." You can play solo, against bots, or live against friends. Totally different energy.',
  },
  {
    q: 'Can I play LexiClash more than once a day?',
    a: `As many times as you want. That's kind of the whole point. Solo rounds, multiplayer lobbies, adventure mode, brain training drills, daily challenges — there's no artificial limit. Wordle's one-a-day thing is charming, but sometimes you just want to keep playing.`,
  },
  {
    q: 'Does LexiClash have multiplayer?',
    a: `Yep — real-time, same board, same timer, 2 to 20+ players. You make a room, share a link, and everyone races to find words simultaneously. It gets loud. Wordle is strictly a solo experience (sharing your colored squares on Twitter doesn't count).`,
  },
  {
    q: 'Is LexiClash actually free?',
    a: 'Completely. No account required, no app to download, no subscription. Wordle is technically free too, but it lives inside the NYT Games bundle now ($40/year for the full suite). LexiClash has no paywall and never will.',
  },
  {
    q: 'Which one is better for brain training?',
    a: `Wordle trains your deductive reasoning once a day, and it's genuinely good at that. LexiClash gives you five dedicated drill modes (Memory Hunt, Combo Master, Lightning Round, Pattern Switcher, Rare Gems) plus a full adventure mode with boss fights. If you want variety and volume in your daily brain workout, LexiClash has more to offer.`,
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

export default async function LexiClashVsWordlePage({ params }: PageProps) {
  const { locale } = await params;

  const redirect = englishComparisonRedirect(locale, 'lexiclash-vs-wordle');
  if (redirect) permanentRedirect(redirect);

  const trans = await loadTranslation(locale as any) as Record<string, any>;
  const vs = (trans.vs || trans.comparison || {}) as Record<string, string>;
  const featureLabel = vs.feature || 'Feature';

  return (
    <>
      {/* Static JSON-LD for FAQ rich results — hardcoded content only, no user input */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: faqJsonLd }}
      />

      <ComparisonLanding
        locale={locale}
        h1="Wordle Is Brilliant. LexiClash Is What You Play After."
        intro={[
          'Let’s get this out of the way: Wordle is a masterpiece of game design. One puzzle, five letters, six tries, done. It turned the entire internet into word nerds and that rules. But if you’ve ever finished your daily Wordle at 8:03 AM and thought "now what?" — that’s where LexiClash comes in. Unlimited rounds, live multiplayer, a full adventure mode with boss fights, and support for six languages. Same word-game brain, completely different animal.',
        ]}
        quickCtas={[
          { href: `/${locale}/singleplayer`, label: 'Try LexiClash Free', variant: 'lime' },
          { href: `/${locale}/daily`, label: 'Daily Challenge', variant: 'cyan' },
          { href: `/${locale}/multiplayer`, label: 'Play With Friends', variant: 'pink' },
        ]}
        competitorName="Wordle"
        comparisonRows={buildComparisonRows(vs, WORDLE_ROW_DEFS)}
        featureLabel={featureLabel}
        featuresTitle={vs.whatLexiDoes || "What LexiClash Does That Wordle Doesn't"}
        features={[
          { title: 'You Can Actually Keep Playing', desc: 'Wordle gives you one puzzle and says "see you tomorrow." LexiClash has no limit. Solo, multiplayer, adventure mode — play for five minutes or five hours.' },
          { title: 'Multiplayer That Gets Competitive', desc: 'Same board, same timer, everyone racing at once. It turns out word games are way more fun when you can watch your friend panic in real time.' },
          { title: 'A Different Kind of Word Brain', desc: 'Wordle is logic and elimination — genuinely satisfying. LexiClash is pattern recognition and speed. You’re scanning a grid, chaining letters, finding words your brain didn’t know it knew.' },
          { title: 'A Whole Adventure Mode', desc: '100+ levels across 10 worlds, each with a boss that has unique mechanics. Upgrades, loot, progression. It’s a word game with an actual campaign, which sounds absurd until you’re hooked.' },
          { title: 'Play in Your Language', desc: 'English, Hebrew, Swedish, Japanese, and Spanish. Each language has its own dictionary and grid generation. Wordle is English-only (though fan-made clones exist for other languages).' },
          { title: 'No Subscription Creep', desc: 'Wordle got absorbed into the NYT Games bundle — still playable free, but the upsell is always there. LexiClash is free, no account needed, no "unlock premium" popups. Ever.' },
        ]}
        featuresStyle="positive"
        faqs={faqs}
        moreComparisons={[
          { href: `/${locale}/lexiclash-vs-scrabble`, title: 'LexiClash vs Scrabble GO', subtitle: 'No pay-to-win, no bots, real players' },
          { href: `/${locale}/best-online-word-games`, title: 'Best Word Games 2026', subtitle: 'Complete comparison guide' },
          { href: `/${locale}/play-boggle-online-free`, title: 'Play Boggle Online Free', subtitle: 'No download, instant play' },
        ]}
        finalCta={{
          title: 'Look, Just Try It',
          body: [
            'If you love Wordle, you’ll probably love this too — it scratches the same part of your brain but lets you keep scratching. No download, no signup, no credit card. Open the link, pick a mode, start finding words. You’ll know within 30 seconds if it’s your thing.',
          ],
          href: `/${locale}/singleplayer`,
          label: 'Play LexiClash Free Now',
        }}
      />
    </>
  );
}
