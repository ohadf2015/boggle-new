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

  it('shows the unified Close Race rivals panel when "me" is in the lobby', () => {
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
    expect(screen.getByTestId('closest-rivals-panel')).toBeInTheDocument();
  });
});
