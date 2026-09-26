import { describe, it, expect } from 'vitest';
import { detectPasses, detectOvertakes } from '../overtakeDetection';

/** The inverse of `detectOvertakes`: players *I* passed ("You passed {name}!"). */
describe('detectPasses', () => {
  const b = (...rows: Array<[string, number]>) => rows.map(([username, score]) => ({ username, score }));

  it('reports a player who was above me and is now below me', () => {
    const prev = b(['Ana', 10], ['Me', 5], ['Cy', 1]);
    const next = b(['Me', 12], ['Ana', 10], ['Cy', 1]);
    expect(detectPasses(prev, next, 'Me')).toEqual({ myRank: 1, passed: ['Ana'] });
  });

  it('reports every player crossed in one jump, best first', () => {
    const prev = b(['Ana', 10], ['Bo', 8], ['Me', 5]);
    const next = b(['Me', 20], ['Ana', 10], ['Bo', 8]);
    expect(detectPasses(prev, next, 'Me').passed).toEqual(['Ana', 'Bo']);
  });

  it('reports nothing when my rank held or dropped', () => {
    const prev = b(['Ana', 10], ['Me', 5]);
    expect(detectPasses(prev, b(['Ana', 11], ['Me', 6]), 'Me').passed).toEqual([]);
    expect(detectPasses(b(['Me', 10], ['Ana', 5]), b(['Ana', 11], ['Me', 10]), 'Me').passed).toEqual([]);
  });

  it('reports nothing without a previous snapshot or when I am absent', () => {
    expect(detectPasses([], b(['Me', 1]), 'Me')).toEqual({ myRank: 1, passed: [] });
    expect(detectPasses(b(['Ana', 1]), b(['Ana', 2]), 'Me')).toEqual({ myRank: 0, passed: [] });
  });

  it('is the mirror of detectOvertakes for the other player', () => {
    const prev = b(['Ana', 10], ['Me', 5]);
    const next = b(['Me', 12], ['Ana', 10]);
    expect(detectPasses(prev, next, 'Me').passed).toEqual(['Ana']);
    expect(detectOvertakes(prev, next, 'Ana').overtakenBy).toEqual(['Me']);
  });
});
