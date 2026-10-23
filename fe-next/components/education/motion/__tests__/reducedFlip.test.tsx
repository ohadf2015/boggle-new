import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { motionPref } from './reducedMotion.mock';
import { tick } from './tick';
import { CountUp } from '../CountUp';
import { CelebrationBeats } from '../CelebrationBeats';
import { BeforeAfterNumber } from '../BeforeAfterNumber';
import type { MotionChip } from '../StaggerChips';

const chips: MotionChip[] = [{ id: 'a', label: 'edu.a', value: 35, tone: 'yellow' }];

beforeEach(() => {
  motionPref.reduced = true;
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe('reduced motion resolving to false after mount (SSR snapshot is reduced)', () => {
  it('CountUp never drops back below its landed value or dings twice', () => {
    const onDone = vi.fn();
    const { rerender } = render(<CountUp from={0} to={35} onDone={onDone} />);
    motionPref.reduced = false;
    rerender(<CountUp from={0} to={35} onDone={onDone} />);
    const seen: number[] = [];
    for (let i = 0; i < 10; i++) {
      tick(50);
      seen.push(Number(screen.getByTestId('edu-count-up').textContent));
    }
    expect(Math.min(...seen)).toBe(35);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('CelebrationBeats stays on its end state instead of replaying backwards', () => {
    const el = (
      <CelebrationBeats hero={<span>edu.hero</span>} chips={chips} cta={<button>edu.go</button>} skipLabel="edu.skip" />
    );
    const { rerender } = render(el);
    motionPref.reduced = false;
    rerender(<CelebrationBeats hero={<span>edu.hero</span>} chips={chips} cta={<button>edu.go</button>} skipLabel="edu.skip" />);
    tick(5000);
    expect(screen.getByTestId('edu-celebration').getAttribute('data-beat')).toBe('done');
    expect(screen.getAllByTestId('edu-chip')).toHaveLength(1);
  });

  it('BeforeAfterNumber does not re-ignite once it already shows today', () => {
    const onIgnite = vi.fn();
    const { rerender } = render(<BeforeAfterNumber before={1} after={2} onIgnite={onIgnite} />);
    motionPref.reduced = false;
    rerender(<BeforeAfterNumber before={1} after={2} onIgnite={onIgnite} />);
    tick(2500);
    expect(screen.getByTestId('edu-before-after').getAttribute('data-state')).toBe('after');
    expect(onIgnite).not.toHaveBeenCalled();
  });
});
