// Content for /word-craft-landing — the fun, easy marketing page for WordCraft
// (the game itself lives at /word-craft). EN is the indexed, canonical copy;
// other locales render the same body but are noindexed (hreflang → EN), matching
// the /education/for-schools + comparison-page pattern. Voice is party-energy and
// playful — NOT the corporate for-schools register. Every CTA funnels to the game.

export const WORDCRAFT_LANDING_LOCALES = ['en', 'he', 'sv', 'ja', 'es'] as const;
export type WordCraftLandingLocale = (typeof WORDCRAFT_LANDING_LOCALES)[number];

/** Marketing route — distinct from the playable game at /word-craft. */
export const WORDCRAFT_LANDING_PATH = '/word-craft-landing';
/** Where every CTA sends the player: the actual game. */
export const WORDCRAFT_GAME_PATH = '/word-craft';

export interface WordCraftLandingFaq {
  q: string;
  a: string;
}

export interface WordCraftLandingContent {
  metaTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  heroTag: string;
  heroH1: string;
  heroHighlight: string;
  heroSubtitle: string;
  playCta: string;
  secondaryCta: string;
  stepsTitle: string;
  steps: { n: string; title: string; body: string }[];
  featuresTitle: string;
  features: { emoji: string; title: string; body: string }[];
  duelTitle: string;
  duelBody: string;
  duelCta: string;
  faqTitle: string;
  faqs: WordCraftLandingFaq[];
  closingTitle: string;
  closingCta: string;
}

const EN: WordCraftLandingContent = {
  metaTitle: 'WordCraft — Free Word Strategy Game You Can Beat (and Battle Friends)',
  metaDescription:
    'WordCraft is a fast, friendly word-strategy game: drop tiles, claim territory, out-word a beatable bot — or challenge a friend to the exact same board with one link. Free, no download, 5 languages including Hebrew.',
  ogTitle: 'WordCraft — drop tiles, claim territory, beat your friends',
  ogDescription:
    'A bite-size word-battle game that is actually fun and actually beatable. Play free in your browser, then challenge a friend to the identical board with a single link.',
  heroTag: 'Word Battles · No Download',
  heroH1: 'Build words. Claim turf.',
  heroHighlight: 'Crush your friends.',
  heroSubtitle:
    'WordCraft is the word game you can actually win. Drop letter tiles onto the grid, capture colored territory, and out-think a bot that finally plays fair — then send one link and battle a friend on the exact same board. Free, instant, and ready for your phone or the big party screen.',
  playCta: 'Play free now',
  secondaryCta: 'How it works',
  stepsTitle: 'Easy to start, hard to put down',
  steps: [
    { n: '1', title: 'Drag your tiles', body: 'Pull letters from your rack onto the grid to spell a word. If it connects and it’s real, it scores. That’s the whole rule.' },
    { n: '2', title: 'Claim the territory', body: 'Words you build flip the colored squares under them to your side. Control the board, not just the dictionary.' },
    { n: '3', title: 'Out-word your rival', body: 'Trade turns with a friendly bot (set it as easy as you like) or a friend on the same board. Highest score when the bag runs dry wins.' },
  ],
  featuresTitle: 'Why WordCraft is a good time',
  features: [
    { emoji: '🎯', title: 'A bot you can beat', body: 'The opponent is tuned to be fun, not brutal. On Easy it plays short, human words — you’ll win and feel smart doing it. Crank it up only when you’re ready.' },
    { emoji: '🟩', title: 'Territory, not just points', body: 'Capturing colored squares adds a tug-of-war layer on top of word scoring. Comebacks are real and last-word steals feel amazing.' },
    { emoji: '🔗', title: '1v1 on one link', body: 'Hit Challenge a Friend and you get a link that drops them onto the identical board. No accounts, no lobby, no waiting — just bragging rights.' },
    { emoji: '🌍', title: '5 languages', body: 'English, Hebrew (full right-to-left), Spanish, Swedish and Japanese, each with its own real dictionary.' },
    { emoji: '📱', title: 'Phone or party screen', body: 'Plays great solo on a phone and looks great cast to a TV for pass-and-play with the room.' },
    { emoji: '⚡', title: 'Zero setup', body: 'No download, no sign-up wall. Open it and you’re placing tiles in seconds.' },
  ],
  duelTitle: 'Same board. No backend. Pure bragging rights.',
  duelBody:
    'Finish a game, tap Challenge a Friend, and WordCraft bakes your exact board — size, tiles and all — into a single shareable link. Your friend plays the identical puzzle and the game shows you who actually won. It’s Wordle-share energy for a full word battle.',
  duelCta: 'Start a game to challenge a friend',
  faqTitle: 'Quick questions',
  faqs: [
    { q: 'Is WordCraft free?', a: 'Yes — completely free to play in your browser, no download and no account required. Just open it and start placing tiles.' },
    { q: 'Is it hard? I’m not a word-game person.', a: 'It’s built to be easy to win. The default bot plays short, beatable words, the rules are “spell a real word, score points,” and there’s a one-time tutorial. You can raise the difficulty whenever you want a real fight.' },
    { q: 'How do I play a friend?', a: 'Tap Challenge a Friend and share the link it copies. Your friend opens it and plays the exact same board you did — same grid, same tiles — then the result compares your scores. No sign-up, no lobby.' },
    { q: 'How is WordCraft different from Scrabble?', a: 'You still build words from letter tiles, but WordCraft adds territory capture (your words flip colored squares to your side), tighter bags so games end in minutes, a difficulty-tunable bot, and one-link friend duels.' },
    { q: 'What languages does it support?', a: 'Five: English, Hebrew with full right-to-left support, Spanish, Swedish and Japanese — each with a native dictionary, not a translation.' },
    { q: 'Can I play on my phone or a TV?', a: 'Both. WordCraft is designed for phones and also looks great on a big party screen for pass-and-play with friends in the room.' },
  ],
  closingTitle: 'Your board is waiting.',
  closingCta: 'Play WordCraft free',
};

