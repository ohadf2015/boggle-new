/**
 * Boss Abilities Index
 *
 * Barrel export that registers all boss abilities with the global registry.
 * Import this file at app initialization to register all abilities.
 *
 * @example
 * ```ts
 * import { registerAllAbilities } from '@/lib/adventure/abilities';
 *
 * // Call once at app startup
 * registerAllAbilities();
 *
 * // Then use the registry anywhere
 * import { abilityRegistry } from '@/lib/adventure/abilities/registry';
 * const msGrammarAbilities = abilityRegistry.getForBoss('msGrammar');
 * ```
 */

import { abilityRegistry } from './registry';

// World 1-3 Bosses
import { msGrammarAbilities } from './msGrammarAbilities';
import { spellingBeeAbilities } from './spellingBeeAbilities';
import { professorThesaurusAbilities } from './professorThesaurusAbilities';

// World 4-7 Bosses
import { captainMetaphorAbilities } from './captainMetaphorAbilities';
import { baronBuildawordAbilities } from './baronBuildawordAbilities';
import { puzzleMasterAbilities } from './puzzleMasterAbilities';
import { reflectionKingAbilities } from './reflectionKingAbilities';

// World 8-10 Bosses
import { cosmicWordsmithAbilities } from './cosmicWordsmithAbilities';
import { linguistSageAbilities } from './linguistSageAbilities';
import { lexiconDragonAbilities } from './lexiconDragonAbilities';

/**
 * All boss abilities combined into a single array
 *
 * Total: 24 abilities across 10 bosses
 * - Worlds 1-3: 8 abilities (3 + 2 + 3)
 * - Worlds 4-7: 7 abilities (2 + 2 + 3 + 2 - corrected below)
 * - Worlds 8-10: 7 abilities (2 + 2 + 3)
 */
export const ALL_BOSS_ABILITIES = [
  // World 1: Ms. Grammar (3 abilities)
  ...msGrammarAbilities,
  // World 2: Spelling Bee (2 abilities)
  ...spellingBeeAbilities,
  // World 3: Professor Thesaurus (3 abilities)
  ...professorThesaurusAbilities,
  // World 4: Captain Metaphor (2 abilities)
  ...captainMetaphorAbilities,
  // World 5: Baron Buildaword (2 abilities)
  ...baronBuildawordAbilities,
  // World 6: Puzzle Master (3 abilities)
  ...puzzleMasterAbilities,
  // World 7: Reflection King (2 abilities)
  ...reflectionKingAbilities,
  // World 8: Cosmic Wordsmith (2 abilities)
  ...cosmicWordsmithAbilities,
  // World 9: Linguist Sage (2 abilities)
  ...linguistSageAbilities,
  // World 10: Lexicon Dragon (3 abilities)
  ...lexiconDragonAbilities,
];

/**
 * Register all boss abilities with the global registry
 *
 * Call this once at application initialization before any boss battles.
 * Re-calling is safe (abilities are overwritten if they already exist).
 *
 * @example
 * ```ts
 * // In app initialization
 * registerAllAbilities();
 * ```
 */
export function registerAllAbilities(): void {
  ALL_BOSS_ABILITIES.forEach((ability) => {
    abilityRegistry.register(ability);
  });
}

/**
 * Get the total count of registered abilities
 *
 * Useful for verification and testing.
 */
export function getAbilityCount(): number {
  return ALL_BOSS_ABILITIES.length;
}

// ==============================================
// NAMED EXPORTS FOR TESTING/INSPECTION
// ==============================================

export {
  // World 1-3
  msGrammarAbilities,
  spellingBeeAbilities,
  professorThesaurusAbilities,
  // World 4-7
  captainMetaphorAbilities,
  baronBuildawordAbilities,
  puzzleMasterAbilities,
  reflectionKingAbilities,
  // World 8-10
  cosmicWordsmithAbilities,
  linguistSageAbilities,
  lexiconDragonAbilities,
};
