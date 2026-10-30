import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { MpBonusPill, BONUS_PILL_MS, bonusFromAccepted, recordWordBonus, useMpBonusStore } from '../MpBonusPill';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: Record<string, number>) => (p ? `${k}:${JSON.stringify(p)}` : k) }),
}));

describe('bonusFromAccepted', () => {
  it('reads the comeback bonus', () => {
    expect(bonusFromAccepted({ catchUp: { bonus: 3, pct: 12 } })).toEqual({ kind: 'comeback', pct: 12, points: 3 });
  });
  it('reads the meteor bonus', () => {
    expect(bonusFromAccepted({ meteorBonus: 5 })).toEqual({ kind: 'meteor', points: 5 });
  });
  it('ignores zero or junk values', () => {
    expect(bonusFromAccepted({ meteorBonus: 0 })).toBeNull();
    expect(bonusFromAccepted({ catchUp: { bonus: 0, pct: 10 } })).toBeNull();
    expect(bonusFromAccepted({ catchUp: { bonus: 'x' as never, pct: 10 } })).toBeNull();
    expect(bonusFromAccepted({})).toBeNull();
  });
});

describe('MpBonusPill', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useMpBonusStore.setState({ last: null });
  });
  afterEach(() => vi.useRealTimers());

  it('shows a fresh comeback bonus with its percent, then clears', () => {
    render(<MpBonusPill />);
    act(() => recordWordBonus({ catchUp: { bonus: 2, pct: 15 } }));
    expect(screen.getByTestId('mp-bonus-pill')).toHaveTextContent('mpUi.round.bonusComeback:{"pct":15}');
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
