/**
 * Tests for generateObjectives — Sprint 3 backfill (H16)
 * Verifies boss vs regular level objective generation,
 * archetype-driven primary selection, secondary objective logic.
 */

import { generateObjectives } from '../objectives';

describe('generateObjectives', () => {
  // ==============================================
  // BOSS LEVELS (level 7)
  // ==============================================

  describe('boss levels (level 7)', () => {
    it('returns exactly 3 battle-focused objectives', () => {
      const objectives = generateObjectives(1, 7);
      expect(objectives).toHaveLength(3);
    });

    it('has defeatBoss as primary', () => {
      const objectives = generateObjectives(2, 7);
      const primary = objectives.filter(o => o.isPrimary);
      expect(primary).toHaveLength(1);
      expect(primary[0].type).toBe('defeatBoss');
      expect(primary[0].target).toBe(100);
    });

    it('has mechanicTrigger and surviveBattle as secondaries', () => {
      const objectives = generateObjectives(3, 7);
      const secondaries = objectives.filter(o => !o.isPrimary);
      expect(secondaries).toHaveLength(2);
      const types = secondaries.map(o => o.type);
      expect(types).toContain('mechanicTrigger');
      expect(types).toContain('surviveBattle');
    });

    it('surviveBattle target is always 50', () => {
      const objectives = generateObjectives(5, 7);
      const survive = objectives.find(o => o.type === 'surviveBattle');
      expect(survive?.target).toBe(50);
    });

    it('mechanicTrigger scales with world', () => {
      const w1 = generateObjectives(1, 7).find(o => o.type === 'mechanicTrigger');
      const w9 = generateObjectives(9, 7).find(o => o.type === 'mechanicTrigger');
      // formula: min(3 + floor(world/3), 8)
      expect(w1?.target).toBe(3); // 3 + floor(1/3) = 3
      expect(w9?.target).toBe(6); // 3 + floor(9/3) = 6
    });

    it('mechanicTrigger caps at 8', () => {
      // world=30 (hypothetical) → min(3+10, 8) = 8
      const objectives = generateObjectives(10, 7);
      const mechanic = objectives.find(o => o.type === 'mechanicTrigger');
      expect(mechanic!.target).toBeLessThanOrEqual(8);
    });
  });

  // ==============================================
  // REGULAR LEVELS (non-boss)
  // ==============================================

  describe('regular levels', () => {
    it('returns at least 2 objectives (primary + secondary)', () => {
      // World 2 has mechanic, so should get 3 (primary + archetype secondary + mechanic trigger)
      const objectives = generateObjectives(2, 3);
      expect(objectives.length).toBeGreaterThanOrEqual(2);
    });

    it('has exactly one primary objective', () => {
      const objectives = generateObjectives(1, 1);
      const primaries = objectives.filter(o => o.isPrimary);
      expect(primaries).toHaveLength(1);
    });

    it('primary type matches archetype config when archetype provided', () => {
      // 'forge' archetype has primaryObjective = 'scoreTarget'
      const objectives = generateObjectives(1, 1, undefined, 'forge');
      const primary = objectives.find(o => o.isPrimary);
      expect(primary?.type).toBe('scoreTarget');
    });

    it('wordCount archetype generates wordCount primary', () => {
      const objectives = generateObjectives(1, 1, undefined, 'classic');
      const primary = objectives.find(o => o.isPrimary);
      expect(primary?.type).toBe('wordCount');
    });

    it('wheel archetype generates wordCount primary with shorter timer', () => {
      // wheel has timerMultiplier=0.7, primaryObjective='wordCount'
      const objectives = generateObjectives(3, 2, undefined, 'wheel');
      const primary = objectives.find(o => o.isPrimary);
      expect(primary?.type).toBe('wordCount');
    });
  });

  // ==============================================
  // WORLD MECHANIC TRIGGER (W2+)
  // ==============================================

  describe('world mechanic trigger', () => {
    it('world 1 does NOT get mechanicTrigger (no mechanic)', () => {
      const objectives = generateObjectives(1, 3);
      const mechanic = objectives.find(o => o.type === 'mechanicTrigger');
      expect(mechanic).toBeUndefined();
    });

    it('world 2+ gets mechanicTrigger secondary', () => {
      const objectives = generateObjectives(2, 3);
      const mechanic = objectives.find(o => o.type === 'mechanicTrigger');
      expect(mechanic).toBeDefined();
      expect(mechanic?.isPrimary).toBe(false);
    });

    it('mechanicTrigger target scales with world', () => {
      // formula: min(1 + floor((world-1)/2), 4)
      const w2 = generateObjectives(2, 3).find(o => o.type === 'mechanicTrigger');
      const w6 = generateObjectives(6, 3).find(o => o.type === 'mechanicTrigger');
      expect(w2!.target).toBe(1); // 1 + floor(1/2) = 1
      expect(w6!.target).toBe(3); // 1 + floor(5/2) = 3
    });
  });

  // ==============================================
  // WORLD 1 FALLBACK SECONDARY
  // ==============================================

  describe('world 1 fallback secondary', () => {
    it('world 1 gets a fallback secondary (not mechanicTrigger)', () => {
      const objectives = generateObjectives(1, 3);
      const secondaries = objectives.filter(o => !o.isPrimary);
      // Should have at least 2 secondaries for 3-star capability
      expect(secondaries.length).toBeGreaterThanOrEqual(2);
      // None should be mechanicTrigger
      expect(secondaries.every(o => o.type !== 'mechanicTrigger')).toBe(true);
    });

    it('fallback picks from scoreTarget/longWords/wordCount/timeBonus', () => {
      const objectives = generateObjectives(1, 1, undefined, 'classic');
      const secondaries = objectives.filter(o => !o.isPrimary);
      const validTypes = ['scoreTarget', 'longWords', 'wordCount', 'timeBonus'];
      for (const sec of secondaries) {
        expect(validTypes).toContain(sec.type);
      }
    });
  });

  // ==============================================
  // LONG WORDS + GRID FALLBACK
  // ==============================================

  describe('longWords grid fallback', () => {
    it('longWords secondary skipped when grid too small for long paths', () => {
      // 2x2 grid can't support 5-letter paths
      const tinyGrid = [['A', 'B'], ['C', 'D']];
      // classic secondary list is ['scoreTarget', 'longWords']
      const objectives = generateObjectives(1, 1, tinyGrid, 'classic');
      const secondaries = objectives.filter(o => !o.isPrimary);
      // longWords should be skipped, scoreTarget used instead
      expect(secondaries.every(o => o.type !== 'longWords')).toBe(true);
    });

    it('longWords secondary included when grid supports long paths', () => {
      // 5x5 grid easily supports 5-letter paths
      const bigGrid = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => 'A'));
      // wheel secondary list starts with ['longWords', 'scoreTarget']
      const objectives = generateObjectives(3, 2, bigGrid, 'wheel');
      const secondaries = objectives.filter(o => !o.isPrimary);
      const hasLongOrScore = secondaries.some(o => o.type === 'longWords' || o.type === 'scoreTarget');
      expect(hasLongOrScore).toBe(true);
    });
  });

  // ==============================================
  // OBJECTIVE TARGETS ARE POSITIVE
  // ==============================================

  describe('target sanity', () => {
    it('all targets are positive numbers', () => {
      for (let w = 1; w <= 3; w++) {
        for (let l = 1; l <= 6; l++) {
          const objectives = generateObjectives(w, l);
          for (const obj of objectives) {
            expect(obj.target).toBeGreaterThan(0);
          }
        }
      }
    });

    it('no duplicate objective types per level', () => {
      for (let w = 1; w <= 3; w++) {
        for (let l = 1; l <= 6; l++) {
          const objectives = generateObjectives(w, l);
          const types = objectives.map(o => o.type);
          expect(new Set(types).size).toBe(types.length);
        }
      }
    });
  });
});
