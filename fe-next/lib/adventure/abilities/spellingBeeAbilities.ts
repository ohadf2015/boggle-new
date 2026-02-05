/**
 * Spelling Bee Abilities (World 2)
 *
 * Personality: Buzzing energy, hive-minded queen bee
 * Twist Mechanic: hiveMind (sticky tiles and synonym challenges)
 *
 * Abilities:
 * - Bee Swarm: Spawn sticky tiles
 * - Spelling Sting: Change random letters
 */

import type { BossAbility } from '../../../types/bossAbility';

/**
 * Spelling Bee's abilities for World 2 boss battle
 *
 * These abilities match her bee queen personality:
 * - Bee Swarm spawns sticky tiles (like honey trapping words)
 * - Spelling Sting changes letters (sudden attack, confusing the board)
 */
export const spellingBeeAbilities: BossAbility[] = [
  {
    id: 'bee-swarm',
    bossId: 'spellingBee',
    name: 'adventure.bosses.abilities.beeSwarm.name',
    description: 'adventure.bosses.abilities.beeSwarm.desc',
    cooldown: 30,
    activationConditions: [
      { type: 'phase', value: 'phase1', operator: '>=' },
    ],
    effects: [
      {
        type: 'spawn_special',
        target: { type: 'random', count: 4 },
        params: { specialType: 'sticky' },
        duration: 12000,
      },
      {
        type: 'player_damage',
        params: { amount: 12 },
      },
    ],
    telegraph: {
      duration: 2000,
      visualType: 'tiles',
      particleEffect: 'bees',
    },
    priority: 10,
    interruptible: false,
  },
  {
    id: 'bee-spelling-sting',
    bossId: 'spellingBee',
    name: 'adventure.bosses.abilities.spellingSting.name',
    description: 'adventure.bosses.abilities.spellingSting.desc',
    cooldown: 40,
    activationConditions: [
      { type: 'hp_threshold', value: 50, operator: '<' },
    ],
    effects: [
      {
        type: 'change_tiles',
        target: { type: 'random', count: 3 },
        params: { changeType: 'randomLetter' },
      },
      {
        type: 'player_damage',
        params: { amount: 18 },
      },
    ],
    telegraph: {
      duration: 2000,
      visualType: 'tiles',
      particleEffect: 'bees',
    },
    priority: 15,
    interruptible: false,
  },
];
