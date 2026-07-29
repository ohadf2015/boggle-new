/**
 * Reflection King Abilities (World 7)
 *
 * Personality: Dramatic ice monarch, incredibly vain but not evil
 * Twist Mechanic: mirrorMatch (mirrored grid, palindrome bonuses)
 *
 * Abilities:
 * - Mirror Flip: Scramble rows (mirror effect)
 * - Palindrome Power: Force palindrome requirement (enraged)
 */

import type { BossAbility } from '../../../types/bossAbility';

/**
 * Reflection King's abilities for World 7 boss battle
 *
 * These abilities match his vain, mirror-obsessed personality:
 * - Mirror Flip scrambles rows (like a distorted reflection)
 * - Palindrome Power demands palindromes (the only "perfect" words)
 */
export const reflectionKingAbilities: BossAbility[] = [
  {
    id: 'reflection-mirror-flip',
    bossId: 'reflectionKing',
    name: 'adventure.bosses.abilities.mirrorFlip.name',
    description: 'adventure.bosses.abilities.mirrorFlip.desc',
    cooldown: 30,
    activationConditions: [
      { type: 'phase', value: 'phase1', operator: '>=' },
    ],
    effects: [
      {
        type: 'scramble',
        target: { type: 'row', count: 2 },
      },
    ],
    telegraph: {
      duration: 2000,
      visualType: 'tiles',
    },
    priority: 10,
    interruptible: false,
  },
  {
    id: 'reflection-palindrome-power',
    bossId: 'reflectionKing',
    name: 'adventure.bosses.abilities.palindromePower.name',
    description: 'adventure.bosses.abilities.palindromePower.desc',
    cooldown: 45,
    activationConditions: [
      { type: 'phase', value: 'enraged' },
    ],
    effects: [
      {
        type: 'requirement',
        params: { requirementType: 'palindrome' },
        duration: 20000,
      },
    ],
    telegraph: {
      duration: 2000,
      visualType: 'screen',
      particleEffect: 'sparkle',
    },
    priority: 20,
    interruptible: false,
  },
];
