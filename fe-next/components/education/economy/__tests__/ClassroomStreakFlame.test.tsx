import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: Record<string, string | number>) => (p ? `${k}:${JSON.stringify(p)}` : k), language: 'en' }),
}));
vi.mock('@/components/multiplayer/round/MpComboMeter', () => ({
  MpComboMeter: ({ level }: { level: number }) => <span data-testid="mp-combo-meter" data-level={level} />,
}));

import { ClassroomStreakFlame, StreakFlame } from '../ClassroomStreakFlame';
import { publishEconomyStreak, useEconomyStreakStore } from '../streakFlame';

const setUrl = (search: string) => window.history.replaceState(null, '', `/en/multiplayer${search}`);

afterEach(() => {
  cleanup();
  setUrl('');
  useEconomyStreakStore.setState({ streak: 0, multiplier: 1, live: false, hudFlames: 0 });
});

describe('StreakFlame: grows with the streak', () => {
  it('Given no streak, Then nothing renders', () => {
    const { container } = render(<StreakFlame streak={0} multiplier={1} />);
    expect(container).toBeEmptyDOMElement();
  });

  it.each([[1, '1'], [3, '2'], [6, '3']])('Given a streak of %i, Then the flame is tier %s and reads the streak and multiplier', (streak, tier) => {
    render(<StreakFlame streak={streak} multiplier={2} />);
    const flame = screen.getByTestId('streak-flame');
    expect(flame).toHaveAttribute('data-tier', tier);
    expect(flame).toHaveTextContent(String(streak));
    expect(flame).toHaveTextContent('economy.hud.multiplier:{"multiplier":2}');
    expect(flame).toHaveAttribute('aria-label', `economy.hud.streak:{"streak":${streak}}`);
  });

  it('Given a blazing streak, Then the flame grows bigger than a small one', () => {
    const { rerender } = render(<StreakFlame streak={1} multiplier={1} />);
    const small = screen.getByTestId('streak-flame-icon').getAttribute('class');
    rerender(<StreakFlame streak={7} multiplier={3} />);
    expect(screen.getByTestId('streak-flame-icon').getAttribute('class')).not.toBe(small);
  });
});

describe('ClassroomStreakFlame: the HUD badge', () => {
  it('Given a public multiplayer round, Then the HUD keeps its combo meter', () => {
    setUrl('');
    render(<ClassroomStreakFlame comboLevel={3} />);
    expect(screen.getByTestId('mp-combo-meter')).toHaveAttribute('data-level', '3');
    expect(useEconomyStreakStore.getState().hudFlames).toBe(0);
  });

  it('Given a classroom student, Then the HUD shows the class streak flame instead of a second combo number', () => {
    setUrl('?classroom=true');
    render(<ClassroomStreakFlame comboLevel={3} />);
    act(() => publishEconomyStreak({ streak: 4, multiplier: 2 }));
    expect(screen.queryByTestId('mp-combo-meter')).toBeNull();
    expect(screen.getByTestId('streak-flame')).toHaveAttribute('data-tier', '2');
    expect(useEconomyStreakStore.getState().hudFlames).toBe(1);
  });

  it('Given the teacher in the room, Then the HUD keeps the combo meter', () => {
    setUrl('?classroom=true&host=true');
    render(<ClassroomStreakFlame comboLevel={2} />);
    expect(screen.getByTestId('mp-combo-meter')).toBeTruthy();
  });
});
