/**
 * ConnectionsGame — bottom-nav + back-button contract.
 * The Connections game keeps the global mobile bottom nav visible
 * (no `useHideNavigation` call) and renders a back button that routes home.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));

const setIsInGameSpy = vi.fn();
vi.mock('@/contexts/NavigationContext', () => ({
  useHideNavigation: () => setIsInGameSpy,
}));

vi.mock('@/lib/connections/puzzles', () => ({
  getPuzzleForLevel: () => ({
    id: 'p1',
    word1: 'BOOK',
    word2: 'HOLE',
    bridge: 'WORM',
    difficulty: 'easy' as const,
    hint: 'crawls in soil',
  }),
  getTotalLevels: () => 100,
}));

vi.mock('@/lib/connections/levelStore', () => ({
  getCurrentLevel: () => 1,
  setCurrentLevel: vi.fn(),
}));

vi.mock('@/lib/connections/livesStore', () => ({
  getCurrentLives: () => 3,
  setCurrentLives: vi.fn(),
  MAX_LIVES: 3,
}));

vi.mock('@/lib/connections/feedback', () => ({
  submitConnectionsFeedback: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAdmin: false }),
}));

const pushSpy = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushSpy }),
}));

vi.mock('../ConnectionsEffectsCanvas', () => ({ default: () => null }));
vi.mock('../PuzzleCard', () => ({ default: () => <div data-testid="puzzle-card" /> }));
vi.mock('../OutOfLivesModal', () => ({ default: () => null }));

vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));

import ConnectionsGame from '../ConnectionsGame';

describe('ConnectionsGame — bottom-nav + back button', () => {
  it('does NOT hide the global bottom nav (useHideNavigation never invoked)', () => {
    setIsInGameSpy.mockClear();
    render(<ConnectionsGame />);
    expect(setIsInGameSpy).not.toHaveBeenCalled();
  });

  it('renders a back button labelled with common.back', () => {
    render(<ConnectionsGame />);
    expect(screen.getByRole('button', { name: 'common.back' })).toBeInTheDocument();
  });

  it('clicking the back button routes to the locale home', () => {
    pushSpy.mockClear();
    render(<ConnectionsGame />);
    fireEvent.click(screen.getByRole('button', { name: 'common.back' }));
    expect(pushSpy).toHaveBeenCalledWith('/en');
  });
});
