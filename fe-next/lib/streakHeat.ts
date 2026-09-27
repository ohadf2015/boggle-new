/**
 * Streak heat — the art layer over the streak tiers.
 *
 * Deliberately NOT merged into `STREAK_TIERS` (lib/streakTierRewards.ts): that
 * table is shared with the single-player win-streak economy (utils/coinManager,
 * hooks/useWinStreak) and its shape is asserted by its own tests. Merging would
 * also drag a `components/ui` import into `lib/`. So the thresholds stay owned
 * there and are reused via `getStreakTier()`; only the pixels live here.
 *
 * The gradients climb in temperature on purpose — dim ember at day 1 through to
 * gold at day 100 — so a player can read roughly how deep they are into a
 * streak from the background alone, before the number registers.
 */
import type { MascotVariant } from '@/components/ui/mascotData';
import { getStreakTier, type StreakTierConfig } from './streakTierRewards';

export interface StreakHeat {
  id: StreakTierConfig['id'];
  /** Tier mascot — hotter tier, hotter marshmallow. */
  mascot: MascotVariant;
  /** Background gradient stops (top → bottom). */
  from: string;
  to: string;
  /** Border / ring colour for badges and pills on this tier. */
  ring: string;
  /** Text colour that stays readable on top of `from`→`to`. */
  ink: string;
  /** Dimmed track colour for not-yet-earned day slots on this tier. */
  track: string;
  labelKey: string;
}

export const STREAK_HEAT: Record<StreakTierConfig['id'], StreakHeat> = {
  starting: {
    id: 'starting',
    mascot: 'streakSpark',
    from: '#7c4a12',
    to: '#b8791f',
    ring: '#f5c451',
    ink: '#ffe9b0',
    track: 'rgba(0,0,0,0.22)',
    labelKey: 'daily.streakHeat.starting',
  },
  hot: {
    id: 'hot',
    mascot: 'streakKindling',
    from: '#b8791f',
    to: '#e8a020',
    ring: '#ffd873',
    ink: '#fff3cf',
    track: 'rgba(0,0,0,0.20)',
    labelKey: 'daily.streakHeat.hot',
  },
  fire: {
    id: 'fire',
    // Day 7 reuses the original animated `onfire` mascot — it is the one the
    // app already reads as "on a streak", and it is genuinely animated.
    mascot: 'onfire',
    from: '#e07a10',
    to: '#f5a623',
    ring: '#ffe135',
    ink: '#fff8dc',
    track: 'rgba(0,0,0,0.20)',
    labelKey: 'daily.streakHeat.fire',
  },
  epic: {
    id: 'epic',
    mascot: 'streakInferno',
    from: '#d2500f',
    to: '#f57c1f',
    ring: '#ffc247',
    ink: '#fff1d6',
    track: 'rgba(0,0,0,0.24)',
    labelKey: 'daily.streakHeat.epic',
  },
  legendary: {
    id: 'legendary',
    mascot: 'streakMolten',
    from: '#b02a0a',
    to: '#ef4b17',
    ring: '#ffb03a',
    ink: '#ffe8d4',
    track: 'rgba(0,0,0,0.26)',
    labelKey: 'daily.streakHeat.legendary',
  },
  mythic: {
    id: 'mythic',
    mascot: 'streakSupernova',
    from: '#5b1e8a',
    to: '#c026d3',
    ring: '#7df9ff',
    ink: '#f6e6ff',
    track: 'rgba(0,0,0,0.28)',
    labelKey: 'daily.streakHeat.mythic',
  },
  immortal: {
    id: 'immortal',
    mascot: 'streakEternal',
    from: '#8a6510',
    to: '#f0c020',
    ring: '#fffbe6',
    ink: '#fffdf0',
    track: 'rgba(0,0,0,0.24)',
    labelKey: 'daily.streakHeat.immortal',
  },
};

/**
 * Heat for a given streak length. A streak of 0 (or a nonsense negative) still
 * returns the coolest tier rather than null, so callers can always render a
 * background without branching — the count itself is what communicates "none".
 */
export function getStreakHeat(streak: number): StreakHeat {
  const tier = getStreakTier(streak);
  return STREAK_HEAT[tier?.id ?? 'starting'];
}

/** `linear-gradient` string for a tier, for inline `style` use. */
export function streakHeatGradient(heat: StreakHeat): string {
  return `linear-gradient(180deg, ${heat.from} 0%, ${heat.to} 100%)`;
}
