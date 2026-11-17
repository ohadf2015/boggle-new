import type { ConnectionsLandingCopy } from './content.types';

export const EN_COPY: ConnectionsLandingCopy = {
  metaTitle: 'Missing Link Word Game: Compound Word Puzzles | LexiClash',
  metaDescription:
    'Free missing link word game. Find the word that joins two others: BOOK + ? + HOLE makes bookworm and wormhole. Daily set, hundreds of levels, no signup.',
  metaKeywords:
    'missing link word game, missing link puzzle, compound word puzzle, compound word game for adults, word association game online, word bridge, missing link puzzles with answers',
  ogTitle: 'Missing Link Word Game: find the word in the middle',
  ogDescription:
    'BOOK + ? + HOLE. One word makes bookworm and wormhole. Free compound word puzzles in your browser.',
  twitterTitle: 'Missing Link Word Game, free online',
  twitterDescription: 'BOOK + ? + HOLE. Which word fits both? Free compound word puzzles.',
  badge: 'FREE • NO SIGNUP',
  h1Pre: 'The missing link word game',
  h1Highlight: 'Find the word in the middle',
  h1Sub: 'Word Bridge: compound word puzzles you play in your browser',
  introP1:
    'You get two words with a gap between them. Fill the gap with one word that makes a real compound on both sides. BOOK and HOLE? WORM, because bookworm and wormhole are both words. GOLD and POND? FISH.',
  introP2:
    'Some links jump out at you and some take a minute of staring. There’s a new set of five every day and a long run of levels that slowly get harder, plus a hint for when you’re stuck. It’s free, and you don’t need an account.',
  ctaPrimary: 'Play free',
  ctaSecondary: 'How to play ↓',
  demo: {
    label: 'Try one: tap the middle slot',
    puzzle: { word1: 'BOOK', word2: 'HOLE', bridge: 'WORM', difficulty: 'easy' },
    reveal: 'Reveal the link',
    success: 'Bookworm and wormhole!',
  },
  howTo: {
    heading: 'How to play',
    steps: [
      'Read the two words. The answer goes between them, so it has to follow the first word and come before the second.',
      'Type the missing word. It must make a real compound or phrase with both sides, like sun + flower and flower + pot.',
      'Stuck? Take the hint for a nudge. In levels a wrong guess costs a life, and solving a puzzle opens the next one.',
    ],
    examplesLabel: 'Three solved examples',
    examples: [
      { word1: 'SUN', bridge: 'FLOWER', word2: 'POT', left: 'sunflower', right: 'flowerpot' },
      { word1: 'PASS', bridge: 'WORD', word2: 'PLAY', left: 'password', right: 'wordplay' },
      { word1: 'FIRE', bridge: 'FLY', word2: 'WHEEL', left: 'firefly', right: 'flywheel' },
    ],
  },
  samples: {
    heading: 'Now you try',
    sub: 'Tap a card to check your answer',
    revealLabel: 'Tap to reveal',
    difficultyLabels: { easy: 'Easy', medium: 'Medium', hard: 'Hard' },
    items: [
      { word1: 'GOLD', word2: 'POND', bridge: 'FISH', difficulty: 'easy' },
      { word1: 'WIND', word2: 'STONE', bridge: 'MILL', difficulty: 'medium' },
      { word1: 'UNDER', word2: 'NUT', bridge: 'GROUND', difficulty: 'hard' },
    ],
  },
  modes: {
    heading: 'Ways to play',
    items: [
      {
        key: 'daily',
        title: 'Daily challenge',
        body: 'Five puzzles a day, the same for everyone, from easy to hard. Come back tomorrow for a new set.',
      },
      {
        key: 'play',
        title: 'Levels',
        body: 'Hundreds of puzzles in a row. You have three lives, and a lost life comes back after 20 minutes.',
      },
      {
        key: 'pyramid',
        title: 'Pyramid',
        body: 'Solve three links, then find the one word that goes with all three answers.',
      },
      {
        key: 'community',
        title: 'Community puzzles',
        body: 'Puzzles written by other players. Vote on the good ones or send in your own.',
      },
    ],
  },
  why: {
    heading: 'Why people keep coming back',
    cards: [
      {
        title: 'Quick to start',
        body: 'Most puzzles take under a minute, so the daily five fit easily into a bus ride.',
      },
      {
        title: 'You learn words without trying',
        body: 'Give it a few rounds and you start spotting compounds on shop signs and in headlines.',
      },
      {
        title: 'The answer feels obvious after',
        body: 'The good ones sit in plain sight, and you kick yourself a little when you finally see them.',
      },
    ],
  },
  heClassic: null,
  compare: {
    heading: 'How it compares',
    sub: 'Same shelf as the daily word games you know, different puzzle',
    columns: ['Game', 'What you do', 'Time', 'Skill'],
    rows: [
      {
        name: 'Word Bridge (this game)',
        doing: 'Find the word that joins two others into compounds',
        length: 'Under a minute per puzzle',
        skill: 'Vocabulary, compounds',
      },
      {
        name: 'NYT Connections',
        doing: 'Sort 16 words into 4 groups',
        length: '5–15 min',
        skill: 'Categories',
      },
      {
        name: 'Wordle',
        doing: 'Guess one 5-letter word in 6 tries',
        length: '3–5 min',
        skill: 'Letter logic',
      },
      {
        name: 'Crossword',
        doing: 'Fill a grid from clues',
        length: '10–60 min',
        skill: 'Trivia, spelling',
      },
    ],
  },
  faq: {
    heading: 'Questions people ask',
    items: [
      {
        q: 'What is a missing link word game?',
        a: 'You see two words and look for a third that fits between them. The answer has to form a word or phrase with the first word and another with the second. TOUCH ? POUR is DOWN: touchdown and downpour.',
      },
      {
        q: 'Is this a compound word puzzle?',
        a: 'Yes. Almost every answer builds two compound words, like bookworm and wormhole. That makes it good practice for compound words, and it works fine for adults too.',
      },
      {
        q: 'Is it the same as NYT Connections?',
        a: 'No. In NYT Connections you sort 16 words into four groups. Here you get two words and find the one word that links them.',
      },
      {
        q: 'Is it free, and do I need an account?',
        a: 'Yes, it’s free. You can start playing right away without signing up or downloading anything.',
      },
      {
        q: 'How do hints work?',
        a: 'You get one free hint a day. A hint is a short clue about the missing word, never the word itself.',
      },
      {
        q: 'Where do I find the answers?',
        a: 'Inside the game. In the daily challenge you get four guesses per puzzle, and if they run out the answer is shown before you move on.',
      },
      {
        q: 'Can I play in other languages?',
        a: 'Yes. There are separate puzzle sets written for Hebrew, Spanish, Russian, Japanese, and Swedish. Switch the language and you get puzzles built from that language’s own words.',
      },
    ],
  },
  footerCta: {
    heading: 'Ready for today’s five?',
    body: 'Free, in your browser, no download.',
    button: 'Start playing',
  },
  videoGameName: 'Word Bridge (missing link word game)',
  videoGameDescription:
    'A free missing link word game. Each puzzle shows two words, and the player finds the one word that forms a compound with both, such as BOOK + WORM + HOLE. Includes a daily challenge, levels, a pyramid mode, and community puzzles.',
};
