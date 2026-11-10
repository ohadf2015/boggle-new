import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ReturningHome } from '../ReturningHome';

const challengeProps = vi.fn();

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ profile: null, user: null, loading: false }),
}));
vi.mock('@/hooks/useMobilePortrait', () => ({ useMobilePortrait: () => true }));
vi.mock('@/hooks/useLiveRoomStats', () => ({ useLiveRoomStats: () => ({ activePlayers: 0 }) }));
vi.mock('@/hooks/usePlayerStats', () => ({ usePlayerStats: () => ({ allTimeBest: null }) }));
vi.mock('@/hooks/useDailyChallengeStatus', () => ({
  useDailyChallengeStatus: () => ({ hasPlayed: false, hasSolved: null, currentStreak: 0, puzzleNumber: 1, loading: false }),
}));
vi.mock('@/hooks/useWeeklyChest', () => ({ useWeeklyChest: () => ({ cycleStart: '', currentStreak: 0 }) }));
vi.mock('@/hooks/useEvents', () => ({ useEvents: () => ({ activeEvents: [], myEvents: [], joinEvent: vi.fn() }) }));
vi.mock('@/utils/perfVariant', () => ({ getPerfVariant: () => 'lite' }));
vi.mock('../home/HomeTopBar', () => ({ HomeTopBar: () => <div data-testid="slot-topbar" /> }));
vi.mock('../home/HomeDailyHero', () => ({ HomeDailyHero: () => <div data-testid="slot-daily" /> }));
vi.mock('../home/HomeAdventureCard', () => ({ HomeAdventureCard: () => <div data-testid="slot-adventure" /> }));
vi.mock('../LandingChallengeCards', () => ({
  LandingChallengeCards: (props: Record<string, unknown>) => {
    challengeProps(props);
    return <div data-testid="slot-modes" />;
  },
}));
vi.mock('@/components/education/HomeEducationCardConnected', () => ({
  HomeEducationCardConnected: () => <div data-testid="slot-edu" />,
}));

describe('ReturningHome — Adventure card', () => {
  it('Given a returning player, then the Adventure card sits between the daily hero and the mode grid, and the grid drops its duplicate tile', () => {
    render(<ReturningHome />);
    const order = Array.from(document.querySelectorAll('[data-testid^="slot-"]')).map((el) => el.getAttribute('data-testid'));
    expect(order).toEqual(['slot-topbar', 'slot-daily', 'slot-adventure', 'slot-modes', 'slot-edu']);
    expect(screen.getByTestId('slot-adventure')).toBeInTheDocument();
    expect(challengeProps).toHaveBeenCalledWith(expect.objectContaining({ hideAdventure: true }));
  });
});
