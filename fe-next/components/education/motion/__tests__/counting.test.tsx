import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { motionPref } from './reducedMotion.mock';
import { tick } from './tick';
import { CountUp } from '../CountUp';
import { StaggerChips, type MotionChip } from '../StaggerChips';
import { BeforeAfterNumber } from '../BeforeAfterNumber';

const chips: MotionChip[] = [
  { id: 'xp', label: 'edu.xp', value: 35, tone: 'yellow' },
  { id: 'acc', label: 'edu.acc', value: 94, tone: 'lime', format: (n) => `${n}%` },
  { id: 'time', label: 'edu.time', value: 238, tone: 'cyan' },
];

beforeEach(() => {
  motionPref.reduced = false;
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe('CountUp', () => {
  it('counts from `from` to `to` and calls onDone once as it lands', () => {
    const onDone = vi.fn();
    render(<CountUp from={18} to={35} durationMs={400} onDone={onDone} />);
    expect(screen.getByText('18')).toBeTruthy();
    tick(200);
    const mid = Number(screen.getByTestId('edu-count-up').textContent);
    expect(mid).toBeGreaterThan(18);
    expect(mid).toBeLessThan(35);
    tick(400);
    expect(screen.getByText('35')).toBeTruthy();
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('snaps to the final value under reduced motion', () => {
    motionPref.reduced = true;
    const onDone = vi.fn();
    render(<CountUp from={4} to={94} format={(n) => `${n}%`} onDone={onDone} />);
    expect(screen.getByText('94%')).toBeTruthy();
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});

describe('StaggerChips', () => {
  it('reveals chips about 0.6s apart and fires onLand per chip as its count lands', () => {
    const onLand = vi.fn();
    render(<StaggerChips chips={chips} staggerMs={600} onLand={onLand} />);
    expect(screen.getAllByTestId('edu-chip')).toHaveLength(1);
    tick(450);
    expect(onLand).toHaveBeenCalledWith(0);
    tick(200);
    expect(screen.getAllByTestId('edu-chip')).toHaveLength(2);
    tick(1200);
    expect(screen.getAllByTestId('edu-chip')).toHaveLength(3);
    expect(onLand.mock.calls.map((c) => c[0])).toEqual([0, 1, 2]);
    expect(screen.getByText('94%')).toBeTruthy();
  });

  it('shows every chip at its final value when instant', () => {
    render(<StaggerChips chips={chips} instant />);
    expect(screen.getAllByTestId('edu-chip')).toHaveLength(3);
    expect(screen.getByText('35')).toBeTruthy();
    expect(screen.getByText('238')).toBeTruthy();
  });

  it('labels each chip with its caller-supplied text', () => {
    render(<StaggerChips chips={chips} instant />);
    expect(screen.getByText('edu.acc')).toBeTruthy();
  });
});

describe('BeforeAfterNumber', () => {
  it('holds yesterday greyed, then snaps to today in gold', () => {
    const onIgnite = vi.fn();
    render(<BeforeAfterNumber before={949} after={950} holdMs={2000} onIgnite={onIgnite} />);
    const el = screen.getByTestId('edu-before-after');
    expect(el.textContent).toContain('949');
    expect(el.getAttribute('data-state')).toBe('before');
    tick(2000);
    expect(el.textContent).toContain('950');
    expect(el.getAttribute('data-state')).toBe('after');
    expect(el.querySelector('.text-neo-yellow')).toBeTruthy();
    expect(onIgnite).toHaveBeenCalledTimes(1);
  });

  it('shows today straight away under reduced motion', () => {
    motionPref.reduced = true;
    render(<BeforeAfterNumber before={3} after={4} />);
    const el = screen.getByTestId('edu-before-after');
    expect(el.getAttribute('data-state')).toBe('after');
    expect(el.textContent).toContain('4');
  });
});
