/**
 * Per-boss unique animation configurations
 *
 * Each boss has distinct idle, hit, attack, and enraged animations
 * that reflect their personality and visual theme.
 * Used by BossOverlay to drive avatar motion.
 */

import type { Transition } from 'framer-motion';

// ==============================================
// TYPES
// ==============================================

export interface BossAnimationState {
  animate: Record<string, number | number[] | string | string[]>;
  transition: Transition;
}

export interface BossAnimationSet {
  /** Gentle idle loop — reflects boss personality */
  idle: BossAnimationState;
  /** Enraged idle — more intense version of idle */
  enraged: BossAnimationState;
  /** Hit recoil — reaction to taking damage */
  hit: BossAnimationState;
  /** Attack wind-up — boss using an ability */
  attack: BossAnimationState;
  /** Glow color for enraged outer ring */
  enragedGlowColor: string;
  /** CSS filter applied to avatar during enraged phase */
  enragedFilter?: string;
}

// ==============================================
// SHARED PRESETS
// ==============================================

const SPRING_HIT: Transition = { type: 'spring', stiffness: 400, damping: 12, mass: 0.8 };
const SPRING_ATTACK: Transition = { duration: 0.4, ease: [0.22, 1, 0.36, 1] };

// ==============================================
// PER-BOSS ANIMATIONS
// ==============================================

