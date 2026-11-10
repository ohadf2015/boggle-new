import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const replace = vi.fn();
const useAuth = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => useAuth() }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguageSafe: () => ({ language: 'en', t: (_k: string, f?: string) => f ?? _k }),
}));
vi.mock('@/components/wordTowerV2/WordTowerV2', () => ({
  default: () => <div data-testid="word-tower-v2" />,
}));

import { WordTowerV2PageClient } from '../PageClient';

beforeEach(() => {
  replace.mockClear();
});

describe('WordTowerV2PageClient public access', () => {
  it('given an ordinary player, when opened, then the game renders without redirect', async () => {
    useAuth.mockReturnValue({ canSeeInWorkModes: false, loading: false, user: null, profile: null });

    render(<WordTowerV2PageClient />);

    // next/dynamic resolves the chunk asynchronously, so the game appears a
    // tick after mount rather than synchronously.
    expect(await screen.findByTestId('word-tower-v2')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('given auth still resolving, when opened, then it waits instead of rendering', () => {
    useAuth.mockReturnValue({ loading: true, user: null, profile: null });

    render(<WordTowerV2PageClient />);

    expect(screen.queryByTestId('word-tower-v2')).not.toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('given a signed-in player whose profile has not landed, when opened, then it waits instead of rendering', () => {
    // loading alone is not enough: TOKEN_REFRESHED / cross-tab sync set loading
    // false with profile still null. The game waits for profile to land.
    useAuth.mockReturnValue({
      loading: false,
      user: { id: 'player-1' },
      profile: null,
    });

    render(<WordTowerV2PageClient />);

    expect(screen.queryByTestId('word-tower-v2')).not.toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('given auth still resolving, then it holds the game space so the page below does not jump', () => {
    useAuth.mockReturnValue({ loading: true, user: null, profile: null });

    render(<WordTowerV2PageClient />);

    expect(screen.getByTestId('word-tower-stage')).toBeInTheDocument();
  });

  it('given the game is up, when auth briefly re-resolves, then the game stays mounted', async () => {
    useAuth.mockReturnValue({ loading: false, user: { id: 'player-1' }, profile: { id: 'player-1' } });
    const { rerender } = render(<WordTowerV2PageClient />);
    const game = await screen.findByTestId('word-tower-v2');

    useAuth.mockReturnValue({ loading: false, user: { id: 'player-1' }, profile: null });
    rerender(<WordTowerV2PageClient />);

    expect(screen.getByTestId('word-tower-v2')).toBe(game);
  });
});
