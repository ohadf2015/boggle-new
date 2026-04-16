/**
 * SkillTreePageClient Tests
 *
 * Tests for achievement triggers on skill unlock:
 * - SKILL_UNLOCKED fires on every skill unlock
 * - SKILL_PATH_COMPLETE fires when all skills in a path are unlocked
 */

import { vi, type Mock } from 'vitest';
import { render, act } from '@testing-library/react';
import React from 'react';
import { SKILL_CATALOG } from '@/utils/skillTreeUtils';
import type { SkillNode, SkillPath } from '@/types/adventure';

// vi.hoisted ensures these are available when vi.mock factories execute (hoisted above imports)
const { mockEarnAchievement, mockGetState } = vi.hoisted(() => ({
  mockEarnAchievement: vi.fn().mockReturnValue(true),
  mockGetState: vi.fn(),
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  ArrowLeft: () => null,
}));

vi.mock('@/hooks/useAdventureAchievements', () => ({
  useAdventureAchievements: () => ({
    earnAchievement: mockEarnAchievement,
    isEarned: vi.fn(),
    getCount: vi.fn().mockReturnValue(0),
    getTierInfo: vi.fn(),
    achievementCounts: {},
  }),
}));

vi.mock('@/hooks/useSkillTreeStore', () => ({
  useSkillTreeStore: Object.assign(
    vi.fn((selector: any) => {
      const state = {
        hydrateFromDB: vi.fn(),
        unlockedSkills: new Set<string>(),
      };
      return selector ? selector(state) : state;
    }),
    { getState: mockGetState }
  ),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, locale: 'en' }),
}));

vi.mock('@/contexts/ProgressionContext', () => ({
  useProgressionData: () => ({ progression: null }),
}));

// Capture onSkillUnlock prop — store reference in module-level object
// (can't use vi.hoisted for mutable ref, but the factory captures closure fine
// as long as the variable is declared before the mock via `let`)
let capturedOnSkillUnlock: ((skill: any) => void) | undefined;
vi.mock('@/components/adventure/SkillTree', () => ({
  SkillTreeView: vi.fn((props: any) => {
    capturedOnSkillUnlock = props?.onSkillUnlock;
    return null;
  }),
  SkillUnlockModal: () => null,
}));

// Import after all mocks
import { SkillTreePageClient } from '../SkillTreePageClient';

/**
 * Helper: check if all skills in a given path are unlocked.
 * This mirrors the logic we'll add to SkillTreePageClient.
 */
function isPathComplete(path: SkillPath, unlockedSkills: Set<string>): boolean {
  const pathSkills = SKILL_CATALOG.filter(s => s.path === path);
  return pathSkills.length > 0 && pathSkills.every(s => unlockedSkills.has(s.id));
}

describe('SkillTreePageClient — achievement triggers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedOnSkillUnlock = undefined;
  });

  describe('isPathComplete helper', () => {
    it('should return false when no skills unlocked', () => {
      expect(isPathComplete('power', new Set())).toBe(false);
    });

    it('should return false when only some path skills unlocked', () => {
      const powerSkills = SKILL_CATALOG.filter(s => s.path === 'power');
      const partial = new Set([powerSkills[0].id]);
      expect(isPathComplete('power', partial)).toBe(false);
    });

    it('should return true when all path skills unlocked', () => {
      const powerSkills = SKILL_CATALOG.filter(s => s.path === 'power');
      const all = new Set(powerSkills.map(s => s.id));
      expect(isPathComplete('power', all)).toBe(true);
    });

    it('should not count skills from other paths', () => {
      const otherPathSkills = new Set(
        SKILL_CATALOG.filter(s => s.path !== 'strategy').map(s => s.id)
      );
      expect(isPathComplete('strategy', otherPathSkills)).toBe(false);
    });
  });

  describe('SKILL_UNLOCKED trigger', () => {
    it('should fire SKILL_UNLOCKED when handleSkillUnlock is called', () => {
      render(React.createElement(SkillTreePageClient));
      expect(capturedOnSkillUnlock).toBeDefined();

      const testSkill: SkillNode = SKILL_CATALOG[0]; // power_strike
      mockGetState.mockReturnValue({
        unlockedSkills: new Set([testSkill.id]),
      });

      act(() => {
        capturedOnSkillUnlock!(testSkill);
      });

      expect(mockEarnAchievement).toHaveBeenCalledWith('SKILL_UNLOCKED');
    });
  });

  describe('SKILL_PATH_COMPLETE trigger', () => {
    it('should fire SKILL_PATH_COMPLETE when last skill in path is unlocked', () => {
      render(React.createElement(SkillTreePageClient));
      expect(capturedOnSkillUnlock).toBeDefined();

      // All power path skills unlocked
      const powerSkills = SKILL_CATALOG.filter(s => s.path === 'power');
      mockGetState.mockReturnValue({
        unlockedSkills: new Set(powerSkills.map(s => s.id)),
      });

      const lastPowerSkill = powerSkills[powerSkills.length - 1];
      act(() => {
        capturedOnSkillUnlock!(lastPowerSkill);
      });

      expect(mockEarnAchievement).toHaveBeenCalledWith('SKILL_PATH_COMPLETE');
    });

    it('should NOT fire SKILL_PATH_COMPLETE when path is not fully unlocked', () => {
      render(React.createElement(SkillTreePageClient));
      expect(capturedOnSkillUnlock).toBeDefined();

      // Only 2 of 4 power skills unlocked
      const powerSkills = SKILL_CATALOG.filter(s => s.path === 'power');
      mockGetState.mockReturnValue({
        unlockedSkills: new Set([powerSkills[0].id, powerSkills[1].id]),
      });

      act(() => {
        capturedOnSkillUnlock!(powerSkills[1]);
      });

      // Callback fired (SKILL_UNLOCKED called) but path not complete
      expect(mockEarnAchievement).toHaveBeenCalledWith('SKILL_UNLOCKED');
      expect(mockEarnAchievement).not.toHaveBeenCalledWith('SKILL_PATH_COMPLETE');
    });
  });
});
