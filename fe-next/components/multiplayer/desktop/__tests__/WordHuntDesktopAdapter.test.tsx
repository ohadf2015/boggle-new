import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WordHuntDesktopAdapter } from '../WordHuntDesktopAdapter';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

describe('WordHuntDesktopAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders shell with mode=word-hunt badge + target category', () => {
    render(
      <WordHuntDesktopAdapter
        roomId="r1"
        leaderboard={[]}
        foundWords={[]}
        remainingTime={30}
        totalTime={60}
        targetCategory="animals"
        canvas={<div data-testid="hunt-canvas" />}
      />,
    );
    expect(screen.getByTestId('hunt-mode-badge')).toBeInTheDocument();
    expect(screen.getByTestId('category-banner-value')).toHaveTextContent(/animals/i);
    expect(screen.getByTestId('hunt-canvas')).toBeInTheDocument();
  });

  it('handles empty target category gracefully', () => {
    render(
      <WordHuntDesktopAdapter
        roomId="r1"
        leaderboard={[]}
        foundWords={[]}
        remainingTime={30}
        totalTime={60}
        targetCategory=""
        canvas={<div />}
      />,
    );
    expect(screen.getByTestId('category-banner')).toBeInTheDocument();
    expect(screen.getByTestId('category-banner-value').textContent).toBe('—');
  });

  it('shows the unified Close Race rivals panel in a large lobby (genuine subset)', () => {
    render(
      <WordHuntDesktopAdapter
        roomId="r1"
        leaderboard={[
          { userId: 'u1', username: 'Alpha', score: 100, status: 'connected' as const },
          { userId: 'u2', username: 'Beta', score: 90, status: 'connected' as const },
          { userId: 'u3', username: 'Gamma', score: 80, status: 'connected' as const },
          { userId: 'u4', username: 'Delta', score: 70, status: 'connected' as const },
          { userId: 'u5', username: 'Epsilon', score: 60, status: 'connected' as const },
          { userId: 'u6', username: 'Zeta', score: 50, status: 'connected' as const },
        ]}
        meId="u3"
        foundWords={[]}
        remainingTime={30}
        totalTime={60}
        targetCategory="animals"
        canvas={<div />}
      />,
    );
    expect(screen.getByTestId('closest-rivals-panel')).toBeInTheDocument();
  });

  it('omits the rivals panel in a small lobby (it would just dupe the roster)', () => {
    render(
      <WordHuntDesktopAdapter
        roomId="r1"
        leaderboard={[
          { userId: 'u1', username: 'Alpha', score: 100, status: 'connected' as const },
          { userId: 'u2', username: 'Beta', score: 50, status: 'connected' as const },
        ]}
        meId="u2"
        foundWords={[]}
        remainingTime={30}
        totalTime={60}
        targetCategory="animals"
        canvas={<div />}
      />,
    );
    expect(screen.queryByTestId('closest-rivals-panel')).not.toBeInTheDocument();
  });
});
