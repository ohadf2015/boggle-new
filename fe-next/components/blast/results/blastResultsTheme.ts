import type { BlastOutcomeTier, BlastStatId } from './blastResultsViewModel';

const ASSET_DIR = '/blast/results';

export const BLAST_RESULT_ASSETS = {
  coin: `${ASSET_DIR}/coin-stack.webp`,
  diamond: `${ASSET_DIR}/diamond.webp`,
  bomb: `${ASSET_DIR}/bomb.webp`,
  medal: `${ASSET_DIR}/medal.webp`,
  confetti: `${ASSET_DIR}/confetti.webp`,
} as const;

interface TierTheme {
  mascot: string;
  headlineKey: string;
  headline: string;
  frame: string;
  glow: string;
}

export const TIER_THEME: Record<BlastOutcomeTier, TierTheme> = {
  low: {
    mascot: `${ASSET_DIR}/mascot-sad.webp`,
    headlineKey: 'blast.results.reveal.headlineLow',
    headline: 'text-neo-pink',
    frame: 'border-neo-pink',
    glow: 'bg-neo-pink/15',
  },
  mid: {
    mascot: `${ASSET_DIR}/mascot-neutral.webp`,
    headlineKey: 'blast.results.reveal.headlineMid',
    headline: 'text-neo-cyan',
    frame: 'border-neo-cyan',
    glow: 'bg-neo-cyan/15',
  },
  high: {
    mascot: `${ASSET_DIR}/mascot-celebrate.webp`,
    headlineKey: 'blast.results.reveal.headlineHigh',
    headline: 'text-neo-lime',
    frame: 'border-neo-lime',
    glow: 'bg-neo-lime/15',
  },
  newBest: {
    mascot: `${ASSET_DIR}/mascot-celebrate.webp`,
    headlineKey: 'blast.results.reveal.headlineNewBest',
    headline: 'text-neo-yellow',
    frame: 'border-neo-yellow',
    glow: 'bg-neo-yellow/20',
  },
};

export const STAT_STYLE: Record<BlastStatId, { image?: string; accent: string }> = {
  coins: { image: BLAST_RESULT_ASSETS.coin, accent: 'text-neo-yellow' },
  diamonds: { image: BLAST_RESULT_ASSETS.diamond, accent: 'text-neo-cyan' },
  bombs: { image: BLAST_RESULT_ASSETS.bomb, accent: 'text-neo-pink' },
  combo: { accent: 'text-neo-orange' },
  words: { accent: 'text-neo-lime' },
  waves: { accent: 'text-neo-purple' },
};
