import { describe, it, expect, vi } from 'vitest';
import { pickRichestBoard } from '../boardSelection';

type Grid = string[][];

const g = (id: number): Grid => [[`g${id}`]];

describe('pickRichestBoard', () => {
  it('returns the highest-scoring grid from k candidates', () => {
    const grids = [g(1), g(2), g(3), g(4)];
    const scores = [10, 50, 30, 25];
    const generate = vi.fn(() => grids.shift()!);
    const score = vi.fn(() => scores.shift()!);

    const result = pickRichestBoard({ generate, score, k: 4 });

    expect(result).toEqual(g(2));
    expect(generate).toHaveBeenCalledTimes(4);
    expect(score).toHaveBeenCalledTimes(4);
  });

  it('early-exits when floor is met', () => {
    const grids = [g(1), g(2), g(3), g(4)];
    const scores = [5, 100, 999, 999];
    const generate = vi.fn(() => grids.shift()!);
    const score = vi.fn(() => scores.shift()!);

    const result = pickRichestBoard({ generate, score, k: 4, floor: 50 });

    expect(result).toEqual(g(2));
    expect(generate).toHaveBeenCalledTimes(2);
    expect(score).toHaveBeenCalledTimes(2);
  });

  it('returns best-found when no candidate clears the floor', () => {
    const scores = [10, 20, 15, 5];
    let i = 0;
    const generate = vi.fn(() => g(i + 1));
    const score = vi.fn(() => scores[i++]);

    const result = pickRichestBoard({ generate, score, k: 4, floor: 999 });

    expect(result).toEqual(g(2));
    expect(generate).toHaveBeenCalledTimes(4);
  });

  it('handles k=1 by returning the single candidate without scoring', () => {
    const generate = vi.fn(() => g(1));
    const score = vi.fn(() => 0);

    const result = pickRichestBoard({ generate, score, k: 1 });

    expect(result).toEqual(g(1));
    expect(generate).toHaveBeenCalledTimes(1);
    expect(score).not.toHaveBeenCalled();
  });

  it('returns the first candidate if scorer throws', () => {
    const generate = vi.fn(() => g(1));
    const score = vi.fn(() => { throw new Error('solver fail'); });

    const result = pickRichestBoard({ generate, score, k: 5 });

    expect(result).toEqual(g(1));
  });
});
