import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BlastBoard } from '../BlastBoard';
import type { BlastLevel } from '@/lib/blast/v2/types';

const level: BlastLevel = {
  id: 't',
  levelNumber: 1,
  theme: 'onboarding',
  locale: 'en',
  words: ['CAT'],
  columns: [{ index: 0, tiles: ['C', 'A', 'T'] }],
  resolvableOrder: ['CAT'],
  tileFlags: {},
  difficulty: 1,
};

describe('BlastBoard onCommitSelection', () => {
  it('reports cleared-cell screen centers when an active drag ends', () => {
    const onCommit = vi.fn();
    const { getByTestId } = render(
      <BlastBoard
        level={level}
        selection={{ kind: 'active', mode: 'drag', cells: ['c0r0', 'c0r1', 'c0r2'] }}
        invalidShakeKey={0}
        onPointerDown={() => {}}
        onPointerEnter={() => {}}
        onPointerUp={() => {}}
        tileIds={[['t-0-0', 't-0-1', 't-0-2']]}
        onCommitSelection={onCommit}
      />,
    );
    expect(getByTestId('blast-board')).toBeTruthy();
    window.dispatchEvent(new PointerEvent('pointerup'));
    expect(onCommit).toHaveBeenCalledTimes(1);
    const centers = onCommit.mock.calls[0][0];
    expect(Array.isArray(centers)).toBe(true);
    expect(centers.length).toBeGreaterThan(0);
    if (centers.length > 0) {
      expect(centers[0]).toHaveProperty('x');
      expect(centers[0]).toHaveProperty('y');
      expect(typeof centers[0].x).toBe('number');
      expect(typeof centers[0].y).toBe('number');
    }
  });

  it('does NOT call onCommitSelection if there is no active selection', () => {
    const onCommit = vi.fn();
    render(
      <BlastBoard
        level={level}
        selection={{ kind: 'idle' }}
        invalidShakeKey={0}
        onPointerDown={() => {}}
        onPointerEnter={() => {}}
        onPointerUp={() => {}}
        tileIds={[['t-0-0', 't-0-1', 't-0-2']]}
        onCommitSelection={onCommit}
      />,
    );
    window.dispatchEvent(new PointerEvent('pointerup'));
    expect(onCommit).not.toHaveBeenCalled();
  });
});
