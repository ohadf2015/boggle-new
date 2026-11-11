import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { MpBonusPill, BONUS_PILL_MS, bonusFromAccepted, recordWordBonus, useMpBonusStore } from '../MpBonusPill';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: Record<string, number>) => (p ? `${k}:${JSON.stringify(p)}` : k) }),
}));

describe('bonusFromAccepted', () => {
  it('given the server sends pct as a fraction, when a comeback pays, then the bonus carries its points', () => {
    expect(bonusFromAccepted({ catchUp: { bonus: 3, pct: 0.12 } })).toEqual({ kind: 'comeback', points: 3 });
  });
  it('given a 1-point floor bonus on a short word, when it pays, then it still shows', () => {
    expect(bonusFromAccepted({ catchUp: { bonus: 1, pct: 0.04 } })).toEqual({ kind: 'comeback', points: 1 });
  });
  it('reads the meteor bonus', () => {
    expect(bonusFromAccepted({ meteorBonus: 5 })).toEqual({ kind: 'meteor', points: 5 });
  });
  it('ignores zero or junk values', () => {
    expect(bonusFromAccepted({ meteorBonus: 0 })).toBeNull();
    expect(bonusFromAccepted({ catchUp: { bonus: 0, pct: 0.1 } })).toBeNull();
    expect(bonusFromAccepted({ catchUp: { bonus: 'x' as never, pct: 0.1 } })).toBeNull();
    expect(bonusFromAccepted({})).toBeNull();
  });
});

describe('MpBonusPill', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useMpBonusStore.setState({ last: null });
  });
  afterEach(() => vi.useRealTimers());

  it('shows a fresh comeback bonus with the points the server paid, then clears', () => {
    render(<MpBonusPill />);
    act(() => recordWordBonus({ catchUp: { bonus: 2, pct: 0.15 } }));
    expect(screen.getByTestId('mp-bonus-pill')).toHaveTextContent('mpUi.round.bonusComebackPoints:{"points":2}');
    act(() => { vi.advanceTimersByTime(BONUS_PILL_MS + 10); });
    expect(screen.queryByTestId('mp-bonus-pill')).toBeNull();
  });

  it('shows a meteor bonus', () => {
    render(<MpBonusPill />);
    act(() => recordWordBonus({ meteorBonus: 6 }));
    expect(screen.getByTestId('mp-bonus-pill')).toHaveTextContent('mpUi.round.bonusMeteor:{"points":6}');
  });

  it('never shows a bonus from before it mounted (a previous round)', () => {
    act(() => recordWordBonus({ meteorBonus: 6 }));
    vi.advanceTimersByTime(5);
    render(<MpBonusPill />);
    expect(screen.queryByTestId('mp-bonus-pill')).toBeNull();
  });

  it('does not block input and is hidden from the tab order', () => {
    render(<MpBonusPill />);
    act(() => recordWordBonus({ meteorBonus: 6 }));
    const wrap = screen.getByTestId('mp-bonus-pill').parentElement!;
    expect(wrap.className).toContain('pointer-events-none');
  });
});
