/**
 * ConnectionsGame nav-hide wiring — hide bottom nav while puzzles are active
 * (status !== 'finished'). Asserts the bottom-nav contract for the
 * Connections game screen.
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));

const setIsInGameSpy = vi.fn();
vi.mock('@/contexts/NavigationContext', () => ({
  useHideNavigation: () => setIsInGameSpy,
}));

vi.mock('@/lib/connections/puzzles', () => ({
  getShuffledPuzzles: () => [
    {
      id: 'p1',
      difficulty: 'easy' as const,
      left: 'red',
      right: 'wood',
      answer: 'redwood',
      hint: 'tree',
    },
  ],
}));

vi.mock('@/lib/connections/feedback', () => ({
  submitConnectionsFeedback: vi.fn(),
}));

vi.mock('../ConnectionsEffectsCanvas', () => ({ default: () => null }));
vi.mock('../PuzzleCard', () => ({ default: () => <div data-testid="puzzle-card" /> }));

vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));

import ConnectionsGame from '../ConnectionsGame';

describe('ConnectionsGame — bottom-nav hide wiring', () => {
  it('mount in active status hides nav (setIsInGame(true))', () => {
    setIsInGameSpy.mockClear();
    render(<ConnectionsGame />);
    expect(setIsInGameSpy).toHaveBeenCalledWith(true);
  });

  it('unmount restores nav (setIsInGame(false))', () => {
    setIsInGameSpy.mockClear();
    const { unmount } = render(<ConnectionsGame />);
    unmount();
    expect(setIsInGameSpy).toHaveBeenLastCalledWith(false);
  });
});
