import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const track = vi.fn();
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: (...a: unknown[]) => track(...a) }));

import { BestMissedWordLine, RewardLine } from '../ResultsLines';

const t = (key: string, params?: Record<string, string | number>) =>
  `${key}${params ? ` ${JSON.stringify(params)}` : ''}`;

describe('BestMissedWordLine', () => {
  beforeEach(() => track.mockClear());

  it('Given a missed word, When rendered, Then shows one line with word, letters and points', () => {
    render(<BestMissedWordLine best={{ word: 'stranger', letters: 8, points: 500 }} mode="solo" language="en" t={t} />);
    const line = screen.getByTestId('best-missed-word');
    expect(line.textContent).toContain('results.bestMissedWord');
    expect(line.textContent).toContain('"word":"STRANGER"');
    expect(line.textContent).toContain('"letters":8');
    expect(line.textContent).toContain('"points":500');
  });

  it('Given a missed word, When rendered twice, Then best_missed_word_shown fires once with length, points and mode', () => {
    const { rerender } = render(<BestMissedWordLine best={{ word: 'stranger', letters: 8, points: 500 }} mode="multiplayer" language="en" t={t} />);
    rerender(<BestMissedWordLine best={{ word: 'stranger', letters: 8, points: 500 }} mode="multiplayer" language="en" t={t} />);
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith('best_missed_word_shown', { word_length: 8, points: 500, mode: 'multiplayer' });
  });

  it('Given no missed word, When rendered, Then renders nothing and tracks nothing', () => {
    const { container } = render(<BestMissedWordLine best={null} mode="solo" language="en" t={t} />);
    expect(container.firstChild).toBeNull();
    expect(track).not.toHaveBeenCalled();
  });
});

describe('RewardLine', () => {
  beforeEach(() => track.mockClear());

  it('Given coins and XP, When rendered, Then shows a single "+N coins · +N XP" line', () => {
    render(<RewardLine coins={30} xp={120} mode="multiplayer" t={t} />);
    const line = screen.getByTestId('results-reward-line');
    expect(line.textContent).toContain('+30');
    expect(line.textContent).toContain('results.rewardLine.coins');
    expect(line.textContent).toContain('·');
    expect(line.textContent).toContain('+120');
    expect(line.textContent).toContain('results.rewardLine.xp');
    // "+N" stays an LTR island so Hebrew never reads "N+".
    expect(screen.getByTestId('results-reward-coins').querySelector('[dir="ltr"]')?.textContent).toBe('+30');
    expect(track).toHaveBeenCalledWith('results_reward_line_shown', { coins: 30, xp: 120, mode: 'multiplayer' });
  });

  it('Given only coins, When rendered, Then shows coins without a separator', () => {
    render(<RewardLine coins={12} xp={null} mode="solo" t={t} />);
    const line = screen.getByTestId('results-reward-line');
    expect(line.textContent).not.toContain('·');
    expect(line.textContent).not.toContain('rewardLine.xp');
  });

  it('Given nothing earned, When rendered, Then renders nothing and tracks nothing', () => {
    const { container } = render(<RewardLine coins={0} xp={null} mode="solo" t={t} />);
    expect(container.firstChild).toBeNull();
    expect(track).not.toHaveBeenCalled();
  });
});
