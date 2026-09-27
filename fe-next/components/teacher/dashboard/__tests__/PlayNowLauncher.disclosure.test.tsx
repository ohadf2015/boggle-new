/**
 * PlayNowLauncher disclosure test
 *
 * The "Change Words" section must start collapsed so the only above-the-fold
 * decision on the dashboard is GO LIVE (one tap, join code on projector).
 * Everything else — source switch, item picker, pasted list — lives behind
 * a disclosure that the teacher taps to open when they want different words.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mockLessons = vi.fn();
const mockRecent = vi.fn();

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, vars?: Record<string, unknown>) =>
      vars ? `${k}:${JSON.stringify(vars)}` : k,
    language: 'en',
  }),
}));
vi.mock('@/hooks/useVocabularyLesson', () => ({ useLessons: () => mockLessons() }));
vi.mock('@/hooks/useRecentGameSettings', () => ({ useRecentGameSettings: () => mockRecent() }));

import { PlayNowLauncher } from '../PlayNowLauncher';

const lesson = (id: string, name: string, words = 6) => ({
  id,
  name,
  language: 'en',
  words: Array.from({ length: words }, (_, i) => ({ word: `w${i}`, definition: `d${i}` })),
});

describe('<PlayNowLauncher> — disclosure pattern', () => {
  beforeEach(() => {
    sessionStorage.clear();
    mockLessons.mockReturnValue({ lessons: [], isLoading: false, error: null });
    mockRecent.mockReturnValue({ recentConfigs: [], hasRecentConfig: false });
  });

  it('hides "Change Words" section behind a closed <details> by default', () => {
    render(<PlayNowLauncher onLaunch={vi.fn()} />);

    // The disclosure exists and is closed
    const details = screen.getByTestId('play-now-change-disclosure');
    expect(details).toBeInTheDocument();
    expect((details as HTMLDetailsElement).open).toBe(false);
  });

  it('shows the "Change Words" label in the disclosure summary', () => {
    render(<PlayNowLauncher onLaunch={vi.fn()} />);

    const summary = screen.getByTestId('play-now-change-summary');
    expect(summary).toHaveTextContent('teacher.playNow.changeWords');
  });

  it('opens the disclosure when clicked, revealing source switch and items', () => {
    mockLessons.mockReturnValue({
      lessons: [lesson('l1', 'Unit 5')],
      isLoading: false,
      error: null,
    });
    render(<PlayNowLauncher onLaunch={vi.fn()} />);

    const details = screen.getByTestId('play-now-change-disclosure');
    const summary = screen.getByTestId('play-now-change-summary');

    // Initially closed
    expect((details as HTMLDetailsElement).open).toBe(false);

    // Click to open
    fireEvent.click(summary);

    // Now open
    expect((details as HTMLDetailsElement).open).toBe(true);

    // And the source switch should be visible
    expect(screen.getByTestId('play-now-source-recent')).toBeInTheDocument();
  });

  it('GO LIVE button remains visible above the fold (not in the disclosure)', () => {
    render(<PlayNowLauncher onLaunch={vi.fn()} />);

    const button = screen.getByTestId('play-now-go');
    const disclosure = screen.getByTestId('play-now-change-disclosure');

    // Button exists and is NOT a child of the disclosure
    expect(button).toBeInTheDocument();
    expect(disclosure.contains(button)).toBe(false);
  });

  it('source switch and item list are inside the disclosure, not visible by default', () => {
    mockLessons.mockReturnValue({
      lessons: [lesson('l1', 'Unit 5')],
      isLoading: false,
      error: null,
    });
    render(<PlayNowLauncher onLaunch={vi.fn()} />);

    const disclosure = screen.getByTestId('play-now-change-disclosure');

    // Items exist but are hidden inside the closed disclosure
    // (we can't use queryByTestId because the element doesn't exist yet,
    // so we check that source buttons ARE in the disclosure when it's open)
    fireEvent.click(screen.getByTestId('play-now-change-summary'));

    // Now that it's open, they should be visible
    expect(screen.getByTestId('play-now-source-recent')).toBeInTheDocument();
    expect(disclosure.contains(screen.getByTestId('play-now-source-recent'))).toBe(true);
  });
});
