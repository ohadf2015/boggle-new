/**
 * Baron Buildaword Abilities (World 5)
 *
 * Personality: Steampunk inventor obsessed with word efficiency
 * Twist Mechanic: assemblyLine (conveyor belt tiles, compound words)
 *
 * Abilities:
 * - Assembly Line: Change letters in a row
 * - Construction Zone: Lock diagonal tiles
 */

import type { BossAbility } from '../../../types/bossAbility';

/**
 * Baron Buildaword's abilities for World 5 boss battle
 *
 * These abilities match his inventor/engineer personality:
 * - Assembly Line changes letters (factory production metaphor)
 * - Construction Zone blocks diagonal areas (building site hazard)
 */
export const baronBuildawordAbilities: BossAbility[] = [
  {
    id: 'baron-assembly-line',
    bossId: 'baronBuildaword',
    name: 'adventure.bosses.abilities.assemblyLine.name',
    description: 'adventure.bosses.abilities.assemblyLine.desc',
    cooldown: 35,
    activationConditions: [
      { type: 'phase', value: 'phase1', operator: '>=' },
    ],
    effects: [
      {
        type: 'change_tiles',
        target: { type: 'row', count: 1 },
        params: { changeType: 'randomLetter' },
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
    id: 'baron-construction-zone',
    bossId: 'baronBuildaword',
    name: 'adventure.bosses.abilities.constructionZone.name',
    description: 'adventure.bosses.abilities.constructionZone.desc',
    cooldown: 40,
    activationConditions: [
      { type: 'hp_threshold', value: 40, operator: '<' },
    ],
    effects: [
      {
        type: 'lock_tiles',
        target: { type: 'diagonal' },
        duration: 12000,
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
];
