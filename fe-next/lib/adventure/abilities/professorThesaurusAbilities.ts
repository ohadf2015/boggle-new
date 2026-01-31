/**
 * Professor Thesaurus Abilities (World 3)
 *
 * Personality: Scholarly, verbose, synonym-obsessed ancient tortoise
 * Twist Mechanic: etymologyDig (root word chains and buried letters)
 *
 * Abilities:
 * - Synonym Shuffle: Scramble a row
 * - Verbose Curse: Force longer word requirement
 * - Etymology Lock: Lock an entire column (enraged)
 */

import type { BossAbility } from '../../../types/bossAbility';

/**
 * Professor Thesaurus's abilities for World 3 boss battle
 *
 * These abilities match his scholarly, verbose personality:
 * - Synonym Shuffle rearranges tiles (like reorganizing knowledge)
 * - Verbose Curse demands long words (he ONLY speaks in elaborate words)
 * - Etymology Lock seals a column (burying letters like fossils)
 */
export const professorThesaurusAbilities: BossAbility[] = [
  {
    id: 'thesaurus-synonym-shuffle',
    bossId: 'professorThesaurus',
    name: 'adventure.bosses.abilities.synonymShuffle.name',
    description: 'adventure.bosses.abilities.synonymShuffle.desc',
    cooldown: 35,
    activationConditions: [
      { type: 'phase', value: 'phase1', operator: '>=' },
    ],
    effects: [
      {
        type: 'scramble',
        target: { type: 'row', count: 1 },
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
    id: 'thesaurus-verbose-curse',
    bossId: 'professorThesaurus',
    name: 'adventure.bosses.abilities.verboseCurse.name',
    description: 'adventure.bosses.abilities.verboseCurse.desc',
    cooldown: 40,
    activationConditions: [
      { type: 'phase', value: 'phase2', operator: '>=' },
    ],
    effects: [
      {
        type: 'requirement',
        params: { requirementType: 'minLength', minLength: 6 },
        duration: 20000,
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
    id: 'thesaurus-etymology-lock',
    bossId: 'professorThesaurus',
    name: 'adventure.bosses.abilities.etymologyLock.name',
    description: 'adventure.bosses.abilities.etymologyLock.desc',
    cooldown: 50,
    activationConditions: [
      { type: 'phase', value: 'enraged' },
    ],
    effects: [
      {
        type: 'lock_tiles',
        target: { type: 'column', count: 1 },
        duration: 15000,
      },
    ],
    telegraph: {
      duration: 2000,
      visualType: 'tiles',
    },
    priority: 20,
    interruptible: false,
  },
];
