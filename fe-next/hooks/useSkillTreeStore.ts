/**
 * Skill Tree Zustand Store
 *
 * Manages skill tree state with localStorage persistence.
 * Uses custom storage to correctly serialize Set<string>.
 *
 * Key pattern: Set must be converted to Array for JSON.stringify
 */

import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';

// ==============================================
// TYPES
// ==============================================

interface SkillTreeStoreState {
  /** Set of unlocked skill IDs */
  unlockedSkills: Set<string>;
  /** Available skill points to spend */
  availablePoints: number;
  /** Total skill points earned (never decreases) */
  totalPointsEarned: number;
}

interface SkillTreeStoreActions {
  /** Add skill points (from level up) */
  addSkillPoints: (amount: number) => void;
  /** Unlock a skill, spending points */
  unlockSkill: (skillId: string, cost: number) => boolean;
  /** Check if a skill is unlocked */
  hasSkill: (skillId: string) => boolean;
  /** Reset all state (for testing/new game) */
  reset: () => void;
}

type SkillTreeStore = SkillTreeStoreState & SkillTreeStoreActions;

// ==============================================
// CUSTOM STORAGE (Set serialization)
// ==============================================

/**
 * Custom storage that handles Set<string> serialization
 * JSON.stringify converts Set to {} - we need Array format
 */
const skillTreeStorage: StateStorage = {
  getItem: (name: string): string | null => {
    if (typeof window === 'undefined') return null;
    const str = localStorage.getItem(name);
    if (!str) return null;

    try {
      const parsed = JSON.parse(str);
      // Convert Array back to Set
      if (parsed.state && Array.isArray(parsed.state.unlockedSkills)) {
        return JSON.stringify({
          ...parsed,
          state: {
            ...parsed.state,
            unlockedSkills: new Set(parsed.state.unlockedSkills),
          },
        });
      }
      return str;
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string): void => {
    if (typeof window === 'undefined') return;
    try {
      const parsed = JSON.parse(value);
      // Convert Set to Array for storage
      const serialized = {
        ...parsed,
        state: {
          ...parsed.state,
          unlockedSkills: parsed.state.unlockedSkills instanceof Set
            ? [...parsed.state.unlockedSkills]
            : parsed.state.unlockedSkills || [],
        },
      };
      localStorage.setItem(name, JSON.stringify(serialized));
    } catch {
      localStorage.setItem(name, value);
    }
  },
  removeItem: (name: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(name);
  },
};

// ==============================================
// INITIAL STATE
// ==============================================

const initialState: SkillTreeStoreState = {
  unlockedSkills: new Set(),
  availablePoints: 0,
  totalPointsEarned: 0,
};

// ==============================================
// STORE
// ==============================================

export const useSkillTreeStore = create<SkillTreeStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      addSkillPoints: (amount: number) => {
        if (amount <= 0) return;
        set((state) => ({
          availablePoints: state.availablePoints + amount,
          totalPointsEarned: state.totalPointsEarned + amount,
        }));
      },

      unlockSkill: (skillId: string, cost: number): boolean => {
        const state = get();

        // Validate unlock conditions
        if (state.availablePoints < cost) return false;
        if (state.unlockedSkills.has(skillId)) return false;

        // Unlock skill
        set((state) => ({
          unlockedSkills: new Set([...state.unlockedSkills, skillId]),
          availablePoints: state.availablePoints - cost,
        }));

        return true;
      },

      hasSkill: (skillId: string): boolean => {
        return get().unlockedSkills.has(skillId);
      },

      reset: () => {
        set({
          unlockedSkills: new Set(),
          availablePoints: 0,
          totalPointsEarned: 0,
        });
      },
    }),
    {
      name: 'lexiclash-skill-tree',
      storage: createJSONStorage(() => skillTreeStorage),
      // Custom merge to handle Set restoration
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<SkillTreeStoreState> | undefined;
        if (!persisted) return currentState;

        return {
          ...currentState,
          ...persisted,
          // Ensure Set is restored correctly
          unlockedSkills: persisted.unlockedSkills instanceof Set
            ? persisted.unlockedSkills
            : new Set(Array.isArray(persisted.unlockedSkills) ? persisted.unlockedSkills : []),
        };
      },
    }
  )
);
