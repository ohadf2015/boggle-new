/**
 * Cosmic Wordsmith Abilities (World 8)
 *
 * Personality: Ancient space entity who invented languages
 * Twist Mechanic: stellarForge (evolving vowels, rare letter supernovas)
 *
 * Abilities:
 * - Star Scatter: Replace tiles with rare letters (Q, X, Z)
 * - Nova Burst: Full scramble + spawn multiplier tiles (enraged)
 */

import type { BossAbility } from '../../../types/bossAbility';

/**
 * Cosmic Wordsmith's abilities for World 8 boss battle
 *
 * These abilities match her cosmic, ancient personality:
 * - Star Scatter brings rare letters (like cosmic elements)
 * - Nova Burst is a cosmic explosion (chaos + power boost)
 */
export const cosmicWordsmithAbilities: BossAbility[] = [
  {
    id: 'cosmic-star-scatter',
    bossId: 'cosmicWordsmith',
    name: 'adventure.bosses.abilities.starScatter.name',
    description: 'adventure.bosses.abilities.starScatter.desc',
    cooldown: 30,
    activationConditions: [
      { type: 'phase', value: 'phase1', operator: '>=' },
    ],
    effects: [
      {
        type: 'change_tiles',
        target: { type: 'random', count: 5 },
        params: { changeType: 'rareLetter' },
      },
    ],
    telegraph: {
      duration: 2000,
      visualType: 'tiles',
      particleEffect: 'sparkle',
    },
    priority: 10,
    interruptible: false,
  },
  {
    id: 'cosmic-nova-burst',
    bossId: 'cosmicWordsmith',
    name: 'adventure.bosses.abilities.novaBurst.name',
    description: 'adventure.bosses.abilities.novaBurst.desc',
    cooldown: 45,
    activationConditions: [
      { type: 'phase', value: 'enraged' },
    ],
    effects: [
      {
        type: 'scramble',
        target: { type: 'all' },
      },
      {
        type: 'spawn_special',
        target: { type: 'random', count: 3 },
        params: { specialType: 'multiplier' },
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
