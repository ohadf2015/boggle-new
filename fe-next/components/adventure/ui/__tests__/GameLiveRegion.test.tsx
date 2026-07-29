/**
 * Tests for GameLiveRegion — A11y audit aria-live (2026-05-01).
 * Verifies word-found announcements without breaking on score-only updates.
 */

import { render, screen } from '@testing-library/react';
import { GameLiveRegion } from '../GameLiveRegion';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      if (key === 'adventure.live.wordFound') {
        return `${params?.word} found, +${params?.points} points`;
      }
      return key;
    },
    language: 'en',
    dir: 'ltr',
  }),
}));

describe('GameLiveRegion', () => {
  it('renders an empty polite live region on mount (no announcement before first word)', () => {
    render(<GameLiveRegion wordsFound={[]} score={0} />);
    const region = screen.getByTestId('game-live-region');
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toHaveAttribute('aria-atomic', 'true');
    expect(region).toHaveAttribute('role', 'status');
    expect(region.textContent).toBe('');
  });

  it('announces newest word + points delta when wordsFound grows', () => {
    const { rerender } = render(<GameLiveRegion wordsFound={[]} score={0} />);
    rerender(<GameLiveRegion wordsFound={['HELLO']} score={50} />);
    expect(screen.getByTestId('game-live-region')).toHaveTextContent('HELLO found, +50 points');
  });

  it('updates message on each subsequent word found', () => {
    const { rerender } = render(<GameLiveRegion wordsFound={[]} score={0} />);
    rerender(<GameLiveRegion wordsFound={['HELLO']} score={50} />);
    rerender(<GameLiveRegion wordsFound={['HELLO', 'WORLD']} score={130} />);
    expect(screen.getByTestId('game-live-region')).toHaveTextContent('WORLD found, +80 points');
  });

  it('does NOT update when only the score changes (e.g. flash bonus)', () => {
    const { rerender } = render(<GameLiveRegion wordsFound={['HELLO']} score={50} />);
    // initial render with 1 word skips announcement (prev count was already 1 from mount)
    expect(screen.getByTestId('game-live-region').textContent).toBe('');
    // Score-only change must not trigger word-found announcement
    rerender(<GameLiveRegion wordsFound={['HELLO']} score={75} />);
    expect(screen.getByTestId('game-live-region').textContent).toBe('');
  });

  it('renders visually hidden (clip + 1px) so sighted players never see it', () => {
    render(<GameLiveRegion wordsFound={[]} score={0} />);
    const region = screen.getByTestId('game-live-region');
    expect(region.style.clip).toBe('rect(0, 0, 0, 0)');
    expect(region.style.width).toBe('1px');
  });
});
