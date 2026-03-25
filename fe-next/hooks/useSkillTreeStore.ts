/**
 * Skill Tree Zustand Store
 *
 * Manages skill tree state with DB persistence via /api/adventure/skill-tree.
 * Falls back to localStorage if DB save fails.
 * Uses custom storage to correctly serialize Set<string>.
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
  /** Whether initial state has been hydrated from DB */
  hydrated: boolean;
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
  /** Hydrate from DB progression data */
  hydrateFromDB: (skillTree: Record<string, number>, skillPoints: number) => void;
}

type SkillTreeStore = SkillTreeStoreState & SkillTreeStoreActions;

// ==============================================
// DB SYNC (fire-and-forget)
// ==============================================

/** Convert Set<string> to Record<string, 1> for DB storage */
function skillSetToRecord(skills: Set<string>): Record<string, number> {
  const record: Record<string, number> = {};
  for (const skill of skills) {
    record[skill] = 1;
  }
  return record;
}

let syncTimeout: ReturnType<typeof setTimeout> | null = null;

/** Debounced save to DB — coalesces rapid unlocks into one request */
function syncToDB(skills: Set<string>, points: number): void {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(async () => {
    try {
      await fetch('/api/adventure/skill-tree', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skillTree: skillSetToRecord(skills),
          skillPoints: points,
        }),
      });
    } catch {
      // Silently fail — localStorage still has the data
    }
  }, 500);
}

// ==============================================
// CUSTOM STORAGE (Set serialization)
// ==============================================

const skillTreeStorage: StateStorage = {
  getItem: (name: string): string | null => {
    if (typeof window === 'undefined') return null;
    const str = localStorage.getItem(name);
    if (!str) return null;

    try {
      const parsed = JSON.parse(str);
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
  hydrated: false,
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
        set((state) => {
          const newPoints = state.availablePoints + amount;
          syncToDB(state.unlockedSkills, newPoints);
          return {
            availablePoints: newPoints,
            totalPointsEarned: state.totalPointsEarned + amount,
          };
        });
      },

      unlockSkill: (skillId: string, cost: number): boolean => {
        const state = get();
        if (state.availablePoints < cost) return false;
        if (state.unlockedSkills.has(skillId)) return false;

        set((state) => {
          const newSkills = new Set([...state.unlockedSkills, skillId]);
          const newPoints = state.availablePoints - cost;
          syncToDB(newSkills, newPoints);
          return {
            unlockedSkills: newSkills,
            availablePoints: newPoints,
          };
        });

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
        syncToDB(new Set(), 0);
      },

      hydrateFromDB: (skillTree: Record<string, number>, skillPoints: number) => {
        const state = get();
        // Only hydrate once, and only if DB has data that localStorage doesn't
        if (state.hydrated) return;
        const dbSkills = new Set(Object.keys(skillTree));
        const localSkills = state.unlockedSkills;
        // Merge: use whichever has more skills (DB or localStorage)
        const useDB = dbSkills.size > localSkills.size;
        set({
          hydrated: true,
          ...(useDB ? {
            unlockedSkills: dbSkills,
            availablePoints: skillPoints,
          } : {}),
        });
      },
    }),
    {
      name: 'lexiclash-skill-tree',
      storage: createJSONStorage(() => skillTreeStorage),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<SkillTreeStoreState> | undefined;
        if (!persisted) return currentState;

        return {
          ...currentState,
          ...persisted,
          unlockedSkills: persisted.unlockedSkills instanceof Set
            ? persisted.unlockedSkills
            : new Set(Array.isArray(persisted.unlockedSkills) ? persisted.unlockedSkills : []),
        };
      },
    }
  )
);
