/**
 * DailyRedirect should render the global game Header (logo + nav + auth/menu)
 * above the Daily Challenge landing content, matching the rest of the app's
 * pages (quests, settings, etc.). Previously /daily had no header at all.
 */
import { render, screen } from '@testing-library/react';
import DailyRedirect from '../DailyRedirect';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
  // useDailyRivalChallenge (mounted by DailyRedirect) reads the share-link params.
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));

// Stub the heavy global Header (auth context, safe-area, dynamic imports) —
// the unit under test is the composition, not Header's internals.
vi.mock('@/components/Header', () => ({
  default: () => <div data-testid="game-header">HEADER</div>,
}));

vi.mock('../DailyChallengeLanding', () => ({
  DailyChallengeLanding: () => <div data-testid="daily-landing">LANDING</div>,
}));

describe('DailyRedirect — global header', () => {
  it('renders the global game Header on the daily challenge page', () => {
    render(<DailyRedirect />);
    expect(screen.getByTestId('game-header')).toBeInTheDocument();
  });

  it('renders the Header before the landing content (header on top)', () => {
    render(<DailyRedirect />);
    const header = screen.getByTestId('game-header');
    const landing = screen.getByTestId('daily-landing');
    // Header must precede the landing in DOM order.
    expect(
      header.compareDocumentPosition(landing) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