const BOSS_ANIMATIONS: Record<string, BossAnimationSet> = {
  // W1: Ms. Grammar — prim, tapping ruler impatiently
  msGrammar: {
    idle: {
      animate: { rotate: [0, -2, 2, -1, 0], y: [0, -1, 0] },
      transition: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' },
    },
    enraged: {
      animate: { rotate: [0, -4, 4, -3, 3, 0], scale: [1, 1.05, 1, 1.04, 1] },
      transition: { duration: 0.8, repeat: Infinity, ease: 'easeInOut' },
    },
    hit: {
      animate: { x: [0, -5, 4, -3, 2, 0], rotate: [0, 3, -2, 1, 0], scale: [1, 0.92, 1.04, 1] },
      transition: SPRING_HIT,
    },
    attack: {
      animate: { rotate: [0, -15, 5, 0], scale: [1, 1.15, 0.95, 1], y: [0, -4, 2, 0] },
      transition: SPRING_ATTACK,
    },
    enragedGlowColor: 'rgba(255, 51, 102, 0.4)',
  },

  // W2: Spelling Bee — buzzing vibration, wings flutter
  spellingBee: {
    idle: {
      animate: { x: [0, 1, -1, 0.5, -0.5, 0], y: [0, -2, 0, -1, 0] },
      transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
    },
    enraged: {
      animate: { x: [0, 2, -2, 1.5, -1.5, 0], y: [0, -3, 1, -2, 0], scale: [1, 1.06, 1, 1.04, 1] },
      transition: { duration: 0.6, repeat: Infinity, ease: 'easeInOut' },
    },
    hit: {
      animate: { rotate: [0, 15, -10, 5, 0], y: [0, 5, -2, 0], scale: [1, 0.85, 1.1, 1] },
      transition: SPRING_HIT,
    },
    attack: {
      animate: { x: [0, -8, 12, -3, 0], scale: [1, 0.9, 1.2, 1], rotate: [0, -5, 8, 0] },
      transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
    },
    enragedGlowColor: 'rgba(255, 193, 7, 0.5)',
  },

  // W3: Professor Thesaurus — slow, weighty, scholarly nods
  professorThesaurus: {
    idle: {
      animate: { y: [0, -0.5, 0], rotate: [0, 0.5, -0.5, 0] },
      transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
    },
    enraged: {
      animate: { scale: [1, 1.06, 1, 1.05, 1], y: [0, -2, 0] },
      transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
    },
    hit: {
      animate: { y: [0, 4, -1, 0], scale: [1, 0.9, 1.05, 1], rotate: [0, -3, 1, 0] },
      transition: { type: 'spring', stiffness: 200, damping: 15, mass: 1.5 },
    },
    attack: {
      animate: { scale: [1, 1.2, 0.95, 1.05, 1], y: [0, -6, 2, 0] },
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
    },
    enragedGlowColor: 'rgba(138, 43, 226, 0.4)',
  },

  // W4: Captain Metaphor — swaying like on a ship
  captainMetaphor: {
    idle: {
      animate: { rotate: [0, 3, -3, 2, -2, 0], x: [0, 1, -1, 0] },
      transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
    },
    enraged: {
      animate: { rotate: [0, 6, -6, 4, -4, 0], scale: [1, 1.05, 1, 1.04, 1] },
      transition: { duration: 1, repeat: Infinity, ease: 'easeInOut' },
    },
    hit: {
      animate: { x: [0, -6, 5, -3, 0], rotate: [0, 8, -5, 2, 0], scale: [1, 0.88, 1.06, 1] },
      transition: SPRING_HIT,
    },
    attack: {
      animate: { x: [0, -10, 15, -4, 0], rotate: [0, -8, 10, -2, 0], scale: [1, 1.15, 0.95, 1] },
      transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
    },
    enragedGlowColor: 'rgba(0, 119, 190, 0.5)',
  },

  // W5: Baron Buildaword — mechanical, jerky movements
  baronBuildaword: {
    idle: {
      animate: { rotate: [0, 1, 0, -1, 0], scale: [1, 1.01, 1, 1.01, 1] },
      transition: { duration: 2, repeat: Infinity, ease: 'linear' },
    },
    enraged: {
      animate: { rotate: [0, 2, -2, 1, -1, 0], x: [0, 1, -1, 0], scale: [1, 1.05, 1] },
      transition: { duration: 0.5, repeat: Infinity, ease: 'linear' },
    },
    hit: {
      animate: { x: [0, -3, 3, -2, 2, -1, 0], scale: [1, 0.93, 1.06, 0.98, 1], rotate: [0, -4, 4, -2, 0] },
      transition: { type: 'spring', stiffness: 500, damping: 10, mass: 0.6 },
    },
    attack: {
      animate: { scale: [1, 1.2, 1.2, 0.9, 1], rotate: [0, 0, -8, 4, 0], y: [0, -2, -2, 3, 0] },
      transition: { type: 'tween', duration: 0.45, times: [0, 0.3, 0.5, 0.8, 1] },
    },
    enragedGlowColor: 'rgba(255, 140, 0, 0.5)',
    enragedFilter: 'sepia(0.2) saturate(1.3)',
  },

  // W6: Puzzle Master — mysterious, floating, unpredictable
  puzzleMaster: {
    idle: {
      animate: { y: [0, -3, 0, -1, 0], rotate: [0, -1, 1, 0] },
      transition: { duration: 3.5, repeat: Infinity, ease: 'easeInOut' },
    },
    enraged: {
      animate: { y: [0, -4, 2, -3, 0], rotate: [0, 3, -3, 2, -2, 0], scale: [1, 1.04, 1] },
      transition: { duration: 1, repeat: Infinity, ease: 'easeInOut' },
    },
    hit: {
      animate: { rotate: [0, 10, -8, 5, -2, 0], scale: [1, 0.85, 1.1, 0.95, 1] },
      transition: { type: 'spring', stiffness: 350, damping: 10, mass: 0.7 },
    },
    attack: {
      animate: { scale: [1, 0.8, 1.25, 1], rotate: [0, 180, 360], y: [0, -5, 0] },
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
    },
    enragedGlowColor: 'rgba(219, 39, 119, 0.4)',
  },

  // W7: Reflection King — regal, symmetric, icy precision
  reflectionKing: {
    idle: {
      animate: { scale: [1, 1.02, 1], y: [0, -1, 0] },
      transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
    },
    enraged: {
      animate: { scale: [1, 1.06, 0.98, 1.04, 1], y: [0, -2, 1, -1, 0] },
      transition: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' },
    },
    hit: {
      animate: { x: [0, 3, -3, 2, -2, 1, 0], scale: [1, 0.9, 1.08, 1], rotate: [0, -2, 2, 0] },
      transition: SPRING_HIT,
    },
    attack: {
      animate: { scale: [1, 1.15, 1.15, 0.95, 1], y: [0, 0, -8, 2, 0] },
      transition: { duration: 0.5, times: [0, 0.2, 0.5, 0.8, 1] },
    },
    enragedGlowColor: 'rgba(100, 200, 255, 0.5)',
    enragedFilter: 'brightness(1.1) saturate(1.2)',
  },

  // W8: Cosmic Wordsmith — ethereal, floating, cosmic pulse
  cosmicWordsmith: {
    idle: {
      animate: { y: [0, -4, 0, -2, 0], scale: [1, 1.02, 0.99, 1.01, 1] },
      transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
    },
    enraged: {
      animate: { y: [0, -5, 2, -3, 0], scale: [1, 1.08, 0.97, 1.05, 1], rotate: [0, 2, -2, 1, 0] },
      transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
    },
    hit: {
      animate: { scale: [1, 0.8, 1.15, 0.95, 1], rotate: [0, 5, -5, 2, 0], y: [0, 3, -2, 0] },
      transition: { type: 'spring', stiffness: 300, damping: 8, mass: 1.2 },
    },
    attack: {
      animate: { scale: [1, 1.3, 0.9, 1.05, 1], y: [0, -10, 3, 0], rotate: [0, -3, 5, 0] },
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
    },
    enragedGlowColor: 'rgba(138, 43, 226, 0.5)',
    enragedFilter: 'hue-rotate(15deg) brightness(1.15)',
  },

  // W9: Linguist Sage — meditative, wise, steady
  linguistSage: {
    idle: {
      animate: { y: [0, -1, 0], scale: [1, 1.01, 1] },
      transition: { duration: 5, repeat: Infinity, ease: 'easeInOut' },
    },
    enraged: {
      animate: { scale: [1, 1.07, 1, 1.05, 1], y: [0, -3, 0], rotate: [0, 1, -1, 0] },
      transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
    },
    hit: {
      animate: { y: [0, 3, -2, 1, 0], rotate: [0, -4, 3, -1, 0], scale: [1, 0.92, 1.05, 1] },
      transition: { type: 'spring', stiffness: 250, damping: 12, mass: 1.3 },
    },
    attack: {
      animate: { scale: [1, 0.9, 1.2, 1], y: [0, 2, -6, 0], rotate: [0, -2, 4, 0] },
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
    },
    enragedGlowColor: 'rgba(0, 255, 128, 0.4)',
  },

  // W10: Lexicon Dragon — powerful, heavy, volcanic
  lexiconDragon: {
    idle: {
      animate: { scale: [1, 1.025, 1, 1.015, 1], y: [0, -2, 0, -1, 0] },
      transition: { duration: 3.5, repeat: Infinity, ease: 'easeInOut' },
    },
    enraged: {
      animate: { scale: [1, 1.1, 0.97, 1.08, 1], y: [0, -4, 2, -2, 0], rotate: [0, -2, 2, -1, 0] },
      transition: { duration: 1, repeat: Infinity, ease: 'easeInOut' },
    },
    hit: {
      animate: { x: [0, -6, 6, -4, 3, -1, 0], scale: [1, 0.88, 1.1, 0.95, 1], rotate: [0, 4, -3, 1, 0] },
      transition: { type: 'spring', stiffness: 350, damping: 10, mass: 1.5 },
    },
    attack: {
      animate: { scale: [1, 1.25, 1.25, 0.9, 1.05, 1], y: [0, -3, -3, 5, -1, 0], rotate: [0, -5, -5, 8, -2, 0] },
      transition: { duration: 0.55, times: [0, 0.2, 0.4, 0.7, 0.9, 1] },
    },
    enragedGlowColor: 'rgba(255, 165, 0, 0.6)',
    enragedFilter: 'sepia(0.15) saturate(1.4) brightness(1.1)',
  },
};

// ==============================================
// ACCESSOR
// ==============================================

/** Default fallback for unknown bosses */
const DEFAULT_ANIMATIONS: BossAnimationSet = {
  idle: {
    animate: { scale: [1, 1.015, 1], y: [0, -0.5, 0] },
    transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
  },
  enraged: {
    animate: { scale: [1, 1.04, 1, 1.03, 1], y: [0, -1, 0] },
    transition: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' },
  },
  hit: {
    animate: { x: [0, -4, 5, -3, 2, -1, 0], scale: [1, 0.9, 1.05, 0.97, 1], rotate: [0, 2, -2, 1, 0] },
    transition: SPRING_HIT,
  },
  attack: {
    animate: { scale: [1, 1.18, 0.95, 1.05, 1], rotate: [0, -6, 6, -2, 0], y: [0, -3, 0] },
    transition: SPRING_ATTACK,
  },
  enragedGlowColor: 'rgba(255, 51, 102, 0.4)',
};

/**
 * Get the animation set for a specific boss
 */
export function getBossAnimations(bossId: string): BossAnimationSet {
  return BOSS_ANIMATIONS[bossId] ?? DEFAULT_ANIMATIONS;
}
