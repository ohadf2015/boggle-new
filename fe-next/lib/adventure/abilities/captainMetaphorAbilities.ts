/**
 * Captain Metaphor Abilities (World 4)
 *
 * Personality: Theatrical pirate who only speaks in idioms
 * Twist Mechanic: idiomBattle (find literal words from idioms)
 *
 * Abilities:
 * - Island Lock: Lock random tiles (marooned tiles)
 * - Figurative Storm: Scramble entire board (enraged)
 */

import type { BossAbility } from '../../../types/bossAbility';

/**
 * Captain Metaphor's abilities for World 4 boss battle
 *
 * These abilities match his pirate/idiom personality:
 * - Island Lock maroons tiles (like a desert island)
 * - Figurative Storm scrambles everything (chaotic like his speech)
 */
export const captainMetaphorAbilities: BossAbility[] = [
  {
    id: 'metaphor-island-lock',
    bossId: 'captainMetaphor',
    name: 'adventure.bosses.abilities.islandLock.name',
    description: 'adventure.bosses.abilities.islandLock.desc',
    cooldown: 30,
    activationConditions: [
      { type: 'phase', value: 'phase1', operator: '>=' },
    ],
    effects: [
      {
        type: 'lock_tiles',
        target: { type: 'random', count: 5 },
        duration: 10000,
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
    id: 'metaphor-figurative-storm',
    bossId: 'captainMetaphor',
    name: 'adventure.bosses.abilities.figurativeStorm.name',
    description: 'adventure.bosses.abilities.figurativeStorm.desc',
    cooldown: 45,
    activationConditions: [
      { type: 'phase', value: 'enraged' },
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
    priority: 20,
    interruptible: false,
  },
];
