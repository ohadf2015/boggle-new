export type TitleTier = {
  key: string;
  minScore: number;
  accent: 'purple' | 'cyan' | 'lime' | 'pink' | 'yellow';
};

const TIERS: TitleTier[] = [
  { key: 'wordling', minScore: 0, accent: 'purple' },
  { key: 'wordHunter', minScore: 31, accent: 'cyan' },
  { key: 'wordsmith', minScore: 81, accent: 'lime' },
  { key: 'wordSlayer', minScore: 151, accent: 'pink' },
  { key: 'wordLegend', minScore: 251, accent: 'yellow' },
];

export function getTitleTier(score: number): TitleTier {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (score >= TIERS[i].minScore) return TIERS[i];
  }
  return TIERS[0];
}

export function computeGoldReward(score: number): number {
  return Math.max(10, Math.round(score * 0.4));
}
