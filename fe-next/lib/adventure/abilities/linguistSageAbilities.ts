/**
 * Linguist Sage Abilities (World 9)
 *
 * Personality: Wise mountain goat who achieved enlightenment through all languages
 * Twist Mechanic: babelSummit (language shifts, universal word bonuses)
 *
 * Abilities:
 * - Babel Curse: Change random tiles (language confusion)
 * - Polyglot Lock: Lock many tiles at once
 */

import type { BossAbility } from '../../../types/bossAbility';

/**
 * Linguist Sage's abilities for World 9 boss battle
 *
 * These abilities match his multilingual, chaotic personality:
 * - Babel Curse creates confusion (Tower of Babel reference)
 * - Polyglot Lock seals knowledge (enlightened but guarded)
 */
export const linguistSageAbilities: BossAbility[] = [
  {
    id: 'sage-babel-curse',
    bossId: 'linguistSage',
    name: 'adventure.bosses.abilities.babelCurse.name',
    description: 'adventure.bosses.abilities.babelCurse.desc',
    cooldown: 35,
    activationConditions: [
      { type: 'phase', value: 'phase1', operator: '>=' },
    ],
    effects: [
      {
        type: 'change_tiles',
        target: { type: 'random', count: 6 },
        params: { changeType: 'randomLetter' },
      },
    ],
    telegraph: {
      duration: 2000,
      visualType: 'tiles',
      particleEffect: 'swirl',
    },
    priority: 10,
    interruptible: false,
  },
  {
    id: 'sage-polyglot-lock',
    bossId: 'linguistSage',
    name: 'adventure.bosses.abilities.polyglotLock.name',
    description: 'adventure.bosses.abilities.polyglotLock.desc',
    cooldown: 40,
    activationConditions: [
      { type: 'phase', value: 'phase2', operator: '>=' },
    ],
    effects: [
      {
        type: 'lock_tiles',
        target: { type: 'random', count: 6 },
        duration: 15000,
      },
    ],
    telegraph: {
      duration: 2000,
      visualType: 'tiles',
    },
    priority: 15,
    interruptible: false,
  },
];
