// The blog post manifest: slug, hero and dates. Kept apart from the localized copy in
// data.ts so client code that only needs dates (BlogPostLayout) doesn't ship every title.

export interface BlogPost {
  slug: string;
  image: string;
  /** First published, YYYY-MM-DD. */
  date: string;
  /** Last substantive edit, YYYY-MM-DD. Feeds the JSON-LD, sitemaps, RSS and the visible "updated" line. */
  dateModified: string;
}

/** The named author every post already carries (AuthorBioCard, /about/ohad-fisher). */
export const BLOG_AUTHOR = {
  name: 'Ohad Fisher',
  url: 'https://www.lexiclash.live/en/about/ohad-fisher',
} as const;

export const blogPosts: BlogPost[] = [
  {
    slug: '10-surprising-benefits-word-games',
    image: '/images/blog/10-benefits.jpg',
    date: '2025-06-15',
    dateModified: '2026-05-19',
  },
  {
    slug: 'science-behind-word-games',
    image: '/images/blog/science-brain.jpg',
    date: '2025-07-03',
    dateModified: '2026-11-08',
  },
  {
    slug: 'daily-challenge-strategies',
    image: '/images/blog/daily-strategies.jpg',
    date: '2025-07-22',
    dateModified: '2026-02-15',
  },
  {
    slug: 'multilingual-word-learning',
    image: '/images/blog/multilingual.jpg',
    date: '2025-08-10',
    dateModified: '2026-05-19',
  },
  {
    slug: 'top-player-secrets',
    image: '/images/blog/top-secrets.jpg',
    date: '2025-08-28',
    dateModified: '2026-05-19',
  },
  {
    slug: 'improve-word-game-skills',
    image: '/images/blog/improve-skills.jpg',
    date: '2025-09-15',
    dateModified: '2026-05-19',
  },
  {
    slug: 'word-games-and-mental-health',
    image: '/images/blog/mental-health.jpg',
    date: '2025-10-05',
    dateModified: '2026-05-19',
  },
  {
    slug: 'hebrew-word-games-guide',
    image: '/images/blog/hebrew-word-games.jpg',
    date: '2025-10-24',
    dateModified: '2026-09-29',
  },
  {
    slug: 'why-word-games-are-addictive',
    image: '/images/blog/why-addictive.jpg',
    date: '2025-11-12',
    dateModified: '2026-05-19',
  },
  {
    slug: 'best-boggle-alternatives-2026',
    image: '/images/blog/boggle-alternatives.jpg',
    date: '2025-12-01',
    dateModified: '2026-11-04',
  },
  {
    slug: 'word-games-for-brain-training',
    image: '/images/blog/brain-training-words.jpg',
    date: '2025-12-20',
    dateModified: '2026-05-19',
  },
  {
    slug: 'word-game-history',
    image: '/images/blog/word-game-history.jpg',
    date: '2026-01-08',
    dateModified: '2026-05-19',
  },
  {
    slug: 'word-games-for-kids-education',
    image: '/images/blog/kids-education.jpg',
    date: '2026-01-27',
    dateModified: '2026-05-19',
  },
  {
    slug: 'multiplayer-word-games-social',
    image: '/images/blog/multiplayer-social.jpg',
    date: '2026-02-15',
    dateModified: '2026-05-19',
  },
  {
    slug: 'vocabulary-building-strategies',
    image: '/images/blog/vocabulary-building.jpg',
    date: '2026-03-05',
    dateModified: '2026-05-19',
  },
  {
    slug: 'boggle-vs-wordle',
    image: '/images/blog/boggle-vs-wordle.jpg',
    date: '2026-03-28',
    dateModified: '2026-05-19',
  },
  {
    slug: 'boggle-vs-scrabble',
    image: '/images/blog/boggle-vs-scrabble.jpg',
    date: '2026-03-28',
    dateModified: '2026-05-19',
  },
  {
    slug: 'boggle-vs-words-with-friends',
    image: '/images/blog/boggle-vs-wwf.jpg',
    date: '2026-03-28',
    dateModified: '2026-05-19',
  },
  {
    slug: 'netflix-word-game-2026-rise',
    image: '/images/blog/netflix-word-games.jpg',
    date: '2026-04-29',
    dateModified: '2026-05-19',
  },
  {
    slug: 'most-popular-word-games-2026',
    image: '/images/blog/most-popular-word-games-2026.jpg',
    date: '2026-05-15',
    dateModified: '2026-05-19',
  },
  {
    slug: 'free-word-games-online',
    image: '/images/blog/free-word-games-online.jpg',
    date: '2026-05-11',
    dateModified: '2026-05-11',
  },
  {
    slug: 'milat-hayom-habit',
    image: '/images/blog/milat-hayom-habit.jpg',
    date: '2026-05-11',
    dateModified: '2026-05-11',
  },
  {
    slug: 'mishachke-milim-chinuch',
    image: '/images/blog/mishachke-milim-chinuch.jpg',
    date: '2026-05-11',
    dateModified: '2026-05-11',
  },
  {
    slug: 'alternativas-a-scrabble',
    image: '/images/blog/alternativas-a-scrabble.jpg',
    date: '2026-05-11',
    dateModified: '2026-05-11',
  },
  {
    slug: 'juegos-palabras-gratis',
    image: '/images/blog/juegos-palabras-gratis.jpg',
    date: '2026-05-11',
    dateModified: '2026-05-11',
  },
  {
    slug: 'ordspel-familjer',
    image: '/images/blog/ordspel-familjer.jpg',
    date: '2026-05-11',
    dateModified: '2026-05-11',
  },
  {
    slug: 'multiplayer-strategy-guide',
    image: '/images/blog/strategy-tactics.jpg',
    date: '2026-08-03',
    dateModified: '2026-08-03',
  },
  {
    slug: 'leaderboard-elo-explained',
    image: '/images/blog/top-player-secrets.jpg',
    date: '2026-08-03',
    dateModified: '2026-08-03',
  },
  {
    slug: 'death-of-turn-based-word-games',
    // TODO-image: dedicated /images/blog/death-of-turn-based-word-games.jpg hero
    image: '/images/blog/multiplayer-social.jpg',
    date: '2026-09-12',
    dateModified: '2026-09-12',
  },
  {
    slug: 'ai-vs-word-games-language-learning',
    image: '/images/blog/multilingual.jpg',
    date: '2026-06-27',
    dateModified: '2026-06-27',
  },
  {
    slug: 'spelling-bee-science-vocabulary',
    image: '/images/blog/brain-health.jpg',
    date: '2026-06-27',
    dateModified: '2026-06-27',
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}
