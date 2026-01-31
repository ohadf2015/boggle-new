/**
 * Boss Ability Registry
 *
 * Extensible registry pattern for boss abilities.
 * Allows abilities to be registered, retrieved, and queried by boss.
 *
 * @example
 * ```ts
 * import { abilityRegistry } from './registry';
 *
 * // Register abilities
 * abilityRegistry.register({
 *   id: 'pop-quiz',
 *   bossId: 'ms-grammar',
 *   // ... other fields
 * });
 *
 * // Get abilities for a boss
 * const abilities = abilityRegistry.getForBoss('ms-grammar');
 *
 * // Get specific ability
 * const popQuiz = abilityRegistry.get('pop-quiz');
 * ```
 */

import type { BossAbility } from '../../../types/bossAbility';

// ==============================================
// REGISTRY CLASS
// ==============================================

/**
 * Registry class for managing boss abilities
 *
 * Provides CRUD operations for boss abilities with
 * efficient lookup by ID and boss ID.
 */
export class BossAbilityRegistry {
  /** Map of ability ID to ability definition */
  private abilities: Map<string, BossAbility> = new Map();

  /**
   * Register an ability in the registry
   *
   * If an ability with the same ID already exists, it will be overwritten.
   *
   * @param ability - The ability to register
   */
  register(ability: BossAbility): void {
    this.abilities.set(ability.id, ability);
  }

  /**
   * Get an ability by ID
   *
   * @param id - The ability ID
   * @returns The ability or undefined if not found
   */
  get(id: string): BossAbility | undefined {
    return this.abilities.get(id);
  }

  /**
   * Get all abilities for a specific boss
   *
   * Returns abilities sorted by priority (highest first) so that
   * higher-priority abilities are checked for activation first.
   *
   * @param bossId - The boss ID
   * @returns Array of abilities for this boss, sorted by priority
   */
  getForBoss(bossId: string): BossAbility[] {
    const bossAbilities: BossAbility[] = [];

    for (const ability of this.abilities.values()) {
      if (ability.bossId === bossId) {
        bossAbilities.push(ability);
      }
    }

    // Sort by priority (highest first)
    return bossAbilities.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Check if an ability exists in the registry
   *
   * @param id - The ability ID
   * @returns True if ability exists
   */
  has(id: string): boolean {
    return this.abilities.has(id);
  }

  /**
   * Remove an ability from the registry
   *
   * Does nothing if ability doesn't exist (no error thrown).
   *
   * @param id - The ability ID to remove
   */
  unregister(id: string): void {
    this.abilities.delete(id);
  }

  /**
   * Get all registered abilities
   *
   * @returns Array of all abilities
   */
  getAll(): BossAbility[] {
    return Array.from(this.abilities.values());
  }

  /**
   * Clear all abilities from the registry
   *
   * Useful for testing or resetting state.
   */
  clear(): void {
    this.abilities.clear();
  }
}

// ==============================================
// GLOBAL INSTANCE
// ==============================================

/**
 * Global ability registry instance
 *
 * Use this for registering and retrieving abilities throughout the app.
 * This singleton pattern allows abilities to be registered from anywhere
 * and accessed by any component that needs them.
 */
export const abilityRegistry = new BossAbilityRegistry();
