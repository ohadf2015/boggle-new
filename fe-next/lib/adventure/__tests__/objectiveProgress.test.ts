/**
 * objectiveProgress — shared pure helpers for objective progress, label, and
 * primary-objective selection. Previously this logic was duplicated across
 * AdventureObjectives / GameSidebar / ObjectiveProgress.
 */

import { describe, it, expect } from 'vitest';
import type { LevelObjective } from '@/types/adventure';
import {
  getObjectiveProgress,
  getObjectiveLabel,
  selectPrimaryObjective,
} from '../objectiveProgress';

const obj = (o: Partial<LevelObjective> = {}): LevelObjective => ({
  type: 'wordCount',
  target: 10,
  current: 0,
  ...o,
});

describe('getObjectiveProgress', () => {
  it('computes a clamped percentage and current/target', () => {
    const p = getObjectiveProgress(obj({ current: 5, target: 10 }));
    expect(p.current).toBe(5);
    expect(p.target).toBe(10);
    expect(p.pct).toBe(50);
    expect(p.isComplete).toBe(false);
  });

  it('clamps percentage at 100 when current exceeds target', () => {
    const p = getObjectiveProgress(obj({ current: 20, target: 10 }));
    expect(p.pct).toBe(100);
    expect(p.isComplete).toBe(true);
  });

  it('treats current >= target as complete even without isComplete flag', () => {
    expect(getObjectiveProgress(obj({ current: 10, target: 10 })).isComplete).toBe(true);
  });

  it('honors an explicit isComplete flag', () => {
    expect(getObjectiveProgress(obj({ current: 0, target: 10, isComplete: true })).isComplete).toBe(true);
  });

  it('defaults missing current to 0 and avoids divide-by-zero', () => {
    const p = getObjectiveProgress({ type: 'wordCount', target: 0 } as LevelObjective);
    expect(p.current).toBe(0);
    expect(p.pct).toBe(0);
  });
});

describe('getObjectiveLabel', () => {
  const t = (key: string, params?: Record<string, unknown>) =>
    params ? `${key}|${JSON.stringify(params)}` : key;

  it('maps objective type to its translation key with target param', () => {
    expect(getObjectiveLabel(obj({ type: 'scoreTarget', target: 500 }), t)).toBe(
      'adventure.objectives.scoreTarget|{"target":500}'
    );
  });

  it('falls back to the raw type when no key mapping exists', () => {
    const label = getObjectiveLabel({ type: 'unknownThing' as never, target: 3 }, (k) => k);
    expect(label).toBe('unknownThing');
  });
});

describe('selectPrimaryObjective', () => {
  it('returns null for empty/missing list', () => {
    expect(selectPrimaryObjective([])).toBeNull();
    expect(selectPrimaryObjective(undefined as never)).toBeNull();
  });

  it('prefers an incomplete primary objective', () => {
    const a = obj({ type: 'wordCount', isPrimary: false, current: 1 });
    const b = obj({ type: 'scoreTarget', isPrimary: true, current: 0, target: 500 });
    expect(selectPrimaryObjective([a, b])).toBe(b);
  });

  it('falls back to a completed primary when all primaries are done', () => {
    const done = obj({ type: 'scoreTarget', isPrimary: true, current: 500, target: 500 });
    const secondary = obj({ type: 'wordCount', isPrimary: false, current: 0 });
    expect(selectPrimaryObjective([done, secondary])).toBe(done);
  });

  it('falls back to first incomplete when no primary flagged', () => {
    const completed = obj({ type: 'wordCount', current: 10, target: 10 });
    const active = obj({ type: 'scoreTarget', current: 0, target: 500 });
    expect(selectPrimaryObjective([completed, active])).toBe(active);
  });
});
