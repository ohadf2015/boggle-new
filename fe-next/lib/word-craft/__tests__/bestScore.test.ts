import { describe, it, expect, beforeEach } from 'vitest';
import { readBest, recordBest } from '../bestScore';

beforeEach(() => {
  localStorage.clear();
});

describe('wordcraft bestScore', () => {
  it('reads 0 when nothing was ever recorded', () => {
    expect(readBest('territory')).toBe(0);
  });

  it('records the first positive score as a new best', () => {
    const r = recordBest('territory', 42);
    expect(r).toEqual({ best: 42, isNewBest: true });
    expect(readBest('territory')).toBe(42);
  });

  it('keeps the prior best and flags not-new when the score is lower', () => {
    recordBest('territory', 100);
    const r = recordBest('territory', 60);
    expect(r).toEqual({ best: 100, isNewBest: false });
    expect(readBest('territory')).toBe(100);
  });

  it('beats the prior best', () => {
    recordBest('territory', 50);
    const r = recordBest('territory', 75);
    expect(r).toEqual({ best: 75, isNewBest: true });
  });

  it('never treats a zero/negative score as a best', () => {
    expect(recordBest('territory', 0)).toEqual({ best: 0, isNewBest: false });
    expect(readBest('territory')).toBe(0);
  });

  it('keeps modes independent', () => {
    recordBest('territory', 80);
    expect(readBest('classic')).toBe(0);
    recordBest('classic', 30);
    expect(readBest('territory')).toBe(80);
    expect(readBest('classic')).toBe(30);
  });

  it('survives a corrupt stored value', () => {
    localStorage.setItem('wc_best_territory', 'not-a-number');
    expect(readBest('territory')).toBe(0);
    expect(recordBest('territory', 10)).toEqual({ best: 10, isNewBest: true });
  });
});
