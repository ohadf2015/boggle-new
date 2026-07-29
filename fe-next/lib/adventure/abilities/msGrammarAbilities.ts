/**
 * Ms. Grammar Abilities (World 1)
 *
 * Personality: Strict, precise, rule-focused owl schoolteacher
 * Twist Mechanic: popQuiz (word category requirements)
 *
 * Abilities:
 * - Pop Quiz: Force minimum word length requirement
 * - Red Pen: Lock random tiles
 * - Detention: Timer penalty (enraged only)
 */

import type { BossAbility } from '../../../types/bossAbility';

/**
 * Ms. Grammar's abilities for World 1 boss battle
 *
 * These abilities match her strict teacher personality:
 * - Pop Quiz enforces requirements (like a real quiz)
 * - Red Pen marks/locks tiles (like grading papers)
 * - Detention punishes with time loss (classic teacher punishment)
 */
export const msGrammarAbilities: BossAbility[] = [
  {
    id: 'grammar-pop-quiz',
    bossId: 'msGrammar',
    name: 'adventure.bosses.abilities.popQuiz.name',
    description: 'adventure.bosses.abilities.popQuiz.desc',
    cooldown: 25,
    activationConditions: [
      { type: 'phase', value: 'phase1', operator: '>=' },
    ],
    effects: [
      {
        type: 'requirement',
        params: { requirementType: 'minLength', minLength: 5 },
        duration: 15000,
      },
      {
        type: 'player_damage',
        params: { amount: 10 },
      },
    ],
    telegraph: {
      duration: 2000,
      visualType: 'screen',
      particleEffect: 'sparkle',
    },
    priority: 10,
    interruptible: false,
  },
  {
    id: 'grammar-red-pen',
    bossId: 'msGrammar',
    name: 'adventure.bosses.abilities.redPen.name',
    description: 'adventure.bosses.abilities.redPen.desc',
    cooldown: 35,
    activationConditions: [
      { type: 'phase', value: 'phase2', operator: '>=' },
    ],
    effects: [
      {
        type: 'lock_tiles',
        target: { type: 'random', count: 4 },
        duration: 10000,
      },
      {
        type: 'player_damage',
        params: { amount: 15 },
      },
    ],
    telegraph: {
      duration: 2000,
      visualType: 'tiles',
      particleEffect: 'warning',
    },
    priority: 15,
    interruptible: false,
  },
  {
    id: 'grammar-detention',
    bossId: 'msGrammar',
    name: 'adventure.bosses.abilities.detention.name',
    description: 'adventure.bosses.abilities.detention.desc',
    cooldown: 45,
    activationConditions: [
      { type: 'phase', value: 'enraged' },
    ],
    effects: [
      {
        type: 'timer_penalty',
        params: { penaltySeconds: 5 },
      },
      {
        type: 'player_damage',
        params: { amount: 20 },
      },
    ],
    telegraph: {
      duration: 2000,
      visualType: 'screen',
      particleEffect: 'warning',
    },
    priority: 20,
    interruptible: false,
  },
];
