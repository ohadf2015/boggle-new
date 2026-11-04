import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('@/utils/accessibility', () => ({ isReducedMotionPreferred: () => true }));

const gsapCalls: string[] = [];
const record = (name: string) => (..._args: unknown[]) => {
  gsapCalls.push(name);
  return chain;
};
const chain: Record<string, unknown> = new Proxy({}, { get: (_t, prop) => record(`tl.${String(prop)}`) });
vi.mock('gsap', () => ({
  gsap: new Proxy({}, { get: (_t, prop) => record(`gsap.${String(prop)}`) }),
  default: new Proxy({}, { get: (_t, prop) => record(`gsap.${String(prop)}`) }),
}));

import { useWordCraftJuice } from '../useWordCraftJuice';

function el(): HTMLElement {
  const node = document.createElement('div');
  document.body.appendChild(node);
  return node;
}

beforeEach(() => {
  gsapCalls.length = 0;
  document.body.replaceChildren();
});

describe('WordCraft juice under reduced motion', () => {
  it('Given the student prefers reduced motion, When every juice effect fires, Then nothing animates and nothing is added to the page', () => {
    const { result } = renderHook(() => useWordCraftJuice());
    const juice = result.current;
    const a = el();
    const b = el();
    const before = document.body.childElementCount;

    juice.tilePlace(a);
    juice.invalidShake([a, b]);
    juice.scorePop(a, 42);
    juice.botReveal([a, b]);
    juice.rackSelect(a);
    juice.playerCommitReveal([a, b]);
    juice.arcTilePlace(a, b, 'C', 3);
    juice.drawFromSack(a, [b]);
    juice.jokerSparkle(a);
    juice.captureBurst([a, b], '#ff00ff');
    juice.boardImpact(a, 3);

    expect(Object.keys(juice).sort()).toEqual([
      'arcTilePlace', 'boardImpact', 'botReveal', 'captureBurst', 'drawFromSack', 'invalidShake',
      'jokerSparkle', 'playerCommitReveal', 'rackSelect', 'scorePop', 'tilePlace',
    ]);
    expect(gsapCalls).toEqual([]);
    expect(document.body.childElementCount).toBe(before);
  });
});
