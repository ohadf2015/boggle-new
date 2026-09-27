// Punchy, party-energy interjections shown before the score (e.g. "SLICK +18").
// Tier 2 = good word (understated), Tier 3 = big word (loud, celebratory).
// Kept onomatopoeic/universal so they read across languages on a party screen.
export const HYPE_PREFIXES_TIER2 = ['NICE', 'OOH', 'YES', 'NEAT', 'SLICK', 'SHARP', 'CLEAN', 'TASTY'] as const;
export const HYPE_PREFIXES_TIER3 = ['POW', 'ZAP', 'BOOM', 'WOW', 'YEAH', 'EPIC', 'KAPOW', 'BAM', 'BLAST', 'MEGA', 'FIRE', 'SAVAGE'] as const;

const HYPE_RATE_TIER2 = 0.3;
const HYPE_RATE_TIER3 = 0.55;

export function pickHypePrefix(tier: 1 | 2 | 3): string {
  if (tier === 1) return '';
  const roll = Math.random();
  if (tier === 2) {
    if (roll > HYPE_RATE_TIER2) return '';
    const pool = HYPE_PREFIXES_TIER2;
    return pool[Math.floor(Math.random() * pool.length)];
  }
  if (roll > HYPE_RATE_TIER3) return '';
  const pool = HYPE_PREFIXES_TIER3;
  return pool[Math.floor(Math.random() * pool.length)];
}
