import { describe, it, expect } from 'vitest';
import { buildProgressNodes, chestState, earnedMedal } from '../progressTrack';

describe('buildProgressNodes — the fill-toward-a-chest track', () => {
  it('marks solved nodes done, the active node current, the rest todo', () => {
    const nodes = buildProgressNodes(5, 2, new Set([0, 1]));
    expect(nodes.map((n) => n.state)).toEqual(['done', 'done', 'current', 'todo', 'todo']);
  });

  it('a solved-but-not-current node stays done even if currentIndex moved back', () => {
    const nodes = buildProgressNodes(5, 1, new Set([0, 2]));
    expect(nodes.map((n) => n.state)).toEqual(['done', 'current', 'done', 'todo', 'todo']);
  });

  it('produces exactly `total` nodes', () => {
    expect(buildProgressNodes(5, 0, new Set()).length).toBe(5);
  });
});

describe('chestState — the carrot at the end of the track', () => {
  it('is locked while puzzles remain', () => {
    expect(chestState(2, 5, false)).toBe('locked');
  });
  it('is ready when all solved but the run is not yet finalized', () => {
    expect(chestState(5, 5, false)).toBe('ready');
  });
  it('opens once the run is finished', () => {
    expect(chestState(5, 5, true)).toBe('open');
  });
  it('still opens on finish even if not all solved (you reached the end)', () => {
    expect(chestState(3, 5, true)).toBe('open');
  });
});

describe('earnedMedal — the keepsake for how well you did', () => {
  it('gold for a clean sweep', () => {
    expect(earnedMedal(5, 5)).toBe('gold');
  });
  it('silver at 80%+', () => {
    expect(earnedMedal(4, 5)).toBe('silver');
  });
  it('bronze at 50%+', () => {
    expect(earnedMedal(3, 5)).toBe('bronze');
  });
  it('none below half', () => {
    expect(earnedMedal(2, 5)).toBe('none');
    expect(earnedMedal(0, 5)).toBe('none');
  });
});
