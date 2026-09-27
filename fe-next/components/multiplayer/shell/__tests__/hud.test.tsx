import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MpTimer, formatClock } from '../MpTimer';
import { MpScoreChip } from '../MpScoreChip';
import { MpRankChip } from '../MpRankChip';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k),
  }),
}));
vi.mock('@/components/ui/CircularTimer', () => ({
  default: (props: Record<string, unknown>) => (
    <div data-testid="ring" data-size={String(props.size)} data-key={String(props.timerKey)} data-color={String(props.colorFamily)} />
  ),
}));

describe('formatClock', () => {
  it.each([[0, '0:00'], [5, '0:05'], [65, '1:05'], [600, '10:00'], [-3, '0:00'], [59.6, '1:00']])('%s → %s', (s, out) => {
    expect(formatClock(s)).toBe(out);
  });
});

describe('MpTimer', () => {
  it('shows m:ss from the server seconds and sizes the ring per token', () => {
    render(<MpTimer remainingSec={75} totalSec={120} size="md" />);
    expect(screen.getByTestId('mp-timer-digits').textContent).toBe('1:15');
    expect(screen.getByTestId('ring').getAttribute('data-size')).toBe('44');
  });

  it.each([['sm', '32'], ['md', '44'], ['lg', '72'], ['xl', '96']] as const)('size %s → %spx ring', (size, px) => {
    render(<MpTimer remainingSec={10} totalSec={60} size={size} />);
    expect(screen.getByTestId('ring').getAttribute('data-size')).toBe(px);
  });

  it('turns urgent at 10s and below (pink ring), calm above', () => {
    const { rerender } = render(<MpTimer remainingSec={11} totalSec={60} size="md" colorFamily="cyan" />);
    expect(screen.getByTestId('mp-timer').getAttribute('data-urgent')).toBe('false');
    expect(screen.getByTestId('ring').getAttribute('data-color')).toBe('cyan');
    rerender(<MpTimer remainingSec={10} totalSec={60} size="md" colorFamily="cyan" />);
    expect(screen.getByTestId('mp-timer').getAttribute('data-urgent')).toBe('true');
    expect(screen.getByTestId('ring').getAttribute('data-color')).toBe('pink');
  });

  it('keeps the ring seeded across ordinary 1Hz ticks (resync only on drift)', () => {
    const { rerender } = render(<MpTimer remainingSec={60} totalSec={60} size="md" />);
    const k0 = screen.getByTestId('ring').getAttribute('data-key');
    rerender(<MpTimer remainingSec={59} totalSec={60} size="md" />);
    expect(screen.getByTestId('ring').getAttribute('data-key')).toBe(k0);
    rerender(<MpTimer remainingSec={90} totalSec={120} size="md" />);
    expect(screen.getByTestId('ring').getAttribute('data-key')).not.toBe(k0);
  });

  it('announces time to assistive tech', () => {
    render(<MpTimer remainingSec={42} totalSec={60} size="md" />);
    expect(screen.getByTestId('mp-timer').getAttribute('aria-label')).toContain('mpUi.shell.timeLeft');
  });
});

describe('MpScoreChip', () => {
  it('shows the value and bumps once per new gain id', () => {
    const { rerender } = render(<MpScoreChip value={10} size="md" />);
    const chip = screen.getByTestId('mp-score-chip');
    expect(chip.getAttribute('data-bump')).toBe('');
    rerender(<MpScoreChip value={15} size="md" gain={{ id: 'g1', points: 5 }} />);
    expect(screen.getByTestId('mp-score-chip').getAttribute('data-bump')).toBe('g1');
    expect(screen.getByTestId('mp-score-gain').textContent).toBe('+5');
  });

  it('never shows a gain chip for zero or negative points', () => {
    render(<MpScoreChip value={0} size="md" gain={{ id: 'g2', points: 0 }} />);
    expect(screen.queryByTestId('mp-score-gain')).toBeNull();
  });
});

describe('MpRankChip', () => {
  it('renders #rank/total', () => {
    render(<MpRankChip rank={2} total={4} />);
    expect(screen.getByTestId('mp-rank-chip').textContent).toContain('#2');
    expect(screen.getByTestId('mp-rank-chip').textContent).toContain('/4');
  });

  it('renders a dash while unranked', () => {
    render(<MpRankChip rank={0} total={4} />);
    expect(screen.getByTestId('mp-rank-chip').textContent).toContain('–');
  });

  it('re-keys the flip when flipKey changes', () => {
    const { rerender } = render(<MpRankChip rank={2} total={4} flipKey="a" />);
    const before = screen.getByTestId('mp-rank-value');
    rerender(<MpRankChip rank={3} total={4} flipKey="b" />);
    expect(screen.getByTestId('mp-rank-value')).not.toBe(before);
  });
});

void act;
