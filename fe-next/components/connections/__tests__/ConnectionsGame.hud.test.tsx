/**
 * ConnectionsGame — HUD visibility + terminal-state contract.
 *  - Header is sticky-pinned (lives/level/score stay visible on scroll).
 *  - When the player clears every level (getPuzzleForLevel → null AND level > 1)
 *    we render the victory card, NOT the generic noAccess fallback.
 *  - When the locale has zero puzzles from the start we still render noAccess.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));

vi.mock('@/contexts/NavigationContext', () => ({
  useHideNavigation: () => vi.fn(),
}));

const getPuzzleForLevelMock = vi.fn();
const getTotalLevelsMock = vi.fn(() => 100);
vi.mock('@/lib/connections/puzzles', () => ({
  getPuzzleForLevel: (...args: unknown[]) => getPuzzleForLevelMock(...args),
  getTotalLevels: () => getTotalLevelsMock(),
}));

const getCurrentLevelMock = vi.fn(() => 1);
const setCurrentLevelMock = vi.fn();
vi.mock('@/lib/connections/levelStore', () => ({
  getCurrentLevel: () => getCurrentLevelMock(),
  setCurrentLevel: (...args: unknown[]) => setCurrentLevelMock(...args),
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

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const reducedMotionMock = vi.fn(() => false);
vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => reducedMotionMock(),
}));

vi.mock('../ConnectionsEffectsCanvas', () => ({ default: () => null }));
vi.mock('../PuzzleCard', () => ({ default: () => <div data-testid="puzzle-card" /> }));
vi.mock('../OutOfLivesModal', () => ({ default: () => null }));

vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));

import ConnectionsGame from '../ConnectionsGame';

describe('ConnectionsGame — sticky HUD', () => {
  beforeEach(() => {
    getPuzzleForLevelMock.mockReturnValue({
      id: 'p1',
      word1: 'BOOK',
      word2: 'HOLE',
      bridge: 'WORM',
      difficulty: 'easy' as const,
    });
    getCurrentLevelMock.mockReturnValue(1);
  });

  it('header has sticky positioning so HUD stays visible during scroll / mobile keyboard', () => {
    const { container } = render(<ConnectionsGame />);
    // Find the lives label and walk up to the header row.
    const livesLabel = screen.getByText('connections.lives');
    const header = livesLabel.closest('[class*="sticky"]');
    expect(header).not.toBeNull();
    expect(header?.className).toMatch(/sticky/);
    expect(header?.className).toMatch(/top-0/);
    expect(container).toBeTruthy();
  });

  it('renders lives / level / score labels in the HUD', () => {
    render(<ConnectionsGame />);
    expect(screen.getByText('connections.lives')).toBeInTheDocument();
    expect(screen.getByText('connections.level')).toBeInTheDocument();
    expect(screen.getByText('connections.score')).toBeInTheDocument();
  });
});

describe('ConnectionsGame — terminal states', () => {
  it('renders the victory celebration when the player has cleared every level', () => {
    // Player advanced to level 5 then ran out of puzzles.
    getCurrentLevelMock.mockReturnValue(5);
    getTotalLevelsMock.mockReturnValue(4);
    getPuzzleForLevelMock.mockReturnValue(null);

    render(<ConnectionsGame />);

    // Victory card uses connections.finished + connections.playAgain CTA.
    expect(screen.getByText('connections.finished')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'connections.playAgain' })).toBeInTheDocument();
    // The generic noAccess fallback must NOT be shown.
    expect(screen.queryByText('connections.noAccess')).not.toBeInTheDocument();
  });

  it('Play Again button resets level to 1 in storage', () => {
    getCurrentLevelMock.mockReturnValue(5);
    getTotalLevelsMock.mockReturnValue(4);
    getPuzzleForLevelMock.mockReturnValue(null);
    setCurrentLevelMock.mockClear();

    render(<ConnectionsGame />);
    fireEvent.click(screen.getByRole('button', { name: 'connections.playAgain' }));

    expect(setCurrentLevelMock).toHaveBeenCalledWith('en', 1);
  });

  it('skips life-loss particle bursts when prefers-reduced-motion is set', () => {
    reducedMotionMock.mockReturnValue(true);
    getCurrentLevelMock.mockReturnValue(1);
    getTotalLevelsMock.mockReturnValue(100);
    getPuzzleForLevelMock.mockReturnValue({
      id: 'p1', word1: 'A', word2: 'B', bridge: 'C', difficulty: 'easy' as const,
    });
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    render(<ConnectionsGame />);
    // No connections:* events should be dispatched on mount.
    const connectionsEvents = dispatchSpy.mock.calls
      .map((call) => (call[0] as Event).type)
      .filter((type) => type.startsWith('connections:'));
    expect(connectionsEvents).toEqual([]);
    dispatchSpy.mockRestore();
    reducedMotionMock.mockReturnValue(false);
  });

  it('still falls back to noAccess when the locale has no puzzles at all', () => {
    // Fresh install on a locale with zero puzzles → level=1, getPuzzleForLevel=null.
    getCurrentLevelMock.mockReturnValue(1);
    getTotalLevelsMock.mockReturnValue(0);
    getPuzzleForLevelMock.mockReturnValue(null);

    render(<ConnectionsGame />);

    expect(screen.getByText('connections.noAccess')).toBeInTheDocument();
    expect(screen.queryByText('connections.finished')).not.toBeInTheDocument();
  });
});
