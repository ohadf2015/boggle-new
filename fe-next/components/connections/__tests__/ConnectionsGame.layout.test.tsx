/**
 * ConnectionsGame — clean command-bar layout contract.
 *  - Back button is consolidated INTO the sticky HUD bar (no separate row),
 *    so the puzzle sits higher and the top reads as one compact band.
 *  - Daily + Community remain reachable, but as lightweight secondary links
 *    (de-emphasised, not full-width filled CTAs).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));

vi.mock('@/contexts/NavigationContext', () => ({
  useHideNavigation: () => vi.fn(),
}));

const getPuzzleForLevelMock = vi.fn();
vi.mock('@/lib/connections/puzzles', () => ({
  getPuzzleForLevel: (...args: unknown[]) => getPuzzleForLevelMock(...args),
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

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => false,
}));

vi.mock('../ConnectionsEffectsCanvas', () => ({ default: () => null }));
vi.mock('../PuzzleCard', () => ({ default: () => <div data-testid="puzzle-card" /> }));
vi.mock('../OutOfLivesModal', () => ({ default: () => null }));

vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));

import ConnectionsGame from '../ConnectionsGame';

describe('ConnectionsGame — clean command bar', () => {
  beforeEach(() => {
    getPuzzleForLevelMock.mockReturnValue({
      id: 'p1',
      word1: 'BOOK',
      word2: 'HOLE',
      bridge: 'WORM',
      difficulty: 'easy' as const,
    });
  });

  it('places the back button inside the sticky HUD bar (one consolidated band)', () => {
    render(<ConnectionsGame />);
    const back = screen.getByRole('button', { name: 'common.back' });
    const sticky = back.closest('[class*="sticky"]');
    expect(sticky).not.toBeNull();
    expect(sticky?.className).toMatch(/top-0/);
    // Lives/level/score live in that same band.
    expect(sticky?.textContent).toContain('connections.lives');
    expect(sticky?.textContent).toContain('connections.level');
    expect(sticky?.textContent).toContain('connections.score');
  });

  it('keeps Daily + Community reachable as secondary links', () => {
    render(<ConnectionsGame />);
    const daily = screen.getByText('connections.daily.cta').closest('a');
    const community = screen.getByText('connections.community.cta').closest('a');
    expect(daily).toHaveAttribute('href', '/en/connections/daily');
    expect(community).toHaveAttribute('href', '/en/connections/community');
  });
});