export function getWordCraftLandingContent(_locale: string): WordCraftLandingContent {
  // EN is the indexed, canonical copy; non-EN routes render the same body but are
  // noindexed (hreflang → EN). The game UI itself is fully localized via t().
  return EN;
}

/**
 * Build the structured data (JSON-LD) for the landing page. Pure + exported so
 * it can be unit-tested without rendering through next/script (which doesn't
 * emit inline content in jsdom). VideoGame + FAQPage feed AI/search visibility.
 */
export function buildWordCraftLandingJsonLd(locale: string, baseUrl: string) {
  const c = getWordCraftLandingContent(locale);
  const pageUrl = `${baseUrl}/${locale}${WORDCRAFT_LANDING_PATH}`;
  return {
    game: {
      '@context': 'https://schema.org',
      '@type': 'VideoGame',
      '@id': `${pageUrl}#game`,
      name: 'WordCraft',
      url: pageUrl,
      description: c.metaDescription,
      genre: ['Word game', 'Strategy', 'Puzzle'],
      gamePlatform: ['Web browser', 'Android'],
      playMode: ['SinglePlayer', 'MultiPlayer'],
      inLanguage: ['en', 'he', 'es', 'sv', 'ja'],
      applicationCategory: 'GameApplication',
      operatingSystem: 'Any',
      offers: { '@type': 'Offer', price: 0, priceCurrency: 'USD', availability: 'https://schema.org/InStock' },
      publisher: { '@type': 'Organization', name: 'LexiClash', url: baseUrl },
    },
    faq: {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      '@id': `${pageUrl}#faq`,
      mainEntity: c.faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    },
    breadcrumb: {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${baseUrl}/${locale}` },
        { '@type': 'ListItem', position: 2, name: 'WordCraft', item: pageUrl },
      ],
    },
  };
}
