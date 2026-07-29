/**
 * Near-miss feedback utility tests
 *
 * Pure function: takes objectives array, returns near-miss messages
 * for objectives that were close to completion.
 */
import { getNearMissMessages, type NearMissMessage } from '../nearMiss';
import type { LevelObjective } from '@/types/adventure';

describe('getNearMissMessages', () => {
  it('returns empty array when all objectives are complete', () => {
    const objectives: LevelObjective[] = [
      { type: 'scoreTarget', target: 100, current: 150, isComplete: true },
      { type: 'wordCount', target: 5, current: 7, isComplete: true },
    ];
    expect(getNearMissMessages(objectives)).toEqual([]);
  });

  it('returns empty array when no objectives provided', () => {
    expect(getNearMissMessages([])).toEqual([]);
  });

  // Score: within 20% threshold
  it('returns near-miss for score within 20% of target', () => {
    const objectives: LevelObjective[] = [
      { type: 'scoreTarget', target: 100, current: 85, isComplete: false },
    ];
    const result = getNearMissMessages(objectives);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      type: 'scoreTarget',
      translationKey: 'adventure.nearMiss.scoreAway',
      params: { remaining: 15 },
    });
  });

  it('does NOT return near-miss for score far from target (>20%)', () => {
    const objectives: LevelObjective[] = [
      { type: 'scoreTarget', target: 100, current: 50, isComplete: false },
    ];
    expect(getNearMissMessages(objectives)).toEqual([]);
  });

  it('returns near-miss for score exactly at 80% threshold', () => {
    const objectives: LevelObjective[] = [
      { type: 'scoreTarget', target: 100, current: 80, isComplete: false },
    ];
    const result = getNearMissMessages(objectives);
    expect(result).toHaveLength(1);
    expect(result[0].params.remaining).toBe(20);
  });

  // Word count: within 2 words
  it('returns near-miss for wordCount within 2 words', () => {
    const objectives: LevelObjective[] = [
      { type: 'wordCount', target: 10, current: 9, isComplete: false },
    ];
    const result = getNearMissMessages(objectives);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      type: 'wordCount',
      translationKey: 'adventure.nearMiss.wordsAway',
      params: { remaining: 1 },
    });
  });

  it('returns near-miss for wordCount exactly 2 away', () => {
    const objectives: LevelObjective[] = [
      { type: 'wordCount', target: 10, current: 8, isComplete: false },
    ];
    const result = getNearMissMessages(objectives);
    expect(result).toHaveLength(1);
    expect(result[0].params.remaining).toBe(2);
  });

  it('does NOT return near-miss for wordCount 3+ away', () => {
    const objectives: LevelObjective[] = [
      { type: 'wordCount', target: 10, current: 5, isComplete: false },
    ];
    expect(getNearMissMessages(objectives)).toEqual([]);
  });

  // Long words: within 2
  it('returns near-miss for longWords within 2', () => {
    const objectives: LevelObjective[] = [
      { type: 'longWords', target: 5, current: 4, isComplete: false },
    ];
    const result = getNearMissMessages(objectives);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      type: 'longWords',
      translationKey: 'adventure.nearMiss.wordsAway',
      params: { remaining: 1 },
    });
  });

  // clearIce: within 2
  it('returns near-miss for clearIce within 2', () => {
    const objectives: LevelObjective[] = [
      { type: 'clearIce', target: 6, current: 5, isComplete: false },
    ];
    const result = getNearMissMessages(objectives);
    expect(result).toHaveLength(1);
    expect(result[0].translationKey).toBe('adventure.nearMiss.countAway');
  });

  // Multiple objectives, mixed results
  it('returns near-miss only for close objectives', () => {
    const objectives: LevelObjective[] = [
      { type: 'scoreTarget', target: 200, current: 185, isComplete: false }, // within 20%
      { type: 'wordCount', target: 10, current: 3, isComplete: false }, // too far
    ];
    const result = getNearMissMessages(objectives);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('scoreTarget');
  });

  // current defaults to 0
  it('handles missing current (defaults to 0)', () => {
    const objectives: LevelObjective[] = [
      { type: 'scoreTarget', target: 100, isComplete: false },
    ];
    // 0/100 = 0%, way below 80% threshold
    expect(getNearMissMessages(objectives)).toEqual([]);
  });

  // Edge: target 0
  it('handles target of 0 without crashing', () => {
    const objectives: LevelObjective[] = [
      { type: 'scoreTarget', target: 0, current: 0, isComplete: false },
    ];
    expect(getNearMissMessages(objectives)).toEqual([]);
  });
});
