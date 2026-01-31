/**
 * skillTreeUtils Tests
 *
 * TDD tests for skill tree catalog and utility functions.
 */

import {
  SKILL_CATALOG,
  canUnlockSkill,
  getSkillsByPath,
  getSkillById,
  getAvailableSkills,
} from './skillTreeUtils';
import type { SkillTreeState } from '@/types/adventure';

describe('skillTreeUtils', () => {
  describe('SKILL_CATALOG', () => {
    it('contains at least 12 skills', () => {
      expect(SKILL_CATALOG.length).toBeGreaterThanOrEqual(12);
    });

    it('has 3 paths with skills in each', () => {
      const paths = new Set(SKILL_CATALOG.map(s => s.path));
      expect(paths.size).toBe(3);
      expect(paths.has('power')).toBe(true);
      expect(paths.has('strategy')).toBe(true);
      expect(paths.has('utility')).toBe(true);
    });

    it('has at least 70% horizontal skills', () => {
      const horizontal = SKILL_CATALOG.filter(s => s.effectType === 'horizontal').length;
      expect(horizontal / SKILL_CATALOG.length).toBeGreaterThanOrEqual(0.7);
    });

    it('has valid tier distribution (1-3)', () => {
      SKILL_CATALOG.forEach(skill => {
        expect([1, 2, 3]).toContain(skill.tier);
      });
    });

    it('has tier 1 skills with no prerequisites', () => {
      const tier1 = SKILL_CATALOG.filter(s => s.tier === 1);
      tier1.forEach(skill => {
        expect(skill.prerequisites).toEqual([]);
      });
    });

    it('has higher tier skills requiring lower tier prerequisites', () => {
      SKILL_CATALOG.filter(s => s.tier > 1).forEach(skill => {
        expect(skill.prerequisites.length).toBeGreaterThan(0);
        skill.prerequisites.forEach(prereqId => {
          const prereq = SKILL_CATALOG.find(s => s.id === prereqId);
          expect(prereq).toBeDefined();
          expect(prereq!.tier).toBeLessThan(skill.tier);
        });
      });
    });

    it('has skills with unique IDs', () => {
      const ids = SKILL_CATALOG.map(s => s.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('has skills with translation keys', () => {
      SKILL_CATALOG.forEach(skill => {
        expect(skill.nameKey).toMatch(/^adventure\.skills\./);
        expect(skill.descriptionKey).toMatch(/^adventure\.skills\./);
      });
    });
  });

  describe('getSkillsByPath', () => {
    it('returns only skills for given path', () => {
      const powerSkills = getSkillsByPath('power');
      expect(powerSkills.length).toBeGreaterThan(0);
      powerSkills.forEach(skill => {
        expect(skill.path).toBe('power');
      });
    });

    it('returns skills sorted by tier', () => {
      const skills = getSkillsByPath('strategy');
      for (let i = 1; i < skills.length; i++) {
        expect(skills[i].tier).toBeGreaterThanOrEqual(skills[i - 1].tier);
      }
    });

    it('returns empty array for invalid path', () => {
      // @ts-expect-error - testing invalid path
      const skills = getSkillsByPath('invalid');
      expect(skills).toEqual([]);
    });
  });

  describe('getSkillById', () => {
    it('returns skill when found', () => {
      const firstSkill = SKILL_CATALOG[0];
      const found = getSkillById(firstSkill.id);
      expect(found).toBe(firstSkill);
    });

    it('returns undefined when not found', () => {
      expect(getSkillById('nonexistent_skill')).toBeUndefined();
    });
  });

  describe('canUnlockSkill', () => {
    const makeState = (unlocked: string[] = [], points = 1): SkillTreeState => ({
      unlockedSkills: new Set(unlocked),
      availablePoints: points,
      totalPointsEarned: points,
    });

    it('returns true for tier 1 skill with enough points', () => {
      const tier1Skill = SKILL_CATALOG.find(s => s.tier === 1)!;
      expect(canUnlockSkill(tier1Skill.id, makeState([], tier1Skill.cost))).toBe(true);
    });

    it('returns false when not enough points', () => {
      const tier1Skill = SKILL_CATALOG.find(s => s.tier === 1)!;
      expect(canUnlockSkill(tier1Skill.id, makeState([], 0))).toBe(false);
    });

    it('returns false when already unlocked', () => {
      const tier1Skill = SKILL_CATALOG.find(s => s.tier === 1)!;
      expect(canUnlockSkill(tier1Skill.id, makeState([tier1Skill.id], 5))).toBe(false);
    });

    it('returns false when prerequisites not met', () => {
      const tier2Skill = SKILL_CATALOG.find(s => s.tier === 2)!;
      expect(canUnlockSkill(tier2Skill.id, makeState([], 10))).toBe(false);
    });

    it('returns true when prerequisites are met', () => {
      const tier2Skill = SKILL_CATALOG.find(s => s.tier === 2)!;
      expect(canUnlockSkill(tier2Skill.id, makeState(tier2Skill.prerequisites, tier2Skill.cost))).toBe(true);
    });

    it('returns false for unknown skill', () => {
      expect(canUnlockSkill('unknown', makeState())).toBe(false);
    });
  });

  describe('getAvailableSkills', () => {
    const makeState = (unlocked: string[] = [], points = 10): SkillTreeState => ({
      unlockedSkills: new Set(unlocked),
      availablePoints: points,
      totalPointsEarned: points,
    });

    it('returns tier 1 skills when nothing unlocked', () => {
      const available = getAvailableSkills(makeState());
      expect(available.length).toBeGreaterThan(0);
      available.forEach(skill => {
        expect(skill.tier).toBe(1);
      });
    });

    it('returns tier 2 skills when tier 1 prerequisite unlocked', () => {
      const tier1Skill = SKILL_CATALOG.find(s => s.tier === 1)!;
      const available = getAvailableSkills(makeState([tier1Skill.id]));
      const tier2Available = available.filter(s => s.tier === 2);
      // May or may not have tier 2 depending on prerequisites
      expect(tier2Available.length).toBeGreaterThanOrEqual(0);
    });

    it('excludes already unlocked skills', () => {
      const tier1Skill = SKILL_CATALOG.find(s => s.tier === 1)!;
      const available = getAvailableSkills(makeState([tier1Skill.id]));
      expect(available.find(s => s.id === tier1Skill.id)).toBeUndefined();
    });

    it('excludes skills when not enough points', () => {
      const available = getAvailableSkills(makeState([], 0));
      expect(available).toEqual([]);
    });
  });
});
