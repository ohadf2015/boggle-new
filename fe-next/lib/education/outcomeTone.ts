/**
 * Single source of truth for win/loss/draw colour and achievement-tier
 * colour, both on neo design tokens. Raw Tailwind palette (`bg-green-500`,
 * `text-amber-700`, …) used to be hand-rolled at four separate call sites —
 * student profile duel history, DuelGameView, DuelHistory,
 * AchievementProgressCard — and drifted every time one of them changed.
 */

export type DuelOutcome = 'win' | 'loss' | 'draw';

export interface Tone {
  /** Solid pill/chip — fill + ink text. */
  badge: string;
  /** Text-only usage on the navy shell. */
  text: string;
  /** Translucent background for a card/row. */
  soft: string;
}

const OUTCOME_TONE: Record<DuelOutcome, Tone> = {
  win: {
    badge: 'bg-neo-lime text-neo-navy',
    text: 'text-neo-lime',
    soft: 'bg-neo-lime/20 text-neo-lime',
  },
  loss: {
    badge: 'bg-neo-red text-neo-white',
    text: 'text-neo-red',
    soft: 'bg-neo-red/20 text-neo-red',
  },
  draw: {
    // Solid cream fill (not a navy family) so a black border stays legible —
    // draw badges sit right next to solid win/loss pills that keep theirs.
    badge: 'bg-neo-cream text-neo-navy',
    text: 'text-neo-cream/70',
    soft: 'bg-neo-cream/10 text-neo-cream/70',
  },
};

export function outcomeTone(outcome: DuelOutcome): Tone {
  return OUTCOME_TONE[outcome];
}

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface TierTone {
  /** Solid badge — fill + ink text. */
  badge: string;
  /** Text-only usage on the navy shell. */
  text: string;
  /** Contrast-safe ink colour to pair with `badge`'s fill. */
  ink: string;
}

const TIER_TONE: Record<AchievementTier, TierTone> = {
  bronze: {
    badge: 'bg-neo-orange text-neo-navy',
    text: 'text-neo-orange',
    ink: 'text-neo-navy',
  },
  silver: {
    badge: 'bg-neo-cream text-neo-navy',
    text: 'text-neo-cream',
    ink: 'text-neo-navy',
  },
  gold: {
    badge: 'bg-neo-yellow text-neo-navy',
    text: 'text-neo-yellow',
    ink: 'text-neo-navy',
  },
  platinum: {
    badge: 'bg-neo-cyan text-neo-navy',
    text: 'text-neo-cyan',
    ink: 'text-neo-navy',
  },
};

export function achievementTierTone(tier: AchievementTier): TierTone {
  return TIER_TONE[tier];
}
