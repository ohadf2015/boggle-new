export const DAILY_WORD_WHEEL_CANONICAL =
  'https://www.lexiclash.live/en/daily-word-wheel';

export const DAILY_WORD_WHEEL_PLAY_URL =
  'https://www.lexiclash.live/en/daily/word-wheel';

/** English-only citability copy. First 60 words must answer the query. */
export const dailyWordWheelEn = {
  h1: 'Play Daily Word Wheel',
  lead:
    'Form words of 3 letters or more from the wheel. Every word must include the center letter. Each letter can be used at most once. Find the nine-letter word that uses every letter. A new Daily Word Wheel is the same puzzle for everyone each day.',
  rulesHeading: 'Daily Word Wheel rules',
  rules: [
    'Words must be 3 letters or more.',
    'Every word must include the center letter of the wheel.',
    'Each letter can be used at most once per word.',
    'A new wheel appears every day at midnight UTC — everyone gets the same letters.',
    'Longer words score more. The word wheel daily record is the top score on that day’s global leaderboard.',
  ],
  stepsHeading: 'How to play the Daily Word Wheel',
  steps: [
    {
      step: '1',
      title: 'Read the wheel',
      desc: 'Look at the rim letters and the required center letter.',
    },
    {
      step: '2',
      title: 'Form a word',
      desc: 'Make a word of 3 or more letters that includes the center letter. Use each letter at most once.',
    },
    {
      step: '3',
      title: 'Hunt the pangram',
      desc: 'Find the nine-letter word that uses every letter on the wheel.',
    },
    {
      step: '4',
      title: 'Beat the daily record',
      desc: 'Score as many words as you can before time runs out. The top score is today’s word wheel daily record.',
    },
  ],
  faqHeading: 'Frequently asked questions',
  faqs: [
    {
      q: 'How do I play the Daily Word Wheel?',
      a: 'Form words of 3 letters or more from the letters on the wheel. Every word must include the center letter, and each letter can be used at most once. A new puzzle is shared worldwide each day.',
    },
    {
      q: 'What are the Daily Word Wheel rules?',
      a: 'Minimum 3 letters, must use the center letter, each letter at most once per word. Longer words score more. The same wheel is live for everyone until midnight UTC.',
    },
    {
      q: 'What is the word wheel daily record?',
      a: 'The word wheel daily record is the highest score on that day’s global leaderboard — everyone plays the same letters, so the top score is a true daily record.',
    },
    {
      q: 'Is the Daily Word Wheel free?',
      a: 'Yes. Play in the browser with no download and no signup. Open today’s wheel and start finding words.',
    },
    {
      q: 'How is this different from other word wheels?',
      a: 'LexiClash Daily Word Wheel is a free browser puzzle with a shared daily letter set, a live leaderboard for the daily record, and no app install.',
    },
  ],
  cta: "Play today’s Word Wheel",
  leaderboard: 'View the daily record',
  finalHeading: "Play today’s puzzle",
  finalDescription:
    'The Daily Word Wheel resets every day. Build a streak and chase the word wheel daily record.',
  finalButton: 'Play Daily Word Wheel now',
  metaTitle: 'Play Daily Word Wheel — Free Daily Letter Puzzle | LexiClash',
  metaDescription:
    'Form words of 3+ letters from the wheel. Every word must use the center letter. Free daily puzzle, same letters worldwide, live daily record. No signup.',
} as const;

export function leadWordCount(lead: string = dailyWordWheelEn.lead): number {
  return lead.trim().split(/\s+/).filter(Boolean).length;
}

export type JsonLdBlock = Record<string, unknown>;

export function buildDailyWordWheelJsonLd(): JsonLdBlock[] {
  const copy = dailyWordWheelEn;
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: copy.faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.q,
        acceptedAnswer: { '@type': 'Answer', text: faq.a },
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: copy.stepsHeading,
      description: copy.lead,
      totalTime: 'PT5M',
      step: copy.steps.map((s, i) => ({
        '@type': 'HowToStep',
        position: i + 1,
        name: s.title,
        text: s.desc,
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'LexiClash Daily Word Wheel',
      url: DAILY_WORD_WHEEL_CANONICAL,
      applicationCategory: 'GameApplication',
      operatingSystem: 'Any',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'LexiClash',
          item: 'https://www.lexiclash.live/en',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: copy.h1,
          item: DAILY_WORD_WHEEL_CANONICAL,
        },
      ],
    },
  ];
}
