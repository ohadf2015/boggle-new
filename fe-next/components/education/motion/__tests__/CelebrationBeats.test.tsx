import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { motionPref } from './reducedMotion.mock';
import { tick } from './tick';
import { CelebrationBeats } from '../CelebrationBeats';
import type { MotionChip } from '../StaggerChips';
import { celebrationTimeline } from '@/lib/education/motion/celebrationTimeline';

const chips: MotionChip[] = [
  { id: 'a', label: 'edu.a', value: 35, tone: 'yellow' },
  { id: 'b', label: 'edu.b', value: 94, tone: 'lime' },
  { id: 'c', label: 'edu.c', value: 12, tone: 'cyan' },
];

const renderBeats = (onBeat = vi.fn()) =>
  render(
    <CelebrationBeats
      hero={<span>edu.hero</span>}
      headline="edu.headline"
      chips={chips}
      cta={<button>edu.continue</button>}
      skipLabel="edu.skip"
      onBeat={onBeat}
    />,
  );

const stage = () => screen.getByTestId('edu-celebration').getAttribute('data-beat');

beforeEach(() => {
  motionPref.reduced = false;
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe('CelebrationBeats', () => {
  it('plays hold, hero, pull-back, chips and done in order within 4.5s', () => {
    const onBeat = vi.fn();
    renderBeats(onBeat);
    const t = celebrationTimeline(3);
    expect(stage()).toBe('hold');
    expect(screen.queryByText('edu.hero')).toBeNull();
    tick(t.heroAt);
    expect(stage()).toBe('hero');
    expect(screen.getByText('edu.hero')).toBeTruthy();
    tick(t.pullBackAt - t.heroAt);
    expect(stage()).toBe('pullBack');
    expect(screen.getByText('edu.headline')).toBeTruthy();
    tick(t.chipsAt[0] - t.pullBackAt);
    expect(stage()).toBe('chips');
    tick(4500 - t.chipsAt[0]);
    expect(stage()).toBe('done');
    expect(onBeat.mock.calls.map((c) => c[0])).toEqual(['hero', 'pullBack', 'chips', 'chip', 'chip', 'chip', 'done']);
  });

  it('skips straight to the end state on tap', () => {
    renderBeats();
    fireEvent.click(screen.getByRole('button', { name: 'edu.skip' }));
    expect(stage()).toBe('done');
    expect(screen.getAllByTestId('edu-chip')).toHaveLength(3);
    expect(screen.getByText('94')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'edu.continue' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'edu.skip' })).toBeNull();
  });

  it('opens on the end state under reduced motion', () => {
    motionPref.reduced = true;
    renderBeats();
    expect(stage()).toBe('done');
    expect(screen.getByText('edu.hero')).toBeTruthy();
    expect(screen.getAllByTestId('edu-chip')).toHaveLength(3);
  });

  it('is a dark-only fullscreen layer with no opacity entrance', () => {
    renderBeats();
    const root = screen.getByTestId('edu-celebration');
    expect(root.className).toContain('bg-neo-navy');
    expect(root.className).not.toMatch(/dark:|bg-neo-cream|opacity-0/);
  });
});
