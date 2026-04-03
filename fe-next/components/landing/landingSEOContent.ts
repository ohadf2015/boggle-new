/* ── Static SEO content for the landing page bottom section ──
 *
 * This file uses the `contentByLocale` pattern so that all text is
 * available at import-time and included in the server-rendered HTML.
 * Google's crawler can index it — unlike `t()` from LanguageContext
 * which only resolves on the client.
 */

export interface LandingSEOContent {
  whatIsTitle: string;
  whatIsContent: string;
  whatIsShort: string;
  featuresTitle: string;
  gameModes: {
    title: string;
    tag: string;
    description: string;
  }[];
  howToPlayTitle: string;
  steps: string[];
  highlights: string[];
  whoCanPlayTitle: string;
  whoCanPlayCards: { label: string; detail: string }[];
  gameModesTitle: string;
  gameModesDetails: { title: string; content: string }[];
  educationTitle: string;
  educationContent: string;
  educationStats: { value: string; label: string }[];
  communityStats: { value: string; label: string }[];
  faqTitle: string;
  faq: { question: string; answer: string }[];
  communityTitle: string;
  communityContent: string;
  blogTitle: string;
  viewAllPosts: string;
  blogLinks: { slug: string; title: string; category: string }[];
}

const en: LandingSEOContent = {
  whatIsTitle: 'What is LexiClash?',
  whatIsContent:
    'LexiClash is a free, fast-paced multiplayer word game you can play right in your browser. Compete with friends in real-time word battles on a shared letter grid — find words, build combos, and climb the leaderboard. It\'s like Boggle meets Wordle, but multiplayer. No downloads, no sign-ups required. Available in English, Hebrew, Swedish, Japanese, and Spanish.',
  whatIsShort:
    'Free multiplayer word battles in your browser. Find words, build combos, crush your friends. No downloads, no signup.',
  featuresTitle: 'Why Players Love LexiClash',
  gameModes: [
    {
      title: 'Real-Time Multiplayer',
      tag: '2-20 players',
      description:
        'Compete head-to-head with 2-20 players simultaneously. Create a room, share the code, and play instantly.',
    },
    {
      title: 'Daily Challenges',
      tag: 'New puzzle daily',
      description:
        'Same puzzle for everyone worldwide, every day. Track your streak and share emoji results — just like Wordle.',
    },
    {
      title: 'Adventure Mode',
      tag: '100 levels',
      description:
        '100 levels across 10 themed worlds. Special tiles, boss battles, and power-ups keep every round fresh.',
    },
    {
      title: 'Blast Mode',
      tag: 'Chain reactions',
      description:
        'Clear tiles in explosive chain reactions. Build combos, trigger cascades, and race against the clock.',
    },
    {
      title: 'Community Boards',
      tag: 'Player-made puzzles',
      description:
        'Design custom letter grids with your own seed words. Publish them for others to play, rate, and compete on.',
    },
  ],
  howToPlayTitle: 'How to Play',
  steps: [
    'Create or join a game room',
    'Swipe adjacent letters to form words',
    'Build combos for bonus points',
    'Score the most points to win!',
  ],
  highlights: [
    'Any device, any browser',
    'Ages 6+',
    'Used in classrooms',
    'No signup needed',
  ],
  whoCanPlayTitle: 'Who Can Play?',
  whoCanPlayCards: [
    { label: 'Any Device', detail: 'Phones, tablets, laptops, desktops — any modern browser, no app download needed.' },
    { label: 'Ages 6+', detail: 'Child-safety features built in. COPPA compliant with non-personalized ads for younger players.' },
    { label: 'Classrooms', detail: 'Teachers run multiplayer word battles as vocabulary drills. Used in schools across three continents.' },
    { label: 'Friend Groups', detail: 'Host a party game with up to 20 players. Share a room code and compete in real-time.' },
  ],
  gameModesTitle: 'Game Modes Explained',
  gameModesDetails: [
    {
      title: 'Multiplayer Rooms',
      content:
        'Create a private room and share the code with up to 20 friends. Everyone sees the same letter grid and races to find words before time runs out. The player with the highest score wins. Perfect for parties, classrooms, and remote team-building.',
    },
    {
      title: 'Single Player vs. Bots',
      content:
        'Practice your word-finding skills against AI opponents of varying difficulty. Set personal records, earn achievements, and sharpen your strategy without the pressure of live competition.',
    },
    {
      title: 'Daily Challenge',
      content:
        'A fresh puzzle every day, identical for all players worldwide. Complete it to maintain your streak and compare your score with the global community. Share your results with emoji grids, just like Wordle.',
    },
    {
      title: 'Adventure Mode',
      content:
        'Journey through 10 themed worlds with 100 levels of increasing difficulty. Encounter special tile types like ice, fire, bombs, and rainbow tiles. Defeat bosses using word power and unlock new worlds as you progress.',
    },
  ],
  educationTitle: 'Built for Learning',
  educationContent:
    'Word games are one of the most effective ways to build vocabulary and improve spelling. Research published in AIMS Neuroscience shows that word puzzles activate multiple brain regions simultaneously — including areas responsible for language processing, working memory, and executive function. LexiClash takes this further by offering gameplay in five languages, making it a practical tool for language learners. Teachers use LexiClash in classrooms across three continents to make vocabulary drills engaging. The multiplayer format creates healthy competition that motivates students to expand their word knowledge naturally.',
  educationStats: [
    { value: '5', label: 'Languages' },
    { value: '3', label: 'Continents' },
    { value: '100+', label: 'Levels' },
  ],
  faqTitle: 'Frequently Asked Questions',
  faq: [
    {
      question: 'Is LexiClash really free?',
      answer:
        'Yes, completely free. No hidden paywalls, no premium subscriptions. We sustain the game through non-intrusive advertising that respects your privacy.',
    },
    {
      question: 'Do I need to create an account?',
      answer:
        'No. You can play as a guest instantly. Creating an account (via Google or Discord) unlocks features like leaderboard rankings, achievement tracking, and progress saving across devices.',
    },
    {
      question: 'What languages are supported?',
      answer:
        'LexiClash supports English, Hebrew, Swedish, Japanese, and Spanish. Each language has its own curated dictionary, daily challenges, and leaderboards. You can switch languages anytime from the settings menu.',
    },
    {
      question: 'Can I play on my phone?',
      answer:
        'Absolutely. LexiClash is fully responsive and works on any modern mobile browser. Swipe letters to form words — the touch controls are designed specifically for mobile play.',
    },
    {
      question: 'Is it safe for children?',
      answer:
        'Yes. LexiClash is designed for players ages 6 and up. We comply with COPPA regulations, serve only non-personalized ads, and do not track children\'s browsing behavior.',
    },
    {
      question: 'Can I create my own board?',
      answer:
        'Yes! Use the Community Board Builder to design custom letter grids with your own seed words. Publish them for others to play, rate, and compete on. Top boards get featured on the home page.',
    },
  ],
  communityStats: [
    { value: '40+', label: 'Countries' },
    { value: '5', label: 'Languages' },
    { value: '∞', label: 'Words to Find' },
  ],
  communityTitle: 'Join Thousands of Word Game Enthusiasts',
  communityContent:
    'LexiClash players span over 40 countries and five languages. Join the community to compete on global leaderboards, share daily challenge results, and discover new word strategies. Follow us on Instagram @lexi.clash for tips, updates, and community highlights.',
  blogTitle: 'From Our Blog',
  viewAllPosts: 'View all posts →',
  blogLinks: [
    {
      slug: 'science-behind-word-games',
      title: 'The Science Behind Word Games',
      category: 'Science',
    },
    {
      slug: 'why-word-games-are-addictive',
      title: 'Why Word Games Are So Addictive',
      category: 'Psychology',
    },
    {
      slug: 'daily-challenge-strategies',
      title: 'Daily Challenge Strategies',
      category: 'Strategy',
    },
  ],
};

export const contentByLocale: Record<string, LandingSEOContent> = {
  en,
};
