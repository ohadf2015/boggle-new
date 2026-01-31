/**
 * Lexicon Dragon Abilities (World 10 - Final Boss)
 *
 * Personality: Ultimate word nerd transcended into dragon form,
 *              anxious and overenthusiastic - wants to make friends
 * Twist Mechanic: finalWord (ALL mechanics combined, builds Lexicon Strike)
 *
 * Abilities:
 * - Word Flame: Change random tiles (dragon breath)
 * - Lexicon Storm: Full board scramble
 * - Ultimate Word: Combined attack - scramble + lock + timer penalty (enraged)
 */

import type { BossAbility } from '../../../types/bossAbility';

/**
 * Lexicon Dragon's abilities for World 10 final boss battle
 *
 * These abilities match his enthusiastic but overwhelming personality:
 * - Word Flame is a standard dragon attack (excited power display)
 * - Lexicon Storm scatters all words (too much energy)
 * - Ultimate Word is everything at once (the ultimate word nerd move)
 */
export const lexiconDragonAbilities: BossAbility[] = [
  {
    id: 'dragon-word-flame',
    bossId: 'lexiconDragon',
    name: 'adventure.bosses.abilities.wordFlame.name',
    description: 'adventure.bosses.abilities.wordFlame.desc',
    cooldown: 20,
    activationConditions: [
      { type: 'phase', value: 'phase1', operator: '>=' },
    ],
    effects: [
      {
        type: 'change_tiles',
        target: { type: 'random', count: 4 },
        params: { changeType: 'randomLetter' },
      },
    ],
    telegraph: {
      duration: 2000,
      visualType: 'tiles',
      particleEffect: 'warning',
    },
    priority: 10,
    interruptible: false,
  },
  {
    id: 'dragon-lexicon-storm',
    bossId: 'lexiconDragon',
    name: 'adventure.bosses.abilities.lexiconStorm.name',
    description: 'adventure.bosses.abilities.lexiconStorm.desc',
    cooldown: 35,
    activationConditions: [
      { type: 'phase', value: 'phase2', operator: '>=' },
    ],
    effects: [
      {
        type: 'scramble',
        target: { type: 'all' },
      },
    ],
    telegraph: {
      duration: 2000,
      visualType: 'screen',
      particleEffect: 'swirl',
    },
    priority: 15,
    interruptible: false,
  },
  {
    id: 'dragon-ultimate-word',
    bossId: 'lexiconDragon',
    name: 'adventure.bosses.abilities.ultimateWord.name',
    description: 'adventure.bosses.abilities.ultimateWord.desc',
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
        type: 'lock_tiles',
        target: { type: 'random', count: 4 },
        duration: 10000,
      },
      {
        type: 'timer_penalty',
        params: { penaltySeconds: 5 },
      },
    ],
    telegraph: {
      duration: 2000,
      visualType: 'screen',
      particleEffect: 'warning',
    },
    priority: 25,
    interruptible: false,
  },
];
