/**
 * Puzzle Master Abilities (World 6)
 *
 * Personality: Enigmatic cat in domino mask who speaks in riddles
 * Twist Mechanic: scrambledReality (scrambling tiles, anagram bonuses)
 *
 * Abilities:
 * - Puzzle Scramble: Scramble random tiles
 * - Anagram Curse: Force anagram requirement
 * - Puzzle Chaos: Full scramble + timer penalty (enraged)
 */

import type { BossAbility } from '../../../types/bossAbility';

/**
 * Puzzle Master's abilities for World 6 boss battle
 *
 * These abilities match his mysterious, puzzle-obsessed personality:
 * - Puzzle Scramble shuffles tiles (everything is a puzzle)
 * - Anagram Curse demands anagrams (his favorite word form)
 * - Puzzle Chaos is ultimate confusion (enraged desperation)
 */
export const puzzleMasterAbilities: BossAbility[] = [
  {
    id: 'puzzle-scramble',
    bossId: 'puzzleMaster',
    name: 'adventure.bosses.abilities.puzzleScramble.name',
    description: 'adventure.bosses.abilities.puzzleScramble.desc',
    cooldown: 25,
    activationConditions: [
      { type: 'phase', value: 'phase1', operator: '>=' },
    ],
    effects: [
      {
        type: 'scramble',
        target: { type: 'random', count: 9 },
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
    id: 'puzzle-anagram-curse',
    bossId: 'puzzleMaster',
    name: 'adventure.bosses.abilities.anagramCurse.name',
    description: 'adventure.bosses.abilities.anagramCurse.desc',
    cooldown: 40,
    activationConditions: [
      { type: 'phase', value: 'phase2', operator: '>=' },
    ],
    effects: [
      {
        type: 'requirement',
        params: { requirementType: 'anagram' },
        duration: 15000,
      },
    ],
    telegraph: {
      duration: 2000,
      visualType: 'screen',
    },
    priority: 15,
    interruptible: false,
  },
  {
    id: 'puzzle-chaos',
    bossId: 'puzzleMaster',
    name: 'adventure.bosses.abilities.puzzleChaos.name',
    description: 'adventure.bosses.abilities.puzzleChaos.desc',
    cooldown: 50,
    activationConditions: [
      { type: 'phase', value: 'enraged' },
    ],
    effects: [
      {
        type: 'scramble',
        target: { type: 'all' },
      },
      {
        type: 'timer_penalty',
        params: { penaltySeconds: 3 },
      },
    ],
    telegraph: {
      duration: 2000,
      visualType: 'screen',
      particleEffect: 'swirl',
    },
    priority: 25,
    interruptible: false,
  },
];
