/**
 * StreakSaveLink — RED phase.
 *
 * Solo results used to render the full InlineSignupCard unprompted: 83% of all
 * signup_prompt_shown impressions at 0.65% CTR (PostHog 28d). The screen now
 * carries one quiet link, and only for a guest with a streak worth saving.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import StreakSaveLink from '../StreakSaveLink';

const { mockTrack } = vi.hoisted(() => ({ mockTrack: vi.fn() }));

vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...args: unknown[]) => mockTrack(...args),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => (key === 'results.saveStreak.title' ? 'Save my streak' : key),
    language: 'en',
  }),
}));

vi.mock('@/components/auth/InlineSignupCard', () => ({
  __esModule: true,
  default: ({ analyticsSource }: { analyticsSource?: string }) => (
    <div data-testid="inline-signup-card" data-source={analyticsSource} />
  ),
}));

const shownCalls = () => mockTrack.mock.calls.filter((c) => c[0] === 'streak_save_link_shown');
const clickedCalls = () => mockTrack.mock.calls.filter((c) => c[0] === 'streak_save_link_clicked');

describe('StreakSaveLink', () => {
  beforeEach(() => mockTrack.mockClear());

  it('renders nothing below the streak threshold', () => {
    render(<StreakSaveLink isAuthenticated={false} streak={1} isStreakLoaded source="solo_results" />);
    expect(screen.queryByTestId('streak-save-link')).not.toBeInTheDocument();
    expect(shownCalls()).toHaveLength(0);
  });

  it('renders nothing for a signed-in player', () => {
    render(<StreakSaveLink isAuthenticated streak={5} isStreakLoaded source="solo_results" />);
    expect(screen.queryByTestId('streak-save-link')).not.toBeInTheDocument();
  });

  it('renders nothing while the streak is still resolving', () => {
    render(<StreakSaveLink isAuthenticated={false} streak={4} isStreakLoaded={false} source="solo_results" />);
    expect(screen.queryByTestId('streak-save-link')).not.toBeInTheDocument();
    expect(shownCalls()).toHaveLength(0);
  });

  it('shows the link for a guest with a streak and reports streak + surface once', () => {
    const { rerender } = render(
      <StreakSaveLink isAuthenticated={false} streak={3} isStreakLoaded source="practice_results" />,
    );
    expect(screen.getByTestId('streak-save-link')).toHaveTextContent('Save my streak');
    rerender(<StreakSaveLink isAuthenticated={false} streak={3} isStreakLoaded source="practice_results" />);
    expect(shownCalls()).toHaveLength(1);
    expect(shownCalls()[0][1]).toMatchObject({ streak: 3, source: 'practice_results' });
  });

  it('expands into the signup card on its own surface when tapped', async () => {
    render(<StreakSaveLink isAuthenticated={false} streak={2} isStreakLoaded source="solo_results" />);
    fireEvent.click(screen.getByTestId('streak-save-link'));

    expect(clickedCalls()).toHaveLength(1);
    expect(clickedCalls()[0][1]).toMatchObject({ streak: 2, source: 'solo_results' });
    // The card is behind next/dynamic: its weight stays off the results screen
    // until a guest asks for it, so the assertion has to await the chunk.
    const card = await screen.findByTestId('inline-signup-card');
    expect(card).toHaveAttribute('data-source', 'streak_save');
    expect(screen.queryByTestId('streak-save-link')).not.toBeInTheDocument();
  });
});
