import { describe, it, expect, beforeEach } from 'vitest';
import { readLocalBest, recordLocalBest } from '../localBest';

describe('local best (guests)', () => {
  beforeEach(() => window.localStorage.clear());

  it('keeps only the highest score per difficulty', () => {
    recordLocalBest('medium', 400);
    recordLocalBest('medium', 250);
    recordLocalBest('hard', 900);
    expect(readLocalBest('medium')).toBe(400);
    expect(readLocalBest('hard')).toBe(900);
  });

  it('is null when nothing was played or the stored value is junk', () => {
    expect(readLocalBest('medium')).toBeNull();
    window.localStorage.setItem('blast:best:v1:medium', 'oops');
    expect(readLocalBest('medium')).toBeNull();
  });
});
