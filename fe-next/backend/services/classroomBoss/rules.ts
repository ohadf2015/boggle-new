import type { ClassroomBossAttackKind } from '@/shared/types/classroomBoss';

export const BOSS_RULES = {
  minHp: 400,
  /** Expected damage per student-second at combo x1 (word scores are exponential: 3 letters 10, 5 letters 50, 7 letters 200). */
  hpPerStudentSecond: 3,
  /** Boss armor: one word never takes more than this share of max HP (scores are exponential; an 8-letter crit at x4 is 4000). */
  maxHitPct: 0.12,
  introMs: 3500,
  phasePauseMs: 2500,
  phaseAt: [0.66, 0.33] as const,
  comboWindowMs: 3000,
  critLen: 7,
  shieldLen: 5,
  shieldMax: 5,
  staggerLen: 6,
  staggerWords: 3,
  /** A stagger leaves the boss open: every word in the window deals extra damage. */
  exposedMs: 5000,
  exposedMult: 1.5,
  healPct: 0.05,
  freezeTiles: 3,
  freezeMs: 5000,
  blurMs: 4000,
  drainCharges: 2,
  openingMs: 12_000,
  cadenceMs: [18_000, 13_000, 8_000] as const,
  telegraphMs: [10_000, 8_000, 6_000] as const,
  attackPool: [
    ['freeze', 'blur'],
    ['freeze', 'blur', 'drain'],
    ['freeze', 'freeze', 'blur', 'drain'],
  ] as ReadonlyArray<ReadonlyArray<ClassroomBossAttackKind>>,
  lastHits: 6,
  topHitters: 5,
} as const;
