/**
 * Per-drill identity / theme system.
 *
 * Each Brain Gym drill gets a *persona* so a casual player can tell them apart
 * at a glance and the mode gains warmth + character. Themes deliberately reuse
 * the EXISTING kawaii-marshmallow mascot variants (no clashing new cast) and
 * stay inside the neo-brutalist palette. All player-facing copy is referenced
 * by i18n key — nothing hardcoded.
 *
 * @module lib/drills/drillThemes
 */

import type { MascotVariant } from '@/components/ui/Mascot';
import type { DrillType } from '@/shared/types/cognitive';

/** A neo-brutalist accent token (the 4 families + warmth orange). */
export type DrillAccent = 'neo-lime' | 'neo-purple' | 'neo-orange' | 'neo-cyan' | 'neo-pink';

export interface DrillTheme {
  id: DrillType;
  /** Base palette token, e.g. 'neo-lime'. UI derives `text-/bg-/border-` from it. */
  accent: DrillAccent;
  /** An existing mascot variant — keeps the character cast coherent. */
  mascot: MascotVariant;
  /** i18n key for the persona name shown big on the briefing (e.g. "Zap"). */
  personaKey: string;
  /** i18n key for the one-line mission ("what you do"). */
  missionKey: string;
  /** i18n key for the plain-English benefit ("you'll feel..."). */
  benefitKey: string;
  /** i18n key for a short, practical coach tip. */
  coachTipKey: string;
}

const theme = (
  id: DrillType,
  accent: DrillAccent,
  mascot: MascotVariant
): DrillTheme => ({
  id,
  accent,
  mascot,
  personaKey: `brain.drills.${id}.persona`,
  missionKey: `brain.drills.${id}.mission`,
  benefitKey: `brain.drills.${id}.benefit`,
  coachTipKey: `brain.drills.${id}.coachTip`,
});

export const DRILL_THEMES: Record<DrillType, DrillTheme> = {
  // Zap — high-energy speed run. Powerup mascot = fast/charged.
  'lightning-round': theme('lightning-round', 'neo-lime', 'powerup'),
  // Echo — study then recall. Scholar mascot = focused/bookish.
  'memory-hunt': theme('memory-hunt', 'neo-purple', 'scholar'),
  // Blaze — keep the chain alight. Onfire mascot = combo flame.
  'combo-master': theme('combo-master', 'neo-orange', 'onfire'),
  // Shift — adapt to changing rules. Flexing mascot = agility.
  'pattern-switcher': theme('pattern-switcher', 'neo-cyan', 'flexing'),
  // Glimmer — dig for rare words. Explorer mascot = treasure hunter.
  'rare-gems': theme('rare-gems', 'neo-pink', 'explorer'),
};

const FALLBACK_THEME = DRILL_THEMES['lightning-round'];

/** Safe accessor — never throws on an unknown id. */
export function getDrillTheme(id: DrillType): DrillTheme {
  return DRILL_THEMES[id] ?? FALLBACK_THEME;
}

/** Convenience: Tailwind class helpers derived from an accent token. */
export const accentText = (t: DrillTheme): string => `text-${t.accent}`;
export const accentBg = (t: DrillTheme): string => `bg-${t.accent}`;
export const accentBorder = (t: DrillTheme): string => `border-${t.accent}`;
